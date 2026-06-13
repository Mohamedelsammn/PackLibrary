import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getGoogleOAuthClient } from "@/lib/storage/providers/google-drive";

export const runtime = "nodejs";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
];

export async function GET(req: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  try {
    const auth = getGoogleOAuthClient();
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
