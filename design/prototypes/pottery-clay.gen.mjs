// Generates pottery-clay.svg (realistic clay, pure SMIL, 25-minute loop)
// and pottery-clay-preview.html (same SVG inline + scrubber).
// Run: node design/prototypes/pottery-clay.gen.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('.', import.meta.url).pathname;
const DUR = 1500;              // 25 minutes
const SPIN = 2.5;              // seconds per wheel turn; 30s and 1300s are whole turns, so start/stop are seamless
const T_START = 7.5, T_STOP = 1300;
const CX = 300, BASE = 440;    // pot axis and wheel-top centre
const WRX = 165, WRY = 42, BAND = 38;
const TW = WRY / WRX;          // wheel tilt
const TP = 0.26;               // tilt used for rings on the pot
const SX = 1.1, SY = 1.06;     // profile scale
const N = 18;
const f = (n) => (Math.round(n * 100) / 100).toString();

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a, b) => a + (b - a) * rnd();

// ---- stage profiles (h, r) from foot up
const same = (p) => ({ L: p, R: p });
const STAGES = {
  lump: {
    L: [[0, 54], [8, 62], [18, 66], [28, 60], [36, 63], [46, 52], [54, 43], [60, 31], [66, 18], [70, 6], [71, 0]],
    R: [[0, 56], [10, 64], [20, 62], [30, 66], [40, 58], [48, 48], [56, 40], [62, 26], [67, 12], [70, 3], [71, 0]],
  },
  dome: same([[0, 74], [14, 73], [30, 67], [44, 55], [55, 39], [62, 22], [66, 8], [67, 0]]),
  opened: same([[0, 64], [26, 65], [52, 61], [74, 53], [90, 43], [100, 34], [104, 29]]),
  low: same([[0, 70], [20, 72], [40, 72], [58, 71], [70, 70.5]]),
  tall: same([[0, 58], [40, 58], [80, 57], [118, 56], [140, 57.5]]),
  belly: same([[0, 58], [20, 76], [46, 86], [72, 82], [96, 68], [112, 58], [120, 56], [126, 57]]),
  rise: same([[0, 54], [30, 74], [62, 84], [96, 76], [124, 58], [146, 44], [158, 40], [166, 44]]),
  vase: same([[0, 47], [36, 74], [76, 85], [114, 70], [146, 44], [174, 28], [196, 25], [210, 30], [216, 38]]),
  final: same([[0, 42], [34, 68], [74, 80], [112, 64], [146, 40], [174, 25], [198, 23], [214, 29], [222, 38]]),
};
const KEYS = [
  // not linear: centring and opening are quick, pulling the walls up takes longest,
  // then shaping slows down into careful refinement
  [0, 'lump'], [9, 'lump'], [80, 'dome'], [190, 'opened'], [310, 'low'], [560, 'tall'],
  [800, 'belly'], [1010, 'rise'], [1170, 'vase'], [1290, 'final'], [DUR, 'final'],
];
const keyTimes = KEYS.map(([t]) => f(t / DUR)).join(';');
const EASE = '0.42 0 0.58 1';
const keySplines = KEYS.slice(1).map(() => EASE).join(';');

