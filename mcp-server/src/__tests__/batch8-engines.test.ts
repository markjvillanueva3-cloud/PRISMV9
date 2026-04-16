/**
 * Batch 8 Engine — Unit Tests
 * KinematicsEngine (Advanced CNC Kinematics)
 * @milestone AUDIT-FT-B8
 */
import { describe, it, expect } from "vitest";
import { kinematicsEngine } from "../engines/KinematicsEngine.js";

describe("KinematicsEngine", () => {
  describe("transformation matrices", () => {
    it("rotX(0) is identity rotation", () => {
      const T = kinematicsEngine.rotX(0);
      expect(T[0][0]).toBeCloseTo(1);
      expect(T[1][1]).toBeCloseTo(1);
      expect(T[2][2]).toBeCloseTo(1);
    });

    it("rotZ(pi/2) rotates X to Y", () => {
      const T = kinematicsEngine.rotZ(Math.PI / 2);
      const p = kinematicsEngine.transformPoint(T, { x: 1, y: 0, z: 0 });
      expect(p.x).toBeCloseTo(0, 4);
      expect(p.y).toBeCloseTo(1, 4);
      expect(p.z).toBeCloseTo(0, 4);
    });

    it("translate moves point", () => {
      const T = kinematicsEngine.translate(10, 20, 30);
      const p = kinematicsEngine.transformPoint(T, { x: 0, y: 0, z: 0 });
      expect(p.x).toBe(10);
      expect(p.y).toBe(20);
      expect(p.z).toBe(30);
    });

    it("chainTransforms composes correctly", () => {
      const T = kinematicsEngine.chainTransforms(
        kinematicsEngine.translate(5, 0, 0),
        kinematicsEngine.rotZ(Math.PI / 2),
        kinematicsEngine.translate(3, 0, 0),
      );
      const p = kinematicsEngine.transformPoint(T, { x: 0, y: 0, z: 0 });
      expect(p.x).toBeCloseTo(5, 2);
      expect(p.y).toBeCloseTo(3, 2);
    });

    it("invertTransform reverses transformation", () => {
      const T = kinematicsEngine.chainTransforms(
        kinematicsEngine.translate(10, 20, 30),
        kinematicsEngine.rotY(0.5),
      );
      const Tinv = kinematicsEngine.invertTransform(T);
      const I = kinematicsEngine.matMul4x4(T, Tinv);
      // Should be close to identity
      expect(I[0][0]).toBeCloseTo(1, 6);
      expect(I[1][1]).toBeCloseTo(1, 6);
      expect(I[2][2]).toBeCloseTo(1, 6);
      expect(I[0][3]).toBeCloseTo(0, 6);
      expect(I[1][3]).toBeCloseTo(0, 6);
      expect(I[2][3]).toBeCloseTo(0, 6);
    });
  });

  describe("DH forward kinematics", () => {
    it("computes FK for 2-link planar arm", () => {
      const dhTable = [
        { theta: 0, d: 0, a: 100, alpha: 0, type: "revolute" as const },
        { theta: 0, d: 0, a: 100, alpha: 0, type: "revolute" as const },
      ];
      // Both joints at 0: end effector at (200, 0, 0)
      const r = kinematicsEngine.forwardKinematicsDH(dhTable, [0, 0]);
      expect(r.position.x).toBeCloseTo(200, 2);
      expect(r.position.y).toBeCloseTo(0, 2);
    });

    it("joint angle rotates end effector", () => {
      const dhTable = [
        { theta: 0, d: 0, a: 100, alpha: 0, type: "revolute" as const },
        { theta: 0, d: 0, a: 100, alpha: 0, type: "revolute" as const },
      ];
      // Joint 1 at 90 deg
      const r = kinematicsEngine.forwardKinematicsDH(
        dhTable, [Math.PI / 2, 0],
      );
      expect(r.position.x).toBeCloseTo(0, 1);
      expect(r.position.y).toBeCloseTo(200, 1);
    });

    it("prismatic joint extends", () => {
      const dhTable = [
        { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic" as const },
      ];
      const r = kinematicsEngine.forwardKinematicsDH(dhTable, [50]);
      expect(r.position.z).toBeCloseTo(50, 2);
    });
  });

  describe("Euler angles", () => {
    it("identity rotation gives zero angles", () => {
      const R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const e = kinematicsEngine.rotationToEuler(R);
      expect(e.roll).toBeCloseTo(0);
      expect(e.pitch).toBeCloseTo(0);
      expect(e.yaw).toBeCloseTo(0);
    });
  });

  describe("5-axis inverse kinematics", () => {
    it("computes IK for table-table configuration", () => {
      const solutions = kinematicsEngine.fiveAxisIK({
        position: { x: 100, y: 50, z: -20 },
        axis: { i: 0, j: 0, k: -1 },
      });
      expect(solutions.length).toBeGreaterThanOrEqual(1);
      expect(solutions[0].valid).toBe(true);
      // Vertical tool → A should be ~0
      expect(Math.abs(solutions[0].A)).toBeLessThan(1);
    });

    it("tilted tool gives non-zero A", () => {
      const solutions = kinematicsEngine.fiveAxisIK({
        position: { x: 100, y: 50, z: -20 },
        axis: { i: 0, j: 0.5, k: -0.866 },
      });
      expect(solutions[0].A).toBeGreaterThan(0);
    });

    it("generates alternative solution", () => {
      const solutions = kinematicsEngine.fiveAxisIK({
        position: { x: 100, y: 50, z: -20 },
        axis: { i: 0.3, j: 0.3, k: -0.905 },
      });
      expect(solutions.length).toBe(2);
    });

    it("head-head returns direct XYZ", () => {
      const solutions = kinematicsEngine.fiveAxisIK(
        { position: { x: 50, y: 50, z: 0 }, axis: { i: 0, j: 0, k: -1 } },
        { type: "head-head" },
      );
      expect(solutions[0].X).toBeCloseTo(50);
      expect(solutions[0].Y).toBeCloseTo(50);
    });

    it("respects axis limits", () => {
      const solutions = kinematicsEngine.fiveAxisIK(
        { position: { x: 0, y: 0, z: 0 }, axis: { i: 0.5, j: 0, k: -0.866 } },
        { limits: { A: [0, 10] } },
      );
      // A ≈ 30 deg, exceeds limit
      expect(solutions[0].valid).toBe(false);
    });
  });

  describe("singularity detection", () => {
    it("detects singularity at A=0", () => {
      const r = kinematicsEngine.detectSingularity({ A: 0.5 });
      expect(r.isSingular).toBe(true);
      expect(r.type).toBe("gimbal_lock");
    });

    it("no singularity at A=45", () => {
      const r = kinematicsEngine.detectSingularity({ A: 45 });
      expect(r.isSingular).toBe(false);
      expect(r.type).toBe("none");
    });

    it("detects singularity at A=180", () => {
      const r = kinematicsEngine.detectSingularity({ A: 179.5 });
      expect(r.isSingular).toBe(true);
    });
  });
});
