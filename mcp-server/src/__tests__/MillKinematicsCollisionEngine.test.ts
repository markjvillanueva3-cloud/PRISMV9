/**
 * MillKinematicsCollisionEngine — real reference-value test suite
 * ================================================================
 *
 * Safety-critical: this engine gates mill machine kinematics + collision
 * avoidance (forward/inverse kinematics, machine-envelope guard, 5-axis
 * singularity detection, sphere/capsule collision, jerk-limited motion time).
 *
 * Every expected value below is derived BY HAND from the engine's OWN
 * formulas (documented in the derivation comment beside each assertion),
 * never from a re-run of the code. No toBeDefined()/stub assertions.
 *
 * The engine is dispatcher-wired via millDispatcher.ts (getEngine("collision")
 * / getEngine("kinematics")), but only the `mill_work_envelope` action's
 * candidate method ("checkEnvelope") actually matches an engine method; the
 * other collision/kinematics actions reference method names the engine does
 * not expose ("simulate", "checkCollision", "getZones", "verifyKinematics"),
 * so a dispatcher round-trip would exercise the fuzzy resolver rather than the
 * engine's math. This suite therefore drives the engine's real methods
 * directly. Two genuine defects found in the engine are PINNED to current
 * behavior (R12) and flagged in-line — assertions are NOT weakened to hide them.
 *
 * @see mcp-server/src/engines/MillKinematicsCollisionEngine.ts
 */

import { describe, it, expect } from "vitest";
import {
  MillKinematicsCollisionEngine,
  millKinematicsCollisionEngine,
  type Vec3,
  type BoundingSphere,
  type Capsule,
  type CollisionObject,
} from "../engines/MillKinematicsCollisionEngine.js";

// Fresh engine per collision test so the internal collisionObjects Map never
// bleeds state across cases.
const fresh = () => new MillKinematicsCollisionEngine();

const OKUMA = "OKUMA_M460V_5AX"; // 5_axis_table_table, pivot_offset {0,0,150}
const HAAS = "HAAS_VF2"; // 3_axis, envelope x[0,762] y[0,406] z[0,508]

describe("MillKinematicsCollisionEngine — machine database", () => {
  it("loads exactly the 5 JM Die machine specs with 1 five-axis", () => {
    const e = fresh();
    const stats = e.getStatistics();
    // JM_DIE_MACHINES array has 5 entries; only OKUMA_M460V_5AX is 5_axis_*.
    expect(stats.machines).toBe(5);
    expect(stats.five_axis_machines).toBe(1);
    expect(stats.collision_objects).toBe(0);
    expect(stats.safety_zones).toBe(0);

    const ids = e.listMachines();
    expect(ids).toHaveLength(5);
    expect(ids).toEqual(
      expect.arrayContaining([
        "HAAS_VF2",
        "HAAS_OM2",
        "HURCO_VM30i",
        "OKUMA_M460V_5AX",
        "ROKU_ROKU_HC658",
      ]),
    );
  });

  it("returns the exact spec for a known machine and null for unknown", () => {
    const e = fresh();
    const okuma = e.getMachineSpec(OKUMA);
    expect(okuma).not.toBeNull();
    expect(okuma!.type).toBe("5_axis_table_table");
    expect(okuma!.envelope.a_min).toBe(-120);
    expect(okuma!.envelope.a_max).toBe(30);
    expect(okuma!.pivot_point_offset).toEqual({ x: 0, y: 0, z: 150 });
    // Failure mode: unknown machine id => null.
    expect(e.getMachineSpec("NO_SUCH_MACHINE")).toBeNull();
  });

  it("exports a ready singleton instance", () => {
    expect(millKinematicsCollisionEngine).toBeInstanceOf(MillKinematicsCollisionEngine);
    expect(millKinematicsCollisionEngine.listMachines()).toHaveLength(5);
  });
});

