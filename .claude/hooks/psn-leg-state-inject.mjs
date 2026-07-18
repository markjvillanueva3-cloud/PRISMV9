#!/usr/bin/env node
// tier: T3 (advisory)
/**
 * psn-leg-state-inject.mjs — UserPromptSubmit injector
 *
 * Companion to psn-prompt-checklist-inject.mjs (U-PSN-PROMPT-CHECKLIST-INJECT).
 * The CHECKLIST hook tells the model "consult the substrate"; this hook IS
 * one of the substrates it should consult — a compact per-PSN-leg health
 * digest that surfaces ONLY legs in a concerning state. Silent when every
 * leg is healthy.
 *
 * U-PSN-LEG-STATE-INJECT (2026-05-24, slot golf, iter 3+7 of the
 * 'build everything we need so we get the best possible output every turn'
 * /goal /loop). Iter 3 shipped MVP with 3 legs (Memories #4, System Viz #6,
 * NN/GNN #10). Iter 7 extends to 6 legs by adding Wiki #3, Tribal #5,
 * Engines #7 — each with cheap-probe signals against existing sidecars.
 *
 * Surfaces ONLY concerning state:
 *  - Wiki (#3): broken `[[link]]` count from .knowledge-link-audit.json
 *  - Memories (#4): memory dir mtime >7d
 *  - Tribal (#5): tribal dir mtime >30d (slow-changing corpus)
 *  - System Viz (#6): system-graph.json >12h old OR missing
 *  - Engines (#7): unwired count from PRISM-INVENTORY-LATEST.md > threshold
 *  - NN/GNN (#10): NN-EVAL.json AUROC below 0.78 deploy gate OR missing
 *
 * Knobs:
 *   PRISM_PSN_LEG_STATE_INJECT_DISABLE=1   kill switch
 *   PRISM_PSN_LEG_STATE_MIN_PROMPT_LEN=N   skip prompts shorter than N (default 15)
 *
 * Pure logic exported for tests:
 *   - shouldInject(prompt, opts)              gating predicate
 *   - legStateMemories(now, statResult)       returns null OR {leg, status, detail}
 *   - legStateSystemViz(now, statResult)      same
 *   - legStateNnGraph(now, statResult, eval)  same
 *   - formatLegState(states)                  pure markdown render
 */

import { pathToFileURL } from "node:url";
import { readSync, statSync, readFileSync, writeFileSync, mkdirSync, openSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): adopt the proven injection-dedup
// lib so the concerning-leg block isn't re-injected byte-identically every prompt
// within a session (leg health is slow-changing). Same pattern as slot-soul-inject.
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "../../scripts/lib/injection-dedup.mjs";
// 2026-05-26 (U-D1-PSN-COUNTER-WIRE, slot:alpha): shared S6 counter lib.
// Increment fires AFTER the prompt-gate passes — accurate "feature engaged" signal
// (not "hook started"). FEATURE-UTILIZATION dashboard reads counter sidecar on
// regen; PSN previously showed 0 fires despite firing per-prompt — D1 from
// DORMANT-FEATURES-PHASE5-TELEMETRY-GAP-2026-05-26.
import { incrementFeature } from "../helpers/feature-counter.mjs";
import { fileURLToPath } from "node:url";
// U-FLEET-P6-PSN-LEG-COVERAGE-DIAL: import the loader canonical leg set so the
// coverage gauge derives substrate-config coverage from source-of-truth (never
// hardcodes the leg names). Pure frozen constant — no I/O at import time.
import { LOADER_LEG_SET } from "../../scripts/lib/octopus-corpus-loader.mjs";
import { resolveObsidianMemDir } from "../../scripts/lib/obsidian-mem-dir.mjs";
// U-NN-LEG-SCHEMA-READ-FIX (2026-06-02, slot:india): the NN-EVAL.json schema is
// nested ({deferred, reason, checkpointMeta:{auroc,...}}) — NOT flat {auroc}.
// Delegate the read to nn-graph-health-inject's classifyGnn so there is ONE
// source of truth for the eval schema (the prior flat read here was always
// "not finite" → it fabricated a wrong "embeddingSource mismatch" diagnosis).
import { classifyGnn, PROMOTE_AUROC_MIN, PROMOTE_BRIER_MAX } from "./nn-graph-health-inject.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
// Injection-dedup sidecar (shared across dedup-adopting hooks) + TTL. Leg state is
// slow-changing, so 5min bounds re-emit even before the content hash changes.
const DEDUP_SIDECAR = join(ROOT, "state", "shared", "dashboards", "injection-dedup-cache.json");
const DEDUP_TTL_MS = 5 * 60_000;

