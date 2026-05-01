// Converts recovered JS from esbuild bundle back to compilable TypeScript
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'tools');
const recovered = fs.readFileSync(path.join(srcDir, 'autoHookWrapper.recovered.js'), 'utf-8');
const lines = recovered.split('\n');

const imports = `/**
 * autoHookWrapper.ts - Universal hook/cadence system
 * RECOVERED from dist/index.js bundle on ${new Date().toISOString()}
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

let code = lines.join('\n');

// Remove esbuild markers
code = code.replace(/^\/\/ src\/tools\/autoHookWrapper\.ts\n?/, '');
code = code.replace(/var fs\d+ = __toESM\(require\("fs"\)\);\n?/g, '');
code = code.replace(/var path\d+ = __toESM\(require\("path"\)\);\n?/g, '');
code = code.replace(/init_TelemetryEngine\(\);\n?/g, '');

// Fix numbered references
code = code.replace(/\bfs\d+\b/g, 'fs');
code = code.replace(/\bpath\d+\b/g, 'path');

// Add export to key functions
const exportFns = [
  'wrapToolWithAutoHooks', 'wrapWithUniversalHooks', 'getDispatchCount',
  'getAccumulatedBytes', 'resetReconFlag', 'resetDispatchCount',
  'getHookHistory', 'registerAutoHookTools', 'validateSafetyProof',
  'fireHook', 'verifyFactualClaims'
];
for (const fn of exportFns) {
  const re = new RegExp(`^((?:async )?function ${fn})`, 'm');
  code = code.replace(re, 'export $1');
}
code = code.replace(/^var AUTO_HOOK_CONFIG/m, 'export var AUTO_HOOK_CONFIG');

// Fix void 0
code = code.replace(/void 0/g, 'undefined');

// === BUFFER ZONE FIX: Remove call-count caps, raise thresholds ===
code = code.replace(
  /if \(callNum >= 19\) \{\s*cadence\.actions\.push\([^)]+CRITICAL: 19\+[^)]+\);\s*if \(callNum >= 30\) \{\s*currentTruncationCap = 500;\s*cadence\.actions\.push\([^)]+PROGRESSIVE_DEGRADATION: 30\+[^)]+\);\s*\} else if \(callNum >= 25\) \{\s*currentTruncationCap = 2000;\s*cadence\.actions\.push\([^)]+PROGRESSIVE_DEGRADATION: 25\+[^)]+\);\s*\}\s*cadence\.truncation_cap = currentTruncationCap;/,
  `if (callNum >= 41) {\n      cadence.actions.push("\u26ab ADVISORY: 41+ calls \u2014 consider checkpoint if pressure is rising");`
);
code = code.replace(
  /\} else if \(callNum >= 15\) \{\s*cadence\.actions\.push\([^)]+WARNING: 15\+[^)]+\);\s*\} else if \(callNum >= 9\) \{\s*cadence\.actions\.push\([^)]+NOTICE: 9\+[^)]+\);\s*\}/,
  `} else if (callNum >= 31) {\n      cadence.actions.push("\ud83d\udd34 NOTICE: 31+ calls \u2014 checkpoint recommended, monitor pressure");\n    } else if (callNum >= 21) {\n      cadence.actions.push("\ud83d\udfe1 NOTICE: 21+ calls \u2014 plan checkpoint soon");\n    }`
);

const final = imports + '\n' + code;
fs.writeFileSync(path.join(srcDir, 'autoHookWrapper.ts'), final);
console.log('CONVERTED: autoHookWrapper.ts written');
console.log('Lines:', final.split('\n').length);
console.log('Size:', final.length, 'bytes');

const checks = [
  ['export function wrapWithUniversalHooks', final.includes('export function wrapWithUniversalHooks')],
  ['export function getDispatchCount', final.includes('export function getDispatchCount')],
  ['export function resetReconFlag', final.includes('export function resetReconFlag')],
  ['export var AUTO_HOOK_CONFIG', final.includes('export var AUTO_HOOK_CONFIG')],
  ['Buffer fix (41+)', final.includes('callNum >= 41')],
  ['No PROGRESSIVE_DEGRADATION caps', !final.includes('currentTruncationCap = 500') && !final.includes('currentTruncationCap = 2000;\n        cadence')],
];
for (const [name, pass] of checks) {
  console.log(pass ? '  OK' : '  FAIL', name);
}
