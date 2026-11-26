import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { classifyUsAqi } from "@/lib/aqi";
import { geminiPlanOutputSchema } from "@/lib/schemas";
import type {
  ChatApiResponse,
  HouseholdProfile,
  LiveAqiData,
  SmogActionPlan,
} from "@/types";

const GEMINI_MODEL = "gemini-2.5-flash";

const PLAN_DISCLAIMER =
  "Guidance combines live Open-Meteo pollutant readings with AI exposure estimates. Always follow local public health advisories and physician instructions for asthma or cardiovascular conditions.";

const DIRECT_IMPACT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    exposureReductionPct: {
      type: Type.NUMBER,
      description:
        "Estimated reduction in personal PM2.5 inhalation exposure from 3 to 40.",
    },
    personalHealthImpact: {
      type: Type.STRING,
      description:
        "Clear explanation of how this reduces personal PM2.5 / NO2 lung exposure.",
    },
    weeklyCo2eSavedKg: {
      type: Type.NUMBER,
      description:
        "Estimated weekly greenhouse gas reduction in kg CO2e (0 to 60).",
    },
    weeklyPmGramsSaved: {
      type: Type.NUMBER,
      description:
        "Estimated direct weekly fine particulate reduction in grams PM2.5 (0 to 30).",
    },
    communityEmissionImpact: {
      type: Type.STRING,
      description:
        "Clear explanation of the direct neighborhood air quality and emission benefit.",
    },
  },
  required: [
    "exposureReductionPct",
    "personalHealthImpact",
    "weeklyCo2eSavedKg",
    "weeklyPmGramsSaved",
    "communityEmissionImpact",
  ],
};

const ACTION_PLAN_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    citySummary: {
      type: Type.STRING,
      description:
        "Concise 1-2 sentence summary of current AQI, dominant winter pollutant, and city context.",
    },
    winterSmogOutlook: {
      type: Type.STRING,
      description:
        "1-2 sentences explaining today's winter thermal inversion or peak smog window.",
    },
    householdRiskAlert: {
      type: Type.STRING,
      description:
        "Tailored risk advisory reflecting household size, vulnerable members, and purifier setup.",
    },
    routine: {
      type: Type.ARRAY,
      description: "Exactly 3 items: morning, afternoon, and evening routines.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          period: {
            type: Type.STRING,
            format: "enum",
            enum: ["morning", "afternoon", "evening"],
          },
          timeWindow: { type: Type.STRING },
          title: { type: Type.STRING },
          guidance: { type: Type.STRING },
          smogPeakReason: { type: Type.STRING },
          impact: DIRECT_IMPACT_SCHEMA,
        },
        required: [
          "id",
          "period",
          "timeWindow",
          "title",
          "guidance",
          "smogPeakReason",
          "impact",
        ],
      },
    },
    indoorHacks: {
      type: Type.ARRAY,
      description:
        "5 practical budget-friendly indoor air hacks covering filtration (DIY Corsi-Rosenthal), draft sealing, cooking ventilation, humidity control, and an indoor plants reality check.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: {
            type: Type.STRING,
            format: "enum",
            enum: [
              "filtration",
              "sealing",
              "cooking",
              "humidity",
              "plants-reality-check",
            ],
          },
          title: { type: Type.STRING },
          steps: { type: Type.STRING },
          estimatedCost: { type: Type.STRING },
          impact: DIRECT_IMPACT_SCHEMA,
        },
        required: [
          "id",
          "category",
          "title",
          "steps",
          "estimatedCost",
          "impact",
        ],
      },
    },
    sustainableAlternatives: {
      type: Type.ARRAY,
      description:
        "3 actionable swaps covering commute, heating-cooking, and daily-habit.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: {
            type: Type.STRING,
            format: "enum",
            enum: ["commute", "heating-cooking", "daily-habit"],
          },
          currentHabit: { type: Type.STRING },
          recommendedSwap: { type: Type.STRING },
          whyItWorksInWinter: { type: Type.STRING },
          impact: DIRECT_IMPACT_SCHEMA,
        },
        required: [
          "id",
          "category",
          "currentHabit",
          "recommendedSwap",
          "whyItWorksInWinter",
          "impact",
        ],
      },
    },
  },
  required: [
    "citySummary",
    "winterSmogOutlook",
    "householdRiskAlert",
    "routine",
    "indoorHacks",
    "sustainableAlternatives",
  ],
};

