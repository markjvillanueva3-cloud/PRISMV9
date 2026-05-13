// tier: T0
/**
 * critical-file-guard.mjs — Phase 0.16 Safety-Critical File Guard
 *
 * PreToolUse(Edit|Write|MultiEdit) hook that requires explicit
 * --confirm-critical flag (or CONFIRM_CRITICAL=true env) for edits to
 * Kienzle/Taylor/S(x) and other safety-critical files.
 *
 * Critical paths defined in state/shared/CRITICAL_FILES.json. Edits to
 * those paths without the confirm flag return {decision:"block"}.
 *
 * Both legacy export-default form (for adapter callers) and native
 * Claude-Code-protocol main() are exported. main() runs when invoked
 * directly, reading stdin JSON and writing JSON to stdout.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const CRITICAL_FILES_PATH = "state/shared/CRITICAL_FILES.json";

let criticalPatterns = null;

function loadCriticalPatterns() {
  if (criticalPatterns) return criticalPatterns;

  const configPath = path.join(process.cwd(), CRITICAL_FILES_PATH);
  if (!fs.existsSync(configPath)) {
    criticalPatterns = [];
    return criticalPatterns;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    criticalPatterns = config.criticalPaths || [];
  } catch {
    criticalPatterns = [];
  }

  return criticalPatterns;
}

function matchesGlob(filePath, glob) {
  // Simple glob matching (supports * and **)
  const regex = glob
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLESTAR}}/g, ".*")
    .replace(/\//g, "\\/");
  return new RegExp(`^${regex}$`).test(filePath);
}

function isCriticalFile(filePath) {
  const patterns = loadCriticalPatterns();
  for (const entry of patterns) {
    if (matchesGlob(filePath, entry.glob)) {
      return entry;
    }
  }
  return null;
}

export default async function criticalFileGuard({ tool, input }) {
  // Only check Write and Edit tools
  if (tool !== "Write" && tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) {
    return { allow: true };
  }

  // Normalize path for matching
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^[A-Z]:/, "");
  const relativePath = normalizedPath.replace(/^\/h\/prism\/?/i, "");

  const criticalEntry = isCriticalFile(relativePath);
  if (!criticalEntry) {
    return { allow: true };
  }

  // Check for bypass flag in the command/context
  const hasConfirmFlag = process.env.CONFIRM_CRITICAL === "true" ||
    input.confirmCritical === true;

  if (hasConfirmFlag) {
    // Log the confirmed critical edit
    console.log(`[CRITICAL-FILE-GUARD] Confirmed edit to: ${relativePath}`);
    console.log(`  Reason: ${criticalEntry.reason}`);
    return { allow: true };
  }

  // Block the edit
  return {
    allow: false,
    message: `
╔══════════════════════════════════════════════════════════════╗
║              CRITICAL FILE GUARD — Phase 0.16                 ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Edit to safety-critical file                        ║
║                                                              ║
║ File: ${relativePath.slice(0, 50).padEnd(50)}║
║ Reason: ${criticalEntry.reason.slice(0, 48).padEnd(48)}║
║                                                              ║
║ This file affects machining safety calculations.             ║
║ Changes require explicit confirmation.                        ║
║                                                              ║
║ To proceed, re-run with --confirm-critical flag              ║
║ or set CONFIRM_CRITICAL=true                                 ║
╚══════════════════════════════════════════════════════════════╝
`,
  };
}

// Hook metadata
export const metadata = {
  id: "critical-file-guard",
  phase: "0.16",
  priority: 5,
  dependsOn: [],
  event: "PreToolUse",
};

// Native Claude-Code-protocol main() — reads stdin JSON, writes JSON to stdout
function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function contentFromInput(toolName, toolInput) {
  if (toolName === "MultiEdit") {
    return (toolInput?.edits || []).map((e) => e?.file_path).filter(Boolean);
  }
  return [toolInput?.file_path || toolInput?.path].filter(Boolean);
}

async function main() {
  const raw = readStdinSafe();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }

  const toolName = payload?.tool_name || payload?.toolName || "";
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const toolInput = payload?.tool_input || payload?.toolInput || payload?.input || {};
  const filePaths = contentFromInput(toolName, toolInput);
  if (filePaths.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Bypass: env or input flag
  const hasConfirmFlag = process.env.CONFIRM_CRITICAL === "true" ||
    toolInput.confirmCritical === true;

  // Check each path; first critical hit wins
  for (const filePath of filePaths) {
    // Normalize: backslashes -> forward, then strip both Windows (H:/prism/)
    // and Unix (/h/prism/) repo prefixes so we end up with a path relative
    // to the repo root, which is what CRITICAL_FILES.json globs expect.
    const normalizedPath = String(filePath).replace(/\\/g, "/");
    const relativePath = normalizedPath
      .replace(/^[a-z]:\/prism\/?/i, "")   // H:/prism/ -> ""
      .replace(/^\/[a-z]\/prism\/?/i, "")  // /h/prism/ -> ""
      .replace(/^prism\/?/i, "");          // bare prism/ -> ""
    const criticalEntry = isCriticalFile(relativePath);
    if (!criticalEntry) continue;

    if (hasConfirmFlag) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: `[CRITICAL-FILE-GUARD] Confirmed edit to ${relativePath} (reason: ${criticalEntry.reason})`,
        },
      }));
      return;
    }

    // BLOCK
    const human = [
      "🛑 CRITICAL FILE GUARD — BLOCKED",
      "",
      `File: ${relativePath}`,
      `Reason: ${criticalEntry.reason}`,
      `Audit level: ${criticalEntry.auditLevel || "standard"}`,
      "",
      "This file affects machining safety calculations. Edits require explicit",
      "confirmation. To proceed, set CONFIRM_CRITICAL=true (one-shot) and retry,",
      "OR pass confirmCritical:true in the tool input.",
    ].join("\n");

    process.stdout.write(JSON.stringify({
      decision: "block",
      reason: human,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: human,
      },
    }));
    return;
  }

  // No critical match
  process.stdout.write(JSON.stringify({ continue: true }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main().catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }));
  });
}
