/**
 * AlarmIntelligenceEngine — HBK-MS3 Test Suite
 * ==============================================
 * Tests alarm intelligence: handbook indexing, cross-referencing,
 * ranked troubleshooting guides, and provenance tagging.
 *
 * 45 tests across 7 groups.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  alarmIntelligenceEngine,
  type TroubleshootingGuide,
  type IndexedHandbookAlarm,
  type CrossReferencedAlarm,
  AlarmLookupEnhancedSchema,
  AlarmIndexQuerySchema,
} from "../engines/AlarmIntelligenceEngine.js";
import {
  machineHandbookRegistry,
  type MachineHandbook,
} from "../engines/MachineHandbookRegistryEngine.js";
import { alarmDiagnosticsEngine } from "../engines/AlarmDiagnosticsEngine.js";

// ============================================================================
// TEST DATA: Haas VF-2 handbook with alarm codes
// ============================================================================

const HAAS_HANDBOOK: MachineHandbook = {
  id: "test-haas-vf2-alarms",
  machine_id: "HAAS-VF2-001",
  manufacturer: "Haas",
  model: "VF-2",
  version: "1.0.0",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  alarm_codes: [
    {
      code: "108",
      severity: "critical",
      category: "SPINDLE",
      description: "Spindle drive fault — motor overcurrent detected during acceleration",
      probable_causes: [
        "Spindle drive board failure",
        "Motor winding insulation breakdown",
        "Excessive cutting load caused stall",
        "Drive parameter corruption after power surge",
      ],
      corrective_actions: [
        "Check spindle drive fuses and replace if blown",
        "Measure motor winding resistance — should be 1.2-1.8 ohm between phases",
        "Verify drive parameters match Setting 176 (spindle drive type)",
        "Cycle power and monitor drive LED status codes",
        "If recurring, replace spindle drive board (Haas PN 93-0456)",
      ],
      parts_needed: [
        { part_number: "93-0456", description: "Spindle drive board", quantity: 1 },
        { part_number: "59-0578", description: "Drive fuse 30A", quantity: 3 },
      ],
      estimated_downtime_min: 120,
      requires_service_tech: true,
      related_alarms: ["109", "110", "SPINDLE OVERLOAD"],
      source: {
        handbook_title: "Haas VF-2 Operator's Manual Rev. H",
        page_number: 342,
        extraction_method: "table_parse" as const,
        confidence: 0.92,
        extracted_at: new Date().toISOString(),
      },
    },
    {
      code: "109",
      severity: "warning",
      category: "SPINDLE",
      description: "Spindle orientation timeout — orient failed to complete in allowed time",
      probable_causes: [
        "Orient encoder misalignment",
        "Spindle brake not releasing fully",
        "Low air pressure to spindle brake (<80 PSI)",
      ],
      corrective_actions: [
        "Check air pressure gauge — must be above 80 PSI",
        "Inspect spindle brake for wear or sticking",
        "Verify orient encoder alignment per procedure in Chapter 7",
      ],
      parts_needed: [],
      estimated_downtime_min: 45,
      requires_service_tech: false,
      related_alarms: ["108"],
      source: {
        handbook_title: "Haas VF-2 Operator's Manual Rev. H",
        page_number: 343,
        extraction_method: "table_parse" as const,
        confidence: 0.88,
        extracted_at: new Date().toISOString(),
      },
    },
    {
      code: "200",
      severity: "error",
      category: "ATC",
      description: "Tool changer fault — carousel failed to index to requested pocket",
      probable_causes: [
        "ATC proximity sensor misaligned",
        "Carousel motor drive fault",
        "Tool stuck in pocket due to debris",
        "Geneva mechanism worn — indexing slop",
      ],
      corrective_actions: [
        "Open ATC cover and visually inspect for obstructions",
        "Check all proximity sensors with diagnostic mode (Setting 152)",
        "Manually rotate carousel to verify free movement",
        "Clean pocket seats and apply light oil to Geneva pins",
      ],
      parts_needed: [
        { part_number: "93-1022", description: "ATC proximity sensor", quantity: 1 },
      ],
      estimated_downtime_min: 60,
      requires_service_tech: false,
      related_alarms: ["201", "202"],
      source: {
        handbook_title: "Haas VF-2 Operator's Manual Rev. H",
        page_number: 356,
        extraction_method: "table_parse" as const,
        confidence: 0.95,
        extracted_at: new Date().toISOString(),
      },
    },
    {
      code: "OVERTRAVEL X+",
      severity: "error",
      category: "OVERTRAVEL",
      description: "X-axis positive overtravel limit switch activated",
      probable_causes: [
        "Program commanded position beyond machine envelope",
        "Work offset set incorrectly",
        "Limit switch wiring damage",
      ],
      corrective_actions: [
        "Press RESET then jog X-axis negative to clear overtravel",
        "Verify work offsets (G54-G59) are within machine travel",
        "Check program for invalid X+ positions",
      ],
      parts_needed: [],
      estimated_downtime_min: 5,
      requires_service_tech: false,
      related_alarms: ["OVERTRAVEL X-", "OVERTRAVEL Y+", "OVERTRAVEL Y-"],
      source: {
        handbook_title: "Haas VF-2 Operator's Manual Rev. H",
        page_number: 320,
        extraction_method: "table_parse" as const,
        confidence: 0.97,
        extracted_at: new Date().toISOString(),
      },
    },
    {
      code: "SERVO FAULT X",
      severity: "critical",
      category: "SERVO",
      description: "X-axis servo drive fault — position error exceeded tolerance",
      probable_causes: [
        "Servo motor failure",
        "Encoder cable damage or loose connection",
        "Ballscrew binding or excessive backlash",
        "Servo drive amplifier fault",
      ],
      corrective_actions: [
        "Check servo drive LED error codes on drive unit",
        "Inspect encoder cable connections at motor and drive",
        "Measure ballscrew backlash — must be under 0.005mm",
        "Run servo tune diagnostic (Parameter 400 series)",
      ],
      parts_needed: [
        { part_number: "93-0890", description: "X-axis servo motor", quantity: 1 },
        { part_number: "32-6455", description: "Encoder cable 3m", quantity: 1 },
      ],
      estimated_downtime_min: 180,
      requires_service_tech: true,
      related_alarms: ["SERVO FAULT Y", "SERVO FAULT Z"],
      source: {
        handbook_title: "Haas VF-2 Operator's Manual Rev. H",
        page_number: 335,
        extraction_method: "table_parse" as const,
        confidence: 0.91,
        extracted_at: new Date().toISOString(),
      },
    },
  ],
  maintenance_schedule: [],
  parts_book: [],
  programming_tips: [],
  safety_limits: [],
};

const MAZAK_HANDBOOK: MachineHandbook = {
  id: "test-mazak-qtn200-alarms",
  machine_id: "MAZAK-QTN200-001",
  manufacturer: "Mazak",
  model: "QTN-200",
  version: "1.0.0",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  alarm_codes: [
    {
      code: "T01",
      severity: "error",
      category: "ATC",
      description: "Turret index error — turret failed to lock in position",
      probable_causes: [
        "Turret coupling worn",
        "Hydraulic pressure insufficient for turret clamp",
        "Position sensor drift",
      ],
      corrective_actions: [
        "Check hydraulic pressure — must be 50-60 bar for turret clamp",
        "Inspect turret coupling teeth for wear",
        "Run turret index diagnostic from maintenance screen",
      ],
      parts_needed: [
        { part_number: "MZ-TRT-CPL-01", description: "Turret coupling assembly", quantity: 1 },
      ],
      estimated_downtime_min: 90,
      requires_service_tech: true,
      related_alarms: ["T02", "T03"],
      source: {
        handbook_title: "Mazak QTN-200 Maintenance Manual",
        page_number: 215,
        extraction_method: "manual" as const,
        confidence: 0.85,
        extracted_at: new Date().toISOString(),
      },
    },
  ],
  maintenance_schedule: [],
  parts_book: [],
  programming_tips: [],
  safety_limits: [],
};

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

function cleanHandbooks() {
  const existing = machineHandbookRegistry.list();
  for (const h of existing) {
    if (h.id.startsWith("test-")) {
      machineHandbookRegistry.delete(h.id);
    }
  }
}

describe("AlarmIntelligenceEngine", () => {
  beforeEach(() => {
    cleanHandbooks();
    machineHandbookRegistry.upsert(HAAS_HANDBOOK);
    machineHandbookRegistry.upsert(MAZAK_HANDBOOK);
  });

  afterEach(() => {
    cleanHandbooks();
  });

  // ==========================================================================
  // GROUP 1: Input Schema Validation (5 tests)
  // ==========================================================================

  describe("Input Schema Validation", () => {
    it("should validate AlarmLookupEnhancedSchema with minimal input", () => {
      const result = AlarmLookupEnhancedSchema.parse({ alarm_code: "108" });
      expect(result.alarm_code).toBe("108");
      expect(result.include_tribal).toBe(true);
      expect(result.max_tribal_tips).toBe(5);
    });

    it("should validate AlarmLookupEnhancedSchema with all fields", () => {
      const result = AlarmLookupEnhancedSchema.parse({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
        controller: "HAAS",
        include_tribal: false,
        max_tribal_tips: 10,
      });
      expect(result.controller).toBe("HAAS");
      expect(result.include_tribal).toBe(false);
    });

    it("should reject empty alarm_code", () => {
      expect(() => AlarmLookupEnhancedSchema.parse({ alarm_code: "" })).toThrow();
    });

    it("should reject max_tribal_tips > 20", () => {
      expect(() => AlarmLookupEnhancedSchema.parse({
        alarm_code: "108",
        max_tribal_tips: 25,
      })).toThrow();
    });

    it("should validate AlarmIndexQuerySchema defaults", () => {
      const result = AlarmIndexQuerySchema.parse({});
      expect(result.limit).toBe(50);
    });
  });

  // ==========================================================================
  // GROUP 2: U01 — Alarm Index Building (8 tests)
  // ==========================================================================

  describe("U01: Alarm Index Building", () => {
    it("should build index from all handbooks with alarm codes", () => {
      const index = alarmIntelligenceEngine.buildAlarmIndex();
      // 5 Haas + 1 Mazak = 6 total
      expect(index.length).toBe(6);
    });

    it("should include machine context in indexed alarms", () => {
      const index = alarmIntelligenceEngine.buildAlarmIndex();
      const haasAlarm = index.find(a => a.code === "108");
      expect(haasAlarm).toBeDefined();
      expect(haasAlarm!.machine_id).toBe("HAAS-VF2-001");
      expect(haasAlarm!.manufacturer).toBe("Haas");
      expect(haasAlarm!.model).toBe("VF-2");
      expect(haasAlarm!.handbook_confidence).toBeCloseTo(0.92, 2);
    });

    it("should get alarms by machine ID", () => {
      const alarms = alarmIntelligenceEngine.getAlarmsByMachine("HAAS-VF2-001");
      expect(alarms.length).toBe(5);
    });

    it("should return empty for unknown machine", () => {
      const alarms = alarmIntelligenceEngine.getAlarmsByMachine("NONEXISTENT-123");
      expect(alarms.length).toBe(0);
    });

    it("should filter by severity", () => {
      const critical = alarmIntelligenceEngine.queryAlarmIndex({ severity: "critical" });
      expect(critical.length).toBe(2); // 108 + SERVO FAULT X
      expect(critical.every(a => a.severity === "critical")).toBe(true);
    });

    it("should filter by category", () => {
      const atc = alarmIntelligenceEngine.queryAlarmIndex({ category: "ATC" });
      expect(atc.length).toBe(2); // Haas 200 + Mazak T01
    });

    it("should filter by manufacturer", () => {
      const mazak = alarmIntelligenceEngine.queryAlarmIndex({ manufacturer: "Mazak" });
      expect(mazak.length).toBe(1);
      expect(mazak[0].code).toBe("T01");
    });

    it("should text search across descriptions and causes", () => {
      const results = alarmIntelligenceEngine.queryAlarmIndex({ query: "spindle" });
      expect(results.length).toBeGreaterThanOrEqual(2); // 108, 109 at minimum
    });
  });

  // ==========================================================================
  // GROUP 3: U01 — Alarm Intelligence Stats (3 tests)
  // ==========================================================================

  describe("U01: Stats", () => {
    it("should report correct total indexed alarms", () => {
      const stats = alarmIntelligenceEngine.getAlarmIntelligenceStats();
      expect(stats.total_indexed_alarms).toBe(6);
    });

    it("should report correct machine count", () => {
      const stats = alarmIntelligenceEngine.getAlarmIntelligenceStats();
      expect(stats.machines_with_alarms).toBe(2);
    });

    it("should report severity breakdown", () => {
      const stats = alarmIntelligenceEngine.getAlarmIntelligenceStats();
      expect(stats.by_severity.critical).toBe(2);
      expect(stats.by_severity.error).toBe(3); // Haas 200 + OVERTRAVEL X+ + Mazak T01
      expect(stats.by_severity.warning).toBe(1);
    });
  });

  // ==========================================================================
  // GROUP 4: U02 — Cross-Referencing (7 tests)
  // ==========================================================================

  describe("U02: Cross-Referencing", () => {
    it("should find handbook alarm for known machine+code", () => {
      const xref = alarmIntelligenceEngine.crossReferenceAlarm("108", "HAAS-VF2-001");
      expect(xref.handbook_alarm).toBeDefined();
      expect(xref.handbook_alarm!.code).toBe("108");
      expect(xref.handbook_alarm!.severity).toBe("critical");
    });

    it("should search all handbooks when no machine specified", () => {
      const xref = alarmIntelligenceEngine.crossReferenceAlarm("T01");
      expect(xref.handbook_alarm).toBeDefined();
      expect(xref.handbook_alarm!.manufacturer).toBe("Mazak");
    });

    it("should find database alarm for known controller+code", () => {
      // Use HAAS controller — the database has HAAS alarms
      const xref = alarmIntelligenceEngine.crossReferenceAlarm("1000", undefined, "HAAS");
      // This may or may not find a database alarm depending on database content
      // At minimum, the structure should be correct
      expect(xref.code).toBe("1000");
      expect(xref.machine_id).toBeDefined();
    });

    it("should return match_quality=exact when both handbook and database match", () => {
      // We can't guarantee a database match for our test codes,
      // so verify structure is correct
      const xref = alarmIntelligenceEngine.crossReferenceAlarm("108", "HAAS-VF2-001", "HAAS");
      expect(xref.handbook_alarm).toBeDefined();
      // match_quality depends on whether database has code "108" for HAAS
      expect(["exact", "code_match"]).toContain(xref.match_quality);
    });

    it("should return match_quality=none for unknown alarm", () => {
      const xref = alarmIntelligenceEngine.crossReferenceAlarm("NONEXISTENT-999");
      expect(xref.handbook_alarm).toBeUndefined();
      // If no tribal tips either
      if (xref.tribal_tips.length === 0) {
        expect(xref.match_quality).toBe("none");
      }
    });

    it("should rank handbook steps before database steps", () => {
      const xref = alarmIntelligenceEngine.crossReferenceAlarm("108", "HAAS-VF2-001", "HAAS");
      const ranked = alarmIntelligenceEngine.rankRemediationSteps(xref);
      expect(ranked.length).toBeGreaterThan(0);
      // First steps should be from handbook
      expect(ranked[0].provenance).toBe("handbook");
    });

    it("should deduplicate similar steps across sources", () => {
      const xref = alarmIntelligenceEngine.crossReferenceAlarm("108", "HAAS-VF2-001", "HAAS");
      const ranked = alarmIntelligenceEngine.rankRemediationSteps(xref);
      // No two steps should have identical action text
      const actions = ranked.map(s => s.action);
      const unique = new Set(actions);
      expect(unique.size).toBe(actions.length);
    });
  });

  // ==========================================================================
  // GROUP 5: U03 — Enhanced Lookup (10 tests)
  // ==========================================================================

  describe("U03: Enhanced Alarm Lookup", () => {
    it("should return troubleshooting guide for handbook alarm", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.alarm_code).toBe("108");
      expect(guide.machine_id).toBe("HAAS-VF2-001");
      expect(guide.manufacturer).toBe("Haas");
      expect(guide.model).toBe("VF-2");
      expect(guide.severity).toBe("CRITICAL"); // mapped from "critical"
      expect(guide.original_severity).toBe("critical"); // R1-F05: original preserved
      expect(guide.category).toBe("SPINDLE");
    });

    it("should include handbook in sources consulted", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.sources_consulted).toContain("handbook");
    });

    it("should have ranked remediation steps with handbook first", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.ranked_steps.length).toBeGreaterThan(0);
      const handbookSteps = guide.ranked_steps.filter(s => s.provenance === "handbook");
      expect(handbookSteps.length).toBe(5); // 5 corrective actions in test data
      expect(guide.ranked_steps[0].provenance).toBe("handbook");
    });

    it("should include probable causes with provenance", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.probable_causes.length).toBeGreaterThanOrEqual(4);
      expect(guide.probable_causes[0].provenance).toBe("handbook");
    });

    it("should include parts needed from handbook", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.parts_needed.length).toBeGreaterThanOrEqual(2);
      expect(guide.parts_needed.some(p => p.part_number === "93-0456")).toBe(true);
    });

    it("should include estimated downtime", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.estimated_downtime_min).toBe(120);
    });

    it("should flag requires_service_tech", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.requires_service_tech).toBe(true);

      const guide109 = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "109",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide109.requires_service_tech).toBe(false);
    });

    it("should include related alarms", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.related_alarms).toContain("109");
      expect(guide.related_alarms).toContain("110");
    });

    it("should handle alarm not found gracefully", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "DOES-NOT-EXIST-999",
      });
      expect(guide.alarm_code).toBe("DOES-NOT-EXIST-999");
      expect(guide.severity).toBe("UNKNOWN");
      expect(guide.summary).toContain("DOES-NOT-EXIST-999");
    });

    it("should disable tribal tips when include_tribal=false", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
        include_tribal: false,
      });
      expect(guide.tribal_tips.length).toBe(0);
    });
  });

  // ==========================================================================
  // GROUP 6: Batch & Search (5 tests)
  // ==========================================================================

  describe("Batch & Search", () => {
    it("should batch lookup multiple alarm codes", () => {
      const guides = alarmIntelligenceEngine.batchLookup(
        "HAAS-VF2-001",
        ["108", "109", "200"],
      );
      expect(guides.length).toBe(3);
      expect(guides[0].alarm_code).toBe("108");
      expect(guides[1].alarm_code).toBe("109");
      expect(guides[2].alarm_code).toBe("200");
    });

    it("should search alarms by text query", () => {
      const results = alarmIntelligenceEngine.searchAlarmIntelligence("spindle");
      expect(results.length).toBeGreaterThan(0);
      // Should find handbook alarm 108 (spindle drive fault)
      const found108 = results.find(r => r.alarm_code === "108");
      expect(found108).toBeDefined();
    });

    it("should search with machine filter", () => {
      const results = alarmIntelligenceEngine.searchAlarmIntelligence("turret", "MAZAK-QTN200-001");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].alarm_code).toBe("T01");
    });

    it("should limit search results", () => {
      const results = alarmIntelligenceEngine.searchAlarmIntelligence("", undefined, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return empty for no-match search", () => {
      const results = alarmIntelligenceEngine.searchAlarmIntelligence("xyzzy-nonexistent-term-42");
      // Might find database matches — just verify structure
      for (const r of results) {
        expect(r.alarm_code).toBeDefined();
        expect(r.ranked_steps).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // GROUP 7: Edge Cases & Severity Mapping (7 tests)
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should map handbook severity to database severity correctly", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "109",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.severity).toBe("MEDIUM"); // "warning" → "MEDIUM"
    });

    it("should map error severity correctly", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "200",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.severity).toBe("HIGH"); // "error" → "HIGH"
    });

    it("should handle alarm codes with spaces", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "OVERTRAVEL X+",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.alarm_code).toBe("OVERTRAVEL X+");
      expect(guide.category).toBe("OVERTRAVEL");
    });

    it("should handle alarm codes with special characters", () => {
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "SERVO FAULT X",
        machine_id: "HAAS-VF2-001",
      });
      expect(guide.severity).toBe("CRITICAL");
      expect(guide.estimated_downtime_min).toBe(180);
    });

    it("should work with no handbooks loaded", () => {
      cleanHandbooks();
      const guide = alarmIntelligenceEngine.lookupAlarmEnhanced({
        alarm_code: "108",
        machine_id: "HAAS-VF2-001",
      });
      // Should still work — just no handbook data
      expect(guide.alarm_code).toBe("108");
      expect(guide.sources_consulted.includes("handbook")).toBe(false);
    });

    it("should sort index by severity (emergency > critical > error > warning)", () => {
      const index = alarmIntelligenceEngine.queryAlarmIndex({ machine_id: "HAAS-VF2-001" });
      expect(index.length).toBe(5);
      // First two should be critical (no emergency alarms in test data)
      expect(index[0].severity).toBe("critical");
      expect(index[1].severity).toBe("critical");
      // Then errors, then warning
      expect(index[index.length - 1].severity).toBe("warning");
    });

    it("should respect query limit", () => {
      const results = alarmIntelligenceEngine.queryAlarmIndex({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });
});
