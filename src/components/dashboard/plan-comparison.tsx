"use client";

/**
 * PlanComparison
 *
 * A responsive pricing comparison component that displays available plans
 * in a mobile-friendly card layout (stacked) and transforms to a matrix
 * on desktop with a sticky feature column.
 *
 * Features:
 * - Responsive design: cards on mobile (<768px), matrix on desktop
 * - Monthly/yearly billing toggle with savings calculation
 * - Recommended plan conveyed by both visual styling and ARIA labels
 * - Sticky feature column on desktop for easy scanning
 * - WCAG 2.1 AA accessible with proper heading hierarchy and contrast
 * - Keyboard navigation support
 * - Dark mode optimized
 *
 * Usage:
 * ```tsx
 * import { PlanComparison } from "@/components/dashboard/plan-comparison";
 *
 * <PlanComparison
 *   plans={pricingPlans}
 *   recommendedPlanId="pro"
 * />
 * ```
 */

import { useState, useId, type ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { ButtonLink } from "@/app/components/ui/button-link";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface PricingFeature {
  /** Unique identifier for the feature. */
  id: string;
  /** Display name of the feature (e.g., "Time slots per month"). */
  name: string;
  /** Short description of what this feature includes. */
  description?: string;
  /** Whether this feature is included in this plan. Can be string for partial/custom. */
  included: boolean | string;
  /** Category for grouping features (e.g., "Core", "Analytics", "Support"). */
  category?: string;
}

export interface PricingPlan {
  /** Unique identifier for the plan. */
  id: string;
  /** Display name (e.g., "Starter", "Professional", "Enterprise"). */
  name: string;
  /** Optional subtitle or tagline. */
  tagline?: string;
  /** Monthly price in cents (e.g., 9999 = $99.99). */
  monthlyPrice: number;
  /** Yearly price in cents. If not provided, calculated as monthlyPrice * 12. */
  yearlyPrice?: number;
  /** CTA button text (e.g., "Get Started", "Upgrade"). */
  ctaLabel: string;
  /** CTA button href. */
  ctaHref: string;
  /** Array of included features for this plan. */
  features: PricingFeature[];
  /** Whether this plan is highlighted as recommended. */
  isRecommended?: boolean;
  /** Optional description of why this plan is recommended. */
  recommendedReason?: string;
  /** Custom color accent for the plan (e.g., "cyan", "amber"). Used for variants. */
  accentColor?: "cyan" | "amber" | "emerald" | "slate";
}

export interface PlanComparisonProps {
  /** Array of plans to display. */
  plans: PricingPlan[];
  /** ID of the recommended plan to highlight. */
  recommendedPlanId?: string;
  /** Billing period label for monthly. Defaults to "Monthly". */
  monthlyLabel?: string;
  /** Billing period label for yearly. Defaults to "Yearly". */
  yearlyLabel?: string;
  /** Text shown when yearly billing shows savings. Defaults to "Save {savings}%". */
  savingsLabel?: string;
  /** Additional class names applied to the wrapper. */
  className?: string;
  /** Callback when a plan CTA is clicked. Optional for analytics. */
  onSelectPlan?: (planId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export function PlanComparison({
  plans,
  recommendedPlanId,
  monthlyLabel = "Monthly",
  yearlyLabel = "Yearly",
  savingsLabel = "Save {savings}%",
  className = "",
  onSelectPlan,
}: PlanComparisonProps) {
  const [isYearly, setIsYearly] = useState(false);
  const comparisonId = useId();
  const toggleId = `${comparisonId}-billing-toggle`;

  // Get all unique features across all plans, grouped by category
  const featuresByCategory = getFeaturesByCategory(plans);
  const allFeatures = Object.values(featuresByCategory).flat();

  // Calculate savings percentage if yearly is selected
  const savingsPercentage = calculateSavingsPercentage(plans[0]);

  const handleSelectPlan = (planId: string) => {
    onSelectPlan?.(planId);
  };

  return (
    <div className={clsx("plan-comparison w-full", className)}>
      {/* Header with billing toggle */}
      <div className="mb-8 flex items-center justify-between sm:mb-12">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Choose the plan that fits your needs
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/4 p-1">
          <button
            id={`${toggleId}-monthly`}
            type="button"
            onClick={() => setIsYearly(false)}
            aria-pressed={!isYearly}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              !isYearly
                ? "bg-white/12 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            {monthlyLabel}
          </button>
          <button
            id={`${toggleId}-yearly`}
            type="button"
            onClick={() => setIsYearly(true)}
            aria-pressed={isYearly}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              isYearly
                ? "bg-white/12 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            {yearlyLabel}
            {isYearly && savingsPercentage > 0 && (
              <span
                className="ml-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200"
                aria-label={`${calculateSavingsPercentage(plans[0])}% savings`}
              >
                {savingsLabel.replace("{savings}", String(savingsPercentage))}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: Stacked card layout */}
      <div className="block space-y-4 md:hidden">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isYearly={isYearly}
            isRecommended={plan.id === recommendedPlanId}
            onSelectPlan={handleSelectPlan}
          />
        ))}
      </div>

      {/* Desktop: Matrix layout with sticky feature column */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" role="table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="sticky left-0 z-10 bg-slate-950 pb-4 pr-4 text-left align-bottom">
                  <span className="sr-only">Feature comparison</span>
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className="pb-4 px-4 text-center align-bottom"
                  >
                    <PlanHeader
                      plan={plan}
                      isYearly={isYearly}
                      isRecommended={plan.id === recommendedPlanId}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(featuresByCategory).map(
                ([category, categoryFeatures]) => [
                  <tr key={`${category}-header`} className="border-b border-white/8">
                    <td
                      colSpan={plans.length + 1}
                      className="bg-white/2 px-4 py-3"
                    >
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {category || "Features"}
                      </h3>
                    </td>
                  </tr>,
                  ...categoryFeatures.map((feature) => (
                    <tr key={feature.id} className="border-b border-white/8">
                      <td className="sticky left-0 z-10 bg-slate-950 py-4 pr-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {feature.name}
                          </p>
                          {feature.description && (
                            <p className="mt-1 text-xs text-slate-400">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </td>
                      {plans.map((plan) => {
                        const planFeature = plan.features.find(
                          (f) => f.id === feature.id
                        );
                        return (
                          <td
                            key={`${plan.id}-${feature.id}`}
                            className="py-4 px-4 text-center"
                          >
                            <FeatureCell
                              feature={planFeature}
                              isRecommended={
                                plan.id === recommendedPlanId
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ]
              )}
              {/* CTA row */}
              <tr className="border-t-2 border-white/10">
                <td className="sticky left-0 z-10 bg-slate-950 py-4 pr-4" />
                {plans.map((plan) => (
                  <td key={`${plan.id}-cta`} className="py-4 px-4 text-center">
                    <CTAButton
                      plan={plan}
                      isYearly={isYearly}
                      isRecommended={plan.id === recommendedPlanId}
                      onSelect={handleSelectPlan}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PricingPlan;
  isYearly: boolean;
  isRecommended: boolean;
  onSelectPlan: (planId: string) => void;
}

function PlanCard({
  plan,
  isYearly,
  isRecommended,
  onSelectPlan,
}: PlanCardProps) {
  const price = formatPrice(isYearly ? plan.yearlyPrice || plan.monthlyPrice * 12 : plan.monthlyPrice);
  const accentColorClass = getAccentColorClass(plan.accentColor);

  return (
    <article
      className={clsx(
        "rounded-2xl border p-6 transition-all",
        isRecommended
          ? clsx("border-cyan-400/50 bg-gradient-to-br from-cyan-500/10 to-transparent shadow-lg shadow-cyan-500/20", accentColorClass)
          : "border-white/10 bg-white/4"
      )}
      aria-label={`${plan.name} plan${isRecommended ? " (recommended)" : ""}`}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
        {plan.tagline && (
          <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
        )}
        {isRecommended && plan.recommendedReason && (
          <p
            className="mt-2 text-xs font-medium text-cyan-200"
            aria-label="Why this plan is recommended"
          >
            ★ {plan.recommendedReason}
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">${price}</span>
          <span className="text-sm text-slate-400">/month{isYearly ? " (billed yearly)" : ""}</span>
        </div>
      </div>

      <CTAButton
        plan={plan}
        isYearly={isYearly}
        isRecommended={isRecommended}
        onSelect={onSelectPlan}
        variant="full-width"
      />

      <div className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <div key={feature.id} className="flex items-start gap-3">
            {feature.included ? (
              <Check
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border border-slate-500" />
            )}
            <div className="flex-1">
              <p
                className={clsx(
                  "text-sm",
                  feature.included ? "text-slate-200" : "text-slate-500"
                )}
              >
                {feature.name}
              </p>
              {typeof feature.included === "string" && (
                <p className="text-xs text-slate-400">{feature.included}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

interface PlanHeaderProps {
  plan: PricingPlan;
  isYearly: boolean;
  isRecommended: boolean;
}

function PlanHeader({ plan, isYearly, isRecommended }: PlanHeaderProps) {
  const price = formatPrice(isYearly ? plan.yearlyPrice || plan.monthlyPrice * 12 : plan.monthlyPrice);
  const accentColorClass = getAccentColorClass(plan.accentColor);

  return (
    <div
      className={clsx(
        "rounded-xl border p-4 transition-all",
        isRecommended
          ? clsx("border-cyan-400/50 bg-gradient-to-br from-cyan-500/10 to-transparent", accentColorClass)
          : "border-white/10 bg-white/2"
      )}
      aria-label={`${plan.name} plan${isRecommended ? " (recommended)" : ""}`}
    >
      <h3 className="font-bold text-white">{plan.name}</h3>
      {plan.tagline && (
        <p className="mt-1 text-xs text-slate-400">{plan.tagline}</p>
      )}
      {isRecommended && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-1 text-xs font-medium text-cyan-200">
          <span aria-label="This is the recommended plan">★ Recommended</span>
        </div>
      )}
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">${price}</span>
        <span className="text-xs text-slate-400">/mo{isYearly ? " yearly" : ""}</span>
      </div>
    </div>
  );
}

interface FeatureCellProps {
  feature?: PricingFeature;
  isRecommended: boolean;
}

function FeatureCell({ feature, isRecommended }: FeatureCellProps) {
  if (!feature) {
    return (
      <div className="h-4 w-4 mx-auto rounded-full border border-slate-600" aria-hidden="true" />
    );
  }

  if (feature.included === false) {
    return (
      <div className="h-4 w-4 mx-auto rounded-full border border-slate-600" aria-hidden="true" />
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Check
        className={clsx(
          "h-5 w-5 flex-shrink-0",
          isRecommended ? "text-cyan-300" : "text-emerald-400"
        )}
        aria-hidden="true"
      />
      {typeof feature.included === "string" && (
        <span className="text-sm text-slate-300">{feature.included}</span>
      )}
    </div>
  );
}

interface CTAButtonProps {
  plan: PricingPlan;
  isYearly: boolean;
  isRecommended: boolean;
  onSelect: (planId: string) => void;
  variant?: "default" | "full-width";
}

function CTAButton({
  plan,
  isYearly,
  isRecommended,
  onSelect,
  variant = "default",
}: CTAButtonProps) {
  const handleClick = () => {
    onSelect(plan.id);
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-medium transition-colors focus-ring-cyan",
        variant === "full-width" ? "w-full" : "",
        isRecommended
          ? "bg-cyan-300 px-6 py-3 text-slate-950 hover:bg-cyan-200"
          : "border border-white/12 bg-white/6 px-6 py-3 text-slate-100 hover:border-cyan-200/30 hover:bg-white/10"
      )}
      aria-label={`Select ${plan.name} plan`}
    >
      {plan.ctaLabel}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

function calculateSavingsPercentage(plan?: PricingPlan): number {
  if (!plan) return 0;
  const monthlyYearlyTotal = plan.monthlyPrice * 12;
  const yearlyPrice = plan.yearlyPrice || monthlyYearlyTotal;
  if (monthlyYearlyTotal <= yearlyPrice) return 0;
  return Math.round(((monthlyYearlyTotal - yearlyPrice) / monthlyYearlyTotal) * 100);
}

function getFeaturesByCategory(
  plans: PricingPlan[]
): Record<string, PricingFeature[]> {
  const features: Record<string, PricingFeature[]> = {};

  plans.forEach((plan) => {
    plan.features.forEach((feature) => {
      const category = feature.category || "Core Features";
      if (!features[category]) {
        features[category] = [];
      }
      // Add feature if not already present (avoid duplicates)
      if (!features[category].find((f) => f.id === feature.id)) {
        features[category].push(feature);
      }
    });
  });

  return features;
}

function getAccentColorClass(accentColor?: string): string {
  const colorMap: Record<string, string> = {
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    slate: "text-slate-300",
  };
  return colorMap[accentColor || "slate"];
}
