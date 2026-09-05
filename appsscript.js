/* =============================================================
   LIFT LOG — appsscript.js
   Paste this into the Google Apps Script editor:
     Extensions → Apps Script → replace all code → Save → Deploy
   Deploy as a Web App:
     Execute as: Me  |  Who has access: Anyone
   Create a new deployment version any time you update this file.

   TABS THIS SCRIPT EXPECTS
     Workouts   Date | Exercise | Set | Weight (lbs) | Reps | Saved At | Variant
     Weight     Date | Weight (lbs)
     Foods      Key | Name | Brand | Serving | <nutrients> | Verified | MicroSrc
     Nutrition  Date | Meal | Key | Item | Qty | <nutrients> | Source | Conf | Saved At
   where <nutrients> is, in order:
     Cal | P | C | Fib | Fat | Sat | Na | Trans | Chol | Sugar | AddSug |
     VitD | Ca | Fe | Potassium | VitA | VitC | VitE | VitK | B6 | B12 |
     Folate | Mg | Zn
   Foods and Nutrition are optional — the script degrades gracefully if absent.

   COLUMNS ARE READ BY HEADER NAME, NOT POSITION. Reorder them, or insert your
   own, and nothing breaks. Missing headers are added automatically on the next
   write, so upgrading an existing sheet needs no manual work.

   BLANK IS NOT ZERO. An empty nutrient cell reads as null, not 0, so the app
   can report "53% of the day covered" instead of inventing a deficiency out of
   a cell nobody has filled in yet.
   ============================================================= */

// ── SCHEMA ────────────────────────────────────────────────────────────────
// [sheet header, object key]. Keep in step with NUTRIENTS in scripts/app.js.
var NUTRIENT_COLS = [
  ["Cal", "cal"], ["P", "p"], ["C", "c"], ["Fib", "fib"], ["Fat", "fat"],
  ["Sat", "sat"], ["Na", "na"], ["Trans", "trans"], ["Chol", "chol"],
  ["Sugar", "sugar"], ["AddSug", "addsug"], ["VitD", "vitd"], ["Ca", "ca"],
  ["Fe", "fe"], ["Potassium", "k"], ["VitA", "vita"], ["VitC", "vitc"],
  ["VitE", "vite"], ["VitK", "vitk"], ["B6", "b6"], ["B12", "b12"],
  ["Folate", "folate"], ["Mg", "mg"], ["Zn", "zn"]
];

function nutrientHeaders() {
  return NUTRIENT_COLS.map(function (c) { return c[0]; });
}

var FOODS_HEADERS = ["Key", "Name", "Brand", "Serving"]
  .concat(nutrientHeaders()).concat(["Verified", "MicroSrc"]);

var NUTRITION_HEADERS = ["Date", "Meal", "Key", "Item", "Qty"]
  .concat(nutrientHeaders()).concat(["Source", "Conf", "Saved At"]);

var WORKOUT_HEADERS = ["Date", "Exercise", "Set", "Weight (lbs)", "Reps", "Saved At", "Variant"];

// ── AUTH ──────────────────────────────────────────────────────────────────
// Leave blank to keep the endpoint open (the original behaviour). Set it to a
// long random string and enter the same value in the app's Settings tab to
// require it. Deploy with it blank first, confirm the app still works, THEN
// set it — otherwise every device stops syncing until Settings is updated.
const SECRET = "";

function authorized(key) {
  return !SECRET || String(key || "") === SECRET;
}

// How many days of nutrition rows doGet returns when the caller doesn't ask
// for a range. Nutrition is item-level (~10 rows/day), so it outgrows the
// other tabs quickly and is the only one worth windowing.
const DEFAULT_NUTRITION_DAYS = 120;

// ── GET — fetch everything the app needs on load ──────────────────────────

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (!authorized(params.key)) {
      return respond({ status: "error", message: "Unauthorized" });
    }

    const since = params.since || isoDaysAgo(DEFAULT_NUTRITION_DAYS);

    // Foods and Nutrition are optional and hand-edited, so a malformed tab is
    // plausible. Isolate them: a broken Foods tab must not stop workouts and
    // weight from syncing.
    const warnings = [];
    const safely = (label, fn) => {
      try { return fn(); }
      catch (err) { warnings.push(label + ": " + err.message); return []; }
    };

    return respond({
      status:    "ok",
      workouts:  getWorkouts(),
      weightLog: getWeightLog(),
      foods:     safely("Foods",     getFoods),
      nutrition: safely("Nutrition", function () { return getNutrition(since); }),
      warnings:  warnings,
    });
  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

