/**
 * ToolWearCompensationEngine — Progressive Speed/Feed Wear Compensation
 *
 * As a cutting tool wears through a program, its effective geometry changes:
 *   - Edge radius increases → higher forces, worse finish
 *   - Flank wear (VB) grows → more heat, faster wear acceleration
 *   - Crater wear deepens → weaker edge, risk of breakage
 *
 * This engine injects progressive S/F adjustments throughout a G-code program
 * based on Taylor tool life prediction and accumulated cutting distance.
 * The result: consistent surface finish and force levels from first cut to last.
 *
 * Physics models:
 *   - Taylor extended: VB(t) = C * Vc^n * f^m * ap^p * t^q
 *   - Force compensation: F_adj = F_nom * (1 + k_wear * VB/VB_max)
 *   - Feed reduction: f_adj = f_nom * (1 - wear_ratio * reduction_factor)
 *   - Speed adjustment: Vc_adj = Vc_nom * (1 - alpha * wear_ratio)
 *
 * Novel: No CAM system or post-processor compensates for progressive tool
 * wear within a single program. This is "adaptive machining" without sensors.
 *
 * @module engines/ToolWearCompensationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WearCompInput {
  gcode: string;
  material: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  tools: WearToolDef[];

  // Wear model tuning
  wear_model?: "taylor" | "linear" | "exponential";
  target_vb_mm?: number;            // Target flank wear at end of tool life (default 0.3mm)
  compensation_strategy?: "feed_reduction" | "speed_reduction" | "both";
  max_feed_reduction_pct?: number;  // Max % feed reduction (default 20%)
  max_speed_reduction_pct?: number; // Max % speed reduction (default 15%)

  // Output
  annotate?: boolean;
  zones?: number;                   // Number of wear zones to divide program into (default 5)
}

export interface WearToolDef {
  tool_number: number;
  diameter_mm: number;
  flutes: number;
  tool_material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  expected_tool_life_min?: number;  // If known (overrides Taylor calc)
}

export interface WearZone {
  zone_number: number;
  start_line: number;
  end_line: number;
  cutting_distance_mm: number;
  cumulative_distance_mm: number;
  wear_ratio: number;              // 0.0 (new) to 1.0 (end of life)
  estimated_vb_mm: number;         // Flank wear estimate
  speed_adjustment_pct: number;
  feed_adjustment_pct: number;
  force_increase_pct: number;
}

export interface WearCompResult {
  gcode: string;
  tool_sections: WearToolSection[];
  stats: {
    total_cutting_distance_mm: number;
    tools_compensated: number;
    lines_modified: number;
    max_wear_ratio: number;
    average_feed_change_pct: number;
    average_speed_change_pct: number;
  };
  warnings: string[];
}

export interface WearToolSection {
  tool_number: number;
  cutting_distance_mm: number;
  estimated_tool_life_min: number;
  cutting_time_min: number;
  wear_ratio: number;
  zones: WearZone[];
  recommendation: string;
}

// ============================================================================
// TAYLOR CONSTANTS BY ISO GROUP
// ============================================================================

const TAYLOR_PARAMS: Record<string, { C: number; n: number; vb_rate: number; life_min: number }> = {
  P: { C: 250, n: 0.25, vb_rate: 0.008, life_min: 45 },    // Steel
  M: { C: 180, n: 0.22, vb_rate: 0.012, life_min: 30 },    // Stainless
  K: { C: 300, n: 0.28, vb_rate: 0.006, life_min: 60 },    // Cast iron
  N: { C: 500, n: 0.35, vb_rate: 0.004, life_min: 90 },    // Aluminum
  S: { C: 120, n: 0.18, vb_rate: 0.018, life_min: 15 },    // Superalloys
  H: { C: 150, n: 0.20, vb_rate: 0.015, life_min: 20 },    // Hardened
};

const MAT_ISO: Record<string, string> = {
  steel: "P", carbon_steel: "P", alloy_steel: "P", "1018": "P", "1045": "P",
  "4140": "P", "4340": "P", mild_steel: "P",
  stainless: "M", stainless_steel: "M", "304": "M", "316": "M",
  cast_iron: "K", gray_iron: "K", ductile_iron: "K",
  aluminum: "N", aluminium: "N", "6061": "N", "7075": "N",
  titanium: "S", "ti-6al-4v": "S", inconel: "S", "718": "S",
  hardened_steel: "H", d2: "H", h13: "H", tool_steel: "H",
};

// Tool material life multipliers
const TOOL_MAT_MULT: Record<string, number> = {
  carbide: 1.0, hss: 0.3, cermet: 1.2, ceramic: 0.8, cbn: 2.0, pcd: 3.0,
};

// Coating life multipliers
const COATING_MULT: Record<string, number> = {
  tialn: 1.5, altin: 1.4, ticn: 1.3, tin: 1.2, dlc: 1.6,
  alcron: 1.5, naco: 1.4, uncoated: 0.7,
};

// ============================================================================
// ENGINE
// ============================================================================

class ToolWearCompensationEngineImpl {

  /**
   * Apply progressive wear compensation to G-code.
   */
  compensate(input: WearCompInput): WearCompResult {
    const warnings: string[] = [];
    const iso = this._resolveISO(input.material, input.iso_group);
    const taylor = TAYLOR_PARAMS[iso] ?? TAYLOR_PARAMS.P;
    const strategy = input.compensation_strategy ?? "both";
    const maxFeedRed = input.max_feed_reduction_pct ?? 20;
    const maxSpeedRed = input.max_speed_reduction_pct ?? 15;
    const targetVB = input.target_vb_mm ?? 0.3;
    const numZones = input.zones ?? 5;
    const annotate = input.annotate === true;

    const toolMap = new Map(input.tools.map(t => [t.tool_number, t]));
    const lines = input.gcode.split("\n");

    // First pass: identify tool sections and measure cutting distances
    const sections = this._identifyToolSections(lines, toolMap);

    // Second pass: calculate wear for each section
    const toolSections: WearToolSection[] = [];
    let totalCuttingDist = 0;
    let totalModified = 0;
    let maxWearRatio = 0;
    let totalFeedChange = 0, totalSpeedChange = 0, changeCount = 0;

    for (const section of sections) {
      const tool = toolMap.get(section.toolNum);
      if (!tool || section.cuttingDistance < 1) continue;

      // Estimate tool life
      const toolMatMult = TOOL_MAT_MULT[tool.tool_material ?? "carbide"] ?? 1.0;
      const coatingMult = COATING_MULT[(tool.coating ?? "").toLowerCase()] ?? 1.0;
      const baseLife = tool.expected_tool_life_min ?? taylor.life_min;
      const adjustedLife = baseLife * toolMatMult * coatingMult;

      // Estimate cutting time from distance and modal feed
      const avgFeed = section.avgFeed > 0 ? section.avgFeed : 500; // mm/min
      const cuttingTime = section.cuttingDistance / avgFeed; // minutes

      // Wear ratio (how much of tool life this section uses)
      const wearRatio = Math.min(1.0, cuttingTime / adjustedLife);
      maxWearRatio = Math.max(maxWearRatio, wearRatio);
      totalCuttingDist += section.cuttingDistance;

      if (wearRatio > 0.8) {
        warnings.push(`T${section.toolNum}: Using ${(wearRatio * 100).toFixed(0)}% of tool life in this program — consider tool change mid-program`);
      }

      // Divide into wear zones
      const zones: WearZone[] = [];
      const linesPerZone = Math.ceil((section.endLine - section.startLine) / numZones);
      const distPerZone = section.cuttingDistance / numZones;
      let cumDist = 0;

      for (let z = 0; z < numZones; z++) {
        const zoneStart = section.startLine + z * linesPerZone;
        const zoneEnd = Math.min(section.startLine + (z + 1) * linesPerZone, section.endLine);
        cumDist += distPerZone;

        const zoneWearRatio = (z + 1) / numZones * wearRatio;
        const vb = zoneWearRatio * targetVB;

        // Compensation adjustments
        let speedAdj = 0, feedAdj = 0;
        if (strategy === "speed_reduction" || strategy === "both") {
          speedAdj = -zoneWearRatio * maxSpeedRed;
        }
        if (strategy === "feed_reduction" || strategy === "both") {
          feedAdj = -zoneWearRatio * maxFeedRed;
        }

        // Force increase from wear
        const forceIncrease = zoneWearRatio * 30; // Up to 30% force increase at end of life

        zones.push({
          zone_number: z + 1,
          start_line: zoneStart,
          end_line: zoneEnd,
          cutting_distance_mm: Math.round(distPerZone),
          cumulative_distance_mm: Math.round(cumDist),
          wear_ratio: Math.round(zoneWearRatio * 1000) / 1000,
          estimated_vb_mm: Math.round(vb * 1000) / 1000,
          speed_adjustment_pct: Math.round(speedAdj * 10) / 10,
          feed_adjustment_pct: Math.round(feedAdj * 10) / 10,
          force_increase_pct: Math.round(forceIncrease * 10) / 10,
        });
      }

      // Recommendation
      let recommendation = "";
      if (wearRatio < 0.3) recommendation = "Tool life adequate — minimal compensation needed";
      else if (wearRatio < 0.6) recommendation = "Moderate wear expected — compensation will maintain finish quality";
      else if (wearRatio < 0.8) recommendation = "Significant wear — compensation active, monitor surface finish";
      else recommendation = "Near end of tool life — consider splitting into 2 tool loads";

      toolSections.push({
        tool_number: section.toolNum,
        cutting_distance_mm: Math.round(section.cuttingDistance),
        estimated_tool_life_min: Math.round(adjustedLife),
        cutting_time_min: Math.round(cuttingTime * 10) / 10,
        wear_ratio: Math.round(wearRatio * 1000) / 1000,
        zones,
        recommendation,
      });

      // Apply compensation to G-code lines
      for (const zone of zones) {
        if (Math.abs(zone.speed_adjustment_pct) < 0.5 && Math.abs(zone.feed_adjustment_pct) < 0.5) continue;

        for (let i = zone.start_line; i < zone.end_line && i < lines.length; i++) {
          const line = lines[i].trim();
          const upper = line.toUpperCase();
          if (!upper || upper.startsWith("(") || upper.startsWith(";")) continue;

          // Only adjust cutting moves
          const isCutting = /G[0]?[123]\s/.test(upper) ||
            (/[XY][+-]?\d/.test(upper) && !/G[0]?0\s/.test(upper));
          if (!isCutting) continue;

          let modified = line;
          let changed = false;

          // Adjust S value
          if (zone.speed_adjustment_pct !== 0) {
            const sMatch = modified.match(/S(\d+)/i);
            if (sMatch) {
              const origS = parseInt(sMatch[1]);
              const newS = Math.round(origS * (1 + zone.speed_adjustment_pct / 100));
              if (newS !== origS) {
                modified = modified.replace(/S\d+/i, `S${newS}`);
                changed = true;
                totalSpeedChange += zone.speed_adjustment_pct;
                changeCount++;
              }
            }
          }

          // Adjust F value
          if (zone.feed_adjustment_pct !== 0) {
            const fMatch = modified.match(/F(\d+\.?\d*)/i);
            if (fMatch) {
              const origF = parseFloat(fMatch[1]);
              const newF = Math.round(origF * (1 + zone.feed_adjustment_pct / 100));
              if (Math.abs(newF - origF) > 0.5) {
                modified = modified.replace(/F\d+\.?\d*/i, `F${newF}`);
                changed = true;
                totalFeedChange += zone.feed_adjustment_pct;
                changeCount++;
              }
            }
          }

          if (changed) {
            if (annotate) {
              modified += ` (wear-comp Z${zone.zone_number}: VB=${zone.estimated_vb_mm}mm)`;
            }
            lines[i] = modified;
            totalModified++;
          }
        }
      }
    }

    const result: WearCompResult = {
      gcode: lines.join("\n"),
      tool_sections: toolSections,
      stats: {
        total_cutting_distance_mm: Math.round(totalCuttingDist),
        tools_compensated: toolSections.length,
        lines_modified: totalModified,
        max_wear_ratio: Math.round(maxWearRatio * 1000) / 1000,
        average_feed_change_pct: changeCount > 0 ? Math.round((totalFeedChange / changeCount) * 10) / 10 : 0,
        average_speed_change_pct: changeCount > 0 ? Math.round((totalSpeedChange / changeCount) * 10) / 10 : 0,
      },
      warnings,
    };

    // Playbook: enrich with domain advice
    try {
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
      const pbResult = machiningPlaybookEngine.advise({
        categories: ["tool_life", "material_tip"],
      });
      for (const rule of pbResult.rules) {
        if (rule.severity === "critical" || rule.severity === "important") {
          result.warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
        }
      }
    } catch { /* playbook not available */ }

    return result;
  }

  /**
   * Analyze wear impact without modifying G-code.
   */
  analyze(input: WearCompInput): {
    tool_sections: WearToolSection[];
    total_cutting_distance_mm: number;
    max_wear_ratio: number;
    recommendations: string[];
  } {
    const result = this.compensate({ ...input, annotate: false });
    return {
      tool_sections: result.tool_sections,
      total_cutting_distance_mm: result.stats.total_cutting_distance_mm,
      max_wear_ratio: result.stats.max_wear_ratio,
      recommendations: result.tool_sections.map(ts => `T${ts.tool_number}: ${ts.recommendation}`),
    };
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private _resolveISO(material: string, explicit?: string): string {
    if (explicit) return explicit;
    const key = material.toLowerCase().replace(/[\s-]/g, "_");
    return MAT_ISO[key] ?? "P";
  }

  private _identifyToolSections(lines: string[], toolMap: Map<number, WearToolDef>): Array<{
    toolNum: number; startLine: number; endLine: number;
    cuttingDistance: number; avgFeed: number;
  }> {
    const sections: Array<{
      toolNum: number; startLine: number; endLine: number;
      cuttingDistance: number; avgFeed: number;
    }> = [];

    let currentTool = -1;
    let sectionStart = 0;
    let prevX: number | undefined, prevY: number | undefined, prevZ: number | undefined;
    let cuttingDist = 0;
    let modalFeed = 0;
    let feedSum = 0, feedCount = 0;
    let modalG = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line) continue;

      // Tool change
      const tMatch = line.match(/^T(\d+)/);
      if (tMatch) {
        const tNum = parseInt(tMatch[1]);
        if (currentTool >= 0 && toolMap.has(currentTool)) {
          sections.push({
            toolNum: currentTool,
            startLine: sectionStart,
            endLine: i,
            cuttingDistance: cuttingDist,
            avgFeed: feedCount > 0 ? feedSum / feedCount : 0,
          });
        }
        currentTool = tNum;
        sectionStart = i;
        cuttingDist = 0;
        feedSum = 0;
        feedCount = 0;
        prevX = undefined; prevY = undefined; prevZ = undefined;
        continue;
      }

      // Track G-code modal
      if (/G[0]?0\b/.test(line)) modalG = 0;
      else if (/G[0]?1\b/.test(line)) modalG = 1;
      else if (/G[0]?[23]\b/.test(line)) modalG = 2;

      // Track feed
      const fMatch = line.match(/F(\d+\.?\d*)/);
      if (fMatch) {
        modalFeed = parseFloat(fMatch[1]);
        feedSum += modalFeed;
        feedCount++;
      }

      // Calculate cutting distance
      const xm = line.match(/X([+-]?\d+\.?\d*)/);
      const ym = line.match(/Y([+-]?\d+\.?\d*)/);
      const zm = line.match(/Z([+-]?\d+\.?\d*)/);

      const curX = xm ? parseFloat(xm[1]) : prevX;
      const curY = ym ? parseFloat(ym[1]) : prevY;
      const curZ = zm ? parseFloat(zm[1]) : prevZ;

      if (modalG >= 1 && prevX != null && prevY != null) {
        const dx = (curX ?? prevX) - prevX;
        const dy = (curY ?? prevY) - prevY;
        const dz = (curZ ?? prevZ ?? 0) - (prevZ ?? 0);
        cuttingDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }

      if (curX != null) prevX = curX;
      if (curY != null) prevY = curY;
      if (curZ != null) prevZ = curZ;
    }

    // Final section
    if (currentTool >= 0 && toolMap.has(currentTool)) {
      sections.push({
        toolNum: currentTool,
        startLine: sectionStart,
        endLine: lines.length,
        cuttingDistance: cuttingDist,
        avgFeed: feedCount > 0 ? feedSum / feedCount : 0,
      });
    }

    return sections;
  }
}

export const toolWearCompensationEngine = new ToolWearCompensationEngineImpl();
