// Tests for enforce-plan-before-build.mjs (RGS-PLANNING-LOOP-BRIDGE-MS1/U-PLAN-GATE).
// Real values; fail on real gate regression (R9). Pure fns direct + subprocess E2E
// with a hermetic state file (PRISM_RGS_PLAN_GATE_STATE_FILE).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { isNewEngineWrite, decideGate } from "../enforce-plan-before-build.mjs";

const HOOK = fileURLToPath(new URL("../enforce-plan-before-build.mjs", import.meta.url));
const TODAY = new Date().toLocaleDateString("en-CA"); // LOCAL tz, matches the hook

function run(payload, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: "utf8", timeout: 20000, env: { ...process.env, ...env } });
  return { out: (r.stdout || "").trim(), status: r.status };
}

// ---- isNewEngineWrite (pure) ----
test("isNewEngineWrite: new engine .ts under src/engines -> true", () => {
  assert.equal(isNewEngineWrite("Write", "H:/prism/mcp-server/src/engines/NewEngine.ts", () => false), true);
});
test("isNewEngineWrite: EXISTING engine file -> false (overwrite is not creation)", () => {
  assert.equal(isNewEngineWrite("Write", "H:/prism/mcp-server/src/engines/Old.ts", () => true), false);
});
test("isNewEngineWrite: non-Write / test file / non-ts / outside engines -> false", () => {
  assert.equal(isNewEngineWrite("Edit", "src/engines/X.ts", () => false), false);
  assert.equal(isNewEngineWrite("Write", "src/engines/X.test.ts", () => false), false);
  assert.equal(isNewEngineWrite("Write", "src/engines/X.md", () => false), false);
  assert.equal(isNewEngineWrite("Write", "src/algorithms/X.ts", () => false), false);
  assert.equal(isNewEngineWrite("Write", "", () => false), false);
});
test("isNewEngineWrite: backslash paths normalized", () => {
  assert.equal(isNewEngineWrite("Write", "H:\\prism\\mcp-server\\src\\engines\\Y.ts", () => false), true);
});

// ---- decideGate (pure) -- all decision branches ----
test("decideGate: mode 0 -> pass regardless", () => {
  assert.equal(decideGate({ plan: null, mode: "0", today: TODAY, engineName: "X.ts" }).kind, "pass");
});
test("decideGate: no plan + mode 1 -> BLOCK with actionable reason", () => {
  const d = decideGate({ plan: null, mode: "1", today: TODAY, engineName: "X.ts" });
  assert.equal(d.kind, "block");
  assert.match(d.reason, /PLAN REQUIRED/);
  assert.match(d.reason, /plan-build|rgs6/);
});
test("decideGate: no plan + default mode -> ADVISE (fleet-safe, never blocks unopted peers)", () => {
  const d = decideGate({ plan: null, mode: "advisory", today: TODAY, engineName: "X.ts" });
  assert.equal(d.kind, "advise");
  assert.match(d.msg, /PRISM_RGS_PLAN_GATE=1/);
});
test("decideGate: stale plan -> advise in BOTH modes (parity with .py semantics)", () => {
  for (const mode of ["1", "advisory"]) {
    const d = decideGate({ plan: { date: "2026-01-01" }, mode, today: TODAY, engineName: "X.ts" });
    assert.equal(d.kind, "advise", `mode=${mode}`);
    assert.match(d.msg, /STALE PLAN/);
  }
});
test("decideGate: fresh plan -> pass in both modes", () => {
  for (const mode of ["1", "advisory"]) {
    assert.equal(decideGate({ plan: { date: TODAY }, mode, today: TODAY, engineName: "X.ts" }).kind, "pass");
  }
});

// ---- subprocess E2E (hermetic state file) ----
const ENGINE_PAYLOAD = { tool_name: "Write", tool_input: { file_path: "H:/prism/mcp-server/src/engines/__NoSuchEngine__.ts" } };

test("E2E: no plan file + gate=1 -> {decision:block}", () => {
  const missing = path.join(os.tmpdir(), `no-plan-${Date.now()}.json`);
  const { out, status } = run(ENGINE_PAYLOAD, { PRISM_RGS_PLAN_GATE: "1", PRISM_RGS_PLAN_GATE_STATE_FILE: missing });
  assert.equal(status, 0);
  const j = JSON.parse(out);
  assert.equal(j.decision, "block");
});
test("E2E: fresh plan + gate=1 -> silent pass", () => {
  const f = path.join(os.tmpdir(), `plan-${Date.now()}.json`);
  fs.writeFileSync(f, JSON.stringify({ date: TODAY }));
  try {
    assert.equal(run(ENGINE_PAYLOAD, { PRISM_RGS_PLAN_GATE: "1", PRISM_RGS_PLAN_GATE_STATE_FILE: f }).out, "");
  } finally { fs.unlinkSync(f); }
});
test("E2E: non-engine write -> silent pass (no output)", () => {
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: "H:/x/readme.md" } }).out, "");
});
test("E2E: malformed stdin -> silent pass, exit 0 (fail-open, never blocks the fleet)", () => {
  const r = spawnSync(process.execPath, [HOOK], { input: "{not json", encoding: "utf8", timeout: 20000 });
  assert.equal((r.stdout || "").trim(), "");
  assert.equal(r.status, 0);
});
test("E2E: corrupt plan file + gate=1 -> treated as no-plan -> block", () => {
  const f = path.join(os.tmpdir(), `corrupt-plan-${Date.now()}.json`);
  fs.writeFileSync(f, "{nope");
  try {
    const j = JSON.parse(run(ENGINE_PAYLOAD, { PRISM_RGS_PLAN_GATE: "1", PRISM_RGS_PLAN_GATE_STATE_FILE: f }).out);
    assert.equal(j.decision, "block");
  } finally { fs.unlinkSync(f); }
});
test("E2E: gate=0 kill switch -> silent even with no plan", () => {
  const missing = path.join(os.tmpdir(), `no-plan2-${Date.now()}.json`);
  assert.equal(run(ENGINE_PAYLOAD, { PRISM_RGS_PLAN_GATE: "0", PRISM_RGS_PLAN_GATE_STATE_FILE: missing }).out, "");
});
