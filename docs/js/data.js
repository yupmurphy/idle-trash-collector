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
//                    and from packs.
//      🃏 cards    - manager upgrades too. Packs only.
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
//  what they bend. They join the pack pool at , so the
//  packs keep changing as the game goes on.
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

// Weight is the slice of the draw wheel, so a rare is five times harder
// to pull than a common and an epic twenty times.
// Epic is defined and drawn but no manager carries it yet - give one
// `rarity: 'epic'` and the wheel, the card frame and the modal all
// follow on their own.
const RARITY = {
  common: { name: 'Common', weight: 10,  colour: '#8fa0c0' },
  rare:   { name: 'Rare',   weight: 2,   colour: '#4aa8ff' },
  epic:   { name: 'Epic',   weight: 0.5, colour: '#b07cff' },
};

// What one level of a passive card multiplies its effect by.
function passiveMultFor(level) { return Math.pow(2, level); }

// A manager level costs stars AND duplicate cards.
function starsForLevel(level) { return 100 * Math.pow(2, level - 1); }  // 100, 200, 400, 800 ...
function cardsForLevel(level) { return 10 * Math.pow(2, level - 1); }   // 10, 20, 40, 80 ...

// --------------------------------------------------------------------
//  LEVELS
//  A level is one run through the zone. Every pack you open fills one
//  box on the rank bar; fill the bar and RANK UP is yours whenever you
//  want it. Ranking up wipes the zone and starts it again, harder and
//  richer - managers, their cards and your stars come with you.
//
//  There are always two more tasks in a level than boxes on the bar, so
//  finishing the level completely is a choice, not a requirement.
// --------------------------------------------------------------------
const LEVELS = {
  slotsBase: 8,     // boxes on the rank bar at level 1
  slotsPerLevel: 2, // and how many more each level after that
  slotsMax:  18,    // and the most it ever grows to
  extraTasks: 2,    // tasks beyond the bar, for anyone who wants them

  // Packs pay Z + (level x 2)% more with every level.
  lootPerLevel: 0.02,

  // How much harder each level's targets get. See missionAt() in
  // engine.js for why these two are so far apart - in short, plastic
  // targets have to outrun an engine that compounds between levels,
  // while raccoon targets are rate-limited and are what actually sets
  // how long a level lasts.
  //
  // These two numbers are the difficulty dial for the whole game. Change
  // one and re-run `node tools/sim.js 8` before believing anything.
  taskScalePerLevel:   14,
  assignScalePerLevel: 1.55,
};

// How many packs a level needs. This grows by two rather than one
// because of extraTasks: a level always deals two tasks more than the
// bar needs, and the two a player skips are always the two deepest.
// Growing the bar by one per level meant the bar filled on the shallow
// half of the ladder every time, and the deep rows - the only ones that
// cost anything - were never required at all.
function rankSlots(level) {
  return Math.min(LEVELS.slotsMax, LEVELS.slotsBase + (level - 1) * LEVELS.slotsPerLevel);
}

// Never deal past the end of the written ladder. Beyond it the game
// falls back to endless "collect N plastic" tasks, and those are the
// cheapest thing in the game by a wide margin - so once a level dealt
// them, the player simply skipped the canister task instead and the
// level collapsed. At the top of the curve the bar needs the whole
// ladder and there is nothing left to skip, which is the intent.
function tasksInLevel(level) {
  return Math.min(MISSIONS.length, rankSlots(level) + LEVELS.extraTasks);
}

// --------------------------------------------------------------------
//  PACKS
//  Every task pays out a pack. The plain one is the Simple Pack; the
//  ranges below are rolled fresh each time one is torn open, so two
//  packs are never quite the same.
// --------------------------------------------------------------------
const PACKS = {
  simple: { id: 'simple', name: 'Simple Pack', emoji: '🎁',
            stars: [40, 60],   cards: [6, 12] },

  // what ranking up pays out
  rank:   { id: 'rank',   name: 'Rank Pack',   emoji: '🏆',
            stars: [200, 320], cards: [24, 36] },
};

const DEFAULT_PACK = 'simple';

