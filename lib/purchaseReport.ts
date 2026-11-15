import { z } from 'zod';
import { purchaseDate } from '@/lib/purchases';

export const reportPeriodSchema = z.object({
  from: purchaseDate.optional(),
  to: purchaseDate.optional(),
}).strict().refine(({ from, to }) => (!from && !to) || (!!from && !!to && from <= to));

const count = z.number().int().safe().nonnegative();
const amount = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/);

function amountInCents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * BigInt('100') + BigInt(fraction.padEnd(2, '0'));
}

export const purchaseReportSchema = z.object({
  total: count,
  pending: count,
  partially_received: count,
  received: count,
  cancelled: count,
  other: count,
  total_amount_gtq: amount,
  pending_amount_gtq: amount,
  partially_received_amount_gtq: amount,
  received_amount_gtq: amount,
  cancelled_amount_gtq: amount,
  other_amount_gtq: amount,
  unvalued_amount_orders: count,
}).strict().refine((value) =>
  value.total === value.pending + value.partially_received + value.received + value.cancelled + value.other
).refine((value) =>
  value.unvalued_amount_orders <= value.total
).refine((value) =>
  amountInCents(value.total_amount_gtq) === amountInCents(value.pending_amount_gtq)
    + amountInCents(value.partially_received_amount_gtq)
    + amountInCents(value.received_amount_gtq)
    + amountInCents(value.cancelled_amount_gtq)
    + amountInCents(value.other_amount_gtq)
);

export type ReportPeriod = z.infer<typeof reportPeriodSchema>;
export type PurchaseReport = z.infer<typeof purchaseReportSchema>;