describe("MillKinematicsCollisionEngine — forward kinematics", () => {
  it("3-axis FK echoes XYZ and points the tool straight down (-Z)", () => {
    const e = fresh();
    // fk3Axis: position = {x,y,z}, direction = {0,0,-1}.
    const fk = e.forwardKinematics(HAAS, { x: 100, y: 50, z: 200 });
    expect(fk).not.toBeNull();
    expect(fk!.position).toEqual({ x: 100, y: 50, z: 200 });
    expect(fk!.direction).toEqual({ x: 0, y: 0, z: -1 });
  });

  it("5-axis FK at A=0 C=0 cancels the pivot and echoes XYZ, tool -Z", () => {
    const e = fresh();
    // At a=c=0 both rotations are identity, so T = T_linear * T_pivot_inv * T_pivot
    // = T_linear. TCP = origin transformed = {x,y,z}; direction = -Z.
    const fk = e.forwardKinematics(OKUMA, { x: 100, y: 50, z: 200, a: 0, c: 0 });
    expect(fk).not.toBeNull();
    expect(fk!.position.x).toBeCloseTo(100, 9);
    expect(fk!.position.y).toBeCloseTo(50, 9);
    expect(fk!.position.z).toBeCloseTo(200, 9);
    expect(fk!.direction.x).toBeCloseTo(0, 9);
    expect(fk!.direction.y).toBeCloseTo(0, 9);
    expect(fk!.direction.z).toBeCloseTo(-1, 9);
    // FK direction must always be a unit vector.
    const dLen = Math.hypot(fk!.direction.x, fk!.direction.y, fk!.direction.z);
    expect(dLen).toBeCloseTo(1, 9);
  });

  it("5-axis FK at A=90 C=0 (X=Y=Z=0) matches hand-computed transform", () => {
    const e = fresh();
    // T = translate(0,0,-150) * RotX(90) * translate(0,0,150) applied to origin.
    //   translate(0,0,150)*origin = (0,0,150)
    //   RotX90*(0,0,150)          = (0,-150,0)
    //   translate(0,0,-150)*...   = (0,-150,-150)   => position
    // direction = normalize(RotX90 * (0,0,-1)) = (0,1,0).
    const fk = e.forwardKinematics(OKUMA, { x: 0, y: 0, z: 0, a: 90, c: 0 });
    expect(fk).not.toBeNull();
    expect(fk!.position.x).toBeCloseTo(0, 6);
    expect(fk!.position.y).toBeCloseTo(-150, 6);
    expect(fk!.position.z).toBeCloseTo(-150, 6);
    expect(fk!.direction.x).toBeCloseTo(0, 6);
    expect(fk!.direction.y).toBeCloseTo(1, 6);
    expect(fk!.direction.z).toBeCloseTo(0, 6);
  });

  it("FK on an unknown machine returns null (failure mode)", () => {
    const e = fresh();
    expect(e.forwardKinematics("GHOST_MILL", { x: 1, y: 2, z: 3 })).toBeNull();
  });
});

