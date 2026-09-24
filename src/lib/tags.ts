/** The kind of work you're sitting down to do, so your pod knows what quiet you need. */
export const TAGS = ["Deep work", "Writing", "Code", "Design", "Study", "Admin", "Reading", "Planning"] as const;
export type Tag = (typeof TAGS)[number];

export const MAX_TAGS = 3;

export function isTag(v: unknown): v is Tag {
  return typeof v === "string" && (TAGS as readonly string[]).includes(v);
}

/** Matches the check in supabase/migrations/0003_tags.sql. Returns the hint, or null when valid. */
export function validateTags(tags: string[]): string | null {
  if (tags.length > MAX_TAGS) return `Pick up to ${MAX_TAGS}`;
  if (tags.some((t) => !isTag(t))) return "Pick from the list";
  if (new Set(tags).size !== tags.length) return "Pick from the list";
  return null;
}

/** Adds or removes a tag, keeping the pick order and the limit. */
export function toggleTag(tags: Tag[], tag: Tag): Tag[] {
  if (tags.includes(tag)) return tags.filter((t) => t !== tag);
  return tags.length >= MAX_TAGS ? tags : [...tags, tag];
}
