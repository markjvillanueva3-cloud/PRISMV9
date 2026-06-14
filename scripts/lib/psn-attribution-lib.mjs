#!/usr/bin/env node
// psn-attribution-lib.mjs — which PSN leg did a retrieval actually consult?
//
// Lever #2 of the obsidian/hermes context-learning acceleration synthesis
// (state/shared/specs/OBSIDIAN-HERMES-CONTEXT-LEARNING-ACCEL-2026-06-06.md). It
// COMPOUNDS on U-SCP01 (source-chain-lib.mjs): every retrieval hit now carries a
// source-chain Citation ({source_type, path, ...}); this lib maps that citation
// to one of the 11 canonical PSN legs and records per-session leg coverage, so
// the fleet can finally MEASURE "which legs of the brain are actually being
// consulted" (the live 0.8%-route-nudge / "did knowledge get used?" blindness
// the synthesis named). Producer side only — the read dispatcher action
// (prism_session:psn_attribution) and the retrieval-call-site tap are the
// integration layer that build on this verifiable core.
//
// PSN = PRISM Synergy Network, 11 legs (canonical taxonomy:
// knowledge/memories/feedback/feedback_psn_definition.md):
//   1 Obsidian brain · 2 PRISM OS · 3 Wiki · 4 Memories · 5 Tribal ·
//   6 System Viz · 7 Engines · 8 Algorithms · 9 Formulas · 10 NN/GNN · 11 PRISM AI
//
// Conventions: fail-soft (recording is telemetry — NEVER throw into a hook /
// retrieval path), I/O confined to the append (O_APPEND atomic line writes, safe
// across the 26-chat fleet), pure leg-mapping core, injectable fs for tests,
// PRISM_-prefixed knobs, schemaVersion on every record.
//
// Knobs: PRISM_PSN_ATTRIBUTION_DISABLE=1 → recordLegConsult is a no-op.
//   PRISM_PSN_ATTRIBUTION_MAX_BYTES=N → rotate the ledger past N bytes (default 5MB).
//
// Ledger hygiene (arm-C 3-of-3 finding on U-PSN-ATTR01): the live per-prompt tap
// appends across the 26-chat fleet, so the jsonl would grow unbounded. ONE-
// generation rotation (current → .1 at the size cap) bounds growth AND — because
// the live file can never exceed the cap — bounds the coverage read to O(cap)
// instead of O(all-history), addressing both arm-C concerns with one mechanism.
//
// @module psn-attribution-lib

import { appendFileSync, readFileSync, existsSync, statSync, renameSync } from "node:fs";

export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_LEDGER_PATH = "H:/prism/state/shared/psn-attribution.jsonl";

// Size cap for ledger rotation (bytes). Past this, the current ledger is renamed
// to "<path>.1" (one generation kept) before the next append, so the live file
// never exceeds ~cap and the coverage read stays bounded.
const MAX_LEDGER_BYTES = Number(process.env.PRISM_PSN_ATTRIBUTION_MAX_BYTES) || (5 * 1024 * 1024);

// One rate-limited breadcrumb per process if the ledger append ever fails, so a
// persistently unwritable ledger (bad path / perms on a non-primary host) is a
// DIAGNOSABLE no-op rather than a fully silent one (arm-C observation). Still
// fail-soft — the breadcrumb itself can never throw into the caller.
let _appendFailureWarned = false;
function warnFirstAppendFailure(err) {
  if (_appendFailureWarned) return;
  _appendFailureWarned = true;
  try {
    process.stderr.write(
      `[psn-attribution-lib] ledger append failed (${err?.message || err}) — PSN-leg `
      + "attribution is silently not recording; check the ledger path/perms.\n",
    );
  } catch { /* stderr unavailable — still never throw */ }
}

// Rotate the ledger one generation when it exceeds MAX_LEDGER_BYTES. Fail-soft:
// any stat/rename error is swallowed (the append then continues on the existing
// file — degraded but never throws). Injectable stat/rename/exists for tests.
function rotateIfNeeded(ledgerPath, opts = {}) {
  const statImpl = opts.statImpl ?? statSync;
  const renameImpl = opts.renameImpl ?? renameSync;
  const existsImpl = opts.existsImpl ?? existsSync;
  try {
    if (!existsImpl(ledgerPath)) return;
    const size = statImpl(ledgerPath).size;
    if (Number.isFinite(size) && size > MAX_LEDGER_BYTES) {
      renameImpl(ledgerPath, ledgerPath + ".1"); // overwrites the prior generation
    }
  } catch { /* rotation is best-effort — never blocks the append */ }
}

