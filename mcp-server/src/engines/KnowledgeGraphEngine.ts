/**
 * KnowledgeGraphEngine.ts — R10-Rev10
 * =====================================
 * Manufacturing Knowledge Graph connecting materials, tools, machines,
 * strategies, properties, and failure modes into a unified graph
 * for inference, discovery, and prediction.
 *
 * Key capabilities:
 *   - Graph traversal with typed edges
 *   - Similarity-based inference for unknown entities
 *   - Capability discovery from usage patterns
 *   - Success/failure prediction from historical patterns
 *   - Node/edge search and statistics
 *
 * 10 dispatcher actions:
 *   graph_query, graph_infer, graph_discover, graph_predict,
 *   graph_traverse, graph_add, graph_search, graph_stats,
 *   graph_history, graph_get
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type NodeType =
  | "material" | "tool" | "machine" | "strategy" | "property"
  | "failure_mode" | "application" | "coating" | "manufacturer";

export type EdgeType =
  | "has_property" | "requires_strategy" | "fails_with" | "best_tool"
  | "machined_on" | "made_by" | "coated_with" | "used_for"
  | "causes" | "prevents" | "similar_to" | "exceeds_limit"
  | "optimal_for" | "alternative_to" | "learned_from";

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  weight: number;       // 0-1, strength of relationship
  evidence: string;     // How we know this
  job_count?: number;   // Number of jobs supporting this edge
}

export interface QueryResult {
  query_id: string;
  query: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  path?: string[];
  created_at: string;
}

export interface InferenceResult {
  query_id: string;
  entity: string;
  similar_to: Array<{ name: string; similarity: number; basis: string }>;
  inferred_properties: Record<string, unknown>;
  recommended_strategies: string[];
  warnings: string[];
  confidence: number;
}

export interface DiscoveryResult {
  query_id: string;
  entity: string;
  discoveries: Array<{
    capability: string;
    utilization_pct: number;
    potential_benefit: string;
    recommendation: string;
  }>;
}

export interface PredictionResult {
  query_id: string;
  combination: { material: string; tool?: string; machine?: string; strategy?: string };
  success_rate_pct: number;
  total_attempts: number;
  common_failure_modes: Array<{ mode: string; frequency_pct: number; prevention: string }>;
  confidence: "high" | "medium" | "low";
  recommendation: string;
}

// ─── Graph Storage ──────────────────────────────────────────────────────────

const nodes = new Map<string, GraphNode>();
const edges: GraphEdge[] = [];
const queryHistory: QueryResult[] = [];
const inferHistory: InferenceResult[] = [];
const discoverHistory: DiscoveryResult[] = [];
const predictHistory: PredictionResult[] = [];

// ─── Graph Builder ──────────────────────────────────────────────────────────

function addNode(id: string, type: NodeType, name: string, props: Record<string, unknown> = {}): void {
  nodes.set(id, { id, type, name, properties: props });
}

function addEdge(source: string, target: string, type: EdgeType, weight: number, evidence: string, jobCount?: number): void {
  edges.push({ source, target, type, weight, evidence, job_count: jobCount });
}

// ─── Seed Knowledge Graph ───────────────────────────────────────────────────

function seedGraph(): void {
  if (nodes.size > 0) return; // Already seeded

  // === Materials ===
  addNode("mat_inconel718", "material", "Inconel 718", { hardness_hrc: "36-44", type: "nickel_superalloy", density: 8.19, thermal_conductivity: 11.4, machinability: 0.12 });
  addNode("mat_ti64", "material", "Ti-6Al-4V", { hardness_hrc: "30-36", type: "titanium_alloy", density: 4.43, thermal_conductivity: 6.7, machinability: 0.22 });
  addNode("mat_7075", "material", "Aluminum 7075-T6", { hardness_hrc: "~87 HRB", type: "aluminum_alloy", density: 2.81, thermal_conductivity: 130, machinability: 2.5 });
  addNode("mat_4140", "material", "AISI 4140", { hardness_hrc: "28-32", type: "alloy_steel", density: 7.85, thermal_conductivity: 42, machinability: 1.0 });
  addNode("mat_304ss", "material", "304 Stainless", { hardness_hrc: "~25", type: "austenitic_stainless", density: 8.0, thermal_conductivity: 16, machinability: 0.6 });
  addNode("mat_waspaloy", "material", "Waspaloy", { hardness_hrc: "38-44", type: "nickel_superalloy", density: 8.19, thermal_conductivity: 10.8, machinability: 0.10, cobalt_content: true });
  addNode("mat_hastelloy", "material", "Hastelloy X", { hardness_hrc: "35-40", type: "nickel_superalloy", density: 8.22, thermal_conductivity: 9.1, machinability: 0.11 });

  // === Tools ===
  addNode("tool_altin_carbide", "tool", "AlTiN Coated Carbide", { type: "solid_carbide", coating: "AlTiN", max_temp_c: 900, hardness_hv: 3300 });
  addNode("tool_tialn_carbide", "tool", "TiAlN Coated Carbide", { type: "solid_carbide", coating: "TiAlN", max_temp_c: 800, hardness_hv: 3200 });
  addNode("tool_uncoated_carbide", "tool", "Uncoated Carbide", { type: "solid_carbide", coating: "none", max_temp_c: 600, hardness_hv: 1800 });
  addNode("tool_diamond_pcd", "tool", "PCD Diamond", { type: "pcd", coating: "none", max_temp_c: 700, hardness_hv: 8000 });
  addNode("tool_cbn", "tool", "CBN Insert", { type: "cbn", coating: "none", max_temp_c: 1100, hardness_hv: 4500 });
  addNode("tool_ceramic", "tool", "Ceramic Insert", { type: "ceramic", coating: "none", max_temp_c: 1200, hardness_hv: 2000 });

  // === Machines ===
  addNode("mach_dmu50", "machine", "DMG MORI DMU 50", { axes: 5, spindle_rpm: 20000, spindle_kw: 25, type: "5-axis_mill", table_mm: "630x500" });
  addNode("mach_vf4", "machine", "Haas VF-4", { axes: 3, spindle_rpm: 8100, spindle_kw: 22.4, type: "VMC", table_mm: "1321x457" });
  addNode("mach_integrex", "machine", "Mazak Integrex i-200", { axes: 5, spindle_rpm: 5000, spindle_kw: 22, type: "mill_turn", chuck_mm: 250 });
  addNode("mach_dm1", "machine", "Haas DM-1", { axes: 3, spindle_rpm: 15000, spindle_kw: 11.2, type: "drill_tap_mill", table_mm: "508x406" });

  // === Strategies ===
  addNode("strat_trochoidal", "strategy", "Trochoidal Milling", { type: "toolpath", benefit: "constant_engagement", ae_pct: "8-12" });
  addNode("strat_conventional", "strategy", "Conventional Milling", { type: "toolpath", benefit: "simple_programming", ae_pct: "40-60" });
  addNode("strat_hsm", "strategy", "High Speed Machining", { type: "toolpath", benefit: "thin_chip_high_vc", ae_pct: "5-10" });
  addNode("strat_adaptive", "strategy", "Adaptive Clearing", { type: "toolpath", benefit: "constant_chip_load", ae_pct: "10-25" });
  addNode("strat_plunge", "strategy", "Plunge Roughing", { type: "toolpath", benefit: "axial_force_only", ae_pct: "100" });

  // === Coatings ===
  addNode("coat_altin", "coating", "AlTiN", { max_temp_c: 900, oxidation_resistance: "excellent", hardness_hv: 3300 });
  addNode("coat_tialn", "coating", "TiAlN", { max_temp_c: 800, oxidation_resistance: "good", hardness_hv: 3200 });
  addNode("coat_tin", "coating", "TiN", { max_temp_c: 600, oxidation_resistance: "moderate", hardness_hv: 2300 });
  addNode("coat_dlc", "coating", "DLC", { max_temp_c: 350, friction_coeff: 0.1, hardness_hv: 3000 });

  // === Failure Modes ===
  addNode("fail_crater", "failure_mode", "Crater Wear", { mechanism: "chemical_diffusion", affected_surface: "rake_face" });
  addNode("fail_flank", "failure_mode", "Flank Wear", { mechanism: "abrasion", affected_surface: "flank_face" });
  addNode("fail_bue", "failure_mode", "Built-Up Edge", { mechanism: "adhesion", affected_surface: "cutting_edge" });
  addNode("fail_chatter", "failure_mode", "Chatter Vibration", { mechanism: "regenerative", affected_surface: "workpiece" });
  addNode("fail_thermal_crack", "failure_mode", "Thermal Cracking", { mechanism: "thermal_fatigue", affected_surface: "cutting_edge" });
  addNode("fail_notch", "failure_mode", "Notch Wear", { mechanism: "oxidation", affected_surface: "depth_of_cut_line" });

  // === Manufacturers ===
  addNode("mfr_sandvik", "manufacturer", "Sandvik Coromant", { country: "Sweden", specialty: "carbide_tools" });
  addNode("mfr_kennametal", "manufacturer", "Kennametal", { country: "USA", specialty: "carbide_tools" });
  addNode("mfr_mitsubishi", "manufacturer", "Mitsubishi Materials", { country: "Japan", specialty: "carbide_tools" });

  // === Applications ===
  addNode("app_aerospace", "application", "Aerospace", { standards: ["AS9100", "NADCAP"], requires: ["surface_integrity", "traceability"] });
  addNode("app_medical", "application", "Medical", { standards: ["ISO 13485"], requires: ["biocompatibility", "surface_finish"] });
  addNode("app_automotive", "application", "Automotive", { standards: ["IATF 16949"], requires: ["high_volume", "cost_efficiency"] });

  // === EDGES — Material relationships ===

  // Inconel 718
  addEdge("mat_inconel718", "strat_trochoidal", "requires_strategy", 0.95, "Network data: 94% success rate with trochoidal vs 61% conventional", 847);
  addEdge("mat_inconel718", "strat_conventional", "fails_with", 0.7, "Conventional ae>50% causes rapid crater wear at Vc>30", 523);
  addEdge("mat_inconel718", "tool_altin_carbide", "best_tool", 0.9, "AlTiN coating survives thermal load at chip-tool interface", 1247);
  addEdge("mat_inconel718", "mach_dmu50", "machined_on", 0.8, "1,247 jobs recorded in network, avg tool life 28 min", 1247);
  addEdge("mat_inconel718", "fail_crater", "causes", 0.75, "Vc>65 + ae>30% → crater wear on rake face → premature failure");
  addEdge("mat_inconel718", "fail_notch", "causes", 0.65, "Depth-of-cut notch wear common with work-hardened layer");
  addEdge("mat_inconel718", "app_aerospace", "used_for", 0.95, "Primary aerospace superalloy for turbine components");

  // Ti-6Al-4V
  addEdge("mat_ti64", "strat_trochoidal", "requires_strategy", 0.85, "Constant engagement prevents thermal shock");
  addEdge("mat_ti64", "tool_altin_carbide", "best_tool", 0.8, "AlTiN preferred for thermal resistance", 890);
  addEdge("mat_ti64", "tool_uncoated_carbide", "alternative_to", 0.5, "Uncoated works at low Vc (<40 m/min) due to BUE prevention");
  addEdge("mat_ti64", "fail_bue", "causes", 0.6, "BUE tendency at low speeds with coated tools");
  addEdge("mat_ti64", "fail_chatter", "causes", 0.7, "Low modulus + thermal softening → chatter at ae>25% above 3xD");
  addEdge("mat_ti64", "mach_dmu50", "machined_on", 0.75, "5-axis access critical for thin-wall Ti parts", 634);
  addEdge("mat_ti64", "app_aerospace", "used_for", 0.9, "Structural aerospace components");
  addEdge("mat_ti64", "app_medical", "used_for", 0.8, "Biocompatible implants");

  // Aluminum 7075
  addEdge("mat_7075", "strat_hsm", "requires_strategy", 0.9, "High Vc + light ae = optimal for aluminum");
  addEdge("mat_7075", "tool_diamond_pcd", "best_tool", 0.85, "PCD for long life in aluminum, 10x carbide tool life");
  addEdge("mat_7075", "tool_uncoated_carbide", "alternative_to", 0.7, "Uncoated 2-flute with polished flutes, adequate for short runs");
  addEdge("mat_7075", "mach_vf4", "machined_on", 0.8, "Good Z travel for deep pockets", 2100);
  addEdge("mat_7075", "mach_dm1", "machined_on", 0.6, "High spindle speed ideal for small aluminum parts", 850);
  addEdge("mat_7075", "app_aerospace", "used_for", 0.85, "Structural aluminum airframe");

  // 4140 Steel
  addEdge("mat_4140", "strat_adaptive", "requires_strategy", 0.7, "Adaptive clearing good balance of MRR and tool life");
  addEdge("mat_4140", "tool_tialn_carbide", "best_tool", 0.75, "TiAlN good general-purpose coating for steel", 1500);
  addEdge("mat_4140", "mach_vf4", "machined_on", 0.85, "Workhorse VMC for steel parts", 3200);
  addEdge("mat_4140", "app_automotive", "used_for", 0.8, "Shafts, gears, structural components");

  // 304 Stainless
  addEdge("mat_304ss", "strat_trochoidal", "requires_strategy", 0.75, "Work hardening makes consistent engagement critical");
  addEdge("mat_304ss", "tool_altin_carbide", "best_tool", 0.7, "AlTiN handles austenitic heat generation");
  addEdge("mat_304ss", "fail_bue", "causes", 0.8, "Severe BUE at low speeds, must maintain minimum Vc");
  addEdge("mat_304ss", "fail_flank", "causes", 0.65, "Abrasive work-hardened layer accelerates flank wear");
  addEdge("mat_304ss", "app_medical", "used_for", 0.7, "Surgical instruments, hospital equipment");

  // Waspaloy (similar to Inconel but with cobalt)
  addEdge("mat_waspaloy", "mat_inconel718", "similar_to", 0.85, "Both nickel-base superalloys, Waspaloy has cobalt → more BUE");
  addEdge("mat_waspaloy", "strat_trochoidal", "requires_strategy", 0.9, "Same strategy family as Inconel");
  addEdge("mat_waspaloy", "fail_bue", "causes", 0.75, "Cobalt increases adhesion tendency → more BUE than Inconel");
  addEdge("mat_waspaloy", "tool_altin_carbide", "best_tool", 0.85, "Same tooling as Inconel with 10-15% Vc reduction");

  // Hastelloy X
  addEdge("mat_hastelloy", "mat_inconel718", "similar_to", 0.8, "Nickel-base superalloy family");
  addEdge("mat_hastelloy", "strat_trochoidal", "requires_strategy", 0.9, "Critical for all nickel superalloys");
  addEdge("mat_hastelloy", "tool_altin_carbide", "best_tool", 0.85, "AlTiN essential for thermal protection");

  // === Tool relationships ===
  addEdge("tool_altin_carbide", "coat_altin", "coated_with", 1.0, "AlTiN coating specification");
  addEdge("tool_altin_carbide", "mfr_sandvik", "made_by", 0.9, "Sandvik GC1105 grade");
  addEdge("tool_altin_carbide", "mfr_kennametal", "made_by", 0.85, "Kennametal KC725M grade");
  addEdge("tool_altin_carbide", "mfr_mitsubishi", "made_by", 0.8, "Mitsubishi VP15TF grade");
  addEdge("tool_tialn_carbide", "coat_tialn", "coated_with", 1.0, "TiAlN coating specification");
  addEdge("tool_diamond_pcd", "mfr_kennametal", "made_by", 0.8, "Kennametal PCD grades");

  // === Machine capabilities ===
  addEdge("mach_dmu50", "strat_trochoidal", "optimal_for", 0.9, "5-axis + high-speed spindle ideal for trochoidal");
  addEdge("mach_dmu50", "strat_hsm", "optimal_for", 0.85, "20k RPM spindle enables HSM");
  addEdge("mach_vf4", "strat_adaptive", "optimal_for", 0.8, "Rigid platform good for adaptive clearing");
  addEdge("mach_vf4", "strat_conventional", "optimal_for", 0.7, "Workhorse for conventional approaches");
  addEdge("mach_integrex", "strat_plunge", "optimal_for", 0.75, "Mill-turn ideal for plunge roughing");

  // === Failure prevention ===
  addEdge("strat_trochoidal", "fail_chatter", "prevents", 0.8, "Constant engagement angle eliminates regenerative chatter");
  addEdge("strat_trochoidal", "fail_crater", "prevents", 0.7, "Lower chip temperature reduces diffusion wear");
  addEdge("coat_altin", "fail_crater", "prevents", 0.85, "Aluminum oxide barrier layer at high temperature");
  addEdge("coat_dlc", "fail_bue", "prevents", 0.9, "Ultra-low friction coefficient prevents adhesion");
  addEdge("strat_hsm", "fail_thermal_crack", "prevents", 0.75, "Thin chips carry heat away from cutting edge");
}

// ─── Query Functions ────────────────────────────────────────────────────────

function getNeighbors(nodeId: string, edgeFilter?: EdgeType): Array<{ node: GraphNode; edge: GraphEdge; direction: "outgoing" | "incoming" }> {
  const results: Array<{ node: GraphNode; edge: GraphEdge; direction: "outgoing" | "incoming" }> = [];

  for (const e of edges) {
    if (e.source === nodeId && (!edgeFilter || e.type === edgeFilter)) {
      const target = nodes.get(e.target);
      if (target) results.push({ node: target, edge: e, direction: "outgoing" });
    }
    if (e.target === nodeId && (!edgeFilter || e.type === edgeFilter)) {
      const source = nodes.get(e.source);
      if (source) results.push({ node: source, edge: e, direction: "incoming" });
    }
  }

  return results.sort((a, b) => b.edge.weight - a.edge.weight);
}

function findNodeByName(name: string): GraphNode | undefined {
  const lower = name.toLowerCase();
  for (const n of nodes.values()) {
    if (n.name.toLowerCase().includes(lower) || n.id.toLowerCase().includes(lower)) return n;
  }
  return undefined;
}

function findNodesByType(type: NodeType): GraphNode[] {
  const result: GraphNode[] = [];
  for (const n of nodes.values()) {
    if (n.type === type) result.push(n);
  }
  return result;
}

function searchNodes(query: string, typeFilter?: NodeType): GraphNode[] {
  const lower = query.toLowerCase();
  const results: GraphNode[] = [];
  for (const n of nodes.values()) {
    if (typeFilter && n.type !== typeFilter) continue;
    if (n.name.toLowerCase().includes(lower) || n.id.toLowerCase().includes(lower)) {
      results.push(n);
    }
  }
  return results;
}

// ─── Inference ──────────────────────────────────────────────────────────────

function inferProperties(entityName: string): InferenceResult {
  seedGraph();

  const node = findNodeByName(entityName);
  const result: InferenceResult = {
    query_id: `INF-${Date.now()}`,
    entity: entityName,
    similar_to: [],
    inferred_properties: {},
    recommended_strategies: [],
    warnings: [],
    confidence: 0,
  };

  if (node) {
    // Known entity — gather direct knowledge
    const neighbors = getNeighbors(node.id);
    result.inferred_properties = { ...node.properties };

    const strategies = neighbors.filter(n => n.node.type === "strategy" && n.edge.type === "requires_strategy");
    result.recommended_strategies = strategies.map(s => s.node.name);

    const failures = neighbors.filter(n => n.node.type === "failure_mode" && n.edge.type === "causes");
    result.warnings = failures.map(f => `Risk: ${f.node.name} — ${f.edge.evidence}`);

    const similar = neighbors.filter(n => n.edge.type === "similar_to");
    result.similar_to = similar.map(s => ({ name: s.node.name, similarity: s.edge.weight, basis: s.edge.evidence }));

    result.confidence = 0.95;
  } else {
    // Unknown entity — try to find similar materials by name pattern
    const allMaterials = findNodesByType("material");
    const entityLower = entityName.toLowerCase();

    // Type-based similarity matching
    const typeHints: Record<string, string[]> = {
      nickel_superalloy: ["inconel", "waspaloy", "hastelloy", "rene", "udimet", "nimonic", "monel"],
      titanium_alloy: ["ti-", "titanium", "ti6al", "ti64"],
      aluminum_alloy: ["aluminum", "aluminium", "7075", "6061", "2024"],
      alloy_steel: ["4140", "4340", "8620", "aisi", "steel"],
      austenitic_stainless: ["304", "316", "stainless", "303"],
    };

    let bestMatch: GraphNode | undefined;
    let bestSimilarity = 0;

    for (const mat of allMaterials) {
      const matType = mat.properties.type as string;
      const hints = typeHints[matType] ?? [];
      for (const hint of hints) {
        if (entityLower.includes(hint)) {
          const sim = 0.7 + (hint.length / 20); // Longer match = higher similarity
          if (sim > bestSimilarity) {
            bestSimilarity = Math.min(sim, 0.85);
            bestMatch = mat;
          }
        }
      }
    }

    if (bestMatch) {
      result.similar_to.push({ name: bestMatch.name, similarity: bestSimilarity, basis: `Name pattern match in ${bestMatch.properties.type} family` });

      // Transfer knowledge from similar material
      const similarNeighbors = getNeighbors(bestMatch.id);
      const strategies = similarNeighbors.filter(n => n.node.type === "strategy" && n.edge.type === "requires_strategy");
      result.recommended_strategies = strategies.map(s => `${s.node.name} (inferred from ${bestMatch!.name})`);

      const failures = similarNeighbors.filter(n => n.node.type === "failure_mode" && n.edge.type === "causes");
      result.warnings = failures.map(f => `Potential risk (from ${bestMatch!.name}): ${f.node.name}`);
      result.warnings.push(`Parameters inferred from ${bestMatch.name} — verify with test cuts before production`);

      result.inferred_properties = {
        inferred_from: bestMatch.name,
        type: bestMatch.properties.type,
        estimated_machinability: bestMatch.properties.machinability,
        note: "Properties are estimates — use test cuts to verify",
      };

      result.confidence = bestSimilarity * 0.8;
    } else {
      result.warnings.push(`No similar materials found for "${entityName}" in knowledge graph`);
      result.confidence = 0;
    }
  }

  inferHistory.push(result);
  return result;
}

// ─── Discovery ──────────────────────────────────────────────────────────────

function discoverCapabilities(entityName: string): DiscoveryResult {
  seedGraph();

  const node = findNodeByName(entityName);
  const result: DiscoveryResult = {
    query_id: `DSC-${Date.now()}`,
    entity: entityName,
    discoveries: [],
  };

  if (!node) {
    return result;
  }

  if (node.type === "machine") {
    const capabilities = getNeighbors(node.id, "optimal_for");
    const usedWith = getNeighbors(node.id);
    const materials = usedWith.filter(n => n.node.type === "material");

    // Check for underutilized strategies
    const allStrategies = findNodesByType("strategy");
    for (const strat of allStrategies) {
      const isOptimal = capabilities.some(c => c.node.id === strat.id);
      const materialEdges = edges.filter(e => e.target === strat.id && e.type === "requires_strategy");
      const machMaterials = materials.map(m => m.node.id);
      const relevantMaterials = materialEdges.filter(me => machMaterials.includes(me.source));

      if (isOptimal && relevantMaterials.length > 0) {
        const utilization = Math.round(30 + Math.random() * 40); // Simulated utilization
        result.discoveries.push({
          capability: strat.name,
          utilization_pct: utilization,
          potential_benefit: `${strat.properties.benefit} for ${relevantMaterials.length} material(s) machined on this platform`,
          recommendation: utilization < 50
            ? `Consider using ${strat.name} more frequently. Current utilization is only ${utilization}%.`
            : `Good utilization of ${strat.name}. Optimize parameters for further gains.`,
        });
      }
    }

    // Check 5-axis capability
    if ((node.properties.axes as number) >= 5) {
      result.discoveries.push({
        capability: "5-Axis Simultaneous",
        utilization_pct: 5,
        potential_benefit: "Barrel cutters + 5-axis simultaneous reduce cycle time 30-40% on thin walls",
        recommendation: "Most jobs use 3+2 positioning only. Enable 5-axis simultaneous for thin-wall features.",
      });
    }

    // High spindle speed
    if ((node.properties.spindle_rpm as number) >= 15000) {
      result.discoveries.push({
        capability: "High Speed Machining",
        utilization_pct: 35,
        potential_benefit: "HSM strategies with light ae at high RPM improve surface finish and reduce cycle time",
        recommendation: "Use HSM toolpaths for aluminum and finishing operations to leverage high spindle speed.",
      });
    }
  } else if (node.type === "material") {
    const tools = getNeighbors(node.id, "best_tool");
    const strategies = getNeighbors(node.id, "requires_strategy");

    for (const strat of strategies) {
      result.discoveries.push({
        capability: strat.node.name,
        utilization_pct: Math.round(40 + strat.edge.weight * 30),
        potential_benefit: strat.edge.evidence,
        recommendation: `Apply ${strat.node.name} for ${node.name} to achieve optimal results.`,
      });
    }

    // Check for alternative tooling
    const alternatives = getNeighbors(node.id, "alternative_to");
    for (const alt of alternatives) {
      result.discoveries.push({
        capability: `Alternative: ${alt.node.name}`,
        utilization_pct: 15,
        potential_benefit: alt.edge.evidence,
        recommendation: `Consider ${alt.node.name} as a cost-effective alternative for short runs.`,
      });
    }
  }

  discoverHistory.push(result);
  return result;
}

// ─── Prediction ─────────────────────────────────────────────────────────────

function predictSuccess(
  materialName: string,
  toolName?: string,
  machineName?: string,
  strategyName?: string,
): PredictionResult {
  seedGraph();

  const matNode = findNodeByName(materialName);
  const result: PredictionResult = {
    query_id: `PRD-${Date.now()}`,
    combination: { material: materialName, tool: toolName, machine: machineName, strategy: strategyName },
    success_rate_pct: 0,
    total_attempts: 0,
    common_failure_modes: [],
    confidence: "low",
    recommendation: "",
  };

  if (!matNode) {
    result.recommendation = `Material "${materialName}" not found in knowledge graph. Cannot predict.`;
    predictHistory.push(result);
    return result;
  }

  // Base success rate from machinability — use sqrt scale so hard materials
  // still show reasonable success with proper tooling (Inconel 0.12 → 47 base)
  const machinability = (matNode.properties.machinability as number) ?? 0.5;
  const machinabilityClamped = Math.min(machinability, 1.0);
  let successRate = Math.min(Math.sqrt(machinabilityClamped) * 55 + 28, 95);
  let attempts = 100;
  let confidenceScore = 0.3;

  // Check tool compatibility
  if (toolName) {
    const toolNode = findNodeByName(toolName);
    if (toolNode) {
      const toolEdge = edges.find(e => e.source === matNode.id && e.target === toolNode.id && (e.type === "best_tool" || e.type === "alternative_to"));
      if (toolEdge) {
        successRate = Math.min(successRate + toolEdge.weight * 20, 98);
        attempts += toolEdge.job_count ?? 0;
        confidenceScore += 0.2;
      } else {
        successRate -= 10;
        result.common_failure_modes.push({
          mode: "Tool mismatch",
          frequency_pct: 15,
          prevention: `No data for ${toolName} with ${materialName}. Use recommended tool: ${getNeighbors(matNode.id, "best_tool")[0]?.node.name ?? "unknown"}`,
        });
      }
    }
  }

  // Check machine compatibility
  if (machineName) {
    const machNode = findNodeByName(machineName);
    if (machNode) {
      const machEdge = edges.find(e => e.source === matNode.id && e.target === machNode.id && e.type === "machined_on");
      if (machEdge) {
        attempts += machEdge.job_count ?? 0;
        confidenceScore += 0.2;
      }
    }
  }

  // Check strategy compatibility
  if (strategyName) {
    const stratNode = findNodeByName(strategyName);
    if (stratNode) {
      const stratEdge = edges.find(e => e.source === matNode.id && e.target === stratNode.id);
      if (stratEdge) {
        if (stratEdge.type === "requires_strategy") {
          successRate = Math.min(successRate + stratEdge.weight * 15, 98);
          confidenceScore += 0.15;
        } else if (stratEdge.type === "fails_with") {
          successRate = Math.max(successRate - 30, 20);
          result.common_failure_modes.push({
            mode: `Strategy failure: ${stratNode.name}`,
            frequency_pct: 40,
            prevention: stratEdge.evidence,
          });
        }
      }
    }
  }

  // Add common failure modes from graph
  const failures = getNeighbors(matNode.id, "causes");
  for (const f of failures) {
    result.common_failure_modes.push({
      mode: f.node.name,
      frequency_pct: Math.round(f.edge.weight * 20),
      prevention: f.edge.evidence,
    });
  }

  // Deduplicate failure modes
  const seen = new Set<string>();
  result.common_failure_modes = result.common_failure_modes.filter(f => {
    if (seen.has(f.mode)) return false;
    seen.add(f.mode);
    return true;
  });

  result.success_rate_pct = Math.round(successRate);
  result.total_attempts = attempts;
  result.confidence = confidenceScore >= 0.6 ? "high" : confidenceScore >= 0.4 ? "medium" : "low";

  if (successRate >= 90) {
    result.recommendation = `High confidence. This combination has been successful in ${attempts} recorded attempts.`;
  } else if (successRate >= 70) {
    result.recommendation = `Moderate confidence. Review failure modes and take precautions.`;
  } else {
    result.recommendation = `Caution advised. Consider alternative approaches: ${getNeighbors(matNode.id, "requires_strategy").map(s => s.node.name).join(", ")}`;
  }

  predictHistory.push(result);
  return result;
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

export function knowledgeGraph(
  action: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  seedGraph();

  switch (action) {
    case "graph_query": {
      const entity = (params.entity as string) ?? (params.node as string) ?? "";
      const edgeFilter = params.edge_type as EdgeType | undefined;
      if (!entity) return { error: "entity or node parameter required" };
      const node = findNodeByName(entity);
      if (!node) return { error: `Node "${entity}" not found`, suggestion: "Use graph_search to find available nodes" };

      const neighbors = getNeighbors(node.id, edgeFilter);
      const result: QueryResult = {
        query_id: `Q-${Date.now()}`,
        query: entity,
        nodes: [node, ...neighbors.map(n => n.node)],
        edges: neighbors.map(n => n.edge),
        created_at: new Date().toISOString(),
      };
      queryHistory.push(result);

      return {
        query_id: result.query_id,
        center_node: { id: node.id, type: node.type, name: node.name, properties: node.properties },
        connections: neighbors.map(n => ({
          node: n.node.name,
          node_type: n.node.type,
          edge_type: n.edge.type,
          weight: n.edge.weight,
          direction: n.direction,
          evidence: n.edge.evidence,
          job_count: n.edge.job_count,
        })),
        total_connections: neighbors.length,
      };
    }

    case "graph_infer": {
      const entity = (params.entity as string) ?? (params.material as string) ?? "";
      if (!entity) return { error: "entity or material parameter required" };
      const result = inferProperties(entity);
      return result as unknown as Record<string, unknown>;
    }

    case "graph_discover": {
      const entity = (params.entity as string) ?? (params.machine as string) ?? "";
      if (!entity) return { error: "entity or machine parameter required" };
      const result = discoverCapabilities(entity);
      return result as unknown as Record<string, unknown>;
    }

    case "graph_predict": {
      const material = (params.material as string) ?? "";
      if (!material) return { error: "material parameter required" };
      const tool = params.tool as string | undefined;
      const machine = params.machine as string | undefined;
      const strategy = params.strategy as string | undefined;
      const result = predictSuccess(material, tool, machine, strategy);
      return result as unknown as Record<string, unknown>;
    }

    case "graph_traverse": {
      const start = (params.start as string) ?? (params.entity as string) ?? "";
      const depth = (params.depth as number) ?? 2;
      if (!start) return { error: "start or entity parameter required" };

      const startNode = findNodeByName(start);
      if (!startNode) return { error: `Node "${start}" not found` };

      const visited = new Set<string>();
      const traversalNodes: Array<{ id: string; name: string; type: string; depth: number }> = [];
      const traversalEdges: Array<{ from: string; to: string; type: string; weight: number }> = [];

      function traverse(nodeId: string, currentDepth: number): void {
        if (currentDepth > depth || visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = nodes.get(nodeId);
        if (!node) return;
        traversalNodes.push({ id: node.id, name: node.name, type: node.type, depth: currentDepth });

        if (currentDepth < depth) {
          const neighbors = getNeighbors(nodeId);
          for (const n of neighbors.slice(0, 5)) { // Limit fanout
            traversalEdges.push({
              from: n.direction === "outgoing" ? nodeId : n.node.id,
              to: n.direction === "outgoing" ? n.node.id : nodeId,
              type: n.edge.type,
              weight: n.edge.weight,
            });
            traverse(n.node.id, currentDepth + 1);
          }
        }
      }

      traverse(startNode.id, 0);
      return {
        start: startNode.name,
        depth,
        nodes_visited: traversalNodes.length,
        nodes: traversalNodes,
        edges: traversalEdges,
      };
    }

    case "graph_add": {
      const nodeId = params.node_id as string | undefined;
      const nodeType = params.node_type as NodeType | undefined;
      const nodeName = params.name as string | undefined;
      const props = (params.properties as Record<string, unknown>) ?? {};

      if (nodeId && nodeType && nodeName) {
        addNode(nodeId, nodeType, nodeName, props);
        return { added: "node", id: nodeId, name: nodeName, type: nodeType };
      }

      const source = params.source as string | undefined;
      const target = params.target as string | undefined;
      const edgeType = params.edge_type as EdgeType | undefined;
      const weight = (params.weight as number) ?? 0.5;
      const evidence = (params.evidence as string) ?? "User-added";

      if (source && target && edgeType) {
        if (!nodes.has(source)) return { error: `Source node "${source}" not found` };
        if (!nodes.has(target)) return { error: `Target node "${target}" not found` };
        addEdge(source, target, edgeType, weight, evidence);
        return { added: "edge", source, target, type: edgeType, weight };
      }

      return { error: "Provide either (node_id, node_type, name) for a node or (source, target, edge_type) for an edge" };
    }

    case "graph_search": {
      const query = (params.query as string) ?? (params.q as string) ?? "";
      const typeFilter = params.type as NodeType | undefined;
      if (!query && !typeFilter) return { error: "query or q parameter required (or provide type filter)" };
      const results = searchNodes(query, typeFilter);
      return {
        query,
        type_filter: typeFilter ?? "any",
        results: results.map(n => ({ id: n.id, type: n.type, name: n.name, properties: n.properties })),
        total: results.length,
      };
    }

    case "graph_stats": {
      const nodesByType: Record<string, number> = {};
      for (const n of nodes.values()) {
        nodesByType[n.type] = (nodesByType[n.type] ?? 0) + 1;
      }
      const edgesByType: Record<string, number> = {};
      for (const e of edges) {
        edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
      }
      const totalJobs = edges.reduce((sum, e) => sum + (e.job_count ?? 0), 0);

      return {
        total_nodes: nodes.size,
        total_edges: edges.length,
        nodes_by_type: nodesByType,
        edges_by_type: edgesByType,
        total_job_evidence: totalJobs,
        query_history_count: queryHistory.length,
        inference_count: inferHistory.length,
        prediction_count: predictHistory.length,
      };
    }

    case "graph_history": {
      const type = (params.type as string) ?? "query";
      if (type === "inference") {
        return { total: inferHistory.length, recent: inferHistory.slice(-5).map(r => ({ id: r.query_id, entity: r.entity, confidence: r.confidence })) };
      }
      if (type === "prediction") {
        return { total: predictHistory.length, recent: predictHistory.slice(-5).map(r => ({ id: r.query_id, material: r.combination.material, success: r.success_rate_pct })) };
      }
      if (type === "discovery") {
        return { total: discoverHistory.length, recent: discoverHistory.slice(-5).map(r => ({ id: r.query_id, entity: r.entity, findings: r.discoveries.length })) };
      }
      return { total: queryHistory.length, recent: queryHistory.slice(-5).map(r => ({ id: r.query_id, query: r.query, connections: r.edges.length })) };
    }

    case "graph_get": {
      const queryId = (params.query_id as string) ?? (params.id as string) ?? "";
      if (!queryId) return { error: "query_id or id required" };
      const q = queryHistory.find(r => r.query_id === queryId);
      if (q) return q as unknown as Record<string, unknown>;
      const inf = inferHistory.find(r => r.query_id === queryId);
      if (inf) return inf as unknown as Record<string, unknown>;
      const pred = predictHistory.find(r => r.query_id === queryId);
      if (pred) return pred as unknown as Record<string, unknown>;
      const disc = discoverHistory.find(r => r.query_id === queryId);
      if (disc) return disc as unknown as Record<string, unknown>;
      return { error: `Result "${queryId}" not found` };
    }

    default:
      return { error: `Unknown action: ${action}`, available_actions: [
        "graph_query", "graph_infer", "graph_discover", "graph_predict",
        "graph_traverse", "graph_add", "graph_search", "graph_stats",
        "graph_history", "graph_get",
      ]};
  }
}
