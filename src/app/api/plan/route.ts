import { NextRequest, NextResponse } from "next/server";
import { generatePersonalizedPlan } from "@/lib/gemini";
import {
  buildRateLimitHeaders,
  extractClientIp,
  planRateLimiter,
} from "@/lib/rate-limit";
import {
  formatZodErrors,
  planRequestSchema,
  smogActionPlanSchema,
} from "@/lib/schemas";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = extractClientIp(request.headers);
  const rate = planRateLimiter.check(`plan:${clientIp}`);
  const rlHeaders = buildRateLimitHeaders(rate);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many action plan requests. Please wait briefly before regenerating.",
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

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid plan request payload",
        details: formatZodErrors(parsed.error),
      },
      { status: 400, headers: rlHeaders },
    );
  }

  const plan = await generatePersonalizedPlan(
    parsed.data.aqiData,
    parsed.data.profile,
  );
  const verifiedPlan = smogActionPlanSchema.safeParse(plan);

  if (!verifiedPlan.success) {
    return NextResponse.json(
      { error: "Generated plan failed safety schema verification" },
      { status: 500, headers: rlHeaders },
    );
  }

  return NextResponse.json(verifiedPlan.data, {
    status: 200,
    headers: rlHeaders,
  });
}
