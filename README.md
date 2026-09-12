# 🏋️ Lift Log

A lightweight, mobile-friendly workout tracker that runs entirely in your browser — no account, no backend, no app store required. Built as a static site hosted on GitHub Pages.

**Live app:** [https://patrick-leary.github.io/workout-log](https://patrick-leary.github.io/workout-log)

> Anyone can use the live app directly — just open the link and start logging. Your data stays on your own device.

***

## Features

- **Log workouts** — track sets, reps, and weight for gym and home/dumbbell exercises
- **Log food** — search a personal food database, tap to add, adjust servings, and watch the day's calorie and protein totals against your targets
- **Last session reference** — automatically shows your best weight/reps from the previous session as a guide
- **History** — browse every past workout with a collapsible set-by-set breakdown
- **Strength ranks** — every lift scored against population strength standards, scaled to your
  bodyweight, aggregated per muscle group, with untrained movement patterns capping how far the
  ladder goes
- **Progress tracking** — all-time personal bests, session count, and streak counter per exercise
- **Google Sheets sync** *(optional)* — automatically push every saved workout to a Google Sheet via Apps Script
- **Paste to add foods** — paste a `FOOD` block (from a nutrition label) straight into your food
  database, or an `ITEM` block into the day's log, without typing 25 numbers by hand
- **Export / Import JSON** — back up your data or move it between devices
- **Light & dark mode** — respects your system preference with a manual toggle
- **Works offline** — no internet required after the first load

***

## Using the App

Open the live link above on any device. No sign-in needed.

- **Today** — everything you enter: select a date, fill in your sets, hit Save Workout, and log
  your body weight below it
- **Food** — search your food database, tap to add, adjust servings, watch the day's totals.
  **Paste from Claude** takes a block of `key: value` lines and turns it into database rows or
  logged items — see below
- **Progress** — everything you look back at: movement-pattern coverage, per-muscle-group ranks
  (tap a tile to drill into its exercises), weight trend, and every past workout
- **Settings** — configure Google Sheets sync, export/import data

Your workout history is stored in your browser's `localStorage`. It persists between sessions on the same device and browser, but is not shared across devices automatically. Use **Export/Import JSON** to move data between devices, or set up Google Sheets sync to have a cloud backup.

***

## Google Sheets Sync (Optional)

Connect the app to a Google Sheet for two-way sync. On every app load the latest data is fetched from Sheets, and every saved workout is pushed back — so both sides stay in sync. The sheet is also great for visualizing your data with charts and filters.

### 1. Create the Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Rename the first tab to **Workouts** (exact spelling)
3. Add these headers in row 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Date | Exercise | Set | Weight (lbs) | Reps | Saved At |

> **Tip:** Format column A as **Plain text** (Format → Number → Plain text) to prevent Sheets from converting dates automatically.

The app creates the **Weight** and **Nutrition** tabs itself on first save. To use
the Food tab you also need a **Foods** tab, which you fill in yourself — it is the
food database the picker searches, and nothing in the app writes to it:

| Key | Name | Brand | Serving | *…nutrients…* | Verified | MicroSrc |
|---|---|---|---|---|---|---|

Columns are matched **by header name**, so order does not matter and the tab grows safely: the
script appends any column it needs and never moves an existing one. The nutrient block is
`Cal · P · C · Fib · Fat · Sat · Na · Trans · Chol · Sugar · AddSug · VitD · Ca · Fe · Potassium ·
VitA · VitC · VitE · VitK · B6 · B12 · Folate · Mg · Zn · Alc` — start with just `Cal`/`P` if you
like and add the rest later.

- **A blank cell means "unknown", not zero.** The app reports a coverage percentage per nutrient
  rather than inventing a deficiency out of missing data, so a half-filled tab is safe.
- **MicroSrc** — where the numbers came from: `label` (US labels only require VitD, Ca, Fe and
  Potassium), `usda` (looked up), or `est`. Worth recording, because a tab filled entirely from
  labels will silently have no data for two-thirds of the nutrients.
- **Alc** — grams of pure ethanol per serving, so the app can separate calories that build tissue
  from calories that don't.

- **Key** — a stable slug (`olipop-cherry`). Logged rows reference it, so renaming
  a food is safe but changing its key orphans history.
- **Serving** — free text describing one unit (`1 bottle (500mL)`). Quantities in
  the app are multiples of this.
- **Verified** — `yes` if the numbers came off the physical label. Anything else
  is treated as an estimate and tagged as such on every row it produces, which is
  how you spot a number that was guessed once and then quietly reused.

Flavour variants get their own row. Brands vary more between flavours than people
expect, and averaging them silently corrupts the log.

The **Nutrition** tab is item-level — one row per food, not per day. Day totals are
a pivot or a `QUERY` away; going the other direction is impossible.

### 2. Create the Apps Script

1. In your Sheet, click **Extensions → Apps Script**
2. Delete all default code and paste the contents of [`appsscript.js`](appsscript.js) from this repo
3. Click **Save** and give the project any name (e.g. "Lift Log Sync")

### 3. (Recommended) Require a shared secret

The endpoint is public by default — **anyone with the URL can read and write.**

Generate a long random string (`python3 -c "import secrets; print(secrets.token_urlsafe(32))"`),
then in the Apps Script editor go to **Project Settings → Script Properties** and add:

| Property | Value |
|---|---|
| `SHARED_SECRET` | your random string |

> ⚠️ **Never put the secret in `appsscript.js`.** It is a tracked file — in this repo and
> probably in yours — so a hardcoded secret gets published on your first commit. Script
> Properties keep it out of git entirely. An absent or empty property leaves the endpoint
> open, which is the default behaviour.

> ⚠️ **Order matters.** Settings are stored per-browser. Enter the secret in
> **Settings → Shared secret** on *every* device **first** — while the property is unset the
> server ignores the key it is sent, so nothing breaks — and add the property **last**.
> Reversed, every device stops syncing until you fix each one by hand.

To rotate: change the property, then update each device. To disable: delete the property.

### 4. Deploy as a Web App

1. Click **Deploy → New deployment**
2. Click the ⚙️ gear icon next to "Type" and select **Web app**
3. Configure:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and authorize when prompted
5. Copy the deployment URL — it looks like:
   `https://script.google.com/macros/s/AKfycbx.../exec`

### 5. Connect in the App

1. Open the app and go to the **Settings** tab
2. Paste the URL into the **Deployment URL** field
3. Click **Save**, then **Test connection**
4. You should see "Connection successful ✓"

Next time you open the app, it will automatically fetch the latest data from Sheets on load.

> **Note:** Any time you update `appsscript.js`, open the Apps Script editor, paste the new code, and create a **new deployment version** (Deploy → Manage deployments → edit the existing deployment → select "New version"). The URL stays the same.

***

## Running Your Own Copy

If you want your own hosted version at your own URL:

### Option A — Fork on GitHub (recommended)

1. Click **Fork** at the top right of this repository
2. Go to your fork's **Settings → Pages**
3. Under **Source**, select **Deploy from a branch → main**
4. Your app will be live at `https://YOUR-USERNAME.github.io/workout-log`
5. Set up your own Google Sheet and Apps Script following the steps above

### Option B — Download and host yourself

1. Click **Code → Download ZIP** and extract it
2. Host on any static service — GitHub Pages, Netlify, Vercel, Cloudflare Pages (all free)
3. No build step required — plain HTML, CSS, and JS

***

## Adding foods by paste

Typing a nutrition label into 25 fields on a phone is the reason food databases go unfilled. The
**Paste from Claude** box on the Food tab takes plain `key: value` lines instead. Two block types:

```
FOOD                              ITEM
name: Olipop — Shirley Temple     name: cafeteria salmon bowl
brand: Olipop                     meal: Lunch
serving: 1 can (355mL)            qty: 1
cal: 40                           cal: 640
protein: 0                        p: 41
fiber: 6                          conf: low
sodium: 30 mg                     END
verified: yes
END
```

- **`FOOD`** adds or updates a row in your food database — use it when you have read a label.
- **`ITEM`** adds one entry to the day you are looking at — use it for a meal you estimated. It
  never becomes a database row, so estimates cannot quietly become "verified" numbers.

Paste the whole message; anything outside a block is ignored. Long names (`Protein`, `Saturated
Fat`, `Added Sugars`) work as well as the short keys. **Leave a nutrient out if you don't know it**
— a missing line means unknown, and the app tracks how much of each day is actually covered. Press
**Review** to see what was understood before anything is saved, then add what you want.

***

## Project Structure

```
workout-log/
├── index.html          # App shell and markup
├── styles/
│   └── style.css       # All styles and design tokens
├── scripts/
│   └── app.js          # All application logic
└── tests/              # JXA test suites (see tests/README.md)
```

No frameworks, no build tools, no dependencies. Runs directly in the browser.

***

## Tech Stack

- **HTML / CSS / JS** — no frameworks
- **localStorage** — client-side data persistence
- **Google Apps Script** — optional Sheets sync endpoint
- **GitHub Pages** — free static hosting

***

## License

MIT — fork it, modify it, use it however you like.