// generate-galaxy-federation-roost-features.test.mjs — U-GCF-VIZ-ROOST hermetic tests (node:test).
// Run: node --test scripts/generate-galaxy-federation-roost-features.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  loadArtifacts,
  META_ROOST_ID,
  PLANNED_PARENT,
  MAX_LABEL,
  MAX_INFO,
  ARTIFACTS,
} from "./generate-galaxy-federation-roost-features.mjs";

const FULL = {
  cards: { cards: new Array(34).fill({}), salience: true, schemaVersion: "1.2.0" },
  digest: { galaxyCount: 34, bytes: 7315 },
  knowsMap: { totalGalaxies: 34, tokenCount: 767 },
  dedup: { clusterCount: 6, totalEstTokensSaved: 37 },
  savings: { perInjectPotential: { bestStrategyCeiling: 51369 }, cumulativeRealized: { recallFirstTokens: 0 } },
};

// ── generate ────────────────────────────────────────────────────────────────────
test("generate: meta-roost + one child per present artifact + aggregates edges", () => {
  const { newNodes, newEdges, stats } = generate(FULL, []);
  assert.equal(stats.presentCount, 5);
  assert.equal(stats.rootEmitted, 1);
  assert.equal(stats.childrenEmitted, 5);
  assert.equal(newNodes.length, 6);   // meta + 5 children
  assert.equal(newEdges.length, 5);
  const meta = newNodes.find((n) => n.id === META_ROOST_ID);
  assert.equal(meta.parent, PLANNED_PARENT);
  assert.equal(meta.layer, "L7");
  assert.ok(newNodes.filter((n) => n.parent === META_ROOST_ID).length === 5); // children attach to meta
  for (const e of newEdges) { assert.equal(e.from, META_ROOST_ID); assert.equal(e.type, "aggregates"); }
});

test("generate: an ABSENT artifact omits its child roost + edge (fail-soft, no dangling node)", () => {
  const partial = { cards: FULL.cards, savings: FULL.savings }; // only 2 present
  const { newNodes, newEdges, stats } = generate(partial, []);
  assert.equal(stats.presentCount, 2);
  assert.equal(newNodes.length, 3); // meta + 2
  assert.equal(newEdges.length, 2);
  assert.ok(!newNodes.some((n) => n.id === "ghost.gcf_digest"));
});

test("generate: existingNodeIds skip-list — present nodes not re-emitted, but edge still emitted", () => {
  const { newNodes, newEdges } = generate(FULL, [META_ROOST_ID, "ghost.gcf_cards"]);
  assert.ok(!newNodes.some((n) => n.id === META_ROOST_ID), "meta already present → not re-emitted");
  assert.ok(!newNodes.some((n) => n.id === "ghost.gcf_cards"), "cards child already present → not re-emitted");
  assert.equal(newEdges.length, 5, "edges still emitted for all present artifacts (idempotent dedup is merge's job)");
});

test("generate: malformed sidecar (builder returns null / throws) → artifact omitted", () => {
  const bad = { cards: { cards: "not-an-array" }, digest: { galaxyCount: "x" }, knowsMap: null, dedup: { clusterCount: 6, totalEstTokensSaved: 37 } };
  const { stats, newNodes } = generate(bad, []);
  assert.equal(stats.presentCount, 1); // only dedup builds
  assert.ok(newNodes.some((n) => n.id === "ghost.gcf_dedup"));
  assert.ok(!newNodes.some((n) => n.id === "ghost.gcf_cards"));
});

test("generate: empty / garbage input → just the (empty) meta-roost, no children, no throw", () => {
  const { newNodes, newEdges, stats } = generate({}, []);
  assert.equal(stats.presentCount, 0);
  assert.equal(newNodes.length, 1); // meta only
  assert.equal(newEdges.length, 0);
  assert.doesNotThrow(() => generate(null, null));
});

// FAIL-ON-REVERT: NO node label/info may contain a literal [[wikilink]] — it would feed the link-audit
// producer scan and create self-referential drift (the documented iter-6 P2-4 lesson).
test("generate: no node label or info contains a literal [[wikilink]]", () => {
  const { newNodes } = generate(FULL, []);
  for (const n of newNodes) {
    assert.ok(!/\[\[[^\]]+\]\]/.test(n.label || ""), `label has wikilink: ${n.label}`);
    assert.ok(!/\[\[[^\]]+\]\]/.test(n.info || ""), `info has wikilink: ${n.info}`);
  }
});

test("generate: labels ≤ MAX_LABEL, info ≤ MAX_INFO; nodes carry ghost/status/kind", () => {
  const { newNodes } = generate(FULL, []);
  for (const n of newNodes) {
    assert.ok(n.label.length <= MAX_LABEL, `label too long: ${n.label.length}`);
    assert.ok((n.info || "").length <= MAX_INFO, `info too long: ${(n.info || "").length}`);
    assert.equal(n.ghost, true);
    assert.equal(n.status, "ghost");
    assert.ok(/ghost-/.test(n.kind));
  }
});

test("generate: child labels encode live stats (cards galaxy count, savings ceiling)", () => {
  const { newNodes } = generate(FULL, []);
  assert.match(newNodes.find((n) => n.id === "ghost.gcf_cards").label, /34 galaxies/);
  assert.match(newNodes.find((n) => n.id === "ghost.gcf_savings").label, /51369 tok\/inject/);
});

// ── loadArtifacts ────────────────────────────────────────────────────────────────
test("loadArtifacts: parses each present sidecar; missing/garbage → null per key", () => {
  const files = {
    "INDEX.json": JSON.stringify(FULL.cards),
    "MASTER-DIGEST.json": "{bad json",
    // others absent
  };
  const loaded = loadArtifacts({ cardsDir: "/c", readImpl: (f) => { const base = f.replace(/\\/g, "/").split("/").pop(); return files[base] ?? null; } });
  assert.ok(loaded.cards && Array.isArray(loaded.cards.cards));
  assert.equal(loaded.digest, null); // garbage → null
  assert.equal(loaded.knowsMap, null); // absent → null
});

test("ARTIFACTS: each has key/roostId/file/build; roostIds unique", () => {
  const ids = ARTIFACTS.map((a) => a.roostId);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of ARTIFACTS) { assert.ok(a.key && a.roostId && a.file && typeof a.build === "function"); }
});

// ── LIVE soft integration ──────────────────────────────────────────────────────
test("LIVE: real federation sidecars → meta-roost + ≥1 child (if any artifact built)", () => {
  const loaded = loadArtifacts({});
  const { newNodes, stats } = generate(loaded, []);
  assert.ok(newNodes.some((n) => n.id === META_ROOST_ID), "meta-roost always emitted");
  if (stats.presentCount > 0) assert.ok(newNodes.length > 1, "present artifacts → child roosts");
});
