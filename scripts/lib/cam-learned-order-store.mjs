/**
 * cam-learned-order-store.mjs — persist + load the LEARNED lathe op-ordering as a versioned,
 * planner-consumable artifact, closing the self-improvement loop's PERSIST/LOAD half.
 *
 * The planner historically HARD-CODED LATHE_OP_ORDER, so a corpus retrain (cam-learn-order-run.mjs)
 * required a HUMAN to hand-transcribe the new ranking into source — the open loop. This store makes
 * the order map a durable DATA artifact (learned-op-order.json) the planner LOADS at runtime, with
 * the hard-coded map as the fail-soft fallback. Any producer (retrain, manual fix) that writes a
 * VALID artifact changes planner behavior with ZERO code edit — that is the closed loop.
 *
 * Pure + injectable IO (readImpl) for hermetic tests. loadLearnedOrder NEVER throws — a missing or
 * malformed artifact degrades LOUDLY (stderr) to the caller-supplied fallback, never a silent wrong
 * order (R12). buildLearnedOrderArtifact fails LOUD (throws) on an invalid order map — we own that
 * input, so a bad map is a programmer error, not a runtime degrade.
 *
 * Offline, no Fusion, no MCP. Companion: cam-part-program-planner.mjs (consumer),
 * cam-learn-order-run.mjs + cam-emit-learned-order.mjs (producers).
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const LEARNED_ORDER_SCHEMA_VERSION = "1.0.0";
export const LEARNED_ORDER_KIND = "cam_learned_op_order";
// scripts/lib -> scripts -> root -> state/shared/cam-drive
export const DEFAULT_LEARNED_ORDER_PATH = resolve(
  __dirname, "../../state/shared/cam-drive/learned-op-order.json",
);

// Defense-in-depth cap: the real lathe taxonomy is ~15 families. A wildly larger map is a corrupt
// or adversarial artifact — reject it rather than spread it across Math.min/Math.max (RangeError).
export const MAX_ORDER_FAMILIES = 256;

// "Rough before finish" precedences — physically MONOTONIC for turning (you cannot finish stock you
// have not yet roughed, nor finish-bore before rough-boring). Enforced ONLY when BOTH families are
// present, so a partial taxonomy never false-rejects. KEEP-IN-SYNC: family names must match
// cam-part-program-planner.mjs LATHE_OP_ORDER.
export const ROUGH_BEFORE_FINISH = [
  ["OD_roughing", "OD_finishing"],
  ["ID_boring", "bore_finish"],
];

// Keys that must never be a family. JSON.parse makes these own-properties (NOT a prototype-pollution
// vector for our numeric order[family] lookup), but rejecting them keeps the map a clean family→rank
// dictionary and guards any future Object.keys / for-in consumer.
const FORBIDDEN_ORDER_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Deterministic family ordering (by rank asc, then family name). Single source for build + load. */
export function sortOrderMap(order) {
  return Object.fromEntries(
    Object.entries(order).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])),
  );
}

/**
 * Validate a lathe op-order map (family -> numeric rank, lower = earlier). Returns { valid, reason };
 * NEVER throws (uses reduce, not Math.min(...spread), so a pathological map can't RangeError).
 *
 * GUARANTEES enforced (the rest of the interior ordering is corpus-trusted, NOT validated here):
 *   - plain object, non-empty, ≤ MAX_ORDER_FAMILIES, no __proto__/prototype/constructor keys
 *   - every rank is a finite number
 *   - the two boundary families exist: facing, parting_cutoff
 *   - facing is the earliest rank (== min) and STRICTLY before parting_cutoff
 *   - parting_cutoff is the last rank (== max)  → together these forbid the parting-first catastrophe
 *   - "rough before finish" monotonic precedences hold when both families are present
 *     (OD_roughing < OD_finishing, ID_boring < bore_finish) — physically impossible to invert
 * A map can still mis-order other interior pairs (e.g. thread-before-rough); the planner emits an
 * advisory sequence_warning for those — they are not rejected here.
 * @param {unknown} order
 * @returns {{valid: boolean, reason: string}}
 */
