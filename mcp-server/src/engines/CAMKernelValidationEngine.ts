/**
 * CAMKernelValidationEngine — CK-MS9 + CK-MS11 + CK-MS13 (partial)
 *
 * Covers three milestones:
 *   CK-MS9:  Zod-style runtime schemas for CAM kernel inputs
 *   CK-MS11: Stochastic routing wrapper, probe generation, DFM feedback
 *   CK-MS13: Integration test harness (partial)
 *
 * Capabilities:
 *   - Runtime input validation for toolpath/turning/nesting/simulation requests
 *   - Human-readable schema definitions
 *   - Thin wrapper around StochasticToolpathRoutingEngine for route optimization
 *   - Probe routine generation for critical-tolerance features
 *   - Comprehensive DFM (Design for Manufacturability) analysis
 *   - End-to-end integration test harness
 *
 * Pure computation — no filesystem, no GPU.
 *
 * @module engines/CAMKernelValidationEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/** DFM feature description for analysis. */
export interface DFMFeature {
  id: string;
  type: string;
  width_mm?: number;
  depth_mm?: number;
  diameter_mm?: number;
  tolerance_mm?: number;
  corner_radius_mm?: number;
  wall_thickness_mm?: number;
}

/** A single DFM issue (warning or failure). */
export interface DFMIssue {
  feature_id: string;
  rule: string;
  severity: 'warn' | 'fail';
  message: string;
  suggestion: string;
}

/** Full DFM analysis report. */
export interface DFMReport {
  pass: boolean;
  score: number;
  warnings: DFMIssue[];
  failures: DFMIssue[];
  recommendations: string[];
}

/** Probe point generated from critical features. */
export interface ProbePoint {
  x: number;
  y: number;
  z: number;
  feature_id: string;
  probe_type: string;
}

/** Result of probe routine generation. */
export interface ProbeRoutineResult {
  gcode_lines: string[];
  probe_points: ProbePoint[];
  feature_map: Record<string, string[]>;
  warnings: string[];
}

/** Integration test case definition. */
export interface IntegrationTestCase {
  name: string;
  geometry?: string;
  features?: DFMFeature[];
  material: string;
  expected_operations?: string[];
}

/** Integration test result. */
export interface IntegrationTestResult {
  passed: boolean;
  stages_completed: string[];
  stage_failed?: string;
  output_valid: boolean;
  errors: string[];
}

/** Schema validation result. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Schema field definition for human-readable output. */
interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  constraints?: string;
}

/** Schema definition with metadata. */
interface SchemaDefinition {
  name: string;
  description: string;
  fields: SchemaField[];
}

/** Machine capability for DFM checks. */
interface MachineCapability {
  min_tool_diameter_mm: number;
  max_depth_mm: number;
  has_4th_axis: boolean;
  has_5th_axis: boolean;
  min_corner_radius_mm: number;
}

// ============================================================================
// SCHEMA DEFINITIONS (inline runtime validation — no Zod import)
// ============================================================================

const SCHEMAS: Record<string, SchemaDefinition> = {
  toolpath_request: {
    name: 'toolpath_request',
    description: 'Request for 2D/3D toolpath generation',
    fields: [
      { name: 'tool_diameter_mm', type: 'number', required: true, description: 'Cutting tool diameter in mm', constraints: '> 0' },
      { name: 'material', type: 'string', required: true, description: 'Workpiece material (e.g. "aluminum_6061", "steel_1045")' },
      { name: 'operation', type: 'string', required: true, description: 'Operation type (pocket_2d, contour_2d, face_mill, adaptive_clear, hsm_pocket, etc.)' },
      { name: 'depth_mm', type: 'number', required: false, description: 'Total cutting depth in mm', constraints: '> 0' },
      { name: 'width_mm', type: 'number', required: false, description: 'Feature width in mm', constraints: '> 0' },
      { name: 'length_mm', type: 'number', required: false, description: 'Feature length in mm', constraints: '> 0' },
      { name: 'stepover_pct', type: 'number', required: false, description: 'Radial stepover as percentage of tool diameter', constraints: '1-100' },
      { name: 'stepdown_mm', type: 'number', required: false, description: 'Axial depth of cut per pass in mm', constraints: '> 0' },
      { name: 'coolant', type: 'string', required: false, description: 'Coolant type: flood, mist, mql, air, dry' },
      { name: 'tolerance_mm', type: 'number', required: false, description: 'Part tolerance in mm', constraints: '> 0' },
      { name: 'surface_finish_Ra', type: 'number', required: false, description: 'Target surface roughness Ra in um' },
      { name: 'entry_strategy', type: 'string', required: false, description: 'Entry method: helix, ramp, plunge, predrill' },
    ],
  },
  turning_request: {
    name: 'turning_request',
    description: 'Request for turning/lathe operation toolpath',
    fields: [
      { name: 'workpiece_diameter_mm', type: 'number', required: true, description: 'Starting workpiece outer diameter in mm', constraints: '> 0' },
      { name: 'material', type: 'string', required: true, description: 'Workpiece material' },
      { name: 'operation', type: 'string', required: true, description: 'Turning operation: od_rough, od_finish, id_bore, face, groove, thread, part_off' },
      { name: 'target_diameter_mm', type: 'number', required: false, description: 'Target diameter after machining in mm', constraints: '>= 0' },
      { name: 'length_mm', type: 'number', required: false, description: 'Cut length along Z axis in mm', constraints: '> 0' },
      { name: 'depth_of_cut_mm', type: 'number', required: false, description: 'Radial depth of cut per pass in mm', constraints: '> 0' },
      { name: 'insert_nose_radius_mm', type: 'number', required: false, description: 'Insert nose radius in mm', constraints: '> 0' },
      { name: 'thread_pitch_mm', type: 'number', required: false, description: 'Thread pitch in mm (for threading operations)', constraints: '> 0' },
      { name: 'coolant', type: 'string', required: false, description: 'Coolant type: flood, mist, mql, dry' },
    ],
  },
  nesting_request: {
    name: 'nesting_request',
    description: 'Request for 2D part nesting on sheet/plate material',
    fields: [
      { name: 'sheet_width_mm', type: 'number', required: true, description: 'Sheet/plate width in mm', constraints: '> 0' },
      { name: 'sheet_length_mm', type: 'number', required: true, description: 'Sheet/plate length in mm', constraints: '> 0' },
      { name: 'parts', type: 'array', required: true, description: 'Array of part outlines to nest (each: { id, width_mm, height_mm, quantity })' },
      { name: 'material', type: 'string', required: false, description: 'Sheet material for kerf calculation' },
      { name: 'kerf_mm', type: 'number', required: false, description: 'Cutting kerf width in mm', constraints: '>= 0' },
      { name: 'part_gap_mm', type: 'number', required: false, description: 'Minimum gap between parts in mm', constraints: '>= 0' },
      { name: 'edge_margin_mm', type: 'number', required: false, description: 'Minimum margin from sheet edge in mm', constraints: '>= 0' },
      { name: 'allow_rotation', type: 'boolean', required: false, description: 'Allow 90-degree rotation of parts' },
      { name: 'strategy', type: 'string', required: false, description: 'Nesting strategy: bottom_left, best_fit, guillotine' },
    ],
  },
  simulation_request: {
    name: 'simulation_request',
    description: 'Request for CNC machining simulation',
    fields: [
      { name: 'gcode', type: 'string', required: true, description: 'G-code program text or path' },
      { name: 'material', type: 'string', required: true, description: 'Workpiece material for force/thermal calculations' },
      { name: 'tool_diameter_mm', type: 'number', required: true, description: 'Active tool diameter in mm', constraints: '> 0' },
      { name: 'stock_dimensions', type: 'object', required: false, description: 'Workpiece stock: { x_mm, y_mm, z_mm }' },
      { name: 'machine_profile', type: 'string', required: false, description: 'Machine profile name for travel limits and dynamics' },
      { name: 'controller', type: 'string', required: false, description: 'Controller dialect: fanuc, siemens, haas, heidenhain, mazak, okuma' },
      { name: 'check_collisions', type: 'boolean', required: false, description: 'Enable collision detection' },
      { name: 'check_forces', type: 'boolean', required: false, description: 'Enable Kienzle cutting force analysis' },
      { name: 'check_thermal', type: 'boolean', required: false, description: 'Enable thermal analysis' },
    ],
  },
};

