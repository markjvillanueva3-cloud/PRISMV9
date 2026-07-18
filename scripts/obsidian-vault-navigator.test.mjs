// Tests for scripts/obsidian-vault-navigator.mjs -- the filesystem-native
// Obsidian navigation surface. Pure-function units + a hermetic real-FS vault
// (tmp dir) exercising the model + every verb on real file IO, plus injected-FS
// cases for the unreadable/skip path.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  extractWikilinks, parseFrontmatter, extractTags, normalizeKey, parseSearchQuery,
  walkVault, buildVaultModel, resolveNote,
  navTree, navRead, navLinks, navBacklinks, navOrphans, navTags, navNeighborhood,
  navSearch, navCanvas, navStatus, runCli, VERBS,
} from "./obsidian-vault-navigator.mjs";

// -- extractWikilinks --
test("extractWikilinks: plain, alias, heading, block, embed; drops empties", () => {
  const t = "a [[plain]] b [[targ|nice]] c [[doc#sec]] d ![[embed]] e [[p#^blk]] [[]]";
  assert.deepEqual(extractWikilinks(t), ["plain", "targ", "doc", "embed", "p"]);
});
test("extractWikilinks: null / non-string / no-links -> []", () => {
  assert.deepEqual(extractWikilinks(null), []);
  assert.deepEqual(extractWikilinks(42), []);
  assert.deepEqual(extractWikilinks("no links here"), []);
});

// -- parseFrontmatter --
test("parseFrontmatter: flat scalars + inline list + block list", () => {
  const p = parseFrontmatter("---\nname: x\ntags: [a, b]\nrefs:\n  - one\n  - two\n---\nBODY");
  assert.equal(p.fm.name, "x");
  assert.deepEqual(p.fm.tags, ["a", "b"]);
  assert.deepEqual(p.fm.refs, ["one", "two"]);
  assert.equal(p.body, "BODY");
});
test("parseFrontmatter: nested metadata: flattens to top level", () => {
  const p = parseFrontmatter("---\nname: y\nmetadata:\n  type: reference\n  galaxy: system-viz\n---\nb");
  assert.equal(p.fm.type, "reference");
  assert.equal(p.fm.galaxy, "system-viz");
});
test("parseFrontmatter: quoted scalars unwrapped; no fence -> full body", () => {
  assert.equal(parseFrontmatter('---\ntitle: "Quoted Title"\n---\nx').fm.title, "Quoted Title");
  const nf = parseFrontmatter("just a body");
  assert.deepEqual(nf.fm, {});
  assert.equal(nf.body, "just a body");
});

// -- extractTags --
test("extractTags: frontmatter list + inline #tag, deduped + lowercased", () => {
  const tags = extractTags({ tags: ["Alpha", "beta"] }, "see #beta and #Gamma here");
  assert.ok(tags.includes("alpha") && tags.includes("beta") && tags.includes("gamma"));
  assert.equal(tags.filter((t) => t === "beta").length, 1); // deduped across fm + inline
});
test("extractTags: rejects bare-number tokens and mid-word #", () => {
  const tags = extractTags({}, "url https://x#frag and code#word but #real-tag and #123");
  assert.ok(tags.includes("real-tag"));
  assert.ok(!tags.includes("frag"), "a #fragment after a word char must not register");
  assert.ok(!tags.includes("word"));
  assert.ok(!tags.includes("123"), "bare numeric token is not a tag");
});

// -- normalizeKey + parseSearchQuery --
test("normalizeKey: backslash->slash, drop .md, lowercase", () => {
  assert.equal(normalizeKey("Memories\\Reference\\Foo.md"), "memories/reference/foo");
  assert.equal(normalizeKey("Feedback_Golf"), "feedback_golf");
});
test("parseSearchQuery: operators + quoted phrase + bare terms", () => {
  const q = parseSearchQuery('kienzle tag:physics path:wiki "two words" file:foo.md');
  assert.deepEqual(q.terms, ["kienzle", "two words"]);
  assert.deepEqual(q.filters.tag, ["physics"]);
  assert.deepEqual(q.filters.path, ["wiki"]);
  assert.deepEqual(q.filters.file, ["foo.md"]);
});

