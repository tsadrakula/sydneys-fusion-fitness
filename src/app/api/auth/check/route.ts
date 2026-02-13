import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("session")?.value;

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Session cookie exists — user is authenticated
  return NextResponse.json({ authenticated: true });
}