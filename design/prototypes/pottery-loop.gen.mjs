// Generates design/prototypes/pottery-loop.svg (pure SMIL, 25-minute loop)
// and pottery-loop-preview.html (same SVG inline + scrubber).
import { writeFileSync } from 'node:fs';

const OUT = new URL('.', import.meta.url).pathname;
const DUR = 1500;             // 25 minutes, in seconds
const CX = 300, BASE = 432;   // pot axis and wheel-top centre
const WRX = 196, WRY = 36;    // wheel-top ellipse
const TILT = WRY / WRX;       // perspective ratio used for every ellipse
const N = 18;                 // resampled points per side (fixed so d-morphs line up)
const f = (n) => (Math.round(n * 100) / 100).toString();

// ---- stage profiles: (h, r) from the foot up. L and R differ only for the lump.
const same = (p) => ({ L: p, R: p });
const STAGES = {
  lump: {
    L: [[0, 50], [10, 57], [24, 57], [38, 48], [50, 36], [58, 22], [61, 10], [64, 0]],
    R: [[0, 53], [9, 58], [20, 60], [30, 55], [40, 44], [50, 32], [59, 14], [64, 0]],
  },
  dome: same([[0, 72], [14, 71], [30, 65], [44, 53], [55, 37], [62, 20], [65, 7], [66, 0]]),
  opened: same([[0, 62], [26, 63], [52, 60], [74, 51], [90, 39], [99, 27], [103, 17], [104, 13]]),
  low: same([[0, 68], [18, 69], [36, 68.5], [54, 68], [66, 67.5], [70, 67]]),
  tall: same([[0, 57], [34, 56.5], [68, 56], [100, 55.5], [124, 55], [134, 55]]),
  belly: same([[0, 54], [22, 70], [48, 81], [76, 78], [100, 65], [118, 55], [128, 53], [134, 56]]),
  rise: same([[0, 50], [30, 70], [64, 80], [98, 72], [126, 54], [148, 42], [160, 40], [168, 44]]),
  vase: same([[0, 47], [36, 74], [76, 85], [114, 70], [146, 44], [174, 28], [196, 25], [210, 30], [216, 38]]),
  final: same([[0, 42], [34, 68], [74, 80], [112, 64], [146, 40], [174, 25], [198, 23], [214, 29], [222, 38]]),
};

// Keyframes (seconds). Shape only changes while throwing; the glaze is its own layer.
const KEYS = [
  [0, 'lump'], [40, 'lump'], [150, 'dome'], [300, 'opened'], [450, 'low'], [630, 'tall'],
  [810, 'belly'], [990, 'rise'], [1140, 'vase'], [1290, 'final'], [DUR, 'final'],
];
const keyTimes = KEYS.map(([t]) => f(t / DUR)).join(';');
const EASE = '0.42 0 0.58 1';
const keySplines = KEYS.slice(1).map(() => EASE).join(';');

