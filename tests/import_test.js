ObjC.import('Foundation');
function slurp(p){ return ObjC.unwrap($.NSString.alloc.initWithContentsOfFileEncodingError(p,4,null)); }

const CWD = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
const APP = CWD + '/scripts/app.js';
const SRC = slurp(APP);
if (!SRC) {
  console.log('Could not read ' + APP + '\nRun this from the repo root:\n' +
              '  osascript -l JavaScript tests/import_test.js');
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
const server = { foodsSent: [], foodRows: [] };
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  const reply = j => ({ ok:true, status:200, json: async () => j });
  if (body._type === 'fetch') {
    return reply({ status:'ok', workouts:[], weightLog:[],
                   foods: JSON.parse(JSON.stringify(server.foodRows)), nutrition:[] });
  }
  if (body._type === 'foods') {
    server.foodsSent.push(JSON.parse(JSON.stringify(body.foods)));
    return reply({ status:'ok', added: body.foods.length, updated: 0 });
  }
  return reply({ status:'ok' });
};

// ── load app.js ──────────────────────────────────────────────────────────
try { (0,eval)(SRC + '\n;globalThis.__app = {'
  + ' parseFoodBlocks, importNum, slugifyFoodKey, normalizeMeal, normImportKey,'
  + ' commitImportFoods, commitImportItems, FOOD_MACROS,'
  + ' get importParsed(){return importParsed;}, set importParsed(v){importParsed=v;},'
  + ' get nutrition(){return nutrition;}, set nutrition(v){nutrition=v;},'
  + ' get foods(){return foods;}, set foods(v){foods=v;},'
  + ' get foodDirty(){return foodDirty;}, set foodDirty(v){foodDirty=v;},'
  + ' get foodQueue(){return foodQueue;}, set foodQueue(v){foodQueue=v;},'
  + ' get sheetsUrl(){return sheetsUrl;}, set sheetsUrl(v){sheetsUrl=v;},'
  + ' get currentFoodDate(){return currentFoodDate;}, set currentFoodDate(v){currentFoodDate=v;} };');
} catch (e) { console.log('LOAD FAIL: ' + e.message); throw e; }

const A = globalThis.__app;
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  [' + extra + ']' : '')); }
}
const drain = () => new Promise(r => setTimeout(r, 0));

