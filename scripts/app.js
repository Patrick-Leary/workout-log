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

let workouts    = [];
let syncQueue   = [];
let sheetsUrl   = "";
let setCounters = {};

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
  let theme  = root.getAttribute("data-theme") ||
               (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  root.setAttribute("data-theme", theme);
  updateThemeIcon(btn, theme);

  btn?.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
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
  return new Date().toISOString().split("T")[0];
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

// ── EXERCISE FORM ─────────────────────────────────────────────────────────

function buildExerciseForms() {
  setCounters = {};
  const container = document.getElementById("exercises-container");
  container.innerHTML = "";

  EXERCISES.forEach(ex => {
    const best = getLastBest(ex.id);
    const defWeight = best?.weight ?? "";
    const defReps   = best?.reps ?? (ex.amrap ? "" : ex.repRange?.[1] ?? "");

    const repHint  = ex.amrap ? "AMRAP" : `${ex.repRange[0]}–${ex.repRange[1]} reps`;
    const prevText = best
      ? (ex.weighted ? `Last: ${best.weight ?? "–"}lb × ${best.reps}` : `Last: ${best.reps} reps`)
      : "First session";

    const block = document.createElement("div");
    block.className = "exercise-block";
    block.dataset.exid = ex.id;

    block.innerHTML = `
      <div class="exercise-header">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-hint">${repHint}${ex.perSide ? " · per side" : ""}</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;justify-content:flex-end">
          <span class="prev-best">${prevText}</span>
          <span class="exercise-tag">${ex.tag}</span>
        </div>
      </div>
      <table class="sets-table" aria-label="${ex.name} sets">
        <thead>
          <tr>
            <th scope="col">#</th>
            ${ex.weighted ? `<th scope="col">Weight (lbs)</th>` : ""}
            <th scope="col">Reps</th>
            <th scope="col">Done</th>
            <th scope="col"><span class="sr-only">Remove</span></th>
          </tr>
        </thead>
        <tbody id="sets-${ex.id}"></tbody>
      </table>
      <div class="add-set-row">
        <button class="btn btn-ghost btn-sm" onclick="addSet('${ex.id}')">+ Add set</button>
      </div>`;

    container.appendChild(block);

    for (let i = 0; i < ex.defaultSets; i++) {
      addSet(ex.id, defWeight, defReps, false);
    }
  });
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
    <td><input type="checkbox" class="checkbox-done" aria-label="Set ${n} done"></td>
    <td><button class="btn btn-ghost btn-sm btn-danger"
            onclick="removeSet(this, '${exId}')" aria-label="Remove set ${n}">×</button></td>`;

  tbody.appendChild(tr);

  if (animate) requestAnimationFrame(() => {
    tr.style.transition = "opacity 0.18s";
    tr.style.opacity = "1";
  });

  const inputs   = tr.querySelectorAll("input[type=number]");
  const repInput = inputs[inputs.length - 1];
  const cb       = tr.querySelector(".checkbox-done");

  repInput.addEventListener("input", () => {
    if (repInput.value) cb.checked = true;
    toggleDoneStyle(tr, cb);
  });
  cb.addEventListener("change", () => toggleDoneStyle(tr, cb));
}

function toggleDoneStyle(tr, cb) {
  tr.classList.toggle("set-done-row", cb.checked);
}

function removeSet(btn, exId) {
  btn.closest("tr").remove();
  document.getElementById(`sets-${exId}`)
    .querySelectorAll("tr")
    .forEach((row, i) => { row.querySelector(".set-num").textContent = i + 1; });
}

// ── COLLECT FORM DATA ─────────────────────────────────────────────────────

function collectFormData() {
  return EXERCISES.map(ex => {
    const tbody = document.getElementById(`sets-${ex.id}`);
    const sets  = Array.from(tbody.querySelectorAll("tr")).map(tr => {
      const inputs = tr.querySelectorAll("input[type=number]");
      const cb     = tr.querySelector(".checkbox-done");
      let weight = null, reps = null;
      if (ex.weighted) {
        weight = parseFloat(inputs[0].value) || null;
        reps   = parseFloat(inputs[1].value) || null;
      } else {
        reps   = parseFloat(inputs[0].value) || null;
      }
      return { weight, reps, done: cb?.checked ?? false };
    });
    return { id: ex.id, name: ex.name, sets };
  });
}

// ── SAVE WORKOUT ──────────────────────────────────────────────────────────

async function saveWorkout() {
  const date = document.getElementById("workout-date").value;
  if (!date) { showToast("Please select a date"); return; }

  const exercises = collectFormData();
  const anyData   = exercises.some(ex => ex.sets.some(s => s.reps != null));
  if (!anyData)   { showToast("Enter at least one rep before saving"); return; }

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
        showToast("Workout updated ✓");
        await syncToSheets(entry);
      },
      "Replace"
    );
    return;
  }

  workouts.push(entry);
  workouts.sort((a, b) => b.date.localeCompare(a.date));
  persist();
  showToast("Workout saved ✓");
  await syncToSheets(entry);
}

function clearForm() {
  buildExerciseForms();
  document.getElementById("workout-date").value = todayISO();
}

// ── GOOGLE SHEETS SYNC ────────────────────────────────────────────────────

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
    const doneSets = w.exercises.reduce((t, e) => t + e.sets.filter(s => s.done).length, 0);
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
          <div class="history-meta">${doneSets} sets completed</div>
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
            <div class="detail-grid header">
              <span>#</span>
              <span>${ex.sets.some(s => s.weight) ? "Weight" : ""}</span>
              <span>Reps</span>
              <span>Done</span>
            </div>
            ${ex.sets.map((s, i) => `
              <div class="detail-grid">
                <span>${i + 1}</span>
                <span>${s.weight != null ? s.weight + "lb" : "—"}</span>
                <span>${s.reps ?? "—"}</span>
                <span>${s.done ? "✓" : "·"}</span>
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
      workouts.splice(idx, 1);
      persist();
      renderHistory();
      showToast("Workout deleted");
    },
    "Delete"
  );
}

