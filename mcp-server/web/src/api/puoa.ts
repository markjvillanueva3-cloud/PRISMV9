/**
 * EDMProgramAssemblerEngine — Complete EDM Program Generation Pipeline
 *
 * The EDM equivalent of TurningProgramAssemblerEngine / CNCProgramAssemblerEngine.
 * Accepts a part description and generates a complete, controller-ready EDM program
 * by orchestrating all EDM physics inline (no imports of EDM engines).
 *
 * Pipeline:
 *   1. Analyze part profile → determine required operations (wire/sinker/micro)
 *   2. Auto-assign electrodes/wire settings to operation slots
 *   3. Sequence operations: roughing → semi-finishing → finishing → skim passes
 *   4. Compute MRR / Ra / electrode wear / recast layer per operation (inline physics)
 *   5. Generate G-code (Fanuc WEDM / Mitsubishi / Sodick / AgieCharmilles / Makino / Generic)
 *   6. Stochastic uncertainty via Monte Carlo (500 samples, Box-Muller)
 *   7. Cycle time estimation (wire length / cut speed + sinker depth / feed)
 *
 * Physics models (inline, no imports):
 *   - Discharge energy: E = V_gap × I_peak × t_on
 *   - Wire MRR: V_cut = (K × I_peak × t_on) / (h × D_wire)  [Sato model]
 *   - Sinker MRR: (C_mrr × I_peak^a × t_on^b) / ρ  [empirical, material table]
 *   - Surface roughness: Ra = C_ra × I_peak^α × t_on^β  [Puertas & Luis 2004]
 *   - Electrode wear: θ = V_elec / V_work  [material pair tables]
 *   - Recast layer: t_recast = C × E^0.33  [DiBitonto 1989]
 *   - HAZ depth: HAZ = √(4 × α × t_on)  [Carslaw & Jaeger thermal model]
 *   - Gap width: gap = D_wire/2 + spark_gap  [Charmilles application guide]
 *   - Monte Carlo Box-Muller: vary I_peak ±5%, t_on ±3%, V_gap ±8%, tension ±5%
 *
 * Controller dialects supported:
 *   fanuc_wedm, mitsubishi_wedm, sodick, agiecharmilles, makino_edm, generic_edm
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * References:
 *   - DiBitonto et al. (1989): Theoretical models of the electrical discharge machining process
 *   - Sato et al. (1985): Wire EDM cutting speed model
 *   - Puertas & Luis (2004): Ra = C·I^α·t_on^β empirical coefficients
 *   - Kunieda et al. (2005): Advancing EDM through fundamental insight into the process
 *   - Schumacher (2004): Modeling of the micro EDM process
 *   - Charmilles Technologies: EDM Application Guide (internal)
 *   - Makino EDM: Process Parameter Tables (application notes)
 *   - Machinery's Handbook, 30th ed., Ch. 32: Electrical Discharge Machining
 *
 * @module engines/EDMProgramAssemblerEngine
 */
