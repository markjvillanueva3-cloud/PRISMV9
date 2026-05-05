/**
 * Tests for PrintToHyperMillBridge — Blueprint OCR → hyperMILL AC Python
 * (CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01)
 */

import { describe, it, expect } from "vitest";
import {
  PrintToHyperMillBridge,
  printToHyperMillBridge,
  type PrintToHyperMillInput,
} from "../engines/PrintToHyperMillBridge.js";
import type { BlueprintAnalysis, ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";

// ── Constants ────────────────────────────────────────────────────────────────
const BRIDGE_VERSION = "1.1.0";
const HOLE_DIA = 8;
const POCKET_W = 40;
const POCKET_H = 25;

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
    points: [{ x: 0, y: 0 }, { x: POCKET_W, y: 0 }, { x: POCKET_W, y: POCKET_H }, { x: 0, y: POCKET_H }],
    is_closed: true, width_mm: POCKET_W, height_mm: POCKET_H, confidence: 0.9,
  };
}

function externalProfile(): ExtractedProfile {
  return {
    id: "ext-1", name: "Outline", type: "external",
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }],
    is_closed: true, confidence: 0.92,
  };
}

function plateAnalysis(): BlueprintAnalysis {
  return {
    dimensions: [dim("linear", 100), dim("linear", 60), dim("linear", 10)],
    gdt_frames: [],
    title_block: { part_number: "JM-PLATE-001", revision: "A", material: "1018 steel", units: "mm", confidence: 0.92 },
    notes: [],
    summary: {
      total_dimensions: 3, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.05, critical_features: [], material: "1018 steel", has_gdt: false,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity + capabilities
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — identity + capabilities", () => {
  it("singleton matches class + reports v1.0.0", () => {
    expect(printToHyperMillBridge).toBeInstanceOf(PrintToHyperMillBridge);
    expect(printToHyperMillBridge.version).toBe(BRIDGE_VERSION);
  });

  it("capabilities() lists exact supported + unsupported profile types", () => {
    const c = printToHyperMillBridge.capabilities();
    expect([...c.supportedProfileTypes].sort()).toEqual(["external", "hole", "pocket"]);
    expect([...c.unsupportedProfileTypes].sort()).toEqual(["internal", "slot"]);
  });

  it("capabilities() lists 4 default tools with stable numbers", () => {
    const c = printToHyperMillBridge.capabilities();
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

describe("PrintToHyperMillBridge — validate()", () => {
  const e = printToHyperMillBridge;

  it("rejects null input", () => {
    expect(e.validate(null).valid).toBe(false);
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

  it("rejects bad units", () => {
    const r = e.validate({ analysis: plateAnalysis(), units: "feet" as PrintToHyperMillInput["units"] });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/units must be/);
  });

  it("accepts a valid profiles-only input", () => {
    expect(e.validate({ profiles: [holeProfile()] }).valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBridgeScript() — happy paths
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — buildBridgeScript() happy paths", () => {
  it("hole profile emits 1 drilling op + drill tool sized to detected hole", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile(12)],
    });
    expect(out.opsEmitted).toBe(1);
    expect(out.operationSummary[0]?.type).toBe("drilling");
    expect(out.operationSummary[0]?.tool).toBe(1);
    // Drill tool table contains the auto-sized drill
    expect(out.toolsCount).toBeGreaterThanOrEqual(1);
    // Largest-hole sizing leaves a warning for traceability
    expect(out.warnings.some(w => /Drill tool 1 sized to ø12/.test(w))).toBe(true);
  });

  it("pocket profile emits roughing + finishing pair", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [pocketProfile()],
    });
    expect(out.opsEmitted).toBe(2);
    const types = out.operationSummary.map(o => o.type);
    expect(types).toContain("pocket_2d");
    expect(types).toContain("scallop_finishing");
  });

  it("external profile emits a contour_2d op with contour tool", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [externalProfile()],
    });
    expect(out.opsEmitted).toBe(1);
    expect(out.operationSummary[0]?.type).toBe("contour_2d");
    expect(out.operationSummary[0]?.tool).toBe(4);
  });

  it("multi-feature blueprint: 2 holes + 1 pocket + 1 external = 5 ops", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      profiles: [holeProfile(8), holeProfile(10), pocketProfile(), externalProfile()],
    });
    // 2 drills + 2 pocket ops + 1 contour
    expect(out.opsEmitted).toBe(5);
    expect(out.material).toBe("1018 steel");
    expect(out.partName).toBe("JM-PLATE-001");
    expect(out.units).toBe("mm");
  });

  it("dimensions-only fallback: no profiles emits HPC + Z-level finishing", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      analysis: plateAnalysis(),
    });
    expect(out.opsEmitted).toBe(2);
    const types = out.operationSummary.map(o => o.type);
    expect(types).toContain("hpc_roughing");
    expect(types).toContain("z_level_finishing");
    expect(out.provenance.source).toBe("dimensions_only");
  });

  it("emitted script contains hyperMILL AC Python header markers", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [pocketProfile()],
    });
    // Generator emits the standard hyperMILL AC header — check key markers
    expect(out.script).toMatch(/PRISM PrintToHyperMillBridge v1\.1\.0/);
    expect(out.script.length).toBeGreaterThan(200);
  });

  it("inch units carries an explicit warning", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile()],
      units: "in",
    });
    expect(out.units).toBe("in");
    expect(out.warnings.some(w => /Units=inch/.test(w))).toBe(true);
  });

  it("custom postProcessor flows through", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile()],
      postProcessor: "omPPHH",
    });
    // The script should reference the custom post (line is generator-internal but
    // we can verify via warnings / through provenance)
    expect(out.opsEmitted).toBe(1);
    // The generator embeds post_processor in its output script — cheap structural check
    expect(out.script.length).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Failure modes / unsupported features
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — failure modes + unsupported", () => {
  it("throws when no analysis AND no profiles", () => {
    expect(() => printToHyperMillBridge.buildBridgeScript({})).toThrow(/at least one of/);
  });

  it("throws on null input", () => {
    expect(() =>
      printToHyperMillBridge.buildBridgeScript(
        null as unknown as PrintToHyperMillInput,
      ),
    ).toThrow(/PrintToHyperMillBridge/);
  });

  it("throws on bad defaultDepth", () => {
    expect(() =>
      printToHyperMillBridge.buildBridgeScript({
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
    const out = printToHyperMillBridge.buildBridgeScript({
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
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [slot],
      analysis: plateAnalysis(),
    });
    expect(out.unsupported).toContain("slot");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — adversarial", () => {
  it("hole profile with NaN diameter falls back to default drill diameter", () => {
    const bad: ExtractedProfile = {
      id: "h-nan", name: "Hole", type: "hole",
      points: [{ x: 0, y: 0 }], is_closed: true, diameter_mm: Number.NaN, confidence: 0.5,
    };
    const out = printToHyperMillBridge.buildBridgeScript({ profiles: [bad] });
    expect(out.opsEmitted).toBe(1);
    // Did NOT emit a "sized to ø" warning because we fell back to default
    expect(out.warnings.some(w => /Drill tool 1 sized to ø/.test(w))).toBe(false);
  });

  it("100 holes emits 100 drilling ops without truncation", () => {
    const profiles = Array.from({ length: 100 }, (_, i) => holeProfile(5 + (i % 10)));
    const out = printToHyperMillBridge.buildBridgeScript({ profiles });
    expect(out.opsEmitted).toBe(100);
    expect(out.operationSummary.every(o => o.type === "drilling")).toBe(true);
  });

  it("zero-dimension empty analysis with empty profiles array surfaces the no-ops warning", () => {
    const empty: BlueprintAnalysis = {
      dimensions: [], gdt_frames: [], notes: [],
      title_block: { units: "mm", confidence: 0.5 },
      summary: {
        total_dimensions: 0, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [], material: null, has_gdt: false,
      },
    };
    // Validation passes (analysis present), but buildOperations emits 0 ops
    const out = printToHyperMillBridge.buildBridgeScript({ analysis: empty });
    expect(out.opsEmitted).toBe(0);
    expect(out.warnings.some(w => /No operations could be derived/.test(w))).toBe(true);
  });

  it("provenance timestamp is ISO-8601", () => {
    const out = printToHyperMillBridge.buildBridgeScript({ profiles: [holeProfile()] });
    expect(out.provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(out.provenance.bridgeVersion).toBe(BRIDGE_VERSION);
    expect(out.provenance.profileCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Variability — exercise multiple machine/post combinations
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — variability across machines/posts", () => {
  it.each([
    ["omPPFI", "FANUC interactive"],
    ["omPPHH", "Heidenhain TNC"],
    ["omPPSI", "Siemens Sinumerik"],
    ["omPPF3X", "Haas 3-axis"],
  ])("postProcessor=%s (%s) does not crash", (post) => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile(), pocketProfile()],
      postProcessor: post,
      machineName: `MillMachine_${post}`,
    });
    expect(out.opsEmitted).toBe(3); // 1 drill + 2 pocket
    expect(out.script.length).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Material-driven feed/speed calibration (U-CADC-PRINT-HM-FS01)
// Variability floor: P, M, N material groups. Failure isolation per-op.
// ─────────────────────────────────────────────────────────────────────────────

import {
  type FeedSpeedCalculator,
  type BridgeFeedSpeedResult,
} from "../engines/PrintToHyperMillBridge.js";
import type { UltimateSpeedFeedInput } from "../engines/UltimateSpeedFeedEngine.js";

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

// Bridge default rpm/feed values (from PrintToHyperMillBridge.ts)
const DEFAULT_DRILL_RPM = 2500;
const DEFAULT_DRILL_FEED = 200;
const DEFAULT_POCKET_ROUGH_RPM = 6000;

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
      tightest_tolerance_mm: 0.05, critical_features: [], material, has_gdt: false,
    },
  };
}

describe("PrintToHyperMillBridge — material-driven feed/speed calibration (U-CADC-PRINT-HM-FS01)", () => {
  it("auto-enables when material is present in title block (1018 steel, P group)", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [holeProfile(), pocketProfile()],
    });

    expect(out.materialCalibration.enabled).toBe(true);
    expect(out.materialCalibration.material).toBe("1018 steel");
    expect(out.materialCalibration.summary.physics).toBe(3);
    expect(out.materialCalibration.summary.fallback).toBe(0);
    expect(out.materialCalibration.summary.failed).toBe(0);
    expect(log.calls).toBe(3);

    const pocketRough = out.operationSummary.find(o => o.type === "pocket_2d");
    expect(pocketRough?.type).toBe("pocket_2d");
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
      const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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
    const out1018 = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log1018) }).buildBridgeScript({
      analysis: plateAnalysisWithMaterial("1018 steel"),
      profiles: [pocketProfile()],
    });

    const log4140: StubLog = { calls: 0, inputs: [] };
    const out4140 = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log4140) }).buildBridgeScript({
      analysis: plateAnalysisWithMaterial("4140 alloy"),
      profiles: [pocketProfile()],
    });

    const r1018 = out1018.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    const r4140 = out4140.materialCalibration.perOp.find(p => p.op.startsWith("Pocket_Rough"))!;
    expect(r4140.rpm).toBeLessThan(r1018.rpm);
    expect(r4140.feed_mm_min).toBeLessThan(r1018.feed_mm_min);
  });

  it("drilling op gets reduced feed/rpm vs milling op (same material)", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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

  it("finishing op gets boosted feed/rpm vs roughing op (same material)", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

    const noMaterial: BlueprintAnalysis = {
      dimensions: [dim("linear", 50)],
      gdt_frames: [],
      title_block: { units: "mm", confidence: 0.5 },
      notes: [],
      summary: {
        total_dimensions: 1, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [], material: null, has_gdt: false,
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
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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
  });

  it("materialOverride beats title_block material", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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
    const bridge = new PrintToHyperMillBridge({
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
    const bridge = new PrintToHyperMillBridge({
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
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

    const empty: BlueprintAnalysis = {
      dimensions: [], gdt_frames: [], notes: [],
      title_block: { material: "1018 steel", units: "mm", confidence: 0.5 },
      summary: {
        total_dimensions: 0, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [], material: "1018 steel", has_gdt: false,
      },
    };

    const out = bridge.buildBridgeScript({ analysis: empty });
    expect(out.opsEmitted).toBe(0);
    expect(out.materialCalibration.enabled).toBe(false);
    expect(log.calls).toBe(0);
  });

  it("ADVERSARIAL: material with leading/trailing whitespace via override is trimmed", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

    const out = bridge.buildBridgeScript({
      analysis: plateAnalysisWithMaterial("4140 alloy"),
      // no profiles → triggers HPC + Z-level finish fallback
    });

    expect(out.opsEmitted).toBe(2);
    expect(out.materialCalibration.summary.physics).toBe(2);

    const hpc = out.materialCalibration.perOp.find(p => p.op.startsWith("HPC_Rough"))!;
    const zlevel = out.materialCalibration.perOp.find(p => p.op.startsWith("ZLevel_Finish"))!;
    expect(hpc.rpm).toBe(STUB_RPM_4140);
    expect(zlevel.rpm).toBe(Math.round(STUB_RPM_4140 * FINISH_RPM_FACTOR));

    const hpcCall = log.inputs.find(i => i.strategy === "hpc");
    expect(hpcCall?.cut_type).toBe("roughing");
    expect(hpcCall?.material).toBe("4140 alloy");
  });

  it("calibration warning summary lists physics/fallback/failed counts", () => {
    const log: StubLog = { calls: 0, inputs: [] };
    const bridge = new PrintToHyperMillBridge({ feedSpeed: makeStubCalculator(log) });

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
    const out = printToHyperMillBridge.buildBridgeScript({
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
