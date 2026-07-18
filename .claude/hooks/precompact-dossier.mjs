#!/usr/bin/env node
// tier: T4
/**
 * precompact-dossier.mjs — U-CTX03 Rich PreCompact Dossier
 *
 * Creates comprehensive snapshot before compaction for restoration.
 * Captures in-flight work, uncommitted changes, reasoning state,
 * and exploration/exploitation balance.
 *
 * Target: 100K token survival budget with prioritized content.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const DOSSIER_DIR = "H:/prism/mcp-server/data/state/dossiers";
const STATE_DIR = "H:/prism/mcp-server/data/state";
const MAX_DOSSIER_SIZE = 100000 * 4; // 100K tokens * 4 chars

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function captureGitState() {
  try {
    const status = execSync("git -C H:/prism status --short 2>/dev/null", { windowsHide: true, encoding: "utf-8" }).trim();
    const branch = execSync("git -C H:/prism branch --show-current 2>/dev/null", { windowsHide: true, encoding: "utf-8" }).trim();
    const lastCommit = execSync("git -C H:/prism log -1 --oneline 2>/dev/null", { windowsHide: true, encoding: "utf-8" }).trim();

    const uncommittedFiles = status.split("\n").filter(Boolean).length;
    const diff = uncommittedFiles > 0
      ? execSync("git -C H:/prism diff --stat 2>/dev/null", { windowsHide: true, encoding: "utf-8" }).slice(0, 5000)
      : "";

    return {
      branch,
      lastCommit,
      uncommittedFiles,
      statusSummary: status.slice(0, 2000),
      diffSummary: diff,
    };
  } catch {
    return { branch: "unknown", lastCommit: "unknown", uncommittedFiles: 0 };
  }
}

function captureReasoningState() {
  try {
    const ledgerPath = `${STATE_DIR}/REASONING_TRACE_LEDGER.jsonl`;
    if (!fs.existsSync(ledgerPath)) return { recentChains: [], chainCount: 0 };

    const content = fs.readFileSync(ledgerPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const recent = lines.slice(-50).map((line) => {
      try {
        const entry = JSON.parse(line);
        return {
          at: entry.at,
          dispatcher: entry.dispatcher,
          action: entry.action,
          outcome: entry.outcome,
          confidence: entry.confidence,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return {
      recentChains: recent,
      chainCount: lines.length,
    };
  } catch {
    return { recentChains: [], chainCount: 0 };
  }
}

function captureBanditState() {
  try {
    const posteriorPath = `${STATE_DIR}/BANDIT_POSTERIOR.json`;
    if (!fs.existsSync(posteriorPath)) return null;

    const posterior = JSON.parse(fs.readFileSync(posteriorPath, "utf-8"));
    return {
      algorithm: posterior.algorithm,
      armCount: Object.keys(posterior.arms || {}).length,
      totalPulls: Object.values(posterior.arms || {}).reduce((sum, arm) => sum + (arm.pulls || 0), 0),
      topArms: Object.entries(posterior.arms || {})
        .map(([name, arm]) => ({ name, pulls: arm.pulls, ratio: arm.alpha / (arm.alpha + arm.beta) }))
        .sort((a, b) => b.pulls - a.pulls)
        .slice(0, 5),
    };
  } catch {
    return null;
  }
}

function captureGoalState() {
  try {
    const goalsPath = `${STATE_DIR}/SYNTHESIZED_GOALS.json`;
    if (!fs.existsSync(goalsPath)) return null;

    const goals = JSON.parse(fs.readFileSync(goalsPath, "utf-8"));
    return {
      goalCount: goals.goals?.length || 0,
      actionabilityScore: goals.actionabilityScore,
      topGoals: (goals.goals || []).slice(0, 5).map((g) => ({
        id: g.id,
        priority: g.priority,
        text: g.text,
      })),
    };
  } catch {
    return null;
  }
}

function captureCuriosityState() {
  try {
    const queuePath = `${STATE_DIR}/CURIOSITY_QUEUE.json`;
    if (!fs.existsSync(queuePath)) return null;

    const queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    return {
      itemCount: queue.items?.length || 0,
      exploredCount: queue.explored?.length || 0,
      topItems: (queue.items || []).slice(0, 5).map((i) => ({
        type: i.type,
        text: i.text,
        priority: i.priority,
      })),
    };
  } catch {
    return null;
  }
}

function captureCausalState() {
  try {
    const graphPath = `${STATE_DIR}/CAUSAL_GRAPH.json`;
    if (!fs.existsSync(graphPath)) return null;

    const graph = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
    return {
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      summary: graph.summary,
      topEdges: (graph.edges || []).slice(0, 10).map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.weight,
      })),
    };
  } catch {
    return null;
  }
}

function captureCognitiveBudget() {
  try {
    const budgetPath = `${STATE_DIR}/COGNITIVE_BUDGET.json`;
    if (!fs.existsSync(budgetPath)) return null;

    const budget = JSON.parse(fs.readFileSync(budgetPath, "utf-8"));
    return {
      currentPhase: budget.currentPhase,
      tokensUsedEstimate: budget.tokensUsedEstimate,
      phaseTransitions: budget.phaseHistory?.length || 0,
      allocation: budget.allocation,
      topRecommendation: budget.recommendations?.[0],
    };
  } catch {
    return null;
  }
}

function captureActiveWork() {
  try {
    const workboardPath = "H:/prism/state/shared/AGENT_WORKBOARD.md";
    if (!fs.existsSync(workboardPath)) return null;

    const content = fs.readFileSync(workboardPath, "utf-8");
    return {
      contentLength: content.length,
      preview: content.slice(0, 2000),
    };
  } catch {
    return null;
  }
}

function buildDossier() {
  const dossier = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sessionId: process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`,

    git: captureGitState(),
    reasoning: captureReasoningState(),
    bandit: captureBanditState(),
    goals: captureGoalState(),
    curiosity: captureCuriosityState(),
    causal: captureCausalState(),
    cognitiveBudget: captureCognitiveBudget(),
    activeWork: captureActiveWork(),

    metadata: {
      captureTimeMs: 0,
      componentsCaptured: 0,
      estimatedTokens: 0,
    },
  };

  // Count captured components
  const components = ["git", "reasoning", "bandit", "goals", "curiosity", "causal", "cognitiveBudget", "activeWork"];
  dossier.metadata.componentsCaptured = components.filter((c) => dossier[c] !== null).length;

  // Estimate tokens
  const jsonStr = JSON.stringify(dossier);
  dossier.metadata.estimatedTokens = Math.ceil(jsonStr.length / 4);

  return dossier;
}

function saveDossier(dossier) {
  ensureDir(DOSSIER_DIR);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `DOSSIER-${timestamp}.json`;
  const filepath = path.join(DOSSIER_DIR, filename);

  // Save full dossier
  fs.writeFileSync(filepath, JSON.stringify(dossier, null, 2));

  // Save latest pointer
  fs.writeFileSync(
    path.join(DOSSIER_DIR, "LATEST_DOSSIER.json"),
    JSON.stringify({ path: filepath, createdAt: dossier.createdAt }, null, 2)
  );

  // Cleanup old dossiers (keep last 10)
  try {
    const files = fs.readdirSync(DOSSIER_DIR)
      .filter((f) => f.startsWith("DOSSIER-") && f.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files.slice(10)) {
      fs.unlinkSync(path.join(DOSSIER_DIR, file));
    }
  } catch {
    // Ignore cleanup errors
  }

  return filepath;
}

function generateSummary(dossier) {
  const parts = [];

  parts.push(`Git: ${dossier.git.branch}, ${dossier.git.uncommittedFiles} uncommitted`);

  if (dossier.reasoning) {
    parts.push(`Reasoning: ${dossier.reasoning.chainCount} traces`);
  }

  if (dossier.cognitiveBudget) {
    parts.push(`Phase: ${dossier.cognitiveBudget.currentPhase}`);
  }

  if (dossier.goals) {
    parts.push(`Goals: ${dossier.goals.goalCount}`);
  }

  return parts.join(" | ");
}

async function main() {
  const startTime = Date.now();

  // Build comprehensive dossier
  const dossier = buildDossier();
  dossier.metadata.captureTimeMs = Date.now() - startTime;

  // Save dossier
  const filepath = saveDossier(dossier);

  // Generate summary
  const summary = generateSummary(dossier);

  console.log(JSON.stringify({
    systemMessage: `[PreCompact] Dossier saved (${dossier.metadata.componentsCaptured}/8 components, ${dossier.metadata.estimatedTokens} tokens). ${summary}`,
  }));
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
