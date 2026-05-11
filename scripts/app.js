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
let weightLog      = [];
let weightLookback = null; // null = all time

// ── PERSISTENCE ───────────────────────────────────────────────────────────

function loadFromStorage() {
  try {
    workouts   = JSON.parse(localStorage.getItem("ll_workouts")   || "[]");
    syncQueue  = JSON.parse(localStorage.getItem("ll_queue")      || "[]");
    sheetsUrl  = localStorage.getItem("ll_sheets_url")            || "";
    weightLog  = JSON.parse(localStorage.getItem("ll_weight")     || "[]");
  } catch (e) {
    console.warn("Could not read localStorage:", e);
  }
}

function persist() {
  try {
    localStorage.setItem("ll_workouts",   JSON.stringify(workouts));
    localStorage.setItem("ll_queue",      JSON.stringify(syncQueue));
    localStorage.setItem("ll_sheets_url", sheetsUrl);
    localStorage.setItem("ll_weight",     JSON.stringify(weightLog));
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

const TAB_IDS = ["log", "weight", "history", "progress", "settings"];

function switchTab(name) {
  TAB_IDS.forEach(id => {
    document.getElementById(`tab-${id}`)?.classList.toggle("active", id === name);
    document.getElementById(`panel-${id}`)?.classList.toggle("active", id === name);
  });
  if (name === "history")  renderHistory();
  if (name === "progress") renderProgress();
  if (name === "settings") renderSettings();
  if (name === "weight")   renderWeightTab();
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
  for (let i = 0; i < workouts.length; i++) {
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
    if (Array.isArray(json.weightLog)) weightLog = json.weightLog;
    persist();
    setSyncStatus("ok", "Synced");

    // Refresh whichever data tab is currently visible
    const activePanel = document.querySelector(".tab-panel.active")?.id;
    if (activePanel === "panel-history")  renderHistory();
    if (activePanel === "panel-progress") renderProgress();
    if (activePanel === "panel-weight")   renderWeightTab();

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

// ── WEIGHT ────────────────────────────────────────────────────────────────

async function saveWeight() {
  const date = document.getElementById("weight-date").value;
  const val  = parseFloat(document.getElementById("weight-input").value);
  if (!date)           { showToast("Select a date"); return; }
  if (isNaN(val) || val <= 0) { showToast("Enter a valid weight"); return; }

  const entry = { date, weight: val };
  const idx   = weightLog.findIndex(e => e.date === date);
  if (idx >= 0) weightLog[idx] = entry;
  else          weightLog.push(entry);
  weightLog.sort((a, b) => a.date.localeCompare(b.date));
  persist();
  renderWeightTab();
  document.getElementById("weight-input").value = "";
  showToast("Weight logged ✓");
  syncWeightToSheets(entry);
}

async function syncWeightToSheets(entry) {
  if (!sheetsUrl) return;
  try {
    const res = await fetch(sheetsUrl, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify({ _type: "weight", ...entry }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error("Weight sync failed:", err);
  }
}

async function deleteWeightEntry(date) {
  weightLog = weightLog.filter(e => e.date !== date);
  persist();
  renderWeightTab();
  if (sheetsUrl) {
    try {
      await fetch(sheetsUrl, {
        method:  "POST",
        headers: { "Content-Type": "text/plain" },
        body:    JSON.stringify({ _deleteWeight: true, date }),
      });
    } catch (err) {
      console.error("Weight delete failed:", err);
    }
  }
}

function setWeightLookback(days) {
  weightLookback = days;
  renderWeightTrendSection();
}

function renderWeightTab() {
  renderWeightLogList();
}

function getFilteredWeightLog() {
  if (!weightLookback) return weightLog;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weightLookback);
  const cutoffISO = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return weightLog.filter(e => e.date >= cutoffISO);
}

function renderWeightLogList() {
  const el = document.getElementById("weight-log-list");
  if (!el) return;

  if (!weightLog.length) {
    el.innerHTML = `<div class="weight-empty">No entries yet — log your first weight above.</div>`;
    return;
  }

  const sorted = [...weightLog].sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = `
    <div class="weight-log-list">
      ${sorted.map(e => `
        <div class="weight-log-row">
          <span class="weight-log-date">${formatDate(e.date)}</span>
          <span class="weight-log-val">${e.weight} lbs</span>
          <button class="btn btn-ghost btn-sm btn-danger"
                  onclick="confirmDeleteWeight('${e.date}')">Delete</button>
        </div>`).join("")}
    </div>`;
}

function confirmDeleteWeight(date) {
  showConfirm(
    "Delete weight entry?",
    `Remove the entry for ${formatDate(date)}? This cannot be undone.`,
    () => deleteWeightEntry(date),
    "Delete"
  );
}

function renderWeightTrendSection() {
  const section = document.getElementById("weight-trend-section");
  if (!section) return;

  if (!weightLog.length) { section.innerHTML = ""; return; }

  const pillDefs = [
    { label: "1M", days: 30  },
    { label: "3M", days: 90  },
    { label: "6M", days: 180 },
    { label: "All", days: null },
  ];
  const pillsHtml = pillDefs.map(p => {
    const active = weightLookback === p.days ? " active" : "";
    const val    = p.days ?? "null";
    return `<button class="lookback-pill${active}" data-days="${p.days ?? "all"}"
                    onclick="setWeightLookback(${val})">${p.label}</button>`;
  }).join("");

  const filtered = getFilteredWeightLog();
  let statHtml = "";
  if (filtered.length >= 2) {
    const diff = +(filtered[filtered.length - 1].weight - filtered[0].weight).toFixed(1);
    const sign = diff > 0 ? "+" : "";
    const cls  = diff < 0 ? "stat-down" : diff > 0 ? "stat-up" : "";
    statHtml = `<div class="weight-trend-stat">
      <span class="weight-stat-delta ${cls}">${sign}${diff} lbs</span> over this period
    </div>`;
  }

  section.innerHTML = `
    <div class="weight-trend-card">
      <div class="weight-trend-header">
        <span class="weight-trend-title">Weight</span>
        <div class="lookback-pills">${pillsHtml}</div>
      </div>
      ${statHtml}
      <div id="weight-chart-area"></div>
    </div>`;

  renderWeightChart();
}

// Group weight entries into Mon–Sun weeks
function groupByWeek(entries) {
  const map = {};
  entries.forEach(({ date, weight }) => {
    const [y, m, d] = date.split("-").map(Number);
    const dt  = new Date(y, m - 1, d);
    const dow = (dt.getDay() + 6) % 7; // 0 = Mon
    const mon = new Date(dt);
    mon.setDate(mon.getDate() - dow);
    const key = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
    if (!map[key]) map[key] = [];
    map[key].push(weight);
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weights]) => ({
      weekStart,
      min: Math.min(...weights),
      max: Math.max(...weights),
      avg: weights.reduce((s, w) => s + w, 0) / weights.length,
    }));
}

function renderWeightChart() {
  const area     = document.getElementById("weight-chart-area");
  if (!area) return;
  const filtered = getFilteredWeightLog();

  if (!filtered.length) {
    area.innerHTML = `<div class="weight-empty">No weight data yet — log your first entry above.</div>`;
    return;
  }

  if (filtered.length === 1) {
    area.innerHTML = `<div class="weight-empty">${filtered[0].weight} lbs on ${formatDate(filtered[0].date)}</div>`;
    return;
  }

  const weeks = groupByWeek(filtered);

  if (weeks.length < 2) {
    // Only one week — skip the chart, show a simple summary
    const w = weeks[0];
    area.innerHTML = `<div class="weight-empty">
      <strong>${w.avg.toFixed(1)} lbs avg</strong> this week
      (${w.min}–${w.max} lbs range)
    </div>`;
    return;
  }

  // SVG dimensions
  const W = 600, H = 220, PL = 48, PR = 16, PT = 16, PB = 32;
  const cW = W - PL - PR, cH = H - PT - PB;

  const allVals  = weeks.flatMap(w => [w.min, w.max]);
  const minVal   = Math.min(...allVals);
  const maxVal   = Math.max(...allVals);
  const pad      = Math.max((maxVal - minVal) * 0.15, 2);
  const yMin     = minVal - pad;
  const yMax     = maxVal + pad;

  const xScale   = i => PL + (i / (weeks.length - 1)) * cW;
  const yScale   = v => PT + cH - ((v - yMin) / (yMax - yMin)) * cH;

  // Min/max band path
  const topPts   = weeks.map((w, i) => `${xScale(i).toFixed(1)},${yScale(w.max).toFixed(1)}`);
  const botPts   = weeks.map((w, i) => `${xScale(i).toFixed(1)},${yScale(w.min).toFixed(1)}`).reverse();
  const bandPath = `M${topPts.join("L")}L${botPts.join("L")}Z`;

  // Avg line
  const avgPath  = weeks.map((w, i) =>
    `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(w.avg).toFixed(1)}`).join("");

  // Y-axis ticks
  const yRange   = yMax - yMin;
  const tickStep = yRange > 25 ? 10 : yRange > 12 ? 5 : 2;
  const ticks    = [];
  for (let t = Math.ceil(yMin / tickStep) * tickStep; t <= yMax; t += tickStep) ticks.push(t);

  // X-axis labels — use Wednesday of each week so month-boundary weeks
  // (e.g. Mon Mar 30 – Sun Apr 5) get labelled by the month that owns
  // the majority of the week rather than the Monday's month.
  const xLabels = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const [wy, wm, wd] = w.weekStart.split("-").map(Number);
    const wednesday = new Date(wy, wm - 1, wd + 3);
    const mo = wednesday.getMonth(); // 0-indexed is fine for comparison
    if (mo !== lastMonth) {
      lastMonth = mo;
      xLabels.push({ x: xScale(i), label: wednesday.toLocaleDateString("en-US", { month: "short" }) });
    }
  });

  area.innerHTML = `
    <svg class="weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend chart">
      <defs>
        <linearGradient id="band-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="var(--color-primary)" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.04"/>
        </linearGradient>
      </defs>

      ${ticks.map(t => `
        <line x1="${PL}" y1="${yScale(t).toFixed(1)}" x2="${W - PR}" y2="${yScale(t).toFixed(1)}"
              stroke="var(--color-divider)" stroke-width="1"/>
        <text x="${PL - 6}" y="${yScale(t).toFixed(1)}" text-anchor="end" dominant-baseline="middle"
              class="chart-tick">${Math.round(t)}</text>`).join("")}

      <path d="${bandPath}" fill="url(#band-grad)"/>
      <path d="${avgPath}" fill="none" stroke="var(--color-primary)"
            stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>

      ${weeks.map((w, i) => `
        <circle cx="${xScale(i).toFixed(1)}" cy="${yScale(w.avg).toFixed(1)}" r="3"
                fill="var(--color-primary)" stroke="var(--color-surface)" stroke-width="1.5"/>`).join("")}

      ${xLabels.map(l => `
        <text x="${l.x.toFixed(1)}" y="${H - 4}" text-anchor="middle"
              class="chart-tick">${l.label}</text>`).join("")}
    </svg>`;
}

// ── PROGRESS ──────────────────────────────────────────────────────────────

// Returns the number of calendar days between two ISO date strings (a → b)
function daysBetween(isoA, isoB) {
  const [y1, m1, d1] = isoA.split("-").map(Number);
  const [y2, m2, d2] = isoB.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
}

// Each workout session adds 1. Resets only if 7+ days pass with no workout.
function calcStreak() {
  const days = workouts.map(w => w.date).sort((a, b) => b.localeCompare(a));
  if (!days.length) return 0;
  if (daysBetween(days[0], todayISO()) >= 7) return 0;

  let streak = 1;
  for (let i = 0; i < days.length - 1; i++) {
    if (daysBetween(days[i + 1], days[i]) >= 7) break;
    streak++;
  }
  return streak;
}

function renderProgress() {
  const grid       = document.getElementById("progress-grid");
  const streakArea = document.getElementById("streak-area");
  grid.innerHTML   = "";
  renderWeightTrendSection();

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
        <h3>No workout data yet</h3>
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

    const lastSession = sessionBests[sessionBests.length - 1];
    const prevSession = sessionBests.length > 1 ? sessionBests[sessionBests.length - 2] : null;
    const bestReps    = sessionBests.reduce((max, s) => Math.max(max, s.reps ?? 0), 0);

    let deltaHtml = "";
    if (prevSession && ex.weighted && lastSession.weight && prevSession.weight) {
      const d = lastSession.weight - prevSession.weight;
      if (d > 0) deltaHtml = `<span class="pb-delta">+${d}lb</span>`;
    }

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
        <span class="pb-value">${bestReps || "–"}</span>
      </div>
      <div class="pb-row">
        <span class="pb-label">Sessions logged</span>
        <span class="pb-value">${sessionBests.length}</span>
      </div>
      <div class="pb-row">
        <span class="pb-label">Last worked</span>
        <span class="pb-value" style="font-family:var(--font-body);font-size:var(--text-xs)">${formatDate(lastSession.date)}</span>
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
    [JSON.stringify({ workouts, weightLog, exportedAt: new Date().toISOString() }, null, 2)],
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
      const importedWorkouts = parsed.workouts ?? (Array.isArray(parsed) ? parsed : null);
      const importedWeight   = Array.isArray(parsed.weightLog) ? parsed.weightLog : [];
      if (!importedWorkouts) throw new Error("Invalid format");
      const totalItems = importedWorkouts.length + importedWeight.length;
      showConfirm(
        "Import data?",
        `This will merge ${importedWorkouts.length} workout(s) and ${importedWeight.length} weight entry(ies) into your existing data.`,
        () => {
          const newWorkouts = [];
          importedWorkouts.forEach(entry => {
            if (!workouts.find(w => w.date === entry.date)) {
              workouts.push(entry);
              newWorkouts.push(entry);
            }
          });
          workouts.sort((a, b) => b.date.localeCompare(a.date));

          const newWeightEntries = [];
          importedWeight.forEach(entry => {
            if (!weightLog.find(e => e.date === entry.date)) {
              weightLog.push(entry);
              newWeightEntries.push(entry);
            }
          });
          weightLog.sort((a, b) => a.date.localeCompare(b.date));

          persist();
          showToast(`Imported ${totalItems} item(s)`);
          newWorkouts.forEach(entry => syncToSheets(entry));
          newWeightEntries.forEach(entry => syncWeightToSheets(entry));
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
document.getElementById("weight-date").value   = todayISO();
initLogPanel();

updateQueueStatus();

// Fetch latest data from Sheets in the background — app is usable immediately
// from localStorage cache while the request completes.
if (sheetsUrl) fetchFromSheets();
else setSyncStatus("", "");