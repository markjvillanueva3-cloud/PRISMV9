/**
 * MachineDataAuditEngine Tests
 * MCAT-MS0 U-MCAT01/U-MCAT02: Machine data audit and CanonicalMachinePackage validation
 *
 * Tests:
 * - Field completeness auditing
 * - Layer/manufacturer/type queries
 * - Package validation and generation
 * - Critical gap detection
 * - Audit report generation
 *
 * @module __tests__/MachineDataAuditEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MachineDataAuditEngine,
  CanonicalMachinePackage,
  SpindlePackage,
  AxisPackage,
  ControllerPackage,
  CoolantPackage,
  EnvelopePackage,
  ToolChangerPackage,
  FieldCompletenessReport,
  LayerCompletenessReport,
  MachineAuditResult,
} from "../engines/MachineDataAuditEngine.js";

describe("MachineDataAuditEngine", () => {
  // ============================================================================
  // TYPE VALIDATION (U-MCAT02)
  // ============================================================================

  describe("CanonicalMachinePackage Type", () => {
    it("should compile SpindlePackage interface correctly", () => {
      const spindle: SpindlePackage = {
        max_rpm: 10000,
        min_rpm: 100,
        power_continuous_kw: 15,
        power_30min_kw: 22,
        torque_max_nm: 120,
        torque_continuous_nm: 90,
        bearing_type: "angular_contact",
        spindle_nose: "BT40",
        coolant_through: true,
        coolant_pressure_bar: 20,
        taper: "BT40",
        orientation: "vertical",
        completeness: 0.95,
      };
      expect(spindle.max_rpm).toBe(10000);
      expect(spindle.orientation).toBe("vertical");
    });

    it("should compile AxisPackage interface correctly", () => {
      const axis: AxisPackage = {
        name: "X",
        travel_mm: 500,
        rapid_rate_mm_min: 30000,
        max_feed_rate_mm_min: 10000,
        acceleration_m_s2: 5,
        resolution_um: 1,
        repeatability_um: 3,
        accuracy_um: 5,
        completeness: 1.0,
      };
      expect(axis.name).toBe("X");
      expect(axis.travel_mm).toBe(500);
    });

    it("should compile ControllerPackage interface correctly", () => {
      const controller: ControllerPackage = {
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
      };
      expect(controller.brand).toBe("Siemens");
      expect(controller.nurbs).toBe(true);
    });

    it("should compile CoolantPackage interface correctly", () => {
      const coolant: CoolantPackage = {
        type: "through_spindle",
        pressure_bar: 40,
        flow_rate_lpm: 25,
        tank_capacity_l: 200,
        filtration: true,
        chiller: true,
        completeness: 1.0,
      };
      expect(coolant.type).toBe("through_spindle");
      expect(coolant.pressure_bar).toBe(40);
    });

    it("should compile EnvelopePackage interface correctly", () => {
      const envelope: EnvelopePackage = {
        x_travel_mm: 500,
        y_travel_mm: 400,
        z_travel_mm: 400,
        a_travel_deg: 180,
        c_travel_deg: 360,
        table_size_mm: { x: 500, y: 400 },
        max_part_weight_kg: 300,
        completeness: 0.95,
      };
      expect(envelope.x_travel_mm).toBe(500);
      expect(envelope.a_travel_deg).toBe(180);
    });

    it("should compile ToolChangerPackage interface correctly", () => {
      const toolChanger: ToolChangerPackage = {
        type: "chain",
        capacity: 60,
        max_tool_diameter_mm: 80,
        max_tool_length_mm: 350,
        max_tool_weight_kg: 8,
        change_time_s: 2.8,
        completeness: 1.0,
      };
      expect(toolChanger.type).toBe("chain");
      expect(toolChanger.capacity).toBe(60);
    });

    it("should compile full CanonicalMachinePackage interface", () => {
      const machine: CanonicalMachinePackage = {
        id: "test-machine",
        manufacturer: "Test Mfr",
        model: "TM-100",
        machine_type: "vmc",
        axes_count: 3,
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
          completeness: 0.9,
        },
        axes: [],
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
          completeness: 0.6,
        },
        coolant: {
          type: "flood",
          pressure_bar: 4,
          flow_rate_lpm: 30,
          tank_capacity_l: 100,
          filtration: true,
          chiller: false,
          completeness: 0.8,
        },
        envelope: {
          x_travel_mm: 500,
          y_travel_mm: 400,
          z_travel_mm: 400,
          table_size_mm: { x: 500, y: 400 },
          max_part_weight_kg: 300,
          completeness: 0.7,
        },
        tool_changer: {
          type: "carousel",
          capacity: 20,
          max_tool_diameter_mm: 80,
          max_tool_length_mm: 250,
          max_tool_weight_kg: 5,
          change_time_s: 4,
          completeness: 1.0,
        },
        footprint_mm: { length: 2500, width: 2000, height: 2500 },
        weight_kg: 5000,
        power_requirement_kva: 30,
        simultaneous_axes: 3,
        high_speed_machining: false,
        rigid_tapping: true,
        probing_ready: false,
        automation_ready: false,
        options_installed: [],
        options_available: [],
        layer: "CORE",
        completeness_score: 0.75,
        data_sources: {
          registry: true,
          handbook: false,
          shop_profile: false,
          user_override: false,
        },
      };
      expect(machine.id).toBe("test-machine");
      expect(machine.layer).toBe("CORE");
    });
  });

  // ============================================================================
  // FIELD COMPLETENESS AUDITING (U-MCAT01)
  // ============================================================================

  describe("auditMachineFields", () => {
    it("should audit all fields for a complete machine", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "test-1",
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
          completeness: 0.9,
        },
      };

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(audit["spindle.max_rpm"]).toBe(true);
      expect(audit["spindle.power_continuous_kw"]).toBe(true);
      expect(audit["controller.brand"]).toBe(true);
      expect(audit["controller.family"]).toBe(true);
    });

    it("should mark missing fields as false", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "test-2",
        manufacturer: "Haas",
      };

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(audit["spindle.max_rpm"]).toBe(false);
      expect(audit["controller.brand"]).toBe(false);
      expect(audit["envelope.x_travel_mm"]).toBe(false);
    });

    it("should handle partial spindle data", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "test-3",
        spindle: {
          max_rpm: 10000,
          min_rpm: 0,
          power_continuous_kw: 0,
          power_30min_kw: 0,
          torque_max_nm: 0,
          torque_continuous_nm: 0,
          bearing_type: "",
          spindle_nose: "",
          coolant_through: false,
          taper: "",
          orientation: "vertical",
          completeness: 0,
        },
      };

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(audit["spindle.max_rpm"]).toBe(true);
      expect(audit["spindle.orientation"]).toBe(true);
    });
  });

  describe("calculateCompleteness", () => {
    it("should return 0-1 completeness score", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "test",
        manufacturer: "Test",
        model: "T1",
      };

      const score = MachineDataAuditEngine.calculateCompleteness(machine);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return higher score for more complete machines", () => {
      const sparse: Partial<CanonicalMachinePackage> = { id: "sparse" };
      const complete: Partial<CanonicalMachinePackage> = {
        id: "complete",
        manufacturer: "Test",
        model: "T1",
        machine_type: "vmc",
        axes_count: 3,
        spindle: {
          max_rpm: 8000,
          min_rpm: 100,
          power_continuous_kw: 15,
          power_30min_kw: 20,
          torque_max_nm: 100,
          torque_continuous_nm: 80,
          bearing_type: "angular_contact",
          spindle_nose: "BT40",
          coolant_through: true,
          taper: "BT40",
          orientation: "vertical",
          completeness: 1.0,
        },
      };

      const sparseScore = MachineDataAuditEngine.calculateCompleteness(sparse);
      const completeScore = MachineDataAuditEngine.calculateCompleteness(complete);
      expect(completeScore).toBeGreaterThan(sparseScore);
    });
  });

  // ============================================================================
  // AUDIT REPORT GENERATION
  // ============================================================================

  describe("generateAuditReport", () => {
    it("should generate a complete audit report", () => {
      const report = MachineDataAuditEngine.generateAuditReport();

      expect(report.totalMachines).toBeGreaterThan(0);
      expect(report.byLayer).toBeDefined();
      expect(report.byManufacturer).toBeDefined();
      expect(report.byType).toBeDefined();
      expect(report.auditDate).toBeDefined();
    });

    it("should include layer completeness reports", () => {
      const report = MachineDataAuditEngine.generateAuditReport();

      expect(report.byLayer).toHaveProperty("BASIC");
      expect(report.byLayer).toHaveProperty("CORE");
      expect(report.byLayer).toHaveProperty("ENHANCED");
      expect(report.byLayer).toHaveProperty("LEVEL5");
    });

    it("should count machines by manufacturer", () => {
      const report = MachineDataAuditEngine.generateAuditReport();

      const manufacturers = Object.keys(report.byManufacturer);
      expect(manufacturers.length).toBeGreaterThan(0);
    });

    it("should count machines by type", () => {
      const report = MachineDataAuditEngine.generateAuditReport();

      const types = Object.keys(report.byType);
      expect(types.length).toBeGreaterThan(0);
    });

    it("should include field completeness percentages", () => {
      const report = MachineDataAuditEngine.generateAuditReport();

      for (const layerReport of Object.values(report.byLayer)) {
        if (layerReport.machines > 0) {
          expect(layerReport.fieldReports.length).toBeGreaterThan(0);
          for (const fr of layerReport.fieldReports) {
            expect(fr.percent).toBeGreaterThanOrEqual(0);
            expect(fr.percent).toBeLessThanOrEqual(100);
          }
        }
      }
    });

    it("should include ISO date for audit timestamp", () => {
      const report = MachineDataAuditEngine.generateAuditReport();
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(report.auditDate).toMatch(datePattern);
    });
  });

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  describe("getMachinesByLayer", () => {
    it("should return machines for ENHANCED layer", () => {
      const machines = MachineDataAuditEngine.getMachinesByLayer("ENHANCED");
      for (const m of machines) {
        expect(m.layer).toBe("ENHANCED");
      }
    });

    it("should return machines for LEVEL5 layer", () => {
      const machines = MachineDataAuditEngine.getMachinesByLayer("LEVEL5");
      for (const m of machines) {
        expect(m.layer).toBe("LEVEL5");
      }
    });

    it("should return empty array for layer with no machines", () => {
      const machines = MachineDataAuditEngine.getMachinesByLayer("BASIC");
      expect(Array.isArray(machines)).toBe(true);
    });
  });

  describe("getMachinesByManufacturer", () => {
    it("should return machines for Haas", () => {
      const machines = MachineDataAuditEngine.getMachinesByManufacturer("Haas");
      expect(machines.length).toBeGreaterThan(0);
      for (const m of machines) {
        expect(m.manufacturer?.toLowerCase()).toBe("haas");
      }
    });

    it("should be case-insensitive", () => {
      const lower = MachineDataAuditEngine.getMachinesByManufacturer("haas");
      const upper = MachineDataAuditEngine.getMachinesByManufacturer("HAAS");
      expect(lower.length).toBe(upper.length);
    });

    it("should return empty array for unknown manufacturer", () => {
      const machines = MachineDataAuditEngine.getMachinesByManufacturer("Unknown Mfr");
      expect(machines.length).toBe(0);
    });
  });

  describe("getMachinesByType", () => {
    it("should return VMC machines", () => {
      const machines = MachineDataAuditEngine.getMachinesByType("vmc");
      expect(machines.length).toBeGreaterThan(0);
      for (const m of machines) {
        expect(m.machine_type).toBe("vmc");
      }
    });

    it("should return lathe machines", () => {
      const machines = MachineDataAuditEngine.getMachinesByType("lathe");
      for (const m of machines) {
        expect(m.machine_type).toBe("lathe");
      }
    });

    it("should return 5-axis machines", () => {
      const machines = MachineDataAuditEngine.getMachinesByType("5axis");
      for (const m of machines) {
        expect(m.machine_type).toBe("5axis");
      }
    });
  });

  // ============================================================================
  // CRITICAL GAP DETECTION
  // ============================================================================

  describe("getCriticalFieldGaps", () => {
    it("should return FieldCompletenessReport array", () => {
      const gaps = MachineDataAuditEngine.getCriticalFieldGaps();
      expect(Array.isArray(gaps)).toBe(true);
    });

    it("should only return fields below 80% completeness", () => {
      const gaps = MachineDataAuditEngine.getCriticalFieldGaps();
      for (const gap of gaps) {
        expect(gap.percent).toBeLessThan(80);
      }
    });

    it("should include field and category in each report", () => {
      const gaps = MachineDataAuditEngine.getCriticalFieldGaps();
      for (const gap of gaps) {
        expect(gap.field).toBeDefined();
        expect(gap.category).toBeDefined();
        expect(gap.present).toBeDefined();
        expect(gap.total).toBeDefined();
      }
    });
  });

  // ============================================================================
  // PACKAGE VALIDATION
  // ============================================================================

  describe("validatePackage", () => {
    it("should validate a complete machine as valid", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "valid-machine",
        manufacturer: "DMG",
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
          taper: "HSK-A63",
          orientation: "vertical",
          completeness: 1.0,
        },
        controller: {
          brand: "Siemens",
          model: "840D",
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
        envelope: {
          x_travel_mm: 500,
          y_travel_mm: 450,
          z_travel_mm: 400,
          table_size_mm: { x: 500, y: 400 },
          max_part_weight_kg: 300,
          completeness: 1.0,
        },
      };

      const result = MachineDataAuditEngine.validatePackage(machine);
      expect(result.valid).toBe(true);
      expect(result.missingCritical.length).toBe(0);
      expect(result.completeness).toBeGreaterThan(0.5);
    });

    it("should invalidate a sparse machine", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "sparse-machine",
        manufacturer: "Unknown",
      };

      const result = MachineDataAuditEngine.validatePackage(machine);
      expect(result.valid).toBe(false);
      expect(result.missingCritical.length).toBeGreaterThan(0);
    });

    it("should list missing critical fields", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "test",
      };

      const result = MachineDataAuditEngine.validatePackage(machine);
      expect(result.missingCritical).toContain("spindle.max_rpm");
      expect(result.missingCritical).toContain("controller.brand");
    });

    it("should return completeness score", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "test",
        manufacturer: "Test",
        model: "T1",
      };

      const result = MachineDataAuditEngine.validatePackage(machine);
      expect(result.completeness).toBeGreaterThanOrEqual(0);
      expect(result.completeness).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // PACKAGE GENERATION
  // ============================================================================

  describe("generateCanonicalPackage", () => {
    it("should generate complete package from partial data", () => {
      const partial: Partial<CanonicalMachinePackage> = {
        id: "partial-1",
        manufacturer: "Test Mfr",
        model: "Test Model",
      };

      const pkg = MachineDataAuditEngine.generateCanonicalPackage(partial);

      expect(pkg.id).toBe("partial-1");
      expect(pkg.manufacturer).toBe("Test Mfr");
      expect(pkg.model).toBe("Test Model");
      expect(pkg.spindle).toBeDefined();
      expect(pkg.controller).toBeDefined();
      expect(pkg.coolant).toBeDefined();
      expect(pkg.envelope).toBeDefined();
      expect(pkg.tool_changer).toBeDefined();
    });

    it("should preserve provided spindle data", () => {
      const partial: Partial<CanonicalMachinePackage> = {
        spindle: {
          max_rpm: 15000,
          min_rpm: 50,
          power_continuous_kw: 25,
          power_30min_kw: 35,
          torque_max_nm: 150,
          torque_continuous_nm: 100,
          bearing_type: "ceramic",
          spindle_nose: "HSK-A63",
          coolant_through: true,
          taper: "HSK-A63",
          orientation: "vertical",
          completeness: 1.0,
        },
      };

      const pkg = MachineDataAuditEngine.generateCanonicalPackage(partial);

      expect(pkg.spindle.max_rpm).toBe(15000);
      expect(pkg.spindle.power_continuous_kw).toBe(25);
      expect(pkg.spindle.bearing_type).toBe("ceramic");
    });

    it("should use defaults for unspecified fields", () => {
      const partial: Partial<CanonicalMachinePackage> = {};

      const pkg = MachineDataAuditEngine.generateCanonicalPackage(partial);

      expect(pkg.manufacturer).toBe("Unknown");
      expect(pkg.model).toBe("Unknown");
      expect(pkg.machine_type).toBe("vmc");
      expect(pkg.layer).toBe("CORE");
    });

    it("should calculate completeness score", () => {
      const partial: Partial<CanonicalMachinePackage> = {
        id: "test-calc",
        manufacturer: "Haas",
      };

      const pkg = MachineDataAuditEngine.generateCanonicalPackage(partial);

      expect(pkg.completeness_score).toBeGreaterThan(0);
      expect(pkg.completeness_score).toBeLessThanOrEqual(1);
    });

    it("should set correct data_sources defaults", () => {
      const partial: Partial<CanonicalMachinePackage> = {};

      const pkg = MachineDataAuditEngine.generateCanonicalPackage(partial);

      expect(pkg.data_sources.registry).toBe(true);
      expect(pkg.data_sources.handbook).toBe(false);
      expect(pkg.data_sources.shop_profile).toBe(false);
      expect(pkg.data_sources.user_override).toBe(false);
    });
  });

  // ============================================================================
  // AUDIT SUMMARY
  // ============================================================================

  describe("getAuditSummary", () => {
    it("should return a formatted string summary", () => {
      const summary = MachineDataAuditEngine.getAuditSummary();

      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("should include total machine count", () => {
      const summary = MachineDataAuditEngine.getAuditSummary();

      expect(summary).toContain("Total Machines:");
    });

    it("should include layer breakdown", () => {
      const summary = MachineDataAuditEngine.getAuditSummary();

      expect(summary).toContain("By Layer:");
    });

    it("should include manufacturer breakdown", () => {
      const summary = MachineDataAuditEngine.getAuditSummary();

      expect(summary).toContain("By Manufacturer:");
    });

    it("should include audit date in header", () => {
      const summary = MachineDataAuditEngine.getAuditSummary();

      expect(summary).toContain("Machine Data Audit");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty partial machine", () => {
      const machine: Partial<CanonicalMachinePackage> = {};

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(Object.keys(audit).length).toBeGreaterThan(0);
    });

    it("should handle undefined nested objects gracefully", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        id: "edge-case",
      };

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(audit["spindle.max_rpm"]).toBe(false);
    });

    it("should handle zero values correctly", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        axes_count: 0,
      };

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(audit["axes_count"]).toBe(true); // 0 is a valid number
    });

    it("should handle boolean false values correctly", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        spindle: {
          max_rpm: 8000,
          min_rpm: 100,
          power_continuous_kw: 15,
          power_30min_kw: 20,
          torque_max_nm: 100,
          torque_continuous_nm: 75,
          bearing_type: "angular_contact",
          spindle_nose: "BT40",
          coolant_through: false, // explicit false
          taper: "BT40",
          orientation: "vertical",
          completeness: 0.9,
        },
      };

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(audit["spindle.coolant_through"]).toBe(true); // false is a valid boolean value
    });

    it("should handle empty string as not present", () => {
      const machine: Partial<CanonicalMachinePackage> = {
        manufacturer: "",
      };

      const audit = MachineDataAuditEngine.auditMachineFields(machine);
      expect(audit["manufacturer"]).toBe(false);
    });
  });
});
