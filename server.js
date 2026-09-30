/* Give-Directly — tiny web server (no dependencies).
   - Serves the site.
   - PUBLIC:  GET /api/stories          (read-only)
   - ADMIN:   /api/admin/*              (needs the admin password + session cookie)
   Run:  ADMIN_PASSWORD="your-long-password" node server.js
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;

/* Load a small local .env file when present. Hostinger/production environment
   variables still take priority because existing process.env values are never
   overwritten. */
const ENV_FILE = path.join(ROOT, ".env");
if (fs.existsSync(ENV_FILE)) {
  try {
    fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/).forEach((line) => {
      const raw = line.trim();
      if (!raw || raw.startsWith("#")) return;
      const i = raw.indexOf("=");
      if (i < 1) return;
      const key = raw.slice(0, i).trim();
      let value = raw.slice(i + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    });
  } catch (_) {}
}

const DATA_FILE = path.join(ROOT, "data", "stories.json");
const UPLOAD_DIR = path.join(ROOT, "assets", "images", "stories");
const PORT = Number(process.env.PORT) || 3000;

let PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) {
  PASSWORD = crypto.randomBytes(9).toString("base64url");
  console.log("\n  ADMIN_PASSWORD is not set. A temporary password was generated for this run:");
  console.log("  " + PASSWORD);
  console.log('  For a permanent local password run: npm run setup-admin\n');
} else if (PASSWORD.length < 10) {
  console.log("\n  Warning: ADMIN_PASSWORD is short. Use at least 12 characters.\n");
}

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

/* ---------- helpers ---------- */
const readStories = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return [];
  }
};
const writeStories = (list) => {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, DATA_FILE);
};

const send = (res, code, obj, headers = {}) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(body);
};

const readBody = (req, limit) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("too large"), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(Object.assign(new Error("bad json"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });

/* ---------- sessions & login throttling ---------- */
const SESSION_MS = 8 * 60 * 60 * 1000;
const sessions = new Map(); // token -> expiry
const attempts = new Map(); // ip -> {count, reset}

const parseCookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((p) => p[0])
      .map(([k, ...v]) => [k, v.join("=")]),
  );
