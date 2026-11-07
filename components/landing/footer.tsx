import { Brand } from "./brand";

const pageLinks = [
  { label: "Home", href: "/" },
  { label: "Platform features", href: "#features" },
  { label: "How it works", href: "#workflow" },
  { label: "Analytics preview", href: "#analytics" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-footer text-primary-foreground">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-14 lg:py-13">
          <div>
            <div className="inline-flex rounded-xl bg-card px-3 py-2">
              <Brand className="w-36" />
            </div>
            <p className="mt-4 font-semibold">Donation Management System &amp; Analytics Platform</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
              Saylani&apos;s platform for organizing Sadqa boxes, coordinating collection teams, and reviewing donation activity.
            </p>
          </div>
          <nav aria-labelledby="footer-pages">
            <h2 id="footer-pages" className="font-semibold">Explore the platform</h2>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
              {pageLinks.map(({ label, href }) => (
                <li key={href}>
                  <a href={href} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">{label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="font-semibold">Reporting coverage</h2>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
              <li>Daily, weekly, and monthly summaries</li>
              <li>City and box-level comparisons</li>
              <li>Collection verification and audit history</li>
            </ul>
          </div>
        </div>
        <p className="border-t border-primary-foreground/15 py-5 text-xs text-primary-foreground/75">Saylani Welfare · Sadqa Box Operations</p>
      </div>
    </footer>
  );
}
