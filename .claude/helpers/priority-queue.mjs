#!/usr/bin/env node
/**
 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
 *
 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
 *
 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
 * scripts/generate-priority-queue-features.mjs so visualization + pickup share
 * one classifier (no drift).
 *
 * Pickup order:
 *   1. backend-dev units (priority 0)
 *   2. bridge units (priority 1)
 *   3. app-functionality (priority 2)
 *   tiebreaker: milestone asc, unit_id asc, title asc.
 *
 * Pure functions are exported for testability; CLI: `node priority-queue.mjs
 * --pick [--slot <name>] [--exclude <id,id>]` prints the next unit.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyUnit } from "../../scripts/generate-priority-queue-features.mjs";
import { buildShippedIdsUnion, readCompletedMilestones, extractUnitIdsFromUnit } from "../../scripts/lib/shipped-units-source-of-truth.mjs";
import { slotDomain, classifyUnit as classifyUnitDomain } from "../../scripts/lib/domain-classifier.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");

const CONSOLIDATED_PATH = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
const CHAT_SLOTS_PATH = path.join(ROOT, "state/shared/chat-slots.json");

function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/** Collect every remaining unit from the consolidated inventory (matches the generator). */
export function collectUnits(inventory) {
  const out = [];
  for (const u of (Array.isArray(inventory?.pending_units) ? inventory.pending_units : [])) {
    out.push({ ...u, _source: "pending" });
  }
  for (const u of (Array.isArray(inventory?.unconsolidated_prose) ? inventory.unconsolidated_prose : [])) {
    out.push({ ...u, _source: "unconsolidated-prose" });
  }
  const bridge = inventory && inventory.bridge_units ? inventory.bridge_units : {};
  for (const u of (Array.isArray(bridge.wiring) ? bridge.wiring : [])) {
    out.push({ unit_id: u.id, milestone: "BRIDGE-WIRING", title: u.title, source: "bridge", suggested_domain: u.domain, _source: "bridge-wiring", intent: u.intent });
  }
  for (const u of (Array.isArray(bridge.deep_integration) ? bridge.deep_integration : [])) {
    out.push({ unit_id: u.id, milestone: "BRIDGE-DEEP", title: u.title, source: "bridge", _source: "bridge-deep", intent: u.intent });
  }
  return out;
}

/**
 * Build the set of unit-ids already shipped.
 *
 * Two modes:
 *   - `buildShippedIds()` (no arg): unions git-inferred shipped + envelope-
 *     status-complete from disk. This is the production picker path — closes
 *     the 2026-05-17 bug where 6 envelope-complete CLEANUP-MS0 units leaked
 *     back into pickup because MILESTONE_PROGRESS git-inference missed them.
 *   - `buildShippedIds(progress)` (in-memory): legacy hermetic-test path. Reads
 *     only the passed-in MILESTONE_PROGRESS-shaped object; does NOT touch disk
 *     and does NOT add envelope-status-complete. Used by existing unit tests
 *     that want to assert specific counts without depending on live envelopes.
 *
 * R12 (fail-loud): we honor the arg if provided rather than silently dropping
 * it. Callers explicitly opt into the legacy in-memory-only mode by passing.
 */
export function buildShippedIds(progress) {
  if (progress !== undefined) {
    // Legacy in-memory mode for hermetic tests. Accepts both array-shaped
    // (live MILESTONE_PROGRESS) and object-keyed (older snapshots) milestones.
    const out = new Set();
    const mp = progress && progress.milestones
      ? (Array.isArray(progress.milestones) ? progress.milestones : Object.values(progress.milestones))
      : [];
    for (const ms of mp) for (const u of (Array.isArray(ms?.units) ? ms.units : [])) {
      if (u && u.shipped === true && u.id) out.add(String(u.id).trim().toUpperCase());
    }
    return out;
  }
  return buildShippedIdsUnion();
}

