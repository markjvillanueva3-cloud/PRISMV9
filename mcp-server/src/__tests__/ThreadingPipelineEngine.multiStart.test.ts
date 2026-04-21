/**
 * MILL-MASTER-P3-U01-THREAD-MULTI — Multi-start threading test
 *
 * Verifies `threadingPipelineEngine.generateMultiStart()`:
 *   - Emits N G76 blocks (one per start) for multi-start threads
 *   - Angular spacing is 360 / starts° exactly
 *   - Controller-aware mode selection (h_param / q_offset / z_offset)
 *   - Fanuc 30i+ / Haas NGC → h_param (H parameter supported)
 *   - Generic Fanuc / Okuma / Mitsubishi → q_offset (safest, works on older)
 *   - Siemens / Heidenhain → z_offset (pre-position Z by pitch × start)
 *   - Lead_mm = pitch × starts (axial advance per rev)
 *   - starts=1 collapses to single-start (no offset)
 *   - Graceful clamping: starts<1 → 1, non-integer rounds
 *   - Warning on unusual starts > 6
 *   - Never throws on bad input
 */
import { describe, it, expect } from "vitest";
import { threadingPipelineEngine } from "../engines/ThreadingPipelineEngine.js";

const base = {
  major_diameter_mm: 20,
  minor_diameter_mm: 17.5,
  pitch_mm: 2.0,
  thread_length_mm: 30,
};

describe("MILL-MASTER-P3-U01 · generateMultiStart core contract", () => {
  it("single-start: emits 1 G76 pass block, 0° spacing", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 1, controller: "fanuc_30i",
    });
    expect(r.start_blocks).toBe(1);
    expect(r.angular_spacing_deg).toBe(0);
    expect(r.strategy).toBe("single-start");
    const g76Lines = r.gcode.filter((l) => l.startsWith("G76 X"));
    expect(g76Lines).toHaveLength(1);
  });

  it("2-start: emits 2 G76 pass blocks, 180° spacing, lead = 2×pitch", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "fanuc_30i",
    });
    expect(r.start_blocks).toBe(2);
    expect(r.angular_spacing_deg).toBe(180);
    expect(r.lead_mm).toBeCloseTo(4.0, 5);
    const g76Lines = r.gcode.filter((l) => l.startsWith("G76 X"));
    expect(g76Lines).toHaveLength(2);
  });

  it("3-start: 120° spacing, lead = 3×pitch", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 3, controller: "fanuc_30i",
    });
    expect(r.start_blocks).toBe(3);
    expect(r.angular_spacing_deg).toBeCloseTo(120, 5);
    expect(r.lead_mm).toBeCloseTo(6.0, 5);
  });

  it("4-start: 90° spacing, lead = 4×pitch", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 4, controller: "fanuc_30i",
    });
    expect(r.angular_spacing_deg).toBeCloseTo(90, 5);
    expect(r.lead_mm).toBeCloseTo(8.0, 5);
  });

  it("emits per-start labeled comments with offset angle", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 3, controller: "fanuc_30i",
    });
    expect(r.gcode.some((l) => l.includes("Start 1 of 3"))).toBe(true);
    expect(r.gcode.some((l) => l.includes("Start 2 of 3"))).toBe(true);
    expect(r.gcode.some((l) => l.includes("Start 3 of 3"))).toBe(true);
    expect(r.gcode.some((l) => l.includes("offset 120.0°"))).toBe(true);
    expect(r.gcode.some((l) => l.includes("offset 240.0°"))).toBe(true);
  });
});

