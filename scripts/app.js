/* =============================================================
   LIFT LOG — app.js
   All application logic. No framework, no build step needed.
   ============================================================= */

// ── CONFIG ────────────────────────────────────────────────────────────────

const EXERCISES = [
  { id: "legpress",   name: "Leg Press",        tag: "Legs",      defaultSets: 3, repRange: [10, 12], weighted: true  },
  { id: "chestpress", name: "Chest Press",       tag: "Chest",     defaultSets: 3, repRange: [10, 12], weighted: true  },
  { id: "pullups",    name: "Pull-Ups",          tag: "Back",      defaultSets: 3, repRange: null,     weighted: false, amrap: true },
  { id: "ohpress",    name: "Overhead Press",    tag: "Shoulders", defaultSets: 3, repRange: [10, 12], weighted: true  },
  { id: "rows",       name: "Dumbbell Rows",     tag: "Back",      defaultSets: 3, repRange: [10, 12], weighted: true,  perSide: true },
  { id: "curls",      name: "Bicep Curls",       tag: "Arms",      defaultSets: 2, repRange: [12, 15], weighted: true  },
];

// ── STATE ─────────────────────────────────────────────────────────────────

let workouts       = [];
let syncQueue      = [];
let sheetsUrl      = "";
let setCounters    = {};
let addedExercises = [];
let pickerOpen     = false;

// ── PERSISTENCE ───────────────────────────────────────────────────────────

function loadFromStorage() {
  try {
    workouts  = JSON.parse(localStorage.getItem("ll_workouts")   || "[]");
    syncQueue = JSON.parse(localStorage.getItem("ll_queue")      || "[]");
    sheetsUrl = localStorage.getItem("ll_sheets_url")            || "";
  } catch (e) {
    console.warn("Could not read localStorage:", e);
  }
}

function persist() {
  try {
    localStorage.setItem("ll_workouts",   JSON.stringify(workouts));
    localStorage.setItem("ll_queue",      JSON.stringify(syncQueue));
    localStorage.setItem("ll_sheets_url", sheetsUrl);
  } catch (e) {
    console.warn("Could not write localStorage:", e);
  }
}

// ── THEME ─────────────────────────────────────────────────────────────────

function initTheme() {
  const btn  = document.querySelector("[data-theme-toggle]");
  const root = document.documentElement;
  let theme  = localStorage.getItem("ll_theme") ||
               (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  root.setAttribute("data-theme", theme);
  updateThemeIcon(btn, theme);

  btn?.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    localStorage.setItem("ll_theme", theme);
    updateThemeIcon(btn, theme);
  });
}

