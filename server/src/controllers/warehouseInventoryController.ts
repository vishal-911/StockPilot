
import { Request, Response } from "express";
import { pool } from "../config/dbConnect";
import { RowDataPacket } from "mysql2/promise";
import { AppError } from "../utils/AppError";

export const getWarehouseInventory = async (req: Request, res: Response) => {
  const warehouseId = Number(req.params.warehouseId);

  if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
    throw new AppError("A valid warehouse ID is required", 400);
  }

  const [warehouseRows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM warehouses WHERE id = ? AND deleted_at IS NULL",
    [warehouseId]
  );

  if (warehouseRows.length === 0) {
    throw new AppError("Warehouse not found", 404);
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    `
      SELECT
        i.id AS item_id,
        i.name,
        i.sku,
        i.reorder_threshold,
        COALESCE(
          SUM(
            CASE
              WHEN LOWER(sm.movement_type) = 'restock' THEN ABS(sm.quantity)
              WHEN LOWER(sm.movement_type) = 'sale' THEN -ABS(sm.quantity)
              WHEN LOWER(sm.movement_type) = 'adjustment' THEN sm.quantity
              ELSE 0
            END
          ),
          0
        ) AS current_stock
      FROM items i
      LEFT JOIN stock_movements sm
        ON sm.item_id = i.id
        AND sm.warehouse_id = ?
      WHERE i.deleted_at IS NULL
      GROUP BY i.id, i.name, i.sku, i.reorder_threshold
      ORDER BY i.name ASC
    `,
    [warehouseId]
  );

  res.json(rows);
};
