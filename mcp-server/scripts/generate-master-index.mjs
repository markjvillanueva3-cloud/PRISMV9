#!/usr/bin/env node
/**
 * generate-master-index.mjs — Standalone script to generate MASTER_INDEX.json
 *
 * Mirrors the logic from src/engines/MasterIndexGenerator.ts but runs directly
 * via Node.js without requiring the full dist build or its module resolution.
 *
 * Usage:  node scripts/generate-master-index.mjs
 * Output: data/MASTER_INDEX.json  AND  ../data/MASTER_INDEX.json (repo root)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MCP_ROOT = resolve(__dirname, "..");
const SRC_DIR = join(MCP_ROOT, "src");
const REPO_ROOT = resolve(MCP_ROOT, "..");
const OUTPUT_MCP = join(MCP_ROOT, "data", "MASTER_INDEX.json");
const OUTPUT_REPO = join(REPO_ROOT, "data", "MASTER_INDEX.json");
const HELPERS_DIR = join(REPO_ROOT, ".claude", "helpers");

// ── Helpers ───────────────────────────────────────────────────────────

function safeReadFile(filePath) {
  try { return readFileSync(filePath, "utf-8"); } catch { return ""; }
}

function safeReadDir(dirPath) {
  try { return readdirSync(dirPath); } catch { return []; }
}

// ── Category Detection ────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  manufacturing: ["cutting", "spindle", "tool", "material", "machine", "cnc", "gcode", "feed", "speed", "thread", "coolant", "workhold"],
  intelligence: ["intelligence", "knowledge", "learning", "predict", "inference", "classify", "nlp", "genome"],
  safety: ["safety", "collision", "breakage", "compliance", "pfp", "failure", "alarm"],
  session: ["session", "lifecycle", "handoff", "checkpoint", "compaction", "recovery"],
  coordination: ["swarm", "agent", "orchestrat", "pipeline", "batch", "workflow", "hook"],
  utility: ["slim", "cache", "diff", "template", "format", "render", "resolve"],
  core: ["cadence", "dispatch", "context", "budget", "telemetry", "memory", "graph"],
};

function categorize(fileName, content) {
  const text = (fileName + " " + content.slice(0, 1500)).toLowerCase();
  let bestCategory = "utility";
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

// ── DSL Eligibility ───────────────────────────────────────────────────

function classifyDSLEligibility(actionName, caseBlock) {
  const hasStructuredInput = (caseBlock.match(/params\.\w+/g) || []).length >= 3
    || (caseBlock.match(/args\.\w+/g) || []).length >= 3;
  const hasStructuredOutput = caseBlock.includes("JSON.stringify")
    || (caseBlock.match(/return\s*\{/g) || []).length > 0
    || caseBlock.includes("result:");
  const isFreeform = caseBlock.includes("description") && caseBlock.includes("freeform");
  if (isFreeform) return false;
  return hasStructuredInput || hasStructuredOutput;
}

// ── Auto-fire Patterns ───────────────────────────────────────────────

const AUTO_FIRE_ENGINE_PATTERNS = [
  "SwarmExecutor", "AgentExecutor", "SwarmGroupExecutor",
  "TaskAgentClassifier", "IntelligenceEngine", "KnowledgeQueryEngine",
  "PhysicsPredictionEngine", "OptimizationEngine",
];

// ── Extract Functions ─────────────────────────────────────────────────

/** Extract case action names from a dispatcher file */
function extractCaseActions(content) {
  const actions = [];
  const caseRegex = /case\s+["']([^"']+)["']\s*:/g;
  let match;
  while ((match = caseRegex.exec(content)) !== null) {
    actions.push(match[1]);
  }
  return [...new Set(actions)];
}

/** Extract exported names from a TS file */
function extractExports(content) {
  const exports = [];
  const patterns = [
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+class\s+(\w+)/g,
    /export\s+const\s+(\w+)/g,
    /export\s+(?:type|interface)\s+(\w+)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      exports.push(match[1]);
    }
  }
  return [...new Set(exports)];
}

/** Extract DSL-eligible actions from dispatcher content */
function extractDSLEligible(content, actions) {
  const eligible = [];
  for (const action of actions) {
    const idx = content.indexOf(`case "${action}"`);
    if (idx === -1) continue;
    const block = content.slice(idx, idx + 500);
    if (classifyDSLEligibility(action, block)) eligible.push(action);
  }
  return eligible;
}

