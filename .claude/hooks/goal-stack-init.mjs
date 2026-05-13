// tier: T4
/**
 * goal-stack-init.mjs — Phase 0.13 Goal Stack Initialization
 *
 * SessionStart hook that loads and validates the goal stack.
 * Runs after awareness-bootstrap per HOOK_ORDER_REGISTRY.
 */

import * as fs from "fs";
import * as path from "path";

const GOAL_STACK_PATH = "mcp-server/data/state/GOAL_STACK.json";
const MAX_ACTIVE_GOALS = 5;

export default async function goalStackInit({ session }) {
  const basePath = process.cwd();
  const timestamp = new Date().toISOString();

  // Load goal stack
  const goalStackPath = path.join(basePath, GOAL_STACK_PATH);
  let goalStack = { goals: [], completedToday: 0 };

  if (fs.existsSync(goalStackPath)) {
    try {
      goalStack = JSON.parse(fs.readFileSync(goalStackPath, "utf-8"));
    } catch { /* use defaults */ }
  }

  // Prune completed goals older than 24h
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  goalStack.goals = goalStack.goals.filter(g => {
    if (g.status === "completed" && new Date(g.completedAt).getTime() < oneDayAgo) {
      return false;
    }
    return true;
  });

  // Validate active goal count
  const activeGoals = goalStack.goals.filter(g => g.status === "active");
  if (activeGoals.length > MAX_ACTIVE_GOALS) {
    console.warn(`[GOAL-STACK-INIT] Too many active goals: ${activeGoals.length}`);
  }

  // Update last activity
  goalStack.lastUpdated = timestamp;

  // Write back
  fs.writeFileSync(goalStackPath, JSON.stringify(goalStack, null, 2));

  // Format summary
  const activeCount = activeGoals.length;
  const pendingCount = goalStack.goals.filter(g => g.status === "pending").length;

  return {
    inject: {
      goalStack: {
        active: activeCount,
        pending: pendingCount,
        topGoal: activeGoals[0]?.name || null
      }
    },
    message: `Goals: ${activeCount} active, ${pendingCount} pending`
  };
}

// Hook metadata
export const metadata = {
  id: "goal-stack-init",
  phase: "0.13",
  priority: 2,
  dependsOn: ["awareness-bootstrap"],
  event: "SessionStart"
};
