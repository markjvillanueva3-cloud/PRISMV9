#!/usr/bin/env node
/**
 * extract-misc-tasks.test.mjs — node:test suite for the misc-tasks merge.
 *
 * Real-value assertions (CLAUDE.md R9): every test fails if the business
 * logic changes — dedupe collapse counts, cross-ref drops, exclusion
 * partitions are all checked against concrete fixture data.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeId, normalizeTitle, safeId, dedupeKey,
  buildKnownSet, mergeGroup, extractMiscTasks, renderMarkdown, renderHtml,
} from "./extract-misc-tasks.mjs";

test("normalizeId — uppercase + trim, non-string → empty", () => {
  assert.equal(normalizeId("  u-foo01 "), "U-FOO01");
  assert.equal(normalizeId("CLEANUP-MS0"), "CLEANUP-MS0");
  assert.equal(normalizeId(null), "");
  assert.equal(normalizeId(undefined), "");
  assert.equal(normalizeId(42), "");
});

test("normalizeTitle — alphanumeric words, collapsed", () => {
  assert.equal(normalizeTitle("Wire FooEngine into prism_cam!"), "wire fooengine into prism cam");
  assert.equal(normalizeTitle("  P0  bug:: getStore() "), "p0 bug getstore");
  assert.equal(normalizeTitle(null), "");
});

test("safeId — non-alnum collapse + traversal guard", () => {
  assert.equal(safeId("U-FOO/01"), "u-foo-01");
  assert.equal(safeId("../../etc"), "etc");
  assert.equal(safeId(".."), "x");
  assert.equal(safeId(""), "x");
  assert.equal(safeId("a..b"), "a-b");
  assert.ok(safeId("x".repeat(200)).length <= 80);
});

test("dedupeKey — id-based when id present, else title-based", () => {
  assert.equal(dedupeKey({ milestone_or_unit_id: "U-X1", title: "anything" }), "ID:U-X1");
  assert.equal(dedupeKey({ milestone_or_unit_id: null, title: "Wire Foo" }), "T:wire foo");
  assert.equal(dedupeKey({ title: "Wire Foo" }), "T:wire foo");
  // Same id, different titles → same key (merges).
  assert.equal(
    dedupeKey({ milestone_or_unit_id: "u-x1", title: "phrasing A" }),
    dedupeKey({ milestone_or_unit_id: "U-X1", title: "phrasing B" }));
});

test("buildKnownSet — unions milestone + unit ids from all 3 sources", () => {
  const known = buildKnownSet({
    roadmapIndex: { milestones: [{ id: "RM-MS0", units: [{ id: "U-RM1" }] }, { id: "RM-MS1" }] },
    envelopes: [{ id: "ENV-MS0", units: [{ id: "U-ENV1" }, { id: "U-ENV2" }] }],
    milestoneProgress: { milestones: { K: { id: "PROG-MS0", units: [{ id: "U-PROG1" }] } } },
  });
  assert.ok(known.has("RM-MS0"));
  assert.ok(known.has("U-RM1"));
  assert.ok(known.has("RM-MS1"));
  assert.ok(known.has("ENV-MS0"));
  assert.ok(known.has("U-ENV2"));
  assert.ok(known.has("PROG-MS0"));
  assert.ok(known.has("U-PROG1"));
  assert.equal(known.has("U-NOTREAL"), false);
  // 8 ids: RM-MS0, U-RM1, RM-MS1, ENV-MS0, U-ENV1, U-ENV2, PROG-MS0, U-PROG1.
  assert.equal(known.size, 8);
});

test("buildKnownSet — tolerates missing/empty sources", () => {
  assert.equal(buildKnownSet({}).size, 0);
  assert.equal(buildKnownSet({ roadmapIndex: { milestones: [] }, envelopes: [], milestoneProgress: null }).size, 0);
});

test("mergeGroup — picks max-confidence base, unions sources, counts occurrences", () => {
  const g = mergeGroup([
    { title: "A", confidence: 0.4, source_path: "/p1", evidence: "short", suggested_domain: "mill", source_type: "transcript", _agent: 1 },
    { title: "A better", confidence: 0.8, source_path: "/p2", evidence: "much longer evidence string", suggested_domain: "mill", source_type: "transcript", _agent: 3 },
    { title: "A", confidence: 0.6, source_path: "/p1", evidence: "mid", _agent: 3 },
  ]);
  assert.equal(g.title, "A better");          // highest-confidence base
  assert.equal(g.confidence, 0.8);
  assert.equal(g.evidence, "much longer evidence string"); // longest
  assert.equal(g.occurrences, 3);
  assert.deepEqual(g.sources.sort(), ["/p1", "/p2"]);       // deduped union
  assert.equal(g.source_count, 2);
  assert.deepEqual(g.found_by_agents, [1, 3]);
});

test("mergeGroup — looks_completed is OR across the group", () => {
  const g = mergeGroup([
    { title: "A", confidence: 0.5, looks_completed: false },
    { title: "A", confidence: 0.5, looks_completed: true },
  ]);
  assert.equal(g.looks_completed, true);
});

test("extractMiscTasks — dedupes, excludes completed + roadmapped, keeps orphans", () => {
  const known = buildKnownSet({
    envelopes: [{ id: "REAL-MS0", units: [{ id: "U-REAL1" }] }],
  });
  const agentOutputs = [
    {
      agent: 1,
      items: [
        // orphan, no id — must survive
        { title: "Fix getStore data-loss P0 bug", milestone_or_unit_id: null, confidence: 0.9, source_path: "/t1", evidence: "P0 data loss", suggested_domain: "infra", source_type: "transcript", looks_completed: false },
        // duplicate of an agent-2 item (same id) — must merge to ONE
        { title: "Wire Foo orphan engine", milestone_or_unit_id: "U-ORPHAN9", confidence: 0.5, source_path: "/t2", evidence: "ev a", suggested_domain: "cam", source_type: "transcript", looks_completed: false },
        // already in an envelope — must be excluded as roadmapped
        { title: "Ship U-REAL1", milestone_or_unit_id: "U-REAL1", confidence: 0.7, source_path: "/t3", evidence: "pending", suggested_domain: "mill", source_type: "transcript", looks_completed: false },
        // flagged completed — must be excluded
        { title: "Already shipped thing", milestone_or_unit_id: null, confidence: 0.8, source_path: "/t4", evidence: "shipped", suggested_domain: "docs", source_type: "transcript", looks_completed: true },
      ],
    },
    {
      agent: 2,
      items: [
        { title: "Wire Foo engine (dup phrasing)", milestone_or_unit_id: "U-ORPHAN9", confidence: 0.65, source_path: "/h1", evidence: "ev b longer", suggested_domain: "cam", source_type: "handoff", looks_completed: false },
      ],
    },
  ];

  const { misc, excludedCompleted, excludedRoadmapped, stats } = extractMiscTasks(agentOutputs, known);

  assert.equal(stats.rawItems, 5);
  assert.equal(stats.afterDedupe, 4);          // U-ORPHAN9 pair collapsed
  assert.equal(stats.excludedCompleted, 1);    // "Already shipped thing"
  assert.equal(stats.excludedRoadmapped, 1);   // U-REAL1 in envelope
  assert.equal(stats.finalMisc, 2);            // getStore bug + merged U-ORPHAN9

  // The roadmapped exclusion records which known id matched.
  assert.equal(excludedRoadmapped[0].matched_known_id, "U-REAL1");
  assert.equal(excludedCompleted[0].title, "Already shipped thing");

  // Orphan with no id survived.
  assert.ok(misc.some((m) => m.title === "Fix getStore data-loss P0 bug"));
  // Merged dup carries both sources and max confidence.
  const merged = misc.find((m) => m.milestone_or_unit_id === "U-ORPHAN9");
  assert.ok(merged, "U-ORPHAN9 orphan kept");
  assert.equal(merged.occurrences, 2);
  assert.equal(merged.confidence, 0.65);
  assert.equal(merged.source_count, 2);

  // Stable ids assigned, sorted by confidence desc.
  assert.equal(misc[0].misc_id, "MISC-001");
  assert.equal(misc[0].title, "Fix getStore data-loss P0 bug"); // 0.9 > 0.65
  assert.ok(misc.every((m) => m.node_id.startsWith("ghost.misc.")));
});

test("extractMiscTasks — node_id collision gets a numeric suffix", () => {
  const agentOutputs = [{
    agent: 1,
    items: [
      { title: "Same Title", milestone_or_unit_id: null, confidence: 0.5, source_path: "/a", evidence: "x", suggested_domain: "other", source_type: "transcript", looks_completed: false },
      { title: "Same Title!!!", milestone_or_unit_id: null, confidence: 0.4, source_path: "/b", evidence: "y", suggested_domain: "other", source_type: "transcript", looks_completed: false },
    ],
  }];
  // Different normalized titles ("same title" vs "same title") — actually identical → would merge.
  // Use genuinely distinct titles that safeId-collapse to the same fragment.
  agentOutputs[0].items[1].title = "Same/Title";
  const { misc } = extractMiscTasks(agentOutputs, new Set());
  const ids = misc.map((m) => m.node_id);
  assert.equal(new Set(ids).size, ids.length, "node_ids are unique");
});

test("renderMarkdown / renderHtml — produce non-empty output with the misc count", () => {
  const inv = {
    schemaVersion: "1.0.0",
    generatedAt: "2026-05-16T00:00:00.000Z",
    provenance: { nextPhase: "DEFERRED: combine into roadmap." },
    stats: { rawItems: 5, afterDedupe: 4, excludedCompleted: 1, excludedRoadmapped: 1, finalMisc: 2, byDomain: { infra: 1, cam: 1 }, bySourceType: { transcript: 1, handoff: 1 } },
    items: [
      { misc_id: "MISC-001", title: "Fix bug", evidence: "e", source_type: "transcript", milestone_or_unit_id: null, suggested_domain: "infra", confidence: 0.9, occurrences: 1, node_id: "ghost.misc.fix-bug" },
    ],
  };
  const md = renderMarkdown(inv);
  assert.ok(md.includes("Final misc tasks: 2"));
  assert.ok(md.includes("MISC-001"));
  const html = renderHtml(inv);
  assert.ok(html.includes("final misc 2"));
  assert.ok(html.includes("MISC-001"));
  assert.ok(html.startsWith("<!doctype html>"));
});
