#!/usr/bin/env node
// scripts/lib/shipped-units-source-of-truth.mjs
//
// Canonical set of unit-ids that should be SKIPPED by any /pick-unit picker.
//
// Two sources, unioned (a unit is "shipped" if EITHER source agrees):
//   (a) MILESTONE_PROGRESS.json — git-inferred (commit subject matches
//       [MILESTONE]/U-ID), authoritative for "git actually reflects this".
//   (b) mcp-server/data/milestones/<MS>.json — envelope status, authoritative
//       for "operator-marked complete" (catches units bundled in setup
//       commits or with non-canonical tags that the git-inference missed).
//
// Background: 2026-05-17 echo /loop iter-1 surfaced two real picker bugs —
//   - slot-queue.mjs treats MILESTONE_PROGRESS m.shipped as an array, but it's
//     a NUMBER (the count). Result: the shipped set is empty fleet-wide and
//     every unit appears unshipped.
//   - priority-queue.mjs reads m.units[].shipped correctly but misses units
//     marked complete in the envelope while git-inference says false. Live
//     drift count for CLEANUP-MS0: 6 units flagged complete-in-envelope but
//     shipped=false in MILESTONE_PROGRESS.
//
// Both consumers now route through this helper to share one source of truth.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const DEFAULT_PROGRESS_PATH = path.join(REPO_ROOT, "state/shared/MILESTONE_PROGRESS.json");
const DEFAULT_ENVELOPES_DIR = path.join(REPO_ROOT, "mcp-server/data/milestones");

const COMPLETE_STATUSES = new Set(["complete", "completed", "shipped", "superseded", "done"]);

// Reviewer A P1 (milestone-id collision): the recursive walk used to include
// ANY {id,status:complete-ish}, including milestone-level pairs like
// {id:"SYS-MS0", status:"complete"}. Pickup candidates are always unit-ids
// (U-*) — restricting the set to that pattern eliminates ambiguity without
// dropping any real coverage. Milestones (MS-*, *-MS#) and findings (F1, B9)
// are intentionally excluded — they aren't pickup candidates.
//
// 2026-05-20 (slot:mike, U-PQ-EMBEDDED-UID): OBSIDIAN-INTELLIGENCE-MS3 carries
// phase-letter ids (`A1, A2, B1, ...`) with the canonical U-ID embedded in the
// title (e.g. id:"A2", title:"U-REREAD-SIGNAL-FINISH — ..."). The U-only id
// gate skipped these silently, so envelope-complete units leaked back into
// pickup (observed: 23/25 OBSIDIAN-INTELLIGENCE-MS3 units re-served despite
// status:completed). TITLE_UID_RE + extractUnitIdsFromUnit recover the
// embedded U-ID across both ends of the matcher.
const UNIT_ID_RE = /^U-/i;
const TITLE_UID_RE = /\bU-[A-Z][A-Z0-9-]*\b/i;

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function norm(id) { return String(id || "").trim().toUpperCase(); }

/**
 * U-PQ-EMBEDDED-UID (2026-05-20, slot:mike): extract every canonical unit id
 * from a unit-shaped node. Recovers both the `id` field (when it matches the
 * U-* shape) AND any U-ID embedded in `title`, `name`, or `description` —
 * the latter is how OBSIDIAN-INTELLIGENCE-MS3 phase-letter units (`A2` /
 * `B1`) carry their canonical id. Returns a (possibly empty) Set of
 * normalized ids.
 */
export function extractUnitIdsFromUnit(node) {
  const out = new Set();
  if (!node || typeof node !== "object") return out;
  if (typeof node.id === "string" && UNIT_ID_RE.test(node.id.trim())) {
    out.add(norm(node.id));
  }
  for (const k of ["title", "name", "description"]) {
    const v = node[k];
    if (typeof v !== "string") continue;
    const m = v.match(TITLE_UID_RE);
    if (m) out.add(norm(m[0]));
  }
  return out;
}

function statMtimeSafe(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

// Max-mtime across every *.json file in the envelopes dir (cheap fingerprint
// for cache invalidation; ~5ms for 734 files on Windows).
function maxMtimeInDir(dir) {
  let m = 0;
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isFile() || !e.name.endsWith(".json")) continue;
      const t = statMtimeSafe(path.join(dir, e.name));
      if (t > m) m = t;
    }
  } catch { /* missing dir → 0; caller handles */ }
  return m;
}

