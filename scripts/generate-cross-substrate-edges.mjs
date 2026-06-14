#!/usr/bin/env node
/**
 * generate-cross-substrate-edges.mjs — emit a merge-compatible, schema-validated
 * cross-substrate edge augmentation (CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-CLOSURE-AUGMENTATION,
 * slot:sierra).
 *
 * Goal context: the system-viz graph (~548MB) is the fleet search substrate, but
 * its galaxy/engine nodes are not linked to the OTHER PSN substrates: the Hermes
 * slot fleet AND the Obsidian/Wiki knowledge brain. This generator materializes
 * ALL FOUR typed cross-substrate edge types, each with CONFIRMED endpoints so every
 * edge is graph-traversable:
 *   1. `owned-by-slot`  — galaxy/domain node  -> the NATO slot whose soul owns it.
 *   2. `documented-by`  — galaxy node         -> the wiki/memory note that documents
 *                          it (system-viz <-> Obsidian/Wiki synergy).
 *   3. `embeds`         -> graph node -> its nomic-768d embedding pool (system-viz
 *                          <-> PRISM-AI / NN / GNN / RAG embedding-footprint synergy).
 *   4. `consensus-of`   -> galaxy node -> the octopus multi-model consensus record for
 *                          its domain (system-viz <-> PRISM-AI hybrid-consensus synergy).
 *
 * documented-by node-id namespaces were confirmed 2026-06-03 (U-XSUB-DOCUMENTED-BY):
 * knowledge notes are first-class graph nodes `memory_<kind>.<slug>` (folded by
 * memories-atomic-augmentation) and `wiki.<section>.<slug>` (wiki-entries-augmentation).
 * Two deterministic, endpoint-confirmed conventions drive it (see emit pass below):
 *   B) galaxy <- its `memory_patterns.<galaxy>_synthesis` note (1:1, all galaxies).
 *   C) galaxy <- each `[[backlink]]` in that galaxy's own MEMORY.md that RESOLVES
 *      to a confirmed wiki/memory node (operator-authored brain index).
 * The brainstorm's speculative engines_audit_*->eng.* convention is deliberately
 * NOT emitted: per-engine `eng.<engine>` ids are not confirmable from the small
 * augmentations, so it would risk dangling edges (R12). Endpoints over yield.
 *
 * ADD-only & single-writer safe: this script ONLY writes its own augmentation
 * file. It does NOT touch system-graph.json. Folding into the graph is a separate
 * gated step (add a loadOptional + splice block in merge-augmentations.mjs, then
 * regen-viz). Every emitted edge passes cross-substrate-edge-schema validation.
 *
 * Sources (no 548MB graph load — endpoints confirmed from small augmentations):
 *   - galaxy->slot ownership: parsed from the canonical MEMORY.md galaxy index
 *     (`[galaxy:X] ... (slot:Y` / `(Y M-DD)`), NOT hardcoded counts. Source of
 *     truth is each galaxy's own MEMORY.md `slot:` tag; the index mirrors it.
 *   - slot node ids: state/shared/system-viz/chat-slot-nodes-augmentation.json
 *   - galaxy domain node ids: state/shared/system-viz/galaxy-constituents-augmentation.json
 *
 * Output: state/shared/system-viz/cross-substrate-edges-augmentation.json
 *   { schemaVersion, generatedAt, newNodes:[], newEdges:[...], stats:{...} }
 *
 * Usage:
 *   node scripts/generate-cross-substrate-edges.mjs            # write artifact
 *   node scripts/generate-cross-substrate-edges.mjs --json     # JSON to stdout, no write
 *   node scripts/generate-cross-substrate-edges.mjs --dry      # report stats, no write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCHEMA_VERSION,
  assertValidEdge,
  validateEdgeBatch,
  edgeKey,
  detectEdgeDrift,
} from "./lib/cross-substrate-edge-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT = path.join(VIZ_DIR, "cross-substrate-edges-augmentation.json");

// Canonical memory index (galaxy -> owning slot). C: is the live auto-memory; H:
// is the mirror. Prefer C:, fall back to the H: mirror so the script runs on
// either drive / either host.
const MEMORY_INDEX_CANDIDATES = [
  path.join(process.env.USERPROFILE || process.env.HOME || "C:/Users/wompu", ".claude/projects/H--prism/memory/MEMORY.md"),
  path.join(ROOT, "knowledge/memories/MEMORY.md"),
];

const argv = new Set(process.argv.slice(2));
const ADDED_BY = "sierra";
const NOW = new Date().toISOString();

function readFirstExisting(candidates) {
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return { path: p, text: fs.readFileSync(p, "utf8") };
    } catch {
      /* try next */
    }
  }
  return null;
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Optional JSON loader — returns null if the file is missing/unparseable (no throw). */
function loadJsonOptional(p) {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    /* treat as absent */
  }
  return null;
}

