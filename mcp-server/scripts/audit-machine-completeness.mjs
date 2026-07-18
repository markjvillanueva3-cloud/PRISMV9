/**
 * audit-machine-completeness.mjs (U-MACHDB-01, slot:oscar 2026-06-26)
 *
 * Operator directive: "Check ALL machines in the database to ensure they ALL have
 * accurate kinematics, work envelopes, way type, rigidity, thermo, spindle Ø/caps,
 * table type/weight, g-forces (accel/jerk), high-speed, look-ahead, corner-rounding,
 * surface-finish, controller-specific capabilities..."
 *
 * This is the AUDIT half: enumerate the full machineRegistry (1000+ machines), measure
 * per-attribute coverage with HETEROGENEITY-AWARE multi-path matching (the loaded data
 * uses ~100 key-name variants per sub-object -- spindle power appears as power_continuous /
 * power_kW / power_kw / peakHp ...), and report the schema-fragmentation that makes even
 * "covered" attributes unreliable to consume. Emits a JSON + MD artifact under
 * state/shared/specs/. Regenerate: node_modules/.bin/tsx mcp-server/scripts/audit-machine-completeness.mjs
 *
 * R12: this MEASURES gaps; it does not fabricate fills. The fill is U-MACHDB-02+.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../..");
const OUT_JSON = resolve(REPO, "state/shared/specs/MACHINE-COMPLETENESS-AUDIT-2026-06-26.json");
const OUT_MD = resolve(REPO, "state/shared/specs/MACHINE-COMPLETENESS-AUDIT-2026-06-26.md");

const { machineRegistry: reg } = await import(pathToFileURL(resolve(__dirname, "../src/registries/MachineRegistry.ts")).href);
await reg.load();
const all = [...reg.entries.values()].map((e) => e?.machine || e?.data || e).filter(Boolean);
const N = all.length;

// ── heterogeneity-aware accessors ──────────────────────────────────────────────
const anyPath = (m, paths) =>
  paths.some((p) => {
    try {
      const v = p.split(".").reduce((o, k) => (o == null ? o : o[k]), m);
      return typeof v === "number" ? Number.isFinite(v) : v != null && v !== "";
    } catch {
      return false;
    }
  });
/** check a field across axis_specs.{x,y,z,...} OR axes[] regardless of casing */
const axisHas = (m, fields) => {
  const fs = Array.isArray(fields) ? fields : [fields];
  const axisObjs = m?.axis_specs ? Object.values(m.axis_specs) : Array.isArray(m?.axes) ? m.axes : [];
  return axisObjs.some((a) => a && fs.some((f) => a[f] != null && a[f] !== ""));
};

