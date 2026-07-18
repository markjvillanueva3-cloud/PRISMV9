/**
 * rgs-calibration-adapter.mjs — CAMConfidenceCalibrationEngine-backed
 * confidence calibration for the rgs-tool-planner.
 *
 * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
 *   The planner emits a `ToolPlan.confidence` per roadmap unit — the
 *   deterministic path is a mean-of-pipeline-confidences capped at 0.6, the
 *   Ollama path is the model's self-reported number. Neither is empirically
 *   calibrated: a plan reporting 0.55 has no guarantee it is right ~55% of
 *   the time. The MS1 punch-list's spec'd fix is to feed the accumulated RGS
 *   feedback-loop outcomes (shipped / blocked / reverted) through
 *   `CAMConfidenceCalibrationEngine`, which fits a raw->calibrated mapping
 *   (histogram / Platt / isotonic, auto-selected by data volume) so the
 *   confidence the sidecar stores is a true probability of correctness.
 *
 * What it does:
 *   `makeCalibrationFn()` is an async factory that (1) reads the RGS outcome
 *   ledger (`roadmap-tool-plan-outcomes.jsonl`), (2) joins each outcome
 *   against the plans sidecar (`roadmap-tool-plans.json`) to recover the
 *   predicted confidence that outcome was generated under, (3) feeds the
 *   resulting (predictedConfidence, wasCorrect) pairs into the compiled
 *   `CAMConfidenceCalibrationEngine`, and (4) returns a *synchronous* closure
 *   `(rawConfidence:number) => number` the planner applies to every plan's
 *   confidence (rgs-tool-planner.mjs `runPlanner`).
 *
 * The >=50 gate (punch-list: "compose ... once >=50 outcomes accumulate
 * (degenerate before)"):
 *   A unit contributes a calibration sample only once it has a terminal
 *   outcome AND a joinable predicted confidence. Below 50 such samples the
 *   factory returns the IDENTITY function — the planner's confidence is
 *   passed through unchanged. 50 is also the engine's MIN_ISOTONIC_OUTCOMES
 *   threshold, so at the gate the engine has exactly enough data for its
 *   asymptotically-optimal (isotonic / pool-adjacent-violators) method.
 *
 *   The outcome ledger does not exist until the feedback loop has run for
 *   real, so on a fresh checkout this adapter is a no-op by construction —
 *   that is the punch-list's "degenerate before" state, not a bug.
 *
 * Graceful degradation (R12 — never crash or distort the planner):
 *   ANY failure — compiled engine absent, import error, ledger/sidecar
 *   unreadable or malformed, `recordOutcome` / `calibrate` throw, a
 *   non-finite calibration result — falls back to identity pass-through.
 *   With the engine entirely unavailable every plan's confidence is
 *   unchanged, so the planner behaves exactly as before this unit.
 *
 * Confidence-join (R12): calibration must be fit on RAW model outputs and
 *   applied to RAW model outputs. A calibrated planner run rewrites each
 *   plan's `confidence` to a calibrated value, so the join instead recovers
 *   the plan's `rawConfidence` — the pre-calibration number the planner
 *   stamps whenever calibration is active. This keeps the fit/apply domains
 *   identical run-over-run (no calibrate-on-calibrated drift). A sidecar
 *   written before A7 / with calibration off has no `rawConfidence` — there
 *   `confidence` IS the raw value, so the join falls back to it.
 *   Residual minor caveat: the recovered value is the *current* plan's raw
 *   confidence, not the plan as it stood at pick time — a unit re-planned
 *   between pick and outcome contributes a slightly stale raw confidence.
 *   Re-planning is sourceHash-gated (content-change only) so this is rare;
 *   fully removing it would mean storing confidence in the outcome ledger (a
 *   change to `rgs-plan-outcome.mjs` + the Stop hook), out of A7's scope.
 *
 * Process-singleton note: `CAMConfidenceCalibrationEngine` keeps its outcome
 *   buffer in process-global static state. The factory calls `clearOutcomes()`
 *   before feeding so a prior factory call cannot bleed outcomes into this
 *   calibration. The rgs-tool-planner CLI is a standalone process that uses
 *   no other consumer of this engine, so the clear is safe there.
 *
 * Return contract: `makeCalibrationFn` resolves to a fully synchronous
 *   `(rawConfidence:number) => number`. The planner calls it per-unit
 *   synchronously, so the factory awaits the one-time engine import + file
 *   reads and returns a sync closure. The closure NEVER throws.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Default location of the compiled CAMConfidenceCalibrationEngine, relative
 * to this file (`scripts/lib/` -> repo root -> `mcp-server/dist/...`). */
