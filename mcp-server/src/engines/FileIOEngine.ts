/**
 * FileIOEngine — CAD File Import/Export
 *
 * L2-P0-MS1: Ported from monolith STEP/IGES/STL parsers.
 * Handles parsing and generation of common CAD interchange formats:
 *   - STEP (AP203/AP214) — full B-Rep entity graph
 *   - IGES — legacy curve/surface exchange
 *   - STL  — tessellated mesh (ASCII + binary)
 *   - DXF  — 2D/3D AutoCAD exchange
 *
 * Pure computation — no filesystem access. Operates on string/buffer input.
 */

// ── Types ─────────────────────────────────────────────────────────────

export type CADFormat = "step" | "iges" | "stl_ascii" | "stl_binary" | "dxf";

/** Vec3 configuration/data structure.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Triangle configuration/data structure.
 */
export interface Triangle {
  normal: Vec3;
  v1: Vec3;
  v2: Vec3;
  v3: Vec3;
}

/** Bounding Box configuration/data structure.
 */
export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

// ── STEP Types ────────────────────────────────────────────────────────

/** S T E P Entity Category type definition.
 */
export type STEPEntityCategory =
  | "geometry"
  | "surface"
  | "topology"
  | "placement"
  | "product"
  | "representation"
  | "unknown";

/** S T E P Entity configuration/data structure.
 */
export interface STEPEntity {
  id: number;
  type: string;
  args: any[];
  refs: number[];
  category: STEPEntityCategory;
}

/** S T E P Header configuration/data structure.
 */
export interface STEPHeader {
  file_name?: string;
  file_description?: string;
  schema: string[];
  author?: string;
  organization?: string;
  originating_system?: string;
  timestamp?: string;
}

/** S T E P Parse Result configuration/data structure.
 */
export interface STEPParseResult {
  format: "step";
  header: STEPHeader;
  entities: Map<number, STEPEntity>;
  entity_graph: Map<number, number[]>;
  reverse_graph: Map<number, number[]>;
  by_type: Map<string, STEPEntity[]>;
  root_entities: number[];
  statistics: {
    total_entities: number;
    by_category: Record<STEPEntityCategory, number>;
    entity_types: Record<string, number>;
  };
}

// ── IGES Types ────────────────────────────────────────────────────────

/** I G E S Entity Type type definition.
 */
export type IGESEntityType =
  | "circular_arc"
  | "composite_curve"
  | "conic_arc"
  | "line"
  | "parametric_spline_curve"
  | "rational_bspline_curve"
  | "plane"
  | "ruled_surface"
  | "surface_of_revolution"
  | "tabulated_cylinder"
  | "rational_bspline_surface"
  | "trimmed_surface"
  | "transformation_matrix"
  | "point"
  | "direction"
  | "color_definition"
  | "subfigure"
  | "unknown";

/** I G E S Entity configuration/data structure.
 */
export interface IGESEntity {
  id: number;
  entity_type: number;
  entity_type_name: IGESEntityType;
  form_number: number;
  color: number;
  line_weight: number;
  parameters: number[];
  label: string;
}

/** I G E S Parse Result configuration/data structure.
 */
export interface IGESParseResult {
  format: "iges";
  start_section: string[];
  global_section: {
    separator: string;
    record_delimiter: string;
    product_id: string;
    file_name: string;
    native_system: string;
    units: string;
    max_line_weight: number;
    max_resolution: number;
    model_space_scale: number;
    author: string;
    organization: string;
    iges_version: number;
    date: string;
  };
  entities: IGESEntity[];
  statistics: {
    total_entities: number;
    by_type: Record<string, number>;
  };
}

// ── STL Types ─────────────────────────────────────────────────────────

/** S T L Parse Result configuration/data structure.
 */
export interface STLParseResult {
  format: "stl_ascii" | "stl_binary";
  name: string;
  triangles: Triangle[];
  bounding_box: BoundingBox;
  statistics: {
    triangle_count: number;
    vertex_count: number;
    surface_area: number;
    volume: number;
    is_watertight: boolean;
    degenerate_triangles: number;
  };
}

