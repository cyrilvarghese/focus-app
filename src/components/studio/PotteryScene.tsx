"use client";

import { useEffect, useRef } from "react";
import type { Recipe } from "@/lib/pottery/recipe";
import { createPotteryScene, type PotteryScene as Scene } from "./scene";

/**
 * The studio with the pot being thrown. Progress 0..1 is the session's focus progress:
 * the scene throws, glazes and fires the pot across it (see scene.ts for the timeline).
 */
export function PotteryScene({
  recipe,
  progress,
  running = true,
  pace = 1,
  label,
  onStageLabel,
}: {
  recipe: Recipe;
  progress: number;
  /** False on breaks and before the session starts: the wheel rests. */
  running?: boolean;
  /** Share of pals focusing, 0..1. The wheel slows as people step away. */
  pace?: number;
  label: string;
  /** The scene's own line for the caption: "Pulling up the walls.", "Dipping it in celadon."… */
  onStageLabel?: (line: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const onStageRef = useRef(onStageLabel);

  useEffect(() => {
    onStageRef.current = onStageLabel;
  });

  // One scene per recipe. Changing the recipe rebuilds it, since the pot is a different pot.
  const recipeKey = JSON.stringify(recipe);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const scene = createPotteryScene(svg, JSON.parse(recipeKey) as Recipe);
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [recipeKey]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setProgress(progress);
    scene.setMotion(running, pace);
    onStageRef.current?.(scene.stageLabel());
  }, [progress, running, pace, recipeKey]);

  return (
    <div className="relative my-2 w-full max-w-[380px] self-center overflow-hidden rounded-[34px] bg-white p-[5px] shadow-[0_12px_32px_rgba(90,70,50,.12)]">
      <svg ref={svgRef} role="img" aria-label={label} className="block h-auto max-h-[46vh] w-full rounded-[29px]" />
    </div>
  );
}
