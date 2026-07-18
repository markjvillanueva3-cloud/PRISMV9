/**
 * R10-Rev1 Manufacturing Genome Tests
 * =====================================
 * Validates: genome lookup, parameter prediction, similarity search,
 * genome comparison, fingerprints, behavioral data, search, history.
 */

import { manufacturingGenome } from "../../src/engines/ManufacturingGenomeEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: Lookup — by material name ──────────────────────────────────────────
console.log("T1: Lookup — by name");
{
  const r = manufacturingGenome("genome_lookup", { material: "4140" });
  assert(r.genome_id === "GEN-001", "T1.1 correct genome ID");
  assert(r.material_name === "AISI 4140", "T1.2 material name");
  assert(r.designations.AISI === "4140", "T1.3 AISI designation");
  assert(r.designations.UNS === "G41400", "T1.4 UNS designation");
  assert(r.iso_group === "P", "T1.5 ISO group");
  assert(r.composition.C === 0.40, "T1.6 carbon content");
  assert(r.mechanical.hardness_hrc === 28, "T1.7 hardness");
  assert(r.thermal.conductivity_w_mk === 42, "T1.8 thermal conductivity");
  assert(r.machinability.kc1_1 === 1800, "T1.9 specific cutting force");
  assert(r.behavioral.jobs_recorded > 0, "T1.10 has recorded jobs");
}

// ─── T2: Lookup — by genome ID ──────────────────────────────────────────────
console.log("T2: Lookup — by ID");
{
  const r = manufacturingGenome("genome_lookup", { genome_id: "GEN-005" });
  assert(r.material_name === "Inconel 718", "T2.1 Inconel by ID");
  assert(r.iso_group === "S", "T2.2 ISO group S");
}

// ─── T3: Lookup — not found ────────────────────────────────────────────────
console.log("T3: Lookup — not found");
{
  const r = manufacturingGenome("genome_lookup", { material: "unobtanium" });
  assert(r.error !== undefined, "T3.1 error for missing material");
}

// ─── T4: Predict — parameters for 4140 ─────────────────────────────────────
console.log("T4: Predict — 4140");
{
  const r = manufacturingGenome("genome_predict", { material: "4140", tool_diameter_mm: 10, flutes: 4 });
  assert(r.prediction_id.startsWith("GP-"), "T4.1 ID format");
  assert(r.genome_id === "GEN-001", "T4.2 linked to genome");
  assert(r.recommended_vc > 100 && r.recommended_vc < 300, "T4.3 Vc in range");
  assert(r.recommended_fz > 0.02 && r.recommended_fz < 0.2, "T4.4 fz in range");
  assert(r.recommended_ap_max > 0, "T4.5 ap_max positive");
  assert(r.predicted_tool_life_min > 0, "T4.6 tool life positive");
  assert(r.confidence_pct > 50, "T4.7 confidence > 50%");
  assert(r.basis.includes("Taylor"), "T4.8 basis mentions Taylor");
}

// ─── T5: Predict — hardness adjustment ──────────────────────────────────────
console.log("T5: Predict — hardness adjustment");
{
  const r1 = manufacturingGenome("genome_predict", { material: "4140", hardness_hrc: 28 });
  const r2 = manufacturingGenome("genome_predict", { material: "4140", hardness_hrc: 40 });
  assert(r1.recommended_vc > r2.recommended_vc, "T5.1 harder material → lower Vc");
  assert(r2.adjustments.some((a: string) => a.includes("Hardness")), "T5.2 adjustment noted");
}

// ─── T6: Predict — all materials produce valid output ───────────────────────
console.log("T6: Predict — all materials");
{
  const materials = ["4140", "304", "7075", "Ti-6Al-4V", "Inconel", "FC250", "17-4PH", "6061"];
  for (const mat of materials) {
    const r = manufacturingGenome("genome_predict", { material: mat });
    assert(r.recommended_vc > 0, `T6 ${mat} has Vc`);
    assert(r.recommended_fz > 0, `T6 ${mat} has fz`);
    assert(r.confidence_pct > 0, `T6 ${mat} has confidence`);
  }
}

// ─── T7: Similar — find similar to 304 stainless ────────────────────────────
console.log("T7: Similar — 304 stainless");
{
  const r = manufacturingGenome("genome_similar", { material: "304" });
  assert(r.total >= 1, "T7.1 found similar materials");
  assert(r.similar[0].similarity_score > 0, "T7.2 has similarity score");
  assert(r.similar[0].matching_properties.length >= 1, "T7.3 has matching properties");
  // 17-4PH should be most similar (same M group, stainless family)
  const ph17_4 = r.similar.find((s: any) => s.material.includes("17-4PH"));
  assert(ph17_4 !== undefined, "T7.4 17-4PH found as similar");
  assert(ph17_4!.similarity_score >= 0.3, "T7.5 17-4PH has decent similarity");
}

