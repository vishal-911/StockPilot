
import { Request, Response } from "express";
import { pool } from "../config/dbConnect";
import {
  updateWarehouseSchema,
  warehouseSchema,
} from "../types/warehouse.type";
import { AppError } from "../utils/AppError";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

// Get all active warehouses
export const getAllWarehouses = async (req: Request, res: Response) => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, name FROM warehouses WHERE deleted_at IS NULL"
  );

  res.json(rows);
};

// Create warehouse
export const createWarehouse = async (req: Request, res: Response) => {
  const parsed = warehouseSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0].message, 400);
  }

  const { name, address } = parsed.data;

  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO warehouses (name, address) VALUES (?, ?)",
    [name, address]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM warehouses WHERE id = ?",
    [result.insertId]
  );

  res.status(201).json(rows[0]);
};

// Update warehouse
export const updateWarehouse = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid warehouse ID", 400);
  }

  const parsed = updateWarehouseSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0].message, 400);
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (parsed.data.name !== undefined) {
    updates.push("name = ?");
    values.push(parsed.data.name);
  }

  if (parsed.data.address !== undefined) {
    updates.push("address = ?");
    values.push(parsed.data.address);
  }

  if (updates.length === 0) {
    throw new AppError("No fields provided to update", 400);
  }

  const [existing] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM warehouses WHERE id = ? AND deleted_at IS NULL",
    [id]
  );

  if (existing.length === 0) {
    throw new AppError("Warehouse not found", 404);
  }

  values.push(id);

  await pool.execute(
    `UPDATE warehouses SET ${updates.join(", ")}
     WHERE id = ? AND deleted_at IS NULL`,
    values
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM warehouses WHERE id = ?",
    [id]
  );

  res.json(rows[0]);
};

// Soft delete warehouse
export const deleteWarehouse = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid warehouse ID", 400);
  }

  const [existing] = await pool.execute<RowDataPacket[]>(
    "SELECT deleted_at FROM warehouses WHERE id = ?",
    [id]
  );

  if (existing.length === 0) {
    throw new AppError("Warehouse not found", 404);
  }

  if (existing[0].deleted_at !== null) {
    throw new AppError("Warehouse is already deleted", 400);
  }

  await pool.execute<ResultSetHeader>(
    "UPDATE warehouses SET deleted_at = NOW() WHERE id = ?",
    [id]
  );

  res.json({ message: "Warehouse deleted successfully" });
};
