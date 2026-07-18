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
import { spawnSync } from "node:child_process";
import v8 from "node:v8";

// Self-reexec with adequate heap if invoked under-heaped (REGRESSION-FIX,
// slot:bravo 2026-05-26, per feedback_bravo_golf_papa_quebec_fix_known_failures).
// The merge of all augmentations into the 542MB+ system-graph.json needs ~12GB
// resident; with V8 default ~4GB max-old-space, the script OOMs at the final
// writeGraphStreaming stringify with "Reached heap limit Allocation failed".
// regen-viz.mjs already passes --max-old-space-size=16384 when spawning this
// script, but direct invocation (rtk node, npm run, manual debug) silently
// loses that flag.  This block re-execs with adequate heap so the script is
// safe to call from any wrapper.  Bypass: PRISM_MERGE_AUG_REEXEC=1.
// 24GB — bumped from 12288 (slot:sierra 2026-05-29, U-VIZ-MERGE-HEAP-HEADROOM): the 12GB floor
// was the observed *minimum* for a 542MB graph, leaving no headroom; the graph grew to 576MB
// and the merge intermittently OOM'd (exit 134) even at regen-viz's 16GB. Matched to regen-viz
// NODE_ARGS (24GB) so a standalone `node merge-augmentations.mjs` gets the same headroom the
// pipeline now gives. Host has 136GB total — 24GB is safe.
const HEAP_MB_REQUIRED = 24576;
if (!process.env.PRISM_MERGE_AUG_REEXEC) {
  const heapMaxMB = Math.floor(v8.getHeapStatistics().heap_size_limit / 1024 / 1024);
  if (heapMaxMB < HEAP_MB_REQUIRED * 0.9) {
    const r = spawnSync(process.execPath,
      [`--max-old-space-size=${HEAP_MB_REQUIRED}`, ...process.argv.slice(1)],
      { stdio: "inherit", env: { ...process.env, PRISM_MERGE_AUG_REEXEC: "1" } });
    process.exit(r.status ?? 1);
  }
}

import { readGraphStreaming, writeGraphStreamingAtomic, exceedsStringParseCap } from "./lib/graph-io.mjs";
import { canonicalizeGraphEdgeTargets } from "./lib/viz-engine-node-id-canon.mjs";
import { shouldSkipStaleMerge, INTENTIONAL_NO_PRODUCER } from "./lib/augmentation-freshness.mjs";
import { makeClassNameResolver } from "./lib/class-name-node-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

// Augmentations that cross V8's ~512MiB string cap (obsidian-augmentation.json is
// 416MB and climbing) can't be JSON.parse()'d through a string. The old
// `JSON.parse(fs.readFileSync(p,"utf8"))` THREW on such a file and the catch
// silently returned null -> the augmentation was SILENTLY DROPPED: at >512MiB every
// node's wiki/memory linkage would vanish with no error (silent master-index
// degradation, R12). Now: read as an off-heap Buffer, and if it exceeds the cap,
// record + log LOUD (never silent) and return null; only string-parse under the cap.
// A streaming loader that PRESERVES oversize linkage is the documented next unit.
// (U-VIZ-MERGE-AUG-CAP-GUARD, 2026-06-09)
const OVERSIZE_DROPPED = [];
// STALE-SKIP (opt-in, default OFF): rather than fold days-old data from a dead/retired
// producer into the canonical graph, the merge can SKIP an augmentation older than a
// generous threshold when an operator sets PRISM_MERGE_STALE_SKIP=1. The freshness audit
// (.augmentation-freshness.json, surfaced on the sierra graph-health badge) is the SIGNAL;
// this is the LEVER. Default OFF so a data-dropping policy never flips on by surprise.
// reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21.
const STALE_SKIPPED = [];
const MERGE_STALE_SKIP = process.env.PRISM_MERGE_STALE_SKIP === "1";
const MERGE_STALE_SKIP_HR = Number(process.env.PRISM_MERGE_STALE_SKIP_HR) || undefined;
function loadOptional(name) {
  const p = path.join(VIZ_DIR, name);
  if (!fs.existsSync(p)) return null; // genuinely absent -> fine, stay quiet
  if (MERGE_STALE_SKIP && !INTENTIONAL_NO_PRODUCER.has(name)) {
    // INTENTIONAL_NO_PRODUCER augmentations (hand-curated / external-audit, no regen generator) are
    // intentionally aged -- never drop them via the stale-skip lever, or we lose real coverage
    // (e.g. the hand-curated engine-spotlight catalog). U-VIZ-FRESHNESS-INTENTIONAL-ALLOWLIST.
    try {
      const ageMs = Date.now() - fs.statSync(p).mtimeMs;
      if (shouldSkipStaleMerge(ageMs, { enabled: true, thresholdHr: MERGE_STALE_SKIP_HR })) {
        const ageHr = +(ageMs / 3_600_000).toFixed(1);
        STALE_SKIPPED.push({ name, ageHr });
        console.error(`[merge-augmentations] STALE-SKIP: ${name} is ${ageHr}h stale (PRISM_MERGE_STALE_SKIP=1) -- NOT folding its days-old data; re-wire its generator into regen-viz or remove its loadOptional() to retire it. Reported in the merge summary.`);
        return null;
      }
    } catch { /* stat failed -> fall through and load normally (fail-safe: fold, never wrongly drop) */ }
  }
  let buf;
  try { buf = fs.readFileSync(p); } catch { return null; }
  if (exceedsStringParseCap(buf.length)) {
    const mb = +(buf.length / 1048576).toFixed(1);
    OVERSIZE_DROPPED.push({ name, mb });
    console.error(`[merge-augmentations] OVERSIZE: ${name} is ${mb}MB > V8's ~512MiB string cap -- cannot JSON.parse via a string; DROPPING this augmentation (needs a streaming loader or sharding). Reported loud in the merge summary -- this is NOT a silent drop.`);
    return null;
  }
  try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
}

// Streaming graph I/O is extracted to scripts/lib/graph-io.mjs (papa /loop
// 2026-05-23). All downstream consumers of system-graph.json that fail on
// >512MB files should migrate to readGraphStreaming/writeGraphStreaming from
// the lib. Test coverage: scripts/lib/graph-io.test.mjs (11/11 PASS).

