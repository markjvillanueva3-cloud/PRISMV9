#!/usr/bin/env node
/**
 * handoff-consolidate.test.mjs — node:test suite for OBSIDIAN-BRAIN-FIX-MS0/U-OBF01.
 *
 * Real-value assertions only (no toBeDefined stubs). Every case pins a
 * meaningful invariant. Includes a regression guard for the \Z-at-EOF bug
 * (JS regex has no \Z) and a faithful repro of the live HTML-queue orphaning.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, utimesSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractResume,
  isPlaceholderResume,
  slotOfHandoffFilename,
  normalizeForDedup,
  unitIdsInResume,
  decideShipped,
  consolidate,
  readHandoffDir,
  writeConsolidated,
} from "./handoff-consolidate.mjs";

const HTML_RESUME =
  "Continue HTML-COMPANION-MS0 (4u). Order: U-HTML-CLAUDE-MD-EDIT -> " +
  "U-HTML-DOCTRINE-UPDATE -> U-HTML-COMPANION-GENERATOR (build scripts/" +
  "spec-html-companion-generator.mjs ON TOP OF mdToHtml()) -> U-HTML-BACKFILL. " +
  "Then HTML-PRIMARY-MS0 (7u). Then MEMORY-SLOT-VIEW-MS0 (2u).";

test("extractResume pulls the ## RESUME body", () => {
  const md = "---\nslot: bravo\n---\n\n## RESUME\nDo the thing X.\n\n## CONTEXT\nblah";
  assert.equal(extractResume(md), "Do the thing X.");
});

test("extractResume REGRESSION: body at end-of-file (no trailing heading) — the \\Z bug", () => {
  // JS regex has no \Z. The first cut used /(?=^##|\Z)/m which matched a
  // literal 'Z' and stopped at the first line end. This must return the
  // FULL multi-line body when RESUME is the last section.
  const md = "## RESUME\nLine one of resume.\nLine two still resume.\nLine three EOF.";
  assert.equal(extractResume(md), "Line one of resume.\nLine two still resume.\nLine three EOF.");
});

test("extractResume stops at the next ## heading (does not bleed into CONTEXT)", () => {
  const md = "## RESUME\nReal resume here.\n## NEXT ACTION\n/checkin\n## CONTEXT\nx";
  assert.equal(extractResume(md), "Real resume here.");
});

test("extractResume supports the **Resume directive:** precompact shape", () => {
  const md = "blah\n\n**Resume directive:**\n\nContinue U-FOO01 in src/.\n\n**Chat Isolation:** x";
  assert.equal(extractResume(md), "Continue U-FOO01 in src/.");
});

test("extractResume returns null for missing / too-short / non-string", () => {
  assert.equal(extractResume("## CONTEXT\nno resume here"), null);
  assert.equal(extractResume("## RESUME\nshort"), null); // < 8 chars
  assert.equal(extractResume(""), null);
  assert.equal(extractResume(null), null);
  assert.equal(extractResume(42), null);
});

test("extractResume caps an oversize body", () => {
  const huge = "## RESUME\n" + "x".repeat(9000);
  const r = extractResume(huge);
  assert.ok(r.length <= 4000 + 20, "must be capped near MAX_RESUME_CHARS");
  assert.ok(r.endsWith("…[truncated]"), "must mark truncation");
});

test("isPlaceholderResume rejects the known placeholder set", () => {
  for (const p of ["Pre-compact snapshot (RESUME generated)", "(no output)", "continue working", "compacting — read handoff", "n/a", "TBD"]) {
    assert.equal(isPlaceholderResume(p), true, `placeholder: ${p}`);
  }
  assert.equal(isPlaceholderResume("Continue U-OBF01: build the consolidator in scripts/"), false);
});

test("slotOfHandoffFilename parses NATO slot, golf, and rejects CONSOLIDATED/non-handoff", () => {
  assert.equal(slotOfHandoffFilename("HANDOFF-claude-339c8ff7-bravo-html-stack.md"), "bravo");
  assert.equal(slotOfHandoffFilename("HANDOFF-golf-cleanup.md"), "golf");
  assert.equal(slotOfHandoffFilename("HANDOFF-bravo-CONSOLIDATED.md"), null, "must not re-ingest own output");
  assert.equal(slotOfHandoffFilename("HANDOFF-claude-abc-no-slot-topic.md"), null);
  assert.equal(slotOfHandoffFilename("README.md"), null);
});

test("normalizeForDedup collapses whitespace + lowercases", () => {
  assert.equal(normalizeForDedup("  Foo   BAR\n\tbaz "), "foo bar baz");
  assert.equal(normalizeForDedup(null), "");
});

test("unitIdsInResume extracts U-ids and MS tokens, [] when none", () => {
  const ids = unitIdsInResume(HTML_RESUME);
  assert.ok(ids.includes("U-HTML-COMPANION-GENERATOR"), "U-id");
  assert.ok(ids.includes("HTML-COMPANION-MS0"), "MS token");
  assert.deepEqual(unitIdsInResume("just prose, nothing structured"), []);
});

test("decideShipped is POSITIVE-only — fail-PRESERVE on every uncertainty", () => {
  // positive: a named id appears in a commit subject → shipped
  assert.deepEqual(
    decideShipped({ unitIds: ["U-OBF01"], gitSubjects: ["[MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF01: x"] }),
    { shipped: true, matchedBy: "U-OBF01" }
  );
  // no ids → keep
  assert.equal(decideShipped({ unitIds: [], gitSubjects: ["anything"] }).shipped, false);
  // no git subjects (git unavailable) → keep
  assert.equal(decideShipped({ unitIds: ["U-X"], gitSubjects: [] }).shipped, false);
  // ids present, subjects present, NO match → keep
  assert.equal(decideShipped({ unitIds: ["U-X"], gitSubjects: ["unrelated commit"] }).shipped, false);
});

test("consolidate: HTML-queue orphan is PRESERVED when not git-shipped (the core bug)", () => {
  const handoffs = [
    { file: "HANDOFF-claude-339c8ff7-bravo-html-stack.md", slot: "bravo", mtimeMs: 1000, content: `## RESUME\n${HTML_RESUME}` },
    { file: "HANDOFF-claude-339c8ff7-bravo-slot-drift.md", slot: "bravo", mtimeMs: 5000, content: "## RESUME\nSDF work done, see commit." },
  ];
  // git shows ONLY the slot-drift work shipped, NOT the HTML queue
  const gitSubjects = ["[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF20: doc reflection"];
  const { slots } = consolidate({ handoffs, gitSubjects, now: 9000 });
  assert.ok(slots.bravo, "bravo slot present");
  const resumes = slots.bravo.map((e) => e.resume);
  assert.ok(resumes.some((r) => r.includes("HTML-COMPANION-MS0")), "orphaned HTML queue MUST survive consolidation");
});

test("consolidate: POSITIVELY-shipped RESUME is dropped", () => {
  const handoffs = [
    { file: "HANDOFF-x-bravo-a.md", slot: "bravo", mtimeMs: 1, content: "## RESUME\nShip U-DONE99 in scripts/." },
  ];
  const { slots } = consolidate({ handoffs, gitSubjects: ["[MAIN] [X]/U-DONE99: shipped"], now: 2 });
  assert.equal((slots.bravo || []).length, 0, "git-confirmed-shipped thread must be dropped");
});

test("consolidate: dedups identical RESUME keeping the newest, skips placeholders", () => {
  const handoffs = [
    { file: "old.md", slot: "bravo", mtimeMs: 100, content: "## RESUME\nSame exact open thread text here." },
    { file: "new.md", slot: "bravo", mtimeMs: 900, content: "## RESUME\nSame exact open thread text here." },
    { file: "ph.md", slot: "bravo", mtimeMs: 950, content: "## RESUME\n(no output)" },
  ];
  const { slots } = consolidate({ handoffs, gitSubjects: [], now: 1000 });
  assert.equal(slots.bravo.length, 1, "dedup to one");
  assert.equal(slots.bravo[0].file, "new.md", "newest wins");
});

test("readHandoffDir + writeConsolidated round-trip on a real temp dir", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-handoff-consol-"));
  const f = join(dir, "HANDOFF-claude-zzz-bravo-html.md");
  writeFileSync(f, `## RESUME\n${HTML_RESUME}\n`, "utf-8");
  const old = Date.now() / 1000 - 3600;
  utimesSync(f, old, old);
  const handoffs = readHandoffDir(dir);
  assert.equal(handoffs.length, 1);
  assert.equal(handoffs[0].slot, "bravo");
  const { slots, generatedAt } = consolidate({ handoffs, gitSubjects: [], now: Date.now() });
  const r = writeConsolidated("bravo", slots.bravo, { dir, generatedAt });
  assert.equal(r.ok, true);
  assert.ok(existsSync(r.file), "consolidated file written");
  const txt = readFileSync(r.file, "utf-8");
  assert.ok(txt.includes("HTML-COMPANION-MS0"), "consolidated carries the orphaned queue");
  assert.ok(txt.includes("slot: bravo"), "frontmatter slot");
  // The consolidated file itself must NOT be re-ingested on a second pass.
  assert.equal(readHandoffDir(dir).length, 1, "CONSOLIDATED excluded from re-scan");
});

test("writeConsolidated empty entries → valid file stating no open threads", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-handoff-empty-"));
  const r = writeConsolidated("delta", [], { dir });
  assert.equal(r.ok, true);
  assert.ok(readFileSync(r.file, "utf-8").includes("No open cross-topic threads"));
});

// ── Reviewer-fix regression guards (per-file gate FAIL → fix → re-verify) ──

test("REGRESSION P0: decideShipped does NOT drop on prefix collision (U-OBF01 vs U-OBF010)", () => {
  // The bare substring bug: a still-open U-OBF01 thread was killed by any
  // commit naming U-OBF010 / U-OBF01-FIXUP. fail-PRESERVE must hold.
  assert.equal(decideShipped({ unitIds: ["U-OBF01"], gitSubjects: ["[X]/U-OBF010: other"] }).shipped, false, "U-OBF010 must NOT ship U-OBF01");
  assert.equal(decideShipped({ unitIds: ["U-OBF01"], gitSubjects: ["[X]/U-OBF01-FIXUP: other"] }).shipped, false, "U-OBF01-FIXUP must NOT ship U-OBF01");
  assert.equal(decideShipped({ unitIds: ["U-SDF13"], gitSubjects: ["U-SDF130: x"] }).shipped, false);
  // genuine boundary match still works
  assert.equal(decideShipped({ unitIds: ["U-OBF01"], gitSubjects: ["[MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF01: ship"] }).shipped, true);
  assert.equal(decideShipped({ unitIds: ["U-OBF01"], gitSubjects: ["fixed U-OBF01."] }).shipped, true, "trailing punctuation is a boundary");
});

test("REGRESSION P1: extractResume matches `## RESUME_LOOP` (stop-force-loop-continue shape)", () => {
  const md = "---\nslot: bravo\n---\n## RESUME_LOOP\nContinue the loop on U-X.\n## CONTEXT\nx";
  assert.equal(extractResume(md), "Continue the loop on U-X.");
});

test("REGRESSION P1: slotOfHandoffFilename uses canonical position, not first-NATO-token", () => {
  // topic legitimately contains a NATO word — slot must be the segment after
  // the chat id, NOT the first NATO-looking token in the topic.
  assert.equal(slotOfHandoffFilename("HANDOFF-claude-abc12-bravo-alpha-release.md"), "bravo", "slot=bravo, not alpha-from-topic");
  assert.equal(slotOfHandoffFilename("HANDOFF-claude-abc12-delta-golf-thing.md"), "delta", "slot=delta, not golf-from-topic");
  assert.equal(slotOfHandoffFilename("HANDOFF-golf-cleanup-ms0.md"), "golf", "golf slot-keyed shape");
  assert.equal(slotOfHandoffFilename("HANDOFF-Claude-claude-abc12-echo-x.md"), "echo", "double Claude- prefix tolerated");
  assert.equal(slotOfHandoffFilename("HANDOFF-claude-339c8ff7-cad-fusion-live-ms0.md"), null, "no slot segment → null (skip, fail-SAFE)");
  assert.equal(slotOfHandoffFilename("HANDOFF-bravo-CONSOLIDATED.md"), null);
});

test("REGRESSION P2: precompact HTML-comment pad does NOT bleed into Resume-directive body", () => {
  const md =
    "header\n\n**Resume directive:**\n\nContinue U-PAD01 in scripts/foo.mjs.\n" +
    "<!-- pad-block-start\n" + "Z".repeat(5000) + "\npad-block-end -->\n";
  const r = extractResume(md);
  assert.equal(r, "Continue U-PAD01 in scripts/foo.mjs.", "must stop at \\n<!-- pad, not absorb 5000 chars");
});

test("REGRESSION P2: per-slot open-thread cap elides oldest with explicit count", () => {
  const handoffs = [];
  for (let i = 0; i < 45; i++) {
    handoffs.push({
      file: `HANDOFF-claude-c${i}-bravo-t${i}.md`, slot: "bravo",
      mtimeMs: i, content: `## RESUME\nDistinct open thread number ${i} with enough body length.`,
    });
  }
  const { slots, elided } = consolidate({ handoffs, gitSubjects: [], now: 99999 });
  assert.equal(slots.bravo.length, 40, "capped at MAX_OPEN_THREADS_PER_SLOT");
  assert.equal(elided.bravo, 5, "5 elided, count surfaced (never silently lost)");
  // newest (highest mtime) survive
  assert.ok(slots.bravo[0].resume.includes("number 44"), "newest kept");
});

test("REGRESSION P1: consolidated file is OUTSIDE the HANDOFF-* namespace", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-handoff-ns-"));
  const r = writeConsolidated("bravo", [{ resume: "x".repeat(20), file: "f", ageMs: 0, unitIds: [], keptBecause: "t" }], { dir });
  assert.equal(r.ok, true);
  // filename must NOT start with HANDOFF- (else per-agent-handoff fallbacks select it)
  const base = r.file.replace(/\\/g, "/").split("/").pop();
  assert.ok(!base.startsWith("HANDOFF-"), `consolidated filename '${base}' must not be HANDOFF-* selectable`);
  assert.equal(base, "bravo.md");
});

test("REGRESSION P1: readHandoffDir(dir, onlySlot) filters by filename before file I/O", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-handoff-slotfilter-"));
  writeFileSync(join(dir, "HANDOFF-claude-a1-bravo-x.md"), "## RESUME\nbravo work here ok.", "utf-8");
  writeFileSync(join(dir, "HANDOFF-claude-a2-delta-y.md"), "## RESUME\ndelta work here ok.", "utf-8");
  writeFileSync(join(dir, "HANDOFF-claude-a3-bravo-z.md"), "## RESUME\nmore bravo work ok.", "utf-8");
  // unscoped: all 3 (backward-compat — onlySlot defaults null)
  assert.equal(readHandoffDir(dir).length, 3, "default null = scan all (backward-compat)");
  // scoped: only bravo's 2
  const onlyBravo = readHandoffDir(dir, "bravo");
  assert.equal(onlyBravo.length, 2, "onlySlot filters to that slot");
  assert.ok(onlyBravo.every((h) => h.slot === "bravo"), "no other slot leaks through");
  assert.equal(readHandoffDir(dir, "echo").length, 0, "slot with no handoffs → empty (git-log skipped in main)");
});

test("REGRESSION P2: dedup keeps threads that differ only after char 400 (no fail-DROP)", () => {
  const prefix = "shared prefix ".repeat(30); // > 400 chars identical
  const a = `## RESUME\n${prefix} ENDING-ALPHA distinct tail`;
  const b = `## RESUME\n${prefix} ENDING-BRAVO distinct tail`;
  const handoffs = [
    { file: "HANDOFF-claude-x-bravo-a.md", slot: "bravo", mtimeMs: 1, content: a },
    { file: "HANDOFF-claude-x-bravo-b.md", slot: "bravo", mtimeMs: 2, content: b },
  ];
  const { slots } = consolidate({ handoffs, gitSubjects: [], now: 9 });
  assert.equal(slots.bravo.length, 2, "both distinct threads preserved (full-text dedup key)");
});