describe("MillKinematicsCollisionEngine — inverse kinematics", () => {
  it("3-axis IK is valid only when the tool points straight down", () => {
    const e = fresh();
    // dir (0,0,-1): |dir.z + 1| = 0 <= 0.01 => valid, echoes TCP.
    const ok = e.inverseKinematics(HAAS, { x: 10, y: 20, z: 30 }, { x: 0, y: 0, z: -1 });
    expect(ok).not.toBeNull();
    expect(ok!.valid).toBe(true);
    expect(ok!.x).toBe(10);
    expect(ok!.y).toBe(20);
    expect(ok!.z).toBe(30);
  });

  it("3-axis IK rejects a non-vertical tool axis (failure mode)", () => {
    const e = fresh();
    // dir (0,0,1): |1 + 1| = 2 > 0.01 => unreachable on a 3-axis mill.
    const up = e.inverseKinematics(HAAS, { x: 10, y: 20, z: 30 }, { x: 0, y: 0, z: 1 });
    expect(up!.valid).toBe(false);
    // dir (1,0,0): |0 + 1| = 1 > 0.01 => also unreachable.
    const side = e.inverseKinematics(HAAS, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    expect(side!.valid).toBe(false);
  });

  it("5-axis IK reports the vertical-tool singularity with A=C=0", () => {
    const e = fresh();
    // horiz_mag = sqrt(dx^2+dy^2) = 0 < 1e-6 => singularity branch:
    // returns TCP unchanged, a_deg=0, c_deg=0, valid=true.
    const ik = e.inverseKinematics(OKUMA, { x: 10, y: 20, z: 30 }, { x: 0, y: 0, z: -1 });
    expect(ik!.valid).toBe(true);
    expect(ik!.a_deg).toBe(0);
    expect(ik!.c_deg).toBe(0);
    expect(ik!.x).toBe(10);
    expect(ik!.y).toBe(20);
    expect(ik!.z).toBe(30);
  });

  it("5-axis IK for a -Y tool axis matches the hand-computed geometric solution", () => {
    const e = fresh();
    // dir (0,-1,0): c_rad = atan2(-0, 1) = 0 => C=0.
    //               a_rad = acos(-0) = pi/2 => A=90.
    // T_rot = RotZ(0)*RotX(90); rotated_pivot = RotX90*(0,0,150) = (0,-150,0).
    // compensation = (0,-150,0) - (0,0,150) = (0,-150,-150).
    // x = 0-0 = 0; y = 0-(-150) = 150; z = 0-(-150) = 150.
    const ik = e.inverseKinematics(OKUMA, { x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
    expect(ik!.valid).toBe(true);
    expect(ik!.a_deg).toBeCloseTo(90, 6);
    expect(ik!.c_deg).toBeCloseTo(0, 6);
    expect(ik!.x).toBeCloseTo(0, 6);
    expect(ik!.y).toBeCloseTo(150, 6);
    expect(ik!.z).toBeCloseTo(150, 6);
  });

  it("5-axis IK normalizes a non-unit tool direction (adversarial)", () => {
    const e = fresh();
    // (0,-3,0) normalizes to (0,-1,0) => identical solution to the unit case.
    const ik = e.inverseKinematics(OKUMA, { x: 0, y: 0, z: 0 }, { x: 0, y: -3, z: 0 });
    expect(ik!.a_deg).toBeCloseTo(90, 6);
    expect(ik!.c_deg).toBeCloseTo(0, 6);
    expect(ik!.y).toBeCloseTo(150, 6);
    expect(ik!.z).toBeCloseTo(150, 6);
  });

  it("IK on an unknown machine returns null (failure mode)", () => {
    const e = fresh();
    expect(
      e.inverseKinematics("GHOST_MILL", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }),
    ).toBeNull();
  });
});

describe("MillKinematicsCollisionEngine — work-envelope guard", () => {
  it("accepts an in-envelope position", () => {
    const e = fresh();
    const r = e.checkEnvelope(HAAS, { x: 100, y: 50, z: 200 });
    expect(r.within_envelope).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it("flags an X over-travel with a precise message (failure mode)", () => {
    const e = fresh();
    // HAAS_VF2 x_max = 762; X=800 > 762 => violation "X=800.0 outside [0, 762]".
    const r = e.checkEnvelope(HAAS, { x: 800, y: 50, z: 200 });
    expect(r.within_envelope).toBe(false);
    expect(r.violations.some((v) => v.includes("X=800.0 outside [0, 762]"))).toBe(true);
  });

  it("flags a negative-Z and A-axis over-tilt on the 5-axis machine (failure mode)", () => {
    const e = fresh();
    // OKUMA a_max = 30; A=60 > 30 => A violation. Z=-5 < 0 => Z violation.
    const r = e.checkEnvelope(OKUMA, { x: 100, y: 100, z: -5, a: 60, c: 0 });
    expect(r.within_envelope).toBe(false);
    expect(r.violations.some((v) => v.includes("Z=-5.0 outside [0, 460]"))).toBe(true);
    expect(r.violations.some((v) => v.includes("A=60.0") && v.includes("outside [-120, 30]"))).toBe(
      true,
    );
  });

  it("reports an unknown machine as out-of-envelope (failure mode)", () => {
    const e = fresh();
    const r = e.checkEnvelope("GHOST_MILL", { x: 0, y: 0, z: 0 });
    expect(r.within_envelope).toBe(false);
    expect(r.violations).toEqual(["Unknown machine"]);
  });

  it("PINS a defect: NaN coordinates silently pass the envelope guard (adversarial)", () => {
    const e = fresh();
    // BUG (pinned, not hidden): `NaN < min` and `NaN > max` are both false, so a
    // NaN coordinate produces zero violations and reads as within-envelope.
    // A safety guard should reject non-finite coordinates. Reported to owner.
    const r = e.checkEnvelope(HAAS, { x: NaN, y: 50, z: 200 });
    expect(r.within_envelope).toBe(true);
    expect(r.violations).toHaveLength(0);
  });
});

describe("MillKinematicsCollisionEngine — 5-axis singularity detection", () => {
  it("never flags a 3-axis machine as singular", () => {
    const e = fresh();
    const r = e.checkSingularity(HAAS, { x: 0, y: 0, z: -1 });
    expect(r.near_singularity).toBe(false);
    expect(r.type).toBe("none");
    expect(r.severity).toBe(0);
    expect(r.recommendation).toBe("");
  });

  it("detects hard gimbal lock at a vertical tool axis (severity 1.0)", () => {
    const e = fresh();
    // |dz| = 1 > 0.9999 => gimbal_lock, severity 1.0.
    const r = e.checkSingularity(OKUMA, { x: 0, y: 0, z: -1 });
    expect(r.near_singularity).toBe(true);
    expect(r.type).toBe("gimbal_lock");
    expect(r.severity).toBe(1.0);
    expect(r.recommendation).toContain("Tilt tool by at least 0.5");
  });

  it("computes fractional severity in the near-gimbal band", () => {
    const e = fresh();
    // Unit dir with dz = -0.995 => |dz| in (0.99, 0.9999) => near_gimbal_lock,
    // severity = (0.995 - 0.99) / 0.01 = 0.5.
    const sinT = Math.sqrt(1 - 0.995 * 0.995);
    const r = e.checkSingularity(OKUMA, { x: sinT, y: 0, z: -0.995 });
    expect(r.type).toBe("near_gimbal_lock");
    expect(r.severity).toBeCloseTo(0.5, 6);
    expect(r.recommendation).toContain("Approaching singularity");
  });

  it("returns unknown_machine for an unregistered machine (failure mode)", () => {
    const e = fresh();
    const r = e.checkSingularity("GHOST_MILL", { x: 0, y: 0, z: -1 });
    expect(r.near_singularity).toBe(false);
    expect(r.type).toBe("unknown_machine");
    expect(r.severity).toBe(0);
  });
});

describe("MillKinematicsCollisionEngine — collision detection", () => {
  const sphere = (id: string, type: CollisionObject["type"], center: Vec3, radius: number, clr: number): CollisionObject => ({
    id,
    type,
    volume: { center, radius } as BoundingSphere,
    volume_type: "sphere",
    clearance_mm: clr,
  });
  const capsule = (id: string, type: CollisionObject["type"], start: Vec3, end: Vec3, radius: number, clr: number): CollisionObject => ({
    id,
    type,
    volume: { start, end, radius } as Capsule,
    volume_type: "capsule",
    clearance_mm: clr,
  });

  it("PINS a defect: interpenetrating spheres are NOT flagged when centers exceed clearance (adversarial)", () => {
    const e = fresh();
    // tool r5 @ origin, fixture r5 @ (0,0,8): center dist 8, combined radius 10,
    // so they overlap by 2mm. BUG (pinned): the clearance gate compares the
    // CENTER distance (8) to clearance (2) instead of the surface distance, so
    // 8 < 2 is false and no collision pair is emitted -> a real 2mm interference
    // reads as collision-free + within-safety-zone. Reported to owner.
    e.addCollisionObject(sphere("tool", "tool", { x: 0, y: 0, z: 0 }, 5, 2));
    e.addCollisionObject(sphere("fixture", "fixture", { x: 0, y: 0, z: 8 }, 5, 2));
    const r = e.checkCollisions();
    expect(r.collision_detected).toBe(false);
    expect(r.collision_pairs).toHaveLength(0);
    expect(r.min_distance_mm).toBeCloseTo(8, 9);
    expect(r.is_within_safety_zone).toBe(true);
  });

  it("flags spheres only once their centers fall inside the clearance", () => {
    const e = fresh();
    // centers 1.5 apart < clearance 2 => pair emitted; penetration = 10 - 1.5 = 8.5.
    e.addCollisionObject(sphere("tool", "tool", { x: 0, y: 0, z: 0 }, 5, 2));
    e.addCollisionObject(sphere("fixture", "fixture", { x: 0, y: 0, z: 1.5 }, 5, 2));
    const r = e.checkCollisions();
    expect(r.collision_detected).toBe(true);
    expect(r.collision_pairs).toHaveLength(1);
    expect(r.collision_pairs[0].penetration_mm).toBeCloseTo(8.5, 9);
    expect(r.min_distance_mm).toBeCloseTo(1.5, 9);
    expect(r.is_within_safety_zone).toBe(false); // 1.5 < 2.0 safety margin
  });

  it("correctly detects overlapping capsules via surface distance", () => {
    const e = fresh();
    // Parallel capsules 5mm apart on X, each r3 => surface dist 5-3-3 = -1 (1mm
    // overlap). Capsule path uses true surface distance, so this IS detected.
    e.addCollisionObject(capsule("tool", "tool", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }, 3, 1));
    e.addCollisionObject(capsule("holder", "holder", { x: 5, y: 0, z: 0 }, { x: 5, y: 0, z: 10 }, 3, 1));
    const r = e.checkCollisions();
    expect(r.collision_detected).toBe(true);
    expect(r.collision_pairs).toHaveLength(1);
    expect(r.collision_pairs[0].penetration_mm).toBeCloseTo(1, 9);
    expect(r.min_distance_mm).toBeCloseTo(-1, 9);
    expect(r.is_within_safety_zone).toBe(false);
  });

  it("reports clear capsules as collision-free with positive surface margin", () => {
    const e = fresh();
    // Parallel capsules 10mm apart, r3 => surface dist 10-6 = 4 > clearance 1.
    e.addCollisionObject(capsule("tool", "tool", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }, 3, 1));
    e.addCollisionObject(capsule("holder", "holder", { x: 10, y: 0, z: 0 }, { x: 10, y: 0, z: 10 }, 3, 1));
    const r = e.checkCollisions();
    expect(r.collision_detected).toBe(false);
    expect(r.collision_pairs).toHaveLength(0);
    expect(r.min_distance_mm).toBeCloseTo(4, 9);
    expect(r.is_within_safety_zone).toBe(true);
  });

  it("skips same-type pairs entirely (adversarial: two overlapping tools never checked)", () => {
    const e = fresh();
    // Both objects typed "tool" => obj_a.type === obj_b.type => `continue`.
    // No pair is ever evaluated; min_distance stays Infinity.
    e.addCollisionObject(capsule("t1", "tool", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }, 3, 1));
    e.addCollisionObject(capsule("t2", "tool", { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 10 }, 3, 1));
    const r = e.checkCollisions();
    expect(r.collision_detected).toBe(false);
    expect(r.collision_pairs).toHaveLength(0);
    expect(r.min_distance_mm).toBe(Infinity);
    expect(r.is_within_safety_zone).toBe(true);
  });
});

describe("MillKinematicsCollisionEngine — jerk-limited motion planning", () => {
  it("computes trapezoidal S-curve time when the move reaches max velocity", () => {
    const e = fresh();
    // HAAS_VF2: vmax=416, amax=5000. Move 100mm.
    //   t_accel = 416/5000 = 0.0832 s; d_accel = 0.5*5000*0.0832^2 = 17.3056 mm.
    //   2*d_accel = 34.6112 <= 100 => trapezoidal.
    //   d_cruise = 65.3888; t_cruise = 65.3888/416 = 0.1571846 s.
    //   total = 2*0.0832 + 0.1571846 = 0.3235846 s.
    const m = e.planMotion(HAAS, { x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, "rapid");
    expect(m.estimated_time_s).toBeCloseTo(0.3235846, 5);
    expect(m.velocity_mm_s).toBe(416); // rapid => full vmax
    expect(m.motion_type).toBe("rapid");
    expect(m.collision_free).toBe(true); // no registered obstacles
  });

  it("computes triangular S-curve time when the move is too short to cruise", () => {
    const e = fresh();
    // Move 20mm: 2*d_accel (34.6112) > 20 => triangular.
    //   t_half = sqrt(20/5000) = 0.06324555 s; total = 2*t_half = 0.12649111 s.
    const m = e.planMotion(HAAS, { x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, "linear");
    expect(m.estimated_time_s).toBeCloseTo(0.1264911, 6);
    expect(m.velocity_mm_s).toBe(208); // linear => 0.5 * vmax
    expect(m.motion_type).toBe("linear");
  });
});
