console.log("🔥 Server is starting...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug connection string (optional)
console.log("🧪 MONGO_URI:", process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
const messageRoutes = require("./routes/messages");
app.use("/api/messages", messageRoutes);

// Root route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.send("✅ Tellique Backend is Live!");
});

// Test route for checking MongoDB status
app.get("/test", (req, res) => {
  res.json({ message: "🎉 Connected to MongoDB Cloud!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("🛑 Unhandled Rejection:", err.message);
});
