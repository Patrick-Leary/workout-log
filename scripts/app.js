/* =============================================================
   LIFT LOG — app.js
   All application logic. No framework, no build step needed.
   ============================================================= */

// ── CONFIG ────────────────────────────────────────────────────────────────

// Muscle groups. Order drives the Progress tiles.
const GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

// The headline rank is built from five movement PATTERNS, not five named lifts.
//
// Naming specific barbell lifts assumed a barbell program. Patrick trains in a
// building gym with a Smith machine and no spotter, so barbell bench and back
// squat may never happen — and a headline keyed to them would have sat pinned
// at zero forever while he trained perfectly well. A pattern is satisfied by
// whichever exercise he actually does; each slot takes its best-ranked member.
const HEADLINE_PATTERNS = [
  { name: "Horizontal push", ids: ["bench", "dips", "pushups"] },
  { name: "Vertical push",   ids: ["ohpress"] },
  { name: "Horizontal pull", ids: ["rows", "seatedrow"] },
  { name: "Vertical pull",   ids: ["pullups", "latpulldown"] },
  { name: "Legs",            ids: ["squat", "legpress", "splitsquat"] },
];

// Exercise catalogue — matches the building gym downstairs (2026-09-05).
//   group     which muscle-group tile it feeds
//   weight    1.0 compound · 0.75 machine · 0.5 isolation (group-score weighting)
//   variants  first entry is the default; `std` maps variant -> STANDARDS key
//   perSide   reps are per side; `perHand` weight entered is per dumbbell
const EXERCISES = [
  // ── Chest ───────────────────────────────────────────────────────────────
  { id: "bench",       name: "Bench Press",       group: "Chest",     defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,
    variants: ["Smith", "Dumbbell", "Barbell"], perHand: true,
    std: { Barbell: "bench-bb", Smith: "bench-smith", Dumbbell: "bench-db" } },
  { id: "pushups",     name: "Push-Ups",          group: "Chest",     defaultSets: 3, repRange: null,     weighted: false, weight: 0.75, amrap: true,
    variants: ["Bodyweight"], std: { Bodyweight: "pushups" } },
  { id: "dips",        name: "Dips",              group: "Chest",     defaultSets: 3, repRange: null,     weighted: false, weight: 1.0, amrap: true,
    variants: ["Bodyweight", "Weighted"], std: {} },

  // ── Back ────────────────────────────────────────────────────────────────
  { id: "pullups",     name: "Pull-Ups",          group: "Back",      defaultSets: 3, repRange: null,     weighted: false, weight: 1.0, amrap: true,
    variants: ["Bodyweight", "Weighted"], std: { Bodyweight: "pullups" } },
  { id: "latpulldown", name: "Lat Pulldown",      group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0,
    variants: ["Cable"], std: { Cable: "latpulldown" } },
  { id: "seatedrow",   name: "Seated Row",        group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 0.75,
    variants: ["Cable"], std: { Cable: "seatedrow" } },
  { id: "rows",        name: "Dumbbell Rows",      group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0, perSide: true, perHand: true,
    variants: ["Dumbbell", "Barbell"], std: { Dumbbell: "row-db" } },

  // ── Legs ────────────────────────────────────────────────────────────────
  { id: "squat",       name: "Squat",             group: "Legs",      defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,
    variants: ["Smith", "Barbell", "Dumbbell", "Bodyweight"],
    std: { Barbell: "squat-bb", Smith: "squat-smith" },
    hint: "enter 0 for bodyweight" },
  { id: "legpress",    name: "Leg Press",         group: "Legs",      defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.75,
    variants: ["Machine"], std: { Machine: "legpress" } },
  { id: "rdl",         name: "Romanian Deadlift", group: "Legs",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0, perHand: true,
    variants: ["Dumbbell", "Barbell"], std: { Dumbbell: "rdl-db" } },
  { id: "splitsquat",  name: "Split Squat",       group: "Legs",      defaultSets: 3, repRange: [8, 10],  weighted: true,  weight: 1.0, perSide: true,
    variants: ["Dumbbell", "Bodyweight"], std: {},
    hint: "per leg · enter 0 for bodyweight" },

  // ── Shoulders ───────────────────────────────────────────────────────────
  { id: "ohpress",     name: "Overhead Press",    group: "Shoulders", defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,
    variants: ["Barbell", "Dumbbell"], std: { Barbell: "ohp-bb", Dumbbell: "ohp-db" } },
  { id: "latraise",    name: "Lateral Raise",     group: "Shoulders", defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.5, perHand: true,
    variants: ["Dumbbell seated", "Dumbbell standing", "Cable"],
    std: { "Dumbbell seated": "latraise-db", "Dumbbell standing": "latraise-db", Cable: "latraise-db" } },

  // ── Arms ────────────────────────────────────────────────────────────────
  { id: "curls",       name: "Bicep Curls",       group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5, perHand: true,
    variants: ["Dumbbell", "Barbell", "Cable"], std: { Dumbbell: "curl-db" } },
  { id: "hammercurl",  name: "Hammer Curl",       group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5, perHand: true,
    variants: ["Dumbbell"], std: { Dumbbell: "hammercurl-db" } },
  { id: "triceppd",    name: "Tricep Pulldown",   group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5,
    variants: ["Cable"], std: {} },

  // ── Core ────────────────────────────────────────────────────────────────
  { id: "legraise",    name: "Leg Raise",         group: "Core",      defaultSets: 3, repRange: null,     weighted: false, weight: 0.5, amrap: true,
    variants: ["Hanging", "Captain's chair"], std: {} },
  { id: "situps",      name: "Sit-Ups",           group: "Core",      defaultSets: 3, repRange: null,     weighted: false, weight: 0.5, amrap: true,
    variants: ["Bodyweight"], std: {} },

  // ── Legacy ──────────────────────────────────────────────────────────────
  // No longer in the picker (the gym has no chest press machine), but kept so
  // the May 2026 history stays visible in History and Progress.
  { id: "chestpress",  name: "Chest Press",       group: "Chest",     defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.75, legacy: true,
    variants: ["Machine"], std: {} },
];

// What the "+ Add Exercise" picker offers.
const ACTIVE_EXERCISES = EXERCISES.filter(e => !e.legacy);

/* ── STRENGTH STANDARDS ───────────────────────────────────────────────────
   Source: Strength Level, male, at a 130 lb REFERENCE bodyweight.
   Values are 1RM in lb per the exercise's own convention (per dumbbell where
   the lift is loaded per hand); `reps` kinds are rep counts, not weight.

   ⚠️ These are percentiles of *people who log lifts on Strength Level* — a
   self-selected, committed population. "50th percentile" is well above the
   50th percentile of men generally. Labelled as such in the UI.

   Bodyweight scaling: thresholds move allometrically, (bw/130)^0.67, so the
   ladder measures strength PER POUND. Bulking raises the bar — deliberately:
   if rank stalls while the scale climbs, the surplus isn't becoming muscle.
   Rep-based standards are NOT scaled (no published curve to fit) — they are
   compared at the 130 lb reference. Known limitation.                        */
const STD_REF_BW  = 130;
const PCT_ANCHORS = [5, 20, 50, 80, 95];
const Z_ANCHORS   = [-1.6449, -0.8416, 0, 0.8416, 1.6449];

