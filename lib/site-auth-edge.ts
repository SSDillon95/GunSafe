import { jwtVerify } from "jose";

const SITE_COOKIE = "gunsafe_site";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET || "gunsafe-change-this-secret-in-production";
  return new TextEncoder().encode(secret);
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

export function isSitePasswordRequired(): boolean {
  return Boolean(process.env.GUNSAFE_SITE_PASSWORD);
}

export { SITE_COOKIE };