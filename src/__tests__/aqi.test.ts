import { describe, expect, it } from "vitest";
import {
  analyzePeakSmogWindow,
  classifyPollutant,
  classifyUsAqi,
  PRESET_CITIES,
} from "@/lib/aqi";
import type { HourlyAqiPoint } from "@/types";

describe("classifyUsAqi", () => {
  it("classifies all standard US EPA AQI breakpoints accurately", () => {
    expect(classifyUsAqi(0).level).toBe("good");
    expect(classifyUsAqi(50)).toMatchObject({
      level: "good",
      label: "Good",
      iconName: "shield-check",
    });

    expect(classifyUsAqi(51).level).toBe("moderate");
    expect(classifyUsAqi(100)).toMatchObject({
      level: "moderate",
      label: "Moderate",
      iconName: "info",
    });

    expect(classifyUsAqi(101).level).toBe("sensitive");
    expect(classifyUsAqi(150)).toMatchObject({
      level: "sensitive",
      label: "Unhealthy for Sensitive Groups",
      iconName: "alert-triangle",
    });

    expect(classifyUsAqi(151).level).toBe("unhealthy");
    expect(classifyUsAqi(200)).toMatchObject({
      level: "unhealthy",
      label: "Unhealthy",
      iconName: "octagon-alert",
    });

    expect(classifyUsAqi(201).level).toBe("very-unhealthy");
    expect(classifyUsAqi(300)).toMatchObject({
      level: "very-unhealthy",
      label: "Very Unhealthy",
      iconName: "flame",
    });

    expect(classifyUsAqi(301).level).toBe("hazardous");
    expect(classifyUsAqi(420)).toMatchObject({
      level: "hazardous",
      label: "Hazardous",
      iconName: "skull",
    });
  });

  it("handles negative and non-finite inputs safely", () => {
    expect(classifyUsAqi(-25).level).toBe("good");
    expect(classifyUsAqi(Number.NaN).level).toBe("good");
  });
});

describe("classifyPollutant", () => {
  it("classifies PM2.5, PM10, NO2, and O3 against WHO thresholds", () => {
    expect(classifyPollutant("pm25", 10).status).toBe("Optimal");
    expect(classifyPollutant("pm25", 25).status).toBe("Elevated");
    expect(classifyPollutant("pm25", 55).status).toBe("High");
    expect(classifyPollutant("pm25", 160).status).toBe("Severe");

    expect(classifyPollutant("pm10", 40).status).toBe("Optimal");
    expect(classifyPollutant("no2", 80).status).toBe("High");
    expect(classifyPollutant("o3", 150).status).toBe("Severe");
  });
});

describe("analyzePeakSmogWindow", () => {
  it("returns safe default when hourly points are empty", () => {
    const peak = analyzePeakSmogWindow([]);
    expect(peak.startHour).toBe("07:00");
    expect(peak.endHour).toBe("10:00");
    expect(peak.peakAqi).toBe(0);
  });

  it("identifies the diurnal peak smog window correctly", () => {
    const hourly: HourlyAqiPoint[] = [
      { time: "2026-11-26T06:00", hourLabel: "06:00", usAqi: 140, pm25: 55 },
      { time: "2026-11-26T07:00", hourLabel: "07:00", usAqi: 210, pm25: 145 },
      { time: "2026-11-26T08:00", hourLabel: "08:00", usAqi: 285, pm25: 220 },
      { time: "2026-11-26T09:00", hourLabel: "09:00", usAqi: 240, pm25: 170 },
      { time: "2026-11-26T10:00", hourLabel: "10:00", usAqi: 165, pm25: 72 },
      { time: "2026-11-26T14:00", hourLabel: "14:00", usAqi: 110, pm25: 39 },
    ];

    const peak = analyzePeakSmogWindow(hourly);
    expect(peak.peakAqi).toBe(285);
    expect(peak.peakPm25).toBe(220);
    expect(peak.startHour).toBe("07:00");
    expect(peak.endHour).toBe("10:00");
  });
});

describe("PRESET_CITIES", () => {
  it("includes the 5 winter smog showcase cities", () => {
    const names = PRESET_CITIES.map((c) => c.name);
    expect(names).toEqual([
      "Delhi",
      "Lahore",
      "Beijing",
      "London",
      "Los Angeles",
    ]);
  });
});
