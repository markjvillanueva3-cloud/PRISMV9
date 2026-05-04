import { describe, it, expect } from "vitest";
import {
  HyperMillMillTurnStrategyEngine,
  hyperMillMillTurnStrategyEngine,
  type CAxisSyncResult,
  type MultiChannelSyncResult,
} from "../engines/HyperMillMillTurnStrategyEngine.js";

const DISPATCHER_PATH = "src/tools/dispatchers/camDispatcher.ts";
const ENGINE_IMPORT_LITERAL = "../../engines/HyperMillMillTurnStrategyEngine.js";

async function loadDispatcherSource(): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  return readFile(resolve(process.cwd(), DISPATCHER_PATH), "utf-8");
}

describe("HyperMillMillTurnStrategyEngine — class shape", () => {
  it("exposes a singleton instance with all four method names callable", () => {
    expect(hyperMillMillTurnStrategyEngine).toBeInstanceOf(HyperMillMillTurnStrategyEngine);
    expect(typeof hyperMillMillTurnStrategyEngine.checkCSSLimit).toBe("function");
    expect(typeof hyperMillMillTurnStrategyEngine.calculateCAxisSync).toBe("function");
    expect(typeof hyperMillMillTurnStrategyEngine.generateMultiChannelSync).toBe("function");
    expect(typeof hyperMillMillTurnStrategyEngine.calculateMillTurnStrategy).toBe("function");
    expect(typeof hyperMillMillTurnStrategyEngine.stats).toBe("function");
  });
});

describe("HyperMillMillTurnStrategyEngine — checkCSSLimit", () => {
  const engine = new HyperMillMillTurnStrategyEngine();

  it("returns ok when RPM at min diameter is below machine limit", () => {
    const r = engine.checkCSSLimit({
      vcDesired_m_min: 300,
      minDiameter_mm: 10,
      machineMaxRpm: 12000,
    });
    expect(r.status).toBe("ok");
    expect(r.rpmAtMinDiameter).toBeCloseTo(9549, 0);
    expect(r.machineMaxRpm).toBe(12000);
    expect(r.recommendation).toMatch(/G96 S300/);
  });

  it("returns rpm_cap_exceeded with computed capped Vc when CSS pushes RPM past limit", () => {
    const r = engine.checkCSSLimit({
      vcDesired_m_min: 300,
      minDiameter_mm: 2,
      machineMaxRpm: 12000,
    });
    expect(r.status).toBe("rpm_cap_exceeded");
    expect(r.rpmAtMinDiameter).toBeGreaterThan(12000);
    expect(r.rpmCapped).toBe(12000);
    expect(r.vcAtCapRpm_m_min).toBeCloseTo(75.4, 1);
    expect(r.recommendation).toMatch(/G50 S12000|G97/);
  });

  it("rejects zero diameter with explicit error status and zero rpm", () => {
    const r = engine.checkCSSLimit({ vcDesired_m_min: 200, minDiameter_mm: 0, machineMaxRpm: 8000 });
    expect(r.status).toBe("error");
    expect(r.rpmAtMinDiameter).toBe(0);
    expect(r.message).toMatch(/> 0/);
    expect(r.recommendation).toMatch(/G97/);
  });

  it("rejects negative diameter with error status", () => {
    const r = engine.checkCSSLimit({ vcDesired_m_min: 200, minDiameter_mm: -5, machineMaxRpm: 8000 });
    expect(r.status).toBe("error");
    expect(r.rpmAtMinDiameter).toBe(0);
  });

  it("treats RPM == machineMaxRpm boundary as ok (inclusive)", () => {
    const D = 1000 * 200 / (Math.PI * 10000);
    const r = engine.checkCSSLimit({
      vcDesired_m_min: 200,
      minDiameter_mm: D,
      machineMaxRpm: 10000,
    });
    expect(r.status).toBe("ok");
    expect(r.rpmAtMinDiameter).toBeCloseTo(10000, 0);
  });

  it("RPM scales inversely with diameter (10x smaller D yields 10x larger RPM, within Math.round tolerance)", () => {
    const big = engine.checkCSSLimit({ vcDesired_m_min: 250, minDiameter_mm: 50, machineMaxRpm: 20000 });
    const small = engine.checkCSSLimit({ vcDesired_m_min: 250, minDiameter_mm: 5, machineMaxRpm: 20000 });
    // Engine rounds with Math.round so 10x of a rounded value can drift by up to 5 units.
    // Ratio check is the right invariant: small/big should equal 10 within rounding noise.
    const ratio = small.rpmAtMinDiameter / big.rpmAtMinDiameter;
    expect(ratio).toBeGreaterThan(9.99);
    expect(ratio).toBeLessThan(10.01);
  });

  it("Vc cap recovery: capped Vc equals pi * D * machineMaxRpm / 1000", () => {
    const r = engine.checkCSSLimit({
      vcDesired_m_min: 500,
      minDiameter_mm: 4,
      machineMaxRpm: 10000,
    });
    expect(r.status).toBe("rpm_cap_exceeded");
    expect(r.vcAtCapRpm_m_min).toBeCloseTo(125.7, 1);
  });
});

