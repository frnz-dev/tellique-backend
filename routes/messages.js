const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// POST /api/messages - send a message
router.post("/", async (req, res) => {
  const { from, to, nickname, content } = req.body;

  if (!from || !to || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const message = new Message({
    from,
    to,
    nickname: nickname || "Anonymous",
    content,
    date: new Date().toLocaleString()
  });

  try {
    await message.save();
    res.status(200).json({ message: "Message sent!" });
  } catch (err) {
    res.status(500).json({ error: "Error saving message" });
  }
});

// GET /api/messages/inbox/:username - get inbox messages
router.get("/inbox/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const inbox = await Message.find({ to: username }).sort({ date: -1 });
    res.json(inbox);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

// GET /api/messages/sent/:username - get sent messages
router.get("/sent/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const sent = await Message.find({ from: username }).sort({ date: -1 });
    res.json(sent);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sent messages" });
  }
});

module.exports = router;
