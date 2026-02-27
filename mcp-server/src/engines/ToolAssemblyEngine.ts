/**
 * ToolAssemblyEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Manages tool assemblies: holder + collet/chuck + cutting tool.
 * Calculates overall gauge length, stickout, reach, runout budget,
 * and validates assembly compatibility.
 *
 * Actions: tool_assembly_create, tool_assembly_validate, tool_assembly_reach
 */

// ============================================================================
// TYPES
// ============================================================================

export type HolderType = "ER_collet" | "hydraulic" | "shrink_fit" | "milling_chuck" | "side_lock" | "weldon" | "HSK" | "CAT40" | "BT40";

export interface HolderSpec {
  id: string;
  type: HolderType;
  taper: string;                     // "CAT40", "BT40", "HSK-A63", etc.
  bore_diameter_mm: number;
  max_tool_diameter_mm: number;
  gauge_length_mm: number;           // spindle face to holder nose
  runout_um: number;                 // TIR at holder nose
  max_rpm: number;
  balanced_grade: string;            // "G2.5", "G6.3", etc.
  weight_kg: number;
}

export interface ToolSpec {
  id: string;
  type: string;                      // "end_mill", "drill", "tap", etc.
  shank_diameter_mm: number;
  cutting_diameter_mm: number;
  flute_length_mm: number;
  overall_length_mm: number;
  number_of_flutes: number;
}

export interface ToolAssembly {
  id: string;
  holder: HolderSpec;
  tool: ToolSpec;
  stickout_mm: number;               // tool projection from holder
  total_gauge_length_mm: number;     // spindle face to tool tip
  total_runout_um: number;           // combined holder + tool
  max_safe_rpm: number;
  reach_mm: number;                  // usable depth below holder nose
  overhang_ratio: number;            // stickout / tool diameter
}

export interface AssemblyValidation {
  compatible: boolean;
  issues: string[];
  warnings: string[];
  overhang_ratio: number;
  deflection_at_tip_um: number;
}

export interface ReachAnalysis {
  max_depth_mm: number;
  holder_clearance_mm: number;
  tool_deflection_at_max_um: number;
  recommended_max_depth_mm: number;
}

// ============================================================================
// HOLDER DATABASE
// ============================================================================

