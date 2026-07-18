/**
 * generate-cross-substrate-edges.test.mjs — verifies the SHIPPED cross-substrate
 * edge artifact (CROSS-SUBSTRATE-SYNERGY-MS0, slot:sierra). It asserts the INTENT
 * of the two materialized edge types, not just "the file parses":
 *
 *   owned-by-slot  — galaxy/domain graph node  -> NATO slot node (pre-existing).
 *   documented-by  — galaxy graph node         -> the wiki/memory note that
 *                    documents it (U-XSUB-DOCUMENTED-BY: system-viz <-> Obsidian).
 *
 * The load-bearing invariant is NO DANGLING EDGE: every endpoint must be a node
 * the merge step actually folds into the live graph. We re-derive the confirmed
 * node-id sets straight from the source augmentations (chat-slot-nodes,
 * galaxy-constituents, wiki-entries, memories-atomic) + the artifact's own
 * self-emitted galaxy-roost newNodes, and assert every edge endpoint is in that
 * union. This fails loud if a future generator change emits an edge to a node id
 * that no augmentation produces (the exact bug class the schema + this test guard).
 *
 * Tests the committed artifact (fast, deterministic) rather than spawning the
 * ~40s generator. Regenerate the artifact with:
 *   node scripts/generate-cross-substrate-edges.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateEdgeBatch,
  edgeKey,
  ALLOWED_TYPES,
  detectEdgeDrift,
} from "./lib/cross-substrate-edge-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(VIZ_DIR, name), "utf8"));
}

const artifact = loadJson("cross-substrate-edges-augmentation.json");
const edges = artifact.newEdges || [];
const roostNodes = artifact.newNodes || [];

// Confirmed node-id sets — the same sets the live merge folds. An edge endpoint
// outside this union would dangle in the rendered graph.
const slotNodeIds = new Set(
  (loadJson("chat-slot-nodes-augmentation.json").newNodes || []).map((n) => n.id),
);
const galaxyNodeIds = new Set(Object.keys(loadJson("galaxy-constituents-augmentation.json").annotations || {}));
const wikiNodeIds = new Set((loadJson("wiki-entries-augmentation.json").newNodes || []).map((n) => n.id));
const memNodeIds = new Set((loadJson("memories-atomic-augmentation.json").newNodes || []).map((n) => n.id));
const roostNodeIds = new Set(roostNodes.map((n) => n.id));

// node-card OFFSET ORACLE (gitignored, local-only). Present in dev -> the test
// fully confirms documented-by `to` notes + embeds `from` nodes against the real
// merged-graph node set. Absent in CI -> those endpoint-membership asserts relax to
// structural checks (the committed artifact still carries the edges; only the live
// confirmation is skipped, with a printed note). owned-by-slot is unaffected -- its
// endpoints are always in the small augmentations.
function loadOptional(name) {
  try { return JSON.parse(fs.readFileSync(path.join(VIZ_DIR, name), "utf8")); } catch { return null; }
}
const oracle = loadOptional("node-card-offsets.json");
const oracleNodeIds = oracle && oracle.offsets ? new Set(Object.keys(oracle.offsets)) : null;
const ORACLE = !!oracleNodeIds;
const knownNodeIds = new Set([
  ...slotNodeIds, ...galaxyNodeIds, ...wikiNodeIds, ...memNodeIds, ...roostNodeIds,
  ...(oracleNodeIds || []),
]);

const byType = (t) => edges.filter((e) => e.type === t);

test("artifact shape: non-empty typed edge set + galaxy-roost nodes", () => {
  assert.ok(Array.isArray(edges) && edges.length > 0, "newEdges must be a non-empty array");
  assert.ok(Array.isArray(roostNodes) && roostNodes.length >= 30, "expect ~34 galaxy-roost newNodes");
  assert.equal(artifact.edgeSchemaVersion, "1.0.0");
  // every edge type used is on the schema whitelist
  for (const e of edges) assert.ok(ALLOWED_TYPES.includes(e.type), `edge type ${e.type} not on whitelist`);
});

test("whole batch is schema-valid with zero duplicates", () => {
  const res = validateEdgeBatch(edges);
  assert.equal(res.valid, true, `schema errors: ${JSON.stringify(res.errors).slice(0, 400)}`);
  assert.equal(res.duplicates.length, 0, "no (from|type|to) duplicates allowed");
  // unique-key sanity independent of validateEdgeBatch
  const keys = new Set(edges.map(edgeKey));
  assert.equal(keys.size, edges.length, "every edge key must be unique");
});

test("NO DANGLING EDGE — every endpoint is a confirmed/folded node", () => {
  if (ORACLE) {
    const dangling = edges.filter((e) => !knownNodeIds.has(e.from) || !knownNodeIds.has(e.to));
    assert.equal(
      dangling.length,
      0,
      `dangling endpoints (not folded by any augmentation): ${JSON.stringify(dangling.slice(0, 3))}`,
    );
  } else {
    // CI / oracle-absent: confirm the endpoints the small augmentations fully cover
    // (owned-by-slot). The oracle-only endpoints (documented-by `to` notes, embeds
    // `from` nodes) are structurally validated in their dedicated tests below.
    console.log("NOTE: node-card-offsets oracle absent -> dangling check is structural for oracle-only endpoints");
    const owned = edges.filter((e) => e.type === "owned-by-slot");
    const dangling = owned.filter((e) => !knownNodeIds.has(e.from) || !knownNodeIds.has(e.to));
    assert.equal(dangling.length, 0, `owned-by-slot dangling: ${JSON.stringify(dangling.slice(0, 3))}`);
  }
});

test("owned-by-slot edges preserved (no regression) + well-formed", () => {
  const owned = byType("owned-by-slot");
  assert.ok(owned.length >= 70, `expected >=70 owned-by-slot edges, got ${owned.length}`);
  for (const e of owned) {
    assert.ok(slotNodeIds.has(e.to), `owned-by-slot target ${e.to} is not a slot node`);
    assert.ok(/^ghost\.chat_slot\./.test(e.to), `owned-by-slot target ${e.to} must be a chat_slot node`);
    assert.ok(galaxyNodeIds.has(e.from) || roostNodeIds.has(e.from), `owned-by-slot source ${e.from} unconfirmed`);
  }
});

test("documented-by edges fired + are the system-viz<->Obsidian/Wiki synergy", () => {
  const doc = byType("documented-by");
  assert.ok(doc.length >= 30, `expected >=30 documented-by edges, got ${doc.length}`);

  for (const e of doc) {
    // target must be a CONFIRMED knowledge note (wiki.* or memory_*), never dangling
    assert.ok(/^(wiki\.|memory_)/.test(e.to), `documented-by target ${e.to} is not a knowledge-note id`);
    if (ORACLE) {
      assert.ok(
        oracleNodeIds.has(e.to) || wikiNodeIds.has(e.to) || memNodeIds.has(e.to),
        `documented-by target ${e.to} unconfirmed`,
      );
    }
    // source must be a galaxy graph node (roost or eng domain), never a slot
    assert.ok(/^(eng\.|ghost\.galaxy\.)/.test(e.from), `documented-by source ${e.from} not a galaxy node`);
    assert.ok(galaxyNodeIds.has(e.from) || roostNodeIds.has(e.from), `documented-by source ${e.from} unconfirmed`);
    // provenance contract
    assert.ok(typeof e.source === "string" && e.source.length > 0, "source provenance required");
    assert.ok(e.confidence > 0 && e.confidence <= 1, `confidence ${e.confidence} out of (0,1]`);
    assert.equal(e.addedBy, "sierra");
    assert.notEqual(e.from, e.to, "no self-loop");
  }

  // Convention B (galaxy synthesis) MUST have fired — the proven all-galaxy spine.
  assert.ok(
    doc.some((e) => /_synthesis$/.test(e.to) && e.confidence === 1.0),
    "expected at least one galaxy->synthesis-memory documented-by edge @conf 1.0",
  );
  // At least one edge anchored on a self-emitted galaxy-roost (full-coverage path).
  assert.ok(
    doc.some((e) => roostNodeIds.has(e.from)),
    "expected at least one roost-anchored documented-by edge",
  );
});

test("embeds edges fired + are the system-viz<->PRISM-AI/NN/GNN/RAG synergy", () => {
  const emb = byType("embeds");
  // the committed artifact is generated WITH the oracle (locally) -> a solid floor.
  assert.ok(emb.length >= 100, `expected >=100 embeds edges in the committed artifact, got ${emb.length}`);

  // the embedding-index roosts must be self-emitted nodes in the artifact (so the
  // `to` endpoint is always confirmable, oracle or not).
  const idxRoosts = roostNodes.filter((n) => n.kind === "ghost-embedding-index");
  assert.ok(idxRoosts.length >= 1, "expected >=1 ghost-embedding-index roost node in newNodes");
  const idxRoostIds = new Set(idxRoosts.map((n) => n.id));

  for (const e of emb) {
    // `to` is a self-emitted embedding-index roost
    assert.ok(/^ghost\.embedding_index\./.test(e.to), `embeds target ${e.to} not an embedding-index roost`);
    assert.ok(idxRoostIds.has(e.to), `embeds target ${e.to} is not a self-emitted roost`);
    // `from` is the embedded node. A namespaced id (eng.* / ghost.* / wiki.* ...) is
    // well-shaped on its face; a FLAT-id root (untracked, memory_feedback, vault_Skills --
    // real, DOCUMENTED category-root nodes that legitimately carry a 768d embedding) is
    // well-shaped IFF it is a confirmed merged-graph node. The authoritative invariant is
    // graph-membership (oracle, below) -- not a crude dot-proxy that wrongly rejected ~27
    // real Obsidian-vault/untracked category roots once the embedding pool grew to cover
    // them (U-XSUB-CONSENSUS-REFRESH, slot:sierra). A truly garbage dot-less id still fails.
    assert.ok(typeof e.from === "string" && e.from.length > 0, `embeds source ${e.from} empty/non-string`);
    assert.ok(
      /\./.test(e.from) || knownNodeIds.has(e.from),
      `embeds source ${e.from} is neither namespaced nor a confirmed graph node`,
    );
    if (ORACLE) assert.ok(oracleNodeIds.has(e.from), `embeds source ${e.from} not in merged graph`);
    // existence of the embedding vector is a FACT -> confidence 1.0 (not a prediction)
    assert.equal(e.confidence, 1.0, "embeds edges assert a fact (embedding exists) -> conf 1.0");
    assert.ok(/embedding/.test(e.source), `embeds source provenance must name the embedding pool: ${e.source}`);
    assert.equal(e.addedBy, "sierra");
    assert.notEqual(e.from, e.to, "no self-loop");
  }
});

test("consensus-of edges fired + are the system-viz<->PRISM-AI hybrid-consensus synergy", () => {
  const con = byType("consensus-of");
  // hermes-zulu has an octopus consensus record in the committed state -> >=1.
  assert.ok(con.length >= 1, `expected >=1 consensus-of edge (octopus has run for >=1 domain), got ${con.length}`);
  for (const e of con) {
    // `to` is an octopus-consensus ledger node; `from` is a galaxy roost (self-emitted)
    assert.ok(/^ghost\.octopus_consensus\./.test(e.to), `consensus-of target ${e.to} not an octopus-consensus node`);
    assert.ok(/^ghost\.galaxy\./.test(e.from), `consensus-of source ${e.from} not a galaxy roost`);
    assert.ok(roostNodeIds.has(e.from), `consensus-of source ${e.from} is not a self-emitted galaxy roost`);
    if (ORACLE) assert.ok(oracleNodeIds.has(e.to), `consensus-of target ${e.to} not in merged graph`);
    // confidence is the octopus consensus confidence -- GRADED, never assumed 1.0
    assert.ok(e.confidence >= 0 && e.confidence <= 1, `consensus-of confidence ${e.confidence} out of [0,1]`);
    assert.ok(/octopus-consensus/.test(e.source), `consensus-of provenance must name the octopus source: ${e.source}`);
    assert.equal(e.addedBy, "sierra");
    assert.notEqual(e.from, e.to, "no self-loop");
  }

  // value-level (R9): the edge confidence must match what the generator recorded in
  // stats.consensus.detail (catches an edge/stats drift), and -- when the gitignored
  // source ledger is present (local dev) -- be a real confidence from it OR the
  // documented 0.5 default (catches a hardcoded/wrong confidence). CI lacks the ledger
  // so the source check is skipped there; the stats-consistency check always runs.
  const conDetail = new Map((artifact.stats?.consensus?.detail || []).map((d) => [d.domain, d]));
  for (const e of con) {
    const domain = e.to.replace(/^ghost\.octopus_consensus\./, "");
    const d = conDetail.get(domain);
    assert.ok(d, `consensus-of edge for ${domain} has no stats.consensus.detail entry`);
    assert.equal(e.confidence, d.confidence, `consensus-of confidence ${e.confidence} != recorded ${d.confidence} for ${domain}`);
    let raw = null;
    try { raw = fs.readFileSync(path.join(ROOT, "state/shared/octopus-outcomes", domain + ".jsonl"), "utf8"); } catch { /* gitignored / CI */ }
    if (raw) {
      const confs = raw.split(/\r?\n/).filter(Boolean)
        .map((l) => { try { return JSON.parse(l).confidence; } catch { return undefined; } })
        .filter((c) => typeof c === "number");
      assert.ok(confs.includes(e.confidence) || e.confidence === 0.5, `consensus-of confidence ${e.confidence} not a real value in source ledger ${domain}.jsonl`);
    }
  }
});

