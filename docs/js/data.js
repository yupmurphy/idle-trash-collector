// =====================================================================
//  DATA - everything the game is made of, and every number worth tuning.
//  No logic lives here. Change a value, refresh, the game is rebalanced.
//
//  HOW A ROW WORKS
//  A row is a pile of trash with raccoons assigned to it. Every cycle
//  the assigned raccoons bring back their haul. Without a manager a
//  cycle only runs when you tap the pile; the manager is the raccoon
//  who keeps starting the next one.
//
//      haul per cycle = assigned x value
//      cycle time     = cycleBase / 2^(manager level - 1)
//
//  THE CHAIN
//  Only the bag row brings back plastic. Every row above it brings back
//  RACCOONS FOR THE ROW BELOW: a straw raccoon comes home dragging a new
//  bag raccoon with it.
//
//      Canisters -> Bottles -> Straws -> Bags -> Plastic
//
//  That is the only way the later thresholds are reachable - nobody is
//  hand-buying ten million raccoons one at a time.
//
//  WHAT YOU SPEND
//      🦝 raccoons - one per assignment, they tick in on their own
//      ♻️ plastic  - the price of an assignment, flat per row
//      ⭐ stars    - manager upgrades. Come from assignment milestones
//                    and from chests.
//      🃏 cards    - manager upgrades too. Chests only.
// =====================================================================

const CFG = {
  // Cheat buttons in the menu. Flip to false to hide them for a release.
  dev: true,

  offlineHours: 4,    // how much of the time you were away still counts

  // Below this the bar would just strobe, so it is drawn full and
  // labelled INSTANT instead. The output is unchanged.
  instantBelow: 0.2,


  saveEvery:  5,      // seconds between autosaves
  tickRate:   30,     // production steps per second
  uiRate:     15,     // UI refreshes per second

  ratoniBase: 1,      // raccoons per second before any deal is bought

  // You start with nothing but one raccoon on the bag pile: the first
  // taps are what buy the second raccoon.
  startRatoni: 10,
  startPlastic: 0,
};

// --------------------------------------------------------------------
//  ROWS - the collectibles
//  produces  : 'plastic', or the id of the row this one feeds raccoons to
//  value     : units brought back per assigned raccoon, per finished cycle
//  cycleBase : seconds for one collection at manager level 1
//  cost      : flat price of one more raccoon on this row
//  unlockAt  : raccoons the row ABOVE needs before this one opens
// --------------------------------------------------------------------
const TIERS = [
  {
    id: 'bag',    name: 'Plastic Bags',  emoji: '🛍️',
    produces: 'plastic',
    value: 5,     cycleBase: 3,   cost: 10,
    manager: 'mgr_tato',
    unlockFrom: null, unlockAt: 0,
    flavour: 'They blow in off the road by themselves. Free money, basically.'
  },
  {
    id: 'straw',  name: 'Plastic Straws', emoji: '🥤',
    produces: 'bag',
    value: 8,     cycleBase: 5,   cost: 1e4,
    manager: 'mgr_grumpy',
    unlockFrom: 'bag', unlockAt: 100,
    flavour: 'A raccoon out for straws always comes home with a friend for the bag pile.'
  },
  {
    id: 'bottle', name: 'Plastic Bottles', emoji: '🍾',
    produces: 'straw',
    value: 8,     cycleBase: 8,   cost: 1e6,
    manager: 'mgr_scary',
    unlockFrom: 'straw', unlockAt: 5e3,
    flavour: 'Deposit refunds buy loyalty. Every run recruits a straw raccoon.'
  },
  {
    id: 'can',    name: 'Plastic Canisters', emoji: '🧴',
    produces: 'bottle',
    value: 8,     cycleBase: 10,  cost: 1e8,
    manager: 'mgr_fancy',
    unlockFrom: 'bottle', unlockAt: 1e5,
    flavour: 'Takes four raccoons to roll one, and they bring a bottle crew back.'
  },
];

// What a row hands over, for the readouts.
const OUT_ICON = { plastic: '♻️', bag: '🛍️', straw: '🥤', bottle: '🍾', can: '🧴' };
const OUT_NAME = { plastic: 'plastic', bag: 'bag raccoons', straw: 'straw raccoons',
                   bottle: 'bottle raccoons', can: 'canister raccoons' };

