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
- **Decay is a house rule, not physiology.** The literature has strength holding 2-4 weeks and only
  dropping meaningfully past ~4. `DECAY` slips a division per 5 days after a 7-day grace, floored
  at one tier, purely for motivation — and training the group replaces the estimate with a real
  measurement immediately. The UI must keep saying it's an upkeep rule.
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
- **`GRACE_SESSIONS` keeps a new lift out of its group mean** until it has been done twice.
  Otherwise the mean punishes you for *trying*: you are bad at a lift the first time, and logging
  it drops the group. A group with nothing established shows as `provisional` rather than hidden.
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
`showProgressView()`. Six muscle-group cards are the page; coverage is one collapsible line;
history is a click away. It used to sit inline under everything, which pushed the cards — the
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
- **Paste bridge**: paste the phone Project's item lines → review table → save. The "approve and
  sync" flow; matched-vs-estimated is the point of the review step.
- **Cross-device setup** — URL and secret are typed by hand per browser. Has cost the owner time
  three times.
- No way to delete a *workout* date's food from the app except by emptying it and saving.
- Service worker for true offline use.