const ENABLED = process.env.PRISM_PSN_LEG_STATE_INJECT_DISABLE !== "1";
const MIN_PROMPT_LEN = clampInt(process.env.PRISM_PSN_LEG_STATE_MIN_PROMPT_LEN, 15, 1, 1000);

// U-FLEET-P6-PSN-LEG-COVERAGE-DIAL (2026-05-31, slot:bravo — built per operator
// build it all; this hook is GOLF-owned, flagged for golf chat-bus awareness).
// Default-OFF knob gating the ALWAYS-ON coverage gauge. Existing callers see ZERO
// behavior change until PRISM_PSN_LEG_COVERAGE_GAUGE=1. Distinct from the
// concerning-leg block (silent-when-healthy) — the gauge ALWAYS renders (when the
// knob is on) so coverage is a live measurable dial, not a silent one.
const COVERAGE_GAUGE_ENABLED = process.env.PRISM_PSN_LEG_COVERAGE_GAUGE === "1";

// The canonical PSN taxonomy is 11 legs (see feedback_psn_definition). The
// octopus corpus loader consults a TEXT-retrievable subset; the gauge measures
// how many of the 11 the octopus actually pulls from. Named, not inlined.
export const PSN_TOTAL_LEGS = 11;

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

function clampInt(raw, def, lo, hi) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < lo || n > hi) return def;
  return n;
}

/** Same gating predicate as the CHECKLIST hook for consistency. */
export function shouldInject(prompt, opts = {}) {
  const enabled = opts.enabled !== undefined ? opts.enabled : ENABLED;
  if (!enabled) return false;
  if (typeof prompt !== "string") return false;
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return false;
  const minLen = Number.isInteger(opts.minLen) && opts.minLen > 0 ? opts.minLen : MIN_PROMPT_LEN;
  if (trimmed.length < minLen) return false;
  if (/^\/\S+\s*$/.test(trimmed)) return false;
  return true;
}

/**
 * Memories leg health. `statResult` is a {mtimeMs} (or null when missing).
 * Returns null when healthy, {leg, status, detail} when concerning.
 */
export function legStateMemories(now, statResult) {
  if (!statResult) {
    return { leg: "Memories (#4)", status: "MISSING", detail: "memory dir not found — Obsidian feed may be broken" };
  }
  const ageMs = now - statResult.mtimeMs;
  if (ageMs > 7 * MS_DAY) {
    const days = Math.round(ageMs / MS_DAY);
    return { leg: "Memories (#4)", status: "STALE", detail: `most-recent memo ${days}d old (auto-feed Stop hook may be unwired)` };
  }
  return null;
}

/**
 * System Viz leg health. `statResult` is {mtimeMs,size} for system-graph.json.
 */
export function legStateSystemViz(now, statResult) {
  if (!statResult) {
    return { leg: "System Viz (#6)", status: "MISSING", detail: "system-graph.json not found — regen via `node scripts/regen-viz.mjs`" };
  }
  const ageMs = now - statResult.mtimeMs;
  if (ageMs > 12 * MS_HOUR) {
    const hrs = Math.round(ageMs / MS_HOUR);
    return { leg: "System Viz (#6)", status: "STALE", detail: `system-graph.json ${hrs}h old (>12h gate) — regen via \`node scripts/regen-viz.mjs\`` };
  }
  return null;
}

/**
 * Wiki leg health. `auditDoc` is the parsed `.knowledge-link-audit.json`
 * (or null when missing). Surfaces broken wiki-link count above threshold.
 */
