/**
 * InventoryAwareToolSelectorEngine.selectForCAM tests — U-CAM-R3-11
 * ==================================================================
 * Verifies cross-CAM inventory-aware tool selection. Before this method,
 * 0 CAM adapter reached the tool crib (Round-3 universal gap #2). After
 * wiring, all 5 priority-5 CAMs get identifier-projected assignments.
 */

import { describe, it, expect } from "vitest";
import {
  inventoryAwareToolSelectorEngine,
  type UserTool,
  type PartFeature,
} from "../engines/InventoryAwareToolSelectorEngine.js";

const sampleInventory: UserTool[] = [
  { id: "T01", type: "endmill", diameter_mm: 6, flutes: 4, material: "carbide", condition: "new", magazine_position: 1 },
  { id: "T02", type: "drill", diameter_mm: 5, material: "carbide", condition: "new", magazine_position: 2 },
  { id: "T03", type: "tap", diameter_mm: 6, material: "hss", condition: "good", magazine_position: 3 },
  { id: "T04", type: "endmill", diameter_mm: 10, flutes: 3, material: "carbide", condition: "worn", magazine_position: 4 },
  { id: "T05", type: "face_mill", diameter_mm: 50, flutes: 5, material: "carbide", condition: "new", magazine_position: 5 },
];

const sampleFeatures: PartFeature[] = [
  { id: "F1", type: "pocket", width_mm: 20, depth_mm: 10, material: "6061" },
  { id: "F2", type: "drill", diameter_mm: 5, depth_mm: 15, material: "6061" },
  { id: "F3", type: "thread", diameter_mm: 6, depth_mm: 12, material: "6061" },
  { id: "F4", type: "face", length_mm: 100, width_mm: 80, material: "6061" },
];

describe("selectForCAM — surface + CAM-identifier projection", () => {
  it("accepts all 5 priority CAM slugs without throwing", () => {
    for (const slug of ["mastercam", "hypermill", "fusion360", "inventor-hsm", "solidcam"]) {
      const r = inventoryAwareToolSelectorEngine.selectForCAM({
        cam_slug: slug,
        features: sampleFeatures,
        inventory: sampleInventory,
      });
      expect(r.value.cam_slug).toBe(slug);
    }
  });

  it("returns base_selection wrapping the unmodified select() output", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    expect(r.value.base_selection).toBeDefined();
    expect(r.value.base_selection.assignments.length).toBeGreaterThan(0);
  });

  it("Mastercam projects T01 → 'T01' style identifier", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    const mcIds = r.value.cam_tool_refs.map((x) => x.cam_identifier);
    expect(mcIds.some((id) => /^T\d{2}$/.test(id))).toBe(true);
  });

  it("hyperMILL identifiers use HM_ prefix", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "hypermill",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    for (const ref of r.value.cam_tool_refs) {
      expect(ref.cam_identifier).toMatch(/^HM_/);
    }
  });

  it("Fusion identifiers use fusion-tool: prefix", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "fusion360",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    for (const ref of r.value.cam_tool_refs) {
      expect(ref.cam_identifier).toMatch(/^fusion-tool:/);
    }
  });

  it("Inventor HSM identifiers embed diameter", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "inventor-hsm",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    for (const ref of r.value.cam_tool_refs) {
      expect(ref.cam_identifier).toMatch(/^HSM_.*_d\d+/);
    }
  });

  it("SolidCAM identifiers use SC_SLOT_ prefix", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "solidcam",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    for (const ref of r.value.cam_tool_refs) {
      expect(ref.cam_identifier).toMatch(/^SC_SLOT_/);
    }
  });
});

describe("selectForCAM — magazine capacity handling", () => {
  it("applies default capacity when not provided (Mastercam=30)", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    expect(r.value.magazine_capacity).toBe(30);
  });

  it("respects caller-supplied magazine capacity", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: sampleFeatures,
      inventory: sampleInventory,
      magazine_capacity: 2,
    });
    expect(r.value.magazine_capacity).toBe(2);
    expect(r.value.magazine_slots.length).toBeLessThanOrEqual(2);
  });

  it("moves slots beyond capacity into overflow with reason", () => {
    // Build features needing more unique tools than capacity=1 allows
    const manyFeatures: PartFeature[] = [
      { id: "A", type: "drill", diameter_mm: 5, depth_mm: 10, material: "6061" },
      { id: "B", type: "drill", diameter_mm: 8, depth_mm: 10, material: "6061" },
      { id: "C", type: "drill", diameter_mm: 10, depth_mm: 10, material: "6061" },
    ];
    const manyInv: UserTool[] = [
      { id: "D5", type: "drill", diameter_mm: 5, material: "carbide", condition: "new", magazine_position: 1 },
      { id: "D8", type: "drill", diameter_mm: 8, material: "carbide", condition: "new", magazine_position: 2 },
      { id: "D10", type: "drill", diameter_mm: 10, material: "carbide", condition: "new", magazine_position: 3 },
    ];
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: manyFeatures,
      inventory: manyInv,
      magazine_capacity: 1,
    });
    expect(r.value.overflow.length).toBeGreaterThan(0);
    for (const o of r.value.overflow) {
      expect(o.reason).toMatch(/capacity.*exceeded/);
    }
  });
});

describe("selectForCAM — result structure integrity", () => {
  it("returns AtomicValue with source and confidence", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    expect(r.source).toBe("InventoryAwareToolSelectorEngine.selectForCAM");
    expect(typeof r.confidence).toBe("number");
  });

  it("each cam_tool_ref has feature_id + user_tool_id + cam_identifier", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    for (const ref of r.value.cam_tool_refs) {
      expect(ref.feature_id).toBeTruthy();
      expect(ref.user_tool_id).toBeTruthy();
      expect(ref.cam_identifier).toBeTruthy();
    }
  });

  it("unknown CAM slug falls back to tool.id as identifier", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "made-up-cam",
      features: sampleFeatures,
      inventory: sampleInventory,
    });
    // fallback branch returns the raw tool.id
    for (const ref of r.value.cam_tool_refs) {
      expect(ref.cam_identifier).toBe(ref.user_tool_id);
    }
  });

  it("empty inventory returns empty cam_tool_refs", () => {
    const r = inventoryAwareToolSelectorEngine.selectForCAM({
      cam_slug: "mastercam",
      features: sampleFeatures,
      inventory: [],
    });
    expect(r.value.cam_tool_refs).toHaveLength(0);
  });
});
