#!/usr/bin/env node
/**
 * lathe-rungc-step-loop.mjs -- slot:whiskey  [KIENZLE G1: Rung C-CAD STEP geometry leg]
 * ==========================================================================
 * Closes the STEP-side GEOMETRY leg of the lathe closed-loop test. The OCR/PDF
 * leg (U-W2C, lathe-rungc-ocr-loop.mjs) is GPU-bound (vision OCR); THIS leg reads
 * REAL JM part GEOMETRY from the 2,307 JM STEP files via occt-import-js (pure JS,
 * NO GPU) -> turning rotational profile -> TurningInput -> the production
 * print->program pipeline -> scored vs the Rung A empirical cloud (34,993 .MIN).
 * Because it is not GPU-contended it can RUN TO COMPLETION -> flips
 * full_geometry_loop_closed for the STEP path.
 *
 * Chain (all REAL production engines -- R15 test-through-the-path, no reconstruction):
 *   STEP -> stepFileToProfile (occt mesh -> rotational profile, units-resolved, body-segmented)
 *        -> profileToTurningFeatures (od_contour/id_contour features, mm) [SKIP if suspect / units-unknown]
 *        -> normalizeLatheInput (JM/Okuma defaults) -> TurningInput
 *        -> turningPrintToProgramEngine.runPipeline -> operations[] + collision_checks[]
 *        -> scoreProgram(operations, RungA bands)  (scripts/lib/lathe-band-score.mjs)
 *        -> scoreSafetyEfficiency (collision avoidance + cost + machining efficiency)
 *        -> pair to source .MIN via parsePartNumber (Rung C comparison set)
 *
 * MUST run via tsx (imports the .ts engines):
 *   npx tsx scripts/lathe-rungc-step-loop.mjs --all --limit 5
 *   npx tsx scripts/lathe-rungc-step-loop.mjs --step "JM DIE/FUSION.../9070219 OP2 v1.step"
 *
 * Resumable (reap-safe): each processed STEP appends to a cursor jsonl. STEP reads
 * are DETERMINISTIC (no stochastic vision) -- every outcome except an engine/import
 * failure is terminal, so a re-fire never re-processes a settled file.
 */
import { readFileSync, appendFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stepFileToProfile } from "./lathe-step-profile-probe.mjs";
import { profileToTurningFeatures } from "./lib/lathe-step-profile-to-features.mjs";
import { scoreProgram } from "./lib/lathe-band-score.mjs";
import { scoreSafetyEfficiency } from "./lib/lathe-safety-efficiency-score.mjs";
import { parsePartNumber } from "./lib/lathe-part-number.mjs";
import { fleetEnvelope } from "./lib/lathe-jm-fleet-envelope.mjs";
import { relevantTips } from "./lib/lathe-tribal-advisory.mjs";
import { buildLathePartCostInput } from "./lib/lathe-part-cost-inputs.mjs";
import { latheEconomicsParams } from "./lib/lathe-jm-cost-rates.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const DASH = join(REPO, "state", "shared", "dashboards");
const CURSOR = join(REPO, "state", "shared", "lathe-rungc-step-cursor.jsonl"); // gitignored
const RUNG_A = join(DASH, "lathe-jmdie-param-accuracy.json");
const STEP_ROOT = "H:/PRISM/JM DIE";

// Dirs that are NOT JM customer turned parts: toolholders, training/demo CAD, molds/cavities,
// and sinker-EDM electrodes (die cavities -- not bodies of revolution). Excluded from --all so the
// loop spends cycles on real turned candidates (the suspect filter is the second line of defense).
const EXCLUDE_RE = /(tool database|tooling|command holders|online training|[\\/]training[\\/]|basic cad|basic[_ ]?mold|basic[_ ]?cavity|[\\/]electrodes?[\\/]|[\\/]mold[\\/])/i;