const graphPath = path.join(VIZ_DIR, "system-graph.json");
if (!fs.existsSync(graphPath)) {
  console.error(`base graph missing: ${graphPath}\n  run: node scripts/generate-system-viz.mjs`);
  process.exit(2);
}
// Streaming read — bypasses V8 ~512MB max-string-length ceiling on
// JSON.parse(fs.readFileSync(graphPath, "utf8")) for graphs >450MB.
// See readGraphStreaming() docblock for the full diagnostic.
const G = readGraphStreaming(graphPath);

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
const spotlight  = loadOptional("engine-spotlight.json");  // KEEP-AS-IS (U-VIZ-AUG-STALE-REWIRE, sierra 2026-06-22): hand-curated STATIC editorial catalog (categories/ratings/whatItDoes/technique per engine for HUD/Tour) -- NO generator exists, so it shows "stale-orphan" in the freshness audit but is intentionally not regen-able. Do NOT chase a missing producer; update by hand. Folded into G.meta.spotlight.byId below.
const newlyBuilt = loadOptional("newly-built.json");
const molecules  = loadOptional("molecules-augmentation.json");
const fileCoverage = loadOptional("file-coverage-augmentation.json");
const fileCoverageV2 = loadOptional("file-coverage-v2-augmentation.json");
const heuristicCov   = loadOptional("heuristic-classification.json");
const vaultAtomic    = loadOptional("vault-atomic-augmentation.json");  // U-VIZ-VAULT-ATOMIC-WIRE (sierra 2026-06-22): every knowledge/* note (excl wiki/memories) as an L8 vault_entry under a per-namespace rollup, so the Obsidian vault content is queryable in /system-viz. Generator generate-vault-atomic.mjs was a dual-reg ORPHAN (emitted output but never in regen-viz FAST[]) -> vault-atomic nodes silently absent. Folded below; FAST[] wired same commit.
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
const miscTasks      = loadOptional("misc-tasks-augmentation.json");
const collegeCourses = loadOptional("college-course-augmentation.json");
const resourcePdfs   = loadOptional("resource-pdf-augmentation.json");
const pdfCourseBridge = loadOptional("pdf-course-bridge-augmentation.json");
const cadcamTrainingCorpus = loadOptional("cadcam-training-corpus-augmentation.json");
const extractedPdfTips = loadOptional("extracted-pdf-tips-augmentation.json");
const pdfCoverage = loadOptional("pdf-coverage-augmentation.json");
const millingExtractedPdfBridge = loadOptional("milling-extracted-pdf-bridge-augmentation.json");  // VIZ-XGAL-MILL-PDF-WIRE (slot:sierra 2026-06-23)
const tokenSavingsPivot = loadOptional("token-savings-pivot-augmentation.json");
const forgeAuditTokenContext = loadOptional("forge-audit-token-context-augmentation.json");  // FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26 (slot:alpha)
const bridgeSynergy  = loadOptional("bridge-synergy-augmentation.json");
const bridgePriority = loadOptional("bridge-priority-augmentation.json");  // COMBO-EFFICIENCY-MS0/P1-U03 viz wire (slot:alpha 2026-05-25)
const slotBindingHealth = loadOptional("slot-binding-augmentation.json");  // SLOT-BRIDGE-MS0/U-SBB06 viz wire (slot:alpha 2026-05-26)
const priorityQueue  = loadOptional("priority-queue-augmentation.json");
const dreamArtifacts = loadOptional("dream-artifacts-augmentation.json");  // DREAM-RECEIPT-MS0/U-DR09 (slot:bravo 2026-05-26)
const hermesApp     = loadOptional("hermes-augmentation.json");  // HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST (slot:bravo 2026-06-05)
const testingInfra   = loadOptional("testing-infra-augmentation.json");  // TESTING-INFRA-MS0/U-AXIS1-VIZ-CLOSURE (slot:tango 2026-05-26)
const slotQueue      = loadOptional("slot-queue-augmentation.json");  // SLOT-RECOVERY-MS0/U-FD06 (slot:golf /loop iter10 2026-05-25)
const chatSlotNodes  = loadOptional("chat-slot-nodes-augmentation.json");  // ZULU-CHAT-SLOT-NODES-MS0 (slot:bravo 2026-05-25): per-slot nodes + PSN synergy
const databaseSurfaces = loadOptional("database-surfaces-augmentation.json");
const hotelDomain    = loadOptional("hotel-domain-features.json");
const quotingPipeline = loadOptional("quoting-pipeline-augmentation.json");
// U-VIZ-FAST-REGISTER-9 (sierra 2026-05-30): 3 measured roosts wired (12+15+45 curated nodes).
// milling-tribal emits newNodes/newEdges + proper shape; svi-component + vendor-catalog emit
// nodes/edges (light kind-normalize in their splice). All 3 now write to VIZ_DIR root.
const millingTribalBridge = loadOptional("milling-tribal-tip-bridge-augmentation.json");
const sviComponent   = loadOptional("svi-component-features.json");
const vendorCatalog  = loadOptional("vendor-catalog-features.json");
const octopusConsensus = loadOptional("octopus-consensus-augmentation.json");  // PSN-OCTOPUS-FLEET-SYNERGY-MS0/U-FLEET-CONSUME-VIZ (slot:bravo 2026-06-01): per-galaxy octopus consensus roost — newNodes/newEdges, internal-only edges.
const predictedEdges = loadOptional("predicted-missing-edges-augmentation.json");  // BLACKWELL-AI-MS0/U-GNN-EDGE-PREDICT-VIZ (slot:india 2026-06-09): predicted MISSING knowledge edges roost (GraphSAGE link-prediction) — newNodes/newEdges, internal-only contains edges.
// U-VIZ-ECHO-ROOST-SPLICE (slot:sierra 2026-06-22): 3 echo POST-PDF-NODE-MS0 roosts were added to
// regen-viz FAST[] on 2026-05-26 but NEVER spliced here -- they emitted fresh augmentation JSON every
// regen yet folded into NOTHING, dropping ~117 corpus nodes from the search graph since then (the
// FAST[]-without-splice "silent discard" class, caught by the new viz-dual-registration auditor:
// scripts/lib/viz-dual-registration-audit.mjs). Folded below via foldRoostAug, which activates the
// corpus NODES and resolves each bridge edge's bare engine CLASS NAME ("MasterPostProcessorEngine")
// to its live node-id ("eng.cam.masterpostprocessorengine"); endpoints that resolve fold, genuinely
// un-graphed engines drop (never folded as danglers). Measured: +117 nodes, ~185/210 edges recovered.
const citedTipsRoost  = loadOptional("jm-die-cited-tips-augmentation.json");
const tribalWikiRoost = loadOptional("jm-die-tribal-wiki-augmentation.json");
const postPdfRoost    = loadOptional("post-pdf-corpus-augmentation.json");
const episodeStore   = loadOptional("episode-store-augmentation.json");
const hybridRetrieval = loadOptional("hybrid-retrieval-augmentation.json");
const cagRouter       = loadOptional("cag-router-augmentation.json");  // TOKEN-SAVINGS-PIVOT/U-CAG-DASHBOARD (sierra 2026-05-27)
const launchReadiness = loadOptional("launch-readiness-augmentation.json");
const extractedModules = loadOptional("extracted-modules-augmentation.json");
const extractedModulesDetail = loadOptional("extracted-modules-detail-augmentation.json");
const gnnEmbedBridge = loadOptional("gnn-embed-bridge-augmentation.json");
const postGap        = loadOptional("post-gap-augmentation.json");
const ragUpgrade     = loadOptional("rag-upgrade-augmentation.json");
const linkAudit      = loadOptional("link-audit-augmentation.json");
const wikiTribal     = loadOptional("wiki-tribal-augmentation.json");
const substrateMetaRoost = loadOptional("substrate-meta-roost-augmentation.json");
const galaxyFederationRoost = loadOptional("galaxy-federation-roost-augmentation.json");  // GALAXY-CONTEXT-FEDERATION-MS0/U-GCF-VIZ-ROOST (slot:alpha 2026-06-01) — federation roost (cards/digest/knows-map/dedup/savings)
const aiMemoXref     = loadOptional("ai-memo-xref-augmentation.json");
const featureGap     = loadOptional("feature-gap-augmentation.json");
const domainPipeline = loadOptional("domain-pipeline-augmentation.json");
const slotSynergy    = loadOptional("slot-synergy-augmentation.json");
const dockerMcp      = loadOptional("docker-mcp-augmentation.json");
const engineGraph    = loadOptional("engine-graph-augmentation.json");
const hookBridges    = loadOptional("hook-bridges-augmentation.json");
const frontendPages  = loadOptional("frontend-pages-augmentation.json");
const untrackedFiles = loadOptional("untracked-files-augmentation.json");
const echoVizLayers  = loadOptional("echo-viz-layers-augmentation.json");
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
const scriptsLibAtm  = loadOptional("scripts-lib-atomic-augmentation.json");
const milestoneEnvAtm = loadOptional("milestone-envelope-atomic-augmentation.json");
const slotTouchAug    = loadOptional("slot-touch-augmentation.json");
const cadComplAug     = loadOptional("cad-completion-augmentation.json");  // PA4-VIZ-CAD-GRAPH-UPDATE (slot:delta 2026-06-26): ghost.cad_completion roost + per-unit CAD-completion nodes from CAD-COMPLETION-STATUS.json. Producer: generate-cad-completion-augmentation.mjs (regen-viz FAST[]).
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
const ghostWireValidation = loadOptional("ghost-wire-validation-augmentation.json");
const tribalDensity  = loadOptional("tribal-density-augmentation.json");
// CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-CLOSURE-AUGMENTATION (slot:sierra): typed,
// schema-validated cross-substrate edges (owned-by-slot: galaxy/domain node ->
// Hermes slot node). ADD-only; folded edge-only below. Generator:
// scripts/generate-cross-substrate-edges.mjs · schema: scripts/lib/cross-substrate-edge-schema.mjs
const xsubEdges      = loadOptional("cross-substrate-edges-augmentation.json");
const sfcVarSummary  = loadOptional("sfc-variability-summary-augmentation.json");  // VIZ-SFC-VARIABILITY-BOUNDED-FOLD (sierra 2026-06-24): bounded ~9-node structural roost; the 45MB/50K-cell raw augmentation is NEVER folded (OOM class). Folded via foldRoostAug below.

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
if (miscTasks)       versions.miscTasks       = miscTasks.generatedAt       ?? "present";
if (collegeCourses)  versions.collegeCourses  = collegeCourses.generatedAt  ?? "present";
if (resourcePdfs)    versions.resourcePdfs    = resourcePdfs.generatedAt    ?? "present";
if (pdfCourseBridge) versions.pdfCourseBridge = pdfCourseBridge.generatedAt ?? "present";
if (cadcamTrainingCorpus) versions.cadcamTrainingCorpus = cadcamTrainingCorpus.generatedAt ?? "present";
if (extractedPdfTips) versions.extractedPdfTips = extractedPdfTips.generatedAt ?? "present";
if (pdfCoverage) versions.pdfCoverage = pdfCoverage.generatedAt ?? "present";
if (tokenSavingsPivot) versions.tokenSavingsPivot = tokenSavingsPivot.generatedAt ?? "present";
if (forgeAuditTokenContext) versions.forgeAuditTokenContext = forgeAuditTokenContext.generatedAt ?? "present";
if (bridgePriority)  versions.bridgePriority  = bridgePriority.generatedAt  ?? "present";
if (bridgeSynergy)   versions.bridgeSynergy   = bridgeSynergy.generatedAt   ?? "present";
if (slotQueue)       versions.slotQueue       = slotQueue.generatedAt       ?? "missing-generatedAt";
if (chatSlotNodes)   versions.chatSlotNodes   = chatSlotNodes.generated_at   ?? "present";
if (priorityQueue)   versions.priorityQueue   = priorityQueue.generatedAt   ?? "present";
if (dreamArtifacts)  versions.dreamArtifacts  = dreamArtifacts.generated_at ?? "present";
if (hermesApp)       versions.hermesApp       = hermesApp.generated_at ?? "present";
if (testingInfra)    versions.testingInfra    = testingInfra.generatedAt    ?? "present";
if (quotingPipeline) versions.quotingPipeline = quotingPipeline.generatedAt ?? "present";
if (episodeStore)    versions.episodeStore    = episodeStore.generatedAt    ?? "present";
if (hybridRetrieval) versions.hybridRetrieval = hybridRetrieval.generatedAt ?? "present";
if (cagRouter)       versions.cagRouter       = cagRouter.generatedAt       ?? "present";
if (launchReadiness) versions.launchReadiness = launchReadiness.generatedAt ?? "present";
if (gnnEmbedBridge)  versions.gnnEmbedBridge  = gnnEmbedBridge.generatedAt  ?? "present";
if (ragUpgrade)      versions.ragUpgrade      = ragUpgrade.generatedAt      ?? "present";
if (linkAudit)       versions.linkAudit       = linkAudit.generatedAt       ?? "present";
if (wikiTribal)      versions.wikiTribal      = wikiTribal.generatedAt      ?? "present";
if (substrateMetaRoost) versions.substrateMetaRoost = substrateMetaRoost.generatedAt ?? "present";
if (galaxyFederationRoost) versions.galaxyFederationRoost = galaxyFederationRoost.generatedAt ?? "present";
if (aiMemoXref)      versions.aiMemoXref      = aiMemoXref.generatedAt      ?? "present";
if (slotSynergy)     versions.slotSynergy     = slotSynergy.generatedAt     ?? "present";
if (engineGraph)     versions.engineGraph     = engineGraph.generatedAt     ?? "present";
if (hookBridges)     versions.hookBridges     = hookBridges.generatedAt     ?? "present";
if (frontendPages)   versions.frontendPages   = frontendPages.generatedAt   ?? "present";
if (untrackedFiles)  versions.untrackedFiles  = untrackedFiles.generatedAt  ?? "present";
if (echoVizLayers)   versions.echoVizLayers   = echoVizLayers.generatedAt   ?? "present";
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
if (scriptsLibAtm)   versions.scriptsLibAtomic = scriptsLibAtm.generatedAt   ?? "present";
if (milestoneEnvAtm) versions.milestoneEnvelopeAtomic = milestoneEnvAtm.generatedAt ?? "present";
if (slotTouchAug)    versions.slotTouch       = slotTouchAug.generatedAt    ?? "present";
if (cadComplAug)     versions.cadCompletion   = cadComplAug.generatedAt     ?? "present";
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
if (ghostWireValidation) versions.ghostWireValidation = ghostWireValidation.generatedAt ?? "present";
if (tribalDensity)   versions.tribalDensity   = tribalDensity.generatedAt   ?? "present";

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

