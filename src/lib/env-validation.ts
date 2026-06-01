/**
 * Validates that all required environment variables are present.
 * Called once at server startup via src/instrumentation.ts.
 * Throws a descriptive error so the deployment fails loudly instead of
 * silently misbehaving at request time.
 */

interface EnvGroup {
  name: string;
  vars: string[];
}

const REQUIRED_GROUPS: EnvGroup[] = [
  {
    name: "Supabase",
    vars: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  },
  {
    name: "Admin Auth",
    vars: ["ADMIN_PASSWORD", "ADMIN_TOKEN_SECRET"],
  },
  {
    name: "Google OAuth",
    vars: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_OAUTH_REFRESH_TOKEN",
    ],
  },
  {
    name: "Google Drive",
    vars: ["GOOGLE_DRIVE_FOLDER_ID"],
  },
  {
    name: "App",
    vars: ["NEXT_PUBLIC_APP_URL"],
  },
];

export function validateEnv(): void {
  const missing: string[] = [];

  for (const group of REQUIRED_GROUPS) {
    for (const varName of group.vars) {
      const value = process.env[varName];
      if (!value || value.trim() === "") {
        missing.push(`  [${group.name}] ${varName}`);
      }
    }
  }

  // Extra semantic checks
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (secret && secret.length < 32) {
    missing.push("  [Admin Auth] ADMIN_TOKEN_SECRET must be at least 32 characters");
  }

  if (missing.length > 0) {
    const lines = [
      "",
      "══════════════════════════════════════════════════",
      " PACK LIBRARY — MISSING ENVIRONMENT VARIABLES",
      "══════════════════════════════════════════════════",
      "The following required variables are not set:",
      ...missing,
      "",
      "Set them in .env.local (development) or in the",
      "Vercel dashboard (production) before starting.",
      "══════════════════════════════════════════════════",
      "",
    ].join("\n");

    throw new Error(lines);
  }
}
