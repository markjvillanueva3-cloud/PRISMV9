#!/usr/bin/env node
/**
 * temporal-memory-recall-lib.test.mjs -- node:test suite for HMEMV03
 * (temporal-aware recall / point-in-time belief query).
 *
 * Every test injects a FAKE gitExec (a Map<argsKey, stdout | thrown Error>), so the
 * suite runs hermetically -- no live repo, deterministic. Reference values below are
 * GROUND TRUTH from the live H:/prism repo (verified this session):
 *   - as-of commit for T=2026-06-01T00:00:00Z over knowledge/memories/:
 *       df88a988b92e987deff098d1188784494e6231bb | 2026-05-31T02:58:04-05:00
 *   - feedback_psn_definition.md present at that sha (git show exit 0)
 *   - feedback_golf_owns_reaper.md ABSENT at that sha (git show exit 128) -- added after T
 *   - T=2020-01-01 over knowledge/memories/ -> empty stdout (no commit before T)
 *   - 121 commits touch knowledge/memories/
 *
 * Invariants pinned (CLAUDE.md R9 -- tests verify intent, not behavior):
 *   - resolveAsOfCommit parses the exact %H|%cI line into {sha,committedAt}.
 *   - recallAsOf enumerates the AS-OF names (ls-tree), reads as-of blobs (show),
 *     and scores with the SHARED BM25 scorer (so a file ADDED after T can never
 *     surface, and the highest scorer for the query ranks first).
 *   - no-commit-before-T -> resolved:null, never a throw.
 *   - git show exit 128 for one file -> that file skipped, others still scored.
 *   - invalid as-of -> typed reject, git NEVER consulted.
 *   - query/corpus are never concatenated into a gitExec arg (arg-injection safe).
 *   - --until boundary commit is INCLUDED (inclusive).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateAsOf,
  deriveNamespaceAndFile,
  resolveAsOfCommit,
  readCorpusAsOf,
  recallAsOf,
  scorePathCheap,
  CORPUS_SPECS,
  DEFAULT_BUDGET_MS,
} from "./temporal-memory-recall-lib.mjs";
import { buildMemoryRecord, tokenize } from "./memory-index-search-lib.mjs";

// ---------------------------------------------------------------------------
// Fake gitExec factory. Keys are the JSON of the args array (stable, exact). A
// value that is an Error instance is THROWN (mirrors execFileSync on non-zero
// exit, which carries .status); any other value is returned as stdout. Every
// gitExec call is recorded so we can assert on the EXACT argv (arg-injection).
// ---------------------------------------------------------------------------
function makeFakeGit(map) {
  const calls = [];
  const fake = (args) => {
    calls.push(args.slice());
    const key = JSON.stringify(args);
    if (!Object.prototype.hasOwnProperty.call(map, key)) {
      // Unmapped git show => simulate exit 128 (path absent at sha). Unmapped
      // anything else is a test-author error -> throw a distinctive marker.
      if (args[0] === "show") {
        const e = new Error(`fatal: path '${args[1]}' exists on disk, but not in commit`);
        e.status = 128;
        throw e;
      }
      throw new Error(`FAKE-GIT-UNMAPPED: ${key}`);
    }
    const v = map[key];
    if (v instanceof Error) throw v;
    return v;
  };
  fake.calls = calls;
  return fake;
}

const SHA = "df88a988b92e987deff098d1188784494e6231bb";
const COMMITTED_AT = "2026-05-31T02:58:04-05:00";
const T = "2026-06-01T00:00:00Z";
const MEM = "knowledge/memories";

function logKey(isoT, dir) {
  return JSON.stringify(["log", `--until=${isoT}`, "-1", "--format=%H|%cI", "--", dir]);
}
function lsKey(sha, dir) {
  return JSON.stringify(["ls-tree", "-r", "--name-only", sha, "--", dir]);
}
function showKey(sha, path) {
  return JSON.stringify(["show", `${sha}:${path}`]);
}

// Real-shaped memory bodies (frontmatter + body), so the SHARED scorer runs for
// real -- these mirror the actual files at the as-of sha.
const GOLF_BODY = `---
description: "golf owns the fleet reaper -- doctrine moved from alpha"
---

# feedback_golf_owns_reaper

golf owns the reaper. The golf-slot-reaper-guardian hook is wired; the alpha
reaper is unwired and preserved.`;

const PSN_BODY = `---
description: "PSN canonical 11-leg taxonomy"
---

# feedback_psn_definition

Obsidian brain + PRISM OS + Wiki + Memories + Tribal + System Viz.`;

// ===========================================================================
// validateAsOf -- the misuse gate (must run BEFORE any git call)
// ===========================================================================
describe("validateAsOf", () => {
  it("accepts a fully-qualified ISO with Z offset", () => {
    assert.equal(validateAsOf("2026-06-01T00:00:00Z"), "2026-06-01T00:00:00Z");
  });
  it("accepts an explicit numeric offset and a space separator", () => {
    assert.equal(validateAsOf("2026-05-31T02:58:04-05:00"), "2026-05-31T02:58:04-05:00");
    assert.equal(validateAsOf("2026-05-31 02:58:04-0500"), "2026-05-31 02:58:04-0500");
  });
  it("REJECTS a bare date (would silently mean host-local-midnight)", () => {
    assert.equal(validateAsOf("2026-06-01"), null);
  });
  it("REJECTS a zoneless datetime", () => {
    assert.equal(validateAsOf("2026-06-01T00:00:00"), null);
  });
  it("REJECTS garbage / NaN / non-string", () => {
    assert.equal(validateAsOf("not-a-date"), null);
    assert.equal(validateAsOf(""), null);
    assert.equal(validateAsOf(null), null);
    assert.equal(validateAsOf(1717200000000), null);
  });
});

// ===========================================================================
// deriveNamespaceAndFile -- as-of path -> {namespace,fileName}
// ===========================================================================
describe("deriveNamespaceAndFile", () => {
  it("splits a memories path into namespace + fileName", () => {
    assert.deepEqual(
      deriveNamespaceAndFile("knowledge/memories/feedback/feedback_golf_owns_reaper.md", MEM),
      { namespace: "feedback", fileName: "feedback_golf_owns_reaper.md" }
    );
  });
  it("derives a wiki namespace from its own layout (not memory namespaces)", () => {
    assert.deepEqual(
      deriveNamespaceAndFile("knowledge/wiki/lessons/golf-reaper.md", "knowledge/wiki"),
      { namespace: "lessons", fileName: "golf-reaper.md" }
    );
  });
  it("a file directly under root -> uncategorized", () => {
    assert.deepEqual(
      deriveNamespaceAndFile("knowledge/memories/loose.md", MEM),
      { namespace: "uncategorized", fileName: "loose.md" }
    );
  });
});

// ===========================================================================
// resolveAsOfCommit -- HAPPY PATH 1
// ===========================================================================
describe("resolveAsOfCommit", () => {
  it("parses the exact %H|%cI line (live reference value)", () => {
    const git = makeFakeGit({ [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n` });
    const r = resolveAsOfCommit({ isoT: T, corpusDir: MEM, gitExec: git });
    assert.equal(r.sha, SHA);
    assert.equal(r.committedAt, COMMITTED_AT);
  });

  it("returns null on empty stdout (no commit at-or-before T)", () => {
    const git = makeFakeGit({ [logKey("2020-01-01T00:00:00Z", MEM)]: "" });
    const r = resolveAsOfCommit({ isoT: "2020-01-01T00:00:00Z", corpusDir: MEM, gitExec: git });
    assert.equal(r, null);
  });

  it("throws if gitExec is not a function (programming error, fail loud)", () => {
    assert.throws(() => resolveAsOfCommit({ isoT: T, corpusDir: MEM, gitExec: null }));
  });
});

// ===========================================================================
// recallAsOf -- HAPPY PATH 2 (scores the as-of corpus via the shared scorer)
// ===========================================================================
describe("recallAsOf -- happy path", () => {
  it("scores the as-of corpus; top hit is golf_owns_reaper for 'golf reaper owns'", () => {
    const golfPath = `${MEM}/feedback/feedback_golf_owns_reaper.md`;
    const psnPath = `${MEM}/feedback/feedback_psn_definition.md`;
    const git = makeFakeGit({
      [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n`,
      [lsKey(SHA, MEM)]: `${golfPath}\n${psnPath}\n`,
      [showKey(SHA, golfPath)]: GOLF_BODY,
      [showKey(SHA, psnPath)]: PSN_BODY,
    });
    const r = recallAsOf("golf reaper owns", { asOf: T, gitExec: git, topK: 5 });

    assert.equal(r.source, "git-as-of");
    assert.equal(r.corpus, "memories");
    assert.equal(r.resolved.sha, SHA);
    assert.equal(r.resolved.committedAt, COMMITTED_AT);
    assert.equal(r.asOfRequested, T);
    assert.ok(r.hits.length >= 1, "expected at least one hit");
    assert.equal(r.hits[0].fileName, "feedback_golf_owns_reaper.md");
    assert.ok(r.hits[0].score > 0, "top hit must have positive score");
    // 'owns' is NOT a stopword in the lib STOPWORDS set, but 'golf'+'reaper' are
    // the load-bearing matches. matchedTokens must include both.
    assert.ok(r.hits[0].matchedTokens.includes("golf"), "matched 'golf'");
    assert.ok(r.hits[0].matchedTokens.includes("reaper"), "matched 'reaper'");
    assert.equal(r.filesScanned, 2);
  });

  it("INCLUSIVE --until: when T exactly equals the boundary commit %cI, it resolves", () => {
    // Adversarial twist: caller passes T === the commit's own committedAt. git
    // --until is inclusive, so the boundary commit IS returned. We model the fake
    // git as returning that same commit for the boundary instant.
    const git = makeFakeGit({
      [logKey(COMMITTED_AT, MEM)]: `${SHA}|${COMMITTED_AT}\n`,
      [lsKey(SHA, MEM)]: `${MEM}/feedback/feedback_psn_definition.md\n`,
      [showKey(SHA, `${MEM}/feedback/feedback_psn_definition.md`)]: PSN_BODY,
    });
    const r = recallAsOf("psn taxonomy", { asOf: COMMITTED_AT, gitExec: git });
    assert.equal(r.resolved.sha, SHA, "boundary commit must be included (inclusive --until)");
  });

  it("argv carries the pathspec as a SEPARATE element (never concatenated)", () => {
    const git = makeFakeGit({ [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n`, [lsKey(SHA, MEM)]: "" });
    recallAsOf("anything", { asOf: T, gitExec: git });
    const logCall = git.calls.find((c) => c[0] === "log");
    assert.ok(logCall, "git log was called");
    // last two args are the separator and the EXACT pathspec
    assert.equal(logCall[logCall.length - 2], "--");
    assert.equal(logCall[logCall.length - 1], "knowledge/memories");
  });
});

// ===========================================================================
// FAILURE MODE 3 -- no commit before T -> resolved:null, no throw
// ===========================================================================
describe("recallAsOf -- failure: no commit before T", () => {
  it("returns resolved:null + error:no-commit-before-T, never throws", () => {
    const early = "2020-01-01T00:00:00Z";
    const git = makeFakeGit({ [logKey(early, MEM)]: "" });
    const r = recallAsOf("golf reaper", { asOf: early, gitExec: git });
    assert.equal(r.resolved, null);
    assert.equal(r.hits.length, 0);
    assert.equal(r.error, "no-commit-before-T");
    // ls-tree / show must NOT have been attempted.
    assert.ok(!git.calls.some((c) => c[0] === "ls-tree"), "no ls-tree on missing commit");
  });
});

// ===========================================================================
// FAILURE MODE 4 -- git show exit 128 for one file -> skip, not fatal
// ===========================================================================
describe("readCorpusAsOf -- failure: file absent at sha (exit 128) is skipped", () => {
  it("drops the exit-128 file, still scores the others", () => {
    const golfPath = `${MEM}/feedback/feedback_golf_owns_reaper.md`;
    const psnPath = `${MEM}/feedback/feedback_psn_definition.md`;
    const e128 = new Error(`fatal: path '${golfPath}' exists on disk, but not in '${SHA}'`);
    e128.status = 128;
    const git = makeFakeGit({
      [lsKey(SHA, MEM)]: `${golfPath}\n${psnPath}\n`,
      [showKey(SHA, golfPath)]: e128, // throws -> skipped
      [showKey(SHA, psnPath)]: PSN_BODY,
    });
    const out = readCorpusAsOf({ sha: SHA, corpusDir: MEM, namespaces: CORPUS_SPECS.memories.namespaces, gitExec: git });
    assert.equal(out.filesRead, 1, "only the present file read");
    assert.equal(out.filesSkipped, 1, "the exit-128 file skipped");
    assert.equal(out.records.length, 1);
    assert.equal(out.records[0].fileName, "feedback_psn_definition.md");
  });

  it("recallAsOf end-to-end: a file ADDED after T (absent at sha) never surfaces", () => {
    // ls-tree at the as-of sha lists ONLY psn (golf was added after T, so it is
    // not in the as-of tree at all -- the correct point-in-time behavior).
    const psnPath = `${MEM}/feedback/feedback_psn_definition.md`;
    const git = makeFakeGit({
      [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n`,
      [lsKey(SHA, MEM)]: `${psnPath}\n`,
      [showKey(SHA, psnPath)]: PSN_BODY,
    });
    const r = recallAsOf("golf reaper owns", { asOf: T, gitExec: git });
    // golf_owns_reaper must NOT appear -- it did not exist at T.
    assert.ok(!r.hits.some((h) => h.fileName === "feedback_golf_owns_reaper.md"),
      "a memo added after T must never appear in as-of recall");
  });
});

// ===========================================================================
// FAILURE MODE 5 -- invalid as-of / empty query
// ===========================================================================
describe("recallAsOf -- failure: invalid input", () => {
  it("invalid as-of -> error:invalid-as-of, git NEVER consulted", () => {
    let called = false;
    const git = () => { called = true; return ""; };
    const r = recallAsOf("golf", { asOf: "not-a-date", gitExec: git });
    assert.equal(r.error, "invalid-as-of");
    assert.equal(r.resolved, null);
    assert.equal(called, false, "git must not be consulted for an invalid as-of");
  });

  it("bare date is rejected the same way (host-TZ non-determinism guard)", () => {
    let called = false;
    const git = () => { called = true; return ""; };
    const r = recallAsOf("golf", { asOf: "2026-06-01", gitExec: git });
    assert.equal(r.error, "invalid-as-of");
    assert.equal(called, false);
  });

  it("missing gitExec -> error:missing-git-exec (not a crash)", () => {
    const r = recallAsOf("golf", { asOf: T });
    assert.equal(r.error, "missing-git-exec");
  });

  it("empty/whitespace query -> tokens:[] hits:[] (after valid as-of)", () => {
    const git = makeFakeGit({ [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n`, [lsKey(SHA, MEM)]: "" });
    const r = recallAsOf("   ", { asOf: T, gitExec: git });
    assert.deepEqual(r.tokens, []);
    assert.equal(r.hits.length, 0);
    // it short-circuits before resolving a commit (no git log needed for 0 tokens)
    assert.ok(!git.calls.some((c) => c[0] === "log"), "0-token query short-circuits before git");
  });
});

// ===========================================================================
// ADVERSARIAL 6 -- path/arg injection in query or corpus
// ===========================================================================
describe("recallAsOf -- adversarial: injection is inert", () => {
  it("a shell-metachar query is only tokenized, never reaches gitExec args", () => {
    const git = makeFakeGit({ [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n`, [lsKey(SHA, MEM)]: "" });
    recallAsOf("; rm -rf / --no-preserve-root", { asOf: T, gitExec: git });
    // No gitExec arg, in any call, may contain the raw injection payload.
    for (const call of git.calls) {
      for (const arg of call) {
        assert.ok(!String(arg).includes("rm -rf"), `injection leaked into git arg: ${arg}`);
      }
    }
  });

  it("an unknown corpus is rejected with error:unknown-corpus (no git, no pathspec leak)", () => {
    let called = false;
    const git = () => { called = true; return ""; };
    const r = recallAsOf("golf", { asOf: T, corpus: "memories; touch pwned", gitExec: git });
    assert.equal(r.error, "unknown-corpus");
    assert.equal(called, false, "unknown corpus must not reach gitExec");
  });

  it("corpus is read from a fixed allowlist; the pathspec is a constant, not caller text", () => {
    const git = makeFakeGit({ [logKey(T, "knowledge/wiki")]: `${SHA}|${COMMITTED_AT}\n`, [lsKey(SHA, "knowledge/wiki")]: "" });
    recallAsOf("golf", { asOf: T, corpus: "wiki", gitExec: git });
    const logCall = git.calls.find((c) => c[0] === "log");
    assert.equal(logCall[logCall.length - 1], "knowledge/wiki", "wiki corpus -> fixed wiki pathspec");
  });
});

// ===========================================================================
// ADVERSARIAL 7 -- future T, maxFiles overflow, scorer-import coupling
// ===========================================================================
describe("recallAsOf -- adversarial: future T, DoS cap, scorer coupling", () => {
  it("future T resolves to HEAD (belief now), not an error", () => {
    const future = "2099-01-01T00:00:00Z";
    const psnPath = `${MEM}/feedback/feedback_psn_definition.md`;
    const git = makeFakeGit({
      [logKey(future, MEM)]: `${SHA}|${COMMITTED_AT}\n`, // git returns the latest commit <= future
      [lsKey(SHA, MEM)]: `${psnPath}\n`,
      [showKey(SHA, psnPath)]: PSN_BODY,
    });
    const r = recallAsOf("psn taxonomy", { asOf: future, gitExec: git });
    assert.equal(r.resolved.sha, SHA);
    // committedAt is <= now (it is a real past commit), proving "belief now".
    assert.ok(Date.parse(r.resolved.committedAt) <= Date.now());
  });

  it("maxFiles overflow -> typed error:as-of-read-failed, never silent truncation", () => {
    // ls-tree lists 3 md files but maxFiles=2 -> readCorpusAsOf throws on the 3rd.
    const paths = [1, 2, 3].map((i) => `${MEM}/feedback/feedback_${i}.md`);
    const map = {
      [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n`,
      [lsKey(SHA, MEM)]: paths.join("\n") + "\n",
    };
    for (const p of paths) map[showKey(SHA, p)] = PSN_BODY;
    const git = makeFakeGit(map);
    const r = recallAsOf("psn", { asOf: T, gitExec: git, maxFiles: 2 });
    assert.equal(r.error, "as-of-read-failed");
    assert.match(r.note, /maxFiles=2/);
  });

  it("a sha with only empty/non-matching bodies -> hits:[] not a crash", () => {
    const p = `${MEM}/feedback/feedback_unrelated.md`;
    const git = makeFakeGit({
      [logKey(T, MEM)]: `${SHA}|${COMMITTED_AT}\n`,
      [lsKey(SHA, MEM)]: `${p}\n`,
      [showKey(SHA, p)]: "---\ndescription: \"a totally unrelated topic about anodizing\"\n---\n\nbody text",
    });
    const r = recallAsOf("golf reaper", { asOf: T, gitExec: git });
    assert.equal(r.hits.length, 0, "no token match -> empty hits, no crash");
    assert.equal(r.resolved.sha, SHA);
  });

  it("buildMemoryRecord (imported scorer dependency) produces the expected record shape", () => {
    // Pin the coupling (blueprint risk 7): if buildMemoryRecord's output shape
    // changes upstream, HMEMV03 fails LOUDLY here.
    const rec = buildMemoryRecord({ namespace: "feedback", fileName: "feedback_golf_owns_reaper.md", body: GOLF_BODY });
    assert.ok(rec, "record built");
    for (const k of ["name", "fileName", "namespace", "description", "aliases", "opening"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(rec, k), `record has '${k}'`);
    }
    assert.equal(rec.name, "feedback_golf_owns_reaper");
    assert.equal(rec.namespace, "feedback");
    assert.ok(Array.isArray(rec.aliases));
  });
});

// ===========================================================================
// P1 FIX -- scorePathCheap: path-prefilter scoring (no subprocess)
// ===========================================================================
describe("scorePathCheap -- path prefilter", () => {
  it("matches a query token in the file stem -> positive score", () => {
    const tokens = tokenize("reaper");
    const score = scorePathCheap("feedback", "feedback_golf_owns_reaper.md", tokens);
    assert.ok(score > 0, "stem contains 'reaper' -> positive");
  });

  it("matches a query token in the namespace -> lower score than stem match", () => {
    const tokens = tokenize("feedback");
    const stemScore = scorePathCheap("other", "feedback_something.md", tokens);
    const nsScore = scorePathCheap("feedback", "unrelated_file.md", tokens);
    // stem match scores 2, namespace match scores 1
    assert.ok(stemScore >= nsScore, "stem match >= namespace match");
    assert.ok(nsScore > 0, "namespace match is positive");
  });

  it("no query token matches -> score 0", () => {
    const tokens = tokenize("reaper");
    assert.equal(scorePathCheap("feedback", "feedback_psn_definition.md", tokens), 0);
  });

  it("empty tokens -> score 0", () => {
    assert.equal(scorePathCheap("feedback", "feedback_golf_owns_reaper.md", []), 0);
  });

  it("ranks golf_owns_reaper above psn_definition for 'golf reaper' query", () => {
    const tokens = tokenize("golf reaper");
    const golfScore = scorePathCheap("feedback", "feedback_golf_owns_reaper.md", tokens);
    const psnScore = scorePathCheap("feedback", "feedback_psn_definition.md", tokens);
    assert.ok(golfScore > psnScore, `golf(${golfScore}) should outscore psn(${psnScore})`);
  });
});

// ===========================================================================
// P1 FIX -- prefilterK: git-show spawns bounded regardless of corpus size
// ===========================================================================
describe("readCorpusAsOf -- prefilterK bounds git-show spawns", () => {
  it("with 5 paths and prefilterK=2, only 2 git-show calls are made", () => {
    // Build 5 candidate paths; the fake gitExec only maps show for the top-2
    // path-scoring ones -- any show beyond that would throw FAKE-GIT-UNMAPPED.
    const paths = ["reaper", "golf", "psn", "lathe", "mill"].map(
      (n) => `${MEM}/feedback/feedback_${n}.md`
    );
    const map = { [lsKey(SHA, MEM)]: paths.join("\n") + "\n" };
    // The query is "reaper golf" -- those two files should rank first by path score.
    // Only map show for them; the other 3 are intentionally unmapped to prove
    // they are never fetched.
    map[showKey(SHA, `${MEM}/feedback/feedback_reaper.md`)] = PSN_BODY;
    map[showKey(SHA, `${MEM}/feedback/feedback_golf.md`)] = GOLF_BODY;
    const git = makeFakeGit(map);
    const out = readCorpusAsOf({
      sha: SHA,
      corpusDir: MEM,
      namespaces: CORPUS_SPECS.memories.namespaces,
      gitExec: git,
      maxFiles: 500,
      prefilterK: 2,
      queryTokens: tokenize("reaper golf"),
      budgetMs: 0, // unlimited for this test
    });
    const showCalls = git.calls.filter((c) => c[0] === "show");
    assert.equal(showCalls.length, 2, "exactly 2 git-show calls for prefilterK=2");
    assert.equal(out.filesRead, 2);
    assert.equal(out.timedOut, false);
  });

  it("when prefilterK >= candidatePaths.length, all paths are shown (no info loss on small corpus)", () => {
    const golfPath = `${MEM}/feedback/feedback_golf_owns_reaper.md`;
    const psnPath = `${MEM}/feedback/feedback_psn_definition.md`;
    const map = {
      [lsKey(SHA, MEM)]: `${golfPath}\n${psnPath}\n`,
      [showKey(SHA, golfPath)]: GOLF_BODY,
      [showKey(SHA, psnPath)]: PSN_BODY,
    };
    const git = makeFakeGit(map);
    const out = readCorpusAsOf({
      sha: SHA, corpusDir: MEM,
      namespaces: CORPUS_SPECS.memories.namespaces,
      gitExec: git,
      maxFiles: 500, prefilterK: 200,
      queryTokens: tokenize("psn"),
      budgetMs: 0,
    });
    assert.equal(out.filesRead, 2, "all 2 files shown when prefilterK >= count");
    assert.equal(out.candidatesSelected, 2);
  });

  it("candidatesSelected is reported in the return value", () => {
    const psnPath = `${MEM}/feedback/feedback_psn_definition.md`;
    const git = makeFakeGit({
      [lsKey(SHA, MEM)]: `${psnPath}\n`,
      [showKey(SHA, psnPath)]: PSN_BODY,
    });
    const out = readCorpusAsOf({
      sha: SHA, corpusDir: MEM,
      namespaces: null,
      gitExec: git,
      maxFiles: 500, prefilterK: 200,
      queryTokens: [],
      budgetMs: 0,
    });
    assert.ok(typeof out.candidatesSelected === "number", "candidatesSelected is a number");
    assert.equal(out.candidatesSelected, 1);
  });
});

// ===========================================================================
// P1 FIX -- budgetMs: aggregate wall-clock budget aborts mid-scan
// ===========================================================================
describe("readCorpusAsOf -- budgetMs budget-abort path", () => {
  it("timedOut:true when budget expires after the 1st show; remaining files not fetched", () => {
    // Strategy: patch Date.now so the deadline expires after the first git-show
    // returns. This is hermetic (no real sleep) and proves the abort loop works.
    const paths = [1, 2, 3].map((i) => `${MEM}/feedback/feedback_${i}.md`);
    const map = { [lsKey(SHA, MEM)]: paths.join("\n") + "\n" };
    for (const p of paths) map[showKey(SHA, p)] = PSN_BODY;

    const realDateNow = Date.now;
    let showsSeen = 0;
    const patchedGit = (args) => {
      if (args[0] === "show") {
        showsSeen += 1;
        // After the first show, advance the clock past any possible deadline.
        if (showsSeen >= 1) Date.now = () => realDateNow() + 999999;
      }
      const key = JSON.stringify(args);
      if (map[key] instanceof Error) throw map[key];
      if (map[key] !== undefined) return map[key];
      const e = new Error("absent"); e.status = 128; throw e;
    };

    let out;
    try {
      out = readCorpusAsOf({
        sha: SHA, corpusDir: MEM, namespaces: null,
        gitExec: patchedGit, maxFiles: 500, prefilterK: 200,
        queryTokens: [], budgetMs: 1,
      });
    } finally {
      Date.now = realDateNow;
    }

    assert.equal(out.timedOut, true, "timedOut must be true when budget exhausted");
    assert.equal(out.filesRead, 1, "only the first file read before abort");
  });

  it("recallAsOf propagates partial:true and a note when timedOut", () => {
    // Manufacture a timedOut scenario at the recallAsOf level.
    const paths = [1, 2, 3].map((i) => `${MEM}/feedback/feedback_psn_${i}.md`);
    const bodyMap = {};
    for (const p of paths) bodyMap[showKey(SHA, p)] = PSN_BODY;
    const realDateNow = Date.now;
    let showsSeen = 0;
    const patchedGit = (args) => {
      if (args[0] === "log") return `${SHA}|${COMMITTED_AT}\n`;
      if (args[0] === "ls-tree") return paths.join("\n") + "\n";
      if (args[0] === "show") {
        showsSeen += 1;
        if (showsSeen >= 1) Date.now = () => realDateNow() + 999999;
        const key = JSON.stringify(args);
        if (bodyMap[key]) return bodyMap[key];
        const e = new Error("absent"); e.status = 128; throw e;
      }
      throw new Error(`UNMAPPED: ${JSON.stringify(args)}`);
    };
    let r;
    try {
      r = recallAsOf("psn taxonomy", {
        asOf: T, gitExec: patchedGit, budgetMs: 1,
      });
    } finally {
      Date.now = realDateNow;
    }
    assert.equal(r.partial, true, "partial:true on timeout");
    assert.ok(typeof r.note === "string" && r.note.length > 0, "note must be non-empty");
    assert.ok(r.note.includes("timed out"), `note should mention timeout; got: ${r.note}`);
    // hits may be empty or partial -- not an error field.
    assert.ok(!r.error, `should not have error field; got: ${r.error}`);
  });
});

// ===========================================================================
// P1 FIX -- DEFAULT_MAX_FILES lowered: cap fires below real corpus sizes
// ===========================================================================
describe("readCorpusAsOf -- lowered DEFAULT_MAX_FILES cap fires on large corpora", () => {
  it("paths exceeding maxFiles -> throws too-many-files, propagates as as-of-read-failed", () => {
    // Build maxFiles+1 paths; namespace filter passes all (namespaces=null for wiki).
    // Pass an explicit maxFiles=50 so the test is self-contained and independent of
    // the DEFAULT_MAX_FILES constant (which is sized for real corpora, not tests).
    const WIKI = "knowledge/wiki";
    const CAP = 50;
    const paths = Array.from({ length: CAP + 1 }, (_, i) => `${WIKI}/lessons/entry_${i}.md`);
    const git = makeFakeGit({
      [logKey(T, WIKI)]: `${SHA}|${COMMITTED_AT}\n`,
      [lsKey(SHA, WIKI)]: paths.join("\n") + "\n",
    });
    const r = recallAsOf("psn", { asOf: T, corpus: "wiki", gitExec: git, maxFiles: CAP });
    assert.equal(r.error, "as-of-read-failed");
    assert.ok(r.note && r.note.includes(`maxFiles=${CAP}`),
      `note should cite maxFiles=${CAP}; got: ${r.note}`);
  });

  it("exactly maxFiles paths passes without error (boundary is inclusive)", () => {
    // filesListed reaches CAP which is NOT > CAP, so no throw.
    const CAP = 50;
    const paths = Array.from({ length: CAP }, (_, i) => `${MEM}/feedback/feedback_${i}.md`);
    const map = { [lsKey(SHA, MEM)]: paths.join("\n") + "\n" };
    map[showKey(SHA, paths[0])] = PSN_BODY;
    const git = makeFakeGit(map);
    const out = readCorpusAsOf({
      sha: SHA, corpusDir: MEM, namespaces: null,
      gitExec: git, maxFiles: CAP, prefilterK: 1,
      queryTokens: tokenize("psn"), budgetMs: 0,
    });
    assert.equal(out.filesListed, CAP);
    assert.equal(out.timedOut, false);
  });
});
