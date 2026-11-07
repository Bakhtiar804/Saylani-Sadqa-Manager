import { Card } from "@/components/ui/card";

const collections = [
  { city: "Karachi", amount: 320000, boxes: 640 },
  { city: "Faisalabad", amount: 480000, boxes: 800 },
];

const scale = 500000;
const formatAmount = new Intl.NumberFormat("en-PK");
const totalCollected = collections.reduce((total, city) => total + city.amount, 0);
const totalBoxes = collections.reduce((total, city) => total + city.boxes, 0);
const metrics = [
  { label: "Total collected", value: `PKR ${formatAmount.format(totalCollected)}` },
  { label: "Boxes with collections", value: formatAmount.format(totalBoxes) },
  { label: "Average per contributing box", value: `PKR ${formatAmount.format(Math.round(totalCollected / totalBoxes))}` },
];

export function AnalyticsPreview() {
  return (
    <section id="analytics" aria-labelledby="analytics-title" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-22">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-accent-strong uppercase">Analytics preview</p>
        <h2 id="analytics-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Monthly collection snapshot</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">Start with the combined totals for Karachi and Faisalabad, then see how much each city contributed over the same reporting period.</p>
        <p id="metrics-note" className="mt-5 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold">Illustrative data · Monthly reporting period</p>
      </div>
      <dl aria-describedby="metrics-note" className="mt-4 grid gap-3 md:grid-cols-3">
        {metrics.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-2 text-2xl font-bold tracking-tight text-accent-strong tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <Card className="mt-5 p-5 sm:p-7">
        <figure aria-labelledby="chart-title">
          <figcaption>
            <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold">Illustrative data</span>
            <h3 id="chart-title" className="mt-3 text-lg font-bold">City-wise collections</h3>
            <p className="mt-1 text-sm text-muted-foreground">Monthly reporting period · Pakistani rupees (PKR)</p>
          </figcaption>
          <ul className="mt-6 space-y-5">
            {collections.map(({ city, amount }) => (
              <li key={city}>
                <div className="mb-2 flex flex-wrap justify-between gap-x-3 text-sm font-semibold">
                  <span>{city}</span>
                  <span className="tabular-nums">PKR {formatAmount.format(amount)}</span>
                </div>
                <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-accent-strong" style={{ width: `${amount / scale * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>0</span><span>250k</span><span>500k PKR</span>
          </div>
        </figure>
      </Card>
    </section>
  );
}
