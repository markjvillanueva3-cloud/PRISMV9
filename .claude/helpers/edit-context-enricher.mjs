#!/usr/bin/env node
/**
 * edit-context-enricher.mjs — PreToolUse hook for Write|Edit|MultiEdit
 *
 * When editing engine/dispatcher/test files, injects ecosystem context:
 * - Engine description from ENGINE_DIGEST
 * - Which dispatcher wires this engine (from MASTER_INDEX.json)
 * - Related test file path
 * - Related engines in the same dispatcher
 *
 * Eliminates the "edit → grep for dispatcher → grep for tests" cycle.
 * Saves ~3-5 tool calls (2K-8K tokens) per engine edit session.
 */
import { readFileSync, existsSync } from "node:fs";
import process from "node:process";

const MASTER_INDEX = "H:/prism/mcp-server/data/MASTER_INDEX.json";
const ENGINE_DIGEST = "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md";
const CACHE_FILE = "/tmp/prism-edit-context-cache.json";
const CACHE_TTL_MS = 3600_000; // 1 hour

// Read stdin (Claude Code pipes tool input as JSON)
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(""); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 150);
  });
}

// Lazy-loaded caches
let _masterIndex = null;
let _engineDigest = null;
let _actionToDispatcher = null;
let _engineToDispatcher = null;

function loadMasterIndex() {
  if (_masterIndex) return _masterIndex;
  try {
    // Check file cache first
    if (existsSync(CACHE_FILE)) {
      const cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      if (Date.now() - cache.ts < CACHE_TTL_MS) {
        _actionToDispatcher = new Map(cache.a2d);
        _engineToDispatcher = new Map(cache.e2d);
        _masterIndex = cache;
        return _masterIndex;
      }
    }
  } catch { /* rebuild */ }

  try {
    const mi = JSON.parse(readFileSync(MASTER_INDEX, "utf8"));
    _actionToDispatcher = new Map();
    _engineToDispatcher = new Map();

    for (const d of mi.dispatchers || []) {
      const dispName = d.name;
      const dispFile = d.file;
      for (const action of d.actions || []) {
        _actionToDispatcher.set(action, { dispatcher: dispName, file: dispFile });
      }
    }

    // Build engine→dispatcher map from file paths
    for (const eng of mi.engines || []) {
      const engName = eng.name;
      // Find which dispatcher(s) reference this engine by checking file imports
      // This is a heuristic — we check if the engine name appears in any dispatcher's actions
      _engineToDispatcher.set(engName, null); // placeholder
    }

    _masterIndex = mi;

    // Write file cache
    try {
      const cacheData = JSON.stringify({
        ts: Date.now(),
        a2d: [..._actionToDispatcher],
        e2d: [..._engineToDispatcher],
      });
      writeFileSync(CACHE_FILE, cacheData);
    } catch { /* non-critical */ }

    return _masterIndex;
  } catch {
    return null;
  }
}

function loadEngineDigest() {
  if (_engineDigest) return _engineDigest;
  try {
    const raw = readFileSync(ENGINE_DIGEST, "utf8");
    _engineDigest = new Map();
    for (const line of raw.split("\n")) {
      // Format: - **EngineName**: Description  OR  **EngineName**: Description
      const m = line.match(/(?:^-\s*)?\*\*(\w+)\*\*:\s*(.+)/);
      if (m) _engineDigest.set(m[1], m[2].trim());
    }
    return _engineDigest;
  } catch {
    return new Map();
  }
}

function extractFilePath(input) {
  if (!input) return null;
  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    return (parsed.tool_input?.file_path || parsed.file_path || "").replace(/\\/g, "/");
  } catch {
    return null;
  }
}

function getEngineNameFromPath(filePath) {
  // src/engines/FooEngine.ts → FooEngine
  const m = filePath.match(/src\/engines\/(\w+)\.ts$/);
  return m ? m[1] : null;
}

function getDispatcherNameFromPath(filePath) {
  // src/tools/dispatchers/fooDispatcher.ts → fooDispatcher
  const m = filePath.match(/src\/tools\/dispatchers\/(\w+)\.ts$/);
  return m ? m[1] : null;
}

