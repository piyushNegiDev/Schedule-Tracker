const express = require("express");
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  replaceMonth,
} = require("../controllers/eventController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", getEvents);
router.post("/", createEvent);
router.put("/month/:month", replaceMonth);
router.patch("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
