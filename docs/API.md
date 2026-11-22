# API reference

The machine-readable OpenAPI 3.1 contract is [`openapi.json`](./openapi.json). It
documents the current Next.js API routes; it is not a promise of compatibility
with a future version. The routes do not currently use a version prefix.

## Base URL

Use the same origin as the ERP. For local development, start the app with
`npm run dev` and use `http://localhost:3000`.

## Authentication and authorization

- Most data routes accept a Supabase access token in `Authorization: Bearer
  <token>` or the `sb-access-token` HttpOnly cookie.
- `POST /api/auth/signin` is public and returns the user and Supabase session;
  it also sets the HttpOnly cookie.
- `POST /api/auth/session` requires a Bearer token and sets the cookie.
- `GET /api/auth/restore` accepts either the cookie or a Bearer token.
- `POST /api/auth/signout` clears the cookie and does not require a token.
- `GET /api/modules/all` is public. `GET /api/modules/user` and
  `GET /api/user/profile` require a Bearer token.
- Other API routes require an active profile. Administrators have full access
  to module routes; other users need the permission assigned to the matching
  module. `GET`/`HEAD` require `can_view`, `POST` requires `can_create`,
  `PUT`/`PATCH` require `can_edit`, and `DELETE` requires `can_delete`.
  `POST /api/clientes/{id}/credit` and
  `POST /api/inventario/{id}/movimientos` require `can_edit`.
- `/api/admin/permissions` additionally requires the active `admin` role.
- `GET` and `PUT /api/notifications/preferences` accept an authenticated user
  and manage only that user's external notification consent.
- `GET /api/cron/notifications` requires `Authorization: Bearer <CRON_SECRET>`;
  it is intended for the configured Vercel Cron job, not browser use.
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

## External inventory notifications

The preference route stores a phone in E.164 format and separate SMS and
WhatsApp opt-ins. A phone is required when either channel is enabled; disabling
both clears the stored number. The response includes the recorded consent
timestamps. Delivery is limited to active users who can view Inventory (or
active administrators).

The cron route processes queued low-stock notifications in batches. Deployment
configuration and Twilio setup are described in
[`LOW_STOCK_NOTIFICATIONS.md`](./LOW_STOCK_NOTIFICATIONS.md).
