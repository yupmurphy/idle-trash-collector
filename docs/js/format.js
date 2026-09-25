// =====================================================================
//  FORMAT - turning idle-game numbers into something readable
//  An idle game runs out of real number names within an hour of play, so
//  after trillions it switches to the genre's letter notation:
//  ... T, AA, AB, AC ... AZ, BA ... ZZ, AAA, AAB ...
// =====================================================================

const Fmt = (function () {

  const SHORT = ['', 'K', 'M', 'B', 'T'];

  // 0 -> AA, 1 -> AB, ... 25 -> AZ, 26 -> BA, ... 675 -> ZZ, 676 -> AAA
  function letters(i) {
    let width = 2;
    let block = 26 * 26;
    while (i >= block) {
      i -= block;
      width++;
      block *= 26;
    }
    let out = '';
    for (let d = 0; d < width; d++) {
      out = String.fromCharCode(65 + (i % 26)) + out;
      i = Math.floor(i / 26);
    }
    return out;
  }

  function suffix(tier) {
    return tier < SHORT.length ? SHORT[tier] : letters(tier - SHORT.length);
  }

  // The main one. 1234 -> "1.23 K", 0.5 -> "0.5", 42 -> "42"
  function n(v, decimals) {
    if (!isFinite(v)) return '∞';
    if (v < 0) return '-' + n(-v, decimals);
    if (v < 1000) {
      if (v === 0) return '0';
      if (v >= 100) return String(Math.floor(v));
      if (v >= 10)  return trim(v.toFixed(1));
      return trim(v.toFixed(2));
    }
    const tier = Math.floor(Math.log10(v) / 3);
    const mantissa = v / Math.pow(1000, tier);
    const d = decimals === undefined ? 2 : decimals;
    return mantissa.toFixed(d) + ' ' + suffix(tier);
  }

  // Counts of things you own read better without decimals below a million.
  function int(v) {
    if (v < 1e6) return Math.floor(v).toLocaleString('en-US');
    // "10 M" reads like a threshold; "10.00 M" reads like a readout
    return n(v).replace('.00 ', ' ');
  }

  // Rates: keeps a couple of decimals while the number is still small,
  // because "+0/s" in the first minute looks broken.
  function rate(v) {
    if (v > 0 && v < 1) return trim(v.toFixed(2)) + '/s';
    return n(v) + '/s';
  }

  function trim(s) {
    return s.indexOf('.') < 0 ? s : s.replace(/\.?0+$/, '');
  }

  // Raccoons are whole animals - no decimals, no thousands commas, and
  // a round threshold reads "10 K" rather than "10.00 K".
  function whole(v) { return n(Math.floor(v)).replace('.00 ', ' '); }

  // Cycle times: "3.0s", "0.75s", "12ms" once a manager gets silly.
  function secs(v) {
    if (v < 0.1) return Math.round(v * 1000) + 'ms';
    if (v < 1)   return trim(v.toFixed(2)) + 's';
    return v.toFixed(1) + 's';
  }

  // "2h 14m" - used by the offline-progress panel
  function duration(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + s + 's';
    return s + 's';
  }

  return { n: n, int: int, whole: whole, rate: rate, secs: secs, duration: duration, suffix: suffix };
})();