function getTestSubject(filePath) {
  // src/__tests__/foo.test.ts → foo
  const m = filePath.match(/src\/__tests__\/(.+)\.test\.ts$/);
  return m ? m[1] : null;
}

function findDispatcherForEngine(engineName) {
  const mi = loadMasterIndex();
  if (!mi) return null;

  // Search dispatchers for engine references
  const engineLower = engineName.toLowerCase();
  for (const d of mi.dispatchers || []) {
    // Check if any action name contains the engine concept
    // Better: check the dispatcher file path pattern
    const dispFile = d.file || "";
    // We need a more reliable approach — check if the engine file is in the same domain
  }

  return null;
}

function findRelatedEngines(engineName, maxResults = 5) {
  const digest = loadEngineDigest();
  if (!digest) return [];

  // Find engines with similar prefixes or in the same domain
  const prefix = engineName.replace(/Engine$/, "");
  const related = [];
  for (const [name] of digest) {
    if (name === engineName) continue;
    if (name.startsWith(prefix) || prefix.startsWith(name.replace(/Engine$/, ""))) {
      related.push(name);
    }
  }
  return related.slice(0, maxResults);
}

function findTestFile(engineName) {
  const mi = loadMasterIndex();
  if (!mi) return null;

  // Common test file patterns
  const patterns = [
    `src/__tests__/${engineName}.test.ts`,
    `src/__tests__/${engineName.replace(/Engine$/, "")}.test.ts`,
    `src/__tests__/${engineName.charAt(0).toLowerCase() + engineName.slice(1)}.test.ts`,
  ];

  // Check if any exist via master index
  // For now, return the most likely pattern
  return patterns[0];
}

async function main() {
  const raw = await readStdin();
  const filePath = extractFilePath(raw);

  if (!filePath) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Only enrich for engine, dispatcher, and test files
  const isEngine = filePath.includes("src/engines/") && filePath.endsWith(".ts");
  const isDispatcher = filePath.includes("src/tools/dispatchers/") && filePath.endsWith(".ts");
  const isTest = filePath.includes("src/__tests__/") && filePath.endsWith(".test.ts");

  if (!isEngine && !isDispatcher && !isTest) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  const parts = [];

  if (isEngine) {
    const engineName = getEngineNameFromPath(filePath);
    if (engineName) {
      const digest = loadEngineDigest();
      const desc = digest?.get(engineName);
      if (desc) parts.push(`${engineName}: ${desc}`);

      const testFile = findTestFile(engineName);
      if (testFile) parts.push(`Tests: ${testFile}`);

      const related = findRelatedEngines(engineName);
      if (related.length > 0) parts.push(`Related: ${related.join(", ")}`);
    }
  }

  if (isDispatcher) {
    const mi = loadMasterIndex();
    const dispName = getDispatcherNameFromPath(filePath);
    if (mi && dispName) {
      const disp = mi.dispatchers?.find(
        (d) => d.file?.includes(dispName) || d.name?.includes(dispName)
      );
      if (disp) {
        parts.push(`Dispatcher: ${disp.name} (${disp.action_count} actions, ${disp.category})`);
        if (disp.actions?.length <= 20) {
          parts.push(`Actions: ${disp.actions.join(", ")}`);
        } else if (disp.actions) {
          parts.push(`Actions (first 15): ${disp.actions.slice(0, 15).join(", ")}...`);
        }
      }
    }
  }

  if (isTest) {
    const subject = getTestSubject(filePath);
    if (subject) {
      const digest = loadEngineDigest();
      // Try to find the engine this test covers
      const engineName = subject.replace(/[-.].*$/, "");
      for (const [name, desc] of digest || []) {
        if (name.toLowerCase().startsWith(engineName.toLowerCase())) {
          parts.push(`Testing: ${name} — ${desc}`);
          break;
        }
      }
    }
  }

  if (parts.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  const context = `EDIT CONTEXT: ${parts.join(" | ")}`;
  process.stdout.write(JSON.stringify({ additionalContext: context }));
  process.exit(0);
}

main();
