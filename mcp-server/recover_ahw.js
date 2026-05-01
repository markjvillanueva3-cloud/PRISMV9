// Recovery script: Rebuild autoHookWrapper.ts from dist bundle
// The TS source was accidentally overwritten. This extracts from the compiled bundle.
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, 'dist', 'index.js');
const outputPath = path.join(__dirname, 'src', 'tools', 'autoHookWrapper.ts');

console.log('Reading bundle...');
const bundle = fs.readFileSync(bundlePath, 'utf-8');
const lines = bundle.split('\n');

// Find autoHookWrapper section
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// src/tools/autoHookWrapper.ts')) {
    startLine = i;
  }
  if (startLine > 0 && i > startLine + 10) {
    // Find next module boundary
    if (lines[i].match(/^\/\/ src\/(tools|tests|engines|dispatchers|registries|orchestration|utils|auto|types)\//)) {
      endLine = i;
      break;
    }
  }
}

if (startLine === -1 || endLine === -1) {
  console.error('Could not find boundaries. Start:', startLine, 'End:', endLine);
  process.exit(1);
}

console.log(`Found: lines ${startLine+1}-${endLine} (${endLine-startLine} lines)`);

// Extract the raw JS
let extracted = lines.slice(startLine + 1, endLine).join('\n');

// Add the original imports header
const header = `/**
 * autoHookWrapper.ts - Universal hook/cadence system
 * RECOVERED from dist/index.js bundle on ${new Date().toISOString()}
 * Note: Types are approximate. Bundle variables renamed by esbuild.
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  HookResult, ToolCallContext, ProofValidation, FactVerify,
  HookExecution, RecordedAction, CompactionSurvivalData
} from "../types/prism-schema.js";
import { hookExecutor } from "../engines/HookExecutor.js";
import { hookEngine } from "../orchestration/HookEngine.js";
import {
  autoTodoRefresh, autoCheckpoint, autoContextPressure,
  autoContextCompress, autoCompactionDetect, autoCompactionSurvival,
  rehydrateFromSurvival, autoAttentionScore, autoContextPullBack,
  autoRecoveryManifest, autoHandoffPackage, markHandoffResumed,
  autoPreCompactionDump
} from "./cadenceExecutor.js";
import { slimJsonResponse, slimCadence, getSlimLevel, getCurrentPressurePct } from "../utils/responseSlimmer.js";
import { autoSkillHint, autoKnowledgeCrossQuery, autoDocAntiRegression, autoAgentRecommend,
  autoPhaseSkillLoader, autoSkillContextMatch, autoNLHookEvaluator, autoHookActivationPhaseCheck,
  autoD4PerfSummary
} from "./cadenceExecutor.js";
import { autoResponseTemplate, getResponseTemplateStats } from "../engines/ResponseTemplateEngine.js";
import { TelemetryEngine } from "../engines/TelemetryEngine.js";
import { MemoryGraphEngine } from "../engines/MemoryGraphEngine.js";
import { PredictiveFailureEngine } from "../engines/PredictiveFailureEngine.js";
import { computationCache } from "../engines/ComputationCache.js";
import {
  recordSessionToolCall, recordSessionHook, recordSessionSkillInjection,
  recordSessionTemplateMatch, recordSessionPressure, recordSessionCheckpoint,
  recordSessionCompactionRecovery, recordSessionError,
  writeSessionIncrementalPrep, getSessionQualityScore, getSessionMetrics
} from "../engines/SessionLifecycleEngine.js";
import { autoManusATCSPoll, getBridgeStatus } from "../engines/ManusATCSBridge.js";

`;

// Fix: Change 'var' to 'export var' for the main exports
extracted = extracted.replace(/^var AUTO_HOOK_CONFIG = /m, 'export var AUTO_HOOK_CONFIG = ');

// Fix: The main wrapping function needs to be exported
// Find the wrapWithAutoHooks function and export it
extracted = extracted.replace(/^(function wrapWithAutoHooks)/m, 'export $1');
// Also check for var wrapWithAutoHooks pattern
extracted = extracted.replace(/^var wrapWithAutoHooks = /m, 'export var wrapWithAutoHooks = ');

const result = header + extracted;
fs.writeFileSync(outputPath, result);
console.log('Written:', outputPath);
console.log('Size:', result.length, 'bytes');
console.log('Lines:', result.split('\n').length);