// Validated clean turned-part STEP (U-W-STEP-SEGMENT live-validated: AGRATI 9070219 OP2 -> OD 15.4mm clean).
const DEFAULT_STEPS = [
  "JM DIE/FUSION CAD AND CAM FILES/JM/OKUMA(1756902819851)/AGRATI/9070219/9070219 OP2 v1.step",
];

function args() {
  const a = { all: false, limit: 5, step: null };
  for (let i = 2; i < process.argv.length; i++) {
    const t = process.argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--limit") a.limit = parseInt(process.argv[++i], 10) || a.limit;
    else if (!t.startsWith("--")) a.step = t;
  }
  return a;
}

const slugOf = (p) =>
  p.toLowerCase().replace(/[\\/]/g, "_").replace(/[^a-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

// Maxed lathe tribal corpus (extracted-tips) -> per-part advisory surfacing in the closed loop
// ("tribal knowledge factored in", advisory). Loaded once, fail-soft if absent.
const TRIBAL_CORPUS = join(REPO, "state", "shared", "lathe-tribal-corpus.jsonl");
let _tribalTips = null;
function loadTribalTips() {
  if (_tribalTips) return _tribalTips;
  _tribalTips = [];
  try {
    for (const line of readFileSync(TRIBAL_CORPUS, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const e = JSON.parse(line); if (e.kind === "extracted-tip" && e.tip) _tribalTips.push(e); } catch { /* skip */ }
    }
  } catch { /* corpus absent -> no advisories (fail-soft) */ }
  return _tribalTips;
}

// Canonical dedup/resume key: Windows is case-insensitive, and the --all walk (STEP_ROOT
// "H:/PRISM/...") vs --step/DEFAULT (REPO "H:/prism/...") reach the SAME file via different
// case. Key the cursor on lowercase so one physical part is counted ONCE (R12 -- no inflated
// steps_scored). [scrutiny arm B P1]
const canon = (rel) => rel.toLowerCase();

/**
 * Terminal (never re-run) ONLY for DETERMINISTIC geometry verdicts. Transient failures
 * (occt-failed / pipeline-threw / engines-failed) stay RETRIABLE -- a locked/half-written
 * STEP during a concurrent CAD export or a WASM OOM under fleet pressure must not be
 * permanently dropped. Mirrors the sibling OCR loop's whitelist. [scrutiny arm A P2]
 */
const TERMINAL_STAGES = new Set([
  "scored", "scored-no-bandable-ops", "missing", "units-unsupported", "suspect-not-revolution", "no-features",
]);
function isTerminal(r) {
  return r && r.stage && TERMINAL_STAGES.has(r.stage);
}
function alreadyDone() {
  const done = new Set();
  if (!existsSync(CURSOR)) return done;
  for (const line of readFileSync(CURSOR, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if (r.rel && isTerminal(r)) done.add(canon(r.rel)); } catch { /* skip */ }
  }
  return done;
}

/**
 * Recursively enumerate up to `limit` NOT-yet-done STEP/STP files under JM DIE, excluding
 * non-part dirs. Skips already-done files DURING the walk (not after) so a resume can never
 * starve by spending its budget on done entries clustered early in traversal. [scrutiny arm A P2]
 */
function enumerateSteps(done, limit) {
  const out = [];
  const walk = (dir) => {
    if (out.length >= limit) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= limit) return;
      const fp = join(dir, e.name);
      if (EXCLUDE_RE.test(fp)) continue;
      if (e.isDirectory()) walk(fp);
      else if (/\.(step|stp)$/i.test(e.name)) {
        const p = fp.replace(/\\/g, "/");
        if (!done.has(canon(p))) out.push(p);
      }
    }
  };
  walk(STEP_ROOT);
  return out;
}

/**
 * Pairing part# for a STEP filename: strip Fusion op/rev/descriptor suffixes
 * ("9070219 OP2 v1" -> "9070219") so a generated program pairs to its real .MIN, whose
 * filename is the bare part#. Falls back to the raw parse. [scrutiny arm A P2]
 */
