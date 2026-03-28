const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function validateAuthInput(email, password) {
  if (!email || !password) {
    return "Email and password are required.";
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedPassword = String(password);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }

  if (trimmedPassword.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  return "";
}

async function signup(req, res) {
  const { email, password } = req.body;
  const validationMessage = validateAuthInput(email, password);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: "An account with that email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
  });

  return res.status(201).json({
    token: createToken(user),
    user: {
      id: user._id,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  return res.json({
    token: createToken(user),
    user: {
      id: user._id,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}

async function me(req, res) {
  return res.json({
    user: {
      id: req.userId,
      email: req.userEmail,
    },
  });
}

module.exports = {
  signup,
  login,
  me,
};
