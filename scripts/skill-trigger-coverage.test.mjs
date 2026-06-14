// skill-trigger-coverage.test.mjs
// Tests the pure core of skill-trigger-coverage.mjs (U-LIMA-A5). Hermetic —
// computeCoverage takes injectable dirs + ledgerText + readFileImpl, so no
// subprocess needed. Covers the 3 buckets, coverage math, div-by-zero,
// stale-ledger detection, cross-tree name dedup.
//
// Run: node --test scripts/skill-trigger-coverage.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasTriggersBlock, readLedgerNames, computeCoverage, skillNameFromText } from "./skill-trigger-coverage.mjs";

// ── hasTriggersBlock ───────────────────────────────────────────────

test("hasTriggersBlock: frontmatter with block-form triggers: → true", () => {
  const md = "---\nname: foo\ntriggers:\n  - event: UserPromptSubmit\n---\n\n# foo\n";
  assert.equal(hasTriggersBlock(md), true);
});

test("hasTriggersBlock: frontmatter with flow-form triggers: [...] → true", () => {
  const md = "---\nname: foo\ntriggers: [a, b]\n---\n\n# foo\n";
  assert.equal(hasTriggersBlock(md), true);
});

test("hasTriggersBlock: frontmatter without triggers → false", () => {
  const md = "---\nname: foo\nmodel: opus\n---\n\n# foo\n";
  assert.equal(hasTriggersBlock(md), false);
});

test("hasTriggersBlock: no frontmatter at all → false", () => {
  assert.equal(hasTriggersBlock("# just a heading\n\nbody"), false);
});

test("hasTriggersBlock: empty / null / undefined → false (no crash)", () => {
  assert.equal(hasTriggersBlock(""), false);
  assert.equal(hasTriggersBlock(null), false);
  assert.equal(hasTriggersBlock(undefined), false);
});

test("hasTriggersBlock: `triggers:` only matches as a frontmatter KEY, not body prose", () => {
  // A skill whose BODY mentions "triggers:" must not false-positive.
  const md = "---\nname: foo\n---\n\n# foo\n\nThis skill triggers: a hook.\n";
  assert.equal(hasTriggersBlock(md), false);
});

// ── readLedgerNames ────────────────────────────────────────────────

test("readLedgerNames: valid JSONL → Set of distinct names", () => {
  const jsonl = [
    JSON.stringify({ name: "alpha", matcher: { value: "x" } }),
    JSON.stringify({ name: "beta", matcher: { value: "y" } }),
    JSON.stringify({ name: "alpha", matcher: { value: "z" } }), // dup name
  ].join("\n");
  const s = readLedgerNames(jsonl);
  assert.deepEqual([...s].sort(), ["alpha", "beta"]);
});

test("readLedgerNames: malformed rows are skipped, not fatal", () => {
  const jsonl = [
    JSON.stringify({ name: "good" }),
    "{ this is not json",
    "",
    "   ",
    JSON.stringify({ name: "also-good" }),
  ].join("\n");
  const s = readLedgerNames(jsonl);
  assert.deepEqual([...s].sort(), ["also-good", "good"]);
});

test("readLedgerNames: empty / null input → empty Set", () => {
  assert.equal(readLedgerNames("").size, 0);
  assert.equal(readLedgerNames(null).size, 0);
});

test("readLedgerNames: row missing `name` field is skipped", () => {
  const jsonl = JSON.stringify({ matcher: { value: "x" } }) + "\n" + JSON.stringify({ name: "ok" });
  const s = readLedgerNames(jsonl);
  assert.deepEqual([...s], ["ok"]);
});

// ── skillNameFromText (ledger-identity derivation) ─────────────────

test("skillNameFromText: frontmatter name: field wins over filename fallback", () => {
  const md = "---\nname: real-name\n---\n\n# x\n";
  assert.equal(skillNameFromText(md, "file-name"), "real-name");
});

test("skillNameFromText: no name: field → filename fallback", () => {
  assert.equal(skillNameFromText("---\nmodel: opus\n---\n\n# x\n", "file-name"), "file-name");
});

test("skillNameFromText: no frontmatter → filename fallback", () => {
  assert.equal(skillNameFromText("# just a heading", "file-name"), "file-name");
});

test("skillNameFromText: quoted name: value is unquoted", () => {
  assert.equal(skillNameFromText('---\nname: "quoted-name"\n---\n\n# x\n', "f"), "quoted-name");
});

test("skillNameFromText: trailing comment stripped from name:", () => {
  assert.equal(skillNameFromText("---\nname: clean # a comment\n---\n\n# x\n", "f"), "clean");
});

test("skillNameFromText: empty/null → fallback", () => {
  assert.equal(skillNameFromText("", "fb"), "fb");
  assert.equal(skillNameFromText(null, "fb"), "fb");
});

// ── computeCoverage (hermetic via tmpdir) ──────────────────────────

// Skill body builders — frontmatter `name:` matches the filename so coverage
// (which keys by frontmatter name:) and the test's intent agree.
const withTriggers = (n) => `---\nname: ${n}\ntriggers:\n  - event: UserPromptSubmit\n---\n\n# ${n}\n`;
const noTriggers = (n) => `---\nname: ${n}\nmodel: opus\n---\n\n# ${n}\n`;

// `skills` maps name → "WITH" | "NO" | explicit body string.
function makeSkillDir(skills) {
  const dir = mkdtempSync(join(tmpdir(), "stc-"));
  for (const [name, spec] of Object.entries(skills)) {
    const body = spec === "WITH" ? withTriggers(name)
      : spec === "NO" ? noTriggers(name)
      : spec; // explicit body
    writeFileSync(join(dir, `${name}.md`), body);
  }
  return dir;
}

