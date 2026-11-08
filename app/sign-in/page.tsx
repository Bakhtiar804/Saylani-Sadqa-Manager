import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/landing/brand";
import { Card } from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign In | Saylani Donation Management",
};

export default function SignInPage() {
  return (
    <main className="relative isolate grid min-h-dvh items-center overflow-hidden bg-surface px-5 py-8 sm:px-8 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-24 -z-10 size-100 rounded-full bg-accent/12 blur-3xl" />
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 10H4m5 5-5-5 5-5" />
          </svg>
          Back to home
        </Link>
        <Card className="overflow-hidden shadow-md">
          <header className="relative isolate flex flex-wrap items-center justify-between gap-x-6 gap-y-3 overflow-hidden border-b border-border bg-linear-to-br from-surface to-accent/15 px-6 py-6 sm:px-9 sm:py-7">
            <svg aria-hidden="true" viewBox="0 0 140 140" className="pointer-events-none absolute -top-11 -right-9 -z-10 size-44 text-primary/18" fill="none" stroke="currentColor">
              <circle cx="82" cy="58" r="30" />
              <circle cx="82" cy="58" r="45" />
              <circle cx="82" cy="58" r="60" />
            </svg>
            <Brand className="w-36" />
            <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              Saylani Sadqa Operations
            </p>
          </header>
          <div className="px-6 py-7 sm:px-9 sm:py-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sign In</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Enter your email and password to access the donation management platform.
            </p>
            <SignInForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
