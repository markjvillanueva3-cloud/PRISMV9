#!/usr/bin/env node
/**
 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-graph.json
 *
 * Reads:
 *   state/shared/system-viz/system-graph.json
 *   state/shared/system-viz/obsidian-augmentation.json     (wiki + memory linkage)
 *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
 *   state/shared/system-viz/novelty-catalog.json           (novel inventions catalog)
 *   state/shared/system-viz/business-value-map.json        (revenue/cost-saving/safety/customer tags)
 *
 * Output:
 *   - Each node in graph gains: .knowledge, .awareness, .novelty, .businessValue (when applicable)
 *   - Top-level meta gains: .augmentationVersions = { obsidian, awareness, novelty, businessValue }
 *   - Top-level meta.novelty.totals copied from catalog totals for HUD
 *
 * Run AFTER scripts/generate-system-viz.mjs and any augmentation generators.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

function loadOptional(name) {
  const p = path.join(VIZ_DIR, name);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

const graphPath = path.join(VIZ_DIR, "system-graph.json");
if (!fs.existsSync(graphPath)) {
  console.error(`base graph missing: ${graphPath}\n  run: node scripts/generate-system-viz.mjs`);
  process.exit(2);
}
const G = JSON.parse(fs.readFileSync(graphPath, "utf8"));

// Hoisted index of nodes by id — replaces every G.nodes.find()/filter() in
// this script. The graph reached ~240K nodes and the linear scans started
// quadratic-blowing the merge step (24GB heap OOM). Both maps are maintained
// incrementally as new nodes get pushed into G.nodes by the merge blocks.
//   byId       : id -> first node with that id (most lookups want a unique node)
//   byIdMulti  : id -> array of all nodes with that id (some L5 ids legitimately
//                appear twice — once under wired and once under unwired subgroup)
//   addNodeIndexed(node) : push to G.nodes and maintain both maps. Use this
//                whenever a merge block emits a new node.
const byId = new Map();
const byIdMulti = new Map();
for (const n of G.nodes) {
  if (!byId.has(n.id)) byId.set(n.id, n);
  if (!byIdMulti.has(n.id)) byIdMulti.set(n.id, []);
  byIdMulti.get(n.id).push(n);
}
function addNodeIndexed(n) {
  G.nodes.push(n);
  if (!byId.has(n.id)) byId.set(n.id, n);
  if (!byIdMulti.has(n.id)) byIdMulti.set(n.id, []);
  byIdMulti.get(n.id).push(n);
}

const obsidian   = loadOptional("obsidian-augmentation.json");
const awareness  = loadOptional("awareness-augmentation.json");
const novelty    = loadOptional("novelty-catalog.json");
const business   = loadOptional("business-value-map.json");
const spotlight  = loadOptional("engine-spotlight.json");
const newlyBuilt = loadOptional("newly-built.json");
const molecules  = loadOptional("molecules-augmentation.json");
const fileCoverage = loadOptional("file-coverage-augmentation.json");
const fileCoverageV2 = loadOptional("file-coverage-v2-augmentation.json");
const heuristicCov   = loadOptional("heuristic-classification.json");
const skippedCensus  = loadOptional("h-drive-skipped-census.json");
const exhaustiveAudit = loadOptional("h-drive-exhaustive-audit.json");
const coreInventory  = loadOptional("core-inventory-augmentation.json");
const fsInventory    = loadOptional("fs-inventory-augmentation.json");
const engineDomain   = loadOptional("engine-domain-inventory-augmentation.json");
const knowledgeInv   = loadOptional("knowledge-inventory-augmentation.json");
const staleness      = loadOptional("staleness-overlay-augmentation.json");
const fsDeep         = loadOptional("fs-deep-inventory-augmentation.json");
const l11Leaves      = loadOptional("l11-leaves-augmentation.json");
const wiringOverlay  = loadOptional("wiring-overlay-augmentation.json");
const galaxyConst    = loadOptional("galaxy-constituents-augmentation.json");
const knowledgeGal   = loadOptional("knowledge-galaxy-augmentation.json");
const layerBridges   = loadOptional("layer-bridges-augmentation.json");
const stagnantFeats  = loadOptional("stagnant-features-augmentation.json");
const engineGraph    = loadOptional("engine-graph-augmentation.json");
const hookBridges    = loadOptional("hook-bridges-augmentation.json");
const frontendPages  = loadOptional("frontend-pages-augmentation.json");
const untrackedFiles = loadOptional("untracked-files-augmentation.json");
const comboDetector  = loadOptional("combo-detector-augmentation.json");
const engineSat      = loadOptional("engine-saturate-augmentation.json");
const wikiEntries    = loadOptional("wiki-entries-augmentation.json");
const formulasAtomic = loadOptional("formulas-atomic-augmentation.json");
const personasAug    = loadOptional("personas-augmentation.json");
const skillsAtomic   = loadOptional("skills-atomic-augmentation.json");
const schemasAtomic  = loadOptional("schemas-atomic-augmentation.json");
const algosAtomic    = loadOptional("algorithms-atomic-augmentation.json");
const transportExp   = loadOptional("transport-expand-augmentation.json");
const aiTierExp      = loadOptional("ai-tier-expand-augmentation.json");
const actionsAtomic  = loadOptional("actions-atomic-augmentation.json");
const hooksAtomic    = loadOptional("hooks-atomic-augmentation.json");
const testsAtomic    = loadOptional("tests-atomic-augmentation.json");
const scriptsAtomic  = loadOptional("scripts-atomic-augmentation.json");
const memoriesAtomic = loadOptional("memories-atomic-augmentation.json");
const registryEnts   = loadOptional("registry-entries-augmentation.json");
const actionEngEdges = loadOptional("action-engine-edges-augmentation.json");
const camVendorCat   = loadOptional("cam-vendor-catalog-augmentation.json");
const tsRegistryEnts = loadOptional("ts-registry-entries-augmentation.json");
const engineImpEdges = loadOptional("engine-import-edges-augmentation.json");
const testCovEdges   = loadOptional("test-coverage-edges-augmentation.json");
const physicsAtomic  = loadOptional("physics-atomic-augmentation.json");
const engineReclass  = loadOptional("engine-reclassify-augmentation.json");
const jmDieCust      = loadOptional("jm-die-customers-augmentation.json");
const schemaEngEdges = loadOptional("schema-engine-edges-augmentation.json");
const enginePhyEdges = loadOptional("engine-physics-edges-augmentation.json");
const frontendDeep   = loadOptional("frontend-deep-augmentation.json");
const wikiCrossRefs  = loadOptional("wiki-cross-refs-augmentation.json");
const extractDataAtm = loadOptional("extracted-data-atomic-augmentation.json");
const dataCatAtm     = loadOptional("data-catalogs-atomic-augmentation.json");
const gitTree        = loadOptional("git-tree-augmentation.json");
const vaultGraph     = loadOptional("obsidian-vault-augmentation.json");

const versions = {};
if (obsidian)  versions.obsidian  = obsidian.generatedAt  ?? "present";
if (awareness) versions.awareness = awareness.generatedAt ?? "present";
if (novelty)   versions.novelty   = novelty.generatedAt   ?? "present";
if (business)  versions.businessValue = business.generatedAt ?? "present";
if (spotlight) versions.spotlight = spotlight.generatedAt ?? "present";
if (newlyBuilt) versions.newlyBuilt = newlyBuilt.generatedAt ?? "present";
if (molecules)  versions.molecules  = molecules.generatedAt  ?? "present";
if (fileCoverage) versions.fileCoverage = fileCoverage.generatedAt ?? "present";
if (fileCoverageV2) versions.fileCoverageV2 = fileCoverageV2.generatedAt ?? "present";
if (heuristicCov)  versions.heuristicCov  = heuristicCov.generatedAt  ?? "present";
if (skippedCensus) versions.skippedCensus = skippedCensus.generatedAt ?? "present";
if (exhaustiveAudit) versions.exhaustiveAudit = exhaustiveAudit.generatedAt ?? "present";
if (coreInventory)   versions.coreInventory   = coreInventory.generatedAt   ?? "present";
if (fsInventory)     versions.fsInventory     = fsInventory.generatedAt     ?? "present";
if (engineDomain)    versions.engineDomain    = engineDomain.generatedAt    ?? "present";
if (knowledgeInv)    versions.knowledgeInv    = knowledgeInv.generatedAt    ?? "present";
if (staleness)       versions.staleness       = staleness.generatedAt       ?? "present";
if (fsDeep)          versions.fsDeep          = fsDeep.generatedAt          ?? "present";
if (l11Leaves)       versions.l11Leaves       = l11Leaves.generatedAt       ?? "present";
if (wiringOverlay)   versions.wiringOverlay   = wiringOverlay.generatedAt   ?? "present";
if (galaxyConst)     versions.galaxyConst     = galaxyConst.generatedAt     ?? "present";
if (knowledgeGal)    versions.knowledgeGal    = knowledgeGal.generatedAt    ?? "present";
if (layerBridges)    versions.layerBridges    = layerBridges.generatedAt    ?? "present";
if (stagnantFeats)   versions.stagnantFeats   = stagnantFeats.generatedAt   ?? "present";
if (engineGraph)     versions.engineGraph     = engineGraph.generatedAt     ?? "present";
if (hookBridges)     versions.hookBridges     = hookBridges.generatedAt     ?? "present";
if (frontendPages)   versions.frontendPages   = frontendPages.generatedAt   ?? "present";
if (untrackedFiles)  versions.untrackedFiles  = untrackedFiles.generatedAt  ?? "present";
if (comboDetector)   versions.comboDetector   = comboDetector.generatedAt   ?? "present";
if (engineSat)       versions.engineSat       = engineSat.generatedAt       ?? "present";
if (wikiEntries)     versions.wikiEntries     = wikiEntries.generatedAt     ?? "present";
if (formulasAtomic)  versions.formulasAtomic  = formulasAtomic.generatedAt  ?? "present";
if (personasAug)     versions.personasAug     = personasAug.generatedAt     ?? "present";
if (skillsAtomic)    versions.skillsAtomic    = skillsAtomic.generatedAt    ?? "present";
if (schemasAtomic)   versions.schemasAtomic   = schemasAtomic.generatedAt   ?? "present";
if (algosAtomic)     versions.algosAtomic     = algosAtomic.generatedAt     ?? "present";
if (transportExp)    versions.transportExp    = transportExp.generatedAt    ?? "present";
if (aiTierExp)       versions.aiTierExp       = aiTierExp.generatedAt       ?? "present";
if (actionsAtomic)   versions.actionsAtomic   = actionsAtomic.generatedAt   ?? "present";
if (hooksAtomic)     versions.hooksAtomic     = hooksAtomic.generatedAt     ?? "present";
if (testsAtomic)     versions.testsAtomic     = testsAtomic.generatedAt     ?? "present";
if (scriptsAtomic)   versions.scriptsAtomic   = scriptsAtomic.generatedAt   ?? "present";
if (memoriesAtomic)  versions.memoriesAtomic  = memoriesAtomic.generatedAt  ?? "present";
if (registryEnts)    versions.registryEnts    = registryEnts.generatedAt    ?? "present";
if (actionEngEdges)  versions.actionEngEdges  = actionEngEdges.generatedAt  ?? "present";
if (camVendorCat)    versions.camVendorCat    = camVendorCat.generatedAt    ?? "present";
if (tsRegistryEnts)  versions.tsRegistryEnts  = tsRegistryEnts.generatedAt  ?? "present";
if (engineImpEdges)  versions.engineImpEdges  = engineImpEdges.generatedAt  ?? "present";
if (testCovEdges)    versions.testCovEdges    = testCovEdges.generatedAt    ?? "present";
if (physicsAtomic)   versions.physicsAtomic   = physicsAtomic.generatedAt   ?? "present";
if (engineReclass)   versions.engineReclass   = engineReclass.generatedAt   ?? "present";
if (jmDieCust)       versions.jmDieCustomers  = jmDieCust.generatedAt       ?? "present";
if (schemaEngEdges)  versions.schemaEngineEdges = schemaEngEdges.generatedAt ?? "present";
if (enginePhyEdges)  versions.enginePhysicsEdges = enginePhyEdges.generatedAt ?? "present";
if (frontendDeep)    versions.frontendDeep    = frontendDeep.generatedAt    ?? "present";
if (wikiCrossRefs)   versions.wikiCrossRefs   = wikiCrossRefs.generatedAt   ?? "present";
if (extractDataAtm)  versions.extractedDataAtomic = extractDataAtm.generatedAt ?? "present";
if (dataCatAtm)      versions.dataCatalogsAtomic = dataCatAtm.generatedAt ?? "present";
if (gitTree)         versions.gitTree         = gitTree.generatedAt         ?? "present";
if (vaultGraph)      versions.vaultGraph      = vaultGraph.generatedAt      ?? "present";

let mergedNodes = 0;
for (const n of G.nodes) {
  const k = obsidian?.augmentations?.[n.id];
  if (k) { n.knowledge = k; mergedNodes++; }
  const a = awareness?.augmentations?.[n.id];
  if (a) { n.awareness = a; }
  const b = business?.augmentations?.[n.id];
  if (b) { n.businessValue = b; }
}

// Novelty catalog is global, not per-node by id; index it by file path so the viewer can match
if (novelty?.entries) {
  G.meta.novelty = {
    totals: novelty.totals ?? {},
    byPath: {},
    byKind: {},
  };
  for (const e of novelty.entries) {
    if (e.file) (G.meta.novelty.byPath[e.file] ??= []).push(e);
    if (e.kind) (G.meta.novelty.byKind[e.kind] ??= []).push(e);
  }
}

if (business?.totals) G.meta.businessValueTotals = business.totals;

// Spotlight catalog — fold per-node + keep top-level for HUD/Tour mode
if (spotlight?.spotlights) {
  G.meta.spotlight = {
    categories: spotlight.categories ?? {},
    totalCount: spotlight.spotlights.length,
    byId: {},
  };
  for (const s of spotlight.spotlights) {
    G.meta.spotlight.byId[s.id] = s;
    for (const matchId of (s.matchNodes ?? [])) {
      const node = byId.get(matchId);
      if (node) {
        (node.spotlights ??= []).push({
          id: s.id, name: s.name, category: s.category, rating: s.rating,
          whatItDoes: s.whatItDoes, technique: s.technique,
          valueBrought: s.valueBrought, novelty: s.novelty,
        });
      }
    }
  }
}

// Newly-built diff — fold per-node + keep top-level "What's New" list
if (newlyBuilt?.entries) {
  G.meta.newlyBuilt = {
    detectedAt: newlyBuilt.generatedAt,
    sinceCommit: newlyBuilt.sinceCommit,
    totals: newlyBuilt.totals,
    entries: newlyBuilt.entries,
  };
  for (const e of newlyBuilt.entries) {
    if (!e.nodeId) continue;
    const node = byId.get(e.nodeId);
    if (!node) continue;
    if (e.kind === "added")        node.recentlyAdded = true;
    if (e.kind === "wired")        node.recentlyWired = true;
    if (e.kind === "needs-wiring") node.needsWiringNow = true;
    node.changeNote = e.note;
    node.addedAt = e.addedAt;
  }
}

// File coverage — H: drive census + agent classifications per L9 node
let coverageNodes = 0;
if (fileCoverage?.byNodeId) {
  for (const n of G.nodes) {
    const cov = fileCoverage.byNodeId[n.id];
    if (cov) {
      n.fileCoverage = {
        purpose: cov.purpose,
        category: cov.category,
        utilization: cov.utilization,
        evidence: cov.evidence,
        totalFiles: cov.totalFiles,
        totalBytes: cov.totalBytes,
        orphanCandidates: (cov.orphanCandidates || []).slice(0, 5),
        breakdownSuggestions: (cov.breakdownSuggestions || []).slice(0, 3),
        utilizationGaps: (cov.utilizationGaps || []).slice(0, 3),
      };
      coverageNodes++;
    }
  }
  G.meta.fileCoverage = {
    generatedAt: fileCoverage.generatedAt,
    totals: fileCoverage.totals,
    topOrphans:        (fileCoverage.topOrphans || []).slice(0, 30),
    topBreakdowns:     (fileCoverage.topBreakdowns || []).slice(0, 20),
    topUtilizationGaps:(fileCoverage.topUtilizationGaps || []).slice(0, 25),
  };
}

// File coverage v2 — per-directory rollup with ghost markers, normalized labels.
// v2 supersedes v1 on overlapping L9 nodes (it has finer granularity) but keeps
// v1's per-subtree summaries since they're authored by an LLM agent and richer.
let coverageV2Nodes = 0;
if (fileCoverageV2?.byNodeId) {
  for (const n of G.nodes) {
    const v2 = fileCoverageV2.byNodeId[n.id];
    if (!v2) continue;
    n.fileCoverageV2 = {
      subtree: v2.subtree,
      isHRoot: v2.isHRoot,
      dirCount: v2.dirCount,
      totalBytes: v2.totalBytes,
      dominantCategory: v2.dominantCategory,
      dominantUtilization: v2.dominantUtilization,
      byCategory: v2.byCategory,
      byUtilization: v2.byUtilization,
      ghostCount: v2.ghostCount,
      sampleDirs: (v2.sampleDirs || []).slice(0, 5),
    };
    coverageV2Nodes++;
  }
  G.meta.fileCoverageV2 = {
    generatedAt: fileCoverageV2.generatedAt,
    totals: fileCoverageV2.totals,
    topOrphans:    (fileCoverageV2.topOrphans || []).slice(0, 30),
    topBreakdowns: (fileCoverageV2.topBreakdowns || []).slice(0, 20),
    topGhostNodes: (fileCoverageV2.topGhostNodes || []).slice(0, 20),
    topGaps:       (fileCoverageV2.topGaps || []).slice(0, 25),
  };
}

// Heuristic classifier — per-subtree rollup covering all 54,855 dirs (100% layer-3 coverage)
if (heuristicCov?.bySubtree) {
  G.meta.heuristicCoverage = {
    generatedAt: heuristicCov.generatedAt,
    totals: heuristicCov.totals,
    bySubtree: heuristicCov.bySubtree,
  };
  // Map subtree rollups onto matching L9 nodes when one exists
  for (const n of G.nodes) {
    if (n.layer !== "L9") continue;
    const m = n.id.match(/^fs(?:\.h)?\.(.+)$/);
    if (!m) continue;
    const subtreeName = m[1].replace(/_/g, " ");
    // Try exact match first, then case-insensitive
    let st = heuristicCov.bySubtree[subtreeName];
    if (!st) {
      const lower = subtreeName.toLowerCase();
      const found = Object.entries(heuristicCov.bySubtree).find(([k]) => k.toLowerCase() === lower);
      if (found) st = found[1];
    }
    if (st) {
      const dominantCat = Object.entries(st.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
      const dominantUtil = Object.entries(st.byUtilization).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
      n.heuristicCoverage = {
        dirCount: st.dirCount, totalBytes: st.totalBytes,
        dominantCategory: dominantCat, dominantUtilization: dominantUtil,
        byCategory: st.byCategory, byUtilization: st.byUtilization,
      };
    }
  }
}

// Skipped-tree census — node_modules/.git/dist/Recycle.Bin/etc that we excluded
// from the main walk. Folded as a single meta block plus optional ghost nodes
// for the largest skipped trees so they show on the viz.
if (skippedCensus?.trees) {
  G.meta.skippedTrees = {
    generatedAt: skippedCensus.generatedAt,
    totals: skippedCensus.totals,
    byCategory: skippedCensus.byCategory,
    byPattern: skippedCensus.byPattern,
    topTrees: (skippedCensus.trees || []).slice(0, 30),
  };
}

// Exhaustive audit — PowerShell-native ground truth (per-root sizes, regen sweep,
// recycle/SVI/VSS, reconciliation). Phase 7 sum-of-roots is the authoritative
// "what's actually on H:" number — Node walkers can't reach SVI/system-protected
// dirs and silently return 0, so this PS audit closes that gap.
if (exhaustiveAudit?.rootSizes) {
  // Recompute the trustworthy sum-of-roots since the audit's accountedTotal
  // arithmetic in the PS script is buggy (mixes overlapping buckets).
  const rootSumBytes = exhaustiveAudit.rootSizes.reduce((s, r) => s + (r.bytes || 0), 0);
  const rootSumGB = +(rootSumBytes / 1e9).toFixed(2);
  const diskUsedGB = exhaustiveAudit.volume?.sizeUsedGB || 0;
  const residualGB = +(diskUsedGB - rootSumGB).toFixed(2);

  G.meta.exhaustiveAudit = {
    generatedAt: exhaustiveAudit.generatedAt,
    volume: exhaustiveAudit.volume,
    reconciliation: {
      diskUsedGB,
      rootSumGB,
      residualGB,
      coveragePct: diskUsedGB > 0 ? +((rootSumGB / diskUsedGB) * 100).toFixed(2) : 0,
      // Phase 7 ground-truth (preferred over the PS script's buggy accountedTotal)
      authoritativeSource: "rootSumGB (sum of per-root recursive sizes, Phase 7)",
    },
    rootSizes: exhaustiveAudit.rootSizes,           // every top-level dir on H:
    topRegenTrees: (exhaustiveAudit.exhaustiveRegen?.trees || []).slice(0, 50),
    regenTotals: {
      treeCount: exhaustiveAudit.exhaustiveRegen?.treeCount || 0,
      totalBytes: exhaustiveAudit.exhaustiveRegen?.totalBytes || 0,
      totalGB: +((exhaustiveAudit.exhaustiveRegen?.totalBytes || 0) / 1e9).toFixed(2),
    },
    recycleBin: exhaustiveAudit.recycleBin,
    systemVolumeInfo: exhaustiveAudit.systemVolumeInfo,
    vssStorage: { hasData: !!exhaustiveAudit.vssStorage?.usedBytes,
                  usedGB: exhaustiveAudit.vssStorage?.usedGB || null,
                  note: exhaustiveAudit.vssStorage?.usedBytes ? null
                        : "vssadmin returned no items (admin elevation needed for full VSS visibility)" },
    dotDirs: exhaustiveAudit.dotDirs,
  };

  // Project per-root sizes onto matching L9 nodes if any exist (e.g. fs.h.PRISM)
  for (const r of exhaustiveAudit.rootSizes) {
    if (!r.name || !r.bytes) continue;
    // Try a few normalized id forms
    const normalized = r.name.replace(/[^a-zA-Z0-9]/g, "_");
    const candidates = [
      `fs.h.${r.name}`,
      `fs.h.${r.name.toLowerCase()}`,
      `fs.h.${normalized}`,
      `fs.h.${normalized.toLowerCase()}`,
    ];
    for (const id of candidates) {
      const node = byId.get(id);
      if (node) {
        node.exhaustiveSize = {
          bytes: r.bytes,
          gb: r.gb,
          source: "PS Get-ChildItem -Force -Recurse",
        };
        break;
      }
    }
  }
}

// Molecules — drill-down constituents per node (engines, actions, skills, hooks, files)
let moleculeNodes = 0, moleculeTotal = 0;
if (molecules?.byNodeId) {
  for (const n of G.nodes) {
    const m = molecules.byNodeId[n.id];
    if (m && m.length > 0) {
      n.molecules = m;
      moleculeNodes++;
      moleculeTotal += m.length;
    }
  }
  G.meta.molecules = {
    generatedAt: molecules.generatedAt,
    totals: { nodesAugmented: moleculeNodes, totalMolecules: moleculeTotal },
  };
}

// Core inventory — expand 10 L6 placeholder nodes into real children (algorithms,
// schemas, physics, migrations, tests, hooks_src, hooks_cl, scripts, skills).
// Each child is layer L6 with a `parent` field pointing to the placeholder.
let coreInventoryChildren = 0;
if (coreInventory?.newNodes && coreInventory?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of coreInventory.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    coreInventoryChildren++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of coreInventory.newEdges) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
  }
  // Update parent placeholder labels with real counts so the viz shows
  // "Algorithms (53 / 53 walked)" etc. instead of stale numbers.
  for (const [parentId, p] of Object.entries(coreInventory.byParent)) {
    const parent = byId.get(parentId);
    if (!parent) continue;
    const total = p.totalFiles ?? p.count;
    const labelBase = parent.label.replace(/\s*\(\d[^)]*\)\s*$/, "");
    if (p.mode === "per-file") {
      parent.label = `${labelBase} (${total})`;
    } else {
      parent.label = `${labelBase} (${total} → ${p.count} buckets)`;
    }
    parent.childCount = p.count;
    parent.expansionMode = p.mode;
  }
  G.meta.coreInventory = {
    generatedAt: coreInventory.generatedAt,
    stats: coreInventory.stats,
    perParent: Object.fromEntries(
      Object.entries(coreInventory.byParent).map(([k, v]) => [k, {
        mode: v.mode, count: v.count, totalFiles: v.totalFiles ?? v.count,
      }])
    ),
  };
}

// FS inventory — expand 84 L9 filesystem leaves into 2nd-level subdir children
// (per-parent capped at 8 + Misc bucket). Each child is layer L9 with a `parent`
// field pointing to the original directory node.
let fsInventoryChildren = 0;
if (fsInventory?.newNodes && fsInventory?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of fsInventory.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    fsInventoryChildren++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of fsInventory.newEdges) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
  }
  // Append child counts to parent labels so the viz shows the expansion at a glance
  for (const [parentId, p] of Object.entries(fsInventory.byParent)) {
    const parent = byId.get(parentId);
    if (!parent) continue;
    const labelBase = parent.label.replace(/\s*\[\d[^\]]*\]\s*$/, "");
    parent.label = `${labelBase} [${p.count}/${p.totalSubdirs}]`;
    parent.childCount = p.count;
    parent.totalSubdirs = p.totalSubdirs;
    parent.expansionMode = p.mode;
  }
  G.meta.fsInventory = {
    generatedAt: fsInventory.generatedAt,
    stats: fsInventory.stats,
    perParent: Object.fromEntries(
      Object.entries(fsInventory.byParent).map(([k, v]) => [k, {
        mode: v.mode, count: v.count, totalSubdirs: v.totalSubdirs,
      }])
    ),
  };
}

// Engine-domain inventory — drill 41 L5 domain rollups into per-engine children
// (top-8 by file size + Misc bucket per domain). Each child is layer L5 with
// `parent` field pointing to the L5 domain node.
let engineDomainChildren = 0;
if (engineDomain?.newNodes && engineDomain?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of engineDomain.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    engineDomainChildren++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of engineDomain.newEdges) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
  }
  // Append drill counts to L5 parent labels — note multiple parent nodes can
  // share an id (wired vs unwired duplicates) so update them all.
  for (const [parentId, p] of Object.entries(engineDomain.byParent)) {
    for (const parent of (byIdMulti.get(parentId) || [])) {
      const labelBase = parent.label.replace(/\s*◇\s*\d[^◇]*$/, "");
      parent.label = `${labelBase} ◇ ${p.count}/${p.totalEngines} drilled`;
      parent.drilledCount = p.count;
      parent.totalEnginesInDomain = p.totalEngines;
      parent.expansionMode = p.mode;
    }
  }
  G.meta.engineDomainInventory = {
    generatedAt: engineDomain.generatedAt,
    stats: engineDomain.stats,
    perParent: Object.fromEntries(
      Object.entries(engineDomain.byParent).map(([k, v]) => [k, {
        mode: v.mode, count: v.count, totalEngines: v.totalEngines,
      }])
    ),
  };
}

// Knowledge inventory — drill 6 L8 memory rollups into per-file children
// (top-8 by file size + Misc bucket per memory type). Each child is layer L8
// with `parent` field pointing to the L8 memory node.
let knowledgeInvChildren = 0;
if (knowledgeInv?.newNodes && knowledgeInv?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of knowledgeInv.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    knowledgeInvChildren++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of knowledgeInv.newEdges) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
  }
  // Append drill counts to L8 memory parent labels
  for (const [parentId, p] of Object.entries(knowledgeInv.byParent)) {
    for (const parent of (byIdMulti.get(parentId) || [])) {
      const labelBase = parent.label.replace(/\s*◇\s*\d[^◇]*$/, "");
      parent.label = `${labelBase} ◇ ${p.count}/${p.totalFiles} drilled`;
      parent.drilledCount = p.count;
      parent.totalFiles = p.totalFiles;
      parent.expansionMode = p.mode;
    }
  }
  G.meta.knowledgeInventory = {
    generatedAt: knowledgeInv.generatedAt,
    stats: knowledgeInv.stats,
    perParent: Object.fromEntries(
      Object.entries(knowledgeInv.byParent).map(([k, v]) => [k, {
        mode: v.mode, count: v.count, totalFiles: v.totalFiles,
      }])
    ),
  };
}

// Staleness overlay — annotate every node we could resolve to a real file
// with a freshness tier (fresh/recent/stale/stagnant/ghost/missing) so the
// viz can heatmap dead/stagnant data. Adds meta.staleness with per-layer
// rollup + topStagnant list.
let stalenessAnnotated = 0;
if (staleness?.annotations) {
  for (const node of G.nodes) {
    const a = staleness.annotations[node.id];
    if (!a) continue;
    node.staleness = a;
    stalenessAnnotated++;
  }
  G.meta.staleness = {
    generatedAt: staleness.generatedAt,
    thresholds: staleness.thresholds,
    tally: staleness.tally,
    perLayer: staleness.perLayer,
    topStagnant: staleness.topStagnant,
    totalStagnant: staleness.totalStagnant,
  };
}

// FS deep inventory — every depth-3 directory in H:/ becomes a node, with
// file-list metadata (top-N largest files) embedded so the viz can show
// "every file is visible" without exploding to a million separate nodes.
// Orphans (subtrees without an existing graph parent) get synthetic
// top-level parents in the "h_root_synthetic" subgroup.
let fsDeepNodes = 0, fsDeepEdges = 0;
if (fsDeep?.newNodes && fsDeep?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of fsDeep.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    fsDeepNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of fsDeep.newEdges) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
    fsDeepEdges++;
  }
  G.meta.fsDeepInventory = {
    generatedAt: fsDeep.generatedAt,
    sourceIndex: fsDeep.sourceIndex,
    stats: fsDeep.stats,
    orphanGroupings: fsDeep.orphanGroupings,
  };
}

// L11 file leaves: explode the top-K files already stored on each L9 dir
// node into actual L11 leaf nodes. Reaches literal "every file is a node"
// for active workspace dirs (depth 3-6) and a sample for archive territory.
let l11Nodes = 0, l11Edges = 0;
if (l11Leaves?.newNodes && l11Leaves?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of l11Leaves.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    l11Nodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of l11Leaves.newEdges) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
    l11Edges++;
  }
  G.meta.l11Leaves = {
    generatedAt: l11Leaves.generatedAt,
    caps: l11Leaves.caps,
    stats: l11Leaves.stats,
  };
}

// Wiring overlay: per-atomic-engine wiringStatus + suggestedDispatcher tags +
// phantom edges from unwired engine/domain → suggested dispatcher node. Mode #8
// (Suggest button) highlights these automatically.
let wiringAnnotated = 0, wiringPhantomEdges = 0;
if (wiringOverlay?.annotations && wiringOverlay?.phantomEdges) {
  const byId = new Map(G.nodes.map(n => [n.id, n]));
  for (const [id, ann] of Object.entries(wiringOverlay.annotations)) {
    const node = byId.get(id);
    if (!node) continue;
    Object.assign(node, ann);
    wiringAnnotated++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of wiringOverlay.phantomEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    wiringPhantomEdges++;
  }
  G.meta.wiringOverlay = {
    generatedAt: wiringOverlay.generatedAt,
    auditSource: wiringOverlay.auditSource,
    stats: wiringOverlay.stats,
  };
}

// Galaxy constituents: populate node.molecules for engine-domains, core
// modules, and registries so users can double-click ANY rollup to see its
// atomic planets orbiting the parent (existing enterMolecules() drill-down).
let galaxyAnnotated = 0, galaxyMolsAttached = 0;
if (galaxyConst?.annotations) {
  const byId = new Map(G.nodes.map(n => [n.id, n]));
  for (const [id, ann] of Object.entries(galaxyConst.annotations)) {
    const node = byId.get(id);
    if (!node) continue;
    if (Array.isArray(ann.molecules) && ann.molecules.length > 0) {
      // Don't clobber existing curated molecules (e.g. spotlight engines) —
      // merge by ID so dedicated entries win and we top up with constituents.
      const existing = Array.isArray(node.molecules) ? node.molecules : [];
      const seenIds = new Set(existing.map(m => m.id));
      const merged = [...existing];
      for (const m of ann.molecules) {
        if (!seenIds.has(m.id)) { merged.push(m); seenIds.add(m.id); }
      }
      node.molecules = merged;
      galaxyAnnotated++;
      galaxyMolsAttached += ann.molecules.length;
    }
  }
  G.meta.galaxyConstituents = {
    generatedAt: galaxyConst.generatedAt,
    stats: galaxyConst.stats,
  };
}

// Knowledge galaxy: tribal tips, extracted knowledge, training data, model
// artifacts, video-learned, and session-learning events become first-class
// L8 nodes — each with molecules so users drill into atomic detail. Phantom
// "knowledge_consumes" edges show which engine domains receive each tribal
// tip, so wiring opportunities are visible.
let knowledgeNodes = 0, knowledgeEdges = 0, knowledgeAnnotated = 0;
if (knowledgeGal?.newNodes && knowledgeGal?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of knowledgeGal.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    knowledgeNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of knowledgeGal.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    knowledgeEdges++;
  }
  if (knowledgeGal.annotations) {
    const byId = new Map(G.nodes.map(n => [n.id, n]));
    for (const [id, ann] of Object.entries(knowledgeGal.annotations)) {
      const node = byId.get(id);
      if (!node) continue;
      if (Array.isArray(ann.molecules) && ann.molecules.length > 0) {
        const existing = Array.isArray(node.molecules) ? node.molecules : [];
        const seenIds = new Set(existing.map(m => m.id));
        const merged = [...existing];
        for (const m of ann.molecules) {
          if (!seenIds.has(m.id)) { merged.push(m); seenIds.add(m.id); }
        }
        node.molecules = merged;
        knowledgeAnnotated++;
      }
    }
  }
  G.meta.knowledgeGalaxy = {
    generatedAt: knowledgeGal.generatedAt,
    stats: knowledgeGal.stats,
  };
}

// Layer bridges: fill the sparse upper-layer cascade. Adds:
//   L4→L5 lazy_import edges (dispatcher → engine-domain rollup),
//   L3→L4 route edges     (AI tier → dispatcher),
//   L2→L3 intent/observe/gate/stream/rate_limit edges (transport → AI tier).
// Edges only — no new nodes. Deduped against existing edges by (from|to|type).
let bridgeEdges = 0;
if (layerBridges?.edges) {
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of layerBridges.edges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    bridgeEdges++;
  }
  G.meta.layerBridges = {
    generatedAt: layerBridges.generatedAt,
    stats: layerBridges.stats,
  };
}

// Stagnant features: ghost L8 milestones + L9 pending units + design specs
// representing planned-but-unbuilt work. Routing edges (planned_for /
// designed_for, status:ghost) point at the dispatchers each milestone
// targets so users see "this dispatcher has X planned features pending."
let stagnantNodes = 0, stagnantEdges = 0;
if (stagnantFeats?.newNodes && stagnantFeats?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of stagnantFeats.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    stagnantNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of stagnantFeats.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    stagnantEdges++;
  }
  G.meta.stagnantFeatures = {
    generatedAt: stagnantFeats.generatedAt,
    stats: stagnantFeats.stats,
  };
}

// Engine internal graph: 1.2k atomic engine L5 nodes (for engines with
// cross-import activity), real engine→engine import edges (active), plus
// ghost suggested-peer edges (status:ghost) for plausible bridges that
// don't exist today.
let engineGraphNodes = 0, engineGraphEdges = 0;
if (engineGraph?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  if (engineGraph.newNodes) {
    for (const node of engineGraph.newNodes) {
      if (existingIds.has(node.id)) continue;
      G.nodes.push(node);
      existingIds.add(node.id);
      engineGraphNodes++;
    }
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of engineGraph.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    engineGraphEdges++;
  }
  G.meta.engineGraph = {
    generatedAt: engineGraph.generatedAt,
    stats: engineGraph.stats,
  };
}

// Hook bridges: hook→dispatcher edges (real hook_invoke + ghost
// hook_invoke_suggested for keyword-only hooks).
let hookBridgesEdges = 0;
if (hookBridges?.newEdges) {
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of hookBridges.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    hookBridgesEdges++;
  }
  G.meta.hookBridges = {
    generatedAt: hookBridges.generatedAt,
    stats: hookBridges.stats,
  };
}

// Frontend pages: drill the fe.pages.<cluster> rollups into per-page L1
// children. Page → tr.rest + page → fe.web edges follow the cluster's path.
let frontendPageNodes = 0, frontendPageEdges = 0;
if (frontendPages?.newNodes && frontendPages?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of frontendPages.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    frontendPageNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of frontendPages.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    frontendPageEdges++;
  }
  G.meta.frontendPages = {
    generatedAt: frontendPages.generatedAt,
    pagesDir: frontendPages.pagesDir,
    stats: frontendPages.stats,
  };
}

// Untracked-files layer: source files on disk under mcp-server/{src,web/src}
// that git does not track, surfaced as a navigable 3-level hierarchy
// (untracked → classification rollup → per-file leaf). Live-indexed by
// scripts/audit-untracked-refs.mjs so the viz reflects the CURRENT untracked
// surface (post-restoration this shrinks; new uncommitted Codex work grows it).
let untrackedFileNodes = 0, untrackedFileEdges = 0;
if (untrackedFiles?.newNodes && untrackedFiles?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of untrackedFiles.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    untrackedFileNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of untrackedFiles.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    untrackedFileEdges++;
  }
  G.meta.untrackedFiles = {
    generatedAt: untrackedFiles.generatedAt,
    source: untrackedFiles.source,
    roots: untrackedFiles.roots,
    stats: untrackedFiles.stats,
  };
}

// Combo detector: ghost L8 synthesizers proposing variability-adjusted
// formulas at high-convergence targets, plus novel-formula proposals for
// under-aggregated domains and hierarchical-router proposals for fan-in
// dispatchers.
let comboNodes = 0, comboEdges = 0;
if (comboDetector?.newNodes && comboDetector?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of comboDetector.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    comboNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of comboDetector.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    comboEdges++;
  }
  G.meta.comboDetector = {
    generatedAt: comboDetector.generatedAt,
    tuning: comboDetector.tuning,
    stats: comboDetector.stats,
  };
}

// Engine saturate: drill ALL ~3180 engines as atomic L5 nodes (full coverage,
// no per-domain cap). Adds containment edges from L5 rollup → atomic engine.
let engSatNodes = 0, engSatEdges = 0;
if (engineSat?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of engineSat.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    engSatNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (engineSat.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    engSatEdges++;
  }
  G.meta.engineSaturate = {
    generatedAt: engineSat.generatedAt,
    stats: engineSat.stats,
  };
}

// Wiki entries: drill the full knowledge/wiki/**/*.md tree into per-entry
// atomic L8 nodes plus kind rollups, with [[cross-ref]] edges.
let wikiNodes = 0, wikiEdges = 0;
if (wikiEntries?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of wikiEntries.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    wikiNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (wikiEntries.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    wikiEdges++;
  }
  G.meta.wikiEntries = {
    generatedAt: wikiEntries.generatedAt,
    stats: wikiEntries.stats,
  };
}