export function legStateWiki(auditDoc, opts = {}) {
  const threshold = Number.isInteger(opts.brokenThreshold) && opts.brokenThreshold > 0
    ? opts.brokenThreshold : 5000;
  if (!auditDoc) {
    return { leg: "Wiki (#3)", status: "MISSING", detail: "knowledge-link-audit sidecar not found — run `node scripts/knowledge-link-audit.mjs`" };
  }
  const broken = Number(auditDoc.broken_count ?? auditDoc.brokenCount);
  if (!Number.isFinite(broken)) return null;
  if (broken > threshold) {
    return { leg: "Wiki (#3)", status: "BROKEN-LINKS", detail: `${broken} broken \`[[wiki-link]]\` tokens (>${threshold} threshold) — surface most-broken via knowledge-link-audit sidecar` };
  }
  return null;
}

/**
 * Tribal leg health. `statResult` is {mtimeMs} for tribal corpus dir.
 * Tribal is slow-changing — only concerning when >30d stale (corpus drift).
 */
export function legStateTribal(now, statResult) {
  if (!statResult) {
    return { leg: "Tribal (#5)", status: "MISSING", detail: "tribal corpus dir not found — verify knowledge/tribal/ exists" };
  }
  const ageMs = now - statResult.mtimeMs;
  if (ageMs > 30 * MS_DAY) {
    const days = Math.round(ageMs / MS_DAY);
    return { leg: "Tribal (#5)", status: "STALE", detail: `tribal corpus ${days}d old (>30d gate) — `+
      "consider running `/distill-tribal` or `/wiki-harvest` to refresh" };
  }
  return null;
}

/**
 * Engines leg health. `inventoryMd` is raw `PRISM-INVENTORY-LATEST.md`
 * content (or null when missing). Surfaces unwired-engine count above
 * a threshold (baseline 593 unwired per 2026-05-24).
 */
export function legStateEngines(inventoryMd, opts = {}) {
  const threshold = Number.isInteger(opts.unwiredThreshold) && opts.unwiredThreshold > 0
    ? opts.unwiredThreshold : 700;  // baseline 593 + headroom; alert when drift grows
  if (typeof inventoryMd !== "string" || inventoryMd.length === 0) {
    return { leg: "Engines (#7)", status: "MISSING", detail: "PRISM-INVENTORY-LATEST.md not found — fleet inventory refresh broken" };
  }
  // Pattern: '593 unwired' or '593 NEEDS_WIRING' — accept several variants.
  const match = inventoryMd.match(/(\d{2,5})\s*(unwired|NEEDS[_-]WIRING|engines? with no dispatcher)/i);
  if (!match) return null;
  const unwired = Number(match[1]);
  if (!Number.isFinite(unwired)) return null;
  if (unwired > threshold) {
    return { leg: "Engines (#7)", status: "UNWIRED-DRIFT", detail: `${unwired} unwired engines (>${threshold} threshold) — run \`/wire-unwired\` or \`/dispatcher-coverage\`` };
  }
  return null;
}

/**
 * NN/GNN leg health. `statResult` is {mtimeMs} for NN-EVAL.json;
 * `evalDoc` is the parsed JSON content (or null when missing/corrupt).
 */
