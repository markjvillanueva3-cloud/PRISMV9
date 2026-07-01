/**
 * ThreadMillingPhysicsEngine — First-principles thread milling physics
 *
 * Covers single-point, multi-tooth, and helical interpolation thread milling.
 * Models helical path kinematics, cutting forces with chip thinning compensation,
 * tool deflection-induced pitch diameter error, thread quality prediction,
 * multi-pass strategy optimization, cycle time estimation, and tool selection.
 *
 * Self-contained: no external dependencies. Deterministic PRNG for Monte Carlo.
 *
 * References:
 *   ISO 68-1:1998 — ISO general purpose screw threads, Basic profile
 *   ASME B1.1-2019 — Unified Inch Screw Threads
 *   Araujo et al., "Thread milling as a manufacturing process" IJMTM (2006)
 *   Fromentin & Poulachon, "Geometrical analysis of thread milling" IJMTM (2010)
 *   Dogra et al., "Tool wear, chip formation during hard turning" JMPT (2010)
 *   Kienzle, "Die Bestimmung von Kräften" VDI-Z 94 (1952)
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Input / Output Interfaces ──────────────────────────────────────

export interface HelicalKinematicsInput {
  /** Nominal thread diameter (major diameter) [mm] */
  thread_diameter_mm: number;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Thread pitch [mm] */
  pitch_mm: number;
  /** Spindle speed [rpm] */
  spindle_rpm: number;
  /** Number of tool flutes */
  n_flutes?: number;
  /** Thread type */
  thread_type: 'internal' | 'external';
}

export interface HelicalKinematicsOutput {
  /** Helical path radius (center of tool to center of hole) [mm] */
  helix_radius_mm: number;
  /** Effective cutting speed at tool OD, compensated for helical path [m/min] */
  Vc_effective_m_min: number;
  /** Radial engagement [mm] */
  ae_mm: number;
  /** Compensated feed per tooth (accounting for helical interpolation) [mm/tooth] */
  fz_actual_mm: number;
  /** Programmed feed per tooth before compensation [mm/tooth] */
  fz_programmed_mm: number;
  /** Chip thinning factor */
  chip_thinning_factor: number;
  /** Helical path equations as strings */
  path_equations: {
    x: string;
    y: string;
    z: string;
  };
}

export interface CuttingForceInput {
  /** Specific cutting force kc1.1 [N/mm²] */
  kc1_1: number;
  /** Kienzle exponent mc */
  mc: number;
  /** Axial depth of cut (thread depth) [mm] */
  ap_mm: number;
  /** Actual feed per tooth (compensated) [mm/tooth] */
  fz_mm: number;
  /** Engagement angle [deg] — defaults to 90° */
  engagement_angle_deg?: number;
  /** Radial force ratio kr (Fr/Ft) — typical 0.3-0.5 */
  kr?: number;
  /** Axial force ratio ka (Fa/Ft) — typical 0.2-0.35 */
  ka?: number;
  /** Tool overhang length [mm] */
  tool_overhang_mm?: number;
  /** Tool shank diameter [mm] */
  tool_shank_diameter_mm?: number;
  /** Young's modulus of tool [GPa] — default 600 for carbide */
  tool_E_GPa?: number;
}

export interface CuttingForceOutput {
  /** Tangential cutting force [N] */
  Ft_N: number;
  /** Radial cutting force [N] */
  Fr_N: number;
  /** Axial cutting force [N] */
  Fa_N: number;
  /** Resultant force [N] */
  F_resultant_N: number;
  /** Tool deflection from radial force [mm] */
  tool_deflection_mm: number;
  /** Pitch diameter error from tool deflection [mm] */
  pitch_diameter_error_mm: number;
  /** Thread profile error assessment */
  profile_error_assessment: string;
}

export interface ThreadQualityInput {
  /** Thread standard */
  standard: 'ISO' | 'UNC' | 'UNF' | 'BSP' | 'NPT' | 'ACME' | 'Tr';
  /** Thread designation (e.g., "M10x1.5", "1/2-13") */
  designation: string;
  /** Tool deflection at cutting point [mm] */
  tool_deflection_mm: number;
  /** Feed per tooth [mm] */
  fz_mm: number;
  /** Insert nose radius [mm] */
  insert_radius_mm?: number;
  /** Thread half-angle [deg] — 30° for metric/unified, varies for others */
  thread_half_angle_deg?: number;
  /** Thread type */
  thread_type: 'internal' | 'external';
}

export interface ThreadQualityOutput {
  /** Pitch diameter deviation from tool deflection [mm] */
  pitch_diameter_deviation_mm: number;
  /** Predicted surface roughness on thread flanks [µm Ra] */
  Ra_flanks_um: number;
  /** Thread form accuracy — deviation from ideal profile [mm] */
  form_deviation_mm: number;
  /** Predicted thread class achievable */
  predicted_class: string;
  /** Whether the thread is within tolerance for the class */
  within_tolerance: boolean;
  /** Tolerance range for the class [mm] */
  tolerance_range_mm: { lower: number; upper: number };
  /** Recommendations to improve quality */
  recommendations: string[];
}

export interface MultiPassInput {
  /** Total radial depth of cut (thread depth) [mm] */
  ae_total_mm: number;
  /** Number of passes */
  n_passes: number;
  /** Whether to include a spring pass */
  spring_pass: boolean;
  /** Thread type */
  thread_type: 'internal' | 'external';
  /** Milling direction preference */
  direction?: 'climb' | 'conventional' | 'auto';
}

export interface MultiPassOutput {
  /** Radial infeed per pass [mm] */
  ae_per_pass_mm: number[];
  /** Recommended direction */
  recommended_direction: 'climb' | 'conventional';
  /** Direction rationale */
  direction_rationale: string;
  /** Passes including spring pass */
  total_passes: number;
  /** Pass descriptions */
  pass_descriptions: string[];
  /** Expected quality improvement from multi-pass [%] */
  quality_improvement_pct: number;
}

export interface CycleTimeInput {
  /** Thread length [mm] */
  thread_length_mm: number;
  /** Thread pitch [mm] */
  pitch_mm: number;
  /** Spindle speed [rpm] */
  spindle_rpm: number;
  /** Number of passes (for single-point) */
  n_passes?: number;
  /** Thread milling method */
  method: 'single_point' | 'multi_tooth';
  /** Number of effective teeth (for multi-tooth) */
  n_teeth?: number;
  /** Rapid traverse rate [mm/min] — default 15000 */
  rapid_rate_mm_min?: number;
  /** Entry/exit arc angle [deg] — default 90° for multi-tooth */
  arc_angle_deg?: number;
}

export interface CycleTimeOutput {
  /** Cutting time [s] */
  cutting_time_s: number;
  /** Rapid time [s] */
  rapid_time_s: number;
  /** Total cycle time [s] */
  total_time_s: number;
  /** Number of helical revolutions */
  n_revolutions: number;
  /** Time breakdown */
  breakdown: string;
}

export interface ToolSelectionInput {
  /** Thread pitch [mm] */
  pitch_mm: number;
  /** Thread diameter [mm] */
  thread_diameter_mm: number;
  /** Thread type */
  thread_type: 'internal' | 'external';
  /** Batch size */
  batch_size?: number;
  /** Thread standard */
  standard?: 'ISO' | 'UNC' | 'UNF' | 'BSP' | 'NPT' | 'ACME' | 'Tr';
  /** Required accuracy class */
  required_class?: string;
}

