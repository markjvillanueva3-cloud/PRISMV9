// Tests for scripts/vault-link-doctor.mjs -- the broken-wikilink classifier+healer.
// Pure-function units + a hermetic real-FS vault (tmp) exercising diagnose() +
// applyHeals() on real file IO, with mutation-proof rewrite assertions (a mass
// vault mutator must never corrupt a note).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  slugify, isNonNote, isMirrorStub, isTestDoc, preferKebabVariant, buildSlugIndex, classifyBrokenTarget, codeRanges,
  rewriteLinks, diagnose, applyHeals, stripCode,
} from "./vault-link-doctor.mjs";

// -- slugify --
test("slugify: collapses separators/case to a bare [a-z0-9] key", () => {
  assert.equal(slugify("Reference-Slot-Reclaim-2026-05-19"), "referenceslotreclaim20260519");
  assert.equal(slugify("reference_slot_reclaim_2026_05_19"), "referenceslotreclaim20260519");
  assert.equal(slugify("KienzleCoefficients"), "kienzlecoefficients");
  assert.equal(slugify("kienzle-coefficients.md"), "kienzlecoefficients");
  assert.equal(slugify("   "), "");
});

// -- isNonNote --
test("isNonNote: .base/asset/external are non-note; a plain name is not", () => {
  assert.equal(isNonNote("memory-by-type.base"), true);
  assert.equal(isNonNote("diagram.canvas"), true);
  assert.equal(isNonNote("https://example.com"), true);
  assert.equal(isNonNote("obsidian://open?vault=x"), true);
  assert.equal(isNonNote("pic.png"), true);
  assert.equal(isNonNote("reference_foo"), false);
  assert.equal(isNonNote("Some Concept"), false);
});

// -- isNonNote: folder-nav + quoted-literal false-positive guard (U-SIERRA-LINKDOCTOR-FOLDER-GUARD) --
test("isNonNote: trailing-slash folder links and quoted literals are non-note", () => {
  // [[tribal/]] / [[sessions/]] are folder navigation, NOT a note -- matching them to a
  // same-basename wiki note (wiki/.../tribal.md) was a false positive in the ambiguous report.
  assert.equal(isNonNote("tribal/"), true);
  assert.equal(isNonNote("sessions/"), true);
  assert.equal(isNonNote("memories/feedback/"), true);
  // [["cam"]] -- a quoted literal captured from code/array text in a transcript, not a wikilink.
  assert.equal(isNonNote('"cam"'), true);
  assert.equal(isNonNote("'x'"), true);
  // a path-style NOTE link (no trailing slash) is STILL a note -- must not over-match:
  assert.equal(isNonNote("memories/feedback/foo"), false);
  assert.equal(isNonNote("psn_synergy_inspector_engine"), false);
});

// -- buildSlugIndex + classifyBrokenTarget --
function idxFrom(pairs) {
  // pairs: [normalizedKey, [relpaths]] -> mimics navigator.basenameIndex
  return new Map(pairs);
}
test("classifyBrokenTarget: unique slug match -> HEALABLE; none -> DANGLING; .base -> NON_NOTE", () => {
  const basename = idxFrom([
    ["reference_slot_reclaim_2026_05_19", ["memories/reference/reference_slot_reclaim_2026_05_19.md"]],
    ["kienzle-coefficients", ["wiki/architecture/actions/calc/kienzle-coefficients.md"]],
  ]);
  const slug = buildSlugIndex(basename);
  // dash-form link, underscore-form file -> unique HEALABLE
  const h = classifyBrokenTarget("reference-slot-reclaim-2026-05-19", "memories/feedback/x.md", slug);
  assert.equal(h.cls, "HEALABLE");
  assert.equal(h.to, "memories/reference/reference_slot_reclaim_2026_05_19.md");
  // camelCase link, kebab file -> unique HEALABLE
  assert.equal(classifyBrokenTarget("KienzleCoefficients", "memories/feedback/x.md", slug).cls, "HEALABLE");
  // genuine never-created concept -> DANGLING
  assert.equal(classifyBrokenTarget("Perceptron", "x.md", slug).cls, "DANGLING");
  // .base -> NON_NOTE
  assert.equal(classifyBrokenTarget("memory-by-type.base", "x.md", slug).cls, "NON_NOTE");
});
test("classifyBrokenTarget: ambiguous (>1 slug candidate) is DANGLING, NEVER auto-picked", () => {
  const slug = buildSlugIndex(idxFrom([
    ["dup_one", ["a/dup-one.md"]],
    ["dup-one", ["b/dup_one.md"]],
  ]));
  const c = classifyBrokenTarget("DupOne", "z.md", slug);
  assert.equal(c.cls, "DANGLING");
  assert.equal(c.candidates, 2, "ambiguity is surfaced, not resolved");
  assert.deepEqual([...c.cands].sort(), ["a/dup-one.md", "b/dup_one.md"], "the rival notes are surfaced (for --ambiguous review), not just counted");
});
test("classifyBrokenTarget: a target whose only slug match is the SOURCE note is DANGLING (no self-heal)", () => {
  const slug = buildSlugIndex(idxFrom([["self_note", ["memories/self-note.md"]]]));
  assert.equal(classifyBrokenTarget("self-note", "memories/self-note.md", slug).cls, "DANGLING");
});