const STANDARDS = {
  "squat-bb":       { kind: "weight", v: [106, 153, 211, 279, 352] },
  "squat-smith":    { kind: "weight", v: [ 80, 129, 193, 270, 355] },
  "bench-bb":       { kind: "weight", v: [ 80, 114, 156, 205, 258] },
  "bench-smith":    { kind: "weight", v: [ 78, 112, 155, 205, 258] },
  "bench-db":       { kind: "weight", v: [ 27,  43,  65,  91, 120] },
  "ohp-bb":         { kind: "weight", v: [ 45,  68,  98, 133, 172] },
  "ohp-db":         { kind: "weight", v: [ 20,  33,  50,  70,  93] },
  "row-db":         { kind: "weight", v: [ 26,  44,  69,  99, 133] },
  "rdl-db":         { kind: "weight", v: [ 26,  46,  72, 105, 141] },
  "curl-db":        { kind: "weight", v: [ 12,  23,  38,  57,  79] },
  "hammercurl-db":  { kind: "weight", v: [ 15,  25,  39,  56,  75] },
  "latraise-db":    { kind: "weight", v: [  7,  16,  28,  45,  64] },
  "legpress":       { kind: "weight", v: [152, 248, 373, 525, 694] },
  "latpulldown":    { kind: "weight", v: [ 77, 109, 150, 196, 246] },
  "seatedrow":      { kind: "weight", v: [ 72, 105, 147, 197, 250] },
  "pushups":        { kind: "reps",   v: [  3,  19,  41,  67,  96] },
  "pullups":        { kind: "reps",   v: [  1,   7,  14,  23,  33] },
};

// Patrick's ladder (2026-09-05). Evenly spaced percentile bands — Champion at
// 80 lands exactly on Strength Level's "Advanced".
const TIERS = [
  { name: "Bronze",   lo:  0, hi: 10 },
  { name: "Silver",   lo: 10, hi: 25 },
  { name: "Gold",     lo: 25, hi: 40 },
  { name: "Platinum", lo: 40, hi: 60 },
  { name: "Diamond",  lo: 60, hi: 80 },
  { name: "Champion", lo: 80, hi: 100 },
];

// Upkeep decay. NOT a strength measurement — the detraining literature says
// strength holds for 2-4 weeks and only drops meaningfully past ~4. This is a
// deliberate house rule for motivation, labelled as one in the UI. Training the
// group replaces the estimate with a real measurement and restores it at once.
const DECAY = { graceDays: 7, daysPerDivision: 5, maxTiersLost: 1 };

// Nutrition targets — from the lean-bulk plan. 2,650 is the target and 2,500
// the floor; protein has a band rather than a single number.
const FOOD_TARGETS = { cal: 2650, calFloor: 2500, proteinMin: 150, proteinMax: 190 };

const MEALS = ["Breakfast", "Lunch", "Snack", "Dinner"];

/* ── NUTRIENTS ────────────────────────────────────────────────────────────
   key   column key in Foods/Nutrition and on the item objects
   dv    FDA Daily Value (the label standard, so app numbers match packages)
   src   where the data realistically comes from, surfaced as a reliability
         badge: "label" = on every US Nutrition Facts panel since 2016,
         "usda"  = voluntary on labels, looked up, "est" = wide error bars
   goal  "hit"  meet or exceed the DV
         "cap"  stay under (sodium, sat fat, added sugar)
   Blank is NOT zero. Day totals carry a coverage % — the share of the day's
   calories that came from items actually carrying a value for that nutrient —
   so a half-filled column reads as "53% covered", never as a deficiency.       */
const NUTRIENTS = [
  { key: "cal",    label: "Calories",      unit: "",    dv: 2650, src: "label", goal: "hit",  core: true },
  { key: "p",      label: "Protein",       unit: "g",   dv: 150,  src: "label", goal: "hit",  core: true },
  { key: "c",      label: "Carbs",         unit: "g",   dv: 275,  src: "label", goal: null,   core: true },
  { key: "fib",    label: "Fiber",         unit: "g",   dv: 28,   src: "label", goal: "hit",  core: true },
  { key: "fat",    label: "Fat",           unit: "g",   dv: 78,   src: "label", goal: null,   core: true },
  { key: "sat",    label: "Sat fat",       unit: "g",   dv: 20,   src: "label", goal: "cap",  core: true },
  { key: "na",     label: "Sodium",        unit: "mg",  dv: 2300, src: "label", goal: "cap",  core: true, target: 2750 },
  { key: "trans",  label: "Trans fat",     unit: "g",   dv: 0,    src: "label", goal: "cap"  },
  // Recorded but not scored. The 2015 Dietary Guidelines dropped the 300mg
  // limit and dietary cholesterol's effect on serum lipids is weak; flagging it
  // daily for a 23-year-old with no lipid concern is noise, not a finding.
  { key: "chol",   label: "Cholesterol",   unit: "mg",  dv: 300,  src: "label", goal: null   },
  { key: "sugar",  label: "Total sugars",  unit: "g",   dv: 0,    src: "label", goal: null   },
  { key: "addsug", label: "Added sugars",  unit: "g",   dv: 50,   src: "label", goal: "cap"  },
  { key: "vitd",   label: "Vitamin D",     unit: "mcg", dv: 20,   src: "label", goal: "hit"  },
  { key: "ca",     label: "Calcium",       unit: "mg",  dv: 1300, src: "label", goal: "hit"  },
  { key: "fe",     label: "Iron",          unit: "mg",  dv: 18,   src: "label", goal: "hit"  },
  { key: "k",      label: "Potassium",     unit: "mg",  dv: 4700, src: "label", goal: "hit"  },
  { key: "vita",   label: "Vitamin A",     unit: "mcg", dv: 900,  src: "usda",  goal: "hit"  },
  { key: "vitc",   label: "Vitamin C",     unit: "mg",  dv: 90,   src: "usda",  goal: "hit"  },
  { key: "vite",   label: "Vitamin E",     unit: "mg",  dv: 15,   src: "usda",  goal: "hit"  },
  { key: "vitk",   label: "Vitamin K",     unit: "mcg", dv: 120,  src: "usda",  goal: "hit"  },
  { key: "b6",     label: "Vitamin B6",    unit: "mg",  dv: 1.7,  src: "usda",  goal: "hit"  },
  { key: "b12",    label: "Vitamin B12",   unit: "mcg", dv: 2.4,  src: "usda",  goal: "hit"  },
  { key: "folate", label: "Folate",        unit: "mcg", dv: 400,  src: "usda",  goal: "hit"  },
  { key: "mg",     label: "Magnesium",     unit: "mg",  dv: 420,  src: "usda",  goal: "hit"  },
  { key: "zn",     label: "Zinc",          unit: "mg",  dv: 11,   src: "usda",  goal: "hit"  },
];

// Every numeric nutrient column, in sheet order.
const FOOD_MACROS = NUTRIENTS.map(n => n.key);
// The seven that existed before 2026-09-05 and drive the headline readout.
const CORE_MACROS = NUTRIENTS.filter(n => n.core).map(n => n.key);

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
  if (ex.hint) return ex.hint;
  // `perHand` matters for ranking: the strength standards for dumbbell lifts
  // are quoted per dumbbell, so the number entered has to be per dumbbell too.
  if (ex.perHand && ex.perSide) return "per side · weight per dumbbell";
  if (ex.perHand)               return "weight per dumbbell";
  if (ex.perSide)               return "per side";
  return null;
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
let foodDirty      = [];   // dates with local edits not yet accepted by Sheets
let lastFoodResults = [];  // what the picker is currently showing
let weightLookback = null; // null = all time
let weightGoal     = "gain";  // gain | maintain | lose — drives the trend colours
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
    foodDirty  = JSON.parse(localStorage.getItem("ll_food_dirty") || "[]");
    sheetsSecret = localStorage.getItem("ll_sheets_secret")       || "";
    weightGoal   = localStorage.getItem("ll_weight_goal")         || "gain";
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
    localStorage.setItem("ll_food_dirty", JSON.stringify(foodDirty));
    localStorage.setItem("ll_sheets_secret", sheetsSecret);
    localStorage.setItem("ll_weight_goal", weightGoal);
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
  if (source) source.forEach(ex => addExerciseToLog(ex.id, ex.sets, ex.variant));
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

// Last session's best set. Variant-scoped when one is given, because comparing
// a seated lateral raise to a standing one produces a "regression" that isn't.
function getLastBest(exerciseId, variant) {
  for (let i = 0; i < workouts.length; i++) {
    const matches = workouts[i].exercises.filter(e =>
      e.id === exerciseId && (!variant || !e.variant || e.variant === variant));
    for (const ex of matches) {
      const done = ex.sets.filter(s => s.reps != null);
      if (!done.length) continue;
      return done.reduce((best, s) =>
        (s.weight ?? 0) >= (best.weight ?? 0) ? s : best, done[0]);
    }
  }
  return null;
}

