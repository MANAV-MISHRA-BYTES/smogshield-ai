import { z } from "zod";
import { sanitizeSearchQuery, sanitizeUserText } from "@/lib/sanitize";

const cleanString = (maxLen: number) =>
  z
    .string()
    .transform((val) => sanitizeUserText(val, maxLen))
    .pipe(z.string().min(1).max(maxLen));

export const cityLocationSchema = z.object({
  id: z.string().min(1).max(80),
  name: cleanString(80),
  country: cleanString(80),
  admin1: z
    .string()
    .max(80)
    .transform((v) => sanitizeUserText(v, 80))
    .optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().max(64).optional(),
  isPreset: z.boolean().optional(),
});

export const vulnerableGroupSchema = z.enum([
  "children",
  "elderly",
  "asthma-respiratory",
  "pregnant-cardio",
]);

export const commuteModeSchema = z.enum([
  "car",
  "two-wheeler",
  "public-transit",
  "wfh",
  "walk-cycle",
]);

export const ventilationSetupSchema = z.enum([
  "hepa-purifier",
  "diy-corsi-rosenthal",
  "basic-ac-filter",
  "natural-ventilation",
  "drafty-unsealed",
]);

export const outdoorActivityLevelSchema = z.enum([
  "minimal",
  "light",
  "moderate",
  "high",
]);

export const householdProfileSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  vulnerableMembers: z.array(vulnerableGroupSchema).max(4),
  commuteMode: commuteModeSchema,
  ventilationSetup: ventilationSetupSchema,
  outdoorActivityLevel: outdoorActivityLevelSchema,
});

export const hourlyAqiPointSchema = z.object({
  time: z.string().min(1).max(40),
  hourLabel: z.string().min(1).max(10),
  usAqi: z.number().min(0).max(1000),
  pm25: z.number().min(0).max(2000),
});

export const peakSmogWindowSchema = z.object({
  startHour: z.string().min(1).max(10),
  endHour: z.string().min(1).max(10),
  peakAqi: z.number().min(0).max(1000),
  peakPm25: z.number().min(0).max(2000),
  summary: cleanString(240),
});

export const liveAqiDataSchema = z.object({
  location: cityLocationSchema,
  fetchedAt: z.string().min(1).max(64),
  source: z.enum(["open-meteo-live", "cached-fallback"]),
  current: z.object({
    usAqi: z.number().min(0).max(1000),
    pm25: z.number().min(0).max(2000),
    pm10: z.number().min(0).max(3000),
    no2: z.number().min(0).max(2000),
    o3: z.number().min(0).max(2000),
  }),
  hourly: z.array(hourlyAqiPointSchema).max(48),
  peakSmogWindow: peakSmogWindowSchema,
});

export const directImpactSchema = z.object({
  exposureReductionPct: z.number().min(0).max(45),
  personalHealthImpact: cleanString(280),
  weeklyCo2eSavedKg: z.number().min(0).max(100),
  weeklyPmGramsSaved: z.number().min(0).max(100),
  communityEmissionImpact: cleanString(280),
});

export const routineActionSchema = z.object({
  id: z.string().min(1).max(64),
  period: z.enum(["morning", "afternoon", "evening"]),
  timeWindow: cleanString(60),
  title: cleanString(120),
  guidance: cleanString(500),
  smogPeakReason: cleanString(300),
  impact: directImpactSchema,
});

export const indoorHackSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.enum([
    "filtration",
    "sealing",
    "cooking",
    "humidity",
    "plants-reality-check",
  ]),
  title: cleanString(120),
  steps: cleanString(500),
  estimatedCost: cleanString(80),
  impact: directImpactSchema,
});

export const sustainableAlternativeSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.enum(["commute", "heating-cooking", "daily-habit"]),
  currentHabit: cleanString(160),
  recommendedSwap: cleanString(160),
  whyItWorksInWinter: cleanString(400),
  impact: directImpactSchema,
});

export const geminiPlanOutputSchema = z.object({
  citySummary: cleanString(360),
  winterSmogOutlook: cleanString(360),
  householdRiskAlert: cleanString(360),
  routine: z.array(routineActionSchema).min(3).max(4),
  indoorHacks: z.array(indoorHackSchema).min(4).max(6),
  sustainableAlternatives: z.array(sustainableAlternativeSchema).min(3).max(4),
});

export const smogActionPlanSchema = geminiPlanOutputSchema.extend({
  mode: z.enum(["gemini", "demo"]),
  generatedAt: z.string().min(1).max(64),
  disclaimer: cleanString(360),
});

export const planRequestSchema = z.object({
  aqiData: liveAqiDataSchema,
  profile: householdProfileSchema,
});

export const chatHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: cleanString(800),
});

export const chatRequestSchema = z.object({
  message: cleanString(400),
  history: z.array(chatHistoryItemSchema).max(10).default([]),
  aqiData: liveAqiDataSchema,
  profile: householdProfileSchema,
  planSummary: z
    .string()
    .max(400)
    .transform((v) => sanitizeUserText(v, 400))
    .optional(),
});

export const geocodeQuerySchema = z.object({
  q: z
    .string()
    .transform((v) => sanitizeSearchQuery(v, 80))
    .pipe(z.string().min(2, "Query must be at least 2 characters").max(80)),
});

export const aqiQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  city: z
    .string()
    .max(80)
    .transform((v) => sanitizeSearchQuery(v, 80))
    .default("Selected City"),
  country: z
    .string()
    .max(80)
    .transform((v) => sanitizeSearchQuery(v, 80))
    .default(""),
  admin1: z
    .string()
    .max(80)
    .transform((v) => sanitizeSearchQuery(v, 80))
    .optional(),
  id: z.string().max(80).default("custom-city"),
});

/**
 * Formats Zod validation issues into concise field-level messages.
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "payload";
    return `${path}: ${issue.message}`;
  });
}
