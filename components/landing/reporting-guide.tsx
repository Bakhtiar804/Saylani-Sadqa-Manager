const questions = [
  {
    title: "Which locations should we review?",
    detail: "Compare locations over the same period to spot boxes with irregular or missing collections.",
  },
  {
    title: "Are city totals telling the full story?",
    detail: "Look at how much each contributing box collected alongside the city total. Larger networks can bring in more overall even when individual boxes collect less.",
  },
  {
    title: "Which records still need verification?",
    detail: "Check whether collection amounts have been verified before using them in a report.",
  },
];

export function ReportingGuide() {
  return (
    <section aria-labelledby="reporting-guide-title" className="border-b border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.25fr] lg:items-start lg:gap-16 lg:py-18">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Using collection reports</p>
          <h2 id="reporting-guide-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What to look for in a report</h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
            Use these questions when reviewing a collection period with your team.
          </p>
          <a href="#analytics" className="mt-5 inline-flex items-center gap-2 rounded-sm font-semibold text-brand-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            See a sample report <span aria-hidden="true">↓</span>
          </a>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {questions.map(({ title, detail }) => (
            <li key={title} className="p-5 sm:px-6">
              <h3 className="font-semibold text-primary">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
