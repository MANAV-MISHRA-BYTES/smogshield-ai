import { analyzePeakSmogWindow, PRESET_CITIES } from "@/lib/aqi";
import { sanitizeSearchQuery } from "@/lib/sanitize";
import type { CityLocation, HourlyAqiPoint, LiveAqiData } from "@/types";

const OPEN_METEO_AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface OpenMeteoGeocodeResultItem {
  id?: number;
  name?: string;
  country?: string;
  admin1?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoGeocodeResultItem[];
}

interface OpenMeteoAqiResponse {
  current?: {
    us_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
    ozone?: number | null;
  };
  hourly?: {
    time?: string[];
    us_aqi?: Array<number | null>;
    pm2_5?: Array<number | null>;
  };
}

/**
 * Searches Open-Meteo Geocoding API for matching cities (cached for 1 hour).
 * Falls back to matching preset winter-smog cities if the network is offline.
 *
 * @param rawQuery - User-entered city search string.
 * @returns Matching locations and whether fallback preset filtering was used.
 */
export async function searchCities(rawQuery: string): Promise<{
  results: CityLocation[];
  fallbackUsed: boolean;
}> {
  const query = sanitizeSearchQuery(rawQuery, 80);
  if (query.length < 2) {
    return { results: [], fallbackUsed: false };
  }

  try {
    const url = new URL(OPEN_METEO_GEOCODE_URL);
    url.searchParams.set("name", query);
    url.searchParams.set("count", "6");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Geocoding HTTP ${res.status}`);
    }

    const payload = (await res.json()) as OpenMeteoGeocodeResponse;
    const rawItems = Array.isArray(payload.results) ? payload.results : [];

    const mapped: CityLocation[] = [];
    for (const item of rawItems) {
      if (
        typeof item.name === "string" &&
        typeof item.latitude === "number" &&
        typeof item.longitude === "number"
      ) {
        mapped.push({
          id: `geo-${item.id ?? `${item.latitude.toFixed(2)}-${item.longitude.toFixed(2)}`}`,
          name: item.name,
          country: typeof item.country === "string" ? item.country : "Unknown",
          admin1: typeof item.admin1 === "string" ? item.admin1 : undefined,
          latitude: item.latitude,
          longitude: item.longitude,
          timezone: typeof item.timezone === "string" ? item.timezone : "auto",
        });
      }
    }

    return { results: mapped, fallbackUsed: false };
  } catch {
    const lower = query.toLowerCase();
    const matchedPresets = PRESET_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(lower) ||
        city.country.toLowerCase().includes(lower),
    );
    return { results: matchedPresets, fallbackUsed: true };
  }
}

/**
 * Fetches live US AQI, PM2.5, PM10, NO2, O3, and 24-hour forecast from Open-Meteo
 * with 10-minute Next.js server caching (`revalidate: 600`).
 *
 * @param location - Selected city with WGS84 coordinates.
 * @returns Normalized LiveAqiData payload.
 */
export async function fetchLiveAqi(
  location: CityLocation,
): Promise<LiveAqiData> {
  try {
    const url = new URL(OPEN_METEO_AQI_URL);
    url.searchParams.set("latitude", location.latitude.toFixed(4));
    url.searchParams.set("longitude", location.longitude.toFixed(4));
    url.searchParams.set(
      "current",
      "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
    );
    url.searchParams.set("hourly", "us_aqi,pm2_5");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");

    const res = await fetch(url.toString(), {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo AQI HTTP ${res.status}`);
    }

    const payload = (await res.json()) as OpenMeteoAqiResponse;
    const current = payload.current;

    if (!current) {
      throw new Error("Missing current block in Open-Meteo response");
    }

    const times = payload.hourly?.time ?? [];
    const hourlyAqi = payload.hourly?.us_aqi ?? [];
    const hourlyPm25 = payload.hourly?.pm2_5 ?? [];

    const hourly: HourlyAqiPoint[] = times.slice(0, 24).map((timeStr, idx) => {
      const hourLabel = extractHourLabel(timeStr);
      return {
        time: timeStr,
        hourLabel,
        usAqi: Math.max(0, Math.round(hourlyAqi[idx] ?? 0)),
        pm25: Math.max(0, Math.round((hourlyPm25[idx] ?? 0) * 10) / 10),
      };
    });

    const usAqi = Math.max(0, Math.round(current.us_aqi ?? 0));
    const pm25 = Math.max(0, Math.round((current.pm2_5 ?? 0) * 10) / 10);
    const pm10 = Math.max(0, Math.round((current.pm10 ?? 0) * 10) / 10);
    const no2 = Math.max(
      0,
      Math.round((current.nitrogen_dioxide ?? 0) * 10) / 10,
    );
    const o3 = Math.max(0, Math.round((current.ozone ?? 0) * 10) / 10);

    return {
      location,
      fetchedAt: new Date().toISOString(),
      source: "open-meteo-live",
      current: { usAqi, pm25, pm10, no2, o3 },
      hourly,
      peakSmogWindow: analyzePeakSmogWindow(hourly),
    };
  } catch {
    return buildFallbackAqiData(location);
  }
}

