#!/usr/bin/env node
/**
 * build-milestone-progress.mjs
 *
 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
 * showing what's actually shipped per milestone vs what the milestone
 * envelope JSONs claim.
 *
 * Why: roadmap-index.json carries `status: "not_started"` for milestones
 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has
 * U-NN-FIX01..05 + U-NN-LOOP06 + U-NN-MONDRIAN01 + U-NN-ADAPTIVE-ALPHA01
 * shipped, but the envelope still says "not_started"). Parallel audit
 * chats compare the milestone JSONs to reality and produce inflated gap
 * lists. This generator reads commit messages directly so the audit can
 * subtract "actually shipped" from "claimed pending".
 *
 * Method:
 *   1. Read every milestone JSON in mcp-server/data/milestones/
 *   2. Extract unit IDs from each milestone's phases[].units[].id
 *   3. Grep git log for [<MS_ID>]/U-<UID> patterns (last 60 days, both
 *      branches and worktrees)
 *   4. Per milestone: total | shipped | pending counts; per unit a
 *      shipped:true|false flag with commit SHA + date if shipped
 *   5. Sort milestones by recent activity (most-recently-shipped first)
 *
 * Output:
 *   state/shared/MILESTONE_PROGRESS.json   (machine-readable, full)
 *   state/shared/MILESTONE_PROGRESS.md     (human-readable summary +
 *                                           top-20-active milestones)
 *
 * Idempotent. Safe to re-run. Should be wired into a daily cron and
 * re-run after every commit batch by stop-shipped-units.mjs.
 */

import { readdir, readFile } from "node:fs/promises";
import { writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Atomic write — tmp + rename prevents byte-interleaved reads when /precompact
// and /checkin fire this script concurrently across 6 chat sessions.
function atomicWriteFileSync(targetPath, contents) {
  const tmp = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, contents, "utf8");
    renameSync(tmp, targetPath);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* tmp may not exist */ }
    throw err;
  }
}

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const MILESTONE_DIR = resolve(REPO_ROOT, "mcp-server/data/milestones");
const STATE_DIR = resolve(REPO_ROOT, "state/shared");
const OUT_JSON = resolve(STATE_DIR, "MILESTONE_PROGRESS.json");
const OUT_MD = resolve(STATE_DIR, "MILESTONE_PROGRESS.md");

const SINCE = "60.days";
const TOP_ACTIVE = 30; // top-N most-active milestones in the MD summary

function git(args) {
  try {
    return execFileSync("git", ["-C", REPO_ROOT, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 60_000,
    }).trim();
  } catch (err) {
    return "";
  }
}

/**
 * Expand combined unit-id captures like `U-AIMAX07+08` or `U-AIMAX07+08-FIX2`
 * into the individual ids `[U-AIMAX07, U-AIMAX08]` (the trailing `-FIX2` is a
 * commit suffix, not a unit id).
 *
 * Rules:
 *   - Strip any trailing `-<NON-DIGIT-PREFIX>...` suffix that comes after the
 *     final numeric chunk (e.g. `-FIX`, `-FIX2`, `-CLOSE`).
 *   - Split on `+` to get parts. The first part is fully qualified
 *     (`U-AIMAX07`); subsequent parts are just the trailing digits and inherit
 *     the leading text of part 0 up to its trailing digit run.
 *   - Inputs that don't contain `+` are returned verbatim (single-element array).
 *
 * Examples:
 *   "U-AIMAX07"           → ["U-AIMAX07"]
 *   "U-AIMAX07+08"        → ["U-AIMAX07", "U-AIMAX08"]
 *   "U-AIMAX07+08-FIX2"   → ["U-AIMAX07", "U-AIMAX08"]
 *   "P0-U02+03"           → ["P0-U02", "P0-U03"]
 */
