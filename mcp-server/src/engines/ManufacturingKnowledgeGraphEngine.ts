/**
 * ManufacturingKnowledgeGraphEngine.ts
 * =====================================
 * In-memory knowledge graph for manufacturing relationships:
 *   material <-> tool <-> machine <-> operation <-> strategy
 *
 * Enables natural language queries, recommendations from proven setups,
 * and gap detection across the PRISM manufacturing domain.
 *
 * Key capabilities:
 *   - Auto-populate from PRISM ISO material groups, machine capabilities, strategies
 *   - Natural language query with keyword extraction + BFS graph traversal
 *   - Recommendation engine for part setups (material + operation -> tool + strategy)
 *   - Gap detection for untested/uncovered combinations
 *
 * 5 dispatcher actions:
 *   kg_schema, kg_populate, kg_query, kg_recommend, kg_gap
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Node types in the manufacturing knowledge graph */
export type MfgNodeType = "material" | "tool" | "machine" | "operation" | "strategy" | "part";

/** Edge types representing manufacturing relationships */
export type MfgEdgeType =
  | "compatible_with"
  | "recommended_for"
  | "proven_on"
  | "requires"
  | "produces";

/** A node in the manufacturing knowledge graph */
export interface MfgGraphNode {
  /** Unique identifier */
  id: string;
  /** Node category */
  type: MfgNodeType;
  /** Human-readable name */
  name: string;
  /** Arbitrary properties (ISO group, specs, etc.) */
  properties: Record<string, unknown>;
}

/** A directed edge in the manufacturing knowledge graph */
export interface MfgGraphEdge {
  /** Source node id */
  source: string;
  /** Target node id */
  target: string;
  /** Relationship type */
  type: MfgEdgeType;
  /** Relationship strength 0-1 */
  weight: number;
  /** Additional context about this relationship */
  metadata: Record<string, unknown>;
}

/** A scored path result from graph traversal */
export interface MfgPathResult {
  /** Node IDs along the path */
  path: string[];
  /** Relevance score (higher = better) */
  score: number;
  /** Human-readable explanation */
  explanation: string;
}

/** A tool/strategy recommendation */
export interface MfgRecommendation {
  tool: string;
  strategy: string;
  machine?: string;
  confidence: number;
  reason: string;
}

/** A coverage gap */
export interface MfgGap {
  item1: string;
  item2: string;
  reason: string;
}

// ─── ISO Material Groups ────────────────────────────────────────────────────

/** ISO material group definitions for graph population */
const ISO_MATERIAL_GROUPS: Record<string, { name: string; examples: string[]; hardness: string }> = {
  P: { name: "Steel", examples: ["Carbon Steel", "Alloy Steel", "Tool Steel", "Stainless (ferritic)"], hardness: "125-350 HB" },
  M: { name: "Stainless Steel", examples: ["Austenitic SS", "Duplex SS", "Precipitation-Hardened SS", "Martensitic SS"], hardness: "135-350 HB" },
  K: { name: "Cast Iron", examples: ["Grey Cast Iron", "Ductile Iron", "Malleable Iron", "Compacted Graphite"], hardness: "130-330 HB" },
  N: { name: "Non-Ferrous", examples: ["Aluminum", "Copper", "Brass", "Magnesium"], hardness: "30-150 HB" },
  S: { name: "Superalloy / Titanium", examples: ["Inconel 718", "Ti-6Al-4V", "Hastelloy", "Waspaloy"], hardness: "250-450 HB" },
  H: { name: "Hardened Steel", examples: ["Hardened Tool Steel", "Case-Hardened Steel", "Bearing Steel", "Chilled Cast Iron"], hardness: "45-68 HRC" },
};

/** Standard machining operations */
const STANDARD_OPERATIONS = [
  "face_milling", "shoulder_milling", "slot_milling", "plunge_milling",
  "profile_milling", "pocket_milling", "drilling", "reaming",
  "tapping", "boring", "turning_roughing", "turning_finishing",
  "grooving", "threading", "hsm_roughing", "hsm_finishing",
  "3axis_contouring", "5axis_contouring", "deep_hole_drilling", "micro_milling",
];

