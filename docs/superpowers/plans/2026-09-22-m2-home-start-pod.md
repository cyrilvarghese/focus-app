# Milestone 2, piece 1: Home, Start a pod, Take your seat, Lobby (host) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host opens `/home`, starts a pod, takes their seat and lands in a lobby with an invite link, against a hosted Supabase project, as a silent anonymous guest.

**Architecture:** Framework-free modules in `src/lib/pals.ts` and `src/lib/supabase/*` wrap validation, guest sign-in and the `create_pod` RPC, and are unit-tested with hand-written fake clients. The four screens live in a `src/app/(pod)/` route group whose layout loads Fraunces and Inter and applies the Linen & Sage tokens under a `.linen` class, so `/cover` and `/solo` keep their current styles. Pages are thin client components composed from small `_ui` pieces, `<PalFace>` and `<SceneSlot>`.

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript 5, Tailwind 4, Vitest 5, `@supabase/supabase-js` 2.116, Node 22

**Spec:** `docs/superpowers/specs/2026-09-19-m2-home-start-pod-design.md` (data layer already committed in `supabase/migrations/0001_pods.sql`)

## Global Constraints

- `src/lib/*` must not import `next/*`, `react` or any DOM API. `src/lib/supabase` is the only module that touches the network.
- Reads go through RLS; writes go only through `security definer` RPCs (`create_pod`).
- Focus options are exactly `15 | 25 | 45`, break `5 | 10 | 15`, rounds `1 | 2 | 3 | 4`, default 25 / 5 × 2 (from `src/lib/clock`).
- Limits: pod name 1–40, display name 1–24, focus text 0–80, all measured after trimming.
- The `/` route stays a rewrite to `public/studio.html`. Home is at `/home`.
- Design: Linen & Sage (`.claude/skills/designing-focuspal-screens/SKILL.md`). One headline and one main action per screen. Sentence-case labels. Sage is the only accent. Tap targets ≥ 44 px, nothing depends on hover. Never pure white or pure black text/background inside `.linen`.
- Copy is exactly as in the spec: "A little company. A lot more focus.", "Start a pod", "I have a link", "Take your seat.", "Sit down", "Your table is set.", "Start focusing", "Sessions arrive soon", "This pod is private for now.", "Back home", "Can't reach Focuspal right now.", "Try again", "One moment…", "Copy link" / "Copied".
- Before any Next.js code, read the relevant guide in `node_modules/next/dist/docs/01-app/` (AGENTS.md). Relevant: `03-api-reference/03-file-conventions/route-groups.md`, `page.md` (`params` is a Promise; `PageProps<'/p/[slug]'>` is a global helper), `01-getting-started/13-fonts.md`, `03-api-reference/04-functions/use-router.md`.
- All commands run from the worktree root: `C:\Users\cyril varghese\code\focus app\.claude\worktrees\m2-home-start-pod` (branch `m2-home-start-pod`). Do not push to `origin`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `.env.local` already exists with real keys and is git-ignored. Never print or commit it.

## File map

| File | Responsibility |
|---|---|
| `src/lib/pals.ts` | `PALS`, `Pal`, `isPal`, `LIMITS`, the three validators |
| `src/lib/pals.test.ts` | validator edge cases |
| `src/lib/supabase/types.ts` | `Profile`, `Pod`, `PodMember` row types |
| `src/lib/supabase/client.ts` | `getSupabase()`, `SupabaseConfigError` |
| `src/lib/supabase/client.test.ts` | config error when env is missing |
| `src/lib/supabase/auth.ts` | `ensureGuest(client)` |
| `src/lib/supabase/auth.test.ts` | session reuse, anonymous sign-in, error mapping |
| `src/lib/supabase/pods.ts` | `createPod`, `getPod`, `getMyProfile`, `podErrorMessage` |
| `src/lib/supabase/pods.test.ts` | RPC pass-through, error mapping, empty select |
| `src/app/globals.css` | adds the `.linen` token block and theme colours |
| `src/app/(pod)/layout.tsx` | loads Fraunces + Inter, applies `.linen screen-bg` |
| `src/app/(pod)/_ui/Chips.tsx` | one row of pill toggles |
| `src/app/(pod)/_ui/Field.tsx` | label + input + hint |
| `src/app/(pod)/_ui/Buttons.tsx` | `PrimaryButton`, `TextButton`, `IconButton` (back arrow) |
| `src/app/(pod)/_ui/Screen.tsx` | the phone-width column with nav row and `grow` spacers |
| `src/app/(pod)/_ui/useGuest.ts` | mount-time `ensureGuest()` with pending / ready / error + retry |
| `src/components/pals/PalFace.tsx` | static SVG faces for the four pals |
| `src/components/scene/SceneSlot.tsx` | dashed placeholder for Ashna's scene |
| `src/app/(pod)/home/page.tsx` | Home |
| `src/app/(pod)/new/page.tsx` + `NewPod.tsx` | Start a pod (step 1) and Take your seat (step 2) |
| `src/app/(pod)/new/TakeYourSeat.tsx` | reusable seat picker + name + focus form |
| `src/app/(pod)/p/[slug]/page.tsx` + `Lobby.tsx` | Lobby |
| `docs/supabase-setup.md` | setup + manual checklist |

---

### Task 1: Pals and validators

**Files:**
- Create: `src/lib/pals.ts`
- Test: `src/lib/pals.test.ts`

**Interfaces:**
- Produces: `PALS = ['bunny','cat','dog','koala'] as const`, `type Pal`, `isPal(v: unknown): v is Pal`, `PAL_LABEL: Record<Pal,string>`, `LIMITS = { podName: 40, displayName: 24, focusText: 80 }`, `validatePodName(s: string): string | null`, `validateDisplayName(s: string): string | null`, `validateFocusText(s: string): string | null` (each returns the hint text, or `null` when valid)

- [ ] **Step 1: Write the failing test** `src/lib/pals.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  isPal,
  LIMITS,
  PALS,
  validateDisplayName,
  validateFocusText,
  validatePodName,
} from "./pals";

describe("pals", () => {
  it("has the four pals in seat order", () => {
    expect(PALS).toEqual(["bunny", "cat", "dog", "koala"]);
  });
  it("isPal accepts pals and rejects everything else", () => {
    expect(isPal("koala")).toBe(true);
    expect(isPal("fox")).toBe(false);
    expect(isPal(undefined)).toBe(false);
  });
});

describe("validatePodName", () => {
  it("rejects empty and whitespace-only", () => {
    expect(validatePodName("")).toBe("Give your pod a name");
    expect(validatePodName("   ")).toBe("Give your pod a name");
  });
  it("accepts up to the limit after trimming", () => {
    expect(validatePodName(" " + "a".repeat(LIMITS.podName) + " ")).toBeNull();
  });
  it("rejects one over the limit", () => {
    expect(validatePodName("a".repeat(LIMITS.podName + 1))).toBe("Keep it under 40 characters");
  });
});

describe("validateDisplayName", () => {
  it("rejects empty and whitespace-only", () => {
    expect(validateDisplayName("")).toBe("What should your pals call you?");
    expect(validateDisplayName("\t")).toBe("What should your pals call you?");
  });
  it("accepts up to the limit and rejects one over", () => {
    expect(validateDisplayName("a".repeat(LIMITS.displayName))).toBeNull();
    expect(validateDisplayName("a".repeat(LIMITS.displayName + 1))).toBe("Keep it under 24 characters");
  });
});

describe("validateFocusText", () => {
  it("allows empty", () => {
    expect(validateFocusText("")).toBeNull();
    expect(validateFocusText("   ")).toBeNull();
  });
  it("accepts up to the limit and rejects one over", () => {
    expect(validateFocusText("a".repeat(LIMITS.focusText))).toBeNull();
    expect(validateFocusText("a".repeat(LIMITS.focusText + 1))).toBe("Keep it under 80 characters");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/pals.test.ts`
