#!/usr/bin/env node
// tier: T4
/**
 * directive-summary-refresh.mjs — PostToolUse hook
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U02
 *
 * Watches Write/Edit tool calls. When the target path is one of the
 * shared directives (state/shared/CLAUDE-CODEX-*.md), triggers a background
 * refresh of knowledge/directives/SUMMARIES.{md,json} via the heuristic
 * summarizer (no network — fast and deterministic).
 *
 * Why heuristic-only here:
 *   - PostToolUse must be fast (≤2 s budget). Ollama generation can take
 *     5-15 s per file. The CLI script remains available for full Ollama
 *     refresh on demand.
 *   - The heuristic produces stable 5-line summaries that are 90% as good
 *     for the auto-injection use case.
 *
 * Hook protocol — Claude Code:
 *   stdin  = JSON { hook_event_name, tool_name, tool_input: { file_path? }, ... }
 *   stdout = JSON { continue: true } (always)
 *
 * Idempotent: re-running on the same file is a no-op when the cache is fresh.
 * Best-effort: any failure path returns { continue: true } silently. PostToolUse
 * hooks never block tool completion.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HOOK_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/"));
const REPO_ROOT = path.resolve(HOOK_DIR, "../..");
const ENGINE_BUILT = path.join(REPO_ROOT, "mcp-server", "dist", "engines", "DirectiveSummarizerEngine.js");
const ENGINE_SRC = path.join(REPO_ROOT, "mcp-server", "src", "engines", "DirectiveSummarizerEngine.ts");
const HARD_TIMEOUT_MS = 2000;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function parsePayload(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function emitContinue(extra = {}) {
  try { process.stdout.write(JSON.stringify({ continue: true, ...extra })); }
  catch { /* swallow */ }
}

/**
 * Pure function — exported for unit tests. Decides whether the tool call
 * touched a watched directive file.
 */
export function extractDirectiveTarget(payload) {
  if (!payload || typeof payload !== "object") return null;
  const tool = payload.tool_name;
  if (tool !== "Write" && tool !== "Edit" && tool !== "MultiEdit") return null;

  const input = payload.tool_input;
  if (!input || typeof input !== "object") return null;
  const filePath = typeof input.file_path === "string" ? input.file_path : null;
  if (filePath === null) return null;

  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  if (!norm.includes("/state/shared/")) return null;
  if (!norm.includes("claude-codex-")) return null;
  if (!norm.endsWith(".md")) return null;
  return filePath;
}

async function loadEngine() {
  const candidate = fs.existsSync(ENGINE_BUILT) ? ENGINE_BUILT : null;
  if (!candidate) return null;
  try {
    const mod = await import(pathToFileURL(candidate).href);
    return mod.directiveSummarizerEngine ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const raw = readStdinSafe();
  const payload = parsePayload(raw);
  const target = extractDirectiveTarget(payload);

  if (target === null) {
    emitContinue({ refreshed: false, reason: "not_a_directive_write" });
    return;
  }

  const engine = await loadEngine();
  if (engine === null) {
    // Engine not built yet — degrade silently. The CLI script can be run
    // manually to populate the cache after the first build.
    emitContinue({ refreshed: false, reason: "engine_not_built" });
    return;
  }

  // Heuristic-only refresh (no network, fast)
  const result = await engine.buildAndPersist({ useOllama: false });
  emitContinue({
    refreshed: result.ok,
    target,
    total_files: result.cache.total_files,
    md_path: result.md_path,
  });
}

setTimeout(() => {
  emitContinue({ timeout: true });
  process.exit(0);
}, HARD_TIMEOUT_MS);

const __isMain = (() => {
  try {
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
    const self = new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/");
    return path.resolve(self) === argv1;
  } catch { return true; }
})();

if (__isMain) {
  main()
    .then(() => process.exit(0))
    .catch(() => { emitContinue(); process.exit(0); });
}
