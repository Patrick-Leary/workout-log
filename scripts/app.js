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
  // Home / dumbbell block — no gym required
  { id: "pushups",    name: "Push-Ups",          tag: "Chest",     defaultSets: 3, repRange: null,     weighted: false, amrap: true },
  { id: "splitsquat", name: "Split Squat",       tag: "Legs",      defaultSets: 3, repRange: [8, 10],  weighted: true,  perSide: true, hint: "per leg · enter 0 for bodyweight" },
  { id: "rdl",        name: "Romanian Deadlift", tag: "Legs",      defaultSets: 3, repRange: [10, 12], weighted: true  },
  { id: "latraise",   name: "Lateral Raise",     tag: "Shoulders", defaultSets: 3, repRange: [10, 12], weighted: true  },
  { id: "hammercurl", name: "Hammer Curl",       tag: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true  },
];

// Nutrition targets — from the lean-bulk plan. 2,650 is the target and 2,500
// the floor; protein has a band rather than a single number.
const FOOD_TARGETS = { cal: 2650, calFloor: 2500, proteinMin: 150, proteinMax: 190 };

const MEALS       = ["Pre", "Post", "Breakfast", "Lunch", "Snack", "Dinner"];
const FOOD_MACROS = ["cal", "p", "c", "fib", "fat", "sat", "na"];

// ── EXERCISE HELPERS ──────────────────────────────────────────────────────

// Parse a numeric input. Empty -> null, but a real 0 stays 0, so bodyweight
// sets (e.g. split squats with no dumbbells) can be saved on a weighted lift.
function numOrNull(v) {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Sub-label under the exercise name. Explicit `hint` wins; `perSide` is the
// legacy shorthand for "per side".
function exerciseHint(ex) {
  return ex.hint ?? (ex.perSide ? "per side" : null);
}

// ── STATE ─────────────────────────────────────────────────────────────────

let workouts       = [];
let syncQueue      = [];
let sheetsUrl      = "";
let setCounters    = {};
let addedExercises = [];
let pickerOpen     = false;
let weightLog      = [];
let foods          = [];   // the food database, read-only from the Foods tab
let nutrition      = [];   // logged food items across all loaded dates
let foodQueue      = [];   // food days awaiting sync (kept apart from syncQueue)
let sheetsSecret   = "";
let currentFoodDate = "";
let foodQuery      = "";
let lastFoodResults = [];  // what the picker is currently showing
let weightLookback = null; // null = all time
let logDrafts      = {};   // { [dateISO]: exercises[] }
let currentLogDate = "";
let isLoadingForm  = false;

// ── PERSISTENCE ───────────────────────────────────────────────────────────

function loadFromStorage() {
  try {
    workouts   = JSON.parse(localStorage.getItem("ll_workouts")   || "[]");
    syncQueue  = JSON.parse(localStorage.getItem("ll_queue")      || "[]");
    sheetsUrl  = localStorage.getItem("ll_sheets_url")            || "";
    weightLog  = JSON.parse(localStorage.getItem("ll_weight")     || "[]");
    logDrafts  = JSON.parse(localStorage.getItem("ll_drafts")     || "{}");
    foods      = JSON.parse(localStorage.getItem("ll_foods")      || "[]");
    nutrition  = JSON.parse(localStorage.getItem("ll_nutrition")  || "[]");
    foodQueue  = JSON.parse(localStorage.getItem("ll_food_queue") || "[]");
    sheetsSecret = localStorage.getItem("ll_sheets_secret")       || "";
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
    localStorage.setItem("ll_foods",      JSON.stringify(foods));
    localStorage.setItem("ll_nutrition",  JSON.stringify(nutrition));
    localStorage.setItem("ll_food_queue", JSON.stringify(foodQueue));
    localStorage.setItem("ll_sheets_secret", sheetsSecret);
  } catch (e) {
    console.warn("Could not write localStorage:", e);
  }
}

// ── DRAFT ─────────────────────────────────────────────────────────────────

function saveDraft(date) {
  if (!date || isLoadingForm) return;
  const exercises = collectFormData();
  if (!exercises.length) {
    delete logDrafts[date];
  } else {
    logDrafts[date] = exercises;
  }
  try { localStorage.setItem("ll_drafts", JSON.stringify(logDrafts)); } catch (e) {}
}

function clearDraft(date) {
  delete logDrafts[date];
  try { localStorage.setItem("ll_drafts", JSON.stringify(logDrafts)); } catch (e) {}
}

// Remove drafts older than yesterday — runs once on load
function pruneDrafts() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let pruned = false;
  Object.keys(logDrafts).forEach(date => {
    if (date < yesterday) { delete logDrafts[date]; pruned = true; }
  });
  if (pruned) try { localStorage.setItem("ll_drafts", JSON.stringify(logDrafts)); } catch (e) {}
}