function pairingPartNumber(filename) {
  const base = filename
    .replace(/\.(step|stp)$/i, "")
    .replace(/\s+(op\s*\d+|v\d+|finish|model|flat|rev\s*[a-z]|machine\s*\d+|setup|tri[\s-]?lobe).*$/i, "")
    .trim();
  return parsePartNumber(base).partNumber || parsePartNumber(filename).partNumber;
}

// part# -> [.MIN paths] index over the JM corpus (pair a generated program to its real source).
let _minIndex = null;
function minPathsForPart(partNumber) {
  if (!partNumber) return [];
  if (!_minIndex) {
    _minIndex = new Map();
    const walk = (dir) => {
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const fp = join(dir, e.name);
        if (e.isDirectory()) walk(fp);
        else if (/\.min$/i.test(e.name)) {
          const pn = parsePartNumber(e.name).partNumber;
          if (!pn) continue;
          if (!_minIndex.has(pn)) _minIndex.set(pn, []);
          _minIndex.get(pn).push(fp);
        }
      }
    };
    walk(STEP_ROOT);
  }
  return _minIndex.get(partNumber) || [];
}

let _enginesReady = false;
let _normalize, _pipeline, _partCost, _taylor, _fleetFloor = null;
/** Resolve the JM lathe fleet FLOOR (most restrictive lathe) from ShopConfig. Lightweight (no pipeline
 *  load) so main() can call it even on a rebuild-only run -> safety_basis stays accurate, not "PARTIAL"
 *  merely because nothing was processed this fire. Floor never marks a stall-on-the-weakest-machine SAFE. */
async function resolveFleetFloor() {
  if (_fleetFloor) return _fleetFloor;
  try {
    const { shopConfigurationEngine } = await import("../mcp-server/src/engines/ShopConfigurationEngine.js");
    const env = fleetEnvelope(shopConfigurationEngine.getMachines());
    if (env.ok) _fleetFloor = env.floor;
  } catch { /* limits stay undefined -> safety PARTIAL (honest fallback, never false-SAFE) */ }
  return _fleetFloor;
}
async function loadEngines() {
  if (_enginesReady) return;
  const E = "../mcp-server/src/engines/";
  _normalize = (await import(E + "PipelineHarnessAdaptersEngine.js")).normalizeLatheInput;
  _pipeline = (await import(E + "TurningPrintToProgramEngine.js")).turningPrintToProgramEngine;
  _partCost = (await import(E + "LathePartCostModelEngine.js")).lathePartCostModelEngine;
  _taylor = (await import("../mcp-server/src/physics/constants.js")).CANONICAL_TAYLOR; // taylorN for the economic-optimum flag
  await resolveFleetFloor();
  _enginesReady = true;
}

function record(obj) { appendFileSync(CURSOR, JSON.stringify(obj) + "\n"); }

