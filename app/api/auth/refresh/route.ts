import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth";
import { SESSION_TIMEOUT_SECONDS } from "@/lib/session-config";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await verifySessionToken(token);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Session expired." },
      { status: 401 }
    );
  }

  const refreshed = await createSessionToken(user);
  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE, refreshed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TIMEOUT_SECONDS,
    path: "/",
  });

  return response;
}