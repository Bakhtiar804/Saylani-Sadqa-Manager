import { Button } from "@/components/ui/button";
import { AuthAction } from "./auth-action";
import { Brand } from "./brand";
import { HeroArt } from "./hero-art";

export function Hero() {
  return (
    <section aria-labelledby="landing-title" className="relative isolate overflow-hidden bg-surface">
      <div className="relative mx-auto max-w-7xl px-5 py-17 text-center sm:px-8 sm:py-21 lg:py-24">
        <HeroArt />
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[0.65rem] font-bold tracking-[0.18em] text-primary uppercase">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          Saylani Sadqa Operations
        </p>
        <h1 id="landing-title" className="mx-auto max-w-5xl text-[clamp(2.25rem,5.2vw,4rem)] leading-[1.06] font-bold tracking-[-0.055em] text-balance">
          Donation Management System
          <span className="block text-primary">&amp; Analytics Platform</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Manage Sadqa boxes, coordinate collection teams, and understand donation performance across locations.
        </p>
        <Brand className="mx-auto mt-7 w-40 sm:w-46" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <AuthAction action="signUp">Get Started <span aria-hidden="true">↗</span></AuthAction>
          <Button asChild variant="outline"><a href="#features">Explore Features <span aria-hidden="true">↓</span></a></Button>
        </div>
      </div>
    </section>
  );
}
