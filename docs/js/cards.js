// =====================================================================
//  CARDS - a manager card, 300x450
//
//  The raccoon himself is a drawn PNG in art/, cut from a generated
//  character sheet. Everything around him - frame, field, title, level,
//  progress - is SVG built here, so it stays sharp and stays editable.
//
//  House rules:
//    * rarity is the only thing that carries colour. Common is grey,
//      rare is blue, and a rare pull has to read from across the room
//    * the name and the effect line are SVG text, never baked into the
//      image, so they stay crisp and can be changed without new art
//    * no badges, no emoji
//
//  The UI rewrites two nodes in place every frame: .card-lvl-text and
//  .card-bar-fill. The bar's full width is BAR_W - ui.js knows that
//  number, so do not move the bar without changing it there too.
// =====================================================================

const CARDS = (function () {

  const W = 300, H = 450;
  const BAR_X = 34, BAR_Y = 388, BAR_W = 232, BAR_H = 18;

  // The art field: a blob rather than a rectangle, so the character can
  // run off its edge instead of stopping short of it.
  const BLOB = 'M40 104c60-14 150-16 208-4 18 4 24 18 22 40-3 34-1 96-6 130' +
               '-3 20-14 30-38 32-52 5-116 5-166-1-22-3-32-14-32-36-1-40 2-112 6-138' +
               ' 2-14 6-20 6-23z';

  const FRAME = {
    common: { frame: '#c9d2de', a: '#dfe5ec', b: '#b3bdcb', c: '#8b98ab', label: '#9aa4b2' },
    rare:   { frame: '#4ec3ff', a: '#a8f0ff', b: '#4ec3ff', c: '#2b7fd4', label: '#3f9fd6' },
  };

  // Gradients and clip paths need ids, and several cards live on the
  // page at once, so every card gets its own.
  let seq = 0;

  function card(id, name, effect, rarity) {
    const f = FRAME[rarity] || FRAME.common;
    const u = 'c' + (++seq);

    // long names have to drop a size or they run into the frame
    const titleSize = name.length > 12 ? 19 : 23;

    return '' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +

        '<defs>' +
          '<radialGradient id="g' + u + '" cx="50%" cy="46%" r="62%">' +
            '<stop offset="0%" stop-color="' + f.a + '"/>' +
            '<stop offset="45%" stop-color="' + f.b + '"/>' +
            '<stop offset="100%" stop-color="' + f.c + '"/>' +
          '</radialGradient>' +
          '<filter id="s' + u + '" x="-40%" y="-90%" width="180%" height="280%">' +
            '<feGaussianBlur stdDeviation="6"/>' +
          '</filter>' +
          '<clipPath id="k' + u + '"><path d="' + BLOB + '"/></clipPath>' +
        '</defs>' +

        '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="22" fill="#fcfcfc"/>' +

        // ---- who he is, and what he does ----
        '<text x="26" y="48" fill="#14181f" font-family="Segoe UI, system-ui, sans-serif" ' +
          'font-size="' + titleSize + '" font-weight="800">' + name + '</text>' +
        '<text x="27" y="68" fill="#8a93a1" font-family="Segoe UI, system-ui, sans-serif" ' +
          'font-size="11" font-weight="600" letter-spacing="0.6">' + effect.toUpperCase() + '</text>' +

        // ---- the field, then the raccoon standing on it ----
        //  Both live in .card-art so a locked card can grey out the portrait
        //  while the frame and the rarity label keep their colour - you are
        //  meant to see which rarity you have not pulled yet.
        '<g class="card-art">' +
          '<path d="' + BLOB + '" fill="url(#g' + u + ')"/>' +
          '<g clip-path="url(#k' + u + ')">' +
            '<ellipse cx="150" cy="292" rx="66" ry="12" fill="#000" opacity=".20" ' +
              'filter="url(#s' + u + ')"/>' +
            '<image href="art/' + id + '.png" x="62" y="108" width="176" height="186" ' +
              'preserveAspectRatio="xMidYMax meet"/>' +
          '</g>' +
        '</g>' +

        // ---- level and card progress, rewritten in place by the UI ----
        '<text class="card-lvl-text" x="150" y="372" text-anchor="middle" fill="#6b7482" ' +
          'font-family="Segoe UI, system-ui, sans-serif" font-size="17" font-weight="700"></text>' +
        '<rect x="' + BAR_X + '" y="' + BAR_Y + '" width="' + BAR_W + '" height="' + BAR_H + '" ' +
          'rx="9" fill="#e4e9f0"/>' +
        '<rect class="card-bar-fill" x="' + BAR_X + '" y="' + BAR_Y + '" width="0" ' +
          'height="' + BAR_H + '" rx="9" fill="#7ac943"/>' +

        '<text x="150" y="432" text-anchor="middle" fill="' + f.label + '" ' +
          'font-family="Segoe UI, system-ui, sans-serif" font-size="11" font-weight="700" ' +
          'letter-spacing="1.4">' + (rarity || 'common').toUpperCase() + '</text>' +

        // ---- the frame last, over everything ----
        '<rect x="5" y="5" width="' + (W - 10) + '" height="' + (H - 10) + '" rx="20" ' +
          'fill="none" stroke="' + f.frame + '" stroke-width="10"/>' +
      '</svg>';
  }

  return { card: card, BAR_W: BAR_W };
})();
