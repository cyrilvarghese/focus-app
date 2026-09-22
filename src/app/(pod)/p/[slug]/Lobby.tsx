"use client";

import { useEffect, useRef, useState } from "react";
import { PalFace } from "@/components/pals/PalFace";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { getSupabase } from "@/lib/supabase/client";
import { getPod } from "@/lib/supabase/pods";
import type { Pod, PodMember } from "@/lib/supabase/types";
import { BackButton, PrimaryButton, TextButton } from "../../_ui/Buttons";
import { Grow, Screen } from "../../_ui/Screen";
import { useGuest } from "../../_ui/useGuest";

const SEATS = 4;
type Loaded = { status: "loading" } | { status: "found"; pod: Pod; members: PodMember[] } | { status: "private" };

function InviteRow({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  // Only rendered once the pod has loaded on the client, so window is available.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/p/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (insecure context, permissions): select the text so it can be copied by hand.
      const range = document.createRange();
      if (textRef.current) range.selectNodeContents(textRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }

  return (
    <div className="my-4 flex items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pl-[18px] pr-1.5">
      <span ref={textRef} className="flex-1 truncate text-sm text-text-2">
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        onClick={copy}
        className="min-h-10 rounded-full bg-sage-soft px-4 text-[13.5px] font-semibold text-sage-deep"
        aria-live="polite"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

export function Lobby({ slug }: { slug: string }) {
  const guest = useGuest();
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (guest.status !== "ready") return;
    let live = true;
    getPod(getSupabase(), slug).then((r) => {
      if (live) setState(r ? { status: "found", ...r } : { status: "private" });
    });
    return () => {
      live = false;
    };
  }, [guest, slug]);

  if (guest.status === "error") {
    return (
      <Screen nav={<BackButton href="/home" />}>
        <Grow />
        <p className="display text-center text-[24px]">{guest.message}</p>
        <Grow />
        <PrimaryButton onClick={guest.retry}>Try again</PrimaryButton>
      </Screen>
    );
  }

  if (state.status === "private") {
    return (
      <Screen nav={<BackButton href="/home" />}>
        <Grow />
        <p className="display text-center text-[24px]">This pod is private for now.</p>
        <Grow />
        <TextButton href="/home">Back home</TextButton>
      </Screen>
    );
  }

  if (state.status === "loading" || guest.status !== "ready") {
    return (
      <Screen nav={<BackButton href="/home" />}>
        <Grow />
        <p className="text-center text-[15px] text-muted">One moment…</p>
        <Grow />
      </Screen>
    );
  }

  const { pod, members } = state;
  const me = guest.userId;
  const empty = Math.max(0, SEATS - members.length);

  return (
    <Screen
      nav={
        <>
          <BackButton href="/home" />
          <span className="text-sm text-text-2">{pod.name}</span>
          <span className="w-[34px]" aria-hidden="true" />
        </>
      }
    >
      <h1 className="display text-center text-[32px] font-medium leading-[1.08] tracking-[-.3px]">Your table is set.</h1>
      <SceneSlot />
      <ul className="mt-1.5 flex justify-center gap-[18px]" aria-label="Who's here">
        {members.map((m) => {
          const tags = [m.user_id === me ? "You" : null, m.user_id === pod.host_id ? "Host" : null].filter(Boolean);
          return (
            <li key={m.user_id} className="grid justify-items-center gap-1.5 text-[12.5px] text-text-2">
              <PalFace pal={m.animal} size={44} />
              <span>{m.user_id === me ? "You" : m.display_name}</span>
              {tags.length ? <span className="-mt-1 text-[11.5px] text-muted">{tags.join(" · ")}</span> : null}
            </li>
          );
        })}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`open-${i}`} className="grid justify-items-center gap-1.5 text-[12.5px] text-text-2">
            <span className="block h-11 w-11 rounded-full border-[1.5px] border-dashed border-[rgba(61,57,52,.25)]" aria-hidden="true" />
            <span>Open</span>
          </li>
        ))}
      </ul>
      <Grow />
      <InviteRow slug={pod.slug} />
      <PrimaryButton disabled>Start focusing</PrimaryButton>
      <p className="mt-2 text-center text-[13px] text-muted">Sessions arrive soon</p>
    </Screen>
  );
}
