/**
 * Pipeline Decision Taxonomy — CAMX-MS0.3 / U-CAMX02
 *
 * Canonical classification of the 114 decision points across the 9 production
 * pipelines into the 12 PipelineDecisionOrchestrator categories. Each entry
 * declares:
 *   - decision_point: stable identifier used by the orchestrator's audit log
 *   - pipeline: which assembler / orchestrator owns the decision
 *   - stage: named phase within the pipeline
 *   - category: one of 12 DecisionCategory values (matches orchestrator rubric)
 *   - current_method: HARDCODED | HEURISTIC | DYNAMIC
 *     HARDCODED → literal value (e.g. "0.05mm stepover for aluminum")
 *     HEURISTIC → rule table lookup ("if material==steel then ...")
 *     DYNAMIC   → already physics-scored (no retrofit needed)
 *
 * Consumers (orchestrator, pipelines, audit dashboards) use this list to:
 *   1. Enumerate every decision point (getTaxonomy / byPipeline / byCategory)
 *   2. Know which rubric to apply (the rubric is owned by the orchestrator)
 *   3. Report remaining HARDCODED/HEURISTIC debt as units U-CAMX03..U-CAMX24
 *      replace each current_method=HARDCODED|HEURISTIC with DYNAMIC.
 *
 * The scoring rubric weights live inside PipelineDecisionOrchestratorEngine
 * (TOOL_SELECT_RUBRIC, STRATEGY_SELECT_RUBRIC, …, SAFETY_CHECK_RUBRIC). This
 * file declares WHERE decisions happen and WHICH category+rubric applies.
 */

export type DecisionCategory =
  | "tool_select"
  | "strategy_select"
  | "parameter_optimize"
  | "coolant_select"
  | "entry_exit_select"
  | "sequence_optimize"
  | "workholding_validate"
  | "controller_select"
  | "holder_select"
  | "coating_select"
  | "work_offset_select"
  | "safety_check";

export type CurrentMethod = "HARDCODED" | "HEURISTIC" | "DYNAMIC";

export type Pipeline =
  | "PrintToProgram" // milling
  | "Turning"
  | "MultiAxis" // 5-axis simultaneous + 3+2
  | "MillTurn" // mill-turn / swiss multi-channel
  | "EDM" // wire / sinker / micro
  | "Grinding"
  | "Laser"
  | "Waterjet"
  | "QuoteToShip"; // 21-stage business pipeline

export interface DecisionPoint {
  /** Stable identifier. Written to orchestrator audit log. */
  decision_point: string;
  pipeline: Pipeline;
  /** Named phase inside the pipeline (roughly = function name). */
  stage: string;
  category: DecisionCategory;
  current_method: CurrentMethod;
  /** One-liner describing what is being decided. */
  description: string;
  /** Target rubric — redundant with category but pinned for audit. */
  rubric_id: string;
}

const R: Record<DecisionCategory, string> = {
  tool_select: "TOOL_SELECT_RUBRIC",
  strategy_select: "STRATEGY_SELECT_RUBRIC",
  parameter_optimize: "PARAMETER_OPTIMIZE_RUBRIC",
  coolant_select: "COOLANT_SELECT_RUBRIC",
  entry_exit_select: "ENTRY_EXIT_RUBRIC",
  sequence_optimize: "SEQUENCE_RUBRIC",
  workholding_validate: "WORKHOLDING_RUBRIC",
  controller_select: "CONTROLLER_RUBRIC",
  holder_select: "HOLDER_RUBRIC",
  coating_select: "COATING_RUBRIC",
  work_offset_select: "WORK_OFFSET_RUBRIC",
  safety_check: "SAFETY_CHECK_RUBRIC",
};

function pt(
  dp: string,
  pipeline: Pipeline,
  stage: string,
  category: DecisionCategory,
  current: CurrentMethod,
  description: string,
): DecisionPoint {
  return {
    decision_point: dp,
    pipeline,
    stage,
    category,
    current_method: current,
    description,
    rubric_id: R[category],
  };
}

