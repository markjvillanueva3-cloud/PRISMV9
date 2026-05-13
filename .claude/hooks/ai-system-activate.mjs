#!/usr/bin/env node
// tier: T4
/**
 * AI System Activation — SessionStart Hook
 *
 * Activates PRISM's full AI capabilities on every session start:
 * - DeepAIIntelligenceEngine (8 reasoning modes)
 * - CrossDisciplinaryDeepLearningEngine (15 domains, 120+ formulas)
 * - PRISMCreativeReasoningEngine (6 creative modes)
 * - DuplicationGuardEngine (MANDATORY before creating assets)
 * - PRISMSelfAwarenessEngine (capability discovery)
 * - MITCourseDeepLearningEngine (227 courses)
 * - TribalKnowledgeAdvisorEngine (3,700+ tips)
 * - MachiningPlaybookEngine (296 rules)
 *
 * Outputs additionalContext that gets injected into conversation.
 */

import { promises as fs } from 'node:fs';

const MCP_SERVER = 'H:/prism/mcp-server';

async function countEngines() {
  try {
    const files = await fs.readdir(`${MCP_SERVER}/src/engines`);
    return files.filter(f => f.endsWith('Engine.ts')).length;
  } catch { return 0; }
}

async function countDispatchers() {
  try {
    const files = await fs.readdir(`${MCP_SERVER}/src/tools/dispatchers`);
    return files.filter(f => f.endsWith('Dispatcher.ts')).length;
  } catch { return 0; }
}

async function readHealthCheck() {
  try {
    const data = await fs.readFile(`${MCP_SERVER}/data/state/HEALTH_CHECK_REPORT.json`, 'utf8');
    return JSON.parse(data);
  } catch { return null; }
}

async function main() {
  const [engineCount, dispatcherCount, health] = await Promise.all([
    countEngines(),
    countDispatchers(),
    readHealthCheck()
  ]);

  const actionCount = health?.counts?.actions ?? 4296;
  const formulaCount = health?.counts?.formulas ?? 509;
  const algorithmCount = health?.counts?.algorithms ?? 285;
  const tribalTips = health?.counts?.tribalTips ?? 3700;

  const activation = `
AI SYSTEM ACTIVE — Full Intelligence Capabilities Enabled

COUNTS: ${engineCount} engines | ${dispatcherCount} dispatchers | ${actionCount} actions | ${formulaCount} formulas | ${algorithmCount} algorithms | ${tribalTips} tribal tips

MANDATORY BEFORE CREATING ANY NEW ASSET:
  import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";
  const check = duplicationGuardEngine.checkBeforeCreating({
    assetType: "engine", // or "formula", "algorithm", "extraction", "skill", "hook"
    proposedName: "MyNewThing",
    keywords: ["relevant", "keywords"],
    description: "What it does"
  });
  if (!check.shouldProceed) { /* USE existing: check.matches[0] */ }

KEY AI ENGINES (use these, don't rebuild):
  - DeepAIIntelligenceEngine: 8 reasoning modes (chain_of_thought, tree_of_thought, multi_path, backtracking, abductive, deductive, inductive, analogical)
  - CrossDisciplinaryDeepLearningEngine: 15 scientific domains, 120+ formulas
  - PRISMCreativeReasoningEngine: explore(problem, mode) — modes: conventional, exploratory, hybrid, innovative, optimal
  - MITCourseDeepLearningEngine: 227 MIT courses, algorithms mapped to PRISM engines
  - PRISMSelfAwarenessEngine: searchAIFeatures(), recommendAIFeatures(), getJMDieCustomerPath()
  - TribalKnowledgeAdvisorEngine: 3,700+ shop floor tips across 18 CAM systems
  - MachiningPlaybookEngine: 296 experiential rules for sequencing, anti-patterns

EXISTING KNOWLEDGE (already extracted, DO NOT re-extract):
  - FormulaRegistry: Kienzle, Taylor, Johnson-Cook, Merchant, Archard, Preston, etc.
  - AlgorithmRegistry: A*, Dijkstra, Q-Learning, Genetic, Particle Swarm, K-means, etc.
  - MIT courses: 2.810, 2.852, 6.034, 6.079, 6.231, 3.11, etc. — ALL mapped in MITCourseDeepLearningEngine

CRITICAL COMMANDS (AUTO-SUGGEST when triggers detected!):
  /pdf-learn      — Extract from PDFs/manuals/catalogs (triggers: pdf, document, manual, extract)
  /video-learn    — Extract from videos/tutorials (triggers: video, youtube, tutorial)
  /forge-triple   — Create engines+skills+hooks (triggers: create, build, forge, new engine)
  /dedup          — ALWAYS run before creating (triggers: duplicate, before creating)
  /wire-edm-studio — Wire EDM programming (triggers: wire edm, wedm, edm program)
  /lathe-studio   — Lathe programming (triggers: lathe, turning, okuma)
  /auto-speed-feed — Speed/feed calculation (triggers: speed, feed, sfm, ipm)
  /quote-to-ship  — Full quote pipeline (triggers: quote, estimate, job cost)
  /shop-knowledge — Tribal knowledge extraction (triggers: tribal, shop floor, operator)

AUTO-INVOKE RULE: When ANY of the above triggers are detected in user input, IMMEDIATELY suggest the relevant command!

GOAL: All-in-one manufacturing/shop management system, eventually tailorable to any field.
`.trim();

  console.log(JSON.stringify({
    additionalContext: activation
  }));
}

main().catch(() => {
  console.log(JSON.stringify({
    additionalContext: 'AI SYSTEM: Use DuplicationGuardEngine before creating. Check existing engines first.'
  }));
});
