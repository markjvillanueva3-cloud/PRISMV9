/**
 * big-data-read-enforce.test.mjs -- pure evaluate() coverage (U-BIG-DATA-READ, india 2026-06-12).
 * R9: each case pins WHY a Read is blocked or allowed -- the decision IS the value (don't dump a big
 * data dump; targeted reads + source + small files always pass). statImpl injected -> no disk.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, DEFAULT_THRESHOLD_BYTES } from "../big-data-read-enforce.mjs";

const bigStat = () => ({ size: DEFAULT_THRESHOLD_BYTES + 1 });
const smallStat = () => ({ size: 1024 });
const read = (file_path, extra = {}) => ({ tool_name: "Read", tool_input: { file_path, ...extra } });
const noEnv = {}; // PRISM_BIG_DATA_READ_ENFORCE unset -> default ON

test("DENY: a big .log full read -> routed to the local Ollama triage digest", () => {
  const v = evaluate({ stdin: read("state/shared/build.log"), env: noEnv, statImpl: bigStat });
  assert.equal(v.action, "deny");
  assert.match(v.reason, /ask-ollama\.mjs triage/);
  assert.match(v.reason, /BIG DATA READ BLOCKED/);
});

test("DENY: a big .jsonl full read -> routed to grep/jq (structured data, NOT a prose digest)", () => {
  const v = evaluate({ stdin: read("state/shared/data.jsonl"), env: noEnv, statImpl: bigStat });
  assert.equal(v.action, "deny");
  assert.match(v.reason, /grep\/jq/);
  assert.doesNotMatch(v.reason, /ask-ollama/); // structured data shouldn't get a prose-summary route
});

test("ALLOW: a TARGETED read (offset/limit) of a big data file is never blocked", () => {
  assert.equal(evaluate({ stdin: read("x.log", { offset: 100 }), env: noEnv, statImpl: bigStat }).action, "allow");
  assert.equal(evaluate({ stdin: read("x.jsonl", { limit: 50 }), env: noEnv, statImpl: bigStat }).action, "allow");
});

test("ALLOW: source / docs / config files are never blocked (no Read-before-Edit break)", () => {
  for (const f of ["src/Engine.ts", "hook.mjs", "notes.md", "package.json", "main.py"]) {
    assert.equal(evaluate({ stdin: read(f), env: noEnv, statImpl: bigStat }).action, "allow", f);
  }
});

test("ALLOW: a small data file (under threshold) is cheap -> pass", () => {
  assert.equal(evaluate({ stdin: read("small.jsonl"), env: noEnv, statImpl: smallStat }).action, "allow");
});

test("ALLOW: threshold override via PRISM_BIG_DATA_READ_BYTES", () => {
  // size 1024 with a 512-byte threshold -> now over -> deny
  const v = evaluate({ stdin: read("x.log"), env: { PRISM_BIG_DATA_READ_BYTES: "512" }, statImpl: smallStat });
  assert.equal(v.action, "deny");
});

test("ALLOW: disable knob, non-Read tool, missing path", () => {
  assert.equal(evaluate({ stdin: read("x.log"), env: { PRISM_BIG_DATA_READ_ENFORCE: "0" }, statImpl: bigStat }).action, "allow");
  assert.equal(evaluate({ stdin: { tool_name: "Edit", tool_input: { file_path: "x.log" } }, env: noEnv, statImpl: bigStat }).action, "allow");
  assert.equal(evaluate({ stdin: { tool_name: "Read", tool_input: {} }, env: noEnv, statImpl: bigStat }).action, "allow");
});

test("ALLOW (fail-open): stat throws -> never wedge the read", () => {
  const throwStat = () => { throw new Error("ENOENT"); };
  assert.equal(evaluate({ stdin: read("x.log"), env: noEnv, statImpl: throwStat }).action, "allow");
});

test("ALLOW (fail-open): null / garbage stdin", () => {
  assert.equal(evaluate({ stdin: null, env: noEnv, statImpl: bigStat }).action, "allow");
  assert.equal(evaluate({ stdin: undefined, env: noEnv, statImpl: bigStat }).action, "allow");
});
