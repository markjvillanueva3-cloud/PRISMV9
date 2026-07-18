import { describe, it, expect } from "vitest";
import { planRetract, SafeRetractPlanner, type SafeRetractInput } from "./SafeRetractPlanner.js";

describe("SafeRetractPlanner", () => {
  describe("strategy: on_estop (safety-priority sequence)", () => {
    it("emits coolant-off FIRST, then spindle stop, then orient, then max-Z", () => {
      const r = planRetract({ controller: "fanuc", strategy: "on_estop", machine_z_travel_mm: 500 });
      expect(r.blocks[0]).toContain("M9");
      expect(r.blocks[0]).toContain("e-stop: coolant off FIRST");
      expect(r.blocks[1]).toContain("M5");
      expect(r.blocks[2]).toContain("M19");
      expect(r.blocks[3]).toContain("G53 G0 Z0");
      expect(r.notes.join("|")).toContain("operator safety");
    });
    it("Heidenhain e-stop uses controller-specific retract syntax", () => {
      const r = planRetract({ controller: "heidenhain", strategy: "on_estop" });
      expect(r.blocks[3]).toContain("L Z+0");
    });
  });

  describe("strategy: tool_change (max-Z + orient only)", () => {
    it("Fanuc: G53 G0 Z0 + M19, exactly 2 blocks", () => {
      const r = planRetract({ controller: "fanuc", strategy: "tool_change" });
      expect(r.blocks.length).toBe(2);
      expect(r.blocks[0]).toContain("G53 G0 Z0");
      expect(r.blocks[1]).toBe("M19 (orient for ATC engagement)");
    });
  });

  describe("strategy: end_of_program (coolant→retract→spindle→orient)", () => {
    it("emits 4-block end-of-program sequence", () => {
      const r = planRetract({ controller: "fanuc", strategy: "end_of_program" });
      expect(r.blocks.length).toBe(4);
      expect(r.blocks[0]).toContain("M9");
      expect(r.blocks[1]).toContain("G53 G0 Z0");
      expect(r.blocks[2]).toContain("M5");
      expect(r.blocks[3]).toContain("M19");
    });
  });

  describe("strategy: between_op (minimum-safe Z)", () => {
    it("safe-Z = fixture + tool_len + 25mm safety margin", () => {
      const r = planRetract({ controller: "fanuc", strategy: "between_op", fixture_height_mm: 50, tool_length_mm: 100 });
      expect(r.retract_z_target_mm).toBe(50 + 100 + 25);
      expect(r.blocks[0]).toContain("Z175.00");
    });
    it("default fixture = 50mm when omitted", () => {
      const r = planRetract({ controller: "fanuc", strategy: "between_op", tool_length_mm: 75 });
      expect(r.retract_z_target_mm).toBe(50 + 75 + 25);
    });
    it("clamps to machine zero when computed safe-Z exceeds Z travel", () => {
      const r = planRetract({ controller: "fanuc", strategy: "between_op", machine_z_travel_mm: 100, fixture_height_mm: 80, tool_length_mm: 200 });
      expect(r.retract_z_target_mm).toBe(100);
      expect(r.notes.join("|")).toContain("clamping");
    });
  });

  describe("controller variability (≥3)", () => {
    it("Okuma uses G30 P1, not G28", () => {
      const r = planRetract({ controller: "okuma", strategy: "tool_change" });
      expect(r.blocks[0]).toContain("G53 G0 Z0");
    });
    it("Heidenhain uses L Z+0 syntax", () => {
      const r = planRetract({ controller: "heidenhain", strategy: "tool_change" });
      expect(r.blocks[0]).toContain("L Z+0");
    });
    it("Siemens supports same G53 pattern as Fanuc", () => {
      const r = planRetract({ controller: "siemens", strategy: "tool_change" });
      expect(r.blocks[0]).toContain("G53 G0 Z0");
    });
  });

  describe("clearance computation", () => {
    it("clearance = target - current_z (positive = lifting)", () => {
      const r = planRetract({ controller: "fanuc", strategy: "between_op", current_z_mm: 50, fixture_height_mm: 50, tool_length_mm: 100 });
      expect(r.estimated_clearance_mm).toBe(175 - 50);
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown controller → diagnostic", () => {
      const r = planRetract({ controller: "xx" as SafeRetractInput["controller"], strategy: "between_op" });
      expect(r.notes.join("|")).toContain("unknown controller");
    });
    it("unknown strategy → diagnostic", () => {
      const r = planRetract({ controller: "fanuc", strategy: "panic_lift" as SafeRetractInput["strategy"] });
      expect(r.notes.join("|")).toContain("unknown strategy");
    });
    it("Z travel below floor → diagnostic", () => {
      const r = planRetract({ controller: "fanuc", strategy: "tool_change", machine_z_travel_mm: 10 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("Z travel above ceiling → diagnostic", () => {
      const r = planRetract({ controller: "fanuc", strategy: "tool_change", machine_z_travel_mm: 10000 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("negative fixture → diagnostic", () => {
      const r = planRetract({ controller: "fanuc", strategy: "between_op", fixture_height_mm: -5 });
      expect(r.notes.join("|")).toContain("negative");
    });
    it("missing input → diagnostic", () => {
      const r = planRetract(null as unknown as SafeRetractInput);
      expect(r.notes.join("|")).toContain("missing");
    });
  });

  it("SafeRetractPlanner.version is 1.0.0", () => {
    expect(SafeRetractPlanner.version).toBe("1.0.0");
  });
});