function updateThemeIcon(btn, theme) {
  if (!btn) return;
  btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  btn.innerHTML = theme === "dark"
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
       </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
       </svg>`;
}

// ── TABS ──────────────────────────────────────────────────────────────────

const TAB_IDS = ["log", "history", "progress", "settings"];

function switchTab(name) {
  TAB_IDS.forEach(id => {
    document.getElementById(`tab-${id}`)?.classList.toggle("active", id === name);
    document.getElementById(`panel-${id}`)?.classList.toggle("active", id === name);
  });
  if (name === "history")  renderHistory();
  if (name === "progress") renderProgress();
  if (name === "settings") renderSettings();
}

// ── DATE HELPERS ──────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

// ── LAST BEST ─────────────────────────────────────────────────────────────

function getLastBest(exerciseId) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const ex = workouts[i].exercises.find(e => e.id === exerciseId);
    if (!ex) continue;
    const done = ex.sets.filter(s => s.reps != null);
    if (!done.length) continue;
    return done.reduce((best, s) =>
      (s.weight ?? 0) >= (best.weight ?? 0) ? s : best, done[0]);
  }
  return null;
}

// ── LOG PANEL ─────────────────────────────────────────────────────────────

function initLogPanel() {
  addedExercises = [];
  pickerOpen     = false;
  setCounters    = {};
  document.getElementById("exercises-container").innerHTML = "";
  updateAddExerciseBtn();
}

function updateAddExerciseBtn() {
  const available = EXERCISES.filter(ex => !addedExercises.includes(ex.id));
  const row       = document.getElementById("add-exercise-row");
  if (!available.length) { row.innerHTML = ""; return; }

  row.innerHTML = `
    <button class="btn btn-ghost add-ex-btn" onclick="toggleExercisePicker(event)">+ Add Exercise</button>
    <div class="exercise-picker${pickerOpen ? " open" : ""}" id="exercise-picker">
      ${available.map(ex => `
        <button class="picker-option" onclick="addExerciseToLog('${ex.id}')">
          <span class="picker-name">${ex.name}</span>
          <span class="exercise-tag">${ex.tag}</span>
        </button>`).join("")}
    </div>`;
}

function toggleExercisePicker(e) {
  e.stopPropagation();
  pickerOpen = !pickerOpen;
  document.getElementById("exercise-picker")?.classList.toggle("open", pickerOpen);
}

function addExerciseToLog(exId) {
  if (addedExercises.includes(exId)) return;
  addedExercises.push(exId);
  pickerOpen = false;

  const ex        = EXERCISES.find(e => e.id === exId);
  const container = document.getElementById("exercises-container");
  const best      = getLastBest(ex.id);
  const prevText  = best
    ? (ex.weighted ? `Last: ${best.weight ?? "–"}lb × ${best.reps}` : `Last: ${best.reps} reps`)
    : "First session";

  const block = document.createElement("div");
  block.className    = "exercise-block";
  block.dataset.exid = ex.id;
  block.innerHTML    = `
    <div class="exercise-header">
      <div>
        <div class="exercise-name">${ex.name}</div>
        ${ex.perSide ? `<div class="exercise-hint">per side</div>` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;justify-content:flex-end">
        <span class="prev-best">${prevText}</span>
        <span class="exercise-tag">${ex.tag}</span>
        <button class="btn btn-ghost btn-sm btn-danger" onclick="removeExercise('${ex.id}')" aria-label="Remove ${ex.name}">×</button>
      </div>
    </div>
    <table class="sets-table" aria-label="${ex.name} sets">
      <thead>
        <tr>
          <th scope="col">#</th>
          ${ex.weighted ? `<th scope="col">Weight (lbs)</th>` : ""}
          <th scope="col">Reps</th>
          <th scope="col"><span class="sr-only">Remove</span></th>
        </tr>
      </thead>
      <tbody id="sets-${ex.id}"></tbody>
    </table>
    <div class="add-set-row">
      <button class="btn btn-ghost btn-sm" onclick="addSet('${ex.id}')">+ Add set</button>
    </div>`;

  container.appendChild(block);
  for (let i = 0; i < ex.defaultSets; i++) addSet(ex.id, "", "", false);
  updateAddExerciseBtn();
}

function removeExercise(exId) {
  document.querySelector(`.exercise-block[data-exid="${exId}"]`)?.remove();
  addedExercises = addedExercises.filter(id => id !== exId);
  delete setCounters[exId];
  updateAddExerciseBtn();
}

function addSet(exId, weight = "", reps = "", animate = true) {
  const ex    = EXERCISES.find(e => e.id === exId);
  const tbody = document.getElementById(`sets-${exId}`);
  setCounters[exId] = (setCounters[exId] || 0) + 1;
  const n = setCounters[exId];

  const tr = document.createElement("tr");
  tr.dataset.setIndex = n;
  if (animate) tr.style.opacity = "0";

  tr.innerHTML = `
    <td><span class="set-num">${n}</span></td>
    ${ex.weighted
      ? `<td><input class="num-input" type="number" min="0" max="9999" step="2.5"
              value="${weight}" placeholder="lbs" aria-label="Weight, set ${n}"></td>`
      : ""}
    <td><input class="num-input" type="number" min="0" max="999"
            value="${reps}" placeholder="reps" aria-label="Reps, set ${n}"></td>
    <td><button class="btn btn-ghost btn-sm btn-danger"
            onclick="removeSet(this, '${exId}')" aria-label="Remove set ${n}">×</button></td>`;

  tbody.appendChild(tr);

  if (animate) requestAnimationFrame(() => {
    tr.style.transition = "opacity 0.18s";
    tr.style.opacity = "1";
  });
}

function removeSet(btn, exId) {
  btn.closest("tr").remove();
  document.getElementById(`sets-${exId}`)
    .querySelectorAll("tr")
    .forEach((row, i) => { row.querySelector(".set-num").textContent = i + 1; });
}

// ── COLLECT FORM DATA ─────────────────────────────────────────────────────

function collectFormData() {
  return addedExercises.map(exId => {
    const ex    = EXERCISES.find(e => e.id === exId);
    const tbody = document.getElementById(`sets-${exId}`);
    const sets  = Array.from(tbody.querySelectorAll("tr")).map(tr => {
      const inputs = tr.querySelectorAll("input[type=number]");
      let weight = null, reps = null;
      if (ex.weighted) {
        weight = parseFloat(inputs[0].value) || null;
        reps   = parseFloat(inputs[1].value) || null;
      } else {
        reps   = parseFloat(inputs[0].value) || null;
      }
      return { weight, reps };
    });
    return { id: ex.id, name: ex.name, sets };
  });
}

// ── SAVE WORKOUT ──────────────────────────────────────────────────────────

async function saveWorkout() {
  const date = document.getElementById("workout-date").value;
  if (!date) { showToast("Please select a date"); return; }

  const exercises = collectFormData();

  if (!exercises.length) {
    showToast("Add at least one exercise before saving"); return;
  }
  for (const ex of exercises) {
    const exDef = EXERCISES.find(e => e.id === ex.id);
    if (!ex.sets.length) {
      showToast(`${ex.name} has no sets — add sets or remove it`); return;
    }
    for (const set of ex.sets) {
      if (set.reps == null) {
        showToast(`Enter reps for all sets — ${ex.name}`); return;
      }
      if (exDef?.weighted && set.weight == null) {
        showToast(`Enter weight for all sets — ${ex.name}`); return;
      }
    }
  }

  const entry = { date, exercises, savedAt: new Date().toISOString() };

  const existingIdx = workouts.findIndex(w => w.date === date);
  if (existingIdx >= 0) {
    showConfirm(
      "Replace workout?",
      `You already logged a workout on ${formatDate(date)}. Replace it?`,
      async () => {
        workouts[existingIdx] = entry;
        workouts.sort((a, b) => b.date.localeCompare(a.date));
        persist();
        showSaveConfirmation();
        await syncToSheets(entry);
      },
      "Replace"
    );
    return;
  }

  workouts.push(entry);
  workouts.sort((a, b) => b.date.localeCompare(a.date));
  persist();
  showSaveConfirmation();
  await syncToSheets(entry);
}

function clearForm() {
  initLogPanel();
  document.getElementById("workout-date").value = todayISO();
}

// ── GOOGLE SHEETS SYNC ────────────────────────────────────────────────────

async function fetchFromSheets() {
  if (!sheetsUrl) return;
  setSyncStatus("pending", "Fetching…");
  try {
    const res  = await fetch(sheetsUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message || "Unknown error");

    workouts = json.workouts;
    persist();
    setSyncStatus("ok", "Synced");

    // Refresh whichever data tab is currently visible
    const activePanel = document.querySelector(".tab-panel.active")?.id;
    if (activePanel === "panel-history")  renderHistory();
    if (activePanel === "panel-progress") renderProgress();

  } catch (err) {
    console.error("Failed to fetch from Sheets:", err);
    setSyncStatus("error", "Fetch failed — using local data");
  }
}

async function clearSheetsHistory() {
  if (!sheetsUrl) return;
  try {
    const res = await fetch(sheetsUrl, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify({ _deleteAll: true }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error("Failed to clear Sheets history:", err);
  }
}

async function deleteFromSheets(date) {
  if (!sheetsUrl) return;
  try {
    const res = await fetch(sheetsUrl, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify({ _delete: true, date }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error("Failed to delete from Sheets:", err);
  }
}

async function syncToSheets(entry) {
  if (!sheetsUrl) return;

  setSyncStatus("pending", "Syncing…");
  try {
    const res = await fetch(sheetsUrl, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message || "Unknown error");

    setSyncStatus("ok", "Synced");
    syncQueue = syncQueue.filter(q => q.date !== entry.date);
    persist();
  } catch (err) {
    console.error("Sheets sync failed:", err);
    setSyncStatus("error", "Sync failed — queued");
    if (!syncQueue.find(q => q.date === entry.date)) {
      syncQueue.push(entry);
      persist();
    }
    updateQueueStatus();
  }
}

async function retryQueue() {
  if (!syncQueue.length) { showToast("Queue is empty"); return; }
  showToast(`Retrying ${syncQueue.length} item(s)…`);
  const toRetry = [...syncQueue];
  for (const entry of toRetry) {
    await syncToSheets(entry);
  }
}

function setSyncStatus(state, label) {
  const el = document.getElementById("sync-status");
  if (!el) return;
  if (!sheetsUrl) { el.innerHTML = ""; return; }
  el.innerHTML = `<span class="sync-dot ${state}"></span>${label}`;
}

// ── HISTORY ───────────────────────────────────────────────────────────────

function renderHistory() {
  const list = document.getElementById("history-list");

  if (!workouts.length) {
    list.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <h3>No workouts yet</h3>
        <p>Log your first session to see it here.</p>
      </div>`;
    return;
  }

  list.innerHTML = "";
  workouts.forEach((w, idx) => {
    const totalSets = w.exercises.reduce((t, e) => t + e.sets.filter(s => s.reps != null).length, 0);
    const pills    = w.exercises
      .filter(e => e.sets.some(s => s.reps))
      .map(e => `<span class="history-pill">${e.name}</span>`)
      .join("");

    const card = document.createElement("div");
    card.className = "card history-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3)">
        <div>
          <div class="history-date">${formatDate(w.date)}</div>
          <div class="history-summary">${pills}</div>
          <div class="history-meta">${totalSets} sets</div>
        </div>
        <div class="history-actions">
          <button class="btn btn-ghost btn-sm" onclick="toggleDetail(${idx}, this)">View</button>
          <button class="btn btn-ghost btn-sm btn-danger" onclick="deleteWorkout(${idx})">Delete</button>
        </div>
      </div>
      <div class="history-detail" id="detail-${idx}">
        ${w.exercises.map(ex => `
          <div class="detail-exercise">
            <div class="detail-exercise-name">${ex.name}</div>
            <div class="detail-set-row detail-set-header">
              <span>#</span>
              <span>${ex.sets.some(s => s.weight) ? "Weight" : ""}</span>
              <span>Reps</span>
            </div>
            ${ex.sets.map((s, i) => `
              <div class="detail-set-row">
                <span>${i + 1}</span>
                <span>${s.weight != null ? s.weight + "lb" : "—"}</span>
                <span>${s.reps ?? "—"}</span>
              </div>`).join("")}
          </div>`).join("")}
      </div>`;

    list.appendChild(card);
  });
}

function toggleDetail(idx, btn) {
  const d = document.getElementById(`detail-${idx}`);
  d.classList.toggle("open");
  btn.textContent = d.classList.contains("open") ? "Hide" : "View";
}

function deleteWorkout(idx) {
  showConfirm(
    "Delete workout?",
    `Remove the workout from ${formatDate(workouts[idx].date)}? This cannot be undone.`,
    () => {
      const date = workouts[idx].date;
      workouts.splice(idx, 1);
      persist();
      renderHistory();
      showToast("Workout deleted");
      deleteFromSheets(date);
    },
    "Delete"
  );
}

function clearAllHistory() {
  if (!workouts.length) { showToast("Nothing to clear"); return; }
  showConfirm(
    "Clear all history?",
    "This will permanently delete all workouts from the app and Google Sheets. This cannot be undone.",
    () => {
      workouts = [];
      persist();
      renderHistory();
      showToast("History cleared");
      clearSheetsHistory();
    },
    "Clear all"
  );
}

// ── PROGRESS ──────────────────────────────────────────────────────────────

function calcStreak() {
  const days = workouts.map(w => w.date).sort((a, b) => b.localeCompare(a));
  let streak = 0;
  if (days.length) {
    let check = todayISO();
    if (days[0] < check) check = days[0];
    for (const day of days) {
      if (day === check) {
        streak++;
        const [y, m, d] = check.split("-").map(Number);
        const prev = new Date(y, m - 1, d - 1);
        check = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
      } else if (day < check) break;
    }
  }
  return streak;
}

function renderProgress() {
  const grid       = document.getElementById("progress-grid");
  const streakArea = document.getElementById("streak-area");
  grid.innerHTML   = "";

  const streak = calcStreak();
  streakArea.innerHTML = streak > 0
    ? `<div class="streak-badge">🔥 ${streak}-session streak</div>`
    : `<div class="streak-badge" style="background:var(--color-surface-offset);color:var(--color-text-muted)">No active streak — keep going!</div>`;

  if (!workouts.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <h3>No data yet</h3>
        <p>Complete a few workouts to track your personal bests here.</p>
      </div>`;
    return;
  }

  EXERCISES.forEach(ex => {
    const sessionBests = workouts
      .slice()
      .reverse()
      .map(w => {
        const e = w.exercises.find(x => x.id === ex.id);
        if (!e) return null;
        const doneSets = e.sets.filter(s => s.reps != null);
        if (!doneSets.length) return null;
        const top = doneSets.reduce((best, s) => {
          if (ex.weighted) return (s.weight ?? 0) >= (best.weight ?? 0) ? s : best;
          return (s.reps ?? 0) >= (best.reps ?? 0) ? s : best;
        }, doneSets[0]);
        return { date: w.date, ...top };
      })
      .filter(Boolean);

    if (!sessionBests.length) return;

    const allTimeBest = sessionBests.reduce((best, s) => {
      if (ex.weighted) return (s.weight ?? 0) >= (best.weight ?? 0) ? s : best;
      return (s.reps ?? 0) >= (best.reps ?? 0) ? s : best;
    }, sessionBests[0]);

    const prevBest = sessionBests.length > 1 ? sessionBests[sessionBests.length - 2] : null;
    let deltaHtml  = "";
    if (prevBest && ex.weighted && allTimeBest.weight && prevBest.weight) {
      const d = allTimeBest.weight - prevBest.weight;
      if (d > 0) deltaHtml = `<span class="pb-delta">+${d}lb</span>`;
    }

    const lastLogged = sessionBests[sessionBests.length - 1];
    const card = document.createElement("div");
    card.className = "card progress-card";
    card.innerHTML = `
      <div class="ex-name">${ex.name} <span class="exercise-tag">${ex.tag}</span></div>
      ${ex.weighted ? `
        <div class="pb-row">
          <span class="pb-label">Best weight</span>
          <div style="display:flex;align-items:baseline">
            <span class="pb-value">${allTimeBest.weight ?? "–"}lb</span>${deltaHtml}
          </div>
        </div>` : ""}
      <div class="pb-row">
        <span class="pb-label">Best reps</span>
        <span class="pb-value">${allTimeBest.reps ?? "–"}</span>
      </div>
      <div class="pb-row">
        <span class="pb-label">Sessions logged</span>
        <span class="pb-value">${sessionBests.length}</span>
      </div>
      <div class="pb-row">
        <span class="pb-label">Last worked</span>
        <span class="pb-value" style="font-family:var(--font-body);font-size:var(--text-xs)">${formatDate(lastLogged.date)}</span>
      </div>`;
    grid.appendChild(card);
  });
}

// ── SETTINGS ──────────────────────────────────────────────────────────────

function renderSettings() {
  const input = document.getElementById("sheets-url");
  if (input) input.value = sheetsUrl;
  updateQueueStatus();
}

function saveSettings() {
  const input = document.getElementById("sheets-url");
  sheetsUrl   = (input?.value || "").trim();
  persist();
  setSyncStatus(sheetsUrl ? "none" : "", sheetsUrl ? "Ready" : "");
  showToast("Settings saved");
}

async function testConnection() {
  const url = document.getElementById("sheets-url")?.value?.trim();
  if (!url) { showToast("Enter a URL first"); return; }
  showToast("Testing…");
  try {
    const res  = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify({ _test: true }),
    });
    const json = await res.json();
    showToast(json.status === "ok" ? "Connection successful ✓" : `Error: ${json.message}`);
  } catch (e) {
    showToast("Connection failed — check the URL");
  }
}