/**
 * Source (a): git-inferred shipped from MILESTONE_PROGRESS.json.
 *
 * Same U-ID gate as envelope scan — pickup candidates are always U-*; filtering
 * out non-unit shapes (milestone-letters, findings, free-form ids) ensures the
 * shipped Set never contains anything that could collide with a real candidate.
 */
export function readShippedFromProgress(progressPath = DEFAULT_PROGRESS_PATH) {
  const out = new Set();
  const j = readJsonSafe(progressPath);
  if (!j) return out;
  const milestones = Array.isArray(j.milestones) ? j.milestones : [];
  for (const ms of milestones) {
    const units = Array.isArray(ms?.units) ? ms.units : [];
    for (const u of units) {
      if (u && u.shipped === true && typeof u.id === "string" && UNIT_ID_RE.test(u.id.trim())) {
        out.add(norm(u.id));
      }
    }
  }
  return out;
}

/**
 * Recursive scan of a single envelope: collect every {id, status:complete-ish}.
 *
 * Restricts to unit-id pattern (UNIT_ID_RE) to avoid milestone-id collision
 * with pickup candidates. Cycles are guarded via WeakSet. `_history` snapshots
 * (frozen, not current state) are skipped.
 */
export function collectCompletedFromEnvelope(envelopeJson) {
  const out = new Set();
  const seen = new WeakSet();
  function walk(node) {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (typeof node.status === "string") {
      const s = node.status.toLowerCase();
      if (COMPLETE_STATUSES.has(s)) {
        // U-PQ-EMBEDDED-UID: recover ids both from the `id` field (U-shaped)
        // and from canonical U-IDs embedded in `title` / `name` / `description`
        // — covers OBSIDIAN-INTELLIGENCE-MS3-style phase-letter ids whose
        // canonical id lives in the title.
        for (const id of extractUnitIdsFromUnit(node)) out.add(id);
      }
    }
    if (Array.isArray(node)) {
      for (const v of node) walk(v);
    } else {
      for (const [k, v] of Object.entries(node)) {
        if (k === "_history") continue;          // historical snapshots, not current state
        if (typeof v === "object" && v) walk(v);
      }
    }
  }
  walk(envelopeJson);
  return out;
}

const REPO_ROOT_DEFAULT = path.resolve(__dirname, "../..");

// Operational limits for the git-subject scan (named per repo convention —
// these are scan-window/timeout knobs, not physics/business constants).
const BRIDGE_LOG_MAX_COMMITS = 800;       // how far back to scan commit subjects
const BRIDGE_LOG_TIMEOUT_MS = 15000;      // git log hard timeout
const HEAD_SHA_TIMEOUT_MS = 5000;         // git rev-parse HEAD hard timeout
const GIT_LOG_MAX_BUFFER = 8 * 1024 * 1024; // 8MB stdout cap (hostile/huge log → throw → empty)

// Bridge-unit ids (U-BRIDGE-*) live in ROADMAP-CONSOLIDATED.bridge_units, NOT
// in any milestone envelope, so sources (a)+(b) structurally can't see them
// shipped — the picker re-serves a completed bridge forever (observed 2026-05-17:
// U-BRIDGE-SFC-ESPRIT re-picked after it shipped in commit 76dc1b53cb). This
// third source recovers bridge completion from commit subjects.
//
// HEURISTIC CAVEAT (accepted tradeoff): any commit whose SUBJECT contains a
// U-BRIDGE-* token marks that bridge shipped — including a `git revert` of a
// bridge commit ("Revert ... U-BRIDGE-X ..."). Risk asymmetry favors this: a
// false-positive merely keeps one bridge OUT of pickup (operator re-serves
// manually — the picker is advisory), whereas the false-negative is the
// observed infinite-re-serve bug. We scan `--format=%s` (subject only, never
// body) so planning/queue text in commit bodies cannot trip it. If a revert
// ever DOES bury a still-pending bridge, re-open it via the envelope/roadmap,
// not by widening this regex.
const BRIDGE_ID_RE = /\bU-BRIDGE-[A-Z0-9]+(?:-[A-Z0-9]+)*(?:\+[A-Z0-9]+(?:-[A-Z0-9]+)*)*/gi;

