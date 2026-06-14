/**
 * CADPrintRegeneratorEngine.test.ts — CAD-DRAW-MAX-MS1/U-PRINT-REGEN-LIVE
 */

import { describe, it, expect } from "vitest";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";
import type { DrawAnyPartResult } from "../engines/CADDrawAnyPartOrchestratorEngine.js";
import {
  CADPrintRegeneratorEngine,
  cadPrintRegeneratorEngine,
  groupDimsByLabel,
  renderRegeneratedPrintMarkdown,
} from "../engines/CADPrintRegeneratorEngine.js";

function op(kind: string, args: Record<string, unknown>): CADOperation {
  return { kind: kind as never, args };
}

function makeDraw(opLog: CADOperation[], overrides: Partial<DrawAnyPartResult> = {}): DrawAnyPartResult {
  return {
    opLog,
    steps: [],
    exportedSuccessfully: overrides.exportedSuccessfully ?? true,
    stopReason: overrides.stopReason ?? "exported",
    iterations: overrides.iterations ?? opLog.length + 1,
  };
}

// ── groupDimsByLabel ─────────────────────────────────────────────────────────

describe("groupDimsByLabel", () => {
  it("groups dims by their label field", () => {
    const dims = [
      { id: "d1", label: "diameter", value: 0.5, unit: "in" },
      { id: "d2", label: "diameter", value: 0.25, unit: "in" },
      { id: "d3", label: "width", value: 1.0, unit: "in" },
    ];
    const out = groupDimsByLabel(dims);
    expect(out["diameter"]).toHaveLength(2);
    expect(out["width"]).toHaveLength(1);
  });

  it("empty input → empty object", () => {
    expect(groupDimsByLabel([])).toEqual({});
  });
});

// ── renderRegeneratedPrintMarkdown ───────────────────────────────────────────

describe("renderRegeneratedPrintMarkdown", () => {
  const meta = { stopReason: "exported", iterations: 5, opCount: 3, exportedSuccessfully: true };

  it("renders title block + dim table + group view", () => {
    const dims = [
      { id: "d1", label: "diameter", value: 0.500, unit: "in" },
      { id: "d2", label: "width", value: 1.000, unit: "in" },
    ];
    const md = renderRegeneratedPrintMarkdown(dims, meta);
    expect(md).toContain("# Regenerated Print");
    expect(md).toContain("Total dimensions: 2");
    expect(md).toContain("| d1 | diameter | 0.5000 | in |");
    expect(md).toContain("| d2 | width | 1.0000 | in |");
    expect(md).toContain("**diameter**");
    expect(md).toContain("**width**");
  });

  it("empty dims → placeholder copy + 'no dims' marker", () => {
    const md = renderRegeneratedPrintMarkdown([], { ...meta, opCount: 0 });
    expect(md).toContain("Total dimensions: 0");
    expect(md).toContain("_(no dimensions extracted)_");
    expect(md).toContain("_(no labeled dimensions)_");
  });

  it("renders asymmetric tolerance in table", () => {
    const dims = [
      { id: "d1", label: "OD", value: 0.500, unit: "in", tolerance: { lower: -0.0005, upper: 0.0005 } },
    ];
    const md = renderRegeneratedPrintMarkdown(dims, meta);
    expect(md).toContain("-0.0005 / 0.0005");
  });

  it("renders em-dash when no tolerance", () => {
    const dims = [{ id: "d1", label: "OD", value: 0.5, unit: "in" }];
    const md = renderRegeneratedPrintMarkdown(dims, meta);
    expect(md).toContain("| — |");
  });

  it("flags non-exported draws in title block", () => {
    const md = renderRegeneratedPrintMarkdown([], { stopReason: "max-ops", iterations: 15, opCount: 0, exportedSuccessfully: false });
    expect(md).toContain("Exported successfully: NO");
    expect(md).toContain("Stop reason: max-ops");
  });

  it("sorts group-view labels alphabetically (deterministic)", () => {
    const dims = [
      { id: "d1", label: "zebra", value: 1, unit: "in" },
      { id: "d2", label: "alpha", value: 2, unit: "in" },
      { id: "d3", label: "mike", value: 3, unit: "in" },
    ];
    const md = renderRegeneratedPrintMarkdown(dims, meta);
    const alphaIdx = md.indexOf("**alpha**");
    const mikeIdx = md.indexOf("**mike**");
    const zebraIdx = md.indexOf("**zebra**");
    expect(alphaIdx).toBeGreaterThan(-1);
    expect(alphaIdx).toBeLessThan(mikeIdx);
    expect(mikeIdx).toBeLessThan(zebraIdx);
  });
});

