import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "gunsafe_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET || "gunsafe-change-this-secret-in-production";
  return new TextEncoder().encode(secret);
}

function getCredentials() {
  return {
    username: process.env.GUNSAFE_USERNAME || "Kemper",
    password: process.env.GUNSAFE_PASSWORD || "K3mp3r",
  };
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function validateCredentials(username: string, password: string): boolean {
  const creds = getCredentials();
  return safeCompare(username, creds.username) && safeCompare(password, creds.password);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string | undefined
): Promise<{ username: string } | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.username || typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };