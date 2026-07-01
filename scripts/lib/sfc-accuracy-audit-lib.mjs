/**
 * SFC-ACCURACY-MS2 -- Variability-corpus accuracy auditor (pure core + reader).
 *
 * The SFC-ACCURACY-MS1 harness (sfc-variability-batch-run.mjs) COMPUTES millions
 * of speed/feed configurations and persists one JSONL row per config under
 * state/shared/sfc-variability-results/<domain>/chunk-*.jsonl. Computing them is
 * only half the operator goal ("run millions of variations so we KNOW all
 * calculations are accurate") -- the missing half is VERIFYING the outputs.
 *
 * This module is that verification half: a set of physics-invariant checks that
 * stream the corpus and surface every row where the engine's own output is
 * physically impossible, self-contradictory, or violates a closed-form SFC
 * identity. It does NOT recompute via the orchestrator (that is what produced
 * the corpus); it checks the corpus against ground-truth invariants that hold
 * for ANY correct speed/feed result.
 *
 * Reader note: feature-gen's readChunks() deliberately DROPS err/null rows
 * (they are useless for the GNN). The auditor needs exactly those rows, so it
 * ships its own all-rows streaming reader. This divergence is intentional, not
 * a DRY violation.
 *
 * Row schema (per sfc-variability-batch-run.mjs:205-230):
 *   { fp, idx, in:{ td, fl, m, mat, op, cut, ... }, err:string|null,
 *     out:{ vc, rpm, fz, vf, ap, ae, mrr, pkw, trq, fN, life, Ra, defl(um),
 *           conf, sz, pch, lim:["param:severity"], safe, eng } | null }
 * NOTE: round() in the batch writer returns null for any non-finite engine
 * value -- so a NaN/Infinity calc surfaces here as a `null` field with err==null
 * (the canonical "silent bad calc" this auditor exists to catch).
 *
 * Pure (no I/O) except streamAllRows(); everything else is unit-testable with
 * literal reference rows.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const SEVERITY = Object.freeze({ CRITICAL: "critical", WARN: "warn", INFO: "info" });

// Physical fields that, when the engine did NOT error, MUST be a finite number.
// The writer routes every one of these through round(), which emits null on a
// non-finite (NaN/Infinity) engine value -- so a null here with err==null is the
// canonical "silent bad calc" this auditor exists to catch. (rpm and vf are
// excluded -- the writer coerces them with `?? 0`, so a missing value becomes 0,
// caught by the zero/negative checks instead of null. pch is excluded because a
// stability metric can be legitimately absent for some operations.)
const REQUIRED_FINITE = ["vc", "fz", "ap", "ae", "mrr", "pkw", "trq", "fN", "life", "Ra", "defl", "conf"];
// Fields that are physically non-negative (a negative is impossible, not merely
// suspicious). ap/ae/defl/trq included; conf handled separately (range check).
const NONNEG_FIELDS = ["vc", "rpm", "fz", "vf", "ap", "ae", "mrr", "pkw", "trq", "fN", "life", "Ra", "defl"];

// tool_life_min saturation cap emitted by the writer (a sentinel, not a defect).
const LIFE_SENTINEL_MIN = 9999;
// Feed-identity tolerance terms (absorb the writer's rounding: fz->4dp, vf/rpm->0dp).
const FEED_TOL_BASE_MMMIN = 1.0;          // flat floor for integer rounding of vf
const FEED_TOL_ROUNDING_PER_RPMFL = 5e-5; // fz half-ULP at 4dp, scaled by rpm*flutes
const FEED_TOL_REL = 0.06;                // 6% relative -- a real formula bug exceeds this by far
// vc=pi*D*n/1000 tolerance terms (mill only; lathe diameter basis is the workpiece).
const VC_TOL_BASE_MPM = 2.0;
const VC_TOL_REL = 0.05;
// Floor (mm/min) below which the feed RELATIVE error is not a meaningful margin:
// at a few mm/min, sub-1mm rounding / feed-clamp effects dominate the ratio and
// inflate it. The feed_inconsistent CHECK still catches real deviations there via
// its absolute base floor; this only keeps the reported MARGIN statistic honest.
const FEED_REL_MIN_MMMIN = 15;
// Cap on samples retained per check + on error-class detail length.
const DEFAULT_SAMPLE_LIMIT = 5;
const ERR_CLASS_MAXLEN = 120;

/** True when v is a finite number. */
function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

/** Does any limiting-factor string carry :critical severity? */
function hasCriticalLimit(lim) {
  return Array.isArray(lim) && lim.some((l) => typeof l === "string" && l.endsWith(":critical"));
}