export function expandCombinedIds(captured) {
  if (!captured.includes("+")) return [captured];
  // Strip trailing -<suffix> if the suffix starts with a non-digit
  // (so we keep things like "-U02" but drop "-FIX2").
  const trimmed = captured.replace(/-[A-Z][A-Z0-9]*$/i, "");
  const parts = trimmed.split("+");
  const base = parts[0];
  const trailingDigits = base.match(/(\d+)$/);
  if (!trailingDigits) return [trimmed];
  const prefix = base.slice(0, base.length - trailingDigits[1].length);
  // The base's trailing letter-run (e.g. "U" of "P23-U", "AIMAX" of "U-AIMAX").
  // A joint part that repeats it (`+U02`) must have it stripped before
  // reconstruction — else `prefix + "U02"` yields "P23-UU02", a malformed id
  // that matches no envelope unit (silent close-out drift). All-digit parts
  // like `+03` never startsWith the letter-run, so they are untouched.
  const prefixLetters = prefix.match(/([A-Za-z]+)$/)?.[1] ?? "";
  const result = [base];
  for (let i = 1; i < parts.length; i += 1) {
    let part = parts[i];
    if (prefixLetters && part.startsWith(prefixLetters)) {
      part = part.slice(prefixLetters.length);
    }
    result.push(prefix + part);
  }
  return result;
}

/**
 * Returns Map<unitId, { sha, date, subject }> for every U-* unit ID
 * we can find in commits across the last SINCE window. Both branches
 * (main + worktrees) are covered by `--all`.
 */
function loadShippedFromGit() {
  const log = git(["log", "--all", `--since=${SINCE}`, "--format=%H\t%cI\t%s"]);
  const shipped = new Map();
  for (const line of log.split("\n")) {
    if (!line.includes("\t")) continue;
    const [sha, date, ...rest] = line.split("\t");
    const subject = rest.join("\t");
    // Match: [SCOPE-MS#]/<unit-id>: title  OR  [MAIN] [SCOPE-MS#]/<unit-id>: title
    // Three unit-id flavors supported:
    //   1. Legacy U-prefix: U-A1-SCRUTINY-BATCH, U-D5-FINAL-WIRING-CLOSEOUT
    //   2. Phase-Unit:      P0-U05, P12-U03 (ACP-MS0+, RGS6+ envelope naming)
    //   3. Combined IDs:    U-AIMAX07+08, U-AIMAX07+08-FIX2 (one commit shipping
    //                       multiple related units — common when pairs are
    //                       co-developed). Expanded by `expandCombinedIds`.
    //   4. Dotted sub-ids:   U-CINF04.x-WORKER-THREAD-RUNNER (CAD-INFRA uses
    //                       .x / .y suffixes for incremental sub-units).
    // Key preserves the original unit-id so it matches the envelope's `units[].id`
    // exactly (which stores P0-U05, not U-P0-U05).
    const mLegacy = subject.match(/\[([^\]]+)\]\/(U-[A-Za-z0-9.]+(?:\+[A-Za-z0-9.]+)*(?:-[A-Za-z0-9-]+)?)/);
    const mPhase  = subject.match(/\[([^\]]+)\]\/(P\d+-U\d+(?:\+\d+)*[A-Za-z0-9.-]*)/);
    const m = mLegacy || mPhase;
    if (!m) continue;
    const milestoneTag = m[1].toUpperCase();
    const captured = m[2].toUpperCase();
    const unitIds = expandCombinedIds(captured);
    for (const unitId of unitIds) {
      const key = `${milestoneTag}::${unitId}`;
      if (!shipped.has(key)) {
        shipped.set(key, { sha, date, subject, milestoneTag, unitId });
      }
    }
  }
  return shipped;
}

// Envelope `status` is string-by-convention; coerce defensively so a malformed
// numeric/object value can never leak into the `=== "complete"` credit check.
export const asStr = (v) => (typeof v === "string" ? v : null);

