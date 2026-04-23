/**
 * STEPNCEngines — STEP-NC (ISO 14649 / AP238) Parser + Generator
 *
 * Two engines in one file:
 *
 * STEPNCParserEngine (E1129-A)
 *   Parses STEP-NC P21 files and maps them to the PRISM feature model.
 *   Extracts: workingsteps, workplans, manufacturing features, tooling,
 *   technology data (speed/feed/depth). Maps entities to PRISMFeature[],
 *   PRISMTool[], and CuttingParams[] for downstream PRISM optimisation.
 *
 * STEPNCGeneratorEngine (E1129-B)
 *   Generates ISO 14649-conforming STEP-NC P21 text from PRISM pipeline
 *   outputs. Supports Part 10 (general), Part 11 (milling), Part 12
 *   (turning), Part 111 (tool definitions for milling). Produces a
 *   complete WORKPLAN with ordered MACHINING_WORKINGSTEPs.
 *
 * Actions: stepnc_parse, stepnc_generate
 * Milestone: CAMX-MS20 U01 + U02
 */

// ============================================================================
// TYPES — shared between parser and generator
// ============================================================================

export interface STEPNCPoint {
  x: number;
  y: number;
  z: number;
}

export interface STEPNCWorkingstep {
  id: string;
  entity_ref: number;             // P21 entity #N
  name: string;
  feature_ref: string;            // manufacturing feature name/id
  operation_type: string;         // e.g. "bottom_and_side_milling", "drilling"
  tool_ref: string;
  strategy?: string;
  spindle_rpm?: number;
  feed_mmpm?: number;
  doc_mm?: number;
  woc_mm?: number;
  coolant?: string;
}

export interface STEPNCWorkplan {
  id: string;
  entity_ref: number;
  name: string;
  workingstep_refs: string[];     // ordered list of workingstep ids
}

export interface STEPNCFeature {
  id: string;
  entity_ref: number;
  name: string;
  feature_type: string;           // pocket, hole, slot, face, boss …
  depth_mm?: number;
  width_mm?: number;
  length_mm?: number;
  diameter_mm?: number;
  location?: STEPNCPoint;
  tolerance_mm?: number;
}

export interface STEPNCTool {
  id: string;
  entity_ref: number;
  name: string;
  tool_type: string;
  diameter_mm?: number;
  length_mm?: number;
  corner_radius_mm?: number;
  flutes?: number;
  material?: string;
  coating?: string;
}

export interface STEPNCTechnology {
  workingstep_id: string;
  spindle_rpm?: number;
  feed_mmpm?: number;
  doc_mm?: number;
  woc_mm?: number;
  coolant?: string;
}

export interface STEPNCModel {
  workingsteps: STEPNCWorkingstep[];
  workplans: STEPNCWorkplan[];
  features: STEPNCFeature[];
  tooling: STEPNCTool[];
  technology: STEPNCTechnology[];
  entity_count: number;
  part_name?: string;
  author?: string;
  schema?: string;
}

export interface PRISMFeature {
  id: string;
  type: string;
  depth_mm?: number;
  width_mm?: number;
  length_mm?: number;
  diameter_mm?: number;
  location?: STEPNCPoint;
  tolerance_mm?: number;
  surface_finish_ra?: number;
  source: "stepnc";
}

export interface PRISMTool {
  id: string;
  type: string;
  diameter_mm?: number;
  length_mm?: number;
  corner_radius_mm?: number;
  flutes?: number;
  material?: string;
  coating?: string;
  source: "stepnc";
}

export interface CuttingParams {
  feature_id?: string;
  tool_id?: string;
  spindle_rpm?: number;
  feed_mmpm?: number;
  doc_mm?: number;
  woc_mm?: number;
  coolant?: string;
  operation?: string;
}

