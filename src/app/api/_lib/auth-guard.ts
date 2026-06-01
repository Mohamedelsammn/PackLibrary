import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/auth";

export async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}
