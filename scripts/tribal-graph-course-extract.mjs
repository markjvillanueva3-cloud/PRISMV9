#!/usr/bin/env node
// tribal-graph-course-extract.mjs
// Iter 4: walks H:/prism/resources/MIT COURSES/<course>/data.json files,
// upgrades each course's tribal node from extractionLevel:"metadata-only"
// (confidence 0.6) → "syllabus" (confidence 0.75) using the real course
// title, description, topics, and department info.
//
// Composes with course-mapper-lib.mjs (no fork). Reads the sidecar produced
// by tribal-graph-course-mapper.mjs and overlays the upgraded fields.
//
// Usage:
//   node scripts/tribal-graph-course-extract.mjs                # full pipeline
//   node scripts/tribal-graph-course-extract.mjs --dry-run
//   node scripts/tribal-graph-course-extract.mjs --root <dir>   # scan a different root

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { argv } from "node:process";
import {
  buildCourseNodeId,
  PROVENANCE_SOURCE_DEFAULT,
  SYLLABUS_CONFIDENCE_DEFAULT,
  EXTRACTION_LEVEL_SYLLABUS,
  mergeIntoGraph,
  edgesFromCourseNode,
} from "./lib/course-mapper-lib.mjs";

const COURSES_ROOT_DEFAULT     = "H:/prism/resources/MIT COURSES";
const SIDECAR_PATH             = "H:/prism/state/shared/tribal-graph/course-tribal-nodes.json";
const SYSTEM_GRAPH_PATH        = "H:/prism/state/shared/system-viz/system-graph.json";
const TMP_SUFFIX               = ".tmp-";

function parseArgs(argv) {
  const a = { dryRun: false, root: COURSES_ROOT_DEFAULT, sidecar: SIDECAR_PATH, out: SYSTEM_GRAPH_PATH };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") a.dryRun = true;
    else if (argv[i] === "--root") a.root = argv[++i];
    else if (argv[i] === "--sidecar") a.sidecar = argv[++i];
    else if (argv[i] === "--out") a.out = argv[++i];
  }
  return a;
}

function readJsonOrNull(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch { return null; }
}

function writeJsonAtomic(p, obj) {
  const dir = dirname(p);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = p + TMP_SUFFIX + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, (_k, v) => v instanceof Set ? [...v].sort() : v, 2));
  try { renameSync(tmp, p); }
  catch (e) {
    try { unlinkSync(tmp); } catch { /* best-effort */ }
    throw e;
  }
}

// Find course directories: any direct child of `root` that contains `data.json`.
function findExtractedCourses(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (!s.isDirectory()) continue;
    const dataJson = join(full, "data.json");
    if (existsSync(dataJson)) out.push({ slug: name, dir: full, dataJson });
  }
  return out;
}

