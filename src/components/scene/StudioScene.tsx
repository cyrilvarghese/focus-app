"use client";

import { useEffect, useRef } from "react";

/** The API of Ashna's public/studio-pot.js (window.StudioPot). */
type StudioPotHandle = {
  start(): void;
  setProgress(p: number): void;
  setRunning(v: boolean): void;
  setPace(k: number): void;
  complete(): void;
  abandon(): void;
  destroy(): void;
};
type StudioPotLib = {
  drawStudio(svg: SVGSVGElement): void;
  drawPan(svg: SVGSVGElement, cx: number, cy: number): () => void;
  create(parent: SVGGElement, opts: { x: number; y: number; scale: number; onStage?: (i: number) => void }): StudioPotHandle;
};
declare global {
  interface Window {
    StudioPot?: StudioPotLib;
  }
}

const SRC = "/studio-pot.js";
const NS = "http://www.w3.org/2000/svg";
let loading: Promise<StudioPotLib> | null = null;

/** Loads studio-pot.js once per page, however many scenes mount. */
function loadStudioPot(): Promise<StudioPotLib> {
  if (window.StudioPot) return Promise.resolve(window.StudioPot);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => (window.StudioPot ? resolve(window.StudioPot) : reject(new Error("studio-pot.js did not define StudioPot")));
    s.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load studio-pot.js"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** What the focus screen tells the pot, from potteryView. */
export type SceneView = {
  progress: number;
  running: boolean;
  pace: number;
  status: "throwing" | "complete" | "abandoned";
};

function apply(pot: StudioPotHandle, view: SceneView | undefined) {
  if (!view) {
    pot.setRunning(false);
    return;
  }
  pot.setProgress(view.progress);
  pot.setRunning(view.running);
  pot.setPace(view.pace);
  // Both are safe to repeat.
  if (view.status === "complete") pot.complete();
  if (view.status === "abandoned") pot.abandon();
}

/**
 * Ashna's pottery studio (public/studio-pot.js), drawn the way public/studio.html draws it.
 * Without a view it rests, for the Lobby: the pot at its first stage and the wheel still.
 * onStage fires as the pot reaches each of its eight stages (0 at the start).
 */
export function StudioScene({ label, view, onStage }: { label: string; view?: SceneView; onStage?: (stage: number) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const potRef = useRef<StudioPotHandle | null>(null);
  const viewRef = useRef(view);
  const onStageRef = useRef(onStage);

  useEffect(() => {
    viewRef.current = view;
    onStageRef.current = onStage;
  });

  const progress = view?.progress;
  const running = view?.running;
  const pace = view?.pace;
  const status = view?.status;
  useEffect(() => {
    if (potRef.current) apply(potRef.current, viewRef.current);
  }, [progress, running, pace, status]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let pot: StudioPotHandle | null = null;
    let cancelled = false;

    loadStudioPot()
      .then((lib) => {
        if (cancelled) return;
        lib.drawStudio(svg);
        const panFront = lib.drawPan(svg, 171, 300);
        const mount = document.createElementNS(NS, "g");
        svg.appendChild(mount);
        pot = lib.create(mount, { x: 171, y: 294, scale: 1.14, onStage: (i) => onStageRef.current?.(i) });
        panFront();
        const vignette = document.createElementNS(NS, "rect");
        vignette.setAttribute("width", "342");
        vignette.setAttribute("height", "400");
        vignette.setAttribute("fill", "url(#vig)");
        vignette.setAttribute("pointer-events", "none");
        svg.appendChild(vignette);
        pot.start();
        potRef.current = pot;
        apply(pot, viewRef.current);
      })
      .catch(() => {
        // The card keeps its plain background if the script can't load.
      });

    return () => {
      cancelled = true;
      pot?.destroy();
      potRef.current = null;
      // Remove everything drawn into the svg, keeping the <defs> React rendered.
      Array.from(svg.children).forEach((c) => {
        if (c.tagName.toLowerCase() !== "defs") c.remove();
      });
    };
  }, []);

  return (
    <div className="studio-card relative my-2 aspect-[342/400] max-h-[46vh] w-full self-center overflow-hidden rounded-[34px] border-4 border-card bg-[#e8e0d3] shadow-[0_18px_40px_-26px_rgba(61,57,52,.5)]">
      <svg
        ref={svgRef}
        viewBox="0 0 342 400"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={label}
        className="absolute inset-0 block h-full w-full"
      >
        <defs>
          <radialGradient id="vig" cx=".5" cy=".55" r=".75">
            <stop offset=".62" stopColor="#3d3934" stopOpacity="0" />
            <stop offset="1" stopColor="#3d3934" stopOpacity=".14" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