async function run() {
  pass = 0; fail = 0;
  server.foodsSent = []; server.foodRows = [];
  A.nutrition = []; A.foods = []; A.foodDirty = []; A.foodQueue = [];
  A.sheetsUrl = 'https://example.test/exec';
  A.currentFoodDate = '2026-09-12';

  // ── A: the blank-vs-zero contract, which is the whole point ────────────
  const label = [
    'FOOD',
    'name: Olipop Cherry Vanilla',
    'brand: Olipop',
    'serving: 1 can (355 mL)',
    'cal: 40',
    'p: 0',
    'c: 13',
    'fib: 6',
    'trans: 0',
    'na: 30 mg',
    'verified: yes',
    'END',
  ].join('\n');
  let r = A.parseFoodBlocks(label);
  check('A1: one FOOD block parses to one food, no items',
        r.foods.length === 1 && r.items.length === 0,
        'foods=' + r.foods.length + ' items=' + r.items.length);
  const f = r.foods[0];
  check('A2: a nutrient the label does not list is null, not 0',
        f.fat === null && f.sat === null && f.b12 === null,
        'fat=' + f.fat + ' sat=' + f.sat);
  check('A3: an explicit 0 survives as 0 — "0g trans fat" is a fact', f.trans === 0, 'trans=' + f.trans);
  check('A4: a stated 0 protein is 0, not unknown', f.p === 0, 'p=' + f.p);
  check('A5: units are stripped', f.na === 30, 'na=' + f.na);
  check('A6: serving is kept verbatim', f.serving === '1 can (355 mL)', f.serving);

  // ── B: value tolerances ────────────────────────────────────────────────
  check('B1: "n/a" is unknown', A.importNum('n/a') === null);
  check('B2: "—" is unknown', A.importNum('—') === null);
  check('B3: "" is unknown', A.importNum('') === null);
  check('B4: "0" is zero, not unknown', A.importNum('0') === 0);
  check('B5: commas are stripped', A.importNum('1,200 mg') === 1200, String(A.importNum('1,200 mg')));
  check('B6: decimals survive', A.importNum('2.5 g') === 2.5);
  check('B7: "<1 g" records the midpoint rather than 0 or 1', A.importNum('<1 g') === 0.5,
        String(A.importNum('<1 g')));
  r = A.parseFoodBlocks('FOOD\nname: Dot\'s pretzels\ncal: 140\nfib: <1 g\nEND');
  check('B8: a "<" reading is flagged, not laundered',
        r.foods[0]._flags.some(x => x.indexOf('<1 g') >= 0), r.foods[0]._flags.join('|'));

  // ── C: aliases, because a model will not always use the short key ──────
  check('C1: Protein -> p', A.normImportKey('Protein') === 'p');
  check('C2: "Saturated Fat" -> sat', A.normImportKey('Saturated Fat') === 'sat');
  check('C3: "Added Sugars" -> addsug', A.normImportKey('Added Sugars') === 'addsug');
  check('C4: "Vitamin B12" -> b12', A.normImportKey('Vitamin B12') === 'b12');
  check('C5: Sodium -> na', A.normImportKey('Sodium') === 'na');
  check('C6: Potassium -> k', A.normImportKey('Potassium') === 'k');
  check('C7: a short key passes through untouched', A.normImportKey('fib') === 'fib');

  // ── D: keys, so a re-import updates instead of duplicating ─────────────
  check('D1: key is slugged from brand + name',
        A.slugifyFoodKey('Cherry Vanilla', 'Olipop') === 'olipop-cherry-vanilla',
        A.slugifyFoodKey('Cherry Vanilla', 'Olipop'));
  check('D2: brand is not doubled when the name already carries it',
        A.slugifyFoodKey('Olipop Cherry', 'Olipop') === 'olipop-cherry',
        A.slugifyFoodKey('Olipop Cherry', 'Olipop'));
  r = A.parseFoodBlocks('FOOD\nname: Test\nkey: My Key\ncal: 1\nEND');
  check('D3: an explicit key is normalised to a slug', r.foods[0].key === 'my-key', r.foods[0].key);

  // ── E: the guard — an estimate must never become a database row ────────
  const meal = [
    'Here is my read on the plate.',
    '```',
    'ITEM',
    'name: cafeteria chipotle chicken bowl',
    'meal: Lunch',
    'qty: 1',
    'cal: 640',
    'p: 44',
    'conf: low',
    'END',
    '```',
    '# portion assumed at 1.5 cups of rice',
    'RUNNING TOTAL: 1,240 cal / 82g P',
  ].join('\n');
  r = A.parseFoodBlocks(meal);
  check('E1: an ITEM block produces an item and NOTHING in the database',
        r.items.length === 1 && r.foods.length === 0,
        'foods=' + r.foods.length + ' items=' + r.items.length);
  check('E2: an ITEM is an estimate by default', r.items[0].source === 'estimate', r.items[0].source);
  check('E3: confidence is carried through', r.items[0].conf === 'low');
  check('E4: prose, fences, # comments and RUNNING TOTAL are ignored',
        r.items[0].name === 'cafeteria chipotle chicken bowl' && r.warnings.length === 0,
        r.items[0].name + ' warnings=' + r.warnings.length);
  check('E5: an unasserted verified stays UNSTATED at parse time — only an unstated ' +
        'value can preserve what the sheet already holds',
        A.parseFoodBlocks('FOOD\nname: x\ncal: 1\nEND').foods[0].verified === '',
        JSON.stringify(A.parseFoodBlocks('FOOD\nname: x\ncal: 1\nEND').foods[0].verified));
  check('E5b: an asserted yes/no is carried',
        A.parseFoodBlocks('FOOD\nname: x\nverified: yes\nEND').foods[0].verified === 'yes' &&
        A.parseFoodBlocks('FOOD\nname: x\nverified: no\nEND').foods[0].verified === 'no');
  r = A.parseFoodBlocks('ITEM\nname: bagel\nsrc: label\ncal: 250\nEND');
  check('E6: even "src: label" on an ITEM stays an item, never a Foods row',
        r.items.length === 1 && r.foods.length === 0 && r.items[0].source === 'label');

  // ── F: defaults and malformed input ────────────────────────────────────
  r = A.parseFoodBlocks('ITEM\nname: thing\ncal: 10\nEND');
  check('F1: qty defaults to 1', r.items[0].qty === 1);
  check('F2: conf defaults to med', r.items[0].conf === 'med');
  check('F3: an unparseable meal falls back to the clock, not to garbage',
        ['Breakfast','Lunch','Snack','Dinner'].includes(
          A.parseFoodBlocks('ITEM\nname: t\nmeal: brunch\ncal: 1\nEND').items[0].meal));
  check('F4: qty 0 is corrected to 1',
        A.parseFoodBlocks('ITEM\nname: t\nqty: 0\ncal: 1\nEND').items[0].qty === 1);
  r = A.parseFoodBlocks('FOOD\ncal: 100\nEND');
  check('F5: a nameless block is skipped with a warning, not silently dropped',
        r.foods.length === 0 && r.warnings.length === 1, 'warnings=' + r.warnings.length);
  r = A.parseFoodBlocks('FOOD\nname: t\ncal: 1\nglycemicindex: 55\nEND');
  check('F6: an unknown field is ignored and reported',
        r.foods[0]._flags.some(x => x.indexOf('glycemicindex') >= 0), r.foods[0]._flags.join('|'));
  r = A.parseFoodBlocks('FOOD\nname: a\ncal: 1\n\nFOOD\nname: b\ncal: 2');
  check('F7: a second block closes the first, with or without END',
        r.foods.length === 2 && r.foods[0].name === 'a' && r.foods[1].name === 'b',
        'n=' + r.foods.length);
  check('F8: empty input yields nothing rather than throwing',
        A.parseFoodBlocks('').foods.length === 0 && A.parseFoodBlocks('hello').items.length === 0);

  // ── G: the wire — unknowns must be OMITTED, not sent as null ───────────
  A.importParsed = A.parseFoodBlocks(label);
  await A.commitImportFoods(); await drain();
  check('G1: one Foods payload was sent', server.foodsSent.length === 1,
        'n=' + server.foodsSent.length);
  const sent = server.foodsSent[0][0] || {};
  check('G2: a nutrient the label lacked is ABSENT from the payload — sending null ' +
        'would blank a cell the sheet already had',
        !('fat' in sent) && !('b12' in sent), Object.keys(sent).join(','));
  check('G3: a stated 0 IS sent', sent.trans === 0 && sent.p === 0,
        'trans=' + sent.trans + ' p=' + sent.p);
  check('G4: identity fields are sent', sent.key === 'olipop-cherry-vanilla' &&
        sent.verified === 'yes' && sent.brand === 'Olipop', JSON.stringify(sent));
  check('G5: committed rows are cleared from the review list',
        A.importParsed.foods.length === 0);

  // ── H: items land locally and wait for Save Day ─────────────────────────
  server.foodsSent = [];
  A.nutrition = []; A.foodDirty = []; A.foodQueue = [];
  A.importParsed = A.parseFoodBlocks(meal);
  A.commitImportItems();
  check('H1: the item is added to the current day',
        A.nutrition.length === 1 && A.nutrition[0].date === '2026-09-12',
        'n=' + A.nutrition.length);
  check('H2: the day is marked dirty', A.foodDirty.includes('2026-09-12'));
  check('H3: importing does NOT sync — Save Day owns the write and its baseline',
        A.foodQueue.length === 0 && server.foodsSent.length === 0);
  check('H4: the row carries source and confidence into the log',
        A.nutrition[0].source === 'estimate' && A.nutrition[0].conf === 'low');
  check('H5: an omitted MICRO stays null on the logged row, an omitted CORE macro ' +
        'floors to 0 — the same split nutVal() enforces on every other path',
        A.nutrition[0].vitk === null && A.nutrition[0].fat === 0,
        'vitk=' + A.nutrition[0].vitk + ' fat=' + A.nutrition[0].fat);

  // ── I: a partial update (micronutrients only, no calories) ─────────────
  server.foodsSent = [];
  A.importParsed = A.parseFoodBlocks('FOOD\nkey: huel-black-rtd\nname: Huel Black RTD\nvite: 4.2\nvitk: 22\nEND');
  check('I1: a block with no calories is flagged as a partial update',
        A.importParsed.foods[0]._flags.some(x => x.indexOf('partial') >= 0),
        A.importParsed.foods[0]._flags.join('|'));
  await A.commitImportFoods(); await drain();
  const part = server.foodsSent[0][0] || {};
  check('I2: a partial update carries only what it knows',
        part.vite === 4.2 && part.vitk === 22 && !('cal' in part), Object.keys(part).join(','));

  // ── J: a PARTIAL block must not overwrite fields it never mentioned ────
  // The designed-for case: a label lists 11 of 25 nutrients, or a follow-up
  // fills in one looked-up micro. Both used to clobber Serving and Verified.
  server.foodsSent = [];
  A.foods = [{ key:'olipop-cherry', name:'Olipop', serving:'1 can (355 mL)', verified:true, cal:40 }];
  A.importParsed = A.parseFoodBlocks('FOOD\nkey: olipop-cherry\nname: Olipop\nmg: 14\nEND');
  await A.commitImportFoods(); await drain();
  let p = server.foodsSent[0][0] || {};
  check('J1: a partial update OMITS serving, so the real one survives',
        !('serving' in p), JSON.stringify(p));
  check('J2: a partial update OMITS verified, so a label-verified row is not demoted',
        !('verified' in p), JSON.stringify(p));
  check('J3: it still sends what it does know', p.mg === 14 && p.key === 'olipop-cherry');

  server.foodsSent = []; A.foods = [];
  A.importParsed = A.parseFoodBlocks('FOOD\nname: Brand New Thing\ncal: 10\nEND');
  await A.commitImportFoods(); await drain();
  p = server.foodsSent[0][0] || {};
  check('J4: a NEW row with nothing to preserve is written as verified=no',
        p.verified === 'no', JSON.stringify(p));
  check('J5: a new row with no serving stated does not invent one',
        !('serving' in p), JSON.stringify(p));

  server.foodsSent = [];
  A.importParsed = A.parseFoodBlocks(
    'FOOD\nname: Labelled\nserving: 1 bar (60g)\nverified: yes\ncal: 190\nEND');
  await A.commitImportFoods(); await drain();
  p = server.foodsSent[0][0] || {};
  check('J6: an asserted serving and verified ARE sent',
        p.serving === '1 bar (60g)' && p.verified === 'yes', JSON.stringify(p));

  // ── K: an ITEM key has to match the database or it is silently orphaned ─
  A.foods = [{ key:'kirkland-protein-bar', name:'Kirkland protein bar', cal:190 }];
  let ir = A.parseFoodBlocks('ITEM\nname: Kirkland protein bar\nkey: Kirkland-Protein-Bar\ncal: 190\nEND');
  check('K1: an ITEM key is slugged like a FOOD key',
        ir.items[0].key === 'kirkland-protein-bar', ir.items[0].key);
  check('K2: the slugged key actually resolves against the database — a row that ' +
        'looks linked and behaves unlinked is invisible to scanDrift()',
        A.foods.some(f => f.key === ir.items[0].key));

  // ── L: core macros floor at 0, micros stay unknown — as everywhere else ─
  A.nutrition = []; A.foodDirty = [];
  A.importParsed = A.parseFoodBlocks('ITEM\nname: plate\ncal: 640\np: 41\nEND');
  A.commitImportItems();
  const row = A.nutrition[0];
  check('L1: an omitted CORE macro lands as 0, not null — nothing marks a null ' +
        'core macro in the totals, so it read as a confident wrong number',
        row.fib === 0 && row.fat === 0 && row.sat === 0, 'fib=' + row.fib + ' fat=' + row.fat);
  check('L2: an omitted MICRO still lands as null', row.vitk === null && row.zn === null,
        'vitk=' + row.vitk);
  check('L3: stated values are untouched', row.cal === 640 && row.p === 41);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
}
if (!globalThis.__ran) { globalThis.__ran = true; run().catch(e => console.log('THREW: ' + (e && e.message))); }