Expected: FAIL, `Failed to resolve import "./pals"`.

- [ ] **Step 3: Implement** `src/lib/pals.ts`

```ts
export const PALS = ["bunny", "cat", "dog", "koala"] as const;
export type Pal = (typeof PALS)[number];

export function isPal(v: unknown): v is Pal {
  return typeof v === "string" && (PALS as readonly string[]).includes(v);
}

export const PAL_LABEL: Record<Pal, string> = {
  bunny: "Bunny",
  cat: "Cat",
  dog: "Dog",
  koala: "Koala",
};

/** Matches the checks in supabase/migrations/0001_pods.sql (lengths after trimming). */
export const LIMITS = { podName: 40, displayName: 24, focusText: 80 } as const;

const over = (n: number) => `Keep it under ${n} characters`;

export function validatePodName(s: string): string | null {
  const t = s.trim();
  if (t.length === 0) return "Give your pod a name";
  if (t.length > LIMITS.podName) return over(LIMITS.podName);
  return null;
}

export function validateDisplayName(s: string): string | null {
  const t = s.trim();
  if (t.length === 0) return "What should your pals call you?";
  if (t.length > LIMITS.displayName) return over(LIMITS.displayName);
  return null;
}

export function validateFocusText(s: string): string | null {
  if (s.trim().length > LIMITS.focusText) return over(LIMITS.focusText);
  return null;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/pals.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pals.ts src/lib/pals.test.ts
git commit -m "Add pals and form validators"
```

---

### Task 2: Supabase client and row types

**Files:**
- Create: `src/lib/supabase/types.ts`
- Create: `src/lib/supabase/client.ts`
- Test: `src/lib/supabase/client.test.ts`

**Interfaces:**
- Produces: `type Profile = { id: string; name: string; animal: Pal }`, `type Pod = { id: string; slug: string; name: string; host_id: string; focus_min: 15|25|45; break_min: 5|10|15; rounds: 1|2|3|4 }`, `type PodMember = { user_id: string; display_name: string; animal: Pal; focus_text: string; joined_at: string }`, `class SupabaseConfigError extends Error`, `getSupabase(): SupabaseClient` (one shared browser client), `createSupabase(url, key): SupabaseClient`, `readConfig(env): { url, key } | null`

- [ ] **Step 1: Write the failing test** `src/lib/supabase/client.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { readConfig, SupabaseConfigError, supabaseFromEnv } from "./client";

describe("readConfig", () => {
  it("returns both values when present", () => {
    expect(
      readConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1" }),
    ).toEqual({ url: "https://x.supabase.co", key: "sb_publishable_1" });
  });
  it("returns null when either is missing or blank", () => {
    expect(readConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toBeNull();
    expect(readConfig({ NEXT_PUBLIC_SUPABASE_URL: " ", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" })).toBeNull();
  });
});

describe("supabaseFromEnv", () => {
  it("throws SupabaseConfigError with the setup hint when unconfigured", () => {
    expect(() => supabaseFromEnv({})).toThrow(SupabaseConfigError);
    expect(() => supabaseFromEnv({})).toThrow("copy .env.local.example to .env.local");
  });
  it("builds a client when configured", () => {
    const c = supabaseFromEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1" });
    expect(typeof c.auth.getSession).toBe("function");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/supabase/client.test.ts`
Expected: FAIL, `Failed to resolve import "./client"`.

- [ ] **Step 3: Implement** `src/lib/supabase/types.ts` and `src/lib/supabase/client.ts`

`src/lib/supabase/types.ts`:

```ts
import type { Pal } from "../pals";

/** Hand-written row types for supabase/migrations/0001_pods.sql. */
export type Profile = { id: string; name: string; animal: Pal };

export type Pod = {
  id: string;
  slug: string;
  name: string;
  host_id: string;
  focus_min: 15 | 25 | 45;
  break_min: 5 | 10 | 15;
  rounds: 1 | 2 | 3 | 4;
};

export type PodMember = {
  user_id: string;
  display_name: string;
  animal: Pal;
  focus_text: string;
  joined_at: string;
};
```

`src/lib/supabase/client.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {
  constructor() {
    super("Supabase isn't configured: copy .env.local.example to .env.local");
    this.name = "SupabaseConfigError";
  }
}

type Env = Record<string, string | undefined>;

export function readConfig(env: Env): { url: string; key: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

export function supabaseFromEnv(env: Env): SupabaseClient {
  const cfg = readConfig(env);
  if (!cfg) throw new SupabaseConfigError();
  return createClient(cfg.url, cfg.key);
}

let shared: SupabaseClient | null = null;

/** One shared browser client. Next inlines NEXT_PUBLIC_* at build time, so they must be read as literals. */
export function getSupabase(): SupabaseClient {
  if (!shared) {
    shared = supabaseFromEnv({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  }
  return shared;
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/supabase/client.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/types.ts src/lib/supabase/client.ts src/lib/supabase/client.test.ts
git commit -m "Add Supabase client factory and row types"
```

---

### Task 3: Guest sign-in

**Files:**
- Create: `src/lib/supabase/auth.ts`
- Test: `src/lib/supabase/auth.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient` from `@supabase/supabase-js`
- Produces: `type GuestResult = { userId: string } | { error: 'guest_signin_disabled' | 'network' }`, `ensureGuest(client: SupabaseClient): Promise<GuestResult>`

- [ ] **Step 1: Write the failing test** `src/lib/supabase/auth.test.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ensureGuest } from "./auth";

type FakeOpts = {
  session?: { user: { id: string } } | null;
  signIn?: { user: { id: string } | null; error: { code?: string; message: string } | null };
  getSessionThrows?: boolean;
};

function fake(o: FakeOpts) {
  const getSession = vi.fn(async () => {
    if (o.getSessionThrows) throw new TypeError("Failed to fetch");
    return { data: { session: o.session ?? null }, error: null };
  });
  const signInAnonymously = vi.fn(async () => ({
    data: { user: o.signIn?.user ?? null, session: null },
    error: o.signIn?.error ?? null,
  }));
  const client = { auth: { getSession, signInAnonymously } } as unknown as SupabaseClient;
  return { client, getSession, signInAnonymously };
}

describe("ensureGuest", () => {
  it("reuses an existing session without signing in", async () => {
    const f = fake({ session: { user: { id: "u1" } } });
    expect(await ensureGuest(f.client)).toEqual({ userId: "u1" });
    expect(f.signInAnonymously).not.toHaveBeenCalled();
  });

  it("signs in anonymously when there is no session", async () => {
    const f = fake({ session: null, signIn: { user: { id: "u2" }, error: null } });
    expect(await ensureGuest(f.client)).toEqual({ userId: "u2" });
    expect(f.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("maps a disabled anonymous provider", async () => {
    const f = fake({ session: null, signIn: { user: null, error: { code: "anonymous_provider_disabled", message: "Anonymous sign-ins are disabled" } } });
    expect(await ensureGuest(f.client)).toEqual({ error: "guest_signin_disabled" });
  });

  it("maps any other sign-in failure to network", async () => {
    const f = fake({ session: null, signIn: { user: null, error: { message: "boom" } } });
    expect(await ensureGuest(f.client)).toEqual({ error: "network" });
  });

  it("maps a thrown fetch error to network", async () => {
    const f = fake({ getSessionThrows: true });
    expect(await ensureGuest(f.client)).toEqual({ error: "network" });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/supabase/auth.test.ts`
