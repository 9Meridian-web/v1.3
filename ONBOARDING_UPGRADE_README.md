# 9 Meridian onboarding upgrade

This release adds persistent onboarding completion and Google OAuth support for newly paid clients.

## Important

1. Keep your existing `.env`. It is intentionally NOT included in this release archive.
2. Run the new Supabase migration:
   `supabase/migrations/20260815_onboarding_completion.sql`
3. Run `npm install` if dependencies are not already installed.
4. Run `npm run build`.
5. Start the backend normally.

## New flow

Payment verification returns `client_id` + `setup_token`.
The website stores the setup token in sessionStorage.
Onboarding submits to:
`POST /api/onboarding/complete`

The backend persists:
- client profile
- business settings
- services
- agent draft
- agent settings/configuration

Google can then be connected using:
`GET /api/google/connect?setup_token=...`

The Google OAuth callback stores the connection against the same client ID.

## Local frontend/backend

The bundled `9-meridian-website/v1.html` currently points to:
`http://127.0.0.1:8080`

Change that URL in the website before production deployment.