// --------------------------------------------------------------------
//  STAR MILESTONES
//  Nothing announces these - you just get stars. Every x10 raccoons on
//  a row pays double what the last threshold did.
//      10 -> 1 star, 100 -> 2, 1 000 -> 4, 10 000 -> 8 ...
// --------------------------------------------------------------------
function starThreshold(step) { return 10 * Math.pow(10, step); }
function starReward(step)    { return Math.pow(2, step); }

// --------------------------------------------------------------------
//  MANAGERS - raccoons
//  Common ones run a row: hiring one both automates it AND halves its
//  cycle on the spot, and every level after that halves it again.
//  Rare ones run nothing. They sit in the collection and bend a rule of
//  the whole game for as long as you own them, and every level doubles
//  what they bend. They join the chest pool at , so the
//  chests keep changing as the game goes on.
//
//  Drop chances come from RARITY below - a rare card is five times
//  harder to pull than a common one.
// --------------------------------------------------------------------
const MANAGERS = [
  {
    id: 'mgr_tato',   tier: 'bag',    name: 'Tato',           face: '🦝', tag: '🌙', rarity: 'common',
    short: 'Automates the bag pile',
    desc: 'Runs the <b>bag</b> pile so you never have to tap it again. Every level halves the collection time.'
  },
  {
    id: 'mgr_grumpy', tier: 'straw',  name: 'Grumpy Raccoon', face: '🦝', tag: '😾', rarity: 'common',
    short: 'Automates the straw pile',
    desc: 'Runs the <b>straw</b> pile. Hates straws. Collects them anyway, twice as fast per level.'
  },
  {
    id: 'mgr_scary',  tier: 'bottle', name: 'Scary Raccoon',  face: '🦝', tag: '👻', rarity: 'common',
    short: 'Automates the bottle pile',
    desc: 'Runs the <b>bottle</b> pile. Nobody else goes near that dumpster, so the route is always clear.'
  },
  {
    id: 'mgr_fancy',  tier: 'can',    name: 'Fancy Raccoon',  face: '🦝', tag: '🎩', rarity: 'common',
    short: 'Automates the canister pile',
    desc: 'Runs the <b>canister</b> pile. Insists on being called a logistics director.'
  },

  // ---- rare, passive. No pile, one rule bent. ----
  {
    id: 'mgr_scrapper', name: 'Scrapper', face: '🦝', tag: '🔧',
    rarity: 'rare', passive: true, effect: 'deal', fromLevel: 2,
    short: 'Scrap Deal pays double',
    desc: 'Knows what the yard pays. Every step of the <b>Scrap Deal</b> is worth double, and doubles again with each of his levels.'
  },
  {
    id: 'mgr_baron', name: 'Trash Baron', face: '🦝', tag: '👑',
    rarity: 'rare', passive: true, effect: 'revenue', fromLevel: 4,
    short: 'Double plastic from bags',
    desc: 'Owns the alley on paper. Every bag sold brings in <b>double the plastic</b>, and doubles again with each of his levels.'
  },
];

const RARITY = {
  common: { name: 'Common', weight: 10, colour: '#8fa0c0' },
  rare:   { name: 'Rare',   weight: 2,  colour: '#4aa8ff' },
};

// What one level of a passive card multiplies its effect by.
function passiveMultFor(level) { return Math.pow(2, level); }

// A manager level costs stars AND duplicate cards.
function starsForLevel(level) { return 100 * Math.pow(2, level - 1); }  // 100, 200, 400, 800 ...
function cardsForLevel(level) { return 10 * Math.pow(2, level - 1); }   // 10, 20, 40, 80 ...

// --------------------------------------------------------------------
//  LEVELS
//  A level is one run through the zone. Every chest you open fills one
//  box on the rank bar; fill the bar and RANK UP is yours whenever you
//  want it. Ranking up wipes the zone and starts it again, harder and
//  richer - managers, their cards and your stars come with you.
//
//  There are always two more tasks in a level than boxes on the bar, so
//  finishing the level completely is a choice, not a requirement.
// --------------------------------------------------------------------
const LEVELS = {
  slotsBase: 8,     // boxes on the rank bar at level 1
  slotsMax:  13,    // and the most it ever grows to
  extraTasks: 2,    // tasks beyond the bar, for anyone who wants them

  // Chests pay Z + (level x 2)% more with every level.
  lootPerLevel: 0.02,

  // Tasks that count a resource double with every level. Tasks counting
  // raccoons on a row are left alone - those are tied to the unlock
  // thresholds, which do not move.
  taskScalePerLevel: 2,
};

