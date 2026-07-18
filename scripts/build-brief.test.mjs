/**
 * build-brief.test.mjs — node:test suite for build-brief.mjs
 *
 * Run: node --test scripts/build-brief.test.mjs
 *
 * Real-value assertions only. Unit tests are hermetic (every external read
 * injected); two E2E tests exercise the real repo so the "pure core +
 * injected readers" design is proven against production wiring, not just
 * fakes. A property fuzz pins the excerptBody budget invariant.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import {
  parseArgs,
  stripFrontmatter,
  tokenScore,
  excerptBody,
  normalizeSlug,
  loadWikiLeafIndex,
  _resetLeafCacheForTests,
  searchWikiLeaves,
  resolveMemoryFile,
  collectWikiNames,
  collectMemoryNames,
  collectBodies,
  scanRegressions,
  enrichTribalText,
  composeBrief,
  renderBriefMarkdown,
  writeBrief,
} from "./build-brief.mjs";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(TEST_DIR, "build-brief.mjs");
const REPO_ROOT = resolve(TEST_DIR, "..");

// ─── parseArgs ────────────────────────────────────────────────────────────

test("parseArgs — target, slot, flags, and clamps", () => {
  const o = parseArgs(["U-X", "--slot", "juliett", "--json", "--k", "99", "--git-n", "-5", "--tribal-k", "8"]);
  assert.equal(o.target, "U-X");
  assert.equal(o.slot, "juliett");
  assert.equal(o.json, true);
  assert.equal(o.topK, 40, "--k clamps to the 40 ceiling");
  assert.equal(o.gitN, 0, "--git-n clamps to the 0 floor");
  assert.equal(o.tribalK, 8);
});

test("parseArgs — --no-write and --max-excerpt floor", () => {
  const o = parseArgs(["a topic", "--no-write", "--max-excerpt", "50", "--wiki-bodies", "12", "--mem-bodies", "2", "--regr-n", "9"]);
  assert.equal(o.write, false);
  assert.equal(o.maxExcerpt, 200, "--max-excerpt floors at 200");
  assert.equal(o.wikiBodies, 12);
  assert.equal(o.memBodies, 2);
  assert.equal(o.regrN, 9);
});

test("parseArgs — first non-flag token is the target, later ones ignored", () => {
  const o = parseArgs(["first", "second"]);
  assert.equal(o.target, "first");
});

test("parseArgs — defaults pin DEFAULT_MAX_EXCERPT + every body budget", () => {
  // Fail-on-revert oracle: a silent change to any of these defaults (DEFAULT_MAX_EXCERPT
  // dropped from 1400 → 800, gitN bumped from 20 → 5, etc) would change brief-quality
  // fleet-wide and never get caught. Pin them here.
  const o = parseArgs([]);
  assert.equal(o.target, null, "default target null (no positional)");
  assert.equal(o.slot, null, "default slot null");
  assert.equal(o.write, true);
  assert.equal(o.json, false);
  assert.equal(o.topK, 8, "default topK");
  assert.equal(o.tribalK, 5, "default tribalK");
  assert.equal(o.wikiBodies, 5, "default wikiBodies");
  assert.equal(o.memBodies, 3, "default memBodies");
  assert.equal(o.gitN, 20, "default gitN");
  assert.equal(o.regrN, 6, "default regrN");
  assert.equal(o.maxExcerpt, 1400, "DEFAULT_MAX_EXCERPT");
});

// ─── stripFrontmatter ─────────────────────────────────────────────────────

test("stripFrontmatter — removes a YAML block, a BOM, passes plain text", () => {
  assert.equal(stripFrontmatter("---\na: 1\n---\nbody here"), "body here");
  assert.equal(stripFrontmatter("no frontmatter at all"), "no frontmatter at all");
  assert.equal(stripFrontmatter("﻿---\nx: 1\n---\nB"), "B");
  assert.equal(stripFrontmatter(null), "");
});

// ─── tokenScore ───────────────────────────────────────────────────────────

test("tokenScore — counts every occurrence, ignores <2-char tokens and empties", () => {
  assert.equal(tokenScore("aa bb aa cc aa", ["aa"]), 3);
  assert.equal(tokenScore("hello world", ["x"]), 0);
  assert.equal(tokenScore("", ["aa"]), 0);
  assert.equal(tokenScore("aaaa", ["a"]), 0, "single-char token below MIN length is ignored");
});

// ─── excerptBody ──────────────────────────────────────────────────────────

test("excerptBody — short body is returned whole, frontmatter stripped", () => {
  assert.equal(excerptBody("---\nk: v\n---\nshort", ["x"], 1000), "short");
});

test("excerptBody — output NEVER exceeds maxChars (property fuzz, 200 inputs)", () => {
  for (let i = 0; i < 200; i++) {
    const sections = [];
    const nSec = Math.floor(Math.random() * 8);
    for (let j = 0; j < nSec; j++) {
      sections.push(`## h${j}\n` + "word ".repeat(Math.floor(Math.random() * 200)));
    }
    const body = "lead ".repeat(Math.floor(Math.random() * 320)) + "\n\n" + sections.join("\n\n");
    // Floor 100 (< the ~137 plain-clip threshold) so the fuzz exercises the
    // plain-clip branch AND the sectioned branch.
    const maxChars = 100 + Math.floor(Math.random() * 2240);
    const ex = excerptBody(body, ["word", "h1", "lead"], maxChars);
    assert.ok(ex.length <= maxChars, `len ${ex.length} > maxChars ${maxChars}`);
  }
});

test("excerptBody — a huge boilerplate lead does not starve a relevant later section", () => {
  const body = "boilerplate ".repeat(450) + "\n\n## relevant\nkienzle kienzle kienzle force model coefficient\n";
  const ex = excerptBody(body, ["kienzle"], 1000);
  assert.ok(ex.length <= 1000, `len ${ex.length}`);
  assert.ok(ex.includes("kienzle"), "the query-relevant section must survive past the lead");
});

test("excerptBody — tiny maxChars below the marker threshold plain-clips within budget", () => {
  const ex = excerptBody("Z ".repeat(600), ["zz"], 100);
  assert.ok(ex.length <= 100, `len ${ex.length}`);
});

// ─── normalizeSlug ────────────────────────────────────────────────────────

test("normalizeSlug — strips brackets, path segments, .md; rejects unsafe", () => {
  assert.equal(normalizeSlug("[[fleet-reaper]]"), "fleet-reaper");
  assert.equal(normalizeSlug("knowledge/wiki/architecture/x.md"), "x");
  assert.equal(normalizeSlug("watchdog-stop~2"), "watchdog-stop~2");
  assert.equal(normalizeSlug(".."), null);
  assert.equal(normalizeSlug("has space"), null);
  assert.equal(normalizeSlug(""), null);
  assert.equal(normalizeSlug(null), null);
});

// ─── loadWikiLeafIndex ────────────────────────────────────────────────────

test("loadWikiLeafIndex — parses JSONL, skips malformed/incomplete lines", () => {
  _resetLeafCacheForTests();
  const jsonl = [
    JSON.stringify({ name: "a-engine", title: "A", type: "architecture", desc: "d", path: "knowledge/wiki/architecture/a.md" }),
    "{ broken json",
    "",
    JSON.stringify({ name: "b-action", title: "B", type: "action", desc: "", path: "knowledge/wiki/architecture/actions/x/b.md" }),
    JSON.stringify({ title: "no name", path: "x" }),
  ].join("\n");
  const idx = loadWikiLeafIndex("/fake/leaf.jsonl", {
    readImpl: () => jsonl, existsImpl: () => true, statImpl: () => ({ mtimeMs: 100 }),
  });
  assert.equal(idx.entries.length, 2, "two valid records, malformed + nameless skipped");
  assert.equal(idx.byName.get("a-engine").type, "architecture");
  assert.equal(idx.byName.has("no name"), false);
});

test("loadWikiLeafIndex — mtime-keyed cache: same mtime reuses, changed mtime re-reads", () => {
  _resetLeafCacheForTests();
  let reads = 0;
  const mk = (mtime) => ({
    readImpl: () => { reads++; return JSON.stringify({ name: "x", path: "p" }); },
    existsImpl: () => true, statImpl: () => ({ mtimeMs: mtime }),
  });
  const a = loadWikiLeafIndex("/fake/l.jsonl", mk(1));
  const b = loadWikiLeafIndex("/fake/l.jsonl", mk(1));
  assert.equal(reads, 1, "same mtime → one read");
  assert.equal(a, b, "same wrapper reference returned");
  loadWikiLeafIndex("/fake/l.jsonl", mk(2));
  assert.equal(reads, 2, "changed mtime → re-read");
});

test("loadWikiLeafIndex — missing file returns null", () => {
  _resetLeafCacheForTests();
  assert.equal(loadWikiLeafIndex("/nope.jsonl", { existsImpl: () => false }), null);
});

// ─── searchWikiLeaves ─────────────────────────────────────────────────────

test("searchWikiLeaves — IDF: a rare token outranks a common one (type-bias removed)", () => {
  // Every entry is the SAME type ("action", non-meaty) so LEAF_MEATY_MULT
  // cannot decide the ranking — IDF is the SOLE differentiator. Titles carry
  // no query tokens, so only the name field scores.
  const entries = [];
  for (let i = 0; i < 60; i++) {
    entries.push({ name: `milling-thing-${i}`, title: "job", type: "action", desc: "", path: `p${i}` });
  }
  entries.push({ name: "chatter-stability", title: "lobes", type: "action", desc: "", path: "chat" });
  const hits = searchWikiLeaves({ entries }, ["chatter", "milling"], { topK: 3 });
  assert.equal(hits[0].name, "chatter-stability", "the rare 'chatter' token must rank #1 on IDF alone");
  // Without IDF both entries score 3.0 (a tie); the >2x gap proves IDF is
  // applied — this assertion FAILS if IDF weighting is removed.
  assert.ok(hits[0].score > hits[1].score * 2, `IDF gap too small: ${hits[0].score} vs ${hits[1].score}`);
});

test("searchWikiLeaves — empty index or no-token query returns []", () => {
  assert.deepEqual(searchWikiLeaves({ entries: [] }, ["x"]), []);
  assert.deepEqual(searchWikiLeaves({ entries: [{ name: "a", title: "", desc: "", type: "x", path: "p" }] }, []), []);
});

test("searchWikiLeaves — LEAF_MEATY_MULT bonus lifts architecture over an equal-score action stub", () => {
  // Two entries with identical token hits — one architecture (meaty), one action.
  // Without LEAF_MEATY_MULT > 1.0 the order would be insertion-order (action first).
  // With it, the architecture must outrank the action stub.
  // Fail-on-revert oracle: lowering LEAF_MEATY_MULT to 1.0 breaks this test.
  const entries = [
    { name: "kienzle-stub",   title: "k", type: "action",       desc: "", path: "a.md" },
    { name: "kienzle-design", title: "k", type: "architecture", desc: "", path: "b.md" },
  ];
  const hits = searchWikiLeaves({ entries }, ["kienzle"], { topK: 2 });
  assert.equal(hits[0].name, "kienzle-design", "architecture must outrank action stub on equal token hits");
  assert.ok(hits[0].score > hits[1].score, "meaty-type multiplier must produce a strict score gap");
});

// ─── resolveMemoryFile ────────────────────────────────────────────────────

test("resolveMemoryFile — probes the prefix namespace first", () => {
  const seen = [];
  const p = resolveMemoryFile("feedback_some_rule", {
    memoryDir: "/m",
    existsImpl: (pp) => { seen.push(pp); return pp.includes("feedback"); },
  });
  assert.ok(p && p.includes("feedback"));
  assert.ok(seen[0].includes("feedback"), "feedback namespace probed first for a feedback_ slug");
});

// ─── collectWikiNames / collectMemoryNames ────────────────────────────────

test("collectWikiNames — dedups explicit .wiki names preserving rank order", () => {
  const hits = [{ wiki: ["a", "b"] }, { wiki: ["b", "c"] }, { wiki: [] }];
  assert.deepEqual(collectWikiNames(hits), ["a", "b", "c"]);
});

test("collectMemoryNames — dedups .memory names and caps", () => {
  const hits = [{ memory: ["m1", "m1"] }, { memory: ["m2"] }];
  assert.deepEqual(collectMemoryNames(hits), ["m1", "m2"]);
});

// ─── collectBodies ────────────────────────────────────────────────────────

test("collectBodies — reads + excerpts a contained relative path", () => {
  const r = collectBodies(
    [{ name: "ok", path: "wiki/a.md", title: "A", kind: "explicit" }],
    [], { repoRoot: "/safe/root", readImpl: () => "# Title\nthe body text" },
  );
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].name, "ok");
  assert.ok(r.entries[0].excerpt.includes("body text"));
});

test("collectBodies — rejects a path escaping the repo root (containment guard)", () => {
  const r = collectBodies(
    [{ name: "evil", path: "../../../etc/passwd", kind: "explicit" }],
    [], { repoRoot: "/safe/root", readImpl: () => "X".repeat(50) },
  );
  assert.equal(r.entries.length, 0);
  assert.deepEqual(r.missing, ["evil"]);
});

test("collectBodies — explicit misses are reported, derived probe misses are not", () => {
  const r = collectBodies(
    [{ name: "d", path: "w/d.md", kind: "derived" }, { name: "e", path: "w/e.md", kind: "explicit" }],
    [], { repoRoot: "/root", readImpl: () => { throw new Error("ENOENT"); } },
  );
  assert.deepEqual(r.missing, ["e"], "only the explicit miss is reported");
});

test("collectBodies — stops once the limit is reached", () => {
  const items = ["a", "b", "c", "d", "e"].map((n) => ({ name: n, path: `w/${n}.md`, kind: "explicit" }));
  const r = collectBodies(items, [], { repoRoot: "/r", readImpl: () => "body", limit: 2 });
  assert.equal(r.entries.length, 2);
});

// ─── scanRegressions ──────────────────────────────────────────────────────

test("scanRegressions — matches dated lines, strips the bullet, scores by overlap", () => {
  const md = [
    "- 2026-05-01 | **chatter fix in milling** | observed-in: abc",
    "- 2026-05-02 | **completely unrelated thing** | x",
    "not a regression line at all",
  ].join("\n");
  const r = scanRegressions(md, ["chatter"], 6);
  assert.equal(r.length, 1);
  assert.ok(!r[0].startsWith("-"), "leading markdown bullet stripped");
  assert.ok(r[0].includes("chatter"));
});

// ─── enrichTribalText ─────────────────────────────────────────────────────

test("enrichTribalText — joins full body text by id, empty string when absent", () => {
  const out = enrichTribalText([{ id: "t1" }, { id: "t2" }], {
    loadTribalImpl: () => ({ entries: [{ id: "t1", text: "full body one" }] }),
  });
  assert.equal(out[0].fullText, "full body one");
  assert.equal(out[1].fullText, "");
});

// ─── composeBrief ─────────────────────────────────────────────────────────

test("composeBrief — empty target yields an empty-mode brief, never throws", () => {
  const b = composeBrief("", {});
  assert.equal(b.mode, "empty");
  assert.ok(b.warnings.length >= 1);
});

test("composeBrief — topic mode assembles every section from injected deps", () => {
  const brief = composeBrief("fleet reaper orphan", {
    readImpl: (p) => {
      if (String(p).includes("CLAUDE")) return "- 2026-05-01 | **reaper orphan fix** | x";
      throw new Error("no such file");
    },
    spawnImpl: () => ({ status: 0, stdout: "" }),
    searchImpl: () => ({ tokens: [], hits: [{ id: "n1", layer: "L8", label: "reaper", status: "built", wiki: ["fleet-reaper"], memory: [] }] }),
    tribalImpl: () => ({ tokens: [], hits: [{ id: "t1", title: "reaper tip", domain: "general" }] }),
    loadLeafImpl: () => ({ entries: [], byName: new Map() }),
    searchLeavesImpl: () => [{ name: "fleet-reaper", title: "FR", type: "architecture", path: "knowledge/wiki/architecture/fleet-reaper.md" }],
    collectBodiesImpl: () => ({ entries: [{ name: "fleet-reaper", path: "x", title: "FR", excerpt: "deep reaper content" }], missing: [] }),
    enrichTribalImpl: (h) => h.map((x) => ({ ...x, fullText: "tip body text" })),
  });
  assert.equal(brief.mode, "topic");
  assert.equal(brief.wikiContext.length, 1);
  assert.equal(brief.wikiContext[0].excerpt, "deep reaper content");
  assert.equal(brief.tribal.length, 1);
  assert.equal(brief.tribal[0].fullText, "tip body text");
  assert.equal(brief.regressions.length, 1);
  assert.equal(brief.masterHits.length, 1);
});

test("composeBrief — unit mode resolves milestone/title and lists prior commits", () => {
  const brief = composeBrief("U-TEST", {
    readImpl: (p) => {
      if (String(p).includes("ROADMAP")) {
        return JSON.stringify({ pending_units: [{ unit_id: "U-TEST", milestone: "TEST-MS0", title: "Test unit title" }] });
      }
      if (String(p).includes("CLAUDE")) return "";
      throw new Error("no such file");
    },
    spawnImpl: () => ({ status: 0, stdout: "abc123 prior commit one\ndef456 prior commit two\n" }),
    searchImpl: () => ({ hits: [] }),
    tribalImpl: () => ({ hits: [] }),
    loadLeafImpl: () => ({ entries: [], byName: new Map() }),
    searchLeavesImpl: () => [],
    collectBodiesImpl: () => ({ entries: [], missing: [] }),
    enrichTribalImpl: (h) => h,
  });
  assert.equal(brief.mode, "unit");
  assert.equal(brief.unit.milestone, "TEST-MS0");
  assert.equal(brief.unit.title, "Test unit title");
  assert.equal(brief.commits.length, 2);
  const md = renderBriefMarkdown(brief);
  assert.ok(md.includes("## 📜 Prior commits in milestone (2)"));
});

test("composeBrief — a throwing searchImpl degrades to a warning, never throws", () => {
  const brief = composeBrief("some topic here", {
    readImpl: () => { throw new Error("no file"); },
    searchImpl: () => { throw new Error("boom"); },
    tribalImpl: () => ({ hits: [] }),
    loadLeafImpl: () => null,
    searchLeavesImpl: () => [],
    collectBodiesImpl: () => ({ entries: [], missing: [] }),
    enrichTribalImpl: (h) => h,
  });
  assert.ok(brief.warnings.some((w) => /search failed/.test(w)), "search failure surfaced as a warning");
});

// ─── renderBriefMarkdown ──────────────────────────────────────────────────

test("renderBriefMarkdown — emits the headline and every section", () => {
  const md = renderBriefMarkdown({
    target: "T", mode: "topic", generatedAt: "2026-01-01", domain: "mill",
    queryTokens: ["a", "b"], unit: null,
    wikiContext: [{ name: "w", title: "W", path: "p", excerpt: "EXCERPT-BODY" }],
    memoryContext: [], tribal: [], regressions: ["a regression line"],
    commits: [], masterHits: [], missingWiki: [], missingMemory: [], warnings: [],
  });
  assert.ok(md.includes("# Build Brief — T"));
  assert.ok(md.includes("## 📚 Deep wiki context (1)"));
  assert.ok(md.includes("EXCERPT-BODY"));
  assert.ok(md.includes("## ⚠️ Known regressions touching this area (1)"));
  assert.ok(md.includes("a regression line"));
});

// ─── writeBrief ───────────────────────────────────────────────────────────

test("writeBrief — writes a sanitized filename into the target dir", () => {
  const dir = mkdtempSync(join(tmpdir(), "build-brief-test-"));
  try {
    const brief = {
      target: "U-X::weird/name", mode: "topic", generatedAt: "t", queryTokens: [], unit: null,
      wikiContext: [], memoryContext: [], tribal: [], regressions: [], commits: [],
      masterHits: [], missingWiki: [], missingMemory: [], warnings: [],
    };
    const p = writeBrief(brief, dir);
    assert.ok(p && existsSync(p), "brief file written");
    assert.ok(!p.slice(dir.length + 1).includes("/") && !p.slice(dir.length + 1).includes("\\"),
      "the unsafe target produced no nested path");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── E2E — real repo (proves the injected-readers design against prod) ─────

test("E2E — composeBrief against the live repo produces a structured brief", { timeout: 120000 }, () => {
  const b = composeBrief("fleet reaper orphan process reaping");
  assert.equal(b.mode, "topic");
  assert.ok(Array.isArray(b.wikiContext));
  assert.ok(b.wikiContext.length > 0, "a well-documented topic must resolve >=1 real wiki body");
  assert.ok(typeof b.generatedAt === "string" && b.generatedAt.length > 0);
  assert.ok(!b.warnings.some((w) => /leaf-index not loadable/.test(w)), "the live leaf-index must load");
});

test("E2E — main() subprocess emits a brief to stdout", { timeout: 120000 }, () => {
  const out = execFileSync(process.execPath, [SCRIPT_PATH, "fleet reaper", "--no-write"], {
    cwd: REPO_ROOT, encoding: "utf8", timeout: 110000,
  });
  assert.ok(out.includes("# Build Brief — fleet reaper"), "headline present");
  assert.ok(out.includes("## 📚 Deep wiki context"), "deep wiki section present");
});
