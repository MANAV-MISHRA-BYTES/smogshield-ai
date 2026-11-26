import { NextRequest, NextResponse } from "next/server";
import { fetchLiveAqi } from "@/lib/open-meteo";
import { aqiQuerySchema, formatZodErrors } from "@/lib/schemas";
import type { CityLocation } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const parsed = aqiQuerySchema.safeParse({
    lat: params.get("lat"),
    lon: params.get("lon"),
    city: params.get("city") ?? undefined,
    country: params.get("country") ?? undefined,
    admin1: params.get("admin1") ?? undefined,
    id: params.get("id") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid coordinates or city parameters",
        details: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const location: CityLocation = {
    id: parsed.data.id,
    name: parsed.data.city,
    country: parsed.data.country || "Selected Region",
    admin1: parsed.data.admin1 || undefined,
    latitude: parsed.data.lat,
    longitude: parsed.data.lon,
  };

  const aqiData = await fetchLiveAqi(location);

  return NextResponse.json(aqiData, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
    },
  });
}
