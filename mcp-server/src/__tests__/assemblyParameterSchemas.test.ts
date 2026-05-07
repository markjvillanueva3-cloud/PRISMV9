/**
 * Assembly Parameter Schemas Tests
 *
 * Validates all assembly constraint schemas for proper parsing and validation.
 */

import { describe, it, expect } from "vitest";
import {
  CoincidentMateSchema,
  ConcentricMateSchema,
  DistanceMateSchema,
  AngleMateSchema,
  TangentMateSchema,
  GearMateSchema,
  CamMateSchema,
  RackPinionMateSchema,
  ScrewMateSchema,
  RevoluteJointSchema,
  SliderJointSchema,
  CylindricalJointSchema,
  BallJointSchema,
  MotionStudySchema,
  AssemblyDefinitionSchema,
  StandardMateSchema,
  MechanicalMateSchema,
  JointSchema,
  DOFAnalysisSchema,
} from "../schemas/assemblyParameterSchemas.js";

describe("AssemblyParameterSchemas", () => {
  // ── Standard Mates ──────────────────────────────────────────────────────────

  describe("CoincidentMate", () => {
    it("parses valid coincident mate with defaults", () => {
      const input = {
        type: "coincident",
        face1: { componentId: "comp-1", faceSelector: ">Z" },
        face2: { componentId: "comp-2", faceSelector: "<Z" },
      };
      const result = CoincidentMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alignment).toBe("aligned");
        expect(result.data.offset).toBe(0);
      }
    });

    it("parses anti-aligned with offset", () => {
      const input = {
        type: "coincident",
        face1: { componentId: "comp-1", faceSelector: ">Z", faceType: "planar" },
        face2: { componentId: "comp-2", faceSelector: "<Z", faceType: "planar" },
        alignment: "anti_aligned",
        offset: 2.5,
      };
      const result = CoincidentMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alignment).toBe("anti_aligned");
        expect(result.data.offset).toBe(2.5);
      }
    });
  });

  describe("ConcentricMate", () => {
    it("parses valid concentric mate", () => {
      const input = {
        type: "concentric",
        cylinder1: { componentId: "shaft", faceSelector: "cylindrical" },
        cylinder2: { componentId: "bearing", faceSelector: "cylindrical" },
        lockRotation: true,
      };
      const result = ConcentricMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lockRotation).toBe(true);
      }
    });
  });

  describe("DistanceMate", () => {
    it("parses negative distance", () => {
      const input = {
        type: "distance",
        entity1: { componentId: "plate1", faceSelector: ">Z" },
        entity2: { componentId: "plate2", faceSelector: "<Z" },
        distance: -10.5,
        flipDirection: true,
      };
      const result = DistanceMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.distance).toBe(-10.5);
        expect(result.data.distanceType).toBe("minimum");
      }
    });
  });

  describe("AngleMate", () => {
    it("validates angle range 0-360", () => {
      const valid = {
        type: "angle",
        plane1: { componentId: "link1", faceSelector: ">Y" },
        plane2: { componentId: "link2", faceSelector: ">Y" },
        angle: 45,
        solution: "angle",
      };
      expect(AngleMateSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        type: "angle",
        plane1: { componentId: "link1", faceSelector: ">Y" },
        plane2: { componentId: "link2", faceSelector: ">Y" },
        angle: 400,
      };
      expect(AngleMateSchema.safeParse(invalid).success).toBe(false);
    });

    it("supports supplement and reflex solutions", () => {
      const input = {
        type: "angle",
        plane1: { componentId: "a", faceSelector: ">X" },
        plane2: { componentId: "b", faceSelector: ">X" },
        angle: 30,
        solution: "supplement",
      };
      const result = AngleMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.solution).toBe("supplement");
      }
    });
  });

  describe("TangentMate", () => {
    it("parses with solution index", () => {
      const input = {
        type: "tangent",
        face1: { componentId: "cam", faceSelector: "profile" },
        face2: { componentId: "follower", faceSelector: "tip" },
        solution: 2,
        inside: true,
      };
      const result = TangentMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.solution).toBe(2);
        expect(result.data.inside).toBe(true);
      }
    });
  });

  // ── Mechanical Mates ────────────────────────────────────────────────────────

  describe("GearMate", () => {
    it("parses gear mate with ratio and teeth", () => {
      const input = {
        type: "gear",
        gear1: { componentId: "pinion", faceSelector: "cylindrical" },
        gear2: { componentId: "wheel", faceSelector: "cylindrical" },
        ratio: 3.5,
        reverse: true,
        teeth1: 14,
        teeth2: 49,
        module: 2.0,
        pressureAngle: 20,
      };
      const result = GearMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ratio).toBe(3.5);
        expect(result.data.teeth1).toBe(14);
        expect(result.data.module).toBe(2.0);
      }
    });

    it("rejects non-positive ratio", () => {
      const input = {
        type: "gear",
        gear1: { componentId: "g1", faceSelector: "cyl" },
        gear2: { componentId: "g2", faceSelector: "cyl" },
        ratio: 0,
      };
      expect(GearMateSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("CamMate", () => {
    it("parses cam-follower relationship", () => {
      const input = {
        type: "cam",
        camFace: { componentId: "eccentric", faceSelector: "profile" },
        follower: { componentId: "rocker", edgeSelector: "contact_edge" },
        camTangent: true,
      };
      const result = CamMateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("RackPinionMate", () => {
    it("parses rack-pinion with pitch diameter", () => {
      const input = {
        type: "rack_pinion",
        rack: { componentId: "rack", edgeSelector: "teeth_line" },
        pinion: { componentId: "pinion", faceSelector: "pitch_cylinder" },
        pitchDiameter: 25.4,
        rackPitch: 3.14159,
      };
      const result = RackPinionMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pitchDiameter).toBe(25.4);
      }
    });
  });

  describe("ScrewMate", () => {
    it("parses helical motion parameters", () => {
      const input = {
        type: "screw",
        axis1: { componentId: "bolt", faceSelector: "thread_cyl" },
        axis2: { componentId: "nut", faceSelector: "thread_cyl" },
        pitch: 1.5,
        reverse: false,
        startAngle: 90,
      };
      const result = ScrewMateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pitch).toBe(1.5);
        expect(result.data.startAngle).toBe(90);
      }
    });
  });

  // ── Joints ──────────────────────────────────────────────────────────────────

  describe("RevoluteJoint", () => {
    it("parses joint with limits and physics", () => {
      const input = {
        type: "revolute",
        origin1: {
          componentId: "base",
          position: { x: 0, y: 0, z: 100 },
          zAxis: { x: 0, y: 0, z: 1 },
        },
        origin2: {
          componentId: "arm",
          position: { x: 0, y: 0, z: 0 },
          zAxis: { x: 0, y: 0, z: 1 },
        },
        axis: "Z",
        limits: { min: -90, max: 90, restPosition: 0 },
        friction: 0.1,
        damping: 0.5,
      };
      const result = RevoluteJointSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limits?.min).toBe(-90);
        expect(result.data.friction).toBe(0.1);
      }
    });
  });

  describe("SliderJoint", () => {
    it("parses linear joint with limits", () => {
      const input = {
        type: "slider",
        origin1: {
          componentId: "rail",
          position: { x: 0, y: 0, z: 0 },
          zAxis: { x: 1, y: 0, z: 0 },
        },
        origin2: {
          componentId: "carriage",
          position: { x: 50, y: 0, z: 0 },
          zAxis: { x: 1, y: 0, z: 0 },
        },
        axis: "X",
        limits: { min: 0, max: 500, restPosition: 250 },
      };
      const result = SliderJointSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limits?.max).toBe(500);
      }
    });
  });

  describe("CylindricalJoint", () => {
    it("parses combined rotation + slide joint", () => {
      const input = {
        type: "cylindrical",
        origin1: {
          componentId: "cylinder",
          position: { x: 0, y: 0, z: 0 },
          zAxis: { x: 0, y: 0, z: 1 },
        },
        origin2: {
          componentId: "piston",
          position: { x: 0, y: 0, z: 50 },
          zAxis: { x: 0, y: 0, z: 1 },
        },
        rotationLimits: { min: -180, max: 180, restPosition: 0 },
        slideLimits: { min: 0, max: 100, restPosition: 50 },
      };
      const result = CylindricalJointSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("BallJoint", () => {
    it("parses spherical joint with cone limit", () => {
      const input = {
        type: "ball",
        origin1: {
          componentId: "socket",
          position: { x: 0, y: 0, z: 0 },
          zAxis: { x: 0, y: 0, z: 1 },
        },
        origin2: {
          componentId: "ball_head",
          position: { x: 0, y: 0, z: 0 },
          zAxis: { x: 0, y: 0, z: 1 },
        },
        coneAngle: 45,
        twistLimits: { min: -30, max: 30 },
      };
      const result = BallJointSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coneAngle).toBe(45);
      }
    });
  });

  // ── Motion Study ────────────────────────────────────────────────────────────

  describe("MotionStudy", () => {
    it("parses complete motion study definition", () => {
      const input = {
        name: "Crank-Slider Animation",
        duration: 2.0,
        fps: 60,
        gravity: { x: 0, y: 0, z: -9810 },
        drivers: [
          {
            mateId: "revolute-1",
            parameter: "velocity",
            function: {
              type: "constant",
              value: 360,
            },
          },
        ],
        contacts: [
          {
            component1: "piston",
            component2: "cylinder_wall",
            restitution: 0.3,
            friction: 0.2,
          },
        ],
        outputRequests: ["position", "velocity", "force"],
      };
      const result = MotionStudySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fps).toBe(60);
        expect(result.data.drivers.length).toBe(1);
      }
    });

    it("supports oscillating motion function", () => {
      const input = {
        name: "Vibration Test",
        duration: 5.0,
        fps: 30,
        drivers: [
          {
            mateId: "slider-x",
            parameter: "position",
            function: {
              type: "oscillate",
              amplitude: 10,
              frequency: 5,
              phase: 0,
            },
          },
        ],
      };
      const result = MotionStudySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  // ── Assembly Definition ─────────────────────────────────────────────────────

  describe("AssemblyDefinition", () => {
    it("parses complete assembly with mixed constraints", () => {
      const input = {
        id: "asm-001",
        name: "Gearbox Assembly",
        description: "2-stage reduction gearbox",
        components: [
          { id: "housing", name: "Housing", grounded: true },
          { id: "input-shaft", name: "Input Shaft", quantity: 1 },
          { id: "output-shaft", name: "Output Shaft", quantity: 1 },
          { id: "gear-1", name: "Pinion Gear", quantity: 1 },
          { id: "gear-2", name: "Idler Gear", quantity: 1 },
        ],
        constraints: [
          {
            id: "c1",
            constraint: {
              type: "concentric",
              cylinder1: { componentId: "input-shaft", faceSelector: "bearing_journal" },
              cylinder2: { componentId: "housing", faceSelector: "bearing_bore" },
              lockRotation: false,
            },
          },
          {
            id: "c2",
            constraint: {
              type: "gear",
              gear1: { componentId: "gear-1", faceSelector: "pitch" },
              gear2: { componentId: "gear-2", faceSelector: "pitch" },
              ratio: 2.5,
              reverse: true,
            },
          },
        ],
        metadata: {
          author: "Engineer",
          cadSystem: "solidworks",
          version: "1.0",
        },
      };
      const result = AssemblyDefinitionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.components.length).toBe(5);
        expect(result.data.constraints.length).toBe(2);
      }
    });
  });

  // ── Discriminated Unions ────────────────────────────────────────────────────

  describe("Discriminated Unions", () => {
    it("StandardMateSchema discriminates by type", () => {
      const coincident = { type: "coincident", face1: { componentId: "a", faceSelector: "f" }, face2: { componentId: "b", faceSelector: "f" } };
      const distance = { type: "distance", entity1: { componentId: "a", faceSelector: "f" }, entity2: { componentId: "b", faceSelector: "f" }, distance: 10 };

      expect(StandardMateSchema.safeParse(coincident).success).toBe(true);
      expect(StandardMateSchema.safeParse(distance).success).toBe(true);
    });

    it("MechanicalMateSchema discriminates by type", () => {
      const gear = { type: "gear", gear1: { componentId: "a", faceSelector: "f" }, gear2: { componentId: "b", faceSelector: "f" }, ratio: 2 };
      expect(MechanicalMateSchema.safeParse(gear).success).toBe(true);
    });

    it("JointSchema discriminates by type", () => {
      const revolute = {
        type: "revolute",
        origin1: { componentId: "a", position: { x: 0, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } },
        origin2: { componentId: "b", position: { x: 0, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } },
      };
      expect(JointSchema.safeParse(revolute).success).toBe(true);
    });
  });

  // ── DOF Analysis ────────────────────────────────────────────────────────────

  describe("DOFAnalysis", () => {
    it("parses DOF analysis result", () => {
      const input = {
        totalDOF: 1,
        componentDOF: {
          "input-shaft": {
            translationX: false,
            translationY: false,
            translationZ: false,
            rotationX: false,
            rotationY: false,
            rotationZ: true,
            totalDOF: 1,
          },
        },
        overConstrained: false,
        underConstrained: false,
        redundantConstraints: [],
      };
      const result = DOFAnalysisSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalDOF).toBe(1);
      }
    });
  });
});
