#!/usr/bin/env node
/**
 * quoting-baseline-resolve.mjs — guard-aware baseline selection for the quoting
 * closed-loop training cycle.
 *
 * QUOTING-SYNERGY-MS0/U-QP-BASELINE-FALLBACK (slot:charlie 2026-06-02).
 *
 * THE BUG THIS CLOSES (the dead closed loop):
 *   The default training baseline is `state/shared/quoting/baseline-records.json`,
 *   which is a 100-record BOOTSTRAP PLACEHOLDER (machine MODELS like
 *   "Okuma_Multus_B250II" seeded as customers, all actual_revenue_usd = a single
 *   stub value). The poison-guard (quoting-baseline-guard.mjs, U-QP-BASELINE-GUARD)
 *   correctly REFUSES it — which means `node scripts/quoting-train-cycle.mjs` exits
 *   2 and the closed loop never trains. Meanwhile the REAL JM-Die corpus
 *   (`baseline-records-corpus-with-real.json`, 47,905 records / 474 customers) sits
 *   right next to it, already guard-admitted, completely unused.
 *
 * THE FIX:
 *   Honor the operator's configured baseline FIRST (explicit intent wins). But if
 *   the guard refuses it — or it can't be read / has zero records — fall back
 *   through the canonical real-data corpora, RE-VALIDATING each through the SAME
 *   guard, and train on the first one admitted. This keeps the loop alive on REAL
 *   data and can never silently train on a poisoned stub (the guard still gates
 *   every candidate). Fail-loud: the caller surfaces which candidate was chosen and
 *   why the configured one was rejected.
 *
 * Pure + injectable (fs is parameterized) so the resolver is unit-testable without
 * touching disk. Exports:
 *   - FALLBACK_CORPORA          canonical real-data corpora, descending preference
 *   - normalizePath(p)          slash-normalize for dedup/compare
 *   - buildCandidateList(...)   configured + fallbacks, deduped, order-preserving
 *   - resolveTrainableBaseline(...)  async resolver → chosen baseline + provenance
 */