// -- isMirrorStub + canonical-preference derank --
test("isMirrorStub: matches galaxies/ triplet-stubs/ _legacy-root/ as path segments (win/posix), not canonical dirs or prefixes", () => {
  assert.equal(isMirrorStub("memories/galaxies/mill/x.md"), true);
  assert.equal(isMirrorStub("wiki/architecture/courses/triplet-stubs/x.md"), true);
  assert.equal(isMirrorStub("memories/_legacy-root/x.md"), true);
  assert.equal(isMirrorStub("memories\\galaxies\\mill\\x.md"), true, "windows separators normalized");
  assert.equal(isMirrorStub("memories/reference/x.md"), false);
  assert.equal(isMirrorStub("wiki/architecture/formulas/x.md"), false);
  assert.equal(isMirrorStub("galaxiesreport/x.md"), false, "must be a whole path segment, not a prefix");
});

test("classifyBrokenTarget: slug colliding ONLY via a galaxies/ mirror -> HEALABLE to canonical (deranked)", () => {
  const slug = buildSlugIndex(idxFrom([
    ["reference_fleet_reaper", ["memories/reference/reference_fleet_reaper.md"]],
    ["reference-fleet-reaper", ["memories/galaxies/system-viz/reference_fleet_reaper.md"]],
  ]));
  const c = classifyBrokenTarget("ReferenceFleetReaper", "x.md", slug);
  assert.equal(c.cls, "HEALABLE");
  assert.equal(c.to, "memories/reference/reference_fleet_reaper.md", "heals to canonical, NOT the galaxies mirror");
  assert.equal(c.deranked, true);
});

test("classifyBrokenTarget: slug colliding ONLY via a _legacy-root/ mirror -> HEALABLE to canonical (deranked)", () => {
  const slug = buildSlugIndex(idxFrom([
    ["feedback_golf_owns_reaper", ["memories/feedback/feedback_golf_owns_reaper.md"]],
    ["feedback-golf-owns-reaper", ["memories/_legacy-root/feedback_golf_owns_reaper.md"]],
  ]));
  const c = classifyBrokenTarget("feedback golf owns reaper", "x.md", slug);
  assert.equal(c.cls, "HEALABLE");
  assert.equal(c.to, "memories/feedback/feedback_golf_owns_reaper.md");
  assert.equal(c.deranked, true);
});

test("classifyBrokenTarget: slug colliding ONLY via a triplet-stubs/ stub -> HEALABLE to canonical (deranked)", () => {
  const slug = buildSlugIndex(idxFrom([
    ["mit-15-060-fall-2014", ["wiki/architecture/courses/mit-15-060-fall-2014.md"]],
    ["mit_15_060_fall_2014", ["wiki/architecture/courses/triplet-stubs/mit-15-060-fall-2014.md"]],
  ]));
  const c = classifyBrokenTarget("MIT 15 060 fall 2014", "x.md", slug);
  assert.equal(c.cls, "HEALABLE");
  assert.equal(c.to, "wiki/architecture/courses/mit-15-060-fall-2014.md");
  assert.equal(c.deranked, true);
});

test("classifyBrokenTarget: slug present ONLY in mirror copies (no canonical) stays ambiguous -- cannot pick", () => {
  const slug = buildSlugIndex(idxFrom([
    ["x_mem", ["memories/galaxies/mill/x_mem.md"]],
    ["x-mem", ["memories/galaxies/lathe/x_mem.md"]],
  ]));
  const c = classifyBrokenTarget("XMem", "z.md", slug);
  assert.equal(c.cls, "DANGLING", "two mirror copies, zero canonical -> still ambiguous");
  assert.equal(c.candidates, 2);
});