// ────────────────────────────────────────────────────────────────────────
// 1. PrintToProgram (milling) — 22 decision points
// ────────────────────────────────────────────────────────────────────────
const P2P: DecisionPoint[] = [
  pt("p2p.wcs_select", "PrintToProgram", "setup", "work_offset_select", "HARDCODED", "WCS (G54/G55/G54.1 P1..)"),
  pt("p2p.stock_alignment", "PrintToProgram", "setup", "work_offset_select", "HEURISTIC", "stock-to-WCS alignment"),
  pt("p2p.workholding_select", "PrintToProgram", "setup", "workholding_validate", "HEURISTIC", "vise / chuck / fixture"),
  pt("p2p.tool_select_rough", "PrintToProgram", "roughing", "tool_select", "DYNAMIC", "roughing tool from 95K catalog (SmartToolSelector → orchestrator)"),
  pt("p2p.tool_select_finish", "PrintToProgram", "finishing", "tool_select", "DYNAMIC", "finishing tool (SmartToolSelector → orchestrator)"),
  pt("p2p.tool_select_drill", "PrintToProgram", "drilling", "tool_select", "DYNAMIC", "drill / peck drill (SmartToolSelector → orchestrator)"),
  pt("p2p.holder_select", "PrintToProgram", "tool_assembly", "holder_select", "HARDCODED", "holder (shrink / ER / hydraulic)"),
  pt("p2p.coating_select", "PrintToProgram", "tool_assembly", "coating_select", "DYNAMIC", "coating (TiAlN / AlCrN / DLC) — CoatingSelectionAdapter → orchestrator"),
  pt("p2p.strategy_rough", "PrintToProgram", "roughing", "strategy_select", "HEURISTIC", "adaptive / trochoidal / pocket"),
  pt("p2p.strategy_finish", "PrintToProgram", "finishing", "strategy_select", "HEURISTIC", "scallop / parallel / waterline"),
  pt("p2p.engagement_optimize", "PrintToProgram", "parameter_calc", "parameter_optimize", "DYNAMIC", "ae/ap solver (EngagementOptimizerAdapter → orchestrator)"),
  pt("p2p.feed_speed_rough", "PrintToProgram", "parameter_calc", "parameter_optimize", "HEURISTIC", "S/F for rough pass"),
  pt("p2p.feed_speed_finish", "PrintToProgram", "parameter_calc", "parameter_optimize", "HEURISTIC", "S/F for finish pass"),
  pt("p2p.entry_strategy", "PrintToProgram", "linking", "entry_exit_select", "HARDCODED", "helix / ramp / plunge"),
  pt("p2p.exit_strategy", "PrintToProgram", "linking", "entry_exit_select", "HARDCODED", "lead-off / retract"),
  pt("p2p.coolant_mode", "PrintToProgram", "coolant", "coolant_select", "DYNAMIC", "flood / MQL / through-spindle / air (CoolantStrategyAdapter → orchestrator)"),
  pt("p2p.safe_z", "PrintToProgram", "setup", "safety_check", "HARDCODED", "safe_Z clearance height"),
  pt("p2p.sequence_order", "PrintToProgram", "sequencing", "sequence_optimize", "HEURISTIC", "op order (drill→rough→finish vs tool-grouped)"),
  pt("p2p.controller_post", "PrintToProgram", "post", "controller_select", "HARDCODED", "controller dialect (Fanuc / Haas / Okuma)"),
  pt("p2p.probe_routine", "PrintToProgram", "verification", "safety_check", "HEURISTIC", "in-process probing scope"),
  pt("p2p.tool_life_plan", "PrintToProgram", "batch_plan", "parameter_optimize", "HEURISTIC", "tool life budget for batch"),
  pt("p2p.thermal_gap_plan", "PrintToProgram", "sequencing", "sequence_optimize", "HEURISTIC", "thermal gap insertions"),
];