/** Build the set of unit-ids currently claimed by other active slots. */
export function buildClaimedIds(slots) {
  const out = new Set();
  const bag = slots && slots.slots && typeof slots.slots === "object" ? slots.slots : {};
  for (const state of Object.values(bag)) {
    if (state && typeof state === "object") {
      // chat-slots state.topic / state.activity may carry a unit reference; we
      // don't reliably resolve unit_ids from slot topics, so this is a soft
      // filter — strict claim filtering happens at commit time via the
      // commit-ownership-guard hook. Reserved for future when slots carry unit_id.
      const t = String(state.topic || "").toUpperCase();
      const m = t.match(/\b(U-[A-Z0-9-]+)\b/);
      if (m) out.add(m[1]);
    }
  }
  return out;
}

/**
 * Pure: return units eligible for pickup, sorted by priority then milestone/id/title.
 *
 * `excludeIds` — set of unit-ids to omit (already-shipped, claimed elsewhere).
 * `completedMilestones` — optional set of milestone-ids whose envelopes are
 *   complete-ish; a unit whose `milestone` matches is omitted regardless of its
 *   unit-id. This closes the leak where ROADMAP-CONSOLIDATED.json names a unit
 *   `H1` while the (complete) HOOK-SYNERGY-MS0 envelope names that same unit
 *   `U-HOOK-AUDIT` — the two id namespaces never match, so the unit-id-keyed
 *   `excludeIds` alone cannot filter a 100%-complete milestone's units.
 *   Omitted / empty → milestone filter is a no-op (byte-identical legacy
 *   behavior; existing two-arg callers are unaffected).
 */
export function rankUnits(units, excludeIds, completedMilestones) {
  const exc = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
  const doneMs = completedMilestones instanceof Set ? completedMilestones : new Set(completedMilestones || []);
  const norm = (s) => String(s || "").trim().toUpperCase();
  const eligible = units.filter((u) => {
    if (!u || u.looks_completed) return false;
    const id = norm(u.unit_id);
    if (id && exc.has(id)) return false;
    // U-PQ-EMBEDDED-UID (2026-05-20): also check any U-ID embedded in the
    // candidate's title — closes the leak where ROADMAP-CONSOLIDATED carries
    // a phase-letter unit_id (`A2`) while the canonical U-ID lives in the
    // title (`U-REREAD-SIGNAL-FINISH — ...`) and the shipped union only knows
    // the latter.
    const embedded = extractUnitIdsFromUnit({ id: u.unit_id, title: u.title, name: u.name, description: u.description });
    for (const eid of embedded) {
      if (eid !== id && exc.has(eid)) return false;
    }
    if (doneMs.size) {
      const ms = norm(u.milestone);
      if (ms && doneMs.has(ms)) return false;
    }
    return true;
  });
  const decorated = eligible.map((u, i) => ({ u, c: classifyUnit(u), i }));
  decorated.sort((a, b) =>
    (a.c.priority - b.c.priority) ||
    String(a.u.milestone || "").localeCompare(String(b.u.milestone || "")) ||
    String(a.u.unit_id || "").localeCompare(String(b.u.unit_id || "")) ||
    String(a.u.title || "").localeCompare(String(b.u.title || "")) ||
    (a.i - b.i));
  return decorated.map((d) => ({ ...d.u, _category: d.c.category, _priority: d.c.priority, _color: d.c.color }));
}

// RGS-PLANNING-LOOP-BRIDGE-MS0/U4 (2026-06-11, slot:tango): eval-fed re-rank.
// Reads the LIVE per-unit-type eval means accumulated by the loop (loop-state
// evalsByType -- NOT the inert ATCS omega_score, which the mainstream /loop never
// initializes) and applies them as a BOUNDED within-priority-tier tiebreaker.
const LOOP_STATE_DIR = path.join(ROOT, "state", "shared", "loop-state");

/** Merge evalsByType across all active loop-state files into one {type:{n,mean}}
 *  map via n-weighted means. Fail-soft: missing dir / corrupt file -> skipped.
 *  Injectable `dir` for tests. */
export function readAccumulatedScores({ dir = LOOP_STATE_DIR } = {}) {
  const merged = {};
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.startsWith("loop-") && f.endsWith(".json")); }
  catch { return merged; }
  for (const f of files) {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      const ebt = s && s.evalsByType;
      if (!ebt || typeof ebt !== "object") continue;
      for (const [k, v] of Object.entries(ebt)) {
        if (!v || !Number.isFinite(v.n) || !Number.isFinite(v.mean) || v.n <= 0) continue;
        const cur = merged[k] || { n: 0, mean: 0 };
        const n = cur.n + v.n;
        merged[k] = { n, mean: (cur.mean * cur.n + v.mean * v.n) / n };
      }
    } catch { /* skip */ }
  }
  return merged;
}

