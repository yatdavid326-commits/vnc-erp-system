import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max);

export const customerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.union([z.literal(''), z.string().trim().email().max(254)]),
  phone: optionalText(50),
  nit_number: optionalText(50),
  address: optionalText(300),
  city: optionalText(100),
  country: optionalText(100),
  customer_type: z.enum(['retail', 'wholesale', 'business']),
  is_active: z.boolean(),
}).strict();

export type CustomerInput = z.infer<typeof customerSchema>;

export interface Customer {
  id: string;
  customer_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  nit_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  customer_type: CustomerInput['customer_type'] | null;
  is_active: boolean | null;
}

export const emptyCustomer: CustomerInput = {
  name: '',
  email: '',
  phone: '',
  nit_number: '',
  address: '',
  city: '',
  country: '',
  customer_type: 'retail',
  is_active: true,
};
