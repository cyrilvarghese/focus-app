"use client";

import { useRouter } from "next/navigation";
import { PalFace } from "@/components/pals/PalFace";
import { FinishedPot } from "@/components/pottery/FinishedPot";
import { formatTogether } from "@/lib/clock";
import { pieceById, pieceFor } from "@/lib/pottery";
import type { PodMember } from "@/lib/supabase/types";
import { PrimaryButton } from "../../_ui/Buttons";
import { Grow, Screen } from "../../_ui/Screen";

/** The end of a session: the pot you made together, and everyone's minutes. */
export function SessionComplete({
  sessionId,
  members,
  me,
  minutes,
  kept,
}: {
  sessionId: string;
  members: PodMember[];
  me: string;
  /** Focused minutes by user id. */
  minutes: Record<string, number>;
  kept: boolean;
}) {
  const router = useRouter();
  const piece = pieceFor(sessionId);
  const name = pieceById(piece.pieceId).name;
  const mine = minutes[me] ?? 0;

  return (
    <Screen>
      <Grow />
      <div className="relative grid h-[250px] place-items-end justify-center">
        <div aria-hidden="true" className="absolute bottom-[22px] h-[30px] w-[190px] rounded-[50%] bg-sand" />
        <div className="relative mb-[34px]">
          <FinishedPot pieceId={piece.pieceId} glaze={piece.glaze} width={168} height={152} glint={kept} />
        </div>
      </div>

      <div className="text-center">
        {kept ? (
          <>
            <h1 className="display text-[32px] font-medium leading-[1.08] tracking-[-.3px]">
              A {name},
              <br />
              made together.
            </h1>
            <p className="display mt-2 text-base text-sage">{formatTogether(mine)} with your pod</p>
          </>
        ) : (
          <>
            <h1 className="display text-[32px] font-medium leading-[1.08] tracking-[-.3px]">
              The clay went
              <br />
              back in the bag.
            </h1>
            <p className="mt-2 text-[15px] text-text-2">Nobody stayed to the end, so this {name} wasn&apos;t kept.</p>
          </>
        )}
      </div>

      <ul className="mt-6 flex justify-center gap-4">
        {members.map((m) => (
          <li key={m.user_id} className="grid justify-items-center gap-1.5 text-[12.5px] text-text-2">
            <PalFace pal={m.animal} size={44} />
            <b className="text-[13px] font-semibold text-text">{m.user_id === me ? "You" : m.display_name}</b>
            <span>{minutes[m.user_id] ?? 0} min</span>
          </li>
        ))}
      </ul>

      <Grow />
      <PrimaryButton onClick={() => router.push("/")}>Done</PrimaryButton>
    </Screen>
  );
}
