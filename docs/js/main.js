// =====================================================================
//  MAIN - sound, the clock, and booting the whole thing up
// =====================================================================

// --------------------------------------------------------------------
//  SFX - tiny WebAudio blips. No files to load, nothing to wait for.
//  The context is created on the first tap because browsers refuse to
//  start audio before the player has touched the screen.
// --------------------------------------------------------------------
const Sfx = (function () {
  let ctx = null;

  function ensure() {
    if (S.muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, gain) {
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.value = gain || 0.05;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  }

  function seq(notes, step) {
    notes.forEach(function (f, i) {
      setTimeout(function () { beep(f, 0.12, 'square', 0.05); }, i * (step || 70));
    });
  }

  return {
    pick:  function () { beep(420 + Math.random() * 120, 0.07, 'square', 0.04); },
    buy:   function () { seq([520, 700], 60); },
    up:    function () { seq([523, 659, 784, 1047], 70); },
    chest: function () { seq([392, 523, 659, 784, 1047], 90); },
    deny:  function () { beep(140, 0.12, 'sawtooth', 0.035); },
    tick:  function () { beep(880, 0.04, 'triangle', 0.03); },
    star:  function () { seq([880, 1175, 1568], 55); },
  };
})();

// --------------------------------------------------------------------
//  CLOCK
// --------------------------------------------------------------------
let lastFrame = 0;
let accumulator = 0;
let uiAccumulator = 0;
let saveAccumulator = 0;

const STEP = 1 / CFG.tickRate;

function frame(now) {
  requestAnimationFrame(frame);

  if (!lastFrame) { lastFrame = now; return; }
  // A long gap means the tab was asleep; the visibility handler already
  // paid that time out properly, so never simulate more than a quarter
  // of a second inside one frame.
  let dt = Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;

  accumulator += dt;
  while (accumulator >= STEP) {
    Engine.tick(STEP);
    accumulator -= STEP;
  }

  uiAccumulator += dt;
  if (uiAccumulator >= 1 / CFG.uiRate) {
    uiAccumulator = 0;
    UI.refresh();
  }

  saveAccumulator += dt;
  if (saveAccumulator >= CFG.saveEvery) {
    saveAccumulator = 0;
    save();
  }
}

// --------------------------------------------------------------------
//  TIME AWAY
//  Both for a cold start and for coming back to a backgrounded tab.
// --------------------------------------------------------------------
function payTimeAway(showPanel) {
  const gap = (Date.now() - S.lastSeen) / 1000;
  if (gap < 30) return;
  const report = Engine.runOffline(gap);
  if (report && showPanel && gap > 120) UI.offlineModal(report);
  S.lastSeen = Date.now();
}

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    save();
  } else {
    payTimeAway(true);
    lastFrame = 0;
    UI.refresh();
  }
});

window.addEventListener('pagehide', save);
window.addEventListener('blur', save);

// --------------------------------------------------------------------
//  BOOT
// --------------------------------------------------------------------
(function boot() {
  const hadSave = load();

  UI.build();
  UI.show('collect');

  if (hadSave) payTimeAway(true);
  save();

  requestAnimationFrame(frame);
})();
