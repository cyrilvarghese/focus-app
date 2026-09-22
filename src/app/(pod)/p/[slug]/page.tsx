import type { Metadata } from "next";
import { Lobby } from "./Lobby";

export const metadata: Metadata = { title: "Your pod · Focuspal" };

export default async function PodPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  return <Lobby slug={slug} />;
}
