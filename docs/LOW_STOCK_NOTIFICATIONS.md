# Low-stock SMS and WhatsApp notifications

The ERP can queue a notification when an active product first reaches or falls
below its reorder level. It sends a notification to active administrators and
users with Inventory view permission who explicitly enabled that channel.
Notifications contain only the product name, available quantity, and reorder
level; they do not include customer data.

## Database

Apply the migration
[`20261122000002_low_stock_external_notifications.sql`](../supabase/migrations/20261122000002_low_stock_external_notifications.sql)
to the Supabase database before deploying the application. The migration stores
channel preferences and consent timestamps, maintains an outbox, and adds
triggers for inventory and reorder-level changes. It does not send an initial
notification for products already below their threshold.

## User consent

Users manage their phone number and consent from **Notifications** in the
dashboard. SMS and WhatsApp consent are separate. Opting out of both channels
removes the saved phone number; queued messages are skipped if consent was
withdrawn before delivery.

## Twilio configuration

Add these server-side environment variables in Vercel and local development
environments. Do not expose them to client-side code or commit their values:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_WHATSAPP_CONTENT_SID`
- `CRON_SECRET`

Configure the Twilio Messaging Service with an SMS-capable sender and a
WhatsApp sender. Create and obtain approval for a WhatsApp Content Template
using Spanish utility content and three variables, in this order:

1. Product name
2. Available quantity
3. Reorder level

Suggested template body:

> Inventario bajo: {{1}} tiene {{2}} unidades disponibles (mínimo {{3}}).

Set `TWILIO_WHATSAPP_CONTENT_SID` to the approved Content SID. Twilio may apply
provider or carrier fees. The ERP uses Twilio's opt-out handling for SMS and
also provides an in-app control for withdrawing either channel's consent.

## Scheduled delivery

`vercel.json` invokes `GET /api/cron/notifications` every five minutes. Vercel
sends the configured `CRON_SECRET` as a Bearer token. Configure the same
high-entropy value as the server-side `CRON_SECRET` environment variable in
Vercel. The handler rejects requests without the matching secret. The schedule
requires a Vercel plan that supports Cron Jobs at this frequency.

The worker claims at most 25 messages per run, retries transient failures with
backoff, and stops after five attempts. Until all Twilio variables are present,
the worker returns `503` without claiming queued messages. Unit tests use a
mock transport; they do not send real messages.
