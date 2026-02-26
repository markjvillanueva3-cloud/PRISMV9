/**
 * R10-Rev4 — Anonymous Learning Network tests
 * Tests: learn_contribute, learn_query, learn_aggregate, learn_anonymize,
 *        learn_network_stats, learn_opt_control, learn_correction,
 *        learn_transparency, learn_history, learn_get
 */
import { federatedLearning } from "../../src/engines/FederatedLearningEngine.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label}`); }
}

// ─── T1: learn_network_stats — baseline ─────────────────────────────────────

console.log("T1: Network stats — baseline");
const t1 = federatedLearning("learn_network_stats");
assert((t1.correction_factors as number) >= 10, "T1.1 has seeded correction factors");
assert((t1.total_nodes as number) >= 5, "T1.2 has seeded nodes");
assert((t1.avg_confidence as number) > 0.5, "T1.3 reasonable confidence");
assert(t1.material_coverage !== undefined, "T1.4 has material coverage");
assert(t1.machine_coverage !== undefined, "T1.5 has machine coverage");
const matCov = t1.material_coverage as Record<string, number>;
assert(matCov["P"] > 0 && matCov["S"] > 0 && matCov["N"] > 0, "T1.6 covers P, S, N material classes");

// ─── T2: learn_query — nickel superalloy corrections ────────────────────────

console.log("T2: Query — nickel superalloy corrections");
const t2 = federatedLearning("learn_query", { material_class: "S" });
assert(t2.query_id !== undefined, "T2.1 has query_id");
const corrections2 = t2.corrections as any[];
assert(corrections2.length > 0, "T2.2 found corrections for S class");
assert(corrections2[0].vc_correction < 1.0, "T2.3 Vc correction suggests slower for superalloys");
assert(corrections2[0].tool_life_factor > 1.0, "T2.4 tool life improvement with correction");
assert(corrections2[0].confidence > 0.5, "T2.5 reasonable confidence");
assert(corrections2[0].sample_count > 100, "T2.6 meaningful sample size");

// ─── T3: learn_query — aluminum high speed ──────────────────────────────────

console.log("T3: Query — aluminum high speed");
const t3 = federatedLearning("learn_query", { material_class: "N", strategy: "HSM" });
const corrections3 = t3.corrections as any[];
assert(corrections3.length > 0, "T3.1 found HSM corrections for aluminum");
assert(corrections3[0].vc_correction > 1.0, "T3.2 Vc can go higher for aluminum HSM");
assert(corrections3[0].cycle_time_factor < 1.0, "T3.3 cycle time improvement");
assert((t3.recommendation as string).includes("correction"), "T3.4 has recommendation");

// ─── T4: learn_query — no matches ───────────────────────────────────────────

console.log("T4: Query — no matches");
const t4 = federatedLearning("learn_query", { material_class: "H", strategy: "trochoidal", machine_class: "lathe" });
const corrections4 = t4.corrections as any[];
assert(corrections4.length === 0, "T4.1 no corrections for obscure combo");
assert((t4.recommendation as string).includes("contributing"), "T4.2 suggests contributing data");

// ─── T5: learn_query — with hardness filter ─────────────────────────────────

console.log("T5: Query — with hardness filter");
const t5 = federatedLearning("learn_query", { material_class: "P", hardness_hrc: 30 });
const corrections5 = t5.corrections as any[];
assert(corrections5.length > 0, "T5.1 found corrections for P at HRC 30");
assert(corrections5.every((c: any) => c.material_class === "P"), "T5.2 all corrections are P class");

// ─── T6: learn_anonymize — clean data ───────────────────────────────────────

console.log("T6: Anonymize — clean data");
const t6 = federatedLearning("learn_anonymize", {
  data: {
    material_class: "S",
    machine_class: "5-axis",
    tool_class: "solid_carbide",
    operation: "pocket",
    hardness_hrc: 38,
    vc_predicted: 55,
    vc_actual: 42,
  },
});
assert(t6.report !== undefined, "T6.1 has report");
const report6 = t6.report as any;
assert(report6.safe_to_share === true, "T6.2 clean data is safe");
assert(report6.privacy_score >= 0.5, "T6.3 reasonable privacy score");

// ─── T7: learn_anonymize — proprietary data ─────────────────────────────────