describe("HyperMillMillTurnStrategyEngine — calculateCAxisSync", () => {
  const engine = new HyperMillMillTurnStrategyEngine();

  it("generates equally-spaced indexed positions for a 4-hole cross pattern", () => {
    const r = engine.calculateCAxisSync({
      syncType: "cross_hole",
      cAngle_deg: 0,
      liveToolRpm: 6000,
      liveToolDiameter_mm: 10,
      featureCount: 4,
    });
    expect(r.cAxisPositions_deg).toEqual([0, 90, 180, 270]);
    expect(r.requiresSpindleIndex).toBe(true);
    expect(r.hyperMillCycle).toContain("Drilling");
    expect(r.hyperMillCycle).toContain("Part Transfer");
    expect(r.vcEffective_m_min).toBeCloseTo(188.5, 1);
  });

  it("wraps positions modulo 360 for non-zero start angle", () => {
    const r = engine.calculateCAxisSync({
      syncType: "cross_hole",
      cAngle_deg: 270,
      liveToolRpm: 4000,
      liveToolDiameter_mm: 8,
      featureCount: 4,
    });
    expect(r.cAxisPositions_deg).toEqual([270, 0, 90, 180]);
    expect(r.requiresSpindleIndex).toBe(true);
  });

  it("emits cross_slot cycle, requires spindle index, and emits chip-clearance note", () => {
    const r = engine.calculateCAxisSync({
      syncType: "cross_slot",
      cAngle_deg: 45,
      liveToolRpm: 5000,
      liveToolDiameter_mm: 6,
      featureCount: 1,
    });
    expect(r.requiresSpindleIndex).toBe(true);
    expect(r.hyperMillCycle).toContain("Pocket Milling");
    expect(r.hyperMillCycle).toContain("Linking Turning");
    const hasChipNote = r.notes.some((n) => /coolant flush|chip/i.test(n));
    expect(hasChipNote).toBe(true);
    expect(r.vcEffective_m_min).toBeCloseTo(94.2, 1);
  });

  it("off_center_feature requires Y-axis but not spindle index", () => {
    const r = engine.calculateCAxisSync({
      syncType: "off_center_feature",
      cAngle_deg: 30,
      liveToolRpm: 3000,
      liveToolDiameter_mm: 12,
      featureCount: 1,
    });
    expect(r.requiresSpindleIndex).toBe(false);
    expect(r.hyperMillCycle).toContain("Y-axis");
    expect(r.hyperMillCycle).toContain("Roll Turning");
    const hasYNote = r.notes.some((n) => /Y/.test(n));
    expect(hasYNote).toBe(true);
  });

  it("flags low live-tool speed warning for cross_hole below 30 m/min", () => {
    const r = engine.calculateCAxisSync({
      syncType: "cross_hole",
      cAngle_deg: 0,
      liveToolRpm: 1000,
      liveToolDiameter_mm: 1,
      featureCount: 1,
    });
    expect(r.vcEffective_m_min).toBeLessThan(30);
    const hasLowWarning = r.notes.some((n) => /WARNING.*Low.*speed|live-tool RPM/i.test(n));
    expect(hasLowWarning).toBe(true);
  });

  it("featureCount default of 1 produces a single position equal to cAngle_deg", () => {
    const r = engine.calculateCAxisSync({
      syncType: "cross_hole",
      cAngle_deg: 137,
      liveToolRpm: 4000,
      liveToolDiameter_mm: 6,
    });
    expect(r.cAxisPositions_deg).toEqual([137]);
  });
});