// Which variant to preselect: whatever was used last, else the first listed.
function lastVariantFor(exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  const fallback = ex && ex.variants ? ex.variants[0] : "";
  for (let i = 0; i < workouts.length; i++) {
    const logged = workouts[i].exercises.find(e => e.id === exId);
    if (logged && logged.variant) return logged.variant;
  }
  return fallback;
}

// Refresh the "Last: …" hint when the variant dropdown changes, so the target
// on screen is always the one for the variant actually selected.
function onVariantChange(exId) {
  const sel   = document.getElementById(`variant-${exId}`);
  const label = document.querySelector(`.exercise-block[data-exid="${exId}"] .prev-best`);
  if (!sel || !label) return;
  const ex   = EXERCISES.find(e => e.id === exId);
  const best = getLastBest(exId, sel.value);
  label.textContent = best
    ? (ex.weighted ? `Last: ${best.weight ?? "–"}lb × ${best.reps}` : `Last: ${best.reps} reps`)
    : "First session";
  saveDraft(currentLogDate);
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
  const available = ACTIVE_EXERCISES.filter(ex => !addedExercises.includes(ex.id));
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

function addExerciseToLog(exId, prefilledSets = null, prefilledVariant = null) {
  if (addedExercises.includes(exId)) return;
  addedExercises.push(exId);
  pickerOpen = false;

  const ex        = EXERCISES.find(e => e.id === exId);
  const container = document.getElementById("exercises-container");
  const variant   = prefilledVariant || lastVariantFor(exId);
  const best      = getLastBest(ex.id, variant);
  const prevText  = best
    ? (ex.weighted ? `Last: ${best.weight ?? "–"}lb × ${best.reps}` : `Last: ${best.reps} reps`)
    : "First session";
  const variantSel = ex.variants && ex.variants.length > 1
    ? `<select class="select-input variant-select" id="variant-${ex.id}"
               aria-label="${ex.name} variant" onchange="onVariantChange('${ex.id}')">
         ${ex.variants.map(v =>
           `<option value="${v}"${v === variant ? " selected" : ""}>${v}</option>`).join("")}
       </select>`
    : `<input type="hidden" id="variant-${ex.id}" value="${ex.variants ? ex.variants[0] : ""}">`;

  const block = document.createElement("div");
  block.className    = "exercise-block";
  block.dataset.exid = ex.id;
  block.innerHTML    = `
    <div class="exercise-header">
      <div class="exercise-title">
        <div class="exercise-name">${ex.name}</div>
        ${exerciseHint(ex) ? `<div class="exercise-hint">${exerciseHint(ex)}</div>` : ""}
        ${variantSel}
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
    const variant = document.getElementById(`variant-${exId}`)?.value
                 || (ex.variants ? ex.variants[0] : "");
    return { id: ex.id, name: ex.name, variant, sets };
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
    // Sheet rows carry no id, but the quantity and remove controls address
    // items by id — without one they render fine and then refuse to be edited.
    if (Array.isArray(json.nutrition)) {
      // A day with unsaved local edits must survive the fetch. Overwriting
      // wholesale silently discarded anything added but not yet saved.
      const dirty = new Set(foodDirty);
      const fromSheet = json.nutrition
        .filter(it => !dirty.has(it.date))
        .map(it => ({ ...it, id: it.id || newFoodId() }));
      const keptLocal = nutrition.filter(it => dirty.has(it.date));
      nutrition = [...fromSheet, ...keptLocal];
    }
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
  // Sync settings are per-browser, so a device that has never had the URL
  // pasted in looks identical to a broken app. Say which it is.
  if (!sheetsUrl) {
    el.innerHTML = `<span class="sync-dot"></span>Not connected`;
    return;
  }
  el.innerHTML = `<span class="sync-dot ${state}"></span>${label}`;
}

function setWeightGoal(goal) {
  weightGoal = goal;
  persist();
  renderProgress();
  renderSettings();
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
    const diff  = +(filtered[filtered.length - 1].weight - filtered[0].weight).toFixed(1);
    const sign  = diff > 0 ? "+" : "";
    const days  = daysBetween(filtered[0].date, filtered[filtered.length - 1].date);
    const rate  = days > 0 ? (diff / days) * 7 : 0;   // lb per week
    const { cls, note } = weightVerdict(rate, filtered.length, days);
    statHtml = `<div class="weight-trend-stat">
      <span class="weight-stat-delta ${cls}">${sign}${diff} lbs</span> over this period
      ${days >= 7 ? `<span class="weight-rate">${rate > 0 ? "+" : ""}${rate.toFixed(2)} lb/wk</span>` : ""}
      ${note ? `<span class="weight-note">${note}</span>` : ""}
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

// Weight is judged against the GOAL, not against a built-in assumption that
// down is good. On a lean bulk, gaining is the point — the old code painted
// every gain with --color-warning and every loss with --color-success.
//
// And it is judged on RATE, not raw change: ~0.5 lb/wk is the target pace for a
// lean beginner, >1 lb/wk means the surplus is outrunning what can be built.
// Stays neutral until there is a week of data, because the first honest
// average needs ~7 days and colouring noise teaches nothing.
function weightVerdict(ratePerWeek, points, days) {
  if (points < 3 || days < 7) return { cls: "", note: "too early to read" };

  if (weightGoal === "gain") {
    if (ratePerWeek >= 0.25 && ratePerWeek <= 1.0) return { cls: "stat-good", note: "on plan" };
    if (ratePerWeek > 1.0)   return { cls: "stat-watch", note: "fast — likely not all tissue" };
    return { cls: "stat-watch", note: "under target pace" };
  }
  if (weightGoal === "lose") {
    if (ratePerWeek <= -0.25 && ratePerWeek >= -1.5) return { cls: "stat-good", note: "on plan" };
    if (ratePerWeek < -1.5)  return { cls: "stat-watch", note: "fast" };
    return { cls: "stat-watch", note: "under target pace" };
  }
  return Math.abs(ratePerWeek) <= 0.25
    ? { cls: "stat-good",  note: "holding" }
    : { cls: "stat-watch", note: "drifting" };
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

// ── RANK ENGINE ───────────────────────────────────────────────────────────
/* Logged set -> estimated 1RM -> population percentile -> tier + division.
   See STANDARDS above for the data source and its caveats.                   */

// Latest logged bodyweight. Standards are bodyweight-indexed, so this is what
// makes the ladder a strength-PER-POUND measure.
function currentBodyweight() {
  if (!weightLog.length) return STD_REF_BW;
  const latest = weightLog.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  return Number(latest.weight) || STD_REF_BW;
}

// Epley. Linear in reps, fitted on 1-10 rep data — above ~12 the limiter stops
// being max force and becomes endurance, so the estimate spreads badly
// (15lb x 20: Epley 25.0, Brzycki 31.8). Anything over 12 reps is flagged.
function epley(weight, reps) {
  const w = Number(weight), r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || r < 1) return null;
  return w * (1 + r / 30);
}

function e1rmConfidence(reps) {
  return reps > 12 ? "low" : reps > 10 ? "med" : "high";
}

// Normal CDF — Abramowitz & Stegun 26.2.17.
function normCdf(z) {
  const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937,
        b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z);
  const t = 1 / (1 + p * z);
  const y = 1 - (((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t)
            * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  return sign === 1 ? y : 1 - y;
}

// Percentile for a value against a 5-anchor standards table. Strength in a
// population is close to log-normal, so interpolate ln(value) against the
// anchors' z-scores; that keeps the curve smooth between published points and
// lets the tier bands sit at arbitrary percentiles rather than only at the
// five Strength Level publishes.
function percentileFor(value, std, bw) {
  if (!std || !Number.isFinite(value) || value <= 0) return null;

  // Weight standards scale allometrically with bodyweight; rep standards are
  // left at the reference bodyweight (no published curve to fit).
  const scale = std.kind === "weight" ? Math.pow(bw / STD_REF_BW, 0.67) : 1;
  const t = std.v.map(v => v * scale);
  const lv = Math.log(value);
  const lt = t.map(Math.log);

  let z;
  if (lv <= lt[0]) {
    // Below the first anchor — extrapolate on the first segment's slope.
    const slope = (lt[1] - lt[0]) / (Z_ANCHORS[1] - Z_ANCHORS[0]);
    z = Z_ANCHORS[0] + (lv - lt[0]) / slope;
  } else if (lv >= lt[4]) {
    const slope = (lt[4] - lt[3]) / (Z_ANCHORS[4] - Z_ANCHORS[3]);
    z = Z_ANCHORS[4] + (lv - lt[4]) / slope;
  } else {
    let i = 0;
    while (i < 3 && lv > lt[i + 1]) i++;
    const frac = (lv - lt[i]) / (lt[i + 1] - lt[i]);
    z = Z_ANCHORS[i] + frac * (Z_ANCHORS[i + 1] - Z_ANCHORS[i]);
  }
  return Math.max(0, Math.min(100, normCdf(z) * 100));
}

// Percentile -> continuous rung on a 0-6 scale (one unit per tier), plus the
// display tier and division. Division 3 is the bottom third of a tier, 1 the
// top, matching the ladder conventions people already know from games.
function tierFromPct(pct) {
  if (pct == null) return null;
  let i = TIERS.findIndex(t => pct < t.hi);
  if (i === -1) i = TIERS.length - 1;
  const t = TIERS[i];
  const frac = Math.max(0, Math.min(0.999, (pct - t.lo) / (t.hi - t.lo)));
  return { tier: t.name, tierIndex: i, division: 3 - Math.floor(frac * 3), rung: i + frac };
}

function rungToTier(rung) {
  const clamped = Math.max(0, Math.min(TIERS.length - 0.001, rung));
  const i = Math.floor(clamped);
  const frac = clamped - i;
  return { tier: TIERS[i].name, tierIndex: i, division: 3 - Math.floor(frac * 3), rung: clamped };
}

function stdForExercise(ex, variant) {
  const key = ex.std && ex.std[variant || (ex.variants && ex.variants[0])];
  return key ? STANDARDS[key] : null;
}

// The value a set contributes: reps for bodyweight movements, e1RM otherwise.
function setValue(ex, set) {
  const reps = Number(set.reps);
  if (!Number.isFinite(reps) || reps < 1) return null;
  if (!ex.weighted) return reps;
  const w = Number(set.weight);
  if (!Number.isFinite(w) || w <= 0) return null;   // unloaded -> not rankable
  return epley(w, reps);
}

// Best set PER VARIANT, plus which variant was trained most recently.
//
// Variants must not be pooled. The 2026-09-03 finding is the reason: standing
// lateral raises at 15lb x 10 were momentum-assisted, and seated at 15lb x 8 is
// the honest baseline. Pooling picks the standing set and reports a rank the
// lift can't back up. Ranking per variant, and reporting the most RECENT one,
// means switching to a stricter variant resets the baseline the way it should.
function bestSetsByVariant(exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return null;
  const byVariant = {};
  let lastDate = null, lastVariant = null;

  workouts.forEach(w => {
    const logged = w.exercises.find(x => x.id === exId);
    if (!logged) return;
    const done = logged.sets.filter(s => s.reps != null);
    if (!done.length) return;

    const variant = logged.variant || (ex.variants && ex.variants[0]) || "";
    if (!lastDate || w.date > lastDate) { lastDate = w.date; lastVariant = variant; }

    done.forEach(s => {
      const v = setValue(ex, s);
      if (v == null) return;
      const cur = byVariant[variant];
      if (!cur || v > cur.value) {
        byVariant[variant] = { value: v, date: w.date, reps: Number(s.reps),
                               weight: s.weight, variant };
      }
    });
  });

  return lastDate ? { byVariant, lastDate, lastVariant } : null;
}

// Full rank for one exercise, peak preserved separately from the decayed value.
function rankForExercise(exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return null;
  const found = bestSetsByVariant(exId);
  if (!found) return null;

  const { byVariant, lastDate, lastVariant } = found;
  const daysSince = daysBetween(lastDate, todayISO());
  const base = { id: exId, name: ex.name, group: ex.group, weight: ex.weight,
                 lastDate, daysSince, variant: lastVariant };

  // Rank the variant actually being trained now, not the flattering one.
  const best = byVariant[lastVariant];
  if (!best) return { ...base, ranked: false, reason: "no loaded sets" };

  const std = stdForExercise(ex, lastVariant);
  if (!std) return { ...base, ranked: false, reason: "no standards for this variant",
                     value: best.value, reps: best.reps };

  const pct  = percentileFor(best.value, std, currentBodyweight());
  const peak = tierFromPct(pct);
  if (!peak) return { ...base, ranked: false, reason: "unrankable" };

  const { rung, lost } = applyDecay(peak.rung, daysSince);

  // Other variants stay visible, so a stronger-but-stale variant does not
  // silently vanish when the training style changes.
  const others = Object.values(byVariant)
    .filter(b => b.variant !== lastVariant)
    .map(b => {
      const s = stdForExercise(ex, b.variant);
      const p = s ? percentileFor(b.value, s, currentBodyweight()) : null;
      return { variant: b.variant, value: b.value, date: b.date,
               ...(p != null ? tierFromPct(p) : {}), pct: p };
    });

  return { ...base, ranked: true, pct, peak, lost, others,
           value: best.value, reps: best.reps, bestDate: best.date,
           confidence: e1rmConfidence(best.reps), unit: std.kind,
           ...rungToTier(rung) };
}

// Upkeep decay. Deliberately a house rule, not physiology — see DECAY.
function applyDecay(rung, daysSince) {
  if (rung == null || daysSince == null || daysSince <= DECAY.graceDays) {
    return { rung, lost: 0 };
  }
  const divisions = Math.floor((daysSince - DECAY.graceDays) / DECAY.daysPerDivision);
  const lost = Math.min(divisions / 3, DECAY.maxTiersLost);
  return { rung: Math.max(0, rung - lost), lost };
}

function allRanks() {
  return EXERCISES.map(ex => rankForExercise(ex.id)).filter(Boolean);
}

// Group score: weighted mean of rungs (compound 1.0 / machine 0.75 /
// isolation 0.5), so Arms can't ride to Gold on curls alone.
function groupRank(group) {
  const rs = allRanks().filter(r => r.group === group && r.ranked);
  if (!rs.length) return null;
  const wsum = rs.reduce((s, r) => s + r.weight, 0);
  const rung = rs.reduce((s, r) => s + r.rung * r.weight, 0) / wsum;
  const days = Math.min(...rs.map(r => r.daysSince ?? 9999));
  return { group, ...rungToTier(rung), count: rs.length, daysSince: days,
           isolationOnly: rs.every(r => r.weight <= 0.5),
           thin: rs.length === 1,
           decayed: rs.some(r => r.lost > 0) };
}

// Headline: one slot per movement pattern, each filled by its best-ranked
// exercise. Unfilled slots count as rung 0 rather than being skipped — that is
// what keeps "Bronze" honest for someone with three patterns untrained, instead
// of letting one strong lift carry the whole score.
function overallRank() {
  const ranks = allRanks();
  const slots = HEADLINE_PATTERNS.map(p => {
    const candidates = ranks.filter(r => p.ids.includes(r.id) && r.ranked);
    if (!candidates.length) return { pattern: p.name, rung: 0, filled: false };
    const best = candidates.reduce((a, b) => (b.rung > a.rung ? b : a));
    return { pattern: p.name, rung: best.rung, filled: true,
             via: best.name, tier: best.tier, division: best.division };
  });
  const rung    = slots.reduce((s, x) => s + x.rung, 0) / slots.length;
  const missing = slots.filter(s => !s.filled).map(s => s.pattern);
  return { ...rungToTier(rung), slots, missing, count: slots.length - missing.length };
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

function tierClass(tier) { return "tier-" + String(tier || "").toLowerCase(); }

// 1st/2nd/3rd/4th — 11-13 are the exception that catches naive implementations.
function ordinal(n) {
  const v = Math.round(n), rem100 = v % 100;
  if (rem100 >= 11 && rem100 <= 13) return v + "th";
  return v + (["th", "st", "nd", "rd"][v % 10] || "th");
}

function rankLabel(r) {
  return r && r.tier ? `${r.tier} ${r.division}` : "Unranked";
}

// e1RM over time for one exercise, restricted to a single variant so the line
// doesn't jump when the movement changes (seated vs standing lateral raise).
function e1rmSeries(exId, variant) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return [];
  return workouts
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => {
      const logged = w.exercises.find(e =>
        e.id === exId && (!variant || !e.variant || e.variant === variant));
      if (!logged) return null;
      const vals = logged.sets.map(s => setValue(ex, s)).filter(v => v != null);
      return vals.length ? { date: w.date, value: Math.max(...vals) } : null;
    })
    .filter(Boolean);
}

function sparkline(series) {
  if (series.length < 2) return "";
  const W = 120, H = 28, P = 2;
  const vals = series.map(s => s.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = series.map((s, i) => {
    const x = P + (i / (series.length - 1)) * (W - 2 * P);
    const y = H - P - ((s.value - min) / span) * (H - 2 * P);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="Estimated 1RM trend across ${series.length} sessions">
      <polyline points="${pts.join(" ")}" fill="none" stroke="var(--color-primary)"
        stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${pts[pts.length - 1].split(",")[0]}" cy="${pts[pts.length - 1].split(",")[1]}"
        r="2" fill="var(--color-primary)"/>
    </svg>`;
}

function renderProgress() {
  const grid       = document.getElementById("progress-grid");
  const streakArea = document.getElementById("streak-area");
  const rankArea   = document.getElementById("rank-area");
  grid.innerHTML   = "";
  renderWeightTrendSection();

  const streak = calcStreak();
  streakArea.innerHTML = streak > 0
    ? `<div class="streak-badge">🔥 ${streak}-session streak</div>`
    : `<div class="streak-badge streak-none">No active streak — keep going!</div>`;

  if (!workouts.length) {
    if (rankArea) rankArea.innerHTML = "";
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <h3>No workout data yet</h3>
        <p>Complete a few workouts to see your ranks and personal bests here.</p>
      </div>`;
    return;
  }

  if (rankArea) rankArea.innerHTML = renderRanks();

  // ── Per-exercise cards ─────────────────────────────────────────────────
  const ranks = allRanks();
  EXERCISES.forEach(ex => {
    const r = ranks.find(x => x.id === ex.id);
    if (!r) return;   // never logged

    const series = e1rmSeries(ex.id, r.variant);
    const unit   = r.unit === "reps" ? " reps" : "lb";
    const prev   = series.length > 1 ? series[series.length - 2].value : null;
    const last   = series.length ? series[series.length - 1].value : null;
    const delta  = prev != null && last != null ? last - prev : null;

    // Both directions shown. The old card only ever rendered gains, which hid
    // every regression behind silence.
    const deltaHtml = delta == null || Math.abs(delta) < 0.05 ? ""
      : `<span class="pb-delta ${delta > 0 ? "delta-up" : "delta-down"}">${
          delta > 0 ? "+" : ""}${delta.toFixed(1)}${unit}</span>`;

    const staleHtml = r.daysSince != null && r.daysSince > DECAY.graceDays
      ? `<span class="stale-flag">${r.daysSince}d untrained${r.lost > 0 ? " · rank slipping" : ""}</span>`
      : "";

    const card = document.createElement("div");
    card.className = "card progress-card";
    card.innerHTML = `
      <div class="pc-head">
        <div>
          <div class="ex-name">${esc(ex.name)}${ex.legacy ? ` <span class="legacy-tag">retired</span>` : ""}</div>
          <div class="pc-sub">${esc(ex.group)}${r.variant ? ` · ${esc(r.variant)}` : ""}</div>
        </div>
        ${r.ranked
          ? `<span class="rank-pill ${tierClass(r.tier)}">${rankLabel(r)}</span>`
          : `<span class="rank-pill rank-unranked" title="${esc(r.reason || "")}">Unranked</span>`}
      </div>
      ${series.length > 1 ? `<div class="pc-spark">${sparkline(series)}</div>` : ""}
      <div class="pb-row">
        <span class="pb-label">Best ${r.unit === "reps" ? "reps" : "est. 1RM"}</span>
        <div style="display:flex;align-items:baseline">
          <span class="pb-value">${r.value != null ? r.value.toFixed(r.unit === "reps" ? 0 : 1) + unit : "–"}</span>${deltaHtml}
        </div>
      </div>
      ${r.ranked ? `
      <div class="pb-row">
        <span class="pb-label">Percentile</span>
        <span class="pb-value">${ordinal(r.pct)}
          ${r.confidence !== "high" ? `<span class="conf-flag conf-${r.confidence}" title="Estimated from a ${r.reps}-rep set — 1RM formulas spread badly above ~12 reps (Epley and Brzycki differ by ~27% at 20 reps)">est. from ${r.reps} reps</span>` : ""}
        </span>
      </div>` : ""}
      <div class="pb-row">
        <span class="pb-label">Sessions</span>
        <span class="pb-value">${series.length}</span>
      </div>
      <div class="pb-row">
        <span class="pb-label">Last worked</span>
        <span class="pb-value pb-date">${formatDate(r.lastDate)} ${staleHtml}</span>
      </div>
      ${(r.others || []).filter(o => o.tier).map(o => `
      <div class="pb-row pb-other">
        <span class="pb-label">${esc(o.variant)}</span>
        <span class="pb-value"><span class="rank-pill rank-pill-sm ${tierClass(o.tier)}">${o.tier} ${o.division}</span></span>
      </div>`).join("")}`;
    grid.appendChild(card);
  });
}

// Overall + per-group tiles. The headline uses only the big five, which is what
// makes "Bronze" honest for someone who has never benched, squatted or pulled
// down — the isolation lifts get their own tiles and can't inflate it.
function renderRanks() {
  const o = overallRank();

  const tiles = GROUPS.map(g => {
    const gr = groupRank(g);
    if (!gr) return `
      <div class="rank-tile rank-tile-empty">
        <span class="rt-group">${esc(g)}</span>
        <span class="rt-tier">—</span>
        <span class="rt-note">not logged</span>
      </div>`;
    const stale = gr.daysSince > DECAY.graceDays;
    return `
      <div class="rank-tile ${tierClass(gr.tier)}">
        <span class="rt-group">${esc(g)}</span>
        <span class="rt-tier">${gr.tier} ${gr.division}</span>
        <span class="rt-note">
          ${gr.thin ? "1 lift" : `${gr.count} lifts`}${gr.isolationOnly ? " · isolation only" : ""}
          ${stale ? `<span class="rt-stale">· ${gr.daysSince}d</span>` : ""}
        </span>
      </div>`;
  }).join("");

  return `
    <div class="rank-block">
      <div class="rank-overall ${tierClass(o.tier)}">
        <div class="ro-left">
          <span class="ro-label">Overall</span>
          <span class="ro-tier">${o.tier} ${o.division}</span>
        </div>
        <div class="ro-right">
          <span class="ro-basis">${o.count}/5 movement patterns trained</span>
          ${o.missing.length
            ? `<span class="ro-missing">nothing logged for: ${esc(o.missing.join(", "))}</span>`
            : `<span class="ro-basis">all five patterns covered</span>`}
        </div>
      </div>
      <div class="pattern-row">
        ${o.slots.map(s => `
          <div class="pattern-slot${s.filled ? " " + tierClass(s.tier) : " pattern-empty"}">
            <span class="ps-name">${esc(s.pattern)}</span>
            <span class="ps-tier">${s.filled ? `${s.tier} ${s.division}` : "—"}</span>
            <span class="ps-via">${s.filled ? esc(s.via) : "untrained"}</span>
          </div>`).join("")}
      </div>
      <div class="rank-tiles">${tiles}</div>
      <p class="rank-note">
        The headline is one slot per movement pattern, each filled by whatever you actually
        train for it — Smith or dumbbell bench both count as horizontal push, leg press counts
        as legs. Percentiles are against <strong>people who log lifts on Strength Level</strong> —
        a committed population, well above average. Thresholds scale with bodyweight,
        so this measures strength <em>per pound</em>. Untrained groups slip after
        ${DECAY.graceDays} days as an upkeep rule, not a claim that you got weaker —
        training one restores it immediately.
      </p>
    </div>`;
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
// There are deliberately no pre-/post-workout slots: training times already
// live in the Workouts tab, so anything timed around a session is a join on
// date rather than a second, vaguer copy of the same fact.
function defaultMeal() {
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 17) return "Snack";
  if (h < 21) return "Dinner";
  return "Snack";
}

function markFoodDirty(date) {
  if (!foodDirty.includes(date)) foodDirty.push(date);
}

function foodItemsFor(date) {
  return nutrition.filter(n => n.date === date);
}

// Sums treat null as "contributes nothing", which is right — a nutrient nobody
// recorded can't be added. nutrientCoverage() reports how much of the day the
// sum actually saw, so a low total is never mistaken for a low intake.
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
    el.innerHTML = sheetsUrl
      ? `<div class="food-empty">No food database found. Add a <strong>Foods</strong>
         tab to your sheet (see <code>appsscript.js</code>), then reload.</div>`
      : `<div class="food-empty"><strong>This browser isn't connected to your sheet.</strong><br>
         Paste your deployment URL in <strong>Settings</strong>, then reload. Sync settings are
         stored per browser, so each device needs it entered once.</div>`;
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
  FOOD_MACROS.forEach(k => { item[k] = nutVal(f[k], k); });
  nutrition.push(item);
  markFoodDirty(currentFoodDate);

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
    const field = document.getElementById(`cf-${k}`);
    // No input for this nutrient means unknown, not zero — the custom-item form
    // only carries the seven core macros.
    item[k] = field ? (numOrNull(field.value) ?? (CORE_MACROS.includes(k) ? 0 : null)) : null;
  });
  nutrition.push(item);
  markFoodDirty(currentFoodDate);

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
  FOOD_MACROS.forEach(k => {
    b[k] = it[k] === null || it[k] === undefined ? null : (Number(it[k]) || 0) / q;
  });
  return b;
}

// Coerce a raw database/base value for storage: numbers scale, blanks stay
// blank. This one helper is what keeps "unknown" distinguishable from "zero"
// all the way from the Foods tab through to the coverage percentage.
function nutVal(v, key, factor = 1) {
  if (v === null || v === undefined || v === "") {
    return CORE_MACROS.includes(key) ? 0 : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n * factor : null;
}

function stepFoodQty(id, delta) {
  const it = nutrition.find(n => n.id === id);
  if (!it) return;
  const next = Math.round(((Number(it.qty) || 1) + delta) * 100) / 100;
  if (next < 0.25) { removeFoodItem(id); return; }

  const base = foodBase(it);
  FOOD_MACROS.forEach(k => {
    const scaled = nutVal(base[k], k, next);
    it[k] = scaled === null ? null : Math.round(scaled * 10) / 10;
  });
  it.qty = next;
  markFoodDirty(it.date);
  persist();
  renderFoodTab();
}

function removeFoodItem(id) {
  const it = nutrition.find(n => n.id === id);
  if (it) markFoodDirty(it.date);
  nutrition = nutrition.filter(n => n.id !== id);
  persist();
  renderFoodTab();
}

// ── FOOD: save + sync ─────────────────────────────────────────────────────

async function saveFoodDay() {
  const items = foodItemsFor(currentFoodDate);
  // An empty day is worth saving if it used to have items — that's how you
  // clear a mistaken day from the sheet.
  if (!items.length && !foodDirty.includes(currentFoodDate)) {
    showToast("Nothing to save");
    return;
  }

  const entry = {
    _type:   "food",
    date:    currentFoodDate,
    savedAt: new Date().toISOString(),
    items:   items.map(it => {
      const row = { meal: it.meal, key: it.key, name: it.name, qty: it.qty,
                    source: it.source, conf: it.conf };
      FOOD_MACROS.forEach(k => { row[k] = it[k] === undefined ? null : it[k]; });
      return row;
    }),
  };

  if (!sheetsUrl) {
    showToast("Saved on this device — Sheets not connected");
    return;
  }
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
    foodDirty = foodDirty.filter(d => d !== entry.date);  // Sheets has it now
  } catch (err) {
    console.error("Food sync failed:", err);
    setSyncStatus("error", "Sync failed — queued");
    foodQueue = foodQueue.filter(q => q.date !== entry.date);
    foodQueue.push(entry);
  }
  persist();
  updateQueueStatus();
  renderFoodTab();
}

// ── FOOD: coverage + pace ─────────────────────────────────────────────────

// The share of a day's CALORIES that came from items actually carrying a value
// for `key`. This is what makes half-filled columns safe: magnesium reads as
// "210mg from 53% of the day", never as a deficiency invented from blank cells.
// Weighted by calories rather than item count so a 600-cal untracked lunch
// counts for more than an untracked Coke Zero.
function nutrientCoverage(items, key) {
  const totalCal = items.reduce((s, it) => s + (Number(it.cal) || 0), 0);
  if (!totalCal) return items.length ? 0 : 1;
  const covered = items.reduce((s, it) =>
    s + (it[key] === null || it[key] === undefined ? 0 : (Number(it.cal) || 0)), 0);
  return covered / totalCal;
}

// How far through the eating day we are, 7am to 9pm. Used only for TODAY —
// a past date is judged on its final total, not on the clock.
function dayProgress() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return Math.max(0, Math.min(1, (h - 7) / 14));
}