// ────────────────────────────────────────────────────────────────────────
// 2. Turning — 14 decision points
// ────────────────────────────────────────────────────────────────────────
const TURN: DecisionPoint[] = [
  pt("turn.wcs_g54", "Turning", "setup", "work_offset_select", "HARDCODED", "turning WCS (G54/G55)"),
  pt("turn.chuck_jaw_select", "Turning", "setup", "workholding_validate", "HEURISTIC", "hard / soft / collet jaws"),
  pt("turn.insert_geometry", "Turning", "tool_select", "tool_select", "HEURISTIC", "insert shape (CNMG / TNMG / DNMG)"),
  pt("turn.insert_nose_radius", "Turning", "tool_select", "tool_select", "HEURISTIC", "nose radius per Ra target"),
  pt("turn.coating_insert", "Turning", "tool_select", "coating_select", "DYNAMIC", "insert coating (CoatingSelectionAdapter → orchestrator)"),
  pt("turn.boring_bar", "Turning", "tool_select", "tool_select", "HEURISTIC", "boring bar L/D"),
  pt("turn.css_vs_g97", "Turning", "parameter_calc", "parameter_optimize", "HEURISTIC", "CSS (G96) vs fixed RPM (G97)"),
  pt("turn.feed_per_rev", "Turning", "parameter_calc", "parameter_optimize", "HEURISTIC", "fn (mm/rev) per pass"),
  pt("turn.depth_of_cut", "Turning", "parameter_calc", "parameter_optimize", "DYNAMIC", "ap per pass (EngagementOptimizerAdapter → orchestrator)"),
  pt("turn.cycle_select", "Turning", "strategy", "strategy_select", "HARDCODED", "G71 vs G72 vs G73 vs G76"),
  pt("turn.coolant_method", "Turning", "coolant", "coolant_select", "DYNAMIC", "flood / HPC through-tool (CoolantStrategyAdapter → orchestrator)"),
  pt("turn.parting_force", "Turning", "safety", "safety_check", "HEURISTIC", "parting feed / force check"),
  pt("turn.steady_rest_decide", "Turning", "workholding", "workholding_validate", "HEURISTIC", "steady rest at L/D>3"),
  pt("turn.bar_pull_plan", "Turning", "setup", "sequence_optimize", "HEURISTIC", "bar feeder pull length"),
];

// ────────────────────────────────────────────────────────────────────────
// 3. MultiAxis — 12 decision points
// ────────────────────────────────────────────────────────────────────────
const MX: DecisionPoint[] = [
  pt("mx.axis_config", "MultiAxis", "kinematics", "controller_select", "HARDCODED", "3+2 vs 5-axis simultaneous"),
  pt("mx.rtcp_mode", "MultiAxis", "kinematics", "controller_select", "HARDCODED", "RTCP (G43.4) vs TCP (G43)"),
  pt("mx.tool_axis_tilt", "MultiAxis", "toolpath", "parameter_optimize", "HEURISTIC", "lead/lag angle"),
  pt("mx.singularity_handling", "MultiAxis", "kinematics", "safety_check", "HEURISTIC", "smooth through singularity"),
  pt("mx.tool_select_undercut", "MultiAxis", "tool_select", "tool_select", "DYNAMIC", "lollipop / ball / tapered (SmartToolSelector → orchestrator)"),
  pt("mx.holder_clearance", "MultiAxis", "tool_assembly", "holder_select", "HEURISTIC", "slim holder for undercut"),
  pt("mx.work_plane", "MultiAxis", "kinematics", "work_offset_select", "HARDCODED", "G68.2 tilted work plane"),
  pt("mx.entry_helix", "MultiAxis", "linking", "entry_exit_select", "HEURISTIC", "5-axis entry strategy"),
  pt("mx.collision_zone", "MultiAxis", "safety", "safety_check", "HEURISTIC", "head-clearance polygon"),
  pt("mx.impeller_blade_strategy", "MultiAxis", "strategy", "strategy_select", "HARDCODED", "flank vs point milling"),
  pt("mx.port_strategy", "MultiAxis", "strategy", "strategy_select", "HARDCODED", "port milling 5-axis approach"),
  pt("mx.linearization_tol", "MultiAxis", "post", "parameter_optimize", "HARDCODED", "post linearization tolerance"),
];

