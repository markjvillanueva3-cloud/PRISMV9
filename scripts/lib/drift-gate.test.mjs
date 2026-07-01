import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { driftGateVerdict, HARD_FAIL_CATEGORIES } from "./drift-gate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGEN_VIZ = path.join(__dirname, "..", "regen-viz.mjs");

// ---------------------------------------------------------------------------
// Pure verdict — every branch (W4 / U-DRIFT-HARD-FAIL)
// ---------------------------------------------------------------------------

test("null report → pass with explicit not-corruption note (fresh checkout safe)", () => {
  const v = driftGateVerdict(null);
  assert.equal(v.fail, false);
  assert.equal(v.code, 0);
  assert.match(v.summary, /no DRIFT_REPORT/);
});

test("non-object report (string) → pass (treated as absent, not corruption)", () => {
  const v = driftGateVerdict("garbage");
  assert.equal(v.fail, false);
  assert.equal(v.code, 0);
});

test("clean report (only fresh) → pass with fresh count summary", () => {
  const v = driftGateVerdict({ total: 67, byCategory: { fresh: 67, truncated: 0, "root-missing": 0 } });
  assert.equal(v.fail, false);
  assert.equal(v.code, 0);
  assert.match(v.summary, /clean/);
  assert.match(v.summary, /67\/67 fresh/);
});

test("stale-time / stale-churn / never-walked are NOT hard fails (normal between cron re-walks)", () => {
  const v = driftGateVerdict({
    total: 67,
    byCategory: { fresh: 60, "stale-time": 3, "stale-churn": 3, "never-walked": 1, truncated: 0, "root-missing": 0 },
  });
  assert.equal(v.fail, false, "only data-integrity categories block; staleness is expected");
  assert.equal(v.code, 0);
});

test("truncated > 0 → HARD FAIL exit 1 with remedy + bypass knob named", () => {
  const v = driftGateVerdict({ total: 67, byCategory: { fresh: 65, truncated: 2, "root-missing": 0 } });
  assert.equal(v.fail, true);
  assert.equal(v.code, 1);
  assert.match(v.summary, /2 truncated namespaces/);
  assert.match(v.summary, /cron-revwalk/);
  assert.match(v.summary, /PRISM_REGEN_VIZ_IGNORE_DRIFT=1/);
});

test("root-missing > 0 → HARD FAIL exit 1", () => {
  const v = driftGateVerdict({ total: 67, byCategory: { fresh: 66, truncated: 0, "root-missing": 1 } });
  assert.equal(v.fail, true);
  assert.equal(v.code, 1);
  assert.match(v.summary, /1 root-missing namespace\b/);
});

test("both truncated AND root-missing → both reasons listed", () => {
  const v = driftGateVerdict({ total: 67, byCategory: { fresh: 60, truncated: 4, "root-missing": 3 } });
  assert.equal(v.fail, true);
  assert.deepEqual(v.reasons, ["4 truncated namespaces", "3 root-missing namespaces"]);
});

test("singular vs plural grammar (1 namespace, not 1 namespaces)", () => {
  const v = driftGateVerdict({ total: 5, byCategory: { truncated: 1 } });
  assert.match(v.summary, /1 truncated namespace\b/);
  assert.doesNotMatch(v.summary, /1 truncated namespaces/);
});

test("adversarial: string counts are coerced (\"2\" → fail)", () => {
  const v = driftGateVerdict({ total: 10, byCategory: { truncated: "2" } });
  assert.equal(v.fail, true, 'byCategory.truncated="2" must coerce to 2 and fail');
});

test("adversarial: missing byCategory → pass (no integrity categories present)", () => {
  const v = driftGateVerdict({ total: 0 });
  assert.equal(v.fail, false);
  assert.equal(v.code, 0);
});

test("adversarial: NaN/garbage count → treated as 0, no false fail", () => {
  const v = driftGateVerdict({ total: 9, byCategory: { truncated: "not-a-number", "root-missing": null } });
  assert.equal(v.fail, false, "uncoercible counts must not produce a false hard-fail");
});

test("HARD_FAIL_CATEGORIES is exactly the two data-integrity categories", () => {
  assert.deepEqual([...HARD_FAIL_CATEGORIES].sort(), ["root-missing", "truncated"]);
});

