const express = require("express");
const { signup, login, me } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.get("/me", protect, asyncHandler(me));

module.exports = router;