/**
 * Expand a (possibly compound) bridge token into all the ids it closes.
 *
 * `U-BRIDGE-SFC-ESPRIT+SOLIDCAM` → `U-BRIDGE-SFC-ESPRIT` AND
 * `U-BRIDGE-SFC-SOLIDCAM` (the `+SUFFIX` form means "this commit also closed
 * the sibling whose last `-`-segment is SUFFIX"). A plain token yields itself.
 */
export function expandBridgeToken(token) {
  const out = new Set();
  if (typeof token !== "string") return out;   // tokens come from a regex match; non-strings are invalid
  const t = norm(token);
  if (!t) return out;
  const plusIdx = t.indexOf("+");
  if (plusIdx < 0) { out.add(t); return out; }
  const lead = t.slice(0, plusIdx);          // U-BRIDGE-SFC-ESPRIT
  out.add(lead);
  const prefix = lead.slice(0, lead.lastIndexOf("-") + 1); // U-BRIDGE-SFC-
  for (const suf of t.slice(plusIdx + 1).split("+")) {
    if (suf) out.add(prefix + suf);          // U-BRIDGE-SFC-SOLIDCAM
  }
  return out;
}

/** Source (c): bridge-unit completion recovered from git commit subjects. */
export function readShippedFromBridgeCommits({ repoRoot = REPO_ROOT_DEFAULT, maxCommits = BRIDGE_LOG_MAX_COMMITS } = {}) {
  const out = new Set();
  let log = "";
  try {
    log = execFileSync(
      "git",
      ["-C", repoRoot, "log", "--format=%s", "-n", String(maxCommits)],
      { encoding: "utf8", timeout: BRIDGE_LOG_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"], maxBuffer: GIT_LOG_MAX_BUFFER },
    );
  } catch {
    return out;                              // git absent / timeout / detached → empty, never throw
  }
  for (const line of log.split("\n")) {
    const m = line.match(BRIDGE_ID_RE);
    if (!m) continue;
    for (const tok of m) for (const id of expandBridgeToken(tok)) out.add(id);
  }
  return out;
}

function headShaSafe(repoRoot = REPO_ROOT_DEFAULT) {
  try {
    return execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      encoding: "utf8", timeout: HEAD_SHA_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch { return ""; }
}

/** Source (b): envelope-status-complete across every milestone envelope. */
export function readShippedFromEnvelopes(envelopesDir = DEFAULT_ENVELOPES_DIR) {
  const out = new Set();
  let entries;
  try { entries = fs.readdirSync(envelopesDir, { withFileTypes: true }); }
  catch { return out; }                          // dir missing → empty contribution, never throw
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith(".json")) continue;
    const j = readJsonSafe(path.join(envelopesDir, ent.name));
    if (!j) continue;                            // malformed → skip silently (advisory tool)
    for (const id of collectCompletedFromEnvelope(j)) out.add(id);
  }
  return out;
}

/**
 * Pure scan: collect normalized milestone-ids of complete-ish envelopes in
 * `dir`. Extracted from readCompletedMilestones so the cache wrapper stays
 * thin. Never throws — missing dir / malformed envelope / no status → skip.
 */
function scanCompletedMilestones(dir) {
  const out = new Set();
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }                          // dir missing → empty contribution, never throw
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith(".json")) continue;
    const j = readJsonSafe(path.join(dir, ent.name));
    if (!j || typeof j.status !== "string") continue;   // malformed / no top-level status → skip
    if (!COMPLETE_STATUSES.has(j.status.trim().toLowerCase())) continue;
    // Filename stem — the canonical milestone identifier in this directory and
    // the form ROADMAP-CONSOLIDATED's `milestone` field carries.
    out.add(norm(ent.name.slice(0, -".json".length)));
    // Inner id field(s) — only strings; Set dedups against the filename stem.
    for (const k of ["milestone_id", "id", "milestone"]) {
      if (typeof j[k] === "string" && j[k].trim()) out.add(norm(j[k]));
    }
  }
  return out;
}

// In-process mtime cache for readCompletedMilestones default-path calls.
// Mirrors _unionCache below — the envelopes dir is the same directory
// readShippedFromEnvelopes scans, and the file's caching doctrine applies
// equally here. Custom-dir calls bypass it for hermetic-test isolation.
let _completedMilestonesCache = null;            // { envMtime, set }

