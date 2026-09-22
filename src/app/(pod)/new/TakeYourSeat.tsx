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
