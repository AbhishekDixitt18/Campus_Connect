const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const { initializeOraclePool, closeOraclePool, formatOracleError } = require("./config/oracle");

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3000,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: "oracle" });
});

app.use("/api/auth", authRoutes);
app.use("/api", eventRoutes);

app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  return res.status(500).json({
    message: "Internal server error.",
    error: formatOracleError(error)
  });
});

async function start() {
  try {
    await initializeOraclePool();
    app.listen(port, () => {
      console.log(`Campus Connect Oracle API running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

process.on("SIGINT", async () => {
  await closeOraclePool().catch(() => {});
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeOraclePool().catch(() => {});
  process.exit(0);
});