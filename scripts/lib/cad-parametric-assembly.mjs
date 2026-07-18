/**
 * cad-parametric-assembly.mjs -- EQUATION-BASED PARAMETRIC ASSEMBLY templates (slot:delta, U-CAD-ASSEMBLY).
 * The assembly-making arm of the operator's parametric directive: a shared set of DRIVING variables drives
 * every component's dimensions AND their relative positions through EQUATIONS -- fit relationships
 * (bushing_id = shaft_dia + 2*clearance, housing_bore = bushing_od - interference) and placement
 * (bushing_z = (shaft_len - bushing_len)/2, bolt-circle x = R*cos(theta)). Change one driving variable and
 * the whole assembly -- mating dimensions and positions -- recomputes correctly.
 *
 * Composes the single-part idioms (cad-parametric-templates.mjs) into `cq.Assembly().add(part, loc=...)`
 * (the live-verified path; `.save()` is deprecated -> `.export()`). Pure: no I/O; the equations evaluate in
 * python at cadquery runtime, exactly like the single-part templates.
 *
 * @module scripts/lib/cad-parametric-assembly
 */

function fmt(n) {
  const s = Number(n).toFixed(4);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/**
 * Assembly template registry. Each entry:
 *   desc   -- title
 *   params -- driving variables [{name, desc, default}] (defaults let it render standalone)
 *   derived -- fit + position EQUATIONS (python statements over params + earlier derived)
 *   build  -- python lines that construct `assy` (a cq.Assembly) from the params/derived; positions are
 *             expressions, never literals
 */
export const ASSEMBLY_TEMPLATES = {
  "shaft-bushing-housing": {
    desc: "Shaft + bushing (slip fit) pressed into a housing (press fit)",
    params: [
      { name: "shaft_dia", desc: "shaft diameter", default: 10 },
      { name: "shaft_len", desc: "shaft length", default: 50 },
      { name: "bushing_len", desc: "bushing length", default: 20 },
      { name: "wall_bushing", desc: "bushing wall thickness", default: 3 },
      { name: "clearance", desc: "shaft->bushing slip clearance (radial)", default: 0.05 },
      { name: "interference", desc: "bushing->housing press interference", default: 0.02 },
      { name: "housing_od", desc: "housing outer diameter", default: 40 },
      { name: "housing_len", desc: "housing length", default: 25 },
    ],
    derived: [
      "bushing_id = shaft_dia + 2*clearance          # slip fit: bore = shaft + clearance",
      "bushing_od = bushing_id + 2*wall_bushing",
      "housing_bore = bushing_od - interference       # press fit: housing bore = bushing OD - interference",
      "bushing_z = (shaft_len - bushing_len) / 2       # centered on the shaft",
      "housing_z = bushing_z - (housing_len - bushing_len) / 2",
    ],
    build: [
      'shaft = cq.Workplane("XY").circle(shaft_dia/2).extrude(shaft_len)',
      'bushing = cq.Workplane("XY").circle(bushing_od/2).circle(bushing_id/2).extrude(bushing_len)',
      'housing = cq.Workplane("XY").circle(housing_od/2).circle(housing_bore/2).extrude(housing_len)',
      "assy = cq.Assembly()",
      'assy.add(shaft, name="shaft")',
      'assy.add(bushing, name="bushing", loc=cq.Location(cq.Vector(0, 0, bushing_z)))',
      'assy.add(housing, name="housing", loc=cq.Location(cq.Vector(0, 0, housing_z)))',
    ],
  },

  "bolt-circle-plate": {
    desc: "Round plate + a bolt-circle pattern of studs (positions by equation)",
    params: [
      { name: "plate_dia", desc: "plate diameter", default: 100 },
      { name: "plate_thick", desc: "plate thickness", default: 12 },
      { name: "bolt_circle_dia", desc: "bolt-circle diameter", default: 76 },
      { name: "bolt_dia", desc: "stud diameter", default: 8 },
      { name: "bolt_len", desc: "stud length above the plate", default: 20 },
      { name: "bolt_count", desc: "number of studs", default: 6 },
    ],
    derived: ["bc_radius = bolt_circle_dia / 2"],
    build: [
      "import math",
      'plate = cq.Workplane("XY").circle(plate_dia/2).extrude(plate_thick)',
      "assy = cq.Assembly()",
      'assy.add(plate, name="plate")',
      "for i in range(int(round(bolt_count))):",
      "    angle = i * 2 * math.pi / bolt_count            # even angular spacing (equation)",
      "    x = bc_radius * math.cos(angle)                 # bolt position on the circle",
      "    y = bc_radius * math.sin(angle)",
      '    bolt = cq.Workplane("XY").circle(bolt_dia/2).extrude(bolt_len)',
      '    assy.add(bolt, name=("bolt_%d" % i), loc=cq.Location(cq.Vector(x, y, plate_thick)))',
    ],
  },

  "two-plate-standoff": {
    desc: "Two plates held apart by a central standoff (gap = an equation)",
    params: [
      { name: "plate_size", desc: "square plate size", default: 60 },
      { name: "plate_thick", desc: "plate thickness", default: 6 },
      { name: "standoff_dia", desc: "standoff diameter", default: 16 },
      { name: "gap", desc: "clear gap between the plates", default: 30 },
    ],
    derived: [
      "standoff_len = gap                               # standoff length = the clear gap",
      "top_plate_z = plate_thick + gap                   # top plate sits above the bottom plate + gap",
    ],
    build: [
      'bottom = cq.Workplane("XY").box(plate_size, plate_size, plate_thick, centered=(True, True, False))',
      'standoff = cq.Workplane("XY").circle(standoff_dia/2).extrude(standoff_len)',
      'top = cq.Workplane("XY").box(plate_size, plate_size, plate_thick, centered=(True, True, False))',
      "assy = cq.Assembly()",
      'assy.add(bottom, name="bottom_plate")',
      'assy.add(standoff, name="standoff", loc=cq.Location(cq.Vector(0, 0, plate_thick)))',
      'assy.add(top, name="top_plate", loc=cq.Location(cq.Vector(0, 0, top_plate_z)))',
    ],
  },
};

/** True if `name` names a parametric assembly template. */
export function hasAssembly(name) {
  return Object.prototype.hasOwnProperty.call(ASSEMBLY_TEMPLATES, name);
}

/** List assembly template names. */
export function assemblyNames() {
  return Object.keys(ASSEMBLY_TEMPLATES);
}

/**
 * Render a runnable, EQUATION-BASED parametric assembly script: driving variables at the top, the fit +
 * position EQUATIONS, the component build, and `assy.export()`. `values` overrides the per-param defaults.
 */
export function renderAssemblyScript(name, values = {}) {
  const t = ASSEMBLY_TEMPLATES[name];
  if (!t) return null;
  const lines = ["import cadquery as cq", "import os", ""];
  lines.push(`# ===== PARAMETRIC ASSEMBLY: ${t.desc} =====`);
  lines.push("# Driving dimensions are VARIABLES (mm). Fit + position EQUATIONS derive component sizes and");
  lines.push("# placement -- change one variable and the whole assembly recomputes. (inch->mm already resolved.)");
  for (const p of t.params) {
    const v = values[p.name] != null ? values[p.name] : p.default;
    lines.push(`${p.name} = ${fmt(v)}  # ${p.desc}`);
  }
  if (t.derived?.length) { lines.push("", "# derived -- fit + position equations:"); lines.push(...t.derived); }
  lines.push("", "# components + placement:", ...t.build);
  lines.push("", "OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'assembly.step')", "assy.export(OUTPUT_STEP)", "");
  return lines.join("\n");
}

/**
 * Apply {name: value} overrides to an assembly's driving params (validates each names a real driving param +
 * is a positive number). Returns { values, changed } or throws (R12 -- never silently ignore). The derived
 * fit/position equations recompute in the rendered script.
 */
export function alterAssembly(name, overrides) {
  const t = ASSEMBLY_TEMPLATES[name];
  if (!t) throw new Error(`unknown assembly: ${name}`);
  const driving = t.params.map((p) => p.name);
  const drivingSet = new Set(driving);
  const values = {};
  for (const p of t.params) values[p.name] = p.default;
  const changed = [];
  for (const [k, v] of Object.entries(overrides || {})) {
    if (!drivingSet.has(k)) throw new Error(`'${k}' is not a driving parameter of ${name} (driving: ${driving.join(", ")})`);
    const num = Number(v);
    if (!Number.isFinite(num) || num <= 0) throw new Error(`invalid value for ${k}: ${JSON.stringify(v)} (must be a positive number)`);
    if (values[k] !== num) { values[k] = num; changed.push(k); }
  }
  return { values, changed };
}

/** CAD-agnostic assembly spec (JSON): driving params + equations + component/placement recipe. */
export function assemblySpec(name, values) {
  const t = ASSEMBLY_TEMPLATES[name];
  if (!t) return null;
  return {
    assembly: name,
    desc: t.desc,
    parameters: t.params.map((p) => ({ name: p.name, desc: p.desc, value: values ? values[p.name] ?? p.default : p.default, unit: "mm", driving: true })),
    equations: (t.derived || []).slice(),
    build: t.build.slice(),
  };
}
