/**
 * R10-Rev10 — Manufacturing Knowledge Graph tests
 * Tests: graph_query, graph_infer, graph_discover, graph_predict,
 *        graph_traverse, graph_add, graph_search, graph_stats,
 *        graph_history, graph_get
 */
import { knowledgeGraph } from "../../src/engines/KnowledgeGraphEngine.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label}`); }
}

// ─── T1: graph_query — Inconel 718 ─────────────────────────────────────────

console.log("T1: Query — Inconel 718");
const t1 = knowledgeGraph("graph_query", { entity: "Inconel 718" });
assert(t1.query_id !== undefined, "T1.1 has query_id");
assert((t1.center_node as any).name === "Inconel 718", "T1.2 correct center node");
assert((t1.center_node as any).type === "material", "T1.3 material type");
assert((t1.total_connections as number) > 0, "T1.4 has connections");
const conns1 = t1.connections as any[];
assert(conns1.some((c: any) => c.node === "Trochoidal Milling"), "T1.5 connected to trochoidal");
assert(conns1.some((c: any) => c.node === "AlTiN Coated Carbide"), "T1.6 connected to AlTiN tool");
assert(conns1.some((c: any) => c.node === "DMG MORI DMU 50"), "T1.7 connected to DMU 50");
assert(conns1.some((c: any) => c.node === "Crater Wear"), "T1.8 connected to crater wear");

// ─── T2: graph_query — with edge filter ─────────────────────────────────────

console.log("T2: Query — edge filter");
const t2 = knowledgeGraph("graph_query", { entity: "Inconel 718", edge_type: "requires_strategy" });
const conns2 = t2.connections as any[];
assert(conns2.every((c: any) => c.edge_type === "requires_strategy"), "T2.1 all edges match filter");
assert(conns2.length > 0, "T2.2 has filtered connections");

// ─── T3: graph_query — not found ────────────────────────────────────────────

console.log("T3: Query — not found");
const t3 = knowledgeGraph("graph_query", { entity: "Unobtanium" });
assert(t3.error !== undefined, "T3.1 error for unknown entity");

// ─── T4: graph_query — no entity ────────────────────────────────────────────

console.log("T4: Query — no entity");
const t4 = knowledgeGraph("graph_query", {});
assert(t4.error !== undefined, "T4.1 error for missing entity");

// ─── T5: graph_query — aluminum ─────────────────────────────────────────────

console.log("T5: Query — aluminum");
const t5 = knowledgeGraph("graph_query", { entity: "7075" });
assert((t5.center_node as any).name === "Aluminum 7075-T6", "T5.1 aluminum found");
const conns5 = t5.connections as any[];
assert(conns5.some((c: any) => c.node === "High Speed Machining"), "T5.2 connected to HSM");
assert(conns5.some((c: any) => c.node === "PCD Diamond"), "T5.3 connected to PCD");

// ─── T6: graph_infer — known material ──────────────────────────────────────

console.log("T6: Infer — known material");
const t6 = knowledgeGraph("graph_infer", { entity: "Inconel 718" });
assert(t6.query_id !== undefined, "T6.1 has query_id");
assert((t6.confidence as number) > 0.9, "T6.2 high confidence for known material");
const strategies6 = t6.recommended_strategies as string[];
assert(strategies6.length > 0, "T6.3 has recommended strategies");
assert(strategies6.some((s: string) => s.includes("Trochoidal")), "T6.4 recommends trochoidal");
const warnings6 = t6.warnings as string[];
assert(warnings6.length > 0, "T6.5 has warnings about failure modes");

// ─── T7: graph_infer — unknown superalloy ───────────────────────────────────

console.log("T7: Infer — unknown superalloy");
const t7 = knowledgeGraph("graph_infer", { entity: "Nimonic 80A" });
const similar7 = t7.similar_to as any[];
assert(similar7.length > 0, "T7.1 found similar material");
assert(similar7[0].name.includes("Inconel") || similar7[0].name.includes("Waspaloy") || similar7[0].name.includes("Hastelloy"), "T7.2 matched to nickel superalloy");
assert((t7.confidence as number) > 0, "T7.3 positive confidence");
assert((t7.confidence as number) < 0.9, "T7.4 lower confidence than known material");
const warnings7 = t7.warnings as string[];
assert(warnings7.some((w: string) => w.includes("verify") || w.includes("test")), "T7.5 warns to verify");

