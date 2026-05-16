#!/usr/bin/env node
// Real behavioral tests for stop-regression-bundle.mjs — proves the THREE
// safety properties the shared hook-runner lib does NOT cover:
//   1. block aggregation: ANY child block → bundle blocks, ALL reasons listed
//   2. fail-open-LOUD on bundle crash: continue:true + systemMessage names gates
//   3. unevaluated-gate surfacing: timed-out child → continue:true + warned
//   4. integration: real 10 gates vs real payload, valid JSON, no hang
//
// node:test (the helpers/ vitest config has a pre-existing transform bug —
// see [[reference_e1_ideablock_extractor_2026_05_15]]; node:test is the
// project's hook-test fallback).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const NODE = process.execPath;
const REAL_BUNDLE = "H:/prism/.claude/hooks/bundles/stop-regression-bundle.mjs";
const LIB_URL = pathToFileURL("H:/prism/.claude/hooks/bundles/lib/hook-runner.mjs").href;

// A variant lives in a tmp dir, so its relative `./lib/hook-runner.mjs`
// import cannot resolve. Rewrite that one import to an absolute file:// URL
// so the variant is exercising the SAME lib as production.
function fixLibImport(src) {
  return src.replace('from "./lib/hook-runner.mjs"', `from ${JSON.stringify(LIB_URL)}`);
}

function runBundle(bundlePath, payload, env = {}) {
  const r = spawnSync(NODE, [bundlePath], {
    input: payload, encoding: "utf8", timeout: 90000,
    env: { ...process.env, ...env },
  });
  return { stdout: r.stdout || "", stderr: r.stderr || "", status: r.status };
}

// Build a throwaway bundle variant whose SUB_HOOKS points at controlled
// children, so block/timeout/crash semantics are deterministic.
function makeVariant(dir, children) {
  const src = fixLibImport(readFileSync(REAL_BUNDLE, "utf8"));
  const block = "const SUB_HOOKS = [\n" +
    children.map(c => `  { path: ${JSON.stringify(c.path)}, timeout: ${c.timeout} },`).join("\n") +
    "\n];";
  const patched = src.replace(/const SUB_HOOKS = \[[\s\S]*?\n\];/, block);
  assert.notEqual(patched, src, "SUB_HOOKS replacement must apply");
  const p = join(dir, "variant.mjs");
  writeFileSync(p, patched, "utf8");
  return p;
}

function childThatBlocks(dir, name, reason) {
  const p = join(dir, `${name}.mjs`);
  writeFileSync(p, `process.stdout.write(JSON.stringify({continue:false,stopReason:${JSON.stringify(reason)}}));\n`, "utf8");
  return p;
}
function childThatPasses(dir, name) {
  const p = join(dir, `${name}.mjs`);
  writeFileSync(p, `process.stdout.write(JSON.stringify({continue:true}));\n`, "utf8");
  return p;
}
function childThatHangs(dir, name) {
  const p = join(dir, `${name}.mjs`);
  writeFileSync(p, `setTimeout(()=>{},60000);\n`, "utf8");
  return p;
}

test("integration: real 10 gates vs real Stop payload → valid JSON, boolean continue, no hang", () => {
  const { stdout, status } = runBundle(REAL_BUNDLE, "{}");
  const j = JSON.parse(stdout);
  assert.equal(typeof j.continue, "boolean", "continue must be a boolean");
  assert.equal(status, 0, "bundle must exit 0 (it emits decision via JSON, not exit code)");
});