/** Tool types commonly used in manufacturing */
const TOOL_TYPES = [
  { id: "endmill_carbide", name: "Carbide End Mill", ops: ["face_milling", "shoulder_milling", "slot_milling", "profile_milling", "pocket_milling", "hsm_roughing", "hsm_finishing", "3axis_contouring", "5axis_contouring"] },
  { id: "endmill_hss", name: "HSS End Mill", ops: ["face_milling", "shoulder_milling", "slot_milling", "profile_milling", "pocket_milling"] },
  { id: "face_mill", name: "Indexable Face Mill", ops: ["face_milling", "shoulder_milling", "plunge_milling"] },
  { id: "drill_carbide", name: "Carbide Drill", ops: ["drilling", "deep_hole_drilling"] },
  { id: "drill_hss", name: "HSS Drill", ops: ["drilling"] },
  { id: "reamer", name: "Reamer", ops: ["reaming"] },
  { id: "tap", name: "Tap", ops: ["tapping"] },
  { id: "boring_bar", name: "Boring Bar", ops: ["boring"] },
  { id: "turning_insert", name: "Turning Insert", ops: ["turning_roughing", "turning_finishing", "grooving", "threading"] },
  { id: "ball_endmill", name: "Ball End Mill", ops: ["3axis_contouring", "5axis_contouring", "hsm_finishing"] },
  { id: "bull_endmill", name: "Bull Nose End Mill", ops: ["3axis_contouring", "pocket_milling", "hsm_roughing"] },
  { id: "micro_endmill", name: "Micro End Mill", ops: ["micro_milling"] },
  { id: "gun_drill", name: "Gun Drill", ops: ["deep_hole_drilling"] },
  { id: "thread_mill", name: "Thread Mill", ops: ["threading"] },
  { id: "ceramic_insert", name: "Ceramic Insert", ops: ["turning_roughing", "turning_finishing"] },
  { id: "cbn_insert", name: "CBN Insert", ops: ["turning_finishing"] },
];

/** Machine type capabilities */
const MACHINE_TYPES = [
  { id: "3axis_vmc", name: "3-Axis VMC", ops: ["face_milling", "shoulder_milling", "slot_milling", "plunge_milling", "profile_milling", "pocket_milling", "drilling", "reaming", "tapping", "boring", "hsm_roughing", "hsm_finishing", "3axis_contouring"] },
  { id: "5axis_vmc", name: "5-Axis VMC", ops: ["face_milling", "shoulder_milling", "slot_milling", "plunge_milling", "profile_milling", "pocket_milling", "drilling", "reaming", "tapping", "boring", "hsm_roughing", "hsm_finishing", "3axis_contouring", "5axis_contouring", "micro_milling"] },
  { id: "cnc_lathe", name: "CNC Lathe", ops: ["turning_roughing", "turning_finishing", "grooving", "threading", "drilling", "boring"] },
  { id: "mill_turn", name: "Mill-Turn Center", ops: ["turning_roughing", "turning_finishing", "grooving", "threading", "drilling", "boring", "face_milling", "profile_milling", "pocket_milling"] },
  { id: "swiss_lathe", name: "Swiss-Type Lathe", ops: ["turning_roughing", "turning_finishing", "grooving", "threading", "drilling", "micro_milling"] },
  { id: "horizontal_mc", name: "Horizontal Machining Center", ops: ["face_milling", "shoulder_milling", "slot_milling", "pocket_milling", "drilling", "reaming", "tapping", "boring", "hsm_roughing"] },
  { id: "deep_hole_drill", name: "Deep Hole Drilling Machine", ops: ["deep_hole_drilling", "drilling"] },
];

/** Strategy templates linking material groups to operations */
const STRATEGY_TEMPLATES = [
  { id: "conventional_steel_rough", name: "Conventional Steel Roughing", matGroups: ["P"], ops: ["face_milling", "shoulder_milling", "pocket_milling", "hsm_roughing"], tools: ["endmill_carbide", "face_mill"] },
  { id: "conventional_steel_finish", name: "Conventional Steel Finishing", matGroups: ["P"], ops: ["profile_milling", "3axis_contouring", "hsm_finishing"], tools: ["endmill_carbide", "ball_endmill"] },
  { id: "stainless_adaptive", name: "Stainless Adaptive Milling", matGroups: ["M"], ops: ["pocket_milling", "slot_milling", "hsm_roughing"], tools: ["endmill_carbide", "bull_endmill"] },
  { id: "stainless_finish", name: "Stainless Finishing", matGroups: ["M"], ops: ["profile_milling", "3axis_contouring", "hsm_finishing"], tools: ["endmill_carbide", "ball_endmill"] },
  { id: "cast_iron_rough", name: "Cast Iron Roughing", matGroups: ["K"], ops: ["face_milling", "shoulder_milling", "plunge_milling"], tools: ["face_mill", "endmill_carbide"] },
  { id: "cast_iron_finish", name: "Cast Iron Finishing", matGroups: ["K"], ops: ["profile_milling", "3axis_contouring"], tools: ["endmill_carbide", "ball_endmill"] },
  { id: "aluminum_hsm", name: "Aluminum HSM", matGroups: ["N"], ops: ["hsm_roughing", "hsm_finishing", "pocket_milling"], tools: ["endmill_carbide", "endmill_hss"] },
  { id: "aluminum_finish", name: "Aluminum Mirror Finish", matGroups: ["N"], ops: ["3axis_contouring", "5axis_contouring", "hsm_finishing"], tools: ["ball_endmill", "endmill_carbide"] },
  { id: "superalloy_low_speed", name: "Superalloy Low-Speed Strategy", matGroups: ["S"], ops: ["face_milling", "shoulder_milling", "pocket_milling", "turning_roughing"], tools: ["ceramic_insert", "endmill_carbide"] },
  { id: "superalloy_finish", name: "Superalloy Finishing", matGroups: ["S"], ops: ["profile_milling", "turning_finishing", "5axis_contouring"], tools: ["cbn_insert", "ball_endmill"] },
  { id: "hardened_light_cut", name: "Hardened Steel Light Cuts", matGroups: ["H"], ops: ["hsm_finishing", "profile_milling", "turning_finishing"], tools: ["cbn_insert", "endmill_carbide"] },
  { id: "hardened_hard_turn", name: "Hard Turning Strategy", matGroups: ["H"], ops: ["turning_roughing", "turning_finishing"], tools: ["cbn_insert", "ceramic_insert"] },
  { id: "deep_hole_strategy", name: "Deep Hole Drilling Strategy", matGroups: ["P", "M", "K"], ops: ["deep_hole_drilling"], tools: ["gun_drill", "drill_carbide"] },
  { id: "threading_universal", name: "Universal Threading", matGroups: ["P", "M", "K", "N"], ops: ["threading", "tapping"], tools: ["tap", "thread_mill"] },
  { id: "micro_precision", name: "Micro Precision Machining", matGroups: ["N", "P"], ops: ["micro_milling"], tools: ["micro_endmill"] },
  { id: "5axis_aerospace", name: "5-Axis Aerospace Contouring", matGroups: ["S", "N"], ops: ["5axis_contouring", "3axis_contouring"], tools: ["ball_endmill", "bull_endmill"] },
  { id: "turning_general", name: "General Turning", matGroups: ["P", "M", "K", "N"], ops: ["turning_roughing", "turning_finishing", "grooving"], tools: ["turning_insert"] },
  { id: "boring_precision", name: "Precision Boring", matGroups: ["P", "K", "N"], ops: ["boring"], tools: ["boring_bar"] },
];