// ─── T8: graph_infer — completely unknown ───────────────────────────────────

console.log("T8: Infer — completely unknown");
const t8 = knowledgeGraph("graph_infer", { entity: "Phlebotinum" });
assert((t8.confidence as number) === 0, "T8.1 zero confidence for unknown");
const warnings8 = t8.warnings as string[];
assert(warnings8.length > 0, "T8.2 has warning");

// ─── T9: graph_infer — unknown titanium ─────────────────────────────────────

console.log("T9: Infer — unknown titanium alloy");
const t9 = knowledgeGraph("graph_infer", { entity: "Ti-5553" });
const similar9 = t9.similar_to as any[];
assert(similar9.length > 0, "T9.1 found similar");
assert(similar9[0].name.includes("Ti"), "T9.2 matched to titanium family");

// ─── T10: graph_discover — machine ──────────────────────────────────────────

console.log("T10: Discover — DMU 50");
const t10 = knowledgeGraph("graph_discover", { entity: "DMU 50" });
assert(t10.query_id !== undefined, "T10.1 has query_id");
const disc10 = t10.discoveries as any[];
assert(disc10.length > 0, "T10.2 has discoveries");
assert(disc10.some((d: any) => d.capability.includes("5-Axis")), "T10.3 discovers 5-axis capability");
assert(disc10.some((d: any) => d.capability.includes("High Speed")), "T10.4 discovers HSM capability");
assert(disc10.every((d: any) => d.utilization_pct >= 0 && d.recommendation), "T10.5 all have utilization and recommendation");

// ─── T11: graph_discover — material ─────────────────────────────────────────

console.log("T11: Discover — material capabilities");
const t11 = knowledgeGraph("graph_discover", { entity: "Ti-6Al-4V" });
const disc11 = t11.discoveries as any[];
assert(disc11.length > 0, "T11.1 has discoveries for material");

// ─── T12: graph_discover — not found ────────────────────────────────────────

console.log("T12: Discover — not found");
const t12 = knowledgeGraph("graph_discover", { entity: "Unknown Machine" });
assert((t12.discoveries as any[]).length === 0, "T12.1 no discoveries for unknown");

// ─── T13: graph_predict — good combination ──────────────────────────────────

console.log("T13: Predict — good combination");
const t13 = knowledgeGraph("graph_predict", {
  material: "Inconel 718",
  tool: "AlTiN",
  machine: "DMU 50",
  strategy: "Trochoidal",
});
assert(t13.query_id !== undefined, "T13.1 has query_id");
assert((t13.success_rate_pct as number) > 70, "T13.2 high success rate for good combo");
assert((t13.total_attempts as number) > 0, "T13.3 has attempt data");
const failures13 = t13.common_failure_modes as any[];
assert(failures13.length > 0, "T13.4 lists common failure modes");
assert(failures13.every((f: any) => f.mode && f.frequency_pct >= 0 && f.prevention), "T13.5 failure modes have details");
assert(["high", "medium", "low"].includes(t13.confidence as string), "T13.6 valid confidence level");

// ─── T14: graph_predict — bad strategy ──────────────────────────────────────

console.log("T14: Predict — bad strategy");
const t14 = knowledgeGraph("graph_predict", {
  material: "Inconel 718",
  strategy: "Conventional",
});
const t14good = knowledgeGraph("graph_predict", {
  material: "Inconel 718",
  strategy: "Trochoidal",
});
assert((t14.success_rate_pct as number) < (t14good.success_rate_pct as number), "T14.1 conventional worse than trochoidal for Inconel");

// ─── T15: graph_predict — unknown material ──────────────────────────────────