// ---- geometry
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
function resample(ctrl) {
  const pts = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]], dense = [];
  for (let i = 1; i < pts.length - 2; i++) for (let s = 0; s < 60; s++) dense.push(catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], s / 60));
  dense.push(ctrl[ctrl.length - 1]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = acc[acc.length - 1], out = [];
  for (let k = 0; k < N; k++) {
    const target = (k / (N - 1)) * total;
    let j = acc.findIndex((a) => a >= target); if (j < 1) j = 1;
    const u = (target - acc[j - 1]) / (acc[j] - acc[j - 1] || 1);
    out.push([(dense[j - 1][0] + (dense[j][0] - dense[j - 1][0]) * u) * SY, (dense[j - 1][1] + (dense[j][1] - dense[j - 1][1]) * u) * SX]);
  }
  return out;
}
function curveThrough(P) {
  let d = '';
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
// closed wavy ellipse, fixed structure (16 points)
const WAVE = [pick(0, 6), pick(0, 6), pick(0, 6)];
function wavyEllipse(cx, cy, rx, ry, amp) {
  const P = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const w = amp * (Math.sin(2 * a + WAVE[0]) + 0.6 * Math.sin(3 * a + WAVE[1]) + 0.35 * Math.sin(5 * a + WAVE[2]));
    P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a) - w]);
  }
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < 16; i++) {
    const p0 = P[(i + 15) % 16], p1 = P[i], p2 = P[(i + 1) % 16], p3 = P[(i + 2) % 16];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + ' Z';
}
function stageGeom(name) {
  const s = STAGES[name], L = resample(s.L), R = resample(s.R);
  const left = L.map(([h, r]) => [CX - r, BASE - h]);
  const right = R.map(([h, r]) => [CX + r, BASE - h]).reverse();
  const topL = left[N - 1], topR = right[0];
  const rimR = (topR[0] - topL[0]) / 2, rimY = (topL[1] + topR[1]) / 2, rimCx = (topL[0] + topR[0]) / 2;
  const ry = rimR * TP;
  const r0L = L[0][1], r0R = R[0][1], sag = ((r0L + r0R) / 2) * TW * 1.333;
  const body = `M${f(left[0][0])} ${f(left[0][1])}` + curveThrough(left) +
    ` C${f(topL[0])} ${f(topL[1] - ry * 1.333)} ${f(topR[0])} ${f(topR[1] - ry * 1.333)} ${f(topR[0])} ${f(topR[1])}` +
    curveThrough(right) +
    ` C${f(CX + r0R)} ${f(BASE + sag)} ${f(CX - r0L)} ${f(BASE + sag)} ${f(CX - r0L)} ${f(BASE)} Z`;
  const wall = Math.min(6.5, rimR * 0.3), amp = Math.min(1.3, rimR * 0.035);
  const rim = wavyEllipse(rimCx, rimY, rimR, ry, amp);
  const hole = wavyEllipse(rimCx, rimY + wall * 0.12, Math.max(rimR - wall, 0), Math.max(ry - wall * TP, 0), amp * 0.8);
  const prof = L.map(([h, r], i) => [(h + R[i][0]) / 2, (r + R[i][1]) / 2]);
  return { body, rim, hole, r0: (r0L + r0R) / 2, rimR, prof, H: prof[N - 1][0] };
}
const G = Object.fromEntries(Object.keys(STAGES).map((k) => [k, stageGeom(k)]));
function rAt(stage, u) {
  const { prof, H } = G[stage], h = u * H;
  for (let i = 1; i < prof.length; i++) if (prof[i][0] >= h) {
    const [h0, r0] = prof[i - 1], [h1, r1] = prof[i];
    return r0 + (r1 - r0) * ((h - h0) / (h1 - h0 || 1));
  }
  return prof[prof.length - 1][1];
}
const yAt = (stage, u) => BASE - u * G[stage].H;
function frontRing(stage, u, dy = 0) {
  const r = Math.max(rAt(stage, u), 0.01), y = yAt(stage, u) + dy, ry = r * TP, K = 0.5523;
  return `M${f(CX - r)} ${f(y)} C${f(CX - r)} ${f(y + ry * K)} ${f(CX - r * K)} ${f(y + ry)} ${f(CX)} ${f(y + ry)}` +
    ` C${f(CX + r * K)} ${f(y + ry)} ${f(CX + r)} ${f(y + ry * K)} ${f(CX + r)} ${f(y)}`;
}

// ---- animation helpers
const perKey = (fn) => KEYS.map(([, s]) => fn(s)).join(';');
const slow = (attr, values) => `<animate attributeName="${attr}" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${keySplines}" values="${values}"/>`;
const slowT = (type, values) => `<animateTransform attributeName="transform" type="${type}" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${keySplines}" values="${values}"/>`;
function timeline(attr, pts, type, discrete) {
  const kt = pts.map(([t]) => (t / DUR).toFixed(6)).join(';'), v = pts.map(([, x]) => x).join(';');
  const tag = type ? `animateTransform attributeName="transform" type="${type}"` : `animate attributeName="${attr}"`;
  const mode = discrete ? 'calcMode="discrete"' : `calcMode="spline" keySplines="${pts.slice(1).map((p) => p[2] || EASE).join(';')}"`;
  return `<${tag} dur="${DUR}s" repeatCount="indefinite" ${mode} keyTimes="${kt}" values="${v}"/>`;
}
const STEPS = 36;
const spinVals = (fn) => Array.from({ length: STEPS + 1 }, (_, k) => fn((k / STEPS) * Math.PI * 2)).join(';');
const spinT = (type, fn) => `<animateTransform attributeName="transform" type="${type}" dur="${SPIN}s" repeatCount="indefinite" values="${spinVals(fn)}"/>`;
const spinA = (attr, fn) => `<animate attributeName="${attr}" dur="${SPIN}s" repeatCount="indefinite" values="${spinVals(fn)}"/>`;
const vis = (a) => Math.min(1, Math.max(0, (Math.cos(a) - 0.04) * 3));
const fore = (a) => Math.max(0.03, Math.cos(a));

