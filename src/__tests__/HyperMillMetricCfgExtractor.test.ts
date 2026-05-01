/**
 * HyperMillMetricCfgExtractor Tests
 *
 * HM-KC-MS0 / U-HKC01: MetricCfgExtractor — Parse Metric.cfg files into cycle parameter schemas
 *
 * CRITICAL TEST RULE: All assertions use specific expected values — NOT toBeTruthy().
 *
 * Tests cover:
 *   - parseLine(): all line types (numeric, formula, text, edge cases)
 *   - detectFormulaRefs(): T:Rad, T:Dia, J:Fxy, mtol detection + deduplication
 *   - extractFile(): three representative .cfg files with known parameter counts and values
 *   - extractAll(): full corpus — 181 files, >= 6,000 total parameters
 *   - Singleton export
 *   - Error handling (missing directory)
 *
 * @milestone HM-KC-MS0/U-HKC01
 */

import { describe, it, expect } from "vitest";
import * as path from "node:path";
import {
  HyperMillMetricCfgExtractor,
  hyperMillMetricCfgExtractor,
} from "../engines/HyperMillMetricCfgExtractor.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const CFG_DIR = "H:/prism/HYPERMILL/hyperMILL/33.0/Metric.cfg";

// ============================================================================
// parseLine — unit tests (no file I/O)
// ============================================================================

describe("HyperMillMetricCfgExtractor.parseLine", () => {
  const extractor = new HyperMillMetricCfgExtractor(CFG_DIR);

  it("returns null for empty line", () => {
    expect(extractor.parseLine("")).toBeNull();
    expect(extractor.parseLine("   ")).toBeNull();
  });

  it("returns null for comment-only line starting with #", () => {
    expect(extractor.parseLine("# this is a comment")).toBeNull();
    expect(extractor.parseLine("  #------")).toBeNull();
    expect(extractor.parseLine("#-------------------------")).toBeNull();
  });

  it("returns null for lines not starting with *", () => {
    expect(extractor.parseLine("VERTZUSTEL 2.0")).toBeNull();
    expect(extractor.parseLine("   some text")).toBeNull();
    expect(extractor.parseLine("                                    # 1. preferred res")).toBeNull();
  });

  it("parses a numeric integer parameter — COLOR_G0", () => {
    const result = extractor.parseLine("*COLOR_G0                 255      # Color G0");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("COLOR_G0");
    expect(result!.defaultValue).toBe(255);
    expect(result!.valueType).toBe("numeric");
    expect(result!.description).toBe("Color G0");
    expect(result!.formulaRefs).toHaveLength(0);
  });

  it("parses a numeric float parameter — VERTZUSTEL", () => {
    const result = extractor.parseLine("*VERTZUSTEL               2.0      #  vertical step down distance");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("VERTZUSTEL");
    expect(result!.defaultValue).toBe(2.0);
    expect(result!.valueType).toBe("numeric");
    expect(result!.description).toBe("vertical step down distance");
    expect(result!.formulaRefs).toHaveLength(0);
  });

  it("parses a formula parameter with T:Rad reference — MACRO_TRAD_F", () => {
    const result = extractor.parseLine("*MACRO_TRAD_F       T:Rad*0.8      #  helical plunge radius");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("MACRO_TRAD_F");
    expect(result!.defaultValue).toBe("T:Rad*0.8");
    expect(result!.valueType).toBe("formula");
    expect(result!.formulaRefs).toContain("T:Rad");
    expect(result!.description).toBe("helical plunge radius");
  });

  it("parses a formula parameter with J:Fxy reference — MACRO_SFEED_F", () => {
    const result = extractor.parseLine("*MACRO_SFEED_F            J:Fxy    #  Approachmacro feedrate formula");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("MACRO_SFEED_F");
    expect(result!.defaultValue).toBe("J:Fxy");
    expect(result!.valueType).toBe("formula");
    expect(result!.formulaRefs).toContain("J:Fxy");
  });

  it("parses a formula parameter with bare mtol reference — BNDRES", () => {
    const result = extractor.parseLine("*BNDRES                   mtol      # resolution for boundaries");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("BNDRES");
    expect(result!.defaultValue).toBe("mtol");
    expect(result!.valueType).toBe("formula");
    expect(result!.formulaRefs).toContain("mtol");
  });

  it("parses pipe-separated multi-value formula — APPROXRES — deduplicates mtol", () => {
    const result = extractor.parseLine("*APPROXRES  mtol*0.9|mtol*0.1|mtol*0.1  # resolution for automatic 3df-gen.");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("APPROXRES");
    expect(result!.valueType).toBe("formula");
    expect(result!.defaultValue).toBe("mtol*0.9|mtol*0.1|mtol*0.1");
    // mtol appears three times but must be deduplicated to one entry
    expect(result!.formulaRefs).toEqual(["mtol"]);
  });

  it("parses parameter with no description — HOLDCHECK_MODE", () => {
    const result = extractor.parseLine("*HOLDCHECK_MODE           0");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("HOLDCHECK_MODE");
    expect(result!.defaultValue).toBe(0);
    expect(result!.description).toBe("");
    expect(result!.valueType).toBe("numeric");
  });

  it("parses *COMMENT line — name present, description present", () => {
    const result = extractor.parseLine("*COMMENT                           # Comment");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("COMMENT");
    expect(result!.description).toBe("Comment");
  });

  it("parses T:Rad*1.2 formula — MACRO_SRAD_F", () => {
    const result = extractor.parseLine("*MACRO_SRAD_F       T:Rad*1.2      #  approach macro length/radius");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("MACRO_SRAD_F");
    expect(result!.valueType).toBe("formula");
    expect(result!.formulaRefs).toContain("T:Rad");
  });

  it("parses PRECISION with value 0.05", () => {
    const result = extractor.parseLine("*PRECISION                0.05     #  computation tolerance");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("PRECISION");
    expect(result!.defaultValue).toBe(0.05);
    expect(result!.valueType).toBe("numeric");
  });

  it("parses text-valued parameter (non-numeric, non-formula)", () => {
    const result = extractor.parseLine("*SOME_PARAM   identifier_value   # description text");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("SOME_PARAM");
    expect(result!.valueType).toBe("text");
    expect(result!.defaultValue).toBe("identifier_value");
    expect(result!.formulaRefs).toHaveLength(0);
  });
});

