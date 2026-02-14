/**
 * ResponseTemplateEngine.ts — P3B Response Template Hooks
 * ========================================================
 * 
 * PURPOSE: Inject structured response formatting hints into dispatcher results.
 * Claude reads _response_template to format consistent, professional output
 * for common manufacturing queries (material lookup, alarm decode, calcs, etc).
 * 
 * ARCHITECTURE:
 * - Post-dispatch hook: fires AFTER dispatcher returns, BEFORE _cadence merge
 * - Adaptive sizing: full/compact/minimal based on context pressure
 * - Template matching: dispatcher+action → template selection
 * - Zero overhead: template data is ~200-500 bytes, already in the response payload
 * 
 * TEMPLATES:
 * 1. TPL-MATERIAL   — material_get results (properties, machinability, speeds)
 * 2. TPL-ALARM      — alarm_decode results (severity, causes, remediation)
 * 3. TPL-CUTTING    — cutting_force/speed_feed results (forces, power, safety)
 * 4. TPL-SPEEDFEED  — speed_feed recommendation (speed, feed, DOC, rationale)
 * 5. TPL-TOOL       — tool_recommend results (comparison, application notes)
 * 6. TPL-MACHINE    — machine_get/capabilities (specs, envelope, limitations)
 * 
 * PRESSURE ADAPTATION:
 * - <40%:  Full template (all sections, examples, notes)
 * - 40-60%: Compact template (key sections only)
 * - >60%:  Minimal template (1-line format hint)
 * - >85%:  Skip entirely (no template injection)
 * 
 * @version 1.0.0
 * @date 2026-02-10
 */

import * as fs from "fs";
import * as path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TemplateSizeLevel = "full" | "compact" | "minimal";

export interface ResponseTemplate {
  template_id: string;
  dispatcher: string;
  actions: string[];
  format: "summary" | "table" | "detail" | "comparison";
  sections: TemplateSection[];
  adaptive: boolean;
}

export interface TemplateSection {
  id: string;
  label: string;
  /** Which result fields to pull from */
  source_fields: string[];
  /** Formatting hint for Claude */
  format_hint: string;
  /** Minimum level at which this section appears */
  min_level: TemplateSizeLevel;
  /** If true, section is always shown even at minimal */
  critical: boolean;
}

export interface TemplateMatch {
  template_id: string;
  format: string;
  level: TemplateSizeLevel;
  sections: TemplateSectionOutput[];
  formatting_instructions: string;
  data_available: string[];
  _note: string;
}

export interface TemplateSectionOutput {
  label: string;
  fields: string[];
  hint: string;
}

// ─── Template Definitions ────────────────────────────────────────────────────

