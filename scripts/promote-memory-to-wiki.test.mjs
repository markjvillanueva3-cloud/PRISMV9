// Tests for scripts/promote-memory-to-wiki.mjs (U-VAULT02).
// Pure-function units + a hermetic real-FS end-to-end (tmp vault, controlled
// `nowMs` for age) so the promotion gate is exercised on real file IO, not mocks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  extractWikilinkTargets, normId, parseMemoryFrontmatter, resolveType,
  memoryIdentifiers, ageDays, shouldPromote, nonPromotableReason, wikiSlugFor, buildWikiEntry,
  runMemoryPromotion, TYPE_TO_WIKI_SECTION, isHubSource,
} from "./promote-memory-to-wiki.mjs";

const DAY = 86_400_000;

// ── extractWikilinkTargets ─────────────────────────────────────────────
test("extractWikilinkTargets: plain + alias + anchor + anchor|alias", () => {
  const t = "a [[plain]] b [[targ|nice name]] c [[doc#sec]] d [[p#h|alias]]";
  assert.deepEqual(extractWikilinkTargets(t), ["plain", "targ", "doc", "p"]);
});
test("extractWikilinkTargets: empty + null + no-links are []", () => {
  assert.deepEqual(extractWikilinkTargets("[[]] no real links"), []);
  assert.deepEqual(extractWikilinkTargets(null), []);
  assert.deepEqual(extractWikilinkTargets("nothing here"), []);
});

// ── normId ─────────────────────────────────────────────────────────────
test("normId: case-fold, drop .md, unify dash->underscore", () => {
  assert.equal(normId("Reference-U-Vault01.md"), "reference_u_vault01");
  assert.equal(normId("feedback_golf_owns_reaper"), "feedback_golf_owns_reaper");
});

// ── parseMemoryFrontmatter ─────────────────────────────────────────────
test("parseMemoryFrontmatter: flat type + nested metadata.type + aliases", () => {
  const flat = parseMemoryFrontmatter("---\nname: x\ntype: feedback\n---\nbody");
  assert.equal(flat.fm.type, "feedback");
  assert.equal(flat.body, "body");
  const nested = parseMemoryFrontmatter("---\nname: y\nmetadata:\n  type: reference\naliases: [a, b]\n---\nB");
  assert.equal(nested.fm.type, "reference");
  assert.deepEqual(nested.fm.aliases, ["a", "b"]);
});
test("parseMemoryFrontmatter: unterminated frontmatter -> null (malformed)", () => {
  assert.equal(parseMemoryFrontmatter("---\nname: x\nno closing fence"), null);
});
test("parseMemoryFrontmatter: no frontmatter -> empty fm, full body", () => {
  const p = parseMemoryFrontmatter("just a body");
  assert.deepEqual(p.fm, {});
  assert.equal(p.body, "just a body");
});

// ── resolveType ────────────────────────────────────────────────────────
test("resolveType: filename prefix wins over frontmatter", () => {
  assert.equal(resolveType("feedback_x.md", { type: "reference" }), "feedback");
  assert.equal(resolveType("reference_y.md", {}), "reference");
  assert.equal(resolveType("random.md", { type: "patterns" }), "patterns");
  assert.equal(resolveType("random.md", {}), "uncategorized");
});

// ── memoryIdentifiers ──────────────────────────────────────────────────
test("memoryIdentifiers: filename + name + aliases, normalized", () => {
  const ids = memoryIdentifiers("reference_u_vault01.md", { name: "reference-u-vault01", aliases: ["U Vault01"] });
  assert.ok(ids.has("reference_u_vault01"));      // filename + name (dash->underscore) collapse to one id
  assert.ok(ids.has(normId("U Vault01")));         // alias normalized ("u vault01")
});

