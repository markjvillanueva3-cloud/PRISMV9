#!/usr/bin/env node
/**
 * smart-test-suggest.mjs — PostToolUse hook for Write|Edit|MultiEdit
 *
 * After editing a source file, suggests the SPECIFIC test file to run
 * instead of the full 884-test suite. Uses file naming conventions and
 * MASTER_INDEX engine data to map source → test files.
 *
 * Token savings: Prevents "npx vitest run" (full suite, 30-60s) when
 * "npx vitest run src/__tests__/FooEngine.test.ts" (2-5s) suffices.
 *
 * Only suggests after source edits (not test file edits, not non-TS files).
 * Throttled: max 1 suggestion per 60 seconds to avoid spam.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import process from "node:process";

const MASTER_INDEX = "H:/prism/mcp-server/data/MASTER_INDEX.json";
const TESTS_DIR = "H:/prism/mcp-server/src/__tests__";
const STATE_FILE = "/tmp/prism-test-suggest-state.json";
const THROTTLE_MS = 60_000;

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

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch { /* fresh */ }
  return { lastSuggest: 0, editedFiles: [] };
}

function saveState(state) {
  try { writeFileSync(STATE_FILE, JSON.stringify(state)); } catch { /* ok */ }
}

// List actual test files for fuzzy matching
let _testFiles = null;
function getTestFiles() {
  if (_testFiles) return _testFiles;
  try {
    _testFiles = readdirSync(TESTS_DIR).filter(f => f.endsWith(".test.ts"));
  } catch {
    _testFiles = [];
  }
  return _testFiles;
}

function findTestFile(sourceFile) {
  const basename = sourceFile.replace(/\.ts$/, "");
  const testFiles = getTestFiles();

  // Strategy 1: Exact match (FooEngine.ts → FooEngine.test.ts)
  const exact = basename + ".test.ts";
  if (testFiles.includes(exact)) return exact;

  // Strategy 2: kebab-case match (FooBarEngine → foo-bar-engine.test.ts)
  const kebab = basename
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase() + ".test.ts";
  if (testFiles.includes(kebab)) return kebab;

  // Strategy 3: Partial match (FooBarEngine → any test containing "foo-bar")
  const searchTerm = basename.replace(/Engine$/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
  const partial = testFiles.filter(f =>
    f.toLowerCase().includes(searchTerm)
  );
  if (partial.length === 1) return partial[0];
  if (partial.length > 1 && partial.length <= 3) return partial.join(" ");

  // Strategy 4: Check MASTER_INDEX for category-based test files
  // (e.g., all physics engines might be tested in physics.test.ts)
  return null;
}

function findDispatcherTest(dispatcherName) {
  const testFiles = getTestFiles();
  // businessDispatcher → business-dispatcher.test.ts or businessDispatcher.test.ts
  const exact = dispatcherName + ".test.ts";
  if (testFiles.includes(exact)) return exact;

  const kebab = dispatcherName
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase() + ".test.ts";
  if (testFiles.includes(kebab)) return kebab;

  // Domain-based: businessDispatcher → business-engines.test.ts, business.test.ts
  const domain = dispatcherName.replace(/Dispatcher$/, "");
  const domainKebab = domain
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();

  // Check multiple patterns: domain.test.ts, domain-engines.test.ts, domain-dispatcher.test.ts
  for (const suffix of ["", "-engines", "-dispatcher", "-wiring", "-pipeline"]) {
    const candidate = domainKebab + suffix + ".test.ts";
    if (testFiles.includes(candidate)) return candidate;
  }

  // Partial match: any test file containing the domain name
  const partial = testFiles.filter(f =>
    f.toLowerCase().includes(domainKebab) && !f.includes("benchmark")
  );
  if (partial.length === 1) return partial[0];
  if (partial.length >= 2 && partial.length <= 3) return partial.join(" ");

  return null;
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const raw = await readStdin();
  let filePath;
  try {
    const parsed = JSON.parse(raw);
    filePath = (parsed.tool_input?.file_path || "").replace(/\\/g, "/");
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Only for TypeScript source files in mcp-server/src
  if (!filePath.endsWith(".ts") ||
      !filePath.includes("mcp-server/src/") ||
      filePath.includes(".test.") ||
      filePath.includes("__tests__")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Throttle suggestions
  const state = loadState();
  const now = Date.now();
  if (now - state.lastSuggest < THROTTLE_MS) {
    // Still track the file but don't suggest yet
    const fname = filePath.split("/").pop();
    if (!state.editedFiles.includes(fname)) {
      state.editedFiles.push(fname);
      saveState(state);
    }
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  const fileName = filePath.split("/").pop().replace(/\.ts$/, "");
  let testFile = null;
  let context = "";

  if (filePath.includes("src/engines/")) {
    testFile = findTestFile(fileName);
  } else if (filePath.includes("src/tools/dispatchers/")) {
    testFile = findDispatcherTest(fileName);
  } else if (filePath.includes("src/registries/") ||
             filePath.includes("src/algorithms/") ||
             filePath.includes("src/physics/")) {
    testFile = findTestFile(fileName);
  }

  // Include any accumulated edits
  const accumulated = state.editedFiles.filter(f => f !== fileName);

  if (testFile) {
    const testPath = testFile.includes(" ")
      ? testFile.split(" ").map(t => `src/__tests__/${t}`).join(" ")
      : `src/__tests__/${testFile}`;
    context = `TEST HINT: Run \`npx vitest run ${testPath}\` for ${fileName}`;
    if (accumulated.length > 0) {
      context += ` (also edited: ${accumulated.join(", ")})`;
    }
  } else if (accumulated.length >= 3) {
    context = `BUILD HINT: ${accumulated.length + 1} files edited. Run \`npx vitest run\` to check for regressions.`;
  }

  // Update state
  state.lastSuggest = now;
  state.editedFiles = [];
  saveState(state);

  if (context) {
    process.stdout.write(JSON.stringify({ additionalContext: context }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
