/**
 * Tests for ShopMachineOverlayEngine
 * @milestone MCAT-MS0/P2-U03
 */

import { describe, it, expect, beforeEach } from "vitest";
import { shopMachineOverlayEngine } from "../engines/ShopMachineOverlayEngine.js";

describe("ShopMachineOverlayEngine", () => {
  // Note: These tests use the default JM Die shop profile from ShopConfigurationEngine

  describe("createOverlay", () => {
    it("creates overlay for valid shop machine", () => {
      const result = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-01",
        user_id: "test-user",
        display_name: "My Okuma Lathe",
      });

      expect(result).toBeDefined();
      expect(result.overlay_id).toContain("overlay-LTH-01");
      expect(result.shop_machine_id).toBe("LTH-01");
      expect(result.display_name).toBe("My Okuma Lathe");
      expect(result.version).toBe(1);
    });

    it("includes user profile overlay data", () => {
      const result = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-02",
        user_id: "test-user",
      });

      expect(result.overlay).toBeDefined();
      expect(result.overlay.userId).toBe("test-user");
      expect(result.overlay.machine).toBeDefined();
      expect(result.overlay.selectedControllerId).toBeDefined();
    });

    it("supports calculator preset creation", () => {
      const result = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-03",
        user_id: "test-user",
        is_calculator_preset: true,
        preset_name: "roughing-preset",
      });

      expect(result.is_calculator_preset).toBe(true);
      expect(result.preset_name).toBe("roughing-preset");
    });

    it("sets enabled consumers", () => {
      const result = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-04",
        user_id: "test-user",
        enabled_consumers: ["calculator", "program_release"],
      });

      expect(result.enabled_consumers).toContain("calculator");
      expect(result.enabled_consumers).toContain("program_release");
    });

    it("throws for invalid shop machine ID", () => {
      expect(() => {
        shopMachineOverlayEngine.createOverlay({
          shop_machine_id: "INVALID-MACHINE-XYZ",
          user_id: "test-user",
        });
      }).toThrow();
    });

    it("accepts custom canonical package ID", () => {
      const result = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-05",
        canonical_package_id: "custom-canonical-id",
        user_id: "test-user",
      });

      expect(result.canonical_package_id).toBe("custom-canonical-id");
    });
  });

  describe("getOverlay", () => {
    it("retrieves existing overlay by ID", () => {
      const created = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-01",
        user_id: "test-user",
      });

      const retrieved = shopMachineOverlayEngine.getOverlay(created.overlay_id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.overlay_id).toBe(created.overlay_id);
    });

    it("returns null for non-existent overlay", () => {
      const result = shopMachineOverlayEngine.getOverlay("non-existent-id-xyz");
      expect(result).toBeNull();
    });
  });

  describe("getOverlaysForMachine", () => {
    it("returns all overlays for a shop machine", () => {
      // Create multiple overlays for same machine
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-02",
        user_id: "user-a",
        display_name: "Config A",
      });
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-02",
        user_id: "user-b",
        display_name: "Config B",
      });

      const overlays = shopMachineOverlayEngine.getOverlaysForMachine("VMC-02");

      expect(overlays.length).toBeGreaterThanOrEqual(2);
      expect(overlays.some(o => o.display_name === "Config A")).toBe(true);
      expect(overlays.some(o => o.display_name === "Config B")).toBe(true);
    });

    it("returns empty array for machine with no overlays", () => {
      const overlays = shopMachineOverlayEngine.getOverlaysForMachine("NO-OVERLAYS-MACHINE");
      expect(Array.isArray(overlays)).toBe(true);
    });
  });

  describe("updateOverlay", () => {
    it("updates overlay display name", () => {
      const created = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-03",
        user_id: "test-user",
        display_name: "Original Name",
      });

      const updated = shopMachineOverlayEngine.updateOverlay({
        overlay_id: created.overlay_id,
        updates: { display_name: "Updated Name" },
        user_id: "test-user",
      });

      expect(updated).not.toBeNull();
      expect(updated!.display_name).toBe("Updated Name");
      expect(updated!.version).toBe(2);
    });

    it("tracks updated_by and updated_at", () => {
      const created = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-04",
        user_id: "user-a",
      });

      const updated = shopMachineOverlayEngine.updateOverlay({
        overlay_id: created.overlay_id,
        updates: { display_name: "New Name" },
        user_id: "user-b",
      });

      expect(updated!.updated_by).toBe("user-b");
      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(created.created_at).getTime());
    });

    it("returns null for non-existent overlay", () => {
      const result = shopMachineOverlayEngine.updateOverlay({
        overlay_id: "does-not-exist",
        updates: { display_name: "Test" },
        user_id: "test-user",
      });

      expect(result).toBeNull();
    });
  });

  describe("setDefault", () => {
    it("sets overlay as default for machine", () => {
      const overlay1 = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-05",
        user_id: "test-user",
        display_name: "Config 1",
      });
      const overlay2 = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-05",
        user_id: "test-user",
        display_name: "Config 2",
      });

      shopMachineOverlayEngine.setDefault(overlay2.overlay_id, "test-user");

      const defaultOverlay = shopMachineOverlayEngine.getDefaultOverlay("VMC-05");
      expect(defaultOverlay).not.toBeNull();
      expect(defaultOverlay!.overlay_id).toBe(overlay2.overlay_id);
    });

    it("returns false for non-existent overlay", () => {
      const result = shopMachineOverlayEngine.setDefault("non-existent", "test-user");
      expect(result).toBe(false);
    });
  });

  describe("deleteOverlay", () => {
    it("deletes existing overlay", () => {
      const created = shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "EDM-01",
        user_id: "test-user",
      });

      const deleted = shopMachineOverlayEngine.deleteOverlay(created.overlay_id);
      expect(deleted).toBe(true);

      const retrieved = shopMachineOverlayEngine.getOverlay(created.overlay_id);
      expect(retrieved).toBeNull();
    });

    it("returns false for non-existent overlay", () => {
      const result = shopMachineOverlayEngine.deleteOverlay("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("getPreset / listPresets", () => {
    it("retrieves preset by name", () => {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-06",
        user_id: "test-user",
        is_calculator_preset: true,
        preset_name: "finishing-preset",
      });

      const preset = shopMachineOverlayEngine.getPreset("finishing-preset");
      expect(preset).not.toBeNull();
      expect(preset!.preset_name).toBe("finishing-preset");
    });

    it("returns null for non-existent preset", () => {
      const result = shopMachineOverlayEngine.getPreset("non-existent-preset");
      expect(result).toBeNull();
    });

    it("lists all calculator presets", () => {
      const presets = shopMachineOverlayEngine.listPresets();
      expect(Array.isArray(presets)).toBe(true);
    });
  });

  describe("getMergedView", () => {
    it("returns merged view for shop machine", () => {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-07",
        user_id: "test-user",
      });

      const view = shopMachineOverlayEngine.getMergedView("LTH-07");

      expect(view).not.toBeNull();
      expect(view!.shop_machine).toBeDefined();
      expect(view!.merged_snapshot).toBeDefined();
      expect(view!.read_model).toBeDefined();
    });

    it("includes read model with consumer flags", () => {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "GRND-01",
        user_id: "test-user",
        enabled_consumers: ["calculator", "program_release"],
      });

      const view = shopMachineOverlayEngine.getMergedView("GRND-01");

      expect(view!.read_model.canDriveCalculatorSelections).toBe(true);
      expect(view!.read_model.canDriveProgramRelease).toBe(true);
    });

    it("returns null for invalid machine", () => {
      const view = shopMachineOverlayEngine.getMergedView("INVALID-MACHINE");
      expect(view).toBeNull();
    });

    it("includes capability snapshot with controller packages", () => {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "WEDM-01",
        user_id: "test-user",
      });

      const view = shopMachineOverlayEngine.getMergedView("WEDM-01");

      expect(view!.merged_snapshot.controllerPackages).toBeDefined();
      expect(Array.isArray(view!.merged_snapshot.controllerPackages)).toBe(true);
    });
  });

  describe("createOverlaysForShop", () => {
    it("creates overlays for machines without existing overlays", () => {
      const results = shopMachineOverlayEngine.createOverlaysForShop("bulk-user");

      expect(Array.isArray(results)).toBe(true);
      // Should create some overlays for JM Die machines
    });
  });

  describe("getStats", () => {
    it("returns overlay statistics", () => {
      const stats = shopMachineOverlayEngine.getStats();

      expect(stats.total_overlays).toBeGreaterThanOrEqual(0);
      expect(stats.machines_covered).toBeGreaterThanOrEqual(0);
      expect(stats.total_shop_machines).toBeGreaterThan(0);
      expect(stats.coverage_pct).toBeGreaterThanOrEqual(0);
      expect(stats.coverage_pct).toBeLessThanOrEqual(100);
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = shopMachineOverlayEngine.getSelfAwareness();

      expect(awareness.engine).toBe("ShopMachineOverlayEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P2-U03");
      expect(awareness.capabilities).toContain("createOverlay");
      expect(awareness.capabilities).toContain("getMergedView");
      expect(awareness.integrations.length).toBeGreaterThan(0);
    });
  });
});
