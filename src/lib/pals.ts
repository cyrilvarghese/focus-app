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
