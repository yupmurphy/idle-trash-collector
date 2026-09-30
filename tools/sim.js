// =====================================================================
//  SIM - how long does a rank actually take?
//
//  Tuning mission targets by eye does not work: a target is a number of
//  plastic, and how long that takes depends on the whole compounding
//  chain underneath it. So this runs THE REAL ENGINE headless - the same
//  data.js and engine.js the game ships - and plays it with a fixed
//  policy, then prints the wall-clock time each rank took.
//
//  Run:  node tools/sim.js            first 6 ranks, summary
//        node tools/sim.js 10         first 10 ranks
//        node tools/sim.js 6 --tasks  also list every task and its time
//
//  The times are only as honest as PLAY below. It is written as a
//  reasonably sharp active player, not a perfect one: it taps whatever
//  has no manager, always spends on the deepest row it can afford, and
//  upgrades a manager the moment it can. A casual player will be slower.
// =====================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DOCS = path.join(__dirname, '..', 'docs', 'js');

// ---------------------------------------------------------------- load
// A stub localStorage is all the game needs off the browser; nothing in
// engine.js touches the DOM.
const store = {};
const ctx = {
  localStorage: {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem:  function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
  },
  Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array,
  isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, console: console,
};
vm.createContext(ctx);

['format.js', 'data.js', 'state.js', 'engine.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(DOCS, f), 'utf8'), ctx, { filename: f });
});

// `const Engine = ...` and `let S` are lexical declarations, so they never
// land on the context object - they have to be handed out from inside.
vm.runInContext(
  'globalThis.__sim = {' +
  '  get S() { return S; }, set S(v) { S = v; },' +
  '  Engine: Engine, TIERS: TIERS, MANAGERS: MANAGERS, TRADES: TRADES,' +
  '  CFG: CFG, LEVELS: LEVELS, MISSION_SLOTS: MISSION_SLOTS,' +
  '  MISSIONS: MISSIONS, freshState: freshState' +
  '};', ctx);

const G = ctx.__sim;
const { Engine, TIERS, MANAGERS, TRADES } = G;

// --scale=25 --assign=2.2 override the two difficulty dials for this run
// only, so the pair can be swept without editing data.js between tries.
process.argv.forEach(function (a) {
  let m = a.match(/^--scale=([\d.]+)$/);
  if (m) G.LEVELS.taskScalePerLevel = Number(m[1]);
  m = a.match(/^--assign=([\d.]+)$/);
  if (m) G.LEVELS.assignScalePerLevel = Number(m[1]);
});

// -------------------------------------------------------------- policy
const STEP = 1 / 30;          // the game's own tick rate
const DECIDE_EVERY = 0.25;    // how often the player is allowed to act

let CLOCK = 0;
let LOG = [];                 // one entry per task claimed

function PLAY() {
  const S = G.S;

  // 1. keep every manager-less pile running - this is the tapping
  TIERS.forEach(function (t) {
    if (!S.unlocked[t.id]) return;
    if (!Engine.hasManager(t) && !S.running[t.id] && S.assigned[t.id] > 0) Engine.tap(t.id);
    if (S.pendingStars[t.id] > 0) Engine.takeStars(t.id);
  });

  // 2. take anything that is finished. Claiming is what fills the rank
  //    bar, so a player never sits on a finished task.
  S.slots.forEach(function (idx, i) {
    if (!Engine.missionDone(idx)) return;
    const m = Engine.missionAt(idx);
    if (!m || !Engine.claim(i)) return;
    LOG.push({ rank: S.level, idx: idx, type: m.type,
               tier: m.tier || '', amount: m.amount, at: CLOCK });
  });

  // 3. spend stars the moment they are worth spending. Halving a cycle
  //    compounds, so this is always the strongest buy in the game.
  let moved = true;
  while (moved) {
    moved = false;
    MANAGERS.forEach(function (m) {
      if (Engine.canUpgrade(m.id)) { Engine.upgrade(m.id); moved = true; }
    });
  }

  // 4. more raccoons per second is permanent and never gets worse
  TRADES.forEach(function (tr) { while (Engine.buyTrade(tr.id)) {} });

  // 5. Assign raccoons to the DEEPEST row that can be afforded. Every
  //    row costs exactly one raccoon, so the raccoon is best spent as
  //    far up the chain as it will reach - that is the whole compounding
  //    argument. Falls back down the chain when plastic is short.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if (!S.unlocked[t.id]) continue;
    const q = Engine.buyQuote(t.id);
    if (q.can) { S.bulk = 'max'; Engine.assign(t.id); break; }
  }
}

// ----------------------------------------------------------------- run
function run(maxRank, listTasks) {
  G.S = G.freshState();
  const S = G.S;
  S.bulk = 'max';

  const ranks = [];
  CLOCK = 0; LOG = [];
  let clock = 0, sinceDecision = 0;
  const LIMIT = 60 * 60 * 40;      // 40 game-hours, then give up

  while (ranks.length < maxRank && clock < LIMIT) {
    Engine.tick(STEP);
    clock += STEP;
    CLOCK = clock;
    sinceDecision += STEP;

    if (sinceDecision >= DECIDE_EVERY) {
      sinceDecision = 0;
      PLAY();

      if (Engine.rankFull()) {
        const prev = ranks.length ? ranks[ranks.length - 1].at : 0;
        ranks.push({ rank: S.level, at: clock, took: clock - prev });
        Engine.rankUp();
      }
    }
  }
  return { ranks: ranks, tasks: LOG, clock: clock };
}

// --------------------------------------------------------------- print
function mmss(s) {
  if (s >= 3600) return (s / 3600).toFixed(2) + ' h';
  return Math.floor(s / 60) + 'm ' + String(Math.round(s % 60)).padStart(2, '0') + 's';
}

// What the design is aiming for, so the gap is visible without arithmetic.
function target(rank) {
  if (rank === 1) return 10 * 60;
  if (rank === 2) return 30 * 60;
  if (rank === 3) return 45 * 60;
  return 60 * 60 * Math.pow(1.15, rank - 4);
}

const maxRank = parseInt(process.argv[2], 10) || 6;
const listTasks = process.argv.includes('--tasks');
const out = run(maxRank, listTasks);

console.log('');
console.log('rank |      took |    target |  ratio | total elapsed');
console.log('-----+-----------+-----------+--------+--------------');
out.ranks.forEach(function (r) {
  const t = target(r.rank);
  const ratio = r.took / t;
  console.log(
    String(r.rank).padStart(4) + ' | ' +
    mmss(r.took).padStart(9) + ' | ' +
    mmss(t).padStart(9) + ' | ' +
    (ratio.toFixed(2) + 'x').padStart(6) + ' | ' +
    mmss(r.at)
  );
});

if (listTasks) {
  console.log('\nEvery task, and the gap since the one before it:\n');
  console.log('rank |  # | task                          |      gap | at');
  console.log('-----+----+-------------------------------+----------+---------');
  let prev = 0;
  out.tasks.forEach(function (t) {
    const label = (t.type + (t.tier ? ' ' + t.tier : '')).padEnd(14) +
                  String(t.amount).padStart(14);
    console.log(
      String(t.rank).padStart(4) + ' | ' +
      String(t.idx).padStart(2) + ' | ' + label + ' | ' +
      mmss(t.at - prev).padStart(8) + ' | ' + mmss(t.at));
    prev = t.at;
  });
}

if (out.ranks.length < maxRank) {
  console.log('\n(stopped at ' + mmss(out.clock) + ' of game time - rank ' +
              (out.ranks.length + 1) + ' never completed)');
}
console.log('');