/** Relative error magnitude |a-b| / max(|a|,|b|,1). 0 when both ~0. */
function relErr(a, b) {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
}

/**
 * Feed identity: vf (mm/min) = rpm * fz * flutes. Returns
 * { expected, absErr, relErr, tol } or null when not computable (missing inputs).
 * The tolerance absorbs the writer's rounding: fz->4dp (half-ULP 5e-5, scaled by
 * rpm*fl), vf/rpm->0dp (the flat base floor), plus a relative band for anything
 * beyond a few percent (a real formula bug -- x25.4, x2, sign -- exceeds this).
 */
function feedIdentity(cell) {
  const out = cell.out;
  if (!out) return null;
  const fl = cell.in && isNum(cell.in.fl) ? cell.in.fl : null;
  if (fl == null || fl <= 0 || !isNum(out.rpm) || !isNum(out.fz) || !isNum(out.vf)) return null;
  const expected = out.rpm * out.fz * fl;
  const absErr = Math.abs(out.vf - expected);
  const tol = FEED_TOL_BASE_MMMIN + Math.abs(out.rpm * fl) * FEED_TOL_ROUNDING_PER_RPMFL + FEED_TOL_REL * Math.max(Math.abs(out.vf), Math.abs(expected));
  return { expected, absErr, relErr: relErr(out.vf, expected), tol };
}

/**
 * vc identity (mill only): vc (m/min) = pi * D * rpm / 1000, D = cutter diameter
 * (in.td). Lathe vc is workpiece-diameter-based, so the caller must gate by domain.
 * Returns { expected, absErr, relErr, tol } or null when not computable.
 */
function vcIdentityMill(cell) {
  const out = cell.out;
  if (!out) return null;
  const td = cell.in && isNum(cell.in.td) ? cell.in.td : null;
  if (td == null || td <= 0 || !isNum(out.rpm) || out.rpm <= 0 || !isNum(out.vc)) return null;
  const expected = (Math.PI * td * out.rpm) / 1000;
  const absErr = Math.abs(out.vc - expected);
  const tol = VC_TOL_BASE_MPM + VC_TOL_REL * Math.max(Math.abs(out.vc), Math.abs(expected));
  return { expected, absErr, relErr: relErr(out.vc, expected), tol };
}

/**
 * Audit a single corpus row. Pure. Returns an array of violation objects:
 *   { check, severity, detail }
 * `opts.domain` ("mill"|"lathe") tunes domain-specific checks (vc=pi*D*n only
 * applies cleanly to mill, where `td` is unambiguously the cutter diameter).
 */
