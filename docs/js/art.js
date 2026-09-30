// =====================================================================
//  ART - every drawing in the game, as inline SVG
//  No image files, nothing to load, and it stays sharp on any screen.
//  Each function returns a string; the UI drops it straight into the DOM.
//
//  Two families:
//    ITEM_ART   the round trash icons on the collect rows
//    NAV_ART    the three tabs along the bottom
//    pack()     the card packs, with a foil top the CSS can tear off
//
//  Manager portraits live in cards.js, which draws a whole card.
// =====================================================================

const ART = (function () {

  // ------------------------------------------------------------------
  //  TRASH - flat, modern, one accent colour each, drawn to sit inside
  //  a circle without touching the rim
  // ------------------------------------------------------------------
  // Every one is outlined in the same dark navy and lit from the top
  // left, so four different objects still look like one set - and so
  // they hold their shape against the pale blue disc behind them.
  const LINE = '#1d2b45';

  const ITEM_ART = {

    // a carrier bag with its handles up
    bag:
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
        '<g fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round">' +
          '<path d="M24 25v-7a8 8 0 0 1 16 0v7" stroke-linecap="round"/>' +
          '<path d="M16 25h32l3 26a5 5 0 0 1-5 5.5H18a5 5 0 0 1-5-5.5l3-26z" fill="#3fa9e0"/>' +
          '<path d="M16 25h12l-2 31.5h-8a5 5 0 0 1-5-5.5l3-26z" fill="#6ec8f0" stroke="none"/>' +
          '<path d="M16 25h32l3 26a5 5 0 0 1-5 5.5H18a5 5 0 0 1-5-5.5l3-26z"/>' +
          '<path d="M27 36a6 6 0 0 0 10 0" stroke-linecap="round" stroke-width="2.6"/>' +
        '</g>' +
      '</svg>',

    // a takeaway cup with a bent straw
    straw:
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
        '<g fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round">' +
          '<path d="M34 24V12a5 5 0 0 1 5-5h6" stroke="#ff6b9d" stroke-width="5" stroke-linecap="round"/>' +
          '<path d="M19 27h26l-3.5 27a5 5 0 0 1-5 4.5H27.5a5 5 0 0 1-5-4.5L19 27z" fill="#f4f8fd"/>' +
          '<path d="M19 27h9l-2 31.5h-.5a5 5 0 0 1-5-4.5L19 27z" fill="#ffffff" stroke="none"/>' +
          '<path d="M19 27h26l-3.5 27a5 5 0 0 1-5 4.5H27.5a5 5 0 0 1-5-4.5L19 27z"/>' +
          '<rect x="15" y="19" width="34" height="9" rx="4.5" fill="#ff6b9d"/>' +
          '<path d="M27 38h10" stroke-width="2.6" stroke-linecap="round" opacity=".5"/>' +
        '</g>' +
      '</svg>',

    // a PET bottle, cap on, label round the middle
    bottle:
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
        '<g fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round">' +
          '<rect x="26" y="5" width="12" height="8" rx="2.5" fill="#2fd6a5"/>' +
          '<path d="M27 13h10v4l6 7v27a6 6 0 0 1-6 6H27a6 6 0 0 1-6-6V24l6-7v-4z" fill="#9fe6cd"/>' +
          '<path d="M27 13h4v4l-4 7v33a6 6 0 0 1-6-6V24l6-7v-4z" fill="#d6f7ec" stroke="none"/>' +
          '<path d="M27 13h10v4l6 7v27a6 6 0 0 1-6 6H27a6 6 0 0 1-6-6V24l6-7v-4z"/>' +
          '<rect x="21" y="31" width="22" height="12" fill="#2fd6a5"/>' +
        '</g>' +
      '</svg>',

    // a canister with a chunky side handle
    can:
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
        '<g fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round">' +
          '<rect x="25" y="5" width="13" height="8" rx="2.5" fill="#e8a52b"/>' +
          '<path d="M39 15h4a6 6 0 0 1 6 6v7h-4a6 6 0 0 1-6-6v-7z" fill="#e8a52b"/>' +
          '<path d="M15 21a7 7 0 0 1 7-7h17a7 7 0 0 1 7 7v29a7 7 0 0 1-7 7H22a7 7 0 0 1-7-7V21z" fill="#ffc247"/>' +
          '<path d="M15 21a7 7 0 0 1 7-7h6v43h-6a7 7 0 0 1-7-7V21z" fill="#ffdc8c" stroke="none"/>' +
          '<path d="M15 21a7 7 0 0 1 7-7h17a7 7 0 0 1 7 7v29a7 7 0 0 1-7 7H22a7 7 0 0 1-7-7V21z"/>' +
          '<rect x="22" y="30" width="16" height="13" rx="2" fill="#fff5dc"/>' +
        '</g>' +
      '</svg>',
  };

  // ------------------------------------------------------------------
  //  CARD PACKS
  //  What a finished task pays out. This used to be a treasure chest and
  //  it was rebuilt four times, because a box has to show its INSIDE to
  //  look open - which needs perspective, and the browser flattens real
  //  3D on SVG groups. A pack has no inside. It only has to tear, and a
  //  tear is a translate and a rotate in the plane of the screen.
  //
  //  It also says what it holds: you get raccoon cards, so there are two
  //  cards printed on the front.
  // ------------------------------------------------------------------
  //  Flat, face-on, outlined in the same navy as the row icons. The foil
  //  top is its own group so the CSS can rip it off.
  function pack(o) {
    const ink = LINE;

    // ONE tear line, shared by both halves: the foil ends on it and the
    // body starts on it. Shut, they interlock with no seam; the moment
    // the foil leaves, the body is already ragged. There is no second
    // "torn" drawing that could drift out of step with the first.
    let zig = '';
    for (let i = 0; i < 5; i++) zig += 'l4.4 3.2l4.4-3.2';

    const TOP  = 'M6 26' + zig + 'V11a5 5 0 0 0-5-5H11a5 5 0 0 0-5 5z';
    const BODY = 'M6 26' + zig + 'V72a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z';

    return '' +
      '<svg viewBox="0 0 56 82" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<g class="pack-glow">' +
          '<circle cx="28" cy="40" r="26" fill="' + o.glow + '" opacity=".38"/>' +
        '</g>' +

        '<g stroke="' + ink + '" stroke-width="2.6" stroke-linejoin="round">' +

          // ---- the body, the part that stays ----
          '<g class="pack-body">' +
            '<path d="' + BODY + '" fill="' + o.body + '"/>' +
            // shadow just inside the opening, so the tear has depth
            '<path d="M6 26' + zig + 'V36H6z" fill="' + o.inside + '" stroke="none" opacity=".5"/>' +
            // the two cards - the only thing this wrapper has to say
            '<rect x="13" y="45" width="15" height="21" rx="2.5" fill="' + o.card2 + '"/>' +
            '<rect x="24" y="41" width="17" height="25" rx="2.5" fill="' + o.card1 + '"/>' +
            '<circle cx="32.5" cy="50" r="3.4" fill="' + ink + '" stroke="none"/>' +
            '<path d="M27 61c1.6-4.4 9.4-4.4 11 0z" fill="' + ink + '" stroke="none"/>' +
            '<path d="' + BODY + '"/>' +
          '</g>' +

          // ---- the foil top, the part that tears away ----
          '<g class="pack-top">' +
            '<path d="' + TOP + '" fill="' + o.foil + '"/>' +
            '<path d="M13 14h30" stroke="' + o.foilHi + '" stroke-width="3.4" stroke-linecap="round"/>' +
            '<path d="' + TOP + '"/>' +
          '</g>' +
        '</g>' +
      '</svg>';
  }

  // The usual rarity ladder - white, green, blue, purple, gold - so a
  // pack says how good it is before it is torn, in the language every
  // card game has already taught the player. Common is deliberately the
  // plainest thing on the screen: no colour to earn, that is the point.
  //
  // Only two of these are in use. The rest are here so a new pack tier
  // is one line in PACK_ART, not a new drawing.
  const PACK_TONE = {
    common:    { body: '#dfe6f0', inside: '#9dabc0', foil: '#f4f8fd', foilHi: '#ffffff',
                 card1: '#8d9bb0', card2: '#6d7b90', glow: '#cfdcec' },
    uncommon:  { body: '#79b957', inside: '#376a2a', foil: '#9ee84f', foilHi: '#c6f48e',
                 card1: '#f2f8e8', card2: '#c0d7a4', glow: '#9ee84f' },
    rare:      { body: '#4a6591', inside: '#1d2c47', foil: '#4ec3ff', foilHi: '#a8f0ff',
                 card1: '#f4f8fd', card2: '#c6d3e6', glow: '#4aa8ff' },
    epic:      { body: '#6d4d95', inside: '#2f1d4a', foil: '#b07cff', foilHi: '#d9bcff',
                 card1: '#f7f2fd', card2: '#d2bfe6', glow: '#b07cff' },
    legendary: { body: '#c08a34', inside: '#4a3210', foil: '#ffc247', foilHi: '#ffe1a0',
                 card1: '#fff6e0', card2: '#e8d2a4', glow: '#ffc247' },
  };

  const PACK_ART = {};
  Object.keys(PACK_TONE).forEach(function (r) { PACK_ART[r] = pack(PACK_TONE[r]); });

  // The two the game deals today. A new tier in PACKS gets its art free
  // as long as its id is a rarity name.
  //
  // Ranking up stops at EPIC on purpose. Legendary is drawn and ready
  // but is being held back for something else, so nothing in the game
  // may hand one out until that is decided.
  PACK_ART.simple = PACK_ART.common;
  PACK_ART.rank   = PACK_ART.epic;

  // ------------------------------------------------------------------
  //  NAV ICONS - small, single-weight, they read at 22px
  // ------------------------------------------------------------------
  const NAV_ART = {
    collect:
      '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M7 10h18l-1.6 17A3 3 0 0 1 20.4 30h-8.8a3 3 0 0 1-3-2.9L7 10z" ' +
          'fill="currentColor" opacity=".85"/>' +
        '<rect x="4" y="6" width="24" height="5" rx="2.5" fill="currentColor"/>' +
        '<rect x="13" y="2" width="6" height="4" rx="2" fill="currentColor"/>' +
        '<path d="M13 16v9M19 16v9" stroke="#0e1320" stroke-width="2.4" stroke-linecap="round"/>' +
      '</svg>',

    managers:
      '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="3" y="7" width="15" height="21" rx="3" fill="currentColor" opacity=".45"/>' +
        '<rect x="11" y="4" width="17" height="24" rx="3" fill="currentColor"/>' +
        '<circle cx="19.5" cy="13" r="4" fill="#0e1320"/>' +
        '<path d="M13 25c1.4-4 11-4 12.4 0z" fill="#0e1320"/>' +
      '</svg>',

    den:
      '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M7 13 5 4l8 4zM25 13l2-9-8 4z" fill="currentColor"/>' +
        '<path d="M16 6c6 0 10 4 10 11s-4 12-10 12S6 24 6 17 10 6 16 6z" fill="currentColor"/>' +
        '<path d="M16 15c3 0 5.5 1 7 3-1 4-3.6 6-7 6s-6-2-7-6c1.5-2 4-3 7-3z" fill="#0e1320"/>' +
        '<circle cx="12" cy="18" r="2" fill="currentColor"/>' +
        '<circle cx="20" cy="18" r="2" fill="currentColor"/>' +
      '</svg>',
  };

  return {
    item:    function (id)   { return ITEM_ART[id] || ''; },
    nav:     function (id)   { return NAV_ART[id] || ''; },
    pack:    function (kind) { return PACK_ART[kind] || PACK_ART.simple; },
  };
})();
