import { describe, expect, it } from "vitest";
import { PRESET_CITIES } from "@/lib/aqi";
import { buildDemoActionPlan } from "@/lib/gemini";
import {
  calculateImpactSummary,
  extractSelectableItems,
} from "@/lib/impact";
import { buildFallbackAqiData } from "@/lib/open-meteo";
import type { HouseholdProfile, SelectableActionItem } from "@/types";

const SAMPLE_ITEMS: SelectableActionItem[] = [
  {
    id: "item-1",
    group: "routine",
    title: "MORNING: Avoid peak",
    impact: {
      exposureReductionPct: 20,
      personalHealthImpact: "Cuts peak PM2.5",
      weeklyCo2eSavedKg: 2.5,
      weeklyPmGramsSaved: 1.5,
      communityEmissionImpact: "Cuts cold starts",
    },
  },
  {
    id: "item-2",
    group: "indoor-hack",
    title: "Corsi-Rosenthal Box",
    impact: {
      exposureReductionPct: 25,
      personalHealthImpact: "Cuts indoor PM2.5",
      weeklyCo2eSavedKg: 0.5,
      weeklyPmGramsSaved: 0.5,
      communityEmissionImpact: "Low power fan",
    },
  },
  {
    id: "item-3",
    group: "sustainable-alternative",
    title: "Transit swap",
    impact: {
      exposureReductionPct: 15,
      personalHealthImpact: "Less traffic exhaust",
      weeklyCo2eSavedKg: 12.0,
      weeklyPmGramsSaved: 4.0,
      communityEmissionImpact: "Fewer tailpipe emissions",
    },
  },
];

describe("calculateImpactSummary", () => {
  it("returns zero baseline when nothing is selected", () => {
    const summary = calculateImpactSummary(SAMPLE_ITEMS, new Set());
    expect(summary.selectedCount).toBe(0);
    expect(summary.totalCount).toBe(3);
    expect(summary.cumulativeExposureReductionPct).toBe(0);
    expect(summary.weeklyCo2eSavedKg).toBe(0);
    expect(summary.weeklyPmGramsSaved).toBe(0);
    expect(summary.tierLabel).toBe("Baseline Exposure");
  });

  it("compounds exposure reduction multiplicatively and sums emissions", () => {
    // 1 - (0.80 * 0.75) = 0.40 => 40%
    const summary = calculateImpactSummary(
      SAMPLE_ITEMS,
      new Set(["item-1", "item-2"]),
    );
    expect(summary.selectedCount).toBe(2);
    expect(summary.cumulativeExposureReductionPct).toBe(40);
    expect(summary.weeklyCo2eSavedKg).toBe(3);
    expect(summary.weeklyPmGramsSaved).toBe(2);
    expect(summary.tierLabel).toBe("Resilient Household");
  });

  it("caps cumulative exposure reduction realistically at 90%", () => {
    const heavyItems: SelectableActionItem[] = Array.from(
      { length: 8 },
      (_, idx) => ({
        id: `heavy-${idx}`,
        group: "indoor-hack" as const,
        title: `Action ${idx}`,
        impact: {
          exposureReductionPct: 40,
          personalHealthImpact: "High reduction",
          weeklyCo2eSavedKg: 5,
          weeklyPmGramsSaved: 2,
          communityEmissionImpact: "Clean air",
        },
      }),
    );

    const summary = calculateImpactSummary(
      heavyItems,
      new Set(heavyItems.map((i) => i.id)),
    );
    expect(summary.cumulativeExposureReductionPct).toBe(90);
    expect(summary.weeklyCo2eSavedKg).toBe(40);
    expect(summary.tierLabel).toBe("Clean-Air Champion");
  });

  it("extracts all selectable items from a generated SmogActionPlan", () => {
    const aqi = buildFallbackAqiData(PRESET_CITIES[0]!);
    const profile: HouseholdProfile = {
      householdSize: 4,
      vulnerableMembers: ["children"],
      commuteMode: "car",
      ventilationSetup: "basic-ac-filter",
      outdoorActivityLevel: "moderate",
    };
    const plan = buildDemoActionPlan(aqi, profile);
    const extracted = extractSelectableItems(plan);
    expect(extracted.length).toBe(
      plan.routine.length +
        plan.indoorHacks.length +
        plan.sustainableAlternatives.length,
    );
  });
});
