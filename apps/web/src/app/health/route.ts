import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "afroid-web",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
