/**
 * Assembly Parameter Schemas — Complete CAD Assembly Constraint Definitions
 *
 * Comprehensive Zod schemas for all assembly operations including:
 * - Standard mates (coincident, concentric, distance, angle, tangent)
 * - Mechanical mates (gear, cam, rack-pinion, screw, universal)
 * - Joints (revolute, slider, cylindrical, ball, planar, rigid)
 * - Motion study parameters
 *
 * References:
 * - SolidWorks Mates API
 * - Fusion 360 Joints API
 * - Inventor Constraints API
 * - CadQuery Assembly Constraints
 */

import { z } from "zod";

// ============================================================================
// REFERENCE TYPES
// ============================================================================

/** Face reference for constraint endpoints */
export const FaceReferenceSchema = z.object({
  componentId: z.string().describe("Component ID containing the face"),
  faceSelector: z.string().describe("Face selector (e.g., '>Z', '<X', 'cylindrical')"),
  faceType: z.enum(["planar", "cylindrical", "spherical", "conical", "toroidal", "freeform"])
    .optional().describe("Face geometry type for validation"),
});
export type FaceReference = z.infer<typeof FaceReferenceSchema>;

/** Edge reference for constraint endpoints */
export const EdgeReferenceSchema = z.object({
  componentId: z.string(),
  edgeSelector: z.string(),
  edgeType: z.enum(["linear", "circular", "elliptical", "spline"]).optional(),
});
export type EdgeReference = z.infer<typeof EdgeReferenceSchema>;

/** Vertex/point reference */
export const VertexReferenceSchema = z.object({
  componentId: z.string(),
  vertexSelector: z.string(),
});
export type VertexReference = z.infer<typeof VertexReferenceSchema>;

/** Joint origin reference (Fusion 360 / Inventor style) */
export const JointOriginSchema = z.object({
  componentId: z.string(),
  originName: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  zAxis: z.object({ x: z.number(), y: z.number(), z: z.number() })
    .describe("Primary axis direction"),
  xAxis: z.object({ x: z.number(), y: z.number(), z: z.number() })
    .optional().describe("Secondary axis for orientation"),
});
export type JointOrigin = z.infer<typeof JointOriginSchema>;

// ============================================================================
// STANDARD MATES
// ============================================================================

/** Coincident mate — faces touching, aligned or anti-aligned */
export const CoincidentMateSchema = z.object({
  type: z.literal("coincident"),
  face1: FaceReferenceSchema.describe("First planar face reference"),
  face2: FaceReferenceSchema.describe("Second planar face reference"),
  alignment: z.enum(["aligned", "anti_aligned"])
    .default("aligned")
    .describe("Face normal alignment: aligned = same direction, anti_aligned = opposing"),
  offset: z.number().default(0).describe("Distance offset from coincident [mm]"),
});
export type CoincidentMate = z.infer<typeof CoincidentMateSchema>;

/** Concentric mate — cylindrical faces share axis */
export const ConcentricMateSchema = z.object({
  type: z.literal("concentric"),
  cylinder1: FaceReferenceSchema.describe("First cylindrical face"),
  cylinder2: FaceReferenceSchema.describe("Second cylindrical face"),
  lockRotation: z.boolean().default(false)
    .describe("Lock relative rotation between cylinders"),
});
export type ConcentricMate = z.infer<typeof ConcentricMateSchema>;

/** Distance mate — fixed offset between entities */
export const DistanceMateSchema = z.object({
  type: z.literal("distance"),
  entity1: z.union([FaceReferenceSchema, EdgeReferenceSchema, VertexReferenceSchema]),
  entity2: z.union([FaceReferenceSchema, EdgeReferenceSchema, VertexReferenceSchema]),
  distance: z.number().describe("Signed distance value [mm], can be negative"),
  flipDirection: z.boolean().default(false).describe("Flip measurement direction"),
  distanceType: z.enum(["minimum", "maximum", "centroid"])
    .default("minimum")
    .describe("How distance is measured between complex geometry"),
});
export type DistanceMate = z.infer<typeof DistanceMateSchema>;