// ── DXF Types ─────────────────────────────────────────────────────────

/** D X F Entity Type type definition.
 */
export type DXFEntityType = "LINE" | "CIRCLE" | "ARC" | "POLYLINE" | "LWPOLYLINE" | "SPLINE" | "POINT" | "TEXT" | "MTEXT" | "INSERT" | "DIMENSION" | "3DFACE" | "SOLID";

/** D X F Entity configuration/data structure.
 */
export interface DXFEntity {
  type: DXFEntityType;
  layer: string;
  color?: number;
  data: Record<string, any>;
}

/** D X F Layer configuration/data structure.
 */
export interface DXFLayer {
  name: string;
  color: number;
  line_type: string;
  frozen: boolean;
  locked: boolean;
  entity_count: number;
}

/** D X F Parse Result configuration/data structure.
 */
export interface DXFParseResult {
  format: "dxf";
  header: Record<string, string | number>;
  layers: DXFLayer[];
  entities: DXFEntity[];
  blocks: Array<{ name: string; entities: DXFEntity[] }>;
  statistics: {
    total_entities: number;
    total_layers: number;
    by_type: Record<string, number>;
    by_layer: Record<string, number>;
  };
}

/** Parse Result type definition.
 */
export type ParseResult = STEPParseResult | IGESParseResult | STLParseResult | DXFParseResult;

// ── STEP Entity Categories ────────────────────────────────────────────

const STEP_CATEGORIES: Record<string, STEPEntityCategory> = {};

const GEOMETRY_TYPES = [
  "CARTESIAN_POINT", "DIRECTION", "VECTOR", "LINE", "CIRCLE", "ELLIPSE",
  "HYPERBOLA", "PARABOLA", "PCURVE", "SURFACE_CURVE", "COMPOSITE_CURVE",
  "TRIMMED_CURVE", "B_SPLINE_CURVE", "B_SPLINE_CURVE_WITH_KNOTS",
  "RATIONAL_B_SPLINE_CURVE", "BEZIER_CURVE",
];
const SURFACE_TYPES = [
  "PLANE", "CYLINDRICAL_SURFACE", "CONICAL_SURFACE", "SPHERICAL_SURFACE",
  "TOROIDAL_SURFACE", "SURFACE_OF_REVOLUTION", "SURFACE_OF_LINEAR_EXTRUSION",
  "B_SPLINE_SURFACE", "B_SPLINE_SURFACE_WITH_KNOTS",
  "RATIONAL_B_SPLINE_SURFACE", "BEZIER_SURFACE", "RECTANGULAR_TRIMMED_SURFACE",
  "CURVE_BOUNDED_SURFACE", "OFFSET_SURFACE",
];
const TOPOLOGY_TYPES = [
  "VERTEX_POINT", "VERTEX_LOOP", "EDGE_CURVE", "ORIENTED_EDGE",
  "EDGE_LOOP", "FACE_BOUND", "FACE_OUTER_BOUND", "ADVANCED_FACE",
  "FACE_SURFACE", "CLOSED_SHELL", "OPEN_SHELL", "ORIENTED_CLOSED_SHELL",
  "CONNECTED_FACE_SET", "MANIFOLD_SOLID_BREP", "BREP_WITH_VOIDS",
  "FACETED_BREP", "SHELL_BASED_SURFACE_MODEL",
];
const PLACEMENT_TYPES = [
  "AXIS1_PLACEMENT", "AXIS2_PLACEMENT_2D", "AXIS2_PLACEMENT_3D",
  "CARTESIAN_TRANSFORMATION_OPERATOR", "CARTESIAN_TRANSFORMATION_OPERATOR_3D",
];
const PRODUCT_TYPES = [
  "PRODUCT", "PRODUCT_DEFINITION", "PRODUCT_DEFINITION_FORMATION",
  "PRODUCT_DEFINITION_SHAPE", "SHAPE_DEFINITION_REPRESENTATION",
  "SHAPE_REPRESENTATION", "ADVANCED_BREP_SHAPE_REPRESENTATION",
];