// Formulas atomic: every exported physics constant / function as an L6 atomic
// child of core.formulas, with `use` edges to core.physics.
let formulaNodes = 0, formulaEdges = 0;
if (formulasAtomic?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of formulasAtomic.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    formulaNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (formulasAtomic.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    formulaEdges++;
  }
  G.meta.formulasAtomic = {
    generatedAt: formulasAtomic.generatedAt,
    stats: formulasAtomic.stats,
  };
}

// Personas expand: 8 additional L0 personas (maintenance, customer, vendor,
// owner, oncall, csr, foreman, estimator) with `uses`/`demands` edges.
let personaNodes = 0, personaEdges = 0;
if (personasAug?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of personasAug.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    personaNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (personasAug.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    personaEdges++;
  }
  G.meta.personasExpand = {
    generatedAt: personasAug.generatedAt,
    stats: personasAug.stats,
  };
}

// Skills atomic: drill all 637 slash-command skills (project + user) into
// atomic L6 children of core.skills.
let skillNodes = 0, skillEdges = 0;
if (skillsAtomic?.newNodes) {
  for (const node of skillsAtomic.newNodes) {
    if (byId.has(node.id)) continue;
    addNodeIndexed(node);
    skillNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (skillsAtomic.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    skillEdges++;
  }
  G.meta.skillsAtomic = {
    generatedAt: skillsAtomic.generatedAt,
    stats: skillsAtomic.stats,
  };
}

// Schemas atomic: drill 268 schema files + 1590 exported Zod/type symbols.
let schemaNodes = 0, schemaEdges = 0;
if (schemasAtomic?.newNodes) {
  for (const node of schemasAtomic.newNodes) {
    if (byId.has(node.id)) continue;
    addNodeIndexed(node);
    schemaNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (schemasAtomic.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    schemaEdges++;
  }
  G.meta.schemasAtomic = {
    generatedAt: schemasAtomic.generatedAt,
    stats: schemasAtomic.stats,
  };
}

// Algorithms atomic: drill 53 src/algorithms/*.ts as atomic L6 children of
// core.algos, with cross-edges to core.formulas for files referencing named
// formulas (Kienzle, Taylor, Kalman, etc).
let algoNodes = 0, algoEdges = 0;
if (algosAtomic?.newNodes) {
  for (const node of algosAtomic.newNodes) {
    if (byId.has(node.id)) continue;
    addNodeIndexed(node);
    algoNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (algosAtomic.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    algoEdges++;
  }
  G.meta.algorithmsAtomic = {
    generatedAt: algosAtomic.generatedAt,
    stats: algosAtomic.stats,
  };
}

// Transport expand: 12 additional L2 transport surfaces (gateway, queue,
// pubsub, embed, vector, cache, cdn, s3, dnc, mtconnect, opcua, mqtt) +
// edges to consumers/producers.
let transportNodes = 0, transportEdges = 0;
if (transportExp?.newNodes) {
  for (const node of transportExp.newNodes) {
    if (byId.has(node.id)) continue;
    addNodeIndexed(node);
    transportNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (transportExp.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    transportEdges++;
  }
  G.meta.transportExpand = {
    generatedAt: transportExp.generatedAt,
    stats: transportExp.stats,
  };
}

// AI-tier expand: 20 additional L3 AI surfaces (Codex/Gemini T1, Octopus
// consensus, agentic-flow/claude-flow/ruv-swarm/smart-route T2, 10 more
// T3 specialists, Ollama family additions).
let aiTierNodes = 0, aiTierEdges = 0;
if (aiTierExp?.newNodes) {
  for (const node of aiTierExp.newNodes) {
    if (byId.has(node.id)) continue;
    addNodeIndexed(node);
    aiTierNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (aiTierExp.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    aiTierEdges++;
  }
  G.meta.aiTierExpand = {
    generatedAt: aiTierExp.generatedAt,
    stats: aiTierExp.stats,
  };
}

// Actions atomic: drill every dispatcher's switch-case action enum into atomic
// L4a nodes parented under their dispatcher. ~9k action nodes — every callable
// surface in the system now has its own node.
let actionNodes = 0, actionEdges = 0;
if (actionsAtomic?.newNodes) {
  for (const node of actionsAtomic.newNodes) {
    if (byId.has(node.id)) continue;
    addNodeIndexed(node);
    actionNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (actionsAtomic.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    actionEdges++;
  }
  G.meta.actionsAtomic = {
    generatedAt: actionsAtomic.generatedAt,
    stats: actionsAtomic.stats,
  };
}

// Generic indexed-merge helper for the 4th-wave generators. All emit
// {newNodes, newEdges} so the merge logic is identical.
function mergeIndexedAugmentation(aug, name) {
  if (!aug?.newNodes) return [0, 0];
  let nodeCount = 0, edgeCount = 0;
  for (const node of aug.newNodes) {
    if (byId.has(node.id)) continue;
    addNodeIndexed(node);
    nodeCount++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (aug.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    edgeCount++;
  }
  G.meta[name] = { generatedAt: aug.generatedAt, stats: aug.stats };
  return [nodeCount, edgeCount];
}

const [hookNodes,    hookEdges]    = mergeIndexedAugmentation(hooksAtomic,    "hooksAtomic");
const [testNodes,    testEdges]    = mergeIndexedAugmentation(testsAtomic,    "testsAtomic");
const [scriptNodesA, scriptEdgesA] = mergeIndexedAugmentation(scriptsAtomic,  "scriptsAtomic");
const [memoryNodes,  memoryEdges]  = mergeIndexedAugmentation(memoriesAtomic, "memoriesAtomic");
const [regEntNodes,  regEntEdges]  = mergeIndexedAugmentation(registryEnts,   "registryEntries");
const [camVCNodes,   camVCEdges]   = mergeIndexedAugmentation(camVendorCat,   "camVendorCatalog");
const [tsRENodes,    tsREEdges]    = mergeIndexedAugmentation(tsRegistryEnts, "tsRegistryEntries");
const [phyANodes,    phyAEdges]    = mergeIndexedAugmentation(physicsAtomic,  "physicsAtomic");

// Edge-only augmentations (no new nodes; just connect existing)
function mergeEdgesOnly(aug, name) {
  if (!aug?.newEdges) return 0;
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  let added = 0;
  for (const edge of aug.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    added++;
  }
  G.meta[name] = { generatedAt: aug.generatedAt, stats: aug.stats };
  return added;
}
const engineImpEdgeCount = mergeEdgesOnly(engineImpEdges, "engineImportEdges");
const testCovEdgeCount   = mergeEdgesOnly(testCovEdges,   "testCoverageEdges");
const [jmDieNodes,   jmDieEdges]   = mergeIndexedAugmentation(jmDieCust,      "jmDieCustomers");
const [frontDNodes,  frontDEdges]  = mergeIndexedAugmentation(frontendDeep,   "frontendDeep");
const [wikiXNodes,   wikiXEdges]   = mergeIndexedAugmentation(wikiCrossRefs,  "wikiCrossRefs");
const [xtractNodes,  xtractEdges]  = mergeIndexedAugmentation(extractDataAtm, "extractedDataAtomic");
const [datacatNodes, datacatEdges] = mergeIndexedAugmentation(dataCatAtm,     "dataCatalogsAtomic");
const [gitTreeNodes, gitTreeEdges] = mergeIndexedAugmentation(gitTree,        "gitTree");
const [vaultGNodes,  vaultGEdges]  = mergeIndexedAugmentation(vaultGraph,     "vaultGraph");
const schemaEdgeCount = mergeEdgesOnly(schemaEngEdges,  "schemaEngineEdges");
const physEdgeCount   = mergeEdgesOnly(enginePhyEdges,  "enginePhysicsEdges");

// Action-engine edges (edges only — no new nodes)
let actEngEdges = 0;
if (actionEngEdges?.newEdges) {
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of actionEngEdges.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    actEngEdges++;
  }
  G.meta.actionEngineEdges = {
    generatedAt: actionEngEdges.generatedAt,
    stats: actionEngEdges.stats,
  };
}

// Ghost summary — quick HUD signal of total ghost surface.
{
  let ghostNodes = 0, ghostEdges = 0;
  for (const n of G.nodes) if (n.ghost === true || n.status === "ghost") ghostNodes++;
  for (const e of G.edges) if (e.status === "ghost") ghostEdges++;
  G.meta.ghostSummary = { ghostNodes, ghostEdges };
}

G.meta.augmentationVersions = versions;
G.schemaVersion = "2.29.0";
fs.writeFileSync(graphPath, JSON.stringify(G));
console.log(`merged augmentations into ${graphPath}`);
console.log(`  obsidian: ${obsidian ? "yes" : "missing"}  awareness: ${awareness ? "yes" : "missing"}  novelty: ${novelty ? "yes" : "missing"}  business: ${business ? "yes" : "missing"}`);
console.log(`  nodes augmented: ${mergedNodes}  coreInventory: ${coreInventoryChildren}  fsInventory: ${fsInventoryChildren}  engineDomain: ${engineDomainChildren}  knowledgeInv: ${knowledgeInvChildren}  stalenessAnnotated: ${stalenessAnnotated}  fsDeep: ${fsDeepNodes} nodes, ${fsDeepEdges} edges  l11Leaves: ${l11Nodes} nodes, ${l11Edges} edges  wiring: ${wiringAnnotated} annotated, ${wiringPhantomEdges} phantom edges  galaxies: ${galaxyAnnotated} (+${galaxyMolsAttached} planets)  knowledge: ${knowledgeNodes} nodes, ${knowledgeEdges} edges, ${knowledgeAnnotated} annotated  layerBridges: ${bridgeEdges} new edges  stagnant: ${stagnantNodes} nodes / ${stagnantEdges} edges  engineGraph: ${engineGraphNodes} nodes / ${engineGraphEdges} edges  hookBridges: ${hookBridgesEdges} edges  frontendPages: ${frontendPageNodes} nodes / ${frontendPageEdges} edges  combo: ${comboNodes} nodes / ${comboEdges} edges  engineSat: ${engSatNodes} nodes / ${engSatEdges} edges  wikiEntries: ${wikiNodes} nodes / ${wikiEdges} edges  formulasAtomic: ${formulaNodes} / ${formulaEdges}  personas: ${personaNodes} / ${personaEdges}  skills: ${skillNodes} / ${skillEdges}  schemas: ${schemaNodes} / ${schemaEdges}  algos: ${algoNodes} / ${algoEdges}  transport: ${transportNodes} / ${transportEdges}  aiTier: ${aiTierNodes} / ${aiTierEdges}  actions: ${actionNodes} / ${actionEdges}  hooks: ${hookNodes} / ${hookEdges}  tests: ${testNodes} / ${testEdges}  scriptsAtom: ${scriptNodesA} / ${scriptEdgesA}  memories: ${memoryNodes} / ${memoryEdges}  regEnt: ${regEntNodes} / ${regEntEdges}  actEng: 0 / ${actEngEdges}  ghosts: ${G.meta.ghostSummary.ghostNodes} nodes / ${G.meta.ghostSummary.ghostEdges} edges`);
console.log(`  L7-saturation: camVendor=${camVCNodes}n/${camVCEdges}e  tsRegEnt=${tsRENodes}n/${tsREEdges}e  physics=${phyANodes}n/${phyAEdges}e`);
console.log(`  L5-edges:      engineImp=${engineImpEdgeCount} new edges  testCov=${testCovEdgeCount} new edges`);
console.log(`  Phase 2:       jmDie=${jmDieNodes}n/${jmDieEdges}e  frontendDeep=${frontDNodes}n/${frontDEdges}e  wikiX=${wikiXNodes}n/${wikiXEdges}e  schemaEng=${schemaEdgeCount}e  enginePhys=${physEdgeCount}e`);
console.log(`  Phase 3:       extractedDataAtomic=${xtractNodes}n/${xtractEdges}e  dataCatalogsAtomic=${datacatNodes}n/${datacatEdges}e  gitTree=${gitTreeNodes}n/${gitTreeEdges}e  vaultGraph=${vaultGNodes}n/${vaultGEdges}e`);
console.log(`  schema bumped to 2.29.0`);
