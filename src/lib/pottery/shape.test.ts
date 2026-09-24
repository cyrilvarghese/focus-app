import { describe, expect, it } from "vitest";
import { GLAZES, PIECES } from "./piece";
import { GLAZE_COLORS, potSvg, shelfSize } from "./shape";

describe("potSvg", () => {
  it("draws every piece at the size asked for", () => {
    for (const { id } of PIECES) {
      const svg = potSvg(id, "oat", 150, 190);
      expect(svg.startsWith('<svg viewBox="0 0 150 190"')).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg).toContain("<path");
      expect(svg).not.toContain("NaN");
    }
  });

  it("uses each glaze's colour", () => {
    for (const glaze of GLAZES) expect(potSvg(PIECES[0].id, glaze, 100, 120)).toContain(GLAZE_COLORS[glaze]);
  });

  it("adds the glint only when asked", () => {
    expect(potSvg(PIECES[0].id, "oat", 100, 120, { glint: true })).toContain('class="glint"');
    expect(potSvg(PIECES[0].id, "oat", 100, 120)).not.toContain('class="glint"');
  });

  it("uses ids derived from the inputs, so the server and browser agree", () => {
    const idOf = (s: string) => /<clipPath id="([^"]+)"/.exec(s)?.[1];
    const first = PIECES[0].id;
    expect(idOf(potSvg(first, "oat", 100, 120))).toBe(idOf(potSvg(first, "oat", 100, 120)));
    expect(idOf(potSvg(first, "oat", 100, 120))).not.toBe(idOf(potSvg(first, "oat", 90, 120)));
    expect(idOf(potSvg(first, "oat", 100, 120))).not.toBe(idOf(potSvg(first, "sage", 100, 120)));
  });

  it("sizes a shelf piece from its animation's proportions", () => {
    for (const piece of PIECES) {
      const [w, h] = shelfSize(piece.id, 80);
      expect(h).toBe(80);
      expect(w).toBe(Math.round(80 * piece.ratio));
    }
  });
});
