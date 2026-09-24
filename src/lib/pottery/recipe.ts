/**
 * Every session throws a different pot. The choice is random but seeded by the session id,
 * so everyone in the pod watches the same throw and keeps the same piece, with nothing stored.
 * The drawing for each shape and glaze lives in src/components/studio/scene.ts.
 */

export const SHAPE_KEYS = ["vase", "bowl", "cup", "mug", "jug", "moonjar", "budvase", "planter", "plate", "jar"] as const;
export type ShapeKey = (typeof SHAPE_KEYS)[number];

export const GLAZE_KEYS = ["celadon", "oatmeal", "honey", "dusk", "milk", "tenmoku"] as const;
export type GlazeKey = (typeof GLAZE_KEYS)[number];

export type Recipe = {
  shape: ShapeKey;
  glaze: GlazeKey;
  /** Height and width multipliers, so two vases are never quite the same. */
  hScale: number;
  rScale: number;
  /** Moves the glaze line up or down a little. */
  dipShift: number;
};

/** Variation around each shape's proportions, kept small so a vase still reads as a vase. */
export const VARIATION = { scale: 0.08, dip: 0.06 } as const;

/** 32-bit FNV-1a. Small, fast and identical on every JS runtime. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a tiny seeded generator, so one id yields a repeatable stream of numbers. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function recipeFor(sessionId: string): Recipe {
  const rand = seeded(fnv1a(sessionId));
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const around = (spread: number) => 1 + (rand() * 2 - 1) * spread;
  return {
    shape: pick(SHAPE_KEYS),
    glaze: pick(GLAZE_KEYS),
    hScale: around(VARIATION.scale),
    rScale: around(VARIATION.scale),
    dipShift: (rand() * 2 - 1) * VARIATION.dip,
  };
}
