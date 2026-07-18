/**
 * AutoSpeedFeedEngine — Automated Line-by-Line Speed & Feed Optimization
 *
 * The missing link in CNC programming: takes raw G-code from any CAM system
 * and automatically calculates physics-optimized S (spindle speed) and F (feed rate)
 * for EVERY cutting line using PRISM's full speed/feed engine stack.
 *
 * Pipeline:
 *   1. Parse G-code → extract tool changes, modal states, cutting moves
 *   2. Per tool section: resolve material + tool → UltimateSpeedFeedEngine
 *   3. Per cutting line: apply PostProcessorFeedOptimizerEngine adjustments
 *      (chip thinning, corner decel, arc limiting, plunge limiting)
 *   4. Per line: verify against CuttingPowerBudgetEngine machine limits
 *   5. Emit optimized G-code with S/F on every cutting move
 *
 * Novel: No CAM software or post-processor performs physics-backed speed/feed
 * calculation as an automated post-processing step. CAM systems use static
 * lookup tables; this engine applies inline Kienzle force, Taylor tool life,
 * Loewen-Shaw thermal approximation, chip thinning, and machine power budgets
 * — per line. Physics is delegated to UltimateSpeedFeedEngine (applied inline);
 * algorithm-module composition is tracked by milestone SF-PSN-WIRE-MS0.
 *
 * Orchestrates: UltimateSpeedFeedEngine, PostProcessorFeedOptimizerEngine,
 *   CuttingPowerBudgetEngine, CuttingDataLookupEngine
 *
 * @module engines/AutoSpeedFeedEngine
 */

import { log } from "../utils/Logger.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
// U-CAMX22-FIX-SILENT-SKIP (2026-05-18): static imports replace the prior
// `await import()` lazy-load. No circular dependency exists (neither engine
// imports AutoSpeedFeed/PrintToProgram), so static import is safe and removes
// the only reason optimize() had to be async — enabling a true synchronous
// optimizeSync() path for the sync PrintToProgram pipeline.
import { ultimateSpeedFeedEngine } from "./UltimateSpeedFeedEngine.js";
import { postProcessorFeedOptimizer } from "./PostProcessorFeedOptimizerEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface ToolDefinition {
  tool_number: number;
  diameter_mm: number;
  flutes: number;
  type?: "endmill" | "ballnose" | "bull_nose" | "face_mill" | "drill" | "tap" | "reamer" | "chamfer";
  material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  flute_length_mm?: number;
  corner_radius_mm?: number;
  max_rpm?: number;
  stickout_mm?: number;
  helix_angle_deg?: number;
}

export interface AutoSpeedFeedInput {
  gcode: string;
  material: string;
  iso_group?: ISOGroup;
  hardness_hb?: number;
  tools: ToolDefinition[];

  // Cutting parameters (defaults if not in G-code)
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  cut_type?: "roughing" | "semi_finishing" | "finishing";
  strategy?: "conventional" | "adaptive" | "trochoidal" | "hsm" | "hpc" | "slot";
  coolant?: "flood" | "mist" | "mql" | "air_blast" | "dry" | "through_tool" | "cryogenic";

  // Machine constraints
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_torque_nm?: number;
  machine_rigidity?: "low" | "medium" | "high";

  // Optimization
  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced";
  aggressiveness?: number; // 0.0 (conservative) to 1.0 (aggressive), default 0.5

  // Output control
  annotate?: boolean;        // Add comments explaining each S/F change
  preserve_rapids?: boolean; // Don't touch G0 moves (default true)
  force_explicit_sf?: boolean; // Put S/F on EVERY cutting line even if unchanged
}

export interface OptimizedLineDetail {
  line_number: number;
  original: string;
  optimized: string;
  original_s: number | null;
  original_f: number | null;
  new_s: number | null;
  new_f: number | null;
  tool_number: number;
  adjustments: string[];
}

export interface ToolSectionSummary {
  tool_number: number;
  tool_diameter_mm: number;
  optimal_rpm: number;
  optimal_vc_mmin: number;
  base_feed_mmmin: number;
  feed_per_tooth_mm: number;
  lines_optimized: number;
  power_utilization_pct: number | null;
  chip_thinning_factor: number;
  thermal_risk: string;
}

