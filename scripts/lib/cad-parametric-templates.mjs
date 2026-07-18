/**
 * cad-parametric-templates.mjs -- EQUATION-BASED PARAMETRIC TEMPLATE library for PRISM CAD generation
 * (slot:delta, U-CAD-PARAMETRIC). Operator directive 2026-07-04: "make equation based templates so that
 * dimensions can be variably inputed and not hard locked so its more efficient and accurate."
 *
 * The deterministic emitters (cad-primitive-emit.mjs / cad-feature-emit.mjs) draw each part with HARD-CODED
 * mm values (e.g. `circle(19.05).extrude(25.4)`). This module lifts every shape family into a PARAMETRIC
 * template: named DIMENSION VARIABLES + the geometric relationships as EQUATIONS (radius = dia/2, inner =
 * outer - 2*wall, construction rect = size - 2*inset, groove floor = dia/2 - depth, ...). One template per
 * shape is reused for every instance -- change a variable, regenerate. This is:
 *   - EFFICIENT: one template, N instances; the geometry is written once, dimensions vary.
 *   - ACCURATE: the relationships are encoded ONCE as equations, so they can never drift per-instance.
 *   - VARIABLE-INPUT: the driving dimensions are python variables at the top of the emitted script (or the
 *     arguments of a reusable `def make_<shape>(...)` function) -- exactly like a Fusion/hyperCAD user
 *     parameter or an equation-driven sketch dimension.
 *
 * The templates are cadquery/python-agnostic in structure (params + derived equations + guards + a body that
 * references the param NAMES), so the same schema can be emitted for Fusion user-parameters etc. (see the
 * per-CAD mapping work). Pure: no I/O.
 *
 * @module scripts/lib/cad-parametric-templates
 */

