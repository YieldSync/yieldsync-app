import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { Pricing } from "@/components/pricing"
import { Faq } from "@/components/faq"
import { Cta } from "@/components/cta"
import { SiteFooter } from "@/components/site-footer"
import { SectionSpacer } from "@/components/brand"

export default function Page() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <SectionSpacer />
        <Features />
        <SectionSpacer />
        <HowItWorks />
        <SectionSpacer />
        <Pricing />
        <SectionSpacer />
        <Faq />
        <SectionSpacer />
        <Cta />
      </main>
      <SiteFooter />
    </div>
  )
}
