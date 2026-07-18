// augmentation-freshness.mjs -- classify the freshness of every system-viz
// augmentation file the MERGE actually folds into the live graph.
//
// WHY (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21):
// regen-viz re-merges system-graph.json and reports GREEN from whatever augmentation
// files exist on disk. Two silent-staleness paths leave a GREEN graph on rotting inputs:
//   (1) a FAST[] generator silently fails -> regen-viz logs `failed++` and CONTINUES
//       (regen-viz.mjs:223-228, no abort) -> its augmentation freezes while the merge
//       keeps folding the stale file.
//   (2) a generator is RETIRED but its `loadOptional("X.json")` in merge-augmentations
//       was never removed -> the orphan augmentation lingers (no producer) and its stale
//       nodes/annotations keep folding into the canonical graph every regen.
// Observed 2026-06-21: awareness / core-inventory / fs-inventory / file-coverage-v2
// augmentations were ~43 DAYS stale yet still loadOptional'd by merge-augmentations,
// invisible behind a GREEN health badge.
//
// This module surfaces "merged BUT stale" deterministically so an orphan is LOUD, not
// silent. Pure + dependency-light (node:fs/path only) + fully injectable (now + stat)
// so it is unit-testable without touching the real clock or filesystem.

import fs from "node:fs";
import path from "node:path";

const HR_MS = 3_600_000;

// HEAVY[] generators (regen-viz.mjs) run ONLY on `--full`, so their augmentations
// legitimately lag a fast-only regen cadence. A longer ceiling avoids false-flagging
// them. KEEP IN SYNC with regen-viz HEAVY[] (5 entries as of 2026-06-22); if HEAVY[]
// grows, add the new output here -- a HEAVY output NOT listed here false-alarms as a
// stale-orphan once it ages past staleHr (168h/7d) between --full runs.
export const SLOW_CADENCE = Object.freeze(
  new Set([
    "fs-deep-inventory-augmentation.json",
    "l11-leaves-augmentation.json",
    // + U-VIZ-AUG-STALE-REWIRE / U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (sierra 2026-06-22): 3 generators
    // moved into HEAVY[] (--full only). Their outputs lag the fast cadence by design -> slow-cadence.
    "h-drive-skipped-census.json",
    "awareness-augmentation.json",
    "business-value-map.json",
  ]),
);

// Augmentations whose producer is INTENTIONALLY out-of-band -- not a regen-time .mjs generator,
// so they legitimately age past staleHr without being a "producer gone/failed" orphan. Classifying
// them as stale-orphan cries wolf EVERY regen and masks REAL orphans in the alarm count. They are
// advisory-aging ("stale-manual"), never an alarm, and are exempt from the PRISM_MERGE_STALE_SKIP
// data-drop lever (dropping a hand-curated/external-audit catalog would lose real coverage).
// U-VIZ-FRESHNESS-INTENTIONAL-ALLOWLIST (sierra 2026-06-22). Add an entry only when the producer is
// genuinely manual/external (document WHICH producer in the comment) -- a missing .mjs generator is a
// real orphan, NOT an intentional one.
export const INTENTIONAL_NO_PRODUCER = Object.freeze(
  new Set([
    "engine-spotlight.json",          // hand-curated STATIC editorial catalog (merge-augmentations.mjs KEEP-AS-IS); no generator by design, updated by hand.
    "h-drive-exhaustive-audit.json",  // produced out-of-band by scripts/h-drive-exhaustive-audit.ps1 (a full H: drive scan, run manually) -- too heavy for a regen generator.
  ]),
);

export const FRESHNESS_DEFAULTS = Object.freeze({
  freshHr: 24, // a FAST augmentation refreshes every regen (hourly..daily)
  staleHr: 168, // 7d: a non-HEAVY merged augmentation older than this is an orphan alarm
  slowHr: 720, // 30d: even a HEAVY-cadence augmentation older than this alarms
});

/**
 * Read the freshness thresholds from env (PRISM_AUG_{FRESH,STALE,SLOW}_HR), each falling back to
 * FRESHNESS_DEFAULTS when unset / non-finite / non-positive. SINGLE SOURCE so the CLI audit
 * (audit-augmentation-freshness.mjs) and the regen-viz post-merge freshness postflight classify
 * with IDENTICAL thresholds -- otherwise an operator who tunes a knob gets two divergent stale counts.
 * @param {Record<string,string|undefined>} [env]
 * @returns {{freshHr:number, staleHr:number, slowHr:number}}
 */