/**
 * Within-priority-tier eval tiebreaker. PURE + STABLE. Given units already sorted
 * by rankUnits (priority dominant) + the merged eval means, re-orders ONLY within a
 * priority tier so a healthier category sorts ahead of a failing one; NEVER crosses
 * a tier boundary (priority stays the dominant key). Empty scores -> identity. A
 * category with no score is treated as healthy (mean 1) so absence never depresses.
 * On a homogeneous tier (every unit the same category -- the common case) the mean
 * term is equal and the stable index preserves rankUnits order exactly: a documented
 * no-op (U-SPEC-V2 section 3 degenerate case). The real escape from a persistently
 * failing unit is consecutiveFails -> replan -> stop (U5), not re-rank.
 */
export function applyEvalRerank(units, evalsByType) {
  if (!Array.isArray(units) || units.length < 2) return Array.isArray(units) ? units.slice() : [];
  if (!evalsByType || typeof evalsByType !== "object" || Object.keys(evalsByType).length === 0) return units.slice();
  const meanFor = (u) => {
    const cat = (u && u._category) || (u ? classifyUnit(u).category : "");
    const acc = evalsByType[cat];
    return acc && Number.isFinite(acc.mean) ? acc.mean : 1;
  };
  const prioFor = (u) => (u && Number.isFinite(u._priority)) ? u._priority : (u ? classifyUnit(u).priority : 99);
  return units
    .map((u, i) => ({ u, i, p: prioFor(u), m: meanFor(u) }))
    .sort((a, b) => (a.p - b.p) || (b.m - a.m) || (a.i - b.i))
    .map((x) => x.u);
}

// ─── U-KP2P-03: envelope-backed slot ownership + prose-alias dedupe ──────────
//
// ROADMAP-CONSOLIDATED.json strips the per-unit `slot` field that milestone
// envelopes carry on each units[] entry, and it imports prose-roadmap units
// under aliased ids (MS-TRAIN-DEEP appears in prose as U-TRAIN-P2P-NN while the
// envelope's real ids are U-MS-TRAIN-DEEP-NN). Both defects' ROOT CAUSE is
// upstream in consolidate-roadmaps.mjs; until that is fixed they are corrected
// here at the picker boundary so `--pick --slot <X>` is clean:
//   - slot ownership: re-resolve each unit's owning slot from the milestone
//     envelope's units[] entry; exclude units explicitly owned by a peer slot.
//   - prose-alias dedupe: drop unconsolidated_prose units whose milestone has a
//     real envelope (the envelope-canonical units are already in the pool).

const MILESTONES_DIR = path.join(ROOT, "mcp-server/data/milestones");

const normUp = (s) => String(s || "").trim().toUpperCase();
const normSlot = (s) => String(s || "").trim().toLowerCase();
// U-DAG-PICKER: canonical unit-id matcher. ONLY U-<...> ids are reliable for
// dependency edges -- phase-letter ids (P0-U06, A2, H1) are reused across
// milestones (collision) and absent from the shipped union (false-block).
const CANON_UID = /^U-[A-Z0-9._-]+$/;

/** Flatten an envelope's units (flat units[] + nested phases[].units). */
function envelopeUnits(env) {
  const out = [];
  if (Array.isArray(env?.units)) out.push(...env.units);
  if (Array.isArray(env?.phases)) {
    for (const ph of env.phases) if (Array.isArray(ph?.units)) out.push(...ph.units);
  }
  return out;
}

/**
 * Pure: build the envelope index from milestone-envelope records.
 *   unitSlot         — Map<UID-upper, slot-lower> for every units[] entry that
 *                      carries a slot field.
 *   milestoneUnitIds — Map<milestone-upper, Set<UID-upper>> for every milestone
 *                      whose envelope has >=1 unit. A milestone absent here has
 *                      no envelope (or an empty one) and is NOT used to flag
 *                      prose aliases — cannot confirm without a real unit set.
 * `records` — array of envelope objects ({ id, units?, phases? }).
 */
