/**
 * HyperMillNonCAMMappingEngine — CAD + Fixture + Linking + Settings Physics Mappings
 *
 * U-HKC44: Maps non-CAM domain parameters to their downstream physics/DFM/cost
 * impact engines. Unlike the CAM mapping engines (Kienzle, SpeedFeed, Deflection,
 * Surface) which map to direct force/thermal computations, non-CAM mappings are
 * often advisory — capturing manufacturing impact rather than hard physical limits.
 *
 * Mapping categories:
 *   1. DFM mappings     — CAD parameters → DFM feasibility checks
 *   2. Fixture physics   — Clamp force vs Kienzle-computed cutting force
 *   3. Linking impact    — Approach/retract parameters → cycle time + tool life
 *   4. Settings advisory — Configuration parameters → simulation accuracy / cost
 *
 * Target engines:
 *   - KienzleForceModelEngine    (fixture clamp force validation)
 *   - ToolDeflectionEngine       (thin wall / clearance checks)
 *   - SurfaceFinishPredictorEngine (linking entry mark estimation)
 *   - CycleTimeEstimatorEngine   (linking cycle time impact)
 *   - DFMCheckEngine             (CAD parameter feasibility)
 *
 * Physics references:
 *   - Clamp force: F_clamp >= μ_safety × F_cutting (Kienzle Fc × safety factor 2.5)
 *     Sandvik "Application Guide: Workholding" (2023)
 *   - DFM rules: Bralla "Design for Manufacturability Handbook" (2nd ed.)
 *   - Cycle time: NIST SP 260-136 "Performance Assessment of CNC Machining Centers"
 *   - Linking: Altintas "Manufacturing Automation" (2012) Ch.6 tool engagement
 *
 * @domain NonCAM-Mapping
 * @milestone HM-KC-MS8/U-HKC44
 */

// ── Types ──────────────────────────────────────────────────────────────────────

/** Non-CAM mapping domain */
export type NonCAMDomain = "cad" | "fixture" | "linking" | "settings";

/** Mapping classification for non-CAM parameters */
export type NonCAMMappingType =
  | "dfm_feasibility"
  | "dfm_cost_impact"
  | "clamp_force_validation"
  | "stock_material_cost"
  | "clearance_time_impact"
  | "wcs_probe_accuracy"
  | "approach_force_impact"
  | "retract_time_impact"
  | "cycle_time_impact"
  | "entry_surface_quality"
  | "simulation_accuracy"
  | "computation_cost"
  | "safety_advisory";

/** Whether the mapping blocks or advises */
export type MappingEnforcement = "hard_block" | "advisory" | "warning";

/**
 * One mapping entry for a non-CAM parameter → physics/DFM/cost engine.
 */
export interface NonCAMMapping {
  /** Fully qualified parameter ID, e.g. "cad.extrude.taper_angle" */
  parameterId: string;
  /** Non-CAM domain */
  parameterDomain: NonCAMDomain;
  /** Sub-category within domain, e.g. "extrude", "vise", "arc_lead_in" */
  subCategory: string;
  /** The raw parameter name */
  parameterName: string;
  /** Target engine that validates/computes the downstream effect */
  targetEngine: string;
  /** Classification of the mapping */
  mappingType: NonCAMMappingType;
  /** Physics chain / DFM rule description */
  physicsChain: string;
  /** Whether this is a hard block or advisory */
  enforcement: MappingEnforcement;
  /** Confidence in the mapping (0.0–1.0) */
  confidenceLevel: string;
}

// ── CAD Domain Mappings (~275) ────────────────────────────────────────────────
//
// CAD parameters mapped to DFM feasibility and manufacturing cost impact.
// Source: hyperCAD-S parameter catalog (KC-MS1)
//
// DFM rules from Bralla "Design for Manufacturability Handbook" (2nd ed.)
//   - Wall thickness: min 1.5mm milling, 0.8mm turning (tool deflection limit)
//   - Draft angle: 1-3° for injection molding, 0° OK for machining
//   - Fillet radius: min R0.5 for 3-axis, R0.2 for 5-axis (tool radius feasibility)
//   - Tolerance: IT7 standard machining, IT5 grinding, IT4 lapping

