/**
 * critical-file-guard.mjs — Phase 0.16 Safety-Critical File Guard
 *
 * PreToolWrite hook that requires explicit --confirm-critical flag
 * for edits to Kienzle/Taylor/S(x) and other safety-critical files.
 */

import * as fs from "fs";
import * as path from "path";

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
  event: "PreToolWrite",
};
