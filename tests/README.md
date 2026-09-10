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

Every case in it started as a reproduction of a bug that shipped. Adding a
failing test first is the point — several of these "obviously correct" paths
passed review and still lost data.

Note: osascript evaluates the file and then its trailing expression, so `run()`
can execute twice in one process. It resets all shared state on entry so the
second pass is meaningful rather than a cascade of stale-state failures.
