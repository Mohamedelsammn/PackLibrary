import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_token";
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecret(): string {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_TOKEN_SECRET must be at least 32 characters");
  }
  return secret;
}

export function generateAdminToken(): string {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = `admin:${expiry}`;
  const hmac = createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}:${hmac}`;
}

export function verifyAdminToken(token: string): boolean {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return false;
    const [user, expiryStr, providedHmac] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;
    const payload = `${user}:${expiryStr}`;
    const expectedHmac = createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");
    return timingSafeEqual(
      Buffer.from(providedHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}

export function buildAdminCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${
    TOKEN_TTL_MS / 1000
  }; Path=/`;
}

export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

export { COOKIE_NAME };