const isAdmin = (req) => {
  const t = parseCookies(req).gd_admin;
  const exp = t && sessions.get(t);
  if (!exp) return false;
  if (exp < Date.now()) {
    sessions.delete(t);
    return false;
  }
  return true;
};
const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};
const cookie = (req, value, maxAge) => {
  const secure = req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
  return `gd_admin=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
};

/* ---------- validation ---------- */
function cleanStory(b, requireConsent) {
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const status = b.status === "draft" ? "draft" : "published";
  const s = {
    title: str(b.title, 120),
    excerpt: str(b.excerpt || b.update, 320),
    author: str(b.author, 80) || "Give-Directly Team",
    category: str(b.category, 60) || "Community Stories",
    location: str(b.location, 80),
    date: str(b.date, 40),
    image: str(b.image, 200),
    body: typeof b.body === "string" ? b.body.replace(/\r\n/g, "\n").trim().slice(0, 30000) : "",
    status,
  };
  if (!s.title) return { error: "A post title is required." };
  if (s.excerpt.length < 10) return { error: "Add a short excerpt for the blog listing." };
  if (s.body.length < 40) return { error: "The article text is too short." };
  if (isNaN(new Date(s.date))) return { error: "A valid publication date is required." };
  s.date = new Date(s.date).toISOString();
  if (s.image && !/^assets\/images\/stories\/[\w\-]+\.(jpg|png|webp)$/.test(s.image))
    return { error: "Invalid photo path." };
  if (requireConsent && b.consent !== true) return { error: "Consent confirmation is required." };
  return { story: s };
}

function normalizeStory(x) {
  return {
    ...x,
    excerpt: x.excerpt || x.update || "",
    author: x.author || "Give-Directly Team",
    category: x.category || "Community Stories",
    status: x.status || "published",
  };
}

function isPublicStory(x) {
  const p = normalizeStory(x);
  return p.status === "published" && !isNaN(new Date(p.date)) && new Date(p.date).getTime() <= Date.now();
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const p = url.pathname;

  if (req.method === "GET" && p === "/api/stories") {
    const list = readStories().map(normalizeStory).filter(isPublicStory).sort((a, b) => new Date(b.date) - new Date(a.date));
    return send(res, 200, list);
  }

  const publicStory = p.match(/^\/api\/stories\/([a-f0-9]{12})$/);
  if (req.method === "GET" && publicStory) {
    const found = readStories().map(normalizeStory).find((x) => x.id === publicStory[1]);
    if (!found || !isPublicStory(found)) return send(res, 404, { error: "Story not found" });
    return send(res, 200, found);
  }

  if (!p.startsWith("/api/admin/")) return send(res, 404, { error: "Not found" });

  // Admin JSON requests must declare JSON (blocks simple cross-site form posts)
  if (req.method !== "GET" && !String(req.headers["content-type"] || "").includes("application/json"))
    return send(res, 415, { error: "JSON required" });

  if (p === "/api/admin/login" && req.method === "POST") {
    const ip = req.socket.remoteAddress || "?";
    const rec = attempts.get(ip) || { count: 0, reset: Date.now() + 10 * 60 * 1000 };
    if (rec.reset < Date.now()) Object.assign(rec, { count: 0, reset: Date.now() + 10 * 60 * 1000 });
    if (rec.count >= 5) return send(res, 429, { error: "Too many attempts. Try again in a few minutes." });
    const body = await readBody(req, 2000);
    if (safeEqual(body.password || "", PASSWORD)) {
      attempts.delete(ip);
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, Date.now() + SESSION_MS);
      return send(res, 200, { ok: true }, { "Set-Cookie": cookie(req, token, SESSION_MS / 1000) });
    }
    rec.count++;
    attempts.set(ip, rec);
    return send(res, 401, { error: "Incorrect password." });
  }

  if (p === "/api/admin/session" && req.method === "GET") return send(res, 200, { admin: isAdmin(req) });

  if (!isAdmin(req)) return send(res, 401, { error: "Not signed in." });

  if (p === "/api/admin/logout" && req.method === "POST") {
    sessions.delete(parseCookies(req).gd_admin);
    return send(res, 200, { ok: true }, { "Set-Cookie": cookie(req, "", 0) });
  }

  if (p === "/api/admin/stories" && req.method === "GET") {
    const list = readStories().map(normalizeStory).sort((a, b) => new Date(b.date) - new Date(a.date));
    return send(res, 200, list);
  }

  if (p === "/api/admin/stories" && req.method === "POST") {
    const { story, error } = cleanStory(await readBody(req, 100000), true);
    if (error) return send(res, 400, { error });
    story.id = crypto.randomBytes(6).toString("hex");
    const list = readStories();
    list.push(story);
    writeStories(list);
    return send(res, 201, story);
  }

  const m = p.match(/^\/api\/admin\/stories\/([a-f0-9]{12})$/);
  if (m && req.method === "PUT") {
    const { story, error } = cleanStory(await readBody(req, 100000), false);
    if (error) return send(res, 400, { error });
    const list = readStories();
    const i = list.findIndex((x) => x.id === m[1]);
    if (i < 0) return send(res, 404, { error: "Not found" });
    list[i] = { ...story, id: m[1] };
    writeStories(list);
    return send(res, 200, list[i]);
  }
  if (m && req.method === "DELETE") {
    const list = readStories();
    const next = list.filter((x) => x.id !== m[1]);
    if (next.length === list.length) return send(res, 404, { error: "Not found" });
    writeStories(next);
    return send(res, 200, { ok: true });
  }

  if (p === "/api/admin/upload" && req.method === "POST") {
    const body = await readBody(req, 8 * 1024 * 1024);
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl || "");
    if (!match) return send(res, 400, { error: "Use a JPG, PNG or WebP image." });
    const buf = Buffer.from(match[2], "base64");
    if (buf.length > 5 * 1024 * 1024) return send(res, 413, { error: "Image must be under 5 MB." });
    const magic = buf.subarray(0, 12);
    const ok =
      (match[1] === "png" && magic.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) ||
      (match[1] === "jpeg" && magic[0] === 0xff && magic[1] === 0xd8) ||
      (match[1] === "webp" && magic.subarray(0, 4).toString() === "RIFF" && magic.subarray(8, 12).toString() === "WEBP");
    if (!ok) return send(res, 400, { error: "That file isn't a valid image." });
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const name = crypto.randomBytes(8).toString("hex") + "." + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return send(res, 201, { path: "assets/images/stories/" + name });
  }

  return send(res, 404, { error: "Not found" });
}

/* ---------- static files (html at root + /assets only) ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
function serveStatic(req, res, url) {
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch (e) {
    res.writeHead(400);
    return res.end("Bad request");
  }
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(ROOT, rel));
  const allowed =
    file.startsWith(ROOT + path.sep) &&
    ((path.dirname(file) === ROOT && file.endsWith(".html")) ||
      file.startsWith(path.join(ROOT, "assets") + path.sep));
  const ext = path.extname(file).toLowerCase();
  if (!allowed || !MIME[ext] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }
  res.writeHead(200, { "Content-Type": MIME[ext], "X-Content-Type-Options": "nosniff" });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname.startsWith("/api/")) return await api(req, res, url);
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405);
        return res.end();
      }
      serveStatic(req, res, url);
    } catch (e) {
      send(res, e.status || 500, { error: e.status ? e.message : "Server error" });
    }
  })
  .listen(PORT, () => {
    console.log(`Give-Directly running at http://localhost:${PORT}`);
    console.log(`Admin panel:               http://localhost:${PORT}/admin.html`);
  });
