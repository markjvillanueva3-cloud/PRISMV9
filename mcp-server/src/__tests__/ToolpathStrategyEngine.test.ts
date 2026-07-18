/**
 * ToolpathStrategyEngine tests — restoration coverage (U-STUB-HUNT-08).
 * Slot:bravo 2026-05-27.
 */
import { describe, it, expect } from "vitest";
import { ToolpathStrategyEngine, toolpathStrategyEngine } from "../engines/ToolpathStrategyEngine.js";
import type { ToolGeometry } from "../engines/MillingForceEngine.js";

const TOOL: ToolGeometry = { diameter_mm: 10, flutes: 4, substrate: "carbide" };

describe("ToolpathStrategyEngine.generate", () => {
  it("rough → 50% stepover, 50% axial", () => {
    const r = toolpathStrategyEngine.generate({ tool: TOOL, operation: "rough" });
    expect(r.operation).toBe("rough");
    expect(r.parameters.stepover_pct).toBe(0.5);
    expect(r.parameters.stepover_mm).toBe(5);
    expect(r.parameters.doc_mm).toBe(5);
    expect(r.parameters.direction).toBe("climb");
  });

  it("finish → 5% stepover, 20% axial", () => {
    const r = toolpathStrategyEngine.generate({ tool: TOOL, operation: "finish" });
    expect(r.parameters.stepover_pct).toBe(0.05);
    expect(r.parameters.stepover_mm).toBeCloseTo(0.5, 4);
    expect(r.parameters.doc_mm).toBeCloseTo(2, 4);
  });

  it("defaults to rough when no operation", () => {
    const r = toolpathStrategyEngine.generate({ tool: TOOL });
    expect(r.operation).toBe("rough");
  });

  it("routes hsm/trochoidal/rest through specialized generators", () => {
    expect(toolpathStrategyEngine.generate({ tool: TOOL, operation: "hsm" }).strategy).toBe("hsm");
    expect(toolpathStrategyEngine.generate({ tool: TOOL, operation: "trochoidal" }).strategy).toBe("trochoidal");
    expect(toolpathStrategyEngine.generate({ tool: TOOL, operation: "rest" }).strategy).toBe("rest");
  });

  it("throws on missing tool + unknown operation", () => {
    expect(() => toolpathStrategyEngine.generate({} as never)).toThrow(/tool/);
    expect(() => toolpathStrategyEngine.generate({ tool: TOOL, operation: "fake" as never })).toThrow(/unknown/);
  });
});

describe("ToolpathStrategyEngine.generateRest", () => {
  it("emits narrow stepover (25%)", () => {
    const r = toolpathStrategyEngine.generateRest({ tool: TOOL });
    expect(r.parameters.stepover_pct).toBe(0.25);
    expect(r.parameters.stepover_mm).toBe(2.5);
    expect(r.rationale).toMatch(/residual material/);
  });
});

describe("ToolpathStrategyEngine.generateHSM", () => {
  it("emits low-radial / high-axial / ramp-helix lead-in", () => {
    const r = toolpathStrategyEngine.generateHSM({ tool: TOOL });
    expect(r.parameters.stepover_pct).toBe(0.10);
    expect(r.parameters.doc_mm).toBe(15);   // 1.5 × d
    expect(r.parameters.lead_in).toBe("ramp-helix");
    expect(r.parameters.direction).toBe("climb");
  });
});

describe("ToolpathStrategyEngine.generateTrochoidal", () => {
  it("emits 10% stepover, slot feature, tangent-arc lead-in", () => {
    const r = toolpathStrategyEngine.generateTrochoidal({ tool: TOOL });
    expect(r.feature).toBe("slot");
    expect(r.parameters.stepover_pct).toBe(0.10);
    expect(r.parameters.doc_mm).toBe(10);   // full-d axial
    expect(r.parameters.lead_in).toBe("tangent-arc");
  });

  it("rationale cites engagement-angle benefit", () => {
    const r = toolpathStrategyEngine.generateTrochoidal({ tool: TOOL });
    expect(r.rationale).toMatch(/engagement angle/i);
  });
});

describe("class identity", () => {
  it("fresh instance matches singleton output", () => {
    const eng = new ToolpathStrategyEngine();
    const a = eng.generate({ tool: TOOL, operation: "finish" });
    const b = toolpathStrategyEngine.generate({ tool: TOOL, operation: "finish" });
    expect(a).toEqual(b);
  });
});
