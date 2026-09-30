// =====================================================================
//  UI - builds the screens once, then only rewrites the numbers.
//  Rebuilding the rows fifteen times a second would kill the tap
//  animation and the scroll position, so build() creates the nodes and
//  refresh() touches nothing but text, widths and disabled flags.
// =====================================================================

const PASSIVE_LABEL = {
  deal:    'Scrap Deal pays',
  revenue: 'Plastic from bags',
};

// The buy step, in the order the one button cycles through. A fraction is
// a fraction of what you can afford right now; 'max' is all of it. Percents
// beat fixed counts here because a pile that takes eight raccoons and a
// pile that takes eight million share the same button.
const BULK = [
  { v: 1,     label: 'x1'  },
  { v: 0.1,   label: '10%' },
  { v: 0.5,   label: '50%' },
  { v: 'max', label: 'MAX' },
];

// Cheat buttons for testing. Shown only while CFG.dev is true; delete
// this block and the CFG.dev flag to be rid of them.
const DEV_PANEL =
  '<div class="dev-panel">' +
    '<div class="dev-title">DEV</div>' +
    '<button class="btn dev-btn" data-dev="ratoni" data-amount="100000">+100 K 🦝 raccoons</button>' +
    '<button class="btn dev-btn" data-dev="stars"  data-amount="10000">+10 K ⭐ stars</button>' +
    '<button class="btn dev-btn" data-dev="common" data-amount="1000">+1000 🃏 cards on every common</button>' +
    '<button class="btn dev-btn" data-dev="rare"   data-amount="100">+100 🃏 cards on every rare</button>' +
  '</div>';

