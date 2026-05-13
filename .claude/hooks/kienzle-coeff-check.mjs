// tier: T4
/**
 * kienzle-coeff-check.mjs — Phase 1 Tier 5C Physics Hook
 *
 * PreToolWrite hook that blocks edits to Kienzle coefficients
 * without physics-review-agent sign-off.
 */

import * as fs from "fs";
import * as path from "path";

const KIENZLE_PATTERNS = [
  /kienzle/i,
  /kc1\.1/i,
  /specificCuttingForce/i,
  /cuttingForceCoeff/i
];

const KIENZLE_FILES = [
  "physics/constants.ts",
  "engines/KienzleForceEngine.ts",
  "data/materials/kienzle-coefficients.json"
];

function isKienzleEdit(filePath, content) {
  const normalized = filePath.replace(/\\/g, "/");
  
  // Check if file is a known Kienzle file
  for (const kFile of KIENZLE_FILES) {
    if (normalized.endsWith(kFile)) return true;
  }
  
  // Check content for Kienzle patterns
  if (content) {
    for (const pattern of KIENZLE_PATTERNS) {
      if (pattern.test(content)) return true;
    }
  }
  
  return false;
}

export default async function kienzleCoeffCheck({ tool, input }) {
  if (tool !== "Write" && tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) return { allow: true };

  const newContent = input.content || input.new_string || "";
  
  if (!isKienzleEdit(filePath, newContent)) {
    return { allow: true };
  }

  // Check for physics-review bypass
  const hasReviewBypass = process.env.PHYSICS_REVIEW_APPROVED === "true";
  
  if (hasReviewBypass) {
    console.log(`[KIENZLE-CHECK] Physics review approved for: ${path.basename(filePath)}`);
    return { allow: true };
  }

  return {
    allow: false,
    message: `
╔══════════════════════════════════════════════════════════════╗
║            KIENZLE COEFFICIENT GUARD — Phase 1 Tier 5C        ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Edit to Kienzle cutting force coefficients          ║
║                                                              ║
║ File: ${path.basename(filePath).slice(0, 50).padEnd(50)}║
║                                                              ║
║ Kienzle coefficients affect machining safety calculations.   ║
║ Changes require physics-review-agent sign-off.               ║
║                                                              ║
║ To proceed:                                                  ║
║ 1. Run /physics-verify on the proposed change                ║
║ 2. Get S(x) score >= 0.85 for the modification               ║
║ 3. Set PHYSICS_REVIEW_APPROVED=true                          ║
╚══════════════════════════════════════════════════════════════╝
`
  };
}

export const metadata = {
  id: "kienzle-coeff-check",
  phase: "1",
  tier: "5C",
  priority: 1,
  event: "PreToolWrite"
};