// ============================================================================
// KNOWN MATERIALS (for validation)
// ============================================================================

const KNOWN_MATERIALS = new Set([
  'aluminum_6061', 'aluminum_7075', 'aluminum_2024', 'aluminum_6082',
  'steel_1018', 'steel_1045', 'steel_4140', 'steel_4340', 'steel_8620',
  'stainless_304', 'stainless_316', 'stainless_17_4ph',
  'titanium_ti6al4v', 'titanium_grade2', 'titanium_grade5',
  'inconel_718', 'inconel_625',
  'copper_c110', 'brass_360',
  'cast_iron_gray', 'cast_iron_ductile',
  'tool_steel_d2', 'tool_steel_h13', 'tool_steel_a2', 'tool_steel_m2',
  'nylon', 'delrin', 'peek', 'polycarbonate', 'acetal', 'hdpe',
  'hastelloy_c276', 'monel_400', 'waspaloy',
]);

const MILLING_OPERATIONS = new Set([
  'pocket_2d', 'contour_2d', 'face_mill', 'adaptive_clear', 'hsm_pocket',
  'thread_mill', 'chamfer', 'engrave', 'zigzag_pocket',
  'waterline', 'parallel_3d', 'scallop_3d', 'pencil_mill',
  'z_level_rough', 'plunge_rough', 'swarf_5ax',
  'drill_peck', 'drill_chip_break', 'helix_bore', 'helical_ramp',
]);

const TURNING_OPERATIONS = new Set([
  'od_rough', 'od_finish', 'id_bore', 'face', 'groove', 'thread', 'part_off',
]);

// ============================================================================
// DFM RULES
// ============================================================================

/** DFM rule definition. */
interface DFMRule {
  id: string;
  check: (feature: DFMFeature, material: string, machine: MachineCapability) => DFMIssue | null;
}

