#!/usr/bin/env node
/**
 * generate-post-pdf-corpus-features.mjs — system-viz augmentation: post-processor-writing PDF corpus.
 *
 * Operator request 2026-05-26: "there's a pdf for post processor writing in
 * the resources folder. make a node for all data contained in it and link
 * and bridge it to the post processor nodes."
 *
 * The graph already had GHOST L10 placeholder nodes:
 *   - resource_pdfs_post_processor_training_guide_pdf       (Autodesk, 12 ch / 8.2MB)
 *   - resource_pdfs_post_processor_documentation_2021_02_04_pdf  (Postability UPK, 43KB)
 * but no extracted content + no edges to PRISM's 16 post-processor engines.
 *
 * This script:
 *  1. Reads the two `pdftotext -layout` extracts at
 *       state/shared/pdf-extracts/post-writing/post-training-guide.txt
 *       state/shared/pdf-extracts/post-writing/post-documentation-2021.txt
 *  2. Parses each into chapter→section structure via `post-pdf-corpus-parser.mjs`.
 *  3. Writes one JSONL per PDF into the canonical
 *       `mcp-server/data/ingestion_cache/extracted-pdfs/` directory
 *     so the existing `generate-extracted-pdf-tips-features.mjs` consumer
 *     picks them up as L10 tribal-tip nodes on the next regen pass.
 *  4. Emits a dedicated system-viz augmentation
 *       state/shared/system-viz/post-pdf-corpus-augmentation.json
 *     containing:
 *      - parent roost   `ghost.post_writing_corpus`            (L8 ghost-roost, parent ghost.planned_features)
 *      - one book pivot `ghost.post_writing_corpus.<book-slug>` (L9 ghost-roost)
 *      - one chapter pivot per chapter                          (L10 ghost-roost)
 *      - bridge edges from each book pivot to **16 PRISM post-processor engines**
 *        (kind: "bridge-pdf-engine", semantic: "documents")
 *
 * Idempotency: merge-augmentations.mjs is the authoritative dedupe — re-running
 * is byte-stable (same input → same output).
 *
 * @milestone POST-PDF-NODE-MS0/U-POST-PDF-CORPUS-NODE
 * @slot echo
 * @iter 5
 * @date 2026-05-26
 *
 * Usage:  node scripts/generate-post-pdf-corpus-features.mjs
 * Exit:   0 ok · 1 extracts missing · 2 runtime error
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePostPdfCorpus, corpusToJsonl } from "./lib/post-pdf-corpus-parser.mjs";
import { makeOracleResolver } from "./lib/class-name-node-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.post_writing_corpus";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const PIVOT_LAYER = "L9";
export const CHAPTER_LAYER = "L10";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

const EXTRACT_DIR = path.join(ROOT, "state/shared/pdf-extracts/post-writing");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const JSONL_OUT_DIR = path.join(ROOT, "mcp-server/data/ingestion_cache/extracted-pdfs");
const OUT_PATH = path.join(VIZ_DIR, "post-pdf-corpus-augmentation.json");

/**
 * The 16 PRISM post-processor engine class names this corpus documents.
 * Bridge edges connect the book pivot → each engine node (matched by basename
 * in merge-augmentations.mjs / system-graph at engine resolution time).
 *
 * NOTE — PostProcessorUnificationEngine is INTENTIONALLY EXCLUDED. Per
 * HANDOFF-claude-3350c663-india-post-wire it ships a Math.random() stub; the
 * documentation cannot bridge to a placeholder.
 */
export const POST_ENGINE_TARGETS = [
  "MasterPostProcessorEngine",
  "MasterPostProcessorUnifiedAGIEngine",
  "MasterPostProcessorAGIOrchestrationEngine",
  "MasterPostProcessorGeniusEngine",
  "MasterPostFineTuningEngine",
  "HurcoV11MillMasterPostEngine",
  "OkumaOSPMillMasterPostEngine",
  "LatheMasterPostSelfAwarenessEngine",
  "LathePostProcessorEngine",
  "PostProcessorPipelineEngine",
  "PostProcessorGeneratorEngine",
  "PostProcessorFeedOptimizerEngine",
  "PostProcessorPhysicsAwareGeneratorEngine",
  "PostProcessorDeepLearningEngine",
  "PostProcessorMetaLearningEngine",
  "AdvancedPostProcessorEngine",
  "PostProcessorUnifiedPhysicsOrchestrationEngine",
  "PostVerificationSafetyEngine",
];

