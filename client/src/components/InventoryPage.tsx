
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, RefreshCw, Package } from "lucide-react";
import { toast } from "sonner";
import {
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
} from "../api/itemApi";
import type { CreateItemFormValues } from "../types/items.types";

type InventoryItem = {
  id: number;
  name: string;
  sku: string;
  reorder_threshold: number;
};

type InventoryPageProps = {
  onItemsChanged?: () => void;
};

const emptyForm = {
  name: "",
  sku: "",
  reorder_threshold: "10",
};

export function InventoryPage({ onItemsChanged }: InventoryPageProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getAllItems();
      setItems(data);
    } catch (error) {
      console.error("Could not load inventory:", error);
      toast.error("Could not load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
    );
  }, [items, search]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      sku: item.sku,
      reorder_threshold: String(item.reorder_threshold ?? 10),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Product name and SKU are required");
      return;
    }

    const threshold =
      form.reorder_threshold.trim() === ""
        ? undefined
        : Number(form.reorder_threshold);

    if (
      threshold !== undefined &&
      (!Number.isFinite(threshold) || threshold < 0)
    ) {
      toast.error("Enter a valid reorder threshold");
      return;
    }

    const data: CreateItemFormValues = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      ...(threshold !== undefined
        ? { reorder_threshold: threshold }
        : {}),
    };

    try {
      setSaving(true);

      if (editingItem) {
        await updateItem(editingItem.id, data);
        toast.success("Product updated successfully");
      } else {
        await createItem(data);
        toast.success("Product added successfully");
      }

      closeModal();
      await fetchItems();
      onItemsChanged?.();
    } catch (error) {
      console.error("Product save failed:", error);
      toast.error("Could not save product. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteItem(item.id);
      toast.success("Product deleted successfully");
      await fetchItems();
      onItemsChanged?.();
    } catch (error) {
      console.error("Product deletion failed:", error);
      toast.error("Could not delete product");
    }
  };

  return (
    <section className="inventory-manager" id="inventory">
      <div className="inventory-manager-heading">
        <div>
          <h2>Inventory Management</h2>
          <p>View, search and manage all your products</p>
        </div>

        <div className="inventory-heading-actions">
          <button
            className="inventory-refresh"
            onClick={fetchItems}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button className="inventory-add" onClick={openAddModal}>
            <Plus size={17} />
            Add Product
          </button>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <span className="inventory-count">
          {filteredItems.length} of {items.length} products
        </span>
      </div>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Reorder Threshold</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="inventory-empty">
                  Loading products...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="inventory-empty">
                  <Package size={25} />
                  <span>
                    {search
                      ? "No products match your search."
                      : "No products found. Add your first product."}
                  </span>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="inventory-product-name">
                      <span className="inventory-product-icon">
                        <Package size={17} />
                      </span>
                      <strong>{item.name}</strong>
                    </div>
                  </td>

                  <td>
                    <span className="inventory-sku">{item.sku}</span>
                  </td>

                  <td>{item.reorder_threshold ?? 0}</td>

                  <td>
                    <div className="inventory-row-actions">
                      <button
                        className="inventory-edit"
                        title="Edit product"
                        onClick={() => openEditModal(item)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        className="inventory-delete"
                        title="Delete product"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="inventory-modal-overlay">
          <div className="inventory-modal">
            <div className="inventory-modal-heading">
              <div>
                <h3>{editingItem ? "Edit Product" : "Add New Product"}</h3>
                <p>
                  {editingItem
                    ? "Update the product information"
                    : "Enter the details of your new product"}
                </p>
              </div>

              <button
                className="inventory-modal-close"
                onClick={closeModal}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Product Name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter product name"
                  required
                />
              </label>

              <label>
                SKU
                <input
                  value={form.sku}
                  onChange={(event) =>
                    setForm({ ...form, sku: event.target.value })
                  }
                  placeholder="Enter SKU"
                  required
                />
              </label>

              <label>
                Reorder Threshold
                <input
                  type="number"
                  min="0"
                  value={form.reorder_threshold}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reorder_threshold: event.target.value,
                    })
                  }
                  placeholder="Enter reorder threshold"
                />
              </label>

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="inventory-cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inventory-save"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                      ? "Save Changes"
                      : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