// ─── T8: Similar — aluminum matches aluminum ────────────────────────────────
console.log("T8: Similar — aluminum");
{
  const r = manufacturingGenome("genome_similar", { material: "7075" });
  assert(r.similar[0].material.includes("6061"), "T8.1 6061 is most similar to 7075");
  assert(r.similar[0].similarity_score >= 0.7, "T8.2 high similarity score");
}

// ─── T9: Compare — 4140 vs Inconel ─────────────────────────────────────────
console.log("T9: Compare — 4140 vs Inconel");
{
  const r = manufacturingGenome("genome_compare", { material_a: "4140", material_b: "Inconel" });
  assert(r.a.material === "AISI 4140", "T9.1 material A identified");
  assert(r.b.material === "Inconel 718", "T9.2 material B identified");
  assert(r.comparison.hardness.a < r.comparison.hardness.b, "T9.3 Inconel harder");
  assert(r.comparison.conductivity.a > r.comparison.conductivity.b, "T9.4 steel conducts better");
  assert(r.comparison.kc1_1.a < r.comparison.kc1_1.b, "T9.5 Inconel has higher Kc");
  assert(r.easier_to_machine === "AISI 4140", "T9.6 steel easier to machine");
}

// ─── T10: Compare — not found ──────────────────────────────────────────────
console.log("T10: Compare — not found");
{
  const r = manufacturingGenome("genome_compare", { material_a: "4140", material_b: "unobtanium" });
  assert(r.error !== undefined, "T10.1 error for missing material");
}

// ─── T11: List — all genomes ────────────────────────────────────────────────
console.log("T11: List");
{
  const r = manufacturingGenome("genome_list", {});
  assert(r.total === 8, "T11.1 8 genome records");
  assert(r.genomes.length === 8, "T11.2 genomes array length");
  assert(r.genomes[0].genome_id !== undefined, "T11.3 has genome_id");
  assert(r.genomes[0].iso_group !== undefined, "T11.4 has iso_group");
  assert(r.genomes[0].jobs > 0, "T11.5 has jobs count");
}

// ─── T12: Fingerprint — mechanical ──────────────────────────────────────────
console.log("T12: Fingerprint — mechanical");
{
  const r = manufacturingGenome("genome_fingerprint", { material: "Ti-6Al-4V", fingerprint: "mechanical" });
  assert(r.genome_id === "GEN-004", "T12.1 correct genome");
  assert(r.hardness_hrc === 36, "T12.2 hardness");
  assert(r.tensile_mpa === 950, "T12.3 tensile");
  assert(r.johnson_cook !== undefined, "T12.4 has Johnson-Cook constants");
  assert(r.johnson_cook.A === 1098, "T12.5 JC-A value");
}

// ─── T13: Fingerprint — thermal ─────────────────────────────────────────────
console.log("T13: Fingerprint — thermal");
{
  const r = manufacturingGenome("genome_fingerprint", { material: "7075", fingerprint: "thermal" });
  assert(r.conductivity_w_mk === 130, "T13.1 conductivity");
  assert(r.expansion_um_mk === 23.6, "T13.2 expansion");
  assert(r.melting_point_c === 635, "T13.3 melting point");
}

// ─── T14: Fingerprint — machinability ───────────────────────────────────────
console.log("T14: Fingerprint — machinability");
{
  const r = manufacturingGenome("genome_fingerprint", { material: "Inconel", fingerprint: "machinability" });
  assert(r.kc1_1 === 2800, "T14.1 Kc1.1");
  assert(r.taylor_C === 50, "T14.2 Taylor C");
  assert(r.chip_formation === "segmented", "T14.3 chip formation");
  assert(r.work_hardening_rate === 0.80, "T14.4 work hardening rate");
  assert(r.abrasiveness === 0.7, "T14.5 abrasiveness");
}

// ─── T15: Fingerprint — surface integrity ───────────────────────────────────
console.log("T15: Fingerprint — surface integrity");
{
  const r = manufacturingGenome("genome_fingerprint", { material: "Inconel", fingerprint: "surface_integrity" });
  assert(r.residual_stress_tendency === "tensile", "T15.1 residual stress");
  assert(r.white_layer_risk === "high", "T15.2 white layer risk");
  assert(r.roughness_correction_factor === 1.5, "T15.3 roughness correction");
}