/**
 * Cross-domain coordination targets (user directive 2026-05-26 — *"whiskey,
 * lima, mike and foxtrot are all doing the same thing for their domain so
 * coordinate with them. you should be able to use their data and their
 * extractions for your domain"*).
 *
 * Each entry is a peer-shipped substrate node that our book pivots edge into:
 *  - cad-cam-resources-pdf-index   — kilo's 1008-PDF manifest (commit 67178f76d6).
 *                                    Our 2 PDFs are entries in his `domain:"training"`,
 *                                    software:"misc" bucket.
 *  - milling-pdf-corpus            — foxtrot's milling-PDF tribal-cited-tips corpus
 *                                    (commit 057136e9a6, U-FOXTROT-LIMA-CROSSOVER).
 *  - KnowledgeCurriculumBridgeEngine — foxtrot's bridge engine surfacing cited
 *                                    PDF wisdom into /mill-studio runs; mirrors
 *                                    what post-pdf citations should surface into
 *                                    /post-studio.
 */
export const CROSS_DOMAIN_PEERS = [
  {
    id: "cad-cam-resources-pdf-index",
    kind: "bridge-pdf-corpus-coordination",
    semantic: "subset-of",
    label: "subset of · kilo's 1008-PDF resources index",
  },
  {
    id: "milling-pdf-corpus",
    kind: "bridge-pdf-corpus-coordination",
    semantic: "follows-citation-pattern",
    label: "follows citation pattern · foxtrot milling tips",
  },
  {
    id: "KnowledgeCurriculumBridgeEngine",
    kind: "bridge-pdf-corpus-coordination",
    semantic: "uses-bridge-pattern",
    label: "uses bridge pattern · foxtrot curriculum-bridge",
  },
];

/**
 * The two PDFs this augmentation consumes. `bookId` is the namespace inside
 * `parsed.bookId` from the parser; `slug` is the on-disk JSONL filename stem;
 * `engines` overrides POST_ENGINE_TARGETS when a particular doc only documents
 * a subset (Postability is mill-turn-rotary focused — narrower bridge set).
 */
export const PDF_SOURCES = [
  {
    bookId: "autodesk-post-training",
    slug: "autodesk-post-training-guide",
    book: "Post Processor Training Guide (Autodesk Fusion/Inventor CAM/HSMWorks)",
    extractFile: "post-training-guide.txt",
    pdfPath: "resources/RESOURCE PDFS/Post Processor Training Guide.pdf",
    engines: POST_ENGINE_TARGETS, // canonical — covers every PRISM post engine
  },
  {
    bookId: "postability-upk-2021",
    slug: "postability-upk-documentation-2021",
    book: "Postability Post Processor Documentation (UPK, 2021-02-04)",
    extractFile: "post-documentation-2021.txt",
    pdfPath: "resources/RESOURCE PDFS/Post+Processor+Documentation+-+2021-02-04.pdf",
    engines: [
      // Narrower bridge — Postability is mill-turn + rotary-specific
      "MasterPostProcessorEngine",
      "MasterPostProcessorUnifiedAGIEngine",
      "MasterPostFineTuningEngine",
      "LatheMasterPostSelfAwarenessEngine",
      "LathePostProcessorEngine",
      "OkumaOSPMillMasterPostEngine",
      "PostProcessorPipelineEngine",
      "PostProcessorGeneratorEngine",
    ],
  },
];

/** Pure: filesystem-safe node-id slug. Matches the convention used by other generators. */
export function safeSlug(raw) {
  return String(raw || "x")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 60) || "x";
}