// ── ageDays + shouldPromote ────────────────────────────────────────────
test("ageDays computes whole-day delta", () => {
  assert.equal(ageDays(0, 10 * DAY), 10);
});
test("shouldPromote: happy path passes", () => {
  assert.equal(shouldPromote({ type: "feedback", inboundRefs: 3, ageDaysVal: 7, minRefs: 3, minAge: 7 }), true);
});
test("shouldPromote: below refs / below age / wrong type all fail", () => {
  assert.equal(shouldPromote({ type: "feedback", inboundRefs: 2, ageDaysVal: 30, minRefs: 3, minAge: 7 }), false);
  assert.equal(shouldPromote({ type: "feedback", inboundRefs: 9, ageDaysVal: 1, minRefs: 3, minAge: 7 }), false);
  assert.equal(shouldPromote({ type: "project", inboundRefs: 9, ageDaysVal: 30, minRefs: 3, minAge: 7 }), false);
});
test("shouldPromote: adversarial non-finite refs/age fail closed (defensive)", () => {
  // A non-finite age/ref count only arises from a corrupt stat or clock, never
  // legitimate operation — so the gate fails closed rather than promote on garbage.
  assert.equal(shouldPromote({ type: "feedback", inboundRefs: NaN, ageDaysVal: 30, minRefs: 3, minAge: 7 }), false);
  assert.equal(shouldPromote({ type: "feedback", inboundRefs: 5, ageDaysVal: Infinity, minRefs: 3, minAge: 7 }), false);
  assert.equal(shouldPromote({ type: "feedback", inboundRefs: Infinity, ageDaysVal: 30, minRefs: 3, minAge: 7 }), false);
  assert.equal(shouldPromote({ type: "feedback", inboundRefs: 5, ageDaysVal: NaN, minRefs: 3, minAge: 7 }), false);
});

// -- nonPromotableReason (wiki holds verified knowledge, not graph atoms/advisory) --
test("nonPromotableReason: node_kind graph-pointer is excluded", () => {
  assert.equal(nonPromotableReason({ type: "reference", node_kind: "formula" }), "node-pointer");
  assert.equal(nonPromotableReason({ type: "reference", node_kind: "course" }), "node-pointer");
});
test("nonPromotableReason: advisoryOnly / mustHumanVerify (YAML-truthy spellings) excluded", () => {
  assert.equal(nonPromotableReason({ type: "patterns", advisoryOnly: true }), "unverified-advisory");
  assert.equal(nonPromotableReason({ type: "patterns", mustHumanVerify: "true" }), "unverified-advisory");
  assert.equal(nonPromotableReason({ type: "patterns", advisoryOnly: "TRUE" }), "unverified-advisory");
  assert.equal(nonPromotableReason({ type: "patterns", advisoryOnly: "1" }), "unverified-advisory");
  assert.equal(nonPromotableReason({ type: "patterns", mustHumanVerify: "yes" }), "unverified-advisory");
  assert.equal(nonPromotableReason({ type: "patterns", advisoryOnly: "on" }), "unverified-advisory");
});
test("nonPromotableReason: a clean knowledge atom is promotable (null) -- no over-blocking", () => {
  assert.equal(nonPromotableReason({ type: "feedback", name: "feedback_x" }), null);
  assert.equal(nonPromotableReason({ type: "reference", node_kind: "", mustHumanVerify: "false" }), null);
  assert.equal(nonPromotableReason({ type: "reference", advisoryOnly: false }), null);
  // falsy YAML spellings must NOT exclude (no over-blocking)
  assert.equal(nonPromotableReason({ type: "reference", advisoryOnly: "0" }), null);
  assert.equal(nonPromotableReason({ type: "reference", mustHumanVerify: "no" }), null);
  assert.equal(nonPromotableReason({ type: "reference", advisoryOnly: "off" }), null);
});
test("nonPromotableReason: run_log (YAML-truthy) excluded as run-log; falsy promotes", () => {
  assert.equal(nonPromotableReason({ type: "reference", run_log: true }), "run-log");
  assert.equal(nonPromotableReason({ type: "reference", run_log: "true" }), "run-log");
  assert.equal(nonPromotableReason({ type: "reference", run_log: "1" }), "run-log");
  assert.equal(nonPromotableReason({ type: "reference", run_log: false }), null);
  assert.equal(nonPromotableReason({ type: "reference", run_log: "0" }), null);
});
test("nonPromotableReason: deadbeef-sentinel test fixtures excluded; real ids promote", () => {
  assert.equal(nonPromotableReason({ type: "feedback", sessionId: "c0f06deedeadbeefdeadbeefdeadbeef" }), "test-fixture");
  assert.equal(nonPromotableReason({ type: "feedback", agent: "claude-DEADBEEF" }), "test-fixture");
  assert.equal(nonPromotableReason({ type: "feedback", originSessionId: "deadbeef-1234" }), "test-fixture");
  assert.equal(nonPromotableReason({ type: "feedback", sessionId: "a1b2c3d4e5f60718293a4b5c6d7e8f90" }), null);
  assert.equal(nonPromotableReason({ type: "feedback", agent: "claude-a1b2c3d4" }), null);
});
test("nonPromotableReason: garbage fm fails open to null (no crash)", () => {
  assert.equal(nonPromotableReason(null), null);
  assert.equal(nonPromotableReason(undefined), null);
  assert.equal(nonPromotableReason("not-an-object"), null);
  assert.equal(nonPromotableReason(42), null);
});

