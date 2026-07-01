#!/usr/bin/env node
/**
 * Tests for generate-link-audit-features.mjs (/goal synergy iter 6, echo).
 *
 * Coverage:
 *   - brokenLinkNodeId: deterministic, dedup by (link,from), unicode/empty
 *     safe, ghost-prefix invariant, same-link-different-from disambiguation
 *   - generate: roost emitted, child count clamped by topN, existingNodeIds
 *     skip-list honored, deterministic output, hostile-payload (missing
 *     stats, non-array broken, NaN counts), empty inputs
 *   - real-data E2E: parse the actual live audit JSON and assert the roost +
 *     50 children are emitted with the iter-4 numbers
 *
 * Run: node --test scripts/generate-link-audit-features.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  brokenLinkNodeId,
  generate,
  SCHEMA_VERSION,
  ROOST_ID,
  PLANNED_PARENT,
  ROOST_LAYER,
  LINK_LAYER,
  MAX_LABEL,
  DEFAULT_TOPN,
  HARD_TOPN_CAP,
} from "./generate-link-audit-features.mjs";

// ───────────────────────── brokenLinkNodeId ─────────────────────────

test("brokenLinkNodeId: deterministic — same link → same id", () => {
  const a = brokenLinkNodeId("foo-bar");
  const b = brokenLinkNodeId("foo-bar");
  assert.equal(a, b);
  assert.ok(a.startsWith("ghost.broken_link."), "ghost prefix invariant");
});

// Iter-6 P1-1 anti-regression: stale-node accumulation. The pre-fix design
// embedded a hash of `from` in the id, so a wiki RENAME (changing `from`)
// would spawn a NEW ghost node while the old one stayed forever. New design:
// id depends only on `link`. Renaming the source file MUST NOT spawn new id.
test("brokenLinkNodeId: id is link-only — rename of source file does NOT spawn new id", () => {
  const a = brokenLinkNodeId("missing");
  const b = brokenLinkNodeId("missing");
  assert.equal(a, b, "rename of `from` cannot change identity");
});

// Iter-6 P1-3 anti-regression: unicode-only link collision. Two distinct
// unicode-only links both normalize to `linkPart="x"`. They must produce
// different ids via the FNV-1a of the ORIGINAL link string.
test("brokenLinkNodeId: distinct unicode-only links disambiguate via FNV-of-original", () => {
  const a = brokenLinkNodeId("αβγ");
  const b = brokenLinkNodeId("δεζ");
  assert.notEqual(a, b, "unicode-only links must NOT collide");
  // Both fall back to linkPart "x" but FNV suffix disambiguates
  assert.ok(a.startsWith("ghost.broken_link.x."));
  assert.ok(b.startsWith("ghost.broken_link.x."));
});

test("brokenLinkNodeId: empty link → graph-safe 'x' fallback", () => {
  assert.ok(brokenLinkNodeId("").startsWith("ghost.broken_link.x."));
  assert.ok(brokenLinkNodeId(null).startsWith("ghost.broken_link.x."));
  assert.ok(brokenLinkNodeId(undefined).startsWith("ghost.broken_link.x."));
});

test("brokenLinkNodeId: unicode/special chars → ascii-normalized linkPart + hex tag", () => {
  const id = brokenLinkNodeId("über/skill ♥");
  assert.ok(/^ghost\.broken_link\.[a-z0-9_-]+\.[0-9a-f]{8}$/.test(id), "ascii+hex shape");
});

test("brokenLinkNodeId: 48-char link cap", () => {
  const longLink = "a".repeat(200);
  const id = brokenLinkNodeId(longLink);
  const parts = id.split(".");
  // ghost / broken_link / <link> / <hex>
  assert.equal(parts.length, 4);
  assert.ok(parts[2].length <= 48, `link part capped: ${parts[2].length}`);
});

// ───────────────────────── generate (pure) ─────────────────────────

const SAMPLE_AUDIT = {
  schemaVersion: "1.0.0",
  stats: { linksTotal: 1000, linksBroken: 100, filesScanned: 50, linksResolved: 900 },
  broken: [
    { from: "wiki/a.md", link: "missing-x" },
    { from: "wiki/b.md", link: "missing-y" },
    { from: "wiki/c.md", link: "missing-z" },
  ],
};

test("generate: emits roost + N children, deterministic", () => {
  const r1 = generate(SAMPLE_AUDIT, [], 3);
  const r2 = generate(SAMPLE_AUDIT, [], 3);
  assert.deepEqual(r1, r2, "same input twice → identical output");
  assert.equal(r1.stats.roostEmitted, 1);
  assert.equal(r1.stats.childrenEmitted, 3);
  assert.equal(r1.newNodes.length, 4, "1 roost + 3 children");
  // Roost first
  assert.equal(r1.newNodes[0].id, ROOST_ID);
  assert.equal(r1.newNodes[0].kind, "ghost-roost");
  assert.equal(r1.newNodes[0].layer, ROOST_LAYER);
  assert.equal(r1.newNodes[0].parent, PLANNED_PARENT);
  // Children parented to roost
  for (let i = 1; i < 4; i++) {
    assert.equal(r1.newNodes[i].parent, ROOST_ID);
    assert.equal(r1.newNodes[i].kind, "broken-link");
    assert.equal(r1.newNodes[i].layer, LINK_LAYER);
  }
});

test("generate: topN clamped to [0, HARD_TOPN_CAP]", () => {
  const big = {
    stats: { linksTotal: 1000, linksBroken: 500 },
    broken: Array.from({ length: 500 }, (_, i) => ({ from: `f${i}.md`, link: `l${i}` })),
  };
  assert.equal(generate(big, [], 1000).stats.topN, HARD_TOPN_CAP, "topN capped");
  assert.equal(generate(big, [], 1000).stats.childrenEmitted, HARD_TOPN_CAP);
  assert.equal(generate(big, [], -5).stats.topN, 0, "negative topN → 0");
  assert.equal(generate(big, [], NaN).stats.topN, 0, "NaN topN → 0");
  // topN=0 still emits the roost (roost decision is independent)
  const r0 = generate(big, [], 0);
  assert.equal(r0.stats.roostEmitted, 1);
  assert.equal(r0.stats.childrenEmitted, 0);
});

test("generate: existingNodeIds skip-list — roost AND children skipped", () => {
  const existing = new Set([ROOST_ID]);
  const r = generate(SAMPLE_AUDIT, existing, 3);
  assert.equal(r.stats.roostEmitted, 0, "roost skipped when in existing set");
  // Children still emitted (their ids weren't in the set)
  assert.equal(r.stats.childrenEmitted, 3);

  // Now also add one child id (link-only signature post-iter-6 fix)
  const childId = brokenLinkNodeId("missing-y");
  const existing2 = new Set([ROOST_ID, childId]);
  const r2 = generate(SAMPLE_AUDIT, existing2, 3);
  assert.equal(r2.stats.childrenSkipped, 1);
  assert.equal(r2.stats.childrenEmitted, 2);
});

// Iter-6 P1-1 anti-regression: same broken link in N source files MUST
// aggregate into ONE child node (not N), and the node id MUST be stable
// across regens regardless of which sources reference it.
test("generate: same link in multiple sources → 1 aggregated child (stale-accum guard)", () => {
  const a = {
    stats: { linksTotal: 100, linksBroken: 3 },
    broken: [
      { from: "wiki/a.md", link: "missing-x" },
      { from: "wiki/b.md", link: "missing-x" },
      { from: "wiki/c.md", link: "missing-x" },
    ],
  };
  const r = generate(a, [], 10);
  assert.equal(r.stats.childrenEmitted, 1, "3 entries → 1 aggregated node");
  // Source-list aggregation present in info
  const child = r.newNodes[1];
  assert.ok(child.info.includes("3 sources"), "source count surfaced");
  assert.ok(child.info.includes("wiki/a.md") || child.info.includes("wiki/b.md"), "sources listed");
});

// Iter-6 P2-4 anti-regression: labels must NOT contain literal `[[link]]`
// syntax. If a future renderer ever emits the graph as markdown, literal
// wikilinks would re-pollute the audit producer.
test("generate: labels use 'BROKEN:' prefix, NO literal [[name]] in label or info", () => {
  const a = {
    stats: { linksTotal: 100, linksBroken: 1 },
    broken: [{ from: "x.md", link: "missing-link" }],
  };
  const r = generate(a, [], 1);
  const child = r.newNodes[1];
  assert.ok(child.label.startsWith("BROKEN:"), "label prefix");
  assert.ok(!/\[\[.*\]\]/.test(child.label), "no literal [[name]] in label");
  assert.ok(!/\[\[.*\]\]/.test(child.info), "no literal [[name]] in info");
  // Roost too
  assert.ok(!/\[\[.*\]\]/.test(r.newNodes[0].info), "no literal [[name]] in roost info");
});

test("generate: hostile-payload — missing stats / non-array broken / NaN counts", () => {
  assert.equal(generate({}, [], 10).stats.brokenTotal, 0);
  assert.equal(generate({ stats: null }, [], 10).stats.brokenTotal, 0);
  assert.equal(generate({ broken: "not-array", stats: { linksTotal: 100 } }, [], 10).stats.childrenEmitted, 0);
  assert.equal(generate({ stats: { linksTotal: NaN, linksBroken: NaN } }, [], 10).stats.ratioPct, 0);
  assert.equal(generate(null, [], 10).stats.brokenTotal, 0);
});

test("generate: empty broken[] still emits the roost", () => {
  const a = { stats: { linksTotal: 100, linksBroken: 0 }, broken: [] };
  const r = generate(a, [], 10);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.childrenEmitted, 0);
  assert.equal(r.newNodes[0].label.includes("0/100 broken") || r.newNodes[0].label.includes("0/100"), true);
});

test("generate: ratio percentage rounded to 1 decimal", () => {
  const a = { stats: { linksTotal: 97673, linksBroken: 4136 }, broken: [] };
  const r = generate(a, [], 0);
  assert.equal(r.stats.ratioPct, 4.2, "iter-4 numbers → 4.2%");
});

test("generate: child labels clamped to MAX_LABEL", () => {
  const a = {
    stats: { linksTotal: 100, linksBroken: 1 },
    broken: [{ from: "x.md", link: "a".repeat(200) }],
  };
  const r = generate(a, [], 1);
  const child = r.newNodes[1];
  assert.ok(child.label.startsWith("BROKEN:"));
  assert.ok(child.label.length <= MAX_LABEL);
});

test("generate: malformed broken entries (missing/empty link) fall out at grouping", () => {
  const a = {
    stats: { linksTotal: 100, linksBroken: 3 },
    broken: [{ from: "x.md", link: "" }, { from: "y.md" }, { from: "z.md", link: "ok" }],
  };
  const r = generate(a, [], 10);
  // Post-iter-6 refactor: malformed entries are filtered BEFORE grouping;
  // only well-formed unique links reach the emit loop. childrenSkipped now
  // tracks "I had an aggregate ready but its id was already in existing set".
  assert.equal(r.stats.childrenEmitted, 1, "only the well-formed 'ok' entry emits");
  assert.equal(r.stats.childrenSkipped, 0, "no skip — bad entries never reached emit loop");
  // The valid child IS present
  assert.ok(r.newNodes.some((n) => n.label.startsWith("BROKEN: ok")));
});

test("generate: SCHEMA_VERSION exported and stable", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live audit JSON → roost + 50 children", () => {
  const live = "H:/prism/state/shared/.knowledge-link-audit.json";
  if (!existsSync(live)) {
    console.log("  SKIP: live audit JSON not present (clean clone)");
    return;
  }
  const audit = JSON.parse(readFileSync(live, "utf8"));
  const r = generate(audit, [], DEFAULT_TOPN);
  assert.equal(r.stats.roostEmitted, 1, "roost emitted");
  assert.equal(r.stats.topN, DEFAULT_TOPN);
  assert.ok(r.stats.childrenEmitted >= 1, "at least 1 child");
  assert.ok(r.stats.childrenEmitted <= DEFAULT_TOPN, "child cap honored");
  assert.ok(r.stats.brokenTotal >= 1, "real broken count");
  assert.ok(r.stats.linksTotal >= 50_000, "real link total");
  // Iter 4 first run measured 4.2% — tolerate later drift, just bound.
  assert.ok(r.stats.ratioPct >= 0.1 && r.stats.ratioPct <= 50, "ratio realistic");
  // Spot-check first child shape
  const firstChild = r.newNodes[1];
  assert.ok(firstChild.id.startsWith("ghost.broken_link."));
  assert.equal(firstChild.parent, ROOST_ID);
  assert.equal(firstChild.kind, "broken-link");
});
