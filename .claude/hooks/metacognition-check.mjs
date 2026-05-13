// tier: T1
/**
 * metacognition-check.mjs — Phase 0.13 Metacognition Budget Check
 *
 * PreToolUse hook that tracks metacognition budget consumption.
 * Prevents infinite reflection loops by limiting cycles.
 */

import * as fs from "fs";
import * as path from "path";

const BUDGET_PATH = "mcp-server/data/state/METACOGNITION_BUDGET.json";
const DEFAULT_BUDGET = 5;

function loadBudget(basePath) {
  const budgetPath = path.join(basePath, BUDGET_PATH);
  if (fs.existsSync(budgetPath)) {
    try {
      return JSON.parse(fs.readFileSync(budgetPath, "utf-8"));
    } catch { /* fall through */ }
  }
  return { total: DEFAULT_BUDGET, used: 0, lastReset: new Date().toISOString() };
}

function saveBudget(basePath, budget) {
  const budgetPath = path.join(basePath, BUDGET_PATH);
  const dir = path.dirname(budgetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2));
}

export default async function metacognitionCheck({ tool, input }) {
  const basePath = process.cwd();

  // Only check tools that trigger reflection
  const reflectionTools = ["reflect", "analyze", "introspect"];
  const isReflection = reflectionTools.some(t => 
    tool?.toLowerCase().includes(t) || 
    input?.action?.toLowerCase().includes(t)
  );

  if (!isReflection) {
    return { allow: true };
  }

  // Load budget
  const budget = loadBudget(basePath);

  // Check if budget is exhausted
  if (budget.used >= budget.total) {
    return {
      allow: false,
      message: `
╔══════════════════════════════════════════════════════════════╗
║           METACOGNITION BUDGET EXHAUSTED — Phase 0.13         ║
╠══════════════════════════════════════════════════════════════╣
║ Reflection cycles used: ${budget.used}/${budget.total}                            ║
║                                                              ║
║ To prevent infinite reflection loops, metacognition is       ║
║ limited to ${budget.total} cycles per session.                            ║
║                                                              ║
║ Budget will reset on next session start.                     ║
╚══════════════════════════════════════════════════════════════╝
`
    };
  }

  // Consume budget
  budget.used += 1;
  saveBudget(basePath, budget);

  return {
    allow: true,
    message: `Metacognition: ${budget.used}/${budget.total} cycles used`
  };
}

// Hook metadata
export const metadata = {
  id: "metacognition-check",
  phase: "0.13",
  priority: 3,
  dependsOn: [],
  event: "PreToolUse"
};