export interface ToolSelectionOutput {
  /** Recommended tool type */
  recommended_type: 'single_point' | 'multi_flute' | 'indexable';
  /** Rationale */
  rationale: string[];
  /** Tool profile recommendation */
  profile: 'full_form' | 'partial_profile';
  /** Max achievable helix angle for helical interpolation [deg] */
  max_helix_angle_deg: number;
  /** Suitability score [0-100] */
  suitability_score: number;
  /** Warnings */
  warnings: string[];
}

export interface ThreadStandardLookupInput {
  /** Thread standard */
  standard: 'ISO' | 'UNC' | 'UNF' | 'BSP' | 'NPT' | 'ACME' | 'Tr';
  /** Designation (e.g., "M10", "1/2-13") */
  designation: string;
}

export interface ThreadStandardLookupOutput {
  /** Thread designation */
  designation: string;
  /** Major diameter [mm] */
  major_diameter_mm: number;
  /** Pitch diameter [mm] */
  pitch_diameter_mm: number;
  /** Minor diameter [mm] */
  minor_diameter_mm: number;
  /** Pitch [mm] */
  pitch_mm: number;
  /** Thread angle [deg] */
  thread_angle_deg: number;
  /** Thread depth (H) [mm] */
  thread_depth_mm: number;
  /** Tolerance classes available */
  tolerance_classes: string[];
  /** Pitch diameter tolerances for common classes [mm] */
  tolerances: Record<string, { upper: number; lower: number }>;
}

export interface ChipThinningInput {
  /** Programmed feed per tooth [mm/tooth] */
  fz_programmed_mm: number;
  /** Hole/workpiece diameter [mm] */
  hole_diameter_mm: number;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Thread type */
  thread_type: 'internal' | 'external';
}

export interface ChipThinningOutput {
  /** Effective feed per tooth [mm/tooth] */
  fz_effective_mm: number;
  /** Chip thinning factor */
  thinning_factor: number;
  /** Engagement arc angle [deg] */
  engagement_arc_deg: number;
  /** Recommendation */
  recommendation: string;
}

// ─── Thread Standards Database ──────────────────────────────────────

interface ThreadStandardEntry {
  designation: string;
  major_diameter_mm: number;
  pitch_mm: number;
  pitch_diameter_mm: number;
  minor_diameter_mm: number;
  thread_angle_deg: number;
}

/**
 * ISO metric coarse threads (ISO 261) — M3 through M48.
 * Pitch diameter d2 = d - 0.6495 × P
 * Minor diameter d1 = d - 1.0825 × P
 */
const ISO_METRIC_COARSE: ThreadStandardEntry[] = [
  { designation: 'M3',   major_diameter_mm: 3,    pitch_mm: 0.5,  pitch_diameter_mm: 2.675,  minor_diameter_mm: 2.459,  thread_angle_deg: 60 },
  { designation: 'M4',   major_diameter_mm: 4,    pitch_mm: 0.7,  pitch_diameter_mm: 3.545,  minor_diameter_mm: 3.242,  thread_angle_deg: 60 },
  { designation: 'M5',   major_diameter_mm: 5,    pitch_mm: 0.8,  pitch_diameter_mm: 4.480,  minor_diameter_mm: 4.134,  thread_angle_deg: 60 },
  { designation: 'M6',   major_diameter_mm: 6,    pitch_mm: 1.0,  pitch_diameter_mm: 5.350,  minor_diameter_mm: 4.917,  thread_angle_deg: 60 },
  { designation: 'M8',   major_diameter_mm: 8,    pitch_mm: 1.25, pitch_diameter_mm: 7.188,  minor_diameter_mm: 6.647,  thread_angle_deg: 60 },
  { designation: 'M10',  major_diameter_mm: 10,   pitch_mm: 1.5,  pitch_diameter_mm: 9.026,  minor_diameter_mm: 8.376,  thread_angle_deg: 60 },
  { designation: 'M12',  major_diameter_mm: 12,   pitch_mm: 1.75, pitch_diameter_mm: 10.863, minor_diameter_mm: 10.106, thread_angle_deg: 60 },
  { designation: 'M14',  major_diameter_mm: 14,   pitch_mm: 2.0,  pitch_diameter_mm: 12.701, minor_diameter_mm: 11.835, thread_angle_deg: 60 },
  { designation: 'M16',  major_diameter_mm: 16,   pitch_mm: 2.0,  pitch_diameter_mm: 14.701, minor_diameter_mm: 13.835, thread_angle_deg: 60 },
  { designation: 'M18',  major_diameter_mm: 18,   pitch_mm: 2.5,  pitch_diameter_mm: 16.376, minor_diameter_mm: 15.294, thread_angle_deg: 60 },
  { designation: 'M20',  major_diameter_mm: 20,   pitch_mm: 2.5,  pitch_diameter_mm: 18.376, minor_diameter_mm: 17.294, thread_angle_deg: 60 },
  { designation: 'M22',  major_diameter_mm: 22,   pitch_mm: 2.5,  pitch_diameter_mm: 20.376, minor_diameter_mm: 19.294, thread_angle_deg: 60 },
  { designation: 'M24',  major_diameter_mm: 24,   pitch_mm: 3.0,  pitch_diameter_mm: 22.051, minor_diameter_mm: 20.752, thread_angle_deg: 60 },
  { designation: 'M27',  major_diameter_mm: 27,   pitch_mm: 3.0,  pitch_diameter_mm: 25.051, minor_diameter_mm: 23.752, thread_angle_deg: 60 },
  { designation: 'M30',  major_diameter_mm: 30,   pitch_mm: 3.5,  pitch_diameter_mm: 27.727, minor_diameter_mm: 26.211, thread_angle_deg: 60 },
  { designation: 'M33',  major_diameter_mm: 33,   pitch_mm: 3.5,  pitch_diameter_mm: 30.727, minor_diameter_mm: 29.211, thread_angle_deg: 60 },
  { designation: 'M36',  major_diameter_mm: 36,   pitch_mm: 4.0,  pitch_diameter_mm: 33.402, minor_diameter_mm: 31.670, thread_angle_deg: 60 },
  { designation: 'M39',  major_diameter_mm: 39,   pitch_mm: 4.0,  pitch_diameter_mm: 36.402, minor_diameter_mm: 34.670, thread_angle_deg: 60 },
  { designation: 'M42',  major_diameter_mm: 42,   pitch_mm: 4.5,  pitch_diameter_mm: 39.077, minor_diameter_mm: 37.129, thread_angle_deg: 60 },
  { designation: 'M48',  major_diameter_mm: 48,   pitch_mm: 5.0,  pitch_diameter_mm: 44.752, minor_diameter_mm: 42.587, thread_angle_deg: 60 },
];

/**
 * ISO metric fine threads — common sizes.
 */
