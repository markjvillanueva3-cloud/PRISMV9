/**
 * pick-prefresh-tool-plan.test.mjs
 *
 * Tests for the tool-plan surfacing extension of pick-prefresh-inject.mjs.
 * Verifies that when a /pick-unit or /checkin prompt contains a unit-key,
 * the hook injects the RGS tool plan from the sidecar into additionalContext.
 *
 * Uses node:test (hermetic — spawns hook as subprocess, feeds stdin JSON,
 * uses temp sidecar via PRISM_RGS_SIDECAR_PATH env override).
 *
 * Run with:
 *   node --test H:/prism/.claude/hooks/__tests__/pick-prefresh-tool-plan.test.mjs
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const HOOK = "H:/prism/.claude/hooks/pick-prefresh-inject.mjs";

let tmpDir;
let sidecarPath;
let pickedPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pick-prefresh-tp-"));
  sidecarPath = path.join(tmpDir, "roadmap-tool-plans.json");
  pickedPath = path.join(tmpDir, "roadmap-tool-plan-picked.jsonl");
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

function runHook(stdinObj, extraEnv = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdinObj),
    encoding: "utf-8",
    timeout: 12_000,
    env: {
      ...process.env,
      // Disable state-file reads that don't exist in test env
      PRISM_PICK_PREFRESH_STALE_MIN: "999",
      PRISM_RGS_SIDECAR_PATH: sidecarPath,
      PRISM_RGS_PICKED_PATH: pickedPath,
      ...extraEnv,
    },
  });
  if (r.error) throw new Error(`spawn error: ${r.error.message}`);
  if (!r.stdout && r.status !== 0) {
    throw new Error(`hook crashed (exit ${r.status}): ${r.stderr?.slice(0, 400)}`);
  }
  try {
    return JSON.parse(r.stdout || "{}");
  } catch {
    throw new Error(`hook emitted non-JSON: ${r.stdout?.slice(0, 300)}`);
  }
}

function writeSidecar(plans, opts = {}) {
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  fs.writeFileSync(sidecarPath, JSON.stringify({
    schemaVersion: "1.0.0",
    generatedAt,
    degraded: false,
    plans,
  }));
}

function readPickedEvents() {
  try {
    return fs.readFileSync(pickedPath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(l => JSON.parse(l));
  } catch { return []; }
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

const UNIT_KEY = "MS-A::P0-U02";

const SAMPLE_PLAN = {
  pipelines: [
    { skill: "forge-triple", confidence: 0.9 },
    { skill: "lathe-studio", confidence: 0.7 },
  ],
  // Real object shape from fuseSignals — NOT string array (P0 regression guard)
  tribal: [{ id: "t1", tip: "Use constant-surface-speed for P-group alloys", score: 0.8, domain: "mill" }],
  skills: ["forge-triple", "dedup"],
  mcpTools: ["prism_calc"],
  agents: ["physics-reviewer"],
  buildVsIntegrate: "build",
  complexityTier: "M",
  rationale: "New engine with no existing equivalent",
  source: "rgs-v2",
};

const SAMPLE_SIDECAR_ENTRY = {
  plan: SAMPLE_PLAN,
  sourceHash: "abc123",
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("pick-prefresh tool-plan injection", () => {

  test("injects plan pipelines when prompt contains MS::unit key", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-1" });

    assert.strictEqual(result.continue, true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(ctx.includes("forge-triple"), `Expected 'forge-triple' in context, got:\n${ctx}`);
    assert.ok(ctx.includes("lathe-studio"), `Expected 'lathe-studio' in context, got:\n${ctx}`);
  });

  test("tribal object tip text is rendered — not [object Object] (P0 regression guard)", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-1b" });

    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(
      ctx.includes("constant-surface-speed"),
      `Expected tribal tip text in context, got:\n${ctx.slice(0, 500)}`,
    );
    assert.ok(
      !ctx.includes("[object Object]"),
      `tribal must not render as [object Object], got:\n${ctx.slice(0, 500)}`,
    );
  });

  test("picks event is appended to JSONL on plan injection", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-2" });

    const events = readPickedEvents();
    assert.ok(events.length >= 1, "Expected at least one picked event");
    const ev = events[events.length - 1];
    assert.strictEqual(ev.v, 1);
    assert.strictEqual(ev.event, "picked");
    assert.strictEqual(ev.unitKey, UNIT_KEY);
    assert.strictEqual(ev.sid, "s-test-2");
    assert.ok(Array.isArray(ev.predictedPipelines), "predictedPipelines must be array");
    assert.ok(ev.predictedPipelines.includes("forge-triple"), "forge-triple must be in predictedPipelines");
    assert.ok(ev.ts, "ts must be present");
  });

  test("STALE prefix when plan has stale:true flag", () => {
    writeSidecar({
      [UNIT_KEY]: {
        plan: SAMPLE_PLAN,
        sourceHash: "STALE_MARKER",
        stale: true,
      },
    });

    const result = runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-3" });

    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(ctx.includes("STALE"), `Expected STALE warning in context, got:\n${ctx.slice(0, 400)}`);
  });

  test("STALE prefix when sidecar generatedAt is older than 7 days", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY }, { generatedAt: oldDate });

    const result = runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-4" });

    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(ctx.includes("STALE"), `Expected STALE warning for aged sidecar, got:\n${ctx.slice(0, 400)}`);
  });

  test("stale-on-pickup event appended when plan is stale", () => {
    writeSidecar({
      [UNIT_KEY]: { plan: SAMPLE_PLAN, sourceHash: "x", stale: true },
    });

    runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-5" });

    const events = readPickedEvents();
    const staleEvt = events.find(e => e.event === "stale-on-pickup");
    assert.ok(staleEvt, "Expected stale-on-pickup event in picked JSONL");
    assert.strictEqual(staleEvt.unitKey, UNIT_KEY);
  });

  test("no tool-plan section when prompt has no trigger keyword", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    // No /pick-unit, no /checkin etc.
    const result = runHook({ prompt: "hello world", session_id: "s-test-6" });

    assert.strictEqual(result.continue, true);
    // Fast path — no hookSpecificOutput at all
    assert.ok(!result.hookSpecificOutput, "Fast path must not emit hookSpecificOutput");
    const events = readPickedEvents();
    assert.strictEqual(events.length, 0, "No pick events on fast path");
  });

  test("no tool-plan section when prompt has trigger but no unit-id", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({ prompt: "/pick-unit", session_id: "s-test-7" });

    assert.strictEqual(result.continue, true);
    // Should still emit prefresh context (trigger matched), but NO tool-plan section
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(!ctx.includes("tool-plan") && !ctx.includes("forge-triple"),
      `No tool-plan section expected when no unit-id, got:\n${ctx.slice(0, 400)}`);
    const events = readPickedEvents();
    assert.strictEqual(events.length, 0, "No pick events when no unit-id extracted");
  });

  test("bare /loop with no unit-id does NOT trigger tool-plan injection", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({ prompt: "/loop", session_id: "s-test-8" });

    assert.strictEqual(result.continue, true);
    // /loop alone should be fast-path (no trigger match) or at least no tool-plan
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(!ctx.includes("forge-triple"),
      `bare /loop must not inject tool-plan, got:\n${ctx.slice(0, 400)}`);
    const events = readPickedEvents();
    assert.strictEqual(events.length, 0, "No pick events on bare /loop");
  });

  test("/loop with unit-id triggers tool-plan injection", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({
      prompt: `/loop 5m /pick-unit ${UNIT_KEY}`,
      session_id: "s-test-9",
    });

    assert.strictEqual(result.continue, true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(ctx.includes("forge-triple"),
      `Expected forge-triple in context for /loop with unit-id, got:\n${ctx.slice(0, 400)}`);
  });

  test("/rgs continue triggers tool-plan when unit-id present", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({
      prompt: `/rgs continue ${UNIT_KEY}`,
      session_id: "s-test-10",
    });

    assert.strictEqual(result.continue, true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(ctx.includes("forge-triple"),
      `Expected forge-triple in context for /rgs continue, got:\n${ctx.slice(0, 400)}`);
  });

  test("/continue-roadmap triggers tool-plan when unit-id present", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({
      prompt: `/continue-roadmap ${UNIT_KEY}`,
      session_id: "s-test-11",
    });

    assert.strictEqual(result.continue, true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(ctx.includes("forge-triple"),
      `Expected forge-triple for /continue-roadmap, got:\n${ctx.slice(0, 400)}`);
  });

  test("PRISM_RGS_TOOL_PLAN_INJECT=0 disables tool-plan section entirely", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook(
      { prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-12" },
      { PRISM_RGS_TOOL_PLAN_INJECT: "0" },
    );

    assert.strictEqual(result.continue, true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(!ctx.includes("forge-triple"),
      `Tool-plan must be suppressed when knob=0, got:\n${ctx.slice(0, 400)}`);
    // existing prefresh output should still be present (trigger DID match)
    assert.ok(ctx.includes("pick/checkin prefresh") || ctx.length > 0,
      "Existing prefresh context must still be present");
    const events = readPickedEvents();
    assert.strictEqual(events.length, 0, "No pick events when knob disabled");
  });

  test("missing sidecar does not throw — hook returns continue:true", () => {
    // No sidecar written — file does not exist
    const result = runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-13" });
    assert.strictEqual(result.continue, true);
    // Should have existing prefresh ctx but no tool-plan section
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(!ctx.includes("forge-triple"),
      "Missing sidecar must not inject tool-plan");
  });

  test("single additionalContext block — not two separate hookSpecificOutput emissions", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    const result = runHook({ prompt: `/pick-unit ${UNIT_KEY}`, session_id: "s-test-14" });

    // The output must be ONE JSON object (the hook writes stdout once)
    assert.strictEqual(typeof result, "object");
    assert.strictEqual(result.continue, true);
    // hookSpecificOutput must be a single object, not an array
    assert.strictEqual(typeof result.hookSpecificOutput, "object");
    assert.ok(!Array.isArray(result.hookSpecificOutput),
      "hookSpecificOutput must be a single object, not an array");
    // Both prefresh AND tool-plan in the same additionalContext string
    const ctx = result.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes("pick/checkin prefresh"), "prefresh section must be present");
    assert.ok(ctx.includes("forge-triple"), "tool-plan section must be present");
  });

  test("U-... only unit id (no milestone prefix) gracefully skips tool-plan", () => {
    writeSidecar({ [UNIT_KEY]: SAMPLE_SIDECAR_ENTRY });

    // U-... alone cannot form MS::unit composite key
    const result = runHook({ prompt: "/pick-unit U-P0-U02", session_id: "s-test-15" });

    assert.strictEqual(result.continue, true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    assert.ok(!ctx.includes("forge-triple"),
      "U-... alone without milestone must not inject tool-plan");
  });
});