async function processStep(stepPathAbs, opRef) {
  const rel = stepPathAbs.replace(/\\/g, "/");
  const ts = new Date().toISOString();
  const base = { ts, rel, slug: slugOf(rel) };
  if (!existsSync(stepPathAbs)) { const r = { ...base, ok: false, stage: "missing" }; record(r); return r; }

  try { await loadEngines(); }
  catch (e) { const r = { ...base, ok: false, stage: "engines-failed", error: String(e?.message || e) }; record(r); return r; }

  // 1) STEP -> rotational profile (occt mesh, units-resolved, body-segmented)
  let profile;
  try { profile = await stepFileToProfile(stepPathAbs); }
  catch (e) { const r = { ...base, ok: false, stage: "occt-failed", error: String(e?.message || e).slice(0, 180) }; record(r); return r; }

  // 2) reject non-turnable geometry HONESTLY (R12 -- never score against bad geometry)
  // units rail: only mm/inch are buildable; unknown/metre/etc -> refuse (25.4x / 1000x scale class).
  if (profile.units !== "mm" && profile.units !== "inch") {
    const r = { ...base, ok: false, stage: "units-unsupported", units: profile.units, mesh_count: profile.mesh_count }; record(r); return r;
  }
  if (profile.suspect) {
    const r = { ...base, ok: false, stage: "suspect-not-revolution", mesh_count: profile.mesh_count, symmetry_score: profile.symmetry_score, units: profile.units };
    record(r); return r;
  }

  // 3) profile -> turning features + stock
  const feat = profileToTurningFeatures(profile);
  if (!feat.ok) { const r = { ...base, ok: false, stage: "no-features", reason: feat.reason, units: profile.units }; record(r); return r; }

  // 4) build TurningInput (JM/Okuma defaults) + augment with finished OD, then generate the program
  const partNumber = pairingPartNumber(rel.split(/[\\/]/).pop());
  const ti = _normalize({
    part_number: partNumber || base.slug,
    bar_stock_od_mm: feat.bar_stock_od_mm,
    part_length_mm: feat.part_length_mm,
    features: feat.features,
  });
  ti.finished_od_mm = feat.finished_od_mm;
  // Apply the JM fleet-floor spindle/power envelope so collision-avoidance + overspeed/overpower
  // are actually scored (operator: "collision avoidance, cost efficiency, machining efficiency factored in").
  if (_fleetFloor) { ti.max_spindle_rpm = _fleetFloor.max_spindle_rpm; ti.max_power_kW = _fleetFloor.max_power_kW; }
  // Economic generation (U-W-GENERATOR-VC-ECONOMY): drive the generator to the Gilbert minimum-cost
  // cutting speed using the canonical JM cost rates, so emitted programs are cost-optimal -- fixes the
  // closed-loop finding that ~74% of generated parts ran an uneconomically short tool life. The Vc cap
  // only LOWERS an over-aggressive table speed (never raises), so safety/collision scoring is unaffected.
  ti.optimization_target = "min_cost";
  ti.economics = latheEconomicsParams();

  let prog;
  try { prog = _pipeline.runPipeline(ti); }
  catch (e) { const r = { ...base, ok: false, stage: "pipeline-threw", error: String(e?.message || e).slice(0, 180), units: profile.units }; record(r); return r; }
  if (!prog?.success || !Array.isArray(prog.operations) || prog.operations.length === 0) {
    const r = { ...base, ok: false, stage: "pipeline-no-ops", success: !!prog?.success, units: profile.units }; record(r); return r;
  }

  // 5) score vs Rung A empirical cloud + safety/efficiency, pair to the real .MIN
  const score = scoreProgram(prog.operations, opRef);
  const minMatches = minPathsForPart(partNumber);
  const bandable = score.band_scored_ops > 0; // geometry closed AND >=1 op validated vs the cloud (R12)
  // Cost leg (U-W-COST-WIRE): compute a per-part cost via the REAL LathePartCostModelEngine and inject
  // it into the scorer -> the closed-loop now actually computes "cost efficiency" (was manifest fiction).
  // STEP geometry carries no material -> the pipeline defaults to 1018/P, so iso_group is effectively
  // always "P" here; the read is defensive (uses a real ISO group if a future material-bearing path sets it).
  const isoGroup = (prog.material && prog.material.iso_group) || "P";
  const taylorN = (_taylor && _taylor[isoGroup] && Number.isFinite(_taylor[isoGroup].n)) ? _taylor[isoGroup].n : 0.25;
  let partCost = null;
  try {
    const costInput = buildLathePartCostInput({ prog, feat, isoGroup });
    const cr = _partCost.compute(costInput);
    partCost = { total_cost_with_scrap_amortized: cr.total_cost_with_scrap_amortized, total_cost: cr.total_cost, buckets: cr.buckets, _basis: costInput._basis };
  } catch { /* cost is advisory; never block scoring on a cost-model error (R12 honest: cost stays null) */ }
  // taylorN + economics enable the Gilbert economic-optimum tool-life floor (T_econ) for the economy flag
  // (U-W-ECONOMY-FLAG-RECALIBRATE) -- replaces the arbitrary 15-min floor with the real cost optimum.
  const safetyEff = scoreSafetyEfficiency(prog, { max_spindle_rpm: ti?.max_spindle_rpm, max_power_kW: ti?.max_power_kW, partCost, taylorN, economics: latheEconomicsParams() });

  // Tribal advisory: surface the maxed corpus's most-relevant shop tips for this part's ops+material.
  const opTypes = prog.operations.map((o) => o.operation_type).filter(Boolean);
  const matName = (prog.material && (prog.material.material_name || prog.material.name)) ||
    (typeof prog.material === "string" ? prog.material : "");
  const tribalAdvisory = relevantTips(loadTribalTips(), { opTypes, materialName: matName }, 3);

  const r = {
    ...base, ok: bandable, stage: bandable ? "scored" : "scored-no-bandable-ops",
    units: profile.units, mesh_count: profile.mesh_count, symmetry_score: profile.symmetry_score,
    part_number: partNumber,
    bar_stock_od_mm: feat.bar_stock_od_mm, finished_od_mm: feat.finished_od_mm,
    part_length_mm: feat.part_length_mm, bore_id_mm: feat.bore_id_mm ?? null,
    features: feat.features.length,
    material: prog.material,
    paired_min_count: minMatches.length,
    paired_min: minMatches.slice(0, 3).map((p) => p.replace(/\\/g, "/")),
    // Persist the wizard's per-op SFM/feed ONLY for parts paired to a real .MIN (the small set that can
    // be EXACT-pair scored), so lathe-pair-accuracy.mjs can score PRISM-vs-JM param-for-param vs the
    // paired program -- the per-part accuracy number the band score cannot give. Additive + targeted
    // (the 28 paired parts, not all 1049 scored) so the dashboard stays lean. (U-W-RUNGC-OP-PARAMS-PERSIST)
    ...(minMatches.length > 0 ? {
      op_params: prog.operations.map((o) => ({
        operation_type: o.operation_type,
        cutting_speed_m_min: o.cutting_params?.cutting_speed_m_min ?? null,
        feed_mm_rev: o.cutting_params?.feed_mm_rev ?? null,
      })),
    } : {}),
    total_ops: score.total_ops,
    band_scored_ops: score.band_scored_ops,
    sfm_in_band_pct: score.sfm_in_band_pct,
    ipr_in_band_pct: score.ipr_in_band_pct,
    both_in_band_pct: score.both_in_band_pct,
    safety_verdict: safetyEff.verdict,
    safety_violations: safetyEff.safety_violations,
    cycle_time_sec: safetyEff.efficiency.cycle_time_sec,
    avg_mrr_mm3_min: safetyEff.efficiency.avg_mrr_mm3_min,
    min_tool_life_min: safetyEff.efficiency.min_tool_life_min,
    cost_usd: safetyEff.efficiency.cost_usd,            // U-W-COST-WIRE: real per-part cost (LathePartCostModelEngine)
    cost_basis: safetyEff.efficiency.cost_basis,
    tool_life_economical: safetyEff.efficiency.tool_life_economical, // U-W-TOOLLIFE-ECONOMY: cost-aware machining-economy flag
    tool_cost_share: safetyEff.efficiency.tool_cost_share,           // tool bucket / total cost (why the flag fires or not)
    tribal_advisory: tribalAdvisory,
    tribal_advisory_count: tribalAdvisory.length,
  };
  record(r);
  return r;
}