/**
 * Pure: from a parsed corpus + source-metadata, build:
 *   newNodes: roost? + book pivot + chapter pivots
 *   newEdges: book-pivot → engine bridge edges (one per engine in `engines`)
 *
 * Caller passes the union of all parsed corpora so the roost is emitted once.
 */
export function generate(parsedCorpora, sources, existingNodeIds = [], resolver = null) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  let roostEmitted = 0;

  const totalChapters = parsedCorpora.reduce((a, p) => a + p.summary.chapters, 0);
  const totalSections = parsedCorpora.reduce((a, p) => a + p.summary.sections, 0);

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `Post-writing corpus (${parsedCorpora.length} PDFs, ${totalChapters} ch, ${totalSections} §)`.slice(0, MAX_LABEL),
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `Canonical post-processor-writing reference corpus. ${totalChapters} chapters across ${parsedCorpora.length} source PDFs; ${totalSections} sections total. Bridged to ${POST_ENGINE_TARGETS.length} PRISM post engines.`.slice(0, MAX_INFO),
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  let pivotsEmitted = 0;
  let chaptersEmitted = 0;
  let edgesEmitted = 0;
  let bridgesResolved = 0, bridgesDropped = 0;

  for (let i = 0; i < parsedCorpora.length; i++) {
    const parsed = parsedCorpora[i];
    const src = sources[i];
    const pivotId = `${ROOST_ID}.${safeSlug(src.slug)}`;

    if (!ids.has(pivotId)) {
      newNodes.push({
        id: pivotId,
        label: `📘 ${src.book}`.slice(0, MAX_LABEL),
        layer: PIVOT_LAYER,
        ghost: true,
        status: "ghost",
        kind: "ghost-roost",
        parent: ROOST_ID,
        info: `${parsed.summary.chapters} chapters / ${parsed.summary.sections} sections / ${parsed.summary.lines} lines · source: ${src.pdfPath}`.slice(0, MAX_INFO),
      });
      ids.add(pivotId);
      pivotsEmitted++;
    }

    for (const ch of parsed.chapters) {
      const chId = `${pivotId}.ch${safeSlug(ch.num + "-" + ch.title)}`;
      if (!ids.has(chId)) {
        newNodes.push({
          id: chId,
          label: `Ch${ch.num} · ${ch.title}`.slice(0, MAX_LABEL),
          layer: CHAPTER_LAYER,
          ghost: true,
          status: "ghost",
          kind: "ghost-roost",
          parent: pivotId,
          info: `${ch.sections.length} sections. Lines ${ch.startLine}+ in ${src.extractFile}.`.slice(0, MAX_INFO),
        });
        ids.add(chId);
        chaptersEmitted++;
      }
    }

    // Bridge edges: book pivot → each PRISM post engine
    for (const engine of src.engines) {
      // U-VIZ-ROOST-BRIDGE-RESOLVE: resolve the bare engine CLASS NAME to its live node-id at
      // generation time so the augmentation never carries a dangler (class-name-node-resolver.mjs).
      // No resolver -> bare name (back-compat). The cross-domain-peer edges below already use node-ids.
      let to = engine;
      if (resolver) {
        to = resolver.resolve(engine, resolver.idSet);
        if (!to) { bridgesDropped++; continue; } // genuinely un-graphed engine -> drop, never a dangler
        if (to !== engine) bridgesResolved++;
      }
      newEdges.push({
        from: pivotId,
        to,
        kind: "bridge-pdf-engine",
        semantic: "documents",
        label: `documents · ${src.book.split("(")[0].trim()}`.slice(0, MAX_LABEL),
      });
      edgesEmitted++;
    }

    // Cross-domain coordination edges (operator directive 2026-05-26 — peer
    // chats whiskey/lima/mike/foxtrot are doing the same PDF-extraction work
    // for their domains; bridge into the shared substrate so the corpus is
    // discoverable from any domain entry point):
    //   - kilo's 1008-PDF resources manifest (cad-cam-resources-pdf-index) —
    //     this corpus is a SUBSET of kilo's index, classified as
    //     `domain:"training"`, software:"misc". Adds upward edge.
    //   - foxtrot's milling-pdf-cited-tips substrate + KnowledgeCurriculumBridgeEngine —
    //     cross-domain tip-citation pattern; post-processor tips will follow
    //     the same source-attribution rigor.
    for (const peerNode of CROSS_DOMAIN_PEERS) {
      newEdges.push({
        from: pivotId,
        to: peerNode.id,
        kind: peerNode.kind,
        semantic: peerNode.semantic,
        label: peerNode.label,
      });
      edgesEmitted++;
    }
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted,
      pivotsEmitted,
      chaptersEmitted,
      edgesEmitted,
      bridgesResolved,
      bridgesDropped,
      corpora: parsedCorpora.length,
      totalChapters,
      totalSections,
    },
  };
}

