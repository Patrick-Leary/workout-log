ObjC.import('Foundation');
function slurp(p){ return ObjC.unwrap($.NSString.alloc.initWithContentsOfFileEncodingError(p,4,null)); }

const CWD = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
const APP = CWD + '/scripts/app.js';
const SRC = slurp(APP);
if (!SRC) {
  console.log('Could not read ' + APP + '\nRun this from the repo root:\n' +
              '  osascript -l JavaScript tests/weight_test.js');
  throw new Error('app.js not found');
}

// ── stubs ────────────────────────────────────────────────────────────────
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k,v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const noopEl = new Proxy({}, { get: (t,p) => {
  if (p === 'value') return '';
  if (p === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){return false;} };
  if (p === 'style') return {};
  if (p === 'dataset') return {};
  return typeof p === 'string' && p.startsWith('on') ? null : (()=>noopEl);
}, set: () => true });
globalThis.document = {
  getElementById: () => noopEl, querySelector: () => noopEl, querySelectorAll: () => [],
  addEventListener(){}, createElement: () => noopEl,
  body: noopEl, documentElement: noopEl,
};
globalThis.window = { addEventListener(){}, matchMedia: () => ({ matches:false, addEventListener(){} }),
                      location:{ hash:'', pathname:'/' }, history:{ pushState(){}, replaceState(){} } };
globalThis.navigator = { onLine: true };
globalThis.matchMedia = () => ({ matches:false, addEventListener(){}, addListener(){} });
globalThis.alert = () => {}; globalThis.confirm = () => true; globalThis.prompt = () => '';
globalThis.location = { hash:'', pathname:'/', href:'' };
globalThis.history  = { pushState(){}, replaceState(){} };
globalThis.addEventListener = () => {};
globalThis.setInterval = () => 0; globalThis.clearInterval = () => {};
globalThis.setTimeout = (fn) => { try { fn(); } catch(e){} return 0; };
globalThis.clearTimeout = () => {};
globalThis.requestAnimationFrame = (fn) => { try { fn(); } catch(e){} return 0; };

// ── fake server ──────────────────────────────────────────────────────────
// Records the Foods payloads verbatim: the omit-vs-null contract is only
// observable on the wire, so the tests assert on what was actually sent.
const server = { weightSent: [], weightRows: [] };
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  const reply = j => ({ ok:true, status:200, json: async () => j });
  if (body._type === 'fetch') {
    return reply({ status:'ok', workouts:[], foods:[], nutrition:[],
                   weightLog: JSON.parse(JSON.stringify(server.weightRows)) });
  }
  if (body._type === 'weight') { server.weightSent.push({...body}); return reply({ status:'ok' }); }
  return reply({ status:'ok' });
};

// ── load app.js ──────────────────────────────────────────────────────────
try { (0,eval)(SRC + '\n;globalThis.__app = {'
  + ' saveWeight, currentBodyweight, fetchFromSheets, todayISO, EXERCISES, stdForExercise, STD_REF_BW,'
  + ' get weightLog(){return weightLog;}, set weightLog(v){weightLog=v;},'
  + ' get currentLogDate(){return currentLogDate;}, set currentLogDate(v){currentLogDate=v;},'
  + ' get sheetsUrl(){return sheetsUrl;}, set sheetsUrl(v){sheetsUrl=v;} };');
} catch (e) { console.log('LOAD FAIL: ' + e.message); throw e; }

const A = globalThis.__app;
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  [' + extra + ']' : '')); }
}
const drain = () => new Promise(r => setTimeout(r, 0));

// The weight input is the only DOM value these tests need to vary.
let typed = '';
globalThis.document.getElementById = (id) =>
  id === 'weight-input' ? new Proxy({}, {
    get: (t,p) => p === 'value' ? typed : (p==='classList'
          ? {add(){},remove(){},toggle(){},contains(){return false}} : (()=>noopEl)),
    set: (t,p,v) => { if (p === 'value') typed = v; return true; } }) : noopEl;