export async function loadMilestones(dir = MILESTONE_DIR) {
  const files = await readdir(dir);
  const milestones = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(dir, file), "utf8");
      const ms = JSON.parse(raw);
      if (!ms?.id) continue;
      // Collect unit IDs from any phases[].units[].id structure.
      const units = [];
      // Envelope-side overlay for status + commits per unit (object-keyed map).
      // Carried through so computeProgress can fall back to envelope truth when
      // a commit was absorbed into a peer's subject (multi-chat collision) or
      // the unit is operational-only (tags/branch-deletes, no commit at all).
      const unitOverlay = (ms.units && typeof ms.units === "object" && !Array.isArray(ms.units))
        ? ms.units
        : {};
      if (Array.isArray(ms.phases)) {
        for (const phase of ms.phases) {
          if (!Array.isArray(phase?.units)) continue;
          for (const u of phase.units) {
            if (u?.id) units.push({
              id: u.id,
              title: u.title ?? "",
              phase: phase.id ?? "",
              dependencies: u.dependencies ?? [],
              // Read the phase unit's OWN status/commits first — close-out flips
              // write status+commits directly onto phases[].units[]. Fall back to
              // the object-keyed ms.units{} overlay when both shapes coexist.
              envelopeStatus: asStr(u.status) ?? asStr(unitOverlay[u.id]?.status),
              envelopeCommits: Array.isArray(u.commits)
                ? u.commits
                : (Array.isArray(unitOverlay[u.id]?.commits) ? unitOverlay[u.id].commits : []),
            });
          }
        }
      }
      // Fallback: flat top-level `ms.units[]` (e.g. AI-MAX-ROADMAP.json).
      // Without this, single-list envelopes show shipped=0/total=0 and their
      // already-shipped units leak back into /pick-unit candidate pools.
      if (units.length === 0 && Array.isArray(ms.units)) {
        for (const u of ms.units) {
          if (u?.id) units.push({
            id: u.id,
            title: u.title ?? "",
            phase: u.session != null ? `session-${u.session}` : "",
            dependencies: u.dependencies ?? u.depends_on ?? [],
            envelopeStatus: asStr(u.status),
            envelopeCommits: Array.isArray(u.commits) ? u.commits : [],
          });
        }
      }
      // Fallback: object-keyed `ms.units{}` (e.g. SLOT-WORKTREE-MS0). Many
      // envelopes use a map keyed by unit-id while `phases[].units[]` is just
      // a list of id strings. Without this branch, those envelopes also leak
      // to total=0 even though phases[].units lists every unit.
      if (units.length === 0 && ms.units && typeof ms.units === "object" && !Array.isArray(ms.units)) {
        for (const [unitId, u] of Object.entries(ms.units)) {
          if (typeof unitId === "string" && unitId.length) units.push({
            id: unitId,
            title: u?.title ?? "",
            phase: u?.phase ?? "",
            dependencies: u?.dependencies ?? u?.depends_on ?? [],
            envelopeStatus: asStr(u?.status),
            envelopeCommits: Array.isArray(u?.commits) ? u.commits : [],
          });
        }
      }
      // Phase B: enrich phases[]-derived units with overlay (object-keyed
      // ms.units{}) when both forms coexist (the common SLOT-WORKTREE-MS0
      // shape). Without this, phases[]-derived units have envelopeStatus=null
      // even though ms.units[id] has authoritative status/commits.
      for (const u of units) {
        if ((u.envelopeStatus === null || u.envelopeStatus === undefined) && unitOverlay[u.id]) {
          u.envelopeStatus = asStr(unitOverlay[u.id]?.status) ?? u.envelopeStatus;
          if ((!u.envelopeCommits || u.envelopeCommits.length === 0) && Array.isArray(unitOverlay[u.id]?.commits)) {
            u.envelopeCommits = unitOverlay[u.id].commits;
          }
        }
      }
      milestones.push({
        id: ms.id,
        title: ms.title ?? "",
        track: ms.track ?? "",
        status: ms.status ?? "unknown",
        total_units: ms.total_units ?? units.length,
        units,
      });
    } catch {
      // Skip malformed envelopes.
    }
  }
  return milestones;
}