// ── Engine.regenerate ────────────────────────────────────────────────────────

describe("CADPrintRegeneratorEngine.regenerate", () => {
  it("regenerates print from realistic 3-op draw", async () => {
    const eng = new CADPrintRegeneratorEngine();
    const out = await eng.regenerate(makeDraw([
      op("sketch_circle", { diameter: 0.500 }),
      op("feature_extrude", { depth: 1.250 }),
      op("sketch_fillet", { radius: 0.030 }),
    ]));
    expect(out.dimensions).toHaveLength(3);
    expect(out.markdownSummary).toContain("Total dimensions: 3");
    expect(out.schemaVersion).toBe(1);
    expect(out.sourceMeta.opCount).toBe(3);
    expect(out.sourceMeta.exportedSuccessfully).toBe(true);
  });

  it("non-exported draw still produces a regenerated print (with sourceMeta flag)", async () => {
    const eng = new CADPrintRegeneratorEngine();
    const out = await eng.regenerate(makeDraw([], { exportedSuccessfully: false, stopReason: "max-ops", iterations: 15 }));
    expect(out.sourceMeta.exportedSuccessfully).toBe(false);
    expect(out.sourceMeta.stopReason).toBe("max-ops");
    expect(out.markdownSummary).toContain("Exported successfully: NO");
  });

  it("defensive: null draw → empty regenerated print (no throw)", async () => {
    const eng = new CADPrintRegeneratorEngine();
    const out = await eng.regenerate(null as never);
    expect(out.dimensions).toEqual([]);
    expect(out.sourceMeta.opCount).toBe(0);
    expect(out.sourceMeta.exportedSuccessfully).toBe(false);
  });

  it("source meta op count matches input opLog length", async () => {
    const eng = new CADPrintRegeneratorEngine();
    const opLog = [op("sketch_circle", { diameter: 0.5 }), op("feature_extrude", { depth: 1 })];
    const out = await eng.regenerate(makeDraw(opLog));
    expect(out.sourceMeta.opCount).toBe(2);
  });

  it("deterministic: same input → same regenerated print", async () => {
    const eng = new CADPrintRegeneratorEngine();
    const draw = makeDraw([op("sketch_circle", { diameter: 0.5 })]);
    const a = await eng.regenerate(draw);
    const b = await eng.regenerate(draw);
    expect(a.dimensions).toEqual(b.dimensions);
    expect(a.markdownSummary).toBe(b.markdownSummary);
  });
});

// ── Engine.generate (printGenerator contract) ────────────────────────────────

describe("CADPrintRegeneratorEngine.generate (round-trip contract)", () => {
  it("returns only the dim list (matching printGenerator interface)", async () => {
    const eng = new CADPrintRegeneratorEngine();
    const dims = await eng.generate(makeDraw([
      op("sketch_rectangle", { width: 1.0, height: 0.5 }),
    ]));
    expect(Array.isArray(dims)).toBe(true);
    expect(dims).toHaveLength(2);
  });

  it("singleton instance is the engine class", () => {
    expect(cadPrintRegeneratorEngine).toBeInstanceOf(CADPrintRegeneratorEngine);
  });
});
