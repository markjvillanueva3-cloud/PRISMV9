#!/usr/bin/env node
// tier: T1
/**
 * AI Reasoning Inject — PreToolUse Hook for Complex Operations
 *
 * Automatically suggests AI reasoning capabilities when:
 * - Creating complex engines (triggers DeepAIIntelligenceEngine recommendation)
 * - Optimizing parameters (triggers CrossDisciplinaryDeepLearningEngine)
 * - Debugging issues (triggers DiagnosticReasoningEngine)
 * - Planning implementations (triggers PRISMCreativeReasoningEngine)
 *
 * Does NOT block — only adds additionalContext suggestions.
 */

import { promises as fs } from 'node:fs';

const COMPLEXITY_INDICATORS = [
  { pattern: /optim(ize|ization)/i, engine: 'SpeedFeedOrchestratorEngine or AIPhysicsOptimizationEngine', action: 'prism_ai:optimize' },
  { pattern: /chatter|vibration|stability/i, engine: 'ChatterStabilityLobeEngine', action: 'prism_calc:stability_lobe' },
  { pattern: /force|kienzle|cutting/i, engine: 'KienzleForceModelEngine', action: 'prism_calc:cutting_force' },
  { pattern: /thermal|temperature|heat/i, engine: 'CuttingTemperatureEngine', action: 'prism_calc:thermal' },
  { pattern: /deflection|stiffness/i, engine: 'ToolDeflectionEngine', action: 'prism_calc:deflection' },
  { pattern: /tool.?life|wear|taylor/i, engine: 'TaylorToolLifeEngine', action: 'prism_calc:tool_life' },
  { pattern: /surface.?finish|roughness/i, engine: 'SurfaceFinishPredictorEngine', action: 'prism_calc:surface_finish' },
  { pattern: /schedule|capacity|queue/i, engine: 'SchedulingEngine', action: 'prism_scheduling:optimize' },
  { pattern: /quote|cost|estimate/i, engine: 'QuoteEstimatorEngine', action: 'prism_business:quote' },
  { pattern: /tribal|tip|experience/i, engine: 'TribalKnowledgeAdvisorEngine', action: 'prism_knowledge:tribal_search' },
  { pattern: /playbook|sequence|anti.?pattern/i, engine: 'MachiningPlaybookEngine', action: 'prism_knowledge:playbook_search' },
  { pattern: /reason|think|analyze/i, engine: 'DeepAIIntelligenceEngine', action: 'prism_ai:deep_reason' },
  { pattern: /creative|novel|alternative/i, engine: 'PRISMCreativeReasoningEngine', action: 'prism_ai:creative_explore' },
  { pattern: /cross.?domain|scientific/i, engine: 'CrossDisciplinaryDeepLearningEngine', action: 'prism_ai:cross_domain_reason' },
];

// CRITICAL COMMAND PATTERNS — always suggest when detected
const COMMAND_TRIGGERS = [
  { pattern: /\b(pdf|document|manual|catalog|extract)\b/i, cmd: '/pdf-learn', purpose: 'AI PDF extraction' },
  { pattern: /\b(video|youtube|tutorial|training)\b/i, cmd: '/video-learn', purpose: 'AI video learning' },
  { pattern: /\b(create|forge|build|generate).*(engine|hook|skill)\b/i, cmd: '/dedup + /forge-triple', purpose: 'Safe engine creation' },
  { pattern: /\b(wire|edm|wedm)\b/i, cmd: '/wire-edm-studio', purpose: 'Wire EDM studio' },
  { pattern: /\b(lathe|turning|okuma)\b/i, cmd: '/lathe-studio', purpose: 'Lathe studio' },
  { pattern: /\b(quote|estimate|cost)\b/i, cmd: '/quote-to-ship', purpose: 'Quote pipeline' },
  { pattern: /\b(speed|feed|sfm|ipm)\b/i, cmd: '/auto-speed-feed', purpose: 'Speed/feed calc' },
];

async function main() {
  const toolName = process.env.TOOL_NAME || '';
  const content = process.env.TOOL_INPUT_content || '';
  const prompt = process.env.TOOL_INPUT_prompt || '';

  // Only check Write operations for new engines
  if (toolName !== 'Write') {
    process.exit(0);
  }

  const textToCheck = (content + ' ' + prompt).toLowerCase();

  // Find matching complexity indicators
  const suggestions = [];
  for (const { pattern, engine, action } of COMPLEXITY_INDICATORS) {
    if (pattern.test(textToCheck)) {
      suggestions.push({ engine, action });
    }
  }

  if (suggestions.length === 0) {
    process.exit(0);
  }

  // Dedupe
  const unique = [...new Map(suggestions.map(s => [s.engine, s])).values()];

  // Find matching command triggers
  const matchedCommands = [];
  for (const { pattern, cmd, purpose } of COMMAND_TRIGGERS) {
    if (pattern.test(textToCheck)) {
      matchedCommands.push({ cmd, purpose });
    }
  }

  // Build combined output
  const parts = [];

  if (unique.length > 0) {
    parts.push(`AI ASSIST: Detected complexity patterns. Consider using:\n` +
      unique.slice(0, 3).map(s => `  - ${s.engine} (${s.action})`).join('\n') +
      `\n\nThese engines already implement the logic you may be building.`);
  }

  if (matchedCommands.length > 0) {
    parts.push(`COMMANDS SUGGESTED:\n` +
      matchedCommands.slice(0, 3).map(c => `  - ${c.cmd} — ${c.purpose}`).join('\n'));
  }

  if (parts.length > 0) {
    const output = {
      additionalContext: parts.join('\n\n')
    };
    console.log(JSON.stringify(output));
  }

  process.exit(0);
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
