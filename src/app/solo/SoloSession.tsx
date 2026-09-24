"use client";

import { useEffect, useState } from "react";
import {
  BREAK_OPTIONS,
  DEFAULT_PRESET,
  FOCUS_OPTIONS,
  formatCountdown,
  formatTogether,
  MIN_MS,
  phaseAt,
  ROUND_OPTIONS,
  sessionTotalMs,
  type Preset,
  type Session,
} from "@/lib/clock";
import { palMinutes, potteryView } from "@/lib/pottery";

type Run = { session: Session; speed: number; left: boolean };

const TICK_MS = 250;

/** ?speed=60 plays a 55-minute session in under a minute. Read on Start, so it never affects the server render. */
function readSpeed(): number {
  const n = Number(new URLSearchParams(window.location.search).get("speed"));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function Segmented<T extends number>({
  label,
  options,
  value,
  unit,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  unit: string;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold text-muted">{label}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={o === value}
            onClick={() => onChange(o)}
            className="min-h-11 rounded-xl border-[1.5px] border-ink px-3 font-semibold aria-pressed:bg-mint-wash"
          >
            {o} <small className="font-normal text-muted">{unit}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SoloSession() {
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!run || run.left) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [run]);

  if (!run) {
    const total = sessionTotalMs(preset) / MIN_MS;
    return (
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Solo session</h1>
        <p className="mt-1 text-muted">A local session to try the clock and pottery rules. No account, no server.</p>
        <Segmented label="Focus" unit="min" options={FOCUS_OPTIONS} value={preset.focusMin} onChange={(focusMin) => setPreset({ ...preset, focusMin })} />
        <Segmented label="Break" unit="min" options={BREAK_OPTIONS} value={preset.breakMin} onChange={(breakMin) => setPreset({ ...preset, breakMin })} />
        <Segmented label="Rounds" unit="" options={ROUND_OPTIONS} value={preset.rounds} onChange={(rounds) => setPreset({ ...preset, rounds })} />
        <p className="mt-6 text-lg font-semibold">{formatTogether(total)} together</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-full bg-ink px-6 font-semibold text-paper"
          onClick={() => {
            const startedAtMs = Date.now();
            setNow(startedAtMs);
            setRun({ session: { id: crypto.randomUUID(), startedAtMs, preset }, speed: readSpeed(), left: false });
          }}
        >
          Start
        </button>
      </section>
    );
  }

  const { session, speed, left } = run;
  const t = session.startedAtMs + (now - session.startedAtMs) * speed;
  const clock = phaseAt(session, t);
  const view = potteryView(session, t, { presentCount: left ? 0 : 1, memberCount: 1, left });
  const name = `${view.recipe.glaze} ${view.recipe.shape}`;
  const again = (
    <button type="button" className="mt-6 min-h-11 w-full rounded-full border-[1.5px] border-ink px-6 font-semibold" onClick={() => setRun(null)}>
      Start another
    </button>
  );

  return (
    <section>
      {/* Ashna's <PotteryWheel {...view} /> replaces this box. */}
      <div data-slot="pottery-wheel" className="rounded-2xl border-2 border-dashed border-muted p-4">
        <p className="text-sm font-semibold text-muted">PotteryWheel goes here</p>
        <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(view, null, 2)}</pre>
      </div>

      {view.status === "complete" && (
        <>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">A {name}, made together.</h1>
          <p className="mt-1 text-muted">
            {formatTogether(palMinutes([{ userId: "me", startMs: session.startedAtMs, endMs: null }], session, t))} focused · added to your shelf
          </p>
          {again}
        </>
      )}

      {view.status === "abandoned" && (
        <>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">The clay went back in the bag.</h1>
          <p className="mt-1 text-muted">Nobody stayed to the end, so this {name} wasn&apos;t kept.</p>
          {again}
        </>
      )}

      {view.status === "throwing" && (
        <>
          <p className="mt-6 text-sm font-semibold text-mint-deep">
            {clock.phase === "focus" ? "Focus" : "Break"} · Round {clock.round} of {session.preset.rounds}
          </p>
          <p role="timer" className="text-6xl font-semibold tabular-nums tracking-tight">
            {formatCountdown(clock.remainingMs)}
          </p>
          <p className="mt-2 text-muted">Today&apos;s clay will become a {name}.</p>
          {speed !== 1 && <p className="mt-1 text-xs text-muted">Running at {speed}× speed</p>}
          <button
            type="button"
            className="mt-6 min-h-11 w-full rounded-full border-[1.5px] border-ink px-6 font-semibold"
            onClick={() => setRun({ ...run, left: true })}
          >
            Leave
          </button>
        </>
      )}
    </section>
  );
}