Expected: FAIL, `Failed to resolve import "./auth"`.

- [ ] **Step 3: Implement** `src/lib/supabase/auth.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type GuestError = "guest_signin_disabled" | "network";
export type GuestResult = { userId: string } | { error: GuestError };

/**
 * Guest-first identity (PRD §9): reuse the stored session, otherwise sign in anonymously.
 * Anonymous users get the `authenticated` role, which the RLS policies and RPC grants expect.
 */
export async function ensureGuest(client: SupabaseClient): Promise<GuestResult> {
  try {
    const { data } = await client.auth.getSession();
    if (data.session?.user) return { userId: data.session.user.id };

    const res = await client.auth.signInAnonymously();
    if (res.error) {
      return { error: res.error.code === "anonymous_provider_disabled" ? "guest_signin_disabled" : "network" };
    }
    if (!res.data.user) return { error: "network" };
    return { userId: res.data.user.id };
  } catch {
    return { error: "network" };
  }
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/supabase/auth.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/auth.ts src/lib/supabase/auth.test.ts
git commit -m "Add guest sign-in"
```

---

### Task 4: Pods data access

**Files:**
- Create: `src/lib/supabase/pods.ts`
- Test: `src/lib/supabase/pods.test.ts`

**Interfaces:**
- Consumes: `Pal` (Task 1), `Pod`, `PodMember`, `Profile` (Task 2)
- Produces: `type CreatePodInput = { name: string; focusMin: 15|25|45; breakMin: 5|10|15; rounds: 1|2|3|4; animal: Pal; displayName: string; focusText: string }`, `type PodError = 'not_signed_in'|'invalid_name'|'invalid_preset'|'invalid_animal'|'invalid_display_name'|'invalid_focus_text'|'slug_exhausted'|'network'`, `createPod(client, input): Promise<{ slug: string } | { error: PodError }>`, `getPod(client, slug): Promise<{ pod: Pod; members: PodMember[] } | null>`, `getMyProfile(client, userId): Promise<Profile | null>`, `podErrorMessage(code: PodError): string`

- [ ] **Step 1: Write the failing test** `src/lib/supabase/pods.test.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createPod, getMyProfile, getPod, podErrorMessage } from "./pods";

type Result = { data: unknown; error: { message: string } | null };

/** A tiny query builder: every chained call returns itself, and maybeSingle resolves the configured result. */
function fakeClient(o: { rpc?: Result; rows?: Record<string, Result> }) {
  const calls: { table?: string; select?: string; eq?: [string, unknown] }[] = [];
  const from = vi.fn((table: string) => {
    const call: (typeof calls)[number] = { table };
    calls.push(call);
    const b = {
      select: vi.fn((cols: string) => ((call.select = cols), b)),
      eq: vi.fn((col: string, v: unknown) => ((call.eq = [col, v]), b)),
      maybeSingle: vi.fn(async () => o.rows?.[table] ?? { data: null, error: null }),
    };
    return b;
  });
  const rpc = vi.fn(async () => o.rpc ?? { data: null, error: null });
  return { client: { from, rpc } as unknown as SupabaseClient, from, rpc, calls };
}

const input = { name: " The afternoon pod ", focusMin: 25, breakMin: 5, rounds: 2, animal: "bunny", displayName: "Ashna", focusText: "Pitch deck" } as const;

describe("createPod", () => {
  it("passes the RPC arguments through and returns the slug", async () => {
    const f = fakeClient({ rpc: { data: "k7m2pq", error: null } });
    expect(await createPod(f.client, input)).toEqual({ slug: "k7m2pq" });
    expect(f.rpc).toHaveBeenCalledWith("create_pod", {
      p_name: " The afternoon pod ",
      p_focus_min: 25,
      p_break_min: 5,
      p_rounds: 2,
      p_animal: "bunny",
      p_display_name: "Ashna",
      p_focus_text: "Pitch deck",
    });
  });

  it("maps a known error code", async () => {
    const f = fakeClient({ rpc: { data: null, error: { message: "invalid_display_name" } } });
    expect(await createPod(f.client, input)).toEqual({ error: "invalid_display_name" });
  });

  it("maps unknown errors and missing data to network", async () => {
    expect(await createPod(fakeClient({ rpc: { data: null, error: { message: "FetchError" } } }).client, input)).toEqual({ error: "network" });
    expect(await createPod(fakeClient({ rpc: { data: null, error: null } }).client, input)).toEqual({ error: "network" });
  });
});

describe("getPod", () => {
  it("returns null when the select is empty", async () => {
    const f = fakeClient({});
    expect(await getPod(f.client, "nope")).toBeNull();
    expect(f.calls[0]).toMatchObject({ table: "pods", eq: ["slug", "nope"] });
    expect(f.calls[0].select).toContain("pod_members");
  });

  it("returns the pod with members sorted by joined_at", async () => {
    const row = {
      id: "p1", slug: "k7m2pq", name: "The afternoon pod", host_id: "u1", focus_min: 25, break_min: 5, rounds: 2,
      pod_members: [
        { user_id: "u2", display_name: "Maya", animal: "cat", focus_text: "", joined_at: "2026-09-22T10:01:00Z" },
        { user_id: "u1", display_name: "Cyril", animal: "dog", focus_text: "Plan", joined_at: "2026-09-22T10:00:00Z" },
      ],
    };
    const f = fakeClient({ rows: { pods: { data: row, error: null } } });
    const r = await getPod(f.client, "k7m2pq");
    expect(r?.pod).toEqual({ id: "p1", slug: "k7m2pq", name: "The afternoon pod", host_id: "u1", focus_min: 25, break_min: 5, rounds: 2 });
    expect(r?.members.map((m) => m.user_id)).toEqual(["u1", "u2"]);
  });
});

describe("getMyProfile", () => {
  it("returns null when absent and the row when present", async () => {
    expect(await getMyProfile(fakeClient({}).client, "u1")).toBeNull();
    const f = fakeClient({ rows: { profiles: { data: { id: "u1", name: "Ashna", animal: "bunny" }, error: null } } });
    expect(await getMyProfile(f.client, "u1")).toEqual({ id: "u1", name: "Ashna", animal: "bunny" });
    expect(f.calls[0]).toMatchObject({ table: "profiles", eq: ["id", "u1"] });
  });
});

describe("podErrorMessage", () => {
  it("has friendly text for every code", () => {
    expect(podErrorMessage("network")).toBe("Can't reach Focuspal right now.");
    expect(podErrorMessage("invalid_name")).toBe("Give your pod a name (up to 40 characters).");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/supabase/pods.test.ts`
Expected: FAIL, `Failed to resolve import "./pods"`.

