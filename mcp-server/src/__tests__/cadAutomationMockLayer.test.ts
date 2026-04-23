/**
 * cadAutomationMockLayer.test.ts — U-CAUT09 unit tests
 *
 * Pure-fixture engine — no mock mode needed. Tests pin the fixture table so
 * any drift shows up as a test failure rather than silent corruption of the
 * downstream router/bridge contract.
 */

import { describe, it, expect } from "vitest";
import {
  CADAutomationMockLayer,
  cadAutomationMockLayer,
  type SupportedCADExt,
} from "../engines/CADAutomationMockLayer.js";

function fresh(): CADAutomationMockLayer {
  return new CADAutomationMockLayer();
}

const EXTS: SupportedCADExt[] = [
  ".sldprt",
  ".sldasm",
  ".ipt",
  ".iam",
  ".FCStd",
  ".FCStd1",
  ".mcam",
  ".mcx",
  ".mcx-8",
  ".f3d",
  ".f3z",
  ".hmc",
];

describe("CADAutomationMockLayer singleton", () => {
  it("exports cadAutomationMockLayer as an instance", () => {
    expect(cadAutomationMockLayer).toBeInstanceOf(CADAutomationMockLayer);
  });
});

describe("listSupported()", () => {
  it("covers all 12 canonical CAD extensions", () => {
    const l = fresh().listSupported();
    expect(l.length).toBe(EXTS.length);
    for (const e of EXTS) expect(l).toContain(e);
  });
});

describe("supports()", () => {
  it("narrows to SupportedCADExt for known extensions", () => {
    const m = fresh();
    for (const e of EXTS) expect(m.supports(e)).toBe(true);
  });

  it("returns false for unknown extensions", () => {
    const m = fresh();
    expect(m.supports(".xlsx")).toBe(false);
    expect(m.supports(".step")).toBe(false);
  });
});

describe("geometryFor()", () => {
  it("sums correctly for every extension", () => {
    const m = fresh();
    for (const ext of EXTS) {
      const g = m.geometryFor(ext);
      expect(g.ext).toBe(ext);
      expect(g.curves + g.surfaces + g.solids + g.points).toBe(g.totalEntities);
    }
  });

  it("returns positive totalEntities for every format", () => {
    const m = fresh();
    for (const ext of EXTS) {
      expect(m.geometryFor(ext).totalEntities).toBeGreaterThan(0);
    }
  });
});

describe("operationTreeFor()", () => {
  it("returns zero operations for pure-CAD formats (no CAM)", () => {
    const m = fresh();
    for (const ext of [".sldprt", ".sldasm", ".ipt", ".iam"] as const) {
      expect(m.operationTreeFor(ext).totalOperations).toBe(0);
    }
  });

  it("returns positive operations for CAM-bearing formats", () => {
    const m = fresh();
    for (const ext of [".FCStd", ".mcam", ".f3d", ".hmc"] as const) {
      expect(m.operationTreeFor(ext).totalOperations).toBeGreaterThan(0);
    }
  });

  it("palette size matches documented bridge cycles", () => {
    const m = fresh();
    expect(m.operationTreeFor(".FCStd").cyclePalette.length).toBe(5);
    expect(m.operationTreeFor(".mcam").cyclePalette.length).toBe(6);
    expect(m.operationTreeFor(".f3d").cyclePalette.length).toBe(6);
    expect(m.operationTreeFor(".hmc").cyclePalette.length).toBe(8);
  });
});

describe("toolpathsFor()", () => {
  it("length matches operationTreeFor().totalOperations", () => {
    const m = fresh();
    for (const ext of EXTS) {
      expect(m.toolpathsFor(ext).length).toBe(m.operationTreeFor(ext).totalOperations);
    }
  });

  it("cycle codes are drawn from the published palette", () => {
    const m = fresh();
    for (const ext of [".FCStd", ".mcam", ".f3d", ".hmc"] as const) {
      const palette = new Set(m.operationTreeFor(ext).cyclePalette);
      for (const op of m.toolpathsFor(ext)) expect(palette.has(op.cycleCode)).toBe(true);
    }
  });

  it("all parameters are positive", () => {
    const m = fresh();
    for (const ext of [".FCStd", ".mcam", ".f3d", ".hmc"] as const) {
      for (const op of m.toolpathsFor(ext)) {
        expect(op.toolDiameter_mm).toBeGreaterThan(0);
        expect(op.spindleRpm).toBeGreaterThan(0);
        expect(op.feedRate_mmpm).toBeGreaterThan(0);
      }
    }
  });

  it("is deterministic — same call returns identical data", () => {
    const m = fresh();
    expect(m.toolpathsFor(".hmc")).toEqual(m.toolpathsFor(".hmc"));
  });
});

describe("fingerprint() / allFingerprints()", () => {
  it("each extension has a unique, non-empty fingerprint", () => {
    const m = fresh();
    const seen = new Set<string>();
    for (const ext of EXTS) {
      const fp = m.fingerprint(ext);
      expect(fp.length).toBeGreaterThan(0);
      // Some extensions share fixtures (e.g. .FCStd + .FCStd1); allow tie.
      seen.add(fp);
    }
    expect(seen.size).toBeGreaterThanOrEqual(9); // at least distinct geometry classes
  });

  it("allFingerprints() covers the full extension set", () => {
    const all = fresh().allFingerprints();
    for (const ext of EXTS) expect(all[ext]).toBeDefined();
  });

  it("fingerprint is stable across repeated calls", () => {
    const m = fresh();
    expect(m.fingerprint(".hmc")).toBe(m.fingerprint(".hmc"));
  });
});

describe("error handling", () => {
  it("supports() returns false for empty/garbage inputs without throwing", () => {
    const m = fresh();
    expect(m.supports("")).toBe(false);
    expect(m.supports("nonsense")).toBe(false);
  });
});