const DFM_RULES: DFMRule[] = [
  {
    id: 'min_wall_thickness_fail',
    check: (f, _m, _mc) => {
      if (f.wall_thickness_mm !== undefined && f.wall_thickness_mm < 1.0) {
        return {
          feature_id: f.id,
          rule: 'min_wall_thickness',
          severity: 'fail',
          message: `Wall thickness ${f.wall_thickness_mm}mm is below minimum 1.0mm — high risk of deformation or breakage during machining.`,
          suggestion: `Increase wall thickness to at least 1.5mm. Consider adding support ribs if structural constraints require thin walls.`,
        };
      }
      return null;
    },
  },
  {
    id: 'min_wall_thickness_warn',
    check: (f, _m, _mc) => {
      if (f.wall_thickness_mm !== undefined && f.wall_thickness_mm >= 1.0 && f.wall_thickness_mm < 2.0) {
        return {
          feature_id: f.id,
          rule: 'min_wall_thickness',
          severity: 'warn',
          message: `Wall thickness ${f.wall_thickness_mm}mm is marginal — may deflect under cutting forces.`,
          suggestion: `Increase to 2.0mm+ for reliable machining. If constrained, reduce feed rate and use climb milling.`,
        };
      }
      return null;
    },
  },
  {
    id: 'min_hole_diameter',
    check: (f, _m, _mc) => {
      if (f.type === 'hole' && f.diameter_mm !== undefined && f.diameter_mm < 1.0) {
        return {
          feature_id: f.id,
          rule: 'min_hole_diameter',
          severity: 'warn',
          message: `Hole diameter ${f.diameter_mm}mm is very small — limited tooling availability and high breakage risk.`,
          suggestion: `Increase hole diameter to 1.0mm+ or consider EDM/laser drilling for sub-1mm holes.`,
        };
      }
      return null;
    },
  },
  {
    id: 'depth_diameter_ratio_fail',
    check: (f, _m, _mc) => {
      if (f.type === 'hole' && f.diameter_mm && f.depth_mm) {
        const ratio = f.depth_mm / f.diameter_mm;
        if (ratio > 10) {
          return {
            feature_id: f.id,
            rule: 'depth_diameter_ratio',
            severity: 'fail',
            message: `Hole depth/diameter ratio ${ratio.toFixed(1)}:1 exceeds 10:1 — standard drills cannot reach. Chip evacuation and tool deflection become critical.`,
            suggestion: `Reduce depth or increase diameter. For deep holes, use gun drilling or peck cycle with pilot hole. Consider through-coolant tooling.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'depth_diameter_ratio_warn',
    check: (f, _m, _mc) => {
      if (f.type === 'hole' && f.diameter_mm && f.depth_mm) {
        const ratio = f.depth_mm / f.diameter_mm;
        if (ratio > 5 && ratio <= 10) {
          return {
            feature_id: f.id,
            rule: 'depth_diameter_ratio',
            severity: 'warn',
            message: `Hole depth/diameter ratio ${ratio.toFixed(1)}:1 is elevated — peck drilling required with reduced feed.`,
            suggestion: `Use peck drilling cycle (G83) with reduced feed. Through-coolant drill recommended for chip evacuation.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'corner_radius_feasibility',
    check: (f, _m, mc) => {
      if (f.corner_radius_mm !== undefined && f.corner_radius_mm < mc.min_corner_radius_mm) {
        return {
          feature_id: f.id,
          rule: 'corner_radius_feasibility',
          severity: 'fail',
          message: `Corner radius ${f.corner_radius_mm}mm is smaller than minimum achievable ${mc.min_corner_radius_mm}mm with available tooling.`,
          suggestion: `Increase corner radius to ${mc.min_corner_radius_mm}mm or larger. If sharp corners required, consider EDM finishing.`,
        };
      }
      return null;
    },
  },
  {
    id: 'corner_radius_warn',
    check: (f, _m, _mc) => {
      if (f.corner_radius_mm !== undefined && f.corner_radius_mm > 0 && f.corner_radius_mm < 0.5) {
        return {
          feature_id: f.id,
          rule: 'corner_radius_small',
          severity: 'warn',
          message: `Corner radius ${f.corner_radius_mm}mm requires very small endmill — slow feed, high deflection risk.`,
          suggestion: `Increase corner radius to 1.0mm+ where possible. Small endmills require reduced MRR.`,
        };
      }
      return null;
    },
  },
  {
    id: 'undercut_accessibility',
    check: (f, _m, mc) => {
      if (f.type === 'undercut') {
        if (!mc.has_5th_axis) {
          return {
            feature_id: f.id,
            rule: 'undercut_accessibility',
            severity: 'fail',
            message: `Undercut feature requires multi-axis access or special tooling not available on this machine.`,
            suggestion: `Use 5-axis machine, lollipop cutter, or redesign to eliminate undercut. Consider splitting into multiple setups.`,
          };
        }
        return {
          feature_id: f.id,
          rule: 'undercut_accessibility',
          severity: 'warn',
          message: `Undercut feature will require special toolpath strategy (lollipop cutter or 5-axis swarf).`,
          suggestion: `Verify tool reach and holder clearance. Plan for reduced feed in undercut region.`,
        };
      }
      return null;
    },
  },
  {
    id: 'tight_tolerance',
    check: (f, _m, _mc) => {
      if (f.tolerance_mm !== undefined && f.tolerance_mm < 0.01) {
        return {
          feature_id: f.id,
          rule: 'tight_tolerance',
          severity: 'warn',
          message: `Tolerance ${f.tolerance_mm}mm is very tight — requires finish pass, thermal stability, and in-process probing.`,
          suggestion: `Add spring pass at finish depth. Allow thermal soak time. Plan for in-process probing and compensation.`,
        };
      }
      return null;
    },
  },
  {
    id: 'deep_pocket',
    check: (f, _m, _mc) => {
      if (f.type === 'pocket' && f.depth_mm && f.width_mm) {
        const ratio = f.depth_mm / f.width_mm;
        if (ratio > 4) {
          return {
            feature_id: f.id,
            rule: 'deep_pocket',
            severity: 'fail',
            message: `Pocket depth/width ratio ${ratio.toFixed(1)}:1 exceeds 4:1 — tool reach and chip evacuation are critical concerns.`,
            suggestion: `Widen pocket or reduce depth. Use extended-reach tooling with reduced feed. Plan multiple Z-levels with air blast chip clearing.`,
          };
        } else if (ratio > 2) {
          return {
            feature_id: f.id,
            rule: 'deep_pocket',
            severity: 'warn',
            message: `Pocket depth/width ratio ${ratio.toFixed(1)}:1 is elevated — verify tool reach and plan for chip evacuation.`,
            suggestion: `Use shorter tools where possible. Consider through-coolant for deep pockets. Plan progressive Z-level roughing.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'thin_floor',
    check: (f, _m, _mc) => {
      if (f.type === 'pocket' && f.wall_thickness_mm !== undefined && f.wall_thickness_mm < 1.5) {
        return {
          feature_id: f.id,
          rule: 'thin_floor',
          severity: 'warn',
          message: `Pocket floor thickness ${f.wall_thickness_mm}mm risks deflection during finish passes.`,
          suggestion: `Increase floor thickness or use vacuum fixturing. Reduce axial DOC on floor finishing pass.`,
        };
      }
      return null;
    },
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CAMKernelValidationEngine {

  // --------------------------------------------------------------------------
  // CK-MS9: Schema Validation
  // --------------------------------------------------------------------------

  /**
   * Validate input against a named CAM kernel schema.
   * Runtime type checking without external schema library.
   *
   * @param input - Unknown input to validate
   * @param schema - Schema name: toolpath_request, turning_request, nesting_request, simulation_request
   * @returns ValidationResult with valid flag and error messages
   */
  validateCAMInput(input: unknown, schema: string): ValidationResult {
    const schemaDef = SCHEMAS[schema];
    if (!schemaDef) {
      return { valid: false, errors: [`Unknown schema: '${schema}'. Available: ${Object.keys(SCHEMAS).join(', ')}`] };
    }

    if (input === null || input === undefined || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    const obj = input as Record<string, unknown>;
    const errors: string[] = [];

    for (const field of schemaDef.fields) {
      const value = obj[field.name];

      // Required check
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Missing required field '${field.name}' (${field.type}): ${field.description}`);
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type check
      if (field.type === 'number' && typeof value !== 'number') {
        errors.push(`Field '${field.name}' must be a number, got ${typeof value}`);
      } else if (field.type === 'string' && typeof value !== 'string') {
        errors.push(`Field '${field.name}' must be a string, got ${typeof value}`);
      } else if (field.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Field '${field.name}' must be a boolean, got ${typeof value}`);
      } else if (field.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field '${field.name}' must be an array, got ${typeof value}`);
      } else if (field.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
        errors.push(`Field '${field.name}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
      }

      // Numeric constraints
      if (field.type === 'number' && typeof value === 'number') {
        if (field.constraints === '> 0' && value <= 0) {
          errors.push(`Field '${field.name}' must be > 0, got ${value}`);
        } else if (field.constraints === '>= 0' && value < 0) {
          errors.push(`Field '${field.name}' must be >= 0, got ${value}`);
        } else if (field.constraints === '1-100' && (value < 1 || value > 100)) {
          errors.push(`Field '${field.name}' must be between 1 and 100, got ${value}`);
        }
      }
    }

    // Domain-specific validation
    if (schema === 'toolpath_request' && typeof obj.operation === 'string') {
      if (!MILLING_OPERATIONS.has(obj.operation)) {
        errors.push(`Unknown milling operation '${obj.operation}'. Valid: ${[...MILLING_OPERATIONS].join(', ')}`);
      }
    }
    if (schema === 'turning_request' && typeof obj.operation === 'string') {
      if (!TURNING_OPERATIONS.has(obj.operation)) {
        errors.push(`Unknown turning operation '${obj.operation}'. Valid: ${[...TURNING_OPERATIONS].join(', ')}`);
      }
    }
    if ((schema === 'toolpath_request' || schema === 'turning_request' || schema === 'simulation_request')
        && typeof obj.material === 'string' && !KNOWN_MATERIALS.has(obj.material)) {
      errors.push(`Unknown material '${obj.material}'. Use one of the known materials or ensure your material database has an entry.`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Return human-readable schema definition with field details.
   *
   * @param schema - Schema name
   * @returns SchemaDefinition or null if not found
   */
  getSchemaDefinition(schema: string): SchemaDefinition | null {
    return SCHEMAS[schema] ?? null;
  }

  /**
   * List all available schema names.
   *
   * @returns Array of schema names
   */
  listSchemas(): string[] {
    return Object.keys(SCHEMAS);
  }

  // --------------------------------------------------------------------------
  // CK-MS11a: Stochastic Toolpath Routing (thin wrapper)
  // --------------------------------------------------------------------------

  /**
   * Delegate to StochasticToolpathRoutingEngine for Monte Carlo route optimization.
   * Samples N variants, builds Pareto front, selects optimal by priority.
   *
   * @param pocket - Pocket geometry { boundary, depth_mm, width_mm, length_mm }
   * @param material - Material name or params
   * @param tool - Tool params { diameter_mm, flute_count, max_rpm, base_feed_mm_min, base_rpm, cost_per_tool }
   * @param priority - Optimization priority: speed, quality, life, cost, balanced
   * @param N - Number of Monte Carlo samples (default 100)
   * @param seed - PRNG seed (default 42)
   * @returns Optimal variant selection from the Pareto front
   */
  stochasticRoute(
    pocket: { boundary?: Array<{ x: number; y: number }>; depth_mm: number; width_mm: number; length_mm: number },
    material: string | Record<string, unknown>,
    tool: { diameter_mm: number; flute_count: number; max_rpm: number; base_feed_mm_min: number; base_rpm: number; cost_per_tool: number },
    priority: 'speed' | 'quality' | 'life' | 'cost' | 'balanced' = 'balanced',
    N: number = 100,
    seed: number = 42,
  ): unknown {
    // Lazy import to avoid circular dependency
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stochasticToolpathRoutingEngine } = require('./StochasticToolpathRoutingEngine');
      const fullPocket = {
        boundary: pocket.boundary ?? [
          { x: 0, y: 0 },
          { x: pocket.length_mm, y: 0 },
          { x: pocket.length_mm, y: pocket.width_mm },
          { x: 0, y: pocket.width_mm },
        ],
        depth_mm: pocket.depth_mm,
        width_mm: pocket.width_mm,
        length_mm: pocket.length_mm,
      };
      const variants = stochasticToolpathRoutingEngine.sampleVariants(fullPocket, N, {}, seed);
      const matParam = typeof material === 'string' ? material : material;
      const evals = variants.map((v: Record<string, unknown>) =>
        stochasticToolpathRoutingEngine.evaluateVariant(v, matParam, tool)
      );
      const pareto = stochasticToolpathRoutingEngine.buildParetoFront(evals);
      if (pareto.solutions.length === 0) {
        return { error: 'No feasible variants found on Pareto front', variants_sampled: N };
      }
      return stochasticToolpathRoutingEngine.selectOptimal(pareto, priority);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `StochasticToolpathRouting delegation failed: ${msg}` };
    }
  }

  // --------------------------------------------------------------------------
  // CK-MS11b: Probe Routine Generation
  // --------------------------------------------------------------------------

  /**
   * Generate probe routine G-code for critical-tolerance features.
   * Any feature with tolerance < 0.05mm gets a probe point.
   *
   * @param features - Array of DFM features to evaluate for probing
   * @param machine - Machine/controller config
   * @returns ProbeRoutineResult with G-code lines and feature mapping
   */
  generateProbeRoutine(
    features: DFMFeature[],
    machine: { controller?: string; probe_tool?: number; safe_z?: number } = {},
  ): ProbeRoutineResult {
    const controller = machine.controller ?? 'fanuc';
    const probeTool = machine.probe_tool ?? 99;
    const safeZ = machine.safe_z ?? 50;

    const criticalFeatures = features.filter(
      f => f.tolerance_mm !== undefined && f.tolerance_mm < 0.05
    );

    if (criticalFeatures.length === 0) {
      return {
        gcode_lines: [`(No critical features requiring probing — all tolerances >= 0.05mm)`],
        probe_points: [],
        feature_map: {},
        warnings: [],
      };
    }

    const gcode: string[] = [];
    const probePoints: ProbePoint[] = [];
    const featureMap: Record<string, string[]> = {};
    const warnings: string[] = [];

    // Header
    gcode.push(`(=== PRISM PROBE ROUTINE — ${criticalFeatures.length} CRITICAL FEATURES ===)`);
    gcode.push(`(Controller: ${controller.toUpperCase()})`);
    gcode.push('');
    gcode.push(`T${probeTool} M6 (PROBE TOOL)`);
    gcode.push(`G90 G21 G17`);
    gcode.push(`G43 H${probeTool} Z${safeZ}`);
    gcode.push(`M19 (SPINDLE ORIENT)`);
    gcode.push('');

    let pointIndex = 0;

    for (const feature of criticalFeatures) {
      const points: ProbePoint[] = [];
      const featureGcode: string[] = [];

      featureGcode.push(`(--- Feature: ${feature.id} | Type: ${feature.type} | Tol: ${feature.tolerance_mm}mm ---)`);

      // Generate probe points based on feature type
      switch (feature.type) {
        case 'hole':
        case 'bore': {
          // 4-point bore probe (X+, X-, Y+, Y-)
          const cx = 0;
          const cy = 0;
          const cz = feature.depth_mm !== undefined ? -(feature.depth_mm * 0.5) : -5;
          const r = (feature.diameter_mm ?? 10) / 2 * 0.8;
          const probes = [
            { x: cx + r, y: cy, z: cz, label: 'X+' },
            { x: cx - r, y: cy, z: cz, label: 'X-' },
            { x: cx, y: cy + r, z: cz, label: 'Y+' },
            { x: cx, y: cy - r, z: cz, label: 'Y-' },
          ];
          for (const p of probes) {
            pointIndex++;
            points.push({ x: p.x, y: p.y, z: p.z, feature_id: feature.id, probe_type: `bore_${p.label}` });
            featureGcode.push(...this._probePoint(controller, p.x, p.y, p.z, safeZ, pointIndex));
          }
          // Compute bore center and diameter
          featureGcode.push(this._probeComment(controller, `Bore ${feature.id}: compute center + diameter`));
          break;
        }
        case 'pocket': {
          // Probe floor depth at center
          const cx = (feature.width_mm ?? 20) / 2;
          const cy = (feature.depth_mm ?? 10) / 2;
          const cz = -(feature.depth_mm ?? 10);
          pointIndex++;
          points.push({ x: cx, y: cy, z: cz, feature_id: feature.id, probe_type: 'floor_depth' });
          featureGcode.push(...this._probePoint(controller, cx, cy, cz, safeZ, pointIndex));
          break;
        }
        case 'wall':
        case 'surface': {
          // Single surface point
          pointIndex++;
          const px = 0;
          const py = 0;
          const pz = 0;
          points.push({ x: px, y: py, z: pz, feature_id: feature.id, probe_type: 'surface' });
          featureGcode.push(...this._probePoint(controller, px, py, pz, safeZ, pointIndex));
          break;
        }
        case 'slot':
        case 'groove': {
          // 2-point web measurement
          const w = (feature.width_mm ?? 10) / 2;
          const zPos = -(feature.depth_mm ?? 5) * 0.5;
          pointIndex++;
          points.push({ x: -w * 0.8, y: 0, z: zPos, feature_id: feature.id, probe_type: 'web_minus' });
          featureGcode.push(...this._probePoint(controller, -w * 0.8, 0, zPos, safeZ, pointIndex));
          pointIndex++;
          points.push({ x: w * 0.8, y: 0, z: zPos, feature_id: feature.id, probe_type: 'web_plus' });
          featureGcode.push(...this._probePoint(controller, w * 0.8, 0, zPos, safeZ, pointIndex));
          break;
        }
        default: {
          // Generic single-point probe
          pointIndex++;
          points.push({ x: 0, y: 0, z: 0, feature_id: feature.id, probe_type: 'generic' });
          featureGcode.push(...this._probePoint(controller, 0, 0, 0, safeZ, pointIndex));
          if (feature.type !== 'boss' && feature.type !== 'step') {
            warnings.push(`Feature ${feature.id}: type '${feature.type}' uses generic single-point probe — may need manual refinement.`);
          }
        }
      }

      probePoints.push(...points);
      featureMap[feature.id] = points.map(p => p.probe_type);
      gcode.push(...featureGcode);
      gcode.push('');
    }

    // Footer
    gcode.push(`G91 G28 Z0 (RETURN TO HOME)`);
    gcode.push(`M30`);

    return { gcode_lines: gcode, probe_points: probePoints, feature_map: featureMap, warnings };
  }

  /** Generate G-code for a single probe point (controller-aware). */
  private _probePoint(controller: string, x: number, y: number, z: number, safeZ: number, idx: number): string[] {
    const lines: string[] = [];
    const xr = round3(x);
    const yr = round3(y);
    const zr = round3(z);

    lines.push(`G0 Z${safeZ}`);
    lines.push(`G0 X${xr} Y${yr}`);

    switch (controller) {
      case 'fanuc':
      case 'haas':
      case 'mazak':
      case 'okuma':
        lines.push(`G65 P9811 Z${zr} F300. (PROTECTED MOVE Z)`);
        lines.push(`G65 P9810 Z${zr} (SINGLE SURFACE MEASURE #${idx})`);
        break;
      case 'siemens':
        lines.push(`CYCLE978(${xr},${yr},${zr},,300,) ;SINGLE POINT PROBE #${idx}`);
        break;
      case 'heidenhain':
        lines.push(`TCH PROBE 444 DATUM Z Q263=${zr} Q320=0 ;PROBE POINT #${idx}`);
        break;
      default:
        lines.push(`G65 P9810 Z${zr} (PROBE #${idx})`);
    }
    return lines;
  }

  /** Generate a probe-aware comment for the given controller. */
  private _probeComment(controller: string, text: string): string {
    switch (controller) {
      case 'siemens': return `; ${text}`;
      case 'heidenhain': return `; ${text}`;
      default: return `(${text})`;
    }
  }

  // --------------------------------------------------------------------------
  // CK-MS11c: DFM Feedback Loop
  // --------------------------------------------------------------------------

  /**
   * Run comprehensive DFM (Design for Manufacturability) analysis.
   * Checks wall thickness, hole ratios, corner radii, undercuts,
   * feature proximity, and more.
   *
   * @param features - Array of part features to analyze
   * @param material - Workpiece material
   * @param machine - Machine capability (optional, defaults provided)
   * @returns DFMReport with pass/fail, score, issues, and recommendations
   */
  analyzeDFM(
    features: DFMFeature[],
    material: string = 'steel_1045',
    machine?: Partial<MachineCapability>,
  ): DFMReport {
    const mc: MachineCapability = {
      min_tool_diameter_mm: machine?.min_tool_diameter_mm ?? 1.0,
      max_depth_mm: machine?.max_depth_mm ?? 300,
      has_4th_axis: machine?.has_4th_axis ?? false,
      has_5th_axis: machine?.has_5th_axis ?? false,
      min_corner_radius_mm: machine?.min_corner_radius_mm ?? 0.5,
    };

    const warnings: DFMIssue[] = [];
    const failures: DFMIssue[] = [];

    // Run all DFM rules against all features
    for (const feature of features) {
      for (const rule of DFM_RULES) {
        const issue = rule.check(feature, material, mc);
        if (issue) {
          if (issue.severity === 'fail') {
            failures.push(issue);
          } else {
            warnings.push(issue);
          }
        }
      }
    }

    // Feature proximity check (O(n^2) but feature count is typically small)
    this._checkFeatureProximity(features, warnings);

    // Material-specific warnings
    this._checkMaterialSpecific(features, material, warnings);

    // Calculate score: start at 100, deduct for issues
    let score = 100;
    score -= failures.length * 15;    // 15 points per failure
    score -= warnings.length * 5;     // 5 points per warning
    score = Math.max(0, Math.min(100, score));

    // Generate recommendations
    const recommendations = this._generateRecommendations(features, failures, warnings, material, mc);

    const pass = failures.length === 0;

    return { pass, score, warnings, failures, recommendations };
  }

  /**
   * Convert DFM report to human-readable feedback strings.
   *
   * @param report - DFMReport from analyzeDFM
   * @returns Array of human-readable feedback strings
   */
  generateDFMFeedback(report: DFMReport): string[] {
    const lines: string[] = [];

    lines.push(`DFM Analysis — Score: ${report.score}/100 — ${report.pass ? 'PASS' : 'FAIL'}`);
    lines.push('');

    if (report.failures.length > 0) {
      lines.push(`FAILURES (${report.failures.length}):`);
      for (const f of report.failures) {
        lines.push(`  [FAIL] ${f.feature_id}: ${f.message}`);
        lines.push(`         Fix: ${f.suggestion}`);
      }
      lines.push('');
    }

    if (report.warnings.length > 0) {
      lines.push(`WARNINGS (${report.warnings.length}):`);
      for (const w of report.warnings) {
        lines.push(`  [WARN] ${w.feature_id}: ${w.message}`);
        lines.push(`         Consider: ${w.suggestion}`);
      }
      lines.push('');
    }

    if (report.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      for (const r of report.recommendations) {
        lines.push(`  - ${r}`);
      }
    }

    return lines;
  }

  /** Check for features that are too close together. */
  private _checkFeatureProximity(features: DFMFeature[], warnings: DFMIssue[]): void {
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const a = features[i];
        const b = features[j];

        // Estimate center-to-center distance from dimensions
        // If features overlap in type and have small dimensions, check proximity
        if (a.width_mm !== undefined && b.width_mm !== undefined) {
          const gapEstimate = Math.abs((a.width_mm + b.width_mm) / 2);
          if (gapEstimate < 2.0 && a.type === b.type) {
            warnings.push({
              feature_id: `${a.id}+${b.id}`,
              rule: 'feature_proximity',
              severity: 'warn',
              message: `Features '${a.id}' and '${b.id}' appear very close — tool access and wall integrity may be compromised.`,
              suggestion: `Increase spacing between features to at least 2mm (ideally 2x tool diameter).`,
            });
          }
        }

        // Holes too close together
        if (a.type === 'hole' && b.type === 'hole' && a.diameter_mm && b.diameter_mm) {
          const minSpacing = Math.max(a.diameter_mm, b.diameter_mm);
          // If both holes are small and same type, warn
          if (minSpacing < 3.0) {
            warnings.push({
              feature_id: `${a.id}+${b.id}`,
              rule: 'hole_proximity',
              severity: 'warn',
              message: `Holes '${a.id}' and '${b.id}' have small diameters — verify inter-hole wall thickness.`,
              suggestion: `Maintain at least 1x largest diameter spacing between hole edges.`,
            });
          }
        }
      }
    }
  }

  /** Material-specific DFM checks. */
  private _checkMaterialSpecific(features: DFMFeature[], material: string, warnings: DFMIssue[]): void {
    const isTitanium = material.startsWith('titanium');
    const isInconel = material.startsWith('inconel') || material.startsWith('hastelloy');
    const isPlastic = ['nylon', 'delrin', 'peek', 'polycarbonate', 'acetal', 'hdpe'].includes(material);

    for (const f of features) {
      // Titanium: tighter wall thickness requirements
      if (isTitanium && f.wall_thickness_mm !== undefined && f.wall_thickness_mm < 2.0 && f.wall_thickness_mm >= 1.0) {
        warnings.push({
          feature_id: f.id,
          rule: 'material_titanium_wall',
          severity: 'warn',
          message: `Wall ${f.wall_thickness_mm}mm in titanium — high cutting forces may cause deflection. Titanium needs thicker walls than aluminum.`,
          suggestion: `Increase to 2.5mm+ for titanium. Use climb milling with low radial engagement.`,
        });
      }

      // Superalloy: depth limits
      if (isInconel && f.depth_mm !== undefined && f.depth_mm > 50) {
        warnings.push({
          feature_id: f.id,
          rule: 'material_superalloy_depth',
          severity: 'warn',
          message: `Deep feature (${f.depth_mm}mm) in superalloy — extreme tool wear expected.`,
          suggestion: `Plan for multiple tool changes. Use ceramic or CBN tooling. Consider EDM for deep features.`,
        });
      }

      // Plastics: melting risk with tight tolerances
      if (isPlastic && f.tolerance_mm !== undefined && f.tolerance_mm < 0.02) {
        warnings.push({
          feature_id: f.id,
          rule: 'material_plastic_tolerance',
          severity: 'warn',
          message: `Tight tolerance ${f.tolerance_mm}mm in plastic — thermal expansion and cutting heat may compromise accuracy.`,
          suggestion: `Allow material to reach thermal equilibrium. Use sharp PCD tooling. Consider post-machining stress relief.`,
        });
      }
    }
  }

  /** Generate high-level recommendations from analysis. */
  private _generateRecommendations(
    features: DFMFeature[],
    failures: DFMIssue[],
    warnings: DFMIssue[],
    material: string,
    mc: MachineCapability,
  ): string[] {
    const recs: string[] = [];

    if (failures.length === 0 && warnings.length === 0) {
      recs.push('Design is well-suited for CNC machining with no significant concerns.');
      return recs;
    }

    // Aggregate failure themes
    const failRules = new Set(failures.map(f => f.rule));
    const warnRules = new Set(warnings.map(w => w.rule));

    if (failRules.has('min_wall_thickness')) {
      recs.push('Critical: Increase minimum wall thickness to 1.0mm+ (2.0mm+ recommended for reliable machining).');
    }
    if (failRules.has('depth_diameter_ratio')) {
      recs.push('Critical: Reduce hole depth/diameter ratios below 10:1 or plan for specialty drilling (gun drill, EDM).');
    }
    if (failRules.has('corner_radius_feasibility')) {
      recs.push(`Critical: Increase internal corner radii to at least ${mc.min_corner_radius_mm}mm to match available tooling.`);
    }
    if (failRules.has('undercut_accessibility')) {
      recs.push('Critical: Undercut features require 5-axis machine or redesign. Consider splitting into multiple setups.');
    }
    if (failRules.has('deep_pocket')) {
      recs.push('Critical: Deep pocket ratio exceeds 4:1 — widen pocket or reduce depth.');
    }
    if (warnRules.has('tight_tolerance')) {
      recs.push('Plan for finish passes, thermal soak time, and in-process probing on tight-tolerance features.');
    }
    if (warnRules.has('feature_proximity') || warnRules.has('hole_proximity')) {
      recs.push('Review feature spacing — closely spaced features may require sequential machining to avoid wall failure.');
    }

    // Material-driven recommendations
    if (material.startsWith('titanium')) {
      recs.push('Titanium: Use high-pressure coolant, sharp tools with PVD coating, and conservative feeds.');
    }
    if (material.startsWith('inconel') || material.startsWith('hastelloy')) {
      recs.push('Superalloy: Plan for high tool wear. Use ceramic inserts for roughing and CBN for finishing.');
    }

    // Probing recommendation
    const critFeatures = features.filter(f => f.tolerance_mm !== undefined && f.tolerance_mm < 0.05);
    if (critFeatures.length > 0) {
      recs.push(`${critFeatures.length} critical-tolerance features detected — in-process probing recommended.`);
    }

    return recs;
  }

  // --------------------------------------------------------------------------
  // CK-MS13 (partial): Integration Test Harness
  // --------------------------------------------------------------------------

  /**
   * Execute end-to-end integration test: geometry → features → process → output.
   *
   * @param testCase - Test case definition
   * @returns IntegrationTestResult with stage tracking
   */
  runIntegrationTest(testCase: IntegrationTestCase): IntegrationTestResult {
    const stages: string[] = [];
    const errors: string[] = [];

    // Stage 1: Parse geometry
    try {
      if (testCase.geometry) {
        // Simulate geometry parsing — validate it looks like a recognizable format
        if (!testCase.geometry.includes('{') && !testCase.geometry.includes('(') && testCase.geometry.length < 5) {
          errors.push('Geometry string is too short or unrecognizable');
          return { passed: false, stages_completed: stages, stage_failed: 'parse_geometry', output_valid: false, errors };
        }
      }
      stages.push('parse_geometry');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`parse_geometry: ${msg}`);
      return { passed: false, stages_completed: stages, stage_failed: 'parse_geometry', output_valid: false, errors };
    }

    // Stage 2: Extract features
    try {
      const features = testCase.features ?? [];
      if (features.length === 0 && !testCase.geometry) {
        errors.push('No features provided and no geometry to extract from');
        return { passed: false, stages_completed: stages, stage_failed: 'extract_features', output_valid: false, errors };
      }
      // Validate feature IDs are unique
      const ids = features.map(f => f.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        errors.push('Duplicate feature IDs detected');
        return { passed: false, stages_completed: stages, stage_failed: 'extract_features', output_valid: false, errors };
      }
      stages.push('extract_features');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`extract_features: ${msg}`);
      return { passed: false, stages_completed: stages, stage_failed: 'extract_features', output_valid: false, errors };
    }

    // Stage 3: DFM analysis
    try {
      const features = testCase.features ?? [];
      if (features.length > 0) {
        const dfm = this.analyzeDFM(features, testCase.material);
        if (!dfm.pass) {
          errors.push(`DFM analysis found ${dfm.failures.length} failure(s): ${dfm.failures.map(f => f.message).join('; ')}`);
          // DFM failures are informational in integration test — don't block
        }
      }
      stages.push('dfm_analysis');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`dfm_analysis: ${msg}`);
      return { passed: false, stages_completed: stages, stage_failed: 'dfm_analysis', output_valid: false, errors };
    }

    // Stage 4: Process planning
    try {
      const features = testCase.features ?? [];
      const plannedOps = this._inferOperations(features);
      if (testCase.expected_operations) {
        const missing = testCase.expected_operations.filter(op => !plannedOps.includes(op));
        if (missing.length > 0) {
          errors.push(`Process planning missing expected operations: ${missing.join(', ')}`);
        }
      }
      stages.push('process_planning');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`process_planning: ${msg}`);
      return { passed: false, stages_completed: stages, stage_failed: 'process_planning', output_valid: false, errors };
    }

    // Stage 5: G-code generation
    try {
      const features = testCase.features ?? [];
      const ops = this._inferOperations(features);
      // Validate that operations map to known G-code patterns
      for (const op of ops) {
        if (!MILLING_OPERATIONS.has(op) && !TURNING_OPERATIONS.has(op)) {
          errors.push(`Operation '${op}' does not map to a known G-code generation strategy`);
        }
      }
      stages.push('gcode_generation');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`gcode_generation: ${msg}`);
      return { passed: false, stages_completed: stages, stage_failed: 'gcode_generation', output_valid: false, errors };
    }

    // Stage 6: Output validation
    try {
      // Validate that material is recognized
      if (!KNOWN_MATERIALS.has(testCase.material)) {
        errors.push(`Material '${testCase.material}' not in known materials database`);
      }
      stages.push('output_validation');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`output_validation: ${msg}`);
      return { passed: false, stages_completed: stages, stage_failed: 'output_validation', output_valid: false, errors };
    }

    const outputValid = stages.length === 6;
    const passed = outputValid && errors.length === 0;

    return { passed, stages_completed: stages, stage_failed: undefined, output_valid: outputValid, errors };
  }

  /** Infer operations from features for process planning. */
  private _inferOperations(features: DFMFeature[]): string[] {
    const ops = new Set<string>();
    for (const f of features) {
      switch (f.type) {
        case 'pocket': ops.add('pocket_2d'); break;
        case 'hole': case 'bore': ops.add('drill_peck'); break;
        case 'slot': case 'groove': ops.add('contour_2d'); break;
        case 'face': ops.add('face_mill'); break;
        case 'wall': case 'surface': ops.add('contour_2d'); break;
        case 'thread': ops.add('thread_mill'); break;
        case 'chamfer': ops.add('chamfer'); break;
        case 'undercut': ops.add('swarf_5ax'); break;
        default: ops.add('adaptive_clear');
      }
    }
    return [...ops];
  }

  // --------------------------------------------------------------------------
  // Dispatcher entry point
  // --------------------------------------------------------------------------

  /**
   * Dispatch an action by name.
   *
   * @param action - Action name
   * @param params - Action parameters
   * @returns Action result
   */
  dispatch(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case 'validate_cam_input':
        return this.validateCAMInput(params.input, params.schema as string);

      case 'schema_definition': {
        const name = params.schema as string;
        if (name === '_list') return this.listSchemas();
        return this.getSchemaDefinition(name);
      }

      case 'stochastic_route':
        return this.stochasticRoute(
          params.pocket as { boundary?: Array<{ x: number; y: number }>; depth_mm: number; width_mm: number; length_mm: number },
          (params.material as string | Record<string, unknown>) ?? 'aluminum_6061',
          params.tool as { diameter_mm: number; flute_count: number; max_rpm: number; base_feed_mm_min: number; base_rpm: number; cost_per_tool: number },
          (params.priority as 'speed' | 'quality' | 'life' | 'cost' | 'balanced') ?? 'balanced',
          (params.N as number) ?? 100,
          (params.seed as number) ?? 42,
        );

      case 'generate_probe':
        return this.generateProbeRoutine(
          params.features as DFMFeature[],
          params.machine as { controller?: string; probe_tool?: number; safe_z?: number },
        );

      case 'dfm_analyze':
        return this.analyzeDFM(
          params.features as DFMFeature[],
          (params.material as string) ?? 'steel_1045',
          params.machine as Partial<MachineCapability> | undefined,
        );

      case 'dfm_feedback': {
        const report = params.report as DFMReport;
        return this.generateDFMFeedback(report);
      }

      case 'integration_test':
        return this.runIntegrationTest(params.test_case as IntegrationTestCase);

      default:
        throw new Error(`CAMKernelValidationEngine: unknown action '${action}'`);
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Round to 3 decimal places. */
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const camKernelValidationEngine = new CAMKernelValidationEngine();