for (const t of GEOMETRY_TYPES) STEP_CATEGORIES[t] = "geometry";
for (const t of SURFACE_TYPES) STEP_CATEGORIES[t] = "surface";
for (const t of TOPOLOGY_TYPES) STEP_CATEGORIES[t] = "topology";
for (const t of PLACEMENT_TYPES) STEP_CATEGORIES[t] = "placement";
for (const t of PRODUCT_TYPES) STEP_CATEGORIES[t] = "product";

// ── IGES Entity Type Map ──────────────────────────────────────────────

const IGES_TYPE_MAP: Record<number, IGESEntityType> = {
  100: "circular_arc",
  102: "composite_curve",
  104: "conic_arc",
  110: "line",
  112: "parametric_spline_curve",
  126: "rational_bspline_curve",
  108: "plane",
  118: "ruled_surface",
  120: "surface_of_revolution",
  122: "tabulated_cylinder",
  128: "rational_bspline_surface",
  144: "trimmed_surface",
  124: "transformation_matrix",
  116: "point",
  123: "direction",
  314: "color_definition",
  308: "subfigure",
};

// ── Engine ────────────────────────────────────────────────────────────

/** File I O Engine engine/manager.
 */
export class FileIOEngine {
  /** Detect file format from content */
  detectFormat(content: string): CADFormat | null {
    const trimmed = content.trimStart();
    if (trimmed.startsWith("ISO-10303-21;") || trimmed.startsWith("STEP;")) return "step";
    if (/^\s*solid\s/i.test(trimmed) && /endsolid/i.test(content)) return "stl_ascii";
    if (trimmed.startsWith("0\nSECTION") || trimmed.startsWith("999\n")) return "dxf";
    if (/^\s{0,72}[SG]\s*\d+$/m.test(trimmed.substring(0, 200))) return "iges";
    return null;
  }

  /** Parse any supported CAD file */
  parse(content: string, format?: CADFormat): ParseResult {
    const fmt = format ?? this.detectFormat(content);
    if (!fmt) throw new Error("Cannot detect file format. Specify format explicitly.");

    /** Switch.
     * @param fmt - fmt
     * @returns void
     */
    switch (fmt) {
      case "step": return this.parseSTEP(content);
      case "iges": return this.parseIGES(content);
      case "stl_ascii": return this.parseSTLAscii(content);
      case "dxf": return this.parseDXF(content);
      default: throw new Error(`Unsupported format: ${fmt}`);
    }
  }

  // ── STEP Parser ───────────────────────────────────────────────────

  /** Parse STEP AP203/AP214 file into entity graph */
  parseSTEP(content: string): STEPParseResult {
    const header = this.parseSTEPHeader(content);
    const entities = new Map<number, STEPEntity>();
    const entityGraph = new Map<number, number[]>();
    const reverseGraph = new Map<number, number[]>();
    const byType = new Map<string, STEPEntity[]>();

    const dataMatch = content.match(/DATA;([\s\S]*?)ENDSEC;/i);
    if (!dataMatch) throw new Error("Invalid STEP file: DATA section not found");

    const entityPattern = /#(\d+)\s*=\s*([A-Z][A-Z0-9_]*)\s*\(([\s\S]*?)\)\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = entityPattern.exec(dataMatch[1])) !== null) {
      const id = parseInt(match[1], 10);
      const type = match[2];
      const args = this.parseSTEPArgs(match[3]);
      const refs = this.extractRefs(args);
      const category = STEP_CATEGORIES[type] ?? "unknown";

      const entity: STEPEntity = { id, type, args, refs, category };
      entities.set(id, entity);
      entityGraph.set(id, refs);

      /** For.
       * @param const - const
       * @returns void
       */
      for (const ref of refs) {
        if (!reverseGraph.has(ref)) reverseGraph.set(ref, []);
        reverseGraph.get(ref)!.push(id);
      }

      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(entity);
    }

