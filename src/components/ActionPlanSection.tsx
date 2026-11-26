"use client";

import { useId } from "react";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Flame,
  HeartPulse,
  Home,
  Info,
  Leaf,
  ShieldAlert,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import type {
  DirectImpact,
  IndoorHack,
  RoutineAction,
  RoutinePeriod,
  SmogActionPlan,
  SustainableAlternative,
} from "@/types";

interface ActionPlanSectionProps {
  plan: SmogActionPlan | null;
  isLoading: boolean;
  error: string | null;
  selectedIds: ReadonlySet<string>;
  onToggleItem: (id: string) => void;
}

const PERIOD_META: Record<
  RoutinePeriod,
  { label: string; icon: typeof Sunrise }
> = {
  morning: { label: "Morning", icon: Sunrise },
  afternoon: { label: "Afternoon", icon: Sun },
  evening: { label: "Evening", icon: Sunset },
};

const HACK_CATEGORY_LABEL: Record<IndoorHack["category"], string> = {
  filtration: "DIY Filtration",
  sealing: "Draft Sealing",
  cooking: "Cooking Ventilation",
  humidity: "Humidity Control",
  "plants-reality-check": "Plants Reality Check",
};

const ALT_CATEGORY_LABEL: Record<SustainableAlternative["category"], string> = {
  commute: "Low-Emission Commute",
  "heating-cooking": "Clean Heating & Cooking",
  "daily-habit": "Sustainable Habit",
};

/**
 * Displays the Gemini-generated (or fallback demo) personalized winter smog plan
 * with interactive checkboxes feeding the Impact Calculator and explicit
 * Personal Health + Community Emission impact explainers on every item.
 */