describe("HyperMillMillTurnStrategyEngine — generateMultiChannelSync", () => {
  const engine = new HyperMillMillTurnStrategyEngine();

  it("interleaves operations across two channels in round-robin order", () => {
    const r = engine.generateMultiChannelSync({
      channel1Ops: ["face", "rough_od", "thread_od"],
      channel2Ops: ["drill_id", "rough_id"],
    });
    expect(r.operationSequence).toHaveLength(5);
    expect(r.operationSequence[0]).toEqual({ channel: 1, operation: "face" });
    expect(r.operationSequence[1]).toEqual({ channel: 2, operation: "drill_id" });
    expect(r.operationSequence[2]).toEqual({ channel: 1, operation: "rough_od" });
    expect(r.operationSequence[3]).toEqual({ channel: 2, operation: "rough_id" });
    expect(r.operationSequence[4]).toEqual({ channel: 1, operation: "thread_od" });
  });

  it("appends 2 part-transfer sync points and warns about grip force when partTransferRequired", () => {
    const r = engine.generateMultiChannelSync({
      channel1Ops: ["op_a"],
      channel2Ops: ["op_b"],
      partTransferRequired: true,
    });
    const transferOps = r.operationSequence.filter((s) => s.syncPoint === "WAIT_TRANSFER");
    expect(transferOps).toHaveLength(2);
    const opNames = r.operationSequence.map((s) => s.operation);
    expect(opNames).toContain("PART_TRANSFER_SYNC");
    expect(opNames).toContain("SUB_SPINDLE_GRIP");
    const gripWarn = r.warnings.some((w) => /grip force|cutting force/i.test(w));
    expect(gripWarn).toBe(true);
  });

  it("uses Siemens 840D WAITM template for siemens controller family", () => {
    const r = engine.generateMultiChannelSync({
      channel1Ops: ["a"],
      channel2Ops: ["b"],
      controllerFamily: "siemens",
    });
    expect(r.syncCodeTemplate).toContain("WAITM");
    expect(r.syncCodeTemplate).toContain("840D");
  });

  it("uses Fanuc M200/M201 template for fanuc controller family", () => {
    const r = engine.generateMultiChannelSync({
      channel1Ops: ["a"],
      channel2Ops: ["b"],
      controllerFamily: "fanuc",
    });
    expect(r.syncCodeTemplate).toContain("M200");
    expect(r.syncCodeTemplate).toContain("M201");
  });

  it("falls back to generic WAIT_SYNC template for generic controller family", () => {
    const r = engine.generateMultiChannelSync({
      channel1Ops: ["a"],
      channel2Ops: ["b"],
      controllerFamily: "generic",
    });
    expect(r.syncCodeTemplate).toContain("WAIT_SYNC");
  });

  it("computes parallel efficiency as min(ch1,ch2)/(ch1+ch2) for balanced channels", () => {
    const balanced = engine.generateMultiChannelSync({
      channel1Ops: ["a", "b", "c"],
      channel2Ops: ["x", "y", "z"],
    });
    expect(balanced.parallelEfficiency_pct).toBe(50);
  });

  it("flags low-efficiency warning when parallelEfficiency_pct below 30 percent", () => {
    const lopsided = engine.generateMultiChannelSync({
      channel1Ops: ["a", "b", "c", "d", "e"],
      channel2Ops: ["x"],
    });
    expect(lopsided.parallelEfficiency_pct).toBe(17);
    const reseqWarn = lopsided.warnings.some((w) => /parallel efficiency|re-sequencing/i.test(w));
    expect(reseqWarn).toBe(true);
  });

  it("handles empty channels with empty sequence and zero efficiency", () => {
    const r = engine.generateMultiChannelSync({
      channel1Ops: [],
      channel2Ops: [],
    });
    expect(r.operationSequence).toEqual([]);
    expect(r.parallelEfficiency_pct).toBe(0);
  });

  it("appends BAR_FEED_ADVANCE sync point with remnant warning when barFeedSequencing", () => {
    const r = engine.generateMultiChannelSync({
      channel1Ops: ["op"],
      channel2Ops: [],
      barFeedSequencing: true,
    });
    const barAdvance = r.operationSequence.find((s) => s.operation === "BAR_FEED_ADVANCE");
    expect(barAdvance).toEqual({ channel: 1, operation: "BAR_FEED_ADVANCE", syncPoint: "BAR_FEED_COMPLETE" });
    const remnantWarn = r.warnings.some((w) => /remnant/i.test(w));
    expect(remnantWarn).toBe(true);
  });
});

