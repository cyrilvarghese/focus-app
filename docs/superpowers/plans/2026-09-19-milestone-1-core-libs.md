# Milestone 1: Core Libraries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Focuspal's session clock and pottery rules as pure, tested TypeScript, plus a plain `/solo` page that runs a local session end to end. Then update the PRD to the one-pot-per-session product.

**Architecture:** There are two framework-free modules, `src/lib/clock` and `src/lib/pottery`, each with its own index file that re-exports everything. `pottery` depends on `clock`, and nothing depends on React. `src/app/solo` is a thin client page that composes them and shows the `PotteryView` values Ashna's (future) wheel component will receive.

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript 5, Tailwind 4, Vitest 5, Node 22.13

**Spec:** `docs/superpowers/specs/2026-09-19-milestone-1-core-libs-design.md`

## Global Constraints

- `src/lib/*` must not import `next/*`, `react` or any DOM API (PRD native-port rule).
- Focus options are exactly `15 | 25 | 45`, break `5 | 10 | 15`, rounds `1 | 2 | 3 | 4`. Default is 25 / 5 × 2.
- No animation code. The wheel, piece shapes and finished-piece drawing belong to Ashna.
- Tap targets are at least 44 px (`min-h-11`), and nothing relies on hover.
- Before any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (AGENTS.md).
- All commands run from the worktree root: `C:\Users\cyril varghese\code\focus app\.claude\worktrees\milestone-1-core-libs`
- Commit messages end with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## File map

| File | Responsibility |
|---|---|
| `vitest.config.mts` | Vitest in Node environment, `@/` → `src/` |
| `src/lib/clock/preset.ts` | Preset type, options, validation, total length |
| `src/lib/clock/phase.ts` | `Session`, `focusWindows`, `phaseAt` |
| `src/lib/clock/skew.ts` | `clockOffset` |
| `src/lib/clock/format.ts` | `formatTogether`, `formatCountdown` |
| `src/lib/clock/index.ts` | re-exports the clock module |
| `src/lib/pottery/piece.ts` | Piece kinds, glazes, names, `pieceFor` |
| `src/lib/pottery/outcome.ts` | `palMinutes`, `potOutcome` |
| `src/lib/pottery/view.ts` | `PotteryView` contract, `potteryView` |
| `src/lib/pottery/index.ts` | re-exports the pottery module |
| `src/app/solo/page.tsx` | Route shell and metadata |
| `src/app/solo/SoloSession.tsx` | Client UI: setup → running → ended |
| `docs/PRD.md` | Rewritten for pottery |

---

### Task 1: Vitest setup + clock presets

**Files:**
- Modify: `package.json` (devDependencies, scripts)
- Create: `vitest.config.mts`
- Create: `src/lib/clock/preset.ts`
- Test: `src/lib/clock/preset.test.ts`

**Interfaces:**
- Produces: `MIN_MS = 60_000`, `FOCUS_OPTIONS`, `BREAK_OPTIONS`, `ROUND_OPTIONS`, `type Preset = { focusMin: 15|25|45; breakMin: 5|10|15; rounds: 1|2|3|4 }`, `DEFAULT_PRESET`, `isValidPreset(p: unknown): p is Preset`, `sessionTotalMs(p: Preset): number`

- [ ] **Step 1: Install Vitest and bump @types/node**

Vitest 5 has an optional peer dependency on `@types/node` `^22 || >=24`, and the project pins `^20`. Node here is 22.13, so match that.

```bash
npm install -D @types/node@^22 vitest
npm pkg set scripts.test="vitest"
```

Expected: installs with no `ERESOLVE`. `package.json` now has `"test": "vitest"`.

- [ ] **Step 2: Create `vitest.config.mts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Write the failing test** `src/lib/clock/preset.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, isValidPreset, MIN_MS, sessionTotalMs } from "./preset";

describe("isValidPreset", () => {
  it("accepts every allowed combination's edges", () => {
    expect(isValidPreset({ focusMin: 15, breakMin: 5, rounds: 1 })).toBe(true);
    expect(isValidPreset({ focusMin: 45, breakMin: 15, rounds: 4 })).toBe(true);
    expect(isValidPreset(DEFAULT_PRESET)).toBe(true);
  });

  it("rejects values outside the options", () => {
    expect(isValidPreset({ focusMin: 40, breakMin: 5, rounds: 2 })).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 7, rounds: 2 })).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 5, rounds: 5 })).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 5, rounds: 0 })).toBe(false);
  });

  it("rejects non-objects and missing fields", () => {
    expect(isValidPreset(null)).toBe(false);
    expect(isValidPreset("25/5x2")).toBe(false);
    expect(isValidPreset({ focusMin: 25, breakMin: 5 })).toBe(false);
  });
});

describe("sessionTotalMs", () => {
  it("has no break after the last round", () => {
    expect(sessionTotalMs(DEFAULT_PRESET)).toBe(55 * MIN_MS);
  });

  it("is just the focus time for one round", () => {
    expect(sessionTotalMs({ focusMin: 15, breakMin: 10, rounds: 1 })).toBe(15 * MIN_MS);
  });

  it("handles the longest preset", () => {
    expect(sessionTotalMs({ focusMin: 45, breakMin: 15, rounds: 4 })).toBe(225 * MIN_MS);
  });
});
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npx vitest run src/lib/clock/preset.test.ts`
Expected: FAIL, `Failed to resolve import "./preset"`.

- [ ] **Step 5: Implement** `src/lib/clock/preset.ts`

```ts
export const MIN_MS = 60_000;

