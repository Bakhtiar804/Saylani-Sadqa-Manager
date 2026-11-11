import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Box & Location Management",
    caption: "Find each box and its custodian.",
    outline: "m5 23 11-5 11 5-11 5-11-5v12l11 5 11-5V23M16 28v12",
    detail: "M35 28s-8-7-8-13a8 8 0 1 1 16 0c0 6-8 13-8 13Zm0-13h.1",
  },
  {
    title: "Collection Tracking",
    caption: "See each pickup, amount, and date.",
    outline: "M9 7h24v30l-4-3-4 3-4-3-4 3-4-3-4 3zm6 8h12m-12 6h10m-10 6h5",
    detail: "M25 33a9 9 0 1 0 18 0 9 9 0 0 0-18 0Zm9-5v5l3 2",
  },
  {
    title: "Rider Tasks",
    caption: "Assign routes and track completed stops.",
    outline: "M8 33c0-9 11-3 11-12s11-4 11-11M5 33a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm22-23a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
    detail: "M24 28h18v14H24zm4 7 3 3 6-6",
  },
  {
    title: "Partner Management",
    caption: "Track boxes and collections by partner.",
    outline: "M4 37h40M7 37V18l12-5v24m10 0V8h12v29M11 23h4m-4 6h4m18-14h4m-4 6h4m-4 6h4",
    detail: "M19 30h10m-7-3-3 3 3 3m4-6 3 3-3 3",
  },
  {
    title: "Analytics & Reports",
    caption: "Compare donations across cities and periods.",
    outline: "M5 10h38v27H5zm0 7h38m-29 15v-6m10 6V23m10 9V20",
    detail: "M10 14h.1m4 0h.1m6 24v4m8-4v4m-12 0h16",
  },
  {
    title: "Audit & Accountability",
    caption: "Trace collections and record changes.",
    outline: "M24 6l15 6v10c0 9-6 16-15 20-9-4-15-11-15-20V12z",
    detail: "m17 24 5 5 9-10",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-10 sm:px-8 lg:py-12">
      <header className="text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Platform capabilities</p>
        <h2 id="features-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Manage the full collection cycle</h2>
      </header>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, caption, outline, detail }) => (
          <Card key={title} className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="grid size-17 place-items-center rounded-xl bg-surface">
              <svg aria-hidden="true" className="size-12" viewBox="0 0 48 48" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={outline} stroke="var(--primary)" />
                <path d={detail} stroke="var(--brand-blue)" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold leading-snug tracking-tight">{title}</h3>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{caption}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