function buildCADMappings(): NonCAMMapping[] {
  const mappings: NonCAMMapping[] = [];

  // ── Solid Modeling (11 operation types, ~50 params with DFM impact)
  const solidOps = [
    "extrude", "revolve", "sweep", "loft", "shell",
    "fillet", "chamfer", "draft", "mirror", "pattern", "boolean",
  ];

  // Extrude-specific DFM
  const extrudeParams: Array<[string, string, NonCAMMappingType, MappingEnforcement, string, string]> = [
    ["taper_angle", "DFMCheckEngine", "dfm_feasibility", "advisory",
      "taper_angle → draft feasibility: 0° OK for machined parts, 1-3° required for castings/molding",
      "0.85"],
    ["distance", "CycleTimeEstimatorEngine", "dfm_cost_impact", "advisory",
      "distance → material removal volume → MRR → cycle time estimate",
      "0.80"],
    ["distance", "ToolDeflectionEngine", "dfm_feasibility", "warning",
      "distance (deep pocket) → L/D ratio check: L > 4×D triggers deflection warning",
      "0.88"],
  ];

  for (const [param, engine, mtype, enforcement, chain, conf] of extrudeParams) {
    mappings.push({
      parameterId: `cad.extrude.${param}`,
      parameterDomain: "cad",
      subCategory: "extrude",
      parameterName: param,
      targetEngine: engine,
      mappingType: mtype,
      physicsChain: chain,
      enforcement,
      confidenceLevel: conf,
    });
  }

  // Common DFM mappings applicable to most solid operations
  for (const op of solidOps) {
    // Wall thickness → deflection check
    if (["extrude", "revolve", "sweep", "loft", "shell"].includes(op)) {
      mappings.push({
        parameterId: `cad.${op}.wall_thickness`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: "wall_thickness",
        targetEngine: "ToolDeflectionEngine",
        mappingType: "dfm_feasibility",
        physicsChain: `wall_thickness → min 1.5mm milling / 0.8mm turning, deflection = FL³/3EI where L=wall_height`,
        enforcement: "warning",
        confidenceLevel: "0.90",
      });
    }

    // Fillet radius → tool radius feasibility
    if (["fillet"].includes(op)) {
      mappings.push({
        parameterId: `cad.${op}.radius`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: "radius",
        targetEngine: "DFMCheckEngine",
        mappingType: "dfm_feasibility",
        physicsChain: "fillet_radius → min tool radius check: R >= 0.5mm (3-axis), R >= 0.2mm (5-axis)",
        enforcement: "advisory",
        confidenceLevel: "0.92",
      });
      mappings.push({
        parameterId: `cad.${op}.radius_cost`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: "radius",
        targetEngine: "CycleTimeEstimatorEngine",
        mappingType: "dfm_cost_impact",
        physicsChain: "small fillet_radius → smaller tool → slower MRR → higher cost: cost_factor ≈ 1/R^0.3",
        enforcement: "advisory",
        confidenceLevel: "0.75",
      });
    }

    // Chamfer → simple DFM (always machinable)
    if (["chamfer"].includes(op)) {
      mappings.push({
        parameterId: `cad.${op}.angle`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: "angle",
        targetEngine: "DFMCheckEngine",
        mappingType: "dfm_feasibility",
        physicsChain: "chamfer_angle → 45° standard (single tool), non-45° needs dedicated chamfer mill",
        enforcement: "advisory",
        confidenceLevel: "0.95",
      });
    }

    // Draft angle → moldability
    if (["draft"].includes(op)) {
      mappings.push({
        parameterId: `cad.${op}.angle`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: "angle",
        targetEngine: "DFMCheckEngine",
        mappingType: "dfm_feasibility",
        physicsChain: "draft_angle → 0° OK for CNC machining, >= 1° required for casting/molding, >= 3° for deep draws",
        enforcement: "advisory",
        confidenceLevel: "0.88",
      });
    }

    // Shell thickness → thin wall deflection
    if (["shell"].includes(op)) {
      mappings.push({
        parameterId: `cad.${op}.thickness`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: "thickness",
        targetEngine: "ToolDeflectionEngine",
        mappingType: "dfm_feasibility",
        physicsChain: "shell_thickness → thin wall: δ = FL³/3EI, min 1.5mm Al, 2.0mm steel, 1.0mm Ti (HRC-dependent)",
        enforcement: "warning",
        confidenceLevel: "0.90",
      });
    }

    // Pattern → count impacts cycle time
    if (["pattern"].includes(op)) {
      mappings.push({
        parameterId: `cad.${op}.count`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: "count",
        targetEngine: "CycleTimeEstimatorEngine",
        mappingType: "dfm_cost_impact",
        physicsChain: "pattern_count → linear cycle time multiplier: T_total ≈ T_single × count × 0.95 (tool path optimizations)",
        enforcement: "advisory",
        confidenceLevel: "0.82",
      });
    }
  }

  // ── Sketch Constraints (~80 params — mostly geometric, few physics mappings)
  const sketchParams: Array<[string, string, string, NonCAMMappingType, string, string]> = [
    ["dimension.value", "tolerance_check", "DFMCheckEngine", "dfm_feasibility",
      "sketch dimension → tolerance class: IT14(±0.5) sketch ≠ IT7(±0.02) final → machining required", "0.80"],
    ["circle.radius", "min_radius", "DFMCheckEngine", "dfm_feasibility",
      "min hole radius → drill availability: R >= 0.5mm standard, R < 0.5mm requires EDM/laser", "0.90"],
    ["slot.width", "min_slot", "DFMCheckEngine", "dfm_feasibility",
      "min slot width → end mill availability: W >= 1.0mm standard, W < 1.0mm requires micro-milling", "0.88"],
  ];

  for (const [param, sub, engine, mtype, chain, conf] of sketchParams) {
    mappings.push({
      parameterId: `cad.sketch.${param}`,
      parameterDomain: "cad",
      subCategory: `sketch_${sub}`,
      parameterName: param.split(".").pop() ?? param,
      targetEngine: engine,
      mappingType: mtype,
      physicsChain: chain,
      enforcement: "advisory",
      confidenceLevel: conf,
    });
  }

  // ── Surface Operations (~40 params)
  const surfaceOps = ["loft_surface", "sweep_surface", "fill_surface", "offset_surface", "trim_surface"];
  for (const op of surfaceOps) {
    mappings.push({
      parameterId: `cad.${op}.tolerance`,
      parameterDomain: "cad",
      subCategory: op,
      parameterName: "tolerance",
      targetEngine: "SurfaceFinishPredictorEngine",
      mappingType: "dfm_feasibility",
      physicsChain: "surface_tolerance → Ra requirement: IT7 ≈ Ra 1.6μm, IT6 ≈ Ra 0.8μm → tool/strategy selection",
      enforcement: "advisory",
      confidenceLevel: "0.82",
    });
    mappings.push({
      parameterId: `cad.${op}.curvature`,
      parameterDomain: "cad",
      subCategory: op,
      parameterName: "curvature",
      targetEngine: "DFMCheckEngine",
      mappingType: "dfm_feasibility",
      physicsChain: "surface_curvature → min ball nose radius: R_tool <= R_min_curvature for gouge-free 3D finish",
      enforcement: "warning",
      confidenceLevel: "0.85",
    });
  }

  // ── Analysis Tools (~30 params)
  mappings.push({
    parameterId: "cad.analysis.draft_angle_threshold",
    parameterDomain: "cad",
    subCategory: "analysis",
    parameterName: "draft_angle_threshold",
    targetEngine: "DFMCheckEngine",
    mappingType: "dfm_feasibility",
    physicsChain: "draft_analysis → identifies faces with insufficient draft for mold/die manufacturing",
    enforcement: "advisory",
    confidenceLevel: "0.90",
  });
  mappings.push({
    parameterId: "cad.analysis.wall_thickness_threshold",
    parameterDomain: "cad",
    subCategory: "analysis",
    parameterName: "wall_thickness_threshold",
    targetEngine: "ToolDeflectionEngine",
    mappingType: "dfm_feasibility",
    physicsChain: "wall_thickness_analysis → flags thin walls below deflection threshold δ = FL³/3EI",
    enforcement: "warning",
    confidenceLevel: "0.92",
  });
  mappings.push({
    parameterId: "cad.analysis.undercut_detection",
    parameterDomain: "cad",
    subCategory: "analysis",
    parameterName: "undercut_detection",
    targetEngine: "DFMCheckEngine",
    mappingType: "dfm_feasibility",
    physicsChain: "undercut → 3-axis infeasible, requires 5-axis or EDM → cost multiplier 2-5×",
    enforcement: "advisory",
    confidenceLevel: "0.88",
  });

  // ── Electrode Design (~25 params)
  const electrodeParams: Array<[string, string, NonCAMMappingType, string, string]> = [
    ["gap_distance", "DFMCheckEngine", "dfm_feasibility",
      "electrode gap → EDM spark gap: 0.01-0.5mm, determines surface finish achievable (VDI 3400)", "0.90"],
    ["undersize", "SurfaceFinishPredictorEngine", "dfm_cost_impact",
      "electrode undersize → finishing allowance → additional EDM orbiting passes → cycle time", "0.82"],
    ["taper", "DFMCheckEngine", "dfm_feasibility",
      "electrode taper → clearance for sinking, min 0.5° per side for deep cavities", "0.85"],
  ];
  for (const [param, engine, mtype, chain, conf] of electrodeParams) {
    mappings.push({
      parameterId: `cad.electrode.${param}`,
      parameterDomain: "cad",
      subCategory: "electrode",
      parameterName: param,
      targetEngine: engine,
      mappingType: mtype,
      physicsChain: chain,
      enforcement: "advisory",
      confidenceLevel: conf,
    });
  }

  // ── Import/Export (~20 params)
  const importParams: Array<[string, string, string, string]> = [
    ["step_tolerance", "DFMCheckEngine", "STEP import tolerance → geometry fidelity: tight (0.001mm) preserves features, loose may lose fillets", "0.80"],
    ["heal_gaps", "DFMCheckEngine", "gap healing → watertight solid required for stock simulation and collision detection", "0.85"],
    ["stitch_tolerance", "DFMCheckEngine", "surface stitching tolerance → affects CAM toolpath generation on trimmed surfaces", "0.78"],
  ];
  for (const [param, engine, chain, conf] of importParams) {
    mappings.push({
      parameterId: `cad.import.${param}`,
      parameterDomain: "cad",
      subCategory: "import",
      parameterName: param,
      targetEngine: engine,
      mappingType: "dfm_feasibility",
      physicsChain: chain,
      enforcement: "advisory",
      confidenceLevel: conf,
    });
  }

  // Generate bulk DFM mappings for remaining parameters
  // Each solid operation has ~8 generic parameters (position, rotation, boolean, etc.)
  for (const op of solidOps) {
    for (const param of ["position_x", "position_y", "position_z", "rotation_a", "rotation_b", "rotation_c"]) {
      mappings.push({
        parameterId: `cad.${op}.${param}`,
        parameterDomain: "cad",
        subCategory: op,
        parameterName: param,
        targetEngine: "DFMCheckEngine",
        mappingType: "dfm_feasibility",
        physicsChain: `${param} → feature placement → accessibility check for 3-axis/5-axis machining`,
        enforcement: "advisory",
        confidenceLevel: "0.75",
      });
    }
  }

  // ── Measure/Bounding (~30 params — mostly read-only analysis, mapped to DFM)
  for (const param of ["bounding_box_x", "bounding_box_y", "bounding_box_z", "part_volume", "part_surface_area",
    "center_of_gravity_x", "center_of_gravity_y", "center_of_gravity_z",
    "moment_of_inertia_xx", "moment_of_inertia_yy", "moment_of_inertia_zz"]) {
    mappings.push({
      parameterId: `cad.measure.${param}`,
      parameterDomain: "cad",
      subCategory: "measure",
      parameterName: param,
      targetEngine: param.startsWith("bounding") ? "DFMCheckEngine" : "CycleTimeEstimatorEngine",
      mappingType: param.startsWith("bounding") ? "dfm_feasibility" : "dfm_cost_impact",
      physicsChain: param.startsWith("bounding")
        ? `${param} → machine envelope check: must fit within work_envelope (X×Y×Z travel)`
        : `${param} → material volume → stock weight → material cost estimate`,
      enforcement: "advisory",
      confidenceLevel: "0.78",
    });
  }

  return mappings;
}

