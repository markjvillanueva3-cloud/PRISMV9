#!/usr/bin/env node
// scripts/audit-probe-roster-coverage.mjs
//
// U-ALPHA-OLLAMA-ROSTER-COVERAGE-GUARD (slot:alpha 2026-06-25): keep the "blind graph"
// drift that U-ALPHA-OLLAMA-ROSTER-SYNC fixed from RECURRING. The nightly capability probe
// (ollama-capability-probe DEFAULT_MODELS) and the routing tiers (ollama-cost-router
// TIER_PREFERENCES) are otherwise kept in sync by COMMENT only -- so the moment golf pulls a
// new routable model, the router can PICK it while the matrix never MEASURES it (the exact
// 3-of-9 blindness that bit us: the probe measured only 1.5b/gpt-oss:20b/32b while the router
// preferred qwen3-coder:30b). This audit asserts the invariant: every INSTALLED, measurable
// (non-vision/non-embed) model the router can route to MUST be in the probe roster.
//
// PURE core (unit-testable, injected data) + a LIVE CLI that reads /api/tags. Fail-soft:
// Ollama down -> SKIP (exit 0), never a false drift. Drift found -> exit 1 + the missing list,
// so a nightly task / CI catches the divergence instead of waiting for the next blind matrix.
//
// Usage:
//   node scripts/audit-probe-roster-coverage.mjs           # human report, exit 1 on drift
//   node scripts/audit-probe-roster-coverage.mjs --json    # {ok, missing, skipped}

import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_MODELS } from "./ollama-capability-probe.mjs";
import { TIER_PREFERENCES } from "../.claude/hooks/lib/ollama-cost-router.mjs";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

// Vision + embed families the TEXT battery cannot fairly score -> never expected in the probe
// roster, so they are excluded from the coverage requirement even when a tier lists them.
export const NON_TEXT_RE = /(^|[:\-])(vl|vision|moondream|embed)/i;

/** PURE: flatten the tier-preferences object to a de-duped list of routable model tags. */
export function flattenTierModels(tierPrefs) {
  const out = new Set();
  for (const tier of Object.values(tierPrefs || {})) {
    for (const m of (tier || [])) if (typeof m === "string" && m) out.add(m);
  }
  return [...out];
}

/**
 * PURE: routable models that are INSTALLED + measurable but MISSING from the probe roster.
 * A non-empty result = the matrix will be blind to a model the router can pick (the drift bug).
 * @returns {string[]} missing model tags (empty = invariant holds)
 */
export function findUncoveredRoutableModels({ tierModels, installed, probeRoster, excludeRe = NON_TEXT_RE }) {
  const inst = new Set(installed || []);
  const roster = new Set(probeRoster || []);
  return (tierModels || []).filter((m) => inst.has(m) && !excludeRe.test(m) && !roster.has(m));
}

async function fetchInstalled() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j.models) ? j.models.map((m) => m.name).filter(Boolean) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const asJson = process.argv.includes("--json");
  const installed = await fetchInstalled();
  if (installed === null) {
    const reason = "ollama down (:11434) -- coverage audit SKIPPED (fail-soft, not a drift)";
    process.stdout.write(asJson ? JSON.stringify({ ok: true, skipped: true, reason }) + "\n" : `[roster-coverage] ${reason}\n`);
    return; // exit 0
  }
  const tierModels = flattenTierModels(TIER_PREFERENCES);
  const missing = findUncoveredRoutableModels({ tierModels, installed, probeRoster: DEFAULT_MODELS });
  if (missing.length === 0) {
    process.stdout.write(asJson ? JSON.stringify({ ok: true, missing: [] }) + "\n" : "[roster-coverage] OK -- every installed routable model is in the probe roster\n");
    return;
  }
  const msg = `BLIND-GRAPH DRIFT: ${missing.length} installed routable model(s) the cost-router can pick but the probe never measures: ${missing.join(", ")}. Add them to DEFAULT_MODELS in scripts/ollama-capability-probe.mjs.`;
  process.stdout.write(asJson ? JSON.stringify({ ok: false, missing }) + "\n" : `[roster-coverage] ${msg}\n`);
  process.exitCode = 1;
}

const isMain = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (isMain) main().catch((e) => { process.stderr.write(`[roster-coverage] ${e?.message || e}\n`); process.exitCode = 1; });
