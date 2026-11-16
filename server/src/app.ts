
import express from "express";
import { pool } from "./config/dbConnect";
import { errfunction } from "./middleware/errorHandler";
import stockRoutes from "./routers/stockRoutes";
import itemsRoutes from "./routers/itemRoutes";
import warehousesRoutes from "./routers/warehouseRoutes";
import suppliersRoutes from "./routers/supplierRoutes";
import cors from "cors";
import { RowDataPacket } from "mysql2/promise";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/stock", stockRoutes);
app.use("/items", itemsRoutes);
app.use("/warehouses", warehousesRoutes);
app.use("/suppliers", suppliersRoutes);

// Error Handler
app.use(errfunction);

// Database connection check
const checkDatabase = async () => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT NOW() AS now"
        );

        console.log("MySQL connected successfully!");
        console.log("Database server time:", rows[0].now);
    } catch (error) {
        console.error("MySQL connection failed:", error);
    }
};

// Start server
app.listen(port, () => {
    console.log(`StockPilot server running on port ${port}`);
    checkDatabase();
});

export default app;
