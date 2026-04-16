/**
 * SO3KinematicsEncoderEngine Tests
 * =================================
 * Tests for SO(3) rotation group kinematics encoder engine.
 *
 * Test categories:
 *   1. Basic embedding creation (matrix, quaternion, axis-angle, Euler)
 *   2. Exponential and logarithmic maps
 *   3. Rotation composition and inverse
 *   4. SLERP interpolation
 *   5. Singularity detection
 *   6. Kinematic chain operations (DH, forward kinematics)
 *   7. Neural embedding generation
 *   8. Edge cases and numerical stability
 *
 * @module __tests__/SO3KinematicsEncoderEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  so3KinematicsEncoderEngine,
  expMap,
  logMap,
  quatSlerp,
  quatFromRotationMatrix,
  quatToRotationMatrix,
  detectSingularity,
  type RotationMatrix,
  type Quaternion,
  type Vector3,
  type EulerAngles,
  type AxisAngle,
} from "../../engines/SO3KinematicsEncoderEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const EPSILON = 1e-6;
const DEG_TO_RAD = Math.PI / 180;

// Helper to check if two numbers are approximately equal
function approxEqual(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

// Helper to check if two vectors are approximately equal
function vectorApproxEqual(a: Vector3, b: Vector3, eps = EPSILON): boolean {
  return approxEqual(a.x, b.x, eps) && approxEqual(a.y, b.y, eps) && approxEqual(a.z, b.z, eps);
}

// Helper to check if two quaternions are approximately equal (handles sign ambiguity)
function quatApproxEqual(a: Quaternion, b: Quaternion, eps = EPSILON): boolean {
  // Quaternions q and -q represent the same rotation
  const direct = approxEqual(a.w, b.w, eps) && approxEqual(a.x, b.x, eps) &&
                 approxEqual(a.y, b.y, eps) && approxEqual(a.z, b.z, eps);
  const negated = approxEqual(a.w, -b.w, eps) && approxEqual(a.x, -b.x, eps) &&
                  approxEqual(a.y, -b.y, eps) && approxEqual(a.z, -b.z, eps);
  return direct || negated;
}

// Helper to check if two rotation matrices are approximately equal
function matrixApproxEqual(A: RotationMatrix, B: RotationMatrix, eps = EPSILON): boolean {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (!approxEqual(A[i][j], B[i][j], eps)) return false;
    }
  }
  return true;
}

// ============================================================================
// BASIC EMBEDDING CREATION
// ============================================================================

describe("SO3KinematicsEncoderEngine - Basic Embedding Creation", () => {
  it("should create identity embedding", () => {
    const id = so3KinematicsEncoderEngine.identity();

    expect(id.isIdentity).toBe(true);
    expect(approxEqual(id.determinant, 1)).toBe(true);
    expect(id.orthogonalityError).toBeLessThan(EPSILON);

    // Identity matrix
    expect(approxEqual(id.rotationMatrix[0][0], 1)).toBe(true);
    expect(approxEqual(id.rotationMatrix[1][1], 1)).toBe(true);
    expect(approxEqual(id.rotationMatrix[2][2], 1)).toBe(true);

    // Identity quaternion
    expect(approxEqual(id.quaternion.w, 1)).toBe(true);
    expect(approxEqual(id.quaternion.x, 0)).toBe(true);

    // Zero rotation angle
    expect(approxEqual(id.axisAngle.angle, 0)).toBe(true);

    // Zero Lie algebra
    expect(approxEqual(id.lieAlgebraVector[0], 0)).toBe(true);
    expect(approxEqual(id.lieAlgebraVector[1], 0)).toBe(true);
    expect(approxEqual(id.lieAlgebraVector[2], 0)).toBe(true);
  });

  it("should create embedding from rotation matrix", () => {
    // 90-degree rotation about Z-axis
    const R: RotationMatrix = [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ];

    const emb = so3KinematicsEncoderEngine.fromRotationMatrix(R);

    expect(emb.isIdentity).toBe(false);
    expect(approxEqual(emb.determinant, 1)).toBe(true);
    expect(emb.orthogonalityError).toBeLessThan(EPSILON);

    // Axis-angle should be 90 deg about Z
    expect(approxEqual(emb.axisAngle.angle, Math.PI / 2, 0.01)).toBe(true);
    expect(approxEqual(Math.abs(emb.axisAngle.axis.z), 1, 0.01)).toBe(true);
  });

  it("should create embedding from quaternion", () => {
    // 45-degree rotation about X-axis
    const angle = 45 * DEG_TO_RAD;
    const q: Quaternion = {
      w: Math.cos(angle / 2),
      x: Math.sin(angle / 2),
      y: 0,
      z: 0,
    };

    const emb = so3KinematicsEncoderEngine.fromQuaternion(q);

    expect(emb.isIdentity).toBe(false);
    expect(approxEqual(emb.determinant, 1)).toBe(true);
    expect(approxEqual(emb.axisAngle.angle, angle, 0.01)).toBe(true);
    expect(approxEqual(emb.axisAngle.axis.x, 1, 0.01)).toBe(true);
  });

  it("should create embedding from axis-angle", () => {
    const aa: AxisAngle = {
      axis: { x: 0, y: 1, z: 0 },
      angle: 60 * DEG_TO_RAD,
    };

    const emb = so3KinematicsEncoderEngine.fromAxisAngle(aa);

    expect(approxEqual(emb.determinant, 1)).toBe(true);
    expect(approxEqual(emb.axisAngle.angle, aa.angle, 0.01)).toBe(true);
    expect(approxEqual(emb.axisAngle.axis.y, 1, 0.01)).toBe(true);
  });

  it("should create embedding from Euler angles", () => {
    const euler: EulerAngles = {
      alpha: 30 * DEG_TO_RAD,
      beta: 45 * DEG_TO_RAD,
      gamma: 60 * DEG_TO_RAD,
      convention: "ZYX",
    };

    const emb = so3KinematicsEncoderEngine.fromEulerAngles(euler);

    expect(approxEqual(emb.determinant, 1)).toBe(true);
    expect(emb.eulerAngles.convention).toBe("ZYX");
  });

  it("should create embedding from Lie algebra vector", () => {
    // Rotation of angle theta about normalized axis is omega = theta * axis
    const theta = 90 * DEG_TO_RAD;
    const omega: Vector3 = { x: 0, y: 0, z: theta };

    const emb = so3KinematicsEncoderEngine.fromLieAlgebra(omega);

    expect(approxEqual(emb.determinant, 1)).toBe(true);
    expect(approxEqual(emb.axisAngle.angle, theta, 0.01)).toBe(true);
  });
});

// ============================================================================
// EXPONENTIAL AND LOGARITHMIC MAPS
// ============================================================================

describe("SO3KinematicsEncoderEngine - Exp/Log Maps", () => {
  it("should exp(log(R)) = R (round-trip)", () => {
    // Test various rotations
    const testAngles = [0, 15, 45, 90, 135, 179];
    const testAxes: Vector3[] = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
    ];

    for (const angleDeg of testAngles) {
      const angle = angleDeg * DEG_TO_RAD;
      for (const axis of testAxes) {
        const len = Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2);
        const normAxis = { x: axis.x / len, y: axis.y / len, z: axis.z / len };

        const omega: Vector3 = {
          x: normAxis.x * angle,
          y: normAxis.y * angle,
          z: normAxis.z * angle,
        };

        const R = expMap(omega);
        const omegaRecovered = logMap(R);

        // For angle near 0, omega should be near 0
        if (angleDeg < 1) {
          expect(Math.abs(omegaRecovered.x)).toBeLessThan(0.1);
          expect(Math.abs(omegaRecovered.y)).toBeLessThan(0.1);
          expect(Math.abs(omegaRecovered.z)).toBeLessThan(0.1);
        } else {
          // Check that recovered angle is correct (might differ by sign for axis)
          const recoveredAngle = Math.sqrt(
            omegaRecovered.x ** 2 + omegaRecovered.y ** 2 + omegaRecovered.z ** 2
          );
          expect(approxEqual(recoveredAngle, angle, 0.01)).toBe(true);
        }
      }
    }
  });

  it("should log(exp(omega)) = omega for small angles", () => {
    const omega: Vector3 = { x: 0.1, y: 0.2, z: 0.15 };
    const R = expMap(omega);
    const omegaRecovered = logMap(R);

    expect(approxEqual(omegaRecovered.x, omega.x, 0.001)).toBe(true);
    expect(approxEqual(omegaRecovered.y, omega.y, 0.001)).toBe(true);
    expect(approxEqual(omegaRecovered.z, omega.z, 0.001)).toBe(true);
  });

  it("should handle identity correctly", () => {
    const omega = logMap([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    expect(Math.abs(omega.x)).toBeLessThan(EPSILON);
    expect(Math.abs(omega.y)).toBeLessThan(EPSILON);
    expect(Math.abs(omega.z)).toBeLessThan(EPSILON);
  });

  it("should handle 180-degree rotation", () => {
    // 180-degree rotation about Z
    const R: RotationMatrix = [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ];

    const omega = logMap(R);
    const angle = Math.sqrt(omega.x ** 2 + omega.y ** 2 + omega.z ** 2);

    expect(approxEqual(angle, Math.PI, 0.01)).toBe(true);
  });
});

// ============================================================================
// ROTATION COMPOSITION
// ============================================================================

describe("SO3KinematicsEncoderEngine - Rotation Composition", () => {
  it("should compose rotations correctly", () => {
    // R1: 90 deg about Z, R2: 90 deg about X
    const e1 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 90 * DEG_TO_RAD,
    });
    const e2 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 0, z: 0 },
      angle: 90 * DEG_TO_RAD,
    });

    const composed = so3KinematicsEncoderEngine.compose(e1, e2);

    expect(approxEqual(composed.determinant, 1)).toBe(true);
    expect(composed.orthogonalityError).toBeLessThan(EPSILON);
  });

  it("should R * R^-1 = I", () => {
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 1, z: 1 },
      angle: 60 * DEG_TO_RAD,
    });

    const eInv = so3KinematicsEncoderEngine.inverse(e);
    const result = so3KinematicsEncoderEngine.compose(e, eInv);

    expect(result.isIdentity || result.axisAngle.angle < 0.01).toBe(true);
  });

  it("should compute correct geodesic distance", () => {
    const e1 = so3KinematicsEncoderEngine.identity();
    const e2 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 45 * DEG_TO_RAD,
    });

    const dist = so3KinematicsEncoderEngine.distance(e1, e2);
    expect(approxEqual(dist, 45 * DEG_TO_RAD, 0.01)).toBe(true);
  });
});

// ============================================================================
// SLERP INTERPOLATION
// ============================================================================

describe("SO3KinematicsEncoderEngine - SLERP Interpolation", () => {
  it("should interpolate(t=0) = start", () => {
    const e1 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 0,
    });
    const e2 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 90 * DEG_TO_RAD,
    });

    const result = so3KinematicsEncoderEngine.interpolate(e1, e2, 0);
    expect(quatApproxEqual(result.quaternion, e1.quaternion, 0.01)).toBe(true);
  });

  it("should interpolate(t=1) = end", () => {
    const e1 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 0,
    });
    const e2 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 90 * DEG_TO_RAD,
    });

    const result = so3KinematicsEncoderEngine.interpolate(e1, e2, 1);
    expect(quatApproxEqual(result.quaternion, e2.quaternion, 0.01)).toBe(true);
  });

  it("should interpolate(t=0.5) be midpoint", () => {
    const e1 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 0,
    });
    const e2 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 90 * DEG_TO_RAD,
    });

    const result = so3KinematicsEncoderEngine.interpolate(e1, e2, 0.5);

    // Should be 45 degrees about Z
    expect(approxEqual(result.axisAngle.angle, 45 * DEG_TO_RAD, 0.02)).toBe(true);
  });

  it("should maintain constant angular velocity", () => {
    const e1 = so3KinematicsEncoderEngine.identity();
    const e2 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 0, z: 0 },
      angle: 80 * DEG_TO_RAD,
    });

    // Sample at regular intervals
    const samples = [0, 0.25, 0.5, 0.75, 1.0];
    const angles: number[] = [];

    for (const t of samples) {
      const interp = so3KinematicsEncoderEngine.interpolate(e1, e2, t);
      angles.push(interp.axisAngle.angle);
    }

    // Check linear progression of angles
    for (let i = 0; i < samples.length - 1; i++) {
      const expectedAngle = samples[i] * 80 * DEG_TO_RAD;
      expect(approxEqual(angles[i], expectedAngle, 0.05)).toBe(true);
    }
  });

  it("should handle quaternion sign ambiguity (shortest path)", () => {
    // Quaternions q and -q are same rotation
    const q1: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const q2: Quaternion = { w: -0.707, x: 0, y: 0, z: 0.707 }; // negative w

    const result = quatSlerp(q1, q2, 0.5);

    // Should still produce valid rotation
    const norm = Math.sqrt(result.w ** 2 + result.x ** 2 + result.y ** 2 + result.z ** 2);
    expect(approxEqual(norm, 1, 0.01)).toBe(true);
  });
});

// ============================================================================
// SINGULARITY DETECTION
// ============================================================================

describe("SO3KinematicsEncoderEngine - Singularity Detection", () => {
  it("should detect gimbal lock at A=0 for trunnion_AC", () => {
    const result = detectSingularity("trunnion_AC", { a: 0, c: 45 });

    expect(result.isSingular).toBe(true);
    expect(result.type).toBe("gimbal_lock");
    expect(result.affectedAxes).toContain("A");
    expect(result.affectedAxes).toContain("C");
    expect(result.severity).toBe("critical");
  });

  it("should detect gimbal lock at B=0 for trunnion_BC", () => {
    const result = detectSingularity("trunnion_BC", { b: 0.5, c: 30 });

    expect(result.isSingular).toBe(true);
    expect(result.type).toBe("gimbal_lock");
    expect(result.affectedAxes).toContain("B");
    expect(result.severity).toBe("warning"); // Just under threshold
  });

  it("should not detect singularity at safe angles", () => {
    const result = detectSingularity("trunnion_AC", { a: 45, c: 90 });

    expect(result.isSingular).toBe(false);
    expect(result.type).toBe("none");
    expect(result.severity).toBe("safe");
  });

  it("should detect singularity at B=90 for mill_turn_CB", () => {
    const result = detectSingularity("mill_turn_CB", { b: 90, c: 0 });

    expect(result.isSingular).toBe(true);
    expect(result.type).toBe("gimbal_lock");
  });

  it("should use isNearGimbalLock for Euler angle check", () => {
    // ZYZ gimbal lock at beta = 0
    const euler: EulerAngles = {
      alpha: 30 * DEG_TO_RAD,
      beta: 0.001,  // Very close to 0
      gamma: 60 * DEG_TO_RAD,
      convention: "ZYZ",
    };

    expect(so3KinematicsEncoderEngine.isNearGimbalLock(euler, 1)).toBe(true);
  });

  it("should not trigger gimbal lock for safe Euler angles", () => {
    const euler: EulerAngles = {
      alpha: 30 * DEG_TO_RAD,
      beta: 45 * DEG_TO_RAD,
      gamma: 60 * DEG_TO_RAD,
      convention: "ZYZ",
    };

    expect(so3KinematicsEncoderEngine.isNearGimbalLock(euler)).toBe(false);
  });
});

// ============================================================================
// KINEMATIC CHAIN OPERATIONS
// ============================================================================

describe("SO3KinematicsEncoderEngine - Kinematic Chain", () => {
  it("should create kinematic chain for trunnion_AC", () => {
    const chain = so3KinematicsEncoderEngine.createKinematicChain("trunnion_AC");

    expect(chain.topology).toBe("trunnion_AC");
    expect(chain.dhParams.length).toBe(5); // X, Y, Z, A, C
    expect(chain.jointLimits.length).toBe(5);

    // Check joint IDs
    const jointIds = chain.dhParams.map(p => p.joint_id);
    expect(jointIds).toContain("X");
    expect(jointIds).toContain("A");
    expect(jointIds).toContain("C");
  });

  it("should create kinematic chain for robot_6dof", () => {
    const chain = so3KinematicsEncoderEngine.createKinematicChain("robot_6dof");

    expect(chain.dhParams.length).toBe(6);
    expect(chain.dhParams.every(p => p.type === "revolute")).toBe(true);
  });

  it("should compute forward kinematics for identity pose", () => {
    const chain = so3KinematicsEncoderEngine.createKinematicChain("trunnion_AC", {
      toolLength: 100,
    });

    const jointValues = [0, 0, 0, 0, 0];  // All zeros
    const fk = so3KinematicsEncoderEngine.forwardKinematics(chain, jointValues);

    // At home position, tool tip should be at (0, 0, -toolLength)
    expect(fk.position).toBeDefined();
    expect(fk.rotation).toBeDefined();
    expect(approxEqual(fk.rotation.determinant, 1)).toBe(true);
  });

  it("should compute forward kinematics with joint motion", () => {
    const chain = so3KinematicsEncoderEngine.createKinematicChain("trunnion_AC", {
      toolLength: 100,
    });

    // Compute FK at home position
    const fkHome = so3KinematicsEncoderEngine.forwardKinematics(chain, [0, 0, 0, 0, 0]);

    // Move X by 100mm
    const jointValues = [100, 0, 0, 0, 0];
    const fkMoved = so3KinematicsEncoderEngine.forwardKinematics(chain, jointValues);

    // Position should have changed due to X-axis motion
    // The X-axis is a prismatic joint, so the position should differ
    const positionChange = Math.abs(fkMoved.position.x - fkHome.position.x) +
                           Math.abs(fkMoved.position.y - fkHome.position.y) +
                           Math.abs(fkMoved.position.z - fkHome.position.z);
    expect(positionChange).toBeGreaterThan(50);  // Should see significant change
  });

  it("should compute DH transform correctly", () => {
    // Simple rotation about Z by 90 degrees
    const params = {
      theta: Math.PI / 2,
      d: 0,
      a: 0,
      alpha: 0,
      type: "revolute" as const,
    };

    const T = so3KinematicsEncoderEngine.dhTransform(params, 0);

    // Should be pure rotation about Z
    expect(approxEqual(T[0][0], 0, 0.01)).toBe(true);  // cos(90)
    expect(approxEqual(T[0][1], -1, 0.01)).toBe(true); // -sin(90)
    expect(approxEqual(T[1][0], 1, 0.01)).toBe(true);  // sin(90)
    expect(approxEqual(T[3][3], 1)).toBe(true);        // homogeneous
  });
});

// ============================================================================
// NEURAL EMBEDDING
// ============================================================================

describe("SO3KinematicsEncoderEngine - Neural Embedding", () => {
  it("should generate 32-dimensional embedding", () => {
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 0, z: 0 },
      angle: 45 * DEG_TO_RAD,
    });

    const neural = so3KinematicsEncoderEngine.toNeuralEmbedding(e);

    expect(neural.dimension).toBe(32);
    expect(neural.embedding.length).toBe(32);
  });

  it("should have correct component dimensions", () => {
    const e = so3KinematicsEncoderEngine.identity();
    const neural = so3KinematicsEncoderEngine.toNeuralEmbedding(e);

    expect(neural.components.rotationMatrix.length).toBe(9);
    expect(neural.components.quaternion.length).toBe(4);
    expect(neural.components.lieAlgebra.length).toBe(3);
    expect(neural.components.eulerSines.length).toBe(6);
    expect(neural.components.singularityFeatures.length).toBe(6);
    expect(neural.components.normalization.length).toBe(4);

    // Sum should equal total
    const total = 9 + 4 + 3 + 6 + 6 + 4;
    expect(total).toBe(32);
  });

  it("should reconstruct from neural embedding", () => {
    const original = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 1, z: 0 },
      angle: 60 * DEG_TO_RAD,
    });

    const neural = so3KinematicsEncoderEngine.toNeuralEmbedding(original);
    const reconstructed = so3KinematicsEncoderEngine.fromNeuralEmbedding(neural);

    // Should be approximately equal
    expect(quatApproxEqual(original.quaternion, reconstructed.quaternion, 0.01)).toBe(true);
  });

  it("should produce different embeddings for different rotations", () => {
    const e1 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 0, z: 0 },
      angle: 30 * DEG_TO_RAD,
    });
    const e2 = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 1, z: 0 },
      angle: 60 * DEG_TO_RAD,
    });

    const n1 = so3KinematicsEncoderEngine.toNeuralEmbedding(e1);
    const n2 = so3KinematicsEncoderEngine.toNeuralEmbedding(e2);

    // Compute L2 distance
    let dist = 0;
    for (let i = 0; i < 32; i++) {
      dist += (n1.embedding[i] - n2.embedding[i]) ** 2;
    }
    dist = Math.sqrt(dist);

    expect(dist).toBeGreaterThan(0.1);  // Should be noticeably different
  });

  it("should include singularity features", () => {
    // Near singularity: A close to 0
    const nearSingular = so3KinematicsEncoderEngine.fromEulerAngles({
      alpha: 0,
      beta: 0.01,  // Very small
      gamma: 0,
      convention: "ZYZ",
    });

    const neural = so3KinematicsEncoderEngine.toNeuralEmbedding(nearSingular, "trunnion_AC");

    // Z-axis alignment should be high (tool nearly vertical)
    const zAlignment = neural.components.singularityFeatures[3];
    expect(zAlignment).toBeGreaterThan(0.9);
  });
});

// ============================================================================
// QUATERNION-MATRIX CONVERSIONS
// ============================================================================

describe("SO3KinematicsEncoderEngine - Quaternion-Matrix Conversions", () => {
  it("should convert quaternion to matrix and back", () => {
    const q: Quaternion = { w: 0.707, x: 0.707, y: 0, z: 0 };  // 90 deg about X
    const R = quatToRotationMatrix(q);
    const qBack = quatFromRotationMatrix(R);

    expect(quatApproxEqual(q, qBack, 0.01)).toBe(true);
  });

  it("should maintain orthogonality in conversion", () => {
    const q: Quaternion = { w: 0.5, x: 0.5, y: 0.5, z: 0.5 };
    const R = quatToRotationMatrix(q);

    // Check R^T * R = I
    let maxError = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          sum += R[k][i] * R[k][j];
        }
        const expected = i === j ? 1 : 0;
        maxError = Math.max(maxError, Math.abs(sum - expected));
      }
    }

    expect(maxError).toBeLessThan(EPSILON);
  });

  it("should handle edge case quaternions", () => {
    // Identity quaternion
    const qId: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const RId = quatToRotationMatrix(qId);

    expect(approxEqual(RId[0][0], 1)).toBe(true);
    expect(approxEqual(RId[1][1], 1)).toBe(true);
    expect(approxEqual(RId[2][2], 1)).toBe(true);

    // 180-degree rotation
    const q180: Quaternion = { w: 0, x: 1, y: 0, z: 0 };  // 180 deg about X
    const R180 = quatToRotationMatrix(q180);

    // Y and Z should flip
    expect(approxEqual(R180[1][1], -1, 0.01)).toBe(true);
    expect(approxEqual(R180[2][2], -1, 0.01)).toBe(true);
  });
});

// ============================================================================
// VECTOR ROTATION
// ============================================================================

describe("SO3KinematicsEncoderEngine - Vector Rotation", () => {
  it("should rotate vector using embedding", () => {
    // 90 deg about Z: (1,0,0) -> (0,1,0)
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 90 * DEG_TO_RAD,
    });

    const v: Vector3 = { x: 1, y: 0, z: 0 };
    const rotated = so3KinematicsEncoderEngine.rotateVector(e, v);

    expect(approxEqual(rotated.x, 0, 0.01)).toBe(true);
    expect(approxEqual(rotated.y, 1, 0.01)).toBe(true);
    expect(approxEqual(rotated.z, 0, 0.01)).toBe(true);
  });

  it("should preserve vector magnitude", () => {
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 1, z: 1 },
      angle: 123 * DEG_TO_RAD,
    });

    const v: Vector3 = { x: 3, y: 4, z: 0 };
    const rotated = so3KinematicsEncoderEngine.rotateVector(e, v);

    const origMag = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
    const rotMag = Math.sqrt(rotated.x ** 2 + rotated.y ** 2 + rotated.z ** 2);

    expect(approxEqual(origMag, rotMag, 0.01)).toBe(true);
  });
});

// ============================================================================
// UTILITY METHODS
// ============================================================================

describe("SO3KinematicsEncoderEngine - Utilities", () => {
  it("should convert degrees to radians", () => {
    expect(approxEqual(so3KinematicsEncoderEngine.degToRad(180), Math.PI)).toBe(true);
    expect(approxEqual(so3KinematicsEncoderEngine.degToRad(90), Math.PI / 2)).toBe(true);
    expect(approxEqual(so3KinematicsEncoderEngine.degToRad(0), 0)).toBe(true);
  });

  it("should convert radians to degrees", () => {
    expect(approxEqual(so3KinematicsEncoderEngine.radToDeg(Math.PI), 180)).toBe(true);
    expect(approxEqual(so3KinematicsEncoderEngine.radToDeg(Math.PI / 2), 90)).toBe(true);
  });

  it("should orthogonalize nearly-orthogonal matrix", () => {
    // Slightly perturbed identity
    const R: RotationMatrix = [
      [1.001, 0.002, -0.001],
      [-0.002, 0.999, 0.003],
      [0.001, -0.003, 1.002],
    ];

    const Rorth = so3KinematicsEncoderEngine.orthogonalize(R);

    // Should be closer to orthogonal
    const emb = so3KinematicsEncoderEngine.fromRotationMatrix(Rorth);
    expect(emb.orthogonalityError).toBeLessThan(0.01);
    expect(approxEqual(emb.determinant, 1, 0.01)).toBe(true);
  });

  it("should return engine statistics", () => {
    const stats = so3KinematicsEncoderEngine.getStatistics();

    expect(stats.version).toBeDefined();
    expect(stats.capabilities.length).toBeGreaterThan(0);
    expect(stats.supportedTopologies.length).toBeGreaterThan(0);
    expect(stats.supportedConventions.length).toBe(10);
    expect(stats.neuralEmbeddingDim).toBe(32);
  });

  it("should return AI context", () => {
    const context = so3KinematicsEncoderEngine.getContextForAI();

    expect(context).toContain("SO3");
    expect(context).toContain("Lie algebra");
    expect(context).toContain("SLERP");
    expect(context).toContain("32-dimensional");
  });
});

// ============================================================================
// EDGE CASES AND NUMERICAL STABILITY
// ============================================================================

describe("SO3KinematicsEncoderEngine - Edge Cases", () => {
  it("should handle very small rotations", () => {
    const smallAngle = 0.0001;  // Nearly zero
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 0, z: 0 },
      angle: smallAngle,
    });

    expect(approxEqual(e.determinant, 1)).toBe(true);
    expect(e.orthogonalityError).toBeLessThan(EPSILON);
  });

  it("should handle 180-degree rotations", () => {
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 0, z: 0 },
      angle: Math.PI,
    });

    expect(approxEqual(e.determinant, 1)).toBe(true);
    expect(approxEqual(e.axisAngle.angle, Math.PI, 0.01)).toBe(true);
  });

  it("should handle rotations > 180 degrees", () => {
    // 270 deg = -90 deg
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 1 },
      angle: 270 * DEG_TO_RAD,
    });

    expect(approxEqual(e.determinant, 1)).toBe(true);
    // The angle should be <= 180 (shortest path)
    expect(e.axisAngle.angle).toBeLessThanOrEqual(Math.PI + 0.01);
  });

  it("should handle zero vector axis gracefully", () => {
    // Edge case: zero-length axis (should default to safe behavior)
    const e = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 0, y: 0, z: 0 },
      angle: 0,
    });

    expect(e.isIdentity).toBe(true);
  });

  it("should maintain numerical precision after many compositions", () => {
    // Compose same rotation 100 times, then inverse 100 times
    const small = so3KinematicsEncoderEngine.fromAxisAngle({
      axis: { x: 1, y: 1, z: 1 },
      angle: 0.1,
    });

    let result = so3KinematicsEncoderEngine.identity();
    for (let i = 0; i < 100; i++) {
      result = so3KinematicsEncoderEngine.compose(result, small);
    }

    const smallInv = so3KinematicsEncoderEngine.inverse(small);
    for (let i = 0; i < 100; i++) {
      result = so3KinematicsEncoderEngine.compose(result, smallInv);
    }

    // Should be back to identity (within numerical tolerance)
    expect(result.axisAngle.angle).toBeLessThan(0.1);
    expect(approxEqual(result.determinant, 1, 0.01)).toBe(true);
  });

  it("should handle SLERP with identical quaternions", () => {
    const q: Quaternion = { w: 0.707, x: 0.707, y: 0, z: 0 };
    const result = quatSlerp(q, q, 0.5);

    expect(quatApproxEqual(result, q, 0.01)).toBe(true);
  });

  it("should handle SLERP with opposite quaternions", () => {
    const q1: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const q2: Quaternion = { w: -1, x: 0, y: 0, z: 0 };  // Same rotation!

    const result = quatSlerp(q1, q2, 0.5);

    // Should still be valid unit quaternion
    const norm = Math.sqrt(result.w ** 2 + result.x ** 2 + result.y ** 2 + result.z ** 2);
    expect(approxEqual(norm, 1, 0.01)).toBe(true);
  });
});
