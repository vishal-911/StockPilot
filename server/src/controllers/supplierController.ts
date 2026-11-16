
import { Request, Response } from "express";
import { pool } from "../config/dbConnect";
import { supplierSchema, updateSupplierSchema } from "../types/supplier.type";
import { AppError } from "../utils/AppError";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

// Get all active suppliers
export const getAllSuppliers = async (req: Request, res: Response) => {
    const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT id, name, address, phone_no FROM suppliers WHERE deleted_at IS NULL"
    );

    res.json(rows);
};

// Create supplier
export const createSupplier = async (req: Request, res: Response) => {
    const parsed = supplierSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new AppError(parsed.error.issues[0].message, 400);
    }

    const { name, address, phone_no } = parsed.data;

    const [result] = await pool.execute<ResultSetHeader>(
        "INSERT INTO suppliers (name, address, phone_no) VALUES (?, ?, ?)",
        [name, address, phone_no ?? null]
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM suppliers WHERE id = ?",
        [result.insertId]
    );

    res.status(201).json(rows[0]);
};

// Update supplier
export const updateSupplier = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Invalid supplier ID", 400);
    }

    const parsed = updateSupplierSchema.safeParse(req.body);

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

    if (parsed.data.phone_no !== undefined) {
        updates.push("phone_no = ?");
        values.push(parsed.data.phone_no);
    }

    if (updates.length === 0) {
        throw new AppError("No fields provided to update", 400);
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM suppliers WHERE id = ? AND deleted_at IS NULL",
        [id]
    );

    if (existing.length === 0) {
        throw new AppError("Supplier not found", 404);
    }

    values.push(id);

    await pool.execute(
        `UPDATE suppliers SET ${updates.join(", ")}
         WHERE id = ? AND deleted_at IS NULL`,
        values
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT * FROM suppliers WHERE id = ?",
        [id]
    );

    res.json(rows[0]);
};

// Soft delete supplier
export const deleteSupplier = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Invalid supplier ID", 400);
    }

    const [result] = await pool.execute<ResultSetHeader>(
        "UPDATE suppliers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
        [id]
    );

    if (result.affectedRows === 0) {
        throw new AppError("Supplier not found or already deleted", 404);
    }

    res.json({ message: "Supplier deleted successfully" });
};
