const GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

const HEADLINE_PATTERNS = [
  { name: "Horizontal push", ids: ["bench", "dips", "pushups"] },
  { name: "Vertical push",   ids: ["ohpress"] },
  { name: "Horizontal pull", ids: ["rows", "seatedrow"] },
  { name: "Vertical pull",   ids: ["pullups", "latpulldown"] },
  { name: "Legs",            ids: ["squat", "legpress", "splitsquat"] },
];

const EXERCISES = [

  { id: "bench",       name: "Bench Press",       group: "Chest",     defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,

    variants: ["Smith", "Dumbbell", "Barbell"], perHand: ["Dumbbell"],
    std: { Barbell: "bench-bb", Smith: "bench-smith", Dumbbell: "bench-db" } },

  { id: "pushups",     name: "Push-Ups",          group: "Chest",     defaultSets: 3, repRange: null,     weighted: false, weight: 0.75, amrap: true,

    lockedVariant: "Full ROM",
    variants: ["To 90\u00b0", "Full ROM"], std: { "Full ROM": "pushups" },
    hint: "chest within a fist of the floor" },
  { id: "dips",        name: "Dips",              group: "Chest",     defaultSets: 3, repRange: null,     weighted: false, weight: 1.0, amrap: true,

    variants: ["Bodyweight", "Weighted", "Assisted"], addedLoad: ["Weighted"], std: { Bodyweight: "dips" } },

  { id: "pullups",     name: "Pull-Ups",          group: "Back",      defaultSets: 3, repRange: null,     weighted: false, weight: 1.0, amrap: true,
    variants: ["Bodyweight", "Weighted"], addedLoad: ["Weighted"], std: { Bodyweight: "pullups" } },
  { id: "latpulldown", name: "Lat Pulldown",      group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0,
    variants: ["Cable"], std: { Cable: "latpulldown" } },
  { id: "seatedrow",   name: "Seated Row",        group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 0.75,
    variants: ["Cable"], std: { Cable: "seatedrow" } },
  { id: "rows",        name: "Dumbbell Rows",      group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0, perSide: true, perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Barbell"], std: { Dumbbell: "row-db" } },

  { id: "squat",       name: "Squat",             group: "Legs",      defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,

    perHand: ["Dumbbell"],
    variants: ["Smith", "Barbell", "Dumbbell", "Bodyweight"],
    std: { Barbell: "squat-bb", Smith: "squat-smith", Dumbbell: "squat-db" },
    hint: "leave blank for bodyweight" },
  { id: "legpress",    name: "Leg Press",         group: "Legs",      defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.75,
    variants: ["Machine"], std: { Machine: "legpress" } },
  { id: "rdl",         name: "Romanian Deadlift", group: "Legs",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0, perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Barbell"], std: { Dumbbell: "rdl-db" } },
  { id: "splitsquat",  name: "Split Squat",       group: "Legs",      defaultSets: 3, repRange: [8, 10],  weighted: true,  weight: 1.0, perSide: true,

    perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Bodyweight"], std: { Dumbbell: "splitsquat-db" },
    hint: "per leg · Bulgarian (rear foot elevated) · leave blank for bodyweight" },

  { id: "ohpress",     name: "Overhead Press",    group: "Shoulders", defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,

    perHand: ["Dumbbell"],
    variants: ["Barbell", "Dumbbell"], std: { Barbell: "ohp-bb", Dumbbell: "ohp-db" } },
  { id: "latraise",    name: "Lateral Raise",     group: "Shoulders", defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.5,
    perHand: ["Dumbbell seated", "Dumbbell standing"],
    variants: ["Dumbbell seated", "Dumbbell standing", "Cable"],

    std: { "Dumbbell seated": "latraise-db", "Dumbbell standing": "latraise-db" } },

  { id: "curls",       name: "Bicep Curls",       group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5, perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Barbell", "Cable"], std: { Dumbbell: "curl-db" } },
  { id: "hammercurl",  name: "Hammer Curl",       group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5, perHand: true,
    variants: ["Dumbbell"], std: { Dumbbell: "hammercurl-db" } },
  { id: "triceppd",    name: "Tricep Pulldown",   group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5,
    variants: ["Cable"], std: { Cable: "triceppd-cable" } },

  { id: "legraise",    name: "Leg Raise",         group: "Core",      defaultSets: 3, repRange: null,     weighted: false, weight: 0.5, amrap: true,

    variants: ["Hanging", "Captain's chair"], std: { Hanging: "legraise-hang" } },
  { id: "situps",      name: "Sit-Ups",           group: "Core",      defaultSets: 3, repRange: null,     weighted: false, weight: 0.5, amrap: true,

    variants: ["Floor", "Decline"], addedLoad: ["Decline"], std: { Floor: "situps" } },

  { id: "chestpress",  name: "Chest Press",       group: "Chest",     defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.75, legacy: true,
    variants: ["Machine"], std: {} },
];

const ACTIVE_EXERCISES = EXERCISES.filter(e => !e.legacy);

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

  "dips":           { kind: "reps",   v: [0.5,   1,   9,  19,  30] },
  "legraise-hang":  { kind: "reps",   v: [0.5,   7,  14,  24,  34] },
  "situps":         { kind: "reps",   v: [0.5,  16,  44,  79, 118] },

  "splitsquat-db":  { kind: "weight", v: [ 15,  27,  44,  65,  89] },
  "squat-db":       { kind: "weight", v: [ 13,  26,  44,  68,  94] },

  "triceppd-cable": { kind: "weight", v: [ 19,  37,  61,  92, 128] },
};

const TIERS = [
  { name: "Copper",   lo:  0, hi: 15 },
  { name: "Bronze",   lo: 15, hi: 30 },
  { name: "Silver",   lo: 30, hi: 45 },
  { name: "Gold",     lo: 45, hi: 60 },
  { name: "Platinum", lo: 60, hi: 75 },
  { name: "Diamond",  lo: 75, hi: 90 },
  { name: "Champion", lo: 90, hi: 100 },
];

function tierIndex(name) {
  const i = TIERS.findIndex(t => t.name === name);
  if (i === -1) throw new Error("Unknown tier: " + name);
  return i;
}

const STALE = { afterDays: 7, provisionalDays: 21 };

const STREAK = { freeDays: 7, forgivenDays: 14 };

const CAP_FLOOR_TIER = tierIndex("Gold");

const BREADTH_CAPS = ["Gold", "Gold", "Gold", "Platinum", "Diamond", "Champion"].map(tierIndex);

const ISOLATION_CAP_TIER = tierIndex("Gold");

const GRACE_SESSIONS = 2;

let sheetSettings = {};
let foodTargets   = {};

function settingNum(key) {
  const v = sheetSettings[key];
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function applySettings() {
  foodTargets = {
    cal:        settingNum("cal_target"),
    calFloor:   settingNum("cal_floor"),
    proteinMin: settingNum("protein_min"),
    proteinMax: settingNum("protein_max"),
  };

  NUTRIENTS.find(n => n.key === "cal").dv = foodTargets.cal || 0;
  NUTRIENTS.find(n => n.key === "p").dv   = foodTargets.proteinMin || 0;
  NUTRIENTS.find(n => n.key === "na").target = settingNum("sodium_target");
  const goal = String(sheetSettings.weight_goal || "").trim().toLowerCase();
  if (["gain", "maintain", "lose"].includes(goal)) weightGoal = goal;
}

const MEALS = ["Breakfast", "Lunch", "Snack", "Dinner"];

const NUTRIENTS = [
  { key: "cal",    label: "Calories",      unit: "",    dv: 0,    src: "label", goal: "hit",  core: true },
  { key: "p",      label: "Protein",       unit: "g",   dv: 0,    src: "label", goal: "hit",  core: true },
  { key: "c",      label: "Carbs",         unit: "g",   dv: 275,  src: "label", goal: null,   core: true },
  { key: "fib",    label: "Fiber",         unit: "g",   dv: 28,   src: "label", goal: "hit",  core: true },
  { key: "fat",    label: "Fat",           unit: "g",   dv: 78,   src: "label", goal: null,   core: true },
  { key: "sat",    label: "Sat fat",       unit: "g",   dv: 20,   src: "label", goal: "cap",  core: true },
  { key: "na",     label: "Sodium",        unit: "mg",  dv: 2300, src: "label", goal: "cap",  core: true },
  { key: "trans",  label: "Trans fat",     unit: "g",   dv: 0,    src: "label", goal: "cap"  },

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

  { key: "alc",    label: "Alcohol",       unit: "g",   dv: 0,    src: "label", goal: null, notMicro: true },
];

const STD_DRINK_G = 14;

const KCAL_PER_G_ALCOHOL = 7;

function foodCalories(items) {
  return items.reduce((s, it) =>
    s + (Number(it.cal) || 0) - (Number(it.alc) || 0) * KCAL_PER_G_ALCOHOL, 0);
}

function standardDrinks(items) {
  return items.reduce((s, it) => s + (Number(it.alc) || 0), 0) / STD_DRINK_G;
}

const FOOD_MACROS = NUTRIENTS.map(n => n.key);

const CORE_MACROS = NUTRIENTS.filter(n => n.core).map(n => n.key);

function numOrNull(v) {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function isPerHand(ex, variant) {
  if (!ex || !ex.perHand) return false;
  if (ex.perHand === true) return true;
  return ex.perHand.includes(variant || (ex.variants && ex.variants[0]));
}

function takesLoad(ex, variant) {
  if (!ex) return false;
  if (ex.weighted) return true;
  return !!(ex.addedLoad && ex.addedLoad.includes(variant || (ex.variants && ex.variants[0])));
}

function lastBestLabel(ex, variant, best) {
  if (!best) return "First session";
  if (ex.weighted) return `Last: ${best.weight ?? "–"} lb × ${best.reps}`;
  if (takesLoad(ex, variant) && best.weight) return `Last: +${best.weight} lb × ${best.reps}`;
  return `Last: ${best.reps} reps`;
}

function loadHeaderHtml(ex) {
  return `<th scope="col" class="load-col">${ex.weighted ? "Weight (lbs)" : "Added (lbs)"}</th>`;
}

function loadCellHtml(ex, variant, n, weight) {
  const perHand = isPerHand(ex, variant);
  const label = ex.weighted ? "Weight" : "Added weight";
  const ph    = ex.weighted ? (perHand ? "lb/hand" : "lbs") : "+lb";
  return `<td class="load-col"><input class="num-input" type="number" min="0" max="9999" step="2.5"
            value="${weight}" placeholder="${ph}"
            aria-label="${label}, set ${n}${perHand ? ", per dumbbell" : ""}"></td>`;
}

function exerciseHint(ex, variant) {
  const perHand = isPerHand(ex, variant);
  if (ex.hint) return perHand ? `${ex.hint} · weight per dumbbell` : ex.hint;
  if (perHand && ex.perSide) return "per side · weight per dumbbell";
  if (perHand)               return "weight per dumbbell";
  if (ex.perSide)            return "per side";
  return null;
}

let workouts       = [];
let syncQueue      = [];
let sheetsUrl      = "";
let setCounters    = {};
let addedExercises = [];
let pickerOpen     = false;
let weightLog      = [];
let foods          = [];
let nutrition      = [];
let foodQueue      = [];

let weightQueue    = [];
let sheetsSecret   = "";
let currentFoodDate = "";
let openGroup       = null;
let foodQuery      = "";
let foodDirty      = [];

let syncedAt       = {};

let workoutSyncedAt = {};

let workoutServerCopy = {};

let syncedFrom     = "";

const recentWrites = { food: {}, weight: {} };
const LAG_GUARD_MS = 5 * 60 * 1000;
function wroteRecently(kind, date) {
  const t = recentWrites[kind][date];
  return !!t && Date.now() - t < LAG_GUARD_MS;
}
let lastFoodResults = [];
let weightLookback = null;
let weightGoal     = "maintain";
let logDrafts      = {};
let currentLogDate = "";
let isLoadingForm  = false;

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
    weightQueue = JSON.parse(localStorage.getItem("ll_weight_queue") || "[]");
    foodDirty  = JSON.parse(localStorage.getItem("ll_food_dirty") || "[]");
    syncedAt   = JSON.parse(localStorage.getItem("ll_synced_at")   || "{}");
    workoutSyncedAt = JSON.parse(localStorage.getItem("ll_workout_synced_at") || "{}");
    syncedFrom = localStorage.getItem("ll_synced_from")            || "";
    sheetsSecret = localStorage.getItem("ll_sheets_secret")       || "";
    weightGoal   = localStorage.getItem("ll_weight_goal")         || "maintain";
    sheetSettings = JSON.parse(localStorage.getItem("ll_settings") || "{}");
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
    localStorage.setItem("ll_weight_queue", JSON.stringify(weightQueue));
    localStorage.setItem("ll_food_dirty", JSON.stringify(foodDirty));
    localStorage.setItem("ll_synced_at",  JSON.stringify(syncedAt));
    localStorage.setItem("ll_workout_synced_at", JSON.stringify(workoutSyncedAt));
    localStorage.setItem("ll_synced_from", syncedFrom);
    localStorage.setItem("ll_sheets_secret", sheetsSecret);
    localStorage.setItem("ll_weight_goal", weightGoal);
    localStorage.setItem("ll_settings", JSON.stringify(sheetSettings));
  } catch (e) {
    console.warn("Could not write localStorage:", e);
  }
}

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

const TAB_IDS = ["log", "food", "progress", "settings"];

function switchTab(name) {
  TAB_IDS.forEach(id => {
    document.getElementById(`tab-${id}`)?.classList.toggle("active", id === name);
    document.getElementById(`panel-${id}`)?.classList.toggle("active", id === name);
  });

  if (name === "progress") { progressView = "main"; renderProgress(); }
  if (name === "settings") renderSettings();
  if (name === "food")     renderFoodTab();
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

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

function lastVariantFor(exId) {
  const ex = EXERCISES.find(e => e.id === exId);

  if (ex && ex.lockedVariant) return ex.lockedVariant;
  const fallback = ex && ex.variants ? ex.variants[0] : "";
  for (let i = 0; i < workouts.length; i++) {
    const logged = workouts[i].exercises.find(e => e.id === exId);
    if (logged && logged.variant) return logged.variant;
  }
  return fallback;
}

function goalLineHtml(ex, variant) {
  const em = exerciseMilestone(ex.id, variant);
  if (!em || em.kind !== "lift") return "";
  const body = em.unit === "reps"
    ? `Target: ${em.reps} reps → ${em.tier} ${em.division}`
    : `Target: ${fmtLoad(em.weight)} ${isPerHand(ex, variant) ? "lb/hand" : "lb"} × ${em.reps} → ${em.tier} ${em.division}`;
  return `<div class="exercise-goal ${tierClass(em.tier)}">${esc(body)}</div>`;
}

function onVariantChange(exId) {
  const sel   = document.getElementById(`variant-${exId}`);
  const block = document.querySelector(`.exercise-block[data-exid="${exId}"]`);
  const label = block && block.querySelector(".prev-best");
  if (!sel || !label) return;
  const ex   = EXERCISES.find(e => e.id === exId);
  label.textContent = lastBestLabel(ex, sel.value, getLastBest(exId, sel.value));

  const hint = block.querySelector(".exercise-hint");
  if (hint) hint.textContent = exerciseHint(ex, sel.value) || "";
  const old = block.querySelector(".exercise-goal");
  if (old) old.remove();
  const html = goalLineHtml(ex, sel.value);
  if (html && hint) hint.insertAdjacentHTML("afterend", html);

  const perHand = isPerHand(ex, sel.value);
  block.querySelectorAll("tr .num-input:first-child").forEach(inp => {
    if (inp.getAttribute("aria-label")?.startsWith("Weight")) {
      inp.placeholder = perHand ? "lb/hand" : "lbs";
    }
  });

  const want = takesLoad(ex, sel.value);
  const has  = !!block.querySelector("thead .load-col");
  if (want && !has) {
    block.querySelector("thead th").insertAdjacentHTML("afterend", loadHeaderHtml(ex));
    block.querySelectorAll("tbody tr").forEach((tr, i) =>
      tr.firstElementChild.insertAdjacentHTML("afterend", loadCellHtml(ex, sel.value, i + 1, "")));
  } else if (!want && has) {
    block.querySelectorAll(".load-col").forEach(el => el.remove());
  }
  saveDraft(currentLogDate);
}

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
          <span class="exercise-tag">${ex.group}</span>
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
  const prevText  = lastBestLabel(ex, variant, getLastBest(ex.id, variant));

  const goalHtml = goalLineHtml(ex, variant);
  const variantSel = !ex.lockedVariant && ex.variants && ex.variants.length > 1
    ? `<select class="select-input variant-select" id="variant-${ex.id}"
               aria-label="${ex.name} variant" onchange="onVariantChange('${ex.id}')">
         ${ex.variants.map(v =>
           `<option value="${v}"${v === variant ? " selected" : ""}>${v}</option>`).join("")}
       </select>`
    : `<input type="hidden" id="variant-${ex.id}" value="${ex.lockedVariant || (ex.variants ? ex.variants[0] : "")}">`;

  const block = document.createElement("div");
  block.className    = "exercise-block";
  block.dataset.exid = ex.id;
  block.innerHTML    = `
    <div class="exercise-header">
      <div class="exercise-title">
        <div class="exercise-name">${ex.name}</div>
        ${exerciseHint(ex, variant) ? `<div class="exercise-hint">${exerciseHint(ex, variant)}</div>` : ""}
        ${goalHtml}
        ${variantSel}
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;justify-content:flex-end">
        <span class="prev-best">${prevText}</span>
        <span class="exercise-tag">${ex.group}</span>
        <button class="btn btn-ghost btn-sm btn-danger" onclick="removeExercise('${ex.id}')" aria-label="Remove ${ex.name}">×</button>
      </div>
    </div>
    <table class="sets-table" aria-label="${ex.name} sets">
      <thead>
        <tr>
          <th scope="col">#</th>
          ${takesLoad(ex, variant) ? loadHeaderHtml(ex) : ""}
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

  const variant = document.getElementById(`variant-${exId}`)?.value;

  const tr = document.createElement("tr");
  tr.dataset.setIndex = n;
  if (animate) tr.style.opacity = "0";

  tr.innerHTML = `
    <td><span class="set-num">${n}</span></td>
    ${takesLoad(ex, variant) ? loadCellHtml(ex, variant, n, weight) : ""}
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

function collectFormData() {
  return addedExercises.map(exId => {
    const ex    = EXERCISES.find(e => e.id === exId);
    const tbody = document.getElementById(`sets-${exId}`);
    const sets  = Array.from(tbody.querySelectorAll("tr")).map(tr => {
      const inputs = tr.querySelectorAll("input[type=number]");
      let weight = null, reps = null;

      if (inputs.length === 2) {
        weight = numOrNull(inputs[0].value);
        reps   = numOrNull(inputs[1].value);
      } else {
        reps   = numOrNull(inputs[0].value);
      }
      return { weight, reps };
    });
    const variant = document.getElementById(`variant-${exId}`)?.value
                 || ex.lockedVariant || (ex.variants ? ex.variants[0] : "");
    return { id: ex.id, name: ex.name, variant, sets };
  });
}

async function saveWorkout() {
  if (!requireSync()) return;
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

const GATE_REFRESH_AFTER_MS = 60 * 1000;
const FETCH_TIMEOUT_MS      = 20 * 1000;
let sheetGate      = "open";
let fetchInFlight  = null;
let lastPullOk     = 0;
let writesInFlight = 0;
let refreshWanted  = false;

function setGate(state) {
  sheetGate = sheetsUrl ? state : "open";
  const locked = sheetGate !== "open";
  document.querySelectorAll("[data-needs-sync]").forEach(el => { el.inert = locked; });
  const bar = document.getElementById("sync-gate");
  if (!bar) return;
  bar.hidden    = !locked;
  bar.className = `sync-gate ${sheetGate}`;
  bar.innerHTML = sheetGate === "failed"
    ? `<span>Can't reach the sheet — view only</span>
       <button class="btn btn-ghost btn-sm" onclick="fetchFromSheets()">Retry</button>`
    : `<span>Syncing with the sheet — editing unlocks when done</span>`;
}

function requireSync() {
  if (sheetGate === "open") return true;
  showToast(sheetGate === "loading"
    ? "Still syncing with the sheet — one moment"
    : "Can't reach the sheet — view only until it syncs");
  return false;
}

function fetchFromSheets() {
  if (!sheetsUrl) { setGate("open"); return Promise.resolve(false); }
  if (!fetchInFlight) {
    setGate("loading");
    fetchInFlight = pullFromSheets()
      .then(ok => {
        if (ok) lastPullOk = Date.now();
        setGate(ok ? "open" : "failed");
        return ok;
      })
      .finally(() => { fetchInFlight = null; });
  }
  return fetchInFlight;
}

function refreshOnReturn() {
  if (!sheetsUrl || document.visibilityState === "hidden") return;
  if (sheetGate === "open" && Date.now() - lastPullOk < GATE_REFRESH_AFTER_MS) return;

  if (writesInFlight) { refreshWanted = true; return; }
  fetchFromSheets();
}

async function postToSheets(payload) {
  writesInFlight++;
  try {
    return await postToSheetsOnce(payload);
  } finally {
    writesInFlight--;
    if (!writesInFlight && refreshWanted) { refreshWanted = false; fetchFromSheets(); }
  }
}

async function postToSheetsOnce(payload) {
  const body = sheetsSecret ? { ...payload, _key: sheetsSecret } : payload;
  const res  = await fetch(sheetsUrl, {
    method:  "POST",
    headers: { "Content-Type": "text/plain" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  if (json.status === "conflict") {

    showToast(`${json.message || "Changed elsewhere"} — your edits are still local, save again to keep them`, "error");

    if (json.date && json.serverSavedAt) {
      syncedAt[json.date] = json.serverSavedAt;
      workoutSyncedAt[json.date] = json.serverSavedAt;
      nutrition.forEach(n => { if (n.date === json.date) n.savedAt = json.serverSavedAt; });

      persist();
    }

    await fetchFromSheets();
    const err = new Error(json.message || "Conflict");
    err.conflict = true;
    throw err;
  }
  if (json.status !== "ok") throw new Error(json.message || "Unknown error");
  return json;
}

function baseSavedAt(kind, date) {
  if (kind === "workout") {

    if (Object.prototype.hasOwnProperty.call(workoutSyncedAt, date)) return workoutSyncedAt[date];
    return workouts.find(w => w.date === date)?.savedAt;
  }

  if (Object.prototype.hasOwnProperty.call(syncedAt, date)) return syncedAt[date];

  if (syncedFrom && date >= syncedFrom) return "";
  const rows = nutrition.filter(n => n.date === date && n.savedAt);
  return rows.length ? rows.map(n => n.savedAt).sort().pop() : undefined;
}

function sameFoodDay(local, server) {
  if (local.length !== server.length) return false;
  const norm = v => (v === undefined || v === null || v === "") ? null
                  : typeof v === "number" ? Math.round(v * 100) / 100
                  : String(v).trim();
  const sig = it => JSON.stringify([
    norm(it.meal), norm(it.key), norm(it.name), norm(Number(it.qty) || 1),
    ...FOOD_MACROS.map(k => norm(it[k])),
  ]);
  const a = local.map(sig).sort(), b = server.map(sig).sort();
  return a.every((x, i) => x === b[i]);
}

function sameWorkoutDay(local, server) {
  const norm = v => (v === undefined || v === null || v === "") ? null
                  : Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100
                  : String(v).trim();
  const sig = ex => JSON.stringify([
    String(ex.name || "").trim(), String(ex.variant || "").trim(),
    (ex.sets || []).map(s => [norm(s.weight), norm(s.reps)]),
  ]);
  const a = (local.exercises || []).map(sig).sort();
  const b = (server.exercises || []).map(sig).sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

async function pullFromSheets() {
  if (!sheetsUrl) return false;
  setSyncStatus("pending", "Fetching…");
  let emptyWorkoutsGuarded = false;
  let emptyWeightGuarded = false;
  let dirtyKept = [];
  let workoutsKept = [];
  let ok = false;

  const ctl   = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS) : 0;
  const fetchSince = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
  try {

    const res = await fetch(sheetsUrl, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },

      body:    JSON.stringify(sheetsSecret ? { _type: "fetch", since: fetchSince, _key: sheetsSecret }
                                           : { _type: "fetch", since: fetchSince }),
      ...(ctl ? { signal: ctl.signal } : {}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message || "Unknown error");

    if (Array.isArray(json.workouts)) {
      if (json.workouts.length || !workouts.length) {

        const serverByDate = {};
        json.workouts.forEach(w => { serverByDate[w.date] = w; });
        const queued = new Set(syncQueue.map(q => q.date));
        const keepLocal = workouts.filter(w => {
          if (queued.has(w.date)) return true;
          const s = serverByDate[w.date];
          return !!w.savedAt && (!s || !s.savedAt || w.savedAt > s.savedAt);
        });

        const settled = new Set(keepLocal
          .filter(w => serverByDate[w.date] && sameWorkoutDay(w, serverByDate[w.date]))
          .map(w => w.date));
        if (settled.size) syncQueue = syncQueue.filter(q => !settled.has(q.date));
        const kept = new Set(keepLocal.map(w => w.date).filter(d => !settled.has(d)));
        workoutServerCopy = {};
        kept.forEach(d => { if (serverByDate[d]) workoutServerCopy[d] = serverByDate[d]; });
        workouts = json.workouts.filter(w => !kept.has(w.date))
                     .concat(keepLocal.filter(w => kept.has(w.date)))
                     .sort((a, b) => b.date.localeCompare(a.date));

        json.workouts.forEach(w => {
          if (!kept.has(w.date)) workoutSyncedAt[w.date] = String(w.savedAt || "");
        });

        workoutsKept = [...kept].filter(d => {
          const w = workouts.find(x => x.date === d);
          return !(w && workoutSyncedAt[d] === w.savedAt);
        }).sort();
        workoutsKept.forEach(d => {
          if (syncQueue.some(q => q.date === d)) return;
          const w = workouts.find(x => x.date === d);
          if (w) syncQueue.push({ ...w, conflict: true });
        });
        if (workoutsKept.length) updateQueueStatus();
      } else {
        emptyWorkoutsGuarded = true;
      }
    }

    if (Array.isArray(json.weightLog)) {
      if (!json.weightLog.length && weightLog.length) {

        emptyWeightGuarded = true;
      } else {

        const keep = new Set([...weightQueue,
          ...weightLog.map(e => e.date).filter(d => wroteRecently("weight", d))]);
        weightLog = json.weightLog.filter(e => !keep.has(e.date))
          .concat(weightLog.filter(e => keep.has(e.date)))
          .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      }
    }
    if (Array.isArray(json.foods))     foods     = json.foods;

    if (json.settings && typeof json.settings === "object" && !Array.isArray(json.settings)) {
      sheetSettings = json.settings;
      applySettings();
    }

    if (Array.isArray(json.nutrition)) {

      const serverByDate = {};
      json.nutrition.forEach(it => { (serverByDate[it.date] = serverByDate[it.date] || []).push(it); });
      const settled = foodDirty.filter(d =>
        sameFoodDay(nutrition.filter(n => n.date === d), serverByDate[d] || []));
      if (settled.length) {
        foodDirty = foodDirty.filter(d => !settled.includes(d));
        foodQueue = foodQueue.filter(q => !settled.includes(q.date));
      }

      const dirty = new Set(foodDirty);

      const serverStamp = d => (serverByDate[d] || [])
        .reduce((m, it) => (String(it.savedAt || "") > m ? String(it.savedAt || "") : m), "");
      const lagged = new Set();
      nutrition.forEach(it => {
        const d = it.date;
        if (!dirty.has(d) && wroteRecently("food", d) && serverStamp(d) < (syncedAt[d] || "")) lagged.add(d);
      });
      lagged.forEach(d => dirty.add(d));
      const fromSheet = json.nutrition
        .filter(it => !dirty.has(it.date))
        .map(it => ({ ...it, id: it.id || newFoodId() }));
      const keptLocal = nutrition.filter(it => dirty.has(it.date));

      json.nutrition.forEach(it => {
        if (dirty.has(it.date)) return;
        const s = String(it.savedAt || "");
        if (s > (syncedAt[it.date] || "")) syncedAt[it.date] = s;
      });
      const returned = new Set(json.nutrition.map(it => it.date));
      nutrition.forEach(it => {
        if (!returned.has(it.date) && !dirty.has(it.date)) syncedAt[it.date] = "";
      });
      syncedFrom = fetchSince;

      nutrition = [...fromSheet, ...keptLocal];

      dirtyKept = [...dirty].filter(d => !lagged.has(d) && nutrition.some(n => n.date === d)).sort();
    }
    persist();

    const heldBack = [...new Set([...dirtyKept, ...workoutsKept])].sort();
    setSyncStatus(...(emptyWorkoutsGuarded
      ? ["error", "Sheet returned no workouts — kept local history"]
      : emptyWeightGuarded
      ? ["error", "Sheet returned no weigh-ins — kept local history"]
      : heldBack.length

        ? ["pending", `Synced — unsaved edits on ${heldBack.map(shortDate).join(", ")}` +
                      (workoutsKept.length ? " · Settings → Retry" : "")]
        : ["ok", "Synced"]));
    ok = true;
  } catch (err) {
    console.error("Failed to fetch from Sheets:", err);
    setSyncStatus("error", "Fetch failed — view only");
  } finally {
    if (ctl) clearTimeout(timer);
  }

  const activePanel = document.querySelector(".tab-panel.active")?.id;
  if (activePanel === "panel-progress") renderProgress();
  if (activePanel === "panel-food")     renderFoodTab();
  return ok;
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
    await postToSheets({ ...entry, _base: baseSavedAt("workout", entry.date) });

    workoutSyncedAt[entry.date] = entry.savedAt;
    const local = workouts.find(w => w.date === entry.date);
    if (local) local.savedAt = entry.savedAt;

    setSyncStatus("ok", "Synced");
    syncQueue = syncQueue.filter(q => q.date !== entry.date);
    persist();
  } catch (err) {
    console.error("Sheets sync failed:", err);

    syncQueue = syncQueue.filter(q => q.date !== entry.date);
    syncQueue.push(err.conflict ? { ...entry, conflict: true } : entry);
    persist();
    setSyncStatus("error", err.conflict
      ? `${shortDate(entry.date)} changed on another device — save again to overwrite`
      : "Sync failed — queued");
    updateQueueStatus();
  }
}

async function retryQueue() {
  if (!requireSync()) return;
  const conflicted = syncQueue.filter(q => q.conflict);
  const plain      = syncQueue.filter(q => !q.conflict);
  const pending = plain.length + foodQueue.length + weightQueue.length;
  if (!pending && !conflicted.length) { showToast("Queue is empty"); return; }
  if (pending) showToast(`Retrying ${pending} item(s)…`);

  for (const q of plain) {
    const live = workouts.find(w => w.date === q.date);
    if (live) await syncToSheets(live);
    else syncQueue = syncQueue.filter(x => x.date !== q.date);
  }
  for (const entry of [...foodQueue]) await syncFoodToSheets(buildFoodEntry(entry.date));
  for (const date of [...weightQueue]) {
    const live = weightLog.find(e => e.date === date);
    if (live) await syncWeightToSheets(live);
    else weightQueue = weightQueue.filter(d => d !== date);
  }
  persist();
  updateQueueStatus();

  if (conflicted.length) resolveWorkoutConflict(conflicted[0].date);
}

function workoutDayLoss(local, server) {
  const key  = ex => `${String(ex.name || "").trim()}|${String(ex.variant || "").trim()}`;
  const norm = v => (v === undefined || v === null || v === "") ? "" : String(Number(v));
  const logged = ex => (ex.sets || []).filter(s => s.reps != null && s.reps !== "");
  const mine = {};
  (local?.exercises || []).forEach(ex => {
    const m = mine[key(ex)] || (mine[key(ex)] = []);
    logged(ex).forEach(s => m.push(`${norm(s.weight)}x${norm(s.reps)}`));
  });
  const loss = [];
  (server?.exercises || []).forEach(ex => {
    const pool = mine[key(ex)] || [];
    let lost = 0;
    logged(ex).forEach(s => {
      const i = pool.indexOf(`${norm(s.weight)}x${norm(s.reps)}`);
      if (i >= 0) pool.splice(i, 1); else lost++;
    });
    if (lost) loss.push({ name: ex.name, variant: ex.variant || "", lost });
  });
  return loss;
}

function workoutDaySummary(w) {
  const parts = (w?.exercises || [])
    .map(ex => ({ ex, n: (ex.sets || []).filter(s => s.reps != null && s.reps !== "").length }))
    .filter(p => p.n)
    .map(p => `${esc(p.ex.name)} ×${p.n}`);
  return parts.length ? parts.join(", ") : "no sets";
}

function resolveWorkoutConflict(d) {
  const local  = workouts.find(w => w.date === d);
  const server = workoutServerCopy[d];
  if (!local) {
    syncQueue = syncQueue.filter(x => x.date !== d);
    persist(); updateQueueStatus();
    return;
  }
  const overwrite = async () => {
    if (!requireSync()) return;
    const live = workouts.find(w => w.date === d);
    if (live) await syncToSheets(live);
    else { syncQueue = syncQueue.filter(x => x.date !== d); persist(); }
    updateQueueStatus();
  };
  if (!server) {

    showConfirm("Upload this day?",
      `${shortDate(d)} is on this device but not in the sheet. Upload it?`,
      overwrite, "Upload");
    return;
  }
  const loss = workoutDayLoss(local, server);
  const lostSets = loss.reduce((t, l) => t + l.lost, 0);

  const html =
    `<span class="modal-para">${esc(shortDate(d))} differs between this device and the sheet.</span>` +
    `<span class="modal-para"><strong>Sheet:</strong> ${workoutDaySummary(server)}<br>` +
    `<strong>This device:</strong> ${workoutDaySummary(local)}</span>` +
    (lostSets
      ? `<span class="modal-para modal-warn">Overwriting deletes ${lostSets} set${lostSets === 1 ? "" : "s"} from the sheet: ` +
        loss.map(l => `${esc(l.name)} ×${l.lost}`).join(", ") + `.</span>`
      : `<span class="modal-para">Overwriting deletes nothing the sheet has.</span>`);
  showChoice("Which copy is right?", html, {
    primary: { label: "Keep sheet's copy", fn: () => takeSheetWorkout(d) },
    alt:     { label: lostSets ? `Overwrite (−${lostSets} sets)` : "Overwrite", fn: overwrite },
  });
}

function takeSheetWorkout(d) {
  const s = workoutServerCopy[d];
  if (!s) return;
  workouts = workouts.filter(w => w.date !== d).concat([s])
                     .sort((a, b) => b.date.localeCompare(a.date));
  workoutSyncedAt[d] = String(s.savedAt || "");
  syncQueue = syncQueue.filter(q => q.date !== d);
  delete workoutServerCopy[d];
  persist();
  if (currentLogDate === d) { clearDraft(d); loadDraftOrWorkout(d); }
  updateQueueStatus();
  if (!syncQueue.length) setSyncStatus("ok", "Synced");
  showToast(`${shortDate(d)} now matches the sheet`);
}

function setSyncStatus(state, label) {
  const el = document.getElementById("sync-status");
  if (!el) return;

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

function renderHistory() {
  const list = document.getElementById("history-list");

  if (!list) return;

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
          <div class="history-meta">${totalSets} set${totalSets === 1 ? "" : "s"}</div>
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
  if (!requireSync()) return;
  showConfirm(
    "Delete workout?",
    `Remove the workout from ${formatDate(workouts[idx].date)}? This cannot be undone.`,
    () => {
      if (!requireSync()) return;
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
  if (!requireSync()) return;
  if (!workouts.length) { showToast("Nothing to clear"); return; }
  showConfirm(
    "Clear all history?",
    "This will permanently delete all workouts from the app and Google Sheets. This cannot be undone.",
    () => {
      if (!requireSync()) return;
      workouts = [];
      persist();
      renderHistory();
      showToast("History cleared");
      clearSheetsHistory();
    },
    "Clear all"
  );
}

async function saveWeight() {
  if (!requireSync()) return;

  const date = currentLogDate;
  const val  = parseFloat(document.getElementById("weight-input").value);
  if (!date)           { showToast("Select a date"); return; }
  if (isNaN(val) || val <= 0) { showToast("Enter a valid weight"); return; }

  if (val < 70 || val > 400) {
    showToast(val >= 30 && val < 70
      ? `${val} looks like kg — that's ${(val * 2.20462).toFixed(1)} lb. Enter pounds.`
      : "Enter a bodyweight in pounds (70–400)");
    return;
  }

  if (date !== todayISO() &&
      !confirm(`Log ${val} lb for ${date}? That is not today, and it will replace any weight already recorded for that date.`)) {
    return;
  }

  const entry = { date, weight: val };
  const idx   = weightLog.findIndex(e => e.date === date);
  if (idx >= 0) weightLog[idx] = entry;
  else          weightLog.push(entry);
  weightLog.sort((a, b) => a.date.localeCompare(b.date));
  persist();
  renderWeightTab();
  document.getElementById("weight-input").value = "";
  showToast(sheetsUrl ? "Weight logged — syncing…" : "Weight logged ✓");
  syncWeightToSheets(entry).then(ok => { if (ok) showToast("Weight logged ✓"); });
}

async function syncWeightToSheets(entry) {
  if (!sheetsUrl) return false;
  try {
    await postToSheets({ _type: "weight", ...entry });
    weightQueue = weightQueue.filter(d => d !== entry.date);
    recentWrites.weight[entry.date] = Date.now();
    persist();
    updateQueueStatus();
    return true;
  } catch (err) {
    console.error("Weight sync failed:", err);
    if (!weightQueue.includes(entry.date)) weightQueue.push(entry.date);
    persist();
    setSyncStatus("error", "Weigh-in not synced — queued");
    showToast("Weigh-in saved on this device — not synced yet", "error");
    updateQueueStatus();
    return false;
  }
}

async function deleteWeightEntry(date) {
  if (!requireSync()) return;
  weightLog = weightLog.filter(e => e.date !== date);
  weightQueue = weightQueue.filter(d => d !== date);
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
  if (!requireSync()) return;
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
    const rate  = days > 0 ? (diff / days) * 7 : 0;
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

function groupByWeek(entries) {
  const map = {};
  entries.forEach(({ date, weight }) => {
    const [y, m, d] = date.split("-").map(Number);
    const dt  = new Date(y, m - 1, d);
    const dow = (dt.getDay() + 6) % 7;
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

    const w = weeks[0];
    area.innerHTML = `<div class="weight-empty">
      <strong>${w.avg.toFixed(1)} lbs avg</strong> this week
      (${w.min}–${w.max} lbs range)
    </div>`;
    return;
  }

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

  const topPts   = weeks.map((w, i) => `${xScale(i).toFixed(1)},${yScale(w.max).toFixed(1)}`);
  const botPts   = weeks.map((w, i) => `${xScale(i).toFixed(1)},${yScale(w.min).toFixed(1)}`).reverse();
  const bandPath = `M${topPts.join("L")}L${botPts.join("L")}Z`;

  const avgPath  = weeks.map((w, i) =>
    `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(w.avg).toFixed(1)}`).join("");

  const yRange   = yMax - yMin;
  const tickStep = yRange > 25 ? 10 : yRange > 12 ? 5 : 2;
  const ticks    = [];
  for (let t = Math.ceil(yMin / tickStep) * tickStep; t <= yMax; t += tickStep) ticks.push(t);

  const xLabels = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const [wy, wm, wd] = w.weekStart.split("-").map(Number);
    const wednesday = new Date(wy, wm - 1, wd + 3);
    const mo = wednesday.getMonth();
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

function currentBodyweight(asOf) {
  const all = weightLog.filter(w => Number(w.weight) > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!all.length) return null;
  const pool = asOf ? all.filter(w => w.date <= asOf) : all;
  return Number((pool.length ? pool[pool.length - 1] : all[0]).weight);
}

function epley(weight, reps) {
  const w = Number(weight), r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || r < 1) return null;

  if (r === 1) return w;
  return w * (1 + r / 30);
}

function e1rmConfidence(reps) {
  return reps > 12 ? "low" : reps > 10 ? "med" : "high";
}

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

function percentileFor(value, std, bw) {
  if (!std || !Number.isFinite(value) || value <= 0) return null;
  if (std.kind === "weight" && !(bw > 0)) return null;

  const scale = std.kind === "weight" ? Math.pow(bw / STD_REF_BW, 0.67) : 1;
  const t = std.v.map(v => v * scale);
  const lv = Math.log(value);
  const lt = t.map(Math.log);

  let z;
  if (lv <= lt[0]) {

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

const SCORING_REP_CAP = 20;

function setValue(ex, set) {
  const reps = Number(set.reps);
  if (!Number.isFinite(reps) || reps < 1) return null;
  if (!ex.weighted) return reps;
  const w = Number(set.weight);
  if (!Number.isFinite(w) || w <= 0) return null;
  return epley(w, Math.min(reps, SCORING_REP_CAP));
}

function bestSetsByVariant(exId, asOf) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return null;
  const byVariant = {};
  const sessions  = {};
  let lastDate = null, lastVariant = null;

  workouts.forEach(w => {
    if (asOf && w.date > asOf) return;
    const logged = w.exercises.find(x => x.id === exId);
    if (!logged) return;
    const done = logged.sets.filter(s => s.reps != null);
    if (!done.length) return;

    const variant = logged.variant || (ex.variants && ex.variants[0]) || "";
    sessions[variant] = (sessions[variant] || 0) + 1;
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

  return lastDate ? { byVariant, sessions, lastDate, lastVariant } : null;
}

function rankForExercise(exId, asOf) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return null;
  const found = bestSetsByVariant(exId, asOf);
  if (!found) return null;

  const { byVariant, sessions, lastDate, lastVariant } = found;
  const bw = currentBodyweight(asOf);
  const daysSince = daysBetween(lastDate, asOf || todayISO());
  const base = { id: exId, name: ex.name, group: ex.group, weight: ex.weight,
                 lastDate, daysSince, variant: lastVariant,
                 sessions: sessions[lastVariant] || 0 };

  const best = byVariant[lastVariant];
  if (!best) return { ...base, ranked: false, reason: "no loaded sets" };

  const std = stdForExercise(ex, lastVariant);

  if (!std) return { ...base, ranked: false, reason: "no standards for this variant",
                     value: best.value, reps: best.reps, bestWeight: best.weight,
                     unit: ex.weighted ? "lb" : "reps" };

  if (std.kind === "weight" && bw == null)
    return { ...base, ranked: false, reason: "needs a weigh-in",
             value: best.value, reps: best.reps, bestWeight: best.weight, unit: "lb" };

  const pct  = percentileFor(best.value, std, bw);
  const peak = tierFromPct(pct);
  if (!peak) return { ...base, ranked: false, reason: "unrankable" };

  const { rung, lost, stale, unmeasured } = applyDecay(peak.rung, daysSince);

  const others = Object.values(byVariant)
    .filter(b => b.variant !== lastVariant)
    .map(b => {
      const s = stdForExercise(ex, b.variant);
      const p = s ? percentileFor(b.value, s, bw) : null;
      return { variant: b.variant, value: b.value, date: b.date,
               ...(p != null ? tierFromPct(p) : {}), pct: p };
    });

  return { ...base, ranked: true, pct, peak, lost, stale, unmeasured, others,
           value: best.value, reps: best.reps, bestWeight: best.weight,
           bestDate: best.date,
           confidence: e1rmConfidence(best.reps), unit: std.kind,
           ...rungToTier(rung) };
}

function applyDecay(rung, daysSince) {
  const d = daysSince == null ? 0 : daysSince;
  return { rung, lost: 0, stale: d > STALE.afterDays,
           unmeasured: d > STALE.provisionalDays, daysSince: d };
}

function allRanks(asOf) {
  return EXERCISES.map(ex => rankForExercise(ex.id, asOf)).filter(Boolean);
}

function valueForPercentile(std, bw, targetPct) {
  if (!std || !(targetPct > 0)) return null;
  let lo = 0.01, hi = 10000;
  if (percentileFor(hi, std, bw) < targetPct) return null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (percentileFor(mid, std, bw) < targetPct) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function nextRungStep(rung) {

  const c = Math.max(0, Math.min(TIERS.length - 0.001, rung));
  const i = Math.floor(c);
  return (i * 3 + Math.floor((c - i) * 3) + 1) / 3 + 1e-9;
}

function rungToPercentile(rung) {
  const i = Math.min(TIERS.length - 1, Math.max(0, Math.floor(rung)));
  const f = Math.min(0.999999, Math.max(0, rung - i));
  return TIERS[i].lo + f * (TIERS[i].hi - TIERS[i].lo);
}

function prescribe(ex, targetValue, reps) {
  if (targetValue == null) return null;

  if (!ex.weighted) return { reps: Math.ceil(targetValue) };

  const r = Math.min(reps || 8, 12);

  const w = r === 1 ? targetValue : targetValue / (1 + r / 30);

  return { weight: Math.ceil(w / 2.5) * 2.5, reps: r };
}

function exerciseMilestone(exId, variant) {
  const r = rankForExercise(exId);

  if (!r || !r.ranked) return null;
  if (variant && r.variant !== variant) return null;
  const targetRung = nextRungStep(r.rung);
  if (targetRung >= TIERS.length) return { kind: "maxed", name: r.name };
  const ex  = EXERCISES.find(e => e.id === exId);
  const std = stdForExercise(ex, r.variant);
  const target = valueForPercentile(std, currentBodyweight(), rungToPercentile(targetRung));
  if (target == null) return null;
  const t = rungToTier(targetRung);
  return { kind: "lift", id: exId, name: r.name, variant: r.variant,
           tier: t.tier, division: t.division, unit: r.unit,
           from: r.value, to: target, fromTier: r.tier, fromDivision: r.division,
           fromReps: r.reps, fromWeight: r.bestWeight,
           ...prescribe(ex, target, r.reps) };
}

function groupMilestone(group) {
  const gr = groupRank(group);
  if (!gr) return null;

  const targetRung = nextRungStep(gr.rung);
  if (targetRung >= TIERS.length) return { kind: "maxed" };
  const nextT = rungToTier(targetRung);

  if (targetRung > gr.capIndex + 0.999) {
    return { kind: "capped", reason: gr.capReason || gr.ceilingReason,
             tier: nextT.tier, division: nextT.division };
  }

  const ranks = allRanks().filter(r => r.group === group && r.ranked);
  const est   = ranks.filter(r => (r.sessions || 0) >= GRACE_SESSIONS);
  const pool  = est.length ? est : ranks;

  const pendingAll = ranks.filter(r => (r.sessions || 0) < GRACE_SESSIONS);

  const wsum   = pool.reduce((s, r) => s + r.weight, 0);
  const needed = (targetRung - gr.rung) * wsum;

  const candidates = pool.map(r => {
    const liftRung = r.rung + needed / r.weight;
    if (liftRung >= TIERS.length) return null;
    const ex  = EXERCISES.find(e => e.id === r.id);
    const std = stdForExercise(ex, r.variant);
    const target = valueForPercentile(std, currentBodyweight(), rungToPercentile(liftRung));
    if (target == null || !(r.value > 0)) return null;
    return { r, ex, target, ratio: target / r.value };
  }).filter(Boolean).sort((a, b) => a.ratio - b.ratio);

  const pick = candidates[0];
  if (!pick) {
    const p = pendingAll[0];
    return p ? { kind: "establish", name: p.name, sessions: p.sessions }
             : { kind: "outOfReach" };
  }
  const { r: best, ex, target } = pick;
  const gain = best.unit === "reps"
    ? Math.max(1, Math.ceil(target) - Math.round(best.value))
    : null;

  const pending = pendingAll.find(r => r.id !== best.id);
  return { kind: "lift", id: best.id, name: best.name, variant: best.variant,
           tier: nextT.tier, division: nextT.division,
           fromTier: gr.tier, fromDivision: gr.division,
           unit: best.unit, from: best.value, to: target, gain,
           fromReps: best.reps, fromWeight: best.bestWeight,
           pending: pending ? pending.name : null,
           ...prescribe(ex, target, best.reps) };
}

function milestoneDelta(m) {
  if (!m || m.kind !== "lift" || m.from == null) return "";
  if (m.unit === "reps") {
    const d = Math.ceil(m.to) - Math.round(m.from);
    return d > 0 ? `${d} more rep${d === 1 ? "" : "s"}` : "within reach";
  }

  if (m.fromWeight == null || m.fromReps == null) return "";
  if (m.fromReps !== m.reps) return `was ${fmtLoad(m.fromWeight)} × ${m.fromReps}`;
  const d = m.weight - m.fromWeight;
  return d > 0 ? `+${fmtLoad(d)} lb` : "within reach";
}

function milestoneText(m) {
  if (!m) return "";
  if (m.kind === "maxed")      return "Top tier reached";
  if (m.kind === "outOfReach") return "Beyond the standards table";
  if (m.kind === "capped")     return `At ceiling — ${m.reason}`;
  if (m.kind === "establish")  return `Log ${m.name} once more to count it`;
  if (m.unit === "reps") return `${m.name}: ${m.reps} reps`;

  const ex   = EXERCISES.find(e => e.id === m.id);
  const unit = ex && isPerHand(ex, m.variant) ? "lb/hand" : "lb";
  return `${m.name}: ${fmtLoad(m.weight)} ${unit} × ${m.reps}`;
}

function applyCap(rung, capTierIndex, reason) {
  const ceiling = Math.max(capTierIndex, CAP_FLOOR_TIER) + 0.999;
  if (rung <= ceiling) return { rung, capped: false, earnedRung: rung };
  return { rung: ceiling, capped: true, reason, earnedRung: rung };
}

function trainingBreadth(asOf, precomputed) {

  const ranks = precomputed || allRanks(asOf);
  const slots = HEADLINE_PATTERNS.map(p => {
    const candidates = ranks.filter(r => p.ids.includes(r.id) && r.ranked);
    if (!candidates.length) return { pattern: p.name, filled: false };
    const best = candidates.reduce((a, b) => (b.rung > a.rung ? b : a));
    return { pattern: p.name, filled: true, via: best.name,
             tier: best.tier, division: best.division };
  });
  const trained  = slots.filter(s => s.filled).length;
  const capIndex = BREADTH_CAPS[trained];
  const next     = trained < HEADLINE_PATTERNS.length ? BREADTH_CAPS[trained + 1] : null;
  return {
    slots, trained, total: HEADLINE_PATTERNS.length, capIndex,
    capTier:   TIERS[capIndex].name,
    untrained: slots.filter(s => !s.filled).map(s => s.pattern),

    unlocks:   next != null && next > capIndex ? TIERS[next].name : null,
  };
}

function groupRank(group, asOf) {
  const allR = allRanks(asOf);
  const all  = allR.filter(r => r.group === group && r.ranked);
  if (!all.length) return null;

  const established = all.filter(r => (r.sessions || 0) >= GRACE_SESSIONS);
  let rs, provisional = false;
  if (!established.length) {
    rs = all; provisional = true;
  } else {
    const ew   = established.reduce((t, r) => t + r.weight, 0);
    const emean = established.reduce((t, r) => t + r.rung * r.weight, 0) / ew;
    rs = established.concat(
      all.filter(r => (r.sessions || 0) < GRACE_SESSIONS && r.rung > emean));
  }

  const wsum   = rs.reduce((s, r) => s + r.weight, 0);
  const earned = rs.reduce((s, r) => s + r.rung * r.weight, 0) / wsum;
  const days   = Math.min(...rs.map(r => r.daysSince ?? 9999));

  const isolationOnly = rs.every(r => r.weight <= 0.5);
  const breadth       = trainingBreadth(asOf, allR);

  const caps = [{ index: breadth.capIndex,
                  reason: `${breadth.trained}/${breadth.total} movement patterns` }];
  if (isolationOnly) caps.push({ index: ISOLATION_CAP_TIER, reason: "isolation lifts only" });

  const lowest   = Math.min(...caps.map(c => c.index));
  const reason   = caps.filter(c => c.index === lowest).map(c => c.reason).join(" + ");
  const capped   = applyCap(earned, lowest, reason);

  const capIndex = Math.max(lowest, CAP_FLOOR_TIER);

  return { group, ...rungToTier(capped.rung), count: rs.length, daysSince: days,
           isolationOnly, thin: rs.length === 1, provisional,

           pending: all.length - rs.length,
           stale: rs.some(r => r.stale), unmeasured: rs.every(r => r.unmeasured),

           lowConfidence: rs.some(r => r.confidence && r.confidence !== "high"),

           veryLowConfidence: rs.some(r => r.confidence === "low"),
           capped: capped.capped, capReason: capped.reason, capIndex,

           ceilingReason: reason,
           earned: rungToTier(capped.earnedRung) };
}

function daysBetween(isoA, isoB) {
  const [y1, m1, d1] = isoA.split("-").map(Number);
  const [y2, m2, d2] = isoB.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
}

function calcStreak() {
  const days = [...new Set(workouts.map(w => w.date))].sort((a, b) => b.localeCompare(a));
  if (!days.length) return { count: 0, forgiven: false };

  let forgiven = false;

  const bridge = gap => {
    if (gap < STREAK.freeDays) return true;
    if (!forgiven && gap < STREAK.forgivenDays) { forgiven = true; return true; }
    return false;
  };

  if (!bridge(daysBetween(days[0], todayISO()))) return { count: 0, forgiven: false };
  let count = 1;
  for (let i = 0; i < days.length - 1; i++) {
    if (!bridge(daysBetween(days[i + 1], days[i]))) break;
    count++;
  }
  return { count, forgiven };
}

function tierClass(tier) { return "tier-" + String(tier || "").toLowerCase(); }

function ordinal(n) {
  const v = Math.round(n), rem100 = v % 100;
  if (rem100 >= 11 && rem100 <= 13) return v + "th";
  return v + (["th", "st", "nd", "rd"][v % 10] || "th");
}

function rankLabel(r) {
  return r && r.tier ? `${r.tier} ${r.division}` : "Unranked";
}

function e1rmSeries(exId, variant) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return [];
  return workouts
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => {
      const logged = w.exercises.find(e => e.id === exId);
      if (!logged) return null;

      const v = logged.variant || (ex.variants && ex.variants[0]) || "";
      if (variant && v !== variant) return null;
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

let progressView = "main";

function showProgressView(view, group, fromPop) {
  progressView = view;
  if (group !== undefined) openGroup = group;
  renderProgress();

  if (!fromPop) {
    const st = { progressView: view, openGroup };
    if (view === "main") history.replaceState(st, "");
    else                 history.pushState(st, "");
  }

  document.getElementById("panel-progress")?.scrollIntoView({ block: "start" });

  if (view !== "main") {

    setTimeout(() => {
      const back = document.querySelector(
        view === "group" ? "#progress-detail .back-link" : "#progress-history .back-link");
      back?.focus();
    }, 0);
  }
}

window.addEventListener("popstate", e => {
  const st = e.state;
  if (!st || !st.progressView) {
    if (progressView !== "main") showProgressView("main", undefined, true);
    return;
  }
  showProgressView(st.progressView, st.openGroup, true);
});

function renderProgress() {
  const main   = document.getElementById("progress-main");
  const detail = document.getElementById("progress-detail");
  const hist   = document.getElementById("progress-history");
  if (!main) return;

  main.hidden   = progressView !== "main";
  detail.hidden = progressView !== "group";
  hist.hidden   = progressView !== "history";

  const streakArea = document.getElementById("streak-area");
  if (streakArea) {
    const st = calcStreak();
    streakArea.innerHTML = st.count > 0
      ? `<div class="streak-badge">🔥 ${st.count}-session streak${st.forgiven
          ? `<span class="streak-forgiven" title="A gap was bridged — the streak survives one break">·1 skip</span>` : ""}</div>`
      : `<div class="streak-badge streak-none">Log a session to start a streak</div>`;
  }

  if (progressView === "group") { detail.innerHTML = groupDetailHtml(openGroup); return; }
  if (progressView === "history") {
    hist.innerHTML = `
      <button type="button" class="back-link" onclick="showProgressView('main')">← Back to Progress</button>
      <div class="panel-header history-head">
        <h2 class="section-heading">Past Workouts &amp; Weigh-Ins</h2>
        <button class="btn btn-ghost btn-sm" onclick="clearAllHistory()">Clear all</button>
      </div>
      <div id="weight-log-list"></div>
      <div class="history-list" id="history-list"></div>`;
    renderWeightLogList();
    renderHistory();
    return;
  }

  main.innerHTML = renderGroupCards() +
    `<div id="weight-trend-section"></div>
     <button type="button" class="history-link" onclick="showProgressView('history')">
       <span>Past workouts &amp; weigh-ins</span>
       <span class="hl-meta">${workouts.length} session${workouts.length === 1 ? "" : "s"} ›</span>
     </button>`;
  renderWeightTrendSection();
}

function unrankedInGroup(group) {
  return allRanks().filter(r => r.group === group && !r.ranked);
}

function unrankedValue(r) {
  if (r.value == null) return "–";
  if (r.unit === "reps") return `${r.bestWeight ? `+${fmtNum(r.bestWeight)} lb × ` : ""}${r.value.toFixed(0)} reps`;
  return `${r.value.toFixed(1)} lb`;
}

function rankableHint(group) {
  const weighted = EXERCISES.some(e => e.group === group && !e.legacy && e.std &&
    Object.keys(e.std).some(v => (stdForExercise(e, v) || {}).kind === "weight"));
  if (weighted && currentBodyweight() == null)
    return "Log a weigh-in to rank weighted lifts.";
  const opts = EXERCISES.filter(e => e.group === group && !e.legacy && e.std)
    .flatMap(e => Object.keys(e.std).map(v => `${e.name} (${v})`));
  return opts.length ? `Log ${opts.join(" or ")} to rank ${group}.` : "";
}

function renderGroupCards() {
  const cards = GROUPS.map(g => {
    const gr = groupRank(g);
    const un = gr ? [] : unrankedInGroup(g);
    if (!gr && un.length) {
      const r = un.slice().sort((a, b) => (a.daysSince ?? 1e9) - (b.daysSince ?? 1e9))[0];
      const meta = [un.length === 1 ? "1 lift" : `${un.length} lifts`,
                    r.reason === "needs a weigh-in" ? "needs a weigh-in" : "no rank for this variant",
                    r.daysSince != null ? `${r.daysSince}d ago` : ""].filter(Boolean).join(" · ");
      return `
      <button type="button" class="mg-card mg-empty"
              aria-label="${esc(g)}, logged but unranked. ${esc(r.name)} ${esc(r.variant || "")}: ${esc(unrankedValue(r))}. ${esc(meta)}."
              onclick="showProgressView('group','${esc(g)}')">
        <div class="mg-top" aria-hidden="true"><span class="mg-name">${esc(g)}</span>
          <span class="mg-chev">›</span></div>
        <div class="mg-tier mg-tier-none" aria-hidden="true">Unranked</div>
        <div class="mg-next" aria-hidden="true">${esc(r.name)}${r.variant ? ` (${esc(r.variant)})` : ""} · ${esc(unrankedValue(r))}</div>
        <div class="mg-meta" aria-hidden="true">${esc(meta)}</div>
      </button>`;
    }
    if (!gr) return `
      <button type="button" class="mg-card mg-empty"
              aria-label="${esc(g)}, nothing logged yet. Open to see what counts toward it."
              onclick="showProgressView('group','${esc(g)}')">
        <div class="mg-top" aria-hidden="true"><span class="mg-name">${esc(g)}</span>
          <span class="mg-chev">›</span></div>
        <div class="mg-tier mg-tier-none" aria-hidden="true">—</div>
        <div class="mg-next" aria-hidden="true">Not logged yet</div>
      </button>`;

    const m = groupMilestone(g);

    const atCeiling = m && m.kind === "capped";
    const frac = atCeiling ? 1
      : Math.max(0.03, Math.min(1, gr.rung - Math.floor(gr.rung)));

    const meta = [
      gr.thin ? "1 lift" : `${gr.count} lifts`,
      gr.pending ? `${gr.pending} not counted yet` : "",
      gr.provisional ? "provisional" : "",
      gr.unmeasured ? `unmeasured ${gr.daysSince}d`
        : gr.stale ? `last measured ${gr.daysSince}d ago` : "",
    ].filter(Boolean).join(" · ");

    const nextTier = m && m.kind === "lift" ? `${m.tier} ${m.division}` : null;
    const delta    = milestoneDelta(m);
    const label = `${g}, ${gr.tier} ${gr.division}${atCeiling
      ? `, at ceiling, earned ${gr.earned.tier} ${gr.earned.division}`
      : nextTier ? `, next ${nextTier}` : ""}. ${milestoneText(m)}${
        delta ? `, ${delta}` : ""}. ${meta}.`;

    return `
      <button type="button" class="mg-card ${tierClass(gr.tier)}"
              aria-label="${esc(label)}"
              onclick="showProgressView('group','${esc(g)}')">
        <div class="mg-top" aria-hidden="true">
          <span class="mg-name">${esc(g)}</span>
          <span class="mg-chev">›</span>
        </div>
        <div class="mg-tier" aria-hidden="true">${gr.tier} ${gr.division}</div>
        <div class="mg-bar${atCeiling ? " mg-bar-capped" : ""}" aria-hidden="true">
          <div class="mg-bar-fill" style="width:${(frac * 100).toFixed(0)}%"></div>
        </div>
        <div class="mg-next" aria-hidden="true">${atCeiling
          ? `<span class="mg-earned">Earned ${gr.earned.tier} ${gr.earned.division}</span> · ${esc(milestoneText(m))}`
          : nextTier
          ? `→ <span class="mg-nexttier ${tierClass(m.tier)}">${esc(nextTier)}</span> · ${esc(milestoneText(m))}${
              delta ? ` <span class="mg-delta">${esc(delta)}</span>` : ""}`
          : esc(milestoneText(m))}</div>
        <div class="mg-meta" aria-hidden="true">${esc(meta)}</div>
      </button>`;
  }).join("");

  return `<div class="mg-grid">${cards}</div>`;
}

function groupSeries(group) {
  const ids   = new Set(EXERCISES.filter(e => e.group === group).map(e => e.id));
  const dates = workouts
    .filter(w => w.exercises.some(e => ids.has(e.id)))
    .map(w => w.date).sort();
  const seen = new Set();
  return dates.filter(d => !seen.has(d) && seen.add(d)).map(date => {
    const gr = groupRank(group, date);

    return gr ? { date, value: gr.earned.rung, soft: !!gr.veryLowConfidence } : null;
  }).filter(Boolean);
}

function rungChart(series) {
  if (series.length < 2) return "";
  const W = 600, H = 180, PT = 12, PB = 12;
  const vals = series.map(s => s.value);
  const lo = Math.max(0, Math.floor(Math.min(...vals) * 3) / 3 - 0.34);
  const hi = Math.min(TIERS.length, Math.ceil(Math.max(...vals) * 3) / 3 + 0.34);
  const span = hi - lo || 1;
  const x = i => (i / (series.length - 1)) * W;
  const yFrac = v => 1 - (v - lo) / span;
  const y = v => PT + yFrac(v) * (H - PT - PB);

  const first = Math.min(Math.ceil(lo), TIERS.length - 1);
  const ticks = [];
  for (let t = first; t < Math.max(hi, first + 1) && t < TIERS.length; t++) ticks.push(t);

  const gridlines = ticks.map(t =>
    `<line x1="0" x2="${W}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"
       stroke="var(--color-border)" stroke-width="1"/>`).join("");
  const labels = ticks.map(t =>
    `<span class="rc-label" style="top:${(PT + yFrac(t) * (H - PT - PB)) / H * 100}%">${TIERS[t].name}</span>`).join("");

  const pts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.value).toFixed(1)}`);
  return `
    <div class="rc-wrap">
      <svg class="rung-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        ${gridlines}
        <polyline points="${pts.join(" ")}" fill="none" stroke="var(--tier,var(--color-primary))"
          stroke-width="2" vector-effect="non-scaling-stroke"
          stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <svg class="rc-dots" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        ${pts.map((p, i) => series[i].soft
          ? `<circle cx="${p.split(",")[0]}" cy="${p.split(",")[1]}" r="4" fill="var(--color-surface)"
               stroke="var(--tier,var(--color-primary))" stroke-width="2"
               vector-effect="non-scaling-stroke"/>`
          : `<circle cx="${p.split(",")[0]}" cy="${p.split(",")[1]}" r="4"
               fill="var(--tier,var(--color-primary))"/>`).join("")}
      </svg>
      ${labels}
    </div>`;
}

function groupDetailHtml(group) {
  const gr = groupRank(group);
  const un = gr ? [] : unrankedInGroup(group);
  if (!gr && un.length) return `
    <button type="button" class="back-link" onclick="showProgressView('main')">← Back to Progress</button>
    <div class="gd-head"><div class="gd-title"><h2 class="gd-group">${esc(group)}</h2>
      <span class="rank-pill rank-unranked">Unranked</span></div></div>
    <div class="gd-block">
      <h3 class="gd-h3">Exercises</h3>
      <div class="ex-table">${un.map(r => `
        <div class="ex-row">
          <span class="exr-name">${esc(r.name)}${r.variant ? `<span class="exr-var">${esc(r.variant)}</span>` : ""}</span>
          <span class="exr-rank"><span class="rank-pill rank-pill-sm rank-unranked" title="${esc(r.reason || "")}">Unranked</span></span>
          <span class="exr-val">${esc(unrankedValue(r))}</span>
          <span class="exr-pending">${r.lastDate ? `last ${esc(formatDate(r.lastDate))}` : ""}</span>
        </div>`).join("")}</div>
      <p class="ms-sub">Logged and kept — this variant has no population standard, so it
        can't be scored. ${esc(rankableHint(group))}</p>
    </div>`;
  if (!gr) return `
    <button type="button" class="back-link" onclick="showProgressView('main')">← Back to Progress</button>
    <div class="gd-head"><h2 class="gd-group">${esc(group)}</h2></div>
    <div class="empty-state"><h3>Nothing logged yet</h3>
      <p>Log any ${esc(group.toLowerCase())} exercise and its rank appears here.</p></div>`;

  const m    = groupMilestone(group);
  const frac = Math.max(0.03, Math.min(1, gr.rung - Math.floor(gr.rung)));
  const nextTier = Math.floor(gr.rung) + 1 < TIERS.length
    ? TIERS[Math.floor(gr.rung) + 1].name : null;

  const ranks = allRanks().filter(r => r.group === group);

  const est = ranks.filter(r => r.ranked && (r.sessions || 0) >= GRACE_SESSIONS);
  const emean = est.length
    ? est.reduce((t, r) => t + r.rung * r.weight, 0) / est.reduce((t, r) => t + r.weight, 0)
    : null;
  const counted = new Set(ranks.filter(r => r.ranked &&
    ((r.sessions || 0) >= GRACE_SESSIONS || (emean !== null && r.rung > emean))).map(r => r.id));
  const rows = ranks.sort((a, b) => (b.ranked ? b.rung : -1) - (a.ranked ? a.rung : -1)).map(r => {
    const counts = (r.sessions || 0) >= GRACE_SESSIONS;

    const f = r.ranked ? Math.max(0.03, Math.min(1, r.rung - Math.floor(r.rung))) : 0;
    return `
      <div class="ex-row">
        <span class="exr-name">${esc(r.name)}${r.variant ? `<span class="exr-var">${esc(r.variant)}</span>` : ""}</span>
        <span class="exr-rank">${r.ranked
          ? `<span class="rank-pill rank-pill-sm ${tierClass(r.tier)}">${r.tier} ${r.division}</span>`
          : `<span class="rank-pill rank-pill-sm rank-unranked" title="${esc(r.reason || "")}">Unranked</span>`}</span>
        <span class="exr-val">${r.value != null
          ? `${r.value.toFixed(r.unit === "reps" ? 0 : 1)}${r.unit === "reps" ? " reps" : " lb"}` : "–"}</span>
        <span class="exr-bar ${r.ranked ? tierClass(r.tier) : ""}"><span class="exr-bar-fill" style="width:${(f * 100).toFixed(0)}%"></span></span>
        ${(() => {

          const em = r.ranked ? exerciseMilestone(r.id) : null;
          if (!em || em.kind !== "lift") return "";
          const d = milestoneDelta(em);

          return `<span class="exr-next">Next <b class="${tierClass(em.tier)}">${em.tier} ${em.division}</b>: ${
            em.unit === "reps" ? `${em.reps} reps` : `${fmtLoad(em.weight)} ${
              isPerHand(EXERCISES.find(e => e.id === r.id), r.variant) ? "lb/hand" : "lb"} × ${em.reps}`
          }${d ? ` · ${esc(d)}` : ""}</span>`;
        })()}
        ${counts ? "" : gr.provisional
          ? `<span class="exr-pending" title="Nothing in this group has ${GRACE_SESSIONS} sessions yet, so every lift counts for now">counts provisionally</span>`
          : counted.has(r.id)
          ? `<span class="exr-pending" title="Counts already because it raises the group; a second session settles it">counts — 1 session</span>`
          : `<span class="exr-pending" title="Needs ${GRACE_SESSIONS} sessions, or a rank above the group average, to count">not counted yet</span>`}
      </div>`;
  }).join("");

  const lead = ranks.filter(r => r.ranked).sort((a, b) => b.rung - a.rung)[0];
  const series = lead ? e1rmSeries(lead.id, lead.variant) : [];
  const progression = series.length > 1 ? `
    <div class="gd-block">
      <h3 class="gd-h3">Progression</h3>
      <div class="prog-card">
        <div class="prog-meta">
          <span class="prog-name">${esc(lead.name)}</span>
          <span class="prog-delta">${series[0].value.toFixed(0)} → ${series[series.length - 1].value.toFixed(0)}${lead.unit === "reps" ? " reps" : " lb"}</span>
        </div>
        ${sparkline(series)}
      </div>
    </div>` : "";

  const ids = new Set(EXERCISES.filter(e => e.group === group).map(e => e.id));
  const recent = [];
  workouts.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(w => {
    w.exercises.forEach(e => {
      if (!ids.has(e.id) || recent.length >= 6) return;
      const best = e.sets.filter(x => x.reps != null)
        .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0) || b.reps - a.reps)[0];
      if (!best) return;
      const ex = EXERCISES.find(x => x.id === e.id);

      const v  = ex ? setValue(ex, best) : null;
      const st = ex ? stdForExercise(ex, e.variant || (ex.variants && ex.variants[0])) : null;

      const pc = v != null && st ? percentileFor(v, st, currentBodyweight(w.date)) : null;
      const tf = pc != null ? tierFromPct(pc) : null;
      recent.push(`
        <div class="act-row">
          <span class="act-date">${formatDate(w.date)}</span>
          <span class="act-name">${esc(ex ? ex.name : e.id)}</span>
          <span class="act-set">${ex && ex.weighted && best.weight ? `${fmtNum(best.weight)} × ${best.reps}`
                                  : best.weight ? `+${fmtNum(best.weight)} × ${best.reps}` : `${best.reps} reps`}</span>
          <span class="act-rank">${tf
            ? `<span class="rank-pill rank-pill-sm ${tierClass(tf.tier)}">${tf.tier} ${tf.division}</span>` : ""}</span>
        </div>`);
    });
  });

  return `
    <button type="button" class="back-link" onclick="showProgressView('main')">← Back to Progress</button>
    <div class="gd-head ${tierClass(gr.tier)}">
      <div class="gd-title">
        <h2 class="gd-group">${esc(group)}</h2>
        <span class="rank-pill ${tierClass(gr.tier)}">${gr.tier} ${gr.division}</span>
      </div>
      ${nextTier ? `
      <div class="gd-prog">
        <span class="gdp-from">${gr.tier} ${gr.division}</span>
        <span class="mg-bar"><span class="mg-bar-fill" style="width:${(frac * 100).toFixed(0)}%"></span></span>
        <span class="gdp-to">${esc(nextTier)}</span>
      </div>` : ""}
    </div>

    <div class="gd-block gd-milestone">
      <h3 class="gd-h3">Next milestone</h3>
      <p class="ms-line">${esc(milestoneText(m))}${
        milestoneDelta(m) ? ` <span class="ms-delta">${esc(milestoneDelta(m))}</span>` : ""}</p>
      ${m && m.kind === "lift"
        ? `<p class="ms-sub">Takes ${esc(group)} to <strong>${esc(m.tier)} ${m.division}</strong>${
            m.pending ? ` · or log ${esc(m.pending)} once more to count it toward the group` : ""}</p>`
        : m && m.kind === "capped"
        ? `<p class="ms-sub">Your lifts are already past this tier — the ceiling is holding it. Raising the ceiling is the only thing that moves it.</p>`
        : ""}
    </div>

    <div class="gd-block">
      <h3 class="gd-h3">Exercises</h3>
      <div class="ex-table">${rows}</div>
      <details class="scoring">
        <summary class="scoring-head">How ${esc(group)} is scored</summary>
        <div class="scoring-body">
          <p>Each lift is scored against population standards at your bodyweight, then averaged —
            <strong>compounds count double isolation</strong>. ${counted.size} of ${ranks.length}
            currently count toward the rating.</p>
          <dl class="legend">
            <dt><span class="rank-pill rank-pill-sm tier-silver">Ranked</span></dt>
            <dd>Counts toward the group rating.</dd>
            <dt><span class="lg-tag">counts — 1 session</span></dt>
            <dd>Counts already, because it <em>raises</em> the group. A second session settles it.</dd>
            <dt><span class="lg-tag">not counted yet</span></dt>
            <dd>One session, and below the group average — it waits rather than dragging you down.</dd>
            <dt><span class="lg-tag">counts provisionally</span></dt>
            <dd>Nothing here has ${GRACE_SESSIONS} sessions yet, so everything counts for now.</dd>
            <dt><span class="rank-pill rank-pill-sm rank-unranked">Unranked</span></dt>
            <dd>No published standard for this variant — logged, never scored.</dd>
            <dt><span class="lg-tag lg-ceiling">at ceiling</span></dt>
            <dd>The rating is held down by training breadth or by isolation-only work, not by strength.</dd>
          </dl>
          <p class="scoring-note">Percentiles are against <strong>people who log lifts on Strength
            Level</strong> — a committed population, well above average. Thresholds scale with
            bodyweight, so this measures strength <em>per pound</em>. A group you have not trained
            for ${STALE.afterDays} days is flagged as ageing and after ${STALE.provisionalDays} reads
            as unmeasured — the rank is <strong>held, never lowered</strong>, because not training is
            not the same as getting weaker.</p>
        </div>
      </details>
    </div>

    ${(() => {
      const series = groupSeries(group);
      if (series.length < 2) return "";
      const first = rungToTier(series[0].value), last = rungToTier(series[series.length - 1].value);
      return `
      <div class="gd-block ${tierClass(gr.tier)}">
        <h3 class="gd-h3">${esc(group)} over time</h3>
        <p class="gd-sub">Rank across ${series.length} sessions, before any tier ceiling —
          this is strength, not attendance.${series.some(p => p.soft)
            ? ` <strong>Hollow points</strong> rest on a high-rep set, where 1RM formulas
              spread badly; a drop after one can mean the measurement got better, not you worse.`
            : ""}</p>
        <div class="rc-meta"><span>${first.tier} ${first.division}</span>
          <span class="rc-arrow">→</span><span>${last.tier} ${last.division}</span></div>
        ${rungChart(series)}
      </div>`;
    })()}

  ${progression}

    ${recent.length ? `
    <div class="gd-block">
      <h3 class="gd-h3">Recent activity</h3>
      <div class="act-table">${recent.join("")}</div>
    </div>` : ""}`;
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function fmtNum(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("en-US");
}

function fmtLoad(n) {
  const v = Math.round((Number(n) || 0) * 2) / 2;
  return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1);
}

function fmtOrDash(n) {
  return n === null || n === undefined || n === "" ? "—" : fmtNum(n);
}

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

function foodTotals(items) {
  const t = {};
  FOOD_MACROS.forEach(k => {
    t[k] = items.reduce((sum, it) => sum + (Number(it[k]) || 0), 0);
  });
  return t;
}

function recentFoods() {
  const seen  = [];

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
         tab to your sheet, then reload.</div>`
      : `<div class="food-empty"><strong>This browser isn't connected to your sheet.</strong><br>
         Paste your deployment URL in <strong>Settings</strong>, then reload. Sync settings are
         stored per browser, so each device needs it entered once.</div>`;
    return;
  }

  const results = foodSearchResults();
  if (!results.length) {
    el.innerHTML = `<div class="food-empty">No match. <strong>Paste from Claude</strong> to add it from a
      label photo, or use <strong>Custom item</strong> for a one-off.</div>`;
    return;
  }

  el.innerHTML = results.map((f, i) => `
    <button class="food-result" onclick="addFoodResult(${i})">
      <span class="fr-name">${esc(f.name)}${f.brand ? ` <span class="fr-brand">${esc(f.brand)}</span>` : ""}</span>
      <span class="fr-meta">${fmtNum(f.cal)} cal · ${fmtNum(f.p)}g P<span class="fr-serving">${esc(f.serving)}</span></span>
    </button>`).join("");
}

function newFoodId() {
  return `f${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function addFoodResult(i) {
  const f = lastFoodResults[i];
  if (!f) { showToast("Food not found"); return; }
  addFood(f);
}

function addFood(f) {
  if (!requireSync()) return;
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
  if (!requireSync()) return;
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

function nutVal(v, key, factor = 1) {
  if (v === null || v === undefined || v === "") {
    return CORE_MACROS.includes(key) ? 0 : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n * factor : null;
}

function stepFoodQty(id, delta) {
  if (!requireSync()) return;
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
  if (!requireSync()) return;
  const it = nutrition.find(n => n.id === id);
  if (it) markFoodDirty(it.date);
  nutrition = nutrition.filter(n => n.id !== id);
  persist();
  renderFoodTab();
}

const IMPORT_DRAFT_KEY = "ll_import_draft";
let importParsed = null;

const IMPORT_FIELD_ALIASES = {
  calories: "cal", kcal: "cal", energy: "cal",
  protein: "p", prot: "p",
  carb: "c", carbs: "c", carbohydrate: "c", carbohydrates: "c", totalcarbohydrate: "c",
  fiber: "fib", fibre: "fib", dietaryfiber: "fib", dietaryfibre: "fib",
  totalfat: "fat",
  saturated: "sat", saturatedfat: "sat", satfat: "sat",
  sodium: "na", salt: "na",
  transfat: "trans",
  cholesterol: "chol",
  sugars: "sugar", totalsugar: "sugar", totalsugars: "sugar",
  addedsugar: "addsug", addedsugars: "addsug", added: "addsug",
  vitamind: "vitd", calcium: "ca", iron: "fe", potassium: "k",
  vitamina: "vita", vitaminc: "vitc", vitamine: "vite", vitamink: "vitk",
  vitaminb6: "b6", vitaminb12: "b12", folicacid: "folate",
  magnesium: "mg", zinc: "zn", alcohol: "alc", ethanol: "alc",
  quantity: "qty", servings: "qty", amount: "qty",
  confidence: "conf", source: "src",
  micro: "microsrc", microsource: "microsrc", microsrc: "microsrc",
  size: "serving", servingsize: "serving",
};

const IMPORT_FOOD_FIELDS = new Set(
  ["key", "name", "brand", "serving", "verified", "microsrc"].concat(FOOD_MACROS));
const IMPORT_ITEM_FIELDS = new Set(
  ["key", "name", "meal", "qty", "conf", "src"].concat(FOOD_MACROS));

function normImportKey(raw) {
  const k = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return IMPORT_FIELD_ALIASES[k] || k;
}

function importNum(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["-", "—", "–", "n/a", "na", "null", "none", "unknown", "?", "tbd"].includes(s)) return null;

  const lt = s.match(/^<\s*([\d.]+)/);
  if (lt) { const n = Number(lt[1]); return Number.isFinite(n) ? n / 2 : null; }

  const m = s.replace(/,/g, "").match(/-?\d*\.?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function normImportSlug(raw) {
  return String(raw || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function importVerified(raw) {
  const str = String(raw ?? "").trim();
  if (!str) return "";
  return /^(y|yes|true|1)$/i.test(str) ? "yes" : "no";
}

function slugifyFoodKey(name, brand) {
  const b = String(brand || "").trim();
  const n = String(name || "").trim();
  const base = b && !n.toLowerCase().startsWith(b.toLowerCase()) ? `${b} ${n}` : n;
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function normalizeMeal(v) {
  const s = String(v || "").trim().toLowerCase();
  return ["Breakfast", "Lunch", "Snack", "Dinner"].find(m => m.toLowerCase() === s) || defaultMeal();
}

function parseFoodBlocks(text) {
  const res = { foods: [], items: [], warnings: [] };
  let cur = null;

  const finish = () => {
    if (!cur) return;
    const block = cur;
    cur = null;
    if (block.type === "FOOD") finishImportFood(block, res);
    else finishImportItem(block, res);
  };

  String(text || "").split(/\r?\n/).forEach(rawLine => {
    let line = rawLine.trim();
    if (!line || line.startsWith("#") || /^```/.test(line)) return;
    line = line.replace(/^[-*•>]\s+/, "").trim();
    if (!line) return;

    const head = line.replace(/[:：]\s*$/, "").trim().toUpperCase();
    if (head === "FOOD" || head === "ITEM") { finish(); cur = { type: head, fields: {}, flags: [] }; return; }
    if (head === "END") { finish(); return; }
    if (!cur) return;

    const m = line.match(/^([A-Za-z][A-Za-z0-9 _./-]*?)\s*[:=]\s*(.*)$/);
    if (!m) return;
    const key = normImportKey(m[1]);
    const val = m[2].trim();
    if (!key) return;
    cur.fields[key] = val;
    if (/^<\s*[\d.]/.test(val)) cur.flags.push(`${key}: "${val}" recorded as ${importNum(val)}`);
  });

  finish();
  return res;
}

function finishImportFood(block, res) {
  const f = block.fields;
  const name = String(f.name || "").trim();
  if (!name) { res.warnings.push("A FOOD block had no name line and was skipped."); return; }

  const row = {
    key: normImportSlug(f.key) || slugifyFoodKey(name, f.brand),
    name,
    brand: String(f.brand || "").trim(),

    serving: String(f.serving || "").trim(),

    verified: importVerified(f.verified),
    microSrc: String(f.microsrc || "").trim(),
    _pick: true,
    _flags: block.flags.slice(),
  };

  FOOD_MACROS.forEach(k => { row[k] = f[k] === undefined ? null : importNum(f[k]); });
  row._blanks = FOOD_MACROS.filter(k => row[k] === null).length;

  const unknown = Object.keys(f).filter(k => !IMPORT_FOOD_FIELDS.has(k));
  if (unknown.length) row._flags.push("ignored fields: " + unknown.join(", "));
  if (row.cal === null) row._flags.push("no calories — treated as a partial update");

  res.foods.push(row);
}

function finishImportItem(block, res) {
  const f = block.fields;
  const name = String(f.name || "").trim();
  if (!name) { res.warnings.push("An ITEM block had no name line and was skipped."); return; }

  const qty = importNum(f.qty);
  const conf = String(f.conf || "").trim().toLowerCase();
  const item = {
    name,
    key: normImportSlug(f.key),
    meal: normalizeMeal(f.meal),
    qty: qty === null || qty <= 0 ? 1 : qty,

    source: /^label$/i.test(String(f.src || "").trim()) ? "label" : "estimate",
    conf: ["high", "med", "low"].includes(conf) ? conf : "med",
    _pick: true,
    _flags: block.flags.slice(),
  };

  FOOD_MACROS.forEach(k => { item[k] = f[k] === undefined ? null : importNum(f[k]); });
  item._blanks = FOOD_MACROS.filter(k => item[k] === null).length;

  const unknown = Object.keys(f).filter(k => !IMPORT_ITEM_FIELDS.has(k));
  if (unknown.length) item._flags.push("ignored fields: " + unknown.join(", "));
  if (item.cal === null) item._flags.push("no calories — this row adds nothing to the day's total");

  res.items.push(item);
}

function toggleFoodImport(open) {
  const el = document.getElementById("food-import");
  if (!el) return;
  el.hidden = !open;
  if (!open) return;
  toggleCustomFood(false);
  const ta = document.getElementById("fi-text");
  if (ta) {

    if (!ta.value) { try { ta.value = localStorage.getItem(IMPORT_DRAFT_KEY) || ""; } catch (e) {} }
    ta.focus();
    if (ta.value) reviewImport();
  }
}

function onImportInput(v) {
  try { localStorage.setItem(IMPORT_DRAFT_KEY, v); } catch (e) {}

  if (!v.trim()) { try { localStorage.removeItem(IMPORT_DONE_KEY); } catch (e) {} }
}

function clearImportDraft() {
  const ta = document.getElementById("fi-text");
  if (ta) ta.value = "";
  try { localStorage.removeItem(IMPORT_DRAFT_KEY); } catch (e) {}
  try { localStorage.removeItem(IMPORT_DONE_KEY); } catch (e) {}
}

const IMPORT_DONE_KEY = "ll_import_done";
const importSig = (r, date) => JSON.stringify([date, r.meal, r.key || "", r.name, Number(r.qty) || 1, r.cal]);
function importDone() {
  try { return JSON.parse(localStorage.getItem(IMPORT_DONE_KEY) || "[]"); } catch (e) { return []; }
}

function reviewImport() {
  const ta = document.getElementById("fi-text");
  importParsed = parseFoodBlocks(ta ? ta.value : "");
  const done = new Set(importDone());
  importParsed.items.forEach(r => {
    if (done.has(importSig(r, currentFoodDate))) {
      r._pick = false;
      r._flags.push("already added to this day from this paste — tick to add it again");
    }
  });
  renderImportReview();
}

function discardImport() {
  importParsed = null;
  clearImportDraft();
  renderImportReview();
  toggleFoodImport(false);
}

function toggleImportPick(kind, i) {
  const list = kind === "food" ? importParsed?.foods : importParsed?.items;
  const row = list && list[i];
  if (!row) return;
  row._pick = !row._pick;
  renderImportReview();
}

function toggleImportVerified(i) {
  const row = importParsed?.foods?.[i];
  if (!row) return;
  row.verified = row.verified === "" ? "yes" : row.verified === "yes" ? "no" : "";
  renderImportReview();
}

function renderImportReview() {
  const el = document.getElementById("fi-review");
  if (!el) return;
  if (!importParsed) { el.innerHTML = ""; return; }

  const { foods: rows, items, warnings } = importParsed;
  if (!rows.length && !items.length) {
    el.innerHTML = `<div class="food-empty">Nothing found. Expected a block starting with
      <strong>FOOD</strong> (a label → the database) or <strong>ITEM</strong> (a meal → today's log).</div>`;
    return;
  }

  const flags = r => r._flags.map(f => `<div class="fi-flag">${esc(f)}</div>`).join("");
  const nut = (v, u) => (v === null ? "—" : fmtNum(v) + u);
  let html = "";

  if (rows.length) {
    const n = rows.filter(r => r._pick).length;
    html += `<div class="fi-group-title">To the food database</div>` + rows.map((r, i) => {
      const exists = foods.some(x => x.key === r.key);
      return `<div class="fi-card${r._pick ? "" : " fi-off"}">
        <button class="fi-pick" onclick="toggleImportPick('food',${i})"
          aria-pressed="${r._pick}" aria-label="Include ${esc(r.name)}">${r._pick ? "✓" : ""}</button>
        <div class="fi-body">
          <div class="fi-name">${esc(r.name)}${r.brand ? ` <span class="fr-brand">${esc(r.brand)}</span>` : ""}</div>
          <div class="fi-meta">${nut(r.cal, "")} cal · ${nut(r.p, "g")} P<span class="fr-serving">${
            r.serving ? esc(r.serving) : (exists ? "serving unchanged" : "no serving given")}</span></div>
          <div class="fi-sub"><code>${esc(r.key)}</code> · ${exists ? "updates an existing row" : "new row"}
            · ${FOOD_MACROS.length - r._blanks}/${FOOD_MACROS.length} nutrients</div>
          <button class="fi-chip${r.verified === "yes" ? " fi-chip-on" : ""}"
            onclick="toggleImportVerified(${i})">Verified: ${
            r.verified || (exists ? "unchanged" : "no")}</button>
          ${flags(r)}
        </div></div>`;
    }).join("") +
    `<button class="btn btn-primary fi-commit" onclick="commitImportFoods()" ${n ? "" : "disabled"}>
       Add ${n} to database</button>`;
  }

  if (items.length) {
    const n = items.filter(r => r._pick).length;
    html += `<div class="fi-group-title">To ${esc(currentFoodDate)}</div>` + items.map((r, i) => `
      <div class="fi-card${r._pick ? "" : " fi-off"}">
        <button class="fi-pick" onclick="toggleImportPick('item',${i})"
          aria-pressed="${r._pick}" aria-label="Include ${esc(r.name)}">${r._pick ? "✓" : ""}</button>
        <div class="fi-body">
          <div class="fi-name">${esc(r.name)}</div>
          <div class="fi-meta">${nut(r.cal, "")} cal · ${nut(r.p, "g")} P<span class="fr-serving">${esc(r.meal)} · ×${r.qty}</span></div>
          <div class="fi-sub">${esc(r.source)} · confidence ${esc(r.conf)}</div>
          ${flags(r)}
        </div></div>`).join("") +
    `<button class="btn btn-primary fi-commit" onclick="commitImportItems()" ${n ? "" : "disabled"}>
       Add ${n} to the day</button>`;
  }

  if (warnings.length) {
    html += `<div class="fi-warnings">${warnings.map(w => `<div class="fi-flag">${esc(w)}</div>`).join("")}</div>`;
  }

  el.innerHTML = html;
}

async function commitImportFoods() {
  if (!requireSync()) return;
  if (!importParsed) return;
  const rows = importParsed.foods.filter(r => r._pick);
  if (!rows.length) { showToast("Nothing selected"); return; }
  if (!sheetsUrl) {
    showToast("This browser isn't connected to your sheet — paste the URL in Settings");
    return;
  }

  const payload = rows.map(r => {
    const exists = foods.some(x => x.key === r.key);
    const out = { key: r.key, name: r.name };
    if (r.brand)    out.brand    = r.brand;
    if (r.microSrc) out.microSrc = r.microSrc;

    if (r.serving)  out.serving  = r.serving;
    if (r.verified) out.verified = r.verified;
    else if (!exists) out.verified = "no";
    FOOD_MACROS.forEach(k => { if (r[k] !== null) out[k] = r[k]; });
    return out;
  });

  let res;
  try {
    res = await postToSheets({ _type: "foods", foods: payload });
  } catch (e) {
    showToast(`Couldn't save: ${e.message} — your paste is kept`);
    return;
  }

  showToast(`${res.added || 0} added, ${res.updated || 0} updated`);
  if (importParsed) {
    importParsed.foods = importParsed.foods.filter(r => !r._pick);
    if (!importParsed.foods.length && !importParsed.items.length) clearImportDraft();
    renderImportReview();
  }

  await fetchFromSheets();
  renderFoodTab();
}

function commitImportItems() {
  if (!requireSync()) return;
  if (!importParsed) return;
  const rows = importParsed.items.filter(r => r._pick);
  if (!rows.length) { showToast("Nothing selected"); return; }

  rows.forEach(r => {
    const item = { id: newFoodId(), date: currentFoodDate, meal: r.meal, key: r.key || "",
                   name: r.name, qty: r.qty, source: r.source, conf: r.conf };

    FOOD_MACROS.forEach(k => { item[k] = nutVal(r[k], k); });
    nutrition.push(item);
  });
  markFoodDirty(currentFoodDate);
  persist();

  try {
    localStorage.setItem(IMPORT_DONE_KEY,
      JSON.stringify(importDone().concat(rows.map(r => importSig(r, currentFoodDate)))));
  } catch (e) {}
  importParsed.items = importParsed.items.filter(r => !r._pick);
  if (!importParsed.foods.length && !importParsed.items.length) clearImportDraft();
  renderImportReview();
  renderFoodTab();

  showToast(`${rows.length} added to ${currentFoodDate} — press Save Day`);
}

function buildFoodEntry(date) {
  return {
    _type:   "food",
    date,
    savedAt: new Date().toISOString(),
    items:   foodItemsFor(date).map(it => {
      const row = { meal: it.meal, key: it.key, name: it.name, qty: it.qty,
                    source: it.source, conf: it.conf };
      FOOD_MACROS.forEach(k => { row[k] = it[k] === undefined ? null : it[k]; });
      return row;
    }),
  };
}

async function discardLocalDay(date) {
  if (!requireSync()) return;
  const d = date || currentFoodDate;
  if (!confirm(`Discard this device's unsaved changes for ${d} and reload it from the sheet?`)) return;
  foodDirty = foodDirty.filter(x => x !== d);
  foodQueue = foodQueue.filter(q => q.date !== d);
  nutrition = nutrition.filter(n => n.date !== d);
  delete syncedAt[d];
  persist();
  await fetchFromSheets();
  renderFoodTab();
  showToast(`Reloaded ${d} from the sheet`);
}

let foodSaveInFlight = false;

async function saveFoodDay() {
  if (!requireSync()) return;
  if (foodSaveInFlight) { showToast("Already saving…"); return; }
  const items = foodItemsFor(currentFoodDate);

  if (!items.length && !foodDirty.includes(currentFoodDate)) {
    showToast("Nothing to save");
    return;
  }

  const entry = buildFoodEntry(currentFoodDate);

  if (!sheetsUrl) {
    showToast("Saved on this device — Sheets not connected");
    return;
  }

  foodSaveInFlight = true;
  try {
    const ok = await syncFoodToSheets(entry);
    if (ok) showToast(`Saved ${items.length} item(s) ✓`);
  } finally {
    foodSaveInFlight = false;
  }
}

async function syncFoodToSheets(entry) {
  if (!sheetsUrl) return false;
  setSyncStatus("pending", "Syncing…");
  let ok = false;
  try {
    await postToSheets({ ...entry, _base: baseSavedAt("food", entry.date) });

    nutrition.forEach(n => { if (n.date === entry.date) n.savedAt = entry.savedAt; });
    syncedAt[entry.date] = entry.savedAt;
    recentWrites.food[entry.date] = Date.now();

    setSyncStatus("ok", "Synced");
    foodQueue = foodQueue.filter(q => q.date !== entry.date);
    foodDirty = foodDirty.filter(d => d !== entry.date);
    ok = true;
  } catch (err) {
    console.error("Food sync failed:", err);
    foodQueue = foodQueue.filter(q => q.date !== entry.date);
    if (err.conflict) {

      setSyncStatus("error", `${shortDate(entry.date)} changed on another device — Save Day again to overwrite`);
    } else {
      setSyncStatus("error", "Sync failed — queued");
      foodQueue.push({ date: entry.date });
    }
  }
  persist();
  updateQueueStatus();
  renderFoodTab();
  return ok;
}

function nutrientCoverage(items, key) {
  const totalCal = items.reduce((s, it) => s + (Number(it.cal) || 0), 0);
  if (!totalCal) return items.length ? 0 : 1;
  const covered = items.reduce((s, it) =>
    s + (it[key] === null || it[key] === undefined ? 0 : (Number(it.cal) || 0)), 0);
  return covered / totalCal;
}

function dayProgress() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return Math.max(0, Math.min(1, (h - 7) / 14));
}

function paceState(actual, target, isToday) {
  if (!target) return "";
  const ratio = actual / target;
  if (!isToday) return ratio >= 0.95 ? "ok" : ratio >= 0.8 ? "near" : "under";
  const expected = dayProgress();
  if (expected < 0.35) return "";
  if (ratio >= expected * 0.9)  return "ok";
  if (ratio >= expected * 0.65) return "near";
  return "under";
}

function recentLoggedDates(limit = 7) {
  const seen = [];
  nutrition.forEach(n => {
    if (n.date !== currentFoodDate && !seen.includes(n.date)) seen.push(n.date);
  });
  return seen.sort((a, b) => b.localeCompare(a)).slice(0, limit);
}

function openCopyDay() {
  if (!requireSync()) return;
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
  if (!requireSync()) return;
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

const DRIFT_EPSILON = 0.05;

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

    if (a === null || b === null) { diffs.push({ k, from: a, to: b }); return; }
    if (Math.abs(Number(a) - Number(b)) > DRIFT_EPSILON) diffs.push({ k, from: a, to: b });
  });
  return diffs.length ? { item: it, diffs, cur } : null;
}

function scanDrift() {
  const byDate = {};
  nutrition.forEach(it => {
    if (!it.key) return;
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
  if (!requireSync()) return 0;
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
  if (!requireSync()) return;
  const dates = Object.keys(scanDrift());
  let n = 0;
  dates.forEach(d => { n += refreshDay(d, true); });
  closeModal();
  renderFoodTab();
  showToast(`Refreshed ${n} item(s) across ${dates.length} day(s) — save each day to sync`);
}

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

function renderFoodTab() {
  renderFoodTotals();
  renderFoodResults();
  renderFoodItems();
}

function weekDrinks(date) {
  const end = new Date(date + "T00:00:00");
  const start = new Date(end); start.setDate(start.getDate() - 6);
  const iso = d => d.toISOString().slice(0, 10);
  let g = 0;
  nutrition.forEach(n => {
    if (n.date >= iso(start) && n.date <= date) g += Number(n.alc) || 0;
  });
  return g / STD_DRINK_G;
}

function renderFoodTotals() {
  const el = document.getElementById("food-totals");
  if (!el) return;

  const items   = foodItemsFor(currentFoodDate);
  const t       = foodTotals(items);
  const isToday = currentFoodDate === todayISO();

  const fcal     = foodCalories(items);
  const drinks   = standardDrinks(items);
  const T        = foodTargets;
  const rem      = T.cal ? T.cal - fcal : null;
  const pct      = T.cal ? Math.min(100, (fcal / T.cal) * 100) : 0;
  const floorPct = T.cal && T.calFloor ? (T.calFloor / T.cal) * 100 : null;
  const calState = T.cal ? paceState(fcal, T.cal, isToday) : "ok";

  const proteinState = !T.proteinMin ? "ok"
                     : t.p >= T.proteinMin ? "ok" : paceState(t.p, T.proteinMin, isToday);
  const proteinLeft  = T.proteinMin ? Math.max(0, T.proteinMin - t.p) : 0;
  const proteinBand  = T.proteinMin
    ? `${proteinLeft > 0 ? `${fmtNum(proteinLeft)}g to go · ` : "in band · "}${T.proteinMin}${T.proteinMax ? `–${T.proteinMax}` : "+"}`
    : "no target set";

  const remLabel = rem == null ? "no target set"
                 : rem > 0 ? `${fmtNum(rem)} to go` : `${fmtNum(-rem)} over`;
  const unsaved  = foodDirty.includes(currentFoodDate)
    ? `<span class="food-unsaved">Unsaved — press Save Day</span>
       <button class="btn btn-ghost btn-sm" onclick="discardLocalDay()"
               title="Throw away this device's unsaved changes for this day and take the sheet's version">Discard &amp; reload</button>` : "";

  const naN      = NUTRIENTS.find(n => n.key === "na");
  const naTarget = naN.target || naN.dv;
  const naPct    = Math.min(100, (t.na / naTarget) * 100);
  const naState  = t.na > naTarget ? "over" : t.na > naTarget * 0.85 ? "near" : "ok";

  el.innerHTML = `
    <div class="food-totals">
      <div class="food-total-main">
        <div class="food-total-block">
          <span class="ft-num ft-${calState}">${fmtNum(fcal)}</span>
          <span class="ft-unit">cal${drinks > 0 ? " of food" : ""}</span>
          <span class="ft-sub">${[T.cal ? remLabel : null,
            drinks > 0 ? `${fmtNum(t.cal)} with alcohol` : T.cal ? `target ${fmtNum(T.cal)}` : null]
            .filter(Boolean).join(" · ") || "no target set"}</span>
        </div>
        <div class="food-total-block">
          <span class="ft-num ft-${proteinState}">${fmtNum(t.p)}</span>
          <span class="ft-unit">g protein</span>
          <span class="ft-sub">${proteinBand}</span>
        </div>
      </div>

      ${T.cal ? `
      <div class="food-bar" role="img" aria-label="${fmtNum(t.cal)} of ${fmtNum(T.cal)} calories">
        <div class="food-bar-fill" style="width:${pct}%"></div>
        ${floorPct != null ? `<div class="food-bar-floor" style="left:${floorPct}%" title="${fmtNum(T.calFloor)} floor"></div>` : ""}
      </div>` : ""}

      <div class="food-na-row">
        <span class="na-label">Sodium</span>
        <div class="food-bar food-bar-sm">
          <div class="food-bar-fill na-${naState}" style="width:${naPct}%"></div>
        </div>
        <span class="na-val na-${naState}">${fmtNum(t.na)}<span class="na-target"> / ${fmtNum(naTarget)}mg</span></span>
      </div>

      ${drinks > 0 ? `
      <div class="food-drinks-row">
        <span class="na-label">Alcohol</span>
        <span class="drinks-val">${drinks.toFixed(1)} std drink${drinks >= 1.95 ? "s" : ""}</span>
        <span class="drinks-sub">${fmtNum(t.alc)}g ethanol · ${fmtNum(t.alc * KCAL_PER_G_ALCOHOL)} cal
          · ${weekDrinks(currentFoodDate).toFixed(1)} in the last 7 days</span>
      </div>` : ""}

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

function renderMicroSummary(items, t, isToday) {
  const micros = NUTRIENTS.filter(n => !n.core && !n.notMicro);
  if (!micros.length) return "";

  if (!items.length) {
    return `<div class="micro-block"><span class="micro-early">Nothing logged yet — no micronutrient read</span></div>`;
  }

  const progress = isToday ? dayProgress() : 1;
  const tooEarly = isToday && progress < 0.35;

  const rows = micros.map(n => {
    const cov = nutrientCoverage(items, n.key);
    const val = Number(t[n.key]) || 0;
    const pct = n.dv > 0 ? (val / n.dv) * 100 : null;

    const low  = n.goal === "hit" && n.dv > 0 && val < n.dv * progress * 0.7;
    const over = n.goal === "cap" && n.dv > 0 && pct > 100;

    return { n, cov, val, pct, flagged: !tooEarly && (low || over) && cov > 0.5 };
  });

  const flagged = rows.filter(r => r.flagged);
  const untracked = rows.filter(r => r.cov < 0.5).length;

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
         tab to your sheet, then reload.</div>`
      : `<div class="food-empty"><strong>This browser isn't connected to your sheet.</strong><br>
         Paste your deployment URL in <strong>Settings</strong>, then reload. Sync settings are
         stored per browser, so each device needs it entered once.</div>`;
    return;
  }

  const q = foodQuery.trim();

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
    el.innerHTML = `<div class="food-empty">No match. <strong>Paste from Claude</strong> to add it from a
      label photo, or use <strong>Custom item</strong> for a one-off.</div>`;
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
            <div class="fi-macros">${fmtOrDash(it.cal)} cal · ${fmtOrDash(it.p)}g P · ${fmtOrDash(it.na)}mg Na</div>
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

function renderSettings() {
  const input = document.getElementById("sheets-url");
  if (input) input.value = sheetsUrl;
  const secret = document.getElementById("sheets-secret");
  if (secret) secret.value = sheetsSecret;
  const goal = document.getElementById("weight-goal");
  if (goal) {
    goal.value = weightGoal;
    const fromSheet = !!String(sheetSettings.weight_goal || "").trim();
    goal.disabled = fromSheet;
    goal.title = fromSheet ? "Set by weight_goal in the sheet's Settings tab" : "";
  }
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

  if (sheetsUrl) await fetchFromSheets();
  else { setSyncStatus("", ""); setGate("open"); }
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
  if (weightQueue.length) parts.push(`${weightQueue.length} weigh-in(s)`);
  el.textContent = parts.length
    ? `${parts.join(" and ")} pending sync.`
    : "Queue is empty — everything synced.";
}

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
  if (!requireSync()) return;
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
          if (!requireSync()) return;
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

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

let confirmCallback = null;
let altCallback     = null;

function showConfirmHtml(title, html) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body-text").innerHTML = html;
  document.getElementById("modal-confirm-btn").style.display = "none";
  document.getElementById("modal-alt-btn").style.display = "none";
  confirmCallback = null;
  altCallback = null;
  document.getElementById("confirm-modal").classList.add("open");
}

function showChoice(title, html, { primary, alt }) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body-text").innerHTML = html;
  const p = document.getElementById("modal-confirm-btn");
  const a = document.getElementById("modal-alt-btn");
  p.style.display = ""; p.textContent = primary.label;
  a.style.display = ""; a.textContent = alt.label;
  confirmCallback = primary.fn;
  altCallback     = alt.fn;
  document.getElementById("confirm-modal").classList.add("open");
}

function showConfirm(title, body, onConfirm, confirmLabel = "Confirm") {
  document.getElementById("modal-alt-btn").style.display = "none";
  altCallback = null;
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
  altCallback = null;
}

document.getElementById("save-confirm").addEventListener("click", () => {
  document.getElementById("save-confirm").classList.remove("show");
  clearTimeout(saveConfirmTimer);
});

document.getElementById("modal-confirm-btn").addEventListener("click", () => {
  if (confirmCallback) { confirmCallback(); closeModal(); }
});

document.getElementById("modal-alt-btn").addEventListener("click", () => {
  if (altCallback) { altCallback(); closeModal(); }
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

loadFromStorage();
applySettings();
initTheme();
pruneDrafts();

currentLogDate  = todayISO();
currentFoodDate = currentLogDate;
document.getElementById("workout-date").value = currentLogDate;
document.getElementById("food-date").value     = currentFoodDate;
document.getElementById("food-meal").value     = defaultMeal();
loadDraftOrWorkout(currentLogDate);

updateQueueStatus();

document.getElementById("exercises-container").addEventListener("input", () => {
  saveDraft(currentLogDate);
});

document.getElementById("workout-date").addEventListener("change", e => {
  saveDraft(currentLogDate);
  currentLogDate = e.target.value;
  loadDraftOrWorkout(currentLogDate);
});

document.getElementById("food-date").addEventListener("change", e => {
  currentFoodDate = e.target.value;
  renderFoodTab();

  renderImportReview();
});

document.getElementById("food-search").addEventListener("input", e => {
  onFoodSearch(e.target.value);
});

if (sheetsUrl) fetchFromSheets();
else setSyncStatus("", "");

document.addEventListener("visibilitychange", refreshOnReturn);

window.addEventListener("pageshow", e => { if (e.persisted) refreshOnReturn(); });

window.addEventListener("online", () => { if (sheetGate === "failed") fetchFromSheets(); });
