#!/usr/bin/env node
/**
 * generate-milling-extracted-pdf-bridge.mjs — bridges the 68 extracted
 * milling PDF wiki entries (whiskey slot output) to peer-echo's L10
 * jm-die-tribal-wiki-corpus nodes via /system-viz augmentation.
 *
 * Source: H:/prism-slot-whiskey/state/shared/extracted-pdfs/whiskey-milling-oop-*.jsonl
 *         (one row per extraction run; each carries slug, page_count, heading_count)
 *
 * Emits L11 "extracted-pages" child nodes under each matched L10 PDF node,
 * plus a "consumed-by" edge to KnowledgeCurriculumBridgeEngine — closing
 * the goal-mandated wire/bridge/synergize loop between extraction outputs
 * and the AI-system retrieval surface.
 *
 * @milestone MILL-PDF-CORPUS-MS0/U-EXTRACTED-PDF-PSN-BRIDGE
 * @slot foxtrot
 * @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SCHEMA_VERSION = "1.0.0";
const ROOST_ID = "ghost.jm_die_tribal_wiki_corpus";
// Canonical graph node ids for the downstream AI-retrieval engines the extracted
// pages feed. VERIFIED via `system-viz-query find` (2026-06-23): the graph uses
// `eng.<domain>.<lowercasename>engine`, NOT `engine.<PascalCase>` -- the orphan's
// original ids dangled (no such node), so the consumed-by/feeds-wizard edges
// connected to nothing. (VIZ-XGAL-MILL-PDF-WIRE, R12 prove-the-target-exists)
const CURRICULUM_ENGINE_ID = "eng.knowledge.knowledgecurriculumbridgeengine";
const MILL_FACADE_ENGINE_ID = "eng.mill.millmasterorchestratorfacadeengine";
const PEER_AUG_PATH = path.join(ROOT, "state/shared/system-viz/jm-die-tribal-wiki-augmentation.json");
const WHISKEY_LEDGER_DIR = "H:/prism-slot-whiskey/state/shared/extracted-pdfs";
const OUT_PATH = path.join(ROOT, "state/shared/system-viz/milling-extracted-pdf-bridge-augmentation.json");

function safeSlug(raw) {
  return String(raw || "x").toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "").slice(0, 60) || "x";
}

function loadJsonlExtractions(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = new Map(); // slug -> latest extraction
  for (const f of fs.readdirSync(dir)) {
    if (!f.startsWith("whiskey-milling-") || !f.endsWith(".jsonl")) continue;
    const lines = fs.readFileSync(path.join(dir, f), "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const r = JSON.parse(line);
        if (!r || !r.pdf_path) continue;
        // Derive slug from PDF basename using the same safeSlug peer uses.
        const base = path.basename(r.pdf_path).replace(/\.pdf$/i, "");
        const slug = safeSlug(base);
        const prev = out.get(slug) || { slug, rows: 0, pages: 0, title: r.title || slug, pdf_path: r.pdf_path };
        prev.rows += 1;
        prev.pages = Math.max(prev.pages, Number(r.pages_extracted) || 0);
        out.set(slug, prev);
      } catch { /* skip bad lines */ }
    }
  }
  return [...out.values()];
}

