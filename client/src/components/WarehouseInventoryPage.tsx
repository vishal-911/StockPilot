import { useEffect, useMemo, useState } from "react";
import "./WarehouseInventoryPage.css";
import { Boxes, RefreshCw, Search, Warehouse as WarehouseIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getAllWarehouses } from "../api/stockApi";
import { getWarehouseInventory, type WarehouseInventoryItem } from "../api/warehouse";
import type { Warehouse } from "../types/stock";

export function WarehouseInventoryPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [products, setProducts] = useState<WarehouseInventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const data = await getAllWarehouses();
        setWarehouses(data);
        if (data.length > 0) setSelectedWarehouseId(String(data[0].id));
      } catch (error) {
        console.error(error);
        toast.error("Could not load warehouses");
      } finally {
        setLoadingWarehouses(false);
      }
    };
    loadWarehouses();
  }, []);

  const loadInventory = async (warehouseId: string) => {
    if (!warehouseId) {
      setProducts([]);
      return;
    }
    setLoadingProducts(true);
    try {
      const data = await getWarehouseInventory(Number(warehouseId));
      setProducts(data);
    } catch (error) {
      console.error(error);
      toast.error("Could not load this warehouse's inventory");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadInventory(selectedWarehouseId);
  }, [selectedWarehouseId]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      `${product.name} ${product.sku}`.toLowerCase().includes(term)
    );
  }, [products, search]);

  const totalUnits = products.reduce(
    (total, product) => total + Math.max(0, Number(product.current_stock) || 0),
    0
  );
  const lowStockCount = products.filter(
    (product) => Number(product.current_stock) <= Number(product.reorder_threshold)
  ).length;

  return (
    <section className="warehouse-inventory-page" id="warehouse-inventory">
      <div className="warehouse-inventory-heading">
        <div>
          <h2>Warehouse Inventory</h2>
          <p>View the available quantity of every product in a selected warehouse.</p>
        </div>
        <button
          className="warehouse-inventory-refresh"
          onClick={() => loadInventory(selectedWarehouseId)}
          disabled={!selectedWarehouseId || loadingProducts}
        >
          <RefreshCw size={16} className={loadingProducts ? "warehouse-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="warehouse-inventory-controls">
        <label className="warehouse-select-wrap">
          <span>Select warehouse</span>
          <select
            value={selectedWarehouseId}
            onChange={(event) => setSelectedWarehouseId(event.target.value)}
            disabled={loadingWarehouses || warehouses.length === 0}
          >
            {warehouses.length === 0 && <option value="">No warehouses available</option>}
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>

        <label className="warehouse-search-wrap">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product name or SKU..."
          />
        </label>
      </div>

      <div className="warehouse-inventory-summary">
        <div>
          <WarehouseIcon size={19} />
          <span>{warehouses.find((w) => String(w.id) === selectedWarehouseId)?.name || "Selected warehouse"}</span>
        </div>
        <div><strong>{totalUnits.toLocaleString("en-IN")}</strong><small>Total units</small></div>
        <div><strong>{products.length}</strong><small>Products</small></div>
        <div><strong>{lowStockCount}</strong><small>Low-stock products</small></div>
      </div>

      <div className="warehouse-inventory-table-wrap">
        {loadingWarehouses ? (
          <div className="warehouse-inventory-empty">Loading warehouses...</div>
        ) : loadingProducts ? (
          <div className="warehouse-inventory-empty">Loading inventory...</div>
        ) : warehouses.length === 0 ? (
          <div className="warehouse-inventory-empty">Create a warehouse first to view its inventory.</div>
        ) : filteredProducts.length === 0 ? (
          <div className="warehouse-inventory-empty">
            {search ? "No products match your search." : "No products found."}
          </div>
        ) : (
          <table className="warehouse-inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Current stock</th>
                <th>Reorder threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const current = Number(product.current_stock) || 0;
                const threshold = Number(product.reorder_threshold) || 0;
                const isLow = current <= threshold;
                return (
                  <tr key={product.item_id}>
                    <td><span className="warehouse-product-name"><Boxes size={17} />{product.name}</span></td>
                    <td>{product.sku}</td>
                    <td><strong>{current}</strong></td>
                    <td>{threshold}</td>
                    <td>
                      <span className={isLow ? "warehouse-stock-status low" : "warehouse-stock-status healthy"}>
                        {isLow && <AlertTriangle size={13} />}
                        {isLow ? "Low stock" : "Healthy"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
