import Image from "next/image";
import type { Pal } from "@/lib/pals";

/** Ashna's head-and-shoulders portraits in public/assets. The bunny's file is named for a rabbit. */
const PORTRAIT: Record<Pal, string> = {
  bunny: "/assets/focuspal-rabbit-portrait.svg",
  cat: "/assets/focuspal-cat-portrait.svg",
  dog: "/assets/focuspal-dog-portrait.svg",
  koala: "/assets/focuspal-koala-portrait.svg",
};

/** A round sand badge with the pal's portrait. Decorative: the parent carries the accessible label. */
export function PalFace({ pal, size, dimmed = false }: { pal: Pal; size: number; dimmed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 overflow-hidden rounded-full bg-sand"
      style={{
        width: size,
        height: size,
        // A taken or dozing pal stays solid, just washed out (Linen & Sage: never opacity alone).
        filter: dimmed ? "grayscale(1) contrast(.55) brightness(1.1)" : undefined,
      }}
    >
      <Image
        src={PORTRAIT[pal]}
        alt=""
        width={size}
        height={size}
        // The files are large traced SVGs; serve them as-is and let the browser cache them.
        unoptimized
        className="h-full w-full object-cover object-[50%_30%]"
      />
    </span>
  );
}