// ============================================================================
// detectFormulaRefs — unit tests
// ============================================================================

describe("HyperMillMetricCfgExtractor.detectFormulaRefs", () => {
  const extractor = new HyperMillMetricCfgExtractor(CFG_DIR);

  it("detects T:Rad in simple formula", () => {
    const refs = extractor.detectFormulaRefs("T:Rad*0.8");
    expect(refs).toEqual(["T:Rad"]);
  });

  it("detects T:Dia in formula", () => {
    const refs = extractor.detectFormulaRefs("T:Dia*0.5");
    expect(refs).toEqual(["T:Dia"]);
  });

  it("detects T:Rad*1.2 formula", () => {
    const refs = extractor.detectFormulaRefs("T:Rad*1.2");
    expect(refs).toContain("T:Rad");
    expect(refs).toHaveLength(1);
  });

  it("detects mtol in bare reference", () => {
    const refs = extractor.detectFormulaRefs("mtol");
    expect(refs).toEqual(["mtol"]);
  });

  it("deduplicates repeated mtol refs from pipe-separated value", () => {
    const refs = extractor.detectFormulaRefs("mtol*0.9|mtol*0.1|mtol*0.1");
    expect(refs).toEqual(["mtol"]);
  });

  it("detects J:Fxy reference", () => {
    const refs = extractor.detectFormulaRefs("J:Fxy");
    expect(refs).toEqual(["J:Fxy"]);
  });

  it("returns empty array for pure numeric value", () => {
    const refs = extractor.detectFormulaRefs("300");
    expect(refs).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    const refs = extractor.detectFormulaRefs("");
    expect(refs).toHaveLength(0);
  });

  it("detects T:Dia formula reference from T:Dia*0.025", () => {
    const refs = extractor.detectFormulaRefs("T:Dia*0.025");
    expect(refs).toContain("T:Dia");
  });
});

// ============================================================================
// extractFile — integration tests using real .cfg files
// ============================================================================