/** Angle mate — angular offset between planar faces */
export const AngleMateSchema = z.object({
  type: z.literal("angle"),
  plane1: FaceReferenceSchema.describe("First planar face"),
  plane2: FaceReferenceSchema.describe("Second planar face"),
  angle: z.number().min(0).max(360).describe("Angle value [degrees]"),
  solution: z.enum(["angle", "supplement", "reflex"])
    .default("angle")
    .describe("Which angular solution to use"),
  flipDirection: z.boolean().default(false),
});
export type AngleMate = z.infer<typeof AngleMateSchema>;

/** Tangent mate — surfaces tangent at contact */
export const TangentMateSchema = z.object({
  type: z.literal("tangent"),
  face1: FaceReferenceSchema.describe("First curved surface"),
  face2: FaceReferenceSchema.describe("Second curved surface"),
  solution: z.number().int().min(0).default(0)
    .describe("Solution index when multiple tangent configurations exist"),
  inside: z.boolean().default(false)
    .describe("True = inside tangent (concave), false = outside tangent"),
});
export type TangentMate = z.infer<typeof TangentMateSchema>;

/** Parallel mate — faces/edges parallel */
export const ParallelMateSchema = z.object({
  type: z.literal("parallel"),
  entity1: z.union([FaceReferenceSchema, EdgeReferenceSchema]),
  entity2: z.union([FaceReferenceSchema, EdgeReferenceSchema]),
  alignment: z.enum(["aligned", "anti_aligned"]).default("aligned"),
});
export type ParallelMate = z.infer<typeof ParallelMateSchema>;

/** Perpendicular mate — faces/edges at 90 degrees */
export const PerpendicularMateSchema = z.object({
  type: z.literal("perpendicular"),
  entity1: z.union([FaceReferenceSchema, EdgeReferenceSchema]),
  entity2: z.union([FaceReferenceSchema, EdgeReferenceSchema]),
});
export type PerpendicularMate = z.infer<typeof PerpendicularMateSchema>;

/** Lock mate — all DOF locked */
export const LockMateSchema = z.object({
  type: z.literal("lock"),
  component1: z.string(),
  component2: z.string(),
  rotationLocked: z.boolean().default(true),
  translationLocked: z.boolean().default(true),
});
export type LockMate = z.infer<typeof LockMateSchema>;

// ============================================================================
// MECHANICAL MATES
// ============================================================================

/** Gear mate — synchronized rotation by tooth ratio */
export const GearMateSchema = z.object({
  type: z.literal("gear"),
  gear1: FaceReferenceSchema.describe("First gear cylindrical face"),
  gear2: FaceReferenceSchema.describe("Second gear cylindrical face"),
  ratio: z.number().positive().describe("Gear ratio = teeth1/teeth2"),
  reverse: z.boolean().default(false)
    .describe("True = counter-rotation (external mesh), false = same direction (internal)"),
  teeth1: z.number().int().positive().optional().describe("Teeth count gear 1"),
  teeth2: z.number().int().positive().optional().describe("Teeth count gear 2"),
  module: z.number().positive().optional().describe("Gear module [mm]"),
  pressureAngle: z.number().default(20).describe("Pressure angle [degrees]"),
});
export type GearMate = z.infer<typeof GearMateSchema>;

/** Cam mate — follower traces cam profile */
export const CamMateSchema = z.object({
  type: z.literal("cam"),
  camFace: FaceReferenceSchema.describe("Cam profile surface"),
  follower: z.union([FaceReferenceSchema, EdgeReferenceSchema])
    .describe("Follower face or edge"),
  camTangent: z.boolean().default(true)
    .describe("Follower maintains tangent contact"),
});
export type CamMate = z.infer<typeof CamMateSchema>;

/** Rack and pinion mate — linear/rotary conversion */
export const RackPinionMateSchema = z.object({
  type: z.literal("rack_pinion"),
  rack: EdgeReferenceSchema.describe("Rack linear edge"),
  pinion: FaceReferenceSchema.describe("Pinion cylindrical face"),
  pitchDiameter: z.number().positive().describe("Pinion pitch diameter [mm]"),
  reverse: z.boolean().default(false),
  rackPitch: z.number().positive().optional().describe("Rack tooth pitch [mm]"),
});
export type RackPinionMate = z.infer<typeof RackPinionMateSchema>;