export function legStateNnGraph(now, statResult, evalDoc) {
  if (!statResult || !evalDoc) {
    return { leg: "NN/GNN (#10)", status: "MISSING", detail: "NN-EVAL.json not found — tier-5 GNN dormant" };
  }
  // Canonical schema read (single source of truth — nn-graph-health-inject's
  // classifyGnn). The real NN-EVAL.json nests AUROC under `checkpointMeta` and
  // carries `deferred`/`reason`; the prior flat `evalDoc.auroc` read was always
  // undefined → it mis-reported every healthy/deferred report as "UNGRADED ...
  // embeddingSource mismatch" (a fabricated cause). `classifyGnn` reads the real
  // shape; the top-level `auroc` fallback keeps flat/legacy docs working.
  const cls = classifyGnn(evalDoc);
  // Type-strict fallback: `Number(null) === 0` (a finite!), so a flat
  // {auroc:null} doc must NOT be read as 0 → BELOW-GATE. Require a real number.
  const topLevelAuroc = (typeof evalDoc.auroc === "number" && Number.isFinite(evalDoc.auroc))
    ? evalDoc.auroc
    : null;
  // `usingNested` = the real production schema (checkpointMeta.auroc) was read,
  // so the full classifyGnn verdict (AUROC *and* Brier gates) is trustworthy.
  // A flat/legacy {auroc:N} fallback has no Brier signal → AUROC-only gate.
  const usingNested = cls.auroc !== null;
  const auroc = usingNested ? cls.auroc : topLevelAuroc;

  // Deferred grading (e.g. insufficient reference pool) → tier-5 dormant BY
  // CHOICE. Report the REAL reason + the sub-gate AUROC that was actually
  // measured; never guess at a cause.
  if (evalDoc.deferred === true) {
    const why = cls.reason || "unknown";
    const aurocStr = auroc !== null ? `AUROC ${auroc.toFixed(3)} (sub-gate); ` : "";
    const poolStr = cls.poolSize === 0 ? " (reference pool empty)" : "";
    return { leg: "NN/GNN (#10)", status: "DEFERRED", detail: `${aurocStr}grading deferred — ${why}${poolStr}` };
  }

  // No measurable AUROC and not deferred → genuinely ungraded (no checkpointMeta).
  if (auroc === null) {
    return { leg: "NN/GNN (#10)", status: "UNGRADED", detail: "no checkpointMeta.auroc — not yet graded (tier-5 dormant)" };
  }
  if (auroc < PROMOTE_AUROC_MIN) {
    // U-NN-DEGENERACY-HOOK-SURFACE: a degenerate (constant-vote) model scores
    // AUROC ~0.5 by tie-break, not by being close. Surface DEGENERATE distinctly
    // so the fleet reads "model collapsed (rearchitect)" not "near-miss (tune)".
    if (cls.degenerate) {
      return { leg: "NN/GNN (#10)", status: "DEGENERATE", detail: `AUROC ${auroc.toFixed(3)} is a tie-break artifact (${cls.degenerateMode || "constant-vote"} collapse), NOT a near-miss — tier-5 needs rearchitecting (features/vote), not threshold tuning` };
    }
    return { leg: "NN/GNN (#10)", status: "BELOW-GATE", detail: `AUROC ${auroc.toFixed(3)} < ${PROMOTE_AUROC_MIN} deploy gate (tier-5 dormant; cascade defers to tiers 1-4)` };
  }
  // AUROC clears the gate but the deploy decision ALSO gates on Brier
  // calibration (classifyGnn.healthy = auroc-pass AND brier-pass). A checkpoint
  // that passes AUROC yet fails calibration is NOT deployable — surface it
  // rather than silently certifying a tier we can't fully measure (fail-closed).
  if (usingNested && !cls.healthy) {
    // U-GNN-SELECTIVE-DEPLOY: the full-coverage grade fails, but the tier-5 GNN
    // abstains below its confidence gate and defers to the LLM tier — so it can be
    // DEPLOY-READY-SELECTIVE at the production gate. Surface that honest state
    // instead of the now-false "(tier-5 dormant)": the tier is NOT dormant, it
    // contributes on its confident subset.
    if (cls.selectiveDeployReady && cls.selectiveOperatingPoint) {
      const op = cls.selectiveOperatingPoint;
      const covPct = Number.isFinite(op.coverage) ? `${(op.coverage * 100).toFixed(0)}%` : "?";
      const clsStr = Number.isFinite(op.classesEmitted) && Number.isFinite(op.totalClasses)
        ? `, spans ${op.classesEmitted}/${op.totalClasses} classes${op.concentrated ? " (concentrated)" : ""}`
        : "";
      return { leg: "NN/GNN (#10)", status: "SELECTIVE-DEPLOY", detail: `AUROC ${auroc.toFixed(3)} ✓; full-holdout below gate BUT deploy-ready-selective @ τ=${op.tau} (${covPct} coverage, Brier ${op.brier}${clsStr}) — tier-5 contributes above the confidence gate, defers below. Full-coverage pending ref-pool growth.` };
    }
    const brierStr = cls.brier !== null
      ? `Brier ${cls.brier.toFixed(3)} > ${PROMOTE_BRIER_MAX} calibration gate`
      : "Brier unmeasured — cannot certify";
    return { leg: "NN/GNN (#10)", status: "BELOW-GATE", detail: `AUROC ${auroc.toFixed(3)} ≥ gate but ${brierStr} (tier-5 dormant)` };
  }
  return null;
}