// ────────────────────────────────────────────────────────────────────────
// 4. MillTurn — 10 decision points
// ────────────────────────────────────────────────────────────────────────
const MT: DecisionPoint[] = [
  pt("mt.channel_sync", "MillTurn", "channels", "sequence_optimize", "HARDCODED", "P/Q sub-program sync"),
  pt("mt.subspindle_handoff", "MillTurn", "handoff", "sequence_optimize", "HEURISTIC", "OP10 → OP20 handoff"),
  pt("mt.live_tool_mode", "MillTurn", "tool_select", "tool_select", "HEURISTIC", "radial vs axial live tool"),
  pt("mt.c_axis_mode", "MillTurn", "kinematics", "controller_select", "HARDCODED", "C-axis spindle vs positioning"),
  pt("mt.polygon_strategy", "MillTurn", "strategy", "strategy_select", "HARDCODED", "polygon turning ratio"),
  pt("mt.bar_feeder_pitch", "MillTurn", "setup", "sequence_optimize", "HEURISTIC", "bar-feed pitch for swiss"),
  pt("mt.guide_bushing", "MillTurn", "setup", "workholding_validate", "HEURISTIC", "swiss guide bushing yes/no"),
  pt("mt.backworking_plan", "MillTurn", "strategy", "strategy_select", "HEURISTIC", "backworking sequence"),
  pt("mt.turret_index_time", "MillTurn", "sequencing", "sequence_optimize", "HEURISTIC", "turret index optimization"),
  pt("mt.multichannel_safe", "MillTurn", "safety", "safety_check", "HEURISTIC", "inter-channel collision guard"),
];

// ────────────────────────────────────────────────────────────────────────
// 5. EDM (wire / sinker / micro) — 12 decision points
// ────────────────────────────────────────────────────────────────────────
const EDM: DecisionPoint[] = [
  pt("edm.wire_diameter", "EDM", "tool_select", "tool_select", "HEURISTIC", "wire dia (0.1..0.3mm)"),
  pt("edm.wire_coating", "EDM", "tool_select", "coating_select", "DYNAMIC", "brass / coated / zinc (CoatingSelectionAdapter → orchestrator)"),
  pt("edm.ecode_select", "EDM", "parameter_calc", "parameter_optimize", "HEURISTIC", "E-code (machine-family family)"),
  pt("edm.pass_count", "EDM", "strategy", "strategy_select", "HEURISTIC", "rough + N skim passes"),
  pt("edm.offset_per_pass", "EDM", "parameter_calc", "parameter_optimize", "HARDCODED", "per-pass offset"),
  pt("edm.flushing_pressure", "EDM", "coolant", "coolant_select", "HEURISTIC", "top/bot flushing pressure"),
  pt("edm.dielectric_conductivity", "EDM", "coolant", "coolant_select", "HARDCODED", "conductivity target"),
  pt("edm.start_hole_location", "EDM", "setup", "work_offset_select", "HEURISTIC", "start hole placement"),
  pt("edm.tab_placement", "EDM", "strategy", "sequence_optimize", "HEURISTIC", "tab location + size"),
  pt("edm.corner_strategy", "EDM", "strategy", "strategy_select", "HARDCODED", "corner radius vs notch"),
  pt("edm.taper_compensation", "EDM", "parameter_calc", "parameter_optimize", "HEURISTIC", "U/V taper solve"),
  pt("edm.safety_break_recovery", "EDM", "safety", "safety_check", "HEURISTIC", "wire break recovery plan"),
];

// ────────────────────────────────────────────────────────────────────────
// 6. Grinding — 10 decision points
// ────────────────────────────────────────────────────────────────────────
const GR: DecisionPoint[] = [
  pt("gr.wheel_select", "Grinding", "tool_select", "tool_select", "HEURISTIC", "wheel grit / bond / hardness"),
  pt("gr.wheel_shape", "Grinding", "tool_select", "tool_select", "HARDCODED", "straight / cup / dish / profile"),
  pt("gr.dressing_interval", "Grinding", "parameter_calc", "parameter_optimize", "HEURISTIC", "dress interval"),
  pt("gr.dressing_params", "Grinding", "parameter_calc", "parameter_optimize", "HEURISTIC", "single-point / rotary"),
  pt("gr.feed_rate", "Grinding", "parameter_calc", "parameter_optimize", "HEURISTIC", "feed / table speed"),
  pt("gr.depth_of_grind", "Grinding", "parameter_calc", "parameter_optimize", "HARDCODED", "grind depth per pass"),
  pt("gr.coolant_method", "Grinding", "coolant", "coolant_select", "DYNAMIC", "flood / mist / high-pressure (CoolantStrategyAdapter → orchestrator)"),
  pt("gr.strategy_type", "Grinding", "strategy", "strategy_select", "HEURISTIC", "surface / cylindrical / centerless / creep-feed / ID"),
  pt("gr.burn_threshold", "Grinding", "safety", "safety_check", "HEURISTIC", "burn detection limit"),
  pt("gr.workholding_magnetic", "Grinding", "workholding", "workholding_validate", "HEURISTIC", "magnetic chuck vs vise"),
];