/** Read text + parse one source. Returns null on read failure (logs to stderr). */
function loadAndParse(src) {
  const filePath = path.join(EXTRACT_DIR, src.extractFile);
  if (!fs.existsSync(filePath)) {
    console.error(`WARN: extract missing: ${filePath} — skipping ${src.bookId}`);
    return null;
  }
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return parsePostPdfCorpus(text, src.bookId);
  } catch (e) {
    console.error(`WARN: parse failed for ${src.bookId}: ${e.message}`);
    return null;
  }
}

/** Write per-PDF JSONL into the canonical extracted-pdfs ingestion cache. */
function writeJsonls(parsedList) {
  fs.mkdirSync(JSONL_OUT_DIR, { recursive: true });
  let totalRecords = 0;
  for (let i = 0; i < parsedList.length; i++) {
    const parsed = parsedList[i];
    const src = PDF_SOURCES[i];
    if (!parsed) continue;
    const records = corpusToJsonl(parsed, {
      book: src.book,
      pdfPath: src.pdfPath,
      domain: "post-processor",
      audience: ["echo", "india", "specialist-cam"],
      bridgeEngines: src.engines,
    });
    const outFile = path.join(JSONL_OUT_DIR, `${src.slug}.jsonl`);
    const body = records.map(r => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");
    fs.writeFileSync(outFile, body);
    totalRecords += records.length;
  }
  return totalRecords;
}

export function main() {
  if (!fs.existsSync(EXTRACT_DIR)) {
    console.error(`FATAL: extract dir missing: ${EXTRACT_DIR}`);
    console.error(`Run: pdftotext -layout "${PDF_SOURCES[0].pdfPath}" ${EXTRACT_DIR}/${PDF_SOURCES[0].extractFile}`);
    return 1;
  }

  const parsedList = PDF_SOURCES.map(loadAndParse);
  const liveParsed = parsedList.filter(Boolean);
  const liveSources = PDF_SOURCES.filter((_, i) => parsedList[i]);

  if (liveParsed.length === 0) {
    console.error(`FATAL: no extracts loaded`);
    return 1;
  }

  let recordsWritten = 0;
  try { recordsWritten = writeJsonls(parsedList); }
  catch (e) { console.error(`WARN: JSONL write failed — ${e.message}`); }

  let result;
  try {
    const resolver = makeOracleResolver();
    const { newNodes, newEdges, stats } = generate(liveParsed, liveSources, [], resolver);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: PDF_SOURCES.map(s => s.pdfPath),
      newNodes,
      newEdges,
      stats: { ...stats, jsonlRecordsWritten: recordsWritten },
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try { fs.mkdirSync(VIZ_DIR, { recursive: true }); fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  corpora parsed:     ${result.stats.corpora}`);
  console.log(`  chapters:           ${result.stats.totalChapters}`);
  console.log(`  sections:           ${result.stats.totalSections}`);
  console.log(`  roost emitted:      ${result.stats.roostEmitted}`);
  console.log(`  pivots emitted:     ${result.stats.pivotsEmitted}`);
  console.log(`  chapter nodes:      ${result.stats.chaptersEmitted}`);
  console.log(`  bridge edges:       ${result.stats.edgesEmitted}`);
  console.log(`  jsonl records:      ${result.stats.jsonlRecordsWritten}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
