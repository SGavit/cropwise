# CropWise Technical and Operations Documentation

**Document owner:** Manus AI  
**Application:** CropWise  
**Published domain:** [cropdash-tnewmauq.manus.space](https://cropdash-tnewmauq.manus.space)  
**Last reviewed:** 26 August 2026

## 1. Purpose and current scope

CropWise is a mobile-first agricultural dashboard for Indian farmers. It combines a farm profile, crop planning, crop-library guidance, crop-image screening, local weather, market signals, reminders, private scan history, sharing links, and a multilingual interface in English, Hindi, and Marathi.

The application is built as a React frontend with a Vite build, an Express server, tRPC procedures, Drizzle ORM, and a MySQL-compatible database. The current route table exposes the main dashboard at `/`, shared scan results at `/scan/:slug`, and not-found handling. The live application should therefore be treated as a dashboard with Google/Manus OAuth-backed session access, rather than as a standalone local-password identity system.[1] [2]

| Area | Current implementation | Data boundary |
|---|---|---|
| Farm profile | Village, district, state, crop preferences, language | Private and keyed to the signed-in user |
| Crop analysis | Structured crop/condition result; private scans may include an image URL | Private history is user-scoped; shared links contain text-only snapshots |
| Weather | District lookup and forecast through Open-Meteo with unavailable fallbacks | Provider request is made by the server; no weather credentials are stored in the browser |
| Market data | District mandi lookup with safe unavailable fallback and local reference values | Provider credentials remain server-side |
| Crop planning | Crop library, sowing window, soil, water, reminders, and Wealth Watch thresholds | Planning records are private and user-scoped |
| Languages | English, Hindi, Marathi | The selected language is stored in the farm profile when signed in |
| Authentication | Manus OAuth plus local email/password fallback and signed application session | Google credentials remain external; local passwords are hashed server-side |

## 2. How login is managed

### 2.1 Google and Manus OAuth flow

CropWise does not collect a Google password. The browser starts the external Manus authentication flow from the application’s login action. The client creates an OAuth state value containing the callback redirect URI and a random nonce, then writes the nonce to a host-only state cookie. The browser is redirected to the external account chooser. This design means that Google account selection and Google password entry occur outside the CropWise server.[3] [4]

After the external provider returns, the server receives an authorization `code` and `state` at `/api/oauth/callback`. The server decodes the state, compares its nonce with the browser’s state cookie, and rejects the request when the values do not match. This is the application’s CSRF protection for the login handoff. The server then exchanges the one-time code with the Manus OAuth service and requests the provider’s user information.[3] [4]

The server stores or updates the following identity fields in the `users` table: the provider’s `openId`, display name, email address when supplied, login method label, role, account creation time, update time, and last-sign-in time. `openId` is the unique provider identity key; it is not a Google password or an access token.[5]

### 2.2 Application session after login

Successful OAuth callbacks now redirect to `/dashboard`, an explicit route for the main Home workspace. Local email/password registration and login also navigate to `/dashboard`, so the browser address changes consistently after authentication.

Once the callback has received valid provider information, CropWise creates an application session token containing the provider `openId`, application ID, and display name. The session is signed as a JWT with the server-side cookie secret and returned in the application’s session cookie. The session cookie is configured as HTTP-only, secure on secure requests, path-scoped to `/`, and host-scoped unless the hosting layer adds another restriction.[6] [7]

Every tRPC request includes browser credentials. On the server, the request context authenticates the session through the session cookie, and protected procedures receive a database user. If authentication fails, the request is treated as unauthenticated. In preview or iframe environments, the frontend can also read a runtime-provided `manus-cookie` value from `sessionStorage` and forward the application session as a Bearer token; this is a preview compatibility path and is not the normal production cookie path.[2] [7]

Logout calls the public `auth.logout` procedure. The server clears the application session cookie using the request’s cookie options. Logout does not delete the user’s database account, farm profile, scan history, reminders, or market-threshold settings.[8]

### 2.3 Email/password fallback and password reset

CropWise now provides a local email/password fallback at `/sign-in`. Registration normalizes the email address, validates an 8–128 character password, stores a scrypt password hash in `passwordCredentials`, and creates the same signed application session used by protected dashboard procedures. The raw password is never stored. Login compares the supplied password against the stored derived key using a constant-time comparison.[2] [5] [8]

Password reset requests use a generic response so an attacker cannot discover whether an email is registered. For an existing local credential, CropWise generates a random one-time token, stores only its SHA-256 hash in `passwordResetTokens`, gives the token a 30-minute expiry, and sends the raw token only through the configured server-side email provider. The reset page at `/reset-password` accepts the token once and marks it used after changing the password. If the email provider is unavailable or misconfigured, the server fails closed and does not return the token to the browser.

The email provider must be configured with a valid `RESEND_API_KEY` and verified `RESEND_FROM_EMAIL`. The current project environment still requires a successful provider validation before password-reset delivery can be considered operational in production; local sign-in and account-management code remain separate from that provider dependency.

## 3. What login data is stored

The following table distinguishes identity data from secrets and user-created farm data.

| Data | Stored? | Where | Purpose |
|---|---:|---|---|
| Provider `openId` | Yes | `users.openId` | Stable identity key and session lookup |
| Display name | Yes, when supplied | `users.name` and session payload | Account display and greeting |
| Email address | Yes, when supplied | `users.email` | Identity metadata supplied by the provider |
| Login-method label | Yes, when supplied | `users.loginMethod` | Records provider/platform label such as Google or email-provider metadata |
| Google password | **No** | External provider only | CropWise never receives it |
| OAuth authorization code | Temporary | Callback request and server-side exchange | One-time exchange for provider token |
| OAuth access token | Not persisted by CropWise application tables | Server memory during callback/provider request | Retrieve provider user information |
| Application session JWT | Yes, as a browser cookie; not a database row | HTTP-only session cookie | Authenticate subsequent requests |
| OAuth state nonce | Temporary | Browser cookie during login | Bind callback to the initiating browser |
| Local password hash | Yes for local accounts | `passwordCredentials.passwordHash` | Scrypt-derived hash; raw passwords are not stored |
| Password-reset token | Hash only | `passwordResetTokens.tokenHash` | Raw token is sent through configured email and is single-use/expiring |
| Farm location | Yes for signed-in profiles | `farmProfiles` | Personalize weather, planning, and dashboard context |
| Language preference | Yes for signed-in profiles | `farmProfiles.language` | Restore English, Hindi, or Marathi selection |
| Crop preferences | Yes | `farmProfiles.cropPreferences` as serialized text | Restore the farmer’s crop shortlist |

The application should be described as storing **provider identity metadata, a signed application session, and an independent local credential hash when the farmer uses email login**, not as storing Google login credentials. The `users` table is not intended to hold provider passwords or OAuth access tokens.[5] [6]

## 4. Farmer data and image management

A signed-in farmer’s profile is stored in `farmProfiles` and is uniquely associated with the user ID. Crop preferences are serialized as text and the language is constrained to English, Hindi, or Marathi. The farm profile is accessed through protected procedures, so it should not be publicly reachable by knowing a user ID.[5] [8]

Private crop scans are stored in `privateCropScans`. The record contains the user ID, crop and local names, health status, overview, optional image URL, structured result payload, and creation timestamp. The private-history query filters by the authenticated user ID and returns a limited recent history rather than an unrestricted global collection.[5] [8]

Crop-image bytes are not placed in the relational database. The analysis code validates JPEG, PNG, and WebP input and enforces a maximum decoded size of 5 MB. For stored scans, image content is uploaded through the server storage helper to S3-compatible object storage, and the database keeps a storage URL/reference rather than the image bytes.[10] The AI vision request is made server-side through the configured LLM integration and asks for cautious, structured crop and visible-condition guidance; it explicitly avoids unsupported diagnosis, pesticide prescriptions, and invented field facts.[10]

Anonymous quick scans are rate-limited and use the no-storage analysis path. They are not written to private scan history. A signed-in scan can be shared through a short-lived public link. The share table stores a text payload and expiration time; it does not store the source photo in the share record. Anyone with an active share URL may be able to view that shared text snapshot until it expires, so farmers should avoid sharing sensitive notes in scan fields.[5] [8]

## 5. Crop planning and operational data

Crop Calendar reminders are stored with the authenticated user ID, crop name, title, optional details, due date, and status. They are shown inside the app when the farmer returns; the current design does not imply SMS, emergency, or background push notifications.[5] [8]

Wealth Watch thresholds are also private. Each record stores the user ID, crop name, price floor, rain threshold, soil-moisture minimum, and timestamps. These are personal reference guardrails, not investment instructions or guaranteed market forecasts.[5] [8]

The crop library is informational. It contains crop-specific sowing windows, soil suitability, water-planning guidance, and field-watch notes for the supported crop set. Weather and mandi providers may be unavailable; the UI is designed to show safe unavailable states rather than treat missing provider data as a confirmed field fact.[11]

## 6. Security and privacy responsibilities

The application’s main security boundary is the protected server procedure plus the signed session cookie. The OAuth state nonce protects the callback handoff, and the provider handles the Google credential exchange. Server secrets such as the database URL, cookie secret, OAuth configuration, LLM key, and storage key must remain environment variables and must not be placed in frontend source code.[6] [7]

Administrators should restrict database access, enable TLS/SSL for database connections, rotate secrets through the project secret manager, and avoid logging authorization codes, session tokens, uploaded image data, or full provider responses. Production logs should contain only operational identifiers and sanitized error messages. Database backups should be protected because farm profiles, private scans, reminders, and thresholds are personal farmer data.

The `/account` page provides a user-facing profile, session summary, retention preferences, sign-out control, and deliberate account deletion confirmation. Deletion removes the CropWise user row, private profile, private scans, reminders, thresholds, local credentials, reset tokens, account settings, and session access. Stored image objects require a separate object-storage deletion workflow if full byte-level erasure is required; the current database deletion removes their references. Retention preferences are stored per user for private scans and reminders; the cleanup helper is available server-side and should be scheduled by an approved operations workflow before being treated as automatic background deletion.

## 7. Deployment and maintenance

The project is deployed through Manus WebDev hosting on the CropWise domain. The normal release sequence is to update source code, run the automated tests, run TypeScript validation, run the production build, verify the preview and critical flows, review `todo.md`, and save a checkpoint. Because auto-publish is enabled for this project, saving a successful checkpoint publishes that version.

The primary checks are:

| Check | Command or action | Expected result |
|---|---|---|
| Automated tests | `pnpm test` | All tests pass |
| TypeScript | `pnpm exec tsc --noEmit` | No type errors |
| Production build | `pnpm build` | Vite frontend and server bundle complete |
| Preview | Open the managed preview | Dashboard renders without console/API regressions |
| Authentication | Start OAuth from the login action | External account chooser opens and callback returns to the app |
| Weather | Refresh weather with a valid farm location | Result, loading state, or translated unavailable state is visible |
| Database | Use the Management UI database panel | Inspect records without destructive operations |

## 8. Important current-state conclusions

The most important login-data conclusion is: **CropWise manages Google/Manus provider identity metadata, a signed application session, and—when selected—an independent local password hash.** It never receives or stores Google passwords. Reset tokens are stored only as hashes and expire after 30 minutes. Successful authentication returns the browser to `/dashboard`; profile and account controls are available at `/account`.

The application also stores private farmer data after authentication: farm location and preferences, private scan summaries and optional object-storage image references, crop reminders, and Wealth Watch thresholds. Public scan links are separate, expiring text snapshots and should not be confused with private scan history.

## References

[1]: client/src/App.tsx "CropWise route table"
[2]: client/src/main.tsx "Frontend tRPC client, credentials, and preview session forwarding"
[3]: client/src/const.ts "Client OAuth login starter and state cookie"
[4]: server/_core/oauth.ts "OAuth callback, nonce validation, provider exchange, and session creation"
[5]: drizzle/schema.ts "CropWise MySQL/Drizzle schema"
[6]: server/_core/cookies.ts "Session cookie options"
[7]: server/_core/sdk.ts "OAuth provider integration and application session JWT"
[8]: server/routers.ts "tRPC authentication and protected farmer-data procedures"
[9]: client/src/pages/ComponentShowcase.tsx "Static component showcase controls"
[10]: server/cropAnalysis.ts "Crop photo validation, object storage, and vision-analysis flow"
[11]: server/farmData.ts "Weather, mandi, location, provider fallback, and crop schema logic"
