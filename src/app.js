const express = require("express");
const cors = require("cors");
const path = require("path");
const todoRoutes = require("./routes/todoRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// ── Middleware ────────────────────────────────
app.use(cors());                          // Allow all origins (for Postman & frontend)
app.use(express.json({ limit: '5mb' }));  // Parse JSON request bodies (increased for Base64 avatars)
app.use(express.urlencoded({ extended: true, limit: '5mb' })); // Parse URL-encoded bodies

// ── Request logger (dev helper) ───────────────
app.use((req, _res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}]  ${req.method.padEnd(6)} ${req.originalUrl}`);
  next();
});

// ── Static Frontend ───────────────────────────
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Routes ────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);

// ── Health check (API only) ───────────────────
app.get("/api", (req, res) => {
  res.json({ success: true, message: "📝 To-Do API is running", version: "1.0.0" });
});

// ── 404 handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route '${req.method} ${req.originalUrl}' not found`,
  });
});

// ── Global error handler ──────────────────────
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error", error: err.message });
});

module.exports = app;
