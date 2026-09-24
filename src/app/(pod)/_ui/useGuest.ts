"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureGuest } from "@/lib/supabase/auth";
import { getSupabase, SupabaseConfigError } from "@/lib/supabase/client";

export type Guest =
  | { status: "pending" }
  | { status: "ready"; userId: string }
  | { status: "error"; message: string; retry: () => void };

const NETWORK = "Can't reach Focuspal right now.";
const DISABLED = "Guest sign-in is turned off for this project.";

/** Signs in silently on mount (PRD §9). Screens show "One moment…" while pending. */
export function useGuest(): Guest {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Guest>({ status: "pending" });
  const retry = useCallback(() => {
    setState({ status: "pending" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      let next: Guest;
      try {
        const r = await ensureGuest(getSupabase());
        next =
          "userId" in r
            ? { status: "ready", userId: r.userId }
            : { status: "error", message: r.error === "guest_signin_disabled" ? DISABLED : NETWORK, retry };
      } catch (e) {
        next = { status: "error", message: e instanceof SupabaseConfigError ? e.message : NETWORK, retry };
      }
      if (live) setState(next);
    })();
    return () => {
      live = false;
    };
  }, [attempt, retry]);

  return state;
}
