/**
 * Workholding Parameter Schemas — hyperMILL Fixture Devices
 *
 * U-HKC12: Zod schemas for 6 workholding device types used in hyperMILL fixture
 * setup. Each schema defines the parameter set the AC Python API accepts when
 * configuring a workholding device for simulation and toolpath clearance checks.
 *
 * AC Python call pattern:
 *   hm.fixture.vise(jaw_width=150, max_opening=200, clamping_force=25000, ...)
 *
 * @domain Fixture-Workholding
 * @milestone HM-KC-MS2/U-HKC12
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every workholding device type */
export interface WorkholdingMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Fixture Body (10 params) ─────────────────────────────────────────────

export const fixtureBodySchema = z.object({
  import_source: z
    .enum(["step", "iges", "native", "create_box", "create_cylinder"])
    .describe("Source format for fixture body geometry import or creation"),
  position_x: z
    .number()
    .min(-10000)
    .max(10000)
    .describe("Fixture body X position in workpiece coordinates, mm"),
  position_y: z
    .number()
    .min(-10000)
    .max(10000)
    .describe("Fixture body Y position in workpiece coordinates, mm"),
  position_z: z
    .number()
    .min(-10000)
    .max(10000)
    .describe("Fixture body Z position in workpiece coordinates, mm"),
  rotation_a: z
    .number()
    .min(-360)
    .max(360)
    .describe("Fixture body A-axis rotation, degrees"),
  rotation_b: z
    .number()
    .min(-360)
    .max(360)
    .describe("Fixture body B-axis rotation, degrees"),
  rotation_c: z
    .number()
    .min(-360)
    .max(360)
    .describe("Fixture body C-axis rotation, degrees"),
  clamp_zone_offset: z
    .number()
    .min(0)
    .max(100)
    .default(5)
    .describe("Offset from part surface defining no-go zone for toolpaths, mm"),
  visible_in_simulation: z
    .boolean()
    .default(true)
    .describe("Whether fixture body appears in simulation visualization"),
  transparency: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Fixture body display transparency (0 = opaque, 1 = invisible)"),
});

export type FixtureBody = z.infer<typeof fixtureBodySchema>;

// ── 2. Soft Jaw (8 params) ──────────────────────────────────────────────────

export const softJawSchema = z.object({
  jaw_type: z
    .enum(["step", "dovetail", "round", "custom"])
    .describe("Soft jaw geometry type"),
  bore_diameter: z
    .number()
    .min(1)
    .max(1000)
    .describe("Bore diameter machined into jaw to match part OD, mm (DFM-critical)"),
  jaw_height: z
    .number()
    .min(5)
    .max(200)
    .describe("Total jaw height above chuck body, mm"),
  grip_depth: z
    .number()
    .min(1)
    .max(100)
    .describe("Depth of part engagement in jaw, mm (DFM-critical: min 3x part wall thickness)"),
  dovetail_angle: z
    .number()
    .min(30)
    .max(90)
    .default(60)
    .describe("Dovetail interlock angle for dovetail-type jaws, degrees"),
  material: z
    .enum(["aluminum_6061", "steel_1018", "brass", "nylon"])
    .describe("Soft jaw material selection"),
  interference_check: z
    .boolean()
    .default(true)
    .describe("Enable tool-jaw interference checking during simulation"),
  contact_surface_area: z
    .number()
    .min(1)
    .max(100000)
    .describe("Estimated contact surface area between jaw and part, mm^2 (computed)"),
});

export type SoftJaw = z.infer<typeof softJawSchema>;

// ── 3. Vise (10 params) ─────────────────────────────────────────────────────

export const viseSchema = z.object({
  jaw_width: z
    .number()
    .min(25)
    .max(500)
    .default(150)
    .describe("Vise jaw width, mm"),
  max_opening: z
    .number()
    .min(0)
    .max(500)
    .describe("Maximum vise jaw opening distance, mm"),
  stop_position: z
    .number()
    .min(0)
    .max(500)
    .describe("Fixed stop position for part registration, mm"),
  parallels_height: z
    .number()
    .min(0)
    .max(200)
    .default(0)
    .describe("Parallels height under part (0 = no parallels), mm"),
  clamping_force: z
    .number()
    .min(100)
    .max(100000)
    .describe("Vise clamping force, N (DFM-critical: must exceed cutting force)"),
  jaw_surface: z
    .enum(["smooth", "serrated", "machinable"])
    .describe("Vise jaw surface finish type"),
  vise_model: z
    .string()
    .optional()
    .describe("Vise model identifier (e.g. 'Kurt D675')"),
  double_station: z
    .boolean()
    .default(false)
    .describe("Double-station vise with two clamping positions"),
  low_profile: z
    .boolean()
    .default(false)
    .describe("Low-profile vise for improved Z clearance"),
  angular_offset: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe("Angular offset of vise on table, degrees"),
});

export type Vise = z.infer<typeof viseSchema>;

// ── 4. Chuck/Collet (10 params) ─────────────────────────────────────────────

