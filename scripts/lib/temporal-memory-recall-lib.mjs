#!/usr/bin/env node
// HMEMV03 -- Temporal-aware recall (point-in-time belief query).
//
// Answers "what did PRISM's memory/wiki BELIEVE at time T" via a deterministic
// git-history walk over the git-tracked corpus (H:/prism/knowledge/memories/ and
// knowledge/wiki/). It resolves the as-of commit (the newest commit touching the
// corpus dir at-or-before T), enumerates the *.md files AS THEY EXISTED AT THAT
// COMMIT (`git ls-tree`, never live readdir -- the core point-in-time invariant),
// reads each blob (`git show <sha>:<path>`), and scores them with the SAME BM25
// scorer the live recall surface uses (imported from memory-index-search-lib.mjs,
// R8 -- reuse, do not re-implement; keeps temporal recall blendable with live recall).
//
// PURE CORE: every git call goes through an injected `gitExec(args:string[])=>string`
// runner so the lib is unit-testable with zero live repo. The dispatcher builds a
// real execFileSync-backed gitExec; tests inject a fake Map<argsKey, stdout|throw>.
//
// IMPORTANT temporal-axis fact (verified live, HMEMV03 blueprint risk 2): the
// C:\Users\<u>\.claude\projects\H--prism\memory\ master vault is OUTSIDE this git
// repo. The ONLY git-tracked temporal corpus is H:/prism/knowledge/memories/ (the
// mirror) + H:/prism/knowledge/wiki/. recall_as_of operates on H: only.
//
// Failure discipline (R12 -- fail loud on misuse, fail soft on missing data):
//   - invalid `asOf` (non-ISO / NaN / negative epoch / no offset) yields a typed
//     reject, git is NEVER consulted (the value would silently mean host-local-midnight).
//   - unknown `corpus` yields a typed reject (corpus selects a fixed pathspec; never a
//     caller-controlled string that could reach gitExec args).
//   - no commit at-or-before T yields { resolved:null, error:"no-commit-before-T" }
//     (a legitimate "PRISM had no such belief yet", not an error to throw on).
//   - a file present-on-disk but absent-at-sha (`git show` exit 128) is SKIPPED,
//     never fatal (a rename/add after T is expected, not a crash).

import {
  tokenize,
  buildMemoryRecord,
  scoreMemoryRecord,
  matchedTokens,
  recordKey,
  DEFAULT_NAMESPACES,
} from "./memory-index-search-lib.mjs";

export const DEFAULT_REPO_ROOT = "H:/prism";
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 50;
// Hard ceiling on the total number of *.md paths enumerated via ls-tree. This
// is a backstop against a future runaway corpus -- NOT a spawn-limiter (the
// path-prefilter handles that). Must be set ABOVE the largest real corpus so the
// typed too-many-files error never fires on valid data: memories ~3,400 files,
// wiki ~17,600 files (verified HEAD 2026-06-11). 25,000 gives ~40% headroom.
// The cap still prevents pathological cases (a mis-pointed pathspec enumerating
// the whole repo, etc.) and surfaces them as a typed error rather than an OOM.
const DEFAULT_MAX_FILES = 25000;
// After enumeration, BM25-score paths cheaply (no subprocess) and take the top
// PREFILTER_K candidates to git-show. This bounds subprocess spawns to at most
// PREFILTER_K regardless of how large the as-of tree is.
const DEFAULT_PREFILTER_K = 200;
const DEFAULT_MAX_BODY_BYTES = 4096;
// Aggregate wall-clock budget for the entire readCorpusAsOf call (all git-show
// spawns combined). If the budget is exhausted mid-scan, recallAsOf returns a
// typed partial/timeout result rather than hanging. Override with env var
// PRISM_TEMPORAL_RECALL_BUDGET_MS (0 = unlimited, for offline analysis only).
export const DEFAULT_BUDGET_MS = Number.isFinite(Number(process.env.PRISM_TEMPORAL_RECALL_BUDGET_MS))
  ? Number(process.env.PRISM_TEMPORAL_RECALL_BUDGET_MS)
  : 15000;
// Hit opening preview length, matches runMemoryIndexSearch toHit (memory-index-search-lib:842).
const OPENING_PREVIEW_BYTES = 200;
// A short git object id is 7 hex chars; a full one is 40.
const SHA_RE = /^[0-9a-f]{7,40}$/i;

