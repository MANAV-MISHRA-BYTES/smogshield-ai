import { useMemo, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionPlanSection } from "@/components/ActionPlanSection";
import { ImpactCalculator } from "@/components/ImpactCalculator";
import { PRESET_CITIES } from "@/lib/aqi";
import { buildDemoActionPlan } from "@/lib/gemini";
import {
  calculateImpactSummary,
  extractSelectableItems,
} from "@/lib/impact";
import { buildFallbackAqiData } from "@/lib/open-meteo";
import type { HouseholdProfile } from "@/types";

const TEST_PROFILE: HouseholdProfile = {
  householdSize: 4,
  vulnerableMembers: ["children", "elderly"],
  commuteMode: "car",
  ventilationSetup: "basic-ac-filter",
  outdoorActivityLevel: "moderate",
};

function InteractiveCalculatorHarness() {
  const aqiData = buildFallbackAqiData(PRESET_CITIES[0]!);
  const plan = useMemo(
    () => buildDemoActionPlan(aqiData, TEST_PROFILE),
    [aqiData],
  );
  const items = useMemo(() => extractSelectableItems(plan), [plan]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set([items[0]!.id]),
  );

  const summary = useMemo(
    () => calculateImpactSummary(items, selectedIds),
    [items, selectedIds],
  );

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div>
      <ImpactCalculator
        summary={summary}
        onSelectAll={() => setSelectedIds(new Set(items.map((i) => i.id)))}
        onClearAll={() => setSelectedIds(new Set())}
      />
      <ActionPlanSection
        plan={plan}
        isLoading={false}
        error={null}
        selectedIds={selectedIds}
        onToggleItem={toggleItem}
      />
    </div>
  );
}

describe("ImpactCalculator & ActionPlanSection integration", () => {
  it("updates cumulative health protection and emission savings dynamically when checkboxes toggle", () => {
    render(<InteractiveCalculatorHarness />);

    const initialPct = screen.getByTestId("cumulative-exposure-pct").textContent;
    expect(initialPct).toBe("24%");

    // Check the DIY Corsi-Rosenthal Box hack checkbox
    const crCheckbox = screen.getByRole("checkbox", {
      name: /Include Build or Optimize a DIY Corsi-Rosenthal Clean-Air Cube/i,
    });
    fireEvent.click(crCheckbox);

    // 1 - (1 - 0.24) * (1 - 0.32) = 1 - 0.5168 = 48.32% => 48%
    expect(screen.getByTestId("cumulative-exposure-pct")).toHaveTextContent(
      "48%",
    );
    expect(screen.getByTestId("weekly-co2-saved")).toHaveTextContent("2.9 kg");

    // Clear all resets meter to 0%
    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
    expect(screen.getByTestId("cumulative-exposure-pct")).toHaveTextContent(
      "0%",
    );
    expect(screen.getByTestId("weekly-co2-saved")).toHaveTextContent("0 kg");

    // Select all maximizes realistic protection
    fireEvent.click(screen.getByRole("button", { name: /Select All/i }));
    const maxPctText =
      screen.getByTestId("cumulative-exposure-pct").textContent ?? "0%";
    const maxPct = Number.parseInt(maxPctText.replace("%", ""), 10);
    expect(maxPct).toBeGreaterThanOrEqual(70);
    expect(maxPct).toBeLessThanOrEqual(90);
  });
});
