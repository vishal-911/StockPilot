
import type { CreateItemFormValues } from "@/types/items.types";
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

// Get all active items
export const getAllItems = async () => {
  const response = await axios.get(`${BASE_URL}/items`);
  return response.data;
};

// Add a new item
export const createItem = async (data: CreateItemFormValues) => {
  const response = await axios.post(`${BASE_URL}/items`, data);
  return response.data;
};

// Update an existing item
export const updateItem = async (
  id: number,
  data: Partial<CreateItemFormValues>
) => {
  const response = await axios.patch(`${BASE_URL}/items/${id}`, data);
  return response.data;
};

// Soft delete an item
export const deleteItem = async (id: number) => {
  const response = await axios.delete(`${BASE_URL}/items/${id}`);
  return response.data;
};
