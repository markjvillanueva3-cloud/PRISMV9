/**
 * Tests for vault-wiki-to-lora-dataset.mjs (AI-SYSTEMS-LORA, slot:india 2026-06-21).
 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
 * the gate, the section parser, the dedup, or the IO walk regresses. Pure
 * functions tested directly; the disk walk tested via an injected in-memory fs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stripHeadingOrdinal,
  domainForDoc,
  parseWikiSections,
  sectionToAlpaca,
  buildExamplesFromWikiDoc,
  dedupPairs,
  examplesFromDocs,
  enumerateWikiDocs,
  collectWikiKnowledgeExamples,
  resolveOutPath,
  DEFAULT_OUT,
  MIN_SECTION_CHARS,
  MAX_OUTPUT_CHARS,
} from "./vault-wiki-to-lora-dataset.mjs";

// A body guaranteed to clear MIN_SECTION_CHARS + the prose-residue gate.
const PROSE = "This is a substantial practitioner gotcha narrative that explains why a failure happens and how an expert avoids it, with enough real prose to clear the minimum-section gate comfortably.";
assert.ok(PROSE.length >= MIN_SECTION_CHARS, "fixture must exceed MIN_SECTION_CHARS");

// ---- stripHeadingOrdinal ----
test("stripHeadingOrdinal removes a leading 'N. ' / 'N) ' ordinal, keeps subtitle", () => {
  assert.equal(stripHeadingOrdinal("1. Wire breakage -- thermal stress"), "Wire breakage -- thermal stress");
  assert.equal(stripHeadingOrdinal("12) Taper error"), "Taper error");
  assert.equal(stripHeadingOrdinal("No ordinal here"), "No ordinal here");
  assert.equal(stripHeadingOrdinal(""), "");
  assert.equal(stripHeadingOrdinal(null), "");
});

// ---- domainForDoc ----
test("domainForDoc: frontmatter galaxy wins; dir is fallback; general/empty -> null", () => {
  assert.equal(domainForDoc("title: x\ngalaxy: wedm", "lessons"), "wedm"); // frontmatter authoritative
  assert.equal(domainForDoc("title: x", "lathe"), "lathe");                 // dir fallback
  assert.equal(domainForDoc("galaxy: general", "mill"), null);             // general -> null (cross-cutting)
  assert.equal(domainForDoc("", ""), null);
  assert.equal(domainForDoc("galaxy: WEDM", "x"), "wedm");                 // lowercased
});

// ---- parseWikiSections ----
test("parseWikiSections: ### children are leaves; a ##-with-children does NOT double-emit; ##-only-prose emits", () => {
  const body = [
    "Intro under the H1 is ignored.",
    "## Common failure modes",
    "intro prose under the H2 (dropped because H2 has ### children)",
    "### 1. Wire breakage",
    "wire breakage narrative line one",
    "wire breakage narrative line two",
    "### 2. Flushing starvation",
    "flushing narrative",
    "## Standalone section",
    "standalone prose with no subsections",
  ].join("\n");
  const secs = parseWikiSections(body);
  const headings = secs.map((s) => `${s.level}:${s.heading}`);
  // The H2 'Common failure modes' must NOT appear (it has ### children).
  assert.deepEqual(headings, ["3:1. Wire breakage", "3:2. Flushing starvation", "2:Standalone section"]);
  assert.match(secs[0].body, /wire breakage narrative line one\nwire breakage narrative line two/);
  assert.equal(secs[2].body, "standalone prose with no subsections");
});

test("parseWikiSections: #### folds into its ### parent; non-string -> []", () => {
  const body = "## A\n### Topic\nline\n#### deeper\nfolded line";
  const secs = parseWikiSections(body);
  assert.equal(secs.length, 1);
  assert.match(secs[0].body, /folded line/); // #### content stays with its ### parent
  assert.deepEqual(parseWikiSections(null), []);
});

// ---- sectionToAlpaca: happy ----
test("sectionToAlpaca happy: topic-framed instruction, advisory input, output=body, galaxy+provenance", () => {
  const pair = sectionToAlpaca({ heading: "1. Wire breakage", level: 3, body: PROSE }, "wedm", "wedm/wedm-applied-practice.md");
  assert.equal(pair.instruction, "In PRISM's wedm domain, explain: Wire breakage");
  assert.equal(pair.input, "PRISM wedm knowledge (curated wiki, advisory -- verify against source)");
  assert.equal(pair.output, PROSE);
  assert.equal(pair._galaxy, "wedm");
  assert.equal(pair._advisory, true);
  assert.match(pair._source, /^wedm\/wedm-applied-practice\.md#Wire breakage/);
});

// ---- sectionToAlpaca: failure modes ----
test("sectionToAlpaca failure 1: body below MIN_SECTION_CHARS -> null", () => {
  assert.equal(sectionToAlpaca({ heading: "X", level: 3, body: "too short" }, "mill"), null);
});

test("sectionToAlpaca failure 2: non-knowledge heading (Owner-gate / References / Sources) -> null", () => {
  assert.equal(sectionToAlpaca({ heading: "Owner-gate", level: 2, body: PROSE }, "wedm"), null);
  assert.equal(sectionToAlpaca({ heading: "References", level: 2, body: PROSE }, "wedm"), null);
  assert.equal(sectionToAlpaca({ heading: "See also", level: 2, body: PROSE }, "wedm"), null);
  assert.equal(sectionToAlpaca({ heading: "Source atlas", level: 2, body: PROSE }, "wedm"), null);
});

test("sectionToAlpaca failure 3: links-only body (prose residue too small) -> null", () => {
  const linksOnly = Array.from({ length: 9 }, (_, i) => `- [reference document number ${i}](path/to/doc-${i}.md)`).join("\n");
  assert.ok(linksOnly.length >= MIN_SECTION_CHARS, "fixture must pass the length gate so the residue gate is what rejects");
  assert.equal(sectionToAlpaca({ heading: "Directory", level: 2, body: linksOnly }, "wedm"), null);
});

test("sectionToAlpaca failure 4 (arm-A P1): code-fence dump / wiki-backlink wall / inline-code paths -> null", () => {
  // a ```bash CLI/test transcript is not domain knowledge
  const codeFence = "```bash\n" + "node scripts/foo.mjs --out bar && rtk vitest run && echo done\n".repeat(6) + "```";
  assert.ok(codeFence.length >= MIN_SECTION_CHARS);
  assert.equal(sectionToAlpaca({ heading: "Quick start", level: 2, body: codeFence }, "mill"), null);
  // a wall of [[wiki backlinks]] is a directory, not knowledge (use a non-skip
  // heading so the RESIDUE gate -- not the heading gate -- is what must reject it)
  const backlinks = Array.from({ length: 9 }, (_, i) => `- [[reference_some_engine_topic_${i}]] [[wiki/section/leaf-${i}]]`).join("\n");
  assert.ok(backlinks.length >= MIN_SECTION_CHARS);
  assert.equal(sectionToAlpaca({ heading: "Pointers", level: 2, body: backlinks }, "mill"), null);
  // a body of only inline-code paths is markup, not prose
  const codePaths = Array.from({ length: 12 }, (_, i) => "- `scripts/module-" + i + ".mjs`").join("\n");
  assert.ok(codePaths.length >= MIN_SECTION_CHARS);
  assert.equal(sectionToAlpaca({ heading: "Modules", level: 2, body: codePaths }, "mill"), null);
});

test("sectionToAlpaca failure 5 (arm-A P1): process/footer headings are skipped even with prose-looking bodies", () => {
  for (const h of ["Cross-refs", "Related", "Files changed", "Live verification", "Quick CLI usage", "Wiki + related", "Bridge engines fed by this pass"]) {
    assert.equal(sectionToAlpaca({ heading: h, level: 2, body: PROSE }, "mill"), null, `heading "${h}" must be skipped`);
  }
});

// ---- sectionToAlpaca: adversarial ----
test("sectionToAlpaca adversarial 1: oversize body truncated to MAX_OUTPUT_CHARS", () => {
  const big = "x".repeat(MAX_OUTPUT_CHARS + 500);
  const pair = sectionToAlpaca({ heading: "Big", level: 3, body: big }, "mill");
  assert.equal(pair.output.length, MAX_OUTPUT_CHARS);
});

test("sectionToAlpaca adversarial 2: null domain -> cross-domain framing; quotes/markdown in heading stay JSON-safe", () => {
  const pair = sectionToAlpaca({ heading: '2. "Quoted" topic with [link](x)', level: 3, body: PROSE }, null, "");
  assert.equal(pair._galaxy, undefined);
  assert.equal(pair.input, "PRISM cross-domain knowledge (curated wiki, advisory -- verify against source)");
  assert.match(pair.instruction, /^In PRISM's knowledge base, explain: "Quoted" topic with \[link\]\(x\)$/);
  // round-trips through JSON without throwing / corruption
  assert.deepEqual(JSON.parse(JSON.stringify(pair)).instruction, pair.instruction);
});

// ---- buildExamplesFromWikiDoc ----
test("buildExamplesFromWikiDoc: full doc -> domain-tagged pairs; no-sections / non-string -> []", () => {
  const md = [
    "---", "title: WEDM Applied Practice", "galaxy: wedm", "---",
    "# WEDM Applied Practice", "doc intro ignored",
    "## Common failure modes",
    "### 1. Wire breakage", PROSE,
    "## Owner-gate", PROSE, // must be dropped by the skip-heading gate
  ].join("\n");
  const pairs = buildExamplesFromWikiDoc(md, "wedm", "wedm/wedm-applied-practice.md");
  assert.equal(pairs.length, 1); // only the ### leaf; Owner-gate dropped
  assert.equal(pairs[0]._galaxy, "wedm");
  assert.equal(buildExamplesFromWikiDoc("# Title\nno sections", "x", "x.md").length, 0);
  assert.deepEqual(buildExamplesFromWikiDoc(null), []);
});

// ---- dedupPairs ----
test("dedupPairs: identical outputs collapse to one; non-array -> []", () => {
  const a = { instruction: "q1", output: "SAME body" };
  const b = { instruction: "q2", output: "same   BODY" }; // normalized-equal (case + ws)
  const c = { instruction: "q3", output: "different" };
  assert.equal(dedupPairs([a, b, c]).length, 2);
  assert.deepEqual(dedupPairs(null), []);
});

// ---- examplesFromDocs ----
test("examplesFromDocs: aggregates pairs, byDomain counts, and reports deduped", () => {
  const docOf = (galaxy, topic, body) =>
    ({ relpath: `${galaxy}/x.md`, dir: galaxy, md: `---\ngalaxy: ${galaxy}\n---\n## S\n### ${topic}\n${body}` });
  const res = examplesFromDocs([
    docOf("mill", "A", PROSE),
    docOf("lathe", "B", PROSE + " lathe-distinct"),
    docOf("mill", "A", PROSE), // duplicate output -> deduped
  ]);
  assert.equal(res.scanned, 3);
  assert.equal(res.accepted, 3);    // 3 raw pairs built
  assert.equal(res.deduped, 1);     // one collapsed
  assert.equal(res.examples.length, 2);
  assert.equal(res.byDomain.mill, 1);
  assert.equal(res.byDomain.lathe, 1);
});

// ---- enumerateWikiDocs (injected in-memory fs) ----
test("enumerateWikiDocs: skips EXCLUDE_DIRS + catalog files, recurses, honors limit", () => {
  // in-memory tree: wiki/{wedm/{a.md}, architecture/{stub.md}, reference/{sub/{r.md}}, code-tribal/{x.md}}
  const dirent = (name, isDir) => ({ name, isDirectory: () => isDir, isFile: () => !isDir });
  const tree = {
    "/wiki": [dirent("wedm", true), dirent("architecture", true), dirent("reference", true), dirent("code-tribal", true), dirent(".git", true)],
    "/wiki/wedm": [dirent("a.md", false), dirent("index.md", false)],
    "/wiki/architecture": [dirent("stub.md", false)],
    "/wiki/reference": [dirent("sub", true)],
    "/wiki/reference/sub": [dirent("r.md", false)],
    "/wiki/code-tribal": [dirent("x.md", false)],
  };
  const files = {
    "/wiki/wedm/a.md": "## S\n### T\nbody",
    "/wiki/wedm/index.md": "catalog",
    "/wiki/architecture/stub.md": "stub",
    "/wiki/reference/sub/r.md": "ref body",
    "/wiki/code-tribal/x.md": "learning",
  };
  const sep = (...p) => p.join("/");
  const fakeFs = {
    readdirSync: (d) => { const v = tree[d.split("\\").join("/")]; if (!v) throw new Error("ENOENT"); return v; },
    readFileSync: (p) => { const v = files[p.split("\\").join("/")]; if (v == null) throw new Error("ENOENT"); return v; },
  };
  const docs = enumerateWikiDocs("/wiki", fakeFs);
  const rels = docs.map((d) => d.relpath).sort();
  // architecture/** + code-tribal/** + .git excluded; index.md skipped; reference recursed.
  assert.deepEqual(rels, ["reference/sub/r.md", "wedm/a.md"]);
  assert.equal(docs.find((d) => d.relpath === "wedm/a.md").dir, "wedm");
  // limit caps the walk
  assert.equal(enumerateWikiDocs("/wiki", fakeFs, { limit: 1 }).length, 1);
  // unreadable root -> [] (fail-soft)
  assert.deepEqual(enumerateWikiDocs("/nope", fakeFs), []);
});

// ---- collectWikiKnowledgeExamples (disk-collect wrapper, DI'd fs) ----
test("collectWikiKnowledgeExamples: derives files/dirs/pairs from the walk + build", () => {
  const dirent = (name, isDir) => ({ name, isDirectory: () => isDir, isFile: () => !isDir });
  const tree = {
    "/wiki": [dirent("wedm", true), dirent("mill", true), dirent("architecture", true)],
    "/wiki/wedm": [dirent("a.md", false)],
    "/wiki/mill": [dirent("b.md", false)],
    "/wiki/architecture": [dirent("stub.md", false)], // excluded -> not counted
  };
  // DISTINCT bodies per doc so each survives dedup (unambiguous files/dirs/pairs).
  const files = {
    "/wiki/wedm/a.md": `---\ngalaxy: wedm\n---\n## S\n### Topic\n${PROSE} wedm-distinct tail.`,
    "/wiki/mill/b.md": `---\ngalaxy: mill\n---\n## S\n### Topic\n${PROSE} mill-distinct tail.`,
    "/wiki/architecture/stub.md": `## S\n### Topic\n${PROSE}`,
  };
  const fakeFs = {
    readdirSync: (d) => { const v = tree[d.split("\\").join("/")]; if (!v) throw new Error("ENOENT"); return v; },
    readFileSync: (p) => { const v = files[p.split("\\").join("/")]; if (v == null) throw new Error("ENOENT"); return v; },
  };
  const res = collectWikiKnowledgeExamples("/wiki", fakeFs);
  assert.equal(res.files, 2);             // architecture/ excluded from the walk
  assert.equal(res.dirs, 2);             // wedm + mill
  assert.equal(res.examples.length, 2);  // one pair per doc, distinct bodies -> no dedup
  assert.equal(res.deduped, 0);
  assert.equal(res.byDomain.wedm, 1);
  assert.equal(res.byDomain.mill, 1);
});

// ---- resolveOutPath (clobber guard) ----
test("resolveOutPath: null -> DEFAULT_OUT; protected feedback file throws; normal passes", () => {
  assert.equal(resolveOutPath(null), DEFAULT_OUT);
  assert.equal(resolveOutPath("state/shared/lora/custom.jsonl"), "state/shared/lora/custom.jsonl");
  assert.throws(() => resolveOutPath("state/shared/lora/vault-feedback-dataset.jsonl"), /refusing to write the hand-authored verified set/);
});
