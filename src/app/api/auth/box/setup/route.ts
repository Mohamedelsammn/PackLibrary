import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { BOX_AUTHORIZE_URL } from "@/lib/storage/providers/box";

export const runtime = "nodejs";

export async function GET() {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  const clientId = process.env.BOX_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: { code: "CONFIG_ERROR", message: "BOX_CLIENT_ID is not configured" } },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/box/callback`;

  const url = new URL(BOX_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);

  return Response.redirect(url.toString());
}