function clearAllHistory() {
  if (!workouts.length) { showToast("Nothing to clear"); return; }
  showConfirm(
    "Clear all history?",
    "This will permanently delete all locally stored workouts.",
    () => {
      workouts = [];
      persist();
      renderHistory();
      showToast("History cleared");
    },
    "Clear all"
  );
}

// ── PROGRESS ──────────────────────────────────────────────────────────────

function renderProgress() {
  const grid       = document.getElementById("progress-grid");
  const streakArea = document.getElementById("streak-area");
  grid.innerHTML   = "";

  const days  = workouts.map(w => w.date).sort((a, b) => b.localeCompare(a));
  let streak  = 0;
  if (days.length) {
    let check = todayISO();
    for (const day of days) {
      if (day === check) {
        streak++;
        const d = new Date(check);
        d.setDate(d.getDate() - 1);
        check = d.toISOString().split("T")[0];
      } else if (day < check) break;
    }
  }
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
          imported.forEach(entry => {
            if (!workouts.find(w => w.date === entry.date)) workouts.push(entry);
          });
          workouts.sort((a, b) => b.date.localeCompare(a.date));
          persist();
          showToast(`Imported ${imported.length} workout(s)`);
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

document.getElementById("modal-confirm-btn").addEventListener("click", () => {
  if (confirmCallback) { confirmCallback(); closeModal(); }
});

document.getElementById("confirm-modal").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// ── INIT ──────────────────────────────────────────────────────────────────

loadFromStorage();
initTheme();
document.getElementById("workout-date").value = todayISO();
buildExerciseForms();

if (sheetsUrl) setSyncStatus("none", "Ready");
updateQueueStatus();