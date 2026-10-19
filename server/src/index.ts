import "./env.js";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { api } from "./api.js";
import { authRouter, requireAuth } from "./auth.js";
import { coachRouter } from "./coach.js";
import "./db.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/coach", requireAuth, coachRouter);
app.use("/api", requireAuth, api);

// In production the server also serves the built React app.
const clientDist = path.resolve(process.env.CLIENT_DIST ?? "../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Ascend server listening on http://localhost:${port}`));