describe("HyperMillMillTurnStrategyEngine — calculateMillTurnStrategy combined", () => {
  const engine = new HyperMillMillTurnStrategyEngine();

  it("returns canonical Kienzle for ISO P (steel) kc1.1=1800", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "od_profile",
      isoGroup: "P",
      vcDesired_m_min: 250,
      minDiameter_mm: 20,
      machineMaxRpm: 6000,
    });
    expect(r.cssCheck.status).toBe("ok");
    expect(r.kienzle.kc1_1).toBe(1800);
    expect(r.kienzle.mc).toBeGreaterThan(0);
    expect(r.kienzle.mc).toBeLessThan(1);
    expect(r.summary).toMatch(/CSS:/);
  });

  it("returns canonical Kienzle for ISO M (stainless) kc1.1=2100", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "id_profile",
      isoGroup: "M",
      vcDesired_m_min: 200,
      minDiameter_mm: 25,
      machineMaxRpm: 6000,
    });
    expect(r.kienzle.kc1_1).toBe(2100);
  });

  it("returns canonical Kienzle for ISO N (aluminum) kc1.1=700", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "od_profile",
      isoGroup: "N",
      vcDesired_m_min: 400,
      minDiameter_mm: 30,
      machineMaxRpm: 12000,
    });
    expect(r.kienzle.kc1_1).toBe(700);
  });

  it("falls back to ISO P kc when isoGroup is unknown", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "od_profile",
      isoGroup: "ZZZ_UNKNOWN_GROUP",
      vcDesired_m_min: 200,
      minDiameter_mm: 20,
      machineMaxRpm: 6000,
    });
    expect(r.kienzle.kc1_1).toBe(1800);
  });

  it("when no cAxisConfig provided, the optional cAxisSync block is absent and summary lacks C-Axis", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "od_profile",
      isoGroup: "P",
      vcDesired_m_min: 250,
      minDiameter_mm: 20,
      machineMaxRpm: 6000,
    });
    expect(r.cAxisSync).toBe(undefined);
    expect(r.multiChannelSync).toBe(undefined);
    expect(r.summary.includes("C-Axis")).toBe(false);
    expect(r.summary.includes("Multi-channel")).toBe(false);
  });

  it("includes cAxisSync block with all 6 indexed positions when cAxisConfig provided", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "cross_hole_pattern",
      isoGroup: "P",
      vcDesired_m_min: 250,
      minDiameter_mm: 20,
      machineMaxRpm: 6000,
      cAxisConfig: {
        syncType: "cross_hole",
        cAngle_deg: 0,
        liveToolRpm: 5000,
        liveToolDiameter_mm: 8,
        featureCount: 6,
      },
    });
    const sync: CAxisSyncResult | undefined = r.cAxisSync;
    expect(sync && sync.cAxisPositions_deg).toEqual([0, 60, 120, 180, 240, 300]);
    expect(r.summary).toContain("C-Axis");
  });

  it("includes multiChannelSync block with parallelEfficiency=50 percent for balanced 2+2", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "od_profile",
      isoGroup: "P",
      vcDesired_m_min: 250,
      minDiameter_mm: 20,
      machineMaxRpm: 6000,
      multiChannelConfig: {
        channel1Ops: ["face", "rough"],
        channel2Ops: ["drill", "ream"],
        controllerFamily: "fanuc",
      },
    });
    const sync: MultiChannelSyncResult | undefined = r.multiChannelSync;
    expect(sync && sync.parallelEfficiency_pct).toBe(50);
    expect(sync && sync.syncCodeTemplate.includes("M200")).toBe(true);
    expect(r.summary).toContain("Multi-channel");
    expect(r.summary).toContain("50%");
  });

  it("propagates CSS error status into the combined result summary", () => {
    const r = engine.calculateMillTurnStrategy({
      strategyGeometry: "od_profile",
      isoGroup: "P",
      vcDesired_m_min: 250,
      minDiameter_mm: 0,
      machineMaxRpm: 6000,
    });
    expect(r.cssCheck.status).toBe("error");
    expect(r.summary).toMatch(/ERROR/);
  });

  it("increments calcCount across method calls (stats observability)", () => {
    const e = new HyperMillMillTurnStrategyEngine();
    expect(e.stats().calculations).toBe(0);
    e.checkCSSLimit({ vcDesired_m_min: 200, minDiameter_mm: 10, machineMaxRpm: 8000 });
    expect(e.stats().calculations).toBe(1);
    e.calculateCAxisSync({ syncType: "cross_hole", cAngle_deg: 0, liveToolRpm: 4000, liveToolDiameter_mm: 8 });
    expect(e.stats().calculations).toBe(2);
    e.calculateMillTurnStrategy({
      strategyGeometry: "od", isoGroup: "P",
      vcDesired_m_min: 200, minDiameter_mm: 10, machineMaxRpm: 8000,
    });
    expect(e.stats().calculations).toBe(3);
  });
});

