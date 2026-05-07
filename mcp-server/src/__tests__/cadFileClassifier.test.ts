/**
 * cadFileClassifier.test.ts — U-CINF02 unit tests
 *
 * Covers:
 *   1. Empty input → totalFiles = 0, both histograms empty
 *   2. All 6 categories represented across 12 sample files
 *   3. Deterministic: same input → identical classifications (modulo generatedAt)
 *   4. Mastercam legacy (.MCX) vs modern (.mcx-8) both classify as cam
 *   5. Drawing formats (.slddrw/.idw) map to open_drawing
 *   6. Assembly formats (.sldasm/.iam) map to open_assembly
 *   7. Neutral formats (.step/.stp/.iges/.igs/.stl) map to import_neutral
 *   8. Parasolid (.x_t/.x_b) maps to import_kernel
 *   9. Handler lookup points to correct bridge per format
 *  10. classifyOne() surfaces category + strategy
 *  11. includeClassifications=false returns histograms only
 *  12. Unknown format gracefully returns {category:'unknown', strategy:'skip'}
 *  13. Schema parse survives valid output
 */

import { describe, it, expect } from "vitest";
import {
  CADFileClassifierEngine,
  classifyFormat,
  cadFileClassifierEngine,
} from "../engines/CADFileClassifierEngine.js";
import type { CADFileEntry } from "../schemas/cadFileIndexSchema.js";
import { ClassificationSummarySchema } from "../schemas/cadFileClassificationSchema.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function mkEntry(fileId: string, format: CADFileEntry["format"]): CADFileEntry {
  return {
    fileId: fileId.padEnd(64, "0").slice(0, 64),
    absolutePath: `H:/test/${fileId}${format}`,
    format,
    sizeBytes: 123456,
    customer: "ALCOA",
    machineCategory: "mill",
    complexityHint: "moderate",
    lastModified: "2026-04-19T00:00:00.000Z",
  };
}

