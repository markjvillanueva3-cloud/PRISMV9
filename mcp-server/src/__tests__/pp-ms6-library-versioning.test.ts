/**
 * PP-MS6 Tests — PostLibraryCatalogEngine + PostVersioningEngine
 *
 * Validates:
 *   - Faceted catalog search (vendor, controller, machine type, text)
 *   - Compatibility scoring against machine profiles
 *   - Version hash generation and storage
 *   - Version history retrieval
 *   - Version diff (line-by-line + config diff)
 */

import { describe, it, expect } from "vitest";
import { postLibraryCatalogEngine } from "../engines/PostLibraryCatalogEngine.js";
import { postVersioningEngine } from "../engines/PostVersioningEngine.js";
import type { MachineContext } from "../engines/PostProcessorPipelineEngine.js";

const TEST_MACHINE: MachineContext = {
  id: "haas-vf2",
  name: "Haas VF-2",
  brand: "Haas",
  controller: "haas",
  max_rpm: 8100,
  max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3,
  atc_capacity: 20,
  coolant_types: ["flood", "tsc"],
  resolution_confidence: 0.95,
};

// ─── PostLibraryCatalogEngine Tests ─────────────────────────────────

describe("PostLibraryCatalogEngine", () => {
  it("returns all posts on empty search", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
    });
    expect(result).toHaveProperty("posts");
    const r = result as any;
    expect(r.posts.length).toBeGreaterThan(10);
    expect(r.total_matches).toBeGreaterThan(10);
  });

  it("filters by vendor", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: { vendor: "Haas" },
    }) as any;

    expect(result.posts.length).toBeGreaterThan(0);
    expect(result.posts.every((p: any) => p.vendor === "Haas")).toBe(true);
  });

  it("filters by controller", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: { controller: "siemens" },
    }) as any;

    expect(result.posts.length).toBeGreaterThan(0);
    expect(result.posts.every((p: any) => p.controller === "siemens")).toBe(true);
  });

  it("filters by machine type", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: { machine_type: "lathe" },
    }) as any;

    expect(result.posts.length).toBeGreaterThan(0);
    expect(result.posts.every((p: any) => p.machine_types.includes("lathe"))).toBe(true);
  });

  it("full-text search finds matching posts", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "5-axis TCP" },
    }) as any;

    expect(result.posts.length).toBeGreaterThan(0);
    expect(result.posts.some((p: any) => p.capabilities.includes("tcp"))).toBe(true);
  });

  it("scores compatibility against machine profile", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
      machine: TEST_MACHINE,
    }) as any;

    // Haas NGC Mill should score highest for Haas VF-2
    const topPost = result.posts[0];
    expect(topPost.score).toBeDefined();
    expect(topPost.score.total).toBeGreaterThan(50);
    expect(topPost.vendor).toBe("Haas");
  });

  it("Haas post scores higher than Siemens for Haas machine", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
      machine: TEST_MACHINE,
    }) as any;

    const haasPost = result.posts.find((p: any) => p.id === "haas-ngc-mill");
    const siemensPost = result.posts.find((p: any) => p.id === "siemens-840d-3ax");
    expect(haasPost.score.total).toBeGreaterThan(siemensPost.score.total);
  });

  it("returns detail for known post ID", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "detail",
      post_id: "haas-ngc-mill",
    });

    expect(result).toHaveProperty("name");
    expect((result as any).name).toContain("Haas");
  });

  it("throws on unknown post ID", async () => {
    await expect(
      postLibraryCatalogEngine.process({ action: "detail", post_id: "nonexistent" })
    ).rejects.toThrow("Post not found");
  });

  it("list_facets returns vendor/controller/type counts", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "list_facets",
    }) as any;

    expect(result.facets.vendors).toHaveProperty("Fanuc");
    expect(result.facets.controllers).toHaveProperty("fanuc");
    expect(result.facets.machine_types).toHaveProperty("mill");
  });

  it("respects search limit", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: { limit: 3 },
    }) as any;

    expect(result.posts.length).toBeLessThanOrEqual(3);
    expect(result.total_matches).toBeGreaterThan(3);
  });
});