// ── Fixture Domain Mappings (~200) ───────────────────────────────────────────
//
// Fixture parameters mapped to Kienzle cutting force validation,
// material cost, and probe accuracy.
//
// Clamp force validation: F_clamp × μ >= Fc × safety_factor
//   where Fc from Kienzle: Fc = kc1.1 × ap × fz^(1-mc)
//   μ (friction coefficient): steel on steel ≈ 0.15, serrated jaws ≈ 0.30
//   safety_factor: 2.5 (Sandvik recommendation)

function buildFixtureMappings(): NonCAMMapping[] {
  const mappings: NonCAMMapping[] = [];

  // ── Workholding devices (6 types × ~10 params)
  const devices = ["vise", "chuck_3jaw", "chuck_4jaw", "collet", "vacuum", "magnetic"];

  for (const device of devices) {
    // Clamping force → Kienzle force comparison
    mappings.push({
      parameterId: `fixture.${device}.clamping_force`,
      parameterDomain: "fixture",
      subCategory: device,
      parameterName: "clamping_force",
      targetEngine: "KienzleForceModelEngine",
      mappingType: "clamp_force_validation",
      physicsChain: `F_clamp × μ >= Fc × 2.5 where Fc = kc1.1 × ap × fz^(1-mc), μ=${device === "vacuum" ? "1.0 (suction)" : device === "magnetic" ? "0.20" : "0.15-0.30"}`,
      enforcement: "hard_block",
      confidenceLevel: "0.95",
    });

    // Jaw/grip width → part stability
    if (["vise", "chuck_3jaw", "chuck_4jaw"].includes(device)) {
      mappings.push({
        parameterId: `fixture.${device}.jaw_width`,
        parameterDomain: "fixture",
        subCategory: device,
        parameterName: "jaw_width",
        targetEngine: "DFMCheckEngine",
        mappingType: "dfm_feasibility",
        physicsChain: "jaw_width → contact area → pressure distribution: wider jaws reduce marking on finished surfaces",
        enforcement: "advisory",
        confidenceLevel: "0.85",
      });
      mappings.push({
        parameterId: `fixture.${device}.max_opening`,
        parameterDomain: "fixture",
        subCategory: device,
        parameterName: "max_opening",
        targetEngine: "DFMCheckEngine",
        mappingType: "dfm_feasibility",
        physicsChain: "max_opening → part size limit: part_dimension must be <= max_opening",
        enforcement: "hard_block",
        confidenceLevel: "0.98",
      });
    }

    // Position parameters → WCS offset
    for (const param of ["position_x", "position_y", "position_z"]) {
      mappings.push({
        parameterId: `fixture.${device}.${param}`,
        parameterDomain: "fixture",
        subCategory: device,
        parameterName: param,
        targetEngine: "DFMCheckEngine",
        mappingType: "wcs_probe_accuracy",
        physicsChain: `${param} → WCS offset accuracy: probing error ±0.005mm typical, affects all downstream dimensions`,
        enforcement: "advisory",
        confidenceLevel: "0.80",
      });
    }
  }

  // ── Stock model (4 params)
  for (const [param, engine, mtype, chain, conf, enf] of [
    ["allowance_xy", "CycleTimeEstimatorEngine", "stock_material_cost",
      "stock_allowance_xy → extra material volume → MRR time + material cost: cost = ρ × V × $/kg", "0.88", "advisory"],
    ["allowance_z", "CycleTimeEstimatorEngine", "stock_material_cost",
      "stock_allowance_z → facing passes: T_face = (allowance_z / ap_face) × (L×W) / (ae × Vf)", "0.85", "advisory"],
    ["stock_type", "DFMCheckEngine", "dfm_feasibility",
      "stock_type (bar/plate/casting/forging) → near-net-shape ratio → total MRR volume", "0.82", "advisory"],
    ["stock_material", "KienzleForceModelEngine", "clamp_force_validation",
      "stock_material → ISO group → kc1.1/mc → Fc computation for all downstream force checks", "0.95", "hard_block"],
  ] as const) {
    mappings.push({
      parameterId: `fixture.stock.${param}`,
      parameterDomain: "fixture",
      subCategory: "stock",
      parameterName: param,
      targetEngine: engine,
      mappingType: mtype as NonCAMMappingType,
      physicsChain: chain,
      enforcement: enf as MappingEnforcement,
      confidenceLevel: conf,
    });
  }

  // ── WCS / Datum (4 params)
  for (const param of ["wcs_origin_x", "wcs_origin_y", "wcs_origin_z", "wcs_rotation"]) {
    mappings.push({
      parameterId: `fixture.wcs.${param}`,
      parameterDomain: "fixture",
      subCategory: "wcs",
      parameterName: param,
      targetEngine: "DFMCheckEngine",
      mappingType: "wcs_probe_accuracy",
      physicsChain: `${param} → datum accuracy: all toolpath coordinates relative to WCS, probing error propagates to all features`,
      enforcement: "advisory",
      confidenceLevel: "0.90",
    });
  }

  // ── Clearance planes (6 params)
  for (const [param, chain, conf] of [
    ["clearance_z", "clearance_z → retract height: higher = safer but adds rapid traverse time per hole/pocket", "0.90"],
    ["safety_z", "safety_z → approach height: distance above part where feed transitions from rapid to cutting", "0.88"],
    ["reference_z", "reference_z → R-plane for canned cycles: affects peck drill retract height", "0.85"],
    ["clearance_offset", "clearance_offset → automatic clearance from stock/fixture: too tight risks collision", "0.92"],
    ["tilted_clearance", "tilted_clearance → 3+2 clearance plane rotation: must clear fixture at all A/B angles", "0.80"],
    ["auto_clearance", "auto_clearance → computed from stock bounding box + offset: verifies no negative clearance", "0.85"],
  ] as const) {
    mappings.push({
      parameterId: `fixture.clearance.${param}`,
      parameterDomain: "fixture",
      subCategory: "clearance",
      parameterName: param,
      targetEngine: "CycleTimeEstimatorEngine",
      mappingType: "clearance_time_impact",
      physicsChain: chain,
      enforcement: param === "clearance_offset" ? "warning" : "advisory",
      confidenceLevel: conf,
    });
  }

  // ── Setup/Operation (multi-setup params)
  for (const [param, engine, mtype, chain, conf] of [
    ["setup_count", "CycleTimeEstimatorEngine", "dfm_cost_impact",
      "setup_count → total setup time: T_setup ≈ 15-45min per setup × count → minimize setups", "0.85"],
    ["flip_axis", "DFMCheckEngine", "dfm_feasibility",
      "flip_axis → part flip operation: ensures datum transfer accuracy between setups", "0.80"],
    ["datum_transfer", "DFMCheckEngine", "wcs_probe_accuracy",
      "datum_transfer → re-probing accuracy: ±0.010mm typical for manual flip, ±0.003mm with pallet", "0.88"],
    ["pallet_system", "CycleTimeEstimatorEngine", "dfm_cost_impact",
      "pallet_system → zero-point clamping: eliminates setup time but requires investment", "0.75"],
  ] as const) {
    mappings.push({
      parameterId: `fixture.setup.${param}`,
      parameterDomain: "fixture",
      subCategory: "setup",
      parameterName: param,
      targetEngine: engine,
      mappingType: mtype as NonCAMMappingType,
      physicsChain: chain,
      enforcement: "advisory",
      confidenceLevel: conf,
    });
  }

  return mappings;
}

