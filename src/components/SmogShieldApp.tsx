"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Shield, Wind } from "lucide-react";
import { ActionPlanSection } from "@/components/ActionPlanSection";
import { AqiDashboard } from "@/components/AqiDashboard";
import { ImpactCalculator } from "@/components/ImpactCalculator";
import { ProfileForm } from "@/components/ProfileForm";
import { SmogChatAssistant } from "@/components/SmogChatAssistant";
import { PRESET_CITIES } from "@/lib/aqi";
import {
  calculateImpactSummary,
  extractSelectableItems,
} from "@/lib/impact";
import type {
  CityLocation,
  HouseholdProfile,
  LiveAqiData,
  SmogActionPlan,
} from "@/types";

interface SmogShieldAppProps {
  initialAqiData: LiveAqiData;
  initialPlan: SmogActionPlan;
  geminiConfigured: boolean;
}

const DEFAULT_PROFILE: HouseholdProfile = {
  householdSize: 4,
  vulnerableMembers: ["children", "elderly"],
  commuteMode: "car",
  ventilationSetup: "basic-ac-filter",
  outdoorActivityLevel: "moderate",
};

/**
 * Primary interactive client workspace coordinating live AQI monitoring,
 * household profiling, Gemini personalized action planning, interactive impact
 * modeling, and grounded Q&A assistance.
 */
