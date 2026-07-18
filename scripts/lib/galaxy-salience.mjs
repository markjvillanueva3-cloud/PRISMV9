#!/usr/bin/env node
// scripts/lib/galaxy-salience.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SALIENCE (alpha, 2026-05-31).
//
// Salience scoring for galaxy context-cards. The design spec defines salience as
// `recency × access-frequency × outcome-impact`. Building it correctly meant verifying the ACTUAL DATA
// behind each factor (R12 — verify the data, not the schema). That verification (recon workflow
// wf_1c718934 + direct byte inspection) produced a more correct TWO-SURFACE design than a naive
// 3-factor product:
//
//   1. PER-FACT salience bonus → re-ranks facts WITHIN one card (the "what the card keeps" decision).
//      Only factors that DISCRIMINATE between facts of the SAME galaxy belong here:
//        • recency        — per-fact date (YYYY-MM-DD), exponential decay. REAL + discriminating.
//        • outcome-impact — per-fact structural markers (commit-SHA / shipped|PASS|wired|merged /
//                           N/N tests / N%). REAL proxy + discriminating.
//      Plugs into galaxy-context-card.extractGalaxyCard via opts.salienceScorer; that scorer defaults
//      to plain scoreLine, so absent ⇒ BYTE-IDENTICAL to the shipped U-GCF-CARD behavior (its 18 tests).
//
//   2. PER-GALAXY salience score → ranks one galaxy vs ANOTHER (for U-GCF-ROLLUP / cross-galaxy order).
//      access-frequency lives HERE, not in (1): the access ledger keys by galaxy, NOT by fact, so it is
//      CONSTANT across a card's facts — adding it per-fact is a mathematical no-op on intra-card rank.
//      It only discriminates BETWEEN galaxies. Honest placement, not the spec's literal product.
//
// DATA-SOURCE HONESTY (verified 2026-05-31 — every candidate source's real bytes inspected):
//   • recency        — REAL (galaxy-context-card already extracts dates via DATE_RE).
//   • outcome-impact — REAL structural proxy.
//   • access-frequency — REAL + LIVE. Source `state/shared/outcome-bus.jsonl` (the spec's "india bus":
//     per-row {slot, domain, success} appended by outcome-bus-auto-tap.mjs) holds ~12.9K rows across 19
//     galaxies (cad 1985, token-optimization 1704, hermes-zulu 1193, …). The `domain` field IS the
//     galaxy key; three legacy domain values that diverge from the engine-dir galaxy names are
//     normalized via DOMAIN_ALIAS (database→database-expansion, fleet-reaper→fleet-hygiene,
//     hermes-zebra→hermes-zulu). slot→galaxy is the fallback when a row carries no domain.
//     Rejected as the default (verified, NOT defaulted): feature-util-counts.json (perDomainTotals {} —
//     0 domain entries despite 7426 increments — schema present, DATA empty) and ai-intelligence-stats
//     by_domain (25997 reqs but only ~3% / 2-of-34 galaxies join via a lossy topic→galaxy map → would
//     bias the ranking toward wedm+speed-feed). The ai-intel reader is an explicit OPT-IN
//     (accessSource:"ai-intel") for callers who specifically want that weighting.
//
// DESIGN (mirrors galaxy-context-card.mjs + mcp-reconnect-action.mjs for R11):
//   pure-core scorers + injected deps + fail-soft. NO import back from galaxy-context-card (the base
//   scorer is INJECTED via ctx.baseScorer) — avoids an ESM import cycle. NO Ollama dependency.
//
// Knob: PRISM_GCF_SALIENCE=0 disables the buildAllCards integration (see galaxy-context-card.mjs);
//       this lib's pure fns are always callable.

import fs from "node:fs";
import { SLOT_GALAXY_MAP } from "./slot-galaxy-map.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
// The spec's "india bus" — galaxy-keyed tool-outcome ledger (per-row {slot, domain, success}).
export const DEFAULT_ACCESS_PATH = `${PRISM_ROOT}/state/shared/outcome-bus.jsonl`;
// Opt-in alternative (NOT default — only ~3% of rows join a galaxy; defaulting it biases the ranking).
export const AI_INTEL_PATH = `${PRISM_ROOT}/mcp-server/data/state/ai-intelligence-stats.json`;
// Lossy topic→galaxy map for the opt-in ai-intel source (only the unambiguous keys).
export const AI_INTEL_TOPIC_GALAXY = Object.freeze({
  wedm_wire_selection: "wedm", wedm_pulse_optimization: "wedm", edm_general: "wedm", speed_feed: "speed-feed",
});
// outcome-bus `domain` values that pre-date / diverge from the engine-dir galaxy names. Normalize so the
// access count lands on the SAME key the card galaxies use (engines/<g>/ dir name). Verified against the
// live 19-domain outcome-bus 2026-05-31; extend as the bus vocabulary evolves.
export const DOMAIN_ALIAS = Object.freeze({
  database: "database-expansion",
  "fleet-reaper": "fleet-hygiene",
  "hermes-zebra": "hermes-zulu",
});