export const FOCUS_OPTIONS = [15, 25, 45] as const;
export const BREAK_OPTIONS = [5, 10, 15] as const;
export const ROUND_OPTIONS = [1, 2, 3, 4] as const;

export type Preset = {
  focusMin: (typeof FOCUS_OPTIONS)[number];
  breakMin: (typeof BREAK_OPTIONS)[number];
  rounds: (typeof ROUND_OPTIONS)[number];
};

export const DEFAULT_PRESET: Preset = { focusMin: 25, breakMin: 5, rounds: 2 };

const oneOf = (options: readonly number[], v: unknown) =>
  typeof v === "number" && options.includes(v);

export function isValidPreset(p: unknown): p is Preset {
  if (typeof p !== "object" || p === null) return false;
  const { focusMin, breakMin, rounds } = p as Record<string, unknown>;
  return (
    oneOf(FOCUS_OPTIONS, focusMin) &&
    oneOf(BREAK_OPTIONS, breakMin) &&
    oneOf(ROUND_OPTIONS, rounds)
  );
}

/** Focus for every round, with a break between rounds but not after the last. */
export function sessionTotalMs(p: Preset): number {
  return (p.focusMin * p.rounds + p.breakMin * (p.rounds - 1)) * MIN_MS;
}
```

- [ ] **Step 6: Run it to confirm it passes**

Run: `npx vitest run src/lib/clock/preset.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.mts src/lib/clock/preset.ts src/lib/clock/preset.test.ts
git commit -m "Add Vitest and clock presets"
```

---

### Task 2: Clock phases

**Files:**
- Create: `src/lib/clock/phase.ts`
- Test: `src/lib/clock/phase.test.ts`

**Interfaces:**
- Consumes: `Preset`, `MIN_MS`, `sessionTotalMs` from `./preset`
- Produces: `type Session = { id: string; startedAtMs: number; preset: Preset }`, `type Phase = "focus" | "break" | "done"`, `type ClockState = { phase: Phase; round: number; remainingMs: number; focusProgress: number }`, `type FocusWindow = { round: number; startMs: number; endMs: number }`, `focusWindows(s: Session): FocusWindow[]`, `phaseAt(s: Session, nowMs: number): ClockState`

- [ ] **Step 1: Write the failing test** `src/lib/clock/phase.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { focusWindows, phaseAt, type Session } from "./phase";
import { DEFAULT_PRESET, MIN_MS } from "./preset";

const S = 1_000_000;
const session: Session = { id: "s1", startedAtMs: S, preset: DEFAULT_PRESET }; // 25/5 × 2 = 55 min
const at = (min: number, extraMs = 0) => phaseAt(session, S + min * MIN_MS + extraMs);

describe("focusWindows", () => {
  it("lists each focus round in absolute time", () => {
    expect(focusWindows(session)).toEqual([
      { round: 1, startMs: S, endMs: S + 25 * MIN_MS },
      { round: 2, startMs: S + 30 * MIN_MS, endMs: S + 55 * MIN_MS },
    ]);
  });
});

