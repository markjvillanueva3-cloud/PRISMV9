// Tests for edit-consumer-advisory.mjs (Awareness #5, slot:bravo).
// Pure-core tested with injected runRg + clock + cooldown state — no real spawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRelevantFile,
  shouldThrottle,
  basenameNoExt,
  buildRgPattern,
  findImporters,
  assembleAdvisory,
  evaluate,
  cooldownMsFromEnv,
  minImportersFromEnv,
  topNFromEnv,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_MIN_IMPORTERS,
  DEFAULT_TOPN,
} from "../edit-consumer-advisory.mjs";

const SRC = "H:/prism/mcp-server/src/engines/FooEngine.ts";

// ---- isRelevantFile ----
test("isRelevantFile: accepts a real src engine .ts", () => {
  assert.equal(isRelevantFile(SRC), true);
  assert.equal(isRelevantFile("H:/prism/mcp-server/src/tools/dispatchers/fooDispatcher.ts"), true);
});
test("isRelevantFile: rejects test/spec/__tests__ files", () => {
  assert.equal(isRelevantFile("H:/prism/mcp-server/src/__tests__/FooEngine.test.ts"), false);
  assert.equal(isRelevantFile("H:/prism/mcp-server/src/engines/FooEngine.spec.ts"), false);
});
test("isRelevantFile: rejects non-src and non-ts", () => {
  assert.equal(isRelevantFile("H:/prism/scripts/foo.mjs"), false);
  assert.equal(isRelevantFile("H:/prism/mcp-server/src/engines/Foo.md"), false);
  assert.equal(isRelevantFile(""), false);
  assert.equal(isRelevantFile(null), false);
});
test("isRelevantFile: rejects generic barrels (index/types/constants)", () => {
  assert.equal(isRelevantFile("H:/prism/mcp-server/src/engines/index.ts"), false);
  assert.equal(isRelevantFile("H:/prism/mcp-server/src/types.ts"), false);
  assert.equal(isRelevantFile("H:/prism/mcp-server/src/physics/constants.ts"), false);
});
test("isRelevantFile: handles backslash Windows paths", () => {
  assert.equal(isRelevantFile("H:\\prism\\mcp-server\\src\\engines\\FooEngine.ts"), true);
});

// ---- basenameNoExt ----
test("basenameNoExt strips dir + extension", () => {
  assert.equal(basenameNoExt(SRC), "FooEngine");
  assert.equal(basenameNoExt("a/b/Bar.tsx"), "Bar");
});

// ---- shouldThrottle ----
test("shouldThrottle: true within cooldown, false outside", () => {
  const state = { [SRC]: 1000 };
  assert.equal(shouldThrottle(SRC, state, 1000 + 5000, 10000), true);  // 5s < 10s
  assert.equal(shouldThrottle(SRC, state, 1000 + 20000, 10000), false); // 20s > 10s
});
test("shouldThrottle: false when no prior entry or cooldown disabled", () => {
  assert.equal(shouldThrottle(SRC, {}, 99999, 10000), false);
  assert.equal(shouldThrottle(SRC, { [SRC]: 1000 }, 1001, 0), false);
});

// ---- buildRgPattern ----
test("buildRgPattern: matches import of base with and without .js", () => {
  const pat = buildRgPattern("FooEngine");
  const re = new RegExp(pat);
  assert.equal(re.test('import { x } from "../engines/FooEngine.js"'), true);
  assert.equal(re.test("import x from './FooEngine'"), true);
  assert.equal(re.test('from "./BarEngine"'), false);
});
test("buildRgPattern: escapes regex-significant chars", () => {
  // a base with a dot should not become a wildcard
  const pat = buildRgPattern("Foo.Bar");
  const re = new RegExp(pat);
  assert.equal(re.test('from "./FooXBar"'), false);
  assert.equal(re.test('from "./Foo.Bar"'), true);
});

// ---- findImporters ----
function rgStub(stdout, status = 0) {
  return () => ({ status, stdout });
}
test("findImporters: parses rg -l output, excludes self + tests, dedupes", () => {
  const stdout = [
    "mcp-server/src/tools/dispatchers/fooDispatcher.ts",
    "mcp-server/src/engines/BarEngine.ts",
    "mcp-server/src/engines/BarEngine.ts", // dup
    "mcp-server/src/__tests__/FooEngine.test.ts", // excluded
    "mcp-server/src/engines/FooEngine.ts", // self — excluded
  ].join("\n");
  const importers = findImporters(SRC, { runRg: rgStub(stdout) });
  assert.deepEqual(importers, [
    "mcp-server/src/tools/dispatchers/fooDispatcher.ts",
    "mcp-server/src/engines/BarEngine.ts",
  ]);
});
test("findImporters: empty when rg has no matches (status 0 empty)", () => {
  assert.deepEqual(findImporters(SRC, { runRg: rgStub("") }), []);
});
test("findImporters: empty when runRg throws (fail-open)", () => {
  const throwRg = () => { throw new Error("rg missing"); };
  assert.deepEqual(findImporters(SRC, { runRg: throwRg }), []);
});