/* ---------- leg → owner-slot routing (Bridge#7 loop-closure) ---------- */

// PSN-LEG-HEALTH-OWNER-ROUTING (2026-06-03, slot:alpha). The
// PSN-SYNERGY-GAP-AUDIT Bridge#7 computed an `ownerSlot` per leg in the snapshot
// (scripts/psn-synergy-collect.mjs PSN_LEG_OWNER) but NOTHING consumed it — the
// per-prompt health surface every fleet chat reads was owner-blind. This closes
// the loop: each concerning leg now names the slot that owns its fix, so a
// domain-health regression (e.g. "NN/GNN [DEGENERATE]") auto-routes to its owner
// (india) instead of landing on whichever slot happens to read it.
//
// PSN_LEG_OWNER_SLOT is a LOCAL MIRROR of the collector's PSN_LEG_OWNER. A
// per-prompt UserPromptSubmit hook must stay fast, so we do NOT import the
// 850-line collector at hook runtime; instead a drift-guard test
// (psn-leg-state-inject.test.mjs) imports PSN_LEG_OWNER and asserts byte-parity
// so the mirror can never silently diverge (R8 — single source of truth,
// enforced by test rather than by a latency-costly runtime import).
export const PSN_LEG_OWNER_SLOT = Object.freeze({
  obsidian_brain: "alpha",
  memories: "alpha",
  wiki: "alpha",
  tribal: "golf",
  system_viz: "sierra",
  engines: "papa",
  algorithms: "tango",
  formulas: "tango",
  nn_gnn: "india",
  prism_os: "papa",
  prism_ai: "india",
});

// Maps the human leg LABELS this hook renders (e.g. "NN/GNN (#10)") to the
// collector leg KEYS used by PSN_LEG_OWNER_SLOT. Only the 6 legs this hook can
// surface need an entry; a test asserts every legState*() label is covered and
// every value is a real collector leg key.
export const LEG_LABEL_TO_KEY = Object.freeze({
  "Wiki (#3)": "wiki",
  "Memories (#4)": "memories",
  "Tribal (#5)": "tribal",
  "System Viz (#6)": "system_viz",
  "Engines (#7)": "engines",
  "NN/GNN (#10)": "nn_gnn",
});

/**
 * Resolve the owner slot for a rendered leg label. Pure; returns null for an
 * unknown/non-string label or a key with no owner (never throws).
 * @param {string} label leg label as emitted by a legState*() predicate.
 * @returns {string|null} owner slot name, or null.
 */
export function legOwnerForLabel(label) {
  if (typeof label !== "string") return null;
  const key = LEG_LABEL_TO_KEY[label];
  if (!key) return null;
  return PSN_LEG_OWNER_SLOT[key] || null;
}

/** Pure markdown render of the concerning-leg list. */
export function formatLegState(states) {
  const concerning = states.filter(s => s != null);
  if (concerning.length === 0) return null;
  const lines = [
    "## 🩺 PSN-LEG-STATE — concerning legs surfaced",
    "_Auto-injected per-prompt health check. Healthy legs are silent — only those needing attention appear here._",
    "",
  ];
  for (const s of concerning) {
    // Bridge#7 loop-closure: name the slot that owns the fix so the regression
    // routes to its domain owner, not to whoever happens to read this surface.
    const owner = legOwnerForLabel(s.leg);
    const ownerTag = owner ? ` → owner: \`${owner}\`` : "";
    lines.push(`- **${s.leg}** [${s.status}] — ${s.detail}${ownerTag}`);
  }
  lines.push("");
  lines.push("_See `[[feedback_psn_definition]]` for the canonical 11-leg taxonomy. `→ owner` = the slot that owns the fix (PSN-SYNERGY-GAP-AUDIT Bridge#7). Disable: `PRISM_PSN_LEG_STATE_INJECT_DISABLE=1`._");
  return lines.join("\n");
}

/* ---------- coverage gauge (U-FLEET-P6-PSN-LEG-COVERAGE-DIAL) ---------- */

