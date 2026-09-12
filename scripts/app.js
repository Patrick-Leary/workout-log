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
    // Smith and Barbell are total bar weight; only the dumbbell version is per hand.
    variants: ["Smith", "Dumbbell", "Barbell"], perHand: ["Dumbbell"],
    std: { Barbell: "bench-bb", Smith: "bench-smith", Dumbbell: "bench-db" } },
  // Range of motion is a variant, not a detail. Tested 2026-09-05: 25 reps at
  // ~90 degrees vs 21 chest-to-floor, a 16% inflation. "To 90" is listed FIRST
  // so unlabelled history — every set logged before that test — resolves to the
  // partial it actually was, instead of being silently credited as full range.
  // Only full ROM carries standards: Strength Level's rep figures assume it, so
  // ranking a partial against them overstates the lift.
  { id: "pushups",     name: "Push-Ups",          group: "Chest",     defaultSets: 3, repRange: null,     weighted: false, weight: 0.75, amrap: true,
    // `lockedVariant` hides the picker and stamps every NEW set as Full ROM —
    // the standard is now the protocol, so asking each time was pure friction.
    // The variants list stays because it is how HISTORY is read: sets logged
    // before 2026-09-05 carry no variant and resolve to `variants[0]`, i.e. the
    // partial they actually were. Collapsing the list to one entry would
    // silently re-credit them as full range and inflate the record by the
    // measured 16% (25 reps to 90 degrees vs 21 chest-to-floor, same session).
    lockedVariant: "Full ROM",
    variants: ["To 90\u00b0", "Full ROM"], std: { "Full ROM": "pushups" },
    hint: "chest within a fist of the floor" },
  { id: "dips",        name: "Dips",              group: "Chest",     defaultSets: 3, repRange: null,     weighted: false, weight: 1.0, amrap: true,
    // Only the bodyweight variant carries standards; a weighted dip is a
    // different lift and Strength Level ranks it on added load, not reps.
    // Assisted stays deliberately unranked for the same reason Captain's-chair
    // leg raises and bodyweight split squats do: the machine removes an unknown
    // share of bodyweight, so there is no honest curve to rank the reps against.
    // Logging it keeps the session history intact without inventing a number.
    variants: ["Bodyweight", "Weighted", "Assisted"], std: { Bodyweight: "dips" } },

  // ── Back ────────────────────────────────────────────────────────────────
  { id: "pullups",     name: "Pull-Ups",          group: "Back",      defaultSets: 3, repRange: null,     weighted: false, weight: 1.0, amrap: true,
    variants: ["Bodyweight", "Weighted"], std: { Bodyweight: "pullups" } },
  { id: "latpulldown", name: "Lat Pulldown",      group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0,
    variants: ["Cable"], std: { Cable: "latpulldown" } },
  { id: "seatedrow",   name: "Seated Row",        group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 0.75,
    variants: ["Cable"], std: { Cable: "seatedrow" } },
  { id: "rows",        name: "Dumbbell Rows",      group: "Back",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0, perSide: true, perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Barbell"], std: { Dumbbell: "row-db" } },

  // ── Legs ────────────────────────────────────────────────────────────────
  { id: "squat",       name: "Squat",             group: "Legs",      defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,
    // Smith and Barbell are total bar weight; the dumbbell version is per hand.
    perHand: ["Dumbbell"],
    variants: ["Smith", "Barbell", "Dumbbell", "Bodyweight"],
    std: { Barbell: "squat-bb", Smith: "squat-smith", Dumbbell: "squat-db" },
    hint: "leave blank for bodyweight" },
  { id: "legpress",    name: "Leg Press",         group: "Legs",      defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.75,
    variants: ["Machine"], std: { Machine: "legpress" } },
  { id: "rdl",         name: "Romanian Deadlift", group: "Legs",      defaultSets: 3, repRange: [8, 12],  weighted: true,  weight: 1.0, perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Barbell"], std: { Dumbbell: "rdl-db" } },
  { id: "splitsquat",  name: "Split Squat",       group: "Legs",      defaultSets: 3, repRange: [8, 10],  weighted: true,  weight: 1.0, perSide: true,
    // perHand added so the entry convention matches the standard, which is
    // per-dumbbell like every other Strength Level dumbbell figure.
    // ⚠️ The Bodyweight variant stays deliberately unranked: Strength Level's
    // "Bulgarian Split Squat" is a BARBELL lift (143 lb average), not a rep
    // count, so there is no published curve for the unloaded version. Ranking
    // it against anything would be invention.
    perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Bodyweight"], std: { Dumbbell: "splitsquat-db" },
    hint: "per leg · Bulgarian (rear foot elevated) · leave blank for bodyweight" },

  // ── Shoulders ───────────────────────────────────────────────────────────
  { id: "ohpress",     name: "Overhead Press",    group: "Shoulders", defaultSets: 3, repRange: [5, 10],  weighted: true,  weight: 1.0,
    // Barbell is total bar weight; the dumbbell version is per hand. `ohp-db`
    // is a per-dumbbell curve (50 lb at the median vs 98 for the barbell), so
    // without this flag the form invited a TOTAL and ranked it as one hand —
    // the same 2x inflation that put Legs at Platinum off a 30 lb split squat.
    perHand: ["Dumbbell"],
    variants: ["Barbell", "Dumbbell"], std: { Barbell: "ohp-bb", Dumbbell: "ohp-db" } },
  { id: "latraise",    name: "Lateral Raise",     group: "Shoulders", defaultSets: 3, repRange: [10, 12], weighted: true,  weight: 0.5,
    perHand: ["Dumbbell seated", "Dumbbell standing"],
    variants: ["Dumbbell seated", "Dumbbell standing", "Cable"],
    std: { "Dumbbell seated": "latraise-db", "Dumbbell standing": "latraise-db", Cable: "latraise-db" } },

  // ── Arms ────────────────────────────────────────────────────────────────
  { id: "curls",       name: "Bicep Curls",       group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5, perHand: ["Dumbbell"],
    variants: ["Dumbbell", "Barbell", "Cable"], std: { Dumbbell: "curl-db" } },
  { id: "hammercurl",  name: "Hammer Curl",       group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5, perHand: true,
    variants: ["Dumbbell"], std: { Dumbbell: "hammercurl-db" } },
  { id: "triceppd",    name: "Tricep Pulldown",   group: "Arms",      defaultSets: 3, repRange: [10, 15], weighted: true,  weight: 0.5,
    variants: ["Cable"], std: { Cable: "triceppd-cable" } },

  // ── Core ────────────────────────────────────────────────────────────────
  { id: "legraise",    name: "Leg Raise",         group: "Core",      defaultSets: 3, repRange: null,     weighted: false, weight: 0.5, amrap: true,
    // Captain's chair is the easier variant (back supported, no grip limit) and
    // has no published curve — same principle as push-up ROM: it stays unranked
    // rather than borrowing the harder movement's standard.
    variants: ["Hanging", "Captain's chair"], std: { Hanging: "legraise-hang" } },
  { id: "situps",      name: "Sit-Ups",           group: "Core",      defaultSets: 3, repRange: null,     weighted: false, weight: 0.5, amrap: true,
    variants: ["Bodyweight"], std: { Bodyweight: "situps" } },

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

  // Added 2026-09-06, read off Strength Level's 130 lb row directly — the same
  // bodyweight this table is referenced to, so no interpolation was involved.
  //
  // ⚠️ Strength Level prints "< 1" for the 5th-percentile anchor on hard
  // bodyweight movements. Recorded as 0.5: the interpolation is on ln(value)
  // and needs a positive number, and 0.5 preserves the real meaning ("most
  // people cannot do one"). It makes the bottom band steep, which is correct —
  // the first rep of a dip is a genuine milestone.
  "dips":           { kind: "reps",   v: [0.5,   1,   9,  19,  30] },
  "legraise-hang":  { kind: "reps",   v: [0.5,   7,  14,  24,  34] },
  "situps":         { kind: "reps",   v: [0.5,  16,  44,  79, 118] },
  // ⚠️ Strength Level's BULGARIAN split squat (rear foot elevated). A flat-footed
  // split squat is an easier movement and this curve would over-rate it.
  "splitsquat-db":  { kind: "weight", v: [ 15,  27,  44,  65,  89] },
  "squat-db":       { kind: "weight", v: [ 13,  26,  44,  68,  94] },
  // ⚠️ WEAKER THAN THE REST. A cable pushdown percentile depends on the
  // machine's pulley ratio, so the same effort reads differently on different
  // stacks. Treat this rank as indicative, not comparable to the dumbbell ones.
  "triceppd-cable": { kind: "weight", v: [ 19,  37,  61,  92, 128] },
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
/* ── STALENESS, not decay ─────────────────────────────────────────────────
   This used to demote a division per 5 days after a 7-day grace. It was always
   documented as a house rule rather than physiology — the literature has
   strength holding 2-4 weeks — and it had a worse problem than being wrong:
   `calcStreak` ALSO zeroed at exactly 7 days. A missed week triggered both at
   once, so the app's entire response to a lapse was to demote you and wipe your
   streak on the same morning. That is the moment of maximum quit risk, and the
   owner's previous attempt died at day 41.

   The fix is the chess-rating one. Glicko does not lower an inactive player's
   rating; it widens their rating deviation — the number holds, the confidence
   in it drops. This app already has that vocabulary (`provisional`,
   `conf: low`) and used it everywhere except here. So: the rank holds, and we
   say how long since it was last measured.                                   */
const STALE = { afterDays: 7, provisionalDays: 21 };

// One forgiveness. A single gap of a week or two keeps the streak alive; a
// second one, or a gap past a fortnight, ends it. Apple lets you pause a ring
// streak for a month and Duolingo sells a Streak Freeze — a hard cliff at day 7
// punishes exactly the person you most need to come back.
const STREAK = { freeDays: 7, forgivenDays: 14 };

/* ── BREADTH ──────────────────────────────────────────────────────────────
   Caps, not deductions. Three numbers instead of one blended score:
     earned  what the lifts say
     cap     the ceiling your breadth allows
     shown   the lower of the two, WITH the reason named
   An average hides both inputs and explains nothing ("why am I Gold 3?").
   A cap keeps effort visible even while it is binding, and states exactly what
   unlocks the next tier — an instruction rather than a verdict.

   Nothing is ever capped below Gold. At Bronze and Silver the only thing that
   should matter is showing up, and this ladder already carries decay; a system
   that mostly explains why you cannot rank up is one you stop opening. The
   stated risk on this project is adherence, not accuracy.                    */
const CAP_FLOOR_TIER = 2;                        // Gold

// Movement patterns trained -> highest tier index reachable. The floor above
// means 0-2 patterns all land on Gold; breadth only starts binding at Platinum.
const BREADTH_CAPS = [2, 2, 2, 3, 4, 5];         // Gold Gold Gold Plat Dia Champ

// An isolation-only group caps at Gold. The compound/machine/isolation weights
// were supposed to prevent this, but they form a weighted MEAN — when every
// lift in a group carries the same weight the weights cancel and the penalty
// disappears entirely. Arms was sitting at Platinum 3 on two curls, which is
// precisely what that weighting's own comment said could not happen.
const ISOLATION_CAP_TIER = 2;                    // Gold

// Sessions before a lift counts toward its group. Without this the mean
// punishes you for TRYING: the first time you attempt a lift you are bad at it,
// and logging it drops the group. That is backwards for a ladder whose whole
// purpose is to reward breadth. One repeat is enough to establish a baseline.
const GRACE_SESSIONS = 2;

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
  // Alcohol is recorded, not scored daily. A per-day cap is the wrong frame —
  // the meaningful unit is standard drinks per WEEK, so it is rolled up in the
  // weekly readout instead of painted red at dinner. Stored in grams of
  // ethanol; STD_DRINK_G converts for display.
  // notMicro: tracked and totalled, but excluded from the micronutrient block —
  // it is neither a macro to hit nor a nutrient to cover, and counting it there
  // inflated the readout to "17 of 18 micronutrients barely covered".
  { key: "alc",    label: "Alcohol",       unit: "g",   dv: 0,    src: "label", goal: null, notMicro: true },
];

// One US standard drink = 14 g of pure ethanol (0.6 fl oz). 10 g in the UK and
// Australia — this constant is the only thing that would need changing.
const STD_DRINK_G = 14;
// Ethanol yields ~7 kcal/g. Used to split a day's calories into the part that
// can build tissue and the part that cannot.
const KCAL_PER_G_ALCOHOL = 7;

// The number that actually answers "did I eat enough today". Alcohol calories
// do not support tissue synthesis, so on a drinking day the headline total
// flatters the day badly — 9/05/2026 read 2,665 against a 2,650 target while
// supplying only 2,383 calories of food. Carbohydrate from beer and mixers IS
// food energy and stays counted; only the ethanol is removed.
function foodCalories(items) {
  return items.reduce((s, it) =>
    s + (Number(it.cal) || 0) - (Number(it.alc) || 0) * KCAL_PER_G_ALCOHOL, 0);
}

function standardDrinks(items) {
  return items.reduce((s, it) => s + (Number(it.alc) || 0), 0) / STD_DRINK_G;
}

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

/* Is the weight for THIS variant entered per dumbbell?

   ⚠️ This has to be per-variant, not per-exercise. Bench is Smith / Barbell /
   Dumbbell under one exercise: the first two are total bar weight and the third
   is per hand, and Strength Level quotes each the same way. A single
   `perHand: true` on the exercise mislabels two thirds of them.

   This is not cosmetic. On 2026-09-06 a Bulgarian split squat logged as "30"
   (two 15s) was scored against a per-dumbbell standard and came back Platinum 3
   instead of Silver 3 — a clean 2x inflation that then carried the whole Legs
   group and its movement-pattern slot, because the grace period had excluded
   the two other leg lifts.

   `perHand: true` still means every variant; an array names the ones it
   applies to.                                                               */
function isPerHand(ex, variant) {
  if (!ex || !ex.perHand) return false;
  if (ex.perHand === true) return true;
  return ex.perHand.includes(variant || (ex.variants && ex.variants[0]));
}

// Sub-label under the exercise name. Explicit `hint` wins; `perSide` is the
// legacy shorthand for "per side".
function exerciseHint(ex, variant) {
  const perHand = isPerHand(ex, variant);
  if (ex.hint) return perHand ? `${ex.hint} · weight per dumbbell` : ex.hint;
  if (perHand && ex.perSide) return "per side · weight per dumbbell";
  if (perHand)               return "weight per dumbbell";
  if (ex.perSide)            return "per side";
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
let openGroup       = null;   // Progress: which group tile is drilled into
let foodQuery      = "";
let foodDirty      = [];   // dates with local edits not yet accepted by Sheets
// What the SERVER held for a date the last time this device heard from it,
// keyed by date -> savedAt (""  means "the server had nothing for that date").
// This used to be inferred from the newest savedAt among local rows, which
// silently conflated "never synced this date" with "synced it while it was
// empty" — and the second case then wrote with no base at all, blowing away
// rows another writer had added since. A recorded fact beats a guess.
let syncedAt       = {};
// The earliest date the last successful fetch actually covered. Inside this
// window, "absent from syncedAt" is itself information — the server returned
// nothing for that date, so its baseline is "" (known-empty) rather than
// unknown. Without this, a date that was empty at fetch time and gained rows
// afterwards wrote with no base at all and silently replaced them.
let syncedFrom     = "";
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
    syncedAt   = JSON.parse(localStorage.getItem("ll_synced_at")   || "{}");
    syncedFrom = localStorage.getItem("ll_synced_from")            || "";
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
    localStorage.setItem("ll_synced_at",  JSON.stringify(syncedAt));
    localStorage.setItem("ll_synced_from", syncedFrom);
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

// Four tabs, split by what you are DOING rather than by data type. "Today" is
// everything you enter (workout, then body weight); "Progress" is everything
// you look back at (ranks, weight trend, past workouts). Food keeps its own tab
// — its search, picker and totals are too large to fold into Today without
// hurting both. The workout form stays the first thing on Today: that is the
// gym use case and it must stay one tap from launch.
const TAB_IDS = ["log", "food", "progress", "settings"];

function switchTab(name) {
  TAB_IDS.forEach(id => {
    document.getElementById(`tab-${id}`)?.classList.toggle("active", id === name);
    document.getElementById(`panel-${id}`)?.classList.toggle("active", id === name);
  });
  // Progress owns three views (cards / one group / the log) and renders
  // whichever is active itself. Today keeps the weight ENTRY field only.
  // Coming back to Progress starts at the six cards. The likely flow is
  // "log a set, then check progress", and landing inside a sub-page whose tab
  // is labelled "Progress" reads as being lost rather than as being remembered.
  if (name === "progress") { progressView = "main"; renderProgress(); }
  if (name === "settings") renderSettings();
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
  // A locked exercise always logs as that variant, so the "last session"
  // reference has to be that variant too — otherwise it would quote a partial-
  // ROM number as the target to beat.
  if (ex && ex.lockedVariant) return ex.lockedVariant;
  const fallback = ex && ex.variants ? ex.variants[0] : "";
  for (let i = 0; i < workouts.length; i++) {
    const logged = workouts[i].exercises.find(e => e.id === exId);
    if (logged && logged.variant) return logged.variant;
  }
  return fallback;
}

// Refresh the "Last: …" hint when the variant dropdown changes, so the target
// on screen is always the one for the variant actually selected.
/* The target, at the point of action. The milestone engine already knew the next
   division and what reaches it, but it only ever appeared on Progress — a page
   read on a laptop, not in the gym. Built here so the initial render and
   onVariantChange share one implementation and cannot drift. */
function goalLineHtml(ex, variant) {
  const em = exerciseMilestone(ex.id, variant);
  if (!em || em.kind !== "lift") return "";
  const body = em.unit === "reps"
    ? `Target: ${em.reps} reps → ${em.tier} ${em.division}`
    : `Target: ${fmtNum(em.weight)} ${isPerHand(ex, variant) ? "lb/hand" : "lb"} × ${em.reps} → ${em.tier} ${em.division}`;
  return `<div class="exercise-goal ${tierClass(em.tier)}">${esc(body)}</div>`;
}

function onVariantChange(exId) {
  const sel   = document.getElementById(`variant-${exId}`);
  const block = document.querySelector(`.exercise-block[data-exid="${exId}"]`);
  const label = block && block.querySelector(".prev-best");
  if (!sel || !label) return;
  const ex   = EXERCISES.find(e => e.id === exId);
  const best = getLastBest(exId, sel.value);
  label.textContent = best
    ? (ex.weighted ? `Last: ${best.weight ?? "–"}lb × ${best.reps}` : `Last: ${best.reps} reps`)
    : "First session";

  // Everything downstream of the variant has to move with it. The goal line and
  // the per-hand placeholder used to be baked in at first render, so switching
  // Dumbbell -> Barbell left a per-dumbbell prescription on screen for a
  // variant that has no standard — the same class as the split-squat 2x error,
  // printed on the gym-facing form.
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
  const best      = getLastBest(ex.id, variant);
  const prevText  = best
    ? (ex.weighted ? `Last: ${best.weight ?? "–"}lb × ${best.reps}` : `Last: ${best.reps} reps`)
    : "First session";

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
              value="${weight}" placeholder="${isPerHand(ex, document.getElementById(`variant-${exId}`)?.value) ? "lb/hand" : "lbs"}"
              aria-label="Weight, set ${n}${isPerHand(ex, document.getElementById(`variant-${exId}`)?.value) ? ", per dumbbell" : ""}"></td>`
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
                 || ex.lockedVariant || (ex.variants ? ex.variants[0] : "");
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

  // A conflict is not a failure to retry — retrying would overwrite the other
  // device. Pull the newer version down and tell the user, so they can see what
  // changed before deciding. Silently winning is the outcome worth avoiding.
  if (json.status === "conflict") {
    // Careful with the wording: fetchFromSheets() deliberately KEEPS local rows
    // for any date with unsaved edits, which is exactly the date that just
    // conflicted. So the refresh below updates everything else — it does not
    // pull this day. Saying "pulling the newer version" was a promise the code
    // does not keep, and it sent the user looking for changes that never arrived.
    showToast(`${json.message || "Changed elsewhere"} — your edits are still local, save again to keep them`, "error");

    // ⚠️ Without this the app can WEDGE, and did. fetchFromSheets() below keeps
    // local rows for any date with unsaved edits — which is always the date that
    // just conflicted — so the stale `_base` that caused the conflict is never
    // refreshed. Every retry then computes the same stale base and fails the
    // same way, forever, with no path out short of clearing site data.
    // Adopting the server's stamp makes the NEXT save a deliberate overwrite:
    // the user has been told what happened and has to press Save again, which
    // is the point at which "my edits win" is a choice rather than an accident.
    if (json.date && json.serverSavedAt) {
      syncedAt[json.date] = json.serverSavedAt;
      nutrition.forEach(n => { if (n.date === json.date) n.savedAt = json.serverSavedAt; });
      const w = workouts.find(x => x.date === json.date);
      if (w) w.savedAt = json.serverSavedAt;
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

// What this device last READ for a date — the base a write is made against.
// Undefined means "never synced this date", which the server treats as safe.
function baseSavedAt(kind, date) {
  if (kind === "workout") return workouts.find(w => w.date === date)?.savedAt;
  // The recorded baseline wins whenever we have one — including the empty
  // string, which is a real answer ("the server had no rows for this date")
  // and is what makes a date that has since GAINED rows conflict instead of
  // being silently overwritten. Only a date this device has genuinely never
  // heard about falls through to undefined, which the server treats as safe.
  if (Object.prototype.hasOwnProperty.call(syncedAt, date)) return syncedAt[date];
  // Covered by the last fetch but absent from it — the server had nothing.
  if (syncedFrom && date >= syncedFrom) return "";
  const rows = nutrition.filter(n => n.date === date && n.savedAt);
  return rows.length ? rows.map(n => n.savedAt).sort().pop() : undefined;
}

async function fetchFromSheets() {
  if (!sheetsUrl) return;
  setSyncStatus("pending", "Fetching…");
  let emptyWorkoutsGuarded = false;
  let dirtyKept = 0;
  const fetchSince = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
  try {
    // POST, not GET: a GET can only carry the secret as a query parameter,
    // where it ends up in Google's request logs and this browser's history.
    // text/plain keeps it a CORS "simple request" so there is no preflight —
    // Apps Script cannot set response headers and so cannot answer one.
    const res = await fetch(sheetsUrl, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      // `since` is explicit so the client KNOWS which dates the answer covers.
      // Relying on the server's default window left that boundary unknowable,
      // and an unknown boundary means an unknown write baseline.
      body:    JSON.stringify(sheetsSecret ? { _type: "fetch", since: fetchSince, _key: sheetsSecret }
                                           : { _type: "fetch", since: fetchSince }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message || "Unknown error");

    // Every other collection below is guarded; this one was not, and it is the
    // only one whose loss is unrecoverable. An empty, renamed or mid-edit
    // Workouts tab would replace all local history with [] and then persist the
    // wipe. Refuse to trade real local data for an empty remote one.
    if (Array.isArray(json.workouts)) {
      if (json.workouts.length || !workouts.length) {
        workouts = json.workouts;
      } else {
        emptyWorkoutsGuarded = true;
      }
    }
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

      // Record what the server holds for every date it just told us about —
      // BEFORE the dirty filter, because a dirty date's rows are skipped for
      // display but its baseline is exactly what the next save must write
      // against. Any local date the server returned nothing for is recorded as
      // "" — known-empty, not unknown.
      json.nutrition.forEach(it => {
        const s = String(it.savedAt || "");
        if (s > (syncedAt[it.date] || "")) syncedAt[it.date] = s;
      });
      const returned = new Set(json.nutrition.map(it => it.date));
      nutrition.forEach(it => { if (!returned.has(it.date)) syncedAt[it.date] = ""; });
      syncedFrom = fetchSince;

      nutrition = [...fromSheet, ...keptLocal];
      // Those days were deliberately NOT refreshed. Reporting a plain "Synced"
      // afterwards is the lie worth avoiding: the request succeeded, but the
      // data on screen for these dates is local and may not match the sheet.
      dirtyKept = [...dirty].filter(d => nutrition.some(n => n.date === d)).length;
    }
    persist();
    setSyncStatus(...(emptyWorkoutsGuarded
      ? ["error", "Sheet returned no workouts — kept local history"]
      : dirtyKept
        ? ["pending", `Synced — ${dirtyKept} day(s) with unsaved edits kept local`]
        : ["ok", "Synced"]));

    // Refresh whichever data tab is currently visible
    const activePanel = document.querySelector(".tab-panel.active")?.id;
    if (activePanel === "panel-progress") renderProgress();
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
    await postToSheets({ ...entry, _base: baseSavedAt("workout", entry.date) });

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
  // Rebuilt from current local state, never replayed from the queued copy.
  for (const entry of [...foodQueue])  await syncFoodToSheets(buildFoodEntry(entry.date));
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
  // The list only exists while the history sub-view is open — every other
  // caller is a refresh that should quietly do nothing.
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
  // Today has ONE date, at the top of the page. Weight used to carry a second
  // picker, which put two different dates on screen at once and let them
  // disagree — you could log a workout for Monday and a weight for Tuesday
  // without noticing.
  const date = currentLogDate;
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
function currentBodyweight(asOf) {
  const pool = asOf ? weightLog.filter(w => w.date <= asOf) : weightLog;
  if (!pool.length) return STD_REF_BW;
  const latest = pool.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  return Number(latest.weight) || STD_REF_BW;
}

// Epley. Linear in reps, fitted on 1-10 rep data — above ~12 the limiter stops
// being max force and becomes endurance, so the estimate spreads badly
// (15lb x 20: Epley 25.0, Brzycki 31.8). Anything over 12 reps is flagged.
function epley(weight, reps) {
  const w = Number(weight), r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || r < 1) return null;
  // A single rep IS the one-rep max — no estimation involved. Plain Epley
  // returns w * 31/30 at r=1, inflating a genuine 1RM by 3.3% and quietly
  // making the most accurate input the app can receive one of its least
  // accurate outputs.
  if (r === 1) return w;
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
/* `asOf` lets the whole chain be replayed at a past date, which is what the
   group progression chart needs. Threaded rather than reimplemented: a second
   copy of this aggregation would drift from the real one, and the whole point
   of a history chart is that it agrees with the number on the card. */
function bestSetsByVariant(exId, asOf) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return null;
  const byVariant = {};
  const sessions  = {};                 // variant -> distinct sessions logged
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

// Full rank for one exercise, peak preserved separately from the decayed value.
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

  // Rank the variant actually being trained now, not the flattering one.
  const best = byVariant[lastVariant];
  if (!best) return { ...base, ranked: false, reason: "no loaded sets" };

  const std = stdForExercise(ex, lastVariant);
  if (!std) return { ...base, ranked: false, reason: "no standards for this variant",
                     value: best.value, reps: best.reps };

  const pct  = percentileFor(best.value, std, bw);
  const peak = tierFromPct(pct);
  if (!peak) return { ...base, ranked: false, reason: "unrankable" };

  const { rung, lost, stale, unmeasured } = applyDecay(peak.rung, daysSince);

  // Other variants stay visible, so a stronger-but-stale variant does not
  // silently vanish when the training style changes.
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

// Kept for the call sites; see STALE for why it no longer demotes.
// The rank is preserved; only our confidence in it ages.
function applyDecay(rung, daysSince) {
  const d = daysSince == null ? 0 : daysSince;
  return { rung, lost: 0, stale: d > STALE.afterDays,
           unmeasured: d > STALE.provisionalDays, daysSince: d };
}

function allRanks(asOf) {
  return EXERCISES.map(ex => rankForExercise(ex.id, asOf)).filter(Boolean);
}

// Apply a tier ceiling to a rung. Never drops below CAP_FLOOR_TIER, and always
// reports what was earned so the display can show both.
/* ── MILESTONES ───────────────────────────────────────────────────────────
   The rank engine run backwards: given a tier you want, what lift gets you
   there. A badge tells you where you are; this tells you what to do about it.

   Inverted by BINARY SEARCH on percentileFor rather than by writing an inverse
   normal CDF. percentileFor is monotonic in `value`, 40 iterations resolve it
   past any precision the UI shows, and — the real reason — it reuses the
   forward function, so the two can never disagree. A separate closed-form
   inverse would be a second implementation of the same curve, free to drift.  */
function valueForPercentile(std, bw, targetPct) {
  if (!std || !(targetPct > 0)) return null;
  let lo = 0.01, hi = 10000;
  if (percentileFor(hi, std, bw) < targetPct) return null;   // off the top
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (percentileFor(mid, std, bw) < targetPct) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* The next rung boundary ABOVE `rung`, at division granularity.

   A whole-tier target was too far to be useful: Back's read "Lat Pulldown:
   123 lb x 8" against a current 85 — a 45% jump, which is a year's work, not a
   next session. Divisions are thirds of a tier, so the same formula gives a
   target roughly a third the size.

   It also needs no special case at the top of a tier: divisions run 3 -> 1
   bottom to top, so from Silver 1 the next third IS Gold 3, and the arithmetic
   produces that on its own. */
function nextRungStep(rung) {
  // EPS matters. A third is not representable in binary: the exact boundary
  // 1.3333... reads back as frac 0.33333, and 0.33333 * 3 floors to 0, so
  // rungToTier called it Silver 3 — the division it just left. The target then
  // rendered as "Silver 2 -> Silver 2", and Arms as "Gold 2 -> Gold 2".
  // Nudging inside the next division costs nothing and removes the whole class.
  /* Nudge the OUTPUT only. An input-side epsilon rounds any rung within ~3e-10
     below a boundary up a slot, so rungToTier and this disagreed and a division
     got skipped — and at the top, Champion 2 produced 6.000000001 and reported
     "top tier reached" with the milestone gone. Deriving the slot the way
     rungToTier does keeps the two in step. */
  const c = Math.max(0, Math.min(TIERS.length - 0.001, rung));
  const i = Math.floor(c);
  return (i * 3 + Math.floor((c - i) * 3) + 1) / 3 + 1e-9;
}

// A rung expressed as a percentile, so it can be fed back through the inverse.
function rungToPercentile(rung) {
  const i = Math.min(TIERS.length - 1, Math.max(0, Math.floor(rung)));
  const f = Math.min(0.999999, Math.max(0, rung - i));
  return TIERS[i].lo + f * (TIERS[i].hi - TIERS[i].lo);
}

// An e1RM turned back into something you can actually load on a bar. Reps are
// held at whatever you last did on the lift, because "95 lb x 8" is a
// prescription and "e1RM 107" is a statistic.
function prescribe(ex, targetValue, reps) {
  if (targetValue == null) return null;
  // AMRAP/bodyweight lifts are measured IN reps, so the rep count is the target.
  if (!ex.weighted) return { reps: Math.ceil(targetValue) };
  /* Weighted lifts inherit your last rep count — but capped at 12. Past that
     Epley and Brzycki diverge by ~27%, which is why the app flags those e1RMs
     as low confidence in the first place. Prescribing "23 lb x 20" would tell
     you to keep making the measurement the app cannot trust. Fewer reps at more
     weight hits the same e1RM and is a better set. */
  const r = Math.min(reps || 8, 12);
  // Epley inverted; the 1-rep case is exact by definition (see epley()).
  const w = r === 1 ? targetValue : targetValue / (1 + r / 30);
  // Round up to the next 2.5 lb — you cannot load 93.7.
  return { weight: Math.ceil(w / 2.5) * 2.5, reps: r };
}

// What this ONE lift needs to reach its next tier.
function exerciseMilestone(exId, variant) {
  const r = rankForExercise(exId);
  // A milestone for a variant you are not doing is worse than none: the log
  // form asked for "18 lb/hand" after switching to Barbell, which is a
  // different convention AND a variant with no standard at all.
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

/* What the GROUP needs. Three distinct answers, and which one you get matters
   more than the number:
     capped      no lift will move this — the ceiling is the constraint
     establish   a lift is one session short of counting toward the group
     lift        train this specific movement to this specific number          */
function groupMilestone(group) {
  const gr = groupRank(group);
  if (!gr) return null;

  const targetRung = nextRungStep(gr.rung);
  if (targetRung >= TIERS.length) return { kind: "maxed" };
  const nextT = rungToTier(targetRung);

  // A capped group cannot be lifted out of it. Saying "bench 150" here would be
  // a lie: you could hit it and the tile would not move.
  // Not "is it capped" but "is the next tier ABOVE the ceiling". A group sitting
  // exactly at its ceiling is not flagged capped, yet no amount of lifting moves
  // it either — checking the flag alone would prescribe a lift that does nothing.
  // Compared against the ceiling's TOP, not its index: a division step inside
  // the ceiling tier is still reachable, only steps past it are not.
  if (targetRung > gr.capIndex + 0.999) {
    return { kind: "capped", reason: gr.capReason || gr.ceilingReason,
             tier: nextT.tier, division: nextT.division };
  }

  const ranks = allRanks().filter(r => r.group === group && r.ranked);
  const est   = ranks.filter(r => (r.sessions || 0) >= GRACE_SESSIONS);
  const pool  = est.length ? est : ranks;

  // One more session promotes a pending lift into the group score, which can
  // move the tile without adding a pound. Surface it when it is the cheaper win.
  const pendingAll = ranks.filter(r => (r.sessions || 0) < GRACE_SESSIONS);

  const wsum   = pool.reduce((s, r) => s + r.weight, 0);
  const needed = (targetRung - gr.rung) * wsum;

  /* Which lift to name. A heavier-weighted lift needs a smaller RUNG gain, but
     rungs are not equally hard to buy: low on the curve a rung is a few pounds,
     high on it a rung is many. Picking by weight alone told this log to take
     dumbbell rows from 15 lb to 35 — a 2.3x jump — when 10 lb on the pulldown
     did the same work. So cost out every candidate and take the smallest
     RELATIVE increase, which is the honest answer to "what is easiest". */
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
  // Only offer "or log X again" when X is a DIFFERENT lift. Naming the same one
  // twice produced "Lat Pulldown: 123 lb x 8 — or log Lat Pulldown once more",
  // which reads as two options and is one.
  const pending = pendingAll.find(r => r.id !== best.id);
  return { kind: "lift", id: best.id, name: best.name, variant: best.variant,
           tier: nextT.tier, division: nextT.division,
           fromTier: gr.tier, fromDivision: gr.division,
           unit: best.unit, from: best.value, to: target, gain,
           fromReps: best.reps, fromWeight: best.bestWeight,
           pending: pending ? pending.name : null,
           ...prescribe(ex, target, best.reps) };
}

// One line, ready to render.
// The gap, not just the target. "21 / 23 · 2 more reps" beats "23 reps" — the
// second makes you do the subtraction to find the motivating number.
function milestoneDelta(m) {
  if (!m || m.kind !== "lift" || m.from == null) return "";
  if (m.unit === "reps") {
    const d = Math.ceil(m.to) - Math.round(m.from);
    return d > 0 ? `${d} more rep${d === 1 ? "" : "s"}` : "within reach";
  }
  /* A "+X lb" delta is only meaningful against the SAME rep count. This used to
     back-compute the from-weight as `from / (1 + reps/30)` using the PRESCRIBED
     reps — but `prescribe` caps those at 12, so for any high-rep history the
     anchor was a weight never lifted, and the gap always understated, always in
     the flattering direction: leg press read "+3 lb" when the honest figure was
     +7.5. When the rep counts differ, say so instead of inventing a number. */
  if (m.fromWeight == null || m.fromReps == null) return "";
  if (m.fromReps !== m.reps) return `was ${fmtNum(m.fromWeight)} × ${m.fromReps}`;
  const d = m.weight - m.fromWeight;
  return d > 0 ? `+${fmtNum(Math.round(d * 2) / 2)} lb` : "within reach";
}

function milestoneText(m) {
  if (!m) return "";
  if (m.kind === "maxed")      return "Top tier reached";
  if (m.kind === "outOfReach") return "Beyond the standards table";
  if (m.kind === "capped")     return `At ceiling — ${m.reason}`;
  if (m.kind === "establish")  return `Log ${m.name} once more to count it`;
  if (m.unit === "reps") return `${m.name}: ${m.reps} reps`;
  // The prescription needs the same per-hand marker the INPUT got. Leaving it
  // off is the ambiguity that produced a 2x wrong rank on 2026-09-06 — and this
  // is the number that gets carried to the gym.
  const ex   = EXERCISES.find(e => e.id === m.id);
  const unit = ex && isPerHand(ex, m.variant) ? "lb/hand" : "lb";
  return `${m.name}: ${fmtNum(m.weight)} ${unit} × ${m.reps}`;
}

function applyCap(rung, capTierIndex, reason) {
  const ceiling = Math.max(capTierIndex, CAP_FLOOR_TIER) + 0.999;
  if (rung <= ceiling) return { rung, capped: false, earnedRung: rung };
  return { rung: ceiling, capped: true, reason, earnedRung: rung };
}

// Breadth across the five movement patterns. This is the headline, and it is
// deliberately a CHECKLIST rather than a score: "4/5 · vertical pull untrained
// · unlocks Champion" tells you what to do, where "Bronze 2" only told you how
// you were doing. Same underlying slot logic the old overall rank used.
function trainingBreadth(asOf, precomputed) {
  // groupRank already has this; recomputing doubled the cost of every render
  // (269 allRanks calls for one group-detail view on a 420-workout log).
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
    // Only worth showing when training one more pattern actually raises the
    // ceiling — at 0-2 patterns it does not, and saying so would be noise.
    unlocks:   next != null && next > capIndex ? TIERS[next].name : null,
  };
}

// Group score: weighted mean of rungs (compound 1.0 / machine 0.75 /
// isolation 0.5), then capped. See BREADTH above for why caps rather than a
// blended average, and why the weights alone were not enough.
function groupRank(group, asOf) {
  const allR = allRanks(asOf);
  const all  = allR.filter(r => r.group === group && r.ranked);
  if (!all.length) return null;

  /* New-lift grace, ASYMMETRIC. The rule exists so a bad first attempt cannot
     drag a group down — you are bad at a lift the first time. But a symmetric
     version also blocks good first attempts from lifting it, and that is worse:
     on 2026-09-06 the owner's best session ever logged a Silver 1 lat pulldown
     and a Silver 1 seated row, and Back kept showing a rank derived entirely
     from a 12th-percentile dumbbell row because the two new lifts had one
     session each. Training hard and having the number go nowhere is the exact
     failure this ladder cannot afford.

     So: a new lift counts immediately if it would RAISE the group, and waits
     for its second session only if it would lower it. */
  const established = all.filter(r => (r.sessions || 0) >= GRACE_SESSIONS);
  let rs, provisional = false;
  if (!established.length) {
    rs = all; provisional = true;          // nothing settled yet — show it, caveated
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

  // Lowest ceiling wins, and the reason travels with it.
  const caps = [{ index: breadth.capIndex,
                  reason: `${breadth.trained}/${breadth.total} movement patterns` }];
  if (isolationOnly) caps.push({ index: ISOLATION_CAP_TIER, reason: "isolation lifts only" });
  // When two ceilings tie, both are true and both are actionable — naming only
  // whichever happened to be first in the array would send you to fix one
  // constraint and leave the other still holding you at the same tier.
  const lowest   = Math.min(...caps.map(c => c.index));
  const reason   = caps.filter(c => c.index === lowest).map(c => c.reason).join(" + ");
  const capped   = applyCap(earned, lowest, reason);
  // The ceiling tier index, exposed so milestones can tell "one more rep gets
  // you there" apart from "no rep will, the ceiling is the constraint".
  const capIndex = Math.max(lowest, CAP_FLOOR_TIER);

  return { group, ...rungToTier(capped.rung), count: rs.length, daysSince: days,
           isolationOnly, thin: rs.length === 1, provisional,
           // Only lifts actually HELD BACK — an unestablished lift that already
           // counts (because it raised the group) is not pending anything.
           pending: all.length - rs.length,
           stale: rs.some(r => r.stale), unmeasured: rs.every(r => r.unmeasured),
           // Carried up from the cards: a tile reading "Platinum 3" off a
           // 20-rep Epley estimate is the least trustworthy number on the page
           // and must not look like the most confident one.
           lowConfidence: rs.some(r => r.confidence && r.confidence !== "high"),
           // Strictly >12 reps — the app's own Epley cutoff. `lowConfidence`
           // above also catches "med" (11-12), which is fine for a "~" hint but
           // made every point on every chart hollow.
           veryLowConfidence: rs.some(r => r.confidence === "low"),
           capped: capped.capped, capReason: capped.reason, capIndex,
           // Why the ceiling is where it is, whether or not it currently binds.
           // capReason only exists once earned EXCEEDS the ceiling; a group
           // sitting just under it still needs to explain the wall ahead.
           ceilingReason: reason,
           earned: rungToTier(capped.earnedRung) };
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
  const days = [...new Set(workouts.map(w => w.date))].sort((a, b) => b.localeCompare(a));
  if (!days.length) return { count: 0, forgiven: false };

  let forgiven = false;
  // A gap ends the streak unless it is the FIRST gap and under a fortnight.
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
      const logged = w.exercises.find(e => e.id === exId);
      if (!logged) return null;
      // Unlabelled history resolves to the DEFAULT variant, exactly as
      // bestSetsByVariant does. Previously an unlabelled set matched EVERY
      // variant, so the Full ROM chart silently absorbed partial-ROM history:
      // 9/04/2026's 25 partial reps became the "previous" value for a 21-rep
      // full-ROM set and the card reported a 4-rep regression that never
      // happened — the exact inflation variants exist to prevent.
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

/* ── PROGRESS ─────────────────────────────────────────────────────────────
   Three views in one panel, because the page answers three questions and only
   one at a time: the six groups ("how am I doing"), one group's exercises
   ("why"), and the log ("what did I actually do"). Past workouts and weigh-ins
   used to sit inline underneath everything, which pushed the six cards — the
   actual point of the page — into a minority of the scroll.                  */
let progressView = "main";     // "main" | "group" | "history"

function showProgressView(view, group, fromPop) {
  progressView = view;
  if (group !== undefined) openGroup = group;
  renderProgress();

  /* Android's back gesture and iOS's back-swipe would otherwise leave a
     three-level hierarchy by exiting the app. One entry per view is enough —
     `fromPop` stops the popstate handler pushing the state it just restored. */
  if (!fromPop) {
    const st = { progressView: view, openGroup };
    if (view === "main") history.replaceState(st, "");
    else                 history.pushState(st, "");
  }

  document.getElementById("panel-progress")?.scrollIntoView({ block: "start" });
  // Focus follows the view, or a keyboard user lands on body and the way back
  // is seven tab stops away. Screen readers get the change announced by the
  // aria-live region on the panel.
  if (view !== "main") {
    // setTimeout, not requestAnimationFrame: rAF is throttled to zero in a
    // hidden or backgrounded tab, so focus would silently never move.
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

// ── six cards, the whole page ─────────────────────────────────────────────
function renderGroupCards() {
  const cards = GROUPS.map(g => {
    const gr = groupRank(g);
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
    // A capped group's rung IS its ceiling, so the raw fraction is ~1 — a full
    // bar, which universally reads as "about to level up" and means the exact
    // opposite here. Show it full but visibly inert, and name what was earned.
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

/* ── group progression over time ──────────────────────────────────────────
   Replays groupRank at every date the group was trained.

   Plots EARNED rung, not shown: decay is a motivational house rule, and
   including it would draw phantom losses across an untrained gap — a chart
   showing you getting weaker while you simply were not in the gym is worse
   than no chart. Caps are excluded for the same reason: they are a statement
   about breadth, not about strength over time.                              */
function groupSeries(group) {
  const ids   = new Set(EXERCISES.filter(e => e.group === group).map(e => e.id));
  const dates = workouts
    .filter(w => w.exercises.some(e => ids.has(e.id)))
    .map(w => w.date).sort();
  const seen = new Set();
  return dates.filter(d => !seen.has(d) && seen.add(d)).map(date => {
    const gr = groupRank(group, date);
    // Carry confidence per point. A group whose score rests on a 20-rep set is
    // an extrapolation, and switching to honest working sets then draws a
    // DECLINE that never happened — Arms reads "Platinum 3 -> Gold 2" purely
    // because the measurement improved. Marking the soft points is the least
    // this chart owes you.
    // `confidence === "low"` is >12 reps, the app's own documented Epley cutoff
    // and what the caption promises. `!== "high"` also caught "med" at 11-12
    // reps, which made every point on every chart hollow — a marker that is
    // always on carries no information.
    return gr ? { date, value: gr.earned.rung, soft: !!gr.veryLowConfidence } : null;
  }).filter(Boolean);
}

/* A rung series wants tier gridlines, not a bare sparkline — "1.9" means
   nothing, "Silver" does.

   The tier labels are HTML, not SVG <text>, and that is the whole trick. An
   SVG with a fixed viewBox scales its text with the container, so one font-size
   cannot be right at two widths: at viewBox 600 the labels rendered 5.8px on a
   phone and ~15px on a laptop — inversely to where they were needed, and larger
   than the caption beneath them. Positioning them as absolutely-placed spans
   gives real CSS pixels at every width. */
function rungChart(series) {
  if (series.length < 2) return "";
  const W = 600, H = 180, PT = 12, PB = 12;
  const vals = series.map(s => s.value);
  const lo = Math.max(0, Math.floor(Math.min(...vals) * 3) / 3 - 0.34);
  const hi = Math.min(TIERS.length, Math.ceil(Math.max(...vals) * 3) / 3 + 0.34);
  const span = hi - lo || 1;
  const x = i => (i / (series.length - 1)) * W;
  const yFrac = v => 1 - (v - lo) / span;                      // 0 top, 1 bottom
  const y = v => PT + yFrac(v) * (H - PT - PB);

  // At least one label, always: a series sitting entirely inside the top tier
  // used to produce ceil(lo) === hi and draw no axis at all.
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

/* ── one group, in detail ─────────────────────────────────────────────────
   Answers "why am I this rank" and "what moves it". Deliberately ordered:
   the milestone comes FIRST, because it is the only part you can act on.    */
function groupDetailHtml(group) {
  const gr = groupRank(group);
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
  // Which lifts the group score actually used — mirrors groupRank's asymmetric
  // grace so the table cannot claim a lift is excluded when it is not.
  const est = ranks.filter(r => r.ranked && (r.sessions || 0) >= GRACE_SESSIONS);
  const emean = est.length
    ? est.reduce((t, r) => t + r.rung * r.weight, 0) / est.reduce((t, r) => t + r.weight, 0)
    : null;
  const counted = new Set(ranks.filter(r => r.ranked &&
    ((r.sessions || 0) >= GRACE_SESSIONS || (emean !== null && r.rung > emean))).map(r => r.id));
  const rows = ranks.sort((a, b) => (b.ranked ? b.rung : -1) - (a.ranked ? a.rung : -1)).map(r => {
    const counts = (r.sessions || 0) >= GRACE_SESSIONS;
    // Position WITHIN the current tier, matching the card bar. These two bars
    // look identical, so they must not silently encode different scales.
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
          // Per-lift target, at the same division granularity as the group's.
          const em = r.ranked ? exerciseMilestone(r.id) : null;
          if (!em || em.kind !== "lift") return "";
          const d = milestoneDelta(em);
          // The tier class goes on the <b>, not the row: --tier is inherited, and
          // a class on .ex-row would resolve to the row's CURRENT tier, painting
          // the next tier's name in the colour of the one it is leaving.
          return `<span class="exr-next">Next <b class="${tierClass(em.tier)}">${em.tier} ${em.division}</b>: ${
            em.unit === "reps" ? `${em.reps} reps` : `${fmtNum(em.weight)} ${
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

  // Progression for the group's strongest ranked lift — the one carrying it.
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
      // What that session was actually worth, so you can see which ones moved you.
      const v  = ex ? setValue(ex, best) : null;
      const st = ex ? stdForExercise(ex, e.variant || (ex.variants && ex.variants[0])) : null;
      const pc = v != null && st ? percentileFor(v, st, currentBodyweight()) : null;
      const tf = pc != null ? tierFromPct(pc) : null;
      recent.push(`
        <div class="act-row">
          <span class="act-date">${formatDate(w.date)}</span>
          <span class="act-name">${esc(ex ? ex.name : e.id)}</span>
          <span class="act-set">${ex && ex.weighted && best.weight ? `${fmtNum(best.weight)} × ${best.reps}` : `${best.reps} reps`}</span>
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
            bodyweight, so this measures strength <em>per pound</em>. Untrained groups slip after
            ${STALE.afterDays} days are marked as unmeasured — the rank is held, not lowered,
            because not training is not the same as getting weaker.</p>
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

// ── FOOD IMPORT: paste a block captured on the phone ──────────────────────
/* The gap this closes: a label read in a shop, or a plate estimated in a
   cafeteria, used to have to survive in a chat until Patrick was back at the
   Mac. The Apps Script URL lives only in this app's localStorage — per device,
   never on disk, never in chat — so the app is the only thing on the phone that
   can write to the sheet. Claude estimates; the app records.

   TWO BLOCK TYPES, and the distinction is load-bearing:

     FOOD  → a row in the Foods database.  A label was READ.
     ITEM  → one entry in today's log.     A meal was ESTIMATED.

   They are separate types precisely so an estimate cannot become a database
   row. `Verified` exists to quarantine guessed numbers; if a plate photo could
   emit a FOOD block, the column would stop meaning anything and the database
   would refill with exactly the values it was built to keep out. Same rule as
   addCustomFood(): nothing auto-promotes.

   The wire format is `key: value` lines rather than JSON because a model emits
   it reliably, it survives a phone's copy-paste, it is order-independent, and
   an ABSENT LINE MEANS UNKNOWN rather than a parse error — which is what keeps
   blank distinguishable from zero all the way into the sheet. A label listing
   11 of the 25 nutrients must not write 14 zeros. */

const IMPORT_DRAFT_KEY = "ll_import_draft";
let importParsed = null;

/* Spelled-out names a model reaches for, mapped onto the sheet's short keys.
   Normalisation strips everything but a-z0-9 first, so "Sat. Fat", "sat fat"
   and "SaturatedFat" all arrive here as one string. */
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

/* Absent, blank and "n/a" all mean UNKNOWN, and all return null. A real 0 --
   0g trans fat is a fact a label states -- must survive as 0. */
function importNum(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["-", "—", "–", "n/a", "na", "null", "none", "unknown", "?", "tbd"].includes(s)) return null;

  // "<1 g". FDA rounding puts the true value somewhere in [0,1), so record the
  // midpoint: 0 understates a real amount, 1 overstates it. Flagged in review
  // so the guess is visible rather than laundered into a clean-looking number.
  const lt = s.match(/^<\s*([\d.]+)/);
  if (lt) { const n = Number(lt[1]); return Number.isFinite(n) ? n / 2 : null; }

  const m = s.replace(/,/g, "").match(/-?\d*\.?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/* Key normalisation, shared by both block types. An ITEM's key used to be
   trimmed only, so `key: Kirkland-Protein-Bar` stored verbatim matched no Foods
   row — the row LOOKED linked and behaved unlinked, which silently excluded it
   from scanDrift()/refreshDay() forever. Same slug on both paths or neither. */
function normImportSlug(raw) {
  return String(raw || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/* Tri-state, and the third state is the point: "" means the block did not say.
   An unstated value must stay unstated all the way to the payload, or a partial
   update overwrites a label-verified row with a fabricated default. */
function importVerified(raw) {
  const str = String(raw ?? "").trim();
  if (!str) return "";
  return /^(y|yes|true|1)$/i.test(str) ? "yes" : "no";
}

/* A stable key so the same product re-imported later UPDATES its row instead of
   appending a second one. Brand is prefixed only when the name doesn't already
   carry it, so "Olipop" + "Olipop Cherry" doesn't become olipop-olipop-cherry. */
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

/* Tolerant by design: the realistic paste is a whole chat reply, fences and
   prose included. Anything outside a FOOD/ITEM block is ignored rather than
   treated as an error, so "RUNNING TOTAL:" lines and commentary cost nothing. */
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
    // NOT defaulted. "1 serving" used to be substituted here, and because the
    // payload sent `serving` unconditionally, a partial block then overwrote a
    // real "1 can (355 mL)" with a fabrication. Absent means absent.
    serving: String(f.serving || "").trim(),
    // "" when the block is silent. The review chip cycles yes/no/unstated so a
    // yes is still a visible assertion, never something the parser decided.
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
    // An ITEM came from a photo or a description, so it is an estimate unless
    // the block says a label was read for it. Either way it stays in the log
    // and never reaches the Foods tab.
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

// ── FOOD IMPORT: screen ───────────────────────────────────────────────────

function toggleFoodImport(open) {
  const el = document.getElementById("food-import");
  if (!el) return;
  el.hidden = !open;
  if (!open) return;
  toggleCustomFood(false);
  const ta = document.getElementById("fi-text");
  if (ta) {
    // A phone in a shop loses signal and reloads. The draft is the paste, and
    // losing it means walking back to the shelf.
    if (!ta.value) { try { ta.value = localStorage.getItem(IMPORT_DRAFT_KEY) || ""; } catch (e) {} }
    ta.focus();
    if (ta.value) reviewImport();
  }
}

function onImportInput(v) {
  try { localStorage.setItem(IMPORT_DRAFT_KEY, v); } catch (e) {}
}

function clearImportDraft() {
  const ta = document.getElementById("fi-text");
  if (ta) ta.value = "";
  try { localStorage.removeItem(IMPORT_DRAFT_KEY); } catch (e) {}
}

function reviewImport() {
  const ta = document.getElementById("fi-text");
  importParsed = parseFoodBlocks(ta ? ta.value : "");
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

/* Cycles unstated -> yes -> no -> unstated. Unstated has to be reachable: it is
   the only value that preserves whatever the sheet already holds. */
function toggleImportVerified(i) {
  const row = importParsed?.foods?.[i];
  if (!row) return;
  row.verified = row.verified === "" ? "yes" : row.verified === "yes" ? "no" : "";
  renderImportReview();
}

/* Rows are addressed positionally, the same way the food picker does it, so
   nothing a model wrote is ever interpolated into an inline handler. */
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
  if (!importParsed) return;
  const rows = importParsed.foods.filter(r => r._pick);
  if (!rows.length) { showToast("Nothing selected"); return; }
  if (!sheetsUrl) {
    showToast("This browser isn't connected to your sheet — paste the URL in Settings");
    return;
  }

  /* Unknowns are OMITTED, not sent as null. The upsert leaves a cell alone for
     any field the payload doesn't carry, so a label listing 11 of 25 nutrients
     updates those 11 and preserves whatever the row already had for the rest.
     Sending null would overwrite real values with blanks. */
  const payload = rows.map(r => {
    const exists = foods.some(x => x.key === r.key);
    const out = { key: r.key, name: r.name };
    if (r.brand)    out.brand    = r.brand;
    if (r.microSrc) out.microSrc = r.microSrc;
    /* `serving` and `verified` are omitted when the block didn't state them, so
       the upsert preserves what the row already had. They used to be sent
       unconditionally against parser-supplied defaults, which meant a partial
       block — a designed-for case — replaced a real serving with "1 serving"
       and demoted Verified yes → no. The 24 nutrients survived, so the row kept
       its numbers and lost the two fields saying what the numbers are per and
       whether a human read a label. */
    if (r.serving)  out.serving  = r.serving;
    if (r.verified) out.verified = r.verified;
    else if (!exists) out.verified = "no";   // nothing to preserve on a new row
    FOOD_MACROS.forEach(k => { if (r[k] !== null) out[k] = r[k]; });
    return out;
  });

  /* Only the network call is guarded. The try used to wrap everything after it
     too, so a throw in the bookkeeping — discarding the paste mid-flight nulls
     `importParsed` — reported "Couldn't save" over a write that had already
     landed, inviting a duplicate re-do. This file's history is the inverse lie
     ("says synced but isn't"); a false failure is worth closing too. */
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
  // Pull the canonical rows back so the picker has them immediately and the
  // app's copy matches what the sheet actually stored.
  await fetchFromSheets();
  renderFoodTab();
}

function commitImportItems() {
  if (!importParsed) return;
  const rows = importParsed.items.filter(r => r._pick);
  if (!rows.length) { showToast("Nothing selected"); return; }

  rows.forEach(r => {
    const item = { id: newFoodId(), date: currentFoodDate, meal: r.meal, key: r.key || "",
                   name: r.name, qty: r.qty, source: r.source, conf: r.conf };
    /* Through nutVal like every other mutation path. Writing r[k] raw made this
       the ONLY way a core macro could land as null on a logged row — and the
       floor marker and coverage readout cover micros only, so an omitted `fib`
       rendered as a confident, wrong day total with nothing marking it. */
    FOOD_MACROS.forEach(k => { item[k] = nutVal(r[k], k); });
    nutrition.push(item);
  });
  markFoodDirty(currentFoodDate);
  persist();

  importParsed.items = importParsed.items.filter(r => !r._pick);
  if (!importParsed.foods.length && !importParsed.items.length) clearImportDraft();
  renderImportReview();
  renderFoodTab();
  /* Deliberately NOT auto-saving. Save Day owns the write and its conflict
     baseline; an import that synced on its own would bypass that and could
     overwrite a day edited on another device. */
  showToast(`${rows.length} added to ${currentFoodDate} — press Save Day`);
}

// ── FOOD: save + sync ─────────────────────────────────────────────────────

// The payload for a date, built from CURRENT local state. Retry must rebuild
// rather than replay: the queue used to hold a frozen snapshot, so a retry
// after further edits wrote the stale version, succeeded, and cleared the dirty
// flag — leaving the sheet missing the newer items while the app said saved.
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

// The way out when a day is stuck. A dirty date is deliberately shielded from
// fetches so an in-progress meal can't be wiped by a background refresh — but
// that shield is also what stops a bad local copy from ever being replaced.
// This drops the shield for one date, on purpose, with a confirm.
async function discardLocalDay(date) {
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

async function saveFoodDay() {
  const items = foodItemsFor(currentFoodDate);
  // An empty day is worth saving if it used to have items — that's how you
  // clear a mistaken day from the sheet.
  if (!items.length && !foodDirty.includes(currentFoodDate)) {
    showToast("Nothing to save");
    return;
  }

  const entry = buildFoodEntry(currentFoodDate);

  if (!sheetsUrl) {
    showToast("Saved on this device — Sheets not connected");
    return;
  }
  // Awaited on purpose. Firing this off and immediately reporting success told
  // the user the day was saved while the request was still in flight — and kept
  // saying it when the write came back rejected.
  const ok = await syncFoodToSheets(entry);
  if (ok) showToast(`Saved ${items.length} item(s) ✓`);
}

async function syncFoodToSheets(entry) {
  if (!sheetsUrl) return false;
  setSyncStatus("pending", "Syncing…");
  let ok = false;
  try {
    await postToSheets({ ...entry, _base: baseSavedAt("food", entry.date) });

    // The server stamps every row of the day with `entry.savedAt`. Local rows
    // must carry the same stamp or the NEXT save of this day computes `_base`
    // from whatever the last FETCH left behind — an older value — and the
    // server correctly rejects it as stale. That is a self-inflicted conflict:
    // the "other device" is this device, one save ago. Workouts never hit it
    // because a workout entry is stored whole, savedAt included; food rows are
    // item-level and only ever got a stamp on the way IN from a fetch.
    nutrition.forEach(n => { if (n.date === entry.date) n.savedAt = entry.savedAt; });
    syncedAt[entry.date] = entry.savedAt;

    setSyncStatus("ok", "Synced");
    foodQueue = foodQueue.filter(q => q.date !== entry.date);
    foodDirty = foodDirty.filter(d => d !== entry.date);  // Sheets has it now
    ok = true;
  } catch (err) {
    console.error("Food sync failed:", err);
    setSyncStatus("error", "Sync failed — queued");
    foodQueue = foodQueue.filter(q => q.date !== entry.date);
    foodQueue.push({ date: entry.date });
  }
  persist();
  updateQueueStatus();
  renderFoodTab();
  return ok;
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

// Standard drinks over the 7 days ending on `date`. Alcohol is meaningless as a
// daily number and meaningful as a weekly one: the common clinical threshold for
// men is 14/week, and a single heavy night reads very differently depending on
// what the rest of the week looked like.
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

  // Judge the day on FOOD calories. On a dry day these are identical, so
  // nothing changes; on a drinking day the raw total flatters the day badly and
  // has already hidden one miss (9/05/2026 read 2,665 against a 2,650 target on
  // 2,384 calories of food).
  const fcal     = foodCalories(items);
  const drinks   = standardDrinks(items);
  const rem      = FOOD_TARGETS.cal - fcal;
  const pct      = Math.min(100, (fcal / FOOD_TARGETS.cal) * 100);
  const floorPct = (FOOD_TARGETS.calFloor / FOOD_TARGETS.cal) * 100;
  const calState = paceState(fcal, FOOD_TARGETS.cal, isToday);

  const proteinState = t.p >= FOOD_TARGETS.proteinMin ? "ok"
                     : paceState(t.p, FOOD_TARGETS.proteinMin, isToday);
  const proteinLeft  = Math.max(0, FOOD_TARGETS.proteinMin - t.p);

  const remLabel = rem > 0 ? `${fmtNum(rem)} to go` : `${fmtNum(-rem)} over`;
  const unsaved  = foodDirty.includes(currentFoodDate)
    ? `<span class="food-unsaved">Unsaved — press Save Day</span>
       <button class="btn btn-ghost btn-sm" onclick="discardLocalDay()"
               title="Throw away this device's unsaved changes for this day and take the sheet's version">Discard &amp; reload</button>` : "";

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
          <span class="ft-num ft-${calState}">${fmtNum(fcal)}</span>
          <span class="ft-unit">cal${drinks > 0 ? " of food" : ""}</span>
          <span class="ft-sub">${remLabel} · ${drinks > 0
            ? `${fmtNum(t.cal)} with alcohol`
            : `target ${fmtNum(FOOD_TARGETS.cal)}`}</span>
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

// Track everything, display by exception. Only nutrients that are actually off
// target surface; the rest stay folded away so the tab stays readable.
function renderMicroSummary(items, t, isToday) {
  const micros = NUTRIENTS.filter(n => !n.core && !n.notMicro);
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
  // The review panel names the destination date, and commitImportItems reads
  // currentFoodDate live — so without this the label said 09-11 while the tap
  // wrote to 09-12, in the one part of this app where the date is the point.
  renderImportReview();
});

document.getElementById("food-search").addEventListener("input", e => {
  onFoodSearch(e.target.value);
});

// Fetch latest data from Sheets in the background — app is usable immediately
// from localStorage cache while the request completes.
if (sheetsUrl) fetchFromSheets();
else setSyncStatus("", "");