import type { GlazeKey, Recipe, ShapeKey } from "@/lib/pottery/recipe";
import { SCENE_MARKUP, SCENE_VIEWBOX } from "./markup";

/**
 * The pottery scene, from Ashna's pottery-wheel prototype.
 * Everything the pot looks like is a pure function of progress, shape and glaze, so pausing,
 * resuming or backgrounding the app is safe. Timeline (fractions of the session's focus time):
 *   0 – throwEnd   throw on the wheel (centre, open, pull, shape)
 *   → spinStop     the wheel slows to a stop
 *   → attachEnd    handle / spout / lid go on, the clay dries paler
 *   → glazeEnd     dipped in glaze (the dip line travels down)
 *   → fireEnd      kiln firing: chalky raw glaze turns glossy
 *   → 1            cools, then it's done
 */

type ShapeDef = {
  label: string;
  H: number;
  r: [number, number, number, number];
  bp: number;
  np: number;
  handle?: { t1: number; t2: number; reach: number };
  spout?: boolean;
  lid?: boolean;
};

// r = radius at [base, belly, neck, rim]; bp / np = belly / neck heights (0..1 of H)
export const SHAPES: Record<ShapeKey, ShapeDef> = {
  vase: { label: "Vase", H: 256, r: [64, 110, 50, 64], bp: 0.38, np: 0.82 },
  bowl: { label: "Bowl", H: 138, r: [58, 112, 142, 150], bp: 0.35, np: 0.8 },
  cup: { label: "Cup", H: 180, r: [68, 76, 79, 88], bp: 0.3, np: 0.8 },
  mug: { label: "Mug", H: 176, r: [72, 78, 78, 80], bp: 0.3, np: 0.8, handle: { t1: 0.8, t2: 0.28, reach: 40 } },
  jug: { label: "Jug", H: 250, r: [70, 106, 60, 70], bp: 0.36, np: 0.78, handle: { t1: 0.84, t2: 0.42, reach: 46 }, spout: true },
  moonjar: { label: "Moon jar", H: 236, r: [54, 122, 58, 62], bp: 0.48, np: 0.88 },
  budvase: { label: "Bud vase", H: 212, r: [56, 80, 22, 30], bp: 0.3, np: 0.8 },
  planter: { label: "Planter", H: 168, r: [92, 98, 108, 120], bp: 0.35, np: 0.82 },
  plate: { label: "Plate", H: 40, r: [96, 132, 158, 166], bp: 0.3, np: 0.72 },
  jar: { label: "Lidded jar", H: 188, r: [70, 100, 84, 72], bp: 0.45, np: 0.9, lid: true },
};

type GlazeDef = { label: string; c: string; rim: string; dip: number; gloss: number; speckle?: string; drips?: boolean };

// dip: how far down the glaze goes (0 = all the way, .35 = leaves the bottom third bare)
export const GLAZES: Record<GlazeKey, GlazeDef> = {
  celadon: { label: "Celadon", c: "#9dbba6", rim: "#cfe0d3", dip: -0.06, gloss: 0.9 },
  oatmeal: { label: "Oatmeal speckle", c: "#e4d8bf", rim: "#f4eee2", dip: -0.06, gloss: 0.35, speckle: "#7a5a44" },
  honey: { label: "Honey amber", c: "#c8893c", rim: "#ebbd78", dip: 0.34, gloss: 0.95, drips: true },
  dusk: { label: "Dusk blue", c: "#6c8ca4", rim: "#b3c7d4", dip: 0.28, gloss: 0.9, drips: true },
  milk: { label: "Milk white", c: "#f1ece3", rim: "#ffffff", dip: 0.16, gloss: 0.6 },
  tenmoku: { label: "Tenmoku", c: "#4c3125", rim: "#b0663b", dip: 0.3, gloss: 1, drips: true },
};

export type SceneOptions = {
  phases?: Partial<{ throwEnd: number; spinStop: number; attachEnd: number; glazeEnd: number; fireEnd: number }>;
  /** false draws the pot alone, for a still on the shelf. */
  room?: boolean;
  /** false draws one frame instead of running (stills). */
  animate?: boolean;
};