// ─── NL Query Helpers ───────────────────────────────────────────────────────

/** Keywords mapped to node IDs for natural language parsing */
const NL_MATERIAL_KEYWORDS: Record<string, string[]> = {
  steel: ["mat_P"],
  "carbon steel": ["mat_P"],
  "alloy steel": ["mat_P"],
  stainless: ["mat_M"],
  "stainless steel": ["mat_M"],
  "cast iron": ["mat_K"],
  aluminum: ["mat_N"],
  aluminium: ["mat_N"],
  copper: ["mat_N"],
  brass: ["mat_N"],
  titanium: ["mat_S"],
  inconel: ["mat_S"],
  superalloy: ["mat_S"],
  hardened: ["mat_H"],
  "hardened steel": ["mat_H"],
};

const NL_OPERATION_KEYWORDS: Record<string, string[]> = {
  milling: ["op_face_milling", "op_shoulder_milling", "op_pocket_milling", "op_profile_milling"],
  "face milling": ["op_face_milling"],
  "pocket milling": ["op_pocket_milling"],
  drilling: ["op_drilling"],
  "deep hole": ["op_deep_hole_drilling"],
  turning: ["op_turning_roughing", "op_turning_finishing"],
  roughing: ["op_face_milling", "op_hsm_roughing", "op_turning_roughing"],
  finishing: ["op_profile_milling", "op_hsm_finishing", "op_turning_finishing", "op_3axis_contouring"],
  hsm: ["op_hsm_roughing", "op_hsm_finishing"],
  "high speed": ["op_hsm_roughing", "op_hsm_finishing"],
  threading: ["op_threading"],
  tapping: ["op_tapping"],
  boring: ["op_boring"],
  reaming: ["op_reaming"],
  grooving: ["op_grooving"],
  contouring: ["op_3axis_contouring", "op_5axis_contouring"],
  "5-axis": ["op_5axis_contouring"],
  "5 axis": ["op_5axis_contouring"],
  "3-axis": ["op_3axis_contouring"],
  micro: ["op_micro_milling"],
};

const NL_MACHINE_KEYWORDS: Record<string, string[]> = {
  vmc: ["mach_3axis_vmc", "mach_5axis_vmc"],
  "3-axis": ["mach_3axis_vmc"],
  "3 axis": ["mach_3axis_vmc"],
  "5-axis": ["mach_5axis_vmc"],
  "5 axis": ["mach_5axis_vmc"],
  lathe: ["mach_cnc_lathe", "mach_swiss_lathe"],
  "mill-turn": ["mach_mill_turn"],
  "mill turn": ["mach_mill_turn"],
  swiss: ["mach_swiss_lathe"],
  horizontal: ["mach_horizontal_mc"],
  hmc: ["mach_horizontal_mc"],
};

