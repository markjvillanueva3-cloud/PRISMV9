/**
 * CADModelDimensionExtractorEngine.test.ts — CAD-DRAW-MAX-MS1/U-CAD-DIM-EXTRACT
 */

import { describe, it, expect } from "vitest";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";
import type { DrawAnyPartResult } from "../engines/CADDrawAnyPartOrchestratorEngine.js";
import {
  CADModelDimensionExtractorEngine,
  cadModelDimensionExtractorEngine,
  extractDimsFromOp,
  extractDimsFromOpLog,
  getNumericArg,
  SUPPORTED_OP_KINDS,
} from "../engines/CADModelDimensionExtractorEngine.js";

function op(kind: string, args: Record<string, unknown>): CADOperation {
  return { kind: kind as never, args };
}

function makeDraw(opLog: CADOperation[]): DrawAnyPartResult {
  return { opLog, steps: [], exportedSuccessfully: true, stopReason: "exported", iterations: opLog.length };
}

// ── getNumericArg ────────────────────────────────────────────────────────────

describe("getNumericArg", () => {
  it("returns finite number when present", () => {
    expect(getNumericArg(op("sketch_circle", { diameter: 0.5 }), "diameter")).toBe(0.5);
  });

  it("returns null for missing field", () => {
    expect(getNumericArg(op("sketch_circle", {}), "diameter")).toBeNull();
  });

  it("returns null for non-finite (NaN/Infinity/string)", () => {
    expect(getNumericArg(op("sketch_circle", { diameter: NaN }), "diameter")).toBeNull();
    expect(getNumericArg(op("sketch_circle", { diameter: Infinity }), "diameter")).toBeNull();
    expect(getNumericArg(op("sketch_circle", { diameter: "0.5abc" }), "diameter")).toBeNull();
  });

  it("returns null for malformed op", () => {
    expect(getNumericArg(null as never, "x")).toBeNull();
    expect(getNumericArg({} as never, "x")).toBeNull();
  });

  it("coerces numeric string", () => {
    expect(getNumericArg(op("sketch_circle", { diameter: "0.5" }), "diameter")).toBe(0.5);
  });
});

// ── extractDimsFromOp ────────────────────────────────────────────────────────

describe("extractDimsFromOp", () => {
  it("sketch_circle: diameter direct", () => {
    const out = extractDimsFromOp(op("sketch_circle", { diameter: 0.5 }), 0);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(0.5);
    expect(out[0].label).toBe("diameter");
  });

  it("sketch_circle: radius → diameter via transform", () => {
    const out = extractDimsFromOp(op("sketch_circle", { radius: 0.25 }), 0);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(0.5);
    expect(out[0].label).toBe("diameter");
  });

  it("sketch_rectangle: 2 dims (width + height)", () => {
    const out = extractDimsFromOp(op("sketch_rectangle", { width: 1.0, height: 0.5 }), 0);
    expect(out).toHaveLength(2);
    expect(out.map(d => d.label).sort()).toEqual(["height", "width"]);
  });

  it("feature_extrude: depth wins over distance (dedup)", () => {
    const out = extractDimsFromOp(op("feature_extrude", { depth: 0.250, distance: 0.999 }), 0);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(0.250); // first rule (depth) wins
  });

  it("feature_extrude: distance used when depth missing", () => {
    const out = extractDimsFromOp(op("feature_extrude", { distance: 0.125 }), 0);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(0.125);
  });

  it("feature_hole: extracts both diameter + depth", () => {
    const out = extractDimsFromOp(op("feature_hole", { diameter: 0.281, depth: 0.500 }), 0);
    expect(out).toHaveLength(2);
    const byLabel = Object.fromEntries(out.map(d => [d.label, d.value]));
    expect(byLabel["hole-diameter"]).toBe(0.281);
    expect(byLabel["hole-depth"]).toBe(0.5);
  });

  it("feature_thread: extracts diameter + pitch", () => {
    const out = extractDimsFromOp(op("feature_thread", { diameter: 0.375, pitch: 0.0625 }), 0);
    expect(out).toHaveLength(2);
  });

  it("unknown op kind → empty array", () => {
    expect(extractDimsFromOp(op("unknown_kind", { x: 1 }), 0)).toEqual([]);
  });

  it("missing field → silent skip (no dim emitted)", () => {
    expect(extractDimsFromOp(op("sketch_circle", {}), 0)).toEqual([]);
  });

  it("malformed op → empty array", () => {
    expect(extractDimsFromOp(null as never, 0)).toEqual([]);
    expect(extractDimsFromOp({ kind: 123 } as never, 0)).toEqual([]);
  });

  it("ids are stable + padded (DIM-NNN-label)", () => {
    const out = extractDimsFromOp(op("sketch_rectangle", { width: 1, height: 2 }), 4);
    expect(out[0].id).toMatch(/^DIM-005-/);
  });
});