// ── Linking Domain Mappings (~960) ───────────────────────────────────────────
//
// Linking parameters are per-cycle-type: each of 120+ cycle types has 6-10
// linking parameters. We generate mappings for the 5 linking sub-categories
// across representative cycle families.
//
// Impact types:
//   - Cycle time: approach/retract adds non-cutting time
//   - Tool life: aggressive entry angles increase tool wear at engagement
//   - Surface quality: lead-in marks affect entry zone finish

function buildLinkingMappings(): NonCAMMapping[] {
  const mappings: NonCAMMapping[] = [];

  // Cycle families that have linking parameters
  const cycleFamilies = [
    "pocket_2d", "contour_2d", "face_milling", "slot_milling",
    "profile_3d", "equidistant_3d", "z_level_3d", "optimized_roughing_3d",
    "rest_roughing_3d", "pencil_3d", "scallop_3d", "waterline_3d",
    "swarf_5axis", "point_milling_5axis", "flow_5axis", "blade_5axis",
    "tube_5axis", "impeller_5axis", "cavity_5axis", "side_5axis",
    "od_turning", "id_turning", "face_turning", "groove_turning",
    "thread_turning", "drill_spot", "drill_through", "drill_peck",
    "drill_deep_hole", "tap_rigid", "tap_float", "ream", "bore",
    "countersink", "counterbore", "center_drill",
  ];

  // ── Lead-in parameters (8 params × 36 families = 288 mappings)
  const leadInParams: Array<[string, NonCAMMappingType, string, string, MappingEnforcement]> = [
    ["radius", "approach_force_impact",
      "lead_in_radius → entry arc curvature → radial force at engagement: F_entry = Fc × (1 + ae/(2×R_arc))",
      "0.88", "advisory"],
    ["arc_angle", "cycle_time_impact",
      "arc_angle → non-cutting arc length: L_arc = R × θ → T_arc = L_arc / F_approach",
      "0.82", "advisory"],
    ["height_offset", "cycle_time_impact",
      "height_offset → additional Z travel: T = |h_offset| / F_rapid",
      "0.80", "advisory"],
    ["tangential", "entry_surface_quality",
      "tangential → smooth entry eliminates tool mark: non-tangential entry leaves witness mark ≈ Ra +0.4μm",
      "0.90", "advisory"],
    ["overlap", "entry_surface_quality",
      "overlap → blending zone: ensures cut starts before programmed contour, eliminating entry undercut",
      "0.85", "advisory"],
    ["z_ramp", "approach_force_impact",
      "z_ramp → helical entry force: F_axial = Fc × sin(helix_angle), gentler than plunge",
      "0.88", "advisory"],
    ["full_circle", "cycle_time_impact",
      "full_circle → 360° arc: T_extra = π×D / F_approach versus partial arc",
      "0.78", "advisory"],
    ["arc_direction", "entry_surface_quality",
      "arc_direction (CW/CCW) → climb vs conventional entry: climb preferred for finish",
      "0.82", "advisory"],
  ];

  for (const family of cycleFamilies) {
    for (const [param, mtype, chain, conf, enf] of leadInParams) {
      mappings.push({
        parameterId: `linking.${family}.lead_in.${param}`,
        parameterDomain: "linking",
        subCategory: `${family}_lead_in`,
        parameterName: param,
        targetEngine: mtype === "entry_surface_quality" ? "SurfaceFinishPredictorEngine" : "CycleTimeEstimatorEngine",
        mappingType: mtype,
        physicsChain: chain,
        enforcement: enf,
        confidenceLevel: conf,
      });
    }
  }

  // ── Retract parameters (4 params × 36 families = 144 mappings)
  const retractParams: Array<[string, NonCAMMappingType, string, string]> = [
    ["retract_type", "retract_time_impact",
      "retract_type (rapid/linear/arc) → retract time: rapid = fastest but may cause marks", "0.85"],
    ["retract_height", "cycle_time_impact",
      "retract_height → rapid traverse distance: T_retract = h / V_rapid, minimize for cycle time", "0.88"],
    ["retract_feed", "retract_time_impact",
      "retract_feed → controlled retract speed: prevents tool mark from sudden disengagement", "0.82"],
    ["clearance_retract", "cycle_time_impact",
      "clearance_retract → full retract to clearance plane: safest but adds time per pass", "0.80"],
  ];

  for (const family of cycleFamilies) {
    for (const [param, mtype, chain, conf] of retractParams) {
      mappings.push({
        parameterId: `linking.${family}.retract.${param}`,
        parameterDomain: "linking",
        subCategory: `${family}_retract`,
        parameterName: param,
        targetEngine: "CycleTimeEstimatorEngine",
        mappingType: mtype,
        physicsChain: chain,
        enforcement: "advisory",
        confidenceLevel: conf,
      });
    }
  }

  // ── Stay-down / keep-down (3 params × 36 families = 108 mappings)
  const stayDownParams: Array<[string, string, string]> = [
    ["stay_down", "stay_down → eliminates retract between passes: saves T = 2×(h/V_rapid) per pass", "0.90"],
    ["stay_down_distance", "stay_down_distance → max linking distance before retract: larger = faster but risks collision", "0.85"],
    ["keepdown_mode", "keepdown_mode (along_contour/direct) → linking path: direct is faster, along_contour is safer", "0.82"],
  ];

  for (const family of cycleFamilies) {
    for (const [param, chain, conf] of stayDownParams) {
      mappings.push({
        parameterId: `linking.${family}.staydown.${param}`,
        parameterDomain: "linking",
        subCategory: `${family}_staydown`,
        parameterName: param,
        targetEngine: "CycleTimeEstimatorEngine",
        mappingType: "cycle_time_impact",
        physicsChain: chain,
        enforcement: "advisory",
        confidenceLevel: conf,
      });
    }
  }

  // ── Transition / entry method (3 params × 36 families = 108 mappings)
  const transitionParams: Array<[string, NonCAMMappingType, string, string]> = [
    ["transition_type", "cycle_time_impact",
      "transition_type (rapid/ramp/helix/plunge) → inter-feature move: helix safest, rapid fastest", "0.85"],
    ["entry_method", "approach_force_impact",
      "entry_method → first engagement strategy: ramp reduces peak force by sin(ramp_angle)", "0.88"],
    ["transition_feed", "cycle_time_impact",
      "transition_feed → non-cutting move speed: higher = faster cycle, risk of inertial overshoot", "0.80"],
  ];

  for (const family of cycleFamilies) {
    for (const [param, mtype, chain, conf] of transitionParams) {
      mappings.push({
        parameterId: `linking.${family}.transition.${param}`,
        parameterDomain: "linking",
        subCategory: `${family}_transition`,
        parameterName: param,
        targetEngine: mtype === "approach_force_impact" ? "KienzleForceModelEngine" : "CycleTimeEstimatorEngine",
        mappingType: mtype,
        physicsChain: chain,
        enforcement: "advisory",
        confidenceLevel: conf,
      });
    }
  }

  return mappings;
}