- [ ] **Step 3: Implement** `src/lib/supabase/pods.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pal } from "../pals";
import type { Pod, PodMember, Profile } from "./types";

export type CreatePodInput = {
  name: string;
  focusMin: 15 | 25 | 45;
  breakMin: 5 | 10 | 15;
  rounds: 1 | 2 | 3 | 4;
  animal: Pal;
  displayName: string;
  focusText: string;
};

const POD_ERRORS = [
  "not_signed_in",
  "invalid_name",
  "invalid_preset",
  "invalid_animal",
  "invalid_display_name",
  "invalid_focus_text",
  "slug_exhausted",
  "network",
] as const;
export type PodError = (typeof POD_ERRORS)[number];

const isPodError = (m: unknown): m is PodError =>
  typeof m === "string" && (POD_ERRORS as readonly string[]).includes(m);

/** Calls the create_pod RPC (the only way a pod row is written). The server raises short codes as the error message. */
export async function createPod(
  client: SupabaseClient,
  input: CreatePodInput,
): Promise<{ slug: string } | { error: PodError }> {
  try {
    const { data, error } = await client.rpc("create_pod", {
      p_name: input.name,
      p_focus_min: input.focusMin,
      p_break_min: input.breakMin,
      p_rounds: input.rounds,
      p_animal: input.animal,
      p_display_name: input.displayName,
      p_focus_text: input.focusText,
    });
    if (error) return { error: isPodError(error.message) ? error.message : "network" };
    if (typeof data !== "string") return { error: "network" };
    return { slug: data };
  } catch {
    return { error: "network" };
  }
}

const POD_COLUMNS =
  "id, slug, name, host_id, focus_min, break_min, rounds, pod_members(user_id, display_name, animal, focus_text, joined_at)";

/** One select with the members embedded. RLS hides pods the caller isn't in, so "not a member" and "no such pod" both come back null. */
export async function getPod(
  client: SupabaseClient,
  slug: string,
): Promise<{ pod: Pod; members: PodMember[] } | null> {
  const { data, error } = await client.from("pods").select(POD_COLUMNS).eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  const { pod_members, ...pod } = data as Pod & { pod_members: PodMember[] };
  const members = [...(pod_members ?? [])].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  return { pod, members };
}

export async function getMyProfile(client: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await client.from("profiles").select("id, name, animal").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export function podErrorMessage(code: PodError): string {
  switch (code) {
    case "not_signed_in":
      return "You're not signed in yet. Try again in a moment.";
    case "invalid_name":
      return "Give your pod a name (up to 40 characters).";
    case "invalid_preset":
      return "Pick a focus, break and number of rounds.";
    case "invalid_animal":
      return "Pick a pal.";
    case "invalid_display_name":
      return "Add your name (up to 24 characters).";
    case "invalid_focus_text":
      return "Keep what you're working on under 80 characters.";
    case "slug_exhausted":
      return "Couldn't find a free link. Try again.";
    case "network":
      return "Can't reach Focuspal right now.";
  }
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/supabase/pods.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the whole suite and the type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all files pass (46 previous + 24 new), and `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/pods.ts src/lib/supabase/pods.test.ts
git commit -m "Add createPod, getPod and getMyProfile"
```

---

### Task 5: Linen & Sage tokens, the `(pod)` layout, and the `_ui` pieces

**Files:**
- Modify: `src/app/globals.css` (append)
- Create: `src/app/(pod)/layout.tsx`
- Create: `src/app/(pod)/_ui/Screen.tsx`, `Chips.tsx`, `Field.tsx`, `Buttons.tsx`

**Interfaces:**
- Produces: `<Screen nav?={ReactNode} children>` (phone-width column), `<Chips<T> label options value format onChange>`, `<Field id label value onChange hint? placeholder? maxLength? autoComplete?>`, `<PrimaryButton disabled? onClick? type? children>`, `<TextButton disabled? onClick? href? children>`, `<BackButton href? onClick?>`
- Tailwind colour utilities available inside `.linen`: `bg-sage`, `text-sage`, `text-sage-deep`, `bg-sage-soft`, `text-on-sage`, `bg-card`, `text-text`, `text-text-2`, `text-muted`, `border-line`, `bg-sand`; fonts `font-display`, `font-ui`.

Read first: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` and `01-getting-started/13-fonts.md`.

- [ ] **Step 1: Append the token block to** `src/app/globals.css`

Add after the existing `@theme inline { … }` block (keep everything already there):

```css
/* ───────── Linen & Sage (.claude/skills/designing-focuspal-screens/tokens.css), scoped so /cover and /solo keep their look ───────── */
.linen {
  --bg: #f6f2eb;
  --bg-hi: #fbf8f3;
  --bg-lo: #ece5da;
  --card: #fffdf9;
  --card-2: #faf6ef;
  --line: rgba(61, 57, 52, 0.1);
  --text: #3d3934;
  --text-2: #5f584f;
  --muted: #6f675d;
  --accent: #54715d;
  --accent-deep: #46604e;
  --accent-soft: #e4ece4;
  --on-accent: #fffdf9;
  --live: #7fa38a;
  --sleep: #bdb4a8;
  --danger: #9c5a46;
  --sand: #e9e1d3;
  color: var(--text);
  font-family: var(--font-inter), system-ui, sans-serif;
  background: var(--bg);
}
.linen .screen-bg {
  background: radial-gradient(120% 70% at 50% 58%, var(--bg-hi) 0%, var(--bg) 52%, var(--bg-lo) 100%);
}
.linen .display {
  font-family: var(--font-fraunces), Georgia, serif;
  font-variation-settings: "SOFT" 100, "WONK" 1;
}
.linen :focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.linen input {
  font: inherit;
  color: inherit;
}

@theme inline {
  --color-sage: var(--accent);
  --color-sage-deep: var(--accent-deep);
  --color-sage-soft: var(--accent-soft);
  --color-on-sage: var(--on-accent);
  --color-card: var(--card);
  --color-text-2: var(--text-2);
  --color-line: var(--line);
  --color-sand: var(--sand);
  --color-danger: var(--danger);
  --font-display: var(--font-fraunces);
  --font-ui: var(--font-inter);
}
```

(`text-text` and `text-muted` already exist in the first `@theme` block and resolve through `--text` / `--muted`, which `.linen` overrides.)

- [ ] **Step 2: Create** `src/app/(pod)/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "Focuspal" };

export default function PodLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`linen ${fraunces.variable} ${inter.variable} flex min-h-screen flex-1 flex-col`}>
      <div className="screen-bg flex flex-1 flex-col">{children}</div>
    </div>
  );
}
```

(A route-group layout has no URL of its own, so it takes plain `children` rather than the generated `LayoutProps` helper.)

- [ ] **Step 3: Create** `src/app/(pod)/_ui/Screen.tsx`

```tsx
import type { ReactNode } from "react";

/** The phone-width column every (pod) screen uses: optional nav row, then content. */
export function Screen({ nav, children }: { nav?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 pb-8 pt-3">
      <div className="flex min-h-[52px] items-center justify-between">{nav}</div>
      {children}
    </main>
  );
}

/** Pushes what follows to the bottom, like the prototype's `.grow`. */
export function Grow() {
  return <div className="flex-1" aria-hidden="true" />;
}
```

- [ ] **Step 4: Create** `src/app/(pod)/_ui/Chips.tsx`

```tsx
"use client";

export function Chips<T extends number>({
  label,
  options,
  value,
  format,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  format: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-[22px] border-0 p-0">
      <legend className="mb-2 text-[13.5px] font-medium text-text-2">{label}</legend>
      <div className="flex gap-2">
        {options.map((o) => {
          const on = o === value;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o)}
              className={`min-h-[46px] flex-1 rounded-full border text-[15px] ${
                on ? "border-sage bg-sage-soft font-semibold text-sage-deep" : "border-line bg-card font-medium text-text"
              }`}
            >
              {format(o)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 5: Create** `src/app/(pod)/_ui/Field.tsx`

```tsx
"use client";

