/**
 * PRISM MCP Server - Advanced Calculation Tools
 * Stability analysis, thermal modeling, and optimization
 * 
 * Tools (6):
 * - calc_stability: Chatter prediction / stability lobes
 * - calc_deflection: Tool deflection analysis
 * - calc_thermal: Cutting temperature prediction
 * - calc_cost_optimize: Minimum cost speed calculation
 * - calc_multi_optimize: Multi-objective optimization
 * - calc_productivity: Maximum productivity analysis
 * 
 * SAFETY CRITICAL: Chatter causes tool breakage and poor quality
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  type ModalParameters,
  type OptimizationConstraints,
  type OptimizationWeights,
  type CostParameters
} from "../engines/AdvancedCalculations.js";

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

const StabilitySchema = z.object({
  natural_frequency: z.number().min(100).max(10000).describe("Natural frequency fn [Hz]"),
  damping_ratio: z.number().min(0.01).max(0.15).describe("Damping ratio ζ (0.02-0.05 typical)"),
  stiffness: z.number().min(1e6).max(1e10).describe("System stiffness k [N/m]"),
  specific_force: z.number().min(500).max(5000).describe("Specific cutting force kc [N/mm²]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of cutting teeth"),
  current_depth: z.number().optional().describe("Current axial depth [mm] for stability check"),
  current_speed: z.number().optional().describe("Current spindle speed [rpm] for stability check"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const DeflectionSchema = z.object({
  cutting_force: z.number().min(1).max(50000).describe("Resultant cutting force [N]"),
  tool_diameter: z.number().min(1).max(100).describe("Tool diameter [mm]"),
  overhang_length: z.number().min(10).max(200).describe("Tool overhang from holder [mm]"),
  youngs_modulus: z.number().default(600).describe("Young's modulus [GPa] (carbide=600, HSS=210)"),
  runout: z.number().default(0.005).describe("Tool runout [mm]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ThermalSchema = z.object({
  cutting_speed: z.number().min(1).max(1000).describe("Cutting speed Vc [m/min]"),
  feed: z.number().min(0.01).max(1).describe("Feed per tooth [mm]"),
  depth: z.number().min(0.1).max(20).describe("Axial depth [mm]"),
  specific_force: z.number().min(500).max(5000).describe("Specific cutting force kc [N/mm²]"),
  thermal_conductivity: z.number().default(50).describe("Workpiece thermal conductivity [W/m·K]"),
  workpiece_length: z.number().optional().describe("Workpiece length [mm] for thermal expansion calc"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const CostOptimizeSchema = z.object({
  taylor_C: z.number().min(50).max(2000).describe("Taylor constant C"),
  taylor_n: z.number().min(0.1).max(0.5).describe("Taylor exponent n"),
  machine_rate: z.number().min(0.1).max(10).describe("Machine rate [$/min]"),
  tool_cost: z.number().min(1).max(500).describe("Tool cost [$/tool]"),
  tool_change_time: z.number().min(0.5).max(30).describe("Tool change time [min]"),
  volume_to_remove: z.number().optional().describe("Volume to machine [mm³]"),
  mrr_at_ref: z.number().optional().describe("MRR at 100 m/min reference [mm³/min]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const MultiOptimizeSchema = z.object({
  material_kc: z.number().min(500).max(5000).describe("Specific cutting force kc [N/mm²]"),
  taylor_C: z.number().min(50).max(2000).describe("Taylor constant C"),
  taylor_n: z.number().min(0.1).max(0.5).describe("Taylor exponent n"),
  tool_diameter: z.number().min(1).max(100).describe("Tool diameter [mm]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of teeth"),
  weight_productivity: z.number().min(0).max(1).default(0.3).describe("Weight for MRR (0-1)"),
  weight_cost: z.number().min(0).max(1).default(0.3).describe("Weight for cost (0-1)"),
  weight_quality: z.number().min(0).max(1).default(0.2).describe("Weight for surface finish (0-1)"),
  weight_tool_life: z.number().min(0).max(1).default(0.2).describe("Weight for tool life (0-1)"),
  max_power: z.number().optional().describe("Max power constraint [kW]"),
  max_force: z.number().optional().describe("Max force constraint [N]"),
  min_tool_life: z.number().optional().describe("Min tool life constraint [min]"),
  max_surface_finish: z.number().optional().describe("Max Ra constraint [μm]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ProductivitySchema = z.object({
  cutting_speed: z.number().min(1).max(1000).describe("Cutting speed Vc [m/min]"),
  feed_per_tooth: z.number().min(0.01).max(1).describe("Feed per tooth fz [mm]"),
  axial_depth: z.number().min(0.1).max(50).describe("Axial depth ap [mm]"),
  radial_depth: z.number().min(0.1).max(100).describe("Radial depth ae [mm]"),
  tool_diameter: z.number().min(1).max(100).describe("Tool diameter [mm]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of teeth"),
  taylor_C: z.number().optional().describe("Taylor C for tool life calc"),
  taylor_n: z.number().optional().describe("Taylor n for tool life calc"),
  tool_cost: z.number().optional().describe("Tool cost [$] for economics"),
  machine_rate: z.number().optional().describe("Machine rate [$/min]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerAdvancedCalculationsV2(server: McpServer): void {

  // =========================================================================
  // STABILITY ANALYSIS
  // =========================================================================

  server.tool(
    "calc_stability",
    "Calculate stability lobe diagram for chatter prediction. CRITICAL for preventing tool breakage and poor surface finish.",
    StabilitySchema.shape,
    async (params) => {
      log.info(`[calc_stability] fn=${params.natural_frequency}Hz, ζ=${params.damping_ratio}`);
      
      const modal: ModalParameters = {
        natural_frequency: params.natural_frequency,
        damping_ratio: params.damping_ratio,
        stiffness: params.stiffness
      };
      
      const result = calculateStabilityLobes(
        modal,
        params.specific_force,
        params.number_of_teeth,
        params.current_depth,
        params.current_speed
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Stability Analysis (Chatter Prediction)\n\n`;
        content += `### Modal Parameters\n`;
        content += `- Natural Frequency: **${params.natural_frequency} Hz**\n`;
        content += `- Damping Ratio: **${params.damping_ratio}**\n`;
        content += `- Stiffness: **${(params.stiffness / 1e6).toFixed(1)} MN/m**\n`;
        content += `- Specific Force: **${params.specific_force} N/mm²**\n`;
        content += `- Number of Teeth: **${params.number_of_teeth}**\n\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Critical Depth (b_lim)** | **${result.critical_depth}** | mm |\n`;
        content += `| Chatter Frequency | ${result.chatter_frequency} | Hz |\n`;
        
        if (params.current_depth !== undefined) {
          const status = result.is_stable ? "✅ STABLE" : "❌ UNSTABLE";
          content += `| Current Status | ${status} | - |\n`;
          content += `| Stability Margin | ${result.margin_percent}% | - |\n`;
        }
        content += `\n`;
        
        content += `### Stability Lobes (First 5)\n`;
        content += `| Lobe | Speed Min | Speed Max | Depth Limit |\n`;
        content += `|------|-----------|-----------|-------------|\n`;
        result.stability_lobes.slice(0, 5).forEach(lobe => {
          content += `| ${lobe.lobe_number} | ${lobe.speed_min} rpm | ${lobe.speed_max} rpm | ${lobe.depth_limit} mm |\n`;
        });
        content += `\n`;
        
        content += `### Recommended Stable Speeds\n`;
        content += `${result.spindle_speeds.slice(0, 5).join(', ')} rpm\n\n`;
        
        content += `### Theory\n`;
        content += `Regenerative chatter occurs when the tool encounters waviness from previous cuts, `;
        content += `creating a feedback loop. The stability boundary depends on the system's modal parameters.\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, critical_depth: result.critical_depth, is_stable: result.is_stable });
    }
  );

  // =========================================================================
  // DEFLECTION ANALYSIS
  // =========================================================================

  server.tool(
    "calc_deflection",
    "Calculate tool deflection under cutting forces. Affects dimensional accuracy and surface finish.",
    DeflectionSchema.shape,
    async (params) => {
      log.info(`[calc_deflection] F=${params.cutting_force}N, D=${params.tool_diameter}mm, L=${params.overhang_length}mm`);
      
      const result = calculateToolDeflection(
        params.cutting_force,
        params.tool_diameter,
        params.overhang_length,
        params.youngs_modulus,
        params.runout
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Tool Deflection Analysis\n\n`;
        content += `### Input\n`;
        content += `- Cutting Force: **${params.cutting_force} N**\n`;
        content += `- Tool Diameter: **${params.tool_diameter} mm**\n`;
        content += `- Overhang Length: **${params.overhang_length} mm**\n`;
        content += `- L/D Ratio: **${(params.overhang_length / params.tool_diameter).toFixed(1)}**\n`;
        content += `- Young's Modulus: ${params.youngs_modulus} GPa\n`;
        content += `- Runout: ${params.runout} mm\n\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Static Deflection | ${result.static_deflection} | mm |\n`;
        content += `| **Dynamic Deflection** | **${result.dynamic_deflection}** | mm |\n`;
        content += `| **Surface Error** | **${result.surface_error}** | mm |\n`;
        content += `| Max Force Before Failure | ${result.max_force_before_failure} | N |\n`;
        content += `| Safety Factor | ${result.safety_factor} | - |\n\n`;
        
        content += `### L/D Ratio Guidelines\n`;
        content += `- **< 3:1**: Excellent rigidity\n`;
        content += `- **3-4:1**: Good for most operations\n`;
        content += `- **4-5:1**: Use with caution, reduce feeds\n`;
        content += `- **> 5:1**: Risk of chatter and poor finish\n\n`;
        
        content += `### Equation\n`;
        content += `\`δ = F × L³ / (3 × E × I)\`\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, deflection: result.dynamic_deflection });
    }
  );

  // =========================================================================
  // THERMAL ANALYSIS
  // =========================================================================

  server.tool(
    "calc_thermal",
    "Calculate cutting temperature and thermal effects. High temperatures cause rapid tool wear.",
    ThermalSchema.shape,
    async (params) => {
      log.info(`[calc_thermal] Vc=${params.cutting_speed}, f=${params.feed}, ap=${params.depth}`);
      
      const result = calculateCuttingTemperature(
        params.cutting_speed,
        params.feed,
        params.depth,
        params.specific_force,
        params.thermal_conductivity,
        params.workpiece_length
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Thermal Analysis\n\n`;
        content += `### Input\n`;
        content += `- Cutting Speed: **${params.cutting_speed} m/min**\n`;
        content += `- Feed: **${params.feed} mm**\n`;
        content += `- Depth: **${params.depth} mm**\n`;
        content += `- Specific Force: ${params.specific_force} N/mm²\n`;
        content += `- Thermal Conductivity: ${params.thermal_conductivity} W/m·K\n\n`;
        
        content += `### Temperature Results\n`;
        content += `| Location | Temperature | Notes |\n`;
        content += `|----------|-------------|-------|\n`;
        content += `| **Cutting Zone** | **${result.cutting_temperature}°C** | Primary concern |\n`;
        content += `| Chip | ${result.chip_temperature}°C | Hottest region |\n`;
        content += `| Tool | ${result.tool_temperature}°C | Affects wear |\n`;
        content += `| Workpiece | ${result.workpiece_temperature}°C | Affects dimensions |\n\n`;
        
        content += `### Heat Partition\n`;
        content += `- Chip: **${result.heat_partition.chip}%**\n`;
        content += `- Tool: ${result.heat_partition.tool}%\n`;
        content += `- Workpiece: ${result.heat_partition.workpiece}%\n\n`;
        
        if (params.workpiece_length) {
          content += `### Thermal Expansion\n`;
          content += `- Workpiece expansion: **${result.thermal_expansion} mm**\n\n`;
        }
        
        content += `### Temperature Limits (Carbide Tools)\n`;
        content += `- Safe: < 400°C\n`;
        content += `- Caution: 400-600°C (monitor wear)\n`;
        content += `- Danger: > 600°C (rapid wear/failure)\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, temperature: result.cutting_temperature });
    }
  );

  // =========================================================================
  // COST OPTIMIZATION
  // =========================================================================

  server.tool(
    "calc_cost_optimize",
    "Calculate minimum cost cutting speed. Balances machining time vs tool wear.",
    CostOptimizeSchema.shape,
    async (params) => {
      log.info(`[calc_cost_optimize] C=${params.taylor_C}, n=${params.taylor_n}`);
      
      const costParams: CostParameters = {
        machine_rate: params.machine_rate,
        tool_cost: params.tool_cost,
        tool_change_time: params.tool_change_time
      };
      
      const result = calculateMinimumCostSpeed(
        params.taylor_C,
        params.taylor_n,
        costParams,
        params.volume_to_remove,
        params.mrr_at_ref
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Cost Optimization Analysis\n\n`;
        content += `### Input Parameters\n`;
        content += `- Taylor C: ${params.taylor_C}\n`;
        content += `- Taylor n: ${params.taylor_n}\n`;
        content += `- Machine Rate: $${params.machine_rate}/min\n`;
        content += `- Tool Cost: $${params.tool_cost}/tool\n`;
        content += `- Tool Change Time: ${params.tool_change_time} min\n\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Optimal Speed (Min Cost)** | **${result.optimal_speed}** | m/min |\n`;
        if (result.cost_per_part !== undefined) {
          content += `| Cost per Part | $${result.cost_per_part} | $ |\n`;
        }
        if (result.tool_changes !== undefined) {
          content += `| Tool Changes | ${result.tool_changes} | - |\n`;
        }
        content += `\n`;
        
        content += `### Theory\n`;
        content += `The minimum cost speed balances two opposing costs:\n`;
        content += `- **Higher speed** → Less machining time, more tool changes\n`;
        content += `- **Lower speed** → More machining time, fewer tool changes\n\n`;
        
        content += `### Equation\n`;
        content += `\`Vc_opt = C × [(1/n - 1) × (Ct + tc×Cm) / Cm]^n\`\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, optimal_speed: result.optimal_speed });
    }
  );

  // =========================================================================
  // MULTI-OBJECTIVE OPTIMIZATION
  // =========================================================================

  server.tool(
    "calc_multi_optimize",
    "Multi-objective optimization balancing productivity, cost, quality, and tool life.",
    MultiOptimizeSchema.shape,
    async (params) => {
      log.info(`[calc_multi_optimize] kc=${params.material_kc}, D=${params.tool_diameter}`);
      
      const constraints: OptimizationConstraints = {
        max_power: params.max_power,
        max_force: params.max_force,
        min_tool_life: params.min_tool_life,
        max_surface_finish: params.max_surface_finish
      };
      
      const weights: OptimizationWeights = {
        productivity: params.weight_productivity,
        cost: params.weight_cost,
        quality: params.weight_quality,
        tool_life: params.weight_tool_life
      };
      
      const result = optimizeCuttingParameters(
        constraints,
        weights,
        params.material_kc,
        params.taylor_C,
        params.taylor_n,
        params.tool_diameter,
        params.number_of_teeth
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Multi-Objective Optimization\n\n`;
        content += `### Objective Weights\n`;
        content += `| Objective | Weight |\n`;
        content += `|-----------|--------|\n`;
        content += `| Productivity (MRR) | ${(params.weight_productivity * 100).toFixed(0)}% |\n`;
        content += `| Cost | ${(params.weight_cost * 100).toFixed(0)}% |\n`;
        content += `| Quality (Ra) | ${(params.weight_quality * 100).toFixed(0)}% |\n`;
        content += `| Tool Life | ${(params.weight_tool_life * 100).toFixed(0)}% |\n\n`;
        
        if (params.max_power || params.max_force || params.min_tool_life || params.max_surface_finish) {
          content += `### Constraints\n`;
          if (params.max_power) content += `- Max Power: ${params.max_power} kW\n`;
          if (params.max_force) content += `- Max Force: ${params.max_force} N\n`;
          if (params.min_tool_life) content += `- Min Tool Life: ${params.min_tool_life} min\n`;
          if (params.max_surface_finish) content += `- Max Ra: ${params.max_surface_finish} μm\n`;
          content += `\n`;
        }
        
        content += `### Optimal Parameters\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Cutting Speed** | **${result.optimal_speed}** | m/min |\n`;
        content += `| **Feed per Tooth** | **${result.optimal_feed}** | mm |\n`;
        content += `| **Axial Depth** | **${result.optimal_depth}** | mm |\n\n`;
        
        content += `### Objective Values at Optimum\n`;
        content += `| Objective | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| MRR | ${result.objective_values.mrr} | cm³/min |\n`;
        content += `| Cost/Part | $${result.objective_values.cost_per_part} | $ |\n`;
        content += `| Tool Life | ${result.objective_values.tool_life} | min |\n`;
        content += `| Surface Finish | ${result.objective_values.surface_finish} | μm |\n`;
        content += `| Power | ${result.objective_values.power} | kW |\n\n`;
        
        content += `### Optimization Info\n`;
        content += `- Iterations: ${result.iterations}\n`;
        content += `- Pareto Optimal: ${result.pareto_optimal ? 'Yes' : 'No'}\n`;
        content += `- Constraints Satisfied: ${result.constraints_satisfied ? 'Yes' : 'No'}\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, ...result });
    }
  );

  // =========================================================================
  // PRODUCTIVITY ANALYSIS
  // =========================================================================

  server.tool(
    "calc_productivity",
    "Comprehensive productivity analysis including MRR, tool life, and economics.",
    ProductivitySchema.shape,
    async (params) => {
      log.info(`[calc_productivity] Vc=${params.cutting_speed}, fz=${params.feed_per_tooth}`);
      
      // Calculate derived parameters
      const spindle_speed = (1000 * params.cutting_speed) / (Math.PI * params.tool_diameter);
      const feed_rate = params.feed_per_tooth * params.number_of_teeth * spindle_speed;
      const mrr_mm3 = params.axial_depth * params.radial_depth * feed_rate;
      const mrr_cm3 = mrr_mm3 / 1000;
      
      // Tool life if Taylor coefficients provided
      let tool_life: number | undefined;
      if (params.taylor_C && params.taylor_n) {
        tool_life = Math.pow(params.taylor_C / params.cutting_speed, 1 / params.taylor_n);
      }
      
      // Economics if costs provided
      let cost_per_minute: number | undefined;
      let parts_per_tool: number | undefined;
      if (params.machine_rate && params.tool_cost && tool_life) {
        cost_per_minute = params.machine_rate + (params.tool_cost / tool_life);
        // Assuming 1 cm³ removed per part as baseline
        parts_per_tool = tool_life * mrr_cm3;
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Productivity Analysis\n\n`;
        content += `### Input Parameters\n`;
        content += `- Cutting Speed: **${params.cutting_speed} m/min**\n`;
        content += `- Feed per Tooth: **${params.feed_per_tooth} mm**\n`;
        content += `- Axial Depth: **${params.axial_depth} mm**\n`;
        content += `- Radial Depth: **${params.radial_depth} mm**\n`;
        content += `- Tool Diameter: ${params.tool_diameter} mm\n`;
        content += `- Number of Teeth: ${params.number_of_teeth}\n\n`;
        
        content += `### Calculated Parameters\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Spindle Speed | ${spindle_speed.toFixed(0)} | rpm |\n`;
        content += `| Feed Rate | ${feed_rate.toFixed(0)} | mm/min |\n`;
        content += `| **MRR** | **${mrr_cm3.toFixed(1)}** | cm³/min |\n`;
        content += `| MRR | ${mrr_mm3.toFixed(0)} | mm³/min |\n`;
        
        if (tool_life !== undefined) {
          content += `| Tool Life | ${tool_life.toFixed(1)} | min |\n`;
        }
        if (cost_per_minute !== undefined) {
          content += `| Cost Rate | $${cost_per_minute.toFixed(2)} | /min |\n`;
        }
        if (parts_per_tool !== undefined) {
          content += `| Volume/Tool Life | ${parts_per_tool.toFixed(0)} | cm³ |\n`;
        }
        content += `\n`;
        
        content += `### Productivity Benchmarks\n`;
        content += `- Low: < 10 cm³/min\n`;
        content += `- Normal: 10-50 cm³/min\n`;
        content += `- High: 50-100 cm³/min\n`;
        content += `- HSM: > 100 cm³/min\n`;
      } else {
        content = formatAsJson({
          input: params,
          result: {
            spindle_speed: Math.round(spindle_speed),
            feed_rate: Math.round(feed_rate),
            mrr_cm3: Math.round(mrr_cm3 * 10) / 10,
            mrr_mm3: Math.round(mrr_mm3),
            tool_life,
            cost_per_minute,
            parts_per_tool
          }
        });
      }
      
      return successResponse(content, { success: true, mrr: mrr_cm3 });
    }
  );

  log.info("[advanced_calculations] Registered 6 advanced calculation tools V2");
}
