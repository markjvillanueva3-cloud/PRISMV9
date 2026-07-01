/**
 * ToolSelectionEngine — Manufacturing Intelligence Layer
 *
 * Recommends optimal cutting tools for given operations, materials, and features.
 * Bridges ToolCatalogEngine (46K+ real tools) with scoring/physics for intelligent selection.
 *
 * Actions: tool_recommend, tool_compare, tool_validate, tool_alternatives
 */

import type { CatalogTool } from "./ToolCatalogEngine.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import { toolCatalogEngine } from "./ToolCatalogEngine.js";
import { toolService } from "../services/ToolService.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolRequirements {
  material_iso_group?: string;       // P, M, K, N, S, H
  material_name?: string;
  operation_type: string;            // face_mill, pocket, drill, turn, thread, etc.
  feature_diameter_mm?: number;      // hole diameter, pocket width, etc.
  feature_depth_mm?: number;
  surface_finish_Ra?: number;        // required Ra in µm
  tolerance_mm?: number;             // dimensional tolerance
  machine_spindle_taper?: string;    // BT40, CAT40, HSK-A63, etc.
  max_rpm?: number;
  rigidity?: "high" | "medium" | "low";
  batch_size?: number;               // influences insert vs solid
  coolant_available?: boolean;
}

/** Tool Recommendation configuration/data structure.
 */
export interface ToolRecommendation {
  tool_id: string;
  tool_type: string;
  diameter_mm: number;
  description: string;
  score: number;                     // 0–100
  rationale: string[];
  warnings: string[];
  estimated_tool_life_min: number;
  recommended_speed_mpm: number;
  recommended_feed_mmpt: number;
  coating: string;
  substrate: string;
  cost_category: "economy" | "standard" | "premium";
}

/** Tool Comparison Result configuration/data structure.
 */
export interface ToolComparisonResult {
  tools: ToolRecommendation[];
  winner: string;
  comparison_matrix: Record<string, Record<string, number>>;
  decision_factors: string[];
}

/** Tool Validation Result configuration/data structure.
 */
export interface ToolValidationResult {
  valid: boolean;
  tool_id: string;
  issues: string[];
  overhang_ratio: number;
  deflection_mm: number;
  max_deflection_mm: number;
  speed_within_range: boolean;
  coating_compatible: boolean;
}

// ============================================================================
// SELECTION LOGIC
// ============================================================================

const OPERATION_TOOL_MAP: Record<string, { types: string[]; min_flutes: number; preferred_coating: string }> = {
  face_mill: { types: ["face_mill", "shell_mill"], min_flutes: 4, preferred_coating: "TiAlN" },
  pocket: { types: ["end_mill", "carbide_end_mill"], min_flutes: 3, preferred_coating: "AlTiN" },
  slot: { types: ["end_mill", "slot_mill"], min_flutes: 2, preferred_coating: "TiAlN" },
  drill: { types: ["drill", "carbide_drill", "indexable_drill"], min_flutes: 2, preferred_coating: "TiN" },
  ream: { types: ["reamer"], min_flutes: 4, preferred_coating: "TiN" },
  bore: { types: ["boring_bar", "boring_head"], min_flutes: 1, preferred_coating: "TiCN" },
  thread_mill: { types: ["thread_mill"], min_flutes: 1, preferred_coating: "TiCN" },
  turn: { types: ["turning_insert", "boring_bar"], min_flutes: 1, preferred_coating: "CVD" },
  profile: { types: ["ball_mill", "end_mill"], min_flutes: 2, preferred_coating: "AlCrN" },
  chamfer: { types: ["chamfer_mill", "countersink"], min_flutes: 2, preferred_coating: "TiN" },
  finish: { types: ["ball_mill", "end_mill"], min_flutes: 4, preferred_coating: "AlCrN" },
};

/** ISO material group base cutting speeds (m/min) for carbide */
const ISO_BASE_SPEEDS: Record<string, number> = {
  P: 250, M: 120, K: 200, N: 600, S: 45, H: 80,
};

