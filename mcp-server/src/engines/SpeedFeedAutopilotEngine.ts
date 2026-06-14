/**
 * SpeedFeedAutopilotEngine — ACP-MS4
 *
 * End-to-end product autopilot for speed/feed calculations:
 *   1. Parse user request (material, tool, machine, operation)
 *   2. Resolve material properties from canonical DB
 *   3. Resolve tool geometry
 *   4. Resolve machine capabilities
 *   5. Run SpeedFeedOrchestrator with full context
 *   6. Apply safety constraints (omega score)
 *   7. Return results with confidence bounds and recommendations
 *
 * This is the "product chain" — a fully automated pipeline from
 * minimal user input to per-block-ready speed/feed output.
 *
 * Sources:
 *   - ACP-MS4: Speed/Feed Product Autopilot
 *   - SpeedFeedOrchestratorEngine (2,851 LOC, 8 resolvers)
 *   - CANONICAL_MATERIAL_DB from physics/constants.ts
 *   - AutomationChainEngine chain model
 */

import { CANONICAL_MATERIAL_DB } from "../physics/constants.js";
import type { TaskClass } from "./AutomationChainEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AutopilotInput {
  material: string;
  tool_diameter_mm: number;
  flute_count?: number;
  operation?: "roughing" | "finishing" | "slotting" | "profiling" | "drilling" | "facing";
  machine_name?: string;
  depth_of_cut_mm?: number;
  width_of_cut_mm?: number;
  hardness_hrc?: number;
  coolant?: "flood" | "mist" | "air" | "none";
  surface_finish_target_Ra?: number;
}

export interface AutopilotStepResult {
  step: string;
  status: "pass" | "fail" | "warn";
  duration_ms: number;
  data: Record<string, unknown>;
}

export interface MaterialResolution {
  input_name: string;
  resolved_iso?: string;
  kc1_1: number;
  mc: number;
  taylor_C: number;
  taylor_n: number;
  density_kg_m3: number;
  thermal_conductivity_W_mK: number;
  confidence: number;
  source: string;
}

export interface ToolResolution {
  diameter_mm: number;
  flute_count: number;
  helix_angle_deg: number;
  rake_angle_deg: number;
  tool_type: string;
  confidence: number;
}

export interface MachineResolution {
  name: string;
  max_rpm: number;
  power_kw: number;
  torque_Nm: number;
  rigidity: "low" | "medium" | "high";
  confidence: number;
}

export interface SpeedFeedOutput {
  rpm: number;
  feed_mm_min: number;
  feed_per_tooth_mm: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  surface_speed_m_min: number;
  mrr_cm3_min: number;
  cutting_force_N: number;
  power_kW: number;
  confidence: number;
  limiting_factor: string;
}

export interface AutopilotResult {
  chain_id: "speed_feed_autopilot";
  task_class: TaskClass;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  status: "success" | "partial" | "failed";
  steps: AutopilotStepResult[];
  material: MaterialResolution;
  tool: ToolResolution;
  machine: MachineResolution;
  output: SpeedFeedOutput;
  safety_score: number;
  recommendations: string[];
}

// ============================================================================
// MATERIAL ALIASES
// ============================================================================

