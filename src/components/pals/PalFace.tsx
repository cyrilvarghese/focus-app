import type { Pal } from "@/lib/pals";

const INK = "#3d3934";
const PAPER = "#fffdf9";
const SAGE = "#a9c4ae";

/** Head + shoulders of one pal, drawn once from the shared rig numbers in the clean prototype (ax 50, ay 92). */
const FACES: Record<Pal, React.ReactNode> = {
  koala: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill="#7b756d" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M43 62 L50 77 L57 62" fill={PAPER} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="41" y1="63" x2="47" y2="80" stroke={SAGE} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="59" y1="63" x2="53" y2="80" stroke={SAGE} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="35" cy="39" r="10.5" fill="#cfd3d9" stroke={INK} strokeWidth="1.4" />
      <circle cx="65" cy="39" r="10.5" fill="#cfd3d9" stroke={INK} strokeWidth="1.4" />
      <circle cx="35" cy="39" r="5" fill="#f5f5f5" />
      <circle cx="65" cy="39" r="5" fill="#f5f5f5" />
      <circle cx="50" cy="47" r="16" fill="#dfe2e6" stroke={INK} strokeWidth="1.4" />
      <circle cx="44" cy="45" r="1.5" fill={INK} />
      <circle cx="56" cy="45" r="1.5" fill={INK} />
      <circle cx="44" cy="45" r="5" fill="none" stroke={INK} strokeWidth="1.3" />
      <circle cx="56" cy="45" r="5" fill="none" stroke={INK} strokeWidth="1.3" />
      <line x1="49" y1="45" x2="51" y2="45" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="50" cy="53" rx="4.5" ry="5.5" fill={INK} />
    </>
  ),
  cat: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M39 72 L61 72 L63 118 L37 118 Z" fill={INK} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="39" y1="72" x2="44" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="61" y1="72" x2="56" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <polygon points="36,42 38,25 47,34" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="64,42 62,25 53,34" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="50" cy="47" r="15" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      <path d="M37 41 Q42 31 51 33 Q48 39 41 42 Z" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <line x1="41.5" y1="44.5" x2="47" y2="45.4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58.5" y1="44.5" x2="53" y2="45.4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="44.4" cy="46.7" r="1.4" fill={INK} />
      <circle cx="55.6" cy="46.7" r="1.4" fill={INK} />
      <polygon points="48.5,50.5 51.5,50.5 50,52" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M47 54 q1.5 1.2 3 0 q1.5 1.2 3 0" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M43 51 L30 49 M43 53 L30 54 M57 51 L70 49 M57 53 L70 54" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  bunny: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill={PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M34.5 68 H65.5 M34.5 76 H65.5 M34.5 84 H65.5" fill="none" stroke="#bcd2c0" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M41 78 L59 78 L61 118 L39 118 Z" fill={INK} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="41" y1="78" x2="44" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="59" y1="78" x2="56" y2="62" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="44" cy="17" rx="4.8" ry="18" fill={INK} transform="rotate(-9 44 33)" />
      <ellipse cx="57" cy="16" rx="4.8" ry="18" fill={INK} transform="rotate(11 57 33)" />
      <circle cx="50" cy="47" r="15" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      <path d="M41.5 46 q2.8 2.4 5.6 0 M52.9 46 q2.8 2.4 5.6 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="51" r="1.4" fill={INK} stroke={INK} strokeWidth="1.4" />
      <path d="M47.5 54 q2.5 2 5 0" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  dog: (
    <>
      <path d="M33 118 L33 74 Q33 61 50 61 Q67 61 67 74 L67 118 Z" fill={SAGE} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M36 65 Q50 76 64 65" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="46" y1="71" x2="45" y2="84" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="54" y1="71" x2="55" y2="84" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="50" cy="47" r="15" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      <path d="M41 35 Q50 28 59 35 Q50 38 41 35 Z" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <circle cx="44.5" cy="45" r="1.7" fill={INK} />
      <circle cx="55.5" cy="45" r="1.7" fill={INK} />
      <ellipse cx="50" cy="51" rx="3.8" ry="2.8" fill={INK} stroke={INK} strokeWidth="1.4" />
      <path d="M47 55.5 q3 2 6 0" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <ellipse cx="35" cy="50" rx="5.8" ry="12.5" fill={INK} transform="rotate(14 35 39)" />
      <ellipse cx="65" cy="50" rx="5.8" ry="12.5" fill={INK} transform="rotate(-14 65 39)" />
    </>
  ),
};

/** A round sand badge with the pal's face. The parent carries the accessible label. */
export function PalFace({ pal, size, dimmed = false }: { pal: Pal; size: number; dimmed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 overflow-hidden rounded-full bg-sand"
      style={{
        width: size,
        height: size,
        filter: dimmed ? "grayscale(1) contrast(.55) brightness(1.1)" : undefined,
        opacity: dimmed ? 0.9 : 1,
      }}
    >
      <svg viewBox="20 22 60 60" width={size} height={size} className="block">
        {FACES[pal]}
      </svg>
    </span>
  );
}
