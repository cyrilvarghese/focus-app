import { type Glaze, type PieceId, pieceById } from "./piece";

/**
 * The finished piece, drawn front-on with a dipped glaze.
 * Ported from Ashna's design/prototypes/focuspal-screens-clean.html (PROFILES, curve, pot).
 * Returns an SVG string, so it stays free of React and the DOM.
 */

const INK = "#3d3934";
const CLAY = "#efe7d6";

export const GLAZE_COLORS: Record<Glaze, string> = {
  oat: "#e3d3b4",
  sage: "#b8cdbb",
  cream: "#f1ebe0",
  terracotta: "#dcbcab",
  ink: "#8f9599",
};

/** Catmull-Rom through the profile points, so the wall curves rather than kinks. */
function curve(pts: [number, number][], n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (j: 0 | 1) =>
        0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function potSvg(pieceId: PieceId, glaze: Glaze, w: number, h: number, opts: { glint?: boolean; idPrefix?: string } = {}): string {
  // Derived from the inputs, not a counter, so the server and the browser agree (no hydration mismatch).
  // Two identical pots share an id, which is harmless: their clip path and gradient are identical too.
  const id = `${opts.idPrefix ?? "fp"}-${pieceId}-${glaze}-${w}x${h}${opts.glint ? "-g" : ""}`;
  const R = w * 0.42;
  const cx = w / 2;
  const base = h - w * 0.08;
  const top = w * 0.1;
  const wall = base - top;
  const g = GLAZE_COLORS[glaze];
  const sw = Math.max(1.2, w / 95);
  const pts = curve(pieceById(pieceId).profile, 8);
  const X = (r: number, s: 1 | -1) => (cx + s * r * R).toFixed(1);
  const Y = (t: number) => (base - t * wall).toFixed(1);

  const r0 = pts[0][1] * R;
  const rt = pts[pts.length - 1][1] * R;
  let d = `M${X(pts[0][1], 1)} ${Y(0)}`;
  for (const p of pts) d += ` L${X(p[1], 1)} ${Y(p[0])}`;
  for (const p of [...pts].reverse()) d += ` L${X(p[1], -1)} ${Y(p[0])}`;
  d += ` A${r0.toFixed(1)} ${(r0 * 0.26).toFixed(1)} 0 0 0 ${X(pts[0][1], 1)} ${Y(0)} Z`;

  const dip = base - wall * 0.42;
  let s =
    `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" aria-hidden="true">` +
    `<defs><clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<linearGradient id="${id}s" x1="0" x2="1">` +
    `<stop offset="0" stop-color="#6b5a45" stop-opacity=".22"/><stop offset=".34" stop-color="#fff" stop-opacity=".3"/>` +
    `<stop offset=".56" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#6b5a45" stop-opacity=".26"/>` +
    `</linearGradient></defs>`;

  s +=
    `<g clip-path="url(#${id})"><rect width="${w}" height="${h}" fill="${CLAY}"/>` +
    `<path d="M0 ${dip.toFixed(1)} Q${w * 0.3} ${(dip + wall * 0.06).toFixed(1)} ${w * 0.55} ${(dip - wall * 0.02).toFixed(1)} T${w} ${(dip + wall * 0.03).toFixed(1)} V0 H0Z" fill="${g}"/>` +
    `<rect x="${cx - R}" width="${2 * R}" height="${h}" fill="url(#${id}s)"/>`;
  if (opts.glint) s += `<rect class="glint" x="${cx - 14}" width="14" height="${h}" fill="#fff" opacity=".35" transform="skewX(-18)"/>`;
  s += `</g><path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw}"/>`;
  s += `<ellipse cx="${cx}" cy="${Y(1)}" rx="${rt.toFixed(1)}" ry="${(rt * 0.26).toFixed(1)}" fill="#d8cab3" stroke="${INK}" stroke-width="${sw}"/>`;
  return `${s}</svg>`;
}

/** How big a piece sits on the shelf, keeping the animation's proportions. */
export function shelfSize(pieceId: PieceId, height = 76): [number, number] {
  return [Math.round(height * pieceById(pieceId).ratio), height];
}