// ---- geometry helpers
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
function resample(ctrl) {
  const pts = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const dense = [];
  for (let i = 1; i < pts.length - 2; i++) for (let s = 0; s < 60; s++) dense.push(catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], s / 60));
  dense.push(ctrl[ctrl.length - 1]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = acc[acc.length - 1], out = [];
  for (let k = 0; k < N; k++) {
    const target = (k / (N - 1)) * total;
    let j = acc.findIndex((a) => a >= target); if (j < 1) j = 1;
    const u = (target - acc[j - 1]) / (acc[j] - acc[j - 1] || 1);
    out.push([dense[j - 1][0] + (dense[j][0] - dense[j - 1][0]) * u, dense[j - 1][1] + (dense[j][1] - dense[j - 1][1]) * u]);
  }
  return out;
}
// smooth open curve through screen points as cubic segments (C commands only)
function curveThrough(P) {
  let d = '';
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
const K = 0.5523; // cubic ellipse constant
function ellipse(cx, cy, rx, ry) {
  return `M${f(cx - rx)} ${f(cy)} C${f(cx - rx)} ${f(cy - ry * K)} ${f(cx - rx * K)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)}` +
    ` C${f(cx + rx * K)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - ry * K)} ${f(cx + rx)} ${f(cy)}` +
    ` C${f(cx + rx)} ${f(cy + ry * K)} ${f(cx + rx * K)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}` +
    ` C${f(cx - rx * K)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ry * K)} ${f(cx - rx)} ${f(cy)} Z`;
}

function stageGeom(name) {
  const s = STAGES[name];
  const L = resample(s.L), R = resample(s.R);
  const left = L.map(([h, r]) => [CX - r, BASE - h]);
  const right = R.map(([h, r]) => [CX + r, BASE - h]).reverse();
  const topL = left[N - 1], topR = right[0];
  const rimR = (topR[0] - topL[0]) / 2, rimY = (topL[1] + topR[1]) / 2, rimCx = (topL[0] + topR[0]) / 2;
  const ry = rimR * TILT * 1.12;
  const r0L = L[0][1], r0R = R[0][1], sag = ((r0L + r0R) / 2) * TILT * 1.333;
  // silhouette: up the left side, over the back of the rim, down the right side, round the front of the foot
  const body = `M${f(left[0][0])} ${f(left[0][1])}` + curveThrough(left) +
    ` C${f(topL[0])} ${f(topL[1] - ry * 1.333)} ${f(topR[0])} ${f(topR[1] - ry * 1.333)} ${f(topR[0])} ${f(topR[1])}` +
    curveThrough(right) +
    ` C${f(CX + r0R)} ${f(BASE + sag)} ${f(CX - r0L)} ${f(BASE + sag)} ${f(CX - r0L)} ${f(BASE)} Z`;
  const wall = Math.min(7.5, rimR * 0.45);
  const rim = ellipse(rimCx, rimY, rimR, ry);
  const hole = ellipse(rimCx, rimY + wall * 0.08, Math.max(rimR - wall, 0), Math.max(ry - wall * TILT * 1.1, 0));
  const r0 = (r0L + r0R) / 2;
  const prof = L.map(([h, r], i) => [(h + R[i][0]) / 2, (r + R[i][1]) / 2]);
  return { body, rim, hole, r0, rimR, prof, H: prof[N - 1][0] };
}
const G = Object.fromEntries(Object.keys(STAGES).map((k) => [k, stageGeom(k)]));
const vals = (key) => KEYS.map(([, s]) => G[s][key]).join(';');
const anim = (attr, values, extra = '') =>
  `<animate attributeName="${attr}" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${keySplines}" values="${values}" ${extra}/>`;

// generic eased timeline: [[seconds, value], ...]
function timeline(attr, pts, type) {
  const kt = pts.map(([t]) => f(t / DUR)).join(';');
  const v = pts.map(([, x]) => x).join(';');
  const ks = pts.slice(1).map(() => EASE).join(';');
  const tag = type ? `animateTransform attributeName="transform" type="${type}"` : `animate attributeName="${attr}"`;
  return `<${tag} dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keyTimes="${kt}" keySplines="${ks}" values="${v}"/>`;
}

// ---- layers
const INK = '#3d3934';
const throwingOn = [[0, 0], [30, 0], [44, 1], [1270, 1], [1300, 0], [DUR, 0]];
const clayIn = [[0, 0], [18, 0], [28, 1], [1464, 1], [1494, 0], [DUR, 0]];
const clayDrop = [[0, '0 -150'], [18, '0 -150'], [30, '0 0'], [1464, '0 0'], [1494, '0 -14'], [DUR, '0 -14']];
const glazeRise = [[0, '0 150'], [1300, '0 150'], [1385, '0 0'], [DUR, '0 0']];

// deterministic randomness so the file is stable between builds
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a, b) => a + (b - a) * rnd();

// radius of a stage at normalised height u (0 = foot, 1 = rim)
function rAt(stage, u) {
  const { prof, H } = G[stage], h = u * H;
  for (let i = 1; i < prof.length; i++) if (prof[i][0] >= h) {
    const [h0, r0] = prof[i - 1], [h1, r1] = prof[i];
    return r0 + (r1 - r0) * ((h - h0) / (h1 - h0 || 1));
  }
  return prof[prof.length - 1][1];
}
// front half of the ring around the pot at height u, drawn left -> right past the viewer
function frontRing(stage, u, dr = 0, dy = 0) {
  const r = Math.max(rAt(stage, u) + dr, 0.01), y = BASE - u * G[stage].H + dy, ry = r * TILT * 1.12;
  return `M${f(CX - r)} ${f(y)} C${f(CX - r)} ${f(y + ry * K)} ${f(CX - r * K)} ${f(y + ry)} ${f(CX)} ${f(y + ry)}` +
    ` C${f(CX + r * K)} ${f(y + ry)} ${f(CX + r)} ${f(y + ry * K)} ${f(CX + r)} ${f(y)}`;
}
const ringVals = (u, dr, dy) => KEYS.map(([, s]) => frontRing(s, u, dr, dy)).join(';');
// a dashed ring whose dashes travel round: the path bends away at the edges, so marks
// race across the middle and slow as they turn out of view, like a real turning surface
const SPIN = 2.4; // seconds per turn
function travellingRing(u, { dr = 0, dy = 0, dash, width, color, opacity, speed = 1 }) {
  const len = dash.split(' ').reduce((a, b) => a + +b, 0);
  return `<path d="${frontRing('lump', u, dr, dy)}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-dasharray="${dash}" stroke-dashoffset="${f(pick(0, len))}">` +
    anim('d', ringVals(u, dr, dy)) +
    `<animate attributeName="stroke-dashoffset" by="-${f(len)}" dur="${f(SPIN * len / 260 / speed)}s" repeatCount="indefinite" additive="sum"/></path>`;
}
const dashes = (n, mk) => Array.from({ length: n }, mk).flat().map(f).join(' ');

