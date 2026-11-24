# API reference

The machine-readable OpenAPI 3.1 contract is [`openapi.json`](./openapi.json). It
documents the current Next.js API routes; it is not a promise of compatibility
with a future version. The routes do not currently use a version prefix.

## Base URL

Use the same origin as the ERP. For local development, start the app with
`npm run dev` and use `http://localhost:3000`.

## Authentication and authorization

- Browser requests use the `sb-access-token` and `sb-refresh-token` HttpOnly
  cookies; API clients may also use `Authorization: Bearer <token>`.
- `POST /api/auth/signin` is public and returns only `{ "authenticated": true
  }`. It sets both HttpOnly cookies; tokens are never returned in JSON.
  Valid sign-in requests are limited to 20 per client IP in any rolling
  15-minute window, counting successful and unsuccessful attempts. Connections
  sharing an IP also share the limit. A blocked request returns `429` with
  `Retry-After` in seconds. If the limiter or trusted IP is unavailable, the
  endpoint returns `503` instead of allowing an unprotected sign-in.
  Vercel's `x-vercel-forwarded-for` provides the trusted IP; other production
  hosts require an appropriate trusted-proxy implementation before sign-in
  can be enabled. Local development uses a shared development bucket.
  This limit applies to the ERP endpoint, not direct Supabase Auth requests.
- `POST /api/auth/session` requires a Bearer token and sets the cookie.
- `GET /api/auth/restore` accepts either the cookie or a Bearer token.
- `POST /api/auth/signout` revokes the Supabase session when possible, clears
  both cookies, and does not require a token.
- `GET /api/modules/all` is public. `GET /api/modules/user` and
  `GET /api/user/profile` accept either a Bearer token or the HttpOnly cookies.
- Other API routes require an active profile. Administrators have full access
  to module routes; other users need the permission assigned to the matching
  module. `GET`/`HEAD` require `can_view`, `POST` requires `can_create`,
  `PUT`/`PATCH` require `can_edit`, and `DELETE` requires `can_delete`.
  `POST /api/clientes/{id}/credit` and
  `POST /api/inventario/{id}/movimientos` require `can_edit`.
- `/api/admin/permissions` additionally requires the active `admin` role.
- `POST /api/reportes/email` requires `can_view` permission for the Reports
  module and sends only to the authenticated account email.
- `GET` and `PUT /api/notifications/preferences` accept an authenticated user
  and manage only that user's external notification consent.
- `GET /api/notifications` returns the authenticated user's recent in-app
  notifications and unread count. `PATCH /api/notifications` marks one
  notification (`{ "id": "<uuid>" }`) or all notifications (`{ "all": true }`)
  as read.
- `GET /api/dashboard/metrics` requires `can_view` permission for the Dashboard
  module. It returns current-month completed sales, active stock and customer
  counts, all-time completed-sale income, up to five recent completed sales,
  and up to five products at or below their reorder level.
- `GET /api/cron/notifications` requires `Authorization: Bearer <CRON_SECRET>`;
  it is not scheduled on the current Vercel Hobby plan. External delivery is
  paused while in-app inventory alerts are being validated.
- A missing/invalid session returns `401`; an inactive profile or insufficient
  permission returns `403`.

## Pagination and errors

Paginated list routes accept `page` (1-based) and `limit` (1-100). Most default
to 25 records; inventory defaults to 10 and the POS catalog to 100. Most list
routes return an array and the `X-Total-Count`, `X-Page`, and `X-Limit`
headers. POS list routes return `X-Total-Count`; the cash movements route
returns pagination and totals in its JSON object.

Errors are JSON objects with an `error` field and, on some routes, a `details`
field. Validation errors use `400`; missing records may use `404`; business
conflicts may use `409`; unexpected server failures use `500`. The exact
response body can vary by route and is represented conservatively in the
OpenAPI schemas where the implementation returns database records.

## Explore the contract

Import `docs/openapi.json` into Swagger UI or another OpenAPI 3.1 viewer. For
cookie-authenticated requests, use the same origin as the ERP. Do not paste
production access tokens or credentials into public documentation tools.

## Inventory notifications

Low-stock events create in-app notifications for active administrators and
users who can view Inventory. SMS and WhatsApp delivery is paused; the
dashboard does not collect phone numbers or external-channel consent. The
protected cron route remains available for a future scheduler, but no Vercel
Cron job is configured. Details are in
[`LOW_STOCK_NOTIFICATIONS.md`](./LOW_STOCK_NOTIFICATIONS.md).

## Email reports

`POST /api/reportes/email` emails the currently displayed report as a PDF to
the authenticated user's account email. The request cannot choose a recipient,
and report data must pass schema validation. Configure the SendGrid sender
server-side with `SENDGRID_API_KEY` and a verified `SENDGRID_FROM_EMAIL`;
optionally set `SENDGRID_FROM_NAME`. Until these values are configured, the
endpoint responds with `503`. Do not share or commit provider credentials.
