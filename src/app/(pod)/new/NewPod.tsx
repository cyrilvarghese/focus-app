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
import type { Tag } from "@/lib/tags";
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
  const [defaults, setDefaults] = useState<{ pal: Pal | null; name: string; focus: string; tags: Tag[] }>({ pal: null, name: "", focus: "", tags: [] });
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
      tags: v.tags,
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
      <Screen nav={<BackButton href="/" />}>
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
    <Screen nav={<BackButton href="/" />}>
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
