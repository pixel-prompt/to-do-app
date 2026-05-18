const express = require("express");
const router = express.Router();

const { getAllUsers, deleteUser, updateUserRole } = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(adminMiddleware);

router.route("/users")
  .get(getAllUsers);

router.route("/users/:id")
  .delete(deleteUser);

router.route("/users/:id/role")
  .put(updateUserRole);

module.exports = router;
