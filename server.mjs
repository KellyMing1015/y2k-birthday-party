import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, link, mkdir, open, realpath, stat, unlink } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const siteDirectory = await realpath(fileURLToPath(new URL(".", import.meta.url)));
const dataDirectory = resolve(process.env.BIRTHDAY_DATA_DIR || join(siteDirectory, "data"));
const wishFile = join(dataDirectory, "wish.json");
const hostname = process.env.BIRTHDAY_HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4178);
const password = process.env.BIRTHDAY_PASSWORD;
if (!/^[0-9]{4}$/.test(password || "")) {
  console.error("请先在 .env 中设置四位数字 BIRTHDAY_PASSWORD。");
  process.exit(1);
}
try {
  await access(join(siteDirectory, "content.js"));
} catch {
  console.error("请先运行 node unlock-materials.mjs 密钥文件路径，解锁照片和录音。");
  process.exit(1);
}
const passwordDigest = digest(password);
const secureCookie = process.env.BIRTHDAY_SECURE_COOKIE === "1";
const cookieName = "birthday_session";
const sessionLifetime = 24 * 60 * 60;
const attemptWindow = 15 * 60 * 1000;
const maxAttempts = 8;
const maxJsonBytes = 4096;
const sessions = new Map();
const attempts = new Map();

const publicFiles = new Set(["password.css", "password.js", "favicon.ico"]);
const siteFiles = new Set([
  "app.js", "content.js", "base.css", "party.js", "party.css",
  "party-ticket.js", "party-ticket.css", "party-balloons.js", "party-balloons.css",
  "scratch.js", "scratch.css", "party-jukebox.js", "party-jukebox.css",
  "party-finale.js", "archive.js", "archive.css", "radio.js", "radio.css",
  "tide.js", "tide.css", "style-explorer.html",
]);
const mediaPath = /^assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:webp|png|jpe?g|gif|mp3|m4a|wav)$/i;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function requestPath(rawUrl) {
  if (!rawUrl?.startsWith("/")) throw new HttpError(400, "bad_request");
  let pathname;
  try {
    pathname = decodeURIComponent(rawUrl.split("?")[0]);
  } catch {
    throw new HttpError(400, "bad_request");
  }
  if (pathname.includes("//") || pathname.includes("\\") || pathname.includes("\0") ||
      pathname.split("/").some(part => part === "." || part === "..")) {
    throw new HttpError(400, "bad_request");
  }
  return pathname;
}

function sameOrigin(req) {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  if (!req.headers.origin) return true;
  try {
    const origin = new URL(req.headers.origin);
    return (origin.protocol === "http:" || origin.protocol === "https:") &&
      origin.host === req.headers.host;
  } catch {
    return false;
  }
}