// Canonical 11-leg PSN taxonomy, snake_case ids (order = leg number 1..11).
export const PSN_LEGS = Object.freeze([
  "obsidian_brain", "prism_os", "wiki", "memories", "tribal",
  "system_viz", "engines", "algorithms", "formulas", "nn_gnn", "prism_ai",
]);
const PSN_LEG_SET = new Set(PSN_LEGS);

// ----------------------------------------------------------------------------
// PURE LEG-MAPPING CORE (compounds on U-SCP01 source-chain Citation.source_type)
// ----------------------------------------------------------------------------

// Direct map from a source-chain Citation.source_type to its primary PSN leg.
// (Dispatchers ARE the PRISM OS execution surface → prism_os.) "external" is
// refined by node-id below — it carries no single fixed leg.
const SOURCE_TYPE_TO_LEG = Object.freeze({
  wiki: "wiki",
  memory: "memories",
  tribal: "tribal",
  engine: "engines",
  dispatcher: "prism_os",
});

// Refine an "external" (or otherwise unmapped) citation by its node-id prefix.
// Returns a leg id or null (genuinely unmapped — honest, not forced).
function legForExternalId(path) {
  const id = String(path || "").toLowerCase();
  if (id.startsWith("ghost")) return "system_viz";   // ghost roosts render in system-viz
  if (id.startsWith("formula")) return "formulas";
  if (id.startsWith("algo")) return "algorithms";
  if (id.startsWith("nn") || id.startsWith("gnn")) return "nn_gnn";
  return null;
}

/**
 * Map a single source-chain Citation ({source_type, path}) to its PSN leg id,
 * or null when genuinely unmapped (never forced). Pure; never throws.
 * @param {{source_type?:string, path?:string}} citation
 * @returns {string|null}
 */
export function legForCitation(citation) {
  if (!citation || typeof citation !== "object") return null;
  const direct = SOURCE_TYPE_TO_LEG[citation.source_type];
  if (direct) return direct;
  // "external" or any unknown source_type → try node-id refinement.
  return legForExternalId(citation.path);
}

/**
 * Distinct, taxonomy-ordered list of PSN legs consulted by a citation set.
 * Pure; ignores null/garbage citations; never throws.
 * @param {Array<{source_type?:string, path?:string}>} citations
 * @returns {string[]}
 */
export function legsForCitations(citations) {
  const list = Array.isArray(citations) ? citations : [];
  const seen = new Set();
  for (const c of list) {
    const leg = legForCitation(c);
    if (leg && PSN_LEG_SET.has(leg)) seen.add(leg);
  }
  // Return in canonical leg order (stable, not insertion order).
  return PSN_LEGS.filter((l) => seen.has(l));
}

// ----------------------------------------------------------------------------
// RECORD (append-only telemetry — fail-soft, never throws)
// ----------------------------------------------------------------------------

/**
 * Record which PSN legs a retrieval consulted, appending ONE JSONL line to the
 * attribution ledger. Fail-soft: a disabled knob, an empty leg set, or any fs
 * error is swallowed (returns null) — telemetry must never break a retrieval.
 * The append uses O_APPEND (appendFileSync 'a' flag) so concurrent fleet writers
 * never interleave a sub-PIPE_BUF line.
 *
 * @param {object} opts
 * @param {string} opts.sessionId
 * @param {string} [opts.surface]            — e.g. "master-index-precheck"
 * @param {Array}  [opts.citations]          — source-chain Citations (preferred)
 * @param {string[]} [opts.legs]             — pre-computed leg ids (overrides citations)
 * @param {string} [opts.now]                — ISO ts (injected for tests)
 * @param {string} [opts.ledgerPath]
 * @param {Function} [opts.appendImpl]       — injectable for tests
 * @returns {object|null} the written record, or null if skipped/failed
 */
export function recordLegConsult(opts = {}) {
  if (process.env.PRISM_PSN_ATTRIBUTION_DISABLE === "1") return null;
  const sessionId = typeof opts.sessionId === "string" ? opts.sessionId : "";
  if (!sessionId) return null;

  const legs = Array.isArray(opts.legs)
    ? PSN_LEGS.filter((l) => opts.legs.includes(l))   // sanitize to known legs, canonical order
    : legsForCitations(opts.citations);
  if (legs.length === 0) return null;                 // nothing to attribute

  const record = {
    schemaVersion: SCHEMA_VERSION,
    ts: typeof opts.now === "string" && opts.now ? opts.now : new Date().toISOString(),
    sessionId,
    surface: typeof opts.surface === "string" ? opts.surface : "",
    legs,
    n: Array.isArray(opts.citations) ? opts.citations.length : legs.length,
  };

  const ledgerPath = opts.ledgerPath ?? DEFAULT_LEDGER_PATH;
  try {
    rotateIfNeeded(ledgerPath, opts);   // bound growth before appending (arm-C)
    const append = opts.appendImpl ?? appendFileSync;
    append(ledgerPath, JSON.stringify(record) + "\n", "utf8");
    return record;
  } catch (err) {
    warnFirstAppendFailure(err); // one breadcrumb so a dead ledger isn't fully silent
    return null;                 // telemetry write must never throw into the caller
  }
}

