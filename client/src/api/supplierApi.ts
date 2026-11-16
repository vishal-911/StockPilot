
import type { CreateSupplierFormValues } from "@/types/suppllier.types";
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

// Supplier interface
export interface Supplier {
  id: number;
  name: string;
  address: string;
  phone_no: string;
}

// Get all active suppliers
export const getAllSuppliers = async (): Promise<Supplier[]> => {
  const response = await axios.get<Supplier[]>(`${BASE_URL}/suppliers`);
  return response.data;
};

// Add supplier
export const createSupplier = async (
  data: CreateSupplierFormValues
) => {
  const response = await axios.post(`${BASE_URL}/suppliers`, data);
  return response.data;
};

// Update supplier
export const updateSupplier = async (
  id: number,
  data: Partial<CreateSupplierFormValues>
) => {
  const response = await axios.patch(
    `${BASE_URL}/suppliers/${id}`,
    data
  );
  return response.data;
};

// Soft delete supplier
export const deleteSupplier = async (id: number) => {
  const response = await axios.delete(`${BASE_URL}/suppliers/${id}`);
  return response.data;
};
