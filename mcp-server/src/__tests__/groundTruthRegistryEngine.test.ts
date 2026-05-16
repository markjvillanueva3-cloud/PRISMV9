/**
 * groundTruthRegistryEngine.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT08
 *
 * Validates index construction, query API, JM Die path inference,
 * complexity tiering, and manifest persistence/load round-trip.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  GroundTruthRegistryEngine,
  groundTruthRegistryEngine,
  RegistryManifestSchema,
  inferCustomerAndMachine,
  inferComplexity,
  MACHINE_CATEGORIES,
  COMPLEXITY_TIERS,
  CONFIDENCE_TIERS,
  SOURCE_PROVENANCES,
  BlueprintExtractionRecordSchema,
  TrainingPairSchema,
  isReadOnlyTarget,
  extractJmDieItems,
  readGroundTruthValuesForPart,
  classifyConfidenceTier,
} from "../engines/GroundTruthRegistryEngine.js";

let engine: GroundTruthRegistryEngine;
let tmpRoot: string;

beforeEach(() => {
  engine = new GroundTruthRegistryEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt08-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ── Fixture builders ────────────────────────────────────────────────────────

function writeBundle(
  outRoot: string,
  fileId: string,
  bundle: Record<string, unknown>,
  featureCount?: number,
): void {
  const dir = path.join(outRoot, fileId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "bundle.json"),
    JSON.stringify({
      fileId,
      bundleDir: dir,
      ...bundle,
    }, null, 2),
  );
  if (featureCount !== undefined) {
    const features = Array.from({ length: featureCount }, (_, i) => ({
      id: `f${i}`,
      type: "Body",
      name: `f${i}`,
    }));
    fs.writeFileSync(
      path.join(dir, "feature-tree.json"),
      JSON.stringify({ features }),
    );
  }
}

function alcoaLatheBundle(fileId: string, featureCount = 3) {
  return {
    fileId,
    sourcePath: `H:/PRISM/JM DIE/CNC LATHE/ALCOA/${fileId}.MIN`,
    format: ".MIN",
    featureCount,
    bundle: {
      sourcePath: `H:/PRISM/JM DIE/CNC LATHE/ALCOA/${fileId}.MIN`,
      format: ".MIN",
      status: "ok",
      stages: {
        featureTree: { ok: true, signature: "f".repeat(64) },
        dimensionalSig: {
          ok: true,
          signature: "d".repeat(64),
          envelopeM: 0.05,
        },
        step: { ok: true },
        screenshots: { ok: true },
      },
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("inferCustomerAndMachine — JM Die paths", () => {
  it("recognizes CNC LATHE under JM DIE → customer + lathe", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PART-001.MIN",
    );
    expect(r.customer).toBe("ALCOA");
    expect(r.machineCategory).toBe("lathe");
  });

  it("recognizes CNC MILL → mill", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/CNC MILL/ITW/x.mcx-8",
    );
    expect(r.machineCategory).toBe("mill");
    expect(r.customer).toBe("ITW");
  });

  it("recognizes WIRE EDM → wedm", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/WIRE EDM/OPTIMAS/d.NC",
    );
    expect(r.machineCategory).toBe("wedm");
    expect(r.customer).toBe("OPTIMAS");
  });

  it("recognizes Sinker EDM under JM DIE → edm", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/SINKER EDM/HOLO-KROME/p.dat",
    );
    expect(r.machineCategory).toBe("edm");
    expect(r.customer).toBe("HOLO-KROME");
  });

  it("handles backslash Windows paths (case insensitive)", () => {
    const r = inferCustomerAndMachine(
      "H:\\PRISM\\jm die\\cnc lathe\\sfs\\part.MIN",
    );
    expect(r.customer).toBe("SFS");
    expect(r.machineCategory).toBe("lathe");
  });

  it("falls back to UNKNOWN/other when path doesn't match conventions", () => {
    const r = inferCustomerAndMachine("/some/random/path/x.step");
    expect(r.customer).toBe("UNKNOWN");
    expect(r.machineCategory).toBe("other");
  });
});

describe("inferComplexity — tiering heuristic", () => {
  it("≤5 features = simple regardless of envelope", () => {
    expect(inferComplexity(0, 0.001)).toBe("simple");
    expect(inferComplexity(5, 5.0)).toBe("simple");
  });

  it("6..20 features = medium when envelope is small", () => {
    expect(inferComplexity(10, 0.05)).toBe("medium");
    expect(inferComplexity(20, 0.299)).toBe("medium");
  });

  it("medium feature count + large envelope (>0.3 m) bumps to complex", () => {
    expect(inferComplexity(15, 0.5)).toBe("complex");
  });

  it(">20 features = complex always", () => {
    expect(inferComplexity(50, 0.001)).toBe("complex");
    expect(inferComplexity(21, undefined)).toBe("complex");
  });
});

describe("buildIndex — corpus scan", () => {
  it("indexes 3 ALCOA lathe bundles into byCustomer + byMachine", () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1").bundle, 3);
    writeBundle(tmpRoot, "P2", alcoaLatheBundle("P2", 8).bundle, 8);
    writeBundle(tmpRoot, "P3", alcoaLatheBundle("P3").bundle, 3);
    const stats = engine.buildIndex(tmpRoot);
    expect(stats.total).toBe(3);
    expect(engine.size()).toBe(3);
    expect(engine.findByCustomer("ALCOA").length).toBe(3);
    expect(engine.findByCustomer("alcoa").length).toBe(3); // case-insensitive
    expect(engine.findByMachineCategory("lathe").length).toBe(3);
    expect(stats.byMachineCategory.lathe).toBe(3);
    expect(stats.byCustomer.ALCOA).toBe(3);
  });

  it("skips bundles with status != ok by default; includes them when opted in", () => {
    writeBundle(tmpRoot, "OK1", alcoaLatheBundle("OK1").bundle, 3);
    writeBundle(tmpRoot, "F1", {
      sourcePath: "H:/PRISM/JM DIE/CNC LATHE/ALCOA/F1.MIN",
      format: ".MIN",
      status: "failed",
      stages: { step: { ok: false } },
    });
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
    const all = engine.buildIndex(tmpRoot, { includeNonOk: true });
    expect(all.total).toBe(2);
    expect(all.byStatus.failed).toBe(1);
  });

  it("ignores _checkpoints/ and other underscore-prefixed dirs", () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1").bundle, 3);
    fs.mkdirSync(path.join(tmpRoot, "_checkpoints"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, "_checkpoints", "x.json"),
      "{}",
    );
    fs.mkdirSync(path.join(tmpRoot, "_tmp-scratch"), { recursive: true });
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
  });

  it("skips directories with no bundle.json (no false entries)", () => {
    fs.mkdirSync(path.join(tmpRoot, "EMPTY"), { recursive: true });
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1").bundle, 3);
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
  });

  it("skips bundle.json that fails schema parse (corrupt data)", () => {
    fs.mkdirSync(path.join(tmpRoot, "BAD"), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, "BAD", "bundle.json"), "not json");
    writeBundle(tmpRoot, "OK1", alcoaLatheBundle("OK1").bundle, 3);
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
  });

  it("throws when outputRoot does not exist", () => {
    expect(() =>
      engine.buildIndex(path.join(tmpRoot, "missing")),
    ).toThrow(/does not exist/);
    expect(() => engine.buildIndex("")).toThrow(/non-empty string/);
  });
});

describe("query API — exit-criterion sample", () => {
  beforeEach(() => {
    // ALCOA lathe: 12 simple, 4 medium, 2 complex
    for (let i = 0; i < 18; i++) {
      const fc = i < 12 ? 3 : i < 16 ? 12 : 25;
      writeBundle(
        tmpRoot,
        `ALCOA-${String(i).padStart(3, "0")}`,
        alcoaLatheBundle(`ALCOA-${String(i).padStart(3, "0")}`, fc).bundle,
        fc,
      );
    }
    // ITW mill: 5 simple
    for (let i = 0; i < 5; i++) {
      writeBundle(tmpRoot, `ITW-${i}`, {
        sourcePath: `H:/PRISM/JM DIE/CNC MILL/ITW/ITW-${i}.mcx-8`,
        format: ".mcx-8",
        status: "ok",
        stages: {
          featureTree: { ok: true },
          dimensionalSig: { ok: true, envelopeM: 0.02 },
          step: { ok: true },
          screenshots: { ok: true },
        },
      }, 2);
    }
    engine.buildIndex(tmpRoot);
  });

  it("returns 10-file ALCOA lathe sample in <100 ms with limit honored", () => {
    const start = Date.now();
    const sample = engine.query(
      { customer: "ALCOA", machineCategory: "lathe", status: "ok" },
      { limit: 10, sortBy: "fileId" },
    );
    const elapsed = Date.now() - start;
    expect(sample.length).toBe(10);
    expect(elapsed).toBeLessThan(100);
    expect(sample.every((e) => e.customer === "ALCOA")).toBe(true);
    expect(sample.every((e) => e.machineCategory === "lathe")).toBe(true);
    // sorted ascending by fileId
    expect(sample[0]?.fileId).toBe("ALCOA-000");
    expect(sample[9]?.fileId).toBe("ALCOA-009");
  });

  it("findByComplexity buckets entries correctly", () => {
    expect(engine.findByComplexity("simple").length).toBe(12 + 5); // ALCOA + ITW
    expect(engine.findByComplexity("medium").length).toBe(4);
    expect(engine.findByComplexity("complex").length).toBe(2);
  });

  it("findByFormat partitions by extension", () => {
    expect(engine.findByFormat(".MIN").length).toBe(18);
    expect(engine.findByFormat(".mcx-8").length).toBe(5);
    expect(engine.findByFormat(".unknown").length).toBe(0);
  });

  it("findByFileId returns the single entry or null", () => {
    expect(engine.findByFileId("ALCOA-007")?.machineCategory).toBe("lathe");
    expect(engine.findByFileId("missing")).toBeNull();
  });

  it("compound query returns intersection only", () => {
    const millOnly = engine.query({ machineCategory: "mill" });
    expect(millOnly.length).toBe(5);
    expect(millOnly.every((e) => e.customer === "ITW")).toBe(true);

    const alcoaComplex = engine.query({
      customer: "ALCOA",
      complexity: "complex",
    });
    expect(alcoaComplex.length).toBe(2);
  });

  it("sortBy=featureCount orders ascending", () => {
    const sorted = engine.query(
      { customer: "ALCOA" },
      { sortBy: "featureCount", limit: 18 },
    );
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.featureCount).toBeGreaterThanOrEqual(
        sorted[i - 1]!.featureCount,
      );
    }
  });
});

describe("manifest persistence", () => {
  it("dumpManifest then loadManifest reproduces stats + queries", async () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1", 3).bundle, 3);
    writeBundle(tmpRoot, "P2", alcoaLatheBundle("P2", 12).bundle, 12);
    engine.buildIndex(tmpRoot);
    const manifestPath = path.join(tmpRoot, "_index", "registry.json");
    await engine.dumpManifest(manifestPath);
    expect(fs.existsSync(manifestPath)).toBe(true);

    const fresh = new GroundTruthRegistryEngine();
    const loaded = await fresh.loadManifest(manifestPath);
    expect(RegistryManifestSchema.safeParse(loaded).success).toBe(true);
    expect(fresh.size()).toBe(2);
    expect(fresh.findByCustomer("ALCOA").length).toBe(2);
    expect(fresh.getStats().byCustomer.ALCOA).toBe(2);
  });

  it("dumpManifest before buildIndex throws", async () => {
    await expect(
      engine.dumpManifest(path.join(tmpRoot, "x.json")),
    ).rejects.toThrow(/before buildIndex/);
  });

  it("loadManifest rejects malformed JSON with structured error", async () => {
    const badPath = path.join(tmpRoot, "bad.json");
    fs.writeFileSync(badPath, '{"schemaVersion":"9.9.9"}');
    await expect(engine.loadManifest(badPath)).rejects.toThrow(
      /manifest invalid/,
    );
  });

  it("validate ok=true for fresh manifest, ok=false for malformed", () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1", 3).bundle, 3);
    engine.buildIndex(tmpRoot);
    const manifest = {
      schemaVersion: "1.0.0" as const,
      outputRoot: tmpRoot,
      builtAt: new Date().toISOString(),
      entries: [],
      stats: {
        total: 0,
        byFormat: {},
        byCustomer: {},
        byMachineCategory: {},
        byComplexity: {},
        byStatus: {},
      },
    };
    expect(engine.validate(manifest).ok).toBe(true);
    const bad = engine.validate({ schemaVersion: "1.0.0" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(2);
  });
});

describe("metadata + constants", () => {
  it("singleton schemaVersion is 1.0.0", () => {
    expect(groundTruthRegistryEngine.schemaVersion).toBe("1.0.0");
  });

  it("MACHINE_CATEGORIES + COMPLEXITY_TIERS are stable enums", () => {
    expect(MACHINE_CATEGORIES).toContain("lathe");
    expect(MACHINE_CATEGORIES).toContain("mill");
    expect(MACHINE_CATEGORIES).toContain("wedm");
    expect(MACHINE_CATEGORIES).toContain("edm");
    expect(MACHINE_CATEGORIES).toContain("other");
    expect(COMPLEXITY_TIERS).toEqual(["simple", "medium", "complex"]);
  });
});

// ── BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U3 extensions ───────────────────────

describe("blueprint extension constants", () => {
  it("CONFIDENCE_TIERS exposes the 4-tier scheme", () => {
    expect(CONFIDENCE_TIERS).toEqual([
      "operator_verified",
      "ensemble_consensus",
      "single_backend",
      "ambiguous",
    ]);
  });
  it("SOURCE_PROVENANCES exposes 4 trust levels", () => {
    expect(SOURCE_PROVENANCES).toEqual([
      "macro_vc_var",
      "erp_actual",
      "operator_correction",
      "ocr_inferred",
    ]);
  });
});

describe("isReadOnlyTarget — HARD RULE enforcement", () => {
  it("blocks Automated Program_Corrected 5-25.xlsm", () => {
    expect(isReadOnlyTarget("H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm")).toBe(true);
  });
  it("blocks _PART LIBRARY/<customer>/<pn>/CNC PROGRAM/", () => {
    expect(isReadOnlyTarget("H:/PRISM/_PART LIBRARY/ALCOA/ABC123/CNC PROGRAM/main.nc")).toBe(true);
  });
  it("allows mcp-server/data/training/blueprint-extractions.jsonl", () => {
    expect(isReadOnlyTarget("mcp-server/data/training/blueprint-extractions.jsonl")).toBe(false);
  });
  it("returns false on empty/null", () => {
    expect(isReadOnlyTarget("")).toBe(false);
    expect(isReadOnlyTarget(null as unknown as string)).toBe(false);
  });
  it("REGRESSION Arm-B P1: case-insensitive on xlsm pattern", () => {
    // UPPERCASE: forensic capture / Windows occasionally returns uppercase ext
    expect(isReadOnlyTarget("H:/PRISM/JM DIE/AUTOMATED PROGRAM_CORRECTED 5-25.XLSM")).toBe(true);
    // mixedCase
    expect(isReadOnlyTarget("H:/PRISM/JM DIE/AutoMated Program_Corrected 5-25.Xlsm")).toBe(true);
  });
  it("REGRESSION Arm-B P1: version-bump tolerant on xlsm pattern", () => {
    // 6-25 (next year's book)
    expect(isReadOnlyTarget("H:/JM DIE/Automated Program_Corrected 6-25.xlsm")).toBe(true);
    // 5-26 (next month's book)
    expect(isReadOnlyTarget("H:/JM DIE/Automated Program_Corrected 5-26.xlsm")).toBe(true);
    // No version suffix (defensive)
    expect(isReadOnlyTarget("H:/JM DIE/Automated Program_Corrected.xlsm")).toBe(true);
  });
  it("REGRESSION Arm-B P1: CNC PROGRAM dir without trailing slash", () => {
    // Without the (?:\/|$) anchor fix, this bypassed the deny-list when
    // operator passed the dir directly as a target (no path.join child append).
    expect(isReadOnlyTarget("H:/PRISM/_PART LIBRARY/ALCOA/AB-001/CNC PROGRAM")).toBe(true);
    expect(isReadOnlyTarget("H:/PRISM/_PART_LIBRARY/X/Y/CNC_PROGRAM")).toBe(true);
  });
});

describe("classifyConfidenceTier", () => {
  it("returns single_backend on empty input", () => {
    expect(classifyConfidenceTier({})).toBe("single_backend");
  });
  it("returns operator_verified when operator_correction present", () => {
    expect(
      classifyConfidenceTier({ operator_correction: "1.000", macro_vc_var: "1.001" }),
    ).toBe("operator_verified");
  });
  it("returns ensemble_consensus when 2+ sources agree", () => {
    expect(
      classifyConfidenceTier({ macro_vc_var: "1.000", erp_actual: "1.000" }),
    ).toBe("ensemble_consensus");
  });
  it("returns ambiguous when 2+ sources disagree", () => {
    expect(
      classifyConfidenceTier({ macro_vc_var: "1.000", erp_actual: "1.500" }),
    ).toBe("ambiguous");
  });
  it("returns single_backend when only one source", () => {
    expect(classifyConfidenceTier({ macro_vc_var: "1.000" })).toBe("single_backend");
  });
});

describe("extractJmDieItems — permissive manifest shape support", () => {
  it("handles {files:[...]} shape", () => {
    const items = extractJmDieItems({
      files: [
        { customer: "alcoa", partNumber: "AB-001", pdfPath: "/p1.pdf" },
        { customer: "ITW", partNumber: "ZZ-9", pdfPath: "/p2.pdf", page: 3 },
      ],
    });
    expect(items.length).toBe(2);
    expect(items[0]?.customer).toBe("ALCOA"); // uppercased
    expect(items[1]?.page).toBe(3);
  });
  it("handles {entries:[...]} shape", () => {
    const items = extractJmDieItems({ entries: [{ customer: "X", partNumber: "Y", pdfPath: "/p.pdf" }] });
    expect(items.length).toBe(1);
  });
  it("handles flat array shape", () => {
    const items = extractJmDieItems([
      { customer: "A", partNumber: "1", pdfPath: "/p.pdf" },
    ]);
    expect(items.length).toBe(1);
  });
  it("returns [] on null/undefined/non-object", () => {
    expect(extractJmDieItems(null)).toEqual([]);
    expect(extractJmDieItems(undefined)).toEqual([]);
    expect(extractJmDieItems(42)).toEqual([]);
  });
  it("REGRESSION Arm-B P1: handles {records:[...]} shape (third permissive variant)", () => {
    const items = extractJmDieItems({
      records: [{ customer: "ALCOA", partNumber: "AB-001", pdfPath: "/p.pdf" }],
    });
    expect(items.length).toBe(1);
    expect(items[0]?.customer).toBe("ALCOA");
  });
  it("skips malformed entries (missing required keys)", () => {
    const items = extractJmDieItems({
      files: [
        { customer: "A" }, // missing partNumber + pdfPath
        { customer: "B", partNumber: "X", pdfPath: "/p.pdf" }, // valid
      ],
    });
    expect(items.length).toBe(1);
    expect(items[0]?.customer).toBe("B");
  });
  it("preserves valid regions, drops malformed ones", () => {
    const items = extractJmDieItems({
      files: [
        {
          customer: "A", partNumber: "1", pdfPath: "/p.pdf",
          regions: [
            { x: 0, y: 0, width: 10, height: 5 },
            { x: 0, y: 0, width: -1, height: 5 }, // invalid: width <= 0
            "not-an-object",
          ],
        },
      ],
    });
    expect(items[0]?.regions?.length).toBe(1);
  });
});

describe("registerBlueprintExtraction", () => {
  let tmpDir: string;
  beforeEach(() => {
    engine.resetBlueprintState();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u3-"));
  });
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  it("appends a valid extraction to in-memory + JSONL", () => {
    const rec = engine.registerBlueprintExtraction({
      pdfPath: "/test/blueprint.pdf",
      page: 2,
      region: { x: 100, y: 50, width: 80, height: 30 },
      extractionType: "dimension",
      value: "1.250",
      confidenceTier: "operator_verified",
      sourceProvenance: "operator_correction",
      customer: "ALCOA",
      partNumber: "AB-001",
      trainingDir: tmpDir,
    });
    expect(rec.value).toBe("1.250");
    expect(rec.customer).toBe("ALCOA");
    expect(rec.extractionId.startsWith("bpe:")).toBe(true);
    const jsonlPath = path.join(tmpDir, "blueprint-extractions.jsonl");
    expect(fs.existsSync(jsonlPath)).toBe(true);
    const lines = fs.readFileSync(jsonlPath, "utf8").trim().split("\n");
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.value).toBe("1.250");
  });

  it("HARD RULE: refuses to write to Automated Program_Corrected 5-25.xlsm", () => {
    expect(() =>
      engine.registerBlueprintExtraction({
        pdfPath: "/p.pdf",
        page: 1,
        region: { x: 0, y: 0, width: 1, height: 1 },
        extractionType: "dimension",
        value: "1",
        confidenceTier: "single_backend",
        sourceProvenance: "ocr_inferred",
        trainingDir: "H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm",
      }),
    ).toThrow(/BLOCKED/);
  });

  it("HARD RULE: refuses to write to _PART LIBRARY CNC PROGRAM", () => {
    expect(() =>
      engine.registerBlueprintExtraction({
        pdfPath: "/p.pdf",
        page: 1,
        region: { x: 0, y: 0, width: 1, height: 1 },
        extractionType: "dimension",
        value: "1",
        confidenceTier: "single_backend",
        sourceProvenance: "ocr_inferred",
        trainingDir: "H:/PRISM/_PART LIBRARY/ALCOA/AB-001/CNC PROGRAM",
      }),
    ).toThrow(/BLOCKED/);
  });

  it("rejects invalid region (zero width)", () => {
    expect(() =>
      engine.registerBlueprintExtraction({
        pdfPath: "/p.pdf",
        page: 1,
        region: { x: 0, y: 0, width: 0, height: 1 },
        extractionType: "dimension",
        value: "1",
        confidenceTier: "single_backend",
        sourceProvenance: "ocr_inferred",
        trainingDir: tmpDir,
      }),
    ).toThrow(/invalid blueprint extraction/);
  });

  it("schema validates the canonical shape end-to-end", () => {
    const sample = {
      extractionId: "bpe:foo:1:0x0",
      pdfPath: "/p.pdf",
      page: 1,
      region: { x: 0, y: 0, width: 10, height: 10 },
      extractionType: "dimension" as const,
      value: "1",
      confidenceTier: "single_backend" as const,
      sourceProvenance: "ocr_inferred" as const,
      customer: "X",
      recordedAt: new Date().toISOString(),
    };
    expect(BlueprintExtractionRecordSchema.safeParse(sample).success).toBe(true);
  });
});

describe("readGroundTruthValuesForPart", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u3-gt-"));
  });
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  it("returns {} when part.json missing", () => {
    const errs: string[] = [];
    const result = readGroundTruthValuesForPart(
      path.join(tmpDir, "missing.json"),
      { existsSync: fs.existsSync, readFileSync: fs.readFileSync },
      errs,
    );
    expect(result).toEqual({});
    expect(errs.length).toBe(0);
  });

  it("extracts macroVCVars + erpActuals when both present", () => {
    const partJson = path.join(tmpDir, "part.json");
    fs.writeFileSync(partJson, JSON.stringify({
      macroVCVars: { dim1: "1.000" },
      erpActuals: { dim1: "1.002" },
    }), "utf8");
    const errs: string[] = [];
    const result = readGroundTruthValuesForPart(partJson, fs, errs);
    expect(result.macro_vc_var).toBe("1.000");
    expect(result.erp_actual).toBe("1.002");
  });

  it("handles numeric values via String() coercion", () => {
    const partJson = path.join(tmpDir, "part.json");
    fs.writeFileSync(partJson, JSON.stringify({ macroVCVars: { dim1: 1.25 } }), "utf8");
    const errs: string[] = [];
    const result = readGroundTruthValuesForPart(partJson, fs, errs);
    expect(result.macro_vc_var).toBe("1.25");
  });

  it("records parse errors but doesn't throw", () => {
    const partJson = path.join(tmpDir, "part.json");
    fs.writeFileSync(partJson, "{ not valid json", "utf8");
    const errs: string[] = [];
    const result = readGroundTruthValuesForPart(partJson, fs, errs);
    expect(result).toEqual({});
    expect(errs.length).toBe(1);
    expect(errs[0]).toMatch(/parse error/);
  });
});

describe("enumerateByConfidenceTier", () => {
  let tmpDir: string;
  beforeEach(() => {
    engine.resetBlueprintState();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u3-enum-"));
    // Seed 3 records across tiers
    for (const tier of ["operator_verified", "ensemble_consensus", "single_backend"] as const) {
      engine.registerBlueprintExtraction({
        pdfPath: `/p-${tier}.pdf`,
        page: 1,
        region: { x: 0, y: 0, width: 10, height: 10 },
        extractionType: "dimension",
        value: tier,
        confidenceTier: tier,
        sourceProvenance: "ocr_inferred",
        trainingDir: tmpDir,
      });
    }
  });
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  it("returns extractions at the requested tier", () => {
    const list = engine.enumerateByConfidenceTier({ tier: "operator_verified" });
    expect(list.length).toBe(1);
    expect(list[0]?.value).toBe("operator_verified");
  });
  it("returns empty array for tier with no records", () => {
    expect(engine.enumerateByConfidenceTier({ tier: "ambiguous" })).toEqual([]);
  });
  it("respects limit", () => {
    // Seed two more operator_verified records
    for (let i = 0; i < 2; i++) {
      engine.registerBlueprintExtraction({
        pdfPath: `/extra-${i}.pdf`,
        page: 1,
        region: { x: 0, y: 0, width: 1, height: 1 },
        extractionType: "dimension",
        value: String(i),
        confidenceTier: "operator_verified",
        sourceProvenance: "operator_correction",
        trainingDir: tmpDir,
      });
    }
    const list = engine.enumerateByConfidenceTier({ tier: "operator_verified", limit: 2 });
    expect(list.length).toBe(2);
  });
  it("throws on invalid tier", () => {
    expect(() =>
      engine.enumerateByConfidenceTier({ tier: "nonexistent" as never }),
    ).toThrow(/invalid tier/);
  });
});

describe("joinDocustrataToPartLibrary + flagAmbiguities + getTrainingPairsByCustomer", () => {
  let tmpDir: string;
  let indexPath: string;
  let partLibRoot: string;
  let trainingDir: string;

  beforeEach(() => {
    engine.resetBlueprintState();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u3-join-"));
    indexPath = path.join(tmpDir, "jm-die-index-v2.json");
    partLibRoot = path.join(tmpDir, "_PART_LIBRARY");
    trainingDir = path.join(tmpDir, "training");

    // Seed a 3-customer manifest
    const manifest = {
      files: [
        { customer: "ALCOA", partNumber: "AB-001", pdfPath: "/pdf/alcoa-ab001.pdf", page: 1 },
        { customer: "ITW", partNumber: "ZZ-9", pdfPath: "/pdf/itw-zz9.pdf", page: 1 },
        { customer: "CONTINENTAL MIDLAND", partNumber: "CM-22", pdfPath: "/pdf/cm-22.pdf", page: 1 },
      ],
    };
    fs.writeFileSync(indexPath, JSON.stringify(manifest), "utf8");

    // ALCOA: macro + ERP agree → ensemble_consensus
    fs.mkdirSync(path.join(partLibRoot, "ALCOA", "AB-001"), { recursive: true });
    fs.writeFileSync(
      path.join(partLibRoot, "ALCOA", "AB-001", "part.json"),
      JSON.stringify({
        macroVCVars: { dim1: "1.000" },
        erpActuals: { dim1: "1.000" },
      }),
      "utf8",
    );

    // ITW: macro + ERP disagree → ambiguous
    fs.mkdirSync(path.join(partLibRoot, "ITW", "ZZ-9"), { recursive: true });
    fs.writeFileSync(
      path.join(partLibRoot, "ITW", "ZZ-9", "part.json"),
      JSON.stringify({
        macroVCVars: { dim1: "0.500" },
        erpActuals: { dim1: "0.502" },
      }),
      "utf8",
    );

    // CONTINENTAL MIDLAND: operator correction present → operator_verified
    fs.mkdirSync(path.join(partLibRoot, "CONTINENTAL MIDLAND", "CM-22"), { recursive: true });
    fs.writeFileSync(
      path.join(partLibRoot, "CONTINENTAL MIDLAND", "CM-22", "part.json"),
      JSON.stringify({
        macroVCVars: { dim1: "2.000" },
        operatorCorrections: { dim1: "2.005" },
      }),
      "utf8",
    );
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  it("joins all 3 customers + writes JSONL with the expected count", () => {
    const result = engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    expect(result.indexErrors).toEqual([]);
    expect(result.pairsCreated).toBe(3);
    expect(result.byCustomer.ALCOA).toBe(1);
    expect(result.byCustomer.ITW).toBe(1);
    expect(result.byCustomer["CONTINENTAL MIDLAND"]).toBe(1);
    expect(result.byConfidenceTier.ensemble_consensus).toBe(1);
    expect(result.byConfidenceTier.ambiguous).toBe(1);
    expect(result.byConfidenceTier.operator_verified).toBe(1);
    expect(result.indexErrors).toEqual([]);

    const jsonl = path.join(trainingDir, "training-pairs.jsonl");
    expect(fs.existsSync(jsonl)).toBe(true);
    const lines = fs.readFileSync(jsonl, "utf8").trim().split("\n");
    expect(lines.length).toBe(3);
  });

  it("flagAmbiguities surfaces ITW (macro≠erp) but NOT ALCOA (agree)", () => {
    engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    const flags = engine.flagAmbiguities();
    expect(flags.length).toBe(1);
    expect(flags[0]?.customer).toBe("ITW");
    expect(flags[0]?.conflictingValues.length).toBe(2);
    expect(flags[0]?.recommendation).toMatch(/Operator review/);
  });

  it("getTrainingPairsByCustomer case-insensitive customer match", () => {
    engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    expect(engine.getTrainingPairsByCustomer({ customer: "alcoa" }).length).toBe(1);
    expect(engine.getTrainingPairsByCustomer({ customer: "ALCOA" }).length).toBe(1);
    expect(engine.getTrainingPairsByCustomer({ customer: "missing" }).length).toBe(0);
  });

  it("respects limit on getTrainingPairsByCustomer", () => {
    // Seed two more ALCOA pairs via direct registration on a second part.json
    fs.mkdirSync(path.join(partLibRoot, "ALCOA", "AB-002"), { recursive: true });
    fs.writeFileSync(
      path.join(partLibRoot, "ALCOA", "AB-002", "part.json"),
      JSON.stringify({ macroVCVars: { dim1: "1.5" } }),
      "utf8",
    );
    const manifest2 = {
      files: [
        { customer: "ALCOA", partNumber: "AB-001", pdfPath: "/p1.pdf" },
        { customer: "ALCOA", partNumber: "AB-002", pdfPath: "/p2.pdf" },
      ],
    };
    const idx2 = path.join(tmpDir, "jm-die-index-v2-extra.json");
    fs.writeFileSync(idx2, JSON.stringify(manifest2), "utf8");
    engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath: idx2,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    expect(engine.getTrainingPairsByCustomer({ customer: "ALCOA", limit: 1 }).length).toBe(1);
  });

  it("returns indexErrors when jm-die-index-v2.json missing", () => {
    const result = engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath: path.join(tmpDir, "missing.json"),
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    expect(result.pairsCreated).toBe(0);
    expect(result.indexErrors.length).toBe(1);
    expect(result.indexErrors[0]).toMatch(/does not exist/);
  });

  it("returns indexErrors on corrupt manifest", () => {
    const corrupt = path.join(tmpDir, "corrupt.json");
    fs.writeFileSync(corrupt, "{ not valid json", "utf8");
    const result = engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath: corrupt,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    expect(result.pairsCreated).toBe(0);
    expect(result.indexErrors[0]).toMatch(/failed to parse/);
  });

  it("skips parts with no _PART LIBRARY folder gracefully", () => {
    const manifest3 = {
      files: [
        { customer: "GHOST", partNumber: "X-9", pdfPath: "/g.pdf" },
      ],
    };
    const idx3 = path.join(tmpDir, "ghost.json");
    fs.writeFileSync(idx3, JSON.stringify(manifest3), "utf8");
    const result = engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath: idx3,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    expect(result.pairsCreated).toBe(0);
  });

  it("TrainingPairSchema validates a real joined pair", () => {
    engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    const pairs = engine.getTrainingPairsByCustomer({ customer: "ALCOA" });
    expect(pairs.length).toBe(1);
    expect(TrainingPairSchema.safeParse(pairs[0]).success).toBe(true);
  });

  it("blueprintState reports current counts + tier distribution", () => {
    engine.joinDocustrataToPartLibrary({
      rootDir: tmpDir,
      indexPath,
      partLibraryRoot: partLibRoot,
      trainingDir,
    });
    const state = engine.blueprintState();
    expect(state.trainingPairsCount).toBe(3);
    expect(state.pairsByCustomer.ALCOA).toBe(1);
    expect(state.pairsByCustomer["CONTINENTAL MIDLAND"]).toBe(1);
  });
});
