/* The Hidden Planet scene, inline SVG string. */
window.PLANET_SVG = `
<svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
<defs>
  <radialGradient id="planet-glow" cx="50%" cy="50%" r="55%">
    <stop offset="85%" stop-color="#f5efe2" stop-opacity="0"/>
    <stop offset="95%" stop-color="#c43f2e" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#c43f2e" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1600" height="1600" fill="#0b0d1f"/>
<g fill="#f5efe2">
  <circle cx="120" cy="200" r="1.5"/><circle cx="280" cy="120" r="1"/><circle cx="440" cy="80" r="2"/>
  <circle cx="680" cy="150" r="1"/><circle cx="1100" cy="90" r="1.8"/><circle cx="1350" cy="180" r="1.2"/>
  <circle cx="1480" cy="260" r="1.5"/><circle cx="80" cy="420" r="1"/><circle cx="1520" cy="600" r="1.5"/>
  <circle cx="60" cy="820" r="1.2"/><circle cx="1480" cy="900" r="1"/><circle cx="120" cy="1200" r="1.8"/>
  <circle cx="1520" cy="1300" r="1"/><circle cx="300" cy="1480" r="1.5"/><circle cx="680" cy="1520" r="1.2"/>
  <circle cx="1100" cy="1500" r="1"/><circle cx="1380" cy="1460" r="2"/><circle cx="200" cy="1050" r="1"/>
  <circle cx="1420" cy="460" r="1.2"/><circle cx="500" cy="1380" r="1"/><circle cx="90" cy="690" r="0.8"/>
  <circle cx="1470" cy="750" r="1"/><circle cx="230" cy="310" r="0.7"/><circle cx="1290" cy="340" r="0.7"/>
  <circle cx="820" cy="75" r="1.2"/><circle cx="70" cy="1350" r="1"/>
</g>
<g stroke="#f5efe2" stroke-width="1" fill="#f5efe2">
  <path d="M 360 300 l 5 0 M 362.5 297.5 l 0 5"/>
  <path d="M 1250 1100 l 6 0 M 1253 1097 l 0 6"/>
  <path d="M 900 250 l 5 0 M 902.5 247.5 l 0 5"/>
  <path d="M 150 950 l 4 0 M 152 948 l 0 4"/>
  <path d="M 1400 1000 l 5 0 M 1402.5 997.5 l 0 5"/>
</g>
<circle cx="300" cy="1400" r="400" fill="#c43f2e" opacity="0.04"/>
<circle cx="1400" cy="200" r="350" fill="#5a7a3a" opacity="0.04"/>
<circle cx="800" cy="800" r="640" fill="url(#planet-glow)"/>
<circle cx="800" cy="800" r="520" fill="#f5efe2" stroke="#1a1613" stroke-width="3.5"/>

<g fill="none" stroke="#1a1613" stroke-width="1.8">
  <path d="M 450 360 l 6 9 l -6 9 l -6 -9 Z"/>
  <path d="M 540 325 l 6 9 l -6 9 l -6 -9 Z"/>
  <path d="M 630 305 l 6 9 l -6 9 l -6 -9 Z"/>
  <path d="M 720 290 l 6 9 l -6 9 l -6 -9 Z"/>
  <path d="M 820 285 l 6 9 l -6 9 l -6 -9 Z" fill="#1a1613"/>
  <path d="M 910 290 l 6 9 l -6 9 l -6 -9 Z"/>
  <path d="M 1000 305 l 6 9 l -6 9 l -6 -9 Z"/>
  <path d="M 1090 325 l 6 9 l -6 9 l -6 -9 Z"/>
  <path d="M 1180 360 l 6 9 l -6 9 l -6 -9 Z"/>
  <g fill="#1a1613">
    <circle cx="495" cy="342" r="2"/><circle cx="585" cy="315" r="2"/>
    <circle cx="675" cy="297" r="2"/><circle cx="770" cy="287" r="2"/>
    <circle cx="865" cy="287" r="2"/><circle cx="955" cy="297" r="2"/>
    <circle cx="1045" cy="315" r="2"/><circle cx="1135" cy="342" r="2"/>
  </g>
  <path d="M 350 440 l 6 8 l 10 -14" stroke-width="2" stroke-linecap="round"/>
  <path d="M 1220 440 l 0 14 M 1213 447 l 14 0" stroke-width="2" stroke-linecap="round"/>
  <path d="M 780 420 l 6 8 l 10 -14" stroke-width="2" stroke-linecap="round"/>
</g>

<g transform="translate(380, 480)">
  <path d="M 0 30 Q -12 -2 18 -2 Q 30 -25 60 -12 Q 90 -28 105 2 Q 135 -2 125 30 Q 145 40 120 50 L 5 50 Q -20 44 0 30 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="48" cy="20" r="2.5" fill="#1a1613"/>
  <circle cx="75" cy="20" r="2.5" fill="#1a1613"/>
  <path d="M 45 30 Q 60 38 78 30" fill="none" stroke="#1a1613" stroke-width="2" stroke-linecap="round"/>
  <path d="M 32 15 Q 35 12 38 15" fill="none" stroke="#1a1613" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M 85 15 Q 88 12 91 15" fill="none" stroke="#1a1613" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="30" y1="50" x2="35" y2="72" stroke="#1a1613" stroke-width="1.5"/>
  <line x1="95" y1="50" x2="90" y2="72" stroke="#1a1613" stroke-width="1.5"/>
  <path d="M 35 72 L 90 72 L 85 92 L 40 92 Z" fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="62" cy="80" r="4" fill="#f5efe2" stroke="#1a1613" stroke-width="1.5"/>
  <line x1="125" y1="55" x2="145" y2="55" stroke="#1a1613" stroke-width="1.5"/>
  <line x1="135" y1="45" x2="135" y2="65" stroke="#1a1613" stroke-width="1.5"/>
  <circle cx="135" cy="55" r="3" fill="#1a1613"/>
</g>

<g transform="translate(1000, 500)">
  <path d="M 0 140 L 0 50 L 15 50 L 15 35 L 30 35 L 30 50 L 50 50 L 50 28 L 72 28 L 72 50 L 92 50 L 92 35 L 107 35 L 107 50 L 122 50 L 122 140 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M 105 140 L 105 10 L 115 10 L 115 0 L 125 0 L 125 10 L 135 10 L 135 140 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M 52 140 L 52 100 Q 52 82 61 82 Q 70 82 70 100 L 70 140" fill="#f5efe2" stroke="#1a1613" stroke-width="2"/>
  <g stroke="#1a1613" stroke-width="1" fill="none">
    <line x1="54" y1="105" x2="68" y2="105"/>
    <line x1="54" y1="113" x2="68" y2="113"/>
    <line x1="56" y1="121" x2="66" y2="121"/>
    <line x1="58" y1="129" x2="64" y2="129"/>
  </g>
  <rect x="14" y="70" width="8" height="12" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <rect x="98" y="70" width="8" height="12" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <rect x="115" y="60" width="8" height="14" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <rect x="115" y="90" width="8" height="14" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <line x1="120" y1="0" x2="120" y2="-35" stroke="#1a1613" stroke-width="2"/>
  <path d="M 120 -33 L 148 -28 L 144 -20 L 148 -12 L 120 -15 Z"
    fill="none" stroke="#c43f2e" stroke-width="2.5" stroke-linejoin="round"/>
</g>

<g transform="translate(760, 340)">
  <circle cx="0" cy="0" r="10" fill="#f5efe2" stroke="#1a1613" stroke-width="2"/>
  <path d="M -6 -4 Q 0 -9 6 -4" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <circle cx="-3" cy="-1" r="1" fill="#1a1613"/>
  <circle cx="3" cy="-1" r="1" fill="#1a1613"/>
  <path d="M -2 4 Q 0 6 2 4" fill="none" stroke="#1a1613" stroke-width="1"/>
  <line x1="0" y1="10" x2="-5" y2="28" stroke="#1a1613" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="0" y1="10" x2="6" y2="28" stroke="#1a1613" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="10" y1="10" x2="28" y2="-28" stroke="#1a1613" stroke-width="2" stroke-linecap="round"/>
  <path d="M 28 -28 L 52 -24 L 48 -14 L 52 -4 L 25 -8 Z"
    fill="#f5efe2" stroke="#c43f2e" stroke-width="2" stroke-linejoin="round"/>
  <rect x="32" y="-22" width="4" height="4" fill="#c43f2e"/>
  <rect x="40" y="-18" width="4" height="4" fill="#c43f2e"/>
</g>

<g transform="translate(860, 365)">
  <circle cx="0" cy="0" r="8" fill="#f5efe2" stroke="#1a1613" stroke-width="1.8"/>
  <circle cx="-2" cy="-1" r="0.8" fill="#1a1613"/>
  <circle cx="2" cy="-1" r="0.8" fill="#1a1613"/>
  <path d="M -1 3 Q 0 4 1 3" fill="none" stroke="#1a1613" stroke-width="1"/>
  <path d="M -8 -6 L 0 -18 L 8 -6 Z" fill="#f5efe2" stroke="#1a1613" stroke-width="1.8"/>
  <line x1="0" y1="8" x2="-4" y2="22" stroke="#1a1613" stroke-width="2" stroke-linecap="round"/>
  <line x1="0" y1="8" x2="5" y2="22" stroke="#1a1613" stroke-width="2" stroke-linecap="round"/>
</g>

<g transform="translate(380, 720)">
  <rect x="0" y="0" width="140" height="185" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5"/>
  <g stroke="#1a1613" stroke-width="1.5" fill="none">
    <path d="M 25 25 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 55 25 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 85 25 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 115 25 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 25 65 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 55 65 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 85 65 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 115 65 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 25 105 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 55 105 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 85 105 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 115 105 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 40 145 l 6 8 l -6 8 l -6 -8 Z" fill="#1a1613"/>
    <path d="M 70 145 l 6 8 l -6 8 l -6 -8 Z"/>
    <path d="M 100 145 l 6 8 l -6 8 l -6 -8 Z"/>
  </g>
  <rect x="48" y="-32" width="16" height="32" fill="#f5efe2" stroke="#1a1613" stroke-width="2"/>
  <line x1="48" y1="-25" x2="64" y2="-25" stroke="#1a1613" stroke-width="1"/>
</g>

<g transform="translate(580, 800)">
  <rect x="0" y="20" width="80" height="80" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5"/>
  <path d="M -5 20 L 40 -10 L 85 20 Z" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="32" y="65" width="16" height="35" fill="none" stroke="#1a1613" stroke-width="1.8"/>
  <circle cx="44" cy="82" r="1" fill="#1a1613"/>
  <rect x="8" y="40" width="15" height="15" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <line x1="15.5" y1="40" x2="15.5" y2="55" stroke="#1a1613" stroke-width="1"/>
  <line x1="8" y1="47.5" x2="23" y2="47.5" stroke="#1a1613" stroke-width="1"/>
  <rect x="57" y="40" width="15" height="15" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <line x1="64.5" y1="40" x2="64.5" y2="55" stroke="#1a1613" stroke-width="1"/>
  <line x1="57" y1="47.5" x2="72" y2="47.5" stroke="#1a1613" stroke-width="1"/>
</g>

<g transform="translate(1120, 620)">
  <path d="M 0 15 Q -6 -2 12 -2 Q 20 -15 40 -8 Q 55 -15 65 5 Q 80 5 72 20 L 5 20 Q -8 18 0 15 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="25" cy="8" r="1.5" fill="#1a1613"/>
  <circle cx="42" cy="8" r="1.5" fill="#1a1613"/>
  <path d="M 25 15 Q 33 18 42 15" fill="none" stroke="#1a1613" stroke-width="1.5" stroke-linecap="round"/>
</g>

<g transform="translate(1140, 880)">
  <circle cx="0" cy="0" r="45" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5"/>
  <circle cx="0" cy="0" r="10" fill="#1a1613"/>
  <g stroke="#1a1613" stroke-width="2" fill="#f5efe2">
    <rect x="-5" y="-55" width="10" height="13"/>
    <rect x="-5" y="42" width="10" height="13"/>
    <rect x="-55" y="-5" width="13" height="10"/>
    <rect x="42" y="-5" width="13" height="10"/>
    <g transform="rotate(45)"><rect x="-5" y="-55" width="10" height="13"/><rect x="-5" y="42" width="10" height="13"/></g>
    <g transform="rotate(-45)"><rect x="-5" y="-55" width="10" height="13"/><rect x="-5" y="42" width="10" height="13"/></g>
  </g>
  <g stroke="#1a1613" stroke-width="1.5" fill="none">
    <circle cx="0" cy="0" r="28"/>
    <line x1="0" y1="-40" x2="0" y2="-14"/>
    <line x1="0" y1="14" x2="0" y2="40"/>
    <line x1="-40" y1="0" x2="-14" y2="0"/>
    <line x1="14" y1="0" x2="40" y2="0"/>
  </g>
</g>

<g transform="translate(1200, 680)">
  <line x1="0" y1="0" x2="0" y2="55" stroke="#1a1613" stroke-width="3" stroke-linecap="round"/>
  <path d="M 0 5 Q -30 -10 -25 -35 Q -5 -50 10 -35 Q 30 -40 32 -15 Q 35 10 5 8 Q -15 10 -18 -3 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
</g>
<g transform="translate(1280, 780)">
  <line x1="0" y1="0" x2="0" y2="35" stroke="#1a1613" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 0 2 Q -20 -8 -18 -25 Q -2 -35 8 -24 Q 20 -28 22 -10 Q 24 6 4 5 Q -10 6 -12 -2 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
</g>

<g transform="translate(420, 970)">
  <ellipse cx="0" cy="0" rx="75" ry="25" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5"/>
  <path d="M -50 -8 Q -40 -12 -30 -8" fill="none" stroke="#1a1613" stroke-width="1"/>
  <path d="M -20 -3 Q -10 -6 0 -3" fill="none" stroke="#1a1613" stroke-width="1"/>
  <path d="M 20 -5 Q 30 -8 40 -5" fill="none" stroke="#1a1613" stroke-width="1"/>
  <ellipse cx="45" cy="5" rx="12" ry="5" fill="none" stroke="#1a1613" stroke-width="1.5"/>
  <path d="M 45 5 L 50 2" stroke="#1a1613" stroke-width="1"/>
</g>

<g transform="translate(290, 1110) rotate(-12)">
  <path d="M 0 -38 L 11 -11 L 38 -9 L 17 9 L 24 38 L 0 22 L -24 38 L -17 9 L -38 -9 L -11 -11 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="0" cy="0" r="3" fill="#1a1613"/>
</g>

<g transform="translate(820, 1120)">
  <g fill="#f5efe2" stroke="#1a1613" stroke-width="2.5" stroke-linejoin="round">
    <path d="M 0 0 Q -45 -35 -62 -8 Q -56 30 -22 34 Z"/>
    <path d="M 0 0 Q -22 -55 6 -68 Q 35 -56 22 -22 Z"/>
    <path d="M 0 0 Q 35 -45 62 -28 Q 75 5 38 24 Z"/>
    <path d="M 0 0 Q 58 12 52 46 Q 18 62 -6 45 Z"/>
    <path d="M 0 0 Q -22 35 -52 28 Q -68 0 -40 -18 Z"/>
  </g>
  <circle cx="0" cy="0" r="12" fill="#f5efe2" stroke="#1a1613" stroke-width="2.5"/>
  <circle cx="0" cy="0" r="5" fill="#1a1613"/>
  <path d="M -55 40 Q -90 35 -100 62 Q -82 75 -52 58" fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 50 46 Q 88 42 98 68 Q 82 80 55 64" fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
</g>

<g transform="translate(1040, 1100)">
  <path d="M 0 10 Q -6 -5 14 -5 Q 22 -18 42 -10 Q 58 -18 62 0 Q 78 2 70 18 L 5 18 Q -10 18 0 10 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="28" cy="4" r="1.8" fill="#1a1613"/>
  <circle cx="45" cy="4" r="1.8" fill="#1a1613"/>
  <path d="M 28 10 Q 36 14 45 10" fill="none" stroke="#1a1613" stroke-width="1.5" stroke-linecap="round"/>
</g>

<path d="M 340 1160 Q 500 1210 680 1180 Q 820 1155 960 1190 Q 1120 1225 1260 1180"
  fill="none" stroke="#1a1613" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 6"/>

<g transform="translate(1260, 420)">
  <path d="M 0 4 C -4 -2 -10 0 -8 6 C -6 10 0 14 0 14 C 0 14 6 10 8 6 C 10 0 4 -2 0 4 Z"
    fill="#c43f2e" stroke="#1a1613" stroke-width="1.2"/>
</g>
<g transform="translate(500, 490)">
  <circle cx="0" cy="8" r="4" fill="#1a1613"/>
  <line x1="4" y1="8" x2="4" y2="-8" stroke="#1a1613" stroke-width="1.5"/>
  <path d="M 4 -8 Q 12 -5 12 0" fill="none" stroke="#1a1613" stroke-width="1.5"/>
</g>
<g transform="translate(680, 870) rotate(-8)">
  <text x="0" y="0" font-family="serif" font-style="italic" font-size="12" fill="#1a1613">what is your job?</text>
</g>
<g transform="translate(840, 600) rotate(5)">
  <path d="M -8 0 Q -12 10 0 12 Q 10 14 8 4 Q 15 8 22 0 L 20 -8 Z"
    fill="#f5efe2" stroke="#1a1613" stroke-width="1.5" stroke-linejoin="round"/>
  <text x="-4" y="8" font-family="serif" font-style="italic" font-size="9" fill="#1a1613">oh yeah!</text>
</g>
</svg>
`;