/** Format a number for code (fixed, trim trailing zeros): 22.2500 -> 22.25, 50.0 -> 50. */
function fmt(n) {
  const s = Number(n).toFixed(4);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/**
 * The parametric template registry. Each entry:
 *   desc     -- human title
 *   params   -- ordered DRIVING dimensions [{name, desc}] (these become the variables / function args). The
 *               order matches the corresponding emitter's `dimsMm` UNLESS `fromDims` remaps it.
 *   derived  -- equations computing dependent values from the driving params (python statements)
 *   guards   -- python assertions expressing the validity relationships (drawn from the emitter guards)
 *   body     -- the cadquery expression, written in terms of the param NAMES + derived names (the equations)
 *   fromDims -- OPTIONAL (dimsMm) => {paramName: value}; when the emitter's dimsMm are not the natural driving
 *               params (e.g. a square tube stores [outer, inner, len] but is driven by [outer, wall, len]).
 */
export const TEMPLATES = {
  // ---- plain primitives ----
  cube: {
    desc: "Rectangular block",
    params: [{ name: "length", desc: "X" }, { name: "width", desc: "Y" }, { name: "height", desc: "Z" }],
    guards: ["length > 0", "width > 0", "height > 0"],
    body: 'cq.Workplane("XY").box(length, width, height)',
  },
  cylinder: {
    desc: "Cylinder / disc",
    params: [{ name: "dia", desc: "diameter" }, { name: "length", desc: "length / thickness" }],
    guards: ["dia > 0", "length > 0"],
    body: 'cq.Workplane("XY").circle(dia/2).extrude(length)', // radius = dia/2
  },
  tube: {
    desc: "Tube / bushing / flat washer (annulus)",
    params: [{ name: "outer_dia", desc: "OD" }, { name: "inner_dia", desc: "ID / bore" }, { name: "length", desc: "length / thickness" }],
    guards: ["outer_dia > inner_dia", "inner_dia > 0", "length > 0"],
    body: 'cq.Workplane("XY").circle(outer_dia/2).circle(inner_dia/2).extrude(length)',
  },
  cone: {
    desc: "Truncated cone / tapered plug / frustum",
    params: [{ name: "base_dia", desc: "base diameter" }, { name: "top_dia", desc: "top diameter" }, { name: "height", desc: "height" }],
    guards: ["base_dia > 0", "top_dia >= 0", "height > 0", "base_dia != top_dia"],
    body: "cq.Solid.makeCone(base_dia/2, top_dia/2, height)",
  },
  "square-tube": {
    desc: "Hollow square tube",
    params: [{ name: "outer", desc: "outside square size" }, { name: "wall", desc: "wall thickness" }, { name: "length", desc: "length" }],
    derived: ["inner = outer - 2*wall"], // the defining equation
    guards: ["outer > 0", "wall > 0", "length > 0", "inner > 0"],
    body: 'cq.Workplane("XY").rect(outer, outer).rect(inner, inner).extrude(length)',
    fromDims: (d) => ({ outer: d[0], wall: (d[0] - d[1]) / 2, length: d[2] }), // emitter stores [outer, inner, len]
  },

  // ---- hole / bore features ----
  "box-hole": {
    desc: "Plate + single centered through-hole",
    params: [{ name: "length", desc: "X" }, { name: "width", desc: "Y" }, { name: "height", desc: "Z (hole axis)" }, { name: "hole_dia", desc: "hole diameter" }],
    guards: ["hole_dia > 0", "hole_dia < min(length, width)"],
    body: 'cq.Workplane("XY").box(length, width, height).faces(">Z").workplane().hole(hole_dia)',
  },
  "round-hole": {
    desc: "Round part + concentric center hole (washer/annulus)",
    params: [{ name: "outer_dia", desc: "OD" }, { name: "hole_dia", desc: "center hole" }, { name: "thickness", desc: "thickness" }],
    guards: ["outer_dia > hole_dia", "hole_dia > 0", "thickness > 0"],
    body: 'cq.Workplane("XY").circle(outer_dia/2).circle(hole_dia/2).extrude(thickness)',
  },
  counterbore: {
    desc: "Counterbored cylinder (die button)",
    params: [{ name: "base_dia", desc: "OD" }, { name: "base_height", desc: "height" }, { name: "bore_dia", desc: "through bore" }, { name: "cbore_dia", desc: "counterbore recess dia" }, { name: "cbore_depth", desc: "counterbore depth" }],
    guards: ["bore_dia < base_dia", "cbore_dia > bore_dia", "cbore_dia < base_dia", "cbore_depth < base_height"],
    body: 'cq.Workplane("XY").circle(base_dia/2).extrude(base_height).faces(">Z").workplane().cboreHole(bore_dia, cbore_dia, cbore_depth)',
  },
  "bore-keyway": {
    desc: "Keyed bushing (keyway cut into the bore wall)",
    params: [{ name: "outer_dia", desc: "OD" }, { name: "inner_dia", desc: "bore" }, { name: "length", desc: "length" }, { name: "key_width", desc: "keyway width" }, { name: "key_depth", desc: "keyway depth" }],
    derived: ["bore_r = inner_dia/2", "wall = (outer_dia - inner_dia)/2"],
    guards: ["outer_dia > inner_dia", "key_width < inner_dia", "key_depth < wall"],
    // box tangent to the bore wall (y = bore_r), 2*depth tall so half is inside the wall = depth
    body: 'cq.Workplane("XY").circle(outer_dia/2).circle(inner_dia/2).extrude(length).cut(cq.Workplane("XY").transformed(offset=(0, bore_r, 0)).box(key_width, 2*key_depth, length, centered=(True, True, False)))',
  },

  // ---- stacked-cylinder features ----
  "stepped-shaft": {
    desc: "Flanged / stepped shaft (two concentric stacked cylinders)",
    params: [{ name: "flange_dia", desc: "flange (base) dia" }, { name: "flange_thick", desc: "flange thickness" }, { name: "shaft_dia", desc: "shaft dia" }, { name: "shaft_length", desc: "shaft length" }],
    guards: ["flange_dia != shaft_dia", "flange_thick > 0", "shaft_length > 0"],
    body: 'cq.Workplane("XY").circle(flange_dia/2).extrude(flange_thick).faces(">Z").workplane().circle(shaft_dia/2).extrude(shaft_length)',
  },
  "two-body": {
    desc: "Two concentric stacked cylinders (pilot punch / die button / shouldered disc)",
    params: [{ name: "lower_dia", desc: "lower segment dia" }, { name: "lower_height", desc: "lower height" }, { name: "upper_dia", desc: "upper segment dia" }, { name: "upper_height", desc: "upper height" }],
    guards: ["lower_dia != upper_dia", "lower_height > 0", "upper_height > 0"],
    body: 'cq.Workplane("XY").circle(lower_dia/2).extrude(lower_height).faces(">Z").workplane().circle(upper_dia/2).extrude(upper_height)',
  },
  "shouldered-disc": {
    desc: "Base disc + a narrower raised boss (alias of two-body)",
    params: [{ name: "base_dia", desc: "base dia" }, { name: "base_thick", desc: "base thickness" }, { name: "boss_dia", desc: "boss dia" }, { name: "boss_height", desc: "boss height" }],
    guards: ["boss_dia < base_dia", "base_thick > 0", "boss_height > 0"],
    body: 'cq.Workplane("XY").circle(base_dia/2).extrude(base_thick).faces(">Z").workplane().circle(boss_dia/2).extrude(boss_height)',
  },

  // ---- edge / pocket / slot / groove features ----
  "chamfer-box": {
    desc: "Block + 45deg chamfer on the top edges",
    params: [{ name: "length", desc: "X" }, { name: "width", desc: "Y" }, { name: "height", desc: "Z" }, { name: "chamfer", desc: "chamfer leg (45deg)" }],
    guards: ["chamfer < height", "2*chamfer < min(length, width)"],
    body: 'cq.Workplane("XY").box(length, width, height).faces(">Z").edges().chamfer(chamfer)',
  },
  "chamfer-cyl": {
    desc: "Cylinder + chamfer on both ends",
    params: [{ name: "dia", desc: "diameter" }, { name: "length", desc: "length" }, { name: "chamfer", desc: "chamfer leg" }],
    guards: ["chamfer < dia/2", "2*chamfer < length"],
    body: 'cq.Workplane("XY").circle(dia/2).extrude(length).edges("%CIRCLE").chamfer(chamfer)',
  },
  "pocket-box": {
    desc: "Block + centered square pocket",
    params: [{ name: "length", desc: "X" }, { name: "width", desc: "Y" }, { name: "height", desc: "Z" }, { name: "pocket_width", desc: "pocket size (square)" }, { name: "pocket_depth", desc: "pocket depth" }],
    guards: ["pocket_width < min(length, width)", "pocket_depth < height"],
    body: 'cq.Workplane("XY").box(length, width, height).faces(">Z").workplane().rect(pocket_width, pocket_width).cutBlind(-pocket_depth)',
  },
  "plate-slot": {
    desc: "Plate + centered milled (blind) slot",
    params: [{ name: "length", desc: "X" }, { name: "width", desc: "Y" }, { name: "height", desc: "Z" }, { name: "slot_length", desc: "slot length" }, { name: "slot_width", desc: "slot width" }, { name: "slot_depth", desc: "slot depth" }],
    guards: ["slot_length < min(length, width)", "slot_depth < height", "slot_length >= slot_width"],
    body: 'cq.Workplane("XY").box(length, width, height).faces(">Z").workplane().slot2D(slot_length, slot_width).cutBlind(-slot_depth)',
  },
  "plate-thruslot": {
    desc: "Plate + centered through slot",
    params: [{ name: "length", desc: "X" }, { name: "width", desc: "Y" }, { name: "height", desc: "Z" }, { name: "slot_length", desc: "slot length" }, { name: "slot_width", desc: "slot width" }],
    guards: ["slot_length < min(length, width)", "slot_length >= slot_width"],
    body: 'cq.Workplane("XY").box(length, width, height).faces(">Z").workplane().slot2D(slot_length, slot_width).cutThruAll()',
  },
  "shaft-keyway": {
    desc: "Shaft + axial keyway running the length",
    params: [{ name: "dia", desc: "shaft dia" }, { name: "length", desc: "shaft length" }, { name: "key_width", desc: "keyway width" }, { name: "key_depth", desc: "keyway depth" }],
    derived: ["outer_r = dia/2"],
    guards: ["key_width < dia", "key_depth < dia/2"],
    body: 'cq.Workplane("XY").circle(dia/2).extrude(length).cut(cq.Workplane("XY").transformed(offset=(0, outer_r, 0)).box(key_width, 2*key_depth, length, centered=(True, True, False)))',
  },
  "shaft-groove": {
    desc: "Shaft + circumferential (O-ring / retaining) groove at a position",
    params: [{ name: "dia", desc: "shaft dia" }, { name: "length", desc: "shaft length" }, { name: "groove_width", desc: "groove width" }, { name: "groove_depth", desc: "groove depth" }, { name: "groove_pos", desc: "groove center from one end" }],
    derived: ["outer_r = dia/2", "floor_r = dia/2 - groove_depth"], // groove floor radius = OD/2 - depth
    guards: ["groove_depth < dia/2", "groove_pos - groove_width/2 > 0", "groove_pos + groove_width/2 < length"],
    body: 'cq.Workplane("XY").circle(dia/2).extrude(length).cut(cq.Workplane("XY").circle(outer_r + 1).circle(floor_r).extrude(groove_width).translate((0, 0, groove_pos - groove_width/2)))',
  },
  "v-groove": {
    desc: "Cube + 90deg V-groove across the top (45deg walls)",
    params: [{ name: "size", desc: "cube size" }, { name: "v_depth", desc: "V depth" }],
    derived: ["top = size/2"], // 90deg V: half-width at depth d equals d (45deg walls) -> corners (+-v_depth, top), apex (0, top - v_depth)
    guards: ["v_depth < size/2"],
    body: 'cq.Workplane("XY").box(size, size, size).cut(cq.Workplane("XZ").polyline([(-v_depth, top), (v_depth, top), (0, top - v_depth)]).close().extrude(size, both=True))',
  },

  // ---- patterns ----
  "corner-holes": {
    desc: "Square plate + a hole in each corner, inset from the edges",
    params: [{ name: "size", desc: "square plate size" }, { name: "thickness", desc: "thickness" }, { name: "hole_dia", desc: "hole diameter" }, { name: "inset", desc: "inset from each edge" }],
    derived: ["constr = size - 2*inset"], // holes sit at the corners of a construction rect inset from the edges
    guards: ["constr > hole_dia", "inset > 0", "thickness > 0"],
    body: 'cq.Workplane("XY").box(size, size, thickness).faces(">Z").workplane().rect(constr, constr, forConstruction=True).vertices().hole(hole_dia)',
  },
};

const HEADER = ["import cadquery as cq", "from cadquery import exporters", "import os", ""];
const FOOTER = ["", "OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')", "exporters.export(result, OUTPUT_STEP)", ""];

/** True if `shape` has a parametric template. */
export function hasTemplate(shape) {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, shape);
}

