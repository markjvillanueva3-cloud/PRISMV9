/**
 * Tests for MCAT (Machine Catalog Convergence) actions in machineSetupDispatcher
 * @milestone MCAT-MS0/P1-U03
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTool = vi.fn();
const mockServer = { tool: mockTool };

import { registerMachineSetupDispatcher } from "../tools/dispatchers/machineSetupDispatcher.js";

describe("machineSetupDispatcher MCAT actions", () => {
  let handler: Function;

  beforeEach(() => {
    mockTool.mockClear();
    registerMachineSetupDispatcher(mockServer);
    handler = mockTool.mock.calls[0][3];
  });

  describe("registration", () => {
    it("includes MCAT actions in tool description", () => {
      const description = mockTool.mock.calls[0][1];
      expect(description).toContain("mcat_merge_layers");
      expect(description).toContain("mcat_normalize_manufacturer");
    });

    it("registers at least 89 actions (baseline + 8 MCAT)", () => {
      const schema = mockTool.mock.calls[0][2];
      const actionEnum = schema.action._def?.values ?? schema.action.options ?? [];
      expect(actionEnum.length).toBeGreaterThanOrEqual(89); // baseline actions
    });
  });

  describe("mcat_merge_layers", () => {
    it("merges machine layers with provenance tracking", async () => {
      const inputs = [
        {
          machine: { manufacturer: "Okuma", model: "LB3000", type: "lathe", spindle: { max_rpm: 5000, power: 22 } },
          layer: "BASIC",
          source_id: "machine-registry",
        },
        {
          machine: { manufacturer: "Okuma", model: "LB3000 EX II", spindle: { max_rpm: 6000, power: 25, torque: 190 } },
          layer: "ENHANCED",
          source_id: "manufacturer-spec",
        },
      ];

      const result = await handler({ action: "mcat_merge_layers", params: { inputs } });
      const data = JSON.parse(result.content[0].text);

      expect(data.package).toBeDefined();
      expect(data.fields_merged).toBeGreaterThan(0);
    });

    it("returns error for empty inputs", async () => {
      const result = await handler({ action: "mcat_merge_layers", params: { inputs: [] } });
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toContain("requires inputs array");
    });
  });

  describe("mcat_normalize_manufacturer", () => {
    it("normalizes manufacturer name", async () => {
      const result = await handler({ action: "mcat_normalize_manufacturer", params: { manufacturer: "okuma" } });
      const data = JSON.parse(result.content[0].text);

      expect(data.normalized).toBeDefined();
      expect(data.normalized.id).toBe("okuma");
      expect(data.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("handles unknown manufacturer with default matchType", async () => {
      const result = await handler({ action: "mcat_normalize_manufacturer", params: { manufacturer: "xyz123unknown" } });
      const data = JSON.parse(result.content[0].text);

      expect(data.matchType).toBe("default");
    });
  });

  describe("mcat_normalize_controller", () => {
    it("normalizes controller name", async () => {
      const result = await handler({ action: "mcat_normalize_controller", params: { controller: "fanuc 0i-TF" } });
      const data = JSON.parse(result.content[0].text);

      expect(data.normalized).toBeDefined();
      expect(data.normalized.vendor).toBe("FANUC");
      expect(data.normalized.family).toBe("0i");
    });

    it("handles partial match on vendor", async () => {
      const result = await handler({ action: "mcat_normalize_controller", params: { controller: "siemens 840D" } });
      const data = JSON.parse(result.content[0].text);

      expect(data.normalized.vendor).toBe("Siemens");
    });
  });

  describe("mcat_normalize_coolant", () => {
    it("normalizes through-spindle coolant", async () => {
      const result = await handler({ action: "mcat_normalize_coolant", params: { coolant: "through spindle" } });
      const data = JSON.parse(result.content[0].text);

      expect(data.normalized).toBeDefined();
      expect(data.normalized.id).toBe("through_spindle");
    });

    it("normalizes flood coolant", async () => {
      const result = await handler({ action: "mcat_normalize_coolant", params: { coolant: "flood" } });
      const data = JSON.parse(result.content[0].text);

      expect(data.normalized.id).toBe("flood");
    });
  });

  describe("mcat_normalize_record", () => {
    it("normalizes full machine record", async () => {
      const result = await handler({
        action: "mcat_normalize_record",
        params: {
          record: {
            manufacturer: "haas",
            model: "VF-2",
            controller: "haas ngc",
            coolant: "flood",
          },
        },
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.manufacturer).toBeDefined();
      expect(data.controller).toBeDefined();
      expect(data.coolant).toBeDefined();
    });
  });

  describe("mcat_get_manufacturers", () => {
    it("lists canonical manufacturers", async () => {
      const result = await handler({ action: "mcat_get_manufacturers", params: {} });
      const data = JSON.parse(result.content[0].text);

      expect(data.manufacturers).toBeDefined();
      expect(Array.isArray(data.manufacturers)).toBe(true);
      expect(data.manufacturers.length).toBeGreaterThan(10);
    });
  });

  describe("mcat_get_controllers", () => {
    it("lists canonical controllers", async () => {
      const result = await handler({ action: "mcat_get_controllers", params: {} });
      const data = JSON.parse(result.content[0].text);

      expect(data.controllers).toBeDefined();
      expect(Array.isArray(data.controllers)).toBe(true);
      expect(data.controllers.length).toBeGreaterThan(5);
    });
  });

  describe("mcat_vocab_stats", () => {
    it("returns vocabulary statistics", async () => {
      const result = await handler({ action: "mcat_vocab_stats", params: {} });
      const data = JSON.parse(result.content[0].text);

      expect(data.totalNormalizations).toBeDefined();
      expect(data.byMatchType).toBeDefined();
      expect(data.byCategory).toBeDefined();
    });
  });
});
