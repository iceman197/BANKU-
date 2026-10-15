import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "uploads"));
const MAX_APK_BYTES = 150 * 1024 * 1024;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

const allowedPhones = (process.env.ADMIN_PHONES || "+233550381372,+233545274761")
  .split(",").map(x => x.trim()).filter(Boolean);
const sessions = new Map();
const online = new Map();
const apkMetaFile = path.join(UPLOAD_DIR, "apk-metadata.json");
function loadApks() {
  try { return JSON.parse(fs.readFileSync(apkMetaFile, "utf8")); } catch { return []; }
}
let apks = loadApks();
function saveApks() {
  const tmp = apkMetaFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(apks, null, 2));
  fs.renameSync(tmp, apkMetaFile);
}
function cleanExpired() {
  const cutoff = Date.now() - 90_000;
  for (const [id, last] of online) if (last < cutoff) online.delete(id);
  for (const [token, info] of sessions) if (info.expires < Date.now()) sessions.delete(token);
}
function getSession(req) {
  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
  const info = sessions.get(token);
  if (!info || info.expires < Date.now()) return null;
  return { token, ...info };
}
function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Owner sign-in required." });
  req.admin = session;
  next();
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "app.apk";
      cb(null, `${Date.now()}-${crypto.randomBytes(5).toString("hex")}-${safe}`);
    }
  }),
  limits: { fileSize: MAX_APK_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".apk") return cb(new Error("Only .apk files are allowed."));
    cb(null, true);
  }
});

app.get("/api/health", (_req, res) => {
  cleanExpired();
  res.json({
    ok: true,
    service: "ICEMAN CODE LEARN",
    serverTime: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    onlineCount: online.size,
    apkCount: apks.length,
    storageConfigured: Boolean(process.env.UPLOAD_DIR),
    uptimeSeconds: Math.floor(process.uptime())
  });
});
app.post("/api/heartbeat", (req, res) => {
  let id = String(req.body?.visitorId || "");
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(id)) id = crypto.randomBytes(16).toString("hex");
  online.set(id, Date.now());
  cleanExpired();
  res.json({ visitorId: id, onlineCount: online.size, expiresInSeconds: 90 });
});
app.post("/api/admin/login", loginLimiter, (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  const password = String(req.body?.password || "");
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: "Owner sign-in is not configured. Set ADMIN_PASSWORD in Render Environment." });
  if (!allowedPhones.includes(phone) || !crypto.timingSafeEqual(
    Buffer.from(crypto.createHash("sha256").update(password).digest()),
    Buffer.from(crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD).digest())
  )) return res.status(401).json({ error: "Phone number or password is incorrect." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { phone, expires: Date.now() + 8 * 60 * 60 * 1000 });
  res.json({ token, phone, expiresInSeconds: 28800 });
});
app.post("/api/admin/logout", (req, res) => {
  const session = getSession(req);
  if (session) sessions.delete(session.token);
  res.json({ ok: true });
});
app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ phone: req.admin.phone }));

app.get("/api/apks", (_req, res) => {
  res.json(apks.map(({ id, name, size, uploadedAt, description }) => ({ id, name, size, uploadedAt, description })));
});
app.post("/api/admin/apks", requireAdmin, (req, res, next) => {
  upload.single("apk")(req, res, err => {
    if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.message || "Upload failed." });
    try {
      if (!req.file) return res.status(400).json({ error: "Choose an APK file." });
      const entry = {
        id: crypto.randomBytes(12).toString("hex"),
        name: path.basename(req.file.originalname).slice(0, 140),
        storedName: req.file.filename,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        description: String(req.body?.description || "").slice(0, 500)
      };
      apks.unshift(entry);
      saveApks();
      res.status(201).json({ ok: true, apk: { id: entry.id, name: entry.name, size: entry.size, uploadedAt: entry.uploadedAt, description: entry.description } });
    } catch (e) { next(e); }
  });
});
app.get("/api/apks/:id/download", (req, res) => {
  const item = apks.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "APK not found." });
  const file = path.join(UPLOAD_DIR, item.storedName);
  if (!fs.existsSync(file)) return res.status(410).json({ error: "File missing from storage. Owner may need to upload it again." });
  res.download(file, item.name);
});
app.delete("/api/admin/apks/:id", requireAdmin, (req, res) => {
  const i = apks.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "APK not found." });
  const [item] = apks.splice(i, 1);
  try { fs.unlinkSync(path.join(UPLOAD_DIR, item.storedName)); } catch {}
  saveApks();
  res.json({ ok: true });
});

app.post("/api/ai/:tool", aiLimiter, async (req, res) => {
  const tool = String(req.params.tool || "");
  const instructions = {
    assistant: "You are ICEMAN AI Assistant, a helpful general-purpose assistant. Be honest about limits.",
    builder: "You are ICEMAN AI Builder. Help create, debug, explain, and improve code. Provide complete runnable examples when appropriate.",
    teacher: "You are ICEMAN AI Teacher. Teach beginners step by step, explain errors kindly, and include small exercises.",
    github: "You are ICEMAN GitHub Source Code Reader AI. Analyze only repository details or source text the user provides. Do not claim to have opened a URL unless its contents are provided. Explain setup, dependencies, likely bugs, and security risks."
  };
  if (!instructions[tool]) return res.status(404).json({ error: "Unknown AI tool." });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "Gemini is not connected yet. Add GEMINI_API_KEY in Render → Environment, then redeploy/restart the service." });
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Enter a question or prompt." });
  if (prompt.length > 20000) return res.status(413).json({ error: "Prompt is too long (20,000 characters maximum)." });
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash", systemInstruction: instructions[tool] });
    const result = await model.generateContent(prompt);
    res.json({ text: result.response.text(), model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
  } catch (e) {
    console.error("Gemini request failed:", e?.message || e);
    res.status(502).json({ error: "Gemini request failed. Check your API key, model availability, quota, and Render logs." });
  }
});
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((err, _req, res, _next) => {
  console.error("Server error:", err?.message || err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Server error. Check Render logs for details." });
});
app.listen(PORT, "0.0.0.0", () => console.log(`ICEMAN CODE LEARN listening on port ${PORT}`));