export function Field({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  maxLength,
  autoComplete = "off",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Shown under the field, only once the field has been touched (the caller decides). */
  hint?: string | null;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <div className="mt-[22px]">
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-medium text-text-2">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={hint ? true : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-[50px] w-full rounded-2xl border border-line bg-card px-4 text-base outline-none focus:border-sage focus:shadow-[0_0_0_3px_var(--accent-soft)]"
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Create** `src/app/(pod)/_ui/Buttons.tsx`

```tsx
"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-sage text-base font-semibold text-on-sage active:scale-[.985] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** The quiet secondary action. With `href` it renders a link, otherwise a button. */
export function TextButton({
  children,
  disabled,
  onClick,
  href,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = "mt-1 flex min-h-12 w-full items-center justify-center text-[15px] font-semibold text-text-2 disabled:opacity-50";
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

const arrow = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

/** 44px round back control. With `href` it's a link, otherwise a button (for in-page steps). */
export function BackButton({ href, onClick }: { href?: string; onClick?: () => void }) {
  const cls = "-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-text-2";
  if (href) {
    return (
      <Link href={href} aria-label="Back" className={cls}>
        {arrow}
      </Link>
    );
  }
  return (
    <button type="button" aria-label="Back" onClick={onClick} className={cls}>
      {arrow}
    </button>
  );
}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css "src/app/(pod)/layout.tsx" "src/app/(pod)/_ui"
git commit -m "Add Linen & Sage tokens, the (pod) layout and shared UI pieces"
```

---

### Task 6: `<PalFace>`, `<SceneSlot>` and `useGuest`

**Files:**
- Create: `src/components/pals/PalFace.tsx`
- Create: `src/components/scene/SceneSlot.tsx`
- Create: `src/app/(pod)/_ui/useGuest.ts`

**Interfaces:**
- Consumes: `Pal` (Task 1), `getSupabase`, `SupabaseConfigError` (Task 2), `ensureGuest` (Task 3)
- Produces: `<PalFace pal size dimmed?>`, `<SceneSlot label?>`, `useGuest(): { status: 'pending' } | { status: 'ready'; userId: string } | { status: 'error'; message: string; retry: () => void }`

- [ ] **Step 1: Create** `src/components/pals/PalFace.tsx`

The numbers are the clean prototype's `palBody()` with `ax = 50, ay = 92` (so the head centre is `50, 47`), cropped to the prototype's seat viewBox `20 22 60 60`. Ink `#3d3934`, paper `#fffdf9`, sage `#a9c4ae`, stripe `#bcd2c0`.

```tsx
import type { Pal } from "@/lib/pals";

const INK = "#3d3934";
const PAPER = "#fffdf9";
const SAGE = "#a9c4ae";

/** Head + shoulders of one pal, drawn once from the shared rig numbers in the clean prototype. */
const FACES: Record<Pal, React.ReactNode> = {
  koala: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill="#7b756d" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M43 62 L50 77 L57 62" fill={PAPER} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="41" y1="63" x2="47" y2="80" stroke={SAGE} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="59" y1="63" x2="53" y2="80" stroke={SAGE} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="35" cy="39" r="10.5" fill="#cfd3d9" stroke={INK} strokeWidth="1.4" />
      <circle cx="65" cy="39" r="10.5" fill="#cfd3d9" stroke={INK} strokeWidth="1.4" />
      <circle cx="35" cy="39" r="5" fill="#f5f5f5" />
      <circle cx="65" cy="39" r="5" fill="#f5f5f5" />
      <circle cx="50" cy="47" r="16" fill="#dfe2e6" stroke={INK} strokeWidth="1.4" />
      <circle cx="44" cy="45" r="1.5" fill={INK} />
      <circle cx="56" cy="45" r="1.5" fill={INK} />
      <circle cx="44" cy="45" r="5" fill="none" stroke={INK} strokeWidth="1.3" />
      <circle cx="56" cy="45" r="5" fill="none" stroke={INK} strokeWidth="1.3" />
      <line x1="49" y1="45" x2="51" y2="45" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="50" cy="53" rx="4.5" ry="5.5" fill={INK} />
    </>
  ),
  cat: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M39 72 L61 72 L63 118 L37 118 Z" fill={INK} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="39" y1="72" x2="44" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="61" y1="72" x2="56" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <polygon points="36,42 38,25 47,34" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="64,42 62,25 53,34" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="50" cy="47" r="15" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      <path d="M37 41 Q42 31 51 33 Q48 39 41 42 Z" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <line x1="41.5" y1="44.5" x2="47" y2="45.4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58.5" y1="44.5" x2="53" y2="45.4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="44.4" cy="46.7" r="1.4" fill={INK} />
      <circle cx="55.6" cy="46.7" r="1.4" fill={INK} />
      <polygon points="48.5,50.5 51.5,50.5 50,52" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M47 54 q1.5 1.2 3 0 q1.5 1.2 3 0" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M43 51 L30 49 M43 53 L30 54 M57 51 L70 49 M57 53 L70 54" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  bunny: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M34.5 68 H65.5 M34.5 76 H65.5 M34.5 84 H65.5" fill="none" stroke="#bcd2c0" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M41 78 L59 78 L61 118 L39 118 Z" fill={INK} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="41" y1="78" x2="44" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="59" y1="78" x2="56" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="44" cy="17" rx="4.8" ry="18" fill={INK} transform="rotate(-9 44 33)" />
      <ellipse cx="57" cy="16" rx="4.8" ry="18" fill={INK} transform="rotate(11 57 33)" />
      <circle cx="50" cy="47" r="15" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      <path d="M41.5 46 q2.8 2.4 5.6 0 M52.9 46 q2.8 2.4 5.6 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="51" r="1.4" fill={INK} stroke={INK} strokeWidth="1.4" />
      <path d="M47.5 54 q2.5 2 5 0" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  dog: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill={SAGE} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M36 65 Q50 76 64 65" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="46" y1="71" x2="45" y2="84" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="54" y1="71" x2="55" y2="84" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="50" cy="47" r="15" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      <path d="M41 35 Q50 28 59 35 Q50 38 41 35 Z" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <circle cx="44.5" cy="45" r="1.7" fill={INK} />
      <circle cx="55.5" cy="45" r="1.7" fill={INK} />
      <ellipse cx="50" cy="51" rx="3.8" ry="2.8" fill={INK} stroke={INK} strokeWidth="1.4" />
      <path d="M47 55.5 q3 2 6 0" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <ellipse cx="35" cy="50" rx="5.8" ry="12.5" fill={INK} transform="rotate(14 35 39)" />
      <ellipse cx="65" cy="50" rx="5.8" ry="12.5" fill={INK} transform="rotate(-14 65 39)" />
    </>
  ),
};

/** A round sand badge with the pal's face. The parent carries the accessible label. */
export function PalFace({ pal, size, dimmed = false }: { pal: Pal; size: number; dimmed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 overflow-hidden rounded-full bg-sand"
      style={{
        width: size,
        height: size,
        filter: dimmed ? "grayscale(1) contrast(.55) brightness(1.1)" : undefined,
        opacity: dimmed ? 0.9 : 1,
      }}
    >
      <svg viewBox="20 22 60 60" width={size} height={size} className="block">
        {FACES[pal]}
      </svg>
    </span>
  );
}
```

- [ ] **Step 2: Create** `src/components/scene/SceneSlot.tsx`

```tsx
/** Where Ashna's studio scene will go. Fixed aspect ratio so layouts don't jump when it arrives. */
export function SceneSlot({ label = "Studio scene (Ashna)" }: { label?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="my-2 grid aspect-[372/300] w-full place-items-center rounded-3xl border border-dashed border-[rgba(61,57,52,.25)] text-[13px] text-muted"
    >
      {label}
    </div>
  );
}
```

- [ ] **Step 3: Create** `src/app/(pod)/_ui/useGuest.ts`

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureGuest } from "@/lib/supabase/auth";
import { getSupabase, SupabaseConfigError } from "@/lib/supabase/client";

export type Guest =
  | { status: "pending" }
  | { status: "ready"; userId: string }
  | { status: "error"; message: string; retry: () => void };

const NETWORK = "Can't reach Focuspal right now.";
const DISABLED = "Guest sign-in is turned off for this project.";

/** Signs in silently on mount (PRD §9). Screens show "One moment…" while pending. */
export function useGuest(): Guest {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Guest>({ status: "pending" });
  const retry = useCallback(() => {
    setState({ status: "pending" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      let next: Guest;
      try {
        const r = await ensureGuest(getSupabase());
        next =
          "userId" in r
            ? { status: "ready", userId: r.userId }
            : { status: "error", message: r.error === "guest_signin_disabled" ? DISABLED : NETWORK, retry };
      } catch (e) {
        next = { status: "error", message: e instanceof SupabaseConfigError ? e.message : NETWORK, retry };
      }
      if (live) setState(next);
    })();
    return () => {
      live = false;
    };
  }, [attempt, retry]);

  return state;
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/pals/PalFace.tsx src/components/scene/SceneSlot.tsx "src/app/(pod)/_ui/useGuest.ts"
git commit -m "Add PalFace, SceneSlot and the guest sign-in hook"
```

---

### Task 7: Home

**Files:**
- Create: `src/app/(pod)/home/page.tsx`

**Interfaces:**
- Consumes: `Screen`, `Grow`, `PrimaryButton`, `TextButton` (Task 5), `SceneSlot` (Task 6)

- [ ] **Step 1: Create** `src/app/(pod)/home/page.tsx`

```tsx
import Link from "next/link";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { TextButton } from "../_ui/Buttons";
import { Grow, Screen } from "../_ui/Screen";

export default function HomePage() {
  return (
    <Screen nav={<span className="display text-[21px] font-medium">Focuspal</span>}>
      <Grow />
      <SceneSlot />
      <h1 className="display mt-2 text-center text-[32px] font-medium leading-[1.08] tracking-[-.3px]">
        A little company.
        <br />
        A lot more focus.
      </h1>
      <Grow />
      <Link
        href="/new"
        className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-sage text-base font-semibold text-on-sage active:scale-[.985]"
      >
        Start a pod
      </Link>
      <TextButton disabled>I have a link</TextButton>
    </Screen>
  );
}
```

("I have a link" stays disabled until piece 2, as the spec says.)

- [ ] **Step 2: See it**

Run: `npm run dev` in the background, open `http://localhost:3000/home`.
Expected: linen background, the "Focuspal" wordmark in Fraunces, the dashed scene slot, the two-line headline, a sage "Start a pod" pill and a greyed "I have a link". No console errors. Stop the dev server after.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(pod)/home/page.tsx"
git commit -m "Add Home"
```

---

### Task 8: Start a pod and Take your seat (`/new`)

**Files:**
- Create: `src/app/(pod)/new/TakeYourSeat.tsx`
- Create: `src/app/(pod)/new/NewPod.tsx`
- Create: `src/app/(pod)/new/page.tsx`

**Interfaces:**
- Consumes: `Chips`, `Field`, `PrimaryButton`, `BackButton`, `Screen`, `Grow`, `useGuest` (Tasks 5–6), `PalFace` (Task 6), `PALS`, `PAL_LABEL`, `LIMITS`, validators (Task 1), `createPod`, `getMyProfile`, `podErrorMessage` (Task 4), `getSupabase` (Task 2), clock presets from `@/lib/clock`
- Produces: `<TakeYourSeat takenBy? defaults onSubmit submitting error subtitle?>` with `defaults: { pal: Pal | null; name: string; focus: string }`, `onSubmit(v: { pal: Pal; name: string; focus: string })`. Piece 2 reuses it for guests.

Read first: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`.

- [ ] **Step 1: Create** `src/app/(pod)/new/TakeYourSeat.tsx`

```tsx
"use client";

import { useState } from "react";
import { PalFace } from "@/components/pals/PalFace";
import { LIMITS, PAL_LABEL, PALS, type Pal, validateDisplayName, validateFocusText } from "@/lib/pals";
import { PrimaryButton } from "../_ui/Buttons";
import { Field } from "../_ui/Field";
import { Grow } from "../_ui/Screen";

export type SeatValues = { pal: Pal; name: string; focus: string };

export function TakeYourSeat({
  takenBy = {},
  defaults,
  subtitle,
  onSubmit,
  submitting,
  submitLabel = "Sit down",
  error,
}: {
  /** Pals already seated in this pod, with who has them. Those seats are shown greyed and can't be picked. */
  takenBy?: Partial<Record<Pal, string>>;
  defaults: { pal: Pal | null; name: string; focus: string };
  subtitle?: string;
  onSubmit: (v: SeatValues) => void;
  submitting: boolean;
  submitLabel?: string;
  error?: string | null;
}) {
  const [pal, setPal] = useState<Pal | null>(defaults.pal && !takenBy[defaults.pal] ? defaults.pal : null);
  const [name, setName] = useState(defaults.name);
  const [focus, setFocus] = useState(defaults.focus);
  const [touched, setTouched] = useState({ name: false, focus: false });

  const nameHint = validateDisplayName(name);
  const focusHint = validateFocusText(focus);
  const valid = pal !== null && !nameHint && !focusHint;

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched({ name: true, focus: true });
        if (valid && pal) onSubmit({ pal, name: name.trim(), focus: focus.trim() });
      }}
    >
      <div className="mt-3.5 text-center">
        <h1 className="display text-[32px] font-medium leading-[1.08] tracking-[-.3px]">Take your seat.</h1>
        {subtitle ? <p className="display mt-2 text-base text-sage">{subtitle}</p> : null}
      </div>

      <div role="radiogroup" aria-label="Your pal" className="mt-5 grid grid-cols-2 gap-3.5">
        {PALS.map((p) => {
          const taken = takenBy[p];
          const on = pal === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={taken ? true : undefined}
              onClick={() => !taken && setPal(p)}
              className={`grid justify-items-center gap-2 rounded-3xl p-1 ${taken ? "cursor-not-allowed" : ""}`}
            >
              <span className={`rounded-full ${on ? "shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--accent)]" : ""}`}>
                <PalFace pal={p} size={92} dimmed={Boolean(taken)} />
              </span>
              <span className={`text-sm ${taken ? "font-medium text-muted" : "font-semibold"}`}>{PAL_LABEL[p]}</span>
              {taken ? <span className="-mt-1.5 text-[12.5px] text-muted">{taken}</span> : null}
            </button>
          );
        })}
      </div>

      <Field
        id="seat-name"
        label="Your name"
        value={name}
        onChange={(v) => {
          setName(v);
          setTouched((t) => ({ ...t, name: true }));
        }}
        hint={touched.name ? nameHint : null}
        maxLength={LIMITS.displayName + 4}
        autoComplete="nickname"
      />
      <Field
        id="seat-focus"
        label="What are you working on?"
        value={focus}
        onChange={(v) => {
          setFocus(v);
          setTouched((t) => ({ ...t, focus: true }));
        }}
        hint={touched.focus ? focusHint : null}
        maxLength={LIMITS.focusText + 4}
      />

      <Grow />
      {error ? (
        <p role="alert" className="mb-3 text-center text-[14px] text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-5">
        <PrimaryButton type="submit" disabled={!valid || submitting}>
          {submitting ? "One moment…" : submitLabel}
        </PrimaryButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create** `src/app/(pod)/new/NewPod.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BREAK_OPTIONS,
  DEFAULT_PRESET,
  FOCUS_OPTIONS,
  formatTogether,
  MIN_MS,
  ROUND_OPTIONS,
  sessionTotalMs,
  type Preset,
} from "@/lib/clock";
import { LIMITS, type Pal, validatePodName } from "@/lib/pals";
import { getSupabase } from "@/lib/supabase/client";
import { createPod, getMyProfile, podErrorMessage } from "@/lib/supabase/pods";
import { BackButton, PrimaryButton } from "../_ui/Buttons";
import { Chips } from "../_ui/Chips";
import { Field } from "../_ui/Field";
import { Grow, Screen } from "../_ui/Screen";
import { useGuest } from "../_ui/useGuest";
import { type SeatValues, TakeYourSeat } from "./TakeYourSeat";

const min = (v: number) => `${v} min`;
const plain = (v: number) => String(v);

/** Steps 1 and 2 are one client page, so nothing typed on step 1 is lost when going back from step 2. */
export function NewPod() {
  const router = useRouter();
  const guest = useGuest();
  const [step, setStep] = useState<1 | 2>(1);
  const [podName, setPodName] = useState("The afternoon pod");
  const [nameTouched, setNameTouched] = useState(false);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [defaults, setDefaults] = useState<{ pal: Pal | null; name: string; focus: string }>({ pal: null, name: "", focus: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill the seat from an existing profile (a returning guest).
  useEffect(() => {
    if (guest.status !== "ready") return;
    let live = true;
    getMyProfile(getSupabase(), guest.userId).then((p) => {
      if (live && p) setDefaults((d) => ({ ...d, pal: p.animal, name: p.name }));
    });
    return () => {
      live = false;
    };
  }, [guest]);

  const nameHint = validatePodName(podName);

  async function sitDown(v: SeatValues) {
    setSubmitting(true);
    setError(null);
    const r = await createPod(getSupabase(), {
      name: podName.trim(),
      focusMin: preset.focusMin,
      breakMin: preset.breakMin,
      rounds: preset.rounds,
      animal: v.pal,
      displayName: v.name,
      focusText: v.focus,
    });
    if ("slug" in r) {
      router.push(`/p/${r.slug}`);
      return;
    }
    setSubmitting(false);
    setError(podErrorMessage(r.error));
  }

  if (guest.status === "error") {
    return (
      <Screen nav={<BackButton href="/home" />}>
        <Grow />
        <p className="display text-center text-[24px]">{guest.message}</p>
        <Grow />
        <PrimaryButton onClick={guest.retry}>Try again</PrimaryButton>
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen nav={<BackButton onClick={() => setStep(1)} />}>
        <TakeYourSeat
          key={`${defaults.pal}-${defaults.name}`}
          defaults={defaults}
          onSubmit={sitDown}
          submitting={submitting || guest.status === "pending"}
          error={error}
        />
      </Screen>
    );
  }

  return (
    <Screen nav={<BackButton href="/home" />}>
      <h1 className="display text-[32px] font-medium leading-[1.08] tracking-[-.3px]">Start a pod</h1>
      <Field
        id="pod-name"
        label="Name"
        value={podName}
        onChange={(v) => {
          setPodName(v);
          setNameTouched(true);
        }}
        hint={nameTouched ? nameHint : null}
        maxLength={LIMITS.podName + 4}
      />
      <Chips label="Focus" options={FOCUS_OPTIONS} value={preset.focusMin} format={min} onChange={(focusMin) => setPreset({ ...preset, focusMin })} />
      <Chips label="Break" options={BREAK_OPTIONS} value={preset.breakMin} format={min} onChange={(breakMin) => setPreset({ ...preset, breakMin })} />
      <Chips label="Rounds" options={ROUND_OPTIONS} value={preset.rounds} format={plain} onChange={(rounds) => setPreset({ ...preset, rounds })} />
      <p className="mt-[26px] text-center text-[15px] text-text-2">
        <b className="font-semibold text-text">{formatTogether(sessionTotalMs(preset) / MIN_MS)}</b> together
      </p>
      <Grow />
      <PrimaryButton
        disabled={Boolean(nameHint)}
        onClick={() => {
          setNameTouched(true);
          if (!nameHint) setStep(2);
        }}
      >
        {guest.status === "pending" ? "One moment…" : "Continue"}
      </PrimaryButton>
    </Screen>
  );
}
```

- [ ] **Step 3: Create** `src/app/(pod)/new/page.tsx`

```tsx
import type { Metadata } from "next";
import { NewPod } from "./NewPod";

export const metadata: Metadata = { title: "Start a pod · Focuspal" };

export default function NewPodPage() {
  return <NewPod />;
}
```

- [ ] **Step 4: Type-check, lint, and click through**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

Then `npm run dev`, open `http://localhost:3000/new`:
- Clearing the name greys **Continue** and shows "Give your pod a name" under the field.
- Changing chips updates the total ("55 minutes together" → "1h 15m together" for 45/5×2… check `formatTogether`).
- **Continue** → Take your seat. **Sit down** stays greyed until a pal and a name are set. The back arrow returns to step 1 with the settings intact.
- **Sit down** (with `.env.local` filled and the migration applied) navigates to `/p/<6-char slug>` (a 404 for now; Task 9 adds the page).
- Reload `/new`: the pal and name are prefilled from `profiles`.

Stop the dev server after.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(pod)/new"
git commit -m "Add Start a pod and Take your seat"
```

---

### Task 9: Lobby (`/p/[slug]`)

**Files:**
- Create: `src/app/(pod)/p/[slug]/Lobby.tsx`
- Create: `src/app/(pod)/p/[slug]/page.tsx`

**Interfaces:**
- Consumes: `useGuest`, `Screen`, `Grow`, `BackButton`, `PrimaryButton`, `TextButton` (Tasks 5–6), `PalFace`, `SceneSlot` (Task 6), `getPod` (Task 4), `getSupabase` (Task 2), `Pod`, `PodMember` (Task 2)

Read first: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (`params` is a Promise; `PageProps<'/p/[slug]'>`).

- [ ] **Step 1: Create** `src/app/(pod)/p/[slug]/Lobby.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { PalFace } from "@/components/pals/PalFace";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { getSupabase } from "@/lib/supabase/client";
import { getPod } from "@/lib/supabase/pods";
import type { Pod, PodMember } from "@/lib/supabase/types";
import { BackButton, PrimaryButton, TextButton } from "../../_ui/Buttons";
import { Grow, Screen } from "../../_ui/Screen";
import { useGuest } from "../../_ui/useGuest";

const SEATS = 4;
type Loaded = { status: "loading" } | { status: "found"; pod: Pod; members: PodMember[] } | { status: "private" };

function InviteRow({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/p/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (insecure context, permissions): select the text so it can be copied by hand.
      const range = document.createRange();
      if (textRef.current) range.selectNodeContents(textRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }

  return (
    <div className="my-4 flex items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pl-[18px] pr-1.5">
      <span ref={textRef} className="flex-1 truncate text-sm text-text-2">
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        onClick={copy}
        className="min-h-10 rounded-full bg-sage-soft px-4 text-[13.5px] font-semibold text-sage-deep"
        aria-live="polite"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

export function Lobby({ slug }: { slug: string }) {
  const guest = useGuest();
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (guest.status !== "ready") return;
    let live = true;
    getPod(getSupabase(), slug).then((r) => {
      if (live) setState(r ? { status: "found", ...r } : { status: "private" });
    });
    return () => {
      live = false;
    };
  }, [guest, slug]);

  if (guest.status === "error") {
    return (
      <Screen nav={<BackButton href="/home" />}>
        <Grow />
        <p className="display text-center text-[24px]">{guest.message}</p>
        <Grow />
        <PrimaryButton onClick={guest.retry}>Try again</PrimaryButton>
      </Screen>
    );
  }

  if (state.status === "private") {
    return (
      <Screen nav={<BackButton href="/home" />}>
        <Grow />
        <p className="display text-center text-[24px]">This pod is private for now.</p>
        <Grow />
        <TextButton href="/home">Back home</TextButton>
      </Screen>
    );
  }

  if (state.status === "loading" || guest.status !== "ready") {
    return (
      <Screen nav={<BackButton href="/home" />}>
        <Grow />
        <p className="text-center text-[15px] text-muted">One moment…</p>
        <Grow />
      </Screen>
    );
  }

  const { pod, members } = state;
  const me = guest.userId;
  const empty = Math.max(0, SEATS - members.length);

  return (
    <Screen
      nav={
        <>
          <BackButton href="/home" />
          <span className="text-sm text-text-2">{pod.name}</span>
          <span className="w-[34px]" aria-hidden="true" />
        </>
      }
    >
      <h1 className="display text-center text-[32px] font-medium leading-[1.08] tracking-[-.3px]">Your table is set.</h1>
      <SceneSlot />
      <ul className="mt-1.5 flex justify-center gap-[18px]" aria-label="Who's here">
        {members.map((m) => {
          const tags = [m.user_id === me ? "You" : null, m.user_id === pod.host_id ? "Host" : null].filter(Boolean);
          return (
            <li key={m.user_id} className="grid justify-items-center gap-1.5 text-[12.5px] text-text-2">
              <PalFace pal={m.animal} size={44} />
              <span>{m.user_id === me ? "You" : m.display_name}</span>
              {tags.length ? <span className="-mt-1 text-[11.5px] text-muted">{tags.join(" · ")}</span> : null}
            </li>
          );
        })}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`open-${i}`} className="grid justify-items-center gap-1.5 text-[12.5px] text-text-2">
            <span className="block h-11 w-11 rounded-full border-[1.5px] border-dashed border-[rgba(61,57,52,.25)]" aria-hidden="true" />
            <span>Open</span>
          </li>
        ))}
      </ul>
      <Grow />
      <InviteRow slug={pod.slug} />
      <PrimaryButton disabled>Start focusing</PrimaryButton>
      <p className="mt-2 text-center text-[13px] text-muted">Sessions arrive soon</p>
    </Screen>
  );
}
```

- [ ] **Step 2: Create** `src/app/(pod)/p/[slug]/page.tsx`

```tsx
import type { Metadata } from "next";
import { Lobby } from "./Lobby";