/**
 * Source (d): the set of MILESTONE-ids whose envelope top-level status is
 * complete-ish (complete | completed | shipped | superseded | done).
 *
 * This is a DIFFERENT axis from sources (a)-(c), which are all unit-id-keyed.
 * It exists because the picker's inventory (ROADMAP-CONSOLIDATED.json) and the
 * milestone envelopes use DIFFERENT unit-id namespaces for the same unit —
 * ROADMAP-CONSOLIDATED calls a HOOK-SYNERGY-MS0 unit `H1`, while the envelope
 * (status:complete) calls that same unit `U-HOOK-AUDIT`. The unit-id shipped
 * set built by (a)-(c) cannot bridge those two namespaces, so a 100%-complete
 * milestone's units leak straight back into pickup. The milestone NAME, by
 * contrast, is stable across both surfaces — so a milestone-name-keyed filter
 * closes the leak regardless of unit-id namespace.
 *
 * Keys added per complete envelope:
 *   - the filename stem (`HOOK-SYNERGY-MS0.json` → `HOOK-SYNERGY-MS0`) — this
 *     is the form ROADMAP-CONSOLIDATED's `milestone` field uses;
 *   - the envelope's inner `milestone_id` / `id` / `milestone` field, if a
 *     non-empty string — belt-and-suspenders for filename≠id drift.
 *
 * IDs are normalized (trim + uppercase); compare a candidate's milestone the
 * same way before set-membership lookup.
 *
 * CAVEAT — milestone-id collision: unlike sources (a)-(c), milestone ids have
 * no canonical `U-`/`MS-` shape, so there is no shape gate here. If a LIVE
 * unit's `milestone` field exactly equals a *complete* milestone's filename
 * stem or inner id, that unit is excluded. Milestone names are distinctive in
 * practice (HOOK-SYNERGY-MS0, CLEANUP-MS0, …), so this tail risk is accepted —
 * and the failure direction is benign for an advisory picker (a wrongly-hidden
 * unit is operator-recoverable; a wrongly-surfaced one causes the dup work
 * this filter exists to stop).
 *
 * NOTE — this trusts the envelope's TOP-LEVEL `status` as operator-marked
 * truth: a milestone marked complete excludes ALL its units even if some
 * carry no per-unit completion status. That is intentional (envelope status
 * is the operator's authority) but means a prematurely-marked milestone hides
 * its still-open units from pickup until the status is corrected.
 *
 * Default-path calls are mtime-cached (mirrors buildShippedIdsUnion); passing
 * a custom `envelopesDir` bypasses the cache for hermetic-test isolation.
 *
 * Never throws: missing dir / malformed envelope / no `status` → empty
 * contribution (advisory tool — degrade quietly, never block pickup).
 *
 * @param {string} [envelopesDir] — milestone envelopes directory
 * @returns {Set<string>} normalized milestone-ids of complete-ish milestones
 */
export function readCompletedMilestones(envelopesDir = DEFAULT_ENVELOPES_DIR) {
  if (envelopesDir !== DEFAULT_ENVELOPES_DIR) {
    return scanCompletedMilestones(envelopesDir);   // custom dir → no cache (test isolation)
  }
  const envMtime = maxMtimeInDir(DEFAULT_ENVELOPES_DIR);
  if (_completedMilestonesCache && _completedMilestonesCache.envMtime === envMtime) {
    return new Set(_completedMilestonesCache.set);  // copy — caller can't mutate the cache
  }
  const out = scanCompletedMilestones(DEFAULT_ENVELOPES_DIR);
  _completedMilestonesCache = { envMtime, set: new Set(out) };
  return out;
}

// In-process mtime cache for the default-paths call. Reduces ~100ms JSON-parse
// cost to ~5ms stat cost when nothing changed. Helps WITHIN-process repeated
// calls (e.g. a CLI invocation that asks for `--describe` then `--check`, or a
// long-lived Monitor loop calling pickup multiple times). Does NOT help Stop-
// hook firings — each Stop hook spawns a fresh node process and pays the cold
// cost. Cross-process amortization would require a disk-cache; that's a P2
// follow-up if Stop-hook latency becomes load-bearing.
//
// Custom-path calls (`{progressPath, envelopesDir}`) bypass cache so hermetic
// tests never see cross-test bleed.
let _unionCache = null;          // { progMtime, envMtime, set }

