// Tests for stop-dispatcher-method-drift-advisory.mjs
// node:test — match sibling hook test conventions.
//
// R9 intent-first contract:
//   (1) Advisory-not-blocking: never emits decision:block even with missing>0
//   (2) Throttle: skips a scan within the active window
//   (3) Fail-open: scanDispatchers error -> {continue:true}, never throws
//   (4) Kill-switch: DISABLE=1 -> {continue:true} immediately, no scan
//   (5) renderAdvisory shapes the message correctly for missing>0 and missing=0
//   (6) Throttle: scan fires when window has expired
//   (7) CLI invocation round-trip: subprocess emits valid JSON with continue:true

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { renderAdvisory, runGate } from "../stop-dispatcher-method-drift-advisory.mjs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HOOK = resolve("H:/prism/.claude/hooks/stop-dispatcher-method-drift-advisory.mjs");

/** A scanDispatchers result with N missing items across 2 dispatchers. */
function makeScanResult({ missingTotal = 0, scanned = 5, dir = "/dispatchers" } = {}) {
  const d1Missing = [];
  const d2Missing = [];
  for (let i = 0; i < missingTotal; i++) {
    const target = i % 2 === 0 ? d1Missing : d2Missing;
    target.push({
      key: `key_${i}`,
      method: `missingMethod${i}`,
      engine: `FooEngine.ts`,
      candidates: i === 0 ? [{ method: "generate", score: 0.7 }] : [],
    });
  }
  const dispatchers = [
    { file: "camDispatcher.ts", missing: d1Missing, indeterminate: [], liveCount: 10 },
    { file: "cadDispatcher.ts", missing: d2Missing, indeterminate: [], liveCount: 8 },
  ];
  return { dir, scanned, dispatchers, missingTotal, missing: [...d1Missing, ...d2Missing] };
}

/** Create a temp dir with a custom state file path. */
function makeTmpState() {
  const dir = mkdtempSync(join(tmpdir(), "drift-adv-"));
  const stateFile = join(dir, "dispatcher-drift-advisory-last.json");
  return { dir, stateFile };
}

// ---------------------------------------------------------------------------
// (1) Advisory-not-blocking: continue:true even when missing > 0
// ---------------------------------------------------------------------------

describe("advisory-not-blocking", () => {
  test("returns continue:true when scan finds missing methods", async () => {
    const { stateFile } = makeTmpState();
    const result = await runGate({
      scanFn: () => makeScanResult({ missingTotal: 5 }),
      _now: 0, // bypass throttle check
      _stateFile: stateFile,
    });
    assert.equal(result.continue, true, "must never block Stop");
    assert.ok(!("decision" in result) || result.decision !== "block",
      "must never emit decision:block");
  });

  test("returns continue:true when scan finds zero missing methods", async () => {
    const { stateFile } = makeTmpState();
    const result = await runGate({
      scanFn: () => makeScanResult({ missingTotal: 0 }),
      _now: 0,
      _stateFile: stateFile,
    });
    assert.equal(result.continue, true);
    assert.equal(result.systemMessage, undefined, "no message when nothing missing");
  });

  test("systemMessage is set when missing > 0 (advisory fires)", async () => {
    const { stateFile } = makeTmpState();
    const result = await runGate({
      scanFn: () => makeScanResult({ missingTotal: 3 }),
      _now: 0,
      _stateFile: stateFile,
    });
    assert.equal(result.continue, true);
    assert.ok(typeof result.systemMessage === "string" && result.systemMessage.length > 0,
      "systemMessage must be a non-empty string when missing > 0");
    assert.match(result.systemMessage, /3/, "message must mention the missing count");
  });
});

// ---------------------------------------------------------------------------
// (2) Throttle: scan skips within the active window
// ---------------------------------------------------------------------------

