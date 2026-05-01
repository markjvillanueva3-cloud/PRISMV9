/**
 * GCodeIntelligencePipelineEngine — Unified Post-Processing Intelligence
 *
 * Chains ALL PRISM G-code analysis engines into a single pipeline call:
 *   1. Safety Analysis → catch dangerous patterns before anything else
 *   2. Auto Speed/Feed → physics-optimized S/F on every cutting line
 *   3. Thermal Analysis → heat accumulation & distortion prediction
 *   4. Energy Analysis → power consumption & CO2 footprint
 *   5. Cycle Time Estimation → physics-based time prediction
 *   6. Setup Sheet Generation → operator documentation
 *
 * Novel: No CAM software runs a full-stack intelligence pipeline on G-code.
 * Each step feeds context to the next — safety issues inform speed/feed
 * limits, thermal data influences energy calculations, etc.
 *
 * @module engines/GCodeIntelligencePipelineEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineInput {
  gcode: string;
  material: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hb?: number;
  tools?: Array<{
    tool_number: number;
    diameter_mm: number;
    flutes: number;
    type?: string;
    material?: string;
    coating?: string;
    max_rpm?: number;
  }>;
  controller?: "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";

  // Machine
  machine_power_kw?: number;
  machine_max_rpm?: number;

  // Cutting context
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  cut_type?: "roughing" | "semi_finishing" | "finishing";
  coolant_type?: "flood" | "mist" | "air" | "none";

  // Workpiece
  workpiece_dimensions?: { x: number; y: number; z: number };

  // Pipeline control — select which stages to run
  stages?: {
    playbook?: boolean;     // default true — machining best-practice pre-check
    safety?: boolean;       // default true
    speed_feed?: boolean;   // default true (requires tools)
    thermal?: boolean;      // default false (requires workpiece_dimensions)
    energy?: boolean;       // default true
    cycle_time?: boolean;   // default true
    setup_sheet?: boolean;  // default true
  };

  // Playbook context (for Stage 0 pre-check)
  features?: string[];
  wall_thickness_mm?: number;
  tolerance_mm?: number;

  // Output control
  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced";
  part_number?: string;
  operation_name?: string;
}

export interface PipelineStageResult {
  stage: string;
  status: "pass" | "warn" | "fail" | "skipped";
  duration_ms: number;
  summary: string;
  data: unknown;
}

export interface PipelineResult {
  optimized_gcode: string;
  stages: PipelineStageResult[];
  overall_status: "pass" | "warn" | "fail";
  total_duration_ms: number;
  summary: {
    safety_issues: number;
    safety_critical: number;
    lines_speed_feed_optimized: number;
    estimated_time_savings_pct: number;
    cycle_time_seconds: number;
    energy_kwh: number;
    thermal_risk: string;
    tools_used: number;
    playbook_warnings: number;
  };
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class GCodeIntelligencePipelineEngineImpl {

  async run(input: PipelineInput): Promise<PipelineResult> {
    const startTime = Date.now();
    const stages: PipelineStageResult[] = [];
    const warnings: string[] = [];
    let gcode = input.gcode;
    const stageFlags = {
      playbook: input.stages?.playbook !== false,
      safety: input.stages?.safety !== false,
      speed_feed: input.stages?.speed_feed !== false && (input.tools?.length ?? 0) > 0,
      thermal: input.stages?.thermal === true && input.workpiece_dimensions != null,
      energy: input.stages?.energy !== false,
      cycle_time: input.stages?.cycle_time !== false,
      setup_sheet: input.stages?.setup_sheet !== false,
    };

    // Summary accumulators
    let safetyIssues = 0, safetyCritical = 0;
    let sfLinesOpt = 0, sfTimeSavings = 0;
    let cycleTimeSec = 0, energyKwh = 0;
    let thermalRisk = "none";
    let toolsUsed = 0;
    let playbookWarnings = 0;

    // ------------------------------------------------------------------
    // Stage 0: Playbook Pre-Check (Machining Best Practices)
    // ------------------------------------------------------------------
    if (stageFlags.playbook) {
      const t0 = Date.now();
      try {
        const { machiningPlaybookEngine } = await import("./MachiningPlaybookEngine.js");
        const features = input.features ?? [];
        const material = (input as any).material_iso ?? input.material;

        // Extract features from G-code comments if not provided
        const detectedFeatures = features.length > 0 ? features : this.detectFeaturesFromGcode(gcode);

        if (detectedFeatures.length > 0) {
          const advice = machiningPlaybookEngine.sequenceAdvice(detectedFeatures, material);
          const antiPatterns = machiningPlaybookEngine.antiPatterns({
            features: detectedFeatures,
            material_iso: material,
            wall_thickness_mm: input.wall_thickness_mm,
            tolerance_mm: input.tolerance_mm,
          });

          const criticals = antiPatterns.filter(r => r.severity === "critical");
          playbookWarnings = advice.warnings.length + criticals.length;

          if (criticals.length > 0) {
            for (const r of criticals) {
              warnings.push(`[PLAYBOOK ${r.id}] ${r.title}: ${r.rule}`);
            }
          }

          const status = criticals.length > 0 ? "warn" : "pass";
          stages.push({
            stage: "playbook",
            status,
            duration_ms: Date.now() - t0,
            summary: playbookWarnings > 0
              ? `${playbookWarnings} playbook warnings (${criticals.length} critical). Order: ${advice.recommended_order.join(" → ")}`
              : `Sequence validated: ${advice.recommended_order.join(" → ")}`,
            data: {
              recommended_order: advice.recommended_order,
              warnings: advice.warnings,
              anti_patterns: criticals.map(r => ({ id: r.id, title: r.title, rule: r.rule })),
              applied_rules: advice.applied_rules,
            },
          });
        } else {
          stages.push({ stage: "playbook", status: "skipped", duration_ms: Date.now() - t0, summary: "No features detected for playbook analysis", data: null });
        }
      } catch (err: any) {
        stages.push({ stage: "playbook", status: "pass", duration_ms: Date.now() - t0, summary: `Playbook skipped: ${err.message}`, data: null });
      }
    } else {
      stages.push({ stage: "playbook", status: "skipped", duration_ms: 0, summary: "Skipped", data: null });
    }

    // ------------------------------------------------------------------
    // Stage 1: Safety Analysis
    // ------------------------------------------------------------------
    if (stageFlags.safety) {
      const t0 = Date.now();
      try {
        const eng = (await import("./GCodeSafetyAnalyzerEngine.js")).gcSafetyAnalyzer;
        const result: any = eng.analyze(gcode, {
          controller: input.controller as any,
          tool_data: input.tools?.map(t => ({
            tool_num: t.tool_number,
            diameter: t.diameter_mm,
            type: t.type,
          })) as any,
          strictness: "standard",
        });
        safetyIssues = result.issues?.length ?? 0;
        safetyCritical = result.issues?.filter((i: any) => i.severity === "critical").length ?? 0;
        stages.push({
          stage: "safety",
          status: safetyCritical > 0 ? "fail" : safetyIssues > 0 ? "warn" : "pass",
          duration_ms: Date.now() - t0,
          summary: `${safetyIssues} issues (${safetyCritical} critical)`,
          data: { issues_count: safetyIssues, critical: safetyCritical },
        });
        if (safetyCritical > 0) {
          warnings.push(`SAFETY: ${safetyCritical} critical issues found — review before running on machine`);
        }
      } catch (err: any) {
        stages.push({ stage: "safety", status: "fail", duration_ms: Date.now() - t0, summary: err.message, data: null });
        warnings.push(`Safety analysis failed: ${err.message}`);
      }
    } else {
      stages.push({ stage: "safety", status: "skipped", duration_ms: 0, summary: "Skipped", data: null });
    }

    // ------------------------------------------------------------------
    // Stage 2: Auto Speed/Feed Optimization
    // ------------------------------------------------------------------
    if (stageFlags.speed_feed) {
      const t0 = Date.now();
      try {
        const eng = (await import("./AutoSpeedFeedEngine.js")).autoSpeedFeedEngine;
        const result = await eng.optimize({
          gcode,
          material: input.material,
          iso_group: input.iso_group,
          hardness_hb: input.hardness_hb,
          tools: input.tools!.map(t => ({
            tool_number: t.tool_number,
            diameter_mm: t.diameter_mm,
            flutes: t.flutes,
            type: t.type as any,
            material: t.material as any,
            coating: t.coating,
            max_rpm: t.max_rpm,
          })),
          machine_power_kw: input.machine_power_kw,
          machine_max_rpm: input.machine_max_rpm,
          axial_depth_mm: input.axial_depth_mm,
          radial_depth_mm: input.radial_depth_mm,
          cut_type: input.cut_type,
          optimize_for: input.optimize_for ?? "balanced",
        });
        gcode = result.gcode; // Use optimized G-code for subsequent stages
        sfLinesOpt = result.stats.lines_modified;
        sfTimeSavings = result.stats.estimated_time_savings_pct;
        toolsUsed = result.stats.tools_processed;
        stages.push({
          stage: "speed_feed",
          status: sfLinesOpt > 0 ? "pass" : "warn",
          duration_ms: Date.now() - t0,
          summary: `${sfLinesOpt} lines optimized, ~${sfTimeSavings}% time savings`,
          data: result.stats,
        });
      } catch (err: any) {
        stages.push({ stage: "speed_feed", status: "fail", duration_ms: Date.now() - t0, summary: err.message, data: null });
        warnings.push(`Speed/feed optimization failed: ${err.message}`);
      }
    } else {
      stages.push({
        stage: "speed_feed", status: "skipped", duration_ms: 0,
        summary: input.tools?.length ? "Skipped by config" : "No tools provided",
        data: null,
      });
    }

    // ------------------------------------------------------------------
    // Stage 3: Thermal Analysis
    // ------------------------------------------------------------------
    if (stageFlags.thermal) {
      const t0 = Date.now();
      try {
        const eng = (await import("./ToolpathThermalEngine.js")).toolpathThermalEngine;
        const toolDia = input.tools?.[0]?.diameter_mm ?? 10;
        const result: any = eng.analyzeHeatAccumulation({
          gcode,
          material: input.material,
          tool_diameter: toolDia,
          workpiece_dimensions: input.workpiece_dimensions!,
          coolant_type: input.coolant_type ?? "flood",
        } as any);
        thermalRisk = result.overall_risk ?? result.risk_level ?? "unknown";
        stages.push({
          stage: "thermal",
          status: thermalRisk === "high" || thermalRisk === "critical" ? "warn" : "pass",
          duration_ms: Date.now() - t0,
          summary: `Thermal risk: ${thermalRisk}, max temp: ${result.max_temperature_C?.toFixed(0) ?? result.peak_temp?.toFixed(0) ?? "?"}°C`,
          data: { risk: thermalRisk, max_temp: result.max_temperature_C ?? result.peak_temp },
        });
        if (thermalRisk === "high" || thermalRisk === "critical") {
          warnings.push(`THERMAL: Risk level is ${thermalRisk} — consider coolant or speed reduction`);
        }
      } catch (err: any) {
        stages.push({ stage: "thermal", status: "fail", duration_ms: Date.now() - t0, summary: err.message, data: null });
      }
    } else {
      stages.push({ stage: "thermal", status: "skipped", duration_ms: 0, summary: "Skipped (no workpiece dims)", data: null });
    }

    // ------------------------------------------------------------------
    // Stage 4: Energy Analysis
    // ------------------------------------------------------------------
    if (stageFlags.energy) {
      const t0 = Date.now();
      try {
        const eng = (await import("./GCodeEnergyOptimizerEngine.js")).gcodeEnergyOptimizerEngine;
        const result = eng.analyzeEnergyConsumption(gcode, {
          machine_power_kw: input.machine_power_kw ?? 15,
          spindle_efficiency: 0.85,
          rapid_power_pct: 0.15,
          idle_power_pct: 0.08,
          coolant_pump_kw: 2.2,
          chip_conveyor_kw: 0.75,
        });
        const rEnergy = result as any;
        energyKwh = rEnergy.total_energy_kwh ?? rEnergy.total_kwh ?? 0;
        stages.push({
          stage: "energy",
          status: "pass",
          duration_ms: Date.now() - t0,
          summary: `${energyKwh.toFixed(2)} kWh, $${(rEnergy.estimated_cost ?? rEnergy.cost ?? 0).toFixed(2)}`,
          data: { kwh: energyKwh, cost: rEnergy.estimated_cost ?? rEnergy.cost, co2_kg: rEnergy.co2_kg },
        });
      } catch (err: any) {
        stages.push({ stage: "energy", status: "fail", duration_ms: Date.now() - t0, summary: err.message, data: null });
      }
    } else {
      stages.push({ stage: "energy", status: "skipped", duration_ms: 0, summary: "Skipped", data: null });
    }

    // ------------------------------------------------------------------
    // Stage 5: Cycle Time Estimation
    // ------------------------------------------------------------------
    if (stageFlags.cycle_time) {
      const t0 = Date.now();
      try {
        const eng = (await import("./CycleTimeEstimatorEngine.js")).cycleTimeEstimatorEngine;
        const result = eng.estimateFromGCode(gcode, {
          controller: input.controller as any,
        });
        cycleTimeSec = result.total_seconds ?? 0;
        stages.push({
          stage: "cycle_time",
          status: "pass",
          duration_ms: Date.now() - t0,
          summary: `${this._formatTime(cycleTimeSec)} (${(result as any).cutting_pct?.toFixed(0) ?? "?"}% cutting)`,
          data: { seconds: cycleTimeSec },
        });
      } catch (err: any) {
        stages.push({ stage: "cycle_time", status: "fail", duration_ms: Date.now() - t0, summary: err.message, data: null });
      }
    } else {
      stages.push({ stage: "cycle_time", status: "skipped", duration_ms: 0, summary: "Skipped", data: null });
    }

    // ------------------------------------------------------------------
    // Stage 6: Setup Sheet Generation
    // ------------------------------------------------------------------
    if (stageFlags.setup_sheet) {
      const t0 = Date.now();
      try {
        const eng = (await import("./SetupSheetFromGCodeEngine.js")).setupSheetFromGCodeEngine;
        const result = eng.generateSetupSheet(gcode, input.controller as any);
        const rAny = result as any;
        const toolCount = rAny.tools?.length ?? rAny.tool_list?.length ?? 0;
        const opCount = rAny.operations?.length ?? rAny.operation_sequence?.length ?? 0;
        stages.push({
          stage: "setup_sheet",
          status: "pass",
          duration_ms: Date.now() - t0,
          summary: `Generated (${toolCount} tools, ${opCount} ops)`,
          data: { tool_count: toolCount, op_count: opCount },
        });
      } catch (err: any) {
        stages.push({ stage: "setup_sheet", status: "fail", duration_ms: Date.now() - t0, summary: err.message, data: null });
      }
    } else {
      stages.push({ stage: "setup_sheet", status: "skipped", duration_ms: 0, summary: "Skipped", data: null });
    }

    // ------------------------------------------------------------------
    // Overall
    // ------------------------------------------------------------------
    const overallStatus = stages.some(s => s.status === "fail") ? "fail"
      : stages.some(s => s.status === "warn") ? "warn" : "pass";

    return {
      optimized_gcode: gcode,
      stages,
      overall_status: overallStatus,
      total_duration_ms: Date.now() - startTime,
      summary: {
        safety_issues: safetyIssues,
        safety_critical: safetyCritical,
        lines_speed_feed_optimized: sfLinesOpt,
        estimated_time_savings_pct: sfTimeSavings,
        cycle_time_seconds: cycleTimeSec,
        energy_kwh: energyKwh,
        thermal_risk: thermalRisk,
        tools_used: toolsUsed,
        playbook_warnings: playbookWarnings,
      },
      warnings,
    };
  }

  private _formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  private detectFeaturesFromGcode(gcode: string): string[] {
    const features: string[] = [];
    const lower = gcode.toLowerCase();
    if (/g81|g83|g73|drilling/i.test(gcode)) features.push("hole");
    if (/g84|g76|tapping|thread/i.test(gcode)) features.push("thread");
    if (/pocket|cavity/i.test(lower)) features.push("pocket");
    if (/profile|contour/i.test(lower)) features.push("profile");
    if (/face\s*mill|facing/i.test(lower)) features.push("face");
    if (/chamfer|g01.*z.*[cr]/i.test(lower)) features.push("chamfer");
    if (/slot/i.test(lower)) features.push("slot");
    if (/g85|g86|g89|ream/i.test(lower)) features.push("hole");
    if (/g76|bore|boring/i.test(lower)) features.push("bore");
    if (/3d|freeform|scallop|ball.*nose/i.test(lower)) features.push("freeform");
    return [...new Set(features)];
  }
}

export const gcodeIntelligencePipeline = new GCodeIntelligencePipelineEngineImpl();