// ─── T16: Behavioral — community insights ──────────────────────────────────
console.log("T16: Behavioral");
{
  const r = manufacturingGenome("genome_behavioral", { material: "304" });
  assert(r.genome_id === "GEN-002", "T16.1 correct genome");
  assert(r.jobs_recorded >= 500, "T16.2 many jobs recorded");
  assert(r.avg_tool_life_vs_predicted < 1.0, "T16.3 tool life worse than predicted for 304");
  assert(r.common_failure_modes.length >= 2, "T16.4 has failure modes");
  assert(r.community_insights.length >= 1, "T16.5 has community insights");
}

// ─── T17: Search — by ISO group ─────────────────────────────────────────────
console.log("T17: Search — ISO group");
{
  const r = manufacturingGenome("genome_search", { iso_group: "S" });
  assert(r.total === 2, "T17.1 2 superalloy materials (Ti + Inconel)");
  assert(r.results.every((g: any) => g.iso_group === "S"), "T17.2 all ISO S");
}

// ─── T18: Search — by hardness range ────────────────────────────────────────
console.log("T18: Search — hardness range");
{
  const r = manufacturingGenome("genome_search", { min_hardness: 30, max_hardness: 50 });
  assert(r.total >= 3, "T18.1 found hard materials");
  assert(r.results.every((g: any) => g.hardness_hrc >= 30 && g.hardness_hrc <= 50), "T18.2 all in range");
}

// ─── T19: Search — by family ────────────────────────────────────────────────
console.log("T19: Search — family");
{
  const r = manufacturingGenome("genome_search", { family: "aluminum" });
  assert(r.total === 2, "T19.1 2 aluminum alloys");
}

// ─── T20: Work hardening adjustment ─────────────────────────────────────────
console.log("T20: Work hardening adjustment");
{
  const r = manufacturingGenome("genome_predict", { material: "304" });
  assert(r.adjustments.some((a: string) => a.includes("Work-hardening")), "T20.1 stainless gets work-hardening warning");
  assert(r.adjustments.some((a: string) => a.includes("fz")), "T20.2 mentions minimum fz");
}

// ─── T21: BUE tendency adjustment ───────────────────────────────────────────
console.log("T21: BUE tendency adjustment");
{
  const r = manufacturingGenome("genome_predict", { material: "6061" });
  assert(r.adjustments.some((a: string) => a.includes("BUE")), "T21.1 aluminum gets BUE warning");
}

// ─── T22: Genome completeness — all records have required fields ────────────
console.log("T22: Genome completeness");
{
  const list = manufacturingGenome("genome_list", {});
  for (const g of list.genomes) {
    const full = manufacturingGenome("genome_lookup", { genome_id: g.genome_id });
    assert(full.composition !== undefined, `T22 ${g.material} has composition`);
    assert(full.mechanical !== undefined, `T22 ${g.material} has mechanical`);
    assert(full.thermal !== undefined, `T22 ${g.material} has thermal`);
    assert(full.machinability !== undefined, `T22 ${g.material} has machinability`);
    assert(full.surface_integrity !== undefined, `T22 ${g.material} has surface integrity`);
    assert(full.behavioral !== undefined, `T22 ${g.material} has behavioral`);
    assert(full.designations !== undefined, `T22 ${g.material} has designations`);
  }
}

// ─── T23: History — accumulated predictions ─────────────────────────────────
console.log("T23: History");
{
  const r = manufacturingGenome("genome_history", {});
  assert(r.total >= 10, "T23.1 accumulated predictions");
}

// ─── T24: Get — retrieve specific prediction ────────────────────────────────
console.log("T24: Get specific prediction");
{
  const r = manufacturingGenome("genome_get", { prediction_id: "GP-0001" });
  assert(r.prediction_id === "GP-0001", "T24.1 found prediction");
  assert(r.material !== undefined, "T24.2 has material");
}

// ─── T25: Get — not found ──────────────────────────────────────────────────
console.log("T25: Get — not found");
{
  const r = manufacturingGenome("genome_get", { prediction_id: "GP-NOPE" });
  assert(r.error !== undefined, "T25.1 error for missing prediction");
}

// ─── T26: Unknown action ───────────────────────────────────────────────────
console.log("T26: Unknown action");
{
  const r = manufacturingGenome("genome_nonexistent", {});
  assert(r.error !== undefined, "T26.1 unknown action returns error");
}

// ─── T27: Predict — unknown material ───────────────────────────────────────
console.log("T27: Predict — unknown material");
{
  const r = manufacturingGenome("genome_predict", { material: "unobtanium" });
  assert(r.confidence_pct === 0, "T27.1 zero confidence for unknown");
  assert(r.recommended_vc === 0, "T27.2 zero Vc for unknown");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R10-Rev1 Manufacturing Genome: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
