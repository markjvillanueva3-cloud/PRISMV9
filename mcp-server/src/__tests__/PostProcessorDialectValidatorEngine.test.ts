import { describe, it, expect } from "vitest";
import {
  postProcessorDialectValidatorEngine as v,
  PostProcessorDialectValidatorEngine,
  type PostDialectValidatorInput,
} from "../engines/PostProcessorDialectValidatorEngine.js";

describe("PostProcessorDialectValidatorEngine", () => {
  it("exports a singleton with validate() method", () => {
    expect(v).toBeInstanceOf(PostProcessorDialectValidatorEngine);
    expect(typeof v.validate).toBe("function");
  });

  it("throws on missing gcode or controller", () => {
    expect(() => v.validate({} as PostDialectValidatorInput)).toThrow(/gcode \+ controller/);
  });

  it("throws on unknown controller", () => {
    expect(() => v.validate({ gcode: "G0 X0", controller: "weird-vendor" as never })).toThrow(/unknown controller/);
  });

  it("audit_pass on clean Fanuc G-code", () => {
    const gcode = "%\nO1234\nG90 G54 G17\nG0 X0 Y0 Z10\nM3 S2000\nG1 Z-5 F100\nM30\n%";
    const r = v.validate({ gcode, controller: "fanuc" });
    expect(r.verdict).toBe("audit_pass");
    expect(r.critical_count).toBe(0);
    expect(r.confidence.value).toBeGreaterThan(0.95);
  });

  it("audit_block when Okuma VNC variables appear in Fanuc post", () => {
    const gcode = "G0 X0 Y0\nVNC100 = 5.0\nG1 X10";
    const r = v.validate({ gcode, controller: "fanuc" });
    expect(r.verdict).toBe("audit_block");
    expect(r.critical_count).toBeGreaterThanOrEqual(1);
    expect(r.violations[0].reason).toMatch(/Foreign macro|fanuc/i);
  });

  it("audit_block when Fanuc G65 macro appears in Okuma post", () => {
    const gcode = "G0 X0 Y0\nG65 P9810 X10. Y10. Z-5.\nG1 X20";
    const r = v.validate({ gcode, controller: "okuma_osp" });
    expect(r.verdict).toBe("audit_block");
    expect(r.critical_count).toBeGreaterThanOrEqual(1);
  });

  it("audit_block when Fanuc # variables in Okuma post", () => {
    const gcode = "G0 X0 Y0\n#100 = 5.0\nG1 X10";
    const r = v.validate({ gcode, controller: "okuma_osp" });
    expect(r.verdict).toBe("audit_block");
    expect(r.violations.some(viol => viol.reason.match(/Foreign macro/i))).toBe(true);
  });

  it("audit_block on Heidenhain CYCL DEF in Haas post", () => {
    const gcode = "G0 X0\nCYCL DEF 200 DRILLING\nG1 X10";
    const r = v.validate({ gcode, controller: "haas" });
    expect(r.verdict).toBe("audit_block");
    expect(r.critical_count).toBeGreaterThanOrEqual(1);
  });

  it("audit_block on M19 spindle-orient when has_spindle_orient=false", () => {
    const gcode = "G0 X0 Y0\nM19\nG1 X10";
    const r = v.validate({ gcode, controller: "fanuc", machine_config: { has_spindle_orient: false } });
    expect(r.verdict).toBe("audit_block");
    expect(r.violations.some(viol => viol.reason.match(/M19|orient/))).toBe(true);
  });

  it("audit_pass on M19 when has_spindle_orient=true", () => {
    const gcode = "G0 X0 Y0\nM19\nG1 X10";
    const r = v.validate({ gcode, controller: "fanuc", machine_config: { has_spindle_orient: true } });
    expect(r.verdict).toBe("audit_pass");
  });

  it("audit_block on M29 rigid-tap when machine lacks rigid-tap", () => {
    const gcode = "G0 X0 Y0\nM29 S500\nG84 Z-10 F1.0";
    const r = v.validate({ gcode, controller: "fanuc", machine_config: { has_rigid_tap: false } });
    expect(r.verdict).toBe("audit_block");
    expect(r.violations.some(viol => viol.reason.match(/M29|rigid tap/i))).toBe(true);
  });

  it("audit_block on B-axis motion when machine is 3-axis", () => {
    const gcode = "G0 X0 Y0\nB45.0\nG1 X10";
    const r = v.validate({ gcode, controller: "fanuc", machine_config: { axes: 3 } });
    expect(r.verdict).toBe("audit_block");
    expect(r.violations.some(viol => viol.reason.match(/B-axis/i))).toBe(true);
  });

  it("audit_pass on B-axis motion when machine is 5-axis", () => {
    const gcode = "G0 X0 Y0\nB45.0\nG1 X10";
    const r = v.validate({ gcode, controller: "fanuc", machine_config: { axes: 5 } });
    expect(r.verdict).toBe("audit_pass");
  });

  it("cites the controller's source manual", () => {
    const r = v.validate({ gcode: "G0 X0", controller: "fanuc" });
    expect(r.source).toMatch(/Fanuc 30i|G\/M Codes/);
    const r2 = v.validate({ gcode: "G0 X0", controller: "okuma_osp" });
    expect(r2.source).toMatch(/Okuma OSP/);
    const r3 = v.validate({ gcode: "G0 X0", controller: "mazak_mazatrol" });
    expect(r3.source).toMatch(/Mazak/);
    const r4 = v.validate({ gcode: "G0 X0", controller: "heidenhain_tnc" });
    expect(r4.source).toMatch(/Heidenhain TNC/);
    const r5 = v.validate({ gcode: "G0 X0", controller: "siemens_840d" });
    expect(r5.source).toMatch(/Siemens SINUMERIK/);
  });

  it("multiple violations counted + verdict stays audit_block on first critical", () => {
    const gcode = "G0 X0 Y0\nVNC100 = 5.0\nVNC101 = 10.0\nDEF REAL test\nG1 X10";
    const r = v.validate({ gcode, controller: "fanuc" });
    expect(r.verdict).toBe("audit_block");
    expect(r.critical_count).toBeGreaterThanOrEqual(3);
  });

  it("violation line numbers are 1-based + match the offending block", () => {
    const gcode = "G0 X0 Y0\n%LINE2\nVNC100 = 5.0\n%LINE4";
    const r = v.validate({ gcode, controller: "fanuc" });
    expect(r.violations[0].line).toBe(3);
    expect(r.violations[0].text).toMatch(/VNC100/);
  });

  it("empty gcode passes (no violations to find)", () => {
    const r = v.validate({ gcode: "", controller: "fanuc" });
    expect(r.verdict).toBe("audit_pass");
    expect(r.critical_count).toBe(0);
    expect(r.confidence.value).toBe(1);
  });
});
