/* StudioPot: a terracotta pot thrown on a wheel, drawn front-on in flat illustration style.
   Session progress 0 → 1 walks it through 8 stages: short cylinder → tall cylinder → belly → neck → rolled lip.
   Same API as FocusPot, plus pull() and drip() and an onStage(i) callback for the small beats between stages:
     var pot = StudioPot.create(svgGroup, { x, y, scale });
     pot.start(); pot.setProgress(p); pot.setRunning(bool); pot.setPace(0..1); pot.complete(); pot.abandon(); pot.destroy();
*/
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var SPIN = 2.2;            // seconds per turn at full pace
  var TILT = 0.27;           // ellipse squash for rims and the wheel (viewing angle)
  var U = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];

  // 8 stages: height H and radius at each U, as a fraction of the max radius (from the reference sheet)
  var STAGES = [
    { H: 62,  r: [.80, .81, .81, .81, .81, .81, .81, .81, .83] },  // 1 short cylinder
    { H: 94,  r: [.73, .74, .74, .74, .74, .73, .73, .73, .76] },  // 2 tall cylinder
    { H: 98,  r: [.66, .80, .88, .91, .90, .85, .78, .73, .74] },  // 3 belly starts
    { H: 112, r: [.62, .82, .92, .94, .91, .82, .70, .63, .67] },  // 4 shoulder
    { H: 118, r: [.60, .85, .97, 1.0, .95, .82, .64, .55, .61] },  // 5 round belly, neck
    { H: 121, r: [.60, .86, .98, 1.0, .95, .80, .60, .51, .60] },  // 6 narrower neck
    { H: 124, r: [.61, .87, .99, 1.0, .95, .80, .60, .53, .68] },  // 7 lip flares
    { H: 126, r: [.62, .88, 1.0, 1.0, .96, .81, .61, .55, .73] }   // 8 rolled lip
  ];

  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function f(n) { return Math.round(n * 100) / 100; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(k) { return k * k * (3 - 2 * k); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function curveThrough(P) {
    var d = '';
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
      d += ' C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d;
  }
  var uid = 0;

  function create(parent, opts) {
    var s = opts.scale || 1, R = 70 * s, RW = 104 * s, WT = 15 * s, id = 'sp' + (uid++) + '-';
    var root = el('g', { transform: 'translate(' + f(opts.x) + ' ' + f(opts.y) + ')', class: 'studio-pot' }, parent);
    var defs = el('defs', {}, root);
    defs.innerHTML =
      '<linearGradient id="' + id + 'clay" x1="0" x2="1"><stop offset="0" stop-color="#a8664b"/><stop offset=".22" stop-color="#c47f60"/><stop offset=".42" stop-color="#d69474"/><stop offset=".7" stop-color="#c27c5d"/><stop offset="1" stop-color="#a3624a"/></linearGradient>' +
      '<linearGradient id="' + id + 'hole" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6d3b28"/><stop offset="1" stop-color="#9c5c42"/></linearGradient>' +
      '<linearGradient id="' + id + 'lip" x1="0" x2="1"><stop offset="0" stop-color="#c8876a"/><stop offset=".45" stop-color="#e0a585"/><stop offset="1" stop-color="#bd7a5d"/></linearGradient>' +
      '<linearGradient id="' + id + 'wheel" x1="0" x2="1"><stop offset="0" stop-color="#4a403a"/><stop offset=".4" stop-color="#62564d"/><stop offset="1" stop-color="#453c36"/></linearGradient>' +
      '<radialGradient id="' + id + 'wtop" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#6e6158"/><stop offset="1" stop-color="#554a43"/></radialGradient>' +
      '<linearGradient id="' + id + 'sheen" x1="0" x2="1"><stop offset=".22" stop-color="#fff" stop-opacity="0"/><stop offset=".36" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>';
    var clip = el('clipPath', { id: id + 'clip' }, defs), clipPath = el('path', {}, clip);

    // ---- wheel head: a dark disc with thrown rings and clay smears
    el('path', { d: 'M' + f(-RW) + ' 0 L' + f(-RW) + ' ' + f(WT) + ' A' + f(RW) + ' ' + f(RW * TILT) + ' 0 0 0 ' + f(RW) + ' ' + f(WT) + ' L' + f(RW) + ' 0 Z', fill: 'url(#' + id + 'wheel)' }, root);
    el('ellipse', { cx: 0, cy: 0, rx: f(RW), ry: f(RW * TILT), fill: 'url(#' + id + 'wtop)' }, root);
    for (var gi = 1; gi <= 5; gi++) {
      var gr = RW * (1 - gi * 0.15);
      el('ellipse', { cx: 0, cy: 0, rx: f(gr), ry: f(gr * TILT), fill: 'none', stroke: '#8a7668', 'stroke-opacity': f(0.25 + 0.08 * (gi % 2)), 'stroke-width': f(1.1 * s) }, root);
    }
    var smears = [];
    for (var wi = 0; wi < 34; wi++) {
      smears.push({ r: RW * (0.35 + rnd() * 0.58), a: rnd() * 6.283, e: el('ellipse', { rx: f((1.4 + rnd() * 2.6) * s), ry: f((0.8 + rnd()) * s), fill: rnd() < 0.7 ? '#b67a5d' : '#8e6a55', opacity: f(0.45 + rnd() * 0.4) }, root) });
    }
    var SPLAT0 = 6, splats = SPLAT0;
    function showSplats() { smears.forEach(function (w, i) { w.e.setAttribute('display', i < splats ? 'inline' : 'none'); }); }
    showSplats();
    var shadow = el('ellipse', { cx: 0, cy: f(1 * s), fill: '#2e2622', opacity: 0.28 }, root);

    // ---- the pot
    var potG = el('g', {}, root), shapeG = el('g', {}, potG);
    var body = el('path', { fill: 'url(#' + id + 'clay)' }, shapeG);
    var inner = el('g', { 'clip-path': 'url(#' + id + 'clip)' }, shapeG);
    var lines = [];
    for (var li = 0; li < 16; li++) lines.push({ u: 0.04 + li * 0.058 + rnd() * 0.02, e: el('path', { fill: 'none', stroke: rnd() < 0.5 ? '#9b5a41' : '#e3a888', 'stroke-width': f((0.7 + rnd() * 0.9) * s), opacity: f(0.18 + rnd() * 0.22) }, inner) });
    var flecks = [];
    for (var fi = 0; fi < 12; fi++) flecks.push({ u: 0.08 + rnd() * 0.84, a: rnd() * 6.283, w: (2 + rnd() * 5) * s, e: el('rect', { height: f((0.8 + rnd() * 0.8) * s), rx: f(0.5 * s), fill: rnd() < 0.5 ? '#9b5a41' : '#e8b394' }, inner) });
    var sheen = el('rect', { fill: 'url(#' + id + 'sheen)', opacity: 0.35 }, inner);
    var wetStreak = el('path', { fill: 'none', stroke: '#8a4a33', 'stroke-width': f(2.4 * s), 'stroke-linecap': 'round', opacity: 0 }, inner);
    var lip = el('path', { fill: 'url(#' + id + 'lip)' }, shapeG);
    var hole = el('path', { fill: 'url(#' + id + 'hole)' }, shapeG);
    var drop = el('ellipse', { rx: f(2.2 * s), ry: f(3.4 * s), fill: '#e4eef0', opacity: 0 }, root);
    var ring = el('ellipse', { fill: 'none', stroke: '#e4eef0', 'stroke-width': f(1 * s), opacity: 0 }, root);

    var st = { p: 0, target: 0, angle: 0, speed: 0, running: false, pace: 1, done: 0, collapse: -1, empty: true, last: 0, dirty: true,
      pull: -1, drip: -1, wet: 0, flash: 0, stage: 0, workT: 0, nextPull: 40, nextDrip: 70, nextSplat: 45, dripX: 0 };
    var PULL = 2.4, FALL = 0.75;   // seconds for a pull to travel up the wall / a drop to fall

    function reduced() {
      return document.body.classList.contains('rm') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    function shapeAt(p) {
      var x = clamp01(p) * (STAGES.length - 1), i = Math.min(Math.floor(x), STAGES.length - 2), k = ease(x - i), A = STAGES[i], B = STAGES[i + 1];
      return { H: A.H + (B.H - A.H) * k, r: A.r.map(function (v, j) { return v + (B.r[j] - v) * k; }) };
    }
    function wavy(cx, cy, rx, ry, amp) {
      var P = [], k;
      for (k = 0; k < 18; k++) { var a = k / 18 * 6.283; P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a) + amp * Math.sin(3 * a + 1.3) * Math.sin(5 * a)]); }
      var d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
      for (k = 0; k < 18; k++) { var a0 = P[k], a1 = P[(k + 1) % 18], am = P[(k + 17) % 18], a2 = P[(k + 2) % 18];
        d += ' C' + f(a0[0] + (a1[0] - am[0]) / 6) + ' ' + f(a0[1] + (a1[1] - am[1]) / 6) + ' ' + f(a1[0] - (a2[0] - a0[0]) / 6) + ' ' + f(a1[1] - (a2[1] - a0[1]) / 6) + ' ' + f(a1[0]) + ' ' + f(a1[1]); }
      return d + 'Z';
    }

    var cur = null;
    function draw() {
      var sh = shapeAt(st.p), H = sh.H * s, r = sh.r.map(function (v) { return v * R; });
      if (st.collapse >= 0) { var c = ease(clamp01(st.collapse / 1.4)); H *= 1 - 0.62 * c; r = r.map(function (v, j) { return v * (1 + 0.3 * c * (1 - U[j])); }); potG.setAttribute('opacity', f(1 - clamp01((st.collapse - 0.7) / 0.7))); }
      else potG.setAttribute('opacity', 1);
      if (st.pull >= 0) {
        var k = clamp01(st.pull / PULL), up = ease(k) * 1.1 - 0.05, amp = Math.sin(Math.PI * k) * 0.075;
        r = r.map(function (v, j) { var dz = (U[j] - up) / 0.16; return v + R * amp * Math.exp(-dz * dz); });
      }
      var left = U.map(function (u, j) { return [-r[j], -u * H]; }), right = U.map(function (u, j) { return [r[j], -u * H]; }).reverse();
      var rb = r[0], rt = r[8], ty = -H, lipW = Math.max(3 * s, rt * 0.1);
      var d = 'M' + f(left[0][0]) + ' ' + f(left[0][1]) + curveThrough(left) + ' L' + f(right[0][0]) + ' ' + f(right[0][1]) + curveThrough(right) +
        ' A' + f(rb) + ' ' + f(rb * TILT) + ' 0 0 1 ' + f(-rb) + ' 0 Z';
      body.setAttribute('d', d); clipPath.setAttribute('d', d);
      lip.setAttribute('d', wavy(0, ty, rt + lipW * 0.25, rt * TILT + lipW * 0.2, 0.9 * s));
      hole.setAttribute('d', wavy(0, ty + lipW * 0.1, rt - lipW, (rt - lipW) * TILT, 0.6 * s));
      shadow.setAttribute('rx', f(rb * 1.12)); shadow.setAttribute('ry', f(rb * 1.12 * TILT));
      sheen.setAttribute('x', f(-R * 1.1)); sheen.setAttribute('y', f(ty - 10)); sheen.setAttribute('width', f(R * 2.2)); sheen.setAttribute('height', f(H + 20));
      sheen.setAttribute('opacity', f(Math.min(0.95, 0.3 + 0.35 * st.done + 0.4 * st.wet + 0.3 * st.flash)));
      function rAt(u) { var x = u * 8, i = Math.min(Math.floor(x), 7), k = x - i; return r[i] + (r[i + 1] - r[i]) * k; }
      lines.forEach(function (l) { var y = -l.u * H, rr = rAt(l.u); l.e.setAttribute('d', 'M' + f(-rr) + ' ' + f(y) + ' A' + f(rr) + ' ' + f(rr * TILT) + ' 0 0 0 ' + f(rr) + ' ' + f(y)); });
      cur = { H: H, rAt: rAt };
      // water: the falling drop, its splash ring, and a wet streak running down the front
      if (st.drip >= 0 && st.drip < FALL) {
        var kf = st.drip / FALL, y0 = -H - 150 * s, y1 = -H + rt * TILT * 0.4;
        drop.setAttribute('cx', f(st.dripX)); drop.setAttribute('cy', f(y0 + (y1 - y0) * kf * kf)); drop.setAttribute('opacity', 0.9);
      } else drop.setAttribute('opacity', 0);
      var kr = st.drip >= FALL ? clamp01((st.drip - FALL) / 0.5) : -1;
      if (kr >= 0 && kr < 1) { ring.setAttribute('cx', f(st.dripX)); ring.setAttribute('cy', f(-H + rt * TILT * 0.4)); ring.setAttribute('rx', f((3 + 14 * kr) * s)); ring.setAttribute('ry', f((3 + 14 * kr) * s * TILT)); ring.setAttribute('opacity', f(0.8 * (1 - kr))); }
      else ring.setAttribute('opacity', 0);
      if (st.wet > 0.01) {
        var len = Math.min(1, (st.drip - FALL) / 2.5) * H * 0.7, sx = st.dripX * 0.6, sy = -H + rt * TILT;
        wetStreak.setAttribute('d', 'M' + f(sx) + ' ' + f(sy) + ' q' + f(1.5 * s) + ' ' + f(len * 0.5) + ' ' + f(-0.5 * s) + ' ' + f(Math.max(len, 0.1)));
        wetStreak.setAttribute('opacity', f(0.22 * st.wet));
      } else wetStreak.setAttribute('opacity', 0);
      placeMoving();
    }
    function placeMoving() {
      if (!cur) return;
      shapeG.setAttribute('transform', 'translate(' + f(0.5 * s * st.speed * Math.sin(st.angle)) + ' 0)');
      flecks.forEach(function (m) {
        var a = m.a + st.angle, c = Math.cos(a), rr = cur.rAt(m.u), x = rr * Math.sin(a), y = -m.u * cur.H + rr * TILT * c;
        m.e.setAttribute('x', f(x - m.w * Math.max(c, 0.1) / 2)); m.e.setAttribute('y', f(y)); m.e.setAttribute('width', f(m.w * Math.max(c, 0.05)));
        m.e.setAttribute('opacity', f(Math.max(0, c) * 0.55));
      });
      smears.forEach(function (w) { var a = w.a + st.angle; w.e.setAttribute('cx', f(w.r * Math.cos(a))); w.e.setAttribute('cy', f(w.r * TILT * Math.sin(a))); });
    }

    function step(dt) {
      var want = (st.running && !st.empty && st.collapse < 0 && st.done < 1) ? 0.35 + 0.65 * st.pace : 0;
      st.speed += (want - st.speed) * Math.min(1, dt * 1.6);
      if (!reduced()) st.angle += dt * st.speed * 6.283 / SPIN;
      var gap = st.target - st.p;
      if (Math.abs(gap) > 1e-4) { st.p += reduced() ? gap : gap * Math.min(1, dt * 1.5); st.dirty = true; }
      if (st.completing) { st.done = Math.min(1, st.done + dt / 1.6); st.dirty = true; }
      if (st.collapse >= 0) { st.collapse += dt; st.dirty = true; if (st.collapse > 1.4) { st.empty = true; potG.setAttribute('display', 'none'); } }

      var working = st.running && !st.empty && st.collapse < 0 && !st.completing && !reduced();
      if (working) {
        var w = dt * (0.4 + 0.6 * st.pace);   // fewer hands, slower work
        st.nextPull -= w; st.nextDrip -= w; st.nextSplat -= w;
        if (st.nextPull <= 0 && st.pull < 0) { st.pull = 0; st.nextPull = 45 + rnd() * 30; }
        if (st.nextDrip <= 0 && st.drip < 0) { startDrip(); st.nextDrip = 75 + rnd() * 40; }
        if (st.nextSplat <= 0) { splats = Math.min(smears.length, splats + 1); showSplats(); st.nextSplat = 40 + rnd() * 25; }
      }
      if (st.pull >= 0) { st.pull += dt; st.dirty = true; if (st.pull > PULL) st.pull = -1; }
      if (st.drip >= 0) { st.drip += dt; st.dirty = true; if (st.drip >= FALL && st.wet === 0) st.wet = 1; if (st.drip > FALL + 3) st.drip = -1; }
      if (st.wet > 0 && st.drip < 0) { st.wet = Math.max(0, st.wet - dt / 7); st.dirty = true; }
      if (st.flash > 0) { st.flash = Math.max(0, st.flash - dt / 1.4); st.dirty = true; }
      // a small beat each time the pot reaches its next stage
      var stageNow = Math.min(STAGES.length - 1, Math.floor(st.p * (STAGES.length - 1) + 0.02));
      if (stageNow > st.stage) { st.stage = stageNow; st.flash = 1; if (opts.onStage) opts.onStage(stageNow); }
    }
    function startDrip() { if (!cur) return; st.drip = 0; st.wet = 0; st.dripX = (rnd() - 0.5) * cur.rAt(1) * 1.1; }
    function frame(t) {
      var dt = st.last ? Math.min(0.1, (t - st.last) / 1000) : 0; st.last = t;
      step(dt);
      if (st.dirty) { draw(); st.dirty = false; } else if (st.speed > 0.002) placeMoving();
      raf = requestAnimationFrame(frame);
    }
    var raf;
    draw(); raf = requestAnimationFrame(frame);

    return {
      start: function () { st.empty = false; st.collapse = -1; st.completing = false; st.done = 0; st.p = st.target = 0; st.stage = 0; st.pull = st.drip = -1; st.wet = st.flash = 0; splats = SPLAT0; showSplats(); potG.removeAttribute('display'); st.dirty = true; if (opts.onStage) opts.onStage(0); },
      pull: function () { if (!st.empty && st.collapse < 0 && st.pull < 0) st.pull = 0; },
      drip: function () { if (!st.empty && st.collapse < 0 && st.drip < 0) startDrip(); },
      setProgress: function (p) { if (!st.completing && st.collapse < 0) st.target = clamp01(p); },
      setRunning: function (v) { st.running = !!v; },
      setPace: function (k) { st.pace = clamp01(k); },
      complete: function () { if (st.empty || st.collapse >= 0) return; st.target = 1; st.completing = true; },
      abandon: function () { if (st.empty || st.collapse >= 0) return; st.completing = false; st.collapse = 0; },
      // stops the animation loop and removes the pot, for pages that unmount the scene
      destroy: function () { cancelAnimationFrame(raf); if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }
  // ---------- the studio behind the wheel: flat illustration, no outlines, calm palette ----------
  function drawStudio(svg) {
    var g = el('g', { class: 'studio-bg' }, svg);
    function add(tag, a) { return el(tag, a, g); }
    // wall, lower wall, tiled floor
    add('rect', { width: 342, height: 400, fill: '#f1e9dd' });
    add('rect', { y: 228, width: 342, height: 80, fill: '#e7d9c5' });
    add('rect', { y: 226, width: 342, height: 4, fill: '#dcc9b0' });
    add('rect', { y: 300, width: 342, height: 100, fill: '#e3cdb2' });
    [318, 342, 372].forEach(function (y) { add('rect', { y: y, width: 342, height: 1.2, fill: '#d3b999' }); });
    [-160, -70, 20, 110, 200, 290, 380, 470].forEach(function (x) { add('path', { d: 'M' + (171 + (x - 171) * 0.55) + ' 300 L' + x + ' 400', stroke: '#d3b999', 'stroke-width': 1.2 }); });
    // a few soft bricks showing through the plaster
    [[22, 250, 34], [292, 262, 30], [244, 20, 28], [36, 190, 26], [300, 196, 24]].forEach(function (b) { add('rect', { x: b[0], y: b[1], width: b[2], height: 9, rx: 4, fill: '#e8dccb' }); });

    // window with the garden outside
    add('rect', { x: 118, y: 24, width: 106, height: 110, rx: 3, fill: '#c7a888' });
    add('rect', { x: 124, y: 30, width: 94, height: 98, fill: '#e6eee2' });
    var gw = el('g', { 'clip-path': 'url(#winclip)' }, g);
    var cp = el('clipPath', { id: 'winclip' }, el('defs', {}, g)); el('rect', { x: 124, y: 30, width: 94, height: 98 }, cp);
    [[140, 118, 14, 40, -18, '#a9c4ae'], [162, 112, 12, 44, 8, '#8fae98'], [196, 116, 16, 42, 22, '#a9c4ae'], [212, 96, 12, 30, -30, '#bcd2c0'], [132, 90, 10, 26, 30, '#bcd2c0']].forEach(function (l, i) {
      el('ellipse', { cx: l[0], cy: l[1], rx: l[2], ry: l[3], fill: l[5], transform: 'rotate(' + l[4] + ' ' + l[0] + ' ' + l[1] + ')' }, el('g', { class: 'leaf', style: 'animation-delay:-' + (i * 1.3) + 's' }, gw));
    });
    add('rect', { x: 169, y: 30, width: 4, height: 98, fill: '#c7a888' });
    add('rect', { x: 124, y: 76, width: 94, height: 4, fill: '#c7a888' });
    add('rect', { x: 110, y: 132, width: 122, height: 7, rx: 2, fill: '#b99774' });
    add('polygon', { points: '124,139 218,139 250,226 92,226', fill: '#fbf6ec', opacity: 0.55, class: 'light' });

    // shelves full of finished pieces
    function pot(x, y, kind, c, band) {
      var p = kind === 'vase' ? 'M' + (x - 6) + ' ' + y + ' q-9 -12 -2 -24 q3 -5 1 -10 h14 q-2 5 1 10 q7 12 -2 24 z'
        : kind === 'bowl' ? 'M' + (x - 14) + ' ' + (y - 11) + ' q1 11 14 11 q13 0 14 -11 z'
        : kind === 'jar' ? 'M' + (x - 9) + ' ' + y + ' q-4 -10 0 -18 h-1 v-3 h20 v3 h-1 q4 8 0 18 z'
        : 'M' + (x - 8) + ' ' + y + ' v-20 h16 v20 z';
      add('path', { d: p, fill: c });
      if (band) add('rect', { x: x - 9, y: y - (kind === 'bowl' ? 7 : 12), width: 18, height: 2, rx: 1, fill: band, opacity: 0.8 });
    }
    add('rect', { x: 6, y: 20, width: 5, height: 230, fill: '#a88a70' });
    add('rect', { x: 92, y: 20, width: 5, height: 230, fill: '#a88a70' });
    [80, 150, 220].forEach(function (y) { add('rect', { x: 0, y: y, width: 102, height: 6, rx: 1, fill: '#bf9f80' }); });
    pot(26, 80, 'vase', '#c98f72', '#e8c2ab'); pot(52, 80, 'bowl', '#e3d3b4'); pot(76, 80, 'jar', '#b8cdbb', '#dfe9e0');
    pot(24, 150, 'bowl', '#b8cdbb'); pot(48, 150, 'cup', '#f4ede2', '#c98f72'); pot(74, 150, 'vase', '#e3d3b4', '#c98f72');
    pot(28, 220, 'jar', '#c98f72'); pot(62, 220, 'bowl', '#f4ede2', '#b8cdbb');
    [70, 140].forEach(function (y) { add('rect', { x: 250, y: y, width: 92, height: 6, rx: 1, fill: '#bf9f80' }); add('rect', { x: 262, y: y + 6, width: 4, height: 10, fill: '#a88a70' }); });
    pot(270, 70, 'cup', '#e3d3b4'); pot(296, 70, 'vase', '#b8cdbb', '#dfe9e0'); pot(324, 70, 'bowl', '#c98f72');
    pot(272, 140, 'jar', '#f4ede2', '#c98f72'); pot(322, 140, 'cup', '#c98f72', '#e8c2ab');
    // a potted plant on the right shelf
    add('path', { d: 'M288 140 l2 -14 h16 l2 14 z', fill: '#c98f72' });
    [[292, 118, -24], [298, 112, 4], [304, 118, 26]].forEach(function (l, i) { el('ellipse', { cx: l[0], cy: l[1], rx: 4.5, ry: 13, fill: '#8fae98', transform: 'rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')' }, el('g', { class: 'leaf', style: 'animation-delay:-' + (i * 2) + 's' }, g)); });
    // dust in the window light
    [[150, 170, 0], [196, 150, 5], [176, 204, 9]].forEach(function (m) { add('circle', { cx: m[0], cy: m[1], r: 1.2, fill: '#fffdf9', class: 'mote', style: 'animation-delay:-' + m[2] + 's' }); });
  }

  // the splash pan the wheel sits in: back half before the wheel, front wall after it
  function drawPan(svg, cx, cy) {
    var back = el('g', {}, svg);
    el('ellipse', { cx: cx, cy: cy, rx: 150, ry: 42, fill: '#574b43' }, back);
    el('ellipse', { cx: cx, cy: cy, rx: 150, ry: 42, fill: 'none', stroke: '#7a6c61', 'stroke-width': 5 }, back);
    return function front() {
      var fr = el('g', {}, svg);
      el('rect', { x: cx - 38, y: cy + 44, width: 76, height: 70, fill: '#5a4e47' }, fr);
      el('path', { d: 'M' + (cx - 150) + ' ' + cy + ' A150 42 0 0 0 ' + (cx + 150) + ' ' + cy + ' L' + (cx + 142) + ' ' + (cy + 50) + ' A142 40 0 0 1 ' + (cx - 142) + ' ' + (cy + 50) + ' Z', fill: '#675a51' }, fr);
      el('path', { d: 'M' + (cx - 150) + ' ' + cy + ' A150 42 0 0 0 ' + (cx + 150) + ' ' + cy, fill: 'none', stroke: '#877a6e', 'stroke-width': 5 }, fr);
      [[-110, 22, 7, 4], [-70, 36, 5, 6], [96, 28, 8, 4], [120, 16, 4, 5], [30, 44, 6, 3]].forEach(function (b) { el('ellipse', { cx: cx + b[0], cy: cy + b[1], rx: b[2], ry: b[3], fill: '#b67a5d', opacity: 0.8 }, fr); });
    };
  }

  window.StudioPot = { create: create, drawStudio: drawStudio, drawPan: drawPan };
})();
