#!/usr/bin/env node
/**
 * Generate Self-Awareness Manifest
 * Creates comprehensive manifest of ALL PRISM capabilities
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER = path.resolve(__dirname, "..");

function countFiles(dir, pattern) {
  try {
    return fs.readdirSync(dir).filter(f => pattern.test(f)).length;
  } catch { return 0; }
}

function listFiles(dir, pattern) {
  try {
    return fs.readdirSync(dir).filter(f => pattern.test(f));
  } catch { return []; }
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);
  } catch { return []; }
}

function countTribalTips() {
  const dataDir = path.join(MCP_SERVER, "src", "data");
  const tipFiles = listFiles(dataDir, /-tips\.ts$/);
  const byCAM = {};
  let total = 0;

  for (const file of tipFiles) {
    try {
      const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
      const matches = content.match(/{\s*id:/g);
      const count = matches ? matches.length : 0;
      const cam = file.replace("-cam-tips.ts", "").replace("-tips.ts", "");
      byCAM[cam] = count;
      total += count;
    } catch { /* ignore */ }
  }

  return { total, byCAM };
}

// Main
const engines = listFiles(path.join(MCP_SERVER, "src", "engines"), /Engine\.ts$/);
const dispatchers = listFiles(path.join(MCP_SERVER, "src", "tools", "dispatchers"), /Dispatcher\.ts$/);
const skills = listFiles(path.join(MCP_SERVER, "src", "skills"), /\.ts$/);
const scripts = listFiles(path.join(MCP_SERVER, "scripts"), /\.(ts|js|mjs)$/);
const hooks = listFiles(path.join(MCP_SERVER, "src", "hooks"), /\.ts$/);
const claudeHooks = listFiles("H:/prism/.claude/hooks", /\.mjs$/);
const helperHooks = listFiles("H:/prism/.claude/helpers", /\.(mjs|js|sh)$/);
const tribalData = countTribalTips();
const resourceSubdirs = listDirs("H:/prism/resources");
const jmDieSubdirs = listDirs("H:/PRISM/JM DIE");

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  version: "3.0.0",

  counts: {
    engines: engines.length,
    dispatchers: dispatchers.length,
    skills: skills.length,
    scripts: scripts.length,
    hooks: hooks.length + claudeHooks.length + helperHooks.length,
    tribalTips: tribalData.total,
    resourceFolders: resourceSubdirs.length,
    jmDieFolders: jmDieSubdirs.length,
  },

  engines: {
    total: engines.length,
    aiEngines: engines.filter(e => e.includes("AI") || e.includes("Deep") || e.includes("Intelligence") || e.includes("Reasoning")),
    physicsEngines: engines.filter(e => e.includes("Force") || e.includes("Thermal") || e.includes("Deflection") || e.includes("Chatter")),
  },

  dispatchers: { total: dispatchers.length, list: dispatchers.map(d => d.replace("Dispatcher.ts", "")) },
  skills: { total: skills.length, list: skills.map(s => s.replace(".ts", "")) },
  hooks: { srcHooks: hooks.length, claudeHooks: claudeHooks.length, helperHooks: helperHooks.length },

  tribalKnowledge: {
    total: tribalData.total,
    byCAM: tribalData.byCAM,
    categories: ["machining_physics", "tool_selection", "speed_feed", "workholding", "surface_finish", "threading", "coolant", "chip_control", "vibration", "wear"],
  },

  resources: { folders: resourceSubdirs },
  jmDie: { folders: jmDieSubdirs, programCount: 24545, customerCount: 100 },
  mitCourses: { total: 227, indexed: true },

  aiCapabilities: {
    deepReasoning: { engine: "DeepAIIntelligenceEngine", modes: 8 },
    crossDisciplinary: { engine: "CrossDisciplinaryDeepLearningEngine", domains: 15, formulas: 120 },
    creativeReasoning: { engine: "PRISMCreativeReasoningEngine", modes: 6 },
    selfAwareness: { engine: "PRISMSelfAwarenessEngine" },
    duplicationGuard: { engine: "DuplicationGuardEngine", mandatory: true },
    synchronizer: { engine: "AISystemSynchronizerEngine" },
  },

  rules: [
    "ALWAYS check DuplicationGuardEngine before creating new assets",
    "ALL extractions flow to categorized tribal knowledge",
    "Use PRISMSelfAwarenessEngine to discover existing capabilities",
    "MIT courses are already indexed — do NOT re-extract",
  ],
};

const outputPath = path.join(MCP_SERVER, "data", "state", "SELF_AWARENESS_MANIFEST.json");
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log("=== SELF-AWARENESS MANIFEST GENERATED ===");
console.log(`Engines: ${manifest.counts.engines} (${manifest.engines.aiEngines.length} AI)`);
console.log(`Dispatchers: ${manifest.counts.dispatchers}`);
console.log(`Skills: ${manifest.counts.skills}`);
console.log(`Hooks: ${manifest.counts.hooks}`);
console.log(`Tribal Tips: ${manifest.counts.tribalTips}`);
console.log(`Resources: ${manifest.counts.resourceFolders} folders`);
console.log(`JM DIE: ${manifest.counts.jmDieFolders} folders`);
console.log(`\nSaved: ${outputPath}`);
