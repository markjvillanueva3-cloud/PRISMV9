/**
 * Tests for scripts/lib/wiki-domain-classifier.mjs (U-VICTOR-A1).
 *
 * Real cases drawn from actual paths in the repo as of 2026-05-27. No stubs.
 * Karpathy R9: every assertion encodes intent (naming-split, priority order,
 * empty input, false-positive guard).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyDomain, domainSlugs, classifyAll } from "./wiki-domain-classifier.mjs";

// ============================================================================
// Happy path — one representative path per domain
// ============================================================================

const HAPPY_CASES = [
  // [path, expectedDomain]
  ["architecture/dispatcher-mill.md", "mill"],
  ["architecture/engines/mill/MillingForceEngine.md", "mill"],
  ["architecture/dispatcher-lathe.md", "lathe"],
  ["engines/lathe/LatheTurningEngine.md", "lathe"],
  ["architecture/wedm-jm-die.md", "wedm"],
  ["concepts/wire-edm-pcd.md", "wedm"], // naming-split consolidation
  ["architecture/dispatcher-cad.md", "cad"],
  ["architecture/dispatcher-cam.md", "cam"],
  ["engines/cam/MastercamPostEngine.md", "cam"],
  ["engines/cam/hypermill-strategy.md", "cam"],
  ["architecture/post-processor-arch.md", "post-processor"],
  ["concepts/postproc-dialect.md", "post-processor"],
  ["architecture/speed-feed-calculator.md", "sfc"],
  ["sfc-quick-start.md", "sfc"],
  ["architecture/dispatcher-quoting.md", "quoting"],
  ["concepts/shop-floor-tablet.md", "shop-floor"],
  ["concepts/machinelive-status.md", "shop-floor"],
  ["architecture/traveler-routing.md", "shop-floor"],
  ["architecture/business-quickbooks-connector.md", "accounting"], // QBO → accounting
  ["concepts/qbo-invoice-sync.md", "accounting"],
  ["concepts/file-digest-redistribution.md", "file-digest"],
  ["concepts/evernote-ingest.md", "file-digest"],
  ["architecture/scheduling-engine.md", "scheduling"],
  ["concepts/hr-employee-onboard.md", "hr"],
  ["architecture/dispatcher-erp.md", "erp"],
  ["concepts/e2-erp-sync.md", "erp"],
  ["architecture/payroll-engine.md", "payroll"],
  ["concepts/logistics-shipping.md", "logistics"],
  ["concepts/audit-trail.md", "audit"],
  ["compliance/osha-1910.md", "osha"],
  ["compliance/iso-9001-cert.md", "iso"],
  ["concepts/iso-12100-machine-guarding.md", "iso"],
  ["operations/purchasing-po.md", "purchasing"],
  ["operations/maintenance-pm-task.md", "maintenance"],
  ["concepts/controller-alarm-fanuc.md", "alarm"],
  ["concepts/troubleshoot-spindle-stall.md", "troubleshoot"],
  ["architecture/business-overview.md", "business"],
];

for (const [pathStr, expected] of HAPPY_CASES) {
  test(`classifyDomain("${pathStr}") = ${expected}`, () => {
    assert.equal(classifyDomain(pathStr), expected);
  });
}

// ============================================================================
// Naming-split conflict resolution (R7 — surface conflicts, don't average)
// ============================================================================

test("wire-edm/wedm naming split consolidates to wedm", () => {
  assert.equal(classifyDomain("concepts/wire-edm-feasibility.md"), "wedm");
  assert.equal(classifyDomain("engines/wedm/WireEDMPathfinder.md"), "wedm");
  assert.equal(classifyDomain("wireedm-mcx-wmd-catalog.md"), "wedm");
});

test("speed-feed/sfc/speedfeed all resolve to sfc", () => {
  assert.equal(classifyDomain("sfc-quick-start.md"), "sfc");
  assert.equal(classifyDomain("speed-feed-calculator.md"), "sfc");
  assert.equal(classifyDomain("speedfeed-physics.md"), "sfc");
});

test("quickbooks subsumed under accounting", () => {
  assert.equal(classifyDomain("business-quickbooks-connector.md"), "accounting");
  assert.equal(classifyDomain("qbo-invoice-sync.md"), "accounting");
});

test("e2/erp both resolve to erp", () => {
  assert.equal(classifyDomain("e2-erp-sync.md"), "erp");
  assert.equal(classifyDomain("dispatcher-erp.md"), "erp");
});

// ============================================================================
// Priority order — specific beats generic
// ============================================================================

test("mill galaxy paths classify as mill (not unclassified)", () => {
  assert.equal(classifyDomain("engines/mill/MillingPhysicsKernelEngine.md"), "mill");
  assert.equal(classifyDomain("mill-engine-bridge.md"), "mill");
});

test("file-digest beats generic file-* (no false-positive)", () => {
  assert.equal(classifyDomain("file-digest-redistribution.md"), "file-digest");
});

test("hypermill is cam not mill (specific cam pattern wins)", () => {
  // Why: hypermill is a CAM product. mill RULE only matches `/mill/`, `milling`,
  // `/mill-`, `mill-engine`, `/mill.`, `millingdomain` — none of which match
  // "hypermill-strategy.md", so the cam RULE (which has "hypermill") wins.
  assert.equal(classifyDomain("engines/cam/hypermill-strategy.md"), "cam");
});

// ============================================================================
// Empty / null / pathological input
// ============================================================================

test("empty string → _unclassified", () => {
  assert.equal(classifyDomain(""), "_unclassified");
});

test("null/undefined/non-string → _unclassified", () => {
  assert.equal(classifyDomain(null), "_unclassified");
  assert.equal(classifyDomain(undefined), "_unclassified");
  assert.equal(classifyDomain(42), "_unclassified");
  assert.equal(classifyDomain({}), "_unclassified");
});

test("path with no domain keywords → _unclassified", () => {
  assert.equal(classifyDomain("README.md"), "_unclassified");
  assert.equal(classifyDomain("concepts/abstract-concept.md"), "_unclassified");
});

// ============================================================================
// domainSlugs / classifyAll
// ============================================================================

test("domainSlugs includes _unclassified and is non-empty", () => {
  const slugs = domainSlugs();
  assert.ok(slugs.length >= 23, `expected ≥23 slugs, got ${slugs.length}`);
  assert.ok(slugs.includes("_unclassified"));
  assert.ok(slugs.includes("mill"));
  assert.ok(slugs.includes("wedm"));
  assert.ok(slugs.includes("logistics"));
});

test("classifyAll returns full slug set every time (byte-determinism)", () => {
  const out = classifyAll([
    "engines/mill/x.md",
    "engines/cad/y.md",
    "concepts/wire-edm-a.md",
  ]);
  // Every slug present in output
  for (const s of domainSlugs()) assert.ok(s in out, `missing slug ${s}`);
  assert.equal(out.mill, 1);
  assert.equal(out.cad, 1);
  assert.equal(out.wedm, 1);
});

test("classifyAll handles empty input and non-array gracefully", () => {
  const empty = classifyAll([]);
  for (const s of domainSlugs()) assert.equal(empty[s], 0);
  const notArr = classifyAll(null);
  for (const s of domainSlugs()) assert.equal(notArr[s], 0);
});