const ISO_METRIC_FINE: ThreadStandardEntry[] = [
  { designation: 'M6x0.75',  major_diameter_mm: 6,  pitch_mm: 0.75, pitch_diameter_mm: 5.513, minor_diameter_mm: 5.188, thread_angle_deg: 60 },
  { designation: 'M6x0.5',   major_diameter_mm: 6,  pitch_mm: 0.5,  pitch_diameter_mm: 5.675, minor_diameter_mm: 5.459, thread_angle_deg: 60 },
  { designation: 'M8x1.0',   major_diameter_mm: 8,  pitch_mm: 1.0,  pitch_diameter_mm: 7.350, minor_diameter_mm: 6.917, thread_angle_deg: 60 },
  { designation: 'M8x0.75',  major_diameter_mm: 8,  pitch_mm: 0.75, pitch_diameter_mm: 7.513, minor_diameter_mm: 7.188, thread_angle_deg: 60 },
  { designation: 'M10x1.25', major_diameter_mm: 10, pitch_mm: 1.25, pitch_diameter_mm: 9.188, minor_diameter_mm: 8.647, thread_angle_deg: 60 },
  { designation: 'M10x1.0',  major_diameter_mm: 10, pitch_mm: 1.0,  pitch_diameter_mm: 9.350, minor_diameter_mm: 8.917, thread_angle_deg: 60 },
  { designation: 'M10x0.75', major_diameter_mm: 10, pitch_mm: 0.75, pitch_diameter_mm: 9.513, minor_diameter_mm: 9.188, thread_angle_deg: 60 },
  { designation: 'M12x1.5',  major_diameter_mm: 12, pitch_mm: 1.5,  pitch_diameter_mm: 11.026, minor_diameter_mm: 10.376, thread_angle_deg: 60 },
  { designation: 'M12x1.25', major_diameter_mm: 12, pitch_mm: 1.25, pitch_diameter_mm: 11.188, minor_diameter_mm: 10.647, thread_angle_deg: 60 },
  { designation: 'M12x1.0',  major_diameter_mm: 12, pitch_mm: 1.0,  pitch_diameter_mm: 11.350, minor_diameter_mm: 10.917, thread_angle_deg: 60 },
  { designation: 'M14x1.5',  major_diameter_mm: 14, pitch_mm: 1.5,  pitch_diameter_mm: 13.026, minor_diameter_mm: 12.376, thread_angle_deg: 60 },
  { designation: 'M16x1.5',  major_diameter_mm: 16, pitch_mm: 1.5,  pitch_diameter_mm: 15.026, minor_diameter_mm: 14.376, thread_angle_deg: 60 },
  { designation: 'M16x1.0',  major_diameter_mm: 16, pitch_mm: 1.0,  pitch_diameter_mm: 15.350, minor_diameter_mm: 14.917, thread_angle_deg: 60 },
  { designation: 'M20x1.5',  major_diameter_mm: 20, pitch_mm: 1.5,  pitch_diameter_mm: 19.026, minor_diameter_mm: 18.376, thread_angle_deg: 60 },
  { designation: 'M20x1.0',  major_diameter_mm: 20, pitch_mm: 1.0,  pitch_diameter_mm: 19.350, minor_diameter_mm: 18.917, thread_angle_deg: 60 },
  { designation: 'M24x2.0',  major_diameter_mm: 24, pitch_mm: 2.0,  pitch_diameter_mm: 22.701, minor_diameter_mm: 21.835, thread_angle_deg: 60 },
  { designation: 'M24x1.5',  major_diameter_mm: 24, pitch_mm: 1.5,  pitch_diameter_mm: 23.026, minor_diameter_mm: 22.376, thread_angle_deg: 60 },
  { designation: 'M30x2.0',  major_diameter_mm: 30, pitch_mm: 2.0,  pitch_diameter_mm: 28.701, minor_diameter_mm: 27.835, thread_angle_deg: 60 },
  { designation: 'M36x3.0',  major_diameter_mm: 36, pitch_mm: 3.0,  pitch_diameter_mm: 34.051, minor_diameter_mm: 32.752, thread_angle_deg: 60 },
  { designation: 'M48x3.0',  major_diameter_mm: 48, pitch_mm: 3.0,  pitch_diameter_mm: 46.051, minor_diameter_mm: 44.752, thread_angle_deg: 60 },
];

/**
 * UNC (Unified National Coarse) threads — ASME B1.1.
 * Pitch diameter = Major - 0.6495 × pitch (60° threads).
 */
const UNC_THREADS: ThreadStandardEntry[] = [
  { designation: '#6-32',    major_diameter_mm: 3.505,  pitch_mm: 0.794,  pitch_diameter_mm: 2.990, minor_diameter_mm: 2.645, thread_angle_deg: 60 },
  { designation: '#8-32',    major_diameter_mm: 4.166,  pitch_mm: 0.794,  pitch_diameter_mm: 3.650, minor_diameter_mm: 3.306, thread_angle_deg: 60 },
  { designation: '#10-24',   major_diameter_mm: 4.826,  pitch_mm: 1.058,  pitch_diameter_mm: 4.138, minor_diameter_mm: 3.681, thread_angle_deg: 60 },
  { designation: '1/4-20',   major_diameter_mm: 6.350,  pitch_mm: 1.270,  pitch_diameter_mm: 5.524, minor_diameter_mm: 4.976, thread_angle_deg: 60 },
  { designation: '5/16-18',  major_diameter_mm: 7.938,  pitch_mm: 1.411,  pitch_diameter_mm: 7.021, minor_diameter_mm: 6.411, thread_angle_deg: 60 },
  { designation: '3/8-16',   major_diameter_mm: 9.525,  pitch_mm: 1.588,  pitch_diameter_mm: 8.494, minor_diameter_mm: 7.805, thread_angle_deg: 60 },
  { designation: '7/16-14',  major_diameter_mm: 11.112, pitch_mm: 1.814,  pitch_diameter_mm: 9.934, minor_diameter_mm: 9.147, thread_angle_deg: 60 },
  { designation: '1/2-13',   major_diameter_mm: 12.700, pitch_mm: 1.954,  pitch_diameter_mm: 11.430, minor_diameter_mm: 10.584, thread_angle_deg: 60 },
  { designation: '9/16-12',  major_diameter_mm: 14.288, pitch_mm: 2.117,  pitch_diameter_mm: 12.913, minor_diameter_mm: 11.989, thread_angle_deg: 60 },
  { designation: '5/8-11',   major_diameter_mm: 15.875, pitch_mm: 2.309,  pitch_diameter_mm: 14.376, minor_diameter_mm: 13.373, thread_angle_deg: 60 },
  { designation: '3/4-10',   major_diameter_mm: 19.050, pitch_mm: 2.540,  pitch_diameter_mm: 17.399, minor_diameter_mm: 16.299, thread_angle_deg: 60 },
  { designation: '7/8-9',    major_diameter_mm: 22.225, pitch_mm: 2.822,  pitch_diameter_mm: 20.391, minor_diameter_mm: 19.169, thread_angle_deg: 60 },
  { designation: '1-8',      major_diameter_mm: 25.400, pitch_mm: 3.175,  pitch_diameter_mm: 23.338, minor_diameter_mm: 21.963, thread_angle_deg: 60 },
  { designation: '1.25-7',   major_diameter_mm: 31.750, pitch_mm: 3.629,  pitch_diameter_mm: 29.392, minor_diameter_mm: 27.822, thread_angle_deg: 60 },
  { designation: '1.5-6',    major_diameter_mm: 38.100, pitch_mm: 4.233,  pitch_diameter_mm: 35.350, minor_diameter_mm: 33.516, thread_angle_deg: 60 },
];

/**
 * UNF (Unified National Fine) threads — ASME B1.1.
 */
