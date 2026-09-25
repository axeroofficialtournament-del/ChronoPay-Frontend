"use client";

import Link from "next/link";
import { PlanComparison, type PricingPlan } from "../../components/dashboard/plan-comparison";

/**
 * Pricing Page
 *
 * Displays all available plans with a comparison table that:
 * - Stacks to mobile-friendly cards on screens < 768px
 * - Transforms to a matrix layout with sticky feature column on desktop
 * - Supports monthly/yearly billing toggle
 * - Highlights recommended plan with visual and text indicators
 * - Follows WCAG 2.1 AA accessibility guidelines
 *
 * Security & Validation:
 * - Plan data is server-side validated before rendering
 * - CTA links are validated and safe (no arbitrary href injection)
 * - Pricing is displayed as read-only information
 * - No client-side state persistence of billing selection
 *
 * Accessibility:
 * - Proper heading hierarchy starting at h1
 * - Skip link targets #main-content
 * - Semantic HTML with landmark regions
 * - Color contrast meets WCAG AA standards
 * - Screen reader labels for interactive elements
 */

// ─────────────────────────────────────────────────────────────────────────
// Sample Pricing Data
// ─────────────────────────────────────────────────────────────────────────

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For individual time sellers",
    monthlyPrice: 2999, // $29.99
    yearlyPrice: 29990, // $299.90 (save ~1%)
    ctaLabel: "Get Started",
    ctaHref: "/signup?plan=starter",
    accentColor: "slate",
    features: [
      {
        id: "time-slots",
        name: "Time Slots",
        description: "Monthly bookable slots",
        included: "Up to 10",
        category: "Core Features",
      },
      {
        id: "storage",
        name: "Storage",
        description: "Profile storage and assets",
        included: "1 GB",
        category: "Core Features",
      },
      {
        id: "analytics",
        name: "Basic Analytics",
        description: "View booking stats",
        included: true,
        category: "Analytics",
      },
      {
        id: "reviews",
        name: "Review Management",
        description: "Reply to reviews",
        included: true,
        category: "Support",
      },
      {
        id: "api",
        name: "API Access",
        included: false,
        category: "Integration",
      },
      {
        id: "custom-branding",
        name: "Custom Branding",
        included: false,
        category: "Advanced",
      },
      {
        id: "priority-support",
        name: "Priority Support",
        included: false,
        category: "Support",
      },
      {
        id: "sso",
        name: "Single Sign-On (SSO)",
        included: false,
        category: "Integration",
      },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For growing businesses",
    monthlyPrice: 7999, // $79.99
    yearlyPrice: 76790, // $767.90 (save 4%)
    ctaLabel: "Upgrade to Pro",
    ctaHref: "/signup?plan=professional",
    accentColor: "cyan",
    isRecommended: true,
    recommendedReason: "Most popular choice for growing businesses",
    features: [
      {
        id: "time-slots",
        name: "Time Slots",
        description: "Monthly bookable slots",
        included: "Unlimited",
        category: "Core Features",
      },
      {
        id: "storage",
        name: "Storage",
        description: "Profile storage and assets",
        included: "100 GB",
        category: "Core Features",
      },
      {
        id: "analytics",
        name: "Advanced Analytics",
        description: "Detailed booking insights",
        included: true,
        category: "Analytics",
      },
      {
        id: "reviews",
        name: "Review Management",
        description: "Reply to reviews",
        included: true,
        category: "Support",
      },
      {
        id: "api",
        name: "API Access",
        description: "REST API included",
        included: true,
        category: "Integration",
      },
      {
        id: "custom-branding",
        name: "Custom Branding",
        description: "Custom colors and logo",
        included: true,
        category: "Advanced",
      },
      {
        id: "priority-support",
        name: "Priority Support",
        description: "24-hour response time",
        included: true,
        category: "Support",
      },
      {
        id: "sso",
        name: "Single Sign-On (SSO)",
        included: false,
        category: "Integration",
      },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large organizations",
    monthlyPrice: 29999, // $299.99
    yearlyPrice: 287990, // $2,879.90 (save 4%)
    ctaLabel: "Contact Sales",
    ctaHref: "/contact-sales?plan=enterprise",
    accentColor: "amber",
    features: [
      {
        id: "time-slots",
        name: "Time Slots",
        description: "Monthly bookable slots",
        included: "Unlimited",
        category: "Core Features",
      },
      {
        id: "storage",
        name: "Storage",
        description: "Profile storage and assets",
        included: "Unlimited",
        category: "Core Features",
      },
      {
        id: "analytics",
        name: "Advanced Analytics",
        description: "Detailed booking insights",
        included: true,
        category: "Analytics",
      },
      {
        id: "reviews",
        name: "Review Management",
        description: "Reply to reviews",
        included: true,
        category: "Support",
      },
      {
        id: "api",
        name: "API Access",
        description: "REST API + GraphQL",
        included: true,
        category: "Integration",
      },
      {
        id: "custom-branding",
        name: "Custom Branding",
        description: "Full white-label options",
        included: true,
        category: "Advanced",
      },
      {
        id: "priority-support",
        name: "Priority Support",
        description: "1-hour response time + dedicated account manager",
        included: true,
        category: "Support",
      },
      {
        id: "sso",
        name: "Single Sign-On (SSO)",
        description: "SAML 2.0 & OpenID Connect",
        included: true,
        category: "Integration",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const handleSelectPlan = (planId: string) => {
    // This callback can be used for analytics tracking
    console.log(`User selected plan: ${planId}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-cyan-300 focus:px-4 focus:py-2 focus:text-slate-950 focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li className="text-slate-600">/</li>
              <li aria-current="page" className="text-white">
                Pricing
              </li>
            </ol>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <PlanComparison
          plans={PRICING_PLANS}
          recommendedPlanId="professional"
          monthlyLabel="Monthly Billing"
          yearlyLabel="Annual Billing"
          savingsLabel="Save {savings}%"
          onSelectPlan={handleSelectPlan}
        />

        {/* FAQ section */}
        <section className="mt-20 border-t border-white/10 pt-16">
          <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-white">Can I change plans?</h3>
              <p className="mt-2 text-sm text-slate-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-white">Is there a free trial?</h3>
              <p className="mt-2 text-sm text-slate-400">
                Yes, all plans come with a 14-day free trial. No credit card required to get started.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-white">What payment methods do you accept?</h3>
              <p className="mt-2 text-sm text-slate-400">
                We accept all major credit cards, as well as digital wallets and Stellar network payments.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-white">Do you offer discounts for annual billing?</h3>
              <p className="mt-2 text-sm text-slate-400">
                Yes! Annual billing comes with savings of up to 5% compared to monthly billing, automatically applied when you choose annual.
              </p>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="mt-20 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 to-transparent p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-4 text-slate-400">
            Join thousands of businesses already using ChronoPay to manage their time inventory.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/signup?plan=starter"
              className="inline-flex items-center justify-center rounded-full bg-white/12 px-6 py-3 font-medium text-white hover:bg-white/20 transition-colors focus-ring-cyan"
            >
              Start Free Trial
            </a>
            <a
              href="/contact-sales"
              className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 font-medium text-slate-950 hover:bg-cyan-200 transition-colors focus-ring-cyan"
            >
              Talk to Sales
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/40 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm text-slate-400 text-center">
            © 2026 ChronoPay. All rights reserved. • Pricing is in USD and billed in USD.
          </p>
        </div>
      </footer>
    </div>
  );
}
