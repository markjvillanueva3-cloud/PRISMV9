/**
 * TroubleshootingAssistantEngine
 * Interactive root-cause diagnosis for manufacturing problems.
 * Uses decision trees + playbook rules + physics models to guide
 * operators from symptom to root cause to fix.
 *
 * Covers 8 problem domains: surface finish, dimensional accuracy,
 * tool breakage, chatter/vibration, chip problems, thermal issues,
 * machine alarms, and workholding failures.
 *
 * Actions: troubleshoot_start, troubleshoot_answer, troubleshoot_quick,
 *          troubleshoot_common
 */

import { randomUUID } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export type ProblemDomain =
  | "surface_finish"
  | "dimensional_accuracy"
  | "tool_breakage"
  | "chatter_vibration"
  | "chip_problems"
  | "thermal_issues"
  | "machine_alarms"
  | "workholding";

export type FixCost = "free" | "low" | "medium" | "high";

export interface Fix {
  action: string;
  cost: FixCost;
  effectiveness: number; // 0-1
}

export interface Diagnosis {
  root_cause: string;
  explanation: string;
  fixes: Fix[];
  related_playbook_rules?: string[];
  physics_check?: string;
}

export interface DiagnosticAnswer {
  label: string;
  next_node?: string;
  diagnosis?: Diagnosis;
}

export interface DiagnosticNode {
  id: string;
  domain: ProblemDomain;
  question: string;
  answers: DiagnosticAnswer[];
}

export interface DiagnosticSession {
  session_id: string;
  domain: ProblemDomain;
  current_node_id: string;
  history: Array<{ node_id: string; answer: string }>;
  started_at: number;
  possible_causes: Array<{ cause: string; probability: number }>;
}

export interface StartDiagnosisInput {
  domain: ProblemDomain;
  symptoms?: string[];
}

export interface StartDiagnosisResult {
  session_id: string;
  first_question: DiagnosticNode;
  possible_causes: Array<{ cause: string; probability: number }>;
}

export interface AnswerQuestionInput {
  session_id: string;
  answer: string;
}

export interface AnswerQuestionResult {
  next_question?: DiagnosticNode;
  diagnosis?: Diagnosis;
  remaining_questions: number;
  confidence: number;
}

export interface QuickDiagnoseInput {
  symptoms: string[];
  material?: string;
  operation?: string;
  tool_type?: string;
}

export interface QuickDiagnoseResult {
  top_causes: Array<{ cause: string; probability: number; fixes: string[] }>;
  recommended_checks: string[];
}

export interface CommonProblemsInput {
  domain?: ProblemDomain;
  operation?: string;
}

export interface CommonProblem {
  domain: ProblemDomain;
  problem: string;
  frequency_rank: number;
  quick_fix: string;
  root_cause: string;
}

export interface CommonProblemsResult {
  problems: CommonProblem[];
}

// ============================================================================
// DECISION TREE KNOWLEDGE BASE — 8 domains, 56 nodes
// ============================================================================

