import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Box & Location Management",
    description: "Register boxes with unique IDs and track their locations, custodians, and status.",
    icon: "M3 7l9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7m-9 4v10M8 5l9 4",
  },
  {
    title: "Collection Tracking",
    description: "Link each collection to a box and keep a searchable record of amounts, dates, and verification.",
    icon: "M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6m-6 4h6m-6 4h3",
  },
  {
    title: "Rider Tasks",
    description: "Assign boxes and routes to riders and follow collection tasks through completion.",
    icon: "M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Zm2-1h6v4H9V3Zm0 11 2 2 4-4",
  },
  {
    title: "Partner Management",
    description: "Keep external organization details and agreements together, and track boxes and collections by partner.",
    icon: "M3 21h18M5 21V8h7v13m0-16 7-2v18M8 11v1m0 3v1m7-8v1m0 3v1m0 3v1",
  },
  {
    title: "Analytics & Reports",
    description: "Compare collections by city, box, rider, or partner across daily, weekly, and monthly reports.",
    icon: "M3 3v18h18M8 16v-4m5 4V9m5 7V5",
  },
  {
    title: "Audit & Accountability",
    description: "Review activity logs, box status changes, and security incidents with role-based access.",
    icon: "M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10Zm-3-10 2 2 4-4",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-22">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Platform capabilities</p>
        <h2 id="features-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Manage the full collection cycle</h2>
        <p className="mt-4 text-muted-foreground">From registering a Sadqa box to reviewing what it collects, see what the platform is designed to support.</p>
      </div>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, description, icon }) => (
          <Card key={title} className="group p-6">
            <div className="mb-5 grid size-12 place-items-center rounded-xl bg-primary/8 text-primary group-even:bg-accent/20">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
            </div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
