import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "gunsafe_session";

export type UserRole = "master" | "user";

export interface SessionUser {
  username: string;
  role: UserRole;
}

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET || "gunsafe-change-this-secret-in-production";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.username || typeof payload.username !== "string") return null;
    const role = payload.role === "master" ? "master" : "user";
    return { username: payload.username, role };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };