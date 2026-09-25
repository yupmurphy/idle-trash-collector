// =====================================================================
//  ART - every drawing in the game, as inline SVG
//  No image files, nothing to load, and it stays sharp on any screen.
//  Each function returns a string; the UI drops it straight into the DOM.
//
//  Two families:
//    ITEM_ART   the round trash icons on the collect rows
//    NAV_ART    the three tabs along the bottom
//    chest()    the chests, with a lid the CSS can throw open
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

  //  One base face, six sets of eyebrows, mouths and props. Keeping the
  //  skull identical is what makes them read as a family.
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  //  CHESTS
  //  The lid is its own group so the CSS can throw it open.
  // ------------------------------------------------------------------
  //  Built like the real thing: a plank box, a barrel lid, gold bands
  //  down the front and round the corners, and a lock plate in the
  //  middle. Everything outlined in the same dark brown.
  function chest(o) {
    const ink = o.ink;

    return '' +
      '<svg viewBox="0 0 80 66" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<g class="chest-glow">' +
          '<circle cx="40" cy="32" r="27" fill="' + o.glow + '" opacity=".35"/>' +
        '</g>' +

        '<g stroke="' + ink + '" stroke-width="2.6" stroke-linejoin="round">' +

          // ---- lid, FIRST so it sits behind the box ----
          //  Flat, not domed: a slab reads right when it tilts back and
          //  foreshortens, where a barrel only ever looks squashed. The
          //  hinge is the box rim at y=34, so it never floats.
          '<g class="chest-lid">' +
            '<rect x="7" y="13" width="66" height="21" rx="2" fill="' + o.lid + '"/>' +
            '<path d="M10 21h60" stroke="' + o.plank + '" stroke-width="1.8" stroke-linecap="round"/>' +
            '<rect x="7" y="13" width="66" height="21" rx="2"/>' +
            '<rect x="7" y="13" width="12" height="21" rx="2" fill="' + o.metal + '"/>' +
            '<rect x="61" y="13" width="12" height="21" rx="2" fill="' + o.metal + '"/>' +
            '<rect x="34" y="13" width="12" height="21" fill="' + o.metal + '"/>' +
            // the lip that overhangs the box when it is shut
            '<rect x="5" y="29" width="70" height="8" rx="3" fill="' + o.metalHi + '"/>' +
          '</g>' +

          // ---- the inside of the box, only seen once the lid is up ----
          '<path d="M11 27h58v16H11z" fill="' + o.inside + '"/>' +
          '<path d="M11 27h58v6H11z" fill="' + o.insideLo + '" stroke="none"/>' +

          // ---- front wall: planks, then the metal over them ----
          '<rect x="9" y="35" width="62" height="26" rx="3" fill="' + o.body + '"/>' +
          '<path d="M12 44h56M12 53h56" stroke="' + o.plank + '" stroke-width="1.8" stroke-linecap="round"/>' +
          '<rect x="9" y="35" width="62" height="26" rx="3"/>' +

          // corner brackets and the band down the middle
          '<path d="M9 38a3 3 0 0 1 3-3h7v26h-7a3 3 0 0 1-3-3V38z" fill="' + o.metal + '"/>' +
          '<path d="M61 35h7a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3h-7V35z" fill="' + o.metal + '"/>' +
          '<rect x="34" y="35" width="12" height="26" fill="' + o.metal + '"/>' +

          // ---- lock plate ----
          '<rect x="31" y="38" width="18" height="15" rx="3" fill="' + o.metalHi + '"/>' +
          '<circle cx="40" cy="44" r="2.6" fill="' + ink + '" stroke="none"/>' +
          '<path d="M38.6 45h2.8l1 5h-4.8z" fill="' + ink + '" stroke="none"/>' +
        '</g>' +
      '</svg>';
  }

  const CHEST_ART = {
    simple: chest({ ink: '#5a3a22', body: '#9a6b43', plank: '#7d5334', lid: '#a87a4e',
                    inside: '#4b2f1a', insideLo: '#331f10',
                    metal: '#f2c14e', metalHi: '#ffd97a', glow: '#ffc247' }),
    rank:   chest({ ink: '#23324f', body: '#4a6591', plank: '#3a5178', lid: '#5a78a8',
                    inside: '#22314d', insideLo: '#16223a',
                    metal: '#9ee84f', metalHi: '#c6f48e', glow: '#9ee84f' }),
  };

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
    chest:   function (kind) { return CHEST_ART[kind] || CHEST_ART.simple; },
  };
})();