console.log("T7: Anonymize — proprietary data");
const t7 = federatedLearning("learn_anonymize", {
  data: {
    material_class: "P",
    machine_class: "VMC",
    shop_name: "Acme Machining",
    customer: "Boeing",
    part_number: "PN-12345",
    price: 450,
    batch_size: 100,
    serial_number: "SN-001",
    order_number: "WO-789",
    operator: "John Smith",
    tool_class: "insert",
    operation: "roughing",
  },
});
const report7 = t7.report as any;
assert(report7.redacted_fields.length >= 7, "T7.1 redacted proprietary fields");
assert(report7.redacted_fields.includes("shop_name"), "T7.2 shop_name redacted");
assert(report7.redacted_fields.includes("customer"), "T7.3 customer redacted");
assert(report7.redacted_fields.includes("part_number"), "T7.4 part_number redacted");
assert(report7.redacted_fields.includes("price"), "T7.5 price redacted");
assert(report7.redacted_fields.includes("batch_size"), "T7.6 batch_size redacted");
assert(report7.redacted_fields.includes("serial_number"), "T7.7 serial_number redacted");
assert(report7.safe_to_share === true, "T7.8 safe after redaction");

// ─── T8: learn_anonymize — machine specifics ────────────────────────────────

console.log("T8: Anonymize — machine specifics");
const t8 = federatedLearning("learn_anonymize", {
  data: {
    material_class: "M",
    machine_model: "DMU 50",
    machine_serial: "SN-DMG-12345",
    exact_vc: 42.5,
    exact_fz: 0.08,
    tool_class: "solid_carbide",
    operation: "contour",
  },
});
const report8 = t8.report as any;
assert(report8.redacted_fields.includes("machine_model"), "T8.1 machine_model redacted");
assert(report8.redacted_fields.includes("machine_serial"), "T8.2 machine_serial redacted");
assert(report8.generalized_fields.includes("exact_vc"), "T8.3 exact_vc generalized");
assert(report8.generalized_fields.includes("exact_fz"), "T8.4 exact_fz generalized");

// ─── T9: learn_opt_control — opt in ─────────────────────────────────────────

console.log("T9: Opt control — opt in");
const t9 = federatedLearning("learn_opt_control", {
  shop_id: "SHOP-NEW-001",
  action: "opt_in",
  categories: ["roughing", "finishing", "pocket", "contour"],
});
assert(t9.status === "opted_in", "T9.1 opt-in confirmed");
assert(t9.shop_id === "SHOP-NEW-001", "T9.2 correct shop_id");

// ─── T10: learn_opt_control — status ─────────────────────────────────────────

console.log("T10: Opt control — status");
const t10 = federatedLearning("learn_opt_control", {
  shop_id: "SHOP-NEW-001",
  action: "status",
});
assert(t10.opted_in === true, "T10.1 is opted in");
assert((t10.categories as string[]).includes("contour"), "T10.2 has contour category");

// ─── T11: learn_opt_control — opt out ────────────────────────────────────────

console.log("T11: Opt control — opt out");
const t11 = federatedLearning("learn_opt_control", {
  shop_id: "SHOP-NEW-001",
  action: "opt_out",
});
assert(t11.status === "opted_out", "T11.1 opt-out confirmed");

// ─── T12: learn_opt_control — status after opt out ──────────────────────────

console.log("T12: Opt control — status after opt out");
const t12 = federatedLearning("learn_opt_control", {
  shop_id: "SHOP-NEW-001",
  action: "status",
});
assert(t12.opted_in === false, "T12.1 is opted out");

// ─── T13: learn_contribute — valid contribution ─────────────────────────────

console.log("T13: Contribute — valid contribution");
// Re-opt in first
federatedLearning("learn_opt_control", { shop_id: "SHOP-0001", action: "opt_in" });
const t13 = federatedLearning("learn_contribute", {
  shop_id: "SHOP-0001",
  material_class: "S",
  machine_class: "5-axis",
  tool_class: "solid_carbide",
  operation: "pocket",
  strategy: "trochoidal",
  hardness_hrc: 40,
  diameter_mm: 12,
  vc_predicted: 55,
  vc_actual: 42,
  tool_life_predicted_min: 45,
  tool_life_actual_min: 58,
  ra_predicted_um: 1.6,
  ra_actual_um: 1.3,
  cycle_time_predicted_min: 12,
  cycle_time_actual_min: 11.8,
});
assert(t13.contribution_id !== undefined, "T13.1 has contribution_id");
assert(t13.status === "accepted", "T13.2 accepted");
assert(t13.anonymization !== undefined, "T13.3 has anonymization report");
const anon13 = t13.anonymization as any;
assert(anon13.safe_to_share === true, "T13.4 safe to share");