test("classifyBrokenTarget: derank removes mirror noise but KEEPS a genuine 2-canonical ambiguity", () => {
  const slug = buildSlugIndex(idxFrom([
    ["dup_a", ["memories/reference/dup_a.md"]],
    ["dup-a", ["wiki/architecture/dup_a.md"]],
    ["dupa", ["memories/galaxies/mill/dup_a.md"]],
  ]));
  const c = classifyBrokenTarget("DupA", "z.md", slug);
  assert.equal(c.cls, "DANGLING", "2 canonical rivals remain -> still ambiguous, never auto-picked");
  assert.equal(c.candidates, 2, "the galaxies mirror is deranked OUT of the rival count");
  assert.deepEqual([...c.cands].sort(), ["memories/reference/dup_a.md", "wiki/architecture/dup_a.md"]);
});

test("classifyBrokenTarget: same-dir separator-variants -> HEALABLE to the kebab-case canonical (sep-variant collapse)", () => {
  const slug = buildSlugIndex(idxFrom([
    ["formula-x-quote", ["wiki/architecture/formulas/formula-x-quote.md"]],
    ["formula-xquote", ["wiki/architecture/formulas/formula-xquote.md"]],
  ]));
  const c = classifyBrokenTarget("formula_x_quote", "z.md", slug);
  // same logical note, same dir, differ ONLY by an internal separator -> the kebab form
  // (more word-boundary separators) is the canonical wiki slug -> resolve to it.
  assert.equal(c.cls, "HEALABLE");
  assert.equal(c.to, "wiki/architecture/formulas/formula-x-quote.md", "prefer the kebab-case form");
  assert.equal(c.deranked, true);
});

test("preferKebabVariant: same-dir sep-variants -> unique most-separated; non-variants / cross-dir / ties -> null", () => {
  // pure separator-variant pair -> the kebab form
  assert.equal(
    preferKebabVariant(["wiki/formulas/foo-bar-quote.md", "wiki/formulas/foo-barquote.md"]),
    "wiki/formulas/foo-bar-quote.md");
  // different DIR (category dup) -> null: never guess which category is canonical
  assert.equal(
    preferKebabVariant(["wiki/engines/calc/codeengine.md", "wiki/engines/other/codeengine.md"]),
    null);
  // genuinely different notes (not separator-variants of one name) -> null
  assert.equal(preferKebabVariant(["wiki/x/alpha.md", "wiki/x/beta.md"]), null);
  // 3-way, unique max separators -> that one
  assert.equal(
    preferKebabVariant(["wiki/f/a-b-c.md", "wiki/f/a-bc.md", "wiki/f/ab-c.md"]),
    "wiki/f/a-b-c.md");
  // tie at the max separator count -> null (no unique kebab winner)
  assert.equal(
    preferKebabVariant(["wiki/f/a-b.md", "wiki/f/ab.md", "wiki/f/a_b.md"]),
    null);
  // single / empty -> null
  assert.equal(preferKebabVariant(["wiki/f/a-b.md"]), null);
  assert.equal(preferKebabVariant([]), null);
});

test("classifyBrokenTarget: category-dir dup (same basename, different dir) is NOT sep-collapsed -> stays ambiguous", () => {
  const slug = buildSlugIndex(idxFrom([
    ["codeengine", ["wiki/architecture/engines/calc/codeengine.md", "wiki/architecture/engines/other/codeengine.md"]],
  ]));
  const c = classifyBrokenTarget("CodeEngine", "z.md", slug);
  assert.equal(c.cls, "DANGLING", "category-dir dups have no kebab tell -> stay ambiguous, never auto-picked");
  assert.equal(c.candidates, 2);
});

// -- isTestDoc + test-doc derank --
test("isTestDoc: matches a tests/ path segment, not a 'test' substring in a filename", () => {
  assert.equal(isTestDoc("wiki/architecture/tests/qd/qdrantmemoryengine.md"), true);
  assert.equal(isTestDoc("wiki/architecture/test/x.md"), true, "singular test/ also matches");
  assert.equal(isTestDoc("wiki/architecture/engines/memory/qdrantmemoryengine.md"), false);
  assert.equal(isTestDoc("wiki/architecture/tests-overview.md"), false, "a filename containing 'tests' is NOT a tests/ dir");
  assert.equal(isTestDoc("memories\\architecture\\tests\\x.md"), true, "windows separators normalized");
});

