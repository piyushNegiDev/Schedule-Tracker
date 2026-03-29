const express = require("express");
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  replaceMonth,
} = require("../controllers/eventController");
const { protect } = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.use(protect);
router.get("/", asyncHandler(getEvents));
router.post("/", asyncHandler(createEvent));
router.put("/month/:month", asyncHandler(replaceMonth));
router.patch("/:id", asyncHandler(updateEvent));
router.delete("/:id", asyncHandler(deleteEvent));

module.exports = router;
