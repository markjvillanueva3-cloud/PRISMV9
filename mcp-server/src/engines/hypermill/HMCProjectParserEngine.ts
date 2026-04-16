/**
 * HMCProjectParserEngine — HM-KC-MS10-S1/U-HKC51
 *
 * Reads hyperMILL .hmc project files (XML-based) and extracts complete
 * FeatureSequenceRecords: operations, parameters, tools, stock, WCS.
 * Handles v31 and v33 format variations. No USB key needed — .hmc files
 * are readable XML.
 *
 * @milestone HM-KC-MS10/U-HKC51
 */

import type { RecognizedFeature, FeatureType, FeatureDimensions } from "../FeatureRecognitionEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Source of the feature sequence extraction */
export type FeatureSequenceSource = "hmc_project" | "step_inferred" | "manual_entry" | "replicated";

/** A single operation in a feature sequence */
export interface SequenceOperation {
  /** Operation index in sequence (0-based) */
  index: number;
  /** Operation name as defined in project */
  name: string;
  /** hyperMILL cycle code (e.g., "MAXX_ROUGHING", "CONTOUR_3D") */
  cycleCode: string;
  /** Operation type classification */
  operationType: "roughing" | "semi_finishing" | "finishing" | "rest_machining" | "drilling" | "threading" | "probing" | "turning" | "5axis";
  /** Tool reference */
  tool: SequenceTool;
  /** Cutting parameters extracted from the operation */
  parameters: Record<string, number | string | boolean>;
  /** Target feature types this operation addresses */
  targetFeatures: FeatureType[];
  /** Dependencies on other operations (by index) */
  dependsOn: number[];
  /** Estimated cycle time in seconds (from simulation data if available) */
  estimatedCycleTimeSec?: number;
}

/** Tool reference within a sequence */
export interface SequenceTool {
  /** Tool number in magazine */
  toolNumber: number;
  /** Tool name */
  name: string;
  /** Tool type */
  type: "endmill_flat" | "endmill_ball" | "endmill_torus" | "drill" | "tap" | "reamer" | "face_mill" | "chamfer_mill" | "thread_mill" | "boring_bar" | "insert" | "probe" | "other";
  /** Cutting diameter in mm */
  diameterMm: number;
  /** Flute count */
  fluteCount?: number;
  /** Overall length in mm */
  lengthMm?: number;
  /** Corner radius in mm (for torus tools) */
  cornerRadiusMm?: number;
}

/** Stock model definition */
export interface StockDefinition {
  /** Stock type */
  type: "rectangular" | "cylindrical" | "casting" | "forging" | "stl_model";
  /** Stock dimensions in mm */
  dimensions: { x: number; y: number; z: number };
  /** Material designation */
  material: string;
  /** ISO material group */
  isoGroup?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness in HB */
  hardnessHB?: number;
}

/** Work Coordinate System / datum frame */
export interface WCSDefinition {
  /** WCS number (G54=1, G55=2, etc.) */
  wcsNumber: number;
  /** WCS name */
  name: string;
  /** Origin point in machine coordinates */
  origin: { x: number; y: number; z: number };
  /** Rotation angles */
  rotation?: { a: number; b: number; c: number };
}

/** Complete feature sequence record — the core data structure for learning */
export interface FeatureSequenceRecord {
  /** Unique record ID */
  id: string;
  /** Source of this record */
  source: FeatureSequenceSource;
  /** Part classification */
  partType: "prismatic" | "cylindrical" | "freeform" | "thin_wall" | "hybrid";
  /** Part name/description */
  partName: string;
  /** Stock definition */
  stock: StockDefinition;
  /** Work coordinate systems */
  wcsList: WCSDefinition[];
  /** Recognized features (if available) */
  features: RecognizedFeature[];
  /** Ordered operation sequence */
  operations: SequenceOperation[];
  /** Total estimated cycle time in seconds */
  totalCycleTimeSec: number;
  /** Number of tool changes */
  toolChangeCount: number;
  /** Number of unique tools */
  uniqueToolCount: number;
  /** hyperMILL version that created this project */
  hmVersion?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Complexity score (0-10) */
  complexityScore: number;
  /** Warnings generated during parsing */
  warnings: string[];
}

