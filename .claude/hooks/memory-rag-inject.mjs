#!/usr/bin/env node
// tier: T2
/**
 * memory-rag-inject.mjs — UserPromptSubmit hook
 *
 * When the user prompt contains memory-recall keywords (remember, recall,
 * previous, last time, earlier, prior, before, context from), surface the
 * most relevant entries from the H-drive vault (knowledge/memories/ +
 * knowledge/tribal/) and inject them as additional context.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P3-U05.
 *
 * Wired via H:/.claude/settings.json under the UserPromptSubmit hooks list.
 *
 * Failure mode: never blocks the user prompt. On any error, emits
 * `{continue: true}` and exits 0. The hook is read-only: pure scan of
 * vault entries already on disk (no LLM calls, no Qdrant).
 *
 * Skip cases:
 *   - PRISM_MEMORY_RAG_DISABLED=1 (escape hatch)
 *   - prompt has no memory-recall keyword (no injection, but no block)
 *   - vault dirs missing (silent skip)
 *
 * Output:
 *   Claude Code's hookSpecificOutput.additionalContext is the inject
 *   surface for UserPromptSubmit. We render the top-K excerpts as
 *   markdown there so they appear above the user prompt in the
 *   conversation context.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE_DIST_CANDIDATES = [
  "H:/prism/mcp-server/dist/engines/ObsidianMemoryRagEngine.js",
  "H:/prism-iooms0/mcp-server/dist/engines/ObsidianMemoryRagEngine.js",
];
const ENGINE_SRC_CANDIDATES = [
  "H:/prism/mcp-server/src/engines/ObsidianMemoryRagEngine.ts",
  "H:/prism-iooms0/mcp-server/src/engines/ObsidianMemoryRagEngine.ts",
];
const TSX_CANDIDATES = [
  "H:/prism/mcp-server/node_modules/.bin/tsx.cmd",
  "H:/prism-iooms0/mcp-server/node_modules/.bin/tsx.cmd",
  "H:/prism/mcp-server/node_modules/.bin/tsx",
  "H:/prism-iooms0/mcp-server/node_modules/.bin/tsx",
];
const LOG_FILE = "H:/prism/state/shared/memory-rag-inject.log";
const HOOK_TIMEOUT_MS = 4_000; // total budget for the hook

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

function emitContinue(additionalContext) {
  try {
    const payload = additionalContext
      ? { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } }
      : { continue: true };
    process.stdout.write(JSON.stringify(payload));
  } catch { /* swallow */ }
}

function firstExisting(candidates) {
  for (const c of candidates) {
    try { if (existsSync(c)) return c; } catch { /* ignore */ }
  }
  return null;
}

async function readStdin() {
  return await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 200); // 200ms cap on stdin read
  });
}

function extractPrompt(payload) {
  if (typeof payload?.prompt === "string") return payload.prompt;
  if (typeof payload?.user_prompt === "string") return payload.user_prompt;
  if (typeof payload?.message === "string") return payload.message;
  return null;
}

async function runQueryViaTsx(tsx, src, prompt) {
  return await new Promise((resolve) => {
    const bootstrapPath = join(tmpdir(), `mem-rag-bootstrap-${process.pid}-${Date.now()}.mts`);
    const code = [
      `import { obsidianMemoryRagEngine } from ${JSON.stringify(pathToFileURL(src).href)};`,
      `const r = obsidianMemoryRagEngine.query({ query: ${JSON.stringify(prompt)} });`,
      `process.stdout.write(JSON.stringify({ ok: r.ok, triggered: r.triggered, scanned: r.scanned, hitCount: r.hits.length, formatted: obsidianMemoryRagEngine.formatForInjection(r), durationMs: r.durationMs }));`,
    ].join("\n");
    try { writeFileSync(bootstrapPath, code, "utf-8"); }
    catch (e) {
      log(`bootstrap write failed: ${e?.message ?? e}`);
      resolve(null);
      return;
    }

    const isWindows = process.platform === "win32";
    const cmdExe = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\cmd.exe`;
    const exe = isWindows ? cmdExe : tsx;
    const args = isWindows ? ["/c", tsx, bootstrapPath] : [bootstrapPath];

    let child;
    try {
      child = spawn(exe, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false });
    } catch (e) {
      log(`spawn failed: ${e?.message ?? e}`);
      try { unlinkSync(bootstrapPath); } catch { /* ignore */ }
      resolve(null);
      return;
    }
    let stdout = "";
    child.stdout.on("data", (c) => { stdout += c.toString("utf-8"); });
    child.stderr.on("data", () => {});
    const timer = setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, HOOK_TIMEOUT_MS - 500);
    child.on("close", () => {
      clearTimeout(timer);
      try { unlinkSync(bootstrapPath); } catch { /* ignore */ }
      try { resolve(JSON.parse(stdout)); }
      catch { resolve(null); }
    });
  });
}

async function runQueryViaDist(distPath, prompt) {
  try {
    const mod = await import(pathToFileURL(distPath).href);
    const eng = mod.obsidianMemoryRagEngine;
    if (!eng?.query) return null;
    const r = eng.query({ query: prompt });
    return {
      ok: r.ok,
      triggered: r.triggered,
      scanned: r.scanned,
      hitCount: r.hits.length,
      formatted: eng.formatForInjection(r),
      durationMs: r.durationMs,
    };
  } catch (e) {
    log(`dist load failed: ${e?.message ?? e}`);
    return null;
  }
}

async function main() {
  if (process.env.PRISM_MEMORY_RAG_DISABLED === "1") {
    log("disabled via PRISM_MEMORY_RAG_DISABLED=1");
    emitContinue();
    return;
  }

  const raw = await readStdin();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { /* ignore */ }
  const prompt = extractPrompt(payload);
  if (!prompt || prompt.length < 10) {
    emitContinue();
    return;
  }

  const distPath = firstExisting(ENGINE_DIST_CANDIDATES);
  let result = null;
  if (distPath) {
    result = await runQueryViaDist(distPath, prompt);
  }
  if (!result) {
    const srcPath = firstExisting(ENGINE_SRC_CANDIDATES);
    const tsx = firstExisting(TSX_CANDIDATES);
    if (srcPath && tsx) {
      result = await runQueryViaTsx(tsx, srcPath, prompt);
    }
  }

  if (!result || !result.triggered || result.hitCount === 0) {
    emitContinue();
    if (result) log(`triggered=${result.triggered} hits=${result.hitCount} scanned=${result.scanned} ms=${result.durationMs}`);
    return;
  }

  log(`triggered=true hits=${result.hitCount} scanned=${result.scanned} ms=${result.durationMs}`);
  emitContinue(result.formatted);
}

setTimeout(() => { emitContinue(); process.exit(0); }, HOOK_TIMEOUT_MS);

main()
  .then(() => process.exit(0))
  .catch((e) => { log(`unhandled: ${e?.message ?? e}`); emitContinue(); process.exit(0); });