const NL_TOOL_KEYWORDS: Record<string, string[]> = {
  "end mill": ["tool_endmill_carbide", "tool_endmill_hss"],
  endmill: ["tool_endmill_carbide", "tool_endmill_hss"],
  carbide: ["tool_endmill_carbide", "tool_drill_carbide"],
  hss: ["tool_endmill_hss", "tool_drill_hss"],
  "face mill": ["tool_face_mill"],
  drill: ["tool_drill_carbide", "tool_drill_hss"],
  reamer: ["tool_reamer"],
  tap: ["tool_tap"],
  "boring bar": ["tool_boring_bar"],
  insert: ["tool_turning_insert", "tool_ceramic_insert", "tool_cbn_insert"],
  "ball end": ["tool_ball_endmill"],
  "ball nose": ["tool_ball_endmill"],
  "bull nose": ["tool_bull_endmill"],
  ceramic: ["tool_ceramic_insert"],
  cbn: ["tool_cbn_insert"],
  "gun drill": ["tool_gun_drill"],
};

// ─── Engine ─────────────────────────────────────────────────────────────────

/**
 * ManufacturingKnowledgeGraphEngine
 *
 * In-memory knowledge graph for manufacturing domain relationships.
 * Supports auto-population from PRISM data, natural language queries,
 * setup recommendations, and coverage gap detection.
 */
export class ManufacturingKnowledgeGraphEngine {
  private nodes: Map<string, MfgGraphNode> = new Map();
  private edges: MfgGraphEdge[] = [];
  /** Adjacency list: nodeId -> [{targetId, edgeIndex}] */
  private adjacency: Map<string, Array<{ target: string; edgeIdx: number }>> = new Map();
  /** Reverse adjacency for bidirectional traversal */
  private reverseAdj: Map<string, Array<{ source: string; edgeIdx: number }>> = new Map();
  private populated = false;

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Main dispatcher entry point — routes action to implementation.
   * @param action - One of: kg_schema, kg_populate, kg_query, kg_recommend, kg_gap
   * @param params - Action-specific parameters
   * @returns Action result object
   */
  calculate(action: string, params: Record<string, unknown> = {}): unknown {
    switch (action) {
      case "kg_schema":
        return this.getSchema();
      case "kg_populate":
        return this.populate();
      case "kg_query":
        return this.query(params);
      case "kg_recommend":
        return this.recommend(params);
      case "kg_gap":
        return this.gap(params);
      default:
        return { error: `Unknown action: ${action}`, validActions: ["kg_schema", "kg_populate", "kg_query", "kg_recommend", "kg_gap"] };
    }
  }

  // ─── kg_schema ──────────────────────────────────────────────────────

  /**
   * Returns the graph schema definition including node/edge types and counts.
   */
  private getSchema(): {
    nodeTypes: MfgNodeType[];
    edgeTypes: MfgEdgeType[];
    nodeCount: number;
    edgeCount: number;
    populated: boolean;
  } {
    return {
      nodeTypes: ["material", "tool", "machine", "operation", "strategy", "part"],
      edgeTypes: ["compatible_with", "recommended_for", "proven_on", "requires", "produces"],
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      populated: this.populated,
    };
  }

  // ─── kg_populate ────────────────────────────────────────────────────

