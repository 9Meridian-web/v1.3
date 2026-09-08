# Production Upgrade Notes

This archive is based on the uploaded AI Receptionist backend. Existing booking, availability, cancellation, rescheduling, Google Calendar, Google Sheets, Supabase, and Dify-facing backend logic was retained rather than replaced.

## Added / hardened

- Strict production environment validation.
- CORS allowlist.
- Helmet hardening and smaller request body limits.
- Request IDs and safer production errors.
- Liveness/readiness endpoints.
- Login/register/AI rate limits.
- Signed 10-minute Google OAuth state tied to the authenticated client/user.
- Encrypted Google refresh-token storage with AES-256-GCM and legacy fallback.
- Token migration script for existing plaintext Google refresh tokens.
- Removed sensitive token/event/debug logging.
- Authenticated, client-owned agent endpoints.
- Agent draft/publish lifecycle with public slug.
- Publication guard requiring Google + services + business settings.
- Client onboarding status endpoint.
- Provider-agnostic payment confirmation webhook handoff.
- One-time-flow style onboarding token for secure owner registration instead of trusting a public `client_id` during registration.
- Supabase migration for orders and lifecycle fields.

## Deliberately not fabricated

- No fake payment-gateway integration was added because the payment provider was not specified.
- No fake Dify app-cloning call was added because the exact Dify deployment/API credentials/template app are not present in the backend archive. The backend now has the lifecycle fields needed to store a Dify app ID and publish state.

## Verification

- `npm run build` — passed.
- `npm run typecheck` — passed.
- Server smoke test for `/` and `/health/live` — passed.
- No `.env`, service-role keys, OAuth secrets, or compiled artifacts are included in this archive.
