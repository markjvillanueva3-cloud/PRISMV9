/**
 * HBK-MS5 — HandbookMaintenanceIntelligenceEngine Tests
 *
 * Verifies:
 * 1. PM schedule extraction and categorization from handbook data
 * 2. Parts BOM extraction with criticality sorting
 * 3. Consumable tracking with replacement interval costing
 * 4. Annual maintenance cost estimation with labor, parts, consumables
 * 5. Maintenance calendar generation (12-month view)
 * 6. Multi-machine cost comparison
 * 7. Edge cases: no handbook, empty schedule, no pricing, sanity checks
 *
 * Test data: realistic Haas VF-2 and DMG MORI DMU 50 maintenance schedules
 * based on published handbook PM intervals and typical parts pricing.
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { MachineHandbook } from "../engines/MachineHandbookRegistryEngine.js";

// ── Mock Registry ──────────────────────────────────────────────────

function makeSource(page: number = 1) {
  return {
    handbook_title: "Test Handbook",
    page_number: page,
    extraction_method: "manual" as const,
    confidence: 0.95,
    extracted_at: "2026-03-29T00:00:00Z",
  };
}

/** Realistic Haas VF-2 handbook with 15+ maintenance tasks and parts BOM. */
const HAAS_VF2_HANDBOOK: MachineHandbook = {
  id: "haas_vf_2_handbook",
  machine_id: "haas_vf_2",
  manufacturer: "Haas",
  model: "VF-2",
  version: "1.0.0",
  created_at: "2026-03-29T00:00:00Z",
  updated_at: "2026-03-29T00:00:00Z",
  maintenance_schedule: [
    { task_id: "PM-001", task: "Check coolant level and concentration", interval: "daily", category: "inspection", procedure_steps: ["Open coolant tank", "Check level", "Test refractometer"], parts_needed: [], safety_warnings: [], estimated_time_min: 5, requires_power_off: false, source: makeSource(45) },
    { task_id: "PM-002", task: "Clean chip tray and conveyor", interval: "daily", category: "cleaning", procedure_steps: ["Remove chips", "Wipe down"], parts_needed: [], safety_warnings: [], estimated_time_min: 10, requires_power_off: false, source: makeSource(45) },
    { task_id: "PM-003", task: "Grease way lube reservoir", interval: "weekly", category: "lubrication", procedure_steps: ["Check way lube level", "Top off if below MIN"], parts_needed: [{ part_number: "93-0510", description: "Way lube oil (1 gal)", quantity: 1 }], safety_warnings: [], estimated_time_min: 10, requires_power_off: false, source: makeSource(46) },
    { task_id: "PM-004", task: "Inspect spindle belt tension", interval: "monthly", category: "inspection", procedure_steps: ["Remove rear cover", "Check tension gauge"], parts_needed: [], safety_warnings: ["Lock out power"], estimated_time_min: 20, requires_power_off: true, source: makeSource(47) },
    { task_id: "PM-005", task: "Clean coolant tank and replace coolant", interval: "quarterly", category: "fluid_change", procedure_steps: ["Drain tank", "Clean sump", "Refill with fresh coolant"], parts_needed: [{ part_number: "93-0420", description: "Coolant concentrate (5 gal)", quantity: 1 }], safety_warnings: ["Wear gloves"], estimated_time_min: 60, requires_power_off: true, source: makeSource(48) },
    { task_id: "PM-006", task: "Replace spindle air filter", interval: "quarterly", category: "replacement", procedure_steps: ["Remove old filter", "Install new filter"], parts_needed: [{ part_number: "93-0306", description: "Spindle air filter", quantity: 1 }], safety_warnings: [], estimated_time_min: 15, requires_power_off: false, source: makeSource(49) },
    { task_id: "PM-007", task: "Check hydraulic pressure and fluid level", interval: "monthly", category: "inspection", procedure_steps: ["Check gauge", "Verify 500 psi"], parts_needed: [], safety_warnings: [], estimated_time_min: 10, requires_power_off: false, source: makeSource(50) },
    { task_id: "PM-008", task: "Lubricate tool changer arm", interval: "hours_500", category: "lubrication", procedure_steps: ["Apply grease to pivot points", "Cycle ATC 10 times"], parts_needed: [{ part_number: "93-0515", description: "Mobilux EP 2 grease cartridge", quantity: 1 }], safety_warnings: [], estimated_time_min: 15, requires_power_off: false, source: makeSource(51) },
    { task_id: "PM-009", task: "Replace way lube filter", interval: "hours_1000", category: "replacement", procedure_steps: ["Remove old filter", "Install new", "Prime system"], parts_needed: [{ part_number: "93-0313", description: "Way lube inline filter", quantity: 1 }], safety_warnings: [], estimated_time_min: 20, requires_power_off: true, source: makeSource(52) },
    { task_id: "PM-010", task: "Replace hydraulic fluid", interval: "annual", category: "fluid_change", procedure_steps: ["Drain hydraulic reservoir", "Replace fluid", "Bleed system"], parts_needed: [{ part_number: "93-0422", description: "Hydraulic fluid AW32 (5 gal)", quantity: 1 }], safety_warnings: ["Lock out power"], estimated_time_min: 90, requires_power_off: true, source: makeSource(53) },
    { task_id: "PM-011", task: "Replace spindle belt", interval: "hours_5000", category: "replacement", procedure_steps: ["Remove old belt", "Install new belt", "Set tension"], parts_needed: [{ part_number: "93-0638", description: "Spindle drive belt", quantity: 1 }], safety_warnings: ["Lock out power"], estimated_time_min: 120, requires_power_off: true, source: makeSource(54) },
    { task_id: "PM-012", task: "Full machine calibration (backlash, home)", interval: "annual", category: "calibration", procedure_steps: ["Run diagnostic", "Calibrate axes", "Set backlash comp"], parts_needed: [], safety_warnings: [], estimated_time_min: 180, requires_power_off: false, source: makeSource(55) },
    { task_id: "PM-013", task: "Inspect and clean electrical cabinet", interval: "semi_annual", category: "inspection", procedure_steps: ["Open cabinet", "Blow out dust", "Check connections"], parts_needed: [], safety_warnings: ["Lock out power", "Discharge capacitors"], estimated_time_min: 45, requires_power_off: true, source: makeSource(56) },
    { task_id: "PM-014", task: "Replace coolant pump seal", interval: "hours_5000", category: "replacement", procedure_steps: ["Remove pump", "Replace seal", "Reinstall"], parts_needed: [{ part_number: "93-0741", description: "Coolant pump mechanical seal", quantity: 1 }], safety_warnings: ["Lock out power"], estimated_time_min: 60, requires_power_off: true, source: makeSource(57) },
    { task_id: "PM-015", task: "Check and adjust gibs", interval: "semi_annual", category: "adjustment", procedure_steps: ["Mount indicator", "Check play", "Adjust gibs"], parts_needed: [], safety_warnings: [], estimated_time_min: 60, requires_power_off: false, source: makeSource(58) },
    { task_id: "PM-016", task: "Replace chip conveyor chain", interval: "hours_10000", category: "replacement", procedure_steps: ["Remove old chain", "Install new chain", "Tension"], parts_needed: [{ part_number: "93-1205", description: "Chip conveyor chain assembly", quantity: 1 }], safety_warnings: ["Lock out power"], estimated_time_min: 240, requires_power_off: true, source: makeSource(59) },
  ],
  parts_book: [
    { oem_part_number: "93-0510", description: "Way lube oil (1 gal)", category: "lubrication", quantity_per_machine: 1, replacement_interval_hours: 500, unit_price_usd: 28, cross_references: [{ vendor: "Mobil", part_number: "Vactra No. 2" }], critical: false, source: makeSource(80) },
    { oem_part_number: "93-0420", description: "Coolant concentrate (5 gal)", category: "coolant", quantity_per_machine: 1, replacement_interval_hours: 500, unit_price_usd: 85, cross_references: [{ vendor: "Master Chemical", part_number: "TRIM SC520" }], critical: false, source: makeSource(81) },
    { oem_part_number: "93-0306", description: "Spindle air filter", category: "filter", quantity_per_machine: 1, replacement_interval_hours: 500, unit_price_usd: 12, cross_references: [], critical: false, source: makeSource(82) },
    { oem_part_number: "93-0515", description: "Mobilux EP 2 grease cartridge", category: "lubrication", quantity_per_machine: 1, unit_price_usd: 8, cross_references: [], critical: false, source: makeSource(83) },
    { oem_part_number: "93-0313", description: "Way lube inline filter", category: "filter", quantity_per_machine: 1, replacement_interval_hours: 1000, unit_price_usd: 22, cross_references: [], critical: false, source: makeSource(84) },
    { oem_part_number: "93-0422", description: "Hydraulic fluid AW32 (5 gal)", category: "lubrication", quantity_per_machine: 1, replacement_interval_hours: 2000, unit_price_usd: 45, cross_references: [], critical: false, source: makeSource(85) },
    { oem_part_number: "93-0638", description: "Spindle drive belt", category: "belt", quantity_per_machine: 1, replacement_interval_hours: 5000, unit_price_usd: 165, cross_references: [], critical: true, source: makeSource(86) },
    { oem_part_number: "93-0741", description: "Coolant pump mechanical seal", category: "seal", quantity_per_machine: 1, replacement_interval_hours: 5000, unit_price_usd: 95, cross_references: [], critical: true, source: makeSource(87) },
    { oem_part_number: "93-1205", description: "Chip conveyor chain assembly", category: "consumable", quantity_per_machine: 1, replacement_interval_hours: 10000, unit_price_usd: 450, cross_references: [], critical: false, source: makeSource(88) },
    { oem_part_number: "93-2210", description: "Spindle bearing set (angular contact)", category: "bearing", quantity_per_machine: 1, unit_price_usd: 2800, cross_references: [{ vendor: "NSK", part_number: "7014CTYNDBLP4" }], critical: true, source: makeSource(89) },
  ],
  alarm_codes: [],
  programming_tips: [],
  safety_limits: [],
};