  /**
   * Auto-populates the graph from PRISM manufacturing data:
   *   - ISO material groups (P/M/K/N/S/H)
   *   - Standard machining operations
   *   - Tool types with operation compatibility
   *   - Machine types with capability edges
   *   - Strategy templates linking material->operation->tool chains
   *
   * Idempotent: clears existing graph before populating.
   */
  private populate(): {
    nodesCreated: number;
    edgesCreated: number;
    byType: Record<string, number>;
  } {
    // Clear existing graph
    this.nodes.clear();
    this.edges = [];
    this.adjacency.clear();
    this.reverseAdj.clear();

    const byType: Record<string, number> = {
      material: 0, tool: 0, machine: 0, operation: 0, strategy: 0,
      compatible_with: 0, recommended_for: 0, proven_on: 0, requires: 0, produces: 0,
    };

    // 1. Create material nodes from ISO groups
    for (const [group, info] of Object.entries(ISO_MATERIAL_GROUPS)) {
      this.addNode({
        id: `mat_${group}`,
        type: "material",
        name: `${info.name} (ISO ${group})`,
        properties: { isoGroup: group, examples: info.examples, hardness: info.hardness },
      });
      byType.material++;
    }

    // 2. Create operation nodes
    for (const op of STANDARD_OPERATIONS) {
      this.addNode({
        id: `op_${op}`,
        type: "operation",
        name: op.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        properties: { category: op.includes("turning") || op.includes("grooving") || op.includes("threading") ? "turning" : op.includes("drilling") || op.includes("reaming") || op.includes("tapping") || op.includes("boring") ? "holemaking" : "milling" },
      });
      byType.operation++;
    }

    // 3. Create tool nodes with operation compatibility edges
    for (const tool of TOOL_TYPES) {
      this.addNode({
        id: `tool_${tool.id}`,
        type: "tool",
        name: tool.name,
        properties: { toolType: tool.id, compatibleOps: tool.ops },
      });
      byType.tool++;

      // Tool -> Operation compatibility edges
      for (const op of tool.ops) {
        this.addEdge({
          source: `tool_${tool.id}`,
          target: `op_${op}`,
          type: "compatible_with",
          weight: 0.8,
          metadata: { basis: "tool_capability" },
        });
        byType.compatible_with++;
      }
    }

    // 4. Create machine nodes with operation capability edges
    for (const machine of MACHINE_TYPES) {
      this.addNode({
        id: `mach_${machine.id}`,
        type: "machine",
        name: machine.name,
        properties: { machineType: machine.id, capabilities: machine.ops },
      });
      byType.machine++;

      // Machine -> Operation capability edges
      for (const op of machine.ops) {
        this.addEdge({
          source: `mach_${machine.id}`,
          target: `op_${op}`,
          type: "proven_on",
          weight: 0.85,
          metadata: { basis: "machine_capability" },
        });
        byType.proven_on++;
      }
    }

    // 5. Create strategy nodes with full relationship chains
    for (const strategy of STRATEGY_TEMPLATES) {
      this.addNode({
        id: `strat_${strategy.id}`,
        type: "strategy",
        name: strategy.name,
        properties: {
          materialGroups: strategy.matGroups,
          operations: strategy.ops,
          recommendedTools: strategy.tools,
        },
      });
      byType.strategy++;

      // Strategy -> Operation edges (requires)
      for (const op of strategy.ops) {
        this.addEdge({
          source: `strat_${strategy.id}`,
          target: `op_${op}`,
          type: "requires",
          weight: 0.9,
          metadata: { basis: "strategy_definition" },
        });
        byType.requires++;
      }

      // Strategy -> Material edges (recommended_for)
      for (const matGroup of strategy.matGroups) {
        this.addEdge({
          source: `strat_${strategy.id}`,
          target: `mat_${matGroup}`,
          type: "recommended_for",
          weight: 0.85,
          metadata: { basis: "iso_group_match" },
        });
        byType.recommended_for++;
      }

      // Strategy -> Tool edges (produces — strategy uses tool)
      for (const toolId of strategy.tools) {
        this.addEdge({
          source: `strat_${strategy.id}`,
          target: `tool_${toolId}`,
          type: "produces",
          weight: 0.8,
          metadata: { basis: "strategy_tool_link" },
        });
        byType.produces++;
      }
    }

    // 6. Create material -> tool compatibility edges based on ISO groups
    this.populateMaterialToolEdges(byType);

    this.populated = true;

    return {
      nodesCreated: this.nodes.size,
      edgesCreated: this.edges.length,
      byType,
    };
  }

  /**
   * Creates material -> tool compatibility edges.
   * Different ISO groups favor different tool materials/types.
   */
  private populateMaterialToolEdges(byType: Record<string, number>): void {
    const materialToolMap: Record<string, { tools: string[]; weight: number }> = {
      P: { tools: ["endmill_carbide", "endmill_hss", "face_mill", "drill_carbide", "drill_hss", "turning_insert", "boring_bar", "tap", "reamer", "thread_mill"], weight: 0.85 },
      M: { tools: ["endmill_carbide", "face_mill", "drill_carbide", "turning_insert", "boring_bar", "thread_mill"], weight: 0.75 },
      K: { tools: ["endmill_carbide", "face_mill", "drill_carbide", "turning_insert", "boring_bar", "ceramic_insert"], weight: 0.8 },
      N: { tools: ["endmill_carbide", "endmill_hss", "drill_carbide", "drill_hss", "face_mill", "turning_insert", "micro_endmill", "ball_endmill"], weight: 0.9 },
      S: { tools: ["endmill_carbide", "ceramic_insert", "cbn_insert", "drill_carbide", "ball_endmill"], weight: 0.65 },
      H: { tools: ["cbn_insert", "ceramic_insert", "endmill_carbide"], weight: 0.7 },
    };

    for (const [group, info] of Object.entries(materialToolMap)) {
      for (const toolId of info.tools) {
        this.addEdge({
          source: `mat_${group}`,
          target: `tool_${toolId}`,
          type: "compatible_with",
          weight: info.weight,
          metadata: { basis: "iso_group_compatibility", isoGroup: group },
        });
        byType.compatible_with++;
      }
    }
  }

  // ─── kg_query ───────────────────────────────────────────────────────

