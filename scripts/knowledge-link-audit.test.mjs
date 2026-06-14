#!/usr/bin/env node
/**
 * Tests for knowledge-link-audit.mjs (U-KNOWLEDGE-LINK-AUDIT).
 * Run: node --test scripts/knowledge-link-audit.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractLinks,
  normalizeName,
  auditLinks,
  isPhantomLinkTarget,
} from "./knowledge-link-audit.mjs";

// ───────────────────────── extractLinks ─────────────────────────

test("extractLinks: plain [[link]] tokens", () => {
  assert.deepEqual(extractLinks("see [[foo]] and [[bar]] for more"), ["foo", "bar"]);
});

test("extractLinks: aliased [[name|display]] returns the name, not the alias", () => {
  assert.deepEqual(extractLinks("read [[skills/foxtrot|/foxtrot]] now"), ["skills/foxtrot"]);
});

test("extractLinks: greedy stop at ]] — no cross-link bleed", () => {
  assert.deepEqual(extractLinks("[[a]] x [[b]]"), ["a", "b"]);
});

test("extractLinks: link spanning newline is rejected (not a link)", () => {
  assert.deepEqual(extractLinks("[[multi\nline]] should not match"), []);
});

test("extractLinks: empty/null safe, never throws", () => {
  assert.deepEqual(extractLinks(""), []);
  assert.deepEqual(extractLinks(null), []);
  assert.deepEqual(extractLinks(undefined), []);
});

// ───────────────────────── normalizeName ─────────────────────────

test("normalizeName: strips .md, lowercases, underscore→hyphen, keeps tail segment", () => {
  assert.equal(normalizeName("Reference_Foo_Bar.md"), "reference-foo-bar");
  assert.equal(normalizeName("skills/foxtrot/x"), "x");
  assert.equal(normalizeName("DEEP/path/Some_Name.MD"), "some-name");
});

test("normalizeName: empty/garbage → '' (safe), never throws", () => {
  assert.equal(normalizeName(""), "");
  assert.equal(normalizeName(null), "");
  assert.equal(normalizeName(undefined), "");
});

// ───────────────────────── auditLinks ─────────────────────────

test("auditLinks: resolves known names, flags broken, sorted output", () => {
  const known = new Set(["resolved-one", "resolved-two"]);
  const files = [
    { path: "b/file.md", links: ["resolved-one", "missing-x"] },
    { path: "a/file.md", links: ["MISSING-y", "Resolved_Two.md"] },
  ];
  const r = auditLinks(files, known);
  assert.equal(r.stats.linksTotal, 4);
  assert.equal(r.stats.linksResolved, 2, "Resolved_Two.md normalizes to resolved-two");
  assert.equal(r.stats.linksBroken, 2);
  assert.deepEqual(r.broken.map((b) => b.from), ["a/file.md", "b/file.md"], "sorted by 'from' path");
});

test("auditLinks: empty/garbage → 0/0/0, never throws", () => {
  const r = auditLinks([], new Set());
  assert.deepEqual(r, { broken: [], stats: { filesScanned: 0, linksTotal: 0, linksResolved: 0, linksBroken: 0, linksSkippedPhantom: 0 } });
  assert.deepEqual(auditLinks(null, null).broken, []);
  assert.deepEqual(auditLinks("not-array", new Set()).broken, []);
});

test("auditLinks: deterministic — same input twice is identical", () => {
  const known = new Set(["a"]);
  const files = [{ path: "f.md", links: ["a", "b", "c"] }];
  assert.equal(JSON.stringify(auditLinks(files, known)), JSON.stringify(auditLinks(files, known)));
});

// ───────────────────── isPhantomLinkTarget (U-OBS-LINK-AUDIT-PHANTOM-FILTER) ─────────────────────

test("isPhantomLinkTarget: glob fragments (*/?) are phantoms", () => {
  assert.equal(isPhantomLinkTarget("*.test.mjs"), true);
  assert.equal(isPhantomLinkTarget("src/**/*.ts"), true);
  assert.equal(isPhantomLinkTarget("foo?bar"), true);
});

test("isPhantomLinkTarget: repo path-prefix + slash is a phantom", () => {
  for (const p of ["src/foo.ts", "scripts/lib/x.mjs", "mcp-server/src/engines/Y.ts",
                   "knowledge/wiki/z", "state/shared/a.json", "skills/foxtrot/x"]) {
    assert.equal(isPhantomLinkTarget(p), true, `${p} should be phantom`);
  }
  assert.equal(isPhantomLinkTarget("SRC/Foo.ts"), true, "case-insensitive first segment");
});

test("isPhantomLinkTarget: real wikilinks are NOT phantoms (no over-filter)", () => {
  // Plain names — no slash → real links.
  assert.equal(isPhantomLinkTarget("feedback-psn-definition"), false);
  assert.equal(isPhantomLinkTarget("reference_foo_bar"), false);
  // Intentional namespaced links the recall hooks render — slash but NOT a repo prefix.
  assert.equal(isPhantomLinkTarget("galaxy/mill"), false, "galaxy/* links must be preserved");
  assert.equal(isPhantomLinkTarget("memory_patterns/token-optimization_synthesis"), false);
  // Empty/garbage safe.
  assert.equal(isPhantomLinkTarget(""), false);
  assert.equal(isPhantomLinkTarget(null), false);
  assert.equal(isPhantomLinkTarget(undefined), false);
});

test("auditLinks: phantom targets are skipped from the tally + counted separately (not broken)", () => {
  const known = new Set(["real-one"]);
  const files = [{
    path: "doc.md",
    links: ["real-one", "missing-real", "src/foo.ts", "scripts/x.mjs", "*.test.mjs", "galaxy/mill"],
  }];
  const r = auditLinks(files, known);
  // 3 phantoms (src/, scripts/, glob) skipped; galaxy/mill is a REAL (broken) link, not a phantom.
  assert.equal(r.stats.linksSkippedPhantom, 3, "3 phantom targets skipped");
  assert.equal(r.stats.linksTotal, 3, "only real candidates counted (real-one, missing-real, galaxy/mill)");
  assert.equal(r.stats.linksResolved, 1, "real-one resolves");
  assert.equal(r.stats.linksBroken, 2, "missing-real + galaxy/mill broken — NOT the phantoms");
  assert.ok(!r.broken.some((b) => b.link === "src/foo.ts"), "phantom never appears in broken list");
  assert.ok(r.broken.some((b) => b.link === "galaxy/mill"), "real namespaced link still flagged broken when unknown");
});
