import { describe, expect, it } from "vitest";
import { GLAZES, PIECE_KINDS } from "./piece";
import { GLAZE_COLORS, potSvg, SHELF_SIZES } from "./shape";

describe("potSvg", () => {
  it("draws every kind at the size asked for", () => {
    for (const kind of PIECE_KINDS) {
      const svg = potSvg(kind, "oat", 150, 190);
      expect(svg.startsWith('<svg viewBox="0 0 150 190"')).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg).toContain("<path");
      expect(svg).not.toContain("NaN");
    }
  });

  it("uses each glaze's colour", () => {
    for (const glaze of GLAZES) expect(potSvg("vase", glaze, 100, 120)).toContain(GLAZE_COLORS[glaze]);
  });

  it("gives the mug a handle and the others none", () => {
    const strokes = (s: string) => s.split("stroke-linecap=\"round\"").length - 1;
    expect(strokes(potSvg("mug", "oat", 100, 120))).toBe(2);
    expect(strokes(potSvg("bowl", "oat", 100, 120))).toBe(0);
  });

  it("adds the glint only when asked", () => {
    expect(potSvg("vase", "oat", 100, 120, { glint: true })).toContain('class="glint"');
    expect(potSvg("vase", "oat", 100, 120)).not.toContain('class="glint"');
  });

  it("gives each drawing its own ids, so clip paths never collide", () => {
    const a = potSvg("vase", "oat", 100, 120);
    const b = potSvg("vase", "oat", 100, 120);
    const idOf = (s: string) => /<clipPath id="([^"]+)"/.exec(s)?.[1];
    expect(idOf(a)).not.toBe(idOf(b));
  });

  it("has a shelf size for every kind", () => {
    for (const kind of PIECE_KINDS) expect(SHELF_SIZES[kind][0]).toBeGreaterThan(0);
  });
});
