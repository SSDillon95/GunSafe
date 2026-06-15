import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getSitePassword } from "./site-config";

const SITE_COOKIE = "gunsafe_site";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET || "gunsafe-change-this-secret-in-production";
  return new TextEncoder().encode(secret);
}

export async function createSiteAccessToken(): Promise<string> {
  return new SignJWT({ siteAccess: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySiteAccessToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.siteAccess === true;
  } catch {
    return false;
  }
}

export function verifySitePassword(password: string): boolean {
  const expected = getSitePassword();
  if (!expected) return true;

  const provided = Buffer.from(password);
  const target = Buffer.from(expected);
  if (provided.length !== target.length) return false;

  return timingSafeEqual(provided, target);
}

export { SITE_COOKIE };