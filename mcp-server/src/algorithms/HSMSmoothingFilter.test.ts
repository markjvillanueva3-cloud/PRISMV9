import { describe, it, expect } from "vitest";
import { generate, HSMSmoothingFilter, type HSMFilterInput } from "./HSMSmoothingFilter.js";

describe("HSMSmoothingFilter", () => {
  it("Fanuc finish: G05.1 Q1 + tolerance R0.010", () => {
    const r = generate({ controller: "fanuc", mode: "finish" });
    expect(r.enable_block).toBe("G05.1 Q1 R0.010");
    expect(r.disable_block).toBe("G05.1 Q0");
    expect(r.tolerance_used_mm).toBe(0.01);
  });
  it("Haas finish P=1, rough P=3", () => {
    expect(generate({ controller: "haas", mode: "finish" }).enable_block).toBe("G187 P1 E0.010");
    expect(generate({ controller: "haas", mode: "rough" }).enable_block).toBe("G187 P3 E0.100");
  });
  it("Heidenhain: M128 + TA tol + named note", () => {
    const r = generate({ controller: "heidenhain", mode: "semi" });
    expect(r.enable_block).toBe("M128 F1000 TA0.050");
    expect(r.disable_block).toBe("M129");
    expect(r.notes.join("|")).toContain("TCPM");
  });
  it("Siemens finish=SOFT, rough=COMPCAD", () => {
    expect(generate({ controller: "siemens", mode: "finish" }).enable_block).toBe("SOFT");
    expect(generate({ controller: "siemens", mode: "rough" }).enable_block).toBe("COMPCAD");
  });
  it("Okuma NURBS: G91.1 R<tol>", () => {
    const r = generate({ controller: "okuma", mode: "finish" });
    expect(r.enable_block).toBe("G91.1 R0.010");
  });
  it("Mazak HMS finish P=1", () => {
    expect(generate({ controller: "mazak", mode: "finish" }).enable_block).toBe("G61.1 P1");
  });
  it("mode=off emits disable-only", () => {
    const r = generate({ controller: "fanuc", mode: "off" });
    expect(r.enable_block).toBe("G05.1 Q0");
    expect(r.tolerance_used_mm).toBe(0);
  });
  it("custom tolerance override respected", () => {
    expect(generate({ controller: "fanuc", mode: "finish", path_tolerance_mm: 0.005 }).enable_block).toBe("G05.1 Q1 R0.005");
  });
  it("unknown controller diagnostic", () => {
    const r = generate({ controller: "zz" as HSMFilterInput["controller"], mode: "finish" });
    expect(r.notes.join("|")).toContain("unknown controller");
  });
  it("unknown mode diagnostic", () => {
    const r = generate({ controller: "fanuc", mode: "burst" as HSMFilterInput["mode"] });
    expect(r.notes.join("|")).toContain("unknown mode");
  });
  it("tolerance out of range diagnostic", () => {
    expect(generate({ controller: "fanuc", mode: "finish", path_tolerance_mm: 5 }).notes.join("|")).toContain("outside");
    expect(generate({ controller: "fanuc", mode: "finish", path_tolerance_mm: -0.01 }).notes.join("|")).toContain("outside");
  });
  it("NaN tolerance diagnostic", () => {
    expect(generate({ controller: "fanuc", mode: "finish", path_tolerance_mm: NaN }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(generate(null as unknown as HSMFilterInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(HSMSmoothingFilter.version).toBe("1.0.0");
  });
});