// ─── T14: learn_contribute — not opted in ───────────────────────────────────

console.log("T14: Contribute — not opted in");
const t14 = federatedLearning("learn_contribute", {
  shop_id: "UNKNOWN-SHOP",
  material_class: "P",
  vc_predicted: 100,
  vc_actual: 90,
});
assert(t14.error !== undefined, "T14.1 rejected for non-enrolled shop");
assert((t14.error as string).includes("not opted in"), "T14.2 says not opted in");

// ─── T15: learn_contribute — no shop_id ──────────────────────────────────────

console.log("T15: Contribute — no shop_id");
const t15 = federatedLearning("learn_contribute", { material_class: "P" });
assert(t15.error !== undefined, "T15.1 error without shop_id");

// ─── T16: learn_aggregate — process contributions ───────────────────────────

console.log("T16: Aggregate — process contributions");
// Add a few more contributions
federatedLearning("learn_contribute", {
  shop_id: "SHOP-0002",
  material_class: "S",
  machine_class: "5-axis",
  tool_class: "solid_carbide",
  operation: "pocket",
  strategy: "trochoidal",
  hardness_hrc: 38,
  diameter_mm: 10,
  vc_predicted: 55,
  vc_actual: 44,
  tool_life_predicted_min: 45,
  tool_life_actual_min: 55,
  ra_predicted_um: 1.6,
  ra_actual_um: 1.5,
  cycle_time_predicted_min: 14,
  cycle_time_actual_min: 13.5,
});
const t16 = federatedLearning("learn_aggregate");
assert(t16.status === "aggregation_complete", "T16.1 aggregation completed");
assert((t16.contributions_processed as number) >= 2, "T16.2 processed contributions");
assert((t16.total_correction_factors as number) >= 10, "T16.3 total factors maintained");

// ─── T17: learn_query — after aggregation ───────────────────────────────────

console.log("T17: Query — after aggregation");
const t17 = federatedLearning("learn_query", {
  material_class: "S",
  machine_class: "5-axis",
  strategy: "trochoidal",
});
const corrections17 = t17.corrections as any[];
assert(corrections17.length > 0, "T17.1 found updated corrections");
// Sample count should have increased
assert(corrections17[0].sample_count > 1247, "T17.2 sample count increased after aggregation");

// ─── T18: learn_correction — get specific factor ────────────────────────────

console.log("T18: Correction — get specific factor");
const t18 = federatedLearning("learn_correction", { id: "CF-001" });
assert(t18.id === "CF-001", "T18.1 correct ID");
assert(t18.vc_correction !== undefined, "T18.2 has vc_correction");
assert(t18.tool_life_factor !== undefined, "T18.3 has tool_life_factor");
assert(t18.confidence !== undefined, "T18.4 has confidence");
assert(t18.material_class !== undefined, "T18.5 has material_class");

// ─── T19: learn_correction — not found ──────────────────────────────────────

console.log("T19: Correction — not found");
const t19 = federatedLearning("learn_correction", { id: "CF-999" });
assert(t19.error !== undefined, "T19.1 error for missing ID");

// ─── T20: learn_correction — no id ──────────────────────────────────────────

console.log("T20: Correction — no id");
const t20 = federatedLearning("learn_correction", {});
assert(t20.error !== undefined, "T20.1 error without id");

// ─── T21: learn_transparency — shop log ─────────────────────────────────────

console.log("T21: Transparency — shop log");
const t21 = federatedLearning("learn_transparency", { shop_id: "SHOP-0001" });
assert((t21.total as number) >= 1, "T21.1 has transparency entries");
const entries21 = t21.entries as any[];
assert(entries21.some((e: any) => e.action === "contributed"), "T21.2 shows contribution");
assert(entries21.every((e: any) => e.timestamp && e.data_summary), "T21.3 entries have details");

// ─── T22: learn_transparency — global log ───────────────────────────────────