export function auditRow(cell, opts = {}) {
  const violations = [];
  if (!cell || typeof cell !== "object") {
    return [{ check: "malformed_row", severity: SEVERITY.CRITICAL, detail: "row is not an object" }];
  }
  const domain = opts.domain ?? null;
  const err = cell.err ?? null;
  const out = cell.out;

  // 1. Hard error rows -- the engine threw. Tracked (INFO) by class; the writer
  //    already recorded out:null so no numeric checks apply.
  if (err != null) {
    violations.push({ check: "err", severity: SEVERITY.INFO, detail: normalizeErr(err) });
    return violations;
  }

  // err==null but no output object -> the writer's invariant is broken.
  if (!out || typeof out !== "object") {
    violations.push({ check: "missing_out", severity: SEVERITY.CRITICAL, detail: "err==null but out is absent" });
    return violations;
  }

  // 2. NULL_NUMERIC -- err==null but a required field is null/undefined. round()
  //    nulls only non-finite engine values, so this is a silent NaN/Infinity calc
  //    that did not surface as an error. CRITICAL.
  for (const k of REQUIRED_FINITE) {
    const v = out[k];
    if (v === null || v === undefined) {
      violations.push({ check: "null_numeric", severity: SEVERITY.CRITICAL, detail: `${k} is ${v === null ? "null" : "undefined"} (non-finite calc)` });
    }
  }

  // 3. NEG_PHYSICAL -- a physically non-negative quantity came back negative.
  for (const k of NONNEG_FIELDS) {
    const v = out[k];
    if (isNum(v) && v < 0) {
      violations.push({ check: "neg_physical", severity: SEVERITY.CRITICAL, detail: `${k}=${v} < 0` });
    }
  }

  // 4. ZERO_SPEED -- a usable result with no spindle motion is wrong output;
  //    split by safety so a deliberate "cannot machine" (safe===false) is only
  //    advisory, while a PUBLISHED safe result with rpm/vc 0 is critical.
  const rpm = out.rpm;
  const vc = out.vc;
  const zeroSpeed = (isNum(rpm) && rpm <= 0) || (isNum(vc) && vc <= 0);
  if (zeroSpeed) {
    if (out.safe === true) {
      violations.push({ check: "zero_speed_safe", severity: SEVERITY.CRITICAL, detail: `rpm=${rpm}, vc=${vc} but safe=true` });
    } else {
      violations.push({ check: "zero_speed_unsafe", severity: SEVERITY.WARN, detail: `rpm=${rpm}, vc=${vc} (flagged unsafe)` });
    }
  }

  // 5. FEED_CONSISTENCY -- the most fundamental SFC identity:
  //    vf (mm/min) = rpm * fz * flutes. A violation means the feed-rate
  //    calculation itself is wrong (unit error, dropped flute count, sign).
  const feed = feedIdentity(cell);
  if (feed && feed.absErr > feed.tol) {
    violations.push({
      check: "feed_inconsistent",
      severity: SEVERITY.CRITICAL,
      detail: `vf=${out.vf} but rpm*fz*fl=${round2(feed.expected)} (rpm=${rpm}, fz=${out.fz}, fl=${cell.in.fl}, tol=${round2(feed.tol)})`,
    });
  }

  // 6. VC_RPM_CONSISTENCY (mill only) -- vc = pi * D * rpm / 1000, D=cutter dia.
  //    Lathe diameter basis is the workpiece (not the tool), so this closed form
  //    does not apply cleanly there; restrict to mill to avoid false findings.
  const vcm = domain === "mill" ? vcIdentityMill(cell) : null;
  if (vcm && vcm.absErr > vcm.tol) {
    violations.push({
      check: "vc_rpm_inconsistent_mill",
      severity: SEVERITY.WARN,
      detail: `vc=${vc} but pi*D*rpm/1000=${round2(vcm.expected)} (D=${cell.in.td}, rpm=${rpm}, tol=${round2(vcm.tol)})`,
    });
  }

  // 7. SAFETY-CONSISTENCY -- the engine's own safe flag must agree with its
  //    limiting factors. safe=true while a :critical limit is present is a
  //    self-contradiction (would publish an unsafe speed as safe). CRITICAL.
  if (out.safe === true && hasCriticalLimit(out.lim)) {
    violations.push({ check: "safe_with_critical_limit", severity: SEVERITY.CRITICAL, detail: `safe=true but lim has critical: ${JSON.stringify(out.lim)}` });
  }
  // Unsafe with no stated limiting factor -> opacity (WARN, not wrong).
  if (out.safe === false && Array.isArray(out.lim) && out.lim.length === 0) {
    violations.push({ check: "unsafe_no_limit", severity: SEVERITY.WARN, detail: "safe=false but lim is empty" });
  }

  // 8. CONFIDENCE / CHATTER RANGE -- probabilities must lie in [0,1].
  if (isNum(out.conf) && (out.conf < 0 || out.conf > 1)) {
    violations.push({ check: "conf_range", severity: SEVERITY.WARN, detail: `conf=${out.conf} outside [0,1]` });
  }
  if (isNum(out.pch) && (out.pch < 0 || out.pch > 1)) {
    violations.push({ check: "pchatter_range", severity: SEVERITY.WARN, detail: `pch=${out.pch} outside [0,1]` });
  }

  // 9. LIFE_SENTINEL -- quantify saturation-capped tool life (expected, INFO).
  if (out.life === LIFE_SENTINEL_MIN) {
    violations.push({ check: "life_sentinel", severity: SEVERITY.INFO, detail: `life=${LIFE_SENTINEL_MIN} (saturation cap)` });
  }

  return violations;
}

/**
 * Measure how far a row's feed/vc deviate from the closed-form identities, as a
 * relative error magnitude. Used to surface the ACCURACY MARGIN across the whole
 * corpus (e.g. "max feed deviation 0.5%") -- a stronger, more honest accuracy
 * claim than a pass/fail threshold alone. Returns { feedRelErr|null, vcRelErr|null }
 * (null when not computable for that identity, e.g. lathe vc).
 */
export function measureRow(cell, opts = {}) {
  if (!cell || typeof cell !== "object" || cell.err != null) return { feedRelErr: null, vcRelErr: null };
  const feed = feedIdentity(cell);
  const vcm = (opts.domain ?? null) === "mill" ? vcIdentityMill(cell) : null;
  // Only report the feed margin where the feed magnitude makes the ratio meaningful.
  const feedMeaningful = feed && Math.max(Math.abs(cell.out.vf), Math.abs(feed.expected)) >= FEED_REL_MIN_MMMIN;
  return { feedRelErr: feedMeaningful ? feed.relErr : null, vcRelErr: vcm ? vcm.relErr : null };
}

