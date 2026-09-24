"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTogether } from "@/lib/clock";
import { ymd } from "@/lib/calendar";
import { getSupabase } from "@/lib/supabase/client";
import { getMyShelf, type ShelfItem } from "@/lib/supabase/shelf";
import { Calendar } from "./_ui/Calendar";
import { Grow, Screen } from "./_ui/Screen";
import { Shelf } from "./_ui/Shelf";
import { useGuest } from "./_ui/useGuest";

type Loaded = { status: "loading" } | { status: "ready"; items: ShelfItem[] };

function NewSessionButton() {
  return (
    <div className="mt-6 flex justify-end">
      <Link
        href="/new"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sage px-5 text-[15px] font-semibold text-on-sage active:scale-[.985]"
      >
        <span aria-hidden="true">+</span> New session
      </Link>
    </div>
  );
}

/**
 * The dashboard: your shelf of pots and the days you focused, or the empty state.
 * See docs/superpowers/specs/2026-09-24-piece-4-reveal-and-shelf-design.md.
 */
export function Dashboard() {
  const guest = useGuest();
  const [state, setState] = useState<Loaded>({ status: "loading" });
  // Read once, on the client, so the month and "today" match the person's own clock.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (guest.status !== "ready") return;
    let live = true;
    getMyShelf(getSupabase(), guest.userId).then((items) => {
      if (live) setState({ status: "ready", items });
    });
    return () => {
      live = false;
    };
  }, [guest]);

  if (guest.status === "error") {
    return (
      <Screen nav={<span className="display text-[21px] font-medium">Focuspal</span>}>
        <Grow />
        <p className="display text-center text-[24px]">{guest.message}</p>
        <p className="mt-6 text-center">
          <button type="button" onClick={guest.retry} className="min-h-11 text-[15px] font-semibold text-sage-deep">
            Try again
          </button>
        </p>
        <Grow />
      </Screen>
    );
  }

  const nav = <span className="display text-[21px] font-medium">Focuspal</span>;

  if (state.status === "loading") {
    return (
      <Screen nav={nav}>
        <NewSessionButton />
        <Grow />
        <p className="text-center text-[15px] text-muted">One moment…</p>
        <Grow />
      </Screen>
    );
  }

  const { items } = state;

  if (items.length === 0) {
    return (
      <Screen nav={nav}>
        <NewSessionButton />
        <section className="mt-3 rounded-[24px] border border-line bg-card px-6 py-10 text-center">
          <h1 className="display text-[26px] font-medium leading-tight">No sessions yet.</h1>
          <p className="mt-2 text-[15px] text-text-2">Your first pot is one session away.</p>
        </section>
        <Grow />
      </Screen>
    );
  }

  const today = ymd(now);
  const marked = new Set(items.map((i) => ymd(i.endedAtMs)));
  const totalMinutes = items.reduce((sum, i) => sum + i.minutes, 0);

  return (
    <Screen nav={nav}>
      <NewSessionButton />
      <h1 className="display mt-4 text-[26px] font-medium">My shelf</h1>
      <div className="mt-3">
        <Shelf items={items} />
      </div>
      <p className="text-center text-[14.5px] text-text-2">
        <b className="font-semibold text-text">
          {items.length} {items.length === 1 ? "piece" : "pieces"}
        </b>{" "}
        · {formatTogether(totalMinutes)} of focus
      </p>
      <Calendar marked={marked} today={today} initialYear={new Date(now).getFullYear()} initialMonth={new Date(now).getMonth()} />
      <Grow />
    </Screen>
  );
}
