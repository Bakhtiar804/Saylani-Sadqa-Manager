import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Donation Management System & Analytics Platform | Saylani",
  description: "Manage Sadqa boxes, coordinate collection teams, and understand donation performance across locations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-foreground">{children}</body>
    </html>
  );
}
