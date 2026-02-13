import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const expectedUsername = process.env.SYD_USERNAME;
    const expectedHash = process.env.SYD_PASSWORD_HASH;

    if (!expectedUsername || !expectedHash) {
      return NextResponse.json(
        { error: "Auth not configured" },
        { status: 500 }
      );
    }

    if (username !== expectedUsername) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, expectedHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString("hex");

    const response = NextResponse.json({ success: true });
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}