import Link from "next/link";
import { Button } from "@/components/ui/button";

// Set these to the public auth route paths when they are added to the app.
const authRoutes: Record<"signIn" | "signUp", string | null> = {
  signIn: null,
  signUp: null,
};

export function AuthAction({ action, children }: {
  action: keyof typeof authRoutes;
  children: React.ReactNode;
}) {
  const href = authRoutes[action];
  const variant = action === "signIn" ? "outline" : "default";

  if (href) {
    return <Button asChild variant={variant}><Link href={href}>{children}</Link></Button>;
  }

  return <Button type="button" variant={variant} disabled>{children}</Button>;
}
