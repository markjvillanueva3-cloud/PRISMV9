/**
 * BatchCAMEngine — CK-MS12 U04
 *
 * Generate CNC programs for multiple parts in one call.
 *
 * Features:
 *   batchGenerate(parts, options)           — generate programs for array of parts
 *   batchWithSharedSetup(parts, shared)     — parts sharing machine/material
 *   parallelGenerate(parts, concurrency)    — async parallel generation
 *   summarizeBatch(results)                 — aggregate statistics
 *   optimizeBatchOrder(parts)               — sort for minimum setup changes
 */

import { log } from "../utils/Logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BatchPart {
  part_id:    string;
  features:   PartFeature[];
  material?:  string;         // e.g. "aluminum_6061", "steel_4140"
  machine?:   string;         // e.g. "Haas VF-2"
  controller?: string;        // e.g. "fanuc_0i", "siemens_840d"
  quantity?:  number;
  notes?:     string;
}

export interface PartFeature {
  type:       string;         // "pocket" | "hole" | "slot" | "thread" | "face" | "profile"
  dimensions: Record<string, number>; // e.g. { length_mm: 50, width_mm: 30, depth_mm: 10 }
  tolerance_mm?: number;
  surface_finish_ra?: number;
  thread_spec?: string;
}

export interface SharedConfig {
  machine?:     string;
  controller?:  string;
  material?:    string;
  coolant?:     "flood" | "mist" | "air" | "dry";
  units?:       "mm" | "inch";
}

export interface BatchOptions {
  concurrency?:  number;      // default 4
  on_error?:     "skip" | "abort"; // default "skip"
  shared?:       SharedConfig;
  cache?:        boolean;     // use CAMResultCacheEngine
}

export interface PartResult {
  part_id:       string;
  success:       boolean;
  gcode?:        string;
  cycle_time_s?: number;
  tools?:        ToolUsed[];
  warnings:      string[];
  errors:        string[];
  cost_usd?:     number;
}

export interface ToolUsed {
  number:      number;
  type:        string;
  diameter_mm: number;
  description: string;
}

export interface BatchSummary {
  total_parts:         number;
  successful_parts:    number;
  failed_parts:        number;
  total_cycle_time_s:  number;
  unique_tools:        ToolUsed[];
  total_cost_usd:      number;
  warnings:            string[];
  material_groups:     Record<string, number>;
  setup_changes:       number;
}

// ── Speed/Feed tables (simplified for batch generation) ───────────────────────

const SF_TABLE: Record<string, { rpm: number; feed_mmmin: number; doc_mm: number }> = {
  aluminum:   { rpm: 12000, feed_mmmin: 2000, doc_mm: 2.0 },
  steel:      { rpm:  3500, feed_mmmin:  800, doc_mm: 1.5 },
  stainless:  { rpm:  2500, feed_mmmin:  500, doc_mm: 1.0 },
  titanium:   { rpm:  1800, feed_mmmin:  300, doc_mm: 0.8 },
  inconel:    { rpm:  1200, feed_mmmin:  200, doc_mm: 0.5 },
  cast_iron:  { rpm:  3000, feed_mmmin:  700, doc_mm: 1.5 },
  brass:      { rpm: 10000, feed_mmmin: 1500, doc_mm: 2.0 },
  copper:     { rpm:  8000, feed_mmmin: 1200, doc_mm: 1.5 },
  plastic:    { rpm: 15000, feed_mmmin: 3000, doc_mm: 3.0 },
};

const DEFAULT_SF = { rpm: 3000, feed_mmmin: 500, doc_mm: 1.0 };

// ── G-code generation helpers ─────────────────────────────────────────────────

function resolveGroup(material: string): string {
  const m = material.toLowerCase();
  if (m.includes("aluminum") || m.includes("al_") || m.includes("6061") || m.includes("7075")) return "aluminum";
  if (m.includes("stainless") || m.includes("304") || m.includes("316"))  return "stainless";
  if (m.includes("titanium") || m.includes("ti-"))  return "titanium";
  if (m.includes("inconel"))  return "inconel";
  if (m.includes("cast_iron") || m.includes("grey_iron")) return "cast_iron";
  if (m.includes("brass"))    return "brass";
  if (m.includes("copper"))   return "copper";
  if (m.includes("plastic") || m.includes("peek") || m.includes("nylon")) return "plastic";
  if (m.includes("steel"))    return "steel";
  return "steel";
}