async function run() {
  pass = 0; fail = 0;
  server.weightSent = []; server.weightRows = [];
  A.sheetsUrl = 'https://example.test/exec';

  // ── A: the input every rank divides by ─────────────────────────────────
  A.weightLog = []; A.currentLogDate = A.todayISO();
  typed = '57';                       // a scale left in kg — passes min=50
  await A.saveWeight(); await drain();
  check('A1: a kg reading is refused, not scaled into every rank',
        A.weightLog.length === 0, JSON.stringify(A.weightLog));
  typed = '900';
  await A.saveWeight(); await drain();
  check('A2: an absurd high value is refused', A.weightLog.length === 0);
  typed = '0';
  await A.saveWeight(); await drain();
  check('A3: zero is refused', A.weightLog.length === 0);
  typed = '127.4';
  await A.saveWeight(); await drain();
  check('A4: a real bodyweight is accepted and synced',
        A.weightLog.length === 1 && A.weightLog[0].weight === 127.4 &&
        server.weightSent.length === 1, JSON.stringify(A.weightLog));

  // ── B: a back-dated picker must not silently destroy a weigh-in ────────
  A.weightLog = [{ date: '2026-09-08', weight: 127.0 }];
  A.currentLogDate = '2026-09-08';           // left behind by a back-filled workout
  globalThis.confirm = () => false;          // user declines
  typed = '129.0';
  await A.saveWeight(); await drain();
  check('B1: declining the confirm leaves the older weigh-in intact',
        A.weightLog.length === 1 && A.weightLog[0].weight === 127.0,
        JSON.stringify(A.weightLog));
  globalThis.confirm = () => true;           // user means it
  typed = '129.0';
  await A.saveWeight(); await drain();
  check('B2: confirming still allows a deliberate back-dated correction',
        A.weightLog[0].weight === 129.0);
  A.currentLogDate = A.todayISO();
  globalThis.confirm = () => { throw new Error('should not prompt for today'); };
  typed = '128.0';
  await A.saveWeight(); await drain();
  check('B3: logging for TODAY never prompts',
        A.weightLog.some(e => e.date === A.todayISO() && e.weight === 128.0));
  globalThis.confirm = () => true;

  // ── C: the fetch path is no longer the one that skips sorting ──────────
  // Sheet ROW order, with a back-filled date last — what getWeightLog returns.
  server.weightRows = [
    { date: '2026-09-01', weight: 125.4 },
    { date: '2026-09-10', weight: 127.4 },
    { date: '2026-09-05', weight: 126.0 },
  ];
  A.weightLog = [];
  await A.fetchFromSheets(); await drain();
  const dates = A.weightLog.map(e => e.date);
  check('C1: weightLog is sorted on arrival, so the trend stat cannot read the ' +
        'wrong endpoints and report "too early" on a real gain',
        JSON.stringify(dates) === JSON.stringify(['2026-09-01','2026-09-05','2026-09-10']),
        dates.join(','));

  // ── D: bodyweight resolution, including the honest fallback ────────────
  check('D1: currentBodyweight takes the latest entry', A.currentBodyweight() === 127.4,
        String(A.currentBodyweight()));
  check('D2: asOf scopes to that date, so history is scored at its own weight',
        A.currentBodyweight('2026-09-05') === 126.0, String(A.currentBodyweight('2026-09-05')));
  check('D3: a date before every weigh-in falls back to the reference, not to 0',
        A.currentBodyweight('2026-08-01') === A.STD_REF_BW);
  A.weightLog = [];
  check('D4: no weigh-ins at all falls back to the reference',
        A.currentBodyweight() === A.STD_REF_BW);

  // ── E: the cable lateral raise is logged but not ranked ────────────────
  const lat = A.EXERCISES.find(e => e.id === 'latraise');
  check('E1: Cable is still a loggable variant', lat.variants.includes('Cable'));
  check('E2: Cable maps to NO standard — a two-arm bar total cannot be scored ' +
        'against a per-dumbbell curve', !A.stdForExercise(lat, 'Cable'),
        String(A.stdForExercise(lat, 'Cable')));
  // stdForExercise resolves the key to the STANDARDS object, so compare identity.
  const seated = A.stdForExercise(lat, 'Dumbbell seated');
  check('E3: the dumbbell variants keep theirs, and both resolve to the same curve',
        !!seated && seated === A.stdForExercise(lat, 'Dumbbell standing'),
        JSON.stringify(seated));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
}
if (!globalThis.__ran) { globalThis.__ran = true; run().catch(e => console.log('THREW: ' + (e && e.message))); }
