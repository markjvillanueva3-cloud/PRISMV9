/**
 * cad-fusion-params.mjs -- emit a PRISM parametric template/assembly spec as FUSION 360 USER-PARAMETERS +
 * PARAMETER-EQUATIONS (slot:delta, U-CAD-FUSION-PARAMS). Roadmap P4 -- the per-CAD-system arm of the operator's
 * parametric directive: the SAME canonical template (named driving variables + geometric equations) that the
 * cadquery emitters use becomes real, editable Fusion user-parameters, so a regenerated model in Fusion is
 * itself parametric (change the parameter in Fusion -> the equations recompute), not a baked constant.
 *
 * Consumes `templateSpec(shape, values)` (cad-parametric-templates.mjs) OR `assemblySpec(name, values)`
 * (cad-parametric-assembly.mjs) -- both expose { parameters:[{name,value,unit}], equations:[...] }. Emits the
 * op list + the Fusion API python that Fusion360CADGeneratorAdapter's `parameter_declare` / `parameter_equation`
 * cases (Fusion360CADGeneratorAdapter.ts:845-863) already produce, so this is the same contract, no divergence.
 *
 * UNIT SAFETY (the Fusion cm=2.54 trap): every parameter is declared in MM via
 * `ValueInput.createByString("<value> mm")` -- the explicit unit string is parsed correctly regardless of
 * Fusion's internal cm, so we NEVER pass a raw number (createByReal) that Fusion would misread as cm. This is
 * a different, correct path from the geometry `lengthToCm` conversion; the template stays mm-native.
 *
 * Pure: no I/O. @module scripts/lib/cad-fusion-params
 */

/**
 * Parse a derived-equation line ("inner = outer - 2*wall          # slip fit: ...") into { name, expression }
 * or null. Strips a trailing `# comment`. The RHS is a python arithmetic expression over other parameter
 * names -- valid Fusion expression syntax as-is (Fusion parameters reference each other by name: `outer - 2*wall`).
 */
export function parseEquationLine(line) {
  const s = String(line || "").replace(/#.*$/, "").trim(); // drop the trailing comment
  if (!s) return null;
  const eq = s.indexOf("=");
  if (eq <= 0) return null;
  const name = s.slice(0, eq).trim();
  const expression = s.slice(eq + 1).trim();
  if (!/^[A-Za-z_]\w*$/.test(name) || !expression) return null; // LHS must be a bare identifier
  return { name, expression };
}

/**
 * Convert a parametric SPEC (templateSpec or assemblySpec) into Fusion user-parameter OPS. Driving params ->
 * a `parameter_declare` each (value + explicit mm unit). Each derived equation -> a `parameter_declare`
 * (placeholder 0, so the parameter exists) + a `parameter_equation` (its expression over the other params).
 * A `for`-loop / `import` line in an assembly's equations (rare) is skipped -- only `name = expr` equations map.
 * Returns { ops: [...] }.
 */
export function specToFusionOps(spec) {
  if (!spec || !Array.isArray(spec.parameters)) return null;
  const ops = [];
  const declared = new Set();
  for (const p of spec.parameters) {
    if (p.value == null || !Number.isFinite(Number(p.value))) continue; // a driving param must have a concrete value
    ops.push({ op: "parameter_declare", name: p.name, value: Number(p.value), unit: p.unit || "mm" });
    declared.add(p.name);
  }
  for (const line of spec.equations || []) {
    const eq = parseEquationLine(line);
    if (!eq) continue; // not a `name = expr` equation (loop/import/comment) -> skip
    if (!declared.has(eq.name)) { ops.push({ op: "parameter_declare", name: eq.name, value: 0, unit: "mm" }); declared.add(eq.name); }
    ops.push({ op: "parameter_equation", name: eq.name, expression: eq.expression });
  }
  return { ops };
}

/** Escape a string for embedding in a python double-quoted literal. */
function pyStr(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Format a declared parameter value: trim binary-float noise (38.099999999999994 -> 38.1) without altering
 *  a real value; 4 decimals is finer than any drafting tolerance and matches the cadquery emitters' fmt(). */
function fmtVal(n) {
  const s = Number(n).toFixed(4);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/**
 * Render the Fusion 360 API python that materializes the ops as user-parameters -- BYTE-IDENTICAL to the two
 * emitter cases in Fusion360CADGeneratorAdapter (parameter_declare / parameter_equation), so this is the same
 * contract the adapter already ships. `numberOnly` (default false) omits the header comment for embedding.
 */
export function renderFusionParams(spec, { header = true } = {}) {
  const built = specToFusionOps(spec);
  if (!built) return null;
  const lines = [];
  if (header) {
    const label = spec.assembly ? `ASSEMBLY ${spec.assembly}` : spec.shape;
    lines.push(`# ===== FUSION 360 user-parameters for PARAMETRIC ${label} =====`);
    lines.push("# Each driving dimension is an editable Fusion USER PARAMETER (mm); derived dims are Fusion");
    lines.push("# EXPRESSIONS over them -- change a parameter in Fusion and the model recomputes. (mm-native via");
    lines.push("# createByString, so the cm=2.54 API trap cannot occur.)");
  }
  for (const op of built.ops) {
    if (op.op === "parameter_declare") {
      lines.push(`design.userParameters.add("${pyStr(op.name)}", adsk.core.ValueInput.createByString("${fmtVal(op.value)} ${op.unit}"), "${op.unit}", "")`);
    } else {
      lines.push(`design.userParameters.itemByName("${pyStr(op.name)}").expression = "${pyStr(op.expression)}"`);
    }
  }
  return lines.join("\n");
}
