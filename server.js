console.log("🔥 Server is starting...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

console.log("🧪 MONGO_URI:", process.env.MONGO_URI); // Debug log

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

app.get("/test", (req, res) => {
  res.json({ message: "🎉 Connected to MongoDB Cloud!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Catch errors
process.on("unhandledRejection", (err) => {
  console.error("🛑 Unhandled Rejection:", err.message);
});
