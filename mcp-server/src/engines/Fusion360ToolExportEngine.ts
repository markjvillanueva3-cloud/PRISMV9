/**
 * Fusion360ToolExportEngine — Fusion 360 tool library import/export
 *
 * Fusion 360's tool library is JSON-backed (Tools.json export format).
 * This engine handles round-tripping the JSON shape, mapping it to a
 * normalized PRISM tool descriptor that other CAM engines can consume.
 *
 * Sister engine: MastercamToolExportEngine (same shape, Mastercam .tools format).
 *
 * @module engines/Fusion360ToolExportEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-TOOL-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const ToolKindSchema = z.enum([
  "flat_endmill",
  "ball_endmill",
  "bull_nose_endmill",
  "chamfer_mill",
  "thread_mill",
  "engrave_mill",
  "face_mill",
  "drill",
  "spot_drill",
  "tap",
  "reamer",
  "boring_bar",
  "turn_od",
  "turn_id",
  "groove_tool",
  "thread_tool",
  "swarf_cutter",
  "barrel_mill",
  "lens_mill",
]);
export type ToolKind = z.infer<typeof ToolKindSchema>;

export const ToolGeometrySchema = z.object({
  diameter_mm: z.number().positive(),
  flute_length_mm: z.number().positive(),
  shoulder_length_mm: z.number().positive(),
  overall_length_mm: z.number().positive(),
  flutes: z.number().int().positive(),
  helix_angle_deg: z.number().min(0).max(60).optional(),
  corner_radius_mm: z.number().nonnegative().optional(),
  tip_angle_deg: z.number().min(0).max(180).optional(),
});
export type ToolGeometry = z.infer<typeof ToolGeometrySchema>;

export const ToolFusionExportSchema = z.object({
  /** Fusion's internal tool guid — preserved on round-trip. */
  guid: z.string().min(1),
  /** Display name shown in Fusion's tool library UI. */
  description: z.string().min(1),
  /** Numeric tool number assigned in the operation. */
  tool_number: z.number().int().min(1).max(9999),
  kind: ToolKindSchema,
  geometry: ToolGeometrySchema,
  /** Manufacturer / vendor (Sandvik, Iscar, OSG, etc.). */
  vendor: z.string().optional(),
  /** Vendor catalog number. */
  product_id: z.string().optional(),
  /** Coating (TiAlN, AlTiN, DLC, uncoated). */
  coating: z.string().optional(),
  /** Material (carbide, HSS, ceramic, CBN). */
  material: z.enum(["carbide", "hss", "ceramic", "cbn", "diamond"]),
  /** Pre-set RPM/feed (Fusion stores these per-tool when bound). */
  preset_rpm: z.number().nonnegative().optional(),
  preset_feed_mmpm: z.number().nonnegative().optional(),
});
export type ToolFusionExport = z.infer<typeof ToolFusionExportSchema>;

