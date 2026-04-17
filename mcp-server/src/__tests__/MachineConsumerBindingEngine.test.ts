/**
 * Tests for MachineConsumerBindingEngine
 * @milestone MCAT-MS0/P3-U01
 *
 * Verifies that downstream consumers (Program Release, Print to CNC, quoting)
 * receive consistent machine context from the canonical package + overlay model.
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import {
  machineConsumerBindingEngine,
  type BoundMachineContext,
  type ProgramReleaseMachineBinding,
  type PrintToCNCMachineBinding,
  type QuoteMachineBinding,
} from "../engines/MachineConsumerBindingEngine.js";
import { shopMachineOverlayEngine } from "../engines/ShopMachineOverlayEngine.js";

describe("MachineConsumerBindingEngine", () => {
  // Set up test overlays
  beforeAll(() => {
    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-01",
        user_id: "binding-test",
        display_name: "Binding Test VMC",
      });
    } catch {
      // Overlay might already exist
    }

    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-01",
        user_id: "binding-test",
        display_name: "Binding Test Lathe",
      });
    } catch {
      // Overlay might already exist
    }
  });

  afterEach(() => {
    // Invalidate cache between tests for isolation
    machineConsumerBindingEngine.invalidateAll();
  });

  describe("bind", () => {
    it("binds a valid shop machine successfully", () => {
      const result = machineConsumerBindingEngine.bind("LTH-01");

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.shop_machine_id).toBe("LTH-01");
    });

    it("returns error for non-existent machine", () => {
      const result = machineConsumerBindingEngine.bind("INVALID-MACHINE-XYZ");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("includes controller configuration in bound context", () => {
      const result = machineConsumerBindingEngine.bind("LTH-01");

      expect(result.context?.controller).toBeDefined();
      expect(result.context?.controller.id).toBeDefined();
      expect(result.context?.controller.family).toBeDefined();
    });

    it("includes spindle configuration in bound context", () => {
      const result = machineConsumerBindingEngine.bind("LTH-01");

      expect(result.context?.spindle).toBeDefined();
      expect(result.context?.spindle.max_rpm).toBeGreaterThan(0);
      expect(result.context?.spindle.max_power_kw).toBeGreaterThan(0);
    });

    it("includes coolant configuration in bound context", () => {
      const result = machineConsumerBindingEngine.bind("LTH-01");

      expect(result.context?.coolant).toBeDefined();
      expect(Array.isArray(result.context?.coolant.enabled_strategies)).toBe(true);
    });

    it("includes work envelope in bound context", () => {
      const result = machineConsumerBindingEngine.bind("LTH-01");

      expect(result.context?.envelope).toBeDefined();
      expect(result.context?.envelope.x_mm).toBeGreaterThan(0);
      expect(result.context?.envelope.y_mm).toBeGreaterThan(0);
      expect(result.context?.envelope.z_mm).toBeGreaterThan(0);
    });

    it("includes provenance information", () => {
      const result = machineConsumerBindingEngine.bind("LTH-01");

      expect(result.context?.provenance).toBeDefined();
      expect(result.context?.provenance.confidence).toBeGreaterThanOrEqual(0);
      expect(result.context?.provenance.confidence).toBeLessThanOrEqual(1);
    });

    it("caches bindings for repeated access", () => {
      const result1 = machineConsumerBindingEngine.bind("LTH-01");
      const result2 = machineConsumerBindingEngine.bind("LTH-01");

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Same context object due to caching
      expect(result1.context).toBe(result2.context);
    });
  });

  describe("forProgramRelease", () => {
    it("returns Program Release compatible binding", () => {
      const binding = machineConsumerBindingEngine.forProgramRelease("LTH-01");

      expect(binding).toBeDefined();
      expect(binding?.id).toBe("LTH-01");
      expect(binding?.label).toBeDefined();
      expect(binding?.type).toBeDefined();
    });

    it("includes machine rate for costing", () => {
      const binding = machineConsumerBindingEngine.forProgramRelease("LTH-01");

      expect(binding?.machineRatePerHour).toBeGreaterThan(0);
    });

    it("includes spindle specs", () => {
      const binding = machineConsumerBindingEngine.forProgramRelease("LTH-01");

      expect(binding?.maxRpm).toBeGreaterThan(0);
      expect(binding?.maxPower).toBeGreaterThan(0);
    });

    it("includes collision envelope string", () => {
      const binding = machineConsumerBindingEngine.forProgramRelease("LTH-01");

      expect(binding?.collisionEnvelope).toMatch(/\d+×\d+×\d+mm/);
    });

    it("includes controller family", () => {
      const binding = machineConsumerBindingEngine.forProgramRelease("LTH-01");

      expect(binding?.controllerFamily).toBeDefined();
      expect(typeof binding?.controllerFamily).toBe("string");
    });

    it("returns null for invalid machine", () => {
      const binding = machineConsumerBindingEngine.forProgramRelease("INVALID-XYZ");

      expect(binding).toBeNull();
    });

    it("preserves bound context reference", () => {
      const binding = machineConsumerBindingEngine.forProgramRelease("LTH-01");

      expect(binding?._boundContext).toBeDefined();
      expect(binding?._boundContext.shop_machine_id).toBe("LTH-01");
    });
  });

  describe("forPrintToCNC", () => {
    it("returns Print to CNC compatible binding", () => {
      const binding = machineConsumerBindingEngine.forPrintToCNC("LTH-01");

      expect(binding).toBeDefined();
      expect(binding?.machine_id).toBe("LTH-01");
      expect(binding?.brand).toBeDefined();
      expect(binding?.model).toBeDefined();
    });

    it("includes spindle parameters", () => {
      const binding = machineConsumerBindingEngine.forPrintToCNC("LTH-01");

      expect(binding?.max_rpm).toBeGreaterThan(0);
      expect(binding?.max_power_kw).toBeGreaterThan(0);
      expect(binding?.max_torque_nm).toBeGreaterThan(0);
    });

    it("includes work envelope", () => {
      const binding = machineConsumerBindingEngine.forPrintToCNC("LTH-01");

      expect(binding?.envelope).toBeDefined();
      expect(binding?.envelope.x).toBeGreaterThan(0);
      expect(binding?.envelope.y).toBeGreaterThan(0);
      expect(binding?.envelope.z).toBeGreaterThan(0);
    });

    it("includes controller ID", () => {
      const binding = machineConsumerBindingEngine.forPrintToCNC("LTH-01");

      expect(binding?.controller_id).toBeDefined();
      expect(typeof binding?.controller_id).toBe("string");
    });

    it("includes coolant strategies", () => {
      const binding = machineConsumerBindingEngine.forPrintToCNC("LTH-01");

      expect(Array.isArray(binding?.coolant_strategies)).toBe(true);
    });

    it("includes axis configuration", () => {
      const binding = machineConsumerBindingEngine.forPrintToCNC("LTH-01");

      expect(Array.isArray(binding?.axes)).toBe(true);
      expect(binding?.axes.length).toBeGreaterThanOrEqual(2);
    });

    it("returns null for invalid machine", () => {
      const binding = machineConsumerBindingEngine.forPrintToCNC("INVALID-XYZ");

      expect(binding).toBeNull();
    });
  });

  describe("forQuoting", () => {
    it("returns Quote compatible binding", () => {
      const binding = machineConsumerBindingEngine.forQuoting("LTH-01");

      expect(binding).toBeDefined();
      expect(binding?.machine_id).toBe("LTH-01");
      expect(binding?.display_name).toBeDefined();
    });

    it("includes rate for costing", () => {
      const binding = machineConsumerBindingEngine.forQuoting("LTH-01");

      expect(binding?.rate_per_hour).toBeGreaterThan(0);
    });

    it("includes typical setup time", () => {
      const binding = machineConsumerBindingEngine.forQuoting("LTH-01");

      expect(binding?.typical_setup_minutes).toBeGreaterThan(0);
    });

    it("includes machine type", () => {
      const binding = machineConsumerBindingEngine.forQuoting("LTH-01");

      expect(binding?.machine_type).toBeDefined();
    });

    it("returns null for invalid machine", () => {
      const binding = machineConsumerBindingEngine.forQuoting("INVALID-XYZ");

      expect(binding).toBeNull();
    });
  });

  describe("forAllConsumers", () => {
    it("returns bindings for all consumers", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");

      expect(bindings).toBeDefined();
      expect(bindings?.programRelease).toBeDefined();
      expect(bindings?.printToCNC).toBeDefined();
      expect(bindings?.quote).toBeDefined();
    });

    it("includes shared context", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");

      expect(bindings?.context).toBeDefined();
      expect(bindings?.context.shop_machine_id).toBe("LTH-01");
    });

    it("includes contract validation status", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");

      expect(typeof bindings?.contractValid).toBe("boolean");
    });

    it("includes warnings array", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");

      expect(Array.isArray(bindings?.warnings)).toBe(true);
    });

    it("all consumer bindings reference same context", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");

      expect(bindings?.programRelease?._boundContext).toBe(bindings?.context);
      expect(bindings?.printToCNC?._boundContext).toBe(bindings?.context);
      expect(bindings?.quote?._boundContext).toBe(bindings?.context);
    });

    it("returns null for invalid machine", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("INVALID-XYZ");

      expect(bindings).toBeNull();
    });
  });

  describe("listBindable", () => {
    it("returns list of bindable machines", () => {
      const list = machineConsumerBindingEngine.listBindable();

      expect(Array.isArray(list)).toBe(true);
    });

    it("each entry has required fields", () => {
      const list = machineConsumerBindingEngine.listBindable();

      for (const entry of list) {
        expect(entry.shop_machine_id).toBeDefined();
        expect(entry.display_name).toBeDefined();
        expect(typeof entry.bound).toBe("boolean");
      }
    });

    it("tracks bound status accurately", () => {
      // Bind a machine
      machineConsumerBindingEngine.bind("LTH-01");

      const list = machineConsumerBindingEngine.listBindable();
      const lth01 = list.find(m => m.shop_machine_id === "LTH-01");

      expect(lth01?.bound).toBe(true);
    });
  });

  describe("invalidate", () => {
    it("invalidates cached binding for specific machine", () => {
      // First bind
      machineConsumerBindingEngine.bind("LTH-01");
      expect(machineConsumerBindingEngine.getStats().currently_bound).toBeGreaterThan(0);

      // Invalidate
      machineConsumerBindingEngine.invalidate("LTH-01");

      // Rebind should create new context
      const result1 = machineConsumerBindingEngine.bind("LTH-01");
      const result2 = machineConsumerBindingEngine.bind("LTH-01");

      // After rebind, same cached context
      expect(result1.context).toBe(result2.context);
    });
  });

  describe("invalidateAll", () => {
    it("clears all cached bindings", () => {
      // Bind multiple machines
      machineConsumerBindingEngine.bind("LTH-01");
      machineConsumerBindingEngine.bind("VMC-01");

      expect(machineConsumerBindingEngine.getStats().currently_bound).toBeGreaterThanOrEqual(2);

      // Invalidate all
      machineConsumerBindingEngine.invalidateAll();

      expect(machineConsumerBindingEngine.getStats().currently_bound).toBe(0);
    });
  });

  describe("getStats", () => {
    it("returns binding statistics", () => {
      const stats = machineConsumerBindingEngine.getStats();

      expect(stats.total_bindable).toBeGreaterThanOrEqual(0);
      expect(stats.currently_bound).toBeGreaterThanOrEqual(0);
      expect(stats.binding_cache_size).toBeGreaterThanOrEqual(0);
    });

    it("tracks bound count correctly", () => {
      machineConsumerBindingEngine.invalidateAll();
      const before = machineConsumerBindingEngine.getStats();

      machineConsumerBindingEngine.bind("LTH-01");
      const after = machineConsumerBindingEngine.getStats();

      expect(after.currently_bound).toBe(before.currently_bound + 1);
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machineConsumerBindingEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachineConsumerBindingEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P3-U01");
    });

    it("lists all capabilities", () => {
      const awareness = machineConsumerBindingEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("bind");
      expect(awareness.capabilities).toContain("forProgramRelease");
      expect(awareness.capabilities).toContain("forPrintToCNC");
      expect(awareness.capabilities).toContain("forQuoting");
      expect(awareness.capabilities).toContain("forAllConsumers");
    });

    it("lists consumers", () => {
      const awareness = machineConsumerBindingEngine.getSelfAwareness();

      expect(awareness.consumers).toContain("ProgramReleaseCatalogEngine");
      expect(awareness.consumers).toContain("PrintToProgramPipelineEngine");
    });

    it("lists integrations", () => {
      const awareness = machineConsumerBindingEngine.getSelfAwareness();

      expect(awareness.integrations).toContain("ShopMachineOverlayEngine");
      expect(awareness.integrations).toContain("MachineCapabilitySurfaceEngine");
    });
  });

  // ============================================================================
  // CONSUMER CONSISTENCY TESTS
  // These verify that all consumers see consistent data
  // ============================================================================

  describe("Consumer consistency", () => {
    it("all consumers see same spindle max RPM", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");
      if (!bindings) return;

      const prRpm = bindings.programRelease?.maxRpm;
      const p2cRpm = bindings.printToCNC?.max_rpm;
      const ctxRpm = bindings.context.spindle.max_rpm;

      expect(prRpm).toBe(ctxRpm);
      expect(p2cRpm).toBe(ctxRpm);
    });

    it("all consumers see same machine type", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");
      if (!bindings) return;

      const prType = bindings.programRelease?.type;
      const quoteType = bindings.quote?.machine_type;
      const ctxType = bindings.context.machine_type;

      expect(prType).toBe(ctxType);
      expect(quoteType).toBe(ctxType);
    });

    it("all consumers see same machine rate", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");
      if (!bindings) return;

      const prRate = bindings.programRelease?.machineRatePerHour;
      const quoteRate = bindings.quote?.rate_per_hour;
      const ctxRate = bindings.context.machine_rate_per_hour;

      expect(prRate).toBe(ctxRate);
      expect(quoteRate).toBe(ctxRate);
    });

    it("controller info is consistent across bindings", () => {
      const bindings = machineConsumerBindingEngine.forAllConsumers("LTH-01");
      if (!bindings) return;

      const prController = bindings.programRelease?.controllerFamily;
      const p2cController = bindings.printToCNC?.controller_id;
      const ctxController = bindings.context.controller;

      // PR gets family, P2C gets id
      expect(prController).toBe(ctxController.family);
      expect(p2cController).toBe(ctxController.id);
    });
  });
});