// ---- assembleAdvisory ----
test("assembleAdvisory: lists topN, count, more-suffix, R8 line, ASCII only", () => {
  const importers = Array.from({ length: 10 }, (_, i) => `mcp-server/src/engines/E${i}.ts`);
  const md = assembleAdvisory(SRC, importers, { topN: 3 });
  assert.match(md, /FooEngine has 10 importer\(s\)/);
  assert.match(md, /E0\.ts/);
  assert.match(md, /\.\.\.and 7 more/);
  assert.match(md, /R8/);
  // ASCII-only guard (no non-ASCII glyphs)
  assert.ok(!/[^\x00-\x7F]/.test(md), "advisory must be ASCII-only");
});

// ---- env knobs ----
test("env knobs fall back to defaults on bad input", () => {
  assert.equal(cooldownMsFromEnv({}), DEFAULT_COOLDOWN_MS);
  assert.equal(cooldownMsFromEnv({ PRISM_EDIT_CONSUMER_ADVISORY_COOLDOWN_MS: "nope" }), DEFAULT_COOLDOWN_MS);
  assert.equal(cooldownMsFromEnv({ PRISM_EDIT_CONSUMER_ADVISORY_COOLDOWN_MS: "0" }), 0);
  assert.equal(minImportersFromEnv({ PRISM_EDIT_CONSUMER_ADVISORY_MIN_IMPORTERS: "5" }), 5);
  assert.equal(minImportersFromEnv({ PRISM_EDIT_CONSUMER_ADVISORY_MIN_IMPORTERS: "0" }), DEFAULT_MIN_IMPORTERS); // min 1
  assert.equal(topNFromEnv({}), DEFAULT_TOPN);
});

// ---- evaluate (integration of the pure core) ----
const okStdout = [
  "mcp-server/src/a.ts",
  "mcp-server/src/b.ts",
  "mcp-server/src/c.ts",
].join("\n");

test("evaluate: emits advisory on relevant edit with >= MIN importers", () => {
  const r = evaluate({
    stdin: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: SRC } }),
    env: {},
    cooldownState: {},
    nowMs: 1000,
    runRg: rgStub(okStdout),
  });
  assert.equal(r.emit, true);
  assert.match(r.response.hookSpecificOutput.additionalContext, /3 importer/);
  assert.equal(r.newCooldownState[SRC.replace(/\\/g, "/")], 1000);
});
test("evaluate: no emit when below MIN_IMPORTERS", () => {
  const r = evaluate({
    stdin: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: SRC } }),
    env: { PRISM_EDIT_CONSUMER_ADVISORY_MIN_IMPORTERS: "5" },
    cooldownState: {},
    nowMs: 1000,
    runRg: rgStub(okStdout), // only 3
  });
  assert.equal(r.emit, false);
  assert.equal(r.newCooldownState, null);
});
test("evaluate: throttled within cooldown -> no emit, no spawn", () => {
  let spawned = false;
  const r = evaluate({
    stdin: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: SRC } }),
    env: {},
    cooldownState: { [SRC]: 900 },
    nowMs: 1000, // 100ms < default cooldown
    runRg: () => { spawned = true; return { status: 0, stdout: okStdout }; },
  });
  assert.equal(r.emit, false);
  assert.equal(spawned, false, "must not spawn rg when throttled");
});
test("evaluate: disabled knob short-circuits", () => {
  const r = evaluate({
    stdin: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: SRC } }),
    env: { PRISM_EDIT_CONSUMER_ADVISORY_DISABLE: "1" },
    cooldownState: {},
    nowMs: 1000,
    runRg: rgStub(okStdout),
  });
  assert.equal(r.emit, false);
});
test("evaluate: non-Edit tool, irrelevant file, and bad JSON all no-op", () => {
  const base = { env: {}, cooldownState: {}, nowMs: 1, runRg: rgStub(okStdout) };
  assert.equal(evaluate({ ...base, stdin: JSON.stringify({ tool_name: "Read", tool_input: { file_path: SRC } }) }).emit, false);
  assert.equal(evaluate({ ...base, stdin: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "H:/prism/scripts/x.mjs" } }) }).emit, false);
  assert.equal(evaluate({ ...base, stdin: "{not json" }).emit, false);
  assert.equal(evaluate({ ...base, stdin: null }).emit, false);
});
test("evaluate: MultiEdit and Write are also eligible tools", () => {
  for (const tool of ["MultiEdit", "Write"]) {
    const r = evaluate({
      stdin: JSON.stringify({ tool_name: tool, tool_input: { file_path: SRC } }),
      env: {}, cooldownState: {}, nowMs: 1000, runRg: rgStub(okStdout),
    });
    assert.equal(r.emit, true, `${tool} should emit`);
  }
});
