import express from "express";
import { corsMiddleware } from "./middlewares/cors";
import { errorHandler } from "./middlewares/errorHandler";
import { rawgRoutes } from "./routes/rawg.routes";
import { reviewsRoutes } from "./routes/reviews.routes";
import { rankingsRoutes } from "./routes/rankings.routes";
import { profileRoutes } from "./routes/profile.routes";
import { notificationsRoutes } from "./routes/notifications.routes";
import { adminRoutes } from "./routes/admin.routes";
import { followsRoutes } from "./routes/follows.routes";

export const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/rawg", rawgRoutes);
app.use("/reviews", reviewsRoutes);
app.use("/rankings", rankingsRoutes);
app.use("/profile", profileRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/admin", adminRoutes);
app.use("/follows", followsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);