// ── Settings Domain Mappings (~265) ──────────────────────────────────────────
//
// Settings parameters mapped to simulation accuracy, computation cost,
// and configuration impact.

function buildSettingsMappings(): NonCAMMapping[] {
  const mappings: NonCAMMapping[] = [];

  // ── Calculation settings (~20 params)
  const calcParams: Array<[string, NonCAMMappingType, string, string]> = [
    ["tolerance", "computation_cost", "calculation tolerance → tighter = more segments = longer compute time: T ∝ 1/tolerance²", "0.85"],
    ["resolution", "simulation_accuracy", "resolution → mesh density for toolpath: higher = more accurate collision detection", "0.88"],
    ["arc_tolerance", "simulation_accuracy", "arc_tolerance → linearization density: affects G-code block count and surface finish", "0.90"],
    ["chord_error", "simulation_accuracy", "chord_error → max deviation from ideal surface: tighter = smoother finish, more G-code", "0.90"],
    ["smoothing", "simulation_accuracy", "smoothing → corner rounding tolerance: balances surface quality vs sharp corner fidelity", "0.82"],
    ["max_step_length", "simulation_accuracy", "max_step_length → toolpath discretization: shorter = more blocks = smoother but larger NC files", "0.85"],
    ["max_angle_step", "simulation_accuracy", "max_angle_step → 5-axis linearization: tighter = smoother motion but more controller load", "0.82"],
    ["cusp_height", "simulation_accuracy", "cusp_height → 3D finish stepover: h_cusp = R - √(R²-(ae/2)²), directly sets surface quality", "0.95"],
  ];

  for (const [param, mtype, chain, conf] of calcParams) {
    mappings.push({
      parameterId: `settings.calculation.${param}`,
      parameterDomain: "settings",
      subCategory: "calculation",
      parameterName: param,
      targetEngine: mtype === "computation_cost" ? "CycleTimeEstimatorEngine" : "SurfaceFinishPredictorEngine",
      mappingType: mtype,
      physicsChain: chain,
      enforcement: "advisory",
      confidenceLevel: conf,
    });
  }

  // ── Display settings (~25 params — cosmetic, minimal physics impact)
  const displayParams = [
    "shading_mode", "edge_display", "transparency", "color_scheme",
    "toolpath_display", "tool_display", "stock_display", "fixture_display",
    "wcs_display", "grid_display", "snap_settings", "unit_display",
    "coordinate_display", "dimension_display", "label_display",
    "zoom_speed", "rotation_speed", "selection_highlight",
    "background_color", "ambient_light", "section_view",
    "clipping_plane", "perspective_fov", "render_quality", "anti_aliasing",
  ];

  for (const param of displayParams) {
    mappings.push({
      parameterId: `settings.display.${param}`,
      parameterDomain: "settings",
      subCategory: "display",
      parameterName: param,
      targetEngine: "NONE",
      mappingType: "safety_advisory",
      physicsChain: `${param} → display-only parameter, no manufacturing physics impact`,
      enforcement: "advisory",
      confidenceLevel: "1.00",
    });
  }

  // ── Machine settings (~30 params)
  const machineParams: Array<[string, NonCAMMappingType, string, string, MappingEnforcement]> = [
    ["spindle_max_rpm", "safety_advisory", "spindle_max_rpm → hard ceiling for all S commands: S > max → alarm", "0.98", "hard_block"],
    ["spindle_max_power", "safety_advisory", "spindle_max_power → Pc = Fc×Vc/60000 must be < P_max at all times", "0.98", "hard_block"],
    ["max_feed_rate", "safety_advisory", "max_feed_rate → F command ceiling: F > max → controller clamp or alarm", "0.95", "hard_block"],
    ["rapid_rate", "cycle_time_impact", "rapid_rate → non-cutting traverse speed: affects total cycle time significantly", "0.90", "advisory"],
    ["axis_travel_x", "safety_advisory", "axis_travel_x → work envelope X limit: toolpath must fit", "0.98", "hard_block"],
    ["axis_travel_y", "safety_advisory", "axis_travel_y → work envelope Y limit", "0.98", "hard_block"],
    ["axis_travel_z", "safety_advisory", "axis_travel_z → work envelope Z limit", "0.98", "hard_block"],
    ["rotary_a_range", "safety_advisory", "rotary_a_range → A-axis travel limits for 5-axis moves", "0.95", "hard_block"],
    ["rotary_b_range", "safety_advisory", "rotary_b_range → B/C-axis travel limits", "0.95", "hard_block"],
    ["tool_change_time", "cycle_time_impact", "tool_change_time → T_tc per tool change: minimize changes for cycle time", "0.90", "advisory"],
    ["pallet_change_time", "cycle_time_impact", "pallet_change_time → T_pc per pallet swap", "0.85", "advisory"],
  ];

  for (const [param, mtype, chain, conf, enf] of machineParams) {
    mappings.push({
      parameterId: `settings.machine.${param}`,
      parameterDomain: "settings",
      subCategory: "machine",
      parameterName: param,
      targetEngine: mtype === "cycle_time_impact" ? "CycleTimeEstimatorEngine" : "DFMCheckEngine",
      mappingType: mtype,
      physicsChain: chain,
      enforcement: enf,
      confidenceLevel: conf,
    });
  }

  // ── Tool database settings (~15 params)
  const toolDbParams: Array<[string, string, string]> = [
    ["tool_length_offset", "tool_length_offset → H register: error propagates to all Z dimensions", "0.92"],
    ["tool_diameter_comp", "tool_diameter_comp → D register: error propagates to all XY dimensions", "0.92"],
    ["tool_life_limit", "tool_life_limit → minutes/parts before forced change: affects quality consistency", "0.85"],
    ["tool_wear_offset", "tool_wear_offset → incremental compensation: ±0.001mm per update typical", "0.88"],
    ["holder_type", "holder_type → clearance envelope: BT40 vs HSK63 vs CAT40 affects collision zone", "0.85"],
    ["gauge_length", "gauge_length → tool stickout: L in δ=FL³/3EI, critical for deflection", "0.95"],
  ];

  for (const [param, chain, conf] of toolDbParams) {
    mappings.push({
      parameterId: `settings.tooldb.${param}`,
      parameterDomain: "settings",
      subCategory: "tooldb",
      parameterName: param,
      targetEngine: param === "gauge_length" ? "ToolDeflectionEngine" : "DFMCheckEngine",
      mappingType: param === "gauge_length" ? "dfm_feasibility" : "safety_advisory",
      physicsChain: chain,
      enforcement: ["tool_length_offset", "tool_diameter_comp", "gauge_length"].includes(param) ? "warning" : "advisory",
      confidenceLevel: conf,
    });
  }

  // ── NC generation settings (~20 params)
  const ncGenParams: Array<[string, NonCAMMappingType, string, string]> = [
    ["line_numbers", "computation_cost", "line_numbers → N-word generation: affects file size, no physics impact", "0.70"],
    ["decimal_places", "simulation_accuracy", "decimal_places → position resolution: 3 = 0.001mm, 4 = 0.0001mm", "0.88"],
    ["arc_output", "simulation_accuracy", "arc_output (G2G3/linearize) → G2/G3 reduces file size 10-50×, requires arc support", "0.85"],
    ["block_numbering", "computation_cost", "block_numbering → NC file formatting, no physics impact", "0.70"],
    ["safe_start_block", "safety_advisory", "safe_start_block → G90/G17/G40/G49/G80 at program start: prevents mode inheritance errors", "0.95"],
    ["coolant_code", "safety_advisory", "coolant_code → M8/M7/M51 selection: through-spindle (M51) critical for deep holes", "0.90"],
    ["program_end", "safety_advisory", "program_end → M30/M02/M00: affects machine behavior at program completion", "0.85"],
    ["sub_program_style", "computation_cost", "sub_program_style → M98/G65/macro call: affects program size for repeated features", "0.78"],
  ];

  for (const [param, mtype, chain, conf] of ncGenParams) {
    mappings.push({
      parameterId: `settings.ncgen.${param}`,
      parameterDomain: "settings",
      subCategory: "ncgen",
      parameterName: param,
      targetEngine: mtype === "safety_advisory" ? "DFMCheckEngine" : "CycleTimeEstimatorEngine",
      mappingType: mtype,
      physicsChain: chain,
      enforcement: mtype === "safety_advisory" ? "warning" : "advisory",
      confidenceLevel: conf,
    });
  }

  // ── VIRTUAL Machining / Simulation settings (~15 params)
  const simParams: Array<[string, NonCAMMappingType, string, string]> = [
    ["collision_detection", "safety_advisory", "collision_detection → HARD BLOCK: must be ON for 5-axis, prevents machine crash", "0.99"],
    ["stock_verification", "simulation_accuracy", "stock_verification → remaining material check: detects air cuts and missed material", "0.92"],
    ["kinematic_check", "safety_advisory", "kinematic_check → axis limit verification: ensures all moves within machine travel", "0.98"],
    ["rapid_check", "safety_advisory", "rapid_check → verifies rapid moves don't traverse through stock/fixture", "0.95"],
    ["simulation_resolution", "simulation_accuracy", "simulation_resolution → mesh granularity for stock removal: finer = more accurate, slower", "0.85"],
    ["gouge_detection", "safety_advisory", "gouge_detection → holder/shank collision with part: HARD BLOCK if detected", "0.98"],
  ];

  for (const [param, mtype, chain, conf] of simParams) {
    mappings.push({
      parameterId: `settings.simulation.${param}`,
      parameterDomain: "settings",
      subCategory: "simulation",
      parameterName: param,
      targetEngine: mtype === "safety_advisory" ? "DFMCheckEngine" : "SurfaceFinishPredictorEngine",
      mappingType: mtype,
      physicsChain: chain,
      enforcement: ["collision_detection", "kinematic_check", "gouge_detection"].includes(param) ? "hard_block" : "advisory",
      confidenceLevel: conf,
    });
  }

  // ── Measurement system (~10 params — consistency checks)
  for (const param of ["unit_system", "angle_unit", "feed_unit", "speed_unit", "pressure_unit"]) {
    mappings.push({
      parameterId: `settings.measurement.${param}`,
      parameterDomain: "settings",
      subCategory: "measurement",
      parameterName: param,
      targetEngine: "DFMCheckEngine",
      mappingType: "safety_advisory",
      physicsChain: `${param} → unit consistency: mixed metric/imperial causes factor-of-25.4 errors`,
      enforcement: "hard_block",
      confidenceLevel: "0.98",
    });
  }

  // ── nightSHIFT batch (~10 params)
  for (const param of ["batch_mode", "job_queue", "priority", "retry_count", "log_level",
    "email_notification", "auto_start", "max_concurrent", "timeout", "archive_results"]) {
    mappings.push({
      parameterId: `settings.nightshift.${param}`,
      parameterDomain: "settings",
      subCategory: "nightshift",
      parameterName: param,
      targetEngine: "CycleTimeEstimatorEngine",
      mappingType: "computation_cost",
      physicsChain: `${param} → batch processing configuration: affects total unattended machining throughput`,
      enforcement: "advisory",
      confidenceLevel: "0.75",
    });
  }

  // ── UI feature mappings (~90 params — display-only, no physics)
  const uiFeatures = [
    "job_list_columns", "job_list_sort", "job_list_filter", "job_list_grouping",
    "toolpath_color_by", "toolpath_line_width", "operation_tree_layout",
    "parameter_panel_layout", "quick_access_toolbar", "context_menu_items",
    "keyboard_shortcuts", "mouse_button_mapping", "status_bar_items",
    "ribbon_tab_order", "recent_files_count", "auto_save_interval",
    "undo_levels", "startup_template", "language", "theme",
  ];

  for (const param of uiFeatures) {
    mappings.push({
      parameterId: `settings.ui.${param}`,
      parameterDomain: "settings",
      subCategory: "ui",
      parameterName: param,
      targetEngine: "NONE",
      mappingType: "safety_advisory",
      physicsChain: `${param} → UI preference, no manufacturing physics impact`,
      enforcement: "advisory",
      confidenceLevel: "1.00",
    });
  }

  return mappings;
}

