# Lift Log — project instructions

Mobile-first static web app for workout, bodyweight and food logging, syncing to a Google Sheet via
a self-deployed Apps Script web app. **Public repo**, deployed by GitHub Pages from `main`.

## Architecture
- **No build step, no framework, no backend, no dependencies.** Plain HTML/CSS/JS:
  `index.html`, `styles/style.css`, `scripts/app.js`.
- **Data lives client-side** in `localStorage` (`ll_workouts`, `ll_weight`, `ll_foods`,
  `ll_nutrition`, `ll_queue`, `ll_food_queue`, `ll_food_dirty`, `ll_drafts`, `ll_sheets_url`,
  `ll_sheets_secret`). **The repo must never contain the deployment URL, the secret, or any
  personal data** — the food database seed lives in the owner's private notes repo, not here.
- **Write path**: POST as `text/plain` JSON (avoids the CORS preflight Apps Script can't answer).
  All writes go through `postToSheets()`, which attaches the optional secret — don't call `fetch`
  against `sheetsUrl` directly.
- **Read path**: `doGet` returns workouts, weight, foods and nutrition; the app caches all four.
  Nutrition is windowed (`?since=`, default 120 days) because it is item-level and outgrows the
  other tabs. `Foods`/`Nutrition` reads are individually try/caught so **one malformed hand-edited
  tab can't take down workout syncing**.
- **Auth**: optional. `SECRET` blank in `appsscript.js` = open endpoint (original behaviour).
  Setting it requires the same value in Settings on *every* device — deploy blank first.

## Sheet tabs
`Workouts` · `Weight` · `Nutrition` (all created by the app) · **`Foods` (hand-maintained)**.

**Columns are read by header NAME, not position** (`readTable()` builds a name->index map).
Reorder or insert columns freely. `ensureSheet()` appends any missing headers on the next write,
so schema upgrades need no manual migration. Adding a nutrient = one row in `NUTRIENT_COLS`
(appsscript) and one in `NUTRIENTS` (app.js).

**BLANK IS NOT ZERO.** An empty nutrient cell reads as `null`, never `0`. This is the single most
important invariant in the food code: it lets the app report "Magnesium: 210mg, 53% of the day
covered" instead of inventing a deficiency out of cells nobody has filled in. `nutVal()` is the
one helper that enforces it, and every mutation path (`addFood`, `addCustomFood`, `foodBase`,
`stepFoodQty`, `saveFoodDay`) goes through it. Core macros still default to 0; micros do not.

`Foods` is the food database and the single source of truth for repeat items:
`Key | Name | Brand | Serving | <24 nutrients> | Verified | MicroSrc`.
`MicroSrc` (`label`/`usda`/`est`/blank) exists because `Verified` is one boolean and a food can
have label-verified macros beside looked-up micros.
- `Key` is a stable slug; logged rows reference it, so renaming is safe but re-keying orphans history.
- `Verified=yes` means the numbers came off a physical label. Anything else becomes `estimate` on
  every row it produces. **Nothing in the app writes to Foods** — custom items are never
  auto-promoted, because that would refill the database with the guesses `Verified` exists to
  quarantine.

## Conventions
- **Upsert by date.** Every write path replaces all rows for its date (`deleteRowsForDate`), so
  re-saving a date is always safe. An *empty* food day is a legitimate save — it clears the date.
- **Nutrition is item-level.** Day totals are derivable; the reverse is not.
- **Logged rows store totals for the quantity**, not per-serving — a later label correction must not
  rewrite history. `foodBase()` re-derives per-serving values only when changing quantity.
- **Logged rows store totals; `refreshDay()` is how a correction reaches history.** Storing rather
  than referencing keeps the log a record — the scale arbitrates against what was eaten, so past
  intake must not shift when a food row is edited. But when a stored number was simply *wrong*, the
  fix has to propagate: `scanDrift()` compares every keyed row against the current database and
  `refreshDay()` rewrites the approved ones. A correction should propagate, a reformulation should
  not, and only the owner can tell which — so the app asks rather than deciding.
- **Not everything can be linked anyway.** Roughly a third of logged rows (restaurant, cafeteria)
  have no `Key`, so the storage path has to exist regardless.
- **A partially covered total is a floor, not an estimate**, and renders with a `>=`. Coverage alone
  says a number is *incomplete*; it does not say it is an *undercount*, which is the part that matters.
- **`foodDirty` protects unsaved work.** `fetchFromSheets` replaces local state wholesale, so days
  with local edits are held back from that overwrite. Without it, items added and not yet saved were
  silently discarded on the next sync — the worst bug this app has had.
- **Escape everything from the sheet.** Food names are user data, unlike the fixed exercise list —
  use `esc()`, and address picker results **by index**, never by interpolating a key into an inline
  handler (the attribute is decoded before the JS string is parsed).
- Mobile-first: test at ~375px; tap targets ≥40px.
- No chart libraries; hand-rolled SVG/divs. Dark mode via `prefers-color-scheme` + CSS custom props.
- **Weight is judged against the goal** (`weightGoal`: gain/maintain/lose), on **rate** not raw
  change, and stays neutral under 7 days. The app previously hard-coded loss=success and
  gain=warning, which is exactly backwards on a lean bulk.
- **Grid/flex children need `min-width:0`.** Without it the widest descendant stretches the whole
  page — the old six-tab row did this and put the entire body into a horizontal scroll at 375px.
- **Four tabs, split by what you are DOING, not by data type** (2026-09-06). `Today` is everything
  you enter — the workout form first, body weight below it; `Progress` is everything you look back
  at — breadth, group tiles, weight trend, past workouts. Food keeps its own tab: its search,
  picker and totals are too large to fold into Today without hurting both. **The workout form
  stays the first thing on Today** — that is the gym use case and it must stay one tap from
  launch. Verified at 375px with no horizontal scroll.
- Exercises are a constant at the top of `app.js`. **When adding one, add it to the explicit map
  in `exerciseNameToId` (`appsscript.js`) too.** The lowercase/strip fallback only agreed with the
  app's ids by luck, and where it didn't — "Romanian Deadlift" -> `romaniandeadlift` vs the app's
  `rdl` — synced history silently never matched its exercise. Every movement is now listed
  explicitly; keep it that way.
- **Never change an existing exercise `id`.** Sheet rows store the display name and resolve to an
  id on read, so a renamed id orphans every set ever logged for it. Retiring a movement means
  `legacy: true` (kept out of the picker, kept in History and Progress), not deletion.
- **Variants** (`variants[]` on the exercise, `variant` on the logged entry) are not cosmetic.
  Ranks are computed **per variant**, using the most recently trained one. Pooling them picks the
  flattering set: standing lateral raises at 15lb x 10 were momentum-assisted and seated at
  15lb x 8 is the honest baseline, so a pooled best reports a rank the lift can't back up.

## Rank engine
Logged set -> Epley e1RM -> population percentile -> tier + division.
- **Standards** (`STANDARDS`) are Strength Level values at a **130 lb reference bodyweight**, and
  are percentiles of *people who log lifts there* — a committed population, well above average.
  The UI says so; don't let it imply otherwise.
- Thresholds scale allometrically, `(bw/130)^0.67`, so the ladder measures strength **per pound**.
  Bulking raises the bar on purpose: if rank stalls while the scale climbs, the surplus isn't
  becoming muscle. Rep-based standards are NOT scaled (no published curve) — a known limitation.
- Percentiles interpolate `ln(value)` against the anchors' z-scores, because the five published
  anchors don't line up with the tier bands (10/25/40/60/80).
- **Epley above ~12 reps is unreliable** — Epley and Brzycki differ by ~27% on a 20-rep set. Those
  e1RMs are flagged `conf: low` in the UI rather than silently trusted.
- ⚠️ **Rank decay was REMOVED 2026-09-07 — do not reintroduce it.** It slipped a division per
  5 days after a 7-day grace. Two problems. It was unphysiological (strength holds 2-4 weeks), and
  far worse, **`calcStreak` also zeroed at exactly 7 days**: a missed week demoted every muscle
  group *and* wiped the streak on the same morning — the app's entire response to a lapse was to
  punish it twice, at the moment of maximum quit risk, to a user whose previous attempt died at
  day 41. Replaced with the chess-rating treatment (`STALE`): the rank HOLDS and confidence in it
  ages — "last measured 9d ago", "unmeasured" past 21 days. Glicko does not lower an inactive
  player's rating, it widens their deviation, and this app already had that vocabulary
  (`provisional`, `conf: low`) everywhere except here.
- **`STREAK` forgives one gap.** A single break of 7-13 days keeps the streak alive and is shown as
  "·1 skip"; a second gap, or one past a fortnight, ends it. Apple pauses a ring streak for a
  month; Duolingo sells a Streak Freeze. A hard cliff punishes exactly the person you most need
  back.
- **Epley returns `w` at exactly 1 rep.** Plain Epley gives `w * 31/30` there, inflating a true
  1RM by 3.3% and making the most accurate input the app can take one of its least accurate
  outputs.
- **Breadth is a CAP, not an average** (2026-09-06). Three numbers: `earned` (what the lifts say),
  the ceiling breadth allows, and `shown` = the lower, *with the reason named*. The old blended
  overall rank could not say what to do about itself; a cap states exactly what unlocks the next
  tier and keeps effort visible while binding. `BREADTH_CAPS` maps patterns-trained → ceiling;
  `CAP_FLOOR_TIER` means **nothing is ever capped below Gold** — early on, showing up is the whole
  job, and this ladder already carries decay. When two ceilings tie, **both reasons are reported**:
  naming one would send you to fix a constraint and leave the other holding you at the same tier.
- **Isolation-only groups cap at Gold.** The compound/machine/isolation `weight` field forms a
  weighted MEAN, so when every lift in a group shares a weight the weights cancel and the penalty
  vanishes entirely. Arms sat at Platinum 3 on two curls — exactly what that weighting's own
  comment said could not happen. The cap is the fix; the weights still matter for mixed groups.
- **`GRACE_SESSIONS` grace is ASYMMETRIC**: a new lift counts immediately if it would RAISE the
  group, and waits for a second session only if it would lower it. Symmetric grace protects against
  a bad first attempt but also blocks good ones — on 2026-09-06 the owner's best session logged a
  Silver 1 pulldown and a Silver 1 row while Back kept showing a rank derived entirely from a
  12th-percentile dumbbell row. Training hard and watching the number not move is the one failure
  this ladder cannot afford. A group with nothing established shows as `provisional`.
- The five movement **patterns** (`HEADLINE_PATTERNS`) are now a coverage checklist, not a score.
  Naming specific barbell lifts assumed a barbell program — the owner trains in a building gym
  with a Smith machine and usually no spotter, so barbell bench and back squat may never happen.
  Smith or dumbbell bench both satisfy horizontal push; leg press satisfies legs.
- ⚠️ **`perHand` is PER VARIANT, not per exercise** (`isPerHand(ex, variant)`). Bench is Smith /
  Barbell / Dumbbell in one entry: the first two are total bar weight, the third is per hand, and
  Strength Level quotes each the same way. A blanket `perHand: true` mislabels two thirds of them.
  **This produced a real wrong rank on 2026-09-06:** a Bulgarian split squat done with two 15s was
  logged as `30` and scored against a per-dumbbell curve — Platinum 3 instead of Silver 3, a clean
  2x inflation that then carried the whole Legs group *and* its movement-pattern slot, because the
  grace period had excluded the other two leg lifts. The weight input's placeholder now reads
  `lb/hand` on per-hand variants; keep it that way, a sub-label alone was not enough.
- **`lockedVariant` hides the variant picker and pins new sets to one variant** (push-ups → Full
  ROM). The variants *list* stays, because that is how history is read: sets logged before
  2026-09-05 carry no variant and resolve to `variants[0]`, the partial they actually were.
  ⚠️ **Do not "simplify" a locked exercise by collapsing its variants array to one entry** — that
  silently re-credits the old partials as full range and inflates the record by the measured 16%
  (25 reps to 90° vs 21 chest-to-floor, same session). Equipment variants (Smith/Dumbbell/Barbell)
  are a different thing and keep their picker: they map to genuinely different standards.
- **Deliberately unranked, do not "fix":** push-ups at `To 90°` (partial ROM against full-ROM
  standards overstates by ~16%), bodyweight split squat (Strength Level's "Bulgarian Split Squat"
  is a *barbell* lift, so no rep curve exists), captain's-chair leg raise (easier than hanging).
  Ranking these would mean inventing a standard.

## Testing (no Node on the owner's Mac)
- **JS syntax check**: JXA compiles without executing —
  `osascript -l JavaScript -e "…new Function(src)…"`.
- **Apps Script**: run `appsscript.js` against stubbed `SpreadsheetApp`/`Utilities`/`Session`/
  `ContentService` objects. Covers the food round-trip, date upsert, `since=` windowing, the auth
  gate, and workout/weight regressions. ⚠️ Keep the `FakeSheet` stub in step with the real API —
  a missing `getLastColumn()` once produced four convincing false regressions.
- **UI**: `preview_start` on the `workout-log` launch config (port 4174), then drive the real
  functions from the console rather than asserting on the DOM alone.

## Progress page
Three views in one panel (`progressView`: `main` / `group` / `history`), switched by
`showProgressView()`. Six muscle-group cards ARE the page — no overall rank, no coverage section (owner's call,
2026-09-07). The tier ceiling is still explained, on the card it constrains: a capped group's
milestone reads "At ceiling — isolation lifts only". History is a click away. It used to sit inline under everything, which pushed the cards — the
actual point — into a minority of the scroll.
- **Milestones run the rank engine backwards** (`valueForPercentile`): given a tier, what lift and
  weight reaches it. Inverted by **binary search on `percentileFor`**, not a closed-form inverse
  normal CDF — 40 iterations beat any precision the UI shows, and reusing the forward function
  means the two can never disagree. A separate inverse would be a second copy of the same curve,
  free to drift.
- `groupMilestone` picks the lift needing the smallest **relative** gain, not the heaviest one.
  Weight-only selection told this log to take dumbbell rows 15 → 35 lb (2.3x) when 10 lb on the
  pulldown did the same work.
- It returns three kinds, and **which kind matters more than the number**: `capped` (no lift moves
  this — the ceiling is the constraint), `establish` (a lift is one session short of counting), and
  `lift` (train this, to this). Prescribing a lift for a capped group would be a lie: you could hit
  the number and the tile would not move.
- `groupRank` exposes `capIndex` and `ceilingReason`. The milestone tests **`nextIndex > capIndex`**,
  not the `capped` flag — a group sitting exactly at its ceiling is not flagged capped yet no lift
  moves it either.
- ⚠️ `.mg-bar` must stay `flex:none`. Inside a card it is a COLUMN flex child, where `flex:1`
  resolves flex-basis to 0 and collapses the bar to zero height. It only grows in `.gd-prog`.
- ⚠️ **Divisions run 3 → 1, bottom to top** (game-ladder convention). "Silver 1 → Gold" is correct.

## Auth
The shared secret lives in **Script Properties** (`SHARED_SECRET`), never in `appsscript.js`.
⚠️ **This repo is public.** The original design hardcoded `const SECRET = "..."` in the tracked
file, which would have published it on the first commit — protection that looks real and isn't.
Absent or empty property = open endpoint (the original behaviour), so old clients keep working.

⚠️ **Rollout order.** App settings are per-browser: enter the secret in Settings on **every**
device FIRST (the server ignores the key while the property is unset), and only then add the
property. The reverse order stops every device syncing until each one is fixed by hand.

**Reads go over POST** (`_type: "fetch"`), not GET, so the key rides in the body like it always
did for writes. `doGet` still works for a manual browser check but the app no longer calls it, and
`sheetsGetUrl()` was deleted rather than left as a trap. `buildSnapshot()` is shared by both so
they cannot drift. Keep `Content-Type: text/plain` on every request: it keeps them CORS "simple
requests", and Apps Script cannot set response headers so it cannot answer a preflight.

## Deploy
**Run `./stamp.sh` before committing any change to `app.js` or `style.css`.** It rewrites the
asset URLs in `index.html` with the assets' mtimes. There is no build step by design, and without
the stamp a browser serves a stale script against a fresh `index.html` — that cost several
debugging rounds on 2026-09-07 (functions "missing" that were plainly on disk) and made every
deploy need a manual hard-refresh.

Push to `main` → GitHub Pages serves it. `appsscript.js` changes additionally require the owner to
paste the new code in the Apps Script editor **and create a new deployment version** (Manage
deployments → New version) — saving alone does not update the web app. This is the single most
common "it's broken" cause, closely followed by sync settings being per-browser.

## Known next steps (not built)
- **Populate the new nutrient columns.** The 24-column schema ships mostly empty by design —
  coverage % makes that safe and turns data entry into a progress bar. Store-brand labels
  (Kirkland bar / UF milk / coconut water, CarbMaster, Oikos, GoMacro, the rice-cake chips and
  puff bar) need photographing; national brands and whole foods can be looked up.
- **Standards added 2026-09-06** for dips, dumbbell split squat, tricep pushdown, hanging leg
  raise and sit-ups — read off Strength Level's 130 lb row, the same reference this table uses,
  so no interpolation was involved. ⚠️ `triceppd-cable` is the weakest of them: a cable
  percentile depends on the machine's pulley ratio.
- **Still unranked, and worth filling only when actually trained** (this line previously claimed
  bench was missing standards — it is not, all three variants have them): weighted dips, weighted
  pull-ups, barbell row, barbell RDL, barbell/cable curl, dumbbell squat, bodyweight squat.
  Bodyweight squat is the only plausible near-term one. **Do not add standards speculatively** —
  every entry is a number someone has to trust, and a wrong one is worse than "Unranked".
- **Cross-device setup** — URL and secret are typed by hand per browser. Has cost the owner time
  three times.
- No way to delete a *workout* date's food from the app except by emptying it and saving.
- Service worker for true offline use.

### From the 2026-09-07 competitive analysis (Strong/Hevy/Boostcamp/JEFIT/Fitbod/Liftin/Zwift)
Ranked by evidence, not by novelty. The framing that drives the order: the largest published cohort
on lifting-app adherence (Fitbod, n≈389k) finds **distinct workout days in the first 28 days** is the
strongest predictor of 12-month retention. This app is a precision instrument for measuring lift
*quality*, aimed at a problem that is about *quantity of sessions*.
1. **Session templates / "today's plan"** — named routines (A/B/C) that pre-fill the Today form.
   Every competitor treats "what am I doing today" as the core job; this app starts every session as
   a blank form, so every session requires deciding what to do while standing in the gym. Also makes
   the movement-pattern breadth cap self-satisfying. **A `ll_routines` localStorage key, a picker and
   a prefill — no sheet change. One evening, and the highest-value item on this list.**
2. **Rest timer** — the only item here with direct physiological evidence (Schoenfeld 2016; 2024
   Bayesian meta-analysis) and it is an *in-gym* feature. Every competitor has one. An evening,
   pure client-side. Needs a Wake Lock or the screen sleeps.
3. **Weekly sets per muscle group** — six bars, direct 1.0 / indirect 0.5, against a 10–20 band,
   current week greyed out (a Tuesday reading against a weekly band is a false alarm — same
   reasoning as blank≠zero). This is the *continuous* version of the breadth cap already shipped.
   A weekend, mostly the exercise→muscle mapping. **Do not compute personal MEV/MRV** — that would
   be inventing a standard from 8 days of data.
4. **First-time / breadth rewards** — Zwift's largest XP source is one-time route completion, and the
   Fitbod cohort found equipment diversity predicts lower dropout. Turns the punitive breadth cap
   into a positive. Unproven transfer; an evening.

**Deliberately NOT to build** (each is standard elsewhere and wrong here):
- **Plate calculator** — Smith machine, dumbbells, cables, leg press. He almost never loads a barbell.
- **Social / kudos / leaderboards** — needs accounts and a backend; single user; and the Strava
  literature is double-edged (kudos raise volume, but also comparison pressure during setbacks).
- **Recovery / readiness scores** — needs a wearable he lacks, or a daily subjective input tax on an
  app whose problem is adherence.
- **RPE/RIR per set** — novice accuracy is poor and it taxes the interaction that must stay fastest.
- **Progress photos** — localStorage quota, and base64 does not belong in a Sheet.
- **A large exercise library** — he needs ~15 movements in one small gym.
- **A composite overall strength score** — removed 2026-09-07; DOTS-style scores are built on
  squat/bench/deadlift, three barbell lifts he may never perform. Do not let it back.

📌 **And stop investing in the 24-nutrient food schema.** At 127 lb lean bulking, calories and
protein move the outcome; the other 22 columns are a data-entry chore on an app whose stated top
risk is abandonment. Leave it (it self-migrates and costs nothing) but stop photographing labels.

## Paste bridge — the phone path into Foods (2026-09-12)

Built because the Apps Script URL lives only in this app's `localStorage`, per device: Claude on the
phone cannot POST to the sheet, so **the app has to be the writer**. Claude estimates, the app records.

**Two block types, and the split is the whole safety property:**

```
FOOD                        ITEM
name: Olipop Shirley Temple name: cafeteria salmon bowl
brand: Olipop               meal: Lunch
serving: 1 can (355 mL)     qty: 1
cal: 40                     cal: 640
verified: yes               conf: low
END                         END
```

`FOOD` → a row in the `Foods` tab (a label was READ). `ITEM` → one row in the day's log (a meal was
ESTIMATED). ⚠️ **An `ITEM` block can never produce a Foods row, by construction** — not by a flag
the parser could get wrong. This is the same rule as `addCustomFood`: nothing auto-promotes, because
promotion is what would refill the database with the guesses `Verified` exists to quarantine. A
`FOOD` block that does not assert `verified: yes` defaults to **no**, and the review row makes it a
visible tap rather than a parser decision.