// ────────────────────────────────────────────────────────────────────────
// 7. Laser — 10 decision points
// ────────────────────────────────────────────────────────────────────────
const LA: DecisionPoint[] = [
  pt("la.process_mode", "Laser", "strategy", "strategy_select", "HARDCODED", "cut / mark / weld / drill"),
  pt("la.laser_source", "Laser", "tool_select", "tool_select", "HEURISTIC", "fiber / CO2 / ND:YAG / Nd:Vanadate"),
  pt("la.gas_select", "Laser", "coolant", "coolant_select", "DYNAMIC", "N2 / O2 / air / Ar (CoolantStrategyAdapter → orchestrator)"),
  pt("la.nozzle_standoff", "Laser", "parameter_calc", "parameter_optimize", "HARDCODED", "standoff mm"),
  pt("la.focal_position", "Laser", "parameter_calc", "parameter_optimize", "HEURISTIC", "focal offset per thickness"),
  pt("la.cut_speed", "Laser", "parameter_calc", "parameter_optimize", "HEURISTIC", "feed m/min"),
  pt("la.power_duty_cycle", "Laser", "parameter_calc", "parameter_optimize", "HEURISTIC", "power + pulse duty"),
  pt("la.pierce_strategy", "Laser", "linking", "entry_exit_select", "HARDCODED", "pulsed vs CW pierce"),
  pt("la.nesting_strategy", "Laser", "sequencing", "sequence_optimize", "HEURISTIC", "nest & cut order"),
  pt("la.controller_post", "Laser", "post", "controller_select", "HARDCODED", "Trumpf / Bystronic / Amada"),
];

// ────────────────────────────────────────────────────────────────────────
// 8. Waterjet — 10 decision points
// ────────────────────────────────────────────────────────────────────────
const WJ: DecisionPoint[] = [
  pt("wj.abrasive_vs_pure", "Waterjet", "tool_select", "tool_select", "HARDCODED", "abrasive vs pure water"),
  pt("wj.abrasive_grit", "Waterjet", "tool_select", "tool_select", "HEURISTIC", "80 / 120 / 150 mesh"),
  pt("wj.abrasive_flow", "Waterjet", "parameter_calc", "parameter_optimize", "HEURISTIC", "flow lb/min"),
  pt("wj.pressure_mpa", "Waterjet", "parameter_calc", "parameter_optimize", "HARDCODED", "pressure 300..600MPa"),
  pt("wj.nozzle_orifice", "Waterjet", "tool_select", "tool_select", "HARDCODED", "orifice dia"),
  pt("wj.mixing_tube", "Waterjet", "tool_select", "tool_select", "HARDCODED", "mixing tube L/D"),
  pt("wj.quality_level", "Waterjet", "strategy", "strategy_select", "HEURISTIC", "Q1..Q5 cut quality"),
  pt("wj.taper_compensation", "Waterjet", "parameter_calc", "parameter_optimize", "HEURISTIC", "dynamic taper head yes/no"),
  pt("wj.depth_per_pass", "Waterjet", "parameter_calc", "parameter_optimize", "HARDCODED", "multi-pass depth"),
  pt("wj.pierce_delay", "Waterjet", "linking", "entry_exit_select", "HARDCODED", "pierce delay per material"),
];