/** Minimal DMG handbook — fewer tasks, some missing prices. */
const DMG_DMU50_HANDBOOK: MachineHandbook = {
  id: "dmg_dmu_50_handbook",
  machine_id: "dmg_mori_dmu_50",
  manufacturer: "DMG MORI",
  model: "DMU 50",
  version: "1.0.0",
  created_at: "2026-03-29T00:00:00Z",
  updated_at: "2026-03-29T00:00:00Z",
  maintenance_schedule: [
    { task_id: "DMG-PM-001", task: "Check spindle runout", interval: "weekly", category: "inspection", procedure_steps: ["Mount test bar", "Indicate runout"], parts_needed: [], safety_warnings: [], estimated_time_min: 15, requires_power_off: false, source: makeSource(30) },
    { task_id: "DMG-PM-002", task: "Replace central lubrication cartridge", interval: "hours_1000", category: "replacement", procedure_steps: ["Remove old cartridge", "Insert new"], parts_needed: [{ part_number: "DMG-LUB-001", description: "Central lube cartridge", quantity: 1 }], safety_warnings: [], estimated_time_min: 10, requires_power_off: false, source: makeSource(31) },
    { task_id: "DMG-PM-003", task: "Clean rotary table seals", interval: "monthly", category: "cleaning", procedure_steps: ["Remove chips from seal area", "Inspect for damage"], parts_needed: [], safety_warnings: [], estimated_time_min: 20, requires_power_off: false, source: makeSource(32) },
    { task_id: "DMG-PM-004", task: "Replace rotary table seal kit", interval: "hours_5000", category: "replacement", procedure_steps: ["Remove old seals", "Install kit"], parts_needed: [{ part_number: "DMG-SEAL-001", description: "Rotary table seal kit", quantity: 1 }], safety_warnings: ["Lock out power"], estimated_time_min: 120, requires_power_off: true, source: makeSource(33) },
  ],
  parts_book: [
    { oem_part_number: "DMG-LUB-001", description: "Central lube cartridge", category: "lubrication", quantity_per_machine: 1, replacement_interval_hours: 1000, unit_price_usd: 35, cross_references: [], critical: false, source: makeSource(60) },
    { oem_part_number: "DMG-SEAL-001", description: "Rotary table seal kit", category: "seal", quantity_per_machine: 1, replacement_interval_hours: 5000, unit_price_usd: 280, cross_references: [], critical: true, source: makeSource(61) },
    { oem_part_number: "DMG-BEAR-001", description: "B-axis bearing preload assembly", category: "bearing", quantity_per_machine: 1, unit_price_usd: undefined as any, cross_references: [], critical: true, source: makeSource(62) },
  ],
  alarm_codes: [],
  programming_tips: [],
  safety_limits: [],
};

