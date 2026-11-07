const stats = [
  { value: "≈49,000", label: "Donation boxes in the network", detail: "PRD estimate" },
  { value: "≈250", label: "Operational team members", detail: "PRD estimate" },
  { value: "6", label: "Planned user roles" },
  { value: "3", label: "Reporting periods", detail: "Daily, weekly, monthly" },
];

export function StatsStrip() {
  return (
    <section aria-label="Network and platform at a glance" className="bg-primary text-primary-foreground">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-8 px-5 py-9 text-center sm:px-8 lg:grid-cols-4 lg:py-11">
        {stats.map(({ value, label, detail }) => (
          <div key={label} className="flex flex-col items-center">
            <dt className="text-sm font-semibold sm:text-base">{label}</dt>
            <dd className="order-first mb-2 text-3xl leading-none font-bold tracking-tight tabular-nums sm:text-5xl">{value}</dd>
            {detail && <dd className="mt-1 text-xs sm:text-sm">{detail}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}
