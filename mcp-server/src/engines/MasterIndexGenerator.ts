/**
 * MasterIndexGenerator.ts — Auto-scans MCP server source to produce MASTER_INDEX.json
 *
 * Scans dispatchers, engines, registries, services, utils, hooks, and skills
 * at startup. Maintains a living index as the single source of truth.
 * Includes DSL eligibility classification and auto-categorization.
 */
import * as fs from "fs";
import * as path from "path";

// ── Types ──────────────────────────────────────────────────────────────

export interface DispatcherEntry {
  name: string;
  file: string;
  actions: string[];
  action_count: number;
  category: string;
  dsl_eligible_actions: string[];
}

export interface EngineEntry {
  name: string;
  file: string;
  exports: string[];
  category: string;
  auto_fire_eligible: boolean;
}

export interface HookEntry {
  name: string;
  file: string;
  event: string;
}

export interface ServiceEntry {
  name: string;
  file: string;
  exports: string[];
}

export interface UtilEntry {
  name: string;
  file: string;
  exports: string[];
}

export interface MasterIndex {
  generated_at: string;
  dispatchers: DispatcherEntry[];
  engines: EngineEntry[];
  hooks: HookEntry[];
  services: ServiceEntry[];
  utils: UtilEntry[];
  skills: { count: number; triggers: number };
  totals: {
    dispatchers: number;
    actions: number;
    engines: number;
    hooks: number;
    services: number;
    utils: number;
  };
}

// ── Constants ──────────────────────────────────────────────────────────

const MCP_ROOT = "C:\\PRISM\\mcp-server";
const SRC_DIR = path.join(MCP_ROOT, "src");
const OUTPUT_FILE = path.join("C:\\PRISM\\data", "MASTER_INDEX.json");
const SKILLS_DIR = "C:\\PRISM\\skills-consolidated";
const HELPERS_DIR = "C:\\PRISM\\.claude\\helpers";

// ── Category Detection ─────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  manufacturing: ["cutting", "spindle", "tool", "material", "machine", "cnc", "gcode", "feed", "speed", "thread", "coolant", "workhold"],
  intelligence: ["intelligence", "knowledge", "learning", "predict", "inference", "classify", "nlp", "genome"],
  safety: ["safety", "collision", "breakage", "compliance", "pfp", "failure", "alarm"],
  session: ["session", "lifecycle", "handoff", "checkpoint", "compaction", "recovery"],
  coordination: ["swarm", "agent", "orchestrat", "pipeline", "batch", "workflow", "hook"],
  utility: ["slim", "cache", "diff", "template", "format", "render", "resolve"],
  core: ["cadence", "dispatch", "context", "budget", "telemetry", "memory", "graph"],
};