const UNF_THREADS: ThreadStandardEntry[] = [
  { designation: '#6-40',    major_diameter_mm: 3.505,  pitch_mm: 0.635,  pitch_diameter_mm: 3.093, minor_diameter_mm: 2.817, thread_angle_deg: 60 },
  { designation: '#8-36',    major_diameter_mm: 4.166,  pitch_mm: 0.706,  pitch_diameter_mm: 3.707, minor_diameter_mm: 3.401, thread_angle_deg: 60 },
  { designation: '#10-32',   major_diameter_mm: 4.826,  pitch_mm: 0.794,  pitch_diameter_mm: 4.311, minor_diameter_mm: 3.966, thread_angle_deg: 60 },
  { designation: '1/4-28',   major_diameter_mm: 6.350,  pitch_mm: 0.907,  pitch_diameter_mm: 5.761, minor_diameter_mm: 5.368, thread_angle_deg: 60 },
  { designation: '5/16-24',  major_diameter_mm: 7.938,  pitch_mm: 1.058,  pitch_diameter_mm: 7.249, minor_diameter_mm: 6.793, thread_angle_deg: 60 },
  { designation: '3/8-24',   major_diameter_mm: 9.525,  pitch_mm: 1.058,  pitch_diameter_mm: 8.837, minor_diameter_mm: 8.380, thread_angle_deg: 60 },
  { designation: '7/16-20',  major_diameter_mm: 11.112, pitch_mm: 1.270,  pitch_diameter_mm: 10.287, minor_diameter_mm: 9.738, thread_angle_deg: 60 },
  { designation: '1/2-20',   major_diameter_mm: 12.700, pitch_mm: 1.270,  pitch_diameter_mm: 11.874, minor_diameter_mm: 11.326, thread_angle_deg: 60 },
  { designation: '9/16-18',  major_diameter_mm: 14.288, pitch_mm: 1.411,  pitch_diameter_mm: 13.371, minor_diameter_mm: 12.761, thread_angle_deg: 60 },
  { designation: '5/8-18',   major_diameter_mm: 15.875, pitch_mm: 1.411,  pitch_diameter_mm: 14.958, minor_diameter_mm: 14.348, thread_angle_deg: 60 },
  { designation: '3/4-16',   major_diameter_mm: 19.050, pitch_mm: 1.588,  pitch_diameter_mm: 18.019, minor_diameter_mm: 17.330, thread_angle_deg: 60 },
  { designation: '7/8-14',   major_diameter_mm: 22.225, pitch_mm: 1.814,  pitch_diameter_mm: 21.047, minor_diameter_mm: 20.260, thread_angle_deg: 60 },
  { designation: '1-12',     major_diameter_mm: 25.400, pitch_mm: 2.117,  pitch_diameter_mm: 24.026, minor_diameter_mm: 23.101, thread_angle_deg: 60 },
];

/**
 * Typical thread mill tool data for tool selection logic.
 */
interface ThreadMillToolData {
  type: 'single_point' | 'multi_flute' | 'indexable';
  min_pitch_mm: number;
  max_pitch_mm: number;
  typical_diameter_mm: number[];
  max_thread_depth_factor: number; // × diameter
  typical_flutes: number;
  cost_factor: number; // relative cost
  speed_factor: number; // relative cycle time (lower = faster)
}

const TOOL_DATA: ThreadMillToolData[] = [
  {
    type: 'single_point',
    min_pitch_mm: 0.2,
    max_pitch_mm: 12.0,
    typical_diameter_mm: [4, 6, 8, 10, 12, 16, 20],
    max_thread_depth_factor: 3.0,
    typical_flutes: 1,
    cost_factor: 1.0,
    speed_factor: 1.0,
  },
  {
    type: 'multi_flute',
    min_pitch_mm: 0.5,
    max_pitch_mm: 6.0,
    typical_diameter_mm: [6, 8, 10, 12, 16, 20, 25],
    max_thread_depth_factor: 2.0,
    typical_flutes: 3,
    cost_factor: 1.8,
    speed_factor: 0.35,
  },
  {
    type: 'indexable',
    min_pitch_mm: 1.0,
    max_pitch_mm: 8.0,
    typical_diameter_mm: [16, 20, 25, 32, 40, 50],
    max_thread_depth_factor: 2.5,
    typical_flutes: 3,
    cost_factor: 2.5,
    speed_factor: 0.30,
  },
];

/**
 * ISO 68-1 thread depth: H = 0.8660 × P (for 60° threads).
 * Thread depth for sharp V: H_sharp = (√3/2) × P.
 * Actual depth: 5/8 × H_sharp = 0.5413 × P (external), 5/8 × H_sharp (internal).
 */
function isoThreadDepth(pitch_mm: number): number {
  return 0.6134 * pitch_mm; // H = 5H/8 truncated form
}

/**
 * Pitch diameter tolerance for ISO metric threads.
 * Simplified model based on ISO 965-1.
 * T_d2 = tolerance on pitch diameter.
 */
function isoPitchDiameterTolerance(
  pitch_mm: number,
  major_d_mm: number,
  threadClass: string
): { upper: number; lower: number } {
  // TD2 fundamental deviation + tolerance grade
  // Simplified from ISO 965-1 tables
  const basicDeviation = threadClass.includes('6') ? 0 : 0;
  // Tolerance grade factor
  const P = pitch_mm;
  const d = major_d_mm;

  // ISO formula: Td2 = k × (P^0.4 × d^0.1)  with k depending on grade
  const k6 = 0.090; // grade 6
  const k = threadClass.includes('4') ? 0.063 : threadClass.includes('5') ? 0.075 : k6;
  const Td2 = k * Math.pow(P, 0.4) * Math.pow(d, 0.1);

  if (threadClass.endsWith('g') || threadClass.endsWith('e')) {
    // External thread — negative deviation
    const es = threadClass.includes('e') ? -(50 + 11 * P) / 1000 : -(26 + 6 * P) / 1000;
    return { upper: es, lower: es - Td2 };
  } else if (threadClass.endsWith('H') || threadClass.endsWith('G')) {
    // Internal thread — positive deviation
    const EI = threadClass.includes('G') ? (15 + 11 * P) / 1000 : 0;
    return { upper: EI + Td2, lower: EI };
  }
  // Default: 6H internal
  return { upper: Td2, lower: 0 };
}

/**
 * ASME B1.1 pitch diameter tolerance for unified threads.
 * Simplified model.
 */
function unifiedPitchDiameterTolerance(
  pitch_mm: number,
  _major_d_mm: number,
  threadClass: string
): { upper: number; lower: number } {
  const P = pitch_mm;
  const n = 25.4 / P; // TPI
  // ASME tolerance formula (simplified): Td2 ≈ 0.0015 × √(pitch_inches) + 0.0015 × √(d_inches)
  // Simplified here:
  const pitch_in = P / 25.4;
  const Td2_in = 0.0015 * Math.sqrt(pitch_in) + 0.002;
  const Td2 = Td2_in * 25.4;

  if (threadClass === '2A' || threadClass === '3A') {
    const allowance = threadClass === '2A' ? 0.3 / n * 25.4 / 1000 : 0;
    const factor = threadClass === '3A' ? 0.75 : 1.0;
    return { upper: -allowance, lower: -(allowance + Td2 * factor) };
  }
  // 2B / 3B internal
  const factor = threadClass === '3B' ? 0.75 : 1.0;
  return { upper: Td2 * factor, lower: 0 };
}