export const metadata: Metadata = { title: "Your pod · Focuspal" };

export default async function PodPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  return <Lobby slug={slug} />;
}
```

- [ ] **Step 3: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: no errors; the build lists `/home`, `/new`, `/p/[slug]`, `/cover`, `/solo`.

- [ ] **Step 4: Click through end to end**

`npm run dev`, then:
1. `/home` → **Start a pod** → **Continue** → pick a pal, type a name → **Sit down** → lands on `/p/<slug>` showing "Your table is set.", the pod name in the nav, your face with "You · Host", three "Open" seats, the invite row with the current origin, and **Copy link** → "Copied" for 2 s.
2. Reload: still the same guest, still "You · Host".
3. Open the same URL in a private window: "This pod is private for now." with **Back home**.
4. `/p/zzzzzz`: the same private screen.

Stop the dev server after.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(pod)/p"
git commit -m "Add the Lobby"
```

---

### Task 10: Setup doc and manual checklist

**Files:**
- Create: `docs/supabase-setup.md`

- [ ] **Step 1: Write** `docs/supabase-setup.md`

```markdown
# Supabase setup (milestone 2)

Focuspal uses a hosted Supabase project. Migrations are plain SQL you paste into the SQL editor; each file is safe to run again.

## One-time setup

1. Create a project at supabase.com. Any region.
2. **Authentication → Providers → Anonymous sign-ins: on.** Guests use this. (The app shows "Guest sign-in is turned off for this project." if it's off.)
3. **SQL Editor → New query**, paste `supabase/migrations/0001_pods.sql`, Run. Expect "Success. No rows returned".
4. **Project Settings → API**: copy the project URL and the publishable key into `.env.local` (see `.env.local.example`). Restart `npm run dev` after editing it.

## Manual checklist (piece 1)

Click-through, in a normal window:

- [ ] `/home` → **Start a pod** → **Continue** → choose a pal and a name → **Sit down** → the Lobby shows you as "You · Host", three "Open" seats, and **Copy link** reads "Copied" for 2 s.
- [ ] Reload the Lobby: same guest, still the host.
- [ ] Open the lobby link in a private window: "This pod is private for now." with **Back home**.
- [ ] Clear the pod name on Start a pod: **Continue** is greyed and the hint appears.

SQL editor checks. Run each as the `authenticated` role with a fake JWT, replacing `<uid>` with a real `auth.users.id` from **Authentication → Users**:

```sql
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uid>","role":"authenticated"}', true);

