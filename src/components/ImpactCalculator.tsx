"use client";

import { useId } from "react";
import {
  CheckSquare,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ImpactSummary } from "@/types";

interface ImpactCalculatorProps {
  summary: ImpactSummary;
  onSelectAll: () => void;
  onClearAll: () => void;
}

/**
 * Interactive "What-If" Impact Calculator live summary meter displaying
 * cumulative personal PM2.5 exposure reduction and weekly community emission savings.
 */
export function ImpactCalculator({
  summary,
  onSelectAll,
  onClearAll,
}: ImpactCalculatorProps) {
  const headingId = useId();
  const hasActions = summary.totalCount > 0;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/35 p-5 shadow-xl sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className="flex items-center gap-2 text-lg font-bold text-slate-50"
          >
            <ShieldCheck
              className="h-5 w-5 text-emerald-400"
              aria-hidden="true"
            />
            Your Daily Impact
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Check or uncheck routines, indoor hacks, and swaps below to model
            combined health protection and emission cuts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={!hasActions || summary.selectedCount === summary.totalCount}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Select All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={!hasActions || summary.selectedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>
      </div>

      {/* Live region announcing dynamic updates */}
      <div aria-live="polite" className="mt-4 space-y-4">
        {/* Tier Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/75 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <span className="text-sm font-bold text-emerald-300">
              {summary.tierLabel}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {summary.selectedCount} of {summary.totalCount} actions active
          </span>
        </div>

        {/* Meter Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Personal Health Exposure Reduction */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                PM2.5 Exposure Reduction
              </span>
              <span
                data-testid="cumulative-exposure-pct"
                className="text-2xl font-extrabold text-cyan-300"
              >
                {summary.cumulativeExposureReductionPct}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Cumulative personal PM2.5 exposure reduction"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.cumulativeExposureReductionPct}
              className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${summary.cumulativeExposureReductionPct}%`,
                }}
              />
            </div>

            <p className="mt-2.5 text-xs text-slate-300">
              Compounded across layered interventions (capped at 90% realistic
              indoor-outdoor protection).
            </p>
          </div>

          {/* Community & Emission Impact */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Weekly Community Savings
              </span>
              <Leaf className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p
                data-testid="weekly-co2-saved"
                className="text-2xl font-extrabold text-emerald-300"
              >
                {summary.weeklyCo2eSavedKg} kg{" "}
                <span className="text-xs font-semibold text-slate-300">
                  CO2e/wk
                </span>
              </p>
              <p
                data-testid="weekly-pm-saved"
                className="text-sm font-bold text-cyan-200"
              >
                {summary.weeklyPmGramsSaved} g PM2.5/wk avoided
              </p>
            </div>

            <p className="mt-2.5 text-xs text-slate-300">
              Equivalent to avoiding{" "}
              <strong className="text-slate-100">
                {summary.equivalentCarKmAvoided} km
              </strong>{" "}
              of urban passenger vehicle emissions each week.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300">{summary.tierDescription}</p>
      </div>
    </section>
  );
}
