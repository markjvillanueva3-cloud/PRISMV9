// tier: T0
/**
 * dep-graph-impact.mjs — Phase 1 Tier 5D
 *
 * PreTool hook that requires impact review for changes to
 * high-fanout files (many dependents).
 */

import * as fs from "fs";
import * as path from "path";

const DEP_GRAPH_PATH = "mcp-server/data/state/dependency-graph.json";
const HIGH_FANOUT_THRESHOLD = 10; // More than 10 dependents = high impact

function getRelativePath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^.*mcp-server\//, "mcp-server/");
}

export default async function depGraphImpact({ tool, input }) {
  // Only check Edit tool for source files
  if (tool !== "Edit") return undefined;

  const filePath = input?.file_path || input?.path || "";
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) return undefined;

  // Skip test files
  if (filePath.includes("__tests__") || filePath.includes(".test.")) return undefined;

  const depGraphPath = path.join(process.cwd(), DEP_GRAPH_PATH);
  if (!fs.existsSync(depGraphPath)) return undefined;

  try {
    const graph = JSON.parse(fs.readFileSync(depGraphPath, "utf-8"));
    const relativePath = getRelativePath(filePath);

    // Find dependents of this file
    const dependents = graph.edges?.filter(e => e.target === relativePath) || [];
    const dependentCount = dependents.length;

    if (dependentCount >= HIGH_FANOUT_THRESHOLD) {
      // Check for bypass flag
      if (process.env.BYPASS_DEP_IMPACT === "true") {
        return undefined;
      }

      const topDependents = dependents.slice(0, 5).map(d => d.source);

      return {
        decision: "block",
        reason: `
╔══════════════════════════════════════════════════════════════╗
║           DEPENDENCY IMPACT — Phase 1 Tier 5D                 ║
╠══════════════════════════════════════════════════════════════╣
║ HIGH IMPACT: ${dependentCount} files depend on this file                      ║
║                                                              ║
║ File: ${path.basename(filePath).slice(0,50).padEnd(50)}║
║                                                              ║
║ Top dependents:                                              ║
${topDependents.map(d => `║  - ${d.slice(0,52).padEnd(52)}║`).join("\n")}
║                                                              ║
║ This change may have wide ripple effects.                    ║
║ Review impact before proceeding.                             ║
║                                                              ║
║ Set BYPASS_DEP_IMPACT=true to proceed after review.          ║
╚══════════════════════════════════════════════════════════════╝
`
      };
    }
  } catch {
    // Parse error, allow
  }

  return undefined;
}

export const metadata = {
  id: "dep-graph-impact",
  phase: "1.5D",
  priority: 55,
  event: "PreTool"
};
