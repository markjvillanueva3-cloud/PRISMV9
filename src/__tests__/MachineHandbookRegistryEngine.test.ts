/**
 * HBK-MS0 P0-U04: MachineHandbookRegistry + Schema Validation Tests
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  MachineHandbookSchema,
  MachineHandbookRegistry,
  SourceProvenanceSchema,
  HandbookSpindleSpecSchema,
  HandbookAxisKinematicsSchema,
  HandbookControllerFeaturesSchema,
  HandbookAlarmCodeSchema,
  HandbookMaintenanceTaskSchema,
  HandbookPartsEntrySchema,
  HandbookProgrammingTipSchema,
  HandbookSafetyLimitSchema,
  HandbookCoolantSpecSchema,
  HandbookToolingConstraintSchema,
  CoverInfoSchema,
  type MachineHandbook,
} from "../engines/MachineHandbookRegistryEngine.js";

const TEST_DIR = path.join(process.cwd(), "data", "machine-handbooks", "__test__");

const SOURCE = {
  handbook_title: "Haas VF-2 Operator Manual",
  page_number: 42,
  section_ref: "Ch. 3.2",
  extraction_method: "manual" as const,
  confidence: 0.95,
  extracted_at: "2026-03-28T20:00:00Z",
};

function makeSampleHandbook(id = "HBK-TEST-001"): MachineHandbook {
  return {
    id,
    machine_id: "haas-vf-2",
    manufacturer: "Haas",
    model: "VF-2",
    version: "1.0.0",
    created_at: "2026-03-28T20:00:00Z",
    updated_at: "2026-03-28T20:00:00Z",
    cover_info: {
      manufacturer: "Haas",
      model_family: "VF Series",
      models_covered: ["VF-2", "VF-2SS", "VF-2YT"],
      manual_part_number: "96-8000",
      revision: "Rev H",
      language: "en",
      total_pages: 482,
      source: SOURCE,
    },
    spindle_specs: {
      max_rpm: 8100,
      min_rpm: 0,
      power_continuous_kw: 14.9,
      power_30min_kw: 22.4,
      torque_max_nm: 122,
      torque_continuous_nm: 81,
      taper_type: "CT40",
      bearing_type: "Angular contact ceramic hybrid",
      drawbar_force_kn: 11.1,
      warmup_procedure: "Run spindle at 50% max RPM for 15 min before full-speed cuts",
      gear_ranges: [
        { gear: 1, min_rpm: 0, max_rpm: 8100, max_torque_nm: 122, max_power_kw: 22.4 },
      ],
      source: SOURCE,
    },
    axis_kinematics: {
      axes: [
        { name: "X", travel_mm: 762, rapid_mm_min: 25400, repeatability_um: 5, accuracy_um: 10 },
        { name: "Y", travel_mm: 406, rapid_mm_min: 25400, repeatability_um: 5, accuracy_um: 10 },
        { name: "Z", travel_mm: 508, rapid_mm_min: 25400, repeatability_um: 5, accuracy_um: 10 },
      ],
      simultaneous_axes: 3,
      work_envelope_mm: { x: 762, y: 406, z: 508 },
      spindle_to_table_min_mm: 102,
      spindle_to_table_max_mm: 610,
      source: SOURCE,
    },
    controller_features: {
      controller_manufacturer: "Haas",
      controller_model: "NGC",
      custom_g_codes: [
        { code: "G150", description: "General Purpose Pocket Milling", syntax: "G150 P# Q# R# F#" },
      ],
      custom_m_codes: [
        { code: "M36", description: "Pallet Change Ready" },
      ],
      macro_support: { type: "Haas Macro", variable_range: "#100-#199, #500-#699", supports_goto: true },
      probing_cycles: [
        { cycle_code: "G65 P9023", description: "Single Surface Probe" },
      ],
      max_tool_offsets: 200,
      max_work_offsets: 104,
      conversational_mode: true,
      high_speed_machining: true,
      look_ahead_blocks: 80,
      source: SOURCE,
    },
    alarm_codes: [
      {
        code: "102",
        severity: "error",
        category: "SERVO",
        description: "SERVO ALARM - X AXIS MOTOR OVERHEAT",
        probable_causes: [
          "High ambient temperature",
          "Blocked air filter on servo motor",
          "Excessive rapid traverse with heavy table load",
        ],
        corrective_actions: [
          "Check and clean servo motor air filter",
          "Verify ambient temperature is below 40C",
          "Reduce rapid traverse percentage temporarily",
        ],
        parts_needed: [
          { part_number: "93-0578", description: "X-Axis Servo Motor Fan", quantity: 1 },
        ],
        estimated_downtime_min: 30,
        source: SOURCE,
      },
    ],
    maintenance_schedule: [
      {
        task_id: "HAAS-PM-001",
        task: "Check and clean chip tray",
        interval: "daily",
        category: "cleaning",
        procedure_steps: [
          "Power off machine",
          "Open chip tray door",
          "Remove chips and debris",
          "Inspect for coolant leaks",
          "Close and secure",
        ],
        safety_warnings: ["Wear gloves — sharp chips"],
        estimated_time_min: 10,
        requires_power_off: false,
        source: SOURCE,
      },
    ],
    parts_book: [
      {
        oem_part_number: "93-0578",
        description: "X-Axis Servo Motor Fan Assembly",
        category: "electrical",
        quantity_per_machine: 1,
        replacement_interval_hours: 10000,
        critical: true,
        cross_references: [{ vendor: "Nidec", part_number: "D06A-24TS2" }],
        source: SOURCE,
      },
    ],
    programming_tips: [
      {
        topic: "High-Speed Machining Setup",
        controller_dialect: "haas_ngc",
        code_example: "G187 P1 E0.005 (SMOOTHING ON, 0.005 TOLERANCE)",
        description: "Enable smooth motion for HSM with G187. P1=on, E sets tolerance in inches.",
        gotchas: ["G187 resets at program end — set in every program that needs it"],
        applicable_operations: ["finishing", "3d_contouring"],
        source: SOURCE,
      },
    ],
    safety_limits: [
      {
        parameter: "Spindle Speed",
        max_value: 8100,
        unit: "RPM",
        consequence_of_violation: "Spindle bearing damage; immediate alarm 108",
        interlock_type: "software",
        source: SOURCE,
      },
    ],
    coolant_specs: {
      coolant_types: [
        { type: "Water-soluble synthetic", concentration_pct_min: 5, concentration_pct_max: 10, recommended_brand: "Haas CoolPower" },
      ],
      tank_capacity_liters: 208,
      pump_pressure_bar: 1.4,
      through_spindle: true,
      through_spindle_pressure_bar: 21,
      chip_conveyor_type: "auger",
      source: SOURCE,
    },
    tooling_constraints: {
      max_tool_diameter_mm: 89,
      max_tool_length_mm: 406,
      max_tool_weight_kg: 5.4,
      magazine_capacity: 24,
      tool_change_time_sec: 2.2,
      taper_type: "CT40",
      pull_stud_type: "45-degree",
      source: SOURCE,
    },
  };
}

// ── Schema Validation Tests ──
describe("HBK-MS0: Handbook Section Schemas", () => {
  it("SourceProvenance validates correctly", () => {
    expect(() => SourceProvenanceSchema.parse(SOURCE)).not.toThrow();
  });

  it("CoverInfo validates", () => {
    const sample = makeSampleHandbook();
    expect(() => CoverInfoSchema.parse(sample.cover_info)).not.toThrow();
  });

  it("HandbookSpindleSpec validates with gear ranges", () => {
    const sample = makeSampleHandbook();
    expect(() => HandbookSpindleSpecSchema.parse(sample.spindle_specs)).not.toThrow();
    expect(sample.spindle_specs!.gear_ranges).toHaveLength(1);
  });

  it("HandbookAxisKinematics validates 3-axis machine", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookAxisKinematicsSchema.parse(sample.axis_kinematics);
    expect(parsed.axes).toHaveLength(3);
    expect(parsed.work_envelope_mm?.x).toBe(762);
  });

  it("HandbookControllerFeatures validates custom codes", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookControllerFeaturesSchema.parse(sample.controller_features);
    expect(parsed.custom_g_codes).toHaveLength(1);
    expect(parsed.custom_m_codes).toHaveLength(1);
    expect(parsed.probing_cycles).toHaveLength(1);
  });

  it("HandbookAlarmCode validates with parts_needed", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookAlarmCodeSchema.parse(sample.alarm_codes[0]);
    expect(parsed.probable_causes.length).toBeGreaterThan(0);
    expect(parsed.parts_needed).toHaveLength(1);
  });

  it("HandbookMaintenanceTask validates daily task", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookMaintenanceTaskSchema.parse(sample.maintenance_schedule[0]);
    expect(parsed.interval).toBe("daily");
    expect(parsed.procedure_steps.length).toBeGreaterThan(0);
  });

  it("HandbookPartsEntry validates with cross-references", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookPartsEntrySchema.parse(sample.parts_book[0]);
    expect(parsed.oem_part_number).toBe("93-0578");
    expect(parsed.cross_references).toHaveLength(1);
  });

  it("HandbookProgrammingTip validates with code example", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookProgrammingTipSchema.parse(sample.programming_tips[0]);
    expect(parsed.controller_dialect).toBe("haas_ngc");
    expect(parsed.gotchas.length).toBeGreaterThan(0);
  });

  it("HandbookSafetyLimit validates spindle limit", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookSafetyLimitSchema.parse(sample.safety_limits[0]);
    expect(parsed.max_value).toBe(8100);
    expect(parsed.unit).toBe("RPM");
  });

  it("HandbookCoolantSpec validates with TSC", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookCoolantSpecSchema.parse(sample.coolant_specs);
    expect(parsed.through_spindle).toBe(true);
    expect(parsed.through_spindle_pressure_bar).toBe(21);
  });

  it("HandbookToolingConstraint validates magazine specs", () => {
    const sample = makeSampleHandbook();
    const parsed = HandbookToolingConstraintSchema.parse(sample.tooling_constraints);
    expect(parsed.magazine_capacity).toBe(24);
    expect(parsed.taper_type).toBe("CT40");
  });

  it("Full MachineHandbook validates all 11 sections", () => {
    const sample = makeSampleHandbook();
    const parsed = MachineHandbookSchema.parse(sample);
    expect(parsed.id).toBe("HBK-TEST-001");
    expect(parsed.alarm_codes).toHaveLength(1);
    expect(parsed.maintenance_schedule).toHaveLength(1);
    expect(parsed.parts_book).toHaveLength(1);
  });

  it("rejects invalid spindle RPM", () => {
    const bad = { ...makeSampleHandbook().spindle_specs!, max_rpm: -100 };
    expect(() => HandbookSpindleSpecSchema.parse(bad)).toThrow();
  });

  it("rejects invalid alarm severity", () => {
    const bad = { ...makeSampleHandbook().alarm_codes[0], severity: "catastrophic" };
    expect(() => HandbookAlarmCodeSchema.parse(bad)).toThrow();
  });
});

// ── Registry CRUD Tests ──
describe("HBK-MS0: MachineHandbookRegistry CRUD", () => {
  let registry: MachineHandbookRegistry;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
    registry = new MachineHandbookRegistry(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      for (const f of fs.readdirSync(TEST_DIR)) {
        fs.unlinkSync(path.join(TEST_DIR, f));
      }
      fs.rmdirSync(TEST_DIR);
    }
  });

  it("upsert + get round-trips correctly", () => {
    const sample = makeSampleHandbook();
    registry.upsert(sample);
    const retrieved = registry.get("HBK-TEST-001");
    expect(retrieved).toBeDefined();
    expect(retrieved!.manufacturer).toBe("Haas");
    expect(retrieved!.spindle_specs?.max_rpm).toBe(8100);
  });

  it("getByMachineId works", () => {
    registry.upsert(makeSampleHandbook());
    const found = registry.getByMachineId("haas-vf-2");
    expect(found).toBeDefined();
    expect(found!.model).toBe("VF-2");
  });

  it("delete removes from memory and disk", () => {
    registry.upsert(makeSampleHandbook());
    expect(registry.size).toBe(1);
    const deleted = registry.delete("HBK-TEST-001");
    expect(deleted).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.get("HBK-TEST-001")).toBeUndefined();
  });

  it("search by manufacturer works", () => {
    registry.upsert(makeSampleHandbook("HBK-A"));
    registry.upsert({ ...makeSampleHandbook("HBK-B"), manufacturer: "Mazak", machine_id: "mazak-qt-200" });
    const haas = registry.search({ manufacturer: "Haas" });
    expect(haas).toHaveLength(1);
    expect(haas[0].manufacturer).toBe("Haas");
  });

  it("search by has_section filters correctly", () => {
    const withAlarms = makeSampleHandbook("HBK-WITH");
    const noAlarms = { ...makeSampleHandbook("HBK-WITHOUT"), alarm_codes: [], machine_id: "other-1" };
    registry.upsert(withAlarms);
    registry.upsert(noAlarms);
    const results = registry.search({ has_section: "alarm_codes" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("HBK-WITH");
  });

  it("list returns summaries with section keys", () => {
    registry.upsert(makeSampleHandbook());
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0].sections).toContain("spindle_specs");
    expect(list[0].sections).toContain("alarm_codes");
    expect(list[0].sections).toContain("parts_book");
  });

  it("stats returns coverage breakdown", () => {
    registry.upsert(makeSampleHandbook());
    const stats = registry.stats();
    expect(stats.total).toBe(1);
    expect(stats.by_manufacturer["Haas"]).toBe(1);
    expect(stats.section_coverage["spindle_specs"]).toBe(1);
    expect(stats.section_coverage["alarm_codes"]).toBe(1);
  });

  it("persists to disk and survives re-init", () => {
    registry.upsert(makeSampleHandbook());
    // Create a new registry instance pointing at same dir (simulates restart)
    const registry2 = new MachineHandbookRegistry(TEST_DIR);
    registry2.init();
    expect(registry2.size).toBe(1);
    const loaded = registry2.get("HBK-TEST-001");
    expect(loaded).toBeDefined();
    expect(loaded!.spindle_specs?.max_rpm).toBe(8100);
  });
});
