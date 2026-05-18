const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
let users = require("../data/users");

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
    const userExists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (userExists) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = {
      id: uuidv4(),
      firstname: firstname || "",
      lastname: lastname || "",
      username,
      email: email || "",
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Create JWT
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    // Remove password from response
    const userResponse = { ...newUser };
    delete userResponse.password;

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
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
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
const getProfile = (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userResponse = { ...user };
    delete userResponse.password;

    res.status(200).json({
      success: true,
      user: userResponse
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
    const index = users.findIndex(u => u.id === req.user.id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (firstname !== undefined) users[index].firstname = firstname.trim();
    if (lastname !== undefined) users[index].lastname = lastname.trim();
    if (email !== undefined) users[index].email = email.trim();
    if (avatar !== undefined) users[index].avatar = avatar; // Save base64 avatar
    
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      users[index].password = await bcrypt.hash(password, salt);
    }

    const userResponse = { ...users[index] };
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse
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
