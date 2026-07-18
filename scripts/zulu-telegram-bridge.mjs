#!/usr/bin/env node
/**
 * zulu-telegram-bridge.mjs — ZULU-OBSIDIAN-LIVE-MS0
 * =================================================
 *
 * Mobile gateway that lets an ALLOWLISTED operator query the PRISM brain (the
 * live Obsidian vault on :27123) from Telegram. The Zulu fleet-orchestrator's
 * mobile read surface. OUTWARD-FACING on an internal-only system, so it is
 * hardened, fail-CLOSED, and READ-ONLY.
 *
 * SECURITY POSTURE (v1):
 *  - Long-poll getUpdates only — NO inbound webhook/port is opened.
 *  - READ-ONLY — there is no write path of any kind. Nothing a Telegram message
 *    can do mutates the brain, the vault, the repo, or the fleet.
 *  - Default-DENY chat-ID allowlist (PRISM_TELEGRAM_ALLOWED_CHAT_IDS). An empty
 *    allowlist accepts NO ONE. Unknown ids → silent drop, no content logged
 *    (only a hashed-id counter).
 *  - Fixed verb allowlist parsed by strict regex: /recall <q>, /search <q>,
 *    /status. The remainder is an OPAQUE query string passed only to the brain
 *    search — never a filesystem path, shell, eval, or dispatcher argument.
 *  - Per-chat token bucket (~1 msg / 3s, burst 5) + a global ceiling.
 *  - 3500-char response cap; output is run through a deny-regex that strips any
 *    env-var / secret / absolute-path / token-shaped substring before send.
 *  - Bot token via PRISM_TELEGRAM_BOT_TOKEN only; refuse to start without it;
 *    the token is never logged or echoed.
 *  - Opt-in: nothing starts it automatically. Run explicitly:
 *      node scripts/zulu-telegram-bridge.mjs
 *
 * Brain backend: the live Obsidian Local REST API (loopback :27123), the same
 * surface ObsidianRestBridgeEngine uses — symmetric mobile access to the live
 * brain. Fail-soft: vault down → a safe "brain offline" reply, never a crash.
 *
 * NOTE: phone-app territory belongs to the quebec slot; this bridge is flagged
 * for quebec coordination (see CLAUDE.md §ZULU-OBSIDIAN-LIVE).
 */
import https from "node:https";
import http from "node:http";
import crypto from "node:crypto";
import { URL } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { redactSecrets } from "./lib/redact-secrets.mjs";

// ── config ──────────────────────────────────────────────────────────────────
const TELEGRAM_API = "https://api.telegram.org";
const MAX_REPLY_CHARS = 3500; // < Telegram's 4096 hard limit, leaves markdown headroom
const POLL_TIMEOUT_S = 25; // long-poll
const RATE_REFILL_MS = 3000; // ~1 msg / 3s per chat
const RATE_BURST = 5;
const GLOBAL_MAX_PER_MIN = 60;
/** Read fresh per call (matches ObsidianRestBridgeEngine.baseUrl) so the
 *  non-loopback guard reflects current env, not a module-load snapshot. */
function obsidianUrl() {
  return process.env.PRISM_OBSIDIAN_URL || "https://127.0.0.1:27123";
}
const OBSIDIAN_PROBE_TIMEOUT_MS = 2000;

// Single-line only: space/tab separator (NOT newline), no newlines in the query.
// This rejects multi-line "command smuggle" like "/status\n/search x" outright.
const VERB_RE = /^\/(recall|search|status)(?:@\w+)?(?:[ \t]+([^\r\n]{1,512}))?$/i;

/** Loopback-only (strict dotted-quad 127.0.0.0/8 + localhost + ::1) — no FQDN spoof. */
export function isLoopbackHost(hostname) {
  const h = String(hostname).toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "localhost") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  return o[0] === 127 && o.every((n) => n <= 255);
}