function extractHourLabel(isoTime: string): string {
  const tIndex = isoTime.indexOf("T");
  if (tIndex !== -1 && isoTime.length >= tIndex + 6) {
    return isoTime.slice(tIndex + 1, tIndex + 6);
  }
  return "00:00";
}

/**
 * Generates realistic winter-smog baseline data if Open-Meteo is temporarily unreachable
 * (e.g., offline test runner), tagged explicitly with `source: "cached-fallback"`.
 */
export function buildFallbackAqiData(location: CityLocation): LiveAqiData {
  const presets: Record<
    string,
    { aqi: number; pm25: number; pm10: number; no2: number; o3: number }
  > = {
    delhi: { aqi: 268, pm25: 194.2, pm10: 278.5, no2: 68.4, o3: 34.0 },
    lahore: { aqi: 245, pm25: 175.6, pm10: 252.0, no2: 62.1, o3: 31.5 },
    beijing: { aqi: 158, pm25: 69.4, pm10: 112.8, no2: 49.2, o3: 41.0 },
    london: { aqi: 64, pm25: 18.2, pm10: 29.5, no2: 38.6, o3: 46.8 },
    "los angeles": { aqi: 92, pm25: 31.4, pm10: 54.0, no2: 44.5, o3: 78.2 },
  };

  const baseline = presets[location.name.toLowerCase()] ?? {
    aqi: 138,
    pm25: 51.0,
    pm10: 84.2,
    no2: 42.0,
    o3: 48.0,
  };

  // Realistic winter diurnal inversion profile: morning (07-10) & late evening (20-23) peaks
  const multipliers = [
    1.04, 1.02, 0.98, 0.95, 0.96, 1.01, 1.08, 1.18, 1.24, 1.19, 1.05, 0.91,
    0.82, 0.76, 0.74, 0.78, 0.86, 0.97, 1.09, 1.16, 1.21, 1.18, 1.12, 1.07,
  ];

  const today = new Date().toISOString().slice(0, 10);
  const hourly: HourlyAqiPoint[] = multipliers.map((mult, hour) => {
    const hourStr = String(hour).padStart(2, "0");
    return {
      time: `${today}T${hourStr}:00`,
      hourLabel: `${hourStr}:00`,
      usAqi: Math.round(baseline.aqi * mult),
      pm25: Math.round(baseline.pm25 * mult * 10) / 10,
    };
  });

  return {
    location,
    fetchedAt: new Date().toISOString(),
    source: "cached-fallback",
    current: {
      usAqi: baseline.aqi,
      pm25: baseline.pm25,
      pm10: baseline.pm10,
      no2: baseline.no2,
      o3: baseline.o3,
    },
    hourly,
    peakSmogWindow: analyzePeakSmogWindow(hourly),
  };
}
