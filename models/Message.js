const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  nickname: { type: String, default: "Anonymous" },
  content: { type: String, required: true },
  date: { type: String, required: true } // Store formatted date string
});

module.exports = mongoose.model("Message", MessageSchema);