const CX = 290,
  HEAD_Y = 566,
  K = 0.24;

/** Where the finished pot sits in the scene's coordinates, for cropping a still. */
export function potBounds(recipe: Recipe): { x: number; y: number; width: number; height: number } {
  const S = SHAPES[recipe.shape];
  const H = S.H * recipe.hScale;
  const maxR = Math.max(...S.r) * recipe.rScale + (S.handle ? S.handle.reach + 10 : 0) + (S.spout ? 24 : 0);
  const pad = 14;
  const top = HEAD_Y - H - (S.lid ? 46 : 0) - pad;
  return { x: CX - maxR - pad, y: top, width: (maxR + pad) * 2, height: HEAD_Y + pad - top };
}

let uidSeq = 0;

export function createPotteryScene(svg: SVGSVGElement, recipe: Recipe, opts: SceneOptions = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const P = { throwEnd: 0.66, spinStop: 0.69, attachEnd: 0.76, glazeEnd: 0.88, fireEnd: 0.96, ...opts.phases };
  const animate = opts.animate !== false;
  const withRoom = opts.room !== false;

  // Ids are prefixed per scene, so several pots can share a page without stealing each other's gradients.
  const uid = `ps${uidSeq++}`;
  svg.setAttribute("viewBox", SCENE_VIEWBOX);
  svg.innerHTML = SCENE_MARKUP.replace(/id="([\w-]+)"/g, `id="${uid}-$1"`).replace(/url\(#([\w-]+)\)/g, `url(#${uid}-$1)`);

  const $ = (id: string) => svg.querySelector(`#${uid}-${id}`) as SVGElement;
  const set = (el: Element, attrs: Record<string, string | number>) => {
    for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const f = (n: number) => n.toFixed(1);
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a: string, b: string, t: number) =>
    "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
  const shade = (c: string, a: number) => (a > 0 ? mix(c, "#ffffff", a) : mix(c, "#000000", -a));

  if (!withRoom) {
    for (const id of ["studio", "wheel", "potShadow", "glow", "kilnGlow", "kilnTint", "sparkles", "drops", "rib"]) {
      const el = $(id);
      if (el) el.setAttribute("display", "none");
    }
  }

  const WET = ["#93563e", "#bd7d5e", "#d9a083", "#c38263", "#8b5039"];
  const DRY = ["#c49276", "#ddb399", "#efd2bf", "#dfb9a0", "#bb8a70"];
  const HOLE_WET = ["#5a3424", "#7e4b36"];
  const HOLE_DRY = ["#a2735b", "#c0937a"];

  type Frame = { p: number; H: number; r: number[]; bp: number; np: number; open: number; dome: number; Rb: number };
  const COMMON: Frame[] = [
    { p: 0, H: 158, r: [90, 96, 80, 40], bp: 0.4, np: 0.75, open: 0, dome: 1, Rb: 98 }, // smooth ball of clay
    { p: 0.14, H: 150, r: [92, 94, 84, 60], bp: 0.4, np: 0.75, open: 0, dome: 0.85, Rb: 90 }, // centred, still rounded
    { p: 0.28, H: 92, r: [100, 102, 99, 93], bp: 0.4, np: 0.75, open: 0.9, dome: 0, Rb: 90 },
    { p: 0.48, H: 165, r: [86, 87, 86, 84], bp: 0.4, np: 0.75, open: 1, dome: 0, Rb: 90 },
  ];

  let current: Recipe = recipe;
  let progress = 0,
    angle = 0,
    ringPhase = 0,
    last = 0,
    clock = 0,
    running = true,
    // 1 = full speed. Set from the session: 0 on breaks, slower as pals step away.
    motion = 1;

  /** The recipe's shape, with its own height and width. */
  function tweaked(): ShapeDef & { dip: number } {
    const S = SHAPES[current.shape];
    return {
      ...S,
      H: S.H * current.hScale,
      r: S.r.map((v) => v * current.rScale) as [number, number, number, number],
      dip: clamp(GLAZES[current.glaze].dip + current.dipShift, -0.1, 0.5),
    };
  }

  function keyframes(): Frame[] {
    const F = tweaked();
    const mid = (k: number, a: number): Frame => ({
      p: k,
      H: lerp(165, F.H, a),
      r: F.r.map((v) => lerp(86, v, a)),
      bp: F.bp,
      np: F.np,
      open: 1,
      dome: 0,
      Rb: 90,
    });
    return COMMON.concat([mid(0.68, 0.45), mid(0.86, 0.92), { p: 1, H: F.H, r: F.r, bp: F.bp, np: F.np, open: 1, dome: 0, Rb: 90 }]);
  }

  function stateAt(tp: number) {
    const ks = keyframes();
    let i = 0;
    while (i < ks.length - 2 && tp > ks[i + 1].p) i++;
    const a = ks[i],
      b = ks[i + 1],
      u = smooth(clamp((tp - a.p) / (b.p - a.p)));
    return {
      H: lerp(a.H, b.H, u),
      r: a.r.map((v, j) => lerp(v, b.r[j], u)),
      bp: lerp(a.bp, b.bp, u),
      np: lerp(a.np, b.np, u),
      open: lerp(a.open, b.open, u),
      dome: lerp(a.dome, b.dome, u),
      Rb: lerp(a.Rb, b.Rb, u),
    };
  }

  type State = ReturnType<typeof stateAt>;
  function radiusAt(s: State, t: number): number {
    t = clamp(t);
    const T = [0, s.bp, s.np, 1];
    let j = 0;
    while (j < 2 && t > T[j + 1]) j++;
    const u = clamp((t - T[j]) / (T[j + 1] - T[j]));
    const prof = lerp(s.r[j], s.r[j + 1], (1 - Math.cos(Math.PI * u)) / 2);
    if (!s.dome) return prof;
    const ball = s.Rb * Math.sqrt(Math.max(0, 1 - ((t - 0.42) / 0.58) ** 2)); // a sphere slightly pressed onto the wheel
    return lerp(prof, ball, s.dome);
  }

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const marks = Array.from({ length: 18 }, () => ({ t: 0.08 + rnd() * 0.84, th: rnd() * Math.PI * 2, len: 6 + rnd() * 10, light: rnd() > 0.5 }));
  const speckles = Array.from({ length: 70 }, () => ({ t: 0.04 + rnd() * 0.92, th: rnd() * Math.PI * 2 }));
  const DRIPS: [number, number][] = [
    [-0.62, 13],
    [-0.24, 22],
    [0.12, 11],
    [0.42, 19],
    [0.72, 9],
  ];
  const headSpecks = Array.from({ length: 10 }, () => {
    const el = document.createElementNS(NS, "ellipse");
    const s = { R: 40 + rnd() * 100, th: rnd() * Math.PI * 2, el };
    const z = 1.6 + rnd() * 2.4;
    set(el, { rx: z, ry: z * 0.55 });
    $("headSpecks")?.appendChild(el);
    return s;
  });
  const drops = Array.from({ length: 8 }, () => {
    const el = document.createElementNS(NS, "circle");
    set(el, { r: 2.6, opacity: 0 });
    $("drops")?.appendChild(el);
    return { el, alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 };
  });
  const sparkles = ([[-1.25, 0.95], [1.3, 0.7], [-0.9, 0.25], [1.1, 0.15], [0, 1.22]] as [number, number][]).map(([fx, fy], i) => {
    const el = document.createElementNS(NS, "path");
    el.setAttribute("d", "M0 -9C1 -2 2 -1 9 0C2 1 1 2 0 9C-1 2 -2 1 -9 0C-2 -1 -1 -2 0 -9Z");
    $("sparkles")?.appendChild(el);
    return { el, fx, fy, ph: i * 1.3 };
  });

  const arcFront = (cx: number, y: number, r: number) => `M${f(cx - r)} ${f(y)}A${f(r)} ${f(r * K)} 0 0 0 ${f(cx + r)} ${f(y)}`;
  const setStops = (ids: string[], cols: string[]) => ids.forEach((id, i) => $(id)?.setAttribute("stop-color", cols[i]));

  function draw(dt: number) {
    const p = progress,
      S = tweaked(),
      G = GLAZES[current.glaze];
    const tp = clamp(p / P.throwEnd),
      s = stateAt(tp);
    const slowFrom = P.throwEnd - 0.05;
    const spin = p < slowFrom ? 1 : 1 - smooth(clamp((p - slowFrom) / (P.spinStop - slowFrom)));
    angle += dt * spin * motion * (reduce ? 1.4 : 5);
    const ribOn = clamp((tp - 0.28) / 0.04) * clamp((0.95 - tp) / 0.04);
    ringPhase += dt * ribOn * motion * (reduce ? 0.05 : 0.25);

    const attachT = clamp((p - P.spinStop) / (P.attachEnd - P.spinStop));
    const grow = smooth(clamp(attachT / 0.7)); // handle / spout / lid
    const dry = smooth(attachT); // wet clay -> pale leather-hard
    const glazeT = clamp((p - P.attachEnd) / (P.glazeEnd - P.attachEnd));
    const fireT = clamp((p - P.glazeEnd) / (P.fireEnd - P.glazeEnd));
    const done = clamp((p - P.fireEnd) / (1 - P.fireEnd));

    setStops(["c0", "c1", "c2", "c3", "c4"], WET.map((c, i) => mix(c, DRY[i], dry)));
    setStops(["h0", "h1"], HOLE_WET.map((c, i) => mix(c, HOLE_DRY[i], dry)));

    const wobble = (1 - clamp(tp / 0.14)) * 4;
    const cx = CX + wobble * Math.sin(angle);
    const y = (t: number) => HEAD_Y - t * s.H;
    const N = 32,
      pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push([t, radiusAt(s, t)]);
    }
    const r0 = pts[0][1],
      rT = pts[N][1],
      topY = y(1);

    let d = `M${f(cx - r0)} ${HEAD_Y}`;
    for (let i = 1; i <= N; i++) d += `L${f(cx - pts[i][1])} ${f(y(pts[i][0]))}`;
    d += `A${f(rT)} ${f(rT * K)} 0 0 1 ${f(cx + rT)} ${f(topY)}`;
    for (let i = N - 1; i >= 0; i--) d += `L${f(cx + pts[i][1])} ${f(y(pts[i][0]))}`;
    d += `A${f(r0)} ${f(r0 * K)} 0 0 1 ${f(cx - r0)} ${HEAD_Y}Z`;
    $("potBody").setAttribute("d", d);
    $("gBody").setAttribute("d", d);
    set($("potShadow"), { cx, cy: HEAD_Y + 3, rx: r0 + 8, ry: (r0 + 8) * K });

    // throwing rings
    const M = Math.max(4, Math.floor(s.H / 11));
    let dk = "",
      lt = "";
    for (let k = 0; k < M; k++) {
      const t = ((k + ringPhase) % M) / M;
      if (t < 0.04 || t > 0.96) continue;
      const r = radiusAt(s, t),
        yy = y(t);
      dk += arcFront(cx, yy, r);
      lt += arcFront(cx, yy + 2, r * 0.99);
    }
    const ringAlpha = clamp((tp - 0.12) / 0.12) * (1 - dry * 0.4);
    set($("ringsDark"), { d: dk, opacity: 0.28 * ringAlpha });
    set($("ringsLight"), { d: lt, opacity: 0.22 * ringAlpha });

    // marks travelling round the surface = visible spin
    let md = "",
      ml = "";
    for (const m of marks) {
      const th = m.th + angle,
        c = Math.cos(th);
      if (c < 0.12) continue;
      const r = radiusAt(s, m.t),
        x = cx + r * Math.sin(th),
        yy = y(m.t) + r * K * c,
        w = (m.len * c) / 2;
      const seg = `M${f(x - w)} ${f(yy)}L${f(x + w)} ${f(yy)}`;
      if (m.light) ml += seg;
      else md += seg;
    }
    $("marksDark").setAttribute("d", md);
    $("marksLight").setAttribute("d", ml);
    const markA = clamp((tp - 0.1) / 0.1);
    $("marksDark").setAttribute("opacity", String(0.45 * markA));
    $("marksLight").setAttribute("opacity", String(0.5 * markA));

    // wet highlight on the upper left
    const shT = 0.6,
      shR = radiusAt(s, shT);
    set($("wetSheen"), {
      cx: f(cx - shR * 0.48),
      cy: f(y(shT)),
      rx: f(Math.max(4, shR * 0.16)),
      ry: f(Math.max(8, s.H * (0.12 + 0.06 * s.dome))),
      transform: `rotate(${f(12 * s.dome)} ${f(cx - shR * 0.48)} ${f(y(shT))})`,
      opacity: f((0.16 + 0.22 * s.dome) * (1 - dry)),
    });

    // rim + opening
    const rimA = { cx, cy: topY, rx: rT, ry: rT * K };
    set($("rim"), { ...rimA, opacity: smooth(clamp(s.open / 0.3)) });
    set($("gRim"), rimA);
    const inner = s.open * Math.max(0, rT - 10);
    const holeA = { cx, cy: topY + 1, rx: inner, ry: inner * K };
    const shallow = 0.4 + 0.6 * clamp((s.H - 40) / 80); // plates show a lighter floor
    set($("potHole"), { ...holeA, opacity: inner > 1 && !S.lid ? shallow : 0 });
    set($("gHole"), { ...holeA, opacity: inner > 1 && !S.lid ? 1 : 0 });

    // handle
    let handleD = "";
    if (S.handle && tp >= 1) {
      const h = S.handle,
        x1 = cx + radiusAt(s, h.t1) - 4,
        y1 = y(h.t1),
        x2 = cx + radiusAt(s, h.t2) - 4,
        y2 = y(h.t2);
      handleD = `M${f(x1)} ${f(y1)}C${f(x1 + h.reach * 1.25)} ${f(y1 - 8)} ${f(x2 + h.reach * 1.25)} ${f(y2 + 6)} ${f(x2)} ${f(y2)}`;
    }
    set($("handle"), { d: handleD || "M0 0", "stroke-dashoffset": 1 - grow, opacity: handleD && grow > 0 ? 1 : 0 });
    set($("gHandle"), { d: handleD || "M0 0", opacity: handleD ? 1 : 0 });

    // spout, pinched from the rim
    let spoutD = "";
    if (S.spout && tp >= 1) {
      const ax = cx - rT + 6,
        ay = topY - 2,
        g = grow;
      const tx = lerp(ax, cx - rT - 18, g),
        ty = lerp(ay, topY - 10, g);
      spoutD = `M${f(ax)} ${f(ay)}Q${f(lerp(ax, cx - rT - 8, g))} ${f(lerp(ay, topY - 9, g))} ${f(tx)} ${f(ty)}Q${f(
        lerp(ax, cx - rT - 10, g),
      )} ${f(lerp(ay, topY + 4, g))} ${f(cx - rT + 4)} ${f(topY + 16)}Z`;
    }
    $("spout").setAttribute("d", spoutD || "M0 0");
    $("gSpout").setAttribute("d", spoutD || "M0 0");

    // lid drops on
    let lidD = "M0 0",
      knob = { cx: 0, cy: 0, rx: 0, ry: 0 };
    const lidH = 30;
    if (S.lid && tp >= 1 && grow > 0) {
      const rl = rT + 5,
        ty = topY - (1 - grow) * 70;
      lidD = `M${f(cx - rl)} ${f(ty)}C${f(cx - rl)} ${f(ty - lidH)} ${f(cx + rl)} ${f(ty - lidH)} ${f(cx + rl)} ${f(ty)}A${f(rl)} ${f(
        rl * K,
      )} 0 0 1 ${f(cx - rl)} ${f(ty)}Z`;
      knob = { cx, cy: ty - lidH * 0.75 - 5, rx: 10, ry: 8 };
    }
    set($("lid"), { d: lidD, opacity: grow });
    set($("knob"), { ...knob, opacity: grow });
    $("gLid").setAttribute("d", lidD);
    set($("gKnob"), knob);

    // rib tool
    const rib = $("rib");
    if (withRoom) {
      rib.setAttribute("opacity", String(ribOn));
      if (ribOn > 0) {
        const rt = 0.22 + 0.56 * (0.5 + 0.5 * Math.sin(clock * (reduce ? 0.25 : 0.7)));
        rib.setAttribute("transform", `translate(${f(cx + radiusAt(s, rt) + 2)} ${f(y(rt))}) rotate(-6)`);
      }
    }

    // ---------- glaze ----------
    const glazed = $("glazed") as SVGGElement;
    if (glazeT > 0) {
      glazed.style.display = "";
      const raw = mix(G.c, "#efe9df", 0.55); // unfired glaze is chalky and pale
      const col = mix(raw, G.c, smooth(fireT));
      setStops(["g0", "g1", "g2", "g3", "g4"], [shade(col, -0.3), shade(col, -0.08), shade(col, 0.16), shade(col, -0.02), shade(col, -0.32)]);
      set($("gRim"), { fill: shade(col, 0.06), stroke: mix(raw, G.rim, fireT) });
      $("gHole").setAttribute("fill", shade(col, S.H < 80 ? -0.12 : -0.34));
      $("gKnob").setAttribute("fill", shade(col, 0.08));
      set($("gRings"), { d: dk, stroke: shade(col, -0.3), opacity: 0.22 });

      let sp = "";
      if (G.speckle) {
        for (const k of speckles) {
          const c = Math.cos(k.th);
          if (c < 0.15) continue;
          const r = radiusAt(s, k.t);
          sp += `M${f(cx + r * Math.sin(k.th))} ${f(y(k.t) + r * K * c)}h.01`;
        }
      }
      set($("gSpeckle"), { d: sp, stroke: G.speckle || "none", opacity: 0.25 + 0.5 * fireT });

      // gloss streak following the profile, appearing as it fires
      let gl = "",
        back = "";
      for (let i = 0; i <= 14; i++) {
        const u = i / 14,
          t = 0.12 + 0.76 * u,
          r = radiusAt(s, t),
          w = 7 * Math.sin(Math.PI * u),
          xg = cx - r * 0.5;
        gl += `${i ? "L" : "M"}${f(xg - w / 2)} ${f(y(t))}`;
        back = `L${f(xg + w / 2)} ${f(y(t))}` + back;
      }
      set($("gGloss"), { d: gl + back + "Z", opacity: 0.38 * G.gloss * smooth(fireT) });

      // dip line: an ellipse-front edge that travels down the pot, wobbling like liquid
      const top = 1 + (S.lid ? 48 : 14) / s.H;
      const Lt = lerp(top, S.dip, smooth(glazeT));
      const rL = radiusAt(s, Lt) + 2,
        yL = HEAD_Y - Lt * s.H;
      const edgeY = (dx: number) => yL + (Math.abs(dx) < rL ? rL * K * Math.sqrt(1 - (dx / rL) ** 2) : 0) + 2.2 * Math.sin(dx * 0.11 + 1.3);
      let cd = `M0 -20H580V${f(yL)}`;
      for (let x = CX + 260; x >= CX - 260; x -= 6) cd += `L${x} ${f(edgeY(x - cx))}`;
      cd += `L0 ${f(yL)}Z`;
      const dripT = G.drips ? smooth(clamp((glazeT - 0.6) / 0.4)) * (1 + 0.25 * fireT) : 0;
      if (dripT > 0)
        for (const [df, len] of DRIPS) {
          const x = cx + df * rL,
            y0 = edgeY(x - cx) - 2,
            L = len * dripT;
          cd += `M${f(x - 3.5)} ${f(y0)}L${f(x - 3)} ${f(y0 + L)}C${f(x - 3)} ${f(y0 + L + 5)} ${f(x + 3)} ${f(y0 + L + 5)} ${f(x + 3)} ${f(
            y0 + L,
          )}L${f(x + 3.5)} ${f(y0)}Z`;
        }
      $("glazeClipPath").setAttribute("d", cd);
    } else glazed.style.display = "none";

    if (!withRoom) return;

    // kiln warmth while firing
    const heat = Math.sin(Math.PI * fireT);
    set($("kilnGlow"), { cy: HEAD_Y - s.H * 0.5, opacity: 0.75 * heat });
    $("kilnTint").setAttribute("opacity", String(0.14 * heat));

    // wheel specks
    for (const h of headSpecks) {
      const th = h.th + angle;
      set(h.el, { cx: f(CX + h.R * Math.sin(th)), cy: f(HEAD_Y + h.R * K * Math.cos(th)) });
    }

    // slip flicks
    if (!reduce && spin * motion > 0.5 && Math.random() < dt * 1.6) {
      const o = drops.find((o) => !o.alive);
      if (o) {
        const side = Math.random() < 0.5 ? -1 : 1;
        Object.assign(o, {
          alive: true,
          x: cx + side * r0 * 0.95,
          y: HEAD_Y - 4,
          vx: side * (60 + Math.random() * 70),
          vy: -(40 + Math.random() * 60),
          life: 0,
        });
      }
    }
    for (const o of drops) {
      if (!o.alive) continue;
      o.vy += 420 * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life += dt;
      if (o.y > HEAD_Y + 44 || o.life > 1.2) {
        o.alive = false;
        o.el.setAttribute("opacity", "0");
        continue;
      }
      set(o.el, { cx: f(o.x), cy: f(o.y), opacity: 0.9 });
    }

    // finished
    set($("glow"), { cx: CX, cy: HEAD_Y - s.H * 0.55, opacity: done * 0.85 });
    $("sparkles").setAttribute("opacity", String(done));
    for (const sp of sparkles) {
      const sc = (0.55 + 0.45 * Math.sin(clock * 2.2 + sp.ph)) * 1.7;
      sp.el.setAttribute(
        "transform",
        `translate(${f(CX + sp.fx * (rT + 40))} ${f(HEAD_Y - s.H * sp.fy - (S.lid ? 20 : 0))}) scale(${f(sc)})`,
      );
    }
  }

  let raf = 0;
  function frame(now: number) {
    // A frame queued before destroy() must not draw into markup that another scene has replaced.
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    clock += dt;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }
  if (animate) raf = requestAnimationFrame(frame);
  else {
    running = false;
    draw(0);
  }

  return {
    setProgress(p: number) {
      progress = clamp(p);
      if (!animate) draw(0);
    },
    /** running false rests the wheel (breaks); pace 0..1 is the share of pals focusing. */
    setMotion(running: boolean, pace: number) {
      motion = running ? 0.35 + 0.65 * clamp(pace) : 0;
    },
    setRecipe(r: Recipe) {
      current = r;
      if (!animate) draw(0);
    },
    /** The caption line: "Pulling up the walls.", "Dipping it in celadon.", … */
    stageLabel(): string {
      const p = progress,
        S = SHAPES[current.shape],
        G = GLAZES[current.glaze],
        n = S.label.toLowerCase(),
        tp = p / P.throwEnd;
      const g = G.label.toLowerCase(),
        an = /^[aeiou]/.test(g) ? "An" : "A";
      if (p >= 1) return `${an} ${g} ${n}, ready for the shelf.`;
      if (p < P.throwEnd) {
        if (tp < 0.14) return "Centring the clay.";
        if (tp < 0.28) return "Opening the clay.";
        if (tp < 0.48) return "Pulling up the walls.";
        if (tp < 0.9) return `Shaping the ${n}.`;
        return "Smoothing the rim.";
      }
      if (p < P.spinStop) return "Letting the wheel slow down.";
      if (p < P.attachEnd)
        return S.handle
          ? S.spout
            ? "Pulling a handle and pinching a spout."
            : "Pulling a handle."
          : S.lid
            ? "Fitting the lid."
            : "Drying to leather-hard.";
      if (p < P.glazeEnd) return `Dipping it in ${g}.`;
      if (p < P.fireEnd) return "Firing in the kiln.";
      return "Cooling down.";
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}

export type PotteryScene = ReturnType<typeof createPotteryScene>;

/** "A celadon vase" for the reveal's headline. */
export function pieceLabel(recipe: Recipe): string {
  return `${GLAZES[recipe.glaze].label.toLowerCase()} ${SHAPES[recipe.shape].label.toLowerCase()}`;
}
