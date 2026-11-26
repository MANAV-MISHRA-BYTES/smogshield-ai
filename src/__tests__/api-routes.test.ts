import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESET_CITIES } from "@/lib/aqi";
import { buildDemoActionPlan } from "@/lib/gemini";
import { buildFallbackAqiData } from "@/lib/open-meteo";
import { chatRateLimiter, planRateLimiter } from "@/lib/rate-limit";
import type { HouseholdProfile, SmogActionPlan } from "@/types";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => {
  class GoogleGenAI {
    public readonly models = {
      generateContent: mockGenerateContent,
    };
  }
  return {
    GoogleGenAI,
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
      NUMBER: "NUMBER",
      INTEGER: "INTEGER",
      BOOLEAN: "BOOLEAN",
    },
  };
});

import { GET as getAqi } from "@/app/api/aqi/route";
import { POST as postChat } from "@/app/api/chat/route";
import { GET as getGeocode } from "@/app/api/geocode/route";
import { POST as postPlan } from "@/app/api/plan/route";

const SAMPLE_AQI = buildFallbackAqiData(PRESET_CITIES[0]!);
const SAMPLE_PROFILE: HouseholdProfile = {
  householdSize: 4,
  vulnerableMembers: ["children", "elderly"],
  commuteMode: "car",
  ventilationSetup: "basic-ac-filter",
  outdoorActivityLevel: "moderate",
};

describe("API Route Handlers", () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    planRateLimiter.reset();
    chatRateLimiter.reset();
    mockGenerateContent.mockReset();
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    vi.restoreAllMocks();
  });

  describe("POST /api/plan", () => {
    it("returns 400 for malformed JSON or invalid Zod payload", async () => {
      const badJsonReq = new NextRequest("http://localhost/api/plan", {
        method: "POST",
        body: "{bad-json",
        headers: { "content-type": "application/json" },
      });
      const badJsonRes = await postPlan(badJsonReq);
      expect(badJsonRes.status).toBe(400);

      const invalidPayloadReq = new NextRequest("http://localhost/api/plan", {
        method: "POST",
        body: JSON.stringify({ aqiData: SAMPLE_AQI, profile: { householdSize: 0 } }),
        headers: { "content-type": "application/json" },
      });
      const invalidRes = await postPlan(invalidPayloadReq);
      expect(invalidRes.status).toBe(400);
    });

    it("returns schema-valid demo fallback plan when GEMINI_API_KEY is missing", async () => {
      const req = new NextRequest("http://localhost/api/plan", {
        method: "POST",
        body: JSON.stringify({ aqiData: SAMPLE_AQI, profile: SAMPLE_PROFILE }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "192.0.2.10",
        },
      });

      const res = await postPlan(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as SmogActionPlan;
      expect(data.mode).toBe("demo");
      expect(data.routine).toHaveLength(3);
      expect(data.indoorHacks).toHaveLength(5);
      expect(data.sustainableAlternatives).toHaveLength(3);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("12");
    });

    it("calls Gemini 2.5 Flash and returns mode=gemini when GEMINI_API_KEY is configured", async () => {
      process.env.GEMINI_API_KEY = "test-valid-mock-key-12345";
      const demoShape = buildDemoActionPlan(SAMPLE_AQI, SAMPLE_PROFILE);
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          citySummary: demoShape.citySummary,
          winterSmogOutlook: demoShape.winterSmogOutlook,
          householdRiskAlert: demoShape.householdRiskAlert,
          routine: demoShape.routine,
          indoorHacks: demoShape.indoorHacks,
          sustainableAlternatives: demoShape.sustainableAlternatives,
        }),
      });

      const req = new NextRequest("http://localhost/api/plan", {
        method: "POST",
        body: JSON.stringify({ aqiData: SAMPLE_AQI, profile: SAMPLE_PROFILE }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "192.0.2.11",
        },
      });

      const res = await postPlan(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as SmogActionPlan;
      expect(data.mode).toBe("gemini");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("enforces IP rate limiting with HTTP 429 and Retry-After", async () => {
      const ip = "198.51.100.77";
      for (let i = 0; i < 12; i += 1) {
        const req = new NextRequest("http://localhost/api/plan", {
          method: "POST",
          body: JSON.stringify({ aqiData: SAMPLE_AQI, profile: SAMPLE_PROFILE }),
          headers: { "content-type": "application/json", "x-forwarded-for": ip },
        });
        const okRes = await postPlan(req);
        expect(okRes.status).toBe(200);
      }

      const blockedReq = new NextRequest("http://localhost/api/plan", {
        method: "POST",
        body: JSON.stringify({ aqiData: SAMPLE_AQI, profile: SAMPLE_PROFILE }),
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
      });
      const blockedRes = await postPlan(blockedReq);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
    });
  });

  describe("POST /api/chat", () => {
    it("validates payload and responds in demo mode when API key is absent", async () => {
      const badReq = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "",
          history: [],
          aqiData: SAMPLE_AQI,
          profile: SAMPLE_PROFILE,
        }),
        headers: { "content-type": "application/json" },
      });
      expect((await postChat(badReq)).status).toBe(400);

      const goodReq = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Is it safe to take my 5-year-old to the park at 4 PM?",
          history: [],
          aqiData: SAMPLE_AQI,
          profile: SAMPLE_PROFILE,
        }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.20",
        },
      });
      const res = await postChat(goodReq);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { mode: string; reply: string };
      expect(data.mode).toBe("demo");
      expect(data.reply).toContain("Delhi");
    });

    it("uses Gemini when GEMINI_API_KEY is present", async () => {
      process.env.GEMINI_API_KEY = "test-valid-mock-key-12345";
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          reply: "With Delhi AQI at 268, stay indoors and run a HEPA purifier.",
          followUpSuggestions: ["What filter MERV rating works best?"],
        }),
      });

      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Should we keep windows closed tonight?",
          history: [],
          aqiData: SAMPLE_AQI,
          profile: SAMPLE_PROFILE,
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await postChat(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { mode: string; reply: string };
      expect(data.mode).toBe("gemini");
      expect(data.reply).toContain("268");
    });
  });

  describe("GET /api/geocode & GET /api/aqi", () => {
    it("rejects short geocode queries and invalid AQI coordinates", async () => {
      const badGeo = await getGeocode(
        new NextRequest("http://localhost/api/geocode?q=a"),
      );
      expect(badGeo.status).toBe(400);

      const badAqi = await getAqi(
        new NextRequest("http://localhost/api/aqi?lat=999&lon=10"),
      );
      expect(badAqi.status).toBe(400);
    });

    it("returns Open-Meteo AQI data cleanly when upstream responds", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            current: {
              us_aqi: 185,
              pm2_5: 82.4,
              pm10: 134.1,
              nitrogen_dioxide: 54.0,
              ozone: 39.2,
            },
            hourly: {
              time: ["2026-11-26T08:00", "2026-11-26T14:00"],
              us_aqi: [210, 145],
              pm2_5: [95.0, 56.2],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

      const res = await getAqi(
        new NextRequest(
          "http://localhost/api/aqi?lat=31.5204&lon=74.3587&city=Lahore&country=Pakistan",
        ),
      );
      expect(res.status).toBe(200);
      const payload = (await res.json()) as {
        source: string;
        current: { usAqi: number; pm25: number };
        location: { name: string };
      };
      expect(payload.source).toBe("open-meteo-live");
      expect(payload.current.usAqi).toBe(185);
      expect(payload.location.name).toBe("Lahore");
    });
  });
});
