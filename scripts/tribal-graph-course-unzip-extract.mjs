#!/usr/bin/env node
// tribal-graph-course-unzip-extract.mjs
// Iter 5: batch extractor over archived MIT OCW zips.
// For each *.zip under H:/prism/resources/MIT COURSES/**, extracts ONLY
// data.json via PowerShell's System.IO.Compression.ZipFile (avoids unzipping
// gigabytes of static_resources). Parses + upgrades the matching course
// node to syllabus level (confidence 0.75).
//
// Usage:
//   node scripts/tribal-graph-course-unzip-extract.mjs               # full
//   node scripts/tribal-graph-course-unzip-extract.mjs --limit 10    # sample
//   node scripts/tribal-graph-course-unzip-extract.mjs --dry-run

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, renameSync, unlinkSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { argv } from "node:process";
import { spawnSync } from "node:child_process";
import {
  buildCourseNodeId,
  PROVENANCE_SOURCE_DEFAULT,
  mergeIntoGraph,
} from "./lib/course-mapper-lib.mjs";
import { upgradeFromDataJson } from "./tribal-graph-course-extract.mjs";

const COURSES_ROOT_DEFAULT = "H:/prism/resources/MIT COURSES";
const SIDECAR_PATH         = "H:/prism/state/shared/tribal-graph/course-tribal-nodes.json";
const SYSTEM_GRAPH_PATH    = "H:/prism/state/shared/system-viz/system-graph.json";
const TMP_DIR              = "H:/prism/state/shared/tribal-graph/.unzip-tmp";

function parseArgs(argv) {
  const a = { dryRun: false, limit: Infinity, root: COURSES_ROOT_DEFAULT, sidecar: SIDECAR_PATH, out: SYSTEM_GRAPH_PATH };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") a.dryRun = true;
    else if (argv[i] === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (argv[i] === "--root") a.root = argv[++i];
    else if (argv[i] === "--sidecar") a.sidecar = argv[++i];
    else if (argv[i] === "--out") a.out = argv[++i];
  }
  return a;
}

function readJsonOrNull(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function writeJsonAtomic(p, obj) {
  const dir = dirname(p);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = p + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, (_k, v) => v instanceof Set ? [...v].sort() : v, 2));
  try { renameSync(tmp, p); }
  catch (e) { try { unlinkSync(tmp); } catch { /* */ } throw e; }
}

// Walk root recursively for *.zip
function findAllZips(root) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const full = join(dir, name);
      let s;
      try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) visit(full);
      else if (name.toLowerCase().endsWith(".zip")) out.push(full);
    }
  };
  visit(root);
  return out;
}

