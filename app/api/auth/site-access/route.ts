import { NextResponse } from "next/server";
import {
  SITE_COOKIE,
  createSiteAccessToken,
  verifySitePassword,
} from "@/lib/site-auth";
import { isSitePasswordRequired } from "@/lib/site-config";

export async function POST(request: Request) {
  try {
    if (!isSitePasswordRequired()) {
      return NextResponse.json({ success: true });
    }

    const body = await request.json();
    const password = String(body.password ?? "");

    if (!verifySitePassword(password)) {
      return NextResponse.json(
        { success: false, error: "Invalid site password." },
        { status: 401 }
      );
    }

    const token = await createSiteAccessToken();
    const response = NextResponse.json({ success: true });

    response.cookies.set(SITE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Site access failed." },
      { status: 500 }
    );
  }
}