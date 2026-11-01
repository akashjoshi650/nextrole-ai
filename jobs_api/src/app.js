import cors from "cors";
import express from "express";
import jobsRouter from "./routes/jobs.js";

const app = express();
app.disable("x-powered-by");

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/jobs", jobsRouter);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Errors thrown in any route end up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