// Terminal-DONE statuses: the envelope asserts the unit shipped. When no git
// commit proves it, the unit is still credited as shipped via the envelope-status
// fallback (and surfaced in envelopeAssertedCount as no-git-proof). "shipped" was
// previously NOT recognized here -- only complete/completed -- so a status:"shipped"
// unit with no reachable commit was mis-counted as pending (the sibling of the
// superseded false-positive below; same incomplete-vocabulary root cause).
export const ENVELOPE_DONE = new Set(["complete", "completed", "shipped"]);

// Terminal-resolved unit statuses: deliberately NOT built (replaced / cancelled),
// so they are RESOLVED, not pending. Counting them as pending cry-wolfs the
// "claims_completed_but_units_pending" drift flag on every milestone whose
// remainder is superseded. Only `superseded` appears in envelopes today; the
// unambiguous synonyms are forward-compat (they behave identically). `deferred`
// is intentionally EXCLUDED -- it can mean deferred-to-future-work (still pending).
export const TERMINAL_RESOLVED = new Set([
  "superseded",
  "cancelled",
  "canceled",
  "wontfix",
  "dropped",
  "obsolete",
  "removed",
]);

export function computeProgress(milestones, shipped, shaSet) {
  // For each milestone, look up each unit in the shipped index.
  // Match strategy: exact (milestone-tag, unit-id) pair first;
  // fallback to (any-milestone-tag, unit-id) — useful when the tag
  // shifted (e.g. [MAIN] [SCOPE]/U-X vs bare [SCOPE]/U-X);
  // envelope fallbacks recover units absorbed into peer commits + ops-only
  // units (tags/branch-deletes with no commit) that the envelope marks complete.
  const byUnitOnly = new Map();
  for (const val of shipped.values()) {
    if (!byUnitOnly.has(val.unitId)) byUnitOnly.set(val.unitId, val);
  }
  // U-DRIFT-BYUNIT-COLLISION-FIX (slot:golf 2026-06-18): the (any-tag, unit-id)
  // fallback below is UNAMBIGUOUS only when a unit-id belongs to exactly ONE
  // milestone. Generic ids (P0-U01, U01, P1-U02) recur across hundreds of
  // milestones, so byUnitOnly.get("P0-U01") returns whichever milestone's commit
  // was indexed first and mis-credits it to EVERY milestone declaring that id
  // (verified: a single [POST-PROCESSOR-COVERAGE-MS0]/P0-U01 commit was credited
  // to ~201 milestones, falsely flagging ~110 unstarted ones "completed_real").
  // Restrict the fallback to globally-unique unit-ids: count how many milestones
  // declare each uid; only uids unique across the whole envelope set may use the
  // (any-tag, unit-id) recovery. git-exact + envelope-* sources are unaffected.
  const uidMilestoneCount = new Map();
  for (const ms of milestones) {
    const seenInMs = new Set();
    for (const u of ms.units || []) {
      const uid = String(u.id || "").toUpperCase();
      if (!uid || seenInMs.has(uid)) continue; // count each milestone at most once per uid
      seenInMs.add(uid);
      uidMilestoneCount.set(uid, (uidMilestoneCount.get(uid) || 0) + 1);
    }
  }
  const haveShaSet = shaSet && typeof shaSet.has === "function" && shaSet.size > 0;

  const result = [];
  for (const ms of milestones) {
    const msTag = ms.id.toUpperCase();
    let shippedCount = 0;
    let resolvedCount = 0;
    let lastShippedDate = "";
    const unitProgress = ms.units.map((u) => {
      const uid = u.id.toUpperCase();
      const exactKey = `${msTag}::${uid}`;
      let hit = shipped.get(exactKey) ?? null;
      let source = hit ? "git-exact" : null;
      // (any-tag, unit-id) recovery -- ONLY when this uid is globally unique across
      // all milestones (uidMilestoneCount===1). A non-unique uid is ambiguous: the
      // byUnitOnly hit could belong to any milestone sharing the id, so skip it
      // rather than mis-credit (the 201-milestone cross-collision). git-exact above
      // and the envelope-* fallbacks below are unaffected.
      if (!hit && uidMilestoneCount.get(uid) === 1) {
        hit = byUnitOnly.get(uid) ?? null;
        if (hit) source = "git-unit-only";
      }
      // Envelope canonical fallback (1): unit declares specific commit SHAs and
      // at least one is reachable in the git log window. Covers commits absorbed
      // into a peer's subject during shared-tree commit-collision (the exact
      // class of bug SLOT-WORKTREE-MS0 exists to eliminate — see
      // [[reference_coord_ms0_u1_collision]]).
      if (!hit && haveShaSet && Array.isArray(u.envelopeCommits)) {
        for (const declaredSha of u.envelopeCommits) {
          if (typeof declaredSha !== "string" || declaredSha === "pending") continue;
          const sha = declaredSha.trim();
          if (sha && shaSet.has(sha)) {
            hit = { sha, date: "", subject: "", milestoneTag: msTag, unitId: uid };
            source = "envelope-commit";
            break;
          }
        }
      }
      // Envelope canonical fallback (2): unit marked complete with NO commit
      // expected (tag-only / branch-delete / pure-ops unit). The envelope is
      // the source of truth for these — no git subject will ever match.
      if (!hit && ENVELOPE_DONE.has((asStr(u.envelopeStatus) || "").toLowerCase())
          && (!u.envelopeCommits || u.envelopeCommits.length === 0)) {
        hit = { sha: null, date: "", subject: "(envelope-asserted, no commit)", milestoneTag: msTag, unitId: uid };
        source = "envelope-status";
      }
      const isShipped = !!hit;
      if (isShipped) {
        shippedCount++;
        if (hit.date && hit.date > lastShippedDate) lastShippedDate = hit.date;
      }
      // A unit with a terminal-resolved status (superseded/cancelled/...) was
      // deliberately NOT built -- it is RESOLVED, not pending. Shipped wins if
      // both somehow hold. This is what keeps superseded remainders out of the
      // pending count (and off the false-positive drift flag below).
      const isResolved = !isShipped && TERMINAL_RESOLVED.has((asStr(u.envelopeStatus) || "").toLowerCase());
      if (isResolved) resolvedCount++;
      return {
        id: u.id,
        title: u.title,
        phase: u.phase,
        shipped: isShipped,
        resolved: isResolved,
        sha: hit?.sha ?? null,
        date: hit?.date ?? null,
        commitMilestoneTag: hit?.milestoneTag ?? null,
        source,
      };
    });
    // Units credited with NO git proof (envelope JSON asserted status:"complete"
    // with no reachable commit SHA). Surfaced so /pick-unit + audit chats can
    // tell git-proven shipments from envelope-claimed ones.
    const envelopeAssertedCount = unitProgress.filter((u) => u.source === "envelope-status").length;
    const total = ms.units.length;
    // "accounted" = shipped OR deliberately resolved (superseded/...). Pending is
    // only the genuinely-buildable remainder, so a fully-resolved milestone reads 0
    // and no longer trips the completed-but-pending drift flag.
    const accounted = shippedCount + resolvedCount;
    const pending = total - accounted;
    const ratio = total > 0 ? shippedCount / total : 0;
    result.push({
      id: ms.id,
      title: ms.title,
      track: ms.track,
      claimedStatus: ms.status,
      total,
      shipped: shippedCount,
      resolved: resolvedCount,
      pending,
      envelopeAssertedCount,
      ratio,
      lastShippedDate,
      // Check completed FIRST so an all-resolved milestone (accounted===total,
      // shipped possibly 0) reads completed_real; only then not_started (nothing
      // shipped yet) vs in_progress.
      derivedStatus:
        total === 0
          ? "no_units"
          : accounted === total
            ? "completed_real"
            : shippedCount === 0
              ? "not_started_real"
              : "in_progress_real",
      drift:
        total === 0
          ? "n/a"
          : ms.status === "not_started" && shippedCount > 0
            ? "claims_not_started_but_has_shipped_units"
            : ms.status === "completed" && accounted < total
              ? "claims_completed_but_units_pending"
              : "consistent",
      units: unitProgress,
    });
  }
  return result;
}

