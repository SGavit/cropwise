# CropWise API configuration

The CropWise source package does not contain live credentials. After extracting the project, configure the server through environment variables supplied by your hosting platform or local shell. Copy the variable names below into your environment manager and replace only the values marked as required.

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_APP_ID` | Yes | Manus application identifier used by the OAuth flow. |
| `OAUTH_SERVER_URL` | Yes | Manus OAuth server base URL. |
| `VITE_OAUTH_PORTAL_URL` | Yes | Browser login portal URL. |
| `JWT_SECRET` | Yes | Long random secret used to sign sessions. |
| `DATABASE_URL` | Yes | MySQL/TiDB connection string. |
| `BUILT_IN_FORGE_API_URL` | Yes | Server-side Forge API base URL for AI and storage. |
| `BUILT_IN_FORGE_API_KEY` | Yes | Server-side Forge credential. |
| `VITE_FRONTEND_FORGE_API_URL` | Yes | Browser-accessible Forge API base URL. |
| `VITE_FRONTEND_FORGE_API_KEY` | Yes | Browser Forge credential supplied by Manus. |
| `OWNER_OPEN_ID` | Yes | Project owner metadata used by the template. |
| `OWNER_NAME` | Yes | Project owner display name. |
| `CEDA_AGMARKNET_API_KEY` | No | Optional organization credential for live mandi prices; blank keeps the safe unavailable fallback. |
| `RESEND_API_KEY` | No | Optional password-reset email credential. |
| `RESEND_FROM_EMAIL` | No | Verified sender address for Resend. |
| `VITE_APP_TITLE` | No | Browser title and application branding. |
| `VITE_APP_LOGO` | No | Application logo reference. |
| `VITE_ANALYTICS_ENDPOINT` | No | Analytics endpoint, if enabled. |
| `VITE_ANALYTICS_WEBSITE_ID` | No | Analytics site identifier, if enabled. |

## Local setup

Use the project’s secret manager or create a local environment file named `.env.local` that is never committed. The deployed CropWise project already receives its platform-managed Manus, database, authentication, storage, and branding variables. Do not place real API keys in source code, screenshots, ZIP archives, or public repositories.

Weather uses the Open-Meteo adapter and does not require a weather API key. Mandi prices remain deliberately fail-closed when the optional CEDA credential is unavailable. Password-reset email delivery is also fail-closed until valid Resend credentials are configured.

## Avatar upload note

Avatar images are compressed in the browser before the authenticated JSON request is sent. This prevents large base64 payloads from being rejected by an upstream gateway with an HTML `403 Forbidden` response. The backend still validates the MIME type and decoded byte size before storing the file.
