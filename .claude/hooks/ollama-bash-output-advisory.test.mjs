// Tests for ollama-bash-output-advisory.mjs -- the PostToolUse:Bash offload advisory.
// Real-value / behavioral assertions (R9): every test fails if the classify/advisory
// business logic changes. Run: node --test .claude/hooks/ollama-bash-output-advisory.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  classifyBashOutput,
  buildAdvisory,
  extractBashIO,
  updateOffloadStats,
} from "./ollama-bash-output-advisory.mjs";

const bigLog = (lines) => Array.from({ length: lines }, (_, i) => `line ${i} some output text here`).join("\n");

// -- classifyBashOutput: happy path (gist-only surfaces should advise) --
test("classify: build/test/tsc/vitest command output is gist-only", () => {
  for (const cmd of ["npm run build", "rtk vitest run foo.test.ts", "tsc --noEmit", "git diff HEAD~1", "cargo test"]) {
    const r = classifyBashOutput(cmd, 8000, bigLog(120));
    assert.equal(r.gist, true, `expected gist for: ${cmd}`);
    assert.equal(r.kind, "build_test_log", `expected build_test_log kind for: ${cmd}`);
  }
});

test("classify: long grep/find/ls enumeration is gist-only", () => {
  const r = classifyBashOutput("rtk grep -rn foo src/", 6000, bigLog(80));
  assert.equal(r.gist, true);
  assert.equal(r.kind, "enumeration");
});

test("classify: generic large multi-line non-structured output is gist-only", () => {
  const r = classifyBashOutput("some-tool --verbose", 15000, bigLog(90));
  assert.equal(r.gist, true);
  assert.equal(r.kind, "bulk_output");
});

// -- classifyBashOutput: KEEP-verbatim (must NOT advise) -- the conservative side --
test("classify: SHORT grep result is kept (below line threshold)", () => {
  // A grep that returned only 3 lines is cheap -- keep verbatim, do not advise.
  const r = classifyBashOutput("grep foo bar.txt", 200, "a\nb\nc");
  assert.equal(r.gist, false, "short enumeration must be kept");
});

test("classify: cat of a source file is NOT a gist verb (path contains 'test' but verb is cat)", () => {
  // Guard against matching a path that merely CONTAINS a gist keyword.
  const r = classifyBashOutput("cat src/__tests__/foo.test.ts", 9000, bigLog(120));
  assert.equal(r.gist, false, "cat of a source file must be kept verbatim (verb-anchored, not path-matched)");
});

test("classify: structured JSON/array output is kept (likely parsed downstream)", () => {
  const jsonBody = "[\n" + Array.from({ length: 100 }, (_, i) => `  {"i": ${i}},`).join("\n") + "\n]";
  const r = classifyBashOutput("some-cmd --json", jsonBody.length + 20000, jsonBody);
  assert.equal(r.gist, false, "leading [ or { -> likely parsed downstream -> keep verbatim");
});

// -- classifyBashOutput: adversarial / edge --
test("classify: empty command returns not-gist without throwing", () => {
  assert.deepEqual(classifyBashOutput("", 9999, "x"), { gist: false, kind: "", reason: "no command" });
});

test("classify: null/undefined inputs do not throw", () => {
  assert.doesNotThrow(() => classifyBashOutput(null, 0, null));
  assert.doesNotThrow(() => classifyBashOutput(undefined, undefined, undefined));
  assert.equal(classifyBashOutput(null, 0, null).gist, false);
});

// -- buildAdvisory: threshold + note shape --
test("advisory: small output (below MIN_BYTES) is kept, no note", () => {
  const { decision, note } = buildAdvisory("npm run build", 500, "short output");
  assert.equal(decision, "kept");
  assert.equal(note, null);
});

test("advisory: large build output produces a suggest note with error-triage + ask-ollama", () => {
  const { decision, note, kind } = buildAdvisory("rtk vitest run", 12000, bigLog(150));
  assert.equal(decision, "suggest");
  assert.equal(kind, "build_test_log");
  assert.match(note, /ask-ollama\.mjs error-triage -/, "build/test surface -> error-triage mode");
  assert.match(note, /offload opportunity/i);
  assert.match(note, /PRISM_OLLAMA_BASH_ADVISORY_DISABLE/, "must document the disable knob");
});

test("advisory: enumeration surface uses summarize (not error-triage)", () => {
  const { decision, note } = buildAdvisory("rtk grep -rn foo src/", 9000, bigLog(80));
  assert.equal(decision, "suggest");
  assert.match(note, /ask-ollama\.mjs summarize -/, "enumeration -> summarize mode");
});

test("advisory: verbose flag appends the matched reason", () => {
  const { note } = buildAdvisory("tsc", 9000, bigLog(120), { verbose: true });
  assert.match(note, /matched:/, "verbose must include the classify reason");
});

// -- extractBashIO: payload shape defensiveness --
test("extractBashIO: pulls command + string tool_response", () => {
  const io = extractBashIO({ tool_input: { command: "ls -la" }, tool_response: "file1\nfile2" });
  assert.equal(io.command, "ls -la");
  assert.equal(io.output, "file1\nfile2");
});

test("extractBashIO: pulls stdout+stderr from object tool_response", () => {
  const io = extractBashIO({ tool_input: { command: "build" }, tool_response: { stdout: "out", stderr: "err" } });
  assert.equal(io.output, "out\nerr");
});

test("extractBashIO: missing fields do not throw, return empty strings", () => {
  assert.doesNotThrow(() => extractBashIO({}));
  assert.doesNotThrow(() => extractBashIO(null));
  const io = extractBashIO({});
  assert.equal(io.command, "");
  assert.equal(io.output, "");
});

// -- updateOffloadStats: writes the byHook schema the dashboard reads --
test("updateOffloadStats: increments fired+suggested and estimates tokensSaved", () => {
  const tmp = path.join(os.tmpdir(), `offload-stats-test-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ schemaVersion: "2.0.0", byHook: {} }, null, 2));
  updateOffloadStats({ decision: "suggest", sizeKB: 12 }, tmp);
  const s = JSON.parse(fs.readFileSync(tmp, "utf8"));
  const h = s.byHook["ollama-bash-output-advisory"];
  assert.equal(h.fired, 1);
  assert.equal(h.suggested, 1);
  assert.equal(h.kept, 0);
  assert.equal(h.tokensSaved, 12 * 250, "1KB ~= 250 tokens conservative estimate");
  assert.ok(s.lastUpdated, "lastUpdated stamped");
  fs.unlinkSync(tmp);
});

test("updateOffloadStats: 'kept' decision increments kept not suggested", () => {
  const tmp = path.join(os.tmpdir(), `offload-stats-kept-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ byHook: { "ollama-bash-output-advisory": { fired: 5, offloaded: 0, kept: 2, suggested: 3, tokensSaved: 0 } } }, null, 2));
  updateOffloadStats({ decision: "kept", sizeKB: 1 }, tmp);
  const s = JSON.parse(fs.readFileSync(tmp, "utf8"));
  const h = s.byHook["ollama-bash-output-advisory"];
  assert.equal(h.fired, 6);
  assert.equal(h.kept, 3);
  assert.equal(h.suggested, 3, "suggested unchanged on a kept decision");
  fs.unlinkSync(tmp);
});

test("updateOffloadStats: absent/corrupt stats file is a no-op, never throws (R12 keep-machine-running)", () => {
  assert.doesNotThrow(() => updateOffloadStats({ decision: "suggest", sizeKB: 5 }, path.join(os.tmpdir(), "definitely-does-not-exist-xyz.json")));
});