/** Normalize an error message to a coarse class for aggregation. */
function normalizeErr(err) {
  const s = String(err);
  // Collapse digits/paths/quoted values so similar errors group to one class.
  return s
    .replace(/[0-9]+(\.[0-9]+)?/g, "N")
    .replace(/['"][^'"]*['"]/g, "'X'")
    .slice(0, ERR_CLASS_MAXLEN);
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

/** A compact, bounded slice of a row for inclusion as a report sample. */
export function sampleOf(cell, domain, violation) {
  const i = cell.in ?? {};
  const o = cell.out ?? {};
  return {
    domain,
    idx: cell.idx,
    fp: cell.fp,
    check: violation.check,
    severity: violation.severity,
    detail: violation.detail,
    in: { m: i.m, mat: i.mat, iso: i.iso, op: i.op, cut: i.cut, td: i.td, fl: i.fl, tmat: i.tmat },
    out: cell.out
      ? { vc: o.vc, rpm: o.rpm, fz: o.fz, vf: o.vf, mrr: o.mrr, pkw: o.pkw, fN: o.fN, life: o.life, defl: o.defl, conf: o.conf, safe: o.safe, lim: o.lim }
      : null,
  };
}

/** Create a fresh mutable aggregation report. */
export function createReport({ sampleLimit = DEFAULT_SAMPLE_LIMIT } = {}) {
  return {
    schemaVersion: "1.0.0",
    generatedAt: null, // stamped by the CLI (Date is unavailable in workflows; CLI owns wall-clock)
    sampleLimit,
    totals: { rows: 0, errRows: 0, critical: 0, warn: 0, info: 0 },
    byDomain: {}, // domain -> { rows, critical, warn, info }
    byCheck: {}, // check -> { severity, count, samples: [] }
    // Accuracy margin: largest observed deviation from the closed-form identities
    // (the worst case across the whole corpus, with the offending config).
    stats: {
      maxFeedRelErr: { value: 0, sample: null },
      maxVcRelErr: { value: 0, sample: null },
    },
  };
}

/** Fold one corpus row into the report. Pure given (report, cell). */
export function recordRow(report, domain, cell) {
  report.totals.rows++;
  const dom = (report.byDomain[domain] ??= { rows: 0, critical: 0, warn: 0, info: 0 });
  dom.rows++;

  // Track the accuracy margin (worst feed/vc deviation seen) when present.
  const m = measureRow(cell, { domain });
  if (m.feedRelErr != null && m.feedRelErr > report.stats.maxFeedRelErr.value) {
    report.stats.maxFeedRelErr = { value: m.feedRelErr, sample: { domain, idx: cell.idx, in: cell.in, vf: cell.out?.vf } };
  }
  if (m.vcRelErr != null && m.vcRelErr > report.stats.maxVcRelErr.value) {
    report.stats.maxVcRelErr = { value: m.vcRelErr, sample: { domain, idx: cell.idx, td: cell.in?.td, rpm: cell.out?.rpm, vc: cell.out?.vc } };
  }

  const violations = auditRow(cell, { domain });
  for (const v of violations) {
    const bucket = (report.byCheck[v.check] ??= { severity: v.severity, count: 0, samples: [] });
    bucket.count++;
    if (v.severity === SEVERITY.CRITICAL) { report.totals.critical++; dom.critical++; }
    else if (v.severity === SEVERITY.WARN) { report.totals.warn++; dom.warn++; }
    else { report.totals.info++; dom.info++; }
    if (v.check === "err") report.totals.errRows++;
    if (bucket.samples.length < report.sampleLimit) {
      bucket.samples.push(sampleOf(cell, domain, v));
    }
  }
  return violations;
}

/** Finalize: sort checks by severity then count; compute headline grade. */
export function finalizeReport(report) {
  const order = { critical: 0, warn: 1, info: 2 };
  report.checksSorted = Object.entries(report.byCheck)
    .map(([check, b]) => ({ check, severity: b.severity, count: b.count, sampleCount: b.samples.length }))
    .sort((a, b) => (order[a.severity] - order[b.severity]) || (b.count - a.count));
  const criticalChecks = report.checksSorted.filter((c) => c.severity === SEVERITY.CRITICAL && c.count > 0);
  report.grade = criticalChecks.length === 0 ? "PASS" : "FAIL";
  report.criticalCheckCount = criticalChecks.length;
  return report;
}

/**
 * Stream EVERY row (including err/null) from a list of {dir, domain} sources.
 * Sequential file reads (corpus is multi-GB; parallel would OOM). Torn/partial
 * JSON lines are skipped (counted via the `onParseError` callback if provided).
 * `maxRows` caps the total yielded (for fast validation runs); 0/undefined = all.
 */
export async function* streamAllRows(sources, { maxRows = 0, onParseError = null } = {}) {
  let yielded = 0;
  for (const { dir, domain } of sources) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      continue; // missing domain dir is not fatal -- caller surfaces empty coverage
    }
    const chunkFiles = entries.filter((f) => f.startsWith("chunk-") && f.endsWith(".jsonl")).sort();
    for (const fname of chunkFiles) {
      let buf;
      try {
        buf = await readFile(join(dir, fname), "utf8");
      } catch {
        continue;
      }
      for (const line of buf.split("\n")) {
        if (!line.trim()) continue;
        let cell;
        try {
          cell = JSON.parse(line);
        } catch (e) {
          if (onParseError) onParseError(fname, e);
          continue;
        }
        yield { cell, domain, file: fname };
        if (maxRows && ++yielded >= maxRows) return;
      }
    }
  }
}