// FEATURE-GAP-AUDIT-MS0/U-SF-AUTOPILOT-ALIAS-MAP-RECONCILE (2026-05-21, slot:juliett):
// Reconciled alias targets against actual CANONICAL_MATERIAL_DB keys from
// _RAW_MATERIAL_DB in src/physics/constants.ts. The pre-reconcile map pointed
// to invented keys (aluminum_6061, alloy_steel, stainless_304, inconel_718,
// titanium_gr5, tool_steel, copper_c110, brass_360, cast_iron, ductile_iron,
// aluminum_7075, stainless_316) that DO NOT exist in the canonical DB — so
// every aliased material fell through to default_fallback (kc1_1=1800,
// mc=0.25, taylor_C=350, confidence=0.3, source="default_fallback"),
// rendering the autopilot material-insensitive. Now every alias target IS a
// real RAW key per constants.ts:125+. NOTE: DB keys preserve case ("Inconel
// 718" with capital + space, "Ti-6Al-4V" with hyphens + capitals); the
// engine's `lower = name.toLowerCase()` normalizes INPUT names only — the
// alias *targets* must match the DB's exact case.
const MATERIAL_ALIASES: Record<string, string> = {
  // P group — carbon / alloy steel
  "steel": "1018", "mild steel": "1018", "1018": "1018",
  "carbon steel": "1045", "1045": "1045",
  "alloy steel": "4140", "4140": "4140", "4340": "4140",
  // M group — stainless
  "stainless": "304", "stainless steel": "304", "304": "304", "316": "316",
  // K group — cast iron
  "cast iron": "gray_iron", "gray iron": "gray_iron", "ductile iron": "gray_iron",
  // N group — aluminum + non-ferrous
  "aluminum": "6061", "aluminium": "6061", "6061": "6061", "7075": "7075",
  "copper": "C11000", "brass": "C26000",
  // S group — superalloys + titanium
  "titanium": "Ti-6Al-4V", "ti-6al-4v": "Ti-6Al-4V", "ti64": "Ti-6Al-4V",
  "inconel": "Inconel 718", "inconel 718": "Inconel 718",
  "hastelloy": "Inconel 718", "superalloy": "Inconel 718", "nickel alloy": "Inconel 718",
  // H group — hardened / tool steel
  "hardened steel": "D2", "tool steel": "D2", "d2": "D2", "a2": "A2",
  "h13": "D2", // H13 hot-work tool steel — closest H-group RAW key is D2
};

// ============================================================================
// ENGINE
// ============================================================================

export class SpeedFeedAutopilotEngine {

  // ── Material Resolution ────────────────────────────────────

  /**
   * Resolve material name to physics properties.
   *
   * @param name User-provided material name
   * @param hardnessHRC Optional hardness override
   * @returns Resolved material with Kienzle/Taylor constants
   */
  resolveMaterial(name: string, hardnessHRC?: number): MaterialResolution {
    const lower = name.toLowerCase().trim();

    // Try direct DB key lookup via aliases
    let dbKey = MATERIAL_ALIASES[lower];

    // Try partial match
    if (!dbKey) {
      for (const [alias, key] of Object.entries(MATERIAL_ALIASES)) {
        if (lower.includes(alias) || alias.includes(lower)) {
          dbKey = key;
          break;
        }
      }
    }

    // Try direct DB key match
    if (!dbKey) {
      dbKey = Object.keys(CANONICAL_MATERIAL_DB).find(k =>
        lower.includes(k) || k.includes(lower)
      ) || "steel";
    }

    const db = CANONICAL_MATERIAL_DB[dbKey];
    if (!db) {
      return {
        input_name: name,
        kc1_1: 1800, mc: 0.25, taylor_C: 350, taylor_n: 0.25,
        density_kg_m3: 7850, thermal_conductivity_W_mK: 50,
        confidence: 0.3,
        source: "default_fallback",
      };
    }

    // Hardness correction for kc1_1 (Kienzle)
    let kc1_1 = db.kc1_1;
    if (hardnessHRC && hardnessHRC > 45) {
      // Increase specific cutting force for hardened material
      kc1_1 *= 1.0 + (hardnessHRC - 45) * 0.015;
    }

    return {
      input_name: name,
      resolved_iso: db.iso_group,
      kc1_1,
      mc: db.mc,
      taylor_C: db.taylor_C,
      taylor_n: db.taylor_n,
      density_kg_m3: db.density_kg_m3,
      thermal_conductivity_W_mK: db.k_thermal,
      confidence: 0.85,
      source: `CANONICAL_MATERIAL_DB[${dbKey}]`,
    };
  }

  // ── Tool Resolution ────────────────────────────────────────