/** Screw mate — helical motion (rotation + translation) */
export const ScrewMateSchema = z.object({
  type: z.literal("screw"),
  axis1: z.union([FaceReferenceSchema, EdgeReferenceSchema])
    .describe("First component axis"),
  axis2: z.union([FaceReferenceSchema, EdgeReferenceSchema])
    .describe("Second component axis"),
  pitch: z.number().describe("Thread pitch [mm/revolution]"),
  reverse: z.boolean().default(false),
  startAngle: z.number().default(0).describe("Initial rotation [degrees]"),
});
export type ScrewMate = z.infer<typeof ScrewMateSchema>;

/** Universal joint mate — constant velocity joint */
export const UniversalJointMateSchema = z.object({
  type: z.literal("universal_joint"),
  shaft1: FaceReferenceSchema.describe("First shaft cylindrical face"),
  shaft2: FaceReferenceSchema.describe("Second shaft cylindrical face"),
  jointCenter: VertexReferenceSchema.describe("Joint center point"),
  bendAngle: z.number().min(0).max(45).default(0)
    .describe("Maximum bend angle [degrees]"),
});
export type UniversalJointMate = z.infer<typeof UniversalJointMateSchema>;

/** Slot mate — linear constraint within slot bounds */
export const SlotMateSchema = z.object({
  type: z.literal("slot"),
  slotFace: FaceReferenceSchema.describe("Slot face/profile"),
  pin: z.union([FaceReferenceSchema, VertexReferenceSchema])
    .describe("Pin/bolt to constrain in slot"),
  freeRotation: z.boolean().default(true)
    .describe("Allow pin rotation about slot axis"),
});
export type SlotMate = z.infer<typeof SlotMateSchema>;

/** Hinge mate — rotation about edge */
export const HingeMateSchema = z.object({
  type: z.literal("hinge"),
  hingeEdge1: EdgeReferenceSchema.describe("Hinge axis edge on component 1"),
  hingeEdge2: EdgeReferenceSchema.describe("Hinge axis edge on component 2"),
  limits: z.object({
    min: z.number().describe("Minimum angle [degrees]"),
    max: z.number().describe("Maximum angle [degrees]"),
  }).optional(),
  restAngle: z.number().default(0).describe("Default/rest angle [degrees]"),
});
export type HingeMate = z.infer<typeof HingeMateSchema>;

// ============================================================================
// JOINTS (Fusion 360 / Inventor Style)
// ============================================================================

/** Revolute joint — single rotational DOF */
export const RevoluteJointSchema = z.object({
  type: z.literal("revolute"),
  origin1: JointOriginSchema.describe("Joint origin on component 1"),
  origin2: JointOriginSchema.describe("Joint origin on component 2"),
  axis: z.enum(["X", "Y", "Z"]).default("Z")
    .describe("Rotation axis (Z-axis of origin)"),
  limits: z.object({
    min: z.number().describe("Minimum rotation [degrees]"),
    max: z.number().describe("Maximum rotation [degrees]"),
    restPosition: z.number().default(0).describe("Rest/default position [degrees]"),
  }).optional(),
  friction: z.number().min(0).max(1).default(0)
    .describe("Joint friction coefficient"),
  damping: z.number().min(0).default(0)
    .describe("Damping coefficient [N*m*s/rad]"),
});
export type RevoluteJoint = z.infer<typeof RevoluteJointSchema>;

/** Slider joint — single translational DOF */
export const SliderJointSchema = z.object({
  type: z.literal("slider"),
  origin1: JointOriginSchema,
  origin2: JointOriginSchema,
  axis: z.enum(["X", "Y", "Z"]).default("Z")
    .describe("Slide axis direction"),
  limits: z.object({
    min: z.number().describe("Minimum position [mm]"),
    max: z.number().describe("Maximum position [mm]"),
    restPosition: z.number().default(0).describe("Rest position [mm]"),
  }).optional(),
  friction: z.number().min(0).max(1).default(0),
});
export type SliderJoint = z.infer<typeof SliderJointSchema>;

