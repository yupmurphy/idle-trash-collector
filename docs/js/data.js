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
  offlineHours: 4,    // how much of the time you were away still counts

  // Below this the bar would just strobe, so it is drawn full and
  // labelled INSTANT instead. The output is unchanged.
  instantBelow: 0.2,


  saveEvery:  5,      // seconds between autosaves
  tickRate:   30,     // production steps per second
  uiRate:     15,     // UI refreshes per second

  ratoniBase: 1,      // raccoons per second before milestones and deals

  // Enough for a handful of assignments, so the first minute moves.
  startRatoni: 10,
  startPlastic: 50,
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
//  MANAGERS - raccoons. One per row.
//  Hiring one both automates the row AND halves its cycle on the spot.
//  Every level after that halves it again.
// --------------------------------------------------------------------
const MANAGERS = [
  {
    id: 'mgr_tato',   tier: 'bag',    name: 'Tato',           face: '🦝', tag: '🌙',
    desc: 'Runs the <b>bag</b> pile so you never have to tap it again. Every level halves the collection time.'
  },
  {
    id: 'mgr_grumpy', tier: 'straw',  name: 'Grumpy Raccoon', face: '🦝', tag: '😾',
    desc: 'Runs the <b>straw</b> pile. Hates straws. Collects them anyway, twice as fast per level.'
  },
  {
    id: 'mgr_scary',  tier: 'bottle', name: 'Scary Raccoon',  face: '🦝', tag: '👻',
    desc: 'Runs the <b>bottle</b> pile. Nobody else goes near that dumpster, so the route is always clear.'
  },
  {
    id: 'mgr_fancy',  tier: 'can',    name: 'Fancy Raccoon',  face: '🦝', tag: '🎩',
    desc: 'Runs the <b>canister</b> pile. Insists on being called a logistics director.'
  },
];

// A manager level costs stars AND duplicate cards.
function starsForLevel(level) { return 100 * Math.pow(2, level - 1); }  // 100, 200, 400, 800 ...
function cardsForLevel(level) { return 10 * Math.pow(2, level - 1); }   // 10, 20, 40, 80 ...

// --------------------------------------------------------------------
//  CHESTS
//  Every task pays out a chest. The plain one is the Simple Chest; the
//  ranges below are rolled fresh each time it is opened, so two chests
//  are never quite the same.
// --------------------------------------------------------------------
const CHESTS = {
  simple: { id: 'simple', name: 'Simple Chest', emoji: '🎁',
            stars: [40, 60], cards: [6, 12] },
};

const DEFAULT_CHEST = 'simple';

// --------------------------------------------------------------------
//  MISSIONS - three on screen at a time
//  Each one finished turns into a chest you claim in place, and the
//  slot deals the next mission off the list.
//    'plastic'  total plastic ever collected
//    'assign'   raccoons assigned to a row
//    'collect'  items ever collected on a row
//    'manager'  managers hired
//    'stars'    stars ever earned
// --------------------------------------------------------------------
const MISSIONS = [
  { type: 'plastic', amount: 100,  grant: 'mgr_tato', text: 'Collect 100 plastic' },
  { type: 'assign',  tier: 'bag',    amount: 25,   text: 'Put 25 raccoons on bags' },
  { type: 'collect', tier: 'bag',    amount: 2e3,  text: 'Haul 2,000 plastic out of the bag pile' },
  { type: 'assign',  tier: 'bag',    amount: 60,   text: 'Put 60 raccoons on bags' },
  { type: 'plastic', amount: 5e4,   text: 'Collect 50 K plastic' },
  { type: 'assign',  tier: 'bag',    amount: 100,  grant: 'mgr_grumpy', text: 'Put 100 raccoons on bags' },
  { type: 'assign',  tier: 'straw',  amount: 10,   text: 'Put 10 raccoons on straws' },
  { type: 'manager', amount: 2,     text: 'Hire 2 raccoon managers' },
  { type: 'plastic', amount: 1e7,   text: 'Collect 10 M plastic' },
  { type: 'assign',  tier: 'straw',  amount: 500,  text: 'Get 500 raccoons on straws' },
  { type: 'stars',   amount: 500,   text: 'Earn 500 stars' },
  { type: 'assign',  tier: 'straw',  amount: 5e3,  grant: 'mgr_scary', text: 'Get 5,000 raccoons on straws' },
  { type: 'assign',  tier: 'bottle', amount: 100,  text: 'Put 100 raccoons on bottles' },
  { type: 'plastic', amount: 1e11,  text: 'Collect 100 B plastic' },
  { type: 'assign',  tier: 'bottle', amount: 1e4,  text: 'Get 10,000 raccoons on bottles' },
  { type: 'assign',  tier: 'bottle', amount: 1e5,  grant: 'mgr_fancy', text: 'Get 100,000 raccoons on bottles' },
  { type: 'assign',  tier: 'can',    amount: 100,  text: 'Put 100 raccoons on canisters' },
  { type: 'manager', amount: 4,     text: 'Hire all four managers' },
];

// Once the written list runs out the game keeps dealing, so the chests
// never stop while you wait for the next zone.
function endlessMission(index) {
  const amount = 1e14 * Math.pow(100, index);
  return { type: 'plastic', amount: amount,
           text: 'Collect ' + Fmt.n(amount) + ' plastic' };
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