// Wiki uses a different namespace layout than memories (concepts/lessons/...,
// per WIKI_SCHEMA) -- but the temporal walk enumerates real on-disk dirs at the
// sha via `ls-tree -r`, so we do NOT need a hardcoded wiki namespace list. The
// namespace of each hit is derived from the first path segment under the corpus
// root (blueprint risk 3: do not hardcode DEFAULT_NAMESPACES for wiki).
export const CORPUS_SPECS = {
  memories: { pathspec: "knowledge/memories", namespaces: DEFAULT_NAMESPACES },
  wiki: { pathspec: "knowledge/wiki", namespaces: null },
};

// Strict ISO-8601 with an explicit timezone designator (Z or +/-HH:MM). A bare
// date ("2026-06-01") or a zoneless datetime is REJECTED: `git log --until` would
// then interpret it in the host's local TZ, producing fleet-non-deterministic
// results (blueprint risk 4). Accepts: YYYY-MM-DD[T ]HH:MM[:SS[.fff]](Z|+/-HH[:]MM).
const ISO_WITH_TZ_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d{1,9})?(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Validate a caller-supplied as-of timestamp. Returns the trimmed ISO string on
 * success, or null on any failure (caller maps null to a typed reject). Mirrors the
 * weekly_synthesis_get NaN/negative-epoch discipline (memoryDispatcher.ts:704-711)
 * AND additionally requires an explicit offset so the walk is host-independent.
 * PURE.
 * @param {unknown} t
 * @returns {string | null}
 */
export function validateAsOf(t) {
  if (typeof t !== "string") return null;
  const trimmed = t.trim();
  if (!ISO_WITH_TZ_RE.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return trimmed;
}

/**
 * Derive the namespace (first path segment) of a corpus-relative file path.
 * "knowledge/memories/feedback/x.md" with corpusPathspec "knowledge/memories"
 * yields namespace "feedback". A file directly under the root yields "uncategorized".
 * PURE.
 * @param {string} fullRepoPath  - repo-relative path from `git ls-tree`.
 * @param {string} corpusPathspec
 * @returns {{ namespace: string, fileName: string }}
 */
export function deriveNamespaceAndFile(fullRepoPath, corpusPathspec) {
  const norm = String(fullRepoPath).replace(/\\/g, "/").replace(/^\.\//, "");
  const root = String(corpusPathspec).replace(/\\/g, "/").replace(/\/+$/, "") + "/";
  const rel = norm.startsWith(root) ? norm.slice(root.length) : norm;
  const parts = rel.split("/").filter(Boolean);
  const fileName = parts.length ? parts[parts.length - 1] : norm;
  const namespace = parts.length >= 2 ? parts[0] : "uncategorized";
  return { namespace, fileName };
}

/**
 * Resolve the as-of commit SHA for a corpus dir at-or-before timestamp T.
 * Uses `git log --until=<isoT> -1 --format=%H|%cI -- <corpusDir>`. `--until` is
 * git-INCLUSIVE of the boundary instant (a commit whose %cI === isoT IS included),
 * which is the desired "belief at exactly T" semantics.
 * PURE: gitExec injected. Never throws on "no commit" -- returns null.
 * @param {object} a
 * @param {string} a.isoT       - VALIDATED ISO-8601-with-offset (validate upstream).
 * @param {string} a.corpusDir  - repo-relative pathspec, e.g. "knowledge/memories".
 * @param {(args: string[]) => string} a.gitExec
 * @returns {{ sha: string, committedAt: string } | null}
 */
export function resolveAsOfCommit({ isoT, corpusDir, gitExec }) {
  if (typeof gitExec !== "function") throw new Error("resolveAsOfCommit requires a gitExec function");
  if (typeof isoT !== "string" || isoT.length === 0) throw new Error("resolveAsOfCommit requires isoT");
  if (typeof corpusDir !== "string" || corpusDir.length === 0) throw new Error("resolveAsOfCommit requires corpusDir");
  // `--` separates the (validated) pathspec from rev args; gitExec passes each
  // element as a discrete argv entry (execFileSync, no shell) so the pathspec can
  // never be re-interpreted as a flag or smuggle a second argument.
  const out = gitExec([
    "log",
    `--until=${isoT}`,
    "-1",
    "--format=%H|%cI",
    "--",
    corpusDir,
  ]);
  const line = String(out || "").trim();
  if (line.length === 0) return null; // no commit at-or-before T
  const bar = line.indexOf("|");
  if (bar < 0) return null;
  const sha = line.slice(0, bar).trim();
  const committedAt = line.slice(bar + 1).trim();
  if (!SHA_RE.test(sha)) return null;
  return { sha, committedAt };
}

/**
 * Score a file path cheaply (no subprocess) using the query tokens against the
 * path's namespace and file stem. This is used to prefilter the as-of file list
 * before any `git show` spawns, bounding O(corpus) to O(PREFILTER_K).
 *
 * Scoring: each query token matched in the stem gets 2 points; each matched in
 * the namespace gets 1 point; an unmatched path scores 0. The absolute values
 * don't matter -- only ranking. PURE.
 * @param {string} namespace
 * @param {string} fileName
 * @param {string[]} queryTokens  - already tokenized (from tokenize())
 * @returns {number}
 */
export function scorePathCheap(namespace, fileName, queryTokens) {
  if (queryTokens.length === 0) return 0;
  // Strip extension, split on separators, lowercase -- same decomposition the
  // BM25 scorer would see in the record's `name` field.
  const stem = fileName.replace(/\.md$/i, "").toLowerCase();
  const stemParts = new Set(stem.split(/[-_.\s]+/).filter(Boolean));
  const nsParts = new Set(String(namespace).toLowerCase().split(/[-_.\s]+/).filter(Boolean));
  let score = 0;
  for (const tok of queryTokens) {
    // Full-stem substring match: "reaper" in "feedback_golf_owns_reaper" -> 2pts
    if (stem.includes(tok)) score += 2;
    else if (stemParts.has(tok)) score += 2;
    if (nsParts.has(tok)) score += 1;
  }
  return score;
}

/**
 * Read every *.md under the corpus AS-OF a commit SHA.
 * Enumerates with `git ls-tree -r --name-only <sha> -- <corpusDir>` (NEVER live
 * readdir -- this is the point-in-time correctness invariant: a file renamed/added
 * after T must not appear; one renamed before T appears under its as-of name).
 *
 * PATH-PREFILTER (P1 fix): after enumerating paths, BM25-score them cheaply on
 * the file name/namespace (no subprocess) and take only the top prefilterK
 * candidates for `git show`. This bounds subprocess spawns to prefilterK
 * regardless of corpus size, making wiki (~17k files) complete in bounded time.
 * Files with path-score 0 that fit within prefilterK are included in insertion
 * order (so a query that doesn't match any path name still scores body text).
 *
 * BUDGET (P1 fix): an aggregate wall-clock budget (budgetMs) aborts mid-scan and
 * returns whatever records were collected plus timedOut:true. The caller turns
 * this into a typed partial/timeout result (never a hang).
 *
 * PURE: gitExec injected. A per-file git failure (path absent at sha => exit 128,
 * which execFileSync surfaces as a thrown Error) is SKIPPED, never fatal.
 * @param {object} a
 * @param {string} a.sha
 * @param {string} a.corpusDir
 * @param {string[]|null} a.namespaces - if non-null, restrict to these top-level dirs.
 * @param {(args: string[]) => string} a.gitExec
 * @param {number} [a.maxFiles=DEFAULT_MAX_FILES]  - cap on enumerated paths (backstop)
 * @param {number} [a.prefilterK=DEFAULT_PREFILTER_K] - max git-show spawns
 * @param {string[]} [a.queryTokens=[]]  - for path-prefilter scoring
 * @param {number} [a.budgetMs=DEFAULT_BUDGET_MS]  - aggregate wall-clock budget ms
 * @returns {{ records, filesListed, filesRead, filesSkipped, timedOut, candidatesSelected }}
 */
export function readCorpusAsOf({
  sha, corpusDir, namespaces, gitExec,
  maxFiles = DEFAULT_MAX_FILES,
  prefilterK = DEFAULT_PREFILTER_K,
  queryTokens = [],
  budgetMs = DEFAULT_BUDGET_MS,
}) {
  if (typeof gitExec !== "function") throw new Error("readCorpusAsOf requires a gitExec function");
  if (typeof sha !== "string" || !SHA_RE.test(sha)) throw new Error("readCorpusAsOf requires a valid sha");
  if (typeof corpusDir !== "string" || corpusDir.length === 0) throw new Error("readCorpusAsOf requires corpusDir");

  const lsOut = gitExec(["ls-tree", "-r", "--name-only", sha, "--", corpusDir]);
  const allPaths = String(lsOut || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((p) => p.length > 0 && /\.md$/i.test(p));

  const nsSet = Array.isArray(namespaces) && namespaces.length > 0 ? new Set(namespaces) : null;

  // Phase 1: enumerate + namespace-filter paths (cheap; no git show yet).
  // filesListed counts paths that pass the namespace filter and aren't scaffolding.
  const candidatePaths = []; // [{path, namespace, fileName}]
  let filesListed = 0;

  for (const p of allPaths) {
    const { namespace, fileName } = deriveNamespaceAndFile(p, corpusDir);
    // Skip the index/archive scaffolding files (mirror enumerateMemoryFiles).
    if (fileName === "MEMORY.md" || fileName === "MEMORY-ARCHIVE.md") continue;
    // namespace filter (memories corpus passes DEFAULT_NAMESPACES; wiki passes null => all).
    if (nsSet && !nsSet.has(namespace)) continue;
    filesListed += 1;
    if (filesListed > maxFiles) {
      // Fail loud rather than silently truncating belief (R12). The caller turns
      // this into a typed error result. With prefilterK this backstop rarely fires,
      // but it prevents a degenerate corpus from spawning unlimited processes.
      throw new Error(`as-of corpus exceeds maxFiles=${maxFiles} at sha ${sha} (${corpusDir}); refine the query or raise maxFiles`);
    }
    candidatePaths.push({ path: p, namespace, fileName });
  }

  // Phase 2: path-prefilter -- score paths cheaply, select top prefilterK.
  // Files with a positive path-score rank first; ties keep insertion order.
  // If prefilterK >= candidatePaths.length, all candidates are selected (no
  // information is discarded when the corpus is small enough).
  let selectedPaths;
  if (prefilterK >= candidatePaths.length) {
    selectedPaths = candidatePaths;
  } else {
    const tokens = Array.isArray(queryTokens) ? queryTokens : [];
    // Score all paths; stable sort descending so equal-score paths keep order.
    const scored = candidatePaths.map((c) => ({
      ...c,
      pathScore: scorePathCheap(c.namespace, c.fileName, tokens),
    }));
    scored.sort((a, b) => b.pathScore - a.pathScore);
    selectedPaths = scored.slice(0, prefilterK);
  }

  // Phase 3: git-show only the selected candidates, with aggregate budget guard.
  const records = [];
  let filesRead = 0;
  let filesSkipped = 0;
  let timedOut = false;
  const deadline = budgetMs > 0 ? Date.now() + budgetMs : Infinity;

  for (const { path: p, namespace, fileName } of selectedPaths) {
    if (Date.now() >= deadline) {
      timedOut = true;
      break;
    }
    let body;
    try {
      body = gitExec(["show", `${sha}:${p}`]);
    } catch {
      // exit 128 (path absent at sha) -- expected for files added/renamed after T.
      filesSkipped += 1;
      continue;
    }
    if (typeof body !== "string") { filesSkipped += 1; continue; }
    records.push({ namespace, fileName, body });
    filesRead += 1;
  }

  return { records, filesListed, filesRead, filesSkipped, timedOut, candidatesSelected: selectedPaths.length };
}

/**
 * Top-level point-in-time recall. Resolves the as-of commit, reads the as-of
 * corpus, builds records (buildMemoryRecord) and scores them via the existing
 * BM25 scorer (scoreMemoryRecord). PURE: gitExec injected.
 *
 * P1 fix: passes queryTokens + budgetMs + prefilterK to readCorpusAsOf so that
 * only the top prefilterK path-scored candidates are git-shown (O(K) spawns,
 * not O(corpus)), and an aggregate budget aborts with a typed result on timeout.
 * corpus="wiki" (17k+ files) now completes within budget rather than hanging.
 *
 * @param {string} query
 * @param {object} opts
 * @param {string} opts.asOf              - REQUIRED ISO-8601-with-offset.
 * @param {(args:string[])=>string} opts.gitExec - REQUIRED injected git runner.
 * @param {number} [opts.topK=5]
 * @param {string} [opts.corpus="memories"] - "memories" | "wiki".
 * @param {string[]} [opts.namespaces]     - override the corpus default namespace set.
 * @param {number} [opts.maxFiles=DEFAULT_MAX_FILES]
 * @param {number} [opts.maxBodyBytes=4096]
 * @param {number} [opts.prefilterK=DEFAULT_PREFILTER_K]  - max git-show spawns
 * @param {number} [opts.budgetMs=DEFAULT_BUDGET_MS]      - aggregate wall-clock budget
 * @returns {object} TemporalRecallResult
 */
export function recallAsOf(query, opts = {}) {
  const corpusName = typeof opts.corpus === "string" ? opts.corpus : "memories";
  const spec = CORPUS_SPECS[corpusName];

  const base = {
    query: typeof query === "string" ? query : "",
    asOfRequested: typeof opts.asOf === "string" ? opts.asOf : null,
    corpus: corpusName,
    resolved: null,
    tokens: [],
    hits: [],
    filesScanned: 0,
    source: "git-as-of",
  };

  // corpus must be a known key -- never let a caller-controlled string reach gitExec.
  if (!spec) {
    return { ...base, error: "unknown-corpus", note: `corpus must be one of: ${Object.keys(CORPUS_SPECS).join(", ")}` };
  }

  // Validate as-of BEFORE any git call (blueprint risk 4; fail loud on misuse).
  const isoT = validateAsOf(opts.asOf);
  if (isoT === null) {
    return { ...base, error: "invalid-as-of", note: "asOf must be a fully-qualified ISO-8601 timestamp with an explicit offset (Z or +/-HH:MM)" };
  }
  base.asOfRequested = isoT;

  if (typeof opts.gitExec !== "function") {
    return { ...base, error: "missing-git-exec", note: "recallAsOf requires an injected gitExec(args) function" };
  }
  const gitExec = opts.gitExec;

  // Empty/whitespace query => no tokens => empty hits (mirror runMemoryIndexSearch:805).
  const tokens = tokenize(query);
  base.tokens = tokens;
  if (tokens.length < 1) return base;

  const topK = Number.isFinite(opts.topK) && opts.topK > 0 ? Math.min(MAX_TOP_K, Math.floor(opts.topK)) : DEFAULT_TOP_K;
  const maxFiles = Number.isFinite(opts.maxFiles) && opts.maxFiles > 0 ? Math.floor(opts.maxFiles) : DEFAULT_MAX_FILES;
  const maxBodyBytes = Number.isFinite(opts.maxBodyBytes) && opts.maxBodyBytes > 0 ? Math.floor(opts.maxBodyBytes) : DEFAULT_MAX_BODY_BYTES;
  const prefilterK = Number.isFinite(opts.prefilterK) && opts.prefilterK > 0 ? Math.floor(opts.prefilterK) : DEFAULT_PREFILTER_K;
  const budgetMs = Number.isFinite(opts.budgetMs) && opts.budgetMs >= 0 ? opts.budgetMs : DEFAULT_BUDGET_MS;
  const namespaces = Array.isArray(opts.namespaces) ? opts.namespaces : spec.namespaces;

  // 1. Resolve the as-of commit.
  const resolved = resolveAsOfCommit({ isoT, corpusDir: spec.pathspec, gitExec });
  if (resolved === null) {
    return { ...base, resolved: null, error: "no-commit-before-T", note: `no commit touches ${spec.pathspec} at-or-before ${isoT}` };
  }
  base.resolved = resolved;

  // 2. Read the as-of corpus (bounded by prefilterK + budgetMs).
  //    May throw on maxFiles overflow (backstop cap) => typed error.
  //    Returns timedOut:true if the budget was exhausted mid-scan => typed partial.
  let read;
  try {
    read = readCorpusAsOf({
      sha: resolved.sha,
      corpusDir: spec.pathspec,
      namespaces,
      gitExec,
      maxFiles,
      prefilterK,
      queryTokens: tokens,
      budgetMs,
    });
  } catch (e) {
    return { ...base, resolved, error: "as-of-read-failed", note: (e && e.message) ? e.message : String(e) };
  }
  base.filesScanned = read.filesRead;

  // Partial/timeout result: return what was scored so far with a typed indicator.
  // Never return an error -- partial hits are valid and useful (R12: don't silently discard).
  if (read.timedOut) {
    base.partial = true;
    base.note = `recall timed out after ${budgetMs}ms; ${read.filesRead} of ${read.candidatesSelected} candidates scanned. Narrow your query or increase PRISM_TEMPORAL_RECALL_BUDGET_MS.`;
  }

  // 3. Build + score records with the existing BM25 scorer (R8 reuse).
  const scored = [];
  const byKey = new Map();
  for (const { namespace, fileName, body } of read.records) {
    const rec = buildMemoryRecord({ namespace, fileName, body, maxBodyBytes });
    if (!rec) continue;
    const key = recordKey(rec);
    if (byKey.has(key)) continue; // de-dup identical namespace/name (rename-stable)
    byKey.set(key, rec);
    const score = scoreMemoryRecord(rec, tokens);
    if (score <= 0) continue;
    scored.push({ rec, score });
  }
  scored.sort((a, b) => b.score - a.score || a.rec.name.localeCompare(b.rec.name));

  base.hits = scored.slice(0, topK).map(({ rec, score }) => ({
    name: rec.name,
    fileName: rec.fileName,
    namespace: rec.namespace,
    score,
    description: rec.description || "",
    opening: (rec.opening || "").slice(0, OPENING_PREVIEW_BYTES),
    matchedTokens: matchedTokens(rec, tokens),
  }));

  return base;
}
