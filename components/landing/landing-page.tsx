import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingFeatures } from "./landing-features";
import { LandingPricing } from "./landing-pricing";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
    </div>
  );
}

