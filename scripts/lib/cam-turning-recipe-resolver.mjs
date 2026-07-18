/**
 * cam-turning-recipe-resolver.mjs — resolve a CAM operation TEMPLATE (from
 * state/shared/cam-drive/CAM-OP-TEMPLATE-MATRIX.json) against concrete part + tool
 * inputs into a CONCRETE per-operation recipe ready for the Fusion-drive generator.
 *
 * This is the OFFLINE, verifiable core of generator build-step #5 (the live Fusion
 * binding — #5b — is gated on the Fusion restart that loads the new add-in routes +
 * on validating each `fusion_strategy` against the live CAM template list).
 *
 * IT DOES NOT COMPUTE PHYSICS. Per the PRISM rule (never inline Kienzle/Taylor/SFM/
 * material constants), it RESOLVES the template structure and emits an explicit
 * `cutting_condition_directive` naming WHICH physics surface to call and WHICH inputs
 * to pass — the numbers are computed downstream by prism_calc / UltimateSpeedFeed /
 * whiskey lathe surfaces, never fabricated here. observed_baseline numbers from the
 * matrix are carried only as `optimize_against` context (historical JM data), never as
 * the recommendation.
 *
 * Safety: every resolved recipe carries the family safety gates PLUS the global
 * invariants that apply to it (G50 cap under CSS, L/D for boring, peck for deep
 * groove/part, multi-pass threading) — as RULES to enforce downstream, with a warning
 * when an input needed to evaluate a gate is missing.
 */

import { readFileSync } from "node:fs";

export const DEFAULT_MATRIX_PATH = "state/shared/cam-drive/CAM-OP-TEMPLATE-MATRIX.json";
export const DEFAULT_OPT_RULES_PATH = "state/shared/cam-drive/CAM-OPTIMIZATION-RULES.json";

/** Load + parse the optimization-rules matrix. Throws (fail-loud) on missing/garbage. */
export function loadOptimizationRules(path = DEFAULT_OPT_RULES_PATH) {
  const m = JSON.parse(readFileSync(path, "utf-8"));
  if (!m || typeof m !== "object" || !m.families) {
    throw new Error(`optimization rules at ${path} have no .families — wrong file or corrupt`);
  }
  return m;
}

/**
 * Apply the per-family optimization rules to a resolved recipe → adds `optimization_plan[]`
 * (the actionable "learn to optimize" moves) + an `optimization_summary`. Material-dependent
 * rules (e.g. SFM) are flagged `pending_material_resolution` when the recipe has no resolved
 * ISO group — no silent default (SFM is material-dependent; see CAM-OPTIMAL-REFERENCE-FINDINGS).
 */
export function applyOptimizationRules(recipe, rulesMatrix) {
  if (!recipe || !recipe.family) throw new Error("applyOptimizationRules: a recipe with .family is required");
  const fam = rulesMatrix?.families?.[recipe.family];
  const materialKnown = recipe?.cutting_condition_directive?.inputs?.material_iso_group != null;
  const plan = (fam?.rules ?? []).map((r) => ({
    id: r.id,
    axis: r.axis,
    move: r.move,
    roi: r.roi,
    physics_delegate: !!r.physics_delegate,
    material_dependent: !!r.material_dependent,
    guard: r.guard ?? null,
    evidence: r.evidence ?? null,
    status: r.material_dependent && !materialKnown ? "pending_material_resolution" : "ready",
  }));
  const byRoi = {};
  for (const p of plan) byRoi[p.roi] = (byRoi[p.roi] ?? 0) + 1;
  return {
    ...recipe,
    optimization_plan: plan,
    optimization_summary: {
      total: plan.length,
      ready: plan.filter((p) => p.status === "ready").length,
      pending_material: plan.filter((p) => p.status !== "ready").length,
      by_roi: byRoi,
      objective_priority: rulesMatrix.objective_priority ?? ["safety", "accuracy", "time", "efficiency"],
    },
  };
}

/** Load + parse the template matrix. Throws (fail-loud) on missing/garbage file. */
export function loadMatrix(path = DEFAULT_MATRIX_PATH) {
  const raw = readFileSync(path, "utf-8");
  const m = JSON.parse(raw);
  if (!m || typeof m !== "object" || !m.families) {
    throw new Error(`matrix at ${path} has no .families — wrong file or corrupt`);
  }
  return m;
}

