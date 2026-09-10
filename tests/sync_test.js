ObjC.import('Foundation');
function slurp(p){ return ObjC.unwrap($.NSString.alloc.initWithContentsOfFileEncodingError(p,4,null)); }

// Resolved from the working directory, not hardcoded. An absolute path with a
// username in it works on exactly one machine and silently rots everywhere
// else — including the Windows half of this repo's sync and any fresh clone.
const CWD = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
const APP = CWD + '/scripts/app.js';
const SRC = slurp(APP);
if (!SRC) {
  console.log('Could not read ' + APP + '\nRun this from the repo root:\n' +
              '  osascript -l JavaScript tests/sync_test.js');
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
console.error = console.error || ((...a) => {});
console.warn  = console.warn  || ((...a) => {});
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
const server = { rows: [], log: [] };
function latestSavedAtForDate(date){
  let newest = "";
  server.rows.forEach(r => { if (r.date === date && String(r.savedAt||"") > newest) newest = String(r.savedAt||""); });
  return newest;
}
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  server.log.push(body._type || (body._delete ? 'delete' : 'workout'));
  const reply = j => ({ ok:true, status:200, json: async () => j });

  if (body._type === 'fetch') {
    return reply({ status:'ok', workouts:[], weightLog:[], foods:[],
                   nutrition: JSON.parse(JSON.stringify(server.rows)) });
  }
  if (body._type === 'food') {
    // mirrors appsscript.js staleWrite()
    if (body._base !== undefined && body._base !== null) {
      const current = latestSavedAtForDate(body.date);
      if (current && current !== String(body._base)) {
        return reply({ status:'conflict', date: body.date, serverSavedAt: current,
                       message:'This day was changed on another device' });
      }
    }
    const savedAt = body.savedAt || new Date().toISOString();
    server.rows = server.rows.filter(r => r.date !== body.date);
    (body.items||[]).forEach(it => server.rows.push({ ...it, date: body.date, savedAt }));
    return reply({ status:'ok' });
  }
  return reply({ status:'ok' });
};

// ── load app.js ──────────────────────────────────────────────────────────
try { (0,eval)(SRC + '\n;globalThis.__app = { get nutrition(){return nutrition;}, set nutrition(v){nutrition=v;},'
  + ' get foodDirty(){return foodDirty;}, set foodDirty(v){foodDirty=v;},'
  + ' get sheetsUrl(){return sheetsUrl;}, set sheetsUrl(v){sheetsUrl=v;},'
  + ' get currentFoodDate(){return currentFoodDate;}, set currentFoodDate(v){currentFoodDate=v;},'
  + ' saveFoodDay, syncFoodToSheets, fetchFromSheets, baseSavedAt, markFoodDirty, newFoodId, retryQueue, get foodQueue(){return foodQueue;}, set foodQueue(v){foodQueue=v;}, get syncedAt(){return syncedAt;}, set syncedAt(v){syncedAt=v;}, get syncedFrom(){return syncedFrom;}, set syncedFrom(v){syncedFrom=v;}, discardLocalDay,'
  + ' get lastSyncLabel(){return __lastSyncLabel;} };');
} catch (e) { console.log('LOAD FAIL: ' + e.message); throw e; }

// capture user-visible status + toasts (function decls land on globalThis here)
let STATUS = null, TOASTS = [];
globalThis.setSyncStatus = (state,label) => { STATUS = { state, label }; };
globalThis.showToast     = (msg)         => { TOASTS.push(String(msg)); };
globalThis.updateQueueStatus = () => {};
globalThis.renderFoodTab     = () => {};
globalThis.renderProgress    = () => {};

const A = globalThis.__app;
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('ok    ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  → ' + detail : '')); }
}
const DATE = '2026-09-09';
// saveFoodDay() fires syncFoodToSheets() WITHOUT awaiting it, so the caller
// returns before the write lands. Drain microtasks so assertions see the result.
async function drain(){ for (let i=0;i<200;i++) await Promise.resolve(); }

