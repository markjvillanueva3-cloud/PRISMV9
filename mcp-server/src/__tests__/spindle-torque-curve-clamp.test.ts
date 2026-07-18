/**
 * SpindleTorqueCurveEngine — torque clamp + P = T·ω consistency (SAFETY)
 *
 * Regression guard for the hardening-audit finding (wf_1ead4d4d-ee3): the
 * constant-power branch returned T = P/ω WITHOUT clamping to the motor's rated
 * T_max. When a spindle spec declares a base speed BELOW its true corner speed
 * (n_corner = 60000·P / (2π·T)), the hyperbola reports torque ABOVE what the
 * motor can deliver, so checkCutFeasibility would green-light a STALLING cut.
 * The field-weakening branch reported torque ∝ 1/n while power ∝ 1/n, which
 * violates P = T·ω (it implies constant power) — inconsistent by up to 2×.
 *
 * Hand-derived reference (Tlusty, "Manufacturing Processes and Equipment",
 * spindle drives; ISO 16090-1):
 *   Constant-power region:  T_avail(n) = min(T_max, P_max·60000/(2π·n))
 *                           P_avail(n) = min(P_max, T_max·2π·n/60000)   ⇒ P = T·ω
 *   Field-weakening region: P ∝ 1/n  ⇒  T ∝ 1/n²   (to keep P = T·ω)
 *
 * Spec {P=22 kW, T=120 Nm, n_base=800}:  n_corner = 60000·22/(2π·120) = 1751 rpm.
 * At n = 1000 rpm (800 < 1000 < 1751) the true region is still constant TORQUE:
 *   unclamped hyperbola   = 22·60000/(2π·1000) = 210.08 Nm   (BUG: > 120 Nm motor)
 *   correct clamped torque = 120 Nm
 *   correct power          = 120·2π·1000/60000  = 12.566 kW  (NOT the 22 kW rating)
 */
import { describe, it, expect } from "vitest";
import { spindleTorqueCurveEngine } from "../engines/SpindleTorqueCurveEngine.js";
import type { SpindleSpec } from "../engines/SpindleTorqueCurveEngine.js";

// ω(n) [rad/s] = 2π·n/60  →  P[kW] = T[Nm]·ω / 1000 = T·2π·n / 60000
const powerFromTorqueKw = (tau_Nm: number, rpm: number) => (tau_Nm * 2 * Math.PI * rpm) / 60000;

// Inconsistent spec: declared base speed (800) sits BELOW the true corner (1751 rpm).
const INCONSISTENT: SpindleSpec = {
  max_power_kW: 22, max_torque_Nm: 120, base_speed_rpm: 800, max_rpm: 8000, drive_type: "belt",
};

