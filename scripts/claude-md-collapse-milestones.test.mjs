#!/usr/bin/env node
/**
 * claude-md-collapse-milestones.test.mjs — U-OBF-F2 (node:test).
 *
 * Tests the milestone-narrative collapse: pure-core (collapseSection) +
 * E2E (run on temp fixture). Real-value assertions only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { collapseSection, run, COLLAPSE_SPEC } from "./claude-md-collapse-milestones.mjs";

const _tmpDirs = new Set();
function tmpFile(content, name = "CLAUDE.md") {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "f2-collapse-"));
  _tmpDirs.add(d);
  const p = path.join(d, name);
  fs.writeFileSync(p, content, "utf8");
  return p;
}
process.on("exit", () => {
  for (const d of _tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

const FIXTURE = [
  "# CLAUDE.md fixture",
  "",
  "## DOCTRINE (preserve)",
  "Rule 1.",
  "Rule 2.",
  "",
  "## TARGET-MS0 (2026-05-17)",
  "Big multi-paragraph narrative",
  "",
  "- bullet one",
  "- bullet two",
  "",
  "More prose.",
  "",
  "## NEXT-DOCTRINE",
  "More rules.",
  "",
].join("\n");

// ---- collapseSection ------------------------------------------------------

test("collapseSection: replaces a found section with the one-liner", () => {
  const r = collapseSection(FIXTURE, "## TARGET-MS0", "## TARGET-MS0 — collapsed pointer · Wiki: [[target]]");
  assert.equal(r.ok, true);
  assert.equal(r.replacedLineCount, 7); // header + 6 content lines (before trailing blanks trimmed)
  assert.ok(r.content.includes("## TARGET-MS0 — collapsed pointer · Wiki: [[target]]"));
  // body should be gone
  assert.ok(!r.content.includes("Big multi-paragraph narrative"));
  assert.ok(!r.content.includes("More prose."));
  // doctrine sections untouched
  assert.ok(r.content.includes("## DOCTRINE (preserve)"));
  assert.ok(r.content.includes("Rule 1."));
  assert.ok(r.content.includes("## NEXT-DOCTRINE"));
  assert.ok(r.content.includes("More rules."));
});

test("collapseSection: header not found -> {ok:false, reason:'header_not_found'}", () => {
  const r = collapseSection(FIXTURE, "## NEVER-EXISTS", "x");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "header_not_found");
});

test("collapseSection: ambiguous header (matches >1 line) -> {ok:false, reason:'header_ambiguous'}", () => {
  const f = FIXTURE + "\n## TARGET-MS0 dup\nstuff\n";
  const r = collapseSection(f, "## TARGET-MS0", "x");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "header_ambiguous");
  assert.equal(r.matches.length, 2);
});

test("collapseSection: idempotent — second collapse on the same section is a no-op", () => {
  const ONE_LINER = "## TARGET-MS0 — collapsed pointer · Wiki: [[target]]";
  const r1 = collapseSection(FIXTURE, "## TARGET-MS0", ONE_LINER);
  assert.equal(r1.ok, true);
  const r2 = collapseSection(r1.content, "## TARGET-MS0", ONE_LINER);
  assert.equal(r2.ok, true);
  assert.equal(r2.alreadyCollapsed, true);
  assert.equal(r2.replacedLineCount, 0);
  assert.equal(r2.content, r1.content, "content unchanged on re-run");
});

test("collapseSection: preserves doctrine section BEFORE and AFTER target", () => {
  const r = collapseSection(FIXTURE, "## TARGET-MS0", "## TARGET-MS0 — x");
  const lines = r.content.split("\n");
  const idxDoctrine = lines.findIndex((l) => l === "## DOCTRINE (preserve)");
  const idxTarget = lines.findIndex((l) => l.startsWith("## TARGET-MS0"));
  const idxNext = lines.findIndex((l) => l === "## NEXT-DOCTRINE");
  assert.ok(idxDoctrine < idxTarget && idxTarget < idxNext, "ordering preserved");
  assert.equal(idxTarget + 2, idxNext, "exactly one blank between collapsed line and next section");
});

test("collapseSection: detects CRLF and preserves it", () => {
  const crlf = FIXTURE.replace(/\n/g, "\r\n");
  const r = collapseSection(crlf, "## TARGET-MS0", "## TARGET-MS0 — x");
  assert.equal(r.ok, true);
  assert.equal(r.eol, "\r\n");
  assert.ok(r.content.includes("\r\n## TARGET-MS0 — x\r\n"));
});

test("collapseSection: section at EOF (no following ## section) collapses correctly", () => {
  const eof = ["# title", "", "## ONLY-MS0", "body", "more body", ""].join("\n");
  const r = collapseSection(eof, "## ONLY-MS0", "## ONLY-MS0 — x");
  assert.equal(r.ok, true);
  assert.ok(r.content.includes("## ONLY-MS0 — x"));
  assert.ok(!r.content.includes("more body"));
});

test("collapseSection: P1 guard — replacement-presence MUST NOT mask uncollapsed body when headerPrefix is still present", () => {
  // Reviewer A P1: if the file already contains the replacement line somewhere
  // (e.g. pasted near top) AND the original section's body still exists, the
  // collapse MUST proceed — not silently return alreadyCollapsed.
  const text = [
    "# title",
    "",
    "## TARGET-MS0 — collapsed pointer",  // pasted replacement (no-body)
    "",
    "## OTHER",
    "intervening",
    "",
    "## TARGET-MS0 — long original",      // real un-collapsed section
    "actual body line 1",
    "actual body line 2",
    "",
    "## TAIL",
  ].join("\n");
  const r = collapseSection(text, "## TARGET-MS0", "## TARGET-MS0 — collapsed pointer");
  // header_ambiguous — both lines start with the headerPrefix. The correct
  // safe behavior: refuse to collapse silently when two copies exist (the
  // operator must disambiguate). Returning alreadyCollapsed here would have
  // been silent data-loss (the un-collapsed body survives but the run reports
  // "no-op", concealing the still-present narrative).
  assert.equal(r.ok, false);
  assert.equal(r.reason, "header_ambiguous");
});

test("collapseSection: idempotent — headerPrefix gone, replacement present, returns alreadyCollapsed", () => {
  // The legitimate already-collapsed state: replacement drops the original
  // headerPrefix shape (e.g. headerPrefix `## GOLF SLOT (7th hygiene chat` →
  // replacement `## GOLF SLOT — ...`). headerPrefix no longer matches; the
  // replacement is present. This MUST be treated as alreadyCollapsed.
  const text = [
    "# title",
    "",
    "## GOLF SLOT — fleet-hygiene-only chat",   // collapsed
    "",
    "## NEXT",
    "after",
  ].join("\n");
  const r = collapseSection(text, "## GOLF SLOT (7th hygiene chat", "## GOLF SLOT — fleet-hygiene-only chat");
  assert.equal(r.ok, true);
  assert.equal(r.alreadyCollapsed, true);
  assert.equal(r.replacedLineCount, 0);
});

// ---- COLLAPSE_SPEC integrity ----------------------------------------------

test("COLLAPSE_SPEC: every entry has a unique headerPrefix", () => {
  const seen = new Set();
  for (const e of COLLAPSE_SPEC) {
    assert.ok(!seen.has(e.headerPrefix), `duplicate headerPrefix: ${e.headerPrefix}`);
    seen.add(e.headerPrefix);
  }
});

test("COLLAPSE_SPEC: every replacement is a single line and starts with ##", () => {
  for (const e of COLLAPSE_SPEC) {
    assert.ok(!e.replacement.includes("\n"), `replacement must be single-line: ${e.headerPrefix}`);
    assert.ok(e.replacement.startsWith("## "), `replacement must start with "## ": ${e.headerPrefix}`);
  }
});

test("COLLAPSE_SPEC: every replacement contains at least one wiki [[link]] or memory reference", () => {
  for (const e of COLLAPSE_SPEC) {
    assert.ok(/\[\[[^\]]+\]\]|knowledge\/wiki/.test(e.replacement),
      `replacement must point to wiki / memory entry: ${e.headerPrefix}`);
  }
});

// ---- run() E2E ------------------------------------------------------------

test("run: dry-run writes nothing", () => {
  const p = tmpFile(FIXTURE);
  const spec = [{ headerPrefix: "## TARGET-MS0", replacement: "## TARGET-MS0 — x" }];
  const before = fs.readFileSync(p, "utf8");
  const r = run({ claudeMd: p, spec, dryRun: true });
  assert.equal(r.ok, true);
  assert.equal(r.dryRun, true);
  assert.equal(r.collapsedCount, 1);
  assert.equal(fs.readFileSync(p, "utf8"), before, "file untouched");
});

test("run: applies collapse atomically", () => {
  const p = tmpFile(FIXTURE);
  const spec = [{ headerPrefix: "## TARGET-MS0", replacement: "## TARGET-MS0 — x" }];
  const r = run({ claudeMd: p, spec });
  assert.equal(r.ok, true);
  assert.equal(r.collapsedCount, 1);
  assert.ok(r.afterBytes < r.beforeBytes);
  assert.ok(r.afterLines < r.beforeLines);
  const after = fs.readFileSync(p, "utf8");
  assert.ok(after.includes("## TARGET-MS0 — x"));
  assert.ok(!after.includes("Big multi-paragraph narrative"));
});

test("run: skips not-found headers without failing the whole run", () => {
  const p = tmpFile(FIXTURE);
  const spec = [
    { headerPrefix: "## TARGET-MS0", replacement: "## TARGET-MS0 — x" },
    { headerPrefix: "## ABSENT-MS9", replacement: "## ABSENT — y" },
  ];
  const r = run({ claudeMd: p, spec });
  assert.equal(r.ok, true);
  assert.equal(r.collapsedCount, 1);
  assert.equal(r.results.filter((x) => x.status === "skipped").length, 1);
  assert.equal(r.results.find((x) => x.status === "skipped").reason, "header_not_found");
});

test("run: idempotent on the real spec — second run is no-op (collapsedCount + skippedCount conserved)", () => {
  // Build a fixture from the real spec headers (and matching bodies) so all
  // entries in COLLAPSE_SPEC have a section to act on. This is a sanity check
  // that the live spec's headers do not interfere with each other under
  // sequential collapse.
  const fixture = [
    "# header",
    "",
    ...COLLAPSE_SPEC.flatMap((e) => [
      e.headerPrefix + " — long original",
      "body line 1",
      "body line 2",
      "",
    ]),
    "## SENTINEL",
    "after",
  ].join("\n");
  const p = tmpFile(fixture);
  const r1 = run({ claudeMd: p, spec: COLLAPSE_SPEC });
  assert.equal(r1.ok, true);
  assert.equal(r1.collapsedCount, COLLAPSE_SPEC.length);
  const r2 = run({ claudeMd: p, spec: COLLAPSE_SPEC });
  assert.equal(r2.ok, true);
  assert.equal(r2.collapsedCount, 0, "second run: all already-collapsed");
  assert.equal(r2.skippedCount, COLLAPSE_SPEC.length);
  // Every entry that went "collapsed" in r1 must go "already_collapsed" in r2.
  // Defends against the false-idempotent class where a replacement that doesn't
  // share its headerPrefix (e.g. headerPrefix "## GOLF SLOT (7th hygiene chat"
  // → replacement "## GOLF SLOT — ...") falls through to "header_not_found"
  // and is silently counted as "skipped" rather than "already_collapsed".
  const r2Statuses = r2.results.map((x) => x.status);
  assert.equal(r2Statuses.filter((s) => s === "already_collapsed").length, COLLAPSE_SPEC.length);
  assert.equal(r2Statuses.filter((s) => s === "skipped").length, 0,
    "no entry should fall through to header_not_found on the second run");
});

test("run: read failure on missing file returns {ok:false}", () => {
  const r = run({ claudeMd: path.join(os.tmpdir(), "absolutely-missing-" + Date.now() + ".md") });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "read_failed");
});