// ────────────────────────────────────────────────────────────────────────
// 9. QuoteToShip (business) — 14 decision points
// ────────────────────────────────────────────────────────────────────────
const Q2S: DecisionPoint[] = [
  pt("q2s.machine_recommend", "QuoteToShip", "quoting", "controller_select", "HEURISTIC", "best machine for the job"),
  pt("q2s.material_substitute", "QuoteToShip", "quoting", "tool_select", "HEURISTIC", "allowable material substitute"),
  pt("q2s.supplier_select", "QuoteToShip", "material_acquisition", "tool_select", "HEURISTIC", "raw stock supplier"),
  pt("q2s.stock_size", "QuoteToShip", "material_acquisition", "parameter_optimize", "HEURISTIC", "bar / plate size"),
  pt("q2s.batch_size", "QuoteToShip", "scheduling", "parameter_optimize", "HEURISTIC", "optimal batch"),
  pt("q2s.schedule_slot", "QuoteToShip", "scheduling", "sequence_optimize", "HEURISTIC", "slot on machine calendar"),
  pt("q2s.fixture_reuse", "QuoteToShip", "setup", "workholding_validate", "HEURISTIC", "existing vs new fixture"),
  pt("q2s.tool_reuse", "QuoteToShip", "setup", "tool_select", "HEURISTIC", "existing crib vs purchase"),
  pt("q2s.inspection_plan", "QuoteToShip", "quality", "safety_check", "HEURISTIC", "FAI + SPC sample plan"),
  pt("q2s.ship_method", "QuoteToShip", "shipping", "sequence_optimize", "HEURISTIC", "shipping carrier + service"),
  pt("q2s.cost_margin", "QuoteToShip", "quoting", "parameter_optimize", "HEURISTIC", "margin per part class"),
  pt("q2s.lead_time", "QuoteToShip", "quoting", "parameter_optimize", "HEURISTIC", "promised lead time"),
  pt("q2s.risk_buffer", "QuoteToShip", "quoting", "safety_check", "HEURISTIC", "scrap/rework buffer %"),
  pt("q2s.payment_terms", "QuoteToShip", "quoting", "parameter_optimize", "HARDCODED", "net-30 vs prepay"),
];

// ────────────────────────────────────────────────────────────────────────
// Full taxonomy — 22 + 14 + 12 + 10 + 12 + 10 + 10 + 10 + 14 = 114
// ────────────────────────────────────────────────────────────────────────
export const PIPELINE_DECISION_TAXONOMY: ReadonlyArray<DecisionPoint> = Object.freeze([
  ...P2P,
  ...TURN,
  ...MX,
  ...MT,
  ...EDM,
  ...GR,
  ...LA,
  ...WJ,
  ...Q2S,
]);

// ────────────────────────────────────────────────────────────────────────
// Query helpers
// ────────────────────────────────────────────────────────────────────────
export function byPipeline(p: Pipeline): DecisionPoint[] {
  return PIPELINE_DECISION_TAXONOMY.filter((d) => d.pipeline === p);
}

export function byCategory(c: DecisionCategory): DecisionPoint[] {
  return PIPELINE_DECISION_TAXONOMY.filter((d) => d.category === c);
}

export function byCurrentMethod(m: CurrentMethod): DecisionPoint[] {
  return PIPELINE_DECISION_TAXONOMY.filter((d) => d.current_method === m);
}

export function lookup(dp: string): DecisionPoint | undefined {
  return PIPELINE_DECISION_TAXONOMY.find((d) => d.decision_point === dp);
}

export interface TaxonomyStats {
  total: number;
  by_pipeline: Record<Pipeline, number>;
  by_category: Record<DecisionCategory, number>;
  by_current_method: Record<CurrentMethod, number>;
  retrofit_pending: number; // HARDCODED + HEURISTIC
}

export function stats(): TaxonomyStats {
  const out: TaxonomyStats = {
    total: PIPELINE_DECISION_TAXONOMY.length,
    by_pipeline: {
      PrintToProgram: 0, Turning: 0, MultiAxis: 0, MillTurn: 0,
      EDM: 0, Grinding: 0, Laser: 0, Waterjet: 0, QuoteToShip: 0,
    },
    by_category: {
      tool_select: 0, strategy_select: 0, parameter_optimize: 0,
      coolant_select: 0, entry_exit_select: 0, sequence_optimize: 0,
      workholding_validate: 0, controller_select: 0, holder_select: 0,
      coating_select: 0, work_offset_select: 0, safety_check: 0,
    },
    by_current_method: { HARDCODED: 0, HEURISTIC: 0, DYNAMIC: 0 },
    retrofit_pending: 0,
  };
  for (const d of PIPELINE_DECISION_TAXONOMY) {
    out.by_pipeline[d.pipeline]++;
    out.by_category[d.category]++;
    out.by_current_method[d.current_method]++;
    if (d.current_method !== "DYNAMIC") out.retrofit_pending++;
  }
  return out;
}
