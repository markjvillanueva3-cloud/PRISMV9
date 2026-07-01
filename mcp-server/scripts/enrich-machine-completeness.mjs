/**
 * enrich-machine-completeness.mjs (U-MACHDB-03 / Phase 3, slot:oscar 2026-06-26)
 *
 * LIVE-DATA PROOF for the physics/class gap-fill enricher (R15). Loads the full machineRegistry
 * (1015 machines), normalizes every record (machine-normalizer, U-MACHDB-02), enriches every
 * normalized record (machine-enricher, U-MACHDB-03), then independently measures per-attribute
 * coverage BEFORE (normalized) vs AFTER (enriched) with the SAME true-only predicate the audit uses,
 * and emits a delta artifact proving the GAP-band attributes jump toward ~100%.
 *
 * This is an independent re-measurement (it does NOT trust the engine's own coverage method) so the
 * proof is adversarial: if a derivation silently failed to fill a field, the AFTER number stays low.
 *
 * Run: node_modules/.bin/tsx mcp-server/scripts/enrich-machine-completeness.mjs
 * Out: state/shared/specs/MACHINE-ENRICHMENT-VERIFY-2026-06-26.{json,md}
 *
 * R12: source-dependent fields (spindle bore needs a taper; weight needs an envelope) are NOT
 * fabricated where the source is absent -- their AFTER number stays < 100% and that is reported
 * honestly, not hidden.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../..");
const OUT_JSON = resolve(REPO, "state/shared/specs/MACHINE-ENRICHMENT-VERIFY-2026-06-26.json");
const OUT_MD = resolve(REPO, "state/shared/specs/MACHINE-ENRICHMENT-VERIFY-2026-06-26.md");

const imp = (rel) => import(pathToFileURL(resolve(__dirname, rel)).href);
const { machineRegistry: reg } = await imp("../src/registries/MachineRegistry.ts");
const { normalizeMachine } = await imp("../src/registries/machine-normalizer.ts");
const { enrichMachine, classifyMachine } = await imp("../src/registries/machine-enricher.ts");

await reg.load();
const raw = [...reg.entries.values()].map((e) => e?.machine || e?.data || e).filter(Boolean);
const N = raw.length;
if (!N) { console.error("FATAL: machineRegistry loaded 0 machines"); process.exit(1); }

const normalized = raw.map(normalizeMachine);
const enriched = normalized.map(enrichMachine);

// ── independent coverage predicates (true-only for booleans, mirrors the audit) ──
const anyAxis = (fn) => (m) => m.axes.some((a) => { const v = fn(a); return v != null && v !== false; });
const FIELDS = {
  way_type: (m) => m.way_type,
  kinematics: (m) => m.kinematics?.type,
  axis_accuracy: anyAxis((a) => a.accuracy_um),
  axis_repeatability: anyAxis((a) => a.repeatability_um),
  rapid_rate: anyAxis((a) => a.rapid_mm_min),
  acceleration_gforce: anyAxis((a) => a.acceleration_m_s2),
  jerk: anyAxis((a) => a.jerk_m_s3),
  spindle_diameter: (m) => m.spindle.bore_mm,
  spindle_balance: (m) => m.spindle.balance_grade,
  spindle_thermal: (m) => m.spindle.thermal_growth_comp,
  rigidity_frf: (m) => m.frf?.natural_frequency_hz,
  thermal_comp: (m) => m.spindle.thermal_growth_comp,
  corner_rounding: (m) => m.controller.corner_control,
  look_ahead: (m) => m.controller.look_ahead_blocks,
  high_speed: (m) => m.capabilities.high_speed_machining,
  table_type: (m) => m.table.type,
  machine_weight: (m) => m.weight_kg,
  surface_finish: (m) => m.surface_finish_capability?.best_ra_um,
  build_quality: (m) => m.build_quality,
  robustness: (m) => m.robustness,
};
const measure = (list) =>
  Object.fromEntries(Object.entries(FIELDS).map(([k, fn]) => {
    const c = list.filter((m) => { const v = fn(m); return v != null && v !== false; }).length;
    return [k, { count: c, pct: Math.round((c / N) * 1000) / 10 }];
  }));

const before = measure(normalized);
const after = measure(enriched);

// ── class distribution (classify the NORMALIZED record, pre-enrich, for the TRUE distribution) ──
const tally = (key) => {
  const d = {};
  for (const m of normalized) { const c = classifyMachine(m)[key]; d[c] = (d[c] || 0) + 1; }
  return Object.fromEntries(Object.entries(d).sort((a, b) => b[1] - a[1]));
};
const distribution = { kind: tally("kind"), tier: tally("tier"), wayType: tally("wayType"), rpmClass: tally("rpmClass") };

// ── inferred-vs-OEM provenance accounting (how many fills are class-estimates) ──
const provFieldCount = (provKey) => {
  let inferred = 0, oem = 0;
  for (const m of enriched) {
    const v = m._provenance[provKey];
    if (v == null) continue;
    if (String(v).startsWith("inferred:")) inferred++; else oem++;
  }
  return { inferred, oem };
};
const provenance = {
  way_type: provFieldCount("way_type"),
  "spindle.balance_grade": provFieldCount("spindle.balance_grade"),
  "spindle.bore_mm": provFieldCount("spindle.bore_mm"),
  frf: provFieldCount("frf"),
  kinematics: provFieldCount("kinematics"),
  build_quality: provFieldCount("build_quality"),
};

// ── 5 real sample machines (eyeball the inferred values are sane) ──
const samples = enriched.slice(0, 5).map((m) => ({
  id: m.id, manufacturer: m.manufacturer, model: m.model,
  class: m._provenance["_class"],
  way_type: m.way_type, balance: m.spindle.balance_grade, bore_mm: m.spindle.bore_mm,
  frf: m.frf, build_quality: m.build_quality, robustness: m.robustness,
  best_ra_um: m.surface_finish_capability?.best_ra_um, kinematics: m.kinematics?.type,
  gforce: m._provenance["_gforce_g"],
  inferred_field_count: Object.values(m._provenance).filter((v) => String(v).startsWith("inferred:")).length,
}));

const report = {
  schemaVersion: "1.0.0",
  generated_for: "U-MACHDB-03 Phase 3 verification: physics/class gap-fill over all machines",
  total_machines: N,
  coverage_before_enrich: before,
  coverage_after_enrich: after,
  distribution,
  provenance,
  samples,
};
mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

// ── markdown ──
const band = (p) => (p >= 95 ? "STRONG" : p >= 15 ? "PARTIAL" : "GAP");
const rows = Object.keys(FIELDS)
  .map((k) => ({ k, b: before[k].pct, a: after[k].pct, d: Math.round((after[k].pct - before[k].pct) * 10) / 10 }))
  .sort((x, y) => y.d - x.d)
  .map((r) => `| ${r.k} | ${r.b}% | ${r.a}% | +${r.d} | ${band(r.a)} |`)
  .join("\n");
const distMd = (d) => Object.entries(d).map(([k, v]) => `${k}=${v}`).join(", ");
const provMd = Object.entries(provenance)
  .map(([k, v]) => `- \`${k}\`: ${v.inferred} inferred + ${v.oem} OEM = ${v.inferred + v.oem}/${N}`)
  .join("\n");
const md = `# Machine Database Enrichment Verification (2026-06-26, slot:oscar)

> U-MACHDB-03 / Phase 3 live-data proof. Regenerate: \`node_modules/.bin/tsx mcp-server/scripts/enrich-machine-completeness.mjs\`
> Pipeline: machineRegistry (${N}) -> normalizeMachine (U-MACHDB-02) -> enrichMachine (U-MACHDB-03).
> Coverage is independently re-measured here (true-only booleans, same predicate as the audit).

## Coverage: BEFORE (normalized only) -> AFTER (normalized + class/physics enrichment)
| Attribute | Before | After | Delta | Band(after) |
|---|---|---|---|---|
${rows}

## Class distribution (classified from the normalized record, pre-enrich)
- **kind**: ${distMd(distribution.kind)}
- **tier**: ${distMd(distribution.tier)}
- **wayType**: ${distMd(distribution.wayType)}
- **rpmClass**: ${distMd(distribution.rpmClass)}

## Provenance accounting (inferred class-estimate vs OEM-sourced)
${provMd}

> Every gap-fill is tagged \`inferred:<basis>\` in the machine's \`_provenance\` so a downstream
> consumer (sf_orchestrate / SFC page, wired in P5) can weight a class estimate below a datasheet value.
> Source-dependent fields stay < 100% where the source is absent (bore needs a taper, weight an
> envelope) -- NOT fabricated (R12).

## 5 sample enriched machines
\`\`\`json
${JSON.stringify(samples, null, 2)}
\`\`\`
`;
writeFileSync(OUT_MD, md);

console.log(`WROTE ${OUT_JSON}`);
console.log(`WROTE ${OUT_MD}`);
const gapsBefore = Object.entries(before).filter(([, v]) => v.pct < 15).map(([k]) => k);
const gapsAfter = Object.entries(after).filter(([, v]) => v.pct < 15).map(([k]) => k);
console.log(`total=${N}`);
console.log(`GAP attrs BEFORE (${gapsBefore.length}): ${gapsBefore.join(", ")}`);
console.log(`GAP attrs AFTER  (${gapsAfter.length}): ${gapsAfter.join(", ") || "(none)"}`);
