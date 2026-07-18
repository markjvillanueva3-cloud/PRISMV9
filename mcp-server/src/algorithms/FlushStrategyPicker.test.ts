import { describe, it, expect } from "vitest";
import { pickFlush, FlushStrategyPicker, type FlushInput } from "./FlushStrategyPicker.js";

describe("FlushStrategyPicker", () => {
  describe("skim/finish rule (always minimal_jet)", () => {
    it("steel skim at any thickness → minimal_jet, 2 bar", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 50, cut_type: "skim" });
      expect(r.strategy).toBe("minimal_jet");
      expect(r.recommended_pressure_bar.value).toBe(2);
      expect(r.reasons.join("|")).toContain("ruined Ra");
    });
    it("final_finish → minimal_jet (preserves Ra)", () => {
      const r = pickFlush({ workpiece_material: "tool_steel", thickness_mm: 30, cut_type: "final_finish" });
      expect(r.strategy).toBe("minimal_jet");
      expect(r.recommended_pressure_bar.value).toBe(2);
    });
  });

  describe("conductive material rule (always submerged)", () => {
    it("carbide → submerged regardless of thickness", () => {
      const r = pickFlush({ workpiece_material: "carbide", thickness_mm: 10, cut_type: "rough" });
      expect(r.strategy).toBe("submerged");
      expect(r.reasons.join("|")).toContain("conductive");
      expect(r.notes.join("|")).toContain("deionized");
    });
    it("graphite → submerged", () => {
      const r = pickFlush({ workpiece_material: "graphite", thickness_mm: 5, cut_type: "rough" });
      expect(r.strategy).toBe("submerged");
      expect(r.recommended_pressure_bar.value).toBe(0);
    });
    it("copper → submerged", () => {
      const r = pickFlush({ workpiece_material: "copper", thickness_mm: 5, cut_type: "rough" });
      expect(r.strategy).toBe("submerged");
      expect(r.recommended_pressure_bar.value).toBe(0);
    });
  });

  describe("thickness regimes (3+ variability)", () => {
    it("thin (<20mm) steel rough → high_pressure_jet at 12 bar", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 10, cut_type: "rough" });
      expect(r.strategy).toBe("high_pressure_jet");
      expect(r.recommended_pressure_bar.value).toBe(12);
    });
    it("medium (20-80mm) steel rough → hybrid at 10 bar", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 50, cut_type: "rough" });
      expect(r.strategy).toBe("hybrid");
      expect(r.recommended_pressure_bar.value).toBe(10);
    });
    it("thick (>80mm) steel rough → submerged, jets OFF (0 bar)", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 120, cut_type: "rough" });
      expect(r.strategy).toBe("submerged");
      expect(r.recommended_pressure_bar.value).toBe(0);
      expect(r.reasons.join("|")).toContain("turbulence");
    });
    it("aluminum + thin rough → high_pressure_jet at 12 bar", () => {
      const r = pickFlush({ workpiece_material: "aluminum", thickness_mm: 8, cut_type: "rough" });
      expect(r.strategy).toBe("high_pressure_jet");
      expect(r.recommended_pressure_bar.value).toBe(12);
    });
    it("titanium + medium rough → hybrid at 10 bar", () => {
      const r = pickFlush({ workpiece_material: "titanium", thickness_mm: 40, cut_type: "rough" });
      expect(r.strategy).toBe("hybrid");
      expect(r.recommended_pressure_bar.value).toBe(10);
    });
  });

  describe("machine-capability fallback", () => {
    it("no jet nozzles + thin rough → fallback submerged with diagnostic", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 10, cut_type: "rough", has_jet_nozzles: false });
      expect(r.strategy).toBe("submerged");
      expect(r.recommended_pressure_bar.value).toBe(0);
      expect(r.notes.join("|")).toContain("lacks jet nozzles");
    });
    it("no jet nozzles + medium → submerged (not hybrid)", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 50, cut_type: "rough", has_jet_nozzles: false });
      expect(r.strategy).toBe("submerged");
      expect(r.recommended_pressure_bar.value).toBe(0);
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown material → diagnostic", () => {
      const r = pickFlush({ workpiece_material: "plastic" as FlushInput["workpiece_material"], thickness_mm: 10, cut_type: "rough" });
      expect(r.notes.join("|")).toContain("unknown workpiece_material");
      expect(r.recommended_pressure_bar.value).toBe(0);
    });
    it("unknown cut_type → diagnostic", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 10, cut_type: "drill" as FlushInput["cut_type"] });
      expect(r.notes.join("|")).toContain("unknown cut_type");
    });
    it("NaN thickness → diagnostic", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: NaN, cut_type: "rough" });
      expect(r.notes.join("|")).toContain("not finite");
    });
    it("zero thickness → diagnostic", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 0, cut_type: "rough" });
      expect(r.notes.join("|")).toContain("> 0");
    });
    it("negative thickness → diagnostic", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: -5, cut_type: "rough" });
      expect(r.notes.join("|")).toContain("> 0");
    });
    it("thickness above ceiling → diagnostic", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 600, cut_type: "rough" });
      expect(r.notes.join("|")).toContain("ceiling");
    });
    it("missing input → diagnostic", () => {
      const r = pickFlush(null as unknown as FlushInput);
      expect(r.notes.join("|")).toContain("missing");
    });
  });

  describe("AtomicValue provenance — concrete values", () => {
    it("medium-rough hybrid: source naming + nozzle clearance fixed at 0.08mm each", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 50, cut_type: "rough" });
      expect(r.recommended_pressure_bar.source).toBe("medium-rule");
      expect(r.upper_nozzle_clearance_mm.value).toBe(0.08);
      expect(r.lower_nozzle_clearance_mm.value).toBe(0.08);
      expect(r.recommended_pressure_bar.confidence).toBe(0.88);
    });
    it("thin-rough source = 'thin-rough-rule', clearance = 0.05mm", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 10, cut_type: "rough" });
      expect(r.recommended_pressure_bar.source).toBe("thin-rough-rule");
      expect(r.upper_nozzle_clearance_mm.value).toBe(0.05);
    });
    it("thick submerged source = 'thick-rule', clearance = 0.15mm", () => {
      const r = pickFlush({ workpiece_material: "steel", thickness_mm: 120, cut_type: "rough" });
      expect(r.recommended_pressure_bar.source).toBe("thick-rule");
      expect(r.upper_nozzle_clearance_mm.value).toBe(0.15);
    });
  });

  it("FlushStrategyPicker.version is 1.0.0", () => {
    expect(FlushStrategyPicker.version).toBe("1.0.0");
  });
});
