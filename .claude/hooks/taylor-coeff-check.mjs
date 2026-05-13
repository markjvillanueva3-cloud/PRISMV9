// tier: T4
/**
 * taylor-coeff-check.mjs — Phase 1 Tier 5C Physics Hook
 *
 * PreToolWrite hook that blocks edits to Taylor tool life coefficients
 * without physics-review-agent sign-off.
 */

import * as path from "path";

const TAYLOR_PATTERNS = [
  /taylor/i,
  /toolLife/i,
  /VT.*=.*C/i,
  /exponentN/i,
  /toolWearCoeff/i
];

const TAYLOR_FILES = [
  "physics/constants.ts",
  "engines/TaylorToolLifeEngine.ts",
  "data/tools/taylor-coefficients.json"
];

function isTaylorEdit(filePath, content) {
  const normalized = filePath.replace(/\\/g, "/");
  
  for (const tFile of TAYLOR_FILES) {
    if (normalized.endsWith(tFile)) return true;
  }
  
  if (content) {
    for (const pattern of TAYLOR_PATTERNS) {
      if (pattern.test(content)) return true;
    }
  }
  
  return false;
}

export default async function taylorCoeffCheck({ tool, input }) {
  if (tool !== "Write" && tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) return { allow: true };

  const newContent = input.content || input.new_string || "";
  
  if (!isTaylorEdit(filePath, newContent)) {
    return { allow: true };
  }

  const hasReviewBypass = process.env.PHYSICS_REVIEW_APPROVED === "true";
  
  if (hasReviewBypass) {
    console.log(`[TAYLOR-CHECK] Physics review approved for: ${path.basename(filePath)}`);
    return { allow: true };
  }

  return {
    allow: false,
    message: `
╔══════════════════════════════════════════════════════════════╗
║            TAYLOR COEFFICIENT GUARD — Phase 1 Tier 5C         ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Edit to Taylor tool life coefficients               ║
║                                                              ║
║ File: ${path.basename(filePath).slice(0, 50).padEnd(50)}║
║                                                              ║
║ Taylor coefficients affect tool life predictions.            ║
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
  id: "taylor-coeff-check",
  phase: "1",
  tier: "5C",
  priority: 2,
  event: "PreToolWrite"
};