export function SmogShieldApp({
  initialAqiData,
  initialPlan,
  geminiConfigured,
}: SmogShieldAppProps) {
  const [selectedCity, setSelectedCity] = useState<CityLocation>(
    initialAqiData.location ?? PRESET_CITIES[0]!,
  );
  const [aqiData, setAqiData] = useState<LiveAqiData>(initialAqiData);
  const [aqiLoading, setAqiLoading] = useState(false);
  const [aqiError, setAqiError] = useState<string | null>(null);

  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<SmogActionPlan | null>(initialPlan);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initialItems = extractSelectableItems(initialPlan);
    const defaults = initialItems
      .filter((_, idx) => idx === 0 || idx === 3 || idx === 8)
      .map((item) => item.id);
    return new Set(defaults);
  });

  const hasRequestedLiveInitialPlan = useRef(false);

  const selectableItems = useMemo(
    () => (plan ? extractSelectableItems(plan) : []),
    [plan],
  );

  const impactSummary = useMemo(
    () => calculateImpactSummary(selectableItems, selectedIds),
    [selectableItems, selectedIds],
  );

  const fetchPlanFor = useCallback(
    async (targetAqi: LiveAqiData, targetProfile: HouseholdProfile) => {
      setPlanLoading(true);
      setPlanError(null);
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aqiData: targetAqi,
            profile: targetProfile,
          }),
        });
        const payload = (await res.json()) as Partial<SmogActionPlan> & {
          error?: string;
        };
        if (!res.ok || !payload.routine) {
          throw new Error(
            payload.error ?? "Failed to generate personalized action plan.",
          );
        }
        const nextPlan = payload as SmogActionPlan;
        setPlan(nextPlan);
        const items = extractSelectableItems(nextPlan);
        setSelectedIds(
          new Set(
            items
              .filter((_, idx) => idx === 0 || idx === 3 || idx === 8)
              .map((item) => item.id),
          ),
        );
      } catch (err) {
        setPlanError(
          (err as Error).message || "Unable to generate personalized plan.",
        );
      } finally {
        setPlanLoading(false);
      }
    },
    [],
  );

  // If server has GEMINI_API_KEY configured, upgrade SSR initial plan seamlessly once
  useEffect(() => {
    if (!geminiConfigured || hasRequestedLiveInitialPlan.current) return;
    hasRequestedLiveInitialPlan.current = true;
    void fetchPlanFor(initialAqiData, DEFAULT_PROFILE);
  }, [fetchPlanFor, geminiConfigured, initialAqiData]);

  const loadCityAqi = useCallback(
    async (city: CityLocation) => {
      setSelectedCity(city);
      setAqiLoading(true);
      setAqiError(null);
      try {
        const params = new URLSearchParams({
          lat: String(city.latitude),
          lon: String(city.longitude),
          city: city.name,
          country: city.country,
          id: city.id,
        });
        if (city.admin1) {
          params.set("admin1", city.admin1);
        }

        const res = await fetch(`/api/aqi?${params.toString()}`);
        const payload = (await res.json()) as LiveAqiData & { error?: string };
        if (!res.ok || !payload.current) {
          throw new Error(payload.error ?? "Failed to fetch live AQI data.");
        }
        setAqiData(payload);
        void fetchPlanFor(payload, profile);
      } catch (err) {
        setAqiError((err as Error).message || "Unable to load city AQI.");
      } finally {
        setAqiLoading(false);
      }
    },
    [fetchPlanFor, profile],
  );

  const handleToggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(selectableItems.map((item) => item.id)));
  }, [selectableItems]);

  const handleClearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Semantic Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800/90 bg-[#070b14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">
                SmogShield AI
              </h1>
              <p className="text-xs text-slate-300">
                Urban Winter Smog &amp; Low-Emission Family Assistant
              </p>
            </div>
          </div>

          <nav aria-label="Primary sections" className="flex flex-wrap gap-2">
            <a
              href="#aqi-monitor"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Live AQI
            </a>
            <a
              href="#household-profile"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Profile
            </a>
            <a
              href="#action-plan"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Action Plan
            </a>
            <a
              href="#smog-chat"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Ask AI
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
      >
        {/* Hero Value Banner */}
        <section
          aria-label="Mission overview"
          className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/35 p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/60 px-3 py-0.5 text-xs font-semibold text-cyan-200">
                <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                Winter Temperature Inversion Protection
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-50 sm:text-2xl">
                Navigate Severe Winter Smog With Quantified Health &amp;
                Emission Impact
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                Compare real-time urban pollutants, tailor smog-peak routines and
                DIY indoor air hacks to your household, and model how daily
                low-emission swaps protect your family and neighborhood air.
              </p>
            </div>
          </div>
        </section>

        {/* Top Grid: Live AQI + Profile Form */}
        <div className="grid gap-6 xl:grid-cols-12">
          <div id="aqi-monitor" className="xl:col-span-7">
            <AqiDashboard
              aqiData={aqiData}
              selectedCity={selectedCity}
              isLoading={aqiLoading}
              error={aqiError}
              onSelectCity={(city) => void loadCityAqi(city)}
              onRefresh={() => void loadCityAqi(selectedCity)}
            />
          </div>

          <div id="household-profile" className="xl:col-span-5">
            <ProfileForm
              profile={profile}
              onChange={setProfile}
              onGeneratePlan={() => void fetchPlanFor(aqiData, profile)}
              isGenerating={planLoading}
            />
          </div>
        </div>

        {/* Interactive "What-If" Impact Calculator */}
        <div id="impact-calculator">
          <ImpactCalculator
            summary={impactSummary}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
          />
        </div>

        {/* Personalized Action Plan */}
        <div id="action-plan">
          <ActionPlanSection
            plan={plan}
            isLoading={planLoading}
            error={planError}
            selectedIds={selectedIds}
            onToggleItem={handleToggleItem}
          />
        </div>

        {/* AI Smog Q&A Assistant */}
        <div id="smog-chat">
          <SmogChatAssistant aqiData={aqiData} profile={profile} plan={plan} />
        </div>
      </main>

      {/* Semantic Footer */}
      <footer className="mt-12 border-t border-slate-800/90 bg-slate-950/80 py-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            <strong className="text-slate-200">SmogShield AI</strong> — Built
            with Next.js 15, Google Gemini 2.5 Flash, and Open-Meteo Air Quality
            &amp; Geocoding APIs.
          </p>
          <p>
            Informational public-health guidance only; follow local alerts for
            respiratory emergencies.
          </p>
        </div>
      </footer>
    </div>
  );
}
