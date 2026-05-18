const jwt = require("jsonwebtoken");
const { get } = require("../data/db");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_taskflow";

const authMiddleware = async (req, res, next) => {
  // Get token from header
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token, authorization denied" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user actually exists in the database
    const user = await get("SELECT * FROM users WHERE id = ?", [decoded.id]);
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    // Attach full user object to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Token is not valid" });
  }
};

module.exports = authMiddleware;