function loadRungABands() {
  try { return JSON.parse(readFileSync(RUNG_A, "utf8")).op_parameter_reference || null; } catch { return null; }
}

function rebuildDashboard() {
  const byRel = new Map();
  if (existsSync(CURSOR)) {
    for (const line of readFileSync(CURSOR, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (r.rel) byRel.set(canon(r.rel), r); } catch { /* skip */ }
    }
  }
  const rows = [...byRel.values()];
  const scored = rows.filter((r) => r.ok && r.stage === "scored");
  const geometryOnly = rows.filter((r) => r.stage === "scored-no-bandable-ops");
  const avg = (sel) => {
    const vals = scored.map(sel).filter((v) => typeof v === "number");
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
  };
  const report = {
    schemaVersion: "1.0.0",
    rung: "C-CAD-STEP -- real JM STEP geometry -> rotational profile -> pipeline -> scored vs Rung A cloud",
    generated_at: new Date().toISOString(),
    ground_truth: "Rung A op_parameter_reference (34,993 real JM .MIN programs)",
    geometry_source: "occt-import-js mesh -> rotational profile (NO GPU)",
    safety_basis: _fleetFloor
      ? `JM fleet-floor ${_fleetFloor.max_spindle_rpm}rpm/${_fleetFloor.max_power_kW}kW (most restrictive lathe -- never under-protects; a flag = exceeds at least the weakest JM machine). NOTE: rpm axis is partly confirmatory (the program is G50-clamped to this floor); POWER is the discriminating axis. Collision is independently checked.`
      : "machine limits undefined -> rpm/power axes PARTIAL",
    tribal_advisory: {
      corpus_tips: loadTribalTips().length,
      parts_with_advisory: scored.filter((s) => (s.tribal_advisory_count || 0) > 0).length,
      sample: (scored.find((s) => Array.isArray(s.tribal_advisory) && s.tribal_advisory.length) || {}).tribal_advisory || [],
    },
    steps_attempted: rows.length,
    steps_scored: scored.length,
    steps_geometry_only: geometryOnly.length,
    steps_suspect_not_revolution: rows.filter((r) => r.stage === "suspect-not-revolution").length,
    steps_paired_to_min: scored.filter((r) => r.paired_min_count > 0).length,
    full_geometry_loop_closed: scored.length > 0, // TRUE only when >=1 STEP had >=1 band-scored op (R12)
    avg_sfm_in_band_pct: avg((r) => r.sfm_in_band_pct),
    avg_ipr_in_band_pct: avg((r) => r.ipr_in_band_pct),
    avg_both_in_band_pct: avg((r) => r.both_in_band_pct),
    safety_efficiency: {
      safe: scored.filter((r) => r.safety_verdict === "SAFE").length,
      unsafe: scored.filter((r) => r.safety_verdict === "UNSAFE").length,
      partial: scored.filter((r) => r.safety_verdict === "PARTIAL").length,
      total_safety_violations: scored.reduce((s, r) => s + (r.safety_violations || 0), 0),
      avg_cycle_time_sec: avg((r) => r.cycle_time_sec),
      avg_mrr_mm3_min: avg((r) => r.avg_mrr_mm3_min),
      min_tool_life_min: (() => {
        const vals = scored.map((r) => r.min_tool_life_min).filter((v) => typeof v === "number");
        return vals.length ? Math.min(...vals) : null;
      })(),
      avg_cost_usd: avg((r) => r.cost_usd),               // U-W-COST-WIRE: real cost leg ($/part, LathePartCostModelEngine)
      parts_with_cost: scored.filter((r) => typeof r.cost_usd === "number").length,
      uneconomical_tool_life_parts: scored.filter((r) => r.tool_life_economical === false).length, // U-W-TOOLLIFE-ECONOMY: <15min/edge
    },
    honest_note:
      "full_geometry_loop_closed (STEP subset) is TRUE only when >=1 STEP went geometry->profile->program " +
      "AND had >=1 op scored vs the empirical cloud (band_scored_ops>0). Non-revolution bodies (electrodes, " +
      "molds, toolholders, multi-body OP-setups) are correctly skipped as suspect -- never scored against bad " +
      "geometry. Material is defaulted (1018/P) since STEP geometry does not carry it -- speeds/feeds scoring " +
      "is therefore op-archetype-relative, not material-exact.",
    failures_by_stage: rows.filter((r) => !r.ok && r.stage !== "scored-no-bandable-ops")
      .reduce((m, r) => { m[r.stage] = (m[r.stage] || 0) + 1; return m; }, {}),
    steps: rows,
  };
  mkdirSync(DASH, { recursive: true });
  writeFileSync(join(DASH, "lathe-rungc-step.json"), JSON.stringify(report, null, 2));
  const md =
    `# Rung C-CAD STEP -- real JM STEP geometry -> program closed loop (lathe)\n\n` +
    `- generated: ${report.generated_at}\n- geometry: ${report.geometry_source}\n` +
    `- steps attempted: ${report.steps_attempted} | scored: ${report.steps_scored} | suspect-skipped: ${report.steps_suspect_not_revolution} | paired to .MIN: ${report.steps_paired_to_min}\n` +
    `- **full_geometry_loop_closed (STEP subset): ${report.full_geometry_loop_closed}**\n` +
    `- avg SFM in-band: ${report.avg_sfm_in_band_pct}% | IPR in-band: ${report.avg_ipr_in_band_pct}% | both: ${report.avg_both_in_band_pct}%\n` +
    `- safety: SAFE ${report.safety_efficiency.safe} / UNSAFE ${report.safety_efficiency.unsafe} / PARTIAL ${report.safety_efficiency.partial}\n` +
    `- tribal advisory: ${report.tribal_advisory.corpus_tips} corpus tips, ${report.tribal_advisory.parts_with_advisory} part(s) with surfaced shop tips\n\n` +
    `> ${report.honest_note}\n`;
  writeFileSync(join(DASH, "lathe-rungc-step.md"), md);
  return report;
}

