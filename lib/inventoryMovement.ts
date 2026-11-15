import { z } from 'zod';

export const movementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['entry', 'exit', 'adjustment']),
  quantity: z.number().int().min(0).max(2147483647),
  notes: z.string().trim().min(1).max(500),
}).strict().refine((value) => value.type === 'adjustment' || value.quantity > 0);

export type MovementInput = z.infer<typeof movementSchema>;
export interface InventoryMovement {
  id: string;
  movement_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  actor: { full_name: string } | null;
}
