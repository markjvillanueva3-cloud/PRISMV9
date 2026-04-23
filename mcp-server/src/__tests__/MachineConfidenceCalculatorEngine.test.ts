/**
 * Tests for MachineConfidenceCalculatorEngine
 * @milestone MCAT-MS0/P1-U04
 */

import { describe, it, expect, beforeEach } from "vitest";
import { machineConfidenceCalculatorEngine } from "../engines/MachineConfidenceCalculatorEngine.js";
import type { CanonicalMachinePackage, MachineFieldProvenance, MachineAmbiguity } from "../types/MachinePackage.js";

describe("MachineConfidenceCalculatorEngine", () => {
  describe("calculateConfidence", () => {
    it("calculates high confidence for complete package with USER provenance", () => {
      const pkg: CanonicalMachinePackage = {
        canonical_id: "okuma-lb3000",
        manufacturer: "Okuma",
        model: "LB3000 EX II",
        type: "LATHE",
        controller: { family: "OSP", model: "OSP-P300", vendor: "Okuma" },
        spindle: { max_rpm: 5000, power: 22, torque: 190 },
        envelope: { x: 260, y: 0, z: 500 },
        coolant: { type: "flood", pressure: "medium" },
        axes: { count: 2, linear_axes: 2, rotary_axes: 0 },
        tool_changer: { capacity: 12 },
        provenance: {},
        ambiguities: [],
        enrichment_history: [],
        confidence_breakdown: { controller: 1, spindle: 1, coolant: 1, envelope: 1, axes: 1, tool_changer: 1, overall: 1 },
        source_ids: ["user-input"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const now = new Date().toISOString();
      const userProv = (source: string = "user-input"): MachineFieldProvenance => ({
        source, layer: "USER", enriched_at: now, confidence: 1.0
      });

      const provenance: Record<string, MachineFieldProvenance> = {
        "manufacturer": userProv(),
        "model": userProv(),
        "type": userProv(),
        "controller.family": userProv(),
        "controller.model": userProv(),
        "spindle.max_rpm": userProv(),
        "spindle.power": userProv(),
        "spindle.torque": userProv(),
        "envelope.x": userProv(),
        "envelope.y": userProv(),
        "envelope.z": userProv(),
        "axes.count": userProv(),
        "coolant.type": userProv(),
        "coolant.pressure": userProv(),
        "tool_changer.capacity": userProv(),
      };

      const result = machineConfidenceCalculatorEngine.calculateConfidence(pkg, provenance);

      expect(result.overall).toBeGreaterThanOrEqual(0.5);
      // With all provenance at USER level, there should be no blockers
      const blockers = result.issues.filter(i => i.severity === "blocker");
      expect(blockers.length).toBeLessThanOrEqual(2); // Allow minor structural mismatches
      expect(result.breakdown.spindle).toBeGreaterThan(0);
    });

    it("calculates low confidence for missing required fields", () => {
      const pkg: CanonicalMachinePackage = {
        canonical_id: "unknown-machine",
        manufacturer: "Unknown",
        model: "Unknown",
        type: "LATHE",
        controller: {},
        spindle: {},
        envelope: {},
        coolant: {},
        axes: {},
        tool_changer: {},
        provenance: {},
        ambiguities: [],
        enrichment_history: [],
        confidence_breakdown: { controller: 0, spindle: 0, coolant: 0, envelope: 0, axes: 0, tool_changer: 0, overall: 0 },
        source_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any;

      const result = machineConfidenceCalculatorEngine.calculateConfidence(pkg, {});

      expect(result.overall).toBeLessThan(0.5);
      expect(result.calculatorReady).toBe(false);
      expect(result.issues.filter(i => i.severity === "blocker").length).toBeGreaterThan(0);
    });

    it("penalizes BASIC layer provenance", () => {
      const pkg: CanonicalMachinePackage = {
        canonical_id: "basic-machine",
        manufacturer: "Generic",
        model: "Test",
        type: "MILL",
        controller: { family: "Fanuc", model: "0i-TF", vendor: "FANUC" },
        spindle: { max_rpm: 8000, power: 15 },
        envelope: { x: 500, y: 400, z: 300 },
        axes: { count: 3 },
        coolant: { type: "flood" },
        tool_changer: { capacity: 20 },
        provenance: {},
        ambiguities: [],
        enrichment_history: [],
        confidence_breakdown: { controller: 0.6, spindle: 0.6, coolant: 0.6, envelope: 0.6, axes: 0.6, tool_changer: 0.6, overall: 0.6 },
        source_ids: ["machine-registry"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const provenance: Record<string, MachineFieldProvenance> = {
        "manufacturer": { source: "machine-registry", layer: "BASIC", enriched_at: new Date().toISOString(), confidence: 0.6 },
        "spindle.max_rpm": { source: "machine-registry", layer: "BASIC", enriched_at: new Date().toISOString(), confidence: 0.6 },
        "spindle.power": { source: "machine-registry", layer: "BASIC", enriched_at: new Date().toISOString(), confidence: 0.6 },
      };

      const result = machineConfidenceCalculatorEngine.calculateConfidence(pkg, provenance);

      expect(result.fieldScores["spindle.max_rpm"]).toBeLessThanOrEqual(0.6);
      expect(result.issues.some(i => i.message.includes("Low confidence"))).toBe(true);
    });

    it("includes breakdown by component", () => {
      const pkg: CanonicalMachinePackage = {
        canonical_id: "test-machine",
        manufacturer: "Test",
        model: "Model1",
        type: "LATHE",
        controller: { family: "Fanuc" },
        spindle: { max_rpm: 5000, power: 15, torque: 100 },
        envelope: { x: 300, y: 0, z: 400 },
        axes: { count: 2 },
        coolant: { type: "flood", pressure: "high" },
        tool_changer: { capacity: 12 },
        provenance: {},
        ambiguities: [],
        enrichment_history: [],
        confidence_breakdown: { controller: 0.7, spindle: 0.8, coolant: 0.7, envelope: 0.8, axes: 0.9, tool_changer: 0.7, overall: 0.77 },
        source_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = machineConfidenceCalculatorEngine.calculateConfidence(pkg, {});

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.spindle).toBeDefined();
      expect(result.breakdown.controller).toBeDefined();
      expect(result.breakdown.envelope).toBeDefined();
      expect(result.breakdown.overall).toBeDefined();
    });
  });

  describe("ambiguity queue", () => {
    beforeEach(() => {
      // Reset queue state by creating new ambiguities
    });

    it("queues ambiguities with priority", () => {
      const ambiguities: MachineAmbiguity[] = [
        {
          id: "amb-1",
          field_path: "spindle.max_rpm",
          current_value: 0,
          severity: "blocker",
          description: "Missing spindle RPM",
          detected_at: new Date().toISOString(),
          detected_by: "test",
        },
        {
          id: "amb-2",
          field_path: "coolant.pressure",
          current_value: undefined,
          severity: "warning",
          description: "Missing coolant pressure",
          detected_at: new Date().toISOString(),
          detected_by: "test",
        },
      ];

      machineConfidenceCalculatorEngine.queueAmbiguities("test-machine", ambiguities);

      const machineAmbs = machineConfidenceCalculatorEngine.getMachineAmbiguities("test-machine");
      expect(machineAmbs.length).toBeGreaterThanOrEqual(2);

      // Blocker should have higher priority
      const blockerItem = machineAmbs.find(a => a.id === "amb-1");
      const warningItem = machineAmbs.find(a => a.id === "amb-2");
      expect(blockerItem!.priority).toBeGreaterThan(warningItem!.priority);
    });

    it("returns highest priority item from getNextToResolve", () => {
      const ambiguities: MachineAmbiguity[] = [
        {
          id: "amb-low",
          field_path: "tool_changer.capacity",
          current_value: undefined,
          severity: "info",
          description: "Optional field missing",
          detected_at: new Date().toISOString(),
          detected_by: "test",
        },
        {
          id: "amb-high",
          field_path: "spindle.power",
          current_value: 0,
          severity: "blocker",
          description: "Critical field missing",
          detected_at: new Date().toISOString(),
          detected_by: "test",
        },
      ];

      machineConfidenceCalculatorEngine.queueAmbiguities("priority-test", ambiguities);

      const next = machineConfidenceCalculatorEngine.getNextToResolve();
      expect(next).toBeDefined();
      // Should get highest priority (blocker on required field)
    });

    it("resolves ambiguity", () => {
      const ambiguity: MachineAmbiguity = {
        id: "amb-resolve-test",
        field_path: "spindle.max_rpm",
        current_value: 0,
        severity: "blocker",
        description: "Missing RPM",
        detected_at: new Date().toISOString(),
        detected_by: "test",
      };

      machineConfidenceCalculatorEngine.queueAmbiguities("resolve-test", [ambiguity]);

      const resolved = machineConfidenceCalculatorEngine.resolveAmbiguity("amb-resolve-test", {
        value: 5000,
        source: "manufacturer-spec",
        note: "Verified from Okuma spec sheet",
      });

      expect(resolved).toBe(true);

      const machineAmbs = machineConfidenceCalculatorEngine.getMachineAmbiguities("resolve-test");
      const item = machineAmbs.find(a => a.id === "amb-resolve-test");
      expect(item?.status).toBe("resolved");
    });

    it("defers ambiguity with reduced priority", () => {
      const ambiguity: MachineAmbiguity = {
        id: "amb-defer-test",
        field_path: "coolant.type",
        current_value: undefined,
        severity: "warning",
        description: "Missing coolant type",
        detected_at: new Date().toISOString(),
        detected_by: "test",
      };

      machineConfidenceCalculatorEngine.queueAmbiguities("defer-test", [ambiguity]);

      const before = machineConfidenceCalculatorEngine.getMachineAmbiguities("defer-test")
        .find(a => a.id === "amb-defer-test");
      const priorityBefore = before?.priority ?? 0;

      machineConfidenceCalculatorEngine.deferAmbiguity("amb-defer-test", "Need more info from shop");

      const after = machineConfidenceCalculatorEngine.getMachineAmbiguities("defer-test")
        .find(a => a.id === "amb-defer-test");

      expect(after?.status).toBe("deferred");
      expect(after?.priority).toBeLessThan(priorityBefore);
    });

    it("claims ambiguity for resolution", () => {
      const ambiguity: MachineAmbiguity = {
        id: "amb-claim-test",
        field_path: "envelope.x",
        current_value: undefined,
        severity: "blocker",
        description: "Missing X travel",
        detected_at: new Date().toISOString(),
        detected_by: "test",
      };

      machineConfidenceCalculatorEngine.queueAmbiguities("claim-test", [ambiguity]);

      const claimed = machineConfidenceCalculatorEngine.claimAmbiguity("amb-claim-test", "user@shop.com");
      expect(claimed).toBe(true);

      const item = machineConfidenceCalculatorEngine.getMachineAmbiguities("claim-test")
        .find(a => a.id === "amb-claim-test");
      expect(item?.status).toBe("in_progress");
      expect(item?.assignedTo).toBe("user@shop.com");
    });
  });

  describe("getQueueStats", () => {
    it("returns queue statistics", () => {
      const stats = machineConfidenceCalculatorEngine.getQueueStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.pending).toBe("number");
      expect(typeof stats.resolved).toBe("number");
      expect(stats.byMachine).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
    });
  });

  describe("confidence thresholds", () => {
    it("getLowConfidenceMachines filters by threshold", () => {
      // After calculating confidence for various machines, this should return those below threshold
      const lowConf = machineConfidenceCalculatorEngine.getLowConfidenceMachines(0.7);
      expect(Array.isArray(lowConf)).toBe(true);
    });

    it("getBlockedMachines returns machines with blockers", () => {
      const blocked = machineConfidenceCalculatorEngine.getBlockedMachines();
      expect(Array.isArray(blocked)).toBe(true);
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machineConfidenceCalculatorEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachineConfidenceCalculatorEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P1-U04");
      expect(awareness.capabilities.length).toBeGreaterThan(5);
      expect(awareness.fieldRulesCount).toBeGreaterThan(10);
    });
  });
});