// 1. imperfections on the clay: grog specks, finger drags, little lumps
const marks = [];
for (let u = 0.05; u < 0.97; u += 0.045) {
  marks.push(travellingRing(u, { dash: dashes(3, () => [pick(0, 1.2), pick(40, 110)]), width: pick(1.6, 2.6), color: '#8a7c66', opacity: f(pick(0.28, 0.45)) }));
  if (rnd() < 0.55) marks.push(travellingRing(u + 0.012, { dash: dashes(2, () => [pick(6, 20), pick(90, 190)]), width: pick(0.9, 1.4), color: INK, opacity: f(pick(0.1, 0.18)) }));
  if (rnd() < 0.35) marks.push(travellingRing(u - 0.01, { dash: dashes(2, () => [pick(4, 12), pick(120, 220)]), width: pick(1, 1.6), color: '#fffdf9', opacity: f(pick(0.5, 0.75)) }));
}
// 2. throwing ridges: fixed spiral grooves the fingers leave (they don't move, they catch light)
const ridgeOn = [[0, 0], [330, 0], [450, 1], [DUR, 1]];
const ridges = [];
for (let u = 0.12; u < 0.95; u += pick(0.1, 0.17)) {
  ridges.push(`<path d="${frontRing('lump', u)}">${anim('d', ringVals(u, 0, 0))}</path>`);
  ridges.push(`<path d="${frontRing('lump', u, 0, 1.6)}" stroke="#fffdf9" stroke-opacity=".3">${anim('d', ringVals(u, 0, 1.6))}</path>`);
}
// 3. motion lines wrapping the pot
const motion = [0.22, 0.5, 0.78].map((u, i) => travellingRing(u, { dr: 14 + i * 2, dy: 4, dash: `${64 - i * 10} ${110 + i * 30} ${30 - i * 4} ${150 + i * 20}`, width: 1.7, color: INK, opacity: '.32', speed: 1.1 }));
const baseMotion = [26, 44].map((dr, i) => travellingRing(0, { dr, dy: 0, dash: `${70 - i * 16} ${130 + i * 50} ${26} ${180}`, width: 1.5, color: INK, opacity: '.24', speed: 1.1 }));

// 4. slip specks riding the wheel head
const specks = Array.from({ length: 9 }, (_, i) => {
  const r = pick(90, 180), t0 = pick(0, SPIN);
  return `<circle r="${f(pick(1.4, 2.8))}" fill="#b9ab94" opacity="${f(pick(0.5, 0.8))}"><animateMotion path="${ellipse(CX, BASE, r, r * TILT)}" keyPoints="1;0" keyTimes="0;1" calcMode="linear" dur="${SPIN}s" begin="-${f(t0)}s" repeatCount="indefinite"/></circle>`;
});

// 5. centring wobble: the off-centre lump shimmies, settling as it is coned and centred
const wob = [];
for (let t = 0; t <= DUR; t += t < 26 || t > 180 ? 2 : 0.1375) {
  const a = t < 30 ? 0 : t < 175 ? 3.2 * Math.exp(-(t - 30) / 55) * Math.min(1, (t - 30) / 4) : 0;
  wob.push([t, `${f(a * Math.sin((t / 1.1) * Math.PI * 2))} 0`]);
}
if (wob[wob.length - 1][0] !== DUR) wob.push([DUR, '0 0']);
const wobble = `<animateTransform attributeName="transform" type="translate" dur="${DUR}s" repeatCount="indefinite" keyTimes="${wob.map(([t]) => (t / DUR).toFixed(6)).join(';')}" values="${wob.map(([, v]) => v).join(';')}"/>`;