function rankSlots(level) {
  return Math.min(LEVELS.slotsMax, LEVELS.slotsBase + level - 1);
}

function tasksInLevel(level) {
  return rankSlots(level) + LEVELS.extraTasks;
}

// --------------------------------------------------------------------
//  CHESTS
//  Every task pays out a chest. The plain one is the Simple Chest; the
//  ranges below are rolled fresh each time it is opened, so two chests
//  are never quite the same.
// --------------------------------------------------------------------
const CHESTS = {
  simple: { id: 'simple', name: 'Simple Chest', emoji: '🎁',
            stars: [40, 60],   cards: [6, 12] },

  // what ranking up pays out
  rank:   { id: 'rank',   name: 'Rank Chest',   emoji: '🏆',
            stars: [200, 320], cards: [24, 36] },
};

const DEFAULT_CHEST = 'simple';

// --------------------------------------------------------------------
//  MISSIONS - three on screen at a time
//  {n} in a text is filled in with that task's target, so a task can be
//  scaled for a higher level without rewriting its wording.
//  Each one finished turns into a chest you claim in place, and the
//  slot deals the next mission off the list.
//    'plastic'  total plastic ever collected
//    'assign'   raccoons assigned to a row
//    'collect'  items ever collected on a row
//    'manager'  managers hired
//    'stars'    stars ever earned
// --------------------------------------------------------------------
const MISSIONS = [
  { type: 'plastic', amount: 200,  grant: 'mgr_tato', text: 'Collect {n} plastic' },
  { type: 'assign',  tier: 'bag',    amount: 50,   text: 'Put {n} raccoons on bags' },
  { type: 'collect', tier: 'bag',    amount: 4e3,  text: 'Haul {n} plastic out of the bag pile' },
  { type: 'assign',  tier: 'bag',    amount: 75,   text: 'Put {n} raccoons on bags' },
  { type: 'plastic', amount: 1e5,   text: 'Collect {n} plastic' },
  { type: 'assign',  tier: 'bag',    amount: 100,  grant: 'mgr_grumpy', text: 'Put {n} raccoons on bags' },
  { type: 'assign',  tier: 'straw',  amount: 20,   text: 'Put {n} raccoons on straws' },
  { type: 'manager', amount: 2,     text: 'Hire {n} raccoon managers' },
  { type: 'plastic', amount: 2e7,   text: 'Collect {n} plastic' },
  { type: 'assign',  tier: 'straw',  amount: 1e3,  text: 'Get {n} raccoons on straws' },
  { type: 'stars',   amount: 1e3,   text: 'Earn {n} stars' },
  { type: 'assign',  tier: 'straw',  amount: 5e3,  grant: 'mgr_scary', text: 'Get {n} raccoons on straws' },
  { type: 'assign',  tier: 'bottle', amount: 200,  text: 'Put {n} raccoons on bottles' },
  { type: 'plastic', amount: 2e11,  text: 'Collect {n} plastic' },
  { type: 'assign',  tier: 'bottle', amount: 2e4,  text: 'Get {n} raccoons on bottles' },
  { type: 'assign',  tier: 'bottle', amount: 1e5,  grant: 'mgr_fancy', text: 'Get {n} raccoons on bottles' },
  { type: 'assign',  tier: 'can',    amount: 200,  text: 'Put {n} raccoons on canisters' },
  { type: 'manager', amount: 4,     text: 'Hire {n} raccoon managers' },
];

// Once the written list runs out the game keeps dealing, so the chests
// never stop while you wait for the next zone.
function endlessMission(index) {
  const amount = 1e14 * Math.pow(100, index);
  return { type: 'plastic', amount: amount,
           text: 'Collect {n} plastic' };
}

const MISSION_SLOTS = 3;

// --------------------------------------------------------------------
//  DEALS - permanent raccoons/sec, paid for in plastic
//  Every step bought is a flat +1 per second. The price is what climbs.
// --------------------------------------------------------------------
const TRADES = [
  { id: 'tr_scrap', ico: '♻️', name: 'Scrap Deal',
    costBase: 500, costMul: 100, gainBase: 1, gainMul: 1, needs: null },
];

const ZONE_NAME = 'Zone 1 · Plastic Quarter';