describe("HyperMillMetricCfgExtractor.extractFile — HMCAST.CFG", () => {
  const extractor = new HyperMillMetricCfgExtractor(CFG_DIR);
  const filePath = path.join(CFG_DIR, "HMCAST.CFG");

  it("extracts cycleType as HMCAST (filename without extension)", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.cycleType).toBe("HMCAST");
  });

  it("sourceFile is HMCAST.CFG", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.sourceFile).toBe("HMCAST.CFG");
  });

  it("parameterCount matches parameters array length", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.parameterCount).toBe(schema.parameters.length);
  });

  it("extracts exactly 52 parameters from HMCAST.CFG", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.parameterCount).toBe(52);
  });

  it("VERTZUSTEL has defaultValue 2.0 and numeric type", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "VERTZUSTEL");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(2.0);
    expect(param!.valueType).toBe("numeric");
  });

  it("AUFMASS has defaultValue 0.5", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "AUFMASS");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(0.5);
  });

  it("SICHEBENE has defaultValue 100.0", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "SICHEBENE");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(100.0);
  });

  it("FRTYP has defaultValue 3 (radius/bull endmill)", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "FRTYP");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(3);
  });

  it("PRECISION has defaultValue 0.05", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "PRECISION");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(0.05);
  });

  it("MACRO_TRAD_F is formula type with T:Rad ref", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "MACRO_TRAD_F");
    expect(param).toBeDefined();
    expect(param!.valueType).toBe("formula");
    expect(param!.formulaRefs).toContain("T:Rad");
  });

  it("APPROXRES is formula type with mtol ref (pipe-separated)", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "APPROXRES");
    expect(param).toBeDefined();
    expect(param!.valueType).toBe("formula");
    expect(param!.formulaRefs).toContain("mtol");
  });
});

describe("HyperMillMetricCfgExtractor.extractFile — hmZfin.CFG", () => {
  const extractor = new HyperMillMetricCfgExtractor(CFG_DIR);
  const filePath = path.join(CFG_DIR, "hmZfin.CFG");

  it("extracts cycleType as hmZfin (preserves mixed case)", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.cycleType).toBe("hmZfin");
  });

  it("parameterCount matches parameters array length", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.parameterCount).toBe(schema.parameters.length);
  });

  it("extracts exactly 102 parameters from hmZfin.CFG", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.parameterCount).toBe(102);
  });

  it("VERTZUSTEL has value 2.0", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "VERTZUSTEL");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(2.0);
  });

  it("FRTYP has value 1 (ball endmill — Z finishing uses ball)", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "FRTYP");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(1);
  });

  it("FILLET_RADIUS_F is formula type referencing T:Dia", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "FILLET_RADIUS_F");
    expect(param).toBeDefined();
    expect(param!.valueType).toBe("formula");
    expect(param!.formulaRefs).toContain("T:Dia");
  });

  it("all formula parameters have at least one formulaRef entry", async () => {
    const schema = await extractor.extractFile(filePath);
    const formulaParams = schema.parameters.filter(p => p.valueType === "formula");
    expect(formulaParams.length).toBeGreaterThan(0);
    for (const fp of formulaParams) {
      expect(fp.formulaRefs.length).toBeGreaterThan(0);
    }
  });
});

describe("HyperMillMetricCfgExtractor.extractFile — HMFACE.CFG", () => {
  const extractor = new HyperMillMetricCfgExtractor(CFG_DIR);
  const filePath = path.join(CFG_DIR, "HMFACE.CFG");

  it("extracts cycleType as HMFACE", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.cycleType).toBe("HMFACE");
  });

  it("parameterCount matches parameters array length", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.parameterCount).toBe(schema.parameters.length);
  });

  it("extracts exactly 24 parameters from HMFACE.CFG", async () => {
    const schema = await extractor.extractFile(filePath);
    expect(schema.parameterCount).toBe(24);
  });

  it("VERTZUSTEL has value 5.0 (different from HMCAST's 2.0)", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "VERTZUSTEL");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(5.0);
  });

  it("PRECISION has value 0.01", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "PRECISION");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(0.01);
  });

  it("CNTRES is formula type referencing mtol", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "CNTRES");
    expect(param).toBeDefined();
    expect(param!.valueType).toBe("formula");
    expect(param!.formulaRefs).toContain("mtol");
  });

  it("FRTYP has value 3 (bull/radius endmill)", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "FRTYP");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(3);
  });

  it("AUFMASS_Z has value 0.0", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "AUFMASS_Z");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(0.0);
  });

  it("SICHDIST has value 5.0", async () => {
    const schema = await extractor.extractFile(filePath);
    const param = schema.parameters.find(p => p.name === "SICHDIST");
    expect(param).toBeDefined();
    expect(param!.defaultValue).toBe(5.0);
  });
});

