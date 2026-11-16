
import { Request, Response } from "express";
import { pool } from "../config/dbConnect";
import { itemSchema, updateItemSchema } from "../types/item.type";
import { AppError } from "../utils/AppError";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

// Get all active items
export const getAllItems = async (req: Request, res: Response) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT id, sku, name, reorder_threshold FROM items WHERE deleted_at IS NULL"
    );

    res.json(rows);
};

// Create a new item
export const createItem = async (req: Request, res: Response) => {
    const parsed = itemSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new AppError(parsed.error.issues[0].message, 400);
    }

    const { name, sku, reorder_threshold } = parsed.data;

    const [result] = await pool.execute<ResultSetHeader>(
        "INSERT INTO items (name, sku, reorder_threshold) VALUES (?, ?, ?)",
        [name, sku, reorder_threshold]
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM items WHERE id = ?",
        [result.insertId]
    );

    res.status(201).json(rows[0]);
};

// Update an item
export const updateItem = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Invalid item ID", 400);
    }

    const parsed = updateItemSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new AppError(parsed.error.issues[0].message, 400);
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (parsed.data.name !== undefined) {
        updates.push("name = ?");
        values.push(parsed.data.name);
    }

    if (parsed.data.sku !== undefined) {
        updates.push("sku = ?");
        values.push(parsed.data.sku);
    }

    if (parsed.data.reorder_threshold !== undefined) {
        updates.push("reorder_threshold = ?");
        values.push(parsed.data.reorder_threshold);
    }

    if (updates.length === 0) {
        throw new AppError("No fields provided to update", 400);
    }

    values.push(id);

    const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE items SET ${updates.join(", ")}
         WHERE id = ? AND deleted_at IS NULL`,
        values
    );

    if (result.affectedRows === 0) {
        throw new AppError("Item not found", 404);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM items WHERE id = ?",
        [id]
    );

    res.json(rows[0]);
};

// Soft delete an item
export const deleteItem = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Invalid item ID", 400);
    }

    const [result] = await pool.execute<ResultSetHeader>(
        "UPDATE items SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
        [id]
    );

    if (result.affectedRows === 0) {
        throw new AppError("Item not found or already deleted", 404);
    }

    res.json({ message: "Item deleted successfully" });
};