test("stats edgeTypes tally matches the actual edge composition", () => {
  const tally = artifact.stats?.edgeTypes || {};
  const recomputed = edges.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(tally, recomputed, "stats.edgeTypes must match the emitted edges");
  assert.equal(artifact.stats.documentedByEdges, byType("documented-by").length);
  assert.equal(artifact.stats.embedsEdges, byType("embeds").length);
  assert.equal(artifact.stats.consensusOfEdges, byType("consensus-of").length);
});

test("detectEdgeDrift flags a silent collapse + sharp drop, ignores healthy/new (R9)", () => {
  // COLLAPSE to 0 -- the documented-by 320->0 class the detector exists to catch
  const c = detectEdgeDrift({ "documented-by": 320 }, { "documented-by": 0 });
  assert.equal(c.detected, true);
  assert.equal(c.events[0].type, "documented-by");
  assert.equal(c.events[0].severity, "collapse");
  // sharp drop (>40%, <90%) -> drift
  const d = detectEdgeDrift({ "documented-by": 320 }, { "documented-by": 100 });
  assert.equal(d.detected, true);
  assert.equal(d.events[0].severity, "drift");
  // near-total drop (>=90%) -> collapse
  assert.equal(detectEdgeDrift({ embeds: 948 }, { embeds: 50 }).events[0].severity, "collapse");
  // healthy: held or grew -> no drift
  assert.equal(detectEdgeDrift({ embeds: 948 }, { embeds: 948 }).detected, false);
  assert.equal(detectEdgeDrift({ embeds: 948 }, { embeds: 1000 }).detected, false);
  // minor decline below threshold (20% < 40%) -> no drift
  assert.equal(detectEdgeDrift({ x: 100 }, { x: 80 }).detected, false);
  // a NEW edge type absent from baseline -> never drift
  assert.equal(detectEdgeDrift({ a: 10 }, { a: 10, b: 5 }).detected, false);
  // no/zero baseline -> no drift (cannot drop from nothing)
  assert.equal(detectEdgeDrift(null, { a: 1 }).detected, false);
  assert.equal(detectEdgeDrift({ a: 0 }, { a: 0 }).detected, false);
});

test("committed artifact carries a drift health field + is healthy (self-monitoring)", () => {
  assert.ok(artifact.drift && typeof artifact.drift === "object", "artifact.drift must be present");
  assert.equal(typeof artifact.drift.detected, "boolean");
  // a committed artifact must NOT show a collapse -- if this fails, an edge type collapsed
  assert.equal(artifact.drift.detected, false, `committed artifact shows drift: ${JSON.stringify(artifact.drift.events || [])}`);
});