const TEMPLATES: ResponseTemplate[] = [
  // TPL-MATERIAL: material_get result formatting
  {
    template_id: "TPL-MATERIAL",
    dispatcher: "prism_data",
    actions: ["material_get"],
    format: "summary",
    adaptive: true,
    sections: [
      {
        id: "identity",
        label: "Material Identity",
        source_fields: ["name", "id", "iso_group", "category", "uns_number", "din_number"],
        format_hint: "Name (ISO group) — include UNS/DIN if present",
        min_level: "minimal",
        critical: true
      },
      {
        id: "properties",
        label: "Key Properties",
        source_fields: ["hardness_hrc", "hardness_hb", "tensile_strength_mpa", "yield_strength_mpa", "density", "thermal_conductivity"],
        format_hint: "Hardness, tensile strength, density — units always shown",
        min_level: "compact",
        critical: false
      },
      {
        id: "machinability",
        label: "Machinability",
        source_fields: ["machinability_rating", "machinability_notes", "chip_formation", "work_hardening_tendency"],
        format_hint: "Rating (0-100), chip formation behavior, work hardening risk",
        min_level: "compact",
        critical: true
      },
      {
        id: "cutting_data",
        label: "Recommended Cutting Data",
        source_fields: ["kienzle_kc11", "kienzle_mc", "taylor_C", "taylor_n", "recommended_speed_range", "recommended_feed_range"],
        format_hint: "Kienzle constants (kc1.1, mc) and Taylor constants (C, n) if available. Speed/feed ranges.",
        min_level: "full",
        critical: false
      },
      {
        id: "notes",
        label: "Application Notes",
        source_fields: ["machining_notes", "coolant_recommendation", "tool_coating_recommendation", "special_considerations"],
        format_hint: "Practical machining advice — coolant, coating, gotchas",
        min_level: "full",
        critical: false
      }
    ]
  },

  // TPL-ALARM: alarm_decode result formatting
  {
    template_id: "TPL-ALARM",
    dispatcher: "prism_data",
    actions: ["alarm_decode", "alarm_fix"],
    format: "detail",
    adaptive: true,
    sections: [
      {
        id: "alarm_id",
        label: "Alarm Identification",
        source_fields: ["alarm_code", "alarm_id", "name", "controller", "controller_family", "severity"],
        format_hint: "Code + name, controller family, severity level (CRITICAL/WARNING/INFO)",
        min_level: "minimal",
        critical: true
      },
      {
        id: "description",
        label: "Description",
        source_fields: ["description", "detailed_description", "affected_system"],
        format_hint: "What the alarm means in plain language",
        min_level: "compact",
        critical: true
      },
      {
        id: "causes",
        label: "Probable Causes",
        source_fields: ["probable_causes", "common_triggers", "related_conditions"],
        format_hint: "Ordered by likelihood. Include mechanical, electrical, and software causes.",
        min_level: "compact",
        critical: false
      },
      {
        id: "remediation",
        label: "Remediation Steps",
        source_fields: ["quick_fix", "remediation_steps", "reset_procedure", "preventive_actions"],
        format_hint: "Quick fix first (if safe), then detailed steps. ALWAYS include safety warnings for CRITICAL alarms.",
        min_level: "compact",
        critical: true
      },
      {
        id: "related",
        label: "Related Information",
        source_fields: ["related_alarms", "parameter_affected", "manual_reference", "technical_notes"],
        format_hint: "Related alarms that may co-occur, affected parameters, manual page refs",
        min_level: "full",
        critical: false
      }
    ]
  },

  // TPL-CUTTING: cutting_force calculation result formatting
  {
    template_id: "TPL-CUTTING",
    dispatcher: "prism_calc",
    actions: ["cutting_force"],
    format: "table",
    adaptive: true,
    sections: [
      {
        id: "forces",
        label: "Cutting Forces",
        source_fields: ["Fc", "Ft", "Fr", "F_resultant", "tangential_force", "radial_force", "axial_force", "specific_cutting_force"],
        format_hint: "Force components in N. Show Fc (tangential), Ft (feed), Fr (radial), resultant. Include specific cutting force kc.",
        min_level: "minimal",
        critical: true
      },
      {
        id: "power",
        label: "Power & Torque",
        source_fields: ["power_kw", "torque_nm", "spindle_power_required", "power_at_spindle", "efficiency"],
        format_hint: "Power in kW, torque in Nm. Compare to spindle capacity if machine known.",
        min_level: "compact",
        critical: true
      },
      {
        id: "safety",
        label: "Safety Assessment",
        source_fields: ["safety_margin", "safety_factor", "deflection_risk", "chatter_risk", "tool_stress_ratio"],
        format_hint: "Safety margins as percentages. Flag anything <20% margin. Highlight chatter/deflection risks.",
        min_level: "compact",
        critical: true
      },
      {
        id: "uncertainty",
        label: "Uncertainty & Confidence",
        source_fields: ["uncertainty", "confidence_interval", "model_used", "assumptions"],
        format_hint: "State uncertainty bounds (±%). Note which model (Kienzle/empirical). List key assumptions.",
        min_level: "full",
        critical: false
      },
      {
        id: "recommendations",
        label: "Optimization Notes",
        source_fields: ["optimization_hints", "alternative_parameters", "limiting_factor"],
        format_hint: "What's limiting performance? Suggestions for improvement.",
        min_level: "full",
        critical: false
      }
    ]
  },

  // TPL-SPEEDFEED: speed_feed recommendation formatting
  {
    template_id: "TPL-SPEEDFEED",
    dispatcher: "prism_calc",
    actions: ["speed_feed"],
    format: "summary",
    adaptive: true,
    sections: [
      {
        id: "recommendation",
        label: "Recommended Parameters",
        source_fields: ["cutting_speed", "spindle_rpm", "feed_per_tooth", "feed_rate", "axial_depth", "radial_depth", "step_over"],
        format_hint: "Vc (m/min), n (RPM), fz (mm/tooth), vf (mm/min), ap, ae. ALL values with units.",
        min_level: "minimal",
        critical: true
      },
      {
        id: "rationale",
        label: "Rationale",
        source_fields: ["selection_basis", "model_used", "material_factor", "tool_factor", "machine_factor"],
        format_hint: "Why these parameters? Material properties, tool capability, machine limits that drove selection.",
        min_level: "compact",
        critical: false
      },
      {
        id: "performance",
        label: "Expected Performance",
        source_fields: ["mrr", "surface_finish_ra", "tool_life_minutes", "power_required", "cycle_time_estimate"],
        format_hint: "MRR (cm³/min), Ra (µm), tool life, power draw. Quantify expected outcomes.",
        min_level: "compact",
        critical: false
      },
      {
        id: "safety_notes",
        label: "Safety & Limits",
        source_fields: ["max_values", "safety_warnings", "do_not_exceed", "critical_constraints"],
        format_hint: "Hard limits that must not be exceeded. Machine envelope constraints. Critical warnings.",
        min_level: "compact",
        critical: true
      },
      {
        id: "alternatives",
        label: "Alternative Approaches",
        source_fields: ["conservative_option", "aggressive_option", "finishing_option"],
        format_hint: "Conservative (safe/longer life) vs aggressive (max MRR) alternatives if available.",
        min_level: "full",
        critical: false
      }
    ]
  },

  // TPL-TOOL: tool_recommend comparison formatting
  {
    template_id: "TPL-TOOL",
    dispatcher: "prism_data",
    actions: ["tool_recommend", "tool_get"],
    format: "comparison",
    adaptive: true,
    sections: [
      {
        id: "tool_id",
        label: "Tool Identification",
        source_fields: ["catalog_number", "manufacturer", "name", "type", "diameter", "flutes", "coating"],
        format_hint: "Catalog #, manufacturer, type, geometry (diameter × flutes), coating",
        min_level: "minimal",
        critical: true
      },
      {
        id: "capability",
        label: "Capabilities",
        source_fields: ["material_groups", "operations", "max_depth", "max_speed", "recommended_parameters"],
        format_hint: "What materials/operations this tool is designed for. Operating envelope.",
        min_level: "compact",
        critical: false
      },
      {
        id: "comparison",
        label: "Comparison Notes",
        source_fields: ["pros", "cons", "best_for", "avoid_for", "cost_tier"],
        format_hint: "Pros/cons vs alternatives. Best application. When NOT to use this tool.",
        min_level: "compact",
        critical: false
      },
      {
        id: "application",
        label: "Application Guidance",
        source_fields: ["recommended_speeds", "recommended_feeds", "coolant_type", "entry_strategy", "special_notes"],
        format_hint: "Practical usage: speeds, feeds, coolant, entry method, operator tips",
        min_level: "full",
        critical: false
      }
    ]
  },

  // TPL-MACHINE: machine_get/capabilities formatting
  {
    template_id: "TPL-MACHINE",
    dispatcher: "prism_data",
    actions: ["machine_get", "machine_capabilities"],
    format: "table",
    adaptive: true,
    sections: [
      {
        id: "identity",
        label: "Machine Identity",
        source_fields: ["manufacturer", "model", "type", "controller", "year", "serial"],
        format_hint: "Manufacturer Model (Controller) — type classification",
        min_level: "minimal",
        critical: true
      },
      {
        id: "envelope",
        label: "Work Envelope",
        source_fields: ["x_travel", "y_travel", "z_travel", "table_size", "max_workpiece_weight", "max_workpiece_diameter"],
        format_hint: "Travel X×Y×Z (mm). Table size. Weight capacity. All with units.",
        min_level: "compact",
        critical: true
      },
      {
        id: "spindle",
        label: "Spindle Specifications",
        source_fields: ["spindle_speed_max", "spindle_power", "spindle_torque", "spindle_taper", "spindle_bearing"],
        format_hint: "Max RPM, power (kW), torque (Nm), taper type. Power curve if available.",
        min_level: "compact",
        critical: true
      },
      {
        id: "axes",
        label: "Axis Configuration",
        source_fields: ["axes_count", "simultaneous_axes", "rapid_traverse", "feed_rate_range", "positioning_accuracy", "repeatability"],
        format_hint: "Number of axes (simultaneous), rapids (m/min), accuracy/repeatability (µm)",
        min_level: "full",
        critical: false
      },
      {
        id: "tool_changer",
        label: "Tool Management",
        source_fields: ["tool_capacity", "tool_change_time", "max_tool_diameter", "max_tool_length", "max_tool_weight"],
        format_hint: "Magazine capacity, change time, tool size limits",
        min_level: "full",
        critical: false
      },
      {
        id: "limitations",
        label: "Limitations & Notes",
        source_fields: ["limitations", "special_features", "options_installed", "maintenance_notes"],
        format_hint: "Known limitations, installed options, special capabilities",
        min_level: "full",
        critical: false
      }
    ]
  }
];