// -- hermetic vault (real FS) --
function makeVault() {
  const root = mkdtempSync(join(tmpdir(), "obsnav-"));
  const w = (rel, content) => {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  };
  // a links b,c ; b links a ; c links d ; d isolated-out ; lonely is an orphan
  w("memories/feedback/a.md", "---\ntags: [x]\n---\nlinks [[b]] and [[c]] and #y");
  w("memories/reference/b.md", "---\n---\nback to [[a]] with #x");
  w("memories/reference/c.md", "---\n---\nhello world, onward [[d]]");
  w("memories/reference/d.md", "---\n---\nleaf");
  w("memories/reference/lonely.md", "---\n---\nnobody links me");
  w("graphs/a.canvas", JSON.stringify({ nodes: [{ id: "n1", type: "text", text: "hi there" }], edges: [] }));
  w("graphs/bad.canvas", "{ not valid json");
  // dirs that MUST be skipped by walkVault
  w(".obsidian/should-skip.md", "config");
  w(".trash/deleted.md", "trash");
  return { root, w };
}

test("walkVault: enumerates md+canvas, skips .obsidian/.trash", () => {
  const { root } = makeVault();
  try {
    const files = walkVault(root).sort();
    assert.ok(files.includes("memories/feedback/a.md"));
    assert.ok(files.includes("graphs/a.canvas"));
    assert.ok(!files.some((f) => f.includes(".obsidian")), ".obsidian must be skipped");
    assert.ok(!files.some((f) => f.includes(".trash")), ".trash must be skipped");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("buildVaultModel: resolves outlinks + inverts backlinks + counts", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    assert.equal(m.notes.size, 5, "5 .md notes (a,b,c,d,lonely)");
    assert.equal(m.canvases.length, 2, "2 .canvas files");
    const a = m.notes.get("memories/feedback/a.md");
    assert.deepEqual(a.outlinks.slice().sort(), ["memories/reference/b.md", "memories/reference/c.md"]);
    assert.equal(a.unresolvedOut, 0);
    assert.deepEqual(m.backlinks.get("memories/feedback/a.md"), ["memories/reference/b.md"]);
    assert.deepEqual(m.backlinks.get("memories/reference/d.md"), ["memories/reference/c.md"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("buildVaultModel: unreadable note is SKIPPED + counted, never throws", () => {
  const { root } = makeVault();
  try {
    const throwingRead = (p, enc) => {
      if (String(p).endsWith("lonely.md")) throw new Error("EACCES");
      return readFileSync(p, enc);
    };
    const m = buildVaultModel(root, { readFileImpl: throwingRead });
    assert.ok(m.skipped >= 1, "the unreadable note increments skipped");
    assert.ok(!m.notes.has("memories/reference/lonely.md"), "skipped note absent from the model");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("resolveNote: relpath / basename / ambiguous / miss-suggestions", () => {
  const { root, w } = makeVault();
  w("memories/x/dup.md", "---\n---\none");
  w("memories/y/dup.md", "---\n---\ntwo");
  try {
    const m = buildVaultModel(root);
    assert.equal(resolveNote(m, "memories/feedback/a.md").rel, "memories/feedback/a.md");
    assert.equal(resolveNote(m, "a").rel, "memories/feedback/a.md", "bare basename resolves");
    assert.equal(resolveNote(m, "A.md").rel, "memories/feedback/a.md", "case + .md insensitive");
    const amb = resolveNote(m, "dup");
    assert.ok(Array.isArray(amb.ambiguous) && amb.ambiguous.length === 2, "duplicate basename is ambiguous");
    const miss = resolveNote(m, "zzznope");
    assert.ok(Array.isArray(miss.suggestions), "miss returns suggestions array");
    assert.equal(miss.rel, undefined);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navRead: returns properties + tags + outlinks + backlinks + body", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    const r = navRead(m, "a");
    assert.equal(r.found, true);
    assert.equal(r.rel, "memories/feedback/a.md");
    assert.deepEqual(r.tags.slice().sort(), ["x", "y"]);
    assert.equal(r.outlinks.length, 2);
    assert.deepEqual(r.backlinks, ["memories/reference/b.md"]);
    assert.ok(r.body.includes("links"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navLinks / navBacklinks: directional edges", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    assert.deepEqual(navLinks(m, "b").outlinks, ["memories/feedback/a.md"]);
    assert.deepEqual(navBacklinks(m, "d").backlinks, ["memories/reference/c.md"]);
    assert.equal(navBacklinks(m, "lonely").backlinks.length, 0);
    assert.equal(navLinks(m, "nope").found, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navOrphans: only the 0-in 0-out note (c has inbound, d has inbound)", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    const o = navOrphans(m);
    assert.deepEqual(o.orphans, ["memories/reference/lonely.md"]);
    assert.equal(o.total, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navTags: index counts + by-tag lookup", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    const idx = navTags(m);
    const x = idx.tags.find((t) => t.tag === "x");
    assert.equal(x.count, 2, "tag x on a(fm) + b(inline)");
    const byTag = navTags(m, "x");
    assert.deepEqual(byTag.notes.slice().sort(), ["memories/feedback/a.md", "memories/reference/b.md"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navNeighborhood: 1-hop vs 2-hop reach (a->c->d)", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    const h1 = navNeighborhood(m, "a", { hops: 1 });
    assert.equal(h1.totalReached, 2, "a reaches b,c at 1 hop"); // d is 2 hops away
    const h2 = navNeighborhood(m, "a", { hops: 2 });
    assert.equal(h2.totalReached, 3, "a reaches b,c,d at 2 hops (d via c)");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navSearch: term match + tag/path filters + limit cap", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    assert.deepEqual(navSearch(m, "hello").hits.map((h) => h.rel), ["memories/reference/c.md"]);
    assert.equal(navSearch(m, "hello tag:x").total, 0); // c has no tag x
    assert.equal(navSearch(m, "hello path:reference").hits.length, 1);
    assert.equal(navSearch(m, "hello path:feedback").hits.length, 0);
    assert.ok(navSearch(m, "", { limit: 2 }).hits.length <= 2); // empty terms -> all, capped
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navCanvas: reads node/edge summary; bad JSON fail-soft; miss suggests", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    const c = navCanvas(m, "a.canvas");
    assert.equal(c.found, true);
    assert.equal(c.nodeCount, 1);
    assert.equal(c.nodes[0].label, "hi there");
    const bad = navCanvas(m, "bad.canvas");
    assert.ok(bad.error && /parse failed/.test(bad.error), "malformed canvas surfaces an error, no throw");
    const miss = navCanvas(m, "nope.canvas");
    assert.equal(miss.found, false);
    assert.ok(Array.isArray(miss.suggestions));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navStatus: vault-wide counts are coherent", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    const s = navStatus(m);
    assert.equal(s.notes, 5);
    assert.equal(s.canvases, 2);
    assert.equal(s.orphans, 1);
    assert.ok(s.resolvedLinks >= 4); // a->b,a->c,b->a,c->d
    assert.equal(s.skippedUnreadable, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("navTree: groups notes by directory prefix at depth", () => {
  const { root } = makeVault();
  try {
    const m = buildVaultModel(root);
    const t = navTree(m, { depth: 1 });
    const mem = t.dirs.find((d) => d.dir === "memories");
    assert.ok(mem && mem.notes === 5, "all 5 notes are under memories/");
    assert.equal(t.totalNotes, 5);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- CLI --
test("runCli: unknown verb -> usage error; valid verb round-trips; ls scopes", () => {
  const { root } = makeVault();
  try {
    const bad = runCli(["frobnicate"], { vaultRoot: root });
    assert.equal(bad.ok, false);
    assert.ok(bad.error.includes("usage"));
    const ok = runCli(["status"], { vaultRoot: root });
    assert.equal(ok.ok, true);
    assert.equal(ok.result.notes, 5);
    assert.equal(VERBS.includes("backlinks"), true);
    const ls = runCli(["ls", "memories/reference"], { vaultRoot: root });
    assert.ok(ls.result.notes.every((n) => n.startsWith("memories/reference/")));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- regression: scrutiny P1/P2 fixes --
test("parseFrontmatter: nested metadata does NOT clobber a colliding top-level key", () => {
  // P1 (indent-blindness): a top-level `type` must survive a nested metadata.type;
  // metadata must be an OBJECT (not a bogus []), and non-colliding nested keys flatten.
  const p = parseFrontmatter("---\ntype: top\nname: n\nmetadata:\n  type: nested\n  galaxy: g\n---\nbody");
  assert.equal(p.fm.type, "top", "top-level type wins over nested metadata.type");
  assert.equal(p.fm.galaxy, "g", "non-colliding nested key flattens to top level");
  assert.ok(p.fm.metadata && typeof p.fm.metadata === "object" && !Array.isArray(p.fm.metadata), "metadata is an object, not a bogus list");
  assert.equal(p.fm.metadata.type, "nested");
});

test("parseSearchQuery: an unrecognized word:value token is kept as a literal term (R12)", () => {
  // P1 (silent-drop): "12:30" / "std:vector" must not vanish -- kept as a term.
  const q = parseSearchQuery("error at 12:30 std:vector tag:x");
  assert.ok(q.terms.includes("12:30"), "12:30 kept as a literal term, not dropped");
  assert.ok(q.terms.includes("std:vector"), "non-operator prefix kept whole");
  assert.deepEqual(q.filters.tag, ["x"], "real operator still parsed");
});

test("parseSearchQuery: filter dimensions are deduped", () => {
  const q = parseSearchQuery("tag:x tag:x path:a path:a");
  assert.deepEqual(q.filters.tag, ["x"]);
  assert.deepEqual(q.filters.path, ["a"]);
});

test("buildVaultModel: an oversize note is COUNTED but fully scanned (no link loss)", () => {
  const { root, w } = makeVault();
  // a >512KB note with links at both ends -- BOTH must resolve (no truncation), and
  // it must be counted as oversize for observability.
  w("big.md", "[[b]] " + "x".repeat(600000) + " [[d]]");
  try {
    const m = buildVaultModel(root);
    assert.equal(m.oversize, 1, "the >512KB note is counted as oversize");
    const big = m.notes.get("big.md");
    assert.ok(big.outlinks.includes("memories/reference/b.md"), "the head link resolves");
    assert.ok(big.outlinks.includes("memories/reference/d.md"), "the tail link ALSO resolves (no truncation)");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("extractWikilinks: bounded -- a `[`-dense unclosed run is O(n), targets capped at 256ch", () => {
  // adversarial: 200k unclosed "[[" must NOT catastrophically backtrack -> returns [] fast.
  const t0 = Date.now();
  assert.deepEqual(extractWikilinks("[[".repeat(200000)), []);
  assert.ok(Date.now() - t0 < 2000, "bounded regex returns quickly on the pathological input");
  // a normal link still matches; a >256-char target is rejected by the bound.
  assert.deepEqual(extractWikilinks("ok [[normal_target]] x"), ["normal_target"]);
  assert.deepEqual(extractWikilinks("[[" + "z".repeat(300) + "]]"), [], "a 300-char target exceeds the bound");
});

test("buildVaultModel: an unresolvable [[ghost]] increments unresolvedOut (not a silent drop)", () => {
  const { root, w } = makeVault();
  w("memories/reference/hasghost.md", "---\n---\nlinks [[zzz_ghost_zzz]] and [[b]]");
  try {
    const m = buildVaultModel(root);
    const n = m.notes.get("memories/reference/hasghost.md");
    assert.equal(n.unresolvedOut, 1, "the ghost target is counted as unresolved");
    assert.deepEqual(n.outlinks, ["memories/reference/b.md"], "the real target still resolves");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runCli: read / backlinks / tags / search / neighborhood round-trip end-to-end", () => {
  const { root } = makeVault();
  try {
    assert.equal(runCli(["read", "a"], { vaultRoot: root }).result.rel, "memories/feedback/a.md");
    assert.deepEqual(runCli(["backlinks", "a"], { vaultRoot: root }).result.backlinks, ["memories/reference/b.md"]);
    assert.equal(runCli(["tags", "x"], { vaultRoot: root }).result.count, 2);
    assert.equal(runCli(["search", "hello"], { vaultRoot: root }).result.total, 1);
    assert.equal(runCli(["neighborhood", "a", "--hops", "2"], { vaultRoot: root }).result.totalReached, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