describe("HyperMillMillTurnStrategyEngine — adversarial inputs", () => {
  const engine = new HyperMillMillTurnStrategyEngine();

  it("checkCSSLimit with NaN diameter does not throw and returns a string message", () => {
    const r = engine.checkCSSLimit({
      vcDesired_m_min: 200,
      minDiameter_mm: Number.NaN,
      machineMaxRpm: 8000,
    });
    expect(["rpm_cap_exceeded", "error", "ok"]).toContain(r.status);
    expect(typeof r.message).toBe("string");
    expect(r.message.length).toBeGreaterThan(0);
  });

  it("calculateCAxisSync with featureCount=0 produces empty positions array (no crash)", () => {
    const r = engine.calculateCAxisSync({
      syncType: "cross_hole",
      cAngle_deg: 0,
      liveToolRpm: 4000,
      liveToolDiameter_mm: 8,
      featureCount: 0,
    });
    expect(r.cAxisPositions_deg).toEqual([]);
    expect(r.vcEffective_m_min).toBeCloseTo(100.5, 1);
  });

  it("generateMultiChannelSync with 50+50 ops produces 100-element sequence at 50 percent efficiency", () => {
    const channel1Ops = Array.from({ length: 50 }, (_, i) => `op1_${i}`);
    const channel2Ops = Array.from({ length: 50 }, (_, i) => `op2_${i}`);
    const r = engine.generateMultiChannelSync({ channel1Ops, channel2Ops });
    expect(r.operationSequence).toHaveLength(100);
    expect(r.parallelEfficiency_pct).toBe(50);
    expect(r.operationSequence[0].channel).toBe(1);
    expect(r.operationSequence[1].channel).toBe(2);
  });

  it("checkCSSLimit with extreme small diameter (0.001mm) caps at machineMaxRpm", () => {
    const r = engine.checkCSSLimit({
      vcDesired_m_min: 100,
      minDiameter_mm: 0.001,
      machineMaxRpm: 12000,
    });
    expect(r.status).toBe("rpm_cap_exceeded");
    expect(r.rpmAtMinDiameter).toBeGreaterThan(1_000_000);
    expect(r.rpmCapped).toBe(12000);
  });
});