const DEFAULT_ENGINE_URL = new URL(
  "../../mcp-server/dist/engines/CAMConfidenceCalibrationEngine.js",
  import.meta.url,
);

/** RGS outcome ledger — JSONL appended by the rgs-outcome-record-stop hook. */
export const DEFAULT_LEDGER_PATH = fileURLToPath(
  new URL("../../state/shared/roadmap-tool-plan-outcomes.jsonl", import.meta.url),
);

/** RGS plans sidecar — JSON written by rgs-tool-planner; supplies the
 * predicted `confidence` joined against each outcome's `unitKey`. */
export const DEFAULT_SIDECAR_PATH = fileURLToPath(
  new URL("../../state/shared/roadmap-tool-plans.json", import.meta.url),
);

/**
 * Minimum joined (predictedConfidence, wasCorrect) samples before the adapter
 * calibrates. Below this it is identity pass-through. 50 mirrors the engine's
 * private MIN_ISOTONIC_OUTCOMES — at the gate the engine has exactly enough
 * data for isotonic regression, its asymptotically-optimal method. (See
 * CAMConfidenceCalibrationEngine.ts: MIN_ISOTONIC_OUTCOMES = 50.)
 */
export const MIN_CALIBRATION_OUTCOMES = 50;

/** Outcome-partition label for every RGS calibration sample.
 * `CAMConfidenceCalibrationEngine` partitions outcomes in a `Map` keyed by the
 * raw `task` string at runtime — `recordOutcome` stores under `task`,
 * `calibrate`/`recommendMethod` read back under the SAME `task`. The compiled
 * engine performs NO `AGIDecisionTask` union-membership check (only a
 * non-empty-string check), so a distinct "rgs-tool-plan" label isolates RGS
 * outcomes in their own partition, never colliding with a CAM decision outcome
 * that might share the process. Verified end-to-end against the compiled
 * engine — see the real-data E2E test. */
export const CALIBRATION_TASK = "rgs-tool-plan";

/** Terminal outcome values recognised in the ledger. */
const VALID_OUTCOMES = new Set(["shipped", "blocked", "reverted"]);

/** Module-level memo for the lazy engine import — shared across factories so
 * the compiled engine is imported at most once per process. */
let _enginePromise;

/**
 * The pass-through closure used whenever calibration is unavailable or the
 * >=50 gate is not met. A single shared identity reference makes "is this
 * adapter calibrating?" testable via `fn === identityCalibration`.
 * @param {number} c
 * @returns {number}
 */
export function identityCalibration(c) {
  return c;
}

/**
 * Shape-check: a usable engine exposes the four static methods the adapter
 * drives. Anything missing one => unusable => identity pass-through.
 * @param {unknown} E
 * @returns {boolean}
 */
function isUsableEngine(E) {
  return (
    E != null &&
    typeof (/** @type {any} */ (E).calibrate) === "function" &&
    typeof (/** @type {any} */ (E).recordOutcome) === "function" &&
    typeof (/** @type {any} */ (E).clearOutcomes) === "function" &&
    typeof (/** @type {any} */ (E).recommendMethod) === "function"
  );
}

/** Single-shot import + shape-check. Never throws — returns null on failure. */
async function importEngine(enginePath) {
  try {
    const href = enginePath instanceof URL ? enginePath.href : String(enginePath);
    const mod = await import(href);
    const Engine =
      mod?.CAMConfidenceCalibrationEngine ??
      mod?.camConfidenceCalibrationEngine ??
      mod?.default ??
      null;
    return isUsableEngine(Engine) ? Engine : null;
  } catch {
    return null;
  }
}

/**
 * Lazily import the compiled CAMConfidenceCalibrationEngine. Resolves to the
 * engine class (with the static calibrate/recordOutcome/clearOutcomes/
 * recommendMethod) or `null` on any failure (dist not built, import-time
 * error, wrong shape). Memoized per process for the default path.
 *
 * @param {string|URL} enginePath  override for the compiled engine location
 * @returns {Promise<{calibrate:Function,recordOutcome:Function,clearOutcomes:Function,recommendMethod:Function}|null>}
 */
