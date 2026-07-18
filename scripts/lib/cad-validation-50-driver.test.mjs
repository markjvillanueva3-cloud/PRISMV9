/**
 * cad-validation-50-driver.test.mjs -- R9 tests for the validation-50 driver.
 * Run: node scripts/lib/cad-validation-50-driver.test.mjs   (node:test auto-runs on exit)
 * Hermetic: the I/O wrapper is exercised via injected deps (no tsx, no real engines, no file writes).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  clampGate, parseArgs, decideArtifact, summarizeDomains, buildResultJson, runValidation50, inferDomain,
  isGateProbedPath, VALIDATION_TARGET_CASES, SPECS_DIR, BASELINE_DIR, MILESTONE,
} from "./cad-validation-50-driver.mjs";

// helper: a ValidationReport-shaped object
const mkReport = ({ passed, total, gate = 0.7, cases = null, iso = "2026-06-27T00:00:00.000Z" }) => ({
  cases: cases ?? Array.from({ length: total }, (_, i) => ({
    id: `C${i}`, domain: ["mill", "lathe", "wedm"][i % 3], verdict: i < passed ? "pass" : "fail",
    exported: i < passed, iterations: 1, stopReason: i < passed ? "exported" : "decoder-null", reason: "x",
  })),
  passedCount: passed, failedCount: total - passed, totalCount: total,
  accuracy: total === 0 ? 0 : passed / total, gate, passedGate: total > 0 && (passed / total) >= gate,
  ranAtIso: iso,
});

// ---- clampGate ----
test("clampGate: valid passthrough + clamp + non-finite fallback", () => {
  assert.equal(clampGate(0.7), 0.7);
  assert.equal(clampGate(1.5), 1.0, "above-range clamps to 1");
  assert.equal(clampGate(-0.2), 0.0, "below-range clamps to 0");
  assert.equal(clampGate(NaN), 0.7, "NaN -> default");
  assert.equal(clampGate(null), 0.7, "null -> default");
  assert.equal(clampGate(undefined, 0.9), 0.9, "custom default");
});

// ---- parseArgs ----
test("parseArgs: defaults + valid + invalid normalization", () => {
  const d = parseArgs([]);
  assert.equal(d.orchestrator, "live");
  assert.equal(d.domain, "all");
  assert.equal(d.gate, 0.7);
  assert.equal(d.target, VALIDATION_TARGET_CASES);
  assert.equal(d.stdout, false);

  const v = parseArgs(["--orchestrator", "mock", "--domain", "mill", "--gate", "0.8", "--json", "--target", "30"]);
  assert.equal(v.orchestrator, "mock");
  assert.equal(v.domain, "mill");
  assert.equal(v.gate, 0.8);
  assert.equal(v.stdout, true);
  assert.equal(v.target, 30);

  // invalid orchestrator/domain normalize to safe defaults (R12: no silent garbage-through)
  const bad = parseArgs(["--orchestrator", "evil", "--domain", "xyz"]);
  assert.equal(bad.orchestrator, "live");
  assert.equal(bad.domain, "all");
});

// ---- decideArtifact: THE honesty gate (happy + >=3 failure + adversarial) ----
test("decideArtifact HAPPY: live + full + passedGate -> gate-eligible, specs dir, probed name", () => {
  const report = mkReport({ passed: 48, total: 50, gate: 0.7 });
  const d = decideArtifact({ report, orchestrator: "live", corpusSize: 50, target: 50 });
  assert.equal(d.gateEligible, true);
  assert.equal(d.dir, SPECS_DIR);
  assert.match(d.fileName, /^cad-validation-50-.*\.json$/, "probed filename that flips T2");
});

test("decideArtifact FAIL-1 (stub masquerade): stub + full + passed -> NOT eligible, baseline name", () => {
  const report = mkReport({ passed: 50, total: 50, gate: 0.7 });
  const d = decideArtifact({ report, orchestrator: "stub", corpusSize: 50, target: 50 });
  assert.equal(d.gateEligible, false, "stub can never flip the gate");
  assert.equal(d.dir, BASELINE_DIR);
  assert.match(d.fileName, new RegExp(`^${MILESTONE}-BASELINE-.*\\.json$`));
  assert.match(d.reason, /not live/);
});

test("decideArtifact FAIL-2 (count-lie guard): live + 12<50 + passed -> NOT eligible (not full)", () => {
  const report = mkReport({ passed: 12, total: 12, gate: 0.7 });
  const d = decideArtifact({ report, orchestrator: "live", corpusSize: 12, target: 50 });
  assert.equal(d.gateEligible, false, "12 cases is not the 50-case gate");
  assert.match(d.reason, /12<50/);
});

test("decideArtifact FAIL-3 (below gate): live + full + !passedGate -> NOT eligible", () => {
  const report = mkReport({ passed: 20, total: 50, gate: 0.7 }); // 40% < 70%
  assert.equal(report.passedGate, false);
  const d = decideArtifact({ report, orchestrator: "live", corpusSize: 50, target: 50 });
  assert.equal(d.gateEligible, false);
  assert.match(d.reason, /below gate/);
});

test("decideArtifact ADVERSARIAL (mock masquerade): mock + full + passed -> NOT eligible", () => {
  const report = mkReport({ passed: 50, total: 50, gate: 0.7 });
  const d = decideArtifact({ report, orchestrator: "mock", corpusSize: 50, target: 50 });
  assert.equal(d.gateEligible, false, "mock seat is not a real measurement");
});

// ---- inferDomain ----
test("inferDomain: id-prefix -> domain, unknown fallback", () => {
  assert.equal(inferDomain("MILL-001"), "mill");
  assert.equal(inferDomain("LATHE-003"), "lathe");
  assert.equal(inferDomain("WEDM-004"), "wedm");
  assert.equal(inferDomain("WIRE-009"), "wedm");
  assert.equal(inferDomain("FOO-1"), "unknown");
  assert.equal(inferDomain(undefined), "unknown");
});

test("buildResultJson: perDomain resolves via id-prefix when verdicts lack a domain field", () => {
  const cases = [
    { id: "MILL-001", verdict: "pass", exported: true, iterations: 1, stopReason: "exported", reason: "ok" },
    { id: "MILL-002", verdict: "fail", exported: false, iterations: 0, stopReason: "decoder-null", reason: "no" },
    { id: "LATHE-001", verdict: "pass", exported: true, iterations: 1, stopReason: "exported", reason: "ok" },
  ];
  const report = mkReport({ passed: 2, total: 3, gate: 0.7, cases });
  const j = buildResultJson(report, { orchestrator: "stub", corpusSize: 12, target: 50, gateEligible: false });
  assert.equal(j.perDomain.mill.total, 2, "domain inferred from MILL- prefix");
  assert.equal(j.perDomain.mill.passed, 1);
  assert.equal(j.perDomain.lathe.accuracy, 1);
  assert.equal(j.verdicts[0].domain, "mill");
  assert.equal(j.perDomain.unknown, undefined, "no unknown bucket when all ids are prefixed");
});

// ---- summarizeDomains ----
test("summarizeDomains: per-domain rollup + empty", () => {
  const verdicts = [
    { domain: "mill", verdict: "pass" }, { domain: "mill", verdict: "fail" },
    { domain: "lathe", verdict: "pass" },
  ];
  const s = summarizeDomains(verdicts);
  assert.equal(s.mill.total, 2);
  assert.equal(s.mill.passed, 1);
  assert.equal(s.mill.accuracy, 0.5);
  assert.equal(s.lathe.accuracy, 1);
  assert.deepEqual(summarizeDomains([]), {});
});

// ---- buildResultJson ----
test("buildResultJson: mirrors report, isFull false at 12, errored from exception, gameableGate stamp", () => {
  const cases = [
    { id: "A", domain: "mill", verdict: "pass", exported: true, iterations: 2, stopReason: "exported", reason: "ok" },
    { id: "B", domain: "lathe", verdict: "fail", exported: false, iterations: 0, stopReason: "exception", reason: "threw", error: "boom" },
  ];
  const report = mkReport({ passed: 1, total: 2, gate: 0.7, cases });
  const j = buildResultJson(report, { orchestrator: "mock", corpusSize: 12, target: 50, corpusVersion: "1.0.0", gateEligible: false });
  assert.equal(j.corpus.size, 12);
  assert.equal(j.corpus.isFull, false, "12 < 50 -> never claim full (R12 / ALL-means-ALL)");
  assert.equal(j.corpus.target, 50);
  assert.equal(j.totals.errored, 1, "exception stopReason counts as errored");
  assert.equal(j.totals.total, 2);
  assert.equal(j.gameableGate, false, "structural anti-gaming stamp always present");
  assert.equal(j.gateEligible, false);
  assert.equal(j.verdicts.length, 2);
  assert.equal(j.verdicts[1].error, "boom");
  assert.equal(j.schemaVersion, 1);
});

// ---- runValidation50 (hermetic via injected deps; stdout:true => no file write) ----
function fakeHarness() {
  // a minimal real-behavior harness: runs the injected orchestrator over each case, binary export rubric
  return {
    validate: async (cases, opts) => {
      const verdicts = [];
      for (const tc of cases) {
        try {
          const r = await opts.orchestrator.drawAnyPart(tc.input);
          verdicts.push({ id: tc.id, domain: tc.domain, verdict: r.exportedSuccessfully ? "pass" : "fail", exported: r.exportedSuccessfully, iterations: r.iterations, stopReason: r.stopReason, reason: "x" });
        } catch (e) {
          verdicts.push({ id: tc.id, domain: tc.domain, verdict: "fail", exported: false, iterations: 0, stopReason: "exception", reason: String(e), error: String(e) });
        }
      }
      const passed = verdicts.filter((v) => v.verdict === "pass").length;
      const total = verdicts.length;
      const gate = opts.gate ?? 0.7;
      return { cases: verdicts, passedCount: passed, failedCount: total - passed, totalCount: total, accuracy: total ? passed / total : 0, gate, passedGate: total > 0 && passed / total >= gate, ranAtIso: "2026-06-27T00:00:00.000Z" };
    },
  };
}
const mkCases = (n, dom = ["mill", "lathe", "wedm"]) => Array.from({ length: n }, (_, i) => ({ id: `K${i}`, domain: dom[i % dom.length], input: { intent: `case ${i}` } }));

test("runValidation50 HAPPY (live + 50 all-export): gate-eligible, isFull, no write under stdout", async () => {
  const j = await runValidation50(
    { orchestrator: "live", gate: 0.7, target: 50, stdout: true },
    {
      loadCorpus: async () => ({ cases: mkCases(50), version: "1.0.0" }),
      loadHarness: async () => fakeHarness(),
      resolveOrchestrator: async () => ({ drawAnyPart: async () => ({ exportedSuccessfully: true, stopReason: "exported", iterations: 1, opLog: ["x"] }) }),
    },
  );
  assert.equal(j.accuracy, 1);
  assert.equal(j.passedGate, true);
  assert.equal(j.corpus.isFull, true);
  assert.equal(j.gateEligible, true, "live + full + passed is the only gate-eligible combo");
  assert.equal(j.__writtenTo, undefined, "stdout mode writes nothing");
});

test("runValidation50 COUNT-LIE (live + 12 cases): not full, not gate-eligible", async () => {
  const j = await runValidation50(
    { orchestrator: "live", gate: 0.7, target: 50, stdout: true },
    {
      loadCorpus: async () => ({ cases: mkCases(12), version: "1.0.0" }),
      loadHarness: async () => fakeHarness(),
      resolveOrchestrator: async () => ({ drawAnyPart: async () => ({ exportedSuccessfully: true, stopReason: "exported", iterations: 1, opLog: ["x"] }) }),
    },
  );
  assert.equal(j.corpus.size, 12);
  assert.equal(j.corpus.isFull, false);
  assert.equal(j.gateEligible, false, "12-case live run must NOT flip the gate");
});

test("runValidation50 FAILURE (orchestrator throws on a case): errored counted, no crash", async () => {
  let n = 0;
  const j = await runValidation50(
    { orchestrator: "live", gate: 0.7, target: 3, stdout: true },
    {
      loadCorpus: async () => ({ cases: mkCases(3), version: "1.0.0" }),
      loadHarness: async () => fakeHarness(),
      resolveOrchestrator: async () => ({ drawAnyPart: async () => { if (n++ === 1) throw new Error("seat down"); return { exportedSuccessfully: true, stopReason: "exported", iterations: 1, opLog: ["x"] }; } }),
    },
  );
  assert.equal(j.totals.errored, 1, "one thrown case is recorded as errored, run continues");
  assert.equal(j.totals.total, 3);
});

test("runValidation50 ADVERSARIAL (corpus not array): fail-loud TypeError", async () => {
  await assert.rejects(
    () => runValidation50({ orchestrator: "live", stdout: true }, { loadCorpus: async () => ({ cases: "not-an-array" }), loadHarness: async () => fakeHarness(), resolveOrchestrator: async () => ({ drawAnyPart: async () => ({}) }) }),
    /did not return an array/,
  );
});

// ---- isGateProbedPath ----
test("isGateProbedPath: only the reconciler's probe fragments match", () => {
  assert.equal(isGateProbedPath("state/shared/specs/cad-validation-50-x.json"), true);
  assert.equal(isGateProbedPath("foo/cad-train-test-result-y.json"), true);
  assert.equal(isGateProbedPath("state/shared/CAD-DRAW-MAX-MS1-BASELINE-z.json"), false, "baseline name is NOT gate-probed");
  assert.equal(isGateProbedPath("cad-validation-50-x.txt"), false, "non-json not probed");
  assert.equal(isGateProbedPath(undefined), false);
});

// ---- P0 REGRESSION: --out cannot game the existence-only gate ----
test("runValidation50 P0: --out to a gate-probed path from a non-gate-worthy run is OVERRIDDEN (no gaming)", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "val50-"));
  try {
    const gamedRel = "state/shared/specs/cad-validation-50-GAMED.json";
    const j = await runValidation50(
      { orchestrator: "stub", gate: 0.7, target: 50, out: gamedRel, repoRoot }, // stub + 12 cases => NOT gate-worthy
      {
        loadCorpus: async () => ({ cases: mkCases(12), version: "1.0.0" }),
        loadHarness: async () => fakeHarness(),
        resolveOrchestrator: async () => ({ drawAnyPart: async () => ({ exportedSuccessfully: true, stopReason: "exported", iterations: 1, opLog: ["x"] }) }),
      },
    );
    assert.equal(j.gateEligible, false);
    assert.ok(j.__outOverridden, "the override must be recorded (R12 loud)");
    // The gate-probed file must NOT exist; the honest baseline file MUST exist.
    assert.equal(fs.existsSync(path.join(repoRoot, gamedRel)), false, "gate-probed filename was NOT written (gaming blocked)");
    assert.match(j.__writtenTo, new RegExp(`${MILESTONE}-BASELINE-.*\\.json$`), "fell back to the honest baseline name");
    assert.equal(isGateProbedPath(j.__writtenTo), false, "the actual artifact is not gate-probed");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("runValidation50: --out to a NON-probed path is honored (writes exactly there)", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "val50-"));
  try {
    const rel = "state/shared/my-baseline.json";
    const j = await runValidation50(
      { orchestrator: "stub", gate: 0.7, target: 50, out: rel, repoRoot },
      {
        loadCorpus: async () => ({ cases: mkCases(12), version: "1.0.0" }),
        loadHarness: async () => fakeHarness(),
        resolveOrchestrator: async () => ({ drawAnyPart: async () => ({ exportedSuccessfully: true, stopReason: "exported", iterations: 1, opLog: ["x"] }) }),
      },
    );
    assert.equal(j.__outOverridden, undefined, "non-probed --out is not overridden");
    assert.equal(fs.existsSync(path.join(repoRoot, rel)), true, "wrote to the requested non-probed path");
    assert.equal(j.__writtenTo, rel);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("runValidation50 P2 (containment): --out path-traversal escaping repoRoot is redirected in-repo", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "val50-"));
  const escapeProbe = path.join(repoRoot, "..", "val50-ESCAPED.json"); // sibling of repoRoot (outside)
  try {
    const j = await runValidation50(
      { orchestrator: "stub", gate: 0.7, target: 50, out: "../val50-ESCAPED.json", repoRoot },
      {
        loadCorpus: async () => ({ cases: mkCases(12), version: "1.0.0" }),
        loadHarness: async () => fakeHarness(),
        resolveOrchestrator: async () => ({ drawAnyPart: async () => ({ exportedSuccessfully: true, stopReason: "exported", iterations: 1, opLog: ["x"] }) }),
      },
    );
    assert.ok(j.__outOverridden, "escape must be recorded");
    assert.match(j.__outOverridden, /escaped repoRoot/);
    assert.equal(fs.existsSync(escapeProbe), false, "nothing written outside repoRoot");
    // the actual write stayed inside repoRoot
    assert.equal(fs.existsSync(path.join(repoRoot, j.__writtenTo)), true, "artifact landed inside repoRoot");
    assert.match(j.__writtenTo, new RegExp(`${MILESTONE}-BASELINE-.*\\.json$`));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
    try { fs.rmSync(escapeProbe, { force: true }); } catch { /* never created */ }
  }
});
