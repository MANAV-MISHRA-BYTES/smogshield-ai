"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Flame,
  Info,
  Loader2,
  MapPin,
  OctagonAlert,
  RefreshCw,
  Search,
  ShieldCheck,
  Skull,
} from "lucide-react";
import { AqiGauge, HourlySmogChart } from "@/components/AqiGauge";
import {
  classifyPollutant,
  classifyUsAqi,
  PRESET_CITIES,
} from "@/lib/aqi";
import type { AqiIconName, CityLocation, LiveAqiData } from "@/types";

interface AqiDashboardProps {
  aqiData: LiveAqiData | null;
  selectedCity: CityLocation;
  isLoading: boolean;
  error: string | null;
  onSelectCity: (city: CityLocation) => void;
  onRefresh: () => void;
}

function SeverityIcon({
  iconName,
  className,
}: {
  iconName: AqiIconName;
  className?: string;
}) {
  switch (iconName) {
    case "shield-check":
      return <ShieldCheck className={className} aria-hidden="true" />;
    case "info":
      return <Info className={className} aria-hidden="true" />;
    case "alert-triangle":
      return <AlertTriangle className={className} aria-hidden="true" />;
    case "octagon-alert":
      return <OctagonAlert className={className} aria-hidden="true" />;
    case "flame":
      return <Flame className={className} aria-hidden="true" />;
    case "skull":
      return <Skull className={className} aria-hidden="true" />;
  }
}

/**
 * Location search, winter-smog city presets, and live Open-Meteo AQI & pollutant dashboard.
 */
export function AqiDashboard({
  aqiData,
  selectedCity,
  isLoading,
  error,
  onSelectCity,
  onRefresh,
}: AqiDashboardProps) {
  const headingId = useId();
  const searchInputId = useId();
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CityLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced Open-Meteo city autocomplete (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setDropdownOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as { results?: CityLocation[] };
        const nextResults = Array.isArray(data.results) ? data.results : [];
        setSuggestions(nextResults);
        setDropdownOpen(nextResults.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const chooseSuggestion = (city: CityLocation) => {
    setQuery("");
    setSuggestions([]);
    setDropdownOpen(false);
    setActiveIndex(-1);
    onSelectCity(city);
  };

  const classification = aqiData
    ? classifyUsAqi(aqiData.current.usAqi)
    : classifyUsAqi(0);

  const pollutants = aqiData
    ? [
        {
          key: "pm25" as const,
          label: "PM2.5",
          sublabel: "Fine Inhalable Particles",
          value: aqiData.current.pm25,
          unit: "µg/m³",
        },
        {
          key: "pm10" as const,
          label: "PM10",
          sublabel: "Coarse Dust & Soot",
          value: aqiData.current.pm10,
          unit: "µg/m³",
        },
        {
          key: "no2" as const,
          label: "NO2",
          sublabel: "Traffic & Fuel Combustion",
          value: aqiData.current.no2,
          unit: "µg/m³",
        },
        {
          key: "o3" as const,
          label: "O3",
          sublabel: "Ground-Level Ozone",
          value: aqiData.current.o3,
          unit: "µg/m³",
        },
      ]
    : [];

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-6"
    >
      {/* Top Bar: Title & City Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2
            id={headingId}
            className="flex items-center gap-2 text-lg font-bold text-slate-50"
          >
            <MapPin className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            Live Urban Air Quality Monitor
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Real-time US AQI and winter smog pollutants via Open-Meteo (10-min
            cached).
          </p>
        </div>

        {/* Debounced City Search Combobox */}
        <div ref={containerRef} className="relative w-full lg:w-80">
          <label htmlFor={searchInputId} className="sr-only">
            Search any city for live air quality
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="text"
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 && suggestions[activeIndex]
                  ? `city-opt-${suggestions[activeIndex].id}`
                  : undefined
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (!dropdownOpen || suggestions.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : 0,
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((prev) =>
                    prev > 0 ? prev - 1 : suggestions.length - 1,
                  );
                } else if (e.key === "Enter" && activeIndex >= 0) {
                  e.preventDefault();
                  const chosen = suggestions[activeIndex];
                  if (chosen) chooseSuggestion(chosen);
                } else if (e.key === "Escape") {
                  setDropdownOpen(false);
                }
              }}
              placeholder="Search city (e.g., Tokyo, Lahore, London)..."
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 pr-9 pl-9 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
            {isSearching && (
              <Loader2
                className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-400"
                aria-hidden="true"
              />
            )}
          </div>

          {dropdownOpen && suggestions.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Matching cities"
              className="absolute z-30 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl"
            >
              {suggestions.map((city, idx) => (
                <li
                  key={city.id}
                  id={`city-opt-${city.id}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                >
                  <button
                    type="button"
                    onClick={() => chooseSuggestion(city)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      idx === activeIndex
                        ? "bg-cyan-500/20 text-cyan-100"
                        : "text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <span className="font-medium">{city.name}</span>
                    <span className="text-xs text-slate-400">
                      {[city.admin1, city.country].filter(Boolean).join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* High-Smog Winter City Presets */}
      <div
        className="mt-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="High-smog winter city presets"
      >
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
          Winter Presets:
        </span>
        {PRESET_CITIES.map((preset) => {
          const active = selectedCity.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectCity(preset)}
              className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                active
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                  : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-slate-100"
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* Live AQI Card */}
      <div
        aria-live="polite"
        aria-busy={isLoading}
        className={`mt-5 rounded-2xl border p-5 transition ${classification.surfaceClass}`}
      >
        {error ? (
          <div role="alert" className="text-sm text-rose-200">
            <p className="font-semibold">Failed to load air quality data</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        ) : isLoading && !aqiData ? (
          <div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            Fetching live air quality for {selectedCity.name}...
          </div>
        ) : aqiData ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-50">
                    {aqiData.location.name}
                  </h3>
                  <span className="text-sm text-slate-300">
                    {[aqiData.location.admin1, aqiData.location.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Accessible Severity Badge: Icon + Text + Color */}
                  <span
                    data-testid="aqi-severity-badge"
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${classification.badgeClass}`}
                  >
                    <SeverityIcon
                      iconName={classification.iconName}
                      className="h-3.5 w-3.5"
                    />
                    {classification.label} ({classification.rangeLabel})
                  </span>

                  <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                    {aqiData.source === "open-meteo-live"
                      ? "Live Open-Meteo"
                      : "Cached Baseline"}
                  </span>
                </div>
                <p className="mt-2 max-w-xl text-sm text-slate-200">
                  {classification.description}
                </p>
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                aria-label={`Refresh live AQI for ${aqiData.location.name}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/70 hover:text-cyan-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            </div>

            {/* Gauge + Pollutant Grid */}
            <div className="mt-5 grid items-center gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <AqiGauge
                  aqi={aqiData.current.usAqi}
                  classification={classification}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
                {pollutants.map((p) => {
                  const status = classifyPollutant(p.key, p.value);
                  return (
                    <div
                      key={p.key}
                      className="rounded-xl border border-slate-800 bg-slate-950/75 p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-slate-100">
                            {p.label}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {p.sublabel}
                          </span>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.badgeClass}`}
                        >
                          {status.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xl font-bold text-slate-50">
                        {p.value}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {p.unit}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {status.guidelineNote}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 24h Smog Peak Chart */}
            <HourlySmogChart
              hourly={aqiData.hourly}
              peakWindow={aqiData.peakSmogWindow}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
