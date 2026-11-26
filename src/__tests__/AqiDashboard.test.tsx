import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AqiDashboard } from "@/components/AqiDashboard";
import { PRESET_CITIES } from "@/lib/aqi";
import { buildFallbackAqiData } from "@/lib/open-meteo";

describe("AqiDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders live AQI score, accessible severity badge with label, and all 4 pollutants", () => {
    const delhiAqi = buildFallbackAqiData(PRESET_CITIES[0]!);
    const onSelectCity = vi.fn();
    const onRefresh = vi.fn();

    render(
      <AqiDashboard
        aqiData={delhiAqi}
        selectedCity={PRESET_CITIES[0]!}
        isLoading={false}
        error={null}
        onSelectCity={onSelectCity}
        onRefresh={onRefresh}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Delhi", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("aqi-severity-badge")).toHaveTextContent(
      /Very Unhealthy \(201–300\)/,
    );
    expect(screen.getByText("PM2.5")).toBeInTheDocument();
    expect(screen.getByText("PM10")).toBeInTheDocument();
    expect(screen.getByText("NO2")).toBeInTheDocument();
    expect(screen.getByText("O3")).toBeInTheDocument();
  });

  it("triggers city switch when a winter preset button is clicked", () => {
    const delhiAqi = buildFallbackAqiData(PRESET_CITIES[0]!);
    const onSelectCity = vi.fn();

    render(
      <AqiDashboard
        aqiData={delhiAqi}
        selectedCity={PRESET_CITIES[0]!}
        isLoading={false}
        error={null}
        onSelectCity={onSelectCity}
        onRefresh={vi.fn()}
      />,
    );

    const londonBtn = screen.getByRole("button", { name: "London" });
    fireEvent.click(londonBtn);

    expect(onSelectCity).toHaveBeenCalledTimes(1);
    expect(onSelectCity).toHaveBeenCalledWith(
      expect.objectContaining({ name: "London", country: "United Kingdom" }),
    );
  });

  it("debounces city search and selects an autocomplete result", async () => {
    const delhiAqi = buildFallbackAqiData(PRESET_CITIES[0]!);
    const onSelectCity = vi.fn();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              id: "geo-tokyo",
              name: "Tokyo",
              country: "Japan",
              admin1: "Tokyo",
              latitude: 35.6895,
              longitude: 139.6917,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(
      <AqiDashboard
        aqiData={delhiAqi}
        selectedCity={PRESET_CITIES[0]!}
        isLoading={false}
        error={null}
        onSelectCity={onSelectCity}
        onRefresh={vi.fn()}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Tokyo" } });

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/geocode?q=Tokyo",
          expect.any(Object),
        );
      },
      { timeout: 1500 },
    );

    const optionBtn = await screen.findByRole("button", { name: /Tokyo/i });
    fireEvent.click(optionBtn);

    expect(onSelectCity).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Tokyo", country: "Japan" }),
    );
  });
});
