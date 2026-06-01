import { google } from "googleapis";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set"
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (refreshToken) {
    auth.setCredentials({ refresh_token: refreshToken });
  }

  return auth;
}

export function getDriveClient() {
  const auth = getOAuth2Client();
  return google.drive({ version: "v3", auth });
}

export function getOAuthClient() {
  return getOAuth2Client();
}

export function isGoogleDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}
