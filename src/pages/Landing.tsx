import { useAnalytics } from '@/hooks/useAnalytics';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { IntegrationsSection } from '@/components/landing/IntegrationsSection';
import { SchemaSection } from '@/components/landing/SchemaSection';
import { DemoCtaSection, FinalCtaSection } from '@/components/landing/CtaSections';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Landing() {
  useAnalytics();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <IntegrationsSection />
      <SchemaSection />
      <DemoCtaSection />
      <FinalCtaSection />
      <LandingFooter />
    </div>
  );
}
