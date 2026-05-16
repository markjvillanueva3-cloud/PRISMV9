/**
 * groundTruthValidationEngine.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT09
 *
 * Validates per-bundle integrity checks, quarantine list construction,
 * issue-code coverage, and report persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  GroundTruthValidationEngine,
  groundTruthValidationEngine,
  ValidationReportSchema,
  ISSUE_CODES,
  CANONICAL_SCREENSHOT_VIEWS,
  pickGroundTruthScalar,
  extractionMatches,
  computeConformalCoverage,
  type BundleValidation,
  type ExtractionTrainingPair,
  type BackendValidationResult,
} from "../engines/GroundTruthValidationEngine.js";

let engine: GroundTruthValidationEngine;
let tmpRoot: string;

beforeEach(() => {
  engine = new GroundTruthValidationEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt09-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ── Fixture builders ───────────────────────────────────────────────────────

interface BundleOpts {
  fileId: string;
  status?: "ok" | "partial" | "failed" | "skipped";
  withStep?: boolean;
  stepText?: string;
  withFeatureTree?: boolean;
  featureCount?: number;
  withDimSig?: boolean;
  envelopeM?: number;
  cartesianPoints?: number;
  injectNaN?: boolean;
  withScreenshots?: number; // count of canonical views to write (0..6)
  malformedBundleJson?: boolean;
  missingBundleJson?: boolean;
}

function writeBundle(rootDir: string, opts: BundleOpts): string {
  const fileId = opts.fileId;
  const dir = path.join(rootDir, fileId);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "screenshots"), { recursive: true });

  if (!opts.missingBundleJson) {
    if (opts.malformedBundleJson) {
      fs.writeFileSync(path.join(dir, "bundle.json"), "this is not json");
    } else {
      const bundle = {
        fileId,
        sourcePath: `H:/PRISM/JM DIE/CNC LATHE/ALCOA/${fileId}.MIN`,
        format: ".MIN",
        bundleDir: dir,
        status: opts.status ?? "ok",
        stages: {
          step: { ok: opts.withStep !== false },
          featureTree: { ok: opts.withFeatureTree !== false },
          dimensionalSig: { ok: opts.withDimSig !== false },
          screenshots: { ok: (opts.withScreenshots ?? 6) === 6 },
        },
      };
      fs.writeFileSync(path.join(dir, "bundle.json"), JSON.stringify(bundle));
    }
  }

  if (opts.withStep !== false) {
    const stepText =
      opts.stepText ??
      "ISO-10303-21;\nDATA;\nCARTESIAN_POINT('p',(0,0,0));\nENDSEC;\nEND-ISO-10303-21;\n";
    fs.writeFileSync(path.join(dir, "source.step"), stepText);
  }

  if (opts.withFeatureTree !== false) {
    const fc = opts.featureCount ?? 3;
    const features = Array.from({ length: fc }, (_, i) => ({
      id: `f${i}`,
      type: "Body",
      name: `f${i}`,
    }));
    fs.writeFileSync(
      path.join(dir, "feature-tree.json"),
      JSON.stringify({ features }),
    );
  }

  if (opts.withDimSig !== false) {
    const env = opts.envelopeM ?? 0.05;
    const ext = opts.injectNaN ? [Number.NaN, 0.03, 0.02] : [env, 0.03, 0.02];
    const sig = {
      schemaVersion: "1.0.0",
      sourceFile: "/x.step",
      unitSystem: "SI",
      sourceLengthUnit: "mm",
      bbox: { min: [0, 0, 0], max: ext, extent: ext },
      envelopeM: opts.injectNaN ? Number.NaN : env,
      volumeBboxM3: 0.001,
      surfaceAreaM2: 0.01,
      com: [0.025, 0.015, 0.01],
      moiAABB: { Ixx: 0, Iyy: 0, Izz: 0 },
      holes: [],
      counts: {
        cartesianPoints: opts.cartesianPoints ?? 8,
        circles: 0,
        lines: 0,
      },
      signature: "d".repeat(64),
      warnings: [],
    };
    fs.writeFileSync(
      path.join(dir, "dimensional-signature.json"),
      JSON.stringify(sig),
    );
  }

  const views = CANONICAL_SCREENSHOT_VIEWS;
  const writeCount = opts.withScreenshots ?? views.length;
  for (let i = 0; i < writeCount; i++) {
    const view = views[i]!;
    fs.writeFileSync(
      path.join(dir, "screenshots", `${view}.png`),
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
  }
  return dir;
}

function findIssue(
  v: BundleValidation,
  code: (typeof ISSUE_CODES)[number],
): boolean {
  return v.issues.some((i) => i.code === code);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GroundTruthValidationEngine — singleton + vocab", () => {
  it("singleton schemaVersion is 1.0.0 and matches fresh instance", () => {
    expect(groundTruthValidationEngine.schemaVersion).toBe("1.0.0");
    expect(groundTruthValidationEngine.schemaVersion).toBe(engine.schemaVersion);
  });

  it("listIssueCodes returns all 14 documented codes", () => {
    const codes = engine.listIssueCodes();
    expect(codes.length).toBe(14);
    expect(codes).toContain("bundle-json-missing");
    expect(codes).toContain("step-not-iso-10303");
    expect(codes).toContain("dim-signature-zero-envelope");
    expect(codes).toContain("dim-signature-nan");
    expect(codes).toContain("screenshot-missing");
  });
});

describe("validateBundle — per-bundle checks", () => {
  it("clean bundle produces zero issues, quarantined=false", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1" });
    const v = engine.validateBundle(dir, "P1");
    expect(v.quarantined).toBe(false);
    expect(v.issues.length).toBe(0);
    expect(v.status).toBe("ok");
  });

  it("missing bundle.json → quarantined with bundle-json-missing", () => {
    const dir = path.join(tmpRoot, "X");
    fs.mkdirSync(dir, { recursive: true });
    const v = engine.validateBundle(dir, "X");
    expect(v.quarantined).toBe(true);
    expect(findIssue(v, "bundle-json-missing")).toBe(true);
    expect(v.status).toBe("missing-bundle");
  });

  it("malformed bundle.json → bundle-json-parse-error", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", malformedBundleJson: true });
    const v = engine.validateBundle(dir, "P1");
    expect(v.quarantined).toBe(true);
    expect(findIssue(v, "bundle-json-parse-error")).toBe(true);
  });

  it("status=failed short-circuits to bundle-status-failed", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", status: "failed" });
    const v = engine.validateBundle(dir, "P1");
    expect(v.quarantined).toBe(true);
    expect(findIssue(v, "bundle-status-failed")).toBe(true);
    // No artifact checks should run for failed bundles
    expect(v.issues.length).toBe(1);
  });

  it("missing source.step → step-missing", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", withStep: false });
    const v = engine.validateBundle(dir, "P1");
    expect(findIssue(v, "step-missing")).toBe(true);
  });

  it("source.step lacking ISO-10303-21 magic → step-not-iso-10303", () => {
    const dir = writeBundle(tmpRoot, {
      fileId: "P1",
      stepText: "this is not a valid STEP file",
    });
    const v = engine.validateBundle(dir, "P1");
    expect(findIssue(v, "step-not-iso-10303")).toBe(true);
  });

  it("zero-feature feature-tree → feature-tree-empty", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", featureCount: 0 });
    const v = engine.validateBundle(dir, "P1");
    expect(findIssue(v, "feature-tree-empty")).toBe(true);
  });

  it("missing feature-tree.json → feature-tree-missing", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", withFeatureTree: false });
    const v = engine.validateBundle(dir, "P1");
    expect(findIssue(v, "feature-tree-missing")).toBe(true);
  });

  it("envelopeM=0 with cartesianPoints>0 → dim-signature-zero-envelope", () => {
    const dir = writeBundle(tmpRoot, {
      fileId: "P1",
      envelopeM: 0,
      cartesianPoints: 8,
    });
    const v = engine.validateBundle(dir, "P1");
    expect(findIssue(v, "dim-signature-zero-envelope")).toBe(true);
  });

  it("NaN in dimensional signature → dim-signature-nan", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", injectNaN: true });
    const v = engine.validateBundle(dir, "P1");
    expect(findIssue(v, "dim-signature-nan")).toBe(true);
  });

  it("missing 2 screenshot views → 2 screenshot-missing issues", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", withScreenshots: 4 });
    const v = engine.validateBundle(dir, "P1");
    const missing = v.issues.filter((i) => i.code === "screenshot-missing");
    expect(missing.length).toBe(2);
    // The missing views are the last two (section-xz, section-yz)
    expect(missing[0]?.artifact).toContain("section-xz.png");
    expect(missing[1]?.artifact).toContain("section-yz.png");
  });

  it("skipScreenshots=true suppresses screenshot-missing checks", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", withScreenshots: 0 });
    const v = engine.validateBundle(dir, "P1", { skipScreenshots: true });
    const screenshotIssues = v.issues.filter(
      (i) => i.code === "screenshot-missing",
    );
    expect(screenshotIssues.length).toBe(0);
  });

  it("partial status quarantines only when quarantinePartialStatus=true", () => {
    const dir = writeBundle(tmpRoot, { fileId: "P1", status: "partial" });
    const lenient = engine.validateBundle(dir, "P1");
    expect(lenient.quarantined).toBe(false);
    const strict = engine.validateBundle(dir, "P1", {
      quarantinePartialStatus: true,
    });
    expect(strict.quarantined).toBe(true);
  });
});

describe("validateCorpus — corpus walk", () => {
  it("clean 5-bundle corpus → ok=5, quarantined=0, byCode empty", () => {
    for (let i = 0; i < 5; i++) {
      writeBundle(tmpRoot, { fileId: `OK-${i}` });
    }
    const r = engine.validateCorpus(tmpRoot);
    expect(r.total).toBe(5);
    expect(r.ok).toBe(5);
    expect(r.quarantined).toBe(0);
    expect(Object.keys(r.byCode).length).toBe(0);
    expect(r.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("aggregates byCode counts across multiple bundles", () => {
    writeBundle(tmpRoot, { fileId: "A", withStep: false });
    writeBundle(tmpRoot, { fileId: "B", withStep: false });
    writeBundle(tmpRoot, { fileId: "C", featureCount: 0 });
    writeBundle(tmpRoot, { fileId: "D" });
    const r = engine.validateCorpus(tmpRoot);
    expect(r.total).toBe(4);
    expect(r.ok).toBe(1);
    expect(r.quarantined).toBe(3);
    expect(r.byCode["step-missing"]).toBe(2);
    expect(r.byCode["feature-tree-empty"]).toBe(1);
  });

  it("ignores _underscore-prefixed dirs (checkpoints, indexes)", () => {
    writeBundle(tmpRoot, { fileId: "OK" });
    fs.mkdirSync(path.join(tmpRoot, "_checkpoints"));
    fs.mkdirSync(path.join(tmpRoot, "_index"));
    fs.writeFileSync(path.join(tmpRoot, "_index", "registry.json"), "{}");
    const r = engine.validateCorpus(tmpRoot);
    expect(r.total).toBe(1);
  });

  it("limit option caps the walk", () => {
    for (let i = 0; i < 10; i++) writeBundle(tmpRoot, { fileId: `B-${i}` });
    const r = engine.validateCorpus(tmpRoot, { limit: 3 });
    expect(r.total).toBe(3);
  });

  it("signature is deterministic across two runs of the same corpus", () => {
    writeBundle(tmpRoot, { fileId: "A", withStep: false });
    writeBundle(tmpRoot, { fileId: "B", featureCount: 0 });
    const r1 = engine.validateCorpus(tmpRoot);
    const r2 = engine.validateCorpus(tmpRoot);
    expect(r1.signature).toBe(r2.signature);
    expect(r1.quarantined).toBe(r2.quarantined);
  });

  it("signature changes when a new quarantine reason appears", () => {
    writeBundle(tmpRoot, { fileId: "A" });
    const baseline = engine.validateCorpus(tmpRoot).signature;
    writeBundle(tmpRoot, { fileId: "B", withStep: false });
    const after = engine.validateCorpus(tmpRoot).signature;
    expect(after).not.toBe(baseline);
  });

  it("throws on missing outputRoot, on empty string, and on missing dir", () => {
    expect(() => engine.validateCorpus("")).toThrow(/non-empty string/);
    expect(() =>
      engine.validateCorpus(path.join(tmpRoot, "does-not-exist")),
    ).toThrow(/does not exist/);
  });
});

describe("exportQuarantine + validate", () => {
  it("exportQuarantine writes a Zod-valid manifest atomically", async () => {
    writeBundle(tmpRoot, { fileId: "A", withStep: false });
    writeBundle(tmpRoot, { fileId: "B" });
    const r = engine.validateCorpus(tmpRoot);
    const out = path.join(tmpRoot, "_validation", "quarantine.json");
    await engine.exportQuarantine(r, out);
    expect(fs.existsSync(out)).toBe(true);
    const reloaded = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(ValidationReportSchema.safeParse(reloaded).success).toBe(true);
  });

  it("validate ok=true for fresh report, ok=false for malformed", async () => {
    const r = engine.validateCorpus(tmpRoot);
    expect(engine.validate(r).ok).toBe(true);
    const bad = engine.validate({ schemaVersion: "1.0.0" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(2);
  });

  it("exportQuarantine rejects empty filePath", async () => {
    const r = engine.validateCorpus(tmpRoot);
    await expect(engine.exportQuarantine(r, "")).rejects.toThrow(
      /non-empty/,
    );
  });
});

describe("milestone exit criterion — quarantine rate budget", () => {
  it("100-bundle corpus with 4 corruptions stays under 5% quarantine target", () => {
    for (let i = 0; i < 96; i++) writeBundle(tmpRoot, { fileId: `OK-${i}` });
    writeBundle(tmpRoot, { fileId: "BAD-1", withStep: false });
    writeBundle(tmpRoot, { fileId: "BAD-2", featureCount: 0 });
    writeBundle(tmpRoot, { fileId: "BAD-3", injectNaN: true });
    writeBundle(tmpRoot, { fileId: "BAD-4", malformedBundleJson: true });
    const r = engine.validateCorpus(tmpRoot);
    expect(r.total).toBe(100);
    expect(r.ok).toBe(96);
    expect(r.quarantined).toBe(4);
    expect(r.quarantined / r.total).toBeLessThan(0.05);
    // Walk completes well under the 10-min/20K extrapolation
    expect(r.durationMs).toBeLessThan(2_000);
  });
});

// ── BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U4 extensions ───────────────────────

describe("pickGroundTruthScalar — trust ordering", () => {
  it("prefers operator_correction over all others", () => {
    expect(
      pickGroundTruthScalar({
        operator_correction: "OP",
        erp_actual: "ERP",
        macro_vc_var: "MACRO",
        ocr_inferred: "OCR",
      }),
    ).toBe("OP");
  });
  it("falls back to erp_actual when no operator_correction", () => {
    expect(
      pickGroundTruthScalar({ erp_actual: "ERP", macro_vc_var: "MACRO" }),
    ).toBe("ERP");
  });
  it("falls back to macro_vc_var when only macro present", () => {
    expect(pickGroundTruthScalar({ macro_vc_var: "MACRO" })).toBe("MACRO");
  });
  it("returns null when no provenance has value", () => {
    expect(pickGroundTruthScalar({})).toBe(null);
    expect(pickGroundTruthScalar({ macro_vc_var: undefined })).toBe(null);
  });
  it("rejects empty-string values", () => {
    expect(pickGroundTruthScalar({ erp_actual: "" })).toBe(null);
  });
});

describe("extractionMatches — value comparison", () => {
  it("exact string match", () => {
    expect(extractionMatches("1.000", "1.000")).toBe(true);
  });
  it("case-insensitive string match (after trim)", () => {
    expect(extractionMatches("  ABC  ", "abc")).toBe(true);
  });
  it("numeric format-tolerant match (1.000 == 1.0)", () => {
    expect(extractionMatches("1.000", "1.0")).toBe(true);
    expect(extractionMatches("1.000", "1")).toBe(true);
  });
  it("rejects when both are 0 vs nonzero", () => {
    expect(extractionMatches("0", "0.001")).toBe(false);
  });
  it("accepts zero==zero", () => {
    expect(extractionMatches("0", "0.0")).toBe(true);
  });
  it("rejects different numeric values", () => {
    expect(extractionMatches("1.000", "2.000")).toBe(false);
  });
  it("rejects empty strings", () => {
    expect(extractionMatches("", "1.000")).toBe(false);
    expect(extractionMatches("1.000", "")).toBe(false);
  });
  it("rejects non-string inputs", () => {
    expect(extractionMatches(null as unknown as string, "1")).toBe(false);
    expect(extractionMatches("1", undefined as unknown as string)).toBe(false);
  });
});

describe("computeConformalCoverage", () => {
  it("returns observed=0 + nominal=1-alpha on empty map", () => {
    const result = computeConformalCoverage(new Map(), 0.1);
    expect(result.observed).toBe(0);
    expect(result.nominal).toBe(0.9);
  });
  it("100% coverage when all nonconformity ≤ quantile", () => {
    const m = new Map([
      ["dimension", { total: 4, correct: 4, nonconformity: [0.1, 0.1, 0.1, 0.1] }],
    ]);
    const result = computeConformalCoverage(m, 0.1);
    expect(result.observed).toBe(1);
  });
  it("partial coverage on mixed nonconformity", () => {
    const m = new Map([
      ["dimension", { total: 10, correct: 8, nonconformity: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.9, 0.95] }],
    ]);
    const result = computeConformalCoverage(m, 0.1);
    // qIdx = ceil(0.9 * 10) - 1 = 8; threshold = 0.9 → 9 of 10 covered = 0.9
    expect(result.observed).toBeCloseTo(0.9, 4);
  });
});

describe("validateExtractionBackend (U-MS1-U4)", () => {
  const pairs: ExtractionTrainingPair[] = [
    { pairId: "p1", extractionType: "dimension", groundTruthValues: { erp_actual: "1.000" } },
    { pairId: "p2", extractionType: "dimension", groundTruthValues: { erp_actual: "2.000" } },
    { pairId: "p3", extractionType: "tolerance", groundTruthValues: { macro_vc_var: "0.005" } },
  ];

  it("100% accuracy when backend returns correct values", () => {
    const backend = (p: ExtractionTrainingPair) => ({
      value: pickGroundTruthScalar(p.groundTruthValues) ?? "",
      confidence: 0.95,
    });
    const result = engine.validateExtractionBackend({
      backendId: "perfect",
      trainingPairSetId: "set1",
      pairs,
      backend,
    });
    expect(result.accuracy).toBe(1);
    expect(result.totalPairs).toBe(3);
    expect(result.totalCorrect).toBe(3);
    expect(result.disagreementRegions).toEqual([]);
  });

  it("0% accuracy when backend always wrong; records disagreement regions", () => {
    const backend = () => ({ value: "WRONG", confidence: 0.1 });
    const result = engine.validateExtractionBackend({
      backendId: "broken",
      trainingPairSetId: "set1",
      pairs,
      backend,
    });
    expect(result.accuracy).toBe(0);
    expect(result.disagreementRegions.length).toBe(3);
    expect(result.disagreementRegions[0]?.expected).toBe("1.000");
    expect(result.disagreementRegions[0]?.got).toBe("WRONG");
  });

  it("per-dim-type breakdown reports each extractionType separately", () => {
    const backend = (p: ExtractionTrainingPair) => ({
      value: p.extractionType === "dimension" ? (pickGroundTruthScalar(p.groundTruthValues) ?? "") : "WRONG",
      confidence: 0.9,
    });
    const result = engine.validateExtractionBackend({
      backendId: "partial",
      trainingPairSetId: "set1",
      pairs,
      backend,
    });
    expect(result.perDimTypeBreakdown.dimension?.accuracy).toBe(1);
    expect(result.perDimTypeBreakdown.tolerance?.accuracy).toBe(0);
  });

  it("skips pairs with no ground-truth value (unlabeled)", () => {
    const pairsWithEmpty = [
      ...pairs,
      { pairId: "p4-empty", extractionType: "dimension", groundTruthValues: {} },
    ];
    const backend = (p: ExtractionTrainingPair) => ({
      value: pickGroundTruthScalar(p.groundTruthValues) ?? "noop",
      confidence: 0.9,
    });
    const result = engine.validateExtractionBackend({
      backendId: "skip",
      trainingPairSetId: "set1",
      pairs: pairsWithEmpty,
      backend,
    });
    expect(result.totalPairs).toBe(4); // counted
    expect(result.totalCorrect).toBe(3); // unlabeled doesn't contribute
    expect(result.accuracy).toBeCloseTo(0.75, 4);
  });

  it("conformal coverage reports observed + nominal", () => {
    const backend = (p: ExtractionTrainingPair) => ({
      value: pickGroundTruthScalar(p.groundTruthValues) ?? "",
      confidence: 0.9,
    });
    const result = engine.validateExtractionBackend({
      backendId: "conformal",
      trainingPairSetId: "set1",
      pairs,
      backend,
      conformalAlpha: 0.1,
    });
    expect(result.conformalAlpha).toBe(0.1);
    expect(result.conformalCoverage.nominal).toBe(0.9);
    expect(result.conformalCoverage.observed).toBeGreaterThanOrEqual(0);
    expect(result.conformalCoverage.observed).toBeLessThanOrEqual(1);
  });

  it("rejects empty backendId", () => {
    expect(() =>
      engine.validateExtractionBackend({
        backendId: "",
        trainingPairSetId: "set1",
        pairs,
        backend: () => ({ value: "1" }),
      }),
    ).toThrow(/backendId required/);
  });

  it("clamps conformalAlpha to [0.01, 0.5]", () => {
    const backend = (p: ExtractionTrainingPair) => ({ value: pickGroundTruthScalar(p.groundTruthValues) ?? "", confidence: 0.9 });
    const high = engine.validateExtractionBackend({ backendId: "high", trainingPairSetId: "x", pairs, backend, conformalAlpha: 5 });
    expect(high.conformalAlpha).toBe(0.5);
    const low = engine.validateExtractionBackend({ backendId: "low", trainingPairSetId: "x", pairs, backend, conformalAlpha: -1 });
    expect(low.conformalAlpha).toBe(0.01);
  });
});

describe("compareBackends + regressionGate (U-MS1-U4)", () => {
  const pairs: ExtractionTrainingPair[] = [
    { pairId: "p1", extractionType: "dimension", groundTruthValues: { erp_actual: "1.000" } },
    { pairId: "p2", extractionType: "dimension", groundTruthValues: { erp_actual: "2.000" } },
    { pairId: "p3", extractionType: "dimension", groundTruthValues: { erp_actual: "3.000" } },
    { pairId: "p4", extractionType: "tolerance", groundTruthValues: { macro_vc_var: "0.005" } },
  ];

  it("ranks backends by accuracy descending", () => {
    const perfect = (p: ExtractionTrainingPair) => ({ value: pickGroundTruthScalar(p.groundTruthValues) ?? "", confidence: 0.9 });
    const halfWrong = (p: ExtractionTrainingPair) => ({
      value: p.pairId === "p1" || p.pairId === "p2" ? (pickGroundTruthScalar(p.groundTruthValues) ?? "") : "WRONG",
      confidence: 0.7,
    });
    const broken = () => ({ value: "X", confidence: 0.1 });
    const result = engine.compareBackends({
      backends: [
        { backendId: "broken", backend: broken },
        { backendId: "perfect", backend: perfect },
        { backendId: "halfWrong", backend: halfWrong },
      ],
      trainingPairSetId: "compare-set",
      pairs,
      regressionThresholdPct: 2,
    });
    expect(result.rank[0]?.backendId).toBe("perfect");
    expect(result.rank[0]?.accuracy).toBe(1);
    expect(result.rank[1]?.backendId).toBe("halfWrong");
    expect(result.rank[2]?.backendId).toBe("broken");
    expect(result.leaderId).toBe("perfect");
  });

  it("flags regressions for backends below leader by >threshold", () => {
    const perfect = (p: ExtractionTrainingPair) => ({ value: pickGroundTruthScalar(p.groundTruthValues) ?? "", confidence: 0.9 });
    const broken = () => ({ value: "X", confidence: 0.1 });
    const result = engine.compareBackends({
      backends: [
        { backendId: "perfect", backend: perfect },
        { backendId: "broken", backend: broken },
      ],
      trainingPairSetId: "regress-set",
      pairs,
      regressionThresholdPct: 5,
    });
    expect(result.regressionFlags.length).toBe(1);
    expect(result.regressionFlags[0]?.backendId).toBe("broken");
    expect(result.regressionFlags[0]?.gapPct).toBe(100);
    expect(result.regressionFlags[0]?.versusLeader).toBe("perfect");
  });

  it("rejects empty backend list", () => {
    expect(() =>
      engine.compareBackends({
        backends: [],
        trainingPairSetId: "x",
        pairs,
      }),
    ).toThrow(/at least one backend/);
  });

  it("regressionGate passes when no regression vs baseline", () => {
    const perfect = (p: ExtractionTrainingPair) => ({ value: pickGroundTruthScalar(p.groundTruthValues) ?? "", confidence: 0.9 });
    const baseline = engine.validateExtractionBackend({
      backendId: "baseline-perfect",
      trainingPairSetId: "set-baseline",
      pairs,
      backend: perfect,
    });
    engine.snapshotBaseline("snap-1", baseline);
    const current = engine.validateExtractionBackend({
      backendId: "current-perfect",
      trainingPairSetId: "set-current",
      pairs,
      backend: perfect,
    });
    const gate = engine.regressionGate({
      current,
      baselineSnapshotId: "snap-1",
    });
    expect(gate.passed).toBe(true);
    expect(gate.reason).toBe("no_regression");
    expect(gate.regressions).toEqual([]);
  });

  it("regressionGate fails when current regresses vs baseline", () => {
    const perfect = (p: ExtractionTrainingPair) => ({ value: pickGroundTruthScalar(p.groundTruthValues) ?? "", confidence: 0.9 });
    const broken = () => ({ value: "X", confidence: 0.1 });
    const baseline = engine.validateExtractionBackend({
      backendId: "baseline",
      trainingPairSetId: "x",
      pairs,
      backend: perfect,
    });
    engine.snapshotBaseline("snap-2", baseline);
    const current = engine.validateExtractionBackend({
      backendId: "regressed",
      trainingPairSetId: "x",
      pairs,
      backend: broken,
    });
    const gate = engine.regressionGate({
      current,
      baselineSnapshotId: "snap-2",
      perDimTolerancePct: 2,
    });
    expect(gate.passed).toBe(false);
    expect(gate.reason).toBe("regressions_detected");
    expect(gate.regressions.length).toBeGreaterThan(0);
    expect(gate.regressions[0]?.gapPct).toBe(100);
  });

  it("regressionGate fails when baseline missing", () => {
    const baseline: BackendValidationResult = {
      backendId: "fake",
      trainingPairSetId: "x",
      accuracy: 1,
      conformalCoverage: { observed: 1, nominal: 0.9 },
      conformalAlpha: 0.1,
      perDimTypeBreakdown: { dimension: { accuracy: 1, n: 1 } },
      disagreementRegions: [],
      totalPairs: 1,
      totalCorrect: 1,
      evaluatedAt: new Date().toISOString(),
    };
    const gate = engine.regressionGate({
      current: baseline,
      baselineSnapshotId: "never-snapshotted",
    });
    expect(gate.passed).toBe(false);
    expect(gate.reason).toBe("baseline_missing");
  });

  it("regressionGate detects dropped dim_type as regression", () => {
    const baseline: BackendValidationResult = {
      backendId: "baseline",
      trainingPairSetId: "x",
      accuracy: 1,
      conformalCoverage: { observed: 1, nominal: 0.9 },
      conformalAlpha: 0.1,
      perDimTypeBreakdown: { dimension: { accuracy: 1, n: 1 }, tolerance: { accuracy: 1, n: 1 } },
      disagreementRegions: [],
      totalPairs: 2,
      totalCorrect: 2,
      evaluatedAt: new Date().toISOString(),
    };
    engine.snapshotBaseline("snap-3", baseline);
    const current: BackendValidationResult = {
      ...baseline,
      perDimTypeBreakdown: { dimension: { accuracy: 1, n: 1 } }, // tolerance dropped
    };
    const gate = engine.regressionGate({
      current,
      baselineSnapshotId: "snap-3",
    });
    expect(gate.passed).toBe(false);
    expect(gate.regressions.some((r) => r.reason === "dim_type_dropped")).toBe(true);
  });

  it("snapshotBaseline rejects empty snapshotId", () => {
    const baseline: BackendValidationResult = {
      backendId: "b",
      trainingPairSetId: "x",
      accuracy: 1,
      conformalCoverage: { observed: 1, nominal: 0.9 },
      conformalAlpha: 0.1,
      perDimTypeBreakdown: {},
      disagreementRegions: [],
      totalPairs: 0,
      totalCorrect: 0,
      evaluatedAt: new Date().toISOString(),
    };
    expect(() => engine.snapshotBaseline("", baseline)).toThrow(/snapshotId required/);
  });

  it("clearBaselines removes all snapshots", () => {
    const baseline: BackendValidationResult = {
      backendId: "b",
      trainingPairSetId: "x",
      accuracy: 1,
      conformalCoverage: { observed: 1, nominal: 0.9 },
      conformalAlpha: 0.1,
      perDimTypeBreakdown: {},
      disagreementRegions: [],
      totalPairs: 0,
      totalCorrect: 0,
      evaluatedAt: new Date().toISOString(),
    };
    engine.snapshotBaseline("clear-test", baseline);
    expect(engine.getBaseline("clear-test")).not.toBe(null);
    engine.clearBaselines();
    expect(engine.getBaseline("clear-test")).toBe(null);
  });
});
