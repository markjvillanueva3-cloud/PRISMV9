/**
 * ReportEngine — Manufacturing Report Generation
 *
 * L2-P0-MS1: Ported from monolith report templates.
 * Generates structured report data for 7 report types:
 * setup sheet, process plan, cost estimate, tool list,
 * inspection plan, alarm report, speed/feed card.
 *
 * Produces structured JSON output suitable for HTML/PDF rendering
 * by the web frontend. Does NOT generate HTML/PDF directly
 * (that's the frontend's job).
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ReportType =
  | "setup_sheet"
  | "process_plan"
  | "cost_estimate"
  | "tool_list"
  | "inspection_plan"
  | "alarm_report"
  | "speed_feed_card";

export interface ReportMeta {
  report_id: string;
  type: ReportType;
  title: string;
  generated_at: string;
  version: string;
  author: string;
  part_number?: string;
  revision?: string;
}

export interface SetupSheetData {
  meta: ReportMeta;
  machine: { name: string; controller: string; axes: number; spindle_taper: string };
  workholding: { type: string; clamping_force_N?: number; fixture_id?: string; notes: string[] };
  work_offset: { wcs: string; x: number; y: number; z: number; datum_description: string };
  stock: { material: string; iso_group: string; hardness?: string; dimensions: { x: number; y: number; z: number }; weight_kg?: number };
  tools: Array<{ position: number; tool_id: string; description: string; diameter: number; flute_length: number; total_length: number; coating?: string; notes?: string }>;
  operations: Array<{ seq: number; description: string; tool_position: number; spindle_rpm: number; feed_rate: number; depth_of_cut: number; width_of_cut?: number; coolant: string; estimated_time_min: number }>;
  notes: string[];
  safety_warnings: string[];
}

export interface ProcessPlanData {
  meta: ReportMeta;
  material: { name: string; iso_group: string; hardness_HRC?: number; condition?: string };
  operations: Array<{
    seq: number;
    setup: number;
    operation_type: string;
    description: string;
    tool: { id: string; type: string; diameter: number };
    parameters: {
      cutting_speed: number;
      spindle_rpm: number;
      feed_per_tooth: number;
      feed_rate: number;
      axial_depth: number;
      radial_depth?: number;
      coolant: string;
    };
    constraints: { max_force_N?: number; max_deflection_mm?: number; surface_finish_Ra?: number };
    estimated_time_min: number;
    safety_level: "critical" | "standard" | "informational";
    notes: string[];
  }>;
  total_cycle_time_min: number;
  total_setups: number;
  safety_summary: { critical_ops: number; warnings: string[] };
}

export interface CostEstimateData {
  meta: ReportMeta;
  material_cost: { material: string; weight_kg: number; cost_per_kg: number; total: number };
  tooling_cost: { tools: Array<{ id: string; cost: number; expected_life_parts: number; cost_per_part: number }>; total_per_part: number };
  machine_cost: { machine: string; rate_per_hour: number; cycle_time_min: number; setup_time_min: number; total_per_part: number };
  labor_cost: { rate_per_hour: number; setup_time_min: number; supervision_factor: number; total_per_part: number };
  overhead: { rate_percent: number; total_per_part: number };
  total_cost_per_part: number;
  batch_economics: Array<{ quantity: number; cost_per_part: number; total_cost: number; setup_amortized: number }>;
  margin_analysis: { cost: number; suggested_price: number; margin_percent: number };
}

export interface ToolListData {
  meta: ReportMeta;
  tools: Array<{
    position: number;
    tool_id: string;
    type: string;
    description: string;
    diameter: number;
    flute_length: number;
    total_length: number;
    number_of_flutes: number;
    coating: string;
    material: string;
    holder: string;
    gauge_length: number;
    operations_used: string[];
    max_rpm: number;
    max_feed: number;
    estimated_life_min: number;
    cost: number;
    supplier?: string;
    part_number?: string;
  }>;
  total_tools: number;
  total_cost: number;
  notes: string[];
}

export interface InspectionPlanData {
  meta: ReportMeta;
  features: Array<{
    feature_id: string;
    description: string;
    nominal: number;
    tolerance: { upper: number; lower: number };
    gd_t?: { type: string; value: number; datum_ref?: string };
    measurement_method: string;
    instrument: string;
    frequency: string;
    critical: boolean;
  }>;
  instruments: Array<{ name: string; type: string; range: string; resolution: number; calibration_due?: string }>;
  spc_requirements: { cpk_minimum: number; sample_size: number; frequency: string };
  notes: string[];
}

export interface AlarmReportData {
  meta: ReportMeta;
  alarms: Array<{
    code: string;
    controller: string;
    severity: "critical" | "warning" | "info";
    message: string;
    description: string;
    probable_causes: string[];
    corrective_actions: string[];
    affected_axis?: string;
    timestamp?: string;
  }>;
  summary: { critical: number; warning: number; info: number; total: number };
  machine: { name: string; controller: string };
}

export interface SpeedFeedCardData {
  meta: ReportMeta;
  material: { name: string; iso_group: string; hardness?: string };
  recommendations: Array<{
    operation: string;
    tool_type: string;
    tool_diameter: number;
    coating: string;
    cutting_speed: number;
    feed_per_tooth: number;
    axial_depth: number;
    radial_depth: number;
    spindle_rpm: number;
    feed_rate: number;
    mrr: number;
    power_kW: number;
    torque_Nm: number;
    specific_cutting_force: number;
    surface_finish_Ra: number;
    tool_life_min: number;
    safety_level: "critical" | "standard" | "informational";
    notes: string[];
  }>;
  formulas_used: string[];
  algorithms_used: string[];
}

export type ReportData =
  | SetupSheetData
  | ProcessPlanData
  | CostEstimateData
  | ToolListData
  | InspectionPlanData
  | AlarmReportData
  | SpeedFeedCardData;

// ── Report Templates ──────────────────────────────────────────────────

interface ReportTemplate {
  type: ReportType;
  title: string;
  description: string;
  required_fields: string[];
  sections: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { type: "setup_sheet", title: "Setup Sheet", description: "Complete machine setup documentation including WCS, tools, and operations", required_fields: ["machine", "tools", "operations"], sections: ["header", "machine", "workholding", "work_offset", "stock", "tools", "operations", "notes", "safety"] },
  { type: "process_plan", title: "Process Plan", description: "Detailed manufacturing process with cutting parameters and safety analysis", required_fields: ["material", "operations"], sections: ["header", "material", "operations", "timing", "safety_summary"] },
  { type: "cost_estimate", title: "Cost Estimate", description: "Per-part cost breakdown with batch economics", required_fields: ["material_cost", "machine_cost"], sections: ["header", "material", "tooling", "machine", "labor", "overhead", "total", "batch_analysis"] },
  { type: "tool_list", title: "Tool List", description: "Complete tooling inventory with specifications", required_fields: ["tools"], sections: ["header", "tools", "summary", "notes"] },
  { type: "inspection_plan", title: "Inspection Plan", description: "Quality inspection requirements with GD&T and SPC", required_fields: ["features"], sections: ["header", "features", "instruments", "spc", "notes"] },
  { type: "alarm_report", title: "Alarm Report", description: "CNC alarm diagnostic report with corrective actions", required_fields: ["alarms"], sections: ["header", "summary", "alarms", "machine"] },
  { type: "speed_feed_card", title: "Speed & Feed Card", description: "Cutting parameter recommendations by material and operation", required_fields: ["material", "recommendations"], sections: ["header", "material", "recommendations", "formulas"] },
];

// ── Engine ────────────────────────────────────────────────────────────

export class ReportEngine {
  private counter = 0;

  /** List available report templates */
  listTemplates(): { templates: ReportTemplate[]; total: number } {
    return { templates: REPORT_TEMPLATES, total: REPORT_TEMPLATES.length };
  }

  /** Get template details */
  getTemplate(type: ReportType): ReportTemplate | null {
    return REPORT_TEMPLATES.find(t => t.type === type) ?? null;
  }

  /** Generate report metadata */
  generateMeta(type: ReportType, overrides?: Partial<ReportMeta>): ReportMeta {
    this.counter++;
    const template = this.getTemplate(type);
    return {
      report_id: `RPT-${Date.now()}-${this.counter}`,
      type,
      title: template?.title ?? type,
      generated_at: new Date().toISOString(),
      version: "1.0.0",
      author: "PRISM Manufacturing Intelligence",
      ...overrides,
    };
  }

  /** Generate a setup sheet from input data */
  generateSetupSheet(input: {
    machine: SetupSheetData["machine"];
    workholding?: Partial<SetupSheetData["workholding"]>;
    work_offset?: Partial<SetupSheetData["work_offset"]>;
    stock: SetupSheetData["stock"];
    tools: SetupSheetData["tools"];
    operations: SetupSheetData["operations"];
    part_number?: string;
    notes?: string[];
  }): SetupSheetData {
    const safety_warnings: string[] = [];

    // Auto-generate safety warnings
    for (const op of input.operations) {
      if (op.spindle_rpm > (input.machine.axes >= 5 ? 20000 : 15000)) {
        safety_warnings.push(`Op ${op.seq}: High RPM (${op.spindle_rpm}) — verify tool balance`);
      }
      if (op.depth_of_cut > 10) {
        safety_warnings.push(`Op ${op.seq}: Deep cut (${op.depth_of_cut}mm) — verify machine rigidity`);
      }
    }

    return {
      meta: this.generateMeta("setup_sheet", { part_number: input.part_number }),
      machine: input.machine,
      workholding: {
        type: "vise",
        notes: [],
        ...(input.workholding ?? {}),
      } as SetupSheetData["workholding"],
      work_offset: {
        wcs: "G54",
        x: 0, y: 0, z: 0,
        datum_description: "Top center of stock",
        ...(input.work_offset ?? {}),
      } as SetupSheetData["work_offset"],
      stock: input.stock,
      tools: input.tools,
      operations: input.operations,
      notes: input.notes ?? [],
      safety_warnings,
    };
  }

  /** Generate a cost estimate from input data */
  generateCostEstimate(input: {
    material: CostEstimateData["material_cost"];
    tools: CostEstimateData["tooling_cost"]["tools"];
    machine: { name: string; rate_per_hour: number; cycle_time_min: number; setup_time_min: number };
    labor_rate_per_hour?: number;
    overhead_percent?: number;
    batch_quantities?: number[];
    target_margin_percent?: number;
    part_number?: string;
  }): CostEstimateData {
    const material_cost = { ...input.material, total: input.material.weight_kg * input.material.cost_per_kg };
    const tooling_per_part = input.tools.reduce((sum, t) => sum + t.cost_per_part, 0);
    const machine_per_part = (input.machine.rate_per_hour / 60) * input.machine.cycle_time_min;
    const setup_per_part_base = (input.machine.rate_per_hour / 60) * input.machine.setup_time_min;
    const labor_rate = input.labor_rate_per_hour ?? 45;
    const labor_per_part = (labor_rate / 60) * input.machine.setup_time_min * 0.1; // supervision factor
    const overhead_pct = input.overhead_percent ?? 15;

    const direct_cost = material_cost.total + tooling_per_part + machine_per_part + labor_per_part;
    const overhead_per_part = direct_cost * (overhead_pct / 100);
    const total = direct_cost + overhead_per_part;
    const margin = input.target_margin_percent ?? 25;

    const batch_quantities = input.batch_quantities ?? [1, 10, 50, 100, 500];
    const batch_economics = batch_quantities.map(qty => ({
      quantity: qty,
      cost_per_part: total + setup_per_part_base / qty,
      total_cost: (total + setup_per_part_base / qty) * qty,
      setup_amortized: setup_per_part_base / qty,
    }));

    return {
      meta: this.generateMeta("cost_estimate", { part_number: input.part_number }),
      material_cost,
      tooling_cost: { tools: input.tools, total_per_part: tooling_per_part },
      machine_cost: { machine: input.machine.name, rate_per_hour: input.machine.rate_per_hour, cycle_time_min: input.machine.cycle_time_min, setup_time_min: input.machine.setup_time_min, total_per_part: machine_per_part },
      labor_cost: { rate_per_hour: labor_rate, setup_time_min: input.machine.setup_time_min, supervision_factor: 0.1, total_per_part: labor_per_part },
      overhead: { rate_percent: overhead_pct, total_per_part: overhead_per_part },
      total_cost_per_part: total,
      batch_economics,
      margin_analysis: { cost: total, suggested_price: total / (1 - margin / 100), margin_percent: margin },
    };
  }

  /** Generate speed/feed card for a material */
  generateSpeedFeedCard(input: {
    material: SpeedFeedCardData["material"];
    recommendations: SpeedFeedCardData["recommendations"];
    part_number?: string;
  }): SpeedFeedCardData {
    return {
      meta: this.generateMeta("speed_feed_card", { part_number: input.part_number }),
      material: input.material,
      recommendations: input.recommendations,
      formulas_used: ["kienzle_force", "taylor_tool_life", "surface_finish_theoretical", "power_consumption"],
      algorithms_used: ["kienzle", "taylor", "surface-finish", "thermal-power"],
    };
  }

  /** Generate a tool list report */
  generateToolList(input: { tools: ToolListData["tools"]; notes?: string[]; part_number?: string }): ToolListData {
    return {
      meta: this.generateMeta("tool_list", { part_number: input.part_number }),
      tools: input.tools,
      total_tools: input.tools.length,
      total_cost: input.tools.reduce((sum, t) => sum + t.cost, 0),
      notes: input.notes ?? [],
    };
  }

  /** Generate an alarm diagnostic report */
  generateAlarmReport(input: { alarms: AlarmReportData["alarms"]; machine: AlarmReportData["machine"] }): AlarmReportData {
    const summary = {
      critical: input.alarms.filter(a => a.severity === "critical").length,
      warning: input.alarms.filter(a => a.severity === "warning").length,
      info: input.alarms.filter(a => a.severity === "info").length,
      total: input.alarms.length,
    };
    return {
      meta: this.generateMeta("alarm_report"),
      alarms: input.alarms,
      summary,
      machine: input.machine,
    };
  }

  /** Generate an inspection plan */
  generateInspectionPlan(input: {
    features: InspectionPlanData["features"];
    instruments?: InspectionPlanData["instruments"];
    cpk_minimum?: number;
    part_number?: string;
  }): InspectionPlanData {
    return {
      meta: this.generateMeta("inspection_plan", { part_number: input.part_number }),
      features: input.features,
      instruments: input.instruments ?? [],
      spc_requirements: { cpk_minimum: input.cpk_minimum ?? 1.33, sample_size: 5, frequency: "every 10 parts" },
      notes: [],
    };
  }

  /** Validate report data completeness */
  validateReport(type: ReportType, data: Record<string, any>): { valid: boolean; missing: string[] } {
    const template = this.getTemplate(type);
    if (!template) return { valid: false, missing: [`Unknown report type: ${type}`] };

    const missing = template.required_fields.filter(f => !data[f] || (Array.isArray(data[f]) && data[f].length === 0));
    return { valid: missing.length === 0, missing };
  }
}

export const reportEngine = new ReportEngine();