describe("SpindleTorqueCurveEngine — constant-power torque clamp (SAFETY)", () => {
  it("clamps torque to T_max below the true corner speed (120 Nm, NOT the 210 Nm hyperbola)", () => {
    const r = spindleTorqueCurveEngine.getAvailableTorqueAndPower({ rpm: 1000, spindle: INCONSISTENT });
    // Unclamped would be 22·60000/(2π·1000) = 210.08 Nm — impossible for a 120 Nm motor.
    expect(r.available_torque_Nm).toBeLessThanOrEqual(INCONSISTENT.max_torque_Nm);
    expect(r.available_torque_Nm).toBeCloseTo(120, 2);
    expect(r.available_torque_Nm).toBeLessThan(200); // regression: the pre-fix 210.08 Nm is gone
  });

  it("reports power consistent with the clamped torque (P = T·ω = 12.57 kW, NOT the 22 kW rating)", () => {
    const r = spindleTorqueCurveEngine.getAvailableTorqueAndPower({ rpm: 1000, spindle: INCONSISTENT });
    // With torque clamped to 120 Nm at 1000 rpm, deliverable power is 120·2π·1000/60000 = 12.566 kW.
    expect(r.available_power_kW).toBeCloseTo(12.566, 2);
    expect(r.available_power_kW).toBeLessThan(INCONSISTENT.max_power_kW);
    expect(r.available_power_kW).toBeCloseTo(powerFromTorqueKw(r.available_torque_Nm, 1000), 2);
  });

  it("checkCutFeasibility rejects a 180 Nm cut at 1000 rpm that the unclamped bug would have accepted", () => {
    // Pre-fix available torque = 210 Nm ⇒ 180 Nm cut "OK". Post-fix available = 120 Nm ⇒ correctly a STALL.
    const f = spindleTorqueCurveEngine.checkCutFeasibility({
      rpm: 1000, spindle: INCONSISTENT, cutting_torque_Nm: 180, cutting_power_kW: 5,
    });
    expect(f.torque_ok).toBe(false);
    expect(f.limiting_factor).toBe("torque");
    expect(f.warnings.some((w) => /STALL/i.test(w))).toBe(true);
  });

  it("above the true corner speed torque follows the constant-power hyperbola (P = T·ω, P = P_max)", () => {
    const r = spindleTorqueCurveEngine.getAvailableTorqueAndPower({ rpm: 5000, spindle: INCONSISTENT });
    // 5000 > 1751 ⇒ genuinely constant power: T = 22·60000/(2π·5000) = 42.02 Nm, P = 22 kW.
    expect(r.available_torque_Nm).toBeCloseTo(42.017, 1);
    expect(r.available_power_kW).toBeCloseTo(22, 1);
    expect(r.available_power_kW).toBeCloseTo(powerFromTorqueKw(r.available_torque_Nm, 5000), 1);
  });

  it("torque never exceeds T_max and power never exceeds P_max across the whole speed range", () => {
    for (const rpm of [200, 800, 1000, 1500, 1751, 3000, 6000, 8000]) {
      const r = spindleTorqueCurveEngine.getAvailableTorqueAndPower({ rpm, spindle: INCONSISTENT });
      expect(r.available_torque_Nm).toBeLessThanOrEqual(INCONSISTENT.max_torque_Nm + 1e-6);
      expect(r.available_power_kW).toBeLessThanOrEqual(INCONSISTENT.max_power_kW + 1e-6);
    }
  });
});

describe("SpindleTorqueCurveEngine — field-weakening P = T·ω consistency", () => {
  // Consistent spec: true corner (= declared base) = 1751 rpm; field weakening begins past max_rpm = 8000.
  const SPEC: SpindleSpec = {
    max_power_kW: 22, max_torque_Nm: 120, base_speed_rpm: 1750, max_rpm: 8000, drive_type: "belt",
  };

  it("keeps P = T·ω in the field-weakening region (the pre-fix 1/n torque violated it 2×)", () => {
    const r = spindleTorqueCurveEngine.getAvailableTorqueAndPower({ rpm: 16000, spindle: SPEC });
    expect(r.region).toBe("field_weakening");
    // P falls as 1/n: at 2× max_rpm, P = 22·(8000/16000) = 11 kW.
    expect(r.available_power_kW).toBeCloseTo(11, 1);
    // Consistency: P must equal T·ω. Pre-fix torque = P_max·60000/(2π·n) gave T·ω = 22 kW ≠ 11 kW.
    expect(r.available_power_kW).toBeCloseTo(powerFromTorqueKw(r.available_torque_Nm, 16000), 1);
  });

  it("torque rolls off as 1/n² in field weakening (quarter torque at double speed)", () => {
    const atMax = spindleTorqueCurveEngine.getAvailableTorqueAndPower({ rpm: 8000, spindle: SPEC });
    const at2x = spindleTorqueCurveEngine.getAvailableTorqueAndPower({ rpm: 16000, spindle: SPEC });
    // T ∝ 1/n²  ⇒  T(2n)/T(n) = 1/4.  (atMax is the constant-power torque at the max_rpm boundary.)
    expect(at2x.available_torque_Nm).toBeCloseTo(atMax.available_torque_Nm / 4, 1);
  });
});

describe("SpindleTorqueCurveEngine.calculate() — legacy clamp parity", () => {
  it("clamps legacy available torque to max_torque below the true corner speed", () => {
    const r = spindleTorqueCurveEngine.calculate({
      operating_rpm: 1000, max_power_kw: 22, max_torque_nm: 120, base_speed_rpm: 800, max_rpm: 8000,
    });
    expect(r.operating_region.unit).toBe("constant_power");
    // Pre-fix: 210 Nm. Post-fix: clamped to 120 Nm.
    expect(r.available_torque.value).toBeLessThanOrEqual(120);
    expect(r.available_torque.value).toBeCloseTo(120, 0);
    expect(r.available_torque.value).toBeLessThan(200);
    // Power consistent with the clamped torque (12.57 kW, not the 22 kW rating).
    expect(r.available_power.value).toBeCloseTo(12.57, 1);
  });
});
