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
  page — the six-tab row did this and put the entire body into a horizontal scroll at 375px.
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
- **Decay is a house rule, not physiology.** The literature has strength holding 2-4 weeks and only
  dropping meaningfully past ~4. `DECAY` slips a division per 5 days after a 7-day grace, floored
  at one tier, purely for motivation — and training the group replaces the estimate with a real
  measurement immediately. The UI must keep saying it's an upkeep rule.
- The **overall** rank uses only `BIG_FIVE`, counting untrained lifts as rung 0. That's what makes
  "Bronze" honest for someone who has never benched or squatted, and stops isolation work (whose
  standards are much softer) from inflating the headline.

## Testing (no Node on the owner's Mac)
- **JS syntax check**: JXA compiles without executing —
  `osascript -l JavaScript -e "…new Function(src)…"`.
- **Apps Script**: run `appsscript.js` against stubbed `SpreadsheetApp`/`Utilities`/`Session`/
  `ContentService` objects. Covers the food round-trip, date upsert, `since=` windowing, the auth
  gate, and workout/weight regressions. ⚠️ Keep the `FakeSheet` stub in step with the real API —
  a missing `getLastColumn()` once produced four convincing false regressions.
- **UI**: `preview_start` on the `workout-log` launch config (port 4174), then drive the real
  functions from the console rather than asserting on the DOM alone.

## Deploy
Push to `main` → GitHub Pages serves it. `appsscript.js` changes additionally require the owner to
paste the new code in the Apps Script editor **and create a new deployment version** (Manage
deployments → New version) — saving alone does not update the web app. This is the single most
common "it's broken" cause, closely followed by sync settings being per-browser.

## Known next steps (not built)
- **Populate the new nutrient columns.** The 24-column schema ships mostly empty by design —
  coverage % makes that safe and turns data entry into a progress bar. Store-brand labels
  (Kirkland bar / UF milk / coconut water, CarbMaster, Oikos, GoMacro, the rice-cake chips and
  puff bar) need photographing; national brands and whole foods can be looked up.
- **Standards missing** for dips, split squat, tricep pulldown, leg raise, sit-ups, and for the
  dumbbell/Smith variants of bench and squat. Those log fine and show "Unranked".
- **Paste bridge**: paste the phone Project's item lines → review table → save. The "approve and
  sync" flow; matched-vs-estimated is the point of the review step.
- **Cross-device setup** — URL and secret are typed by hand per browser. Has cost the owner time
  three times.
- No way to delete a *workout* date's food from the app except by emptying it and saving.
- Service worker for true offline use.
