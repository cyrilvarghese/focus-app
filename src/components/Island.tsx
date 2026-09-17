"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildIslandSvg, ISLAND_STEPS } from "@/lib/island/scene";

const STEP_MS = 150;
const DONE = "Four pals, twenty-five quiet minutes.";

export function Island() {
  const svg = useMemo(() => buildIslandSvg() as string, []);
  const ref = useRef<SVGSVGElement>(null);
  const [caption, setCaption] = useState("A new round begins…");

  useEffect(() => {
    const pieces = Array.from(
      ref.current?.querySelectorAll<SVGGElement>("[data-s]") ?? [],
    );
    const show = (step: number) =>
      pieces.forEach((p) => p.classList.toggle("on", Number(p.dataset.s) <= step));

    // Reduced motion: skip the build sequence and show the finished island.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let step = reduced ? ISLAND_STEPS : 0;
    const timer = setInterval(() => {
      step += 1;
      show(step);
      const piece = pieces.find((p) => Number(p.dataset.s) === step);
      if (step > ISLAND_STEPS) {
        setCaption(DONE);
        clearInterval(timer);
      } else if (piece) {
        const owner = piece.dataset.owner;
        const who = owner ? `${owner[0].toUpperCase()}${owner.slice(1)} built` : "Together";
        setCaption(`${who}: ${piece.dataset.name}`);
      }
    }, STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <figure className="island m-0">
      <svg
        ref={ref}
        viewBox="0 0 480 400"
        role="img"
        aria-label="A floating isometric island with a cabin, a windmill, a reading nook and a pond, built by four animal friends sitting around a green table."
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption aria-live="off" className="mt-2 text-center text-sm italic text-muted">
        {caption}
      </figcaption>
    </figure>
  );
}
