/**
 * The studio scene's SVG, from Ashna's pottery-wheel prototype.
 * The room, shelves and wheel sit in one group so a still of just the pot can hide them.
 */
export const SCENE_VIEWBOX = "0 0 580 680";

export const SCENE_MARKUP = `
<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8ded1"/><stop offset="1" stop-color="#f3ece2"/></linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ebdecb"/><stop offset="1" stop-color="#ddc9ad"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="clay" x1="0" y1="0" x2="1" y2="0">
    <stop id="c0" offset="0"/><stop id="c1" offset=".2"/><stop id="c2" offset=".4"/><stop id="c3" offset=".62"/><stop id="c4" offset="1"/>
  </linearGradient>
  <linearGradient id="glazeGrad" x1="0" y1="0" x2="1" y2="0">
    <stop id="g0" offset="0"/><stop id="g1" offset=".2"/><stop id="g2" offset=".4"/><stop id="g3" offset=".62"/><stop id="g4" offset="1"/>
  </linearGradient>
  <radialGradient id="holeGrad" cx=".5" cy=".3" r=".7"><stop id="h0" offset="0"/><stop id="h1" offset="1"/></radialGradient>
  <linearGradient id="basinBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d635b"/><stop offset="1" stop-color="#5a5049"/></linearGradient>
  <radialGradient id="glowG"><stop offset="0" stop-color="#fff6e3" stop-opacity=".95"/><stop offset="1" stop-color="#fff6e3" stop-opacity="0"/></radialGradient>
  <radialGradient id="kilnG"><stop offset="0" stop-color="#ff9a52" stop-opacity=".9"/><stop offset=".6" stop-color="#ffb877" stop-opacity=".35"/><stop offset="1" stop-color="#ffc58c" stop-opacity="0"/></radialGradient>
  <clipPath id="glass"><rect x="210" y="54" width="160" height="166"/></clipPath>
  <clipPath id="glazeClip"><path id="glazeClipPath" d="M0 0Z"/></clipPath>
</defs>

<g id="studio">
  <rect width="580" height="400" fill="url(#wall)"/>
  <rect y="398" width="580" height="282" fill="url(#floor)"/>
  <g stroke="#cfb999" stroke-width="1.5" opacity=".75">
    <line x1="0" y1="468" x2="580" y2="468"/><line x1="0" y1="556" x2="580" y2="556"/>
    <line x1="170" y1="400" x2="60" y2="680"/><line x1="410" y1="400" x2="520" y2="680"/>
    <line x1="50" y1="400" x2="-160" y2="680"/><line x1="530" y1="400" x2="740" y2="680"/>
  </g>
  <rect y="394" width="580" height="8" fill="#dccbb3"/>
  <rect x="470" y="60" width="34" height="12" rx="6" fill="#e3d8ca"/>
  <rect x="96" y="300" width="40" height="12" rx="6" fill="#e3d8ca"/>

  <polygon points="215,236 365,236 430,420 150,420" fill="url(#beam)"/>
  <rect x="200" y="44" width="180" height="186" rx="3" fill="#c4a482"/>
  <rect x="210" y="54" width="160" height="166" fill="#e2eae2"/>
  <g clip-path="url(#glass)">
    <path d="M222 222 C212 162 238 112 262 96 C268 140 258 190 250 222 Z" fill="#a9c3b1"/>
    <path d="M268 222 C260 150 280 100 302 80 C314 130 302 190 294 222 Z" fill="#8fae9a"/>
    <path d="M312 222 C320 170 346 130 372 116 C372 160 352 200 336 222 Z" fill="#b5ccbb"/>
  </g>
  <rect x="286" y="54" width="8" height="166" fill="#c4a482"/>
  <rect x="210" y="132" width="160" height="7" fill="#c4a482"/>
  <rect x="190" y="226" width="200" height="12" rx="2" fill="#b89a79"/>

  <rect x="22" y="60" width="8" height="338" fill="#a98b6d"/>
  <rect x="158" y="60" width="8" height="338" fill="#a98b6d"/>
  <path d="M38 150 C30 132 34 118 44 112 L44 104 L58 104 L58 112 C68 118 72 132 64 150 Z" fill="#c2856a"/>
  <rect x="37" y="126" width="28" height="3" fill="#e7c2ae"/>
  <path d="M80 140 L118 140 C116 148 108 150 99 150 C90 150 82 148 80 140 Z" fill="#e4d6b8"/>
  <rect x="126" y="124" width="30" height="26" rx="5" fill="#a9c3b1"/><rect x="124" y="120" width="34" height="6" rx="3" fill="#bcd0c2"/>
  <rect x="0" y="150" width="178" height="8" fill="#bfa283"/>
  <path d="M40 250 L84 250 C82 259 72 262 62 262 C52 262 42 259 40 250 Z" fill="#a9c3b1"/>
  <path d="M112 262 C104 245 108 230 118 224 L118 214 L130 214 L130 224 C140 230 144 245 136 262 Z" fill="#e6d8bb"/>
  <rect x="110" y="238" width="28" height="3" fill="#cf9a82"/>
  <rect x="0" y="262" width="178" height="8" fill="#bfa283"/>
  <rect x="38" y="340" width="36" height="30" rx="9" fill="#c2856a"/>
  <rect x="108" y="360" width="42" height="10" rx="3" fill="#f1e8da"/><rect x="116" y="364" width="26" height="2" fill="#a9c3b1"/>
  <rect x="0" y="370" width="178" height="8" fill="#bfa283"/>

  <rect x="446" y="118" width="26" height="32" rx="2" fill="#e6dcb8"/>
  <path d="M492 150 C484 134 488 118 498 112 L498 100 L512 100 L512 112 C522 118 526 134 518 150 Z" fill="#a9c3b1"/>
  <rect x="490" y="124" width="30" height="3" fill="#d4e2d8"/>
  <path d="M542 138 L580 138 C578 147 570 150 561 150 C552 150 544 147 542 138 Z" fill="#c98e72"/>
  <rect x="430" y="150" width="150" height="7" fill="#bfa283"/><rect x="446" y="157" width="6" height="18" fill="#a98b6d"/>
  <path d="M484 226 C476 206 482 192 490 186 C494 200 494 214 492 226 Z" fill="#8fae9a"/>
  <path d="M492 226 C494 206 504 194 514 192 C512 208 504 220 498 226 Z" fill="#a9c3b1"/>
  <path d="M476 226 C470 212 466 202 468 194 C478 202 484 214 486 226 Z" fill="#b5ccbb"/>
  <path d="M472 226 L508 226 L503 262 L477 262 Z" fill="#c2856a"/>
  <rect x="532" y="236" width="26" height="26" rx="2" fill="#d49c80"/>
  <rect x="446" y="248" width="20" height="14" rx="2" fill="#f4ede3"/>
  <rect x="430" y="262" width="150" height="7" fill="#bfa283"/><rect x="446" y="269" width="6" height="18" fill="#a98b6d"/>
</g>

<ellipse id="glow" cx="290" cy="440" rx="190" ry="190" fill="url(#glowG)" opacity="0"/>
<ellipse id="kilnGlow" cx="290" cy="440" rx="220" ry="200" fill="url(#kilnG)" opacity="0"/>

<g id="wheel">
  <path d="M28 612 C34 650 62 684 96 700 L484 700 C518 684 546 650 552 612 Z" fill="url(#basinBody)"/>
  <ellipse cx="290" cy="612" rx="262" ry="62" fill="#7f736a"/>
  <ellipse cx="290" cy="615" rx="248" ry="54" fill="#4f4640"/>
  <g fill="#b8765a" opacity=".85">
    <ellipse cx="96" cy="630" rx="7" ry="3"/><ellipse cx="470" cy="598" rx="5" ry="2.5"/>
    <ellipse cx="520" cy="628" rx="6" ry="3"/><ellipse cx="160" cy="590" rx="4" ry="2"/>
    <ellipse cx="410" cy="652" rx="8" ry="3.5"/><ellipse cx="220" cy="660" rx="5" ry="2.5"/>
  </g>
  <ellipse cx="290" cy="582" rx="150" ry="36" fill="#3e3732"/>
  <rect x="140" y="566" width="300" height="16" fill="#3e3732"/>
  <ellipse cx="290" cy="566" rx="150" ry="36" fill="#5b524b"/>
  <g fill="none" stroke="#6a6059" stroke-width="1.2">
    <ellipse cx="290" cy="566" rx="124" ry="29.8"/><ellipse cx="290" cy="566" rx="98" ry="23.5"/>
  </g>
  <g id="headSpecks" fill="#a8694f"></g>
</g>

<ellipse id="potShadow" fill="#1d1714" opacity=".22"/>
<g id="raw">
  <path id="potBody" fill="url(#clay)"/>
  <path id="ringsDark" fill="none" stroke="#7d4631" stroke-width="1.3"/>
  <path id="ringsLight" fill="none" stroke="#ecbca1" stroke-width="1"/>
  <path id="marksDark" fill="none" stroke="#7a432f" stroke-width="2" stroke-linecap="round" opacity=".45"/>
  <path id="marksLight" fill="none" stroke="#f0c7af" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
  <ellipse id="wetSheen" fill="#fff4ea"/>
  <path id="handle" fill="none" stroke="url(#clay)" stroke-width="13" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/>
  <path id="spout" fill="url(#clay)"/>
  <ellipse id="rim" fill="#cf9275" stroke="#e8bba0" stroke-width="1.5"/>
  <ellipse id="potHole" fill="url(#holeGrad)"/>
  <path id="lid" fill="url(#clay)"/>
  <ellipse id="knob" fill="#c78566"/>
</g>
<g id="rib" opacity="0">
  <rect x="0" y="-26" width="13" height="52" rx="6.5" fill="#d2ad84" stroke="#a9855d" stroke-width="1.5"/>
  <circle cx="6.5" cy="12" r="3" fill="#a9855d"/>
</g>

<g id="glazed" clip-path="url(#glazeClip)" style="display:none">
  <path id="gBody" fill="url(#glazeGrad)"/>
  <path id="gRings" fill="none" stroke-width="1.4"/>
  <path id="gSpeckle" fill="none" stroke-width="2.4" stroke-linecap="round"/>
  <path id="gHandle" fill="none" stroke="url(#glazeGrad)" stroke-width="13.5" stroke-linecap="round"/>
  <path id="gSpout" fill="url(#glazeGrad)"/>
  <ellipse id="gRim" stroke-width="2.5"/>
  <ellipse id="gHole"/>
  <path id="gLid" fill="url(#glazeGrad)"/>
  <ellipse id="gKnob"/>
  <path id="gGloss" fill="#fff"/>
</g>

<g id="drops" fill="#b8765a"></g>
<g id="sparkles" fill="#fff9ec" opacity="0"></g>
<rect id="kilnTint" width="580" height="680" fill="#ffae66" opacity="0" pointer-events="none"/>
`;
