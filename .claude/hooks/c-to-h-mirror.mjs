#!/usr/bin/env node
/**
 * c-to-h-mirror.mjs — PostToolUse hook
 *
 * After any Write/Edit/MultiEdit touches a CLI-owned root file on C:\Users\*\.claude\,
 * mirror it to H:\.claude\ so the portable drive stays canonical.
 *
 * Mirrored files: settings.json, settings.local.json, .mcp.json, CLAUDE.md, keybindings.json
 *
 * Rationale: H:\.claude\ is the portable master (travels between machines). C: exists
 * only because Claude CLI reads from $HOME/.claude at runtime. Keep them in lock-step.
 *
 * Input: JSON on stdin { tool_name, tool_input, tool_response? }
 * Output: never blocks. Emits a short suggestion message if a mirror happened.
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, basename } from "node:path";
import { exit } from "node:process";

let input = "";
try {
  input = readFileSync(0, "utf-8");
} catch {
  exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
const toolInput = payload?.tool_input || payload?.input || {};

// Only act on Write/Edit-style tools
const writeTools = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
if (!writeTools.has(tool)) exit(0);

const filePath =
  toolInput.file_path || toolInput.path || toolInput.notebook_path || "";
if (!filePath) exit(0);

// Normalize to forward slashes
const norm = filePath.replace(/\\/g, "/");

// Is this a CLI-owned root file under C:\Users\*\.claude\ ?
// Match:  C:/Users/<user>/.claude/<file>   or   /c/Users/<user>/.claude/<file>
const re = /^(?:[cC]:\/Users\/([^/]+)\/\.claude\/|\/c\/Users\/([^/]+)\/\.claude\/)([^/]+)$/;
const match = norm.match(re);
if (!match) exit(0);

const fileName = match[3];
const MIRRORED = new Set([
  "settings.json",
  "settings.local.json",
  ".mcp.json",
  "CLAUDE.md",
  "keybindings.json",
]);
if (!MIRRORED.has(fileName)) exit(0);

const src = filePath.replace(/\\/g, "/");
const dst = `H:/.claude/${fileName}`;

try {
  if (!existsSync(dirname(dst))) {
    mkdirSync(dirname(dst), { recursive: true });
  }
  // Only mirror if src exists and differs from dst
  if (!existsSync(src)) exit(0);
  let needsCopy = true;
  if (existsSync(dst)) {
    try {
      const srcBuf = readFileSync(src);
      const dstBuf = readFileSync(dst);
      if (srcBuf.equals(dstBuf)) needsCopy = false;
    } catch {
      needsCopy = true;
    }
  }
  if (!needsCopy) exit(0);
  copyFileSync(src, dst);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `[c-to-h-mirror] ${fileName} mirrored C: → H: (H: is canonical master)`,
      },
    }),
  );
} catch (err) {
  // Non-blocking: log the failure but don't disrupt the tool flow
  process.stderr.write(`[c-to-h-mirror] mirror failed for ${fileName}: ${err?.message || err}\n`);
}

exit(0);
