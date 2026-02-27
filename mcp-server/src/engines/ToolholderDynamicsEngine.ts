/**
 * ToolholderDynamicsEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Models dynamic stiffness and frequency response of toolholder assemblies.
 * Combines spindle, toolholder, and tool dynamics using receptance coupling
 * substructure analysis (RCSA) concepts.
 *
 * Critical for predicting chatter stability — the toolholder is often
 * the weakest link in the dynamic chain.
 *
 * Actions: toolholder_frf, toolholder_compare, toolholder_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type ToolholderType =
  | "collet_ER" | "shrink_fit" | "hydraulic" | "milling_chuck"
  | "weldon" | "whistle_notch" | "heat_shrink" | "press_fit";

export type ToolholderTaper = "BT30" | "BT40" | "BT50" | "HSK-A63" | "HSK-A100" | "CAT40" | "CAT50";

export interface ToolholderInput {
  holder_type: ToolholderType;
  taper: ToolholderTaper;
  gauge_length_mm: number;          // gage line to tool tip
  holder_diameter_mm: number;       // body OD
  tool_diameter_mm: number;
  tool_stickout_mm: number;         // from holder face to tip
  tool_material: "carbide" | "HSS" | "ceramic";
  holder_material?: "steel" | "carbide";
  clamping_force_N?: number;
}

export interface ToolholderFRF {
  natural_freq_Hz: number;          // dominant mode
  static_stiffness_N_per_um: number;
  dynamic_stiffness_N_per_um: number;
  damping_ratio: number;
  overhang_ratio: number;           // L/D ratio
  modes: { freq_Hz: number; amplitude_relative: number; description: string }[];
  recommendations: string[];
}

export interface ToolholderComparison {
  holder_a: { type: ToolholderType; stiffness_N_per_um: number; natural_freq_Hz: number };
  holder_b: { type: ToolholderType; stiffness_N_per_um: number; natural_freq_Hz: number };
  stiffness_ratio: number;
  recommended: "A" | "B";
  reason: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Holder type stiffness multiplier (relative to collet ER = 1.0)
const HOLDER_STIFFNESS: Record<ToolholderType, number> = {
  shrink_fit: 1.8,       // best stiffness
  hydraulic: 1.5,
  heat_shrink: 1.8,
  press_fit: 1.6,
  milling_chuck: 1.3,
  collet_ER: 1.0,
  weldon: 0.9,
  whistle_notch: 0.85,
};

// Holder type damping (higher = better chatter suppression)
const HOLDER_DAMPING: Record<ToolholderType, number> = {
  shrink_fit: 0.015,
  hydraulic: 0.035,     // best damping (hydraulic fluid)
  heat_shrink: 0.015,
  press_fit: 0.018,
  milling_chuck: 0.025,
  collet_ER: 0.020,
  weldon: 0.022,
  whistle_notch: 0.020,
};

// Taper stiffness factor (spindle interface)
const TAPER_STIFFNESS: Record<ToolholderTaper, number> = {
  "BT30": 0.5, "BT40": 0.8, "BT50": 1.0,
  "HSK-A63": 1.2, "HSK-A100": 1.5,
  "CAT40": 0.75, "CAT50": 0.95,
};

// Tool material E modulus (GPa)
const TOOL_E: Record<string, number> = {
  carbide: 620, HSS: 210, ceramic: 350,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ToolholderDynamicsEngine {
  analyzeFRF(input: ToolholderInput): ToolholderFRF {
    const holderStiff = HOLDER_STIFFNESS[input.holder_type] || 1.0;
    const holderDamp = HOLDER_DAMPING[input.holder_type] || 0.02;
    const taperStiff = TAPER_STIFFNESS[input.taper] || 0.8;
    const toolE = TOOL_E[input.tool_material] || 210;

    // Overhang ratio
    const overhangRatio = input.tool_stickout_mm / input.tool_diameter_mm;

    // Tool beam stiffness: k = 3EI/L^3
    const d = input.tool_diameter_mm / 1000;  // meters
    const L = input.tool_stickout_mm / 1000;
    const I = (Math.PI * d ** 4) / 64;
    const E = toolE * 1e9;
    const toolStiffness = (3 * E * I) / (L ** 3); // N/m
    const toolStiffness_N_um = toolStiffness / 1e6;

    // Combined static stiffness (springs in series)
    const holderBase_N_um = 50 * holderStiff * taperStiff * (input.holder_diameter_mm / 40) ** 2;
    const combinedStiffness = 1 / (1 / toolStiffness_N_um + 1 / holderBase_N_um);

    // Natural frequency of cantilevered tool
    const rho = input.tool_material === "carbide" ? 14500
      : input.tool_material === "ceramic" ? 3900
      : 7800;
    const A = (Math.PI * d ** 2) / 4;
    const lambda1 = 3.516; // first cantilever mode
    const fn = (lambda1 / (2 * Math.PI * L ** 2)) * Math.sqrt((E * I) / (rho * A));

    // Dynamic stiffness at resonance: k_dynamic = k_static * 2 * zeta
    // (inverse of magnification at resonance)
    const dampingRatio = holderDamp + (overhangRatio > 5 ? -0.005 : 0.005);
    const dynamicStiffness = combinedStiffness * 2 * dampingRatio;

    // Higher modes (approximate)
    const modes = [
      { freq_Hz: Math.round(fn), amplitude_relative: 1.0, description: "1st bending mode (dominant)" },
      { freq_Hz: Math.round(fn * 6.27), amplitude_relative: 0.15, description: "2nd bending mode" },
      { freq_Hz: Math.round(fn * 17.5), amplitude_relative: 0.03, description: "3rd bending mode" },
    ];

    // Recommendations
    const recs: string[] = [];
    if (overhangRatio > 5) {
      recs.push(`Overhang ratio ${overhangRatio.toFixed(1)}:1 is high — consider shorter tool or shrink-fit holder`);
    }
    if (combinedStiffness < 10) {
      recs.push("Very low static stiffness — expect surface finish issues and chatter risk");
    }
    if (input.holder_type === "collet_ER" || input.holder_type === "weldon") {
      recs.push("Upgrade to shrink-fit or hydraulic holder for better dynamic performance");
    }
    if (fn < 500) {
      recs.push(`Low natural frequency (${Math.round(fn)} Hz) — limits stable cutting speed range`);
    }
    if (recs.length === 0) {
      recs.push("Toolholder dynamics acceptable for standard operations");
    }

    return {
      natural_freq_Hz: Math.round(fn * 10) / 10,
      static_stiffness_N_per_um: Math.round(combinedStiffness * 100) / 100,
      dynamic_stiffness_N_per_um: Math.round(dynamicStiffness * 100) / 100,
      damping_ratio: Math.round(dampingRatio * 10000) / 10000,
      overhang_ratio: Math.round(overhangRatio * 10) / 10,
      modes,
      recommendations: recs,
    };
  }

  compare(inputA: ToolholderInput, inputB: ToolholderInput): ToolholderComparison {
    const a = this.analyzeFRF(inputA);
    const b = this.analyzeFRF(inputB);
    const ratio = a.static_stiffness_N_per_um / b.static_stiffness_N_per_um;

    const recommended: "A" | "B" = a.dynamic_stiffness_N_per_um >= b.dynamic_stiffness_N_per_um ? "A" : "B";
    const reason = recommended === "A"
      ? `Holder A (${inputA.holder_type}) has ${(ratio).toFixed(1)}x stiffness ratio and better dynamic performance`
      : `Holder B (${inputB.holder_type}) has ${(1 / ratio).toFixed(1)}x stiffness ratio and better dynamic performance`;

    return {
      holder_a: { type: inputA.holder_type, stiffness_N_per_um: a.static_stiffness_N_per_um, natural_freq_Hz: a.natural_freq_Hz },
      holder_b: { type: inputB.holder_type, stiffness_N_per_um: b.static_stiffness_N_per_um, natural_freq_Hz: b.natural_freq_Hz },
      stiffness_ratio: Math.round(ratio * 100) / 100,
      recommended,
      reason,
    };
  }
}

export const toolholderDynamicsEngine = new ToolholderDynamicsEngine();
