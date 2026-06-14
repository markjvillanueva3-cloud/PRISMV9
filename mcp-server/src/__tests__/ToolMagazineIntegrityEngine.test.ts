import { describe, it, expect } from "vitest";
import {
  toolMagazineIntegrityEngine as eng,
  ToolMagazineIntegrityEngine,
  type ToolMagazineIntegrityInput,
} from "../engines/ToolMagazineIntegrityEngine.js";

describe("ToolMagazineIntegrityEngine", () => {
  it("exports a singleton with check() method", () => {
    expect(eng).toBeInstanceOf(ToolMagazineIntegrityEngine);
    expect(typeof eng.check).toBe("function");
  });

  it("throws on missing program_id / magazine / required", () => {
    expect(() => eng.check({} as ToolMagazineIntegrityInput)).toThrow(/program_id \+ magazine\[\] \+ required\[\]/);
  });

  it("integrity_ok when all tools in correct pockets with matching offsets", () => {
    const r = eng.check({
      program_id: "PRG-001",
      magazine: [
        { pocket: 1, tool_id: "T01", length_offset_mm: 50.0, diameter_offset_mm: 6.0, remaining_life_min: 120 },
        { pocket: 2, tool_id: "T02", length_offset_mm: 75.0, diameter_offset_mm: 10.0, remaining_life_min: 60 },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 },
        { tool_id: "T02", pocket: 2, required_length_mm: 75.0, required_diameter_mm: 10.0, predicted_use_min: 15 },
      ],
    });
    expect(r.verdict).toBe("integrity_ok");
    expect(r.critical_count).toBe(0);
    expect(r.confidence.value).toBe(1);
  });

  it("integrity_block when wrong tool in pocket (crash hazard)", () => {
    const r = eng.check({
      program_id: "PRG-002",
      magazine: [
        { pocket: 1, tool_id: "T22", length_offset_mm: 50.0, diameter_offset_mm: 6.0 },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 },
      ],
    });
    expect(r.verdict).toBe("integrity_block");
    expect(r.violations[0].kind).toBe("wrong_pocket");
    expect(r.violations[0].detail).toMatch(/pocket 1 holds T22/i);
  });

  it("integrity_block when required pocket is empty", () => {
    const r = eng.check({
      program_id: "PRG-003",
      magazine: [
        { pocket: 1, tool_id: null },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 },
      ],
    });
    expect(r.verdict).toBe("integrity_block");
    expect(r.violations[0].kind).toBe("missing_tool");
  });

  it("integrity_block when required pocket doesn't exist in magazine", () => {
    const r = eng.check({
      program_id: "PRG-004",
      magazine: [
        { pocket: 1, tool_id: "T01", length_offset_mm: 50.0, diameter_offset_mm: 6.0 },
      ],
      required: [
        { tool_id: "T99", pocket: 99, required_length_mm: 30.0, required_diameter_mm: 4.0, predicted_use_min: 10 },
      ],
    });
    expect(r.verdict).toBe("integrity_block");
    expect(r.violations[0].kind).toBe("missing_tool");
    expect(r.violations[0].detail).toMatch(/does not exist/);
  });

  it("integrity_block on length-offset drift > 0.02mm tolerance", () => {
    const r = eng.check({
      program_id: "PRG-005",
      magazine: [
        { pocket: 1, tool_id: "T01", length_offset_mm: 50.10, diameter_offset_mm: 6.0 },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 },
      ],
    });
    expect(r.verdict).toBe("integrity_block");
    expect(r.violations[0].kind).toBe("offset_drift_length");
    expect(r.violations[0].detail).toMatch(/0\.100mm/);
  });

  it("integrity_block on diameter-offset drift > 0.005mm tolerance", () => {
    const r = eng.check({
      program_id: "PRG-006",
      magazine: [
        { pocket: 1, tool_id: "T01", length_offset_mm: 50.0, diameter_offset_mm: 6.020 },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 },
      ],
    });
    expect(r.verdict).toBe("integrity_block");
    expect(r.violations[0].kind).toBe("offset_drift_diameter");
  });

  it("respects custom tolerances per requirement", () => {
    const r = eng.check({
      program_id: "PRG-007",
      magazine: [
        { pocket: 1, tool_id: "T01", length_offset_mm: 50.05, diameter_offset_mm: 6.0 },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0,
          predicted_use_min: 30, length_tol_mm: 0.1 },  // loose tol → passes
      ],
    });
    expect(r.verdict).toBe("integrity_ok");
  });

  it("integrity_warn on insufficient tool life (not critical)", () => {
    const r = eng.check({
      program_id: "PRG-008",
      magazine: [
        { pocket: 1, tool_id: "T01", length_offset_mm: 50.0, diameter_offset_mm: 6.0, remaining_life_min: 10 },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 },
      ],
    });
    expect(r.verdict).toBe("integrity_warn");
    expect(r.warning_count).toBe(1);
    expect(r.violations[0].kind).toBe("insufficient_life");
  });

  it("multiple violations counted; critical wins", () => {
    const r = eng.check({
      program_id: "PRG-009",
      magazine: [
        { pocket: 1, tool_id: "T01", length_offset_mm: 50.0, diameter_offset_mm: 6.0, remaining_life_min: 10 },
        { pocket: 2, tool_id: "WRONG", length_offset_mm: 75.0, diameter_offset_mm: 10.0 },
      ],
      required: [
        { tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 },
        { tool_id: "T02", pocket: 2, required_length_mm: 75.0, required_diameter_mm: 10.0, predicted_use_min: 15 },
      ],
    });
    expect(r.verdict).toBe("integrity_block");
    expect(r.critical_count).toBeGreaterThanOrEqual(1);
    expect(r.warning_count).toBeGreaterThanOrEqual(1);
  });

  it("every violation cites a fix", () => {
    const r = eng.check({
      program_id: "PRG-010",
      magazine: [{ pocket: 1, tool_id: "WRONG", length_offset_mm: 50.0, diameter_offset_mm: 6.0 }],
      required: [{ tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 30 }],
    });
    for (const viol of r.violations) {
      expect(viol.fix.length).toBeGreaterThan(10);
      expect(viol.detail.length).toBeGreaterThan(10);
    }
  });

  it("integrity_ok when required[] empty (vacuous truth)", () => {
    const r = eng.check({
      program_id: "PRG-011",
      magazine: [{ pocket: 1, tool_id: "T01" }],
      required: [],
    });
    expect(r.verdict).toBe("integrity_ok");
    expect(r.confidence.value).toBe(1);
  });

  it("cites ISO 16090-1 + Sandvik in source", () => {
    const r = eng.check({
      program_id: "PRG-012",
      magazine: [{ pocket: 1, tool_id: "T01", length_offset_mm: 50.0, diameter_offset_mm: 6.0 }],
      required: [{ tool_id: "T01", pocket: 1, required_length_mm: 50.0, required_diameter_mm: 6.0, predicted_use_min: 10 }],
    });
    expect(r.source).toMatch(/ISO 16090|Sandvik/);
  });
});