/**
 * Checks whether a usable server-side Gemini API key is configured.
 */
export function hasGeminiApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return false;
  if (key === "your_gemini_api_key_here" || key.length < 10) return false;
  return true;
}

/**
 * Generates a personalized winter smog action plan using Gemini 2.5 Flash
 * or returns a realistic schema-validated fallback when GEMINI_API_KEY is absent.
 */
export async function generatePersonalizedPlan(
  aqiData: LiveAqiData,
  profile: HouseholdProfile,
): Promise<SmogActionPlan> {
  if (!hasGeminiApiKey()) {
    return buildDemoActionPlan(aqiData, profile);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
    const classification = classifyUsAqi(aqiData.current.usAqi);

    const prompt = [
      `City: ${aqiData.location.name}, ${aqiData.location.country}`,
      `Live Air Quality: US AQI ${aqiData.current.usAqi} (${classification.label}), PM2.5 ${aqiData.current.pm25} ug/m3, PM10 ${aqiData.current.pm10} ug/m3, NO2 ${aqiData.current.no2} ug/m3, O3 ${aqiData.current.o3} ug/m3.`,
      `Peak Smog Forecast: ${aqiData.peakSmogWindow.summary}`,
      `Household Profile: ${profile.householdSize} member(s); vulnerable groups: ${
        profile.vulnerableMembers.length > 0
          ? profile.vulnerableMembers.join(", ")
          : "none reported"
      }; primary commute: ${profile.commuteMode}; indoor ventilation/purifier: ${
        profile.ventilationSetup
      }; outdoor activity: ${profile.outdoorActivityLevel}.`,
      `Generate a practical, empathetic, scientifically accurate winter smog action plan tailored to this exact city and household.`,
      `Requirements:`,
      `1) routine: 3 items (morning, afternoon, evening) with unique IDs ("routine-morning", "routine-afternoon", "routine-evening") scheduled around the smog peak window.`,
      `2) indoorHacks: 5 items with unique IDs ("hack-filtration", "hack-sealing", "hack-cooking", "hack-humidity", "hack-plants") including DIY Corsi-Rosenthal box guidance, sealing drafts, cooking ventilation, 40-50% humidity control, and an honest indoor plants reality check (explaining houseplants cannot meaningfully filter severe winter PM2.5).`,
      `3) sustainableAlternatives: 3 items with unique IDs ("alt-commute", "alt-heating", "alt-habit") tailored to their ${profile.commuteMode} commute and winter urban emissions.`,
      `4) Every single item MUST include realistic numeric exposureReductionPct (3-40), weeklyCo2eSavedKg (0-50), weeklyPmGramsSaved (0-25), plus concise personalHealthImpact and communityEmissionImpact explanations.`,
    ].join("\n");

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          "You are SmogShield AI, an urban air quality scientist and community health advisor specializing in winter temperature inversions and PM2.5 mitigation. Never give unsafe medical advice; always return strict JSON matching the requested schema.",
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: ACTION_PLAN_RESPONSE_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini");
    }

    const rawJson: unknown = JSON.parse(response.text);
    const validated = geminiPlanOutputSchema.safeParse(rawJson);
    if (!validated.success) {
      throw new Error("Gemini output failed schema validation");
    }

    return {
      ...validated.data,
      mode: "gemini",
      generatedAt: new Date().toISOString(),
      disclaimer: PLAN_DISCLAIMER,
    };
  } catch (err) {
    console.warn(
      "[SmogShield] Falling back to demo plan due to Gemini error:",
      err instanceof Error ? err.message : "Unknown error",
    );
    return buildDemoActionPlan(aqiData, profile);
  }
}

/**
 * Answers a grounded follow-up question about current smog conditions and household safety.
 */
