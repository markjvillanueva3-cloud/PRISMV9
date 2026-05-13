#!/usr/bin/env node
// tier: T3
/**
 * mirror-c-to-h.mjs — PostToolUse hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01: H-drive mirror.
 *
 * The user declared H: as master drive (CLAUDE.md). C:\Users\<user>\.claude\
 * is supposed to be a junction to H:\.claude, but on this machine it is a
 * REAL directory — Claude Code writes (memory, plans, transcripts) land on
 * C: and never reach H:. This hook closes that gap.
 *
 * Trigger: PostToolUse for Write|Edit|MultiEdit|NotebookEdit.
 * Payload (stdin JSON): { tool_name, tool_input: { file_path, ... }, ... }
 *
 * Behavior:
 *   - If `file_path` resolves under  C:\Users\<u>\.claude\<rel>   then
 *     copy the file (and parent dirs if needed) to  H:\.claude\<rel>
 *   - Skip if H: copy is already byte-equal (sha-256).
 *   - Skip if the source file is gone (delete-after-edit case).
 *   - Throttle: same path can mirror at most once per 2s.
 *   - Append a structured event to `mcp-server/data/state/c-to-h-mirror.log.jsonl`.
 *
 * NEVER mirrors H: → C: (one-way only) — prevents infinite loops.
 *
 * Exit codes: always 0 (advisory hook). Failures are logged, not raised.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const LOG_PATH = join(STATE_DIR, "c-to-h-mirror.log.jsonl");
const THROTTLE_PATH = join(STATE_DIR, "c-to-h-mirror-throttle.json");
const THROTTLE_WINDOW_MS = 2_000;

/** Read stdin → JSON; return null on parse failure. */
async function readStdinJson() {
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Translate a C:\Users\<user>\.claude\<rel> path → H:\.claude\<rel>.
 * Returns null if the input is not in scope.
 */
export function translateCToH(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return null;
  // Normalize separators for matching but preserve original case.
  const norm = filePath.replace(/\//g, "\\");
  // Only mirror C:\Users\<user>\.claude\... — both case-insensitive on Windows.
  const m = /^[Cc]:\\Users\\[^\\]+\\\.claude\\(.*)$/.exec(norm);
  if (!m) return null;
  const rel = m[1];
  // Avoid mirroring transient/sensitive content that doesn't belong on H:.
  //   cache/locks/statsig — session-scoped, churn fast
  //   .credentials.json   — OAuth/session tokens; security boundary
  //   *.bak-* / *.pre-*   — backups already cover prior state
  //   shell-snapshots/ide — IDE-local state, not portable
  if (
    rel.startsWith("cache\\") ||
    rel.startsWith("locks\\") ||
    rel.startsWith("statsig\\") ||
    rel.startsWith("shell-snapshots\\") ||
    rel.startsWith("ide\\") ||
    rel.endsWith(".lock") ||
    /\.credentials\.json/i.test(rel) ||
    /\.bak[-.0-9a-zA-Z_]*$/i.test(rel) ||
    /\.pre-[-.0-9a-zA-Z_]+$/i.test(rel)
  ) {
    return null;
  }
  return resolve("H:/.claude", rel.replace(/\\/g, "/"));
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function loadThrottle() {
  try {
    if (existsSync(THROTTLE_PATH)) return JSON.parse(readFileSync(THROTTLE_PATH, "utf8"));
  } catch { /* corrupt — start over */ }
  return {};
}

function saveThrottle(obj) {
  try {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(THROTTLE_PATH, JSON.stringify(obj));
  } catch { /* non-fatal */ }
}

function logEvent(event) {
  try {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
    writeFileSync(LOG_PATH, line, { flag: "a" });
  } catch { /* non-fatal */ }
}

/**
 * Mirror a single file. Returns one of:
 *   "mirrored" | "unchanged" | "source-missing" | "throttled" | "skipped" | "error"
 */
export function mirrorOne(srcPath, opts = {}) {
  const target = translateCToH(srcPath);
  if (!target) return "skipped";
  if (!existsSync(srcPath)) return "source-missing";

  // Throttle on the source path.
  const throttle = opts.throttle ?? loadThrottle();
  const now = Date.now();
  const last = throttle[srcPath] ?? 0;
  if (now - last < THROTTLE_WINDOW_MS) return "throttled";

  let srcBuf;
  try {
    srcBuf = readFileSync(srcPath);
  } catch (err) {
    logEvent({ kind: "read-error", srcPath, error: String(err.message ?? err) });
    return "error";
  }
  const srcHash = sha256(srcBuf);

  if (existsSync(target)) {
    try {
      const tgtHash = sha256(readFileSync(target));
      if (tgtHash === srcHash) {
        throttle[srcPath] = now;
        if (!opts.skipPersist) saveThrottle(throttle);
        return "unchanged";
      }
    } catch { /* fall through to overwrite */ }
  }

  try {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(srcPath, target);
    throttle[srcPath] = now;
    if (!opts.skipPersist) saveThrottle(throttle);
    logEvent({ kind: "mirrored", srcPath, target, bytes: srcBuf.length, sha256: srcHash });
    return "mirrored";
  } catch (err) {
    logEvent({ kind: "write-error", srcPath, target, error: String(err.message ?? err) });
    return "error";
  }
}

async function main() {
  const ok = () => { process.stdout.write(JSON.stringify({ continue: true }) + "\n"); process.exit(0); };
  const payload = await readStdinJson();
  if (!payload) { ok(); return; }

  const tool = payload.tool_name ?? payload.tool;
  const supported = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
  if (!supported.has(tool)) { ok(); return; }

  const input = payload.tool_input ?? payload.params ?? {};
  const filePath = input.file_path ?? input.notebook_path;
  if (!filePath) { ok(); return; }

  mirrorOne(filePath); // Result handling is via the JSONL log; never blocks.
  ok();
}

// ESM entry detection that tolerates Windows path / URL differences.
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(process.argv[1]).toLowerCase() === resolve(new URL(import.meta.url).pathname.replace(/^\//, "")).toLowerCase();

if (isMain) main().catch(() => process.exit(0));