/** Parse the allowlist env into a Set of string chat ids. Empty => deny-all. */
export function parseAllowlist(raw) {
  return new Set(
    String(raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAllowedChat(chatId, allowSet) {
  return allowSet.size > 0 && allowSet.has(String(chatId));
}

/** Strict command parse. Returns { verb, query } or null for anything off-allowlist. */
export function parseCommand(text) {
  const m = String(text || "").trim().match(VERB_RE);
  if (!m) return null;
  return { verb: m[1].toLowerCase(), query: (m[2] || "").trim() };
}

/** Hash a chat id for log lines so raw ids never hit disk. */
export function hashId(chatId) {
  return crypto.createHash("sha256").update(String(chatId)).digest("hex").slice(0, 12);
}

/**
 * Strip anything secret/path/token-shaped from an outbound reply, then cap length.
 * Defense-in-depth: the brain search returns filenames + snippets, but this
 * guarantees no env var, bearer token, vendor API key, JWT, Windows/Unix
 * absolute path, or long hex/key blob is ever forwarded to a phone.
 *
 * The token/JWT/api-key/hex masking is delegated to the shared redactSecrets
 * (scripts/lib/redact-secrets.mjs) so the fleet has ONE redactor; this wrapper
 * layers the bridge-specific concerns on top: the env-var-name pattern, the
 * Telegram bot-token pattern (crown-jewel for THIS surface), absolute-path
 * masking, and the Telegram length cap.
 */
export function sanitizeOutput(s) {
  let out = String(s ?? "")
    .replace(/\b[A-Z][A-Z0-9_]{3,}=(?:\S+)/g, "[redacted-env]") // FOO_BAR=value
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g, "[redacted-tg-token]"); // Telegram bot token — crown-jewel secret
  out = redactSecrets(out); // shared: Bearer/Google/OpenAI/xAI/GitHub keys, JWT, api_key:, long hex, frontmatter
  out = out
    .replace(/\b[A-Za-z]:[\\/][^\s"']+/g, "[path]") // C:\... Windows abs path
    .replace(/(?:^|\s)\/(?:Users|home|etc|root|var)\/[^\s"']+/g, " [path]"); // unix abs path
  if (out.length > MAX_REPLY_CHARS) out = out.slice(0, MAX_REPLY_CHARS) + "\n…[truncated]";
  return out;
}

/** Per-chat token bucket + a global per-minute ceiling. */
export class RateLimiter {
  constructor({ refillMs = RATE_REFILL_MS, burst = RATE_BURST, globalMax = GLOBAL_MAX_PER_MIN, now = () => Date.now() } = {}) {
    this.refillMs = refillMs;
    this.burst = burst;
    this.globalMax = globalMax;
    this.now = now;
    this.buckets = new Map();
    this.globalWindow = { start: this.now(), count: 0 };
  }
  allow(chatId) {
    const t = this.now();
    if (t - this.globalWindow.start >= 60_000) this.globalWindow = { start: t, count: 0 };
    if (this.globalWindow.count >= this.globalMax) return false;
    let b = this.buckets.get(chatId);
    if (!b) {
      b = { tokens: this.burst, last: t };
      this.buckets.set(chatId, b);
    }
    const refill = Math.floor((t - b.last) / this.refillMs);
    if (refill > 0) {
      b.tokens = Math.min(this.burst, b.tokens + refill);
      b.last = t;
    }
    if (b.tokens <= 0) return false;
    b.tokens -= 1;
    this.globalWindow.count += 1;
    return true;
  }
}

// ── brain backend (live Obsidian vault, loopback-pinned, fail-soft) ──────────
function obsidianRequest({ method, path, accept, timeoutMs }) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(path, obsidianUrl());
    } catch {
      resolve({ ok: false, reason: "bad-url" });
      return;
    }
    if (!isLoopbackHost(u.hostname) && process.env.PRISM_OBSIDIAN_ALLOW_REMOTE !== "1") {
      resolve({ ok: false, reason: "non-loopback-url" });
      return;
    }
    const key = process.env.PRISM_OBSIDIAN_API_KEY || "";
    if (!key) {
      resolve({ ok: false, reason: "no-key" });
      return;
    }
    const isHttps = u.protocol === "https:";
    const lib = isHttps ? https : http;
    const req = lib.request(
      u,
      {
        method,
        headers: { Authorization: `Bearer ${key}`, ...(accept ? { Accept: accept } : {}) },
        ...(isHttps ? { rejectUnauthorized: !isLoopbackHost(u.hostname) } : {}),
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          if (text.length < 64 * 1024) text += c;
        });
        res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text }));
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", (e) => resolve({ ok: false, reason: String(e && e.message) }));
    req.end();
  });
}

// ── file-vault backend (ALWAYS-ON; no plugin, no running Obsidian) ────────────
// The mobile bridge defaults to reading the Obsidian-format markdown vault on
// disk directly (the cross-session "brain" under <vault>/memories). This needs
// no Local REST API plugin and works when Obsidian is closed — the safest
// backend for an outward-facing surface. Live-REST is an opt-in richer upgrade.
const VAULT_MAX_FILES = 4000;
const VAULT_READ_BYTES = 4096;
const STOPWORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "what", "when", "where", "you", "your", "are", "was", "how", "why"]);

