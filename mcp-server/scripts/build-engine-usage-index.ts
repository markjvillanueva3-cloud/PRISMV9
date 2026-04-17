#!/usr/bin/env node
/**
 * build-engine-usage-index — reverse index mapping engines to their consumers
 *
 * Universal Phase 0.7. Creates ENGINE_USAGE_INDEX.json which maps every engine
 * file to its consumers (dispatchers, actions, skills, hooks, tests). Backs
 * AwarenessQueryEngine.dependentsOfEngine() and future orphan surfacing.
 *
 * OPTIMIZED: Scans consumer files once, extracts all engine refs in single pass.
 * Runtime: ~10-20s for 2000+ engines (vs 5+ min for naive approach).
 *
 * Output: mcp-server/data/state/ENGINE_USAGE_INDEX.json
 *
 * Usage:
 *   node --import tsx scripts/build-engine-usage-index.ts
 *   node --import tsx scripts/build-engine-usage-index.ts --verbose
 *   node --import tsx scripts/build-engine-usage-index.ts --json
 *
 * @module scripts/build-engine-usage-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const ENGINES_DIR = path.join(ROOT, "src", "engines");
const DISPATCHERS_DIR = path.join(ROOT, "src", "tools", "dispatchers");
const HOOKS_DIR = path.join(ROOT, "src", "hooks");
const TESTS_DIR = path.join(ROOT, "src", "__tests__");
const ROUTES_DIR = path.join(ROOT, "src", "routes");
const SKILLS_DIR = path.join(ROOT, "..", ".claude", "commands");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "ENGINE_USAGE_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface EngineUsage {
  dispatchers: string[];
  actions: string[];
  skills: string[];
  hooks: string[];
  tests: string[];
  routes: string[];
  formulas: string[];
  tipsReferencing: string[];
}

export interface EngineUsageIndex {
  schemaVersion: number;
  lastUpdated: string;
  engineCount: number;
  engines: Record<string, EngineUsage>;
}

// ============================================================================
// OPTIMIZED SCANNER (inverted index approach)
// ============================================================================

/**
 * Extract all engine names referenced in a source file.
 * Looks for import statements and direct references.
 */
function extractEngineRefs(content: string, knownEngines: Set<string>): string[] {
  const refs = new Set<string>();

  // Pattern 1: import from engines path
  const importMatches = content.matchAll(/from\s+["'][^"']*\/engines\/([A-Z][A-Za-z0-9]+)(?:\.js)?["']/g);
  for (const m of importMatches) {
    if (knownEngines.has(m[1])) refs.add(m[1]);
  }

  // Pattern 2: import { XEngine } or import { xEngine }
  const namedImports = content.matchAll(/import\s*\{([^}]+)\}/g);
  for (const m of namedImports) {
    const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
    for (const name of names) {
      if (knownEngines.has(name)) refs.add(name);
      // Also check camelCase variant
      const pascal = name.charAt(0).toUpperCase() + name.slice(1);
      if (knownEngines.has(pascal)) refs.add(pascal);
    }
  }

  // Pattern 3: Direct word boundary match for known engines
  for (const engine of knownEngines) {
    if (content.includes(engine)) {
      // Verify it's a word boundary match (not substring)
      const re = new RegExp(`\\b${engine}\\b`);
      if (re.test(content)) refs.add(engine);
    }
  }

  return [...refs];
}

/**
 * Extract action names associated with engine references in a dispatcher.
 * Simplified: looks for case statements in the same file.
 */
