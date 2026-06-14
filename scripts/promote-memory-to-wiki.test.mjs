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
  memoryIdentifiers, ageDays, shouldPromote, wikiSlugFor, buildWikiEntry,
  runMemoryPromotion, TYPE_TO_WIKI_SECTION,
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