export async function answerSmogQuestion(params: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  aqiData: LiveAqiData;
  profile: HouseholdProfile;
  planSummary?: string;
}): Promise<ChatApiResponse> {
  if (!hasGeminiApiKey()) {
    return buildDemoChatAnswer(params);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
    const classification = classifyUsAqi(params.aqiData.current.usAqi);

    const contextBlock = [
      `Location: ${params.aqiData.location.name}, ${params.aqiData.location.country}`,
      `Current AQI: US AQI ${params.aqiData.current.usAqi} (${classification.label}) | PM2.5: ${params.aqiData.current.pm25} ug/m3 | PM10: ${params.aqiData.current.pm10} ug/m3 | NO2: ${params.aqiData.current.no2} ug/m3 | O3: ${params.aqiData.current.o3} ug/m3`,
      `Peak Smog Window: ${params.aqiData.peakSmogWindow.summary}`,
      `Household: ${params.profile.householdSize} people, vulnerable: ${
        params.profile.vulnerableMembers.join(", ") || "none"
      }, commute: ${params.profile.commuteMode}, indoor setup: ${
        params.profile.ventilationSetup
      }, outdoor level: ${params.profile.outdoorActivityLevel}`,
      params.planSummary ? `Active Plan Summary: ${params.planSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const historyText = params.history
      .slice(-6)
      .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
      .join("\n");

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        contextBlock,
        historyText ? `Recent conversation:\n${historyText}` : "",
        `User Question: ${params.message}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      config: {
        systemInstruction:
          "You are SmogShield AI. Answer concisely in 3-5 clear sentences grounded in the exact AQI numbers, peak smog window, and household vulnerabilities provided. Recommend specific practical actions (timing, fitted N95/KN95 masks, indoor filtration) and explain both health and emission impacts where relevant.",
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Helpful grounded answer in 3-5 crisp sentences.",
            },
            followUpSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 short relevant follow-up questions.",
            },
          },
          required: ["reply", "followUpSuggestions"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty chat response from Gemini");
    }

    const parsed = JSON.parse(response.text) as {
      reply?: unknown;
      followUpSuggestions?: unknown;
    };

    if (typeof parsed.reply !== "string" || parsed.reply.trim().length === 0) {
      throw new Error("Invalid chat response shape");
    }

    const suggestions = Array.isArray(parsed.followUpSuggestions)
      ? parsed.followUpSuggestions
          .filter((s): s is string => typeof s === "string" && s.length > 0)
          .slice(0, 3)
      : [];

    return {
      mode: "gemini",
      reply: parsed.reply.trim(),
      followUpSuggestions: suggestions,
    };
  } catch (err) {
    console.warn(
      "[SmogShield] Falling back to demo chat due to Gemini error:",
      err instanceof Error ? err.message : "Unknown error",
    );
    return buildDemoChatAnswer(params);
  }
}

/**
 * Generates realistic, schema-valid fallback action plan data tailored to live city AQI
 * and household inputs so local evaluation works smoothly without an API key.
 */