export interface AutoSpeedFeedResult {
  gcode: string;
  tool_sections: ToolSectionSummary[];
  lines: OptimizedLineDetail[];
  stats: {
    total_lines: number;
    cutting_lines: number;
    lines_modified: number;
    tools_processed: number;
    average_feed_change_pct: number;
    estimated_time_savings_pct: number;
    power_limited_lines: number;
    chip_thinning_adjustments: number;
    corner_decelerations: number;
    plunge_limits: number;
    arc_limits: number;
  };
  warnings: string[];
  /** Warnings from MachiningPlaybookEngine material/anti-pattern rules */
  playbook_warnings?: string[];
}

export interface AutoSpeedFeedAnalysis {
  tool_sections: ToolSectionSummary[];
  opportunities: number;
  estimated_time_savings_pct: number;
  under_fed_lines: number;
  over_fed_lines: number;
  missing_sf_lines: number;
  power_risk_lines: number;
  recommendations: string[];
}

export interface BatchToolEntry {
  tool_number: number;
  diameter_mm: number;
  flutes: number;
  type?: string;
  material?: string;
  operation?: string;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
}

export interface BatchResult {
  tool_number: number;
  optimal_rpm: number;
  optimal_feed_mmmin: number;
  feed_per_tooth_mm: number;
  cutting_speed_mmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  mrr_cm3min: number;
  power_kw: number;
  confidence: number;
}

// ============================================================================
// MATERIAL → ISO MAPPING (subset for fast resolution)
// ============================================================================

const MAT_ISO: Record<string, ISOGroup> = {
  steel: "P", carbon_steel: "P", alloy_steel: "P", "1018": "P", "1045": "P",
  "4140": "P", "4340": "P", "8620": "P", mild_steel: "P", structural_steel: "P",
  stainless: "M", stainless_steel: "M", "304": "M", "316": "M", "17-4ph": "M",
  duplex: "M", "303": "M", "410": "M", "420": "M", austenitic: "M",
  cast_iron: "K", gray_iron: "K", ductile_iron: "K", nodular_iron: "K",
  aluminum: "N", aluminium: "N", "6061": "N", "7075": "N", "2024": "N",
  brass: "N", bronze: "N", copper: "N",
  titanium: "S", "ti-6al-4v": "S", inconel: "S", "718": "S", hastelloy: "S",
  waspaloy: "S", nimonic: "S", monel: "S", cobalt_chrome: "S",
  hardened_steel: "H", d2: "H", h13: "H", m2: "H", tool_steel: "H",
};

// ============================================================================
// ENGINE
// ============================================================================

class AutoSpeedFeedEngineImpl {

  /**
   * Optimize G-code with physics-calculated S and F on every cutting line.
   */
  async optimize(input: AutoSpeedFeedInput): Promise<AutoSpeedFeedResult> {
    const usfe = await this._getUltimateEngine();
    const ppfo = await this._getFeedOptimizer();
    return this._optimizeImpl(input, usfe, ppfo);
  }

  /**
   * U-CAMX22-FIX-SILENT-SKIP (2026-05-18): synchronous optimization path.
   *
   * The orchestrated engines (UltimateSpeedFeedEngine,
   * PostProcessorFeedOptimizerEngine) are now statically imported and have no
   * async initialization, so the entire S/F optimization is pure synchronous
   * CPU work. `PrintToProgramPipelineEngine.runFullPipeline` is sync and could
   * not `await optimize()`; before this fix it surfaced a visible skip
   * (U-CAMX22-VISIBLE-SKIP) and emitted the base G-code *unoptimized*.
   * optimizeSync() lets the sync pipeline run the real physics S/F
   * optimization. Identical result contract to {@link optimize}.
   */
  optimizeSync(input: AutoSpeedFeedInput): AutoSpeedFeedResult {
    return this._optimizeImpl(
      input,
      this._getUltimateEngineSync(),
      this._getFeedOptimizerSync(),
    );
  }

  /**
   * Resolve + cache the orchestrated engines. Kept for API-surface
   * compatibility with the U-CAMX22 design note; with static imports it is a
   * cheap idempotent cache-fill, never a blocking load. Safe to call
   * repeatedly or never.
   */
  prewarm(): void {
    this._getUltimateEngineSync();
    this._getFeedOptimizerSync();
  }

