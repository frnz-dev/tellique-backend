const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Signup route
router.post("/signup", async (req, res) => {
  const { username, password, profilePic } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const newUser = new User({ username, password, profilePic });
  await newUser.save();
  res.status(200).json({ message: "User created successfully" });
});

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user || user.password !== password) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  res.status(200).json({ message: "Login successful" });
});

router.get("/profile/:username", async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ profilePic: user.profilePic });
});

router.put("/profile/:username", async (req, res) => {
  const { profilePic } = req.body;
  const user = await User.findOneAndUpdate(
    { username: req.params.username },
    { profilePic },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ message: "Profile updated", profilePic: user.profilePic });
});

module.exports = router;
