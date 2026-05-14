#!/usr/bin/env node
/**
 * build-wiki-recall-digest.mjs — CLEANUP-MS0 / U-CLEANUP-G5
 *
 * Consumes the wiki/memory recall-counts state file
 * (`mcp-server/data/state/wiki-recall-counts.json`, populated by the
 * `recall-counter-track.mjs` PostToolUse hook) and emits two operator-facing
 * lists:
 *
 *   1. DELETION CANDIDATES — vault entries (.md files under knowledge/wiki/
 *      or knowledge/memories/) that the recall counter has never seen
 *      (count = 0 / absent from the entries dict) AND whose file mtime is
 *      older than `--deletion-age-days` (default 90). These are wiki/memory
 *      entries that exist but no Claude session has ever read them through
 *      the recall path — the entries are dead weight in the vault, the
 *      operator can review-and-delete (or backlink them so they get found).
 *
 *   2. PROMOTION CANDIDATES — entries whose recall RATE exceeds
 *      `--promotion-rate-per-week` (default 50). Rate is `count` divided by
 *      the number of weeks elapsed since `firstSeenIso`. A high-rate entry
 *      is one that gets pulled into context a lot — the operator can promote
 *      its salience (e.g. by adding boost_keywords frontmatter so the wiki-
 *      precheck hook surfaces it earlier).
 *
 * Output: a JSONL row + a human-readable Markdown digest at
 * `state/shared/WIKI_RECALL_DIGEST.{json,md}`. Operators can `tail -1` the
 * JSONL for the latest snapshot OR open the .md for the rendered punch list.
 *
 * Idempotency: the script is read-only over the recall-counts state. Two
 * runs back-to-back produce the same digest (deterministic, modulo wall-
 * clock time in `generatedAt`). `--dry-run` computes the lists without
 * touching the output files.
 *
 * Cadence: weekly is plenty — recall counts shift slowly and the operator
 * doesn't need to triage these daily. Cron not required (G-series doesn't
 * include a wrapper for this); operators run on demand or pair with the
 * monthly DR drill.
 *
 * Usage:
 *   node scripts/build-wiki-recall-digest.mjs                     apply
 *   node scripts/build-wiki-recall-digest.mjs --dry-run           plan only
 *   node scripts/build-wiki-recall-digest.mjs --json              full result to stdout
 *   node scripts/build-wiki-recall-digest.mjs --deletion-age-days 60 --promotion-rate-per-week 25
 *   node scripts/build-wiki-recall-digest.mjs --now 2026-05-14T00:00:00Z   hermetic test mode
 *
 * Exit codes: 0 = ok (or dry-run), 1 = error path (state file unreadable,
 * vault dir missing, write failed). NEVER 1 for "no candidates found" —
 * an empty digest is a healthy outcome, not a failure.
 *
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-G5).
 * Producer of consumed state: .claude/hooks/recall-counter-track.mjs (D5-era).
 */

