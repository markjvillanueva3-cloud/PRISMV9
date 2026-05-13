#!/usr/bin/env node
// tier: T4
/**
 * wedm-physics-constants-gate — Forge-Triple Protective Hook
 *
 * BLOCKS any Write/Edit to EDM engine files that inline physics constants
 * instead of importing from src/physics/constants.ts EDM section.
 *
 * Detects patterns like:
 *   const K1 = 4.8;           // inline DiBitonto constant
 *   const k_ra = 0.38;        // inline Klocke constant
 *   const eta = 0.40;         // inline Kunieda efficiency
 *   alpha_mm2s = 7.0          // inline thermal diffusivity
 *
 * ALLOWS:
 *   - physics/constants.ts itself (that's WHERE constants live)
 *   - Test files (they may define test fixtures)
 *   - wedm-published-conditions.ts / wedm-published-machines.ts (data files)
 *   - WEDMCompleteOrchestrationEngine.ts (orchestrator has lookup tables until constants.ts is populated)
 *
 * Part of WEDM-100PCT-MS0 forge-triple:
 *   Hook: wedm-physics-constants-gate (this file)
 *   Action: prism_edm:wedm_generate_complete_program
 *   Skill: /wedm-program
 */

import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const _raw = readStdinSafe();
if (!_raw) { process.exit(0); }

let data;
try {
  data = JSON.parse(_raw);
} catch {
  process.exit(0);
}

const toolName = data?.tool_name || "";
const filePath = (data?.tool_input?.file_path || data?.tool_input?.path || "").replace(/\\/g, "/");
const content = data?.tool_input?.content || data?.tool_input?.new_string || "";

// Only check Write/Edit to engine files
if (!["Write", "Edit", "MultiEdit"].includes(toolName)) {
  process.exit(0);
}

// Skip non-engine files
if (!filePath.includes("/engines/")) {
  process.exit(0);
}

// Skip allowed files
const ALLOWED_FILES = [
  "physics/constants.ts",
  "wedm-published-conditions.ts",
  "wedm-published-machines.ts",
  "WEDMCompleteOrchestrationEngine.ts",  // Orchestrator has lookup tables pending constants.ts migration
  "__tests__/",
  ".test.ts",
];

if (ALLOWED_FILES.some(f => filePath.includes(f))) {
  process.exit(0);
}

// Check for inline EDM physics constants
const INLINE_PATTERNS = [
  // DiBitonto crater constant
  { pattern: /(?:const|let|var)\s+K1\s*=\s*[\d.]+/i, name: "DiBitonto K1" },
  // Klocke Ra prefactor (only flag if it's a bare constant assignment, not a lookup)
  { pattern: /(?:const|let|var)\s+k_ra\s*=\s*0?\.\d+/i, name: "Klocke k_ra" },
  // Kunieda efficiency
  { pattern: /(?:const|let|var)\s+eta\s*=\s*0?\.\d+/i, name: "Kunieda eta" },
  // Inline thermal diffusivity for specific materials
  { pattern: /alpha_mm2s\s*[:=]\s*(?:7\.0|4\.0|69\.0|24\.2|2\.9|3\.1|112\.3)\b/, name: "thermal diffusivity" },
  // Energy cascade factor
  { pattern: /(?:const|let|var)\s+gamma\s*=\s*0?\.\d+.*(?:energy|cascade)/i, name: "energy cascade gamma" },
];

const violations = [];
for (const { pattern, name } of INLINE_PATTERNS) {
  if (pattern.test(content)) {
    violations.push(name);
  }
}

if (violations.length > 0) {
  const msg = `WEDM Physics Constants Gate: Found inline EDM constant(s) [${violations.join(", ")}] in ${filePath.split("/").pop()}. Import from src/physics/constants.ts EDM section instead. See WEDM-100PCT-MS0 forge-triple.`;
  // Output as warning (not blocking until constants.ts EDM section exists)
  console.log(JSON.stringify({
    decision: "warn",
    reason: msg,
  }));
} else {
  process.exit(0);
}