// Colour state for a "hit this number" nutrient. Deliberately neutral early:
// 30g of protein at 9am is not an error, and painting it red every morning
// teaches you to ignore the colour.
function paceState(actual, target, isToday) {
  if (!target) return "";
  const ratio = actual / target;
  if (!isToday) return ratio >= 0.95 ? "ok" : ratio >= 0.8 ? "near" : "under";
  const expected = dayProgress();
  if (expected < 0.35) return "";                 // too early to judge
  if (ratio >= expected * 0.9)  return "ok";
  if (ratio >= expected * 0.65) return "near";
  return "under";
}

// ── FOOD: copy a previous day ─────────────────────────────────────────────

// Same meals nearly every day is the stated eating pattern, so cloning is the
// single biggest reduction in daily friction — roughly ten taps down to two.
function recentLoggedDates(limit = 7) {
  const seen = [];
  nutrition.forEach(n => {
    if (n.date !== currentFoodDate && !seen.includes(n.date)) seen.push(n.date);
  });
  return seen.sort((a, b) => b.localeCompare(a)).slice(0, limit);
}

function openCopyDay() {
  const dates = recentLoggedDates();
  if (!dates.length) { showToast("No earlier days to copy"); return; }
  const list = dates.map(d => {
    const t = foodTotals(foodItemsFor(d));
    return `<button class="copy-day-option" onclick="copyDay('${d}')">
        <span>${formatDate(d)}</span>
        <span class="cd-meta">${foodItemsFor(d).length} items · ${fmtNum(t.cal)} cal</span>
      </button>`;
  }).join("");
  showConfirmHtml("Copy a day", `<div class="copy-day-list">${list}</div>`);
}