export function buildEnvelopeIndex(records) {
  const unitSlot = new Map();
  const milestoneUnitIds = new Map();
  // U-DAG-PICKER: per-unit dependency edges, Map<UID-upper, dep-UID-upper[]>.
  const unitDeps = new Map();
  for (const env of (Array.isArray(records) ? records : [])) {
    if (!env || typeof env !== "object") continue;
    const ms = normUp(env.id);
    const units = envelopeUnits(env);
    if (!ms || units.length === 0) continue;
    const idSet = milestoneUnitIds.get(ms) || new Set();
    for (const u of units) {
      const uid = normUp(u && (u.id || u.unit_id));
      if (!uid) continue;
      idSet.add(uid);
      const slot = u && u.slot ? normSlot(u.slot) : "";
      if (slot) unitSlot.set(uid, slot);
      // U-DAG-PICKER: capture depends_on (canonical) / dependencies (alt) ONLY for
      // canonical U-<...> ids -- both the unit key AND the dep edges. Phase-letter
      // ids (P0-U06, A2, H1) are (a) reused across milestones -> last-writer-wins
      // collision, and (b) absent from the shipped union -> false-block forever
      // (the same id-namespace hazard this file already documents for excludeIds,
      // lines ~110-135). So they are excluded: a phase-letter unit gets NO edge and
      // is never blocked; a canonical unit's phase-letter deps are dropped (we only
      // block on deps we can reliably verify against the canonical shipped union).
      // First-wins on the unique canonical key guards any residual collision.
      if (CANON_UID.test(uid) && !unitDeps.has(uid)) {
        const rawDeps = u && (u.depends_on || u.dependencies);
        if (Array.isArray(rawDeps) && rawDeps.length) {
          const deps = rawDeps.map(normUp).filter((d) => d && CANON_UID.test(d));
          if (deps.length) unitDeps.set(uid, deps);
        }
      }
    }
    if (idSet.size) milestoneUnitIds.set(ms, idSet);
  }
  return { unitSlot, milestoneUnitIds, unitDeps };
}

let _envIndexCache;
/** Load + memoize the envelope index from mcp-server/data/milestones/*.json. */
export function loadEnvelopeIndex() {
  if (_envIndexCache) return _envIndexCache;
  const records = [];
  let files = [];
  try { files = fs.readdirSync(MILESTONES_DIR).filter((f) => f.endsWith(".json")); }
  catch { files = []; }
  for (const f of files) {
    const j = readJsonSafe(path.join(MILESTONES_DIR, f));
    if (j) records.push(j);
  }
  _envIndexCache = buildEnvelopeIndex(records);
  return _envIndexCache;
}

/**
 * Pure: resolve a unit's owning slot (lowercase) or null if unassigned.
 * Prefers the unit's own `slot` field (forward-compat for when the consolidator
 * carries it); falls back to the milestone envelope's units[] entry.
 */
export function resolveUnitSlot(unit, envIndex) {
  if (unit && unit.slot) return normSlot(unit.slot);
  const uid = normUp(unit && unit.unit_id);
  if (!uid || !envIndex || !(envIndex.unitSlot instanceof Map)) return null;
  return envIndex.unitSlot.get(uid) || null;
}

/**
 * Pure: true if `unit` is an unconsolidated-prose alias of a unit a real
 * milestone envelope already owns — its milestone has an envelope (with units)
 * but the unit's id is not one of that envelope's real unit ids. Such a unit is
 * a fabricated prose alias (U-TRAIN-P2P-NN); the picker must not emit it — the
 * envelope-canonical unit is already in the pool via pending_units.
 */
export function isProseAliasOfEnvelope(unit, envIndex) {
  if (!unit || unit._source !== "unconsolidated-prose") return false;
  if (!envIndex || !(envIndex.milestoneUnitIds instanceof Map)) return false;
  const ms = normUp(unit.milestone);
  if (!ms || !envIndex.milestoneUnitIds.has(ms)) return false;
  const uid = normUp(unit.unit_id);
  return !envIndex.milestoneUnitIds.get(ms).has(uid);
}