const HOLDER_DB: HolderSpec[] = [
  { id: "ER32-CAT40-70", type: "ER_collet", taper: "CAT40", bore_diameter_mm: 20, max_tool_diameter_mm: 20, gauge_length_mm: 70, runout_um: 5, max_rpm: 15000, balanced_grade: "G6.3", weight_kg: 1.8 },
  { id: "ER16-CAT40-60", type: "ER_collet", taper: "CAT40", bore_diameter_mm: 10, max_tool_diameter_mm: 10, gauge_length_mm: 60, runout_um: 5, max_rpm: 20000, balanced_grade: "G6.3", weight_kg: 1.2 },
  { id: "HYD-CAT40-80", type: "hydraulic", taper: "CAT40", bore_diameter_mm: 20, max_tool_diameter_mm: 20, gauge_length_mm: 80, runout_um: 3, max_rpm: 25000, balanced_grade: "G2.5", weight_kg: 2.1 },
  { id: "SF-HSK63-90", type: "shrink_fit", taper: "HSK-A63", bore_diameter_mm: 20, max_tool_diameter_mm: 20, gauge_length_mm: 90, runout_um: 2, max_rpm: 30000, balanced_grade: "G2.5", weight_kg: 1.5 },
  { id: "MC-BT40-65", type: "milling_chuck", taper: "BT40", bore_diameter_mm: 25, max_tool_diameter_mm: 25, gauge_length_mm: 65, runout_um: 8, max_rpm: 12000, balanced_grade: "G6.3", weight_kg: 2.0 },
  { id: "WEL-CAT40-75", type: "weldon", taper: "CAT40", bore_diameter_mm: 20, max_tool_diameter_mm: 20, gauge_length_mm: 75, runout_um: 10, max_rpm: 10000, balanced_grade: "G6.3", weight_kg: 1.9 },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ToolAssemblyEngine {
  assemble(holder: HolderSpec, tool: ToolSpec, stickout_mm?: number): ToolAssembly {
    const stickout = stickout_mm || (tool.overall_length_mm - tool.flute_length_mm * 0.5);
    const totalGauge = holder.gauge_length_mm + stickout;
    const totalRunout = holder.runout_um + (stickout / 50); // runout grows with stickout
    const maxRPM = Math.min(holder.max_rpm, 40000); // cap at 40k
    const reach = stickout - 5; // 5mm minimum grip
    const overhang = stickout / tool.cutting_diameter_mm;

    return {
      id: `ASM-${holder.id}-${tool.id}`,
      holder,
      tool,
      stickout_mm: Math.round(stickout * 10) / 10,
      total_gauge_length_mm: Math.round(totalGauge * 10) / 10,
      total_runout_um: Math.round(totalRunout * 10) / 10,
      max_safe_rpm: maxRPM,
      reach_mm: Math.round(reach * 10) / 10,
      overhang_ratio: Math.round(overhang * 100) / 100,
    };
  }

  validate(assembly: ToolAssembly): AssemblyValidation {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Shank must fit holder bore
    if (assembly.tool.shank_diameter_mm > assembly.holder.bore_diameter_mm) {
      issues.push(`Tool shank ${assembly.tool.shank_diameter_mm}mm exceeds holder bore ${assembly.holder.bore_diameter_mm}mm`);
    }

    // Tool diameter must be within holder spec
    if (assembly.tool.cutting_diameter_mm > assembly.holder.max_tool_diameter_mm * 1.5) {
      warnings.push("Cutting diameter significantly exceeds holder spec — verify clearance");
    }

    // Overhang ratio
    if (assembly.overhang_ratio > 5) {
      issues.push(`Overhang ratio ${assembly.overhang_ratio} exceeds safe limit of 5:1 — excessive deflection`);
    } else if (assembly.overhang_ratio > 3.5) {
      warnings.push(`Overhang ratio ${assembly.overhang_ratio} — reduce speed/feed to limit deflection`);
    }

    // Runout budget
    if (assembly.total_runout_um > 15) {
      warnings.push(`Total runout ${assembly.total_runout_um}µm — poor surface finish expected`);
    }

    // Deflection estimate (cantilever beam)
    const E = 600000; // carbide MPa (conservative)
    const d = assembly.tool.cutting_diameter_mm;
    const I = (Math.PI * d * d * d * d) / 64;
    const F = 500; // N nominal cutting force
    const L = assembly.stickout_mm;
    const deflection = (F * L * L * L) / (3 * E * I) * 1000; // µm

    if (deflection > 50) {
      warnings.push(`Predicted deflection ${deflection.toFixed(1)}µm at tool tip — may cause dimensional error`);
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings,
      overhang_ratio: assembly.overhang_ratio,
      deflection_at_tip_um: Math.round(deflection * 10) / 10,
    };
  }

  reach(assembly: ToolAssembly, holderDiameter_mm: number = 50): ReachAnalysis {
    const maxDepth = assembly.stickout_mm - 3; // 3mm minimum grip
    const holderClearance = (holderDiameter_mm - assembly.tool.cutting_diameter_mm) / 2;

    // Deflection at max depth
    const E = 600000;
    const d = assembly.tool.cutting_diameter_mm;
    const I = (Math.PI * d * d * d * d) / 64;
    const F = 500;
    const deflMaxDepth = (F * maxDepth * maxDepth * maxDepth) / (3 * E * I) * 1000;

    // Recommended max: where deflection stays under 25µm
    const maxDeflection = 25; // µm
    const recMaxDepth = Math.pow((maxDeflection * 3 * E * I) / (F * 1000), 1 / 3);

    return {
      max_depth_mm: Math.round(maxDepth * 10) / 10,
      holder_clearance_mm: Math.round(holderClearance * 10) / 10,
      tool_deflection_at_max_um: Math.round(deflMaxDepth * 10) / 10,
      recommended_max_depth_mm: Math.round(Math.min(recMaxDepth, maxDepth) * 10) / 10,
    };
  }

  listHolders(taper?: string): HolderSpec[] {
    if (taper) return HOLDER_DB.filter(h => h.taper === taper);
    return [...HOLDER_DB];
  }
}

export const toolAssemblyEngine = new ToolAssemblyEngine();