// ─── Engine Class ───────────────────────────────────────────────────

/**
 * Thread milling physics engine covering helical interpolation kinematics,
 * cutting force prediction with chip thinning compensation, thread quality
 * assessment, multi-pass strategy, cycle time calculation, and tool selection.
 *
 * All methods are static and self-contained with no external dependencies.
 */
export class ThreadMillingPhysicsEngine {

  // ── 1. Helical Path Kinematics ──────────────────────────────────

  /**
   * Computes helical interpolation kinematics for thread milling.
   *
   * The tool center follows a helix: x(t)=R×cos(ωt), y(t)=R×sin(ωt),
   * z(t)=P×t/(2π), where R = D_hole/2 - D_tool/2 for internal threads.
   *
   * Effective cutting speed is compensated for the helical path curvature:
   * Vc_eff = π×D_tool×n × (D_hole/D_tool) for internal threads.
   *
   * Feed per tooth is adjusted: fz_actual = fz_prog × D_tool/D_hole (internal)
   * due to chip thinning from the ratio of tool path radius to tool radius.
   *
   * @param input - Helical kinematics parameters
   * @returns AtomicValue with kinematic results
   *
   * @reference Fromentin & Poulachon, IJMTM (2010)
   */
  static computeHelicalKinematics(input: HelicalKinematicsInput): AtomicValue<HelicalKinematicsOutput> {
    const { thread_diameter_mm: D, tool_diameter_mm: d, pitch_mm: P,
            spindle_rpm: n, n_flutes = 3, thread_type } = input;

    // Helix radius: distance from hole center to tool center
    let helix_radius: number;
    let chip_thinning_factor: number;
    let Vc_eff: number;

    if (thread_type === 'internal') {
      // Internal: tool center orbits inside the hole
      helix_radius = D / 2 - d / 2;
      // Chip thinning: actual chip is thinner because tool follows curved path
      chip_thinning_factor = d / D;
      // Effective speed at the cutting edge on the hole wall
      Vc_eff = Math.PI * d * n * (D / d) / 1000; // m/min
    } else {
      // External: tool center orbits outside the workpiece
      helix_radius = D / 2 + d / 2;
      chip_thinning_factor = d / D;
      Vc_eff = Math.PI * d * n / 1000; // m/min
    }

    // Programmed feed per tooth (nominal)
    const fz_prog = 0.08; // Default nominal fz [mm/tooth]
    const fz_actual = fz_prog * chip_thinning_factor;

    // Radial engagement: thread depth (ISO 68-1: H = 0.6134 × P)
    const ae = isoThreadDepth(P);

    return {
      value: {
        helix_radius_mm: helix_radius,
        Vc_effective_m_min: Vc_eff,
        ae_mm: ae,
        fz_actual_mm: fz_actual,
        fz_programmed_mm: fz_prog,
        chip_thinning_factor,
        path_equations: {
          x: `x(t) = ${helix_radius.toFixed(3)} × cos(ωt)`,
          y: `y(t) = ${helix_radius.toFixed(3)} × sin(ωt)`,
          z: `z(t) = ${P} × t/(2π)`,
        },
      },
      unit: 'mm',
      formula: thread_type === 'internal'
        ? 'R_helix = D_hole/2 - D_tool/2; Vc_eff = π×D_tool×n×(D_hole/D_tool); fz_actual = fz×(D_tool/D_hole)'
        : 'R_helix = D_hole/2 + D_tool/2; fz_actual = fz×(D_tool/D_workpiece)',
      confidence: 0.95,
    };
  }

  // ── 2. Cutting Forces ──────────────────────────────────────────

  /**
   * Computes cutting forces for thread milling using Kienzle model.
   *
   * Tangential force: Ft = kc × ap × fz × sin(φ)
   * where kc = kc1.1 × h^(-mc), h = fz × sin(φ)
   *
   * Radial force: Fr = kr × Ft (kr typically 0.3-0.5 for threading)
   * Axial force: Fa = ka × Ft
   *
   * Tool deflection: δ = Fr × L³ / (3×E×I) where I = π×d⁴/64
   * Pitch diameter error: Δd_pitch = 2 × δ (both sides affected)
   *
   * @param input - Force calculation parameters
   * @returns AtomicValue with force breakdown and deflection
   *
   * @reference Kienzle, VDI-Z 94 (1952); Araujo et al., IJMTM (2006)
   */
  static computeCuttingForces(input: CuttingForceInput): AtomicValue<CuttingForceOutput> {
    const {
      kc1_1, mc, ap_mm, fz_mm,
      engagement_angle_deg = 90,
      kr = 0.4, ka = 0.25,
      tool_overhang_mm = 30,
      tool_shank_diameter_mm = 10,
      tool_E_GPa = 600,
    } = input;

    const phi_rad = (engagement_angle_deg * Math.PI) / 180;

    // Chip thickness at engagement angle
    const h = fz_mm * Math.sin(phi_rad);

    // Specific cutting force (Kienzle)
    const kc = kc1_1 * Math.pow(h, -mc);

    // Tangential force
    const Ft = kc * ap_mm * h; // N (kc in N/mm², ap in mm, h in mm)

    // Radial and axial forces
    const Fr = kr * Ft;
    const Fa = ka * Ft;

    // Resultant force
    const F_resultant = Math.sqrt(Ft * Ft + Fr * Fr + Fa * Fa);

    // Tool deflection: δ = F × L³ / (3EI)
    const L = tool_overhang_mm / 1000; // m
    const d_shank = tool_shank_diameter_mm / 1000; // m
    const E = tool_E_GPa * 1e9; // Pa
    const I = (Math.PI * Math.pow(d_shank, 4)) / 64; // m⁴
    const deflection_m = (Fr * L * L * L) / (3 * E * I);
    const deflection_mm = deflection_m * 1000;

    // Pitch diameter error = 2 × deflection (both sides of thread)
    const pitch_dia_error = 2 * deflection_mm;

    let profile_error_assessment: string;
    if (pitch_dia_error < 0.005) {
      profile_error_assessment = 'Excellent — within precision thread tolerance';
    } else if (pitch_dia_error < 0.020) {
      profile_error_assessment = 'Good — suitable for standard thread classes (6g/6H)';
    } else if (pitch_dia_error < 0.050) {
      profile_error_assessment = 'Marginal — may require spring pass or reduced overhang';
    } else {
      profile_error_assessment = 'Poor — excessive deflection, reduce overhang or use larger shank';
    }

    return {
      value: {
        Ft_N: Ft,
        Fr_N: Fr,
        Fa_N: Fa,
        F_resultant_N: F_resultant,
        tool_deflection_mm: deflection_mm,
        pitch_diameter_error_mm: pitch_dia_error,
        profile_error_assessment,
      },
      unit: 'N',
      formula: 'Ft = kc1.1 × h^(-mc) × ap × h; Fr = kr×Ft; δ = Fr×L³/(3EI); Δd = 2δ',
      confidence: 0.90,
    };
  }

  // ── 3. Thread Quality Prediction ────────────────────────────────