// ── extractDimsFromOpLog ─────────────────────────────────────────────────────

describe("extractDimsFromOpLog", () => {
  it("empty log → empty dims", () => {
    expect(extractDimsFromOpLog([])).toEqual([]);
  });

  it("non-array → empty dims (defensive)", () => {
    expect(extractDimsFromOpLog(null as never)).toEqual([]);
  });

  it("realistic 4-op program: circle + extrude + hole + fillet → 4 dims (1+1+2+1)", () => {
    const log: CADOperation[] = [
      op("sketch_circle", { diameter: 0.500 }),
      op("feature_extrude", { depth: 1.250 }),
      op("feature_hole", { diameter: 0.125, depth: 0.500 }),
      op("sketch_fillet", { radius: 0.030 }),
    ];
    const out = extractDimsFromOpLog(log);
    expect(out).toHaveLength(5);
    expect(out.map(d => d.label)).toEqual([
      "diameter", "extrude-depth", "hole-diameter", "hole-depth", "fillet-radius",
    ]);
  });

  it("op order is preserved + ids are unique", () => {
    const log: CADOperation[] = [
      op("sketch_circle", { diameter: 0.5 }),
      op("sketch_circle", { diameter: 0.25 }),
    ];
    const out = extractDimsFromOpLog(log);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe("DIM-001-diameter");
    expect(out[1].id).toBe("DIM-002-diameter");
    expect(new Set(out.map(d => d.id)).size).toBe(2);
  });

  it("deterministic across repeated calls", () => {
    const log: CADOperation[] = [
      op("sketch_rectangle", { width: 1, height: 0.5 }),
      op("feature_extrude", { depth: 0.25 }),
    ];
    expect(extractDimsFromOpLog(log)).toEqual(extractDimsFromOpLog(log));
  });
});

// ── Engine ───────────────────────────────────────────────────────────────────

describe("CADModelDimensionExtractorEngine.extract", () => {
  it("empty draw → empty dims", async () => {
    const eng = new CADModelDimensionExtractorEngine();
    const out = await eng.extract(makeDraw([]));
    expect(out).toEqual([]);
  });

  it("realistic draw → expected dim count", async () => {
    const eng = new CADModelDimensionExtractorEngine();
    const out = await eng.extract(makeDraw([
      op("sketch_circle", { diameter: 0.5 }),
      op("feature_extrude", { depth: 1.0 }),
    ]));
    expect(out).toHaveLength(2);
  });

  it("non-draw input → empty dims (defensive)", async () => {
    const eng = new CADModelDimensionExtractorEngine();
    expect(await eng.extract(null as never)).toEqual([]);
    expect(await eng.extract({ opLog: "not-an-array" } as never)).toEqual([]);
  });

  it("singleton instance is the engine class", () => {
    expect(cadModelDimensionExtractorEngine).toBeInstanceOf(CADModelDimensionExtractorEngine);
  });
});

describe("SUPPORTED_OP_KINDS catalog", () => {
  it("covers expected op categories (sketch + feature)", () => {
    expect(SUPPORTED_OP_KINDS).toContain("sketch_circle");
    expect(SUPPORTED_OP_KINDS).toContain("sketch_rectangle");
    expect(SUPPORTED_OP_KINDS).toContain("feature_extrude");
    expect(SUPPORTED_OP_KINDS).toContain("feature_hole");
    expect(SUPPORTED_OP_KINDS).toContain("feature_thread");
  });

  it("catalog is frozen", () => {
    expect(Object.isFrozen(SUPPORTED_OP_KINDS)).toBe(true);
  });
});
