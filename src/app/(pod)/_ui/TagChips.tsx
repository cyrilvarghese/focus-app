"use client";

import { MAX_TAGS, type Tag, TAGS, toggleTag } from "@/lib/tags";

/** Pick up to three kinds of work. Chips that would go over the limit are dimmed rather than hidden. */
export function TagChips({ value, onChange }: { value: Tag[]; onChange: (tags: Tag[]) => void }) {
  const full = value.length >= MAX_TAGS;
  return (
    <div className="mt-[22px]">
      <p className="mb-2 text-[13.5px] font-medium text-text-2" id="tags-label">
        Tags
      </p>
      <div className="flex flex-wrap gap-2.5" role="group" aria-labelledby="tags-label" aria-describedby="tags-hint">
        {TAGS.map((t) => {
          const on = value.includes(t);
          const blocked = full && !on;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              aria-disabled={blocked || undefined}
              onClick={() => !blocked && onChange(toggleTag(value, t))}
              className={`min-h-11 rounded-full border px-5 text-[15px] ${
                on
                  ? "border-sage-soft bg-sage-soft font-semibold text-sage-deep"
                  : `border-line bg-card font-medium text-text ${blocked ? "opacity-45" : ""}`
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <p id="tags-hint" className="mt-2 text-[13.5px] leading-snug text-text-2">
        Pick up to three, so your pod knows the kind of quiet you need.
      </p>
    </div>
  );
}
