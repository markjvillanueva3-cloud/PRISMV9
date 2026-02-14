/**
 * PRISM MCP Server - Manufacturing Calculations Tools V2
 * Physics-based calculation tools for CNC machining
 * 
 * Tools (8):
 * - calc_cutting_force: Kienzle cutting force model
 * - calc_tool_life: Taylor tool life equation
 * - calc_flow_stress: Johnson-Cook constitutive model
 * - calc_surface_finish: Surface roughness prediction
 * - calc_mrr: Material removal rate
 * - calc_speed_feed: Speed and feed recommendations
 * - calc_power: Spindle power requirements
 * - calc_chip_load: Chip load and thickness
 * 
 * SAFETY CRITICAL: All calculations include validation and warnings
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import { validateSafetyProof, fireHook, getHookHistory } from "./autoHookWrapper.js";

/**
 * Wrap a calculation handler with automatic hook firing:
 * - CALC-BEFORE-EXEC-001 before execution
 * - CALC-AFTER-EXEC-001 after execution
 * - Λ(x) proof validation on results
 * - CALC-SAFETY-VIOLATION-001 if validation fails
 */
function withCalcHooks(toolName: string, handler: (params: any) => Promise<any>): (params: any) => Promise<any> {
  return async (params: any) => {
    const startTime = Date.now();
    
    // Fire before-execution hook (non-blocking)
    fireHook('CALC-BEFORE-EXEC-001', {
      tool_name: toolName, event: 'calculation:before', inputs: params
    }).catch(() => {});
    
    // Execute the actual calculation
    const result = await handler(params);
    
    const duration = Date.now() - startTime;
    
    // Fire after-execution hook (non-blocking)
    fireHook('CALC-AFTER-EXEC-001', {
      tool_name: toolName, event: 'calculation:after', inputs: params, duration_ms: duration
    }).catch(() => {});
    
    // Run Λ(x) proof validation
    const proof = validateSafetyProof({ tool_name: toolName, inputs: params, start_time: startTime, result });
    if (!proof.is_valid) {
      fireHook('CALC-SAFETY-VIOLATION-001', {
        tool_name: toolName, event: 'safety:violation',
        score: proof.validity_score, issues: proof.issues
      }).catch(() => {});
      log.warn(`[${toolName}] Λ(x)=${proof.validity_score.toFixed(2)} — ${proof.issues.join('; ')}`);
    }
    
    return result;
  };
}
import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateJohnsonCookStress,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpeedFeed,
  getDefaultKienzle,
  getDefaultTaylor,
  SAFETY_LIMITS,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  type JohnsonCookParams
} from "../engines/ManufacturingCalculations.js";

// ============================================================================
// HELPER FUNCTIONS
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
// SCHEMA DEFINITIONS
// ============================================================================

const TOOL_MATERIALS = ["HSS", "Carbide", "Ceramic", "CBN", "Diamond"] as const;
const OPERATIONS = ["roughing", "semi-finishing", "finishing"] as const;
const MATERIAL_GROUPS = [
  "steel_low_carbon", "steel_medium_carbon", "steel_high_carbon", "steel_alloy",
  "stainless_austenitic", "stainless_martensitic", "stainless_duplex",
  "cast_iron_gray", "cast_iron_ductile", "cast_iron_malleable",
  "aluminum_wrought", "aluminum_cast", "titanium", "inconel", "copper", "brass"
] as const;

