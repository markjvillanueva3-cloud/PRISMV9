/**
 * IGESImportEngine — IGES 5.3 File Format Import
 *
 * Parses IGES (Initial Graphics Exchange Specification) files with 80-char
 * fixed-width records. Supports sections: Start (S), Global (G), Directory
 * Entry (D), Parameter Data (P), Terminate (T).
 *
 * Entity types: 100 (circular arc), 102 (composite curve), 104 (conic arc),
 * 106 (copious data/polyline), 108 (plane), 110 (line), 112 (parametric spline),
 * 116 (point), 120 (surface of revolution), 124 (transformation matrix),
 * 126 (rational B-spline curve), 128 (rational B-spline surface),
 * 142 (curve on surface), 144 (trimmed surface).
 *
 * Actions: iges_parse, iges_extract_geometry, iges_summary
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IGESPoint { x: number; y: number; z: number; }

export interface IGESEntity {
  type: number;
  type_name: string;
  params: number[];
  layer?: number;
  sequence_number?: number;
  status?: string;
  parameter_pointer?: number;
}

export interface IGESGlobal {
  units: string;
  scale: number;
  author?: string;
  filename?: string;
  separator?: string;
  record_delimiter?: string;
  max_line_weight?: number;
  max_coordinate?: number;
}

export interface IGESSummary {
  total_entities: number;
  by_type: Record<string, number>;
}

export interface IGESParseResult {
  entities: IGESEntity[];
  global: IGESGlobal;
  summary: IGESSummary;
}

export interface IGESGeometryResult {
  points: IGESPoint[];
  lines: Array<{ start: IGESPoint; end: IGESPoint }>;
  arcs: Array<{ center: IGESPoint; radius: number; start_angle: number; end_angle: number }>;
  surfaces: Array<{ type: string; params: any }>;
}

export interface IGESSummaryResult {
  total_entities: number;
  by_type: Record<string, number>;
  units: string;
  bounding_box: { min: IGESPoint; max: IGESPoint } | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENTITY_TYPE_NAMES: Record<number, string> = {
  100: "circular_arc",
  102: "composite_curve",
  104: "conic_arc",
  106: "copious_data",
  108: "plane",
  110: "line",
  112: "parametric_spline",
  116: "point",
  120: "surface_of_revolution",
  124: "transformation_matrix",
  126: "rational_bspline_curve",
  128: "rational_bspline_surface",
  142: "curve_on_surface",
  144: "trimmed_surface",
};

const IGES_UNIT_CODES: Record<number, string> = {
  1: "inch",
  2: "mm",
  3: "ft",
  4: "mile",
  5: "m",
  6: "km",
  7: "mil",
  8: "micron",
  9: "cm",
  10: "microinch",
  11: "unknown",
};

// ============================================================================
// ENGINE
// ============================================================================

export class IGESImportEngine {

  // --------------------------------------------------------------------------
  // parseIGES — full parse of IGES content
  // --------------------------------------------------------------------------
  parseIGES(input: { content: string }): IGESParseResult {
    const { content } = input;
    if (!content || content.trim().length === 0) {
      return {
        entities: [],
        global: { units: "mm", scale: 1.0 },
        summary: { total_entities: 0, by_type: {} },
      };
    }

    const lines = content.split(/\r?\n/).filter(l => l.length > 0);

    // Classify lines by section (column 73 character)
    const startLines: string[] = [];
    const globalLines: string[] = [];
    const directoryLines: string[] = [];
    const parameterLines: string[] = [];

    for (const line of lines) {
      // IGES lines are 80 chars; section code is at column 73 (0-indexed=72)
      const padded = line.padEnd(80);
      const sectionChar = padded[72];
      switch (sectionChar) {
        case "S": startLines.push(padded); break;
        case "G": globalLines.push(padded); break;
        case "D": directoryLines.push(padded); break;
        case "P": parameterLines.push(padded); break;
        case "T": break; // terminate
        default: break;
      }
    }

    // Parse Global section
    const global = this._parseGlobal(globalLines);

    // Parse Directory Entry section (2 lines per entity)
    const entities: IGESEntity[] = [];
    for (let i = 0; i + 1 < directoryLines.length; i += 2) {
      const entity = this._parseDirectoryEntry(directoryLines[i], directoryLines[i + 1]);
      if (entity) entities.push(entity);
    }

    // Parse Parameter Data section — group by directory entity pointer
    const paramDataMap = this._buildParameterDataMap(parameterLines, global.separator || ",", global.record_delimiter || ";");

    // Assign parsed parameters to entities
    // paramDataMap is keyed by D-section sequence number (from P-section cols 65-72)
    for (const entity of entities) {
      const seqNum = entity.sequence_number;
      if (seqNum !== undefined && paramDataMap.has(seqNum)) {
        const rawParams = paramDataMap.get(seqNum)!;
        entity.params = this._parseEntityParams(entity.type, rawParams);
      }
    }

    // Build summary
    const by_type: Record<string, number> = {};
    for (const e of entities) {
      const name = e.type_name || `type_${e.type}`;
      by_type[name] = (by_type[name] || 0) + 1;
    }

    return {
      entities,
      global,
      summary: { total_entities: entities.length, by_type },
    };
  }

  // --------------------------------------------------------------------------
  // extractGeometry — higher-level geometry extraction with optional filter
  // --------------------------------------------------------------------------
  extractGeometry(input: { content: string; filter?: { types?: string[]; layers?: number[] } }): IGESGeometryResult {
    const parsed = this.parseIGES({ content: input.content });
    let entities = parsed.entities;

    // Apply filters
    if (input.filter?.types && input.filter.types.length > 0) {
      const typeSet = new Set(input.filter.types.map(t => t.toLowerCase()));
      entities = entities.filter(e => typeSet.has(e.type_name.toLowerCase()));
    }
    if (input.filter?.layers && input.filter.layers.length > 0) {
      const layerSet = new Set(input.filter.layers);
      entities = entities.filter(e => e.layer !== undefined && layerSet.has(e.layer));
    }

    const points: IGESPoint[] = [];
    const lineSegs: Array<{ start: IGESPoint; end: IGESPoint }> = [];
    const arcs: Array<{ center: IGESPoint; radius: number; start_angle: number; end_angle: number }> = [];
    const surfaces: Array<{ type: string; params: any }> = [];

    for (const entity of entities) {
      switch (entity.type) {
        case 116: { // Point
          const p = entity.params;
          if (p.length >= 3) {
            points.push({ x: p[0], y: p[1], z: p[2] });
          }
          break;
        }
        case 110: { // Line
          const p = entity.params;
          if (p.length >= 6) {
            lineSegs.push({
              start: { x: p[0], y: p[1], z: p[2] },
              end: { x: p[3], y: p[4], z: p[5] },
            });
          }
          break;
        }
        case 100: { // Circular Arc
          const p = entity.params;
          if (p.length >= 6) {
            const zt = p[0]; // Z displacement
            const cx = p[1], cy = p[2];
            const x1 = p[3], y1 = p[4];
            const x2 = p[5], y2 = p.length > 6 ? p[6] : y1;
            const radius = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);
            const start_angle = Math.atan2(y1 - cy, x1 - cx);
            const end_angle = Math.atan2(y2 - cy, x2 - cx);
            arcs.push({
              center: { x: cx, y: cy, z: zt },
              radius,
              start_angle,
              end_angle,
            });
          }
          break;
        }
        case 120: // Surface of revolution
        case 128: // Rational B-spline surface
        case 144: // Trimmed surface
          surfaces.push({ type: entity.type_name, params: entity.params });
          break;
        case 126: // Rational B-spline curve — extract control points as points
        {
          // B-spline curve params: K, M, PROP1-4, knots..., weights..., control points x,y,z
          // We just store raw params for now
          break;
        }
        default:
          break;
      }
    }

    return { points, lines: lineSegs, arcs, surfaces };
  }

  // --------------------------------------------------------------------------
  // getSummary — quick file analysis without full entity param parsing
  // --------------------------------------------------------------------------
  getSummary(input: { content: string }): IGESSummaryResult {
    const { content } = input;
    if (!content || content.trim().length === 0) {
      return { total_entities: 0, by_type: {}, units: "unknown", bounding_box: null };
    }

    const lines = content.split(/\r?\n/).filter(l => l.length > 0);

    const globalLines: string[] = [];
    const directoryLines: string[] = [];

    for (const line of lines) {
      const padded = line.padEnd(80);
      const sc = padded[72];
      if (sc === "G") globalLines.push(padded);
      else if (sc === "D") directoryLines.push(padded);
    }

    const global = this._parseGlobal(globalLines);

    // Quick entity type scan from D-section (only first line of each pair has entity type)
    const by_type: Record<string, number> = {};
    let total = 0;
    for (let i = 0; i < directoryLines.length; i += 2) {
      const entityType = parseInt(directoryLines[i].substring(0, 8).trim(), 10);
      if (!isNaN(entityType)) {
        const name = ENTITY_TYPE_NAMES[entityType] || `type_${entityType}`;
        by_type[name] = (by_type[name] || 0) + 1;
        total++;
      }
    }

    // Bounding box estimate from line/point entities in D-section
    // (Full bounding box requires parameter parsing; return null for quick summary)
    let bounding_box: { min: IGESPoint; max: IGESPoint } | null = null;

    // If we have few entities, do a quick parse for bounding box
    if (total <= 500) {
      const parsed = this.parseIGES({ content });
      const allPoints: IGESPoint[] = [];
      for (const e of parsed.entities) {
        if (e.type === 116 && e.params.length >= 3) {
          allPoints.push({ x: e.params[0], y: e.params[1], z: e.params[2] });
        } else if (e.type === 110 && e.params.length >= 6) {
          allPoints.push({ x: e.params[0], y: e.params[1], z: e.params[2] });
          allPoints.push({ x: e.params[3], y: e.params[4], z: e.params[5] });
        } else if (e.type === 100 && e.params.length >= 5) {
          // Arc: center ± radius
          const cx = e.params[1], cy = e.params[2], zt = e.params[0];
          const x1 = e.params[3], y1 = e.params[4];
          const r = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);
          allPoints.push({ x: cx - r, y: cy - r, z: zt });
          allPoints.push({ x: cx + r, y: cy + r, z: zt });
        }
      }
      if (allPoints.length > 0) {
        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const p of allPoints) {
          min.x = Math.min(min.x, p.x); min.y = Math.min(min.y, p.y); min.z = Math.min(min.z, p.z);
          max.x = Math.max(max.x, p.x); max.y = Math.max(max.y, p.y); max.z = Math.max(max.z, p.z);
        }
        bounding_box = { min, max };
      }
    }

    return {
      total_entities: total,
      by_type,
      units: global.units,
      bounding_box,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private _parseGlobal(globalLines: string[]): IGESGlobal {
    // Concatenate global section data (columns 1-72)
    const rawData = globalLines.map(l => l.substring(0, 72)).join("");

    // Global section is comma-separated with semicolon record delimiter
    // First two fields are the separators themselves
    let separator = ",";
    let record_delimiter = ";";

    // Parse: field 1 = param separator, field 2 = record delimiter
    // Format: "1H,1H;" or explicit
    const fields = this._splitGlobalFields(rawData, separator, record_delimiter);

    const result: IGESGlobal = {
      units: "mm",
      scale: 1.0,
      separator,
      record_delimiter,
    };

    // Field indices (1-based in spec, 0-based here):
    // 3: sender product ID (filename)
    // 5: sender system
    // 7: IGES version
    // 13: model space scale
    // 14: unit flag
    // 15: unit name
    // 18: author
    // 25: max coordinate

    if (fields.length > 2) result.filename = this._stripHollerith(fields[2]);
    if (fields.length > 12) {
      const scale = parseFloat(fields[12]);
      if (!isNaN(scale) && scale > 0) result.scale = scale;
    }
    if (fields.length > 13) {
      const unitCode = parseInt(fields[13], 10);
      if (!isNaN(unitCode) && IGES_UNIT_CODES[unitCode]) {
        result.units = IGES_UNIT_CODES[unitCode];
      }
    }
    if (fields.length > 14) {
      const unitStr = this._stripHollerith(fields[14]);
      if (unitStr && !result.units) result.units = unitStr;
    }
    if (fields.length > 17) result.author = this._stripHollerith(fields[17]);
    if (fields.length > 24) {
      const mc = parseFloat(fields[24]);
      if (!isNaN(mc)) result.max_coordinate = mc;
    }

    return result;
  }

  private _splitGlobalFields(rawData: string, sep: string, delim: string): string[] {
    // Split on separator, respecting Hollerith strings (nH...)
    const fields: string[] = [];
    let current = "";
    let i = 0;

    while (i < rawData.length) {
      const c = rawData[i];

      if (c === delim) {
        fields.push(current.trim());
        current = "";
        break; // End of global record
      }

      // Check for Hollerith string: digits followed by 'H'
      const holMatch = rawData.substring(i).match(/^(\d+)H/);
      if (holMatch) {
        const len = parseInt(holMatch[1], 10);
        const hStart = i + holMatch[0].length;
        const holStr = rawData.substring(hStart, hStart + len);
        current += holMatch[0] + holStr;
        i = hStart + len;
        continue;
      }

      if (c === sep) {
        fields.push(current.trim());
        current = "";
        i++;
        continue;
      }

      current += c;
      i++;
    }

    if (current.trim().length > 0) {
      fields.push(current.trim());
    }

    return fields;
  }

  private _stripHollerith(s: string): string {
    if (!s) return "";
    // Match nHxxxx pattern
    const m = s.match(/^\d+H(.*)$/);
    return m ? m[1] : s.trim();
  }

  private _parseDirectoryEntry(line1: string, line2: string): IGESEntity | null {
    // D-section line 1 (fields at fixed columns):
    // Cols  1-8:  Entity type
    // Cols  9-16: Parameter data pointer
    // Cols 17-24: Structure
    // Cols 25-32: Line font pattern
    // Cols 33-40: Level (layer)
    // Cols 41-48: View
    // Cols 49-56: Transformation matrix
    // Cols 57-64: Label display
    // Cols 65-72: Status number
    // Col  73:    'D'
    // Cols 74-80: Sequence number

    // D-section line 2:
    // Cols  1-8:  Entity type (repeated)
    // Cols  9-16: Line weight
    // Cols 17-24: Color number
    // Cols 25-32: Parameter line count
    // Cols 33-40: Form number
    // Cols 41-56: Reserved
    // Cols 57-64: Entity label
    // Cols 65-72: Entity subscript
    // Col  73:    'D'
    // Cols 74-80: Sequence number

    const entityType = parseInt(line1.substring(0, 8).trim(), 10);
    if (isNaN(entityType)) return null;

    const paramPointer = parseInt(line1.substring(8, 16).trim(), 10);
    const levelStr = line1.substring(32, 40).trim();
    const layer = parseInt(levelStr, 10);
    const statusStr = line1.substring(64, 72).trim();
    const seqNum1 = parseInt(line1.substring(73, 80).trim(), 10);

    return {
      type: entityType,
      type_name: ENTITY_TYPE_NAMES[entityType] || `type_${entityType}`,
      params: [],
      layer: isNaN(layer) ? undefined : layer,
      sequence_number: isNaN(seqNum1) ? undefined : seqNum1,
      status: statusStr || undefined,
      parameter_pointer: isNaN(paramPointer) ? undefined : paramPointer,
    };
  }

  private _buildParameterDataMap(paramLines: string[], sep: string, delim: string): Map<number, string[]> {
    // P-section: cols 1-64 = data, cols 65-72 = directory entry pointer, col 73 = 'P', cols 74-80 = seq
    const grouped = new Map<number, string>();

    for (const line of paramLines) {
      const padded = line.padEnd(80);
      const data = padded.substring(0, 64).trim();
      const dePointer = parseInt(padded.substring(64, 72).trim(), 10);

      if (!isNaN(dePointer)) {
        const existing = grouped.get(dePointer) || "";
        grouped.set(dePointer, existing + data);
      }
    }

    const result = new Map<number, string[]>();
    for (const [ptr, raw] of grouped) {
      // Remove trailing record delimiter
      let cleaned = raw;
      if (cleaned.endsWith(delim)) {
        cleaned = cleaned.slice(0, -1);
      }
      // Split by separator, skip the first field (entity type number)
      const parts = cleaned.split(sep);
      // First element is the entity type code — skip it
      const dataFields = parts.slice(1).map(f => f.trim());
      result.set(ptr, dataFields);
    }

    return result;
  }

  private _parseEntityParams(entityType: number, rawFields: string[]): number[] {
    // Convert string fields to numbers where possible
    const nums: number[] = [];
    for (const f of rawFields) {
      if (f === "") continue;
      // Handle IGES 'D' exponent notation (e.g., "1.5D+02" → "1.5E+02")
      const cleaned = f.replace(/[dD]([+-]?\d)/, "E$1");
      const val = parseFloat(cleaned);
      if (!isNaN(val)) {
        nums.push(val);
      }
    }
    return nums;
  }
}

// Singleton export
export const igesImportEngine = new IGESImportEngine();
