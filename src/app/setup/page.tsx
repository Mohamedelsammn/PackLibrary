import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";
import { isGoogleDriveConfigured } from "@/lib/google-drive/client";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Disabled in production unless explicitly re-enabled via SETUP_ENABLED=true
  if (process.env.NODE_ENV === "production" && process.env.SETUP_ENABLED !== "true") {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !verifyAdminToken(token)) {
    redirect("/");
  }

  const isDriveConnected = isGoogleDriveConfigured();
  const hasClientCredentials = !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl shadow-card max-w-lg w-full p-8 space-y-6">
        <div>
          <h1 className="text-headline-md font-semibold text-foreground">
            Google Drive Setup
          </h1>
          <p className="text-body-md text-muted-foreground mt-1">
            One-time authorization to connect your personal Google Drive for
            file uploads.
          </p>
        </div>

        {/* Status indicators */}
        <div className="space-y-3">
          <StatusRow
            ok={hasClientCredentials}
            label="OAuth credentials configured"
            detail={
              hasClientCredentials
                ? "GOOGLE_OAUTH_CLIENT_ID and CLIENT_SECRET are set"
                : "Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env.local"
            }
          />
          <StatusRow
            ok={isDriveConnected}
            label="Google Drive authorized"
            detail={
              isDriveConnected
                ? "GOOGLE_OAUTH_REFRESH_TOKEN is set — uploads will use your Drive"
                : "Click Authorize below to grant Drive access"
            }
          />
        </div>

        {/* Action */}
        {!isDriveConnected && hasClientCredentials && (
          <a
            href="/api/auth/google/setup"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Authorize Google Drive
          </a>
        )}

        {isDriveConnected && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Google Drive is connected and ready. All uploads will use your
            personal Drive quota.
          </div>
        )}

        {!hasClientCredentials && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3 space-y-2">
            <p className="font-medium text-foreground">
              Before authorizing, create OAuth credentials:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>
                Go to{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Google Cloud Console → Credentials
                </a>
              </li>
              <li>
                Create an{" "}
                <strong>OAuth 2.0 Client ID</strong> (Web application)
              </li>
              <li>
                Add{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  {process.env.NEXT_PUBLIC_APP_URL ??
                    "http://localhost:3000"}
                  /api/auth/google/callback
                </code>{" "}
                as an authorized redirect URI
              </li>
              <li>
                Copy the Client ID and Secret into{" "}
                <code className="bg-muted px-1 rounded text-xs">.env.local</code>
              </li>
              <li>Restart the dev server, then return to this page</li>
            </ol>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          After authorizing, copy the refresh token into{" "}
          <code className="bg-muted px-1 rounded">GOOGLE_OAUTH_REFRESH_TOKEN</code>{" "}
          in <code className="bg-muted px-1 rounded">.env.local</code> and restart.
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