/** Family keys present in the matrix (e.g. facing, OD_roughing, threading…). */
export function listFamilies(matrix) {
  return Object.keys(matrix.families || {});
}

// Which physics surface owns each family's cutting-condition computation.
// Threading/grooving/parting have dedicated lathe surfaces; the rest go to speed/feed.
const FAMILY_PHYSICS = {
  threading: { delegate_to: "whiskey:prism_thread", op: "thread_infeed_schedule" },
  grooving: { delegate_to: "whiskey:prism_turning", op: "groove_conditions" },
  face_grooving: { delegate_to: "whiskey:prism_turning", op: "groove_conditions" },
  parting_cutoff: { delegate_to: "whiskey:prism_turning", op: "partoff_conditions" },
  // live-tool milling is MILLING physics (feed-per-tooth), NOT turning — distinct surface.
  live_tool_milling: { delegate_to: "prism_calc:speed_feed", op: "milling_conditions" },
  peck_drill: { delegate_to: "prism_calc:speed_feed", op: "drilling_conditions" },
  tap: { delegate_to: "prism_calc:speed_feed", op: "tapping_conditions" },
  // profile / chamfer / bore_finish are turning-class -> DEFAULT_PHYSICS (turning_conditions).
};
const DEFAULT_PHYSICS = { delegate_to: "prism_calc:speed_feed", op: "turning_conditions" };

/**
 * Resolve one family template against concrete inputs.
 * @param {object} matrix  parsed CAM-OP-TEMPLATE-MATRIX.json
 * @param {string} familyKey  e.g. "OD_roughing"
 * @param {object} inputs  { material_iso_group?, diameter_in?, finish?('rough'|'finish'|'na'),
 *   tool?, bore_depth_in?, groove_width_in?, groove_depth_in?, thread_tpi?, units? }
 * @returns resolved recipe (see below) — never fabricates cutting numbers.
 */
export function resolveRecipe(matrix, familyKey, inputs = {}) {
  const fam = matrix.families?.[familyKey];
  if (!fam) {
    const have = listFamilies(matrix).join(", ");
    throw new Error(`unknown family '${familyKey}' — have: ${have}`);
  }
  const warnings = [];
  const units = inputs.units || matrix.units || "inch";
  if (matrix.units && inputs.units && inputs.units !== matrix.units) {
    warnings.push(`UNITS MISMATCH: input ${inputs.units} vs matrix ${matrix.units} — resolve from source before geometry (25.4x risk)`);
  }

  // Bind each variable_param to its driver input where the caller supplied it.
  const variableParamsResolved = (fam.variable_params || []).map((vp) => {
    const driver = vp.driver || "";
    const bound = bindDriver(driver, inputs);
    if (bound === undefined && vp.name && /sfm|feed|doc|rpm|peck|pass/i.test(vp.name)) {
      warnings.push(`variable_param '${vp.name}' driver '${driver}' has no supplied input — physics will use defaults`);
    }
    return {
      name: vp.name,
      driver,
      bound_input: bound === undefined ? null : bound,
      source: vp.source || vp.rule || null,
      rule: vp.rule || null,
    };
  });

  // Cutting-condition DIRECTIVE — names the surface + inputs; carries NO numbers.
  const phys = FAMILY_PHYSICS[familyKey] || DEFAULT_PHYSICS;
  const cuttingDirective = {
    delegate_to: phys.delegate_to,
    op: phys.op,
    inputs: {
      material_iso_group: inputs.material_iso_group ?? null,
      diameter_in: inputs.diameter_in ?? null,
      finish: inputs.finish ?? "na",
      tool_class: fam.jm_tool_mapping?.tool_class ?? null,
      tool_grade: inputs.tool?.grade ?? null,
      bore_depth_in: inputs.bore_depth_in ?? null,
      groove_width_in: inputs.groove_width_in ?? null,
      groove_depth_in: inputs.groove_depth_in ?? null,
      thread_tpi: inputs.thread_tpi ?? null,
    },
    note: "compute SFM/feed/DOC here; NEVER inline constants. Returns {sfm,feed,doc,rpm,confidence}.",
    optimize_against: fam.observed_baseline ?? null, // historical JM data — beat it, don't reuse it
  };
  if (inputs.material_iso_group == null) {
    warnings.push("material_iso_group missing — physics cannot pick kc/SFM; resolve material from source");
  }

  // Safety gates: family gates + applicable globals, each with a 'needs' flag if an
  // input required to evaluate it is absent.
  const safetyGates = buildSafetyGates(fam, familyKey, inputs, warnings);

  // JM tool binding.
  const jmTool = {
    class: fam.jm_tool_mapping?.tool_class ?? null,
    tcode: fam.jm_tool_mapping?.tcode ?? null,
    source: fam.jm_tool_mapping?.source ?? null,
    bound: inputs.tool ?? null,
  };
  if (!inputs.tool) {
    warnings.push(`no JM tool supplied — bind from ShopToolLibrary/${jmTool.source || "vendor catalog"} before drive`);
  }

  if (fam.fusion_strategy_verified === false) {
    warnings.push(`fusion_strategy '${fam.fusion_strategy}' is UNVERIFIED — validate against the live add-in CAM template list before drive`);
  }

  return {
    family: familyKey,
    units,
    fusion_strategy: fam.fusion_strategy ?? null,
    fusion_strategy_verified: fam.fusion_strategy_verified === true,
    applies_when: fam.applies_when ?? null,
    fixed_params: fam.fixed_params ?? {},
    variable_params_resolved: variableParamsResolved,
    cutting_condition_directive: cuttingDirective,
    jm_tool: jmTool,
    safety_gates: safetyGates,
    optimizations: fam.optimizations_over_baseline ?? [],
    warnings,
    ready_to_drive: warnings.filter((w) => /UNITS MISMATCH|missing|UNVERIFIED/i.test(w)).length === 0,
  };
}

