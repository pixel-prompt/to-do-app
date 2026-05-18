const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_taskflow";

const authMiddleware = (req, res, next) => {
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
    const users = require("../data/users");
    const userExists = users.find(u => u.id === decoded.id);
    if (!userExists) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    // Attach user payload to request object
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Token is not valid" });
  }
};

module.exports = authMiddleware;