/**
 * Extract the distinct PSN-leg names the octopus ACTUALLY consulted on its most
 * recent run, from a parsed ledger entry`s psnExemplars.legs[].name.
 *
 * Ledger record shape (octopus-record-lib.mjs / octopus-runs.jsonl):
 *   { ..., psnExemplars: { legs: [ { name, hits: [{text,score}] }, ... ] } }
 * Older/curator-shaped exemplars may instead be a flat object keyed by leg
 * ({ tribal:[...], wiki:[...] }) — we accept BOTH shapes (R8: read the real
 * data, do not assume one schema). A leg only counts when it has >=1 hit, so
 * an empty leg array does not inflate coverage.
 *
 * @param {object|null} entry parsed ledger record (or null when none).
 * @returns {string[]} distinct leg names with at least one hit (may be empty).
 */
export function exemplarLegNamesFromEntry(entry) {
  if (!entry || typeof entry !== "object") return [];
  const ex = entry.psnExemplars;
  if (!ex || typeof ex !== "object") return [];
  const names = new Set();
  // Shape A: { legs: [ { name, hits:[...] } ] } (canonical persisted shape).
  if (Array.isArray(ex.legs)) {
    for (const leg of ex.legs) {
      if (!leg || typeof leg !== "object") continue;
      const nm = typeof leg.name === "string" ? leg.name.trim() : "";
      const hits = Array.isArray(leg.hits) ? leg.hits.length : 0;
      if (nm.length > 0 && hits > 0) names.add(nm);
    }
    return [...names];
  }
  // Shape B: flat object keyed by leg name -> array of hits/strings.
  for (const [nm, v] of Object.entries(ex)) {
    if (typeof nm !== "string" || nm.trim().length === 0) continue;
    if (Array.isArray(v) && v.length > 0) names.add(nm.trim());
  }
  return [...names];
}

/**
 * Compute the PSN-leg coverage gauge: how many of the 11 PSN legs the octopus
 * corpus loader consults. Two signals, ledger-first:
 *   - source `ledger`        : the most-recent run`s real consulted-leg set
 *     (distinct psnExemplars leg names with >=1 hit). The empirical dial.
 *   - source `substrate-config`: fallback to the loader`s configured leg set
 *     (LOADER_LEG_SET) when no ledger run is available. The capability ceiling.
 *
 * Pure: every input injected. Never throws; clamps `consulted` to [0,total].
 *
 * @param {object} args
 * @param {string[]} args.loaderLegSet       loader-configured legs (LOADER_LEG_SET).
 * @param {string[]} [args.ledgerLegNames]   distinct legs from the latest ledger run.
 * @param {number}  [args.totalLegs]         PSN taxonomy size (default PSN_TOTAL_LEGS).
 * @returns {{ consulted:number, total:number, legs:string[], source:string }}
 */
export function psnLegCoverageGauge({ loaderLegSet, ledgerLegNames, totalLegs } = {}) {
  const total = Number.isInteger(totalLegs) && totalLegs > 0 ? totalLegs : PSN_TOTAL_LEGS;
  const configured = Array.isArray(loaderLegSet)
    ? loaderLegSet.filter((x) => typeof x === "string" && x.trim().length > 0)
    : [];
  const fromLedger = Array.isArray(ledgerLegNames)
    ? ledgerLegNames.filter((x) => typeof x === "string" && x.trim().length > 0)
    : [];
  // Prefer the empirical ledger signal when it has >=1 real consulted leg.
  // Otherwise fall back to the loader`s substrate config (capability ceiling).
  const useLedger = fromLedger.length > 0;
  const legs = [...new Set(useLedger ? fromLedger : configured)];
  let consulted = legs.length;
  if (consulted < 0) consulted = 0;
  if (consulted > total) consulted = total; // never report >100% of taxonomy
  return { consulted, total, legs, source: useLedger ? "ledger" : "substrate-config" };
}

/**
 * Pure markdown render of the ALWAYS-ON coverage gauge line. Unlike
 * formatLegState (silent when healthy), this returns a non-null line whenever
 * the gauge is computable — a live measurable dial every prompt.
 * @param {{consulted:number,total:number,legs:string[],source:string}} gauge
 * @returns {string|null} markdown line, or null on a malformed gauge.
 */