/** Map an emitter's `dimsMm` array to the template's named driving-parameter values. */
export function paramsFromDims(shape, dimsMm) {
  const t = TEMPLATES[shape];
  if (!t || !Array.isArray(dimsMm)) return null;
  if (typeof t.fromDims === "function") return t.fromDims(dimsMm);
  const out = {};
  t.params.forEach((p, i) => { out[p.name] = dimsMm[i]; });
  return out;
}

/**
 * Render a fully-runnable, EQUATION-BASED parametric script: the driving dimensions are named python
 * VARIABLES at the top (edit + re-run to regenerate), followed by the derived EQUATIONS, validity assertions,
 * and the geometry expressed over those variables. This is the "variable template containing equations".
 */
export function renderParametricScript(shape, values, opts = {}) {
  const t = TEMPLATES[shape];
  if (!t) return null;
  const lines = [...HEADER];
  lines.push(`# ===== PARAMETRIC ${t.desc} =====`);
  lines.push("# Every dimension below is a VARIABLE (mm). Change one and re-run to regenerate -- not hard-coded.");
  lines.push("# inch -> mm is resolved before this template (values already in mm).");
  for (const p of t.params) {
    if (values[p.name] == null) return null; // missing a driving dimension
    lines.push(`${p.name} = ${fmt(values[p.name])}  # ${p.desc}`);
  }
  if (t.derived?.length) { lines.push("", "# derived dimensions (equations):"); for (const e of t.derived) lines.push(e); }
  if (t.guards?.length && opts.assert !== false) { lines.push("", "# validity (engineering relationships):"); for (const g of t.guards) lines.push(`assert ${g}, ${JSON.stringify("invalid: " + g)}`); }
  lines.push("", `result = ${t.body}`);
  lines.push(...FOOTER);
  return lines.join("\n");
}

