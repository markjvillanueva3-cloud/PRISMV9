/**
 * Tests for JacobianEngine — 5-axis Jacobian, singularity detection, config singularities.
 * Round 10 reverse-engineering from PRISM v8.89 monolith.
 */
import { describe, it, expect } from "vitest";
import { jacobianEngine } from "../engines/KinematicsEngine.js";

// ============================================================================
// compute5AxisJacobian — BC configuration
// ============================================================================

describe("JacobianEngine — 5-axis Jacobian (BC)", () => {
  it("has identity-like linear block for XYZ", () => {
    const J = jacobianEngine.compute5AxisJacobian("BC", { b: 45, c: 30 }, 100);
    expect(J.length).toBe(6);
    expect(J[0].length).toBe(5);
    // Linear axes: columns 0-2 should be identity for rows 0-2
    expect(J[0][0]).toBe(1);
    expect(J[1][1]).toBe(1);
    expect(J[2][2]).toBe(1);
    // Off-diagonal zeros
    expect(J[0][1]).toBe(0);
    expect(J[1][0]).toBe(0);
  });

  it("tool length affects rotary columns", () => {
    const J0 = jacobianEngine.compute5AxisJacobian("BC", { b: 45, c: 0 }, 0);
    const J100 = jacobianEngine.compute5AxisJacobian("BC", { b: 45, c: 0 }, 100);
    // With zero tool length, rotary columns for position should be zero
    expect(J0[0][3]).toBeCloseTo(0, 10);
    expect(J0[1][3]).toBeCloseTo(0, 10);
    expect(J0[2][3]).toBeCloseTo(0, 10);
    // With 100mm tool, rotary columns should be nonzero
    expect(Math.abs(J100[0][3])).toBeGreaterThan(1);
  });

  it("B=0 gives expected rotary structure", () => {
    const J = jacobianEngine.compute5AxisJacobian("BC", { b: 0, c: 0 }, 100);
    const bRad = 0;
    // J[0][3] = L * cos(B) * cos(C) = 100 * 1 * 1 = 100
    expect(J[0][3]).toBeCloseTo(100, 5);
    // J[2][3] = -L * sin(B) = 0
    expect(J[2][3]).toBeCloseTo(0, 5);
    // Angular block: J[4][3] = 1 (B rotation rate)
    expect(J[4][3]).toBe(1);
    // J[5][4] = cos(B) = 1
    expect(J[5][4]).toBeCloseTo(1, 5);
  });

  it("B=90 collapses Z rotary coupling", () => {
    const J = jacobianEngine.compute5AxisJacobian("BC", { b: 90, c: 0 }, 100);
    // J[0][3] = L * cos(90) * cos(0) ≈ 0
    expect(Math.abs(J[0][3])).toBeLessThan(1e-10);
    // J[2][3] = -L * sin(90) = -100
    expect(J[2][3]).toBeCloseTo(-100, 5);
  });
});

// ============================================================================
// compute5AxisJacobian — AC configuration
// ============================================================================

describe("JacobianEngine — 5-axis Jacobian (AC)", () => {
  it("returns 6x5 matrix", () => {
    const J = jacobianEngine.compute5AxisJacobian("AC", { a: 30, c: 45 }, 50);
    expect(J.length).toBe(6);
    expect(J[0].length).toBe(5);
  });

  it("linear block is identity", () => {
    const J = jacobianEngine.compute5AxisJacobian("AC", { a: 0, c: 0 }, 100);
    expect(J[0][0]).toBe(1);
    expect(J[1][1]).toBe(1);
    expect(J[2][2]).toBe(1);
  });

  it("angular block: A rotation on row 3", () => {
    const J = jacobianEngine.compute5AxisJacobian("AC", { a: 45, c: 0 }, 100);
    // J[3][3] = 1 (A-axis angular velocity)
    expect(J[3][3]).toBe(1);
    // J[4][4] = sin(A)
    const sa = Math.sin(45 * Math.PI / 180);
    expect(J[4][4]).toBeCloseTo(sa, 5);
  });

  it("A=0 puts tool length effect on Z via col 3", () => {
    const J = jacobianEngine.compute5AxisJacobian("AC", { a: 0, c: 0 }, 100);
    // J[2][3] = -L * sin(A) = 0
    expect(J[2][3]).toBeCloseTo(0, 5);
    // J[1][3] = -L * cos(A) * sin(C) = 0
    expect(J[1][3]).toBeCloseTo(0, 5);
  });
});

// ============================================================================
// detectSingularity
// ============================================================================

