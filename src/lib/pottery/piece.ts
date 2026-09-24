/**
 * The pieces a session can make. Each one mirrors an animation Ashna's wheel can throw:
 * its `profile` is that animation's last stage, so the pot you watch being thrown is the
 * pot you get. Adding an animation means adding an entry here with the same id.
 */

export const GLAZES = ["oat", "sage", "cream", "terracotta", "ink"] as const;
export type Glaze = (typeof GLAZES)[number];

/** [height 0..1 from the foot, radius 0..1 of the widest point]. */
export type ProfilePoint = [number, number];

export type PieceType = {
  id: string;
  /** Used in "A round vase, made together." */
  name: string;
  profile: ProfilePoint[];
  /** Width ÷ height of the finished piece. */
  ratio: number;
};

/** public/studio-pot.js, stage 8 ("rolled lip"): radii at each eighth of the height, H 126, max radius 70. */
const STUDIO_VASE_R = [0.62, 0.88, 1.0, 1.0, 0.96, 0.81, 0.61, 0.55, 0.73];

export const PIECES: PieceType[] = [
  {
    id: "studio-vase",
    name: "round vase",
    profile: STUDIO_VASE_R.map((r, i) => [i / (STUDIO_VASE_R.length - 1), r] as ProfilePoint),
    ratio: (2 * 70) / 126,
  },
];

export type PieceId = string;

export function pieceById(id: PieceId): PieceType {
  return PIECES.find((p) => p.id === id) ?? PIECES[0];
}

export type Piece = { pieceId: PieceId; glaze: Glaze };

/** 32-bit FNV-1a. Small, fast and identical on every JS runtime. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeding by session id means every client derives the same pot, with nothing stored. */
export function pieceFor(sessionId: string): Piece {
  const h = fnv1a(sessionId);
  return {
    pieceId: PIECES[h % PIECES.length].id,
    glaze: GLAZES[(h >>> 8) % GLAZES.length],
  };
}
