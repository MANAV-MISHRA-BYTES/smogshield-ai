"use client";

import type { AqiClassification, HourlyAqiPoint, PeakSmogWindow } from "@/types";

interface AqiGaugeProps {
  aqi: number;
  classification: AqiClassification;
}

/**
 * Lightweight accessible SVG semicircular US AQI gauge (0-500 scale).
 */
export function AqiGauge({ aqi, classification }: AqiGaugeProps) {
  const clamped = Math.min(500, Math.max(0, Math.round(aqi)));
  const ratio = clamped / 500;
  const radius = 78;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        viewBox="0 0 200 120"
        className="w-52 max-w-full overflow-visible"
        role="img"
        aria-label={`US Air Quality Index is ${clamped}, classified as ${classification.label}`}
      >
        {/* Background track */}
        <path
          d="M 22 100 A 78 78 0 0 1 178 100"
          fill="none"
          stroke="#1e293b"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Active severity arc */}
        <path
          d="M 22 100 A 78 78 0 0 1 178 100"
          fill="none"
          stroke={classification.accentHex}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
        {/* Numeric readout */}
        <text
          x="100"
          y="82"
          textAnchor="middle"
          className="fill-slate-50 text-4xl font-bold tracking-tight"
          style={{ fontSize: "36px", fontWeight: 700 }}
        >
          {clamped}
        </text>
        <text
          x="100"
          y="104"
          textAnchor="middle"
          className="fill-slate-300 text-xs font-medium uppercase tracking-widest"
          style={{ fontSize: "11px", letterSpacing: "0.1em" }}
        >
          US AQI
        </text>
        {/* Scale anchors */}
        <text
          x="18"
          y="117"
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: "10px" }}
        >
          0
        </text>
        <text
          x="182"
          y="117"
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: "10px" }}
        >
          500
        </text>
      </svg>
    </div>
  );
}

interface HourlySmogChartProps {
  hourly: readonly HourlyAqiPoint[];
  peakWindow: PeakSmogWindow;
}

/**
 * Lightweight SVG 24-hour smog curve highlighting inversion peak windows.
 */
export function HourlySmogChart({ hourly, peakWindow }: HourlySmogChartProps) {
  if (hourly.length === 0) {
    return null;
  }

  const maxAqi = Math.max(
    100,
    ...hourly.map((pt) => pt.usAqi),
  );
  const width = 480;
  const height = 104;
  const barGap = 4;
  const barWidth = Math.max(
    6,
    (width - barGap * (hourly.length - 1)) / hourly.length,
  );

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          24-Hour Smog Peak Profile
        </h3>
        <span className="rounded-full border border-amber-500/40 bg-amber-950/70 px-2.5 py-0.5 text-xs font-medium text-amber-200">
          Peak Window: {peakWindow.startHour}–{peakWindow.endHour} (AQI{" "}
          {peakWindow.peakAqi})
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height + 20}`}
        className="h-28 w-full"
        role="img"
        aria-label={`24-hour US AQI trend showing peak smog between ${peakWindow.startHour} and ${peakWindow.endHour} at AQI ${peakWindow.peakAqi}`}
      >
        {hourly.map((point, idx) => {
          const barHeight = Math.max(
            6,
            Math.round((point.usAqi / maxAqi) * (height - 8)),
          );
          const x = idx * (barWidth + barGap);
          const y = height - barHeight;
          const isPeak = point.usAqi >= peakWindow.peakAqi * 0.9;
          const fill = isPeak
            ? "#f97316"
            : point.usAqi > 150
              ? "#ef4444"
              : point.usAqi > 100
                ? "#eab308"
                : "#22d3ee";

          return (
            <g key={point.time}>
              <title>
                {`${point.hourLabel}: US AQI ${point.usAqi} (PM2.5 ${point.pm25} µg/m³)`}
              </title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={fill}
                fillOpacity={isPeak ? 0.95 : 0.7}
              />
              {idx % 4 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height + 15}
                  textAnchor="middle"
                  className="fill-slate-400"
                  style={{ fontSize: "10px" }}
                >
                  {point.hourLabel.slice(0, 2)}h
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
