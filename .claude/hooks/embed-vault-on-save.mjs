#!/usr/bin/env node
// tier: T3
/**
 * embed-vault-on-save.mjs
 *
 * OBSIDIAN-AUTOMATE-MS3/U-EMBED-VAULT-PREWARM
 *
 * PostToolUse hook that pre-warms the daily-brief connection step by
 * embedding vault notes on every Write/Edit/MultiEdit. Daily brief at
 * 06:00 then reads pre-warmed vectors from the cache instead of
 * computing TF-IDF / live-embedding ~200 notes from cold.
 *
 * Wall-time impact: cold daily brief ~30s (live embed) → warm ~1s (cache hit).
 * GPU is already idle 99% of the time; this turns each save into a
 * background indexing op the user never feels.
 *
 * Hook contract (Claude Code):
 *   Input:  JSON via stdin describing tool_name + tool_input
 *   Output: JSON {continue: true} or empty (always non-blocking)
 *   Exit:   0 always (silent fallback on Ollama-unreachable)
 *
 * Filter rules:
 *   - tool must be Write / Edit / MultiEdit
 *   - file must end in .md
 *   - file must live under H:/prism/knowledge/ (vault root)
 *   - file size <= 200KB (skip oversized — likely not a brief candidate)
 *
 * Cache:
 *   state/shared/embedding-cache.json — { [absPath]: {vector, sha256, mtime, dims, model} }
 *   Atomic write: copy to .tmp, rename. SHA-256 dedup prevents re-embed
 *   when the same content is written twice.
 *
 * @milestone OBSIDIAN-AUTOMATE-MS3/U-EMBED-VAULT-PREWARM
 */

