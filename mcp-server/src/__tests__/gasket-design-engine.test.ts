/**
 * GasketDesignEngine — Unit Tests
 * @milestone FORGE-ENGINES-B45
 */
import { describe, it, expect } from "vitest";
import { gasketDesignEngine } from "../engines/GasketDesignEngine.js";

describe("GasketDesignEngine", () => {
  it("seating load > 0", () => {
    const r = gasketDesignEngine.calculate({});
    expect(r.seating_load.value).toBeGreaterThan(0);
  });

  it("operating load > 0", () => {
    const r = gasketDesignEngine.calculate({});
    expect(r.operating_load.value).toBeGreaterThan(0);
  });

  it("governing load ≥ max(seating, operating)", () => {
    const r = gasketDesignEngine.calculate({});
    expect(r.governing_load.value).toBeGreaterThanOrEqual(
      Math.max(r.seating_load.value, r.operating_load.value)
    );
  });

  it("higher pressure increases operating load", () => {
    const lo = gasketDesignEngine.calculate({ pressure_mpa: 1 });
    const hi = gasketDesignEngine.calculate({ pressure_mpa: 10 });
    expect(hi.operating_load.value).toBeGreaterThan(lo.operating_load.value);
  });

  it("ring joint has higher seating than sheet", () => {
    const sheet = gasketDesignEngine.calculate({ gasket_type: "sheet" });
    const ring = gasketDesignEngine.calculate({ gasket_type: "ring_joint" });
    expect(ring.seating_load.value).toBeGreaterThan(sheet.seating_load.value);
  });

  it("bolt torque > 0", () => {
    const r = gasketDesignEngine.calculate({});
    expect(r.bolt_torque.value).toBeGreaterThan(0);
  });

  it("more bolts reduces bolt stress", () => {
    const few = gasketDesignEngine.calculate({ num_bolts: 8 });
    const many = gasketDesignEngine.calculate({ num_bolts: 24 });
    expect(many.bolt_stress.value).toBeLessThan(few.bolt_stress.value);
  });

  it("safety factor > 0", () => {
    const r = gasketDesignEngine.calculate({});
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("warns when temp exceeds gasket limit", () => {
    const r = gasketDesignEngine.calculate({ gasket_type: "sheet", temperature_c: 300 });
    expect(r.warnings.some(w => w.includes("exceeds"))).toBe(true);
  });

  it("warns sheet gasket at high pressure", () => {
    const r = gasketDesignEngine.calculate({ gasket_type: "sheet", pressure_mpa: 5 });
    expect(r.warnings.some(w => w.includes("sheet") || w.includes("Sheet"))).toBe(true);
  });
});