export function formatCoverageGauge(gauge) {
  if (!gauge || typeof gauge !== "object") return null;
  const { consulted, total, legs, source } = gauge;
  if (!Number.isFinite(consulted) || !Number.isFinite(total) || total <= 0) return null;
  const legList = Array.isArray(legs) && legs.length > 0 ? legs.join(", ") : "(none)";
  const srcLabel = source === "ledger" ? "last octopus run" : "substrate config";
  return [
    `## 🐙 PSN-LEG-COVERAGE — octopus consults ${consulted}/${total} PSN legs`,
    `_Source: ${srcLabel}. Text-retrievable legs: ${legList}. ` +
      "The other PSN legs (NN/GNN, PRISM-AI, PRISM-OS, Algorithms, Formulas) have no text corpus. " +
      "Gauge: `PRISM_PSN_LEG_COVERAGE_GAUGE=1`._",
  ].join("\n");
}

/* ---------- I/O probes (safely-fail; never throw) ---------- */

function safeStat(path) {
  try { return statSync(path); } catch { return null; }
}

function safeReadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

/**
 * Read the MOST-RECENT octopus run's consulted-leg names from the ledger.
 * Bounded tail read (last LEDGER_TAIL_BYTES) so a multi-MB ledger never costs
 * a full-file parse on every prompt. Walks lines from the end, returns the leg
 * names from the first parseable octopus-consensus record found. Fail-soft:
 * missing/unreadable/empty/corrupt ledger -> [] (gauge falls back to config).
 * @param {string} ledgerPath absolute path to octopus-runs.jsonl
 * @returns {string[]} distinct consulted-leg names (may be empty)
 */
const LEDGER_TAIL_BYTES = 65536; // read at most the last 64 KB of the ledger
function latestLedgerExemplarLegNames(ledgerPath) {
  let raw;
  try {
    const st = statSync(ledgerPath);
    const size = Number(st.size) || 0;
    if (size <= 0) return [];
    if (size <= LEDGER_TAIL_BYTES) {
      raw = readFileSync(ledgerPath, "utf8");
    } else {
      // Read only the trailing window — the last record lives at the end.
      const fd = openSync(ledgerPath, "r");
      try {
        const buf = Buffer.alloc(LEDGER_TAIL_BYTES);
        const n = readSync(fd, buf, 0, LEDGER_TAIL_BYTES, size - LEDGER_TAIL_BYTES);
        raw = buf.slice(0, n).toString("utf8");
      } finally { closeSync(fd); }
    }
  } catch { return []; }
  if (typeof raw !== "string" || raw.length === 0) return [];
  const lines = raw.split("\n");
  // Walk from the end; the first complete+parseable line wins (a partial
  // leading line from the tail-window split is silently skipped by JSON.parse).
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const names = exemplarLegNamesFromEntry(entry);
    if (Array.isArray(names) && names.length > 0) return names;
    // A parseable record with no exemplars still terminates the walk — it IS
    // the latest run; an older run's exemplars must not masquerade as current.
    if (entry && entry.kind === "octopus-consensus") return [];
  }
  return [];
}

function readStdinSync() {
  let data = "";
  try {
    const buf = Buffer.alloc(65536);
    let n;
    while ((n = readSync(0, buf, 0, buf.length)) > 0) data += buf.slice(0, n).toString("utf8");
  } catch { /* EOF / closed */ }
  return data;
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }) + "\n");
}