test("classifyBrokenTarget: a real engine/action doc colliding ONLY with its tests/ doc -> HEALABLE to the real one (deranked)", () => {
  const slug = buildSlugIndex(idxFrom([
    ["qdrantmemoryengine", ["wiki/architecture/engines/memory/qdrantmemoryengine.md", "wiki/architecture/tests/qd/qdrantmemoryengine.md"]],
  ]));
  const c = classifyBrokenTarget("qdrant-memory-engine", "z.md", slug);
  assert.equal(c.cls, "HEALABLE", "the tests/ doc is non-canonical noise -> the engine is the unique canonical");
  assert.equal(c.to, "wiki/architecture/engines/memory/qdrantmemoryengine.md");
  assert.equal(c.deranked, true);
});

test("classifyBrokenTarget: a slug present ONLY in tests/ docs (no real subject) stays ambiguous -- never heal to a test", () => {
  const slug = buildSlugIndex(idxFrom([
    ["onlytest", ["wiki/architecture/tests/a/onlytest.md", "wiki/architecture/tests/b/onlytest.md"]],
  ]));
  const c = classifyBrokenTarget("only-test", "z.md", slug);
  assert.equal(c.cls, "DANGLING", "all candidates are tests/ -> fall back to full set, never auto-pick a test");
  assert.equal(c.candidates, 2);
});

// -- codeRanges --
test("codeRanges: finds fenced + inline code spans", () => {
  const t = "a `inline` b\n```\nfence [[x]]\n``` c";
  const r = codeRanges(t);
  assert.ok(r.length >= 2);
  // the [[x]] offset must fall inside a code range
  const at = t.indexOf("[[x]]");
  assert.ok(r.some(([a, b]) => at >= a && at < b));
});

// -- rewriteLinks (SURGICAL + mutation-proof) --
test("rewriteLinks: swaps only the target, preserves alias + heading + embed", () => {
  const heals = new Map([["old-form", "memories/reference/canonical_note.md"]]);
  assert.equal(rewriteLinks("see [[old-form]] end", heals).text, "see [[canonical_note]] end");
  assert.equal(rewriteLinks("see [[old-form|nice name]]", heals).text, "see [[canonical_note|nice name]]");
  assert.equal(rewriteLinks("see [[old-form#section]]", heals).text, "see [[canonical_note#section]]");
  assert.equal(rewriteLinks("embed ![[old-form]]", heals).text, "embed ![[canonical_note]]");
});
test("rewriteLinks: NEVER touches a link inside code (mutation-proof safety)", () => {
  const heals = new Map([["old-form", "x/canonical.md"]]);
  const inFence = "```\n[[old-form]]\n```";
  assert.equal(rewriteLinks(inFence, heals).count, 0, "fenced link untouched");
  const inInline = "`[[old-form]]`";
  assert.equal(rewriteLinks(inInline, heals).count, 0, "inline-code link untouched");
});
test("rewriteLinks: leaves unmapped links + all other text byte-identical", () => {
  const heals = new Map([["old-form", "x/canonical.md"]]);
  const src = "# Title\n\nKeep [[unmapped-link]] and prose. Heal [[old-form]] here.\n\n- bullet\n";
  const { text, count } = rewriteLinks(src, heals);
  assert.equal(count, 1);
  assert.equal(text, "# Title\n\nKeep [[unmapped-link]] and prose. Heal [[canonical]] here.\n\n- bullet\n");
});
test("rewriteLinks: heals every occurrence of the same target", () => {
  const heals = new Map([["a", "dir/aa.md"]]);
  const { text, count } = rewriteLinks("[[a]] x [[a|alias]] y [[a#h]]", heals);
  assert.equal(count, 3);
  assert.equal(text, "[[aa]] x [[aa|alias]] y [[aa#h]]");
});
test("rewriteLinks: empty heals / non-string -> no-op", () => {
  assert.equal(rewriteLinks("[[a]]", new Map()).count, 0);
  assert.equal(rewriteLinks(null, new Map([["a", "b.md"]])).text, null);
});

