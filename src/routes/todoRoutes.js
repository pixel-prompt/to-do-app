const express = require("express");
const router = express.Router();
const {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  clearCompleted,
} = require("../controllers/todoController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply middleware to all todo routes
router.use(authMiddleware);

// ── Collection routes ────────────────────────
router.get("/", getAllTodos);          // GET    /api/todos
router.post("/", createTodo);          // POST   /api/todos
router.delete("/clear", clearCompleted); // DELETE /api/todos/clear

// ── Individual item routes ───────────────────
router.get("/:id", getTodoById);       // GET    /api/todos/:id
router.put("/:id", updateTodo);        // PUT    /api/todos/:id
router.patch("/:id/toggle", toggleTodo); // PATCH  /api/todos/:id/toggle
router.delete("/:id", deleteTodo);     // DELETE /api/todos/:id

module.exports = router;
