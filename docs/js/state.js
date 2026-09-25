// =====================================================================
//  STATE - the whole save file, and how it gets to and from disk
//  One plain object. Anything not in here is derived on the fly, so a
//  save can never disagree with itself.
// =====================================================================

const SAVE_KEY = 'tato-trash-empire';
const SAVE_VERSION = 5;

let S = null;

// Everything a single level owns. Ranking up throws this away and calls
// it again; anything NOT in here survives into the next level.
function freshZone() {
  const assigned = {}, collected = {}, unlocked = {}, starSteps = {},
        pendingStars = {}, progress = {}, running = {}, trades = {};

  TIERS.forEach(function (t, i) {
    assigned[t.id]     = (i === 0) ? 1 : 0;   // the first pile opens with one raccoon
    collected[t.id]    = 0;
    starSteps[t.id]    = 0;
    pendingStars[t.id] = 0;
    progress[t.id]     = 0;
    running[t.id]      = false;
    unlocked[t.id]     = (i === 0);
  });
  TRADES.forEach(function (t) { trades[t.id] = 0; });

  const slots = [];
  for (let i = 0; i < MISSION_SLOTS; i++) slots.push(i);

  return {
    ratoni:      CFG.startRatoni,
    ratoniTotal: CFG.startRatoni,
    plastic:      CFG.startPlastic,
    plasticTotal: 0,

    assigned: assigned, collected: collected, starSteps: starSteps,
    pendingStars: pendingStars, progress: progress, running: running,
    unlocked: unlocked, trades: trades,

    slots: slots,
    missionNext: MISSION_SLOTS,
    rankProgress: 0,          // boxes filled on the rank bar
  };
}

function freshState() {
  const cards = {}, mgrLevel = {};
  MANAGERS.forEach(function (m) { cards[m.id] = 0; mgrLevel[m.id] = 0; });

  return Object.assign({
    v: SAVE_VERSION,

    // ---- carried between levels ----
    level:      1,
    cards:      cards,
    mgrLevel:   mgrLevel,
    stars:      0,
    starsTotal: 0,

    bulk:     1,
    muted:    false,
    lastSeen: Date.now(),
    started:  Date.now(),
  }, freshZone());
}

function save() {
  S.lastSeen = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) {
    // private mode, full quota - the game keeps running, it just forgets
  }
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
  if (!raw) { S = freshState(); return false; }

  let data;
  try { data = JSON.parse(raw); } catch (e) { S = freshState(); return false; }

  // A save from before the rewrite describes a different game; start over
  // rather than half-restoring it.
  if (data.v !== SAVE_VERSION) { S = freshState(); return false; }

  // Merge over a fresh state rather than trusting the file's shape. Rows,
  // managers and deals added in an update then simply appear.
  const base = freshState();
  S = Object.assign(base, data);
  ['assigned', 'collected', 'starSteps', 'pendingStars', 'progress', 'running', 'unlocked',
   'cards', 'mgrLevel', 'trades'].forEach(function (k) {
    S[k] = Object.assign(base[k], data[k] || {});
  });
  if (!Array.isArray(S.slots) || S.slots.length !== MISSION_SLOTS) S.slots = base.slots;
  return true;
}

// Ranking up: throw away the level, keep the player.
function resetZone() {
  Object.assign(S, freshZone());
}

function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  S = freshState();
}
