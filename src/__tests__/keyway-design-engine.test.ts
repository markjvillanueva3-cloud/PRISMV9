/**
 * KeywayDesignEngine — Unit Tests
 * @milestone FORGE-ENGINES-B47
 */
import { describe, it, expect } from "vitest";
import { keywayDesignEngine } from "../engines/KeywayDesignEngine.js";

describe("KeywayDesignEngine", () => {
  it("shear stress > 0", () => {
    const r = keywayDesignEngine.calculate({});
    expect(r.shear_stress.value).toBeGreaterThan(0);
  });

  it("crushing stress > 0", () => {
    const r = keywayDesignEngine.calculate({});
    expect(r.crushing_stress.value).toBeGreaterThan(0);
  });

  it("higher torque increases stress", () => {
    const lo = keywayDesignEngine.calculate({ torque_nm: 100 });
    const hi = keywayDesignEngine.calculate({ torque_nm: 1000 });
    expect(hi.shear_stress.value).toBeGreaterThan(
      lo.shear_stress.value
    );
  });

  it("longer key reduces stress", () => {
    const short = keywayDesignEngine.calculate({ key_length_mm: 20 });
    const long = keywayDesignEngine.calculate({ key_length_mm: 80 });
    expect(long.crushing_stress.value).toBeLessThan(
      short.crushing_stress.value
    );
  });

  it("min key length > 0", () => {
    const r = keywayDesignEngine.calculate({});
    expect(r.min_key_length.value).toBeGreaterThan(0);
  });

  it("tangential force = 2T/d", () => {
    const r = keywayDesignEngine.calculate({
      shaft_diameter_mm: 40, torque_nm: 200,
    });
    // Ft = 2×200000/40 = 10000 N
    expect(r.tangential_force.value).toBe(10000);
  });

  it("power transmitted > 0", () => {
    const r = keywayDesignEngine.calculate({});
    expect(r.power_transmitted.value).toBeGreaterThan(0);
  });

  it("woodruff has lower Kt than parallel", () => {
    const par = keywayDesignEngine.calculate({ key_type: "parallel" });
    const wdr = keywayDesignEngine.calculate({ key_type: "woodruff" });
    expect(wdr.keyway_stress_concentration.value).toBeLessThan(
      par.keyway_stress_concentration.value
    );
  });

  it("heavy shock reduces safety factor", () => {
    const steady = keywayDesignEngine.calculate({ load_type: "steady" });
    const shock = keywayDesignEngine.calculate({ load_type: "heavy_shock" });
    expect(shock.shear_safety.value).toBeLessThan(
      steady.shear_safety.value
    );
  });

  it("warns short key", () => {
    const r = keywayDesignEngine.calculate({
      torque_nm: 500, key_length_mm: 10,
    });
    expect(r.warnings.some(w =>
      w.includes("length") || w.includes("SF")
    )).toBe(true);
  });
});
