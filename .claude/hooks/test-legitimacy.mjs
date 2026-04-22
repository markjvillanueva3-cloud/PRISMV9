/**
 * test-legitimacy.mjs — Phase 1 Tier 5D Workflow Hook
 * Blocks placeholder tests with no real assertions.
 */

import * as path from "path";

const PLACEHOLDER_PATTERNS = [
  /expect\(true\)\.toBe\(true\)/,
  /expect\(1\)\.toBe\(1\)/,
  /it\s*\(['"]\s*should\s+(?:work|pass)\s*['"]\s*,\s*\(\)\s*=>\s*\{\s*\}\s*\)/
];

function isTestFile(filePath) {
  return filePath && (filePath.includes(".test.") || filePath.includes(".spec."));
}

export default async function testLegitimacy({ tool, input }) {
  if (tool !== "Write" && tool !== "Edit") return { allow: true };
  const filePath = input.file_path || input.path;
  if (!filePath || !isTestFile(filePath)) return { allow: true };
  
  const content = input.content || input.new_string || "";
  if (PLACEHOLDER_PATTERNS.some(p => p.test(content))) {
    return { allow: false, message: `TEST LEGITIMACY: Placeholder test detected in ${path.basename(filePath)}. Write real assertions.` };
  }
  return { allow: true };
}

export const metadata = { id: "test-legitimacy", phase: "1", tier: "5D", event: "PreToolWrite" };