export function freshnessThresholdsFromEnv(env = process.env) {
  const hr = (name, dflt) => {
    const v = Number(env?.[name]);
    return Number.isFinite(v) && v > 0 ? v : dflt;
  };
  return {
    freshHr: hr("PRISM_AUG_FRESH_HR", FRESHNESS_DEFAULTS.freshHr),
    staleHr: hr("PRISM_AUG_STALE_HR", FRESHNESS_DEFAULTS.staleHr),
    slowHr: hr("PRISM_AUG_SLOW_HR", FRESHNESS_DEFAULTS.slowHr),
  };
}

/**
 * Build the canonical freshness report object (the .augmentation-freshness.json sidecar shape that
 * sierra-graph-health-inject.mjs reads). SINGLE SOURCE so the audit CLI and the regen-viz postflight
 * write a byte-identical sidecar -- whichever runs last keeps the awareness surface current.
 * @param {Array<{name:string,class:string,ageHr?:number}>} rows  classifyAugmentationFreshness output
 * @param {{now?:number, vizDirRel?:string, thresholds?:{freshHr:number,staleHr:number,slowHr:number}}} [opts]
 * @returns {{at:string, vizDir:string, thresholds:object, summary:object, rows:Array}}
 */
export function buildFreshnessReport(rows, { now = Date.now(), vizDirRel = "state/shared/system-viz", thresholds } = {}) {
  return {
    at: new Date(now).toISOString(),
    vizDir: vizDirRel,
    thresholds: thresholds || freshnessThresholdsFromEnv(),
    summary: summarizeFreshness(rows),
    rows: [...(Array.isArray(rows) ? rows : [])].sort((a, b) => (b.ageHr ?? -Infinity) - (a.ageHr ?? -Infinity)),
  };
}

// Default age (hours) past which the MERGE may SKIP folding an augmentation when the
// operator opts in via PRISM_MERGE_STALE_SKIP=1. 30d > the HEAVY (--full) regen cadence,
// so legit HEAVY augmentations (refreshed only on --full) still fold; only a true orphan
// (dead/retired producer, days-stale) is dropped.
//
// DELIBERATE GAP vs the freshness GUARD: the guard ALARMS a non-HEAVY orphan at staleHr
// (168h/7d -- advisory + reversible), but this lever DROPS data only at 720h/30d
// (consequential + harder to undo). Alarm early, drop late: a file in the 7-30d window is
// "flagged but not yet skipped" by design -- raise the signal, give the producer time to
// come back, drop only a truly dead orphan. Tune per-deploy with PRISM_MERGE_STALE_SKIP_HR.
export const MERGE_STALE_SKIP_DEFAULT_HR = 720;

/**
 * Parse the authoritative set of augmentation files the MERGE folds, straight from
 * merge-augmentations.mjs `loadOptional("X.json")` / `loadJson("X.json")` calls -- the
 * merge code IS the contract for "what lands in the live graph". Returns unique
 * filenames in source order.
 *
 * @param {string} mergeSource full text of merge-augmentations.mjs
 * @returns {string[]}
 */
