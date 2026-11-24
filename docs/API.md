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
  sharing an IP also share the limit. A request blocked by this ERP limit
  returns `429` with `Retry-After` in seconds. If Supabase Auth rejects a
  sign-in due to its own limit, the ERP also returns `429`, without a
  `Retry-After` value because the SDK does not expose one. If the limiter or
  trusted IP is unavailable, the endpoint returns `503` instead of allowing
  an unprotected sign-in.
  Vercel's `x-vercel-forwarded-for` provides the trusted IP; other production
  hosts require an appropriate trusted-proxy implementation before sign-in
  can be enabled. Local development uses a shared development bucket.
  This limit applies to the ERP endpoint, not direct Supabase Auth requests.
  This project's separate Supabase token limit is currently 150 requests per
  five minutes per source IP and uses a token bucket with bursts up to 30.
  It also covers session refreshes. The server-side password client uses the
  legacy anon key, so Supabase sees the server-side source IP, not the
  end-user IP. Direct requests are subject to
  [Supabase's own limits](https://supabase.com/docs/guides/auth/rate-limits).
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
  `POST /api/compras/{id}/anulacion` requires purchases `can_edit`;
  `POST /api/compras/{id}/recepcion-parcial` requires `can_edit` for both
  purchases and inventory.
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
- Direct `anon` and `authenticated` access to the POS transaction, line-item
  cash-register and cash-movement tables is revoked; these operations use the
  authorized ERP API and its server-side service role.
- Employee and attendance tables also deny direct access to those roles.
  `/api/reportes` counts records from the ERP's `asistencia` table across all
  dates; its attendance total is not filtered by the report period.
- `audit_logs` denies direct access to those roles; `service_role` retains
  access. This protection does not itself record audit events.
- `PUT` and `DELETE /api/caja/{id}` apply only to manual movements without a
  linked sale/reference in the caller's open cash register. A closed register
  cannot be modified, and linked movements cannot be edited or deleted.
  The cash totals in `/api/reportes` use inclusive movement dates from the
  `inicio` and `fin` parameters; other report metrics retain their existing
  behavior.

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

## Purchase orders and receipts

`POST /api/compras` creates a pending order with one or more distinct products;
its total is calculated from their quantities and unit prices. Creation does not
change stock. The caller supplies the order UUID as an idempotency key and must
reuse it with the same payload when retrying an uncertain request.
`POST /api/compras/{id}/recepcion-parcial` receives one or more quantities,
including all remaining quantities for a complete receipt. Its receipt UUID is
also an idempotency key. Stock, movements, order lines and order status change
atomically. A receipt cannot exceed the remaining quantities.
Receipts, manual inventory movements and POS sales serialize changes to the
same product using database locks. A sale that waits for another operation
checks the available stock again before completing.
Only pending, unreceived orders can be cancelled or have their date and notes
edited; editing requires the current `edit_version`. Orders are not deleted.
The former write endpoints and the legacy `compras` table are not used; the
migration refuses to cut over if legacy rows exist, and blocks further writes
to that table to prevent orders from becoming invisible.

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
