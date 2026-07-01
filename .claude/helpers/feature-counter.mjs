#!/usr/bin/env node
/**
 * feature-counter.mjs — shared per-feature usage counter (S6 from
 * DORMANT-FEATURES-PHASE5-TELEMETRY-GAP-2026-05-26.md, slot:alpha 2026-05-26).
 *
 * Why: FEATURE-UTILIZATION dashboard tracks 18 features. 16 show 0 fires
 * despite firing constantly — there is no shared counter the per-feature
 * hooks can increment. Each hook would need ~10 LOC of duplicated RMW logic;
 * this lib lets them call `incrementFeature("PSN", {slot})` in 1 line.
 *
 * State file: `state/shared/dashboards/feature-util-counts.json` (same dir
 * as the dashboards; FEATURE-UTILIZATION generator reads from here on regen).
 *
 * Schema (v1.0.0):
 *   {
 *     schemaVersion: "1.0.0",
 *     totalIncrements: N,
 *     updatedAtIso: ISO,
 *     features: {
 *       PSN: { name, count, firstSeenIso, lastSeenIso, lastSlot, perSlot: {alpha:N, ...} }
 *     }
 *   }
 *
 * Safety:
 *   - Atomic write via tmp+rename (matches recall-counter-track.mjs pattern)
 *   - Schema-version mismatch → re-init (don't crash; never blocks the hook)
 *   - Concurrent writes from peer slots: last-write-wins on the JSON; per-slot
 *     subcount preserved via `perSlot` merge before write (read-then-merge)
 *   - Disable: PRISM_FEATURE_COUNTER_DISABLE=1
 *
 * Pure-core (unit-testable): mergeCount · buildFreshState. IO layer: increment.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";

export const STATE_FILE = "H:/prism/state/shared/dashboards/feature-util-counts.json";
export const SCHEMA_VERSION = "1.0.0";

/**
 * Pure-core: produce a fresh empty state for first-use OR schema-mismatch recovery.
 */
export function buildFreshState(nowIso = new Date().toISOString()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    totalIncrements: 0,
    updatedAtIso: nowIso,
    features: {},
    // perDomainTotals (top-level census rollup added U-GALAXY-MS1-E2 Phase C, 2026-05-26):
    // total increments tagged with a given domain, summed across features.
    // Empty for legacy state that never received a domain param — fully backwards-compat.
    perDomainTotals: {},
  };
}

/**
 * Pure-core: apply one increment to a state object and return the merged result.
 * Does NOT mutate input. Exported for tests.
 *
 * @param {object} state — prior state (may be null/undefined → re-inits)
 * @param {string} featureName — e.g. "PSN", "SystemViz"
 * @param {object} opts
 * @param {string|null} opts.slot — slot identifier (alpha..zulu) or null
 * @param {string|null} opts.domain — galaxy/domain identifier (mill|lathe|wedm|quoting|business|...) or null.
 *   Added 2026-05-26 (U-GALAXY-MS1-E2, Phase C of DOMAIN-GALAXY-DOCTRINE-MS1) per the doctrine spec —
 *   enables per-domain census so operator decisions become data-driven instead of guess-driven. Optional
 *   + backwards-compat (legacy callers without domain still work; entries without domain have no perDomain key).
 * @param {string} opts.nowIso — ISO timestamp (default Date.now)
 */
export function mergeCount(state, featureName, { slot = null, domain = null, nowIso = new Date().toISOString() } = {}) {
  if (typeof featureName !== "string" || !featureName.trim()) {
    return state || buildFreshState(nowIso);
  }
  let next = (state && state.schemaVersion === SCHEMA_VERSION && state.features)
    ? { ...state, features: { ...state.features } }
    : buildFreshState(nowIso);

  const existing = next.features[featureName];
  const updated = existing
    ? {
        name: featureName,
        count: (existing.count || 0) + 1,
        firstSeenIso: existing.firstSeenIso || nowIso,
        lastSeenIso: nowIso,
        lastSlot: slot || existing.lastSlot || null,
        lastDomain: domain || existing.lastDomain || null,
        perSlot: { ...(existing.perSlot || {}) },
        perDomain: { ...(existing.perDomain || {}) },
      }
    : {
        name: featureName,
        count: 1,
        firstSeenIso: nowIso,
        lastSeenIso: nowIso,
        lastSlot: slot,
        lastDomain: domain,
        perSlot: {},
        perDomain: {},
      };
  if (slot) updated.perSlot[slot] = (updated.perSlot[slot] || 0) + 1;
  if (domain) updated.perDomain[domain] = (updated.perDomain[domain] || 0) + 1;
  next.features[featureName] = updated;
  next.totalIncrements = (next.totalIncrements || 0) + 1;
  next.updatedAtIso = nowIso;
  // Top-level domain census rollup (Phase C). Lazy-init for legacy state objects
  // that pre-date this field — preserves backwards-compat.
  if (!next.perDomainTotals) next.perDomainTotals = {};
  if (domain) next.perDomainTotals[domain] = (next.perDomainTotals[domain] || 0) + 1;
  return next;
}

function loadStateOrFresh(stateFile = STATE_FILE) {
  if (!existsSync(stateFile)) return buildFreshState();
  try {
    const raw = readFileSync(stateFile, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schemaVersion === SCHEMA_VERSION && parsed.features) return parsed;
  } catch { /* fall through */ }
  // Corrupt or schema-mismatch — re-init rather than crash
  return buildFreshState();
}

function writeStateAtomic(state, stateFile = STATE_FILE) {
  const dir = dirname(stateFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = stateFile + ".tmp-" + process.pid;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, stateFile);
}

/**
 * Public IO: increment the named feature's counter. Best-effort; never throws.
 * Returns the new count or null on disable/error (so callers can short-circuit).
 *
 * @param {string} featureName — feature identifier
 * @param {object} opts
 * @param {string|null} opts.slot — chat slot (alpha..zulu) — optional, drives perSlot subcount
 * @param {string|null} opts.domain — galaxy/domain (mill|lathe|wedm|quoting|business|...) — optional,
 *   drives perDomain subcount + perDomainTotals top-level census (Phase C, 2026-05-26)
 * @param {string} opts.stateFile — override state file path (tests only)
 */
export function incrementFeature(featureName, { slot = null, domain = null, stateFile = STATE_FILE } = {}) {
  if (process.env.PRISM_FEATURE_COUNTER_DISABLE === "1") return null;
  try {
    const current = loadStateOrFresh(stateFile);
    const next = mergeCount(current, featureName, { slot, domain });
    writeStateAtomic(next, stateFile);
    return next.features[featureName]?.count ?? null;
  } catch {
    // Telemetry MUST never fail. Swallow.
    return null;
  }
}

/**
 * Public IO: read the current state. Returns a fresh state if the file is
 * missing or corrupt (never throws).
 */
export function readState(stateFile = STATE_FILE) {
  return loadStateOrFresh(stateFile);
}
