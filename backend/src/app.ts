import express from "express";
import cors from "cors";

import connectDB from './config/db';

const app = express();

// ✅ Connect to the database
connectDB();

// ✅ Middleware
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

export default app;