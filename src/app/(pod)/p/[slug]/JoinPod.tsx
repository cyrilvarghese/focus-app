"use client";

import { useEffect, useState } from "react";
import { listNames } from "@/lib/session/copy";
import { getSupabase } from "@/lib/supabase/client";
import { joinErrorMessage, joinPod, type PodPreview } from "@/lib/supabase/join";
import { getMyProfile } from "@/lib/supabase/pods";
import type { Pal } from "@/lib/pals";
import type { Tag } from "@/lib/tags";
import { BackButton, TextButton } from "../../_ui/Buttons";
import { Grow, Screen } from "../../_ui/Screen";
import { type SeatValues, TakeYourSeat } from "../../new/TakeYourSeat";

/** A friend arriving through the link: pick a free pal and sit down. */
export function JoinPod({ preview, me, onJoined }: { preview: PodPreview; me: string; onJoined: () => void }) {
  const [defaults, setDefaults] = useState<{ pal: Pal | null; name: string; focus: string; tags: Tag[] }>({
    pal: null,
    name: "",
    focus: "",
    tags: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from an earlier visit, unless that pal is taken here.
  useEffect(() => {
    let live = true;
    getMyProfile(getSupabase(), me).then((p) => {
      if (live && p) setDefaults((d) => ({ ...d, pal: p.animal, name: p.name }));
    });
    return () => {
      live = false;
    };
  }, [me]);

  if (preview.full) {
    return (
      <Screen nav={<BackButton href="/" />}>
        <Grow />
        <p className="display text-center text-[24px]">This pod is full.</p>
        <Grow />
        <TextButton href="/">Back home</TextButton>
      </Screen>
    );
  }

  const seated = preview.seated;
  const subtitle = seated.length ? `${listNames(seated)} ${seated.length > 1 ? "are" : "is"} here` : "You're the first one here";

  async function sitDown(v: SeatValues) {
    setSubmitting(true);
    setError(null);
    const r = await joinPod(getSupabase(), {
      slug: preview.slug,
      animal: v.pal,
      displayName: v.name,
      focusText: v.focus,
      tags: v.tags,
    });
    if ("ok" in r) {
      onJoined();
      return;
    }
    setSubmitting(false);
    setError(joinErrorMessage(r.error));
  }

  return (
    <Screen nav={<BackButton href="/" />}>
      <TakeYourSeat
        key={`${defaults.pal}-${defaults.name}`}
        takenBy={preview.takenBy}
        defaults={defaults}
        subtitle={subtitle}
        onSubmit={sitDown}
        submitting={submitting}
        error={error}
      />
    </Screen>
  );
}
