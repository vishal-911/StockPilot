import { useCallback, useEffect, useState } from "react";
import "./App.css";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  Truck,
  Users,
  Warehouse as WarehouseIcon,
  Search,
  Bell,
  RefreshCw,
} from "lucide-react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Toaster } from "@/components/ui/sonner";

import { CreateStockMovementDialog } from "./components/CreateStockMovementDialog";
import { LowStockDialog } from "./components/LowStockDialog";
import { StockMovementTable } from "./components/stockMovements";
import { CreateItemDialog } from "./components/CreateItemDialog";
import { CreateSupplierDialog } from "./components/CreateSupplierDialog";
import { CreateWarehouseDialog } from "./components/CreateWarehouseDialog";
import { InventoryPage } from "./components/InventoryPage";
import SuppliersPage from "./components/SuppliersPage";
import { WarehouseInventoryPage } from "./components/WarehouseInventoryPage";
import {
  getAllMovements,
  getAllItems,
  getAllSuppliers,
  getAllWarehouses,
  getLowStock,
} from "./api/stockApi";

import type {
  StockMovement,
  Item,
  Supplier,
  Warehouse,
  LowStockItem,
} from "./types/stock";

const COLORS = ["#24ce80", "#f28b45", "#a66bfa", "#36a8e9", "#e65ac4"];

// Convert a movement record into its effect on available stock.
// Sales are always treated as stock leaving, even if the API stores
// their quantity as a positive number. Restocks always add stock.
// Adjustments retain their stored sign. Transfers do not change the
// total stock across all warehouses.
const getStockDelta = (movement: StockMovement): number => {
  const quantity = Math.abs(Number(movement.quantity) || 0);
  const movementType = movement.movement_type.toLowerCase();

  if (movementType === "restock") return quantity;
  if (movementType === "sale") return -quantity;
  if (movementType === "adjustment") {
    return Number(movement.quantity) || 0;
  }

  // A transfer only changes location, not total inventory.
  // It is excluded until transfers are represented as paired
  // outgoing/incoming warehouse movements.
  return 0;
};