// ── tunable weights (named — no magic numbers) ───────────────────────────────
export const HALF_LIFE_DAYS = 30;   // a fact's recency bonus halves every 30 days
export const RECENCY_MAX = 4;       // peak recency bonus (≈ the top header weight, so a fresh fact
                                    //   can rival a master-brain-section line)
export const SHA_BONUS = 3;         // a commit-SHA ref = a concrete shipped outcome (strongest impact)
export const SHIP_WORD_BONUS = 2;   // shipped|complete|PASS|wired|merged|green
export const METRIC_BONUS = 1;      // N/N tests, N%, "N tests" — quantified outcome
export const IMPACT_MAX = 4;        // cap so one ultra-decorated line can't dominate
export const ACCESS_MAX = 3;        // peak galaxy-level access bonus (galaxy-granular only)
const MS_PER_DAY = 86400000;

// ── per-fact: recency ─────────────────────────────────────────────────────────
const DATE_G = /\b(20\d\d)-(\d\d)-(\d\d)\b/g;

// Newest YYYY-MM-DD in a line as epoch-ms, or null. UTC noon to dodge TZ/DST edge flips. Pure.
export function parseNewestDateMs(line) {
  if (typeof line !== "string" || !line) return null;
  let newest = null;
  DATE_G.lastIndex = 0;
  let m;
  while ((m = DATE_G.exec(line)) !== null) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue; // reject 2026-13-99 etc.
    const ms = Date.UTC(y, mo - 1, d, 12);
    if (!Number.isFinite(ms)) continue;
    // Date.UTC clamps overflow (day 31 in a 30-day month rolls into next month) — reject those so a
    // typo'd date can't masquerade as a real, newer one.
    const back = new Date(ms);
    if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) continue;
    if (newest === null || ms > newest) newest = ms;
  }
  return newest;
}

// Exponential-decay recency bonus ∈ [0, maxBonus]. No/!valid date → 0. Future date (clock skew) →
// maxBonus (treated as freshest, never > maxBonus). Pure.
export function recencyBonus(line, nowMs, opts = {}) {
  const halfLife = Number.isFinite(opts.halfLifeDays) ? opts.halfLifeDays : HALF_LIFE_DAYS;
  const maxBonus = Number.isFinite(opts.maxBonus) ? opts.maxBonus : RECENCY_MAX;
  if (!Number.isFinite(nowMs) || !(halfLife > 0)) return 0;
  const dateMs = parseNewestDateMs(line);
  if (dateMs === null) return 0;
  const ageDays = (nowMs - dateMs) / MS_PER_DAY;
  if (ageDays <= 0) return maxBonus;                  // today or (skew) future → freshest
  return maxBonus * Math.pow(0.5, ageDays / halfLife);
}

// ── per-fact: outcome-impact (structural proxy) ───────────────────────────────
// git-style lowercase hex (a shipped-commit ref). Require ≥1 DIGIT so an all-alpha word that happens to
// be valid hex ("deedface", "effaced") can't false-fire as a SHA — real commit shorthands are ~random
// hex and virtually always contain a digit (losing ~16^-7 ≈ 0.08% of genuine SHAs, a fair trade).
const SHA_RE = /\b(?=[0-9a-f]{7,40}\b)[0-9a-f]*\d[0-9a-f]*\b/;
const SHIP_RE = /\b(shipped|complete|completed|pass|passing|wired|merged|green)\b/i;
const METRIC_RE = /(\b\d+\s*\/\s*\d+\b|\b\d+%|\b\d+\s+tests?\b)/i;

