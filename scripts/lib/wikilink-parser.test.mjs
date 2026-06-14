// Tests for wikilink-parser.mjs.
// Run: node --test scripts/lib/wikilink-parser.test.mjs
// @milestone PSN-ENHANCE-MS0/U-PSN-BLOCK-HEADING-LINKS
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOne, parseAll, resolve, auditBody } from "./wikilink-parser.mjs";

// ── parseOne ────────────────────────────────────────────────────────────────

test("parseOne: bare slug", () => {
  const r = parseOne("psn-definition");
  assert.deepEqual(r, { slug: "psn-definition", heading: null, blockId: null, display: null, raw: "psn-definition" });
});

test("parseOne: heading anchor [[slug#Heading]]", () => {
  const r = parseOne("psn-definition#PSN legs");
  assert.equal(r.slug, "psn-definition");
  assert.equal(r.heading, "PSN legs");
  assert.equal(r.blockId, null);
});

test("parseOne: block anchor [[slug#^block-id]]", () => {
  const r = parseOne("psn-definition#^leg-3");
  assert.equal(r.slug, "psn-definition");
  assert.equal(r.heading, null);
  assert.equal(r.blockId, "leg-3");
});

test("parseOne: pipe alias [[slug|display]]", () => {
  const r = parseOne("psn-definition|the PSN page");
  assert.equal(r.slug, "psn-definition");
  assert.equal(r.display, "the PSN page");
});

test("parseOne: heading + pipe [[slug#Heading|display]]", () => {
  const r = parseOne("psn-definition#PSN legs|the legs section");
  assert.equal(r.slug, "psn-definition");
  assert.equal(r.heading, "PSN legs");
  assert.equal(r.display, "the legs section");
});

test("parseOne: rejects sub-3-char slug", () => {
  assert.equal(parseOne("ab"), null);
});

test("parseOne: handles empty / non-string", () => {
  assert.equal(parseOne(""), null);
  assert.equal(parseOne("   "), null);
  // @ts-expect-error
  assert.equal(parseOne(null), null);
});

// ── parseAll ────────────────────────────────────────────────────────────────

test("parseAll: extracts multiple link tokens with positions", () => {
  const body = "see [[psn-definition]] and [[fleet-reaper#Why golf]]";
  const r = parseAll(body);
  assert.equal(r.length, 2);
  assert.equal(r[0].slug, "psn-definition");
  assert.equal(r[1].slug, "fleet-reaper");
  assert.equal(r[1].heading, "Why golf");
  assert.ok(r[0].start < r[1].start);
});

test("parseAll: drops invalid sub-3-char and empty", () => {
  const body = "[[ab]] [[psn]] [[]]";
  const r = parseAll(body);
  assert.equal(r.length, 1);
  assert.equal(r[0].slug, "psn");
});

// ── resolve ─────────────────────────────────────────────────────────────────

test("resolve: bare slug found", () => {
  const notes = new Map([["psn-definition", { path: "p", body: "" }]]);
  const r = resolve(parseOne("psn-definition"), notes);
  assert.equal(r.found, true);
  assert.equal(r.anchorOk, true);
});

test("resolve: bare slug not found", () => {
  const notes = new Map();
  const r = resolve(parseOne("missing"), notes);
  assert.equal(r.found, false);
});

test("resolve: heading anchor present in body", () => {
  const notes = new Map([["psn", { path: "p", body: "intro\n## PSN legs\nbody" }]]);
  const r = resolve(parseOne("psn#PSN legs"), notes);
  assert.equal(r.found, true);
  assert.equal(r.anchorOk, true);
  assert.equal(r.anchorKind, "heading");
});

test("resolve: heading anchor missing in body", () => {
  const notes = new Map([["psn", { path: "p", body: "intro\n## Other heading\nbody" }]]);
  const r = resolve(parseOne("psn#Missing heading"), notes);
  assert.equal(r.found, true);
  assert.equal(r.anchorOk, false);
  assert.equal(r.anchorMissing, true);
});

test("resolve: block-id anchor present in body", () => {
  const notes = new Map([["psn", { path: "p", body: "para A ^block1\npara B" }]]);
  const r = resolve(parseOne("psn#^block1"), notes);
  assert.equal(r.found, true);
  assert.equal(r.anchorOk, true);
  assert.equal(r.anchorKind, "block");
});

test("resolve: block-id missing", () => {
  const notes = new Map([["psn", { path: "p", body: "para without block markers" }]]);
  const r = resolve(parseOne("psn#^nope"), notes);
  assert.equal(r.found, true);
  assert.equal(r.anchorOk, false);
});

test("resolve: case-insensitive slug match", () => {
  const notes = new Map([["PSN-Definition", { path: "p", body: "" }]]);
  const r = resolve(parseOne("psn-definition"), notes);
  assert.equal(r.found, true);
  assert.equal(r.slug, "PSN-Definition");
});

// ── auditBody ───────────────────────────────────────────────────────────────

test("auditBody: classifies refs into resolved / broken-target / broken-anchor", () => {
  const notes = new Map([
    ["psn", { path: "p", body: "## PSN legs\nbody ^block1" }],
    ["fleet", { path: "f", body: "no anchors here" }],
  ]);
  const body = "see [[psn]] and [[psn#PSN legs]] and [[psn#^block1]] and " +
               "[[fleet#missing-heading]] and [[fleet#^missing-block]] and " +
               "[[totally-missing]]";
  const r = auditBody(body, notes);
  assert.equal(r.total, 6);
  assert.equal(r.resolved, 3);        // bare psn, psn#PSN legs, psn#^block1
  assert.equal(r.broken_anchor_count, 2);  // fleet#missing-heading, fleet#^missing-block
  assert.equal(r.broken_target_count, 1);  // totally-missing
});
