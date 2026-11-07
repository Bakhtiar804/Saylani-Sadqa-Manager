export function HeroArt() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full xl:block" viewBox="0 0 1280 530" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="hero-art-gradient" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-blue)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <g stroke="url(#hero-art-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(55 148) rotate(-10 55 56)">
          <path d="M11 47 52 26l55 20-41 23zM11 47v48l55 22 41-23V46M66 69v48M44 49l22-11M32 76l15 6" />
          <path d="M68 14v-9M86 21l7-8M48 17l-5-8" />
        </g>
        <path d="M82 482c25-77 99-115 184-77m771-227c66 16 127 0 161-58" strokeDasharray="5 9" opacity=".65" />
        <g transform="translate(1146 80) rotate(12 33 35)">
          <path d="M33 63S11 43 11 29a22 22 0 1 1 44 0c0 14-22 34-22 34Z" />
          <circle cx="33" cy="28" r="8" />
        </g>
        <g transform="translate(1075 337) rotate(9 58 46)">
          <rect x="5" y="5" width="106" height="83" rx="12" />
          <path d="M24 69h66M31 61V48m19 13V40m19 21V46m19 15V30M28 37l21-12 20 7 17-14" />
        </g>
        <path d="M219 286v12m-6-6h12m830-46v12m-6-6h12M986 448v12m-6-6h12" opacity=".7" />
      </g>
    </svg>
  );
}
