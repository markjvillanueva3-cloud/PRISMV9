/**
 * Tests for unlinked-mentions-scan.mjs (pure library).
 *
 * Run: node --test scripts/lib/unlinked-mentions-scan.test.mjs
 *
 * @milestone PSN-ENHANCE-MS0/U-PSN-UNLINKED-MENTIONS
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildKnownNameRegex,
  stripLinkedAndCodeSpans,
  findMentionsInBody,
  scanForUnlinkedMentions,
} from "./unlinked-mentions-scan.mjs";

// ── buildKnownNameRegex ─────────────────────────────────────────────────────

test("buildKnownNameRegex: builds a case-insensitive alternation", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md" }],
    ["fleet-reaper", { path: "b.md" }],
  ]);
  const { re } = buildKnownNameRegex(notes);
  assert.equal(typeof re.test, "function");
  assert.ok(re.flags.includes("g"));
  assert.ok(re.flags.includes("i"));
});

test("buildKnownNameRegex: 4-char minimum cuts noisy short slugs", () => {
  const notes = new Map([
    ["psn", { path: "a.md" }], // 3 chars — filtered
    ["psnx", { path: "b.md" }], // 4 chars — kept
  ]);
  const { slugByName } = buildKnownNameRegex(notes);
  assert.equal(slugByName.has("psn"), false);
  assert.equal(slugByName.has("psnx"), true);
});

test("buildKnownNameRegex: longest-name-wins on overlap", () => {
  const notes = new Map([
    ["psn-synergize", { path: "a.md" }],
    ["psn-other", { path: "b.md" }],
  ]);
  const { re, slugByName } = buildKnownNameRegex(notes);
  const body = "see psn-synergize today";
  const m = [...body.matchAll(re)];
  assert.equal(m[0][1].toLowerCase(), "psn-synergize");
  assert.equal(slugByName.get("psn-synergize"), "psn-synergize");
});

test("buildKnownNameRegex: aliases populate slugByName", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md", aliases: ["Synergy Network", "PSN-leg-arch"] }],
  ]);
  const { slugByName } = buildKnownNameRegex(notes);
  assert.equal(slugByName.get("psn-definition"), "psn-definition");
  assert.equal(slugByName.get("synergy network"), "psn-definition");
  assert.equal(slugByName.get("psn-leg-arch"), "psn-definition");
});

test("buildKnownNameRegex: regex meta in names is escaped (no ReDoS)", () => {
  const notes = new Map([
    ["weird.name+1", { path: "a.md" }],
    ["(parens)", { path: "b.md" }],
  ]);
  const { re } = buildKnownNameRegex(notes);
  const body = "we have weird.name+1 here";
  const hits = [...body.matchAll(re)];
  assert.equal(hits.length, 1);
  assert.equal(hits[0][1], "weird.name+1");
});

test("buildKnownNameRegex: empty notes returns never-matching sentinel", () => {
  const { re } = buildKnownNameRegex(new Map());
  assert.equal(re.test("any text at all"), false);
});

// ── stripLinkedAndCodeSpans ─────────────────────────────────────────────────

test("stripLinkedAndCodeSpans: already-linked [[refs]] are blanked", () => {
  const out = stripLinkedAndCodeSpans("see [[psn-definition]] for context");
  assert.equal(out.includes("psn-definition"), false);
  assert.equal(out.length, "see [[psn-definition]] for context".length); // length-preserving
});

test("stripLinkedAndCodeSpans: fenced code blocks blanked", () => {
  const out = stripLinkedAndCodeSpans("```\nconst psn = 1;\n```\nreal psn here");
  assert.equal(out.includes("const psn"), false);
  assert.ok(out.includes("real psn here"));
});

test("stripLinkedAndCodeSpans: inline code blanked", () => {
  const out = stripLinkedAndCodeSpans("`psn` is the abbreviation; psn matters");
  // First occurrence (inside backticks) blanked; second (bare) preserved
  const firstIdx = out.indexOf("psn");
  assert.ok(firstIdx > 5, "bare 'psn' should be the surviving occurrence");
});

test("stripLinkedAndCodeSpans: markdown URLs blanked", () => {
  const out = stripLinkedAndCodeSpans("see [psn](https://example.com/psn) docs");
  assert.equal(out.includes("https"), false);
});

// ── findMentionsInBody ──────────────────────────────────────────────────────

test("findMentionsInBody: finds bare references and ignores self-references", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md" }],
    ["fleet-reaper", { path: "b.md" }],
  ]);
  const { re, slugByName } = buildKnownNameRegex(notes);
  const body = "psn-definition is core; fleet-reaper monitors orphans";
  // From the perspective of "fleet-reaper" itself — self-mentions ignored
  const hits = findMentionsInBody(body, re, slugByName, "fleet-reaper");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].slug, "psn-definition");
});

test("findMentionsInBody: word-boundary prevents PSN matching inside PSNbattle", () => {
  const notes = new Map([["psnX", { path: "a.md" }]]); // 4-char keep
  const { re, slugByName } = buildKnownNameRegex(notes);
  const hits = findMentionsInBody("the psnXbattle is real", re, slugByName, "other");
  assert.equal(hits.length, 0);
});

test("findMentionsInBody: caps matches to MAX_MATCHES_PER_BODY (200)", () => {
  const notes = new Map([["psn-name", { path: "a.md" }]]);
  const { re, slugByName } = buildKnownNameRegex(notes);
  const body = ("psn-name ").repeat(300);
  const hits = findMentionsInBody(body, re, slugByName, "host");
  assert.equal(hits.length, 200);
});

test("findMentionsInBody: empty body returns []", () => {
  const notes = new Map([["psn-name", { path: "a.md" }]]);
  const { re, slugByName } = buildKnownNameRegex(notes);
  assert.deepEqual(findMentionsInBody("", re, slugByName, "host"), []);
});

test("findMentionsInBody: non-string body returns []", () => {
  const notes = new Map([["psn-name", { path: "a.md" }]]);
  const { re, slugByName } = buildKnownNameRegex(notes);
  // @ts-expect-error — defensive null-tolerance test
  assert.deepEqual(findMentionsInBody(null, re, slugByName, "host"), []);
});

// ── scanForUnlinkedMentions ─────────────────────────────────────────────────

test("scanForUnlinkedMentions: aggregates 5 mentions of same slug as count=5", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md", body: "" }],
    [
      "host-note",
      { path: "b.md", body: "psn-definition x. psn-definition y. psn-definition z. psn-definition. psn-definition." },
    ],
  ]);
  const r = scanForUnlinkedMentions(notes);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].mentionedSlug, "psn-definition");
  assert.equal(r.candidates[0].count, 5);
  assert.equal(r.candidates[0].samples.length, 3); // capped at 3 samples
});

test("scanForUnlinkedMentions: already-linked [[psn-definition]] mentions ignored", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md", body: "" }],
    ["host-note", { path: "b.md", body: "see [[psn-definition]] for context" }],
  ]);
  const r = scanForUnlinkedMentions(notes);
  assert.equal(r.candidates.length, 0);
  assert.equal(r.stats.totalMentions, 0);
});

test("scanForUnlinkedMentions: stats roll up notesScanned + totalMentions", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md", body: "" }],
    ["fleet-reaper", { path: "b.md", body: "" }],
    ["host1", { path: "c.md", body: "psn-definition appears" }],
    ["host2", { path: "d.md", body: "psn-definition and fleet-reaper both" }],
  ]);
  const r = scanForUnlinkedMentions(notes);
  assert.equal(r.stats.notesScanned, 4);
  assert.equal(r.stats.hostsWithMentions, 2);
  assert.equal(r.stats.totalMentions, 3);
});

test("scanForUnlinkedMentions: notes with non-string body skipped silently", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md", body: "" }],
    ["host", { path: "b.md", body: undefined }],
  ]);
  const r = scanForUnlinkedMentions(notes);
  assert.equal(r.candidates.length, 0);
  assert.equal(r.stats.hostsWithMentions, 0);
});

test("scanForUnlinkedMentions: maxPerNote caps per-host candidate variety", () => {
  const notes = new Map();
  for (let i = 0; i < 50; i++) notes.set(`name-${i.toString().padStart(3, "0")}`, { path: `n${i}.md`, body: "" });
  const hostBody = Array.from({ length: 50 }, (_, i) => `name-${i.toString().padStart(3, "0")}`).join(" ");
  notes.set("host", { path: "h.md", body: hostBody });
  const r = scanForUnlinkedMentions(notes, { maxPerNote: 10 });
  const hostCandidates = r.candidates.filter((c) => c.hostSlug === "host");
  assert.equal(hostCandidates.length, 10);
});

test("scanForUnlinkedMentions: alias mention resolves to canonical slug", () => {
  const notes = new Map([
    ["psn-definition", { path: "a.md", body: "", aliases: ["Synergy Network"] }],
    ["host", { path: "b.md", body: "the Synergy Network has 11 legs" }],
  ]);
  const r = scanForUnlinkedMentions(notes);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].mentionedSlug, "psn-definition");
  assert.equal(r.candidates[0].mentionedName.toLowerCase(), "synergy network");
});
