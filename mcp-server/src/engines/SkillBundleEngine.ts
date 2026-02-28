/**
 * PRISM Skill Bundle Engine — D1.4 Auto-Loading Enhancement
 * ==========================================================
 * 
 * PURPOSE: Define skill bundles, map domains/actions to bundles,
 * and provide compact skill digests for _context injection.
 * 
 * DESIGN PRINCIPLES:
 * - Bundles are pre-compiled sets of skills for common task domains
 * - Digests are 3-5 line summaries with KEY formulas/constraints (not full SKILL.md)
 * - Domain mapping cross-references TaskAgentClassifier domains
 * - Zero registry imports — pure static data + file reads
 * 
 * @version 1.0.0
 * @date 2026-02-12
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";

const SKILLS_DIR = PATHS.SKILLS;

// ============================================================================
// BUNDLE DEFINITIONS (9 bundles)
// ============================================================================

export interface SkillBundle {
  id: string;
  name: string;
  purpose: string;
  skills: string[];
  /** Pre-compiled chain name in SkillExecutor (if exists) */
  chain_name?: string;
  /** Key formulas/constraints — compact digest for _context injection */
  digest: string[];
  /** Which TaskAgentClassifier domains trigger this bundle */
  trigger_domains: string[];
  /** Which actions directly trigger this bundle */
  trigger_actions: string[];
}

