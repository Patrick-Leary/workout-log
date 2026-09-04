/* =============================================================
   LIFT LOG — appsscript.js
   Paste this into the Google Apps Script editor:
     Extensions → Apps Script → replace all code → Save → Deploy
   Deploy as a Web App:
     Execute as: Me  |  Who has access: Anyone
   Create a new deployment version any time you update this file.

   TABS THIS SCRIPT EXPECTS
     Workouts   Date | Exercise | Set | Weight (lbs) | Reps | Saved At
     Weight     Date | Weight (lbs)
     Foods      Key | Name | Brand | Serving | Cal | P | C | Fib | Fat | Sat | Na | Verified
     Nutrition  Date | Meal | Key | Item | Qty | Cal | P | C | Fib | Fat | Sat | Na |
                Source | Conf | Saved At
   Foods and Nutrition are optional — the script degrades gracefully if absent.
   ============================================================= */

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
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Workouts");
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const rows       = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const workoutMap = {};

  rows.forEach(([date, exercise, setNum, weight, reps, savedAt]) => {
    const dateStr = formatDateCell(date);
    if (!dateStr) return;

    if (!workoutMap[dateStr]) {
      workoutMap[dateStr] = {
        date:      dateStr,
        savedAt:   String(savedAt || ""),
        exercises: {}
      };
    }

    if (!workoutMap[dateStr].exercises[exercise]) {
      workoutMap[dateStr].exercises[exercise] = {
        id:   exerciseNameToId(String(exercise)),
        name: String(exercise),
        sets: []
      };
    }

    workoutMap[dateStr].exercises[exercise].sets.push({
      weight: weight !== "" && weight !== null ? Number(weight) : null,
      reps:   reps   !== "" && reps   !== null ? Number(reps)   : null
    });
  });

  return Object.values(workoutMap)
    .map(w => ({ ...w, exercises: Object.values(w.exercises) }))
    .sort((a, b) => b.date.localeCompare(a.date));
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Foods");
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const cols = Math.min(12, sheet.getLastColumn());
  return sheet.getRange(2, 1, lastRow - 1, cols).getValues()
    .map(([key, name, brand, serving, cal, p, c, fib, fat, sat, na, verified]) => ({
      key:      String(key || "").trim(),
      name:     String(name || "").trim(),
      brand:    String(brand || "").trim(),
      serving:  String(serving || "").trim(),
      cal: num(cal), p: num(p), c: num(c), fib: num(fib),
      fat: num(fat), sat: num(sat), na: num(na),
      verified: String(verified || "").trim().toLowerCase() === "yes",
    }))
    .filter(f => f.key && f.name);
}

function getNutrition(since) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Nutrition");
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const cols = Math.min(15, sheet.getLastColumn());
  return sheet.getRange(2, 1, lastRow - 1, cols).getValues()
    .map(([date, meal, key, item, qty, cal, p, c, fib, fat, sat, na, source, conf, savedAt]) => ({
      date:   formatDateCell(date),
      meal:   String(meal || ""),
      key:    String(key || ""),
      name:   String(item || ""),
      qty:    num(qty) || 1,
      cal: num(cal), p: num(p), c: num(c), fib: num(fib),
      fat: num(fat), sat: num(sat), na: num(na),
      source: String(source || "manual"),
      conf:   String(conf || ""),
      savedAt: String(savedAt || ""),
    }))
    .filter(r => r.date && r.name && (!since || r.date >= since));
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
      const sheet = ensureSheet("Nutrition", [
        "Date", "Meal", "Key", "Item", "Qty", "Cal", "P", "C", "Fib",
        "Fat", "Sat", "Na", "Source", "Conf", "Saved At"
      ]);
      deleteRowsForDate(sheet, data.date);

      const savedAt = data.savedAt || new Date().toISOString();
      (data.items || []).forEach(it => {
        sheet.appendRow([
          data.date, it.meal || "", it.key || "", it.name || "", it.qty ?? 1,
          it.cal ?? "", it.p ?? "", it.c ?? "", it.fib ?? "",
          it.fat ?? "", it.sat ?? "", it.na ?? "",
          it.source || "manual", it.conf || "", savedAt
        ]);
      });
      return respond({ status: "ok" });
    }

    if (data._deleteNutrition) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Nutrition");
      if (sheet) deleteRowsForDate(sheet, data.date);
      return respond({ status: "ok" });
    }

    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Workouts");
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
    data.exercises.forEach(exercise => {
      exercise.sets.forEach((set, i) => {
        sheet.appendRow([
          data.date,
          exercise.name,
          i + 1,
          set.weight ?? "",
          set.reps   ?? "",
          data.savedAt || new Date().toISOString()
        ]);
      });
    });

    return respond({ status: "ok" });

  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────

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

function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
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
  const map = {
    "Leg Press":      "legpress",
    "Chest Press":    "chestpress",
    "Pull-Ups":       "pullups",
    "Overhead Press": "ohpress",
    "Dumbbell Rows":  "rows",
    "Bicep Curls":    "curls"
  };
  return map[name] || name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
