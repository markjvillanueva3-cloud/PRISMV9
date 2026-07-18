/**
 * MachineHandbookRegistryEngine — HBK-MS0
 * =========================================
 * Structured storage and retrieval of machine handbook data.
 * Covers 10 section types extracted from manufacturer manuals:
 * specs, spindle, axes, tooling, coolant, alarms, maintenance, parts, controller, safety.
 *
 * References:
 * - MachineRegistry (SpindleSpecs, AxisSpecs, ToolChangerSpecs, ControllerSpecs)
 * - AlarmDiagnosticsEngine (alarm code structure)
 * - TribalKnowledgeEngine (tip propagation)
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { log } from "../utils/Logger.js";

/** Safe ID pattern — prevents path traversal (C1 fix). */
const SAFE_ID = /^[A-Za-z0-9_.-]+$/;

/** Standard PRISM units for safety-critical fields. */
const PRISM_UNITS = [
  "RPM", "mm", "mm_min", "m_s2", "kW", "Nm", "bar", "deg", "deg_s",
  "um", "kg", "N", "L_min", "dBA", "C", "kVA", "psi", "HP",
] as const;

// ════════════════════════════════════════════════════════════════════
// SECTION 1: SOURCE PROVENANCE (shared across all sections)
// ════════════════════════════════════════════════════════════════════

export const SourceProvenanceSchema = z.object({
  handbook_title: z.string(),
  page_number: z.number().optional(),
  section_ref: z.string().optional(),
  extraction_method: z.enum(["manual", "ocr", "table_parse", "api", "web_scrape"]),
  confidence: z.number().min(0).max(1),
  extracted_at: z.string(),
});
export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;

// ════════════════════════════════════════════════════════════════════
// SECTION 2: 10 HANDBOOK SECTION SCHEMAS
// ════════════════════════════════════════════════════════════════════

/** 1. Cover Info — basic handbook metadata */
export const CoverInfoSchema = z.object({
  manufacturer: z.string(),
  model_family: z.string(),
  models_covered: z.array(z.string()),
  manual_part_number: z.string().optional(),
  revision: z.string().optional(),
  publication_date: z.string().optional(),
  language: z.string().default("en"),
  total_pages: z.number().optional(),
  source: SourceProvenanceSchema,
});
export type CoverInfo = z.infer<typeof CoverInfoSchema>;

/** 2. Spindle Specs — from handbook performance charts */
export const HandbookSpindleSpecSchema = z.object({
  max_rpm: z.number().positive(),
  min_rpm: z.number().nonnegative().default(0),
  power_continuous_kw: z.number().positive(),
  power_30min_kw: z.number().optional(),
  power_peak_kw: z.number().optional(),
  torque_max_nm: z.number().positive(),
  torque_continuous_nm: z.number().optional(),
  taper_type: z.string(),
  bearing_type: z.string().optional(),
  drive_type: z.enum(["belt", "direct", "gear", "integral"]).optional(),
  base_speed_rpm: z.number().optional(),
  drawbar_force_kn: z.number().optional(),
  warmup_procedure: z.string().optional(),
  gear_ranges: z.array(z.object({
    gear: z.number(),
    min_rpm: z.number(),
    max_rpm: z.number(),
    max_torque_nm: z.number(),
    max_power_kw: z.number(),
  })).optional(),
  torque_curve: z.array(z.object({
    rpm: z.number(),
    torque_nm: z.number(),
    power_kw: z.number(),
  })).optional(),
  source: SourceProvenanceSchema,
});
export type HandbookSpindleSpec = z.infer<typeof HandbookSpindleSpecSchema>;