  /**
   * Synchronous optimization core shared by {@link optimize} (async wrapper)
   * and {@link optimizeSync}. Takes the already-resolved orchestrated engines
   * so it carries zero async dependency.
   */
  private _optimizeImpl(
    input: AutoSpeedFeedInput,
    usfe: any,
    ppfo: any,
  ): AutoSpeedFeedResult {
    const warnings: string[] = [];
    const lines = input.gcode.split("\n");
    const isoGroup = this._resolveISO(input.material, input.iso_group);
    const toolMap = new Map(input.tools.map(t => [t.tool_number, t]));
    const preserveRapids = input.preserve_rapids !== false;
    const annotate = input.annotate === true;
    const forceExplicit = input.force_explicit_sf === true;
    const aggressiveness = Math.max(0, Math.min(1, input.aggressiveness ?? 0.5));

    // State tracking
    let currentTool: ToolDefinition | null = null;
    let modalS = 0, modalF = 0, modalG = 1;
    let prevX: number | undefined, prevY: number | undefined, prevZ: number | undefined;

    // Per-tool optimal parameters (computed once per tool change)
    let toolOptimal: {
      rpm: number; feed: number; fz: number; vc: number;
      chipThinFactor: number; powerUtil: number | null; thermalRisk: string;
      ap: number; ae: number;
    } | null = null;

    const optimizedLines: string[] = [];
    const lineDetails: OptimizedLineDetail[] = [];
    const toolSections: ToolSectionSummary[] = [];

    // Stats
    let cuttingLines = 0, linesModified = 0, toolsProcessed = 0;
    let totalFeedChange = 0, feedChangeCount = 0;
    let powerLimited = 0, chipThinCount = 0, cornerCount = 0, plungeCount = 0, arcCount = 0;

    // Current tool section tracking
    let sectionLinesOpt = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      const upper = trimmed.toUpperCase();

      // Skip empty/comments
      if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) {
        optimizedLines.push(raw);
        continue;
      }

      // Detect tool change
      const toolMatch = upper.match(/^T(\d+)/);
      const m6Match = upper.includes("M6") || upper.includes("M06");

      if (toolMatch) {
        const tNum = parseInt(toolMatch[1]);
        const tool = toolMap.get(tNum);

        if (tool) {
          // Save previous tool section
          if (currentTool && toolOptimal) {
            toolSections.push(this._makeToolSummary(currentTool, toolOptimal, sectionLinesOpt));
          }

          currentTool = tool;
          sectionLinesOpt = 0;
          toolsProcessed++;

          // Compute optimal parameters for this tool
          try {
            const sfResult = usfe.compute({
              material: input.material,
              iso_group: isoGroup,
              hardness_hb: input.hardness_hb,
              tool_diameter_mm: tool.diameter_mm,
              flutes: tool.flutes,
              tool_material: tool.material as any,
              tool_coating: tool.coating,
              helix_angle_deg: tool.helix_angle_deg,
              corner_radius_mm: tool.corner_radius_mm,
              flute_length_mm: tool.flute_length_mm,
              tool_stickout_mm: tool.stickout_mm,
              operation: this._inferOperation(tool.type),
              cut_type: input.cut_type ?? "roughing",
              strategy: input.strategy as any,
              axial_depth_mm: input.axial_depth_mm,
              radial_depth_mm: input.radial_depth_mm,
              machine_power_kw: input.machine_power_kw,
              machine_max_rpm: Math.min(input.machine_max_rpm ?? 99999, tool.max_rpm ?? 99999),
              machine_rigidity: input.machine_rigidity,
              coolant: input.coolant as any,
              optimize_for: input.optimize_for ?? "balanced",
            });

            const rpm = Math.round(sfResult.spindle_rpm.value);
            const feed = Math.round(sfResult.feed_rate.value);
            const fz = sfResult.feed_per_tooth.value;
            const vc = sfResult.cutting_speed.value;
            const ap = sfResult.axial_depth.value;
            const ae = sfResult.radial_depth.value;
            const chipThinFactor = sfResult.chip_thinning_factor?.value ?? 1.0;
            const powerUtil = sfResult.power?.power_utilization_pct?.value ?? null;
            const thermalRisk = sfResult.thermal?.thermal_damage_risk ?? "none";

            // Apply aggressiveness scaling
            const aggScale = 0.7 + aggressiveness * 0.6; // 0.7x to 1.3x
            toolOptimal = {
              rpm: Math.round(rpm * aggScale),
              feed: Math.round(feed * aggScale),
              fz: fz * aggScale,
              vc: vc * aggScale,
              chipThinFactor,
              powerUtil,
              thermalRisk,
              ap, ae,
            };

            // Clamp to machine limits
            if (input.machine_max_rpm && toolOptimal.rpm > input.machine_max_rpm) {
              toolOptimal.rpm = input.machine_max_rpm;
              toolOptimal.feed = Math.round(toolOptimal.fz * tool.flutes * toolOptimal.rpm);
            }
            if (tool.max_rpm && toolOptimal.rpm > tool.max_rpm) {
              toolOptimal.rpm = tool.max_rpm;
              toolOptimal.feed = Math.round(toolOptimal.fz * tool.flutes * toolOptimal.rpm);
            }

            if (annotate) {
              optimizedLines.push(raw);
              optimizedLines.push(
                `(AUTO-SF: T${tNum} D${tool.diameter_mm} ${tool.flutes}FL ` +
                `Vc=${toolOptimal.vc.toFixed(0)}m/min RPM=${toolOptimal.rpm} ` +
                `Fz=${toolOptimal.fz.toFixed(3)}mm F=${toolOptimal.feed}mm/min)`
              );
              continue;
            }
          } catch (err: any) {
            warnings.push(`T${tNum}: Speed/feed calc failed — ${err.message}. Using G-code values.`);
            toolOptimal = null;
          }
        } else {
          warnings.push(`T${toolMatch[1]}: Not in tool list — skipping optimization.`);
          currentTool = null;
          toolOptimal = null;
        }

        optimizedLines.push(raw);
        continue;
      }

