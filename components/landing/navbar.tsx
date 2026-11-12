import Link from "next/link";
import { AuthAction } from "./auth-action";
import { Brand } from "./brand";
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <header className="border-b border-border bg-card">
      <nav aria-label="Main navigation" className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="Saylani home" className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Brand className="w-28 sm:w-37" />
        </Link>
        <div className="flex gap-2 sm:gap-3">
          <AuthAction action="signIn">Sign In</AuthAction>
          <Button asChild><Link href="/leaderboard">Leaderboard</Link></Button>
        </div>
      </nav>
    </header>
  );
}