/** Render the report as an operator-readable markdown brief. */
export function renderMarkdown(report) {
  const t = report.totals;
  const lines = [];
  lines.push(`# SFC Accuracy Audit -- ${report.grade}`);
  lines.push("");
  lines.push(`> Generated: ${report.generatedAt ?? "(unstamped)"} - schema ${report.schemaVersion}`);
  lines.push(`> Streams the SFC-ACCURACY-MS1 variability corpus and checks every computed`);
  lines.push(`> row against closed-form SFC identities + physical-validity invariants.`);
  lines.push("");
  lines.push(`## Headline`);
  lines.push(`- **Grade: ${report.grade}** (${report.criticalCheckCount} critical check(s) tripped)`);
  lines.push(`- Rows audited: **${t.rows.toLocaleString()}**  (err rows: ${t.errRows.toLocaleString()})`);
  lines.push(`- Violations: **${t.critical.toLocaleString()} critical** - ${t.warn.toLocaleString()} warn - ${t.info.toLocaleString()} info`);
  lines.push("");
  if (report.stats) {
    const f = report.stats.maxFeedRelErr;
    const v = report.stats.maxVcRelErr;
    lines.push(`## Accuracy margin (worst-case deviation from closed-form identity)`);
    lines.push(`- Max feed-rate deviation (vf vs rpm*fz*flutes): **${(f.value * 100).toFixed(3)}%**${f.sample ? ` @ ${f.sample.domain} #${f.sample.idx}` : ""}`);
    lines.push(`- Max vc deviation, mill (vc vs pi*D*rpm/1000): **${(v.value * 100).toFixed(3)}%**${v.sample ? ` @ ${v.sample.domain} #${v.sample.idx}` : ""}`);
    lines.push("");
  }
  lines.push(`## By domain`);
  lines.push(`| domain | rows | critical | warn | info |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  for (const [d, s] of Object.entries(report.byDomain)) {
    lines.push(`| ${d} | ${s.rows.toLocaleString()} | ${s.critical.toLocaleString()} | ${s.warn.toLocaleString()} | ${s.info.toLocaleString()} |`);
  }
  lines.push("");
  lines.push(`## Checks (severity-ranked)`);
  lines.push(`| check | severity | count |`);
  lines.push(`|---|---|---:|`);
  for (const c of report.checksSorted ?? []) {
    lines.push(`| ${c.check} | ${c.severity} | ${c.count.toLocaleString()} |`);
  }
  lines.push("");
  lines.push(`## Sample violations`);
  // Iterate severity-ranked (critical first) so a low-volume critical is never
  // buried below high-volume warnings in the operator brief.
  for (const c of report.checksSorted ?? []) {
    const b = report.byCheck[c.check];
    if (!b || b.severity === SEVERITY.INFO) continue; // info (err/life sentinel) is volume, not a defect
    lines.push(`### ${c.check} (${b.severity}, ${b.count.toLocaleString()})`);
    for (const s of b.samples) {
      lines.push(`- [${s.domain} #${s.idx}] ${s.detail}`);
      lines.push(`  - in: ${JSON.stringify(s.in)}`);
      lines.push(`  - out: ${JSON.stringify(s.out)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
