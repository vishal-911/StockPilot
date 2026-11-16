
import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone_no: z.string().min(1, "Phone number is required"),
});

// Keep this name for CreateSupplierDialog.tsx
export const createSupplierSchema = supplierSchema;

export const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone_no: z.string().min(1).optional(),
});

export type CreateSupplierFormValues = z.infer<typeof supplierSchema>;