/** Parser result wrapper */
export interface HMCParseResult {
  /** Parsed feature sequence record */
  record: FeatureSequenceRecord;
  /** Parse statistics */
  stats: {
    operationCount: number;
    parameterCount: number;
    toolCount: number;
    wcsCount: number;
    featureCount: number;
    parseTimeMs: number;
  };
  /** Parser confidence (0-1) */
  confidence: number;
  /** Source description */
  sourceDescription: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// XML PARSING HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Simple XML node representation (no external dep) */
interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

/**
 * Decode basic XML entities (&amp; &lt; &gt; &quot; &apos; &#NNN; &#xHH;).
 */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // &amp; last to avoid double-decode
}

/**
 * Minimal XML parser — extracts tags, attributes, text.
 * Not a full XML parser; handles the structured subset used by .hmc files.
 * Strips <?xml?> declarations, <!-- comments -->, and CDATA sections before parsing.
 * Supports both double-quoted and single-quoted attribute values.
 */
function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: "root", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];

  // Pre-process: strip XML declaration, processing instructions, comments, unwrap CDATA
  let cleaned = xml
    .replace(/<\?[^?]*\?>/g, "")          // <?xml ...?> and other PIs
    .replace(/<!--[\s\S]*?-->/g, "")       // <!-- comments -->
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, content: string) =>
      // Escape angle brackets so CDATA content isn't re-parsed as tags
      content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    );

  // Self-closing and open/close tag regex — supports both " and ' quoted attrs
  const tagRe = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = tagRe.exec(cleaned)) !== null) {
    const [full, isClose, tagName, attrStr, selfClose] = match;
    const textBefore = cleaned.slice(lastIndex, match.index).trim();

    // Append text content to current node (decode entities)
    if (textBefore && stack.length > 0) {
      stack[stack.length - 1].text += decodeXmlEntities(textBefore);
    }

    if (isClose) {
      // Closing tag — pop stack
      if (stack.length > 1) stack.pop();
    } else {
      // Parse attributes (both double and single quoted)
      const attrs: Record<string, string> = {};
      const attrRe = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let am: RegExpExecArray | null;
      while ((am = attrRe.exec(attrStr)) !== null) {
        attrs[am[1]] = decodeXmlEntities(am[2] ?? am[3]);
      }

      const node: XmlNode = { tag: tagName, attrs, children: [], text: "" };
      stack[stack.length - 1].children.push(node);

      if (!selfClose) {
        stack.push(node);
      }
    }

    lastIndex = match.index + full.length;
  }

  return root;
}

