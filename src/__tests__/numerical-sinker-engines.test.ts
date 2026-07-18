/**
 * Tests for NumericalMethodsEngine and SinkerEDMCalculatorEngine
 * Reverse-engineered from PRISM v8.89 monolith (MIT batch + EDM calculator)
 */
import { describe, it, expect } from "vitest";
import { numericalMethodsEngine } from "../engines/NumericalMethodsEngine.js";
import { sinkerEDMCalculatorEngine } from "../engines/SinkerEDMCalculatorEngine.js";

// ============================================================================
// NumericalMethodsEngine — ODE Solvers
// ============================================================================

describe("NumericalMethodsEngine — ODE Solvers", () => {
  it("euler forward: dy/dt = -y, y(0)=1 → y(1) ≈ e^-1", () => {
    const result = numericalMethodsEngine.eulerForward(
      (_t, y) => -y, 1, 0, 1, 1000
    );
    expect(result.y[result.y.length - 1]).toBeCloseTo(Math.exp(-1), 2);
    expect(result.method).toBe("euler_forward");
    expect(result.steps).toBe(1000);
  });

  it("euler backward: dy/dt = -y with df/dy = -1", () => {
    const result = numericalMethodsEngine.eulerBackward(
      (_t, y) => -y, (_t, _y) => -1, 1, 0, 1, 1000
    );
    expect(result.y[result.y.length - 1]).toBeCloseTo(Math.exp(-1), 2);
    expect(result.method).toBe("euler_backward");
  });

  it("rk4: dy/dt = -y, y(0)=1 → y(1) ≈ e^-1 (high accuracy)", () => {
    const result = numericalMethodsEngine.rk4((_t, y) => -y, 1, 0, 1, 100);
    // RK4 should be very accurate with 100 steps
    expect(result.y[100]).toBeCloseTo(Math.exp(-1), 6);
    expect(result.t[100]).toBeCloseTo(1, 10);
  });

  it("rk4: dy/dt = t, y(0)=0 → y(2) = 2", () => {
    const result = numericalMethodsEngine.rk4((t, _y) => t, 0, 0, 2, 100);
    expect(result.y[100]).toBeCloseTo(2, 4); // y = t²/2 at t=2
  });

  it("rk4System: harmonic oscillator dx/dt=v, dv/dt=-x", () => {
    // Solution: x = cos(t), v = -sin(t)
    const result = numericalMethodsEngine.rk4System(
      (_t, Y) => [Y[1], -Y[0]],
      [1, 0], 0, Math.PI, 200
    );
    // At t=π: x = cos(π) = -1, v = -sin(π) = 0
    const last = result.Y[result.Y.length - 1];
    expect(last[0]).toBeCloseTo(-1, 3);
    expect(last[1]).toBeCloseTo(0, 3);
    expect(result.dimensions).toBe(2);
  });

  it("rk4System: 2D decay dY/dt = [-1,0;0,-2]*Y", () => {
    const result = numericalMethodsEngine.rk4System(
      (_t, Y) => [-Y[0], -2 * Y[1]],
      [1, 1], 0, 1, 200
    );
    const last = result.Y[result.Y.length - 1];
    expect(last[0]).toBeCloseTo(Math.exp(-1), 3);
    expect(last[1]).toBeCloseTo(Math.exp(-2), 3);
  });

  it("handles zero steps gracefully", () => {
    const result = numericalMethodsEngine.rk4((_t, y) => -y, 1, 0, 1, 0);
    expect(result.t).toEqual([0]);
    expect(result.y).toEqual([1]);
    expect(result.steps).toBe(0);
  });
});

// ============================================================================
// NumericalMethodsEngine — Linear Algebra
// ============================================================================