const UI = (function () {

  const $ = function (id) { return document.getElementById(id); };

  const el = {};          // header and task nodes, looked up once
  const rowNodes = {};    // tier id    -> its refreshable parts
  const cardNodes = {};   // manager id -> its refreshable parts
  const tradeNodes = {};  // trade id   -> its refreshable parts
  const taskNodes = [];   // one per mission slot

  let page = 'collect';

  // ------------------------------------------------------------------
  //  BUILD
  // ------------------------------------------------------------------
  function build() {
    ['w-ratoni', 'w-stars', 'w-cards', 'w-plastic', 'btn-bulk',
     'rank', 'rank-level', 'rank-boxes', 'btn-rank',
     'tasks', 'rows', 'mgr-grid', 'mgr-owned', 'trades',
     'rat-rate-big', 'den-art', 'zone-name', 'avatar-badge',
     'nav-col-dot', 'nav-mgr-dot', 'nav-den-dot', 'fx', 'modal-root'].forEach(function (id) {
      el[id] = $(id);
    });

    el['zone-name'].textContent = ZONE_NAME;

    buildTasks();
    buildRows();
    buildCards();
    buildTrades();
    wire();
    refresh();
  }

  // ------------------------------ rank --------------------------------
  let builtBoxes = -1;

  function refreshRank() {
    const boxes = Engine.rankBoxes();
    if (builtBoxes !== boxes) {
      builtBoxes = boxes;
      let html = '';
      for (let i = 0; i < boxes; i++) html += '<i class="rank-box"></i>';
      el['rank-boxes'].innerHTML = html;
    }
    const kids = el['rank-boxes'].children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('on', i < S.rankProgress);
    }

    const full = Engine.rankFull();
    el['rank-level'].textContent = 'LEVEL ' + S.level;
    el['btn-rank'].classList.toggle('hidden', !full);
    el['rank'].classList.toggle('full', full);
  }

  // ----------------------------- tasks --------------------------------
  function buildTasks() {
    const host = el['tasks'];
    host.innerHTML = '';

    // Three columns across one band. Each one holds two layouts and
    // shows exactly one: the job while it is running, and the pack once
    // it is done. A finished task gives its WHOLE cell to the pack -
    // sharing the cell with a progress bar left the art about 30px tall,
    // and a pack is a portrait shape that cannot survive that.
    for (let i = 0; i < MISSION_SLOTS; i++) {
      const node = document.createElement('div');
      node.className = 'task';
      node.innerHTML =
        '<div class="task-todo">' +
          '<div class="task-head">' +
            '<div class="task-goal"></div>' +
            '<div class="task-text"></div>' +
          '</div>' +
          // the count rides ON the bar, the way the row timer does
          '<div class="bar task-bar">' +
            '<div class="bar-fill"></div>' +
            '<span class="task-count"></span>' +
          '</div>' +
        '</div>' +
        '<button class="task-claim" data-slot="' + i + '">' +
          '<div class="task-pack"></div>' +
          '<div class="task-claim-label">CLICK TO CLAIM</div>' +
        '</button>';
      host.appendChild(node);

      taskNodes.push({
        root:  node,
        goal:  node.querySelector('.task-goal'),
        text:  node.querySelector('.task-text'),
        count: node.querySelector('.task-count'),
        fill:  node.querySelector('.bar-fill'),
        pack:  node.querySelector('.task-pack'),
        // what each of those two slots currently holds, so refresh() can
        // leave the SVG alone instead of re-parsing it fifteen times a
        // second
        goalKey: null,
        packKey: null,
      });
    }
  }

  // ---------------------------- collect -------------------------------
  function buildRows() {
    const host = el['rows'];
    host.innerHTML = '';

    TIERS.forEach(function (t) {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.tier = t.id;

      row.innerHTML =
        '<div class="row-left">' +
          '<div class="row-tap" data-tap="' + t.id + '">' +
            '<span class="row-emoji">' + ART.item(t.id) + '</span>' +
            '<span class="row-stars hidden">⭐<b>0</b></span>' +
            '<span class="row-tap-hint">TAP</span>' +
          '</div>' +
          // how many raccoons are on this pile, filled up to the next
          // star checkpoint
          '<div class="row-stock">' +
            '<span class="row-stock-fill"></span>' +
            '<b class="row-stock-num">0</b>' +
          '</div>' +
        '</div>' +

        '<div class="row-main">' +
          '<div class="row-head">' +
            '<span class="row-name">' + t.name + '</span>' +
            '<span class="row-out"></span>' +
          '</div>' +
          '<div class="bar row-bar">' +
            '<div class="bar-fill"></div>' +
            '<span class="row-timer"></span>' +
          '</div>' +
          '<div class="row-mgr"></div>' +
          '<button class="buy-btn" data-buy="' + t.id + '">' +
            '<span class="buy-label">BUY x1 RACCOON</span>' +
            '<span class="buy-cost"></span>' +
          '</button>' +
        '</div>' +

        '<div class="lock-body hidden">' +
          '<div class="lock-title">🔒 ' + t.name + '</div>' +
          '<div class="lock-req"></div>' +
          '<div class="bar"><div class="bar-fill"></div></div>' +
        '</div>';

      host.appendChild(row);

      rowNodes[t.id] = {
        root:     row,
        tap:      row.querySelector('.row-tap'),
        hint:     row.querySelector('.row-tap-hint'),
        stars:    row.querySelector('.row-stars'),
        starsNum: row.querySelector('.row-stars b'),
        stock:    row.querySelector('.row-stock'),
        stockNum: row.querySelector('.row-stock-num'),
        stockFill:row.querySelector('.row-stock-fill'),
        out:      row.querySelector('.row-out'),
        fill:     row.querySelector('.row-bar .bar-fill'),
        timer:    row.querySelector('.row-timer'),
        mgr:      row.querySelector('.row-mgr'),
        main:     row.querySelector('.row-main'),
        buy:      row.querySelector('.buy-btn'),
        label:    row.querySelector('.buy-label'),
        cost:     row.querySelector('.buy-cost'),
        lock:     row.querySelector('.lock-body'),
        lockReq:  row.querySelector('.lock-req'),
        lockFill: row.querySelector('.lock-body .bar-fill'),
      };
    });
  }

  // ---------------------------- managers ------------------------------
  function buildCards() {
    const host = el['mgr-grid'];
    host.innerHTML = '';

    MANAGERS.forEach(function (m) {
      const card = document.createElement('div');
      card.className = 'card locked ' + m.rarity;
      card.dataset.mgr = m.id;
      card.innerHTML =
        CARDS.card(m.id, m.name, m.short, m.rarity) +
        '<div class="card-lock">🔒</div>';
      host.appendChild(card);

      cardNodes[m.id] = {
        root: card,
        lvl:  card.querySelector('.card-lvl-text'),
        fill: card.querySelector('.card-bar-fill'),
      };
    });
  }

  // ------------------------------- den --------------------------------
  function buildTrades() {
    const host = el['trades'];
    host.innerHTML = '';

    TRADES.forEach(function (tr) {
      const node = document.createElement('div');
      node.className = 'trade';
      node.innerHTML =
        '<div class="trade-ico">' + tr.ico + '</div>' +
        '<div class="trade-body">' +
          '<div class="trade-title">' + tr.name + '</div>' +
          '<div class="trade-gain"></div>' +
          '<div class="trade-lvl"></div>' +
        '</div>' +
        '<button class="trade-btn" data-trade="' + tr.id + '"></button>';
      host.appendChild(node);

      tradeNodes[tr.id] = {
        root: node,
        gain: node.querySelector('.trade-gain'),
        lvl:  node.querySelector('.trade-lvl'),
        btn:  node.querySelector('.trade-btn'),
      };
    });
  }

  // ------------------------------------------------------------------
  //  EVENTS
  // ------------------------------------------------------------------
  function wire() {
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.querySelector('.nav-ico').innerHTML = ART.nav(b.dataset.page === 'raccoons' ? 'den' : b.dataset.page);
      b.addEventListener('click', function () { show(b.dataset.page); });
    });

    el['btn-bulk'].addEventListener('click', function () {
      const i = BULK.findIndex(function (s) { return s.v === S.bulk; });
      S.bulk = BULK[(i + 1) % BULK.length].v;     // an unknown save lands on x1
      syncBulk();
      refresh();
      Sfx.tick();
    });

    // The resource boxes are the zone switcher. There is one zone, so the
    // only box there is goes to the page it already shows - the handler is
    // here so zone 2 is a row in the HTML and nothing else.
    $('res-boxes').addEventListener('click', function (ev) {
      const box = ev.target.closest('[data-zone]');
      if (box) show(box.dataset.zone);
    });

    // taps and buys, delegated so rebuilding a row cannot orphan a handler
    el['rows'].addEventListener('click', function (ev) {
      const tapEl = ev.target.closest('[data-tap]');
      if (tapEl) {
        const r = Engine.tap(tapEl.dataset.tap);
        if (r.stars) starBurst(r.stars);
        else if (r.started) Sfx.pick();
        refresh();
        return;
      }

      const buyEl = ev.target.closest('[data-buy]');
      if (buyEl) {
        const id = buyEl.dataset.buy;
        const q = Engine.assign(id);
        if (q) {
          floatAt(ev.clientX, ev.clientY, '+' + Fmt.int(q.count) + ' 🦝');
          Sfx.buy();
        } else {
          Sfx.deny();
        }
        refresh();
      }
    });

    el['tasks'].addEventListener('click', function (ev) {
      const btn = ev.target.closest('[data-slot]');
      if (!btn || btn.disabled) return;
      const loot = Engine.claim(parseInt(btn.dataset.slot, 10));
      if (!loot) return;
      Sfx.pack();
      packModal(loot);
      refresh();
    });

    el['mgr-grid'].addEventListener('click', function (ev) {
      const card = ev.target.closest('[data-mgr]');
      if (!card) return;
      const id = card.dataset.mgr;
      if (S.mgrLevel[id] === 0) return;   // not hired yet: nothing to show
      managerModal(id);
    });

    el['trades'].addEventListener('click', function (ev) {
      const btn = ev.target.closest('[data-trade]');
      if (!btn) return;
      if (Engine.buyTrade(btn.dataset.trade)) Sfx.buy(); else Sfx.deny();
      refresh();
    });

    el['btn-rank'].addEventListener('click', function () {
      const loot = Engine.rankUp();
      if (!loot) return;
      Sfx.up();
      rankModal(loot);
      refresh();
    });

    $('btn-menu').addEventListener('click', menuModal);
    $('avatar').addEventListener('click', menuModal);

    el['modal-root'].addEventListener('click', function (ev) {
      if (ev.target === el['modal-root']) closeModal();
    });

    syncBulk();
  }

  function syncBulk() {
    let i = BULK.findIndex(function (s) { return s.v === S.bulk; });
    // A save from the old four-button picker can hold x10 or x100, which
    // are not steps any more. Move it onto one rather than just labelling
    // it x1 while the buy button quietly still charges for ten.
    if (i < 0) { i = 0; S.bulk = BULK[0].v; }
    el['btn-bulk'].textContent = BULK[i].label;
  }

  function show(name) {
    page = name;
    ['collect', 'managers', 'raccoons'].forEach(function (p) {
      $('page-' + p).classList.toggle('hidden', p !== name);
    });
    // The plastic box is the score and stays on every page - deals cost
    // plastic too. The buy step only means something where there is
    // something to buy, and the box lights up as the zone you are in.
    $('res-bar').classList.toggle('buying', name === 'collect');
    document.querySelectorAll('#res-boxes [data-zone]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.zone === name);
    });
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.page === name);
    });
    refresh();
  }

  // ------------------------------------------------------------------
  //  REFRESH
  // ------------------------------------------------------------------
  // The collection bar is the only thing on screen that has to move on
  // every frame. refresh() runs at CFG.uiRate, which is right for text
  // and far too coarse for a sweep: at 15 steps a second the bar moves
  // in visible jumps and never gets drawn full before it wraps, which
  // reads as a stutter right at the end of the cycle. So the fills get
  // their own pass, straight off the animation frame - four numbers, no
  // text, no class flipping.
  function refreshBars() {
    if (page !== 'collect') return;
    TIERS.forEach(function (t) {
      if (!S.unlocked[t.id] || Engine.isInstant(t)) return;   // instant is drawn full
      rowNodes[t.id].fill.style.width =
        (Math.min(1, S.progress[t.id]) * 100).toFixed(2) + '%';
    });
  }

  function refresh() {
    el['w-ratoni'].textContent  = Fmt.whole(S.ratoni);
    el['w-stars'].textContent   = Fmt.n(S.stars);
    el['w-cards'].textContent   = Fmt.int(Engine.totalCards());
    el['w-plastic'].textContent = Fmt.n(S.plastic);

    refreshRank();
    refreshTasks();


    const ready = Engine.readyCount();
    el['avatar-badge'].classList.toggle('hidden', ready === 0);
    el['nav-col-dot'].classList.toggle('hidden', ready === 0);
    el['nav-mgr-dot'].classList.toggle('hidden', !Engine.anyUpgradeReady());
    el['nav-den-dot'].classList.toggle('hidden', !Engine.anyTradeReady());

    if (page === 'collect')  refreshRows();
    if (page === 'managers') refreshCards();
    if (page === 'raccoons') refreshDen();
  }

  // While a task is running, show where the work happens: the pile you
  // have to load, the managers page, the wallet the number comes out of.
  // The line underneath carries the wording; the icon is what you read
  // at a glance.
  // The count has to live inside a bar a third of a phone wide, so it
  // drops to one decimal and loses the space before the suffix:
  // "420.00 K / 500.00 K" is 19 characters and does not fit, "420K/500K"
  // is 9 and says the same thing.
  function taskCount(v) {
    return Fmt.n(v, 1).replace(' ', '').replace(/\.0(?=[A-Z]|$)/, '');
  }

  function missionIcon(m) {
    if (m.tier) return ART.item(m.tier);
    if (m.type === 'manager') return ART.nav('managers');
    if (m.type === 'stars') return '⭐';
    return OUT_ICON.plastic;
  }

  function refreshTasks() {
    S.slots.forEach(function (idx, i) {
      const n = taskNodes[i];
      const m = Engine.missionAt(idx);
      if (!m) {
        // this level has no tasks left - the rank bar is the way on
        n.root.className = 'task spent';
        n.text.textContent  = 'Level cleared';
        n.count.textContent = '';
        n.fill.style.width = '100%';
        if (n.goalKey !== 'cleared') {
          n.goalKey = 'cleared';
          n.goal.innerHTML = '<span class="task-tick">✓</span>';
        }
        return;
      }

      const done = Engine.missionDone(idx);
      n.root.className = 'task' + (done ? ' done' : '');

      if (done) {
        // The cell belongs to the pack now, so nothing under it needs
        // rewriting - only the pack itself, and only if it changed kind.
        const kind = m.pack || DEFAULT_PACK;
        if (n.packKey !== kind) {
          n.packKey = kind;
          n.pack.innerHTML = ART.pack(kind);
        }
        return;
      }

      n.packKey = null;

      const prog = Math.min(Engine.missionProgress(m), m.amount);
      n.text.textContent  = Engine.missionText(m);
      // Opening a row has no count to show - "0 / 1" says nothing, and
      // the row itself is already spelling out what it needs.
      n.count.textContent = m.type === 'unlock'
        ? ''
        : taskCount(prog) + '/' + taskCount(m.amount);
      n.fill.style.width  = (prog / m.amount * 100).toFixed(1) + '%';

      const key = m.type + ':' + (m.tier || '');
      if (n.goalKey !== key) {
        n.goalKey = key;
        n.goal.innerHTML = missionIcon(m);
      }
    });
  }

  function refreshRows() {
    TIERS.forEach(function (t) {
      const n = rowNodes[t.id];
      const open = S.unlocked[t.id];

      n.root.classList.toggle('locked', !open);
      n.main.classList.toggle('hidden', !open);
      n.lock.classList.toggle('hidden', open);

      if (!open) {
        const from = Engine.tier(t.unlockFrom);
        n.lockReq.textContent = 'Unlocks at ' + Fmt.whole(t.unlockAt) + ' raccoons on ' + from.name;
        n.lockFill.style.width = (Engine.unlockProgress(t) * 100).toFixed(1) + '%';
        n.stars.classList.add('hidden');
        n.stock.classList.add('hidden');
        n.hint.classList.add('hidden');
        return;
      }

      const assigned = S.assigned[t.id];
      n.stock.classList.remove('hidden');
      n.stockNum.textContent = Fmt.whole(assigned);
      n.stockFill.style.width = (Engine.starProgress(t) * 100).toFixed(1) + '%';

      // stars wait on the pile until they are picked up
      const waiting = S.pendingStars[t.id];
      n.stars.classList.toggle('hidden', waiting <= 0);
      n.tap.classList.toggle('has-stars', waiting > 0);
      if (waiting > 0) n.starsNum.textContent = Fmt.whole(waiting);

      const auto = Engine.hasManager(t);
      const out = OUT_ICON[t.produces];

      // Tapping stays on the table for as long as there is no manager -
      // it is the only way the pile moves, so the badge never hides. It
      // only dims while a run is out, because the pile will not take
      // another tap until the bar comes back.
      n.hint.classList.toggle('hidden', auto || assigned <= 0);
      n.hint.classList.toggle('busy', S.running[t.id]);
      n.tap.classList.toggle('auto', auto);

      const instant = Engine.isInstant(t);
      n.root.classList.toggle('instant', instant);
      n.fill.style.width = instant
        ? '100%'
        : (Math.min(1, S.progress[t.id]) * 100).toFixed(1) + '%';
      n.timer.textContent = instant ? 'INSTANT' : Fmt.secs(Engine.cycleTime(t));

      // What the row hands over when the bar fills - a per-second figure
      // means nothing while you are watching a bar crawl. Once the cycle
      // is too short to see, per second is the only thing that reads.
      if (instant) {
        n.out.className = 'row-out';
        n.out.textContent = out + ' ' + Fmt.rate(Engine.rate(t));
      } else if (assigned > 0) {
        n.out.className = auto ? 'row-out' : 'row-out idle';
        n.out.textContent = out + ' ' + Fmt.n(Engine.haul(t));
      } else {
        n.out.className = 'row-out idle';
        n.out.textContent = 'no raccoons yet';
      }

      const mgr = Engine.manager(t.manager);
      const lvl = Engine.mgrLevel(t);
      if (lvl > 0) {
        n.mgr.className = 'row-mgr on';
        n.mgr.innerHTML = '<b>' + mgr.face + ' ' + mgr.name + '</b> runs this pile · AUTO · Lv' + lvl;
      } else {
        n.mgr.className = 'row-mgr off';
        n.mgr.innerHTML = 'No manager — tap to collect';
      }

      const q = Engine.buyQuote(t.id);
      n.label.textContent = 'BUY x' + Fmt.whole(q.count) + ' RACCOON' + (q.count > 1 ? 'S' : '');
      // Only the plastic. A raccoon costs exactly one raccoon, so the
      // 🦝 half of this badge was always the same number as the "x1.23 M"
      // in the label beside it - and the two of them together were what
      // pushed the price off the end of the button on a phone.
      n.cost.innerHTML = '♻️ ' + Fmt.n(q.plastic);
      n.buy.disabled = !q.can;
    });
  }

  function refreshCards() {
    let owned = 0;
    MANAGERS.forEach(function (mgr) {
      const n = cardNodes[mgr.id];
      const lvl = S.mgrLevel[mgr.id];
      const known = lvl > 0;
      if (known) owned++;

      n.root.classList.toggle('locked', !known);
      n.root.classList.toggle('up-ready', Engine.canUpgrade(mgr.id));

      if (!known) {
        n.lvl.textContent = mgr.passive && S.level < mgr.fromLevel
          ? 'from level ' + mgr.fromLevel
          : 'from packs';
        n.fill.setAttribute('width', 0);
      } else if (mgr.passive) {
        n.lvl.textContent = 'Lv ' + lvl + ' · x' + Fmt.n(passiveMultFor(lvl));
        n.fill.setAttribute('width', (Math.min(1, S.cards[mgr.id] / Engine.upCards(mgr.id)) * CARDS.BAR_W).toFixed(1));
      } else {
        const mt = Engine.tier(mgr.tier);
        n.lvl.textContent = 'Lv ' + lvl + ' · ' + (Engine.isInstant(mt) ? 'INSTANT' : Fmt.secs(Engine.cycleTime(mt)));
        n.fill.setAttribute('width', (Math.min(1, S.cards[mgr.id] / Engine.upCards(mgr.id)) * CARDS.BAR_W).toFixed(1));
      }
    });
    el['mgr-owned'].textContent = owned + ' / ' + MANAGERS.length;
  }

  function refreshDen() {
    el['rat-rate-big'].textContent = '+' + Fmt.rate(Engine.ratoniRate()) + ' raccoons';

    // the den fills up as the deal gets bigger
    const deals = TRADES.reduce(function (a, tr) { return a + S.trades[tr.id]; }, 0);
    const crowd = Math.min(48, 4 + deals * 8);
    if (el['den-art'].childElementCount !== crowd) {
      el['den-art'].innerHTML = new Array(crowd + 1).join('<span>🦝</span>');
    }


    TRADES.forEach(function (tr) {
      const n = tradeNodes[tr.id];
      const open = Engine.tradeUnlocked(tr);
      n.root.classList.toggle('hidden', !open);
      if (!open) return;

      const lvl = S.trades[tr.id];
      const cost = Engine.tradeCost(tr, lvl);

      // a rare card can multiply what a deal pays - show the real figure
      const mult = Engine.passiveMult('deal');
      n.gain.textContent = '+' + Fmt.n(Engine.tradeGain(tr, lvl) * mult) + ' raccoons/sec' +
                           (mult > 1 ? ' (x' + Fmt.n(mult) + ')' : '');
      n.lvl.textContent  = lvl > 0
        ? 'Lv ' + lvl + ' · giving +' + Fmt.n(Engine.tradeGainTotal(tr, lvl) * mult) + '/sec'
        : 'not bought yet';
      const afford = S.plastic >= cost;
      n.btn.innerHTML = 'PAY<br>♻️ ' + Fmt.whole(cost);
      n.btn.disabled = !afford;
      n.root.classList.toggle('ready', afford);
    });
  }

  // ------------------------------------------------------------------
  //  MODALS
  // ------------------------------------------------------------------
  function modal(html) {
    el['modal-root'].innerHTML = '<div class="modal">' + html + '</div>';
    el['modal-root'].classList.remove('hidden');
    return el['modal-root'].querySelector('.modal');
  }

  function closeModal() {
    el['modal-root'].classList.add('hidden');
    el['modal-root'].innerHTML = '';
  }

  function lootCards(loot) {
    return loot.cards.map(function (l, i) {
      const m = Engine.manager(l.id);
      return '<div class="loot ' + m.rarity + (l.isNew ? ' new' : '') +
               '" style="animation-delay:' + (i * 80) + 'ms">' +
               '<div class="loot-art">' + CARDS.card(m.id, m.name, m.short, m.rarity) + '</div>' +
               '<div class="loot-qty">x' + l.qty + '</div>' +
               (l.isNew ? '<div class="loot-new-tag">HIRED!</div>' : '') +
             '</div>';
    }).join('');
  }

  // The pack is shown sealed, the foil is ripped off, and only then do
  // the cards fly out. Without that beat it reads as a list, not a prize.
  function openingModal(loot, title, subtitle, buttonText) {
    const box = modal(
      '<h2>' + title + '</h2>' +
      '<p>' + subtitle + '</p>' +
      '<div class="pack-stage">' + ART.pack(loot.pack.id) + '</div>' +
      '<div class="modal-cards pending"></div>' +
      '<div class="loot-stars pending">+' + Fmt.n(loot.stars) + ' ⭐</div>' +
      '<button class="btn pending" data-close>' + buttonText + '</button>'
    );

    const stage = box.querySelector('.pack-stage');
    setTimeout(function () { stage.classList.add('open'); Sfx.pick(); }, 260);
    setTimeout(function () {
      box.querySelector('.modal-cards').innerHTML = lootCards(loot);
      box.querySelectorAll('.pending').forEach(function (n) { n.classList.remove('pending'); });
    }, 640);

    box.querySelector('[data-close]').addEventListener('click', function () {
      closeModal();
      refresh();
    });
  }

  function packModal(loot) {
    openingModal(loot, loot.pack.name, 'Raccoon cards for the alley', 'NICE');
  }

  function rankModal(loot) {
    openingModal(loot, 'LEVEL ' + S.level,
      'The alley is cleared out and starts again — harder tasks, richer packs.<br>' +
      'Your raccoons, their cards and every star stay with you.',
      'LET US GO AGAIN');
  }

  function managerModal(id) {
    const m = Engine.manager(id);
    const lvl = S.mgrLevel[id];
    const t = m.passive ? null : Engine.tier(m.tier);
    const needStars = Engine.upStars(id);
    const needCards = Engine.upCards(id);
    const can = Engine.canUpgrade(id);

    const box = modal(
      '<h2>' + m.name + '</h2>' +
      '<div class="modal-rarity ' + m.rarity + '">' + RARITY[m.rarity].name + '</div>' +
      '<div class="modal-portrait">' + CARDS.card(m.id, m.name, m.short, m.rarity) + '</div>' +
      '<p>' + m.desc + '</p>' +
      '<div style="margin-top:12px">' +
        '<div class="stat-line"><span>Level</span><b>' + lvl + '</b></div>' +
        (m.passive
          ? '<div class="stat-line"><span>' + PASSIVE_LABEL[m.effect] + '</span><b>x' +
              Fmt.n(passiveMultFor(lvl)) + '</b></div>'
          : '<div class="stat-line"><span>Collection time</span><b>' +
              (Engine.isInstant(t) ? 'INSTANT' : Fmt.secs(Engine.cycleTime(t))) +
              ' (by hand ' + Fmt.secs(t.cycleBase) + ')</b></div>' +
            '<div class="stat-line"><span>' + t.name + ' bring in</span><b>' + OUT_ICON[t.produces] + ' ' +
              (Engine.isInstant(t) ? Fmt.rate(Engine.rate(t)) : Fmt.n(Engine.haul(t)) + ' per run') +
              ' ' + OUT_NAME[t.produces] + '</b></div>') +
        '<div class="stat-line"><span>Cards</span><b>' + Fmt.int(S.cards[id]) + ' / ' + Fmt.int(needCards) + '</b></div>' +
        '<div class="stat-line"><span>Stars</span><b>' + Fmt.n(S.stars) + ' / ' + Fmt.n(needStars) + '</b></div>' +
      '</div>' +
      '<button class="btn" data-up ' + (can ? '' : 'disabled') + '>' +
        (can ? 'UPGRADE TO Lv' + (lvl + 1) + (m.passive ? ' · 2x STRONGER' : ' · 2x FASTER')
             : 'NEED 🃏 ' + Fmt.int(Math.max(0, needCards - S.cards[id])) +
               ' · ⭐ ' + Fmt.n(Math.max(0, needStars - S.stars))) +
      '</button>' +
      '<button class="btn btn-ghost" data-close>BACK</button>'
    );

    // The card in the modal is its own copy, so nothing on the grid refreshes
    // it - fill its level line and its bar once, here, or it opens blank.
    const pLvl  = box.querySelector('.modal-portrait .card-lvl-text');
    const pFill = box.querySelector('.modal-portrait .card-bar-fill');
    if (pLvl && pFill) {
      pLvl.textContent = lvl > 0
        ? 'Lv ' + lvl + ' · ' + (m.passive
            ? 'x' + Fmt.n(passiveMultFor(lvl))
            : (Engine.isInstant(t) ? 'INSTANT' : Fmt.secs(Engine.cycleTime(t))))
        : (m.passive && S.level < m.fromLevel ? 'from level ' + m.fromLevel : 'from packs');
      pFill.setAttribute('width',
        (Math.min(1, S.cards[id] / needCards) * CARDS.BAR_W).toFixed(1));
    }

    box.querySelector('[data-up]').addEventListener('click', function () {
      if (Engine.upgrade(id)) {
        Sfx.up();
        managerModal(id);   // reopen so the new numbers are visible at once
        refresh();
      }
    });
    box.querySelector('[data-close]').addEventListener('click', closeModal);
  }

  function offlineModal(r) {
    const box = modal(
      '<h2>The alley kept working</h2>' +
      '<p>You were away ' + Fmt.duration(r.away) + '.' +
        (r.away > r.seconds ? '<br>The first ' + Fmt.duration(r.seconds) + ' counted.' : '') + '</p>' +
      '<div style="margin-top:12px">' +
        '<div class="stat-line"><span>♻️ Plastic</span><b>+' + Fmt.n(r.plastic) + '</b></div>' +
        '<div class="stat-line"><span>🦝 Raccoons</span><b>+' + Fmt.n(r.ratoni) + '</b></div>' +
      '</div>' +
      '<button class="btn" data-close>BACK TO WORK</button>'
    );
    box.querySelector('[data-close]').addEventListener('click', closeModal);
  }

  function menuModal() {
    const box = modal(
      '<h2>Tato Trash Empire</h2>' +
      '<p>Moonlit Tato · v1.0</p>' +
      '<div style="margin-top:12px">' +
        '<div class="stat-line"><span>Plastic all time</span><b>' + Fmt.n(S.plasticTotal) + '</b></div>' +
        '<div class="stat-line"><span>Raccoons earned</span><b>' + Fmt.n(S.ratoniTotal) + '</b></div>' +
        '<div class="stat-line"><span>Stars earned</span><b>' + Fmt.n(S.starsTotal) + '</b></div>' +
        '<div class="stat-line"><span>Tasks done</span><b>' + S.missionNext + '</b></div>' +
      '</div>' +
      (CFG.dev ? DEV_PANEL : '') +
      '<button class="btn btn-ghost" data-sound>' + (S.muted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON') + '</button>' +
      '<button class="btn btn-ghost" data-wipe>ERASE PROGRESS</button>' +
      '<button class="btn" data-close>CLOSE</button>'
    );

    box.querySelectorAll('[data-dev]').forEach(function (b) {
      b.addEventListener('click', function () {
        Engine.devGive(b.dataset.dev, Number(b.dataset.amount));
        Sfx.buy();
        refresh();
        menuModal();          // reopen so the new totals show
      });
    });

    box.querySelector('[data-sound]').addEventListener('click', function () {
      S.muted = !S.muted;
      save();
      menuModal();
    });
    box.querySelector('[data-wipe]').addEventListener('click', function () {
      const c = modal(
        '<h2>Sure?</h2><p>Everything goes: raccoons, managers, plastic.</p>' +
        '<button class="btn" data-yes>YES, START OVER</button>' +
        '<button class="btn btn-ghost" data-no>NO</button>'
      );
      c.querySelector('[data-yes]').addEventListener('click', function () {
        wipeSave(); save(); location.reload();
      });
      c.querySelector('[data-no]').addEventListener('click', menuModal);
    });
    box.querySelector('[data-close]').addEventListener('click', closeModal);
  }

  // ------------------------------------------------------------------
  //  FX
  // ------------------------------------------------------------------
  function floatAt(x, y, text) {
    const node = document.createElement('div');
    node.className = 'float';
    node.textContent = text;
    node.style.left = x + 'px';
    node.style.top = (y - 20) + 'px';
    el['fx'].appendChild(node);
    setTimeout(function () { node.remove(); }, 900);
  }

  // Stars are never advertised in advance, so when they land they get a
  // banner of their own - otherwise nobody would notice.
  function starBurst(amount) {
    const node = document.createElement('div');
    node.className = 'star-burst';
    node.innerHTML = '+' + Fmt.n(amount) + ' ⭐';
    el['fx'].appendChild(node);
    Sfx.star();
    setTimeout(function () { node.remove(); }, 1400);
  }

  return {
    build: build, refresh: refresh, refreshBars: refreshBars, show: show,
    offlineModal: offlineModal, closeModal: closeModal,
  };
})();