export function validateOrderMap(order) {
  if (order == null || typeof order !== "object" || Array.isArray(order)) {
    return { valid: false, reason: "not-an-object" };
  }
  const entries = Object.entries(order);
  if (entries.length === 0) return { valid: false, reason: "empty" };
  if (entries.length > MAX_ORDER_FAMILIES) return { valid: false, reason: `too-large:${entries.length}` };
  let min = Infinity, max = -Infinity;
  for (const [fam, rank] of entries) {
    if (FORBIDDEN_ORDER_KEYS.has(fam)) return { valid: false, reason: `forbidden-key:${fam}` };
    if (typeof rank !== "number" || !Number.isFinite(rank)) {
      return { valid: false, reason: `non-finite-rank:${fam}` };
    }
    if (rank < min) min = rank;
    if (rank > max) max = rank;
  }
  if (!has(order, "facing")) return { valid: false, reason: "missing-invariant-family:facing" };
  if (!has(order, "parting_cutoff")) return { valid: false, reason: "missing-invariant-family:parting_cutoff" };
  if (order.facing !== min) return { valid: false, reason: "invariant-violation:facing-not-earliest" };
  if (order.parting_cutoff !== max) return { valid: false, reason: "invariant-violation:parting_cutoff-not-last" };
  // STRICTLY before — excludes the degenerate all-equal / facing===parting collapse where
  // parting_cutoff could tie for earliest (a parting-first catastrophe that the ==min/==max checks miss).
  if (order.facing >= order.parting_cutoff) {
    return { valid: false, reason: "invariant-violation:facing-not-strictly-before-parting" };
  }
  for (const [rough, finish] of ROUGH_BEFORE_FINISH) {
    if (has(order, rough) && has(order, finish) && !(order[rough] < order[finish])) {
      return { valid: false, reason: `invariant-violation:${rough}-not-before-${finish}` };
    }
  }
  return { valid: true, reason: "ok" };
}

/**
 * Build the persisted artifact object (pure). Fails LOUD on an invalid order map / missing
 * required fields — the producer owns these inputs, so a bad one is a bug, not a degrade.
 * @param {{order: object, provenance?: object, source: string}} spec
 * @param {string} nowIso  injected ISO timestamp (Date.now is unavailable in pure contexts)
 * @returns {{schemaVersion:string, kind:string, learnedAt:string, source:string, order:object, provenance:object}}
 */
export function buildLearnedOrderArtifact({ order, provenance = {}, source } = {}, nowIso) {
  if (typeof nowIso !== "string" || !nowIso) {
    throw new Error("buildLearnedOrderArtifact: nowIso (ISO timestamp string) is required");
  }
  if (Number.isNaN(Date.parse(nowIso))) {
    throw new Error("buildLearnedOrderArtifact: nowIso must be a parseable ISO-8601 timestamp");
  }
  if (typeof source !== "string" || !source) {
    throw new Error("buildLearnedOrderArtifact: source (non-empty string) is required");
  }
  if (provenance == null || typeof provenance !== "object" || Array.isArray(provenance)) {
    throw new Error("buildLearnedOrderArtifact: provenance must be a plain object");
  }
  const v = validateOrderMap(order);
  if (!v.valid) throw new Error(`buildLearnedOrderArtifact: invalid order map (${v.reason})`);
  return {
    schemaVersion: LEARNED_ORDER_SCHEMA_VERSION,
    kind: LEARNED_ORDER_KIND,
    learnedAt: nowIso,
    source,
    // Deterministic key order (by rank, then family) — stable on-disk artifact, clean diffs.
    order: sortOrderMap(order),
    provenance,
  };
}

/**
 * Persist a learned-order artifact atomically (tmp + rename). Fails LOUD if the artifact is not a
 * valid learned-order object — the single write path, so producers (generator + learn-run) can never
 * persist a malformed artifact that loadLearnedOrder would silently reject. Injectable writeImpl for tests.
 * @param {string} path
 * @param {object} artifact  from buildLearnedOrderArtifact
 * @param {{writeImpl?: Function}} [io]
 * @returns {string} the path written
 */
export function writeLearnedOrderArtifact(path, artifact, { writeImpl = defaultAtomicWrite } = {}) {
  if (artifact == null || typeof artifact !== "object" || artifact.kind !== LEARNED_ORDER_KIND) {
    throw new Error("writeLearnedOrderArtifact: not a learned-order artifact (use buildLearnedOrderArtifact)");
  }
  const v = validateOrderMap(artifact.order);
  if (!v.valid) throw new Error(`writeLearnedOrderArtifact: artifact.order invalid (${v.reason})`);
  writeImpl(path, JSON.stringify(artifact, null, 2) + "\n");
  return path;
}