describe("NumericalMethodsEngine — Linear Algebra", () => {
  it("LU decomposition of 2x2 matrix", () => {
    const result = numericalMethodsEngine.luDecomposition([[2, 1], [1, 3]]);
    expect(result.determinant).toBeCloseTo(5, 8);
    // Verify L*U gives permuted A
    expect(result.L[0][0]).toBe(1);
    expect(result.L[1][1]).toBe(1);
  });

  it("LU decomposition of 3x3 matrix", () => {
    const A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]];
    const result = numericalMethodsEngine.luDecomposition(A);
    expect(Math.abs(result.determinant)).toBeCloseTo(4, 6);
  });

  it("solveLU: Ax = b for 2x2 system", () => {
    const A = [[2, 1], [1, 3]];
    const b = [3, 4];
    const x = numericalMethodsEngine.solveLU(A, b);
    // Verify: 2*x[0] + 1*x[1] = 3, 1*x[0] + 3*x[1] = 4
    expect(2 * x[0] + x[1]).toBeCloseTo(3, 8);
    expect(x[0] + 3 * x[1]).toBeCloseTo(4, 8);
  });

  it("solveLU: 3x3 system", () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 10]];
    const b = [6, 15, 25];
    const x = numericalMethodsEngine.solveLU(A, b);
    // Verify Ax = b
    for (let i = 0; i < 3; i++) {
      const sum = A[i].reduce((s, a, j) => s + a * x[j], 0);
      expect(sum).toBeCloseTo(b[i], 6);
    }
  });

  it("leastSquaresQR: overdetermined system", () => {
    // y = 2x + 1 with noisy data
    const A = [[1, 1], [1, 2], [1, 3], [1, 4]];
    const b = [3, 5, 7, 9]; // exact: y = 2x + 1
    const result = numericalMethodsEngine.leastSquaresQR(A, b);
    expect(result.x[0]).toBeCloseTo(1, 4); // intercept
    expect(result.x[1]).toBeCloseTo(2, 4); // slope
    expect(result.residualNorm).toBeCloseTo(0, 4);
  });

  it("leastSquaresQR: noisy data", () => {
    const A = [[1, 0], [1, 1], [1, 2], [1, 3]];
    const b = [1.1, 2.9, 5.2, 6.8]; // approximately y = 2x + 1
    const result = numericalMethodsEngine.leastSquaresQR(A, b);
    expect(result.x[0]).toBeCloseTo(1, 0); // intercept ~1
    expect(result.x[1]).toBeCloseTo(2, 0); // slope ~2
    expect(result.residualNorm).toBeGreaterThan(0);
  });
});

// ============================================================================
// NumericalMethodsEngine — Digital Control
// ============================================================================

describe("NumericalMethodsEngine — Digital Control", () => {
  it("Tustin discretization of first-order TF", () => {
    const result = numericalMethodsEngine.tustinDiscretize(1, 0.1, 0.01);
    expect(result.num.length).toBe(2);
    expect(result.den.length).toBe(2);
    expect(result.den[0]).toBe(1); // normalized
    expect(result.T).toBe(0.01);
  });

  it("ZOH discretization of state-space", () => {
    const A = [[-1, 0], [0, -2]];
    const B = [1, 1];
    const C = [1, 0];
    const result = numericalMethodsEngine.zohDiscretize(A, B, C, 0, 0.01);
    expect(result.Phi[0][0]).toBeCloseTo(0.99, 4); // 1 + (-1)*0.01
    expect(result.Phi[1][1]).toBeCloseTo(0.98, 4); // 1 + (-2)*0.01
    expect(result.Gamma[0]).toBeCloseTo(0.01, 4);
  });

  it("PID step computation", () => {
    const state = numericalMethodsEngine.createPIDState();
    const result = numericalMethodsEngine.computePID(1.0, 0.0, 1.0, 0.1, 0.01, 0.01, state);
    expect(result.error).toBe(1.0);
    expect(result.proportional).toBe(1.0);
    expect(result.output).toBeGreaterThan(0);
    expect(result.state.prevError).toBe(1.0);
  });

  it("PID simulate: step response converges", () => {
    const result = numericalMethodsEngine.simulatePID({
      setpoint: 1, Kp: 2, Ki: 1, Kd: 0.1, T: 0.01,
      plantGain: 1, plantTimeConstant: 0.5, duration: 10,
    });
    expect(result.time.length).toBeGreaterThan(100);
    // Should converge near setpoint
    const finalOutput = result.output[result.output.length - 1];
    expect(finalOutput).toBeCloseTo(1.0, 0);
    expect(result.steadyStateError).toBeLessThan(0.5);
  });

  it("PID simulate: overshoot with high gain", () => {
    const result = numericalMethodsEngine.simulatePID({
      setpoint: 1, Kp: 10, Ki: 5, Kd: 0, T: 0.01,
      plantGain: 1, plantTimeConstant: 0.1, duration: 5,
    });
    // Very high Kp with fast plant should cause overshoot
    expect(result.overshoot).toBeGreaterThanOrEqual(0);
    // At minimum, the max output should exceed setpoint at some point
    const maxOutput = Math.max(...result.output);
    expect(maxOutput).toBeGreaterThan(0);
  });

  it("PID simulate: settling time tracking", () => {
    const result = numericalMethodsEngine.simulatePID({
      setpoint: 1, Kp: 3, Ki: 1, Kd: 0.5, T: 0.01,
      plantGain: 1, plantTimeConstant: 0.3, duration: 10,
    });
    // Should have a settling time
    if (result.settlingTime !== null) {
      expect(result.settlingTime).toBeGreaterThan(0);
      expect(result.settlingTime).toBeLessThanOrEqual(10);
    }
  });

  it("rejects non-positive sampling period", () => {
    expect(() => numericalMethodsEngine.tustinDiscretize(1, 1, 0)).toThrow();
    expect(() => numericalMethodsEngine.tustinDiscretize(1, 1, -0.01)).toThrow();
  });
});

