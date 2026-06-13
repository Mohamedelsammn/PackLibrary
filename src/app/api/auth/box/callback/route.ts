import { exchangeBoxAuthorizationCode } from "@/lib/storage/providers/box";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(renderHtml("Authorization Denied", `
      <div class="error">
        <h2>Authorization denied</h2>
        <p>${error}</p>
        <p>Close this window and try again from the Setup page.</p>
      </div>
    `), { headers: { "Content-Type": "text/html" } });
  }

  if (!code) {
    return new Response(renderHtml("Error", `
      <div class="error">
        <h2>Missing authorization code</h2>
        <p>No authorization code was received from Box.</p>
      </div>
    `), { status: 400, headers: { "Content-Type": "text/html" } });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/box/callback`;

    const tokens = await exchangeBoxAuthorizationCode(code, redirectUri);

    return new Response(renderHtml("Box Connected ✓", `
      <div class="success">
        <h2>✓ Box authorized successfully</h2>
        <p>Copy the refresh token below and add it to your <code>.env.local</code>:</p>
        <div class="token-box">
          <label>BOX_REFRESH_TOKEN</label>
          <textarea id="token" rows="3" readonly onclick="this.select()">${tokens.refresh_token}</textarea>
          <button onclick="navigator.clipboard.writeText(document.getElementById('token').value).then(()=>this.textContent='Copied!')">
            Copy to clipboard
          </button>
        </div>
        <div class="steps">
          <h3>Next steps:</h3>
          <ol>
            <li>Open <code>.env.local</code></li>
            <li>Set <code>BOX_REFRESH_TOKEN=</code> to the value above</li>
            <li>Set <code>STORAGE_PROVIDER=box</code> to switch uploads to Box</li>
            <li>Restart the dev server (<code>npm run dev</code>)</li>
          </ol>
        </div>
      </div>
    `), { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(renderHtml("Error", `
      <div class="error">
        <h2>Token exchange failed</h2>
        <p>${message}</p>
      </div>
    `), { status: 500, headers: { "Content-Type": "text/html" } });
  }
}

function renderHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Pack Library</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #fdf8f8; color: #1c1b1b; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: #fff; border: 1px solid #e5e2e1; border-radius: 1rem;
            padding: 2.5rem; max-width: 560px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,.04); }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem; }
    h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: .75rem; }
    h3 { font-size: .9rem; font-weight: 600; margin: 1.25rem 0 .5rem; }
    p, li { font-size: .9rem; color: #444; line-height: 1.6; margin-bottom: .5rem; }
    ol { padding-left: 1.25rem; }
    code { background: #f1edec; padding: .15em .35em; border-radius: .25rem; font-size: .85em; }
    a { color: #000; }
    .success { color: #166534; }
    .success h2 { color: #166534; }
    .warning h2 { color: #92400e; }
    .error h2 { color: #991b1b; }
    .token-box { margin: 1rem 0; }
    .token-box label { display: block; font-size: .75rem; font-weight: 600;
                       text-transform: uppercase; letter-spacing: .05em;
                       color: #747878; margin-bottom: .4rem; }
    textarea { width: 100%; padding: .6rem; border: 1px solid #e5e2e1; border-radius: .5rem;
               font-family: monospace; font-size: .8rem; background: #f1edec;
               resize: none; word-break: break-all; }
    button { margin-top: .6rem; padding: .5rem 1rem; background: #000; color: #fff;
             border: none; border-radius: .5rem; cursor: pointer; font-size: .875rem;
             font-weight: 500; }
    button:hover { background: #222; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Pack Library — Box Setup</h1>
    ${body}
  </div>
</body>
</html>`;
}