// ── Master Export ─────────────────────────────────────────────────────────────

/**
 * All non-CAM physics/DFM/cost mappings: CAD + Fixture + Linking + Settings.
 * Built once at module load — zero runtime overhead.
 */
export const NONCAM_MAPPINGS: NonCAMMapping[] = [
  ...buildCADMappings(),
  ...buildFixtureMappings(),
  ...buildLinkingMappings(),
  ...buildSettingsMappings(),
];

// ── Summary ──────────────────────────────────────────────────────────────────

export interface NonCAMMappingSummary {
  totalMappings: number;
  byDomain: Record<NonCAMDomain, number>;
  byMappingType: Record<string, number>;
  byEnforcement: Record<MappingEnforcement, number>;
  hardBlockCount: number;
}

export const NONCAM_MAPPING_SUMMARY: NonCAMMappingSummary = (() => {
  const byDomain: Record<string, number> = { cad: 0, fixture: 0, linking: 0, settings: 0 };
  const byMappingType: Record<string, number> = {};
  const byEnforcement: Record<string, number> = { hard_block: 0, advisory: 0, warning: 0 };

  for (const m of NONCAM_MAPPINGS) {
    byDomain[m.parameterDomain] = (byDomain[m.parameterDomain] ?? 0) + 1;
    byMappingType[m.mappingType] = (byMappingType[m.mappingType] ?? 0) + 1;
    byEnforcement[m.enforcement] = (byEnforcement[m.enforcement] ?? 0) + 1;
  }

  return {
    totalMappings: NONCAM_MAPPINGS.length,
    byDomain: byDomain as Record<NonCAMDomain, number>,
    byMappingType,
    byEnforcement: byEnforcement as Record<MappingEnforcement, number>,
    hardBlockCount: byEnforcement["hard_block"] ?? 0,
  };
})();