import { readFileSync, statSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = resolve(__dirname, "..", "..");
const VAULT_ROOT = resolve(PRISM_ROOT, "knowledge");
const CACHE_PATH = resolve(PRISM_ROOT, "state", "shared", "embedding-cache.json");

const OLLAMA_URL = process.env.PRISM_EMBED_URL ?? "http://127.0.0.1:11434/api/embeddings";
const OLLAMA_MODEL = process.env.PRISM_EMBED_MODEL ?? "nomic-embed-text";
const OLLAMA_TIMEOUT_MS = Number(process.env.PRISM_EMBED_TIMEOUT_MS) || 8000;
const MAX_FILE_BYTES = Number(process.env.PRISM_EMBED_MAX_BYTES) || 200_000;
const HOOK_DISABLED = process.env.PRISM_EMBED_HOOK_DISABLED === "1";

/**
 * Extract the file path from any of the three edit-tool input shapes.
 * Returns absolute path string, or null if the tool isn't an edit tool
 * or the input is malformed.
 */
export function extractEditedPath(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  if (toolName === "Write" || toolName === "Edit" || toolName === "MultiEdit") {
    const p = toolInput.file_path;
    return typeof p === "string" && p.length > 0 ? p : null;
  }
  return null;
}

/**
 * Decide whether this path is a vault-md candidate worth embedding.
 * Strict checks: .md extension, under VAULT_ROOT, size cap, exists.
 */
export function isVaultMarkdown(absPath, vaultRoot = VAULT_ROOT, maxBytes = MAX_FILE_BYTES) {
  if (typeof absPath !== "string") return false;
  if (!absPath.toLowerCase().endsWith(".md")) return false;
  // Normalize path separators for cross-platform comparison.
  const norm = absPath.replace(/\\/g, "/");
  const vaultNorm = vaultRoot.replace(/\\/g, "/");
  if (!norm.toLowerCase().startsWith(vaultNorm.toLowerCase() + "/")) return false;
  try {
    const st = statSync(absPath);
    if (!st.isFile()) return false;
    if (st.size > maxBytes) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the existing cache (or empty if missing/corrupt).
 * Never throws — corrupt JSON returns {} so the next write is recoverable.
 */
export function readCache(cachePath = CACHE_PATH) {
  try {
    if (!existsSync(cachePath)) return {};
    const raw = readFileSync(cachePath, "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

/**
 * Atomic write: tmp + rename. Survives kill-9 mid-write.
 */
export function writeCache(cache, cachePath = CACHE_PATH) {
  const dir = dirname(cachePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = cachePath + ".tmp";
  writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
  renameSync(tmp, cachePath);
}

export function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Embed via Ollama. Never throws on transport failure — returns
 * {ok: false, error} so the hook can silently skip and not block.
 */
export async function embed(text, opts = {}) {
  const url = opts.url ?? OLLAMA_URL;
  const model = opts.model ?? OLLAMA_MODEL;
  const timeoutMs = opts.timeoutMs ?? OLLAMA_TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) return { ok: false, error: "no-fetch" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `http-${res.status}` };
    const body = await res.json();
    if (!Array.isArray(body.embedding)) return { ok: false, error: "no-embedding" };
    if (!body.embedding.every((n) => typeof n === "number" && Number.isFinite(n))) {
      return { ok: false, error: "non-numeric" };
    }
    return { ok: true, vector: body.embedding, model };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.includes("abort") ? "timeout" : "fetch-failed" };
  }
}

/**
 * Process a single edited path: read file, sha-dedup, embed if new,
 * write cache. Returns a typed status object.
 */
export async function processEditedPath(absPath, opts = {}) {
  const cachePath = opts.cachePath ?? CACHE_PATH;
  const vaultRoot = opts.vaultRoot ?? VAULT_ROOT;
  const maxBytes = opts.maxBytes ?? MAX_FILE_BYTES;
  if (!isVaultMarkdown(absPath, vaultRoot, maxBytes)) {
    return { status: "skip", reason: "not-vault-md", path: absPath };
  }
  const text = readFileSync(absPath, "utf8");
  const hash = sha256(text);
  const cache = readCache(cachePath);
  const entry = cache[absPath];
  if (entry && entry.sha256 === hash) {
    return { status: "skip", reason: "cache-hit", path: absPath, dims: entry.dims };
  }
  const r = await embed(text, opts);
  if (!r.ok) {
    return { status: "skip", reason: `embed-failed-${r.error}`, path: absPath };
  }
  const st = statSync(absPath);
  cache[absPath] = {
    vector: r.vector,
    sha256: hash,
    mtime: st.mtimeMs,
    dims: r.vector.length,
    model: r.model,
    embeddedAt: Date.now(),
  };
  writeCache(cache, cachePath);
  return { status: "embedded", path: absPath, dims: r.vector.length, model: r.model };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook entry — read JSON from stdin, process, emit {continue: true}
// ─────────────────────────────────────────────────────────────────────────────

async function readStdin() {
  return new Promise((res) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { buf += chunk; });
    process.stdin.on("end", () => res(buf));
    // If stdin is a TTY (manual run), don't block forever.
    if (process.stdin.isTTY) res("");
  });
}

const isCliEntry = (() => {
  try {
    const argvUrl = fileURLToPath(import.meta.url);
    return process.argv[1] && resolve(process.argv[1]) === resolve(argvUrl);
  } catch { return false; }
})();

if (isCliEntry) {
  if (HOOK_DISABLED) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
  const stdin = await readStdin();
  let payload;
  try { payload = stdin ? JSON.parse(stdin) : {}; } catch { payload = {}; }
  const toolName = payload.tool_name || payload.tool || "";
  const toolInput = payload.tool_input || {};
  const editedPath = extractEditedPath(toolName, toolInput);
  if (editedPath) {
    try {
      const r = await processEditedPath(editedPath);
      // Optional debug to stderr; stdout stays JSON-clean for the harness.
      if (process.env.PRISM_EMBED_DEBUG === "1") {
        process.stderr.write(`embed-vault-on-save: ${JSON.stringify(r)}\n`);
      }
    } catch (err) {
      // Belt-and-suspenders: any escaped throw must NOT block the hook.
      if (process.env.PRISM_EMBED_DEBUG === "1") {
        process.stderr.write(`embed-vault-on-save: uncaught ${String(err)}\n`);
      }
    }
  }
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}
