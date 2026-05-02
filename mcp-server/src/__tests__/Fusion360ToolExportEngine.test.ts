/**
 * Fusion360ToolExportEngine.test.ts
 *
 * Coverage:
 *   - parse: valid Tools.json round-trip; corrupt JSON throws
 *   - serialize + parse round-trip preserves data
 *   - duplicate tool number detection
 *   - geometry anomaly detection (overall < shoulder, ball mill bad radius)
 *   - validate aggregate
 *   - schema rejection on bad inputs
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360ToolExportEngine,
  ToolFusionExportSchema,
  ToolGeometrySchema,
  ToolKindSchema,
  ToolLibraryFileSchema,
  type ToolFusionExport,
} from "../engines/Fusion360ToolExportEngine.js";

// ── Test fixtures ────────────────────────────────────────────────────────────

function flatEndmill(overrides: Partial<ToolFusionExport> = {}): ToolFusionExport {
  return {
    guid: overrides.guid ?? "guid-flat-1",
    description: "1/2 in flat end mill carbide",
    tool_number: 1,
    kind: "flat_endmill",
    geometry: {
      diameter_mm: 12.7,
      flute_length_mm: 25,
      shoulder_length_mm: 38,
      overall_length_mm: 75,
      flutes: 4,
      helix_angle_deg: 30,
    },
    material: "carbide",
    ...overrides,
  };
}

function ballEndmill(overrides: Partial<ToolFusionExport> = {}): ToolFusionExport {
  return {
    guid: overrides.guid ?? "guid-ball-1",
    description: "8mm ball end mill carbide",
    tool_number: 2,
    kind: "ball_endmill",
    geometry: {
      diameter_mm: 8,
      flute_length_mm: 20,
      shoulder_length_mm: 30,
      overall_length_mm: 60,
      flutes: 2,
      corner_radius_mm: 4,                              // = diameter/2 (correct ball geometry)
    },
    material: "carbide",
    ...overrides,
  };
}

// ── 1. Parse / serialize round-trip ─────────────────────────────────────────

describe("Fusion360ToolExportEngine — parse + serialize", () => {
  it("serialize then parse round-trips data faithfully", () => {
    const tools = [flatEndmill({ guid: "g1", tool_number: 1 }), ballEndmill({ guid: "g2", tool_number: 2 })];
    const json = Fusion360ToolExportEngine.serialize(tools);
    const parsed = Fusion360ToolExportEngine.parse(json);
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.data.length).toBe(2);
    expect(parsed.data[0].guid).toBe("g1");
    expect(parsed.data[1].guid).toBe("g2");
    expect(parsed.data[1].geometry.corner_radius_mm).toBe(4);
  });

  it("serialize produces a stable JSON shape with version 1.0.0", () => {
    const json = Fusion360ToolExportEngine.serialize([flatEndmill()]);
    expect(json).toContain('"version": "1.0.0"');
    expect(json).toContain('"data":');
  });

  it("parse throws on invalid JSON (failure mode)", () => {
    expect(() => Fusion360ToolExportEngine.parse("{ not valid")).toThrow(/invalid JSON/);
  });

  it("parse throws on schema-mismatched JSON", () => {
    const bad = JSON.stringify({ version: "1.0.0", data: [{ guid: "g1" }] }); // missing required fields
    expect(() => Fusion360ToolExportEngine.parse(bad)).toThrow();
  });

  it("normalize is parse + serialize and produces identical output as direct serialize", () => {
    const tools = [flatEndmill({ guid: "g1" })];
    const exported = Fusion360ToolExportEngine.serialize(tools, { exportedAtIso: "2026-05-01T00:00:00Z" });
    const normalized = Fusion360ToolExportEngine.normalize(exported);
    const parsedAgain = Fusion360ToolExportEngine.parse(normalized);
    expect(parsedAgain.data[0].guid).toBe("g1");
    expect(parsedAgain.exported_at_iso).toBe("2026-05-01T00:00:00Z");
  });
});

// ── 2. Duplicate tool number detection ─────────────────────────────────────

describe("Fusion360ToolExportEngine — duplicate detection", () => {
  it("findDuplicateToolNumbers returns empty array on unique numbers", () => {
    const dupes = Fusion360ToolExportEngine.findDuplicateToolNumbers([
      flatEndmill({ tool_number: 1, guid: "a" }),
      flatEndmill({ tool_number: 2, guid: "b" }),
      flatEndmill({ tool_number: 3, guid: "c" }),
    ]);
    expect(dupes).toEqual([]);
  });

  it("findDuplicateToolNumbers detects duplicates", () => {
    const dupes = Fusion360ToolExportEngine.findDuplicateToolNumbers([
      flatEndmill({ tool_number: 1, guid: "a" }),
      flatEndmill({ tool_number: 5, guid: "b" }),
      flatEndmill({ tool_number: 5, guid: "c" }),
      flatEndmill({ tool_number: 1, guid: "d" }),
    ]);
    expect(dupes).toEqual([1, 5]);
  });

  it("validate fails when duplicates present", () => {
    const v = Fusion360ToolExportEngine.validate([
      flatEndmill({ tool_number: 1, guid: "a" }),
      flatEndmill({ tool_number: 1, guid: "b" }),
    ]);
    expect(v.ok).toBe(false);
    expect(v.reasons.some(r => r.includes("duplicate tool numbers"))).toBe(true);
  });
});

// ── 3. Geometry anomalies ─────────────────────────────────────────────────

describe("Fusion360ToolExportEngine — geometry anomalies", () => {
  it("clean tool list has no anomalies", () => {
    const tools = [flatEndmill(), ballEndmill()];
    expect(Fusion360ToolExportEngine.findGeometryAnomalies(tools)).toEqual([]);
  });

  it("detects overall_length < shoulder_length", () => {
    const bad = flatEndmill({
      guid: "bad-overall",
      geometry: { diameter_mm: 12.7, flute_length_mm: 10, shoulder_length_mm: 50, overall_length_mm: 30, flutes: 4 },
    });
    const anomalies = Fusion360ToolExportEngine.findGeometryAnomalies([bad]);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].guid).toBe("bad-overall");
    expect(anomalies[0].reason).toMatch(/overall_length/);
  });

  it("detects shoulder_length < flute_length", () => {
    const bad = flatEndmill({
      guid: "bad-shoulder",
      geometry: { diameter_mm: 12.7, flute_length_mm: 50, shoulder_length_mm: 30, overall_length_mm: 75, flutes: 4 },
    });
    const anomalies = Fusion360ToolExportEngine.findGeometryAnomalies([bad]);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].reason).toMatch(/shoulder_length/);
  });

  it("flags ball end mill with corner_radius != diameter/2", () => {
    const bad = ballEndmill({
      guid: "bad-ball",
      geometry: { diameter_mm: 8, flute_length_mm: 20, shoulder_length_mm: 30, overall_length_mm: 60, flutes: 2, corner_radius_mm: 2 },
    });
    const anomalies = Fusion360ToolExportEngine.findGeometryAnomalies([bad]);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].reason).toMatch(/ball end mill corner_radius/);
  });

  it("flags ball end mill with missing corner_radius", () => {
    const bad = ballEndmill({
      guid: "bad-ball-missing",
      geometry: { diameter_mm: 8, flute_length_mm: 20, shoulder_length_mm: 30, overall_length_mm: 60, flutes: 2 },
    });
    const anomalies = Fusion360ToolExportEngine.findGeometryAnomalies([bad]);
    expect(anomalies.length).toBe(1);
  });

  it("flags unusually high flute count (> 12)", () => {
    const bad = flatEndmill({
      guid: "bad-flutes",
      geometry: { diameter_mm: 12.7, flute_length_mm: 25, shoulder_length_mm: 38, overall_length_mm: 75, flutes: 16 },
    });
    const anomalies = Fusion360ToolExportEngine.findGeometryAnomalies([bad]);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].reason).toMatch(/flute count/);
  });
});

// ── 4. Stats ──────────────────────────────────────────────────────────────

describe("Fusion360ToolExportEngine — stats", () => {
  it("stats reports total + by_kind + by_material distribution", () => {
    const tools = [
      flatEndmill({ guid: "f1", tool_number: 1 }),
      flatEndmill({ guid: "f2", tool_number: 2 }),
      ballEndmill({ guid: "b1", tool_number: 3 }),
    ];
    const stats = Fusion360ToolExportEngine.stats(tools);
    expect(stats.total).toBe(3);
    expect(stats.by_kind.flat_endmill).toBe(2);
    expect(stats.by_kind.ball_endmill).toBe(1);
    expect(stats.by_material.carbide).toBe(3);
    expect(stats.duplicate_tool_numbers).toEqual([]);
    expect(stats.geometry_anomalies).toBe(0);
  });
});

// ── 5. Schema validation ──────────────────────────────────────────────────

describe("Fusion360ToolExportEngine — schema validation", () => {
  it("ToolGeometrySchema rejects negative diameter", () => {
    expect(() => ToolGeometrySchema.parse({
      diameter_mm: -1, flute_length_mm: 20, shoulder_length_mm: 30, overall_length_mm: 60, flutes: 2,
    })).toThrow();
  });

  it("ToolGeometrySchema rejects flutes = 0", () => {
    expect(() => ToolGeometrySchema.parse({
      diameter_mm: 12.7, flute_length_mm: 25, shoulder_length_mm: 38, overall_length_mm: 75, flutes: 0,
    })).toThrow();
  });

  it("ToolGeometrySchema rejects helix_angle > 60°", () => {
    expect(() => ToolGeometrySchema.parse({
      diameter_mm: 12.7, flute_length_mm: 25, shoulder_length_mm: 38, overall_length_mm: 75, flutes: 4, helix_angle_deg: 75,
    })).toThrow();
  });

  it("ToolFusionExportSchema rejects tool_number = 0 (out of [1..9999])", () => {
    expect(() => ToolFusionExportSchema.parse({
      ...flatEndmill(), tool_number: 0,
    })).toThrow();
  });

  it("ToolFusionExportSchema rejects tool_number > 9999", () => {
    expect(() => ToolFusionExportSchema.parse({
      ...flatEndmill(), tool_number: 10000,
    })).toThrow();
  });

  it("ToolKindSchema rejects unknown kind", () => {
    const bad: unknown = "laser_cutter";
    expect(() => ToolKindSchema.parse(bad)).toThrow();
  });

  it("ToolLibraryFileSchema rejects non-semver version", () => {
    expect(() => ToolLibraryFileSchema.parse({
      version: "v1", data: [], exported_at_iso: "2026-05-01T00:00:00Z",
    })).toThrow();
  });
});

// ── 6. Dispatcher round-trip ─────────────────────────────────────────────

describe("Fusion360ToolExportEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the tool export actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_tool_parse");
    expect(mod.ACTIONS).toContain("cam_fusion360_tool_serialize");
    expect(mod.ACTIONS).toContain("cam_fusion360_tool_validate");
    expect(mod.ACTIONS).toContain("cam_fusion360_tool_stats");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/Fusion360ToolExportEngine.js");
    const tools = [flatEndmill()];
    const json = mod.Fusion360ToolExportEngine.serialize(tools);
    const parsed = mod.Fusion360ToolExportEngine.parse(json);
    expect(parsed.data.length).toBe(1);
  });
});