/** Extract route prefix from a route file */
function extractRoutePrefix(content) {
  // Match router.use("/prefix", ...) or app.use("/prefix", ...)
  const prefixMatch = content.match(/(?:router|app)\.use\s*\(\s*["']([^"']+)["']/);
  if (prefixMatch) return prefixMatch[1];
  // Match export path or route path
  const pathMatch = content.match(/(?:path|prefix|basePath)\s*[:=]\s*["']([^"']+)["']/);
  if (pathMatch) return pathMatch[1];
  return null;
}

/** Extract route methods/endpoints from a route file */
function extractRouteEndpoints(content) {
  const endpoints = [];
  const methodRegex = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    endpoints.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return endpoints;
}

// ── Main Generator ────────────────────────────────────────────────────

function generate() {
  const dispatchers = [];
  const engines = [];
  const hooks = [];
  const services = [];
  const utils = [];
  const schemas = [];
  const routes = [];

  console.log("Scanning dispatchers...");
  const dispatcherDir = join(SRC_DIR, "tools", "dispatchers");
  for (const file of safeReadDir(dispatcherDir)) {
    if (!file.endsWith(".ts")) continue;
    const filePath = join(dispatcherDir, file);
    const content = safeReadFile(filePath);
    const name = file.replace(/Dispatcher\.ts$|\.ts$/, "");
    const actions = extractCaseActions(content);
    const category = categorize(file, content);
    const dslEligible = extractDSLEligible(content, actions);
    dispatchers.push({
      name: `prism_${name}`,
      file: `src/tools/dispatchers/${file}`,
      actions,
      action_count: actions.length,
      category,
      dsl_eligible_actions: dslEligible,
    });
  }
  console.log(`  Found ${dispatchers.length} dispatchers`);

  console.log("Scanning engines...");
  const engineDir = join(SRC_DIR, "engines");
  for (const file of safeReadDir(engineDir)) {
    if (!file.endsWith(".ts") || file === "index.ts") continue;
    const filePath = join(engineDir, file);
    const content = safeReadFile(filePath);
    const name = file.replace(/\.ts$/, "");
    const exps = extractExports(content);
    const category = categorize(file, content);
    const autoFireEligible = AUTO_FIRE_ENGINE_PATTERNS.some(p => name.includes(p));
    engines.push({
      name,
      file: `src/engines/${file}`,
      exports: exps.slice(0, 20),
      category,
      auto_fire_eligible: autoFireEligible,
    });
  }
  console.log(`  Found ${engines.length} engines`);

  console.log("Scanning schemas...");
  const schemaDir = join(SRC_DIR, "schemas");
  for (const file of safeReadDir(schemaDir)) {
    if (!file.endsWith(".ts")) continue;
    const filePath = join(schemaDir, file);
    const content = safeReadFile(filePath);
    const exps = extractExports(content);
    schemas.push({
      name: file.replace(/\.ts$/, ""),
      file: `src/schemas/${file}`,
      exports: exps.slice(0, 30),
      export_count: exps.length,
    });
  }
  console.log(`  Found ${schemas.length} schema files`);

  console.log("Scanning routes...");
  const routeDir = join(SRC_DIR, "routes");
  for (const file of safeReadDir(routeDir)) {
    if (!file.endsWith(".ts") || file === "index.ts") continue;
    const filePath = join(routeDir, file);
    const content = safeReadFile(filePath);
    const prefix = extractRoutePrefix(content);
    const endpoints = extractRouteEndpoints(content);
    routes.push({
      name: file.replace(/\.ts$/, ""),
      file: `src/routes/${file}`,
      prefix: prefix || `/api/v1/${file.replace(/\.ts$/, "")}`,
      endpoint_count: endpoints.length,
      endpoints: endpoints.slice(0, 30),
    });
  }
  console.log(`  Found ${routes.length} route files`);

  console.log("Scanning services...");
  const serviceDir = join(SRC_DIR, "services");
  for (const file of safeReadDir(serviceDir)) {
    if (!file.endsWith(".ts")) continue;
    const content = safeReadFile(join(serviceDir, file));
    services.push({
      name: file.replace(/\.ts$/, ""),
      file: `src/services/${file}`,
      exports: extractExports(content).slice(0, 15),
    });
  }
  console.log(`  Found ${services.length} services`);

  console.log("Scanning utils...");
  const utilDir = join(SRC_DIR, "utils");
  for (const file of safeReadDir(utilDir)) {
    if (!file.endsWith(".ts")) continue;
    const content = safeReadFile(join(utilDir, file));
    utils.push({
      name: file.replace(/\.ts$/, ""),
      file: `src/utils/${file}`,
      exports: extractExports(content).slice(0, 15),
    });
  }
  console.log(`  Found ${utils.length} utils`);

  console.log("Scanning hooks...");
  for (const file of safeReadDir(HELPERS_DIR)) {
    if (!file.endsWith(".sh") && !file.endsWith(".mjs")) continue;
    const content = safeReadFile(join(HELPERS_DIR, file));
    let event = "unknown";
    if (content.includes("PreToolUse") || file.includes("pretool")) event = "PreToolUse";
    else if (content.includes("PostToolUse") || file.includes("posttool")) event = "PostToolUse";
    else if (content.includes("UserPromptSubmit") || file.includes("session-start")) event = "UserPromptSubmit";
    else if (content.includes("PreCompact") || file.includes("precompact") || file.includes("pre-compact")) event = "PreCompact";
    else if (content.includes("auto-approve") || content.includes("auto_approve")) event = "PreToolUse";
    else if (content.includes("Notification")) event = "Notification";
    hooks.push({
      name: file.replace(/\.(sh|mjs)$/, ""),
      file: `.claude/helpers/${file}`,
      event,
      type: file.endsWith(".mjs") ? "node" : "shell",
    });
  }
  console.log(`  Found ${hooks.length} hooks`);

  // Skills count (check for TRIGGER_MAP)
  let skillCount = 0;
  let triggerCount = 0;
  const skillsDir = join(REPO_ROOT, "skills-consolidated");
  try {
    const triggerMapPath = join(skillsDir, "TRIGGER_MAP.json");
    if (existsSync(triggerMapPath)) {
      const triggerMap = JSON.parse(readFileSync(triggerMapPath, "utf-8"));
      if (Array.isArray(triggerMap)) {
        skillCount = triggerMap.length;
        triggerCount = triggerMap.reduce((sum, entry) =>
          sum + (entry.triggers?.length || 0), 0);
      } else if (typeof triggerMap === "object") {
        skillCount = Object.keys(triggerMap).length;
        triggerCount = Object.values(triggerMap).reduce((sum, entry) =>
          sum + (Array.isArray(entry) ? entry.length : (entry?.triggers?.length || 0)), 0);
      }
    }
  } catch { /* non-fatal */ }

  const totalActions = dispatchers.reduce((s, d) => s + d.action_count, 0);
  const totalEndpoints = routes.reduce((s, r) => s + r.endpoint_count, 0);
  const totalSchemaExports = schemas.reduce((s, sc) => s + sc.export_count, 0);

  const index = {
    generated_at: new Date().toISOString(),
    version: "1.0.0",
    dispatchers,
    engines,
    schemas,
    routes,
    services,
    utils,
    hooks,
    skills: { count: skillCount, triggers: triggerCount },
    totals: {
      dispatchers: dispatchers.length,
      actions: totalActions,
      engines: engines.length,
      schemas: schemas.length,
      schema_exports: totalSchemaExports,
      routes: routes.length,
      endpoints: totalEndpoints,
      hooks: hooks.length,
      services: services.length,
      utils: utils.length,
    },
  };

  return index;
}

// ── Run ───────────────────────────────────────────────────────────────

console.log("=== PRISM MASTER_INDEX.json Generator ===\n");
const index = generate();

const json = JSON.stringify(index, null, 2);

// Write to mcp-server/data/
const mcpDataDir = dirname(OUTPUT_MCP);
if (!existsSync(mcpDataDir)) mkdirSync(mcpDataDir, { recursive: true });
writeFileSync(OUTPUT_MCP, json, "utf-8");
console.log(`\nWrote ${OUTPUT_MCP}`);

// Write to repo-root/data/
const repoDataDir = dirname(OUTPUT_REPO);
if (!existsSync(repoDataDir)) mkdirSync(repoDataDir, { recursive: true });
writeFileSync(OUTPUT_REPO, json, "utf-8");
console.log(`Wrote ${OUTPUT_REPO}`);

console.log("\n=== Totals ===");
console.log(JSON.stringify(index.totals, null, 2));
console.log("\nDone.");