// ── operator attribute list -> coverage predicate (multi-path, alias-aware) ─────
const ATTRS = {
  work_envelope: (m) => axisHas(m, "travel") || anyPath(m, ["envelope.x_travel", "travels.x", "workEnvelope.x", "dimensions.x_travel"]),
  kinematics: (m) => anyPath(m, ["kinematic_chain.type", "kinematic_chain", "transformations"]),
  way_type: (m) => axisHas(m, ["guideway", "guideway_type"]) || anyPath(m, ["guideway", "way_type", "construction.guideway", "bed_construction"]),
  axis_accuracy: (m) => axisHas(m, ["accuracy", "positioning_accuracy"]),
  axis_repeatability: (m) => axisHas(m, ["repeatability"]),
  rapid_rate: (m) => axisHas(m, ["rapid", "rapid_rate"]),
  acceleration_gforce: (m) => axisHas(m, ["acceleration"]) || anyPath(m, ["dynamics.acceleration"]),
  jerk: (m) => axisHas(m, ["jerk"]) || anyPath(m, ["dynamics.jerk"]),
  spindle_rpm: (m) => anyPath(m, ["spindle.max_rpm", "spindle.rpm_max", "spindle.maxRpm", "spindle.rpm", "spindle.ratedRpm"]),
  spindle_power: (m) => anyPath(m, ["spindle.power_continuous", "spindle.power_kW", "spindle.power_kw", "spindle.power", "spindle.peakHp", "spindle.continuousHp", "spindle.power_hp", "spindle.peakPower"]),
  spindle_torque: (m) => anyPath(m, ["spindle.torque_max", "spindle.torque_Nm", "spindle.torque_nm", "spindle.torque", "spindle.maxTorque_Nm", "spindle.peakTorque"]),
  spindle_taper: (m) => anyPath(m, ["spindle.taper", "spindle.spindle_nose", "spindle.spindleNose", "spindle.interface", "spindle.nose"]),
  spindle_diameter: (m) => anyPath(m, ["spindle.bore_mm", "spindle.bore_diameter", "spindle.bearing_diameter", "spindle.bearingDiameter", "spindle.spindle_bore", "spindle.diameter"]),
  spindle_balance: (m) => anyPath(m, ["spindle.balance", "spindle.balance_grade", "spindle.dynamic_balance"]),
  spindle_bearing: (m) => anyPath(m, ["spindle.bearing_type", "spindle.bearingType", "spindle.bearing_arrangement", "spindle.bearing_preload"]),
  spindle_thermal: (m) => anyPath(m, ["spindle.thermal_growth_compensation", "spindle.thermal_stability", "spindle.thermal_growth", "spindle.optiCool", "spindle.cooling"]),
  table_type: (m) => anyPath(m, ["table.type", "table_type", "table.style"]),
  table_load: (m) => anyPath(m, ["table.max_load", "table.load_kg", "table.maxLoad", "table.maxWorkpieceWeight"]),
  machine_weight: (m) => anyPath(m, ["dimensions.weight_kg", "weight", "dimensions.weight", "physical.weight_kg"]),
  rigidity_frf: (m) => anyPath(m, ["frf_data.natural_frequency_hz", "rigidity", "dynamics.frf", "stiffness", "frf"]),
  thermal_comp: (m) => anyPath(m, ["thermal_compensation", "thermal", "controller.thermal_compensation", "controller.ai_thermal_shield", "controller.thermo_friendly", "controller.volumetric_compensation", "spindle.thermal_growth_compensation"]),
  controller_model: (m) => anyPath(m, ["controller.model", "controller.type", "controller.brand", "controller.cnc_type"]),
  look_ahead: (m) => anyPath(m, ["controller.look_ahead", "controller.lookahead", "controller.look_ahead_blocks"]),
  corner_rounding: (m) => anyPath(m, ["controller.corner_rounding", "controller.ai_contour_control_II", "controller.ai_contour_control", "controller.smooth_tolerance_control", "controller.high_precision_contour", "controller.nano_smoothing", "controller.high_speed_machining", "controller.hsm_cycles"]),
  surface_finish: (m) => anyPath(m, ["surface_finish_capability", "capabilities.surface_finish", "surface_finish"]),
  high_speed: (m) => anyPath(m, ["high_speed_machining", "features.hsm", "capabilities.hsm", "controller.high_speed_machining"]) || (Number(m?.spindle?.max_rpm || m?.spindle?.maxRpm || m?.spindle?.rpm || 0) >= 15000),
  look_ahead_consistency: (m) => anyPath(m, ["controller.look_ahead", "controller.look_ahead_blocks", "controller.block_processing_time", "controller.max_block_rate"]),
  build_quality: (m) => anyPath(m, ["build_quality", "grade", "tier", "construction.class"]),
  robustness: (m) => anyPath(m, ["robustness", "duty", "duty_cycle"]),
  tool_changer: (m) => anyPath(m, ["atc.capacity", "tool_changer.capacity", "atc.type"]),
};

