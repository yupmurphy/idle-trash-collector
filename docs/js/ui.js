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
    ['w-ratoni', 'w-ratrate', 'w-stars', 'w-cards', 'w-plastic', 'w-plasticrate',
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

    // All three chests share one row - three columns, chest on top of
    // its own task, so the strip stays one band across the screen.
    for (let i = 0; i < MISSION_SLOTS; i++) {
      const node = document.createElement('div');
      node.className = 'task';
      node.innerHTML =
        '<button class="task-chest" data-slot="' + i + '" disabled></button>' +
        '<div class="task-text"></div>' +
        '<div class="bar task-bar"><div class="bar-fill"></div></div>' +
        '<div class="task-count"></div>';
      host.appendChild(node);

      taskNodes.push({
        root:  node,
        text:  node.querySelector('.task-text'),
        count: node.querySelector('.task-count'),
        fill:  node.querySelector('.bar-fill'),
        chest: node.querySelector('.task-chest'),
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

    document.querySelectorAll('.bulk-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        S.bulk = b.dataset.bulk === 'max' ? 'max' : parseInt(b.dataset.bulk, 10);
        syncBulk();
        refresh();
        Sfx.tick();
      });
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
      Sfx.chest();
      chestModal(loot);
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
    document.querySelectorAll('.bulk-btn').forEach(function (b) {
      const v = b.dataset.bulk === 'max' ? 'max' : parseInt(b.dataset.bulk, 10);
      b.classList.toggle('on', v === S.bulk);
    });
  }

  function show(name) {
    page = name;
    ['collect', 'managers', 'raccoons'].forEach(function (p) {
      $('page-' + p).classList.toggle('hidden', p !== name);
    });
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.page === name);
    });
    refresh();
  }

  // ------------------------------------------------------------------
  //  REFRESH
  // ------------------------------------------------------------------
  function refresh() {
    el['w-ratoni'].textContent  = Fmt.whole(S.ratoni);
    el['w-ratrate'].textContent = '+' + Fmt.rate(Engine.ratoniRate());
    el['w-stars'].textContent   = Fmt.n(S.stars);
    el['w-cards'].textContent   = Fmt.int(Engine.totalCards());
    el['w-plastic'].textContent = Fmt.n(S.plastic);
    el['w-plasticrate'].textContent = '+' + Fmt.rate(Engine.totalRate());

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

  function refreshTasks() {
    S.slots.forEach(function (idx, i) {
      const n = taskNodes[i];
      const m = Engine.missionAt(idx);
      if (!m) {
        // this level has no tasks left - the rank bar is the way on
        n.root.classList.remove('done');
        n.root.classList.add('spent');
        n.text.textContent  = 'Level cleared';
        n.count.textContent = '';
        n.chest.innerHTML = '<span class="task-lock">✓</span>';
        n.chest.disabled = true;
        n.fill.style.width = '100%';
        return;
      }
      n.root.classList.remove('spent');

      const done = Engine.missionDone(idx);
      const prog = Math.min(Engine.missionProgress(m), m.amount);

      n.text.textContent  = Engine.missionText(m);
      n.count.textContent = Fmt.n(prog) + ' / ' + Fmt.n(m.amount);
      n.chest.innerHTML = done ? ART.chest(m.chest || DEFAULT_CHEST) : '<span class="task-lock">🔒</span>';
      n.fill.style.width  = (prog / m.amount * 100).toFixed(1) + '%';
      n.root.classList.toggle('done', done);
      n.chest.disabled = !done;
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
      n.cost.innerHTML = '🦝 ' + Fmt.whole(q.ratoni) + ' · ♻️ ' + Fmt.n(q.plastic);
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
          : 'from chests';
        n.fill.setAttribute('width', 0);
      } else if (mgr.passive) {
        n.lvl.textContent = 'Lv ' + lvl + ' · x' + Fmt.n(passiveMultFor(lvl));
        n.fill.setAttribute('width', (Math.min(1, S.cards[mgr.id] / Engine.upCards(mgr.id)) * 232).toFixed(1));
      } else {
        const mt = Engine.tier(mgr.tier);
        n.lvl.textContent = 'Lv ' + lvl + ' · ' + (Engine.isInstant(mt) ? 'INSTANT' : Fmt.secs(Engine.cycleTime(mt)));
        n.fill.setAttribute('width', (Math.min(1, S.cards[mgr.id] / Engine.upCards(mgr.id)) * 232).toFixed(1));
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

  // The chest is shown shut, throws its lid open, and only then do the
  // cards fly out. Without that beat it reads as a list, not a prize.
  function openingModal(loot, title, subtitle, buttonText) {
    const box = modal(
      '<h2>' + title + '</h2>' +
      '<p>' + subtitle + '</p>' +
      '<div class="chest-stage">' + ART.chest(loot.chest.id) + '</div>' +
      '<div class="modal-cards pending"></div>' +
      '<div class="loot-stars pending">+' + Fmt.n(loot.stars) + ' ⭐</div>' +
      '<button class="btn pending" data-close>' + buttonText + '</button>'
    );

    const stage = box.querySelector('.chest-stage');
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

  function chestModal(loot) {
    openingModal(loot, loot.chest.name, 'Raccoon cards for the alley', 'NICE');
  }

  function rankModal(loot) {
    openingModal(loot, 'LEVEL ' + S.level,
      'The alley is cleared out and starts again — harder tasks, richer chests.<br>' +
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
    build: build, refresh: refresh, show: show,
    offlineModal: offlineModal, closeModal: closeModal,
  };
})();