/** Cylindrical joint — rotation + translation along same axis */
export const CylindricalJointSchema = z.object({
  type: z.literal("cylindrical"),
  origin1: JointOriginSchema,
  origin2: JointOriginSchema,
  axis: z.enum(["X", "Y", "Z"]).default("Z"),
  rotationLimits: z.object({
    min: z.number(),
    max: z.number(),
    restPosition: z.number().default(0),
  }).optional(),
  slideLimits: z.object({
    min: z.number(),
    max: z.number(),
    restPosition: z.number().default(0),
  }).optional(),
});
export type CylindricalJoint = z.infer<typeof CylindricalJointSchema>;

/** Ball joint — 3 rotational DOF */
export const BallJointSchema = z.object({
  type: z.literal("ball"),
  origin1: JointOriginSchema,
  origin2: JointOriginSchema,
  coneAngle: z.number().min(0).max(180).optional()
    .describe("Maximum cone angle for motion limit [degrees]"),
  twistLimits: z.object({
    min: z.number(),
    max: z.number(),
  }).optional().describe("Twist rotation limits about Z-axis [degrees]"),
});
export type BallJoint = z.infer<typeof BallJointSchema>;

/** Planar joint — 2 translations + 1 rotation (on plane) */
export const PlanarJointSchema = z.object({
  type: z.literal("planar"),
  origin1: JointOriginSchema,
  origin2: JointOriginSchema,
  normalAxis: z.enum(["X", "Y", "Z"]).default("Z")
    .describe("Plane normal direction"),
  slideXLimits: z.object({ min: z.number(), max: z.number() }).optional(),
  slideYLimits: z.object({ min: z.number(), max: z.number() }).optional(),
  rotationLimits: z.object({ min: z.number(), max: z.number() }).optional(),
});
export type PlanarJoint = z.infer<typeof PlanarJointSchema>;

/** Rigid joint — 0 DOF, components locked together */
export const RigidJointSchema = z.object({
  type: z.literal("rigid"),
  origin1: JointOriginSchema,
  origin2: JointOriginSchema,
});
export type RigidJoint = z.infer<typeof RigidJointSchema>;

/** Pin-slot joint — rotation + single translation */
export const PinSlotJointSchema = z.object({
  type: z.literal("pin_slot"),
  origin1: JointOriginSchema,
  origin2: JointOriginSchema,
  slideAxis: z.enum(["X", "Y", "Z"]).default("X"),
  rotationAxis: z.enum(["X", "Y", "Z"]).default("Z"),
  slideLimits: z.object({ min: z.number(), max: z.number() }).optional(),
  rotationLimits: z.object({ min: z.number(), max: z.number() }).optional(),
});
export type PinSlotJoint = z.infer<typeof PinSlotJointSchema>;

// ============================================================================
// MOTION STUDY PARAMETERS
// ============================================================================

/** Motion driver function types */
export const MotionFunctionSchema = z.object({
  type: z.enum(["constant", "oscillate", "expression", "data_points", "motor"]),
  value: z.number().optional().describe("Constant velocity/position value"),
  amplitude: z.number().optional().describe("Oscillation amplitude"),
  frequency: z.number().optional().describe("Oscillation frequency [Hz]"),
  phase: z.number().default(0).describe("Phase offset [degrees]"),
  expression: z.string().optional().describe("Mathematical expression (e.g., 'sin(t*2*PI)')"),
  dataPoints: z.array(z.object({
    time: z.number(),
    value: z.number(),
  })).optional().describe("Time-value pairs for interpolation"),
  motorTorque: z.number().optional().describe("Motor torque [N*m]"),
  motorSpeed: z.number().optional().describe("Motor speed [RPM]"),
});
export type MotionFunction = z.infer<typeof MotionFunctionSchema>;

