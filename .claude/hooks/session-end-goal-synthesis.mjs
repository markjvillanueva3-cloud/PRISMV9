#!/usr/bin/env node
// tier: T4
/**
 * session-end-goal-synthesis.mjs — U-AI04 Autonomous Goal Synthesis
 *
 * Analyzes session activity and proposes goals for the next session.
 * Runs on Stop event to seed the handoff with actionable next steps.
 *
 * Target: ≥80% actionability on proposed goals.
 */

import * as fs from "fs";
import * as path from "path";

const PREDICTIONS_FILE = "H:/prism/mcp-server/data/state/WORLD_SIM_PREDICTIONS.jsonl";
const CAUSAL_GRAPH_FILE = "H:/prism/mcp-server/data/state/CAUSAL_GRAPH.json";
const GOALS_FILE = "H:/prism/mcp-server/data/state/SYNTHESIZED_GOALS.json";
const HANDOFF_DIR = "H:/prism/state/shared";

function loadPredictions() {
  try {
    if (!fs.existsSync(PREDICTIONS_FILE)) return [];
    const content = fs.readFileSync(PREDICTIONS_FILE, "utf-8");
    return content.trim().split("\n").filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

function loadCausalGraph() {
  try {
    if (!fs.existsSync(CAUSAL_GRAPH_FILE)) return null;
    return JSON.parse(fs.readFileSync(CAUSAL_GRAPH_FILE, "utf-8"));
  } catch { return null; }
}

function analyzeSessionActivity(predictions) {
  const toolCounts = {};
  const failures = [];
  const highRiskOps = [];

  for (const pred of predictions) {
    toolCounts[pred.tool] = (toolCounts[pred.tool] || 0) + 1;

    if (pred.outcome === false) {
      failures.push(pred);
    }
    if (pred.risk === "high") {
      highRiskOps.push(pred);
    }
  }

  return { toolCounts, failures, highRiskOps, totalOps: predictions.length };
}

function synthesizeGoals(activity, causalGraph) {
  const goals = [];

  // Goal 1: Address failures
  if (activity.failures.length > 0) {
    const failedTools = [...new Set(activity.failures.map((f) => f.tool))];
    goals.push({
      id: "fix-failures",
      priority: 1,
      text: `Investigate ${activity.failures.length} failed operations (${failedTools.join(", ")})`,
      actionable: true,
      reasoning: "Failures from this session need resolution",
      suggestedActions: activity.failures.slice(0, 3).map((f) => f.inputSummary?.slice(0, 100)),
    });
  }

  // Goal 2: Complete high-risk operations more safely
  if (activity.highRiskOps.length > 0) {
    goals.push({
      id: "review-high-risk",
      priority: 2,
      text: `Review ${activity.highRiskOps.length} high-risk operations for safety`,
      actionable: true,
      reasoning: "High-risk operations detected - ensure proper validation",
    });
  }

  // Goal 3: Leverage causal insights
  if (causalGraph && causalGraph.nodeCount >= 5) {
    const topDrivers = causalGraph.edges
      ?.filter((e) => e.weight > 0.5)
      ?.slice(0, 3)
      ?.map((e) => e.from) || [];

    if (topDrivers.length > 0) {
      goals.push({
        id: "optimize-workflow",
        priority: 3,
        text: `Optimize key workflow drivers: ${topDrivers.join(", ")}`,
        actionable: true,
        reasoning: "Causal analysis identified these as high-impact nodes",
      });
    }
  }

  // Goal 4: Continue momentum on active tools
  const sortedTools = Object.entries(activity.toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (sortedTools.length > 0 && activity.totalOps > 10) {
    goals.push({
      id: "continue-work",
      priority: 4,
      text: `Continue work on primary activities (${sortedTools.map(([t]) => t).join(", ")})`,
      actionable: true,
      reasoning: `Session focused on these tools (${sortedTools.map(([t, c]) => `${t}:${c}`).join(", ")})`,
    });
  }

  // Goal 5: Default exploration goal
  if (goals.length === 0) {
    goals.push({
      id: "explore-roadmap",
      priority: 5,
      text: "Check roadmap for next unblocked milestone",
      actionable: true,
      reasoning: "No specific continuation goals - consult roadmap",
    });
  }

  return goals;
}

function saveGoals(goals) {
  try {
    const dir = path.dirname(GOALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(GOALS_FILE, JSON.stringify({
      schemaVersion: 1,
      synthesizedAt: new Date().toISOString(),
      goals,
      actionabilityScore: goals.filter((g) => g.actionable).length / goals.length,
    }, null, 2));
  } catch {
    // Ignore
  }
}

function appendToHandoff(goals) {
  try {
    // Find most recent handoff file
    const handoffs = fs.readdirSync(HANDOFF_DIR)
      .filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"))
      .map((f) => ({
        name: f,
        path: path.join(HANDOFF_DIR, f),
        mtime: fs.statSync(path.join(HANDOFF_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (handoffs.length > 0) {
      const latestHandoff = handoffs[0].path;
      const existing = fs.readFileSync(latestHandoff, "utf-8");

      // Only append if not already present
      if (!existing.includes("## Synthesized Goals")) {
        const goalsSection = `\n## Synthesized Goals (Auto-Generated)\n${goals.map((g) => `- [P${g.priority}] ${g.text}`).join("\n")}\n`;
        fs.appendFileSync(latestHandoff, goalsSection);
      }
    }
  } catch {
    // Ignore handoff errors
  }
}

async function main() {
  // Load session data
  const predictions = loadPredictions();
  const causalGraph = loadCausalGraph();

  // Analyze activity
  const activity = analyzeSessionActivity(predictions);

  // Synthesize goals
  const goals = synthesizeGoals(activity, causalGraph);

  // Save goals
  saveGoals(goals);

  // Append to handoff if available
  appendToHandoff(goals);

  // Output summary
  const actionability = goals.filter((g) => g.actionable).length / goals.length;
  console.log(JSON.stringify({
    systemMessage: `[GoalSynthesis] ${goals.length} goals proposed (${(actionability * 100).toFixed(0)}% actionable)`,
  }));
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
