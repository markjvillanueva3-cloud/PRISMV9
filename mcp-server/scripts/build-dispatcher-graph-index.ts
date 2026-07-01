#!/usr/bin/env node
/**
 * build-dispatcher-graph-index — index mapping dispatchers to their call graphs
 *
 * Universal Phase 0.7. Creates DISPATCHER_GRAPH_INDEX.json which maps every
 * dispatcher to its actions, engines called, routes, and dependencies.
 * Backs AwarenessQueryEngine.dispatcherCallGraph() for architecture visualization.
 *
 * Output: mcp-server/data/state/DISPATCHER_GRAPH_INDEX.json
 *
 * @module scripts/build-dispatcher-graph-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const DISPATCHERS_DIR = path.join(ROOT, "src", "tools", "dispatchers");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "DISPATCHER_GRAPH_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface DispatcherNode {
  name: string;
  file: string;
  actions: string[];
  enginesCalled: string[];
  importsFrom: string[];
  exportedFunctions: string[];
  lineCount: number;
  sha256: string;
}

export interface DispatcherGraphIndex {
  schemaVersion: number;
  lastUpdated: string;
  dispatcherCount: number;
  totalActions: number;
  dispatchers: Record<string, DispatcherNode>;
  byEngine: Record<string, string[]>;
  byAction: Record<string, string>;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Extract actions from dispatcher file
 */
function extractActions(content: string): string[] {
  const actions: string[] = [];

  // Pattern 1: z.enum([...]) inline
  const enumMatch = content.match(/z\.enum\(\s*\[([\s\S]*?)\]\s*\)/);
  if (enumMatch) {
    const matches = enumMatch[1].match(/"([^"]+)"/g);
    if (matches) {
      actions.push(...matches.map((m) => m.replace(/"/g, "")));
    }
  }

  // Pattern 2: const ACTIONS = [...]
  const constMatch = content.match(/const\s+(?:ACTIONS|actions|ACTION_LIST)\s*=\s*\[([\s\S]*?)\]/i);
  if (constMatch) {
    const matches = constMatch[1].match(/"([^"]+)"/g);
    if (matches) {
      actions.push(...matches.map((m) => m.replace(/"/g, "")));
    }
  }

  // Pattern 3: case "action_name":
  const casePattern = /case\s+"([a-z_][a-z0-9_]*)"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = casePattern.exec(content))) {
    if (!actions.includes(m[1])) {
      actions.push(m[1]);
    }
  }

  return [...new Set(actions)];
}

/**
 * Extract engine references from dispatcher file
 */
function extractEngines(content: string): string[] {
  const engines: string[] = [];
  const pattern = /\b([A-Z][a-zA-Z0-9]*Engine)\b/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content))) {
    if (!engines.includes(m[1])) {
      engines.push(m[1]);
    }
  }
  return engines;
}

/**
 * Extract imports from dispatcher file
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  const pattern = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content))) {
    imports.push(m[1]);
  }
  return imports;
}

/**
 * Extract exported functions from dispatcher file
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];

  // export function name
  const funcPattern = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = funcPattern.exec(content))) {
    exports.push(m[1]);
  }

  // export const name
  const constPattern = /export\s+const\s+(\w+)/g;
  while ((m = constPattern.exec(content))) {
    exports.push(m[1]);
  }

  return exports;
}

/**
 * Build the complete dispatcher graph index
 */
export async function buildDispatcherGraphIndex(opts: { verbose?: boolean } = {}): Promise<DispatcherGraphIndex> {
  const dispatchers: Record<string, DispatcherNode> = {};
  const byEngine: Record<string, string[]> = {};
  const byAction: Record<string, string> = {};
  let totalActions = 0;

  let files: string[];
  try {
    files = (await fs.readdir(DISPATCHERS_DIR)).filter((f) => f.endsWith(".ts"));
  } catch {
    files = [];
  }

  if (opts.verbose) {
    console.log(`[build-dispatcher-graph-index] Found ${files.length} dispatcher files`);
  }

  for (const file of files) {
    const filePath = path.join(DISPATCHERS_DIR, file);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const name = file.replace(".ts", "");

      const actions = extractActions(content);
      const enginesCalled = extractEngines(content);
      const importsFrom = extractImports(content);
      const exportedFunctions = extractExports(content);

      const node: DispatcherNode = {
        name,
        file,
        actions,
        enginesCalled,
        importsFrom,
        exportedFunctions,
        lineCount: content.split("\n").length,
        sha256: crypto.createHash("sha256").update(content).digest("hex").slice(0, 16),
      };

      dispatchers[name] = node;
      totalActions += actions.length;

      // Build reverse indexes
      for (const engine of enginesCalled) {
        if (!byEngine[engine]) byEngine[engine] = [];
        if (!byEngine[engine].includes(name)) {
          byEngine[engine].push(name);
        }
      }

      for (const action of actions) {
        byAction[action] = name;
      }

      if (opts.verbose && actions.length > 0) {
        console.log(`  ${name}: ${actions.length} actions, ${enginesCalled.length} engines`);
      }
    } catch {
      // Skip unreadable
    }
  }

  const index: DispatcherGraphIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    dispatcherCount: Object.keys(dispatchers).length,
    totalActions,
    dispatchers,
    byEngine,
    byAction,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.dispatcherCount} dispatchers, ${totalActions} actions, ${Object.keys(byEngine).length} engines.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeDispatcherGraphIndex(index: DispatcherGraphIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readDispatcherGraphIndex(): Promise<DispatcherGraphIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as DispatcherGraphIndex;
  } catch {
    return null;
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const json = process.argv.includes("--json");

  console.log("[build-dispatcher-graph-index] Scanning...");
  const start = Date.now();
  const index = await buildDispatcherGraphIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeDispatcherGraphIndex(index);
  console.log(`[build-dispatcher-graph-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  const avgActions = index.dispatcherCount > 0 ? Math.round(index.totalActions / index.dispatcherCount) : 0;

  console.log(`build-dispatcher-graph-index — ${index.dispatcherCount} dispatchers`);
  console.log(`  total actions: ${index.totalActions}`);
  console.log(`  avg actions/dispatcher: ${avgActions}`);
  console.log(`  engines referenced: ${Object.keys(index.byEngine).length}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-dispatcher-graph-index failed:", err);
    process.exit(2);
  });
}