/** Render the template as a REUSABLE python function `def make_<shape>(driving params): ... return geometry`. */
export function renderParametricFunction(shape) {
  const t = TEMPLATES[shape];
  if (!t) return null;
  const fn = `make_${shape.replace(/-/g, "_")}`;
  const args = t.params.map((p) => p.name).join(", ");
  const lines = [`def ${fn}(${args}):`, `    """${t.desc}. All dimensions in mm."""`];
  for (const e of t.derived || []) lines.push(`    ${e}`);
  for (const g of t.guards || []) lines.push(`    assert ${g}, ${JSON.stringify("invalid: " + g)}`);
  lines.push(`    return ${t.body}`);
  return lines.join("\n");
}

/**
 * Emit a CAD-system-agnostic parametric SPEC (JSON-able) for downstream emitters (Fusion user-parameters,
 * hyperCAD equations, Mastercam). Separates the DRIVING variables, the derived EQUATIONS, the validity
 * relationships, and the geometry recipe -- the single source of truth all three CAD targets map from.
 */
export function templateSpec(shape, values) {
  const t = TEMPLATES[shape];
  if (!t) return null;
  return {
    shape,
    desc: t.desc,
    parameters: t.params.map((p) => ({ name: p.name, desc: p.desc, value: values ? values[p.name] ?? null : null, unit: "mm", driving: true })),
    equations: (t.derived || []).slice(),
    constraints: (t.guards || []).slice(),
    geometry: t.body,
  };
}

