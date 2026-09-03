import { NextResponse } from "next/server";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "web-frontend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
=======
export async function GET() {
  return NextResponse.json({ status: "healthy", service: "afroid-web" }, { status: 200 });
>>>>>>> c9c423e (fix(prod): Dockerfile workspace build fixes, cloudbuild configs, web health route)
}
