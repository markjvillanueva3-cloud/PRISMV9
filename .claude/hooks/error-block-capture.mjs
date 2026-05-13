#!/usr/bin/env node
// tier: T0
/**
 * error-block-capture — PostToolUse hook.
 *
 * Captures hook-block events and tool errors into the error-learn ledger so
 * future PreToolUse calls can pre-warn before repeating the same mistake.
 *
 * FIRES ON: PostToolUse (Write|Edit|MultiEdit|Bash)
 * BLOCKING: never — append-only learning, never blocks
 *
 * What gets captured:
 *   - tool_response containing decision:"block" (a hook above us blocked)
 *   - tool_response.error (tool itself failed)
 *   - exit codes != 0 from Bash (best-effort)
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  recordEvent,
  fingerprint,
  fileSuffix,
  ERROR_CLASSES,
} from "../helpers/error-learn-store.mjs";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function extractHookId(reasonText) {
  if (!reasonText || typeof reasonText !== "string") return null;
  // Pattern 1: "X HOOK ... BLOCKED" or named gate like "TEST LEGITIMACY GATE — BLOCKED"
  const blockMatch = reasonText.match(/([A-Z][A-Z- ]{3,40})\s*(?:GATE|HOOK|DETECTOR)\s*[—-]?\s*BLOCKED/i);
  if (blockMatch) return blockMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  // Pattern 2: explicit hook filename
  const fileMatch = reasonText.match(/([a-z0-9-]+)\.mjs/i);
  if (fileMatch) return fileMatch[1];
  return null;
}

function extractTrigger(reasonText) {
  if (!reasonText) return null;
  // Find lines starting with "•" or "[" — typical hook format
  const lines = reasonText.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/[•\-]\s*\[([a-z0-9-]+)\]/i);
    if (m) return m[1];
  }
  return null;
}

async function main() {
  if (_hp_shouldSkip("error-block-capture")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const raw = readStdinSafe();
  if (!raw) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const tool = payload.tool_name || payload.toolName || payload.tool || "";
  const input = payload.tool_input || payload.toolInput || payload.input || {};
  const response = payload.tool_response || payload.toolResponse || payload.response || {};

  // Detect block / error condition
  const decision = (typeof response === "object" && response !== null && response.decision) || null;
  const errorMessage = (typeof response === "object" && response !== null && (response.error || response.error_message)) || null;
  const stderrText = typeof response === "string" ? response : null;

  let errorClass = null;
  let reasonText = null;

  if (decision === "block") {
    errorClass = ERROR_CLASSES.HOOK_BLOCK;
    reasonText = (response && response.reason) || (response && response.message) || "";
  } else if (errorMessage) {
    errorClass = ERROR_CLASSES.TOOL_ERROR;
    reasonText = String(errorMessage);
  } else if (stderrText && /error|fail|exception/i.test(stderrText)) {
    errorClass = ERROR_CLASSES.TOOL_ERROR;
    reasonText = stderrText.slice(0, 600);
  }

  if (!errorClass) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Build the event
  const filePath = input.file_path || input.path || input.filePath || "";
  const content = input.content || input.new_string || input.command || "";
  recordEvent({
    tool,
    error_class: errorClass,
    hook_id: extractHookId(reasonText),
    file_suffix: fileSuffix(filePath),
    trigger: extractTrigger(reasonText),
    fingerprint: fingerprint(content || filePath || tool),
    snippet: reasonText.slice(0, 240),
  });

  console.log(JSON.stringify({ continue: true }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}

export const metadata = {
  id: "error-block-capture",
  event: "PostToolUse",
  matcher: "Write|Edit|MultiEdit|Bash",
  blocking: false,
};