function copyDay(fromDate) {
  const items = foodItemsFor(fromDate);
  if (!items.length) { showToast("That day has nothing to copy"); return; }
  items.forEach(it => {
    const copy = { ...it, id: newFoodId(), date: currentFoodDate };
    nutrition.push(copy);
  });
  markFoodDirty(currentFoodDate);
  persist();
  closeModal();
  renderFoodTab();
  showToast(`Copied ${items.length} item(s) from ${formatDate(fromDate)}`);
}

// ── FOOD: refresh logged rows from the database ───────────────────────────
/* Logged rows store totals rather than referencing the Foods tab, so a database
   correction does not reach history on its own. That is deliberate — see the
   project CLAUDE.md — but it leaves a real gap: when the stored number was
   simply WRONG (mis-transcribed, wrong product), you want the fix to propagate.

   This is the answer to that. It compares every keyed row against the current
   database, shows exactly what differs, and refreshes only what you approve.
   The distinction that matters: a correction should propagate, a reformulation
   should not, and only the owner can tell which is which — so the app asks. */

const DRIFT_EPSILON = 0.05;

// What a row WOULD hold if recomputed from today's database.
function currentValuesFor(it) {
  const f = it.key ? foods.find(x => x.key === it.key) : null;
  if (!f) return null;
  const qty = Number(it.qty) || 1;
  const out = {};
  FOOD_MACROS.forEach(k => {
    const v = f[k];
    out[k] = (v === null || v === undefined || v === "")
      ? (CORE_MACROS.includes(k) ? 0 : null)
      : Math.round(Number(v) * qty * 10) / 10;
  });
  return out;
}

