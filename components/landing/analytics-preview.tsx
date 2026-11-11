import { Card } from "@/components/ui/card";

// Public illustration only; authenticated reports contain the actual workbook data.
const collections = [
  { city: "Karachi", amount: 480000, boxes: 800 },
  { city: "Faisalabad", amount: 420000, boxes: 700 },
  { city: "Lahore", amount: 310000, boxes: 620 },
  { city: "Hyderabad", amount: 265000, boxes: 530 },
  { city: "Islamabad", amount: 185000, boxes: 370 },
  { city: "Multan", amount: 140000, boxes: 280 },
];

const scale = 500000;
const barCells = 40;
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
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Six-city illustration. Sign in for actual source reports.</p>
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
                <div aria-hidden="true" data-cell-bar={city} className="grid h-5 gap-[3px] sm:h-6 sm:gap-1" style={{ gridTemplateColumns: `repeat(${barCells}, minmax(0, 1fr))` }}>
                  {Array.from({length:barCells},(_,index)=>{
                    const fill=Math.max(0,Math.min(1,amount/scale*barCells-index))*100;
                    return <span key={index} className="rounded-[3px] bg-surface" style={{background:fill>0?`linear-gradient(to right, var(--accent-strong) ${fill}%, var(--surface) ${fill}%)`:undefined}}/>;
                  })}
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
