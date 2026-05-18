const { v4: uuidv4 } = require("uuid");
let todos = require("../data/todos");

// ─────────────────────────────────────────────
// GET /api/todos  → Get all todos (with optional filter)
// ─────────────────────────────────────────────
const getAllTodos = (req, res) => {
  try {
    let result = todos.filter(t => t.userId === req.user.id);

    // Filter by completed status  e.g. ?completed=true
    if (req.query.completed !== undefined) {
      const isCompleted = req.query.completed === "true";
      result = result.filter((t) => t.completed === isCompleted);
    }

    // Filter by priority  e.g. ?priority=high
    if (req.query.priority) {
      result = result.filter((t) => t.priority === req.query.priority);
    }

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/todos/:id  → Get a single todo by ID
// ─────────────────────────────────────────────
const getTodoById = (req, res) => {
  try {
    const todo = todos.find((t) => t.id === req.params.id && t.userId === req.user.id);
    if (!todo) {
      return res.status(404).json({ success: false, message: `Todo with id '${req.params.id}' not found` });
    }
    res.status(200).json({ success: true, data: todo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/todos  → Create a new todo
// ─────────────────────────────────────────────
const createTodo = (req, res) => {
  try {
    const { title, description, priority, category, dueDate } = req.body;

    // Validation
    if (!title || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const validPriorities = ["low", "medium", "high"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Priority must be one of: ${validPriorities.join(", ")}`,
      });
    }

    const newTodo = {
      id: uuidv4(),
      title: title.trim(),
      description: description ? description.trim() : "",
      completed: false,
      priority: priority || "medium",
      category: category || "",
      dueDate: dueDate || "",
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    todos.push(newTodo);

    res.status(201).json({
      success: true,
      message: "Todo created successfully",
      data: newTodo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/todos/:id  → Fully update a todo
// ─────────────────────────────────────────────
const updateTodo = (req, res) => {
  try {
    const index = todos.findIndex((t) => t.id === req.params.id && t.userId === req.user.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: `Todo with id '${req.params.id}' not found` });
    }

    const { title, description, completed, priority, category, dueDate } = req.body;

    if (title !== undefined && title.trim() === "") {
      return res.status(400).json({ success: false, message: "Title cannot be empty" });
    }

    const validPriorities = ["low", "medium", "high"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Priority must be one of: ${validPriorities.join(", ")}`,
      });
    }

    const updated = {
      ...todos[index],
      title: title !== undefined ? title.trim() : todos[index].title,
      description: description !== undefined ? description.trim() : todos[index].description,
      completed: completed !== undefined ? Boolean(completed) : todos[index].completed,
      priority: priority || todos[index].priority,
      category: category !== undefined ? category : todos[index].category,
      dueDate: dueDate !== undefined ? dueDate : todos[index].dueDate,
      updatedAt: new Date().toISOString(),
    };

    todos[index] = updated;

    res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/todos/:id/toggle  → Toggle completed status
// ─────────────────────────────────────────────
const toggleTodo = (req, res) => {
  try {
    const index = todos.findIndex((t) => t.id === req.params.id && t.userId === req.user.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: `Todo with id '${req.params.id}' not found` });
    }

    todos[index].completed = !todos[index].completed;
    todos[index].updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: `Todo marked as ${todos[index].completed ? "completed" : "incomplete"}`,
      data: todos[index],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/todos/:id  → Delete a todo
// ─────────────────────────────────────────────
const deleteTodo = (req, res) => {
  try {
    const index = todos.findIndex((t) => t.id === req.params.id && t.userId === req.user.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: `Todo with id '${req.params.id}' not found` });
    }

    const deleted = todos.splice(index, 1)[0];

    res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
      data: deleted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/todos  → Delete ALL completed todos
// ─────────────────────────────────────────────
const clearCompleted = (req, res) => {
  try {
    const userTodos = todos.filter((t) => t.userId === req.user.id);
    const otherTodos = todos.filter((t) => t.userId !== req.user.id);
    const activeUserTodos = userTodos.filter((t) => !t.completed);
    
    todos = [...otherTodos, ...activeUserTodos];
    
    // Update reference in data store
    require("../data/todos").length = 0;
    todos.forEach((t) => require("../data/todos").push(t));

    res.status(200).json({
      success: true,
      message: `Cleared ${userTodos.length - activeUserTodos.length} completed todo(s)`,
      data: activeUserTodos,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  clearCompleted,
};