// ─── Dispatcher→Template Index ───────────────────────────────────────────────

const TEMPLATE_INDEX: Record<string, Record<string, string>> = {};
for (const tpl of TEMPLATES) {
  if (!TEMPLATE_INDEX[tpl.dispatcher]) TEMPLATE_INDEX[tpl.dispatcher] = {};
  for (const action of tpl.actions) {
    TEMPLATE_INDEX[tpl.dispatcher][action] = tpl.template_id;
  }
}

// ─── Formatting Instructions per Template ────────────────────────────────────

const FORMAT_INSTRUCTIONS: Record<string, Record<TemplateSizeLevel, string>> = {
  "TPL-MATERIAL": {
    full: "Present this material data as a structured summary. Start with the material name and classification. Then cover properties, machinability rating, cutting constants, and practical machining notes. Use exact values with units throughout. Flag any missing constants.",
    compact: "Summarize this material concisely: identity, key properties (hardness, tensile), machinability rating, and cutting constants if available.",
    minimal: "State the material name, ISO group, hardness, and machinability rating in one sentence."
  },
  "TPL-ALARM": {
    full: "Present this alarm as a diagnostic report. Lead with the alarm code, severity, and plain-language description. Then list probable causes ordered by likelihood, detailed remediation steps, and related alarms. For CRITICAL severity, emphasize safety warnings prominently.",
    compact: "Describe the alarm (code, severity, what it means), list the top causes, and provide the remediation steps. Safety warnings for CRITICAL alarms.",
    minimal: "State the alarm code, severity, one-line description, and the quick fix."
  },
  "TPL-CUTTING": {
    full: "Present cutting force results as a technical summary. Lead with the primary force components (Fc, Ft, Fr) with units. Then power/torque requirements, safety margins, uncertainty bounds, and optimization suggestions. Flag any safety concerns.",
    compact: "Report the force components (Fc, Ft, Fr in N), power required (kW), and safety margins. Flag concerns.",
    minimal: "State resultant cutting force (N), power (kW), and safety status (OK/WARNING)."
  },
  "TPL-SPEEDFEED": {
    full: "Present speed/feed recommendations as actionable cutting parameters. Lead with Vc, n, fz, vf, ap, ae — all with units. Explain the rationale (why these values). Show expected performance (MRR, Ra, tool life). Include safety limits and alternative parameter sets.",
    compact: "Give the recommended cutting parameters (Vc, RPM, fz, vf, ap, ae) with units. Include expected MRR and any safety limits.",
    minimal: "State recommended Vc (m/min), RPM, fz (mm/tooth), and feed rate (mm/min)."
  },
  "TPL-TOOL": {
    full: "Present this tool data as a selection guide. Identify the tool (catalog, manufacturer, geometry, coating). Describe capabilities and ideal applications. If comparing multiple tools, highlight trade-offs. Include practical usage guidance (speeds, feeds, coolant, entry strategy).",
    compact: "Identify the tool (catalog #, type, geometry, coating) and its primary capabilities. Note best applications.",
    minimal: "State the tool catalog number, type, diameter, flutes, and coating."
  },
  "TPL-MACHINE": {
    full: "Present machine specifications as a capability overview. Lead with identity (make/model/controller). Cover work envelope (travel, table), spindle (RPM, power, torque, taper), axis config, tool changer, and known limitations. Use consistent units.",
    compact: "Summarize the machine: make/model/controller, work envelope (X×Y×Z travel), and spindle specs (RPM, power, taper).",
    minimal: "State the machine make/model, controller, max RPM, and travel range."
  }
};