export function ActionPlanSection({
  plan,
  isLoading,
  error,
  selectedIds,
  onToggleItem,
}: ActionPlanSectionProps) {
  const headingId = useId();

  if (isLoading) {
    return (
      <section
        aria-labelledby={headingId}
        aria-busy="true"
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
      >
        <h2 id={headingId} className="text-lg font-bold text-slate-50">
          Building Your Personalized Winter Smog Plan...
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Correlating hourly inversion peaks, household vulnerabilities, and
          emission reductions.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="h-44 animate-pulse rounded-xl border border-slate-800 bg-slate-950/60"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-labelledby={headingId}
        role="alert"
        className="rounded-2xl border border-rose-500/50 bg-rose-950/30 p-6 shadow-xl"
      >
        <h2
          id={headingId}
          className="flex items-center gap-2 text-lg font-bold text-rose-100"
        >
          <AlertCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />
          Unable to Generate Action Plan
        </h2>
        <p className="mt-2 text-sm text-rose-200">{error}</p>
      </section>
    );
  }

  if (!plan) {
    return (
      <section
        aria-labelledby={headingId}
        className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center"
      >
        <h2 id={headingId} className="text-lg font-bold text-slate-100">
          Personalized Action Plan
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Select a city and click &ldquo;Generate Personalized Action Plan&rdquo;
          to receive your smog-peak schedule, indoor air hacks, and impact
          calculations.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-live="polite"
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-6"
    >
      {/* Header & Mode Banner */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id={headingId}
            className="flex items-center gap-2 text-xl font-bold text-slate-50"
          >
            <Sparkles className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            Personalized SmogShield Action Plan
          </h2>

          {plan.mode === "gemini" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/50 bg-cyan-950/80 px-3 py-1 text-xs font-semibold text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Powered by Gemini 2.5 Flash
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-950/80 px-3 py-1 text-xs font-semibold text-amber-100">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Graceful Demo Mode
            </span>
          )}
        </div>

        {plan.mode === "demo" && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-amber-400/50 bg-amber-950/40 p-3.5 text-sm text-amber-100"
          >
            <Info
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                Demo Mode Active — `GEMINI_API_KEY` not configured
              </p>
              <p className="mt-0.5 text-xs text-amber-200/90">
                Serving realistic, schema-validated guidance tailored to your
                selected city&apos;s live Open-Meteo AQI and household profile.
                Add <code className="rounded bg-amber-900/60 px-1">GEMINI_API_KEY</code>{" "}
                in <code className="rounded bg-amber-900/60 px-1">.env.local</code>{" "}
                to switch to live Gemini 2.5 Flash generation.
              </p>
            </div>
          </div>
        )}

        {/* Outlook & Household Alert */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Flame className="h-4 w-4" aria-hidden="true" />
              Winter Smog Outlook
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
              {plan.citySummary} {plan.winterSmogOutlook}
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/35 bg-orange-950/20 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Household Risk Priority
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
              {plan.householdRiskAlert}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Low-Emission Daily Routine */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-50">
            <Clock className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            1. Low-Emission Daily Routine (Adjusted for Smog Peaks)
          </h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plan.routine.map((item: RoutineAction) => {
            const meta = PERIOD_META[item.period];
            const PeriodIcon = meta.icon;
            const checked = selectedIds.has(item.id);
            return (
              <article
                key={item.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  checked
                    ? "border-cyan-400/60 bg-slate-950/90 shadow-md shadow-cyan-500/10"
                    : "border-slate-800 bg-slate-950/50"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleItem(item.id)}
                        aria-label={`Include ${item.title} in impact calculator`}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-2 focus:ring-cyan-400"
                      />
                      <span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                          <PeriodIcon className="h-3 w-3" aria-hidden="true" />
                          {meta.label} · {item.timeWindow}
                        </span>
                        <span className="mt-1.5 block text-sm font-bold text-slate-50">
                          {item.title}
                        </span>
                      </span>
                    </label>
                  </div>

                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {item.guidance}
                  </p>
                  <p className="mt-2 text-xs text-amber-200/90">
                    <strong>Smog peak note:</strong> {item.smogPeakReason}
                  </p>
                </div>

                <DirectImpactBox impact={item.impact} />
              </article>
            );
          })}
        </div>
      </div>

      {/* 2. Indoor Air Quality Hacks */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-50">
          <Home className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          2. Budget-Friendly Indoor Air Quality Hacks
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {plan.indoorHacks.map((hack: IndoorHack) => {
            const checked = selectedIds.has(hack.id);
            return (
              <article
                key={hack.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  checked
                    ? "border-emerald-400/60 bg-slate-950/90 shadow-md shadow-emerald-500/10"
                    : "border-slate-800 bg-slate-950/50"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleItem(hack.id)}
                        aria-label={`Include ${hack.title} in impact calculator`}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-2 focus:ring-cyan-400"
                      />
                      <span>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-emerald-500/40 bg-emerald-950/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
                            {HACK_CATEGORY_LABEL[hack.category]}
                          </span>
                          <span className="text-xs font-medium text-slate-300">
                            Est. cost: {hack.estimatedCost}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-sm font-bold text-slate-50">
                          {hack.title}
                        </span>
                      </span>
                    </label>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {hack.steps}
                  </p>
                </div>

                <DirectImpactBox impact={hack.impact} />
              </article>
            );
          })}
        </div>
      </div>

      {/* 3. Sustainable Alternatives */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-50">
          <Leaf className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          3. Sustainable Alternatives &amp; Emission Swaps
        </h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {plan.sustainableAlternatives.map((alt: SustainableAlternative) => {
            const checked = selectedIds.has(alt.id);
            return (
              <article
                key={alt.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  checked
                    ? "border-emerald-400/60 bg-slate-950/90 shadow-md shadow-emerald-500/10"
                    : "border-slate-800 bg-slate-950/50"
                }`}
              >
                <div>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleItem(alt.id)}
                      aria-label={`Include ${alt.recommendedSwap} in impact calculator`}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-2 focus:ring-cyan-400"
                    />
                    <span>
                      <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                        {ALT_CATEGORY_LABEL[alt.category]}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-bold text-slate-50">
                        <span className="text-slate-400 line-through decoration-rose-400/80">
                          {alt.currentHabit}
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 text-emerald-400"
                          aria-hidden="true"
                        />
                        <span className="text-emerald-200">
                          {alt.recommendedSwap}
                        </span>
                      </span>
                    </span>
                  </label>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {alt.whyItWorksInWinter}
                  </p>
                </div>

                <DirectImpactBox impact={alt.impact} />
              </article>
            );
          })}
        </div>
      </div>

      <p className="border-t border-slate-800 pt-3 text-xs text-slate-400">
        {plan.disclaimer}
      </p>
    </section>
  );
}

function DirectImpactBox({ impact }: { impact: DirectImpact }) {
  return (
    <div className="mt-4 space-y-2 rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs">
      <div className="flex items-start gap-2">
        <HeartPulse
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400"
          aria-hidden="true"
        />
        <div>
          <span className="font-semibold text-cyan-200">
            Personal Health Impact (-{impact.exposureReductionPct}% PM2.5):{" "}
          </span>
          <span className="text-slate-300">{impact.personalHealthImpact}</span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Leaf
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
          aria-hidden="true"
        />
        <div>
          <span className="font-semibold text-emerald-200">
            Community Impact (-{impact.weeklyCo2eSavedKg} kg CO2e /{" "}
            {impact.weeklyPmGramsSaved} g PM/wk):{" "}
          </span>
          <span className="text-slate-300">
            {impact.communityEmissionImpact}
          </span>
        </div>
      </div>
    </div>
  );
}