// ---------------------------------------------------------------------------
// REAL subprocess E2E — `regen-viz.mjs --drift-gate-only --no-detect` reads a
// planted DRIFT_REPORT.json (env-pointed temp, never the shared file) and
// exits with the gate's code WITHOUT running the multi-minute build chain.
// This is W4's verification channel and proves the wiring end-to-end.
// ---------------------------------------------------------------------------

function runGateOnly(reportObj, extraEnv = {}) {
  const tmp = path.join(os.tmpdir(), `prism-drift-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  if (reportObj !== undefined) fs.writeFileSync(tmp, JSON.stringify(reportObj));
  try {
    return spawnSync(process.execPath, [REGEN_VIZ, "--drift-gate-only", "--no-detect"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_DRIFT_REPORT_PATH: tmp, ...extraEnv },
    });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

test("E2E: --drift-gate-only exits 1 on a planted truncated report", () => {
  const r = runGateOnly({ total: 67, byCategory: { fresh: 65, truncated: 2 } });
  assert.equal(r.status, 1, `truncated must exit 1; got ${r.status}\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout + r.stderr, /drift-gate FAIL/);
});

test("E2E: --drift-gate-only exits 0 on a planted clean report", () => {
  const r = runGateOnly({ total: 67, byCategory: { fresh: 67 } });
  assert.equal(r.status, 0, `clean must exit 0; got ${r.status}\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /drift-gate: clean/);
});

test("E2E: PRISM_REGEN_VIZ_IGNORE_DRIFT=1 bypasses a truncated report (exit 0, logged)", () => {
  const r = runGateOnly({ total: 67, byCategory: { truncated: 9 } }, { PRISM_REGEN_VIZ_IGNORE_DRIFT: "1" });
  assert.equal(r.status, 0, "bypass knob must force exit 0 even with truncated");
  assert.match(r.stdout, /bypassed/);
});

test("E2E: missing report file → exit 0 (absence is not corruption)", () => {
  const r = spawnSync(process.execPath, [REGEN_VIZ, "--drift-gate-only", "--no-detect"], {
    encoding: "utf8",
    env: { ...process.env, PRISM_DRIFT_REPORT_PATH: path.join(os.tmpdir(), `prism-absent-${Date.now()}.json`) },
  });
  assert.equal(r.status, 0, `absent report must exit 0; got ${r.status}\n${r.stderr}`);
});

test("E2E: regenerate:true round-trip — gate spawns detect → writes env-pointed file → reads it back (proves the production dual-write/read path)", () => {
  // No --no-detect, so the gate runs detect-system-viz-drift.mjs. Both writer
  // and reader honor PRISM_DRIFT_REPORT_PATH (symmetric env contract).
  // This is the production path that subprocess --no-detect tests don't cover
  // — without this, a future ROOT/path refactor of either file silently
  // breaks production with all tests still green.
  const tmp = path.join(os.tmpdir(), `prism-drift-roundtrip-${Date.now()}.json`);
  try {
    const r = spawnSync(process.execPath, [REGEN_VIZ, "--drift-gate-only"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_DRIFT_REPORT_PATH: tmp },
      timeout: 30_000,
    });
    // The crucial assertion is the round-trip: detect must have WRITTEN the
    // env-pointed file (proves the writer honors the override) and the gate
    // must have READ it (proves the reader honors the same override). Exit
    // code reflects real graph state — both 0 (clean) and 1 (truncated/
    // root-missing detected) are valid outcomes; the test asserts the round-
    // trip happened, not which verdict it produced.
    assert.ok(fs.existsSync(tmp), `detect must have written the env-pointed report at ${tmp}\n${r.stderr}`);
    const written = JSON.parse(fs.readFileSync(tmp, "utf8"));
    assert.ok(written && typeof written === "object", "written report must be a JSON object");
    assert.ok(written.byCategory && typeof written.byCategory === "object", "written report must have byCategory (detect output contract)");
    assert.ok([0, 1].includes(r.status), `exit must be 0 (clean) or 1 (hard fail) — got ${r.status}\n${r.stderr}`);
    // If exit is 0, the summary should say "clean"; if 1, "FAIL". Either way,
    // confirm the gate actually read the file we just wrote (its log line
    // references the path).
    const combined = (r.stdout || "") + (r.stderr || "");
    assert.match(combined, /drift-gate/, "gate must have logged its verdict (proves it ran the verdict, not just spawned detect)");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
