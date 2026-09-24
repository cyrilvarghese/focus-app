import type { ReactNode } from "react";

/** The phone-width column every (pod) screen uses: optional nav row, then content. */
export function Screen({ nav, children }: { nav?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 pb-8 pt-3">
      <div className="flex min-h-[52px] items-center justify-between">{nav}</div>
      {children}
    </main>
  );
}

/** Pushes what follows to the bottom, like the prototype's `.grow`. */
export function Grow() {
  return <div className="flex-1" aria-hidden="true" />;
}
