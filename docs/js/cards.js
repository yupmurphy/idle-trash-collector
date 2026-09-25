// =====================================================================
//  CARDS - a manager card drawn whole, as one 300x450 SVG
//
//  House style, applied to every card:
//    * flat vector, no gradients and no soft shadows
//    * one black outline weight throughout, INK_W, on every shape
//    * four or five saturated colours per card and nothing else
//    * the raccoon is built from circles, ellipses and polygons
//    * a plain background, one colour, with a flat geometric motif
//    * lines set very slightly off-square, so it reads hand-drawn
//    * illustration on the top 60%, then title, then one line of effect
//    * the frame's colour is the card's rarity
// =====================================================================

const CARDS = (function () {

  const INK   = '#141414';
  const INK_W = 6;
  const W = 300, H = 450;
  const ART_H = 270;                  // the top 60%

  // Rarity owns the frame and the plate the text sits on.
  const FRAME = {
    common: { frame: '#f2f5f8', plate: '#2a3346', text: '#ffffff', tag: '#c3ccda',
              bg: '#7e8da6', motif: '#6c7b94' },
    rare:   { frame: '#4ec3ff', plate: '#12314d', text: '#ffffff', tag: '#8fdcff',
              bg: '#3aa0ff', motif: '#2b86e0' },
  };

  // ------------------------------------------------------------------
  //  THE RACCOON
  //  Circles and ellipses only, so every card is unmistakably the same
  //  animal. Expression is four parameters: brows, eyes, mouth, prop.
  // ------------------------------------------------------------------
  function face(o) {
    const fur  = o.fur;
    const dark = o.dark;
    const pale = o.pale;
    const ink  = 'stroke="' + INK + '" stroke-width="' + INK_W + '" stroke-linejoin="round" stroke-linecap="round"';

    const eyeR = o.wide ? 26 : 22;
    const pupR = o.wide ? 11 : 9;

    return '' +
      // ---- ringed tail, drawn first so it sits behind ----
      //  Segments rather than a dashed stroke: a real raccoon tail is
      //  two colours banded, and each band needs its own outline to
      //  hold up in this style.
      '<g ' + ink + '>' +
        '<ellipse cx="228" cy="250" rx="26" ry="23" fill="' + pale + '"/>' +
        '<ellipse cx="248" cy="216" rx="25" ry="22" fill="' + dark + '"/>' +
        '<ellipse cx="258" cy="180" rx="24" ry="21" fill="' + pale + '"/>' +
        '<ellipse cx="256" cy="146" rx="22" ry="19" fill="' + dark + '"/>' +
        '<ellipse cx="244" cy="118" rx="19" ry="17" fill="' + pale + '"/>' +
      '</g>' +

      // ---- body ----
      '<path d="M150 150c42 0 70 34 70 86v30H80v-30c0-52 28-86 70-86z" fill="' + fur + '" ' + ink + '/>' +
      '<ellipse cx="150" cy="232" rx="34" ry="40" fill="' + pale + '" ' + ink + '/>' +

      // ---- ears ----
      '<circle cx="82"  cy="78" r="30" fill="' + fur + '" ' + ink + '/>' +
      '<circle cx="219" cy="76" r="30" fill="' + fur + '" ' + ink + '/>' +
      '<circle cx="83"  cy="79" r="14" fill="' + pale + '" ' + ink + ' stroke-width="4"/>' +
      '<circle cx="218" cy="77" r="14" fill="' + pale + '" ' + ink + ' stroke-width="4"/>' +

      // ---- head: a touch wider than tall, and a touch off-level ----
      '<ellipse cx="150" cy="118" rx="76" ry="70" fill="' + fur + '" ' + ink + '/>' +

      // ---- bandit mask, split by a pale blaze ----
      '<path d="M150 88c34 0 60 10 66 26-6 30-32 46-66 46s-60-16-66-46c6-16 32-26 66-26z" ' +
        'fill="' + dark + '" ' + ink + '/>' +
      '<path d="M150 50c8 0 13 8 14 22l-4 62h-20l-4-62c1-14 6-22 14-22z" fill="' + pale + '" ' + ink + '/>' +

      // ---- eyes ----
      '<circle cx="115" cy="112" r="' + eyeR + '" fill="#ffffff" ' + ink + '/>' +
      '<circle cx="186" cy="112" r="' + eyeR + '" fill="#ffffff" ' + ink + '/>' +
      (o.wink
        ? '<path d="M172 112c8-8 20-8 28 0" fill="none" ' + ink + '/>'
        : '<circle cx="' + (186 + (o.look || 0)) + '" cy="114" r="' + pupR + '" fill="' + INK + '"/>') +
      '<circle cx="' + (115 + (o.look || 0)) + '" cy="114" r="' + pupR + '" fill="' + INK + '"/>' +

      // ---- brows: where the whole expression lives ----
      (o.brow || '') +

      // ---- muzzle and nose ----
      '<ellipse cx="150" cy="158" rx="40" ry="28" fill="' + pale + '" ' + ink + '/>' +
      '<ellipse cx="150" cy="146" rx="15" ry="11" fill="' + INK + '"/>' +
      (o.mouth || '<path d="M150 157v9M150 166c-8 9-18 7-21 1M150 166c8 9 18 7 21 1" fill="none" ' + ink + '/>') +

      // ---- whatever this one wears or carries ----
      (o.prop || '');
  }

  // ------------------------------------------------------------------
  //  THE SIX
  //  Four or five saturated colours each: background, fur, dark, pale,
  //  and one accent for the prop.
  // ------------------------------------------------------------------
  const CAST = {
    mgr_tato: {
      bg: '#2fd6a5', motif: '#25b78d',
      art: { fur: '#9fb2c9', dark: '#1f2733', pale: '#f4f8fc',
        brow: '<path d="M92 76l34 12M208 76l-34 12" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>',
        mouth: '<path d="M150 157v8M126 170c14 14 34 14 48 0" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>',
        // the studio cap, with its moon
        prop: '<path d="M74 84C84 44 112 24 150 24s66 20 76 60c-22-14-46-20-76-20s-54 6-76 20z" fill="#ff6b9d" stroke="' + INK + '" stroke-width="' + INK_W + '" stroke-linejoin="round"/>' +
              '<path d="M74 84h152v14H74z" fill="#e0457c" stroke="' + INK + '" stroke-width="' + INK_W + '" stroke-linejoin="round"/>' +
              '<path d="M196 38a20 20 0 1 0 19 28 23 23 0 0 1-19-28z" fill="#ffe27a" stroke="' + INK + '" stroke-width="5"/>',
      },
    },

    mgr_grumpy: {
      bg: '#ff8a3d', motif: '#e4702a',
      art: { fur: '#b0b0b0', dark: '#2e3238', pale: '#f6f6f6',
        brow: '<path d="M86 68l44 26M214 68l-44 26" fill="none" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>',
        mouth: '<path d="M150 157v8M124 180c16-14 36-14 52 0" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>',
      },
    },

    mgr_scary: {
      bg: '#8b5cf6', motif: '#7040e0',
      art: { fur: '#8f86ad', dark: '#211b30', pale: '#e6dffa', wide: true, look: 4,
        brow: '<path d="M88 66l40 8M212 66l-40 8" fill="none" stroke="' + INK + '" stroke-width="8" stroke-linecap="round"/>',
        mouth: '<path d="M116 164h68l-9 15-11-9-12 12-12-12-11 9z" fill="#ffffff" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>',
      },
    },

    mgr_fancy: {
      bg: '#ffc247', motif: '#e8a52b',
      art: { fur: '#c8b79c', dark: '#2d2a25', pale: '#faf3e6',
        brow: '<path d="M92 74l34 8M208 74l-34 8" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>',
        mouth: '<path d="M150 157v8M130 170c12 12 28 12 40 0" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>',
        // top hat and monocle
        prop: '<rect x="98" y="0" width="104" height="52" rx="6" fill="#2b2b3a" stroke="' + INK + '" stroke-width="' + INK_W + '"/>' +
              '<rect x="98" y="30" width="104" height="16" fill="#ff6b9d" stroke="' + INK + '" stroke-width="5"/>' +
              '<rect x="66" y="44" width="168" height="18" rx="9" fill="#2b2b3a" stroke="' + INK + '" stroke-width="' + INK_W + '"/>' +
              '<circle cx="186" cy="112" r="34" fill="none" stroke="' + INK + '" stroke-width="7"/>' +
              '<path d="M212 136l18 40" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>',
      },
    },

    mgr_scrapper: {
      bg: '#4aa8ff', motif: '#2d8be0',
      art: { fur: '#9db9d2', dark: '#1e2a36', pale: '#eef6fc', wink: true,
        brow: '<path d="M92 74l34 10M208 76l-34 6" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>',
        mouth: '<path d="M150 157v8M128 168c12 14 32 14 44 0" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>',
        // cap worn backwards, wrench over the shoulder
        prop: '<path d="M72 82C82 42 110 22 150 22s68 20 78 60c-22-14-48-20-78-20s-56 6-78 20z" fill="#2fd6a5" stroke="' + INK + '" stroke-width="' + INK_W + '" stroke-linejoin="round"/>' +
              '<rect x="212" y="56" width="42" height="22" rx="11" fill="#25b78d" stroke="' + INK + '" stroke-width="5"/>' +
              '<path d="M44 262l34-40" fill="none" stroke="#d7dee8" stroke-width="20" stroke-linecap="round"/>' +
              '<path d="M44 262l34-40" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
              '<path d="M70 210a18 18 0 1 1 24 20l-10-10z" fill="#d7dee8" stroke="' + INK + '" stroke-width="5"/>',
      },
    },

    mgr_baron: {
      bg: '#ff5d73', motif: '#e33f57',
      art: { fur: '#d9bb68', dark: '#2f2718', pale: '#fcf3d6',
        brow: '<path d="M92 72l34 8M208 72l-34 8" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>',
        mouth: '<path d="M150 157v8M122 168c16 20 40 20 56 0" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>',
        prop: '<path d="M72 60 79 8l26 22 30-26 30 26 26-22 7 52z" fill="#ffd94a" stroke="' + INK + '" stroke-width="' + INK_W + '" stroke-linejoin="round"/>' +
              '<rect x="68" y="52" width="164" height="20" rx="6" fill="#e8a52b" stroke="' + INK + '" stroke-width="5"/>' +
              '<circle cx="150" cy="14" r="9" fill="#4aa8ff" stroke="' + INK + '" stroke-width="5"/>',
      },
    },
  };

  // ------------------------------------------------------------------
  //  THE CARD
  // ------------------------------------------------------------------
  function card(id, name, effect, rarity) {
    const c = CAST[id];
    if (!c) return '';
    const f = FRAME[rarity] || FRAME.common;

    return '' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +

        // ---- background, one flat colour with a flat motif ----
        '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="22" fill="' + f.plate + '"/>' +
        '<path d="M10 24a14 14 0 0 1 14-14h252a14 14 0 0 1 14 14v246H10V24z" fill="' + f.bg + '"/>' +
        '<g fill="' + f.motif + '">' +
          '<circle cx="46" cy="52" r="26"/>' +
          '<circle cx="256" cy="226" r="34"/>' +
          '<path d="M10 200l58 70H10z"/>' +
        '</g>' +

        // ---- the raccoon ----
        '<g>' + face(c.art) + '</g>' +

        // ---- a floor line, so he is standing on something ----
        '<path d="M10 268h280" stroke="' + INK + '" stroke-width="' + INK_W + '" stroke-linecap="round"/>' +

        // ---- title, then one line of what the card does ----
        '<text x="150" y="312" text-anchor="middle" fill="' + f.text + '" ' +
          'font-family="Segoe UI, system-ui, sans-serif" font-size="30" font-weight="800">' + name + '</text>' +
        '<text x="150" y="342" text-anchor="middle" fill="' + f.tag + '" ' +
          'font-family="Segoe UI, system-ui, sans-serif" font-size="17" font-weight="600">' + effect + '</text>' +

        // ---- level and card progress, updated in place by the UI ----
        '<text class="card-lvl-text" x="150" y="382" text-anchor="middle" fill="#ffc247" ' +
          'font-family="Segoe UI, system-ui, sans-serif" font-size="19" font-weight="700"></text>' +
        '<rect x="34" y="398" width="232" height="18" rx="9" fill="#0b1018"/>' +
        '<rect class="card-bar-fill" x="34" y="398" width="0" height="18" rx="9" fill="#9ee84f"/>' +

        // ---- the frame last, over everything ----
        '<rect x="5" y="5" width="' + (W - 10) + '" height="' + (H - 10) + '" rx="20" ' +
          'fill="none" stroke="' + f.frame + '" stroke-width="10"/>' +
      '</svg>';
  }

  return { card: card };
})();
