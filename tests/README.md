# Tests

No Node on the owner's Mac — these run under JXA, the JavaScript runtime that
ships with macOS.

```bash
osascript -l JavaScript tests/sync_test.js
```

`sync_test.js` loads the real `scripts/app.js` against stubbed browser globals
and a fake server that mirrors `staleWrite()` from `appsscript.js`. It covers
the sync contract between the app and the sheet: write baselines, conflict
detection, conflict recovery, retry behaviour, and the discard escape hatch.

`import_test.js` covers the paste-in path (`FOOD` / `ITEM` blocks) — the parser,
its aliases and tolerances, and the two contracts that are only visible on the
wire: that an unknown nutrient is OMITTED from the Foods payload rather than
sent as null (sending null blanks a cell the sheet already had), and that an
imported item is written locally and left for Save Day rather than synced
behind the conflict baseline. It also pins the rule that an `ITEM` block can
never produce a Foods row.

```bash
osascript -l JavaScript tests/import_test.js
```

`weight_test.js` covers the bodyweight path and its blast radius: the plausibility
guard (a kg reading is the realistic error and it passes `min=50`), the back-dated
confirm, sorting on arrival from the sheet, `asOf` resolution including the honest
130 lb fallback, and the cable lateral raise being loggable but unranked.

```bash
osascript -l JavaScript tests/weight_test.js
```

Every case in `sync_test.js` started as a reproduction of a bug that shipped. Adding a
failing test first is the point — several of these "obviously correct" paths
passed review and still lost data.

Note: osascript evaluates the file and then its trailing expression, so `run()`
can execute twice in one process. It resets all shared state on entry so the
second pass is meaningful rather than a cascade of stale-state failures.