function extractActionsFromDispatcher(content: string, engineNames: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (engineNames.length === 0) return result;

  // Build a set for fast lookup
  const engineSet = new Set(engineNames);
  const engineCamelSet = new Set(engineNames.map((e) => e.charAt(0).toLowerCase() + e.slice(1)));

  // Split into case blocks
  const casePattern = /case\s+"([a-z_][a-z0-9_]*)"\s*:/g;
  const cases: Array<{ action: string; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = casePattern.exec(content))) {
    cases.push({ action: m[1], start: m.index });
  }

  // For each case, check if any engine is referenced in the next ~2000 chars
  for (let i = 0; i < cases.length; i++) {
    const start = cases[i].start;
    const end = i + 1 < cases.length ? cases[i + 1].start : Math.min(start + 2000, content.length);
    const block = content.slice(start, end);

    for (const engine of engineSet) {
      if (block.includes(engine)) {
        if (!result.has(engine)) result.set(engine, []);
        result.get(engine)!.push(cases[i].action);
      }
    }
    for (const camel of engineCamelSet) {
      if (block.includes(camel)) {
        const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
        if (engineSet.has(pascal)) {
          if (!result.has(pascal)) result.set(pascal, []);
          if (!result.get(pascal)!.includes(cases[i].action)) {
            result.get(pascal)!.push(cases[i].action);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Scan a directory and return map of file -> referenced engines
 */
async function scanDirectoryForRefs(
  dirPath: string,
  extension: string,
  knownEngines: Set<string>
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith(extension)) continue;

      const filePath = path.join(dirPath, file);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const refs = extractEngineRefs(content, knownEngines);
        if (refs.length > 0) {
          results.set(file, refs);
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return results;
}

/**
 * Build the complete index for all engines (optimized single-pass)
 */
export async function buildEngineUsageIndex(opts: { verbose?: boolean } = {}): Promise<EngineUsageIndex> {
  // Step 1: Get all engine names
  let engineFiles: string[];
  try {
    engineFiles = (await fs.readdir(ENGINES_DIR)).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")
    );
  } catch {
    engineFiles = [];
  }

  const engineNames = new Set(engineFiles.map((f) => f.replace(/\.ts$/, "")));
  if (opts.verbose) {
    console.log(`[build-engine-usage-index] Found ${engineNames.size} engine files`);
  }

  // Step 2: Initialize empty usage for each engine
  const engines: Record<string, EngineUsage> = {};
  for (const name of engineNames) {
    engines[name] = {
      dispatchers: [],
      actions: [],
      skills: [],
      hooks: [],
      tests: [],
      routes: [],
      formulas: [],
      tipsReferencing: [],
    };
  }

  // Step 3: Scan dispatchers (with action extraction)
  if (opts.verbose) console.log("  Scanning dispatchers...");
  try {
    const dispatcherFiles = await fs.readdir(DISPATCHERS_DIR);
    for (const file of dispatcherFiles) {
      if (!file.endsWith("Dispatcher.ts")) continue;

      const content = await fs.readFile(path.join(DISPATCHERS_DIR, file), "utf-8");
      const refs = extractEngineRefs(content, engineNames);
      const actionMap = extractActionsFromDispatcher(content, refs);

      for (const engine of refs) {
        if (engines[engine]) {
          engines[engine].dispatchers.push(file);
          const actions = actionMap.get(engine) || [];
          engines[engine].actions.push(...actions);
        }
      }
    }
  } catch {
    // Dispatchers dir missing
  }

  // Step 4: Scan hooks
  if (opts.verbose) console.log("  Scanning hooks...");
  const hookRefs = await scanDirectoryForRefs(HOOKS_DIR, ".ts", engineNames);
  for (const [file, refs] of hookRefs) {
    for (const engine of refs) {
      if (engines[engine]) engines[engine].hooks.push(file);
    }
  }

  // Step 5: Scan tests
  if (opts.verbose) console.log("  Scanning tests...");
  const testRefs = await scanDirectoryForRefs(TESTS_DIR, ".test.ts", engineNames);
  for (const [file, refs] of testRefs) {
    for (const engine of refs) {
      if (engines[engine]) engines[engine].tests.push(file);
    }
  }

  // Step 6: Scan routes
  if (opts.verbose) console.log("  Scanning routes...");
  const routeRefs = await scanDirectoryForRefs(ROUTES_DIR, ".ts", engineNames);
  for (const [file, refs] of routeRefs) {
    for (const engine of refs) {
      if (engines[engine]) engines[engine].routes.push(file);
    }
  }

  // Step 7: Scan skills (markdown files)
  if (opts.verbose) console.log("  Scanning skills...");
  try {
    const skillFiles = await fs.readdir(SKILLS_DIR);
    for (const file of skillFiles) {
      if (!file.endsWith(".md")) continue;

      const content = await fs.readFile(path.join(SKILLS_DIR, file), "utf-8");
      for (const engine of engineNames) {
        if (content.includes(engine)) {
          engines[engine].skills.push(file);
        }
      }
    }
  } catch {
    // Skills dir missing
  }

  // Step 8: Dedupe arrays
  for (const usage of Object.values(engines)) {
    usage.dispatchers = [...new Set(usage.dispatchers)];
    usage.actions = [...new Set(usage.actions)];
    usage.skills = [...new Set(usage.skills)];
    usage.hooks = [...new Set(usage.hooks)];
    usage.tests = [...new Set(usage.tests)];
    usage.routes = [...new Set(usage.routes)];
  }

  const index: EngineUsageIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    engineCount: Object.keys(engines).length,
    engines,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.engineCount} engines indexed.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeEngineUsageIndex(index: EngineUsageIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readEngineUsageIndex(): Promise<EngineUsageIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as EngineUsageIndex;
  } catch {
    return null;
  }
}

/**
 * Get usage for a specific engine
 */
export async function getEngineUsage(engineName: string): Promise<EngineUsage | null> {
  const index = await readEngineUsageIndex();
  if (!index) return null;
  return index.engines[engineName] || null;
}

// ============================================================================
// CLI
// ============================================================================

interface CliArgs {
  json: boolean;
  verbose: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { json: false, verbose: false, dryRun: false };
  for (const a of argv) {
    if (a === "--json") args.json = true;
    else if (a === "--verbose") args.verbose = true;
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

function printSummary(index: EngineUsageIndex): void {
  console.log(`build-engine-usage-index — ${index.engineCount} engines indexed`);

  let withDispatchers = 0;
  let withTests = 0;
  let orphans = 0;

  for (const usage of Object.values(index.engines)) {
    if (usage.dispatchers.length > 0) withDispatchers++;
    if (usage.tests.length > 0) withTests++;
    if (
      usage.dispatchers.length === 0 &&
      usage.tests.length === 0 &&
      usage.hooks.length === 0 &&
      usage.routes.length === 0
    ) {
      orphans++;
    }
  }

  console.log(`  with dispatchers: ${withDispatchers}`);
  console.log(`  with tests: ${withTests}`);
  console.log(`  potential orphans: ${orphans}`);
  console.log(`  last updated: ${index.lastUpdated}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log("[build-engine-usage-index] Scanning...");
  const start = Date.now();
  const index = await buildEngineUsageIndex({ verbose: args.verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (args.json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  if (!args.dryRun) {
    await writeEngineUsageIndex(index);
    console.log(`[build-engine-usage-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);
  } else {
    console.log(`[build-engine-usage-index] Dry run (${elapsed}s)`);
  }

  printSummary(index);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-engine-usage-index failed:", err);
    process.exit(2);
  });
}