/**
 * PART ALTER -- the payoff of parametric templates: apply {name: value} overrides to a base parameter set and
 * regenerate. Only DRIVING parameters are overridable; every DERIVED value (inner = outer - 2*wall, etc.)
 * recomputes automatically from the equations in the emitted script. Validates each override names a real
 * driving param + is a positive number. Returns { params, changed } or throws (R12 -- never silently ignore
 * an unknown parameter). This is "dimensions can be variably inputed" from the operator directive.
 */
export function alterParams(shape, baseParams, overrides) {
  const t = TEMPLATES[shape];
  if (!t) throw new Error(`unknown shape: ${shape}`);
  const driving = t.params.map((p) => p.name);
  const drivingSet = new Set(driving);
  const params = { ...baseParams };
  const changed = [];
  for (const [k, v] of Object.entries(overrides || {})) {
    if (!drivingSet.has(k)) throw new Error(`'${k}' is not a driving parameter of ${shape} (driving: ${driving.join(", ")})`);
    const num = Number(v);
    if (!Number.isFinite(num) || num <= 0) throw new Error(`invalid value for ${k}: ${JSON.stringify(v)} (must be a positive number, mm)`);
    if (params[k] !== num) { params[k] = num; changed.push(k); }
  }
  return { params, changed };
}

/** Re-render a shape's parametric script with overrides applied. The derived equations recompute at runtime. */
export function alterScript(shape, baseParams, overrides, opts) {
  const { params } = alterParams(shape, baseParams, overrides);
  return renderParametricScript(shape, params, opts);
}

export { fmt as _fmtForTest };
