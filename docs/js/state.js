// =====================================================================
//  STATE - the whole save file, and how it gets to and from disk
//  One plain object. Anything not in here is derived on the fly, so a
//  save can never disagree with itself.
// =====================================================================

const SAVE_KEY = 'tato-trash-empire';
const SAVE_VERSION = 4;

let S = null;

function freshState() {
  const assigned = {}, collected = {}, unlocked = {}, starSteps = {}, pendingStars = {},
        progress = {}, running = {}, cards = {}, mgrLevel = {}, trades = {};

  TIERS.forEach(function (t, i) {
    assigned[t.id]  = (i === 0) ? 1 : 0;   // the first pile opens with one raccoon
    collected[t.id] = 0;
    starSteps[t.id] = 0;
    pendingStars[t.id] = 0;   // stars won but not picked up yet
    progress[t.id]  = 0;      // 0..1 through the current collection
    running[t.id]   = false;  // a hand-started cycle is in flight
    unlocked[t.id]  = (i === 0);
  });
  MANAGERS.forEach(function (m) { cards[m.id] = 0; mgrLevel[m.id] = 0; });
  TRADES.forEach(function (t) { trades[t.id] = 0; });

  const slots = [];
  for (let i = 0; i < MISSION_SLOTS; i++) slots.push(i);

  return {
    v: SAVE_VERSION,

    ratoni:      CFG.startRatoni,
    ratoniTotal: CFG.startRatoni,

    plastic:      CFG.startPlastic,
    plasticTotal: 0,

    stars:      0,
    starsTotal: 0,

    assigned:  assigned,
    collected: collected,
    starSteps: starSteps,
    pendingStars: pendingStars,
    progress:  progress,
    running:   running,
    unlocked:  unlocked,

    cards:    cards,
    mgrLevel: mgrLevel,
    trades:   trades,

    slots:       slots,          // the three missions on screen
    missionNext: MISSION_SLOTS,  // next one to deal
    claimed:     [],             // chests won and not yet opened: {slot, mission}

    bulk:     1,       // 1 | 10 | 100 | 'max'
    muted:    false,
    lastSeen: Date.now(),
    started:  Date.now(),
  };
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
  if (!Array.isArray(S.claimed)) S.claimed = [];
  return true;
}

function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  S = freshState();
}