console.log("T15: Predict — unknown material");
const t15 = knowledgeGraph("graph_predict", { material: "Unknown Alloy" });
assert(t15.recommendation !== undefined, "T15.1 has recommendation");
assert((t15.recommendation as string).includes("not found"), "T15.2 indicates unknown material");

// ─── T16: graph_predict — material only ─────────────────────────────────────

console.log("T16: Predict — material only");
const t16 = knowledgeGraph("graph_predict", { material: "4140" });
assert((t16.success_rate_pct as number) > 0, "T16.1 positive success rate");
assert(t16.confidence === "low" || t16.confidence === "medium", "T16.2 lower confidence without tool/machine");

// ─── T17: graph_traverse — depth 1 ─────────────────────────────────────────

console.log("T17: Traverse — depth 1");
const t17 = knowledgeGraph("graph_traverse", { start: "Inconel 718", depth: 1 });
assert((t17.nodes_visited as number) > 1, "T17.1 visited multiple nodes");
const nodes17 = t17.nodes as any[];
assert(nodes17[0].depth === 0, "T17.2 start node at depth 0");
assert(nodes17.some((n: any) => n.depth === 1), "T17.3 has depth-1 nodes");
assert(!nodes17.some((n: any) => n.depth > 1), "T17.4 no depth-2 nodes");

// ─── T18: graph_traverse — depth 2 ─────────────────────────────────────────

console.log("T18: Traverse — depth 2");
const t18 = knowledgeGraph("graph_traverse", { start: "Inconel 718", depth: 2 });
const nodes18 = t18.nodes as any[];
assert(nodes18.some((n: any) => n.depth === 2), "T18.1 has depth-2 nodes");
assert((t18.nodes_visited as number) > (t17.nodes_visited as number), "T18.2 depth 2 visits more nodes");

// ─── T19: graph_traverse — not found ────────────────────────────────────────

console.log("T19: Traverse — not found");
const t19 = knowledgeGraph("graph_traverse", { start: "Unknown" });
assert(t19.error !== undefined, "T19.1 error for unknown start");

// ─── T20: graph_add — new node ──────────────────────────────────────────────

console.log("T20: Add — new node");
const t20 = knowledgeGraph("graph_add", {
  node_id: "mat_rene41", node_type: "material", name: "Rene 41",
  properties: { type: "nickel_superalloy", hardness_hrc: "38-44" },
});
assert(t20.added === "node", "T20.1 added node");
assert(t20.name === "Rene 41", "T20.2 correct name");

// ─── T21: graph_add — new edge ──────────────────────────────────────────────

console.log("T21: Add — new edge");
const t21 = knowledgeGraph("graph_add", {
  source: "mat_rene41", target: "mat_inconel718", edge_type: "similar_to",
  weight: 0.8, evidence: "Both nickel-base superalloys",
});
assert(t21.added === "edge", "T21.1 added edge");

// Verify the edge by querying
const t21v = knowledgeGraph("graph_query", { entity: "Rene 41" });
const conns21 = t21v.connections as any[];
assert(conns21.some((c: any) => c.node === "Inconel 718"), "T21.2 edge appears in query");

// ─── T22: graph_add — invalid source ────────────────────────────────────────

console.log("T22: Add — invalid source");
const t22 = knowledgeGraph("graph_add", { source: "nonexistent", target: "mat_inconel718", edge_type: "similar_to" });
assert(t22.error !== undefined, "T22.1 error for invalid source");

// ─── T23: graph_add — no params ─────────────────────────────────────────────

console.log("T23: Add — insufficient params");
const t23 = knowledgeGraph("graph_add", {});
assert(t23.error !== undefined, "T23.1 error for missing params");

// ─── T24: graph_search — by name ────────────────────────────────────────────

console.log("T24: Search — by name");
const t24 = knowledgeGraph("graph_search", { query: "inconel" });
assert((t24.total as number) >= 1, "T24.1 found inconel");
const results24 = t24.results as any[];
assert(results24[0].name.includes("Inconel"), "T24.2 result name matches");

// ─── T25: graph_search — by type ────────────────────────────────────────────