const coverage = {};
for (const [k, fn] of Object.entries(ATTRS)) {
  const c = all.filter(fn).length;
  coverage[k] = { count: c, pct: Math.round((c / N) * 1000) / 10 };
}

// ── schema-fragmentation: key-variant union per sub-object ──────────────────────
const keyUnion = (pick) => {
  const kf = {};
  for (const m of all) {
    const o = pick(m);
    if (o && typeof o === "object") for (const k of Object.keys(o)) kf[k] = (kf[k] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(kf).sort((a, b) => b[1] - a[1]));
};
const fragmentation = {
  spindle: keyUnion((m) => m?.spindle),
  axis: keyUnion((m) => (m?.axis_specs ? Object.values(m.axis_specs)[0] : Array.isArray(m?.axes) ? m.axes[0] : null)),
  controller: keyUnion((m) => m?.controller),
  topLevel: keyUnion((m) => m),
};

const stats = (() => { try { return reg.getStats(); } catch { return {}; } })();
const report = {
  schemaVersion: "1.0.0",
  generated_for: "operator directive 2026-06-26: comprehensive machine spec completeness",
  total_machines: N,
  byType: stats.byType || {},
  manufacturers: Object.keys(stats.byManufacturer || {}).length,
  coverage,
  fragmentation_top: {
    spindle_power_variants: ["power_continuous", "power_kW", "power_kw", "peakHp", "continuousHp", "power_hp", "power"].map((k) => [k, fragmentation.spindle[k] || 0]),
    spindle_rpm_variants: ["max_rpm", "rpm", "maxRpm", "ratedRpm"].map((k) => [k, fragmentation.spindle[k] || 0]),
    note: "These variants are the SAME physical quantity under different keys -> a consumer reading one canonical key silently drops the machines using the others. Normalization is prerequisite #1.",
  },
  fragmentation,
};

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

const band = (p) => (p >= 95 ? "STRONG" : p >= 15 ? "PARTIAL" : "GAP");
const rows = Object.entries(coverage)
  .sort((a, b) => b[1].pct - a[1].pct)
  .map(([k, v]) => `| ${k} | ${v.count} | ${v.pct}% | ${band(v.pct)} |`)
  .join("\n");
const md = `# Machine Database Completeness Audit (2026-06-26, slot:oscar)

> Regenerate: \`node_modules/.bin/tsx mcp-server/scripts/audit-machine-completeness.mjs\`
> Operator directive: ensure ALL machines have accurate kinematics/envelope/way-type/rigidity/
> thermo/spindle/table/g-forces/look-ahead/corner-rounding/surface-finish/controller caps.

## Total: ${N} machines (${report.manufacturers} manufacturers)

## Per-attribute coverage (heterogeneity-aware, multi-path)
| Attribute | Have | Coverage | Band |
|---|---|---|---|
${rows}

## #1 issue -- schema fragmentation (NOT normalized)
Spindle power is stored under ${report.fragmentation_top.spindle_power_variants.filter((x) => x[1] > 0).length} different keys:
${report.fragmentation_top.spindle_power_variants.filter((x) => x[1] > 0).map(([k, v]) => `- \`${k}\`: ${v}`).join("\n")}

Spindle rpm under: ${report.fragmentation_top.spindle_rpm_variants.filter((x) => x[1] > 0).map(([k, v]) => `\`${k}\`(${v})`).join(", ")}.

A consumer (e.g. \`sf_orchestrate\`) reading one canonical key silently drops every machine that
uses a variant. **Normalization to ONE canonical schema is prerequisite #1**, then gap-fill the
GAP-band attributes. Full key-variant union: see the JSON artifact.
`;
writeFileSync(OUT_MD, md);
console.log(`WROTE ${OUT_JSON}`);
console.log(`WROTE ${OUT_MD}`);
console.log(`total=${N} | GAP attrs: ${Object.entries(coverage).filter(([, v]) => v.pct < 15).map(([k]) => k).join(", ")}`);
