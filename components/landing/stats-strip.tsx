const stats = [
  { value: "Public", label: "Community Box Collections" },
  { value: "Branch", label: "Branch Collection Reports" },
  { value: "Monthly", label: "Collections & Expenses" },
  { value: "City-wise", label: "Box Counts & Public Staff" },
];

export function StatsStrip() {
  return (
    <section aria-label="Sadqa operations at a glance" className="bg-primary text-primary-foreground">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-8 px-5 py-9 text-center sm:px-8 lg:grid-cols-4 lg:py-11">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center">
            <dt className="text-sm font-semibold sm:text-base">{label}</dt>
            <dd className="order-first mb-2 text-3xl leading-none font-bold tracking-tight tabular-nums sm:text-5xl">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
