const { run, get, all } = require("../data/db");

// ─────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    // Get all users with their total tasks count
    const users = await all(`
      SELECT u.id, u.firstname, u.lastname, u.username, u.email, u.role, u.createdAt, u.avatar,
      (SELECT COUNT(*) FROM todos WHERE userId = u.id) as taskCount
      FROM users u
      ORDER BY u.createdAt DESC
    `);
    
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/admin/users/:id
// ─────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    }

    const user = await get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // SQLite FOREIGN KEY ON DELETE CASCADE will delete their tasks automatically if enabled
    // But let's explicitly delete tasks to be safe, just in case PRAGMA foreign_keys is off
    await run("DELETE FROM todos WHERE userId = ?", [id]);
    await run("DELETE FROM users WHERE id = ?", [id]);

    res.status(200).json({ success: true, message: "User and associated tasks deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/admin/users/:id/role
// ─────────────────────────────────────────────
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role. Must be 'user' or 'admin'" });
    }

    // Prevent admin from demoting themselves
    if (id === req.user.id && role === 'user') {
      return res.status(400).json({ success: false, message: "Cannot demote your own account" });
    }

    const user = await get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await run("UPDATE users SET role = ? WHERE id = ?", [role, id]);

    res.status(200).json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  updateUserRole
};