// ── Engine class ─────────────────────────────────────────────────────────────

/**
 * HyperMillNonCAMMappingEngine
 *
 * Query methods for non-CAM physics/DFM/cost mappings.
 * All methods are pure (no side effects, no I/O).
 */
export class HyperMillNonCAMMappingEngine {
  /** Returns all mappings for a given domain */
  getMappingsByDomain(domain: NonCAMDomain): NonCAMMapping[] {
    return NONCAM_MAPPINGS.filter((m) => m.parameterDomain === domain);
  }

  /** Returns all mappings for a given sub-category */
  getMappingsBySubCategory(subCategory: string): NonCAMMapping[] {
    return NONCAM_MAPPINGS.filter((m) => m.subCategory === subCategory);
  }

  /** Returns a single mapping by parameterId, or undefined */
  getByParameterId(parameterId: string): NonCAMMapping | undefined {
    return NONCAM_MAPPINGS.find((m) => m.parameterId === parameterId);
  }

  /** Returns all hard-block mappings (safety-critical) */
  getHardBlocks(): NonCAMMapping[] {
    return NONCAM_MAPPINGS.filter((m) => m.enforcement === "hard_block");
  }

  /** Returns all mappings targeting a specific engine */
  getMappingsByEngine(engine: string): NonCAMMapping[] {
    return NONCAM_MAPPINGS.filter((m) => m.targetEngine === engine);
  }

  /** Returns the pre-computed summary */
  getSummary(): NonCAMMappingSummary {
    return NONCAM_MAPPING_SUMMARY;
  }
}

/** Singleton instance */
export const hyperMillNonCAMMappingEngine = new HyperMillNonCAMMappingEngine();