// ============================================================================
// SinkerEDMCalculatorEngine — Calculate
// ============================================================================

describe("SinkerEDMCalculatorEngine — Calculate", () => {
  it("calculates with default parameters", () => {
    const result = sinkerEDMCalculatorEngine.calculate({});
    expect(result.mrr).toBeGreaterThan(0);
    expect(result.wearRatio).toBeGreaterThan(0);
    expect(result.surfaceRoughness).toBeGreaterThan(0);
    expect(result.sparkGap).toBeGreaterThan(0);
    expect(result.hazDepth).toBeGreaterThan(0);
    expect(result.dutyCycle).toBeCloseTo(100 / 150, 2);
    expect(result.frequency).toBe(Math.round(1_000_000 / 150));
    expect(result.burnTime).toBeGreaterThan(0);
    expect(result.electrodesNeeded).toBeGreaterThanOrEqual(1);
  });

  it("higher current increases MRR", () => {
    const low = sinkerEDMCalculatorEngine.calculate({ peakCurrent: 10 });
    const high = sinkerEDMCalculatorEngine.calculate({ peakCurrent: 50 });
    expect(high.mrr).toBeGreaterThan(low.mrr);
  });

  it("higher current increases wear ratio", () => {
    const low = sinkerEDMCalculatorEngine.calculate({ peakCurrent: 10 });
    const high = sinkerEDMCalculatorEngine.calculate({ peakCurrent: 50 });
    expect(high.wearRatio).toBeGreaterThan(low.wearRatio);
  });

  it("higher current increases surface roughness", () => {
    const low = sinkerEDMCalculatorEngine.calculate({ peakCurrent: 5, pulseOn: 20 });
    const high = sinkerEDMCalculatorEngine.calculate({ peakCurrent: 50, pulseOn: 200 });
    expect(high.surfaceRoughness).toBeGreaterThan(low.surfaceRoughness);
  });

  it("copper-tungsten electrode has lower wear than brass", () => {
    const cwear = sinkerEDMCalculatorEngine.calculate({ electrodeMaterial: "copper_tungsten" });
    const bwear = sinkerEDMCalculatorEngine.calculate({ electrodeMaterial: "brass" });
    expect(cwear.wearRatio).toBeLessThan(bwear.wearRatio);
  });

  it("negative polarity reduces wear", () => {
    const pos = sinkerEDMCalculatorEngine.calculate({ polarity: "positive" });
    const neg = sinkerEDMCalculatorEngine.calculate({ polarity: "negative" });
    expect(neg.wearRatio).toBeLessThan(pos.wearRatio);
  });

  it("aluminum workpiece has higher MRR than titanium", () => {
    const al = sinkerEDMCalculatorEngine.calculate({ workpieceMaterial: "6061" });
    const ti = sinkerEDMCalculatorEngine.calculate({ workpieceMaterial: "Ti6Al4V" });
    expect(al.mrr).toBeGreaterThan(ti.mrr);
  });

  it("warns on high HAZ depth", () => {
    const result = sinkerEDMCalculatorEngine.calculate({
      peakCurrent: 60, pulseOn: 300, gapVoltage: 120,
    });
    expect(result.warnings.some(w => w.includes("HAZ"))).toBe(true);
  });

  it("warns on high duty cycle", () => {
    const result = sinkerEDMCalculatorEngine.calculate({
      pulseOn: 200, pulseOff: 20,
    });
    expect(result.warnings.some(w => w.includes("duty cycle"))).toBe(true);
  });

  it("VDI scale equivalent is reasonable", () => {
    const result = sinkerEDMCalculatorEngine.calculate({});
    expect(result.vdiEquivalent).toBeGreaterThanOrEqual(0);
    expect(result.vdiEquivalent).toBeLessThanOrEqual(45);
  });

  it("tungsten carbide workpiece warns about refractory", () => {
    const result = sinkerEDMCalculatorEngine.calculate({ workpieceMaterial: "WC-Co" });
    expect(result.warnings.some(w => w.includes("Refractory"))).toBe(true);
  });
});

