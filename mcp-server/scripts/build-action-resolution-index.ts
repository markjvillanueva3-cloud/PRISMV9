#!/usr/bin/env node
/**
 * build-action-resolution-index — reverse index mapping actions to their components
 *
 * Universal Phase 0.7. Creates ACTION_RESOLUTION_INDEX.json which maps every
 * dispatcher action to its engine, schema, tests, and related artifacts.
 * Backs AwarenessQueryEngine.resolveAction().
 *
 * Output: mcp-server/data/state/ACTION_RESOLUTION_INDEX.json
 *
 * Usage:
 *   node --import tsx scripts/build-action-resolution-index.ts
 *   node --import tsx scripts/build-action-resolution-index.ts --verbose
 *
 * @module scripts/build-action-resolution-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const DISPATCHERS_DIR = path.join(ROOT, "src", "tools", "dispatchers");
const TESTS_DIR = path.join(ROOT, "src", "__tests__");
const SKILLS_DIR = path.join(ROOT, "..", ".claude", "commands");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "ACTION_RESOLUTION_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface ActionResolution {
  dispatcher: string;
  engines: string[];
  inputSchema: string | null;
  outputType: string | null;
  skills: string[];
  tests: string[];
}

export interface ActionResolutionIndex {
  schemaVersion: number;
  lastUpdated: string;
  actionCount: number;
  actions: Record<string, ActionResolution>;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Extract all actions from a dispatcher file.
 * Handles multiple patterns:
 * 1. z.enum([...]) with inline strings
 * 2. const ACTIONS = [...] array definitions
 */
