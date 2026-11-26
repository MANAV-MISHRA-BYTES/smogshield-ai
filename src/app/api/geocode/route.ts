import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/open-meteo";
import { formatZodErrors, geocodeQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawQ = request.nextUrl.searchParams.get("q") ?? "";
  const parsed = geocodeQuerySchema.safeParse({ q: rawQ });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid search query",
        details: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const data = await searchCities(parsed.data.q);
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