// ─── Engine Class ────────────────────────────────────────────────────────────

export class ResponseTemplateEngine {
  private static instance: ResponseTemplateEngine | null = null;
  private executionCount = 0;
  private matchCount = 0;
  private skipCount = 0;
  private lastMatchTemplate = "";
  
  private constructor() {}

  static getInstance(): ResponseTemplateEngine {
    if (!ResponseTemplateEngine.instance) {
      ResponseTemplateEngine.instance = new ResponseTemplateEngine();
    }
    return ResponseTemplateEngine.instance;
  }

  /**
   * Determine the template size level based on context pressure.
   */
  private getSizeLevel(pressurePct: number): TemplateSizeLevel | null {
    if (pressurePct > 85) return null;   // Skip entirely
    if (pressurePct > 60) return "minimal";
    if (pressurePct > 40) return "compact";
    return "full";
  }

  /**
   * Check which fields from the result data actually have values.
   */
  private getAvailableFields(resultData: any, sectionFields: string[]): string[] {
    if (!resultData || typeof resultData !== "object") return [];
    const available: string[] = [];
    for (const field of sectionFields) {
      const val = this.resolveField(resultData, field);
      if (val !== undefined && val !== null && val !== "" && val !== 0) {
        available.push(field);
      }
    }
    return available;
  }

