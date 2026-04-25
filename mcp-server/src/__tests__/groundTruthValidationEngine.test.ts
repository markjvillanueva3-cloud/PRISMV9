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
  type BundleValidation,
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
