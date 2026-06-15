import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import {
  SITE_COOKIE,
  isSitePasswordRequired,
  verifySiteAccessToken,
} from "@/lib/site-auth-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const siteRequired = isSitePasswordRequired();
  const hasSiteAccess = siteRequired
    ? await verifySiteAccessToken(request.cookies.get(SITE_COOKIE)?.value)
    : true;

  if (siteRequired && !hasSiteAccess) {
    if (
      pathname === "/site-access" ||
      pathname === "/api/auth/site-access"
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Site access required." },
        { status: 401 }
      );
    }

    const siteUrl = new URL("/site-access", request.url);
    siteUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(siteUrl);
  }

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (pathname === "/login" || pathname === "/api/auth/login") {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};