function rowDrift(it) {
  const cur = currentValuesFor(it);
  if (!cur) return null;
  const diffs = [];
  FOOD_MACROS.forEach(k => {
    const a = it[k] === undefined ? null : it[k];
    const b = cur[k];
    if (a === null && b === null) return;
    // Gaining a value where there was none is a difference worth showing.
    if (a === null || b === null) { diffs.push({ k, from: a, to: b }); return; }
    if (Math.abs(Number(a) - Number(b)) > DRIFT_EPSILON) diffs.push({ k, from: a, to: b });
  });
  return diffs.length ? { item: it, diffs, cur } : null;
}

function scanDrift() {
  const byDate = {};
  nutrition.forEach(it => {
    if (!it.key) return;            // free-text rows have nothing to compare to
    const d = rowDrift(it);
    if (!d) return;
    (byDate[it.date] = byDate[it.date] || []).push(d);
  });
  return byDate;
}

function labelFor(key) {
  const n = NUTRIENTS.find(x => x.key === key);
  return n ? n.label : key;
}

function openDriftReview() {
  const byDate = scanDrift();
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  if (!dates.length) {
    showConfirmHtml("Refresh from database",
      `<p class="drift-none">Every logged item matches the food database. Nothing to refresh.</p>`);
    return;
  }

  const total = dates.reduce((s, d) => s + byDate[d].length, 0);
  const body = dates.map(d => {
    const rows = byDate[d].map(r => `
      <div class="drift-item">
        <span class="di-name">${esc(r.item.name)}${Number(r.item.qty) !== 1 ? ` ×${esc(r.item.qty)}` : ""}</span>
        <span class="di-diffs">${r.diffs.slice(0, 4).map(x =>
          `${esc(labelFor(x.k))} ${x.from === null ? "—" : fmtNum(x.from)} → ${x.to === null ? "—" : fmtNum(x.to)}`
        ).join(" · ")}${r.diffs.length > 4 ? ` +${r.diffs.length - 4} more` : ""}</span>
      </div>`).join("");
    return `
      <div class="drift-day">
        <div class="drift-day-head">
          <span>${formatDate(d)} — ${byDate[d].length} item(s)</span>
          <button class="btn btn-ghost btn-sm" onclick="refreshDay('${d}')">Refresh</button>
        </div>
        ${rows}
      </div>`;
  }).join("");

  showConfirmHtml("Refresh from database", `
    <p class="drift-lead">${total} logged item(s) across ${dates.length} day(s) differ from the
      current food database. Refreshing rewrites those rows to today's values — right when the
      original number was a mistake, wrong when the food itself changed since.</p>
    <div class="drift-list">${body}</div>
    <div class="drift-actions">
      <button class="btn btn-primary btn-sm" onclick="refreshAllDrift()">Refresh all ${dates.length} day(s)</button>
    </div>`);
}