/** Optional text loader — returns null if the file is missing/unreadable (no throw). */
function loadFileOptional(p) {
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  } catch {
    /* treat as absent */
  }
  return null;
}

/**
 * Parse galaxy -> slot from the MEMORY.md galaxy index. Index lines look like:
 *   - [galaxy:cam] mcp-server/src/engines/cam/MEMORY.md — ... (slot:kilo, 2026-05-28)
 *   - [galaxy:wiring] mcp-server/src/engines/wiring/MEMORY.md — ..., romeo (golf 5-29)
 * We accept both `(slot:NAME` and a trailing `, NAME (golf M-DD)` style owner.
 */
function parseGalaxyOwners(memoryText) {
  const VALID_SLOTS = new Set([
    "alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett",
    "kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango",
    "uniform","victor","whiskey","xray","yankee","zulu",
  ]);
  const owners = new Map(); // galaxy -> slot
  const reGalaxy = /\[galaxy:([\w-]+)\]/;
  for (const rawLine of memoryText.split(/\r?\n/)) {
    const gm = rawLine.match(reGalaxy);
    if (!gm) continue;
    const galaxy = gm[1];
    let slot = null;
    const explicit = rawLine.match(/\(slot:([a-z]+)/i);
    if (explicit && VALID_SLOTS.has(explicit[1].toLowerCase())) {
      slot = explicit[1].toLowerCase();
    } else {
      // fall back to the last NATO word that appears as an owner token, e.g.
      // "..., romeo (golf 5-29)" -> prefer the explicit author word before "(...M-DD)".
      const ownerWord = rawLine.match(/,\s*([a-z]+)\s*\(/i);
      if (ownerWord && VALID_SLOTS.has(ownerWord[1].toLowerCase())) {
        slot = ownerWord[1].toLowerCase();
      } else {
        const paren = rawLine.match(/\((golf|alpha|bravo|charlie|delta|echo|foxtrot|hotel|india|juliett|kilo|lima|mike|november|oscar|papa|quebec|romeo|sierra|tango|uniform|victor|whiskey|xray|yankee|zulu)\s/i);
        if (paren) slot = paren[1].toLowerCase();
      }
    }
    if (slot && !owners.has(galaxy)) owners.set(galaxy, slot);
  }
  return owners;
}

/** Resolve a galaxy name to a confirmed graph domain node id, or null. */
function resolveGalaxyNode(galaxy, galaxyNodeIds) {
  const variants = [
    `eng.${galaxy}`,
    `eng.${galaxy.replace(/-/g, "")}`,
    `eng.${galaxy.replace(/-/g, "_")}`,
  ];
  for (const v of variants) if (galaxyNodeIds.has(v)) return v;
  return null;
}

/**
 * Conservative engine-domain-group -> owning-slot inference table. These are
 * `eng.<domain>` name-prefix groups (NOT the 34 PSN galaxies) whose soul owner
 * is well-established by JULIETT-12CHAT-ALLOCATION + CHAT-SLOT-DOMAINS. Emitted
 * at confidence 0.85 (inference, source 'domain-group-soul-inference') — the
 * provenance field keeps these distinct from the operator-canonical galaxy-name
 * edges (confidence 1.0). Only HIGH-confidence assignments are listed; ambiguous
 * domains (eng.other, eng.multi, eng.cross...) are deliberately omitted so no
 * wrong edge is ever emitted. Endpoints are still confirmed before emission.
 */
const DOMAIN_GROUP_TO_SLOT = {
  "eng.milling": "foxtrot", "eng.mill": "foxtrot", "eng.fixture": "foxtrot",
  "eng.mastercam": "kilo", "eng.cam": "kilo", "eng.toolpath": "kilo", "eng.hyper": "kilo", "eng.strategy": "kilo",
  "eng.wedm": "mike", "eng.wire": "mike", "eng.edm": "mike",
  "eng.cad": "delta", "eng.fusion": "delta", "eng.solid": "delta", "eng.inventor": "delta", "eng.geometry": "delta", "eng.nurbs": "delta", "eng.surface": "delta",
  "eng.lathe": "whiskey", "eng.turning": "whiskey",
  "eng.business": "hotel", "eng.erp": "hotel",
  "eng.quote": "charlie",
  "eng.blueprint": "xray", "eng.print": "xray",
  "eng.post": "echo", "eng.okuma": "echo", "eng.pp": "echo",
  "eng.force": "oscar", "eng.physics": "oscar", "eng.thermal": "oscar", "eng.chatter": "oscar", "eng.coating": "oscar", "eng.coolant": "oscar", "eng.calc": "oscar",
  "eng.ai": "india", "eng.ml": "india",
  "eng.agent": "bravo",
  "eng.memory": "juliett", "eng.data": "juliett",
  "eng.safety": "golf", "eng.compliance": "golf", "eng.quality": "golf", "eng.audit": "golf", "eng.hook": "golf", "eng.nlhook": "golf",
  "eng.knowledge": "alpha", "eng.tribal": "alpha",
};

function main() {
  // --- load confirmed node-id sets (small files; no 548MB graph load) ---
  const slotAug = loadJson(path.join(VIZ_DIR, "chat-slot-nodes-augmentation.json"));
  const slotNodeIds = new Set((slotAug.newNodes || []).map((n) => n.id).filter(Boolean));

  const galAug = loadJson(path.join(VIZ_DIR, "galaxy-constituents-augmentation.json"));
  const galaxyNodeIds = new Set(Object.keys(galAug.annotations || {}));

  const mem = readFirstExisting(MEMORY_INDEX_CANDIDATES);
  if (!mem) {
    console.error("FATAL: no MEMORY.md galaxy index found in any candidate path:\n  " + MEMORY_INDEX_CANDIDATES.join("\n  "));
    process.exit(2);
  }
  const owners = parseGalaxyOwners(mem.text);
  if (owners.size === 0) {
    console.error(`FATAL: parsed 0 galaxy->slot rows from ${mem.path} — index format may have changed.`);
    process.exit(2);
  }

  // --- build edges only between CONFIRMED-existing endpoints ---
  const newEdges = [];
  const skipped = [];
  for (const [galaxy, slot] of owners) {
    const galaxyNode = resolveGalaxyNode(galaxy, galaxyNodeIds);
    const slotNode = `ghost.chat_slot.${slot}`;
    if (!galaxyNode) {
      skipped.push({ galaxy, slot, reason: "galaxy domain node id not confirmed" });
      continue;
    }
    if (!slotNodeIds.has(slotNode)) {
      skipped.push({ galaxy, slot, reason: `slot node ${slotNode} not confirmed` });
      continue;
    }
    const edge = assertValidEdge({
      from: galaxyNode,
      to: slotNode,
      type: "owned-by-slot",
      kind: "owned-by-slot", // graph renderers read `kind`; schema reads `type`
      status: "active",
      intensity: 0.9,
      source: `galaxy-slot-canon:${path.basename(mem.path)}#galaxy-index`,
      confidence: 1.0, // operator-canonical soul assignment
      addedBy: ADDED_BY,
      addedAt: NOW,
    });
    newEdges.push(edge);
  }

  // --- domain-group -> slot inference edges (confidence 0.85) ---
  // De-dup against the canonical galaxy edges already emitted.
  const emittedKeys = new Set(newEdges.map(edgeKey));
  let inferredEmitted = 0;
  for (const [domainNode, slot] of Object.entries(DOMAIN_GROUP_TO_SLOT)) {
    if (!galaxyNodeIds.has(domainNode)) {
      skipped.push({ galaxy: domainNode, slot, reason: "domain-group node not confirmed (inference)" });
      continue;
    }
    const slotNode = `ghost.chat_slot.${slot}`;
    if (!slotNodeIds.has(slotNode)) {
      skipped.push({ galaxy: domainNode, slot, reason: `slot node ${slotNode} not confirmed (inference)` });
      continue;
    }
    const candidate = {
      from: domainNode,
      to: slotNode,
      type: "owned-by-slot",
      kind: "owned-by-slot",
      status: "active",
      intensity: 0.7,
      source: "domain-group-soul-inference:JULIETT-12CHAT+CHAT-SLOT-DOMAINS",
      confidence: 0.85, // inference, NOT operator-canonical — graded so downstream never treats as ground truth
      addedBy: ADDED_BY,
      addedAt: NOW,
    };
    if (emittedKeys.has(edgeKey(candidate))) continue; // already covered by a canonical galaxy edge
    assertValidEdge(candidate);
    emittedKeys.add(edgeKey(candidate));
    newEdges.push(candidate);
    inferredEmitted++;
  }

  // --- galaxy-roost nodes + owned-by-slot edges: lift coverage to ALL 34 galaxies ---
  // Each PSN galaxy becomes a first-class roost node (nested under the existing
  // ghost.galaxy_federation parent) linked to its soul-owning Hermes slot. This
  // covers the 27 meta/infra galaxies that have no eng.<name> domain node, so
  // EVERY galaxy is reachable from its slot. The roost is self-emitted -> its
  // `from` endpoint is guaranteed to exist; `to` (slot) is confirmed. All
  // computed server-side in this generator (zero model tokens).
  const newNodes = [];
  const roostNodeIds = new Set();
  let roostEdges = 0;
  for (const [galaxy, slot] of owners) {
    const slotNode = `ghost.chat_slot.${slot}`;
    if (!slotNodeIds.has(slotNode)) {
      skipped.push({ galaxy, slot, reason: `roost: slot node ${slotNode} not confirmed` });
      continue;
    }
    const roostId = `ghost.galaxy.${galaxy}`;
    if (!roostNodeIds.has(roostId)) {
      newNodes.push({
        id: roostId,
        label: `🌌 ${galaxy}`,
        layer: "L7",
        kind: "ghost-galaxy-roost",
        group: "galaxy_federation",
        status: "ghost",
        ghost: true,
        parent: "ghost.galaxy_federation",
        slot,
        info: `PSN galaxy '${galaxy}' — soul-owned by slot ${slot}. mcp-server/src/engines/${galaxy}/{CLAUDE,MEMORY}.md + wiki.`,
      });
      roostNodeIds.add(roostId);
    }
    const rEdge = {
      from: roostId,
      to: slotNode,
      type: "owned-by-slot",
      kind: "owned-by-slot",
      status: "active",
      intensity: 0.95,
      source: `galaxy-roost-slot-canon:${path.basename(mem.path)}#galaxy-index`,
      confidence: 1.0, // operator-canonical soul assignment (MEMORY.md galaxy index)
      addedBy: ADDED_BY,
      addedAt: NOW,
    };
    if (emittedKeys.has(edgeKey(rEdge))) continue;
    assertValidEdge(rEdge);
    emittedKeys.add(edgeKey(rEdge));
    newEdges.push(rEdge);
    roostEdges++;
  }

  // --- documented-by edges: connect each galaxy to the wiki/memory notes that
  //     document it (CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-DOCUMENTED-BY, slot:sierra).
  //     This is the system-viz <-> Obsidian/Wiki synergy edge. Targets are the
  //     CONFIRMED knowledge-note nodes folded into the live graph by:
  //       - memories-atomic-augmentation.json  -> memory_<kind>.<slug>
  //       - wiki-entries-augmentation.json      -> wiki.<section>.<slug>
  //     Sources are the self-emitted galaxy-roost nodes (always present) + the
  //     confirmed eng.<galaxy> domain node when one exists. Endpoint-confirmed,
  //     ADD-only, graded provenance — exactly like owned-by-slot above.
  const wikiAug = loadJsonOptional(path.join(VIZ_DIR, "wiki-entries-augmentation.json"));
  const memAug = loadJsonOptional(path.join(VIZ_DIR, "memories-atomic-augmentation.json"));
  const wikiNodeIds = new Set((wikiAug?.newNodes || []).map((n) => n.id).filter(Boolean));
  const memNodeIds = new Set((memAug?.newNodes || []).map((n) => n.id).filter(Boolean));
  // node-card OFFSET ORACLE (every merged-graph node id, ~336K). The two small
  // augmentations above ROTATE -- memories-atomic emits only a few recent notes --
  // so confirming knowledge notes against them ALONE silently dropped documented-by
  // to 0 when the `memory_patterns.<galaxy>_synthesis` nodes rotated out (the merge
  // is ADD-only, so they persist in the merged graph -> the oracle still has them).
  // Confirm against the oracle so the system-viz <-> Obsidian/Wiki synergy edge can
  // never silently collapse again. (U-XSUB-DOCBY-ORACLE, slot:sierra 2026-06-10.)
  // Loaded once here; the embeds pass below reuses graphNodeIds.
  const offsetOracle = loadJsonOptional(path.join(VIZ_DIR, "node-card-offsets.json"));
  const graphNodeIds =
    offsetOracle && offsetOracle.offsets && typeof offsetOracle.offsets === "object"
      ? new Set(Object.keys(offsetOracle.offsets))
      : null;
  const oracleNoteIds = graphNodeIds
    ? [...graphNodeIds].filter((id) => id.startsWith("memory_") || id.startsWith("wiki."))
    : [];
  const knowledgeNodeIds = new Set([...wikiNodeIds, ...memNodeIds, ...oracleNoteIds]);

  // slug -> note-node-id index for [[backlink]] resolution. A `[[ref]]` names the
  // final slug; the node id is `memory_<kind>.<slug>` (key = <slug>) or
  // `wiki.<section>.<slug>` (key = trailing <slug> segment). First-wins on the
  // rare cross-section slug collision.
  const noteBySlug = new Map();
  for (const id of knowledgeNodeIds) {
    const mm = id.match(/^memory_[a-z]+\.(.+)$/);
    if (mm && !noteBySlug.has(mm[1])) noteBySlug.set(mm[1], id);
    const ww = id.match(/^wiki\.[\w-]+\.(.+)$/);
    if (ww && !noteBySlug.has(ww[1])) noteBySlug.set(ww[1], id);
  }

  let docByEmitted = 0;
  const docByByConvention = { synthesis: 0, backlink: 0 };
  function emitDocumentedBy(fromNode, toNote, confidence, src) {
    const candidate = {
      from: fromNode,
      to: toNote,
      type: "documented-by",
      kind: "documented-by", // graph renderers read `kind`; schema reads `type`
      status: "active",
      intensity: confidence >= 1 ? 0.85 : 0.6,
      source: src,
      confidence, // 1.0 canonical (galaxy's own synthesis/backlink), graded otherwise
      addedBy: ADDED_BY,
      addedAt: NOW,
    };
    if (emittedKeys.has(edgeKey(candidate))) return false;
    assertValidEdge(candidate);
    emittedKeys.add(edgeKey(candidate));
    newEdges.push(candidate);
    docByEmitted++;
    return true;
  }

  for (const [galaxy, slot] of owners) {
    const roostId = `ghost.galaxy.${galaxy}`;
    const galaxyNode = resolveGalaxyNode(galaxy, galaxyNodeIds);
    const sourceNodes = [];
    if (roostNodeIds.has(roostId)) sourceNodes.push(roostId);
    if (galaxyNode) sourceNodes.push(galaxyNode);
    if (sourceNodes.length === 0) {
      skipped.push({ galaxy, slot, reason: "documented-by: no confirmed source node (roost/domain)" });
      continue;
    }

    // Convention B — the galaxy's own per-domain synthesis memory (1:1 by name).
    // Confirmed against the oracle-aware knowledgeNodeIds (not the volatile
    // memories-atomic augmentation) so a rotated-out synthesis node still links.
    const synthId = `memory_patterns.${galaxy}_synthesis`;
    if (knowledgeNodeIds.has(synthId)) {
      for (const s of sourceNodes) {
        if (emitDocumentedBy(s, synthId, 1.0, `galaxy-synthesis-memory:${galaxy}_synthesis`)) docByByConvention.synthesis++;
      }
    }

    // Convention C — [[backlinks]] in the galaxy's own MEMORY.md that resolve to a
    // confirmed knowledge-note node. Anchored on the roost (galaxy-level). Bounded
    // by the confirmed-node set; every unresolved ref is silently skipped (R12).
    const galMemText = loadFileOptional(path.join(ROOT, "mcp-server/src/engines", galaxy, "MEMORY.md"));
    if (galMemText) {
      const anchor = roostNodeIds.has(roostId) ? roostId : sourceNodes[0];
      const refs = new Set();
      for (const bm of galMemText.matchAll(/\[\[([^\]|#]+)/g)) refs.add(bm[1].trim());
      for (const ref of refs) {
        // A backlink may be a bare slug (`[[nn-graph-ms0]]`) or section-pathed
        // (`[[architecture/nn-graph-ms0]]`). noteBySlug is keyed by the trailing
        // segment, so fall back to the post-`/` slug for the pathed form (else
        // every `section/slug` backlink would be structurally unresolvable).
        const noteId = noteBySlug.get(ref) ?? (ref.includes("/") ? noteBySlug.get(ref.split("/").pop()) : undefined);
        if (!noteId) continue; // only confirmed targets — no dangling edges
        if (noteId === anchor) continue; // never a self-loop (schema rejects anyway)
        if (emitDocumentedBy(anchor, noteId, 0.9, `galaxy-memory-backlink:${galaxy}/MEMORY.md`)) docByByConvention.backlink++;
      }
    }
  }

  // --- embeds edges: connect a graph node to the embedding pool that represents
  //     it (CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-EMBEDS, slot:sierra). This is the
  //     system-viz <-> PRISM-AI / NN / GNN / RAG synergy edge: it surfaces WHICH
  //     graph nodes the local nomic-embed 768d pools have embedded, so "is this
  //     node in the GNN/RAG embedding pool" becomes a first-class, traversable
  //     graph relationship -- the AI-substrate footprint, discoverable from the
  //     canonical search graph. The embedding's EXISTENCE is a fact (we hold the
  //     768d vector) -> confidence 1.0; that is distinct from the GNN's PREDICTION
  //     quality, which is AUROC-gated elsewhere and never read off this edge.
  //
  //     `from` endpoints are arbitrary graph nodes (engines/registries/ghosts), so
  //     they are confirmed against the node-card OFFSET ORACLE (every merged-graph
  //     node id, ~336K keys) -- NOT the small augmentations, and NOT a 548MB graph
  //     load (sierra soul: never parse the full graph). The oracle is a local build
  //     input (gitignored); if absent the pass degrades to 0 edges with a loud note
  //     (owned-by-slot / documented-by are unaffected). `to` roosts are self-emitted
  //     so an embeds edge can never dangle.
  const EMBED_SOURCES = [
    {
      file: "state/shared/nn-graph/node-embeddings-768d.jsonl",
      idField: "n",
      roostId: "ghost.embedding_index.gnn768",
      label: "GNN 768d ref-pool",
      desc: "graph nodes embedded into the nomic-embed 768d GNN reference pool (state/shared/nn-graph/node-embeddings-768d.jsonl). embeds-edge source.",
    },
    {
      file: "state/shared/nn-graph/ghost-node-embeddings.jsonl",
      idField: "id",
      roostId: "ghost.embedding_index.ghosts768",
      label: "Ghost 768d pool",
      desc: "ghost/unwired nodes embedded into the nomic-embed 768d ghost candidate pool (state/shared/nn-graph/ghost-node-embeddings.jsonl). embeds-edge source.",
    },
  ];
  // graphNodeIds (node-card offset oracle) was loaded once above for documented-by;
  // reuse it here so embeds `from` endpoints are confirmed against the merged graph.
  const embedFromIds = new Set();
  const embedStats = { oracleLoaded: !!graphNodeIds, oracleNodeCount: graphNodeIds ? graphNodeIds.size : 0, sources: {} };
  let embedsEmitted = 0;
  if (!graphNodeIds) {
    console.error(
      "WARN: node-card-offsets.json oracle absent -> embeds pass emits 0 edges (owned-by-slot / documented-by unaffected). Build via scripts/build-card-offset-index.mjs.",
    );
  } else {
    // nest the embedding-index roosts under the existing GNN bridge roost when it is
    // in the graph, else under planned_features, else top-level (parent omitted).
    const embedParent = graphNodeIds.has("ghost.gnn_embed_bridge")
      ? "ghost.gnn_embed_bridge"
      : graphNodeIds.has("ghost.planned_features")
        ? "ghost.planned_features"
        : undefined;
    for (const src of EMBED_SOURCES) {
      const text = loadFileOptional(path.join(ROOT, src.file));
      const sstat = { present: !!text, records: 0, confirmed: 0, skippedUnconfirmed: 0 };
      embedStats.sources[src.roostId] = sstat;
      if (!text) {
        skipped.push({ galaxy: src.roostId, slot: "-", reason: `embeds: source ${src.file} absent` });
        continue;
      }
      // self-emit the embedding-index roost so the `to` endpoint always exists
      if (!roostNodeIds.has(src.roostId)) {
        newNodes.push({
          id: src.roostId,
          label: src.label,
          layer: "L8",
          kind: "ghost-embedding-index",
          group: "gnn_embed",
          status: "ghost",
          ghost: true,
          ...(embedParent ? { parent: embedParent } : {}),
          info: src.desc,
        });
        roostNodeIds.add(src.roostId);
      }
      for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        let rec;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        if (!rec || rec.__meta) continue; // skip the meta header line
        sstat.records++;
        const nodeId = rec[src.idField];
        if (typeof nodeId !== "string" || !nodeId) {
          sstat.skippedUnconfirmed++;
          continue;
        }
        if (!graphNodeIds.has(nodeId)) {
          sstat.skippedUnconfirmed++; // embedded node not in the merged graph -> would dangle
          continue;
        }
        if (nodeId === src.roostId) {
          sstat.skippedUnconfirmed++;
          continue;
        }
        const candidate = {
          from: nodeId,
          to: src.roostId,
          type: "embeds",
          kind: "embeds", // graph renderers read `kind`; schema reads `type`
          status: "active",
          intensity: 0.5,
          // stable provenance: the oracle node-count lives in stats.embed.oracleNodeCount,
          // NOT baked into every edge's source (that churned the string each regen -- P2,
          // reviewer A). Names the pool so the edge is self-describing + diff-stable.
          source: `gnn768-embedding:${path.basename(src.file)}`,
          confidence: 1.0, // the embedding vector demonstrably exists (a fact, not a prediction)
          addedBy: ADDED_BY,
          addedAt: NOW,
        };
        if (emittedKeys.has(edgeKey(candidate))) continue;
        assertValidEdge(candidate);
        emittedKeys.add(edgeKey(candidate));
        newEdges.push(candidate);
        embedFromIds.add(nodeId);
        sstat.confirmed++;
        embedsEmitted++;
      }
    }
  }

  // --- consensus-of edges: link a galaxy/decision node to the multi-model octopus
  //     consensus record for its domain (CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-CONSENSUS-OF,
  //     slot:sierra). octopus is a HYBRID multi-model AI (the goal's "hybrids"), so this
  //     surfaces "does this domain have a multi-model consensus record, at what
  //     confidence" directly from the galaxy node. This WIRES the 4th + final typed
  //     cross-substrate edge type; it materializes 1 edge today (only hermes-zulu has run
  //     a consensus) and AUTO-SCALES -- every domain that gains an outcomes jsonl links on
  //     the next regen with zero code change. NOT a claim that the spine is "done" -- it
  //     is the mechanism, wired ahead of producer growth (R13/R15 build-it-whole).
  //
  //     `from` = the galaxy's self-emitted roost `ghost.galaxy.<domain>`. `to` =
  //     `ghost.octopus_consensus.<domain>` (emitted by octopus-consensus-augmentation;
  //     confirmed via the oracle). confidence = the LATEST CONFIDENCE-BEARING outcome's
  //     confidence -- heartbeat/`ok` records carry no numeric confidence and are skipped;
  //     when the chosen record is NOT the newest line, stats.consensus.detail records
  //     fromLatestRecord:false so a stale-confidence edge is visible, never silently sold
  //     as current. GRADED (a 0.5-confidence consensus must never read as ground truth).
  //     ADD-only, endpoint-confirmed, never-dangle.
  const OCTOPUS_DIR = path.join(ROOT, "state/shared/octopus-outcomes");
  const consensusToIds = new Set();
  const consensusStats = { domainsScanned: 0, linked: 0, skipped: 0, detail: [] };
  let consensusOfEmitted = 0;
  // narrow try: a dir-scan fault must not break the other 3 passes, but a malformed
  // edge below MUST fail loud (assertValidEdge throws uncaught -- parity with embeds).
  let octopusFiles = [];
  try {
    octopusFiles = fs.existsSync(OCTOPUS_DIR)
      ? fs.readdirSync(OCTOPUS_DIR).filter((f) => f.endsWith(".jsonl"))
      : [];
  } catch {
    octopusFiles = [];
  }
  for (const f of octopusFiles) {
    consensusStats.domainsScanned++;
    const domain = f.replace(/\.jsonl$/, "");
    const consensusNode = `ghost.octopus_consensus.${domain}`;
    const galaxyRoost = `ghost.galaxy.${domain}`;
    const toOk = graphNodeIds ? graphNodeIds.has(consensusNode) : false;
    const fromOk = roostNodeIds.has(galaxyRoost);
    if (!toOk || !fromOk) {
      consensusStats.skipped++;
      skipped.push({ galaxy: domain, slot: "-", reason: `consensus-of: ${!fromOk ? "no galaxy roost" : "octopus node not in merged graph"}` });
      continue;
    }
    // confidence = latest confidence-BEARING outcome (skip heartbeat/no-confidence lines);
    // capture `at` + whether it was the newest line so a stale value is never hidden.
    let conf = 0.5;
    let confAt = null;
    let fromLatestRecord = false;
    try {
      const lines = fs.readFileSync(path.join(OCTOPUS_DIR, f), "utf8").split(/\r?\n/).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        let r;
        try { r = JSON.parse(lines[i]); } catch { continue; }
        if (r && typeof r.confidence === "number" && !Number.isNaN(r.confidence)) {
          conf = Math.max(0, Math.min(1, r.confidence));
          confAt = typeof r.at === "string" ? r.at : null;
          fromLatestRecord = i === lines.length - 1;
          break;
        }
      }
    } catch {
      /* unreadable ledger -- keep the neutral default 0.5 */
    }
    const candidate = {
      from: galaxyRoost,
      to: consensusNode,
      type: "consensus-of",
      kind: "consensus-of",
      status: "active",
      intensity: 0.6,
      source: `octopus-consensus:${f}`, // stable -- freshness/at lives in stats.consensus.detail
      confidence: conf, // graded -- the domain's multi-model consensus confidence, NOT 1.0
      addedBy: ADDED_BY,
      addedAt: NOW,
    };
    if (emittedKeys.has(edgeKey(candidate))) continue;
    assertValidEdge(candidate);
    emittedKeys.add(edgeKey(candidate));
    newEdges.push(candidate);
    consensusToIds.add(consensusNode);
    consensusStats.linked++;
    consensusStats.detail.push({ domain, confidence: conf, at: confAt, fromLatestRecord });
    consensusOfEmitted++;
  }

  // invariant: every emitted edge endpoint is a confirmed node OR a self-emitted roost.
  // embedFromIds = oracle-confirmed embeds `from`; consensusToIds = oracle-confirmed
  // octopus-consensus `to` nodes.
  const knownNodeIds = new Set([
    ...slotNodeIds, ...galaxyNodeIds, ...roostNodeIds, ...knowledgeNodeIds, ...embedFromIds, ...consensusToIds,
  ]);
  const dangling = newEdges.filter((e) => !knownNodeIds.has(e.from) || !knownNodeIds.has(e.to));
  if (dangling.length) {
    console.error(`FATAL: ${dangling.length} edge(s) reference an unconfirmed node (e.g. ${JSON.stringify(dangling[0])})`);
    process.exit(2);
  }

  // belt-and-suspenders: re-validate the whole batch + dedup
  const batch = validateEdgeBatch(newEdges);
  if (!batch.valid) {
    console.error("FATAL: batch validation failed:", JSON.stringify(batch.errors).slice(0, 500));
    process.exit(2);
  }

  const out = {
    schemaVersion: "1.0.0",
    edgeSchemaVersion: SCHEMA_VERSION,
    generatedAt: NOW,
    generator: "scripts/generate-cross-substrate-edges.mjs",
    source: {
      memoryIndex: mem.path,
      slotNodes: "chat-slot-nodes-augmentation.json",
      galaxyNodes: "galaxy-constituents-augmentation.json",
    },
    newNodes, // galaxy-roost nodes (one per galaxy) — slot-linked, full 34 coverage
    newEdges: batch.validEdges,
    stats: {
      galaxyOwnersParsed: owners.size,
      slotNodesConfirmed: slotNodeIds.size,
      galaxyNodesConfirmed: galaxyNodeIds.size,
      newNodesEmitted: newNodes.length,
      edgesEmitted: batch.validEdges.length,
      canonicalEdges: batch.validEdges.filter((e) => e.confidence === 1.0).length,
      inferredEdges: inferredEmitted,
      roostEdges,
      duplicatesCollapsed: batch.duplicates.length,
      skipped: skipped.length,
      skippedDetail: skipped,
      documentedByEdges: docByEmitted,
      documentedByByConvention: docByByConvention,
      embedsEdges: embedsEmitted,
      embed: embedStats,
      consensusOfEdges: consensusOfEmitted,
      consensus: consensusStats,
      edgeTypes: batch.validEdges.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {}),
    },
  };

  // --- DRIFT DETECTION (U-XSUB-DRIFT-DETECT, slot:sierra): flag a silent edge-type
  //     COLLAPSE (the documented-by 320->0 class) vs the last-known-good baseline so
  //     the spine SELF-MONITORS -- a collapse trips a loud signal on the run it happens
  //     instead of going unnoticed for hours. Baseline tracks reality (updated each
  //     real write); a sharp drop vs the PREVIOUS run is the alert.
  const BASELINE_PATH = path.join(VIZ_DIR, ".cross-substrate-edge-baseline.json");
  const prevBaseline = loadJsonOptional(BASELINE_PATH);
  out.drift = detectEdgeDrift(prevBaseline && prevBaseline.edgeTypes, out.stats.edgeTypes);
  if (out.drift.detected) {
    for (const ev of out.drift.events) {
      console.error(
        `DRIFT: cross-substrate ${ev.type} ${ev.baseline} -> ${ev.current} (${ev.severity}, ${Math.round(ev.dropPct * 100)}% drop) -- a silent edge-type collapse like documented-by; check its source/confirmation.`,
      );
    }
  }

  if (argv.has("--json")) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return out;
  }

  const ownedBySlot = out.stats.edgeTypes["owned-by-slot"] || 0;
  const documentedBy = out.stats.edgeTypes["documented-by"] || 0;
  // owned-by-slot = eng-canon + domain-infer + galaxy-roost; back out eng-canon
  // from that composition (NOT from the global canonicalEdges, which now also
  // counts documented-by@1.0 synthesis edges).
  const engCanon = ownedBySlot - out.stats.inferredEdges - out.stats.roostEdges;
  console.log(`cross-substrate: ${out.stats.edgesEmitted} edges across ${Object.keys(out.stats.edgeTypes).length} types, ${out.stats.newNodesEmitted} galaxy-roost nodes, ${out.stats.skipped} skipped`);
  console.log(`  owned-by-slot:  ${ownedBySlot} (${engCanon} eng-canon@1.0 + ${out.stats.inferredEdges} domain-infer@0.85 + ${out.stats.roostEdges} galaxy-roost@1.0)`);
  console.log(`  documented-by:  ${documentedBy} (${out.stats.documentedByByConvention.synthesis} galaxy-synthesis@1.0 + ${out.stats.documentedByByConvention.backlink} memory-backlink@0.9)`);
  const embedsCount = out.stats.edgeTypes["embeds"] || 0;
  console.log(`  embeds:         ${embedsCount} (nomic-768d footprint; oracle ${embedStats.oracleLoaded ? embedStats.oracleNodeCount + " nodes" : "ABSENT -> 0 edges"})`);
  const consensusCount = out.stats.edgeTypes["consensus-of"] || 0;
  console.log(`  consensus-of:   ${consensusCount} (octopus multi-model consensus; ${consensusStats.linked}/${consensusStats.domainsScanned} domains linked, ${consensusStats.skipped} skipped)`);
  console.log(`  drift:          ${out.drift.detected ? out.drift.events.length + " EVENT(S) -- see DRIFT warnings above" : (out.drift.reason === "no-baseline" ? "baseline established (first run)" : "none vs baseline")}`);
  if (skipped.length) {
    console.log("skipped (unresolved endpoints):");
    for (const s of skipped) console.log(`  - ${s.galaxy} -> ${s.slot}: ${s.reason}`);
  }
  // sanity: every emitted key unique
  const keys = new Set(batch.validEdges.map(edgeKey));
  console.log(`unique edge keys: ${keys.size}/${batch.validEdges.length}`);

  if (argv.has("--dry")) {
    console.log("--dry: not written");
    return out;
  }
  // compact JSON (never null,2 in the graph path — single-writer / size discipline)
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
  // persist the new baseline (tracks reality) + append any drift event to the health
  // log -- best-effort, never fail the artifact write on the health sidecar.
  try {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({ edgeTypes: out.stats.edgeTypes, generatedAt: NOW }));
    if (out.drift.detected) {
      const DRIFT_LOG = path.join(VIZ_DIR, "cross-substrate-drift.json");
      const driftLog = loadJsonOptional(DRIFT_LOG) || { events: [] };
      driftLog.events.push({ at: NOW, events: out.drift.events });
      driftLog.events = driftLog.events.slice(-50);
      fs.writeFileSync(DRIFT_LOG, JSON.stringify(driftLog));
    }
  } catch {
    /* health sidecar is best-effort */
  }
  return out;
}

main();
