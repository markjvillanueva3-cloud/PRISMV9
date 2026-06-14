// Tests for connection-finder.mjs.
// Run: node --test scripts/lib/connection-finder.test.mjs
// @milestone PSN-ENHANCE-MS0/U-PSN-CONNECTION-FINDER
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tokenize,
  extractLinkedSlugs,
  buildIdf,
  cosineSim,
  findExistingConnections,
  findConnections,
} from "./connection-finder.mjs";

// ── tokenize ────────────────────────────────────────────────────────────────

test("tokenize: lowercases, splits on non-word, filters short + stopwords", () => {
  const t = tokenize("The PSN Synergy Network has eleven legs that interconnect.");
  assert.ok(t.includes("synergy"));
  assert.ok(t.includes("network"));
  assert.ok(t.includes("eleven"));
  assert.ok(t.includes("interconnect"));
  assert.equal(t.includes("the"), false);   // <4 chars
  assert.equal(t.includes("that"), false);  // stopword
  assert.equal(t.includes("has"), false);   // <4 chars
});

test("tokenize: non-string returns []", () => {
  // @ts-expect-error - defensive null tolerance
  assert.deepEqual(tokenize(null), []);
  // @ts-expect-error
  assert.deepEqual(tokenize(undefined), []);
  assert.deepEqual(tokenize(""), []);
});

// ── extractLinkedSlugs ──────────────────────────────────────────────────────

test("extractLinkedSlugs: pulls bare [[slug]] references", () => {
  const s = extractLinkedSlugs("see [[psn-definition]] and [[fleet-reaper]] for context");
  assert.ok(s.has("psn-definition"));
  assert.ok(s.has("fleet-reaper"));
  assert.equal(s.size, 2);
});

test("extractLinkedSlugs: drops the heading/block suffix portion", () => {
  const s = extractLinkedSlugs("see [[psn-definition#PSN legs]] and [[fleet#^block1]]");
  assert.ok(s.has("psn-definition"));
  assert.ok(s.has("fleet"));
});

test("extractLinkedSlugs: handles pipe-alias [[slug|display]]", () => {
  const s = extractLinkedSlugs("see [[psn-definition|the PSN page]] for details");
  assert.ok(s.has("psn-definition"));
});

test("extractLinkedSlugs: empty body returns empty set", () => {
  assert.equal(extractLinkedSlugs("").size, 0);
  // @ts-expect-error
  assert.equal(extractLinkedSlugs(null).size, 0);
});

// ── buildIdf / cosineSim ────────────────────────────────────────────────────

test("buildIdf: produces a map keyed on every token in the corpus", () => {
  const notes = new Map([
    ["a", { path: "a", body: "spindle force kienzle calculation" }],
    ["b", { path: "b", body: "spindle torque computation" }],
  ]);
  const { idf, N } = buildIdf(notes);
  assert.equal(N, 2);
  assert.ok(idf.has("spindle"));
  assert.ok(idf.has("kienzle"));
});

test("cosineSim: identical bags score 1.0", () => {
  const idf = new Map([["spindle", 1], ["force", 1]]);
  const s = cosineSim(["spindle", "force"], ["spindle", "force"], idf);
  assert.ok(Math.abs(s - 1) < 1e-9);
});

test("cosineSim: disjoint bags score 0", () => {
  const idf = new Map([["spindle", 1], ["torque", 1], ["chatter", 1]]);
  assert.equal(cosineSim(["spindle"], ["chatter"], idf), 0);
});

test("cosineSim: empty bag returns 0", () => {
  assert.equal(cosineSim([], ["x"], new Map([["x", 1]])), 0);
  assert.equal(cosineSim(["x"], [], new Map([["x", 1]])), 0);
});

// ── findExistingConnections ─────────────────────────────────────────────────

test("findExistingConnections: pulls outgoing + incoming + self", () => {
  const notes = new Map([
    ["psn", { path: "p", body: "links [[fleet]] and [[atcs]]" }],
    ["fleet", { path: "f", body: "no links here" }],
    ["atcs", { path: "a", body: "links [[psn]] in return" }],
    ["other", { path: "o", body: "irrelevant" }],
  ]);
  const c = findExistingConnections("psn", notes);
  assert.ok(c.has("psn"));    // self
  assert.ok(c.has("fleet"));  // outgoing
  assert.ok(c.has("atcs"));   // outgoing + incoming
  assert.equal(c.has("other"), false);
});

// ── findConnections (top-level) ─────────────────────────────────────────────

test("findConnections: ranks similar non-connected notes by tfidf cosine", () => {
  const notes = new Map([
    ["psn", { path: "p", body: "spindle force kienzle calculation cutting" }],
    ["physics-paper", { path: "f", body: "spindle force kienzle deflection calculation" }],
    ["unrelated", { path: "u", body: "marketing copywriting brand strategy" }],
  ]);
  const r = findConnections("psn", notes, { topK: 5, minScore: 0 });
  assert.equal(r.ok, true);
  // physics-paper should rank above unrelated
  assert.ok(r.candidates.length >= 1);
  assert.equal(r.candidates[0].slug, "physics-paper");
});

test("findConnections: filters out already-linked notes", () => {
  const notes = new Map([
    ["psn", { path: "p", body: "spindle force kienzle calculation [[physics-paper]]" }],
    ["physics-paper", { path: "f", body: "spindle force kienzle deflection" }],
    ["new-paper", { path: "n", body: "spindle force kienzle vibration" }],
  ]);
  const r = findConnections("psn", notes, { topK: 5, minScore: 0 });
  const slugs = r.candidates.map((c) => c.slug);
  assert.equal(slugs.includes("physics-paper"), false);   // already linked
  assert.ok(slugs.includes("new-paper"));                  // not linked
});

test("findConnections: missing target returns ok=false", () => {
  const notes = new Map([["a", { path: "a", body: "x" }]]);
  const r = findConnections("missing-slug", notes);
  assert.equal(r.ok, false);
  assert.match(r.reason, /not found/i);
});

test("findConnections: minScore threshold prunes weak matches", () => {
  const notes = new Map([
    ["psn", { path: "p", body: "spindle force kienzle calculation" }],
    ["weakly-related", { path: "w", body: "calculation methodology rigor" }],
    ["unrelated", { path: "u", body: "marketing strategy brand voice" }],
  ]);
  const r = findConnections("psn", notes, { topK: 10, minScore: 0.5 });
  // At minScore=0.5 unrelated MUST be excluded; weakly-related likely too
  for (const c of r.candidates) assert.notEqual(c.slug, "unrelated");
});

test("findConnections: topK caps result count", () => {
  const notes = new Map();
  notes.set("psn", { path: "p", body: "spindle force kienzle" });
  for (let i = 0; i < 50; i++) {
    notes.set(`related-${i}`, { path: `r${i}`, body: "spindle force kienzle additional words" });
  }
  const r = findConnections("psn", notes, { topK: 7, minScore: 0 });
  assert.equal(r.candidates.length, 7);
});
