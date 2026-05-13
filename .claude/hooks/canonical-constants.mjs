// tier: T4
/**
 * canonical-constants.mjs — Phase 1 Tier 5C Physics Hook
 *
 * PreToolWrite hook that blocks physics formulas that bypass
 * the canonical constants.ts file.
 */

import * as path from "path";

const CONSTANTS_PATH = "src/physics/constants.ts";

const HARDCODED_PATTERNS = [
  /(?:const|let|var)\s+\w*(?:kienzle|taylor|kc1|vt\s*=)/i,
  /(?:const|let|var)\s+\w*(?:specificCuttingForce|toolLifeExponent)\s*=/i,
  /=\s*(?:1\.1|0\.25|0\.75)\s*[;,]?\s*\/\/.*(?:kc|taylor|exponent)/i
];

const PHYSICS_DIRS = [
  "/engines/",
  "/algorithms/",
  "/formulas/"
];

function isPhysicsFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return PHYSICS_DIRS.some(dir => normalized.includes(dir));
}

function hasHardcodedConstants(content) {
  if (!content) return false;
  
  for (const pattern of HARDCODED_PATTERNS) {
    if (pattern.test(content)) return true;
  }
  
  return false;
}

function importsConstants(content) {
  if (!content) return true;
  return content.includes("from") && content.includes("constants");
}

export default async function canonicalConstants({ tool, input }) {
  if (tool !== "Write" && tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) return { allow: true };

  // Only check physics-related files
  if (!isPhysicsFile(filePath)) {
    return { allow: true };
  }

  // Skip the constants file itself
  if (filePath.replace(/\\/g, "/").endsWith(CONSTANTS_PATH)) {
    return { allow: true };
  }

  const newContent = input.content || input.new_string || "";
  
  if (hasHardcodedConstants(newContent) && !importsConstants(newContent)) {
    return {
      allow: false,
      message: `
╔══════════════════════════════════════════════════════════════╗
║          CANONICAL CONSTANTS GUARD — Phase 1 Tier 5C          ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Hardcoded physics constants detected                ║
║                                                              ║
║ File: ${path.basename(filePath).slice(0, 50).padEnd(50)}║
║                                                              ║
║ Physics constants must come from:                            ║
║   src/physics/constants.ts                                   ║
║                                                              ║
║ Hardcoded values fragment the codebase and cause drift.      ║
║                                                              ║
║ To fix:                                                      ║
║ 1. Import constants from src/physics/constants.ts            ║
║ 2. If constant doesn't exist, add it there first             ║
║ 3. Reference the imported constant in your formula           ║
╚══════════════════════════════════════════════════════════════╝
`
    };
  }

  return { allow: true };
}

export const metadata = {
  id: "canonical-constants",
  phase: "1",
  tier: "5C",
  priority: 4,
  event: "PreToolWrite"
};