import { promises as fsp, existsSync as fsExistsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Canonical real-data JM-Die corpora, in DESCENDING preference. These are the
 * 47k-record overlay corpora the guard admits (the small baseline-records.json is
 * the bootstrap stub it refuses). `-with-real` carries the real-invoice overlay
 * (best calibration signal); `-corpus` is the base corpus without the overlay.
 * NOTE: `-with-synth` is intentionally NOT a fallback target — it is synthetic
 * revenue and only useful for self-consistency, never as a silent rescue.
 */
export const FALLBACK_CORPORA = Object.freeze([
  "state/shared/quoting/baseline-records-corpus-with-real.json",
  "state/shared/quoting/baseline-records-corpus.json",
]);

/** Slash-normalize a path so Windows `\` and POSIX `/` dedup/compare identically. */
export function normalizePath(p) {
  return typeof p === "string" ? p.replace(/\\/g, "/") : "";
}

/**
 * Build the ordered candidate list: the configured path first (operator intent),
 * then the fallback corpora, de-duplicated (a configured path that already appears
 * in the fallback list is not retried). Order-preserving.
 * @param {string} configuredPath
 * @param {{fallbacks?: string[]}} [opts]
 * @returns {string[]}
 */
export function buildCandidateList(configuredPath, opts = {}) {
  const fallbacks = Array.isArray(opts.fallbacks) ? opts.fallbacks : FALLBACK_CORPORA;
  const seen = new Set();
  const out = [];
  for (const p of [configuredPath, ...fallbacks]) {
    if (!p || typeof p !== "string") continue;
    const key = normalizePath(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Read a baseline JSON file → { ok, records, error }. Never throws. */
async function readRecords(absPath, readFile) {
  try {
    const raw = await readFile(absPath, "utf-8");
    const data = JSON.parse(raw);
    const records = Array.isArray(data?.records) ? data.records : [];
    return { ok: true, records };
  } catch (e) {
    return { ok: false, records: [], error: String(e) };
  }
}

/**
 * resolveTrainableBaseline — choose the baseline the closed loop should train on.
 *
 * Walks buildCandidateList(configuredPath, fallbacks). For each candidate that
 * exists, parses, and has >0 records, runs `validate(records)` (the poison-guard).
 * Returns the FIRST guard-admitted candidate, tagging `fallbackUsed` when the
 * chosen path is not the configured one. If NO candidate is admitted, returns the
 * CONFIGURED candidate's outcome (records + guard if it parsed) so the caller's
 * existing loud-refuse / --force-degenerate paths behave exactly as before.
 *
 * @param {object} o
 * @param {string} o.configuredPath              relative or absolute baseline path
 * @param {(records:any[])=>{refuse:boolean,reasons?:string[],warnings?:string[]}} o.validate  the guard
 * @param {string} [o.cwd]                        base dir for relative paths (default process.cwd())
 * @param {string[]} [o.fallbacks]               override FALLBACK_CORPORA ([] = strict, no fallback)
 * @param {(p:string)=>boolean} [o.exists]        fs.existsSync injection (tests)
 * @param {(p:string,enc:string)=>Promise<string>} [o.readFile]  fs read injection (tests)
 * @returns {Promise<{ok:boolean, path:string, abs:string, records:any[], guard:object|null,
 *                     fallbackUsed:boolean, configuredPath:string, configuredRefused:boolean,
 *                     configuredReasons:string[], tried:Array}>}
 */
export async function resolveTrainableBaseline(o) {
  const { configuredPath, validate } = o ?? {};
  if (typeof validate !== "function") {
    throw new TypeError("resolveTrainableBaseline: opts.validate must be a function");
  }
  if (!configuredPath || typeof configuredPath !== "string") {
    throw new TypeError("resolveTrainableBaseline: opts.configuredPath must be a non-empty string");
  }
  const cwd = o.cwd ?? process.cwd();
  const exists = o.exists ?? fsExistsSync;
  const readFile = o.readFile ?? fsp.readFile;
  const fallbacks = Array.isArray(o.fallbacks) ? o.fallbacks : FALLBACK_CORPORA;

  const candidates = buildCandidateList(configuredPath, { fallbacks });
  const tried = [];
  /** captured outcome of the CONFIGURED candidate (for the no-admit fallthrough) */
  let configured = null;

  for (const rel of candidates) {
    const abs = resolve(cwd, rel);
    const isConfigured = normalizePath(rel) === normalizePath(configuredPath);

    if (!exists(abs)) {
      tried.push({ path: rel, present: false, admitted: false, reason: "missing", records: 0 });
      if (isConfigured) configured = { path: rel, abs, records: [], guard: null, reason: "missing" };
      continue;
    }

    const rj = await readRecords(abs, readFile);
    if (!rj.ok || rj.records.length === 0) {
      const reason = rj.ok ? "no records" : "read/parse failed";
      tried.push({ path: rel, present: true, admitted: false, reason, records: rj.records.length });
      if (isConfigured) configured = { path: rel, abs, records: rj.records, guard: null, reason };
      continue;
    }

    const guard = validate(rj.records);
    const admitted = !guard.refuse;
    tried.push({
      path: rel,
      present: true,
      admitted,
      records: rj.records.length,
      ...(admitted ? {} : { reason: "guard refused", refuse_reasons: guard.reasons ?? [] }),
    });
    if (isConfigured) {
      configured = { path: rel, abs, records: rj.records, guard, reason: admitted ? null : "guard refused" };
    }
    if (admitted) {
      return {
        ok: true,
        path: rel,
        abs,
        records: rj.records,
        guard,
        fallbackUsed: !isConfigured,
        configuredPath,
        // `configuredRefused` means specifically "the poison-guard ran on the
        // configured baseline and REFUSED it" — NOT "the configured file was
        // missing/unreadable/empty". Both return paths use this identical
        // definition so a caller can trust the field across either shape (the
        // no-admit return below computes it the same way). A missing/badjson/
        // 0-record configured path yields configuredRefused:false (guard never
        // ran) with configuredReasons:[].
        configuredRefused: configured ? configured.reason === "guard refused" : false,
        configuredReasons: configured && configured.guard ? (configured.guard.reasons ?? []) : [],
        tried,
      };
    }
  }

  // No candidate admitted — fall through with the CONFIGURED candidate's data so the
  // caller's loud-refuse / --force-degenerate behavior is byte-for-byte preserved.
  const c = configured ?? { path: configuredPath, abs: resolve(cwd, configuredPath), records: [], guard: null, reason: "missing" };
  return {
    ok: false,
    path: c.path,
    abs: c.abs,
    records: c.records,
    guard: c.guard,
    fallbackUsed: false,
    configuredPath,
    configuredRefused: c.reason === "guard refused",
    configuredReasons: c.guard ? (c.guard.reasons ?? []) : [],
    tried,
  };
}
