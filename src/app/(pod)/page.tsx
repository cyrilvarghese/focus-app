import Link from "next/link";
import { Grow, Screen } from "./_ui/Screen";

/**
 * The dashboard. Everyone sees the empty state until sessions exist (piece 4 adds the shelf and calendar).
 * See docs/superpowers/specs/2026-09-22-user-flow-design.md.
 */
export default function DashboardPage() {
  return (
    <Screen nav={<span className="display text-[21px] font-medium">Focuspal</span>}>
      <div className="mt-6 flex justify-end">
        <Link
          href="/new"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sage px-5 text-[15px] font-semibold text-on-sage active:scale-[.985]"
        >
          <span aria-hidden="true">+</span> New session
        </Link>
      </div>
      <section className="mt-3 rounded-[24px] border border-line bg-card px-6 py-10 text-center">
        <h1 className="display text-[26px] font-medium leading-tight">No sessions yet.</h1>
        <p className="mt-2 text-[15px] text-text-2">Your first pot is one session away.</p>
      </section>
      <Grow />
    </Screen>
  );
}
