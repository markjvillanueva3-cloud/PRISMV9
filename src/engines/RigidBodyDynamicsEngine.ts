/**
 * RigidBodyDynamicsEngine — Rigid body dynamics for machine simulation
 *
 * Computes forces, torques, inertia, and motion for rigid bodies.
 * Used for fixture analysis, workholding simulation, and machine
 * component dynamics.
 *
 * @module RigidBodyDynamicsEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 { x: number; y: number; z: number; }

export interface InertiaResult {
  mass: number;
  centerOfMass: Vec3;
  Ixx: number; Iyy: number; Izz: number;
  Ixy: number; Ixz: number; Iyz: number;
  principalMoments: [number, number, number];
}

export interface ForceAnalysis {
  netForce: Vec3;
  netTorque: Vec3;
  acceleration: Vec3;
  angularAcceleration: Vec3;
  isEquilibrium: boolean;
}

export interface ImpactResult {
  velocityAfterA: Vec3;
  velocityAfterB: Vec3;
  impulse: number;
  energyLoss: number;
  coefficientOfRestitution: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class RigidBodyDynamicsEngineImpl {

  /**
   * Compute mass properties for a rectangular prism.
   */
  boxInertia(
    width: number, height: number, depth: number,
    density: number, offset?: Vec3
  ): InertiaResult {
    const mass = width * height * depth * density;
    const Ixx = (mass / 12) * (height ** 2 + depth ** 2);
    const Iyy = (mass / 12) * (width ** 2 + depth ** 2);
    const Izz = (mass / 12) * (width ** 2 + height ** 2);

    const com: Vec3 = offset ?? { x: 0, y: 0, z: 0 };

    return {
      mass, centerOfMass: com,
      Ixx, Iyy, Izz, Ixy: 0, Ixz: 0, Iyz: 0,
      principalMoments: [Ixx, Iyy, Izz],
    };
  }

  /**
   * Compute mass properties for a cylinder.
   */
  cylinderInertia(
    radius: number, height: number, density: number, offset?: Vec3
  ): InertiaResult {
    const mass = Math.PI * radius ** 2 * height * density;
    const Ixx = (mass / 12) * (3 * radius ** 2 + height ** 2);
    const Iyy = Ixx;
    const Izz = (mass * radius ** 2) / 2;

    const com: Vec3 = offset ?? { x: 0, y: 0, z: 0 };

    return {
      mass, centerOfMass: com,
      Ixx, Iyy, Izz, Ixy: 0, Ixz: 0, Iyz: 0,
      principalMoments: [Ixx, Iyy, Izz],
    };
  }

  /**
   * Parallel axis theorem: shift inertia to a new axis.
   */
  parallelAxis(inertia: InertiaResult, newAxis: Vec3): InertiaResult {
    const m = inertia.mass;
    const dx = newAxis.x - inertia.centerOfMass.x;
    const dy = newAxis.y - inertia.centerOfMass.y;
    const dz = newAxis.z - inertia.centerOfMass.z;

    return {
      ...inertia,
      centerOfMass: newAxis,
      Ixx: inertia.Ixx + m * (dy ** 2 + dz ** 2),
      Iyy: inertia.Iyy + m * (dx ** 2 + dz ** 2),
      Izz: inertia.Izz + m * (dx ** 2 + dy ** 2),
      Ixy: inertia.Ixy + m * dx * dy,
      Ixz: inertia.Ixz + m * dx * dz,
      Iyz: inertia.Iyz + m * dy * dz,
      principalMoments: [
        inertia.Ixx + m * (dy ** 2 + dz ** 2),
        inertia.Iyy + m * (dx ** 2 + dz ** 2),
        inertia.Izz + m * (dx ** 2 + dy ** 2),
      ],
    };
  }

  /**
   * Combine multiple rigid bodies into composite inertia.
   */
  combineInertias(bodies: InertiaResult[]): InertiaResult {
    if (bodies.length === 0) {
      return { mass: 0, centerOfMass: { x: 0, y: 0, z: 0 }, Ixx: 0, Iyy: 0, Izz: 0, Ixy: 0, Ixz: 0, Iyz: 0, principalMoments: [0, 0, 0] };
    }

    const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
    if (totalMass === 0) return bodies[0];

    // Combined center of mass
    const com: Vec3 = {
      x: bodies.reduce((s, b) => s + b.mass * b.centerOfMass.x, 0) / totalMass,
      y: bodies.reduce((s, b) => s + b.mass * b.centerOfMass.y, 0) / totalMass,
      z: bodies.reduce((s, b) => s + b.mass * b.centerOfMass.z, 0) / totalMass,
    };

    // Sum inertias with parallel axis theorem
    let Ixx = 0, Iyy = 0, Izz = 0, Ixy = 0, Ixz = 0, Iyz = 0;
    for (const b of bodies) {
      const shifted = this.parallelAxis(b, com);
      Ixx += shifted.Ixx;
      Iyy += shifted.Iyy;
      Izz += shifted.Izz;
      Ixy += shifted.Ixy;
      Ixz += shifted.Ixz;
      Iyz += shifted.Iyz;
    }

    return {
      mass: totalMass, centerOfMass: com,
      Ixx, Iyy, Izz, Ixy, Ixz, Iyz,
      principalMoments: [Ixx, Iyy, Izz],
    };
  }

  /**
   * Newton-Euler force/torque analysis.
   */
  forceAnalysis(
    forces: { force: Vec3; applicationPoint: Vec3 }[],
    inertia: InertiaResult,
    pivot?: Vec3
  ): ForceAnalysis {
    const p = pivot ?? inertia.centerOfMass;

    let netForce: Vec3 = { x: 0, y: 0, z: 0 };
    let netTorque: Vec3 = { x: 0, y: 0, z: 0 };

    for (const { force, applicationPoint } of forces) {
      netForce.x += force.x;
      netForce.y += force.y;
      netForce.z += force.z;

      // Torque = r × F
      const r: Vec3 = {
        x: applicationPoint.x - p.x,
        y: applicationPoint.y - p.y,
        z: applicationPoint.z - p.z,
      };
      netTorque.x += r.y * force.z - r.z * force.y;
      netTorque.y += r.z * force.x - r.x * force.z;
      netTorque.z += r.x * force.y - r.y * force.x;
    }

    const m = inertia.mass || 1;
    const acceleration: Vec3 = {
      x: netForce.x / m,
      y: netForce.y / m,
      z: netForce.z / m,
    };

    const angularAcceleration: Vec3 = {
      x: inertia.Ixx > 0 ? netTorque.x / inertia.Ixx : 0,
      y: inertia.Iyy > 0 ? netTorque.y / inertia.Iyy : 0,
      z: inertia.Izz > 0 ? netTorque.z / inertia.Izz : 0,
    };

    const forceThreshold = 1e-6;
    const isEquilibrium =
      Math.abs(netForce.x) < forceThreshold &&
      Math.abs(netForce.y) < forceThreshold &&
      Math.abs(netForce.z) < forceThreshold &&
      Math.abs(netTorque.x) < forceThreshold &&
      Math.abs(netTorque.y) < forceThreshold &&
      Math.abs(netTorque.z) < forceThreshold;

    return { netForce, netTorque, acceleration, angularAcceleration, isEquilibrium };
  }

  /**
   * 1D impact between two rigid bodies (coefficient of restitution model).
   */
  impact(
    massA: number, velocityA: Vec3,
    massB: number, velocityB: Vec3,
    cor: number,  // Coefficient of restitution (0=perfectly plastic, 1=perfectly elastic)
    normal: Vec3  // Impact direction (unit vector)
  ): ImpactResult {
    // Project velocities onto normal
    const vA = velocityA.x * normal.x + velocityA.y * normal.y + velocityA.z * normal.z;
    const vB = velocityB.x * normal.x + velocityB.y * normal.y + velocityB.z * normal.z;

    // Conservation of momentum + COR
    const impulse = (1 + cor) * (vA - vB) * massA * massB / (massA + massB);

    const vANew = vA - impulse / massA;
    const vBNew = vB + impulse / massB;

    // Reconstruct 3D velocities (tangential unchanged)
    const velAfterA: Vec3 = {
      x: velocityA.x + (vANew - vA) * normal.x,
      y: velocityA.y + (vANew - vA) * normal.y,
      z: velocityA.z + (vANew - vA) * normal.z,
    };
    const velAfterB: Vec3 = {
      x: velocityB.x + (vBNew - vB) * normal.x,
      y: velocityB.y + (vBNew - vB) * normal.y,
      z: velocityB.z + (vBNew - vB) * normal.z,
    };

    const keBefore = 0.5 * massA * (vA ** 2) + 0.5 * massB * (vB ** 2);
    const keAfter = 0.5 * massA * (vANew ** 2) + 0.5 * massB * (vBNew ** 2);

    return {
      velocityAfterA: velAfterA,
      velocityAfterB: velAfterB,
      impulse: Math.abs(impulse),
      energyLoss: keBefore - keAfter,
      coefficientOfRestitution: cor,
    };
  }

  /**
   * Kinetic energy of a rigid body.
   */
  kineticEnergy(
    mass: number, velocity: Vec3,
    inertia: InertiaResult, angularVelocity: Vec3
  ): { translational: number; rotational: number; total: number } {
    const trans = 0.5 * mass * (velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const rot = 0.5 * (
      inertia.Ixx * angularVelocity.x ** 2 +
      inertia.Iyy * angularVelocity.y ** 2 +
      inertia.Izz * angularVelocity.z ** 2
    );
    return { translational: trans, rotational: rot, total: trans + rot };
  }
}

export const rigidBodyDynamicsEngine = new RigidBodyDynamicsEngineImpl();