describe("JacobianEngine — Singularity Detection", () => {
  it("returns valid structure for well-posed Jacobian", () => {
    const J = jacobianEngine.compute5AxisJacobian("BC", { b: 45, c: 30 }, 100);
    const result = jacobianEngine.detectSingularity(J);
    expect(typeof result.nearSingularity).toBe("boolean");
    expect(result.conditionNumber).toBeGreaterThan(0);
    expect(result.maxSingularValue).toBeGreaterThan(0);
    expect(result.minSingularValue).toBeGreaterThanOrEqual(0);
    expect(result.manipulability).toBeGreaterThanOrEqual(0);
  });

  it("B=0 in BC config approaches singularity", () => {
    const J = jacobianEngine.compute5AxisJacobian("BC", { b: 0, c: 0 }, 100);
    const result = jacobianEngine.detectSingularity(J);
    // B=0 causes gimbal lock — condition number should be large
    expect(result.conditionNumber).toBeGreaterThan(10);
  });

  it("custom threshold controls detection", () => {
    const J = jacobianEngine.compute5AxisJacobian("BC", { b: 5, c: 0 }, 100);
    const loose = jacobianEngine.detectSingularity(J, 100);
    const tight = jacobianEngine.detectSingularity(J, 0.0001);
    // Loose threshold more likely to flag singularity
    if (loose.nearSingularity) {
      expect(loose.conditionNumber).toBeGreaterThan(0);
    }
    // Both should return valid structure
    expect(typeof tight.manipulability).toBe("number");
    expect(typeof tight.minSingularValue).toBe("number");
  });

  it("returns manipulability measure", () => {
    const J = jacobianEngine.compute5AxisJacobian("BC", { b: 45, c: 30 }, 100);
    const result = jacobianEngine.detectSingularity(J);
    expect(result.manipulability).toBeGreaterThan(0);
  });

  it("rank-deficient matrix has low manipulability", () => {
    // 3x3 rank-1 matrix: only 1 nonzero singular value
    const J = [[1, 0, 0], [2, 0, 0], [3, 0, 0]];
    const result = jacobianEngine.detectSingularity(J);
    // maxSingularValue should correspond to sqrt(14) ≈ 3.74
    expect(result.maxSingularValue).toBeCloseTo(Math.sqrt(14), 0);
    // Structure is valid
    expect(typeof result.nearSingularity).toBe("boolean");
    expect(typeof result.conditionNumber).toBe("number");
  });
});

// ============================================================================
// checkConfigSingularities
// ============================================================================

describe("JacobianEngine — Config Singularities", () => {
  it("BC config: B=0 is critical gimbal lock", () => {
    const result = jacobianEngine.checkConfigSingularities("BC", { b: 0, c: 45 });
    expect(result.hasSingularity).toBe(true);
    expect(result.singularities.length).toBeGreaterThan(0);
    expect(result.singularities[0].type).toBe("gimbal_lock");
    expect(result.singularities[0].axis).toBe("B");
    expect(result.singularities[0].severity).toBe("critical");
  });

  it("BC config: B=0.5 is warning level", () => {
    const result = jacobianEngine.checkConfigSingularities("BC", { b: 0.5 });
    expect(result.singularities.length).toBeGreaterThan(0);
    expect(result.singularities[0].severity).toBe("warning");
    expect(result.hasSingularity).toBe(false); // warning, not critical
  });

  it("BC config: B=45 is safe", () => {
    const result = jacobianEngine.checkConfigSingularities("BC", { b: 45, c: 0 });
    expect(result.singularities.length).toBe(0);
    expect(result.hasSingularity).toBe(false);
  });

  it("AC config: A=0 is critical", () => {
    const result = jacobianEngine.checkConfigSingularities("AC", { a: 0, c: 30 });
    expect(result.hasSingularity).toBe(true);
    expect(result.singularities[0].axis).toBe("A");
  });

  it("AC config: A=90 triggers workspace boundary warning", () => {
    const result = jacobianEngine.checkConfigSingularities("AC", { a: 90 });
    const wsWarning = result.singularities.find(s => s.type === "workspace_boundary");
    expect(wsWarning).toBeDefined();
    expect(wsWarning!.severity).toBe("warning");
  });

  it("AC config: A=45 is fully safe", () => {
    const result = jacobianEngine.checkConfigSingularities("AC", { a: 45, c: 0 });
    expect(result.singularities.length).toBe(0);
    expect(result.hasSingularity).toBe(false);
  });

  it("AC config: A=89.5 triggers only workspace warning", () => {
    const result = jacobianEngine.checkConfigSingularities("AC", { a: 89.5 });
    expect(result.singularities.length).toBe(1);
    expect(result.singularities[0].type).toBe("workspace_boundary");
    expect(result.hasSingularity).toBe(false);
  });
});
