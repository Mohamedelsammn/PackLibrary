import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/app/api/_lib/rate-limit";
import { generateAdminToken, buildAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`auth:${ip}`);

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: { code: "RATE_LIMITED", message: "Too many attempts" },
        retryAfterMinutes: rateLimit.retryAfterMinutes,
      },
      { status: 429 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const { password } = body;

  if (!password || typeof password !== "string") {
    return Response.json(
      { error: { code: "MISSING_PASSWORD", message: "Password required" } },
      { status: 400 }
    );
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return Response.json(
      { error: { code: "SERVER_ERROR", message: "Admin not configured" } },
      { status: 500 }
    );
  }

  const isValid =
    expected.length === password.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(password));

  if (!isValid) {
    return Response.json(
      {
        error: { code: "INVALID_PASSWORD", message: "Incorrect password" },
        attemptsLeft: rateLimit.attemptsLeft,
      },
      { status: 401 }
    );
  }

  const token = generateAdminToken();
  const cookie = buildAdminCookie(token);

  const response = Response.json({ success: true });
  response.headers.set("Set-Cookie", cookie);
  return response;
}
