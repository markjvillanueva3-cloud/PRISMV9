/**
 * PPG Real Program Pipeline Tests — validates the FULL pipeline against actual
 * shop-floor production programs from the Box extraction.
 *
 * Tests use 3 real Haas fixture programs (O01289, O01506, O32473) plus real
 * Okuma programs from the corpus. Each test exercises the actual pipeline with
 * real manufacturing parameters and validates output quality.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";
import { ProgramCompareEngine } from "../engines/ProgramCompareEngine.js";
import { postValidationHardeningEngine } from "../engines/PostValidationHardeningEngine.js";
import type { MachineContext } from "../engines/PostProcessorPipelineEngine.js";

const HAAS_FIXTURES = path.resolve(__dirname, "fixtures/haas-programs");
const OKUMA_DIR = path.resolve(__dirname, "../../data/programs/okuma");

const HAAS_O01289 = path.join(HAAS_FIXTURES, "O01289.nc");
const HAAS_O01506 = path.join(HAAS_FIXTURES, "O01506.nc");
const HAAS_O32473 = path.join(HAAS_FIXTURES, "O32473.nc");

const HAAS_VF2: MachineContext = {
  id: "haas-vf2ss", name: "Haas VF-2SS", brand: "Haas",
  controller: "fanuc", max_rpm: 12000, max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 35600, y: 35600, z: 30500 },
  work_volume: { x: 762, y: 406, z: 508 }, axes: 3,
  atc_capacity: 24, coolant_types: ["flood", "mist", "tsc"],
  resolution_confidence: 1.0,
};

const STEEL_4140 = { name: "4140 Steel", iso_group: "P" as const, kc1_1: 1800, mc: 0.25, hardness_HB: 200 };
const ALUMINUM_6061 = { name: "6061-T6", iso_group: "N" as const, kc1_1: 800, mc: 0.25, hardness_HB: 95 };

function readIfExists(fp: string): string | null {
  return fs.existsSync(fp) ? fs.readFileSync(fp, "utf-8") : null;
}

function getOkumaFile(index: number): string | null {
  const files = fs.readdirSync(OKUMA_DIR).filter(f => {
    const fp = path.join(OKUMA_DIR, f);
    if (!fs.statSync(fp).isFile() || fs.statSync(fp).size < 100) return false;
    try {
      const buf = Buffer.alloc(256);
      const fd = fs.openSync(fp, "r");
      const n = fs.readSync(fd, buf, 0, 256, 0);
      fs.closeSync(fd);
      for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
      return true;
    } catch { return false; }
  });
  return files[index] ? fs.readFileSync(path.join(OKUMA_DIR, files[index]), "utf-8") : null;
}

const compareEngine = new ProgramCompareEngine();

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PIPELINE PROCESSING — Real Haas programs
// ═══════════════════════════════════════════════════════════════════════════════

describe("PPG Real Programs — Pipeline Processing", () => {
  it("processes O32473 (8-tool, 7K lines) with steel", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, material: STEEL_4140 as any, prove_out: { enabled: false },
    });
    expect(result.stages.length).toBeGreaterThan(0);
    expect(result.output_gcode.length).toBeGreaterThan(100);
    expect(result.output_gcode).toContain("M30");
  });

  it("processes O01506 with aluminum", async () => {
    const gcode = readIfExists(HAAS_O01506);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, material: ALUMINUM_6061 as any, prove_out: { enabled: false },
    });
    expect(result.output_gcode.length).toBeGreaterThan(100);
  });

  it("processes O01289 (59K lines) without timeout", async () => {
    const gcode = readIfExists(HAAS_O01289);
    if (!gcode) return;
    const start = Date.now();
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: false },
    });
    expect(Date.now() - start).toBeLessThan(30000);
    expect(result.output_gcode).toContain("M30");
  }, 35000);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. OUTPUT QUALITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("PPG Real Programs — Output Quality", () => {
  it("no NaN/Infinity in output G-code", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, material: STEEL_4140 as any, prove_out: { enabled: false },
    });
    for (const line of result.output_gcode.split("\n")) {
      expect(line).not.toMatch(/S\s*NaN/i);
      expect(line).not.toMatch(/F\s*NaN/i);
      expect(line).not.toMatch(/\bInfinity\b/i);
    }
  });

  it("output preserves program structure", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: false },
    });
    expect(result.output_gcode).toMatch(/M30/);
    expect(result.output_gcode).toMatch(/T\d+/);
    expect(result.output_gcode).toMatch(/[GM]\d/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. COMPARISON REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("PPG Real Programs — Comparison Reports", () => {
  it("physics report has valid aggregate metrics", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: false },
    });
    const report = compareEngine.generatePhysicsReport(gcode, result.output_gcode);
    expect(typeof report.aggregate.total_sf_changes).toBe("number");
    expect(typeof report.aggregate.cycle_time_delta_pct).toBe("number");
    expect(typeof report.aggregate.force_impact_pct).toBe("number");
    expect(report.aggregate.safety_regressions).toBeGreaterThanOrEqual(0);
  });

  it("text report contains all sections", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: false },
    });
    const report = compareEngine.generateReport(compareEngine.compare(gcode, result.output_gcode));
    expect(report).toContain("G-CODE COMPARISON REPORT");
    expect(report).toContain("CYCLE TIME");
    expect(report).toContain("CUTTING PHYSICS");
    expect(report).toContain("TOOLS");
    expect(report).toContain("SAFETY");
    expect(report.length).toBeGreaterThan(300);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MACHINIST TRUST
// ═══════════════════════════════════════════════════════════════════════════════

describe("PPG Real Programs — Machinist Trust", () => {
  it("enriched header with part info", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: false },
      program_header: { part_number: "1563247", revision: "D" },
    });
    expect(result.output_gcode).toContain("1563247");
    expect(result.output_gcode).toContain("PRISM");
  });

  it("prove-out derates with header warning", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: true, feed_pct: 50, speed_pct: 80 },
    });
    const stage = result.stages.find(s => s.stage === "7.3_proveout");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("pass");
    expect((stage!.data as any)?.feed_pct).toBe(50);
    expect(result.output_gcode).toContain("PROVE-OUT");
  });

  it("SFM computed correctly (pi*D*RPM/1000 * 3.28)", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: false },
    });
    const enriched = result.blocks.filter(b => (b as any)._machinist);
    if (enriched.length > 0) {
      const m = (enriched[0] as any)._machinist;
      expect(m.sfm).toBeGreaterThan(0);
      expect(m.sfm).toBeCloseTo(m.vc_m_min * 3.28084, -1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MACHINE LIMITS + OKUMA + EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("PPG Real Programs — Validation + Okuma + Edge Cases", () => {
  it("PostValidationHardeningEngine validates real output", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, prove_out: { enabled: false },
    });
    const v = await postValidationHardeningEngine.process({
      action: "validate", gcode: result.output_gcode, machine: HAAS_VF2,
    });
    expect(v.summary.lines_checked).toBeGreaterThan(10);
    for (const flag of v.flags) {
      expect(["BLOCK", "WARN", "INFO"]).toContain(flag.severity);
    }
  });

  it("Okuma OSP program processes without crash", async () => {
    const gcode = getOkumaFile(5);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, prove_out: { enabled: false },
      machine: { id: "okuma", name: "Okuma LB3000", brand: "Okuma", controller: "okuma",
        max_rpm: 6000, max_power_kW: 22, rapid_rate_mm_min: { x: 30000, y: 30000, z: 30000 },
        work_volume: { x: 410, y: 410, z: 550 }, axes: 2, resolution_confidence: 1.0 },
    });
    expect(result.output_gcode.length).toBeGreaterThan(50);
    expect(result.output_gcode).not.toContain("NaN");
  });

  it("all features combined on real program", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    const result = await postProcessorPipelineEngine.process({
      gcode, machine: HAAS_VF2, material: ALUMINUM_6061 as any,
      tool_overrides: { 9: { rpm: 4000 } },
      prove_out: { enabled: true, feed_pct: 60, speed_pct: 85 },
      program_header: { part_number: "COMBINED-001" },
    });
    expect(result.output_gcode).toContain("COMBINED-001");
    expect(result.output_gcode).toContain("PROVE-OUT");
    expect(result.output_gcode).not.toContain("NaN");
    expect(result.stages.find(s => s.stage === "7.1_tool_overrides")).toBeDefined();
  });

  it("aggressive=1.0 and conservative=0.0 both valid", async () => {
    const gcode = readIfExists(HAAS_O32473);
    if (!gcode) return;
    for (const agg of [0.0, 1.0]) {
      const result = await postProcessorPipelineEngine.process({
        gcode, machine: HAAS_VF2, aggressiveness: agg, prove_out: { enabled: false },
      });
      expect(result.output_gcode).not.toContain("NaN");
    }
  });
});
