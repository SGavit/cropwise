# CropWise — Independent Deployment

This export removes the Manus runtime, Manus OAuth integration, Manus Forge APIs, Manus storage proxy, and Manus Vite plugin.

## Required for a working deployment

- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — random secret, at least 32 characters
- `AI_API_KEY` — key for an OpenAI-compatible API if AI crop analysis/expert features are enabled

## Optional

- `VITE_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY` — maps
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` — password reset email delivery
- AWS S3 variables with `STORAGE_MODE=s3` — production object storage

For browser testing, `STORAGE_MODE=local` works without AWS. The application stores uploads under `uploads/` and serves them through `/storage/*`.

## Start

```bash
pnpm install
pnpm dev
```

Production:

```bash
pnpm install
pnpm build
pnpm start
```

The built-in email/password authentication is now the default login path. External OAuth can be added later without bringing back the Manus runtime.
