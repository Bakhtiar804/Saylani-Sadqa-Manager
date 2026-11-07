import { AnalyticsPreview } from "@/components/landing/analytics-preview";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { ReportingGuide } from "@/components/landing/reporting-guide";
import { StatsStrip } from "@/components/landing/stats-strip";
import { Workflow } from "@/components/landing/workflow";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StatsStrip />
        <Workflow />
        <Features />
        <ReportingGuide />
        <AnalyticsPreview />
      </main>
      <Footer />
    </>
  );
}
