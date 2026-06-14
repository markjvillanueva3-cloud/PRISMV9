// Tests for gap-finder.mjs.
// Run: node --test scripts/lib/gap-finder.test.mjs
// @milestone PSN-ENHANCE-MS0/U-PSN-GAP-FINDER
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractLinkedSlugs, countBacklinks, extractHeadings, findImplicitConcepts, findGaps } from "./gap-finder.mjs";

test("extractLinkedSlugs: extracts unique [[slug]] tokens", () => {
  const r = extractLinkedSlugs("see [[psn]] and [[fleet-reaper]] and [[psn]] again");
  assert.deepEqual(r, ["psn", "fleet-reaper"]);
});

test("extractLinkedSlugs: handles heading/block/alias suffixes", () => {
  const r = extractLinkedSlugs("[[psn#PSN legs]] [[fleet#^b1]] [[atcs|the ATCS doc]]");
  assert.deepEqual(r, ["psn", "fleet", "atcs"]);
});

test("extractLinkedSlugs: drops short refs (<3 chars)", () => {
  const r = extractLinkedSlugs("[[ab]] [[psn]]");
  assert.deepEqual(r, ["psn"]);
});

test("extractLinkedSlugs: non-string body returns []", () => {
  // @ts-expect-error
  assert.deepEqual(extractLinkedSlugs(null), []);
  assert.deepEqual(extractLinkedSlugs(""), []);
});

test("countBacklinks: counts notes that link IN to target", () => {
  const notes = new Map([
    ["psn", { path: "p", body: "no outgoing" }],
    ["a", { path: "a", body: "links to [[psn]]" }],
    ["b", { path: "b", body: "also links to [[psn]] twice [[psn]]" }],
    ["c", { path: "c", body: "no relevant links" }],
  ]);
  assert.equal(countBacklinks("psn", notes, "moc"), 2);
});

test("countBacklinks: excludes the MOC slug + target self-ref", () => {
  const notes = new Map([
    ["psn", { path: "p", body: "self [[psn]]" }],
    ["moc", { path: "m", body: "from MOC [[psn]]" }],
    ["a", { path: "a", body: "real backlink [[psn]]" }],
  ]);
  assert.equal(countBacklinks("psn", notes, "moc"), 1);
});

test("extractHeadings: pulls markdown headings with level + text", () => {
  const r = extractHeadings("# H1\nbody\n## H2\nmore\n### H3");
  assert.equal(r.length, 3);
  assert.equal(r[0].level, 1);
  assert.equal(r[0].text, "H1");
  assert.equal(r[2].level, 3);
});

test("findImplicitConcepts: heading with no [[link]] under it + no matching note", () => {
  const body = "## Implicit Topic\nsome prose with no link\n## Linked Topic\nsee [[existing-slug]]";
  const notes = new Map([["existing-slug", { path: "x", body: "" }]]);
  const r = findImplicitConcepts(body, notes);
  assert.ok(r.includes("Implicit Topic"));
  assert.equal(r.includes("Linked Topic"), false);
});

test("findImplicitConcepts: heading text that IS a note slug is not implicit", () => {
  const body = "## existing-slug\nbody";
  const notes = new Map([["existing-slug", { path: "x", body: "" }]]);
  const r = findImplicitConcepts(body, notes);
  assert.equal(r.length, 0);
});

test("findGaps: classifies refs into well_covered / fragile / missing_leaf", () => {
  const notes = new Map([
    ["covered-1", { path: "c1", body: "" }],
    ["covered-2", { path: "c2", body: "links [[covered-1]]" }],
    ["covered-3", { path: "c3", body: "also links [[covered-1]]" }],
    ["fragile-1", { path: "f1", body: "" }],
    ["x", { path: "x", body: "" }],
    ["moc", { path: "m", body: "see [[covered-1]] and [[fragile-1]] and [[missing-leaf]]" }],
  ]);
  const r = findGaps("moc", "see [[covered-1]] and [[fragile-1]] and [[missing-leaf]]", notes);
  assert.equal(r.stats.well_covered_count, 1);   // covered-1 has 2 backlinks (covered-2, covered-3)
  assert.equal(r.stats.fragile_count, 1);        // fragile-1 has 0 backlinks
  assert.equal(r.stats.missing_count, 1);        // missing-leaf does not exist
  assert.equal(r.well_covered[0].slug, "covered-1");
  assert.equal(r.fragile[0].slug, "fragile-1");
  assert.equal(r.missing_leaf[0], "missing-leaf");
});

test("findGaps: minForDedicated threshold tunable", () => {
  const notes = new Map([
    ["leaf", { path: "l", body: "" }],
    ["a", { path: "a", body: "[[leaf]]" }],
    ["b", { path: "b", body: "[[leaf]]" }],
    ["c", { path: "c", body: "[[leaf]]" }],
    ["moc", { path: "m", body: "[[leaf]]" }],
  ]);
  const r3 = findGaps("moc", "[[leaf]]", notes, { minForDedicated: 3 });
  assert.equal(r3.stats.well_covered_count, 1);  // 3 backlinks (a,b,c) >= 3

  const r4 = findGaps("moc", "[[leaf]]", notes, { minForDedicated: 4 });
  assert.equal(r4.stats.fragile_count, 1);  // 3 < 4
});

test("findGaps: case-insensitive slug match for existence check", () => {
  const notes = new Map([
    ["PSN-Definition", { path: "p", body: "" }],
    ["moc", { path: "m", body: "see [[psn-definition]]" }],
  ]);
  const r = findGaps("moc", "see [[psn-definition]]", notes);
  assert.equal(r.stats.missing_count, 0);
  assert.equal(r.stats.well_covered_count + r.stats.fragile_count, 1);
});