function getSF(material: string): typeof DEFAULT_SF {
  return SF_TABLE[resolveGroup(material)] ?? DEFAULT_SF;
}

function estimateCycleTime(gcode: string): number {
  const lines = gcode.split("\n");
  let t = 0;
  let feed = 500;
  let cx = 0, cy = 0, cz = 0;
  let modal = "G0";

  for (const line of lines) {
    const up = line.toUpperCase();
    if (/G0[^0-9]/.test(up)) modal = "G0";
    if (/G1[^0-9]/.test(up)) modal = "G1";
    const fM = /F(\d+(?:\.\d+)?)/.exec(up);
    if (fM) feed = parseFloat(fM[1]);
    const xM = /X(-?\d+(?:\.\d+)?)/.exec(up);
    const yM = /Y(-?\d+(?:\.\d+)?)/.exec(up);
    const zM = /Z(-?\d+(?:\.\d+)?)/.exec(up);
    if (!xM && !yM && !zM) continue;
    const nx = xM ? parseFloat(xM[1]) : cx;
    const ny = yM ? parseFloat(yM[1]) : cy;
    const nz = zM ? parseFloat(zM[1]) : cz;
    const d  = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2 + (nz - cz) ** 2);
    t += modal === "G0" ? d / (15000 / 60) : (feed > 0 ? d / (feed / 60) : 0);
    cx = nx; cy = ny; cz = nz;
  }
  return Math.round(t);
}

function estimateCost(cycle_s: number, material: string): number {
  const group      = resolveGroup(material);
  const matCostMin = { aluminum: 0.15, steel: 0.20, stainless: 0.35, titanium: 0.80, inconel: 1.20 } as Record<string, number>;
  const rate       = matCostMin[group] ?? 0.25; // USD/min
  return Math.round(((cycle_s / 60) * (0.50 + rate)) * 100) / 100;
}

