import { NextRequest, NextResponse } from "next/server";
import { answerSmogQuestion } from "@/lib/gemini";
import {
  buildRateLimitHeaders,
  chatRateLimiter,
  extractClientIp,
} from "@/lib/rate-limit";
import { chatRequestSchema, formatZodErrors } from "@/lib/schemas";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = extractClientIp(request.headers);
  const rate = chatRateLimiter.check(`chat:${clientIp}`);
  const rlHeaders = buildRateLimitHeaders(rate);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          "Rate limit exceeded for AI Smog Q&A. Please wait a few seconds before sending another question.",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      { status: 429, headers: rlHeaders },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400, headers: rlHeaders },
    );
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid chat request payload",
        details: formatZodErrors(parsed.error),
      },
      { status: 400, headers: rlHeaders },
    );
  }

  const response = await answerSmogQuestion({
    message: parsed.data.message,
    history: parsed.data.history,
    aqiData: parsed.data.aqiData,
    profile: parsed.data.profile,
    planSummary: parsed.data.planSummary,
  });

  return NextResponse.json(response, {
    status: 200,
    headers: rlHeaders,
  });
}
