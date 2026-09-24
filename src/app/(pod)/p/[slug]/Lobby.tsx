"use client";

import { useEffect, useRef, useState } from "react";
import { PalFace } from "@/components/pals/PalFace";
import { StudioScene } from "@/components/scene/StudioScene";
import { getSupabase } from "@/lib/supabase/client";
import { getPodPreview, type PodPreview } from "@/lib/supabase/join";
import { watchPod } from "@/lib/supabase/live";
import { getPod } from "@/lib/supabase/pods";
import { getOpenSession, type SessionRow, sessionErrorMessage, startSession } from "@/lib/supabase/sessions";
import type { Pod, PodMember } from "@/lib/supabase/types";
import { BackButton, PrimaryButton, TextButton } from "../../_ui/Buttons";
import { Grow, Screen } from "../../_ui/Screen";
import { useGuest } from "../../_ui/useGuest";
import { FocusSession } from "./FocusSession";
import { JoinPod } from "./JoinPod";

const SEATS = 4;
type Loaded =
  | { status: "loading" }
  | { status: "found"; pod: Pod; members: PodMember[]; session: SessionRow | null }
  | { status: "join"; preview: PodPreview }
  | { status: "missing" };

/** Dev fast mode: opening the lobby as /p/<slug>?speed=60 starts a session where each minute takes a second. */
function requestedSpeed(): number {
  return new URLSearchParams(window.location.search).get("speed") === "60" ? 60 : 1;
}

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
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (guest.status !== "ready") return;
    let live = true;
    (async () => {
      const client = getSupabase();
      const preview = await getPodPreview(client, slug);
      if (!preview) {
        if (live) setState({ status: "missing" });
        return;
      }
      if (!preview.isMember) {
        if (live) setState({ status: "join", preview });
        return;
      }
      const r = await getPod(client, slug);
      const session = r ? await getOpenSession(client, r.pod.id) : null;
      if (live) setState(r ? { status: "found", ...r, session } : { status: "missing" });
    })();
    return () => {
      live = false;
    };
  }, [guest, slug, reloads]);

  // Seats filling up, and the host starting, arrive on their own.
  const podId = state.status === "found" ? state.pod.id : null;
  useEffect(() => {
    if (!podId) return;
    return watchPod(getSupabase(), podId, () => setReloads((n) => n + 1));
  }, [podId]);

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

  if (state.status === "missing") {
    return (
      <Screen nav={<BackButton href="/" />}>
        <Grow />
        <p className="display text-center text-[24px]">We couldn&apos;t find that pod.</p>
        <Grow />
        <TextButton href="/">Back home</TextButton>
      </Screen>
    );
  }

  if (state.status === "join" && guest.status === "ready") {
    return <JoinPod preview={state.preview} me={guest.userId} onJoined={() => setReloads((n) => n + 1)} />;
  }

  if (state.status !== "found" || guest.status !== "ready") {
    return (
      <Screen nav={<BackButton href="/" />}>
        <Grow />
        <p className="text-center text-[15px] text-muted">One moment…</p>
        <Grow />
      </Screen>
    );
  }

  const { pod, members, session } = state;
  const me = guest.userId;

  if (session) return <FocusSession pod={pod} members={members} me={me} session={session} />;

  const empty = Math.max(0, SEATS - members.length);
  const isHost = me === pod.host_id;
  const hostName = members.find((m) => m.user_id === pod.host_id)?.display_name ?? "the organizer";

  async function start() {
    if (state.status !== "found") return;
    setStarting(true);
    setStartError(null);
    const r = await startSession(getSupabase(), pod.id, requestedSpeed());
    if ("session" in r) {
      setState({ ...state, session: r.session });
      return;
    }
    setStarting(false);
    setStartError(sessionErrorMessage(r.error));
  }

  return (
    <Screen
      nav={
        <>
          <BackButton href="/" />
          <span className="text-sm text-text-2">{pod.name}</span>
          <span className="w-[34px]" aria-hidden="true" />
        </>
      }
    >
      <h1 className="display text-center text-[32px] font-medium leading-[1.08] tracking-[-.3px]">Your table is set.</h1>
      <StudioScene label="The pottery studio, with the wheel resting and clay waiting" />
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
      {isHost ? (
        <>
          {startError ? (
            <p role="alert" className="mb-3 text-center text-[14px] text-danger">
              {startError}
            </p>
          ) : null}
          <PrimaryButton disabled={starting} onClick={start}>
            {starting ? "One moment…" : "Start focusing"}
          </PrimaryButton>
        </>
      ) : (
        <p className="flex min-h-[54px] items-center justify-center text-center text-[15px] text-text-2">
          Waiting for {hostName} to start
        </p>
      )}
    </Screen>
  );
}
