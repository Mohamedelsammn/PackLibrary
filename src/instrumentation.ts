/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Used here only for environment variable validation.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge or browser)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Skip validation in test environments
    if (process.env.NODE_ENV === "test") return;

    const { validateEnv } = await import("./lib/env-validation");
    try {
      validateEnv();
    } catch (err) {
      // Print the full message then re-throw so the process exits
      console.error((err as Error).message);
      throw err;
    }
  }
}