describe("camDispatcher wiring — HyperMillMillTurnStrategyEngine", () => {
  it("registers all three new actions in the action enum", async () => {
    const src = await loadDispatcherSource();
    expect(src).toContain(`"cam_hypermill_css_rpm_check"`);
    expect(src).toContain(`"cam_hypermill_caxis_indexing"`);
    expect(src).toContain(`"cam_hypermill_millturn_full_strategy"`);
  });

  it("declares hmMillTurnStrat lazy getter case importing the engine singleton", async () => {
    const src = await loadDispatcherSource();
    const getterRegex = /case\s+"hmMillTurnStrat"\s*:[\s\S]*?hyperMillMillTurnStrategyEngine/;
    expect(src).toMatch(getterRegex);
    expect(src).toContain(`import("${ENGINE_IMPORT_LITERAL}")`);
  });

  it("css_rpm_check case calls checkCSSLimit through getEngine and normalizes snake/camel", async () => {
    const src = await loadDispatcherSource();
    const caseRegex = /case\s+"cam_hypermill_css_rpm_check"\s*:[\s\S]*?break;/;
    const match = src.match(caseRegex);
    expect(match === null).toBe(false);
    const body = match ? match[0] : "";
    expect(body).toContain(`getEngine("hmMillTurnStrat")`);
    expect(body).toContain("checkCSSLimit");
    expect(body).toMatch(/vc_desired_m_min\s*\?\?\s*params\.vcDesired_m_min/);
    expect(body).toMatch(/min_diameter_mm\s*\?\?\s*params\.minDiameter_mm/);
    expect(body).toMatch(/machine_max_rpm\s*\?\?\s*params\.machineMaxRpm/);
  });

  it("caxis_indexing case calls calculateCAxisSync with normalized sync_type and c_angle params", async () => {
    const src = await loadDispatcherSource();
    const caseRegex = /case\s+"cam_hypermill_caxis_indexing"\s*:[\s\S]*?break;/;
    const match = src.match(caseRegex);
    expect(match === null).toBe(false);
    const body = match ? match[0] : "";
    expect(body).toContain(`getEngine("hmMillTurnStrat")`);
    expect(body).toContain("calculateCAxisSync");
    expect(body).toMatch(/sync_type\s*\?\?\s*params\.syncType/);
    expect(body).toMatch(/c_angle_deg\s*\?\?\s*params\.cAngle_deg/);
    expect(body).toMatch(/feature_count\s*\?\?\s*params\.featureCount/);
  });

  it("millturn_full_strategy case calls calculateMillTurnStrategy with combined inputs", async () => {
    const src = await loadDispatcherSource();
    const caseRegex = /case\s+"cam_hypermill_millturn_full_strategy"\s*:[\s\S]*?break;/;
    const match = src.match(caseRegex);
    expect(match === null).toBe(false);
    const body = match ? match[0] : "";
    expect(body).toContain(`getEngine("hmMillTurnStrat")`);
    expect(body).toContain("calculateMillTurnStrategy");
    expect(body).toMatch(/strategy_geometry\s*\?\?\s*params\.strategyGeometry/);
    expect(body).toMatch(/iso_group\s*\?\?\s*params\.isoGroup/);
    expect(body).toMatch(/c_axis_config\s*\?\?\s*params\.cAxisConfig/);
    expect(body).toMatch(/multi_channel_config\s*\?\?\s*params\.multiChannelConfig/);
  });

  it("does NOT collide with existing cam_hypermill_millturn_strategy which uses HyperMillStrategyEngine", async () => {
    const src = await loadDispatcherSource();
    const oldStrategy = src.match(/case\s+"cam_hypermill_millturn_strategy"\s*:[\s\S]*?break;/);
    expect(oldStrategy === null).toBe(false);
    const oldBody = oldStrategy ? oldStrategy[0] : "";
    expect(oldBody).toContain("hyperMillStrategyEngine");
    const newStrategy = src.match(/case\s+"cam_hypermill_millturn_full_strategy"\s*:[\s\S]*?break;/);
    expect(newStrategy === null).toBe(false);
    const newBody = newStrategy ? newStrategy[0] : "";
    expect(newBody).toContain(`getEngine("hmMillTurnStrat")`);
  });
});
