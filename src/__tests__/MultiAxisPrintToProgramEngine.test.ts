import { describe, expect, it } from "vitest";
import { multiAxisPrintToProgramEngine } from "../engines/MultiAxisPrintToProgramEngine.js";

describe("MultiAxisPrintToProgramEngine", () => {
  it("fails closed when critical machine or singularity warnings are present", () => {
    // Singularity occurs at A≈0° (gimbal lock for AC table-table config)
    // Ref: Altintas 2012, She & Hung 2008 — corrected in CALC-HARDEN
    const result = multiAxisPrintToProgramEngine.calculate("multiaxis_print_to_program", {
      material: { material_name: "Ti-6Al-4V", iso_group: "S" },
      has_rtcp: false,
      features: [
        {
          id: "F1",
          type: "5ax_contour",
          orientation: { A_deg: 2, B_deg: 0, C_deg: 0 },
          depth_mm: 8,
          length_mm: 40,
          width_mm: 10,
        },
      ],
    } as any);

    expect(result.success).toBe(false);
    expect(result.program_text).toBe("");
    expect(result.program_line_count).toBe(0);
    expect(result.warnings.some(w => w.severity === "critical")).toBe(true);
  });

  it("returns a real program for a safe indexed drilling case", () => {
    const result = multiAxisPrintToProgramEngine.calculate("multiaxis_print_to_program", {
      part_number: "SAFE-3PLUS2",
      material: { material_name: "6061 Aluminum", iso_group: "N" },
      has_rtcp: true,
      features: [
        {
          id: "F1",
          type: "angled_hole",
          orientation: { A_deg: 25, B_deg: 0, C_deg: 0 },
          diameter_mm: 8,
          depth_mm: 20,
        },
      ],
    } as any);

    expect(result.success).toBe(true);
    expect(result.program_text).toContain("G68.2");
    expect(result.program_line_count).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.severity === "critical")).toBe(false);
  });
});