  /**
   * Natural language query interface.
   * Parses query for material, operation, machine, and tool mentions,
   * then traverses the graph to find matching paths.
   *
   * @param params - { query: string }
   * @returns Matching paths with scores and explanations
   */
  private query(params: Record<string, unknown>): {
    results: MfgPathResult[];
    totalPaths: number;
    parsedEntities: { materials: string[]; operations: string[]; machines: string[]; tools: string[] };
  } {
    const query = String(params.query || "").toLowerCase().trim();
    if (!query) {
      return { results: [], totalPaths: 0, parsedEntities: { materials: [], operations: [], machines: [], tools: [] } };
    }

    this.ensurePopulated();

    // Extract entities from natural language
    const materials = this.extractEntities(query, NL_MATERIAL_KEYWORDS);
    const operations = this.extractEntities(query, NL_OPERATION_KEYWORDS);
    const machines = this.extractEntities(query, NL_MACHINE_KEYWORDS);
    const tools = this.extractEntities(query, NL_TOOL_KEYWORDS);

    const allSeeds = [...new Set([...materials, ...operations, ...machines, ...tools])];

    if (allSeeds.length === 0) {
      return {
        results: [{ path: [], score: 0, explanation: "No recognized manufacturing entities found in query. Try mentioning a material (e.g., steel, aluminum), operation (e.g., milling, drilling), machine type (e.g., 5-axis, lathe), or tool (e.g., end mill, carbide)." }],
        totalPaths: 0,
        parsedEntities: { materials: [], operations: [], machines: [], tools: [] },
      };
    }

    // BFS from each seed, collect reachable paths
    const results: MfgPathResult[] = [];
    const seen = new Set<string>();

    for (const seed of allSeeds) {
      const paths = this.bfsTraverse(seed, 3); // max depth 3
      for (const p of paths) {
        const key = p.path.join("->");
        if (!seen.has(key)) {
          seen.add(key);
          // Score: base from edge weights, bonus if path connects multiple seed entities
          const seedHits = p.path.filter(n => allSeeds.includes(n)).length;
          p.score = p.score * (1 + (seedHits - 1) * 0.3);
          p.explanation = this.explainPath(p.path);
          results.push(p);
        }
      }
    }

    // Sort by score descending, limit to top 20
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, 20);

