const adminMiddleware = (req, res, next) => {
  // authMiddleware should have run first, populating req.user
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
  }

  next();
};

module.exports = adminMiddleware;