describe("phaseAt", () => {
  it("starts in focus round 1 with no progress", () => {
    expect(at(0)).toEqual({ phase: "focus", round: 1, remainingMs: 25 * MIN_MS, focusProgress: 0 });
  });

  it("is still focus one ms before the break", () => {
    const s = at(25, -1);
    expect(s.phase).toBe("focus");
    expect(s.remainingMs).toBe(1);
    expect(s.focusProgress).toBeCloseTo((25 * MIN_MS - 1) / (50 * MIN_MS));
  });

  it("enters the break exactly at the end of focus", () => {
    expect(at(25)).toEqual({ phase: "break", round: 1, remainingMs: 5 * MIN_MS, focusProgress: 0.5 });
  });

  it("holds focus progress steady during the break", () => {
    expect(at(27)).toEqual({ phase: "break", round: 1, remainingMs: 3 * MIN_MS, focusProgress: 0.5 });
  });

  it("starts round 2 after the break", () => {
    expect(at(30)).toEqual({ phase: "focus", round: 2, remainingMs: 25 * MIN_MS, focusProgress: 0.5 });
  });

  it("is in the last ms of the last round just before the end", () => {
    const s = at(55, -1);
    expect(s.phase).toBe("focus");
    expect(s.round).toBe(2);
    expect(s.remainingMs).toBe(1);
  });

  it("is done exactly at the end", () => {
    expect(at(55)).toEqual({ phase: "done", round: 2, remainingMs: 0, focusProgress: 1 });
  });

  it("stays done long after the end", () => {
    expect(at(500).phase).toBe("done");
  });

  it("treats a time before the start as the start", () => {
    expect(at(-5)).toEqual(at(0));
  });

  it("has no break in a one-round session", () => {
    const one: Session = { id: "s2", startedAtMs: S, preset: { focusMin: 15, breakMin: 10, rounds: 1 } };
    expect(phaseAt(one, S + 15 * MIN_MS - 1).phase).toBe("focus");
    expect(phaseAt(one, S + 15 * MIN_MS).phase).toBe("done");
  });

  it("lets a late joiner land at the right remaining time", () => {
    // joining 37 min in: round 2, 7 min into focus
    expect(at(37)).toEqual({ phase: "focus", round: 2, remainingMs: 18 * MIN_MS, focusProgress: 32 / 50 });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/clock/phase.test.ts`
Expected: FAIL, `Failed to resolve import "./phase"`.

- [ ] **Step 3: Implement** `src/lib/clock/phase.ts`

```ts
import { MIN_MS, sessionTotalMs, type Preset } from "./preset";

export type Session = { id: string; startedAtMs: number; preset: Preset };
export type Phase = "focus" | "break" | "done";
export type ClockState = {
  phase: Phase;
  /** 1-based. During a break, the round that just finished. */
  round: number;
  /** Time left in the current phase. */
  remainingMs: number;
  /** Focused time so far ÷ total focus time, 0..1. Breaks don't count. */
  focusProgress: number;
};
export type FocusWindow = { round: number; startMs: number; endMs: number };

export function focusWindows(s: Session): FocusWindow[] {
  const focusMs = s.preset.focusMin * MIN_MS;
  const cycleMs = focusMs + s.preset.breakMin * MIN_MS;
  return Array.from({ length: s.preset.rounds }, (_, i) => {
    const startMs = s.startedAtMs + i * cycleMs;
    return { round: i + 1, startMs, endMs: startMs + focusMs };
  });
}

/** The timer is data: every client derives the same state from the session and the server's now. */
export function phaseAt(s: Session, nowMs: number): ClockState {
  const { focusMin, breakMin, rounds } = s.preset;
  const elapsed = Math.max(0, nowMs - s.startedAtMs);
  if (elapsed >= sessionTotalMs(s.preset)) {
    return { phase: "done", round: rounds, remainingMs: 0, focusProgress: 1 };
  }

  const focusMs = focusMin * MIN_MS;
  const cycleMs = focusMs + breakMin * MIN_MS;
  const totalFocusMs = focusMs * rounds;
  const i = Math.floor(elapsed / cycleMs);
  const intoCycle = elapsed - i * cycleMs;

  if (intoCycle < focusMs) {
    return {
      phase: "focus",
      round: i + 1,
      remainingMs: focusMs - intoCycle,
      focusProgress: (i * focusMs + intoCycle) / totalFocusMs,
    };
  }
  return {
    phase: "break",
    round: i + 1,
    remainingMs: cycleMs - intoCycle,
    focusProgress: ((i + 1) * focusMs) / totalFocusMs,
  };
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/clock`
Expected: PASS, 18 tests (6 preset + 12 phase).

- [ ] **Step 5: Commit**

```bash
git add src/lib/clock/phase.ts src/lib/clock/phase.test.ts
git commit -m "Add clock phases and focus windows"
```

---

### Task 3: Clock skew, formatting, and the module index

**Files:**
- Create: `src/lib/clock/skew.ts`, `src/lib/clock/format.ts`, `src/lib/clock/index.ts`
- Test: `src/lib/clock/skew.test.ts`, `src/lib/clock/format.test.ts`

**Interfaces:**
- Produces: `clockOffset(sentMs: number, serverMs: number, receivedMs: number): number`, `formatTogether(min: number): string`, `formatCountdown(ms: number): string`, and `@/lib/clock` re-exporting everything from `preset`, `phase`, `skew` and `format`

- [ ] **Step 1: Write the failing tests**

`src/lib/clock/skew.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { clockOffset } from "./skew";

describe("clockOffset", () => {
  it("is zero when clocks agree", () => {
    expect(clockOffset(1000, 1050, 1100)).toBe(0);
  });

  it("is positive when the server is ahead", () => {
    // round trip 200 ms, so the server stamped at client time 1100; server said 6100
    expect(clockOffset(1000, 6100, 1200)).toBe(5000);
  });

  it("is negative when the server is behind", () => {
    expect(clockOffset(1000, -1900, 1200)).toBe(-3000);
  });
});
```

`src/lib/clock/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCountdown, formatTogether } from "./format";

describe("formatTogether", () => {
  it("uses minutes under an hour", () => {
    expect(formatTogether(55)).toBe("55 minutes");
    expect(formatTogether(1)).toBe("1 minute");
  });

  it("uses hours with no trailing minutes on the hour", () => {
    expect(formatTogether(60)).toBe("1h");
    expect(formatTogether(120)).toBe("2h");
  });

  it("uses hours and minutes otherwise", () => {
    expect(formatTogether(95)).toBe("1h 35m");
    expect(formatTogether(225)).toBe("3h 45m");
  });
});

describe("formatCountdown", () => {
  it("formats whole minutes", () => {
    expect(formatCountdown(25 * 60_000)).toBe("25:00");
  });

  it("rounds up so it never shows 00:00 while time remains", () => {
    expect(formatCountdown(1)).toBe("00:01");
    expect(formatCountdown(59_001)).toBe("01:00");
  });

  it("shows 00:00 at or below zero", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/lib/clock/skew.test.ts src/lib/clock/format.test.ts`
Expected: FAIL, `Failed to resolve import "./skew"` and `"./format"`.

- [ ] **Step 3: Implement**

`src/lib/clock/skew.ts`:

```ts
/**
 * Offset to add to the client clock to get server time, assuming the server stamped its time
 * halfway through the round trip. Server now ≈ Date.now() + offset.
 */
export function clockOffset(sentMs: number, serverMs: number, receivedMs: number): number {
  return serverMs - (sentMs + receivedMs) / 2;
}
```

`src/lib/clock/format.ts`:

```ts
/** "55 minutes", "1h", "1h 35m": the Create screen's total line. */
export function formatTogether(min: number): string {
  if (min < 60) return min === 1 ? "1 minute" : `${min} minutes`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "24:59". Rounds up to the whole second so it never reads 00:00 while time remains. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
```

`src/lib/clock/index.ts`:

```ts
export * from "./preset";
export * from "./phase";
export * from "./skew";
export * from "./format";
```

- [ ] **Step 4: Run the clock suite to confirm it passes**

Run: `npx vitest run src/lib/clock`
Expected: PASS, 27 tests (6 + 12 + 3 + 6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/clock
git commit -m "Add clock skew offset and time formatting"
```

---

### Task 4: Pottery pieces

**Files:**
- Create: `src/lib/pottery/piece.ts`
- Test: `src/lib/pottery/piece.test.ts`

**Interfaces:**
- Produces: `PIECE_KINDS`, `type PieceKind = "cup"|"bowl"|"mug"|"vase"`, `GLAZES`, `type Glaze = "oat"|"sage"|"cream"|"terracotta"|"ink"`, `PIECE_NAMES: Record<PieceKind, string>`, `type Piece = { kind: PieceKind; glaze: Glaze }`, `pieceFor(sessionId: string): Piece`

- [ ] **Step 1: Write the failing test** `src/lib/pottery/piece.test.ts`

The fixed vectors below were computed with the reference 32-bit FNV-1a (`""` → `0x811c9dc5`, `"a"` → `0xe40c292c`). They lock the mapping, because every client in a pod must derive the same pot.

```ts
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/pottery/piece.test.ts`
Expected: FAIL, `Failed to resolve import "./piece"`.

- [ ] **Step 3: Implement** `src/lib/pottery/piece.ts`

```ts
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
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/pottery/piece.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pottery/piece.ts src/lib/pottery/piece.test.ts
git commit -m "Add seeded pottery piece selection"
```

---

### Task 5: Pal-minutes, pot outcome, and the PotteryView contract

**Files:**
- Create: `src/lib/pottery/outcome.ts`, `src/lib/pottery/view.ts`, `src/lib/pottery/index.ts`
- Test: `src/lib/pottery/outcome.test.ts`, `src/lib/pottery/view.test.ts`

**Interfaces:**
- Consumes: `focusWindows`, `phaseAt`, `MIN_MS`, `type Session` from `@/lib/clock`; `pieceFor`, `Glaze`, `PieceKind` from `./piece`
- Produces: `type FocusInterval = { userId: string; startMs: number; endMs: number | null }`, `palMinutes(intervals: FocusInterval[], session: Session, nowMs: number): number`, `potOutcome(presentAtEnd: string[]): { kept: boolean; recipients: string[] }`, `type PotStatus = "idle"|"throwing"|"complete"|"abandoned"`, `type PotteryView = { kind; glaze; progress; running; pace; status }`, `potteryView(session: Session, nowMs: number, opts: { presentCount: number; memberCount: number; left?: boolean }): PotteryView`, and `@/lib/pottery` re-exporting all of it

- [ ] **Step 1: Write the failing tests**

`src/lib/pottery/outcome.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, MIN_MS, type Session } from "@/lib/clock";
import { palMinutes, potOutcome, type FocusInterval } from "./outcome";

// 25/5 × 2 starting at 0: focus 0–25 min and 30–55 min
const session: Session = { id: "s", startedAtMs: 0, preset: DEFAULT_PRESET };
const m = (min: number) => min * MIN_MS;
const iv = (userId: string, from: number, to: number | null): FocusInterval => ({
  userId,
  startMs: m(from),
  endMs: to === null ? null : m(to),
});
const END = m(55);

describe("palMinutes", () => {
  it("counts a full session as all its focus time", () => {
    expect(palMinutes([iv("a", 0, 55)], session, END)).toBe(50);
  });

  it("excludes time spent in the break", () => {
    expect(palMinutes([iv("a", 20, 35)], session, END)).toBe(10);
  });

  it("counts the same user in two tabs once", () => {
    expect(palMinutes([iv("a", 0, 10), iv("a", 5, 15)], session, END)).toBe(15);
  });

  it("sums different users even when they overlap", () => {
    expect(palMinutes([iv("a", 0, 10), iv("b", 0, 10)], session, END)).toBe(20);
  });

  it("caps an open interval at now", () => {
    expect(palMinutes([iv("a", 0, null)], session, m(12))).toBe(12);
  });

  it("ignores zero-length and reversed intervals", () => {
    expect(palMinutes([iv("a", 10, 10), iv("a", 10, 5)], session, END)).toBe(0);
  });

  it("floors to whole minutes", () => {
    expect(palMinutes([{ userId: "a", startMs: 0, endMs: 90_000 }], session, END)).toBe(1);
  });
});

describe("potOutcome", () => {
  it("discards the pot when nobody is present at the end", () => {
    expect(potOutcome([])).toEqual({ kept: false, recipients: [] });
  });

  it("keeps it for exactly the people present", () => {
    expect(potOutcome(["a", "c"])).toEqual({ kept: true, recipients: ["a", "c"] });
  });

  it("lists each recipient once", () => {
    expect(potOutcome(["a", "a", "b"])).toEqual({ kept: true, recipients: ["a", "b"] });
  });
});
```

`src/lib/pottery/view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, MIN_MS, type Session } from "@/lib/clock";
import { pieceFor } from "./piece";
import { potteryView } from "./view";

const session: Session = { id: "session-1", startedAtMs: 0, preset: DEFAULT_PRESET };
const solo = { presentCount: 1, memberCount: 1 };

describe("potteryView", () => {
  it("throws toward the session's piece during focus", () => {
    const v = potteryView(session, 10 * MIN_MS, solo);
    expect(v).toEqual({ ...pieceFor("session-1"), progress: 0.2, running: true, pace: 1, status: "throwing" });
  });

  it("stops the wheel during a break", () => {
    const v = potteryView(session, 27 * MIN_MS, solo);
    expect(v.running).toBe(false);
    expect(v.status).toBe("throwing");
    expect(v.progress).toBe(0.5);
  });

  it("completes at the end when someone is present", () => {
    const v = potteryView(session, 55 * MIN_MS, solo);
    expect(v.status).toBe("complete");
    expect(v.progress).toBe(1);
    expect(v.running).toBe(false);
  });

  it("is abandoned at the end when nobody is present", () => {
    expect(potteryView(session, 55 * MIN_MS, { presentCount: 0, memberCount: 3 }).status).toBe("abandoned");
  });

  it("is abandoned as soon as the session is left", () => {
    const v = potteryView(session, 10 * MIN_MS, { ...solo, left: true });
    expect(v.status).toBe("abandoned");
    expect(v.running).toBe(false);
  });

  it("slows with the share of members focusing", () => {
    expect(potteryView(session, 10 * MIN_MS, { presentCount: 2, memberCount: 4 }).pace).toBe(0.5);
    expect(potteryView(session, 10 * MIN_MS, { presentCount: 0, memberCount: 0 }).pace).toBe(0);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/lib/pottery`
Expected: `piece.test.ts` passes; `outcome.test.ts` and `view.test.ts` FAIL with `Failed to resolve import "./outcome"` / `"./view"`.

- [ ] **Step 3: Implement**

`src/lib/pottery/outcome.ts`:

```ts
import { focusWindows, MIN_MS, type Session } from "@/lib/clock";

/** A stretch of time one member was focusing. endMs is null while still open. */
export type FocusInterval = { userId: string; startMs: number; endMs: number | null };

/**
 * One per focusing member per minute of focus time: the summary's "189 pal-minutes".
 * The same user's overlapping intervals (two tabs) count once, and break time never counts.
 */
export function palMinutes(intervals: FocusInterval[], session: Session, nowMs: number): number {
  const byUser = new Map<string, [number, number][]>();
  for (const { userId, startMs, endMs } of intervals) {
    const end = endMs ?? nowMs;
    if (end <= startMs) continue;
    const spans = byUser.get(userId) ?? [];
    spans.push([startMs, end]);
    byUser.set(userId, spans);
  }

  const windows = focusWindows(session);
  let totalMs = 0;
  for (const spans of byUser.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of spans) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) last[1] = Math.max(last[1], e);
      else merged.push([s, e]);
    }
    for (const [s, e] of merged) {
      for (const w of windows) totalMs += Math.max(0, Math.min(e, w.endMs) - Math.max(s, w.startMs));
    }
  }
  return Math.floor(totalMs / MIN_MS);
}

/** The pot survives if anyone is still at the table at the end, and it goes to them. */
export function potOutcome(presentAtEnd: string[]): { kept: boolean; recipients: string[] } {
  const recipients = [...new Set(presentAtEnd)];
  return { kept: recipients.length > 0, recipients };
}
```

`src/lib/pottery/view.ts`:

```ts
import { phaseAt, type Session } from "@/lib/clock";
import { pieceFor, type Glaze, type PieceKind } from "./piece";

export type PotStatus = "idle" | "throwing" | "complete" | "abandoned";

/** Everything the pottery wheel component (built by Ashna) receives. */
export type PotteryView = {
  /** What the throw is heading toward. */
  kind: PieceKind;
  glaze: Glaze;
  /** 0..1, the clock's focusProgress. Holds steady during breaks. */
  progress: number;
  /** True only during focus; the wheel spins down on breaks. */
  running: boolean;
  /** 0..1, the share of members focusing. The wheel slows when pals doze. */
  pace: number;
  /** complete: glaze and reveal. abandoned: collapse. idle: no session yet (never returned here). */
  status: PotStatus;
};

export function potteryView(
  session: Session,
  nowMs: number,
  { presentCount, memberCount, left = false }: { presentCount: number; memberCount: number; left?: boolean },
): PotteryView {
  const clock = phaseAt(session, nowMs);
  let status: PotStatus = "throwing";
  if (left) status = "abandoned";
  else if (clock.phase === "done") status = presentCount >= 1 ? "complete" : "abandoned";

  return {
    ...pieceFor(session.id),
    progress: clock.focusProgress,
    running: !left && clock.phase === "focus",
    pace: Math.min(1, Math.max(0, presentCount / Math.max(1, memberCount))),
    status,
  };
}
```

`src/lib/pottery/index.ts`:

```ts
export * from "./piece";
export * from "./outcome";
export * from "./view";
```

- [ ] **Step 4: Run the full suite to confirm it passes**

Run: `npx vitest run`
Expected: PASS, 46 tests (27 clock + 3 piece + 10 outcome + 6 view).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pottery
git commit -m "Add pal-minutes, pot outcome and the PotteryView contract"
```

---

### Task 6: `/solo` page

**Files:**
- Create: `src/app/solo/page.tsx`, `src/app/solo/SoloSession.tsx`

**Interfaces:**
- Consumes: `DEFAULT_PRESET`, `FOCUS_OPTIONS`, `BREAK_OPTIONS`, `ROUND_OPTIONS`, `phaseAt`, `sessionTotalMs`, `formatCountdown`, `formatTogether`, `MIN_MS`, `type Preset`, `type Session` from `@/lib/clock`; `PIECE_NAMES`, `palMinutes`, `potteryView` from `@/lib/pottery`
- Produces: the `/solo` route. `?speed=N` fast-forwards.

There is no unit test for this task. The page is thin glue over logic that's already tested, and component testing (jsdom and React Testing Library) is outside this spec. It is checked with a build, a request, and a manual run in the browser.

- [ ] **Step 1: Read the Next docs this task relies on**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`. Confirm that a `page.tsx` without `"use client"` can render a client component and export `metadata`. Adjust if the docs say otherwise.

- [ ] **Step 2: Create** `src/app/solo/page.tsx`

```tsx
import type { Metadata } from "next";
import { SoloSession } from "./SoloSession";

export const metadata: Metadata = { title: "Solo session · Focuspal" };

export default function SoloPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <SoloSession />
    </main>
  );
}
```

- [ ] **Step 3: Create** `src/app/solo/SoloSession.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  BREAK_OPTIONS,
  DEFAULT_PRESET,
  FOCUS_OPTIONS,
  formatCountdown,
  formatTogether,
  MIN_MS,
  phaseAt,
  ROUND_OPTIONS,
  sessionTotalMs,
  type Preset,
  type Session,
} from "@/lib/clock";
import { PIECE_NAMES, palMinutes, potteryView } from "@/lib/pottery";

type Run = { session: Session; speed: number; left: boolean };

const TICK_MS = 250;

/** ?speed=60 plays a 55-minute session in under a minute. Read on Start, so it never affects the server render. */
function readSpeed(): number {
  const n = Number(new URLSearchParams(window.location.search).get("speed"));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function Segmented<T extends number>({
  label,
  options,
  value,
  unit,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  unit: string;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold text-muted">{label}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={o === value}
            onClick={() => onChange(o)}
            className="min-h-11 rounded-xl border-[1.5px] border-ink px-3 font-semibold aria-pressed:bg-mint-wash"
          >
            {o} <small className="font-normal text-muted">{unit}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SoloSession() {
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!run || run.left) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [run]);

  if (!run) {
    const total = sessionTotalMs(preset) / MIN_MS;
    return (
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Solo session</h1>
        <p className="mt-1 text-muted">A local session to try the clock and pottery rules. No account, no server.</p>
        <Segmented label="Focus" unit="min" options={FOCUS_OPTIONS} value={preset.focusMin} onChange={(focusMin) => setPreset({ ...preset, focusMin })} />
        <Segmented label="Break" unit="min" options={BREAK_OPTIONS} value={preset.breakMin} onChange={(breakMin) => setPreset({ ...preset, breakMin })} />
        <Segmented label="Rounds" unit="" options={ROUND_OPTIONS} value={preset.rounds} onChange={(rounds) => setPreset({ ...preset, rounds })} />
        <p className="mt-6 text-lg font-semibold">{formatTogether(total)} together</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-full bg-ink px-6 font-semibold text-paper"
          onClick={() => {
            const startedAtMs = Date.now();
            setNow(startedAtMs);
            setRun({ session: { id: crypto.randomUUID(), startedAtMs, preset }, speed: readSpeed(), left: false });
          }}
        >
          Start
        </button>
      </section>
    );
  }

  const { session, speed, left } = run;
  const t = session.startedAtMs + (now - session.startedAtMs) * speed;
  const clock = phaseAt(session, t);
  const view = potteryView(session, t, { presentCount: left ? 0 : 1, memberCount: 1, left });
  const name = PIECE_NAMES[view.kind];
  const again = (
    <button type="button" className="mt-6 min-h-11 w-full rounded-full border-[1.5px] border-ink px-6 font-semibold" onClick={() => setRun(null)}>
      Start another
    </button>
  );

  return (
    <section>
      {/* Ashna's <PotteryWheel {...view} /> replaces this box. */}
      <div data-slot="pottery-wheel" className="rounded-2xl border-2 border-dashed border-muted p-4">
        <p className="text-sm font-semibold text-muted">PotteryWheel goes here</p>
        <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(view, null, 2)}</pre>
      </div>

      {view.status === "complete" && (
        <>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">A {name}, made together.</h1>
          <p className="mt-1 text-muted">
            {formatTogether(palMinutes([{ userId: "me", startMs: session.startedAtMs, endMs: null }], session, t))} focused · added to your shelf
          </p>
          {again}
        </>
      )}

      {view.status === "abandoned" && (
        <>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">The clay went back in the bag.</h1>
          <p className="mt-1 text-muted">Nobody stayed to the end, so this {name} wasn&apos;t kept.</p>
          {again}
        </>
      )}

      {view.status === "throwing" && (
        <>
          <p className="mt-6 text-sm font-semibold text-mint-deep">
            {clock.phase === "focus" ? "Focus" : "Break"} · Round {clock.round} of {session.preset.rounds}
          </p>
          <p role="timer" className="text-6xl font-semibold tabular-nums tracking-tight">
            {formatCountdown(clock.remainingMs)}
          </p>
          <p className="mt-2 text-muted">Today&apos;s clay will become a {name}.</p>
          {speed !== 1 && <p className="mt-1 text-xs text-muted">Running at {speed}× speed</p>}
          <button
            type="button"
            className="mt-6 min-h-11 w-full rounded-full border-[1.5px] border-ink px-6 font-semibold"
            onClick={() => setRun({ ...run, left: true })}
          >
            Leave
          </button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Type-check, lint and build**

Run: `npx tsc --noEmit; npm run lint; npm run build`
Expected: no type errors or lint errors, and the build lists `○ /solo`.

- [ ] **Step 5: Smoke-test the route**

Run the dev server on a spare port (the main checkout already uses 3000): `npx next dev -p 3001` in the background, then request `http://localhost:3001/solo`.
Expected: HTTP 200, and the HTML contains `Solo session` and `55 minutes together`.

- [ ] **Step 6: Manual run in the browser** (the user)

Open `http://localhost:3001/solo?speed=60`:
1. Choose 15 / 5 / 2 → "35 minutes together" → Start. The countdown runs, and the readout shows `running: true` with `progress` rising.
2. During the break, `running: false` and `progress` holds at 0.5.
3. At the end: "A <piece>, made together." and "30 minutes focused".
4. Start another → Leave straight away → "The clay went back in the bag."

- [ ] **Step 7: Commit**

```bash
git add src/app/solo
git commit -m "Add /solo page driving the clock and pottery rules"
```

---

### Task 7: Rewrite the PRD for pottery

**Files:**
- Modify: `docs/PRD.md`

Apply these edits. Everything not listed stays as it is.

- [ ] **Step 1: Header and §1 Summary.** Change the status line to `Status: draft for review · Date: 2026-09-19 · Owner: Cyril`. Replace the §1 paragraph with:

> Focuspal is a multiplayer focus timer. A small group of friends (a **pod**) starts a timed focus session together. While everyone stays focused in the real world, their pals sit around a studio table and throw one shared pot on the wheel. The pot takes shape as the session's focus time passes, and it's glazed and revealed at the end. If someone leaves, their pal dozes and the wheel slows. If everyone leaves, the clay collapses and nothing is kept. Each finished pot goes on the shelf of whoever stayed to the end.

- [ ] **Step 2: §2 Goal.** Replace "because their island has visibly grown" with "because their shelf of pots made together keeps growing".

- [ ] **Step 3: §3 Audience.** Replace the last sentence with: "The look is Linen & Sage: warm paper, ink linework, a sage accent, and four animal pals (bunny, dog, cat, koala)."

- [ ] **Step 4: §4 Principles.** Replace principles 1, 3 and 5 with:

> 1. **Pause, never punish.** When someone leaves, their pal dozes and the wheel slows. The pot is kept as long as one person stays. The social signal is visible, never shaming.
> 3. **The app rewards not using it.** During a round there is nothing to tap. The wheel is ambient, something to glance at and not something to play with.
> 5. **Every session leaves something behind.** A finished pot goes on each stayer's shelf and is kept permanently.

- [ ] **Step 5: §5 Scope, In v1.** Replace the island and Journal bullets with:

> - Host-started session with a shared timer (focus 15 / 25 / 45 min, break 5 / 10 / 15, 1–4 rounds)
> - One shared pot per session, thrown on the wheel as focus time passes, and revealed at the end
> - Live presence: who is focusing, who stepped away
> - Per-person time tracking, recorded with server time
> - My shelf: your pots, gentle totals (today, this week, all time), and recent sessions. Optional "save my progress" by email.

In **Not in v1**, replace "Multiple island themes, cosmetics, extra animals" with "Choosing the piece, extra glazes, cosmetics, extra animals".

- [ ] **Step 6: §6 Core flows.**
  - 6.1: "name the pod, pick focus / break / rounds (default 25 / 5 × 2), choose your pal and type your focus → land in the lobby with **Copy link** (`/p/<slug>`)".
  - 6.3: replace "and the island as it currently stands" with "and pals taking their seats as people join".
  - 6.4: replace the first sentence with "The screen shows the studio: the pals at the table and the pot on the wheel (the hero), plus the countdown, 'Round 1 of 2' and the viewer's own focus text." Replace the "Pieces drop into the island…" bullet with "The pot's shape follows the session's focus progress (lump → centred → opened → walls → the piece). Its final form, which is any of cup, bowl, mug or vase, is seeded by the session id, so everyone sees the same pot." Replace "building slows" with "the wheel slows".
  - 6.5: replace "members can pan and zoom the island" with "the wheel spins down".
  - 6.6: replace with: "If at least one member is present when the session ends (naturally or by **End session**), the pot is glazed and revealed on the sand disc. It goes on the shelf of **each member present at the end**. The summary shows pal-minutes and each member's focused minutes side by side, with no ranking. If nobody is present, the clay collapses and no pot is kept. Then everyone returns to the lobby."
  - 6.7: replace "**Everyone leaves:** … no growth, then closes." with "**Everyone leaves:** the wheel stops and the session runs to its scheduled end. If someone comes back and is present at the end, the pot is kept for them. If nobody is, the clay collapses and nothing is kept."

- [ ] **Step 7: §7.** Replace the whole section (title and body) with:

> ## 7. The pot
>
> - There is **one pot per session**. It's rendered in SVG on a pottery wheel in the studio scene, with ambient animation (built by Ashna).
> - **Shape follows focus progress:** `progress = focused time so far ÷ total focus time` (breaks don't count). The same progress drives the wheel on every client, because it comes from the shared clock.
> - **Piece and glaze are seeded:** `pieceFor(session.id)` → one of cup, bowl, mug or vase, and one of oat, sage, cream, terracotta or ink. Nothing is stored, and every client derives the same pot.
> - **Pace:** the wheel's speed follows the share of members focusing. A dozing pal slows it, and it spins down during breaks.
> - **Pal-minutes** (one per present, focusing member per focus minute) are a summary stat only. They don't change the piece.
> - **Kept or discarded:** kept if at least one member is present at the end, and given to exactly those members. Otherwise discarded.

- [ ] **Step 8: §9.** In "Upgrade without migration", replace "on My pal" with "on My shelf". Replace "The Journal and all totals are queries over focus intervals." with "My shelf and all totals are queries over focus intervals and `session_members.present_at_end`."

- [ ] **Step 9: §10 Screens.** Replace the table with:

> | Screen | Route | Notes |
> |---|---|---|
> | Home | `/` | Your pal at the table, **Start a pod**, **Join with a link**, your recent pod. The shelf is in the top-right corner. No tab bar. |
> | Start a pod | `/new` | Pod name, focus / break / rounds, total time, your pal, name, your focus |
> | Join ("Take your seat") | `/p/[slug]/join` | Pal grid (taken pals greyed), name, your focus |
> | Pod (lobby / studio / summary) | `/p/[slug]` | One route, and the view is driven by the session state |
> | My shelf | `/shelf` | Your pots, totals (today, this week, all time; no streaks), recent sessions |
> | Solo (dev) | `/solo` | Local session with no backend, for the clock and pottery rules. `?speed=N` |

- [ ] **Step 10: §11 Data model.** Change `pods` to note `focus_min ∈ {15,25,45} · break_min ∈ {5,10,15} · rounds 1–4`. Change `session_members` to `session_id · user_id · focus_text · present_at_end boolean`. After the block, add the bullet: "**No pot table.** The pot is `pieceFor(sessions.id)`. A member's shelf is their sessions where `present_at_end` is true. `present_at_end` is set by `end_session` (or the scheduled close) from members whose last heartbeat is less than 40 s old."

- [ ] **Step 11: §12 Architecture.** Replace the `src/lib/island` bullet with "`src/lib/pottery`: `pieceFor`, `palMinutes`, `potOutcome` and the `PotteryView` contract. No React." Replace the `src/components/island/*` bullet with "`src/components/pottery/*`: the wheel and finished-piece renderers (Ashna), which take `PotteryView`". Replace "**Rendering** | Inline SVG generated from grid data, plus CSS animation" with "**Rendering** | Inline SVG for the studio, pals and pot, animated with CSS and the pot's own frame loop".

- [ ] **Step 12: §13 Quality.** Replace "the island growth function" with "the pottery rules (piece seeding, pal-minutes, pot outcome)". Replace the E2E ending "→ the session ends → the Journal has an entry" with "→ the session ends → the present member's shelf has the pot, and the absent member's does not". In Performance, replace "the island is a single SVG" with "the studio is a single SVG". Replace "No animation runs JS per frame." with "Only the pot runs a per-frame loop, and it pauses while the tab is hidden."

- [ ] **Step 13: §14 Open questions.** Delete questions 3 and 4. Add: "Should `pieceFor` avoid repeating the pod's previous piece?" and "Should the lobby hint at today's piece before starting?" Renumber.

- [ ] **Step 14: §16 Milestones.** Replace item 1 with "**Clock, pottery rules and the wheel, no backend:** `src/lib/clock` and `src/lib/pottery` with tests, plus `/solo` (Cyril). The wheel animation and per-piece throws (Ashna)." Replace "the session summary, Journal, My pal" in item 4 with "the session summary and pot reveal, My shelf".

- [ ] **Step 15: Check nothing stale remains**

Run: `git grep -n -i -E "island|journal|my pal|streak" -- docs/PRD.md`
Expected: the only matches are the "no streaks" note in §10, and none of island, Journal or My pal as live features.

- [ ] **Step 16: Commit**

```bash
git add docs/PRD.md
git commit -m "Update PRD for one pot per session and My shelf"
```
