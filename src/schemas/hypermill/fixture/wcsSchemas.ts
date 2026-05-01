/**
 * WCS / Datum Parameter Schemas — hyperMILL Fixture/WCS Domain
 *
 * U-HKC13: Zod schemas for 4 WCS/datum configuration types used in hyperMILL.
 * Each schema defines the parameter set the AC Python API accepts when creating
 * or modifying work coordinate systems and datum references.
 *
 * AC Python call pattern:
 *   hm.wcs.assign_frame(frame_id='g54', origin_x=0, origin_y=0, origin_z=0, ...)
 *
 * @domain Fixture-WCS
 * @milestone HM-KC-MS2/U-HKC13
 */

import { z } from "zod";

// -- Shared types -------------------------------------------------------------

/** Metadata record for every WCS configuration type */
export interface WCSMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// -- Frame ID enum values -----------------------------------------------------

const FRAME_IDS = [
  "g54", "g55", "g56", "g57", "g58", "g59",
  "g54p1", "g54p2", "g54p3", "g54p4", "g54p5", "g54p6", "g54p7", "g54p8",
  "g54p9", "g54p10", "g54p11", "g54p12", "g54p13", "g54p14", "g54p15", "g54p16",
  "g54p17", "g54p18", "g54p19", "g54p20", "g54p21", "g54p22", "g54p23", "g54p24",
  "g54p25", "g54p26", "g54p27", "g54p28", "g54p29", "g54p30", "g54p31", "g54p32",
  "g54p33", "g54p34", "g54p35", "g54p36", "g54p37", "g54p38", "g54p39", "g54p40",
  "g54p41", "g54p42", "g54p43", "g54p44", "g54p45", "g54p46", "g54p47", "g54p48",
] as const;

export type FrameId = (typeof FRAME_IDS)[number];

// -- 1. WCS Frame Assignment --------------------------------------------------

export const wcsFrameAssignmentSchema = z.object({
  frame_id: z
    .enum(FRAME_IDS)
    .describe("G-code work offset frame identifier (G54-G59, G54.1 P1-P48)"),
  origin_x: z
    .number()
    .min(-100000)
    .max(100000)
    .describe("X component of the WCS origin in machine coordinates, mm"),
  origin_y: z
    .number()
    .min(-100000)
    .max(100000)
    .describe("Y component of the WCS origin in machine coordinates, mm"),
  origin_z: z
    .number()
    .min(-100000)
    .max(100000)
    .describe("Z component of the WCS origin in machine coordinates, mm"),
  rotation_a: z
    .number()
    .min(-360)
    .max(360)
    .default(0)
    .describe("Rotation about X axis (A), degrees"),
  rotation_b: z
    .number()
    .min(-360)
    .max(360)
    .default(0)
    .describe("Rotation about Y axis (B), degrees"),
  rotation_c: z
    .number()
    .min(-360)
    .max(360)
    .default(0)
    .describe("Rotation about Z axis (C), degrees"),
  label: z
    .string()
    .optional()
    .describe("Human-readable label for the WCS frame (e.g. 'OP1 TOP')"),
  active: z
    .boolean()
    .default(true)
    .describe("Whether this WCS frame is currently active in the job"),
});

export type WCSFrameAssignment = z.infer<typeof wcsFrameAssignmentSchema>;

// -- 2. Datum Transfer --------------------------------------------------------

export const datumTransferSchema = z.object({
  source_frame: z
    .string()
    .describe("Frame ID of the source WCS to transfer from"),
  target_frame: z
    .string()
    .describe("Frame ID of the target WCS to transfer to"),
  transform_type: z
    .enum(["translate", "rotate", "compound"])
    .describe("Type of geometric transform applied during datum transfer"),
  verify_after_transfer: z
    .boolean()
    .default(true)
    .describe("Run verification probe routine after transfer completes"),
  tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.01)
    .describe("Acceptable deviation between expected and actual datum position, mm"),
});

export type DatumTransfer = z.infer<typeof datumTransferSchema>;

// -- 3. Probe Verification ----------------------------------------------------