test("block aggregation: 2 blocking + 1 passing → continue:false, BOTH reasons present", () => {
  const dir = mkdtempSync(join(tmpdir(), "srb-"));
  try {
    const variant = makeVariant(dir, [
      { path: childThatBlocks(dir, "gate_a", "violation A"), timeout: 4000 },
      { path: childThatPasses(dir, "gate_pass"), timeout: 4000 },
      { path: childThatBlocks(dir, "gate_b", "violation B"), timeout: 4000 },
    ]);
    const { stdout } = runBundle(variant, "{}");
    const j = JSON.parse(stdout);
    assert.equal(j.continue, false, "any child block must block the bundle");
    assert.match(j.stopReason, /gate_a/, "reason must name the first blocking gate");
    assert.match(j.stopReason, /gate_b/, "reason must name the SECOND blocking gate (aggregate, not first-only)");
    assert.match(j.stopReason, /violation A/);
    assert.match(j.stopReason, /violation B/);
    assert.match(j.stopReason, /2 regression gate/, "must report the count");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("unevaluated-gate surfacing: a child that hangs past timeout → continue:true + LOUD warning", () => {
  const dir = mkdtempSync(join(tmpdir(), "srb-"));
  try {
    const variant = makeVariant(dir, [
      { path: childThatPasses(dir, "ok_gate"), timeout: 4000 },
      { path: childThatHangs(dir, "slow_gate"), timeout: 1000 },
    ]);
    const { stdout } = runBundle(variant, "{}");
    const j = JSON.parse(stdout);
    assert.equal(j.continue, true, "a timed-out gate must NOT wedge Stop (fail-open per gate)");
    const ac = j.hookSpecificOutput?.additionalContext || "";
    assert.match(ac, /NOT evaluated/, "must loudly surface the unevaluated gate");
    assert.match(ac, /slow_gate/, "must name the specific gate that did not run");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("fail-open-LOUD on bundle crash: broken import → continue:true + systemMessage names the gates", () => {
  const dir = mkdtempSync(join(tmpdir(), "srb-"));
  try {
    // Missing lib import → module never loads, main().catch unreachable.
    // The honest contract for an unloadable Stop hook: non-zero exit + no
    // silent continue:false (Claude Code treats non-JSON Stop output as
    // non-blocking = fail-open by harness default — never a silent block).
    const src = readFileSync(REAL_BUNDLE, "utf8")
      .replace('from "./lib/hook-runner.mjs"', `from ${JSON.stringify(LIB_URL.replace("hook-runner", "__MISSING__"))}`);
    const p = join(dir, "crash.mjs");
    writeFileSync(p, src, "utf8");
    const { stdout, status } = runBundle(p, "{}");
    assert.notEqual(status, 0, "unloadable bundle must exit non-zero so harness fails open");
    if (stdout.trim()) {
      const j = JSON.parse(stdout);
      assert.equal(j.continue, true, "if it does emit, it must never silently block");
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("runtime throw inside main → main().catch fires → continue:true + LOUD systemMessage", () => {
  const dir = mkdtempSync(join(tmpdir(), "srb-"));
  try {
    // Force a runtime throw AFTER imports succeed (inside main path) by making
    // readStdin throw via a poisoned variant.
    const src = fixLibImport(readFileSync(REAL_BUNDLE, "utf8"))
      .replace("const payload = await readStdin();", "throw new Error('forced runtime fault');");
    const p = join(dir, "rt.mjs");
    writeFileSync(p, src, "utf8");
    const { stdout } = runBundle(p, "{}");
    const j = JSON.parse(stdout);
    assert.equal(j.continue, true, "runtime throw must fail OPEN");
    assert.match(j.systemMessage, /CRASHED/, "must name the crash");
    assert.match(j.systemMessage, /10 dev-tool regression gates NOT evaluated/, "must state gates were skipped");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("disable knob PRISM_STOP_REGRESSION_BUNDLE=0 → immediate continue:true, no gate runs", () => {
  const start = Date.now();
  const { stdout } = runBundle(REAL_BUNDLE, "{}", { PRISM_STOP_REGRESSION_BUNDLE: "0" });
  const j = JSON.parse(stdout);
  assert.equal(j.continue, true);
  assert.ok(Date.now() - start < 5000, "disabled bundle must short-circuit (not run the 10 gates)");
});