function getWorkouts() {
  const t = readTable("Workouts");
  if (!t) return [];
  const workoutMap = {};

  t.rows.forEach(function (row) {
    const dateStr = formatDateCell(cell(row, t.col, "Date"));
    if (!dateStr) return;
    const exercise = String(cell(row, t.col, "Exercise") || "");
    if (!exercise) return;
    const variant = String(cell(row, t.col, "Variant") || "");

    if (!workoutMap[dateStr]) {
      workoutMap[dateStr] = {
        date:    dateStr,
        savedAt: String(cell(row, t.col, "Saved At") || ""),
        exercises: {}
      };
    }
    // Keyed by exercise + variant: the same movement done two ways in one
    // session is two entries, because they are not comparable.
    const slot = exercise + "|" + variant;
    if (!workoutMap[dateStr].exercises[slot]) {
      workoutMap[dateStr].exercises[slot] = {
        id:      exerciseNameToId(exercise),
        name:    exercise,
        variant: variant,
        sets:    []
      };
    }

    workoutMap[dateStr].exercises[slot].sets.push({
      weight: numOrNull(cell(row, t.col, "Weight (lbs)")),
      reps:   numOrNull(cell(row, t.col, "Reps"))
    });
  });

  return Object.keys(workoutMap)
    .map(function (d) {
      const w = workoutMap[d];
      return { date: w.date, savedAt: w.savedAt,
               exercises: Object.keys(w.exercises).map(function (k) { return w.exercises[k]; }) };
    })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });
}

function getWeightLog() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Weight");
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  return sheet.getRange(2, 1, lastRow - 1, 2).getValues()
    .map(([date, weight]) => ({ date: formatDateCell(date), weight: Number(weight) }))
    .filter(r => r.date && !isNaN(r.weight));
}

// The food database — the single source of truth for repeat items. The app
// reads it to populate the picker; nothing writes to it from the app, so a
// label correction here is a one-place edit.
function getFoods() {
  const t = readTable("Foods");
  if (!t) return [];

  return t.rows.map(function (row) {
    const f = {
      key:      String(cell(row, t.col, "Key")     || "").trim(),
      name:     String(cell(row, t.col, "Name")    || "").trim(),
      brand:    String(cell(row, t.col, "Brand")   || "").trim(),
      serving:  String(cell(row, t.col, "Serving") || "").trim(),
      verified: String(cell(row, t.col, "Verified") || "").trim().toLowerCase() === "yes",
      microSrc: String(cell(row, t.col, "MicroSrc") || "").trim().toLowerCase()
    };
    const n = readNutrients(row, t.col);
    Object.keys(n).forEach(function (k) { f[k] = n[k]; });
    return f;
  }).filter(function (f) { return f.key && f.name; });
}

function getNutrition(since) {
  const t = readTable("Nutrition");
  if (!t) return [];

  return t.rows.map(function (row) {
    const r = {
      date:    formatDateCell(cell(row, t.col, "Date")),
      meal:    String(cell(row, t.col, "Meal") || ""),
      key:     String(cell(row, t.col, "Key")  || ""),
      name:    String(cell(row, t.col, "Item") || ""),
      qty:     numOrNull(cell(row, t.col, "Qty")) || 1,
      source:  String(cell(row, t.col, "Source") || "manual"),
      conf:    String(cell(row, t.col, "Conf")   || ""),
      savedAt: String(cell(row, t.col, "Saved At") || "")
    };
    const n = readNutrients(row, t.col);
    Object.keys(n).forEach(function (k) { r[k] = n[k]; });
    return r;
  }).filter(function (r) {
    return r.date && r.name && (!since || r.date >= since);
  });
}

// ── POST — save or update ─────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (!authorized(data._key)) {
      return respond({ status: "error", message: "Unauthorized" });
    }

    if (data._test) {
      return respond({ status: "ok", message: "Test successful" });
    }

    // ── Nutrition: replace the whole day, same upsert-by-date contract the
    //    workout path uses. Re-saving a date is always safe.
    if (data._type === "food") {
      const sheet = ensureSheet("Nutrition", NUTRITION_HEADERS);
      deleteRowsForDate(sheet, data.date);

      const savedAt = data.savedAt || new Date().toISOString();
      (data.items || []).forEach(function (it) {
        const values = {
          "Date": data.date, "Meal": it.meal || "", "Key": it.key || "",
          "Item": it.name || "", "Qty": it.qty === undefined ? 1 : it.qty,
          "Source": it.source || "manual", "Conf": it.conf || "", "Saved At": savedAt
        };
        // Undefined and null both stay blank — a nutrient nobody has filled in
        // must not be written as a zero.
        NUTRIENT_COLS.forEach(function (c) {
          values[c[0]] = it[c[1]] === undefined ? null : it[c[1]];
        });
        sheet.appendRow(buildRow(sheet, values));
      });
      return respond({ status: "ok" });
    }

    if (data._deleteNutrition) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Nutrition");
      if (sheet) deleteRowsForDate(sheet, data.date);
      return respond({ status: "ok" });
    }

    const sheet   = ensureSheet("Workouts", WORKOUT_HEADERS);
    const lastRow = sheet.getLastRow();

    // Delete all workouts — wipe every row below the header
    if (data._deleteAll) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
      return respond({ status: "ok" });
    }

    // Weight entry — upsert into the Weight sheet
    if (data._type === "weight") {
      const weightSheet = ensureSheet("Weight", ["Date", "Weight (lbs)"]);
      deleteRowsForDate(weightSheet, data.date);
      weightSheet.appendRow([data.date, data.weight]);
      return respond({ status: "ok" });
    }

    // Delete a single weight entry
    if (data._deleteWeight) {
      const weightSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Weight");
      if (weightSheet) deleteRowsForDate(weightSheet, data.date);
      return respond({ status: "ok" });
    }

    // Delete workout — remove all rows for this date and return
    if (data._delete) {
      deleteRowsForDate(sheet, data.date);
      return respond({ status: "ok" });
    }

    // Delete all existing rows for this date so we don't accumulate duplicates
    deleteRowsForDate(sheet, data.date);

    // Append one row per set
    const wSaved = data.savedAt || new Date().toISOString();
    data.exercises.forEach(function (exercise) {
      exercise.sets.forEach(function (set, i) {
        sheet.appendRow(buildRow(sheet, {
          "Date": data.date,
          "Exercise": exercise.name,
          "Set": i + 1,
          "Weight (lbs)": set.weight === undefined ? null : set.weight,
          "Reps": set.reps === undefined ? null : set.reps,
          "Saved At": wSaved,
          "Variant": exercise.variant || ""
        }));
      });
    });

    return respond({ status: "ok" });

  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────