/** Find all nodes with a given tag name (recursive) */
function findNodes(root: XmlNode, tagName: string): XmlNode[] {
  const results: XmlNode[] = [];
  function walk(node: XmlNode): void {
    if (node.tag === tagName) results.push(node);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return results;
}

/** Get attribute value with fallback */
function attr(node: XmlNode, name: string, fallback: string = ""): string {
  return node.attrs[name] ?? fallback;
}

/** Get numeric attribute */
function numAttr(node: XmlNode, name: string, fallback: number = 0): number {
  const v = node.attrs[name];
  if (v === undefined) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Find first child with tag name */
function findChild(node: XmlNode, tagName: string): XmlNode | undefined {
  return node.children.find((c) => c.tag === tagName);
}

// ══════════════════════════════════════════════════════════════════════════════
// HMC FORMAT CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/** Cycle code mapping from hyperMILL internal IDs */
const CYCLE_CODE_MAP: Record<string, string> = {
  "3D_MAXX_ROUGHING": "MAXX_ROUGHING",
  "3D_HPC_ROUGHING": "HPC_ROUGHING",
  "3D_CONTOUR_ROUGHING": "CONTOUR_ROUGHING",
  "3D_Z_LEVEL_FINISHING": "Z_LEVEL_FINISHING",
  "3D_OPTIMIZED_ROUGHING": "OPTIMIZED_ROUGHING",
  "3D_SURFACE_FINISHING": "SURFACE_FINISHING",
  "3D_PARALLEL_FINISHING": "PARALLEL_FINISHING",
  "3D_SCALLOP_FINISHING": "SCALLOP_FINISHING",
  "3D_PENCIL_FINISHING": "PENCIL_FINISHING",
  "3D_REST_MACHINING": "REST_MACHINING",
  "2D_POCKET": "POCKET_2D",
  "2D_CONTOUR": "CONTOUR_2D",
  "2D_FACE": "FACE_MILLING",
  "2D_SLOT": "SLOT_MILLING",
  "DRILL_CENTER": "CENTER_DRILLING",
  "DRILL_STANDARD": "DRILLING",
  "DRILL_PECK": "PECK_DRILLING",
  "DRILL_DEEP_HOLE": "DEEP_HOLE_DRILLING",
  "DRILL_BORE": "BORING",
  "DRILL_REAM": "REAMING",
  "DRILL_TAP": "TAPPING",
  "DRILL_THREAD_MILL": "THREAD_MILLING",
  "5X_SWARF": "SWARF_CUTTING",
  "5X_TANGENT_PLANE": "TANGENT_PLANE",
  "5X_BLADE": "BLADE_MACHINING",
  "5X_IMPELLER": "IMPELLER_MACHINING",
  "5X_PORT": "PORT_MACHINING",
  "5X_TUBE": "TUBE_MACHINING",
  "TURN_OD_ROUGH": "OD_ROUGHING",
  "TURN_OD_FINISH": "OD_FINISHING",
  "TURN_ID_ROUGH": "ID_ROUGHING",
  "TURN_ID_FINISH": "ID_FINISHING",
  "TURN_FACE": "FACE_TURNING",
  "TURN_GROOVE": "GROOVING",
  "TURN_THREAD": "THREAD_TURNING",
  "PROBE_SINGLE": "SINGLE_POINT_PROBE",
  "PROBE_BOSS": "BOSS_PROBE",
  "PROBE_POCKET": "POCKET_PROBE",
  // Additional cycles
  "DRILL_SPOT": "SPOT_DRILLING",
  "DRILL_RIGID_TAP": "RIGID_TAPPING",
  "DRILL_HELICAL": "HELICAL_DRILLING",
  "DRILL_GUN": "GUN_DRILLING",
  "2D_CHAMFER": "CHAMFER_2D",
  "3D_Z_LEVEL_ROUGHING": "Z_LEVEL_ROUGHING",
  "3D_FLOW_LINE": "FLOW_LINE_FINISHING",
  "3D_POINT_MILLING": "POINT_MILLING",
  "5X_MULTI_BLADE": "MULTI_BLADE_MACHINING",
  "TURN_PARTING": "PARTING",
  "TURN_ID_GROOVE": "ID_GROOVING",
};

/** Map cycle codes to operation types.
 * Order matters — specific types (turning, 5axis, drilling, threading, probing)
 * are checked BEFORE generic modifiers (ROUGH, FINISH) to avoid misclassification
 * of e.g. OD_ROUGHING as generic "roughing" instead of "turning".
 */
function classifyOperation(cycleCode: string): SequenceOperation["operationType"] {
  const c = cycleCode.toUpperCase();
  // 1. Specific operation families — ORDER MATTERS:
  //    Threading BEFORE turning (THREAD_TURNING must → "threading", not "turning")
  //    Drilling uses "BOR" not "BORE" (BORING doesn't contain "BORE")
  if (c.includes("TAP") || c.includes("THREAD")) return "threading";
  if (c.includes("TURN") || c.includes("GROOV") || c.includes("FACE_TURNING") || c.includes("OD_") || c.includes("ID_") || c.includes("PARTING")) return "turning";
  if (c.includes("5X") || c.includes("SWARF") || c.includes("BLADE") || c.includes("IMPELLER") || c.includes("PORT") || c.includes("MULTI_BLADE")) return "5axis";
  if (c.includes("DRILL") || c.includes("BOR") || c.includes("REAM") || c.includes("CENTER")) return "drilling";
  if (c.includes("PROBE")) return "probing";
  // 2. Generic modifiers (only reached for milling cycles)
  if (c.includes("REST")) return "rest_machining";
  if (c.includes("SEMI")) return "semi_finishing";
  if (c.includes("ROUGH")) return "roughing";
  if (c.includes("FINISH") || c.includes("PENCIL") || c.includes("SCALLOP") || c.includes("PARALLEL") || c.includes("Z_LEVEL") || c.includes("FLOW_LINE") || c.includes("POINT_MILLING")) return "finishing";
  // 3. 2D operations that don't contain ROUGH/FINISH
  if (c.includes("FACE_MILLING") || c.includes("POCKET") || c.includes("CONTOUR_2D") || c.includes("SLOT") || c.includes("CHAMFER")) return "roughing";
  return "roughing"; // default
}

/** Map tool type strings */
function classifyToolType(typeStr: string): SequenceTool["type"] {
  const t = typeStr.toLowerCase();
  if (t.includes("ball")) return "endmill_ball";
  if (t.includes("torus") || t.includes("bull")) return "endmill_torus";
  if (t.includes("endmill") || t.includes("flat")) return "endmill_flat";
  if (t.includes("face")) return "face_mill";
  if (t.includes("drill")) return "drill";
  if (t.includes("tap")) return "tap";
  if (t.includes("ream")) return "reamer";
  if (t.includes("chamfer")) return "chamfer_mill";
  if (t.includes("thread")) return "thread_mill";
  if (t.includes("boring") || t.includes("bore")) return "boring_bar";
  if (t.includes("insert")) return "insert";
  if (t.includes("probe")) return "probe";
  return "other";
}

/** Infer feature types from cycle code */
function inferFeatureTypes(cycleCode: string): FeatureType[] {
  const c = cycleCode.toUpperCase();
  if (c.includes("POCKET")) return ["pocket_rectangular"];
  if (c.includes("CONTOUR_2D")) return ["contour_2d"];
  if (c.includes("FACE")) return ["face"];
  if (c.includes("SLOT")) return ["slot_through"];
  if (c.includes("DRILL") || c.includes("BORE") || c.includes("REAM")) return ["through_hole"];
  if (c.includes("TAP") || c.includes("THREAD")) return ["tapped_hole"];
  if (c.includes("CONTOUR_3D") || c.includes("SURFACE") || c.includes("PARALLEL")) return ["contour_3d"];
  if (c.includes("Z_LEVEL") || c.includes("REST")) return ["contour_3d"];
  if (c.includes("GROOVE")) return ["groove"];
  if (c.includes("CHAMFER")) return ["chamfer"];
  if (c.includes("PENCIL") || c.includes("SCALLOP")) return ["contour_3d"];
  return ["contour_3d"]; // default for freeform operations
}

/** Classify part type from operations and stock shape */
function classifyPartType(ops: SequenceOperation[], stock: StockDefinition): FeatureSequenceRecord["partType"] {
  const has5axis = ops.some((o) => o.operationType === "5axis");
  const hasTurning = ops.some((o) => o.operationType === "turning");
  const isCylindrical = stock.type === "cylindrical";
  const hasDeepPockets = ops.some((o) => {
    const depth = o.parameters["depth_mm"] ?? o.parameters["stepdown_mm"];
    const dim = Math.min(stock.dimensions.x, stock.dimensions.y);
    return typeof depth === "number" && depth > dim * 0.5;
  });

  if (has5axis) return "freeform";
  if (hasTurning || isCylindrical) return "cylindrical";
  if (hasDeepPockets) return "thin_wall";
  return "prismatic";
}

/** Compute complexity score based on operation diversity and count */
function computeComplexity(ops: SequenceOperation[], features: RecognizedFeature[]): number {
  const opTypes = new Set(ops.map((o) => o.operationType));
  const featureTypes = new Set(features.map((f) => f.type));
  const toolCount = new Set(ops.map((o) => o.tool.toolNumber)).size;

  let score = 0;
  score += Math.min(opTypes.size * 0.8, 3);       // operation diversity (max 3)
  score += Math.min(featureTypes.size * 0.5, 2.5); // feature diversity (max 2.5)
  score += Math.min(toolCount * 0.3, 2);           // tool diversity (max 2)
  score += Math.min(ops.length * 0.1, 2.5);        // operation count (max 2.5)
  return Math.min(Math.round(score * 10) / 10, 10);
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class HMCProjectParserEngine {
  /**
   * Parse a hyperMILL .hmc project file from XML content.
   * Handles both v31 and v33 format variations.
   *
   * @param xmlContent - Raw XML string from the .hmc file
   * @param options - Optional parser configuration
   * @returns HMCParseResult with extracted FeatureSequenceRecord
   */
  parse(xmlContent: string, options?: { projectName?: string }): HMCParseResult {
    const startTime = performance.now();
    const warnings: string[] = [];

    const root = parseXml(xmlContent);

    // Detect version from root attributes or version node
    const hmVersion = this.detectVersion(root);

    // Extract stock definition
    const stock = this.extractStock(root, warnings);

    // Extract WCS/datum frames
    const wcsList = this.extractWCS(root, warnings);

    // Extract tools
    const toolMap = this.extractTools(root);

    // Extract operations (the core sequence)
    const operations = this.extractOperations(root, toolMap, warnings);

    // Infer features from operations
    const features = this.inferFeatures(operations);

    // Compute derived metrics
    const totalCycleTimeSec = operations.reduce(
      (sum, op) => sum + (op.estimatedCycleTimeSec ?? 0), 0
    );
    const uniqueTools = new Set(operations.map((o) => o.tool.toolNumber));
    const toolChanges = this.countToolChanges(operations);
    const partType = classifyPartType(operations, stock);
    const complexityScore = computeComplexity(operations, features);

    // Count extracted parameters
    const parameterCount = operations.reduce(
      (sum, op) => sum + Object.keys(op.parameters).length, 0
    );

    const record: FeatureSequenceRecord = {
      id: `hmc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: "hmc_project",
      partType,
      partName: options?.projectName ?? this.extractProjectName(root) ?? "Unknown Part",
      stock,
      wcsList,
      features,
      operations,
      totalCycleTimeSec,
      toolChangeCount: toolChanges,
      uniqueToolCount: uniqueTools.size,
      hmVersion,
      createdAt: new Date().toISOString(),
      complexityScore,
      warnings,
    };

    const parseTimeMs = performance.now() - startTime;

    return {
      record,
      stats: {
        operationCount: operations.length,
        parameterCount,
        toolCount: uniqueTools.size,
        wcsCount: wcsList.length,
        featureCount: features.length,
        parseTimeMs,
      },
      confidence: this.computeConfidence(operations, stock, wcsList, warnings),
      sourceDescription: `hyperMILL ${hmVersion ?? "unknown"} project file`,
    };
  }

  // ── Version detection ────────────────────────────────────────────────────

  private detectVersion(root: XmlNode): string | undefined {
    // v33 uses <HyperMillProject version="33.0">
    const projectNodes = findNodes(root, "HyperMillProject");
    if (projectNodes.length > 0) {
      const ver = attr(projectNodes[0], "version");
      if (ver) return `v${ver}`;
    }
    // v31 uses <Project> with <Version> child
    const versionNodes = findNodes(root, "Version");
    if (versionNodes.length > 0) {
      const text = versionNodes[0].text.trim();
      if (text) return `v${text}`;
    }
    // Check for hmProject tag (v31)
    const hmProject = findNodes(root, "hmProject");
    if (hmProject.length > 0) {
      return "v31";
    }
    return undefined;
  }

  // ── Stock extraction ─────────────────────────────────────────────────────

  private extractStock(root: XmlNode, warnings: string[]): StockDefinition {
    // Try v33 format: <Stock> or <StockModel>
    const stockNodes = [...findNodes(root, "Stock"), ...findNodes(root, "StockModel"), ...findNodes(root, "Workpiece")];
    if (stockNodes.length > 0) {
      const sn = stockNodes[0];
      const typeStr = attr(sn, "type", "rectangular").toLowerCase();
      const stockType: StockDefinition["type"] =
        typeStr.includes("cyl") ? "cylindrical" :
        typeStr.includes("cast") ? "casting" :
        typeStr.includes("forg") ? "forging" :
        typeStr.includes("stl") ? "stl_model" : "rectangular";

      return {
        type: stockType,
        dimensions: {
          // Use || not ?? — numAttr returns 0 for missing attrs, and 0 is not a valid dimension
          x: numAttr(sn, "sizeX") || numAttr(sn, "length") || 100,
          y: numAttr(sn, "sizeY") || numAttr(sn, "width") || 100,
          z: numAttr(sn, "sizeZ") || numAttr(sn, "height") || 50,
        },
        material: attr(sn, "material", "Steel"),
        isoGroup: this.inferIsoGroup(attr(sn, "material", "Steel")),
        hardnessHB: numAttr(sn, "hardness") || undefined,
      };
    }

    // Try extraction from Material node
    const matNodes = findNodes(root, "Material");
    const materialName = matNodes.length > 0 ? (attr(matNodes[0], "name") || matNodes[0].text.trim() || "Steel") : "Steel";

    warnings.push("Stock definition not found in .hmc — using defaults");
    return {
      type: "rectangular",
      dimensions: { x: 100, y: 100, z: 50 },
      material: materialName,
      isoGroup: this.inferIsoGroup(materialName),
    };
  }

  // ── WCS extraction ───────────────────────────────────────────────────────

  private extractWCS(root: XmlNode, warnings: string[]): WCSDefinition[] {
    const wcsNodes = [...findNodes(root, "WCS"), ...findNodes(root, "CoordinateSystem"), ...findNodes(root, "Datum")];
    if (wcsNodes.length === 0) {
      // Default G54
      return [{
        wcsNumber: 1,
        name: "G54",
        origin: { x: 0, y: 0, z: 0 },
      }];
    }

    return wcsNodes.map((node, i) => ({
      wcsNumber: numAttr(node, "number") || (i + 1),
      name: attr(node, "name") || `G${53 + (i + 1)}`,
      origin: {
        x: numAttr(node, "originX") ?? numAttr(node, "x"),
        y: numAttr(node, "originY") ?? numAttr(node, "y"),
        z: numAttr(node, "originZ") ?? numAttr(node, "z"),
      },
      rotation: numAttr(node, "rotA") || numAttr(node, "rotB") || numAttr(node, "rotC")
        ? { a: numAttr(node, "rotA"), b: numAttr(node, "rotB"), c: numAttr(node, "rotC") }
        : undefined,
    }));
  }

  // ── Tool extraction ──────────────────────────────────────────────────────

  private extractTools(root: XmlNode): Map<string, SequenceTool> {
    const toolMap = new Map<string, SequenceTool>();
    const toolNodes = [...findNodes(root, "Tool"), ...findNodes(root, "ToolAssembly"), ...findNodes(root, "CuttingTool")];

    for (const tn of toolNodes) {
      const id = attr(tn, "id") || attr(tn, "number") || attr(tn, "name");
      if (!id) continue;

      const rawNum = numAttr(tn, "number") || numAttr(tn, "id");
      const rawDiam = numAttr(tn, "diameter") || numAttr(tn, "cuttingDiameter");
      const rawFlutes = numAttr(tn, "fluteCount") || numAttr(tn, "teeth");
      const rawLen = numAttr(tn, "length") || numAttr(tn, "overallLength");
      const rawCorner = numAttr(tn, "cornerRadius") || numAttr(tn, "torusRadius");

      const tool: SequenceTool = {
        toolNumber: rawNum || toolMap.size + 1,
        name: attr(tn, "name") || id,
        type: classifyToolType(attr(tn, "type") || attr(tn, "class") || "endmill"),
        diameterMm: rawDiam || 10,
        fluteCount: rawFlutes || undefined,
        lengthMm: rawLen || undefined,
        cornerRadiusMm: rawCorner || undefined,
      };
      toolMap.set(id, tool);
    }

    return toolMap;
  }

  // ── Operation extraction ─────────────────────────────────────────────────

  private extractOperations(
    root: XmlNode,
    toolMap: Map<string, SequenceTool>,
    warnings: string[]
  ): SequenceOperation[] {
    const opNodes = [
      ...findNodes(root, "Operation"),
      ...findNodes(root, "Job"),
      ...findNodes(root, "MachiningStep"),
    ];

    if (opNodes.length === 0) {
      warnings.push("No operations found in .hmc — file may be empty or use unsupported format");
      return [];
    }

    const operations: SequenceOperation[] = [];

    for (let i = 0; i < opNodes.length; i++) {
      const on = opNodes[i];

      // Resolve cycle code
      const rawCycle = attr(on, "cycle") || attr(on, "type") || attr(on, "strategy") || "UNKNOWN";
      const cycleCode = CYCLE_CODE_MAP[rawCycle] ?? rawCycle;

      // Resolve tool
      const toolRef = attr(on, "toolRef") || attr(on, "tool") || attr(on, "toolId");
      const tool = toolMap.get(toolRef ?? "") ?? this.defaultTool(i);

      // Extract parameters from attributes and child nodes
      const parameters = this.extractOperationParameters(on);

      // Parse dependencies
      const depStr = attr(on, "dependsOn") || attr(on, "after");
      const dependsOn = depStr ? depStr.split(",").map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite) : [];

      // Cycle time from simulation (use ?? to preserve zero values)
      const rawCycleTime = numAttr(on, "cycleTime") || numAttr(on, "estimatedTime");
      const cycleTime = rawCycleTime || undefined;

      operations.push({
        index: i,
        name: attr(on, "name") || `Op_${i + 1}`,
        cycleCode,
        operationType: classifyOperation(cycleCode),
        tool,
        parameters,
        targetFeatures: inferFeatureTypes(cycleCode),
        dependsOn,
        estimatedCycleTimeSec: cycleTime,
      });
    }

    return operations;
  }

  /** Extract parameters from an operation node's attributes and children */
  private extractOperationParameters(node: XmlNode): Record<string, number | string | boolean> {
    const params: Record<string, number | string | boolean> = {};

    // Known parameter attributes
    const numericParams = [
      "stepdown", "stepdown_mm", "ap", "depth_of_cut",
      "stepover", "stepover_mm", "ae", "radial_depth",
      "feed", "feed_mm_min", "feedrate",
      "spindleSpeed", "spindle_rpm", "rpm",
      "clearance_z", "clearance_z_mm",
      "retract_z", "retract_z_mm",
      "depth_mm", "total_depth",
      "tolerance", "tolerance_mm",
      "scallop_height", "cusp_height",
      "tilt_angle", "lead_angle", "lag_angle",
      "approach_distance", "retract_distance",
      "peck_depth", "peck_depth_mm",
      "thread_pitch", "thread_pitch_mm",
      "bore_diameter", "hole_diameter",
    ];

    const stringParams = [
      "approach_type", "retract_type", "coolant_mode", "cut_direction",
      "linking_mode", "entry_method", "spiral_direction", "tool_axis_mode",
    ];

    const booleanParams = [
      "rest_machining", "climb_milling", "use_stock_model", "helical_approach",
      "high_speed_mode", "constant_engagement",
    ];

    for (const p of numericParams) {
      const v = numAttr(node, p);
      if (v !== 0 || node.attrs[p] !== undefined) {
        // Normalize parameter name to snake_case
        const key = p.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/-/g, "_");
        params[key] = v;
      }
    }

    for (const p of stringParams) {
      const v = attr(node, p);
      if (v) params[p] = v;
    }

    for (const p of booleanParams) {
      const v = attr(node, p);
      if (v) params[p] = v === "true" || v === "1";
    }

    // Check child Parameter nodes
    const paramNodes = findNodes(node, "Parameter");
    for (const pn of paramNodes) {
      const name = attr(pn, "name");
      const value = attr(pn, "value") || pn.text.trim();
      if (name && value) {
        const num = parseFloat(value);
        if (Number.isFinite(num)) {
          params[name] = num;
        } else if (value === "true" || value === "false") {
          params[name] = value === "true";
        } else {
          params[name] = value;
        }
      }
    }

    return params;
  }

  // ── Feature inference ────────────────────────────────────────────────────

  /** Infer RecognizedFeatures from operations */
  private inferFeatures(operations: SequenceOperation[]): RecognizedFeature[] {
    const features: RecognizedFeature[] = [];
    const seenTypes = new Set<string>();

    for (const op of operations) {
      for (const ft of op.targetFeatures) {
        const featureKey = `${ft}_${op.cycleCode}`;
        if (seenTypes.has(featureKey)) continue;
        seenTypes.add(featureKey);

        const dims: FeatureDimensions = {};
        if (typeof op.parameters.depth_mm === "number") dims.depth_mm = op.parameters.depth_mm;
        if (typeof op.parameters.bore_diameter === "number") dims.diameter_mm = op.parameters.bore_diameter;
        if (typeof op.parameters.hole_diameter === "number") dims.diameter_mm = op.parameters.hole_diameter;

        features.push({
          id: `feat_${features.length + 1}`,
          type: ft,
          confidence: 0.7, // Inferred from operation, not from geometry
          dimensions: dims,
          position: { x: 0, y: 0, z: 0 },
          orientation: { axis: "z" },
          notes: [`Inferred from operation: ${op.name} (${op.cycleCode})`],
        });
      }
    }

    return features;
  }

  // ── Utility methods ──────────────────────────────────────────────────────

  private defaultTool(index: number): SequenceTool {
    return {
      toolNumber: index + 1,
      name: `T${index + 1}`,
      type: "endmill_flat",
      diameterMm: 10,
    };
  }

  private extractProjectName(root: XmlNode): string | undefined {
    const nameNodes = [...findNodes(root, "ProjectName"), ...findNodes(root, "Name")];
    if (nameNodes.length > 0) {
      return attr(nameNodes[0], "value") || nameNodes[0].text.trim() || undefined;
    }
    return undefined;
  }

  private countToolChanges(operations: SequenceOperation[]): number {
    let changes = 0;
    for (let i = 1; i < operations.length; i++) {
      if (operations[i].tool.toolNumber !== operations[i - 1].tool.toolNumber) {
        changes++;
      }
    }
    return changes;
  }

  /**
   * Infer ISO 513 material group from material name string.
   * Checks specific grades/alloys before generic categories to avoid
   * misclassification (e.g., "Inconel" is S not M, "cast" alone shouldn't
   * match K without "iron" context).
   */
  private inferIsoGroup(material: string): StockDefinition["isoGroup"] | undefined {
    const m = material.toLowerCase();

    // H — Hardened steel (>45 HRC)
    if (m.includes("hardened") || m.includes("hrc") || /(^|\s)tool steel\b/.test(m)) return "H";
    if (/\b(h13|d2|m2|m42|a2|s7|o1|dc53)\b/.test(m)) return "H";

    // S — Superalloys (Ti, Ni-base, Co-base) — check BEFORE M to catch Inconel/Hastelloy
    if (m.includes("inconel") || m.includes("hastelloy") || m.includes("waspaloy") || m.includes("nimonic")) return "S";
    if (m.includes("titanium") || m.includes("ti-6al") || m.includes("ti6al") || /\bti-/.test(m) || m.includes("monel")) return "S";
    if (/\b(2\.\d{4})\b/.test(m)) {
      // Werkstoffnummer: 2.xxxx range covers Ni/Co/Ti alloys
      const wn = m.match(/\b(2\.(\d{4}))\b/);
      if (wn) {
        const num = parseInt(wn[2]);
        if (num >= 4000 && num <= 4999) return "S"; // Ni alloys
        if (num >= 7000 && num <= 7999) return "S"; // Ti alloys
      }
    }

    // N — Non-ferrous (aluminum, copper, brass, magnesium)
    if (m.includes("aluminum") || m.includes("aluminium") || m.includes("alu ")) return "N";
    if (/\b(7075|6061|6082|2024|5083|a356)\b/.test(m)) return "N";
    if (m.includes("copper") || m.includes("brass") || m.includes("bronze")) return "N";
    if (m.includes("magnesium") || m.includes("zinc") || m.includes("mg-")) return "N";

    // K — Cast iron (require "iron" or specific grade to avoid "casting" overmatch)
    if (m.includes("cast iron") || m.includes("grey iron") || m.includes("gray iron") || m.includes("ductile iron")) return "K";
    if (/\b(ggg|gg-|en-gj|astm a48|astm a536|fc[0-9])\b/.test(m)) return "K";
    if (m.includes("graphite iron") || m.includes("spheroidal")) return "K";

    // M — Stainless steel, austenitic/duplex/PH (Inconel already caught above)
    if (m.includes("stainless") || m.includes("duplex") || m.includes("precipitation hardening")) return "M";
    if (/\b(316|304|303|321|347|2205|17-4|15-5|ph13)\b/.test(m)) return "M";
    if (/\b1\.4\d{3}\b/.test(m)) return "M"; // Werkstoffnummer 1.4xxx = stainless

    // P — Carbon/alloy steel (default ferrous)
    if (m.includes("steel") || m.includes("stahl")) return "P";
    if (/\b(1045|4140|4340|8620|p20|1018|1020|s355|c45|42crmo|16mncr)\b/.test(m)) return "P";
    if (/\b1\.[0-3]\d{3}\b/.test(m)) return "P"; // Werkstoffnummer 1.0xxx-1.3xxx = steel

    // Tungsten carbide — treat as H (hardest)
    if (m.includes("carbide") || m.includes("cermet")) return "H";

    return "P"; // Default to steel if unknown
  }

  private computeConfidence(
    operations: SequenceOperation[],
    stock: StockDefinition,
    wcsList: WCSDefinition[],
    warnings: string[]
  ): number {
    let confidence = 1.0;
    if (operations.length === 0) confidence -= 0.4;
    if (stock.dimensions.x === 100 && stock.dimensions.y === 100) confidence -= 0.1; // Used defaults
    if (wcsList.length === 1 && wcsList[0].name === "G54") confidence -= 0.05; // Default WCS
    confidence -= warnings.length * 0.05;
    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

/** Singleton export */
export const hmcProjectParserEngine = new HMCProjectParserEngine();