/** <vault>/memories, read fresh from env (testable; no module-load snapshot). */
function vaultSearchRoot() {
  return join(process.env.PRISM_OBSIDIAN_VAULT_DIR || "H:/prism/knowledge", "memories");
}
function tokenize(s) {
  return String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}
function snippetFor(text, toks) {
  const t = String(text || "");
  const low = t.toLowerCase();
  let pos = -1;
  for (const tok of toks) {
    const i = low.indexOf(tok);
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  if (pos < 0) pos = 0;
  return t.slice(Math.max(0, pos - 30), Math.max(0, pos - 30) + 140).replace(/\s+/g, " ").trim();
}
/** Pure: rank entries [{filename,text}] by query-token hits (filename weighted x3). */
export function rankFiles(query, entries, k = 10) {
  const toks = tokenize(query);
  if (toks.length === 0) return [];
  const scored = [];
  for (const e of entries || []) {
    const name = String(e.filename || "").toLowerCase();
    const text = String(e.text || "").toLowerCase();
    let score = 0;
    for (const t of toks) {
      if (name.includes(t)) score += 3;
      let idx = 0;
      let n = 0;
      while (n < 20 && (idx = text.indexOf(t, idx)) !== -1) {
        score += 1;
        idx += t.length;
        n++;
      }
    }
    if (score > 0) scored.push({ filename: e.filename, score, snippet: snippetFor(e.text, toks) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
/** Bounded recursive .md collector (file cap + deadline keep it fast on a huge tree). */
function collectMd(root, maxFiles, deadline) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < maxFiles && Date.now() < deadline) {
    const dir = stack.pop();
    let ents;
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of ents) {
      if (out.length >= maxFiles) break;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) { if (ent.name !== ".git" && ent.name !== "node_modules") stack.push(p); }
      else if (ent.isFile() && ent.name.endsWith(".md")) out.push(p);
    }
  }
  return out;
}
/** Search the on-disk vault. Always-on; no Obsidian/plugin needed. */
export function searchVaultFiles(query, opts = {}) {
  const root = opts.root || vaultSearchRoot();
  const deadline = Date.now() + (opts.deadlineMs || 3000);
  const files = collectMd(root, opts.maxFiles || VAULT_MAX_FILES, deadline);
  const entries = [];
  for (const f of files) {
    if (Date.now() >= deadline) break;
    let text = "";
    try { text = readFileSync(f, "utf8").slice(0, VAULT_READ_BYTES); } catch { continue; }
    entries.push({ filename: f.replace(/\\/g, "/").split("/").pop(), text });
  }
  return rankFiles(query, entries, opts.k || 10);
}
function countVaultFiles(root) {
  return collectMd(root || vaultSearchRoot(), VAULT_MAX_FILES, Date.now() + 1500).length;
}

/**
 * Default brain query. Backend = on-disk file-vault (ALWAYS-ON, no plugin). When
 * PRISM_OBSIDIAN_LIVE=1 the richer live Obsidian REST search is tried first and
 * falls back to the file-vault if the app isn't running. Returns SAFE markdown
 * (further sanitized by sanitizeOutput before send).
 */
export async function defaultBrainQuery(verb, query) {
  const liveEnabled = process.env.PRISM_OBSIDIAN_LIVE === "1";
  if (verb === "status") {
    const n = countVaultFiles();
    let live = "";
    if (liveEnabled) {
      const r = await obsidianRequest({ method: "GET", path: "/", accept: "application/json", timeoutMs: OBSIDIAN_PROBE_TIMEOUT_MS });
      let authed = false;
      try { authed = JSON.parse(r.text)?.authenticated === true; } catch { /* ignore */ }
      live = r.ok && authed ? " · 🟢 live vault" : r.ok ? " · 🟡 live vault unauthenticated" : ` · 🔴 live vault down (${r.reason || `http-${r.status}`})`;
    }
    return `🧠 file-brain ready — ${n} note(s)${live}`;
  }
  if (!query) return "usage: /search <terms>  ·  /recall <terms>  ·  /status";

  // Prefer the richer LIVE search when enabled + reachable; else always-on file-vault.
  if (liveEnabled) {
    const r = await obsidianRequest({ method: "POST", path: `/search/simple/?query=${encodeURIComponent(query)}`, accept: "application/json", timeoutMs: 4000 });
    if (r.ok) {
      try {
        const arr = JSON.parse(r.text);
        if (Array.isArray(arr) && arr.length) {
          return `🧠 ${Math.min(arr.length, 10)} live hit(s) for "${query}":\n` + arr.slice(0, 10).map((h, i) => `${i + 1}. ${String(h?.filename ?? "?")}`).join("\n");
        }
      } catch { /* fall through to file-vault */ }
    }
  }

  const hits = searchVaultFiles(query);
  if (hits.length === 0) return `no matches for: ${query}`;
  return `🧠 ${hits.length} hit(s) for "${query}":\n` + hits.map((h, i) => `${i + 1}. ${h.filename}${h.snippet ? " — " + h.snippet : ""}`).join("\n");
}

// ── per-message handler (testable; all I/O injected) ─────────────────────────
/**
 * Process one Telegram update. Pure control-flow with injected sendMessage +
 * brainQuery + rateLimiter. Returns a short outcome tag for tests/telemetry:
 * "denied" | "rate-limited" | "ignored" | "replied".
 */
export async function handleUpdate(update, deps) {
  const { allowSet, rateLimiter, brainQuery, sendMessage, onDenied } = deps;
  const msg = update?.message;
  const chatId = msg?.chat?.id;
  const text = msg?.text;
  if (chatId === undefined || chatId === null) return "ignored";

  // Default-deny: unknown chat → silent drop, hashed-id counter only.
  if (!isAllowedChat(chatId, allowSet)) {
    if (onDenied) onDenied(hashId(chatId));
    return "denied";
  }
  if (typeof text !== "string") return "ignored";

  const cmd = parseCommand(text);
  if (!cmd) {
    // Off-allowlist verb / free text → a fixed safe help reply (no echo of input).
    await sendMessage(chatId, "commands: /search <terms> · /recall <terms> · /status");
    return "ignored";
  }
  if (!rateLimiter.allow(String(chatId))) return "rate-limited";

  let answer;
  try {
    answer = await brainQuery(cmd.verb, cmd.query);
  } catch {
    answer = "🔴 brain query error";
  }
  await sendMessage(chatId, sanitizeOutput(answer));
  return "replied";
}

// ── Telegram I/O ──────────────────────────────────────────────────────────────
function tgCall(token, method, body) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(`/bot${token}/${method}`, TELEGRAM_API);
    } catch {
      resolve({ ok: false });
      return;
    }
    const payload = JSON.stringify(body || {});
    const req = https.request(
      u,
      { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(text));
          } catch {
            resolve({ ok: false });
          }
        });
      },
    );
    req.setTimeout((POLL_TIMEOUT_S + 10) * 1000, () => req.destroy(new Error("timeout")));
    req.on("error", () => resolve({ ok: false }));
    req.write(payload);
    req.end();
  });
}

