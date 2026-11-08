import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import logo from "@/public/images/saylani_logo.webp";

export const metadata: Metadata = {
  title: "Sign in | Saylani Sadqa Manager",
  description: "Sign in to your Saylani Sadqa Manager account.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-card">
      <div className="min-h-screen">
        <section className="grid min-h-screen w-full overflow-hidden bg-card lg:grid-cols-[0.88fr_1.12fr]">
          <aside className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-footer p-7 text-primary-foreground sm:p-10 lg:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-20 size-80 rounded-full border border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-4 size-48 rounded-full border border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-20 size-80 rounded-full bg-accent/15 blur-2xl" />

            <div className="relative">
              <Link
                href="/"
                aria-label="Saylani home"
                className="mb-8 inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <Image src={logo} alt="Saylani Welfare" priority className="h-auto w-32 sm:w-36" />
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium tracking-wide text-primary-foreground">
                <span className="size-1.5 rounded-full bg-accent" />
                SAYLANI SADQA MANAGER
              </span>
              <h1 className="mt-8 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Welcome back to your impact.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/75 sm:text-base sm:leading-7">
                Sign in to manage your donation work, coordinate collection teams, and follow your impact.
              </p>
            </div>

            <div className="relative mt-10 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.07] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="size-5">
                    <path d="M12 3.5 19 6v5.5c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Built around clarity and trust</p>
                  <p className="mt-1.5 text-sm leading-6 text-primary-foreground/70">
                    Keep your donation operations organized and your team focused on meaningful work.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex items-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
            <div className="mx-auto w-full max-w-lg">
              <div>
                <p className="text-sm font-semibold text-primary">WELCOME BACK</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Sign in to your account</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Enter your details to continue to Saylani Sadqa Manager.
                </p>
              </div>

              <div className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/65 hover:border-accent focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/65 hover:border-accent focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="size-4 rounded accent-primary" />
                  Remember me
                </label>
                <span className="font-medium text-primary">Forgot password?</span>
              </div>

              <button
                type="button"
                className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Sign in
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="ml-2 size-4">
                  <path d="M4 10h12m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Need help accessing your account? <span className="font-semibold text-primary">Contact your administrator</span>
              </p>
              <p className="mt-8 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
                Your account helps keep donation operations organized and secure.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