async function run() {
  // osascript evaluates the file and then its trailing expression, so run()
  // can execute twice in one process. Reset everything it touches or the
  // second pass inherits the first pass's server and fails meaninglessly.
  pass = 0; fail = 0; STATUS = null; TOASTS = [];
  server.rows = []; server.log = [];
  A.nutrition = []; A.foodDirty = []; A.foodQueue = []; A.syncedAt = {}; A.syncedFrom = '';
  A.sheetsUrl = 'https://fake/exec';
  A.currentFoodDate = DATE;

  // ── seed: server already has 2 rows written by another client at T0 ──
  server.rows = [
    { date: DATE, meal:'Lunch', key:'a', name:'A', qty:1, cal:100, savedAt:'2026-09-09T10:00:00.000Z' },
    { date: DATE, meal:'Lunch', key:'b', name:'B', qty:1, cal:200, savedAt:'2026-09-09T10:00:00.000Z' },
  ];
  await A.fetchFromSheets(); await drain();
  check('fetch pulled the 2 server rows', A.nutrition.filter(n=>n.date===DATE).length === 2,
        'got ' + A.nutrition.filter(n=>n.date===DATE).length);

  // ── user adds an item locally and saves (save #1) ──
  A.nutrition.push({ id:A.newFoodId(), date:DATE, meal:'Snack', key:'c', name:'C', qty:1, cal:50 });
  A.markFoodDirty(DATE);
  await A.saveFoodDay(); await drain();
  check('save #1 reached the server', server.rows.filter(r=>r.date===DATE).length === 3,
        'server has ' + server.rows.filter(r=>r.date===DATE).length);
  check('save #1 reported Synced', STATUS && STATUS.state === 'ok',
        STATUS && STATUS.label);

  // ── THE BUG: user edits again the same day and saves (save #2) ──
  const serverAfter1 = latestSavedAtForDate(DATE);
  const localBase    = A.baseSavedAt('food', DATE);
  check('B1: local _base matches server after save #1', localBase === serverAfter1,
        'local=' + localBase + ' server=' + serverAfter1);

  A.nutrition.push({ id:A.newFoodId(), date:DATE, meal:'Dinner', key:'d', name:'D', qty:1, cal:300 });
  A.markFoodDirty(DATE);
  TOASTS = [];
  await A.saveFoodDay(); await drain();
  check('B2: save #2 reached the server', server.rows.filter(r=>r.date===DATE).length === 4,
        'server has ' + server.rows.filter(r=>r.date===DATE).length);
  check('B3: save #2 did not report a bogus conflict',
        !TOASTS.some(t => /changed on another device/i.test(t)), TOASTS.join(' | '));

  // ── the honesty bug: fetch says "Synced" while skipping dirty dates ──
  A.foodDirty = [DATE];
  A.nutrition = A.nutrition.filter(n => n.date !== DATE)
    .concat([{ id:'x', date:DATE, meal:'Snack', key:'local', name:'LOCAL ONLY', qty:1, cal:1 }]);
  server.rows = [{ date:DATE, meal:'Lunch', key:'srv', name:'SERVER ONLY', qty:1, cal:999,
                   savedAt:'2026-09-09T23:00:00.000Z' }];
  await A.fetchFromSheets(); await drain();
  const showsServer = A.nutrition.some(n => n.name === 'SERVER ONLY');
  check('B4: fetch that skipped a dirty day does NOT claim plain "Synced"',
        !(STATUS && STATUS.state === 'ok' && /^Synced$/.test(STATUS.label)) || showsServer,
        'status=' + JSON.stringify(STATUS) + ' showsServerRow=' + showsServer);

  // ── save #3, same day: the failure mode compounds ──────────────────────
  A.foodDirty = []; A.nutrition = []; server.rows = [];
  A.currentFoodDate = DATE;
  for (let i = 1; i <= 3; i++) {
    A.nutrition.push({ id:A.newFoodId(), date:DATE, meal:'Snack', key:'s'+i, name:'S'+i, qty:1, cal:10 });
    A.markFoodDirty(DATE);
    TOASTS = [];
    await A.saveFoodDay(); await drain();
    check('C' + i + ': save #' + i + ' of the day landed',
          server.rows.filter(r => r.date === DATE).length === i,
          'server has ' + server.rows.filter(r => r.date === DATE).length);
  }

  // ── a genuine external write must STILL conflict (guard not defanged) ──
  server.rows.forEach(r => { if (r.date === DATE) r.savedAt = '2099-01-01T00:00:00.000Z'; });
  A.nutrition.push({ id:A.newFoodId(), date:DATE, meal:'Snack', key:'z', name:'Z', qty:1, cal:10 });
  A.markFoodDirty(DATE);
  TOASTS = [];
  await A.saveFoodDay(); await drain();
  check('D1: a real external change is still caught as a conflict',
        TOASTS.some(t => /changed on another device/i.test(t)), TOASTS.join(' | '));
  check('D2: a rejected save does NOT report "Saved ✓"',
        !TOASTS.some(t => /Saved \d+ item/.test(t)), TOASTS.join(' | '));
  check('D3: a rejected save is queued for retry', A.foodDirty.includes(DATE));

  // ── E: the WEDGE. Arrive in the state a pre-fix localStorage leaves behind:
  //    server is ahead of every local savedAt, and the date has unsaved edits
  //    so fetch refuses to refresh it. Before the recovery fix this could never
  //    drain — every retry recomputed the same stale base and failed forever.
  A.foodDirty = []; A.nutrition = []; server.rows = []; A.syncedAt = {}; A.syncedFrom = '';
  A.currentFoodDate = DATE;
  server.rows = [{ date:DATE, meal:'Lunch', key:'srv', name:'SRV', qty:1, cal:1,
                   savedAt:'2030-01-01T00:00:00.000Z' }];
  A.nutrition = [{ id:'l1', date:DATE, meal:'Snack', key:'l', name:'L', qty:1, cal:5,
                   savedAt:'2020-01-01T00:00:00.000Z' }];
  A.markFoodDirty(DATE);

  TOASTS = [];
  await A.saveFoodDay(); await drain();
  check('E1: first attempt conflicts (guard still works)',
        TOASTS.some(t => /changed on another device/i.test(t)), TOASTS.join(' | '));
  check('E2: server untouched by the rejected write',
        server.rows.filter(r => r.date === DATE).length === 1);

  TOASTS = [];
  await A.saveFoodDay(); await drain();
  check('E3: pressing Save again now drains instead of wedging',
        server.rows.filter(r => r.date === DATE).some(r => r.key === 'l'),
        'server keys: ' + server.rows.filter(r=>r.date===DATE).map(r=>r.key).join(','));
  check('E4: day is no longer marked dirty once it lands', !A.foodDirty.includes(DATE));

  // ── F: an undefined _base bypasses the guard completely ────────────────
  //    The client infers "never synced this date" from "no local row carries a
  //    savedAt". But that is also true when the date was fetched while EMPTY and
  //    rows were added on the server afterwards — i.e. exactly when Claude writes
  //    to a day the phone has open.
  A.foodDirty = []; A.nutrition = []; server.rows = []; A.syncedAt = {}; A.syncedFrom = '';
  A.currentFoodDate = DATE;
  await A.fetchFromSheets(); await drain();       // phone syncs while the day is EMPTY
  server.rows = [{ date:DATE, meal:'Lunch', key:'agent1', name:'written elsewhere', qty:1, cal:500,
                   savedAt:'2026-09-09T18:00:00.000Z' }];   // Claude writes afterwards
  A.nutrition.push({ id:'p1', date:DATE, meal:'Snack', key:'phone', name:'phone item', qty:1, cal:10 });
  A.markFoodDirty(DATE);
  TOASTS = [];
  await A.saveFoodDay(); await drain();
  const survived = server.rows.filter(r => r.date === DATE).some(r => r.key === 'agent1');
  check('F1: a write with no local savedAt must NOT silently wipe server rows',
        survived, 'server keys now: ' + server.rows.filter(r=>r.date===DATE).map(r=>r.key).join(','));

  // ── G: retryQueue replays a frozen snapshot, then clears the dirty flag ──
  A.foodDirty = []; A.nutrition = []; server.rows = []; A.syncedAt = {}; A.syncedFrom = '';
  A.currentFoodDate = DATE;
  globalThis.__failNext = true;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u,o) => {
    const b = JSON.parse(o.body);
    if (b._type === 'food' && globalThis.__failNext) { globalThis.__failNext = false; throw new Error('network down'); }
    return realFetch(u,o);
  };
  A.nutrition.push({ id:'g1', date:DATE, meal:'Snack', key:'first', name:'first', qty:1, cal:10 });
  A.markFoodDirty(DATE);
  await A.saveFoodDay(); await drain();          // fails -> snapshot queued
  A.nutrition.push({ id:'g2', date:DATE, meal:'Snack', key:'second', name:'second', qty:1, cal:20 });
  A.markFoodDirty(DATE);
  await A.retryQueue(); await drain();           // replays the OLD snapshot
  globalThis.fetch = realFetch;
  const keys = server.rows.filter(r=>r.date===DATE).map(r=>r.key);
  check('G1: retry must not drop edits made after the failed save',
        keys.includes('second'), 'server keys: ' + keys.join(','));
  check('G2: a day whose later edits were dropped must stay dirty',
        keys.includes('second') || A.foodDirty.includes(DATE),
        'dirty=' + A.foodDirty.includes(DATE) + ' keys=' + keys.join(','));

  // ── H: the escape hatch drops the shield for one date, on purpose ──────
  A.foodDirty = []; A.nutrition = []; server.rows = []; A.syncedAt = {}; A.syncedFrom = '';
  A.currentFoodDate = DATE;
  server.rows = [{ date:DATE, meal:'Lunch', key:'truth', name:'sheet version', qty:1, cal:42,
                   savedAt:'2026-09-09T20:00:00.000Z' }];
  A.nutrition = [{ id:'bad', date:DATE, meal:'Snack', key:'junk', name:'bad local', qty:1, cal:9 }];
  A.markFoodDirty(DATE);
  await A.fetchFromSheets(); await drain();
  check('H1: a dirty day is shielded from a normal fetch',
        A.nutrition.some(n => n.key === 'junk') && !A.nutrition.some(n => n.key === 'truth'));
  await A.discardLocalDay(DATE); await drain();
  check('H2: discard replaces the day with the sheet version',
        A.nutrition.some(n => n.key === 'truth') && !A.nutrition.some(n => n.key === 'junk'),
        'keys: ' + A.nutrition.filter(n=>n.date===DATE).map(n=>n.key).join(','));
  check('H3: discard clears the dirty flag and the queue',
        !A.foodDirty.includes(DATE) && !A.foodQueue.some(q => q.date === DATE));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
}
if (!globalThis.__ran) { globalThis.__ran = true; run().catch(e => console.log('THREW: ' + (e && e.message))); }