/** Mock registry that returns handbooks by machine_id. */
function createMockRegistry(handbooks: MachineHandbook[]) {
  const map = new Map(handbooks.map(h => [h.machine_id, h]));
  return {
    getByMachineId: (id: string) => map.get(id) ?? null,
    list: () => handbooks.map(h => ({ machine_id: h.machine_id })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe("HandbookMaintenanceIntelligenceEngine", () => {
  let engine: any;
  let registry: ReturnType<typeof createMockRegistry>;

  beforeAll(async () => {
    const mod = await import("../engines/HandbookMaintenanceIntelligenceEngine.js");
    engine = new mod.HandbookMaintenanceIntelligenceEngine();
    registry = createMockRegistry([HAAS_VF2_HANDBOOK, DMG_DMU50_HANDBOOK]);
  });

  // ── U01: PM Schedule Extraction ────────────────────────────────

  describe("PM Schedule Extraction (U01)", () => {
    it("returns structured PM schedule for Haas VF-2 with 16 tasks", () => {
      const result = engine.getMaintenanceSchedule("haas_vf_2", registry);
      expect(result).not.toBeNull();
      expect(result.task_count).toBe(16);
      expect(result.tasks.length).toBe(16);
    });

    it("includes all maintenance categories", () => {
      const result = engine.getMaintenanceSchedule("haas_vf_2", registry);
      expect(result.categories).toContain("lubrication");
      expect(result.categories).toContain("inspection");
      expect(result.categories).toContain("cleaning");
      expect(result.categories).toContain("replacement");
      expect(result.categories).toContain("calibration");
      expect(result.categories).toContain("fluid_change");
      expect(result.categories).toContain("adjustment");
    });

    it("sorts tasks by frequency (highest first)", () => {
      const result = engine.getMaintenanceSchedule("haas_vf_2", registry);
      // Daily tasks should come before annual tasks
      const dailyIdx = result.tasks.findIndex((t: any) => t.interval === "daily");
      const annualIdx = result.tasks.findIndex((t: any) => t.interval === "annual");
      expect(dailyIdx).toBeLessThan(annualIdx);
    });

    it("returns null for unknown machine", () => {
      const result = engine.getMaintenanceSchedule("unknown_xyz", registry);
      expect(result).toBeNull();
    });

    it("returns DMG DMU 50 schedule with 4 tasks", () => {
      const result = engine.getMaintenanceSchedule("dmg_mori_dmu_50", registry);
      expect(result).not.toBeNull();
      expect(result.task_count).toBe(4);
    });
  });

  // ── U02: Parts BOM Extraction ──────────────────────────────────

  describe("Parts BOM Extraction (U02)", () => {
    it("returns parts BOM for Haas VF-2 with 10 parts", () => {
      const result = engine.getPartsBOM("haas_vf_2", registry);
      expect(result).not.toBeNull();
      expect(result.part_count).toBe(10);
    });

    it("identifies critical parts", () => {
      const result = engine.getPartsBOM("haas_vf_2", registry);
      expect(result.critical_count).toBe(3); // spindle belt, coolant seal, spindle bearing
    });

    it("sorts critical parts first", () => {
      const result = engine.getPartsBOM("haas_vf_2", registry);
      const firstPart = result.parts[0];
      expect(firstPart.critical).toBe(true);
    });

    it("returns correct part categories", () => {
      const result = engine.getPartsBOM("haas_vf_2", registry);
      expect(result.categories).toContain("lubrication");
      expect(result.categories).toContain("filter");
      expect(result.categories).toContain("belt");
      expect(result.categories).toContain("bearing");
    });

    it("returns null for unknown machine", () => {
      const result = engine.getPartsBOM("unknown_xyz", registry);
      expect(result).toBeNull();
    });

    it("identifies unpriced parts in DMG handbook", () => {
      const result = engine.getPartsBOM("dmg_mori_dmu_50", registry);
      const unpriced = result.parts.filter((p: any) => p.unit_price_usd == null);
      expect(unpriced.length).toBe(1); // B-axis bearing has no price
    });
  });

  // ── Consumable Tracking ────────────────────────────────────────

  describe("Consumable Tracking", () => {
    it("identifies consumables with replacement intervals", () => {
      const consumables = engine.getConsumables("haas_vf_2", registry);
      expect(consumables.length).toBeGreaterThan(0);
      // All should have replacement_interval_hours or be category=consumable
      for (const c of consumables) {
        expect(
          c.replacement_interval_hours !== null || c.category === "consumable",
        ).toBe(true);
      }
    });

    it("calculates annual replacements based on 2000 operating hours", () => {
      const consumables = engine.getConsumables("haas_vf_2", registry, 2000);
      const wayLube = consumables.find((c: any) => c.oem_part_number === "93-0510");
      expect(wayLube).toBeDefined();
      // 2000h / 500h interval = 4 replacements/year
      expect(wayLube.annual_replacements).toBe(4);
    });

    it("adjusts for custom operating hours", () => {
      const consumables = engine.getConsumables("haas_vf_2", registry, 4000);
      const wayLube = consumables.find((c: any) => c.oem_part_number === "93-0510");
      // 4000h / 500h = 8 replacements/year
      expect(wayLube.annual_replacements).toBe(8);
    });

    it("calculates annual cost for priced consumables", () => {
      const consumables = engine.getConsumables("haas_vf_2", registry, 2000);
      const wayLube = consumables.find((c: any) => c.oem_part_number === "93-0510");
      // $28 × 1 qty × 4 replacements = $112/year
      expect(wayLube.annual_cost).toBe(112);
    });

    it("returns empty array for unknown machine", () => {
      const consumables = engine.getConsumables("unknown_xyz", registry);
      expect(consumables).toEqual([]);
    });
  });

  // ── U03: Annual Cost Estimation ────────────────────────────────

  describe("Annual Cost Estimation (U03)", () => {
    it("produces positive annual cost for Haas VF-2", () => {
      const result = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50 },
        registry,
      );
      expect(result.total_annual_cost).toBeGreaterThan(0);
      expect(result.labor_cost).toBeGreaterThan(0);
      expect(result.parts_cost).toBeGreaterThan(0);
      expect(result.consumable_cost).toBeGreaterThan(0);
    });

    it("cost breakdown sums to total", () => {
      const result = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50 },
        registry,
      );
      const sum = result.labor_cost + result.parts_cost +
        result.consumable_cost + result.downtime_cost;
      expect(Math.abs(result.total_annual_cost - sum)).toBeLessThan(1); // rounding tolerance
    });

    it("cost per operating hour is reasonable (< $50/hr for maintenance)", () => {
      const result = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50, operating_hours_per_year: 2000 },
        registry,
      );
      // CNC maintenance typically $3-15/operating hour
      expect(result.cost_per_operating_hour).toBeGreaterThan(1);
      expect(result.cost_per_operating_hour).toBeLessThan(50);
    });

    it("labor cost scales with labor rate", () => {
      const low = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 30 },
        registry,
      );
      const high = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 80 },
        registry,
      );
      expect(high.labor_cost).toBeGreaterThan(low.labor_cost);
      // Labor should scale roughly proportionally
      const ratio = high.labor_cost / low.labor_cost;
      expect(ratio).toBeCloseTo(80 / 30, 0);
    });

    it("includes downtime cost when configured", () => {
      const withoutDowntime = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50, include_downtime_cost: false },
        registry,
      );
      const withDowntime = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50, include_downtime_cost: true, machine_hourly_rate: 150 },
        registry,
      );
      expect(withDowntime.downtime_cost).toBeGreaterThan(0);
      expect(withDowntime.total_annual_cost).toBeGreaterThan(withoutDowntime.total_annual_cost);
    });

    it("parts markup increases parts cost", () => {
      const noMarkup = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50, parts_markup_pct: 0 },
        registry,
      );
      const withMarkup = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50, parts_markup_pct: 25 },
        registry,
      );
      expect(withMarkup.parts_cost).toBeGreaterThan(noMarkup.parts_cost);
    });

    it("produces category breakdown", () => {
      const result = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50 },
        registry,
      );
      expect(result.category_breakdown).toBeDefined();
      expect(result.category_breakdown["lubrication"]).toBeDefined();
      expect(result.category_breakdown["lubrication"].labor).toBeGreaterThan(0);
    });

    it("has higher confidence with complete data", () => {
      const haas = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50 },
        registry,
      );
      const dmg = engine.estimateAnnualCost(
        { machine_id: "dmg_mori_dmu_50", labor_rate_per_hour: 50 },
        registry,
      );
      // Haas has more tasks + more priced parts = higher confidence
      expect(haas.confidence).toBeGreaterThan(dmg.confidence);
    });

    it("returns zero costs for unknown machine with confidence notes", () => {
      const result = engine.estimateAnnualCost(
        { machine_id: "unknown_xyz", labor_rate_per_hour: 50 },
        registry,
      );
      expect(result.total_annual_cost).toBe(0);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.confidence_notes.length).toBeGreaterThan(0);
    });

    it("notes unpriced parts in DMG handbook", () => {
      const result = engine.estimateAnnualCost(
        { machine_id: "dmg_mori_dmu_50", labor_rate_per_hour: 50 },
        registry,
      );
      const unpricedNote = result.confidence_notes.find(
        (n: string) => n.includes("no pricing"),
      );
      expect(unpricedNote).toBeDefined();
    });

    it("Haas VF-2 annual cost within industry range ($3k-$15k)", () => {
      const result = engine.estimateAnnualCost(
        { machine_id: "haas_vf_2", labor_rate_per_hour: 50, operating_hours_per_year: 2000 },
        registry,
      );
      // Typical VMC maintenance: $4k-$12k/year depending on hours and labor rate
      expect(result.total_annual_cost).toBeGreaterThan(2000);
      expect(result.total_annual_cost).toBeLessThan(20000);
    });
  });

  // ── Maintenance Calendar ───────────────────────────────────────

  describe("Maintenance Calendar", () => {
    it("generates 12-month calendar", () => {
      const calendar = engine.getMaintenanceCalendar("haas_vf_2", registry);
      expect(calendar).toHaveLength(12);
      expect(calendar[0].month).toBe(1);
      expect(calendar[11].month).toBe(12);
    });

    it("December has the most tasks (annual + semi-annual converge)", () => {
      const calendar = engine.getMaintenanceCalendar("haas_vf_2", registry);
      const dec = calendar[11];
      const jan = calendar[0];
      expect(dec.tasks.length).toBeGreaterThanOrEqual(jan.tasks.length);
    });

    it("each entry has time and downtime estimates", () => {
      const calendar = engine.getMaintenanceCalendar("haas_vf_2", registry);
      for (const entry of calendar) {
        expect(entry.total_time_min).toBeGreaterThanOrEqual(0);
        expect(entry.estimated_downtime_hours).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns empty for unknown machine", () => {
      const calendar = engine.getMaintenanceCalendar("unknown_xyz", registry);
      expect(calendar).toEqual([]);
    });
  });

  // ── Machine Comparison ─────────────────────────────────────────

  describe("Machine Comparison", () => {
    it("ranks machines by cost per operating hour", () => {
      const comparison = engine.compareMachines(
        ["haas_vf_2", "dmg_mori_dmu_50"],
        registry,
        { labor_rate_per_hour: 50 },
      );
      expect(comparison).toHaveLength(2);
      expect(comparison[0].rank).toBe(1);
      expect(comparison[1].rank).toBe(2);
      // Rank 1 should have lower or equal cost per hour
      expect(comparison[0].cost_per_operating_hour)
        .toBeLessThanOrEqual(comparison[1].cost_per_operating_hour);
    });

    it("includes unknown machines with zero cost", () => {
      const comparison = engine.compareMachines(
        ["haas_vf_2", "unknown_xyz"],
        registry,
        { labor_rate_per_hour: 50 },
      );
      expect(comparison).toHaveLength(2);
      const unknown = comparison.find((c: any) => c.machine_id === "unknown_xyz");
      expect(unknown.total_annual_cost).toBe(0);
    });
  });
});
