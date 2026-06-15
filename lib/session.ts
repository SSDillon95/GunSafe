import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { getAppUserByUsername } from "@/lib/db";

export async function getSession() {
  const cookieStore = await cookies();
  const tokenUser = await verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value
  );
  if (!tokenUser) return null;

  const user = await getAppUserByUsername(tokenUser.username);
  if (!user) return null;

  return { username: user.username, role: user.role };
}

export async function requireMaster() {
  const session = await getSession();
  if (!session || session.role !== "master") {
    throw new Error("Master access required.");
  }
  return session;
}