export const probeVerificationSchema = z.object({
  probe_type: z
    .enum(["touch", "optical", "laser", "tool_setter"])
    .describe("Type of probe used for WCS verification"),
  calibration_sphere_diameter: z
    .number()
    .min(3)
    .max(50)
    .default(6.0)
    .describe("Diameter of the probe calibration sphere, mm"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .default(500)
    .describe("Feedrate during probe approach move, mm/min"),
  overtravel_distance: z
    .number()
    .min(0.1)
    .max(10)
    .default(2.0)
    .describe("Maximum overtravel allowed beyond expected contact point, mm"),
  expected_deviation: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.02)
    .describe("Expected positional deviation at the probe point, mm"),
  auto_update_wcs: z
    .boolean()
    .default(false)
    .describe("DFM: automatically update WCS from probe result (dangerous if unexpected deviation, should confirm)"),
});

export type ProbeVerification = z.infer<typeof probeVerificationSchema>;

// -- 4. Multi-Setup Coordination ----------------------------------------------

export const multiSetupCoordinationSchema = z.object({
  setup_count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(1)
    .describe("Total number of setups (ops) in the job"),
  alignment_method: z
    .enum(["3_2_1", "best_fit", "datum_target", "edge_find"])
    .describe("Method used to align the part between setups"),
  flip_axis: z
    .enum(["none", "x", "y", "z"])
    .default("none")
    .describe("Axis about which the part flips between operations"),
  reference_feature: z
    .string()
    .optional()
    .describe("CAD feature reference used for re-alignment between setups"),
  position_uncertainty: z
    .number()
    .min(0)
    .max(1.0)
    .default(0.05)
    .describe("Expected positional uncertainty budget after re-alignment, mm"),
});

export type MultiSetupCoordination = z.infer<typeof multiSetupCoordinationSchema>;

// -- WCS Schema Map -----------------------------------------------------------

/** Union type of all WCS configuration parameter objects */
export type WCSSchemas = {
  frame_assignment: WCSFrameAssignment;
  datum_transfer: DatumTransfer;
  probe_verification: ProbeVerification;
  multi_setup_coordination: MultiSetupCoordination;
};

/** Flat map from WCS type name to its Zod schema */
export const WCS_SCHEMA_MAP = {
  frame_assignment: wcsFrameAssignmentSchema,
  datum_transfer: datumTransferSchema,
  probe_verification: probeVerificationSchema,
  multi_setup_coordination: multiSetupCoordinationSchema,
} as const;

// -- WCS Metadata -------------------------------------------------------------

export const WCS_METADATA: Record<string, WCSMeta> = {
  frame_assignment: {
    paramCount: 9,
    acPythonSetter:
      "hm.wcs.assign_frame(frame='{frame_id}', x={origin_x}, y={origin_y}, z={origin_z}, a={rotation_a}, b={rotation_b}, c={rotation_c}, label='{label}', active={active})",
    description:
      "Assigns a work coordinate system frame with origin and rotation offsets",
    dfmCriticalParams: ["origin_x", "origin_y", "origin_z"],
  },
  datum_transfer: {
    paramCount: 5,
    acPythonSetter:
      "hm.wcs.datum_transfer(source='{source_frame}', target='{target_frame}', type='{transform_type}', verify={verify_after_transfer}, tol={tolerance})",
    description:
      "Transfers datum reference from one WCS frame to another with optional verification",
  },
  probe_verification: {
    paramCount: 6,
    acPythonSetter:
      "hm.wcs.probe_verify(probe='{probe_type}', cal_dia={calibration_sphere_diameter}, feed={approach_feed}, overtravel={overtravel_distance}, dev={expected_deviation}, auto_update={auto_update_wcs})",
    description:
      "Runs a probe verification routine to confirm WCS accuracy on the machine",
    dfmCriticalParams: ["auto_update_wcs"],
  },
  multi_setup_coordination: {
    paramCount: 5,
    acPythonSetter:
      "hm.wcs.multi_setup(count={setup_count}, align='{alignment_method}', flip='{flip_axis}', ref_feat='{reference_feature}', uncertainty={position_uncertainty})",
    description:
      "Coordinates WCS alignment across multiple setups/operations in a multi-op job",
    dfmCriticalParams: ["position_uncertainty"],
  },
};

/**
 * Total parameter count across all 4 WCS/datum schemas.
 */
export const WCS_TOTAL_PARAM_COUNT: number = Object.values(
  WCS_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
