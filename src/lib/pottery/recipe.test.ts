import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GLAZE_KEYS, recipeFor, SHAPE_KEYS, VARIATION } from "./recipe";

describe("recipeFor", () => {
  it("gives everyone in the pod the same pot for a session", () => {
    const id = randomUUID();
    expect(recipeFor(id)).toEqual(recipeFor(id));
  });

  it("gives different sessions different pots", () => {
    const seen = new Set(Array.from({ length: 50 }, () => JSON.stringify(recipeFor(randomUUID()))));
    expect(seen.size).toBe(50);
  });

  it("can make every shape and every glaze", () => {
    const shapes = new Set<string>();
    const glazes = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const r = recipeFor(randomUUID());
      shapes.add(r.shape);
      glazes.add(r.glaze);
    }
    expect([...shapes].sort()).toEqual([...SHAPE_KEYS].sort());
    expect([...glazes].sort()).toEqual([...GLAZE_KEYS].sort());
  });

  it("keeps the variation small", () => {
    for (let i = 0; i < 500; i++) {
      const r = recipeFor(randomUUID());
      for (const s of [r.hScale, r.rScale]) {
        expect(s).toBeGreaterThanOrEqual(1 - VARIATION.scale);
        expect(s).toBeLessThanOrEqual(1 + VARIATION.scale);
      }
      expect(Math.abs(r.dipShift)).toBeLessThanOrEqual(VARIATION.dip);
    }
  });
});