test("computeCoverage: happy path — 1 covered, 1 declared-not-captured, 1 no-triggers", () => {
  const dir = makeSkillDir({
    inledger: "WITH",   // covered (in ledger)
    declared: "WITH",   // has triggers: block but NOT in ledger
    bare: "NO",         // no triggers block
  });
  const ledger = JSON.stringify({ name: "inledger", matcher: { value: "x" } });
  const r = computeCoverage({ dirs: [dir], ledgerText: ledger });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.total, 3);
  assert.equal(r.covered, 1);
  assert.equal(r.declaredNotCaptured, 1);
  assert.equal(r.noTriggers, 1);
});

test("computeCoverage: coveragePct is rounded to 1 decimal", () => {
  // 1 of 3 = 33.333% → 33.3
  const dir = makeSkillDir({ a: "WITH", b: "NO", c: "NO" });
  const ledger = JSON.stringify({ name: "a" });
  const r = computeCoverage({ dirs: [dir], ledgerText: ledger });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.coveragePct, 33.3);
});

test("computeCoverage: div-by-zero guard — 0 skills → coveragePct 0, no crash", () => {
  const dir = mkdtempSync(join(tmpdir(), "stc-empty-"));
  const r = computeCoverage({ dirs: [dir], ledgerText: "" });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.total, 0);
  assert.equal(r.coveragePct, 0);
  assert.equal(r.covered, 0);
});

test("computeCoverage: stale ledger detection — ledger name with no .md on disk", () => {
  const dir = makeSkillDir({ real: "WITH" });
  const ledger = [
    JSON.stringify({ name: "real" }),
    JSON.stringify({ name: "ghost-skill-deleted" }),
  ].join("\n");
  const r = computeCoverage({ dirs: [dir], ledgerText: ledger });
  rmSync(dir, { recursive: true, force: true });
  assert.deepEqual(r.staleLedgerNames, ["ghost-skill-deleted"]);
  assert.equal(r.covered, 1, "stale ledger names do not inflate covered count");
});

test("computeCoverage: uncovered list sorts declared-not-captured FIRST (the actionable gap)", () => {
  const dir = makeSkillDir({
    zzz_declared: "WITH",  // declared, uncovered — should sort first despite 'z'
    aaa_bare: "NO",        // bare, uncovered — sorts after despite 'a'
  });
  const r = computeCoverage({ dirs: [dir], ledgerText: "" });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.uncovered[0].name, "zzz_declared");
  assert.equal(r.uncovered[0].declared, true);
  assert.equal(r.uncovered[1].name, "aaa_bare");
  assert.equal(r.uncovered[1].declared, false);
});

test("computeCoverage: same skill name in TWO dirs counts as ONE skill", () => {
  const projectDir = makeSkillDir({ shared: "NO" });
  const userDir = makeSkillDir({ shared: "WITH" });
  const r = computeCoverage({ dirs: [projectDir, userDir], ledgerText: "" });
  rmSync(projectDir, { recursive: true, force: true });
  rmSync(userDir, { recursive: true, force: true });
  assert.equal(r.total, 1, "duplicate skill name across trees counts once");
});

test("computeCoverage: fail-on-revert — covered count must rise when ledger gains the skill", () => {
  // Regression guard: if computeCoverage stops consulting the ledger, this fails.
  const dir = makeSkillDir({ s1: "WITH", s2: "WITH" });
  const empty = computeCoverage({ dirs: [dir], ledgerText: "" });
  const full = computeCoverage({
    dirs: [dir],
    ledgerText: [JSON.stringify({ name: "s1" }), JSON.stringify({ name: "s2" })].join("\n"),
  });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(empty.covered, 0);
  assert.equal(full.covered, 2);
  assert.ok(full.coveragePct > empty.coveragePct, "ledger entries must raise coverage");
});

test("computeCoverage: name-derivation matches extractor — skill keyed by frontmatter name:, not filename", () => {
  // The ledger is keyed by frontmatter `name:`. If a skill file is named
  // `weird-filename.md` but declares `name: canonical`, coverage MUST key it
  // by `canonical` — otherwise it false-flags stale + false-classes uncovered.
  const dir = mkdtempSync(join(tmpdir(), "stc-namediv-"));
  writeFileSync(join(dir, "weird-filename.md"), "---\nname: canonical\ntriggers:\n  - event: UserPromptSubmit\n---\n\n# x\n");
  // Ledger uses the frontmatter name `canonical` (as the extractor would emit).
  const ledger = JSON.stringify({ name: "canonical", matcher: { value: "x" } });
  const r = computeCoverage({ dirs: [dir], ledgerText: ledger });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.total, 1);
  assert.equal(r.covered, 1, "skill must be COVERED — keyed by frontmatter name:, not filename");
  assert.equal(r.staleLedgerNames.length, 0, "ledger row `canonical` must NOT be flagged stale");
});

test("computeCoverage: unreadable skill file is treated as no-triggers (fail-soft)", () => {
  // readFileImpl injection — simulate an unreadable file.
  const dir = makeSkillDir({ broken: "WITH" });
  const r = computeCoverage({
    dirs: [dir],
    ledgerText: "",
    readFileImpl: () => { throw new Error("EACCES"); },
  });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.total, 1);
  assert.equal(r.noTriggers, 1, "unreadable file → empty text → no-triggers bucket, no crash");
});
