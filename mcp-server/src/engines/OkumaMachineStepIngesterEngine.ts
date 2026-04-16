/**
 * OkumaMachineStepIngesterEngine (E097)
 * ========================================
 *
 * Parses STEP AP203/AP214 neutral CAD files to extract axis geometries
 * from Okuma machine models (LB3000, LU300, Multus B250/B300 families).
 *
 * STEP file structure (ISO 10303-21):
 *   HEADER + DATA section. Each DATA entity is #N = TYPE_NAME(args);
 *   We extract CARTESIAN_POINT, DIRECTION, AXIS2_PLACEMENT_3D, PRODUCT
 *   and infer kinematic axis locations from named entities.
 *
 * This engine is a focused STEP parser — it does NOT build full kinematic
 * chains. Downstream kinematic engines consume the returned axis frames.
 *
 * @module engines/OkumaMachineStepIngesterEngine
 * @milestone LATHE-AWARE-HARDEN MS3 (U-LAT27)
 */

import * as fs from "fs";
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CartesianPoint {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface Direction {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface AxisPlacement {
  id: number;
  name: string;
  origin: CartesianPoint;
  axis?: Direction;
  ref_direction?: Direction;
}

export interface DetectedAxis {
  axis_letter: string; // "X" | "Y" | "Z" | "A" | "B" | "C"
  frame_id: number;
  frame_name?: string;
  origin_mm: { x: number; y: number; z: number };
  direction?: { x: number; y: number; z: number };
  inferred_from: "name" | "position" | "context";
}

export interface StepParseResult {
  source: string;
  iso_schema?: string;
  header_description?: string[];
  cartesian_points: number;
  directions: number;
  axis_placements: AxisPlacement[];
  detected_axes: DetectedAxis[];
  product_names: string[];
  entity_count: number;
  parse_warnings: string[];
  generated_at: string;
}

// ── STEP Parsers ───────────────────────────────────────────────────────────

const ENTITY_RE = /^#(\d+)\s*=\s*([A-Z_]+)\s*\((.*)\);/i;
const POINT_RE = /CARTESIAN_POINT\s*\(\s*'([^']*)'\s*,\s*\(\s*([-0-9.E+, ]+)\s*\)\s*\)/i;
const DIRECTION_RE = /DIRECTION\s*\(\s*'([^']*)'\s*,\s*\(\s*([-0-9.E+, ]+)\s*\)\s*\)/i;
const AXIS2_RE = /AXIS2_PLACEMENT_3D\s*\(\s*'([^']*)'\s*,\s*#(\d+)\s*,?\s*#?(\d+)?\s*,?\s*#?(\d+)?\s*\)/i;

function parseNumTriple(s: string): [number, number, number] | null {
  const parts = s.split(",").map((p) => parseFloat(p.trim()));
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
  return [parts[0]!, parts[1]!, parts[2]!];
}

function inferAxisLetter(name: string): string | null {
  const upper = name.toUpperCase();
  const match = upper.match(/\b([XYZABC])_?AXIS\b/);
  if (match) return match[1]!;
  if (/TAILSTOCK/.test(upper)) return "Z";
  if (/SPINDLE/.test(upper)) return "C";
  if (/TURRET/.test(upper)) return "X";
  return null;
}

// ── Engine Implementation ──────────────────────────────────────────────────