// -- hermetic vault: diagnose + applyHeals --
function makeVault() {
  const root = mkdtempSync(join(tmpdir(), "linkdoc-"));
  const w = (rel, content) => {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  };
  // canonical targets
  w("memories/reference/reference_slot_reclaim_2026_05_19.md", "---\nname: reference_slot_reclaim_2026_05_19\n---\nbody");
  w("wiki/calc/kienzle-coefficients.md", "---\nname: kienzle-coefficients\n---\nbody");
  // a source note with: 1 healable (dash->underscore), 1 dangling concept, 1 .base non-note, 1 healable camelCase
  w("memories/feedback/src.md", "---\n---\nsee [[reference-slot-reclaim-2026-05-19]] and [[Perceptron]] and [[x.base]] and [[KienzleCoefficients]]");
  return { root, w };
}

test("diagnose: classifies HEALABLE / DANGLING / NON_NOTE with real counts", () => {
  const { root } = makeVault();
  try {
    const r = diagnose(root);
    assert.equal(r.healable, 2, "the dash-form + camelCase links are healable");
    assert.equal(r.dangling, 1, "Perceptron is dangling");
    assert.equal(r.nonNote, 1, "x.base is non-note");
    const hm = r.healByNote.get("memories/feedback/src.md");
    assert.ok(hm && hm.size === 2);
    assert.equal(hm.get("reference-slot-reclaim-2026-05-19"), "memories/reference/reference_slot_reclaim_2026_05_19.md");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("diagnose: an ambiguous broken link is captured in ambiguousLinks with its rival candidates", () => {
  const root = mkdtempSync(join(tmpdir(), "linkdoc-amb-"));
  const w = (rel, content) => { const full = join(root, rel); mkdirSync(join(full, ".."), { recursive: true }); writeFileSync(full, content); };
  // two notes whose basenames slugify to the SAME slug (dupone) but have DISTINCT
  // normalizeKeys (dup_one vs dup-one); a source whose link normalizeKey (dupone)
  // matches NEITHER -> broken -> slug-ambiguous (2 rivals).
  w("a/dup_one.md", "---\n---\nbody");
  w("b/dup-one.md", "---\n---\nbody");
  w("src.md", "---\n---\nsee [[DupOne]]");
  try {
    const r = diagnose(root);
    assert.equal(r.ambiguous, 1, "DupOne is ambiguous (2 slug rivals)");
    assert.equal(r.ambiguousLinks.length, 1);
    const a = r.ambiguousLinks[0];
    assert.equal(a.from, "src.md");
    assert.equal(a.target, "DupOne");
    assert.deepEqual([...a.candidates].sort(), ["a/dup_one.md", "b/dup-one.md"], "both rival notes captured for review");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("diagnose+applyHeals: a galaxies/ mirror collision is deranked -> healed to canonical (derankedHeals counted, convergent)", () => {
  const root = mkdtempSync(join(tmpdir(), "linkdoc-derank-"));
  const w = (rel, content) => { const full = join(root, rel); mkdirSync(join(full, ".."), { recursive: true }); writeFileSync(full, content); };
  // a canonical memo + a galaxies/ MIRROR with the SAME basename (slug-collides), and a
  // source linking the dash-form (broken at the navigator, slug-matches both).
  w("memories/reference/reference_fleet_reaper.md", "---\nname: reference_fleet_reaper\n---\nbody");
  w("memories/galaxies/system-viz/reference_fleet_reaper.md", "---\nname: reference_fleet_reaper\n---\nmirror");
  w("memories/feedback/src.md", "---\n---\nsee [[reference-fleet-reaper]]");
  try {
    const r = diagnose(root);
    assert.equal(r.ambiguous, 0, "the mirror collision is NOT counted ambiguous (deranked to canonical)");
    assert.equal(r.healable, 1, "it is HEALABLE to the canonical");
    assert.equal(r.derankedHeals, 1, "and surfaced as a mirror-derank heal (honest count)");
    const hm = r.healByNote.get("memories/feedback/src.md");
    assert.equal(hm.get("reference-fleet-reaper"), "memories/reference/reference_fleet_reaper.md", "heals to canonical, not the galaxies mirror");
    applyHeals(r, root);
    const after = readFileSync(join(root, "memories/feedback/src.md"), "utf8");
    assert.ok(after.includes("[[reference_fleet_reaper]]"), "rewritten to the canonical basename (no longer broken)");
    assert.equal(diagnose(root).healable, 0, "convergent: after apply, nothing healable remains");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("applyHeals: rewrites the source links on disk, leaving dangling/non-note intact", () => {
  const { root } = makeVault();
  try {
    const r = diagnose(root);
    const res = applyHeals(r, root);
    assert.equal(res.filesHealed, 1);
    assert.equal(res.linksHealed, 2);
    const after = readFileSync(join(root, "memories/feedback/src.md"), "utf8");
    assert.ok(after.includes("[[reference_slot_reclaim_2026_05_19]]"), "dash-form healed to canonical");
    assert.ok(after.includes("[[kienzle-coefficients]]"), "camelCase healed to canonical");
    assert.ok(after.includes("[[Perceptron]]"), "dangling concept left intact");
    assert.ok(after.includes("[[x.base]]"), "non-note left intact");
    // idempotent: re-diagnose -> 0 healable left
    const r2 = diagnose(root);
    assert.equal(r2.healable, 0, "after heal, nothing healable remains (idempotent)");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("applyHeals: skips ALL writes when the memory-sync lock is held (never write mid-feed)", () => {
  const { root } = makeVault();
  try {
    writeFileSync(join(root, ".obsidian-memory-sync.lock"), "held");
    const r = diagnose(root);
    const res = applyHeals(r, root);
    assert.equal(res.filesHealed, 0);
    assert.ok(res.skippedLocked >= 1, "lock-held -> skipped, surfaced");
    // source unchanged
    const after = readFileSync(join(root, "memories/feedback/src.md"), "utf8");
    assert.ok(after.includes("[[reference-slot-reclaim-2026-05-19]]"), "no rewrite under lock");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("applyHeals: a per-file write error is fail-soft (other files still heal)", () => {
  const { root } = makeVault();
  try {
    const r = diagnose(root);
    let calls = 0;
    const throwingWrite = () => { calls++; throw new Error("EACCES"); };
    const res = applyHeals(r, root, { writeFileImpl: throwingWrite });
    assert.equal(res.filesHealed, 0, "write failed -> 0 healed, but no throw");
    assert.ok(calls >= 1);
    // original intact (atomic temp never renamed)
    assert.ok(readFileSync(join(root, "memories/feedback/src.md"), "utf8").includes("[[reference-slot-reclaim-2026-05-19]]"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- stripCode + diagnose code-span convergence (scrutiny arm-C P2 fix) --
test("stripCode: blanks fenced + inline code, preserves length; non-string -> ''", () => {
  const t = "a `x` b\n```\nfence\n``` z";
  const s = stripCode(t);
  assert.equal(s.length, t.length, "length preserved (offsets stable)");
  assert.ok(!s.includes("fence") && !s.includes("`"), "code content blanked");
  assert.ok(s.startsWith("a ") && s.trimEnd().endsWith("z"), "non-code text preserved");
  assert.equal(stripCode(null), "");
});

test("diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)", () => {
  const { root, w } = makeVault();
  // the only broken link is inside a fence -> rewriteLinks would refuse it, so
  // diagnose must NOT count it HEALABLE (else the count never converges).
  w("memories/feedback/codeonly.md", "---\n---\nexample:\n```\n[[reference-slot-reclaim-2026-05-19]]\n```\n");
  try {
    const r = diagnose(root);
    // the code-embedded link must not appear in any heal map for this note
    assert.ok(!r.healByNote.has("memories/feedback/codeonly.md"), "code-embedded link not queued for heal");
    // apply then re-diagnose must be a fixed point (0 healable) -- convergence
    applyHeals(r, root);
    const r2 = diagnose(root);
    assert.equal(r2.healable, 0, "no healable remains after apply (convergent)");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("applyHeals: backupDir snapshots the ORIGINAL before mutating (reversibility)", () => {
  const { root } = makeVault();
  const backup = mkdtempSync(join(tmpdir(), "linkdoc-bak-"));
  try {
    const r = diagnose(root);
    const res = applyHeals(r, root, { backupDir: backup });
    assert.ok(res.backedUp >= 1, "originals were backed up");
    assert.equal(res.backupDir, backup);
    // the backup holds the PRE-heal content (broken link), the live file holds the heal
    const bak = readFileSync(join(backup, "memories/feedback/src.md"), "utf8");
    assert.ok(bak.includes("[[reference-slot-reclaim-2026-05-19]]"), "backup = original (broken) link");
    const live = readFileSync(join(root, "memories/feedback/src.md"), "utf8");
    assert.ok(live.includes("[[reference_slot_reclaim_2026_05_19]]"), "live = healed link");
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(backup, { recursive: true, force: true }); }
});