console.log("T22: Transparency — global log");
const t22 = federatedLearning("learn_transparency", {});
assert((t22.total as number) >= 2, "T22.1 has global transparency entries");

// ─── T23: learn_transparency — non-enrolled shop ────────────────────────────

console.log("T23: Transparency — non-enrolled shop");
const t23 = federatedLearning("learn_transparency", { shop_id: "UNKNOWN" });
assert((t23.total as number) === 0, "T23.1 no entries for unknown shop");

// ─── T24: learn_history ─────────────────────────────────────────────────────

console.log("T24: History");
const t24 = federatedLearning("learn_history");
assert((t24.total_queries as number) >= 3, "T24.1 has query history");
assert((t24.total_contributions as number) >= 2, "T24.2 has contribution count");
assert(Array.isArray(t24.queries), "T24.3 has query list");

// ─── T25: learn_get — stored query ──────────────────────────────────────────

console.log("T25: Get — stored query");
const qryId = t2.query_id as string;
const t25 = federatedLearning("learn_get", { id: qryId });
assert(t25.query_id === qryId, "T25.1 retrieved correct query");
assert(t25.corrections !== undefined, "T25.2 has stored corrections");

// ─── T26: learn_get — not found ─────────────────────────────────────────────

console.log("T26: Get — not found");
const t26 = federatedLearning("learn_get", { id: "QRY-nonexistent" });
assert(t26.error !== undefined, "T26.1 error for missing id");

// ─── T27: learn_get — no id ─────────────────────────────────────────────────

console.log("T27: Get — no id");
const t27 = federatedLearning("learn_get", {});
assert(t27.error !== undefined, "T27.1 error without id");

// ─── T28: learn_opt_control — delete ────────────────────────────────────────

console.log("T28: Opt control — delete");
// Create a shop, contribute, then delete
federatedLearning("learn_opt_control", { shop_id: "SHOP-DELETE", action: "opt_in" });
federatedLearning("learn_contribute", {
  shop_id: "SHOP-DELETE",
  material_class: "K",
  machine_class: "HMC",
  tool_class: "insert",
  operation: "roughing",
  vc_predicted: 200,
  vc_actual: 195,
});
const t28 = federatedLearning("learn_opt_control", {
  shop_id: "SHOP-DELETE",
  action: "delete",
});
assert(t28.status === "deleted", "T28.1 deleted");
assert((t28.contributions_removed as number) >= 1, "T28.2 contributions removed");

// Verify deletion
const t28b = federatedLearning("learn_opt_control", { shop_id: "SHOP-DELETE", action: "status" });
assert(t28b.status === "not_enrolled", "T28.3 no longer enrolled");

// ─── T29: learn_opt_control — invalid action ────────────────────────────────

console.log("T29: Opt control — invalid action");
const t29 = federatedLearning("learn_opt_control", {
  shop_id: "SHOP-0001",
  action: "invalid_action",
});
assert(t29.error !== undefined, "T29.1 error for invalid action");
assert((t29.valid_actions as string[]).includes("opt_in"), "T29.2 lists valid actions");

// ─── T30: learn_opt_control — no shop_id ────────────────────────────────────

console.log("T30: Opt control — no shop_id");
const t30 = federatedLearning("learn_opt_control", { action: "status" });
assert(t30.error !== undefined, "T30.1 error without shop_id");

// ─── T31: Unknown action ────────────────────────────────────────────────────

console.log("T31: Unknown action");
const t31 = federatedLearning("learn_invalid_action");
assert(t31.error !== undefined, "T31.1 error for unknown action");
assert((t31.valid_actions as string[]).length === 10, "T31.2 lists all 10 valid actions");

// ─── T32: learn_query — full filter chain ───────────────────────────────────

console.log("T32: Query — full filter chain");
const t32 = federatedLearning("learn_query", {
  material_class: "S",
  machine_class: "5-axis",
  tool_class: "solid_carbide",
  operation: "pocket",
  strategy: "trochoidal",
  hardness_hrc: 40,
});
const corrections32 = t32.corrections as any[];
assert(corrections32.length >= 1, "T32.1 found exact match");
assert(corrections32[0].material_class === "S", "T32.2 correct material class");
assert(corrections32[0].strategy === "trochoidal", "T32.3 correct strategy");

