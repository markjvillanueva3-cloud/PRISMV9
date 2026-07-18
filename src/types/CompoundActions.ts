/**
 * PRISM Compound Actions — Server-side multi-step computation
 * 
 * Instead of Claude making 5+ round-trip MCP calls (each consuming context tokens),
 * compound actions execute the full pipeline server-side and return only the verdict.
 * 
 * TOKEN SAVINGS EXAMPLE:
 *   Traditional: material_get + tool_get + speed_feed + cutting_force + safety_check
 *   = 5 calls × ~300 tokens each = ~1,500 tokens in context
 *   
 *   Compound: full_parameter_set { material, tool, operation }
 *   = 1 call × ~100 tokens = ~100 tokens in context
 *   = 93% token reduction
 * 
 * IMPLEMENTATION: Add these as new actions on existing dispatchers
 */

// ─── COMPOUND ACTION 1: Full Parameter Set ───────────────────────────────────
// Dispatcher: calcDispatcher (or new compoundDispatcher)
// Combines: material_get + speed_feed + cutting_force + power + tool_life + safety_check
export interface FullParameterSetInput {
  material: string;           // Material ID or name
  tool_diameter: number;      // mm
  flutes: number;
  operation: 'roughing' | 'semi_finish' | 'finish';
  machine_power_kW?: number;  // For safety check
  response_level?: 'pointer' | 'summary' | 'full';
}

export interface FullParameterSetOutput {
  // Key cutting parameters
  Vc: number;       // m/min
  fz: number;       // mm/tooth
  ap: number;       // mm
  ae: number;       // mm
  n: number;        // rpm
  vf: number;       // mm/min
  // Derived values
  Fc: number;       // N
  P: number;        // kW
  T_life: number;   // min
  MRR: number;      // cm³/min
  Ra_est: number;   // μm (estimated surface roughness)
  // Safety
  safety_score: number;  // S(x) 0-1
  verdict: 'SAFE' | 'WARNING' | 'BLOCKED';
  warnings: string[];
}

// ─── COMPOUND ACTION 2: Material + Machine + Tool Match ──────────────────────
// Dispatcher: dataDispatcher
// Combines: material_search + machine_capabilities + tool_recommend
export interface TripleMatchInput {
  material: string;
  part_dimensions?: { x: number; y: number; z: number };
  tolerance_mm?: number;
  preferred_machine?: string;
  response_level?: 'pointer' | 'summary' | 'full';
}

export interface TripleMatchOutput {
  material: { id: string; name: string; iso_group: string };
  machine: { id: string; name: string; max_rpm: number; power_kW: number };
  tools: Array<{ id: string; name: string; type: string; suitability_score: number }>;
  compatibility_score: number;
  warnings: string[];
}

// ─── COMPOUND ACTION 3: Safety Validation Pipeline ───────────────────────────
// Dispatcher: safetyDispatcher
// Combines: check_spindle_torque + check_spindle_power + check_chip_load_limits 
//           + predict_tool_breakage + validate_workholding_setup
export interface SafetyPipelineInput {
  cutting_params: {
    Fc: number; Vc: number; n: number; fz: number;
    ap: number; ae: number; D: number; z: number;
  };
  machine_limits?: {
    max_torque_Nm?: number;
    max_power_kW?: number;
    max_rpm?: number;
  };
  response_level?: 'pointer' | 'summary' | 'full';
}

export interface SafetyPipelineOutput {
  overall_score: number;     // S(x) composite
  verdict: 'SAFE' | 'WARNING' | 'BLOCKED';
  checks: {
    spindle_torque: { pass: boolean; value: number; limit: number };
    spindle_power: { pass: boolean; value: number; limit: number };
    chip_load: { pass: boolean; value: number; limit: number };
    tool_stress: { pass: boolean; value: number; limit: number };
    breakage_risk: { pass: boolean; probability: number };
  };
  blocking_issues: string[];
  recommendations: string[];
}

// ─── WRITE-TO-FILE PATTERN ───────────────────────────────────────────────────
// For large outputs that would consume too many context tokens

export interface WriteToFileOptions {
  /** Write output to file instead of returning in context */
  write_to_file?: boolean;
  /** Target directory for output files */
  output_dir?: string;  // Default: C:\PRISM\state\reports\
  /** File name prefix */
  file_prefix?: string;
}

/**
 * When write_to_file is true, the action:
 * 1. Performs the full computation
 * 2. Writes detailed results to disk (JSON or Markdown)
 * 3. Returns only a FilePointerResponse (~20 tokens)
 * 
 * Example usage:
 *   prism_calc→full_parameter_set { material: "Ti-6Al-4V", ..., write_to_file: true }
 *   → { status: "ok", file: "state/reports/params-Ti6Al4V-20260220.json", size: "12KB", summary: "8 params computed, S(x)=0.83, SAFE" }
 * 
 * Claude then reads the file ONLY if it needs specific details.
 */

// ─── MIGRATION TASKS ─────────────────────────────────────────────────────────
// These compound actions should be added to the roadmap as enhancement tasks:
//
// R2 (current): Add response_level to calcDispatcher + safetyDispatcher
// R3-MS0-T2: Add full_parameter_set compound action to IntelligenceEngine
// R3-MS0-T3: Add triple_match compound action to IntelligenceEngine
// R3-MS0-T5: Add safety_pipeline compound action to safetyDispatcher
// R4-MS0: Add write_to_file support to all dispatchers
//
// The ResponseLevel.ts type is already created at src/types/ResponseLevel.ts
// Each dispatcher needs: import { ResponseLevel, formatByLevel } from '../types/ResponseLevel'