// ─── PostVersioningEngine Tests ─────────────────────────────────────

describe("PostVersioningEngine", () => {
  it("stores a version and returns hash", async () => {
    const result = await postVersioningEngine.process({
      action: "store",
      version: {
        machine_id: "haas-vf2",
        controller: "haas",
        features: ["probing", "rigid_tapping"],
        aggressiveness: 0.5,
        gcode: "O1001\nG90 G54\nG0 X0 Y0\nM30",
        label: "test-v1",
      },
    }) as any;

    expect(result.hash).toBeDefined();
    expect(result.short_hash.length).toBe(8);
    expect(result.machine_id).toBe("haas-vf2");
    expect(result.line_count).toBe(4);
    expect(result.label).toBe("test-v1");
  });

  it("retrieves stored version by hash", async () => {
    const stored = await postVersioningEngine.process({
      action: "store",
      version: {
        machine_id: "haas-vf2",
        controller: "haas",
        features: ["tcp"],
        aggressiveness: 0.7,
        gcode: "O2001\nG90\nM30",
      },
    }) as any;

    const retrieved = await postVersioningEngine.process({
      action: "retrieve",
      hash: stored.hash,
    }) as any;

    expect(retrieved.gcode).toBe("O2001\nG90\nM30");
    expect(retrieved.controller).toBe("haas");
  });

  it("returns history for a machine", async () => {
    // Store two versions for same machine
    await postVersioningEngine.process({
      action: "store",
      version: { machine_id: "test-hist", controller: "fanuc", features: [], aggressiveness: 0.5, gcode: "V1" },
    });
    await postVersioningEngine.process({
      action: "store",
      version: { machine_id: "test-hist", controller: "fanuc", features: ["hsm"], aggressiveness: 0.8, gcode: "V2" },
    });

    const history = await postVersioningEngine.process({
      action: "history",
      machine_id: "test-hist",
    }) as any;

    expect(history.versions.length).toBe(2);
    expect(history.machine_id).toBe("test-hist");
    // History should not include gcode (for efficiency)
    expect(history.versions[0]).not.toHaveProperty("gcode");
  });

  it("diffs two versions showing added/removed/changed lines", async () => {
    const v1 = await postVersioningEngine.process({
      action: "store",
      version: { machine_id: "diff-test", controller: "fanuc", features: [], aggressiveness: 0.5, gcode: "O1001\nG90 G54\nG1 X100. F500\nM30" },
    }) as any;

    const v2 = await postVersioningEngine.process({
      action: "store",
      version: { machine_id: "diff-test", controller: "fanuc", features: ["hsm"], aggressiveness: 0.7, gcode: "O1001\nG90 G54\nG1 X100. F750\nG1 Y50. F600\nM30" },
    }) as any;

    const diff = await postVersioningEngine.process({
      action: "diff",
      hash_a: v1.hash,
      hash_b: v2.hash,
    }) as any;

    expect(diff.summary.lines_changed).toBeGreaterThan(0);
    expect(diff.summary.config_diffs).toContain("Feature added: hsm");
    expect(diff.summary.config_diffs.some((d: string) => d.includes("Aggressiveness"))).toBe(true);
  });

  it("throws on unknown hash for retrieve", async () => {
    await expect(
      postVersioningEngine.process({ action: "retrieve", hash: "0000000000000000" })
    ).rejects.toThrow("Version not found");
  });

  it("features are sorted in stored version", async () => {
    const result = await postVersioningEngine.process({
      action: "store",
      version: { machine_id: "sort-test", controller: "haas", features: ["z_feature", "a_feature", "m_feature"], aggressiveness: 0.5, gcode: "test" },
    }) as any;

    expect(result.features).toEqual(["a_feature", "m_feature", "z_feature"]);
  });
});