import {
  existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync,
} from "node:fs";
import { join, resolve, dirname, basename, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Configuration ───────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_COUNTS_REL = "mcp-server/data/state/wiki-recall-counts.json";
const DEFAULT_WIKI_REL = "knowledge/wiki";
const DEFAULT_MEMORY_REL = "knowledge/memories";
const DEFAULT_OUT_JSON_REL = "state/shared/WIKI_RECALL_DIGEST.json";
const DEFAULT_OUT_MD_REL = "state/shared/WIKI_RECALL_DIGEST.md";

const DEFAULT_DELETION_AGE_DAYS = 90;
const DEFAULT_PROMOTION_RATE_PER_WEEK = 50;
const SCHEMA_VERSION = 1;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MIN_WEEKS_FOR_RATE = 1 / 7; // one day expressed as weeks — keeps rate finite for brand-new entries

// Tolerance for a multi-host fleet where wall clocks may drift by up to
// a minute. A firstSeenIso > nowMs + this delta is rejected as a malformed
// timestamp rather than allowed to inflate the rate calculation.
const FUTURE_SKEW_MS = 60 * 1000;

// Top-N candidates surfaced in the rendered .md (full list always in JSON).
const RENDER_LIMIT = 25;

// ─── Pure helpers (exported for tests) ───────────────────────────────────

export function parseArgs(argv) {
  const out = {
    repo: DEFAULT_REPO,
    counts: null, // resolved against repo if null
    wikiDir: null,
    memoryDir: null,
    outJson: null,
    outMd: null,
    deletionAgeDays: DEFAULT_DELETION_AGE_DAYS,
    promotionRatePerWeek: DEFAULT_PROMOTION_RATE_PER_WEEK,
    now: null,
    dryRun: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo" && argv[i + 1]) out.repo = argv[++i];
    else if (a === "--counts" && argv[i + 1]) out.counts = argv[++i];
    else if (a === "--wiki-dir" && argv[i + 1]) out.wikiDir = argv[++i];
    else if (a === "--memory-dir" && argv[i + 1]) out.memoryDir = argv[++i];
    else if (a === "--out-json" && argv[i + 1]) out.outJson = argv[++i];
    else if (a === "--out-md" && argv[i + 1]) out.outMd = argv[++i];
    else if (a === "--deletion-age-days" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.deletionAgeDays = Number.isFinite(n) && n >= 0 ? n : DEFAULT_DELETION_AGE_DAYS;
    } else if (a === "--promotion-rate-per-week" && argv[i + 1]) {
      const n = parseFloat(argv[++i]);
      out.promotionRatePerWeek = Number.isFinite(n) && n >= 0 ? n : DEFAULT_PROMOTION_RATE_PER_WEEK;
    } else if (a === "--now" && argv[i + 1]) out.now = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

/**
 * Mirror of the key-derivation logic in recall-counter-track.mjs. Returns
 * { kind, key } or null if the path isn't a vault entry we count.
 *
 * Duplicating the parser here (rather than importing the hook module) keeps
 * the digest script self-contained — a digest that can't run because the
 * hook's loader is broken defeats the point. The schema is documented in
 * recall-counter-track.mjs / WikiRecallCounterEngine — keep these in sync.
 *
 * Three path shapes (matching the producer at recall-counter-track.mjs lines 47-60):
 *   1. /knowledge/memories/<category>/<stem>.md → memory/<category>/<stem>
 *   2. /knowledge/wiki/<category>/<stem>.md     → wiki/<category>/<stem>
 *   3. /.claude/projects/<proj>/memory/<file>.md → memory/source/<file>
 *      (global auto-memory under C:/Users/.../.claude/projects/.../memory/)
 */
export function deriveKeyFromPath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return null;
  const norm = filePath.replace(/\\/g, "/");
  if (!norm.toLowerCase().endsWith(".md")) return null;
  const memMatch = norm.match(/\/knowledge\/memories\/([^/]+)\/([^/]+)\.md$/i);
  if (memMatch) return { kind: "memory", key: `memory/${memMatch[1]}/${basename(memMatch[2])}` };
  const wikiMatch = norm.match(/\/knowledge\/wiki\/([^/]+)\/([^/]+)\.md$/i);
  if (wikiMatch) return { kind: "wiki", key: `wiki/${wikiMatch[1]}/${basename(wikiMatch[2])}` };
  // Auto-memory under .claude/projects/<proj>/memory/<file>.md — produces
  // keys like `memory/source/MEMORY.md`. The consumer doesn't walk this
  // location by default (it lives outside the repo on C:), but recognizing
  // the key shape lets renamed/missing detection round-trip correctly.
  const srcMatch = norm.match(/\/\.claude\/projects\/[^/]+\/memory\/([^/]+)\.md$/i);
  if (srcMatch) return { kind: "memory", key: `memory/source/${srcMatch[1]}` };
  return null;
}

/**
 * Bounded recursive walk of a vault directory. Returns an array of
 * { absPath, key, kind, mtimeMs }. Skips anything that doesn't yield a
 * derivable key (entry templates, _disconnected-graph stubs, README, etc.
 * — anything whose path doesn't match knowledge/wiki/<cat>/<stem>.md).
 *
 * `maxDepth` caps recursion; the canonical layout is exactly 2 levels
 * (knowledge/{wiki,memories}/<category>/<stem>.md), so 3 is plenty.
 */
export function walkVaultDir(absRoot, hooks = {}) {
  const out = [];
  const statFn = hooks.statFn || statSync;
  const readdirFn = hooks.readdirFn || readdirSync;
  if (!existsSync(absRoot)) return out;
  const MAX_DEPTH = hooks.maxDepth != null ? hooks.maxDepth : 3;
  function recurse(dir, depth) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try { entries = readdirFn(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        recurse(full, depth + 1);
        continue;
      }
      if (!e.isFile()) continue;
      if (!e.name.toLowerCase().endsWith(".md")) continue;
      const derived = deriveKeyFromPath(full);
      if (!derived) continue; // category-less or template — ignore
      let mtimeMs = 0;
      try { mtimeMs = statFn(full).mtimeMs; } catch { /* best-effort */ }
      out.push({ absPath: full, key: derived.key, kind: derived.kind, mtimeMs });
    }
  }
  recurse(absRoot, 0);
  return out;
}

/**
 * Compute weeks-elapsed since `firstSeenIso`, anchored to `nowMs`. Capped at
 * a minimum of `MIN_WEEKS_FOR_RATE` so a brand-new entry doesn't divide by
 * zero (or near-zero) and produce a misleadingly enormous rate.
 */
export function weeksElapsed(firstSeenIso, nowMs) {
  const t = Date.parse(firstSeenIso);
  if (!Number.isFinite(t)) return null;
  const elapsedMs = nowMs - t;
  if (elapsedMs <= 0) return MIN_WEEKS_FOR_RATE; // future-dated entry — degenerate but not fatal
  return Math.max(elapsedMs / WEEK_MS, MIN_WEEKS_FOR_RATE);
}

/**
 * Classify each on-disk vault entry into one of:
 *   "active" — entry exists in recall counts with count >= 1
 *   "dead"   — entry is NOT in recall counts (count = 0 implicitly), and
 *              its mtime age >= deletionAgeDays → deletion candidate
 *   "young-zero" — absent from recall counts but file is younger than
 *              deletionAgeDays → not yet a candidate (give it time to be read)
 *
 * Returns the per-key classification + the list of deletion candidates ready
 * for the digest.
 */
export function classifyDeletionCandidates(vaultEntries, recallCounts, opts) {
  const { nowMs, deletionAgeDays } = opts;
  const entries = recallCounts && recallCounts.entries ? recallCounts.entries : {};
  const ageCutoffMs = deletionAgeDays * DAY_MS;
  const classifications = {};
  const candidates = [];
  for (const v of vaultEntries) {
    const seen = entries[v.key];
    if (seen && typeof seen.count === "number" && seen.count >= 1) {
      classifications[v.key] = "active";
      continue;
    }
    const ageMs = nowMs - v.mtimeMs;
    if (ageMs >= ageCutoffMs) {
      classifications[v.key] = "dead";
      candidates.push({
        key: v.key,
        kind: v.kind,
        ageDays: Math.floor(ageMs / DAY_MS),
        absPath: v.absPath,
      });
    } else {
      classifications[v.key] = "young-zero";
    }
  }
  // Sort oldest-first (highest ageDays) so the operator's punch list leads
  // with the entries most likely safe to delete. Secondary sort on key is
  // a stable tie-break — Object.entries / readdirSync iteration order is
  // NOT guaranteed stable across vault edits (NTFS B-tree order can permute
  // as files are added), so without the tie-break two runs against the
  // same input set could reshuffle equal-age rows.
  candidates.sort((a, b) => b.ageDays - a.ageDays || a.key.localeCompare(b.key));
  return { classifications, candidates };
}

/**
 * From the recall counts, surface every entry whose computed weekly rate
 * exceeds `promotionRatePerWeek`. Returns sorted by rate descending.
 *
 * An entry MUST have `count`, `firstSeenIso` — if either is malformed the
 * entry is skipped (recorded in `skippedMalformed[]` so the operator can
 * triage the recall-counts state if it drifts).
 */
export function classifyPromotionCandidates(recallCounts, opts) {
  const { nowMs, promotionRatePerWeek } = opts;
  const entries = recallCounts && recallCounts.entries ? recallCounts.entries : {};
  const candidates = [];
  const skippedMalformed = [];
  // Tolerate up to FUTURE_SKEW_MS of clock skew on firstSeenIso (a
  // multi-host fleet won't have perfectly synchronized clocks); anything
  // beyond that is treated as a malformed timestamp rather than a "bursty
  // new entry" that would false-positive as a promotion candidate.
  for (const [key, e] of Object.entries(entries)) {
    if (!e || typeof e.count !== "number" || !Number.isFinite(e.count) || e.count < 0) {
      skippedMalformed.push({ key, reason: "bad-count" });
      continue;
    }
    if (typeof e.firstSeenIso !== "string" || e.firstSeenIso.length === 0) {
      skippedMalformed.push({ key, reason: "bad-firstSeenIso" });
      continue;
    }
    if (typeof e.kind !== "string" || e.kind.length === 0) {
      skippedMalformed.push({ key, reason: "bad-kind" });
      continue;
    }
    const tParsed = Date.parse(e.firstSeenIso);
    if (!Number.isFinite(tParsed)) {
      skippedMalformed.push({ key, reason: "unparseable-firstSeenIso" });
      continue;
    }
    if (tParsed - nowMs > FUTURE_SKEW_MS) {
      skippedMalformed.push({ key, reason: "future-firstSeenIso" });
      continue;
    }
    const weeks = weeksElapsed(e.firstSeenIso, nowMs);
    if (weeks == null) {
      skippedMalformed.push({ key, reason: "unparseable-firstSeenIso" });
      continue;
    }
    const ratePerWeek = e.count / weeks;
    if (ratePerWeek >= promotionRatePerWeek) {
      candidates.push({
        key,
        kind: e.kind,
        count: e.count,
        ratePerWeek: Math.round(ratePerWeek * 100) / 100,
        firstSeenIso: e.firstSeenIso,
        lastSeenIso: typeof e.lastSeenIso === "string" ? e.lastSeenIso : null,
      });
    }
  }
  // Stable tie-break by key (same reasoning as deletion sort).
  candidates.sort((a, b) => b.ratePerWeek - a.ratePerWeek || a.key.localeCompare(b.key));
  return { candidates, skippedMalformed };
}

/** Render the operator-facing Markdown digest. Pure — returns a string. */
export function renderDigest(result, opts) {
  const lines = [];
  lines.push("# Wiki Recall Digest");
  lines.push("");
  lines.push(`**Generated:** ${result.generatedAt}`);
  lines.push(`**Recall counts source:** \`${result.countsPath}\``);
  lines.push(`**Totals:** ${result.summary.totalEntries} tracked entries · ${result.summary.totalRecalls} total recalls · ${result.summary.vaultEntries} on-disk vault entries`);
  lines.push("");
  lines.push(`**Knobs:** deletion-age-days=${opts.deletionAgeDays}, promotion-rate-per-week=${opts.promotionRatePerWeek}`);
  lines.push("");

  lines.push(`## Deletion candidates (${result.deletion.length})`);
  lines.push("");
  lines.push("Entries on disk but never recalled, file age >= cutoff. Review for removal or backlinking.");
  lines.push("");
  if (result.deletion.length === 0) {
    lines.push("_None — every vault entry has been recalled at least once or is younger than the cutoff._");
  } else {
    lines.push("| age (days) | kind | key |");
    lines.push("|---:|---|---|");
    const shown = result.deletion.slice(0, RENDER_LIMIT);
    for (const c of shown) {
      lines.push(`| ${c.ageDays} | ${c.kind} | \`${c.key}\` |`);
    }
    if (result.deletion.length > RENDER_LIMIT) {
      lines.push("");
      lines.push(`_…and ${result.deletion.length - RENDER_LIMIT} more. Full list in the JSON._`);
    }
  }
  lines.push("");

  lines.push(`## Promotion candidates (${result.promotion.length})`);
  lines.push("");
  lines.push("Entries with recall rate above the cutoff. Consider adding boost_keywords frontmatter so the wiki-precheck hook surfaces them earlier.");
  lines.push("");
  if (result.promotion.length === 0) {
    lines.push("_None above the rate cutoff._");
  } else {
    lines.push("| rate/wk | count | kind | key |");
    lines.push("|---:|---:|---|---|");
    const shown = result.promotion.slice(0, RENDER_LIMIT);
    for (const c of shown) {
      lines.push(`| ${c.ratePerWeek} | ${c.count} | ${c.kind} | \`${c.key}\` |`);
    }
    if (result.promotion.length > RENDER_LIMIT) {
      lines.push("");
      lines.push(`_…and ${result.promotion.length - RENDER_LIMIT} more. Full list in the JSON._`);
    }
  }
  lines.push("");

  if (result.skippedMalformed && result.skippedMalformed.length > 0) {
    lines.push(`## Malformed entries skipped (${result.skippedMalformed.length})`);
    lines.push("");
    lines.push("These entries are in `wiki-recall-counts.json` but have malformed fields. The recall counter should be checked.");
    lines.push("");
    for (const s of result.skippedMalformed.slice(0, RENDER_LIMIT)) {
      lines.push(`- \`${s.key}\` — ${s.reason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Core ────────────────────────────────────────────────────────────────

/**
 * Pure orchestrator. Never throws on I/O — errors accrue into result.errors.
 * Test seams via `hooks`:
 *   hooks.now             — Date|ISO override for "now"
 *   hooks.statFn          — fs.stat override for vault walk (test mode)
 *   hooks.readdirFn       — fs.readdir override for vault walk
 *   hooks.readCountsFn    — read recall-counts.json (default: real fs)
 *   hooks.writeFn         — write the .md/.json output (default: real fs)
 */
export function buildDigest(opts, hooks = {}) {
  const nowDate = hooks.now != null ? new Date(hooks.now)
    : opts.now != null ? new Date(opts.now)
      : new Date();
  const nowMs = nowDate.getTime();
  // Resolve overrides against opts.repo when they're relative — preserves
  // the contract that `--repo H:/prism-fork --counts foo.json` reads from
  // the fork, not from process.cwd(). Absolute paths pass through.
  const resolveAgainstRepo = (p, defaultRel) => {
    if (!p) return join(opts.repo, defaultRel);
    return isAbsolute(p) ? p : resolve(opts.repo, p);
  };
  const countsPath = resolveAgainstRepo(opts.counts, DEFAULT_COUNTS_REL);
  const wikiDir = resolveAgainstRepo(opts.wikiDir, DEFAULT_WIKI_REL);
  const memoryDir = resolveAgainstRepo(opts.memoryDir, DEFAULT_MEMORY_REL);
  const outJsonPath = resolveAgainstRepo(opts.outJson, DEFAULT_OUT_JSON_REL);
  const outMdPath = resolveAgainstRepo(opts.outMd, DEFAULT_OUT_MD_REL);

  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    generatedAt: Number.isFinite(nowMs) ? nowDate.toISOString() : null,
    countsPath,
    wikiDir,
    memoryDir,
    outJsonPath,
    outMdPath,
    dryRun: !!opts.dryRun,
    summary: { totalEntries: 0, totalRecalls: 0, vaultEntries: 0,
      deletionCandidates: 0, promotionCandidates: 0, skippedMalformed: 0 },
    deletion: [],
    promotion: [],
    skippedMalformed: [],
    errors: [],
  };

  if (!Number.isFinite(nowMs)) {
    result.ok = false;
    result.errors.push(`invalid --now value: ${opts.now ?? hooks.now}`);
    return result;
  }

  // 1. Read recall counts. A MISSING counts file is a hard failure: an
  // operator running the digest with no counts state would otherwise see
  // every vault entry over the age cutoff classified as a deletion
  // candidate — a horrifying false-positive avalanche of hundreds of rows.
  // Better to refuse the digest and tell them to initialize the counter.
  let recallCounts;
  let countsMissing = false;
  if (hooks.readCountsFn) {
    try { recallCounts = hooks.readCountsFn(countsPath); }
    catch (err) {
      result.errors.push(`readCountsFn failed: ${String(err && err.message || err)}`);
      recallCounts = { entries: {} };
      countsMissing = true;
    }
  } else if (existsSync(countsPath)) {
    try {
      const raw = readFileSync(countsPath, "utf8");
      recallCounts = JSON.parse(raw);
    } catch (err) {
      result.errors.push(`read ${countsPath}: ${String(err && err.message || err)}`);
      recallCounts = { entries: {} };
      countsMissing = true; // parse-failure treated the same as absent
    }
  } else {
    result.errors.push(
      `recall-counts file missing: ${countsPath} — run a few sessions so recall-counter-track.mjs populates it before running this digest`,
    );
    recallCounts = { entries: {} };
    countsMissing = true;
  }
  // Reject malformed shapes: not an object, null, or an array (typeof [] === "object").
  if (!recallCounts || typeof recallCounts.entries !== "object"
    || recallCounts.entries === null || Array.isArray(recallCounts.entries)) {
    result.errors.push(`recall-counts has no entries object (got ${
      recallCounts == null ? "null" : Array.isArray(recallCounts.entries) ? "array" : typeof recallCounts.entries
    })`);
    recallCounts = { entries: {} };
    countsMissing = true;
  }
  // Surface schema-version drift as a warning (don't hard-fail — degrades
  // gracefully but the operator should know they're reading new shape with
  // a v1 consumer).
  if (recallCounts.schemaVersion != null && recallCounts.schemaVersion !== "1.0.0") {
    result.errors.push(
      `recall-counts schemaVersion=${JSON.stringify(recallCounts.schemaVersion)}, consumer expects "1.0.0" — fields may be misinterpreted`,
    );
  }
  result.summary.totalEntries = Object.keys(recallCounts.entries).length;
  result.summary.totalRecalls = (typeof recallCounts.totalRecalls === "number" && Number.isFinite(recallCounts.totalRecalls))
    ? recallCounts.totalRecalls : 0;
  result.countsMissing = countsMissing;

  // 2. Walk the vault dirs. Soft-fail individual missing dirs.
  const wikiEntries = walkVaultDir(wikiDir, hooks);
  const memEntries = walkVaultDir(memoryDir, hooks);
  const vaultEntries = wikiEntries.concat(memEntries);
  result.summary.vaultEntries = vaultEntries.length;

  // 3. Deletion candidates: on disk but never recalled, age >= cutoff.
  // If counts state is missing/malformed, SUPPRESS the deletion list —
  // otherwise every vault entry over the cutoff false-positives. The error
  // already in errors[] tells the operator why the list is empty.
  if (countsMissing) {
    result.deletion = [];
    result.summary.deletionCandidates = 0;
    result.summary.youngZeroCount = 0;
  } else {
    const dc = classifyDeletionCandidates(vaultEntries, recallCounts, {
      nowMs, deletionAgeDays: opts.deletionAgeDays,
    });
    // Strip absPath from the surface output (operator-facing JSON keeps the
    // .key only — the full path can be reconstructed via repo + key for
    // wiki/<cat>/<stem> and memory/<cat>/<stem> keys. memory/source/<file>
    // keys live outside the repo (C:/Users/.../memory/) and are surfaced
    // with their key only.)
    result.deletion = dc.candidates.map((c) => ({ key: c.key, kind: c.kind, ageDays: c.ageDays }));
    result.summary.deletionCandidates = result.deletion.length;
    result.summary.youngZeroCount = Object.values(dc.classifications)
      .filter((v) => v === "young-zero").length;
  }

  // 4. Promotion candidates: recall rate above cutoff.
  const pc = classifyPromotionCandidates(recallCounts, {
    nowMs, promotionRatePerWeek: opts.promotionRatePerWeek,
  });
  result.promotion = pc.candidates;
  result.skippedMalformed = pc.skippedMalformed;
  result.summary.promotionCandidates = result.promotion.length;
  result.summary.skippedMalformed = result.skippedMalformed.length;

  // 4b. Renamed-entry reconciliation: any promotion candidate whose key
  // doesn't match an on-disk vault entry is a "stale" recall — the file
  // was renamed/deleted but the counter wasn't reset. memory/source/<file>
  // keys live OUTSIDE the repo by design (see deriveKeyFromPath docblock),
  // so they're skipped from the staleness check.
  const vaultKeys = new Set(vaultEntries.map((v) => v.key));
  result.stalePromotion = result.promotion
    .filter((p) => !p.key.startsWith("memory/source/") && !vaultKeys.has(p.key))
    .map((p) => p.key);
  result.summary.stalePromotion = result.stalePromotion.length;

  // 5. Emit the .json + .md output unless --dry-run.
  if (!opts.dryRun) {
    // Path-safety: refuse to write outside opts.repo unless explicitly
    // overridden via PRISM_DIGEST_ALLOW_ABSOLUTE_OUT=1. An accidental
    // `--out-json /etc/passwd` could otherwise be written by a privileged
    // CI/cron context. Default-deny + auditable env override matches the
    // dr-drill.mjs RESERVED_RESTORE_ROOTS pattern.
    const repoRoot = resolve(opts.repo).toLowerCase();
    const bypass = process.env.PRISM_DIGEST_ALLOW_ABSOLUTE_OUT === "1";
    const pathIsSafe = (p) => {
      if (bypass) return true;
      const abs = resolve(p).toLowerCase();
      return abs === repoRoot
        || abs.startsWith(repoRoot + "\\")
        || abs.startsWith(repoRoot + "/");
    };
    if (!pathIsSafe(outJsonPath)) {
      result.errors.push(`refuse to write outside repo: ${outJsonPath} (override: PRISM_DIGEST_ALLOW_ABSOLUTE_OUT=1)`);
    } else if (!pathIsSafe(outMdPath)) {
      result.errors.push(`refuse to write outside repo: ${outMdPath} (override: PRISM_DIGEST_ALLOW_ABSOLUTE_OUT=1)`);
    } else {
      const writeFn = hooks.writeFn || ((p, data) => {
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, data);
      });
      try {
        writeFn(outJsonPath, JSON.stringify(result, null, 2) + "\n");
      } catch (err) {
        result.errors.push(`write ${outJsonPath}: ${String(err && err.message || err)}`);
      }
      try {
        writeFn(outMdPath, renderDigest(result, opts));
      } catch (err) {
        result.errors.push(`write ${outMdPath}: ${String(err && err.message || err)}`);
      }
    }
  }

  // Final ok policy: any errors[] entry flips ok=false. Matches G12's
  // "errors.length > 0 → ok=false" convention (golf-state-snapshot.mjs:319)
  // so the operator's exit code never silently swallows a soft-fail like
  // missing counts state or a path-safety refusal.
  if (result.errors.length > 0) result.ok = false;

  return result;
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function printHelp() {
  process.stdout.write(
    [
      "build-wiki-recall-digest.mjs — wiki/memory recall-counts digest (U-CLEANUP-G5)",
      "",
      "Usage:",
      "  node scripts/build-wiki-recall-digest.mjs                  apply",
      "  node scripts/build-wiki-recall-digest.mjs --dry-run        plan only",
      "  node scripts/build-wiki-recall-digest.mjs --json           full result to stdout",
      "  node scripts/build-wiki-recall-digest.mjs --deletion-age-days N --promotion-rate-per-week R",
      "",
      "Defaults:",
      `  deletion-age-days:        ${DEFAULT_DELETION_AGE_DAYS}`,
      `  promotion-rate-per-week:  ${DEFAULT_PROMOTION_RATE_PER_WEEK}`,
      `  counts source:            <repo>/${DEFAULT_COUNTS_REL}`,
      `  output:                   <repo>/${DEFAULT_OUT_JSON_REL} + .md`,
      "",
    ].join("\n"),
  );
}

export function run(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    printHelp();
    return 0;
  }
  const result = buildDigest(opts, {});
  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
    process.stdout.write(`wiki-recall-digest: ${result.dryRun ? "dry-run" : "apply"}\n`);
    process.stdout.write(`  tracked: ${result.summary.totalEntries} · recalls: ${result.summary.totalRecalls} · vault: ${result.summary.vaultEntries}\n`);
    process.stdout.write(`  deletion candidates:  ${result.summary.deletionCandidates}\n`);
    process.stdout.write(`  promotion candidates: ${result.summary.promotionCandidates}\n`);
    if (result.summary.skippedMalformed > 0) {
      process.stdout.write(`  ⚠ malformed entries skipped: ${result.summary.skippedMalformed}\n`);
    }
    for (const e of result.errors) process.stdout.write(`  ✗ ${e}\n`);
    process.stdout.write(result.ok ? "  ✓ ok\n" : "  ✗ completed with errors\n");
  }
  return result.ok ? 0 : 1;
}

// Entry guard — exact path equality so a vitest import never execs the CLI.
const _invoked = process.argv[1] ? resolve(process.argv[1]) : "";
const _here = resolve(fileURLToPath(import.meta.url));
if (_invoked !== "" && _invoked === _here) {
  try {
    const code = run();
    process.exit(code);
  } catch (err) {
    process.stderr.write(`build-wiki-recall-digest: fatal: ${err && err.message || err}\n`);
    process.exit(1);
  }
}

export {
  SCHEMA_VERSION,
  DEFAULT_DELETION_AGE_DAYS,
  DEFAULT_PROMOTION_RATE_PER_WEEK,
  DEFAULT_COUNTS_REL,
  DEFAULT_OUT_JSON_REL,
  DEFAULT_OUT_MD_REL,
  RENDER_LIMIT,
  WEEK_MS,
  DAY_MS,
  MIN_WEEKS_FOR_RATE,
  FUTURE_SKEW_MS,
};
