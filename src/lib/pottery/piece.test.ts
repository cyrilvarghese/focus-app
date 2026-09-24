import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GLAZES, PIECES, pieceById, pieceFor } from "./piece";

describe("pieceFor", () => {
  it("gives the same piece for the same session every time", () => {
    const id = randomUUID();
    expect(pieceFor(id)).toEqual(pieceFor(id));
  });

  it("matches fixed glaze vectors so every client agrees", () => {
    expect(pieceFor("").glaze).toBe("ink");
    expect(pieceFor("a").glaze).toBe("sage");
    expect(pieceFor("session-1").glaze).toBe("cream");
    expect(pieceFor("00000000-0000-0000-0000-000000000000").glaze).toBe("terracotta");
  });

  it("can produce every piece and every glaze", () => {
    const pieces = new Set<string>();
    const glazes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const p = pieceFor(randomUUID());
      pieces.add(p.pieceId);
      glazes.add(p.glaze);
    }
    expect([...pieces].sort()).toEqual(PIECES.map((p) => p.id).sort());
    expect([...glazes].sort()).toEqual([...GLAZES].sort());
  });

  it("describes each piece from its animation's last stage", () => {
    for (const piece of PIECES) {
      expect(pieceById(piece.id)).toBe(piece);
      expect(piece.profile.length).toBeGreaterThan(2);
      expect(piece.profile[0][0]).toBe(0);
      expect(piece.profile[piece.profile.length - 1][0]).toBe(1);
      expect(piece.ratio).toBeGreaterThan(0);
      expect(piece.name).toMatch(/\S/);
    }
  });

  it("falls back to the first piece for an unknown id", () => {
    expect(pieceById("no-such-animation")).toBe(PIECES[0]);
  });
});
