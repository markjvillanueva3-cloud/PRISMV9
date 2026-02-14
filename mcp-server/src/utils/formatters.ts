/**
 * PRISM MCP Server - Response Formatter
 * Utilities for formatting tool responses in JSON and Markdown
 */

import { CHARACTER_LIMIT } from "../constants.js";
import type { Material, Machine, Tool, Alarm, Formula } from "../types.js";

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

/**
 * Create successful tool response
 */
export function successResponse(
  text: string,
  structuredContent?: unknown
): ToolResponse {
  return {
    content: [{ type: "text", text: truncateIfNeeded(text) }],
    ...(structuredContent && { structuredContent })
  };
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  offset: number,
  formatter: (items: T[]) => string
): ToolResponse {
  const hasMore = offset + items.length < total;
  
  const structured = {
    success: true,
    total,
    count: items.length,
    offset,
    items,
    has_more: hasMore,
    ...(hasMore && { next_offset: offset + items.length })
  };
  
  const text = [
    formatter(items),
    "",
    `Showing ${items.length} of ${total} results (offset: ${offset})`,
    hasMore ? `Use offset=${offset + items.length} to see more.` : ""
  ].filter(Boolean).join("\n");
  
  return successResponse(text, structured);
}

// ============================================================================
// TRUNCATION
// ============================================================================

/**
 * Truncate text if exceeds character limit
 */
export function truncateIfNeeded(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  
  const truncated = text.slice(0, limit - 100);
  return `${truncated}\n\n... [Truncated: ${text.length - limit + 100} characters omitted. Use pagination or filters to reduce results.]`;
}

// ============================================================================
// MATERIAL FORMATTERS
// ============================================================================

export function formatMaterial(material: Material, format: "json" | "markdown"): string {
  if (format === "json") {
    return JSON.stringify(material, null, 2);
  }
  
  const lines = [
    `# ${material.name}`,
    `**ID:** ${material.id}`,
    `**ISO Group:** ${material.iso_group} | **Category:** ${material.category}`,
    ""
  ];
  
  // Designation
  if (material.designation) {
    const designations = Object.entries(material.designation)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.toUpperCase()}: ${Array.isArray(v) ? v.join(", ") : v}`);
    if (designations.length) {
      lines.push("## Designations", ...designations, "");
    }
  }
  
  // Physical Properties
  lines.push(
    "## Physical Properties",
    `- Density: ${material.physical.density} g/cm³`,
    material.physical.melting_point ? `- Melting Point: ${material.physical.melting_point}°C` : "",
    ""
  );
  
  // Mechanical Properties
  lines.push("## Mechanical Properties");
  if (material.mechanical.hardness.brinell) {
    lines.push(`- Hardness: ${material.mechanical.hardness.brinell} HB`);
  }
  if (material.mechanical.tensile_strength) {
    lines.push(`- Tensile Strength: ${material.mechanical.tensile_strength} MPa`);
  }
  if (material.mechanical.yield_strength) {
    lines.push(`- Yield Strength: ${material.mechanical.yield_strength} MPa`);
  }
  lines.push("");
  
  // Machining Properties
  lines.push(
    "## Machining Properties",
    `- Machinability Rating: ${material.machining.machinability_rating}%`,
    material.machining.chip_formation ? `- Chip Formation: ${material.machining.chip_formation}` : "",
    material.machining.work_hardening_tendency ? `- Work Hardening: ${material.machining.work_hardening_tendency}` : "",
    ""
  );
  
  // Kienzle Coefficients
  if (material.kienzle) {
    lines.push(
      "## Kienzle Cutting Force Coefficients",
      `- kc1.1: ${material.kienzle.kc1_1} N/mm²`,
      `- mc: ${material.kienzle.mc}`,
      ""
    );
  }
  
  return lines.filter(Boolean).join("\n");
}

export function formatMaterialList(materials: Material[]): string {
  const rows = materials.map(m => 
    `| ${m.id} | ${m.name} | ${m.iso_group} | ${m.category} | ${m.machining.machinability_rating}% |`
  );
  
  return [
    "| ID | Name | ISO | Category | Machinability |",
    "|-----|------|-----|----------|---------------|",
    ...rows
  ].join("\n");
}

// ============================================================================
// MACHINE FORMATTERS
// ============================================================================

export function formatMachine(machine: Machine, format: "json" | "markdown"): string {
  if (format === "json") {
    return JSON.stringify(machine, null, 2);
  }
  
  return [
    `# ${machine.manufacturer} ${machine.model}`,
    `**ID:** ${machine.id}`,
    `**Type:** ${machine.type}`,
    `**Controller:** ${machine.controller.manufacturer} ${machine.controller.model}`,
    "",
    "## Work Envelope",
    `- X: ${machine.envelope.x}mm`,
    `- Y: ${machine.envelope.y}mm`,
    `- Z: ${machine.envelope.z}mm`,
    machine.envelope.a ? `- A: ${machine.envelope.a}°` : "",
    machine.envelope.b ? `- B: ${machine.envelope.b}°` : "",
    "",
    "## Spindle",
    `- Max RPM: ${machine.spindle.max_rpm.toLocaleString()}`,
    `- Power: ${machine.spindle.power} kW`,
    machine.spindle.torque ? `- Torque: ${machine.spindle.torque} Nm` : "",
    machine.spindle.taper ? `- Taper: ${machine.spindle.taper}` : "",
    "",
    machine.tool_changer ? [
      "## Tool Changer",
      `- Capacity: ${machine.tool_changer.capacity} tools`,
      machine.tool_changer.change_time ? `- Change Time: ${machine.tool_changer.change_time}s` : ""
    ].filter(Boolean).join("\n") : ""
  ].filter(Boolean).join("\n");
}

