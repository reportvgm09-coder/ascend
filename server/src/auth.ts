import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getKV, setKV } from "./db.js";

const COOKIE = "ascend_session";
const isProd = process.env.NODE_ENV === "production";

function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  let secret = getKV<string | null>("jwt_secret", null);
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    setKV("jwt_secret", secret);
  }
  return secret;
}

// APP_PASSWORD (if set) always wins, so a deployed instance can never be claimed by a stranger.
if (process.env.APP_PASSWORD) {
  setKV("password_hash", bcrypt.hashSync(process.env.APP_PASSWORD, 10));
}

const passwordHash = () => getKV<string | null>("password_hash", null);

function issue(res: Response) {
  const token = jwt.sign({ sub: "owner" }, jwtSecret(), { expiresIn: "30d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 30 * 86_400_000,
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    jwt.verify(req.cookies?.[COOKIE] ?? "", jwtSecret());
    next();
  } catch {
    res.status(401).json({ error: "Not signed in" });
  }
}

// Simple in-memory brute-force protection: 10 failed attempts per 15 minutes per IP.
const failures = new Map<string, { count: number; until: number }>();
function tooMany(ip: string) {
  const f = failures.get(ip);
  return f && f.count >= 10 && Date.now() < f.until;
}
function recordFailure(ip: string) {
  const f = failures.get(ip);
  const fresh = !f || Date.now() > f.until;
  failures.set(ip, { count: fresh ? 1 : f.count + 1, until: Date.now() + 15 * 60_000 });
}

const passwordSchema = z.object({ password: z.string().min(8, "Use at least 8 characters") });

export const authRouter = Router();

authRouter.get("/status", (req, res) => {
  let authed = false;
  try {
    jwt.verify(req.cookies?.[COOKIE] ?? "", jwtSecret());
    authed = true;
  } catch {}
  // In production without APP_PASSWORD, first-run setup is disabled for safety.
  const canSetup = !passwordHash() && !isProd;
  res.json({ authed, needsSetup: !passwordHash(), canSetup });
});

authRouter.post("/setup", (req, res) => {
  if (passwordHash()) return res.status(409).json({ error: "Already set up" });
  if (isProd) return res.status(403).json({ error: "Set the APP_PASSWORD environment variable on your server." });
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  setKV("password_hash", bcrypt.hashSync(parsed.data.password, 10));
  issue(res);
  res.json({ ok: true });
});

authRouter.post("/login", (req, res) => {
  const ip = req.ip ?? "unknown";
  if (tooMany(ip)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const hash = passwordHash();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!hash || !bcrypt.compareSync(password, hash)) {
    recordFailure(ip);
    return res.status(401).json({ error: "Wrong password" });
  }
  failures.delete(ip);
  issue(res);
  res.json({ ok: true });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.post("/password", requireAuth, (req, res) => {
  if (process.env.APP_PASSWORD) return res.status(400).json({ error: "Password is managed by the APP_PASSWORD environment variable." });
  const hash = passwordHash();
  if (!hash || !bcrypt.compareSync(String(req.body?.current ?? ""), hash)) return res.status(401).json({ error: "Current password is wrong" });
  const parsed = passwordSchema.safeParse({ password: req.body?.next });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  setKV("password_hash", bcrypt.hashSync(parsed.data.password, 10));
  res.json({ ok: true });
});
