/**
 * Setup/Job Management Parameter Schemas — hyperMILL CAM Setup
 *
 * U-HKC14: Zod schemas for 4 CAM setup/job management types used in hyperMILL
 * configuration. Each schema defines the parameter set the AC Python API accepts
 * when creating jobs, assigning tools, configuring rest machining, and applying
 * transformations.
 *
 * AC Python call pattern:
 *   hm.setup.job_create(job_name="OP10_ROUGH", operation_type="milling", ...)
 *
 * @domain Fixture-Setup
 * @milestone HM-KC-MS2/U-HKC14
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every setup operation type */
export interface SetupMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Job Create (5 params) ───────────────────────────────────────────────

export const jobCreateSchema = z.object({
  job_name: z
    .string()
    .min(1)
    .describe("Job/operation name identifier"),
  operation_type: z
    .enum(["milling", "turning", "mill_turn", "drilling", "edm"])
    .describe("Primary machining operation type for this job"),
  machine_id: z
    .string()
    .optional()
    .describe("Machine identifier from machine catalog (optional)"),
  coordinate_system: z
    .enum(["absolute", "g54", "g55", "g56", "g57", "g58", "g59"])
    .describe("Work coordinate system for this job"),
  post_processor: z
    .string()
    .optional()
    .describe("Post-processor identifier for NC code generation (optional)"),
});

export type JobCreate = z.infer<typeof jobCreateSchema>;

// ── 2. Tool Assignment (5 params) ──────────────────────────────────────────

export const toolAssignmentSchema = z.object({
  tool_number: z
    .number()
    .int()
    .min(1)
    .max(9999)
    .describe("Tool number in machine tool magazine (1..9999)"),
  tool_name: z
    .string()
    .min(1)
    .describe("Descriptive tool name (e.g. 'EM_12_3FL_CARBIDE')"),
  length_offset: z
    .number()
    .int()
    .min(1)
    .max(999)
    .describe("Tool length offset register number (defaults to tool_number)"),
  diameter_offset: z
    .number()
    .int()
    .min(0)
    .max(999)
    .default(0)
    .describe("Tool diameter/radius compensation register number (0 = none)"),
  coolant_mode: z
    .enum(["off", "flood", "mist", "through_tool", "air_blast"])
    .default("flood")
    .describe("Coolant delivery mode for this tool"),
});

export type ToolAssignment = z.infer<typeof toolAssignmentSchema>;

// ── 3. Rest Machining (5 params) ───────────────────────────────────────────

export const restMachiningSchema = z.object({
  source_operation: z
    .string()
    .min(1)
    .describe("Reference to previous operation for rest material detection"),
  stock_recognition: z
    .enum(["from_previous", "from_stock", "from_ipw"])
    .describe("Method for recognizing remaining stock geometry"),
  min_rest_width: z
    .number()
    .min(0.01)
    .max(50)
    .default(0.5)
    .describe("Minimum rest material width to machine, mm"),
  add_overlap: z
    .number()
    .min(0)
    .max(10)
    .default(0.5)
    .describe("Overlap distance added to rest machining boundaries, mm"),
  rest_strategy: z
    .enum(["auto", "contour", "pencil", "steep_shallow"])
    .describe("Strategy for machining rest material regions"),
});

export type RestMachining = z.infer<typeof restMachiningSchema>;

// ── 4. Transformation (5 params) ───────────────────────────────────────────

export const transformationSchema = z.object({
  transform_type: z
    .enum(["translate", "rotate", "mirror", "pattern"])
    .describe("Type of geometric transformation to apply"),
  translate_vector: z
    .object({
      x: z.number().min(-10000).max(10000).default(0).describe("Translation X, mm"),
      y: z.number().min(-10000).max(10000).default(0).describe("Translation Y, mm"),
      z: z.number().min(-10000).max(10000).default(0).describe("Translation Z, mm"),
    })
    .describe("Translation vector (x, y, z) in mm"),
  rotation_axis: z
    .enum(["x", "y", "z"])
    .describe("Axis of rotation for rotate transformation"),
  rotation_angle: z
    .number()
    .min(-360)
    .max(360)
    .describe("Rotation angle in degrees (-360..360)"),
  keep_original: z
    .boolean()
    .default(true)
    .describe("Keep the original operation in addition to the transformed copy"),
});

export type Transformation = z.infer<typeof transformationSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All setup schemas keyed by operation type */
export const SETUP_SCHEMA_MAP = {
  job_create: jobCreateSchema,
  tool_assignment: toolAssignmentSchema,
  rest_machining: restMachiningSchema,
  transformation: transformationSchema,
} as const;

export type SetupOperationType = keyof typeof SETUP_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata for each setup operation type with AC Python setter references */
export const SETUP_METADATA: Record<SetupOperationType, SetupMeta> = {
  job_create: {
    paramCount: 5,
    acPythonSetter: "hm.setup.job_create",
    description: "Create a new CAM job/operation with machine and coordinate system assignment",
  },
  tool_assignment: {
    paramCount: 5,
    acPythonSetter: "hm.setup.tool_assignment",
    description: "Assign a tool to the job with offset registers and coolant configuration",
  },
  rest_machining: {
    paramCount: 5,
    acPythonSetter: "hm.setup.rest_machining",
    description: "Configure rest machining from a previous operation with stock recognition",
  },
  transformation: {
    paramCount: 5,
    acPythonSetter: "hm.setup.transformation",
    description: "Apply geometric transformation (translate/rotate/mirror/pattern) to operations",
  },
};

// ── Computed totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 4 setup operation schemas */
export const SETUP_TOTAL_PARAM_COUNT = Object.values(SETUP_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
