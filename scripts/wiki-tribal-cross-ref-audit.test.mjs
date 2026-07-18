#!/usr/bin/env node
/**
 * Tests for wiki-tribal-cross-ref-audit.mjs (/goal synergy iter 7, echo).
 *
 * Coverage:
 *   - normalizeWikiPath: backslash → slash, lowercase, prefix strip, garbage-safe
 *   - tribalWikiPath: wiki:-tag parse, source-discriminator, external:-scheme
 *     segment match, non-wiki → "", `..`-traversal guard
 *   - audit: missing set, stale set, sorted output, deterministic, empty/null safe
 *   - real-data E2E: parse the live tribal index + walk the actual wiki tree
 *
 * Run: node --test scripts/wiki-tribal-cross-ref-audit.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { streamTribalEntries } from "./lib/load-tribal-index.mjs";
import {
  normalizeWikiPath,
  tribalWikiPath,
  audit,
  SCHEMA_VERSION,
  ROOT,
} from "./wiki-tribal-cross-ref-audit.mjs";

// ───────────────────────── normalizeWikiPath ─────────────────────────

test("normalizeWikiPath: backslash→slash, lowercase, prefix strip", () => {
  assert.equal(normalizeWikiPath("knowledge/wiki/Lessons/Foo.md"), "lessons/foo.md");
  assert.equal(normalizeWikiPath("knowledge\\wiki\\Lessons\\Foo.md"), "lessons/foo.md");
  assert.equal(normalizeWikiPath("H:/PRISM/knowledge/wiki/CONCEPTS/x.md"), "concepts/x.md");
});

test("normalizeWikiPath: no-prefix path passes through (lowercased)", () => {
  assert.equal(normalizeWikiPath("Lessons/foo.md"), "lessons/foo.md");
});

test("normalizeWikiPath: empty/null/undefined → ''", () => {
  assert.equal(normalizeWikiPath(""), "");
  assert.equal(normalizeWikiPath(null), "");
  assert.equal(normalizeWikiPath(undefined), "");
});

test("normalizeWikiPath: number coerces to string (no path semantics)", () => {
  // Number 42 → "42" — no wiki/ prefix to strip, so passes through. Documents
  // the fact that the normalizer doesn't enforce a path-shape — it only
  // strips KNOWN prefixes and normalizes separators.
  assert.equal(normalizeWikiPath(42), "42");
});

// Iter-7 Reviewer-B P1-1 anti-regression: a tribal entry id `wiki:../etc/passwd`
// must NOT pollute the audit's `inTribal` set with a literal `../etc/passwd`
// entry — that would surface as nonsense in the staleInTribal output and
// mislead operators. The path-traversal guard returns `""` so the entry is
// silently dropped by the downstream `if (n)` gate.
test("normalizeWikiPath: path-traversal segments → '' (drop adversarial entries)", () => {
  assert.equal(normalizeWikiPath("../etc/passwd"), "");
  assert.equal(normalizeWikiPath("knowledge/wiki/../../etc/passwd"), "");
  assert.equal(normalizeWikiPath("a/../b.md"), "");
  // Regular paths that happen to contain `.` in a segment are NOT rejected
  assert.equal(normalizeWikiPath("lessons/.hidden.md"), "lessons/.hidden.md");
});

// Iter-7 Reviewer-B P1-2 anti-regression: `.toLowerCase()` is locale-sensitive
// (Turkish dotless-i is the canonical example). Pinning to `en-US` ensures
// byte-determinism across hosts. We can't easily simulate Turkish locale in
// node:test, but we CAN assert the explicit locale is honored (en-US lowercase
// of "İ" is "i̇" with combining dot for Turkish, "i" for en-US).
test("normalizeWikiPath: en-US locale pin — Turkish dotless-i hazard guarded", () => {
  // en-US: "İ" → "i̇" (i + combining dot above) OR "i" depending on Node version;
  // either way it's stable across hosts now that we passed "en-US" explicitly.
  const out = normalizeWikiPath("FOO/İ.md");
  // The exact mapping depends on Unicode tables, but it MUST be stable: same
  // input twice gives same output.
  assert.equal(normalizeWikiPath("FOO/İ.md"), out, "deterministic across calls");
  // And the result is a string with no uppercase ASCII letters.
  assert.ok(!/[A-Z]/.test(out));
});

// ───────────────────────── tribalWikiPath ─────────────────────────

test("tribalWikiPath: id with `wiki:` prefix → stripped + normalized path", () => {
  assert.equal(tribalWikiPath({ id: "wiki:knowledge/wiki/lessons/foo.md" }), "lessons/foo.md");
  assert.equal(tribalWikiPath({ id: "wiki:Lessons/Foo.md" }), "lessons/foo.md");
});

test("tribalWikiPath: source=wiki discriminator + path field", () => {
  assert.equal(
    tribalWikiPath({ id: "abc", source: "wiki", path: "knowledge/wiki/concepts/x.md" }),
    "concepts/x.md",
  );
  assert.equal(
    tribalWikiPath({ id: "abc", kind: "wiki", path: "Concepts/x.md" }),
    "concepts/x.md",
  );
});

test("tribalWikiPath: non-wiki entries → ''", () => {
  assert.equal(tribalWikiPath({ id: "memory:knowledge/memories/x.md" }), "");
  assert.equal(tribalWikiPath({ id: "skill:foo" }), "");
  assert.equal(tribalWikiPath({}), "");
  assert.equal(tribalWikiPath(null), "");
  assert.equal(tribalWikiPath("not-an-object"), "");
});

// RAG-UPGRADE-MS0/U-RAG-1: the real wiki embedder (embed-wiki-into-tribal-index.mjs)
// keys entries `external:<abs-path>`, not `wiki:`. tribalWikiPath must count an
// `external:` entry resolving under knowledge/wiki/ — else the audit under-reports
// coverage by ~two orders of magnitude (the 0.8%-vs-97% blind spot).
test("tribalWikiPath: `external:` id on a wiki path → counted", () => {
  assert.equal(
    tribalWikiPath({ id: "external:H:\\prism\\knowledge\\wiki\\architecture\\foo.md", source: "external" }),
    "architecture/foo.md",
  );
  assert.equal(
    tribalWikiPath({ id: "external:H:/prism/knowledge/wiki/lessons/bar.md", source: "external" }),
    "lessons/bar.md",
  );
});

test("tribalWikiPath: `external:` slot-worktree path normalizes to repo-relative", () => {
  // A slot-worktree absolute path must collapse to the same coordinate as the
  // main-tree disk walk — the `knowledge/wiki/` prefix strip absorbs the
  // `H:\prism-hotel-e1\` worktree root.
  assert.equal(
    tribalWikiPath({ id: "external:H:\\prism-hotel-e1\\knowledge\\wiki\\concepts\\x.md", source: "external" }),
    "concepts/x.md",
  );
});

test("tribalWikiPath: `external:` non-wiki path → '' (guard excludes memory/store entries)", () => {
  assert.equal(
    tribalWikiPath({ id: "external:H:\\prism\\knowledge\\memories\\reference\\m.md", source: "external" }),
    "",
  );
  assert.equal(
    tribalWikiPath({ id: "external:H:\\prism\\cad-engine\\knowledge_store\\doc.md", source: "external" }),
    "",
  );
});

test("tribalWikiPath: `some-knowledge/wiki-notes/` does NOT false-match the segment guard", () => {
  // The guard is a path-SEGMENT match `(^|/)knowledge/wiki/`, not a bare
  // substring, so a dir merely containing those letters is not miscounted.
  assert.equal(
    tribalWikiPath({ id: "external:H:\\prism\\some-knowledge\\wiki-notes\\x.md", source: "external" }),
    "",
  );
});

test("tribalWikiPath: wiki path carried on the `path` field (not the id) is counted", () => {
  assert.equal(
    tribalWikiPath({ id: "sha256:abcdef", path: "H:\\prism\\knowledge\\wiki\\lessons\\z.md" }),
    "lessons/z.md",
  );
});

test("tribalWikiPath: `external:` id with `..` traversal → '' (guard holds on new branch)", () => {
  assert.equal(
    tribalWikiPath({ id: "external:H:\\prism\\knowledge\\wiki\\..\\..\\etc\\passwd", source: "external" }),
    "",
  );
});

// ───────────────────────── audit ─────────────────────────

test("audit: missingFromTribal + staleInTribal correctly partitioned", () => {
  const wiki = [
    "knowledge/wiki/lessons/a.md",
    "knowledge/wiki/lessons/b.md",
    "knowledge/wiki/lessons/c.md",
  ];
  const tribal = [
    { id: "wiki:knowledge/wiki/lessons/a.md" }, // matches a → resolved
    { id: "wiki:knowledge/wiki/lessons/gone.md" }, // not on disk → stale
    { id: "memory:knowledge/memories/z.md" }, // not a wiki entry → ignored
  ];
  const r = audit(wiki, tribal);
  assert.equal(r.stats.wikiFiles, 3);
  assert.equal(r.stats.tribalWikiEntries, 2, "only `wiki:` prefixed entries counted");
  assert.equal(r.stats.missing, 2, "b, c missing from tribal");
  assert.equal(r.stats.stale, 1, "gone.md stale");
  assert.deepEqual(r.missingFromTribal, ["lessons/b.md", "lessons/c.md"]);
  assert.deepEqual(r.staleInTribal, ["lessons/gone.md"]);
});

test("audit: coverage ratio computed correctly", () => {
  const wiki = ["knowledge/wiki/x.md", "knowledge/wiki/y.md", "knowledge/wiki/z.md", "knowledge/wiki/w.md"];
  // 3 of 4 present
  const tribal = [
    { id: "wiki:knowledge/wiki/x.md" },
    { id: "wiki:knowledge/wiki/y.md" },
    { id: "wiki:knowledge/wiki/z.md" },
  ];
  const r = audit(wiki, tribal);
  assert.equal(r.stats.coverage, 0.75);
});

test("audit: empty inputs → 0/0/0, never throws", () => {
  const r = audit([], []);
  assert.deepEqual(r.missingFromTribal, []);
  assert.deepEqual(r.staleInTribal, []);
  assert.equal(r.stats.wikiFiles, 0);
  assert.equal(r.stats.coverage, 0);
});

test("audit: null/garbage inputs → safe fallthrough", () => {
  assert.equal(audit(null, null).stats.wikiFiles, 0);
  assert.equal(audit("not-array", { entries: [] }).stats.wikiFiles, 0);
});

test("audit: deterministic — same input twice → identical output", () => {
  const wiki = ["knowledge/wiki/b.md", "knowledge/wiki/a.md"];
  const tribal = [{ id: "wiki:knowledge/wiki/a.md" }];
  assert.equal(JSON.stringify(audit(wiki, tribal)), JSON.stringify(audit(wiki, tribal)));
});

test("audit: missing array is sorted (byte-determinism)", () => {
  const wiki = [
    "knowledge/wiki/z.md",
    "knowledge/wiki/a.md",
    "knowledge/wiki/m.md",
  ];
  const r = audit(wiki, []);
  assert.deepEqual(r.missingFromTribal, ["a.md", "m.md", "z.md"]);
});

test("audit: case-insensitive matching (Windows on-disk casing drift)", () => {
  const wiki = ["knowledge/wiki/Lessons/Foo.md"];
  const tribal = [{ id: "wiki:knowledge/wiki/lessons/foo.md" }];
  const r = audit(wiki, tribal);
  assert.equal(r.stats.missing, 0, "case mismatch should NOT register as missing");
  assert.equal(r.stats.stale, 0);
});

test("audit: counts `external:`-scheme wiki entries alongside `wiki:` (U-RAG-1 blind-spot fix)", () => {
  const wiki = [
    "knowledge/wiki/lessons/a.md",
    "knowledge/wiki/lessons/b.md",
    "knowledge/wiki/concepts/c.md",
  ];
  const tribal = [
    { id: "wiki:knowledge/wiki/lessons/a.md" },                                       // wiki: scheme
    { id: "external:H:\\prism\\knowledge\\wiki\\lessons\\b.md", source: "external" },  // external: scheme
    { id: "external:H:\\prism\\knowledge\\memories\\x.md", source: "external" },       // non-wiki external — ignored
  ];
  const r = audit(wiki, tribal);
  assert.equal(r.stats.tribalWikiEntries, 2, "both wiki: and external: wiki entries counted, memory ignored");
  assert.deepEqual(r.missingFromTribal, ["concepts/c.md"]);
  assert.equal(r.stats.coverage, 0.6667);
});

// ───────────────────────── exports ─────────────────────────

test("SCHEMA_VERSION exported and stable", () => {
  assert.equal(SCHEMA_VERSION, "1.1.0");
});

test("ROOT exported and is absolute path", () => {
  assert.ok(path.isAbsolute(ROOT));
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live tribal index (shard-aware) + live wiki tree audit", () => {
  const tribalPath = "H:/prism/state/shared/tribal-embed-index.json";
  const manifestPath = "H:/prism/state/shared/tribal-embed-index.manifest.json";
  const wikiDir = "H:/prism/knowledge/wiki";
  // Skip ONLY if there is genuinely no index in EITHER layout. The index sharded
  // 2026-06-08 and the monolith is now an absent orphan, so the prior
  // monolith-only existsSync check skipped FOREVER (asserting nothing -- the
  // dead-test the shard-aware fix's reviewers flagged). streamTribalEntries reads
  // whichever layout is present (manifest-first), mirroring production main().
  if (!existsSync(tribalPath) && !existsSync(manifestPath)) {
    console.log("  SKIP: no tribal index (neither shards nor monolith) on disk");
    return;
  }
  if (!existsSync(wikiDir)) { console.log("  SKIP: live wiki dir missing"); return; }

  // Minimal walk + read for the E2E (the I/O shell does the same thing)
  function walk(dir, acc = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, acc);
      else if (e.isFile() && /\.md$/i.test(e.name)) acc.push(full);
    }
    return acc;
  }
  const wikiFiles = walk(wikiDir).map((p) => path.relative("H:/prism", p).replace(/\\/g, "/"));
  // Read entries via the SAME shard-aware path production main() uses, so this
  // E2E actually exercises streamTribalEntries: it would FATAL-throw on a revert
  // to the monolith readFileSync (the monolith is deleted) and never silently
  // skips on the live sharded layout. Project only the four fields tribalWikiPath
  // reads (mirrors production), never the 768-float embedding.
  const entries = [];
  streamTribalEntries(tribalPath, (e) => {
    entries.push({ id: e.id, source: e.source, kind: e.kind, path: e.path });
  });
  const r = audit(wikiFiles, entries);
  // Anti-dead-test guard: the shard layout MUST surface a substantial embedded
  // set. A near-zero count means the read silently returned nothing (exactly the
  // failure the monolith-only read now produces). Real corpus is tens of thousands.
  assert.ok(entries.length >= 1000,
    `shard-aware read must surface the real corpus, got ${entries.length} entries`);
  // Sanity bounds — we should have >100 wiki files and meaningful tribal coverage
  assert.ok(r.stats.wikiFiles >= 100, `wiki count realistic: ${r.stats.wikiFiles}`);
  assert.ok(r.stats.tribalWikiEntries >= 1, `at least one tribal wiki entry`);
  assert.ok(r.stats.coverage >= 0 && r.stats.coverage <= 1, "coverage in [0,1]");
  // U-RAG-1 anti-regression: ~97% of the corpus is embedded under the
  // `external:` scheme. A value near 0.008 means `tribalWikiPath` regressed to
  // the `wiki:`-only blind spot. The 0.5 floor tolerates normal embed-lag
  // without false-failing while still catching the catastrophic regression.
  assert.ok(r.stats.coverage >= 0.5,
    `coverage must reflect the external:-scheme corpus (got ${r.stats.coverage})`);
  // coverage is (covered/total) rounded to 4dp — assert that exact relationship.
  // round(coverage*wikiFiles) is the WRONG check: the 4dp rounding loses
  // precision the ×24K multiply amplifies to ±1, so it false-fails at realistic
  // coverage (it only passed when coverage was the pre-fix ~0.008 blind spot).
  assert.equal(
    r.stats.coverage,
    Number(((r.stats.wikiFiles - r.stats.missing) / r.stats.wikiFiles).toFixed(4)),
    "coverage == (covered/total) rounded to 4dp",
  );
});
