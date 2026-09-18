import type { Metadata } from "next";
import { SoloSession } from "./SoloSession";

export const metadata: Metadata = { title: "Solo session · Focuspal" };

export default function SoloPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <SoloSession />
    </main>
  );
}
