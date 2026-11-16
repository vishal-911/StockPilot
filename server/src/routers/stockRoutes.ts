
import { Router } from "express";
import {
  createStockMovement,
  getAllStockMovement,
  getLowStock,
} from "../controllers/stockController";
import { getWarehouseInventory } from "../controllers/warehouseInventoryController";

const router = Router();

// Low stock
router.get("/low", getLowStock);

// Warehouse-wise inventory
router.get(
  "/warehouse-inventory/:warehouseId",
  getWarehouseInventory
);

// Stock movements
router.get("/movements", getAllStockMovement);
router.post("/movements", createStockMovement);

export default router;