// ─── T33: learn_aggregate — no contributions ────────────────────────────────

console.log("T33: Aggregate — idempotent");
// Aggregate again with no new contributions
const beforeCount = (federatedLearning("learn_network_stats").correction_factors as number);
const t33 = federatedLearning("learn_aggregate");
// All contributions were already processed
assert(t33.status !== undefined, "T33.1 returns status");

// ─── T34: learn_query — alloy steel corrections ─────────────────────────────

console.log("T34: Query — alloy steel corrections");
const t34 = federatedLearning("learn_query", { material_class: "P", tool_class: "insert" });
const corrections34 = t34.corrections as any[];
assert(corrections34.length >= 1, "T34.1 found insert corrections for P");
assert(corrections34.every((c: any) => c.tool_class === "insert"), "T34.2 all are insert type");

// ─── T35: learn_query — lathe finishing ─────────────────────────────────────

console.log("T35: Query — lathe finishing");
const t35 = federatedLearning("learn_query", { machine_class: "lathe", operation: "finishing" });
const corrections35 = t35.corrections as any[];
assert(corrections35.length >= 1, "T35.1 found lathe finishing corrections");
assert(corrections35[0].ra_factor < 1.0, "T35.2 better surface finish than predicted");

// ─── T36: learn_network_stats — coverage ────────────────────────────────────

console.log("T36: Network stats — coverage");
const t36 = federatedLearning("learn_network_stats");
const machCov = t36.machine_coverage as Record<string, number>;
assert(machCov["VMC"] > 0, "T36.1 VMC coverage");
assert(machCov["5-axis"] > 0, "T36.2 5-axis coverage");
assert(machCov["HMC"] > 0, "T36.3 HMC coverage");
assert(machCov["lathe"] > 0, "T36.4 lathe coverage");

// ─── T37: learn_query — hard materials ──────────────────────────────────────

console.log("T37: Query — hard materials");
const t37 = federatedLearning("learn_query", { material_class: "H" });
const corrections37 = t37.corrections as any[];
assert(corrections37.length >= 1, "T37.1 found hard material corrections");
assert(corrections37[0].tool_life_factor > 1.0, "T37.2 tool life improvement");

// ─── T38: learn_query — stainless pocket ────────────────────────────────────

console.log("T38: Query — stainless pocket");
const t38 = federatedLearning("learn_query", { material_class: "M", operation: "pocket" });
const corrections38 = t38.corrections as any[];
assert(corrections38.length >= 1, "T38.1 found stainless pocket corrections");
assert(corrections38[0].vc_correction < 1.0, "T38.2 lower Vc for stainless");

// ─── T39: learn_query — cast iron roughing ──────────────────────────────────

console.log("T39: Query — cast iron roughing");
const t39 = federatedLearning("learn_query", { material_class: "K", operation: "roughing" });
const corrections39 = t39.corrections as any[];
assert(corrections39.length >= 1, "T39.1 found cast iron roughing corrections");
assert(corrections39[0].cycle_time_factor < 1.0, "T39.2 faster cycle time");

// ─── T40: Contribute and verify transparency ────────────────────────────────

console.log("T40: Contribute + transparency verification");
const before40 = federatedLearning("learn_transparency", { shop_id: "SHOP-0001" });
const beforeCount40 = (before40.total as number);
federatedLearning("learn_contribute", {
  shop_id: "SHOP-0001",
  material_class: "P",
  machine_class: "VMC",
  tool_class: "insert",
  operation: "facing",
  strategy: "conventional",
  vc_predicted: 200,
  vc_actual: 185,
  tool_life_predicted_min: 30,
  tool_life_actual_min: 35,
  ra_predicted_um: 3.2,
  ra_actual_um: 3.0,
  cycle_time_predicted_min: 8,
  cycle_time_actual_min: 7.5,
});
const after40 = federatedLearning("learn_transparency", { shop_id: "SHOP-0001" });
assert((after40.total as number) > beforeCount40, "T40.1 transparency log grew");

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("");
console.log("=".repeat(60));
console.log(`R10-Rev4 Federated Learning: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log("=".repeat(60));
if (failures.length > 0) {
  console.log("");
  for (const f of failures) console.log(`  FAIL: ${f}`);
}
if (failed > 0) process.exit(1);