function refreshDay(date, silent = false) {
  let changed = 0;
  nutrition.forEach(it => {
    if (it.date !== date || !it.key) return;
    const d = rowDrift(it);
    if (!d) return;
    FOOD_MACROS.forEach(k => { it[k] = d.cur[k]; });
    changed++;
  });
  if (!changed) return 0;
  markFoodDirty(date);
  persist();
  if (!silent) {
    closeModal();
    renderFoodTab();
    showToast(`Refreshed ${changed} item(s) on ${formatDate(date)} — press Save Day to sync`);
  }
  return changed;
}

function refreshAllDrift() {
  const dates = Object.keys(scanDrift());
  let n = 0;
  dates.forEach(d => { n += refreshDay(d, true); });
  closeModal();
  renderFoodTab();
  showToast(`Refreshed ${n} item(s) across ${dates.length} day(s) — save each day to sync`);
}

// Settings shows the count so drift is visible without going looking for it.
function updateDriftStatus() {
  const el = document.getElementById("drift-status");
  if (!el) return;
  const byDate = scanDrift();
  const days = Object.keys(byDate).length;
  const items = Object.values(byDate).reduce((s, a) => s + a.length, 0);
  el.textContent = days
    ? `${items} logged item(s) across ${days} day(s) differ from the food database.`
    : "Every logged item matches the food database.";
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

  const items   = foodItemsFor(currentFoodDate);
  const t       = foodTotals(items);
  const isToday = currentFoodDate === todayISO();

  const rem      = FOOD_TARGETS.cal - t.cal;
  const pct      = Math.min(100, (t.cal / FOOD_TARGETS.cal) * 100);
  const floorPct = (FOOD_TARGETS.calFloor / FOOD_TARGETS.cal) * 100;
  const calState = paceState(t.cal, FOOD_TARGETS.cal, isToday);

  const proteinState = t.p >= FOOD_TARGETS.proteinMin ? "ok"
                     : paceState(t.p, FOOD_TARGETS.proteinMin, isToday);
  const proteinLeft  = Math.max(0, FOOD_TARGETS.proteinMin - t.p);

  const remLabel = rem > 0 ? `${fmtNum(rem)} to go` : `${fmtNum(-rem)} over`;
  const unsaved  = foodDirty.includes(currentFoodDate)
    ? `<span class="food-unsaved">Unsaved — press Save Day</span>` : "";

  // Sodium gets a real bar against the plan's ~2,750 rather than a single
  // warning threshold: it is the one macro that has been consistently out of
  // band, so it deserves the same treatment calories get.
  const naTarget = NUTRIENTS.find(n => n.key === "na").target;
  const naPct    = Math.min(100, (t.na / naTarget) * 100);
  const naState  = t.na > naTarget ? "over" : t.na > naTarget * 0.85 ? "near" : "ok";

  el.innerHTML = `
    <div class="food-totals">
      <div class="food-total-main">
        <div class="food-total-block">
          <span class="ft-num ft-${calState}">${fmtNum(t.cal)}</span>
          <span class="ft-unit">cal</span>
          <span class="ft-sub">${remLabel} · target ${fmtNum(FOOD_TARGETS.cal)}</span>
        </div>
        <div class="food-total-block">
          <span class="ft-num ft-${proteinState}">${fmtNum(t.p)}</span>
          <span class="ft-unit">g protein</span>
          <span class="ft-sub">${proteinLeft > 0 ? `${fmtNum(proteinLeft)}g to go · ` : "in band · "}${FOOD_TARGETS.proteinMin}–${FOOD_TARGETS.proteinMax}</span>
        </div>
      </div>

      <div class="food-bar" role="img" aria-label="${fmtNum(t.cal)} of ${fmtNum(FOOD_TARGETS.cal)} calories">
        <div class="food-bar-fill" style="width:${pct}%"></div>
        <div class="food-bar-floor" style="left:${floorPct}%" title="2,500 floor"></div>
      </div>

      <div class="food-na-row">
        <span class="na-label">Sodium</span>
        <div class="food-bar food-bar-sm">
          <div class="food-bar-fill na-${naState}" style="width:${naPct}%"></div>
        </div>
        <span class="na-val na-${naState}">${fmtNum(t.na)}<span class="na-target"> / ${fmtNum(naTarget)}mg</span></span>
      </div>

      ${unsaved}

      <div class="food-macro-row">
        <span><b>${fmtNum(t.c)}</b> carb</span>
        <span><b>${fmtNum(t.fib)}</b> fib</span>
        <span><b>${fmtNum(t.fat)}</b> fat</span>
        <span><b>${fmtNum(t.sat)}</b> sat</span>
      </div>

      ${renderMicroSummary(items, t, isToday)}
    </div>`;
}

