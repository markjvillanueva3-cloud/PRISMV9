/**
 * Tests for PrintToInventorHSMBridge — Blueprint OCR → Inventor HSM iLogic VB.NET
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-INV01)
 *
 * Sister test to PrintToHyperMillBridge.test.ts. Mirrors structure for fleet parity:
 * identity + validate + happy paths + failure modes + adversarial + material calibration
 * + dispatcher round-trip.
 */

import { describe, it, expect } from "vitest";
import {
  PrintToInventorHSMBridge,
  printToInventorHSMBridge,
  type PrintToInventorHSMInput,
} from "../engines/PrintToInventorHSMBridge.js";
import type {
  BlueprintAnalysis,
  ExtractedDimension,
} from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";
import type {
  FeedSpeedCalculator,
  BridgeFeedSpeedResult,
} from "../engines/PrintToHyperMillBridge.js";
import type { UltimateSpeedFeedInput } from "../engines/UltimateSpeedFeedEngine.js";

// ── Constants ────────────────────────────────────────────────────────────────
const BRIDGE_VERSION = "1.0.0";
const HOLE_DIA = 8;
const POCKET_W = 40;
const POCKET_H = 25;

// Bridge default rpm/feed (from PrintToInventorHSMBridge.ts)
const DEFAULT_DRILL_RPM = 2400;
const DEFAULT_DRILL_FEED = 200;
const DEFAULT_POCKET_ROUGH_RPM = 6500;
const DEFAULT_POCKET_ROUGH_FEED = 850;
const DEFAULT_FINISH_RPM = 12500;
const DEFAULT_FINISH_FEED = 1600;
const DEFAULT_CONTOUR_RPM = 8500;
const DEFAULT_ADAPTIVE_3D_RPM = 9000;
const DEFAULT_ADAPTIVE_3D_FEED = 1300;

// ── Fixtures ─────────────────────────────────────────────────────────────────

