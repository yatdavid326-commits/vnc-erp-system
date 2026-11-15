import { z } from 'zod';
import { purchaseDate } from '@/lib/purchases';

export const reportPeriodSchema = z.object({
  from: purchaseDate.optional(),
  to: purchaseDate.optional(),
}).strict().refine(({ from, to }) => (!from && !to) || (!!from && !!to && from <= to));

const count = z.number().int().safe().nonnegative();
export const purchaseReportSchema = z.object({
  total: count,
  pending: count,
  partially_received: count,
  received: count,
  cancelled: count,
  other: count,
}).strict().refine((value) =>
  value.total === value.pending + value.partially_received + value.received + value.cancelled + value.other
);

export type ReportPeriod = z.infer<typeof reportPeriodSchema>;
export type PurchaseReport = z.infer<typeof purchaseReportSchema>;