// ── wikiSlugFor + buildWikiEntry ───────────────────────────────────────
test("wikiSlugFor prefers name: slug, sanitizes", () => {
  assert.equal(wikiSlugFor("feedback_x.md", { name: "Feedback X!" }), "feedback-x-");
  assert.equal(wikiSlugFor("feedback_x.md", {}), "feedback_x");
});
test("buildWikiEntry: section map + promoted frontmatter + source backlink", () => {
  const e = buildWikiEntry({
    fileName: "feedback_golf.md", fm: { name: "feedback_golf", title: "Golf owns reaper" },
    body: "Golf owns the reaper.", type: "feedback", inboundRefs: 5,
    memoryRelPath: "knowledge/memories/feedback/feedback_golf.md",
  });
  assert.equal(e.section, "lessons");
  assert.equal(e.fileName, "feedback_golf.md");
  assert.match(e.content, /status: promoted/);
  assert.match(e.content, /source_refs: 5/);
  assert.match(e.content, /promoted_from: knowledge\/memories\/feedback\/feedback_golf\.md/);
  assert.match(e.content, /## Source/);
  assert.match(e.content, /\[\[feedback_golf\]\]/); // wiki -> memory backlink
});
test("buildWikiEntry returns null for non-promotable type", () => {
  assert.equal(buildWikiEntry({ fileName: "project_x.md", fm: {}, body: "b", type: "project", inboundRefs: 9, memoryRelPath: "x" }), null);
});
test("TYPE_TO_WIKI_SECTION excludes project + user", () => {
  assert.equal("project" in TYPE_TO_WIKI_SECTION, false);
  assert.equal("user" in TYPE_TO_WIKI_SECTION, false);
  assert.equal(TYPE_TO_WIKI_SECTION.feedback, "lessons");
  assert.equal(TYPE_TO_WIKI_SECTION.reference, "reference");
});

// ── end-to-end on a hermetic tmp vault ─────────────────────────────────
function makeVault() {
  const root = mkdtempSync(join(tmpdir(), "vault-promote-"));
  const mem = join(root, "knowledge", "memories");
  const wiki = join(root, "knowledge", "wiki");
  mkdirSync(join(mem, "feedback"), { recursive: true });
  mkdirSync(join(mem, "reference"), { recursive: true });
  mkdirSync(join(mem, "project"), { recursive: true });
  mkdirSync(wiki, { recursive: true });
  return { root, mem, wiki };
}

test("runMemoryPromotion: promotes a durable (refs>=3, old) feedback memory", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "feedback", "feedback_star.md"), "---\nname: feedback_star\ntype: feedback\n---\nStar rule.");
    // three OTHER files reference it (aliased + anchored forms included -> regression cover)
    writeFileSync(join(mem, "reference", "reference_a.md"), "---\nname: reference_a\ntype: reference\n---\nsee [[feedback_star]]");
    writeFileSync(join(mem, "reference", "reference_b.md"), "---\nname: reference_b\ntype: reference\n---\nsee [[feedback_star|the star rule]]");
    writeFileSync(join(mem, "reference", "reference_c.md"), "---\nname: reference_c\ntype: reference\n---\nsee [[feedback-star#why]]");

    const future = Date.now() + 30 * DAY; // make every file look 30 days old
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: future });
    assert.equal(r.promoted, 1);
    const star = r.candidates.find((c) => c.memory === "feedback_star.md");
    assert.ok(star, "feedback_star should be a candidate");
    assert.equal(star.refs, 3, "alias + anchor + plain forms must all count");
    assert.ok(existsSync(join(wiki, "lessons", "feedback_star.md")));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: gates below-refs and below-age", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "feedback", "feedback_lonely.md"), "---\nname: feedback_lonely\ntype: feedback\n---\nx");
    writeFileSync(join(mem, "reference", "reference_one.md"), "---\nname: reference_one\ntype: reference\n---\n[[feedback_lonely]]");
    // only 1 ref -> belowRefs
    let r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: false, nowMs: Date.now() + 30 * DAY });
    assert.equal(r.promoted, 0);
    assert.ok(r.belowRefs >= 1);

    // make it referenced 3x but young -> belowAge
    writeFileSync(join(mem, "reference", "reference_two.md"), "---\nname: reference_two\ntype: reference\n---\n[[feedback_lonely]]");
    writeFileSync(join(mem, "reference", "reference_three.md"), "---\nname: reference_three\ntype: reference\n---\n[[feedback_lonely]]");
    r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: false, nowMs: Date.now() + 60 * 60 * 1000 });
    assert.equal(r.candidates.length, 0);
    assert.ok(r.belowAge >= 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: never promotes project/user type even when popular+old", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "project", "project_hot.md"), "---\nname: project_hot\ntype: project\n---\nongoing");
    for (const n of ["a", "b", "c", "d"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[project_hot]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 90 * DAY });
    assert.equal(r.promoted, 0);
    assert.ok(r.skippedType >= 1);
    assert.equal(existsSync(join(wiki, "lessons", "project_hot.md")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: never promotes a node_kind graph-pointer (inflated index-hub refs)", () => {
  const { root, mem, wiki } = makeVault();
  try {
    // A course node pointer: type=reference (in the section map) BUT node_kind set.
    // An index hub links it (mirrors the real MIT-index inflating its refs past minRefs).
    writeFileSync(
      join(mem, "reference", "node_course_x.md"),
      "---\nname: node-course-x\ntype: reference\nnode_kind: course\n---\nPointer: [[mit-x]].",
    );
    for (const n of ["a", "b", "c", "d"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[node_course_x]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 90 * DAY });
    assert.equal(r.skippedNonPromotable, 1, "the node_kind pointer is excluded BEFORE the ref/age gate");
    assert.ok(!r.candidates.some((c) => c.memory === "node_course_x.md"), "node pointer must not be a candidate");
    assert.equal(r.promoted, 0);
    assert.equal(r.written.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: never promotes explicitly-unverified (advisoryOnly/mustHumanVerify) content", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(
      join(mem, "reference", "reference_synth.md"),
      "---\nname: reference_synth\ntype: reference\nadvisoryOnly: true\nmustHumanVerify: true\n---\nLLM synthesis -- verify before trusting.",
    );
    for (const n of ["a", "b", "c", "d"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[reference_synth]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 90 * DAY });
    assert.equal(r.skippedNonPromotable, 1);
    assert.equal(r.promoted, 0);
    assert.equal(r.written.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: never promotes a run-log memory (run_log:true), popular+old", () => {
  const { root, mem, wiki } = makeVault();
  try {
    // mirrors nn-retrain run-logs: type=reference, refs inflated by an index hub, but run_log:true.
    writeFileSync(
      join(mem, "reference", "reference_retrain_x.md"),
      "---\nname: nn-retrain-x\ntype: reference\nrun_log: true\n---\nGNN retrain round metrics.",
    );
    for (const n of ["a", "b", "c", "d"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[reference_retrain_x]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 90 * DAY });
    assert.equal(r.skippedNonPromotable, 1);
    assert.equal(r.promoted, 0);
    assert.equal(r.written.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: excludes run_log in the REAL nested metadata: shape (not just flat)", () => {
  const { root, mem, wiki } = makeVault();
  try {
    // the production shape emitted by nn-feedback-to-memory.mjs: run_log nested under metadata:
    writeFileSync(
      join(mem, "reference", "reference_retrain_nested.md"),
      "---\nname: nn-retrain-nested\ndescription: GNN retrain\nmetadata:\n  type: reference\n  run_log: true\n---\nmetrics.",
    );
    for (const n of ["a", "b", "c", "d"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[reference_retrain_nested]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 90 * DAY });
    assert.equal(r.skippedNonPromotable, 1, "nested metadata.run_log must flatten + exclude");
    assert.equal(r.written.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: never promotes a deadbeef test fixture, popular+old", () => {
  const { root, mem, wiki } = makeVault();
  try {
    // mirrors feedback_d2_smoke: feedback type via filename prefix, deadbeef provenance.sessionId,
    // refs supplied via an alias (as the real dream-hub links do).
    writeFileSync(
      join(mem, "feedback", "feedback_smoke_x.md"),
      "---\nprovenance:\n  sessionId: c0f06deedeadbeefdeadbeefdeadbeef\n  agent: claude-c0f06dee\naliases: [smoke-x]\n---\nsmoke memo body.",
    );
    for (const n of ["a", "b", "c", "d"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[smoke-x]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 90 * DAY });
    assert.equal(r.skippedNonPromotable, 1, "deadbeef sentinel excludes the fixture before the ref gate");
    assert.equal(r.written.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: a genuine knowledge atom (no node_kind, not advisory) STILL promotes", () => {
  const { root, mem, wiki } = makeVault();
  try {
    // regression guard: the new exclusion must not block legitimately-earned memories.
    writeFileSync(join(mem, "reference", "reference_real.md"), "---\nname: reference_real\ntype: reference\n---\nA genuine synthesized insight.");
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[reference_real]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 30 * DAY });
    assert.equal(r.skippedNonPromotable, 0);
    assert.equal(r.promoted, 1);
    assert.ok(r.candidates.some((c) => c.memory === "reference_real.md"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: skip-if-exists is idempotent (re-run promotes 0)", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "feedback", "feedback_idem.md"), "---\nname: feedback_idem\ntype: feedback\n---\nrule");
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[feedback_idem]]`);
    }
    const future = Date.now() + 30 * DAY;
    const first = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: future });
    assert.equal(first.promoted, 1);
    const second = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: future });
    assert.equal(second.promoted, 0);
    assert.ok(second.skippedExisting >= 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: --backlink adds an idempotent memory->wiki pointer", () => {
  const { root, mem, wiki } = makeVault();
  try {
    const memPath = join(mem, "feedback", "feedback_bl.md");
    writeFileSync(memPath, "---\nname: feedback_bl\ntype: feedback\n---\nbacklink me");
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[feedback_bl]]`);
    }
    const future = Date.now() + 30 * DAY;
    const r1 = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, backlink: true, nowMs: future });
    assert.equal(r1.backlinked, 1);
    const after = readFileSync(memPath, "utf8");
    assert.match(after, /promoted-to-wiki: \[\[feedback_bl\]\]/);
    // re-run: wiki exists so 0 promoted, and pointer already present so no double-write
    const r2 = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, backlink: true, nowMs: future });
    assert.equal(r2.backlinked, 0);
    const occurrences = (readFileSync(memPath, "utf8").match(/promoted-to-wiki/g) || []).length;
    assert.equal(occurrences, 1, "backlink must be idempotent");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: malformed memory counted, does not crash the run", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "feedback", "feedback_bad.md"), "---\nname: broken\nno closing fence at all");
    writeFileSync(join(mem, "feedback", "feedback_ok.md"), "---\nname: feedback_ok\ntype: feedback\n---\nok");
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[feedback_ok]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 30 * DAY });
    assert.ok(r.malformed >= 1);
    assert.equal(r.promoted, 1); // the good one still promotes
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: a self-referencing memory does not count itself", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "feedback", "feedback_self.md"), "---\nname: feedback_self\ntype: feedback\n---\nI mention [[feedback_self]] thrice [[feedback_self]] [[feedback_self]]");
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: false, nowMs: Date.now() + 30 * DAY });
    assert.equal(r.candidates.length, 0); // self-refs excluded -> 0 inbound
    assert.ok(r.belowRefs >= 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- isHubSource: structural ref-count de-inflation (aggregators are not genuine cross-refs) --
test("isHubSource: dreams/ _index/ index.md are hub sources; atoms + wiki entries are not", () => {
  // hub sources: cataloging / free-association, NOT genuine cross-referencing
  assert.equal(isHubSource("H:/prism/knowledge/memories/dreams/dream_42.md"), true);
  assert.equal(isHubSource("H:/prism/knowledge/memories/_index/all.md"), true);
  assert.equal(isHubSource("H:/prism/knowledge/wiki/index.md"), true);
  assert.equal(isHubSource("H:/prism/knowledge/wiki/consensus/index.md"), true);
  assert.equal(isHubSource("C:\\Users\\x\\knowledge\\memories\\dreams\\d.md"), true); // backslash paths normalize
  // genuine sources are NOT hubs
  assert.equal(isHubSource("H:/prism/knowledge/memories/feedback/feedback_x.md"), false);
  assert.equal(isHubSource("H:/prism/knowledge/wiki/lessons/golf.md"), false);
  // segment-anchored: "dreams"/"index" as a substring (not a path segment / basename) must NOT match
  assert.equal(isHubSource("H:/prism/knowledge/memories/reference/reference_dreams_analysis.md"), false);
  assert.equal(isHubSource("H:/prism/knowledge/wiki/architecture/index-design.md"), false);
  assert.equal(isHubSource("H:/prism/knowledge/memories/dreamscape/d.md"), false); // adjacent segment, not "dreams"
  // nested under a hub segment still matches; degenerate inputs fail closed (false, no crash)
  assert.equal(isHubSource("H:/prism/knowledge/memories/dreams/sub/deep.md"), true);
  assert.equal(isHubSource(""), false);
  assert.equal(isHubSource(null), false);
});

test("runMemoryPromotion: refs from a dreams/ hub do NOT count toward the gate (de-inflation)", () => {
  const { root, mem, wiki } = makeVault();
  try {
    mkdirSync(join(mem, "dreams"), { recursive: true });
    writeFileSync(join(mem, "reference", "reference_hubonly.md"), "---\nname: reference_hubonly\ntype: reference\n---\nGenuine-looking atom, but only a dream hub links it.");
    // 3 dream files each link it -> WITHOUT de-inflation this would clear minRefs=3 falsely.
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(mem, "dreams", `dream_${n}.md`), `---\nname: dream_${n}\ntype: reference\n---\nfree association [[reference_hubonly]]`);
    }
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 30 * DAY });
    // MUTATION-PROOF: remove isHubSource and the 3 dream refs count -> this promotes (test fails).
    assert.ok(!r.candidates.some((c) => c.memory === "reference_hubonly.md"), "dream-hub-only refs must not make it a candidate");
    assert.equal(r.promoted, 0);
    assert.ok(r.hubSourcesSkipped >= 3, "the 3 dream sources were skipped from the scan");
    assert.ok(r.belowRefs >= 1, "with hub refs excluded it falls below minRefs");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("runMemoryPromotion: genuine refs still promote; a wiki index.md source does not pad the count", () => {
  const { root, mem, wiki } = makeVault();
  try {
    writeFileSync(join(mem, "reference", "reference_mixed.md"), "---\nname: reference_mixed\ntype: reference\n---\nGenuinely cross-referenced atom.");
    // 3 GENUINE reference files link it -> promotes on its own merit.
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(mem, "reference", `reference_${n}.md`), `---\nname: reference_${n}\ntype: reference\n---\n[[reference_mixed]]`);
    }
    // a wiki catalog index.md ALSO links it -> must NOT add to the count (stays exactly 3).
    writeFileSync(join(wiki, "index.md"), "# Catalog\n- [[reference_mixed]]\n");
    const r = runMemoryPromotion({ memoryRoot: mem, wikiRoot: wiki, apply: true, nowMs: Date.now() + 30 * DAY });
    const cand = r.candidates.find((c) => c.memory === "reference_mixed.md");
    assert.ok(cand, "genuine 3-ref atom still promotes");
    // MUTATION-PROOF: remove isHubSource and the index.md ref pads this to 4.
    assert.equal(cand.refs, 3, "the wiki index.md source must not inflate beyond the 3 genuine refs");
    assert.equal(r.promoted, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