const BUNDLES: SkillBundle[] = [
  {
    id: "speed-feed",
    name: "Speed & Feed Bundle",
    purpose: "Complete cutting parameter calculation with physics validation",
    skills: ["prism-speed-feed-engine", "prism-cutting-mechanics", "prism-material-physics", "prism-cutting-tools", "prism-safety-framework"],
    chain_name: "speed-feed-full",
    digest: [
      "Vc=π·D·n/1000 (m/min), n=Vc·1000/(π·D), fz=Vf/(n·z)",
      "Kienzle: Fc=kc1.1·b·h^(1-mc), kc1.1 from material registry",
      "Taylor: VcT^n=C, solve for tool life at target speed",
      "Safety: verify Pc≤Pspindle×0.8, chip load within insert limits",
      "Always validate: S(x)≥0.70, uncertainty bounds on all outputs"
    ],
    trigger_domains: ["calculations", "tooling"],
    trigger_actions: ["speed_feed", "cutting_force", "tool_life", "chip_load", "power", "mrr"]
  },
  {
    id: "toolpath-strategy",
    name: "Toolpath Strategy Bundle",
    purpose: "Toolpath selection with cutting optimization and safety",
    skills: ["prism-cam-strategies", "prism-cutting-mechanics", "prism-speed-feed-engine", "prism-process-optimizer", "prism-safety-framework"],
    chain_name: "toolpath-optimize",
    digest: [
      "Strategy selection: feature type + material + machine → optimal strategy",
      "Trochoidal: ae≤15%D, constant chip load, reduced radial force",
      "HSM: light ae, high Vc, maintain constant MRR across transitions",
      "Scallop height: h=ae²/(8·R) for ball-nose, verify Ra target",
      "Engagement angle: θ=arccos(1-ae/R), keep ≤90° for stability"
    ],
    trigger_domains: ["toolpath"],
    trigger_actions: ["strategy_select", "params_calculate", "trochoidal", "hsm", "scallop", "stepover", "engagement", "arc_fit", "material_strategies", "prism_novel"]
  },
  {
    id: "material-analysis",
    name: "Material Analysis Bundle",
    purpose: "Full material property analysis with machinability assessment",
    skills: ["prism-material-lookup", "prism-material-physics", "prism-material-enhancer", "prism-material-validator", "prism-universal-formulas"],
    chain_name: "material-complete",
    digest: [
      "Material families: steel/stainless/cast-iron/aluminum/titanium/nickel/copper/composite",
      "Key params: kc1.1, mc (Kienzle), A/B/C/n/m (Johnson-Cook), HB/HRC/UTS/YS",
      "Machinability index: relative to AISI 1212 (=100%), lower=harder to machine",
      "Same material different condition → different params (4140 annealed vs Q&T 50HRC)",
      "Validate: all params have uncertainty bounds, cross-check kc1.1 vs UTS correlation"
    ],
    trigger_domains: ["materials"],
    trigger_actions: ["material_get", "material_search", "material_compare", "flow_stress"]
  },
  {
    id: "alarm-diagnosis",
    name: "Alarm Diagnosis Bundle",
    purpose: "Cross-controller alarm decoding with fix procedures",
    skills: ["prism-controller-quick-ref", "prism-fanuc-programming", "prism-siemens-programming", "prism-heidenhain-programming", "prism-error-recovery"],
    chain_name: "alarm-diagnose",
    digest: [
      "Controller families: FANUC/HAAS/Siemens/Okuma/Mazak/Heidenhain/Mitsubishi/Brother/DMG/Doosan/Hurco/Toyoda",
      "Alarm structure: code + severity + description + probable_cause + fix_procedure",
      "FANUC: PS=program, SV=servo, OT=overheat/overtravel, SP=spindle, IO=I/O",
      "Cross-reference: same symptom may have different codes across controllers",
      "Always provide: immediate action + root cause + prevention steps"
    ],
    trigger_domains: ["alarms", "troubleshooting"],
    trigger_actions: ["alarm_decode", "alarm_search", "alarm_fix"]
  },
  {
    id: "safety-validation",
    name: "Safety Validation Bundle",
    purpose: "Comprehensive safety checks for machining operations",
    skills: ["prism-safety-framework", "prism-life-safety-mindset", "prism-quality-gates", "prism-cutting-tools", "prism-physics-formulas"],
    chain_name: "safety-validate",
    digest: [
      "S(x)≥0.70 HARD BLOCK — no output below this threshold",
      "Collision: check tool/fixture/workpiece clearance in all axes",
      "Spindle: Pc≤Pmax×0.8, torque within rated range, speed≤max RPM",
      "Tool: chip load within insert limits, predict breakage at >80% stress",
      "Workholding: clamp force > cutting force×2.5 safety factor, check pullout"
    ],
    trigger_domains: ["safety", "physics"],
    trigger_actions: [
      "check_toolpath_collision", "validate_rapid_moves", "check_fixture_clearance",
      "calculate_safe_approach", "detect_near_miss", "validate_tool_clearance",
      "check_5axis_head_clearance", "predict_tool_breakage", "calculate_tool_stress",
      "check_chip_load_limits", "estimate_tool_fatigue", "get_safe_cutting_limits",
      "calculate_clamp_force_required", "validate_workholding_setup", "check_pullout_resistance",
      "analyze_liftoff_moment", "calculate_part_deflection", "validate_vacuum_fixture",
      "check_spindle_torque", "check_spindle_power", "validate_spindle_speed",
      "stability", "deflection"
    ]
  },
  {
    id: "threading",
    name: "Threading Operations Bundle",
    purpose: "Thread cutting parameters, specs, and G-code generation",
    skills: ["prism-universal-formulas", "prism-cutting-mechanics", "prism-gcode-reference", "prism-fanuc-programming", "prism-expert-quality-control"],
    chain_name: "threading-full",
    digest: [
      "Tap drill: Ø=major-(pitch×%engagement/76.98), standard 75% engagement",
      "Thread mill: single-point or multi-form, climb cut, helical interpolation",
      "Pitch diameter: dp=d-0.6495×pitch (metric), dp=d-0.6495/TPI (unified)",
      "G-code: G76 (FANUC turning), G32 (single pass), G84 (rigid tap cycle)",
      "Go/No-Go: verify pitch dia within class tolerance (6H/6g metric, 2B/2A unified)"
    ],
    trigger_domains: ["threading"],
    trigger_actions: [
      "calculate_tap_drill", "calculate_thread_mill_params", "calculate_thread_depth",
      "calculate_engagement_percent", "get_thread_specifications", "get_go_nogo_gauges",
      "calculate_pitch_diameter", "calculate_minor_major_diameter", "select_thread_insert",
      "calculate_thread_cutting_params", "validate_thread_fit_class", "generate_thread_gcode"
    ]
  },
  {
    id: "quality-release",
    name: "Quality & Release Bundle",
    purpose: "Full quality validation pipeline for release readiness",
    skills: ["prism-quality-gates", "prism-anti-regression", "prism-ralph-validation", "prism-master-equation", "prism-safety-framework"],
    chain_name: "quality-release",
    digest: [
      "Ω(x)=0.25R+0.20C+0.15P+0.30S+0.10L — must be ≥0.70 for release",
      "S(x)≥0.70 HARD CONSTRAINT — blocks all output if violated",
      "Anti-regression: new_count≥old_count, validate before any file replacement",
      "Ralph loop: SCRUTINIZE→IMPROVE→VALIDATE→ASSESS (requires API key)",
      "Evidence level: L3 minimum (calculated/measured), L4 preferred for safety-critical"
    ],
    trigger_domains: ["quality", "validation"],
    trigger_actions: ["compute", "validate", "loop", "scrutinize", "assess", "safety", "completeness", "anti_regression"]
  },
  {
    id: "session-recovery",
    name: "Session Recovery Bundle",
    purpose: "Session recovery and context reconstruction after compaction",
    skills: ["prism-state-manager", "prism-session-handoff", "prism-task-continuity", "prism-context-engineering", "prism-context-pressure"],
    chain_name: "session-recovery",
    digest: [
      "Recovery chain: COMPACTION_SURVIVAL.json → RECENT_ACTIONS.json → RECOVERY_MANIFEST.json",
      "State load: CURRENT_STATE.json has task, phase, todo, findings, decisions",
      "Context pressure: 🟢0-40% 🟡40-70% 🔴70-90% ⚫90%+ — externalize at yellow",
      "Handoff: save task state + remaining items + all file states before session end",
      "Rehydrate: read survival data → resume todo → continue from exact position"
    ],
    trigger_domains: [],
    trigger_actions: ["state_load", "state_save", "state_checkpoint", "resume_session", "handoff_prepare", "context_compress", "context_pressure", "compaction_detect"]
  },
  {
    id: "optimization",
    name: "Optimization & Planning Bundle",
    purpose: "Multi-objective optimization and mathematical planning",
    skills: ["prism-mathematical-planning", "prism-ai-optimization", "prism-process-optimizer", "prism-cognitive-core", "prism-reasoning-engine"],
    chain_name: "optimize-plan",
    digest: [
      "MATHPLAN gate: prove scope→decompose→constraints→success criteria BEFORE code",
      "Multi-objective: Pareto frontier for competing goals (cost vs time vs quality)",
      "Cost optimize: min(tool_cost + machine_time + labor) subject to quality constraints",
      "Bayesian: prior × likelihood ∝ posterior, update beliefs with observed data",
      "Step-back: challenge assumptions before execution, question every default"
    ],
    trigger_domains: ["optimization", "planning"],
    trigger_actions: ["cost_optimize", "multi_optimize", "thermal", "brainstorm", "plan", "productivity", "cycle_time"]
  }
];

// ============================================================================
// PUBLIC API
// ============================================================================

/** Get all bundles */
export function getAllBundles(): SkillBundle[] { return BUNDLES; }

/** Get bundle by ID */
export function getBundle(id: string): SkillBundle | undefined { return BUNDLES.find(b => b.id === id); }

/** Find bundles that match a given action */
export function getBundlesForAction(action: string): SkillBundle[] {
  return BUNDLES.filter(b => b.trigger_actions.includes(action));
}

/** Find bundles that match a given domain */
export function getBundlesForDomain(domain: string): SkillBundle[] {
  return BUNDLES.filter(b => b.trigger_domains.includes(domain));
}

/** Get compact digest for context injection */
export function getBundleDigest(id: string): string[] {
  const bundle = BUNDLES.find(b => b.id === id);
  return bundle?.digest || [];
}

/** List all bundle IDs with names */
export function listBundles(): Array<{ id: string; name: string; skills: number; actions: number }> {
  return BUNDLES.map(b => ({
    id: b.id,
    name: b.name,
    skills: b.skills.length,
    actions: b.trigger_actions.length
  }));
}