export function formatMachineList(machines: Machine[]): string {
  const rows = machines.map(m => 
    `| ${m.id} | ${m.manufacturer} | ${m.model} | ${m.type} | ${m.spindle.max_rpm.toLocaleString()} |`
  );
  
  return [
    "| ID | Manufacturer | Model | Type | Max RPM |",
    "|----|--------------|-------|------|---------|",
    ...rows
  ].join("\n");
}

// ============================================================================
// ALARM FORMATTERS
// ============================================================================

export function formatAlarm(alarm: Alarm, format: "json" | "markdown"): string {
  if (format === "json") {
    return JSON.stringify(alarm, null, 2);
  }
  
  const lines = [
    `# ${alarm.code}: ${alarm.name}`,
    `**Controller:** ${alarm.controller_family}`,
    `**Category:** ${alarm.category} | **Severity:** ${alarm.severity}`,
    alarm.safety_critical ? "⚠️ **SAFETY CRITICAL**" : "",
    "",
    "## Description",
    alarm.description,
    ""
  ];
  
  if (alarm.causes?.length) {
    lines.push("## Possible Causes", ...alarm.causes.map(c => `- ${c}`), "");
  }
  
  if (alarm.quick_fix) {
    lines.push("## Quick Fix", alarm.quick_fix, "");
  }
  
  if (alarm.detailed_fix?.length) {
    lines.push(
      "## Detailed Fix Procedure",
      ...alarm.detailed_fix.map(s => `${s.step}. ${s.action}${s.notes ? ` _(${s.notes})_` : ""}`),
      ""
    );
  }
  
  if (alarm.requires_power_cycle) {
    lines.push("⚡ **Requires power cycle after clearing**");
  }
  
  return lines.filter(Boolean).join("\n");
}

export function formatAlarmList(alarms: Alarm[]): string {
  const rows = alarms.map(a => 
    `| ${a.code} | ${a.name.slice(0, 40)} | ${a.controller_family} | ${a.severity} |`
  );
  
  return [
    "| Code | Name | Controller | Severity |",
    "|------|------|------------|----------|",
    ...rows
  ].join("\n");
}

// ============================================================================
// CALCULATION FORMATTERS
// ============================================================================

export function formatSpeedFeedResult(result: {
  rpm: number;
  feed_rate: number;
  feed_per_tooth: number;
  surface_speed: number;
  mrr: number;
  power_required: number;
  tool_life_estimate: number;
  warnings: string[];
}): string {
  const lines = [
    "# Speed & Feed Calculation Results",
    "",
    "## Recommended Parameters",
    `- **Spindle Speed:** ${Math.round(result.rpm).toLocaleString()} RPM`,
    `- **Feed Rate:** ${result.feed_rate.toFixed(0)} mm/min`,
    `- **Feed per Tooth:** ${result.feed_per_tooth.toFixed(3)} mm`,
    `- **Surface Speed:** ${result.surface_speed.toFixed(0)} m/min`,
    "",
    "## Performance Estimates",
    `- **Material Removal Rate:** ${result.mrr.toFixed(2)} cm³/min`,
    `- **Power Required:** ${result.power_required.toFixed(2)} kW`,
    `- **Tool Life Estimate:** ${result.tool_life_estimate.toFixed(0)} minutes`,
    ""
  ];
  
  if (result.warnings.length) {
    lines.push("## ⚠️ Warnings", ...result.warnings.map(w => `- ${w}`));
  }
  
  return lines.join("\n");
}

export function formatCuttingForceResult(result: {
  Fc: number;
  Ff: number;
  Fp: number;
  power: number;
}): string {
  return [
    "# Cutting Force Analysis (Kienzle Model)",
    "",
    "## Force Components",
    `- **Main Cutting Force (Fc):** ${result.Fc.toFixed(1)} N`,
    `- **Feed Force (Ff):** ${result.Ff.toFixed(1)} N`,
    `- **Passive Force (Fp):** ${result.Fp.toFixed(1)} N`,
    "",
    `## Cutting Power: ${result.power.toFixed(2)} kW`
  ].join("\n");
}

// ============================================================================
// GENERIC FORMATTERS
// ============================================================================

export function formatTable(
  headers: string[],
  rows: string[][]
): string {
  const separator = headers.map(() => "---").join(" | ");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${separator} |`,
    ...rows.map(row => `| ${row.join(" | ")} |`)
  ].join("\n");
}

export function formatKeyValue(obj: Record<string, unknown>, indent: number = 0): string {
  const prefix = "  ".repeat(indent);
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (typeof v === "object" && !Array.isArray(v)) {
        return `${prefix}**${k}:**\n${formatKeyValue(v as Record<string, unknown>, indent + 1)}`;
      }
      return `${prefix}- **${k}:** ${Array.isArray(v) ? v.join(", ") : v}`;
    })
    .join("\n");
}
