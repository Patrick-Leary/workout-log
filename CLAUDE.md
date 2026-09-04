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

`Foods` is the food database and the single source of truth for repeat items:
`Key | Name | Brand | Serving | Cal | P | C | Fib | Fat | Sat | Na | Verified`.
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
- Exercises are a constant at the top of `app.js`. Don't rotate or rename without asking — the
  Progress tab keys history off the display name.

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
- **Paste bridge**: paste the phone Project's item lines → review table → save. The "approve and
  sync" flow; matched-vs-estimated is the point of the review step.
- **Cross-device setup** — URL and secret are typed by hand per browser. Has cost the owner time
  three times.
- No way to delete a *workout* date's food from the app except by emptying it and saving.
- Service worker for true offline use.
