const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User"); // ✅ import User model

// ✅ POST /api/messages - send a message
router.post("/", async (req, res) => {
  const { from, to, nickname, content } = req.body;

  if (!from || !to || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // ✅ Get sender's avatar (if available)
    const sender = await User.findOne({ username: from });
const senderAvatar = sender?.profilePic || "";

const message = new Message({
  from,
  to,
  nickname: nickname || "Anonymous",
  content,
  date: new Date().toLocaleString(),
  senderAvatar   // ✅ add here
});


    await message.save();
    res.status(201).json({ success: true, message: "Message sent!" });
  } catch (err) {
    console.error("❌ Error saving message:", err);
    res.status(500).json({ error: "Server error while sending message" });
  }
});

// ✅ GET /api/messages/inbox/:username - fetch inbox
router.get("/inbox/:username", async (req, res) => {
  try {
    const inbox = await Message.find({ to: req.params.username }).sort({ date: -1 });
    res.status(200).json(inbox);
  } catch (err) {
    console.error("❌ Inbox fetch error:", err);
    res.status(500).json({ error: "Failed to fetch inbox messages" });
  }
});

// ✅ GET /api/messages/sent/:username - fetch sent messages
router.get("/sent/:username", async (req, res) => {
  try {
    const sent = await Message.find({ from: req.params.username }).sort({ date: -1 });
    res.status(200).json(sent);
  } catch (err) {
    console.error("❌ Sent fetch error:", err);
    res.status(500).json({ error: "Failed to fetch sent messages" });
  }
});

module.exports = router;