function categorize(fileName: string, content: string): string {
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

// ── DSL Eligibility ────────────────────────────────────────────────────

/**
 * Classify whether an action is DSL-eligible based on its surrounding code.
 * Criteria: structured params (>3 typed fields), returns structured JSON, deterministic output shape.
 */
function classifyDSLEligibility(actionName: string, caseBlock: string): boolean {
  const hasStructuredInput = (caseBlock.match(/params\.\w+/g) || []).length >= 3
    || (caseBlock.match(/args\.\w+/g) || []).length >= 3;
  const hasStructuredOutput = caseBlock.includes("JSON.stringify")
    || (caseBlock.match(/return\s*\{/g) || []).length > 0
    || caseBlock.includes("result:");
  const isFreeform = caseBlock.includes("description") && caseBlock.includes("freeform");

  if (isFreeform) return false;
  return hasStructuredInput || hasStructuredOutput;
}

// ── Auto-fire Eligibility ──────────────────────────────────────────────

const AUTO_FIRE_ENGINE_PATTERNS = [
  "SwarmExecutor", "AgentExecutor", "SwarmGroupExecutor",
  "TaskAgentClassifier", "IntelligenceEngine", "KnowledgeQueryEngine",
  "PhysicsPredictionEngine", "OptimizationEngine",
];

// ── Scanner Functions ──────────────────────────────────────────────────

function safeReadFile(filePath: string): string {
  try { return fs.readFileSync(filePath, "utf-8"); } catch { return ""; }
}

function safeReadDir(dirPath: string): string[] {
  try { return fs.readdirSync(dirPath); } catch { return []; }
}

/** Extract case action names from a dispatcher file */
function extractCaseActions(content: string): string[] {
  const actions: string[] = [];
  const caseRegex = /case\s+["']([^"']+)["']\s*:/g;
  let match;
  while ((match = caseRegex.exec(content)) !== null) {
    actions.push(match[1]);
  }
  return [...new Set(actions)];
}

/** Extract exported names from a TS file */
function extractExports(content: string): string[] {
  const exports: string[] = [];
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
function extractDSLEligible(content: string, actions: string[]): string[] {
  const eligible: string[] = [];
  for (const action of actions) {
    const idx = content.indexOf(`case "${action}"`);
    if (idx === -1) continue;
    const block = content.slice(idx, idx + 500);
    if (classifyDSLEligibility(action, block)) eligible.push(action);
  }
  return eligible;
}

// ── Main Generator ─────────────────────────────────────────────────────

export async function generate(): Promise<MasterIndex> {
  const dispatchers: DispatcherEntry[] = [];
  const engines: EngineEntry[] = [];
  const hooks: HookEntry[] = [];
  const services: ServiceEntry[] = [];
  const utils: UtilEntry[] = [];

  // 1. Scan dispatchers
  const dispatcherDir = path.join(SRC_DIR, "tools", "dispatchers");
  for (const file of safeReadDir(dispatcherDir)) {
    if (!file.endsWith(".ts")) continue;
    const filePath = path.join(dispatcherDir, file);
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

  // 2. Scan engines
  const engineDir = path.join(SRC_DIR, "engines");
  for (const file of safeReadDir(engineDir)) {
    if (!file.endsWith(".ts") || file === "index.ts") continue;
    const filePath = path.join(engineDir, file);
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

  // 3. Scan services
  const serviceDir = path.join(SRC_DIR, "services");
  for (const file of safeReadDir(serviceDir)) {
    if (!file.endsWith(".ts")) continue;
    const content = safeReadFile(path.join(serviceDir, file));
    services.push({
      name: file.replace(/\.ts$/, ""),
      file: `src/services/${file}`,
      exports: extractExports(content).slice(0, 15),
    });
  }

  // 4. Scan utils
  const utilDir = path.join(SRC_DIR, "utils");
  for (const file of safeReadDir(utilDir)) {
    if (!file.endsWith(".ts")) continue;
    const content = safeReadFile(path.join(utilDir, file));
    utils.push({
      name: file.replace(/\.ts$/, ""),
      file: `src/utils/${file}`,
      exports: extractExports(content).slice(0, 15),
    });
  }

  // 5. Scan hooks (shell scripts in helpers dir)
  for (const file of safeReadDir(HELPERS_DIR)) {
    if (!file.endsWith(".sh")) continue;
    const content = safeReadFile(path.join(HELPERS_DIR, file));
    let event = "unknown";
    if (content.includes("PreToolUse") || file.includes("pretool")) event = "PreToolUse";
    else if (content.includes("PostToolUse") || file.includes("posttool")) event = "PostToolUse";
    else if (content.includes("UserPromptSubmit") || file.includes("session-start")) event = "UserPromptSubmit";
    else if (content.includes("PreCompact") || file.includes("precompact")) event = "PreCompact";
    else if (content.includes("auto-approve")) event = "PreToolUse";
    hooks.push({ name: file.replace(/\.sh$/, ""), file: `.claude/helpers/${file}`, event });
  }

  // 6. Scan skills
  let skillCount = 0;
  let triggerCount = 0;
  try {
    const triggerMapPath = path.join(SKILLS_DIR, "TRIGGER_MAP.json");
    if (fs.existsSync(triggerMapPath)) {
      const triggerMap = JSON.parse(fs.readFileSync(triggerMapPath, "utf-8"));
      if (Array.isArray(triggerMap)) {
        skillCount = triggerMap.length;
        triggerCount = triggerMap.reduce((sum: number, entry: any) =>
          sum + (entry.triggers?.length || 0), 0);
      } else if (typeof triggerMap === "object") {
        skillCount = Object.keys(triggerMap).length;
        triggerCount = (Object.values(triggerMap) as any[]).reduce((sum: number, entry: any) =>
          sum + (Array.isArray(entry) ? entry.length : entry?.triggers?.length || 0), 0);
      }
    }
  } catch { /* non-fatal */ }

  const totalActions = dispatchers.reduce((s, d) => s + d.action_count, 0);

  const index: MasterIndex = {
    generated_at: new Date().toISOString(),
    dispatchers,
    engines,
    hooks,
    services,
    utils,
    skills: { count: skillCount, triggers: triggerCount },
    totals: {
      dispatchers: dispatchers.length,
      actions: totalActions,
      engines: engines.length,
      hooks: hooks.length,
      services: services.length,
      utils: utils.length,
    },
  };

  // Write to disk
  try {
    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
  } catch { /* non-fatal */ }

  return index;
}

/** Check if the index is stale (file was modified in a tracked directory) */
export function isStale(modifiedFile: string): boolean {
  const stalePaths = [
    "src/tools/dispatchers/",
    "src/engines/",
    "src/registries/",
    "src/services/",
    "src/utils/",
  ];
  const normalized = modifiedFile.replace(/\\/g, "/");
  return stalePaths.some(p => normalized.includes(p));
}