// ---- marks on the clay. Each lives at height u and angle a0 and is projected as the pot turns:
// x = r·sin, y = r·TP·cos, squashed by cos near the edges, hidden round the back.
const marks = { spin: [], lumpStatic: [], finalStatic: [] };
function addMark(kind, u, a0, content) {
  const tag = `${kind}`;
  // spinning copy (positions track the changing pot every keyframe)
  const inner = `<g>${spinT('translate', (a) => `${f(Math.sin(a + a0))} ${f(TP * Math.cos(a + a0))}`)}` +
    `<g>${slowT('scale', perKey((s) => f(1 / Math.max(rAt(s, u), 4))))}` +
    `<g>${spinT('scale', (a) => `${f(fore(a + a0))} 1`)}${spinA('opacity', (a) => f(vis(a + a0)))}${content}</g></g></g>`;
  marks.spin.push({ tag, u, inner });
  const stat = (s) => {
    const r = rAt(s, u);
    return `<g transform="translate(${f(CX + r * Math.sin(a0))} ${f(yAt(s, u) + r * TP * Math.cos(a0))}) scale(${f(fore(a0))} 1)" opacity="${f(vis(a0))}">${content}</g>`;
  };
  if (kind !== 'glint' && kind !== 'dent') marks.lumpStatic.push({ tag, html: stat('lump') });
  if (kind !== 'bump' && kind !== 'glint') marks.finalStatic.push({ tag, html: stat('final') });
}
// lumpy bumps (only on the raw lump)
for (let i = 0; i < 26; i++) {
  const R = pick(6, 13);
  addMark('bump', pick(0.12, 0.85), pick(0, Math.PI * 2), `<circle r="${f(R)}" fill="url(#pc-bump)"/><circle cx="${f(R * .35)}" cy="${f(R * .4)}" r="${f(R * .75)}" fill="url(#pc-bumpshade)"/>`);
}
// grog specks
for (let i = 0; i < 64; i++) addMark('speck', pick(0.04, 0.96), pick(0, Math.PI * 2), `<circle r="${f(pick(0.55, 1.25))}" fill="#6a5643" opacity="${f(pick(0.45, 0.85))}"/>`);
for (let i = 0; i < 18; i++) addMark('speck', pick(0.04, 0.96), pick(0, Math.PI * 2), `<circle r="${f(pick(0.7, 1.3))}" fill="#f3e8d6" opacity="${f(pick(0.5, 0.8))}"/>`);
// finger drags: short horizontal smears
for (let i = 0; i < 10; i++) addMark('speck', pick(0.1, 0.9), pick(0, Math.PI * 2), `<rect x="-${f(pick(4, 9))}" y="-.6" width="${f(pick(8, 16))}" height="1.2" rx=".6" fill="#7d6851" opacity="${f(pick(0.18, 0.32))}"/>`);
// wet slip glints while throwing
for (let i = 0; i < 9; i++) addMark('glint', pick(0.1, 0.9), pick(0, Math.PI * 2), `<ellipse rx="${f(pick(5, 10))}" ry="1.3" fill="#fbf4e8" opacity="${f(pick(0.45, 0.7))}" filter="url(#pc-blur1)"/>`);
// thumb dents, like the reference: shaded upper-left inside, lit lower-right
const dent = (w, h) => `<ellipse rx="${w}" ry="${h}" fill="url(#pc-dent)" filter="url(#pc-blur1)"/>`;
addMark('dent', 0.34, 0.35, dent(9, 11));
addMark('dent', 0.55, 2.6, dent(8, 10));
addMark('dent', 0.22, 4.4, dent(7, 8.5));

