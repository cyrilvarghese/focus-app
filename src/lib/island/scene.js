// Isometric island scene generator, ported as-is from the brainstorm mockup.
// Returns an SVG string built from grid coordinates. Milestone 1 replaces this
// with typed piece data + React renderers (see docs/PRD.md §12).

export const ISLAND_STEPS = 25;

export function buildIslandSvg() {
  var HW = 18, HH = 9, ZH = 18, OX = 240, OY = 104, INK = '#2b2a33';
  function P(x, y, z) { return [OX + (x - y) * HW, OY + (x + y) * HH - (z || 0) * ZH]; }
  function f(n) { return Math.round(n * 10) / 10; }
  function pts(a) { return a.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '); }
  function rnd(i) { var x = Math.sin(i * 127.1 + 3.7) * 43758.5453; return x - Math.floor(x); }
  function poly(a, fill, o) { o = o || {};
    return '<polygon points="' + pts(a) + '" fill="' + fill + '" stroke="' + (o.stroke || INK) + '" stroke-width="' + (o.sw == null ? 1 : o.sw) + '" stroke-linejoin="round"' + (o.op ? ' opacity="' + o.op + '"' : '') + (o.cls ? ' class="' + o.cls + '"' : '') + '/>'; }
  function ln(a, b, stroke, sw, extra) { return '<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '" stroke="' + (stroke || INK) + '" stroke-width="' + (sw || 1) + '" stroke-linecap="round" ' + (extra || '') + '/>'; }
  function el(cx, cy, rx, ry, fill, o) { o = o || {};
    return '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + fill + '" stroke="' + (o.stroke || INK) + '" stroke-width="' + (o.sw == null ? 1 : o.sw) + '"' + (o.cls ? ' class="' + o.cls + '"' : '') + (o.style ? ' style="' + o.style + '"' : '') + (o.op ? ' opacity="' + o.op + '"' : '') + '/>'; }
  function ci(cx, cy, r, fill, o) { return el(cx, cy, r, r, fill, o); }
  function glow(p, r, cls) { return '<circle class="glow ' + (cls || 'flicker') + '" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + r + '" fill="url(#isoWarm)"/>'; }
  function rectL(X0, X1, Y, Z0, Z1, fill, o) { return poly([P(X0, Y, Z1), P(X1, Y, Z1), P(X1, Y, Z0), P(X0, Y, Z0)], fill, o); }
  function rectR(X, Y0, Y1, Z0, Z1, fill, o) { return poly([P(X, Y0, Z1), P(X, Y1, Z1), P(X, Y1, Z0), P(X, Y0, Z0)], fill, o); }
  function rectT(X0, Y0, X1, Y1, Z, fill, o) { return poly([P(X0, Y0, Z), P(X1, Y0, Z), P(X1, Y1, Z), P(X0, Y1, Z)], fill, o); }
  function box(x, y, z, w, d, h, c, o) {
    return rectL(x, x + w, y + d, z, z + h, c[1], o) + rectR(x + w, y, y + d, z, z + h, c[2], o) + rectT(x, y, x + w, y + d, z + h, c[0], o); }
  function pyramid(x, y, z, w, h, cL, cR) { var A = P(x + w / 2, y + w / 2, z + h);
    return poly([P(x, y + w, z), P(x + w, y + w, z), A], cL) + poly([P(x + w, y, z), P(x + w, y + w, z), A], cR); }
  function gable(x, y, z, w, d, h, c) {
    var s = poly([P(x, y, z), P(x + w, y, z), P(x + w, y + d / 2, z + h), P(x, y + d / 2, z + h)], c[0]);
    s += poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d / 2, z + h)], c[2]);
    s += poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d / 2, z + h), P(x, y + d / 2, z + h)], c[1]);
    for (var t = 0.25; t < 1; t += 0.25) s += ln(P(x, y + d - d / 2 * t, z + h * t), P(x + w, y + d - d / 2 * t, z + h * t), c[3] || '#a8604a', .8);
    return s; }
  function isoEl(cx, cy, z, r, fill, o) { var p = P(cx, cy, z); return el(p[0], p[1], 1.414 * r * HW, 1.414 * r * HH, fill, o); }
  function cyl(cx, cy, z, r, h, top, side) { var b = P(cx, cy, z), t = P(cx, cy, z + h), rx = 1.414 * r * HW, ry = 1.414 * r * HH;
    return el(b[0], b[1], rx, ry, side) + '<rect x="' + f(b[0] - rx) + '" y="' + f(t[1]) + '" width="' + f(rx * 2) + '" height="' + f(b[1] - t[1]) + '" fill="' + side + '"/>' +
      ln([b[0] - rx, t[1]], [b[0] - rx, b[1]]) + ln([b[0] + rx, t[1]], [b[0] + rx, b[1]]) + el(t[0], t[1], rx, ry, top); }
  function blob(p, list, fill, hi) { var s = '<g class="sway">';
    list.forEach(function (c) { s += ci(p[0] + c[0], p[1] + c[1], c[2], fill); });
    list.forEach(function (c) { s += ci(p[0] + c[0] - c[2] * .3, p[1] + c[1] - c[2] * .35, c[2] * .38, hi, { sw: 0, op: .8 }); });
    return s + '</g>'; }
  function pine(cx, cy, sc) { var s = box(cx - .1, cy - .1, 0, .2, .2, .35 * sc, ['#8a5f43', '#8a5f43', '#6d4a34']);
    [[1.1, .3], [.85, .75], [.6, 1.15]].forEach(function (a) { var w = a[0] * sc; s += pyramid(cx - w / 2, cy - w / 2, a[1] * sc, w, .8 * sc, '#5c9a7c', '#3f7a62'); });
    return '<g class="sway">' + s + '</g>'; }
  function tuft(p, col, h) { return '<path d="M' + f(p[0]) + ' ' + f(p[1]) + ' l-2 -' + h + ' M' + f(p[0]) + ' ' + f(p[1]) + ' l0 -' + (h + 1.5) + ' M' + f(p[0]) + ' ' + f(p[1]) + ' l2 -' + h + '" stroke="' + col + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>'; }

  function pal(cx, cy, kind) {
    var p = P(cx, cy, 0), x = p[0], y = p[1] - 5;
    var body = { bunny: '#d6f3e6', dog: '#3ddc97', cat: '#3a3945', koala: '#6d7486' }[kind];
    var head = kind === 'koala' ? '#d5d9de' : '#fff';
    var s = cyl(cx, cy, 0, .2, .28, '#c9a77a', '#a8784f') + '<g class="nod">';
    if (kind === 'bunny') s += el(x - 3, y - 27, 2.1, 6.5, '#fff') + el(x + 3, y - 27, 2.1, 6.5, '#fff') + el(x - 3, y - 27, .8, 4, '#f4b6d2', { sw: 0 }) + el(x + 3, y - 27, .8, 4, '#f4b6d2', { sw: 0 });
    if (kind === 'koala') s += ci(x - 6.5, y - 21, 4.2, '#c3c8cf') + ci(x + 6.5, y - 21, 4.2, '#c3c8cf') + ci(x - 6.5, y - 21, 2, '#fff', { sw: 0 }) + ci(x + 6.5, y - 21, 2, '#fff', { sw: 0 });
    if (kind === 'cat') s += poly([[x - 5.8, y - 19], [x - 4.8, y - 26.5], [x - 1, y - 22]], INK) + poly([[x + 5.8, y - 19], [x + 4.8, y - 26.5], [x + 1, y - 22]], INK);
    s += '<path d="M' + f(x - 6) + ' ' + f(y) + ' q0 -12 6 -12 q6 0 6 12z" fill="' + body + '" stroke="' + INK + '" stroke-width="1"/>';
    if (kind === 'bunny') s += ln([x - 5, y - 4], [x + 5, y - 4], '#8ee8bd', 1.6) + ln([x - 4, y - 8], [x + 4, y - 8], '#8ee8bd', 1.6);
    s += ci(x, y - 17, 6, head);
    if (kind === 'dog') s += el(x - 6, y - 15.5, 2.4, 4.8, INK) + el(x + 6, y - 15.5, 2.4, 4.8, INK);
    if (kind === 'cat') s += '<path d="M' + f(x - 4.6) + ' ' + f(y - 20.5) + ' q4.6 -4 9.2 0 l-1.2 2.4 h-6.8z" fill="' + INK + '"/>';
    s += ci(x - 2.3, y - 17, .9, INK, { sw: 0 }) + ci(x + 2.3, y - 17, .9, INK, { sw: 0 });
    if (kind === 'koala') s += el(x, y - 14.6, 1.6, 2.1, INK, { sw: 0 });
    else s += '<path d="M' + f(x - 1) + ' ' + f(y - 14.4) + ' q1 1 2 0" stroke="' + INK + '" stroke-width=".8" fill="none"/>';
    if (kind !== 'dog' && kind !== 'bunny') s += ln([x - 4, y - 11], [x + 4, y - 11], '#3ddc97', 2.2);
    s += '</g>';
    
    return s;
  }

  function add(key, s, owner, name, html, soft) { items.push({ key: key, s: s, owner: owner, name: name, html: html, soft: soft }); }

  /* ───────── island base ───────── */
  var items = [];
  var G = { bunny: ['#9cc79a', '#95c193'], dog: ['#b5cf8f', '#aec989'], cat: ['#8fc4a4', '#89be9e'], koala: ['#9ad1b8', '#93cbb1'] };
  var base = '';
  // underside rock
  base += '<polygon points="42,215 240,314 240,380 214,356 190,372 150,322 118,338 84,268" fill="#8a6f66" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round"/>';
  base += '<polygon points="438,215 240,314 240,380 262,350 292,366 330,318 366,330 402,262" fill="#6f5850" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round"/>';
  base += '<path d="M120 300 l14 -10 M180 340 l10 -14 M300 336 l-8 -14 M370 300 l-12 -8" stroke="#55433d" stroke-width="1" />';
  base += rectL(0, 11, 11, -1.4, -.28, '#9a6f52') + rectR(11, 0, 11, -1.4, -.28, '#7f5a43');
  base += rectL(0, 11, 11, -.28, 0, '#6fa57c') + rectR(11, 0, 11, -.28, 0, '#5c9270');
  [[1, -.6], [3.4, -.95], [6, -.7], [8.6, -1.05]].forEach(function (a) { base += ln(P(a[0], 11, a[1]), P(a[0] + 1.2, 11, a[1]), '#7f5a43', 1); base += ln(P(11, a[0], a[1] - .1), P(11, a[0] + 1.2, a[1] - .1), '#66473a', 1); });
  [[2.2, -.5], [7.4, -.9], [4.9, -1.1]].forEach(function (a) { var p = P(a[0], 11, a[1]); base += el(p[0], p[1], 3.5, 2.2, '#b9a596', { sw: .7 }); });
  // tiles
  for (var gx = 0; gx < 11; gx++) for (var gy = 0; gy < 11; gy++) {
    var col, path = (gx === 5 || gy === 5);
    if (path) col = ((gx + gy) % 2) ? '#dcd3c4' : '#d3c9b8';
    else col = G[gx < 5 ? (gy < 5 ? 'bunny' : 'cat') : (gy < 5 ? 'dog' : 'koala')][(gx + gy) % 2];
    base += rectT(gx, gy, gx + 1, gy + 1, 0, col, { stroke: path ? '#c6bba8' : col, sw: .6 });
  }
  base += poly([P(0, 0), P(11, 0), P(11, 11), P(0, 11)], 'none', { sw: 1.2 });
  base += isoEl(5.5, 5.5, 0, 2.0, '#e6dece', { stroke: '#c6bba8' }) + isoEl(5.5, 5.5, 0, 1.55, 'none', { stroke: '#cfc5b3', sw: .8, style: 'stroke-dasharray:3 3' });
  // grass tufts
  [[0.6, 2.2], [4.3, 0.4], [6.5, 1.0], [10.4, 4.4], [0.5, 8.9], [3.9, 10.5], [6.4, 10.6], [10.5, 9.9], [7.0, 6.4], [2.2, 4.6]].forEach(function (a) { base += tuft(P(a[0], a[1]), '#5c9a7c', 4); });
  add(-100, 0, null, '', base);

  /* ───────── shared centre: table + pals ───────── */
  var tb = cyl(5.5, 5.5, 0, .22, .42, '#1fb57a', '#178f60') + cyl(5.5, 5.5, .42, .85, .1, '#3ddc97', '#1fb57a');
  tb += rectT(5.05, 5.2, 5.4, 5.45, .52, '#fff', { sw: .6 }) + rectT(5.7, 5.75, 6.0, 6.0, .52, '#fff', { sw: .6 });
  tb += box(5.1, 5.75, .52, .32, .22, .07, ['#d98b6b', '#c47a5c', '#a8604a'], { sw: .6 });
  var mg = P(5.95, 5.25, .52); tb += el(mg[0], mg[1], 2.4, 1.6, '#fbf6ec', { sw: .7 });
  tb += box(5.42, 5.42, .52, .16, .16, .24, ['#2b2a33', '#ffd98a', '#f3c766'], { sw: .7 }) + glow(P(5.5, 5.5, .7), 15);
  add(11, 0, null, '', tb);
  add(8.6, 0, 'bunny', '', pal(4.3, 4.3, 'bunny'));
  add(10.9, 0, 'dog', '', pal(6.7, 4.3, 'dog'));
  add(10.95, 0, 'cat', '', pal(4.3, 6.7, 'cat'));
  add(13.4, 0, 'koala', '', pal(6.7, 6.7, 'koala'));

  /* ───────── Bunny: the cabin ───────── */
  var W = ['#f3e6cf', '#f3e6cf', '#dcc7a4'];
  var cab = box(0.9, 1.0, 0, 2.8, 2.1, 1.4, W);
  [.35, .7, 1.05].forEach(function (z) { cab += ln(P(0.9, 3.1, z), P(3.7, 3.1, z), '#dcc7a4', .9) + ln(P(3.7, 1.0, z), P(3.7, 3.1, z), '#c4ad86', .9); });
  cab += rectL(1.3, 1.9, 3.1, 0, .95, '#a8784f') + ln(P(1.6, 3.1, 0), P(1.6, 3.1, .95), '#8a5f43', .8);
  var kn = P(1.78, 3.1, .45); cab += ci(kn[0], kn[1], 1.1, '#f3d27a', { sw: .5 });
  var wr = P(1.6, 3.1, .72); cab += ci(wr[0], wr[1], 2.6, 'none', { stroke: '#5c9a7c', sw: 1.6 });
  cab += rectL(2.4, 3.2, 3.1, .5, 1.0, '#55567a') + rectR(3.7, 1.6, 2.5, .5, 1.05, '#55567a');
  add(4.0, 1, 'bunny', 'cabin walls', cab);
  var lit = rectL(2.4, 3.2, 3.1, .5, 1.0, '#ffdf95') + ln(P(2.8, 3.1, .5), P(2.8, 3.1, 1.0)) + ln(P(2.4, 3.1, .75), P(3.2, 3.1, .75));
  lit += rectR(3.7, 1.6, 2.5, .5, 1.05, '#ffd27a') + ln(P(3.7, 2.05, .5), P(3.7, 2.05, 1.05)) + ln(P(3.7, 1.6, .78), P(3.7, 2.5, .78));
  lit += rectL(2.35, 3.25, 3.13, .42, .5, '#b86a4f', { sw: .8 });
  [2.5, 2.7, 2.9, 3.1].forEach(function (x, i) { var q = P(x, 3.13, .56); lit += ci(q[0], q[1], 1.7, ['#f1b9ae', '#ffd98a', '#fff', '#b7a9d9'][i], { sw: .5 }); });
  lit += glow(P(2.8, 3.1, .75), 17) + glow(P(3.7, 2.05, .78), 19);
  add(4.05, 9, 'bunny', 'lamplight in the windows', lit, true);
  var rf = '<g class="smoke">' + [0, 1, 2].map(function () { var q = P(1.71, 1.41, 2.8); return '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="3.6" fill="#f3eee8"/>'; }).join('') + '</g>';
  rf += box(1.5, 1.2, 1.5, .42, .42, 1.2, ['#9a5a44', '#b86a4f', '#9a5a44']);
  rf += gable(0.7, 0.8, 1.4, 3.2, 2.5, 1.05, ['#e3a184', '#d98b6b', '#f3e6cf', '#a8604a']);
  add(4.1, 5, 'bunny', 'a shingled roof and a warm chimney', rf);
  var cp = rectT(1.2, 3.8, 3.4, 4.6, 0, '#8a6a52', { sw: .8 });
  for (var i = 0; i < 5; i++) [4.0, 4.4].forEach(function (yy) { var q = P(1.5 + i * .42, yy); cp += tuft(q, '#4f9d6f', 4.5) + ci(q[0], q[1] + .5, 1.5, '#ee8a3c', { sw: .5 }); });
  add(6.4, 13, 'bunny', 'a carrot patch', cp);
  add(5.0, 17, 'bunny', 'two tall pines', pine(0.7, 4.3, 1.15));
  add(5.1, 17, 'bunny', 'two tall pines', pine(4.4, 0.7, 1.3));

  /* ───────── Dog: the farm ───────── */
  var beds = '';
  [2.9, 3.9].forEach(function (by) {
    beds += box(6.6, by, 0, 2.2, .7, .2, ['#7a5a44', '#b98659', '#a8784f']);
    for (var i = 0; i < 5; i++) beds += tuft(P(6.85 + i * .42, by + .35, .2), '#6fbf8a', 3.5);
  });
  add(11.0, 2, 'dog', 'raised beds, first sprouts', beds);
  var mill = box(8.2, 0.9, 0, 1.3, 1.3, 2.5, ['#fbf6ec', '#fbf6ec', '#e0d6c0']);
  mill += ln(P(8.2, 2.2, .9), P(9.5, 2.2, .9), '#e0d6c0', .9) + ln(P(8.2, 2.2, 1.7), P(9.5, 2.2, 1.7), '#e0d6c0', .9) + ln(P(9.5, .9, .9), P(9.5, 2.2, .9), '#c9bda3', .9) + ln(P(9.5, .9, 1.7), P(9.5, 2.2, 1.7), '#c9bda3', .9);
  mill += rectL(8.6, 9.1, 2.2, 0, .8, '#a8784f') + rectL(8.7, 9.0, 2.2, 1.35, 1.75, '#ffdf95');
  mill += pyramid(8.05, 0.75, 2.5, 1.6, .95, '#d98b6b', '#b86a4f');
  add(10.4, 6, 'dog', 'a windmill tower', mill);
  var hub = P(9.5, 1.55, 2.0);
  var sails = '<g transform="translate(' + f(hub[0]) + ' ' + f(hub[1]) + ') matrix(1,-0.5,0,1,0,0)"><g>' +
    '<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite"/>' +
    [0, 90, 180, 270].map(function (a) { return '<g transform="rotate(' + a + ')"><line x1="0" y1="0" x2="0" y2="-27" stroke="' + INK + '" stroke-width="1.4"/><rect x="1" y="-27" width="7.5" height="19" fill="#fbf6ec" stroke="' + INK + '" stroke-width=".9"/><path d="M1 -21h7.5M1 -15h7.5M4.7 -27v19" stroke="#c9b99a" stroke-width=".6"/></g>'; }).join('') +
    '<circle r="2.4" fill="#d98b6b" stroke="' + INK + '"/></g></g>';
  add(10.45, 10, 'dog', 'windmill sails, turning', sails, true);
  var pk = '';
  [[6.9, 4.25], [7.6, 4.2], [8.4, 4.3]].forEach(function (a) { var q = P(a[0], a[1], .2); pk += el(q[0], q[1] - 2, 3.8, 3, '#ee8a3c', { sw: .8 }) + ln([q[0], q[1] - 5], [q[0] + 1, q[1] - 7], '#4f9d6f', 1.2); });
  [[6.9, 3.25], [7.5, 3.25], [8.1, 3.25], [8.6, 3.25]].forEach(function (a) { var q = P(a[0], a[1], .2); pk += ln(q, [q[0], q[1] - 11], '#a8784f', 1) + ci(q[0] - 1.5, q[1] - 6, 1.5, '#d9674f', { sw: .5 }) + ci(q[0] + 1.6, q[1] - 8.5, 1.4, '#d9674f', { sw: .5 }); });
  add(11.3, 14, 'dog', 'pumpkins and tomatoes ripening', pk);
  var dh = box(9.6, 3.6, 0, .9, .9, .6, ['#f3e6cf', '#f3e6cf', '#dcc7a4']) + rectL(9.85, 10.25, 4.5, 0, .42, '#3d2a1e', { sw: .8 });
  dh += gable(9.5, 3.5, .6, 1.1, 1.1, .5, ['#e0796a', '#d9674f', '#f3e6cf', '#a8453a']);
  var bw = P(9.3, 5.0); dh += el(bw[0], bw[1], 3.4, 1.9, '#7fa8b8', { sw: .8 });
  add(14.0, 18, 'dog', 'a doghouse (naturally)', dh);

  /* ───────── Cat: the reading nook ───────── */
  var sh = box(0.6, 6.6, 0, .55, 2.0, 1.6, ['#b98659', '#a8784f', '#8a5f43']);
  var BK = ['#9cc5a1', '#d98b6b', '#b7a9d9', '#f3d27a', '#7fa8b8', '#f1b9ae', '#fbf6ec'], bi = 0;
  [.12, .6, 1.08].forEach(function (z0) {
    sh += rectR(1.15, 6.7, 8.5, z0, z0 + .42, '#4a3224', { sw: .6 });
    for (var yy = 6.73; yy < 8.4; yy += .13) { bi++; if (rnd(bi) < .12) continue; sh += rectR(1.15, yy, yy + .11, z0, z0 + .24 + rnd(bi + 40) * .15, BK[bi % 7], { sw: .4 }); }
  });
  add(8.5, 7, 'cat', 'a bookshelf, fully stocked', sh);
  var tr = box(1.38, 9.58, 0, .24, .24, 1.3, ['#8a5f43', '#8a5f43', '#6d4a34']);
  tr += blob(P(1.5, 9.7, 1.3), [[-13, -6, 14], [13, -8, 15], [0, -4, 13], [0, -24, 18]], '#5c9a7c', '#86bf9c');
  add(11.2, 3, 'cat', 'an old shade tree', tr);
  var bn = box(2.6, 7.2, .32, 1.5, .1, .45, ['#b98659', '#a8784f', '#8a5f43']) + box(2.6, 7.2, 0, 1.5, .5, .32, ['#c49a74', '#a8784f', '#8a5f43']);
  bn += box(2.75, 7.32, .32, .4, .3, .1, ['#e8a7a0', '#d98b8b', '#c47a7a'], { sw: .7 });
  add(10.05, 11, 'cat', 'a reading bench and a rug', bn);
  var rug = rectT(2.4, 8.0, 4.4, 9.2, 0, '#e8a7a0', { sw: .9 }) + rectT(2.58, 8.18, 4.22, 9.02, 0, 'none', { stroke: '#fbf6ec', sw: .9 }) + rectT(2.9, 8.4, 3.9, 8.8, 0, '#f4c9c0', { sw: 0 });
  add(10.1, 11, 'cat', 'a reading bench and a rug', rug);
  var tea = cyl(3.5, 8.6, 0, .28, .34, '#c49a74', '#a8784f'); var mq = P(3.5, 8.6, .34);
  tea += '<rect x="' + f(mq[0] - 2.5) + '" y="' + f(mq[1] - 5) + '" width="5" height="5" rx="1" fill="#fbf6ec" stroke="' + INK + '" stroke-width=".8"/>';
  tea += '<g class="steam" stroke="#fff" stroke-width="1.1" fill="none"><path d="M' + f(mq[0] - 1) + ' ' + f(mq[1] - 7) + ' q-2 -3 0 -6"/><path d="M' + f(mq[0] + 1.5) + ' ' + f(mq[1] - 7) + ' q2 -3 0 -6"/></g>';
  tea += box(2.7, 8.5, 0, .42, .3, .09, ['#9cc5a1', '#86b08c', '#6f9a78'], { sw: .7 }) + box(2.73, 8.52, .09, .38, .28, .09, ['#d98b6b', '#c47a5c', '#a8604a'], { sw: .7 }) + box(2.7, 8.5, .18, .4, .28, .09, ['#b7a9d9', '#9f90c4', '#8677ad'], { sw: .7 });
  add(12.0, 15, 'cat', 'tea, still steaming, and a book stack', tea);
  var lp0 = P(4.6, 6.5), lp1 = P(4.6, 6.5, 1.7);
  var lamp = el(lp0[0], lp0[1], 3, 1.6, INK, { sw: 0 }) + ln(lp0, lp1, INK, 2) + glow([lp1[0], lp1[1] - 4], 22);
  lamp += '<rect class="glow flicker" x="' + f(lp1[0] - 3.5) + '" y="' + f(lp1[1] - 8) + '" width="7" height="8" rx="1.5" fill="#ffd98a" stroke="' + INK + '" stroke-width="1"/><path d="M' + f(lp1[0] - 5) + ' ' + f(lp1[1] - 8) + ' l5 -4 l5 4z" fill="' + INK + '"/>';
  add(11.1, 19, 'cat', 'a lamp post for late chapters', lamp);

  /* ───────── Koala: the pond ───────── */
  var pond = rectT(9.8, 8.5, 11, 9.1, 0, '#8fc7d8', { sw: .8 });
  pond += '<polygon points="' + pts([P(11, 8.5, 0), P(11, 9.1, 0), P(11, 9.1, -3.2), P(11, 8.5, -3.2)]) + '" fill="url(#isoFall)"/>';
  [8.62, 8.8, 8.98].forEach(function (yy) { pond += ln(P(11, yy, 0), P(11, yy, -3), '#fff', 1.3, 'class="fall" opacity=".85"'); });
  var mist = P(11, 8.8, -3.1); pond += ci(mist[0] - 3, mist[1], 5, '#fff', { sw: 0, cls: 'twinkle', op: .6 }) + ci(mist[0] + 4, mist[1] + 2, 4, '#fff', { sw: 0, cls: 'twinkle', op: .5 });
  pond += isoEl(8.7, 8.8, 0, 1.37, '#d9d0c1') + isoEl(8.7, 8.8, 0, 1.25, '#8fc7d8');
  var pc = P(8.7, 8.8);
  pond += el(pc[0] - 8, pc[1] - 3, 9, 3, 'none', { stroke: '#fff', sw: .8, cls: 'ripple' }) + el(pc[0] + 10, pc[1] + 4, 7, 2.4, 'none', { stroke: '#fff', sw: .8, cls: 'ripple', style: 'animation-delay:-1.7s' });
  [[-16, 2], [6, -6], [14, 6]].forEach(function (a) { pond += '<path d="M' + f(pc[0] + a[0] - 4) + ' ' + f(pc[1] + a[1]) + ' a4 2 0 1 0 8 0 l-4 -.6z" fill="#4f9d6f" stroke="' + INK + '" stroke-width=".6"/>'; });
  add(-10, 4, 'koala', 'a pond, a stream, and a waterfall off the edge', pond);
  var lo = '<path d="M' + f(pc[0] + 6) + ' ' + f(pc[1] - 6) + ' l-2.4 -5 l3 3 l1 -4.5 l1 4.5 l3 -3 l-2.4 5z" fill="#f4b6d2" stroke="' + INK + '" stroke-width=".6"/>';
  lo += '<g class="koi"><path d="M' + f(pc[0] - 6) + ' ' + f(pc[1] + 5) + ' q4 -2.4 8 0 l2.4 -1.4 v2.8 l-2.4 -1.4 q-4 2.4 -8 0" fill="#ff9a5c" stroke="' + INK + '" stroke-width=".5"/></g>';
  [[7.55, 9.85], [7.75, 10.0], [7.4, 9.65]].forEach(function (a, i) { var q = P(a[0], a[1]); lo += ln(q, [q[0] + (i - 1) * 2, q[1] - 15 - i * 3], '#4f8a64', 1.3) + el(q[0] + (i - 1) * 2, q[1] - 17 - i * 3, 1.5, 3.4, '#7a5238', { sw: .5 }); });
  add(-8, 20, 'koala', 'reeds, a lotus and one curious koi', lo);
  function euc(cx, cy, h) { return box(cx - .09, cy - .09, 0, .18, .18, h, ['#e3dccd', '#e3dccd', '#c9c0ad']) + blob(P(cx, cy, h), [[-7, -2, 9], [7, -5, 10], [0, -16, 11], [-3, -29, 8]], '#7fb7a4', '#b5dccb'); }
  add(16.8, 8, 'koala', 'eucalyptus trees (of course)', euc(10.2, 6.6, 1.5));
  add(17.0, 8, 'koala', 'eucalyptus trees (of course)', euc(6.8, 10.2, 1.7));
  var br = box(10.2, 8.3, .05, .5, 1.0, .1, ['#c49a74', '#a8784f', '#8a5f43'], { sw: .8 });
  [8.3, 9.3].forEach(function (yy) { br += ln(P(10.2, yy, .15), P(10.2, yy, .5), '#8a5f43', 1.6) + ln(P(10.7, yy, .15), P(10.7, yy, .5), '#8a5f43', 1.6); });
  br += ln(P(10.2, 8.3, .5), P(10.2, 9.3, .5), '#8a5f43', 1.4) + ln(P(10.7, 8.3, .5), P(10.7, 9.3, .5), '#8a5f43', 1.4);
  add(19.0, 12, 'koala', 'a little footbridge', br);
  var C = ['#d9d4cc', '#c4beb4', '#a9a297'];
  var sl = box(6.35, 8.25, 0, .42, .42, .14, C, { sw: .8 }) + box(6.48, 8.38, .14, .16, .16, .42, C, { sw: .8 });
  sl += box(6.38, 8.28, .56, .36, .36, .28, ['#d9d4cc', '#ffdf95', '#ffd27a'], { sw: .8 }) + pyramid(6.28, 8.18, .84, .56, .32, '#c4beb4', '#a9a297') + glow(P(6.56, 8.46, .7), 17);
  add(14.9, 16, 'koala', 'a stone lantern', sl);

  /* ───────── shared ───────── */
  var fen = '';
  for (var t = 0.2; t < 11; t += .55) {
    fen += ln(P(t, .12, 0), P(t, .12, .46), INK, 3.2) + ln(P(t, .12, 0), P(t, .12, .46), '#f3e6cf', 1.8);
    fen += ln(P(.12, t, 0), P(.12, t, .46), INK, 3.2) + ln(P(.12, t, 0), P(.12, t, .46), '#f3e6cf', 1.8);
  }
  [.16, .34].forEach(function (z) { fen += ln(P(.2, .12, z), P(10.8, .12, z), '#f3e6cf', 1.5) + ln(P(.12, .2, z), P(.12, 10.8, z), '#f3e6cf', 1.5); });
  add(-5, 21, null, 'a picket fence around it all', fen);

  function wire(a, b) { var A = P(a[0], a[1], 2.3), B = P(b[0], b[1], 2.3), M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + 15];
    var s = '<path d="M' + f(A[0]) + ' ' + f(A[1]) + ' Q' + f(M[0]) + ' ' + f(M[1]) + ' ' + f(B[0]) + ' ' + f(B[1]) + '" stroke="' + INK + '" stroke-width=".9" fill="none"/>';
    [.2, .4, .6, .8].forEach(function (t, i) { var u = 1 - t, q = [u * u * A[0] + 2 * u * t * M[0] + t * t * B[0], u * u * A[1] + 2 * u * t * M[1] + t * t * B[1] + 1.5];
      s += '<circle class="glow twinkle" style="animation-delay:' + (i * .45) + 's" cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="7" fill="url(#isoWarm)"/>' + ci(q[0], q[1], 1.9, '#ffe08a', { sw: .5 }); });
    return s; }
  function pole(x, y) { return ln(P(x, y, 0), P(x, y, 2.3), INK, 2.6) + ln(P(x, y, 0), P(x, y, 2.3), '#8a5f43', 1.4); }
  var NM = 'string lights over the table';
  add(11.05, 22, null, NM, pole(3.4, 3.4) + pole(7.6, 3.4) + pole(3.4, 7.6) + wire([3.4, 3.4], [7.6, 3.4]) + wire([3.4, 3.4], [3.4, 7.6]));
  add(15.3, 22, null, NM, pole(7.6, 7.6) + wire([7.6, 3.4], [7.6, 7.6]) + wire([3.4, 7.6], [7.6, 7.6]));

  var FL = [[4.5, 4.0], [4.2, 4.6], [0.4, 3.8], [0.5, 4.7], [4.7, 1.6], [6.4, 0.6], [7.2, 1.4], [6.5, 2.0], [10.6, 2.8], [10.5, 0.5], [8.2, 4.8],
            [2.0, 6.4], [3.6, 6.3], [0.5, 10.5], [3.2, 10.4], [4.6, 10.0], [4.7, 7.4], [9.4, 6.4], [10.6, 7.6], [6.3, 9.4], [7.0, 10.7], [9.6, 10.6], [10.6, 10.3], [8.3, 6.5]];
  var fcol = ['#f4b6d2', '#fff', '#ffd98a', '#b7a9d9'], fl = '';
  FL.forEach(function (a, i) { var q = P(a[0], a[1]); fl += ln(q, [q[0], q[1] - 5], '#4f8a64', 1) + ci(q[0], q[1] - 6, 1.9, fcol[i % 4], { sw: .5 }); });
  add(30, 23, null, 'wildflowers, everywhere', fl);

  var ff = '';
  [[70, 190], [150, 120], [410, 170], [330, 110], [240, 250], [120, 250], [380, 250], [200, 150]].forEach(function (a, i) {
    ff += '<g class="firefly" style="animation-delay:-' + (i * .9) + 's"><circle cx="' + a[0] + '" cy="' + a[1] + '" r="7" fill="url(#isoWarm)"/><circle cx="' + a[0] + '" cy="' + a[1] + '" r="1.4" fill="#fff6b0"/></g>'; });
  add(100, 25, null, 'fireflies', ff, true);


  function wrap(it) {
    return '<g' + (it.s ? ' class="piece' + (it.soft ? ' soft' : '') + '" data-s="' + it.s + '" data-name="' + it.name + '"' : '') + (it.owner ? ' data-owner="' + it.owner + '"' : '') + '>' + it.html + '</g>'; }
  items.sort(function (a, b) { return a.key - b.key; });

  return '<defs>' +
    '<radialGradient id="isoWarm"><stop offset="0" stop-color="#ffe6a3" stop-opacity=".95"/><stop offset="1" stop-color="#ffe6a3" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="isoMint"><stop offset="0" stop-color="#3ddc97" stop-opacity=".28"/><stop offset="1" stop-color="#3ddc97" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="isoFall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc7d8"/><stop offset="1" stop-color="#cfeaf2" stop-opacity="0"/></linearGradient></defs>' +
    '<ellipse cx="240" cy="215" rx="236" ry="170" fill="url(#isoMint)"/>' +
    '<g class="bob2"><polygon points="28,300 60,292 84,302 66,326 50,318 42,330" fill="#8a6f66" stroke="' + INK + '" stroke-width=".8"/><polygon points="28,300 56,288 84,302 56,310" fill="#9cc79a" stroke="' + INK + '" stroke-width=".8"/></g>' +
    '<g class="bob2" style="animation-delay:-4s"><polygon points="410,330 436,324 456,334 440,352 430,346 424,356" fill="#6f5850" stroke="' + INK + '" stroke-width=".8"/><polygon points="410,330 434,321 456,334 432,341" fill="#9ad1b8" stroke="' + INK + '" stroke-width=".8"/></g>' +
    '<g class="bob">' + items.map(wrap).join('') + '</g>';
}