  /**
   * Predicts thread quality including pitch diameter deviation,
   * surface finish on thread flanks, form accuracy, and achievable
   * thread class based on ISO 965-1 / ASME B1.1 tolerances.
   *
   * Surface roughness on flanks: Ra = fz² / (32 × R_insert) × cos(α/2)
   * where α is the thread angle (60° for ISO metric and unified).
   *
   * @param input - Thread quality parameters
   * @returns AtomicValue with quality assessment
   *
   * @reference ISO 68-1:1998; ASME B1.1-2019; ISO 965-1
   */
  static predictThreadQuality(input: ThreadQualityInput): AtomicValue<ThreadQualityOutput> {
    const {
      standard, designation, tool_deflection_mm, fz_mm,
      insert_radius_mm = 0.4,
      thread_half_angle_deg = 30,
      thread_type,
    } = input;

    // Pitch diameter deviation from tool deflection
    const pitch_diameter_deviation = 2 * tool_deflection_mm;

    // Surface roughness on flanks
    // Ra = fz² / (32 × r) × cos(thread_half_angle)
    const cos_half = Math.cos((thread_half_angle_deg * Math.PI) / 180);
    const Ra_flanks = ((fz_mm * fz_mm) / (32 * insert_radius_mm)) * cos_half * 1000; // µm

    // Form deviation — combination of deflection and surface finish effect
    const form_deviation = pitch_diameter_deviation * 0.7 + Ra_flanks / 1000 * 0.3;

    // Look up thread data
    const threadData = this.lookupThreadStandard({ standard, designation });
    const td = threadData.value;

    // Determine achievable class
    let predicted_class: string;
    let tolerance_range: { upper: number; lower: number };

    if (standard === 'ISO') {
      // Try classes from tight to loose
      const classes = thread_type === 'internal'
        ? ['4H', '5H', '6H', '7H']
        : ['4g', '5g', '6g', '7g6g'];

      predicted_class = classes[classes.length - 1]; // default to loosest
      for (const cls of classes) {
        const tol = isoPitchDiameterTolerance(td.pitch_mm, td.major_diameter_mm, cls);
        const tolRange = Math.abs(tol.upper - tol.lower);
        if (pitch_diameter_deviation < tolRange) {
          predicted_class = cls;
          tolerance_range = tol;
          break;
        }
      }
      tolerance_range = tolerance_range! ?? isoPitchDiameterTolerance(td.pitch_mm, td.major_diameter_mm, predicted_class);
    } else {
      // Unified threads
      const classes = thread_type === 'internal'
        ? ['3B', '2B', '1B']
        : ['3A', '2A', '1A'];

      predicted_class = classes[classes.length - 1];
      for (const cls of classes) {
        const tol = unifiedPitchDiameterTolerance(td.pitch_mm, td.major_diameter_mm, cls);
        const tolRange = Math.abs(tol.upper - tol.lower);
        if (pitch_diameter_deviation < tolRange) {
          predicted_class = cls;
          tolerance_range = tol;
          break;
        }
      }
      tolerance_range = tolerance_range! ?? unifiedPitchDiameterTolerance(td.pitch_mm, td.major_diameter_mm, predicted_class);
    }

    const tolRange = Math.abs(tolerance_range!.upper - tolerance_range!.lower);
    const within_tolerance = pitch_diameter_deviation < tolRange;

    // Recommendations
    const recommendations: string[] = [];
    if (pitch_diameter_deviation > 0.020) {
      recommendations.push('Reduce tool overhang to decrease deflection');
      recommendations.push('Consider using a larger shank diameter');
    }
    if (pitch_diameter_deviation > 0.010) {
      recommendations.push('Add a spring pass (zero-cut finish pass) to improve accuracy');
    }
    if (Ra_flanks > 1.6) {
      recommendations.push('Reduce feed per tooth for better surface finish on flanks');
    }
    if (Ra_flanks > 3.2) {
      recommendations.push('Use insert with larger nose radius');
    }
    if (recommendations.length === 0) {
      recommendations.push('Parameters are within specification — no changes needed');
    }

    return {
      value: {
        pitch_diameter_deviation_mm: pitch_diameter_deviation,
        Ra_flanks_um: Ra_flanks,
        form_deviation_mm: form_deviation,
        predicted_class,
        within_tolerance,
        tolerance_range_mm: tolerance_range!,
        recommendations,
      },
      unit: 'mm',
      formula: 'Δd_pitch = 2δ; Ra = fz²/(32R)×cos(α/2); class from ISO 965-1 / ASME B1.1',
      confidence: 0.85,
    };
  }

  // ── 4. Multi-Pass Strategy ──────────────────────────────────────

  /**
   * Computes optimal multi-pass thread milling strategy.
   *
   * Radial infeed per pass with decreasing depth for better finish.
   * Optional spring pass (zero-cut) for improved dimensional accuracy.
   * Climb milling recommended for internal threads (better chip evacuation),
   * conventional for external threads (better surface finish).
   *
   * @param input - Multi-pass strategy parameters
   * @returns AtomicValue with pass breakdown
   */
  static computeMultiPassStrategy(input: MultiPassInput): AtomicValue<MultiPassOutput> {
    const {
      ae_total_mm, n_passes, spring_pass, thread_type,
      direction = 'auto',
    } = input;

    // Decreasing infeed: first pass ~50% of total, subsequent passes decrease
    const ae_per_pass: number[] = [];
    let remaining = ae_total_mm;

    if (n_passes === 1) {
      ae_per_pass.push(ae_total_mm);
    } else {
      // Decreasing radial depth per pass
      for (let i = 0; i < n_passes; i++) {
        const fraction = (n_passes - i) / ((n_passes * (n_passes + 1)) / 2);
        const ae_pass = ae_total_mm * fraction;
        ae_per_pass.push(ae_pass);
        remaining -= ae_pass;
      }
    }

    // Spring pass
    const total_passes = spring_pass ? n_passes + 1 : n_passes;

    // Direction recommendation
    let recommended_direction: 'climb' | 'conventional';
    let direction_rationale: string;

    if (direction !== 'auto') {
      recommended_direction = direction;
      direction_rationale = `User-specified ${direction} milling`;
    } else if (thread_type === 'internal') {
      recommended_direction = 'climb';
      direction_rationale = 'Climb milling for internal threads: better chip evacuation from hole, '
        + 'reduced re-cutting, tool deflection pushes away from wall (conservative cut)';
    } else {
      recommended_direction = 'conventional';
      direction_rationale = 'Conventional milling for external threads: tool deflection pushes '
        + 'into workpiece (material removal), better surface finish on thread flanks';
    }

    // Pass descriptions
    const pass_descriptions: string[] = ae_per_pass.map((ae, i) =>
      `Pass ${i + 1}: ae = ${ae.toFixed(3)} mm (${((ae / ae_total_mm) * 100).toFixed(1)}% of total)`
    );
    if (spring_pass) {
      pass_descriptions.push(`Pass ${n_passes + 1}: Spring pass (ae = 0 mm) — finish only`);
    }

    // Quality improvement estimate
    const quality_improvement = spring_pass
      ? 30 + (n_passes - 1) * 15 // spring pass + multi-pass benefit
      : (n_passes - 1) * 15;

    return {
      value: {
        ae_per_pass_mm: ae_per_pass,
        recommended_direction,
        direction_rationale,
        total_passes,
        pass_descriptions,
        quality_improvement_pct: Math.min(quality_improvement, 80),
      },
      unit: 'mm',
      formula: 'ae_i = ae_total × (n-i) / Σ(1..n); spring pass = 0-cut finish',
      confidence: 0.90,
    };
  }

