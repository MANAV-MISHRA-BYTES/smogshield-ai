"use client";

import { useId } from "react";
import {
  Activity,
  Car,
  Home,
  Minus,
  Plus,
  Sparkles,
  Users,
  Wind,
} from "lucide-react";
import type {
  CommuteMode,
  HouseholdProfile,
  OutdoorActivityLevel,
  VentilationSetup,
  VulnerableGroup,
} from "@/types";

interface ProfileFormProps {
  profile: HouseholdProfile;
  onChange: (next: HouseholdProfile) => void;
  onGeneratePlan: () => void;
  isGenerating: boolean;
}

const VULNERABLE_OPTIONS: readonly {
  id: VulnerableGroup;
  label: string;
  hint: string;
}[] = [
  { id: "children", label: "Children (under 12)", hint: "Developing lungs" },
  { id: "elderly", label: "Elderly Adults (65+)", hint: "Cardio-respiratory care" },
  {
    id: "asthma-respiratory",
    label: "Asthma / Respiratory",
    hint: "High PM2.5 sensitivity",
  },
  {
    id: "pregnant-cardio",
    label: "Pregnant / Cardiovascular",
    hint: "Elevated systemic risk",
  },
];

const COMMUTE_OPTIONS: readonly { id: CommuteMode; label: string }[] = [
  { id: "car", label: "Private Car / Cab" },
  { id: "two-wheeler", label: "Two-Wheeler / Scooter" },
  { id: "public-transit", label: "Public Transit" },
  { id: "wfh", label: "Work From Home" },
  { id: "walk-cycle", label: "Walk / Cycle" },
];

const VENTILATION_OPTIONS: readonly { id: VentilationSetup; label: string }[] = [
  { id: "hepa-purifier", label: "HEPA Air Purifier(s)" },
  { id: "diy-corsi-rosenthal", label: "DIY Corsi-Rosenthal Box" },
  { id: "basic-ac-filter", label: "Basic AC / Furnace Filter Only" },
  { id: "natural-ventilation", label: "Natural Ventilation (Windows)" },
  { id: "drafty-unsealed", label: "Drafty / Unsealed Windows & Doors" },
];

const OUTDOOR_OPTIONS: readonly {
  id: OutdoorActivityLevel;
  label: string;
  detail: string;
}[] = [
  { id: "minimal", label: "Minimal", detail: "< 30 min/day" },
  { id: "light", label: "Light", detail: "30–60 min/day" },
  { id: "moderate", label: "Moderate", detail: "1–2 hrs/day" },
  { id: "high", label: "High", detail: "2+ hrs/day" },
];

/**
 * Household & lifestyle profile configurator for personalizing Gemini smog action plans.
 */
export function ProfileForm({
  profile,
  onChange,
  onGeneratePlan,
  isGenerating,
}: ProfileFormProps) {
  const headingId = useId();
  const householdInputId = useId();
  const ventilationSelectId = useId();

  const toggleVulnerable = (group: VulnerableGroup) => {
    const exists = profile.vulnerableMembers.includes(group);
    const nextMembers = exists
      ? profile.vulnerableMembers.filter((m) => m !== group)
      : [...profile.vulnerableMembers, group];
    onChange({ ...profile, vulnerableMembers: nextMembers });
  };

  const adjustHouseholdSize = (delta: number) => {
    const next = Math.min(20, Math.max(1, profile.householdSize + delta));
    onChange({ ...profile, householdSize: next });
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className="flex items-center gap-2 text-lg font-bold text-slate-50"
          >
            <Users className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            Household &amp; Lifestyle Profile
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Tailor schedules, indoor filtration hacks, and emission swaps to your family.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGeneratePlan();
        }}
        className="space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Household Size */}
          <div>
            <label
              htmlFor={householdInputId}
              className="block text-sm font-semibold text-slate-200"
            >
              Household Size
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustHouseholdSize(-1)}
                disabled={profile.householdSize <= 1}
                aria-label="Decrease household size"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-200 transition hover:border-cyan-500/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                id={householdInputId}
                type="number"
                min={1}
                max={20}
                value={profile.householdSize}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  const clamped = Number.isNaN(parsed)
                    ? 1
                    : Math.min(20, Math.max(1, parsed));
                  onChange({ ...profile, householdSize: clamped });
                }}
                className="h-10 w-20 rounded-lg border border-slate-700 bg-slate-950 text-center text-sm font-semibold text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              <button
                type="button"
                onClick={() => adjustHouseholdSize(1)}
                disabled={profile.householdSize >= 20}
                aria-label="Increase household size"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-200 transition hover:border-cyan-500/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="ml-1 text-xs text-slate-300">
                {profile.householdSize === 1 ? "person" : "people"}
              </span>
            </div>
          </div>

          {/* Home Ventilation / Purifier Setup */}
          <div>
            <label
              htmlFor={ventilationSelectId}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-200"
            >
              <Wind className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              Home Ventilation &amp; Purifier Setup
            </label>
            <select
              id={ventilationSelectId}
              value={profile.ventilationSetup}
              onChange={(e) =>
                onChange({
                  ...profile,
                  ventilationSetup: e.target.value as VentilationSetup,
                })
              }
              className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              {VENTILATION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vulnerable Members */}
        <fieldset>
          <legend className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <Home className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            Vulnerable Household Members
          </legend>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {VULNERABLE_OPTIONS.map((opt) => {
              const checked = profile.vulnerableMembers.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? "border-cyan-400/70 bg-cyan-950/40 text-slate-50"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVulnerable(opt.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Primary Commute Mode */}
        <fieldset>
          <legend className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <Car className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            Primary Commute Mode
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {COMMUTE_OPTIONS.map((opt) => {
              const selected = profile.commuteMode === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition focus-within:ring-2 focus-within:ring-cyan-400 ${
                    selected
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                      : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="commute-mode"
                    value={opt.id}
                    checked={selected}
                    onChange={() =>
                      onChange({ ...profile, commuteMode: opt.id })
                    }
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Daily Outdoor Activity Level */}
        <fieldset>
          <legend className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <Activity className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            Daily Outdoor Activity Level
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {OUTDOOR_OPTIONS.map((opt) => {
              const selected = profile.outdoorActivityLevel === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center transition focus-within:ring-2 focus-within:ring-cyan-400 ${
                    selected
                      ? "border-emerald-400/80 bg-emerald-950/50 text-emerald-100"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="outdoor-activity"
                    value={opt.id}
                    checked={selected}
                    onChange={() =>
                      onChange({ ...profile, outdoorActivityLevel: opt.id })
                    }
                    className="sr-only"
                  />
                  <span className="block text-xs font-semibold">
                    {opt.label}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {opt.detail}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isGenerating}
          aria-busy={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {isGenerating
            ? "Tailoring Your SmogShield Plan..."
            : "Generate Personalized Action Plan"}
        </button>
      </form>
    </section>
  );
}
