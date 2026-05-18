const { v4: uuidv4 } = require("uuid");
const { run, get, all } = require("../data/db");

// ─────────────────────────────────────────────
// GET /api/todos
// ─────────────────────────────────────────────
const getAllTodos = async (req, res) => {
  try {
    const todos = await all("SELECT * FROM todos WHERE userId = ? ORDER BY createdAt DESC", [req.user.id]);
    res.status(200).json({ success: true, count: todos.length, data: todos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/todos/:id
// ─────────────────────────────────────────────
const getTodoById = async (req, res) => {
  try {
    const todo = await get("SELECT * FROM todos WHERE id = ? AND userId = ?", [req.params.id, req.user.id]);

    if (!todo) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.status(200).json({ success: true, data: todo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/todos
// ─────────────────────────────────────────────
const createTodo = async (req, res) => {
  try {
    const { title, description, priority, category, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Task title is required" });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    await run(
      "INSERT INTO todos (id, userId, title, description, completed, priority, category, dueDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, req.user.id, title, description || "", 0, priority || "medium", category || "", dueDate || "", createdAt, updatedAt]
    );

    const newTodo = await get("SELECT * FROM todos WHERE id = ?", [id]);

    res.status(201).json({ success: true, data: newTodo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/todos/:id
// ─────────────────────────────────────────────
const updateTodo = async (req, res) => {
  try {
    const todo = await get("SELECT * FROM todos WHERE id = ? AND userId = ?", [req.params.id, req.user.id]);

    if (!todo) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const { title, description, completed, priority, category, dueDate } = req.body;
    
    let query = "UPDATE todos SET ";
    let params = [];
    let updates = [];

    if (title !== undefined) { updates.push("title = ?"); params.push(title); }
    if (description !== undefined) { updates.push("description = ?"); params.push(description); }
    if (completed !== undefined) { updates.push("completed = ?"); params.push(completed ? 1 : 0); }
    if (priority !== undefined) { updates.push("priority = ?"); params.push(priority); }
    if (category !== undefined) { updates.push("category = ?"); params.push(category); }
    if (dueDate !== undefined) { updates.push("dueDate = ?"); params.push(dueDate); }
    
    updates.push("updatedAt = ?");
    params.push(new Date().toISOString());

    query += updates.join(", ") + " WHERE id = ? AND userId = ?";
    params.push(req.params.id, req.user.id);

    await run(query, params);

    const updatedTodo = await get("SELECT * FROM todos WHERE id = ?", [req.params.id]);

    res.status(200).json({ success: true, data: updatedTodo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/todos/:id
// ─────────────────────────────────────────────
const deleteTodo = async (req, res) => {
  try {
    const todo = await get("SELECT * FROM todos WHERE id = ? AND userId = ?", [req.params.id, req.user.id]);

    if (!todo) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await run("DELETE FROM todos WHERE id = ? AND userId = ?", [req.params.id, req.user.id]);

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/todos/:id/toggle
// ─────────────────────────────────────────────
const toggleTodo = async (req, res) => {
  try {
    const todo = await get("SELECT * FROM todos WHERE id = ? AND userId = ?", [req.params.id, req.user.id]);
    if (!todo) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const newCompleted = todo.completed === 1 ? 0 : 1;
    const updatedAt = new Date().toISOString();

    await run("UPDATE todos SET completed = ?, updatedAt = ? WHERE id = ? AND userId = ?", [newCompleted, updatedAt, req.params.id, req.user.id]);

    const updatedTodo = await get("SELECT * FROM todos WHERE id = ?", [req.params.id]);
    res.status(200).json({ success: true, data: updatedTodo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/todos/clear
// ─────────────────────────────────────────────
const clearCompleted = async (req, res) => {
  try {
    await run("DELETE FROM todos WHERE userId = ? AND completed = 1", [req.user.id]);
    res.status(200).json({ success: true, message: "Completed tasks cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  clearCompleted
};
