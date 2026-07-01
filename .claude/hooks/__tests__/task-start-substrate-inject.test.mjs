// Tests for task-start-substrate-inject.mjs (U7). Real values; fail on real
// regression (R9). Drives the hook as a subprocess with a real temp loop-state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("../task-start-substrate-inject.mjs", import.meta.url));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const LOOP_DIR = path.join(ROOT, "state", "shared", "loop-state");
const SID = "__test_u7_hook__";
const LOOP_FILE = path.join(LOOP_DIR, `loop-${SID}.json`);

function writeLoop(state) { fs.mkdirSync(LOOP_DIR, { recursive: true }); fs.writeFileSync(LOOP_FILE, JSON.stringify(state)); }
function cleanup() { try { fs.unlinkSync(LOOP_FILE); } catch { /* ignore */ } }
function run(payload, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: "utf8", timeout: 20000, env: { ...process.env, ...env } });
  return { out: (r.stdout || "").trim(), status: r.status };
}
function ctxOf(out) { try { return JSON.parse(out).hookSpecificOutput.additionalContext; } catch { return null; } }

test("active loop -> emits the substrate matrix with the 4 base substrates", () => {
  cleanup();
  try {
    writeLoop({ status: "running", task: "RGS-X-MS0/U1: build a thing", slot: "tango" });
    const { out, status } = run({ session_id: SID, prompt: "continue" });
    assert.equal(status, 0);
    const c = ctxOf(out);
    assert.ok(c && c.includes("Substrate routing"));
    // the 4 always-present substrates (Hermes is conditional, tested separately)
    for (const base of ["ollama", "obsidian", "master-graph", "psn"]) assert.ok(c.includes(`| **${base}**`), `${base} row present`);
  } finally { cleanup(); }
});

test("Hermes lane ON when the task carries scale keywords (audit/all/verify)", () => {
  cleanup();
  try {
    writeLoop({ status: "running", task: "audit all engines and verify wiring", slot: "tango" });
    const c = ctxOf(run({ session_id: SID, prompt: "x" }).out);
    assert.match(c, /Hermes fan-out:\*\* ON/);
    assert.ok(c.includes("| **hermes**"));
  } finally { cleanup(); }
});

test("Hermes lane OFF for a plain task (no scale signal) -> 4 rows", () => {
  cleanup();
  try {
    writeLoop({ status: "running", task: "fix a typo in one file", slot: "tango" });
    const c = ctxOf(run({ session_id: SID, prompt: "x" }).out);
    assert.match(c, /Hermes fan-out:\*\* off/);
    assert.equal((c.match(/\| \*\*/g) || []).length, 4);
  } finally { cleanup(); }
});

test("no active loop + non-planning prompt -> graceful no-op (no stdout)", () => {
  cleanup(); // no loop file
  const { out } = run({ session_id: SID, prompt: "x" });
  assert.equal(out, "");
});

// ---- U3 (DEVTOOL-AUTOINVOKE-MS0/P2): Path B planning-phase branch ----
test("Path B: no active loop + a PLANNING command -> fires the planning matrix", () => {
  cleanup(); // no loop file
  const { out } = run({ session_id: SID, prompt: "/goal improve the thing" });
  assert.ok(out, "should emit");
  const c = ctxOf(out);
  assert.match(c, /PLANNING/);
  assert.equal((c.match(/\| \*\*/g) || []).length >= 4, true); // the substrate matrix
});

test("Path B: each planning command triggers (checkin/propose-goal/rgs/pick-unit/plan-build/smart)", () => {
  cleanup();
  for (const cmd of ["/checkin", "/propose-goal x", "/rgs build", "/pick-unit", "/plan-build", "/smart go"]) {
    const c = ctxOf(run({ session_id: SID, prompt: cmd }).out);
    assert.match(c, /PLANNING/, `cmd=${cmd}`);
  }
});

test("Path B: PRISM_SUBSTRATE_INJECT_PLAN=0 disables ONLY the planning branch", () => {
  cleanup();
  assert.equal(run({ session_id: SID, prompt: "/goal x" }, { PRISM_SUBSTRATE_INJECT_PLAN: "0" }).out, "");
});

test("Path B: an active loop still takes precedence over the planning branch (Path A wins)", () => {
  cleanup();
  try {
    writeLoop({ status: "running", task: "RGS-X/U1: real loop task", slot: "tango" });
    const c = ctxOf(run({ session_id: SID, prompt: "/goal something else" }).out);
    assert.match(c, /loop task/); // Path A header, not the planning header
    assert.doesNotMatch(c, /for PLANNING/);
  } finally { cleanup(); }
});

test("ended loop (status != running) -> no-op", () => {
  cleanup();
  try {
    writeLoop({ status: "ended", task: "RGS-X/U1: x", slot: "tango" });
    assert.equal(run({ session_id: SID, prompt: "x" }).out, "");
  } finally { cleanup(); }
});

test("PRISM_SUBSTRATE_INJECT=0 disables the hook entirely", () => {
  cleanup();
  try {
    writeLoop({ status: "running", task: "RGS-X/U1: x", slot: "tango" });
    assert.equal(run({ session_id: SID, prompt: "x" }, { PRISM_SUBSTRATE_INJECT: "0" }).out, "");
  } finally { cleanup(); }
});

test("missing session_id -> no-op (never crashes)", () => {
  assert.equal(run({ prompt: "x" }).out, "");
});

test("echoes the incoming hook_event_name (UserPromptSubmit / SubagentStart)", () => {
  cleanup();
  try {
    writeLoop({ status: "running", task: "RGS-X/U1: x", slot: "tango" });
    const out = run({ session_id: SID, prompt: "x", hook_event_name: "SubagentStart" }).out;
    assert.equal(JSON.parse(out).hookSpecificOutput.hookEventName, "SubagentStart");
  } finally { cleanup(); }
});