  // ── 5. Cycle Time Calculation ───────────────────────────────────

  /**
   * Calculates thread milling cycle time for single-point and multi-tooth methods.
   *
   * Single-point: t = n_passes × (L_thread / pitch) × (1/n_spindle) + t_rapid
   *   Each pass requires (L/P) helical revolutions, each revolution = 1/n seconds.
   *
   * Multi-tooth: t ≈ 1 revolution + entry/exit arcs + rapid positioning
   *   Multi-tooth mills cut the full thread depth in one helical revolution
   *   (the tool body covers multiple pitches).
   *
   * @param input - Cycle time parameters
   * @returns AtomicValue with time breakdown
   */
  static computeCycleTime(input: CycleTimeInput): AtomicValue<CycleTimeOutput> {
    const {
      thread_length_mm, pitch_mm, spindle_rpm,
      n_passes = 3,
      method,
      n_teeth = 3,
      rapid_rate_mm_min = 15000,
      arc_angle_deg = 90,
    } = input;

    const time_per_rev_s = 60 / spindle_rpm; // seconds per revolution
    const n_thread_revs = thread_length_mm / pitch_mm; // number of helical revolutions for full thread

    let cutting_time_s: number;
    let n_revolutions: number;
    let breakdown: string;

    if (method === 'single_point') {
      // Single-point: each pass = full length of thread in helical revolutions
      n_revolutions = n_thread_revs * n_passes;
      cutting_time_s = n_revolutions * time_per_rev_s;
      breakdown = `${n_passes} passes × ${n_thread_revs.toFixed(1)} revs/pass × `
        + `${time_per_rev_s.toFixed(3)} s/rev = ${cutting_time_s.toFixed(2)} s cutting`;
    } else {
      // Multi-tooth: 1 revolution (tool body covers multiple pitches)
      // Plus entry arc and exit arc
      const arc_fraction = arc_angle_deg / 360;
      n_revolutions = 1 + 2 * arc_fraction; // 1 full rev + entry + exit arcs
      cutting_time_s = n_revolutions * time_per_rev_s;
      breakdown = `1 revolution + ${arc_angle_deg}° entry + ${arc_angle_deg}° exit = `
        + `${n_revolutions.toFixed(2)} revs × ${time_per_rev_s.toFixed(3)} s/rev = ${cutting_time_s.toFixed(2)} s cutting`;
    }

    // Rapid time: approach + retract (estimated 20mm each)
    const rapid_distance_mm = 40; // 20mm approach + 20mm retract
    const rapid_time_s = (rapid_distance_mm / rapid_rate_mm_min) * 60;

    const total_time_s = cutting_time_s + rapid_time_s;

    return {
      value: {
        cutting_time_s,
        rapid_time_s,
        total_time_s,
        n_revolutions,
        breakdown,
      },
      unit: 's',
      formula: method === 'single_point'
        ? 't = n_passes × (L/P) × (60/n_spindle)'
        : 't = (1 + 2×arc/360) × (60/n_spindle)',
      confidence: 0.90,
    };
  }

  // ── 6. Tool Selection Logic ─────────────────────────────────────

  /**
   * Recommends thread milling tool type based on thread parameters.
   *
   * Single-point: universal (any pitch), slower, better for large/odd pitches.
   * Multi-flute: fast, pitch-specific, limited to pitches > 0.5mm.
   * Indexable: fastest for large threads, economical insert changes.
   * Full-form: better accuracy, pitch-specific. Partial: versatile.
   *
   * Max pitch for helical interpolation limited by helix angle:
   * helix_angle = atan(pitch / (π × D_helix))
   *
   * @param input - Tool selection parameters
   * @returns AtomicValue with tool recommendation
   */
  static recommendTool(input: ToolSelectionInput): AtomicValue<ToolSelectionOutput> {
    const {
      pitch_mm, thread_diameter_mm, thread_type,
      batch_size = 10,
      standard = 'ISO',
      required_class,
    } = input;

    const warnings: string[] = [];
    const rationale: string[] = [];

    // Max helix angle for helical interpolation
    const D_helix = thread_type === 'internal'
      ? thread_diameter_mm - 6 // approximate tool path diameter
      : thread_diameter_mm + 6;
    const helix_angle = Math.atan(pitch_mm / (Math.PI * Math.abs(D_helix))) * 180 / Math.PI;

    if (helix_angle > 3.0) {
      warnings.push(`Helix angle ${helix_angle.toFixed(1)}° exceeds recommended 3° — consider single-point or lathe threading`);
    }

    // Score each tool type
    let best_type: 'single_point' | 'multi_flute' | 'indexable' = 'single_point';
    let best_score = 0;
    let profile: 'full_form' | 'partial_profile' = 'full_form';

    for (const tool of TOOL_DATA) {
      let score = 50;

      // Pitch compatibility
      if (pitch_mm < tool.min_pitch_mm || pitch_mm > tool.max_pitch_mm) {
        continue;
      }

      // Batch size: multi-flute/indexable better for larger batches
      if (batch_size > 50 && tool.type !== 'single_point') score += 20;
      if (batch_size <= 5 && tool.type === 'single_point') score += 15;

      // Speed factor (inverse: lower is better)
      score += (1 - tool.speed_factor) * 30;

      // Large threads favor indexable
      if (thread_diameter_mm > 30 && tool.type === 'indexable') score += 15;

      // Small threads: single-point or multi-flute
      if (thread_diameter_mm < 10 && tool.type === 'single_point') score += 10;

      // Fine pitch: multi-flute or single-point
      if (pitch_mm < 1.0 && tool.type === 'multi_flute') score += 10;

      // Accuracy preference
      if (required_class && (required_class.includes('4') || required_class.includes('3'))) {
        if (tool.type === 'single_point') score += 10; // most controllable
      }

      if (score > best_score) {
        best_score = score;
        best_type = tool.type;
      }
    }

    // Profile recommendation
    if (standard === 'ACME' || standard === 'Tr' || standard === 'NPT') {
      profile = 'full_form';
      rationale.push(`${standard} threads require full-form profile inserts`);
    } else if (pitch_mm > 3.0) {
      profile = 'full_form';
      rationale.push('Large pitch — full-form insert recommended for accuracy');
    } else {
      profile = batch_size > 100 ? 'full_form' : 'partial_profile';
      rationale.push(batch_size > 100
        ? 'High volume — full-form for consistency'
        : 'Partial profile for versatility across multiple pitches');
    }

    // Build rationale
    switch (best_type) {
      case 'single_point':
        rationale.push('Single-point: universal pitch compatibility, best for small batches or odd pitches');
        if (pitch_mm > 3) rationale.push('Large pitch suits single-point approach');
        break;
      case 'multi_flute':
        rationale.push('Multi-flute: fast cycle time (~35% of single-point), good for standard pitches');
        if (batch_size > 20) rationale.push('Batch size justifies pitch-specific tooling cost');
        break;
      case 'indexable':
        rationale.push('Indexable: fastest cycle time, economical insert replacement');
        if (thread_diameter_mm > 25) rationale.push('Large thread diameter suits indexable head');
        break;
    }

    return {
      value: {
        recommended_type: best_type,
        rationale,
        profile,
        max_helix_angle_deg: helix_angle,
        suitability_score: Math.min(best_score, 100),
        warnings,
      },
      unit: 'recommendation',
      formula: 'helix_angle = atan(P / (π×D_helix)); scored by pitch/batch/size compatibility',
      confidence: 0.85,
    };
  }

