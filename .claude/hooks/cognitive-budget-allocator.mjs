#!/usr/bin/env node
// tier: T4
/**
 * cognitive-budget-allocator.mjs — U-AI06 Cognitive Budget Allocator
 *
 * Rations tokens across lifecycle stages based on session phase.
 * Early session: exploration heavy. Mid session: execution heavy.
 * Late session: consolidation heavy.
 *
 * Per-session: each chat reads its own transcript_path and writes its own
 * budget file at .claude/cache/per-session/<sid>/cognitive-budget.json.
 * Eliminates the cross-chat contamination caused by a single shared file
 * (designed for up to 8 concurrent chats).
 */

import {
  getSessionId, getTranscriptTokens, readStdinJson,
  readSessionJson, writeSessionJson, CONTEXT_CAP,
} from "../helpers/session-token-state.mjs";

const BUDGET_NAME = "cognitive-budget";
const MAX_CONTEXT_TOKENS = Number(process.env.PRISM_MAX_CONTEXT_TOKENS) || CONTEXT_CAP;

const LIFECYCLE_PHASES = {
  EXPLORATION: { tokenBudget: 0.3, description: "discovery and planning" },
  EXECUTION: { tokenBudget: 0.5, description: "implementation and testing" },
  CONSOLIDATION: { tokenBudget: 0.2, description: "review and handoff" },
};

function loadBudgetState(sessionId) {
  return readSessionJson(sessionId, BUDGET_NAME, {
    schemaVersion: 2,
    sessionId,
    currentPhase: "EXPLORATION",
    tokensUsedEstimate: 0,
    phaseHistory: [],
    recommendations: [],
    lastUpdate: null,
  });
}

function saveBudgetState(sessionId, state) {
  state.lastUpdate = new Date().toISOString();
  state.sessionId = sessionId;
  writeSessionJson(sessionId, BUDGET_NAME, state);
}

function determinePhase(tokensUsed) {
  const utilizationPct = tokensUsed / MAX_CONTEXT_TOKENS;
  if (utilizationPct < 0.25) return "EXPLORATION";
  if (utilizationPct < 0.75) return "EXECUTION";
  return "CONSOLIDATION";
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
      // Scaled to 1M context: nudge compaction when remaining < 200K (20% headroom).
      if (remaining < 200_000) {
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
  // Per-session: read transcript tokens for THIS chat only
  const stdin = readStdinJson();
  const sessionId = getSessionId(stdin);
  let state = loadBudgetState(sessionId);

  // Authoritative token count from this chat's transcript JSONL
  const tokensUsed = getTranscriptTokens(stdin);
  state.tokensUsedEstimate = tokensUsed;

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

  state.recommendations = generateRecommendations(newPhase, tokensUsed);
  const allocation = calculateBudgetAllocation(newPhase, tokensUsed);
  state.allocation = allocation;

  saveBudgetState(sessionId, state);

  if (phaseChanged || newPhase === "CONSOLIDATION") {
    const topRec = state.recommendations[0];
    console.log(JSON.stringify({
      systemMessage: `[CognitiveBudget ${sessionId}] Phase: ${newPhase} (${allocation.utilizationPct}% context). ${topRec?.action || "Manage tokens wisely."}`,
    }));
  }
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