      // M6 without T — just pass through
      if (m6Match && !toolMatch) {
        optimizedLines.push(raw);
        continue;
      }

      // Parse G-code line
      const parsed = this._parseLine(trimmed);

      // Track modal G-code
      if (parsed.gCodes.includes(0)) modalG = 0;
      else if (parsed.gCodes.includes(1)) modalG = 1;
      else if (parsed.gCodes.includes(2)) modalG = 2;
      else if (parsed.gCodes.includes(3)) modalG = 3;

      // Track modal S/F
      if (parsed.s != null) modalS = parsed.s;
      if (parsed.f != null) modalF = parsed.f;

      // Skip if no active tool optimization
      if (!toolOptimal || !currentTool) {
        optimizedLines.push(raw);
        if (parsed.hasCoords) {
          prevX = parsed.x ?? prevX;
          prevY = parsed.y ?? prevY;
          prevZ = parsed.z ?? prevZ;
        }
        continue;
      }

      // Skip rapids
      const isRapid = parsed.gCodes.includes(0) || (modalG === 0 && parsed.gCodes.length === 0 && parsed.hasCoords);
      if (isRapid && preserveRapids) {
        optimizedLines.push(raw);
        if (parsed.hasCoords) {
          prevX = parsed.x ?? prevX;
          prevY = parsed.y ?? prevY;
          prevZ = parsed.z ?? prevZ;
        }
        continue;
      }

      // Is this a cutting move?
      const isCutting = parsed.gCodes.includes(1) || parsed.gCodes.includes(2) || parsed.gCodes.includes(3) ||
        (modalG >= 1 && modalG <= 3 && parsed.gCodes.length === 0 && parsed.hasCoords);

      if (!isCutting) {
        optimizedLines.push(raw);
        continue;
      }

      cuttingLines++;

      // Start with tool's optimal feed
      let newS = toolOptimal.rpm;
      let newF = toolOptimal.feed;
      const adjustments: string[] = [];

      // Line-level feed adjustments using PostProcessorFeedOptimizer logic
      // 1. Corner deceleration
      if (prevX != null && prevY != null && parsed.hasCoords) {
        const curX = parsed.x ?? prevX;
        const curY = parsed.y ?? prevY;
        const nextLine = i + 1 < lines.length ? this._parseLine(lines[i + 1].trim()) : null;

        if (nextLine && nextLine.hasCoords) {
          const nextX = nextLine.x ?? curX;
          const nextY = nextLine.y ?? curY;
          const angle = this._directionChange(prevX, prevY, curX, curY, nextX, nextY);

          if (angle > 30) {
            const cornerFactor = 1.0 - (angle / 180) * 0.5;
            newF = Math.round(newF * cornerFactor);
            adjustments.push(`corner(${angle.toFixed(0)}deg)`);
            cornerCount++;
          }
        }
      }

      // 2. Arc feed limiting
      const isArc = parsed.gCodes.includes(2) || parsed.gCodes.includes(3) || (modalG === 2 || modalG === 3);
      if (isArc) {
        const arcR = this._arcRadius(parsed);
        if (arcR > 0 && arcR < 2.0) {
          const arcFactor = Math.max(0.3, arcR / 2.0);
          newF = Math.round(newF * arcFactor);
          adjustments.push(`arc(R${arcR.toFixed(1)})`);
          arcCount++;
        }
      }

