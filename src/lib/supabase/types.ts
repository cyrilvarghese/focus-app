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
  /** Up to three, from src/lib/tags.ts. */
  tags: string[];
  joined_at: string;
};