    const rootTypes = new Set([
      "SHAPE_REPRESENTATION", "ADVANCED_BREP_SHAPE_REPRESENTATION",
      "MANIFOLD_SURFACE_SHAPE_REPRESENTATION",
    ]);
    const rootEntities: number[] = [];
    /** For.
     * @param const - const
     * @param entity] - entity]
     * @returns void
     */
    for (const [id, entity] of entities) {
      if (rootTypes.has(entity.type) && (!reverseGraph.has(id) || reverseGraph.get(id)!.length === 0)) {
        rootEntities.push(id);
      }
    }

    const byCategory: Record<string, number> = {};
    const entityTypes: Record<string, number> = {};
    for (const entity of entities.values()) {
      byCategory[entity.category] = (byCategory[entity.category] ?? 0) + 1;
      entityTypes[entity.type] = (entityTypes[entity.type] ?? 0) + 1;
    }

    return {
      format: "step",
      header,
      entities,
      entity_graph: entityGraph,
      reverse_graph: reverseGraph,
      by_type: byType,
      root_entities: rootEntities,
      statistics: {
        total_entities: entities.size,
        by_category: byCategory as Record<STEPEntityCategory, number>,
        entity_types: entityTypes,
      },
    };
  }

  private parseSTEPHeader(content: string): STEPHeader {
    const headerMatch = content.match(/HEADER;([\s\S]*?)ENDSEC;/i);
    const header: STEPHeader = { schema: [] };
    if (!headerMatch) return header;

    const h = headerMatch[1];
    const fnMatch = h.match(/FILE_NAME\s*\(\s*'([^']*)'/);
    if (fnMatch) header.file_name = fnMatch[1];

    const fdMatch = h.match(/FILE_DESCRIPTION\s*\(\s*\(\s*'([^']*)'/);
    if (fdMatch) header.file_description = fdMatch[1];

    const schemaMatch = h.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/);
    if (schemaMatch) header.schema = [schemaMatch[1]];

    const tsMatch = h.match(/'(\d{4}-\d{2}-\d{2}T[\d:]+)'/);
    if (tsMatch) header.timestamp = tsMatch[1];

    return header;
  }

  private parseSTEPArgs(raw: string): any[] {
    const args: any[] = [];
    let depth = 0;
    let current = "";
    let inString = false;

    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "'" && !inString) { inString = true; current += ch; continue; }
      if (ch === "'" && inString) { inString = false; current += ch; continue; }
      if (inString) { current += ch; continue; }

      /** If.
       * @param ch - ch
       * @returns void
       */
      if (ch === "(") {
        if (depth === 0) { current = ""; depth++; continue; }
        depth++;
        current += ch;
      } else if (ch === ")") {
        depth--;
        /** If.
         * @param depth - recursion or nesting depth
         * @returns void
         */
        if (depth === 0) {
          args.push(this.parseSTEPArgs(current));
          current = "";
        } else {
          current += ch;
        }
      } else if (ch === "," && depth === 0) {
        if (current.trim()) args.push(this.parseSTEPValue(current.trim()));
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) args.push(this.parseSTEPValue(current.trim()));
    return args;
  }

  private parseSTEPValue(val: string): any {
    if (val === "$") return null;
    if (val === "*") return undefined;
    if (val === ".T.") return true;
    if (val === ".F.") return false;
    if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
    if (val.startsWith("#")) return parseInt(val.slice(1), 10);
    if (val.startsWith(".") && val.endsWith(".")) return val.slice(1, -1);
    const num = Number(val);
    if (!isNaN(num)) return num;
    return val;
  }

  private extractRefs(args: any[]): number[] {
    const refs: number[] = [];
    const collectRefs = (arr: any[]) => {
      /** For.
       * @param const - const
       * @returns void
       */
      for (const item of arr) {
        if (typeof item === "number" && Number.isInteger(item) && item > 0) {
          refs.push(item);
        } else if (Array.isArray(item)) {
          collectRefs(item);
        }
      }
    };
    collectRefs(args);
    return [...new Set(refs)];
  }

  // ── STL Parser ────────────────────────────────────────────────────

  /** Parses s t l ascii.
   * @param content - content
   * @returns s t l parse result
   */
  parseSTLAscii(content: string): STLParseResult {
    const nameMatch = content.match(/solid\s+(.*?)$/m);
    const name = nameMatch?.[1]?.trim() ?? "unnamed";
    const triangles: Triangle[] = [];

    const facetPattern = /facet\s+normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+outer\s+loop\s+vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+endloop\s+endfacet/gi;
    let fmatch: RegExpExecArray | null;

    while ((fmatch = facetPattern.exec(content)) !== null) {
      triangles.push({
        normal: { x: parseFloat(fmatch[1]), y: parseFloat(fmatch[2]), z: parseFloat(fmatch[3]) },
        v1: { x: parseFloat(fmatch[4]), y: parseFloat(fmatch[5]), z: parseFloat(fmatch[6]) },
        v2: { x: parseFloat(fmatch[7]), y: parseFloat(fmatch[8]), z: parseFloat(fmatch[9]) },
        v3: { x: parseFloat(fmatch[10]), y: parseFloat(fmatch[11]), z: parseFloat(fmatch[12]) },
      });
    }

    return this.buildSTLResult(name, triangles, "stl_ascii");
  }

  private buildSTLResult(name: string, triangles: Triangle[], format: "stl_ascii" | "stl_binary"): STLParseResult {
    const bb: BoundingBox = {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
    };
    let surfaceArea = 0;
    let volumeSum = 0;
    let degenerate = 0;
    const vertexSet = new Set<string>();

    /** For.
     * @param const - const
     * @returns void
     */
    for (const tri of triangles) {
      /** For.
       * @param const - const
       * @param tri.v2 - tri.v2
       * @param tri.v3] - tri.v3]
       * @returns void
       */
      for (const v of [tri.v1, tri.v2, tri.v3]) {
        bb.min.x = Math.min(bb.min.x, v.x);
        bb.min.y = Math.min(bb.min.y, v.y);
        bb.min.z = Math.min(bb.min.z, v.z);
        bb.max.x = Math.max(bb.max.x, v.x);
        bb.max.y = Math.max(bb.max.y, v.y);
        bb.max.z = Math.max(bb.max.z, v.z);
        vertexSet.add(`${v.x},${v.y},${v.z}`);
      }

      const ax = tri.v2.x - tri.v1.x, ay = tri.v2.y - tri.v1.y, az = tri.v2.z - tri.v1.z;
      const bx = tri.v3.x - tri.v1.x, by = tri.v3.y - tri.v1.y, bz = tri.v3.z - tri.v1.z;
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
      surfaceArea += area;

      if (area < 1e-12) degenerate++;

      // Signed volume contribution (divergence theorem)
      volumeSum += (tri.v1.x * (tri.v2.y * tri.v3.z - tri.v3.y * tri.v2.z)
                   - tri.v2.x * (tri.v1.y * tri.v3.z - tri.v3.y * tri.v1.z)
                   + tri.v3.x * (tri.v1.y * tri.v2.z - tri.v2.y * tri.v1.z)) / 6;
    }

    const expectedVertices = triangles.length / 2 + 2;
    const isWatertight = triangles.length > 0 && Math.abs(vertexSet.size - expectedVertices) < triangles.length * 0.05;

    /** If.
     * @param triangles.length - triangles.length
     * @returns void
     */
    if (triangles.length === 0) {
      bb.min = { x: 0, y: 0, z: 0 };
      bb.max = { x: 0, y: 0, z: 0 };
    }

    return {
      format,
      name,
      triangles,
      bounding_box: bb,
      statistics: {
        triangle_count: triangles.length,
        vertex_count: vertexSet.size,
        surface_area: surfaceArea,
        volume: Math.abs(volumeSum),
        is_watertight: isWatertight,
        degenerate_triangles: degenerate,
      },
    };
  }

  // ── IGES Parser ───────────────────────────────────────────────────

  /** Parses i g e s.
   * @param content - content
   * @returns i g e s parse result
   */
  parseIGES(content: string): IGESParseResult {
    const lines = content.split(/\r?\n/);
    const startSection: string[] = [];
    const globalLines: string[] = [];
    const directoryEntries: string[] = [];

    /** For.
     * @param const - const
     * @returns void
     */
    for (const line of lines) {
      if (line.length < 73) continue;
      const section = line[72];
      const data = line.substring(0, 72);
      /** Switch.
       * @param section - section
       * @returns void
       */
      switch (section) {
        case "S": startSection.push(data.trim()); break;
        case "G": globalLines.push(data); break;
        case "D": directoryEntries.push(data); break;
      }
    }

    const globalText = globalLines.join("").replace(/\s+/g, " ");
    const gFields = this.parseIGESDelimited(globalText);

    const globalSection = {
      separator: (gFields[0] as string) || ",",
      record_delimiter: (gFields[1] as string) || ";",
      product_id: (gFields[2] as string) || "",
      file_name: (gFields[3] as string) || "",
      native_system: (gFields[4] as string) || "",
      units: (gFields[14] as string) || "MM",
      max_line_weight: Number(gFields[8]) || 0,
      max_resolution: Number(gFields[15]) || 0.001,
      model_space_scale: Number(gFields[13]) || 1,
      author: (gFields[18] as string) || "",
      organization: (gFields[19] as string) || "",
      iges_version: Number(gFields[22]) || 11,
      date: (gFields[17] as string) || "",
    };

    const entities: IGESEntity[] = [];
    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i + 1 < directoryEntries.length; i += 2) {
      const d1 = directoryEntries[i];
      const d2 = directoryEntries[i + 1];
      const entityType = parseInt(d1.substring(0, 8).trim(), 10);
      const formNumber = parseInt(d2.substring(32, 40).trim(), 10) || 0;
      const color = parseInt(d1.substring(24, 32).trim(), 10) || 0;
      const lineWeight = parseInt(d1.substring(16, 24).trim(), 10) || 0;
      const label = d2.substring(56, 64).trim();

      entities.push({
        id: entities.length + 1,
        entity_type: entityType,
        entity_type_name: IGES_TYPE_MAP[entityType] ?? "unknown",
        form_number: formNumber,
        color,
        line_weight: lineWeight,
        parameters: [],
        label,
      });
    }

    const byType: Record<string, number> = {};
    /** For.
     * @param const - const
     * @returns void
     */
    for (const e of entities) {
      byType[e.entity_type_name] = (byType[e.entity_type_name] ?? 0) + 1;
    }

    return {
      format: "iges",
      start_section: startSection,
      global_section: globalSection,
      entities,
      statistics: {
        total_entities: entities.length,
        by_type: byType,
      },
    };
  }

  private parseIGESDelimited(text: string): string[] {
    const fields: string[] = [];
    let current = "";
    const inString = false;
    /** For.
     * @param const - const
     * @returns void
     */
    for (const ch of text) {
      /** If.
       * @param ch - ch
       * @param " - "
       * @returns void
       */
      if (ch === "," || ch === ";") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) fields.push(current.trim());
    return fields;
  }

  // ── DXF Parser ────────────────────────────────────────────────────

  /** Parses d x f.
   * @param content - content
   * @returns d x f parse result
   */
  parseDXF(content: string): DXFParseResult {
    const lines = content.split(/\r?\n/);
    const pairs: Array<{ code: number; value: string }> = [];

    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i + 1 < lines.length; i += 2) {
      pairs.push({ code: parseInt(lines[i].trim(), 10), value: lines[i + 1]?.trim() ?? "" });
    }

    const header: Record<string, string | number> = {};
    const layers: DXFLayer[] = [];
    const entities: DXFEntity[] = [];
    const blocks: Array<{ name: string; entities: DXFEntity[] }> = [];

    let section = "";
    let currentEntity: Partial<DXFEntity> | null = null;
    let currentBlock: { name: string; entities: DXFEntity[] } | null = null;

    const validTypes = new Set<string>(["LINE", "CIRCLE", "ARC", "POLYLINE", "LWPOLYLINE", "SPLINE", "POINT", "TEXT", "MTEXT", "INSERT", "DIMENSION", "3DFACE", "SOLID"]);

    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i < pairs.length; i++) {
      const { code, value } = pairs[i];

      /** If.
       * @param code - code
       * @returns void
       */
      if (code === 0 && value === "SECTION") {
        section = pairs[i + 1]?.value ?? "";
        i++;
        continue;
      }
      if (code === 0 && value === "ENDSEC") { section = ""; continue; }

      /** If.
       * @param section - section
       * @returns void
       */
      if (section === "HEADER" && code === 9) {
        const varName = value;
        /** If.
         * @param i - index position
         * @returns void
         */
        if (i + 1 < pairs.length) {
          header[varName] = pairs[i + 1].value;
          i++;
        }
      }

      /** If.
       * @param section - section
       * @returns void
       */
      if (section === "TABLES" && code === 0 && value === "LAYER") {
        const layer: Partial<DXFLayer> = { entity_count: 0, frozen: false, locked: false, line_type: "CONTINUOUS" };
        for (let j = i + 1; j < pairs.length && !(pairs[j].code === 0); j++) {
          if (pairs[j].code === 2) layer.name = pairs[j].value;
          if (pairs[j].code === 62) layer.color = parseInt(pairs[j].value, 10);
          if (pairs[j].code === 6) layer.line_type = pairs[j].value;
          /** If.
           * @param pairs[j].code - pairs[j].code
           * @returns void
           */
          if (pairs[j].code === 70) {
            const flags = parseInt(pairs[j].value, 10);
            layer.frozen = (flags & 1) !== 0;
            layer.locked = (flags & 4) !== 0;
          }
        }
        if (layer.name) layers.push(layer as DXFLayer);
      }

      if ((section === "ENTITIES" || currentBlock) && code === 0) {
        /** If.
         * @param currentEntity?.type - current entity?.type
         * @returns void
         */
        if (currentEntity?.type) {
          const ent = currentEntity as DXFEntity;
          if (!ent.data) ent.data = {};
          if (currentBlock) currentBlock.entities.push(ent);
          else entities.push(ent);
        }

        /** If.
         * @param value - value to set
         * @returns void
         */
        if (value === "ENDSEC" || value === "ENDBLK") {
          currentEntity = null;
          /** If.
           * @param value - value to set
           * @returns void
           */
          if (value === "ENDBLK" && currentBlock) {
            blocks.push(currentBlock);
            currentBlock = null;
          }
          continue;
        }

        if (validTypes.has(value)) {
          currentEntity = { type: value as DXFEntityType, layer: "0", data: {} };
        } else {
          currentEntity = null;
        }
        continue;
      }

      /** If.
       * @param currentEntity - current entity
       * @returns void
       */
      if (currentEntity) {
        if (code === 8) currentEntity.layer = value;
        if (code === 62) currentEntity.color = parseInt(value, 10);
        if (!currentEntity.data) currentEntity.data = {};
        currentEntity.data[`g${code}`] = value;
      }

      /** If.
       * @param section - section
       * @returns void
       */
      if (section === "BLOCKS" && code === 0 && value === "BLOCK") {
        const blockName = pairs[i + 1]?.code === 2 ? pairs[i + 1].value : "unnamed";
        currentBlock = { name: blockName, entities: [] };
      }
    }

    const byType: Record<string, number> = {};
    const byLayer: Record<string, number> = {};
    /** For.
     * @param const - const
     * @returns void
     */
    for (const e of entities) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      byLayer[e.layer] = (byLayer[e.layer] ?? 0) + 1;
    }
    /** For.
     * @param const - const
     * @returns void
     */
    for (const l of layers) {
      l.entity_count = byLayer[l.name] ?? 0;
    }

    return {
      format: "dxf",
      header,
      layers,
      entities,
      blocks,
      statistics: {
        total_entities: entities.length,
        total_layers: layers.length,
        by_type: byType,
        by_layer: byLayer,
      },
    };
  }

  // ── Export / Generation ────────────────────────────────────────────

  /** Generate ASCII STL from triangles */
  generateSTL(name: string, triangles: Triangle[]): string {
    const lines: string[] = [`solid ${name}`];
    /** For.
     * @param const - const
     * @returns void
     */
    for (const tri of triangles) {
      lines.push(`  facet normal ${tri.normal.x} ${tri.normal.y} ${tri.normal.z}`);
      lines.push("    outer loop");
      lines.push(`      vertex ${tri.v1.x} ${tri.v1.y} ${tri.v1.z}`);
      lines.push(`      vertex ${tri.v2.x} ${tri.v2.y} ${tri.v2.z}`);
      lines.push(`      vertex ${tri.v3.x} ${tri.v3.y} ${tri.v3.z}`);
      lines.push("    endloop");
      lines.push("  endfacet");
    }
    lines.push(`endsolid ${name}`);
    return lines.join("\n");
  }

  /** Generate minimal DXF from entities */
  generateDXF(entities: Array<{ type: string; layer?: string; points: Vec3[] }>): string {
    const lines: string[] = [
      "0", "SECTION", "2", "HEADER", "0", "ENDSEC",
      "0", "SECTION", "2", "ENTITIES",
    ];

    /** For.
     * @param const - const
     * @returns void
     */
    for (const e of entities) {
      /** If.
       * @param e.type - e.type
       * @returns void
       */
      if (e.type === "LINE" && e.points.length >= 2) {
        lines.push("0", "LINE", "8", e.layer ?? "0");
        lines.push("10", String(e.points[0].x), "20", String(e.points[0].y), "30", String(e.points[0].z));
        lines.push("11", String(e.points[1].x), "21", String(e.points[1].y), "31", String(e.points[1].z));
      } else if (e.type === "POINT" && e.points.length >= 1) {
        lines.push("0", "POINT", "8", e.layer ?? "0");
        lines.push("10", String(e.points[0].x), "20", String(e.points[0].y), "30", String(e.points[0].z));
      }
    }

    lines.push("0", "ENDSEC", "0", "EOF");
    return lines.join("\n");
  }

  /** Get format information */
  getFormatInfo(format: CADFormat): { name: string; extensions: string[]; description: string; capabilities: string[] } {
    const formats: Record<CADFormat, { name: string; extensions: string[]; description: string; capabilities: string[] }> = {
      step: { name: "STEP", extensions: [".stp", ".step", ".p21"], description: "ISO 10303 Standard for Exchange of Product Data", capabilities: ["brep", "nurbs", "assemblies", "metadata", "colors"] },
      iges: { name: "IGES", extensions: [".igs", ".iges"], description: "Initial Graphics Exchange Specification", capabilities: ["curves", "surfaces", "assemblies", "legacy"] },
      stl_ascii: { name: "STL (ASCII)", extensions: [".stl"], description: "Stereolithography tessellated mesh format", capabilities: ["triangles", "normals", "3d_printing"] },
      stl_binary: { name: "STL (Binary)", extensions: [".stl"], description: "Stereolithography binary mesh format", capabilities: ["triangles", "normals", "3d_printing", "compact"] },
      dxf: { name: "DXF", extensions: [".dxf"], description: "AutoCAD Drawing Exchange Format", capabilities: ["2d", "3d", "layers", "blocks", "dimensions"] },
    };
    return formats[format];
  }

  /** List all supported formats */
  listFormats(): Array<{ format: CADFormat; name: string; extensions: string[]; description: string; capabilities: string[] }> {
    const formats: CADFormat[] = ["step", "iges", "stl_ascii", "stl_binary", "dxf"];
    return formats.map(f => ({ format: f, ...this.getFormatInfo(f) }));
  }
}

/** File I O Engine constant.
 */
export const fileIOEngine = new FileIOEngine();