/** Tool life estimation: Taylor equation base constants by ISO group */
const TAYLOR_N: Record<string, number> = {
  P: 0.25, M: 0.20, K: 0.25, N: 0.30, S: 0.15, H: 0.20,
};

function estimateToolLife(isoGroup: string, speed_mpm: number, feed_mmpt: number): number {
  const n = TAYLOR_N[isoGroup] || 0.25;
  const baseSpeed = ISO_BASE_SPEEDS[isoGroup] || 200;
  const C = baseSpeed * Math.pow(60, n); // Taylor C constant for 60-min base life
  const speedRatio = speed_mpm / baseSpeed;
  const feedFactor = Math.max(0.3, 1.0 - (feed_mmpt - 0.10) * 2);
  const life = 60 * Math.pow(1 / speedRatio, 1 / n) * feedFactor;
  return Math.max(5, Math.min(300, Math.round(life)));
}

function calculateDeflection(diameter_mm: number, overhang_mm: number, force_N: number): number {
  // Cantilever beam: δ = F·L³ / (3·E·I)
  const E = 600000; // MPa for carbide
  const I = (Math.PI * Math.pow(diameter_mm, 4)) / 64;
  return (force_N * Math.pow(overhang_mm, 3)) / (3 * E * I);
}

function scoreTool(
  diameter: number, flutes: number, coating: string,
  req: ToolRequirements, isoGroup: string
): { score: number; rationale: string[]; warnings: string[] } {
  let score = 50;
  const rationale: string[] = [];
  const warnings: string[] = [];

  // Diameter match
  if (req.feature_diameter_mm) {
    const ratio = diameter / req.feature_diameter_mm;
    if (ratio >= 0.6 && ratio <= 0.8) { score += 15; rationale.push("Optimal diameter ratio for operation"); }
    else if (ratio >= 0.4 && ratio <= 1.0) { score += 5; }
    else { score -= 10; warnings.push(`Diameter ratio ${ratio.toFixed(2)} outside optimal range`); }
  }

  // Flute count
  const opMap = OPERATION_TOOL_MAP[req.operation_type];
  if (opMap && flutes >= opMap.min_flutes) { score += 10; rationale.push(`Sufficient flute count (${flutes})`); }
  else if (opMap) { score -= 5; warnings.push(`Low flute count for ${req.operation_type}`); }

  // Coating compatibility
  const coatingMatch = opMap?.preferred_coating === coating;
  if (coatingMatch) { score += 10; rationale.push(`Preferred coating ${coating}`); }

  // ISO group speed adjustment
  if (isoGroup === "S" || isoGroup === "H") { score += 5; rationale.push("Suitable for difficult materials"); }

  // Surface finish preference
  if (req.surface_finish_Ra && req.surface_finish_Ra < 0.8 && flutes >= 4) {
    score += 10; rationale.push("High flute count supports fine finish");
  }

  // Depth/overhang check
  if (req.feature_depth_mm && diameter > 0) {
    const overhangRatio = req.feature_depth_mm / diameter;
    if (overhangRatio > 4) { score -= 15; warnings.push(`High overhang ratio ${overhangRatio.toFixed(1)}:1 — deflection risk`); }
    else if (overhangRatio > 3) { score -= 5; warnings.push("Moderate overhang ratio"); }
    else { score += 5; rationale.push("Low overhang ratio — rigid setup"); }
  }

  return { score: Math.max(0, Math.min(100, score)), rationale, warnings };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Tool Selection Engine engine/manager.
 */
export class ToolSelectionEngine {
  recommend(req: ToolRequirements): ToolRecommendation[] {
    const isoGroup = req.material_iso_group || "P";
    const opMap = OPERATION_TOOL_MAP[req.operation_type] || OPERATION_TOOL_MAP["pocket"];

    const candidates = this.generateCandidates(req, isoGroup, opMap);
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 5);

    const features = [req.operation_type];
    const pbResult = machiningPlaybookEngine.advise({
      material_iso: isoGroup,
      features,
      tolerance_mm: req.tolerance_mm,
      surface_finish_Ra: req.surface_finish_Ra,
      categories: ["tool_selection", "material_tip"],
      operation_type: req.operation_type,
      ...(req.max_rpm != null ? { spindle_rpm: req.max_rpm } : {}),
    });
    for (const rec of top) {
      for (const rule of pbResult.rules) {
        if (rule.severity === "critical" || rule.severity === "important") {
          rec.warnings.push(`[${rule.id}] ${rule.title}: ${rule.rule.substring(0, 200)}`);
        }
      }
    }

    return top;
  }

  /** Compare.
   * @param toolIds - tool ids
   * @param req - req
   * @returns tool comparison result
   */
  compare(toolIds: string[], req: ToolRequirements): ToolComparisonResult {
    const isoGroup = req.material_iso_group || "P";
    const opMap = OPERATION_TOOL_MAP[req.operation_type] || OPERATION_TOOL_MAP["pocket"];
    const tools: ToolRecommendation[] = [];
    const matrix: Record<string, Record<string, number>> = {};

    /** For.
     * @param const - const
     * @returns void
     */
    for (const id of toolIds) {
      const diameter = this.extractDiameter(id);
      const flutes = this.extractFlutes(id);
      const coating = opMap.preferred_coating;
      const { score, rationale, warnings } = scoreTool(diameter, flutes, coating, req, isoGroup);
      const baseSpeed = (ISO_BASE_SPEEDS[isoGroup] || 200) * 0.9;
      const baseFeed = isoGroup === "S" ? 0.05 : 0.12;

      const rec: ToolRecommendation = {
        tool_id: id, tool_type: opMap.types[0], diameter_mm: diameter,
        description: `${diameter}mm ${opMap.types[0]} ${flutes}F ${coating}`,
        score, rationale, warnings,
        estimated_tool_life_min: estimateToolLife(isoGroup, baseSpeed, baseFeed),
        recommended_speed_mpm: Math.round(baseSpeed),
        recommended_feed_mmpt: Math.round(baseFeed * 1000) / 1000,
        coating, substrate: "carbide",
        cost_category: diameter > 20 ? "premium" : diameter > 10 ? "standard" : "economy",
      };
      tools.push(rec);
      matrix[id] = { score, tool_life: rec.estimated_tool_life_min, speed: rec.recommended_speed_mpm, diameter };
    }

    const winner = tools.reduce((best, t) => t.score > best.score ? t : best, tools[0]);
    return {
      tools, winner: winner.tool_id, comparison_matrix: matrix,
      decision_factors: ["score", "tool_life", "speed", "diameter"],
    };
  }

  /** Validate.
   * @param toolId - tool id
   * @param req - req
   * @returns tool validation result
   */
  validate(toolId: string, req: ToolRequirements): ToolValidationResult {
    const diameter = this.extractDiameter(toolId);
    const depth = req.feature_depth_mm || 10;
    const overhang = depth * 1.5;
    const force = 500; // typical cutting force N
    const deflection = calculateDeflection(diameter, overhang, force);
    const maxDeflection = req.tolerance_mm ? req.tolerance_mm * 0.25 : 0.02;
    const overhangRatio = overhang / Math.max(diameter, 1);
    const isoGroup = req.material_iso_group || "P";
    const baseSpeed = ISO_BASE_SPEEDS[isoGroup] || 200;

    const issues: string[] = [];
    if (deflection > maxDeflection) issues.push(`Deflection ${deflection.toFixed(4)}mm exceeds limit ${maxDeflection.toFixed(4)}mm`);
    if (overhangRatio > 5) issues.push(`Overhang ratio ${overhangRatio.toFixed(1)}:1 too high`);
    /** If.
     * @param req.max_rpm - req.max_rpm
     * @returns void
     */
    if (req.max_rpm && diameter > 0) {
      const achievableSpeed = (Math.PI * diameter * req.max_rpm) / 1000;
      if (achievableSpeed < baseSpeed * 0.5) issues.push("Machine RPM insufficient for recommended speed");
    }

    return {
      valid: issues.length === 0, tool_id: toolId, issues,
      overhang_ratio: Math.round(overhangRatio * 100) / 100,
      deflection_mm: Math.round(deflection * 10000) / 10000,
      max_deflection_mm: maxDeflection,
      speed_within_range: true, coating_compatible: true,
    };
  }

  /** Alternatives.
   * @param toolId - tool id
   * @param req - req
   * @returns tool recommendation[]
   */
  alternatives(toolId: string, req: ToolRequirements): ToolRecommendation[] {
    const recs = this.recommend(req);
    return recs.filter(r => r.tool_id !== toolId);
  }

  private generateCandidates(req: ToolRequirements, isoGroup: string, opMap: { types: string[]; min_flutes: number; preferred_coating: string }): ToolRecommendation[] {
    // Try real catalog tools first via ToolCatalogEngine
    const catalogResults = this.queryCatalog(req, isoGroup, opMap);

    // U-REG5: Supplement with ToolRegistry (500+ indexed tools) if catalog is thin
    let registryResults: ToolRecommendation[] = [];
    if (catalogResults.length < 3) {
      if (toolService.getCount() > 0) {
        const foundTools = toolService.search({
          type: opMap.types[0],
          isoGroup,
          limit: 10,
        });
        if (Array.isArray(foundTools)) {
          const catalogIds = new Set(catalogResults.map(r => r.tool_id));
          registryResults = foundTools
            .filter((t: any) => t.id && !catalogIds.has(t.id))
            .slice(0, 5)
            .map((t: any) => {
              const d = t.diameter_mm || t.cutting_diameter_mm || 10;
              const flutes = t.flute_count || opMap.min_flutes;
              const coating = t.coating || opMap.preferred_coating;
              const { score, rationale, warnings } = scoreTool(d, flutes, coating, req, isoGroup);
              rationale.push(`Registry tool: ${t.manufacturer || "unknown"} ${t.name || t.id}`);
              return {
                tool_id: t.id, tool_type: t.type || opMap.types[0], diameter_mm: d,
                description: `${t.manufacturer || "Registry"} ${t.name || t.id} — ${d}mm ${flutes}F ${coating}`,
                score: Math.min(100, score + 5), rationale, warnings,
                estimated_tool_life_min: estimateToolLife(isoGroup, ISO_BASE_SPEEDS[isoGroup] || 200, 0.1),
                recommended_speed_mpm: ISO_BASE_SPEEDS[isoGroup] || 200,
                recommended_feed_mmpt: 0.1,
                coating, substrate: t.material || "carbide",
                cost_category: "standard" as const,
              } as ToolRecommendation;
            });
        }
      }
    }

    const combined = [...catalogResults, ...registryResults];
    if (combined.length >= 3) return combined;

    // Fall back to synthetic candidates if catalog + registry have too few matches
    const synthetic = this.generateSyntheticCandidates(req, isoGroup, opMap);
    return [...combined, ...synthetic];
  }

  private queryCatalog(req: ToolRequirements, isoGroup: string, opMap: { types: string[]; min_flutes: number; preferred_coating: string }): ToolRecommendation[] {
    const catalogTools: CatalogTool[] = toolCatalogEngine.search({
      type: opMap.types[0],
      diameter_mm: req.feature_diameter_mm,
      diameter_range: req.feature_diameter_mm
        ? [req.feature_diameter_mm * 0.4, req.feature_diameter_mm * 1.2] as [number, number]
        : undefined,
      iso_group: isoGroup,
      operation: req.operation_type,
      max_results: 20,
    });

    return catalogTools.map(ct => {
      const d = ct.physical.cutting_diameter_mm;
      const flutes = ct.flute_count || opMap.min_flutes;
      const coating = ct.coating || opMap.preferred_coating;
      const { score, rationale, warnings } = scoreTool(d, flutes, coating, req, isoGroup);

      // Use catalog cutting data if available
      const cutData = ct.cutting_data?.[isoGroup];
      const baseSpeed = cutData ? (cutData.vc_min + cutData.vc_max) / 2 : (ISO_BASE_SPEEDS[isoGroup] || 200);
      const baseFeed = cutData ? (cutData.fz_min + cutData.fz_max) / 2 : ((isoGroup === "S" || isoGroup === "H") ? 0.05 : 0.12);

      // Boost score for real catalog tools with cutting data
      let adjustedScore = score;
      if (cutData) { adjustedScore += 10; rationale.push("Manufacturer-verified cutting data"); }
      rationale.push(`Real tool: ${ct.manufacturer} ${ct.designation}`);

      return {
        tool_id: ct.id, tool_type: ct.type, diameter_mm: d,
        description: `${ct.manufacturer} ${ct.designation} — ${d}mm ${ct.type} ${flutes}F ${coating}`,
        score: Math.min(100, adjustedScore), rationale, warnings,
        estimated_tool_life_min: estimateToolLife(isoGroup, baseSpeed, baseFeed),
        recommended_speed_mpm: Math.round(baseSpeed),
        recommended_feed_mmpt: Math.round(baseFeed * 1000) / 1000,
        coating, substrate: ct.material || "carbide",
        cost_category: ct.price_usd ? (ct.price_usd > 100 ? "premium" : ct.price_usd > 30 ? "standard" : "economy") : (d > 20 ? "premium" : d > 10 ? "standard" : "economy"),
      } as ToolRecommendation;
    });
  }

  private generateSyntheticCandidates(req: ToolRequirements, isoGroup: string, opMap: { types: string[]; min_flutes: number; preferred_coating: string }): ToolRecommendation[] {
    const diameters = req.feature_diameter_mm
      ? [req.feature_diameter_mm * 0.5, req.feature_diameter_mm * 0.65, req.feature_diameter_mm * 0.8, req.feature_diameter_mm, req.feature_diameter_mm * 1.2]
      : [6, 8, 10, 12, 16, 20, 25];
    const fluteCounts = [2, 3, 4, 5, 6].filter(f => f >= opMap.min_flutes);
    const coatings = [opMap.preferred_coating, "TiAlN", "AlCrN", "TiN", "DLC"];
    const results: ToolRecommendation[] = [];

    for (const d of diameters) {
      for (const f of fluteCounts.slice(0, 2)) {
        for (const c of coatings.slice(0, 2)) {
          const { score, rationale, warnings } = scoreTool(d, f, c, req, isoGroup);
          const baseSpeed = (ISO_BASE_SPEEDS[isoGroup] || 200) * (c === opMap.preferred_coating ? 1.0 : 0.85);
          const baseFeed = (isoGroup === "S" || isoGroup === "H") ? 0.05 : 0.12;
          const id = `${opMap.types[0]}_${Math.round(d)}mm_${f}F_${c}`;

          results.push({
            tool_id: id, tool_type: opMap.types[0], diameter_mm: Math.round(d * 100) / 100,
            description: `${Math.round(d)}mm ${opMap.types[0]} ${f}-flute ${c}`,
            score, rationale, warnings,
            estimated_tool_life_min: estimateToolLife(isoGroup, baseSpeed, baseFeed),
            recommended_speed_mpm: Math.round(baseSpeed),
            recommended_feed_mmpt: Math.round(baseFeed * 1000) / 1000,
            coating: c, substrate: "carbide",
            cost_category: d > 20 ? "premium" : d > 10 ? "standard" : "economy",
          });
        }
      }
    }
    return results;
  }

  private extractDiameter(toolId: string): number {
    const m = toolId.match(/(\d+(?:\.\d+)?)\s*mm/i);
    return m ? parseFloat(m[1]) : 10;
  }

  private extractFlutes(toolId: string): number {
    const m = toolId.match(/(\d+)\s*[Ff]/);
    return m ? parseInt(m[1]) : 4;
  }
}

/** Tool Selection Engine constant.
 */
export const toolSelectionEngine = new ToolSelectionEngine();
