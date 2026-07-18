#!/usr/bin/env node
/**
 * Tests for generate-substrate-meta-roost-features.mjs
 * (/goal synergy iter 12, echo, 2026-05-21).
 *
 * Run: node --test scripts/generate-substrate-meta-roost-features.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  SCHEMA_VERSION,
  META_ROOST_ID,
  PLANNED_PARENT,
  META_LAYER,
  SUBSTRATE_TO_ROOST,
} from "./generate-substrate-meta-roost-features.mjs";

// Fixture builders ────────────────────────────────────────────────────

const HEALTHY = Object.freeze({
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T00:00:00Z",
  healthy: true,
  driftSurfaces: [],
  substrates: {
    linkAudit:  { present: true, summary: "5 broken / 1,000 tokens (0.5%)", stats: {} },
    wikiTribal: { present: true, summary: "5 / 100 missing (95.0% coverage)", stats: {} },
  },
});

const DRIFTED = Object.freeze({
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T00:00:00Z",
  healthy: false,
  driftSurfaces: ["link-audit", "wiki-tribal"],
  substrates: {
    linkAudit:  { present: true, summary: "4,136 broken / 97,673 tokens (4.2%)", stats: {} },
    wikiTribal: { present: true, summary: "23,802 / 23,992 missing (0.8% coverage)", stats: {} },
  },
});

// ───────────────────────── exports ─────────────────────────

test("exported constants are stable", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
  assert.equal(META_ROOST_ID, "ghost.substrate_health");
  assert.equal(PLANNED_PARENT, "ghost.planned_features");
  assert.equal(META_LAYER, "L7");
  // SUBSTRATE_TO_ROOST is the load-bearing substrate→roost map; surface
  // additions must be intentional, hence the lock-in test.
  assert.deepEqual(SUBSTRATE_TO_ROOST, {
    linkAudit: "ghost.link_audit_integrity",
    wikiTribal: "ghost.wiki_tribal_coverage",
    aiMemoXref: "ghost.ai_memo_xref", // iter-17: prism-ai-memo substrate registered
  });
  // Iter-9 P1 carry-over: keep the map frozen so a downstream PR can't
  // silently inject an unmapped substrate that produces dangling edges.
  assert.throws(() => { SUBSTRATE_TO_ROOST.linkAudit = "ghost.x"; });
});

// ───────────────────────── healthy path ─────────────────────────

test("generate: healthy rollup → 1 meta-roost + 2 aggregates edges", () => {
  const r = generate(HEALTHY);
  assert.equal(r.newNodes.length, 1);
  assert.equal(r.newEdges.length, 2);
  assert.equal(r.stats.rootEmitted, 1);
  assert.equal(r.stats.edgesEmitted, 2);
  assert.equal(r.stats.healthy, true);
  assert.equal(r.stats.presentCount, 2);
  assert.equal(r.stats.driftCount, 0);
});

test("generate: healthy meta-roost label reads 'all clean' and 'X surfaces'", () => {
  const r = generate(HEALTHY);
  const node = r.newNodes[0];
  assert.equal(node.id, META_ROOST_ID);
  assert.equal(node.parent, PLANNED_PARENT);
  assert.equal(node.layer, META_LAYER);
  assert.equal(node.kind, "ghost-meta-roost");
  assert.ok(node.label.includes("all clean"), "label encodes clean posture");
  assert.ok(node.label.includes("2 surfaces"), "label encodes surface count plural");
  // Iter-6 P2-4 carry: NO literal `[[name]]` in label or info.
  assert.ok(!/\[\[.+?\]\]/.test(node.label), "label has no wikilink literals");
  assert.ok(!/\[\[.+?\]\]/.test(node.info), "info has no wikilink literals");
});

// ───────────────────────── drifted path ─────────────────────────

test("generate: drifted rollup → label encodes drift surfaces", () => {
  const r = generate(DRIFTED);
  assert.equal(r.newNodes.length, 1);
  assert.equal(r.stats.healthy, false);
  assert.equal(r.stats.driftCount, 2);
  const node = r.newNodes[0];
  assert.ok(node.label.includes("2 drifted"), "label encodes drift count");
  assert.ok(node.info.includes("drift:"), "info names drift list");
  assert.ok(node.info.includes("link-audit"), "info preserves iter-4 surface name");
  assert.ok(node.info.includes("wiki-tribal"), "info preserves iter-7 surface name");
});

test("generate: drifted edges target both child roosts", () => {
  const r = generate(DRIFTED);
  const edgeTargets = r.newEdges.map((e) => e.to).sort();
  assert.deepEqual(edgeTargets, ["ghost.link_audit_integrity", "ghost.wiki_tribal_coverage"]);
  for (const e of r.newEdges) {
    assert.equal(e.from, META_ROOST_ID, "all edges originate from meta-roost");
    assert.equal(e.type, "aggregates", "all edges typed as 'aggregates'");
  }
});

// ───────────────────────── single-surface ─────────────────────────

test("generate: only link-audit present → 1 node + 1 edge (linkAudit only)", () => {
  const s = {
    healthy: true,
    driftSurfaces: [],
    substrates: {
      linkAudit:  { present: true, summary: "ok" },
      wikiTribal: { present: false, summary: "missing audit" },
    },
  };
  const r = generate(s);
  assert.equal(r.newNodes.length, 1);
  assert.equal(r.newEdges.length, 1);
  assert.equal(r.newEdges[0].to, "ghost.link_audit_integrity");
  assert.equal(r.stats.presentCount, 1);
  assert.ok(r.newNodes[0].label.includes("1 surface,"), "singular surface count");
});

test("generate: both absent → 1 meta-roost (empty roof), 0 edges", () => {
  // Edge-case: rollup ran but both audits are missing. Meta-roost still
  // surfaces so operators see "this surface exists but is dark" — better
  // than no node at all (which would hide the rollup's existence).
  const s = {
    healthy: false,
    driftSurfaces: [],
    substrates: {
      linkAudit:  { present: false, summary: "missing audit" },
      wikiTribal: { present: false, summary: "missing audit" },
    },
  };
  const r = generate(s);
  assert.equal(r.newNodes.length, 1);
  assert.equal(r.newEdges.length, 0);
  assert.equal(r.stats.presentCount, 0);
});

// ───────────────────────── unmapped substrate ─────────────────────────

test("generate: unmapped future substrate skipped (no dangling edge)", () => {
  // A future substrate's audit lands in the rollup before we wire its roost
  // into SUBSTRATE_TO_ROOST. The generator must silently skip emitting an
  // edge for it (a dangling edge to a non-existent target would visually
  // and structurally corrupt the graph). The substrate still counts toward
  // `presentCount` so operators see the meta-roost label drift.
  const s = {
    healthy: false,
    driftSurfaces: ["nn-graph"],
    substrates: {
      linkAudit: { present: true, summary: "ok" },
      nnGraph:   { present: true, summary: "78 unlabeled engines" }, // unmapped
    },
  };
  const r = generate(s);
  assert.equal(r.newNodes.length, 1);
  assert.equal(r.newEdges.length, 1, "only mapped substrate gets edge");
  assert.equal(r.newEdges[0].to, "ghost.link_audit_integrity");
  assert.equal(r.stats.presentCount, 2, "presentCount still counts unmapped");
  assert.equal(r.stats.edgesEmitted, 1, "edgesEmitted < presentCount when unmapped");
});

// ───────────────────────── fail-soft ─────────────────────────

test("generate: null/empty/wrong-shape status → still produces meta-roost", () => {
  // Permissive: a malformed rollup still emits the meta-roost so the
  // operator can see the producer failed (the consumer's stale-gate
  // surfaces the staleness; this generator just renders structure).
  for (const bad of [null, {}, { substrates: null }, { substrates: 42 }]) {
    const r = generate(bad);
    assert.equal(r.newNodes.length, 1, `degenerate input ${JSON.stringify(bad)} still emits roost`);
    assert.equal(r.newEdges.length, 0, "no edges when substrates malformed");
  }
});

// ───────────────────────── idempotency ─────────────────────────

test("generate: existingNodeIds includes META_ROOST_ID → skip roost, keep edges", () => {
  // Re-run scenario: graph already has the meta-roost. The augmentation
  // must skip duplicate emission of the node (merge would dedupe anyway,
  // but we also want stats.rootEmitted=0 so the cron log reads correctly).
  // Edges still emit — merge will dedupe them by (from, to, type).
  const r = generate(DRIFTED, [META_ROOST_ID]);
  assert.equal(r.newNodes.length, 0);
  assert.equal(r.newEdges.length, 2, "edges always re-emitted (merge handles dedup)");
  assert.equal(r.stats.rootEmitted, 0);
  assert.equal(r.stats.edgesEmitted, 2);
});

test("generate: existingNodeIds as Set → behaves identically to array", () => {
  const arr = generate(DRIFTED, [META_ROOST_ID]);
  const set = generate(DRIFTED, new Set([META_ROOST_ID]));
  assert.equal(JSON.stringify(arr), JSON.stringify(set));
});

// ───────────────────────── determinism ─────────────────────────

test("generate: same input twice → byte-stable output (deterministic)", () => {
  const a = JSON.stringify(generate(DRIFTED));
  const b = JSON.stringify(generate(DRIFTED));
  assert.equal(a, b);
});

test("generate: edges emitted in deterministic name-asc substrate order", () => {
  // Input deliberately reverses canonical order; emission must still sort.
  const s = {
    healthy: false,
    driftSurfaces: [],
    substrates: {
      wikiTribal: { present: true, summary: "x" }, // out of order
      linkAudit:  { present: true, summary: "y" },
    },
  };
  const r = generate(s);
  // name-asc: linkAudit comes first
  assert.equal(r.newEdges[0].to, "ghost.link_audit_integrity");
  assert.equal(r.newEdges[1].to, "ghost.wiki_tribal_coverage");
});

// ───────────────────────── label/info bounds ─────────────────────────

test("generate: label clamped to MAX_LABEL (80 chars)", () => {
  const r = generate(HEALTHY);
  assert.ok(r.newNodes[0].label.length <= 80);
});

test("generate: info clamped to MAX_INFO (280 chars)", () => {
  const r = generate(HEALTHY);
  assert.ok(r.newNodes[0].info.length <= 280);
});
