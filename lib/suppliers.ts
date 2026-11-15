import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max);

export const supplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contact_person: optionalText(200),
  email: z.union([z.literal(''), z.string().trim().email().max(254)]),
  phone: optionalText(50),
  nit_number: optionalText(50),
  address: optionalText(300),
  city: optionalText(100),
  country: optionalText(100),
  payment_terms: optionalText(200),
  is_active: z.boolean(),
}).strict();

export type SupplierInput = z.infer<typeof supplierSchema>;

export interface Supplier {
  id: string;
  supplier_number: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  nit_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  payment_terms: string | null;
  is_active: boolean | null;
}

export const emptySupplier: SupplierInput = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  nit_number: '',
  address: '',
  city: '',
  country: '',
  payment_terms: '',
  is_active: true,
};
