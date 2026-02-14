/**
 * PRISM MCP Server - Toolpath & CAM Calculation Tools
 * MCP tools for toolpath strategy optimization
 * 
 * Tools (7):
 * - calc_engagement: Tool engagement angle analysis
 * - calc_trochoidal: Trochoidal/adaptive milling parameters
 * - calc_hsm: HSM strategy parameters
 * - calc_scallop: Scallop height for 3D finishing
 * - calc_stepover: Optimal stepover calculation
 * - calc_cycle_time: Machining cycle time estimation
 * - calc_arc_fit: Arc fitting and tolerance analysis
 * 
 * For CAM programming and toolpath optimization
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import {
  calculateEngagementAngle,
  calculateTrochoidalParams,
  calculateHSMParams,
  calculateScallopHeight,
  calculateOptimalStepover,
  estimateCycleTime,
  calculateArcFitting
} from "../engines/ToolpathCalculations.js";

// ============================================================================
// HELPERS
// ============================================================================

function successResponse(content: string, metadata?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: content }],
    metadata
  };
}

function formatAsJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================================
// SCHEMAS
// ============================================================================

const EngagementSchema = z.object({
  tool_diameter: z.number().min(0.5).max(100).describe("Tool diameter D [mm]"),
  radial_depth: z.number().min(0.01).max(100).describe("Radial depth of cut ae [mm]"),
  feed_per_tooth: z.number().min(0.001).max(1).describe("Feed per tooth fz [mm]"),
  is_climb: z.boolean().default(true).describe("True for climb milling, false for conventional"),
  cutting_speed: z.number().optional().describe("Cutting speed Vc [m/min] for chip thinning calc"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const TrochoidalSchema = z.object({
  tool_diameter: z.number().min(1).max(50).describe("Tool diameter [mm]"),
  slot_width: z.number().min(1).max(200).describe("Width of slot/pocket [mm]"),
  axial_depth: z.number().min(0.1).max(100).describe("Axial depth of cut [mm]"),
  cutting_speed: z.number().min(10).max(500).describe("Target cutting speed [m/min]"),
  feed_per_tooth: z.number().min(0.01).max(0.5).describe("Feed per tooth [mm]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of cutting teeth"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HSMSchema = z.object({
  tool_diameter: z.number().min(1).max(50).describe("Tool diameter [mm]"),
  programmed_feedrate: z.number().min(100).max(30000).describe("Programmed feed rate [mm/min]"),
  machine_max_accel: z.number().default(5).describe("Machine max acceleration [m/s²]"),
  tolerance: z.number().default(0.01).describe("Part tolerance [mm]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ScallopSchema = z.object({
  tool_radius: z.number().min(0.5).max(25).describe("Tool/nose radius [mm]"),
  stepover: z.number().min(0.01).max(50).describe("Stepover between passes [mm]"),
  surface_width: z.number().min(1).max(1000).describe("Total width to machine [mm]"),
  feed_rate: z.number().min(100).max(10000).describe("Feed rate [mm/min]"),
  is_ball_nose: z.boolean().default(true).describe("True for ball nose, false for flat"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const StepoverSchema = z.object({
  tool_diameter: z.number().min(1).max(100).describe("Tool diameter [mm]"),
  tool_corner_radius: z.number().min(0).describe("Tool corner/nose radius [mm]"),
  target_scallop: z.number().default(0.01).describe("Target scallop height [mm]"),
  operation: z.enum(["roughing", "semi-finishing", "finishing"]).default("finishing"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const CycleTimeSchema = z.object({
  cutting_distance: z.number().min(0).describe("Total cutting distance [mm]"),
  cutting_feedrate: z.number().min(1).describe("Cutting feed rate [mm/min]"),
  rapid_distance: z.number().min(0).describe("Total rapid distance [mm]"),
  number_of_tools: z.number().int().min(1).default(1).describe("Number of tools"),
  tool_change_time: z.number().default(0.5).describe("Time per tool change [min]"),
  rapid_rate: z.number().default(30000).describe("Rapid traverse rate [mm/min]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ArcFitSchema = z.object({
  chord_tolerance: z.number().min(0.001).max(1).describe("Allowed chord error [mm]"),
  arc_radius: z.number().min(0.1).max(1000).describe("Arc radius [mm]"),
  feedrate: z.number().min(100).max(30000).describe("Programmed feedrate [mm/min]"),
  block_time: z.number().default(1).describe("Controller block processing time [ms]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerToolpathCalculationsV2(server: McpServer): void {

  // =========================================================================
  // ENGAGEMENT ANGLE
  // =========================================================================

  server.tool(
    "calc_engagement",
    "Calculate tool engagement angle and chip thinning. Critical for understanding cutting dynamics and optimizing parameters.",
    EngagementSchema.shape,
    async (params) => {
      log.info(`[calc_engagement] D=${params.tool_diameter}, ae=${params.radial_depth}`);
      
      const result = calculateEngagementAngle(
        params.tool_diameter,
        params.radial_depth,
        params.feed_per_tooth,
        params.is_climb,
        params.cutting_speed
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Tool Engagement Analysis\n\n`;
        content += `### Input\n`;
        content += `- Tool Diameter: **${params.tool_diameter} mm**\n`;
        content += `- Radial Depth: **${params.radial_depth} mm**\n`;
        content += `- Feed per Tooth: ${params.feed_per_tooth} mm\n`;
        content += `- Milling Type: ${result.is_climb_milling ? 'Climb' : 'Conventional'}\n\n`;
        
        content += `### Engagement Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Arc of Engagement** | **${result.arc_of_engagement}°** | degrees |\n`;
        content += `| Entry Angle | ${result.entry_angle}° | degrees |\n`;
        content += `| Exit Angle | ${result.exit_angle}° | degrees |\n`;
        content += `| Radial Engagement | ${result.radial_engagement_percent}% | % |\n\n`;
        
        content += `### Chip Thickness\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Max Chip Thickness | ${result.max_chip_thickness} | mm |\n`;
        content += `| Avg Chip Thickness | ${result.average_chip_thickness} | mm |\n`;
        
        if (params.cutting_speed && result.effective_cutting_speed) {
          content += `| Effective Cutting Speed | ${result.effective_cutting_speed} | m/min |\n`;
        }
        content += `\n`;
        
        content += `### Engagement Guidelines\n`;
        content += `- **< 40%**: HSM/Finishing - low forces, high speeds\n`;
        content += `- **40-70%**: Standard roughing - balanced\n`;
        content += `- **> 70%**: Heavy roughing - high forces, reduce speed\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, engagement: result.arc_of_engagement });
    }
  );

  // =========================================================================
  // TROCHOIDAL / ADAPTIVE
  // =========================================================================

  server.tool(
    "calc_trochoidal",
    "Calculate trochoidal (adaptive) milling parameters. Maintains constant engagement for higher productivity.",
    TrochoidalSchema.shape,
    async (params) => {
      log.info(`[calc_trochoidal] D=${params.tool_diameter}, slot=${params.slot_width}`);
      
      const result = calculateTrochoidalParams(
        params.tool_diameter,
        params.slot_width,
        params.axial_depth,
        params.cutting_speed,
        params.feed_per_tooth,
        params.number_of_teeth
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Trochoidal Milling Parameters\n\n`;
        content += `### Input\n`;
        content += `- Tool Diameter: **${params.tool_diameter} mm**\n`;
        content += `- Slot Width: **${params.slot_width} mm**\n`;
        content += `- Axial Depth: ${params.axial_depth} mm\n`;
        content += `- Cutting Speed: ${params.cutting_speed} m/min\n`;
        content += `- Feed per Tooth: ${params.feed_per_tooth} mm\n\n`;
        
        content += `### Trochoidal Parameters\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Trochoidal Width** | **${result.trochoidal_width}** | mm |\n`;
        content += `| Trochoidal Pitch | ${result.trochoidal_pitch} | mm |\n`;
        content += `| Arc Radius | ${result.arc_radius} | mm |\n`;
        content += `| Helix Entry Angle | ${result.helix_angle}° | degrees |\n`;
        content += `| Engagement | ${result.engagement_percent}% | % |\n\n`;
        
        content += `### Recommended Cutting Data\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Feed Rate | ${result.optimal_feed_rate} | mm/min |\n`;
        content += `| Spindle Speed | ${result.optimal_spindle} | rpm |\n`;
        content += `| **MRR** | **${result.mrr}** | cm³/min |\n\n`;
        
        content += `### Advantages of Trochoidal\n`;
        content += `- Constant engagement = consistent tool load\n`;
        content += `- Full axial depth possible\n`;
        content += `- Better chip evacuation\n`;
        content += `- Reduced heat buildup\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, mrr: result.mrr });
    }
  );

  // =========================================================================
  // HSM PARAMETERS
  // =========================================================================

  server.tool(
    "calc_hsm",
    "Calculate HSM (High-Speed Machining) strategy parameters. Optimizes toolpath for high feed rates.",
    HSMSchema.shape,
    async (params) => {
      log.info(`[calc_hsm] D=${params.tool_diameter}, Vf=${params.programmed_feedrate}`);
      
      const result = calculateHSMParams(
        params.tool_diameter,
        params.programmed_feedrate,
        params.machine_max_accel,
        params.tolerance
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## HSM Strategy Parameters\n\n`;
        content += `### Input\n`;
        content += `- Tool Diameter: **${params.tool_diameter} mm**\n`;
        content += `- Programmed Feedrate: **${params.programmed_feedrate} mm/min**\n`;
        content += `- Max Acceleration: ${params.machine_max_accel} m/s²\n`;
        content += `- Part Tolerance: ${params.tolerance} mm\n\n`;
        
        content += `### HSM Parameters\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Min Corner Radius** | **${result.corner_radius}** | mm |\n`;
        content += `| Max Direction Change | ${result.max_direction_change}° | degrees |\n`;
        content += `| Smoothing Tolerance | ${result.smoothing_tolerance} | mm |\n`;
        content += `| Arc Fitting Tolerance | ${result.arc_fitting_tolerance} | mm |\n`;
        content += `| Corner Feed Reduction | ${result.feed_rate_reduction}% | % |\n`;
        content += `| Chip Thinning Factor | ${result.chip_thinning_factor} | - |\n\n`;
        
        content += `### Recommendations\n`;
        content += `- Lead-in Type: **${result.recommended_lead_in}**\n`;
        content += `- Avoid sharp corners < ${result.corner_radius.toFixed(1)}mm radius\n`;
        content += `- Use arc fitting with ${result.arc_fitting_tolerance}mm tolerance\n`;
        content += `- Enable high-speed mode (G5.1/HPCC) if available\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, corner_radius: result.corner_radius });
    }
  );

  // =========================================================================
  // SCALLOP HEIGHT
  // =========================================================================

  server.tool(
    "calc_scallop",
    "Calculate scallop (cusp) height for 3D surface machining. Determines surface quality.",
    ScallopSchema.shape,
    async (params) => {
      log.info(`[calc_scallop] R=${params.tool_radius}, step=${params.stepover}`);
      
      const result = calculateScallopHeight(
        params.tool_radius,
        params.stepover,
        params.surface_width,
        params.feed_rate,
        params.is_ball_nose
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Scallop Height Analysis\n\n`;
        content += `### Input\n`;
        content += `- Tool Radius: **${params.tool_radius} mm**\n`;
        content += `- Stepover: **${params.stepover} mm**\n`;
        content += `- Surface Width: ${params.surface_width} mm\n`;
        content += `- Feed Rate: ${params.feed_rate} mm/min\n`;
        content += `- Tool Type: ${params.is_ball_nose ? 'Ball Nose' : 'Flat End'}\n\n`;
        
        content += `### Scallop Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Scallop Height** | **${(result.scallop_height * 1000).toFixed(1)}** | μm |\n`;
        content += `| Theoretical Ra | ${result.theoretical_Ra} | μm |\n`;
        content += `| Passes Required | ${result.passes_required} | - |\n`;
        content += `| Toolpath Length | ${result.total_toolpath_length} | mm |\n`;
        content += `| Machining Time | ${result.machining_time} | min |\n\n`;
        
        content += `### Scallop Guidelines\n`;
        content += `| Finish | Scallop Height | Stepover |\n`;
        content += `|--------|---------------|----------|\n`;
        content += `| Mirror | < 5 μm | ~5% of R |\n`;
        content += `| Fine | 5-20 μm | 10-15% of R |\n`;
        content += `| Standard | 20-50 μm | 15-25% of R |\n`;
        content += `| Rough | > 50 μm | > 25% of R |\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, scallop: result.scallop_height });
    }
  );

  // =========================================================================
  // OPTIMAL STEPOVER
  // =========================================================================

  server.tool(
    "calc_stepover",
    "Calculate optimal stepover for target surface finish. Balances quality and productivity.",
    StepoverSchema.shape,
    async (params) => {
      log.info(`[calc_stepover] D=${params.tool_diameter}, scallop=${params.target_scallop}`);
      
      const result = calculateOptimalStepover(
        params.tool_diameter,
        params.tool_corner_radius,
        params.target_scallop,
        params.operation
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Optimal Stepover Analysis\n\n`;
        content += `### Input\n`;
        content += `- Tool Diameter: **${params.tool_diameter} mm**\n`;
        content += `- Corner Radius: **${params.tool_corner_radius} mm**\n`;
        content += `- Target Scallop: ${params.target_scallop * 1000} μm\n`;
        content += `- Operation: ${params.operation}\n\n`;
        
        content += `### Stepover Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Optimal Stepover** | **${result.optimal_stepover}** | mm |\n`;
        content += `| Stepover % | ${result.stepover_percent}% | % of D |\n`;
        content += `| Actual Scallop | ${(result.scallop_height * 1000).toFixed(1)} | μm |\n`;
        content += `| Passes (100mm) | ${result.number_of_passes} | - |\n`;
        content += `| Overlap | ${result.overlap_percent}% | % |\n\n`;
        
        content += `### Recommended Strategy\n`;
        content += `**${result.strategy}**\n\n`;
        
        content += `### Stepover Guidelines by Operation\n`;
        content += `| Operation | Stepover % | Focus |\n`;
        content += `|-----------|-----------|-------|\n`;
        content += `| Roughing | 50-70% | Productivity |\n`;
        content += `| Semi-finish | 30-50% | Balance |\n`;
        content += `| Finishing | 5-25% | Quality |\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, stepover: result.optimal_stepover });
    }
  );

  // =========================================================================
  // CYCLE TIME
  // =========================================================================

  server.tool(
    "calc_cycle_time",
    "Estimate machining cycle time from toolpath distances and feed rates.",
    CycleTimeSchema.shape,
    async (params) => {
      log.info(`[calc_cycle_time] cut=${params.cutting_distance}mm, Vf=${params.cutting_feedrate}`);
      
      const result = estimateCycleTime(
        params.cutting_distance,
        params.cutting_feedrate,
        params.rapid_distance,
        params.number_of_tools,
        params.tool_change_time,
        params.rapid_rate
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Cycle Time Estimation\n\n`;
        content += `### Input\n`;
        content += `- Cutting Distance: **${params.cutting_distance} mm**\n`;
        content += `- Cutting Feedrate: **${params.cutting_feedrate} mm/min**\n`;
        content += `- Rapid Distance: ${params.rapid_distance} mm\n`;
        content += `- Number of Tools: ${params.number_of_tools}\n\n`;
        
        content += `### Time Breakdown\n`;
        content += `| Component | Time | % of Total |\n`;
        content += `|-----------|------|------------|\n`;
        content += `| Cutting | ${result.cutting_time} min | ${((result.cutting_time/result.total_time)*100).toFixed(0)}% |\n`;
        content += `| Rapid | ${result.rapid_time} min | ${((result.rapid_time/result.total_time)*100).toFixed(0)}% |\n`;
        content += `| Tool Changes | ${result.tool_change_time} min | ${((result.tool_change_time/result.total_time)*100).toFixed(0)}% |\n`;
        content += `| **Total** | **${result.total_time} min** | 100% |\n\n`;
        
        content += `### Efficiency Metrics\n`;
        content += `| Metric | Value |\n`;
        content += `|--------|-------|\n`;
        content += `| Utilization | ${result.utilization_percent}% |\n`;
        content += `| Cutting Distance | ${result.cutting_distance} mm |\n`;
        content += `| Rapid Distance | ${result.rapid_distance} mm |\n\n`;
        
        content += `### Utilization Guidelines\n`;
        content += `- **> 70%**: Excellent efficiency\n`;
        content += `- **50-70%**: Good efficiency\n`;
        content += `- **< 50%**: Consider toolpath optimization\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, total_time: result.total_time });
    }
  );

  // =========================================================================
  // ARC FITTING
  // =========================================================================

  server.tool(
    "calc_arc_fit",
    "Calculate arc fitting parameters for smooth toolpaths. Optimizes segment length vs accuracy.",
    ArcFitSchema.shape,
    async (params) => {
      log.info(`[calc_arc_fit] tol=${params.chord_tolerance}, R=${params.arc_radius}`);
      
      const result = calculateArcFitting(
        params.chord_tolerance,
        params.arc_radius,
        params.feedrate,
        params.block_time
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Arc Fitting Analysis\n\n`;
        content += `### Input\n`;
        content += `- Chord Tolerance: **${params.chord_tolerance} mm**\n`;
        content += `- Arc Radius: **${params.arc_radius} mm**\n`;
        content += `- Feedrate: ${params.feedrate} mm/min\n`;
        content += `- Block Time: ${params.block_time} ms\n\n`;
        
        content += `### Arc Fitting Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Segments per 90° | ${result.arc_segments} | - |\n`;
        content += `| Chord Error | ${result.chord_error} | mm |\n`;
        content += `| **Effective Feedrate** | **${result.effective_feedrate}** | mm/min |\n`;
        content += `| Block Processing | ${result.block_processing_time} | ms |\n`;
        content += `| Recommended Tolerance | ${result.recommended_tolerance} | mm |\n\n`;
        
        content += `### Arc Fitting Guidelines\n`;
        content += `| Application | Tolerance | Note |\n`;
        content += `|-------------|-----------|------|\n`;
        content += `| Precision | 0.001-0.005 mm | Many segments |\n`;
        content += `| Standard | 0.005-0.02 mm | Balanced |\n`;
        content += `| Roughing | 0.02-0.1 mm | Few segments |\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, effective_feedrate: result.effective_feedrate });
    }
  );

  log.info("[toolpath_calculations] Registered 7 toolpath calculation tools V2");
}
