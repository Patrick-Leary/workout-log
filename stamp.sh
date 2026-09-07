#!/bin/sh
# Cache-bust the asset URLs in index.html from the assets' own mtimes.
# No build step by design, so this is run by hand before committing a change to
# app.js or style.css. Without it the browser serves a stale script against a
# fresh index.html — which cost several debugging rounds on 2026-09-07 and made
# every deploy need a manual hard-refresh.
cd "$(dirname "$0")"
V=$(python3 -c "import os;print(max(int(os.path.getmtime(f)) for f in ['scripts/app.js','styles/style.css']))")
python3 - "$V" <<'PY'
import re,sys
v=sys.argv[1]; p='index.html'; s=open(p).read()
s=re.sub(r'href="styles/style\.css(\?v=\d+)?"', f'href="styles/style.css?v={v}"', s)
s=re.sub(r'src="scripts/app\.js(\?v=\d+)?"',   f'src="scripts/app.js?v={v}"',   s)
open(p,'w').write(s); print("stamped", v)
PY
