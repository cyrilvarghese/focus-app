import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GLAZES, PIECE_KINDS, pieceFor } from "./piece";

describe("pieceFor", () => {
  it("gives the same piece for the same session every time", () => {
    const id = randomUUID();
    expect(pieceFor(id)).toEqual(pieceFor(id));
  });

  it("matches fixed vectors so every client agrees", () => {
    expect(pieceFor("")).toEqual({ kind: "bowl", glaze: "ink" });
    expect(pieceFor("a")).toEqual({ kind: "cup", glaze: "sage" });
    expect(pieceFor("session-1")).toEqual({ kind: "bowl", glaze: "cream" });
    expect(pieceFor("00000000-0000-0000-0000-000000000000")).toEqual({ kind: "bowl", glaze: "terracotta" });
  });

  it("can produce every kind and every glaze", () => {
    const kinds = new Set<string>();
    const glazes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const p = pieceFor(randomUUID());
      kinds.add(p.kind);
      glazes.add(p.glaze);
    }
    expect([...kinds].sort()).toEqual([...PIECE_KINDS].sort());
    expect([...glazes].sort()).toEqual([...GLAZES].sort());
  });
});
