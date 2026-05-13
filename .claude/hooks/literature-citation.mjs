// tier: T4
/**
 * literature-citation.mjs — Phase 1 Tier 5C Physics Hook
 *
 * PreToolWrite hook that requires literature references
 * for new physics formulas.
 */

import * as path from "path";

const FORMULA_PATTERNS = [
  /function\s+calculate\w*Force/i,
  /function\s+calculate\w*Power/i,
  /function\s+calculate\w*Torque/i,
  /function\s+calculate\w*Speed/i,
  /function\s+calculate\w*Feed/i,
  /formula\s*[:=]/i,
  /equation\s*[:=]/i
];

const CITATION_PATTERNS = [
  /\/\/.*(?:Ref|Reference|Source|From|See|Per|According):/i,
  /\/\/.*(?:\d{4})/,  // Year reference
  /\/\/.*(?:ISBN|DOI|pp\.|p\.)/i,
  /\/\*\*[\s\S]*?@(?:ref|source|citation)/i,
  /Kienzle\s*\(/i,
  /Taylor\s*\(/i,
  /Merchant\s*\(/i
];

function isPhysicsFormula(content) {
  if (!content) return false;
  return FORMULA_PATTERNS.some(p => p.test(content));
}

function hasCitation(content) {
  if (!content) return false;
  return CITATION_PATTERNS.some(p => p.test(content));
}

export default async function literatureCitation({ tool, input }) {
  if (tool !== "Write" && tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) return { allow: true };

  const normalized = filePath.replace(/\\/g, "/");
  
  // Only check physics/formula files
  if (!normalized.includes("/engines/") && 
      !normalized.includes("/formulas/") &&
      !normalized.includes("/physics/")) {
    return { allow: true };
  }

  const newContent = input.content || input.new_string || "";
  
  // Only check if this looks like a physics formula
  if (!isPhysicsFormula(newContent)) {
    return { allow: true };
  }

  if (!hasCitation(newContent)) {
    return {
      allow: false,
      message: `
╔══════════════════════════════════════════════════════════════╗
║          LITERATURE CITATION GUARD — Phase 1 Tier 5C          ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Physics formula without literature reference        ║
║                                                              ║
║ File: ${path.basename(filePath).slice(0, 50).padEnd(50)}║
║                                                              ║
║ All physics formulas must cite their source.                 ║
║                                                              ║
║ Required citation format (in comment):                       ║
║   // Ref: Author (Year), Title, pp. X-Y                      ║
║   // Source: Kienzle (1952), Machining Handbook              ║
║   // Per: Merchant's Circle analysis                         ║
║                                                              ║
║ This ensures traceability and verification.                  ║
╚══════════════════════════════════════════════════════════════╝
`
    };
  }

  return { allow: true };
}

export const metadata = {
  id: "literature-citation",
  phase: "1",
  tier: "5C",
  priority: 5,
  event: "PreToolWrite"
};