    return {
      results: topResults,
      totalPaths: results.length,
      parsedEntities: {
        materials: materials.map(id => this.nodes.get(id)?.name || id),
        operations: operations.map(id => this.nodes.get(id)?.name || id),
        machines: machines.map(id => this.nodes.get(id)?.name || id),
        tools: tools.map(id => this.nodes.get(id)?.name || id),
      },
    };
  }

  /**
   * Extract node IDs matching keywords in the query string.
   */
  private extractEntities(query: string, keywordMap: Record<string, string[]>): string[] {
    const found: string[] = [];
    // Sort by keyword length descending so longer phrases match first
    const sortedKeys = Object.keys(keywordMap).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeys) {
      if (query.includes(keyword)) {
        for (const nodeId of keywordMap[keyword]) {
          if (this.nodes.has(nodeId) && !found.includes(nodeId)) {
            found.push(nodeId);
          }
        }
      }
    }
    return found;
  }

  /**
   * BFS traversal from a seed node, collecting paths up to maxDepth.
   */
  private bfsTraverse(seedId: string, maxDepth: number): MfgPathResult[] {
    const results: MfgPathResult[] = [];
    // Queue: [currentNodeId, path so far, accumulated weight product]
    const queue: Array<[string, string[], number]> = [[seedId, [seedId], 1.0]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [current, path, score] = queue.shift()!;

      if (path.length > 1) {
        results.push({ path: [...path], score, explanation: "" });
      }

      if (path.length > maxDepth) continue;

      // Forward edges
      const fwd = this.adjacency.get(current) || [];
      for (const { target, edgeIdx } of fwd) {
        const visitKey = `${current}->${target}`;
        if (!visited.has(visitKey) && !path.includes(target)) {
          visited.add(visitKey);
          const edge = this.edges[edgeIdx];
          queue.push([target, [...path, target], score * edge.weight]);
        }
      }

      // Reverse edges (bidirectional traversal)
      const rev = this.reverseAdj.get(current) || [];
      for (const { source, edgeIdx } of rev) {
        const visitKey = `${source}->${current}`;
        if (!visited.has(visitKey) && !path.includes(source)) {
          visited.add(visitKey);
          const edge = this.edges[edgeIdx];
          queue.push([source, [...path, source], score * edge.weight * 0.9]); // slight penalty for reverse
        }
      }
    }

    return results;
  }

  /**
   * Generate a human-readable explanation for a path of node IDs.
   */
  private explainPath(path: string[]): string {
    const names = path.map(id => this.nodes.get(id)?.name || id);
    if (names.length === 2) {
      return `${names[0]} connects to ${names[1]}`;
    }
    return `${names[0]} -> ${names.slice(1).join(" -> ")}`;
  }

  // ─── kg_recommend ───────────────────────────────────────────────────

  /**
   * Generates recommendations for a part setup.
   *
   * @param params - { material: string, operation?: string, machineType?: string, constraints?: Record<string,unknown> }
   * @returns Ranked recommendations with confidence scores
   */
  private recommend(params: Record<string, unknown>): {
    recommendations: MfgRecommendation[];
    alternatives: MfgRecommendation[];
    input: Record<string, unknown>;
  } {
    this.ensurePopulated();

    const material = String(params.material || "").toUpperCase();
    const operation = params.operation ? String(params.operation).toLowerCase().replace(/\s+/g, "_") : undefined;
    const machineType = params.machineType ? String(params.machineType).toLowerCase().replace(/[\s-]+/g, "_") : undefined;

    // Resolve material node
    const matNodeId = this.resolveMaterialNode(material);
    if (!matNodeId) {
      return {
        recommendations: [],
        alternatives: [],
        input: params,
      };
    }

    // Find compatible tools for this material
    const compatibleTools = this.getNeighbors(matNodeId, "compatible_with")
      .filter(n => this.nodes.get(n.nodeId)?.type === "tool");

    // Find strategies recommended for this material
    const strategies = this.getNeighborsReverse(matNodeId, "recommended_for")
      .filter(n => this.nodes.get(n.nodeId)?.type === "strategy");

    // Build recommendations by matching strategies to tools
    const recommendations: MfgRecommendation[] = [];
    const alternatives: MfgRecommendation[] = [];

    for (const strat of strategies) {
      const stratNode = this.nodes.get(strat.nodeId);
      if (!stratNode) continue;

      const stratOps = (stratNode.properties.operations as string[]) || [];
      const stratTools = (stratNode.properties.recommendedTools as string[]) || [];

      // Filter by operation if specified
      if (operation && !stratOps.some(o => o.includes(operation) || operation.includes(o))) {
        continue;
      }

      // Find matching tools
      for (const toolId of stratTools) {
        const toolNodeId = `tool_${toolId}`;
        const toolNode = this.nodes.get(toolNodeId);
        if (!toolNode) continue;

        // Check tool is compatible with material
        const toolCompat = compatibleTools.find(t => t.nodeId === toolNodeId);
        const toolWeight = toolCompat ? toolCompat.weight : 0.5;

        // Check machine compatibility if specified
        let machineMatch: string | undefined;
        let machineBonus = 0;
        if (machineType) {
          const machNodeId = `mach_${machineType}`;
          if (this.nodes.has(machNodeId)) {
            machineMatch = this.nodes.get(machNodeId)!.name;
            const machCaps = (this.nodes.get(machNodeId)!.properties.capabilities as string[]) || [];
            if (stratOps.some(o => machCaps.includes(o))) {
              machineBonus = 0.1;
            }
          }
        }

        const confidence = Math.min(1.0, (strat.weight * 0.4 + toolWeight * 0.4 + 0.2 + machineBonus));
        const reasons: string[] = [
          `Strategy "${stratNode.name}" recommended for ISO ${material}`,
          `Tool "${toolNode.name}" compatible (weight=${toolWeight.toFixed(2)})`,
        ];
        if (machineMatch) reasons.push(`Machine "${machineMatch}" capable`);

        const rec: MfgRecommendation = {
          tool: toolNode.name,
          strategy: stratNode.name,
          machine: machineMatch,
          confidence: Math.round(confidence * 100) / 100,
          reason: reasons.join("; "),
        };

        if (confidence >= 0.7) {
          recommendations.push(rec);
        } else {
          alternatives.push(rec);
        }
      }
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);
    alternatives.sort((a, b) => b.confidence - a.confidence);

    return {
      recommendations: recommendations.slice(0, 10),
      alternatives: alternatives.slice(0, 5),
      input: { material, operation, machineType },
    };
  }

  /**
   * Resolve a material input string to a graph node ID.
   * Accepts ISO group letter (P/M/K/N/S/H) or material name keywords.
   */
  private resolveMaterialNode(input: string): string | null {
    // Direct ISO group match
    if (ISO_MATERIAL_GROUPS[input]) {
      return `mat_${input}`;
    }
    // Keyword search
    const lower = input.toLowerCase();
    for (const [keyword, nodeIds] of Object.entries(NL_MATERIAL_KEYWORDS)) {
      if (lower.includes(keyword)) {
        return nodeIds[0] || null;
      }
    }
    return null;
  }

  // ─── kg_gap ─────────────────────────────────────────────────────────

  /**
   * Finds untested/uncovered combinations in the knowledge graph.
   *
   * @param params - { dimension: 'material_tool' | 'material_operation' | 'machine_operation' }
   * @returns Coverage percentage, specific gaps, and coverage map
   */
  private gap(params: Record<string, unknown>): {
    dimension: string;
    coverage: number;
    gaps: MfgGap[];
    coverageMap: Record<string, string[]>;
    totalPossible: number;
    totalCovered: number;
  } {
    this.ensurePopulated();

    const dimension = String(params.dimension || "material_tool");

    switch (dimension) {
      case "material_tool":
        return this.computeGap("material", "tool", ["compatible_with"]);
      case "material_operation":
        return this.computeGap("material", "operation", ["compatible_with", "recommended_for", "requires"]);
      case "machine_operation":
        return this.computeGap("machine", "operation", ["proven_on"]);
      default:
        return {
          dimension,
          coverage: 0,
          gaps: [{ item1: "unknown", item2: "unknown", reason: `Invalid dimension: ${dimension}. Use: material_tool, material_operation, machine_operation` }],
          coverageMap: {},
          totalPossible: 0,
          totalCovered: 0,
        };
    }
  }

  /**
   * Computes coverage gaps between two node types across specified edge types.
   */
  private computeGap(
    typeA: MfgNodeType,
    typeB: MfgNodeType,
    edgeTypes: MfgEdgeType[]
  ): {
    dimension: string;
    coverage: number;
    gaps: MfgGap[];
    coverageMap: Record<string, string[]>;
    totalPossible: number;
    totalCovered: number;
  } {
    const nodesA = [...this.nodes.values()].filter(n => n.type === typeA);
    const nodesB = [...this.nodes.values()].filter(n => n.type === typeB);

    const coverageMap: Record<string, string[]> = {};
    const gaps: MfgGap[] = [];
    let totalCovered = 0;
    const totalPossible = nodesA.length * nodesB.length;

    for (const a of nodesA) {
      coverageMap[a.name] = [];

      // Find all B nodes connected to A via any of the given edge types (fwd or rev)
      const connectedB = new Set<string>();

      // Forward: A -> B
      const fwd = this.adjacency.get(a.id) || [];
      for (const { target, edgeIdx } of fwd) {
        const edge = this.edges[edgeIdx];
        const targetNode = this.nodes.get(target);
        if (targetNode?.type === typeB && edgeTypes.includes(edge.type)) {
          connectedB.add(target);
        }
      }

      // Reverse: B -> A
      const rev = this.reverseAdj.get(a.id) || [];
      for (const { source, edgeIdx } of rev) {
        const edge = this.edges[edgeIdx];
        const sourceNode = this.nodes.get(source);
        if (sourceNode?.type === typeB && edgeTypes.includes(edge.type)) {
          connectedB.add(source);
        }
      }

      // Also check indirect: A -> intermediate -> B (2-hop)
      for (const { target: mid } of fwd) {
        const midFwd = this.adjacency.get(mid) || [];
        for (const { target: t2, edgeIdx: ei2 } of midFwd) {
          const e2 = this.edges[ei2];
          const tn = this.nodes.get(t2);
          if (tn?.type === typeB && edgeTypes.includes(e2.type)) {
            connectedB.add(t2);
          }
        }
      }

      for (const b of nodesB) {
        if (connectedB.has(b.id)) {
          coverageMap[a.name].push(b.name);
          totalCovered++;
        } else {
          gaps.push({
            item1: a.name,
            item2: b.name,
            reason: `No ${edgeTypes.join("/")} relationship found between ${a.name} and ${b.name}`,
          });
        }
      }
    }

    const coverage = totalPossible > 0 ? Math.round((totalCovered / totalPossible) * 10000) / 100 : 0;

    return {
      dimension: `${typeA}_${typeB}`,
      coverage,
      gaps: gaps.slice(0, 50), // Limit output
      coverageMap,
      totalPossible,
      totalCovered,
    };
  }

  // ─── Graph Primitives ───────────────────────────────────────────────

  /** Add a node to the graph */
  private addNode(node: MfgGraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, []);
    if (!this.reverseAdj.has(node.id)) this.reverseAdj.set(node.id, []);
  }

  /** Add an edge to the graph */
  private addEdge(edge: MfgGraphEdge): void {
    const idx = this.edges.length;
    this.edges.push(edge);

    if (!this.adjacency.has(edge.source)) this.adjacency.set(edge.source, []);
    this.adjacency.get(edge.source)!.push({ target: edge.target, edgeIdx: idx });

    if (!this.reverseAdj.has(edge.target)) this.reverseAdj.set(edge.target, []);
    this.reverseAdj.get(edge.target)!.push({ source: edge.source, edgeIdx: idx });
  }

  /** Get forward neighbors of a node filtered by edge type */
  private getNeighbors(nodeId: string, edgeType: MfgEdgeType): Array<{ nodeId: string; weight: number }> {
    const adj = this.adjacency.get(nodeId) || [];
    return adj
      .filter(({ edgeIdx }) => this.edges[edgeIdx].type === edgeType)
      .map(({ target, edgeIdx }) => ({ nodeId: target, weight: this.edges[edgeIdx].weight }));
  }

  /** Get reverse neighbors (nodes pointing to this node) filtered by edge type */
  private getNeighborsReverse(nodeId: string, edgeType: MfgEdgeType): Array<{ nodeId: string; weight: number }> {
    const rev = this.reverseAdj.get(nodeId) || [];
    return rev
      .filter(({ edgeIdx }) => this.edges[edgeIdx].type === edgeType)
      .map(({ source, edgeIdx }) => ({ nodeId: source, weight: this.edges[edgeIdx].weight }));
  }

  /** Auto-populate if not yet populated */
  private ensurePopulated(): void {
    if (!this.populated) {
      this.populate();
    }
  }
}

/** Singleton instance */
export const manufacturingKnowledgeGraphEngine = new ManufacturingKnowledgeGraphEngine();
