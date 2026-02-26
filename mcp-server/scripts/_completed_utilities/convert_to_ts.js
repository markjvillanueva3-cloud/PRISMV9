// Converts recovered JS from esbuild bundle back to compilable TypeScript
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'tools');
const recovered = fs.readFileSync(path.join(srcDir, 'autoHookWrapper.recovered.js'), 'utf-8');
const lines = recovered.split('\n');

// TypeScript imports header
const imports = `/**
 * autoHookWrapper.ts — Universal hook/cadence system
 * RECOVERED from dist/index.js bundle on ${new Date().toISOString()}
 * Original was accidentally wiped by file_write str_replace bug.
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  HookResult, ToolCallContext, ProofValidation, FactVerify,
  HookExecution, RecordedAction, CompactionSurvivalData
} from "../types/prism-schema.js";
import { HookExecutor } from "../engines/HookExecutor.js";
import {
  autoTodoRefresh, autoCheckpoint, autoContextPressure,
  autoContextCompress, autoCompactionDetect, autoCompactionSurvival,
  rehydrateFromSurvival, autoAttentionScore, autoContextPullBack,
  getCurrentPressurePct
} from "./cadenceExecutor.js";
import { slimJsonResponse, slimCadence, getSlimLevel } from "../utils/responseSlimmer.js";
import { autoSkillHint, autoKnowledgeCrossQuery } from "./cadenceExecutor.js";
import { TelemetryEngine } from "../engines/TelemetryEngine.js";
import { MemoryGraphEngine } from "../engines/MemoryGraphEngine.js";
import { PredictiveFailureEngine } from "../engines/PredictiveFailureEngine.js";

// Engine singletons (initialized on first use)
const hookExecutor = new HookExecutor();
let telemetryEngine: TelemetryEngine | null = null;
let memoryGraphEngine: MemoryGraphEngine | null = null;
let pfpEngine: PredictiveFailureEngine | null = null;

function getTelemetry(): TelemetryEngine {
  if (!telemetryEngine) telemetryEngine = TelemetryEngine.getInstance();
  return telemetryEngine;
}
function getMemoryGraph(): MemoryGraphEngine {
  if (!memoryGraphEngine) memoryGraphEngine = MemoryGraphEngine.getInstance();
  return memoryGraphEngine;
}
function getPFP(): PredictiveFailureEngine {
  if (!pfpEngine) pfpEngine = PredictiveFailureEngine.getInstance();
  return pfpEngine;
}
`;

// Process the recovered JS:
// 1. Remove esbuild require wrappers
// 2. Remove init calls that are handled by imports
// 3. Add export to known exported functions
// 4. Fix variable names (fs15→fs, path17→path)

let code = lines.join('\n');

// Remove the esbuild module boundary comment
code = code.replace(/^\/\/ src\/tools\/autoHookWrapper\.ts\n/, '');

// Remove esbuild require lines
code = code.replace(/var fs\d+ = __toESM\(require\("fs"\)\);\n/g, '');
code = code.replace(/var path\d+ = __toESM\(require\("path"\)\);\n/g, '');
code = code.replace(/init_TelemetryEngine\(\);\n/g, '');

// Replace numbered fs/path references with plain ones
code = code.replace(/\bfs\d+\b/g, 'fs');
code = code.replace(/\bpath\d+\b/g, 'path');

// Add export to known exported functions
const exportFns = [
  'function wrapToolWithAutoHooks',
  'function wrapWithUniversalHooks',
  'function getDispatchCount',
  'function getAccumulatedBytes',
  'function resetReconFlag',
  'function resetDispatchCount',
  'function getHookHistory',
  'function registerAutoHookTools',
  'function validateSafetyProof',
  'function fireHook',
  'function verifyFactualClaims'
];
for (const fn of exportFns) {
  code = code.replace(new RegExp(`^(${fn.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, 'm'), 'export $1');
}

// Export the config
code = code.replace(/^var AUTO_HOOK_CONFIG/m, 'export var AUTO_HOOK_CONFIG');

// Fix void 0 → undefined
code = code.replace(/void 0/g, 'undefined');

// === APPLY THE BUFFER ZONE FIX ===
// Replace old call-count-based caps with advisory-only
const oldBuffer = `    if (callNum >= 19) {
      cadence.actions.push("\\u26AB CRITICAL: 19+ calls \\u2014 SAVE STATE AND END SESSION");
      if (callNum >= 30) {
        currentTruncationCap = 500;
        cadence.actions.push("\\u{1F480} PROGRESSIVE_DEGRADATION: 30+ calls, 500B cap \\u2014 SESSION MUST END");
      } else if (callNum >= 25) {
        currentTruncationCap = 2000;
        cadence.actions.push("\\u26AB PROGRESSIVE_DEGRADATION: 25+ calls, 2KB cap \\u2014 WRAP UP NOW");
      }
      cadence.truncation_cap = currentTruncationCap;`;

// Use regex to find and replace the buffer zone block
code = code.replace(
  /if \(callNum >= 19\) \{[\s\S]*?cadence\.truncation_cap = currentTruncationCap;/,
  `if (callNum >= 41) {
      cadence.actions.push("\\u26AB ADVISORY: 41+ calls \\u2014 consider checkpoint if pressure is rising");`
);

// Replace the secondary thresholds
code = code.replace(
  /} else if \(callNum >= 15\) \{\s*cadence\.actions\.push\("[^"]*WARNING: 15\+ calls[^"]*"\);\s*\} else if \(callNum >= 9\) \{\s*cadence\.actions\.push\("[^"]*NOTICE: 9\+ calls[^"]*"\);\s*\}/,
  `} else if (callNum >= 31) {
      cadence.actions.push("\\u{1F534} NOTICE: 31+ calls \\u2014 checkpoint recommended, monitor pressure");
    } else if (callNum >= 21) {
      cadence.actions.push("\\u{1F7E1} NOTICE: 21+ calls \\u2014 plan checkpoint soon");
    }`
);

// Combine imports + processed code
const final = imports + '\n' + code;

fs.writeFileSync(path.join(srcDir, 'autoHookWrapper.ts'), final);
console.log('CONVERTED: autoHookWrapper.ts written');
console.log('Lines:', final.split('\n').length);
console.log('Size:', final.length, 'bytes');

// Verify key exports exist
const exports = ['export function wrapWithUniversalHooks', 'export function getDispatchCount', 
  'export function resetReconFlag', 'export var AUTO_HOOK_CONFIG'];
for (const e of exports) {
  if (final.includes(e)) console.log('  ✓', e);
  else console.log('  ✗ MISSING:', e);
}

// Check buffer zone fix applied
if (final.includes('callNum >= 41')) console.log('  ✓ Buffer zone fix applied (41+ threshold)');
else console.log('  ✗ Buffer zone fix NOT applied');
if (!final.includes('PROGRESSIVE_DEGRADATION')) console.log('  ✓ Progressive degradation caps REMOVED');
else console.log('  ✗ Progressive degradation still present');