-- [ ] can read own profile only
select * from public.profiles;                     -- 0 or 1 row, never another user's

-- [ ] can read only pods you sit in
select slug from public.pods;                      -- only your pods

-- [ ] direct writes are denied
insert into public.pods (slug, name, host_id, focus_min, break_min, rounds)
  values ('zzzzzz', 'x', '<uid>', 25, 5, 2);       -- ERROR: permission denied for table pods

reset role;
```

## Resetting

`drop table public.pod_members, public.pods, public.profiles cascade;` then re-run `0001_pods.sql`.
```

- [ ] **Step 2: Run the whole suite one last time**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: 70 tests pass, no type or lint errors.

- [ ] **Step 3: Commit**

```bash
git add docs/supabase-setup.md
git commit -m "Add Supabase setup doc and manual checklist"
```

---

## Self-review notes

- **Spec coverage:** guest sign-in (T3, T6), Home (T7), Start a pod + Take your seat as one page with prefill and form rules (T8), Lobby with faces, You/Host, Open seats, invite row and disabled Start (T9), private-pod screen (T9), sign-in pending/error states with Try again (T6, T8, T9), `pals.ts` and the three lib modules with the listed tests (T1–T4), `PalFace` and `SceneSlot` (T6), `_ui` pieces and the `.linen` layout (T5), setup doc and manual checklist (T10). `/` rewrite untouched.
- **Type consistency:** `SeatValues`/`TakeYourSeat` props match between T8 files; `getPod` returns `{ pod, members }` used in T9; `PodError` codes match the SQL `raise exception` strings in `0001_pods.sql`.
- **Not covered on purpose:** `LayoutProps`/`PageProps` are generated globals; if `tsc` runs before any `next dev`, run `npx next typegen`.
