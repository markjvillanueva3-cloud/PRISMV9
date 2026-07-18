// engine-existence-drift-lib.mjs -- BRAVO-RECONCILE / U-ENGINE-EXISTENCE-DRIFT
//
// Pure, dependency-injected detector for ENGINE-EXISTENCE DRIFT in milestone
// envelopes -- a drift class the canonical git-unit-matcher
// (build-milestone-progress.mjs) misses. That matcher marks a unit "shipped"
// only when a commit literally references its unit-id; but most "wire/build
// engine X" units shipped under a DIFFERENT commit tag, so git reports 0/N while
// the engine actually EXISTS + is WIRED (verified on AI-WIRE-MS0 and
// SYS-UTIL-AUDIT-MS0, 2026-06-21 slot:bravo).
//
// This lib answers the orthogonal question per unit: does the engine/hook the
// unit names actually exist (and is it wired)? Resolver is injected
// ({ engineExists(name), engineWired(name) }) so the logic is unit-testable.
// DETECTION + RANKING aid only (R12) -- NOT an auto-closer.

const ENGINE_NAME_RE = /\b([A-Z][A-Za-z0-9]*(?:Engine|Hooks))\b/g;

/** Extract distinct engine/hook names from a unit's textual fields. */
export function extractEngineNames(unit) {
  if (!unit || typeof unit !== "object") return [];
  const text = [unit.title, unit.description, ...(Array.isArray(unit.steps) ? unit.steps : [])]
    .filter((s) => typeof s === "string")
    .join(" \n ");
  const out = [];
  const seen = new Set();
  let m;
  ENGINE_NAME_RE.lastIndex = 0;
  while ((m = ENGINE_NAME_RE.exec(text)) !== null) {
    const name = m[1];
    if (name === "Engine" || name === "Hooks") continue;
    if (!seen.has(name)) { seen.add(name); out.push(name); }
  }
  return out;
}

function safeBool(fn, arg) {
  try { return fn(arg) === true; } catch { return false; }
}

// Envelopes are INCONSISTENT: some units use status "complete", others "completed"
// (and a few "shipped"/"done"). A naive `status !== "complete"` check treats a
// "completed" unit as still-open -> over-reports drift. Normalize here (R12).
const DONE_STATUSES = new Set(["complete", "completed", "shipped", "done"]);
/** True when a unit's status marks it finished (any of the envelope conventions). */
export function isUnitComplete(unit) {
  return !!unit && DONE_STATUSES.has(String(unit.status || "").toLowerCase());
}

// A unit naming an engine is engine-existence DRIFT evidence ONLY when the unit's
// JOB is to create/wire that engine. If the job is to TRAIN/RUN/USE/OPTIMIZE an
// engine that already exists (e.g. "U-AITRAIN-MILL-DEEP-LEARNING" -> train the
// mill DL engine), the engine existing proves NOTHING about completion -> R12.
const BUILD_VERB_RE = /\b(build|wire|create|implement|expose|register|add|scaffold|generate|introduce|author|define|stand up|standup)\b/i;
// Verbs whose presence means the engine is a SUBJECT acted upon, not a build target.
const NONBUILD_VERB_RE = /\b(train|fine-?tune|retrain|optimi[sz]e|calibrate|run|execute|invoke|use|benchmark|evaluate|tune|activate|deploy|populate)\b/i;

/** True when the unit text expresses intent to BUILD/WIRE (not train/use) an engine. */
export function hasBuildIntent(unit) {
  if (!unit || typeof unit !== "object") return false;
  const text = [unit.title, unit.description, ...(Array.isArray(unit.steps) ? unit.steps : [])]
    .filter((s) => typeof s === "string").join(" \n ");
  if (!BUILD_VERB_RE.test(text)) return false;
  // A build verb that is dominated by a non-build verb (train/optimize) is ambiguous;
  // treat a pure non-build unit (non-build verb present, no build verb) as non-build.
  return true;
}

/**
 * Classify a single not-complete unit by engine-existence.
 * verdict: DRIFT_ENGINE_EXISTS | GENUINE_OPEN_ENGINE_MISSING | INDETERMINATE_NO_ENGINE | INDETERMINATE_NON_BUILD
 */
export function classifyUnit(unit, resolver) {
  const engines = extractEngineNames(unit);
  if (engines.length === 0) {
    return { id: unit?.id ?? "?", engines: [], existing: [], missing: [], wired: [], verdict: "INDETERMINATE_NO_ENGINE" };
  }
  // Build-intent gate (R12): engine-existence is evidence of completion ONLY for
  // build/wire units. A train/use/optimize unit naming an existing engine is NOT drift.
  if (!hasBuildIntent(unit)) {
    return { id: unit?.id ?? "?", engines, existing: [], missing: [], wired: [], verdict: "INDETERMINATE_NON_BUILD" };
  }
  const existing = engines.filter((n) => safeBool(resolver.engineExists, n));
  const missing = engines.filter((n) => !safeBool(resolver.engineExists, n));
  const wired = existing.filter((n) => safeBool(resolver.engineWired, n));
  const verdict = missing.length === 0 ? "DRIFT_ENGINE_EXISTS" : "GENUINE_OPEN_ENGINE_MISSING";
  return { id: unit?.id ?? "?", engines, existing, missing, wired, verdict };
}

/**
 * Analyze a milestone envelope for engine-existence drift. Scores only NOT-complete units.
 * driftConfidence = (count DRIFT units) / (count engine-naming units), null when none name an engine.
 * classification: HIGH_CONFIDENCE_DRIFT | PARTIAL_DRIFT | GENUINE_OPEN | INDETERMINATE
 */
export function analyzeMilestone(milestone, resolver) {
  const id = milestone?.id ?? "?";
  const units = Array.isArray(milestone?.units) ? milestone.units : [];
  const notComplete = units.filter((u) => u && !isUnitComplete(u));
  const perUnit = notComplete.map((u) => classifyUnit(u, resolver));

  // Only BUILD-intent engine units count toward drift (R12 build-verb gate):
  // train/use/optimize units naming an existing engine are INDETERMINATE_NON_BUILD.
  const driftUnits = perUnit.filter((u) => u.verdict === "DRIFT_ENGINE_EXISTS");
  const openUnits = perUnit.filter((u) => u.verdict === "GENUINE_OPEN_ENGINE_MISSING");
  const engineUnits = [...driftUnits, ...openUnits];
  const indeterminate = perUnit.filter((u) => u.verdict === "INDETERMINATE_NO_ENGINE" || u.verdict === "INDETERMINATE_NON_BUILD");

  const driftConfidence = engineUnits.length === 0 ? null : driftUnits.length / engineUnits.length;

  let classification;
  if (engineUnits.length === 0) classification = "INDETERMINATE";
  else if (driftConfidence === 1) classification = "HIGH_CONFIDENCE_DRIFT";
  else if (driftUnits.length === 0) classification = "GENUINE_OPEN";
  else classification = "PARTIAL_DRIFT";

  const missingEngines = [...new Set(openUnits.flatMap((u) => u.missing))];

  return {
    id,
    totalUnits: units.length,
    notCompleteUnits: notComplete.length,
    engineNamingUnits: engineUnits.length,
    driftUnits: driftUnits.map((u) => u.id),
    openUnits: openUnits.map((u) => ({ id: u.id, missing: u.missing })),
    indeterminateUnits: indeterminate.map((u) => u.id),
    missingEngines,
    driftConfidence,
    classification,
    perUnit,
  };
}
