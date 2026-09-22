import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "Focuspal" };

/** A route-group layout has no URL of its own, so it takes plain children rather than the generated LayoutProps helper. */
export default function PodLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`linen ${fraunces.variable} ${inter.variable} flex min-h-screen flex-1 flex-col`}>
      <div className="screen-bg flex flex-1 flex-col">{children}</div>
    </div>
  );
}
