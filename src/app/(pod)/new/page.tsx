import type { Metadata } from "next";
import { NewPod } from "./NewPod";

export const metadata: Metadata = { title: "Start a pod · Focuspal" };

export default function NewPodPage() {
  return <NewPod />;
}
