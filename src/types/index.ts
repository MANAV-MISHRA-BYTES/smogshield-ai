/**
 * Shared domain types for SmogShield AI.
 */

export type AqiSeverityLevel =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

export type AqiIconName =
  | "shield-check"
  | "info"
  | "alert-triangle"
  | "octagon-alert"
  | "flame"
  | "skull";

export interface AqiClassification {
  level: AqiSeverityLevel;
  label: string;
  shortLabel: string;
  rangeLabel: string;
  description: string;
  badgeClass: string;
  surfaceClass: string;
  accentHex: string;
  iconName: AqiIconName;
}

export interface CityLocation {
  id: string;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  isPreset?: boolean;
}

export interface HourlyAqiPoint {
  time: string;
  hourLabel: string;
  usAqi: number;
  pm25: number;
}

export interface PeakSmogWindow {
  startHour: string;
  endHour: string;
  peakAqi: number;
  peakPm25: number;
  summary: string;
}

export interface PollutantReadings {
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
}

export interface LiveAqiData {
  location: CityLocation;
  fetchedAt: string;
  source: "open-meteo-live" | "cached-fallback";
  current: PollutantReadings;
  hourly: HourlyAqiPoint[];
  peakSmogWindow: PeakSmogWindow;
}

export type VulnerableGroup =
  | "children"
  | "elderly"
  | "asthma-respiratory"
  | "pregnant-cardio";

export type CommuteMode =
  | "car"
  | "two-wheeler"
  | "public-transit"
  | "wfh"
  | "walk-cycle";

export type VentilationSetup =
  | "hepa-purifier"
  | "diy-corsi-rosenthal"
  | "basic-ac-filter"
  | "natural-ventilation"
  | "drafty-unsealed";

export type OutdoorActivityLevel = "minimal" | "light" | "moderate" | "high";

export interface HouseholdProfile {
  householdSize: number;
  vulnerableMembers: VulnerableGroup[];
  commuteMode: CommuteMode;
  ventilationSetup: VentilationSetup;
  outdoorActivityLevel: OutdoorActivityLevel;
}

export interface DirectImpact {
  /** Estimated reduction in personal PM2.5 inhalation exposure (0-45%). */
  exposureReductionPct: number;
  personalHealthImpact: string;
  /** Estimated community greenhouse gas reduction per week in kg CO2e. */
  weeklyCo2eSavedKg: number;
  /** Estimated direct particulate emission reduction per week in grams PM2.5. */
  weeklyPmGramsSaved: number;
  communityEmissionImpact: string;
}

export type RoutinePeriod = "morning" | "afternoon" | "evening";

export interface RoutineAction {
  id: string;
  period: RoutinePeriod;
  timeWindow: string;
  title: string;
  guidance: string;
  smogPeakReason: string;
  impact: DirectImpact;
}

export type IndoorHackCategory =
  | "filtration"
  | "sealing"
  | "cooking"
  | "humidity"
  | "plants-reality-check";

export interface IndoorHack {
  id: string;
  category: IndoorHackCategory;
  title: string;
  steps: string;
  estimatedCost: string;
  impact: DirectImpact;
}

export type SustainableAlternativeCategory =
  | "commute"
  | "heating-cooking"
  | "daily-habit";

export interface SustainableAlternative {
  id: string;
  category: SustainableAlternativeCategory;
  currentHabit: string;
  recommendedSwap: string;
  whyItWorksInWinter: string;
  impact: DirectImpact;
}

export interface SmogActionPlan {
  mode: "gemini" | "demo";
  generatedAt: string;
  citySummary: string;
  winterSmogOutlook: string;
  householdRiskAlert: string;
  routine: RoutineAction[];
  indoorHacks: IndoorHack[];
  sustainableAlternatives: SustainableAlternative[];
  disclaimer: string;
}

export type ActionItemGroup =
  | "routine"
  | "indoor-hack"
  | "sustainable-alternative";

export interface SelectableActionItem {
  id: string;
  group: ActionItemGroup;
  title: string;
  impact: DirectImpact;
}

export interface ImpactSummary {
  selectedCount: number;
  totalCount: number;
  cumulativeExposureReductionPct: number;
  weeklyCo2eSavedKg: number;
  weeklyPmGramsSaved: number;
  equivalentCarKmAvoided: number;
  tierLabel: string;
  tierDescription: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatApiResponse {
  mode: "gemini" | "demo";
  reply: string;
  followUpSuggestions: string[];
}