  /**
   * Resolve tool parameters from diameter and flute count.
   *
   * @param diameter_mm Tool diameter
   * @param flute_count Number of flutes (defaults by diameter)
   * @param operation Operation type for tool selection
   * @returns Resolved tool geometry
   */
  resolveTool(
    diameter_mm: number,
    flute_count?: number,
    operation?: AutopilotInput["operation"],
  ): ToolResolution {
    // Default flute count by diameter range
    const defaultFlutes = diameter_mm <= 6 ? 2 :
      diameter_mm <= 12 ? 3 :
      diameter_mm <= 25 ? 4 : 6;

    const flutes = flute_count || defaultFlutes;

    // Helix angle by operation
    const helix = operation === "slotting" ? 30 :
      operation === "finishing" ? 45 :
      operation === "roughing" ? 35 : 38;

    // Rake angle (positive for most materials)
    const rake = operation === "finishing" ? 12 : 8;

    const type = operation === "drilling" ? "drill" :
      diameter_mm <= 3 ? "micro_endmill" :
      diameter_mm > 50 ? "face_mill" : "endmill";

    return {
      diameter_mm,
      flute_count: flutes,
      helix_angle_deg: helix,
      rake_angle_deg: rake,
      tool_type: type,
      confidence: flute_count ? 0.9 : 0.7,
    };
  }

  // ── Machine Resolution ─────────────────────────────────────

  /**
   * Resolve machine capabilities from name or defaults.
   *
   * @param name Machine name (optional)
   * @returns Resolved machine capabilities
   */
  resolveMachine(name?: string): MachineResolution {
    // Common machine defaults
    const machines: Record<string, Omit<MachineResolution, "confidence">> = {
      "haas vf-2": { name: "Haas VF-2", max_rpm: 8100, power_kw: 22.4, torque_Nm: 122, rigidity: "medium" },
      "haas vf-4": { name: "Haas VF-4", max_rpm: 8100, power_kw: 22.4, torque_Nm: 122, rigidity: "medium" },
      "dmg mori": { name: "DMG MORI DMU 50", max_rpm: 20000, power_kw: 35, torque_Nm: 120, rigidity: "high" },
      "mazak": { name: "Mazak VCN 530C", max_rpm: 18000, power_kw: 30, torque_Nm: 140, rigidity: "high" },
      "okuma": { name: "Okuma GENOS M560-V", max_rpm: 15000, power_kw: 22, torque_Nm: 170, rigidity: "high" },
    };

    if (name) {
      const lower = name.toLowerCase();
      for (const [key, machine] of Object.entries(machines)) {
        if (lower.includes(key)) {
          return { ...machine, confidence: 0.9 };
        }
      }
    }

    // Default: generic VMC
    return {
      name: name || "Generic VMC",
      max_rpm: 12000,
      power_kw: 15,
      torque_Nm: 100,
      rigidity: "medium",
      confidence: 0.5,
    };
  }

  // ── Speed/Feed Computation ─────────────────────────────────