function generateGCode(part: BatchPart, shared: SharedConfig): { gcode: string; tools: ToolUsed[]; warnings: string[] } {
  const mat    = shared.material ?? part.material ?? "steel";
  const ctrl   = shared.controller ?? part.controller ?? "fanuc_0i";
  const units  = shared.units ?? "mm";
  const sf     = getSF(mat);
  const tools: ToolUsed[] = [];
  const warnings: string[] = [];
  const lines: string[] = [];

  const isMetric = units === "mm";
  lines.push("%");
  lines.push(`O1000 (PART: ${part.part_id})`);
  lines.push(isMetric ? "G21 (METRIC)" : "G20 (INCH)");
  lines.push("G17 G40 G49 G80 G90");
  lines.push("G54");

  let toolNo = 1;
  for (const feat of part.features) {
    const featType = (feat.type ?? "pocket").toLowerCase();
    lines.push(`(--- ${featType.toUpperCase()} ---)`);

    // Tool selection
    const diameter = feat.dimensions?.["diameter_mm"] ?? feat.dimensions?.["tool_diameter_mm"] ?? 10;
    let toolDesc = "ENDMILL";
    if (featType === "hole" || featType === "drill") toolDesc = "DRILL";
    else if (featType === "thread")                  toolDesc = "TAP";
    else if (featType === "face")                    toolDesc = "FACE MILL";

    lines.push(`T${toolNo} M6`);
    lines.push(`(${toolDesc} D${diameter}mm ${mat.toUpperCase()})`);
    tools.push({ number: toolNo, type: toolDesc, diameter_mm: diameter, description: `${toolDesc} Ø${diameter}mm` });

    lines.push("G43 H" + toolNo + " Z50.");
    lines.push(`M3 S${sf.rpm}`);
    lines.push(`G0 X0. Y0.`);

    const depth = feat.dimensions?.["depth_mm"] ?? feat.dimensions?.["length_mm"] ?? 10;
    const width = feat.dimensions?.["width_mm"] ?? diameter;
    const len   = feat.dimensions?.["length_mm"] ?? feat.dimensions?.["width_mm"] ?? 50;

    switch (featType) {
      case "pocket":
        lines.push(`G0 Z5.`);
        lines.push(`G1 Z-${sf.doc_mm} F${Math.round(sf.feed_mmmin * 0.3)}`);
        for (let z = sf.doc_mm; z <= depth; z += sf.doc_mm) {
          lines.push(`G1 Z-${z.toFixed(3)} F${Math.round(sf.feed_mmmin * 0.3)}`);
          lines.push(`G1 X${(len / 2).toFixed(3)} F${sf.feed_mmmin}`);
          lines.push(`G1 Y${(width / 2).toFixed(3)}`);
          lines.push(`G1 X-${(len / 2).toFixed(3)}`);
          lines.push(`G1 Y-${(width / 2).toFixed(3)}`);
        }
        lines.push("G0 Z50.");
        break;

      case "hole":
      case "drill": {
        const peckDepth = Math.min(3 * diameter, depth);
        lines.push(`G0 Z5.`);
        lines.push(`G98 G83 Z-${depth.toFixed(3)} R2. Q${peckDepth.toFixed(3)} F${Math.round(sf.feed_mmmin * 0.15)}`);
        lines.push("G80");
        break;
      }

      case "slot":
        lines.push(`G0 Z5.`);
        lines.push(`G1 Z-${depth.toFixed(3)} F${Math.round(sf.feed_mmmin * 0.3)}`);
        lines.push(`G1 X${(len / 2).toFixed(3)} F${sf.feed_mmmin}`);
        lines.push(`G1 X-${(len / 2).toFixed(3)}`);
        lines.push("G0 Z50.");
        break;

      case "thread": {
        const threadPitch = feat.thread_spec?.match(/[×xX](\d+(?:\.\d+)?)/) ?
          parseFloat(feat.thread_spec.match(/[×xX](\d+(?:\.\d+)?)/)![1]) : 1.5;
        lines.push(`G0 Z5.`);
        lines.push(`G98 G84 Z-${depth.toFixed(3)} R2. F${Math.round(sf.rpm * threadPitch)}`);
        lines.push("G80");
        break;
      }

      case "face":
        lines.push(`G0 Z2.`);
        lines.push(`G1 Z0.2 F${Math.round(sf.feed_mmmin * 0.2)}`);
        lines.push(`G1 Z0. F${Math.round(sf.feed_mmmin * 0.1)}`);
        lines.push(`G1 X${(len + 10).toFixed(3)} F${Math.round(sf.feed_mmmin * 0.8)}`);
        lines.push("G0 Z50.");
        break;

      default:
        warnings.push(`Feature type "${featType}" generated as contour pass`);
        lines.push(`G0 Z5.`);
        lines.push(`G1 Z-${depth.toFixed(3)} F${Math.round(sf.feed_mmmin * 0.3)}`);
        lines.push(`G41 G1 X${(len / 2).toFixed(3)} D${toolNo} F${sf.feed_mmmin}`);
        lines.push(`G1 Y${(width / 2).toFixed(3)}`);
        lines.push(`G1 X-${(len / 2).toFixed(3)}`);
        lines.push(`G1 Y-${(width / 2).toFixed(3)}`);
        lines.push("G40 G0 Z50.");
    }

    const coolant = shared.coolant ?? "flood";
    if (coolant === "flood")  lines.push("M8");
    else if (coolant === "mist") lines.push("M7");

    lines.push("M9");
    lines.push(`M5`);
    lines.push(`G0 Z100.`);
    toolNo++;
  }

  lines.push("G28 G91 Z0.");
  lines.push("G90");
  lines.push("M30");
  lines.push("%");

  return { gcode: lines.join("\n"), tools, warnings };
}

// ── BatchCAMEngine ────────────────────────────────────────────────────────────