// ----------------------------------------------------------------------------
// READ (per-session leg coverage — fail-soft)
// ----------------------------------------------------------------------------

/**
 * Compute per-session PSN-leg coverage from the ledger. Fail-soft: a missing /
 * unreadable / partially-corrupt ledger yields zero coverage (per-line
 * try/continue so one bad line never aborts the read).
 *
 * @param {string} sessionId
 * @param {{ledgerPath?:string, readImpl?:Function, existsImpl?:Function}} [opts]
 * @returns {{sessionId:string, coverage:number, total:number, legsConsulted:string[], byLeg:Object, records:number}}
 */
export function sessionLegCoverage(sessionId, opts = {}) {
  const total = PSN_LEGS.length;
  const empty = { sessionId: sessionId || "", coverage: 0, total, legsConsulted: [], byLeg: {}, records: 0 };
  if (!sessionId) return empty;

  const ledgerPath = opts.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const existsImpl = opts.existsImpl ?? existsSync;
  const readImpl = opts.readImpl ?? readFileSync;
  if (!existsImpl(ledgerPath)) return empty;

  let raw;
  try { raw = readImpl(ledgerPath, "utf8"); } catch { return empty; }

  const byLeg = {};
  let records = 0;
  for (const line of String(raw).split("\n")) {
    if (!line) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; } // skip a torn/garbage line
    if (!rec || rec.sessionId !== sessionId || !Array.isArray(rec.legs)) continue;
    records++;
    for (const leg of rec.legs) {
      if (PSN_LEG_SET.has(leg)) byLeg[leg] = (byLeg[leg] || 0) + 1;
    }
  }

  const legsConsulted = PSN_LEGS.filter((l) => byLeg[l] > 0); // canonical order
  return { sessionId, coverage: legsConsulted.length, total, legsConsulted, byLeg, records };
}

/**
 * Fleet-wide PSN-leg coverage across the WHOLE ledger (all sessions) — the
 * headline "which legs of the brain is the fleet actually consulting?" metric.
 * Same fail-soft + per-line-skip posture as sessionLegCoverage; the read is
 * bounded because rotation (U-PSN-ATTR02) caps the live file. Records rotated
 * into "<path>.1" are not counted (recent-window aggregate — acceptable).
 *
 * @param {{ledgerPath?:string, readImpl?:Function, existsImpl?:Function}} [opts]
 * @returns {{coverage:number, total:number, legsConsulted:string[], byLeg:Object, records:number, sessions:number}}
 */
export function aggregateLegCoverage(opts = {}) {
  const total = PSN_LEGS.length;
  const empty = { coverage: 0, total, legsConsulted: [], byLeg: {}, records: 0, sessions: 0 };
  const ledgerPath = opts.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const existsImpl = opts.existsImpl ?? existsSync;
  const readImpl = opts.readImpl ?? readFileSync;
  if (!existsImpl(ledgerPath)) return empty;

  let raw;
  try { raw = readImpl(ledgerPath, "utf8"); } catch { return empty; }

  const byLeg = {};
  const sessions = new Set();
  let records = 0;
  for (const line of String(raw).split("\n")) {
    if (!line) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; } // skip a torn/garbage line
    if (!rec || !Array.isArray(rec.legs)) continue;
    records++;
    if (typeof rec.sessionId === "string" && rec.sessionId) sessions.add(rec.sessionId);
    for (const leg of rec.legs) {
      if (PSN_LEG_SET.has(leg)) byLeg[leg] = (byLeg[leg] || 0) + 1;
    }
  }
  const legsConsulted = PSN_LEGS.filter((l) => byLeg[l] > 0); // canonical order
  return { coverage: legsConsulted.length, total, legsConsulted, byLeg, records, sessions: sessions.size };
}

/**
 * One-line operator-visible summary, e.g. "PSN legs consulted: 4/11
 * (wiki, memories, tribal, engines)".
 * @param {ReturnType<typeof sessionLegCoverage>} cov
 * @returns {string}
 */
export function renderCoverage(cov) {
  if (!cov || typeof cov !== "object") return "PSN legs consulted: 0/11";
  const list = Array.isArray(cov.legsConsulted) ? cov.legsConsulted : [];
  const names = list.length ? ` (${list.join(", ")})` : "";
  return `PSN legs consulted: ${cov.coverage ?? 0}/${cov.total ?? PSN_LEGS.length}${names}`;
}