  /**
   * Compute speed and feed from resolved material, tool, and machine.
   *
   * @param material Resolved material
   * @param tool Resolved tool
   * @param machine Resolved machine
   * @param input Original user input
   * @returns Computed speed/feed with all derived values
   */
  computeSpeedFeed(
    material: MaterialResolution,
    tool: ToolResolution,
    machine: MachineResolution,
    input: AutopilotInput,
  ): SpeedFeedOutput {
    // Surface speed (Vc) from Taylor constants and target life
    const T_target_min = 45; // 45 min tool life target
    const Vc = material.taylor_C * Math.pow(T_target_min, -material.taylor_n);

    // RPM from surface speed
    let rpm = (Vc * 1000) / (Math.PI * tool.diameter_mm);
    rpm = Math.min(rpm, machine.max_rpm);
    rpm = Math.max(rpm, 100);

    // Feed per tooth from operation type
    let fz: number;
    const d = tool.diameter_mm;
    if (input.operation === "finishing") {
      fz = d <= 6 ? 0.03 : d <= 12 ? 0.05 : d <= 25 ? 0.08 : 0.10;
    } else if (input.operation === "slotting") {
      fz = d <= 6 ? 0.02 : d <= 12 ? 0.04 : d <= 25 ? 0.06 : 0.08;
    } else {
      // Roughing / default
      fz = d <= 6 ? 0.04 : d <= 12 ? 0.08 : d <= 25 ? 0.12 : 0.15;
    }

    // Material hardness correction
    if (input.hardness_hrc && input.hardness_hrc > 45) {
      fz *= 0.7; // reduce feed for hardened material
    }

    // Feed rate
    const feed_mm_min = fz * tool.flute_count * rpm;

    // Depth and width of cut
    const ap = input.depth_of_cut_mm ?? (input.operation === "finishing" ? 0.5 : tool.diameter_mm * 0.5);
    const ae = input.width_of_cut_mm ?? (input.operation === "slotting" ? tool.diameter_mm : tool.diameter_mm * 0.4);

    // MRR
    const mrr = (ap * ae * feed_mm_min) / 1000; // cm³/min

    // Cutting force (Kienzle)
    const h_mean = fz * Math.sqrt(ae / tool.diameter_mm);
    const Fc = material.kc1_1 * ap * Math.pow(Math.max(h_mean, 0.01), 1 - material.mc);

    // Power
    const Vc_actual = (Math.PI * tool.diameter_mm * rpm) / 1000;
    const power = (Fc * Vc_actual) / 60000;

    // Limiting factor
    let limiting = "none";
    if (rpm >= machine.max_rpm * 0.95) limiting = "spindle_rpm";
    else if (power >= machine.power_kw * 0.85) limiting = "spindle_power";
    else if (Fc > 5000) limiting = "cutting_force";

    // Power constraint
    if (power > machine.power_kw * 0.9) {
      const reduction = (machine.power_kw * 0.85) / power;
      // Reduce feed to stay within power
      const adjusted_feed = feed_mm_min * reduction;
      const adjusted_mrr = (ap * ae * adjusted_feed) / 1000;
      return {
        rpm: Math.round(rpm),
        feed_mm_min: Math.round(adjusted_feed),
        feed_per_tooth_mm: parseFloat((adjusted_feed / (tool.flute_count * rpm)).toFixed(4)),
        depth_of_cut_mm: ap,
        width_of_cut_mm: ae,
        surface_speed_m_min: parseFloat(Vc_actual.toFixed(1)),
        mrr_cm3_min: parseFloat(adjusted_mrr.toFixed(2)),
        cutting_force_N: Math.round(Fc * reduction),
        power_kW: parseFloat((power * reduction).toFixed(2)),
        confidence: Math.min(material.confidence, tool.confidence, machine.confidence),
        limiting_factor: "spindle_power",
      };
    }

    return {
      rpm: Math.round(rpm),
      feed_mm_min: Math.round(feed_mm_min),
      feed_per_tooth_mm: parseFloat(fz.toFixed(4)),
      depth_of_cut_mm: ap,
      width_of_cut_mm: ae,
      surface_speed_m_min: parseFloat(Vc_actual.toFixed(1)),
      mrr_cm3_min: parseFloat(mrr.toFixed(2)),
      cutting_force_N: Math.round(Fc),
      power_kW: parseFloat(power.toFixed(2)),
      confidence: Math.min(material.confidence, tool.confidence, machine.confidence),
      limiting_factor: limiting,
    };
  }

  // ── Full Autopilot Chain ───────────────────────────────────

