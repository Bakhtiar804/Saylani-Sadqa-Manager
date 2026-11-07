const steps = [
  { title: "Register a box", detail: "Record its ID, installation location, and custodian." },
  { title: "Assign a collection task", detail: "Give a rider the box details and collection route." },
  { title: "Record and verify collection", detail: "Log the amount against the box and verify the record." },
  { title: "Review reports", detail: "Compare collections across locations and reporting periods." },
];

export function Workflow() {
  return (
    <section id="workflow" aria-labelledby="workflow-title" className="scroll-mt-6 border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-17">
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Collection workflow</p>
        <h2 id="workflow-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ title, detail }, index) => (
            <li key={title} className="border-t border-border pt-4">
              <span aria-hidden="true" className="mb-4 inline-flex rounded-full bg-primary/8 px-3 py-1 text-sm font-bold text-primary">0{index + 1}</span>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
