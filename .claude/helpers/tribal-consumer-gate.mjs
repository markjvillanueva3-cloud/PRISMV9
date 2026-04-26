/**
 * tribal-consumer-gate.mjs — TK-MS5 U-TK26
 *
 * PreToolUse hook for Write/Edit to src/engines/*.ts files.
 * Checks for tribal knowledge posture declaration:
 *   tribal: consumer | producer | none (with justification)
 *
 * Soft gate (warning) for first 30 days, then hard block.
 * Tracks declared postures in KnowledgeConsumerRegistryEngine.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, basename } from "path";

const TOOL_INPUT = process.env.TOOL_INPUT || "{}";
const TOOL_NAME = process.env.TOOL_NAME || "";

// Gate enforcement date: 30 days after creation (2026-05-14)
const HARD_GATE_DATE = new Date("2026-05-14");
const isHardGate = new Date() >= HARD_GATE_DATE;

// Posture pattern: must appear in first 50 lines of file
const POSTURE_PATTERN = /^\s*\*?\s*tribal:\s*(consumer|producer|none)(?:\s*[-—–]\s*(.+))?/im;

// Files that are explicitly exempt (tests, types, index files)
const EXEMPT_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /types\.ts$/,
  /index\.ts$/,
  /\.d\.ts$/,
];

function main() {
  // Only run on Write/Edit to engine files
  if (!["Write", "Edit", "MultiEdit"].includes(TOOL_NAME)) {
    return;
  }

  let input;
  try {
    input = JSON.parse(TOOL_INPUT);
  } catch {
    return;
  }

  const filePath = input.file_path;
  if (!filePath) return;

  // Only check mcp-server/src/engines/*.ts files
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.includes("mcp-server/src/engines/") || !normalized.endsWith(".ts")) {
    return;
  }

  // Skip exempt files
  const fileName = basename(filePath);
  if (EXEMPT_PATTERNS.some(p => p.test(fileName))) {
    return;
  }

  // For new files (Write), check if content has posture
  if (TOOL_NAME === "Write" && input.content) {
    const first50Lines = input.content.split("\n").slice(0, 50).join("\n");
    const match = POSTURE_PATTERN.exec(first50Lines);

    if (!match) {
      emitWarning(fileName, "new file missing declaration");
      return;
    }

    // "none" posture requires justification
    if (match[1] === "none" && !match[2]) {
      emitWarning(fileName, "posture 'none' requires justification");
      return;
    }
    return;
  }

  // For Edit/MultiEdit, check existing file content
  if (!existsSync(filePath)) {
    return; // New file being created, will be checked on Write
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const first50Lines = content.split("\n").slice(0, 50).join("\n");
    const match = POSTURE_PATTERN.exec(first50Lines);

    if (!match) {
      emitWarning(fileName, "existing file missing declaration");
      return;
    }

    // "none" posture requires justification
    if (match[1] === "none" && !match[2]) {
      emitWarning(fileName, "posture 'none' requires justification");
      return;
    }

    // Valid posture found - no warning needed
  } catch (err) {
    // File read error - skip check
  }
}

function emitWarning(fileName, reason) {
  const action = isHardGate ? "BLOCKED" : "WARNING";
  const instruction = isHardGate
    ? "Add tribal posture declaration before editing."
    : "Add tribal posture declaration to file header.";

  const message = `[tribal-consumer-gate] ${action}: ${fileName} — ${reason}. ` +
    `${instruction} Format: "* tribal: consumer|producer|none — [justification if none]"`;

  if (isHardGate) {
    // Hard block - use decision: block
    process.stdout.write(JSON.stringify({
      decision: "block",
      reason: message
    }));
  } else {
    // Soft gate - just add context warning
    process.stdout.write(JSON.stringify({
      additionalContext: message
    }));
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
