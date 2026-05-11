/* =============================================================
   LIFT LOG — appsscript.js
   Paste this into the Google Apps Script editor:
     Extensions → Apps Script → replace all code → Save → Deploy
   Deploy as a Web App:
     Execute as: Me  |  Who has access: Anyone
   Create a new deployment version any time you update this file.
   ============================================================= */

// ── GET — fetch all workouts + weight log (called by the app on load) ─────

function doGet(e) {
  try {
    const workouts  = getWorkouts();
    const weightLog = getWeightLog();
    return respond({ status: "ok", workouts, weightLog });
  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

function getWorkouts() {
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Workouts");
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

// ── POST — save or update a workout ───────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data._test) {
      return respond({ status: "ok", message: "Test successful" });
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
      const ss          = SpreadsheetApp.getActiveSpreadsheet();
      let   weightSheet = ss.getSheetByName("Weight");
      if (!weightSheet) {
        weightSheet = ss.insertSheet("Weight");
        weightSheet.appendRow(["Date", "Weight (lbs)"]);
      }
      const wLast = weightSheet.getLastRow();
      if (wLast > 1) {
        const dates = weightSheet.getRange(2, 1, wLast - 1, 1).getValues();
        for (let i = dates.length - 1; i >= 0; i--) {
          if (formatDateCell(dates[i][0]) === String(data.date)) weightSheet.deleteRow(i + 2);
        }
      }
      weightSheet.appendRow([data.date, data.weight]);
      return respond({ status: "ok" });
    }

    // Delete a single weight entry
    if (data._deleteWeight) {
      const weightSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Weight");
      if (weightSheet) {
        const wLast = weightSheet.getLastRow();
        if (wLast > 1) {
          const dates = weightSheet.getRange(2, 1, wLast - 1, 1).getValues();
          for (let i = dates.length - 1; i >= 0; i--) {
            if (formatDateCell(dates[i][0]) === String(data.date)) weightSheet.deleteRow(i + 2);
          }
        }
      }
      return respond({ status: "ok" });
    }

    // Delete workout — remove all rows for this date and return
    if (data._delete) {
      if (lastRow > 1) {
        const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = dateCol.length - 1; i >= 0; i--) {
          if (formatDateCell(dateCol[i][0]) === String(data.date)) {
            sheet.deleteRow(i + 2);
          }
        }
      }
      return respond({ status: "ok" });
    }

    // Delete all existing rows for this date so we don't accumulate duplicates
    if (lastRow > 1) {
      const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = dateCol.length - 1; i >= 0; i--) {
        if (formatDateCell(dateCol[i][0]) === String(data.date)) {
          sheet.deleteRow(i + 2); // +2: 1-indexed + header row offset
        }
      }
    }

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