// U-DAG-PICKER (2026-06-12): dependency-aware pickup. A unit that depends_on
// other unit-ids must not be handed out before those deps ship -- building a
// consumer atop an unproven dependency violates R13. Deps come from the envelope
// index (envIndex.unitDeps). A unit with no deps, or all deps in the shipped
// set, is READY; otherwise BLOCKED. Pure.
export function depsSatisfied(unit, envIndex, shippedSet) {
  if (!unit) return true;
  if (!envIndex || !(envIndex.unitDeps instanceof Map)) return true;
  const uid = normUp(unit.unit_id);
  if (!uid) return true;
  const deps = envIndex.unitDeps.get(uid);
  if (!Array.isArray(deps) || deps.length === 0) return true;
  const shipped = shippedSet instanceof Set ? shippedSet : new Set();
  return deps.every((d) => shipped.has(d));
}

// Partition ranked units into {ready, blocked} by dependency satisfaction,
// preserving relative order within each group. Pure.
export function partitionByDeps(units, envIndex, shippedSet) {
  const ready = [], blocked = [];
  for (const u of (Array.isArray(units) ? units : [])) {
    (depsSatisfied(u, envIndex, shippedSet) ? ready : blocked).push(u);
  }
  return { ready, blocked };
}

/**
 * Convenience: load the consolidated inventory + progress + slots and return
 * the top-N ranked pickup candidates. Returns [] if inventory missing (caller
 * handles — typically advisory hooks).
 *
 * When `slot` is a known NATO slot (alpha..mike, golf), the candidate list is
 * filtered to that slot's owning domain (echo=cam, alpha=mill, …) so a chat
 * gets work in its lane — this is the JULIETT-12CHAT-ALLOCATION contract.
 * R12 fallback: if the slot's domain has NO eligible unit, returns the global
 * ranking instead of an empty list, with `_crossDomain:true` stamped on each
 * pick so the caller can surface "no in-domain work, here's cross-domain".
 * An unknown slot (or no slot) yields the global ranking unchanged.
 */
export function pickNextUnit({ slot, excludeIds = [], topN = 1, scores } = {}) {
  const inv = readJsonSafe(CONSOLIDATED_PATH);
  if (!inv) return [];
  const slots = readJsonSafe(CHAT_SLOTS_PATH);
  const shipped = buildShippedIds();
  const claimed = buildClaimedIds(slots);
  const exc = new Set([...shipped, ...claimed, ...excludeIds.map((x) => String(x).trim().toUpperCase())]);
  const completedMilestones = readCompletedMilestones();
  let ranked = rankUnits(collectUnits(inv), exc, completedMilestones);
  // U4: eval-fed within-tier re-rank from live loop-state means (fail-soft; a
  // caller may inject `scores` for determinism, else read the live loops).
  ranked = applyEvalRerank(ranked, scores || readAccumulatedScores());

  // U-KP2P-03 ID-drift fix: drop unconsolidated_prose alias units whose
  // milestone has a real envelope. Applies to EVERY pick (global + slot-scoped)
  // so the picker only ever emits envelope-canonical unit ids — never a
  // fabricated U-TRAIN-P2P-NN alias of an envelope's U-MS-TRAIN-DEEP-NN.
  const envIndex = loadEnvelopeIndex();
  ranked = ranked.filter((u) => !isProseAliasOfEnvelope(u, envIndex));

  // U-DAG-PICKER (2026-06-12): dependency-aware ordering. Push units whose
  // depends_on are not all shipped BEHIND dependency-ready units, so the picker
  // hands out buildable work first (R13). Blocked units are NOT dropped (never
  // strand work -- R12); they surface only when no ready work remains, flagged
  // _depBlocked. Revert: PRISM_PQ_DAG_DISABLE=1.
  if (process.env.PRISM_PQ_DAG_DISABLE !== "1") {
    const { ready, blocked } = partitionByDeps(ranked, envIndex, shipped);
    ranked = ready.concat(blocked.map((u) => ({ ...u, _depBlocked: true })));
  }

  const n = Math.max(1, topN | 0);
  const domain = slot ? slotDomain(slot) : null;
  if (!domain) return ranked.slice(0, n);                 // unknown/no slot → global

  // U-KP2P-03 slot-ownership filter: a unit explicitly owned by a DIFFERENT
  // slot (its milestone-envelope units[] entry carries slot:<other>) must never
  // surface in this slot's pick — not in-domain, not in the cross-domain
  // fallback. Units with no resolvable slot (unassigned) or a matching slot
  // pass through. This is distinct from the domain filter below: domain is
  // derived from unit text, slot is an explicit envelope assignment — a
  // print2prog-DOMAIN unit (title carries a pipeline STAGE like PRINT_OCR) can
  // be explicitly owned by slot:charlie, and only the slot field disambiguates.
  const wantSlot = normSlot(slot);
  ranked = ranked.filter((u) => {
    const owner = resolveUnitSlot(u, envIndex);
    return !owner || owner === wantSlot;
  });

  const inDomain = ranked.filter((u) => classifyUnitDomain(u).domain === domain);
  if (inDomain.length > 0) {
    return inDomain.slice(0, n).map((u) => ({ ...u, _slotDomain: domain }));
  }
  // R12: no in-domain work — surface global candidates flagged cross-domain
  // (still slot-owned + alias-deduped) rather than returning nothing — a chat
  // with an empty lane still needs a task. If `ranked` is itself empty (every
  // unit shipped/claimed/complete/peer-owned — realistically unreachable since
  // almost no unit carries an explicit slot), this returns [] and the CLI
  // reports "no eligible unit found" + exit 1 — the truthful fail-loud answer.
  return ranked.slice(0, n).map((u) => ({ ...u, _slotDomain: domain, _crossDomain: true }));
}

