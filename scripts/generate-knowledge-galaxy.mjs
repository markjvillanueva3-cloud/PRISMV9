#!/usr/bin/env node
/**
 * generate-knowledge-galaxy.mjs — make tribal knowledge + ML/training
 * artifacts first-class, visible nodes in the system viz so the user can
 * SEE: (a) every tip that's been extracted, (b) which engine domains each
 * tip is applicable to, (c) which models exist and what they consume,
 * (d) where wiring would be a net benefit.
 *
 * Sources:
 *   - state/shared/tribal-embed-index.json     (384 indexed tips)
 *   - state/shared/tribal-citation-log.jsonl   (utilization signal)
 *   - mcp-server/data/extracted-knowledge/<dirs>     (PDF/video extracts)
 *   - mcp-server/data/training/<files>               (training manifests)
 *   - mcp-server/data/models/<dirs>                  (trained model artifacts)
 *   - mcp-server/data/video-learned/learning-registry.json
 *   - state/shared/session-learning-log.jsonl  (continuous learning events)
 *
 * Emits (as augmentation):
 *   - L8 parent nodes:   mem.tribal, mem.training, mem.models, mem.extracted,
 *                        mem.video_learned
 *   - molecules[] on each parent so users can double-click → see every tip /
 *     every model file / every extract orbiting the parent
 *   - phantom edges (type="knowledge_consumes") from tribal-tips/learning
 *     parents → applicable engine domains, so the Suggest mode shows where
 *     tribal tips/learning feeds the system
 *   - utilization annotations (citationCount, lastCited) merged onto tip
 *     molecules so high-value tips render at higher size/intensity
 *
 * Output: state/shared/system-viz/knowledge-galaxy-augmentation.json
 *
 * Run on cadence (or after pdf-learn / video-learn pipelines write fresh
 * data) so new tips become visible nodes the next viz reload.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";
import { streamTribalEntries } from "./lib/load-tribal-index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const STATE_DIR = path.join(ROOT, "state", "shared");
const DATA_DIR = path.join(ROOT, "mcp-server", "data");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const MAX_PLANETS_PER_PARENT = 600;     // cap matches galaxy generator

// Map a tip's `domain` to the matching L5 engine-domain rollup id.
function domainToEngineId(domain, graphDomains) {
  if (!domain) return null;
  const lower = String(domain).toLowerCase();
  // Try exact match first, then prefix match
  const exact = graphDomains.find(d => d.key === lower);
  if (exact) return exact.id;
  for (const d of graphDomains) {
    if (lower.includes(d.key) || d.key.includes(lower)) return d.id;
  }
  return null;
}

function loadGraphDomains(graph) {
  return graph.nodes
    .filter(n => n.layer === "L5" && n.id.startsWith("eng.")
                  && (!n.parent || !n.parent.startsWith("eng.")))
    .map(n => ({
      id: n.id,
      key: (n.id.replace(/^eng\./, "") || "").toLowerCase(),
    }))
    .filter(x => x.key.length > 0)
    .sort((a, b) => b.key.length - a.key.length);
}

function loadJsonOrNull(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function readJsonlLines(p, max = Infinity) {
  if (!fs.existsSync(p)) return [];
  const out = [];
  try {
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line)); } catch {}
      if (out.length >= max) break;
    }
  } catch {}
  return out;
}

function tally(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (k == null) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function generate() {
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const graphDomains = loadGraphDomains(graph);
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const newNodes = [];
  const newEdges = [];
  const annotations = {};
  const stats = {
    tribalTips: 0, tribalDomains: {},
    extractedKnowledgeFiles: 0,
    trainingFiles: 0,
    modelArtifacts: 0,
    videoLearnedEntries: 0,
    sessionLearningEvents: 0,
    knowledgeWireEdges: 0,
    parentsCreated: 0,
  };

  // ===== Citation tally — utilization signal per tip =====
  const citationLog = readJsonlLines(path.join(STATE_DIR, "tribal-citation-log.jsonl"), 5000);
  const citationsByTipId = new Map();
  const lastCitedAt = new Map();
  for (const ev of citationLog) {
    if (!Array.isArray(ev.cited)) continue;
    for (const c of ev.cited) {
      if (!c?.id) continue;
      citationsByTipId.set(c.id, (citationsByTipId.get(c.id) || 0) + 1);
      if (ev.ts) {
        const prev = lastCitedAt.get(c.id);
        if (!prev || ev.ts > prev) lastCitedAt.set(c.id, ev.ts);
      }
    }
  }

  // ===== 1. TRIBAL TIPS =====
  // Shard-aware + O(1)-heap (manifest-first): the tribal index sharded 2026-06-08
  // and the monolith is now an absent orphan, so loadJsonOrNull returned null = 0
  // tribal tips. streamTribalEntries reads the canonical shards ONE entry at a time;
  // we drop the heavy 768-float embedding and keep every metadata field this viz
  // uses, so a default-heap run does not OOM (loadTribalIndex would). Fail-soft to
  // an empty list preserves the prior loadJsonOrNull-on-absent semantics.
  let tribalEntries = [];
  try {
    const acc = [];
    streamTribalEntries(path.join(STATE_DIR, "tribal-embed-index.json"), (e) => {
      const { embedding, ...rest } = e; // drop heavy embedding; keep all metadata
      acc.push(rest);
    });
    tribalEntries = acc;
  } catch { tribalEntries = []; }
  const tribalParentId = "mem.tribal";
  if (tribalEntries.length > 0) {
    if (!existingIds.has(tribalParentId)) {
      newNodes.push({
        id: tribalParentId, layer: "L8", subgroup: "tribal_root",
        label: `Tribal Knowledge\n(${tribalEntries.length} tips)`,
        color: "#ec4899", status: "built", size: 1.0, tier: 0,
        info: `Auto-extracted tips from PDFs, videos, shop floor, wiki. Double-click to explore.`,
        kind: "tribal-knowledge-root",
      });
      stats.parentsCreated++;
    }
    // Build molecules
    const tipsForMols = tribalEntries.slice(0, MAX_PLANETS_PER_PARENT);
    const mols = tipsForMols.map((t, i) => {
      const cites = citationsByTipId.get(t.id) || 0;
      return {
        id: `${tribalParentId}::${(t.id || `t${i}`).toLowerCase().replace(/[^a-z0-9_:.\-]/g, "_")}`,
        label: (t.title || t.id || `tip ${i}`).slice(0, 60),
        kind: "tribal-tip",
        info: `${t.source ?? "?"} · domain: ${t.domain ?? "any"} · cited ${cites}× · ${(t.text || "").slice(0, 100)}…`,
        file: t.path,
        domain: t.domain,
        source: t.source,
        citations: cites,
      };
    });
    if (tribalEntries.length > tipsForMols.length) {
      mols.push({
        id: `${tribalParentId}::_more`, kind: "more",
        label: `+${tribalEntries.length - tipsForMols.length} more tips`,
      });
    }
    annotations[tribalParentId] = { molecules: mols };
    stats.tribalTips = tribalEntries.length;

    // Tally tip→domain so we can emit "tribal feeds this domain" edges
    const domainTally = tally(tribalEntries, t => t.domain);
    for (const [dom, count] of domainTally) {
      stats.tribalDomains[dom] = count;
      const engineId = domainToEngineId(dom, graphDomains);
      if (engineId) {
        newEdges.push({
          from: tribalParentId, to: engineId,
          type: "knowledge_consumes", status: "active",
          intensity: Math.min(0.7, 0.2 + count / 50),
          label: `${count} tips`,
        });
        stats.knowledgeWireEdges++;
      }
    }
  }

  // ===== 2. EXTRACTED KNOWLEDGE (pdf-learn / video-learn outputs) =====
  const extractedRoot = path.join(DATA_DIR, "extracted-knowledge");
  if (fs.existsSync(extractedRoot)) {
    const subdirs = fs.readdirSync(extractedRoot, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);
    const extractedParentId = "mem.extracted";
    if (subdirs.length > 0 && !existingIds.has(extractedParentId)) {
      newNodes.push({
        id: extractedParentId, layer: "L8", subgroup: "extracted_root",
        label: `Extracted Knowledge\n(${subdirs.length} sources)`,
        color: "#fb923c", status: "built", size: 0.85, tier: 0,
        info: `PDF/video/manual extracts. Each subdir = one ingestion run.`,
        kind: "extracted-knowledge-root",
      });
      stats.parentsCreated++;
    }
    const mols = [];
    for (const sd of subdirs.slice(0, MAX_PLANETS_PER_PARENT)) {
      const sdAbs = path.join(extractedRoot, sd);
      let fileCount = 0, totalBytes = 0;
      try {
        for (const ent of fs.readdirSync(sdAbs, { withFileTypes: true })) {
          if (!ent.isFile()) continue;
          fileCount++;
          try { totalBytes += fs.statSync(path.join(sdAbs, ent.name)).size; } catch {}
        }
      } catch {}
      mols.push({
        id: `${extractedParentId}::${sd.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`,
        label: sd, kind: "extract-source",
        info: `${fileCount} extracted files · ${(totalBytes / 1024).toFixed(1)} KB`,
        file: path.relative(ROOT, sdAbs).replace(/\\/g, "/"),
      });
      stats.extractedKnowledgeFiles += fileCount;
    }
    if (mols.length > 0) annotations[extractedParentId] = { molecules: mols };
  }

  // ===== 3. TRAINING DATA =====
  const trainingDir = path.join(DATA_DIR, "training");
  if (fs.existsSync(trainingDir)) {
    const trainingFiles = fs.readdirSync(trainingDir, { withFileTypes: true })
      .filter(e => e.isFile()).map(e => e.name);
    const trainingParentId = "mem.training";
    if (trainingFiles.length > 0 && !existingIds.has(trainingParentId)) {
      newNodes.push({
        id: trainingParentId, layer: "L8", subgroup: "training_root",
        label: `Training Data\n(${trainingFiles.length} datasets)`,
        color: "#a855f7", status: "built", size: 0.85, tier: 0,
        info: `Training manifests + corpora consumed by ML pipelines.`,
        kind: "training-root",
      });
      stats.parentsCreated++;
    }
    const mols = [];
    for (const f of trainingFiles.slice(0, MAX_PLANETS_PER_PARENT)) {
      const abs = path.join(trainingDir, f);
      let size = 0;
      try { size = fs.statSync(abs).size; } catch {}
      mols.push({
        id: `${trainingParentId}::${f.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`,
        label: f, kind: "training-data",
        info: `${(size / 1024).toFixed(1)} KB`,
        file: path.relative(ROOT, abs).replace(/\\/g, "/"),
      });
    }
    stats.trainingFiles = trainingFiles.length;
    if (mols.length > 0) annotations[trainingParentId] = { molecules: mols };
  }

  // ===== 4. MODELS (trained artifacts) =====
  const modelsDir = path.join(DATA_DIR, "models");
  if (fs.existsSync(modelsDir)) {
    const items = fs.readdirSync(modelsDir, { withFileTypes: true });
    const modelsParentId = "mem.models";
    if (items.length > 0 && !existingIds.has(modelsParentId)) {
      newNodes.push({
        id: modelsParentId, layer: "L8", subgroup: "models_root",
        label: `Trained Models\n(${items.length} artifacts)`,
        color: "#22d3ee", status: "built", size: 0.9, tier: 0,
        info: `Neural / ML model artifacts. Double-click to see each model.`,
        kind: "models-root",
      });
      stats.parentsCreated++;
    }
    const mols = items.slice(0, MAX_PLANETS_PER_PARENT).map(e => {
      const abs = path.join(modelsDir, e.name);
      let size = 0, isDir = false;
      try { const st = fs.statSync(abs); size = st.size; isDir = st.isDirectory(); } catch {}
      return {
        id: `${modelsParentId}::${e.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`,
        label: e.name, kind: isDir ? "model-dir" : "model-file",
        info: isDir ? "model directory" : `${(size / 1024).toFixed(1)} KB`,
        file: path.relative(ROOT, abs).replace(/\\/g, "/"),
      };
    });
    stats.modelArtifacts = items.length;
    if (mols.length > 0) annotations[modelsParentId] = { molecules: mols };
  }

  // ===== 5. VIDEO-LEARNED REGISTRY =====
  const videoReg = loadJsonOrNull(path.join(DATA_DIR, "video-learned", "learning-registry.json"));
  if (videoReg) {
    const videoEntries = Array.isArray(videoReg)
      ? videoReg
      : (videoReg.entries || videoReg.videos || Object.values(videoReg).filter(v => v?.id || v?.url) || []);
    const videoParentId = "mem.video_learned";
    if (videoEntries.length > 0 && !existingIds.has(videoParentId)) {
      newNodes.push({
        id: videoParentId, layer: "L8", subgroup: "video_root",
        label: `Video Learning\n(${videoEntries.length} videos)`,
        color: "#34d399", status: "built", size: 0.85, tier: 0,
        info: `Videos ingested by video-learn pipeline. Each generates tips/wiki entries.`,
        kind: "video-root",
      });
      stats.parentsCreated++;
    }
    const mols = videoEntries.slice(0, MAX_PLANETS_PER_PARENT).map((v, i) => ({
      id: `${videoParentId}::${(v.id || `v${i}`).toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`,
      label: (v.title || v.url || v.id || `video ${i}`).slice(0, 50),
      kind: "video-extract",
      info: `${v.duration || ""} · ${v.tipsExtracted ?? "?"} tips · ${v.url || ""}`,
      url: v.url,
    }));
    stats.videoLearnedEntries = videoEntries.length;
    if (mols.length > 0) annotations[videoParentId] = { molecules: mols };
  }

  // ===== 6a. EXTERNAL CAD/CAM MANUALS (prism-knowledge-wiki sibling) =====
  // The knowledge_store/ holds 50+ JSON-extracted manuals (Mastercam,
  // hyperMILL, InventorCAM, Fusion360, etc) that pdf-learn has produced.
  // These are OUTSIDE the main prism/ tree but feed CAM-specific engines.
  const externalKS = path.resolve(ROOT, "..", "prism-knowledge-wiki", "cad-engine", "knowledge_store");
  if (fs.existsSync(externalKS)) {
    const manualFiles = fs.readdirSync(externalKS, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith(".json"))
      .map(e => ({ name: e.name, abs: path.join(externalKS, e.name) }));
    if (manualFiles.length > 0) {
      const manualsParentId = "mem.cad_manuals";
      if (!existingIds.has(manualsParentId)) {
        newNodes.push({
          id: manualsParentId, layer: "L8", subgroup: "cad_manuals_root",
          label: `CAD/CAM Manuals\n(${manualFiles.length} extracted)`,
          color: "#f43f5e", status: "built", size: 0.95, tier: 0,
          info: `Extracted CAM/CAD manuals from prism-knowledge-wiki sibling. Each = a vendor's documentation.`,
          kind: "cad-manuals-root",
        });
        stats.parentsCreated++;
      }
      const mols = [];
      for (const f of manualFiles.slice(0, MAX_PLANETS_PER_PARENT)) {
        let size = 0; try { size = fs.statSync(f.abs).size; } catch {}
        // derive vendor from filename pattern doc-<vendor>-<topic>.json
        const stem = f.name.replace(/^doc-/, "").replace(/\.json$/, "");
        const vendor = stem.split("-")[0];
        mols.push({
          id: `${manualsParentId}::${stem.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`,
          label: stem, kind: "cad-manual",
          vendor,
          info: `${vendor} · ${(size / 1024).toFixed(0)} KB`,
          file: path.relative(ROOT, f.abs).replace(/\\/g, "/"),
        });
      }
      annotations[manualsParentId] = { molecules: mols };
      stats.cadManuals = manualFiles.length;
      // Wire to relevant CAM dispatchers — vendor name heuristic
      const camDisp = graph.nodes.find(n => n.id === "disp.camdispatcher");
      if (camDisp) {
        newEdges.push({
          from: manualsParentId, to: camDisp.id,
          type: "knowledge_consumes", status: "active", intensity: 0.6,
          label: `${manualFiles.length} manuals`,
        });
        stats.knowledgeWireEdges++;
      }
    }
  }

  // ===== 6b. EXTERNAL CAM-FUNCTIONS CATALOG =====
  // Per-CAM-system function catalogs (CATIA, Edgecam, Esprit, Fusion360,
  // hyperMILL, Mastercam) live as JSON in prism-knowledge-wiki/mcp-server/data/cam-functions
  const externalCF = path.resolve(ROOT, "..", "prism-knowledge-wiki", "mcp-server", "data", "cam-functions");
  if (fs.existsSync(externalCF)) {
    const camSystems = fs.readdirSync(externalCF, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);
    if (camSystems.length > 0) {
      const cfParentId = "mem.cam_function_catalog";
      if (!existingIds.has(cfParentId)) {
        newNodes.push({
          id: cfParentId, layer: "L8", subgroup: "cam_func_root",
          label: `CAM Function Catalog\n(${camSystems.length} systems)`,
          color: "#06b6d4", status: "built", size: 0.85, tier: 0,
          info: `Per-CAM-system function dictionaries. Each system has its toolpath/drilling/etc operations cataloged.`,
          kind: "cam-functions-root",
        });
        stats.parentsCreated++;
      }
      const mols = [];
      for (const sys of camSystems.slice(0, MAX_PLANETS_PER_PARENT)) {
        const sysDir = path.join(externalCF, sys);
        let funcCount = 0;
        try { funcCount = fs.readdirSync(sysDir).filter(f => f.endsWith(".json")).length; } catch {}
        mols.push({
          id: `${cfParentId}::${sys.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`,
          label: `${sys} (${funcCount} functions)`,
          kind: "cam-system",
          info: `${funcCount} function manifests indexed`,
          file: path.relative(ROOT, sysDir).replace(/\\/g, "/"),
        });
      }
      annotations[cfParentId] = { molecules: mols };
      stats.camSystemsCataloged = camSystems.length;
    }
  }

  // ===== 6c. EXTERNAL MASTER INDEX (H:/data/MASTER_INDEX.json) =====
  const masterIndexPath = path.resolve(ROOT, "..", "data", "MASTER_INDEX.json");
  if (fs.existsSync(masterIndexPath)) {
    let mi = null;
    try { mi = JSON.parse(fs.readFileSync(masterIndexPath, "utf8")); } catch {}
    if (mi) {
      const miParentId = "mem.master_index";
      if (!existingIds.has(miParentId)) {
        newNodes.push({
          id: miParentId, layer: "L8", subgroup: "master_index_root",
          label: `Master Index\n(${Array.isArray(mi.entries) ? mi.entries.length : Object.keys(mi).length} entries)`,
          color: "#84cc16", status: "built", size: 0.8, tier: 0,
          info: `External MASTER_INDEX.json catalog (H:/data/) — meta-registry across PRISM.`,
          kind: "master-index-root",
          file: "../data/MASTER_INDEX.json",
        });
        stats.parentsCreated++;
        stats.masterIndexEntries = Array.isArray(mi.entries) ? mi.entries.length : Object.keys(mi).length;
      }
    }
  }

  // ===== 7. SESSION LEARNING LOG (rolling, last N events) =====
  const sessionLog = readJsonlLines(path.join(STATE_DIR, "session-learning-log.jsonl"), 500);
  if (sessionLog.length > 0) {
    const sessionParentId = "mem.session_learning";
    if (!existingIds.has(sessionParentId)) {
      newNodes.push({
        id: sessionParentId, layer: "L8", subgroup: "session_learning_root",
        label: `Session Learning\n(${sessionLog.length} recent events)`,
        color: "#fbbf24", status: "built", size: 0.7, tier: 0,
        info: `Continuous learning events captured this past N sessions.`,
        kind: "session-learning-root",
      });
      stats.parentsCreated++;
    }
    // Take most recent 200 events
    const recent = sessionLog.slice(-200).reverse();
    const mols = recent.map((ev, i) => ({
      id: `${sessionParentId}::ev_${i}`,
      label: (ev.kind || ev.event || "learning-event").slice(0, 36),
      kind: "session-event",
      info: `${ev.ts || ""} · ${(ev.detail || ev.summary || "").slice(0, 100)}`,
    }));
    stats.sessionLearningEvents = sessionLog.length;
    annotations[sessionParentId] = { molecules: mols };
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes,
    newEdges,
    annotations,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "knowledge-galaxy-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  parents created: ${result.stats.parentsCreated}`);
console.log(`  tribal tips: ${result.stats.tribalTips}  (across domains: ${Object.keys(result.stats.tribalDomains).length})`);
console.log(`  extracted-knowledge files: ${result.stats.extractedKnowledgeFiles}`);
console.log(`  training files: ${result.stats.trainingFiles}`);
console.log(`  model artifacts: ${result.stats.modelArtifacts}`);
console.log(`  video-learned entries: ${result.stats.videoLearnedEntries}`);
console.log(`  session-learning events: ${result.stats.sessionLearningEvents}`);
console.log(`  cad/cam manuals (external): ${result.stats.cadManuals ?? 0}`);
console.log(`  cam-systems cataloged (external): ${result.stats.camSystemsCataloged ?? 0}`);
console.log(`  master-index entries: ${result.stats.masterIndexEntries ?? 0}`);
console.log(`  knowledge → engine wiring edges: ${result.stats.knowledgeWireEdges}`);