// Populate the log form from draft → committed workout → empty
function loadDraftOrWorkout(date) {
  const source = logDrafts[date]
    ?? workouts.find(w => w.date === date)?.exercises
    ?? null;
  isLoadingForm = true;
  initLogPanel();
  if (source) source.forEach(ex => addExerciseToLog(ex.id, ex.sets));
  isLoadingForm = false;
  updateSaveButton(date);
}

function updateSaveButton(date) {
  const btn = document.getElementById("save-btn");
  if (!btn) return;
  const label = workouts.some(w => w.date === date) ? "Update Workout" : "Save Workout";
  btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
    ${label}`;
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

const TAB_IDS = ["log", "weight", "food", "history", "progress", "settings"];

function switchTab(name) {
  TAB_IDS.forEach(id => {
    document.getElementById(`tab-${id}`)?.classList.toggle("active", id === name);
    document.getElementById(`panel-${id}`)?.classList.toggle("active", id === name);
  });
  if (name === "history")  renderHistory();
  if (name === "progress") renderProgress();
  if (name === "settings") renderSettings();
  if (name === "weight")   renderWeightTab();
  if (name === "food")     renderFoodTab();
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

function addExerciseToLog(exId, prefilledSets = null) {
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
        ${exerciseHint(ex) ? `<div class="exercise-hint">${exerciseHint(ex)}</div>` : ""}
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
  if (prefilledSets?.length) {
    prefilledSets.forEach(s => addSet(ex.id, s.weight ?? "", s.reps ?? "", false));
  } else {
    for (let i = 0; i < ex.defaultSets; i++) addSet(ex.id, "", "", false);
  }
  updateAddExerciseBtn();
  if (!isLoadingForm) saveDraft(currentLogDate);
}

function removeExercise(exId) {
  document.querySelector(`.exercise-block[data-exid="${exId}"]`)?.remove();
  addedExercises = addedExercises.filter(id => id !== exId);
  delete setCounters[exId];
  updateAddExerciseBtn();
  saveDraft(currentLogDate);
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
  saveDraft(currentLogDate);
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
        weight = numOrNull(inputs[0].value);
        reps   = numOrNull(inputs[1].value);
      } else {
        reps   = numOrNull(inputs[0].value);
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
        clearDraft(date);
        updateSaveButton(date);
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
  clearDraft(date);
  updateSaveButton(date);
  showSaveConfirmation();
  await syncToSheets(entry);
}

function clearForm() {
  showConfirm(
    "Reset form?",
    "This will clear all exercises and sets. This cannot be undone.",
    () => {
      clearDraft(currentLogDate);
      initLogPanel();
      currentLogDate = todayISO();
      document.getElementById("workout-date").value = currentLogDate;
      updateSaveButton(currentLogDate);
    },
    "Reset"
  );
}

// ── GOOGLE SHEETS SYNC ────────────────────────────────────────────────────

// Every write goes through here, so the shared secret is attached in one
// place and every caller gets the same error handling.
async function postToSheets(payload) {
  const body = sheetsSecret ? { ...payload, _key: sheetsSecret } : payload;
  const res  = await fetch(sheetsUrl, {
    method:  "POST",
    headers: { "Content-Type": "text/plain" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "ok") throw new Error(json.message || "Unknown error");
  return json;
}

function sheetsGetUrl() {
  const sep = sheetsUrl.includes("?") ? "&" : "?";
  return sheetsSecret ? `${sheetsUrl}${sep}key=${encodeURIComponent(sheetsSecret)}` : sheetsUrl;
}

async function fetchFromSheets() {
  if (!sheetsUrl) return;
  setSyncStatus("pending", "Fetching…");
  try {
    const res  = await fetch(sheetsGetUrl());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message || "Unknown error");

    workouts = json.workouts;
    if (Array.isArray(json.weightLog)) weightLog = json.weightLog;
    if (Array.isArray(json.foods))     foods     = json.foods;
    if (Array.isArray(json.nutrition)) nutrition = json.nutrition;
    persist();
    setSyncStatus("ok", "Synced");

    // Refresh whichever data tab is currently visible
    const activePanel = document.querySelector(".tab-panel.active")?.id;
    if (activePanel === "panel-history")  renderHistory();
    if (activePanel === "panel-progress") renderProgress();
    if (activePanel === "panel-weight")   renderWeightTab();
    if (activePanel === "panel-food")     renderFoodTab();

  } catch (err) {
    console.error("Failed to fetch from Sheets:", err);
    setSyncStatus("error", "Fetch failed — using local data");
  }
}

async function clearSheetsHistory() {
  if (!sheetsUrl) return;
  try {
    await postToSheets({ _deleteAll: true });
  } catch (err) {
    console.error("Failed to clear Sheets history:", err);
  }
}

async function deleteFromSheets(date) {
  if (!sheetsUrl) return;
  try {
    await postToSheets({ _delete: true, date });
  } catch (err) {
    console.error("Failed to delete from Sheets:", err);
  }
}

async function syncToSheets(entry) {
  if (!sheetsUrl) return;

  setSyncStatus("pending", "Syncing…");
  try {
    await postToSheets(entry);

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
  const pending = syncQueue.length + foodQueue.length;
  if (!pending) { showToast("Queue is empty"); return; }
  showToast(`Retrying ${pending} item(s)…`);
  for (const entry of [...syncQueue])  await syncToSheets(entry);
  for (const entry of [...foodQueue])  await syncFoodToSheets(entry);
  updateQueueStatus();
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
    await postToSheets({ _type: "weight", ...entry });
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
      await postToSheets({ _deleteWeight: true, date });
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
    if (prevSession && ex.weighted && lastSession.weight != null && prevSession.weight != null) {
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

// ── FOOD ──────────────────────────────────────────────────────────────────

// Everything that reaches innerHTML below is escaped. Unlike exercise names,
// which come from a fixed list, food names come from the Foods tab and from
// free-text custom entries.
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function fmtNum(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("en-US");
}

// Pick the meal slot from the clock so the common case needs no interaction.
function defaultMeal() {
  const h = new Date().getHours();
  if (h < 8)  return "Pre";
  if (h < 11) return "Post";
  if (h < 14) return "Lunch";
  if (h < 17) return "Snack";
  if (h < 21) return "Dinner";
  return "Snack";
}

function foodItemsFor(date) {
  return nutrition.filter(n => n.date === date);
}

function foodTotals(items) {
  const t = {};
  FOOD_MACROS.forEach(k => {
    t[k] = items.reduce((sum, it) => sum + (Number(it[k]) || 0), 0);
  });
  return t;
}

// ── FOOD: picker ──────────────────────────────────────────────────────────

// With no query, show what was actually eaten most recently. Repeat days are
// the common case, and this is what makes them fast.
function recentFoods() {
  const seen  = [];
  // Newest date first, and within a date the most recently added first —
  // sorting on date alone leaves same-day items in insertion order, which
  // surfaces the oldest item of today rather than the newest.
  [...nutrition.entries()]
    .sort(([ia, a], [ib, b]) => b.date.localeCompare(a.date) || ib - ia)
    .forEach(([, n]) => {
      if (n.key && !seen.includes(n.key)) seen.push(n.key);
    });
  const byKey  = Object.fromEntries(foods.map(f => [f.key, f]));
  const recent = seen.map(k => byKey[k]).filter(Boolean);
  return [...recent, ...foods.filter(f => !seen.includes(f.key))];
}

function foodSearchResults() {
  const q = foodQuery.trim().toLowerCase();
  const pool = q
    ? foods.filter(f => `${f.name} ${f.brand}`.toLowerCase().includes(q))
    : recentFoods();
  lastFoodResults = pool.slice(0, 8);
  return lastFoodResults;
}

function onFoodSearch(value) {
  foodQuery = value;
  renderFoodResults();
}

function renderFoodResults() {
  const el = document.getElementById("food-results");
  if (!el) return;

  if (!foods.length) {
    el.innerHTML = `<div class="food-empty">No food database found. Add a <strong>Foods</strong>
      tab to your sheet (see <code>appsscript.js</code>), then reload.</div>`;
    return;
  }

  const results = foodSearchResults();
  if (!results.length) {
    el.innerHTML = `<div class="food-empty">No match. Use <strong>Custom item</strong> below
      for anything not in the database.</div>`;
    return;
  }

  el.innerHTML = results.map((f, i) => `
    <button class="food-result" onclick="addFoodResult(${i})">
      <span class="fr-name">${esc(f.name)}${f.brand ? ` <span class="fr-brand">${esc(f.brand)}</span>` : ""}</span>
      <span class="fr-meta">${fmtNum(f.cal)} cal · ${fmtNum(f.p)}g P<span class="fr-serving">${esc(f.serving)}</span></span>
    </button>`).join("");
}

// ── FOOD: mutations ───────────────────────────────────────────────────────

function newFoodId() {
  return `f${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

// The picker addresses results positionally so nothing from the sheet is ever
// interpolated into an inline handler.
function addFoodResult(i) {
  const f = lastFoodResults[i];
  if (!f) { showToast("Food not found"); return; }
  addFood(f);
}

function addFood(f) {
  const meal = document.getElementById("food-meal")?.value || defaultMeal();
  const item = {
    id: newFoodId(), date: currentFoodDate, meal,
    key: f.key, name: f.name, qty: 1,
    source: f.verified ? "label" : "estimate",
    conf:   f.verified ? "high"  : "med",
  };
  FOOD_MACROS.forEach(k => { item[k] = Number(f[k]) || 0; });
  nutrition.push(item);

  foodQuery = "";
  const box = document.getElementById("food-search");
  if (box) box.value = "";
  persist();
  renderFoodTab();
}

function toggleCustomFood(open) {
  const el = document.getElementById("food-custom");
  if (!el) return;
  el.hidden = !open;
  if (open) document.getElementById("cf-name")?.focus();
}

function addCustomFood() {
  const name = document.getElementById("cf-name")?.value?.trim();
  if (!name) { showToast("Give the item a name"); return; }

  const item = {
    id: newFoodId(), date: currentFoodDate,
    meal: document.getElementById("food-meal")?.value || defaultMeal(),
    key: "", name, qty: 1, source: "manual",
    conf: document.getElementById("cf-conf")?.value || "med",
  };
  FOOD_MACROS.forEach(k => {
    item[k] = numOrNull(document.getElementById(`cf-${k}`)?.value) ?? 0;
  });
  nutrition.push(item);

  ["name", ...FOOD_MACROS].forEach(k => {
    const el = document.getElementById(`cf-${k}`);
    if (el) el.value = "";
  });
  toggleCustomFood(false);
  persist();
  renderFoodTab();
}

// Per-serving values, so changing quantity never compounds rounding error.
// Prefers the database row; falls back to dividing out for custom items.
function foodBase(it) {
  const f = it.key ? foods.find(x => x.key === it.key) : null;
  if (f) return f;
  const q = Number(it.qty) || 1;
  const b = {};
  FOOD_MACROS.forEach(k => { b[k] = (Number(it[k]) || 0) / q; });
  return b;
}

function stepFoodQty(id, delta) {
  const it = nutrition.find(n => n.id === id);
  if (!it) return;
  const next = Math.round(((Number(it.qty) || 1) + delta) * 100) / 100;
  if (next < 0.25) { removeFoodItem(id); return; }

  const base = foodBase(it);
  FOOD_MACROS.forEach(k => {
    it[k] = Math.round((Number(base[k]) || 0) * next * 10) / 10;
  });
  it.qty = next;
  persist();
  renderFoodTab();
}

function removeFoodItem(id) {
  nutrition = nutrition.filter(n => n.id !== id);
  persist();
  renderFoodTab();
}

// ── FOOD: save + sync ─────────────────────────────────────────────────────

async function saveFoodDay() {
  const items = foodItemsFor(currentFoodDate);
  if (!items.length) { showToast("Nothing to save"); return; }

  const entry = {
    _type:   "food",
    date:    currentFoodDate,
    savedAt: new Date().toISOString(),
    items:   items.map(it => ({
      meal: it.meal, key: it.key, name: it.name, qty: it.qty,
      cal: it.cal, p: it.p, c: it.c, fib: it.fib,
      fat: it.fat, sat: it.sat, na: it.na,
      source: it.source, conf: it.conf,
    })),
  };

  showToast(`Saved ${items.length} item(s) ✓`);
  syncFoodToSheets(entry);
}

async function syncFoodToSheets(entry) {
  if (!sheetsUrl) return;
  setSyncStatus("pending", "Syncing…");
  try {
    await postToSheets(entry);
    setSyncStatus("ok", "Synced");
    foodQueue = foodQueue.filter(q => q.date !== entry.date);
  } catch (err) {
    console.error("Food sync failed:", err);
    setSyncStatus("error", "Sync failed — queued");
    foodQueue = foodQueue.filter(q => q.date !== entry.date);
    foodQueue.push(entry);
  }
  persist();
  updateQueueStatus();
}

// ── FOOD: render ──────────────────────────────────────────────────────────

function renderFoodTab() {
  renderFoodTotals();
  renderFoodResults();
  renderFoodItems();
}

function renderFoodTotals() {
  const el = document.getElementById("food-totals");
  if (!el) return;

  const t   = foodTotals(foodItemsFor(currentFoodDate));
  const rem = FOOD_TARGETS.cal - t.cal;
  const pct = Math.min(100, (t.cal / FOOD_TARGETS.cal) * 100);
  const floorPct = (FOOD_TARGETS.calFloor / FOOD_TARGETS.cal) * 100;

  const proteinState = t.p >= FOOD_TARGETS.proteinMin ? "ok"
                     : t.p >= 130                     ? "near" : "under";
  const remLabel = rem > 0
    ? `${fmtNum(rem)} to go`
    : `${fmtNum(-rem)} over`;

  el.innerHTML = `
    <div class="food-totals">
      <div class="food-total-main">
        <div class="food-total-block">
          <span class="ft-num">${fmtNum(t.cal)}</span>
          <span class="ft-unit">cal</span>
          <span class="ft-sub">${remLabel} · target ${fmtNum(FOOD_TARGETS.cal)}</span>
        </div>
        <div class="food-total-block">
          <span class="ft-num ft-${proteinState}">${fmtNum(t.p)}</span>
          <span class="ft-unit">g protein</span>
          <span class="ft-sub">band ${FOOD_TARGETS.proteinMin}–${FOOD_TARGETS.proteinMax}</span>
        </div>
      </div>
      <div class="food-bar" role="img" aria-label="${fmtNum(t.cal)} of ${fmtNum(FOOD_TARGETS.cal)} calories">
        <div class="food-bar-fill" style="width:${pct}%"></div>
        <div class="food-bar-floor" style="left:${floorPct}%" title="2,500 floor"></div>
      </div>
      <div class="food-macro-row">
        <span><b>${fmtNum(t.c)}</b> carb</span>
        <span><b>${fmtNum(t.fib)}</b> fib</span>
        <span><b>${fmtNum(t.fat)}</b> fat</span>
        <span><b>${fmtNum(t.sat)}</b> sat</span>
        <span class="${t.na > 3500 ? "fm-warn" : ""}"><b>${fmtNum(t.na)}</b> mg Na</span>
      </div>
    </div>`;
}

function renderFoodItems() {
  const el = document.getElementById("food-items");
  if (!el) return;

  const items = foodItemsFor(currentFoodDate);
  if (!items.length) {
    el.innerHTML = `<div class="food-empty">Nothing logged for this day yet.</div>`;
    return;
  }

  const groups = MEALS
    .map(meal => ({ meal, rows: items.filter(i => i.meal === meal) }))
    .filter(g => g.rows.length);

  // Anything with an unrecognised meal slot (e.g. edited in the sheet by hand)
  // still has to appear, or it would be invisible but still counted.
  const other = items.filter(i => !MEALS.includes(i.meal));
  if (other.length) groups.push({ meal: "Other", rows: other });

  el.innerHTML = groups.map(g => `
    <div class="food-group">
      <div class="food-group-head">
        <span>${esc(g.meal)}</span>
        <span class="food-group-cal">${fmtNum(foodTotals(g.rows).cal)} cal</span>
      </div>
      ${g.rows.map(it => `
        <div class="food-item">
          <div class="fi-main">
            <div class="fi-name">${esc(it.name)}<span class="fi-src fi-${esc(it.source)}">${esc(it.source)}</span></div>
            <div class="fi-macros">${fmtNum(it.cal)} cal · ${fmtNum(it.p)}g P · ${fmtNum(it.na)}mg Na</div>
          </div>
          <div class="fi-qty">
            <button class="qty-btn" onclick="stepFoodQty('${it.id}',-0.5)" aria-label="Less">−</button>
            <span class="qty-val">${it.qty}</span>
            <button class="qty-btn" onclick="stepFoodQty('${it.id}',0.5)" aria-label="More">+</button>
          </div>
          <button class="btn btn-ghost btn-sm btn-danger" onclick="removeFoodItem('${it.id}')"
                  aria-label="Remove ${esc(it.name)}">×</button>
        </div>`).join("")}
    </div>`).join("");
}

// ── SETTINGS ──────────────────────────────────────────────────────────────

function renderSettings() {
  const input = document.getElementById("sheets-url");
  if (input) input.value = sheetsUrl;
  const secret = document.getElementById("sheets-secret");
  if (secret) secret.value = sheetsSecret;
  updateQueueStatus();
}

function saveSettings() {
  const input  = document.getElementById("sheets-url");
  const secret = document.getElementById("sheets-secret");
  sheetsUrl    = (input?.value  || "").trim();
  sheetsSecret = (secret?.value || "").trim();
  persist();
  setSyncStatus(sheetsUrl ? "none" : "", sheetsUrl ? "Ready" : "");
  showToast("Settings saved");
}

async function testConnection() {
  const url = document.getElementById("sheets-url")?.value?.trim();
  const key = document.getElementById("sheets-secret")?.value?.trim();
  if (!url) { showToast("Enter a URL first"); return; }
  showToast("Testing…");
  try {
    const body = key ? { _test: true, _key: key } : { _test: true };
    const res  = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(body),
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
  const parts = [];
  if (syncQueue.length) parts.push(`${syncQueue.length} workout(s)`);
  if (foodQueue.length) parts.push(`${foodQueue.length} food day(s)`);
  el.textContent = parts.length
    ? `${parts.join(" and ")} pending sync.`
    : "Queue is empty — everything synced.";
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────

function exportData() {
  const blob = new Blob(
    [JSON.stringify({ workouts, weightLog, nutrition, exportedAt: new Date().toISOString() }, null, 2)],
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
      const importedFood     = Array.isArray(parsed.nutrition) ? parsed.nutrition : [];
      if (!importedWorkouts) throw new Error("Invalid format");
      const importedFoodDays = [...new Set(importedFood.map(i => i.date))];
      const totalItems = importedWorkouts.length + importedWeight.length + importedFood.length;
      showConfirm(
        "Import data?",
        `This will merge ${importedWorkouts.length} workout(s), ${importedWeight.length} weight entry(ies) `
        + `and ${importedFood.length} food item(s) across ${importedFoodDays.length} day(s) into your existing data.`,
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

          // Food merges a whole day at a time — a partially-imported day would
          // be worse than none, since the Sheets write replaces the date.
          const existingFoodDays = new Set(nutrition.map(i => i.date));
          const newFoodDays = importedFoodDays.filter(d => !existingFoodDays.has(d));
          newFoodDays.forEach(date => {
            importedFood
              .filter(i => i.date === date)
              .forEach(i => nutrition.push({ ...i, id: i.id || newFoodId() }));
          });

          persist();
          showToast(`Imported ${totalItems} item(s)`);
          newWorkouts.forEach(entry => syncToSheets(entry));
          newWeightEntries.forEach(entry => syncWeightToSheets(entry));
          newFoodDays.forEach(date => {
            const items = foodItemsFor(date);
            syncFoodToSheets({
              _type: "food", date, savedAt: new Date().toISOString(),
              items: items.map(it => ({
                meal: it.meal, key: it.key, name: it.name, qty: it.qty,
                cal: it.cal, p: it.p, c: it.c, fib: it.fib,
                fat: it.fat, sat: it.sat, na: it.na,
                source: it.source, conf: it.conf,
              })),
            });
          });
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
pruneDrafts();

currentLogDate  = todayISO();
currentFoodDate = currentLogDate;
document.getElementById("workout-date").value = currentLogDate;
document.getElementById("weight-date").value   = currentLogDate;
document.getElementById("food-date").value     = currentFoodDate;
document.getElementById("food-meal").value     = defaultMeal();
loadDraftOrWorkout(currentLogDate);

updateQueueStatus();

// Save draft when any weight/reps input changes
document.getElementById("exercises-container").addEventListener("input", () => {
  saveDraft(currentLogDate);
});

// On date change: save draft for the departing date, load for the new one
document.getElementById("workout-date").addEventListener("change", e => {
  saveDraft(currentLogDate);
  currentLogDate = e.target.value;
  loadDraftOrWorkout(currentLogDate);
});

document.getElementById("food-date").addEventListener("change", e => {
  currentFoodDate = e.target.value;
  renderFoodTab();
});

document.getElementById("food-search").addEventListener("input", e => {
  onFoodSearch(e.target.value);
});

// Fetch latest data from Sheets in the background — app is usable immediately
// from localStorage cache while the request completes.
if (sheetsUrl) fetchFromSheets();
else setSyncStatus("", "");