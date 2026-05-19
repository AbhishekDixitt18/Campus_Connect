const express = require("express");
const { register, login, getProfile, updateProfile } = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Routes are mounted under /api/auth
// Inject authService middleware
router.use((req, res, next) => {
  req.authService = req.app.locals.authService;
  next();
});

/**
 * Public routes
 */
router.post("/register", (req, res) => register(req, res, req.authService));
router.post("/login", (req, res) => login(req, res, req.authService));

/**
 * Protected routes
 */
router.get("/profile", authenticateToken, (req, res) => getProfile(req, res, req.authService));
router.patch("/profile", authenticateToken, (req, res) => updateProfile(req, res, req.authService));

module.exports = router;