function extractEnumActions(content: string): string[] {
  const actions: string[] = [];

  // Pattern 1: z.enum([...]) with inline strings
  const enumRe = /z\.enum\s*\(\s*\[/g;
  let match: RegExpExecArray | null;

  while ((match = enumRe.exec(content))) {
    const start = match.index;
    let depth = 0;
    let end = -1;

    for (let i = content.indexOf("[", start); i < content.length; i++) {
      if (content[i] === "[") depth++;
      else if (content[i] === "]") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end < 0) continue;
    const block = content.slice(start, end + 1);
    const inner = /"([a-z_][a-z0-9_]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = inner.exec(block))) {
      actions.push(m[1]);
    }
  }

  // Pattern 2: const ACTIONS = [...] (common in larger dispatchers)
  const actionsArrayRe = /const\s+ACTIONS\s*=\s*\[/g;
  while ((match = actionsArrayRe.exec(content))) {
    const start = match.index;
    let depth = 0;
    let end = -1;

    for (let i = content.indexOf("[", start); i < content.length; i++) {
      if (content[i] === "[") depth++;
      else if (content[i] === "]") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end < 0) continue;
    const block = content.slice(start, end + 1);
    const inner = /"([a-z_][a-z0-9_]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = inner.exec(block))) {
      actions.push(m[1]);
    }
  }

  // Pattern 3: Look for case statements as fallback (catches actions not in enums)
  const caseRe = /case\s+"([a-z_][a-z0-9_]*)"\s*:/g;
  while ((match = caseRe.exec(content))) {
    actions.push(match[1]);
  }

  return [...new Set(actions)];
}

/**
 * Extract engines referenced in a case block for an action
 */
function extractEnginesForAction(content: string, action: string): string[] {
  const engines: string[] = [];
  const casePattern = new RegExp(`case\\s+"${action}"\\s*:`, "g");
  const match = casePattern.exec(content);

  if (!match) return engines;

  // Find the case block (up to next case or default)
  const start = match.index;
  const nextCase = content.slice(start + match[0].length).search(/\n\s*(case\s+"|default\s*:)/);
  const end = nextCase > 0 ? start + match[0].length + nextCase : Math.min(start + 2000, content.length);
  const block = content.slice(start, end);

  // Look for engine imports/references
  const enginePattern = /\b([A-Z][a-zA-Z0-9]*Engine)\b/g;
  let m: RegExpExecArray | null;
  while ((m = enginePattern.exec(block))) {
    engines.push(m[1]);
  }

  // Also look for camelCase engine references
  const camelPattern = /\b([a-z][a-zA-Z0-9]*Engine)\b/g;
  while ((m = camelPattern.exec(block))) {
    const pascal = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    engines.push(pascal);
  }

  return [...new Set(engines)];
}

/**
 * Extract schema name for an action from actionSchemas object
 */
function extractSchemaForAction(content: string, action: string): string | null {
  // Look for action in actionSchemas or similar pattern
  const patterns = [
    new RegExp(`["']${action}["']\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*Schema)`, "i"),
    new RegExp(`${action}\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*Schema)`, "i"),
    new RegExp(`["']${action}["']\\s*:\\s*z\\.object`, "i"),
  ];

  for (const p of patterns) {
    const m = p.exec(content);
    if (m) return m[1] || `${action}Schema`;
  }

  return null;
}

/**
 * Scan dispatchers and build action map
 */
async function scanDispatchers(): Promise<Map<string, { dispatcher: string; engines: string[]; schema: string | null }>> {
  const results = new Map<string, { dispatcher: string; engines: string[]; schema: string | null }>();

  try {
    const files = await fs.readdir(DISPATCHERS_DIR);

    for (const file of files) {
      if (!file.endsWith("Dispatcher.ts")) continue;

      const filePath = path.join(DISPATCHERS_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");
      const actions = extractEnumActions(content);

      for (const action of actions) {
        const engines = extractEnginesForAction(content, action);
        const schema = extractSchemaForAction(content, action);

        results.set(action, {
          dispatcher: file,
          engines,
          schema,
        });
      }
    }
  } catch {
    // Dispatchers dir missing
  }

  return results;
}

/**
 * Find tests that reference specific actions
 */
async function findTestsForActions(actions: Set<string>): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  try {
    const files = await fs.readdir(TESTS_DIR);

    for (const file of files) {
      if (!file.endsWith(".test.ts")) continue;

      const filePath = path.join(TESTS_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");

      for (const action of actions) {
        if (content.includes(`"${action}"`) || content.includes(`'${action}'`)) {
          if (!results.has(action)) results.set(action, []);
          results.get(action)!.push(file);
        }
      }
    }
  } catch {
    // Tests dir missing
  }

  return results;
}

/**
 * Find skills that reference specific actions
 */
async function findSkillsForActions(actions: Set<string>): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  try {
    const files = await fs.readdir(SKILLS_DIR);

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const filePath = path.join(SKILLS_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");

      for (const action of actions) {
        if (content.includes(action)) {
          if (!results.has(action)) results.set(action, []);
          results.get(action)!.push(file);
        }
      }
    }
  } catch {
    // Skills dir missing
  }

  return results;
}

/**
 * Build the complete action resolution index
 */
export async function buildActionResolutionIndex(opts: { verbose?: boolean } = {}): Promise<ActionResolutionIndex> {
  if (opts.verbose) console.log("[build-action-resolution-index] Scanning dispatchers...");

  const dispatcherData = await scanDispatchers();
  const allActions = new Set(dispatcherData.keys());

  if (opts.verbose) console.log(`  Found ${allActions.size} unique actions`);

  if (opts.verbose) console.log("  Scanning tests...");
  const testMap = await findTestsForActions(allActions);

  if (opts.verbose) console.log("  Scanning skills...");
  const skillMap = await findSkillsForActions(allActions);

  const actions: Record<string, ActionResolution> = {};

  for (const [action, data] of dispatcherData) {
    actions[action] = {
      dispatcher: data.dispatcher,
      engines: data.engines,
      inputSchema: data.schema,
      outputType: null, // Would need AST parsing for return types
      skills: skillMap.get(action) || [],
      tests: testMap.get(action) || [],
    };
  }

  const index: ActionResolutionIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    actionCount: Object.keys(actions).length,
    actions,
  };

  if (opts.verbose) console.log(`  Done. ${index.actionCount} actions indexed.`);

  return index;
}

/**
 * Write index to disk
 */
export async function writeActionResolutionIndex(index: ActionResolutionIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readActionResolutionIndex(): Promise<ActionResolutionIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as ActionResolutionIndex;
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

  console.log("[build-action-resolution-index] Scanning...");
  const start = Date.now();
  const index = await buildActionResolutionIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeActionResolutionIndex(index);
  console.log(`[build-action-resolution-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  // Summary stats
  let withEngines = 0;
  let withTests = 0;
  let withSkills = 0;

  for (const res of Object.values(index.actions)) {
    if (res.engines.length > 0) withEngines++;
    if (res.tests.length > 0) withTests++;
    if (res.skills.length > 0) withSkills++;
  }

  console.log(`build-action-resolution-index — ${index.actionCount} actions indexed`);
  console.log(`  with engines: ${withEngines}`);
  console.log(`  with tests: ${withTests}`);
  console.log(`  with skills: ${withSkills}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-action-resolution-index failed:", err);
    process.exit(2);
  });
}