function defaultAtomicWrite(p, text) {
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, p);
}

/**
 * Load the learned order map, fail-soft to fallbackOrder. NEVER throws. A missing artifact
 * (ENOENT) is the normal "no retrain yet" path and is quiet; any other degrade (IO error, bad
 * JSON, kind mismatch, invariant violation) WARNS to stderr then falls back (R12 — surface the
 * degrade, never a silent wrong order).
 * @param {string} path
 * @param {object} fallbackOrder  the planner's hard-coded LATHE_OP_ORDER
 * @param {{readImpl?: Function, warn?: Function}} [io]
 * @returns {{order: object, source: string, learnedAt: string|null, valid: boolean, reason: string}}
 */
export function loadLearnedOrder(path, fallbackOrder, { readImpl = readFileSync, warn = defaultWarn } = {}) {
  // A logging failure must NEVER break the planner's order load — wrap the (possibly injected) warn.
  const safeWarn = (m) => { try { warn(m); } catch { /* swallow: logging is best-effort */ } };
  const degrade = (reason) => ({ order: fallbackOrder, source: "default-fallback", learnedAt: null, valid: false, reason });
  let raw;
  try {
    raw = readImpl(path, "utf8");
  } catch (e) {
    const code = (e && e.code) || "unknown";
    if (code !== "ENOENT") safeWarn(`[cam-learned-order-store] read failed (${code}); using fallback order`);
    return degrade(code === "ENOENT" ? "artifact-absent" : `read-error:${code}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    safeWarn("[cam-learned-order-store] artifact parse error; using fallback order");
    return degrade("parse-error");
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    safeWarn("[cam-learned-order-store] artifact is not an object; using fallback order");
    return degrade("not-an-object");
  }
  if (parsed.kind !== LEARNED_ORDER_KIND) {
    safeWarn(`[cam-learned-order-store] artifact kind mismatch (${parsed.kind}); using fallback order`);
    return degrade(`kind-mismatch:${parsed.kind}`);
  }
  // N-1 schema discipline (CLAUDE.md §SCHEMA VERSIONING): a major-version bump needs a migration;
  // an unknown major degrades LOUDLY rather than mis-reading a future order shape as an "invalid" one.
  const wantMajor = LEARNED_ORDER_SCHEMA_VERSION.split(".")[0];
  const gotMajor = typeof parsed.schemaVersion === "string" ? parsed.schemaVersion.split(".")[0] : null;
  if (gotMajor !== wantMajor) {
    safeWarn(`[cam-learned-order-store] artifact schema major mismatch (got ${parsed.schemaVersion}, want ${LEARNED_ORDER_SCHEMA_VERSION}); using fallback order`);
    return degrade(`schema-mismatch:${parsed.schemaVersion ?? "absent"}`);
  }
  const v = validateOrderMap(parsed.order);
  if (!v.valid) {
    safeWarn(`[cam-learned-order-store] artifact order invalid (${v.reason}); using fallback order`);
    return degrade(`invalid-order:${v.reason}`);
  }
  // Canonicalize on load so the in-memory order is deterministic regardless of on-disk key order
  // (protects against a hand-edited artifact + any future Object.keys/for-in consumer).
  return { order: sortOrderMap(parsed.order), source: "learned-artifact", learnedAt: parsed.learnedAt ?? null, valid: true, reason: "ok" };
}

/**
 * Extract a compact provenance block from a cam_order_learn_report (pure, tolerant of partial input).
 * @param {object} report  parsed CAM-ORDER-LEARN-REPORT.json
 * @returns {object}
 */
export function deriveProvenanceFromReport(report) {
  if (report == null || typeof report !== "object" || Array.isArray(report)) return {};
  return {
    sampled: report.sampled ?? null,
    programs_with_ops: report.programs_with_ops ?? null,
    minSupport: report.minSupport ?? null,
    minConfidence: report.minConfidence ?? null,
    corpus_suggested_order: Array.isArray(report.corpus_suggested_order) ? report.corpus_suggested_order : null,
    disagreements_applied: Array.isArray(report.disagreements) ? report.disagreements.length : null,
    report_kind: report.kind ?? null,
  };
}

function defaultWarn(msg) {
  try { process.stderr.write(`${msg}\n`); } catch { /* never let logging crash the planner */ }
}
