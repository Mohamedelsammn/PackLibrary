import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getOAuthClient } from "@/lib/google-drive/client";

export const runtime = "nodejs";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
];

export async function GET(req: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  try {
    const auth = getOAuthClient();
    const url = auth.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent", // force consent to always receive refresh_token
    });
    return Response.redirect(url);
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "OAUTH_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate OAuth URL",
        },
      },
      { status: 500 }
    );
  }
}
