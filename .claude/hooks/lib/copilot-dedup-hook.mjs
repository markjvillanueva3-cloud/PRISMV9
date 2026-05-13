#!/usr/bin/env node
// tier: T1
/**
 * copilot-dedup-hook.mjs — PreToolUse Write (new engine files only)
 * Warns when creating a new engine that overlaps with existing ones.
 */
import * as fs from 'fs';
const { existsSync } = fs;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const _raw = readStdinSafe();
if (!_raw) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}
const input = JSON.parse(_raw);
const filePath = (input.tool_input?.file_path || '').replace(/\\/g, '/');

// Only fire for NEW engine files
if (!filePath.includes('/engines/') || !filePath.endsWith('Engine.ts') || existsSync(filePath.replace(/\//g, '\\'))) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const engineName = filePath.split('/').pop().replace('.ts', '');
const nameWords = engineName.replace(/Engine$/, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase().split(/\s+/);

// Check for similar existing engines
const knownFamilies = [
  { pattern: /speed.*feed|feed.*speed/i, engines: ['SpeedFeedOrchestratorEngine', 'UltimateSpeedFeedEngine', 'SpeedFeedAutopilotEngine'] },
  { pattern: /cutting.*force|force.*cutting|kienzle/i, engines: ['KienzleForceModelEngine', 'CuttingForceCalculationEngine'] },
  { pattern: /post.*proc|gcode|g.code/i, engines: ['PostProcessorPipelineEngine', 'PostProcessorAutopilotEngine'] },
  { pattern: /quote|cost.*estim/i, engines: ['QuoteToShipOrchestratorEngine', 'QuoteAutopilotEngine'] },
  { pattern: /chatter|stability.*lobe/i, engines: ['ChatterStabilityLobeEngine'] },
  { pattern: /deflection/i, engines: ['DeflectionAnalysisEngine'] },
  { pattern: /thermal.*wear|wear.*thermal/i, engines: ['ThermalWearCouplingEngine'] },
  { pattern: /automation.*chain|chain.*automation/i, engines: ['AutomationChainEngine'] },
  { pattern: /build.*guard/i, engines: ['BuildGuardChainEngine'] },
  { pattern: /census|utilization/i, engines: ['CapabilityCensusEngine', 'UtilizationContractEngine'] },
];

const matches = [];
for (const family of knownFamilies) {
  if (family.pattern.test(engineName)) {
    matches.push(...family.engines);
  }
}

if (matches.length > 0) {
  console.log(JSON.stringify({
    additionalContext: `COPILOT DEDUP: New engine '${engineName}' may overlap with: ${matches.join(', ')}. Consider extending an existing engine instead of creating a new one.`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
