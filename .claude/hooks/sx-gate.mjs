// tier: T4
/**
 * sx-gate.mjs — Phase 1 Tier 5C Physics Hook
 *
 * PreToolWrite hook that HARD BLOCKS any write when
 * safety score S(x) < 0.70 for the affected file.
 */

import * as fs from "fs";
import * as path from "path";

const SX_THRESHOLD = 0.70;
const SX_SCORES_PATH = "state/shared/QUALITY_SCORES.json";

const SAFETY_CRITICAL_PATTERNS = [
  /Force/i,
  /Cutting/i,
  /Speed/i,
  /Feed/i,
  /Spindle/i,
  /Tool.*Life/i,
  /Collision/i,
  /Safety/i,
  /physics/i
];

function isSafetyCritical(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  
  // Check if in engines directory with safety-related name
  if (normalized.includes("/engines/")) {
    for (const pattern of SAFETY_CRITICAL_PATTERNS) {
      if (pattern.test(normalized)) return true;
    }
  }
  
  // Physics directory is always critical
  if (normalized.includes("/physics/")) return true;
  
  return false;
}

function getSxScore(filePath) {
  try {
    const basePath = process.cwd();
    const scoresPath = path.join(basePath, SX_SCORES_PATH);
    
    if (!fs.existsSync(scoresPath)) return 1.0; // Default to safe if no scores
    
    const scores = JSON.parse(fs.readFileSync(scoresPath, "utf-8"));
    const normalized = filePath.replace(/\\/g, "/");
    const fileName = path.basename(normalized);
    
    // Look up score by filename
    if (scores.files && scores.files[fileName]) {
      return scores.files[fileName].sx || 1.0;
    }
    
    return 1.0; // Default if not found
  } catch {
    return 1.0;
  }
}

export default async function sxGate({ tool, input }) {
  if (tool !== "Write" && tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) return { allow: true };

  // Only check safety-critical files
  if (!isSafetyCritical(filePath)) {
    return { allow: true };
  }

  const sxScore = getSxScore(filePath);
  
  if (sxScore >= SX_THRESHOLD) {
    return { allow: true };
  }

  return {
    allow: false,
    message: `
╔══════════════════════════════════════════════════════════════╗
║                S(x) SAFETY GATE — Phase 1 Tier 5C             ║
╠══════════════════════════════════════════════════════════════╣
║ HARD BLOCK: Safety score below threshold                     ║
║                                                              ║
║ File: ${path.basename(filePath).slice(0, 50).padEnd(50)}║
║ S(x) Score: ${sxScore.toFixed(2)} (threshold: ${SX_THRESHOLD})                          ║
║                                                              ║
║ This file affects machining safety calculations.             ║
║ Cannot proceed until safety score >= ${SX_THRESHOLD}.                  ║
║                                                              ║
║ To fix:                                                      ║
║ 1. Run /physics-verify to identify issues                    ║
║ 2. Address all safety concerns                               ║
║ 3. Re-run verification until S(x) >= ${SX_THRESHOLD}                   ║
╚══════════════════════════════════════════════════════════════╝
`
  };
}

export const metadata = {
  id: "sx-gate",
  phase: "1",
  tier: "5C",
  priority: 3,
  event: "PreToolWrite"
};