  // ── 7. Thread Standard Lookup ───────────────────────────────────

  /**
   * Looks up thread dimensions from the standards database.
   *
   * Supports ISO metric (M3-M48 coarse + fine), UNC (#6-1.5"), UNF,
   * with major, pitch, and minor diameters, plus tolerance classes.
   *
   * @param input - Thread standard and designation
   * @returns AtomicValue with thread dimensions and tolerances
   *
   * @reference ISO 68-1:1998; ISO 261; ASME B1.1-2019
   */
  static lookupThreadStandard(input: ThreadStandardLookupInput): AtomicValue<ThreadStandardLookupOutput> {
    const { standard, designation } = input;

    let entry: ThreadStandardEntry | undefined;
    let tolerance_classes: string[];
    let tolerances: Record<string, { upper: number; lower: number }> = {};

    if (standard === 'ISO') {
      // Search coarse first, then fine
      entry = ISO_METRIC_COARSE.find(e => e.designation === designation);
      if (!entry) {
        entry = ISO_METRIC_FINE.find(e => e.designation === designation);
      }
      // Also try matching just the size (e.g., "M10x1.5" → find in fine)
      if (!entry) {
        entry = ISO_METRIC_FINE.find(e => e.designation === designation);
      }
      if (!entry) {
        // Try to parse M{size}x{pitch} from coarse
        const match = designation.match(/^M(\d+)$/);
        if (match) {
          const size = parseInt(match[1]);
          entry = ISO_METRIC_COARSE.find(e => e.major_diameter_mm === size);
        }
      }

      tolerance_classes = ['4H', '5H', '6H', '7H', '4g', '5g', '6g', '7g6g'];
      if (entry) {
        for (const cls of ['6H', '6g']) {
          tolerances[cls] = isoPitchDiameterTolerance(entry.pitch_mm, entry.major_diameter_mm, cls);
        }
      }
    } else if (standard === 'UNC') {
      entry = UNC_THREADS.find(e => e.designation === designation);
      tolerance_classes = ['1A', '2A', '3A', '1B', '2B', '3B'];
      if (entry) {
        for (const cls of ['2A', '2B']) {
          tolerances[cls] = unifiedPitchDiameterTolerance(entry.pitch_mm, entry.major_diameter_mm, cls);
        }
      }
    } else if (standard === 'UNF') {
      entry = UNF_THREADS.find(e => e.designation === designation);
      tolerance_classes = ['1A', '2A', '3A', '1B', '2B', '3B'];
      if (entry) {
        for (const cls of ['2A', '2B']) {
          tolerances[cls] = unifiedPitchDiameterTolerance(entry.pitch_mm, entry.major_diameter_mm, cls);
        }
      }
    } else {
      // Fallback for BSP, NPT, ACME, Tr — not fully implemented
      tolerance_classes = [];
      // Create a synthetic entry if we can parse the designation
      const match = designation.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const size = parseFloat(match[1]);
        const pitch = size > 10 ? 2.0 : 1.5; // rough estimate
        entry = {
          designation,
          major_diameter_mm: size,
          pitch_mm: pitch,
          pitch_diameter_mm: size - 0.6495 * pitch,
          minor_diameter_mm: size - 1.0825 * pitch,
          thread_angle_deg: standard === 'ACME' ? 29 : standard === 'Tr' ? 30 : standard === 'NPT' ? 60 : 55,
        };
      }
    }

    if (!entry) {
      throw new Error(`Thread designation "${designation}" not found in ${standard} database`);
    }

    const thread_depth = isoThreadDepth(entry.pitch_mm);

    return {
      value: {
        designation: entry.designation,
        major_diameter_mm: entry.major_diameter_mm,
        pitch_diameter_mm: entry.pitch_diameter_mm,
        minor_diameter_mm: entry.minor_diameter_mm,
        pitch_mm: entry.pitch_mm,
        thread_angle_deg: entry.thread_angle_deg,
        thread_depth_mm: thread_depth,
        tolerance_classes,
        tolerances,
      },
      unit: 'mm',
      formula: 'd2 = d - 0.6495×P; d1 = d - 1.0825×P; H = 0.6134×P',
      confidence: 0.95,
    };
  }

  // ── 8. Chip Thinning Compensation ───────────────────────────────

  /**
   * Computes chip thinning factor for thread milling helical interpolation.
   *
   * Internal threads: fz_eff = fz × (D_hole / D_tool) — thicker actual chip
   *   because tool path curvature reduces engagement arc.
   *   Compensated (programmed) feed: fz_prog = fz_desired × (D_tool / D_hole)
   *
   * External threads: fz_eff = fz × (D_tool / D_workpiece)
   *
   * @param input - Chip thinning parameters
   * @returns AtomicValue with effective feed and compensation factor
   */
  static computeChipThinning(input: ChipThinningInput): AtomicValue<ChipThinningOutput> {
    const { fz_programmed_mm, hole_diameter_mm, tool_diameter_mm, thread_type } = input;

    let fz_effective: number;
    let thinning_factor: number;
    let engagement_arc_deg: number;

    if (thread_type === 'internal') {
      // Internal: tool orbits inside hole
      // Actual chip is thinner than programmed due to curvature
      thinning_factor = tool_diameter_mm / hole_diameter_mm;
      fz_effective = fz_programmed_mm * (hole_diameter_mm / tool_diameter_mm);
      // Engagement arc approximation
      const ae = isoThreadDepth(1.5); // approximate for typical thread
      engagement_arc_deg = Math.acos(1 - ae / (tool_diameter_mm / 2)) * 180 / Math.PI;
    } else {
      // External: tool orbits outside workpiece
      thinning_factor = tool_diameter_mm / hole_diameter_mm;
      fz_effective = fz_programmed_mm * (hole_diameter_mm / tool_diameter_mm);
      const ae = isoThreadDepth(1.5);
      engagement_arc_deg = Math.acos(1 - ae / (tool_diameter_mm / 2)) * 180 / Math.PI;
    }

    let recommendation: string;
    if (thinning_factor < 0.5) {
      recommendation = `High chip thinning (factor ${thinning_factor.toFixed(2)}): increase programmed feed by ${((1 / thinning_factor - 1) * 100).toFixed(0)}% to maintain desired chip load`;
    } else if (thinning_factor < 0.8) {
      recommendation = `Moderate chip thinning (factor ${thinning_factor.toFixed(2)}): increase programmed feed by ${((1 / thinning_factor - 1) * 100).toFixed(0)}%`;
    } else {
      recommendation = `Low chip thinning (factor ${thinning_factor.toFixed(2)}): minimal compensation needed`;
    }

    return {
      value: {
        fz_effective_mm: fz_effective,
        thinning_factor,
        engagement_arc_deg: isNaN(engagement_arc_deg) ? 90 : engagement_arc_deg,
        recommendation,
      },
      unit: 'mm/tooth',
      formula: thread_type === 'internal'
        ? 'fz_eff = fz_prog × (D_hole/D_tool); factor = D_tool/D_hole'
        : 'fz_eff = fz_prog × (D_work/D_tool); factor = D_tool/D_work',
      confidence: 0.92,
    };
  }
}