// Outcome-impact bonus ∈ [0, maxImpact]. "This fact cites a shipped/verified outcome." Pure.
// Deliberately DISTINCT signals from scoreLine's path/wikilink markers (those are STRUCTURAL; these
// are OUTCOME) — so this layers on rather than double-counting the same evidence.
export function impactBonus(line, opts = {}) {
  const maxImpact = Number.isFinite(opts.maxImpact) ? opts.maxImpact : IMPACT_MAX;
  if (typeof line !== "string" || !line) return 0;
  let s = 0;
  if (SHA_RE.test(line)) s += SHA_BONUS;
  if (SHIP_RE.test(line)) s += SHIP_WORD_BONUS;
  if (METRIC_RE.test(line)) s += METRIC_BONUS;
  return Math.min(s, maxImpact);
}

// Combined PER-FACT salience bonus (additive, ≥0). access-freq intentionally NOT here (galaxy-constant).
export function salienceBonus(line, ctx = {}) {
  const nowMs = Number.isFinite(ctx.nowMs) ? ctx.nowMs : (typeof ctx.now === "function" ? ctx.now() : Date.now());
  return recencyBonus(line, nowMs, ctx) + impactBonus(line, ctx);
}

// Build a (line, headerWeight) scorer compatible with scoreLine's signature, layering the per-fact
// salience bonus on top of an INJECTED base scorer. extractGalaxyCard passes baseScorer:scoreLine →
// final = scoreLine(line,hw) + salienceBonus. When this scorer is NOT passed to extractGalaxyCard, the
// card uses scoreLine alone (byte-identical). No import cycle: the base is injected, never imported from
// galaxy-context-card. Lines scoreLine rejects (-Infinity) stay rejected — the bonus is never added.
export function makeSalienceScorer(ctx = {}) {
  const base = typeof ctx.baseScorer === "function" ? ctx.baseScorer : (_l, hw) => (Number.isFinite(hw) ? hw : 1);
  const nowMs = Number.isFinite(ctx.nowMs) ? ctx.nowMs : (typeof ctx.now === "function" ? ctx.now() : Date.now());
  const fixed = { ...ctx, nowMs };
  return (line, headerWeight) => {
    const b = base(line, headerWeight);
    if (!Number.isFinite(b)) return b;               // preserve -Infinity reject sentinel
    return b + salienceBonus(line, fixed);
  };
}

// ── per-galaxy: access-frequency (galaxy-granular, LIVE off the outcome-bus) ───

// Normalize an outcome-bus domain token to the engine-dir galaxy name. Pure.
export function normalizeDomainToGalaxy(domain, galaxySet, alias = DOMAIN_ALIAS) {
  if (typeof domain !== "string" || !domain) return null;
  const aliased = Object.prototype.hasOwnProperty.call(alias, domain) ? alias[domain] : domain;
  return galaxySet.has(aliased) ? aliased : null;
}

// Aggregate the outcome-bus JSONL into per-galaxy access counts. Each row {slot, domain, success}:
// count by normalized `domain` (galaxy-keyed), else by slot→galaxy. Fail-soft.
// Returns { map:{galaxy:count}, rows, withGalaxy, populated, source }. populated=false ⇒ factor inert.
export function loadAccessMap(opts = {}) {
  const source = opts.accessSource || "outcome-bus";
  if (source === "ai-intel") return loadAiIntelAccessMap(opts); // explicit opt-in (~3% of rows join)
  const accessPath = opts.accessPath || DEFAULT_ACCESS_PATH;
  const slotGalaxy = opts.slotGalaxyMap || SLOT_GALAXY_MAP;
  const galaxySet = opts.galaxySet instanceof Set ? opts.galaxySet : new Set(Object.values(slotGalaxy));
  const alias = opts.domainAlias || DOMAIN_ALIAS;
  const readImpl = opts.readImpl || ((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } });
  const raw = readImpl(accessPath);
  const map = {};
  let rows = 0, withGalaxy = 0;
  if (raw == null) return { map, rows, withGalaxy, populated: false, source };
  for (const ln of String(raw).split(/\r?\n/)) {
    const t = ln.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { continue; }
    rows++;
    let g = normalizeDomainToGalaxy(o.domain, galaxySet, alias);
    if (!g && typeof o.slot === "string" && Object.prototype.hasOwnProperty.call(slotGalaxy, o.slot)) g = slotGalaxy[o.slot];
    if (!g) continue;
    withGalaxy++;
    map[g] = (map[g] || 0) + 1;
  }
  return { map, rows, withGalaxy, populated: withGalaxy > 0, source };
}

