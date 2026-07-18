#!/usr/bin/env node
/**
 * cag-consume.mjs — shared CAG-route sidecar consumer helper.
 *
 * TOKEN-SAVINGS-PIVOT/U-CAG-INJECTORS-CONSUME (sierra 2026-05-27):
 * Read the per-session route-decision sidecar written by
 * `.claude/hooks/cag-router-inject.mjs` and decide whether a static-doctrine
 * injector (master-index-precheck-inject, memory-relevance-inject,
 * tribal-by-domain-inject) should short-circuit its full inject path.
 *
 * Producer contract (from cag-router-inject.mjs, schemaVersion 1.0.0):
 *   sidecar = state/shared/cag-route/latest-<sessionId>.json
 *   sidecar.skip[<name>] === true  when the producer classified the prompt
 *                                   as COLD with confidence ≥0.4 AND the
 *                                   consumer is in the skippable set
 *                                   (masterIndexInject / memoryRelevanceInject
 *                                    / tribalByDomainInject). wikiPrecheckInject
 *                                   is always false (too cheap to skip).
 *
 * Safety rails (fail-OPEN — never block, never over-skip):
 *   - sidecar missing → no skip (the producer didn't run or hasn't yet).
 *   - sidecar unparseable → no skip.
 *   - sidecar schemaVersion mismatch → no skip.
 *   - sidecar older than STALE_MS (default 30s) → no skip. Guards against
 *     a prior HOT/HYBRID prompt's sidecar leaking a (false-flag) skip into a
 *     later COLD prompt that the producer happened to NOT run for; the 30s
 *     window covers the producer + this consumer firing on the same prompt
 *     while rejecting any cross-prompt leak (a single prompt round-trip is
 *     hundreds of ms; 30s is ~100x margin).
 *   - missing session_id → no skip (no sidecar key to look up).
 *   - PRISM_CAG_CONSUME_DISABLE=1 → no skip (operator escape).
 *
 * Per Karpathy R12: skip decisions are LOUD — the caller is expected to
 * emit a one-line advisory naming this helper as the reason, so an operator
 * never sees a silently-blank doctrine injector and wonders why.
 *
 * Pure-core: parseSidecar · decide. IO layer: shouldSkip.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_SIDECAR_DIR = "H:/prism/state/shared/cag-route";
export const EXPECTED_SCHEMA = "1.0.0";
export const DEFAULT_STALE_MS = 30_000;

export const SKIP_KEYS = Object.freeze([
  "masterIndexInject",
  "memoryRelevanceInject",
  "tribalByDomainInject",
  "wikiPrecheckInject",
]);

/**
 * Pure-core: parse raw sidecar JSON text and return the structured shape
 * we trust, or null on any defect. Never throws.
 */
export function parseSidecar(raw) {
  if (typeof raw !== "string" || !raw) return null;
  let j;
  try { j = JSON.parse(raw); } catch { return null; }
  if (!j || typeof j !== "object") return null;
  if (j.schemaVersion !== EXPECTED_SCHEMA) return null;
  if (typeof j.writtenAt !== "string") return null;
  if (!j.skip || typeof j.skip !== "object") return null;
  if (!j.decision || typeof j.decision !== "object") return null;
  return j;
}

/**
 * Pure-core: given a parsed sidecar + the consumer's name + `now`, decide
 * whether to skip. Returns `{skip:boolean, reason:string}` — `reason` is the
 * one-token cause string the caller emits in its advisory.
 */
export function decide(sidecar, skipKey, { now = Date.now(), staleMs = DEFAULT_STALE_MS } = {}) {
  if (!sidecar) return { skip: false, reason: "no-sidecar" };
  if (!SKIP_KEYS.includes(skipKey)) return { skip: false, reason: "bad-key" };
  const writtenMs = Date.parse(sidecar.writtenAt);
  if (!Number.isFinite(writtenMs)) return { skip: false, reason: "bad-timestamp" };
  if (now - writtenMs > staleMs) return { skip: false, reason: "stale-sidecar" };
  const flag = sidecar.skip[skipKey];
  if (flag !== true) return { skip: false, reason: "flag-false" };
  return {
    skip: true,
    reason: "cag-cold",
    tier: sidecar.decision.tier,
    confidence: sidecar.decision.confidence,
  };
}

/**
 * IO layer: open the sidecar for the given session id and call decide().
 * Best-effort — every failure mode returns `{skip:false, reason:<cause>}`.
 *
 * @param {string} skipKey         one of SKIP_KEYS
 * @param {object} opts
 * @param {string} opts.sessionId  harness session_id (UUID from stdin payload)
 * @param {string} [opts.sidecarDir]  override (test-only)
 * @param {number} [opts.staleMs]     override (test-only)
 * @param {number} [opts.now]         override (test-only)
 */
export function shouldSkip(skipKey, opts = {}) {
  if (process.env.PRISM_CAG_CONSUME_DISABLE === "1") {
    return { skip: false, reason: "disabled" };
  }
  // Env override for sidecarDir is the only way the in-process consumers
  // (called from inside settings.json-wired hook subprocesses, where opts
  // can't be passed) can be steered at a tmpdir for end-to-end tests. The
  // env knob lets the test file write a sidecar into a tmpdir AND set the
  // same env on the subprocess invocation — the production default is
  // untouched when the knob is unset.
  const envDir = typeof process.env.PRISM_CAG_CONSUME_SIDECAR_DIR === "string" && process.env.PRISM_CAG_CONSUME_SIDECAR_DIR
    ? process.env.PRISM_CAG_CONSUME_SIDECAR_DIR
    : DEFAULT_SIDECAR_DIR;
  const { sessionId, sidecarDir = envDir, staleMs = DEFAULT_STALE_MS, now = Date.now() } = opts;
  if (typeof sessionId !== "string" || !sessionId) {
    return { skip: false, reason: "no-session" };
  }
  const sidecarFile = join(sidecarDir, `latest-${sessionId}.json`);
  if (!existsSync(sidecarFile)) return { skip: false, reason: "no-sidecar" };
  let raw;
  try { raw = readFileSync(sidecarFile, "utf8"); }
  catch { return { skip: false, reason: "io-error" }; }
  const sidecar = parseSidecar(raw);
  return decide(sidecar, skipKey, { now, staleMs });
}

/**
 * Convenience: render the one-line advisory the consumer emits when skip=true.
 * Keeps the messaging consistent across the three consumer hooks.
 */
export function skipAdvisory(consumerLabel, decision) {
  const tier = decision?.tier || "COLD";
  const conf = typeof decision?.confidence === "number" ? decision.confidence.toFixed(2) : "n/a";
  return `## ⏭ ${consumerLabel} skipped — CAG-route tier=${tier} confidence=${conf} (doctrine block answers this prompt; live inject would duplicate). _Disable: PRISM_CAG_CONSUME_DISABLE=1._`;
}
