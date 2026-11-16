
import { Router } from "express";
import {
  createItem,
  getAllItems,
  updateItem,
  deleteItem,
} from "../controllers/itemController";

const router = Router();

router.get("/", getAllItems);
router.post("/", createItem);
router.patch("/:id", updateItem);
router.delete("/:id", deleteItem);

export default router;