export function buildDemoActionPlan(
  aqiData: LiveAqiData,
  profile: HouseholdProfile,
): SmogActionPlan {
  const { location, current, peakSmogWindow } = aqiData;
  const classification = classifyUsAqi(current.usAqi);
  const severe = current.usAqi >= 151;
  const hasVulnerable = profile.vulnerableMembers.length > 0;
  const hasKidsOrAsthma =
    profile.vulnerableMembers.includes("children") ||
    profile.vulnerableMembers.includes("asthma-respiratory");

  const commuteSwap = getCommuteSwap(profile.commuteMode);
  const purifierGuidance = getPurifierGuidance(profile.ventilationSetup);

  return {
    mode: "demo",
    generatedAt: new Date().toISOString(),
    citySummary: `${location.name} is currently experiencing ${classification.label} air quality (US AQI ${current.usAqi}, PM2.5 ${current.pm25} µg/m³).`,
    winterSmogOutlook: `${peakSmogWindow.summary} Cool winter air traps vehicle exhaust and biomass smoke near ground level during calm morning and evening hours.`,
    householdRiskAlert: hasVulnerable
      ? `Priority protection active for ${profile.householdSize} household member(s) including ${profile.vulnerableMembers.join(
          ", ",
        )}. Keep indoor spaces closed during ${peakSmogWindow.startHour}–${
          peakSmogWindow.endHour
        } and wear well-fitted N95/KF94 masks outdoors when AQI exceeds 150.`
      : `For your ${profile.householdSize}-person household, ${
          severe
            ? "limit sustained outdoor cardio today and prioritize clean indoor air zones."
            : "shift brisk outdoor trips toward midday thermal dispersion."
        }`,
    routine: [
      {
        id: "routine-morning",
        period: "morning",
        timeWindow: "06:30–10:30",
        title: "Delay Morning Outdoor Exposure & Seal Peak Inversion",
        guidance: severe
          ? `Keep windows shut during morning rush-hour inversion in ${location.name}. Move exercise indoors, and use fitted N95/KN95 respirators for essential school or work departures.`
          : `Avoid strenuous jogging along busy roads during morning commute buildup; keep bedroom doors closed and run filtration after waking.`,
        smogPeakReason: `Cold nocturnal temperature inversions trap cold-start tailpipe NO2 and PM2.5 close to street level until solar warming lifts the boundary layer.`,
        impact: {
          exposureReductionPct: hasKidsOrAsthma ? 24 : 19,
          personalHealthImpact:
            "Avoids peak morning fine-particulate dose when breathing rates are highest, lowering airway inflammation.",
          weeklyCo2eSavedKg: 2.4,
          weeklyPmGramsSaved: 1.2,
          communityEmissionImpact:
            "Shifting or combining cold-start morning errands trims high-emission cold catalytic-converter runs.",
        },
      },
      {
        id: "routine-afternoon",
        period: "afternoon",
        timeWindow: "12:30–16:00",
        title: "Use Midday Dispersion Window for Essential Errands",
        guidance:
          current.usAqi > 200
            ? `Even during midday dispersion, keep outdoor trips brief (<20 min) in ${location.name} and avoid arterial roads; ventilate briefly only if outdoor AQI dips below indoor levels.`
            : `Schedule outdoor errands, school pickups, or brief sunlight breaks in early afternoon when vertical air mixing dilutes surface PM2.5.`,
        smogPeakReason:
          "Daytime warming raises the atmospheric mixing height, dispersing trapped winter aerosols compared to dawn and dusk.",
        impact: {
          exposureReductionPct: 15,
          personalHealthImpact:
            "Shifting outdoor time away from peak hours lowers cumulative daily inhaled PM2.5 dosage by ~15%.",
          weeklyCo2eSavedKg: 1.8,
          weeklyPmGramsSaved: 0.9,
          communityEmissionImpact:
            "Off-peak trip timing avoids stop-and-go congestion idling that spikes neighborhood NO2 and brake dust.",
        },
      },
      {
        id: "routine-evening",
        period: "evening",
        timeWindow: "18:00–22:30",
        title: "Pre-Sleep Clean-Air Sanctuary Protocol",
        guidance: `Close exterior doors and windows before evening traffic and cooking peaks around ${peakSmogWindow.startHour}. Run continuous indoor filtration in bedrooms 60 minutes prior to sleep and wet-wipe entry shoes.`,
        smogPeakReason:
          "Evening cooling rapidly reforms a shallow inversion lid while domestic heating and commuter traffic peak simultaneously.",
        impact: {
          exposureReductionPct: 22,
          personalHealthImpact:
            "Protects 8 hours of overnight lung recovery, especially critical for children and asthma management.",
          weeklyCo2eSavedKg: 1.2,
          weeklyPmGramsSaved: 0.8,
          communityEmissionImpact:
            "Eliminates evening outdoor waste/wood ambiance burning and reduces nighttime heating loss.",
        },
      },
    ],
    indoorHacks: [
      {
        id: "hack-filtration",
        category: "filtration",
        title: "Build or Optimize a DIY Corsi-Rosenthal Clean-Air Cube",
        steps: purifierGuidance,
        estimatedCost: "$55–$75 (box fan + 4× MERV-13 filters)",
        impact: {
          exposureReductionPct: 32,
          personalHealthImpact:
            "Achieves high clean-air delivery rates (CADR), cutting indoor PM2.5 concentrations by up to 60–80% in a closed bedroom.",
          weeklyCo2eSavedKg: 0.5,
          weeklyPmGramsSaved: 0.4,
          communityEmissionImpact:
            "Uses a single high-efficiency 50W box fan rather than running whole-home HVAC blowers continuously.",
        },
      },
      {
        id: "hack-sealing",
        category: "sealing",
        title: "Weatherstrip Window Gaps & Door Thresholds",
        steps:
          "Press self-adhesive foam weatherstripping along rattling window sashes and install a fabric or silicone door sweep on exterior doors to block winter smog infiltration and cold drafts.",
        estimatedCost: "$10–$20",
        impact: {
          exposureReductionPct: 16,
          personalHealthImpact:
            "Reduces outdoor PM2.5 infiltration rate through leaky frames during severe inversion spikes.",
          weeklyCo2eSavedKg: 6.4,
          weeklyPmGramsSaved: 1.6,
          communityEmissionImpact:
            "Cuts winter space-heating energy demand by ~10–15%, reducing power-plant and boiler emissions.",
        },
      },
      {
        id: "hack-cooking",
        category: "cooking",
        title: "Back-Burner Exhaust & Wet-Mop Dust Control",
        steps:
          "Always run an externally vented range hood (or crack a leeward kitchen window briefly with a fan pointing out) while frying or using gas stoves, and use damp microfiber mops instead of dry brooms.",
        estimatedCost: "$0–$12",
        impact: {
          exposureReductionPct: 18,
          personalHealthImpact:
            "Prevents indoor cooking PM2.5 and NO2 spikes (which often exceed outdoor smog levels) and stops settled soot resuspension.",
          weeklyCo2eSavedKg: 1.1,
          weeklyPmGramsSaved: 1.4,
          communityEmissionImpact:
            "Lower-heat lid-covered cooking shortens burner runtime and reduces residential fuel combustion.",
        },
      },
      {
        id: "hack-humidity",
        category: "humidity",
        title: "Maintain 40–50% Indoor Relative Humidity",
        steps:
          "Monitor room humidity with a $10 hygrometer; keep between 40% and 50% using shallow water bowls or a clean ultrasonic/evaporative humidifier (distilled water only) to protect airways without triggering dust mites or mold.",
        estimatedCost: "$10–$35",
        impact: {
          exposureReductionPct: 8,
          personalHealthImpact:
            "Supports mucociliary airway clearance dried out by winter heating while helping coarse particles settle faster.",
          weeklyCo2eSavedKg: 0.4,
          weeklyPmGramsSaved: 0.2,
          communityEmissionImpact:
            "Balanced humidity feels warmer at 1–2°C lower thermostat settings, saving heating fuel.",
        },
      },
      {
        id: "hack-plants",
        category: "plants-reality-check",
        title: "Indoor Plants Reality Check (Avoid False Security)",
        steps:
          "Science check: NASA-era chamber tests do NOT scale to living rooms—you would need hundreds of plants per square meter to match one HEPA/Corsi-Rosenthal filter. Keep 1–2 low-moisture plants for wellbeing, never overwater (mold risk), and rely on MERV-13/HEPA for PM2.5.",
        estimatedCost: "$0 (avoid unnecessary plant spending)",
        impact: {
          exposureReductionPct: 5,
          personalHealthImpact:
            "Prevents over-reliance on ineffective foliage filtration and eliminates damp-soil mold spores that worsen asthma.",
          weeklyCo2eSavedKg: 0.8,
          weeklyPmGramsSaved: 0.3,
          communityEmissionImpact:
            "Redirects household budget toward verified high-efficiency filtration and weatherization.",
        },
      },
    ],
    sustainableAlternatives: [
      {
        id: "alt-commute",
        category: "commute",
        currentHabit: commuteSwap.currentHabit,
        recommendedSwap: commuteSwap.recommendedSwap,
        whyItWorksInWinter: commuteSwap.whyItWorksInWinter,
        impact: commuteSwap.impact,
      },
      {
        id: "alt-heating",
        category: "heating-cooking",
        currentHabit: "Unvented gas/wood heat or prolonged simmering",
        recommendedSwap: "Electric induction / kettle + zoned thermal layers",
        whyItWorksInWinter:
          "Eliminates direct indoor NO2 and soot emissions while reducing residential combustion plumes trapped under winter inversion layers.",
        impact: {
          exposureReductionPct: 14,
          personalHealthImpact:
            "Removes indoor combustion NO2 and ultrafine particles from living areas.",
          weeklyCo2eSavedKg: 9.2,
          weeklyPmGramsSaved: 4.8,
          communityEmissionImpact:
            "Replacing open or gas heating bursts avoids high-particulate residential smoke across the neighborhood.",
        },
      },
      {
        id: "alt-habit",
        category: "daily-habit",
        currentHabit: "Single-item delivery runs & burning dry yard waste",
        recommendedSwap: "Weekly consolidated errands + municipal composting",
        whyItWorksInWinter:
          "Dry winter leaf/trash burning is one of the largest local PM2.5 spike drivers; composting + batched errands directly curbs neighborhood smoke.",
        impact: {
          exposureReductionPct: 9,
          personalHealthImpact:
            "Reduces localized wood/trash smoke clouds near home entryways and parks.",
          weeklyCo2eSavedKg: 5.6,
          weeklyPmGramsSaved: 6.5,
          communityEmissionImpact:
            "Prevents ~6.5 g/week of toxic biomass PM2.5 and 5.6 kg CO2e from entering local street canyons.",
        },
      },
    ],
    disclaimer: PLAN_DISCLAIMER,
  };
}