// Vault-atomic -- fold the Obsidian vault content (every knowledge/* note excl wiki/memories)
// as L8 vault_entry nodes under per-namespace rollups, so the vault is queryable in /system-viz.
// generate-vault-atomic.mjs emits {newNodes,newEdges}; it was a dual-reg ORPHAN until
// U-VIZ-VAULT-ATOMIC-WIRE (sierra 2026-06-22) wired BOTH this fold and the regen-viz FAST[] entry.
// Same simple node+edge dedup-splice as fsInventory above (no byParent label rewrite).
let vaultAtomicChildren = 0;
if (vaultAtomic?.newNodes && vaultAtomic?.newEdges) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of vaultAtomic.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    vaultAtomicChildren++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of vaultAtomic.newEdges) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
  }
  G.meta.vaultAtomic = {
    generatedAt: vaultAtomic.generatedAt,
    stats: vaultAtomic.stats,
    folded: vaultAtomicChildren,
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

// Ghost-wire validation overlay (SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-GHOST-WIRE-VALIDATE,
// 2026-05-21 sierra). Each ghost.unwired-engine node gets a confirmed/refuted/
// pending status stamp by scripts/validate-ghost-wires.mjs; this block paints
// those stamps onto the live graph so the /system-viz overlay can color them
// (green/red/amber per STATUS_INTENSITIES). Edges of type "ghost-wire-validation"
// re-anchor the proposed-wire arc with the same status signal — they are
// SEPARATE from the original "proposed-wire" edges (which stay in place so the
// reviewer can see both the prediction and the validation outcome side-by-side).
let ghostWireAnnotated = 0, ghostWireEdgesAdded = 0;
if (ghostWireValidation?.annotations && ghostWireValidation?.edges) {
  const byId = new Map(G.nodes.map(n => [n.id, n]));
  for (const [id, ann] of Object.entries(ghostWireValidation.annotations)) {
    const node = byId.get(id);
    if (!node) continue;
    Object.assign(node, ann);
    ghostWireAnnotated++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of ghostWireValidation.edges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    ghostWireEdgesAdded++;
  }
  G.meta.ghostWireValidation = {
    generatedAt: ghostWireValidation.generatedAt,
    version: ghostWireValidation.version,
    counts: ghostWireValidation.counts,
    annotated: ghostWireAnnotated,
    edgesAdded: ghostWireEdgesAdded,
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

// CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-CLOSURE+ROOST (slot:sierra): fold the typed
// cross-substrate galaxy-roost NODES (one per PSN galaxy) then the owned-by-slot
// EDGES (galaxy/domain node -> Hermes slot node). ADD-only; nodes deduped by id,
// edges by (from|to|type), like every block above. Nodes are folded FIRST so the
// roost->slot edges reference an existing node. Each edge carries
// {source,confidence,addedBy,addedAt} so a graded inference (confidence<1) is
// never read as ground truth downstream.
let xsubNodesAdded = 0, xsubEdgesAdded = 0;
if (Array.isArray(xsubEdges?.newNodes) && xsubEdges.newNodes.length) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of xsubEdges.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    xsubNodesAdded++;
  }
}
if (Array.isArray(xsubEdges?.newEdges) && xsubEdges.newEdges.length) {
  G.edges ??= [];
  const ek = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingXsub = new Set(G.edges.map(ek));
  for (const edge of xsubEdges.newEdges) {
    const k = ek(edge);
    if (existingXsub.has(k)) continue;
    G.edges.push(edge);
    existingXsub.add(k);
    xsubEdgesAdded++;
  }
  G.meta.crossSubstrateEdges = {
    generatedAt: xsubEdges.generatedAt,
    nodesAdded: xsubNodesAdded,
    added: xsubEdgesAdded,
    edgeSchemaVersion: xsubEdges.edgeSchemaVersion,
  };
}

// U-VIZ-ECHO-ROOST-SPLICE (slot:sierra 2026-06-22): fold the 3 previously-dropped echo roosts.
// Shared local fold for the standard ADD-only {newNodes,newEdges} roost shape -- clones the proven
// sibling pattern (coreInventory/xsubEdges/...): nodes deduped by id, edges by from|to|kind. Local
// to these 3 roosts; the older sibling blocks stay inline (no risky refactor of working code).
// Resolve a roost bridge edge endpoint (often a bare engine CLASS NAME like "MasterPostProcessorEngine")
// to its live node-id ("eng.cam.masterpostprocessorengine"). The reusable resolver core lives in
// scripts/lib/class-name-node-resolver.mjs (U-VIZ-ROOST-RESOLVER-LIB; also consumable by ghost-roost
// generators against the offset oracle). Index built ONCE over the live merged graph G; the per-call
// `ids` set (which includes a roost's own just-added nodes) is the validity check. Returns null when
// unresolvable -> caller drops the edge, never folds a dangler. Scheme verified per
// reference_orphan_augmentation_dangling_diagnosis_2026_06_10.
let _roostResolve = null;
function resolveEndpoint(ref, ids) {
  if (!_roostResolve) _roostResolve = makeClassNameResolver(G.nodes.map((n) => n.id));
  return _roostResolve(ref, ids);
}
function foldRoostAug(aug, metaKey) {
  let nodesAdded = 0, edgesAdded = 0, edgesResolved = 0, edgesDropped = 0;
  const ids = new Set(G.nodes.map(n => n.id));
  if (Array.isArray(aug?.newNodes)) {
    for (const node of aug.newNodes) {
      if (!node?.id || ids.has(node.id)) continue;
      G.nodes.push(node); ids.add(node.id); nodesAdded++;
    }
  }
  if (Array.isArray(aug?.newEdges) && aug.newEdges.length) {
    G.edges ??= [];
    const ek = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? e.kind ?? ""}`;
    const seen = new Set(G.edges.map(ek));
    for (const edge of aug.newEdges) {
      const rawFrom = edge.from || edge.source, rawTo = edge.to || edge.target;
      const from = resolveEndpoint(rawFrom, ids), to = resolveEndpoint(rawTo, ids);
      // ENDPOINT-VALIDATE against the live merged graph -- NEVER fold a dangling edge into the
      // fleet search substrate (sierra #1 refuse). Unresolvable (genuinely un-graphed engine) -> drop.
      if (!from || !to) { edgesDropped++; continue; }
      if (from !== rawFrom || to !== rawTo) edgesResolved++;
      const folded = (from !== rawFrom || to !== rawTo) ? { ...edge, from, to } : edge;
      const k = ek(folded);
      if (seen.has(k)) continue;
      G.edges.push(folded); seen.add(k); edgesAdded++;
    }
  }
  if (nodesAdded || edgesAdded || edgesDropped) {
    G.meta[metaKey] = { generatedAt: aug?.generatedAt, nodesAdded, added: edgesAdded, edgesResolved, edgesDropped };
  }
  return { nodesAdded, edgesAdded, edgesResolved, edgesDropped };
}
foldRoostAug(citedTipsRoost, "citedTipsRoost");
foldRoostAug(tribalWikiRoost, "tribalWikiRoost");
foldRoostAug(postPdfRoost, "postPdfRoost");
foldRoostAug(sfcVarSummary, "sfcVariabilitySummary");  // VIZ-SFC-VARIABILITY-BOUNDED-FOLD (sierra 2026-06-24): 9 structural sfc roosts + 7 edges; 50K raw cells aggregated-not-folded (roost.metadata.cellsAggregated). FAST[] generator: generate-sfc-variability-summary.mjs.

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

// Tribal-density heatmap roost: the "Tribal Density" ghost parent + one
// L9 child per domain bucket (sized by tribal-tip count, tagged hot/warm/
// cold band). Complements the wiki-tribal coverage roost (which finds gaps)
// by showing where tribal knowledge ALREADY accumulates.
// Source: knowledge/wiki/code-tribal/**/*.md via
// scripts/generate-tribal-density-features.mjs.
let tribalDensityNodes = 0, tribalDensityEdges = 0;
if (tribalDensity?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of tribalDensity.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    tribalDensityNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (tribalDensity.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    tribalDensityEdges++;
  }
  G.meta.tribalDensity = {
    generatedAt: tribalDensity.generatedAt,
    stats: tribalDensity.stats,
  };
}

// Misc-tasks roost: the "Misc Tasks" ghost parent + one misc-task child per
// orphaned-incomplete-work item — work found across all PRISM chats that was
// never finished and never formalized into a roadmap unit / milestone envelope.
// Source: state/shared/specs/MISC-TASKS-INVENTORY.json via
// scripts/generate-misc-tasks-features.mjs.
let miscTaskNodes = 0, miscTaskEdges = 0;
if (miscTasks?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of miscTasks.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    miscTaskNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (miscTasks.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    miscTaskEdges++;
  }
  G.meta.miscTasks = {
    generatedAt: miscTasks.generatedAt,
    stats: miscTasks.stats,
  };
}

// College-course layer: the "ghost.college_courses" roost + one college-course
// child per AUTOGEN-SPEC under state/shared/college-course-specs/. Renders the
// lima execution queue (96 courses across 6 kinds — mit-ocw, basic-training,
// knowledge-pack, handbook-pdfs, prism-training, prism-personal).
// Source: state/shared/college-course-specs/AUTOGEN-SPEC-*.md via
// scripts/generate-college-course-features.mjs.
let collegeCourseNodes = 0, collegeCourseEdges = 0;
if (collegeCourses?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of collegeCourses.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    collegeCourseNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (collegeCourses.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    collegeCourseEdges++;
  }
  G.meta.collegeCourses = {
    generatedAt: collegeCourses.generatedAt,
    stats: collegeCourses.stats,
  };
}

// Resource-PDF layer: the "ghost.resource_pdfs" roost + one resource-pdf child
// per AUTOGEN-EXTRACT-SPEC under state/shared/resource-pdf-specs/. Renders the
// /pdf-learn execution queue (893 PDFs across 5 kinds — machining-handbook,
// resource-catalog, blueprint-pdf, manual-pdf, other-pdf).
// Source: state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-*.md via
// scripts/generate-resource-pdf-features.mjs.
let resourcePdfNodes = 0, resourcePdfEdges = 0;
if (resourcePdfs?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of resourcePdfs.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    resourcePdfNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (resourcePdfs.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    resourcePdfEdges++;
  }
  G.meta.resourcePdfs = {
    generatedAt: resourcePdfs.generatedAt,
    stats: resourcePdfs.stats,
  };
}

// PDF-Course bridge layer: edges-only augmentation linking ghost.resource_pdfs
// + ghost.college_courses children to their LOGICAL CONNECTED engine nodes.
// Closes the "wire and bridge to logical connected nodes" leg.
// Source: scripts/generate-pdf-course-bridge-features.mjs (2541 edges typical).
let pdfCourseBridgeEdges = 0;
if (pdfCourseBridge?.newEdges) {
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of pdfCourseBridge.newEdges) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    pdfCourseBridgeEdges++;
  }
  G.meta.pdfCourseBridge = {
    generatedAt: pdfCourseBridge.generatedAt,
    stats: pdfCourseBridge.stats,
  };
}

// CAD+CAM training-corpus roost: nodes-only augmentation.
// ghost.cadcam_training_corpus + 2 domain pivots (cad→delta, cam→kilo) + one
// training-source leaf per consolidated entry. Lets delta + kilo discover the
// corpora visually via /system-viz (PSN System Viz leg).
// Source: state/shared/cadcam-consolidated-corpus.json via
// scripts/generate-cadcam-training-corpus-features.mjs (india iter25).
let cadcamTrainingCorpusNodes = 0;
if (cadcamTrainingCorpus?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of cadcamTrainingCorpus.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    cadcamTrainingCorpusNodes++;
  }
  G.meta.cadcamTrainingCorpus = {
    generatedAt: cadcamTrainingCorpus.generatedAt,
    stats: cadcamTrainingCorpus.stats,
  };
}

// Extracted-PDF-tips roost: REAL-content tribal tips extracted from source PDFs
// (india iter27+). ghost.extracted_pdf_tips (L8) + book pivots (L9) + tribal-tip
// leaves (L10). Each leaf encodes [domain · →audience] + tip text + cites the
// originating source.book + page. Synergizes the extraction to PSN leg #6 (System
// Viz) + #5 (Tribal) — delta/kilo/alpha/bravo discover real content via /system-viz.
// Source: state/shared/extracted-pdfs/*.jsonl via
// scripts/generate-extracted-pdf-tips-features.mjs (india iter28).
let extractedPdfTipsNodes = 0;
if (extractedPdfTips?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of extractedPdfTips.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    extractedPdfTipsNodes++;
  }
  G.meta.extractedPdfTips = {
    generatedAt: extractedPdfTips.generatedAt,
    stats: extractedPdfTips.stats,
  };
}

// Milling extracted-PDF bridge (VIZ-XGAL-MILL-PDF-WIRE, slot:sierra 2026-06-23):
// folds whiskey's extracted milling-PDF ledger rows into the L10 jm_die_tribal_wiki_corpus
// roost as L11 "extracted-pages" children + page-extracts/consumed-by/feeds-wizard edges to
// the AI-retrieval engines (KnowledgeCurriculumBridgeEngine + MillMasterOrchestratorFacadeEngine).
// Was foxtrot's untracked dual-reg orphan (2026-05-26); now wired both-or-neither.
// Source: scripts/generate-milling-extracted-pdf-bridge.mjs (FAST[]).
let millingExtractedPdfBridgeNodes = 0;
if (millingExtractedPdfBridge?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of millingExtractedPdfBridge.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    millingExtractedPdfBridgeNodes++;
  }
  G.edges ??= [];
  // kind-aware dedup key (newer foldRoostAug convention, not the older from|to of
  // coreInventory): the 3 edge kinds per node share a child endpoint, so omitting
  // kind risks silently dropping a legitimately-distinct same-(from,to) edge. (3-of-3 P2)
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.kind ?? e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (millingExtractedPdfBridge.newEdges || [])) {
    if (existingEdges.has(edgeKey(edge))) continue;
    G.edges.push(edge);
  }
  G.meta.millingExtractedPdfBridge = {
    generatedAt: millingExtractedPdfBridge.generatedAt,
    stats: millingExtractedPdfBridge.stats,
  };
}

// PDF extraction-coverage roost: structural surfacing of EVERY consolidated PDF
// in the iter23 corpus as a graph leaf, tagged extracted vs pending. Closes the
// "889 longer-tail" gap structurally: even un-curated PDFs become discoverable +
// flagged for batch automation, instead of being invisible.
// Source: state/shared/cadcam-consolidated-corpus.json + state/shared/extracted-pdfs/*.jsonl
// via scripts/generate-pdf-coverage-features.mjs (india iter43).
let pdfCoverageNodes = 0;
if (pdfCoverage?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of pdfCoverage.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    pdfCoverageNodes++;
  }
  G.meta.pdfCoverage = {
    generatedAt: pdfCoverage.generatedAt,
    stats: pdfCoverage.stats,
  };
}

// Token-savings-pivot layer: the "ghost.token_savings_pivot" roost + one
// tsp-classifier child per route-suggest classifier + one tsp-tool child per
// tool name, sized by fire counts from the atomic-write telemetry sidecar.
// Source: state/shared/mcp-route-suggest-stats.json via
// scripts/generate-token-savings-pivot-features.mjs.
let tokenSavingsPivotNodes = 0, tokenSavingsPivotEdges = 0;
if (tokenSavingsPivot?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of tokenSavingsPivot.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    tokenSavingsPivotNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (tokenSavingsPivot.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    tokenSavingsPivotEdges++;
  }
  G.meta.tokenSavingsPivot = {
    generatedAt: tokenSavingsPivot.generatedAt,
    stats: tokenSavingsPivot.stats,
  };
}

// FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26 (slot:alpha): ghost roost + 12 punch-list
// children. Source: hard-coded in scripts/generate-forge-audit-token-context-features.mjs
// (spec at state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md).
let forgeAuditTokenContextNodes = 0, forgeAuditTokenContextEdges = 0;
if (forgeAuditTokenContext?.nodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of forgeAuditTokenContext.nodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    forgeAuditTokenContextNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? e.kind ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (forgeAuditTokenContext.edges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    forgeAuditTokenContextEdges++;
  }
  G.meta.forgeAuditTokenContext = {
    generatedAt: forgeAuditTokenContext.generatedAt,
    stats: forgeAuditTokenContext.stats,
    nodesAdded: forgeAuditTokenContextNodes,
    edgesAdded: forgeAuditTokenContextEdges,
  };
}

// Bridge/synergy layer: the "ghost.bridge_synergy" roost + one bridge-unit
// child per wiring unit (836 unwired engines, domain-grouped) and per
// deep-integration unit (cross-subsystem synergy gaps). Source:
// state/shared/specs/ROADMAP-CONSOLIDATED.json via
// scripts/generate-bridge-synergy-features.mjs.
let bridgeSynergyNodes = 0, bridgeSynergyEdges = 0;
if (bridgeSynergy?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of bridgeSynergy.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    bridgeSynergyNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (bridgeSynergy.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    bridgeSynergyEdges++;
  }
  G.meta.bridgeSynergy = {
    generatedAt: bridgeSynergy.generatedAt,
    stats: bridgeSynergy.stats,
  };
}

// Dream-artifacts layer: ghost.dream_artifacts roost + one dream-artifact child per
// staged/validated/applied/discarded receipt-bundle. Source:
// state/shared/dream-artifacts/<id>/manifest.json via generate-dream-artifacts-features.mjs.
// DREAM-RECEIPT-MS0/U-DR09 (slot:bravo 2026-05-26) — Hermes Dreaming v0.1.0 interop.
let dreamArtifactsNodes = 0, dreamArtifactsEdges = 0;
if (dreamArtifacts?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of dreamArtifacts.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    dreamArtifactsNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (dreamArtifacts.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    dreamArtifactsEdges++;
  }
  G.meta.dreamArtifacts = {
    generated_at: dreamArtifacts.generated_at,
    stats: dreamArtifacts.stats,
  };
}

// Hermes-app layer: ghost.hermes_app roost + native-MCP capability (bridges
// edge to tr.mcp) + one child per skill/cron/output. Source: the external
// Nous Hermes desktop app dirs + knowledge/hermes-outputs/ via
// generate-hermes-features.mjs. HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST (slot:bravo 2026-06-05).
let hermesAppNodes = 0, hermesAppEdges = 0;
if (hermesApp?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of hermesApp.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    hermesAppNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (hermesApp.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    hermesAppEdges++;
  }
  G.meta.hermesApp = {
    generated_at: hermesApp.generated_at,
    stats: hermesApp.stats,
  };
}

// Bridge-priority layer: ghost.bridge_priority roost + one tier-colored
// unwired-bridge child per ranked unwired engine. Source:
// state/shared/UNWIRED-BRIDGES-TOP10.json via generate-bridge-priority-features.mjs.
// COMBO-EFFICIENCY-MS0/P1-U03 viz wire (slot:alpha 2026-05-25).
let bridgePriorityNodes = 0, bridgePriorityEdges = 0;
if (bridgePriority?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of bridgePriority.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    bridgePriorityNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (bridgePriority.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    bridgePriorityEdges++;
  }
  G.meta.bridgePriority = {
    generatedAt: bridgePriority.generatedAt,
    stats: bridgePriority.stats,
  };
}

// Slot-binding health layer: ghost.slot_binding_health roost + one tier-coloured
// slot-binding child per NATO slot. Source: state/shared/slot-branch-bindings.json
// + chat-slots.json via generate-slot-binding-features.mjs.
// SLOT-BRIDGE-MS0/U-SBB06 PSN+/system-viz synergy (slot:alpha 2026-05-26).
let slotBindingNodes = 0, slotBindingEdges = 0;
if (slotBindingHealth?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of slotBindingHealth.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    slotBindingNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (slotBindingHealth.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    slotBindingEdges++;
  }
  G.meta.slotBindingHealth = {
    generatedAt: slotBindingHealth.generatedAt,
    stats: slotBindingHealth.stats,
  };
}

// Priority-queue layer: ghost.priority_queue roost + one color-coded
// priority-unit child per remaining work item from ROADMAP-CONSOLIDATED.
// Source: scripts/generate-priority-queue-features.mjs.
let priorityQueueNodes = 0, priorityQueueEdges = 0;
if (priorityQueue?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of priorityQueue.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    priorityQueueNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (priorityQueue.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    priorityQueueEdges++;
  }
  G.meta.priorityQueue = {
    generatedAt: priorityQueue.generatedAt,
    stats: priorityQueue.stats,
  };
}

// Testing-infra layer: ghost.testing_infra roost + 4 testing-infra-axis
// children, one per axis engine shipped in TESTING-INFRA-MS0/U-AXIS2-3-4
// (slot:tango 2026-05-25 commits 68b62b1152 + 2bc580d536). Each axis carries
// pass-count/total atomic values + dispatcher action + engine source path.
// Closes the Axis 1 (PSN/system-viz wiring) gap from that handoff.
// Source: scripts/generate-testing-infra-features.mjs.
// Spec: TESTING-INFRA-MS0/U-AXIS1-VIZ-CLOSURE (slot:tango 2026-05-26).
let testingInfraNodes = 0, testingInfraEdges = 0;
if (testingInfra?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of testingInfra.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    testingInfraNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (testingInfra.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    testingInfraEdges++;
  }
  G.meta.testingInfra = {
    generatedAt: testingInfra.generatedAt,
    stats: testingInfra.stats,
  };
}

// Slot-queue layer: ghost.slot_queue roost + one ghost.slot_queue.<nato>
// subgroup per active slot + slot-queue-unit children per pending unit from
// state/shared/slot-task-queues.json. Dedicated tasks colored per-slot NATO
// palette; general_pool (dedicated=false) colored gray.
// Source: scripts/generate-slot-queue-features.mjs.
// Spec: state/shared/specs/SLOT-RECOVERY-MS0.md#U-FD06 (slot:golf 2026-05-25).
let slotQueueNodes = 0, slotQueueEdges = 0;
if (slotQueue?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of slotQueue.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    slotQueueNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (slotQueue.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    slotQueueEdges++;
  }
  G.meta.slotQueue = {
    generatedAt: slotQueue.generatedAt,
    stats: slotQueue.stats,
  };
}

// Chat-slot fleet nodes: ghost.chat_fleet L8 roost + 26 NATO slot children
// with PSN synergy edges (soul/loop/token/branch/domain). Source:
// scripts/generate-chat-slot-nodes-features.mjs. Spec: ZULU-CHAT-SLOT-NODES-MS0
// (slot:bravo 2026-05-25, follow-up to ZULU-OMNISCIENT-MS0 envelope close).
let chatSlotNodesNodes = 0, chatSlotNodesEdges = 0;
if (chatSlotNodes?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of chatSlotNodes.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    chatSlotNodesNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? e.kind ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (chatSlotNodes.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    chatSlotNodesEdges++;
  }
  G.meta.chatSlotNodes = {
    generatedAt: chatSlotNodes.generated_at,
    stats: chatSlotNodes.stats,
  };
}

// Database-surfaces layer: ghost.database_surfaces L7 roost + one
// database-surface child per PRISM storage backend, tagged with PSN leg owner,
// backend type, status (wired/unwired/external/ghost), and bridge-gap count.
// Source: scripts/generate-database-surfaces-roost.mjs.
// Spec: state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md.
let databaseSurfacesNodes = 0, databaseSurfacesEdges = 0;
if (databaseSurfaces?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of databaseSurfaces.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    databaseSurfacesNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (databaseSurfaces.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    databaseSurfacesEdges++;
  }
  G.meta.databaseSurfaces = {
    generatedAt: databaseSurfaces.generatedAt,
    stats: databaseSurfaces.stats,
  };
}

// Hotel-domain layer: ghost.business_frontend + ghost.shop_safety +
// ghost.realtime_accounting roosts with one hotel-action child per
// classified prism_business / prism_shop dispatcher action.
// Source: scripts/generate-hotel-domain-features.mjs.
let hotelDomainNodes = 0, hotelDomainEdges = 0;
if (hotelDomain?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of hotelDomain.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    hotelDomainNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (hotelDomain.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    hotelDomainEdges++;
  }
  G.meta.hotelDomain = {
    generatedAt: hotelDomain.generatedAt,
    stats: hotelDomain.stats,
  };
}

// Quoting-pipeline layer: ghost.quoting_pipeline L8 roost + 7 engines +
// 12 dispatcher actions + 4 UI/HTTP surfaces. Source:
// scripts/generate-quoting-pipeline-features.mjs (QUOTING-PIPELINE-MS0).
let quotingPipelineNodes = 0, quotingPipelineEdges = 0;
if (quotingPipeline?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of quotingPipeline.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    quotingPipelineNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (quotingPipeline.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    quotingPipelineEdges++;
  }
  G.meta.quotingPipeline = {
    generatedAt: quotingPipeline.generatedAt,
    stats: quotingPipeline.stats,
  };
}

// Milling tribal-tip bridge: ghost roost linking milling tribal tips to peer nodes.
// Source: scripts/generate-milling-tribal-tip-bridge-features.mjs (writes VIZ_DIR root,
// newNodes/newEdges + proper {id,layer,parent,kind} shape). U-VIZ-FAST-REGISTER-9 (sierra 2026-05-30).
let millingTribalNodes = 0, millingTribalEdges = 0;
if (millingTribalBridge?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of millingTribalBridge.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    millingTribalNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (millingTribalBridge.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    millingTribalEdges++;
  }
  G.meta.millingTribalBridge = { generatedAt: millingTribalBridge.generatedAt, stats: millingTribalBridge.stats };
}

// Octopus per-domain consensus: ghost.octopus_consensus roost surfacing real fleet consensus per
// galaxy from the U-FLEET-CONSUME feeds. Source: scripts/generate-octopus-consensus-features.mjs
// (writes VIZ_DIR root, newNodes/newEdges + proper shape, internal-only edges). PSN-OCTOPUS-FLEET-
// SYNERGY-MS0/U-FLEET-CONSUME-VIZ (slot:bravo 2026-06-01).
let octopusConsensusNodes = 0, octopusConsensusEdges = 0;
if (octopusConsensus?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of octopusConsensus.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    octopusConsensusNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (octopusConsensus.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    octopusConsensusEdges++;
  }
  G.meta.octopusConsensus = { generatedAt: octopusConsensus.generatedAt, stats: octopusConsensus.stats, nodesAdded: octopusConsensusNodes, edgesAdded: octopusConsensusEdges };
}

// BLACKWELL-AI-MS0/U-GNN-EDGE-PREDICT-VIZ (slot:india 2026-06-09): predicted MISSING knowledge
// edges roost (ghost.predicted_edges) from generate-predicted-edges-features.mjs — self-contained
// cluster, internal-only "contains" edges (root→child), mirrors the octopus splice above.
let predictedEdgesNodes = 0, predictedEdgesEdges = 0;
if (predictedEdges?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of predictedEdges.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    predictedEdgesNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (predictedEdges.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    predictedEdgesEdges++;
  }
  G.meta.predictedEdges = { generatedAt: predictedEdges.generatedAt, stats: predictedEdges.stats, nodesAdded: predictedEdgesNodes, edgesAdded: predictedEdgesEdges };
}

// SVI-component breakdown: Ψ-component + MOAT-axis nodes. Source: generate-svi-component-features.mjs
// — emits `nodes`/`edges` (NOT newNodes/newEdges); nodes are {id,type,label,layer,metadata}.
// kind-normalize from `type`; contains-edges parent them via the post-merge reparent stage.
let sviComponentNodes = 0, sviComponentEdges = 0;
if (sviComponent?.nodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of sviComponent.nodes) {
    if (existingIds.has(node.id)) continue;
    if (!node.kind && node.type) node.kind = node.type;
    G.nodes.push(node);
    existingIds.add(node.id);
    sviComponentNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (sviComponent.edges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    sviComponentEdges++;
  }
  G.meta.sviComponent = { generatedAt: sviComponent.generated_at, augmentationKind: sviComponent.augmentation_kind };
}

// Vendor-catalog: tool/insert vendor catalog nodes. Source: generate-vendor-catalog-features.mjs
// — emits `nodes`/`edges`; nodes are {id,group,type,label,title,color,metadata}. kind-normalize from `type`.
let vendorCatalogNodes = 0, vendorCatalogEdges = 0;
if (vendorCatalog?.nodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of vendorCatalog.nodes) {
    if (existingIds.has(node.id)) continue;
    if (!node.kind && node.type) node.kind = node.type;
    G.nodes.push(node);
    existingIds.add(node.id);
    vendorCatalogNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (vendorCatalog.edges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    vendorCatalogEdges++;
  }
  G.meta.vendorCatalog = { generatedAt: vendorCatalog.generated_at, stats: vendorCatalog.stats };
}

// Episode-store layer: ghost.episode_store L8 roost +
// per-entity nodes + per-episode nodes. Source:
// state/shared/episodes.jsonl via scripts/generate-episode-store-features.mjs.
// Closes PSN-ENHANCE-MS0/U-PSN-GRAPHITI-WIRE — makes the graphiti-lite
// episode store queryable in /system-viz.
let episodeStoreNodes = 0, episodeStoreEdges = 0;
if (episodeStore?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of episodeStore.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    episodeStoreNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (episodeStore.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    episodeStoreEdges++;
  }
  G.meta.episodeStore = {
    generatedAt: episodeStore.generatedAt,
    stats: episodeStore.stats,
  };
}

// Hybrid-retrieval layer: ghost.hybrid_retrieval L8 roost + 4 substrate
// L9 children (memory + master + episode + vector) + 4 fan-out edges.
// Source: live substrate probes via scripts/generate-hybrid-retrieval-features.mjs.
// Closes PSN-ENHANCE-MS0/U-PSN-HYBRID-VIZ-ROOST — surfaces the iter-18
// hybridSearch() 4-substrate architecture in /system-viz.
let hybridRetrievalNodes = 0, hybridRetrievalEdges = 0;
if (hybridRetrieval?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of hybridRetrieval.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    hybridRetrievalNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.kind ?? e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (hybridRetrieval.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    hybridRetrievalEdges++;
  }
  G.meta.hybridRetrieval = {
    generatedAt: hybridRetrieval.generatedAt,
    stats: hybridRetrieval.stats,
  };
}

// TOKEN-SAVINGS-PIVOT/U-CAG-DASHBOARD (sierra 2026-05-27) — merge the
// CAG-router augmentation: ghost.cag_router roost + 7 substrate children
// (producer router-inject, producer cold-anchor, shared consume-helper,
// 3 consumers, router-lib) + fans-out edges + writes-sidecar-for edges +
// imported-by edges. Verbatim structural copy of the hybridRetrieval merger
// (which itself is the iter-12 episode-store pattern). edgeKey tolerates both
// `kind` and `type` shapes for forward-compat.
let cagRouterNodes = 0, cagRouterEdges = 0;
if (cagRouter?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of cagRouter.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    cagRouterNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.kind ?? e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (cagRouter.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    cagRouterEdges++;
  }
  G.meta.cagRouter = {
    generatedAt: cagRouter.generatedAt,
    stats: cagRouter.stats,
  };
}

// Launch-readiness layer: ghost.launch_readiness L7 roost +
// per-domain readiness + revenue blockers + milestone phases/units + PSN-leg health.
// Source: state/shared/specs/LAUNCH-READINESS-2026-05-24.json + envelope JSON via
// scripts/generate-launch-readiness-features.mjs.
let launchReadinessNodes = 0, launchReadinessEdges = 0;
if (launchReadiness?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of launchReadiness.newNodes) {
    if (existingIds.has(node.id)) continue;
    addNodeIndexed(node);
    existingIds.add(node.id);
    launchReadinessNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (launchReadiness.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    launchReadinessEdges++;
  }
  G.meta.launchReadiness = {
    generatedAt: launchReadiness.generatedAt,
    stats: launchReadiness.stats,
  };
}

// U-PSN-EXTRACTED-DIRS-NODE-MAP (slot:golf 2026-05-24 iter11): splice the two
// ghost roosts (ghost.extracted_modules + ghost.extracted) and their 50
// top-level category children. Adds H:/prism/extracted_modules + H:/prism/extracted
// (~1342 files, 50 categories) into PSN substrate.
// Source: scripts/generate-extracted-modules-features.mjs.
let extractedModulesNodes = 0;
if (extractedModules?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of extractedModules.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    extractedModulesNodes++;
  }
  G.meta = G.meta || {};
  G.meta.extractedModules = {
    generatedAt: extractedModules.generatedAt,
    stats: extractedModules.stats,
  };
}

// Per-file detail layer for the extraction stockpile (slot:papa 2026-05-26):
// 653 file-level L10 nodes + 786 bridge/wire edges from top-200 WIRE_CANDIDATEs
// + 208 DATABASEs + 111 DUP_KEEP_EXISTING + 134 PARTIAL_OVERLAP modules. Each
// DUP/PARTIAL node carries a bridge_to_existing edge to the matched PRISM
// engine; each WIRE/PARTIAL carries a wire_target edge to the recommended
// dispatcher. Closes the "individual nodes + bridges + wiring" leg of the
// papa /goal /loop. Source: scripts/generate-extracted-modules-detail-features.mjs.
let extractedModulesDetailNodes = 0, extractedModulesDetailEdges = 0;
if (extractedModulesDetail?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of extractedModulesDetail.newNodes) {
    if (existingIds.has(node.id)) continue;
    addNodeIndexed(node);
    existingIds.add(node.id);
    extractedModulesDetailNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (extractedModulesDetail.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    extractedModulesDetailEdges++;
  }
  G.meta = G.meta || {};
  G.meta.extractedModulesDetail = {
    generatedAt: extractedModulesDetail.generatedAt,
    stats: extractedModulesDetail.stats,
  };
}

// GNN node-embedding bridge surface: ghost.gnn_embed_bridge roost + stats child
// reporting matched/dim/model/generatedAt from the live JSONL. Source:
// scripts/generate-gnn-embed-bridge-features.mjs (RAG-UPGRADE-MS0/U-GNN-NODE-EMBED-BRIDGE).
let gnnEmbedBridgeNodes = 0, gnnEmbedBridgeEdges = 0;
if (gnnEmbedBridge?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of gnnEmbedBridge.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    gnnEmbedBridgeNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (gnnEmbedBridge.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    gnnEmbedBridgeEdges++;
  }
  G.meta.gnnEmbedBridge = {
    generatedAt: gnnEmbedBridge.generatedAt,
    stats: gnnEmbedBridge.stats,
  };
}

// JM Die post-processor gap surface: ghost.post_gap_surface roost + corpus-
// wide gap children + per-post nodes. Closes (c) /system-viz roost integration
// from [[reference_india_post_gaps_2026_05_22]] (slot:india 2026-05-22).
// Source: scripts/generate-post-gap-features.mjs ← scripts/lib/jmdie-post-gap-detect.mjs
// ← H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/*.cps.
let postGapNodes = 0, postGapEdges = 0;
if (postGap?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of postGap.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    postGapNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (postGap.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    postGapEdges++;
  }
  G.meta.postGap = {
    generatedAt: postGap.generatedAt,
    stats: postGap.stats,
  };
}

// RAG-UPGRADE-MS0 layer: ghost.rag_upgrade_ms0 roost + one rag-upgrade-unit
// child per unit (U-RAG-1..6), color-coded by parsed status. Source:
// scripts/generate-rag-upgrade-features.mjs ← state/shared/specs/RAG-UPGRADE-MS0.md.
let ragUpgradeNodes = 0, ragUpgradeEdges = 0;
if (ragUpgrade?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of ragUpgrade.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    ragUpgradeNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (ragUpgrade.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    ragUpgradeEdges++;
  }
  G.meta.ragUpgrade = {
    generatedAt: ragUpgrade.generatedAt,
    stats: ragUpgrade.stats,
  };
}

// Link-audit integrity layer: ghost.link_audit_integrity roost + one
// broken-link child per top-N broken `[[name]]` sample. Source:
// state/shared/.knowledge-link-audit.json (producer iter-4) via
// scripts/generate-link-audit-features.mjs (iter-6, echo /goal synergy).
// The producer/consumer pair (Stop-hook write, SessionStart digest) is
// already in place; this layer adds the visual surface to /system-viz.
let linkAuditNodes = 0, linkAuditEdges = 0;
if (linkAudit?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of linkAudit.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    linkAuditNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (linkAudit.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    linkAuditEdges++;
  }
  G.meta.linkAudit = {
    generatedAt: linkAudit.generatedAt,
    stats: linkAudit.stats,
  };
}

// Wiki-tribal coverage layer: ghost.wiki_tribal_coverage roost + one
// missing-coverage child per top-N wiki path lacking tribal embedding.
// Source: state/shared/.wiki-tribal-cross-ref-audit.json (producer iter-7)
// via scripts/generate-wiki-tribal-features.mjs (iter-9, echo /goal synergy).
// Producer/consumer/viz triplet for the wiki-tribal substrate (after the
// iter-7 producer + iter-8 SessionStart consumer).
let wikiTribalNodes = 0, wikiTribalEdges = 0;
if (wikiTribal?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of wikiTribal.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    wikiTribalNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (wikiTribal.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    wikiTribalEdges++;
  }
  G.meta.wikiTribal = {
    generatedAt: wikiTribal.generatedAt,
    stats: wikiTribal.stats,
  };
}

// Substrate-health meta-roost: ghost.substrate_health L7 parent that
// aggregates the iter-6 link-audit roost + iter-9 wiki-tribal roost via
// "aggregates" edges. Source: state/shared/.goal-synergy-status.json
// (iter-10 rollup) via scripts/generate-substrate-meta-roost-features.mjs
// (iter-12, echo /goal synergy). Compounds the viz tier: textual rollup
// (iter-10) + textual digest (iter-11) + visual meta-parent (iter-12).
let substrateMetaRoostNodes = 0, substrateMetaRoostEdges = 0;
if (substrateMetaRoost?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of substrateMetaRoost.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    substrateMetaRoostNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (substrateMetaRoost.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    substrateMetaRoostEdges++;
  }
  G.meta.substrateMetaRoost = {
    generatedAt: substrateMetaRoost.generatedAt,
    stats: substrateMetaRoost.stats,
  };
}

// GALAXY-CONTEXT-FEDERATION-MS0/U-GCF-VIZ-ROOST (slot:alpha 2026-06-01): federation roost —
// ghost.galaxy_federation L7 meta + 5 child roosts (cards/digest/knows-map/dedup/savings) L8.
// Source: scripts/generate-galaxy-federation-roost-features.mjs. Mirrors the substrateMetaRoost
// splice exactly (own existingIds/existingEdges Sets, dedup by id + edgeKey).
let galaxyFederationRoostNodes = 0, galaxyFederationRoostEdges = 0;
if (galaxyFederationRoost?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of galaxyFederationRoost.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    galaxyFederationRoostNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (galaxyFederationRoost.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    galaxyFederationRoostEdges++;
  }
  G.meta.galaxyFederationRoost = {
    generatedAt: galaxyFederationRoost.generatedAt,
    stats: galaxyFederationRoost.stats,
  };
}

// PRISM-AI memo-coverage roost: ghost.ai_memo_xref L8 roost + one
// missing-coverage child per blind-spot PRISM-AI engine. Source:
// state/shared/.prism-ai-memo-cross-ref-audit.json (iter-13 producer) via
// scripts/generate-ai-memo-xref-features.mjs (iter-16, echo /goal synergy).
// Completes the producer/consumer/viz triplet for the prism-ai-memo
// substrate (iter-13 producer + iter-14 SessionStart consumer + iter-16 viz).
let aiMemoXrefNodes = 0, aiMemoXrefEdges = 0;
if (aiMemoXref?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of aiMemoXref.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    aiMemoXrefNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (aiMemoXref.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    aiMemoXrefEdges++;
  }
  G.meta.aiMemoXref = {
    generatedAt: aiMemoXref.generatedAt,
    stats: aiMemoXref.stats,
  };
}

// Echo-viz observability layers: three ghost roosts from the ECHO-UNDONE
// survey (H2 tribal-knowledge corpus, H3 live chat-slot agents, H5 active
// handoffs) + their children. Source:
// state/shared/system-viz/echo-viz-layers-augmentation.json via
// scripts/generate-echo-viz-layers-features.mjs.
let echoVizLayerNodes = 0, echoVizLayerEdges = 0;
if (echoVizLayers?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of echoVizLayers.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    echoVizLayerNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (echoVizLayers.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    echoVizLayerEdges++;
  }
  G.meta.echoVizLayers = {
    generatedAt: echoVizLayers.generatedAt,
    stats: echoVizLayers.stats,
  };
}

// Feature-gap audit layer: ghost.feature_gap_audit roost + one gap-unit per
// audit-discovered feature (FEATURE-GAP-AUDIT-MS0), color-coded by owning
// domain. Each gap-unit also emits an "audit-discovered" ghost wire to the
// roost. Source: scripts/generate-feature-gap-features.mjs.
let featureGapNodes = 0, featureGapEdges = 0;
if (featureGap?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of featureGap.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    featureGapNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (featureGap.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    featureGapEdges++;
  }
  G.meta.featureGap = {
    generatedAt: featureGap.generatedAt,
    stats: featureGap.stats,
  };
}

// Domain-pipeline layer: ghost.domain_pipelines roost + 13 domain-pipeline
// nodes + per-(domain,stage) pipeline-stage children with pipeline-flow edges.
// Source: scripts/generate-domain-pipeline-features.mjs (reads
// state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json).
let domainPipelineNodes = 0, domainPipelineEdges = 0;
if (domainPipeline?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of domainPipeline.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    domainPipelineNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (domainPipeline.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    domainPipelineEdges++;
  }
  G.meta.domainPipeline = {
    generatedAt: domainPipeline.generatedAt,
    stats: domainPipeline.stats,
  };
}

// Slot-synergy map: ghost.slot_synergy roost + 14 synergy-subsystem anchors
// + 13 slot-synergy-node children (one per NATO slot), with per-slot edges
// to every subsystem the slot has non-zero connections to (handoffs, queue,
// claims, commits, branch, skills, scripts, hooks, memories, wikis, tribal,
// CLAUDE.md, GSD, TDD/DSL). Closes the "end-to-end pipeline per slot is
// invisible in the graph" gap. Source: scripts/generate-slot-synergy-features.mjs.
let slotSynergyNodes = 0, slotSynergyEdges = 0;
if (slotSynergy?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of slotSynergy.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    slotSynergyNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (slotSynergy.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    slotSynergyEdges++;
  }
  G.meta.slotSynergy = {
    generatedAt: slotSynergy.generatedAt,
    stats: slotSynergy.stats,
  };
}

// Docker MCP layer: ghost.docker_mcp roost + one node per registered MCP
// catalog, MCP client, and the servers wired into each client. Puts the
// Docker MCP Toolkit integration ON the graph — the shared substrate the AI
// router (master_index_query) and NN-graph GNN both read, so this single
// augmentation surfaces Docker MCP to three intelligence layers at once.
// Source: scripts/generate-docker-mcp-features.mjs.
let dockerMcpNodes = 0, dockerMcpEdges = 0;
if (dockerMcp?.newNodes) {
  const existingIds = new Set(G.nodes.map(n => n.id));
  for (const node of dockerMcp.newNodes) {
    if (existingIds.has(node.id)) continue;
    G.nodes.push(node);
    existingIds.add(node.id);
    dockerMcpNodes++;
  }
  G.edges ??= [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const existingEdges = new Set(G.edges.map(edgeKey));
  for (const edge of (dockerMcp.newEdges || [])) {
    const k = edgeKey(edge);
    if (existingEdges.has(k)) continue;
    G.edges.push(edge);
    existingEdges.add(k);
    dockerMcpEdges++;
  }
  G.meta.dockerMcp = {
    generatedAt: dockerMcp.generatedAt,
    stats: dockerMcp.stats,
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
const [scriptLibN,   scriptLibE]   = mergeIndexedAugmentation(scriptsLibAtm,  "scriptsLibAtomic");
const [msEnvN,       msEnvE]       = mergeIndexedAugmentation(milestoneEnvAtm, "milestoneEnvelopeAtomic");
const [slotTouchN,   slotTouchE]   = mergeIndexedAugmentation(slotTouchAug,    "slotTouch");
const [cadComplN,    cadComplE]    = mergeIndexedAugmentation(cadComplAug,     "cadCompletion");
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

// U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra): canonicalize mis-prefixed edge targets
// in the assembled graph. The merged graph is CUMULATIVE (merge reads the
// persistent system-graph.json + adds, never removes stale-target edges), so a
// producer-side fix only affects NEW edges — the ~2.7K `dispatcher.prism_*` +
// `engine.<ClassName>` edges accumulated from prior merges persist until rewritten
// HERE (the single writer + the only place with the full post-merge node set; a
// separate rewriting script would be a 2nd writer). Both remaps are gated so they
// are strictly dead→live: engine.<X>→eng.<domain>.<name> only when X matches a live
// eng.* node (graph-alias); dispatcher.<X>→disp.<file-id> only when the resolved
// disp.* node EXISTS. Unmatched targets stay honest dead pixels (R12). Reverts with
// PRISM_VIZ_ENGINE_CANON_DISABLE=1.
let edgeCanon = { engRemapped: 0, dispRemapped: 0, dropped: 0, engUnresolved: 0, dispUnresolved: 0, bareEngRemapped: 0, bareDispRemapped: 0, distinctEngMissing: 0, distinctDispMissing: 0 };
if (process.env.PRISM_VIZ_ENGINE_CANON_DISABLE !== "1") {
  edgeCanon = canonicalizeGraphEdgeTargets(G);
  G.meta.edgeTargetCanonicalization = { ...edgeCanon, ranAt: new Date().toISOString() };
}

G.meta.augmentationVersions = versions;
G.schemaVersion = "2.29.0";
// Streaming + ATOMIC write -- bypasses V8 ~512MB max-string-length ceiling AND is
// crash-atomic (tmp-<pid> + rename). A reaper/OOM/commit-pressure kill mid-write
// leaves only an orphan .tmp (swept by the tmp-orphan janitor), NEVER a truncated
// system-graph.json. The non-atomic writeGraphStreaming truncated the 660MB graph
// mid-edges-array on a killed regen (U-VIZ-GRAPH-ATOMIC-WRITE, 2026-06-09) -- which
// broke every readGraphStreaming consumer. See writeGraphStreamingAtomic() docblock.
writeGraphStreamingAtomic(graphPath, G);
console.log(`merged augmentations into ${graphPath}`);
console.log(`  obsidian: ${obsidian ? "yes" : "missing"}  awareness: ${awareness ? "yes" : "missing"}  novelty: ${novelty ? "yes" : "missing"}  business: ${business ? "yes" : "missing"}`);
if (OVERSIZE_DROPPED.length) {
  console.error(`  !! OVERSIZE-DROPPED ${OVERSIZE_DROPPED.length} augmentation(s) -- exceeded V8 ~512MiB string cap, NOT loaded; master-index degraded for these until sharded or given a streaming loader:`);
  for (const o of OVERSIZE_DROPPED) console.error(`     - ${o.name} (${o.mb}MB)`);
}
if (STALE_SKIPPED.length) {
  console.error(`  !! STALE-SKIPPED ${STALE_SKIPPED.length} augmentation(s) -- older than the stale threshold, NOT folded (PRISM_MERGE_STALE_SKIP=1); re-wire the generator or retire the loadOptional():`);
  for (const s of STALE_SKIPPED) console.error(`     - ${s.name} (${s.ageHr}h)`);
}
console.log(`  nodes augmented: ${mergedNodes}  coreInventory: ${coreInventoryChildren}  fsInventory: ${fsInventoryChildren}  engineDomain: ${engineDomainChildren}  knowledgeInv: ${knowledgeInvChildren}  stalenessAnnotated: ${stalenessAnnotated}  fsDeep: ${fsDeepNodes} nodes, ${fsDeepEdges} edges  l11Leaves: ${l11Nodes} nodes, ${l11Edges} edges  wiring: ${wiringAnnotated} annotated, ${wiringPhantomEdges} phantom edges  galaxies: ${galaxyAnnotated} (+${galaxyMolsAttached} planets)  knowledge: ${knowledgeNodes} nodes, ${knowledgeEdges} edges, ${knowledgeAnnotated} annotated  layerBridges: ${bridgeEdges} new edges  stagnant: ${stagnantNodes} nodes / ${stagnantEdges} edges  miscTasks: ${miscTaskNodes} nodes / ${miscTaskEdges} edges  bridgeSynergy: ${bridgeSynergyNodes} nodes / ${bridgeSynergyEdges} edges  priorityQueue: ${priorityQueueNodes} nodes / ${priorityQueueEdges} edges  echoVizLayers: ${echoVizLayerNodes} nodes / ${echoVizLayerEdges} edges  engineGraph: ${engineGraphNodes} nodes / ${engineGraphEdges} edges  hookBridges: ${hookBridgesEdges} edges  frontendPages: ${frontendPageNodes} nodes / ${frontendPageEdges} edges  combo: ${comboNodes} nodes / ${comboEdges} edges  engineSat: ${engSatNodes} nodes / ${engSatEdges} edges  wikiEntries: ${wikiNodes} nodes / ${wikiEdges} edges  formulasAtomic: ${formulaNodes} / ${formulaEdges}  personas: ${personaNodes} / ${personaEdges}  skills: ${skillNodes} / ${skillEdges}  schemas: ${schemaNodes} / ${schemaEdges}  algos: ${algoNodes} / ${algoEdges}  transport: ${transportNodes} / ${transportEdges}  aiTier: ${aiTierNodes} / ${aiTierEdges}  actions: ${actionNodes} / ${actionEdges}  hooks: ${hookNodes} / ${hookEdges}  tests: ${testNodes} / ${testEdges}  scriptsAtom: ${scriptNodesA} / ${scriptEdgesA}  scriptsLib: ${scriptLibN} / ${scriptLibE}  memories: ${memoryNodes} / ${memoryEdges}  regEnt: ${regEntNodes} / ${regEntEdges}  actEng: 0 / ${actEngEdges}  ghosts: ${G.meta.ghostSummary.ghostNodes} nodes / ${G.meta.ghostSummary.ghostEdges} edges`);
console.log(`  L7-saturation: camVendor=${camVCNodes}n/${camVCEdges}e  tsRegEnt=${tsRENodes}n/${tsREEdges}e  physics=${phyANodes}n/${phyAEdges}e`);
console.log(`  L5-edges:      engineImp=${engineImpEdgeCount} new edges  testCov=${testCovEdgeCount} new edges`);
console.log(`  Phase 2:       jmDie=${jmDieNodes}n/${jmDieEdges}e  frontendDeep=${frontDNodes}n/${frontDEdges}e  wikiX=${wikiXNodes}n/${wikiXEdges}e  schemaEng=${schemaEdgeCount}e  enginePhys=${physEdgeCount}e`);
console.log(`  Phase 3:       extractedDataAtomic=${xtractNodes}n/${xtractEdges}e  dataCatalogsAtomic=${datacatNodes}n/${datacatEdges}e  gitTree=${gitTreeNodes}n/${gitTreeEdges}e  vaultGraph=${vaultGNodes}n/${vaultGEdges}e`);
console.log(`  schema bumped to 2.29.0`);
console.log(`  edgeCanon: eng ${edgeCanon.engRemapped} remap/${edgeCanon.engUnresolved} miss(${edgeCanon.distinctEngMissing}), disp ${edgeCanon.dispRemapped} remap/${edgeCanon.dispUnresolved} miss(${edgeCanon.distinctDispMissing}), bare eng ${edgeCanon.bareEngRemapped}/disp ${edgeCanon.bareDispRemapped}, ${edgeCanon.dropped} dup-dropped`);
