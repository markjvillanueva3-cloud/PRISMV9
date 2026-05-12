#!/usr/bin/env node
/**
 * auto-lint-post-edit.mjs — PostToolUse hook (Edit|Write|MultiEdit, via posttool-edit-bundle)
 *
 * Runs `eslint --fix` on edited TypeScript files in mcp-server/src — but DETACHED
 * (fire-and-forget). PostToolUse hooks delay the tool *result* getting back to
 * Claude, so a synchronous eslint run (cold start + large file = up to several
 * seconds) used to add that latency to *every* `.ts` Edit's round-trip. Now the
 * hook returns in ~10 ms; eslint's `--fix` still happens in the background, and
 * its diagnostics are written to `.claude/cache/lint/<basename>.log` for anyone
 * who wants them (a build / `npm run lint` / tsc gate catches real errors anyway).
 *
 * If you want the inline lint feedback back, set PRISM_LINT_INLINE=1 — then the
 * hook waits (bounded ~3 s) and emits the diagnostics as additionalContext like
 * the old behavior.
 *
 * Exit always 0 — never blocks an edit.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, openSync, closeSync } from "node:fs";
import path from "node:path";

function bail() { process.exit(0); }

let hookInput = {};
try { hookInput = JSON.parse(readFileSync(0, "utf-8")); } catch { bail(); }

const toolInput = hookInput.tool_input || {};
const filePath = toolInput.file_path || toolInput.filePath || hookInput.file_path || "";

// Only TypeScript files inside mcp-server/src
if (!filePath || !/\.(ts|tsx)$/i.test(filePath)) bail();
if (!filePath.includes("mcp-server") || !filePath.includes("/src/")) bail();

const absPath = path.resolve(filePath);
if (!existsSync(absPath)) bail();

const mcpRoot = absPath.replace(/[/\\]mcp-server[/\\].*$/, "/mcp-server");
const eslintBin = path.join(mcpRoot, "node_modules", "eslint", "bin", "eslint.js");
const useDirect = existsSync(eslintBin);
const eslintArgs = ["--fix", "--quiet", "--format", "compact", "--max-warnings", "0", absPath];
const runCmd = useDirect ? process.execPath : "npx";
const runArgs = useDirect ? [eslintBin, ...eslintArgs] : ["eslint", ...eslintArgs];

const INLINE = process.env.PRISM_LINT_INLINE === "1";

if (!INLINE) {
  // Fire-and-forget: eslint --fix runs in the background, output -> log file.
  try {
    const logDir = path.resolve("H:/prism/.claude/cache/lint");
    mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, `${path.basename(absPath)}.log`);
    const out = openSync(logPath, "w");
    const child = spawn(runCmd, runArgs, {
      cwd: mcpRoot,
      stdio: ["ignore", out, out],
      windowsHide: true,
      detached: true,
      shell: !useDirect, // npx fallback needs a shell on Windows
    });
    child.on("error", () => {});
    child.unref();
    try { closeSync(out); } catch { /* child holds its own dup */ }
  } catch { /* best-effort */ }
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

// INLINE mode (opt-in) — bounded synchronous run, emit diagnostics.
import("node:child_process").then(({ execFileSync }) => {
  try {
    const result = execFileSync(runCmd, runArgs, {
      cwd: mcpRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      timeout: 3000, shell: !useDirect,
    });
    if (result.trim()) {
      console.log(`[LINT] ${path.basename(absPath)}:`);
      console.log(result.trim());
    }
  } catch (err) {
    if (err.stdout?.trim()) { console.log(`[LINT ERROR] ${path.basename(absPath)}:`); console.log(err.stdout.trim()); }
    if (err.stderr?.trim() && !err.stderr.includes("Oops!")) console.error(err.stderr.trim());
  }
  process.exit(0);
});
