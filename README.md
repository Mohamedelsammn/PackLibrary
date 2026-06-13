This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Switching Storage Providers

File uploads, downloads and asset URLs flow through a storage abstraction
(`src/lib/storage`) that supports two interchangeable providers: **Google
Drive** and **Box**. The active provider is selected with a single
environment variable:

```bash
STORAGE_PROVIDER=google   # default
# or
STORAGE_PROVIDER=box
```

No other code or admin UI changes are required when switching — only the
environment variables for the chosen provider need to be filled in (see
`.env.example`).

### Google Drive setup

1. Create an OAuth 2.0 Client ID (Web application) in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add `https://your-domain.com/api/auth/google/callback` as an authorized
   redirect URI.
3. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` and
   `GOOGLE_DRIVE_FOLDER_ID` (the root Drive folder for uploads).
4. Log in as admin, visit `/setup`, and click **Authorize Google Drive**.
5. Copy the returned refresh token into `GOOGLE_OAUTH_REFRESH_TOKEN`.

### Box setup

1. Create a **Custom App** with **User Authentication (OAuth 2.0)** in the
   [Box Developer Console](https://app.box.com/developers/console).
2. Add `https://your-domain.com/api/auth/box/callback` as an OAuth 2.0
   redirect URI.
3. Set `BOX_CLIENT_ID`, `BOX_CLIENT_SECRET` and `BOX_ROOT_FOLDER_ID` (the root
   Box folder for uploads).
4. Set `STORAGE_PROVIDER=box`, log in as admin, visit `/setup`, and click
   **Authorize Box**.
5. Copy the returned refresh token into `BOX_REFRESH_TOKEN`.

> **Note:** Box rotates the refresh token on every use. The server caches the
> latest access/refresh token pair in memory for the life of the process, but
> on a cold start it falls back to `BOX_REFRESH_TOKEN` from the environment.
> If that value has already been rotated, re-run the `/setup` authorization
> flow to obtain a fresh one. For long-running production deployments,
> consider persisting the rotated refresh token to a secrets store.

### Notes on existing data

- Existing `*_drive_id` / `drive_id` database columns are reused as generic
  storage file IDs regardless of provider — no schema migration is required.
- Switching providers does not migrate previously-uploaded files. Records
  created under one provider remain readable only while that provider is
  configured.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