console.log("T25: Search — by type");
const t25 = knowledgeGraph("graph_search", { query: "carbide", type: "tool" });
assert((t25.total as number) >= 1, "T25.1 found tools");
const results25 = t25.results as any[];
assert(results25.every((r: any) => r.type === "tool"), "T25.2 all results are tools");

// ─── T26: graph_search — all materials ──────────────────────────────────────

console.log("T26: Search — all materials");
const t26 = knowledgeGraph("graph_search", { query: "", type: "material" });
// Empty query matches all materials (since all names include "")
assert((t26.total as number) >= 7, "T26.1 at least 7 materials");

// ─── T27: graph_search — no results ────────────────────────────────────────

console.log("T27: Search — no results");
const t27 = knowledgeGraph("graph_search", { query: "xyznonexistent" });
assert((t27.total as number) === 0, "T27.1 no results for nonsense query");

// ─── T28: graph_stats ───────────────────────────────────────────────────────

console.log("T28: Stats");
const t28 = knowledgeGraph("graph_stats", {});
assert((t28.total_nodes as number) > 30, "T28.1 30+ nodes in graph");
assert((t28.total_edges as number) > 40, "T28.2 40+ edges in graph");
const nodesByType = t28.nodes_by_type as Record<string, number>;
assert(nodesByType.material >= 7, "T28.3 7+ material nodes");
assert(nodesByType.tool >= 4, "T28.4 4+ tool nodes");
assert(nodesByType.machine >= 3, "T28.5 3+ machine nodes");
assert(nodesByType.strategy >= 4, "T28.6 4+ strategy nodes");
assert(nodesByType.failure_mode >= 5, "T28.7 5+ failure mode nodes");
const edgesByType = t28.edges_by_type as Record<string, number>;
assert(Object.keys(edgesByType).length >= 5, "T28.8 5+ edge types");
assert((t28.total_job_evidence as number) > 5000, "T28.9 5000+ job evidence points");

// ─── T29: graph_history — query type ────────────────────────────────────────

console.log("T29: History — queries");
const t29 = knowledgeGraph("graph_history", { type: "query" });
assert((t29.total as number) > 0, "T29.1 has query history");

// ─── T30: graph_history — inference type ────────────────────────────────────

console.log("T30: History — inference");
const t30 = knowledgeGraph("graph_history", { type: "inference" });
assert((t30.total as number) > 0, "T30.1 has inference history");

// ─── T31: graph_history — prediction type ───────────────────────────────────

console.log("T31: History — prediction");
const t31 = knowledgeGraph("graph_history", { type: "prediction" });
assert((t31.total as number) > 0, "T31.1 has prediction history");

// ─── T32: graph_get — retrieve stored query ─────────────────────────────────

console.log("T32: Get — stored query");
const qid = t1.query_id as string;
const t32 = knowledgeGraph("graph_get", { query_id: qid });
assert(t32.query_id === qid, "T32.1 retrieved correct query");

// ─── T33: graph_get — retrieve inference ────────────────────────────────────

console.log("T33: Get — stored inference");
const iid = t6.query_id as string;
const t33 = knowledgeGraph("graph_get", { query_id: iid });
assert(t33.query_id === iid, "T33.1 retrieved correct inference");

// ─── T34: graph_get — not found ─────────────────────────────────────────────

console.log("T34: Get — not found");
const t34 = knowledgeGraph("graph_get", { query_id: "Q-nonexistent" });
assert(t34.error !== undefined, "T34.1 error for not found");

// ─── T35: graph_get — missing id ────────────────────────────────────────────

console.log("T35: Get — missing id");
const t35 = knowledgeGraph("graph_get", {});
assert(t35.error !== undefined, "T35.1 error for missing id");

// ─── T36: Unknown action ────────────────────────────────────────────────────

console.log("T36: Unknown action");
const t36 = knowledgeGraph("graph_unknown", {});
assert(t36.error !== undefined, "T36.1 error for unknown action");
assert(Array.isArray(t36.available_actions), "T36.2 lists available actions");

// ─── T37: Edge weight ordering ──────────────────────────────────────────────