/** Motion study configuration */
export const MotionStudySchema = z.object({
  name: z.string(),
  duration: z.number().positive().describe("Study duration [seconds]"),
  fps: z.number().int().min(1).max(120).default(30)
    .describe("Frames per second for animation"),
  timeStep: z.number().positive().optional()
    .describe("Simulation time step [seconds], defaults to 1/fps"),
  gravity: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(-9810), // mm/s^2
  }).optional().describe("Gravity vector [mm/s^2]"),
  drivers: z.array(z.object({
    mateId: z.string().describe("ID of mate/joint to drive"),
    parameter: z.enum(["position", "velocity", "acceleration", "force", "torque"]),
    function: MotionFunctionSchema,
  })),
  contacts: z.array(z.object({
    component1: z.string(),
    component2: z.string(),
    restitution: z.number().min(0).max(1).default(0.5),
    friction: z.number().min(0).max(1).default(0.3),
  })).optional().describe("Contact definitions for collision"),
  outputRequests: z.array(z.enum([
    "position", "velocity", "acceleration",
    "force", "torque", "energy", "trace_path",
  ])).default(["position"]),
});
export type MotionStudy = z.infer<typeof MotionStudySchema>;

// ============================================================================
// UNION TYPES
// ============================================================================

/** All standard mate types */
export const StandardMateSchema = z.discriminatedUnion("type", [
  CoincidentMateSchema,
  ConcentricMateSchema,
  DistanceMateSchema,
  AngleMateSchema,
  TangentMateSchema,
  ParallelMateSchema,
  PerpendicularMateSchema,
  LockMateSchema,
]);
export type StandardMate = z.infer<typeof StandardMateSchema>;

/** All mechanical mate types */
export const MechanicalMateSchema = z.discriminatedUnion("type", [
  GearMateSchema,
  CamMateSchema,
  RackPinionMateSchema,
  ScrewMateSchema,
  UniversalJointMateSchema,
  SlotMateSchema,
  HingeMateSchema,
]);
export type MechanicalMate = z.infer<typeof MechanicalMateSchema>;

/** All joint types */
export const JointSchema = z.discriminatedUnion("type", [
  RevoluteJointSchema,
  SliderJointSchema,
  CylindricalJointSchema,
  BallJointSchema,
  PlanarJointSchema,
  RigidJointSchema,
  PinSlotJointSchema,
]);
export type Joint = z.infer<typeof JointSchema>;

/** Any assembly constraint (mate, mechanical mate, or joint) */
export const AssemblyConstraintSchema = z.union([
  StandardMateSchema,
  MechanicalMateSchema,
  JointSchema,
]);
export type AssemblyConstraint = z.infer<typeof AssemblyConstraintSchema>;

// ============================================================================
// ASSEMBLY DEFINITION
// ============================================================================

/** Complete assembly definition with all constraints */
export const AssemblyDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  components: z.array(z.object({
    id: z.string(),
    name: z.string(),
    partFile: z.string().optional().describe("Path to part file"),
    quantity: z.number().int().positive().default(1),
    grounded: z.boolean().default(false).describe("Component is fixed in space"),
  })),
  constraints: z.array(z.object({
    id: z.string(),
    constraint: AssemblyConstraintSchema,
    suppressed: z.boolean().default(false),
  })),
  motionStudies: z.array(MotionStudySchema).optional(),
  metadata: z.object({
    author: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    version: z.string().optional(),
    cadSystem: z.enum([
      "solidworks", "fusion360", "inventor", "creo",
      "catia", "nx", "cadquery", "freecad", "onshape",
    ]).optional(),
  }).optional(),
});
export type AssemblyDefinition = z.infer<typeof AssemblyDefinitionSchema>;

// ============================================================================
// DOF ANALYSIS
// ============================================================================

/** Degrees of freedom analysis result */
export const DOFAnalysisSchema = z.object({
  totalDOF: z.number().int().describe("Remaining degrees of freedom"),
  componentDOF: z.record(z.string(), z.object({
    translationX: z.boolean(),
    translationY: z.boolean(),
    translationZ: z.boolean(),
    rotationX: z.boolean(),
    rotationY: z.boolean(),
    rotationZ: z.boolean(),
    totalDOF: z.number().int().min(0).max(6),
  })),
  overConstrained: z.boolean().describe("True if redundant constraints exist"),
  underConstrained: z.boolean().describe("True if assembly has free motion"),
  redundantConstraints: z.array(z.string())
    .describe("IDs of redundant constraints"),
});
export type DOFAnalysis = z.infer<typeof DOFAnalysisSchema>;