export class BatchCAMEngine {
  readonly name    = "BatchCAMEngine";
  readonly version = "1.0.0";

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate G-code programs for an array of parts.
   */
  async batchGenerate(parts: BatchPart[], options: BatchOptions = {}): Promise<PartResult[]> {
    log.debug(`[BatchCAMEngine] batchGenerate: ${parts.length} parts`);
    const shared    = options.shared ?? {};
    const onError   = options.on_error ?? "skip";
    const results: PartResult[] = [];

    for (const part of parts) {
      try {
        const result = this._generateOne(part, shared);
        results.push(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log.debug(`[BatchCAMEngine] error on part ${part.part_id}: ${msg}`);
        results.push({
          part_id:  part.part_id,
          success:  false,
          warnings: [],
          errors:   [msg],
        });
        if (onError === "abort") break;
      }
    }

    return results;
  }

  /**
   * Batch with shared machine/material config overriding per-part settings.
   */
  async batchWithSharedSetup(parts: BatchPart[], shared_config: SharedConfig): Promise<PartResult[]> {
    return this.batchGenerate(parts, { shared: shared_config });
  }

  /**
   * Parallel generation with configurable concurrency.
   */
  async parallelGenerate(parts: BatchPart[], concurrency = 4): Promise<PartResult[]> {
    log.debug(`[BatchCAMEngine] parallelGenerate: ${parts.length} parts @ concurrency=${concurrency}`);
    const results: PartResult[] = new Array(parts.length);
    const chunks: BatchPart[][] = [];

    for (let i = 0; i < parts.length; i += concurrency) {
      chunks.push(parts.slice(i, i + concurrency));
    }

    let offset = 0;
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(p =>
          Promise.resolve().then(() => this._generateOne(p, {}))
            .catch((err: unknown): PartResult => ({
              part_id:  p.part_id,
              success:  false,
              warnings: [],
              errors:   [err instanceof Error ? err.message : String(err)],
            }))
        )
      );
      for (let j = 0; j < chunkResults.length; j++) {
        results[offset + j] = chunkResults[j];
      }
      offset += chunk.length;
    }

    return results;
  }

  /**
   * Aggregate statistics across a batch of results.
   */
  summarizeBatch(results: PartResult[]): BatchSummary {
    const successful = results.filter(r => r.success);
    const failed     = results.filter(r => !r.success);

    const totalCycle = successful.reduce((s, r) => s + (r.cycle_time_s ?? 0), 0);
    const totalCost  = successful.reduce((s, r) => s + (r.cost_usd ?? 0), 0);

    // Unique tools across all parts
    const toolMap = new Map<string, ToolUsed>();
    for (const r of successful) {
      for (const t of r.tools ?? []) {
        const key = `${t.type}_${t.diameter_mm}`;
        if (!toolMap.has(key)) toolMap.set(key, t);
      }
    }

    const warnings = results.flatMap(r => r.warnings);

    return {
      total_parts:        results.length,
      successful_parts:   successful.length,
      failed_parts:       failed.length,
      total_cycle_time_s: totalCycle,
      unique_tools:       Array.from(toolMap.values()),
      total_cost_usd:     Math.round(totalCost * 100) / 100,
      warnings:           [...new Set(warnings)],
      material_groups:    {},   // filled by optimizeBatchOrder
      setup_changes:      0,
    };
  }

  /**
   * Sort parts to minimize material and tool changes between setups.
   * Strategy:
   *   1. Group by material (minimize material changes)
   *   2. Within group, sort by dominant tool diameter (minimize tool changes)
   */
  optimizeBatchOrder(parts: BatchPart[]): BatchPart[] {
    // Build material groups
    const groups = new Map<string, BatchPart[]>();
    for (const p of parts) {
      const mat = p.material ?? "unknown";
      const grp = resolveGroup(mat);
      if (!groups.has(grp)) groups.set(grp, []);
      groups.get(grp)!.push(p);
    }

    // Within each group, sort by dominant tool diameter descending (rough-first)
    const sortedGroups = Array.from(groups.values()).map(grp =>
      grp.sort((a, b) => {
        const getDia = (p: BatchPart) =>
          p.features.reduce((max, f) => Math.max(max, f.dimensions?.["diameter_mm"] ?? 0), 0);
        return getDia(b) - getDia(a);
      })
    );

    // Order groups by frequency (largest group first = fewer changeovers)
    sortedGroups.sort((a, b) => b.length - a.length);

    return sortedGroups.flat();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private _generateOne(part: BatchPart, shared: SharedConfig): PartResult {
    if (!part.part_id) throw new Error("part_id is required");
    if (!part.features || part.features.length === 0) {
      return {
        part_id: part.part_id,
        success: false,
        warnings: [],
        errors: ["No features defined for part"],
      };
    }

    const mat  = shared.material ?? part.material ?? "steel";
    const { gcode, tools, warnings } = generateGCode(part, shared);
    const cycle_s = estimateCycleTime(gcode);
    const cost    = estimateCost(cycle_s, mat);

    return {
      part_id:       part.part_id,
      success:       true,
      gcode,
      cycle_time_s:  cycle_s,
      tools,
      warnings,
      errors:        [],
      cost_usd:      cost,
    };
  }
}

export const batchCAMEngine = new BatchCAMEngine();