describe("throttle", () => {
  test("skips scan within the throttle window and returns continue:true with no message", async () => {
    const { stateFile } = makeTmpState();
    // Seed the state file with a recent timestamp (within 1h)
    writeFileSync(stateFile, JSON.stringify({ lastRunMs: Date.now() - 1000, schemaVersion: "1.0.0" }));
    let scanCalled = false;
    const result = await runGate({
      scanFn: () => { scanCalled = true; return makeScanResult({ missingTotal: 10 }); },
      _stateFile: stateFile,
      // No _now override — real throttle path
    });
    assert.equal(scanCalled, false, "scan must NOT be called within throttle window");
    assert.equal(result.continue, true);
    assert.equal(result.systemMessage, undefined, "no message within throttle window");
  });

  test("runs scan when throttle window has expired", async () => {
    const { stateFile } = makeTmpState();
    // Seed state file with a timestamp 2h ago (expired)
    writeFileSync(stateFile, JSON.stringify({ lastRunMs: Date.now() - 7_200_001, schemaVersion: "1.0.0" }));
    let scanCalled = false;
    const result = await runGate({
      scanFn: () => { scanCalled = true; return makeScanResult({ missingTotal: 2 }); },
      _stateFile: stateFile,
    });
    assert.equal(scanCalled, true, "scan MUST be called after throttle window expires");
    assert.equal(result.continue, true);
  });

  test("runs scan when state file does not exist (no prior run)", async () => {
    const { stateFile } = makeTmpState();
    // stateFile intentionally NOT created
    let scanCalled = false;
    const result = await runGate({
      scanFn: () => { scanCalled = true; return makeScanResult({ missingTotal: 0 }); },
      _stateFile: stateFile,
    });
    assert.equal(scanCalled, true, "scan MUST run when no prior-run record exists");
    assert.equal(result.continue, true);
  });

  test("writes state file after a scan completes", async () => {
    const { stateFile } = makeTmpState();
    assert.equal(existsSync(stateFile), false, "pre-condition: no state file yet");
    await runGate({
      scanFn: () => makeScanResult({ missingTotal: 0 }),
      _now: 0,
      _stateFile: stateFile,
    });
    assert.equal(existsSync(stateFile), true, "state file must be written after scan");
    const obj = JSON.parse(readFileSync(stateFile, "utf8"));
    assert.ok(Number.isFinite(obj.lastRunMs) && obj.lastRunMs > 0, "lastRunMs must be a positive number");
  });
});

// ---------------------------------------------------------------------------
// (3) Fail-open: scanDispatchers throws -> {continue:true}
// ---------------------------------------------------------------------------

describe("fail-open", () => {
  test("returns continue:true when scanFn throws (never propagates)", async () => {
    const { stateFile } = makeTmpState();
    const result = await runGate({
      scanFn: () => { throw new Error("simulated scan failure"); },
      _now: 0,
      _stateFile: stateFile,
    });
    assert.equal(result.continue, true, "fail-open: must return continue:true on scan error");
    assert.equal(result.systemMessage, undefined, "no message on scan error");
    assert.ok(!("decision" in result) || result.decision !== "block",
      "must never block on scan error");
  });

  test("returns continue:true when scanFn returns malformed result (missing fields)", async () => {
    const { stateFile } = makeTmpState();
    const result = await runGate({
      scanFn: () => ({ /* intentionally empty */ }),
      _now: 0,
      _stateFile: stateFile,
    });
    assert.equal(result.continue, true);
  });

  test("returns continue:true when scanFn returns null", async () => {
    const { stateFile } = makeTmpState();
    const result = await runGate({
      // renderAdvisory must not throw on null result
      scanFn: async () => null,
      _now: 0,
      _stateFile: stateFile,
    });
    assert.equal(result.continue, true);
  });
});

// ---------------------------------------------------------------------------
// (4) Kill switch: PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1
// ---------------------------------------------------------------------------

