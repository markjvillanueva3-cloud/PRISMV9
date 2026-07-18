/**
 * cam-tool-binder.mjs — bind a resolved CAM recipe's op-family tool_class to a CONCRETE
 * JM-owned tool, so kilo writes programs "based off jm tools / customer availability"
 * (operator /goal clause: utilize hotel/charlie data for jm purchased tools).
 *
 * Consumes a JM tool DB in the TOOL-DATA-CONTRACT shape that charlie/hotel own
 * (mcp-server/data/vendor-catalog-db, built from gitignored state/shared/quoting/ — NOT present
 * in kilo's worktree; see CAM-TOOL-DATA-CONTRACT.md). FAIL-LOUD: when the DB is absent or no
 * tool matches, returns a `pending`/`no-match` status — NEVER fabricates a tool (a made-up tool
 * = an unsafe program). ISO-group grade match is preferred; material-unknown stays pending.
 *
 * SCOPE: the binder matches on `op_families` + `grade_iso_groups` ONLY. It carries iso_shape +
 * nose_radius_in through on the bound tool but does NOT validate finish/shape suitability or the
 * feed-vs-nose-radius gate — those are delegated downstream to the physics surface
 * (cutting_condition_directive, which owns the constants). See CAM-TOOL-DATA-CONTRACT.md §Binder scope.
 *
 * Pure (no I/O, no engine import) — the caller loads the tool DB and passes it in.
 */

/** Load-bearing status enum — single home so the bindToolsForPart tally's `bound`-prefix
 *  coupling and the tests reference one source (a typo'd literal would otherwise pass silently). */
export const TOOL_BIND_STATUS = Object.freeze({
  PENDING_TOOL_DATA: "pending_tool_data",       // DB absent/empty — fail loud, do not fabricate
  NO_TOOL_FOR_FAMILY: "no_tool_for_family",      // procurement gap — JM owns nothing for this op family
  BOUND_ISO_MATCHED: "bound_iso_matched",        // tool + grade rated for the part's ISO group
  BOUND_NO_ISO_GRADE_MATCH: "bound_no_iso_grade_match", // family covered, no grade for this ISO group
  BOUND_MATERIAL_PENDING: "bound_material_pending",     // tool covers family; ISO group not yet resolved
});

/**
 * @param {object} recipe  a resolved recipe (from cam-turning-recipe-resolver) — uses .family + .jm_tool
 * @param {object|null} toolDb  { tools: [{ id, op_families:[], tcode, holder, insert:{iso_shape, nose_radius_in, grade_iso_groups:[]} }] }
 * @param {object} inputs  { material_iso_group?, ... }
 * @returns {{ bound:(object|null), status:string, reason:string, alternatives:number }}
 *   alternatives — count of OTHER JM tools covering this op family (not necessarily ISO-grade compatible).
 */
export function bindTool(recipe, toolDb, inputs = {}) {
  if (!recipe || !recipe.family) throw new Error("bindTool: a recipe with .family is required");
  if (!toolDb || !Array.isArray(toolDb.tools) || toolDb.tools.length === 0) {
    return {
      bound: null,
      status: TOOL_BIND_STATUS.PENDING_TOOL_DATA,
      reason: "JM tool DB absent (charlie/hotel vendor-catalog-db not provided to kilo's tree) — see CAM-TOOL-DATA-CONTRACT.md; do NOT fabricate a tool",
      alternatives: 0,
    };
  }
  const fam = recipe.family;
  const iso = inputs.material_iso_group ?? recipe?.cutting_condition_directive?.inputs?.material_iso_group ?? null;

  const candidates = toolDb.tools.filter((t) => Array.isArray(t.op_families) && t.op_families.includes(fam));
  if (candidates.length === 0) {
    return { bound: null, status: TOOL_BIND_STATUS.NO_TOOL_FOR_FAMILY, reason: `no JM-owned tool covers op family '${fam}' — procurement gap, surface to charlie/hotel`, alternatives: 0 };
  }

  const isoMatch = iso ? candidates.filter((t) => Array.isArray(t.insert?.grade_iso_groups) && t.insert.grade_iso_groups.includes(iso)) : [];
  const chosen = isoMatch[0] || candidates[0];
  const bound = { id: chosen.id, tcode: chosen.tcode ?? null, holder: chosen.holder ?? null, insert: chosen.insert ?? null };
  const others = candidates.length - 1;

  let status, reason;
  if (isoMatch.length) {
    status = TOOL_BIND_STATUS.BOUND_ISO_MATCHED;
    reason = `bound ${chosen.id} for ${fam} / ISO-${iso} (grade match)`;
  } else if (iso) {
    status = TOOL_BIND_STATUS.BOUND_NO_ISO_GRADE_MATCH;
    // include candidate breadth — strengthens the procurement-gap teaching signal (contract §3)
    reason = `${chosen.id} covers ${fam} but JM owns no insert grade for ISO-${iso} across ${candidates.length} candidate(s) — verify grade or flag procurement`;
  } else {
    status = TOOL_BIND_STATUS.BOUND_MATERIAL_PENDING;
    reason = `${chosen.id} covers ${fam}; ISO-grade match pending material resolution (units-first — do not assume)`;
  }
  return { bound, status, reason, alternatives: others };
}

/**
 * Bind tools for every op in a part-program plan (from cam-part-program-planner).
 * @returns {{ ordered_ops:Array, tool_summary:{bound,pending,no_tool,total} }}
 */
export function bindToolsForPart(plan, toolDb) {
  if (!plan || !Array.isArray(plan.ordered_ops)) throw new Error("bindToolsForPart: a plan with ordered_ops[] is required");
  const ordered_ops = plan.ordered_ops.map((op) => {
    const inputs = { material_iso_group: plan.material_iso_group };
    return { ...op, tool_binding: bindTool(op, toolDb, inputs) };
  });
  const BOUND = new Set([
    TOOL_BIND_STATUS.BOUND_ISO_MATCHED,
    TOOL_BIND_STATUS.BOUND_NO_ISO_GRADE_MATCH,
    TOOL_BIND_STATUS.BOUND_MATERIAL_PENDING,
  ]);
  const tally = { bound: 0, pending: 0, no_tool: 0, total: ordered_ops.length };
  for (const op of ordered_ops) {
    const s = op.tool_binding.status;
    if (BOUND.has(s)) tally.bound++;
    else if (s === TOOL_BIND_STATUS.NO_TOOL_FOR_FAMILY) tally.no_tool++;
    else tally.pending++; // pending_tool_data
  }
  return { ...plan, ordered_ops, tool_summary: tally };
}
