#!/usr/bin/env node
// tier: T0
/**
 * ban-facade-patterns.mjs — PreToolUse enforcement hook
 *
 * NO-FAKE-CODE rule. Blocks any engine/test/dispatcher file that:
 *   1. Has "Facade" in filename (engines name what they DO, not a pattern)
 *   2. Has a handlerXxx / handleXxx method returning hardcoded object literals
 *      without an `await import(` delegation (i.e. mock data masquerading as
 *      real engine output)
 *   3. Introduces new lines with phrases like "synthetic", "stub response",
 *      "mock output", "placeholder result"
 *   4. Declares a method that returns `{ success: true, ... }` with no call to
 *      another engine or formula module
 *
 * Exit codes:
 *   0 — pass
 *   2 — block (printed message shown to Claude)
 *
 * Scope: only fires on Write/Edit/MultiEdit for .ts/.tsx files in
 * mcp-server/src/engines/ or mcp-server/src/tools/dispatchers/.
 */

import { readFileSync, existsSync } from "node:fs";

const input = await readStdin();
let payload;
try {
  payload = JSON.parse(input || "{}");
} catch {
  process.exit(0);
}

const { tool_name = "", tool_input = {} } = payload;
const editTools = new Set(["Write", "Edit", "MultiEdit"]);
if (!editTools.has(tool_name)) process.exit(0);

const filePath = tool_input.file_path || "";
if (!/\.(ts|tsx)$/.test(filePath)) process.exit(0);

const isEngine = /[\\/]src[\\/]engines[\\/]/.test(filePath);
const isDispatcher = /[\\/]src[\\/]tools[\\/]dispatchers[\\/]/.test(filePath);
if (!isEngine && !isDispatcher) process.exit(0);

// Rule 1: ban "Facade" in engine filenames (applies to new files only)
if (isEngine && /Facade/i.test(filePath) && tool_name === "Write") {
  block([
    `NO-FAKE-CODE: engine filename contains "Facade".`,
    `  path: ${filePath}`,
    `  Engines should name what they DO (e.g. MillProgramGeneratorEngine), not a pattern (e.g. MillFacadeEngine).`,
    `  Fix: rename to describe concrete responsibility.`,
  ]);
}

// Gather content to scan (new content for Write, new_string for Edit)
let content = "";
if (tool_name === "Write") {
  content = tool_input.content || "";
} else if (tool_name === "Edit") {
  content = tool_input.new_string || "";
} else if (tool_name === "MultiEdit") {
  const edits = tool_input.edits || [];
  content = edits.map((e) => e.new_string || "").join("\n");
}
if (!content) process.exit(0);

// Rule 2: handleXxx methods that return object literals without delegation.
// Detect: `private async handleWord(...)`/`handleWord(...)` blocks where the
// function body has no `await import(` call and does have a `return { ... }`
// with hardcoded scalar/structured values.
const handlerRegex =
  /(?:private\s+)?async\s+handle[A-Z][A-Za-z0-9]*\s*\([^)]*\)\s*:\s*[^{]*\{([\s\S]*?)\n\s{2,4}\}/g;

const fakeHandlers = [];
let m;
while ((m = handlerRegex.exec(content)) !== null) {
  const body = m[1];
  const hasImport = /await\s+import\s*\(/.test(body);
  const hasEngineCall = /\b(?:Engine|engine)\.\w+\(/.test(body);
  const returnsLiteral = /return\s*\{[^}]*\b(?:1001|"adaptive_clearing"|"loaded"|"queued_for_review"|"refreshed"|"TIP_"|safety_score\s*:\s*0\.\d|parameter_count\s*:\s*\d{4,})/.test(
    body
  );
  if (!hasImport && !hasEngineCall && returnsLiteral) {
    const name = (m[0].match(/handle[A-Z][A-Za-z0-9]*/) || ["handlerXxx"])[0];
    fakeHandlers.push(name);
  }
}

if (fakeHandlers.length > 0) {
  block([
    `NO-FAKE-CODE: handler(s) return hardcoded synthetic data without delegating to a real engine.`,
    `  file: ${filePath}`,
    `  handlers: ${fakeHandlers.join(", ")}`,
    `  Each handler MUST either:`,
    `    (a) await import() and call a real engine/formula, OR`,
    `    (b) throw new Error("Not wired: <EngineName> not yet built") so callers get a real failure.`,
    `  Returning fabricated success-shaped data is banned.`,
  ]);
}

// Rule 3: ban marketing/mock labels in new code
const bannedPhrases = [
  /\/\/\s*mock\s+data/i,
  /\/\/\s*synthetic\s+response/i,
  /\/\/\s*stub\s+response/i,
  /\/\/\s*placeholder\s+result/i,
  /\/\/\s*fake\s+(output|response)/i,
];
for (const phrase of bannedPhrases) {
  if (phrase.test(content)) {
    block([
      `NO-FAKE-CODE: banned phrase detected in comments.`,
      `  file: ${filePath}`,
      `  Banned pattern: ${phrase}`,
      `  If the handler isn't wired yet, throw explicitly instead of documenting a mock.`,
    ]);
  }
}

// Rule 4: dispatcher case that returns `{ status: "stub", ...}` literal — the
// dispatcher pattern `engine.method?.(params) ?? { status: "stub" }` is a
// tombstone that disguises an unwired engine. Allowed only in archived files.
if (isDispatcher) {
  const stubFallbackRegex =
    /\?\?\s*\{[^}]*status\s*:\s*["']stub["']/g;
  const stubMatches = content.match(stubFallbackRegex);
  if (stubMatches && stubMatches.length > 0) {
    block([
      `NO-FAKE-CODE: dispatcher case(s) use "?? { status: 'stub' }" fallback.`,
      `  file: ${filePath}`,
      `  count: ${stubMatches.length}`,
      `  Fix: either (a) call the real engine method (no optional-chaining fallback), or`,
      `  (b) throw new Error("Engine method not yet implemented") from the case.`,
    ]);
  }
}

process.exit(0);

// ---- helpers ----
function block(lines) {
  const msg = [
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "🚫 ban-facade-patterns hook: BLOCKED",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ...lines,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ].join("\n");
  process.stderr.write(msg);
  process.exit(2);
}

async function readStdin() {
  return new Promise((resolvePromise) => {
    let data = "";
    if (process.stdin.isTTY) {
      resolvePromise("");
      return;
    }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolvePromise(data));
    process.stdin.on("error", () => resolvePromise(""));
  });
}