describe("MILL-MASTER-P3-U01 · controller-aware mode selection", () => {
  it("Fanuc 30i → h_param mode (H parameter)", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "fanuc_30i",
    });
    expect(r.mode).toBe("h_param");
    const g76Lines = r.gcode.filter((l) => l.startsWith("G76 X"));
    // The 2nd start should carry H1
    expect(g76Lines[1]).toMatch(/\bH1\b/);
    // First start has no H (or H0 — envelope chose no-H for 1st)
    expect(g76Lines[0]).not.toMatch(/\bH[1-9]/);
  });

  it("Haas NGC → h_param mode", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 3, controller: "haas_ngc",
    });
    expect(r.mode).toBe("h_param");
  });

  it("Generic 'fanuc' → q_offset (safer default for older controllers)", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "fanuc",
    });
    expect(r.mode).toBe("q_offset");
    // 2nd start should carry Q offset = 180000 (180° × 1000 micro-degrees)
    const g76Lines = r.gcode.filter((l) => l.startsWith("G76 X"));
    expect(g76Lines[1]).toMatch(/Q180000/);
  });

  it("Okuma OSP → q_offset mode", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "osp-p300",
    });
    expect(r.mode).toBe("q_offset");
  });

  it("Mitsubishi M800 → q_offset mode", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 4, controller: "mitsubishi_m800",
    });
    expect(r.mode).toBe("q_offset");
    // 4-start q_offset: 360/4 = 90°, 2nd=90000, 3rd=180000, 4th=270000
    const g76Lines = r.gcode.filter((l) => l.startsWith("G76 X"));
    expect(g76Lines[1]).toMatch(/Q90000/);
    expect(g76Lines[2]).toMatch(/Q180000/);
    expect(g76Lines[3]).toMatch(/Q270000/);
  });

  it("Siemens 840D → z_offset mode (Z pre-positioned by s·pitch)", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "siemens_840d",
    });
    expect(r.mode).toBe("z_offset");
    // z_offset: pre-G00 for start 1 should be at Z5+1pitch = Z7.000
    const g00Lines = r.gcode.filter((l) => l.startsWith("G00 X"));
    expect(g00Lines[0]).toMatch(/Z5\.000/);  // start 0
    expect(g00Lines[1]).toMatch(/Z7\.000/);  // start 1 — offset by pitch 2.0
  });

  it("Heidenhain TNC → z_offset mode", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "heidenhain_tnc640",
    });
    expect(r.mode).toBe("z_offset");
  });

  it("Unknown controller → q_offset (safest universal default)", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "made_up_controller",
    });
    expect(r.mode).toBe("q_offset");
  });

  it("explicit multi_start_mode override beats controller default", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "fanuc_30i", multi_start_mode: "z_offset",
    });
    expect(r.mode).toBe("z_offset");
  });
});

describe("MILL-MASTER-P3-U01 · input robustness", () => {
  it("fractional starts rounds to integer + warns", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2.7, controller: "fanuc",
    });
    expect(r.start_blocks).toBe(3);
    expect(r.warnings.some((w) => /rounded/i.test(w))).toBe(true);
  });

  it("starts < 1 clamps to 1 + warns", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 0, controller: "fanuc",
    });
    expect(r.start_blocks).toBe(1);
  });

  it("starts > 6 warns (unusual for turning)", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 8, controller: "fanuc_30i",
    });
    expect(r.warnings.some((w) => /unusual/i.test(w))).toBe(true);
  });

  it("does not throw on minimum valid input", () => {
    expect(() => threadingPipelineEngine.generateMultiStart({
      major_diameter_mm: 6, minor_diameter_mm: 5, pitch_mm: 0.5,
      starts: 1, thread_length_mm: 5, controller: "fanuc",
    })).not.toThrow();
  });

  it("included_angle + chamfer + infeed_strategy flow through to G76 line 1", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 1, controller: "fanuc_30i",
      included_angle_deg: 55, chamfer_threads: 2, infeed_strategy: "modified_flank",
    });
    const line1 = r.gcode.find((l) => /^G76 P\d/.test(l));
    expect(line1).toBeDefined();
    // chamferThreads=2, angleCode=06→05, infeedAngleCode=29
    expect(line1).toMatch(/P01\d0\d\d29/);
  });
});

describe("MILL-MASTER-P3-U01 · G-code structure invariants", () => {
  it("every G76 line 1 (setup) has matching G76 line 2 (pass)", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 3, controller: "fanuc",
    });
    const line1Count = r.gcode.filter((l) => /^G76 P01/.test(l)).length;
    const line2Count = r.gcode.filter((l) => /^G76 X/.test(l)).length;
    expect(line1Count).toBe(line2Count);
    expect(line1Count).toBe(3); // one pair per start
  });

  it("every start pre-positions X to safe approach (threadD + 2)", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 3, controller: "fanuc",
    });
    const g00Lines = r.gcode.filter((l) => l.startsWith("G00 X"));
    expect(g00Lines).toHaveLength(3);
    // major_diameter 20 + 2 clearance = X22.0
    for (const line of g00Lines) {
      expect(line).toMatch(/X22\.0/);
    }
  });

  it("total depth P value computes from (major-minor)/2 × 1000 microns", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 1, controller: "fanuc",
    });
    // (20 - 17.5)/2 × 1000 = 1250
    const line2 = r.gcode.find((l) => /^G76 X\d/.test(l));
    expect(line2).toMatch(/P1250\b/);
  });

  it("pitch F-word matches input pitch", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 2, controller: "fanuc_30i",
    });
    const line2 = r.gcode.filter((l) => /^G76 X\d/.test(l));
    for (const line of line2) {
      expect(line).toMatch(/F2\.000/);
    }
  });

  it("header comment advertises strategy + count + lead", () => {
    const r = threadingPipelineEngine.generateMultiStart({
      ...base, starts: 3, controller: "fanuc",
    });
    expect(r.gcode[0]).toMatch(/3 starts/);
    expect(r.gcode[0]).toMatch(/lead 6mm/);
  });
});
