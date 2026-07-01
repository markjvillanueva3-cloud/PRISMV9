/**
 * scripts/golf-consolidate-claude-md.test.mjs
 *
 * Hermetic tests for the pure-core exports of the CLAUDE-MD-PER-SLOT-MS0
 * MVP consolidator. No real filesystem — every test passes raw strings
 * through the pure functions.
 *
 * Run: node --test scripts/golf-consolidate-claude-md.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseInboxFile,
  extractRecentRegressionsEntries,
  regressionLineHash,
  locateRecentRegressionsSection,
  planConsolidation,
} from "./golf-consolidate-claude-md.mjs";

// ─── parseInboxFile ───────────────────────────────────────────────────────

test("parseInboxFile: valid frontmatter + body", () => {
  const r = parseInboxFile("---\nslot: alpha\nstatus: pending\n---\nBody here\n");
  assert.equal(r.error, undefined);
  assert.equal(r.frontmatter.slot, "alpha");
  assert.equal(r.frontmatter.status, "pending");
  assert.equal(r.body, "Body here\n");
});

test("parseInboxFile: missing opening delimiter", () => {
  const r = parseInboxFile("not frontmatter here");
  assert.match(r.error || "", /missing frontmatter delimiter/);
});

test("parseInboxFile: unterminated frontmatter", () => {
  const r = parseInboxFile("---\nslot: alpha\nstatus: pending\nbody no close");
  assert.match(r.error || "", /unterminated frontmatter/);
});

test("parseInboxFile: empty body OK", () => {
  const r = parseInboxFile("---\nslot: bravo\n---\n");
  assert.equal(r.error, undefined);
  assert.equal(r.frontmatter.slot, "bravo");
  assert.equal(r.body, "");
});

test("parseInboxFile: non-string input", () => {
  const r = parseInboxFile(null);
  assert.match(r.error || "", /not string/);
});

// ─── extractRecentRegressionsEntries ──────────────────────────────────────

test("extractRecentRegressionsEntries: fenced block with bullets", () => {
  const body = `Some prose here.

## Proposed §Recent regressions entry

\`\`\`
- 2026-05-19 | first regression entry
- 2026-05-19 | second regression entry
\`\`\`

## Notes for golf
extra content`;
  const r = extractRecentRegressionsEntries(body);
  assert.equal(r.length, 2);
  assert.match(r[0], /first regression/);
  assert.match(r[1], /second regression/);
});

test("extractRecentRegressionsEntries: unfenced bullets after heading", () => {
  const body = `## Proposed §Recent regressions entry
- 2026-05-19 | bare entry one
- 2026-05-19 | bare entry two

## Next section`;
  const r = extractRecentRegressionsEntries(body);
  assert.equal(r.length, 2);
});

test("extractRecentRegressionsEntries: no §Recent regressions section", () => {
  const body = "## Some other section\n- not a regression";
  assert.deepEqual(extractRecentRegressionsEntries(body), []);
});

test("extractRecentRegressionsEntries: empty body", () => {
  assert.deepEqual(extractRecentRegressionsEntries(""), []);
  assert.deepEqual(extractRecentRegressionsEntries(null), []);
});

test("extractRecentRegressionsEntries: heading present but no bullets", () => {
  const body = "## Proposed §Recent regressions entry\n\nNo bullets here\n\n## Next";
  assert.deepEqual(extractRecentRegressionsEntries(body), []);
});

test("extractRecentRegressionsEntries: case-insensitive heading match", () => {
  const body = `## proposed §recent regressions ENTRY

- 2026-05-19 | case-insensitive match
`;
  const r = extractRecentRegressionsEntries(body);
  assert.equal(r.length, 1);
});

// ─── regressionLineHash ───────────────────────────────────────────────────

test("regressionLineHash: identical content → identical hash", () => {
  assert.equal(
    regressionLineHash("- 2026-05-19 | bug X | fix: see commit"),
    regressionLineHash("- 2026-05-19 | bug X | fix: see commit")
  );
});

test("regressionLineHash: whitespace variations → same hash", () => {
  const a = "- 2026-05-19 | bug X | fix:  see  commit";
  const b = "- 2026-05-19 | bug X | fix: see commit";
  assert.equal(regressionLineHash(a), regressionLineHash(b));
});

test("regressionLineHash: case variation → same hash", () => {
  const a = "- 2026-05-19 | Bug X | fix: see commit";
  const b = "- 2026-05-19 | bug x | fix: see commit";
  assert.equal(regressionLineHash(a), regressionLineHash(b));
});

test("regressionLineHash: bold markers don't affect hash", () => {
  const a = "- 2026-05-19 | **bug X** | fix";
  const b = "- 2026-05-19 | bug X | fix";
  assert.equal(regressionLineHash(a), regressionLineHash(b));
});

test("regressionLineHash: different content → different hash", () => {
  assert.notEqual(
    regressionLineHash("- 2026-05-19 | bug X"),
    regressionLineHash("- 2026-05-19 | bug Y")
  );
});

test("regressionLineHash: empty / non-string input", () => {
  assert.equal(regressionLineHash(""), regressionLineHash(""));
  assert.equal(regressionLineHash(null), "");
});

// ─── locateRecentRegressionsSection ───────────────────────────────────────

test("locateRecentRegressionsSection: section present with following section", () => {
  const md = `# Title

## Foo
content

## Recent regressions
- 2026-05-19 | entry one
- 2026-05-19 | entry two

## Next section
more content`;
  const r = locateRecentRegressionsSection(md);
  assert.ok(r.startIdx > 0);
  assert.ok(r.endIdx > r.startIdx);
  assert.equal(r.entries.length, 2);
});

test("locateRecentRegressionsSection: section at EOF", () => {
  const md = "## Recent regressions\n- 2026-05-19 | only entry\n";
  const r = locateRecentRegressionsSection(md);
  assert.equal(r.entries.length, 1);
  assert.equal(r.endIdx, md.length);
});

test("locateRecentRegressionsSection: missing section", () => {
  const md = "## Other\ncontent";
  const r = locateRecentRegressionsSection(md);
  assert.equal(r.startIdx, -1);
  assert.equal(r.endIdx, -1);
  assert.deepEqual(r.entries, []);
});

test("locateRecentRegressionsSection: empty section body", () => {
  const md = "## Recent regressions\n\n## Next";
  const r = locateRecentRegressionsSection(md);
  assert.ok(r.startIdx >= 0);
  assert.deepEqual(r.entries, []);
});

test("locateRecentRegressionsSection: handles null", () => {
  const r = locateRecentRegressionsSection(null);
  assert.equal(r.startIdx, -1);
});

// ─── planConsolidation ────────────────────────────────────────────────────

test("planConsolidation: all new entries", () => {
  const r = planConsolidation([], [
    { slot: "alpha", entries: ["- 2026-05-19 | a", "- 2026-05-19 | b"] },
  ]);
  assert.equal(r.new_entries.length, 2);
  assert.equal(r.duplicates.length, 0);
});

test("planConsolidation: all duplicates", () => {
  const r = planConsolidation(
    ["- 2026-05-19 | a", "- 2026-05-19 | b"],
    [{ slot: "alpha", entries: ["- 2026-05-19 | a", "- 2026-05-19 | b"] }]
  );
  assert.equal(r.new_entries.length, 0);
  assert.equal(r.duplicates.length, 2);
});

test("planConsolidation: mixed new + dup", () => {
  const r = planConsolidation(
    ["- 2026-05-19 | a"],
    [{ slot: "alpha", entries: ["- 2026-05-19 | a", "- 2026-05-19 | b"] }]
  );
  assert.equal(r.new_entries.length, 1);
  assert.equal(r.duplicates.length, 1);
  assert.match(r.new_entries[0].line, /\| b/);
});

test("planConsolidation: cross-slot dedupe within same run", () => {
  const r = planConsolidation(
    [],
    [
      { slot: "alpha", entries: ["- 2026-05-19 | shared"] },
      { slot: "bravo", entries: ["- 2026-05-19 | shared"] },
    ]
  );
  assert.equal(r.new_entries.length, 1);
  assert.equal(r.duplicates.length, 1);
  assert.equal(r.duplicates[0].slot, "bravo"); // second occurrence dedup'd
});

test("planConsolidation: every entry attributed to its slot", () => {
  const r = planConsolidation([], [
    { slot: "alpha", entries: ["- 2026-05-19 | a1"] },
    { slot: "bravo", entries: ["- 2026-05-19 | b1"] },
    { slot: "charlie", entries: ["- 2026-05-19 | c1"] },
  ]);
  const slots = r.new_entries.map((e) => e.slot).sort();
  assert.deepEqual(slots, ["alpha", "bravo", "charlie"]);
});

test("planConsolidation: empty proposed → no changes", () => {
  const r = planConsolidation(["- existing"], []);
  assert.equal(r.new_entries.length, 0);
  assert.equal(r.duplicates.length, 0);
});

test("planConsolidation: REGRESSION GUARD — whitespace-different dup detected", () => {
  // Reviewer-style test: an inbox entry with extra whitespace must be
  // detected as a dup of an existing canonical entry that's textually
  // similar but whitespace-normalized.
  const r = planConsolidation(
    ["- 2026-05-19 | bug X | fix:  see commit"],
    [{ slot: "alpha", entries: ["- 2026-05-19 | bug X | fix: see commit"] }]
  );
  assert.equal(r.new_entries.length, 0);
  assert.equal(r.duplicates.length, 1);
});