function generate(extractions, peerNodes) {
  const peerById = new Map(peerNodes.map(n => [n.id, n]));
  const newNodes = [];
  const newEdges = [];
  // unmatchedSlugs: the extraction slugs with NO parent in the peer tribal-wiki corpus. These are
  // genuinely-absent documents (vendor catalogs not yet in echo's corpus), NOT a bridge bug -- so
  // surface them as an INSPECTABLE list (the actionable lever is corpus ingestion by echo, who owns
  // the jm_die_tribal_wiki corpus). Turns "39 silently dropped" into a tracked gap. (VIZ-XGAL-MILL-PDF)
  const stats = { extractions_total: extractions.length, bridged: 0, unmatched: 0, unmatchedSlugs: [] };

  for (const ex of extractions) {
    const candidates = [
      `${ROOST_ID}.mill.${ex.slug}`,
      `${ROOST_ID}.cam.${ex.slug}`,
      `${ROOST_ID}.reference.${ex.slug}`,
      `${ROOST_ID}.post.${ex.slug}`,
      `${ROOST_ID}.cad.${ex.slug}`,
      `${ROOST_ID}.lathe.${ex.slug}`,
    ];
    const parentId = candidates.find(id => peerById.has(id));
    if (!parentId) { stats.unmatched++; stats.unmatchedSlugs.push(ex.slug); continue; }

    const extractedNodeId = `${parentId}.extracted`;
    newNodes.push({
      id: extractedNodeId,
      label: `Extracted: ${ex.rows} rows / ${ex.pages}p`,
      info: `slug=${ex.slug}; pages_max=${ex.pages}; rows=${ex.rows}; ledger=whiskey-milling-oop`,
      layer: "L11",
      parent: parentId,
      kind: "extracted-pages",
      slug: ex.slug,
      pages: ex.pages,
      rows: ex.rows,
      confidence: 0.3,
      needs_curation: true,
    });
    newEdges.push({ from: parentId, to: extractedNodeId, kind: "page-extracts" });
    newEdges.push({ from: extractedNodeId, to: CURRICULUM_ENGINE_ID, kind: "consumed-by" });
    newEdges.push({ from: extractedNodeId, to: MILL_FACADE_ENGINE_ID, kind: "feeds-wizard" });
    stats.bridged++;
  }

  stats.unmatchedSlugs.sort(); // deterministic output (extractions arrive in Map-insertion order)
  return { newNodes, newEdges, stats };
}

function loadPeerAug(p) {
  // Fail-soft: a missing/corrupt peer augmentation must NOT crash the regen
  // pipeline (this generator runs as a FAST[] subprocess; an unguarded
  // JSON.parse would abort the whole ~3-min regen). Empty peer corpus -> 0
  // bridged nodes, which the merge splice tolerates. (VIZ-XGAL-MILL-PDF-WIRE)
  if (!fs.existsSync(p)) {
    console.warn(`[extracted-bridge] peer aug ${path.basename(p)} absent; 0 bridged nodes`);
    return { newNodes: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.warn(`[extracted-bridge] peer aug ${path.basename(p)} unreadable (${e.message}); 0 bridged nodes`);
    return { newNodes: [] };
  }
}

function main() {
  const peerAug = loadPeerAug(PEER_AUG_PATH);
  const extractions = loadJsonlExtractions(WHISKEY_LEDGER_DIR);
  const { newNodes, newEdges, stats } = generate(extractions, peerAug.newNodes || []);
  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "scripts/generate-milling-extracted-pdf-bridge.mjs",
    parentAugmentation: "jm-die-tribal-wiki-augmentation.json",
    extractionLedger: "H:/prism-slot-whiskey/state/shared/extracted-pdfs/whiskey-milling-oop-*.jsonl",
    newNodes,
    newEdges,
    stats,
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log(`[extracted-bridge] ${stats.bridged}/${stats.extractions_total} extractions bridged -> ${OUT_PATH}`);
  console.log(`[extracted-bridge] new L11 nodes: ${newNodes.length}, new edges: ${newEdges.length}`);
  if (stats.unmatched > 0) console.log(`[extracted-bridge] ${stats.unmatched} unmatched (slug not in peer corpus)`);
}

// Pure helpers exported for unit tests (the isMain guard below keeps the FAST[]
// spawn behavior unchanged -- importing this module does NOT run main()).
export const __test = {
  loadPeerAug,
  loadJsonlExtractions,
  generate,
  safeSlug,
  CURRICULUM_ENGINE_ID,
  MILL_FACADE_ENGINE_ID,
  ROOST_ID,
};

// Run main() when invoked as a subprocess (the FAST[] runner spawns each
// generator via spawnSync). Matches the sibling generator idiom (R11); a
// dynamic import does NOT auto-run.
const isMain = (() => {
  try {
    return process.argv[1]
      && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) main();
