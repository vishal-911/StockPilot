
import { Router } from "express";
import {
  createSupplier,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController";

const router = Router();

router.get("/", getAllSuppliers);
router.post("/", createSupplier);
router.patch("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;
