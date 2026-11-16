
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  CreateMovementProps,
  CreateStockInput,
  Item,
  Supplier,
  Warehouse,
} from "@/types/stock";
import {
  createStockMovement,
  getAllItems,
  getAllSuppliers,
  getAllWarehouses,
} from "@/api/stockApi";
import { toast } from "sonner";

type StockMovementDialogProps = CreateMovementProps & {
  triggerLabel?: string;
};

export const CreateStockMovementDialog = ({
  onMovementAdded,
  triggerLabel = "Add Movement",
}: StockMovementDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState<CreateStockInput>({
    item_id: 0,
    warehouse_id: 0,
    supplier_id: null,
    quantity: 0,
    movement_type: "restock",
  });

  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      const results = await Promise.allSettled([
        getAllItems(),
        getAllWarehouses(),
        getAllSuppliers(),
      ]);

      if (results[0].status === "fulfilled") {
        setItems(results[0].value);
      } else {
        toast.error("Failed to load items");
        console.error(results[0].reason);
      }

      if (results[1].status === "fulfilled") {
        setWarehouses(results[1].value);
      } else {
        toast.error("Failed to load warehouses");
        console.error(results[1].reason);
      }

      if (results[2].status === "fulfilled") {
        setSuppliers(results[2].value);
      } else {
        toast.error("Failed to load suppliers");
        console.error(results[2].reason);
      }
    };

    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  const numericFields = [
    "item_id",
    "warehouse_id",
    "supplier_id",
    "quantity",
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    let processedValue: string | number | null = value;

    if (numericFields.includes(name)) {
      processedValue =
        value === ""
          ? name === "supplier_id"
            ? null
            : 0
          : Number(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.item_id ||
      !formData.warehouse_id ||
      !formData.quantity ||
      Number(formData.quantity) <= 0
    ) {
      toast.error("Please select a product and warehouse and enter a valid quantity");
      return;
    }

    try {
      setSaving(true);

      await createStockMovement({
        ...formData,
        movement_type: formData.movement_type,
      });

      toast.success("Stock movement added successfully");

      setIsOpen(false);
      setFormData({
        item_id: 0,
        warehouse_id: 0,
        supplier_id: null,
        quantity: 0,
        movement_type: "restock",
      });

      onMovementAdded();
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button>{triggerLabel}</Button>} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {triggerLabel === "Stock In"
              ? "Add Stock to Warehouse"
              : "Add Stock Movement"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="item_id">Product</label>
            <select
              id="item_id"
              name="item_id"
              value={formData.item_id || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select a product</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="warehouse_id">Warehouse</label>
            <select
              id="warehouse_id"
              name="warehouse_id"
              value={formData.warehouse_id || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select a warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="supplier_id">Supplier (optional)</label>
            <select
              id="supplier_id"
              name="supplier_id"
              value={formData.supplier_id ?? ""}
              onChange={handleChange}
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={formData.quantity || ""}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="movement_type">Movement Type</label>
            <select
              id="movement_type"
              name="movement_type"
              value={formData.movement_type}
              onChange={handleChange}
            >
              <option value="restock">Restock (Stock In)</option>
              <option value="sale">Sale (Stock Out)</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Submit Movement"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
