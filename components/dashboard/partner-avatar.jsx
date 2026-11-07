const backgrounds = ["#e7f1df", "#e6eefb", "#f8eddc", "#f1e9f8", "#e0f1ee"];
const shirts = ["#276431", "#1d65d5", "#b36a2e", "#7750a3", "#347b75"];
const hairColors = ["#26362b", "#3e302c", "#493a2d", "#292b35"];

function hash(value) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

export default function PartnerAvatar({ name, size = 52 }) {
  const seed = hash(name);
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const background = backgrounds[seed % backgrounds.length];
  const shirt = shirts[seed % shirts.length];
  const hair = hairColors[seed % hairColors.length];

  return (
    <svg
      role="img"
      aria-label={`Fictional portrait of ${name}`}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="shrink-0 rounded-full ring-2 ring-white"
    >
      <defs>
        <clipPath id={`portrait-${id}`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#portrait-${id})`}>
        <rect width="64" height="64" fill={background} />
        <path d="M9 66c1-15 9-22 23-22s22 7 23 22" fill={shirt} />
        <path d="M26 39h12v12H26z" fill="#bd8060" />
        <ellipse cx="32" cy="29" rx="16" ry="19" fill="#d99b78" />
        <path d="M16 28c-2-15 5-23 17-23 12 0 19 8 16 25l-4-8c-6-1-12-5-15-9-3 5-8 8-14 9Z" fill={hair} />
        <path d="M25 29h.5m13 0h.5" stroke="#382d2b" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 37c2 2 6 2 8 0" fill="none" stroke="#895747" strokeWidth="1.7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