async function readJson(req) {
  if (!sameOrigin(req)) throw new HttpError(403, "forbidden");
  if (req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new HttpError(400, "invalid_json");
  }
  if (Number(req.headers["content-length"]) > maxJsonBytes) {
    req.resume();
    throw new HttpError(413, "body_too_large");
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > maxJsonBytes) {
      req.resume();
      throw new HttpError(413, "body_too_large");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

function authorized(req) {
  const token = req.headers.cookie?.split(";").map(part => part.trim())
    .find(part => part.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  return (sessions.get(token) || 0) > Date.now();
}

async function unlock(req, res) {
  const body = await readJson(req);
  const client = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const previous = attempts.get(client);
  const attempt = previous?.until > now ? previous : { failures: 0, until: now + attemptWindow };
  if (attempt.failures >= maxAttempts) {
    return sendJson(res, 429, { error: "too_many_attempts" }, {
      "Retry-After": String(Math.ceil((attempt.until - now) / 1000)),
    });
  }
  if (typeof body?.password !== "string" || !timingSafeEqual(digest(body.password), passwordDigest)) {
    attempt.failures += 1;
    attempts.set(client, attempt);
    return sendJson(res, 401, { error: "incorrect_password" });
  }

  attempts.delete(client);
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, now + sessionLifetime * 1000);
  const cookie = `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionLifetime}`;
  sendJson(res, 200, { ok: true }, {
    "Set-Cookie": secureCookie ? cookie + "; Secure" : cookie,
  });
}

async function isSealed() {
  try {
    await stat(wishFile);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function saveWish(wish) {
  const tempPath = join(dataDirectory, `.wish-${randomBytes(16).toString("hex")}.tmp`);
  const file = await open(tempPath, "wx", 0o600);
  try {
    try {
      await file.writeFile(JSON.stringify({ wish, savedAt: new Date().toISOString() }, null, 2) + "\n");
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      // The complete file becomes visible only if no wish has been sealed yet.
      await link(tempPath, wishFile);
    } catch (error) {
      if (error.code === "EEXIST") return false;
      throw error;
    }
    const directory = await open(dataDirectory, "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    return true;
  } finally {
    await unlink(tempPath);
  }
}

async function handleWish(req, res) {
  if (!authorized(req)) return sendJson(res, 401, { error: "unauthorized" });
  if (req.method === "GET") return sendJson(res, 200, { sealed: await isSealed() });
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method_not_allowed" }, { Allow: "GET, POST" });
  }
  const body = await readJson(req);
  const raw = body?.wish;
  if (typeof raw !== "string" || raw.length > 280 || !raw.trim()) {
    return sendJson(res, 400, { error: "invalid_wish" });
  }
  const saved = await saveWish(raw.trim());
  return sendJson(res, saved ? 201 : 409, { sealed: true });
}

function parseRange(header, length) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || length === 0) return false;
  const [, first, last] = match;
  if (!first) {
    const count = Number(last);
    if (!Number.isSafeInteger(count) || count < 1) return false;
    return { start: Math.max(0, length - count), end: length - 1 };
  }
  const start = Number(first);
  const finish = last ? Number(last) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(finish) || start >= length || finish < start) {
    return false;
  }
  return { start, end: Math.min(finish, length - 1) };
}

async function serveFile(req, res, filename) {
  const requested = join(siteDirectory, filename);
  let path;
  let info;
  try {
    path = await realpath(requested);
    if (path !== requested || !path.startsWith(siteDirectory + sep)) {
      throw new HttpError(404, "not_found");
    }
    info = await stat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") throw new HttpError(404, "not_found");
    throw error;
  }
  if (!info.isFile()) throw new HttpError(404, "not_found");

  const range = parseRange(req.headers.range, info.size);
  if (range === false) {
    res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
    return res.end();
  }
  const headers = {
    "Content-Type": mimeTypes[extname(filename).toLowerCase()],
    "Content-Length": range ? range.end - range.start + 1 : info.size,
    "Accept-Ranges": "bytes",
  };
  if (range) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${info.size}`;
  res.writeHead(range ? 206 : 200, headers);
  if (req.method === "HEAD") return res.end();
  await pipeline(createReadStream(path, range || {}), res);
}

async function handle(req, res) {
  const path = requestPath(req.url);
  if (path === "/api/unlock") {
    if (req.method === "POST") return unlock(req, res);
    return sendJson(res, 405, { error: "method_not_allowed" }, { Allow: "POST" });
  }
  if (path === "/api/wish") return handleWish(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "method_not_allowed" }, { Allow: "GET, HEAD" });
  }
  if (path === "/" || path === "/index.html") {
    return serveFile(req, res, authorized(req) ? "index.html" : "password.html");
  }
  const filename = path.slice(1);
  if (publicFiles.has(filename)) return serveFile(req, res, filename);
  if (!siteFiles.has(filename) && !mediaPath.test(filename)) {
    return sendJson(res, 404, { error: "not_found" });
  }
  if (!authorized(req)) return sendJson(res, 401, { error: "unauthorized" });
  return serveFile(req, res, filename);
}

await mkdir(dataDirectory, { mode: 0o700, recursive: true });

const server = createServer({ requestTimeout: 15_000 }, (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  handle(req, res).catch(error => {
    if (res.destroyed) return;
    if (res.headersSent) {
      res.destroy();
    } else if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message });
    } else {
      console.error("Birthday request failed:", error.code || error.name);
      sendJson(res, 500, { error: "server_error" });
    }
  });
});

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [client, attempt] of attempts) if (attempt.until <= now) attempts.delete(client);
  for (const [token, expiry] of sessions) if (expiry <= now) sessions.delete(token);
}, 60_000);
cleanup.unref();

server.listen(port, hostname, () => {
  console.log(`Birthday party listening at http://${hostname}:${server.address().port}`);
});
