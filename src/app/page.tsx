import { SmogShieldApp } from "@/components/SmogShieldApp";
import { PRESET_CITIES } from "@/lib/aqi";
import { buildDemoActionPlan, hasGeminiApiKey } from "@/lib/gemini";
import { fetchLiveAqi } from "@/lib/open-meteo";
import type { HouseholdProfile } from "@/types";

export const dynamic = "force-dynamic";

const INITIAL_PROFILE: HouseholdProfile = {
  householdSize: 4,
  vulnerableMembers: ["children", "elderly"],
  commuteMode: "car",
  ventilationSetup: "basic-ac-filter",
  outdoorActivityLevel: "moderate",
};

export default async function HomePage() {
  const defaultCity = PRESET_CITIES[0]!;
  const initialAqiData = await fetchLiveAqi(defaultCity);
  const initialPlan = buildDemoActionPlan(initialAqiData, INITIAL_PROFILE);

  return (
    <SmogShieldApp
      initialAqiData={initialAqiData}
      initialPlan={initialPlan}
      geminiConfigured={hasGeminiApiKey()}
    />
  );
}