function App() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      getAllMovements(),
      getAllItems(),
      getAllSuppliers(),
      getAllWarehouses(),
      getLowStock(),
    ]);

    if (results[0].status === "fulfilled") {
      setMovements(results[0].value);
    } else {
      console.error("Movements failed:", results[0].reason);
    }

    if (results[1].status === "fulfilled") {
      setItems(results[1].value);
    } else {
      console.error("Items failed:", results[1].reason);
    }

    if (results[2].status === "fulfilled") {
      setSuppliers(results[2].value);
    } else {
      console.error("Suppliers failed:", results[2].reason);
    }

    if (results[3].status === "fulfilled") {
      setWarehouses(results[3].value);
    } else {
      console.error("Warehouses failed:", results[3].reason);
    }

    if (results[4].status === "fulfilled") {
      setLowStock(results[4].value);
    } else {
      console.error("Low stock failed:", results[4].reason);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Group movement quantities by date
  const dailyMap = new Map<
    string,
    { inbound: number; outbound: number }
  >();

  movements.forEach((movement) => {
    const date = new Date(movement.created_at);

    if (Number.isNaN(date.getTime())) return;

    const key = date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

    if (!dailyMap.has(key)) {
      dailyMap.set(key, { inbound: 0, outbound: 0 });
    }

    const entry = dailyMap.get(key)!;
    const quantity = Math.abs(Number(movement.quantity) || 0);

    if (movement.movement_type.toLowerCase() === "restock") {
      entry.inbound += quantity;
    } else if (movement.movement_type.toLowerCase() === "sale") {
      entry.outbound += quantity;
    }
  });

  const trendData = Array.from(dailyMap, ([date, values]) => ({
    date,
    inbound: values.inbound,
    outbound: values.outbound,
  })).slice(-10);

  // Calculate stock by warehouse using the movement type.
  // Restocks add stock and sales remove stock, regardless of whether
  // the API stores a sale quantity as positive or negative.
  const warehouseMap = new Map<string, number>();

  movements.forEach((movement) => {
    const name = movement.warehouse_name;
    const delta = getStockDelta(movement);

    warehouseMap.set(
      name,
      (warehouseMap.get(name) || 0) + delta
    );
  });

  const warehouseData = Array.from(
    warehouseMap,
    ([name, stock]) => ({
      name,
      stock: Math.max(0, stock),
    })
  );

  // Rank products using only the relevant movement type.
  const salesMap = new Map<string, number>();
  const restockMap = new Map<string, number>();
  const currentStockMap = new Map<string, number>();

  movements.forEach((movement) => {
    const name = movement.item_name;
    const quantity = Number(movement.quantity) || 0;
    const movementType = movement.movement_type.toLowerCase();

    // Sales are stored as negative quantities in this database.
    if (movementType === "sale") {
      salesMap.set(name, (salesMap.get(name) || 0) + Math.abs(quantity));
    }

    if (movementType === "restock") {
      restockMap.set(name, (restockMap.get(name) || 0) + Math.abs(quantity));
    }

    // Calculate actual stock effect by movement type.
    // This prevents a positive sale quantity from incorrectly increasing stock.
    const stockDelta = getStockDelta(movement);

    currentStockMap.set(
      name,
      (currentStockMap.get(name) || 0) + stockDelta
    );
  });

  const topSellingProducts = Array.from(
    salesMap,
    ([name, quantity]) => ({ name, quantity })
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const topRestockedProducts = Array.from(
    restockMap,
    ([name, quantity]) => ({ name, quantity })
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const currentStockProducts = Array.from(
    currentStockMap,
    ([name, quantity]) => ({ name, quantity })
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const totalStock = Array.from(currentStockMap.values()).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  const stats = [
    {
      title: "Total Products",
      value: items.length,
      icon: Package,
      color: "purple",
    },
    {
      title: "Current Stock",
      value: totalStock.toLocaleString("en-IN"),
      icon: Boxes,
      color: "green",
    },
    {
      title: "Low Stock",
      value: lowStock.length,
      icon: AlertTriangle,
      color: "orange",
    },
    {
      title: "Suppliers",
      value: suppliers.length,
      icon: Users,
      color: "blue",
    },
    {
      title: "Warehouses",
      value: warehouses.length,
      icon: WarehouseIcon,
      color: "cyan",
    },
    {
      title: "Movements",
      value: movements.length,
      icon: Activity,
      color: "pink",
    },
  ];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="dashboard-shell">
      <Toaster richColors position="top-right" />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Boxes size={23} />
          </div>
          <span>
            Stock<span>Pilot</span>
          </span>
        </div>

        <div className="side-label">WORKSPACE</div>

        <nav className="side-nav">
          <a className="side-link active" href="#overview">
            <LayoutDashboard /> Dashboard
          </a>
          <a className="side-link" href="#inventory">
            <Package /> Inventory
          </a>
          <a className="side-link" href="#activity">
            <Activity /> Stock Movements
          </a>
          <a className="side-link" href="#suppliers">
            <Truck /> Suppliers
          </a>
          <a className="side-link" href="#warehouses">
            <WarehouseIcon /> Warehouses
          </a>
          <a className="side-link" href="#warehouse-inventory">
            <Boxes /> Warehouse Inventory
          </a>
        </nav>

        <div className="side-label analytics-label">ANALYTICS</div>

        <nav className="side-nav">
          <a className="side-link" href="#analytics">
            <BarChart3 /> Reports
          </a>
          <a className="side-link" href="#settings">
            <Settings /> Settings
          </a>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">SP</div>
          <div>
            <strong>StockPilot Admin</strong>
            <small>Administrator</small>
          </div>
        </div>
      </aside>

      <main className="dashboard-main" id="overview">
        <header className="dashboard-header">
          <div className="header-brand-mobile">StockPilot</div>
          <div className="header-date">{today}</div>

          <div className="header-tools">
            <button className="header-icon" title="Search">
              <Search size={17} />
            </button>
            <button className="header-icon" title="Notifications">
              <Bell size={17} />
            </button>
            <button
              className="refresh-button"
              onClick={fetchDashboardData}
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <CreateStockMovementDialog
              onMovementAdded={fetchDashboardData}
              triggerLabel="Stock In"
            />

            <div className="user-avatar">SP</div>
          </div>
        </header>

        <section className="welcome-row">
          <div>
            <h1>Inventory Dashboard</h1>
            <p>
              Monitor your stock, warehouses and inventory movements.
            </p>
          </div>

          <div className="online-status">
            <span /> System Online
          </div>
        </section>

        <section className="stat-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article className="stat-card" key={stat.title}>
                <div className="stat-card-heading">
                  <span>{stat.title}</span>
                  <div className={`stat-icon ${stat.color}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <strong>
                  {loading ? "—" : stat.value}
                </strong>

                <small>Live database data</small>
              </article>
            );
          })}
        </section>

        <section className="analytics-grid">
          <article className="chart-card inventory-chart">
            <div className="card-heading">
              <div>
                <h2>Inventory Movement</h2>
                <p>Restock and sales activity over time</p>
              </div>
              <span className="chart-tag">Last 10 dates</span>
            </div>

            <div className="chart-legend">
              <span>
                <i className="legend-green" /> Restock
              </span>
              <span>
                <i className="legend-orange" /> Sales
              </span>
            </div>

            <div className="chart-area">
              {trendData.length === 0 ? (
                <div className="chart-empty">
                  Movement history will appear here.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient
                        id="inboundFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#24ce80"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#24ce80"
                          stopOpacity={0}
                        />
                      </linearGradient>

                      <linearGradient
                        id="outboundFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f28b45"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f28b45"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#e9edf3"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#657087", fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: "#657087", fontSize: 10 }}
                    />
                    <Tooltip />

                    <Area
                      type="monotone"
                      dataKey="inbound"
                      name="Restock"
                      stroke="#20bd78"
                      fill="url(#inboundFill)"
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="outbound"
                      name="Sales"
                      stroke="#ef8744"
                      fill="url(#outboundFill)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="chart-card warehouse-chart" id="warehouses">
            <div className="card-heading">
              <div>
                <h2>Stock by Warehouse</h2>
                <p>Recorded quantity distribution</p>
              </div>
            </div>

            {warehouseData.length === 0 ? (
              <div className="chart-empty">
                Warehouse movement data will appear here.
              </div>
            ) : (
              <>
                <div className="donut-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={warehouseData}
                        dataKey="stock"
                        nameKey="name"
                        innerRadius="57%"
                        outerRadius="82%"
                        paddingAngle={3}
                      >
                        {warehouseData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="warehouse-legend">
                  {warehouseData.map((entry, index) => (
                    <div key={entry.name}>
                      <span>
                        <i
                          style={{
                            background: COLORS[index % COLORS.length],
                          }}
                        />
                        {entry.name}
                      </span>
                      <strong>{entry.stock}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>

          <article className="chart-card warehouse-summary">
            <div className="card-heading">
              <div>
                <h2>Warehouse Summary</h2>
                <p>Storage locations overview</p>
              </div>
              <WarehouseIcon size={19} />
            </div>

            <div className="summary-number">
              {warehouses.length}
              <small> warehouses</small>
            </div>

            <div className="summary-details">
              <span>
                <i className="legend-green" /> {totalStock} net units on hand
              </span>
              <span>
                <i className="legend-blue" /> {lowStock.length} low-stock alerts
              </span>
            </div>
          </article>

          <article className="chart-card quick-actions">
            <div className="card-heading">
              <div>
                <h2>Quick Actions</h2>
                <p>Manage your inventory</p>
              </div>
              <Activity size={19} />
            </div>

            <div className="quick-action-buttons">
              <CreateItemDialog onItemAdded={fetchDashboardData} />
              <CreateStockMovementDialog
                onMovementAdded={fetchDashboardData}
              />
              <CreateSupplierDialog
                onSupplierAdded={fetchDashboardData}
              />
              <CreateWarehouseDialog
                onWarehouseAdded={fetchDashboardData}
              />
            </div>
          </article>

          <article className="chart-card movement-chart" id="analytics">
            <div className="card-heading">
              <div>
                <h2>Stock Movement Trends</h2>
                <p>Inbound and outbound quantities</p>
              </div>
            </div>

            <div className="small-chart">
              {trendData.length === 0 ? (
                <div className="chart-empty">
                  No movement data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} barGap={5}>
                    <CartesianGrid stroke="#e9edf3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "#657087" }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#657087" }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="inbound"
                      name="Restock"
                      fill="#25c77e"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="outbound"
                      name="Sales"
                      fill="#f28b45"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="chart-card top-products">
            <div className="card-heading">
              <div>
                <h2>Top Selling Products</h2>
                <p>Units sold only</p>
              </div>
            </div>

            {topSellingProducts.length === 0 ? (
              <div className="chart-empty">
                Sales data will appear here.
              </div>
            ) : (
              <div className="top-product-list">
                {topSellingProducts.map((product, index) => (
                  <div className="top-product-row" key={product.name}>
                    <span className="product-rank">{index + 1}</span>
                    <span className="product-name">{product.name}</span>
                    <strong>{product.quantity}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="chart-card top-products">
            <div className="card-heading">
              <div>
                <h2>Top Restocked Products</h2>
                <p>Units received only</p>
              </div>
            </div>

            {topRestockedProducts.length === 0 ? (
              <div className="chart-empty">
                Restock data will appear here.
              </div>
            ) : (
              <div className="top-product-list">
                {topRestockedProducts.map((product, index) => (
                  <div className="top-product-row" key={product.name}>
                    <span className="product-rank">{index + 1}</span>
                    <span className="product-name">{product.name}</span>
                    <strong>{product.quantity}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="chart-card top-products">
            <div className="card-heading">
              <div>
                <h2>Current Stock</h2>
                <p>Net recorded units on hand</p>
              </div>
            </div>

            {currentStockProducts.length === 0 ? (
              <div className="chart-empty">
                Stock data will appear here.
              </div>
            ) : (
              <div className="top-product-list">
                {currentStockProducts.map((product, index) => (
                  <div className="top-product-row" key={product.name}>
                    <span className="product-rank">{index + 1}</span>
                    <span className="product-name">{product.name}</span>
                    <strong>{product.quantity}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="chart-card low-stock-card">
            <div className="card-heading">
              <div>
                <h2>Low Stock Alerts</h2>
                <p>Items requiring attention</p>
              </div>
              <span className="alert-badge">{lowStock.length}</span>
            </div>

            {lowStock.slice(0, 4).map((item, index) => (
              <div
                className="alert-row"
                key={`${item.item_name}-${item.warehouse_name}-${index}`}
              >
                <AlertTriangle size={17} />
                <div>
                  <strong>{item.item_name}</strong>
                  <small>{item.warehouse_name}</small>
                </div>
                <span>
                  {item.current_stock} / {item.reorder_threshold}
                </span>
              </div>
            ))}

            {lowStock.length === 0 && (
              <div className="chart-empty">
                No low-stock alerts.
              </div>
            )}

            <LowStockDialog />
          </article>

          <article className="chart-card activity-card" id="activity">
            <div className="card-heading">
              <div>
                <h2>Recent Stock Activity</h2>
                <p>Latest inventory transactions</p>
              </div>
              <span>{movements.length} records</span>
            </div>

            <div className="activity-table">
              {movements.length === 0 ? (
                <div className="chart-empty">
                  No movements recorded.
                </div>
              ) : (
                <StockMovementTable
                  movements={movements.slice(0, 8)}
                />
              )}
            </div>
          </article>
        </section>

        <InventoryPage onItemsChanged={fetchDashboardData} />

        <SuppliersPage onSuppliersChanged={fetchDashboardData} />

        <WarehouseInventoryPage />

        <footer className="dashboard-footer">
          StockPilot · Inventory Management System
        </footer>
      </main>
    </div>
  );
}

export default App;
