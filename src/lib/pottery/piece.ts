export const PIECE_KINDS = ["cup", "bowl", "mug", "vase"] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

export const GLAZES = ["oat", "sage", "cream", "terracotta", "ink"] as const;
export type Glaze = (typeof GLAZES)[number];

export const PIECE_NAMES: Record<PieceKind, string> = {
  cup: "little cup",
  bowl: "small bowl",
  mug: "mug",
  vase: "tall vase",
};

export type Piece = { kind: PieceKind; glaze: Glaze };

/** 32-bit FNV-1a. Small, fast and identical on every JS runtime. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Any session can make any piece. Seeding by id means every client derives the same pot, with nothing stored. */
export function pieceFor(sessionId: string): Piece {
  const h = fnv1a(sessionId);
  return {
    kind: PIECE_KINDS[h % PIECE_KINDS.length],
    glaze: GLAZES[(h >>> 8) % GLAZES.length],
  };
}
