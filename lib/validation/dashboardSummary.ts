import { z } from 'zod';

const nonNegativeCount = z.number().int().nonnegative();
const nonNegativeAmount = z.number().finite().nonnegative();
const validTimestamp = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));

export const dashboardSummarySchema = z
  .object({
    salesThisMonth: z
      .object({
        amount: nonNegativeAmount,
        count: nonNegativeCount,
      })
      .strict(),
    stock: z
      .object({
        productsWithStock: nonNegativeCount,
        availableUnits: nonNegativeCount,
      })
      .strict(),
    activeCustomers: nonNegativeCount,
    totalIncome: nonNegativeAmount,
    recentSales: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            transactionNumber: z.string().min(1),
            paymentMethod: z.string().min(1),
            total: nonNegativeAmount,
            createdAt: validTimestamp,
          })
          .strict()
      )
      .max(5),
    lowStockCount: nonNegativeCount,
    lowStockProducts: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            productCode: z.string().min(1),
            name: z.string().min(1),
            quantityOnHand: nonNegativeCount,
            reorderLevel: nonNegativeCount,
          })
          .strict()
      )
      .max(5),
  })
  .strict();

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
