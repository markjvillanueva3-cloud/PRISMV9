import process from "node:process";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import { cachePath, ensureCacheDir } from "./hook-cache.mjs";

const CACHE_FILE = cachePath("read-once-registry");

// Parse stdin for hook input (Claude Code passes tool_input via stdin)
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin or invalid JSON - fall back to env vars */ }

// Files that change during a session — never block re-reads
const EXEMPT_PATTERNS = [
  "HANDOFF.md",
  "CURRENT_POSITION.md",
  "settings.json",
  "settings.local.json",
  "MEMORY.md",
  "roadmap-index.json",
  "SESSION_ARTIFACTS.json",
  "AGENT_WORKBOARD.json",
  "AGENT_CHAT.jsonl",
  "session-edit-counter.json",
  "HEALTH_CHECK_REPORT.json",
];

function isExempt(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return EXEMPT_PATTERNS.some((p) => normalized.endsWith(p.toLowerCase()));
}

async function readRegistry() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeRegistry(registry) {
  await ensureCacheDir();
  await fs.writeFile(CACHE_FILE, JSON.stringify(registry), "utf8");
}

async function getFileMtime(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

// ─── PreToolUse: block re-reads of unchanged files ─────────
async function preToolUse() {
  const toolInput = stdinInput.tool_input || {};
  const filePath = (toolInput.file_path || process.env.TOOL_INPUT_file_path || "").trim();
  const offset = toolInput.offset || process.env.TOOL_INPUT_offset || "";
  const limit = toolInput.limit || process.env.TOOL_INPUT_limit || "";

  if (!filePath) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Always allow targeted reads (offset/limit)
  if (offset || limit) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Always allow exempt files
  if (isExempt(filePath)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const registry = await readRegistry();
  const normalized = filePath.replace(/\\/g, "/");
  const entry = registry[normalized];

  if (!entry) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Check if file was modified since last read
  const currentMtime = await getFileMtime(filePath);
  if (currentMtime > entry.mtime) {
    // File changed — allow re-read, will be tracked again in PostToolUse
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // File unchanged since last read — advise against re-read
  const ago = Math.round((Date.now() - entry.readTime) / 1000);
  const agoText = ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`;
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `READ-ONCE: You already read ${normalized.split("/").pop()} ${agoText} ago and it hasn't changed. Use your existing knowledge of this file instead of re-reading it.`,
    },
  }));
}

// ─── PostToolUse: record read with timestamp + mtime ────────
async function postToolUse() {
  const toolInput = stdinInput.tool_input || {};
  const filePath = (toolInput.file_path || process.env.TOOL_INPUT_file_path || "").trim();
  if (!filePath) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const normalized = filePath.replace(/\\/g, "/");
  const mtime = await getFileMtime(filePath);
  const registry = await readRegistry();

  registry[normalized] = {
    readTime: Date.now(),
    mtime,
  };

  // Keep registry from growing unbounded (max 200 entries)
  const keys = Object.keys(registry);
  if (keys.length > 200) {
    const sorted = keys.sort((a, b) => registry[a].readTime - registry[b].readTime);
    for (const key of sorted.slice(0, keys.length - 200)) {
      delete registry[key];
    }
  }

  await writeRegistry(registry);
  process.stdout.write(JSON.stringify({ continue: true }));
}

// ─── Entry point: detect mode from env ──────────────────────
const mode = process.env.READ_ONCE_MODE ?? "pre";

if (mode === "post") {
  postToolUse().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
} else {
  preToolUse().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