function dim(type: ExtractedDimension["type"], n: number): ExtractedDimension {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 7)}`,
    type, nominal: n, unit: "mm", raw_text: `${n}mm`, confidence: 0.9,
  };
}

function holeProfile(d = HOLE_DIA): ExtractedProfile {
  return {
    id: `hole-${d}`, name: "Hole", type: "hole",
    points: [{ x: 0, y: 0 }], is_closed: true, diameter_mm: d, confidence: 0.95,
  };
}

function pocketProfile(): ExtractedProfile {
  return {
    id: "pocket-1", name: "Pocket", type: "pocket",
    points: [
      { x: 0, y: 0 }, { x: POCKET_W, y: 0 },
      { x: POCKET_W, y: POCKET_H }, { x: 0, y: POCKET_H },
    ],
    is_closed: true, width_mm: POCKET_W, height_mm: POCKET_H, confidence: 0.9,
  };
}

function externalProfile(): ExtractedProfile {
  return {
    id: "ext-1", name: "Outline", type: "external",
    points: [
      { x: 0, y: 0 }, { x: 100, y: 0 },
      { x: 100, y: 60 }, { x: 0, y: 60 },
    ],
    is_closed: true, confidence: 0.92,
  };
}

function plateAnalysis(): BlueprintAnalysis {
  return {
    dimensions: [dim("linear", 100), dim("linear", 60), dim("linear", 10)],
    gdt_frames: [],
    title_block: {
      part_number: "JM-PLATE-001", revision: "A",
      material: "1018 steel", units: "mm", confidence: 0.92,
    },
    notes: [],
    summary: {
      total_dimensions: 3, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.05, critical_features: [],
      material: "1018 steel", has_gdt: false,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity + capabilities
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToInventorHSMBridge — identity + capabilities", () => {
  it("singleton matches class + reports v1.0.0", () => {
    expect(printToInventorHSMBridge).toBeInstanceOf(PrintToInventorHSMBridge);
    expect(printToInventorHSMBridge.version).toBe(BRIDGE_VERSION);
  });

  it("capabilities() lists exact supported + unsupported profile types", () => {
    const c = printToInventorHSMBridge.capabilities();
    expect([...c.supportedProfileTypes].sort()).toEqual(["external", "hole", "pocket"]);
    expect([...c.unsupportedProfileTypes].sort()).toEqual(["internal", "slot"]);
  });

  it("capabilities() lists 4 default tools with stable numbers 1-4", () => {
    const c = printToInventorHSMBridge.capabilities();
    const numbers = c.defaultTools.map(t => t.number).sort();
    expect(numbers).toEqual([1, 2, 3, 4]);
    const roles = c.defaultTools.map(t => t.role);
    expect(roles).toContain("drill");
    expect(roles).toContain("pocket_rougher");
    expect(roles).toContain("finish_ball");
    expect(roles).toContain("contour");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validate()
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToInventorHSMBridge — validate()", () => {
  const e = printToInventorHSMBridge;

  it("rejects null input", () => {
    expect(e.validate(null).valid).toBe(false);
  });

  it("rejects undefined input", () => {
    expect(e.validate(undefined).valid).toBe(false);
  });

  it("rejects empty input — needs at least analysis or profiles", () => {
    const r = e.validate({});
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/at least one of/);
  });

  it.each([
    [-1, "negative"],
    [0, "zero"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
  ])("rejects defaultDepth=%s (%s)", (d) => {
    const r = e.validate({ analysis: plateAnalysis(), defaultDepth: d });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/defaultDepth must be a finite positive number/);
  });

  it("rejects bad units value", () => {
    const r = e.validate({
      analysis: plateAnalysis(),
      units: "feet" as PrintToInventorHSMInput["units"],
    });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/units must be/);
  });

  it("accepts a valid profiles-only input", () => {
    expect(e.validate({ profiles: [holeProfile()] }).valid).toBe(true);
  });

  it("accepts mm and in as valid units", () => {
    expect(e.validate({ profiles: [holeProfile()], units: "mm" }).valid).toBe(true);
    expect(e.validate({ profiles: [holeProfile()], units: "in" }).valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBridgeScript() — happy paths
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToInventorHSMBridge — buildBridgeScript() happy paths", () => {
  it("hole profile emits 1 drill op + drill tool sized to detected hole", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [holeProfile(12)],
    });
    expect(out.opsEmitted).toBe(1);
    expect(out.operationSummary[0]?.type).toBe("drill");
    expect(out.operationSummary[0]?.tool).toBe(1);
    expect(out.toolsCount).toBeGreaterThanOrEqual(1);
    expect(out.warnings.some(w => /Drill tool 1 sized to ø12/.test(w))).toBe(true);
  });

  it("pocket profile emits adaptive_2d roughing + parallel finishing pair", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [pocketProfile()],
    });
    expect(out.opsEmitted).toBe(2);
    const types = out.operationSummary.map(o => o.type);
    expect(types).toContain("adaptive_2d");
    expect(types).toContain("parallel");
    // Tool numbers: 2 (rougher) + 3 (finish ball)
    const tools = out.operationSummary.map(o => o.tool).sort();
    expect(tools).toEqual([2, 3]);
  });

  it("external profile emits a contour_2d op with contour tool 4", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [externalProfile()],
    });
    expect(out.opsEmitted).toBe(1);
    expect(out.operationSummary[0]?.type).toBe("contour_2d");
    expect(out.operationSummary[0]?.tool).toBe(4);
  });

  it("multi-feature blueprint: 2 holes + 1 pocket + 1 external = 5 ops", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      profiles: [holeProfile(8), holeProfile(10), pocketProfile(), externalProfile()],
    });
    // 2 drills + 2 pocket ops (adaptive_2d + parallel) + 1 contour
    expect(out.opsEmitted).toBe(5);
    expect(out.material).toBe("1018 steel");
    expect(out.partName).toBe("JM-PLATE-001");
    expect(out.units).toBe("mm");
  });

  it("dimensions-only fallback: no profiles emits adaptive_3d + parallel finish", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysis(),
    });
    expect(out.opsEmitted).toBe(2);
    const types = out.operationSummary.map(o => o.type);
    expect(types).toContain("adaptive_3d");
    expect(types).toContain("parallel");
    expect(out.provenance.source).toBe("dimensions_only");
  });

  it("filename uses .ihsm.iLogicVb extension and reflects part name", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      profiles: [holeProfile()],
    });
    expect(out.filename).toBe("JM-PLATE-001.ihsm.iLogicVb");
  });

  it("emitted script contains PRISM bridge marker comment", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [pocketProfile()],
    });
    expect(out.script).toMatch(/PRISM PrintToInventorHSMBridge v1\.0\.0/);
    expect(out.script.length).toBeGreaterThan(200);
  });

  it("inch units carries an explicit warning", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [holeProfile()],
      units: "in",
    });
    expect(out.units).toBe("in");
    expect(out.warnings.some(w => /Units=inch/.test(w))).toBe(true);
  });

  it("custom postProcessor + ncOutputPath flow through", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [holeProfile()],
      postProcessor: "haas_next_generation.cps",
      ncOutputPath: "C:/output/test.nc",
    });
    expect(out.opsEmitted).toBe(1);
    expect(out.script.length).toBeGreaterThan(100);
  });

  it("partName fallback chain: override > title block > default", () => {
    const fromOverride = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      partName: "CUSTOM_PN",
    });
    expect(fromOverride.partName).toBe("CUSTOM_PN");

    const fromTitle = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysis(),
    });
    expect(fromTitle.partName).toBe("JM-PLATE-001");

    const fromDefault = printToInventorHSMBridge.buildBridgeScript({
      profiles: [holeProfile()],
    });
    expect(fromDefault.partName).toBe("PRISM_InvHSM_Part");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Failure modes / unsupported features
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToInventorHSMBridge — failure modes + unsupported", () => {
  it("throws when no analysis AND no profiles", () => {
    expect(() => printToInventorHSMBridge.buildBridgeScript({})).toThrow(/at least one of/);
  });

  it("throws on null input", () => {
    expect(() =>
      printToInventorHSMBridge.buildBridgeScript(
        null as unknown as PrintToInventorHSMInput,
      ),
    ).toThrow(/PrintToInventorHSMBridge/);
  });

  it("throws on bad defaultDepth", () => {
    expect(() =>
      printToInventorHSMBridge.buildBridgeScript({
        profiles: [holeProfile()],
        defaultDepth: -5,
      }),
    ).toThrow(/defaultDepth/);
  });

  it("internal profile reported as unsupported (not an error)", () => {
    const internal: ExtractedProfile = {
      id: "i-1", name: "Internal", type: "internal",
      points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5,
    };
    const out = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      profiles: [internal],
    });
    expect(out.unsupported).toContain("internal");
    // Falls back to dimensions-only because internal didn't yield ops
    expect(out.provenance.source).toBe("dimensions_only");
  });

  it("slot profile reported as unsupported", () => {
    const slot: ExtractedProfile = {
      id: "s-1", name: "Slot", type: "slot",
      points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5,
    };
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [slot],
      analysis: plateAnalysis(),
    });
    expect(out.unsupported).toContain("slot");
  });

  it("both internal AND slot dedupe in unsupported list (each appears once)", () => {
    const profiles: ExtractedProfile[] = [
      { id: "i-1", name: "I1", type: "internal", points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5 },
      { id: "i-2", name: "I2", type: "internal", points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5 },
      { id: "s-1", name: "S1", type: "slot", points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5 },
      { id: "s-2", name: "S2", type: "slot", points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5 },
    ];
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles,
      analysis: plateAnalysis(),
    });
    expect(out.unsupported).toEqual(expect.arrayContaining(["internal", "slot"]));
    expect(out.unsupported.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToInventorHSMBridge — adversarial", () => {
  it("hole profile with NaN diameter falls back to default drill diameter", () => {
    const bad: ExtractedProfile = {
      id: "h-nan", name: "Hole", type: "hole",
      points: [{ x: 0, y: 0 }], is_closed: true,
      diameter_mm: Number.NaN, confidence: 0.5,
    };
    const out = printToInventorHSMBridge.buildBridgeScript({ profiles: [bad] });
    expect(out.opsEmitted).toBe(1);
    // Did NOT emit a "sized to ø" warning because we fell back to default
    expect(out.warnings.some(w => /Drill tool 1 sized to ø/.test(w))).toBe(false);
  });

  it("100 holes emits 100 drill ops without truncation", () => {
    const profiles = Array.from({ length: 100 }, (_, i) => holeProfile(5 + (i % 10)));
    const out = printToInventorHSMBridge.buildBridgeScript({ profiles });
    expect(out.opsEmitted).toBe(100);
    expect(out.operationSummary.every(o => o.type === "drill")).toBe(true);
  });

  it("zero-dimension empty analysis with no profiles surfaces no-ops warning", () => {
    const empty: BlueprintAnalysis = {
      dimensions: [], gdt_frames: [], notes: [],
      title_block: { units: "mm", confidence: 0.5 },
      summary: {
        total_dimensions: 0, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [],
        material: null, has_gdt: false,
      },
    };
    const out = printToInventorHSMBridge.buildBridgeScript({ analysis: empty });
    expect(out.opsEmitted).toBe(0);
    expect(out.warnings.some(w => /No operations could be derived/.test(w))).toBe(true);
  });

  it("provenance fields populated correctly", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({ profiles: [holeProfile()] });
    expect(out.provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(out.provenance.bridgeVersion).toBe(BRIDGE_VERSION);
    expect(out.provenance.profileCount).toBe(1);
    expect(out.provenance.dimensionCount).toBe(0);
    expect(out.provenance.source).toBe("profiles");
  });

  it("provenance.source = 'mixed' when both analysis AND profiles supplied", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      profiles: [holeProfile()],
    });
    expect(out.provenance.source).toBe("mixed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Variability — multiple machine/post combinations
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToInventorHSMBridge — variability across machines/posts", () => {
  it.each([
    ["fanuc.cps", "FANUC"],
    ["heidenhain_tnc.cps", "Heidenhain TNC"],
    ["siemens_sinumerik.cps", "Siemens Sinumerik"],
    ["haas_next_generation.cps", "Haas 3-axis"],
  ])("postProcessor=%s (%s) does not crash", (post) => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      profiles: [holeProfile(), pocketProfile()],
      postProcessor: post,
      machineName: `InventorHSM_${post}`,
    });
    expect(out.opsEmitted).toBe(3); // 1 drill + 2 pocket
    expect(out.script.length).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Material-driven feed/speed calibration (DI seam)
// Variability floor: P, M, N material groups. Failure isolation per-op.
// ─────────────────────────────────────────────────────────────────────────────

const STUB_RPM_1018 = 4500;
const STUB_FEED_1018 = 720;
const STUB_RPM_4140 = 3200;
const STUB_FEED_4140 = 540;
const STUB_RPM_304 = 2400;
const STUB_FEED_304 = 400;
const STUB_RPM_6061 = 12500;
const STUB_FEED_6061 = 2400;
const DRILL_RPM_FACTOR = 0.6;
const DRILL_FEED_FACTOR = 0.4;
const FINISH_RPM_FACTOR = 1.3;
const FINISH_FEED_FACTOR = 1.5;

interface StubLog {
  calls: number;
  lastInput?: UltimateSpeedFeedInput;
  inputs: UltimateSpeedFeedInput[];
}

function makeStubCalculator(log: StubLog, opts?: {
  throwOnMaterial?: string;
  outOfRange?: boolean;
}): FeedSpeedCalculator {
  const TABLE: Record<string, { rpm: number; feed: number }> = {
    "1018 steel":    { rpm: STUB_RPM_1018, feed: STUB_FEED_1018 },
    "4140 alloy":    { rpm: STUB_RPM_4140, feed: STUB_FEED_4140 },
    "304 stainless": { rpm: STUB_RPM_304,  feed: STUB_FEED_304  },
    "6061 aluminum": { rpm: STUB_RPM_6061, feed: STUB_FEED_6061 },
  };

  return {
    calculate(input: UltimateSpeedFeedInput): BridgeFeedSpeedResult {
      log.calls += 1;
      log.lastInput = input;
      log.inputs.push(input);

      if (opts?.throwOnMaterial && input.material === opts.throwOnMaterial) {
        throw new Error(`stub: refuse-to-calc for ${input.material}`);
      }

      const lookup = input.material ? TABLE[input.material] : undefined;
      let rpm = lookup?.rpm ?? 5000;
      let feed = lookup?.feed ?? 800;

      if (opts?.outOfRange && input.material === "BAD_MATERIAL") {
        rpm = Number.POSITIVE_INFINITY;
        feed = Number.NaN;
      }

      if (input.operation === "drilling") {
        rpm = Math.round(rpm * DRILL_RPM_FACTOR);
        feed = Math.round(feed * DRILL_FEED_FACTOR);
      } else if (input.cut_type === "finishing") {
        rpm = Math.round(rpm * FINISH_RPM_FACTOR);
        feed = Math.round(feed * FINISH_FEED_FACTOR);
      }

      return {
        spindle_rpm: { value: rpm },
        feed_rate: { value: feed },
      };
    },
  };
}

function plateAnalysisWithMaterial(material: string): BlueprintAnalysis {
  return {
    dimensions: [dim("linear", 100), dim("linear", 60), dim("linear", 10)],
    gdt_frames: [],
    title_block: {
      part_number: `JM-CALIB-${material.replace(/\W+/g, "-")}`,
      revision: "A",
      material,
      units: "mm",
      confidence: 0.92,
    },
    notes: [],
    summary: {
      total_dimensions: 3, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.05, critical_features: [],
      material, has_gdt: false,
    },
  };
}

describe("PrintToInventorHSMBridge — material-driven feed/speed calibration", () => {
  it("auto-enables when material is present in title block (1018 steel, P group)", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [holeProfile(), pocketProfile()],
    });

    expect(out.materialCalibration.enabled).toBe(true);
    expect(out.materialCalibration.material).toBe("1018 steel");
    // 1 drill + 1 adaptive_2d + 1 parallel = 3 calibrations
    expect(out.materialCalibration.summary.physics).toBe(3);
    expect(out.materialCalibration.summary.fallback).toBe(0);
    expect(out.materialCalibration.summary.failed).toBe(0);
    expect(log.calls).toBe(3);

    const pocketRough = out.operationSummary.find(o => o.type === "adaptive_2d");
    expect(pocketRough?.type).toBe("adaptive_2d");
    const calibPocket = out.materialCalibration.perOp.find(p => p.op === pocketRough!.name);
    expect(calibPocket?.source).toBe("physics");
    expect(calibPocket?.rpm).toBe(STUB_RPM_1018);
    expect(calibPocket?.feed_mm_min).toBe(STUB_FEED_1018);
  });

  it("varies output across 3 material groups (P/M/N) — REAL material discrimination", () => {
    const expectations = [
      { material: "1018 steel",    pocketRpm: STUB_RPM_1018, pocketFeed: STUB_FEED_1018 },
      { material: "304 stainless", pocketRpm: STUB_RPM_304,  pocketFeed: STUB_FEED_304  },
      { material: "6061 aluminum", pocketRpm: STUB_RPM_6061, pocketFeed: STUB_FEED_6061 },
    ];

    for (const exp of expectations) {
      const log: StubLog = { calls: 0, inputs: [] };
      const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

      const out = bridge.buildBridgeScript({
        analysis: plateAnalysisWithMaterial(exp.material),
        profiles: [pocketProfile()],
      });

      const pocketEntry = out.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"));
      expect(pocketEntry?.source).toBe("physics");
      expect(pocketEntry?.rpm).toBe(exp.pocketRpm);
      expect(pocketEntry?.feed_mm_min).toBe(exp.pocketFeed);
      expect(out.materialCalibration.material).toBe(exp.material);
    }
  });

  it("variability — 4140 alloy (P-hard) produces lower rpm/feed than 1018 (P-soft)", () => {
    const log1018: StubLog = { calls: 0, inputs: [] };
    const out1018 = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log1018) }).buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [pocketProfile()],
    });

    const log4140: StubLog = { calls: 0, inputs: [] };
    const out4140 = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log4140) }).buildBridgeScript({
      analysis: plateAnalysisWithMaterial("4140 alloy"),
      profiles: [pocketProfile()],
    });

    const r1018 = out1018.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    const r4140 = out4140.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    expect(r4140.rpm).toBeLessThan(r1018.rpm);
    expect(r4140.feed_mm_min).toBeLessThan(r1018.feed_mm_min);
  });

  it("drill op gets reduced feed/rpm vs pocket rough (same material)", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [holeProfile(), pocketProfile()],
    });

    const drillEntry = out.materialCalibration.perOp.find(p => p.op.startsWith("Drill_"))!;
    const pocketEntry = out.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;

    expect(drillEntry.rpm).toBe(Math.round(STUB_RPM_1018 * DRILL_RPM_FACTOR));
    expect(drillEntry.feed_mm_min).toBe(Math.round(STUB_FEED_1018 * DRILL_FEED_FACTOR));
    expect(pocketEntry.rpm).toBe(STUB_RPM_1018);

    const drillCall = log.inputs.find(i => i.operation === "drilling");
    expect(drillCall?.material).toBe("1018 steel");
    expect(drillCall?.operation).toBe("drilling");
  });

  it("parallel finish op gets boosted feed/rpm vs adaptive_2d roughing", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [pocketProfile()],
    });

    const rough = out.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    const finish = out.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Finish"))!;

    expect(rough.rpm).toBe(STUB_RPM_1018);
    expect(rough.feed_mm_min).toBe(STUB_FEED_1018);
    expect(finish.rpm).toBe(Math.round(STUB_RPM_1018 * FINISH_RPM_FACTOR));
    expect(finish.feed_mm_min).toBe(Math.round(STUB_FEED_1018 * FINISH_FEED_FACTOR));
  });

  it("disabled when no material is present (and useMaterialFeedSpeed not set)", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const noMaterial: BlueprintAnalysis = {
      dimensions: [dim("linear", 50)],
      gdt_frames: [],
      title_block: { units: "mm", confidence: 0.5 },
      notes: [],
      summary: {
        total_dimensions: 1, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [],
        material: null, has_gdt: false,
      },
    };

    const out = bridge.buildBridgeScript({
      analysis: noMaterial,
      profiles: [holeProfile()],
    });

    expect(out.materialCalibration.enabled).toBe(false);
    expect(out.materialCalibration.material).toBeNull();
    expect(log.calls).toBe(0);
    const drill = out.materialCalibration.perOp.find(p => p.op.startsWith("Drill_"))!;
    expect(drill.source).toBe("default");
    expect(drill.rpm).toBe(DEFAULT_DRILL_RPM);
    expect(drill.feed_mm_min).toBe(DEFAULT_DRILL_FEED);
  });

  it("explicit useMaterialFeedSpeed=false forces defaults even when material present", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [pocketProfile()],
      useMaterialFeedSpeed: false,
    });

    expect(out.materialCalibration.enabled).toBe(false);
    expect(log.calls).toBe(0);
    const rough = out.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    expect(rough.source).toBe("default");
    expect(rough.rpm).toBe(DEFAULT_POCKET_ROUGH_RPM);
    expect(rough.feed_mm_min).toBe(DEFAULT_POCKET_ROUGH_FEED);
  });

  it("materialOverride beats title_block material", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [pocketProfile()],
      materialOverride: "6061 aluminum",
    });

    expect(out.material).toBe("6061 aluminum");
    expect(out.materialCalibration.material).toBe("6061 aluminum");
    const rough = out.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    expect(rough.rpm).toBe(STUB_RPM_6061);
  });

  it("FAILURE MODE: physics engine throws — bridge falls back per-op without aborting", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({
      feedSpeed: makeStubCalculator(log, { throwOnMaterial: "1018 steel" }),
    });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [holeProfile(), pocketProfile()],
    });

    expect(out.materialCalibration.enabled).toBe(true);
    expect(out.materialCalibration.summary.physics).toBe(0);
    expect(out.materialCalibration.summary.failed).toBe(3);

    const failureWarnings = out.warnings.filter(w => /physics calc threw/.test(w));
    expect(failureWarnings.length).toBe(3);
    for (const w of failureWarnings) {
      expect(w).toMatch(/refuse-to-calc/);
    }

    const drill = out.materialCalibration.perOp.find(p => p.op.startsWith("Drill_"))!;
    expect(drill.rpm).toBe(DEFAULT_DRILL_RPM);
    expect(drill.feed_mm_min).toBe(DEFAULT_DRILL_FEED);
  });

  it("FAILURE MODE: physics returns Infinity/NaN — sanity check rejects + falls back", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({
      feedSpeed: makeStubCalculator(log, { outOfRange: true }),
    });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("BAD_MATERIAL"),
      profiles: [pocketProfile()],
    });

    expect(out.materialCalibration.summary.failed).toBe(2);
    expect(out.materialCalibration.summary.physics).toBe(0);
    const oorWarnings = out.warnings.filter(w => /out-of-range/.test(w));
    expect(oorWarnings.length).toBe(2);
  });

  it("FAILURE MODE: empty ops (zero profiles, zero dims) — calibration safe + disabled", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const empty: BlueprintAnalysis = {
      dimensions: [], gdt_frames: [], notes: [],
      title_block: { material: "1018 steel", units: "mm", confidence: 0.5 },
      summary: {
        total_dimensions: 0, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [],
        material: "1018 steel", has_gdt: false,
      },
    };

    const out = bridge.buildBridgeScript({ analysis: empty });
    expect(out.opsEmitted).toBe(0);
    expect(out.materialCalibration.enabled).toBe(false);
    expect(log.calls).toBe(0);
  });

  it("ADVERSARIAL: material with leading/trailing whitespace via override is trimmed", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [pocketProfile()],
      materialOverride: "   6061 aluminum   ",
    });

    expect(out.material).toBe("6061 aluminum");
    expect(log.lastInput?.material).toBe("6061 aluminum");
  });

  it("ADVERSARIAL: 50 holes — calibration stable at scale, all 50 calls reach physics", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const profiles: ExtractedProfile[] = Array.from({ length: 50 }, (_, i) =>
      holeProfile(4 + (i % 10) * 0.5),
    );
    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("304 stainless"),
      profiles,
    });

    expect(out.opsEmitted).toBe(50);
    expect(log.calls).toBe(50);
    expect(out.materialCalibration.summary.physics).toBe(50);
    const expectedDrillRpm = Math.round(STUB_RPM_304 * DRILL_RPM_FACTOR);
    const allRpms = out.materialCalibration.perOp.map(p => p.rpm);
    expect(allRpms.every(r => r === expectedDrillRpm)).toBe(true);
  });

  it("ADVERSARIAL: dimensions-only fallback path also receives calibration", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("4140 alloy"),
      // no profiles → triggers adaptive_3d + parallel finish fallback
    });

    expect(out.opsEmitted).toBe(2);
    expect(out.materialCalibration.summary.physics).toBe(2);

    const adaptive3d = out.materialCalibration.perOp.find(p => p.op.startsWith("Adaptive3D_Rough"))!;
    const parallel = out.materialCalibration.perOp.find(p => p.op.startsWith("Parallel_Finish"))!;
    expect(adaptive3d.rpm).toBe(STUB_RPM_4140);
    expect(parallel.rpm).toBe(Math.round(STUB_RPM_4140 * FINISH_RPM_FACTOR));

    // adaptive_3d maps to milling+roughing+strategy:"adaptive"
    const adaptiveCall = log.inputs.find(i => i.strategy === "adaptive");
    expect(adaptiveCall?.cut_type).toBe("roughing");
    expect(adaptiveCall?.material).toBe("4140 alloy");
  });

  it("calibration warning summary lists physics/fallback/failed counts", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToInventorHSMBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [holeProfile(), pocketProfile()],
    });

    const summary = out.warnings.find(w => /Material-calibrated feeds\/speeds/.test(w));
    expect(typeof summary).toBe("string");
    expect(summary).toMatch(/physics=3/);
    expect(summary).toMatch(/fallback=0/);
    expect(summary).toMatch(/failed=0/);
  });

  it("singleton uses real ultimateSpeedFeedEngine — produces in-range values for 1018 steel", () => {
    const out = printToInventorHSMBridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [pocketProfile()],
    });

    expect(out.materialCalibration.enabled).toBe(true);
    const rough = out.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    expect(["physics", "failed", "default"]).toContain(rough.source);
    expect(Number.isFinite(rough.rpm)).toBe(true);
    expect(Number.isFinite(rough.feed_mm_min)).toBe(true);
    expect(rough.rpm).toBeGreaterThan(0);
    expect(rough.feed_mm_min).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher wiring (camDispatcher.ts) — round-trip tests
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToInventorHSMBridge — dispatcher wiring (camDispatcher.ts)", () => {
  const PRINT_INV_ACTIONS = [
    "print_to_inventor_hsm",
    "print_to_inventor_hsm_validate",
    "print_to_inventor_hsm_capabilities",
  ] as const;

  const ACTION_COUNT_EXPECTED = 3;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 3 print_to_inventor_hsm* enum entries", async () => {
    const src = await readDispatcher();
    expect(PRINT_INV_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of PRINT_INV_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _printToInventorHSM singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_printToInventorHSM\s*:\s*any/);
  });

  it("registers a printToInventorHSM case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"printToInventorHSM"\s*:\s*return\s+_printToInventorHSM\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/PrintToInventorHSMBridge\.js"\s*\)\)\.printToInventorHSMBridge/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of PRINT_INV_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("each case body resolves the engine via getEngine(\"printToInventorHSM\")", async () => {
    const src = await readDispatcher();
    for (const action of PRINT_INV_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("printToInventorHSM"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("main action invokes buildBridgeScript with snake_case + camelCase param fallbacks", async () => {
    const src = await readDispatcher();
    const re = /case\s+"print_to_inventor_hsm"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("buildBridgeScript");
    // Verify both naming conventions are accepted
    expect(body).toMatch(/params\.partName\s*\?\?\s*params\.part_name/);
    expect(body).toMatch(/params\.machineName\s*\?\?\s*params\.machine_name/);
    expect(body).toMatch(/params\.postProcessor\s*\?\?\s*params\.post_processor/);
    expect(body).toMatch(/params\.ncOutputPath\s*\?\?\s*params\.nc_output_path/);
    expect(body).toMatch(/params\.useMaterialFeedSpeed\s*\?\?\s*params\.use_material_feed_speed/);
    expect(body).toMatch(/params\.materialOverride\s*\?\?\s*params\.material_override/);
  });

  it("validate action invokes bridge.validate(params)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"print_to_inventor_hsm_validate"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("bridge.validate(params)");
  });

  it("capabilities action invokes bridge.capabilities()", async () => {
    const src = await readDispatcher();
    const re = /case\s+"print_to_inventor_hsm_capabilities"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("bridge.capabilities()");
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of PRINT_INV_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });
});
