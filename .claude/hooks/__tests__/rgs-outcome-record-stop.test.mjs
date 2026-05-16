/**
 * rgs-outcome-record-stop.test.mjs
 * Hermetic tests for the RGS outcome-record Stop hook.
 *
 * Run: "H:/.claude/bin/portable-node" --test .claude/hooks/__tests__/rgs-outcome-record-stop.test.mjs
 *
 * Safety contract under test:
 *  - ALWAYS emits {continue:true} — never throws, never blocks Stop
 *  - Missing picked.jsonl → no-op, still emits {continue:true}
 *  - With a real picked.jsonl + fake commit bodies → appends outcome records
 *  - PRISM_RGS_OUTCOME_RECORD_DISABLE=1 → instant no-op
 *  - Dedup: re-running does NOT re-append identical {unitKey,outcome} pairs
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOOK_PATH = path.resolve("H:/prism/.claude/hooks/rgs-outcome-record-stop.mjs");
// Use the same node binary that runs the test — portable-node resolves in bash
// but spawnSync needs a Windows-native path; process.execPath is always correct.
const NODE = process.execPath;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run the hook with a given stdin payload, env overrides, and optional cwd. */
function runHook(stdinObj = {}, env = {}) {
  return spawnSync(NODE, [HOOK_PATH], {
    input: JSON.stringify(stdinObj),
    encoding: "utf-8",
    timeout: 12000,
    env: { ...process.env, ...env },
  });
}

/** Run the hook with empty/no stdin (edge case). */
function runHookEmptyStdin(env = {}) {
  return spawnSync(NODE, [HOOK_PATH], {
    input: "",
    encoding: "utf-8",
    timeout: 12000,
    env: { ...process.env, ...env },
  });
}

/** Parse the last JSON line from stdout. */
function lastJson(stdout) {
  const lines = (stdout || "").trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch { /* skip */ }
  }
  return null;
}