console.log("T37: Edge weight ordering");
const t37 = knowledgeGraph("graph_query", { entity: "Inconel 718" });
const conns37 = t37.connections as any[];
// Check that connections are sorted by weight (descending)
for (let i = 1; i < conns37.length; i++) {
  assert(conns37[i - 1].weight >= conns37[i].weight, `T37.${i} weight ordering`);
}

// ─── T38: Machine capabilities ──────────────────────────────────────────────

console.log("T38: Machine query");
const t38 = knowledgeGraph("graph_query", { entity: "VF-4" });
const conns38 = t38.connections as any[];
assert(conns38.some((c: any) => c.node_type === "strategy"), "T38.1 machine connected to strategies");
assert(conns38.some((c: any) => c.node_type === "material"), "T38.2 machine connected to materials");

// ─── T39: Coating relationships ─────────────────────────────────────────────

console.log("T39: Coating query");
const t39 = knowledgeGraph("graph_query", { entity: "AlTiN" });
// AlTiN is both a coating node and part of tool names
assert(t39.center_node !== undefined, "T39.1 found AlTiN");
assert((t39.total_connections as number) > 0, "T39.2 has connections");

// ─── T40: Failure mode prevention ───────────────────────────────────────────

console.log("T40: Failure mode prevention");
const t40 = knowledgeGraph("graph_query", { entity: "Crater Wear" });
const conns40 = t40.connections as any[];
assert(conns40.some((c: any) => c.edge_type === "prevents"), "T40.1 has prevention edges");
assert(conns40.some((c: any) => c.edge_type === "causes"), "T40.2 has causation edges");

// ─── T41: Manufacturer relationships ────────────────────────────────────────

console.log("T41: Manufacturer query");
const t41 = knowledgeGraph("graph_query", { entity: "Sandvik" });
const conns41 = t41.connections as any[];
assert(conns41.some((c: any) => c.edge_type === "made_by"), "T41.1 has made_by edges");

// ─── T42: Application relationships ────────────────────────────────────────

console.log("T42: Application query");
const t42 = knowledgeGraph("graph_query", { entity: "Aerospace" });
const conns42 = t42.connections as any[];
assert(conns42.some((c: any) => c.node_type === "material"), "T42.1 connected to materials");
assert(conns42.length >= 3, "T42.2 multiple aerospace materials");

// ─── T43: Waspaloy similarity inference ─────────────────────────────────────

console.log("T43: Waspaloy similarity");
const t43 = knowledgeGraph("graph_infer", { entity: "Waspaloy" });
const similar43 = t43.similar_to as any[];
assert(similar43.some((s: any) => s.name === "Inconel 718"), "T43.1 similar to Inconel");
assert((t43.confidence as number) > 0.9, "T43.2 high confidence (known material)");

// ─── T44: Strategy-failure prevention matrix ────────────────────────────────

console.log("T44: Strategy prevention");
const t44 = knowledgeGraph("graph_query", { entity: "Trochoidal Milling" });
const conns44 = t44.connections as any[];
assert(conns44.some((c: any) => c.edge_type === "prevents"), "T44.1 trochoidal prevents failures");
assert(conns44.some((c: any) => c.node === "Chatter Vibration" && c.edge_type === "prevents"), "T44.2 prevents chatter");

// ─── T45: Stainless BUE warning ─────────────────────────────────────────────

console.log("T45: Stainless BUE");
const t45 = knowledgeGraph("graph_infer", { entity: "304 Stainless" });
const warnings45 = t45.warnings as string[];
assert(warnings45.some((w: string) => w.includes("Built-Up Edge") || w.includes("BUE")), "T45.1 warns about BUE for stainless");

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("");
console.log("=".repeat(60));
if (failed > 0) {
  console.log(`R10-Rev10 Knowledge Graph: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log("=".repeat(60));
  console.log("");
  for (const f of failures) console.log(`  FAIL: ${f}`);
} else {
  console.log(`R10-Rev10 Knowledge Graph: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log("=".repeat(60));
}

if (failed > 0) process.exit(1);