function renderMarkdown(progress) {
  const totalMS = progress.length;
  const totalUnits = progress.reduce((a, p) => a + p.total, 0);
  const totalShipped = progress.reduce((a, p) => a + p.shipped, 0);
  const totalPending = progress.reduce((a, p) => a + p.pending, 0);
  const drifted = progress.filter((p) => p.drift !== "consistent" && p.drift !== "n/a");

  const sortedActive = [...progress]
    .filter((p) => p.shipped > 0)
    .sort((a, b) => (b.lastShippedDate || "").localeCompare(a.lastShippedDate || ""))
    .slice(0, TOP_ACTIVE);

  const stillToBuild = progress
    .filter((p) => p.pending > 0 && p.total > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, TOP_ACTIVE);

  const lines = [];
  lines.push("# MILESTONE_PROGRESS — what's actually shipped vs claimed");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Window: last ${SINCE} of git log across all branches`);
  lines.push(`> Source: \`scripts/build-milestone-progress.mjs\``);
  lines.push("");
  lines.push("## Why this file exists");
  lines.push("");
  lines.push("Milestone envelope JSONs (`mcp-server/data/milestones/*.json`) carry a");
  lines.push("`status` field that drifts: roadmap planners write `\"not_started\"`,");
  lines.push("then chats ship units without flipping the status. Parallel audit chats");
  lines.push("compare envelopes to reality and over-report gaps.");
  lines.push("");
  lines.push("This file is generated FROM git log — it sees what was actually");
  lines.push("committed. Use it to subtract \"shipped\" from \"claimed pending\" before");
  lines.push("flagging a unit as missing.");
  lines.push("");
  lines.push("## Headline numbers");
  lines.push("");
  lines.push(`- Milestones loaded:        **${totalMS}**`);
  lines.push(`- Units across all MS:      **${totalUnits}**`);
  lines.push(`- Units shipped (in git):   **${totalShipped}**`);
  lines.push(`- Units pending:            **${totalPending}**`);
  lines.push(`- Drift cases:              **${drifted.length}** (envelope status disagrees with git reality)`);
  lines.push("");
  lines.push("## Top recently-active milestones (last shipped → first)");
  lines.push("");
  lines.push("| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |");
  lines.push("|-----------|-------|------------------|---------------|---------------|-------------|");
  for (const p of sortedActive) {
    const pct = (p.ratio * 100).toFixed(0);
    lines.push(`| ${p.id} | ${p.track || "—"} | ${p.claimedStatus} | ${p.derivedStatus} | ${p.shipped}/${p.total} (${pct}%) | ${(p.lastShippedDate || "").slice(0, 10)} |`);
  }
  lines.push("");
  lines.push("## Drift cases (claim vs git disagrees)");
  lines.push("");
  if (drifted.length === 0) {
    lines.push("_None — every claim matches reality._");
  } else {
    lines.push("| Milestone | Claimed | Real | Drift |");
    lines.push("|-----------|---------|------|-------|");
    for (const p of drifted.slice(0, 60)) {
      lines.push(`| ${p.id} | ${p.claimedStatus} | ${p.derivedStatus} | ${p.drift} |`);
    }
  }
  lines.push("");
  lines.push("## Top milestones with most pending units");
  lines.push("");
  lines.push("| Milestone | Pending | Total | Shipped/Total |");
  lines.push("|-----------|---------|-------|---------------|");
  for (const p of stillToBuild) {
    lines.push(`| ${p.id} | ${p.pending} | ${p.total} | ${p.shipped}/${p.total} |`);
  }
  lines.push("");
  lines.push("## How to use");
  lines.push("");
  lines.push("- Audit chats: cross-reference your gap lists against the **shipped**");
  lines.push("  column in MILESTONE_PROGRESS.json. A unit listed there is in git;");
  lines.push("  do not flag it as missing without inspecting the commit.");
  lines.push("- Roadmap planners: rows where `claimedStatus !== derivedStatus` are");
  lines.push("  candidates for a status update on the milestone envelope.");
  lines.push("- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +");
  lines.push("  knowledge/wiki/index.md collectively answer \"what's already built?\"");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  process.stderr.write(`[milestone-progress] loading milestones from ${MILESTONE_DIR}\n`);
  const milestones = await loadMilestones();
  process.stderr.write(`[milestone-progress] loaded ${milestones.length} milestone envelopes\n`);

  process.stderr.write(`[milestone-progress] scanning git log (last ${SINCE})\n`);
  const shipped = loadShippedFromGit();
  process.stderr.write(`[milestone-progress] indexed ${shipped.size} (milestone-tag, unit-id) commits\n`);

  // Full SHA index for the envelope-canonical fallback: any envelope unit that
  // declares a `commits: ["<sha>"]` entry can be marked shipped if that sha is
  // reachable from any branch in the SINCE window — recovers absorbed-into-peer
  // commits where the subject doesn't carry our [MS]/U-ID pattern. We also
  // build a prefix Set at lengths 7..12 so envelope short-SHAs (typical: 9-10
  // chars) match without a `git rev-parse` subprocess per unit.
  const shaSet = new Set();
  for (const line of git(["log", "--all", `--since=${SINCE}`, "--format=%H"]).split("\n")) {
    const sha = line.trim();
    if (sha) shaSet.add(sha);
  }
  for (const sha of shaSet) {
    for (let n = 7; n <= 12; n += 1) shaSet.add(sha.slice(0, n));
  }
  process.stderr.write(`[milestone-progress] indexed ${shaSet.size} SHA tokens (40-char + 7..12-char prefixes)\n`);

  const progress = computeProgress(milestones, shipped, shaSet);

  // Sort canonical: by track, then by id, for stable JSON diff.
  progress.sort((a, b) =>
    (a.track || "").localeCompare(b.track || "") || a.id.localeCompare(b.id),
  );

  const json = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    window: SINCE,
    totals: {
      milestones: progress.length,
      units: progress.reduce((a, p) => a + p.total, 0),
      shipped: progress.reduce((a, p) => a + p.shipped, 0),
      envelopeAsserted: progress.reduce((a, p) => a + p.envelopeAssertedCount, 0),
      pending: progress.reduce((a, p) => a + p.pending, 0),
      drift: progress.filter((p) => p.drift !== "consistent" && p.drift !== "n/a").length,
    },
    milestones: progress,
  };

  atomicWriteFileSync(OUT_JSON, JSON.stringify(json, null, 2) + "\n");
  atomicWriteFileSync(OUT_MD, renderMarkdown(progress));

  process.stderr.write(`[milestone-progress] wrote ${OUT_JSON}\n`);
  process.stderr.write(`[milestone-progress] wrote ${OUT_MD}\n`);
  process.stderr.write(
    `[milestone-progress] totals: ${json.totals.shipped}/${json.totals.units} shipped (${json.totals.envelopeAsserted} envelope-asserted, ${json.totals.drift} drift cases)\n`,
  );
}

// Only auto-run when executed directly (`node build-milestone-progress.mjs`).
// When imported (e.g. by build-milestone-progress.test.mjs) main() must NOT
// fire — it would do a full real run and overwrite MILESTONE_PROGRESS.json.
const isMainModule =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((err) => {
    process.stderr.write(`[milestone-progress] FAILED: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