describe("kill-switch via CLI subprocess", () => {
  test("DISABLE=1 -> continue:true, no scan, no systemMessage", () => {
    // Use subprocess to test env-var kill switch cleanly
    const out = execFileSync(process.execPath, [HOOK], {
      input: JSON.stringify({ hook_event_name: "Stop", session_id: "test-sid" }),
      encoding: "utf-8",
      env: {
        ...process.env,
        PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE: "1",
        // Force within throttle window too so we know DISABLE fires first
        PRISM_DISPATCHER_DRIFT_THROTTLE_MS: "999999999",
      },
    });
    const result = JSON.parse(out.trim());
    assert.equal(result.continue, true);
    assert.equal(result.systemMessage, undefined);
  });
});

// ---------------------------------------------------------------------------
// (5) renderAdvisory shapes message correctly
// ---------------------------------------------------------------------------

describe("renderAdvisory", () => {
  test("returns empty string when missingTotal is 0", () => {
    const msg = renderAdvisory(makeScanResult({ missingTotal: 0, scanned: 10 }));
    assert.equal(msg, "", "no message when nothing missing");
  });

  test("mentions total missing count when > 0", () => {
    const msg = renderAdvisory(makeScanResult({ missingTotal: 7, scanned: 10 }));
    assert.match(msg, /7/, "message must mention total missing count");
  });

  test("includes dispatcher file name in the message", () => {
    const msg = renderAdvisory(makeScanResult({ missingTotal: 3, scanned: 5 }));
    assert.match(msg, /Dispatcher\.ts/, "message must name the offending dispatcher file");
  });

  test("includes did-you-mean candidate when present", () => {
    const result = makeScanResult({ missingTotal: 1 });
    const msg = renderAdvisory(result);
    assert.match(msg, /generate/, "did-you-mean candidate should appear in message");
  });

  test("includes run command hint", () => {
    const msg = renderAdvisory(makeScanResult({ missingTotal: 2 }));
    assert.match(msg, /audit-dispatcher-engine-methods\.mjs/, "must include the run command");
  });

  test("includes knob hint for disabling", () => {
    const msg = renderAdvisory(makeScanResult({ missingTotal: 2 }));
    assert.match(msg, /PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE/, "must mention the kill-switch knob");
  });

  test("returns empty string on null/undefined input (never throws)", () => {
    assert.doesNotThrow(() => {
      const msg = renderAdvisory(null);
      assert.equal(msg, "");
    });
    assert.doesNotThrow(() => {
      const msg = renderAdvisory(undefined);
      assert.equal(msg, "");
    });
  });

  test("returns empty string on empty dispatchers array with missingTotal=0", () => {
    const msg = renderAdvisory({ missingTotal: 0, dispatchers: [], scanned: 3, dir: "/x" });
    assert.equal(msg, "");
  });
});

// ---------------------------------------------------------------------------
// (6) CLI subprocess round-trip: valid JSON, continue:true
// ---------------------------------------------------------------------------

describe("CLI round-trip", () => {
  test("invoked as subprocess: emits valid JSON with continue:true when throttled", () => {
    // Seed a fresh state file so the hook sees it as within the window.
    const dir = mkdtempSync(join(tmpdir(), "drift-cli-"));
    const stateFile = join(dir, "dispatcher-drift-advisory-last.json");
    writeFileSync(stateFile, JSON.stringify({ lastRunMs: Date.now() - 100, schemaVersion: "1.0.0" }));
    const out = execFileSync(process.execPath, [HOOK], {
      input: JSON.stringify({ hook_event_name: "Stop", session_id: "cli-test" }),
      encoding: "utf-8",
      env: {
        ...process.env,
        PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE: "",
        PRISM_DISPATCHER_DRIFT_STATE_FILE: stateFile,
      },
    });
    const result = JSON.parse(out.trim());
    assert.equal(result.continue, true, "CLI subprocess must emit continue:true");
    assert.ok(!("decision" in result) || result.decision !== "block",
      "CLI subprocess must never emit decision:block");
  });
});
