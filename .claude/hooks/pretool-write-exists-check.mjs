#!/usr/bin/env node
// tier: T4
/**
 * pretool-write-exists-check.mjs — PreToolUse hook (Write/MultiEdit)
 *
 * TOKEN-SAVINGS-EXPAND/U-PSN-WRITE-EXISTS (gap-A5, 2026-05-23, slot:alpha)
 *
 * When operator/model invokes Write against an EXISTING file, suggest Edit
 * (or MultiEdit) instead. Whole-file Write rewrites N tokens of output;
 * Edit only sends the diff (kbs vs MBs for large files).
 *
 * Fires only on:
 *   - tool == Write
 *   - the target filePath exists
 *   - file size > WRITE_EXISTS_MIN_BYTES (don't nudge on tiny rewrites)
 *
 * Advisory only — never blocks. Knob: PRISM_WRITE_EXISTS_DISABLE=1.
 */

import { existsSync, statSync, readFileSync } from "node:fs";

// Below this size, a full rewrite is fine; the nudge is just noise.
const WRITE_EXISTS_MIN_BYTES = 4096;

/**
 * Pure: format the nudge text. Returns null when no nudge applies.
 * Exported for tests.
 */
export function formatWriteExistsNudge(toolName, filePath, fileSizeBytes) {
  if (toolName !== "Write") return null;
  if (!filePath || typeof filePath !== "string") return null;
  if (typeof fileSizeBytes !== "number" || fileSizeBytes < WRITE_EXISTS_MIN_BYTES) return null;
  const kb = Math.round(fileSizeBytes / 1024);
  return [
    `## ✏️ Write on existing file (${kb}KB) — consider Edit instead`,
    "",
    `\`${filePath}\` already exists. Write rewrites the entire file (\${kb}KB of output tokens); Edit sends only the diff (typically <100 bytes for targeted changes).`,
    "",
    "→ Use the `Edit` tool with `old_string`/`new_string` for targeted changes",
    "→ Use `MultiEdit` if you have 2+ independent changes in this file",
    "→ Whole-file Write is correct only when refactoring >50% of the file",
    "",
    "_Disable: `PRISM_WRITE_EXISTS_DISABLE=1`._",
  ].join("\n").replace("${kb}", String(kb));
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  if (process.env.PRISM_WRITE_EXISTS_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  if (toolName !== "Write") { pass(); return; }
  const filePath = String(toolInput.file_path || toolInput.filePath || "");
  if (!filePath || !existsSync(filePath)) { pass(); return; }

  let size = 0;
  try { size = statSync(filePath).size; } catch { pass(); return; }

  const nudge = formatWriteExistsNudge(toolName, filePath, size);
  if (!nudge) { pass(); return; }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: nudge },
  }));
}

export { WRITE_EXISTS_MIN_BYTES };

if (process.argv[1] && process.argv[1].endsWith("pretool-write-exists-check.mjs")) {
  main().catch(() => pass());
}