// Opt-in: ai-intelligence-stats.json by_domain via the lossy topic→galaxy map. Only ~2/34 galaxies join
// → biased; NEVER the default. Fail-soft. Same return shape as loadAccessMap.
export function loadAiIntelAccessMap(opts = {}) {
  const accessPath = opts.accessPath || AI_INTEL_PATH;
  const topicMap = opts.topicGalaxyMap || AI_INTEL_TOPIC_GALAXY;
  const readImpl = opts.readImpl || ((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } });
  const raw = readImpl(accessPath);
  const map = {};
  let rows = 0, withGalaxy = 0;
  if (raw == null) return { map, rows, withGalaxy, populated: false, source: "ai-intel" };
  let j;
  try { j = JSON.parse(raw); } catch { return { map, rows, withGalaxy, populated: false, source: "ai-intel" }; }
  const byDomain = j && j.by_domain && typeof j.by_domain === "object" ? j.by_domain : {};
  for (const [topic, count] of Object.entries(byDomain)) {
    rows++;
    const g = topicMap[topic];
    if (!g || !Number.isFinite(count) || count <= 0) continue;
    withGalaxy++;
    map[g] = (map[g] || 0) + count;
  }
  return { map, rows, withGalaxy, populated: withGalaxy > 0, source: "ai-intel" };
}

// Galaxy-level access bonus ∈ [0, ACCESS_MAX], log-normalized against the busiest galaxy. Pure.
// accessInfo from loadAccessMap. Not populated / unknown galaxy → 0 (degrade-to-neutral).
export function accessBonus(galaxy, accessInfo, opts = {}) {
  const maxBonus = Number.isFinite(opts.maxBonus) ? opts.maxBonus : ACCESS_MAX;
  if (!accessInfo || !accessInfo.populated || !accessInfo.map) return 0;
  const count = accessInfo.map[galaxy];
  if (!Number.isFinite(count) || count <= 0) return 0;
  let peak = 0;
  for (const v of Object.values(accessInfo.map)) if (Number.isFinite(v) && v > peak) peak = v;
  if (peak <= 0) return 0;
  // log-normalize so a 1000-count galaxy doesn't dwarf a 10-count one linearly
  return maxBonus * (Math.log1p(count) / Math.log1p(peak));
}

// Per-galaxy salience score = freshest-fact recency + outcome density + access. For ROLLUP / x-galaxy
// ordering. `facts` = the card's fact lines (strings). Pure given accessInfo + nowMs. Returns the score
// plus a factor breakdown AND factorsActive honesty flags.
export function computeGalaxySalience(galaxy, facts, ctx = {}) {
  const nowMs = Number.isFinite(ctx.nowMs) ? ctx.nowMs : (typeof ctx.now === "function" ? ctx.now() : Date.now());
  const list = Array.isArray(facts) ? facts.filter((f) => typeof f === "string") : [];
  let freshest = 0, impactSum = 0, dated = 0;
  for (const f of list) {
    const r = recencyBonus(f, nowMs, ctx);
    if (parseNewestDateMs(f) !== null) dated++;
    if (r > freshest) freshest = r;
    impactSum += impactBonus(f, ctx);
  }
  const acc = accessBonus(galaxy, ctx.accessInfo, ctx);
  const impactAvg = list.length ? impactSum / list.length : 0;
  const score = freshest + impactAvg + acc;
  return {
    galaxy,
    score,
    factors: { recency: freshest, impactAvg, access: acc, factCount: list.length, datedFacts: dated },
    factorsActive: {
      recency: dated > 0,
      impact: impactSum > 0,
      access: !!(ctx.accessInfo && ctx.accessInfo.populated && acc > 0),
    },
  };
}

// Honesty summary: which factors are LIVE given this ctx (for CLI / telemetry / R12 surfacing).
export function factorsActiveSummary(ctx = {}) {
  const accessInfo = ctx.accessInfo || (ctx.loadAccess ? ctx.loadAccess() : null);
  return {
    recency: true,                                   // always available (pure, per-fact dates)
    impact: true,                                    // always available (pure, structural)
    access: !!(accessInfo && accessInfo.populated),  // LIVE when the outcome-bus carries galaxy rows
    accessReason: accessInfo
      ? (accessInfo.populated
          ? `LIVE (${accessInfo.withGalaxy}/${accessInfo.rows} rows join a galaxy, source=${accessInfo.source})`
          : `dormant (${accessInfo.rows} rows, 0 join a galaxy, source=${accessInfo.source})`)
      : "no access source loaded",
  };
}
