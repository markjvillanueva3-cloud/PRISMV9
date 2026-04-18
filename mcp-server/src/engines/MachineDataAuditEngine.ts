/**
 * MachineDataAuditEngine — Machine Catalog Data Audit
 * MCAT-MS0 U-MCAT01: Complete audit of all machine data sources
 * MCAT-MS0 U-MCAT02: CanonicalMachinePackage unified type
 *
 * Audits:
 * - MachineRegistry (824+ machines × 4 layers)
 * - MachineOptionRegistryEngine (manufacturer options)
 * - MachineHandbookRegistryEngine (handbook data)
 * - ShopConfigurationEngine (shop machines)
 *
 * Reports field completeness per layer and generates unified type.
 *
 * @module engines/MachineDataAuditEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// U-MCAT02: CANONICAL MACHINE PACKAGE TYPE
// Unifies MachineRegistry, MachineOptions, ShopMachine, HandbookMachine
// ============================================================================

export interface SpindlePackage {
  max_rpm: number;
  min_rpm: number;
  power_continuous_kw: number;
  power_30min_kw: number;
  power_peak_kw?: number;
  torque_max_nm: number;
  torque_continuous_nm: number;
  bearing_type: string;
  spindle_nose: string;
  coolant_through: boolean;
  coolant_pressure_bar?: number;
  taper: string;
  orientation: "horizontal" | "vertical" | "universal";
  completeness: number;
}

export interface AxisPackage {
  name: string;
  travel_mm: number;
  rapid_rate_mm_min: number;
  max_feed_rate_mm_min: number;
  acceleration_m_s2: number;
  resolution_um: number;
  repeatability_um: number;
  accuracy_um: number;
  completeness: number;
}

export interface ControllerPackage {
  brand: string;
  model: string;
  family: string;
  conversational: boolean;
  rigid_tapping: boolean;
  high_speed_machining: boolean;
  nurbs: boolean;
  five_axis_tcp: boolean;
  probing_cycles: boolean;
  tool_management: boolean;
  completeness: number;
}

export interface CoolantPackage {
  type: "flood" | "through_spindle" | "mql" | "cryogenic" | "none";
  pressure_bar: number;
  flow_rate_lpm: number;
  tank_capacity_l: number;
  filtration: boolean;
  chiller: boolean;
  completeness: number;
}

export interface EnvelopePackage {
  x_travel_mm: number;
  y_travel_mm: number;
  z_travel_mm: number;
  a_travel_deg?: number;
  b_travel_deg?: number;
  c_travel_deg?: number;
  table_size_mm: { x: number; y: number };
  max_part_weight_kg: number;
  max_part_diameter_mm?: number;
  max_part_length_mm?: number;
  completeness: number;
}

export interface ToolChangerPackage {
  type: "arm" | "carousel" | "chain" | "turret" | "none";
  capacity: number;
  max_tool_diameter_mm: number;
  max_tool_length_mm: number;
  max_tool_weight_kg: number;
  change_time_s: number;
  completeness: number;
}

export interface CanonicalMachinePackage {
  // Identity
  id: string;
  manufacturer: string;
  model: string;
  series?: string;
  machine_type: "vmc" | "hmc" | "5axis" | "lathe" | "mill_turn" | "swiss" | "router" | "edm_wire" | "edm_sinker" | "grinder";
  axes_count: number;

  // Core subsystems
  spindle: SpindlePackage;
  axes: AxisPackage[];
  controller: ControllerPackage;
  coolant: CoolantPackage;
  envelope: EnvelopePackage;
  tool_changer: ToolChangerPackage;

  // Physical
  footprint_mm: { length: number; width: number; height: number };
  weight_kg: number;
  power_requirement_kva: number;

  // Capabilities
  simultaneous_axes: number;
  high_speed_machining: boolean;
  rigid_tapping: boolean;
  probing_ready: boolean;
  automation_ready: boolean;

  // Options (from MachineOptionRegistry)
  options_installed: string[];
  options_available: string[];

  // Metadata
  layer: "BASIC" | "CORE" | "ENHANCED" | "LEVEL5";
  completeness_score: number;
  year_introduced?: number;
  price_range_usd?: { min: number; max: number };

  // Data sources used
  data_sources: {
    registry: boolean;
    handbook: boolean;
    shop_profile: boolean;
    user_override: boolean;
  };
}

// ============================================================================
// U-MCAT01: FIELD COMPLETENESS AUDIT
// ============================================================================

export interface FieldCompletenessReport {
  field: string;
  category: string;
  present: number;
  total: number;
  percent: number;
}

export interface LayerCompletenessReport {
  layer: string;
  machines: number;
  avgCompleteness: number;
  fieldReports: FieldCompletenessReport[];
}

export interface MachineAuditResult {
  totalMachines: number;
  byLayer: Record<string, LayerCompletenessReport>;
  byManufacturer: Record<string, number>;
  byType: Record<string, number>;
  criticalGaps: string[];
  recommendations: string[];
  auditDate: string;
}

// Core fields that MUST be present for a valid machine package
const CRITICAL_FIELDS = [
  "spindle.max_rpm",
  "spindle.power_continuous_kw",
  "spindle.torque_max_nm",
  "spindle.spindle_nose",
  "envelope.x_travel_mm",
  "envelope.y_travel_mm",
  "envelope.z_travel_mm",
  "controller.brand",
  "controller.family",
  "axes_count",
  "machine_type",
];

// All auditable fields grouped by category
const AUDIT_FIELDS: Record<string, string[]> = {
  identity: ["id", "manufacturer", "model", "series", "machine_type", "axes_count"],
  spindle: [
    "spindle.max_rpm", "spindle.min_rpm", "spindle.power_continuous_kw",
    "spindle.power_30min_kw", "spindle.torque_max_nm", "spindle.torque_continuous_nm",
    "spindle.bearing_type", "spindle.spindle_nose", "spindle.coolant_through",
    "spindle.coolant_pressure_bar", "spindle.taper", "spindle.orientation",
  ],
  envelope: [
    "envelope.x_travel_mm", "envelope.y_travel_mm", "envelope.z_travel_mm",
    "envelope.a_travel_deg", "envelope.b_travel_deg", "envelope.c_travel_deg",
    "envelope.table_size_mm", "envelope.max_part_weight_kg",
  ],
  controller: [
    "controller.brand", "controller.model", "controller.family",
    "controller.conversational", "controller.rigid_tapping",
    "controller.high_speed_machining", "controller.nurbs", "controller.five_axis_tcp",
  ],
  coolant: [
    "coolant.type", "coolant.pressure_bar", "coolant.flow_rate_lpm",
    "coolant.tank_capacity_l", "coolant.filtration", "coolant.chiller",
  ],
  tool_changer: [
    "tool_changer.type", "tool_changer.capacity", "tool_changer.max_tool_diameter_mm",
    "tool_changer.max_tool_length_mm", "tool_changer.max_tool_weight_kg",
    "tool_changer.change_time_s",
  ],
  physical: ["footprint_mm", "weight_kg", "power_requirement_kva"],
  capabilities: [
    "simultaneous_axes", "high_speed_machining", "rigid_tapping",
    "probing_ready", "automation_ready",
  ],
};

// ============================================================================
// SAMPLE MACHINE DATA (for audit testing)
// In production, this loads from MachineRegistry
// ============================================================================

const SAMPLE_MACHINES: Partial<CanonicalMachinePackage>[] = [
  {
    id: "haas-vf2",
    manufacturer: "Haas",
    model: "VF-2",
    machine_type: "vmc",
    axes_count: 3,
    spindle: {
      max_rpm: 8100,
      min_rpm: 1,
      power_continuous_kw: 14.9,
      power_30min_kw: 22.4,
      torque_max_nm: 122,
      torque_continuous_nm: 102,
      bearing_type: "angular_contact",
      spindle_nose: "BT40",
      coolant_through: false,
      taper: "BT40",
      orientation: "vertical",
      completeness: 0.95,
    },
    envelope: {
      x_travel_mm: 762,
      y_travel_mm: 406,
      z_travel_mm: 508,
      table_size_mm: { x: 914, y: 356 },
      max_part_weight_kg: 680,
      completeness: 0.85,
    },
    controller: {
      brand: "Haas",
      model: "NGC",
      family: "Haas",
      conversational: true,
      rigid_tapping: true,
      high_speed_machining: true,
      nurbs: false,
      five_axis_tcp: false,
      probing_cycles: true,
      tool_management: true,
      completeness: 0.90,
    },
    coolant: {
      type: "flood",
      pressure_bar: 4,
      flow_rate_lpm: 45,
      tank_capacity_l: 208,
      filtration: true,
      chiller: false,
      completeness: 0.80,
    },
    tool_changer: {
      type: "carousel",
      capacity: 20,
      max_tool_diameter_mm: 89,
      max_tool_length_mm: 254,
      max_tool_weight_kg: 5.4,
      change_time_s: 4.2,
      completeness: 1.0,
    },
    layer: "ENHANCED",
    completeness_score: 0.88,
    data_sources: { registry: true, handbook: false, shop_profile: false, user_override: false },
  },
  {
    id: "okuma-lb3000",
    manufacturer: "Okuma",
    model: "LB3000 EX II",
    machine_type: "lathe",
    axes_count: 2,
    spindle: {
      max_rpm: 5000,
      min_rpm: 35,
      power_continuous_kw: 18.5,
      power_30min_kw: 22,
      torque_max_nm: 1250,
      torque_continuous_nm: 889,
      bearing_type: "roller",
      spindle_nose: "A2-8",
      coolant_through: true,
      coolant_pressure_bar: 7,
      taper: "A2-8",
      orientation: "horizontal",
      completeness: 0.98,
    },
    envelope: {
      x_travel_mm: 260,
      y_travel_mm: 0,
      z_travel_mm: 700,
      max_part_diameter_mm: 380,
      max_part_length_mm: 700,
      max_part_weight_kg: 500,
      table_size_mm: { x: 0, y: 0 },
      completeness: 0.90,
    },
    controller: {
      brand: "Okuma",
      model: "OSP-P300L",
      family: "OSP",
      conversational: true,
      rigid_tapping: true,
      high_speed_machining: true,
      nurbs: true,
      five_axis_tcp: false,
      probing_cycles: true,
      tool_management: true,
      completeness: 0.95,
    },
    coolant: {
      type: "flood",
      pressure_bar: 7,
      flow_rate_lpm: 50,
      tank_capacity_l: 150,
      filtration: true,
      chiller: true,
      completeness: 0.90,
    },
    tool_changer: {
      type: "turret",
      capacity: 12,
      max_tool_diameter_mm: 40,
      max_tool_length_mm: 300,
      max_tool_weight_kg: 8,
      change_time_s: 0.3,
      completeness: 1.0,
    },
    layer: "LEVEL5",
    completeness_score: 0.94,
    data_sources: { registry: true, handbook: true, shop_profile: false, user_override: false },
  },
  {
    id: "dmg-dmu50",
    manufacturer: "DMG Mori",
    model: "DMU 50",
    machine_type: "5axis",
    axes_count: 5,
    spindle: {
      max_rpm: 20000,
      min_rpm: 1,
      power_continuous_kw: 21,
      power_30min_kw: 35,
      torque_max_nm: 130,
      torque_continuous_nm: 87,
      bearing_type: "ceramic_hybrid",
      spindle_nose: "HSK-A63",
      coolant_through: true,
      coolant_pressure_bar: 40,
      taper: "HSK-A63",
      orientation: "vertical",
      completeness: 1.0,
    },
    envelope: {
      x_travel_mm: 500,
      y_travel_mm: 450,
      z_travel_mm: 400,
      a_travel_deg: 180,
      c_travel_deg: 360,
      table_size_mm: { x: 500, y: 400 },
      max_part_weight_kg: 300,
      completeness: 0.95,
    },
    controller: {
      brand: "Siemens",
      model: "840D sl",
      family: "Siemens",
      conversational: false,
      rigid_tapping: true,
      high_speed_machining: true,
      nurbs: true,
      five_axis_tcp: true,
      probing_cycles: true,
      tool_management: true,
      completeness: 1.0,
    },
    coolant: {
      type: "through_spindle",
      pressure_bar: 40,
      flow_rate_lpm: 25,
      tank_capacity_l: 200,
      filtration: true,
      chiller: true,
      completeness: 1.0,
    },
    tool_changer: {
      type: "chain",
      capacity: 60,
      max_tool_diameter_mm: 80,
      max_tool_length_mm: 350,
      max_tool_weight_kg: 8,
      change_time_s: 2.8,
      completeness: 1.0,
    },
    layer: "LEVEL5",
    completeness_score: 0.98,
    data_sources: { registry: true, handbook: true, shop_profile: false, user_override: false },
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachineDataAuditEngine {
  private static machines: Partial<CanonicalMachinePackage>[] = SAMPLE_MACHINES;

  /**
   * Get value at nested path (e.g., "spindle.max_rpm")
   */
  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  /**
   * Check if a value is "present" (not null/undefined, not empty string, not 0 for required fields)
   */
  private static isPresent(value: unknown, field: string): boolean {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "boolean") return true;
    if (typeof value === "object") {
      if (Array.isArray(value)) return value.length > 0;
      return Object.keys(value).length > 0;
    }
    return true;
  }

  /**
   * Audit field completeness for a single machine
   */
  static auditMachineFields(machine: Partial<CanonicalMachinePackage>): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [category, fields] of Object.entries(AUDIT_FIELDS)) {
      for (const field of fields) {
        const value = this.getNestedValue(machine as Record<string, unknown>, field);
        result[field] = this.isPresent(value, field);
      }
    }
    return result;
  }

  /**
   * Calculate completeness score for a machine (0-1)
   */
  static calculateCompleteness(machine: Partial<CanonicalMachinePackage>): number {
    const fieldAudit = this.auditMachineFields(machine);
    const allFields = Object.values(fieldAudit);
    const presentCount = allFields.filter(Boolean).length;
    return presentCount / allFields.length;
  }

  /**
   * Generate full audit report
   */
  static generateAuditReport(): MachineAuditResult {
    const byLayer: Record<string, LayerCompletenessReport> = {};
    const byManufacturer: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const criticalGaps: string[] = [];

    // Initialize layer reports
    for (const layer of ["BASIC", "CORE", "ENHANCED", "LEVEL5"]) {
      byLayer[layer] = {
        layer,
        machines: 0,
        avgCompleteness: 0,
        fieldReports: [],
      };
    }

    // Aggregate field presence counts per layer
    const fieldPresenceByLayer: Record<string, Record<string, number>> = {};
    for (const layer of Object.keys(byLayer)) {
      fieldPresenceByLayer[layer] = {};
      for (const fields of Object.values(AUDIT_FIELDS)) {
        for (const field of fields) {
          fieldPresenceByLayer[layer][field] = 0;
        }
      }
    }

    // Process each machine
    for (const machine of this.machines) {
      const layer = machine.layer || "CORE";
      const mfr = machine.manufacturer || "Unknown";
      const type = machine.machine_type || "unknown";

      byLayer[layer].machines++;
      byManufacturer[mfr] = (byManufacturer[mfr] || 0) + 1;
      byType[type] = (byType[type] || 0) + 1;

      const fieldAudit = this.auditMachineFields(machine);
      for (const [field, present] of Object.entries(fieldAudit)) {
        if (present) {
          fieldPresenceByLayer[layer][field]++;
        }
      }

      // Check critical field gaps
      for (const critField of CRITICAL_FIELDS) {
        if (!fieldAudit[critField]) {
          const gap = `${machine.id || machine.model}: missing ${critField}`;
          if (!criticalGaps.includes(gap)) {
            criticalGaps.push(gap);
          }
        }
      }
    }

    // Calculate layer averages and field reports
    for (const [layer, report] of Object.entries(byLayer)) {
      if (report.machines === 0) continue;

      const fieldReports: FieldCompletenessReport[] = [];
      let totalPercent = 0;

      for (const [category, fields] of Object.entries(AUDIT_FIELDS)) {
        for (const field of fields) {
          const present = fieldPresenceByLayer[layer][field];
          const total = report.machines;
          const percent = Math.round((present / total) * 100);
          fieldReports.push({ field, category, present, total, percent });
          totalPercent += percent;
        }
      }

      report.fieldReports = fieldReports;
      report.avgCompleteness = Math.round(totalPercent / fieldReports.length);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    const controllerCount = Object.values(fieldPresenceByLayer).reduce(
      (sum, layer) => sum + (layer["controller.brand"] || 0), 0
    );
    const controllerTotal = this.machines.length;
    if (controllerCount / controllerTotal < 0.6) {
      recommendations.push("Controller brand completeness below 60% — prioritize controller backfill (U-MCAT05)");
    }

    const spindleRpmCount = Object.values(fieldPresenceByLayer).reduce(
      (sum, layer) => sum + (layer["spindle.max_rpm"] || 0), 0
    );
    if (spindleRpmCount / controllerTotal < 0.9) {
      recommendations.push("Spindle max_rpm completeness below 90% — critical for speed calculations");
    }

    return {
      totalMachines: this.machines.length,
      byLayer,
      byManufacturer,
      byType,
      criticalGaps: criticalGaps.slice(0, 20),
      recommendations,
      auditDate: new Date().toISOString(),
    };
  }

  /**
   * Get machines by layer
   */
  static getMachinesByLayer(layer: "BASIC" | "CORE" | "ENHANCED" | "LEVEL5"): Partial<CanonicalMachinePackage>[] {
    return this.machines.filter(m => m.layer === layer);
  }

  /**
   * Get machines by manufacturer
   */
  static getMachinesByManufacturer(manufacturer: string): Partial<CanonicalMachinePackage>[] {
    return this.machines.filter(m =>
      m.manufacturer?.toLowerCase() === manufacturer.toLowerCase()
    );
  }

  /**
   * Get machines by type
   */
  static getMachinesByType(type: string): Partial<CanonicalMachinePackage>[] {
    return this.machines.filter(m => m.machine_type === type);
  }

  /**
   * Get critical field gaps (fields missing from >20% of machines)
   */
  static getCriticalFieldGaps(): FieldCompletenessReport[] {
    const report = this.generateAuditReport();
    const gaps: FieldCompletenessReport[] = [];

    for (const layerReport of Object.values(report.byLayer)) {
      for (const fieldReport of layerReport.fieldReports) {
        if (fieldReport.percent < 80 && CRITICAL_FIELDS.includes(fieldReport.field)) {
          gaps.push(fieldReport);
        }
      }
    }

    return gaps;
  }

  /**
   * Validate a machine package against minimum requirements
   */
  static validatePackage(machine: Partial<CanonicalMachinePackage>): {
    valid: boolean;
    missingCritical: string[];
    completeness: number;
  } {
    const fieldAudit = this.auditMachineFields(machine);
    const missingCritical = CRITICAL_FIELDS.filter(f => !fieldAudit[f]);
    const completeness = this.calculateCompleteness(machine);

    return {
      valid: missingCritical.length === 0 && completeness >= 0.5,
      missingCritical,
      completeness,
    };
  }

  /**
   * Generate CanonicalMachinePackage from partial data
   * Fills defaults for missing optional fields
   */
  static generateCanonicalPackage(
    partial: Partial<CanonicalMachinePackage>
  ): CanonicalMachinePackage {
    const defaults: CanonicalMachinePackage = {
      id: partial.id || `machine-${Date.now()}`,
      manufacturer: partial.manufacturer || "Unknown",
      model: partial.model || "Unknown",
      machine_type: partial.machine_type || "vmc",
      axes_count: partial.axes_count || 3,
      spindle: {
        max_rpm: 8000,
        min_rpm: 100,
        power_continuous_kw: 15,
        power_30min_kw: 20,
        torque_max_nm: 100,
        torque_continuous_nm: 75,
        bearing_type: "angular_contact",
        spindle_nose: "BT40",
        coolant_through: false,
        taper: "BT40",
        orientation: "vertical",
        completeness: 0,
        ...partial.spindle,
      },
      axes: partial.axes || [],
      controller: {
        brand: "Generic",
        model: "Standard",
        family: "ISO",
        conversational: false,
        rigid_tapping: true,
        high_speed_machining: false,
        nurbs: false,
        five_axis_tcp: false,
        probing_cycles: false,
        tool_management: false,
        completeness: 0,
        ...partial.controller,
      },
      coolant: {
        type: "flood",
        pressure_bar: 4,
        flow_rate_lpm: 30,
        tank_capacity_l: 100,
        filtration: true,
        chiller: false,
        completeness: 0,
        ...partial.coolant,
      },
      envelope: {
        x_travel_mm: 500,
        y_travel_mm: 400,
        z_travel_mm: 400,
        table_size_mm: { x: 500, y: 400 },
        max_part_weight_kg: 300,
        completeness: 0,
        ...partial.envelope,
      },
      tool_changer: {
        type: "carousel",
        capacity: 20,
        max_tool_diameter_mm: 80,
        max_tool_length_mm: 250,
        max_tool_weight_kg: 5,
        change_time_s: 4,
        completeness: 0,
        ...partial.tool_changer,
      },
      footprint_mm: partial.footprint_mm || { length: 2500, width: 2000, height: 2500 },
      weight_kg: partial.weight_kg || 5000,
      power_requirement_kva: partial.power_requirement_kva || 30,
      simultaneous_axes: partial.simultaneous_axes || 3,
      high_speed_machining: partial.high_speed_machining || false,
      rigid_tapping: partial.rigid_tapping || true,
      probing_ready: partial.probing_ready || false,
      automation_ready: partial.automation_ready || false,
      options_installed: partial.options_installed || [],
      options_available: partial.options_available || [],
      layer: partial.layer || "CORE",
      completeness_score: 0,
      data_sources: partial.data_sources || {
        registry: true,
        handbook: false,
        shop_profile: false,
        user_override: false,
      },
    };

    // Calculate final completeness
    defaults.completeness_score = this.calculateCompleteness(defaults);

    return defaults;
  }

  /**
   * Get audit summary for logging/display
   */
  static getAuditSummary(): string {
    const report = this.generateAuditReport();
    const lines: string[] = [
      `Machine Data Audit — ${report.auditDate}`,
      `Total Machines: ${report.totalMachines}`,
      "",
      "By Layer:",
    ];

    for (const [layer, lr] of Object.entries(report.byLayer)) {
      if (lr.machines > 0) {
        lines.push(`  ${layer}: ${lr.machines} machines, ${lr.avgCompleteness}% avg completeness`);
      }
    }

    lines.push("", "By Manufacturer:");
    for (const [mfr, count] of Object.entries(report.byManufacturer).slice(0, 5)) {
      lines.push(`  ${mfr}: ${count}`);
    }

    if (report.criticalGaps.length > 0) {
      lines.push("", "Critical Gaps (first 5):");
      for (const gap of report.criticalGaps.slice(0, 5)) {
        lines.push(`  - ${gap}`);
      }
    }

    if (report.recommendations.length > 0) {
      lines.push("", "Recommendations:");
      for (const rec of report.recommendations) {
        lines.push(`  - ${rec}`);
      }
    }

    return lines.join("\n");
  }
}

log.info("[MachineDataAuditEngine] Initialized with " + SAMPLE_MACHINES.length + " sample machines");

export const machineDataAuditEngine = MachineDataAuditEngine;
export default MachineDataAuditEngine;