export async function loadCalibrationEngine(enginePath = DEFAULT_ENGINE_URL) {
  // A non-default path is test/override territory — never share the memo.
  if (enginePath !== DEFAULT_ENGINE_URL) {
    return importEngine(enginePath);
  }
  if (_enginePromise === undefined) {
    _enginePromise = importEngine(enginePath);
  }
  return _enginePromise;
}

/**
 * Read the RGS outcome ledger (JSONL). Each line is an OutcomeRecord — the
 * records are produced by `rgs-plan-outcome.mjs` (`extractOutcomes`) and
 * appended to the ledger file by the `rgs-outcome-record-stop` Stop hook; the
 * adapter needs only `unitKey` + `outcome`. Never throws — a missing file, an
 * unreadable file, or malformed lines all degrade to (or skip to) an empty /
 * partial result.
 *
 * @param {string} ledgerPath
 * @returns {{unitKey:string, outcome:string}[]}
 */
export function readOutcomeLedger(ledgerPath) {
  let raw;
  try {
    raw = readFileSync(ledgerPath, "utf-8");
  } catch {
    // Missing / unreadable ledger — the "degenerate before" state.
    return [];
  }
  const records = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    let rec;
    try {
      rec = JSON.parse(trimmed);
    } catch {
      continue; // skip a malformed line, keep the rest
    }
    if (
      rec != null &&
      typeof rec.unitKey === "string" &&
      rec.unitKey !== "" &&
      typeof rec.outcome === "string" &&
      VALID_OUTCOMES.has(rec.outcome)
    ) {
      records.push({ unitKey: rec.unitKey, outcome: rec.outcome });
    }
  }
  return records;
}

/**
 * Read the RGS plans sidecar and return its `plans` map (`unitKey -> ToolPlan`).
 * Never throws — a missing / unreadable / malformed sidecar yields `{}`.
 *
 * @param {string} sidecarPath
 * @returns {Record<string, {confidence?: number}>}
 */
export function readPlansSidecar(sidecarPath) {
  let raw;
  try {
    raw = readFileSync(sidecarPath, "utf-8");
  } catch {
    return {};
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return {};
  }
  if (doc != null && typeof doc === "object" && doc.plans != null && typeof doc.plans === "object") {
    return doc.plans;
  }
  return {};
}

/**
 * Join outcome records against the plans sidecar into calibration samples.
 *
 * One sample per distinct unit: a unit is `wasCorrect:true` iff ANY of its
 * ledger records is `outcome:"shipped"` ("blocked"/"reverted" => not correct).
 * The predicted confidence is taken from the plan's `rawConfidence` (the
 * pre-calibration model output) when present, else from `confidence` — see
 * the module header's confidence-join note. A unit is dropped when the
 * sidecar has no plan for it, or neither field is a finite number.
 *
 * @param {{unitKey:string, outcome:string}[]} outcomes
 * @param {Record<string,{confidence?:number, rawConfidence?:number}>} plans
 * @returns {{unitKey:string, predictedConfidence:number, wasCorrect:boolean}[]}
 */
export function joinConfidences(outcomes, plans) {
  const safeOutcomes = Array.isArray(outcomes) ? outcomes : [];
  const safePlans = plans != null && typeof plans === "object" ? plans : {};

  // Collapse multiple records for one unit: shipped (terminal success) wins.
  const correctByUnit = new Map();
  for (const o of safeOutcomes) {
    if (o == null || typeof o.unitKey !== "string" || o.unitKey === "") continue;
    const prior = correctByUnit.get(o.unitKey) ?? false;
    correctByUnit.set(o.unitKey, prior || o.outcome === "shipped");
  }

  const pairs = [];
  for (const [unitKey, wasCorrect] of correctByUnit) {
    // Object.hasOwn guard: a unitKey of "__proto__" / "constructor" must
    // resolve to "no plan", never to an inherited Object.prototype member.
    const plan = Object.hasOwn(safePlans, unitKey) ? safePlans[unitKey] : undefined;
    // Prefer `rawConfidence` — the pre-calibration model output. After a
    // calibrated planner run `confidence` holds a CALIBRATED value; fitting
    // the mapping on calibrated inputs but applying it to raw ones is a
    // domain mismatch. Fall back to `confidence` when `rawConfidence` is
    // absent (pre-A7 sidecar / calibration off — there `confidence` is raw).
    let conf = NaN;
    if (plan != null) {
      if (typeof plan.rawConfidence === "number") conf = plan.rawConfidence;
      else if (typeof plan.confidence === "number") conf = plan.confidence;
    }
    if (!Number.isFinite(conf)) continue;
    pairs.push({ unitKey, predictedConfidence: conf, wasCorrect });
  }
  return pairs;
}