// Pure transform: data.json → upgrade fields for a course node.
export function upgradeFromDataJson(data, now = new Date().toISOString()) {
  const title = String(data?.course_title || "").trim();
  const desc  = String(data?.course_description || "").trim();
  // Flatten topics array of arrays: [["Engineering","CS","Algo"], ...] → unique leaves
  const topicTags = new Set();
  if (Array.isArray(data?.topics)) {
    for (const arr of data.topics) {
      if (Array.isArray(arr)) {
        for (const t of arr) {
          if (typeof t === "string" && t.length > 0) {
            topicTags.add(t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
          }
        }
      }
    }
  }
  // Extract significant description tokens (length>=4, alpha, not stop)
  const descTokens = new Set();
  for (const tok of desc.toLowerCase().split(/[^a-z]+/)) {
    if (tok.length >= 4 && !DESC_STOPS.has(tok)) descTokens.add(tok);
  }
  return {
    upgradedTitle: title,
    description: desc.length > 0 ? desc : null,
    topicTags: [...topicTags].sort(),
    descTokens: [...descTokens].sort(),
    instructors: Array.isArray(data?.instructors) ? data.instructors.map(i => i?.title || i?.first_name + " " + i?.last_name).filter(Boolean) : [],
    departmentNumbers: Array.isArray(data?.department_numbers) ? data.department_numbers : [],
    learningResourceTypes: Array.isArray(data?.learning_resource_types) ? data.learning_resource_types : [],
    extractedAt: now,
  };
}

// Pre-defined description-token stop list — same spirit as course-mapper-lib's title-stop,
// but tuned for syllabus prose (more connectives).
const DESC_STOPS = new Set([
  "an","and","are","but","for","from","into","its","not","that","the","this","these","those",
  "to","with","include","including","introduction","intermediate","course","topics","emphasis",
  "emphasizing","methods","application","applications","such","also","will","each","both","etc",
  "various","cover","covered","covers","provide","provides","providing","upon","over","onto",
  "their","they","more","most","when","what","where","which","while","than","then",
]);

// Apply upgrade to an existing course node (returns NEW node).
function applyUpgrade(courseNode, upgrade) {
  const mergedTags = new Set([
    ...(courseNode.tags || []),
    ...upgrade.topicTags,
    ...upgrade.descTokens,
    ...(upgrade.departmentNumbers || []).map(d => `dept-${String(d).toLowerCase()}`),
  ]);
  return {
    ...courseNode,
    title: upgrade.upgradedTitle || courseNode.title,
    description: upgrade.description,
    tags: [...mergedTags].sort(),
    repBag: mergedTags,
    instructors: upgrade.instructors,
    departmentNumbers: upgrade.departmentNumbers,
    learningResourceTypes: upgrade.learningResourceTypes,
    provenance: {
      ...courseNode.provenance,
      extractionLevel: EXTRACTION_LEVEL_SYLLABUS,
      confidence: SYLLABUS_CONFIDENCE_DEFAULT,
      extractedAt: upgrade.extractedAt,
      extractedFrom: "MIT_OCW_DATA_JSON",
    },
  };
}

async function main() {
  const args = parseArgs(argv);
  const log = (...m) => console.log("[course-extract]", ...m);

  log(`scanning courses root: ${args.root}`);
  const courseDirs = findExtractedCourses(args.root);
  log(`found extracted courses with data.json: ${courseDirs.length}`);
  if (courseDirs.length === 0) {
    log("nothing to upgrade.");
    return;
  }

  // Load sidecar (the existing course-tribal nodes)
  const sidecar = readJsonOrNull(args.sidecar);
  if (!sidecar || !Array.isArray(sidecar.nodes)) {
    console.error(`[course-extract] sidecar missing or malformed: ${args.sidecar}`);
    console.error("[course-extract] run scripts/tribal-graph-course-mapper.mjs first.");
    process.exit(2);
  }
  const byId = new Map();
  for (const n of sidecar.nodes) if (n?.id) byId.set(n.id, n);

  const upgradedNodes = [];
  let upgradedCount = 0;
  let unmatchedCount = 0;

  for (const { slug, dataJson } of courseDirs) {
    const data = readJsonOrNull(dataJson);
    if (!data) { log(`  skip ${slug}: malformed data.json`); continue; }
    const upgrade = upgradeFromDataJson(data);
    const nodeId = buildCourseNodeId(slug, PROVENANCE_SOURCE_DEFAULT);
    const existing = byId.get(nodeId);
    if (!existing) {
      unmatchedCount++;
      log(`  NO-MATCH ${slug} -> ${nodeId} (not in sidecar; iter-3 mapping missed this slug)`);
      continue;
    }
    const upgraded = applyUpgrade(existing, upgrade);
    byId.set(nodeId, upgraded);
    upgradedNodes.push(upgraded);
    upgradedCount++;
    log(`  upgraded ${slug}: ${upgrade.upgradedTitle?.slice(0,60)} | tags=${upgraded.tags.length} | confidence=${upgraded.provenance.confidence}`);
  }

  log(`upgrades: ${upgradedCount} / unmatched: ${unmatchedCount}`);
  if (upgradedCount === 0) {
    log("no nodes upgraded, exiting.");
    return;
  }

  // Rebuild sidecar nodes preserving order, with upgrades in place
  const newNodes = sidecar.nodes.map(n => byId.get(n.id) || n);
  const newSidecar = {
    ...sidecar,
    nodes: newNodes,
    generatedAt: new Date().toISOString(),
  };

  if (args.dryRun) {
    log(`[dry-run] would write sidecar (${newNodes.length} total, ${upgradedCount} upgraded)`);
  } else {
    writeJsonAtomic(args.sidecar, newSidecar);
    log(`sidecar written: ${args.sidecar}`);
  }

  // Merge upgraded nodes back into system-graph
  const graph = readJsonOrNull(args.out);
  if (!graph || !Array.isArray(graph.nodes)) {
    log(`WARN: ${args.out} missing/malformed; skipping graph merge.`);
    return;
  }
  const { graph: mergedGraph, stats } = mergeIntoGraph(graph, upgradedNodes);
  log(`graph merge: replaced=${stats.replaced} added=${stats.added} edges+=${stats.edgesAdded}`);
  if (args.dryRun) {
    log(`[dry-run] would write merged graph to ${args.out}`);
    return;
  }
  writeJsonAtomic(args.out, mergedGraph);
  log(`system-graph written: ${args.out}`);
}

main().catch((e) => {
  console.error("[course-extract] FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});