/** 3. Axis Kinematics — per-axis specs from handbook */
export const HandbookAxisKinematicsSchema = z.object({
  axes: z.array(z.object({
    name: z.string(),
    travel_mm: z.number().positive(),
    rapid_mm_min: z.number().positive(),
    max_feed_mm_min: z.number().optional(),
    accel_m_s2: z.number().optional(),
    resolution_um: z.number().optional(),
    repeatability_um: z.number().optional(),
    accuracy_um: z.number().optional(),
    backlash_um: z.number().optional(),
    ball_screw_pitch_mm: z.number().optional(),
    linear_scale: z.boolean().optional(),
  })),
  simultaneous_axes: z.number().optional(),
  work_envelope_mm: z.object({
    x: z.number(), y: z.number(), z: z.number(),
  }).optional(),
  spindle_to_table_min_mm: z.number().optional(),
  spindle_to_table_max_mm: z.number().optional(),
  source: SourceProvenanceSchema,
});
export type HandbookAxisKinematics = z.infer<typeof HandbookAxisKinematicsSchema>;

/** 4. Controller Features — from programming manual */
export const HandbookControllerFeaturesSchema = z.object({
  controller_manufacturer: z.string(),
  controller_model: z.string(),
  firmware_version: z.string().optional(),
  custom_g_codes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    syntax: z.string().optional(),
    example: z.string().optional(),
  })).default([]),
  custom_m_codes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    modal: z.boolean().optional(),
  })).default([]),
  macro_support: z.object({
    type: z.string().optional(),
    variable_range: z.string().optional(),
    max_nesting_depth: z.number().optional(),
    supports_goto: z.boolean().optional(),
  }).optional(),
  probing_cycles: z.array(z.object({
    cycle_code: z.string(),
    description: z.string(),
    parameters: z.array(z.string()).optional(),
  })).default([]),
  max_program_size_kb: z.number().optional(),
  max_tool_offsets: z.number().optional(),
  max_work_offsets: z.number().optional(),
  conversational_mode: z.boolean().optional(),
  high_speed_machining: z.boolean().optional(),
  look_ahead_blocks: z.number().optional(),
  source: SourceProvenanceSchema,
});
export type HandbookControllerFeatures = z.infer<typeof HandbookControllerFeaturesSchema>;

/** 5. Alarm Codes — from alarm reference section */
export const HandbookAlarmCodeSchema = z.object({
  code: z.string(),
  severity: z.enum(["info", "warning", "error", "critical", "emergency"]),
  category: z.string().optional(),
  description: z.string(),
  probable_causes: z.array(z.string()),
  corrective_actions: z.array(z.string()),
  parts_needed: z.array(z.object({
    part_number: z.string(),
    description: z.string(),
    quantity: z.number().default(1),
  })).default([]),
  estimated_downtime_min: z.number().optional(),
  requires_service_tech: z.boolean().optional(),
  related_alarms: z.array(z.string()).default([]),
  source: SourceProvenanceSchema,
});
export type HandbookAlarmCode = z.infer<typeof HandbookAlarmCodeSchema>;