async function main() {
  const token = process.env.PRISM_TELEGRAM_BOT_TOKEN || "";
  if (!token) {
    // Fail-loud (token never printed): refuse to start without a token.
    console.error("[zulu-telegram-bridge] PRISM_TELEGRAM_BOT_TOKEN is not set — refusing to start.");
    process.exit(2);
  }
  const allowSet = parseAllowlist(process.env.PRISM_TELEGRAM_ALLOWED_CHAT_IDS);
  if (allowSet.size === 0) {
    console.error("[zulu-telegram-bridge] PRISM_TELEGRAM_ALLOWED_CHAT_IDS is empty — default-deny means NO messages will be answered. Set it to your chat id(s).");
  }
  const rateLimiter = new RateLimiter();
  const sendMessage = async (chatId, textBody) => {
    await tgCall(token, "sendMessage", { chat_id: chatId, text: textBody, disable_web_page_preview: true });
  };
  const onDenied = (h) => console.error(`[zulu-telegram-bridge] dropped message from non-allowlisted chat (id-hash=${h})`);

  console.error(`[zulu-telegram-bridge] started · read-only · ${allowSet.size} allowlisted chat(s) · brain=${obsidianUrl()}`);
  let offset = 0;
  // Intentional long-poll loop: runs until the process is signalled/killed.
  for (;;) {
    const res = await tgCall(token, "getUpdates", { offset, timeout: POLL_TIMEOUT_S, allowed_updates: ["message"] });
    if (res && res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        offset = Math.max(offset, (update.update_id || 0) + 1);
        try {
          await handleUpdate(update, { allowSet, rateLimiter, brainQuery: defaultBrainQuery, sendMessage, onDenied });
        } catch {
          /* fail-soft — one bad update never kills the loop */
        }
      }
    } else {
      await new Promise((r) => setTimeout(r, 2000)); // backoff on poll failure
    }
  }
}

// Only run the network loop when invoked directly (not when imported by tests).
const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("zulu-telegram-bridge.mjs");
if (invokedDirectly) {
  main().catch((e) => {
    console.error("[zulu-telegram-bridge] fatal:", e && e.message);
    process.exit(1);
  });
}
