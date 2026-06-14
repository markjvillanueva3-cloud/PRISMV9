/**
 * classify-engine-reachability.test.mjs — real-data E2E for the romeo wiring classifier.
 *
 * Per the RGS-TOOL-AUTOINVOKE lesson ("hermetic fakes do not prove production wiring;
 * ship one real-data E2E"), this runs the ACTUAL script against the LIVE engine + dispatcher
 * tree and asserts the four verdict classes on cases ground-truth-verified by grep:
 *
 *   ExpandingMandrelEngine            -> CAPABILITY_WIRED_ELSEWHERE
 *       (no class wire, but turningDispatcher wires latheWorkholdingEngine.calculateExpandingMandrel
 *        / action lathe_workholding_expanding_mandrel — the root "ExpandingMandrel" is in a dispatcher)
 *   CatalogRegistryBridgeEngine       -> DIRECT_WIRED          (dispatcher references the class)
 *   MonolithSurfaceFinishDatabaseEngine -> AGGREGATOR_REACHABLE (via CatalogUnifiedQueryEngine.query().search())
 *   ZZZNonexistentPhantomEngine       -> PHANTOM_NAME          (deterministic: no such file on disk)
 *
 * The first three guard the three reachability detectors that the system-viz ghost.unwired
 * classifier LACKS (and that this tool exists to provide). The phantom case is deterministic.
 *
 * @milestone BLACKWELL-DB-GEN-MS0  @unit U-CLASSIFIER-AWARE-HUNT  @slot romeo
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./classify-engine-reachability.mjs", import.meta.url));
const REPO = path.resolve(path.dirname(SCRIPT), "..");

function runClassifier(names) {
  const dir = mkdtempSync(path.join(tmpdir(), "reachclass-"));
  const out = path.join(dir, "result.json");
  try {
    execFileSync(process.execPath, [SCRIPT, ...names, `--out=${out}`, "--json"], {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 120_000,
    });
    const artifact = JSON.parse(readFileSync(out, "utf8"));
    return artifact;
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

test("classifier round-trips the four verdict classes on live tree (real-data E2E)", () => {
  const names = [
    "ExpandingMandrelEngine",
    "CatalogRegistryBridgeEngine",
    "MonolithSurfaceFinishDatabaseEngine",
    "ZZZNonexistentPhantomEngine",
  ];
  const artifact = runClassifier(names);
  assert.equal(artifact.candidateCount, 4, "all four candidates classified");
  assert.ok(artifact.engineFilesScanned > 1000, "scanned the real engine tree (not a stub)");
  assert.ok(artifact.dispatcherFilesScanned > 10, "scanned the real dispatcher tree");

  const verdict = (n) => artifact.results.find((r) => r.name === n)?.verdict;

  // PHANTOM is deterministic — a fabricated name can never have an engine file.
  assert.equal(verdict("ZZZNonexistentPhantomEngine"), "PHANTOM_NAME");

  // The three reachability detectors the ghost.unwired classifier lacks:
  assert.equal(verdict("ExpandingMandrelEngine"), "CAPABILITY_WIRED_ELSEWHERE",
    "capability wired under a different name must NOT read as a genuine orphan (duplicate-wire guard)");
  assert.equal(verdict("CatalogRegistryBridgeEngine"), "DIRECT_WIRED",
    "a directly-wired engine is a FALSE ghost.unwired");
  assert.equal(verdict("MonolithSurfaceFinishDatabaseEngine"), "AGGREGATOR_REACHABLE",
    "an aggregator-reachable engine is a FALSE ghost.unwired");
});

test("a fabricated genuine-looking name with a real wrapper is never GENUINE_ORPHAN", () => {
  // Anti-false-negative: the dangerous direction is mis-labeling a reachable engine GENUINE
  // (leads to duplicate wiring). Re-assert ExpandingMandrel is NOT genuine.
  const artifact = runClassifier(["ExpandingMandrelEngine"]);
  const r = artifact.results[0];
  assert.notEqual(r.verdict, "GENUINE_ORPHAN");
  assert.equal(r.capabilityRoot, "ExpandingMandrel");
});
