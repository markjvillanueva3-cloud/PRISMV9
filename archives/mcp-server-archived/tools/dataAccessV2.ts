/**
 * PRISM MCP Server - Data Access Tools v2
 * Uses new registry system for materials, machines, tools, alarms, formulas
 * 15 MCP tools for complete data access
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registryManager } from "../registries/index.js";
import { log } from "../utils/Logger.js";
import { DEFAULT_PAGE_SIZE, ISO_MATERIAL_GROUPS, MACHINE_TYPES, CONTROLLER_FAMILIES, ALARM_SEVERITIES, ALARM_CATEGORIES, TOOL_TYPES } from "../constants.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function successResponse(content: string, metadata?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: content }],
    metadata
  };
}

function formatAsMarkdown(title: string, data: Record<string, unknown>): string {
  let md = `## ${title}\n\n`;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      md += `### ${key}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
    } else {
      md += `- **${key}**: ${value}\n`;
    }
  }
  return md;
}

function formatAsJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const MaterialGetSchema = z.object({
  identifier: z.string().describe("Material ID (e.g., 'CS-1045-001') or name (e.g., '4140 steel')"),
  fields: z.array(z.string()).optional().describe("Specific fields to return"),
  response_format: z.enum(["json", "markdown"]).default("json").describe("Output format")
});

const MaterialSearchSchema = z.object({
  query: z.string().optional().describe("Free text search"),
  iso_group: z.enum(ISO_MATERIAL_GROUPS).optional().describe("ISO 513 group (P, M, K, N, S, H, X)"),
  category: z.string().optional().describe("Material category"),
  hardness_min: z.number().optional().describe("Minimum hardness (HB)"),
  hardness_max: z.number().optional().describe("Maximum hardness (HB)"),
  machinability_min: z.number().optional().describe("Minimum machinability rating"),
  has_kienzle: z.boolean().optional().describe("Only materials with Kienzle coefficients"),
  has_taylor: z.boolean().optional().describe("Only materials with Taylor coefficients"),
  limit: z.number().default(20).describe("Results per page"),
  offset: z.number().default(0).describe("Pagination offset"),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const MaterialCompareSchema = z.object({
  material_ids: z.array(z.string()).min(2).max(5).describe("2-5 material IDs to compare"),
  properties: z.array(z.string()).optional().describe("Specific properties to compare"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const MachineGetSchema = z.object({
  identifier: z.string().describe("Machine ID or model name (e.g., 'DMG-DMU50', 'Haas VF-2')"),
  layer: z.enum(["BASIC", "CORE", "ENHANCED", "LEVEL5"]).optional().describe("Data layer"),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const MachineSearchSchema = z.object({
  query: z.string().optional().describe("Free text search"),
  manufacturer: z.string().optional().describe("Manufacturer name"),
  type: z.enum(MACHINE_TYPES).optional().describe("Machine type"),
  controller: z.enum(CONTROLLER_FAMILIES).optional().describe("Controller family"),
  min_x_travel: z.number().optional().describe("Minimum X travel (mm)"),
  min_y_travel: z.number().optional().describe("Minimum Y travel (mm)"),
  min_z_travel: z.number().optional().describe("Minimum Z travel (mm)"),
  min_spindle_rpm: z.number().optional().describe("Minimum spindle RPM"),
  min_spindle_power: z.number().optional().describe("Minimum spindle power (kW)"),
  min_tool_capacity: z.number().optional().describe("Minimum tool changer capacity"),
  simultaneous_axes: z.number().optional().describe("Minimum simultaneous axes"),
  high_speed: z.boolean().optional().describe("High-speed machining capable"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const MachineCapabilitiesSchema = z.object({
  identifier: z.string().describe("Machine ID or model"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ToolGetSchema = z.object({
  identifier: z.string().describe("Tool ID or catalog number"),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const ToolSearchSchema = z.object({
  query: z.string().optional().describe("Free text search"),
  type: z.enum(TOOL_TYPES).optional().describe("Tool type"),
  manufacturer: z.string().optional().describe("Manufacturer"),
  material_group: z.enum(ISO_MATERIAL_GROUPS).optional().describe("Target material group"),
  diameter_min: z.number().optional().describe("Minimum diameter (mm)"),
  diameter_max: z.number().optional().describe("Maximum diameter (mm)"),
  diameter_exact: z.number().optional().describe("Exact diameter (mm)"),
  flutes: z.number().optional().describe("Number of flutes"),
  coating: z.string().optional().describe("Coating type"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const ToolRecommendSchema = z.object({
  operation: z.enum(["roughing", "finishing", "drilling", "tapping", "boring"]).describe("Operation type"),
  material_id: z.string().describe("Target material ID"),
  diameter: z.number().optional().describe("Preferred diameter (mm)"),
  depth_of_cut: z.number().optional().describe("Depth of cut (mm)"),
  surface_finish_required: z.number().optional().describe("Required Ra (µm)"),
  limit: z.number().default(5).describe("Number of recommendations"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const AlarmDecodeSchema = z.object({
  code: z.string().describe("Alarm code (e.g., 'PS0001', '100', 'EX1001')"),
  controller: z.enum(CONTROLLER_FAMILIES).optional().describe("Controller family (auto-detected if omitted)"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const AlarmSearchSchema = z.object({
  query: z.string().optional().describe("Text search in name/description"),
  controller: z.enum(CONTROLLER_FAMILIES).optional().describe("Controller family"),
  category: z.enum(ALARM_CATEGORIES).optional().describe("Alarm category"),
  severity: z.enum(ALARM_SEVERITIES).optional().describe("Severity level"),
  has_fix: z.boolean().optional().describe("Only alarms with fix procedures"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const AlarmFixSchema = z.object({
  alarm_id: z.string().describe("Alarm ID to get fix procedure for"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const FormulaGetSchema = z.object({
  formula_id: z.string().describe("Formula ID (e.g., 'F-KIENZLE-001')"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const FormulaCalculateSchema = z.object({
  formula_id: z.string().describe("Formula ID"),
  inputs: z.record(z.number()).describe("Input values as key-value pairs"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerDataAccessToolsV2(server: McpServer): void {
  
  // =========================================================================
  // MATERIAL TOOLS (3)
  // =========================================================================

  server.tool(
    "material_get",
    "Get a specific material by ID or name from the 1,047+ materials database with 127 parameters including Kienzle, Taylor, and Johnson-Cook coefficients.",
    MaterialGetSchema.shape,
    async (params) => {
      log.info(`[material_get] Looking up: ${params.identifier}`);
      
      await registryManager.initialize();
      const material = await registryManager.materials.getByIdOrName(params.identifier);
      
      if (!material) {
        return successResponse(`Material not found: ${params.identifier}`, { success: false });
      }
      
      // Filter fields if specified
      let result: any = material;
      if (params.fields && params.fields.length > 0) {
        result = {};
        for (const field of params.fields) {
          if (field in material) {
            result[field] = (material as any)[field];
          }
        }
        result.id = material.id;
        result.name = material.name;
      }
      
      const content = params.response_format === "markdown" 
        ? formatAsMarkdown(`Material: ${material.name}`, result)
        : formatAsJson(result);
      
      return successResponse(content, { 
        success: true, 
        material_id: material.id,
        has_kienzle: !!material.kienzle,
        has_taylor: !!material.taylor,
        has_johnson_cook: !!material.johnson_cook
      });
    }
  );

  server.tool(
    "material_search",
    "Search materials by ISO group (P/M/K/N/S/H/X), category, hardness range, machinability, and availability of machining coefficients.",
    MaterialSearchSchema.shape,
    async (params) => {
      log.info(`[material_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = await registryManager.materials.search({
        query: params.query,
        iso_group: params.iso_group,
        category: params.category,
        hardness_min: params.hardness_min,
        hardness_max: params.hardness_max,
        machinability_min: params.machinability_min,
        has_kienzle: params.has_kienzle,
        has_taylor: params.has_taylor,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Material Search Results\n\nFound **${results.total}** materials (showing ${results.materials.length})\n\n` +
          results.materials.map(m => `- **${m.name}** (${m.id}) - ${m.iso_group}/${m.category}, Machinability: ${m.machining?.machinability_rating || 'N/A'}%`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.materials.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "material_compare",
    "Compare 2-5 materials side by side, showing differences in properties, machining characteristics, and coefficients.",
    MaterialCompareSchema.shape,
    async (params) => {
      log.info(`[material_compare] Comparing: ${params.material_ids.join(', ')}`);
      
      await registryManager.initialize();
      const comparison = await registryManager.materials.compare(params.material_ids);
      
      if (comparison.materials.length === 0) {
        return successResponse("No materials found for comparison", { success: false });
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Material Comparison\n\n`;
        content += `| Property | ${comparison.materials.map(m => m.name).join(' | ')} |\n`;
        content += `|----------|${comparison.materials.map(() => '---').join('|')}|\n`;
        
        // Compare key properties
        const props = ['iso_group', 'category', 'physical.density', 'mechanical.hardness.brinell', 
                      'mechanical.tensile_strength', 'machining.machinability_rating', 'thermal.thermal_conductivity'];
        for (const prop of props) {
          const values = comparison.materials.map(m => {
            const parts = prop.split('.');
            let val: any = m;
            for (const p of parts) val = val?.[p];
            return val ?? 'N/A';
          });
          content += `| ${prop} | ${values.join(' | ')} |\n`;
        }
      } else {
        content = formatAsJson(comparison);
      }
      
      return successResponse(content, { 
        success: true, 
        compared: comparison.materials.length 
      });
    }
  );

  // =========================================================================
  // MACHINE TOOLS (3)
  // =========================================================================

  server.tool(
    "machine_get",
    "Get a specific CNC machine by ID or model name from 824+ machines across 43 manufacturers with full specifications.",
    MachineGetSchema.shape,
    async (params) => {
      log.info(`[machine_get] Looking up: ${params.identifier}`);
      
      await registryManager.initialize();
      const machine = registryManager.machines.getByIdOrModel(params.identifier);
      
      if (!machine) {
        return successResponse(`Machine not found: ${params.identifier}`, { success: false });
      }
      
      const content = params.response_format === "markdown"
        ? formatAsMarkdown(`${machine.manufacturer} ${machine.model}`, machine as any)
        : formatAsJson(machine);
      
      return successResponse(content, {
        success: true,
        machine_id: machine.id,
        manufacturer: machine.manufacturer,
        type: machine.type
      });
    }
  );

  server.tool(
    "machine_search",
    "Search CNC machines by manufacturer, type, controller, specifications (travel, spindle, tools), and capabilities.",
    MachineSearchSchema.shape,
    async (params) => {
      log.info(`[machine_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = registryManager.machines.search({
        query: params.query,
        manufacturer: params.manufacturer,
        type: params.type,
        controller: params.controller,
        min_x_travel: params.min_x_travel,
        min_y_travel: params.min_y_travel,
        min_z_travel: params.min_z_travel,
        min_spindle_rpm: params.min_spindle_rpm,
        min_spindle_power: params.min_spindle_power,
        min_tool_capacity: params.min_tool_capacity,
        simultaneous_axes: params.simultaneous_axes,
        high_speed: params.high_speed,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Machine Search Results\n\nFound **${results.total}** machines (showing ${results.machines.length})\n\n` +
          results.machines.map(m => `- **${m.manufacturer} ${m.model}** (${m.type}) - ${m.envelope?.x}x${m.envelope?.y}x${m.envelope?.z}mm, ${m.spindle?.max_rpm}RPM`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.machines.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "machine_capabilities",
    "Get detailed capabilities matrix for a specific machine including envelope, spindle specs, axis count, and features.",
    MachineCapabilitiesSchema.shape,
    async (params) => {
      log.info(`[machine_capabilities] Getting capabilities for: ${params.identifier}`);
      
      await registryManager.initialize();
      const capabilities = registryManager.machines.getCapabilities(params.identifier);
      
      if (!capabilities) {
        return successResponse(`Machine not found: ${params.identifier}`, { success: false });
      }
      
      const content = params.response_format === "markdown"
        ? formatAsMarkdown(`Capabilities: ${params.identifier}`, capabilities as any)
        : formatAsJson(capabilities);
      
      return successResponse(content, { success: true });
    }
  );

  // =========================================================================
  // TOOL TOOLS (3)
  // =========================================================================

  server.tool(
    "tool_get",
    "Get a specific cutting tool by ID or catalog number with full geometry, coating, and performance data.",
    ToolGetSchema.shape,
    async (params) => {
      log.info(`[tool_get] Looking up: ${params.identifier}`);
      
      await registryManager.initialize();
      const tool = await registryManager.tools.getByIdOrCatalog(params.identifier);
      
      if (!tool) {
        return successResponse(`Tool not found: ${params.identifier}`, { success: false });
      }
      
      const content = params.response_format === "markdown"
        ? formatAsMarkdown(`Tool: ${tool.manufacturer || ''} ${tool.catalog_number || tool.tool_id}`, tool as any)
        : formatAsJson(tool);
      
      return successResponse(content, {
        success: true,
        tool_id: tool.tool_id,
        type: tool.type
      });
    }
  );

  server.tool(
    "tool_search",
    "Search cutting tools by type, manufacturer, diameter, material group compatibility, coating, and flute count.",
    ToolSearchSchema.shape,
    async (params) => {
      log.info(`[tool_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = registryManager.tools.search({
        query: params.query,
        type: params.type,
        manufacturer: params.manufacturer,
        material_group: params.material_group,
        diameter_min: params.diameter_min,
        diameter_max: params.diameter_max,
        diameter_exact: params.diameter_exact,
        flutes: params.flutes,
        coating: params.coating,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Tool Search Results\n\nFound **${results.total}** tools (showing ${results.tools.length})\n\n` +
          results.tools.map(t => `- **${t.manufacturer || 'Generic'} ${t.catalog_number || t.tool_id}** - ${t.type}, Ø${t.geometry?.diameter}mm, ${t.geometry?.flutes}F`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.tools.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "tool_recommend",
    "Get AI-powered tool recommendations for a specific operation and material with scoring based on suitability.",
    ToolRecommendSchema.shape,
    async (params) => {
      log.info(`[tool_recommend] Operation: ${params.operation}, Material: ${params.material_id}`);
      
      await registryManager.initialize();
      
      // Get material to determine ISO group
      const material = await registryManager.materials.getByIdOrName(params.material_id);
      if (!material) {
        return successResponse(`Material not found: ${params.material_id}`, { success: false });
      }
      
      const recommendations = registryManager.tools.recommendTools({
        material_group: material.iso_group,
        operation: params.operation,
        diameter: params.diameter,
        limit: params.limit
      });
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Tool Recommendations\n\n`;
        content += `**Operation:** ${params.operation}\n`;
        content += `**Material:** ${material.name} (${material.iso_group})\n\n`;
        content += `### Recommended Tools\n\n`;
        recommendations.forEach((rec, i) => {
          content += `${i + 1}. **${rec.tool.manufacturer || 'Generic'} ${rec.tool.catalog_number || rec.tool.tool_id}**\n`;
          content += `   - Score: ${rec.score}/100\n`;
          content += `   - Type: ${rec.tool.type}, Diameter: ${rec.tool.geometry?.diameter}mm\n`;
          content += `   - Coating: ${rec.tool.coating?.type || 'Uncoated'}\n\n`;
        });
      } else {
        content = formatAsJson(recommendations);
      }
      
      return successResponse(content, {
        success: true,
        recommendations: recommendations.length
      });
    }
  );

  // =========================================================================
  // ALARM TOOLS (3)
  // =========================================================================

  server.tool(
    "alarm_decode",
    "Decode a CNC controller alarm code and get description, causes, and quick fix. Supports 12 controller families.",
    AlarmDecodeSchema.shape,
    async (params) => {
      log.info(`[alarm_decode] Code: ${params.code}, Controller: ${params.controller || 'auto'}`);
      
      await registryManager.initialize();
      const alarm = await registryManager.alarms.decode(params.code, params.controller);
      
      if (!alarm) {
        return successResponse(`Alarm not found: ${params.code}`, { success: false });
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ⚠️ ${alarm.name}\n\n`;
        content += `**Code:** ${alarm.code}\n`;
        content += `**Controller:** ${alarm.controller_family}\n`;
        content += `**Category:** ${alarm.category}\n`;
        content += `**Severity:** ${alarm.severity}\n\n`;
        content += `### Description\n${alarm.description}\n\n`;
        if (alarm.causes?.length) {
          content += `### Possible Causes\n${alarm.causes.map(c => `- ${c}`).join('\n')}\n\n`;
        }
        if (alarm.quick_fix) {
          content += `### Quick Fix\n${alarm.quick_fix}\n\n`;
        }
        if (alarm.requires_power_cycle) {
          content += `⚡ **Requires power cycle**\n`;
        }
      } else {
        content = formatAsJson(alarm);
      }
      
      return successResponse(content, {
        success: true,
        alarm_id: alarm.alarm_id,
        severity: alarm.severity,
        has_fix: !!alarm.quick_fix || (alarm.fix_procedures?.length || 0) > 0
      });
    }
  );

  server.tool(
    "alarm_search",
    "Search controller alarms by text, controller family, category, and severity level.",
    AlarmSearchSchema.shape,
    async (params) => {
      log.info(`[alarm_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = await registryManager.alarms.search({
        query: params.query,
        controller: params.controller,
        category: params.category,
        severity: params.severity,
        has_fix: params.has_fix,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Alarm Search Results\n\nFound **${results.total}** alarms (showing ${results.alarms.length})\n\n` +
          results.alarms.map(a => `- **${a.code}** (${a.controller_family}) - ${a.name} [${a.severity}]`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.alarms.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "alarm_fix",
    "Get detailed fix procedure for a specific alarm including step-by-step instructions and safety warnings.",
    AlarmFixSchema.shape,
    async (params) => {
      log.info(`[alarm_fix] Getting fix for: ${params.alarm_id}`);
      
      await registryManager.initialize();
      const alarm = await registryManager.alarms.get(params.alarm_id);
      
      if (!alarm) {
        return successResponse(`Alarm not found: ${params.alarm_id}`, { success: false });
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Fix Procedure: ${alarm.name}\n\n`;
        content += `**Alarm Code:** ${alarm.code}\n`;
        content += `**Controller:** ${alarm.controller_family}\n\n`;
        
        if (alarm.quick_fix) {
          content += `### Quick Fix\n${alarm.quick_fix}\n\n`;
        }
        
        if (alarm.fix_procedures?.length) {
          content += `### Detailed Steps\n\n`;
          alarm.fix_procedures.forEach((step, i) => {
            content += `**Step ${step.step || i + 1}:** ${step.action}\n`;
            if (step.details) content += `   ${step.details}\n`;
            if (step.safety_warning) content += `   ⚠️ ${step.safety_warning}\n`;
            content += '\n';
          });
        }
        
        if (alarm.related_alarms?.length) {
          content += `### Related Alarms\n${alarm.related_alarms.map(a => `- ${a}`).join('\n')}\n`;
        }
      } else {
        content = formatAsJson({
          alarm_id: alarm.alarm_id,
          name: alarm.name,
          quick_fix: alarm.quick_fix,
          fix_procedures: alarm.fix_procedures,
          related_alarms: alarm.related_alarms
        });
      }
      
      return successResponse(content, {
        success: true,
        has_detailed_fix: (alarm.fix_procedures?.length || 0) > 0
      });
    }
  );

  // =========================================================================
  // FORMULA TOOLS (3)
  // =========================================================================

  server.tool(
    "formula_get",
    "Get a specific manufacturing formula with equation, parameters, and usage examples.",
    FormulaGetSchema.shape,
    async (params) => {
      log.info(`[formula_get] Looking up: ${params.formula_id}`);
      
      await registryManager.initialize();
      const formula = await registryManager.formulas.getFormula(params.formula_id);
      
      if (!formula) {
        return successResponse(`Formula not found: ${params.formula_id}`, { success: false });
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ${formula.name}\n\n`;
        content += `**ID:** ${formula.formula_id}\n`;
        content += `**Domain:** ${formula.domain}\n`;
        content += `**Category:** ${formula.category}\n\n`;
        content += `### Equation\n\`\`\`\n${formula.equation_plain}\n\`\`\`\n\n`;
        content += `### Parameters\n`;
        formula.parameters.forEach(p => {
          content += `- **${p.symbol}** (${p.name}): ${p.description} [${p.unit}]`;
          if (p.range) content += ` Range: ${p.range.min}-${p.range.max}`;
          content += '\n';
        });
        if (formula.description) {
          content += `\n### Description\n${formula.description}\n`;
        }
        if (formula.examples?.length) {
          content += `\n### Example\n`;
          const ex = formula.examples[0];
          content += `Inputs: ${JSON.stringify(ex.inputs)}\n`;
          content += `Output: ${ex.output}\n`;
        }
      } else {
        content = formatAsJson(formula);
      }
      
      return successResponse(content, {
        success: true,
        formula_id: formula.formula_id,
        domain: formula.domain
      });
    }
  );

  server.tool(
    "formula_calculate",
    "Calculate a manufacturing formula with provided input values. Validates inputs and returns result with warnings.",
    FormulaCalculateSchema.shape,
    async (params) => {
      log.info(`[formula_calculate] Formula: ${params.formula_id}`, params.inputs);
      
      await registryManager.initialize();
      
      try {
        const result = await registryManager.formulas.calculate(params.formula_id, params.inputs);
        
        let content: string;
        if (params.response_format === "markdown") {
          content = `## Calculation: ${result.formula.name}\n\n`;
          content += `### Inputs\n`;
          for (const [key, value] of Object.entries(params.inputs)) {
            const param = result.formula.parameters.find(p => p.name === key);
            content += `- **${param?.symbol || key}** = ${value} ${param?.unit || ''}\n`;
          }
          content += `\n### Result\n`;
          const outputParam = result.formula.parameters.find(p => p.type === "output");
          content += `**${outputParam?.symbol || 'Result'}** = **${result.result.toFixed(4)}** ${outputParam?.unit || ''}\n`;
          
          if (result.validation.warnings.length > 0) {
            content += `\n### Warnings\n${result.validation.warnings.map(w => `⚠️ ${w}`).join('\n')}\n`;
          }
          if (result.validation.errors.length > 0) {
            content += `\n### Errors\n${result.validation.errors.map(e => `❌ ${e}`).join('\n')}\n`;
          }
        } else {
          content = formatAsJson({
            formula_id: params.formula_id,
            inputs: params.inputs,
            result: result.result,
            validation: result.validation
          });
        }
        
        return successResponse(content, {
          success: result.validation.valid,
          result: result.result,
          warnings: result.validation.warnings.length,
          errors: result.validation.errors.length
        });
      } catch (error: any) {
        return successResponse(`Calculation error: ${error.message}`, { success: false });
      }
    }
  );

  log.info("[dataAccessV2] Registered 15 data access tools using registries");
}