/** Map a template driver phrase to a supplied input value (best-effort, returns undefined if none). */
function bindDriver(driver, inputs) {
  const d = String(driver).toLowerCase();
  if (/diameter|dia\b|bore dia|groove dia/.test(d)) return inputs.diameter_in ?? inputs.bore_dia_in;
  if (/material|iso group/.test(d)) return inputs.material_iso_group;
  if (/finish|ra\b/.test(d)) return inputs.finish;
  if (/depth|l\/d|overhang/.test(d)) return inputs.bore_depth_in ?? inputs.groove_depth_in;
  if (/pitch|tpi/.test(d)) return inputs.thread_tpi;
  if (/width/.test(d)) return inputs.groove_width_in;
  return undefined;
}

/**
 * Compose the family's safety gates with the global invariants that apply to it.
 * Each gate is { rule, enforce, needs?:[...absent inputs...] }. We emit the RULE to
 * enforce downstream (physics owns the numbers); a missing input → a warning, not a
 * silent pass.
 */
function buildSafetyGates(fam, familyKey, inputs, warnings) {
  const gates = (fam.safety_gates || []).map((g) => ({ rule: g, enforce: true }));
  const usesCss = /facing|OD_|parting/.test(familyKey) ||
    JSON.stringify(fam).includes("G96");
  if (usesCss) {
    const needsDia = inputs.diameter_in == null;
    gates.push({
      rule: "G50 max-rpm cap MUST be emitted under G96 (CSS spikes rpm as dia→0)",
      enforce: true,
      needs: needsDia ? ["diameter_in"] : [],
    });
    if (needsDia) warnings.push("CSS family but diameter_in missing — cannot size the G50 cap; resolve before drive");
  }
  if (familyKey === "ID_boring") {
    const haveLD = inputs.bore_depth_in != null;
    gates.push({
      rule: "boring-bar L/D ≤ 4 steel / ≤ 6 carbide — else derate or escalate whiskey deflection",
      enforce: true,
      needs: haveLD ? [] : ["bore_depth_in", "bar_dia_in"],
    });
  }
  if (familyKey === "grooving" || familyKey === "parting_cutoff") {
    const haveDepth = inputs.groove_depth_in != null || inputs.diameter_in != null;
    gates.push({
      rule: "depth > 3× insert width → MUST peck (no single full-depth plunge)",
      enforce: true,
      needs: haveDepth ? [] : ["groove_depth_in or part diameter", "insert_width_in"],
    });
  }
  if (familyKey === "threading") {
    gates.push({ rule: "multi-pass infeed (no full-depth single pass); spindle-sync feed = pitch", enforce: true });
  }
  return gates;
}