export interface STEPNCParseResult {
  model: STEPNCModel;
  prism_features: PRISMFeature[];
  prism_tools: PRISMTool[];
  prism_params: CuttingParams[];
  summary: {
    workingsteps: number;
    workplans: number;
    features: number;
    tools: number;
    entity_count: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

// ISO 14649 entity type keywords → feature type mapping
const FEATURE_KEYWORDS: Record<string, string> = {
  CLOSED_POCKET:         "pocket",
  OPEN_POCKET:           "pocket",
  RECTANGULAR_POCKET:    "pocket",
  PLANAR_POCKET:         "pocket",
  ROUND_HOLE:            "hole",
  COUNTER_BORE_HOLE:     "hole",
  COUNTERSUNK_HOLE:      "hole",
  TAPPED_HOLE:           "thread",
  SLOT:                  "slot",
  OPEN_SLOT:             "slot",
  RECTANGULAR_OPEN_SLOT: "slot",
  PLANAR_FACE:           "face",
  BOSS:                  "boss",
  CHAMFER:               "chamfer",
  FREEFORM_FEATURE:      "face",
};

// P21 entity keywords for tool types
const TOOL_KEYWORDS: Record<string, string> = {
  MILLING_TOOL_BODY:    "endmill",
  ENDMILL:              "endmill",
  DRILL:                "drill",
  BALL_END_MILL:        "ballnose",
  FACE_MILL:            "face_mill",
  BORING_TOOL:          "boring_bar",
  TAP:                  "tap",
  REAMER:               "reamer",
  TURNING_TOOL:         "turning_insert",
};

// Tool type → ISO 14649 Part 111 entity name
const TOOL_ENTITY_MAP: Record<string, string> = {
  endmill:        "MILLING_TOOL_BODY",
  drill:          "DRILL",
  ballnose:       "BALL_END_MILL",
  face_mill:      "FACE_MILL",
  bull_nose:      "MILLING_TOOL_BODY",
  boring_bar:     "BORING_TOOL",
  tap:            "TAP",
  reamer:         "REAMER",
  thread_mill:    "MILLING_TOOL_BODY",
  turning_insert: "TURNING_TOOL",
};

// Feature type → ISO 14649 entity name (Part 11/12)
const FEATURE_ENTITY_MAP: Record<string, string> = {
  pocket:   "CLOSED_POCKET",
  hole:     "ROUND_HOLE",
  slot:     "OPEN_SLOT",
  face:     "PLANAR_FACE",
  boss:     "BOSS",
  thread:   "TAPPED_HOLE",
  chamfer:  "CHAMFER",
};

// Operation type → ISO 14649 workingstep operation entity
const OPERATION_ENTITY_MAP: Record<string, string> = {
  pocket:  "BOTTOM_AND_SIDE_MILLING",
  hole:    "DRILLING",
  slot:    "SIDE_MILLING",
  face:    "FACE_MILLING",
  boss:    "BOTTOM_AND_SIDE_MILLING",
  thread:  "TAPPING",
  chamfer: "SIDE_MILLING",
};

// Feature type → Part 11 or 12
const FEATURE_PART: Record<string, string> = {
  pocket:  "11",
  hole:    "11",
  slot:    "11",
  face:    "11",
  boss:    "11",
  thread:  "11",
  chamfer: "11",
  turning: "12",
};

// ============================================================================
// PARSER ENGINE
// ============================================================================

export class STEPNCParserEngine {

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Parse a STEP-NC P21 file text into a structured STEPNCModel.
   * Handles well-formed ISO-10303-21 files and tolerates partial excerpts.
   */
  parse(stepnc_text: string): STEPNCModel {
    const lines   = stepnc_text.split(/\r?\n/);
    const entities = this._extractEntities(lines);

    const workingsteps = this._parseWorkingsteps(entities);
    const workplans    = this._parseWorkplans(entities, workingsteps);
    const features     = this._parseFeatures(entities);
    const tooling      = this._parseTooling(entities);
    const technology   = this._parseTechnology(entities, workingsteps);

    const headerMeta = this._parseHeader(lines);

    return {
      workingsteps,
      workplans,
      features,
      tooling,
      technology,
      entity_count: entities.size,
      part_name:    headerMeta.part_name,
      author:       headerMeta.author,
      schema:       headerMeta.schema,
    };
  }

  /**
   * Map STEPNCModel features to PRISM PRISMFeature[].
   */
  extractFeatures(model: STEPNCModel): PRISMFeature[] {
    return model.features.map(f => ({
      id:          f.id,
      type:        f.feature_type,
      depth_mm:    f.depth_mm,
      width_mm:    f.width_mm,
      length_mm:   f.length_mm,
      diameter_mm: f.diameter_mm,
      location:    f.location,
      tolerance_mm: f.tolerance_mm,
      source:      "stepnc" as const,
    }));
  }

  /**
   * Map STEPNCModel tooling to PRISM PRISMTool[].
   */
  extractTooling(model: STEPNCModel): PRISMTool[] {
    return model.tooling.map(t => ({
      id:               t.id,
      type:             t.tool_type,
      diameter_mm:      t.diameter_mm,
      length_mm:        t.length_mm,
      corner_radius_mm: t.corner_radius_mm,
      flutes:           t.flutes,
      material:         t.material,
      coating:          t.coating,
      source:           "stepnc" as const,
    }));
  }

  /**
   * Extract CuttingParams[] from technology + workingstep data.
   */
  extractParameters(model: STEPNCModel): CuttingParams[] {
    const params: CuttingParams[] = [];
    for (const ws of model.workingsteps) {
      const tech = model.technology.find(t => t.workingstep_id === ws.id);
      params.push({
        feature_id: ws.feature_ref,
        tool_id:    ws.tool_ref,
        spindle_rpm: tech?.spindle_rpm ?? ws.spindle_rpm,
        feed_mmpm:   tech?.feed_mmpm  ?? ws.feed_mmpm,
        doc_mm:      tech?.doc_mm     ?? ws.doc_mm,
        woc_mm:      tech?.woc_mm     ?? ws.woc_mm,
        coolant:     tech?.coolant    ?? ws.coolant,
        operation:   this._operationTypeToCategory(ws.operation_type),
      });
    }
    return params;
  }

  // --------------------------------------------------------------------------
  // Internal parsing helpers
  // --------------------------------------------------------------------------

  /** Extract all DATA-section P21 entity records as a Map<ref_num, {keyword, params_str}> */
  private _extractEntities(lines: string[]): Map<number, { keyword: string; raw: string }> {
    const map = new Map<number, { keyword: string; raw: string }>();
    let inData  = false;
    let buffer  = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "DATA;") { inData = true; continue; }
      if (trimmed === "ENDSEC;" && inData) { inData = false; continue; }
      if (!inData) continue;

      buffer += " " + trimmed;

      // Each complete entity ends with ";"
      if (!buffer.includes(";")) continue;

      const stmts = buffer.split(";");
      buffer = stmts.pop() ?? "";   // keep incomplete tail

      for (const stmt of stmts) {
        const s = stmt.trim();
        if (!s) continue;
        // Pattern:  #N = KEYWORD(...)
        const m = s.match(/^#(\d+)\s*=\s*([A-Z_][A-Z0-9_]*)\s*\((.*)\)$/s);
        if (!m) continue;
        const ref = parseInt(m[1], 10);
        map.set(ref, { keyword: m[2], raw: m[3] });
      }
    }
    return map;
  }

  /** Parse MACHINING_WORKINGSTEP entities */
  private _parseWorkingsteps(entities: Map<number, { keyword: string; raw: string }>): STEPNCWorkingstep[] {
    const result: STEPNCWorkingstep[] = [];
    for (const [ref, { keyword, raw }] of entities) {
      if (keyword !== "MACHINING_WORKINGSTEP") continue;

      const parts   = this._splitParams(raw);
      const name    = this._stripQuotes(parts[0] ?? "");
      const featRef = this._extractRef(parts[1] ?? "");
      const opRef   = this._extractRef(parts[2] ?? "");
      const toolRef = this._extractRef(parts[3] ?? "");

      const opEnt   = opRef ? entities.get(opRef) : undefined;
      const toolEnt = toolRef ? entities.get(toolRef) : undefined;

      const ws: STEPNCWorkingstep = {
        id:             `ws-${ref}`,
        entity_ref:     ref,
        name,
        feature_ref:    featRef ? `feature-${featRef}` : "",
        operation_type: opEnt?.keyword?.toLowerCase() ?? "milling",
        tool_ref:       toolEnt ? `tool-${toolRef}` : "",
        strategy:       opEnt?.keyword?.toLowerCase(),
      };

      // Extract speed/feed from operation entity if present
      if (opEnt) {
        const opParts = this._splitParams(opEnt.raw);
        ws.spindle_rpm = this._extractNumber(opParts[2]);
        ws.feed_mmpm   = this._extractNumber(opParts[3]);
        ws.doc_mm      = this._extractNumber(opParts[4]);
        ws.woc_mm      = this._extractNumber(opParts[5]);
      }

      result.push(ws);
    }
    return result;
  }

  /** Parse WORKPLAN entities */
  private _parseWorkplans(
    entities: Map<number, { keyword: string; raw: string }>,
    workingsteps: STEPNCWorkingstep[],
  ): STEPNCWorkplan[] {
    const wsByRef = new Map(workingsteps.map(w => [w.entity_ref, w]));
    const result: STEPNCWorkplan[] = [];

    for (const [ref, { keyword, raw }] of entities) {
      if (keyword !== "WORKPLAN") continue;
      const parts = this._splitParams(raw);
      const name  = this._stripQuotes(parts[0] ?? "");
      const refs  = this._extractRefList(parts[1] ?? "");
      const wpIds = refs.map(r => wsByRef.get(r)?.id ?? `ws-${r}`);

      result.push({
        id:               `wp-${ref}`,
        entity_ref:       ref,
        name,
        workingstep_refs: wpIds,
      });
    }
    return result;
  }

  /** Parse manufacturing feature entities */
  private _parseFeatures(entities: Map<number, { keyword: string; raw: string }>): STEPNCFeature[] {
    const result: STEPNCFeature[] = [];
    for (const [ref, { keyword, raw }] of entities) {
      const featureType = FEATURE_KEYWORDS[keyword];
      if (!featureType) continue;

      const parts = this._splitParams(raw);
      const name  = this._stripQuotes(parts[0] ?? "");
      const feat: STEPNCFeature = {
        id:           `feature-${ref}`,
        entity_ref:   ref,
        name:         name || keyword.toLowerCase().replace(/_/g, " "),
        feature_type: featureType,
      };

      // Extract dimensions by position (ISO 14649 param order varies by entity)
      // depth is typically 3rd or 4th param, diameter for holes is 2nd/3rd
      if (featureType === "hole") {
        feat.diameter_mm = this._extractNumber(parts[1]);
        feat.depth_mm    = this._extractNumber(parts[2]);
      } else if (featureType === "pocket") {
        feat.depth_mm    = this._extractNumber(parts[2]);
        feat.length_mm   = this._extractNumber(parts[3]);
        feat.width_mm    = this._extractNumber(parts[4]);
      } else if (featureType === "slot") {
        feat.depth_mm    = this._extractNumber(parts[2]);
        feat.length_mm   = this._extractNumber(parts[3]);
        feat.width_mm    = this._extractNumber(parts[4]);
      } else {
        // Generic: try to find first numeric params as depth
        for (let i = 1; i < parts.length && feat.depth_mm === undefined; i++) {
          const n = this._extractNumber(parts[i]);
          if (n !== undefined && n > 0) feat.depth_mm = n;
        }
      }

      result.push(feat);
    }
    return result;
  }

  /** Parse tool-related entities (Part 111 tool bodies) */
  private _parseTooling(entities: Map<number, { keyword: string; raw: string }>): STEPNCTool[] {
    const result: STEPNCTool[] = [];
    for (const [ref, { keyword, raw }] of entities) {
      const toolType = TOOL_KEYWORDS[keyword];
      if (!toolType) continue;

      const parts = this._splitParams(raw);
      const name  = this._stripQuotes(parts[0] ?? "");

      const tool: STEPNCTool = {
        id:          `tool-${ref}`,
        entity_ref:  ref,
        name:        name || keyword.toLowerCase().replace(/_/g, " "),
        tool_type:   toolType,
        diameter_mm: this._extractNumber(parts[1]),
        length_mm:   this._extractNumber(parts[2]),
      };

      // Additional geometry from further params
      if (parts[3]) tool.corner_radius_mm = this._extractNumber(parts[3]);
      if (parts[4]) {
        const v = parseInt(parts[4].trim(), 10);
        if (!isNaN(v)) tool.flutes = v;
      }

      result.push(tool);
    }
    return result;
  }

  /** Extract technology (speed/feed) from MILLING_TECHNOLOGY / NC_FUNCTION entities */
  private _parseTechnology(
    entities: Map<number, { keyword: string; raw: string }>,
    workingsteps: STEPNCWorkingstep[],
  ): STEPNCTechnology[] {
    const result: STEPNCTechnology[] = [];
    const wsSet = new Set(workingsteps.map(w => w.id));

    for (const [ref, { keyword, raw }] of entities) {
      if (keyword !== "MILLING_TECHNOLOGY" && keyword !== "TURNING_TECHNOLOGY") continue;
      const parts = this._splitParams(raw);

      // Heuristic: associate with the nearest preceding workingstep entity ref
      const prevWs = workingsteps.find(w => w.entity_ref < ref &&
        !result.some(t => t.workingstep_id === w.id));

      if (!prevWs) continue;

      result.push({
        workingstep_id: prevWs.id,
        spindle_rpm:    this._extractNumber(parts[0]),
        feed_mmpm:      this._extractNumber(parts[1]),
        doc_mm:         this._extractNumber(parts[2]),
        woc_mm:         this._extractNumber(parts[3]),
        coolant:        parts[4] ? this._stripQuotes(parts[4]).toLowerCase() : undefined,
      });
    }
    void wsSet;
    return result;
  }

  /** Parse STEP file header for metadata */
  private _parseHeader(lines: string[]): { part_name?: string; author?: string; schema?: string } {
    let inHeader = false;
    let part_name: string | undefined;
    let author: string | undefined;
    let schema: string | undefined;

    for (const line of lines) {
      const t = line.trim();
      if (t === "HEADER;") { inHeader = true; continue; }
      if (t === "ENDSEC;" && inHeader) break;
      if (!inHeader) continue;

      if (t.startsWith("FILE_DESCRIPTION")) {
        const m = t.match(/'([^']+)'/);
        if (m) part_name = m[1];
      } else if (t.startsWith("FILE_NAME")) {
        const m = t.match(/,\s*'([^']+)'/);
        if (m) author = m[1];
      } else if (t.startsWith("FILE_SCHEMA")) {
        const m = t.match(/'([^']+)'/);
        if (m) schema = m[1];
      }
    }
    return { part_name, author, schema };
  }

  // --------------------------------------------------------------------------
  // Low-level P21 parsing utilities
  // --------------------------------------------------------------------------

  /** Split a P21 parameter string respecting nested parentheses */
  private _splitParams(raw: string): string[] {
    const result: string[] = [];
    let depth = 0;
    let cur   = "";

    for (const ch of raw) {
      if (ch === "(" ) { depth++; cur += ch; }
      else if (ch === ")") { depth--; cur += ch; }
      else if (ch === "," && depth === 0) { result.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    if (cur.trim()) result.push(cur.trim());
    return result;
  }

  /** Extract a single entity reference number from "#N" */
  private _extractRef(s: string): number | undefined {
    const m = s.trim().match(/^#(\d+)$/);
    return m ? parseInt(m[1], 10) : undefined;
  }

  /** Extract a list of entity refs from "(#N,#M,...)" */
  private _extractRefList(s: string): number[] {
    const inner = s.trim().replace(/^\(|\)$/g, "");
    return inner.split(",").map(p => {
      const m = p.trim().match(/^#(\d+)$/);
      return m ? parseInt(m[1], 10) : NaN;
    }).filter(n => !isNaN(n));
  }

  /** Parse a numeric literal from a P21 param token */
  private _extractNumber(s?: string): number | undefined {
    if (!s) return undefined;
    const n = parseFloat(s.trim());
    return isNaN(n) ? undefined : n;
  }

  /** Strip single quotes from a P21 string literal */
  private _stripQuotes(s: string): string {
    return s.trim().replace(/^'|'$/g, "");
  }

  /** Map ISO 14649 operation type string to PRISM category */
  private _operationTypeToCategory(opType: string): "roughing" | "semi_finishing" | "finishing" {
    const lower = opType.toLowerCase();
    if (lower.includes("rough")) return "roughing";
    if (lower.includes("finish")) return "finishing";
    return "semi_finishing";
  }
}

// ============================================================================
// GENERATOR ENGINE
// ============================================================================

export class STEPNCGeneratorEngine {

  private _nextRef = 1;

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Generate a complete STEP-NC P21 file from PRISM feature/tool/params arrays.
   * Returns the full P21 text including HEADER and DATA sections.
   */
  generate(
    features:      PRISMFeature[],
    tools:         PRISMTool[],
    params:        CuttingParams[],
    opts: {
      workplan_name?: string;
      include_parts?: string[];
      part_name?: string;
      author?: string;
    } = {},
  ): string {
    this._nextRef = 1;
    const lines: string[] = [];

    const {
      workplan_name = "PRISM_WORKPLAN",
      part_name     = "PRISM_PART",
      author        = "PRISM",
    } = opts;

    // Build entity blocks
    const toolDefs   = this.generateToolDefinitions(tools);
    const wsBlocks   = this.generateWorkingstepsBlock(features, tools, params, opts.include_parts);
    const wpBlock    = this.generateWorkplan([...wsBlocks.ids], workplan_name);

    lines.push("ISO-10303-21;");
    lines.push("HEADER;");
    lines.push(`FILE_DESCRIPTION(('STEP-NC: ${part_name}','ISO 14649'),'2;1');`);
    lines.push(`FILE_NAME('${part_name}','${new Date().toISOString()}`,
               `('${author}'),(''),('PRISM MCP Server'),`);
    lines.push(` '','');`);
    lines.push(`FILE_SCHEMA(('AP238_CONFIGURATION_CONTROLLED_3D_DESIGN_OF_MECHANICAL_PARTS_AND_ASSEMBLIES'));`);
    lines.push("ENDSEC;");
    lines.push("DATA;");

    // Tool definitions (Part 111)
    lines.push("/* ISO 14649 Part 111 — Tool Definitions */");
    for (const t of toolDefs.entities) lines.push(t);
    lines.push("");

    // Feature entities (Parts 11/12)
    lines.push("/* ISO 14649 Parts 11/12 — Manufacturing Features */");
    for (const l of wsBlocks.featureEntities) lines.push(l);
    lines.push("");

    // Workingsteps (Part 10)
    lines.push("/* ISO 14649 Part 10 — Machining Workingsteps */");
    for (const l of wsBlocks.wsEntities) lines.push(l);
    lines.push("");

    // Workplan (Part 10)
    lines.push("/* ISO 14649 Part 10 — Workplan */");
    lines.push(wpBlock);
    lines.push("");

    lines.push("ENDSEC;");
    lines.push("END-ISO-10303-21;");

    return lines.join("\n");
  }

  /**
   * Generate a single MACHINING_WORKINGSTEP entity string for one feature/tool/params triple.
   * Returns the P21 entity line.
   */
  generateWorkingstep(
    feature:  PRISMFeature,
    tool:     PRISMTool,
    params:   CuttingParams,
  ): string {
    const wsRef    = this._ref();
    const opEntity = OPERATION_ENTITY_MAP[feature.type] ?? "BOTTOM_AND_SIDE_MILLING";
    const opRef    = this._ref();
    const techRef  = this._ref();

    const lines: string[] = [];

    // Technology entity (Part 10 / 11)
    lines.push(
      `#${techRef} = MILLING_TECHNOLOGY(` +
      `${params.spindle_rpm ?? 3000},` +
      `${params.feed_mmpm   ?? 500},` +
      `${params.doc_mm      ?? 1.0},` +
      `${params.woc_mm      ?? 5.0},` +
      `'${params.coolant    ?? "flood"}');`
    );

    // Operation entity
    lines.push(
      `#${opRef} = ${opEntity}(` +
      `'${feature.type} operation',` +
      `#${techRef},` +
      `${params.spindle_rpm ?? 3000},` +
      `${params.feed_mmpm   ?? 500},` +
      `${params.doc_mm      ?? 1.0},` +
      `${params.woc_mm      ?? 5.0});`
    );

    // Workingstep
    lines.push(
      `#${wsRef} = MACHINING_WORKINGSTEP(` +
      `'${feature.id ?? feature.type}',` +
      `#${opRef},` +
      `$,` +
      `$);`
    );

    return lines.join("\n");
  }

  /**
   * Generate a WORKPLAN entity referencing an ordered list of workingstep refs.
   */
  generateWorkplan(wsRefs: number[], name = "PRISM_WORKPLAN"): string {
    const wpRef  = this._ref();
    const refStr = wsRefs.map(r => `#${r}`).join(",");
    return `#${wpRef} = WORKPLAN('${name}',(${refStr}),$,$.ENABLED.);`;
  }

  /**
   * Generate Part 111 tool definition entity for one PRISM tool.
   */
  generateToolDefinition(tool: PRISMTool): string {
    const ref        = this._ref();
    const entityName = TOOL_ENTITY_MAP[tool.type] ?? "MILLING_TOOL_BODY";
    return (
      `#${ref} = ${entityName}(` +
      `'${tool.id ?? tool.type}',` +
      `${tool.diameter_mm ?? 10.0},` +
      `${tool.length_mm   ?? 75.0},` +
      `${tool.corner_radius_mm ?? 0.0},` +
      `${tool.flutes      ?? 4},` +
      `'${tool.material   ?? "carbide"}',` +
      `'${tool.coating    ?? "TiAlN"}');`
    );
  }

  // --------------------------------------------------------------------------
  // Internal generation helpers
  // --------------------------------------------------------------------------

  /** Generate all tool definition entities, returning entity lines + ref map */
  generateToolDefinitions(tools: PRISMTool[]): {
    entities: string[];
    refMap: Map<string, number>;
  } {
    const entities: string[] = [];
    const refMap   = new Map<string, number>();

    for (const tool of tools) {
      const ref        = this._ref();
      const entityName = TOOL_ENTITY_MAP[tool.type] ?? "MILLING_TOOL_BODY";
      refMap.set(tool.id ?? tool.type, ref);
      entities.push(
        `#${ref} = ${entityName}(` +
        `'${tool.id ?? tool.type}',` +
        `${tool.diameter_mm      ?? 10.0},` +
        `${tool.length_mm        ?? 75.0},` +
        `${tool.corner_radius_mm ?? 0.0},` +
        `${tool.flutes           ?? 4},` +
        `'${tool.material        ?? "carbide"}',` +
        `'${tool.coating         ?? "TiAlN"}');`
      );
    }
    return { entities, refMap };
  }

  /**
   * Generate feature + technology + workingstep entities for all features.
   * Returns entity lines and an ordered list of workingstep P21 ref numbers.
   */
  generateWorkingstepsBlock(
    features:      PRISMFeature[],
    tools:         PRISMTool[],
    params:        CuttingParams[],
    _include_parts?: string[],
  ): { featureEntities: string[]; wsEntities: string[]; ids: number[] } {
    const featureEntities: string[] = [];
    const wsEntities:      string[] = [];
    const ids:             number[] = [];

    // Build a quick tool lookup by id
    const toolById = new Map(tools.map(t => [t.id ?? t.type, t]));

    for (const feat of features) {
      // Feature entity (ISO 14649 Part 11/12)
      const featRef    = this._ref();
      const featEntity = FEATURE_ENTITY_MAP[feat.type] ?? "FREEFORM_FEATURE";

      if (feat.type === "hole") {
        featureEntities.push(
          `#${featRef} = ${featEntity}(` +
          `'${feat.id ?? feat.type}',` +
          `${feat.diameter_mm ?? 10.0},` +
          `${feat.depth_mm    ?? 20.0});`
        );
      } else if (feat.type === "pocket" || feat.type === "slot") {
        featureEntities.push(
          `#${featRef} = ${featEntity}(` +
          `'${feat.id ?? feat.type}',` +
          `${feat.depth_mm   ?? 5.0},` +
          `${feat.length_mm  ?? 50.0},` +
          `${feat.width_mm   ?? 30.0});`
        );
      } else {
        featureEntities.push(
          `#${featRef} = ${featEntity}(` +
          `'${feat.id ?? feat.type}',` +
          `${feat.depth_mm ?? 1.0});`
        );
      }

      // Find matching params (by feature_id or positional)
      const p = params.find(pr => pr.feature_id === feat.id) ??
                params[features.indexOf(feat)] ??
                {};

      // Find matching tool
      const tool = toolById.get(p.tool_id ?? "") ?? tools[0];

      // Technology entity
      const techRef = this._ref();
      wsEntities.push(
        `#${techRef} = MILLING_TECHNOLOGY(` +
        `${p.spindle_rpm ?? 3000},` +
        `${p.feed_mmpm   ?? 500},` +
        `${p.doc_mm      ?? 1.0},` +
        `${p.woc_mm      ?? 5.0},` +
        `'${p.coolant    ?? "flood"}');`
      );

      // Operation entity
      const opRef    = this._ref();
      const opEntity = OPERATION_ENTITY_MAP[feat.type] ?? "BOTTOM_AND_SIDE_MILLING";
      wsEntities.push(
        `#${opRef} = ${opEntity}(` +
        `'${feat.type} op',` +
        `#${techRef},` +
        `${p.spindle_rpm ?? 3000},` +
        `${p.feed_mmpm   ?? 500},` +
        `${p.doc_mm      ?? 1.0},` +
        `${p.woc_mm      ?? 5.0});`
      );

      // Tool ref entity (ISO 14649 TOOL_BODY_REPRESENTATION)
      const toolRepRef = this._ref();
      const toolEntity = TOOL_ENTITY_MAP[tool?.type ?? "endmill"] ?? "MILLING_TOOL_BODY";
      wsEntities.push(
        `#${toolRepRef} = ${toolEntity}(` +
        `'${tool?.id ?? "T1"}',` +
        `${tool?.diameter_mm      ?? 10.0},` +
        `${tool?.length_mm        ?? 75.0},` +
        `${tool?.corner_radius_mm ?? 0.0},` +
        `${tool?.flutes           ?? 4},` +
        `'${tool?.material        ?? "carbide"}',` +
        `'${tool?.coating         ?? "TiAlN"}');`
      );

      // Workingstep
      const wsRef = this._ref();
      wsEntities.push(
        `#${wsRef} = MACHINING_WORKINGSTEP(` +
        `'${feat.id ?? feat.type}',` +
        `#${featRef},` +
        `#${opRef},` +
        `#${toolRepRef});`
      );
      ids.push(wsRef);
    }

    return { featureEntities, wsEntities, ids };
  }

  /** Return and advance the P21 entity reference counter */
  private _ref(): number {
    return this._nextRef++;
  }
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export const stepNCParserEngine    = new STEPNCParserEngine();
export const stepNCGeneratorEngine = new STEPNCGeneratorEngine();
