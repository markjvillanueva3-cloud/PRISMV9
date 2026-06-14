/**
 * Tests for injection-budget-cap-enforce.mjs -- pure-fn + evaluate() coverage.
 *
 * TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-CAP (slot:bravo 2026-06-11).
 * Real concrete-value assertions; snapshot + nowMs injected (no spawning, no fs).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CAP_BYTES,
  DEFAULT_TTL_MS,
  capFromEnv,
  ttlFromEnv,
  readSnapshot,
  evaluate,
} from "../injection-budget-cap-enforce.mjs";

// A faithful recurring UserPromptSubmit injector (passes targetsRecurringInjection).
const RECURRING_INJECTOR = [
  'import * as fs from "node:fs";',
  'function main() {',
  '  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "hello" } }));',
  '}',
  'main();',
].join("\n");
const NON_INJECTOR = 'function main() { console.log(JSON.stringify({ continue: true })); } main();';
const HOOK_PATH = "H:/prism/.claude/hooks/new-thing-inject.mjs";

const writeStdin = (filePath, content) => ({ tool_name: "Write", tool_input: { file_path: filePath, content } });
const freshSnap = (steady) => ({ ok: true, steadyTotalBytes: steady, ageMs: 1000, top: [{ scriptPath: "big-inject.mjs", steadyBytes: steady }] });

describe("capFromEnv", () => {
  it("defaults to 3072 (spec target)", () => {
    assert.equal(capFromEnv({}), DEFAULT_CAP_BYTES);
    assert.equal(DEFAULT_CAP_BYTES, 3 * 1024);
  });
  it("honors a positive override", () => {
    assert.equal(capFromEnv({ PRISM_INJECTION_BUDGET_CAP_BYTES: "100" }), 100);
  });
  it("ignores zero / negative / non-numeric", () => {
    assert.equal(capFromEnv({ PRISM_INJECTION_BUDGET_CAP_BYTES: "0" }), DEFAULT_CAP_BYTES);
    assert.equal(capFromEnv({ PRISM_INJECTION_BUDGET_CAP_BYTES: "-5" }), DEFAULT_CAP_BYTES);
    assert.equal(capFromEnv({ PRISM_INJECTION_BUDGET_CAP_BYTES: "abc" }), DEFAULT_CAP_BYTES);
  });
});

describe("ttlFromEnv", () => {
  it("defaults to 24h", () => {
    assert.equal(ttlFromEnv({}), DEFAULT_TTL_MS);
    assert.equal(DEFAULT_TTL_MS, 24 * 60 * 60 * 1000);
  });
  it("honors a positive override", () => {
    assert.equal(ttlFromEnv({ PRISM_INJECTION_BUDGET_CAP_TTL_MS: "1000" }), 1000);
  });
});

describe("readSnapshot", () => {
  it("ok with steadyTotalBytes + computes ageMs from measured_at", () => {
    const fsImpl = { readFileSync: () => JSON.stringify({ steadyTotalBytes: 244, measured_at: "2026-06-11T00:00:00.000Z", topBySteady: [{ scriptPath: "a.mjs", steadyBytes: 126 }] }) };
    const r = readSnapshot({ fsImpl, nowMs: Date.parse("2026-06-11T01:00:00.000Z") });
    assert.equal(r.ok, true);
    assert.equal(r.steadyTotalBytes, 244);
    assert.equal(r.ageMs, 3600000);
    assert.equal(r.top.length, 1);
  });
  it("fail-soft when file missing", () => {
    const r = readSnapshot({ fsImpl: { readFileSync() { throw new Error("ENOENT"); } } });
    assert.equal(r.ok, false);
    assert.ok(/no snapshot/.test(r.reason));
  });
  it("fail-soft on unparseable JSON", () => {
    const r = readSnapshot({ fsImpl: { readFileSync: () => "{not json" } });
    assert.equal(r.ok, false);
    assert.ok(/unparseable/.test(r.reason));
  });
  it("fail-soft when steadyTotalBytes absent", () => {
    const r = readSnapshot({ fsImpl: { readFileSync: () => JSON.stringify({ foo: 1 }) } });
    assert.equal(r.ok, false);
  });
  it("ageMs is Infinity when measured_at absent (forces fail-open downstream)", () => {
    const r = readSnapshot({ fsImpl: { readFileSync: () => JSON.stringify({ steadyTotalBytes: 10 }) } });
    assert.equal(r.ok, true);
    assert.equal(r.ageMs, Infinity);
  });
});

describe("evaluate", () => {
  it("allows non-Write tools", () => {
    assert.equal(evaluate({ stdin: { tool_name: "Edit" } }).action, "allow");
  });
  it("allows writes outside .claude/hooks", () => {
    assert.equal(evaluate({ stdin: writeStdin("H:/prism/scripts/x.mjs", RECURRING_INJECTOR), snapshot: freshSnap(5000) }).action, "allow");
  });
  it("allows a hook that is not a recurring injector", () => {
    assert.equal(evaluate({ stdin: writeStdin(HOOK_PATH, NON_INJECTOR), snapshot: freshSnap(99999) }).action, "allow");
  });
  it("fail-open when snapshot unavailable", () => {
    const r = evaluate({ stdin: writeStdin(HOOK_PATH, RECURRING_INJECTOR), snapshot: { ok: false, reason: "no snapshot on disk" } });
    assert.equal(r.action, "allow");
    assert.ok(/fail-open/.test(r.reason));
  });
  it("fail-open when snapshot is stale (older than TTL)", () => {
    const r = evaluate({ stdin: writeStdin(HOOK_PATH, RECURRING_INJECTOR), snapshot: { ok: true, steadyTotalBytes: 99999, ageMs: 99 * 3600000, top: [] }, env: {} });
    assert.equal(r.action, "allow");
    assert.ok(/stale/.test(r.reason));
  });
  it("allows when budget has headroom (steady < cap)", () => {
    const r = evaluate({ stdin: writeStdin(HOOK_PATH, RECURRING_INJECTOR), snapshot: freshSnap(244), env: {} });
    assert.equal(r.action, "allow");
    assert.ok(/headroom/.test(r.reason));
    assert.equal(r.steadyTotalBytes, 244);
  });
  it("BLOCKS a new injector when steady total >= cap", () => {
    const r = evaluate({ stdin: writeStdin(HOOK_PATH, RECURRING_INJECTOR), snapshot: freshSnap(5000), env: {} });
    assert.equal(r.action, "block");
    assert.ok(/BUDGET FULL/.test(r.reason));
    assert.ok(/5000\/3072/.test(r.reason));
    assert.equal(r.cap, 3072);
  });
  it("respects a tightened cap override (small steady over a low cap blocks)", () => {
    const r = evaluate({ stdin: writeStdin(HOOK_PATH, RECURRING_INJECTOR), snapshot: freshSnap(244), env: { PRISM_INJECTION_BUDGET_CAP_BYTES: "100" } });
    assert.equal(r.action, "block");
  });
  it("downgrades block to advise when bypassed", () => {
    const r = evaluate({ stdin: writeStdin(HOOK_PATH, RECURRING_INJECTOR), snapshot: freshSnap(5000), env: { PRISM_INJECTION_BUDGET_CAP_DISABLE: "1" } });
    assert.equal(r.action, "advise");
    assert.ok(/BUDGET FULL/.test(r.reason));
  });
});