/** High-level summary for dashboards / Stop hook advisory text. */
export function summarize() {
  const inv = readJsonSafe(CONSOLIDATED_PATH);
  if (!inv) return { ok: false, error: "inventory missing" };
  const units = collectUnits(inv);
  const decorated = units.map((u) => ({ ...u, _c: classifyUnit(u) }));
  const byCategory = decorated.reduce((o, d) => { o[d._c.category] = (o[d._c.category] || 0) + 1; return o; }, {});
  return { ok: true, total: units.length, byCategory };
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { pick: false, slot: null, exclude: [], topN: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pick") out.pick = true;
    else if (a === "--slot") out.slot = argv[++i];
    else if (a === "--exclude") out.exclude = String(argv[++i] || "").split(",").map((x) => x.trim()).filter(Boolean);
    else if (a === "--top") out.topN = Number(argv[++i]) || 1;
    else if (a === "--summary") out.summary = true;
    else if (a === "--json") out.json = true;
  }
  return out;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.summary) {
    const s = summarize();
    console.log(args.json ? JSON.stringify(s) : `total=${s.total} byCategory=${JSON.stringify(s.byCategory || {})}`);
    return s.ok ? 0 : 1;
  }
  if (args.pick) {
    const picks = pickNextUnit({ slot: args.slot, excludeIds: args.exclude, topN: args.topN });
    if (args.json) { console.log(JSON.stringify(picks, null, 2)); return picks.length ? 0 : 1; }
    if (!picks.length) { console.log("(no eligible unit found — inventory missing or all shipped/claimed)"); return 1; }
    // R12 fail-loud: if the slot's lane is empty and we fell back to cross-
    // domain work, say so on stderr AND mark the line — a chat must never
    // silently work off-lane.
    if (picks.some((p) => p._crossDomain)) {
      const d = picks.find((p) => p._slotDomain)?._slotDomain || "?";
      console.error(`⚠ CROSS-DOMAIN: slot '${args.slot}' has no eligible '${d}' work — falling back to global ranking`);
    }
    if (picks.some((p) => p._depBlocked)) {
      console.error("[DEP-BLOCKED] picked unit(s) have unshipped dependencies (no dependency-ready work in lane) -- build the deps first or override with PRISM_PQ_DAG_DISABLE=1");
    }
    for (const p of picks) {
      const xd = p._crossDomain ? `  ⚠CROSS-DOMAIN(${p._slotDomain})` : (p._slotDomain ? `  [${p._slotDomain}]` : "");
      console.log(`${p.unit_id || "(no id)"} [${p._category} p${p._priority}] ${p.milestone || ""} — ${p.title || ""}${xd}`);
    }
    return 0;
  }
  console.log("usage: node priority-queue.mjs --pick [--slot <name>] [--top N] [--exclude id,id] [--json] | --summary [--json]");
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
