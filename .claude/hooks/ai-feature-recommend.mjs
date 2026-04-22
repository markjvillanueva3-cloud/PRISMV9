#!/usr/bin/env node
/**
 * ai-feature-recommend.mjs — UserPromptSubmit hook (U-AWARE06)
 *
 * Analyzes user intent and recommends relevant PRISM AI engines/features.
 * Integrates with PRISMSelfAwarenessEngine recommendations.
 */

import * as fs from 'fs';

const AI_FEATURES_PATH = 'H:/prism/mcp-server/data/state/ai-intelligence-stats.json';

const DOMAIN_KEYWORDS = {
  cutting: ['UltimateSpeedFeedEngine', 'CuttingForceEngine', 'KienzleForceModelEngine'],
  speed: ['AutoSpeedFeedEngine', 'SpeedFeedOrchestratorEngine', 'UltimateSpeedFeedEngine'],
  feed: ['AutoSpeedFeedEngine', 'SpeedFeedOrchestratorEngine', 'FeedRateOptimizationEngine'],
  thermal: ['CuttingTemperatureEngine', 'ThermalWearCouplingEngine', 'ThermalExpansionEngine'],
  chatter: ['ChatterStabilityLobeEngine', 'RegenerativeChatterEngine', 'StabilityAnalysisEngine'],
  deflection: ['ToolDeflectionEngine', 'PartDeflectionEngine', 'BoringBarDeflectionEngine'],
  surface: ['SurfaceFinishPredictorEngine', 'SurfaceIntegrityEngine', 'RoughnessModelEngine'],
  tool: ['ToolWearProgressionEngine', 'ToolLifeEngine', 'ToolSelectionEngine'],
  material: ['MaterialPropertiesEngine', 'MaterialSelectionEngine', 'JohnsonCookModelEngine'],
  safety: ['SafetyEngine', 'SafetyValidatorEngine', 'CollisionDetectionEngine'],
  wedm: ['WEDMPowerEngine', 'WEDMWirePathEngine', 'WEDMFlushingEngine'],
  lathe: ['LatheToolpathEngine', 'TurningCycleEngine', 'LathePostProcessorEngine'],
  reasoning: ['ManufacturingReasoningEngine', 'MultiPathReasoningEngine', 'HypothesisEngine'],
  learning: ['CrossDisciplinaryDeepLearningEngine', 'PatternRecognitionEngine', 'OllamaClientEngine']
};

function extractKeywords(message) {
  if (!message) return [];
  const lower = message.toLowerCase();
  return Object.keys(DOMAIN_KEYWORDS).filter(k => lower.includes(k));
}

function getRecommendations(keywords) {
  const engines = new Set();
  for (const kw of keywords) {
    const recs = DOMAIN_KEYWORDS[kw] || [];
    recs.forEach(e => engines.add(e));
  }
  return [...engines].slice(0, 5);
}

async function main() {
  let input;
  try {
    input = JSON.parse(await fs.promises.readFile('/dev/stdin', 'utf8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const message = input?.message?.content || input?.message || '';
  const keywords = extractKeywords(message);

  if (keywords.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const recommendations = getRecommendations(keywords);

  if (recommendations.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const context = `**[AI Recommend]** For ${keywords.join('/')}: ${recommendations.join(', ')}`;

  console.log(JSON.stringify({
    continue: true,
    additionalContext: context
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
