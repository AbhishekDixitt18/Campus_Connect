const express = require("express");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { getEvents, postEvent, registerEvent, getUserEvents } = require("../controllers/eventController");

const router = express.Router();

router.get("/events", getEvents);
router.post("/events", authenticateToken, requireRole("organizer"), postEvent);
router.post("/events/register", authenticateToken, requireRole("student"), registerEvent);
router.get("/users/events", authenticateToken, getUserEvents);

module.exports = router;