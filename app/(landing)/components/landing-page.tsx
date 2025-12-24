import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingPhilosophy } from "./landing-philosophy";
import { LandingFeatures } from "./landing-features";
import { LandingPricing } from "./landing-pricing";
import { LandingFooter } from "./landing-footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-black selection:text-white"
         style={{
           backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)",
           backgroundSize: "40px 40px"
         }}
    >
      <LandingNav />
      <LandingHero />
      <LandingPhilosophy />
      <LandingFeatures />
      <LandingPricing />
      <LandingFooter />
    </div>
  );
}