// the glaze edge: a soft dipped wave
const gy = BASE - 96;
const glazeEdge = `M${CX - 120} ${gy + 6} C${CX - 90} ${gy - 4} ${CX - 60} ${gy - 8} ${CX - 25} ${gy - 2} S${CX + 40} ${gy + 12} ${CX + 70} ${gy + 4} S${CX + 105} ${gy - 8} ${CX + 120} ${gy - 6}`;
const glazeFill = `${glazeEdge} L${CX + 120} ${BASE + 40} L${CX - 120} ${BASE + 40} Z`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 160 520 400" width="520" height="400" role="img" aria-labelledby="pt-title">
  <title id="pt-title">A pot being thrown on a wheel, from lump to glazed vase, over 25 minutes</title>
  <defs>
    <radialGradient id="pt-bg" cx="50%" cy="58%" r="75%">
      <stop offset="0" stop-color="#fbf8f3"/><stop offset=".55" stop-color="#f6f2eb"/><stop offset="1" stop-color="#ece5da"/>
    </radialGradient>
    <linearGradient id="pt-clay" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#e2d7c1"/><stop offset=".22" stop-color="#eee5d2"/><stop offset=".4" stop-color="#f3ecdc"/>
      <stop offset=".7" stop-color="#ebe1cd"/><stop offset="1" stop-color="#d8ccb4"/>
    </linearGradient>
    <linearGradient id="pt-glaze" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#f1ede4"/><stop offset=".3" stop-color="#fdfbf6"/><stop offset=".45" stop-color="#fffefb"/>
      <stop offset=".75" stop-color="#f7f3eb"/><stop offset="1" stop-color="#e9e3d8"/>
    </linearGradient>
    <linearGradient id="pt-hole" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#b9ab94"/><stop offset="1" stop-color="#d9ccb6"/>
    </linearGradient>
    <linearGradient id="pt-rimtop" x1="0" x2="1">
      <stop offset="0" stop-color="#ece3cf"/><stop offset=".45" stop-color="#f6f0e3"/><stop offset="1" stop-color="#e3d8c2"/>
    </linearGradient>
    <linearGradient id="pt-wheeltop" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ece6db"/><stop offset=".5" stop-color="#e6dfd2"/><stop offset="1" stop-color="#ddd5c6"/>
    </linearGradient>
    <linearGradient id="pt-wheelside" x1="0" x2="1">
      <stop offset="0" stop-color="#d3c9b8"/><stop offset=".35" stop-color="#ddd4c4"/><stop offset="1" stop-color="#cbc0ad"/>
    </linearGradient>
    <path id="pt-body" d="${G.lump.body}">${anim('d', vals('body'))}</path>
    <clipPath id="pt-clip"><use href="#pt-body"/></clipPath>
    <filter id="pt-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4" result="fine"/>
      <feTurbulence type="fractalNoise" baseFrequency=".018 .05" numOctaves="3" seed="9" result="blot"/>
      <feColorMatrix in="fine" type="matrix" values="0 0 0 0 .36  0 0 0 0 .31  0 0 0 0 .25  0 0 0 -2.1 1.25" result="speck"/>
      <feColorMatrix in="blot" type="matrix" values="0 0 0 0 .55  0 0 0 0 .48  0 0 0 0 .38  0 0 0 -1.6 .95" result="mottle"/>
      <feMerge><feMergeNode in="mottle"/><feMergeNode in="speck"/></feMerge>
    </filter>
    <filter id="pt-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <rect x="40" y="160" width="520" height="400" fill="url(#pt-bg)"/>

  <!-- floor shadow -->
  <ellipse cx="${CX}" cy="${BASE + 58}" rx="${WRX + 44}" ry="${WRY * 0.8}" fill="#e6ded1" filter="url(#pt-soft)"/>

  <!-- wheel head -->
  <path d="M${CX - WRX} ${BASE} L${CX - WRX} ${BASE + 40} A${WRX} ${WRY} 0 0 0 ${CX + WRX} ${BASE + 40} L${CX + WRX} ${BASE} Z" fill="url(#pt-wheelside)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <ellipse cx="${CX}" cy="${BASE}" rx="${WRX}" ry="${WRY}" fill="url(#pt-wheeltop)" stroke="${INK}" stroke-width="2.2"/>
  <clipPath id="pt-band"><path d="M${CX - WRX} ${BASE} L${CX - WRX} ${BASE + 40} A${WRX} ${WRY} 0 0 0 ${CX + WRX} ${BASE + 40} L${CX + WRX} ${BASE} A${WRX} ${WRY} 0 0 1 ${CX - WRX} ${BASE} Z"/></clipPath>
  <g opacity="0">${timeline('opacity', throwingOn)}
    <!-- the band's worn stripes slide past -->
    <path clip-path="url(#pt-band)" d="M${CX - WRX} ${BASE + 20} A${WRX} ${WRY} 0 0 0 ${CX + WRX} ${BASE + 20}" fill="none" stroke="${INK}" stroke-opacity=".07" stroke-width="44" stroke-dasharray="3 31 1.5 44 5 27">
      <animate attributeName="stroke-dashoffset" by="-111" dur="${f(SPIN * 111 / 420)}s" repeatCount="indefinite" additive="sum"/>
    </path>
    ${specks.join('\n    ')}
  </g>
  <g fill="none" stroke="${INK}" stroke-linecap="round">
    <g opacity="0">${timeline('opacity', throwingOn)}
      <ellipse cx="${CX}" cy="${BASE}" rx="${WRX - 26}" ry="${(WRY - 5)}" stroke-opacity=".12" stroke-width="1.4" stroke-dasharray="26 46">
        <animate attributeName="stroke-dashoffset" from="0" to="-72" dur="2.2s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="${CX}" cy="${BASE}" rx="${WRX - 60}" ry="${WRY - 11}" stroke-opacity=".08" stroke-width="1.2" stroke-dasharray="12 38">
        <animate attributeName="stroke-dashoffset" from="0" to="-50" dur="1.6s" repeatCount="indefinite"/>
      </ellipse>
    </g>
  </g>

  <!-- the clay -->
  <g opacity="0">${timeline('opacity', clayIn)}
    <g>${timeline(null, clayDrop, 'translate')}<g>${wobble}
      <!-- contact shadow on the wheel -->
      <ellipse cx="${CX}" cy="${BASE + 3}" rx="${f(G.lump.r0 + 10)}" ry="${f((G.lump.r0 + 10) * TILT)}" fill="${INK}" opacity=".07" filter="url(#pt-soft)">
        ${anim('rx', KEYS.map(([, s]) => f(G[s].r0 + 10)).join(';'))}
        ${anim('ry', KEYS.map(([, s]) => f((G[s].r0 + 10) * TILT)).join(';'))}
      </ellipse>

      <use href="#pt-body" fill="url(#pt-clay)"/>

      <g clip-path="url(#pt-clip)">
        <!-- clay grain and mottling -->
        <rect x="${CX - 110}" y="${BASE - 250}" width="220" height="280" filter="url(#pt-grain)" opacity=".38" style="mix-blend-mode:multiply"/>
        <!-- throwing ridges -->
        <g fill="none" stroke="${INK}" stroke-opacity=".045" stroke-width="1.1" opacity="0">${timeline('opacity', ridgeOn)}
          ${ridges.join('\n          ')}
        </g>
        <!-- specks, drags and wet glints turning with the wheel -->
        <g fill="none" stroke-linecap="round" opacity="0">${timeline('opacity', throwingOn)}
          ${marks.join('\n          ')}
        </g>
        <!-- dipped glaze -->
        <g>${timeline(null, glazeRise, 'translate')}
          <path d="${glazeFill}" fill="url(#pt-glaze)"/>
          <path d="${glazeEdge}" fill="none" stroke="#d8ceba" stroke-width="1.4" stroke-linecap="round"/>
        </g>
        <!-- wet sheen -->
        <rect x="${CX - 42}" y="${BASE - 260}" width="16" height="290" fill="#fffdf9" opacity=".18" filter="url(#pt-soft)"/>
      </g>

      <use href="#pt-body" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>

      <!-- rim and opening -->
      <path d="${G.lump.rim}" fill="url(#pt-rimtop)" stroke="${INK}" stroke-width="2" stroke-linejoin="round">${anim('d', vals('rim'))}${anim('stroke-width', KEYS.map(([, s]) => (G[s].rimR > 1 ? 2 : 0)).join(';'))}</path>
      <path d="${G.lump.hole}" fill="url(#pt-hole)" stroke="${INK}" stroke-opacity=".35" stroke-width="1.2">${anim('d', vals('hole'))}</path>
      </g>
      <!-- motion lines -->
      <g fill="none" stroke-linecap="round" opacity="0">${timeline('opacity', throwingOn)}
        ${[...baseMotion, ...motion].join('\n        ')}
      </g>
    </g>
  </g>
</svg>`;

writeFileSync(`${OUT}/pottery-loop.svg`, svg + '\n');

const html = `<!doctype html>
<meta charset="utf-8">
<title>Pottery loop</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f2eb;font:13.5px Inter,system-ui,sans-serif;color:#5f584f}
  main{width:min(560px,100vw - 32px);display:grid;gap:14px}
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
writeFileSync(`${OUT}/pottery-loop-preview.html`, html);
console.log('ok', svg.length);