  /**
   * Resolve a field from the result, supporting nested paths and arrays.
   */
  private resolveField(obj: any, field: string): any {
    if (!obj) return undefined;
    // Direct lookup
    if (field in obj) return obj[field];
    // Check inside nested 'result', 'data', 'material', 'machine', 'alarm' wrappers
    for (const wrapper of ["result", "data", "material", "machine", "alarm", "tool"]) {
      if (obj[wrapper] && typeof obj[wrapper] === "object" && field in obj[wrapper]) {
        return obj[wrapper][field];
      }
    }
    // Dot notation for deep nesting
    if (field.includes(".")) {
      return field.split(".").reduce((o, k) => o?.[k], obj);
    }
    return undefined;
  }

  /**
   * Main method: match a dispatcher+action to a template and generate output.
   * Returns null if no template matches or pressure is too high.
   */
  match(
    dispatcher: string,
    action: string,
    resultData: any,
    pressurePct: number
  ): TemplateMatch | null {
    this.executionCount++;

    // Pressure gate
    const level = this.getSizeLevel(pressurePct);
    if (!level) {
      this.skipCount++;
      return null;
    }

    // Template lookup
    const templateId = TEMPLATE_INDEX[dispatcher]?.[action];
    if (!templateId) return null;

    const template = TEMPLATES.find(t => t.template_id === templateId);
    if (!template) return null;

    this.matchCount++;
    this.lastMatchTemplate = templateId;

    // Parse result data if it's a string
    let parsed = resultData;
    if (typeof resultData === "string") {
      try { parsed = JSON.parse(resultData); } catch { return null; }
    }
    // If parsed has an error field, don't template error responses
    if (parsed?.error) return null;

    // Filter sections by level and check data availability
    const filteredSections: TemplateSectionOutput[] = [];
    const allAvailableFields: string[] = [];

    for (const section of template.sections) {
      // Level filter: include section if it meets the minimum level threshold
      const levelOrder: TemplateSizeLevel[] = ["minimal", "compact", "full"];
      const sectionMinIdx = levelOrder.indexOf(section.min_level);
      const currentIdx = levelOrder.indexOf(level);
      
      if (currentIdx < sectionMinIdx && !section.critical) continue;

      // Check which fields actually have data
      const available = this.getAvailableFields(parsed, section.source_fields);
      if (available.length === 0 && !section.critical) continue;
      
      allAvailableFields.push(...available);
      filteredSections.push({
        label: section.label,
        fields: available.length > 0 ? available : section.source_fields,
        hint: section.format_hint
      });
    }

    // Get formatting instructions for this level
    const instructions = FORMAT_INSTRUCTIONS[templateId]?.[level] || "";

    return {
      template_id: templateId,
      format: template.format,
      level,
      sections: filteredSections,
      formatting_instructions: instructions,
      data_available: [...new Set(allAvailableFields)],
      _note: `Template ${templateId} (${level}) — ${filteredSections.length} sections, ${allAvailableFields.length} fields with data`
    };
  }