async function main() {
  const a = args();
  const opRef = loadRungABands();
  if (!opRef) {
    console.log(JSON.stringify({ ok: false, error: `Rung A bands missing: ${RUNG_A}. Run lathe-jmdie-param-accuracy-harness.mjs first.` }));
    process.exit(1);
  }
  const done = alreadyDone();
  let queue;
  if (a.step) {
    const abs = /^[a-zA-Z]:[\\/]/.test(a.step) ? a.step : join(REPO, a.step.replace(/^\.\//, ""));
    queue = [abs.replace(/\\/g, "/")].filter((p) => !done.has(canon(p)));
  } else if (a.all) {
    queue = enumerateSteps(done, a.limit); // walk skips already-done + caps at limit
  } else {
    queue = DEFAULT_STEPS.map((p) => join(REPO, p).replace(/\\/g, "/")).filter((p) => !done.has(canon(p)));
  }
  const todo = queue.slice(0, a.all ? a.limit : (a.step ? 1 : DEFAULT_STEPS.length));
  const results = [];
  for (const abs of todo) results.push(await processStep(abs.replace(/\//g, "\\"), opRef));
  await resolveFleetFloor(); // safety_basis must be accurate even on a rebuild-only (todo empty) run
  const report = rebuildDashboard();
  console.log(JSON.stringify({
    ok: true, processed: results.length, remaining: a.all ? null : Math.max(0, queue.length - todo.length),
    steps_scored: report.steps_scored, steps_suspect: report.steps_suspect_not_revolution,
    steps_paired_to_min: report.steps_paired_to_min,
    full_geometry_loop_closed: report.full_geometry_loop_closed,
    avg_both_in_band_pct: report.avg_both_in_band_pct,
    results: results.map((r) => ({ rel: r.rel.split("/").slice(-2).join("/"), ok: r.ok, stage: r.stage, ops: r.total_ops, both_pct: r.both_in_band_pct })),
  }, null, 2));
}

main().catch((e) => { console.log(JSON.stringify({ ok: false, error: String(e?.message || e) })); process.exit(1); });