export const chuckColletSchema = z.object({
  chuck_type: z
    .enum(["3_jaw", "4_jaw", "6_jaw", "collet", "power_chuck"])
    .describe("Chuck or collet type"),
  grip_diameter: z
    .number()
    .min(0.5)
    .max(2000)
    .describe("Workpiece grip diameter, mm (DFM-critical)"),
  grip_force: z
    .number()
    .min(50)
    .max(500000)
    .describe("Total radial grip force, N (DFM-critical: must exceed cutting force x 2.5 safety factor)"),
  jaw_configuration: z
    .enum(["hard", "soft", "stepped", "pie"])
    .describe("Jaw configuration type"),
  collet_size: z
    .string()
    .optional()
    .describe("Collet size designation (e.g. 'ER32', '5C', '16C')"),
  max_rpm: z
    .number()
    .min(0)
    .max(60000)
    .describe("Maximum safe RPM — centrifugal jaw loss check required above 3000 RPM"),
  jaw_mass_each: z
    .number()
    .min(0.01)
    .max(50)
    .default(0.5)
    .describe("Mass of each jaw for centrifugal force calculation, kg"),
  grip_length: z
    .number()
    .min(1)
    .max(500)
    .describe("Axial length of jaw engagement on workpiece, mm"),
  concentricity_tolerance: z
    .number()
    .min(0.001)
    .max(0.1)
    .default(0.01)
    .describe("Required concentricity tolerance (TIR), mm"),
  pull_back_force: z
    .number()
    .min(0)
    .max(50000)
    .default(0)
    .describe("Axial pull-back force for pull-back collet chucks, N"),
});

export type ChuckCollet = z.infer<typeof chuckColletSchema>;

// ── 5. Tombstone/Pallet (8 params) ──────────────────────────────────────────

export const tombstonePalletSchema = z.object({
  face_count: z
    .number()
    .int()
    .min(2)
    .max(8)
    .default(4)
    .describe("Number of workholding faces on tombstone"),
  face_width: z
    .number()
    .min(50)
    .max(2000)
    .describe("Width of each tombstone face, mm"),
  face_height: z
    .number()
    .min(50)
    .max(2000)
    .describe("Height of each tombstone face, mm"),
  part_count_per_face: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Number of parts fixtured per face"),
  indexing_accuracy: z
    .number()
    .min(0.001)
    .max(0.1)
    .default(0.005)
    .describe("Rotary indexing accuracy of tombstone, degrees"),
  pallet_id: z
    .string()
    .optional()
    .describe("Pallet system identifier for tracking"),
  fixture_plate_thickness: z
    .number()
    .min(10)
    .max(200)
    .default(25)
    .describe("Sub-plate / fixture plate thickness, mm"),
  zero_point_system: z
    .enum(["none", "erowa", "system3r", "lang", "jergens"])
    .default("none")
    .describe("Zero-point clamping system used for pallet interface"),
});

export type TombstonePallet = z.infer<typeof tombstonePalletSchema>;

// ── 6. Vacuum/Magnetic (8 params) ───────────────────────────────────────────

export const vacuumMagneticSchema = z.object({
  hold_type: z
    .enum(["vacuum", "magnetic", "electro_magnetic"])
    .describe("Non-mechanical holding method"),
  zone_count: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(1)
    .describe("Number of independent holding zones"),
  hold_force_per_zone: z
    .number()
    .min(10)
    .max(50000)
    .describe("Holding force per zone, N (DFM-critical: must exceed cutting force)"),
  seal_type: z
    .enum(["gasket", "foam", "machined_channel", "none"])
    .describe("Vacuum seal type (applicable to vacuum hold_type)"),
  surface_flatness_req: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.05)
    .describe("Required part bottom surface flatness for effective hold, mm"),
  part_min_thickness: z
    .number()
    .min(0.5)
    .max(500)
    .describe("Minimum part thickness (DFM: thin parts deform under vacuum/magnetic force), mm"),
  magnetic_field_depth: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe("Effective magnetic field penetration depth (magnetic types only), mm"),
  leak_test_pressure: z
    .number()
    .min(0)
    .max(2)
    .default(0.85)
    .describe("Vacuum leak test pressure threshold (vacuum type only), bar"),
});

export type VacuumMagnetic = z.infer<typeof vacuumMagneticSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All workholding schemas keyed by device type */
export const WORKHOLDING_SCHEMA_MAP = {
  fixture_body: fixtureBodySchema,
  soft_jaw: softJawSchema,
  vise: viseSchema,
  chuck_collet: chuckColletSchema,
  tombstone_pallet: tombstonePalletSchema,
  vacuum_magnetic: vacuumMagneticSchema,
} as const;

export type WorkholdingDeviceType = keyof typeof WORKHOLDING_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata for each workholding device type with AC Python setter references */
export const WORKHOLDING_METADATA: Record<WorkholdingDeviceType, WorkholdingMeta> = {
  fixture_body: {
    paramCount: 10,
    acPythonSetter: "hm.fixture.fixture_body",
    description: "Imported or procedural fixture body for collision avoidance and simulation",
  },
  soft_jaw: {
    paramCount: 8,
    acPythonSetter: "hm.fixture.soft_jaw",
    description: "Custom-machined soft jaws for chuck or vise — matched to part geometry",
    dfmCriticalParams: ["bore_diameter", "grip_depth"],
  },
  vise: {
    paramCount: 10,
    acPythonSetter: "hm.fixture.vise",
    description: "Precision vise workholding with configurable jaw surface and clamping force",
    dfmCriticalParams: ["clamping_force"],
  },
  chuck_collet: {
    paramCount: 10,
    acPythonSetter: "hm.fixture.chuck_collet",
    description: "Rotary workholding — 3/4/6-jaw chucks, collets, and power chucks with centrifugal checks",
    dfmCriticalParams: ["grip_diameter", "grip_force"],
  },
  tombstone_pallet: {
    paramCount: 8,
    acPythonSetter: "hm.fixture.tombstone_pallet",
    description: "Multi-face tombstone or pallet system for high-volume fixturing",
  },
  vacuum_magnetic: {
    paramCount: 8,
    acPythonSetter: "hm.fixture.vacuum_magnetic",
    description: "Non-mechanical holding via vacuum, magnetic, or electromagnetic force",
    dfmCriticalParams: ["hold_force_per_zone"],
  },
};

// ── Computed totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 6 workholding device schemas */
export const WORKHOLDING_TOTAL_PARAM_COUNT = Object.values(WORKHOLDING_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