function updateQueueStatus() {
  const el = document.getElementById("queue-status");
  if (!el) return;
  el.textContent = syncQueue.length
    ? `${syncQueue.length} workout(s) pending sync.`
    : "Queue is empty — all workouts synced.";
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────

function exportData() {
  const blob = new Blob(
    [JSON.stringify({ workouts, exportedAt: new Date().toISOString() }, null, 2)],
    { type: "application/json" }
  );
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `liftlog-export-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData() {
  document.getElementById("import-file").click();
}

function handleImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed   = JSON.parse(e.target.result);
      const imported = parsed.workouts ?? parsed;
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      showConfirm(
        "Import workouts?",
        `This will merge ${imported.length} workout(s) into your existing data.`,
        () => {
          const newEntries = [];
          imported.forEach(entry => {
            if (!workouts.find(w => w.date === entry.date)) {
              workouts.push(entry);
              newEntries.push(entry);
            }
          });
          workouts.sort((a, b) => b.date.localeCompare(a.date));
          persist();
          showToast(`Imported ${imported.length} workout(s)`);
          newEntries.forEach(entry => syncToSheets(entry));
        },
        "Import"
      );
    } catch {
      showToast("Import failed — invalid JSON file");
    }
  };
  reader.readAsText(file);
  input.value = "";
}

// ── SAVE CONFIRMATION ─────────────────────────────────────────────────────

let saveConfirmTimer;
function showSaveConfirmation() {
  const streak  = calcStreak();
  const el      = document.getElementById("save-confirm");
  const streakEl = document.getElementById("save-confirm-streak");

  streakEl.textContent = streak > 1  ? `🔥 ${streak}-session streak`
                       : streak === 1 ? "First session — keep it up!"
                       : "";

  el.classList.add("show");
  clearTimeout(saveConfirmTimer);
  saveConfirmTimer = setTimeout(() => el.classList.remove("show"), 4000);
}

// ── TOAST ─────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────

let confirmCallback = null;

function showConfirm(title, body, onConfirm, confirmLabel = "Confirm") {
  document.getElementById("modal-title").textContent      = title;
  document.getElementById("modal-body-text").textContent  = body;
  document.getElementById("modal-confirm-btn").textContent = confirmLabel;
  confirmCallback = onConfirm;
  document.getElementById("confirm-modal").classList.add("open");
}

function closeModal() {
  document.getElementById("confirm-modal").classList.remove("open");
  confirmCallback = null;
}

document.getElementById("save-confirm").addEventListener("click", () => {
  document.getElementById("save-confirm").classList.remove("show");
  clearTimeout(saveConfirmTimer);
});

document.getElementById("modal-confirm-btn").addEventListener("click", () => {
  if (confirmCallback) { confirmCallback(); closeModal(); }
});

document.getElementById("confirm-modal").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeModal();
    if (pickerOpen) {
      pickerOpen = false;
      document.getElementById("exercise-picker")?.classList.remove("open");
    }
  }
});

document.addEventListener("click", e => {
  if (pickerOpen && !e.target.closest("#add-exercise-row")) {
    pickerOpen = false;
    document.getElementById("exercise-picker")?.classList.remove("open");
  }
});

// ── INIT ──────────────────────────────────────────────────────────────────

loadFromStorage();
initTheme();
document.getElementById("workout-date").value = todayISO();
initLogPanel();

updateQueueStatus();

// Fetch latest data from Sheets in the background — app is usable immediately
// from localStorage cache while the request completes.
if (sheetsUrl) fetchFromSheets();
else setSyncStatus("", "");