// Use PowerShell to extract a single named entry from a zip to a target path.
// Returns the contents as string, or null on failure.
function extractDataJsonFromZip(zipPath) {
  // Prefer the data.json at the SHORTEST FullName path (course root) — legacy
  // OCW zips have data.json sub-pages (Assignments/data.json, etc.) too.
  // The root one has course_title + course_description; sub-pages don't.
  const ps = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    try {
      $zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}')
      $entries = $zip.Entries | Where-Object { $_.Name -eq 'data.json' } | Sort-Object { $_.FullName.Length }
      $entry = $entries | Select-Object -First 1
      if (-not $entry) { $zip.Dispose(); Write-Output ''; exit 0 }
      $reader = New-Object System.IO.StreamReader($entry.Open())
      $content = $reader.ReadToEnd()
      $reader.Close()
      $zip.Dispose()
      Write-Output $content
    } catch {
      Write-Error $_.Exception.Message
      exit 1
    }
  `;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) return null;
  const out = r.stdout.trim();
  if (!out) return null;
  try {
    const parsed = JSON.parse(out);
    // Only accept course-root data.json (must have course_title field)
    if (!parsed.course_title) return null;
    return parsed;
  } catch { return null; }
}

// Course slug from zip filename: "1.060-spring-2006.zip" → "1.060-spring-2006"
function slugFromZip(zipPath) {
  return basename(zipPath).replace(/\.zip$/i, "");
}

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
      extractionLevel: "syllabus",
      confidence: 0.75,
      extractedAt: upgrade.extractedAt,
      extractedFrom: "MIT_OCW_ZIP_DATA_JSON",
    },
  };
}

async function main() {
  const args = parseArgs(argv);
  const log = (...m) => console.log("[unzip-extract]", ...m);

  log(`scanning for zips under: ${args.root}`);
  const zips = findAllZips(args.root);
  log(`found zip files: ${zips.length}`);

  // Load sidecar
  const sidecar = readJsonOrNull(args.sidecar);
  if (!sidecar || !Array.isArray(sidecar.nodes)) {
    console.error("[unzip-extract] sidecar missing — run tribal-graph-course-mapper.mjs first.");
    process.exit(2);
  }
  const byId = new Map(sidecar.nodes.filter(n => n?.id).map(n => [n.id, n]));

  const upgradedNodes = [];
  const newNodes = [];
  let processed = 0, upgraded = 0, added = 0, skipped = 0, nodata = 0;

  for (const zipPath of zips) {
    if (processed >= args.limit) break;
    processed++;
    const slug = slugFromZip(zipPath);
    const id = buildCourseNodeId(slug, PROVENANCE_SOURCE_DEFAULT);

    // Skip if already syllabus-or-better extracted
    const existing = byId.get(id);
    if (existing && existing.provenance?.extractionLevel === "syllabus") {
      skipped++;
      continue;
    }

    const data = extractDataJsonFromZip(zipPath);
    if (!data) {
      nodata++;
      log(`  no data.json in ${basename(zipPath)}`);
      continue;
    }
    const upgrade = upgradeFromDataJson(data);

    if (existing) {
      const u = applyUpgrade(existing, upgrade);
      byId.set(id, u);
      upgradedNodes.push(u);
      upgraded++;
      log(`  [${processed}/${zips.length}] UPGR ${slug}: ${upgrade.upgradedTitle?.slice(0,55)}`);
    } else {
      // Synthesize a fresh node since iter-3 mapper missed this slug
      const fresh = {
        id, kind: "course-tribal", layerBand: "L4a",
        source: PROVENANCE_SOURCE_DEFAULT,
        title: upgrade.upgradedTitle || slug,
        courseId: slug.split("-")[0],
        term: slug.split("-").slice(1).join("-"),
        category: "other",
        domain: "X_unknown", school: "Z_uncategorized",
        discipline: "S0_unknown", galaxy: "G3_unknown",
        prismMapping: [],
        tags: [...new Set([...upgrade.topicTags, ...upgrade.descTokens])].sort(),
        repBag: new Set([...upgrade.topicTags, ...upgrade.descTokens]),
        instructors: upgrade.instructors,
        departmentNumbers: upgrade.departmentNumbers,
        learningResourceTypes: upgrade.learningResourceTypes,
        description: upgrade.description,
        provenance: {
          extractedFrom: "MIT_OCW_ZIP_DATA_JSON",
          extractedAt: upgrade.extractedAt,
          extractionLevel: "syllabus",
          confidence: 0.75,
        },
        embedding: null, lateralWires: [],
      };
      byId.set(id, fresh);
      newNodes.push(fresh);
      added++;
      log(`  [${processed}/${zips.length}] NEW  ${slug}: ${upgrade.upgradedTitle?.slice(0,55)}`);
    }
  }

  log(`stats: processed=${processed} upgraded=${upgraded} added=${added} skipped=${skipped} nodata=${nodata}`);
  if (upgraded === 0 && added === 0) {
    log("no changes; exiting.");
    return;
  }

  // Persist sidecar
  const finalNodes = [...byId.values()];
  const newSidecar = { ...sidecar, nodes: finalNodes, generatedAt: new Date().toISOString(), count: finalNodes.length };
  if (args.dryRun) log(`[dry-run] would write sidecar (${finalNodes.length} total)`);
  else { writeJsonAtomic(args.sidecar, newSidecar); log(`sidecar written: ${args.sidecar}`); }

  // Merge into graph
  const graph = readJsonOrNull(args.out);
  if (!graph || !Array.isArray(graph.nodes)) {
    log(`WARN: ${args.out} missing/malformed; skipping graph merge.`);
    return;
  }
  const allChanged = [...upgradedNodes, ...newNodes];
  const { graph: mergedGraph, stats } = mergeIntoGraph(graph, allChanged);
  log(`graph merge: added=${stats.added} replaced=${stats.replaced} edges+=${stats.edgesAdded}`);
  if (args.dryRun) log(`[dry-run] would write merged graph to ${args.out}`);
  else { writeJsonAtomic(args.out, mergedGraph); log(`system-graph written: ${args.out}`); }
}

main().catch((e) => {
  console.error("[unzip-extract] FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});