/** Write a single picked.jsonl line into a temp dir; return paths object. */
function makeTempEnv(pickedLines = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-rgs-test-"));
  const pickedPath = path.join(dir, "roadmap-tool-plan-picked.jsonl");
  const outcomesPath = path.join(dir, "roadmap-tool-plan-outcomes.jsonl");

  if (pickedLines.length > 0) {
    fs.writeFileSync(pickedPath, pickedLines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  }

  return { dir, pickedPath, outcomesPath };
}

// ---------------------------------------------------------------------------
// Suite 1 — core contract: never block
// ---------------------------------------------------------------------------
describe("never-block contract", () => {
  it("empty stdin → {continue:true}", () => {
    const r = runHookEmptyStdin({ PRISM_RGS_OUTCOME_RECORD_DISABLE: "1" });
    assert.equal(r.status, 0, `exit code must be 0, stderr: ${r.stderr}`);
    const out = lastJson(r.stdout);
    assert.ok(out, "must emit JSON");
    assert.equal(out.continue, true);
  });

  it("valid JSON stdin → {continue:true}", () => {
    const r = runHook({ session_id: "claude-test" }, { PRISM_RGS_OUTCOME_RECORD_DISABLE: "1" });
    assert.equal(r.status, 0);
    const out = lastJson(r.stdout);
    assert.equal(out.continue, true);
  });

  it("malformed JSON stdin → {continue:true} (never throws)", () => {
    const r = spawnSync(NODE, [HOOK_PATH], {
      input: "not-json{{{{",
      encoding: "utf-8",
      timeout: 12000,
      env: { ...process.env, PRISM_RGS_OUTCOME_RECORD_DISABLE: "1" },
    });
    assert.equal(r.status, 0);
    const out = lastJson(r.stdout);
    assert.equal(out.continue, true);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — DISABLE knob
// ---------------------------------------------------------------------------
describe("PRISM_RGS_OUTCOME_RECORD_DISABLE knob", () => {
  it("DISABLE=1 → immediate {continue:true,suppressOutput:true}", () => {
    const r = runHook({}, { PRISM_RGS_OUTCOME_RECORD_DISABLE: "1" });
    assert.equal(r.status, 0);
    const out = lastJson(r.stdout);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true);
  });

  it("completes in under 500ms when disabled", () => {
    const start = Date.now();
    runHook({}, { PRISM_RGS_OUTCOME_RECORD_DISABLE: "1" });
    assert.ok(Date.now() - start < 500, "disabled path must be sub-500ms");
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — missing picked.jsonl → no-op
// ---------------------------------------------------------------------------
describe("missing picked.jsonl → no-op", () => {
  it("when picked.jsonl does not exist, hook emits {continue:true} without crashing", () => {
    const { dir } = makeTempEnv([]); // no picked file written
    const r = runHook(
      {},
      {
        PRISM_RGS_PICKED_PATH: path.join(dir, "roadmap-tool-plan-picked.jsonl"),
        PRISM_RGS_OUTCOMES_PATH: path.join(dir, "roadmap-tool-plan-outcomes.jsonl"),
      }
    );
    assert.equal(r.status, 0);
    const out = lastJson(r.stdout);
    assert.equal(out.continue, true);
    // No outcomes file should be created when there's nothing to process
    assert.ok(
      !fs.existsSync(path.join(dir, "roadmap-tool-plan-outcomes.jsonl")),
      "outcomes file must not be created when no picked events"
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — with picked.jsonl + commit match → appends outcome record
// ---------------------------------------------------------------------------
describe("with picked.jsonl and matching fake commit → appends outcome", () => {
  let dir, pickedPath, outcomesPath;

  before(() => {
    const env = makeTempEnv([
      {
        v: 1,
        ts: "2026-05-15T10:00:00.000Z",
        unitKey: "U-TEST-OUTCOME-01",
        sid: "claude-fake-sid",
        predictedPipelines: ["build-doctor"],
        event: "picked",
      },
    ]);
    dir = env.dir;
    pickedPath = env.pickedPath;
    outcomesPath = env.outcomesPath;
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("appends at least one outcome line to the outcomes file", () => {
    // Inject env paths AND a fake commit log via PRISM_RGS_TEST_COMMITS
    // The hook reads this env var (when set) instead of spawning git log —
    // this keeps the test hermetic without real git.
    const fakeCommits = [
      "[SCOPE]/U-TEST-OUTCOME-01: ship the test engine",
      "chore: bump version",
    ].join("\n");

    const r = runHook(
      {},
      {
        PRISM_RGS_PICKED_PATH: pickedPath,
        PRISM_RGS_OUTCOMES_PATH: outcomesPath,
        PRISM_RGS_TEST_COMMITS: fakeCommits,
        PRISM_RGS_TEST_REVERTS: "",
      }
    );

    assert.equal(r.status, 0, `hook crashed: ${r.stderr}`);
    const out = lastJson(r.stdout);
    assert.equal(out.continue, true);

    assert.ok(fs.existsSync(outcomesPath), "outcomes file must be created");
    const lines = fs
      .readFileSync(outcomesPath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    assert.ok(lines.length >= 1, "at least one outcome line must be appended");

    const record = JSON.parse(lines[0]);
    assert.equal(record.v, 1);
    assert.equal(record.unitKey, "U-TEST-OUTCOME-01");
    assert.equal(record.outcome, "shipped");
    assert.ok(Array.isArray(record.predictedPipelines));
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — dedup: re-running does not double-append
// ---------------------------------------------------------------------------
describe("dedup: re-running does not re-append identical outcomes", () => {
  let dir, pickedPath, outcomesPath;

  before(() => {
    const env = makeTempEnv([
      {
        v: 1,
        ts: "2026-05-15T10:00:00.000Z",
        unitKey: "U-DEDUP-77",
        sid: "claude-dedup-sid",
        predictedPipelines: ["test-runner"],
        event: "picked",
      },
    ]);
    dir = env.dir;
    pickedPath = env.pickedPath;
    outcomesPath = env.outcomesPath;
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("running hook twice produces exactly one outcome record (no duplicates)", () => {
    const sharedEnv = {
      PRISM_RGS_PICKED_PATH: pickedPath,
      PRISM_RGS_OUTCOMES_PATH: outcomesPath,
      PRISM_RGS_TEST_COMMITS: "[SCOPE]/U-DEDUP-77: done",
      PRISM_RGS_TEST_REVERTS: "",
    };

    // First run
    const r1 = runHook({}, sharedEnv);
    assert.equal(r1.status, 0);

    // Second run with same inputs
    const r2 = runHook({}, sharedEnv);
    assert.equal(r2.status, 0);

    const lines = fs
      .readFileSync(outcomesPath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);

    // Dedup: must not have more than one record for the same {unitKey, outcome}
    const dedupKeys = new Set(lines.map((l) => {
      const rec = JSON.parse(l);
      return `${rec.unitKey}:${rec.outcome}`;
    }));
    assert.equal(
      dedupKeys.size,
      lines.length,
      `duplicate outcome records found — expected ${dedupKeys.size} got ${lines.length}`
    );
    assert.equal(lines.length, 1, "exactly one record after two identical runs");
  });
});