// --------------------------------------------------------------------
//  MISSIONS - three on screen at a time
//  {n} in a text is filled in with that task's target, so a task can be
//  scaled for a higher level without rewriting its wording.
//  Each one finished turns into a pack you claim in place, and the
//  slot deals the next mission off the list.
//    'plastic'  total plastic ever collected
//    'assign'   raccoons assigned to a row
//    'collect'  items ever collected on a row
//    'manager'  managers hired
//    'stars'    stars ever earned
//    'unlock'   a row is open at all - done or not done, never a count
// --------------------------------------------------------------------
//  THE LIST IS EXACTLY AS LONG AS IT CAN BE. A level deals
//  tasksInLevel(level) tasks and that caps at slotsMax + extraTasks,
//  so index 14 is the last one the game can ever reach. Entries past it
//  are dead - which is how mgr_fancy's guaranteed grant sat at index 15
//  and never fired, leaving Fancy the only manager you could not be sure
//  of meeting. Adding a task means raising slotsMax, not just appending.
const MISSIONS = [
  // ---- bags, and the raccoon who takes them over ----
  { type: 'plastic', amount: 3500, grant: 'mgr_tato', text: 'Collect {n}' },
  { type: 'assign',  tier: 'bag',    amount: 80,    text: '{n} on bags' },
  { type: 'collect', tier: 'bag',    amount: 5e5,   text: 'Haul {n}' },
  { type: 'assign',  tier: 'bag',    amount: 550,   text: '{n} on bags' },
  { type: 'plastic', amount: 1.2e8,  text: 'Collect {n}' },

  // ---- straws ----
  //  ONLY THE DEEPEST OPEN ROW IS EVER SCARCE. Every row below it is
  //  refilled for free by the one above - a straw raccoon comes home
  //  dragging a bag raccoon - so a target on a shallow row stops costing
  //  anything the moment the row above it is running.
  //
  //  So the ladder takes ONE step per row and then moves down. The old
  //  list asked for bag raccoons three times and straw raccoons three
  //  times; every repeat after the first was free, and levels finished
  //  in two minutes however big the numbers got. A level is only ever as
  //  long as its DEEPEST task.
  { type: 'assign',  tier: 'straw',  amount: 400,   grant: 'mgr_grumpy', text: '{n} on straws' },
  { type: 'assign',  tier: 'straw',  amount: 2000,  text: '{n} on straws' },
  { type: 'manager', amount: 2,      text: 'Hire {n} managers' },
  { type: 'assign',  tier: 'straw',  amount: 2500,  text: '{n} on straws' },
  { type: 'plastic', amount: 2e9,    text: 'Collect {n}' },

  // ---- rank 3 ends here: the bottles open ----
  //  Both straw targets above stay under the bottle row's 5 K unlock,
  //  even once the per-level scaling has had two goes at them, so the
  //  pile really is shut until this task - opening it is an event, not
  //  a formality that already happened three tasks ago.
  { type: 'unlock',  tier: 'bottle', amount: 1, grant: 'mgr_scary', text: 'Open the bottles' },
  { type: 'assign',  tier: 'bottle', amount: 100,   text: '{n} on bottles' },

  // ---- rank 4 and up: bottles get deep ----
  { type: 'assign',  tier: 'bottle', amount: 8e3,   text: '{n} on bottles' },
  { type: 'stars',   amount: 1500,   text: 'Earn {n} stars' },
  { type: 'assign',  tier: 'bottle', amount: 2.5e4, text: '{n} on bottles' },

  // ---- rank 5 and up: the canisters ----
  { type: 'unlock',  tier: 'can',    amount: 1, grant: 'mgr_fancy', text: 'Open the canisters' },
  { type: 'assign',  tier: 'can',    amount: 200,   text: '{n} on canisters' },
  { type: 'manager', amount: 4,      text: 'Hire {n} managers' },
  // NEXT: the zone 2 unlock belongs here, as an 'unlock' task on the
  // first row of the household-waste page - the last task of the run
  // that opens it.
];

// Once the written list runs out the game keeps dealing, so the packs
// never stop while you wait for the next zone.
function endlessMission(index) {
  const amount = 1e14 * Math.pow(100, index);
  return { type: 'plastic', amount: amount,
           text: 'Collect {n}' };
}

const MISSION_SLOTS = 3;

// --------------------------------------------------------------------
//  DEALS - permanent raccoons/sec, paid for in plastic
//
//  Raccoon supply is what gates the deep rows: nothing feeds the deepest
//  open row, so every raccoon standing on it had to walk in. The Scrap
//  Deal alone can never keep up - it pays a flat +1/sec for a price that
//  multiplies by 100, so by the fourth step it is worthless and supply
//  sits near 4/sec while plastic runs away exponentially. Canisters then
//  sit behind 100,000 bottle raccoons that cannot be bought in any sane
//  time, and high levels simply never finish.
//
//  Raising the Scrap Deal does not fix it. That deal is gated on PLASTIC
//  and level 1 is already rich, so a bigger one floods the early game
//  and levels 1-4 collapse to two minutes each. Measured, not guessed:
//  gainMul 3 took level 4 from 33 minutes to under 3.
//
//  So supply is gated on DEPTH instead. The Night Haul exists only once
//  the bottle row is open, which cannot happen until the straws are
//  deep - it scales the late game without touching the early one.
// --------------------------------------------------------------------
const TRADES = [
  { id: 'tr_scrap', ico: '♻️', name: 'Scrap Deal',
    costBase: 500, costMul: 100, gainBase: 1, gainMul: 1, needs: null },

  { id: 'tr_night', ico: '🌙', name: 'Night Haul',
    costBase: 1e11, costMul: 50, gainBase: 25, gainMul: 4, needs: 'bottle' },
];

const ZONE_NAME = 'Zone 1 · Plastic Quarter';
