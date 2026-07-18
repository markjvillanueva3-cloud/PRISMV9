/**
 * Tests for cam-turning-recipe-resolver.mjs — runs against the REAL shipped matrix
 * (state/shared/cam-drive/CAM-OP-TEMPLATE-MATRIX.json), not a mock, so it verifies the
 * resolver against the actual template shape. Core invariants under test:
 *   - resolves all 8 families to a structured recipe
 *   - NEVER fabricates cutting numbers (directive delegates; no sfm/feed/doc value keys)
 *   - safety gates composed per family (G50/CSS, L/D boring, peck groove/part, threading)
 *   - missing inputs → warnings + ready_to_drive=false (fail-loud, not silent default)
 *
 *   node --test scripts/lib/cam-turning-recipe-resolver.test.mjs   (cwd = repo root)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  loadMatrix, listFamilies, resolveRecipe, DEFAULT_MATRIX_PATH,
  loadOptimizationRules, applyOptimizationRules,
} from "./cam-turning-recipe-resolver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MATRIX = resolve(__dirname, "../../state/shared/cam-drive/CAM-OP-TEMPLATE-MATRIX.json");

const EXPECTED_FAMILIES = [
  "facing", "OD_roughing", "OD_finishing", "ID_boring",
  "drilling_centering", "grooving", "parting_cutoff", "threading",
  // v1.1 corpus expansion (8 -> 15): the Fusion turning op-type set
  "profile", "face_grooving", "chamfer", "bore_finish", "live_tool_milling", "peck_drill", "tap",
];

test("loadMatrix throws loud on a bad path", () => {
  assert.throws(() => loadMatrix(resolve(__dirname, "does-not-exist.json")));
});

test("matrix has all 8 lathe families", () => {
  const m = loadMatrix(MATRIX);
  const fams = listFamilies(m);
  for (const f of EXPECTED_FAMILIES) assert.ok(fams.includes(f), `missing family ${f}`);
  assert.equal(fams.length, EXPECTED_FAMILIES.length, `unexpected family set: ${fams}`);
});

test("every family resolves to a structured recipe with delegated cutting + safety gates", () => {
  const m = loadMatrix(MATRIX);
  for (const fam of EXPECTED_FAMILIES) {
    const r = resolveRecipe(m, fam, {});
    assert.ok(r.fusion_strategy, `${fam}: missing fusion_strategy`);
    assert.ok(r.cutting_condition_directive?.delegate_to, `${fam}: cutting directive must name a physics surface`);
    assert.ok(Array.isArray(r.safety_gates) && r.safety_gates.length > 0, `${fam}: must carry safety gates`);
    // The directive carries NO computed cutting numbers — only delegation + passthrough inputs.
    const d = r.cutting_condition_directive;
    assert.equal(d.sfm, undefined, `${fam}: directive must not contain a fabricated sfm`);
    assert.equal(d.feed, undefined, `${fam}: directive must not contain a fabricated feed`);
    assert.equal(d.doc, undefined, `${fam}: directive must not contain a fabricated doc`);
    assert.match(d.note, /NEVER inline/i, `${fam}: directive must carry the no-inline rule`);
  }
});

test("all fusion strategies are UNVERIFIED → recipe warns + not ready_to_drive", () => {
  const m = loadMatrix(MATRIX);
  const r = resolveRecipe(m, "OD_roughing", { material_iso_group: "P", diameter_in: 1.5, finish: "rough", tool: { grade: "carbide" } });
  assert.equal(r.fusion_strategy_verified, false);
  assert.ok(r.warnings.some((w) => /UNVERIFIED/i.test(w)), "must warn the strategy is unverified");
  assert.equal(r.ready_to_drive, false, "unverified strategy → not ready to drive (honest)");
});

test("CSS families carry a G50-cap gate; missing diameter → warning", () => {
  const m = loadMatrix(MATRIX);
  const r = resolveRecipe(m, "parting_cutoff", { material_iso_group: "P" }); // no diameter
  assert.ok(r.safety_gates.some((g) => /G50/i.test(g.rule)), "parting must carry a G50 cap gate");
  assert.ok(r.warnings.some((w) => /G50 cap|diameter/i.test(w)), "missing diameter under CSS → warning");
});

test("ID_boring carries an L/D deflection gate", () => {
  const m = loadMatrix(MATRIX);
  const r = resolveRecipe(m, "ID_boring", { material_iso_group: "M", diameter_in: 0.5 });
  assert.ok(r.safety_gates.some((g) => /L\/D/i.test(g.rule)), "ID_boring must carry an L/D gate");
});

test("grooving + parting carry a peck (depth>3x width) gate", () => {
  const m = loadMatrix(MATRIX);
  for (const fam of ["grooving", "parting_cutoff"]) {
    const r = resolveRecipe(m, fam, {});
    assert.ok(r.safety_gates.some((g) => /peck|3.\s*(x|×)\s*(insert )?width|3× insert width/i.test(g.rule)), `${fam} must carry a peck/3x-width gate`);
  }
});

test("threading delegates to the thread surface, not generic speed/feed", () => {
  const m = loadMatrix(MATRIX);
  const r = resolveRecipe(m, "threading", { thread_tpi: 32, diameter_in: 1.0 });
  assert.match(r.cutting_condition_directive.delegate_to, /thread/i);
});

test("missing material_iso_group → warns physics can't pick kc/SFM (no silent default)", () => {
  const m = loadMatrix(MATRIX);
  const r = resolveRecipe(m, "facing", { diameter_in: 2.0 });
  assert.ok(r.warnings.some((w) => /material_iso_group/i.test(w)), "must warn material missing");
});

test("unknown family throws with the available list", () => {
  const m = loadMatrix(MATRIX);
  assert.throws(() => resolveRecipe(m, "not_a_family", {}), /unknown family/i);
});

test("DEFAULT_MATRIX_PATH points at the shipped matrix", () => {
  assert.match(DEFAULT_MATRIX_PATH, /CAM-OP-TEMPLATE-MATRIX\.json$/);
});

// ── optimization rules (the actionable "learn to optimize" layer) ──
const RULES = resolve(__dirname, "../../state/shared/cam-drive/CAM-OPTIMIZATION-RULES.json");
const OPT_PRIORITY = new Set(["safety", "accuracy", "time", "efficiency"]);

test("optimization rules load + cover all 8 families with well-formed rules", () => {
  const r = loadOptimizationRules(RULES);
  for (const fam of EXPECTED_FAMILIES) {
    const rules = r.families?.[fam]?.rules;
    assert.ok(Array.isArray(rules) && rules.length > 0, `${fam}: must have optimization rules`);
    for (const rule of rules) {
      assert.ok(rule.id && rule.axis && rule.move, `${fam}/${rule.id}: id+axis+move required`);
      assert.ok(OPT_PRIORITY.has(rule.roi), `${fam}/${rule.id}: roi must be a known objective, got ${rule.roi}`);
    }
  }
});

test("applyOptimizationRules: material KNOWN → every rule ready, plan matches the family", () => {
  const m = loadMatrix(MATRIX);
  const rules = loadOptimizationRules(RULES);
  const recipe = resolveRecipe(m, "OD_roughing", { material_iso_group: "H", diameter_in: 1.5 });
  const out = applyOptimizationRules(recipe, rules);
  assert.equal(out.optimization_plan.length, rules.families.OD_roughing.rules.length);
  assert.equal(out.optimization_summary.pending_material, 0, "material known → none pending");
  assert.equal(out.optimization_summary.ready, out.optimization_plan.length);
  // The air-cut elimination rule (time ROI, not material-dependent) must be present + ready.
  const air = out.optimization_plan.find((p) => p.id === "odr-air");
  assert.equal(air.status, "ready");
  assert.equal(air.roi, "time");
});

test("applyOptimizationRules: material UNKNOWN → material-dependent (SFM) rules flagged pending (no silent default)", () => {
  const m = loadMatrix(MATRIX);
  const rules = loadOptimizationRules(RULES);
  const recipe = resolveRecipe(m, "OD_roughing", { diameter_in: 1.5 }); // no material_iso_group
  const out = applyOptimizationRules(recipe, rules);
  const sfm = out.optimization_plan.find((p) => p.id === "odr-sfm");
  assert.equal(sfm.material_dependent, true);
  assert.equal(sfm.status, "pending_material_resolution");
  assert.ok(out.optimization_summary.pending_material >= 1, "≥1 material-dependent rule pending");
  // non-material rules stay ready even without material
  assert.equal(out.optimization_plan.find((p) => p.id === "odr-air").status, "ready");
});

test("threading optimization preserves the multi-pass safety guard + adapts DOC by pitch", () => {
  const m = loadMatrix(MATRIX);
  const rules = loadOptimizationRules(RULES);
  const out = applyOptimizationRules(resolveRecipe(m, "threading", { thread_tpi: 32 }), rules);
  const doc = out.optimization_plan.find((p) => p.id === "thr-doc");
  assert.match(doc.move, /decreasing-DOC|constant chip area|adapt by pitch/i);
  assert.match(doc.guard, /multi-pass|no full-depth/i);
});

test("grooving optimization uses G74 peck-and-shift / LAP (NOT Fanuc G75) + depth>3x-width peck guard", () => {
  // Dialect correction (2026-06-01, 16,558-program corpus): Okuma has no G75 grooving.
  const m = loadMatrix(MATRIX);
  const rules = loadOptimizationRules(RULES);
  const out = applyOptimizationRules(resolveRecipe(m, "grooving", {}), rules);
  const grv = out.optimization_plan.find((p) => p.id === "grv-peck-shift");
  assert.ok(grv, "grv-peck-shift cycle rule must be present");
  assert.match(grv.move, /G74|LAP/);              // prescribes the real Okuma grooving idiom
  assert.equal(out.optimization_plan.find((p) => p.id === "grv-g75"), undefined, "old Fanuc-G75 rule id must be gone");
  assert.match(grv.guard, /3x|3×|peck/i);
});

// ── adversarial-audit corrections (U-CAM-OPT-VERIFIED: 2 P0 + 16 P1 applied) ──
test("P0 fix: thr-rpm guard carries the mandatory G50 cap under G96 (crash-as-dia->0)", () => {
  const thr = loadOptimizationRules(RULES).families.threading.rules.find((r) => r.id === "thr-rpm");
  assert.match(thr.guard, /G50/);
});

test("P0 fix: odr-doc guard carries the L/D radial-deflection gate (not torque-only)", () => {
  const odr = loadOptimizationRules(RULES).families.OD_roughing.rules.find((r) => r.id === "odr-doc");
  assert.match(odr.guard, /L\/D|deflection/i);
});

test("P0 fix: grv-sfm derates grooving Vc + uses insert_width driver (no climb to OD-turn SFM)", () => {
  const grv = loadOptimizationRules(RULES).families.grooving.rules.find((r) => r.id === "grv-sfm");
  assert.match(grv.groove_derate, /Vc_groove/);
  assert.match(grv.move, /insert_width/);
});

test("L2 invariant: every rule offering G96 carries a G50 cap in its guard", () => {
  const fams = loadOptimizationRules(RULES).families;
  for (const [famName, fam] of Object.entries(fams)) {
    for (const r of fam.rules) {
      if (/G96/.test(r.move) || /G96/.test(r.guard || "")) {
        assert.match(r.guard || "", /G50/, `${famName}/${r.id} offers G96 but its guard omits the G50 cap`);
      }
    }
  }
});

test("new safety/completeness rules present: idb-peck + idb-finish-feed + grv feed/width/finish", () => {
  const fams = loadOptimizationRules(RULES).families;
  const idbPeck = fams.ID_boring.rules.find((r) => r.id === "idb-peck");
  assert.equal(idbPeck.roi, "safety");
  assert.match(idbPeck.guard, /peck mandatory/i);
  const idbIds = fams.ID_boring.rules.map((r) => r.id);
  assert.ok(idbIds.includes("idb-finish-feed"), "ID_boring must carry idb-finish-feed");
  const grvIds = fams.grooving.rules.map((r) => r.id);
  for (const id of ["grv-feed", "grv-width-step", "grv-finish"]) {
    assert.ok(grvIds.includes(id), `grooving must carry ${id}`);
  }
});

test("the new rules flow through applyOptimizationRules into the plan", () => {
  const m = loadMatrix(MATRIX);
  const rules = loadOptimizationRules(RULES);
  const idb = applyOptimizationRules(resolveRecipe(m, "ID_boring", { material_iso_group: "M", diameter_in: 0.5, bore_depth_in: 2 }), rules);
  assert.ok(idb.optimization_plan.some((p) => p.id === "idb-peck" && p.roi === "safety"), "idb-peck in plan");
  const grv = applyOptimizationRules(resolveRecipe(m, "grooving", {}), rules);
  assert.ok(grv.optimization_plan.some((p) => p.id === "grv-feed"), "grv-feed in plan");
});

// ── v1.1 matrix expansion (8 -> 15 families, U-CAM-MATRIX-EXPAND-14) ──
test("profile family: LAP-promote + CSS-with-G50, resolves through physics", () => {
  const m = loadMatrix(MATRIX);
  const rules = loadOptimizationRules(RULES);
  const r = resolveRecipe(m, "profile", { material_iso_group: "P", diameter_in: 1.0, finish: "rough" });
  assert.match(r.fusion_strategy, /profile/i);
  assert.equal(r.cutting_condition_directive.delegate_to, "prism_calc:speed_feed"); // turning-class
  const plan = applyOptimizationRules(r, rules);
  assert.ok(plan.optimization_plan.some((p) => p.id === "prof-lap-promote"), "profile must promote longhand -> LAP");
  const css = plan.optimization_plan.find((p) => p.id === "prof-css");
  assert.match(css.guard, /G50/, "profile CSS rule must carry the G50 cap");
});

test("face_grooving is a SEPARATE family from radial grooving + caps the sweeping face dia", () => {
  const m = loadMatrix(MATRIX);
  assert.ok(m.families.face_grooving, "face_grooving must exist as its own family");
  assert.ok(m.families.grooving, "radial grooving must still exist");
  assert.notEqual(m.families.face_grooving.fusion_strategy, m.families.grooving.fusion_strategy);
  const fg = loadOptimizationRules(RULES).families.face_grooving.rules.find((r) => r.id === "fgrv-g50");
  assert.match(fg.guard, /G50/);
});

test("live_tool_milling: MILLING physics (not turning) + the G94->G95 feed-mode-revert safety rule", () => {
  const m = loadMatrix(MATRIX);
  const r = resolveRecipe(m, "live_tool_milling", {});
  assert.match(r.cutting_condition_directive.op, /milling/i, "live tool must use milling, not turning, conditions");
  const rule = loadOptimizationRules(RULES).families.live_tool_milling.rules.find((r) => r.id === "lt-feedmode-revert");
  assert.equal(rule.roi, "safety");
  assert.match(rule.guard, /revert to G95|G95/);
});

test("peck_drill auto-inserts G74 peck on deep holes (safety)", () => {
  const rule = loadOptimizationRules(RULES).families.peck_drill.rules.find((r) => r.id === "pk-auto-insert");
  assert.equal(rule.roi, "safety");
  assert.match(rule.move, /G74/);
  assert.match(rule.guard, /peck MANDATORY/i);
});

test("tap is an honest STUB (declared, has rules, flagged unverified)", () => {
  const m = loadMatrix(MATRIX);
  assert.equal(m.families.tap.fusion_strategy_verified, false);
  assert.match(JSON.stringify(m.families.tap), /STUB/i, "tap must self-declare as a stub");
  assert.ok(loadOptimizationRules(RULES).families.tap.rules.length >= 1, "tap must still carry rules");
});

test("DIALECT REGRESSION: no family rule prescribes Fanuc G75 (Okuma corpus has none)", () => {
  const fams = loadOptimizationRules(RULES).families;
  for (const [famName, fam] of Object.entries(fams)) {
    for (const r of fam.rules) {
      // The cutoff/grooving guard may MENTION G75 only as an explicit "NOT G75" correction;
      // assert no rule prescribes it as the cycle to USE (move starting with use/G75-as-cycle).
      assert.doesNotMatch(r.move, /use the Okuma G75|G75 auto-depth/i, `${famName}/${r.id} prescribes the absent Fanuc G75`);
    }
  }
});

test("DIALECT REGRESSION (matrix): no global invariant or family cycle prescribes Fanuc G75", () => {
  // Caught a real P0 survivor in global_safety_invariants — this scan now guards the whole matrix,
  // not just the rules. "NOT G75" corrective mentions are fine; a PRESCRIPTION (peck (G75.., use G75) is not.
  const m = loadMatrix(MATRIX);
  const haystacks = [
    ...(m.global_safety_invariants || []),
    ...Object.values(m.families).flatMap((f) => [f.cutting_condition_rule || "", f.fixed_params?.cycle || ""]),
  ];
  for (const h of haystacks) {
    assert.doesNotMatch(h, /G75 auto-depth|use the Okuma G75|peck \(G75/i, `matrix prescribes the absent Fanuc G75: "${String(h).slice(0, 90)}"`);
  }
});