// ============================================================================
// extractAll — full-corpus integration tests
// ============================================================================

describe("HyperMillMetricCfgExtractor.extractAll — full corpus", () => {
  // Allow extra time for 181 files
  it("returns no parse errors when reading all 181 .cfg files", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    expect(result.errors).toHaveLength(0);
  });

  it("returns exactly 181 cycle schemas (one per .CFG file)", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    expect(result.totalCycleTypes).toBe(181);
    expect(result.schemas).toHaveLength(181);
  });

  it("returns at least 6,000 total parameters across all cycle types", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    expect(result.totalParameters).toBeGreaterThan(6000);
  });

  it("totalParameters is the arithmetic sum of all individual parameterCounts", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    const summedCount = result.schemas.reduce((s, schema) => s + schema.parameterCount, 0);
    expect(result.totalParameters).toBe(summedCount);
  });

  it("every schema has a non-empty cycleType string", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    for (const schema of result.schemas) {
      expect(schema.cycleType.length).toBeGreaterThan(0);
    }
  });

  it("every schema sourceFile ends in .CFG (case-insensitive)", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    for (const schema of result.schemas) {
      expect(schema.sourceFile.toUpperCase().endsWith(".CFG")).toBe(true);
    }
  });

  it("extractedAt is a valid ISO date string with a recent year", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    const d = new Date(result.extractedAt);
    expect(isNaN(d.getTime())).toBe(false);
    expect(d.getFullYear()).toBeGreaterThanOrEqual(2024);
  });

  it("HMCAST schema found with 52 parameters in full extraction", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    const schema = result.schemas.find(s => s.cycleType === "HMCAST");
    expect(schema).toBeDefined();
    expect(schema!.parameterCount).toBe(52);
  });

  it("hmZfin schema found with 102 parameters in full extraction", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    const schema = result.schemas.find(s => s.cycleType === "hmZfin");
    expect(schema).toBeDefined();
    expect(schema!.parameterCount).toBe(102);
  });

  it("HMFACE schema found with 24 parameters in full extraction", { timeout: 30000 }, async () => {
    const result = await hyperMillMetricCfgExtractor.extractAll();
    const schema = result.schemas.find(s => s.cycleType === "HMFACE");
    expect(schema).toBeDefined();
    expect(schema!.parameterCount).toBe(24);
  });
});

// ============================================================================
// Singleton export
// ============================================================================

describe("hyperMillMetricCfgExtractor singleton", () => {
  it("is an instance of HyperMillMetricCfgExtractor", () => {
    expect(hyperMillMetricCfgExtractor).toBeInstanceOf(HyperMillMetricCfgExtractor);
  });

  it("has the default cfgDir pointing to the hyperMILL 33.0 installation", () => {
    expect(hyperMillMetricCfgExtractor.cfgDir).toBe(
      "H:/prism/HYPERMILL/hyperMILL/33.0/Metric.cfg"
    );
  });
});

// ============================================================================
// Error handling — missing directory
// ============================================================================

describe("HyperMillMetricCfgExtractor — error handling", () => {
  it("returns empty schemas and records error when directory does not exist", async () => {
    const extractor = new HyperMillMetricCfgExtractor("/nonexistent/path/that/does/not/exist");
    const result = await extractor.extractAll();
    expect(result.schemas).toHaveLength(0);
    expect(result.totalParameters).toBe(0);
    expect(result.totalCycleTypes).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Cannot read directory");
  });

  it("extractFile throws a descriptive error for a non-existent file", async () => {
    const extractor = new HyperMillMetricCfgExtractor(CFG_DIR);
    await expect(
      extractor.extractFile("/nonexistent/path/NOPE.CFG")
    ).rejects.toThrow();
  });
});