/** 6. Maintenance Schedule — from service manual */
export const HandbookMaintenanceTaskSchema = z.object({
  task_id: z.string(),
  task: z.string(),
  interval: z.enum(["daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "hours_250", "hours_500", "hours_1000", "hours_2000", "hours_5000", "hours_10000", "as_needed"]),
  interval_hours: z.number().optional(),
  category: z.enum(["lubrication", "inspection", "cleaning", "replacement", "calibration", "adjustment", "fluid_change"]),
  procedure_steps: z.array(z.string()),
  parts_needed: z.array(z.object({
    part_number: z.string(),
    description: z.string(),
    quantity: z.number().default(1),
  })).default([]),
  safety_warnings: z.array(z.string()).default([]),
  estimated_time_min: z.number().optional(),
  requires_power_off: z.boolean().default(false),
  source: SourceProvenanceSchema,
});
export type HandbookMaintenanceTask = z.infer<typeof HandbookMaintenanceTaskSchema>;

/** 7. Parts Book Entry — from parts manual / BOM */
export const HandbookPartsEntrySchema = z.object({
  oem_part_number: z.string(),
  description: z.string(),
  category: z.enum(["spindle", "axis", "hydraulic", "pneumatic", "electrical", "coolant", "lubrication", "tool_changer", "enclosure", "safety", "consumable", "bearing", "seal", "belt", "filter", "other"]),
  subcategory: z.string().optional(),
  quantity_per_machine: z.number().default(1),
  replacement_interval_hours: z.number().optional(),
  unit_price_usd: z.number().optional(),
  vendor: z.string().optional(),
  lead_time_days: z.number().optional(),
  cross_references: z.array(z.object({
    vendor: z.string(),
    part_number: z.string(),
  })).default([]),
  critical: z.boolean().default(false),
  source: SourceProvenanceSchema,
});
export type HandbookPartsEntry = z.infer<typeof HandbookPartsEntrySchema>;

/** 8. Programming Tips — from programming manual */
export const HandbookProgrammingTipSchema = z.object({
  topic: z.string(),
  controller_dialect: z.string(),
  code_example: z.string().optional(),
  description: z.string(),
  gotchas: z.array(z.string()).default([]),
  related_alarms: z.array(z.string()).default([]),
  applicable_operations: z.array(z.string()).default([]),
  source: SourceProvenanceSchema,
});
export type HandbookProgrammingTip = z.infer<typeof HandbookProgrammingTipSchema>;

/** 9. Safety Limits — from safety section */
export const HandbookSafetyLimitSchema = z.object({
  parameter: z.string(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  unit: z.enum(PRISM_UNITS),
  consequence_of_violation: z.string(),
  interlock_type: z.enum(["software", "hardware", "both", "none"]).optional(),
  requires_override_key: z.boolean().default(false),
  source: SourceProvenanceSchema,
});
export type HandbookSafetyLimit = z.infer<typeof HandbookSafetyLimitSchema>;

/** 10. Coolant Specs — from coolant/lubrication section */
export const HandbookCoolantSpecSchema = z.object({
  coolant_types: z.array(z.object({
    type: z.string(),
    concentration_pct_min: z.number().optional(),
    concentration_pct_max: z.number().optional(),
    recommended_brand: z.string().optional(),
  })),
  tank_capacity_liters: z.number().optional(),
  pump_pressure_bar: z.number().optional(),
  flow_rate_lpm: z.number().optional(),
  filtration_um: z.number().optional(),
  through_spindle: z.boolean().default(false),
  through_spindle_pressure_bar: z.number().optional(),
  mql_capable: z.boolean().default(false),
  chip_conveyor_type: z.string().optional(),
  source: SourceProvenanceSchema,
});
export type HandbookCoolantSpec = z.infer<typeof HandbookCoolantSpecSchema>;

/** 11. Tooling Constraints — from tooling section */
export const HandbookToolingConstraintSchema = z.object({
  max_tool_diameter_mm: z.number().optional(),
  max_tool_length_mm: z.number().optional(),
  max_tool_weight_kg: z.number().optional(),
  magazine_capacity: z.number().optional(),
  tool_change_time_sec: z.number().optional(),
  taper_type: z.string(),
  pull_stud_type: z.string().optional(),
  gauge_line_mm: z.number().optional(),
  adjacent_pocket_clearance_mm: z.number().optional(),
  source: SourceProvenanceSchema,
});
export type HandbookToolingConstraint = z.infer<typeof HandbookToolingConstraintSchema>;

// ════════════════════════════════════════════════════════════════════
// SECTION 3: COMPOSITE HANDBOOK INTERFACE
// ════════════════════════════════════════════════════════════════════

export const MachineHandbookSchema = z.object({
  id: z.string().regex(SAFE_ID, "ID must be alphanumeric/hyphens/underscores/dots only"),
  machine_id: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  version: z.string().default("1.0.0"),
  created_at: z.string(),
  updated_at: z.string(),

  cover_info: CoverInfoSchema.optional(),
  spindle_specs: HandbookSpindleSpecSchema.optional(),
  axis_kinematics: HandbookAxisKinematicsSchema.optional(),
  controller_features: HandbookControllerFeaturesSchema.optional(),
  alarm_codes: z.array(HandbookAlarmCodeSchema).default([]),
  maintenance_schedule: z.array(HandbookMaintenanceTaskSchema).default([]),
  parts_book: z.array(HandbookPartsEntrySchema).default([]),
  programming_tips: z.array(HandbookProgrammingTipSchema).default([]),
  safety_limits: z.array(HandbookSafetyLimitSchema).default([]),
  coolant_specs: HandbookCoolantSpecSchema.optional(),
  tooling_constraints: HandbookToolingConstraintSchema.optional(),
});
export type MachineHandbook = z.infer<typeof MachineHandbookSchema>;

export type HandbookSectionKey = keyof Omit<MachineHandbook,
  "id" | "machine_id" | "manufacturer" | "model" | "version" | "created_at" | "updated_at"
>;

// ════════════════════════════════════════════════════════════════════
// SECTION 4: REGISTRY
// ════════════════════════════════════════════════════════════════════

const DEFAULT_HANDBOOK_DIR = path.resolve(
  process.env.PRISM_HANDBOOK_DIR ?? path.join(process.cwd(), "data", "machine-handbooks")
);

export class MachineHandbookRegistry {
  private handbooks: Map<string, MachineHandbook> = new Map();
  private byMachineId: Map<string, string> = new Map(); // machine_id → handbook_id
  private initialized = false;
  private readonly dir: string;

  constructor(customDir?: string) {
    this.dir = customDir ?? DEFAULT_HANDBOOK_DIR;
  }

  /** Load all handbooks from disk. */
  init(): void {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
      }
      const files = fs.readdirSync(this.dir).filter(f => f.endsWith(".json"));
      for (const file of files) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(this.dir, file), "utf-8"));
          const parsed = MachineHandbookSchema.parse(raw);
          this.handbooks.set(parsed.id, parsed);
          this.byMachineId.set(parsed.machine_id, parsed.id);
        } catch (err) {
          log.warn(`Skipping invalid handbook file ${file}: ${(err as Error).message}`);
        }
      }
      this.initialized = true;
      log.info(`MachineHandbookRegistry: loaded ${this.handbooks.size} handbooks`);
    } catch (err) {
      log.error(`MachineHandbookRegistry init failed: ${(err as Error).message}`);
      this.initialized = true; // allow graceful degradation — empty results, not crashes
      log.warn("MachineHandbookRegistry: running with 0 handbooks due to init failure");
    }
  }

  /** Get a handbook by its ID. */
  get(id: string): MachineHandbook | undefined {
    this.ensureInit();
    return this.handbooks.get(id);
  }

  /** Get a handbook by machine_id. */
  getByMachineId(machineId: string): MachineHandbook | undefined {
    this.ensureInit();
    const hbkId = this.byMachineId.get(machineId);
    return hbkId ? this.handbooks.get(hbkId) : undefined;
  }

  /** Add or update a handbook. Persists to disk. */
  upsert(handbook: MachineHandbook): void {
    this.ensureInit();
    const validated = MachineHandbookSchema.parse(handbook);
    validated.updated_at = new Date().toISOString();
    // Clean up stale byMachineId if machine_id changed (M4 fix)
    const existing = this.handbooks.get(validated.id);
    if (existing && existing.machine_id !== validated.machine_id) {
      this.byMachineId.delete(existing.machine_id);
    }
    this.handbooks.set(validated.id, validated);
    this.byMachineId.set(validated.machine_id, validated.id);
    this.persist(validated);
  }

  /** Delete a handbook by ID. H5 fix: re-validate ID before path construction. */
  delete(id: string): boolean {
    this.ensureInit();
    if (!SAFE_ID.test(id)) return false;
    const hbk = this.handbooks.get(id);
    if (!hbk) return false;
    this.handbooks.delete(id);
    this.byMachineId.delete(hbk.machine_id);
    try {
      const filePath = path.join(this.dir, `${id}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      log.warn(`Failed to delete handbook file ${id}.json: ${(err as Error).message}`);
    }
    return true;
  }

  /** Search handbooks by manufacturer, model, or section content. */
  search(opts: {
    manufacturer?: string;
    model?: string;
    has_section?: HandbookSectionKey;
    query?: string;
    limit?: number;
  }): MachineHandbook[] {
    this.ensureInit();
    let results = Array.from(this.handbooks.values());

    if (opts.manufacturer) {
      const mfr = opts.manufacturer.toLowerCase();
      results = results.filter(h => h.manufacturer.toLowerCase().includes(mfr));
    }
    if (opts.model) {
      const mdl = opts.model.toLowerCase();
      results = results.filter(h => h.model.toLowerCase().includes(mdl));
    }
    if (opts.has_section) {
      results = results.filter(h => {
        const val = h[opts.has_section!];
        return val !== undefined && val !== null && (!Array.isArray(val) || val.length > 0);
      });
    }
    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter(h =>
        h.manufacturer.toLowerCase().includes(q) ||
        h.model.toLowerCase().includes(q) ||
        h.alarm_codes.some(a => a.description.toLowerCase().includes(q) || a.code.includes(q)) ||
        h.programming_tips.some(t => t.topic.toLowerCase().includes(q)) ||
        h.parts_book.some(p => p.oem_part_number.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) ||
        h.maintenance_schedule.some(m => m.task.toLowerCase().includes(q))
      );
    }

    return results.slice(0, opts.limit ?? 50);
  }

  /** List all handbooks (summary only). */
  list(): Array<{ id: string; machine_id: string; manufacturer: string; model: string; sections: string[] }> {
    this.ensureInit();
    return Array.from(this.handbooks.values()).map(h => ({
      id: h.id,
      machine_id: h.machine_id,
      manufacturer: h.manufacturer,
      model: h.model,
      sections: this.getSectionKeys(h),
    }));
  }

  /** Get section coverage stats. */
  stats(): {
    total: number;
    by_manufacturer: Record<string, number>;
    section_coverage: Record<string, number>;
  } {
    this.ensureInit();
    const byMfr: Record<string, number> = {};
    const sectionCov: Record<string, number> = {};
    const sectionKeys: HandbookSectionKey[] = [
      "cover_info", "spindle_specs", "axis_kinematics", "controller_features",
      "alarm_codes", "maintenance_schedule", "parts_book", "programming_tips",
      "safety_limits", "coolant_specs", "tooling_constraints",
    ];

    for (const h of this.handbooks.values()) {
      byMfr[h.manufacturer] = (byMfr[h.manufacturer] ?? 0) + 1;
      for (const key of sectionKeys) {
        const val = h[key];
        const populated = val !== undefined && val !== null && (!Array.isArray(val) || val.length > 0);
        if (populated) sectionCov[key] = (sectionCov[key] ?? 0) + 1;
      }
    }

    return { total: this.handbooks.size, by_manufacturer: byMfr, section_coverage: sectionCov };
  }

  /** Get count of loaded handbooks. */
  get size(): number {
    this.ensureInit();
    return this.handbooks.size;
  }

  // ── Private helpers ──

  private ensureInit(): void {
    if (!this.initialized) this.init();
  }

  private persist(handbook: MachineHandbook): void {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      const filePath = path.join(this.dir, `${handbook.id}.json`);
      const tmpPath = filePath + ".tmp";
      fs.writeFileSync(tmpPath, JSON.stringify(handbook, null, 2), "utf-8");
      fs.renameSync(tmpPath, filePath); // atomic on same filesystem
    } catch (err) {
      log.error(`Failed to persist handbook ${handbook.id}: ${(err as Error).message}`);
    }
  }

  private getSectionKeys(h: MachineHandbook): string[] {
    const keys: string[] = [];
    if (h.cover_info) keys.push("cover_info");
    if (h.spindle_specs) keys.push("spindle_specs");
    if (h.axis_kinematics) keys.push("axis_kinematics");
    if (h.controller_features) keys.push("controller_features");
    if (h.alarm_codes.length > 0) keys.push("alarm_codes");
    if (h.maintenance_schedule.length > 0) keys.push("maintenance_schedule");
    if (h.parts_book.length > 0) keys.push("parts_book");
    if (h.programming_tips.length > 0) keys.push("programming_tips");
    if (h.safety_limits.length > 0) keys.push("safety_limits");
    if (h.coolant_specs) keys.push("coolant_specs");
    if (h.tooling_constraints) keys.push("tooling_constraints");
    return keys;
  }
}

/** Singleton instance. */
export const machineHandbookRegistry = new MachineHandbookRegistry();
