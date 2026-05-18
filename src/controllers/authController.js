const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { run, get } = require("../data/db");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_taskflow";

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { firstname, lastname, username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    // Check if user exists
    const userExists = await get("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
    if (userExists) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const role = username.toLowerCase() === "admin" ? "admin" : "user";
    
    await run(
      "INSERT INTO users (id, firstname, lastname, username, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, firstname || "", lastname || "", username, email || "", hashedPassword, role, createdAt]
    );

    // Create JWT
    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });

    const userResponse = { id, firstname, lastname, username, email, role, createdAt };

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    // Find user
    const user = await get("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", [username]);
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    const userResponse = { ...user };
    delete userResponse.password;

    res.status(200).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    delete user.password;

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { firstname, lastname, email, password, avatar } = req.body;
    
    const user = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let query = "UPDATE users SET ";
    let params = [];
    let updates = [];

    if (firstname !== undefined) { updates.push("firstname = ?"); params.push(firstname.trim()); }
    if (lastname !== undefined) { updates.push("lastname = ?"); params.push(lastname.trim()); }
    if (email !== undefined) { updates.push("email = ?"); params.push(email.trim()); }
    if (avatar !== undefined) { updates.push("avatar = ?"); params.push(avatar); }
    
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push("password = ?");
      params.push(hashedPassword);
    }

    if (updates.length > 0) {
      query += updates.join(", ") + " WHERE id = ?";
      params.push(req.user.id);
      await run(query, params);
    }

    const updatedUser = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    delete updatedUser.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