export function parseMergedAugmentations(mergeSource) {
  if (typeof mergeSource !== "string" || mergeSource.length === 0) return [];
  const out = new Set();
  const re = /load(?:Optional|Json)\(\s*["']([^"']+\.json)["']/g;
  for (const m of mergeSource.matchAll(re)) out.add(m[1]);
  return [...out];
}

/**
 * Classify each merged augmentation by file-mtime age. Pure: caller injects `now` (ms)
 * and an optional `statImpl` so the result is deterministic and testable.
 *
 * class:
 *   "fresh"          age < freshHr
 *   "stale-warn"     freshHr <= age < staleHr   (non-slow; advisory)
 *   "stale-expected" slow-cadence + age < slowHr (HEAVY; expected lag, advisory)
 *   "stale-orphan"   (non-slow age >= staleHr) OR (slow age >= slowHr)  -> ALARM
 *   "absent"         loadOptional'd but file missing (benign -- loadOptional returns null)
 *   "future"         mtime in the future (clock skew / bad write) -> adversarial, advisory
 *
 * @param {string[]} files
 * @param {{dir?:string, now?:number, freshHr?:number, staleHr?:number, slowHr?:number,
 *          slowCadence?:Set<string>, statImpl?:(p:string)=>({mtimeMs:number}|null)}} [opts]
 */
export function classifyAugmentationFreshness(files, opts = {}) {
  const {
    dir,
    now = Date.now(),
    freshHr = FRESHNESS_DEFAULTS.freshHr,
    staleHr = FRESHNESS_DEFAULTS.staleHr,
    slowHr = FRESHNESS_DEFAULTS.slowHr,
    slowCadence = SLOW_CADENCE,
    intentional: intentionalSet = INTENTIONAL_NO_PRODUCER,
    statImpl,
  } = opts;
  const stat =
    statImpl ??
    ((p) => {
      try {
        return fs.statSync(p);
      } catch {
        return null;
      }
    });
  const rows = [];
  for (const name of Array.isArray(files) ? files : []) {
    if (typeof name !== "string" || !name) continue;
    const full = dir ? path.join(dir, name) : name;
    const slow = slowCadence.has(name);
    const intentional = intentionalSet.has(name);
    const st = stat(full);
    if (!st || typeof st.mtimeMs !== "number" || Number.isNaN(st.mtimeMs)) {
      rows.push({ name, exists: false, ageHr: null, slow, intentional, class: "absent" });
      continue;
    }
    const ageHr = (now - st.mtimeMs) / HR_MS;
    let cls;
    if (ageHr < 0) cls = "future";
    else if (ageHr < freshHr) cls = "fresh";
    // Intentionally out-of-band producer (hand-curated / external audit): aging is advisory,
    // NOT a "producer gone" orphan -- never escalate to the alarm class. Checked before slow/stale
    // so an intentional file can never be counted as stale-orphan.
    else if (intentional) cls = "stale-manual";
    else if (slow) cls = ageHr >= slowHr ? "stale-orphan" : "stale-expected";
    else cls = ageHr >= staleHr ? "stale-orphan" : "stale-warn";
    rows.push({ name, exists: true, ageHr: +ageHr.toFixed(1), slow, intentional, class: cls });
  }
  return rows;
}

/**
 * Roll up the per-file rows into a compact summary. `alarm` is true IFF >=1 stale-orphan
 * (the actionable signal: a merged augmentation whose producer is gone/failed and whose
 * stale data keeps folding into the live graph).
 */
export function summarizeFreshness(rows) {
  const r = Array.isArray(rows) ? rows : [];
  const byClass = (c) => r.filter((x) => x.class === c);
  const orphans = byClass("stale-orphan");
  return {
    total: r.length,
    fresh: byClass("fresh").length,
    staleWarn: byClass("stale-warn").length,
    staleExpected: byClass("stale-expected").length,
    staleManual: byClass("stale-manual").length,
    staleOrphan: orphans.length,
    absent: byClass("absent").length,
    future: byClass("future").length,
    orphanList: orphans.map((x) => `${x.name} (${x.ageHr}h)`).sort(),
    alarm: orphans.length > 0,
  };
}

/**
 * Decide whether the MERGE should SKIP folding a stale augmentation rather than fold
 * days-old data into the canonical graph. Pure. DEFAULT-DISABLED: the caller passes
 * enabled=false unless an operator sets PRISM_MERGE_STALE_SKIP=1 -- a data-dropping merge
 * policy must never flip on by surprise (the freshness audit/guard is the SIGNAL; this is
 * the opt-in LEVER). Fail-safe: an unknown / negative / non-finite age never skips (fold
 * rather than wrongly drop); a non-positive threshold falls back to the 30d default.
 * @param {number} ageMs  now - file.mtimeMs
 * @param {{enabled?:boolean, thresholdHr?:number}} [opts]
 * @returns {boolean}
 */
export function shouldSkipStaleMerge(ageMs, opts = {}) {
  const { enabled = false, thresholdHr = MERGE_STALE_SKIP_DEFAULT_HR } = opts;
  if (!enabled) return false;
  if (typeof ageMs !== "number" || !Number.isFinite(ageMs) || ageMs < 0) return false;
  const hr = Number.isFinite(thresholdHr) && thresholdHr > 0 ? thresholdHr : MERGE_STALE_SKIP_DEFAULT_HR;
  return ageMs >= hr * 3_600_000;
}