const DIAGNOSTIC_NODES: DiagnosticNode[] = [
  // ── Surface Finish (8 nodes) ──────────────────────────────────────────────
  {
    id: "sf-root",
    domain: "surface_finish",
    question: "How would you describe the surface finish defect?",
    answers: [
      { label: "Wavy / undulating pattern", next_node: "sf-wavy" },
      { label: "Rough / scratchy overall", next_node: "sf-rough" },
      { label: "Directional marks / lines", next_node: "sf-directional" },
      { label: "Random marks / pitting", next_node: "sf-random" },
    ],
  },
  {
    id: "sf-wavy",
    domain: "surface_finish",
    question: "Is the waviness periodic (regular spacing) or irregular?",
    answers: [
      {
        label: "Periodic / regular spacing",
        diagnosis: {
          root_cause: "Chatter vibration",
          explanation:
            "Periodic waviness indicates forced or self-excited vibration at a specific frequency. The wavelength corresponds to vibration frequency / (feed rate × spindle speed).",
          fixes: [
            { action: "Reduce spindle speed by 10-15% to escape stability lobe", cost: "free", effectiveness: 0.8 },
            { action: "Increase feed per tooth to shift chatter boundary", cost: "free", effectiveness: 0.6 },
            { action: "Shorten tool overhang or use shrink-fit holder", cost: "low", effectiveness: 0.85 },
            { action: "Switch to variable-helix end mill", cost: "medium", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["vib-001", "vib-003", "sf-002"],
          physics_check: "f_chatter = N × z × RPM / 60 where N = lobe number",
        },
      },
      {
        label: "Irregular waviness",
        diagnosis: {
          root_cause: "Machine axis servo mismatch or loose gibs",
          explanation:
            "Irregular waviness suggests mechanical play in the machine tool axes rather than dynamic vibration. Backlash or loose gibs cause unpredictable surface deviations.",
          fixes: [
            { action: "Check and adjust gib tightness on all axes", cost: "free", effectiveness: 0.7 },
            { action: "Run ball-bar test to identify servo mismatch", cost: "low", effectiveness: 0.8 },
            { action: "Re-tune servo gains (Kp/Ki/Kd)", cost: "low", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["sf-003"],
          physics_check: "Backlash measured via dial indicator reversal test",
        },
      },
    ],
  },
  {
    id: "sf-rough",
    domain: "surface_finish",
    question: "Does the roughness change along the cut or is it uniform?",
    answers: [
      { label: "Gets worse as cut progresses", next_node: "sf-rough-progressive" },
      {
        label: "Uniformly rough",
        diagnosis: {
          root_cause: "Feed per tooth too high for finish requirement",
          explanation:
            "Theoretical Ra = f²/(32×r) where f = feed per tooth and r = nose radius. High feed directly produces poor surface finish regardless of other conditions.",
          fixes: [
            { action: "Reduce feed per tooth (target fz < 0.05mm for finishing)", cost: "free", effectiveness: 0.9 },
            { action: "Use wiper insert geometry", cost: "medium", effectiveness: 0.85 },
            { action: "Increase tool nose radius", cost: "low", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["sf-001", "finishing-002"],
          physics_check: "Ra_theoretical = fz² / (32 × r_nose)",
        },
      },
    ],
  },
  {
    id: "sf-rough-progressive",
    domain: "surface_finish",
    question: "Is there built-up edge (BUE) visible on the tool?",
    answers: [
      {
        label: "Yes, material welded to cutting edge",
        diagnosis: {
          root_cause: "Built-up edge (BUE) formation",
          explanation:
            "At certain speed/temperature ranges, workpiece material welds to the cutting edge, periodically breaks off, and ruins surface finish. Common with aluminum, stainless steel, and low-carbon steel.",
          fixes: [
            { action: "Increase cutting speed 20-40% to exceed BUE temperature threshold", cost: "free", effectiveness: 0.85 },
            { action: "Apply high-pressure coolant (70+ bar) directed at cutting edge", cost: "low", effectiveness: 0.8 },
            { action: "Switch to polished/coated insert (TiAlN or DLC for aluminum)", cost: "medium", effectiveness: 0.9 },
            { action: "Use positive rake angle tooling", cost: "medium", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["material-001", "sf-004"],
          physics_check: "BUE zone: Vc typically 30-80 m/min for steel, increase beyond 100 m/min",
        },
      },
      {
        label: "No, edge looks worn/rounded",
        diagnosis: {
          root_cause: "Progressive tool wear (flank wear)",
          explanation:
            "Tool flank wear increases the effective nose radius geometry and ploughing force, degrading surface finish. VB_max exceeds 0.3mm threshold for finishing.",
          fixes: [
            { action: "Replace worn insert/tool", cost: "medium", effectiveness: 0.95 },
            { action: "Reduce cutting speed to extend tool life", cost: "free", effectiveness: 0.6 },
            { action: "Switch to more wear-resistant grade (ceramic or CBN)", cost: "high", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["tool_life-001", "sf-005"],
          physics_check: "Taylor tool life: T = (C/Vc)^(1/n), check VB_max < 0.3mm",
        },
      },
    ],
  },
  {
    id: "sf-directional",
    domain: "surface_finish",
    question: "Are the marks in the feed direction or perpendicular?",
    answers: [
      {
        label: "In feed direction (along toolpath)",
        diagnosis: {
          root_cause: "Chip recutting / poor chip evacuation",
          explanation:
            "Chips are being dragged along the machined surface by the tool. This creates directional scratches aligned with tool motion. Common in slotting and deep pocketing.",
          fixes: [
            { action: "Increase coolant pressure/flow for chip evacuation", cost: "free", effectiveness: 0.75 },
            { action: "Switch to through-spindle coolant", cost: "low", effectiveness: 0.85 },
            { action: "Use air blast between passes to clear chips", cost: "free", effectiveness: 0.65 },
            { action: "Add chip breaker geometry or reduce depth of cut", cost: "low", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["chip_control-001", "chip_control-003"],
        },
      },
      {
        label: "Perpendicular to feed (cutter marks)",
        diagnosis: {
          root_cause: "Tool runout or insert height mismatch",
          explanation:
            "When one insert/flute sits higher than others, it leaves deeper marks at cutter-pitch spacing. TIR > 0.01mm causes visible lines in finishing.",
          fixes: [
            { action: "Measure and correct tool runout (TIR < 0.005mm for finishing)", cost: "free", effectiveness: 0.85 },
            { action: "Re-seat insert and check pocket for chips/damage", cost: "free", effectiveness: 0.8 },
            { action: "Switch to hydraulic or shrink-fit holder", cost: "medium", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["sf-006", "tool_selection-002"],
          physics_check: "TIR measurement with dial indicator on tool nose",
        },
      },
    ],
  },
  {
    id: "sf-random",
    domain: "surface_finish",
    question: "Is the surface finish issue only in certain areas of the part?",
    answers: [
      {
        label: "Only in pockets or enclosed areas",
        diagnosis: {
          root_cause: "Coolant starvation in enclosed features",
          explanation:
            "Coolant cannot reach the cutting zone in deep pockets or enclosed areas, leading to thermal damage, chip welding, and poor finish in those regions only.",
          fixes: [
            { action: "Switch to through-tool coolant delivery", cost: "medium", effectiveness: 0.9 },
            { action: "Use MQL (minimum quantity lubrication) mist", cost: "low", effectiveness: 0.75 },
            { action: "Reduce depth of cut and use peck cycles", cost: "free", effectiveness: 0.65 },
          ],
          related_playbook_rules: ["thermal-001", "coolant-002"],
        },
      },
      {
        label: "Random across entire surface",
        diagnosis: {
          root_cause: "Contaminated coolant or debris in system",
          explanation:
            "Particles in the coolant system (metal fines, bacteria, tramp oil) get deposited on the surface or cause micro-scratches during machining.",
          fixes: [
            { action: "Check coolant concentration and replace if degraded", cost: "low", effectiveness: 0.8 },
            { action: "Clean coolant sump and replace filters", cost: "low", effectiveness: 0.85 },
            { action: "Install finer filtration (25 micron or better)", cost: "medium", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["coolant-001"],
        },
      },
    ],
  },

  // ── Dimensional Accuracy (8 nodes) ────────────────────────────────────────
  {
    id: "da-root",
    domain: "dimensional_accuracy",
    question: "How is the dimension deviating from the target?",
    answers: [
      { label: "Consistently oversized", next_node: "da-oversized" },
      { label: "Consistently undersized", next_node: "da-undersized" },
      { label: "Taper (dimension changes along length)", next_node: "da-taper" },
      { label: "Inconsistent / random variation", next_node: "da-inconsistent" },
    ],
  },
  {
    id: "da-oversized",
    domain: "dimensional_accuracy",
    question: "Does the error increase with longer cycle times?",
    answers: [
      {
        label: "Yes, gets worse over time",
        diagnosis: {
          root_cause: "Thermal growth of machine spindle/axes",
          explanation:
            "Machine tool components expand as temperature rises during operation. Spindle thermal growth can reach 30-50 microns. Ball screws grow ~12 microns/°C per meter.",
          fixes: [
            { action: "Allow 20-30 min warm-up cycle before precision work", cost: "free", effectiveness: 0.7 },
            { action: "Use in-process probing to compensate for drift", cost: "low", effectiveness: 0.9 },
            { action: "Apply thermal error compensation (if controller supports)", cost: "low", effectiveness: 0.85 },
            { action: "Install through-spindle cooling system", cost: "high", effectiveness: 0.95 },
          ],
          related_playbook_rules: ["thermal-002", "thermal-003"],
          physics_check: "δ_thermal = α × ΔT × L (coefficient of thermal expansion × temperature rise × length)",
        },
      },
      {
        label: "No, consistent from first part",
        diagnosis: {
          root_cause: "Tool deflection under cutting forces",
          explanation:
            "The tool bends away from the workpiece under Kienzle cutting forces, leaving excess material. δ = F×L³/(3×E×I) — long tools and high forces amplify this.",
          fixes: [
            { action: "Reduce radial depth of cut (ae) to lower side forces", cost: "free", effectiveness: 0.8 },
            { action: "Shorten tool overhang or use larger diameter", cost: "low", effectiveness: 0.85 },
            { action: "Apply deflection compensation in CAM (lean into cut)", cost: "free", effectiveness: 0.75 },
            { action: "Use carbide shank extension instead of steel", cost: "medium", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["da-001", "tool_selection-003"],
          physics_check: "δ = F × L³ / (3 × E × I), where I = π×d⁴/64",
        },
      },
    ],
  },
  {
    id: "da-undersized",
    domain: "dimensional_accuracy",
    question: "Is the error getting worse part-to-part?",
    answers: [
      {
        label: "Yes, progressive degradation",
        diagnosis: {
          root_cause: "Tool wear (flank wear increasing effective radius)",
          explanation:
            "As the tool wears, the effective cutting diameter decreases for external operations (or increases for internal), progressively changing part dimensions.",
          fixes: [
            { action: "Implement tool wear offset compensation (auto or manual)", cost: "free", effectiveness: 0.85 },
            { action: "Set tool life limit and auto-change at VB=0.2mm", cost: "free", effectiveness: 0.8 },
            { action: "Switch to more wear-resistant tool grade", cost: "medium", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["tool_life-002", "da-002"],
          physics_check: "VB wear rate: dVB/dt ∝ Vc^n, monitor per Taylor equation",
        },
      },
      {
        label: "No, consistent error from start",
        diagnosis: {
          root_cause: "Material springback / elastic recovery",
          explanation:
            "The workpiece material elastically deflects during cutting and springs back after the tool passes. Common in thin walls, stainless steel, and titanium. Springback can be 5-20 microns.",
          fixes: [
            { action: "Add a spring pass (re-cut at same depth without feed change)", cost: "free", effectiveness: 0.8 },
            { action: "Use sharper tool with positive rake to reduce radial forces", cost: "low", effectiveness: 0.75 },
            { action: "Pre-compensate tool path by springback amount", cost: "free", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["da-003", "thin_wall-001"],
          physics_check: "Springback ≈ F_radial / (k_part), measure with test cut",
        },
      },
    ],
  },
  {
    id: "da-taper",
    domain: "dimensional_accuracy",
    question: "Is the taper consistent across multiple parts or just one?",
    answers: [
      {
        label: "Consistent across all parts",
        diagnosis: {
          root_cause: "Spindle/axis alignment error",
          explanation:
            "The spindle axis is not perpendicular to the table or parallel to the Z-axis travel. This creates a systematic taper on all parts. Common after machine moves or crashes.",
          fixes: [
            { action: "Check and adjust spindle tramming", cost: "free", effectiveness: 0.9 },
            { action: "Run laser alignment check on all axes", cost: "low", effectiveness: 0.95 },
            { action: "Compensate in controller (axis straightness compensation)", cost: "low", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["da-004"],
          physics_check: "Taper = (D_top - D_bottom) / length, should be < 0.005mm/100mm",
        },
      },
      {
        label: "Varies part to part",
        diagnosis: {
          root_cause: "Thermal gradient during machining",
          explanation:
            "Uneven heat distribution causes differential expansion. The bottom of a tall part (closer to fixture) stays cooler than the top, creating a thermal taper that varies with cycle time and environment.",
          fixes: [
            { action: "Flood coolant uniformly across entire cut zone", cost: "free", effectiveness: 0.7 },
            { action: "Allow part to cool before final finish pass", cost: "free", effectiveness: 0.65 },
            { action: "Use in-process probing to map and compensate", cost: "low", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["thermal-004", "da-005"],
          physics_check: "δ = α × ΔT × L per axis",
        },
      },
    ],
  },
  {
    id: "da-inconsistent",
    domain: "dimensional_accuracy",
    question: "Does the variation correlate with part location on the fixture?",
    answers: [
      {
        label: "Yes, position-dependent",
        diagnosis: {
          root_cause: "Fixture rigidity / datum point issues",
          explanation:
            "Parts farther from clamp points have more deflection under cutting forces. Poor datum selection means WCS origin shifts depending on where the part is fixtured.",
          fixes: [
            { action: "Add support closer to cutting zone", cost: "low", effectiveness: 0.85 },
            { action: "Re-evaluate datum selection per 3-2-1 principle", cost: "free", effectiveness: 0.8 },
            { action: "Use dedicated fixture with locating pins instead of vise", cost: "medium", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["workholding-001", "datum-001"],
        },
      },
      {
        label: "No, truly random variation",
        diagnosis: {
          root_cause: "Process capability issue (multiple small causes)",
          explanation:
            "Random variation suggests the process Cpk is too low. Multiple small sources (thermal, tool wear, material variation, fixture, measurement) combine. Need SPC analysis to identify dominant contributors.",
          fixes: [
            { action: "Run SPC study (30+ parts) to determine Cpk", cost: "free", effectiveness: 0.7 },
            { action: "Gauge R&R study to separate measurement error", cost: "free", effectiveness: 0.75 },
            { action: "Fishbone diagram + DOE to isolate dominant factor", cost: "low", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["da-006"],
          physics_check: "Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ)), target Cpk ≥ 1.33",
        },
      },
    ],
  },

  // ── Tool Breakage (6 nodes) ───────────────────────────────────────────────
  {
    id: "tb-root",
    domain: "tool_breakage",
    question: "How did the tool fail?",
    answers: [
      { label: "Sudden catastrophic breakage", next_node: "tb-sudden" },
      { label: "Gradual chipping then failure", next_node: "tb-gradual" },
      { label: "Edge chipping / micro-fracture", next_node: "tb-chipping" },
    ],
  },
  {
    id: "tb-sudden",
    domain: "tool_breakage",
    question: "Was the tool fully engaged (slotting) or partial engagement?",
    answers: [
      {
        label: "Full slot / deep pocket",
        diagnosis: {
          root_cause: "Excessive chip load / chip packing",
          explanation:
            "Full slotting generates maximum chip load and limits chip evacuation. Chips pack in the flutes, causing catastrophic overload. Chip load may exceed 2× the rated fz.",
          fixes: [
            { action: "Use trochoidal / adaptive milling instead of slotting", cost: "free", effectiveness: 0.95 },
            { action: "Reduce depth of cut to 1×D max for slotting", cost: "free", effectiveness: 0.8 },
            { action: "Increase coolant pressure for chip evacuation", cost: "free", effectiveness: 0.7 },
            { action: "Use 3-flute instead of 4-flute for better chip clearance", cost: "low", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["roughing-001", "chip_control-002"],
          physics_check: "Chip load fz = Vf / (z × n), keep < manufacturer max fz",
        },
      },
      {
        label: "Partial engagement / profiling",
        diagnosis: {
          root_cause: "Hard inclusion or work hardened layer",
          explanation:
            "Sudden breakage during light cuts suggests the tool hit a hard spot — inclusions in castings, work-hardened layer from previous operations, or hardened skin on forgings.",
          fixes: [
            { action: "Inspect raw material certification for inclusion limits", cost: "free", effectiveness: 0.5 },
            { action: "Use tougher tool grade (uncoated carbide or cermet)", cost: "medium", effectiveness: 0.8 },
            { action: "Add 0.5mm skin pass before finish to remove hardened layer", cost: "free", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["material-002", "tb-001"],
        },
      },
    ],
  },
  {
    id: "tb-gradual",
    domain: "tool_breakage",
    question: "Was the tool running at recommended speed/feed or pushed harder?",
    answers: [
      {
        label: "At or below recommended parameters",
        diagnosis: {
          root_cause: "Wrong tool grade for material or excessive vibration",
          explanation:
            "If running within specs but still failing, the tool grade may be too brittle for the application, or vibration is causing fatigue cracking. Check tool hardness vs. toughness balance.",
          fixes: [
            { action: "Switch to tougher grade (higher Co% in carbide)", cost: "medium", effectiveness: 0.85 },
            { action: "Check for vibration with accelerometer or audio analysis", cost: "low", effectiveness: 0.7 },
            { action: "Ensure rigid setup (minimize overhang, check holder)", cost: "free", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["tool_selection-001", "vib-002"],
        },
      },
      {
        label: "Pushed beyond recommendations",
        diagnosis: {
          root_cause: "Thermal overload — excessive speed/feed",
          explanation:
            "Running above recommended parameters generates excessive heat at the cutting edge, softening the tool coating/substrate. Thermal cracks propagate until failure.",
          fixes: [
            { action: "Return to manufacturer recommended Vc and fz", cost: "free", effectiveness: 0.9 },
            { action: "Use heat-resistant coating (AlTiN for high temp)", cost: "medium", effectiveness: 0.8 },
            { action: "Increase coolant flow/pressure", cost: "free", effectiveness: 0.65 },
          ],
          related_playbook_rules: ["tool_life-003", "thermal-005"],
          physics_check: "Cutting temp T ∝ Vc^0.4 × fz^0.2 × ap^0.1 (empirical)",
        },
      },
    ],
  },
  {
    id: "tb-chipping",
    domain: "tool_breakage",
    question: "Is the chipping at the tool entry point or random along the edge?",
    answers: [
      {
        label: "At entry / interrupted cut region",
        diagnosis: {
          root_cause: "Mechanical shock from interrupted cutting",
          explanation:
            "Each entry into the workpiece creates impact loading on the cutting edge. Brittle grades and coatings crack under repeated impact. Common in face milling with bolt holes or keyways.",
          fixes: [
            { action: "Use impact-resistant grade (tougher substrate)", cost: "medium", effectiveness: 0.85 },
            { action: "Roll into cut with arc entry instead of straight plunge", cost: "free", effectiveness: 0.8 },
            { action: "Reduce feed at entry point (ramp down 50% for 2mm)", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["tb-002", "roughing-003"],
        },
      },
      {
        label: "Random along the edge",
        diagnosis: {
          root_cause: "Coating failure / adhesion loss",
          explanation:
            "The tool coating is delaminating from the substrate, exposing the raw carbide. This creates local weak points that chip under normal loads. May indicate coating quality issue or thermal cycling.",
          fixes: [
            { action: "Switch to different coating type or supplier", cost: "medium", effectiveness: 0.8 },
            { action: "Reduce thermal cycling (avoid intermittent coolant)", cost: "free", effectiveness: 0.65 },
            { action: "Try uncoated carbide if coating keeps failing", cost: "low", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["tool_life-004"],
        },
      },
    ],
  },

  // ── Chatter/Vibration (6 nodes) ──────────────────────────────────────────
  {
    id: "cv-root",
    domain: "chatter_vibration",
    question: "When does the vibration occur?",
    answers: [
      { label: "At specific RPM ranges", next_node: "cv-specific" },
      { label: "Random / unpredictable", next_node: "cv-random" },
      { label: "Low frequency rumble", next_node: "cv-low-freq" },
    ],
  },
  {
    id: "cv-specific",
    domain: "chatter_vibration",
    question: "Does the vibration disappear when you change RPM by ±10%?",
    answers: [
      {
        label: "Yes, goes away at different RPM",
        diagnosis: {
          root_cause: "Regenerative chatter at stability lobe boundary",
          explanation:
            "The current RPM places the process at a stability lobe minimum. Shifting RPM moves to a stable pocket. The chatter frequency is a natural frequency of the tool/holder/spindle system.",
          fixes: [
            { action: "Calculate stable RPM pockets: RPM = 60×f_n/(N×z) for lobe N", cost: "free", effectiveness: 0.9 },
            { action: "Use stability lobe diagram to find optimal RPM", cost: "free", effectiveness: 0.95 },
            { action: "Reduce axial depth of cut (ap) to raise stability limit", cost: "free", effectiveness: 0.8 },
            { action: "Switch to variable pitch / variable helix cutter", cost: "medium", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["vib-001", "vib-003"],
          physics_check: "Stability limit: ap_lim = -1 / (2×Ks×Re[FRF])",
        },
      },
      {
        label: "No, persists across RPM range",
        diagnosis: {
          root_cause: "Forced vibration from external source",
          explanation:
            "Something is forcing vibration into the system — unbalanced spindle, nearby machine, loose component. Not dependent on cutting dynamics since it persists across RPM.",
          fixes: [
            { action: "Check spindle balance (G2.5 or better at max RPM)", cost: "low", effectiveness: 0.8 },
            { action: "Isolate from nearby machines (check floor vibration)", cost: "low", effectiveness: 0.7 },
            { action: "Tighten all bolted connections in tool/holder/spindle stack", cost: "free", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["vib-004"],
          physics_check: "Use accelerometer to measure dominant frequency vs. RPM relationship",
        },
      },
    ],
  },
  {
    id: "cv-random",
    domain: "chatter_vibration",
    question: "What is the tool length-to-diameter ratio (L/D)?",
    answers: [
      {
        label: "L/D > 5 (long overhang)",
        diagnosis: {
          root_cause: "Excessive tool overhang reducing dynamic stiffness",
          explanation:
            "Tool stiffness drops as L³ — doubling overhang reduces stiffness 8×. Beyond L/D=5, most tools cannot maintain stable cutting. The natural frequency drops into the chatter-prone range.",
          fixes: [
            { action: "Reduce overhang to L/D < 4 if possible", cost: "free", effectiveness: 0.9 },
            { action: "Use carbide shank or heavy-metal extension", cost: "medium", effectiveness: 0.8 },
            { action: "Switch to anti-vibration boring bar (tuned damper)", cost: "high", effectiveness: 0.95 },
            { action: "Reduce depth of cut significantly (ap < 0.5×D)", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["vib-002", "tool_selection-004"],
          physics_check: "k_tool = 3×E×I/L³, f_n = (1/2π)×√(k/m)",
        },
      },
      {
        label: "L/D < 5 (normal overhang)",
        diagnosis: {
          root_cause: "Loose fixture or insufficient workpiece rigidity",
          explanation:
            "With adequate tool rigidity, the vibration source is likely the workpiece/fixture side. Thin walls, loose clamps, or insufficient support allow the part to vibrate.",
          fixes: [
            { action: "Increase clamping force or add support points", cost: "free", effectiveness: 0.8 },
            { action: "Add damping material (wax, sand) inside thin-wall parts", cost: "low", effectiveness: 0.75 },
            { action: "Re-fixture to support near cutting zone", cost: "low", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["workholding-002", "thin_wall-002"],
        },
      },
    ],
  },
  {
    id: "cv-low-freq",
    domain: "chatter_vibration",
    question: "Is the vibration felt in the machine structure (floor/column)?",
    answers: [
      {
        label: "Yes, whole machine vibrates",
        diagnosis: {
          root_cause: "Machine structure rigidity insufficient for cutting forces",
          explanation:
            "Low-frequency vibration (< 100 Hz) in the machine structure indicates the cutting forces excite the machine's natural frequency. Common in light-duty machines doing heavy roughing.",
          fixes: [
            { action: "Reduce material removal rate (lower ap×ae×Vf)", cost: "free", effectiveness: 0.8 },
            { action: "Use adaptive / trochoidal toolpath to limit peak forces", cost: "free", effectiveness: 0.85 },
            { action: "Check and retighten foundation bolts", cost: "free", effectiveness: 0.6 },
            { action: "Move heavy roughing to a more rigid machine", cost: "high", effectiveness: 0.95 },
          ],
          related_playbook_rules: ["vib-005"],
          physics_check: "F_cutting = kc1.1 × ap × fz^(1-mc), compare to machine dynamic stiffness",
        },
      },
      {
        label: "No, only at tool/spindle area",
        diagnosis: {
          root_cause: "Spindle bearing wear or preload loss",
          explanation:
            "Bearing degradation reduces spindle stiffness and damping. Low-frequency rumble localized at the spindle suggests bearing preload has decreased, allowing radial play.",
          fixes: [
            { action: "Check spindle bearings (vibration spectrum for BPFO/BPFI peaks)", cost: "low", effectiveness: 0.8 },
            { action: "Schedule spindle bearing replacement", cost: "high", effectiveness: 0.95 },
            { action: "Reduce spindle speed until repair can be made", cost: "free", effectiveness: 0.6 },
          ],
          related_playbook_rules: ["vib-006"],
          physics_check: "Bearing defect freq: BPFO = (n/2)×(1-d/D)×RPM/60",
        },
      },
    ],
  },

  // ── Chip Problems (6 nodes) ──────────────────────────────────────────────
  {
    id: "cp-root",
    domain: "chip_problems",
    question: "What type of chip problem are you experiencing?",
    answers: [
      { label: "Long stringy chips wrapping around tool", next_node: "cp-stringy" },
      { label: "Powder/dust chips", next_node: "cp-dust" },
      { label: "Blue/brown discolored chips", next_node: "cp-discolored" },
      { label: "Bird's nest / tangled mass", next_node: "cp-birdnest" },
    ],
  },
  {
    id: "cp-stringy",
    domain: "chip_problems",
    question: "Are you using a chip breaker geometry on the insert?",
    answers: [
      {
        label: "No chip breaker / flat rake face",
        diagnosis: {
          root_cause: "No chip breaking mechanism",
          explanation:
            "Without a chip breaker geometry, ductile materials produce continuous chips. The chip curls and wraps around the tool, risking tool breakage and surface damage.",
          fixes: [
            { action: "Switch to insert with chip breaker geometry (MF/MM type)", cost: "low", effectiveness: 0.9 },
            { action: "Increase feed rate to exceed minimum chip-breaking feed", cost: "free", effectiveness: 0.75 },
            { action: "Use high-pressure coolant aimed at chip breaking zone", cost: "low", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["chip_control-001", "chip_control-004"],
        },
      },
      {
        label: "Yes, chip breaker present",
        diagnosis: {
          root_cause: "Feed rate below chip breaker effective range",
          explanation:
            "Chip breaker geometries only work within a specific feed range. Too low a feed produces thin chips that don't contact the breaker wall. Each insert geometry has a minimum effective feed.",
          fixes: [
            { action: "Increase feed to chip breaker minimum (check manufacturer chart)", cost: "free", effectiveness: 0.85 },
            { action: "Switch to light-duty chip breaker designed for lower feeds", cost: "low", effectiveness: 0.8 },
            { action: "Increase depth of cut to widen chip and engage breaker", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["chip_control-005"],
          physics_check: "Chip breaker effective range: fz_min < fz < fz_max per insert spec",
        },
      },
    ],
  },
  {
    id: "cp-dust",
    domain: "chip_problems",
    question: "What material are you cutting?",
    answers: [
      {
        label: "Cast iron or graphite",
        diagnosis: {
          root_cause: "Normal for brittle materials — manage dust extraction",
          explanation:
            "Cast iron and graphite produce powdery chips by nature due to graphite flake/nodule structure. This is not a problem per se, but dust must be managed for health and machine longevity.",
          fixes: [
            { action: "Use dust extraction / vacuum system at cutting zone", cost: "medium", effectiveness: 0.9 },
            { action: "Apply MQL or light mist to suppress airborne dust", cost: "low", effectiveness: 0.8 },
            { action: "Cover machine way covers and seal spindle from dust ingress", cost: "low", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["material-003"],
        },
      },
      {
        label: "Steel, aluminum, or other ductile material",
        diagnosis: {
          root_cause: "Cutting speed too high causing chip segmentation/dust",
          explanation:
            "Extremely high cutting speeds can cause adiabatic shear (Recht instability), fragmenting chips into very small particles. The chip temperature exceeds the material's thermal softening point.",
          fixes: [
            { action: "Reduce cutting speed by 20-30%", cost: "free", effectiveness: 0.85 },
            { action: "Increase feed to produce thicker, more manageable chips", cost: "free", effectiveness: 0.7 },
            { action: "Check for excessive tool wear increasing cutting forces", cost: "free", effectiveness: 0.6 },
          ],
          related_playbook_rules: ["chip_control-006"],
          physics_check: "Recht critical speed: Vc_crit where dτ/dT > dτ/dγ (thermal softening > strain hardening)",
        },
      },
    ],
  },
  {
    id: "cp-discolored",
    domain: "chip_problems",
    question: "What color are the chips?",
    answers: [
      {
        label: "Blue / purple",
        diagnosis: {
          root_cause: "Excessive cutting temperature (>300°C for steel)",
          explanation:
            "Blue chips indicate temperatures above 300°C at the chip. While some heat is normal, blue chips mean the thermal load is excessive, accelerating tool wear and risking thermal damage to the part.",
          fixes: [
            { action: "Reduce cutting speed 15-25%", cost: "free", effectiveness: 0.8 },
            { action: "Increase coolant flow and verify delivery to cutting zone", cost: "free", effectiveness: 0.75 },
            { action: "Use high-performance coating (AlTiN/TiSiN) rated for high temp", cost: "medium", effectiveness: 0.7 },
            { action: "Switch to climb milling to reduce heat in chip", cost: "free", effectiveness: 0.6 },
          ],
          related_playbook_rules: ["thermal-001", "thermal-005"],
          physics_check: "Steel oxide colors: straw=220°C, brown=260°C, purple=280°C, blue=300°C+",
        },
      },
      {
        label: "Brown / golden (light discoloration)",
        diagnosis: {
          root_cause: "Normal heat generation — monitor but not critical",
          explanation:
            "Light brown/golden chips (~220-260°C) indicate moderate cutting temperatures. This is acceptable for most operations but worth monitoring if surface integrity is critical.",
          fixes: [
            { action: "Monitor tool wear rate — if acceptable, continue", cost: "free", effectiveness: 0.8 },
            { action: "Slight speed reduction (5-10%) for extra margin", cost: "free", effectiveness: 0.7 },
            { action: "Verify coolant concentration is at recommended level", cost: "free", effectiveness: 0.65 },
          ],
          related_playbook_rules: ["thermal-006"],
        },
      },
    ],
  },
  {
    id: "cp-birdnest",
    domain: "chip_problems",
    question: "Is the bird's nest forming around the tool or in the chip conveyor?",
    answers: [
      {
        label: "Around the tool / spindle",
        diagnosis: {
          root_cause: "Wrong helix angle / inadequate chip evacuation geometry",
          explanation:
            "Chips are curling back and tangling around the tool instead of being ejected. The helix angle and flute geometry are not providing enough upward chip flow for this material/depth combination.",
          fixes: [
            { action: "Switch to higher helix angle (45° for aluminum, 35° for steel)", cost: "low", effectiveness: 0.8 },
            { action: "Use through-tool coolant to blast chips away", cost: "low", effectiveness: 0.85 },
            { action: "Reduce axial depth to limit chip length", cost: "free", effectiveness: 0.7 },
            { action: "Use chip fan or air blast programmed between passes", cost: "free", effectiveness: 0.65 },
          ],
          related_playbook_rules: ["chip_control-002", "tool_selection-005"],
        },
      },
      {
        label: "In chip conveyor / tray",
        diagnosis: {
          root_cause: "Chip conveyor capacity or type mismatch",
          explanation:
            "Long stringy chips tangle in the conveyor mechanism. This is a chip management issue rather than a cutting parameters issue. Hinge-band conveyors handle stringy chips poorly.",
          fixes: [
            { action: "Switch to auger or scraper type conveyor", cost: "high", effectiveness: 0.9 },
            { action: "Optimize chip breaker to produce C-shaped chips (6-9 type)", cost: "low", effectiveness: 0.8 },
            { action: "Increase chip conveyor speed", cost: "free", effectiveness: 0.5 },
          ],
          related_playbook_rules: ["chip_control-007"],
        },
      },
    ],
  },

  // ── Thermal Issues (6 nodes) ─────────────────────────────────────────────
  {
    id: "th-root",
    domain: "thermal_issues",
    question: "What thermal symptom are you observing?",
    answers: [
      { label: "Part dimensional growth during machining", next_node: "th-growth" },
      { label: "Tool glowing red/orange", next_node: "th-glow" },
      { label: "Smoke or burning smell from coolant", next_node: "th-smoke" },
    ],
  },
  {
    id: "th-growth",
    domain: "thermal_issues",
    question: "How much dimensional growth are you seeing?",
    answers: [
      {
        label: "> 50 microns over part length",
        diagnosis: {
          root_cause: "Severe thermal expansion from inadequate cooling",
          explanation:
            "Large thermal growth (>50μm) means the workpiece temperature has risen significantly. For steel (α=12μm/m/°C), 50μm on 100mm part means ~42°C rise. Coolant is failing to remove process heat.",
          fixes: [
            { action: "Increase coolant flow rate and verify nozzle aim at cutting zone", cost: "free", effectiveness: 0.8 },
            { action: "Add roughing passes with rest time to dissipate heat", cost: "free", effectiveness: 0.7 },
            { action: "Switch to flood coolant if using MQL for heavy roughing", cost: "low", effectiveness: 0.85 },
            { action: "Measure part temperature and compensate in G-code offsets", cost: "low", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["thermal-001", "thermal-002"],
          physics_check: "δ = α × ΔT × L; steel α≈12μm/m/°C, Al α≈23μm/m/°C",
        },
      },
      {
        label: "10-50 microns (moderate)",
        diagnosis: {
          root_cause: "Normal thermal effects — need compensation strategy",
          explanation:
            "Moderate thermal growth is expected in precision machining. The key is to manage it through process planning rather than trying to eliminate it entirely.",
          fixes: [
            { action: "Machine rough → cool → finish sequence", cost: "free", effectiveness: 0.85 },
            { action: "Use in-process probing after roughing to update offsets", cost: "low", effectiveness: 0.9 },
            { action: "Machine in temperature-controlled environment (±1°C)", cost: "high", effectiveness: 0.95 },
          ],
          related_playbook_rules: ["thermal-003"],
        },
      },
    ],
  },
  {
    id: "th-glow",
    domain: "thermal_issues",
    question: "Is the glow at the tool tip only or along the entire flute?",
    answers: [
      {
        label: "Tool tip only",
        diagnosis: {
          root_cause: "Cutting speed far exceeds tool grade rating",
          explanation:
            "Localized glowing at the tip means cutting temperature >600°C (visible red). The tool grade cannot handle the thermal load at this speed. Imminent catastrophic failure.",
          fixes: [
            { action: "STOP immediately — reduce speed by 40-50%", cost: "free", effectiveness: 0.95 },
            { action: "Switch to ceramic or CBN insert rated for high-speed cutting", cost: "high", effectiveness: 0.9 },
            { action: "Verify coolant is reaching the cutting zone (not blocked)", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["thermal-005", "tool_life-005"],
          physics_check: "Max temp for carbide ~800°C, HSS ~600°C, ceramic ~1200°C",
        },
      },
      {
        label: "Along the whole engagement length",
        diagnosis: {
          root_cause: "Excessive depth of cut generating too much friction heat",
          explanation:
            "Heat is being generated along the entire contact length. Combined with inadequate coolant delivery, the tool cannot dissipate heat fast enough. Common in deep profiling operations.",
          fixes: [
            { action: "Reduce axial depth of cut (ap) by 50%", cost: "free", effectiveness: 0.85 },
            { action: "Use high-pressure coolant (70+ bar) through tool", cost: "medium", effectiveness: 0.85 },
            { action: "Switch to multiple light passes instead of one deep pass", cost: "free", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["thermal-006", "roughing-002"],
        },
      },
    ],
  },
  {
    id: "th-smoke",
    domain: "thermal_issues",
    question: "What type of coolant are you using?",
    answers: [
      {
        label: "Water-soluble (emulsion/semi-synthetic)",
        diagnosis: {
          root_cause: "Coolant concentration too low or degraded",
          explanation:
            "Smoke from water-soluble coolant indicates the coolant is boiling off and the remaining oil is burning. Concentration has dropped below effective cooling threshold (typically < 4%).",
          fixes: [
            { action: "Check and adjust coolant concentration to 6-8%", cost: "free", effectiveness: 0.85 },
            { action: "Replace coolant if bacterial contamination detected (rotten smell)", cost: "low", effectiveness: 0.9 },
            { action: "Clean sump of tramp oil accumulation", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["coolant-001", "coolant-003"],
        },
      },
      {
        label: "Neat oil / straight cutting oil",
        diagnosis: {
          root_cause: "Oil flash point exceeded — wrong oil type for operation",
          explanation:
            "Neat cutting oils have flash points (typically 150-200°C). If the cutting zone temperature exceeds this, the oil ignites. This is a fire hazard and must be addressed immediately.",
          fixes: [
            { action: "Switch to higher flash-point oil or water-soluble coolant", cost: "low", effectiveness: 0.9 },
            { action: "Reduce cutting speed to lower temperature below flash point", cost: "free", effectiveness: 0.8 },
            { action: "Ensure fire suppression system is active and serviced", cost: "free", effectiveness: 0.5 },
          ],
          related_playbook_rules: ["coolant-004", "thermal-007"],
          physics_check: "Check oil flash point on SDS vs. estimated cutting temperature",
        },
      },
    ],
  },

  // ── Machine Alarms (5 nodes) ─────────────────────────────────────────────
  {
    id: "ma-root",
    domain: "machine_alarms",
    question: "What type of alarm are you receiving?",
    answers: [
      { label: "Servo alarm / axis error", next_node: "ma-servo" },
      { label: "Spindle alarm / overload", next_node: "ma-spindle" },
      {
        label: "Axis limit / overtravel",
        diagnosis: {
          root_cause: "Program exceeds machine travel or soft limit misconfiguration",
          explanation:
            "The programmed toolpath exceeds the machine's axis travel limits. Either the part is too large for the machine, the WCS origin is set incorrectly, or soft limits are misconfigured.",
          fixes: [
            { action: "Verify WCS origin location leaves clearance on all axes", cost: "free", effectiveness: 0.85 },
            { action: "Simulate program in CAM to check axis travel", cost: "free", effectiveness: 0.9 },
            { action: "Check and reconfigure soft limits in parameters", cost: "free", effectiveness: 0.8 },
            { action: "Reposition part on table to center available travel", cost: "free", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["ma-001"],
        },
      },
    ],
  },
  {
    id: "ma-servo",
    domain: "machine_alarms",
    question: "Does the alarm occur during rapid moves or during cutting?",
    answers: [
      {
        label: "During rapid moves",
        diagnosis: {
          root_cause: "Axis mechanical resistance — way lubrication or backlash issue",
          explanation:
            "Servo alarms during rapids indicate the motor cannot keep position at high speed. Causes include dry/degraded way lube, excessive gib preload, or ball screw wear creating resistance.",
          fixes: [
            { action: "Check and refill way lube system", cost: "free", effectiveness: 0.8 },
            { action: "Inspect ball screw for wear or contamination", cost: "low", effectiveness: 0.75 },
            { action: "Reduce rapid traverse rate in parameters (temporary)", cost: "free", effectiveness: 0.6 },
            { action: "Check servo motor connections and encoder cable", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["ma-002"],
        },
      },
      {
        label: "During cutting / feed moves",
        diagnosis: {
          root_cause: "Cutting force overloading axis servo",
          explanation:
            "The cutting forces exceed what the axis servo motor can handle while maintaining position. The position error exceeds the servo alarm threshold (typically 1-5mm).",
          fixes: [
            { action: "Reduce depth of cut and feed to lower cutting forces", cost: "free", effectiveness: 0.85 },
            { action: "Check for dull tool increasing cutting forces", cost: "free", effectiveness: 0.75 },
            { action: "Verify servo alarm threshold is not set too tight", cost: "free", effectiveness: 0.6 },
          ],
          related_playbook_rules: ["ma-003"],
          physics_check: "F = kc1.1 × ap × fz^(1-mc), compare to axis force rating",
        },
      },
    ],
  },
  {
    id: "ma-spindle",
    domain: "machine_alarms",
    question: "Is the alarm an overload (power) or vibration/temperature?",
    answers: [
      {
        label: "Overload / over-current",
        diagnosis: {
          root_cause: "Spindle power demand exceeds motor rating",
          explanation:
            "The cutting operation requires more power than the spindle motor can deliver. P = Fc × Vc / 60000. Common when roughing with large engagement or at high speeds with high material hardness.",
          fixes: [
            { action: "Reduce MRR: lower ap, ae, or feed rate", cost: "free", effectiveness: 0.9 },
            { action: "Reduce spindle speed (power = torque × RPM)", cost: "free", effectiveness: 0.7 },
            { action: "Use constant-engagement toolpath (trochoidal/adaptive)", cost: "free", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["ma-004", "roughing-004"],
          physics_check: "P_spindle = kc1.1 × ap × ae × Vf × fz^(-mc) / (60×10⁶×η)",
        },
      },
      {
        label: "Vibration / bearing temperature alarm",
        diagnosis: {
          root_cause: "Spindle bearing degradation",
          explanation:
            "Spindle bearings are wearing out, causing increased vibration and heat. Bearing damage is progressive — it will only get worse. Early detection prevents catastrophic spindle failure.",
          fixes: [
            { action: "Schedule spindle service/rebuild ASAP", cost: "high", effectiveness: 0.95 },
            { action: "Reduce spindle speed and cutting forces as interim measure", cost: "free", effectiveness: 0.6 },
            { action: "Monitor bearing temperature trend to plan repair window", cost: "free", effectiveness: 0.5 },
          ],
          related_playbook_rules: ["ma-005", "vib-006"],
          physics_check: "Bearing defect frequencies: BPFO, BPFI, BSF, FTF from bearing geometry",
        },
      },
    ],
  },

  // ── Workholding (5 nodes) ─────────────────────────────────────────────────
  {
    id: "wh-root",
    domain: "workholding",
    question: "What workholding problem are you experiencing?",
    answers: [
      { label: "Part slipping / moving during cut", next_node: "wh-slip" },
      { label: "Clamp marks / deformation on part", next_node: "wh-marks" },
      {
        label: "Part tilting or lifting",
        diagnosis: {
          root_cause: "Insufficient downward clamping force vs. cutting uplift",
          explanation:
            "Cutting forces (especially in face milling) create upward forces that can exceed the fixture's downward holding force. The part tilts or lifts, ruining the cut and potentially crashing.",
          fixes: [
            { action: "Add toe clamps or strap clamps for downward force", cost: "low", effectiveness: 0.85 },
            { action: "Switch to climb milling to direct forces into fixture", cost: "free", effectiveness: 0.8 },
            { action: "Reduce axial depth of cut to lower uplift forces", cost: "free", effectiveness: 0.7 },
            { action: "Use vacuum or magnetic workholding for flat parts", cost: "medium", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["workholding-003", "workholding-004"],
          physics_check: "F_clamp > F_cutting_axial × safety_factor (2.5 typical)",
        },
      },
    ],
  },
  {
    id: "wh-slip",
    domain: "workholding",
    question: "What type of workholding are you using?",
    answers: [
      {
        label: "Vise (mechanical)",
        diagnosis: {
          root_cause: "Insufficient clamping force or poor contact area",
          explanation:
            "Vise jaw force is limited by torque arm and coefficient of friction. If the part has a small contact area or is oily, friction force drops below cutting force requirements.",
          fixes: [
            { action: "Clean part and jaws thoroughly (remove oil/chips)", cost: "free", effectiveness: 0.8 },
            { action: "Use serrated soft jaws for better grip", cost: "low", effectiveness: 0.85 },
            { action: "Increase vise torque (but check part deformation)", cost: "free", effectiveness: 0.7 },
            { action: "Add parallels and ensure part seats firmly on jaw bottom", cost: "free", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["workholding-001", "workholding-005"],
          physics_check: "F_friction = μ × F_clamp; μ_smooth ≈ 0.15, μ_serrated ≈ 0.35",
        },
      },
      {
        label: "Vacuum / magnetic chuck",
        diagnosis: {
          root_cause: "Holding force insufficient for cutting forces",
          explanation:
            "Vacuum chucks provide ~8 N/cm² (1 bar). Magnetic chucks provide 10-15 N/cm². These are limited and cannot resist high tangential cutting forces. Contact area must be maximized.",
          fixes: [
            { action: "Maximize part contact area with chuck surface", cost: "free", effectiveness: 0.7 },
            { action: "Reduce cutting forces: lower ae, ap, feed", cost: "free", effectiveness: 0.8 },
            { action: "Add mechanical stops/pins to resist lateral forces", cost: "low", effectiveness: 0.9 },
            { action: "Switch to mechanical clamping for heavy cuts", cost: "low", effectiveness: 0.95 },
          ],
          related_playbook_rules: ["workholding-006"],
          physics_check: "F_vacuum = P_atm × A_contact ≈ 8 N/cm²; compare to F_cutting",
        },
      },
    ],
  },
  {
    id: "wh-marks",
    domain: "workholding",
    question: "Where are the marks located?",
    answers: [
      {
        label: "At clamp contact points",
        diagnosis: {
          root_cause: "Over-clamping — excessive force for part material/geometry",
          explanation:
            "Clamping force exceeds the part's local yield strength, causing plastic deformation. Soft materials (aluminum) and thin sections are most susceptible. Force should be just sufficient to resist cutting forces with a 2.5× safety margin.",
          fixes: [
            { action: "Use torque wrench to control clamping force", cost: "free", effectiveness: 0.85 },
            { action: "Add larger contact pads to distribute force", cost: "low", effectiveness: 0.8 },
            { action: "Place clamp points on non-critical surfaces", cost: "free", effectiveness: 0.75 },
            { action: "Use spring clamps or pneumatic with pressure regulation", cost: "medium", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["workholding-007", "thin_wall-003"],
          physics_check: "σ_contact = F_clamp / A_contact < σ_yield of part material",
        },
      },
      {
        label: "General distortion after unclamping",
        diagnosis: {
          root_cause: "Residual stress release or elastic deformation during clamping",
          explanation:
            "The part distorts after unclamping because either (a) internal stresses were released during machining, or (b) the clamping forces elastically deformed the part and it was machined in a stressed state.",
          fixes: [
            { action: "Stress-relieve workpiece before finish machining", cost: "medium", effectiveness: 0.9 },
            { action: "Use minimum clamping force with multiple light support points", cost: "free", effectiveness: 0.75 },
            { action: "Machine symmetrically (alternate sides) to balance stress release", cost: "free", effectiveness: 0.7 },
            { action: "Add stress-relief operations between roughing and finishing", cost: "low", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["workholding-008", "sequencing-005"],
        },
      },
    ],
  },

  // -- Surface Finish Extended (4 nodes) -------------------------------------------------------
  {
    id: "sf-tool-condition",
    domain: "surface_finish",
    question: "What is the tool condition after the cut?",
    answers: [
      {
        label: "Crater wear on rake face",
        diagnosis: {
          root_cause: "Chemical/diffusion wear at high temperature",
          explanation:
            "Crater wear on the rake face indicates high interface temperatures causing " +
            "diffusion between tool and chip. Common when machining steel at high speeds " +
            "with uncoated carbide.",
          fixes: [
            { action: "Use Al2O3 or TiAlN coated insert to resist crater wear", cost: "medium", effectiveness: 0.85 },
            { action: "Reduce cutting speed 15-20%", cost: "free", effectiveness: 0.7 },
            { action: "Switch to positive rake geometry to reduce contact pressure", cost: "low", effectiveness: 0.65 },
          ],
          related_playbook_rules: ["tool_life-006", "sf-007"],
          physics_check: "Crater wear rate: KT = C * exp(-Q/RT) * t (Arrhenius diffusion)",
        },
      },
      {
        label: "Notch wear at depth-of-cut line",
        diagnosis: {
          root_cause: "Work-hardened layer or oxide scale abrasion",
          explanation:
            "Notch wear at the DOC line is caused by abrasion from work-hardened surface " +
            "layers or scale. Common with stainless steel, Inconel, and other work-hardening alloys.",
          fixes: [
            { action: "Vary depth of cut between passes to spread wear", cost: "free", effectiveness: 0.8 },
            { action: "Use round insert geometry to distribute DOC line", cost: "low", effectiveness: 0.75 },
            { action: "Apply high-pressure coolant at DOC line", cost: "low", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["tool_life-007", "material-004"],
        },
      },
    ],
  },
  {
    id: "sf-pattern-analysis",
    domain: "surface_finish",
    question: "Is the surface defect visible to the naked eye or only under magnification?",
    answers: [
      {
        label: "Visible to naked eye",
        diagnosis: {
          root_cause: "Macro-geometric error (feed marks, chatter, or tool geometry)",
          explanation:
            "Defects visible to the naked eye are macro-geometric in nature (Ra > 3.2 um). " +
            "These are caused by feed rate, tool geometry, vibration, or tool path issues.",
          fixes: [
            { action: "Reduce feed per tooth for better theoretical Ra", cost: "free", effectiveness: 0.85 },
            { action: "Use larger nose radius tool", cost: "low", effectiveness: 0.8 },
            { action: "Check for chatter - listen and inspect pattern regularity", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["sf-001", "sf-002"],
          physics_check: "Ra_theoretical = fz^2 / (32 * r_nose)",
        },
      },
      {
        label: "Only under magnification",
        diagnosis: {
          root_cause: "Micro-geometric defect (BUE, ploughing, or grain pull-out)",
          explanation:
            "Micro-level surface defects (Ra < 1.6 um) are caused by built-up edge fragments, " +
            "ploughing below minimum chip thickness, or grain pull-out in composites/cast iron.",
          fixes: [
            { action: "Ensure cutting edge radius < minimum chip thickness", cost: "low", effectiveness: 0.8 },
            { action: "Increase speed to prevent BUE (if applicable)", cost: "free", effectiveness: 0.75 },
            { action: "Use PCD tooling for composites/non-ferrous", cost: "high", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["sf-008", "material-005"],
          physics_check: "Min chip thickness h_min = 0.2-0.3 * edge radius",
        },
      },
    ],
  },
  {
    id: "sf-coolant-type",
    domain: "surface_finish",
    question: "What coolant delivery method are you using?",
    answers: [
      {
        label: "Flood coolant",
        diagnosis: {
          root_cause: "Coolant pressure or aim insufficient for chip clearing",
          explanation:
            "Flood coolant may not have enough pressure to clear chips from the cutting zone " +
            "effectively. Chips get trapped and re-cut, degrading surface finish.",
          fixes: [
            { action: "Redirect nozzles to aim precisely at cutting zone", cost: "free", effectiveness: 0.8 },
            { action: "Increase coolant pressure to 20+ bar", cost: "low", effectiveness: 0.85 },
            { action: "Add auxiliary nozzle for chip flushing", cost: "low", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["coolant-007", "sf-009"],
        },
      },
      {
        label: "MQL or dry machining",
        diagnosis: {
          root_cause: "Insufficient lubrication for finish requirement",
          explanation:
            "MQL provides lubrication but minimal cooling. For demanding surface finish " +
            "requirements (Ra < 0.8 um), the thermal effects of dry/MQL machining may " +
            "degrade finish through thermal softening or BUE.",
          fixes: [
            { action: "Switch to flood coolant for critical finish operations", cost: "low", effectiveness: 0.85 },
            { action: "Optimize MQL flow rate and nozzle position", cost: "free", effectiveness: 0.7 },
            { action: "Use DLC-coated tools designed for dry/MQL machining", cost: "medium", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["coolant-008", "sf-010"],
        },
      },
    ],
  },
  {
    id: "sf-material-specific",
    domain: "surface_finish",
    question: "What material family are you machining?",
    answers: [
      {
        label: "Aluminum alloy",
        diagnosis: {
          root_cause: "BUE or smearing typical of aluminum machining",
          explanation:
            "Aluminum is highly prone to BUE at low speeds and smearing at high speeds. " +
            "Surface finish depends heavily on tool coating (DLC/polished) and coolant.",
          fixes: [
            { action: "Use DLC-coated or polished uncoated carbide tool", cost: "medium", effectiveness: 0.9 },
            { action: "Run at high speed (300+ m/min) to prevent BUE", cost: "free", effectiveness: 0.85 },
            { action: "Use 2 or 3 flute high-helix (45 deg) end mill", cost: "low", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["material-001", "sf-011"],
        },
      },
      {
        label: "Stainless steel or titanium",
        diagnosis: {
          root_cause: "Work hardening and poor thermal conductivity degrading finish",
          explanation:
            "These materials work-harden rapidly and have low thermal conductivity. The " +
            "work-hardened layer abrades the next pass, and heat concentration causes " +
            "premature tool wear affecting finish quality.",
          fixes: [
            { action: "Use sharp positive-rake inserts to minimize work hardening", cost: "low", effectiveness: 0.85 },
            { action: "Maintain consistent chip load - never dwell or rub", cost: "free", effectiveness: 0.8 },
            { action: "High-pressure coolant (70+ bar) at cutting zone", cost: "medium", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["material-008", "sf-012"],
        },
      },
    ],
  },

  // -- Tool Breakage Extended (4 nodes) -------------------------------------------------------
  {
    id: "tb-tool-type",
    domain: "tool_breakage",
    question: "What type of tool failed?",
    answers: [
      {
        label: "Solid carbide end mill",
        diagnosis: {
          root_cause: "Radial engagement too high for solid carbide rigidity",
          explanation:
            "Solid carbide end mills are brittle and sensitive to bending loads. Excessive " +
            "radial engagement (ae > 0.5*D for roughing) creates bending moments that " +
            "exceed fracture toughness.",
          fixes: [
            { action: "Limit ae to 0.3-0.5*D and use adaptive/trochoidal paths", cost: "free", effectiveness: 0.9 },
            { action: "Use variable helix to break up harmonics", cost: "medium", effectiveness: 0.8 },
            { action: "Ensure proper holder concentricity (TIR < 0.01mm)", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["tb-003", "roughing-005"],
        },
      },
      {
        label: "Indexable insert cutter",
        diagnosis: {
          root_cause: "Insert pocket damage or incorrect insert seating",
          explanation:
            "Insert failures in indexable cutters often trace to damaged pockets, chips under " +
            "the insert, or incorrect insert/shim combination.",
          fixes: [
            { action: "Clean insert pocket thoroughly and inspect for damage", cost: "free", effectiveness: 0.85 },
            { action: "Replace shim if worn or cracked", cost: "low", effectiveness: 0.8 },
            { action: "Verify correct insert grade and geometry for application", cost: "free", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["tb-004", "tool_selection-006"],
        },
      },
    ],
  },
  {
    id: "tb-material-factor",
    domain: "tool_breakage",
    question: "Has the workpiece material changed recently (new batch/supplier)?",
    answers: [
      {
        label: "Yes, new material batch",
        diagnosis: {
          root_cause: "Material property variation between batches",
          explanation:
            "Different material batches can have significant hardness and inclusion variations. " +
            "A batch at the upper hardness spec may break tools that worked on softer batches.",
          fixes: [
            { action: "Test new batch hardness and adjust speeds/feeds accordingly", cost: "free", effectiveness: 0.85 },
            { action: "Request material certificates and compare to previous batch", cost: "free", effectiveness: 0.7 },
            { action: "Add 10-15% safety margin on new batches until validated", cost: "free", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["material-006", "tb-005"],
        },
      },
      {
        label: "No, same material as before",
        diagnosis: {
          root_cause: "Progressive machine condition degradation",
          explanation:
            "If the same material/tool/parameters worked before, the machine may have changed: " +
            "spindle bearing wear, axis backlash increase, or fixture wear.",
          fixes: [
            { action: "Run machine health diagnostic (vibration, backlash test)", cost: "low", effectiveness: 0.8 },
            { action: "Check spindle runout and compare to last measurement", cost: "free", effectiveness: 0.75 },
            { action: "Inspect fixture for wear at locating surfaces", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["ma-006", "tb-006"],
        },
      },
    ],
  },
  {
    id: "tb-frequency",
    domain: "tool_breakage",
    question: "How often does the breakage occur?",
    answers: [
      {
        label: "Every tool at roughly the same point in the program",
        diagnosis: {
          root_cause: "Specific toolpath segment causing overload",
          explanation:
            "Consistent failure at the same program location points to a specific toolpath " +
            "problem: corner overload, full-width entry, or insufficient retract clearance.",
          fixes: [
            { action: "Review CAM simulation at failure point for engagement spikes", cost: "free", effectiveness: 0.9 },
            { action: "Add arc entry/exit moves at corners", cost: "free", effectiveness: 0.85 },
            { action: "Reduce feed rate at high-engagement sections", cost: "free", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["tb-007", "toolpath_strategy-001"],
        },
      },
      {
        label: "Random timing, no pattern",
        diagnosis: {
          root_cause: "Fatigue failure or material defect interaction",
          explanation:
            "Random breakage timing suggests either tool fatigue (micro-cracks propagating over " +
            "time) or random hard inclusions in the workpiece material.",
          fixes: [
            { action: "Reduce tool life limit by 20% as safety margin", cost: "free", effectiveness: 0.75 },
            { action: "Inspect incoming material for inclusion content", cost: "low", effectiveness: 0.7 },
            { action: "Switch to tougher tool grade with higher fracture resistance", cost: "medium", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["tb-008", "tool_life-008"],
        },
      },
    ],
  },
  {
    id: "tb-coolant-related",
    domain: "tool_breakage",
    question: "Is coolant being applied consistently during the cut?",
    answers: [
      {
        label: "Intermittent coolant (on/off during cut)",
        diagnosis: {
          root_cause: "Thermal shock cracking from intermittent cooling",
          explanation:
            "Intermittent coolant creates thermal cycling on the cutting edge. The rapid " +
            "heating/cooling cycle induces thermal cracks (comb cracks) that propagate " +
            "until the edge fractures.",
          fixes: [
            { action: "Either use consistent coolant or machine fully dry", cost: "free", effectiveness: 0.9 },
            { action: "If coolant needed, ensure continuous flow without interruption", cost: "free", effectiveness: 0.85 },
            { action: "Use thermal-crack-resistant grade (lower thermal conductivity)", cost: "medium", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["coolant-009", "tb-009"],
          physics_check: "Thermal stress = E * alpha * dT / (1 - nu), cracks when > fracture strength",
        },
      },
      {
        label: "Consistent coolant application",
        diagnosis: {
          root_cause: "Mechanical overload unrelated to thermal effects",
          explanation:
            "With consistent cooling, tool breakage is purely mechanical: excessive force, " +
            "impact, or fatigue. Focus on force reduction and tool grade selection.",
          fixes: [
            { action: "Reduce chip load (fz) by 15-20%", cost: "free", effectiveness: 0.8 },
            { action: "Reduce axial depth of cut", cost: "free", effectiveness: 0.75 },
            { action: "Switch to tougher substrate (higher cobalt %)", cost: "medium", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["tb-010"],
        },
      },
    ],
  },

  // -- Chatter Extended (2 nodes) -----------------------------------------------------------
  {
    id: "cv-thin-wall",
    domain: "chatter_vibration",
    question: "Is the vibration occurring on a thin-wall or thin-floor feature?",
    answers: [
      {
        label: "Yes, thin wall (< 3mm)",
        diagnosis: {
          root_cause: "Workpiece flexibility causing regenerative chatter",
          explanation:
            "Thin walls have very low stiffness and natural frequencies that easily " +
            "fall in the chatter range. The wall acts as a vibrating membrane.",
          fixes: [
            { action: "Machine both sides alternately in small depth increments", cost: "free", effectiveness: 0.85 },
            { action: "Fill cavity with machinable wax or low-melt alloy for damping", cost: "low", effectiveness: 0.9 },
            { action: "Use high-speed light-DOC strategy (ap < 0.5mm)", cost: "free", effectiveness: 0.8 },
            { action: "Support wall with custom fixture or vacuum", cost: "medium", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["thin_wall-001", "thin_wall-002", "vib-007"],
          physics_check: "Wall stiffness k = E*t^3/(12*(1-v^2)*h^2) - drops as t^3",
        },
      },
      {
        label: "No, thick/rigid workpiece",
        diagnosis: {
          root_cause: "Tool-side dynamic compliance issue",
          explanation:
            "With a rigid workpiece, chatter originates from the tool/holder/spindle " +
            "dynamic response. The most flexible component determines the stability limit.",
          fixes: [
            { action: "Identify weakest link: tap test tool vs. workpiece", cost: "free", effectiveness: 0.7 },
            { action: "Switch to shorter, larger diameter tool", cost: "low", effectiveness: 0.85 },
            { action: "Use heavy-metal (tungsten) extension for deep reach", cost: "high", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["vib-008", "tool_selection-007"],
          physics_check: "FRF: identify dominant mode via impact hammer test",
        },
      },
    ],
  },
  {
    id: "cv-operation-type",
    domain: "chatter_vibration",
    question: "What type of milling operation is producing the vibration?",
    answers: [
      {
        label: "Face milling / shoulder milling",
        diagnosis: {
          root_cause: "Cutter engagement angle exciting natural frequency",
          explanation:
            "In face milling, the tooth passing frequency (z * RPM / 60) and its " +
            "harmonics can excite structural modes. The radial engagement angle " +
            "determines the force pulse shape.",
          fixes: [
            { action: "Adjust radial engagement to change force pulse duty cycle", cost: "free", effectiveness: 0.8 },
            { action: "Use unequal pitch face mill to break up harmonics", cost: "medium", effectiveness: 0.85 },
            { action: "Shift RPM to stable pocket using SLD", cost: "free", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["vib-009"],
          physics_check: "Tooth passing freq f_t = z*n/60; check vs structural modes",
        },
      },
      {
        label: "Slotting / deep pocketing",
        diagnosis: {
          root_cause: "Full radial immersion maximizing force variation",
          explanation:
            "Full slotting (ae = D) creates maximum force variation per revolution, " +
            "making the process most susceptible to chatter.",
          fixes: [
            { action: "Switch to trochoidal/adaptive toolpath (ae < 0.15*D)", cost: "free", effectiveness: 0.95 },
            { action: "Use fewer flutes (2-3) for better chip clearance", cost: "low", effectiveness: 0.8 },
            { action: "Peck with reduced depth if adaptive not available", cost: "free", effectiveness: 0.65 },
          ],
          related_playbook_rules: ["vib-010", "roughing-006"],
        },
      },
    ],
  },

  // -- Chip Problems Extended (2 nodes) -----------------------------------------------------
  {
    id: "cp-evacuation",
    domain: "chip_problems",
    question: "Where are chips accumulating?",
    answers: [
      {
        label: "In the pocket / hole being machined",
        diagnosis: {
          root_cause: "Inadequate chip evacuation from enclosed feature",
          explanation:
            "Chips cannot escape from deep pockets or holes, leading to recutting, " +
            "tool breakage, and surface damage.",
          fixes: [
            { action: "Use through-tool coolant at 40+ bar pressure", cost: "medium", effectiveness: 0.9 },
            { action: "Program peck cycles with retract for chip clearing", cost: "free", effectiveness: 0.8 },
            { action: "Add programmed air blast pauses between passes", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["chip_control-008", "hole_making-001"],
        },
      },
      {
        label: "On the machine table / fixture",
        diagnosis: {
          root_cause: "Chips interfering with fixture datum or part seating",
          explanation:
            "Chips on the fixture can prevent proper part seating, contaminate datum " +
            "surfaces, or get trapped between part and clamp.",
          fixes: [
            { action: "Add coolant wash-down nozzles aimed at fixture surfaces", cost: "low", effectiveness: 0.85 },
            { action: "Program M-code chip wash between operations", cost: "free", effectiveness: 0.8 },
            { action: "Design fixture with chip relief channels", cost: "medium", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["chip_control-009", "workholding-009"],
        },
      },
    ],
  },
  {
    id: "cp-chip-shape",
    domain: "chip_problems",
    question: "What shape are the chips?",
    answers: [
      {
        label: "Comma or C-shaped (6 or 9-type)",
        diagnosis: {
          root_cause: "Ideal chip formation - no action needed",
          explanation:
            "C-shaped chips (ISO 6-type or 9-type) are the ideal chip form. They break " +
            "cleanly, evacuate easily, and indicate proper chip breaker engagement.",
          fixes: [
            { action: "No action needed - document current parameters as baseline", cost: "free", effectiveness: 1.0 },
          ],
          related_playbook_rules: ["chip_control-010"],
        },
      },
      {
        label: "Washer or spiral (continuous curl)",
        diagnosis: {
          root_cause: "Chip breaker partially effective - needs adjustment",
          explanation:
            "Washer chips indicate the chip breaker is curling the chip but not breaking " +
            "it. Slightly more feed or depth is needed.",
          fixes: [
            { action: "Increase feed 10-15% to push chip into breaker", cost: "free", effectiveness: 0.8 },
            { action: "Increase depth of cut slightly to widen chip", cost: "free", effectiveness: 0.75 },
            { action: "Try next heavier chip breaker geometry (e.g., MM to MR)", cost: "low", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["chip_control-011"],
        },
      },
    ],
  },

  // -- Thermal Extended (2 nodes) -----------------------------------------------------------
  {
    id: "th-coolant-failure",
    domain: "thermal_issues",
    question: "Has the coolant system changed recently (new coolant, filter, or pump)?",
    answers: [
      {
        label: "Yes, recent coolant system change",
        diagnosis: {
          root_cause: "Coolant system configuration or compatibility issue",
          explanation:
            "New coolant concentrate, changed concentration, or pump/nozzle changes can " +
            "dramatically alter cooling effectiveness. Different brands may be incompatible.",
          fixes: [
            { action: "Verify coolant concentration with refractometer (target 6-8%)", cost: "free", effectiveness: 0.85 },
            { action: "Flush system completely if mixing coolant brands", cost: "low", effectiveness: 0.9 },
            { action: "Check pump pressure and flow rate match previous setup", cost: "free", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["coolant-005", "thermal-008"],
        },
      },
      {
        label: "No, same coolant system",
        diagnosis: {
          root_cause: "Coolant degradation over time",
          explanation:
            "Coolant degrades through bacterial growth, tramp oil contamination, " +
            "concentration drift, and hard water mineral buildup.",
          fixes: [
            { action: "Test pH (target 8.5-9.5) and bacterial count", cost: "free", effectiveness: 0.7 },
            { action: "Remove tramp oil with skimmer or coalescent separator", cost: "low", effectiveness: 0.8 },
            { action: "Full sump clean-out and coolant replacement", cost: "low", effectiveness: 0.95 },
          ],
          related_playbook_rules: ["coolant-006"],
          physics_check: "Coolant thermal conductivity drops ~15% with 5% tramp oil",
        },
      },
    ],
  },
  {
    id: "th-part-material",
    domain: "thermal_issues",
    question: "What material are you machining?",
    answers: [
      {
        label: "Aluminum or copper (high thermal conductivity)",
        diagnosis: {
          root_cause: "Rapid heat conduction into part causing expansion",
          explanation:
            "High thermal conductivity materials (Al: 237 W/mK, Cu: 401 W/mK) conduct " +
            "heat from cutting zone into the part efficiently. The entire part heats up.",
          fixes: [
            { action: "Use high-volume flood coolant to absorb heat at source", cost: "free", effectiveness: 0.8 },
            { action: "Machine in multiple light passes with cooling breaks", cost: "free", effectiveness: 0.75 },
            { action: "Use MQL for finishing to avoid thermal shock", cost: "low", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["thermal-009", "material-007"],
          physics_check: "Al alpha=23um/m/degC - 2x more expansion than steel per degree",
        },
      },
      {
        label: "Titanium, Inconel, or stainless (low thermal conductivity)",
        diagnosis: {
          root_cause: "Heat concentrated at cutting edge causing tool damage",
          explanation:
            "Low thermal conductivity materials (Ti: 7 W/mK, Inconel: 11 W/mK) trap heat " +
            "at the cutting interface. The tool tip bears nearly all thermal load.",
          fixes: [
            { action: "Use high-pressure coolant (70+ bar) at cutting edge", cost: "medium", effectiveness: 0.9 },
            { action: "Reduce cutting speed significantly (40-60 m/min for Ti)", cost: "free", effectiveness: 0.85 },
            { action: "Use climb milling to ensure chip carries heat away", cost: "free", effectiveness: 0.7 },
          ],
          related_playbook_rules: ["thermal-010", "material-008"],
          physics_check: "Ti: 80% of heat goes to tool vs 10% in steel machining",
        },
      },
    ],
  },

  // -- Machine Alarms Extended (2 nodes) ----------------------------------------------------
  {
    id: "ma-communication",
    domain: "machine_alarms",
    question: "Is the alarm a communication/data error?",
    answers: [
      {
        label: "Yes, data transfer or buffer error",
        diagnosis: {
          root_cause: "DNC/network communication failure or buffer overflow",
          explanation:
            "Data starvation occurs when the CNC cannot receive program blocks fast enough. " +
            "Common with large programs sent via DNC over slow serial connections.",
          fixes: [
            { action: "Increase program buffer size in controller parameters", cost: "free", effectiveness: 0.8 },
            { action: "Switch from RS-232 to Ethernet DNC if available", cost: "low", effectiveness: 0.9 },
            { action: "Load program to controller memory instead of drip-feeding", cost: "free", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["ma-007"],
        },
      },
      {
        label: "No, mechanical/electrical alarm",
        diagnosis: {
          root_cause: "Electrical fault in drive system or sensor",
          explanation:
            "Non-communication alarms may indicate encoder failure, drive amplifier fault, " +
            "or wiring issues. Check alarm code in maintenance manual.",
          fixes: [
            { action: "Look up specific alarm code in machine maintenance manual", cost: "free", effectiveness: 0.9 },
            { action: "Check cable connections at motor and drive amplifier", cost: "free", effectiveness: 0.7 },
            { action: "Contact machine tool OEM service with alarm code", cost: "low", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["ma-008"],
        },
      },
    ],
  },
  {
    id: "ma-intermittent",
    domain: "machine_alarms",
    question: "Is the alarm intermittent or consistent?",
    answers: [
      {
        label: "Intermittent (comes and goes)",
        diagnosis: {
          root_cause: "Loose connection, thermal sensitivity, or EMI interference",
          explanation:
            "Intermittent alarms are often the hardest to diagnose. Common causes: loose " +
            "encoder cable, thermal expansion connector issues, or electromagnetic interference.",
          fixes: [
            { action: "Check and re-seat all encoder and motor cable connectors", cost: "free", effectiveness: 0.8 },
            { action: "Look for correlation with machine temperature or time of day", cost: "free", effectiveness: 0.6 },
            { action: "Route signal cables away from power cables (EMI)", cost: "low", effectiveness: 0.7 },
            { action: "Replace suspect cables proactively", cost: "medium", effectiveness: 0.85 },
          ],
          related_playbook_rules: ["ma-009"],
        },
      },
      {
        label: "Consistent (every time)",
        diagnosis: {
          root_cause: "Definitive hardware failure",
          explanation:
            "Consistent alarms indicate a clear hardware failure. This is actually easier " +
            "to diagnose since the fault is reproducible.",
          fixes: [
            { action: "Record exact alarm code and conditions for service tech", cost: "free", effectiveness: 0.7 },
            { action: "Swap suspect component if spare available (encoder, drive)", cost: "medium", effectiveness: 0.9 },
            { action: "Check fuses and circuit breakers in electrical cabinet", cost: "free", effectiveness: 0.6 },
          ],
          related_playbook_rules: ["ma-010"],
        },
      },
    ],
  },

  // -- Workholding Extended (2 nodes) -------------------------------------------------------
  {
    id: "wh-material-type",
    domain: "workholding",
    question: "What type of workpiece is being held?",
    answers: [
      {
        label: "Thin sheet or plate (< 5mm thick)",
        diagnosis: {
          root_cause: "Part deformation under clamping and cutting forces",
          explanation:
            "Thin plates deform easily under point loads from clamps and cutting forces. " +
            "The part machines flat while clamped but springs back when released.",
          fixes: [
            { action: "Use vacuum chuck for uniform hold-down force", cost: "medium", effectiveness: 0.9 },
            { action: "Distribute clamps widely with minimal force each", cost: "free", effectiveness: 0.75 },
            { action: "Use adhesive/wax mounting for critical flatness", cost: "low", effectiveness: 0.85 },
            { action: "Machine both sides with intermediate stress relief", cost: "free", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["workholding-010", "thin_wall-004"],
        },
      },
      {
        label: "Round bar or shaft",
        diagnosis: {
          root_cause: "Insufficient contact area for round geometry",
          explanation:
            "Round parts in flat-jaw vises have minimal contact area (line contact), " +
            "severely limiting friction holding force.",
          fixes: [
            { action: "Use V-block fixture or collet chuck for round stock", cost: "low", effectiveness: 0.9 },
            { action: "Machine soft jaw profile to match part radius", cost: "low", effectiveness: 0.85 },
            { action: "Use 3-jaw chuck for short parts", cost: "low", effectiveness: 0.8 },
          ],
          related_playbook_rules: ["workholding-011"],
          physics_check: "Contact: flat jaw=line; V-jaw=2x line; collet=full circumference",
        },
      },
    ],
  },
  {
    id: "wh-repeatability",
    domain: "workholding",
    question: "Is the workholding problem repeatable across multiple parts?",
    answers: [
      {
        label: "Yes, every part has the issue",
        diagnosis: {
          root_cause: "Systematic fixture design or setup error",
          explanation:
            "If every part shows the same workholding issue, the root cause is in the " +
            "fixture design, clamp position, or force setting.",
          fixes: [
            { action: "Review fixture design against 3-2-1 locating principles", cost: "free", effectiveness: 0.85 },
            { action: "Recalculate required clamping force vs. cutting forces", cost: "free", effectiveness: 0.8 },
            { action: "Redesign fixture with proper support at cutting zone", cost: "medium", effectiveness: 0.9 },
          ],
          related_playbook_rules: ["workholding-012", "datum-002"],
        },
      },
      {
        label: "No, only some parts affected",
        diagnosis: {
          root_cause: "Part-to-part variation (burrs, size, surface condition)",
          explanation:
            "Random occurrence suggests variation in incoming parts: burrs from previous " +
            "operations, size variation, or surface condition differences affecting friction.",
          fixes: [
            { action: "Inspect incoming parts for burrs at datum/clamp surfaces", cost: "free", effectiveness: 0.85 },
            { action: "Add deburr operation before this fixture station", cost: "low", effectiveness: 0.8 },
            { action: "Tighten incoming part tolerance at datum features", cost: "low", effectiveness: 0.75 },
          ],
          related_playbook_rules: ["workholding-013", "deburring-001"],
        },
      },
    ],
  },
];

// ============================================================================
// COMMON PROBLEMS DATABASE
// ============================================================================

const COMMON_PROBLEMS: CommonProblem[] = [
  { domain: "surface_finish", problem: "Poor Ra from high feed rate", frequency_rank: 1, quick_fix: "Reduce fz to < 0.05mm for finishing", root_cause: "Feed marks exceed Ra target" },
  { domain: "surface_finish", problem: "Chatter marks on surface", frequency_rank: 2, quick_fix: "Change RPM ±10% to escape stability lobe", root_cause: "Regenerative chatter at natural frequency" },
  { domain: "surface_finish", problem: "Built-up edge marks", frequency_rank: 3, quick_fix: "Increase cutting speed 20-40%", root_cause: "BUE formation in low-speed zone" },
  { domain: "surface_finish", problem: "Tool marks from runout", frequency_rank: 4, quick_fix: "Check holder TIR < 0.005mm", root_cause: "One flute cutting deeper than others" },
  { domain: "dimensional_accuracy", problem: "Thermal growth during long cycles", frequency_rank: 1, quick_fix: "Use in-process probing to update offsets", root_cause: "Machine and workpiece thermal expansion" },
  { domain: "dimensional_accuracy", problem: "Tool deflection leaving stock", frequency_rank: 2, quick_fix: "Reduce radial depth or shorten overhang", root_cause: "δ = FL³/3EI exceeds tolerance" },
  { domain: "dimensional_accuracy", problem: "Tool wear causing drift", frequency_rank: 3, quick_fix: "Set tool life limit with wear compensation", root_cause: "Progressive flank wear changes effective diameter" },
  { domain: "dimensional_accuracy", problem: "Fixture datum inconsistency", frequency_rank: 4, quick_fix: "Clean and inspect locating surfaces", root_cause: "Chips or burrs on datum surfaces" },
  { domain: "tool_breakage", problem: "Catastrophic failure in slotting", frequency_rank: 1, quick_fix: "Use trochoidal milling instead of slotting", root_cause: "Chip packing and excessive engagement" },
  { domain: "tool_breakage", problem: "Edge chipping on interrupted cuts", frequency_rank: 2, quick_fix: "Use tougher grade and reduce entry feed", root_cause: "Impact loading at each entry" },
  { domain: "tool_breakage", problem: "Thermal cracking", frequency_rank: 3, quick_fix: "Use consistent coolant (avoid intermittent)", root_cause: "Thermal cycling expanding/contracting coating" },
  { domain: "chatter_vibration", problem: "Chatter at specific RPM", frequency_rank: 1, quick_fix: "Calculate stable pocket RPM from SLD", root_cause: "Regenerative chatter at stability lobe minimum" },
  { domain: "chatter_vibration", problem: "Long tool overhang vibration", frequency_rank: 2, quick_fix: "Reduce L/D ratio or use anti-vib bar", root_cause: "Low dynamic stiffness k ∝ 1/L³" },
  { domain: "chatter_vibration", problem: "Thin wall vibration", frequency_rank: 3, quick_fix: "Add support, reduce DOC, or fill with wax", root_cause: "Low workpiece rigidity" },
  { domain: "chip_problems", problem: "Stringy chips wrapping on tool", frequency_rank: 1, quick_fix: "Increase feed or use chip breaker insert", root_cause: "Continuous chip without breaking mechanism" },
  { domain: "chip_problems", problem: "Blue/burned chips", frequency_rank: 2, quick_fix: "Reduce cutting speed 15-25%", root_cause: "Excessive cutting temperature >300°C" },
  { domain: "thermal_issues", problem: "Part growing during machining", frequency_rank: 1, quick_fix: "Rough → cool → finish sequence", root_cause: "Workpiece thermal expansion δ=α×ΔT×L" },
  { domain: "thermal_issues", problem: "Coolant smoking", frequency_rank: 2, quick_fix: "Check concentration and replace if degraded", root_cause: "Coolant breakdown from heat or contamination" },
  { domain: "machine_alarms", problem: "Servo alarm during heavy cuts", frequency_rank: 1, quick_fix: "Reduce MRR to lower axis forces", root_cause: "Cutting forces exceed servo capacity" },
  { domain: "machine_alarms", problem: "Spindle overload alarm", frequency_rank: 2, quick_fix: "Reduce ap, ae, or feed; check power curve", root_cause: "Power demand P=Fc×Vc/60000 exceeds motor rating" },
  { domain: "workholding", problem: "Part slipping in vise", frequency_rank: 1, quick_fix: "Clean jaws, use serrated soft jaws", root_cause: "Insufficient friction force vs. cutting force" },
  { domain: "workholding", problem: "Clamp marks on part", frequency_rank: 2, quick_fix: "Reduce force, add larger contact pads", root_cause: "Contact stress exceeds material yield" },
  { domain: "workholding", problem: "Post-unclamp distortion", frequency_rank: 3, quick_fix: "Stress-relieve before finishing", root_cause: "Residual stress release or elastic recovery" },
];

// ============================================================================
// SYMPTOM KEYWORD INDEX for quick diagnosis
// ============================================================================

interface SymptomKeywordEntry {
  keywords: string[];
  cause: string;
  probability_base: number;
  fixes: string[];
  domain: ProblemDomain;
}

const SYMPTOM_KEYWORD_INDEX: SymptomKeywordEntry[] = [
  { keywords: ["wavy", "waviness", "undulating", "scallop"], cause: "Chatter vibration", probability_base: 0.85, fixes: ["Change RPM ±10%", "Reduce DOC", "Variable helix cutter"], domain: "surface_finish" },
  { keywords: ["rough", "scratchy", "poor finish", "high ra"], cause: "Feed rate too high or tool worn", probability_base: 0.8, fixes: ["Reduce feed per tooth", "Replace tool", "Use wiper insert"], domain: "surface_finish" },
  { keywords: ["built-up edge", "bue", "welding", "material adhesion"], cause: "Built-up edge formation", probability_base: 0.9, fixes: ["Increase speed 20-40%", "High-pressure coolant", "DLC/polished coating"], domain: "surface_finish" },
  { keywords: ["directional marks", "lines", "cutter marks"], cause: "Tool runout or chip recutting", probability_base: 0.75, fixes: ["Check TIR < 0.005mm", "Through-spindle coolant", "Air blast"], domain: "surface_finish" },
  { keywords: ["oversized", "oversize", "too big", "excess material"], cause: "Tool deflection or thermal growth", probability_base: 0.8, fixes: ["Shorten overhang", "Reduce DOC", "Warm-up cycle"], domain: "dimensional_accuracy" },
  { keywords: ["undersized", "undersize", "too small", "removed too much"], cause: "Tool wear or springback", probability_base: 0.8, fixes: ["Check tool wear", "Spring pass", "Wear compensation"], domain: "dimensional_accuracy" },
  { keywords: ["taper", "conical", "diameter varies"], cause: "Alignment error or thermal gradient", probability_base: 0.85, fixes: ["Check spindle tram", "Laser alignment", "Uniform cooling"], domain: "dimensional_accuracy" },
  { keywords: ["inconsistent", "random", "varying", "scatter"], cause: "Process capability issue", probability_base: 0.7, fixes: ["Run SPC study", "Gauge R&R", "DOE analysis"], domain: "dimensional_accuracy" },
  { keywords: ["broke", "broken", "snapped", "catastrophic"], cause: "Chip packing or hard inclusion", probability_base: 0.8, fixes: ["Use trochoidal milling", "Check material certs", "Tougher grade"], domain: "tool_breakage" },
  { keywords: ["chipping", "micro fracture", "edge damage"], cause: "Impact loading or coating failure", probability_base: 0.8, fixes: ["Arc entry", "Tougher grade", "Reduce entry feed"], domain: "tool_breakage" },
  { keywords: ["chatter", "vibration", "screaming", "squealing", "noise"], cause: "Regenerative chatter or forced vibration", probability_base: 0.85, fixes: ["Change RPM", "Reduce DOC", "Variable helix/pitch cutter"], domain: "chatter_vibration" },
  { keywords: ["rumble", "low frequency", "shaking"], cause: "Machine rigidity or bearing issue", probability_base: 0.75, fixes: ["Reduce MRR", "Check bearings", "Tighten foundation"], domain: "chatter_vibration" },
  { keywords: ["stringy chips", "long chips", "wrapping"], cause: "No chip breaking mechanism", probability_base: 0.85, fixes: ["Chip breaker insert", "Increase feed", "High-pressure coolant"], domain: "chip_problems" },
  { keywords: ["blue chips", "burned chips", "discolored"], cause: "Excessive cutting temperature", probability_base: 0.9, fixes: ["Reduce speed 15-25%", "Increase coolant flow", "Climb milling"], domain: "chip_problems" },
  { keywords: ["dust", "powder", "fine chips"], cause: "Brittle material or excessive speed", probability_base: 0.7, fixes: ["Dust extraction", "Reduce speed", "MQL mist"], domain: "chip_problems" },
  { keywords: ["thermal growth", "part growing", "expanding"], cause: "Workpiece thermal expansion", probability_base: 0.9, fixes: ["Rough-cool-finish sequence", "In-process probing", "More coolant"], domain: "thermal_issues" },
  { keywords: ["smoke", "burning", "smell"], cause: "Coolant degradation or oil flash point", probability_base: 0.85, fixes: ["Check coolant concentration", "Replace coolant", "Higher flash-point oil"], domain: "thermal_issues" },
  { keywords: ["glow", "glowing", "red hot", "orange"], cause: "Cutting speed far too high", probability_base: 0.95, fixes: ["STOP — reduce speed 40-50%", "Ceramic/CBN insert", "Check coolant delivery"], domain: "thermal_issues" },
  { keywords: ["servo alarm", "axis error", "following error"], cause: "Mechanical resistance or overload", probability_base: 0.8, fixes: ["Check way lube", "Reduce cutting forces", "Check ball screw"], domain: "machine_alarms" },
  { keywords: ["spindle alarm", "spindle overload"], cause: "Power demand exceeds motor", probability_base: 0.85, fixes: ["Reduce MRR", "Lower speed", "Adaptive toolpath"], domain: "machine_alarms" },
  { keywords: ["overtravel", "limit switch", "axis limit"], cause: "Program exceeds machine travel", probability_base: 0.9, fixes: ["Verify WCS origin", "Simulate in CAM", "Check soft limits"], domain: "machine_alarms" },
  { keywords: ["slipping", "part moved", "shifted"], cause: "Insufficient clamping force", probability_base: 0.85, fixes: ["Clean jaws", "Serrated soft jaws", "Increase clamp force"], domain: "workholding" },
  { keywords: ["clamp marks", "deformation", "dents", "over-clamped"], cause: "Excessive clamping force", probability_base: 0.85, fixes: ["Use torque wrench", "Larger contact pads", "Spring clamps"], domain: "workholding" },
  { keywords: ["tilting", "lifting", "rocking"], cause: "Cutting uplift exceeds hold-down force", probability_base: 0.8, fixes: ["Add toe clamps", "Climb milling", "Reduce DOC"], domain: "workholding" },
  { keywords: ["distortion", "warping", "bowing"], cause: "Residual stress release", probability_base: 0.8, fixes: ["Stress relieve before finish", "Symmetric machining", "Min clamp force"], domain: "workholding" },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TroubleshootingAssistantEngine {
  private sessions: Map<string, DiagnosticSession> = new Map();
  private nodeMap: Map<string, DiagnosticNode>;

  constructor() {
    this.nodeMap = new Map();
    for (const node of DIAGNOSTIC_NODES) {
      this.nodeMap.set(node.id, node);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // startDiagnosis — Begin interactive session
  // ────────────────────────────────────────────────────────────────────────
  startDiagnosis(input: StartDiagnosisInput): StartDiagnosisResult {
    const { domain, symptoms } = input;

    const rootNodeId = this.getRootNodeId(domain);
    const rootNode = this.nodeMap.get(rootNodeId);
    if (!rootNode) {
      throw new Error(`Unknown domain: ${domain}. Valid domains: ${this.getValidDomains().join(", ")}`);
    }

    const sessionId = randomUUID();
    const possibleCauses = this.computeInitialProbabilities(domain, symptoms || []);

    const session: DiagnosticSession = {
      session_id: sessionId,
      domain,
      current_node_id: rootNodeId,
      history: [],
      started_at: Date.now(),
      possible_causes: possibleCauses,
    };

    this.sessions.set(sessionId, session);

    return {
      session_id: sessionId,
      first_question: rootNode,
      possible_causes: possibleCauses,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // answerQuestion — Continue diagnosis
  // ────────────────────────────────────────────────────────────────────────
  answerQuestion(input: AnswerQuestionInput): AnswerQuestionResult {
    const { session_id, answer } = input;

    const session = this.sessions.get(session_id);
    if (!session) {
      throw new Error(`Session not found: ${session_id}. Start a new diagnosis with startDiagnosis().`);
    }

    const currentNode = this.nodeMap.get(session.current_node_id);
    if (!currentNode) {
      throw new Error(`Internal error: node ${session.current_node_id} not found.`);
    }

    // Find matching answer (case-insensitive partial match)
    const matchedAnswer = this.findMatchingAnswer(currentNode, answer);
    if (!matchedAnswer) {
      const validAnswers = currentNode.answers.map((a) => a.label);
      throw new Error(`Invalid answer "${answer}". Valid answers: ${validAnswers.join(", ")}`);
    }

    // Record in history
    session.history.push({ node_id: session.current_node_id, answer: matchedAnswer.label });

    // Terminal node — diagnosis found
    if (matchedAnswer.diagnosis) {
      const confidence = this.computeConfidence(session);
      this.sessions.delete(session_id);

      return {
        diagnosis: matchedAnswer.diagnosis,
        remaining_questions: 0,
        confidence,
      };
    }

    // Navigate to next node
    if (matchedAnswer.next_node) {
      const nextNode = this.nodeMap.get(matchedAnswer.next_node);
      if (!nextNode) {
        throw new Error(`Internal error: next node ${matchedAnswer.next_node} not found.`);
      }

      session.current_node_id = matchedAnswer.next_node;
      const remaining = this.estimateRemainingQuestions(matchedAnswer.next_node);
      const confidence = this.computeConfidence(session);

      return {
        next_question: nextNode,
        remaining_questions: remaining,
        confidence,
      };
    }

    // Should not reach here
    throw new Error("Internal error: answer has neither diagnosis nor next_node.");
  }

  // ────────────────────────────────────────────────────────────────────────
  // quickDiagnose — Skip decision tree, use symptom keyword matching
  // ────────────────────────────────────────────────────────────────────────
  quickDiagnose(input: QuickDiagnoseInput): QuickDiagnoseResult {
    const { symptoms, material, operation, tool_type } = input;

    if (!symptoms || symptoms.length === 0) {
      throw new Error("At least one symptom is required for quick diagnosis.");
    }

    const symptomLower = symptoms.map((s) => s.toLowerCase());
    const allTerms = [...symptomLower];
    if (material) allTerms.push(material.toLowerCase());
    if (operation) allTerms.push(operation.toLowerCase());
    if (tool_type) allTerms.push(tool_type.toLowerCase());

    // Score each keyword entry against provided symptoms using cosine-like similarity
    const scored: Array<{ entry: SymptomKeywordEntry; score: number }> = [];

    for (const entry of SYMPTOM_KEYWORD_INDEX) {
      let matchCount = 0;
      let totalWeight = 0;

      for (const keyword of entry.keywords) {
        const kw = keyword.toLowerCase();
        for (const term of allTerms) {
          if (term.includes(kw) || kw.includes(term)) {
            matchCount++;
            break;
          }
        }
        totalWeight++;
      }

      if (matchCount > 0) {
        const similarity = matchCount / Math.sqrt(totalWeight * allTerms.length);
        const adjustedProbability = entry.probability_base * similarity;
        scored.push({ entry, score: adjustedProbability });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Boost probability for context matches (material, operation)
    for (const item of scored) {
      if (material && item.entry.domain === "chip_problems" &&
        ["cast iron", "graphite"].some((m) => material.toLowerCase().includes(m))) {
        item.score *= 1.1;
      }
      if (operation && operation.toLowerCase().includes("slot") && item.entry.cause.includes("Chip packing")) {
        item.score *= 1.15;
      }
    }

    // Re-sort after boosts
    scored.sort((a, b) => b.score - a.score);

    const topCauses = scored.slice(0, 5).map((s) => ({
      cause: s.entry.cause,
      probability: Math.min(s.score, 0.99),
      fixes: s.entry.fixes,
    }));

    // Generate recommended checks based on top causes
    const recommendedChecks = this.generateRecommendedChecks(topCauses.map((c) => c.cause));

    return { top_causes: topCauses, recommended_checks: recommendedChecks };
  }

  // ────────────────────────────────────────────────────────────────────────
  // getCommonProblems — Frequency-ranked problems
  // ────────────────────────────────────────────────────────────────────────
  getCommonProblems(input: CommonProblemsInput): CommonProblemsResult {
    let filtered = [...COMMON_PROBLEMS];

    if (input.domain) {
      filtered = filtered.filter((p) => p.domain === input.domain);
    }

    if (input.operation) {
      const op = input.operation.toLowerCase();
      // Filter by operation relevance
      if (op.includes("slot") || op.includes("pocket")) {
        filtered = filtered.filter((p) =>
          p.problem.toLowerCase().includes("chip") ||
          p.problem.toLowerCase().includes("slot") ||
          p.problem.toLowerCase().includes("chatter") ||
          p.problem.toLowerCase().includes("break") ||
          p.domain === "tool_breakage" ||
          p.domain === "chip_problems" ||
          p.domain === "chatter_vibration" ||
          p.frequency_rank <= 2
        );
      } else if (op.includes("finish")) {
        filtered = filtered.filter((p) =>
          p.domain === "surface_finish" ||
          p.domain === "dimensional_accuracy" ||
          p.frequency_rank <= 2
        );
      } else if (op.includes("drill") || op.includes("hole")) {
        filtered = filtered.filter((p) =>
          p.problem.toLowerCase().includes("chip") ||
          p.problem.toLowerCase().includes("break") ||
          p.domain === "chip_problems" ||
          p.domain === "tool_breakage" ||
          p.domain === "dimensional_accuracy" ||
          p.frequency_rank <= 2
        );
      }
    }

    // Sort by frequency rank
    filtered.sort((a, b) => a.frequency_rank - b.frequency_rank);

    return { problems: filtered.slice(0, 10) };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ────────────────────────────────────────────────────────────────────────

  private getRootNodeId(domain: ProblemDomain): string {
    const rootMap: Record<ProblemDomain, string> = {
      surface_finish: "sf-root",
      dimensional_accuracy: "da-root",
      tool_breakage: "tb-root",
      chatter_vibration: "cv-root",
      chip_problems: "cp-root",
      thermal_issues: "th-root",
      machine_alarms: "ma-root",
      workholding: "wh-root",
    };
    return rootMap[domain];
  }

  private getValidDomains(): ProblemDomain[] {
    return [
      "surface_finish", "dimensional_accuracy", "tool_breakage",
      "chatter_vibration", "chip_problems", "thermal_issues",
      "machine_alarms", "workholding",
    ];
  }

  private computeInitialProbabilities(domain: ProblemDomain, symptoms: string[]): Array<{ cause: string; probability: number }> {
    // Get all terminal diagnoses in this domain
    const causes = new Map<string, number>();

    for (const node of DIAGNOSTIC_NODES) {
      if (node.domain !== domain) continue;
      for (const ans of node.answers) {
        if (ans.diagnosis) {
          let prob = 1.0 / this.countTerminalNodes(domain);
          // Boost probability if symptoms match
          if (symptoms.length > 0) {
            const entry = SYMPTOM_KEYWORD_INDEX.find((e) =>
              e.cause === ans.diagnosis!.root_cause && e.domain === domain
            );
            if (entry) {
              const matchCount = symptoms.filter((s) =>
                entry.keywords.some((kw) => s.toLowerCase().includes(kw.toLowerCase()))
              ).length;
              if (matchCount > 0) {
                prob = entry.probability_base * (matchCount / symptoms.length);
              }
            }
          }
          causes.set(ans.diagnosis.root_cause, prob);
        }
      }
    }

    return Array.from(causes.entries())
      .map(([cause, probability]) => ({ cause, probability }))
      .sort((a, b) => b.probability - a.probability);
  }

  private countTerminalNodes(domain: ProblemDomain): number {
    let count = 0;
    for (const node of DIAGNOSTIC_NODES) {
      if (node.domain !== domain) continue;
      for (const ans of node.answers) {
        if (ans.diagnosis) count++;
      }
    }
    return Math.max(count, 1);
  }

  private findMatchingAnswer(node: DiagnosticNode, answer: string): DiagnosticAnswer | undefined {
    const ansLower = answer.toLowerCase().trim();

    // Exact match first
    const exact = node.answers.find((a) => a.label.toLowerCase() === ansLower);
    if (exact) return exact;

    // Partial match (answer is contained in label or vice versa)
    const partial = node.answers.find((a) =>
      a.label.toLowerCase().includes(ansLower) || ansLower.includes(a.label.toLowerCase())
    );
    if (partial) return partial;

    // Index-based match (1, 2, 3, etc.)
    const idx = parseInt(ansLower, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= node.answers.length) {
      return node.answers[idx - 1];
    }

    // First-word match
    const firstWord = ansLower.split(/\s+/)[0];
    const wordMatch = node.answers.find((a) =>
      a.label.toLowerCase().startsWith(firstWord)
    );
    if (wordMatch) return wordMatch;

    return undefined;
  }

  private estimateRemainingQuestions(nodeId: string): number {
    // BFS to find max depth to a terminal node
    let maxDepth = 0;
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const node = this.nodeMap.get(current.id);
      if (!node) continue;

      for (const ans of node.answers) {
        if (ans.diagnosis) {
          maxDepth = Math.max(maxDepth, current.depth);
        }
        if (ans.next_node && !visited.has(ans.next_node)) {
          queue.push({ id: ans.next_node, depth: current.depth + 1 });
        }
      }
    }

    return maxDepth;
  }

  private computeConfidence(session: DiagnosticSession): number {
    // Confidence increases with each answered question
    const questionsAnswered = session.history.length;
    const maxQuestions = 4; // typical max depth
    const base = 0.5;
    const increment = (1.0 - base) / maxQuestions;
    return Math.min(base + questionsAnswered * increment, 0.99);
  }

  private generateRecommendedChecks(causes: string[]): string[] {
    const checks: string[] = [];
    const checkSet = new Set<string>();

    const addCheck = (check: string) => {
      if (!checkSet.has(check)) {
        checkSet.add(check);
        checks.push(check);
      }
    };

    for (const cause of causes) {
      const lower = cause.toLowerCase();
      if (lower.includes("chatter") || lower.includes("vibration")) {
        addCheck("Tap test (impact hammer) to find natural frequency");
        addCheck("Record audio spectrum during cut to identify chatter frequency");
      }
      if (lower.includes("tool") && (lower.includes("wear") || lower.includes("deflect"))) {
        addCheck("Measure tool flank wear VB with microscope/loupe");
        addCheck("Measure actual tool overhang and calculate deflection");
      }
      if (lower.includes("thermal")) {
        addCheck("Measure part temperature with IR thermometer during and after cut");
        addCheck("Check coolant concentration with refractometer");
      }
      if (lower.includes("runout")) {
        addCheck("Measure TIR with dial indicator on tool nose");
      }
      if (lower.includes("alignment") || lower.includes("taper")) {
        addCheck("Tram spindle with dial indicator on table surface");
      }
      if (lower.includes("bearing")) {
        addCheck("Check spindle vibration spectrum for bearing defect frequencies");
      }
      if (lower.includes("clamp") || lower.includes("fixture") || lower.includes("grip")) {
        addCheck("Verify clamping force with torque wrench or pressure gauge");
        addCheck("Inspect jaw/fixture surfaces for wear or contamination");
      }
      if (lower.includes("coolant") || lower.includes("oil")) {
        addCheck("Check coolant concentration with refractometer");
        addCheck("Inspect coolant for contamination (smell, color, tramp oil)");
      }
      if (lower.includes("built-up edge") || lower.includes("bue")) {
        addCheck("Inspect cutting edge under magnification for adhered material");
      }
      if (lower.includes("process capability") || lower.includes("cpk")) {
        addCheck("Run 30-part SPC study to determine Cpk");
        addCheck("Perform Gauge R&R to separate measurement from process variation");
      }
    }

    // Always recommend these if nothing specific
    if (checks.length === 0) {
      addCheck("Visual inspection of tool cutting edge for wear/damage");
      addCheck("Check coolant level, concentration, and delivery");
      addCheck("Verify workholding security and datum surfaces");
      addCheck("Compare actual vs. programmed cutting parameters");
    }

    return checks.slice(0, 8);
  }

  /** Return all diagnostic nodes (for testing/inspection) */
  getNodeCount(): number {
    return DIAGNOSTIC_NODES.length;
  }

  /** Return all valid domains */
  getDomains(): ProblemDomain[] {
    return this.getValidDomains();
  }

  /** Clean up expired sessions (older than 30 minutes) */
  cleanupSessions(): number {
    const now = Date.now();
    let cleaned = 0;
    const expired: string[] = [];
    this.sessions.forEach((session, id) => {
      if (now - session.started_at > 30 * 60 * 1000) {
        expired.push(id);
      }
    });
    for (const id of expired) {
      this.sessions.delete(id);
      cleaned++;
    }
    return cleaned;
  }
}

// Singleton export
export const troubleshootingAssistantEngine = new TroubleshootingAssistantEngine();