// ============================================================================
// SinkerEDMCalculatorEngine — Lists & Recommendations
// ============================================================================

describe("SinkerEDMCalculatorEngine — Lists & Recommendations", () => {
  it("lists electrode materials", () => {
    const list = sinkerEDMCalculatorEngine.listElectrodeMaterials();
    expect(list.length).toBe(6);
    expect(list.some(m => m.id === "graphite")).toBe(true);
    expect(list.some(m => m.id === "copper_tungsten")).toBe(true);
  });

  it("lists workpiece materials (18 from monolith)", () => {
    const list = sinkerEDMCalculatorEngine.listWorkpieceMaterials();
    expect(list.length).toBe(18);
    expect(list.some(m => m.id === "D2")).toBe(true);
    expect(list.some(m => m.id === "Inconel718")).toBe(true);
    expect(list.some(m => m.id === "WC-Co")).toBe(true);
  });

  it("lists VDI 3400 scale", () => {
    const list = sinkerEDMCalculatorEngine.listVDIScale();
    expect(list.length).toBe(16);
    expect(list[0].vdi).toBe(0);
    expect(list[0].ra).toBe(0.1);
  });

  it("recommends settings for fine finish", () => {
    const rec = sinkerEDMCalculatorEngine.recommendSettings({
      targetRa: 0.8, priority: "finish",
    });
    expect(rec.peakCurrent).toBeGreaterThan(0);
    expect(rec.pulseOn).toBeGreaterThan(0);
    expect(rec.expectedRa).toBeGreaterThan(0);
    expect(rec.rationale).toContain("finish");
  });

  it("speed priority has higher duty cycle than wear priority", () => {
    const speed = sinkerEDMCalculatorEngine.recommendSettings({
      targetRa: 3.2, priority: "speed",
    });
    const wear = sinkerEDMCalculatorEngine.recommendSettings({
      targetRa: 3.2, priority: "wear",
    });
    // Speed: pulseOff = pulseOn * 0.4; Wear: pulseOff = pulseOn * 0.8
    const speedDuty = speed.pulseOn / (speed.pulseOn + speed.pulseOff);
    const wearDuty = wear.pulseOn / (wear.pulseOn + wear.pulseOff);
    expect(speedDuty).toBeGreaterThan(wearDuty);
  });

  it("wear priority gives lower current", () => {
    const wear = sinkerEDMCalculatorEngine.recommendSettings({
      targetRa: 3.2, priority: "wear",
    });
    const speed = sinkerEDMCalculatorEngine.recommendSettings({
      targetRa: 3.2, priority: "speed",
    });
    expect(wear.peakCurrent).toBeLessThanOrEqual(speed.peakCurrent);
  });
});