// Read a sheet into rows plus a header-name -> column-index map, so every
// reader below addresses columns by name. Returns null if the tab is absent
// or holds nothing but a header.
function readTable(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) return null;
  const lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return null;

  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const col = {};
  header.forEach(function (h, i) {
    const key = String(h || "").trim();
    if (key && !(key in col)) col[key] = i;
  });
  return { rows: sheet.getRange(2, 1, lastRow - 1, lastCol).getValues(), col: col };
}

// Cell value by header name. Missing column or blank cell -> undefined.
function cell(row, col, name) {
  const i = col[name];
  if (i === undefined) return undefined;
  const v = row[i];
  return v === "" || v === null ? undefined : v;
}

// Blank stays blank. This is what lets the app distinguish "no magnesium in
// this food" from "nobody has filled in magnesium yet" — collapsing the two to
// 0 would manufacture deficiencies out of missing data.
function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Pull every nutrient column present into a flat object of key -> number|null.
function readNutrients(row, col) {
  const out = {};
  NUTRIENT_COLS.forEach(function (c) { out[c[1]] = numOrNull(cell(row, col, c[0])); });
  return out;
}

// Build a row array positioned by the sheet's own header order, so writes stay
// correct no matter how the columns have been rearranged.
function buildRow(sheet, values) {
  const lastCol = sheet.getLastColumn();
  const header  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return header.map(function (h) {
    const key = String(h || "").trim();
    return key in values && values[key] !== null && values[key] !== undefined
      ? values[key] : "";
  });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function num(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Create the sheet if absent; otherwise append any headers it is missing to
// the end of the header row. Existing columns are never moved or renamed, so
// upgrading a sheet full of data is non-destructive and needs no manual step.
function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    return sheet;
  }

  const lastCol = sheet.getLastColumn();
  const existing = lastCol >= 1
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
        return String(h || "").trim();
      })
    : [];
  const missing = headers.filter(function (h) { return existing.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

// Remove every row whose column A matches `date`. Walks backwards so the
// shifting row indexes don't skip matches.
function deleteRowsForDate(sheet, date) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (formatDateCell(dates[i][0]) === String(date)) sheet.deleteRow(i + 2);
  }
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

// Sheets may parse date strings into Date objects — convert back to YYYY-MM-DD
function formatDateCell(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val);
}

// Map display names back to the IDs the app uses internally
function exerciseNameToId(name) {
  // Every exercise is listed explicitly. The lowercase/strip fallback below
  // only agrees with the app's ids by coincidence, and where it didn't —
  // "Romanian Deadlift" -> romaniandeadlift vs the app's `rdl`, and
  // "Lateral Raise" -> lateralraise vs `latraise` — synced history silently
  // failed to match its exercise. Add a row here whenever EXERCISES gains one.
  const map = {
    "Leg Press":         "legpress",
    "Chest Press":       "chestpress",
    "Pull-Ups":          "pullups",
    "Overhead Press":    "ohpress",
    "Dumbbell Rows":     "rows",
    "Bicep Curls":       "curls",
    "Bench Press":       "bench",
    "Push-Ups":          "pushups",
    "Dips":              "dips",
    "Lat Pulldown":      "latpulldown",
    "Seated Row":        "seatedrow",
    "Squat":             "squat",
    "Split Squat":       "splitsquat",
    "Romanian Deadlift": "rdl",
    "Lateral Raise":     "latraise",
    "Hammer Curl":       "hammercurl",
    "Tricep Pulldown":   "triceppd",
    "Leg Raise":         "legraise",
    "Sit-Ups":           "situps"
  };
  return map[name] || name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
