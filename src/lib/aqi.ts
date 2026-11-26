import type {
  AqiClassification,
  CityLocation,
  HourlyAqiPoint,
  PeakSmogWindow,
} from "@/types";

/**
 * Curated high-smog winter city presets with verified coordinates.
 */
export const PRESET_CITIES: readonly CityLocation[] = [
  {
    id: "preset-delhi",
    name: "Delhi",
    country: "India",
    admin1: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
    isPreset: true,
  },
  {
    id: "preset-lahore",
    name: "Lahore",
    country: "Pakistan",
    admin1: "Punjab",
    latitude: 31.5204,
    longitude: 74.3587,
    timezone: "Asia/Karachi",
    isPreset: true,
  },
  {
    id: "preset-beijing",
    name: "Beijing",
    country: "China",
    admin1: "Beijing",
    latitude: 39.9042,
    longitude: 116.4074,
    timezone: "Asia/Shanghai",
    isPreset: true,
  },
  {
    id: "preset-london",
    name: "London",
    country: "United Kingdom",
    admin1: "England",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
    isPreset: true,
  },
  {
    id: "preset-los-angeles",
    name: "Los Angeles",
    country: "United States",
    admin1: "California",
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: "America/Los_Angeles",
    isPreset: true,
  },
] as const;

/**
 * Classifies a numeric US AQI value into standard EPA categories with
 * WCAG AA high-contrast styles and non-color icon/text metadata.
 *
 * @param rawAqi - Numeric US Air Quality Index (0-500+).
 * @returns Full severity classification metadata.
 */
export function classifyUsAqi(rawAqi: number): AqiClassification {
  const aqi = Number.isFinite(rawAqi) ? Math.max(0, Math.round(rawAqi)) : 0;

  if (aqi <= 50) {
    return {
      level: "good",
      label: "Good",
      shortLabel: "Good",
      rangeLabel: "0–50",
      description:
        "Air quality is satisfactory with minimal winter smog risk for most households.",
      badgeClass:
        "bg-emerald-950/90 text-emerald-100 border-emerald-500/60 dark:bg-emerald-950",
      surfaceClass: "border-emerald-500/40 bg-emerald-500/5",
      accentHex: "#10b981",
      iconName: "shield-check",
    };
  }

  if (aqi <= 100) {
    return {
      level: "moderate",
      label: "Moderate",
      shortLabel: "Moderate",
      rangeLabel: "51–100",
      description:
        "Acceptable overall, though unusually sensitive individuals may experience minor airway irritation.",
      badgeClass: "bg-amber-950/90 text-amber-100 border-amber-400/60",
      surfaceClass: "border-amber-500/40 bg-amber-500/5",
      accentHex: "#f59e0b",
      iconName: "info",
    };
  }

  if (aqi <= 150) {
    return {
      level: "sensitive",
      label: "Unhealthy for Sensitive Groups",
      shortLabel: "Sensitive Groups",
      rangeLabel: "101–150",
      description:
        "Children, older adults, and people with asthma should limit prolonged outdoor exertion.",
      badgeClass: "bg-orange-950/95 text-orange-100 border-orange-400/70",
      surfaceClass: "border-orange-500/45 bg-orange-500/5",
      accentHex: "#f97316",
      iconName: "alert-triangle",
    };
  }

  if (aqi <= 200) {
    return {
      level: "unhealthy",
      label: "Unhealthy",
      shortLabel: "Unhealthy",
      rangeLabel: "151–200",
      description:
        "Everyone may begin to experience respiratory effects; keep windows sealed during smog peaks.",
      badgeClass: "bg-red-950/95 text-red-100 border-red-400/70",
      surfaceClass: "border-red-500/45 bg-red-500/5",
      accentHex: "#ef4444",
      iconName: "octagon-alert",
    };
  }

  if (aqi <= 300) {
    return {
      level: "very-unhealthy",
      label: "Very Unhealthy",
      shortLabel: "Very Unhealthy",
      rangeLabel: "201–300",
      description:
        "Health alert: elevated winter inversion smog increases risk of acute breathing distress.",
      badgeClass: "bg-purple-950/95 text-purple-100 border-purple-400/70",
      surfaceClass: "border-purple-500/50 bg-purple-500/10",
      accentHex: "#a855f7",
      iconName: "flame",
    };
  }

  return {
    level: "hazardous",
    label: "Hazardous",
    shortLabel: "Hazardous",
    rangeLabel: "301+",
    description:
      "Emergency air quality conditions: avoid outdoor activity, run indoor HEPA/CR filtration continuously.",
    badgeClass: "bg-rose-950 text-rose-100 border-rose-300/80",
    surfaceClass: "border-rose-500/60 bg-rose-500/10",
    accentHex: "#f43f5e",
    iconName: "skull",
  };
}