/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
    value: T;
    unit: string;
    formula?: string;
    confidence?: number;
}
/** Supported EDM controller dialects. */
export type EDMController = "fanuc_wedm" | "mitsubishi_wedm" | "sodick" | "agiecharmilles" | "makino_edm" | "generic_edm";
/** EDM process type. */
export type EDMProcessType = "wire" | "sinker" | "micro";
/** A 2D profile point for wire EDM contour paths. */
export interface WireProfilePoint {
    x_mm: number;
    y_mm: number;
    /** Optional arc radius — if set, arc move from previous point. */
    arc_radius_mm?: number;
    /** Arc direction: "CW" or "CCW". */
    arc_dir?: "CW" | "CCW";
}
/** A taper segment for 4-axis UV wire EDM. */
export interface TaperSegment {
    /** XY lower plane profile point. */
    xy: WireProfilePoint;
    /** UV upper plane offset (independent 4-axis control). */
    uv: {
        u_mm: number;
        v_mm: number;
    };
}
/** Complete Wire EDM part profile. */
export interface WireEDMPartProfile {
    /** Part name / drawing number. */
    part_name: string;
    /** Workpiece material (from EDM_MATERIALS table key). */
    material: string;
    /** Workpiece thickness (stack height) [mm]. */
    thickness_mm: number;
    /** 2D contour profile (XY plane). */
    contour: WireProfilePoint[];
    /** 4-axis taper segments (optional — uses contour if absent). */
    taper_segments?: TaperSegment[];
    /** Wire type: "brass", "coated", "molybdenum". */
    wire_type?: "brass" | "coated" | "molybdenum";
    /** Wire diameter [mm] (default 0.25). */
    wire_diameter_mm?: number;
    /** Number of skim passes after roughing (0–3). */
    num_skim_passes?: number;
    /** Target surface finish [µm Ra]. */
    target_Ra_um?: number;
    /** Target dimensional tolerance [mm] (e.g. ±0.005). */
    target_tolerance_mm?: number;
    /** Start hole position (drilled separately). */
    start_hole?: {
        x_mm: number;
        y_mm: number;
        diameter_mm: number;
    };
    /** Submersion mode: true = submerged, false = flushing only. */
    submerged?: boolean;
    /** Taper angle [degrees] for uniform taper (alternative to taper_segments). */
    taper_angle_deg?: number;
    /** Corner slow-down strategy. */
    corner_strategy?: "radius_reduction" | "slow_down" | "none";
    /** Controller dialect. */
    controller?: EDMController;
    /** Program number (default 1). */
    program_number?: number;
    /** Machine brand for registry lookup. */
    machine_brand?: string;
    /** Machine model for registry lookup. */
    machine_model?: string;
    /** Pipeline run ID for checkpoint tracking. */
    runId?: string;
}
/** A single wire EDM operation (roughing cut or skim pass). */
export interface WireEDMOperation {
    /** Operation type. */
    type: "rough_cut" | "skim_1" | "skim_2" | "skim_3" | "start_hole" | "auto_thread" | "4axis_taper";
    /** Human-readable name. */
    name: string;
    /** Pass number (1 = rough, 2 = 1st skim, etc.). */
    pass_number: number;
    /** Power settings string (controller-specific). */
    power_setting: string;
    /** Wire tension [N]. */
    wire_tension_N: number;
    /** Flushing pressure [bar]. */
    flushing_pressure_bar: number;
    /** Cutting speed [mm/min]. */
    cutting_speed_mm_min: AtomicValue<number>;
    /** Wire offset (half kerf + spark gap per side) [mm]. */
    wire_offset_mm: number;
    /** Predicted surface finish [µm Ra]. */
    predicted_Ra_um: AtomicValue<number>;
    /** Recast layer thickness [µm]. */
    recast_layer_um: AtomicValue<number>;
    /** HAZ depth [µm]. */
    haz_um: AtomicValue<number>;
    /** Generated G-code lines. */
    gcode_lines: string[];
    /** Estimated operation time [s]. */
    estimated_time_s: number;
}
/** Complete assembled Wire EDM program. */
export interface WireEDMProgram {
    program_number: string;
    header_comments: string[];
    part_profile: WireEDMPartProfile;
    electrode_setup: WireElectrodeSetup;
    operations: WireEDMOperation[];
    gcode: string;
    estimated_cycle_time_s: number;
    total_wire_consumed_m: number;
    warnings: string[];
    uncertainty?: EDMUncertainty;
}
/** Wire electrode configuration. */
export interface WireElectrodeSetup {
    wire_type: string;
    wire_diameter_mm: number;
    wire_material: string;
    wire_tensile_strength_MPa: number;
    recommended_tension_N: number;
    spool_length_m: number;
    estimated_consumption_m: number;
}
/** A sinker EDM cavity feature. */
export interface SinkerCavityFeature {
    /** Feature type. */
    type: "blind_cavity" | "through_cavity" | "rib" | "radius_pocket" | "C_axis_slot" | "micro_hole";
    /** Feature name. */
    name: string;
    /** Cavity depth [mm]. */
    depth_mm: number;
    /** Projected area [mm²]. */
    area_mm2: number;
    /** Volume to remove [mm³]. */
    volume_mm3: number;
    /** X position [mm]. */
    x_mm: number;
    /** Y position [mm]. */
    y_mm: number;
    /** Target surface finish [µm Ra]. */
    target_Ra_um?: number;
    /** Orbiting pattern: "circular", "square", "custom". */
    orbit_pattern?: "circular" | "square" | "custom";
    /** Orbiting radius [mm]. */
    orbit_radius_mm?: number;
    /** C-axis rotation angle [degrees] (for indexed sinker). */
    c_axis_angle_deg?: number;
}
/** Sinker EDM electrode assignment. */
export interface SinkerElectrode {
    /** Electrode number (1-based). */
    electrode_number: number;
    /** Electrode material: "copper", "graphite", "tungsten_copper". */
    material: "copper" | "graphite" | "tungsten_copper";
    /** Operation stage this electrode is for. */
    stage: "roughing" | "semi_finishing" | "finishing";
    /** Electrode undersize [mm] (accounts for spark gap). */
    undersize_mm: number;
    /** Features this electrode handles. */
    feature_names: string[];
    /** Peak current [A]. */
    peak_current_A: number;
    /** Pulse on-time [µs]. */
    pulse_on_us: number;
    /** Pulse off-time [µs]. */
    pulse_off_us: number;
    /** Gap voltage [V]. */
    gap_voltage_V: number;
}
/** Complete sinker EDM part profile. */
export interface SinkerEDMPartProfile {
    part_name: string;
    material: string;
    /** Workpiece bounding height [mm]. */
    workpiece_height_mm: number;
    features: SinkerCavityFeature[];
  