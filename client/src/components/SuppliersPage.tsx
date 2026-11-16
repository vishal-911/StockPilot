
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  X,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
} from "../api/supplierApi";

import type { CreateSupplierFormValues } from "../types/suppllier.types";

interface SuppliersPageProps {
  onSuppliersChanged?: () => void;
}

const emptyForm: CreateSupplierFormValues = {
  name: "",
  address: "",
  phone_no: "",
};

export default function SuppliersPage({
  onSuppliersChanged,
}: SuppliersPageProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);
  const [form, setForm] =
    useState<CreateSupplierFormValues>(emptyForm);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await getAllSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      toast.error("Could not load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return suppliers;

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.address,
        supplier.phone_no,
      ].some((value) => value?.toLowerCase().includes(term))
    );
  }, [suppliers, search]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      address: supplier.address,
      phone_no: supplier.phone_no || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.address.trim() || !form.phone_no.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone_no: form.phone_no.trim(),
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
        toast.success("Supplier updated successfully");
      } else {
        await createSupplier(payload);
        toast.success("Supplier added successfully");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingSupplier(null);

      await fetchSuppliers();
      onSuppliersChanged?.();
    } catch (error) {
      console.error("Supplier save failed:", error);
      toast.error("Could not save supplier. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${supplier.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteSupplier(supplier.id);
      toast.success("Supplier deleted successfully");

      await fetchSuppliers();
      onSuppliersChanged?.();
    } catch (error) {
      console.error("Supplier delete failed:", error);
      toast.error("Could not delete supplier");
    }
  };

  return (
    <section className="inventory-manager" id="suppliers">
      <div className="inventory-manager-heading">
        <div>
          <h2>Suppliers Management</h2>
          <p>Manage your supplier directory and contact details</p>
        </div>

        <div className="inventory-heading-actions">
          <button
            className="inventory-refresh"
            onClick={fetchSuppliers}
            disabled={loading}
            type="button"
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            className="inventory-add"
            onClick={openAddModal}
            type="button"
          >
            <Plus size={16} />
            Add Supplier
          </button>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search suppliers by name, address or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <span className="inventory-count">
          {filteredSuppliers.length} of {suppliers.length} suppliers
        </span>
      </div>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Address</th>
              <th>Phone Number</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="inventory-empty">
                  Loading suppliers...
                </td>
              </tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={4} className="inventory-empty">
                  <Truck size={25} />
                  {search
                    ? "No matching suppliers found"
                    : "No suppliers added yet"}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <div className="inventory-product-name">
                      <div className="inventory-product-icon">
                        <Building2 size={17} />
                      </div>
                      <strong>{supplier.name}</strong>
                    </div>
                  </td>

                  <td>
                    <span className="supplier-detail">
                      <MapPin size={14} />
                      {supplier.address}
                    </span>
                  </td>

                  <td>
                    <span className="supplier-detail">
                      <Phone size={14} />
                      {supplier.phone_no || "Not provided"}
                    </span>
                  </td>

                  <td>
                    <div className="inventory-row-actions">
                      <button
                        className="inventory-edit"
                        title="Edit supplier"
                        type="button"
                        onClick={() => openEditModal(supplier)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        className="inventory-delete"
                        title="Delete supplier"
                        type="button"
                        onClick={() => handleDelete(supplier)}
                      >
                        <Trash2 size={15} />
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
        <div
          className="inventory-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <div className="inventory-modal">
            <div className="inventory-modal-heading">
              <div>
                <h3>
                  {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                </h3>
                <p>
                  {editingSupplier
                    ? "Update the supplier information"
                    : "Enter the supplier's contact information"}
                </p>
              </div>

              <button
                className="inventory-modal-close"
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Supplier Name
                <input
                  type="text"
                  placeholder="Enter supplier name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Address
                <input
                  type="text"
                  placeholder="Enter supplier address"
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={form.phone_no}
                  onChange={(event) =>
                    setForm({ ...form, phone_no: event.target.value })
                  }
                  required
                />
              </label>

              <div className="inventory-modal-actions">
                <button
                  className="inventory-cancel"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="inventory-save"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingSupplier
                      ? "Update Supplier"
                      : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