class OkumaMachineStepIngesterEngineImpl {
  /**
   * Parse STEP content (string form).
   */
  parseContent(content: string, sourceName = "in-memory"): StepParseResult {
    const points = new Map<number, CartesianPoint>();
    const dirs = new Map<number, Direction>();
    const placements: AxisPlacement[] = [];
    const productNames = new Set<string>();
    const warnings: string[] = [];
    let isoSchema: string | undefined;
    const headerLines: string[] = [];
    let entityCount = 0;

    // HEADER section
    const headerMatch = content.match(/HEADER;([\s\S]*?)ENDSEC;/i);
    if (headerMatch) {
      const hdr = headerMatch[1]!;
      const descMatch = hdr.match(/FILE_DESCRIPTION\s*\(\s*\(([^)]*)\)/i);
      if (descMatch) {
        const descriptions = descMatch[1]!
          .split(",")
          .map((s) => s.replace(/['"]/g, "").trim())
          .filter((s) => s.length > 0);
        headerLines.push(...descriptions);
      }
      const schemaMatch = hdr.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'\s*\)/i);
      if (schemaMatch) isoSchema = schemaMatch[1];
    }

    // DATA section
    const dataMatch = content.match(/DATA;([\s\S]*?)ENDSEC;/i);
    const body = dataMatch ? dataMatch[1]! : content;

    const lines = body.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith("/*") || line.startsWith("*")) continue;
      const m = line.match(ENTITY_RE);
      if (!m) continue;
      entityCount++;
      const id = parseInt(m[1]!, 10);
      const type = m[2]!.toUpperCase();
      const entityBody = m[3]!;

      if (type === "CARTESIAN_POINT") {
        const pm = line.match(POINT_RE);
        if (pm) {
          const trip = parseNumTriple(pm[2]!);
          if (trip) {
            points.set(id, { id, x: trip[0], y: trip[1], z: trip[2] });
          } else {
            warnings.push(`Point #${id}: couldn't parse coordinates`);
          }
        }
      } else if (type === "DIRECTION") {
        const dm = line.match(DIRECTION_RE);
        if (dm) {
          const trip = parseNumTriple(dm[2]!);
          if (trip) {
            dirs.set(id, { id, x: trip[0], y: trip[1], z: trip[2] });
          }
        }
      } else if (type === "PRODUCT") {
        const pm = entityBody.match(/'([^']+)'/);
        if (pm) productNames.add(pm[1]!);
      }
    }

    // Second pass: resolve AXIS2_PLACEMENT_3D
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const am = line.match(AXIS2_RE);
      if (!am) continue;
      const idMatch = line.match(/^#(\d+)\s*=/);
      if (!idMatch) continue;
      const id = parseInt(idMatch[1]!, 10);
      const name = am[1]!;
      const originId = parseInt(am[2]!, 10);
      const origin = points.get(originId);
      if (!origin) {
        warnings.push(`AXIS2 #${id}: origin point #${originId} not found`);
        continue;
      }
      const axisId = am[3] ? parseInt(am[3], 10) : undefined;
      const refId = am[4] ? parseInt(am[4], 10) : undefined;
      placements.push({
        id,
        name,
        origin,
        axis: axisId ? dirs.get(axisId) : undefined,
        ref_direction: refId ? dirs.get(refId) : undefined,
      });
    }

    // Infer axes from placement names
    const detected: DetectedAxis[] = [];
    for (const p of placements) {
      const letter = inferAxisLetter(p.name);
      if (!letter) continue;
      detected.push({
        axis_letter: letter,
        frame_id: p.id,
        frame_name: p.name,
        origin_mm: { x: p.origin.x, y: p.origin.y, z: p.origin.z },
        direction: p.axis ? { x: p.axis.x, y: p.axis.y, z: p.axis.z } : undefined,
        inferred_from: "name",
      });
    }

    return {
      source: sourceName,
      iso_schema: isoSchema,
      header_description: headerLines,
      cartesian_points: points.size,
      directions: dirs.size,
      axis_placements: placements,
      detected_axes: detected,
      product_names: [...productNames],
      entity_count: entityCount,
      parse_warnings: warnings,
      generated_at: new Date().toISOString(),
    };
  }

  parseFile(filePath: string): StepParseResult {
    if (!fs.existsSync(filePath)) {
      log.warn(`[StepIngester] STEP file not found: ${filePath}`);
      return this.emptyResult(filePath, [`File not found: ${filePath}`]);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return this.parseContent(content, filePath);
  }

  private emptyResult(source: string, warnings: string[] = []): StepParseResult {
    return {
      source,
      cartesian_points: 0,
      directions: 0,
      axis_placements: [],
      detected_axes: [],
      product_names: [],
      entity_count: 0,
      parse_warnings: warnings,
      generated_at: new Date().toISOString(),
    };
  }

  getStats(): {
    supported_schemas: string[];
    recognized_entities: string[];
    axis_inference_rules: string[];
  } {
    return {
      supported_schemas: ["AP203", "AP214", "AP242"],
      recognized_entities: [
        "CARTESIAN_POINT",
        "DIRECTION",
        "AXIS2_PLACEMENT_3D",
        "PRODUCT",
      ],
      axis_inference_rules: [
        "X_AXIS / Y_AXIS / Z_AXIS named placements → axis letter",
        "A_AXIS / B_AXIS / C_AXIS named placements → rotary axis",
        "TAILSTOCK → Z",
        "SPINDLE → C",
        "TURRET → X",
      ],
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const okumaMachineStepIngesterEngine = new OkumaMachineStepIngesterEngineImpl();
export type { OkumaMachineStepIngesterEngineImpl };
