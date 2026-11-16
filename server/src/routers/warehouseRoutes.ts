
import { Router } from "express";
import {
  createWarehouse,
  getAllWarehouses,
  updateWarehouse,
  deleteWarehouse,
} from "../controllers/warehouseController";

const router = Router();

router.get("/", getAllWarehouses);
router.post("/", createWarehouse);
router.patch("/:id", updateWarehouse);
router.delete("/:id", deleteWarehouse);

export default router;