function getCommuteSwap(commuteMode: HouseholdProfile["commuteMode"]) {
  switch (commuteMode) {
    case "car":
      return {
        currentHabit: "Solo daily winter car trips",
        recommendedSwap: "Metro/bus + 2-day carpool & zero cold idling",
        whyItWorksInWinter:
          "Winter cold starts emit up to 3× more hydrocarbons and particulates before catalytic converters warm up; transit or carpooling cuts street-level smog.",
        impact: {
          exposureReductionPct: 12,
          personalHealthImpact:
            "Cuts time stuck in bumper-to-bumper tunnel/intersection exhaust plumes (use cabin recirculate mode when driving).",
          weeklyCo2eSavedKg: 18.4,
          weeklyPmGramsSaved: 5.2,
          communityEmissionImpact:
            "Eliminates ~18.4 kg CO2e and ~5.2 g of exhaust + tire/brake PM2.5 from local roads each week.",
        },
      };
    case "two-wheeler":
      return {
        currentHabit: "Unprotected two-wheeler commute in traffic",
        recommendedSwap: "Public transit on AQI >150 days + fitted N95",
        whyItWorksInWinter:
          "Riders inhale up to 2–3× higher tailpipe concentrations right behind exhaust pipes; shifting to rail/bus on smoggy days slashes lung dose.",
        impact: {
          exposureReductionPct: 28,
          personalHealthImpact:
            "Fitted N95 plus enclosed transit drastically cuts direct tailpipe PM2.5 and black carbon inhalation.",
          weeklyCo2eSavedKg: 7.5,
          weeklyPmGramsSaved: 4.1,
          communityEmissionImpact:
            "Two-stroke/small engines emit disproportionate unburned hydrocarbons in winter; shifting trips improves street-level air.",
        },
      };
    case "public-transit":
      return {
        currentHabit: "Walking beside congested main roads to transit",
        recommendedSwap: "Quiet backstreet walk + fitted KN95 on severe days",
        whyItWorksInWinter:
          "PM2.5 and NO2 drop sharply just 1–2 blocks away from major arterial traffic corridors during winter inversions.",
        impact: {
          exposureReductionPct: 16,
          personalHealthImpact:
            "Side-street routing + KN95 reduces roadside black carbon exposure by ~16%.",
          weeklyCo2eSavedKg: 4.2,
          weeklyPmGramsSaved: 1.5,
          communityEmissionImpact:
            "Sustaining high transit ridership keeps private cold-start vehicles off congested winter streets.",
        },
      };
    case "walk-cycle":
      return {
        currentHabit: "High-breathing-rate commuting on arterial roads",
        recommendedSwap: "Off-peak side-street route or transit when AQI >150",
        whyItWorksInWinter:
          "Elevated breathing rates multiply inhaled PM2.5 volume; shifting to transit on severe smog days protects cardiovascular health.",
        impact: {
          exposureReductionPct: 24,
          personalHealthImpact:
            "Prevents deep alveolar deposition of winter soot during heavy breathing.",
          weeklyCo2eSavedKg: 3.1,
          weeklyPmGramsSaved: 1.1,
          communityEmissionImpact:
            "Choosing rail/electric bus on hazardous days preserves zero-tailpipe urban mobility.",
        },
      };
    case "wfh":
      return {
        currentHabit: "Mid-peak local errands & extra home heating",
        recommendedSwap: "Batched midday walking errands + smart zone heating",
        whyItWorksInWinter:
          "Working from home already eliminates commute emissions; bundling local errands into midday hours minimizes personal exposure and car startups.",
        impact: {
          exposureReductionPct: 11,
          personalHealthImpact:
            "Avoids rush-hour corridor pollution while leveraging peak solar dispersion.",
          weeklyCo2eSavedKg: 8.6,
          weeklyPmGramsSaved: 2.3,
          communityEmissionImpact:
            "Smart single-room winter heating plus zero-car errands saves ~8.6 kg CO2e weekly.",
        },
      };
  }
}

