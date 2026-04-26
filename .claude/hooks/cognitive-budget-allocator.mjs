#!/usr/bin/env node
/**
 * cognitive-budget-allocator.mjs — U-AI06 Cognitive Budget Allocator
 *
 * Rations tokens across lifecycle stages based on session phase.
 * Early session: exploration heavy. Mid session: execution heavy.
 * Late session: consolidation heavy.
 *
 * Injects budget guidance on SessionStart based on context utilization.
 */

import * as fs from "fs";
import * as path from "path";

const BUDGET_STATE_FILE = "H:/prism/mcp-server/data/state/COGNITIVE_BUDGET.json";
const SESSION_MEMORY_FILE = "H:/prism/state/SESSION_MEMORY.json";
// Opus 4.5 = 200,000 tokens. Override via env PRISM_MAX_CONTEXT_TOKENS.
const MAX_CONTEXT_TOKENS = Number(process.env.PRISM_MAX_CONTEXT_TOKENS) || 200_000;

const LIFECYCLE_PHASES = {
  EXPLORATION: { tokenBudget: 0.3, description: "discovery and planning" },
  EXECUTION: { tokenBudget: 0.5, description: "implementation and testing" },
  CONSOLIDATION: { tokenBudget: 0.2, description: "review and handoff" },
};

function loadBudgetState() {
  try {
    if (fs.existsSync(BUDGET_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(BUDGET_STATE_FILE, "utf-8"));
    }
  } catch {
    // Start fresh
  }
  return {
    schemaVersion: 1,
    currentPhase: "EXPLORATION",
    tokensUsedEstimate: 0,
    phaseHistory: [],
    recommendations: [],
    lastUpdate: null,
  };
}

function saveBudgetState(state) {
  try {
    const dir = path.dirname(BUDGET_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    state.lastUpdate = new Date().toISOString();
    fs.writeFileSync(BUDGET_STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // Ignore
  }
}

function estimateContextUsage() {
  try {
    if (fs.existsSync(SESSION_MEMORY_FILE)) {
      const memory = JSON.parse(fs.readFileSync(SESSION_MEMORY_FILE, "utf-8"));
      const messageCount = memory.messageCount || 0;
      const avgTokensPerMessage = 500;
      return Math.min(messageCount * avgTokensPerMessage, MAX_CONTEXT_TOKENS);
    }
  } catch {
    // Ignore
  }
  return 0;
}

function determinePhase(tokensUsed) {
  const utilizationPct = tokensUsed / MAX_CONTEXT_TOKENS;

  if (utilizationPct < 0.25) {
    return "EXPLORATION";
  } else if (utilizationPct < 0.75) {
    return "EXECUTION";
  } else {
    return "CONSOLIDATION";
  }
}

function generateRecommendations(phase, tokensUsed) {
  const recommendations = [];
  const remaining = MAX_CONTEXT_TOKENS - tokensUsed;
  const remainingPct = (remaining / MAX_CONTEXT_TOKENS * 100).toFixed(0);

  switch (phase) {
    case "EXPLORATION":
      recommendations.push({
        priority: 1,
        action: "Invest in understanding before implementing",
        reason: "Early session — exploration budget is high",
      });
      recommendations.push({
        priority: 2,
        action: "Read CLAUDE.md, roadmap, and relevant state files",
        reason: "Context is fresh — build comprehensive mental model",
      });
      break;

    case "EXECUTION":
      recommendations.push({
        priority: 1,
        action: "Focus on implementation with minimal exploration",
        reason: "Mid session — execution budget is primary",
      });
      recommendations.push({
        priority: 2,
        action: "Commit frequently to preserve progress",
        reason: "Context pressure increasing — lock in wins",
      });
      if (remaining < 80000) {
        recommendations.push({
          priority: 1,
          action: "Consider triggering compaction soon",
          reason: `Only ${remainingPct}% context remaining`,
        });
      }
      break;

    case "CONSOLIDATION":
      recommendations.push({
        priority: 1,
        action: "Wrap up current work, write handoff notes",
        reason: "Late session — consolidation is critical",
      });
      recommendations.push({
        priority: 1,
        action: "Commit all changes, update state files",
        reason: "Context nearly exhausted — preserve all progress",
      });
      recommendations.push({
        priority: 2,
        action: "Avoid starting new large tasks",
        reason: "Insufficient context for deep exploration",
      });
      break;
  }

  return recommendations;
}

function calculateBudgetAllocation(phase, tokensUsed) {
  const remaining = MAX_CONTEXT_TOKENS - tokensUsed;
  const phaseConfig = LIFECYCLE_PHASES[phase];

  return {
    phase,
    phaseDescription: phaseConfig.description,
    tokensUsed,
    tokensRemaining: remaining,
    utilizationPct: ((tokensUsed / MAX_CONTEXT_TOKENS) * 100).toFixed(1),
    allocationStrategy: {
      exploration: phase === "EXPLORATION" ? 0.4 : phase === "EXECUTION" ? 0.1 : 0.05,
      execution: phase === "EXECUTION" ? 0.6 : phase === "EXPLORATION" ? 0.4 : 0.2,
      consolidation: phase === "CONSOLIDATION" ? 0.75 : phase === "EXECUTION" ? 0.3 : 0.15,
    },
  };
}

async function main() {
  // Load current state
  let state = loadBudgetState();

  // Estimate context usage
  const tokensUsed = estimateContextUsage();
  state.tokensUsedEstimate = tokensUsed;

  // Determine current phase
  const newPhase = determinePhase(tokensUsed);
  const phaseChanged = state.currentPhase !== newPhase;

  if (phaseChanged) {
    state.phaseHistory.push({
      from: state.currentPhase,
      to: newPhase,
      at: new Date().toISOString(),
      tokensAtTransition: tokensUsed,
    });
    state.currentPhase = newPhase;
  }

  // Generate recommendations
  state.recommendations = generateRecommendations(newPhase, tokensUsed);

  // Calculate budget allocation
  const allocation = calculateBudgetAllocation(newPhase, tokensUsed);
  state.allocation = allocation;

  // Save state
  saveBudgetState(state);

  // Output guidance if phase changed or in consolidation
  if (phaseChanged || newPhase === "CONSOLIDATION") {
    const topRec = state.recommendations[0];
    console.log(JSON.stringify({
      systemMessage: `[CognitiveBudget] Phase: ${newPhase} (${allocation.utilizationPct}% context used). ${topRec?.action || "Manage tokens wisely."}`,
    }));
  }
}

main().catch(() => process.exit(0));
