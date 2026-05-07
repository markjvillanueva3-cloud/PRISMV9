/**
 * Tests for WEDMPrintToProgramEngine
 * (Covers engine-level behavior beyond the gate-specific suites.)
 */
import { describe, it, expect } from "vitest";
import {
  wedmPrintToProgramEngine,
  WEDMPrintToProgramEngine,
} from "../engines/WEDMPrintToProgramEngine.js";

const squareDxf = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
4
70
1
10
0.0
20
0.0
10
25.0
20
0.0
10
25.0
20
25.0
10
0.0
20
25.0
0
ENDSEC
0
EOF`;

describe("WEDMPrintToProgramEngine — pipeline end-to-end", () => {
  it("emits a program with M30 termination and G41/G40 pairing", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
    });
    expect(r.program_text).toContain("M30");
    expect(r.program_text).toContain("G41");
    expect(r.program_text).toContain("G40");
  });

  it("emits G21 metric and G90 absolute", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
    });
    expect(r.program_text).toContain("G21");
    expect(r.program_text).toContain("G90");
  });

  it("plans at least one rough pass", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 3.0,
    });
    expect(r.pass_details!.some((p) => p.pass_type === "rough")).toBe(true);
  });

  it("adds skim passes when target Ra is tight", async () => {
    const rTight = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 0.4,
    });
    const rLoose = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 3.0,
    });
    expect(rTight.pass_details!.length).toBeGreaterThan(rLoose.pass_details!.length);
  });

  it("accepts contours directly (bypass DXF parse)", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      contours: [
        {
          id: "c1",
          segments: [
            { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
            { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
            { type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } },
            { type: "line", start: { x: 0, y: 10 }, end: { x: 0, y: 0 } },
          ],
          is_closed: true,
          is_clockwise: true,
          bbox: { min_x: 0, max_x: 10, min_y: 0, max_y: 10 },
        },
      ],
      material: "4140",
      thickness_mm: 30,
    });
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("geometry_summary matches input contour count", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      contours: [
        {
          id: "c1",
          segments: [
            { type: "line", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } },
          ],
          is_closed: false,
          is_clockwise: true,
          bbox: { min_x: 0, max_x: 5, min_y: 0, max_y: 0 },
        },
      ],
      material: "D2",
      thickness_mm: 20,
    });
    expect(r.geometry_summary!.num_contours).toBe(1);
  });

  it("returns error when neither contours nor dxf_content provided", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      material: "D2",
      thickness_mm: 25,
    });
    expect(r.success).toBe(false);
    expect(r.warnings.some((w) => w.includes("No contours or dxf_content"))).toBe(true);
  });

  it("emits thick-section warning above 80mm", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 100,
    });
    expect(r.warnings.some((w) => /thick|flushing/i.test(w))).toBe(true);
  });

  it("cycle_time_breakdown sums to total_time_min", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
    });
    const t = r.cycle_time_breakdown!;
    expect(t.total_time_min).toBeCloseTo(
      t.rough_cut_min + t.skim_passes_min + t.thread_wire_min + t.setup_min,
      3
    );
  });

  it("engine class is instantiable independently", async () => {
    const e = new WEDMPrintToProgramEngine();
    const r = await e.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
    });
    expect(r.success).toBe(true);
  });

  it("confidence_score.overall is in (0, 1]", async () => {
    const r = await wedmPrintToProgramEngine.generate({
      dxf_content: squareDxf,
      material: "D2",
      thickness_mm: 25,
    });
    expect(r.confidence_score!.overall).toBeGreaterThan(0);
    expect(r.confidence_score!.overall).toBeLessThanOrEqual(1);
  });
});