// Track everything, display by exception. Only nutrients that are actually off
// target surface; the rest stay folded away so the tab stays readable.
function renderMicroSummary(items, t, isToday) {
  const micros = NUTRIENTS.filter(n => !n.core);
  if (!micros.length) return "";

  // Same clock rule as calories and protein. Judging a micronutrient against
  // the full day's DV at breakfast marks everything deficient every morning,
  // which trains you to ignore the warning entirely.
  const progress = isToday ? dayProgress() : 1;
  const tooEarly = isToday && progress < 0.35;

  const rows = micros.map(n => {
    const cov = nutrientCoverage(items, n.key);
    const val = Number(t[n.key]) || 0;
    const pct = n.dv > 0 ? (val / n.dv) * 100 : null;
    // Compare against how much of the DV should be in by now, not the whole DV.
    const low  = n.goal === "hit" && n.dv > 0 && val < n.dv * progress * 0.7;
    const over = n.goal === "cap" && n.dv > 0 && pct > 100;
    // Under half the day's calories covered means the number is missing data,
    // not evidence of a shortfall — never flag on that.
    return { n, cov, val, pct, flagged: !tooEarly && (low || over) && cov > 0.5 };
  });

  const flagged = rows.filter(r => r.flagged);
  const untracked = rows.filter(r => r.cov < 0.5).length;

  // "All on target" must never be shown when the reason nothing flagged is that
  // nothing is tracked. Silence from missing data is not a clean bill of health.
  const head = tooEarly
    ? `<span class="micro-early">Tracking ${micros.length} micronutrients — too early in the day to judge</span>`
    : flagged.length
    ? `<span class="micro-warn">⚠ ${flagged.length} off target</span> ${flagged.map(r => esc(r.n.label)).join(" · ")}`
    : untracked >= micros.length / 2
    ? `<span class="micro-early">Not enough data to judge — ${untracked} of ${micros.length} micronutrients barely covered</span>`
    : `<span class="micro-ok">${micros.length - untracked} micronutrients on target</span>`;

  const detail = rows.map(r => `
    <div class="micro-row${r.flagged ? " micro-row-flag" : ""}">
      <span class="micro-name">${esc(r.n.label)}
        <span class="micro-src micro-src-${esc(r.n.src)}">${esc(r.n.src)}</span></span>
      <span class="micro-val">${r.cov < 0.95 ? `<span class="micro-floor" title="Some of today's food carries no value for this nutrient, so the real total is this or higher">≥</span>` : ""}${fmtNum(r.val)}${esc(r.n.unit)}
        ${r.pct != null ? `<span class="micro-pct">${Math.round(r.pct)}% DV</span>` : ""}</span>
      <span class="micro-cov${r.cov < 0.5 ? " micro-cov-low" : ""}">${Math.round(r.cov * 100)}% covered</span>
    </div>`).join("");

  return `
    <details class="micro-block">
      <summary class="micro-summary">${head}
        ${untracked && flagged.length ? `<span class="micro-untracked">${untracked} barely tracked</span>` : ""}
      </summary>
      <div class="micro-list">${detail}</div>
      <p class="micro-note">“Covered” is the share of today’s calories from foods
        that actually carry a value for that nutrient. A blank cell is not a zero —
        low coverage means missing data, not a deficiency. <strong>≥</strong> marks a
        total that is a floor rather than a measurement: the real figure is that or
        higher, because part of the day carries no value for it.</p>
    </details>`;
}

function renderFoodResults() {
  const el = document.getElementById("food-results");
  if (!el) return;

  if (!foods.length) {
    el.innerHTML = sheetsUrl
      ? `<div class="food-empty">No food database found. Add a <strong>Foods</strong>
         tab to your sheet (see <code>appsscript.js</code>), then reload.</div>`
      : `<div class="food-empty"><strong>This browser isn't connected to your sheet.</strong><br>
         Paste your deployment URL in <strong>Settings</strong>, then reload. Sync settings are
         stored per browser, so each device needs it entered once.</div>`;
    return;
  }

  const q = foodQuery.trim();

  // Nothing typed: a single compact row of recents rather than eight full-width
  // rows permanently occupying the screen above the day's log.
  if (!q) {
    const recents = recentFoods().slice(0, 8);
    lastFoodResults = recents;
    el.innerHTML = `
      <div class="food-chips">
        ${recents.map((f, i) => `
          <button class="food-chip" onclick="addFoodResult(${i})" title="${esc(f.name)}">
            ${esc(f.name)}<span class="chip-cal">${fmtNum(f.cal)}</span>
          </button>`).join("")}
      </div>`;
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

function renderFoodItems() {
  const el = document.getElementById("food-items");
  if (!el) return;

  const items = foodItemsFor(currentFoodDate);
  if (!items.length) {
    el.innerHTML = `<div class="food-empty">Nothing logged for this day yet.
      <button class="btn btn-ghost btn-sm" onclick="openCopyDay()">Copy a previous day</button>
    </div>`;
    return;
  }

  const groups = MEALS
    .map(meal => ({ meal, rows: items.filter(i => i.meal === meal) }))
    .filter(g => g.rows.length);

  // Anything with an unrecognised meal slot (e.g. edited in the sheet by hand)
  // still has to appear, or it would be invisible but still counted.
  const other = items.filter(i => !MEALS.includes(i.meal));
  if (other.length) groups.push({ meal: "Other", rows: other });

  el.innerHTML = groups.map(g => {
    const gt = foodTotals(g.rows);
    return `
    <div class="food-group">
      <div class="food-group-head">
        <span>${esc(g.meal)}</span>
        <span class="food-group-cal">${fmtNum(gt.p)}g P · ${fmtNum(gt.cal)} cal</span>
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
    </div>`;
  }).join("");
}

// ── SETTINGS ──────────────────────────────────────────────────────────────

function renderSettings() {
  const input = document.getElementById("sheets-url");
  if (input) input.value = sheetsUrl;
  const secret = document.getElementById("sheets-secret");
  if (secret) secret.value = sheetsSecret;
  const goal = document.getElementById("weight-goal");
  if (goal) goal.value = weightGoal;
  updateDriftStatus();
  updateQueueStatus();
}

async function saveSettings() {
  const input  = document.getElementById("sheets-url");
  const secret = document.getElementById("sheets-secret");
  sheetsUrl    = (input?.value  || "").trim();
  sheetsSecret = (secret?.value || "").trim();
  persist();
  showToast("Settings saved");

  // Pull straight away. Waiting until the next page load meant a freshly
  // configured device sat on "Ready" with no data and no reason given.
  if (sheetsUrl) await fetchFromSheets();
  else setSyncStatus("", "");
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

// Markup-bearing modal (the copy-day list). Callers own the escaping — the
// only current caller builds its rows from dates and numbers, not user text.
function showConfirmHtml(title, html) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body-text").innerHTML = html;
  document.getElementById("modal-confirm-btn").style.display = "none";
  confirmCallback = null;
  document.getElementById("confirm-modal").classList.add("open");
}

function showConfirm(title, body, onConfirm, confirmLabel = "Confirm") {
  document.getElementById("modal-confirm-btn").style.display = "";
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