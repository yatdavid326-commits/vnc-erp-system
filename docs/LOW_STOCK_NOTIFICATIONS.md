# Low-stock notifications

The ERP creates an in-app notification when an active product first reaches or
falls below its reorder level. It notifies active administrators and users with
Inventory view permission. The notice contains only the product name,
available quantity, and reorder level; it does not include customer data.

## Database

Apply the migration
[`20261122000002_low_stock_external_notifications.sql`](../supabase/migrations/20261122000002_low_stock_external_notifications.sql)
and the pause migration
[`20261123000001_pause_external_low_stock_notifications.sql`](../supabase/migrations/20261123000001_pause_external_low_stock_notifications.sql)
to Supabase before deploying the application. The triggers deliver in-app
notifications without a scheduled worker. Existing products already below
their threshold are not notified until a relevant inventory or threshold change.

## SMS and WhatsApp deferred

SMS and WhatsApp are intentionally paused while the ERP's in-app alert is being
validated. The migration marks queued external messages as skipped and stops
creating new external messages. The dashboard does not collect phone numbers or
external-channel consent during this phase.

Vercel Hobby does not support a five-minute cron schedule, so no external
notification worker is scheduled. Do not configure Twilio credentials or call
the worker to deliver external messages until a compatible scheduler is chosen.

When SMS/WhatsApp is resumed, configure these values on the server only:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_WHATSAPP_CONTENT_SID`
- `CRON_SECRET`

Also configure a scheduler that can invoke `GET /api/cron/notifications` with
`Authorization: Bearer <CRON_SECRET>`. Configure an SMS-capable sender and
WhatsApp sender in Twilio, and obtain approval for a Spanish WhatsApp Content
Template with product name, available quantity, and reorder level. Twilio may
apply provider or carrier fees. Unit tests use a mock transport and do not send
real messages.
