import Link from "next/link";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { TextButton } from "../_ui/Buttons";
import { Grow, Screen } from "../_ui/Screen";

export default function HomePage() {
  return (
    <Screen nav={<span className="display text-[21px] font-medium">Focuspal</span>}>
      <Grow />
      <SceneSlot />
      <h1 className="display mt-2 text-center text-[32px] font-medium leading-[1.08] tracking-[-.3px]">
        A little company.
        <br />
        A lot more focus.
      </h1>
      <Grow />
      <Link
        href="/new"
        className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-sage text-base font-semibold text-on-sage active:scale-[.985]"
      >
        Start a pod
      </Link>
      {/* Stays disabled until piece 2 (Join). */}
      <TextButton disabled>I have a link</TextButton>
    </Screen>
  );
}