export type PollutantKind = "pm25" | "pm10" | "no2" | "o3";

export interface PollutantStatus {
  status: "Optimal" | "Elevated" | "High" | "Severe";
  guidelineNote: string;
  badgeClass: string;
}

/**
 * Compares a single pollutant reading (ug/m3) against WHO 2021 short-term guidelines.
 *
 * @param kind - Pollutant identifier.
 * @param rawValue - Concentration in ug/m3.
 * @returns Status label, WHO context, and accessible badge classes.
 */
export function classifyPollutant(
  kind: PollutantKind,
  rawValue: number,
): PollutantStatus {
  const value = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;

  const thresholds: Record<
    PollutantKind,
    { optimal: number; elevated: number; high: number; guideline: string }
  > = {
    pm25: {
      optimal: 15,
      elevated: 35,
      high: 75,
      guideline: "WHO 24h guideline: 15 µg/m³",
    },
    pm10: {
      optimal: 45,
      elevated: 100,
      high: 200,
      guideline: "WHO 24h guideline: 45 µg/m³",
    },
    no2: {
      optimal: 25,
      elevated: 60,
      high: 120,
      guideline: "WHO 24h guideline: 25 µg/m³",
    },
    o3: {
      optimal: 60,
      elevated: 100,
      high: 140,
      guideline: "WHO 8h guideline: 100 µg/m³",
    },
  };

  const t = thresholds[kind];

  if (value <= t.optimal) {
    return {
      status: "Optimal",
      guidelineNote: t.guideline,
      badgeClass: "bg-emerald-950/80 text-emerald-200 border-emerald-500/40",
    };
  }
  if (value <= t.elevated) {
    return {
      status: "Elevated",
      guidelineNote: t.guideline,
      badgeClass: "bg-amber-950/80 text-amber-200 border-amber-500/40",
    };
  }
  if (value <= t.high) {
    return {
      status: "High",
      guidelineNote: t.guideline,
      badgeClass: "bg-orange-950/80 text-orange-200 border-orange-500/50",
    };
  }
  return {
    status: "Severe",
    guidelineNote: t.guideline,
    badgeClass: "bg-rose-950/90 text-rose-100 border-rose-500/60",
  };
}

/**
 * Analyzes hourly AQI forecast points to identify the primary smog peak window.
 *
 * @param hourly - Ordered hourly AQI forecast points.
 * @returns Summary of the peak smog window for scheduling outdoor avoidance.
 */
export function analyzePeakSmogWindow(
  hourly: readonly HourlyAqiPoint[],
): PeakSmogWindow {
  if (hourly.length === 0) {
    return {
      startHour: "07:00",
      endHour: "10:00",
      peakAqi: 0,
      peakPm25: 0,
      summary: "Hourly breakdown unavailable; avoid early morning & late evening traffic.",
    };
  }

  let peakIndex = 0;
  for (let i = 1; i < hourly.length; i += 1) {
    const currentPoint = hourly[i];
    const bestPoint = hourly[peakIndex];
    if (currentPoint && bestPoint && currentPoint.usAqi > bestPoint.usAqi) {
      peakIndex = i;
    }
  }

  const peakPoint = hourly[peakIndex]!;
  const startIndex = Math.max(0, peakIndex - 1);
  const endIndex = Math.min(hourly.length - 1, peakIndex + 2);
  const startHour = hourly[startIndex]?.hourLabel ?? peakPoint.hourLabel;
  const endHour = hourly[endIndex]?.hourLabel ?? peakPoint.hourLabel;

  return {
    startHour,
    endHour,
    peakAqi: Math.round(peakPoint.usAqi),
    peakPm25: Math.round(peakPoint.pm25 * 10) / 10,
    summary: `Peak smog projected around ${startHour}–${endHour} (US AQI ${Math.round(
      peakPoint.usAqi,
    )}, PM2.5 ${peakPoint.pm25.toFixed(1)} µg/m³).`,
  };
}
