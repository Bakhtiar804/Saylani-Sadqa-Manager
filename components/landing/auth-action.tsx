import Link from "next/link";
import { Button } from "@/components/ui/button";

// Keep actions disabled until their public auth routes are available.
const authRoutes: Record<"signIn" | "signUp", string | null> = {
  signIn: "/sign-in",
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
