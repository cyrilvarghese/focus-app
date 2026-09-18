/* FocusPot: the shared clay pot on the studio table.
   The shape follows session progress (0 → 1 across all focus time, whatever the pomodoro length),
   while the wheel spins in real time. The wheel spins down on breaks, slows when pals doze,
   and stops for glazing. complete() finishes and glazes the pot. abandon() collapses it, so nothing is kept.

   var pot = FocusPot.create(svgGroup, { x, y, scale });
   pot.start(); pot.setProgress(p); pot.setRunning(bool); pot.setPace(0..1); pot.complete(); pot.abandon();
*/
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#3d3934';
  var N = 18;
  var SPIN = 2.5;             // seconds per turn at full pace
  var TP = 0.36, TW = 0.42;   // ellipse tilt on the pot / on the wheel (matches the room's viewing angle)

  // side profiles, (height, radius) from the foot up, in "studio pixels" (scaled per instance)
  var same = function (p) { return { L: p, R: p }; };
  var STAGES = {
    lump: {
      L: [[0, 54], [8, 62], [18, 66], [28, 60], [36, 63], [46, 52], [54, 43], [60, 31], [66, 18], [70, 6], [71, 0]],
      R: [[0, 56], [10, 64], [20, 62], [30, 66], [40, 58], [48, 48], [56, 40], [62, 26], [67, 12], [70, 3], [71, 0]]
    },
    dome: same([[0, 74], [14, 73], [30, 67], [44, 55], [55, 39], [62, 22], [66, 8], [67, 0]]),
    opened: same([[0, 64], [26, 65], [52, 61], [74, 53], [90, 43], [100, 34], [104, 29]]),
    low: same([[0, 70], [20, 72], [40, 72], [58, 71], [70, 70.5]]),
    tall: same([[0, 58], [40, 58], [80, 57], [118, 56], [140, 57.5]]),
    belly: same([[0, 58], [20, 76], [46, 86], [72, 82], [96, 68], [112, 58], [120, 56], [126, 57]]),
    rise: same([[0, 54], [30, 74], [62, 84], [96, 76], [124, 58], [146, 44], [158, 40], [166, 44]]),
    vase: same([[0, 47], [36, 74], [76, 85], [114, 70], [146, 44], [174, 28], [196, 25], [210, 30], [216, 38]]),
    final: same([[0, 42], [34, 68], [74, 80], [112, 64], [146, 40], [174, 25], [198, 23], [214, 29], [222, 38]])
  };
  // Where each shape lands, as a fraction of total focus time. Not linear: centring and opening are quick,
  // pulling the walls up takes longest, then shaping slows into refinement. The last stretch is glazing.
  var KEYS = [[0, 'lump'], [0.058, 'dome'], [0.137, 'opened'], [0.223, 'low'], [0.403, 'tall'],
    [0.576, 'belly'], [0.727, 'rise'], [0.842, 'vase'], [0.928, 'final'], [1, 'final']];
  var P_STOP = 0.93, GLAZE0 = 0.942, GLAZE1 = 0.995;

  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function pick(a, b) { return a + (b - a) * rnd(); }
  function f(n) { return Math.round(n * 100) / 100; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, v) { var k = clamp01((v - a) / (b - a)); return k * k * (3 - 2 * k); }
  function ease(k) { return k * k * (3 - 2 * k); }

  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return [0, 1].map(function (i) { return 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3); });
  }
  // resample a control profile to N points evenly spaced along its length, so every stage morphs point-to-point
  function resample(ctrl, s) {
    var pts = [ctrl[0]].concat(ctrl, [ctrl[ctrl.length - 1]]), dense = [], i, k;
    for (i = 1; i < pts.length - 2; i++) for (k = 0; k < 40; k++) dense.push(catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], k / 40));
    dense.push(ctrl[ctrl.length - 1]);
    var acc = [0];
    for (i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    var total = acc[acc.length - 1], out = [], j = 1;
    for (k = 0; k < N; k++) {
      var target = (k / (N - 1)) * total;
      while (j < acc.length - 1 && acc[j] < target) j++;
      var u = (target - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1);
      out.push([(dense[j - 1][0] + (dense[j][0] - dense[j - 1][0]) * u) * 1.06 * s, (dense[j - 1][1] + (dense[j][1] - dense[j - 1][1]) * u) * 1.1 * s]);
    }
    return out;
  }
  function curveThrough(P) {
    var d = '';
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
      d += ' C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d;
  }
  var WAVE = [pick(0, 6), pick(0, 6), pick(0, 6)];
  function wavyEllipse(cx, cy, rx, ry, amp) {
    var P = [], k, d;
    for (k = 0; k < 16; k++) {
      var a = (k / 16) * Math.PI * 2;
      var w = amp * (Math.sin(2 * a + WAVE[0]) + 0.6 * Math.sin(3 * a + WAVE[1]) + 0.35 * Math.sin(5 * a + WAVE[2]));
      P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a) - w]);
    }
    d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
    for (var i = 0; i < 16; i++) {
      var p0 = P[(i + 15) % 16], p1 = P[i], p2 = P[(i + 1) % 16], p3 = P[(i + 2) % 16];
      d += ' C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d + ' Z';
  }
  function frontRing(r, y) {
    var ry = r * TP, K = 0.5523;
    return 'M' + f(-r) + ' ' + f(y) + ' C' + f(-r) + ' ' + f(y + ry * K) + ' ' + f(-r * K) + ' ' + f(y + ry) + ' 0 ' + f(y + ry) +
      ' C' + f(r * K) + ' ' + f(y + ry) + ' ' + f(r) + ' ' + f(y + ry * K) + ' ' + f(r) + ' ' + f(y);
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var uid = 0;

  function create(parent, opts) {
    var s = opts.scale || 0.23, id = 'fp' + (uid++) + '-';
    var WRX = 165 * s, WRY = WRX * TW, BAND = opts.band || 5;
    var GEO = {};
    Object.keys(STAGES).forEach(function (k) { GEO[k] = { L: resample(STAGES[k].L, s), R: resample(STAGES[k].R, s) }; });

    var root = el('g', { transform: 'translate(' + f(opts.x) + ' ' + f(opts.y) + ')', class: 'focus-pot' }, parent);
    var defs = el('defs', {}, root);
    defs.innerHTML =
      '<linearGradient id="' + id + 'clay" x1="0" x2="1"><stop offset="0" stop-color="#a48c71"/><stop offset=".18" stop-color="#c3aa8e"/><stop offset=".38" stop-color="#d6c1a6"/><stop offset=".64" stop-color="#c7af93"/><stop offset=".88" stop-color="#ad9377"/><stop offset="1" stop-color="#977f66"/></linearGradient>' +
      '<linearGradient id="' + id + 'foot" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff6e8" stop-opacity=".14"/><stop offset=".55" stop-color="#fff6e8" stop-opacity="0"/><stop offset=".85" stop-color="#5b4632" stop-opacity="0"/><stop offset="1" stop-color="#5b4632" stop-opacity=".24"/></linearGradient>' +
      '<linearGradient id="' + id + 'glaze" x1="0" x2="1"><stop offset="0" stop-color="#d8d0c3"/><stop offset=".22" stop-color="#eee8dd"/><stop offset=".4" stop-color="#f8f4ed"/><stop offset=".72" stop-color="#e9e2d6"/><stop offset="1" stop-color="#cfc6b7"/></linearGradient>' +
      '<linearGradient id="' + id + 'rim" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#dfccb2"/><stop offset=".5" stop-color="#d3bda1"/><stop offset="1" stop-color="#b99f82"/></linearGradient>' +
      '<linearGradient id="' + id + 'hole" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#5e4b39"/><stop offset=".45" stop-color="#7d6751"/><stop offset=".8" stop-color="#a38a6f"/><stop offset="1" stop-color="#b89f83"/></linearGradient>' +
      '<radialGradient id="' + id + 'bump" fx=".32" fy=".3" r=".5"><stop offset="0" stop-color="#ecdcc5" stop-opacity=".9"/><stop offset=".7" stop-color="#d2bb9f" stop-opacity=".25"/><stop offset="1" stop-color="#d2bb9f" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'dent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5e4b39" stop-opacity=".6"/><stop offset=".5" stop-color="#8c7660" stop-opacity=".2"/><stop offset=".8" stop-color="#f1e5d2" stop-opacity=".55"/><stop offset="1" stop-color="#f1e5d2" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + id + 'wtop" cx=".42" cy=".4" r=".62"><stop offset="0" stop-color="#e2d9cc"/><stop offset=".7" stop-color="#d6cbbb"/><stop offset="1" stop-color="#c8bba9"/></radialGradient>' +
      '<linearGradient id="' + id + 'wside" x1="0" x2="1"><stop offset="0" stop-color="#b3a490"/><stop offset=".3" stop-color="#cdc1af"/><stop offset="1" stop-color="#a69784"/></linearGradient>' +
      '<filter id="' + id + 'blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>' +
      '<filter id="' + id + 'lit" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="' + f(8 * s) + '" result="h"/>' +
      '<feDiffuseLighting in="h" surfaceScale="' + f(7 * s) + '" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="218" elevation="48"/></feDiffuseLighting>' +
      '<feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1=".47" k2=".65" k3="0" k4="0" result="o"/><feComposite in="o" in2="SourceAlpha" operator="in"/></filter>';
    var body = el('path', { id: id + 'body' }, defs);
    el('use', { href: '#' + id + 'body' }, el('clipPath', { id: id + 'clip' }, defs));

    // ---- wheel head
    var side = 'M' + f(-WRX) + ' 0 L' + f(-WRX) + ' ' + BAND + ' A' + f(WRX) + ' ' + f(WRY) + ' 0 0 0 ' + f(WRX) + ' ' + BAND + ' L' + f(WRX) + ' 0 Z';
    el('path', { d: side, fill: 'url(#' + id + 'wside)', stroke: INK, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, root);
    el('ellipse', { cx: 0, cy: 0, rx: f(WRX), ry: f(WRY), fill: 'url(#' + id + 'wtop)', stroke: INK, 'stroke-width': 1.2 }, root);
    for (var gi = 0; gi < 6; gi++) {
      var gr = WRX - 3 - gi * (WRX / 6.5);
      el('ellipse', { cx: 0, cy: 0, rx: f(gr), ry: f(gr * TW), fill: 'none', stroke: '#8f7f6b', 'stroke-opacity': f(pick(0.14, 0.26)), 'stroke-width': 0.5 }, root);
    }
    var wheelSpecks = [];
    for (var wi = 0; wi < 12; wi++) {
      wheelSpecks.push({ R: pick(WRX * 0.35, WRX * 0.92), a0: pick(0, 6.283), e: el('circle', { r: f(pick(0.35, 0.8)), fill: rnd() < 0.6 ? '#8d7c68' : '#b3a28b', opacity: f(pick(0.5, 0.85)) }, root) });
    }

    // ---- the clay (everything below moves with the entrance, wobble and collapse)
    var clayG = el('g', {}, root);
    var shadowG = el('g', {}, clayG);
    var cast = el('ellipse', { fill: '#5f4e3c', opacity: 0.22, filter: 'url(#' + id + 'blur)' }, shadowG);
    var contact = el('ellipse', { fill: '#4d3e2f', opacity: 0.3 }, shadowG);
    var potG = el('g', {}, clayG);
    var litG = el('g', { filter: 'url(#' + id + 'lit)' }, potG);
    el('use', { href: '#' + id + 'body', fill: 'url(#' + id + 'clay)' }, litG);
    var inner = el('g', { 'clip-path': 'url(#' + id + 'clip)' }, litG);
    el('use', { href: '#' + id + 'body', fill: 'url(#' + id + 'foot)' }, inner);

    var linesG = el('g', { fill: 'none' }, inner), lines = [];
    for (var u = 0.06; u < 0.96; u += pick(0.045, 0.09)) {
      var dark = rnd() < 0.6;
      lines.push({ u: u, e: el('path', { stroke: dark ? '#6f5a45' : '#f4e9d8', 'stroke-opacity': f(dark ? pick(0.1, 0.2) : pick(0.2, 0.4)), 'stroke-width': f(pick(0.3, 0.5)) }, linesG) });
    }
    var groups = {};
    ['bump', 'speck', 'dent', 'glint'].forEach(function (k) { groups[k] = el('g', {}, inner); });
    var marks = [];
    function mark(kind, html) {
      var g = el('g', {}, groups[kind]); g.innerHTML = html;
      marks.push({ kind: kind, u: pick(0.05, 0.95), a0: pick(0, 6.283), e: g });
    }
    var i2;
    for (i2 = 0; i2 < 14; i2++) { var br = pick(1.5, 3); mark('bump', '<circle r="' + f(br) + '" fill="url(#' + id + 'bump)"/>'); }
    for (i2 = 0; i2 < 30; i2++) mark('speck', '<circle r="' + f(pick(0.3, 0.55)) + '" fill="#6a5643" opacity="' + f(pick(0.5, 0.9)) + '"/>');
    for (i2 = 0; i2 < 10; i2++) mark('speck', '<circle r="' + f(pick(0.35, 0.6)) + '" fill="#f3e8d6" opacity="' + f(pick(0.6, 0.9)) + '"/>');
    for (i2 = 0; i2 < 5; i2++) mark('speck', '<rect x="-1.6" y="-.22" width="' + f(pick(2.4, 4)) + '" height=".44" rx=".22" fill="#7d6851" opacity=".35"/>');
    for (i2 = 0; i2 < 6; i2++) mark('glint', '<ellipse rx="' + f(pick(1.4, 2.6)) + '" ry=".45" fill="#fbf4e8" opacity=".7"/>');
    [[0.34, 0.35], [0.56, 2.6], [0.22, 4.4]].forEach(function (d) {
      var g = el('g', {}, groups.dent); g.innerHTML = '<ellipse rx="2.1" ry="2.6" fill="url(#' + id + 'dent)"/>';
      marks.push({ kind: 'dent', u: d[0], a0: d[1], e: g });
    });

    var glazeG = el('g', {}, inner);
    var gy = -104 * s, gw = 130 * s, gs = s;
    var glazeEdge = 'M' + f(-gw) + ' ' + f(gy + 10 * gs) + ' C' + f(-95 * gs) + ' ' + f(gy + 4 * gs) + ' ' + f(-60 * gs) + ' ' + f(gy - 2 * gs) + ' ' + f(-25 * gs) + ' ' + f(gy + 4 * gs) +
      ' S' + f(40 * gs) + ' ' + f(gy + 20 * gs) + ' ' + f(70 * gs) + ' ' + f(gy + 10 * gs) + ' S' + f(110 * gs) + ' ' + f(gy - 12 * gs) + ' ' + f(gw) + ' ' + f(gy - 14 * gs);
    el('path', { d: glazeEdge + ' L' + f(gw) + ' 12 L' + f(-gw) + ' 12 Z', fill: 'url(#' + id + 'glaze)' }, glazeG);
    el('path', { d: glazeEdge, fill: 'none', stroke: '#b9a791', 'stroke-opacity': 0.6, 'stroke-width': 0.5 }, glazeG);

    var outline = el('use', { href: '#' + id + 'body', fill: 'none', stroke: INK, 'stroke-width': 1.25, 'stroke-linejoin': 'round' }, potG);
    var rim = el('path', { fill: 'url(#' + id + 'rim)', stroke: INK, 'stroke-width': 1.1, 'stroke-linejoin': 'round' }, potG);
    var hole = el('path', { fill: 'url(#' + id + 'hole)' }, potG);

    // ---- state
    var st = {
      target: 0, p: 0, running: false, pace: 1, speed: 0, theta: 0,
      entry: -1,              // seconds since the lump was dropped (-1 = no clay yet)
      collapse: -1,           // seconds since abandon (-1 = not collapsing)
      completing: null,       // { from, t } while finishing the pot
      empty: true, last: 0, dirty: true
    };

    function reduced() {
      return document.body.classList.contains('rm') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    function shapeAt(p) {
      for (var i = 1; i < KEYS.length; i++) if (p <= KEYS[i][0] || i === KEYS.length - 1) {
        var a = GEO[KEYS[i - 1][1]], b = GEO[KEYS[i][1]], k = ease(clamp01((p - KEYS[i - 1][0]) / (KEYS[i][0] - KEYS[i - 1][0])));
        var mix = function (A, B) { return A.map(function (q, j) { return [q[0] + (B[j][0] - q[0]) * k, q[1] + (B[j][1] - q[1]) * k]; }); };
        return { L: mix(a.L, b.L), R: mix(a.R, b.R) };
      }
    }

    function draw() {
      var p = st.p, sh = shapeAt(p), L = sh.L, R = sh.R;
      var left = L.map(function (q) { return [-q[1], -q[0]]; });
      var right = R.map(function (q) { return [q[1], -q[0]]; }).reverse();
      var topL = left[N - 1], topR = right[0];
      var rimR = (topR[0] - topL[0]) / 2, rimY = (topL[1] + topR[1]) / 2, rimCx = (topL[0] + topR[0]) / 2, ry = rimR * TP;
      var r0 = (L[0][1] + R[0][1]) / 2, sag = r0 * TW * 1.333;
      body.setAttribute('d', 'M' + f(left[0][0]) + ' ' + f(left[0][1]) + curveThrough(left) +
        ' C' + f(topL[0]) + ' ' + f(topL[1] - ry * 1.333) + ' ' + f(topR[0]) + ' ' + f(topR[1] - ry * 1.333) + ' ' + f(topR[0]) + ' ' + f(topR[1]) +
        curveThrough(right) + ' C' + f(R[0][1]) + ' ' + f(sag) + ' ' + f(-L[0][1]) + ' ' + f(sag) + ' ' + f(-L[0][1]) + ' 0 Z');
      var open = rimR > 0.6, wall = Math.min(1.6, rimR * 0.3), amp = Math.min(0.35, rimR * 0.035);
      rim.setAttribute('d', open ? wavyEllipse(rimCx, rimY, rimR, ry, amp) : 'M0 0');
      hole.setAttribute('d', open ? wavyEllipse(rimCx, rimY + wall * 0.12, rimR - wall, Math.max(ry - wall * TP, 0.1), amp * 0.8) : 'M0 0');

      var prof = L.map(function (q, j) { return [(q[0] + R[j][0]) / 2, (q[1] + R[j][1]) / 2]; }), H = prof[N - 1][0];
      function rAt(uu) {
        var h = uu * H;
        for (var j = 1; j < N; j++) if (prof[j][0] >= h) { var a = prof[j - 1], b = prof[j]; return a[1] + (b[1] - a[1]) * ((h - a[0]) / ((b[0] - a[0]) || 1)); }
        return prof[N - 1][1];
      }
      lines.forEach(function (l) { l.e.setAttribute('d', frontRing(Math.max(rAt(l.u), 0.01), -l.u * H)); });
      linesG.setAttribute('opacity', f(smooth(0.03, 0.137, p)));

      var spinAmt = Math.min(1, st.speed);
      groups.bump.setAttribute('opacity', f(1 - smooth(0.008, 0.05, p)));
      groups.dent.setAttribute('opacity', f(smooth(0.1, 0.165, p)));
      groups.glint.setAttribute('opacity', f(spinAmt * (1 - smooth(0.9, P_STOP, p))));
      marks.forEach(function (m) {
        var r = rAt(m.u), a = m.a0 + st.theta, c = Math.cos(a);
        m.e.setAttribute('transform', 'translate(' + f(r * Math.sin(a)) + ' ' + f(-m.u * H + r * TP * c) + ') scale(' + f(Math.max(0.03, c)) + ' 1)');
        m.e.setAttribute('opacity', f(clamp01((c - 0.04) * 3)));
      });
      wheelSpecks.forEach(function (w) {
        var a = w.a0 + st.theta;
        w.e.setAttribute('cx', f(w.R * Math.sin(a))); w.e.setAttribute('cy', f(w.R * TW * Math.cos(a)));
      });
      glazeG.setAttribute('transform', 'translate(0 ' + f((1 - ease(clamp01((p - GLAZE0) / (GLAZE1 - GLAZE0)))) * 150 * s) + ')');

      cast.setAttribute('cx', f(r0 * 0.3)); cast.setAttribute('cy', f(2)); cast.setAttribute('rx', f(r0 * 1.4)); cast.setAttribute('ry', f(r0 * 1.4 * TW));
      contact.setAttribute('cx', f(0.4)); contact.setAttribute('cy', f(0.5)); contact.setAttribute('rx', f(r0 * 1.08)); contact.setAttribute('ry', f(r0 * 1.08 * TW));

      // entrance: drop, squash, settle. Then centring wobble tied to the spin. Collapse on abandon.
      var tf = '', op = 1, shOp = 1;
      if (st.empty) op = 0;
      else if (st.collapse >= 0) {
        var k = ease(clamp01(st.collapse / 1.6));
        tf = 'translate(' + f(2.5 * k) + ' 0) scale(' + f(1 + 0.5 * k) + ' ' + f(1 - 0.78 * k) + ')';
        op = 1 - smooth(0.45, 1, k); shOp = op;
      } else if (st.entry >= 0 && st.entry < 1.4) {
        var e = st.entry;
        if (e < 0.45) { var fall = e / 0.45; tf = 'translate(0 ' + f(-60 * (1 - fall * fall)) + ')'; op = clamp01(e / 0.12); shOp = smooth(0.25, 0.45, e); }
        else {
          var q = (e - 0.45) / 0.95, sq = Math.exp(-q * 4) * Math.cos(q * 11);
          tf = 'scale(' + f(1 + 0.12 * sq) + ' ' + f(1 - 0.18 * sq) + ')';
        }
      }
      var wob = st.empty || st.collapse >= 0 ? 0 : 1.1 * Math.exp(-p / 0.02) * spinAmt;
      if (wob > 0.01) tf = 'translate(' + f(wob * Math.sin(st.theta)) + ' 0) ' + tf;
      clayG.setAttribute('transform', tf);
      potG.setAttribute('opacity', f(op));
      shadowG.setAttribute('opacity', f(shOp * (st.empty ? 0 : 1)));
    }

    function step(dt) {
      var active = false;
      if (st.entry >= 0 && st.entry < 1.6) { st.entry += dt; active = true; }
      if (st.collapse >= 0 && st.collapse < 1.7) { st.collapse += dt; active = true; if (st.collapse >= 1.7) { st.empty = true; st.dirty = true; } }
      if (st.completing) {
        st.completing.t += dt; var k = ease(clamp01(st.completing.t / 4));
        st.target = st.completing.from + (1 - st.completing.from) * k;
        if (k >= 1) st.completing = null;
        active = true;
      }
      // progress eases toward its target so 1-second ticks (or fast-forward) still look smooth
      var dp = st.target - st.p;
      if (Math.abs(dp) > 1e-5) { st.p += dp * Math.min(1, dt * 4); active = true; } else st.p = st.target;
      var spinning = st.running && !st.empty && st.collapse < 0 && st.entry >= 1.2 && st.p < P_STOP && !reduced();
      var want = spinning ? 0.35 + 0.65 * st.pace : 0;
      if (st.completing && st.p < P_STOP && !reduced() && st.collapse < 0) want = 1.4;   // finishing touches: a brisk last few turns
      st.speed += (want - st.speed) * Math.min(1, dt * 1.8);
      if (Math.abs(st.speed) < 0.002 && want === 0) st.speed = 0;
      if (st.speed > 0) { st.theta += dt * (Math.PI * 2 / SPIN) * st.speed; active = true; }
      return active;
    }
    // rAF while visible; a slow timer while the tab is hidden so a collapse or finish still completes
    function frame() {
      var now = performance.now(), dt = Math.min(document.hidden ? 1 : 0.1, st.last ? (now - st.last) / 1000 : 0); st.last = now;
      if (step(dt) || st.dirty) { draw(); st.dirty = false; }
      if (document.hidden) setTimeout(frame, 250); else requestAnimationFrame(frame);
    }
    frame();

    return {
      start: function () { st.empty = false; st.collapse = -1; st.completing = null; st.p = st.target = 0; st.entry = 0; st.dirty = true; },
      setProgress: function (p) { if (!st.completing && st.collapse < 0) st.target = clamp01(p); },
      setRunning: function (v) { st.running = !!v; st.dirty = true; },
      setPace: function (k) { st.pace = clamp01(k); },
      complete: function () { if (st.empty || st.collapse >= 0) return; st.completing = { from: st.p, t: 0 }; },
      abandon: function () { if (st.empty || st.collapse >= 0) return; st.completing = null; st.collapse = 0; },
      get progress() { return st.p; },
      _advance: function (sec) { for (var t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }   // for tests and screenshots
    };
  }

  window.FocusPot = { create: create };
})();