function main() {
  if (!ENABLED) process.exit(0);
  let payload;
  try { payload = JSON.parse(readStdinSync() || "{}"); }
  catch { process.exit(0); }
  const prompt = String(payload.prompt ?? "");
  if (!shouldInject(prompt)) process.exit(0);

  // U-D1-PSN-COUNTER-WIRE: count this fire. Slot is best-effort; payload may
  // carry sessionId but slot resolution is left to dashboard regen via
  // chat-slots.json cross-ref. Telemetry never blocks — incrementFeature
  // returns null on disable/error.
  try { incrementFeature("PSN", { slot: payload?.slot ?? null }); } catch { /* never blocks */ }

  const now = Date.now();
  // Probe the cheap signals. All safely-fail.
  const memPath = resolveObsidianMemDir(); // homedir-derived, single-sourced (was hardcoded wompu path)
  const memStat = safeStat(memPath);

  const graphPath = join(ROOT, "state", "shared", "system-viz", "system-graph.json");
  const graphStat = safeStat(graphPath);

  const nnEvalPath = join(ROOT, "state", "shared", "nn-graph", "NN-EVAL.json");
  const nnStat = safeStat(nnEvalPath);
  const nnEval = nnStat ? safeReadJson(nnEvalPath) : null;

  // Iter-7 extensions: Wiki, Tribal, Engines
  const wikiAuditPath = join(ROOT, "state", "shared", ".knowledge-link-audit.json");
  const wikiAudit = safeReadJson(wikiAuditPath);

  const tribalPath = join(ROOT, "knowledge", "tribal");
  const tribalStat = safeStat(tribalPath);

  const inventoryPath = join(ROOT, "PRISM-INVENTORY-LATEST.md");
  let inventoryMd = null;
  try { inventoryMd = readFileSync(inventoryPath, "utf8"); } catch { /* missing */ }

  const states = [
    legStateWiki(wikiAudit),
    legStateMemories(now, memStat),
    legStateTribal(now, tribalStat),
    legStateSystemViz(now, graphStat),
    legStateEngines(inventoryMd),
    legStateNnGraph(now, nnStat, nnEval),
  ];

  const md = formatLegState(states);

  // U-FLEET-P6-PSN-LEG-COVERAGE-DIAL: the ALWAYS-ON coverage gauge. Knob-gated
  // (default OFF). When on, it renders EVERY prompt — even an all-healthy fleet —
  // so per-leg consultation coverage is a live measurable dial. Fail-soft: no
  // ledger -> substrate-config coverage from LOADER_LEG_SET; never crashes.
  let gaugeMd = null;
  if (COVERAGE_GAUGE_ENABLED) {
    try {
      const ledgerPath = join(ROOT, "state", "shared", "octopus-runs.jsonl");
      const ledgerLegNames = latestLedgerExemplarLegNames(ledgerPath);
      const gauge = psnLegCoverageGauge({ loaderLegSet: LOADER_LEG_SET, ledgerLegNames });
      gaugeMd = formatCoverageGauge(gauge);
    } catch { /* gauge fail-soft — never blocks the concerning-leg block */ }
  }

  // Compose: gauge (always-on when enabled) first, concerning legs second.
  const parts = [];
  if (gaugeMd) parts.push(gaugeMd);
  if (md) parts.push(md);
  if (parts.length === 0) process.exit(0);
  const fullBlock = parts.join("\n\n");

  // HIGHVALUE-DISCOVERY #1: injection-dedup. The concerning-leg block is stable
  // across prompts within a session (leg health is slow-changing) — emit it on
  // first-emit / 5min-TTL / content-change, else a 1-line marker. Content-keyed,
  // so a real leg-health change re-emits fresh. Fail-soft: sidecar error /
  // dedup-disabled / missing session_id → emit the full block (zero regression).
  const sid8 = String(payload.session_id || "").slice(0, 8);
  let additionalContext = fullBlock;
  if (process.env.PRISM_INJECTION_DEDUP_DISABLE !== "1" && sid8) {
    const hookTag = `psn-leg-state:${sid8}`;
    const contentHash = hashBlock(fullBlock);
    const dnow = Date.now();
    let cache;
    try { cache = JSON.parse(readFileSync(DEDUP_SIDECAR, "utf8")); } catch { cache = {}; }
    cache = pruneTag(cache, hookTag, dnow, DEDUP_TTL_MS); // shared-cache-safe: prune only this tag (5min TTL)
    const decision = shouldEmit(cache, hookTag, contentHash, dnow, DEDUP_TTL_MS);
    if (decision.emit) {
      if (contentHash) {
        try {
          const newCache = recordEmit(cache, hookTag, contentHash, dnow);
          mkdirSync(dirname(DEDUP_SIDECAR), { recursive: true });
          writeFileSync(DEDUP_SIDECAR, JSON.stringify(newCache), "utf8");
        } catch { /* sidecar write fail-soft — emit still proceeds */ }
      }
    } else {
      additionalContext = formatDedupedMarker(hookTag);
    }
  }
  emit(additionalContext);
  process.exit(0);
}

const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try { main(); }
  catch (err) {
    process.stderr.write(`[psn-leg-state-inject] ${err?.message || err}\n`);
    process.exit(0);
  }
}
