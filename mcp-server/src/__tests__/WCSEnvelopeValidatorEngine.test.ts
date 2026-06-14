import { describe, it, expect } from "vitest";
import {
  wcsEnvelopeValidatorEngine as eng,
  WCSEnvelopeValidatorEngine,
  type WCSEnvelopeValidatorInput,
} from "../engines/WCSEnvelopeValidatorEngine.js";

function nominal(o: Partial<WCSEnvelopeValidatorInput> = {}): WCSEnvelopeValidatorInput {
  return {
    program_id: "PRG-001",
    machine: { x_travel_mm: 800, y_travel_mm: 500, z_travel_mm: 600, spindle_nose_clearance_mm: 100 },
    workpiece: { g54_x_mm: 100, g54_y_mm: 100, g54_z_mm: 200, extent_x_mm: 200, extent_y_mm: 150, extent_z_mm: 50 },
    tools: [{ tool_id: "T01", stickout_mm: 75, diameter_mm: 10 }],
    ...o,
  };
}

describe("WCSEnvelopeValidatorEngine", () => {
  it("exports a singleton with validate()", () => {
    expect(eng).toBeInstanceOf(WCSEnvelopeValidatorEngine);
    expect(typeof eng.validate).toBe("function");
  });

  it("throws on missing inputs", () => {
    expect(() => eng.validate({} as WCSEnvelopeValidatorInput)).toThrow(/program_id \+ machine \+ workpiece \+ tools/);
  });

  it("envelope_ok on nominal VMC setup", () => {
    const r = eng.validate(nominal());
    expect(r.verdict).toBe("envelope_ok");
    expect(r.critical_count).toBe(0);
    expect(r.confidence.value).toBe(1);
  });

  it("envelope_block when G54 X origin negative (outside machine)", () => {
    const r = eng.validate(nominal({
      workpiece: { g54_x_mm: -50, g54_y_mm: 100, g54_z_mm: 200, extent_x_mm: 100, extent_y_mm: 100, extent_z_mm: 50 },
    }));
    expect(r.verdict).toBe("envelope_block");
    const v = r.violations.find(viol => viol.kind === "wcs_origin_outside");
    expect(v?.severity).toBe("critical");
    expect(v?.detail).toMatch(/-50mm outside/);
  });

  it("envelope_block when G54 X origin exceeds machine X travel", () => {
    const r = eng.validate(nominal({
      workpiece: { g54_x_mm: 900, g54_y_mm: 100, g54_z_mm: 200, extent_x_mm: 100, extent_y_mm: 100, extent_z_mm: 50 },
    }));
    expect(r.verdict).toBe("envelope_block");
    expect(r.violations.some(v => v.kind === "wcs_origin_outside")).toBe(true);
  });

  it("envelope_block when workpiece extent reaches outside machine X", () => {
    const r = eng.validate(nominal({
      workpiece: { g54_x_mm: 700, g54_y_mm: 100, g54_z_mm: 200, extent_x_mm: 200, extent_y_mm: 100, extent_z_mm: 50 },
    }));
    expect(r.verdict).toBe("envelope_block");
    expect(r.violations.some(v => v.kind === "workpiece_outside_x")).toBe(true);
  });

  it("envelope_block when workpiece extent reaches outside machine Y", () => {
    const r = eng.validate(nominal({
      workpiece: { g54_x_mm: 100, g54_y_mm: 400, g54_z_mm: 200, extent_x_mm: 100, extent_y_mm: 200, extent_z_mm: 50 },
    }));
    expect(r.verdict).toBe("envelope_block");
    expect(r.violations.some(v => v.kind === "workpiece_outside_y")).toBe(true);
  });

  it("envelope_block when tool would crash into table (negative Z reach)", () => {
    const r = eng.validate(nominal({
      workpiece: { g54_x_mm: 100, g54_y_mm: 100, g54_z_mm: 30, extent_x_mm: 100, extent_y_mm: 100, extent_z_mm: 50 },
    }));
    expect(r.verdict).toBe("envelope_block");
    expect(r.violations.some(v => v.kind === "tool_outside_z")).toBe(true);
  });

  it("envelope_block when tool change Z exceeds Z travel", () => {
    const r = eng.validate(nominal({
      machine: { x_travel_mm: 800, y_travel_mm: 500, z_travel_mm: 250, spindle_nose_clearance_mm: 100 },
      workpiece: { g54_x_mm: 100, g54_y_mm: 100, g54_z_mm: 200, extent_x_mm: 100, extent_y_mm: 100, extent_z_mm: 50 },
    }));
    expect(r.verdict).toBe("envelope_block");
    expect(r.violations.some(v => v.kind === "tool_outside_z")).toBe(true);
  });

  it("warns (not blocks) when tool stickout < workpiece depth", () => {
    const r = eng.validate(nominal({
      workpiece: { g54_x_mm: 100, g54_y_mm: 100, g54_z_mm: 200, extent_x_mm: 100, extent_y_mm: 100, extent_z_mm: 150 },
      tools: [{ tool_id: "T01", stickout_mm: 75, diameter_mm: 10 }],
    }));
    const v = r.violations.find(viol => viol.kind === "stickout_insufficient");
    expect(v?.severity).toBe("warning");
    expect(v?.detail).toMatch(/T01.*stickout 75/);
    expect(v?.fix).toMatch(/longer-stickout|shorter tool/);
  });

  it("handles multiple tools (per-tool checks scale)", () => {
    const r = eng.validate(nominal({
      tools: [
        { tool_id: "T01", stickout_mm: 75, diameter_mm: 10 },
        { tool_id: "T02", stickout_mm: 100, diameter_mm: 6 },
        { tool_id: "T03", stickout_mm: 50, diameter_mm: 20 },
      ],
    }));
    expect(r.verdict).toBe("envelope_ok");
    expect(r.total_tools).toBe(3);
  });

  it("each violation cites a fix + detail", () => {
    const r = eng.validate(nominal({
      workpiece: { g54_x_mm: -50, g54_y_mm: -50, g54_z_mm: 30, extent_x_mm: 100, extent_y_mm: 100, extent_z_mm: 50 },
    }));
    expect(r.violations.length).toBeGreaterThan(0);
    for (const v of r.violations) {
      expect(v.fix.length).toBeGreaterThan(10);
      expect(v.detail.length).toBeGreaterThan(10);
    }
  });

  it("source cites ISO 230-1", () => {
    const r = eng.validate(nominal());
    expect(r.source).toMatch(/ISO 230-1/);
  });

  it("confidence drops as violation count grows (broken << ok)", () => {
    const ok = eng.validate(nominal());
    const broken = eng.validate(nominal({
      workpiece: { g54_x_mm: -100, g54_y_mm: -100, g54_z_mm: 30, extent_x_mm: 1000, extent_y_mm: 1000, extent_z_mm: 100 },
    }));
    expect(broken.confidence.value).toBeLessThan(ok.confidence.value);
    expect(ok.confidence.value).toBe(1);
    expect(broken.confidence.value).toBeLessThan(0.5);
  });
});