const SAMPLE_FILES: CADFileEntry[] = [
  mkEntry("sw-part",    ".sldprt"),
  mkEntry("sw-asm",     ".sldasm"),
  mkEntry("sw-drw",     ".slddrw"),
  mkEntry("inv-part",   ".ipt"),
  mkEntry("inv-asm",    ".iam"),
  mkEntry("inv-drw",    ".idw"),
  mkEntry("fc-part",    ".FCStd"),
  mkEntry("f3d-part",   ".f3d"),
  mkEntry("mcx8-cam",   ".mcx-8"),
  mkEntry("mcx-cam",    ".MCX"),
  mkEntry("hmc-cam",    ".hmc"),
  mkEntry("step-neu",   ".step"),
  mkEntry("iges-neu",   ".iges"),
  mkEntry("stl-neu",    ".stl"),
  mkEntry("xt-kernel",  ".x_t"),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CADFileClassifierEngine", () => {
  const engine = new CADFileClassifierEngine();

  it("handles empty input", () => {
    const out = engine.classify([]);
    expect(out.totalFiles).toBe(0);
    expect(out.classifications).toEqual([]);
    expect(out.byCategory).toEqual({});
    expect(out.byStrategy).toEqual({});
  });

  it("classifies all 6 categories from 15 sample files", () => {
    const out = engine.classify(SAMPLE_FILES);
    expect(out.totalFiles).toBe(15);
    expect(out.byCategory.part).toBe(4);      // sldprt, ipt, FCStd, f3d
    expect(out.byCategory.assembly).toBe(2);  // sldasm, iam
    expect(out.byCategory.drawing).toBe(2);   // slddrw, idw
    expect(out.byCategory.cam).toBe(3);       // mcx-8, MCX, hmc
    expect(out.byCategory.neutral).toBe(3);   // step, iges, stl
    expect(out.byCategory.kernel).toBe(1);    // x_t
  });

  it("produces deterministic classification order", () => {
    const a = engine.classify(SAMPLE_FILES);
    const b = engine.classify(SAMPLE_FILES);
    expect(a.classifications.map((c) => c.category))
      .toEqual(b.classifications.map((c) => c.category));
    expect(a.classifications.map((c) => c.testStrategy))
      .toEqual(b.classifications.map((c) => c.testStrategy));
  });

  it("maps Mastercam legacy and modern formats to cam", () => {
    expect(classifyFormat(".MCX").category).toBe("cam");
    expect(classifyFormat(".mcx-8").category).toBe("cam");
    expect(classifyFormat(".mcam").category).toBe("cam");
  });

  it("maps drawing formats to open_drawing", () => {
    expect(classifyFormat(".slddrw").testStrategy).toBe("open_drawing");
    expect(classifyFormat(".idw").testStrategy).toBe("open_drawing");
  });

  it("maps assembly formats to open_assembly", () => {
    expect(classifyFormat(".sldasm").testStrategy).toBe("open_assembly");
    expect(classifyFormat(".iam").testStrategy).toBe("open_assembly");
  });

  it("maps neutral formats to import_neutral", () => {
    for (const f of [".step", ".stp", ".iges", ".igs", ".stl"] as const) {
      expect(classifyFormat(f).testStrategy).toBe("import_neutral");
      expect(classifyFormat(f).category).toBe("neutral");
    }
  });

  it("maps Parasolid formats to import_kernel", () => {
    for (const f of [".x_t", ".x_b"] as const) {
      expect(classifyFormat(f).testStrategy).toBe("import_kernel");
      expect(classifyFormat(f).category).toBe("kernel");
    }
  });

  it("points each format at its native bridge handler", () => {
    expect(classifyFormat(".sldprt").handler).toBe("SolidWorksAutomationBridge");
    expect(classifyFormat(".ipt").handler).toBe("InventorAutomationBridge");
    expect(classifyFormat(".FCStd").handler).toBe("FCStdNativeParserEngine");
    expect(classifyFormat(".f3d").handler).toBe("F3DSQLiteParserEngine");
    expect(classifyFormat(".mcx-8").handler).toBe("MastercamAutomationBridge");
    expect(classifyFormat(".hmc").handler).toBe("HyperMILLAutomationBridge");
  });

  it("classifyOne surfaces category + strategy", () => {
    const result = engine.classifyOne(".sldprt");
    expect(result.category).toBe("part");
    expect(result.testStrategy).toBe("open_part");
    expect(result.handler).toBe("SolidWorksAutomationBridge");
  });

  it("omits classifications list when includeClassifications=false", () => {
    const out = engine.classify(SAMPLE_FILES, { includeClassifications: false });
    expect(out.classifications).toEqual([]);
    // Histograms still populated
    expect(out.byCategory.part).toBe(4);
    expect(out.totalFiles).toBe(15);
  });

  it("classifies unknown formats safely", () => {
    const result = classifyFormat(".zzz_unknown");
    expect(result.category).toBe("unknown");
    expect(result.testStrategy).toBe("skip");
    expect(result.handler).toBeUndefined();
  });

  it("output conforms to ClassificationSummarySchema", () => {
    const out = engine.classify(SAMPLE_FILES);
    expect(() => ClassificationSummarySchema.parse(out)).not.toThrow();
  });

  it("executes via BaseEngine.execute with index wrapper", async () => {
    const result = await engine.execute({
      index: {
        schemaVersion: 1,
        generatedAt: "2026-04-19T00:00:00.000Z",
        rootPaths: [],
        totalFiles: SAMPLE_FILES.length,
        byFormat: {},
        byMachineCategory: {},
        byCustomer: {},
        files: SAMPLE_FILES,
      },
    });
    expect(result.success).toBe(true);
    const data = result.data as { totalFiles: number };
    expect(data.totalFiles).toBe(15);
  });

  it("execute returns validation error on empty input", async () => {
    const result = await engine.execute({});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/files|index/);
  });

  it("singleton cadFileClassifierEngine is usable", () => {
    const out = cadFileClassifierEngine.classify([mkEntry("t", ".sldprt")]);
    expect(out.totalFiles).toBe(1);
    expect(out.classifications[0].category).toBe("part");
  });
});
