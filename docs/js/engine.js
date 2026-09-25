// =====================================================================
//  ENGINE - the rules. Nothing here touches the DOM.
//  Every screen reads these functions instead of doing its own maths, so
//  the number on a button is always the number you actually pay.
// =====================================================================

const Engine = (function () {

  const tierMap = {};
  TIERS.forEach(function (t) { tierMap[t.id] = t; });

  const mgrMap = {};
  MANAGERS.forEach(function (m) { mgrMap[m.id] = m; });

  function tier(id)    { return tierMap[id]; }
  function manager(id) { return mgrMap[id]; }

  function mgrLevel(t)   { return S.mgrLevel[t.manager]; }
  function hasManager(t) { return S.mgrLevel[t.manager] > 0; }

  // ------------------------------------------------------------------
  //  A COLLECTION CYCLE
  //  Bags start at three seconds by hand. Hiring the manager halves that
  //  straight away, and every level after halves it again - which is the
  //  whole reason to spend stars.
  // ------------------------------------------------------------------
  function cycleTime(t) {
    const lvl = mgrLevel(t);
    const speed = lvl > 0 ? Math.pow(2, lvl) : 1;
    return Math.max(0.001, t.cycleBase / speed);
  }

  // Past a point the bar is a strobe light; the row is drawn as INSTANT.
  function isInstant(t) { return cycleTime(t) < CFG.instantBelow; }

  // What one finished cycle brings back - plastic for the bag row,
  // raccoons for the row below for everyone else. Passive cards are
  // folded in HERE, so the number printed on the row is exactly the
  // number that lands when the bar fills.
  function haul(t) {
    let out = S.assigned[t.id] * t.value;
    if (t.produces === 'plastic') out *= passiveMult('revenue');
    return out;
  }

  // Output per second while the row is looping.
  function rate(t) {
    if (!S.unlocked[t.id]) return 0;
    if (!hasManager(t)) return 0;
    return haul(t) / cycleTime(t);
  }

  // Only the bag row ends up as plastic; the rest ends up as raccoons.
  function totalRate() {
    return TIERS.reduce(function (sum, t) {
      return t.produces === 'plastic' ? sum + rate(t) : sum;
    }, 0);
  }

  // Is the bar moving right now?
  function isRunning(t) {
    return S.assigned[t.id] > 0 && (hasManager(t) || S.running[t.id]);
  }

  // Hand the haul to whoever receives it.
  function give(what, amount) {
    if (what === 'plastic') {
      S.plastic += amount;
      S.plasticTotal += amount;
    } else {
      S.assigned[what] += amount;
      checkStars(tier(what));      // recruits count towards the star steps
    }
  }

  function collect(t, cycles) {
    const out = haul(t) * cycles;
    if (out <= 0) return 0;
    S.collected[t.id] += out;
    give(t.produces, out);
    return out;
  }

  // ------------------------------------------------------------------
  //  PASSIVE CARDS
  //  A rare card has no pile. It multiplies one thing, and every level
  //  of it doubles that multiplier again.
  // ------------------------------------------------------------------
  function passiveMult(effect) {
    let m = 1;
    MANAGERS.forEach(function (mg) {
      if (mg.effect === effect && S.mgrLevel[mg.id] > 0) {
        m *= passiveMultFor(S.mgrLevel[mg.id]);
      }
    });
    return m;
  }

  // ------------------------------------------------------------------
  //  RACCOONS
  // ------------------------------------------------------------------
  // The base trickle, plus every deal ever bought. Deals are the only
  // way this number ever moves.
  function ratoniRate() {
    let deals = 0;
    TRADES.forEach(function (tr) { deals += tradeGainTotal(tr, S.trades[tr.id]); });
    return CFG.ratoniBase + deals * passiveMult('deal');
  }

  // ------------------------------------------------------------------
  //  THE CLOCK
  // ------------------------------------------------------------------
  function tick(dt) {
    const gained = ratoniRate() * dt;
    S.ratoni += gained;
    S.ratoniTotal += gained;

    TIERS.forEach(function (t) {
      if (!isRunning(t)) return;
      S.progress[t.id] += dt / cycleTime(t);
      if (S.progress[t.id] < 1) return;

      const cycles = Math.floor(S.progress[t.id]);
      collect(t, cycles);
      if (hasManager(t)) {
        S.progress[t.id] -= cycles;      // the manager starts the next one
      } else {
        S.progress[t.id] = 0;            // by hand, one cycle per tap
        S.running[t.id] = false;
      }
    });

    checkUnlocks();
  }

  // Tapping a pile sends the raccoons out once. One tap, one run: you
  // wait out the bar before the pile will take another.
  // A tap also picks up whatever stars are sitting on the pile, manager
  // or no manager.
  function tap(id) {
    const t = tier(id);
    if (!S.unlocked[id]) return { stars: 0, started: false };

    const stars = takeStars(id);

    let started = false;
    if (!hasManager(t) && !S.running[id] && S.assigned[id] > 0) {
      S.running[id] = true;
      S.progress[id] = 0;
      started = true;
    }
    return { stars: stars, started: started };
  }

  // ------------------------------------------------------------------
  //  ASSIGNING RACCOONS
  //  Flat price: one raccoon plus this row's plastic cost, every time.
  //  The limit is how fast raccoons arrive, not an escalating price.
  // ------------------------------------------------------------------
  function maxAffordable(t) {
    return Math.max(0, Math.min(Math.floor(S.ratoni), Math.floor(S.plastic / t.cost)));
  }

  function buyQuote(id) {
    const t = tier(id);
    const max = maxAffordable(t);
    let count = S.bulk === 'max' ? max : S.bulk;
    if (count < 1) count = 1;                     // show the price of one
    return {
      count: count,
      ratoni: count,
      plastic: count * t.cost,
      can: count <= S.ratoni && count * t.cost <= S.plastic,
    };
  }

  function assign(id) {
    const q = buyQuote(id);
    if (!q.can) return null;
    const t = tier(id);
    S.ratoni  -= q.ratoni;
    S.plastic -= q.plastic;
    S.assigned[id] += q.count;

    checkStars(t);
    checkUnlocks();
    return q;
  }

  // ------------------------------------------------------------------
  //  STARS
  //  Silent rewards. Nothing on screen promises them; they just land.
  // ------------------------------------------------------------------
  // Stars are never handed over on their own. Passing a checkpoint drops
  // them ON the pile; they sit there glinting until you tap it.
  function checkStars(t) {
    let won = 0;
    while (S.assigned[t.id] >= starThreshold(S.starSteps[t.id])) {
      won += starReward(S.starSteps[t.id]);
      S.starSteps[t.id]++;
    }
    if (won) S.pendingStars[t.id] += won;
    return won;
  }

  function takeStars(id) {
    const won = S.pendingStars[id];
    if (!won) return 0;
    S.pendingStars[id] = 0;
    S.stars += won;
    S.starsTotal += won;
    return won;
  }

  // How far this pile is between the last checkpoint and the next one.
  function starProgress(t) {
    const step = S.starSteps[t.id];
    const prev = step === 0 ? 0 : starThreshold(step - 1);
    const next = starThreshold(step);
    return Math.max(0, Math.min(1, (S.assigned[t.id] - prev) / (next - prev)));
  }

  function nextStarAt(t) { return starThreshold(S.starSteps[t.id]); }

  // ------------------------------------------------------------------
  //  UNLOCKS - a row opens on raccoons assigned to the row above it
  // ------------------------------------------------------------------
  function checkUnlocks() {
    TIERS.forEach(function (t) {
      if (S.unlocked[t.id] || !t.unlockFrom) return;
      if (S.assigned[t.unlockFrom] < t.unlockAt) return;
      S.unlocked[t.id] = true;
      // A new pile always opens with one raccoon already on it, so there
      // is something to tap before you can afford a second.
      if (S.assigned[t.id] < 1) S.assigned[t.id] = 1;
      checkStars(t);
    });
  }

  function unlockProgress(t) {
    if (!t.unlockFrom) return 1;
    return Math.min(1, S.assigned[t.unlockFrom] / t.unlockAt);
  }

  // ------------------------------------------------------------------
  //  DEALS
  // ------------------------------------------------------------------
  function tradeCost(tr, level) { return tr.costBase * Math.pow(tr.costMul, level); }
  function tradeGain(tr, level) { return tr.gainBase * Math.pow(tr.gainMul, level); }

  function tradeGainTotal(tr, level) {
    let sum = 0;
    for (let i = 0; i < level; i++) sum += tradeGain(tr, i);
    return sum;
  }

  function tradeUnlocked(tr) { return !tr.needs || S.unlocked[tr.needs]; }

  // Drives the dot on the DEN tab: is there a step you could take now?
  function anyTradeReady() {
    return TRADES.some(function (tr) {
      return tradeUnlocked(tr) && S.plastic >= tradeCost(tr, S.trades[tr.id]);
    });
  }

  function buyTrade(id) {
    const tr = TRADES.filter(function (x) { return x.id === id; })[0];
    if (!tr || !tradeUnlocked(tr)) return false;
    const price = tradeCost(tr, S.trades[id]);
    if (S.plastic < price) return false;
    S.plastic -= price;
    S.trades[id]++;
    return true;
  }

  // ------------------------------------------------------------------
  //  MISSIONS - three live at a time, each with its own chest
  // ------------------------------------------------------------------
  // A level deals from the same ladder every time, with the resource
  // targets doubled per level. Targets counted in raccoons on a row are
  // left alone: those are tied to unlock thresholds, which do not move.
  function missionAt(i) {
    if (i >= tasksInLevel(S.level)) return null;   // level's tasks are spent
    const base = i < MISSIONS.length ? MISSIONS[i] : endlessMission(i - MISSIONS.length);
    if (S.level === 1 || base.type === 'assign' || base.type === 'manager') return base;

    const scaled = Object.assign({}, base);
    scaled.amount = base.amount * Math.pow(LEVELS.taskScalePerLevel, S.level - 1);
    return scaled;
  }

  // The wording of a task, with its target filled in.
  function missionText(m) {
    return m.text.replace('{n}', m.type === 'plastic' || m.type === 'collect'
      ? Fmt.n(m.amount)
      : Fmt.whole(m.amount));
  }

  function missionProgress(m) {
    switch (m.type) {
      case 'plastic': return S.plasticTotal;
      case 'assign':  return S.assigned[m.tier]  || 0;
      case 'collect': return S.collected[m.tier] || 0;
      case 'stars':   return S.starsTotal;
      case 'manager': return MANAGERS.filter(function (x) { return S.mgrLevel[x.id] > 0; }).length;
    }
    return 0;
  }

  function missionDone(i) {
    const m = missionAt(i);
    return !!m && missionProgress(m) >= m.amount;
  }

  function readyCount() {
    return S.slots.filter(function (i) { return missionDone(i); }).length;
  }

  // ---- the rank bar -------------------------------------------------
  function rankFull()   { return S.rankProgress >= rankSlots(S.level); }
  function rankBoxes()  { return rankSlots(S.level); }
  function levelDone()  { return S.missionNext >= tasksInLevel(S.level) &&
                                 S.slots.every(function (i) { return missionAt(i) === null; }); }

  // Which managers a chest can roll: the ones running an open row, plus
  // any passive card this level has reached. Rarity is a weight, so a
  // rare card is simply a smaller slice of the same wheel.
  function cardPool() {
    return MANAGERS.filter(function (m) {
      return m.passive ? S.level >= m.fromLevel : S.unlocked[m.tier];
    });
  }

  function drawFromPool(pool) {
    let total = 0;
    pool.forEach(function (m) { total += RARITY[m.rarity].weight; });
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= RARITY[pool[i].rarity].weight;
      if (roll <= 0) return pool[i].id;
    }
    return pool[pool.length - 1].id;
  }

  function randInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  // Claim the chest sitting on one mission slot, then deal the next
  // mission into that slot. The loot is rolled here, not written into
  // the mission, so every chest of a kind is a fresh roll.
  // Roll one chest of a kind. Loot grows with the level: Z + level x 2%.
  function rollChest(chest, guarantee) {
    const bonus = 1 + S.level * LEVELS.lootPerLevel;
    const stars = Math.round(randInt(chest.stars[0], chest.stars[1]) * bonus);
    const count = Math.round(randInt(chest.cards[0], chest.cards[1]) * bonus);

    const drawn = {}, wasNew = {};
    function draw(mid) {
      if (S.mgrLevel[mid] === 0 && !drawn[mid]) wasNew[mid] = true;
      drawn[mid] = (drawn[mid] || 0) + 1;
      S.cards[mid]++;
    }

    const pool = cardPool();
    let n = count;
    if (guarantee) { draw(guarantee); n--; }
    for (let i = 0; i < n; i++) draw(drawFromPool(pool));

    // The first card of a raccoon is the raccoon: it hires them at level
    // one instead of sitting in the pile doing nothing.
    Object.keys(drawn).forEach(function (mid) {
      if (S.mgrLevel[mid] === 0 && S.cards[mid] >= 1) {
        S.mgrLevel[mid] = 1;
        S.cards[mid]--;
      }
    });

    S.stars += stars;
    S.starsTotal += stars;

    return {
      chest: chest,
      stars: stars,
      cards: Object.keys(drawn).map(function (mid) {
        return { id: mid, qty: drawn[mid], isNew: !!wasNew[mid] };
      }),
    };
  }

  // Claim the chest sitting on one task, fill a box on the rank bar, and
  // deal the next task into that slot.
  function claim(slot) {
    const idx = S.slots[slot];
    if (idx === undefined || !missionDone(idx)) return null;
    const m = missionAt(idx);

    const loot = rollChest(CHESTS[m.chest || DEFAULT_CHEST], m.grant);

    S.rankProgress = Math.min(rankSlots(S.level), S.rankProgress + 1);
    S.slots[slot] = S.missionNext++;

    return loot;
  }

  // Cash in a full rank bar: a better chest, then the zone starts over.
  // Managers, their cards and every star you earned come with you.
  function rankUp() {
    if (!rankFull()) return null;
    const loot = rollChest(CHESTS.rank, null);
    S.level++;
    resetZone();
    return loot;
  }

  // ------------------------------------------------------------------
  //  MANAGER UPGRADES - stars and duplicate cards, both
  // ------------------------------------------------------------------
  function upStars(mid) { return starsForLevel(S.mgrLevel[mid]); }
  function upCards(mid) { return cardsForLevel(S.mgrLevel[mid]); }

  function canUpgrade(mid) {
    return S.mgrLevel[mid] > 0 &&
           S.stars >= upStars(mid) &&
           S.cards[mid] >= upCards(mid);
  }

  function upgrade(mid) {
    if (!canUpgrade(mid)) return false;
    S.stars -= upStars(mid);
    S.cards[mid] -= upCards(mid);
    S.mgrLevel[mid]++;
    return true;
  }

  function totalCards() {
    return MANAGERS.reduce(function (a, m) { return a + S.cards[m.id]; }, 0);
  }

  function anyUpgradeReady() {
    return MANAGERS.some(function (m) { return canUpgrade(m.id); });
  }

  // ------------------------------------------------------------------
  //  DEV HANDOUTS
  //  Wired to the buttons in the menu, behind CFG.dev. Cards go to every
  //  manager of that rarity, and a manager who was not hired yet gets
  //  hired by the first one, same as a chest would do.
  // ------------------------------------------------------------------
  function devGive(what, amount) {
    if (what === 'ratoni') { S.ratoni += amount; S.ratoniTotal += amount; return; }
    if (what === 'stars')  { S.stars  += amount; S.starsTotal  += amount; return; }

    MANAGERS.forEach(function (m) {
      if (m.rarity !== what) return;
      S.cards[m.id] += amount;
      if (S.mgrLevel[m.id] === 0 && S.cards[m.id] >= 1) {
        S.mgrLevel[m.id] = 1;
        S.cards[m.id]--;
      }
    });
  }

  // ------------------------------------------------------------------
  //  TIME AWAY
  //  Only rows with a manager keep working; a pile you were tapping by
  //  hand sits there exactly as you left it.
  // ------------------------------------------------------------------
  function runOffline(seconds) {
    const capped = Math.min(seconds, CFG.offlineHours * 3600);
    if (capped < 30) return null;

    const before = { plastic: S.plasticTotal, ratoni: S.ratoniTotal };

    const earned = ratoniRate() * capped;
    S.ratoni += earned;
    S.ratoniTotal += earned;

    // Coarse steps rather than one big multiply, so the chain still
    // compounds: the straw raccoons recruited in hour one spend hours
    // two to four working the bag pile.
    const steps = 120;
    const chunk = capped / steps;
    for (let i = 0; i < steps; i++) {
      TIERS.forEach(function (t) {
        if (!S.unlocked[t.id] || !hasManager(t)) return;
        collect(t, chunk / cycleTime(t));
      });
    }
    checkUnlocks();

    return {
      seconds: capped,
      away:    seconds,
      plastic: S.plasticTotal - before.plastic,
      ratoni:  S.ratoniTotal - before.ratoni,
    };
  }

  return {
    tier: tier, manager: manager, hasManager: hasManager, mgrLevel: mgrLevel,
    cycleTime: cycleTime, isInstant: isInstant, haul: haul, rate: rate, totalRate: totalRate,
    isRunning: isRunning,
    ratoniRate: ratoniRate, passiveMult: passiveMult,
    tick: tick, tap: tap,
    buyQuote: buyQuote, assign: assign, maxAffordable: maxAffordable,
    nextStarAt: nextStarAt, unlockProgress: unlockProgress,
    starProgress: starProgress, takeStars: takeStars,
    tradeCost: tradeCost, tradeGain: tradeGain, tradeGainTotal: tradeGainTotal,
    tradeUnlocked: tradeUnlocked, buyTrade: buyTrade, anyTradeReady: anyTradeReady,
    missionAt: missionAt, missionText: missionText, missionProgress: missionProgress,
    missionDone: missionDone, rankFull: rankFull, rankBoxes: rankBoxes,
    levelDone: levelDone, rankUp: rankUp,
    readyCount: readyCount, claim: claim,
    upStars: upStars, upCards: upCards, canUpgrade: canUpgrade, upgrade: upgrade,
    totalCards: totalCards, anyUpgradeReady: anyUpgradeReady,
    runOffline: runOffline, devGive: devGive,
  };
})();
