"use client";

import { useState } from "react";
import { MONTH_NAMES, monthGrid, stepMonth, WEEKDAY_INITIALS } from "@/lib/calendar";

const arrow = (dir: "prev" | "next") => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "prev" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
  </svg>
);

/** The days you kept a pot, marked. Arrows step through months; future months are simply empty. */
export function Calendar({ marked, today, initialYear, initialMonth }: { marked: Set<string>; today: string; initialYear: number; initialMonth: number }) {
  const [at, setAt] = useState({ year: initialYear, month: initialMonth });
  const weeks = monthGrid(at.year, at.month);

  return (
    <section className="mt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setAt(stepMonth(at.year, at.month, -1))}
          className="-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-text-2"
        >
          {arrow("prev")}
        </button>
        <h2 className="display text-[19px] font-medium" aria-live="polite">
          {MONTH_NAMES[at.month]} {at.year}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setAt(stepMonth(at.year, at.month, 1))}
          className="-mr-2.5 grid h-11 w-11 place-items-center rounded-full text-text-2"
        >
          {arrow("next")}
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={i} className="py-1 text-[12px] font-medium text-muted" aria-hidden="true">
            {w}
          </span>
        ))}
        {weeks.flat().map((d) => {
          const on = marked.has(d.date);
          return (
            <span key={d.date} className="grid place-items-center py-0.5">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-[13.5px] ${
                  on ? "bg-sage font-semibold text-on-sage" : d.inMonth ? "text-text-2" : "text-muted opacity-45"
                } ${d.date === today && !on ? "ring-1 ring-sage" : ""}`}
              >
                {d.day}
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