// group spinning marks into height bands so they share the slow transforms
function bands(list, kinds) {
  const by = new Map();
  for (const m of list.filter((m) => kinds.includes(m.tag))) {
    const key = Math.round(m.u * 25) / 25;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(m);
  }
  return [...by.entries()].map(([, ms]) => {
    const u = ms.reduce((a, m) => a + m.u, 0) / ms.length;
    const band = `<g>${slowT('translate', perKey((s) => `${CX} ${f(yAt(s, u))}`))}<g>${slowT('scale', perKey((s) => f(Math.max(rAt(s, u), 4))))}`;
    return band + ms.map((m) => m.inner).join('') + '</g></g>';
  }).join('\n');
}

// ---- wheel specks (spin on the wheel head)
const wheelSpin = [], wheelStatic = [];
for (let i = 0; i < 26; i++) {
  const R = pick(40, WRX - 10), a0 = pick(0, Math.PI * 2), r = pick(0.6, 1.8);
  const fill = rnd() < 0.6 ? '#8d7c68' : '#b3a28b', op = f(pick(0.4, 0.8));
  wheelSpin.push(`<circle r="${f(r)}" fill="${fill}" opacity="${op}">${spinT('translate', (a) => `${f(CX + R * Math.sin(a + a0))} ${f(BASE + R * TW * Math.cos(a + a0))}`)}</circle>`);
  wheelStatic.push(`<circle cx="${f(CX + R * Math.sin(a0))}" cy="${f(BASE + R * TW * Math.cos(a0))}" r="${f(r)}" fill="${fill}" opacity="${op}"/>`);
}
// clay slurry smears on the wheel
for (let i = 0; i < 6; i++) {
  const R = pick(90, WRX - 18), a0 = pick(0, Math.PI * 2), w = pick(6, 14);
  const el = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="${f(w)}" ry="1.6" fill="#b59f84" opacity=".45" filter="url(#pc-blur1)"/>`;
  wheelSpin.push(`<g>${spinT('translate', (a) => `${f(R * Math.sin(a + a0))} ${f(R * TW * Math.cos(a + a0))}`)}${el(CX, BASE)}</g>`);
  wheelStatic.push(el(f(CX + R * Math.sin(a0)), f(BASE + R * TW * Math.cos(a0))));
}

// ---- tiny PNG encoder for the static grain textures
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
function grain(w, h, density, dark, light) {
  const px = Buffer.alloc(w * h * 4);
  const dot = (x, y, c, a) => {
    for (const [dx, dy, m] of [[0, 0, 1], [1, 0, .35], [0, 1, .35], [-1, 0, .25], [0, -1, .25]]) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const i = (Y * w + X) * 4; if (px[i + 3] >= a * m) continue;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = Math.round(a * m);
    }
  };
  for (let n = 0; n < w * h * density; n++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    rnd() < 0.72 ? dot(x, y, dark, pick(50, 150)) : dot(x, y, light, pick(60, 140));
  }
  return png(w, h, px);
}
const CLAY_TEX = { x: CX - 150, y: 185, w: 300, h: BASE + 30 - 185 };
const WHEEL_TEX = { x: CX - WRX - 2, y: BASE - WRY - 2, w: WRX * 2 + 4, h: WRY * 2 + BAND + 6 };
const clayTex = grain(CLAY_TEX.w, CLAY_TEX.h, 0.012, [96, 78, 60], [246, 236, 220]);
const wheelTex = grain(WHEEL_TEX.w, WHEEL_TEX.h, 0.02, [110, 96, 80], [240, 232, 220]);

// ---- throwing lines: fixed spiral grooves that follow the form
const lineOn = [[0, 0], [60, 0], [190, 1], [DUR, 1]];
const lines = [];
for (let u = 0.05; u < 0.97; u += pick(0.02, 0.06)) {
  const dark = rnd() < 0.6;
  lines.push(`<path d="${frontRing('lump', u)}" stroke="${dark ? '#6f5a45' : '#f4e9d8'}" stroke-opacity="${f(dark ? pick(0.04, 0.1) : pick(0.1, 0.22))}" stroke-width="${f(pick(0.6, 1.4))}">${slow('d', perKey((s) => frontRing(s, u)))}</path>`);
}

// ---- lump wobble while centring
const wob = [];
for (let t = 0; t <= DUR; t += t > 125 ? 5 : SPIN / 8) {
  const a = t < T_START ? 0 : t < 120 ? 3.2 * Math.exp(-(t - T_START) / 28) * Math.min(1, (t - T_START) / 2) : 0;
  wob.push([t, `${f(a * Math.sin((t / SPIN) * Math.PI * 2))} 0`]);
}
if (wob[wob.length - 1][0] < DUR) wob.push([DUR, '0 0']);
const wobble = `<animateTransform attributeName="transform" type="translate" dur="${DUR}s" repeatCount="indefinite" keyTimes="${wob.map(([t]) => (t / DUR).toFixed(6)).join(';')}" values="${wob.map(([, v]) => v).join(';')}"/>`;

// ---- timelines
const spinningVis = [[0, 0], [T_START, 1], [T_STOP, 0], [DUR, 0]];
const lumpStaticVis = [[0, 1], [T_START, 0], [DUR, 0]];
const finalStaticVis = [[0, 0], [T_STOP, 1], [DUR, 1]];
const clayIn = [[0, 0], [1.2, 0], [1.8, 1], [1466, 1], [1492, 0], [DUR, 0]];
const GRAV = '0.55 0 1 1';
const clayDrop = [[0, '0 -170'], [1.2, '0 -170'], [2.3, '0 0', GRAV], [1466, '0 0'], [1492, '0 -14'], [DUR, '0 -14']];
// squash on landing, a small rebound, then settle
const claySquash = [[0, '1 1'], [2.3, '1 1'], [2.45, '1.12 .82'], [2.75, '.95 1.07'], [3.1, '1.03 .97'], [3.5, '1 1'], [DUR, '1 1']];
const bumpsOn = [[0, 1], [15, 1], [75, 0], [DUR, 0]];
const dentsOn = [[0, 0], [150, 0], [230, 1], [DUR, 1]];
const glintOn = [[0, 0], [9, 0], [20, 1], [1260, 1], [1296, 0], [DUR, 0]];
const glazeRise = [[0, '0 160'], [1310, '0 160'], [1390, '0 0'], [DUR, '0 0']];

const gy = BASE - 104;
const glazeEdge = `M${CX - 130} ${gy + 10} C${CX - 95} ${gy + 4} ${CX - 60} ${gy - 2} ${CX - 25} ${gy + 4} S${CX + 40} ${gy + 20} ${CX + 70} ${gy + 10} S${CX + 110} ${gy - 12} ${CX + 130} ${gy - 14}`;
const glazeFill = `${glazeEdge} L${CX + 130} ${BASE + 40} L${CX - 130} ${BASE + 40} Z`;

const staticOf = (list, kinds) => list.filter((m) => kinds.includes(m.tag)).map((m) => m.html).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="80 168 440 380" width="440" height="380" role="img" aria-labelledby="pc-title">
  <title id="pc-title">Clay thrown on a wheel, from a rough lump to a glazed vase, over 25 minutes</title>
  <defs>
    <radialGradient id="pc-bg" cx="50%" cy="55%" r="75%"><stop offset="0" stop-color="#fbf9f5"/><stop offset=".6" stop-color="#f6f2eb"/><stop offset="1" stop-color="#ede7dd"/></radialGradient>
    <linearGradient id="pc-clay" x1="0" x2="1">
      <stop offset="0" stop-color="#a48c71"/><stop offset=".16" stop-color="#c3aa8e"/><stop offset=".36" stop-color="#d3bea3"/>
      <stop offset=".62" stop-color="#c7af93"/><stop offset=".86" stop-color="#b09679"/><stop offset="1" stop-color="#977f66"/>
    </linearGradient>
    <linearGradient id="pc-claytop" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff6e8" stop-opacity=".16"/><stop offset=".55" stop-color="#fff6e8" stop-opacity="0"/>
      <stop offset=".86" stop-color="#5b4632" stop-opacity="0"/><stop offset="1" stop-color="#5b4632" stop-opacity=".22"/>
    </linearGradient>
    <linearGradient id="pc-glaze" x1="0" x2="1">
      <stop offset="0" stop-color="#d8d0c3"/><stop offset=".2" stop-color="#ede7dc"/><stop offset=".38" stop-color="#f7f3ec"/>
      <stop offset=".7" stop-color="#e9e2d6"/><stop offset="1" stop-color="#cfc6b7"/>
    </linearGradient>
    <linearGradient id="pc-rim" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#dfccb2"/><stop offset=".5" stop-color="#d3bda1"/><stop offset="1" stop-color="#b99f82"/></linearGradient>
    <linearGradient id="pc-hole" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#5e4b39"/><stop offset=".45" stop-color="#7d6751"/><stop offset=".8" stop-color="#a38a6f"/><stop offset="1" stop-color="#b89f83"/></linearGradient>
    <radialGradient id="pc-bump" fx=".32" fy=".3" r=".5"><stop offset="0" stop-color="#ecdcc5" stop-opacity=".9"/><stop offset=".7" stop-color="#d2bb9f" stop-opacity=".25"/><stop offset="1" stop-color="#d2bb9f" stop-opacity="0"/></radialGradient>
    <radialGradient id="pc-bumpshade" r=".5"><stop offset="0" stop-color="#7e6851" stop-opacity="0"/><stop offset=".6" stop-color="#7e6851" stop-opacity=".1"/><stop offset="1" stop-color="#7e6851" stop-opacity="0"/></radialGradient>
    <linearGradient id="pc-dent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f5a45" stop-opacity=".55"/><stop offset=".5" stop-color="#8c7660" stop-opacity=".18"/><stop offset=".78" stop-color="#efe2cd" stop-opacity=".45"/><stop offset="1" stop-color="#efe2cd" stop-opacity="0"/></linearGradient>
    <radialGradient id="pc-wheeltop" cx=".42" cy=".4" r=".62"><stop offset="0" stop-color="#ddd3c5"/><stop offset=".7" stop-color="#d2c6b5"/><stop offset="1" stop-color="#c4b7a4"/></radialGradient>
    <linearGradient id="pc-wheelside" x1="0" x2="1"><stop offset="0" stop-color="#a99a86"/><stop offset=".3" stop-color="#c9bcaa"/><stop offset=".55" stop-color="#c2b4a1"/><stop offset="1" stop-color="#9c8d7a"/></linearGradient>
    <linearGradient id="pc-wheelsideV" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#4a3c2e" stop-opacity=".2"/></linearGradient>
    <path id="pc-body" d="${G.lump.body}">${slow('d', perKey((s) => G[s].body))}</path>
    <clipPath id="pc-clip"><use href="#pc-body"/></clipPath>
    <clipPath id="pc-wheelclip"><path d="M${CX - WRX} ${BASE} L${CX - WRX} ${BASE + BAND} A${WRX} ${WRY} 0 0 0 ${CX + WRX} ${BASE + BAND} L${CX + WRX} ${BASE} A${WRX} ${WRY} 0 0 0 ${CX - WRX} ${BASE} Z"/></clipPath>
    <filter id="pc-blur1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1"/></filter>
    <filter id="pc-blur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="pc-blur9" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>
    <!-- soft studio light from the upper left: the silhouette becomes a height map, so every shape gets rounded shading -->
    <filter id="pc-lit" filterUnits="userSpaceOnUse" x="${CX - 150}" y="180" width="300" height="${BASE + 40 - 180}" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="h"/>
      <feDiffuseLighting in="h" surfaceScale="7" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="218" elevation="48"/></feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1=".47" k2=".65" k3="0" k4="0" result="s"/>
      <feComposite in="s" in2="SourceAlpha" operator="in"/>
    </filter>
  </defs>

  <rect x="80" y="168" width="440" height="380" fill="url(#pc-bg)"/>
  <ellipse cx="${CX + 8}" cy="${BASE + BAND + 16}" rx="${WRX + 26}" ry="${WRY * 0.75}" fill="#8a7a66" opacity=".22" filter="url(#pc-blur9)"/>

  <!-- wheel head: speckled stone with turned grooves -->
  <path d="M${CX - WRX} ${BASE} L${CX - WRX} ${BASE + BAND} A${WRX} ${WRY} 0 0 0 ${CX + WRX} ${BASE + BAND} L${CX + WRX} ${BASE} Z" fill="url(#pc-wheelside)"/>
  <path d="M${CX - WRX} ${BASE} L${CX - WRX} ${BASE + BAND} A${WRX} ${WRY} 0 0 0 ${CX + WRX} ${BASE + BAND} L${CX + WRX} ${BASE} Z" fill="url(#pc-wheelsideV)"/>
  <ellipse cx="${CX}" cy="${BASE}" rx="${WRX}" ry="${WRY}" fill="url(#pc-wheeltop)"/>
  <g fill="none">
    ${Array.from({ length: 16 }, (_, i) => { const r = WRX - 6 - i * 9.5 - pick(0, 3); return `<ellipse cx="${CX}" cy="${BASE}" rx="${f(r)}" ry="${f(r * TW)}" stroke="#8f7f6b" stroke-opacity="${f(pick(0.12, 0.26))}" stroke-width="${f(pick(0.6, 1.1))}"/><ellipse cx="${CX}" cy="${BASE + 0.9}" rx="${f(r)}" ry="${f(r * TW)}" stroke="#f4ede2" stroke-opacity="${f(pick(0.25, 0.45))}" stroke-width=".8"/>`; }).join('\n    ')}
  </g>
  <path d="M${CX - WRX + 1} ${BASE + 1} A${WRX - 1} ${WRY - 1} 0 0 0 ${CX + WRX - 1} ${BASE + 1}" fill="none" stroke="#efe7da" stroke-width="2.2" stroke-opacity=".8"/>
  <image href="${wheelTex}" x="${WHEEL_TEX.x}" y="${WHEEL_TEX.y}" width="${WHEEL_TEX.w}" height="${WHEEL_TEX.h}" clip-path="url(#pc-wheelclip)" opacity=".8"/>
  <g clip-path="url(#pc-wheelclip)">
    <g opacity="1">${timeline('opacity', [[0, 1], [T_START, 0], [T_STOP, 1], [DUR, 1]], null, true)}${wheelStatic.join('')}</g>
    <g opacity="0">${timeline('opacity', spinningVis, null, true)}${wheelSpin.join('')}</g>
  </g>

  <!-- the clay -->
  <g opacity="0">${timeline('opacity', clayIn)}
    <g>${timeline(null, clayDrop, 'translate')}<g>${wobble}<g transform="translate(${CX} ${BASE})"><g>${timeline(null, claySquash, 'scale')}<g transform="translate(${-CX} ${-BASE})">
      <!-- cast shadow and contact shadow -->
      <g opacity="0">${timeline('opacity', [[0, 0], [1.9, 0], [2.3, 1], [DUR, 1]])}
      <ellipse cx="${CX + 18}" cy="${BASE + 8}" rx="${f(G.lump.r0 * 1.4)}" ry="${f(G.lump.r0 * 1.4 * TW)}" fill="#5f4e3c" opacity=".2" filter="url(#pc-blur9)">
        ${slow('rx', perKey((s) => f(G[s].r0 * 1.4)))}${slow('ry', perKey((s) => f(G[s].r0 * 1.4 * TW)))}
      </ellipse>
      <ellipse cx="${CX + 2}" cy="${BASE + 2}" rx="${f(G.lump.r0 * 1.06)}" ry="${f(G.lump.r0 * 1.06 * TW)}" fill="#4d3e2f" opacity=".32" filter="url(#pc-blur4)">
        ${slow('rx', perKey((s) => f(G[s].r0 * 1.06)))}${slow('ry', perKey((s) => f(G[s].r0 * 1.06 * TW)))}
      </ellipse>
      </g>

      <g filter="url(#pc-lit)">
        <use href="#pc-body" fill="url(#pc-clay)"/>
        <g clip-path="url(#pc-clip)">
          <use href="#pc-body" fill="url(#pc-claytop)"/>
          <image href="${clayTex}" x="${CLAY_TEX.x}" y="${CLAY_TEX.y}" width="${CLAY_TEX.w}" height="${CLAY_TEX.h}" opacity=".75"/>
          <g fill="none" opacity="0">${timeline('opacity', lineOn)}${lines.join('')}</g>
          <!-- marks turning with the wheel -->
          <g opacity="0">${timeline('opacity', spinningVis, null, true)}
            <g opacity="1">${timeline('opacity', bumpsOn)}${bands(marks.spin, ['bump'])}</g>
            ${bands(marks.spin, ['speck'])}
            <g opacity="0">${timeline('opacity', dentsOn)}${bands(marks.spin, ['dent'])}</g>
            <g opacity="0">${timeline('opacity', glintOn)}${bands(marks.spin, ['glint'])}</g>
          </g>
          <!-- the same marks, still, before the wheel starts and after it stops -->
          <g opacity="1">${timeline('opacity', lumpStaticVis, null, true)}${staticOf(marks.lumpStatic, ['bump', 'speck'])}</g>
          <g opacity="0">${timeline('opacity', finalStaticVis, null, true)}${staticOf(marks.finalStatic, ['speck', 'dent'])}</g>
          <!-- dipped glaze -->
          <g>${timeline(null, glazeRise, 'translate')}
            <path d="${glazeFill}" fill="url(#pc-glaze)"/>
            <image href="${clayTex}" x="${CLAY_TEX.x}" y="${CLAY_TEX.y + 160}" width="${CLAY_TEX.w}" height="${CLAY_TEX.h}" opacity=".22" clip-path="url(#pc-glazeclip)"/>
            <path d="${glazeEdge}" fill="none" stroke="#b9a791" stroke-opacity=".5" stroke-width="1.6" filter="url(#pc-blur1)"/>
          </g>
        </g>
      </g>

      <!-- rim and opening -->
      <path d="${G.lump.rim}" fill="url(#pc-rim)">${slow('d', perKey((s) => G[s].rim))}</path>
      <path d="${G.lump.hole}" fill="url(#pc-hole)">${slow('d', perKey((s) => G[s].hole))}</path>
    </g></g></g></g></g>
  </g>
</svg>`.replace('clip-path="url(#pc-glazeclip)"', '');

writeFileSync(`${OUT}/pottery-clay.svg`, svg + '\n');

const html = `<!doctype html>
<meta charset="utf-8">
<title>Pottery loop · clay</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f2eb;font:13.5px Inter,system-ui,sans-serif;color:#5f584f}
  main{width:min(620px,100vw - 32px);display:grid;gap:14px}
  svg{width:100%;height:auto;border-radius:24px}
  .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  input[type=range]{flex:1;accent-color:#54715d}
  button{font:500 13px Inter,system-ui;border:0;border-radius:999px;padding:9px 14px;min-height:40px;background:rgba(61,57,52,.07);color:#3d3934;cursor:pointer}
  button[aria-pressed=true]{background:#54715d;color:#fffdf9}
  #clock{font-variant-numeric:tabular-nums;min-width:92px;color:#3d3934;font-weight:600}
</style>
<main>
${svg}
<div class="row"><span id="clock">00:00</span><input id="scrub" type="range" min="0" max="${DUR}" step="0.1" value="0" aria-label="Scrub"></div>
<div class="row" id="speeds">
  <button data-s="1" aria-pressed="true">Real time</button>
  <button data-s="30">30×</button>
  <button data-s="120">120×</button>
  <button id="pause">Pause</button>
</div>
</main>
<script>
  const svg = document.querySelector('svg'), scrub = document.getElementById('scrub'), clock = document.getElementById('clock');
  let speed = 1, playing = true, t = 0, last = performance.now();
  svg.pauseAnimations();
  const q = new URLSearchParams(location.search);
  if (q.has('t')) { t = +q.get('t'); playing = false; }
  function show(){ svg.setCurrentTime(t); scrub.value = t; const m = Math.floor(t/60), s = Math.floor(t%60); clock.textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+' / 25:00'; }
  function tick(now){ if (playing) t = (t + (now-last)/1000*speed) % ${DUR}; last = now; show(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  scrub.oninput = () => { t = +scrub.value; };
  document.getElementById('speeds').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'pause') { playing = !playing; b.textContent = playing ? 'Pause' : 'Play'; return; }
    speed = +b.dataset.s; document.querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', x === b));
  };
</script>
`;
writeFileSync(`${OUT}/pottery-clay-preview.html`, html);
console.log('ok', Math.round(svg.length / 1024) + 'KB');
