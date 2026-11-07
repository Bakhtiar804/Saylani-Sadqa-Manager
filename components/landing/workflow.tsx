const scenes = [
  {
    label: "Register Sadqa boxes",
    art: (
      <>
        <path d="M30 111h161M44 109V69l26-16 26 16v42M53 83h13m-13 11h13" stroke="var(--border)" />
        <path d="M69 70 114 48l50 22-45 23z" fill="var(--surface)" />
        <path d="M69 70v42l50 21V93z" fill="var(--card)" />
        <path d="M119 93l45-23v42l-45 21z" fill="var(--accent)" fillOpacity=".24" />
        <path d="m103 73 20-10m-40 31 20 8" />
        <circle cx="114" cy="37" r="10" fill="var(--card)" stroke="var(--brand-blue)" />
        <path d="M114 34v6" stroke="var(--brand-blue)" />
        <path d="M170 54s-15-13-15-24a15 15 0 1 1 30 0c0 11-15 24-15 24Z" fill="var(--card)" stroke="var(--brand-blue)" />
        <circle cx="170" cy="30" r="5" stroke="var(--brand-blue)" />
      </>
    ),
  },
  {
    label: "Collect and verify donations",
    art: (
      <>
        <path d="M26 116h172M31 123h163" stroke="var(--border)" />
        <path d="M128 25h49v68l-6-4-6 4-6-4-6 4-6-4-6 4-7-4-6 4z" fill="var(--card)" />
        <path d="M139 40h27m-27 11h23m-23 11h13" stroke="var(--brand-blue)" />
        <circle cx="176" cy="80" r="17" fill="var(--surface)" />
        <path d="m168 80 5 5 11-11" />
        <circle cx="51" cy="102" r="15" fill="var(--card)" />
        <circle cx="104" cy="102" r="15" fill="var(--card)" />
        <path d="M51 102l17-25 18 25H51m35 0 14-35h11m-11 0 4 35M63 77h13m-10-11 11-16 17 13 9-1m-26-12 6 18-11 12" />
        <circle cx="83" cy="36" r="9" fill="var(--surface)" stroke="var(--brand-blue)" />
      </>
    ),
  },
  {
    label: "Compare city collections",
    art: (
      <>
        <rect x="39" y="27" width="142" height="89" rx="9" fill="var(--card)" />
        <path d="M39 47h142m-129-10h.1m7 0h.1m7 0h.1" stroke="var(--brand-blue)" />
        <path d="M64 62v39h94M65 80h92" stroke="var(--border)" />
        <rect x="81" y="81" width="15" height="20" rx="2" fill="var(--accent)" stroke="none" />
        <rect x="107" y="73" width="15" height="28" rx="2" fill="var(--brand-blue)" stroke="none" />
        <rect x="133" y="60" width="15" height="41" rx="2" fill="var(--primary)" stroke="none" />
        <path d="M98 117v12m24-12v12m-34 0h44" />
      </>
    ),
  },
];

export function Workflow() {
  return (
    <section id="workflow" aria-labelledby="workflow-title" className="landing-workflow scroll-mt-6 border-b border-border bg-card px-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 id="workflow-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl">From Sadqa Box to City Report</h2>
        <ol role="list" className="landing-workflow-list rounded-2xl border border-border bg-surface">
          {scenes.map(({ label, art }, index) => (
            <li key={label} className="landing-workflow-item">
              <svg aria-hidden="true" className="h-auto w-full max-w-44" viewBox="0 0 220 145" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                {art}
              </svg>
              <h3 className="text-xs leading-snug font-bold text-primary sm:text-base">{label}</h3>
              {index < scenes.length - 1 && (
                <span aria-hidden="true" className="landing-workflow-arrow grid size-5 place-items-center sm:size-7 rounded-full border border-border bg-card text-primary">
                  <svg className="size-3 sm:size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10h12m-5-5 5 5-5 5" />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
