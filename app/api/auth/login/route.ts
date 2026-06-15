import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  validateCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(username);
    const response = NextResponse.json({ success: true, username });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Login failed." },
      { status: 500 }
    );
  }
}