function getPurifierGuidance(
  setup: HouseholdProfile["ventilationSetup"],
): string {
  switch (setup) {
    case "hepa-purifier":
      return "Keep your HEPA purifier running on Medium-High (not Auto, which lags behind PM2.5 spikes) in the main sleeping zone, vacuum pre-filters weekly, and supplement large living rooms with a low-cost DIY Corsi-Rosenthal cube.";
    case "diy-corsi-rosenthal":
      return "Great setup! Tape four 20×20 MERV-13 filters into a cube with a cardboard shroud around a box fan so air doesn't bypass corners, and replace filters once they turn dark gray after severe winter smog weeks.";
    case "basic-ac-filter":
      return "Standard AC mesh screens only catch lint, not PM2.5. Build a 4-filter MERV-13 Corsi-Rosenthal box fan cube for ~$65, or upgrade HVAC slots to MERV-13 if your blower supports the static pressure.";
    case "natural-ventilation":
    case "drafty-unsealed":
      return "When outdoor AQI spikes, relying on open windows brings PM2.5 inside. Tape 4 MERV-13 pleated filters + cardboard base + a 20-inch box fan (Corsi-Rosenthal cube) to scrub a closed bedroom cleanly on a budget.";
  }
}

function buildDemoChatAnswer(params: {
  message: string;
  aqiData: LiveAqiData;
  profile: HouseholdProfile;
}): ChatApiResponse {
  const { message, aqiData, profile } = params;
  const lower = message.toLowerCase();
  const classification = classifyUsAqi(aqiData.current.usAqi);
  const { name } = aqiData.location;
  const { usAqi, pm25 } = aqiData.current;
  const hasKids = profile.vulnerableMembers.includes("children");
  const hasAsthma = profile.vulnerableMembers.includes("asthma-respiratory");

  if (
    lower.includes("park") ||
    lower.includes("kid") ||
    lower.includes("child") ||
    lower.includes("5-year") ||
    lower.includes("walk") ||
    lower.includes("exercise") ||
    lower.includes("outside")
  ) {
    const safeGuidance =
      usAqi >= 200
        ? `At US AQI ${usAqi} (${classification.label}, PM2.5 ${pm25} µg/m³) in ${name}, outdoor park play or vigorous exercise is NOT recommended today—especially ${
            hasKids || hasAsthma
              ? "for children or anyone with respiratory sensitivity"
              : "near traffic corridors"
          }. Move active play indoors near your ${
            profile.ventilationSetup === "hepa-purifier"
              ? "HEPA purifier"
              : "Corsi-Rosenthal / filtered clean-air room"
          }.`
        : usAqi >= 101
          ? `In ${name} right now (US AQI ${usAqi}, ${classification.label}), keep outdoor park visits brief (15–30 minutes max) away from busy roads and strictly avoid the ${aqiData.peakSmogWindow.startHour}–${aqiData.peakSmogWindow.endHour} smog peak. Prefer early afternoon (13:00–15:30) and watch for coughing or shortness of breath.`
          : `Today's US AQI of ${usAqi} (${classification.label}) in ${name} is suitable for moderate outdoor time—stick to side-street parks away from rush-hour traffic and avoid the ${aqiData.peakSmogWindow.startHour}–${aqiData.peakSmogWindow.endHour} peak window.`;

    return {
      mode: "demo",
      reply: `${safeGuidance} Choosing a local park walk over a short car trip also avoids cold-start tailpipe emissions (~0.4 kg CO2e saved per round trip).`,
      followUpSuggestions: [
        `When should I open windows in ${name} today?`,
        "What mask fits children or small faces best on high-smog days?",
      ],
    };
  }

  if (
    lower.includes("window") ||
    lower.includes("ventilat") ||
    lower.includes("open")
  ) {
    const windowReply =
      usAqi > 120
        ? `Keep windows sealed in ${name} while US AQI is ${usAqi} (${classification.label}, PM2.5 ${pm25} µg/m³), especially during the ${aqiData.peakSmogWindow.startHour}–${aqiData.peakSmogWindow.endHour} peak. Only crack windows for 10–15 minutes mid-afternoon if outdoor AQI drops noticeably below indoor levels, and run your range hood during cooking.`
        : `You can cross-ventilate ${name} briefly for 15–20 minutes during early afternoon dispersion when outdoor AQI (${usAqi}) is lower than morning/evening rush-hour peaks, then close up before ${aqiData.peakSmogWindow.startHour}.`;

    return {
      mode: "demo",
      reply: windowReply,
      followUpSuggestions: [
        "How do I build a DIY Corsi-Rosenthal air purifier?",
        "How much PM2.5 does cooking add indoors?",
      ],
    };
  }

  if (
    lower.includes("corsi") ||
    lower.includes("diy") ||
    lower.includes("purifier") ||
    lower.includes("filter")
  ) {
    return {
      mode: "demo",
      reply: `To build a Corsi-Rosenthal box (~$60), tape four 20×20-inch MERV-13 pleated furnace filters into an open cube with airflow arrows pointing inward, seal the bottom with cardboard, and tape a 20-inch box fan on top blowing upward with a cardboard shroud covering the fan corners. In ${name} (PM2.5 ${pm25} µg/m³), running it on low-medium in a closed bedroom cuts indoor fine particles by 60–80% while using ~50W.`,
      followUpSuggestions: [
        "Is an N95 mask needed for a short commute today?",
        `What is the peak smog window in ${name} today?`,
      ],
    };
  }

  return {
    mode: "demo",
    reply: `In ${name} right now, US AQI is ${usAqi} (${classification.label}) with PM2.5 at ${pm25} µg/m³ and peak smog projected around ${aqiData.peakSmogWindow.startHour}–${aqiData.peakSmogWindow.endHour}. For your ${profile.householdSize}-person household, keep indoor air sealed during peak hours, run filtration continuously, wear a fitted N95/KF94 for outdoor commutes when AQI > 150, and consolidate car trips to cut neighborhood winter emissions.`,
    followUpSuggestions: [
      `Is it safe to exercise outdoors in ${name} at 4 PM?`,
      "How do I reduce indoor cooking PM2.5?",
    ],
  };
}