/**
 * Build a synchronous confidence-calibration function backed by
 * CAMConfidenceCalibrationEngine. Awaits the one-time engine import + ledger /
 * sidecar reads, then returns a closure the planner calls per-unit
 * synchronously. Returns `identityCalibration` whenever calibration is
 * unavailable or the >=50 gate is not met.
 *
 * @param {{
 *   engine?: {calibrate:Function,recordOutcome:Function,clearOutcomes:Function,recommendMethod:Function}|null,
 *   ledgerPath?: string,
 *   sidecarPath?: string,
 *   enginePath?: string|URL,
 * }} [opts]
 *   - `engine`      — inject an engine (or null) directly; skips the import.
 *                     Used by hermetic unit tests.
 *   - `ledgerPath`  — override the outcome-ledger path.
 *   - `sidecarPath` — override the plans-sidecar path.
 *   - `enginePath`  — override the compiled-engine path.
 * @returns {Promise<(rawConfidence:number)=>number>}
 */
export async function makeCalibrationFn(opts = {}) {
  // `engine` may be injected (incl. an explicit `null` to force the
  // pass-through path); only import when the key is absent entirely.
  const engine = Object.prototype.hasOwnProperty.call(opts, "engine")
    ? opts.engine
    : await loadCalibrationEngine(opts.enginePath ?? DEFAULT_ENGINE_URL);

  if (!isUsableEngine(engine)) {
    return identityCalibration;
  }

  const ledgerPath = opts.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const sidecarPath = opts.sidecarPath ?? DEFAULT_SIDECAR_PATH;

  // Cheap pre-gate: the joined sample count can never exceed the raw ledger
  // record count, so if the ledger itself is below the threshold skip the
  // (multi-MB) sidecar read entirely.
  const ledger = readOutcomeLedger(ledgerPath);
  if (ledger.length < MIN_CALIBRATION_OUTCOMES) {
    return identityCalibration;
  }

  const plans = readPlansSidecar(sidecarPath);
  const pairs = joinConfidences(ledger, plans);
  if (pairs.length < MIN_CALIBRATION_OUTCOMES) {
    return identityCalibration;
  }

  // Feed the engine. clearOutcomes() first: the engine is a process-global
  // singleton — a prior factory call must not bleed outcomes into this run.
  try {
    engine.clearOutcomes();
    for (const p of pairs) {
      engine.recordOutcome({
        decisionId: p.unitKey,
        task: CALIBRATION_TASK,
        predictedConfidence: p.predictedConfidence,
        wasCorrect: p.wasCorrect,
      });
    }
  } catch {
    // Feeding failed mid-way — the engine's outcome buffer is now partial.
    // Best-effort wipe so the process-global engine is not left holding a
    // partial buffer, then refuse to calibrate from it and pass through.
    try {
      engine.clearOutcomes();
    } catch {
      // clearOutcomes itself unavailable / throwing — nothing more to do.
    }
    return identityCalibration;
  }

  // Auto-select the calibration method by data volume. The >=50-pair gate is
  // already passed here, so on the near-impossible event recommendMethod
  // throws, isotonic — the engine's >=50 data-optimal method — is the faithful
  // fallback.
  let method;
  try {
    method = engine.recommendMethod(CALIBRATION_TASK);
  } catch {
    method = "isotonic";
  }

  /**
   * Synchronous per-plan calibration. NEVER throws: a non-numeric / non-finite
   * input, or any engine throw, returns the raw confidence unchanged.
   * @param {number} rawConfidence
   * @returns {number}
   */
  return function calibrateConfidence(rawConfidence) {
    if (typeof rawConfidence !== "number" || !Number.isFinite(rawConfidence)) {
      return rawConfidence;
    }
    try {
      const result = engine.calibrate(rawConfidence, { task: CALIBRATION_TASK, method });
      const cc = result == null ? undefined : result.calibratedConfidence;
      return typeof cc === "number" && Number.isFinite(cc) ? cc : rawConfidence;
    } catch {
      return rawConfidence;
    }
  };
}
