import type { SupabaseClient } from "@supabase/supabase-js";
import { isPal, type Pal } from "../pals";

/** What someone holding the link sees before they sit down. */
export type PodPreview = {
  slug: string;
  name: string;
  /** The organizer's first name, or null if the pod somehow has no host row. */
  hostName: string | null;
  /** Who is seated, by pal. */
  takenBy: Partial<Record<Pal, string>>;
  /** First names of everyone seated, in the order they sat down. */
  seated: string[];
  full: boolean;
  isMember: boolean;
};

const JOIN_ERRORS = [
  "not_signed_in",
  "pod_not_found",
  "pod_full",
  "pal_taken",
  "invalid_animal",
  "invalid_display_name",
  "invalid_focus_text",
  "invalid_tags",
  "network",
] as const;
export type JoinError = (typeof JOIN_ERRORS)[number];

const failure = (e: { message: string } | null): { error: JoinError } => ({
  error: e && (JOIN_ERRORS as readonly string[]).includes(e.message) ? (e.message as JoinError) : "network",
});

type PreviewJson = {
  slug: string;
  name: string;
  host_name: string | null;
  members: { animal: string; display_name: string }[];
  full: boolean;
  is_member: boolean;
};

/** Null when the link doesn't match a pod. */
export async function getPodPreview(client: SupabaseClient, slug: string): Promise<PodPreview | null> {
  try {
    const { data, error } = await client.rpc("pod_preview", { p_slug: slug });
    if (error || !data || typeof data !== "object") return null;
    const p = data as PreviewJson;
    const takenBy: Partial<Record<Pal, string>> = {};
    for (const m of p.members ?? []) if (isPal(m.animal)) takenBy[m.animal] = m.display_name;
    return {
      slug: p.slug,
      name: p.name,
      hostName: p.host_name,
      takenBy,
      seated: (p.members ?? []).map((m) => m.display_name),
      full: Boolean(p.full),
      isMember: Boolean(p.is_member),
    };
  } catch {
    return null;
  }
}

export type JoinInput = { slug: string; animal: Pal; displayName: string; focusText: string; tags: string[] };

/** Takes a free seat. Joining a pod you're already in just updates your details. */
export async function joinPod(client: SupabaseClient, input: JoinInput): Promise<{ ok: true } | { error: JoinError }> {
  try {
    const { error } = await client.rpc("join_pod", {
      p_slug: input.slug,
      p_animal: input.animal,
      p_display_name: input.displayName,
      p_focus_text: input.focusText,
      p_tags: input.tags,
    });
    return error ? failure(error) : { ok: true };
  } catch {
    return { error: "network" };
  }
}

export function joinErrorMessage(code: JoinError): string {
  switch (code) {
    case "not_signed_in":
      return "You're not signed in yet. Try again in a moment.";
    case "pod_not_found":
      return "We couldn't find that pod.";
    case "pod_full":
      return "This pod is full.";
    case "pal_taken":
      return "Someone just took that pal. Pick another.";
    case "invalid_animal":
      return "Pick a pal.";
    case "invalid_display_name":
      return "Add your name (up to 24 characters).";
    case "invalid_focus_text":
      return "Keep what you're working on under 80 characters.";
    case "invalid_tags":
      return "Pick up to three tags from the list.";
    case "network":
      return "Can't reach Focuspal right now.";
  }
}