- **`key: value` lines, not JSON.** A model emits it reliably, it survives a phone's copy-paste, it
  is order-independent, and **an absent line means UNKNOWN rather than a parse error** — which is
  how blank≠zero survives the trip. Anything outside a block (prose, fences, `#` comments, the
  Project's `RUNNING TOTAL:` line) is ignored, so the realistic paste is the whole reply.
- ⚠️ **Unknowns are OMITTED from the `_type:"foods"` payload, never sent as `null`.** The upsert
  leaves a cell alone for any field the payload lacks, so a label listing 11 of 25 nutrients updates
  those 11 and preserves the rest. Sending `null` would blank real values. `tests/import_test.js`
  asserts this on the wire, because it is invisible anywhere else.
- **Importing items does NOT sync.** Rows land locally and mark the day dirty; **Save Day owns the
  write and its conflict baseline.** An import that synced on its own would bypass the guard that
  2026-09-09 exists to enforce.
- The draft persists to `ll_import_draft` — a phone in a shop loses signal and reloads, and losing
  the paste means walking back to the shelf.
- `<1 g` records the midpoint (0.5) and **says so in the review**: 0 understates a real amount, 1
  overstates it, and a laundered guess is the failure mode `Conf` exists to prevent.
- Entry point is under the food search, where "I searched and it wasn't there" actually happens.

### Two defects the critics found the same day it shipped (2026-09-12)

Both were in code that had 50 passing tests and a browser check. The tests asserted the behaviour
the author *designed*, not the behaviour he *shipped* — which is why a reviewer with a different
frame found them in one pass and the author's own suite did not.

- ⚠️ **A partial `FOOD` block overwrote `Serving` and `Verified`.** `brand`, `microSrc` and all 25
  nutrients were conditioned in the payload; `serving` and `verified` were not — and the parser
  guaranteed they were never absent, defaulting to `"1 serving"` and `"no"`. So a follow-up block
  adding one looked-up micronutrient replaced a real `1 can (355 mL)` with a fabrication and
  demoted a label-verified row to `no`. **The 24 nutrient cells survived correctly, which is what
  made it quiet**: the row kept its numbers and lost the two fields saying what the numbers are
  *per* and whether a human read a label. Partial blocks are a designed-for case — the parser
  itself emits a "treated as a partial update" flag for them. Fixed by making `verified` tri-state
  (`yes`/`no`/`""` = unstated) and omitting both when the block is silent, with the review chip
  cycling through `unchanged`. **The general rule: a default supplied at parse time becomes a lie
  at write time.** Anything the payload sends unconditionally must be something the user stated.
- ⚠️ **`commitImportItems` was the only mutation path bypassing `nutVal()`.** Writing `r[k]` raw
  made it the only way a **core** macro could land as `null` on a logged row. That matters because
  the `>=` floor marker and the coverage readout cover **micros only** (`renderMicroSummary`
  filters `!n.core`), while `foodTotals` sums `Number(it[k]) || 0` — so an `ITEM` honestly omitting
  `fib` produced a day reading a flat 18g against a 28g DV with nothing marking it incomplete.
  The prompt compounded it by telling the model to omit anything it did not know, with no carve-out
  for the seven core macros; **both halves were fixed**, since the app's convention is core-floors-
  to-0 and the model must therefore always estimate those seven.

Also fixed: an `ITEM`'s `key` was trimmed but not slugged, so `Kirkland-Protein-Bar` looked linked
and behaved unlinked — silently excluded from `scanDrift()` forever; the review panel's
destination-date header went stale when the picker moved while `commitImportItems` read the date
live; and the `try` wrapped the bookkeeping as well as the POST, so discarding a paste mid-flight
reported **"Couldn't save"** over a write that had landed. Given this file's history is the inverse
lie ("says synced but isn't"), a false failure that invites a duplicate re-do is worth closing too.

📌 **This reopens a judgment, and the reopening is deliberate.** The note above says to stop
photographing labels because the 22 extra columns are a data-entry chore. That was a verdict on the
*cost*, and this feature changes the cost — a label is now a photo and a paste. It is not a verdict
on the *value*, which is unchanged and still modest. Photograph labels for foods that repeat; do
not go looking for them.

## Weight path — audit fixes (2026-09-12)

A critic pass over bodyweight found four routes to a wrong rank from a right lift.
The framing that matters: **the weight feature is small, but bodyweight is an INPUT** —
every weighted rank divides by `(bw/130)^0.67`, so its bugs surface everywhere except
where they are caused. On this log a **~3 lb error crosses a division**.

- ⚠️ **Bodyweight is validated now (70–400 lb), and it is the only input that needed it.**
  The markup's `min`/`max` never fired: the control is a plain `<button onclick>`, not a
  form submit, so constraint validation never runs and `.value` still returns the
  out-of-range number. The realistic mistake passes `min=50` anyway — a scale left in kg
  reads 57, scaling every threshold by 0.578 and turning a Silver 1 pulldown into
  **Diamond 1**. Nothing on Progress displays the bodyweight in use, so it is invisible
  exactly where it does the damage. The guard names kg explicitly when it sees one.
- ⚠️ **`getWeightLog` treated a blank weight cell as 0.** `Number("")` is `0` and
  `!isNaN(0)` is true, so the row survived the filter, and `Number(0) || STD_REF_BW`
  then substituted the 130 lb reference for a real 127.4 — demoting every weighted lift
  a division and putting a 0 lb point on the chart. **Blank is not zero here either.**
  Fixed, and the tab is now read by header name like every other one; it was the last
  place addressing columns positionally, which quietly voided the "reorder columns
  freely" guarantee for the one tab that scales all of Progress.
- ⚠️ **A back-dated workout silently destroyed a weigh-in.** `saveWeight` takes
  `currentLogDate`, `saveWorkout` never resets it, and on a phone the picker has scrolled
  off-screen by the time the weight input is in view. Back-filling Monday on Wednesday and
  then stepping on the scale wrote Wednesday's weight onto Monday, where the upsert
  destroyed Monday's real reading in app and sheet with no undo. Now confirmed when the
  date is not today.
- **The fetch path was the only one not sorting `weightLog`.** `saveWeight` and the JSON
  import both sort; `getWeightLog` returns sheet ROW order, so a back-filled date lands
  last. Ranks were safe (`currentBodyweight` sorts its own pool) but the trend stat reads
  endpoints positionally: a real **+1.56 lb/wk "fast — likely not all tissue"** rendered
  as **"too early to read"**, understating the gain by 80%, with the chart below it
  drawing the truth.
- **One `asOf` leak.** Group-detail "Recent activity" scored history at *today's*
  bodyweight while `groupSeries` directly above it used each point's own date — the same
  lift reading a division apart on one screen, drifting pessimistic across a bulk. The
  rest of the `asOf` threading was verified correct.
- Scoring copy still described the decay removed on 2026-09-07 and named the wrong
  threshold. Copy only, but it told the user a removed behaviour was live.

⚠️ **`appsscript.js` changed — paste it into the Apps Script editor and create a NEW
deployment version.** Saving alone does not update the web app.
✅ **Done and verified 2026-09-12**: redeployed, and a live fetch returned all 66 weigh-ins with
no zero/invalid rows and the other three tabs intact — which also confirms the header-based
`readTable` path found `Date` / `Weight (lbs)` correctly.

### Cable lateral raise: logged, not ranked (2026-09-12)
`latraise` mapped all three variants to `latraise-db`, a **per-dumbbell** curve, while
`perHand` named only the two dumbbell ones. Patrick's cable version is a **two-arm bar on
one stack**, so the entered number is the load for BOTH arms: scoring it against that curve
inflated by **2.25 rungs** (Gold 2 → Diamond 1 at 15 lb/hand × 12), larger than the split-squat
bug it mirrors, and it printed `18 lb/hand` for one variant and `18 lb` for another off the
same curve. Strength Level publishes no two-arm lateral raise, so **Cable is absent from
`std`** — loggable, unranked. Fourth instance of the standing rule: when the entered number
is not what the curve measures, log it and leave it unranked rather than invent a standard.
Caught with **zero history logged**, so no past rank was ever wrong.

## Progress page — traps found by review (2026-09-07)
A design critique caught five shipped defects the author's own screenshots missed. Recorded because
four of them are invisible in a screenshot and will recur:
- ⚠️ **`--radius` and `--text-2xl` never existed.** The scale is `--radius-sm|md|lg|xl` and
  `--text-xs|sm|base|lg|xl`. An undefined var makes the declaration invalid at computed-value time,
  so `font-size` silently **inherits** — the rank on every card rendered at body size, smaller than
  the page heading, and every new surface had square corners. **Verify new custom properties
  resolve (`getComputedStyle`) rather than trusting a screenshot; 16px vs 24px does not announce
  itself at half scale.**
- ⚠️ A **capped group's `rung` IS its ceiling**, so `rung % 1` is ~1 and the bar rendered 100% full
  — the universal signal for "about to level up", on the one state that can never move. Capped bars
  are striped (`.mg-bar-capped`) and the card names `gr.earned`.
- ⚠️ `scrollIntoView` against the 61px sticky topbar hid the tab bar and clipped the only way out
  of a sub-view to 28px. `#panel-progress{scroll-margin-top:76px}` plus a 44px `.back-link`.
- ⚠️ **`--color-text-faint` was 1.85:1.** The redesign had put "provisional", "not counted yet" and
  the confidence flag — the text that keeps the numbers honest — in the least readable colour on
  the page. Token lifted, and those specific labels promoted to `--color-text-muted`.
- ⚠️ The milestone printed `23 lb x 15` with no per-hand marker, reintroducing the exact ambiguity
  that caused a 2x wrong rank the day before. `milestoneText` now appends `lb/hand` via
  `isPerHand`. **The input placeholder and the prescription must agree.**
- Use `setTimeout`, not `requestAnimationFrame`, for post-render focus: rAF is throttled to zero in
  a hidden tab, so focus silently never moves.
- `showProgressView` pushes history state; without it Android back exits the app from a 3-level
  hierarchy.

## Progress page — milestones and the rank chart (2026-09-07)
- **Milestones step by DIVISION, not tier** (`nextRungStep`). A whole-tier target was unusable:
  Back read "Lat Pulldown: 123 lb × 8" against a current 85. Divisions are thirds, so the target is
  about a third the size. No special case is needed at the top of a tier — divisions run 3 → 1, so
  from Silver 1 the next third IS Gold 3 and the arithmetic produces it.
- ⚠️ **`nextRungStep` needs an epsilon.** A third is not binary-representable: the boundary
  1.3333… reads back as frac 0.33333, `0.33333 * 3` floors to 0, and `rungToTier` returned the
  division it had just left — so cards rendered "Silver 2 → Silver 2".
- **`prescribe` caps weighted lifts at 12 reps.** It inherits your last rep count, and a 20-rep
  history produced "23 lb × 20" — telling you to keep making the measurement the app itself flags
  as low-confidence. AMRAP lifts are exempt: there, reps ARE the measure.
- **`milestoneDelta` shows the gap** ("2 more reps", "+3 lb"). The target alone makes you subtract.
- **`groupSeries` replays `groupRank` at past dates** via the `asOf` parameter threaded through
  `bestSetsByVariant` → `rankForExercise` → `allRanks` → `groupRank`, plus `currentBodyweight(asOf)`.
  Threaded rather than reimplemented: a parallel aggregation would drift from the card.
- It plots **`earned`** — no cap, no decay. Decay is a motivational house rule and would draw
  phantom losses across an untrained gap; a chart showing you weakening while you simply were not
  training is worse than no chart.
- ⚠️ **Points from high-rep sets render hollow.** Arms genuinely reads "Platinum 3 → Gold 2" because
  20-rep curl sets extrapolated high and honest 8-rep sets then measured lower. A progression chart
  that shows a decline for *improving your measurement* has to say so.
- Tier colour: `--tier` was already defined for the pills; `.mg-tier`, `.mg-bar-fill`, `.exr-next b`
  and `.gd-group` now consume it. Verify contrast in BOTH themes when touching it — light-mode
  silver is ~3.6:1, fine for the 24px headline and not for small text.

## Review findings fixed 2026-09-07 (second pass)
A code critique found 12 live defects in the milestone/chart work. The ones that will recur:
- ⚠️ **`milestoneDelta` must compare the SAME rep count.** It back-computed the from-weight as
  `from / (1 + reps/30)` using the PRESCRIBED reps — but `prescribe` caps at 12, so any high-rep
  history anchored against a weight never lifted, and the gap always understated in the flattering
  direction (leg press "+3 lb" when the honest figure was +7.5). Milestones now carry `fromWeight`
  and `fromReps`; when the counts differ it prints "was 90 × 14" rather than inventing a delta.
- ⚠️ **Anything derived from the variant must be re-rendered by `onVariantChange`.** The goal line
  and the `lb/hand` placeholder were baked in at first render, so switching Dumbbell → Barbell left
  a per-dumbbell prescription on the gym-facing form for a variant with no standard at all — the
  split-squat 2x error, pointed the other way. `goalLineHtml` is now shared by both paths, and
  `exerciseMilestone(id, variant)` returns null for a variant that is not the ranked one.
- ⚠️ **`--tier` is inherited, so a tier class on an ancestor paints the WRONG tier.** `.mg-nexttier`
  showed "Gold 3" in silver because `--tier` came from the card's current tier. The class goes on
  the element naming the tier. `.exr-next b` had the opposite failure — no ancestor set `--tier` at
  all (`.exr-bar` is a sibling), so the feature was inert.
- ⚠️ **`--tier-ink` for small text and bar fills, `--tier` for display type and strokes.** Four of
  six light-mode tier colours fail 4.5:1 as small text, and four of six fail 3:1 as a bar fill
  against `--color-border`. Gold was 2.99:1.
- ⚠️ **SVG `<text>` scales with the viewBox, so no font-size is right at two widths.** Axis labels
  rendered 5.8px on a phone and ~15px on a laptop — larger than the caption. Tier labels are now
  absolutely-positioned HTML spans over the SVG; the dots live in a second overlay because
  `preserveAspectRatio="none"` would otherwise stretch them into ellipses.
- **`soft` on the chart means `confidence === "low"` (>12 reps).** `!== "high"` also caught "med"
  at 11-12, which made every point on every chart hollow — a marker that is always on says nothing.
- **`nextRungStep` nudges the OUTPUT only.** An input-side epsilon rounded any rung within ~3e-10
  of a boundary up a slot, skipping a division, and turned Champion 2 into "top tier reached".
- `groupRank` passes its `allRanks` result into `trainingBreadth`; it was recomputing the whole
  ladder a second time on every call (269 `allRanks` calls for one detail render on a large log).
- 📌 Still open: `stamp.sh` cache-busts the assets but not `index.html` itself, so a stale HTML
  still yields a stale script for one cache lifetime. A pre-commit hook would close it.

## Exercise catalogue — two bugs fixed 2026-09-07

Found by auditing whether five planned exercises existed, not by a test failing.

### `perHand` must be set wherever the mapped standard is per-dumbbell
`ohpress` carried `std.Dumbbell = "ohp-db"` — a **per-dumbbell** curve (50 lb median vs 98 for
`ohp-bb`) — with **no `perHand` field**. `isPerHand()` is purely a labelling flag; the ranking always
compares the entered number straight to the standard. So the form showed a plain `lbs` box with no
per-dumbbell hint, a user would reasonably enter the TOTAL, and the engine would rank it as one hand:
**the identical 2× inflation that put Legs at Platinum off a 30 lb split squat.**

⚠️ **Invariant to hold: for every `(exercise, variant)` whose `std` maps to a `*-db` curve,
`perHand` must include that variant.** Worth a test rather than an audit.

The one existing `ohpress` row (2026-05-16, 40×8) has a blank variant → resolves to `variants[0]`
= Barbell → not per-hand, so the fix is not retroactive.

### An unmeasurable variant gets logged but not ranked
`dips` had only Bodyweight and Weighted, so an **assisted** dip had no honest home — logging it as
Bodyweight credits ~127 lb the user did not lift. Added **Assisted**, deliberately absent from `std`.

This is now the third instance of the same principle (Captain's-chair leg raise, bodyweight split
squat, assisted dip): **when the movement removes an unknown share of the load, log it and leave it
unranked.** Inventing a curve is worse than an empty rank.

### Note
`chestpress` is `legacy` — the gym has no chest press machine (2026-09-05). Don't recommend it.

## Food sync — seven bugs, and the contract that replaced the guesswork (2026-09-09)

Reported as "it says synced but it isn't, especially if I update the food more than once a day."
All seven were real. Two of them lost data **silently** and were not what he noticed.

### The contract, stated plainly
> **The sheet is the source of truth. localStorage is a write-ahead buffer whose only job is to
> drain into it.** Local wins for exactly one thing — a date with edits not yet accepted — and that
> exception must ALWAYS have a way to resolve.

Every bug below is a place the code departed from that sentence.

### 1–5: the visible failures
1. **`baseSavedAt()` went stale after every successful save.** Local food rows only ever received a
   `savedAt` on the way IN from a fetch; a successful save never stamped them. So the second save of
   a day sent a base from the last *fetch* while the server had advanced to the *first save's* stamp,
   and the server correctly rejected it. **The "other device" was this device, one save ago.**
   Workouts never hit this: a workout entry is stored whole with its `savedAt`; food rows are
   item-level and had nowhere to keep one.
2. **`saveFoodDay()` did not await the sync** and reported `Saved ✓` before the request finished —
   and kept the toast up when the write came back rejected.
3. **`fetchFromSheets()` reported a clean "Synced" while deliberately skipping dirty dates.** The
   status described the HTTP call, not the data on screen. This is the literal "says synced but isn't".
4. **The conflict toast promised "pulling the newer version" and did not** — the pull skips dirty
   dates, which is always the date that just conflicted.
5. **The wedge.** Because the fetch skips dirty dates, the stale base that caused a conflict could
   never be refreshed, so every retry recomputed the same base and failed identically. **No exit
   short of clearing site data.** On conflict the client now adopts the server's `savedAt`, making
   the next save a deliberate overwrite — the user has been told, and has to press Save again.

### 6–7: the silent ones (found by reviewing the whole path, not by the report)
6. ⚠️ **An undefined `_base` bypassed the conflict guard outright.** The client *inferred* "never
   synced this date" from "no local row carries a savedAt" — which is **also true when the date was
   fetched while EMPTY and gained rows afterwards.** That is exactly what happens when Claude writes
   to a day the phone has open. The phone's next save then replaced those rows with no conflict and
   no warning.
   **Fix, and note it took two attempts:** a recorded per-date baseline (`ll_synced_at`) makes `""`
   mean "the server genuinely had nothing", distinct from "never heard of this date". That alone did
   NOT close it — a date with no local rows and no server rows never enters the map. The fetch now
   also sends an explicit `since` and records it (`ll_synced_from`), so **absence inside a known
   window is information; absence inside an unknown window is just ignorance.**
7. **`retryQueue()` replayed the payload frozen at failure time.** Edits made after a failed save
   were overwritten by the stale snapshot, which then succeeded and cleared the dirty flag — sheet
   missing items, app reporting saved, and the flag that would have caught it gone. The queue now
   holds **dates**; `buildFoodEntry(date)` rebuilds from live state at retry.

### Escape hatch
**"Discard & reload"** next to the Unsaved indicator. The dirty shield that stops a background fetch
from wiping an in-progress meal is the same thing that stops a bad local copy from ever being
replaced — so dropping it has to be possible, deliberately, for one date, behind a confirm.

### Decision: NOT item-level upsert (revisit only if the merge problem becomes real)
Saving replaces the whole day, so two writers to one date clobber by construction. The **Foods** tab
already does the right thing (upsert by `Key`); Nutrition cannot, because item ids are ephemeral —
never sent in the payload, no `Id` column, regenerated on every fetch.

The principled fix is an `Id` column + upsert by id + tombstones for deletions. **Deliberately not
built.** It buys concurrent multi-writer merge; there is one phone, plus Claude occasionally, and
that coordination is free (save first, then ask). Once bug 6 is closed the guard converts every
concurrent case into a **visible conflict instead of silent loss**, which is the property that
actually matters. Revisit if the conflict toast starts appearing for real reasons.

### Tests — `tests/sync_test.js`, 23 cases
```bash
osascript -l JavaScript tests/sync_test.js   # from the repo root
```
Loads the real `scripts/app.js` against stubbed browser globals and a fake server mirroring
`staleWrite()` from `appsscript.js`. **Every case began as a reproduction of a bug that shipped** —
write baselines, conflict detection, conflict recovery, retry, the escape hatch. Three data-loss
bugs passed human review in this one file; the tests are what separated "looks right" from "is right".

**Decision: the suite is committed, and it is fine that this repo is public.** Fixtures are entirely
synthetic (`A`, `B`, `SRV`, `phone item`) — no real foods, no endpoint, no secret. Note that **GitHub
Pages serves the whole repo**, so `tests/` is publicly fetchable at the Pages URL; it is inert
(`index.html` never references it, it only runs under osascript) and no worse than `appsscript.js`,
which is the actual server code and has always been up there. The thing that must stay private is the
**sheet** — behind the owner's Google account, reached by a deployment URL that lives only in the
macOS keychain, gated by a secret in Script Properties. None of that is in the repo.

⚠️ Resolve `app.js` from the working directory, never an absolute path — this repo syncs to a
Windows PC and a hardcoded `/Users/...` fails there with a null read instead of an error.
⚠️ `osascript` evaluates the file and then its trailing expression, so `run()` can execute twice in
one process. It resets all shared state on entry so the second pass stays meaningful.

### Standing habit for whoever writes to this sheet
**Save the day in the app before asking Claude to add items.** The guard now makes the collision
visible rather than silent, but a visible collision is still a collision.