/**
 * Union of (a) git-inferred shipped + (b) envelope-status-complete (U-* only).
 *
 * IDs are normalized (trim + uppercase); compare your candidate IDs the same
 * way before set-membership lookup. When no args are passed and the underlying
 * sources haven't changed since the last call (mtime fingerprint), returns a
 * cached copy.
 */
export function buildShippedIdsUnion({ progressPath, envelopesDir } = {}) {
  const useCache = progressPath == null && envelopesDir == null;
  const pp = progressPath || DEFAULT_PROGRESS_PATH;
  const ed = envelopesDir || DEFAULT_ENVELOPES_DIR;

  if (useCache) {
    const progMtime = statMtimeSafe(pp);
    const envMtime = maxMtimeInDir(ed);
    const headSha = headShaSafe();             // bridge-commit source invalidates on new commit
    if (_unionCache
        && _unionCache.progMtime === progMtime
        && _unionCache.envMtime === envMtime
        && _unionCache.headSha === headSha) {
      return new Set(_unionCache.set);          // copy so caller can't mutate cache
    }
    const out = new Set(readShippedFromProgress(pp));
    for (const id of readShippedFromEnvelopes(ed)) out.add(id);
    for (const id of readShippedFromBridgeCommits()) out.add(id);
    _unionCache = { progMtime, envMtime, headSha, set: new Set(out) };
    return out;
  }

  // Custom-path (hermetic-test) calls: progress+envelope only. The bridge
  // source reads the real repo git log unconditionally, which would pollute
  // hermetic exact-count assertions — it is a production-only signal, mirrored
  // to the cache boundary (same reasoning as the mtime cache being default-
  // path-only). Tests cover readShippedFromBridgeCommits directly instead.
  const out = new Set(readShippedFromProgress(pp));
  for (const id of readShippedFromEnvelopes(ed)) out.add(id);
  return out;
}

/** Invalidate the mtime caches (test helper; never needed in production). */
export function _resetShippedUnionCache() { _unionCache = null; _completedMilestonesCache = null; }

/**
 * Peek at the in-process cache (test helper). Returns null when cache empty.
 *
 * @internal Test-only — production code should NEVER read internal cache state.
 */
export function _peekShippedUnionCache() {
  if (_unionCache == null) return null;
  return {
    progMtime: _unionCache.progMtime,
    envMtime: _unionCache.envMtime,
    headSha: _unionCache.headSha,
    size: _unionCache.set.size,
  };
}

/** Diagnostic: counts per source + union (operator-readable). */
export function describeShippedSources({ progressPath, envelopesDir } = {}) {
  // Bridge source is production-only (reads real repo git); skip it in
  // hermetic mode (custom paths) so exact-count assertions stay stable —
  // same boundary as buildShippedIdsUnion.
  const hermetic = progressPath != null || envelopesDir != null;
  const fromProgress = readShippedFromProgress(progressPath);
  const fromEnvelopes = readShippedFromEnvelopes(envelopesDir);
  const fromBridge = hermetic ? new Set() : readShippedFromBridgeCommits();
  const union = new Set(fromProgress);
  for (const id of fromEnvelopes) union.add(id);
  for (const id of fromBridge) union.add(id);
  let envelopeOnly = 0, progressOnly = 0, both = 0, bridgeOnly = 0;
  for (const id of union) {
    const inP = fromProgress.has(id);
    const inE = fromEnvelopes.has(id);
    const inB = fromBridge.has(id);
    if (inP && inE) both++;
    else if (inP) progressOnly++;
    else if (inE) envelopeOnly++;
    else if (inB) bridgeOnly++;
  }
  return {
    progressCount: fromProgress.size,
    envelopeCount: fromEnvelopes.size,
    bridgeCount: fromBridge.size,
    unionCount: union.size,
    progressOnly,
    envelopeOnly,
    bridgeOnly,
    both,
  };
}

// ─── CLI (diagnostic) ────────────────────────────────────────────────────
const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--describe")) {
    console.log(JSON.stringify(describeShippedSources(), null, 2));
  } else if (args.includes("--check")) {
    const ids = args.filter((a) => a !== "--check" && !a.startsWith("--")).map(norm);
    const u = buildShippedIdsUnion();
    for (const id of ids) console.log(`${id}: ${u.has(id) ? "SHIPPED" : "not-shipped"}`);
  } else {
    console.log("usage: shipped-units-source-of-truth.mjs --describe | --check <U-ID> [<U-ID> ...]");
  }
}
