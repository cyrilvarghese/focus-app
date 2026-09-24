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
  tags: string[];
};

const POD_ERRORS = [
  "not_signed_in",
  "invalid_name",
  "invalid_preset",
  "invalid_animal",
  "invalid_display_name",
  "invalid_focus_text",
  "invalid_tags",
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
      p_tags: input.tags,
    });
    if (error) return { error: isPodError(error.message) ? error.message : "network" };
    if (typeof data !== "string") return { error: "network" };
    return { slug: data };
  } catch {
    return { error: "network" };
  }
}

const POD_COLUMNS =
  "id, slug, name, host_id, focus_min, break_min, rounds, pod_members(user_id, display_name, animal, focus_text, tags, joined_at)";

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
    case "invalid_tags":
      return "Pick up to three tags from the list.";
    case "slug_exhausted":
      return "Couldn't find a free link. Try again.";
    case "network":
      return "Can't reach Focuspal right now.";
  }
}