/** Top-level Fusion Tools.json wrapper. */
export const ToolLibraryFileSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "version must be semver"),
  data: z.array(ToolFusionExportSchema),
  exported_at_iso: z.string().optional(),
});
export type ToolLibraryFile = z.infer<typeof ToolLibraryFileSchema>;

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360ToolExportEngine {
  static readonly LIBRARY_FILE_VERSION = "1.0.0";

  /** Parse a Fusion Tools.json text and return normalized tool descriptors. */
  static parse(jsonText: string): ToolLibraryFile {
    let raw: unknown;
    try { raw = JSON.parse(jsonText); }
    catch (e) { throw new Error(`Fusion360ToolExport: invalid JSON: ${(e as Error).message}`); }
    return ToolLibraryFileSchema.parse(raw);
  }

  /** Serialize a tool list back to the Fusion Tools.json shape. */
  static serialize(tools: ToolFusionExport[], opts: { exportedAtIso?: string } = {}): string {
    const file: ToolLibraryFile = ToolLibraryFileSchema.parse({
      version: Fusion360ToolExportEngine.LIBRARY_FILE_VERSION,
      data: tools,
      exported_at_iso: opts.exportedAtIso ?? new Date().toISOString(),
    });
    return JSON.stringify(file, null, 2);
  }

  /** Round-trip parse + serialize (returns the canonical normalized JSON). */
  static normalize(jsonText: string): string {
    const file = Fusion360ToolExportEngine.parse(jsonText);
    return Fusion360ToolExportEngine.serialize(file.data, { exportedAtIso: file.exported_at_iso });
  }

  /** Find duplicate tool numbers across the library. */
  static findDuplicateToolNumbers(tools: ToolFusionExport[]): number[] {
    const seen = new Set<number>();
    const dupes = new Set<number>();
    for (const t of tools) {
      if (seen.has(t.tool_number)) dupes.add(t.tool_number);
      seen.add(t.tool_number);
    }
    return [...dupes].sort((a, b) => a - b);
  }

  /** Find tools with implausible geometry (overall < flute, flutes outside typical range). */
  static findGeometryAnomalies(tools: ToolFusionExport[]): Array<{ guid: string; reason: string }> {
    const out: Array<{ guid: string; reason: string }> = [];
    for (const t of tools) {
      const g = t.geometry;
      if (g.overall_length_mm < g.shoulder_length_mm) {
        out.push({ guid: t.guid, reason: `overall_length ${g.overall_length_mm} < shoulder_length ${g.shoulder_length_mm}` });
      }
      if (g.shoulder_length_mm < g.flute_length_mm) {
        out.push({ guid: t.guid, reason: `shoulder_length ${g.shoulder_length_mm} < flute_length ${g.flute_length_mm}` });
      }
      if (g.flutes > 12) {
        out.push({ guid: t.guid, reason: `unusually high flute count ${g.flutes}` });
      }
      if (t.kind === "ball_endmill" && (g.corner_radius_mm === undefined || Math.abs(g.corner_radius_mm - g.diameter_mm / 2) > 0.001)) {
        out.push({ guid: t.guid, reason: `ball end mill corner_radius (${g.corner_radius_mm ?? "undefined"}) must equal diameter/2 (${g.diameter_mm / 2})` });
      }
    }
    return out;
  }

  /** Compute aggregate stats over a tool library. */
  static stats(tools: ToolFusionExport[]): {
    total: number;
    by_kind: Record<ToolKind, number>;
    by_material: Record<string, number>;
    duplicate_tool_numbers: number[];
    geometry_anomalies: number;
  } {
    const by_kind: Record<string, number> = {};
    for (const k of ToolKindSchema.options) by_kind[k] = 0;
    const by_material: Record<string, number> = {};
    for (const t of tools) {
      by_kind[t.kind] = (by_kind[t.kind] ?? 0) + 1;
      by_material[t.material] = (by_material[t.material] ?? 0) + 1;
    }
    return {
      total: tools.length,
      by_kind: by_kind as Record<ToolKind, number>,
      by_material,
      duplicate_tool_numbers: Fusion360ToolExportEngine.findDuplicateToolNumbers(tools),
      geometry_anomalies: Fusion360ToolExportEngine.findGeometryAnomalies(tools).length,
    };
  }

  /** Validate a tool library — returns ok + reasons array. */
  static validate(tools: ToolFusionExport[]): { ok: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const dupes = Fusion360ToolExportEngine.findDuplicateToolNumbers(tools);
    if (dupes.length > 0) reasons.push(`duplicate tool numbers: ${dupes.join(", ")}`);
    const anomalies = Fusion360ToolExportEngine.findGeometryAnomalies(tools);
    for (const a of anomalies) reasons.push(`geometry anomaly on ${a.guid}: ${a.reason}`);
    return { ok: reasons.length === 0, reasons };
  }
}

export const fusion360ToolExportEngine = Fusion360ToolExportEngine;