  /**
   * Get template stats for telemetry/diagnostics.
   */
  getStats(): {
    total_templates: number;
    total_executions: number;
    total_matches: number;
    total_skips: number;
    hit_rate: number;
    last_match: string;
    coverage: Record<string, string[]>;
  } {
    const coverage: Record<string, string[]> = {};
    for (const tpl of TEMPLATES) {
      coverage[tpl.template_id] = tpl.actions;
    }
    return {
      total_templates: TEMPLATES.length,
      total_executions: this.executionCount,
      total_matches: this.matchCount,
      total_skips: this.skipCount,
      hit_rate: this.executionCount > 0 ? this.matchCount / this.executionCount : 0,
      last_match: this.lastMatchTemplate,
      coverage
    };
  }

  /**
   * List all templates with their trigger actions.
   */
  listTemplates(): Array<{
    template_id: string;
    dispatcher: string;
    actions: string[];
    format: string;
    section_count: number;
  }> {
    return TEMPLATES.map(t => ({
      template_id: t.template_id,
      dispatcher: t.dispatcher,
      actions: t.actions,
      format: t.format,
      section_count: t.sections.length
    }));
  }

  /**
   * Get a specific template definition by ID.
   */
  getTemplate(templateId: string): ResponseTemplate | null {
    return TEMPLATES.find(t => t.template_id === templateId) || null;
  }

  /**
   * Reset stats (for testing).
   */
  resetStats(): void {
    this.executionCount = 0;
    this.matchCount = 0;
    this.skipCount = 0;
    this.lastMatchTemplate = "";
  }
}

// ─── Auto-fire Function (for cadenceExecutor integration) ────────────────────

/**
 * autoResponseTemplate — called from autoHookWrapper post-dispatch.
 * Returns a TemplateMatch to inject into the result as _response_template.
 * 
 * @param dispatcher - The dispatcher name (e.g., "prism_data")
 * @param action - The action within that dispatcher (e.g., "material_get")
 * @param resultText - The raw result text from the dispatcher
 * @param pressurePct - Current context pressure percentage
 */
export function autoResponseTemplate(
  dispatcher: string,
  action: string,
  resultText: string | any,
  pressurePct: number
): TemplateMatch | null {
  try {
    const engine = ResponseTemplateEngine.getInstance();
    return engine.match(dispatcher, action, resultText, pressurePct);
  } catch {
    return null;
  }
}

/**
 * getResponseTemplateStats — for telemetry integration
 */
export function getResponseTemplateStats() {
  try {
    return ResponseTemplateEngine.getInstance().getStats();
  } catch {
    return { error: "ResponseTemplateEngine not initialized" };
  }
}