const CuttingForceSchema = z.object({
  cutting_speed: z.number().min(1).max(2000).describe("Cutting speed Vc [m/min]"),
  feed_per_tooth: z.number().min(0.001).max(2).describe("Feed per tooth fz [mm/tooth]"),
  axial_depth: z.number().min(0.01).max(100).describe("Axial depth of cut ap [mm]"),
  radial_depth: z.number().min(0.01).max(100).describe("Radial depth of cut ae [mm]"),
  tool_diameter: z.number().min(0.1).max(500).describe("Tool diameter D [mm]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of teeth z"),
  rake_angle: z.number().default(6).describe("Rake angle γ [degrees]"),
  material_group: z.enum(MATERIAL_GROUPS).optional().describe("Material group for default coefficients"),
  kc1_1: z.number().optional().describe("Kienzle kc1.1 [N/mm²] - overrides material_group"),
  mc: z.number().optional().describe("Kienzle mc exponent - overrides material_group"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ToolLifeSchema = z.object({
  cutting_speed: z.number().min(1).max(2000).describe("Cutting speed Vc [m/min]"),
  material_group: z.enum(MATERIAL_GROUPS).optional().describe("Material group for coefficients"),
  tool_material: z.enum(TOOL_MATERIALS).default("Carbide").describe("Tool material"),
  feed: z.number().optional().describe("Feed [mm] for extended model"),
  depth: z.number().optional().describe("Depth of cut [mm] for extended model"),
  taylor_C: z.number().optional().describe("Taylor C constant - override"),
  taylor_n: z.number().optional().describe("Taylor n exponent - override"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const FlowStressSchema = z.object({
  strain: z.number().min(0).max(10).describe("Plastic strain (dimensionless)"),
  strain_rate: z.number().min(0.001).describe("Strain rate [1/s]"),
  temperature: z.number().min(-50).max(2000).describe("Temperature [°C]"),
  A: z.number().describe("Johnson-Cook A (yield stress) [MPa]"),
  B: z.number().describe("Johnson-Cook B (strain hardening coeff) [MPa]"),
  n: z.number().describe("Johnson-Cook n (strain hardening exp)"),
  C: z.number().describe("Johnson-Cook C (strain rate coeff)"),
  m: z.number().describe("Johnson-Cook m (thermal softening exp)"),
  T_melt: z.number().describe("Melting temperature [°C]"),
  T_ref: z.number().default(20).describe("Reference temperature [°C]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SurfaceFinishSchema = z.object({
  feed: z.number().min(0.001).max(2).describe("Feed per rev (turning) or per tooth (milling) [mm]"),
  nose_radius: z.number().min(0.1).max(10).describe("Tool nose radius [mm]"),
  is_milling: z.boolean().default(false).describe("True for milling, false for turning"),
  radial_depth: z.number().optional().describe("Radial depth ae [mm] - required for milling"),
  tool_diameter: z.number().optional().describe("Tool diameter [mm] - required for milling"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const MRRSchema = z.object({
  cutting_speed: z.number().min(1).max(2000).describe("Cutting speed Vc [m/min]"),
  feed_per_tooth: z.number().min(0.001).max(2).describe("Feed per tooth fz [mm/tooth]"),
  axial_depth: z.number().min(0.01).max(100).describe("Axial depth ap [mm]"),
  radial_depth: z.number().min(0.01).max(100).describe("Radial depth ae [mm]"),
  tool_diameter: z.number().min(0.1).max(500).describe("Tool diameter D [mm]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of teeth z"),
  volume_to_remove: z.number().optional().describe("Volume to machine [mm³] for time calc"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SpeedFeedSchema = z.object({
  material_hardness: z.number().min(50).max(70).default(200).describe("Material hardness [HB]"),
  tool_material: z.enum(TOOL_MATERIALS).default("Carbide").describe("Tool material"),
  operation: z.enum(OPERATIONS).default("semi-finishing").describe("Operation type"),
  tool_diameter: z.number().min(0.1).max(500).describe("Tool diameter [mm]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of teeth"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const PowerSchema = z.object({
  cutting_force: z.number().min(0).describe("Main cutting force Fc [N]"),
  cutting_speed: z.number().min(1).max(2000).describe("Cutting speed Vc [m/min]"),
  tool_diameter: z.number().min(0.1).max(500).describe("Tool diameter [mm]"),
  efficiency: z.number().min(0.5).max(1.0).default(0.8).describe("Machine efficiency"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ChipLoadSchema = z.object({
  feed_rate: z.number().min(1).describe("Feed rate Vf [mm/min]"),
  spindle_speed: z.number().min(10).describe("Spindle speed n [rpm]"),
  number_of_teeth: z.number().int().min(1).max(20).describe("Number of teeth z"),
  radial_depth: z.number().optional().describe("Radial depth ae [mm]"),
  tool_diameter: z.number().optional().describe("Tool diameter D [mm]"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerManufacturingCalculationsV2(server: McpServer): void {

  // =========================================================================
  // CUTTING FORCE (KIENZLE)
  // =========================================================================

  server.tool(
    "calc_cutting_force",
    "Calculate cutting forces using the Kienzle model. Returns Fc, Ff, Fp, power, and torque. SAFETY CRITICAL.",
    CuttingForceSchema.shape,
    async (params) => {
      log.info(`[calc_cutting_force] Vc=${params.cutting_speed}, fz=${params.feed_per_tooth}`);
      
      // Build conditions
      const conditions: CuttingConditions = {
        cutting_speed: params.cutting_speed,
        feed_per_tooth: params.feed_per_tooth,
        axial_depth: params.axial_depth,
        radial_depth: params.radial_depth,
        tool_diameter: params.tool_diameter,
        number_of_teeth: params.number_of_teeth,
        rake_angle: params.rake_angle
      };
      
      // Get coefficients
      let coefficients: KienzleCoefficients;
      if (params.kc1_1 !== undefined && params.mc !== undefined) {
        coefficients = { kc1_1: params.kc1_1, mc: params.mc };
      } else if (params.material_group) {
        coefficients = getDefaultKienzle(params.material_group);
      } else {
        coefficients = getDefaultKienzle("steel_medium_carbon");
      }
      
      const result = calculateKienzleCuttingForce(conditions, coefficients);
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Cutting Force Calculation (Kienzle)\n\n`;
        content += `### Input Conditions\n`;
        content += `- Cutting Speed: **${params.cutting_speed} m/min**\n`;
        content += `- Feed per Tooth: **${params.feed_per_tooth} mm**\n`;
        content += `- Axial Depth: **${params.axial_depth} mm**\n`;
        content += `- Radial Depth: **${params.radial_depth} mm**\n`;
        content += `- Tool Diameter: **${params.tool_diameter} mm**\n`;
        content += `- Number of Teeth: **${params.number_of_teeth}**\n\n`;
        
        content += `### Kienzle Coefficients\n`;
        content += `- kc1.1: **${coefficients.kc1_1} N/mm²**\n`;
        content += `- mc: **${coefficients.mc}**\n`;
        if (coefficients.material_id) content += `- Material: ${coefficients.material_id}\n`;
        content += `\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Main Cutting Force (Fc) | **${result.Fc.toFixed(1)}** | N |\n`;
        content += `| Feed Force (Ff) | ${result.Ff.toFixed(1)} | N |\n`;
        content += `| Passive Force (Fp) | ${result.Fp.toFixed(1)} | N |\n`;
        content += `| Resultant Force | ${result.F_resultant.toFixed(1)} | N |\n`;
        content += `| Specific Force (kc) | ${result.specific_force.toFixed(0)} | N/mm² |\n`;
        content += `| Chip Thickness (h) | ${result.chip_thickness.toFixed(4)} | mm |\n`;
        content += `| **Spindle Power** | **${result.power.toFixed(2)}** | kW |\n`;
        content += `| Torque | ${result.torque.toFixed(2)} | Nm |\n\n`;
        
        content += `### Equation\n\`Fc = kc1.1 × h^(-mc) × b\`\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, coefficients, result });
      }
      
      return successResponse(content, { success: true, Fc: result.Fc, power: result.power });
    }
  );

  // =========================================================================
  // TOOL LIFE (TAYLOR)
  // =========================================================================

  server.tool(
    "calc_tool_life",
    "Calculate tool life using Taylor's equation (VT^n = C). Predicts how long a tool will last at given conditions.",
    ToolLifeSchema.shape,
    async (params) => {
      log.info(`[calc_tool_life] Vc=${params.cutting_speed}, tool=${params.tool_material}`);
      
      // Get coefficients
      let coefficients: TaylorCoefficients;
      if (params.taylor_C !== undefined && params.taylor_n !== undefined) {
        coefficients = { C: params.taylor_C, n: params.taylor_n, tool_material: params.tool_material };
      } else if (params.material_group) {
        coefficients = getDefaultTaylor(params.material_group, params.tool_material);
      } else {
        coefficients = getDefaultTaylor("steel", params.tool_material);
      }
      
      const result = calculateTaylorToolLife(
        params.cutting_speed,
        coefficients,
        params.feed,
        params.depth
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Tool Life Prediction (Taylor)\n\n`;
        content += `### Input\n`;
        content += `- Cutting Speed: **${params.cutting_speed} m/min**\n`;
        content += `- Tool Material: **${params.tool_material}**\n`;
        if (params.feed) content += `- Feed: ${params.feed} mm\n`;
        if (params.depth) content += `- Depth: ${params.depth} mm\n`;
        content += `\n`;
        
        content += `### Taylor Coefficients\n`;
        content += `- C: **${coefficients.C}**\n`;
        content += `- n: **${coefficients.n}**\n`;
        content += `\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Tool Life** | **${result.tool_life_minutes}** | minutes |\n`;
        content += `| Optimal Speed | ${result.optimal_speed} | m/min |\n\n`;
        
        content += `### Equation\n\`V × T^n = C\`  →  \`T = (C/V)^(1/n)\`\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, coefficients, result });
      }
      
      return successResponse(content, { success: true, tool_life: result.tool_life_minutes });
    }
  );

  // =========================================================================
  // FLOW STRESS (JOHNSON-COOK)
  // =========================================================================

  server.tool(
    "calc_flow_stress",
    "Calculate flow stress using Johnson-Cook constitutive model. Used for FEA simulations and chip formation analysis.",
    FlowStressSchema.shape,
    async (params) => {
      log.info(`[calc_flow_stress] ε=${params.strain}, ε̇=${params.strain_rate}, T=${params.temperature}`);
      
      const jcParams: JohnsonCookParams = {
        A: params.A,
        B: params.B,
        n: params.n,
        C: params.C,
        m: params.m,
        T_melt: params.T_melt,
        T_ref: params.T_ref
      };
      
      const result = calculateJohnsonCookStress(
        params.strain,
        params.strain_rate,
        params.temperature,
        jcParams
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Flow Stress (Johnson-Cook)\n\n`;
        content += `### Input\n`;
        content += `- Strain (ε): **${params.strain}**\n`;
        content += `- Strain Rate (ε̇): **${params.strain_rate} /s**\n`;
        content += `- Temperature: **${params.temperature} °C**\n\n`;
        
        content += `### J-C Parameters\n`;
        content += `- A: ${params.A} MPa (yield)\n`;
        content += `- B: ${params.B} MPa (hardening)\n`;
        content += `- n: ${params.n}\n`;
        content += `- C: ${params.C}\n`;
        content += `- m: ${params.m}\n`;
        content += `- T_melt: ${params.T_melt} °C\n\n`;
        
        content += `### Results\n`;
        content += `| Component | Value |\n`;
        content += `|-----------|-------|\n`;
        content += `| Strain Term | ${result.components.strain_term.toFixed(1)} |\n`;
        content += `| Rate Term | ${result.components.rate_term.toFixed(4)} |\n`;
        content += `| Thermal Term | ${result.components.thermal_term.toFixed(4)} |\n`;
        content += `| **Flow Stress** | **${result.stress.toFixed(1)} MPa** |\n\n`;
        
        content += `### Equation\n`;
        content += `\`σ = [A + B×ε^n] × [1 + C×ln(ε̇/ε̇₀)] × [1 - T*^m]\`\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, stress: result.stress });
    }
  );

  // =========================================================================
  // SURFACE FINISH
  // =========================================================================

  server.tool(
    "calc_surface_finish",
    "Predict surface roughness (Ra, Rz, Rt) based on feed and tool geometry.",
    SurfaceFinishSchema.shape,
    async (params) => {
      log.info(`[calc_surface_finish] f=${params.feed}, r=${params.nose_radius}`);
      
      const result = calculateSurfaceFinish(
        params.feed,
        params.nose_radius,
        params.is_milling,
        params.radial_depth,
        params.tool_diameter
      );
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Surface Finish Prediction\n\n`;
        content += `### Input\n`;
        content += `- Feed: **${params.feed} mm**\n`;
        content += `- Nose Radius: **${params.nose_radius} mm**\n`;
        content += `- Operation: **${params.is_milling ? 'Milling' : 'Turning'}**\n`;
        if (params.is_milling) {
          content += `- Radial Depth: ${params.radial_depth} mm\n`;
          content += `- Tool Diameter: ${params.tool_diameter} mm\n`;
        }
        content += `\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Theoretical Ra | ${result.theoretical_Ra} | μm |\n`;
        content += `| **Actual Ra** | **${result.Ra}** | μm |\n`;
        content += `| Rz | ${result.Rz} | μm |\n`;
        content += `| Rt | ${result.Rt} | μm |\n`;
        content += `| Process Factor | ${result.finish_factor} | - |\n\n`;
        
        content += `### Surface Finish Classes\n`;
        content += `- Ra < 0.8μm: Ground/lapped finish\n`;
        content += `- Ra 0.8-1.6μm: Fine finish\n`;
        content += `- Ra 1.6-3.2μm: Normal machined\n`;
        content += `- Ra 3.2-6.3μm: Medium rough\n`;
        content += `- Ra > 6.3μm: Rough machined\n\n`;
        
        if (result.warnings.length > 0) {
          content += `### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, Ra: result.Ra });
    }
  );

  // =========================================================================
  // MATERIAL REMOVAL RATE
  // =========================================================================

  server.tool(
    "calc_mrr",
    "Calculate Material Removal Rate and machining time. Essential for productivity estimation.",
    MRRSchema.shape,
    async (params) => {
      log.info(`[calc_mrr] ap=${params.axial_depth}, ae=${params.radial_depth}`);
      
      const conditions: CuttingConditions = {
        cutting_speed: params.cutting_speed,
        feed_per_tooth: params.feed_per_tooth,
        axial_depth: params.axial_depth,
        radial_depth: params.radial_depth,
        tool_diameter: params.tool_diameter,
        number_of_teeth: params.number_of_teeth
      };
      
      const result = calculateMRR(conditions, params.volume_to_remove);
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Material Removal Rate\n\n`;
        content += `### Input\n`;
        content += `- Cutting Speed: ${params.cutting_speed} m/min\n`;
        content += `- Feed per Tooth: ${params.feed_per_tooth} mm\n`;
        content += `- Axial Depth: ${params.axial_depth} mm\n`;
        content += `- Radial Depth: ${params.radial_depth} mm\n`;
        content += `- Tool Diameter: ${params.tool_diameter} mm\n`;
        content += `- Number of Teeth: ${params.number_of_teeth}\n`;
        if (params.volume_to_remove) content += `- Volume to Remove: ${params.volume_to_remove} mm³\n`;
        content += `\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Spindle Speed | ${result.spindle_speed} | rpm |\n`;
        content += `| Feed Rate | ${result.feed_rate} | mm/min |\n`;
        content += `| **MRR** | **${result.mrr}** | cm³/min |\n`;
        content += `| MRR | ${result.mrr_mm3} | mm³/min |\n`;
        if (result.machining_time) {
          content += `| **Machining Time** | **${result.machining_time}** | min |\n`;
        }
        content += `\n`;
        
        content += `### Equation\n\`MRR = ap × ae × Vf\`\n\n`;
        
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
  // SPEED & FEED RECOMMENDATIONS
  // =========================================================================

  server.tool(
    "calc_speed_feed",
    "Get recommended speeds and feeds based on material, tool, and operation type.",
    SpeedFeedSchema.shape,
    async (params) => {
      log.info(`[calc_speed_feed] ${params.tool_material}, ${params.operation}, D=${params.tool_diameter}`);
      
      const result = calculateSpeedFeed({
        material_hardness: params.material_hardness,
        tool_material: params.tool_material,
        operation: params.operation,
        tool_diameter: params.tool_diameter,
        number_of_teeth: params.number_of_teeth
      });
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Speed & Feed Recommendations\n\n`;
        content += `### Input\n`;
        content += `- Material Hardness: ${params.material_hardness} HB\n`;
        content += `- Tool Material: **${params.tool_material}**\n`;
        content += `- Operation: **${params.operation}**\n`;
        content += `- Tool Diameter: ${params.tool_diameter} mm\n`;
        content += `- Number of Teeth: ${params.number_of_teeth}\n\n`;
        
        content += `### Recommended Parameters\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Cutting Speed** | **${result.cutting_speed}** | m/min |\n`;
        content += `| **Spindle Speed** | **${result.spindle_speed}** | rpm |\n`;
        content += `| **Feed per Tooth** | **${result.feed_per_tooth}** | mm |\n`;
        content += `| **Feed Rate** | **${result.feed_rate}** | mm/min |\n`;
        content += `| Axial Depth | ${result.axial_depth} | mm |\n`;
        content += `| Radial Depth | ${result.radial_depth} | mm |\n\n`;
        
        if (result.recommendations.length > 0) {
          content += `### 💡 Recommendations\n`;
          result.recommendations.forEach(r => content += `- ${r}\n`);
        }
        
        if (result.warnings.length > 0) {
          content += `\n### ⚠️ Warnings\n`;
          result.warnings.forEach(w => content += `- ${w}\n`);
        }
      } else {
        content = formatAsJson({ input: params, result });
      }
      
      return successResponse(content, { success: true, ...result });
    }
  );

  // =========================================================================
  // POWER CALCULATION
  // =========================================================================

  server.tool(
    "calc_power",
    "Calculate spindle power and torque requirements from cutting force.",
    PowerSchema.shape,
    async (params) => {
      log.info(`[calc_power] Fc=${params.cutting_force}, Vc=${params.cutting_speed}`);
      
      // P = Fc × Vc / (60 × 1000 × η) [kW]
      const power_at_tool = (params.cutting_force * params.cutting_speed) / 60000;
      const power_at_spindle = power_at_tool / params.efficiency;
      
      // Torque: M = Fc × D / (2 × 1000) [Nm]
      const torque = (params.cutting_force * params.tool_diameter) / 2000;
      
      // Spindle speed: n = (1000 × Vc) / (π × D)
      const spindle_speed = (1000 * params.cutting_speed) / (Math.PI * params.tool_diameter);
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Power & Torque Calculation\n\n`;
        content += `### Input\n`;
        content += `- Cutting Force: ${params.cutting_force} N\n`;
        content += `- Cutting Speed: ${params.cutting_speed} m/min\n`;
        content += `- Tool Diameter: ${params.tool_diameter} mm\n`;
        content += `- Machine Efficiency: ${params.efficiency * 100}%\n\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| Power at Tool | ${power_at_tool.toFixed(2)} | kW |\n`;
        content += `| **Power at Spindle** | **${power_at_spindle.toFixed(2)}** | kW |\n`;
        content += `| **Torque** | **${torque.toFixed(2)}** | Nm |\n`;
        content += `| Spindle Speed | ${spindle_speed.toFixed(0)} | rpm |\n\n`;
        
        content += `### Equations\n`;
        content += `- \`P = Fc × Vc / (60000 × η)\`\n`;
        content += `- \`M = Fc × D / 2000\`\n`;
      } else {
        content = formatAsJson({
          input: params,
          result: { power_at_tool, power_at_spindle, torque, spindle_speed }
        });
      }
      
      return successResponse(content, { success: true, power: power_at_spindle, torque });
    }
  );

  // =========================================================================
  // CHIP LOAD
  // =========================================================================

  server.tool(
    "calc_chip_load",
    "Calculate chip load (feed per tooth) and effective chip thickness.",
    ChipLoadSchema.shape,
    async (params) => {
      log.info(`[calc_chip_load] Vf=${params.feed_rate}, n=${params.spindle_speed}`);
      
      // fz = Vf / (z × n)
      const feed_per_tooth = params.feed_rate / (params.number_of_teeth * params.spindle_speed);
      
      // Effective chip thickness for milling
      let chip_thickness = feed_per_tooth;
      if (params.radial_depth && params.tool_diameter) {
        const engagement_ratio = params.radial_depth / params.tool_diameter;
        chip_thickness = feed_per_tooth * Math.sqrt(engagement_ratio);
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Chip Load Calculation\n\n`;
        content += `### Input\n`;
        content += `- Feed Rate: ${params.feed_rate} mm/min\n`;
        content += `- Spindle Speed: ${params.spindle_speed} rpm\n`;
        content += `- Number of Teeth: ${params.number_of_teeth}\n`;
        if (params.radial_depth) content += `- Radial Depth: ${params.radial_depth} mm\n`;
        if (params.tool_diameter) content += `- Tool Diameter: ${params.tool_diameter} mm\n`;
        content += `\n`;
        
        content += `### Results\n`;
        content += `| Parameter | Value | Unit |\n`;
        content += `|-----------|-------|------|\n`;
        content += `| **Feed per Tooth (fz)** | **${feed_per_tooth.toFixed(4)}** | mm |\n`;
        content += `| Effective Chip Thickness | ${chip_thickness.toFixed(4)} | mm |\n\n`;
        
        content += `### Equation\n\`fz = Vf / (z × n)\`\n`;
      } else {
        content = formatAsJson({
          input: params,
          result: { feed_per_tooth, chip_thickness }
        });
      }
      
      return successResponse(content, { success: true, feed_per_tooth, chip_thickness });
    }
  );

  log.info("[calculations] Registered 8 manufacturing calculation tools V2");
}