      // 3. Plunge rate limiting
      if (parsed.z != null && prevZ != null && parsed.z < prevZ) {
        const dz = prevZ - parsed.z;
        const dx = (parsed.x ?? prevX ?? 0) - (prevX ?? 0);
        const dy = (parsed.y ?? prevY ?? 0) - (prevY ?? 0);
        const dxy = Math.sqrt(dx * dx + dy * dy);

        if (dxy < 0.01 || dz / dxy > 2.0) {
          newF = Math.round(newF * 0.5);
          adjustments.push("plunge");
          plungeCount++;
        }
      }

      // 4. Chip thinning compensation (boost feed for light radial engagement)
      if (toolOptimal.chipThinFactor > 1.05) {
        const boosted = Math.round(newF * Math.min(toolOptimal.chipThinFactor, 1.5));
        if (boosted > newF) {
          newF = boosted;
          adjustments.push(`chip_thin(x${toolOptimal.chipThinFactor.toFixed(2)})`);
          chipThinCount++;
        }
      }

      // 5. Machine power budget check
      if (input.machine_power_kw) {
        // kc1.1 from the canonical Kienzle table -- was a byte-identical inline _getKc; import so a
        // future canonical edit propagates to this power-budget throttle (isoGroup is a valid ISOGroup
        // from this._resolveISO, CANONICAL_KIENZLE is a total Record -> no fallback needed).
        const kc1_1 = CANONICAL_KIENZLE[isoGroup].kc1_1;
        const ap = toolOptimal.ap;
        const ae = toolOptimal.ae;
        const fz = newF / (currentTool.flutes * newS);
        const Pc = (kc1_1 * ap * ae * fz * currentTool.flutes * newS) / (60e6 * 0.85);
        if (Pc > input.machine_power_kw * 0.95) {
          const reduction = (input.machine_power_kw * 0.85) / Pc;
          newF = Math.round(newF * reduction);
          adjustments.push(`power_limit(${Pc.toFixed(1)}kW)`);
          powerLimited++;
        }
      }

      // Ensure minimums
      if (newF < 1) newF = 1;
      if (newS < 1) newS = 1;

      // Build optimized line
      const origS = parsed.s ?? modalS;
      const origF = parsed.f ?? modalF;
      const sChanged = newS !== origS;
      const fChanged = Math.abs(newF - origF) > 0.5;
      const changed = sChanged || fChanged;

      let optimizedLine = trimmed;
      if (changed || forceExplicit) {
        optimizedLine = this._injectSF(trimmed, newS, newF, sChanged || forceExplicit, fChanged || forceExplicit);
        if (changed) {
          linesModified++;
          if (origF > 0) {
            totalFeedChange += (newF - origF) / origF;
            feedChangeCount++;
          }
          sectionLinesOpt++;
        }
      }

      if (annotate && adjustments.length > 0) {
        optimizedLine += ` (${adjustments.join(", ")})`;
      }

      optimizedLines.push(optimizedLine);
      lineDetails.push({
        line_number: i + 1,
        original: trimmed,
        optimized: optimizedLine,
        original_s: origS || null,
        original_f: origF || null,
        new_s: newS,
        new_f: newF,
        tool_number: currentTool.tool_number,
        adjustments,
      });

