
import { Request, Response } from "express";
import { pool } from "../config/dbConnect";
import { createMovementSchema } from "../types/stockMovement.type";
import { AppError } from "../utils/AppError";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

// Get low stock items
export const getLowStock = async (req: Request, res: Response) => {
  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT
      items.id AS item_id,
      items.name AS item_name,
      warehouses.id AS warehouse_id,
      warehouses.name AS warehouse_name,
      items.reorder_threshold,
      COALESCE(SUM(stock_movements.quantity), 0) AS current_stock
    FROM stock_movements
    INNER JOIN items
      ON stock_movements.item_id = items.id
    INNER JOIN warehouses
      ON stock_movements.warehouse_id = warehouses.id
    WHERE items.deleted_at IS NULL
      AND warehouses.deleted_at IS NULL
    GROUP BY
      items.id,
      items.name,
      warehouses.id,
      warehouses.name,
      items.reorder_threshold
    HAVING COALESCE(SUM(stock_movements.quantity), 0)
      <= items.reorder_threshold
    ORDER BY current_stock ASC
  `);

  res.json(rows);
};

// Get all stock movements
export const getAllStockMovement = async (req: Request, res: Response) => {
  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT
      stock_movements.id,
      items.name AS item_name,
      warehouses.name AS warehouse_name,
      suppliers.name AS supplier_name,
      stock_movements.quantity,
      stock_movements.movement_type,
      stock_movements.created_at
    FROM stock_movements
    JOIN warehouses
      ON stock_movements.warehouse_id = warehouses.id
    JOIN items
      ON stock_movements.item_id = items.id
    LEFT JOIN suppliers
      ON stock_movements.supplier_id = suppliers.id
    ORDER BY stock_movements.created_at DESC
  `);

  res.json(rows);
};

// Create stock movement
export const createStockMovement = async (req: Request, res: Response) => {
  const parsed = createMovementSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0].message, 400);
  }

  const {
    item_id,
    warehouse_id,
    supplier_id,
    quantity,
    movement_type
  } = parsed.data;

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO stock_movements
      (item_id, warehouse_id, supplier_id, quantity, movement_type)
     VALUES (?, ?, ?, ?, ?)`,
    [
      item_id,
      warehouse_id,
      supplier_id ?? null,
      quantity,
      movement_type
    ]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM stock_movements WHERE id = ?",
    [result.insertId]
  );

  res.status(201).json(rows[0]);
};
