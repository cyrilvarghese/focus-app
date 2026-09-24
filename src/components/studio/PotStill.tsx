"use client";

import { useEffect, useRef } from "react";
import type { Recipe } from "@/lib/pottery/recipe";
import { createPotteryScene, potBounds } from "./scene";

/**
 * The finished pot on its own: the same scene frozen at its last frame, without the room.
 * Because it's the same drawing, the pot on your shelf is exactly the pot you watched being made.
 */
export function PotStill({
  recipe,
  height,
  maxWidth = Math.round(height * 1.5),
  label,
}: {
  recipe: Recipe;
  /** The tallest it may be. Wide, flat pieces (plates, bowls) come out shorter. */
  height: number;
  maxWidth?: number;
  label?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const b = potBounds(recipe);
  const scale = Math.min(height / b.height, maxWidth / b.width);
  const width = Math.round(b.width * scale);
  const shown = Math.round(b.height * scale);

  const recipeKey = JSON.stringify(recipe);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = JSON.parse(recipeKey) as Recipe;
    const scene = createPotteryScene(svg, r, { room: false, animate: false });
    scene.setProgress(1);
    const box = potBounds(r);
    svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
    return () => scene.destroy();
  }, [recipeKey]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={shown}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="block"
    />
  );
}