      // Update position
      prevX = parsed.x ?? prevX;
      prevY = parsed.y ?? prevY;
      prevZ = parsed.z ?? prevZ;
    }

    // Final tool section
    if (currentTool && toolOptimal) {
      toolSections.push(this._makeToolSummary(currentTool, toolOptimal, sectionLinesOpt));
    }

    const avgChange = feedChangeCount > 0 ? (totalFeedChange / feedChangeCount) * 100 : 0;
    const timeSavings = avgChange > 0 ? Math.min(avgChange * 0.8, 30) : 0;

    // Playbook integration — consult material rules and add warnings
    const playbookWarnings = this._collectPlaybookWarnings(
      isoGroup, input.gcode, input.coolant, toolSections, input.tools,
    );

    return {
      gcode: optimizedLines.join("\n"),
      tool_sections: toolSections,
      lines: lineDetails,
      stats: {
        total_lines: lines.length,
        cutting_lines: cuttingLines,
        lines_modified: linesModified,
        tools_processed: toolsProcessed,
        average_feed_change_pct: Math.round(avgChange * 10) / 10,
        estimated_time_savings_pct: Math.round(timeSavings * 10) / 10,
        power_limited_lines: powerLimited,
        chip_thinning_adjustments: chipThinCount,
        corner_decelerations: cornerCount,
        plunge_limits: plungeCount,
        arc_limits: arcCount,
      },
      warnings,
      ...(playbookWarnings.length > 0 ? { playbook_warnings: playbookWarnings } : {}),
    };
  }

  /**
   * Analyze G-code for speed/feed optimization opportunities without modifying.
   */
  async analyze(input: AutoSpeedFeedInput): Promise<AutoSpeedFeedAnalysis> {
    const result = await this.optimize({ ...input, annotate: false, force_explicit_sf: false });
    const recommendations: string[] = [];

    let underFed = 0, overFed = 0, missingSF = 0, powerRisk = 0;

    for (const line of result.lines) {
      if (line.new_f && line.original_f) {
        if (line.new_f > line.original_f * 1.1) underFed++;
        if (line.new_f < line.original_f * 0.9) overFed++;
      }
      if (!line.original_f && !line.original_s) missingSF++;
      if (line.adjustments.some(a => a.startsWith("power_limit"))) powerRisk++;
    }

    if (underFed > 10) {
      recommendations.push(`${underFed} lines are under-fed — potential ${(underFed / result.stats.cutting_lines * 100).toFixed(0)}% cycle time reduction.`);
    }
    if (overFed > 5) {
      recommendations.push(`${overFed} lines are over-fed — risking tool breakage or poor surface finish.`);
    }
    if (powerRisk > 0) {
      recommendations.push(`${powerRisk} lines exceed machine power budget — feeds will be reduced.`);
    }
    if (result.stats.chip_thinning_adjustments > 0) {
      recommendations.push(`${result.stats.chip_thinning_adjustments} lines benefit from chip thinning compensation.`);
    }
    for (const ts of result.tool_sections) {
      if (ts.thermal_risk === "high" || ts.thermal_risk === "critical") {
        recommendations.push(`T${ts.tool_number}: Thermal risk is ${ts.thermal_risk} — consider coolant or speed reduction.`);
      }
    }

    return {
      tool_sections: result.tool_sections,
      opportunities: result.stats.lines_modified,
      estimated_time_savings_pct: result.stats.estimated_time_savings_pct,
      under_fed_lines: underFed,
      over_fed_lines: overFed,
      missing_sf_lines: missingSF,
      power_risk_lines: powerRisk,
      recommendations,
    };
  }

  /**
   * Batch-calculate optimal speed/feed for multiple tools without G-code.
   * Quick lookup for programming reference.
   */
  async batchCalculate(
    material: string,
    iso_group: ISOGroup | undefined,
    tools: BatchToolEntry[],
    machine_power_kw?: number,
    machine_max_rpm?: number,
    optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced",
  ): Promise<BatchResult[]> {
    const usfe = await this._getUltimateEngine();
    const iso = this._resolveISO(material, iso_group);
    const results: BatchResult[] = [];

    for (const tool of tools) {
      try {
        const sf = usfe.compute({
          material,
          iso_group: iso,
          tool_diameter_mm: tool.diameter_mm,
          flutes: tool.flutes,
          tool_material: (tool.material as any) ?? "carbide",
          operation: (tool.operation as any) ?? "milling",
          cut_type: "roughing",
          axial_depth_mm: tool.axial_depth_mm,
          radial_depth_mm: tool.radial_depth_mm,
          machine_power_kw: machine_power_kw,
          machine_max_rpm: machine_max_rpm,
          optimize_for: optimize_for ?? "balanced",
        });

        results.push({
          tool_number: tool.tool_number,
          optimal_rpm: Math.round(sf.spindle_rpm.value),
          optimal_feed_mmmin: Math.round(sf.feed_rate.value),
          feed_per_tooth_mm: Math.round(sf.feed_per_tooth.value * 1000) / 1000,
          cutting_speed_mmin: Math.round(sf.cutting_speed.value),
          axial_depth_mm: sf.axial_depth.value,
          radial_depth_mm: sf.radial_depth.value,
          mrr_cm3min: Math.round(sf.mrr.value * 100) / 100,
          power_kw: sf.power?.required_power_kw?.value ?? 0,
          confidence: sf.spindle_rpm.confidence ?? 0.5,
        });
      } catch (err: any) {
        log.warn(`AutoSpeedFeed batch: T${tool.tool_number} failed — ${err.message}`);
        results.push({
          tool_number: tool.tool_number,
          optimal_rpm: 0, optimal_feed_mmmin: 0, feed_per_tooth_mm: 0,
          cutting_speed_mmin: 0, axial_depth_mm: 0, radial_depth_mm: 0,
          mrr_cm3min: 0, power_kw: 0, confidence: 0,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // PRIVATE — Lazy Engine Loading
  // ==========================================================================

  private _usfe: any = null;
  private _ppfo: any = null;

  // U-CAMX22-FIX-SILENT-SKIP: sync getters resolve the statically-imported
  // singletons (idempotent cache-fill). The async variants are retained
  // verbatim-in-signature for backward compatibility with existing callers
  // (`optimize()`, `batchCalculate()`) and now simply delegate to the sync
  // path — no `await import()` remains, so no async work actually occurs.
  private _getUltimateEngineSync(): any {
    if (!this._usfe) this._usfe = ultimateSpeedFeedEngine;
    return this._usfe;
  }

  private _getFeedOptimizerSync(): any {
    if (!this._ppfo) this._ppfo = postProcessorFeedOptimizer;
    return this._ppfo;
  }

  private async _getUltimateEngine(): Promise<any> {
    return this._getUltimateEngineSync();
  }

  private async _getFeedOptimizer(): Promise<any> {
    return this._getFeedOptimizerSync();
  }

  // ==========================================================================
  // PRIVATE — Helpers
  // ==========================================================================

  /**
   * Consult MachiningPlaybookEngine for material/anti-pattern warnings
   * relevant to the optimized G-code output.
   *
   * Key rules surfaced:
   *   MAT-001: stainless never dwell (G04 + ISO M)
   *   MAT-002: titanium low speed (Vc > 60 m/min + ISO S)
   *   MAT-004: hardened steel air blast (flood coolant + ISO H)
   *   ANTI-004: no flood for interrupted carbide cuts
   */
  private _collectPlaybookWarnings(
    isoGroup: ISOGroup,
    gcode: string,
    coolant: string | undefined,
    toolSections: ToolSectionSummary[],
    tools: ToolDefinition[],
  ): string[] {
    const pbWarnings: string[] = [];

    try {
      // Query playbook for material-relevant rules
      const advice = machiningPlaybookEngine.advise({
        material_iso: isoGroup,
        categories: ["material_tip", "anti_pattern", "chip_control"],
      });

      // Collect generic critical/important warnings from playbook
      for (const rule of advice.rules) {
        if (rule.severity === "critical" || rule.severity === "important") {
          pbWarnings.push(`[${rule.id}] ${rule.title}: ${rule.rule.substring(0, 200)}`);
        }
      }

      // MAT-001: Stainless never dwell — warn if G04 found for ISO M
      if (isoGroup === "M" && /G0?4\b/i.test(gcode)) {
        const hasMat001 = pbWarnings.some(w => w.includes("MAT-001"));
        if (!hasMat001) {
          pbWarnings.push(
            "[MAT-001] Stainless dwell detected: G04 dwell found in G-code for stainless steel (ISO M). " +
            "Dwelling causes work hardening — remove G04 from stainless programs."
          );
        }
      }

      // MAT-002: Titanium low speed — warn if any tool section Vc > 60 m/min for ISO S
      if (isoGroup === "S") {
        for (const ts of toolSections) {
          if (ts.optimal_vc_mmin > 60) {
            pbWarnings.push(
              `[MAT-002] Titanium speed limit: T${ts.tool_number} Vc=${ts.optimal_vc_mmin} m/min exceeds ` +
              `60 m/min limit for ISO S (titanium/superalloys). Risk of rapid tool wear and thermal damage.`
            );
          }
        }
      }

      // MAT-004: Hardened steel air blast — warn if flood coolant for ISO H
      if (isoGroup === "H" && coolant === "flood") {
        const hasMat004 = pbWarnings.some(w => w.includes("MAT-004"));
        if (!hasMat004) {
          pbWarnings.push(
            "[MAT-004] Hardened steel coolant: Flood coolant detected for hardened steel (ISO H). " +
            "Use air blast or dry cutting — thermal shock from flood causes carbide insert micro-fracture."
          );
        }
      }

      // ANTI-004: No flood for interrupted carbide cuts
      if (coolant === "flood") {
        const toolMap = new Map(tools.map(t => [t.tool_number, t]));
        const hasCarbideInterrupted = toolSections.some(ts => {
          const tool = toolMap.get(ts.tool_number);
          return tool && (tool.material === "carbide" || !tool.material); // default is carbide
        });
        if (hasCarbideInterrupted) {
          const hasAnti004 = pbWarnings.some(w => w.includes("ANTI-004"));
          if (!hasAnti004) {
            pbWarnings.push(
              "[ANTI-004] Flood coolant with carbide: Flood coolant on carbide inserts in interrupted cuts " +
              "causes thermal cycling and edge chipping. Use MQL or air blast for interrupted operations."
            );
          }
        }
      }
    } catch (err: any) {
      log.warn(`AutoSpeedFeed playbook integration: ${err.message}`);
    }

    return pbWarnings;
  }

  private _resolveISO(material: string, explicit?: ISOGroup): ISOGroup {
    if (explicit) return explicit;
    const key = material.toLowerCase().replace(/[\s-]/g, "_");
    return MAT_ISO[key] ?? "P";
  }

  private _inferOperation(toolType?: string): string {
    switch (toolType) {
      case "drill": return "drilling";
      case "tap": return "tapping";
      case "reamer": return "reaming";
      default: return "milling";
    }
  }

  private _makeToolSummary(
    tool: ToolDefinition,
    opt: { rpm: number; feed: number; fz: number; vc: number; chipThinFactor: number; powerUtil: number | null; thermalRisk: string; ap: number; ae: number },
    linesOptimized: number,
  ): ToolSectionSummary {
    return {
      tool_number: tool.tool_number,
      tool_diameter_mm: tool.diameter_mm,
      optimal_rpm: opt.rpm,
      optimal_vc_mmin: Math.round(opt.vc),
      base_feed_mmmin: opt.feed,
      feed_per_tooth_mm: Math.round(opt.fz * 1000) / 1000,
      lines_optimized: linesOptimized,
      power_utilization_pct: opt.powerUtil != null ? Math.round(opt.powerUtil) : null,
      chip_thinning_factor: Math.round(opt.chipThinFactor * 100) / 100,
      thermal_risk: opt.thermalRisk,
    };
  }

  // ==========================================================================
  // PRIVATE — G-code Parsing
  // ==========================================================================

  private _parseLine(line: string): {
    gCodes: number[]; mCodes: number[];
    x?: number; y?: number; z?: number;
    f?: number; s?: number;
    i?: number; j?: number; r?: number;
    hasCoords: boolean;
  } {
    const upper = line.toUpperCase();
    const result: any = { gCodes: [], mCodes: [], hasCoords: false };

    if (!line || line.startsWith("(") || line.startsWith(";") || line.startsWith("%")) return result;

    for (const m of upper.matchAll(/G(\d+\.?\d*)/g)) result.gCodes.push(parseFloat(m[1]));
    for (const m of upper.matchAll(/M(\d+)/g)) result.mCodes.push(parseInt(m[1]));

    const extract = (letter: string): number | undefined => {
      const m = upper.match(new RegExp(`${letter}([+-]?\\d+\\.?\\d*)`));
      return m ? parseFloat(m[1]) : undefined;
    };

    result.x = extract("X"); result.y = extract("Y"); result.z = extract("Z");
    result.f = extract("F"); result.s = extract("S");
    result.i = extract("I"); result.j = extract("J"); result.r = extract("R");

    if (result.x != null || result.y != null || result.z != null) result.hasCoords = true;

    return result;
  }

  private _directionChange(
    x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
  ): number {
    const dx1 = x2 - x1, dy1 = y2 - y1;
    const dx2 = x3 - x2, dy2 = y3 - y2;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len1 < 1e-6 || len2 < 1e-6) return 0;
    const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
  }

  private _arcRadius(parsed: { i?: number; j?: number; r?: number }): number {
    if (parsed.r != null) return Math.abs(parsed.r);
    if (parsed.i != null && parsed.j != null) return Math.sqrt(parsed.i * parsed.i + parsed.j * parsed.j);
    return Infinity;
  }

  private _injectSF(line: string, s: number, f: number, injectS: boolean, injectF: boolean): string {
    let result = line;

    // Replace existing S value
    if (injectS) {
      if (/S\d+/i.test(result)) {
        result = result.replace(/S\d+\.?\d*/i, `S${s}`);
      } else {
        // Inject S before F or at end
        const fPos = result.search(/F\d/i);
        if (fPos > 0) {
          result = result.slice(0, fPos) + `S${s} ` + result.slice(fPos);
        } else {
          result = result.trimEnd() + ` S${s}`;
        }
      }
    }

    // Replace existing F value
    if (injectF) {
      if (/F\d+/i.test(result)) {
        result = result.replace(/F\d+\.?\d*/i, `F${f}`);
      } else {
        result = result.trimEnd() + ` F${f}`;
      }
    }

    return result;
  }
}

export const autoSpeedFeedEngine = new AutoSpeedFeedEngineImpl();