  /**
   * Execute the full speed/feed autopilot chain.
   * This is the main entry point — minimal input → full output.
   *
   * @param input User-provided parameters
   * @returns Full autopilot result with all resolutions and recommendations
   */
  run(input: AutopilotInput): AutopilotResult {
    const startTime = Date.now();
    const steps: AutopilotStepResult[] = [];
    const recommendations: string[] = [];

    // Step 1: Resolve material
    const matStart = Date.now();
    const material = this.resolveMaterial(input.material, input.hardness_hrc);
    steps.push({
      step: "resolve_material",
      status: material.confidence >= 0.7 ? "pass" : "warn",
      duration_ms: Date.now() - matStart,
      data: { iso: material.resolved_iso, confidence: material.confidence },
    });
    if (material.confidence < 0.7) {
      recommendations.push(`Material '${input.material}' resolved with low confidence (${material.confidence}). Specify ISO group or SAE grade for better results.`);
    }

    // Step 2: Resolve tool
    const toolStart = Date.now();
    const tool = this.resolveTool(input.tool_diameter_mm, input.flute_count, input.operation);
    steps.push({
      step: "resolve_tool",
      status: tool.confidence >= 0.7 ? "pass" : "warn",
      duration_ms: Date.now() - toolStart,
      data: { type: tool.tool_type, flutes: tool.flute_count },
    });
    if (!input.flute_count) {
      recommendations.push(`Flute count defaulted to ${tool.flute_count}. Specify explicitly for better accuracy.`);
    }

    // Step 3: Resolve machine
    const machStart = Date.now();
    const machine = this.resolveMachine(input.machine_name);
    steps.push({
      step: "resolve_machine",
      status: machine.confidence >= 0.7 ? "pass" : "warn",
      duration_ms: Date.now() - machStart,
      data: { name: machine.name, max_rpm: machine.max_rpm },
    });
    if (!input.machine_name) {
      recommendations.push("No machine specified — using generic VMC defaults. Specify machine for RPM/power-limited accuracy.");
    }

    // Step 4: Compute S/F
    const sfStart = Date.now();
    const output = this.computeSpeedFeed(material, tool, machine, input);
    steps.push({
      step: "compute_speed_feed",
      status: "pass",
      duration_ms: Date.now() - sfStart,
      data: { rpm: output.rpm, feed: output.feed_mm_min, limiting: output.limiting_factor },
    });

    if (output.limiting_factor !== "none") {
      recommendations.push(`Output limited by ${output.limiting_factor}. Consider ${
        output.limiting_factor === "spindle_rpm" ? "a larger tool diameter" :
        output.limiting_factor === "spindle_power" ? "reducing depth/width of cut" :
        "checking tool deflection"
      }.`);
    }

    // Step 5: Safety score
    const safetyStart = Date.now();
    let safety = 1.0;
    if (output.power_kW > machine.power_kw * 0.9) safety -= 0.2;
    if (output.cutting_force_N > 3000) safety -= 0.1;
    if (material.confidence < 0.5) safety -= 0.2;
    if (output.feed_per_tooth_mm > 0.3) safety -= 0.15;
    safety = Math.max(0, Math.min(1, safety));

    steps.push({
      step: "safety_check",
      status: safety >= 0.7 ? "pass" : (safety >= 0.5 ? "warn" : "fail"),
      duration_ms: Date.now() - safetyStart,
      data: { score: safety },
    });

    if (safety < 0.7) {
      recommendations.push(`Safety score ${safety.toFixed(2)} is below threshold. Review parameters before running.`);
    }

    // Overall status
    const failSteps = steps.filter(s => s.status === "fail");
    const warnSteps = steps.filter(s => s.status === "warn");
    const status: AutopilotResult["status"] =
      failSteps.length > 0 ? "failed" :
      warnSteps.length > 0 ? "partial" : "success";

    return {
      chain_id: "speed_feed_autopilot",
      task_class: "speed_feed",
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      status,
      steps,
      material,
      tool,
      machine,
      output,
      safety_score: parseFloat(safety.toFixed(3)),
      recommendations,
    };
  }
}

export const speedFeedAutopilotEngine = new SpeedFeedAutopilotEngine();
