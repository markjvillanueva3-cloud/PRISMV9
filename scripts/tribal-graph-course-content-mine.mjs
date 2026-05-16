#!/usr/bin/env node
// tribal-graph-course-content-mine.mjs
// Iter 7 (TRIBAL-GRAPH-MS0): I/O orchestrator that mines each MIT-OCW course
// zip's per-resource descriptor layer into a RANKED, ADVISORY review queue of
// PRISM-value candidates (technique vocabulary + asset proposals).
//
// PIPELINE: zip → ALL data.json entries → collectResourceDescriptors →
// aggregateCourseCorpus → Ollama qwen2.5-coder mine → scoreCandidate →
// passesRelevanceFloor filter → toCandidateRecord → JSONL queue + checkpoint.
//
// The output `course-content-candidates.jsonl` is an ADVISORY REVIEW QUEUE,
// NOT auto-built engines. PRISM's comprehensive-build-enforce / no-stub /
// duplication-guard hooks block LLM-generated stub engines BY DESIGN — and
// auto-building from an LLM distillation would pollute the codebase and
// violate the operator's standing "be careful, monitor for pollution"
// mandate. Best candidates become real PRISM assets ONLY via the human-gated
// /forge + scrutiny pipeline.
//
// All pure logic (collect/aggregate/score/filter/shape/parse) lives in
// scripts/lib/course-content-mine-lib.mjs — this file is fs/zip/Ollama glue
// only. Composes iters 3-6 (course-mapper-lib for ids); no fork.
//
// Usage:
//   node scripts/tribal-graph-course-content-mine.mjs                 # full
//   node scripts/tribal-graph-course-content-mine.mjs --limit 5       # sample
//   node scripts/tribal-graph-course-content-mine.mjs --dry-run
//   node scripts/tribal-graph-course-content-mine.mjs --no-graph-merge
//   node scripts/tribal-graph-course-content-mine.mjs --force         # ignore checkpoint
//   node scripts/tribal-graph-course-content-mine.mjs --model qwen2.5-coder:7b

import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, realpathSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { argv } from "node:process";
import { spawnSync } from "node:child_process";
import { buildCourseNodeId, PROVENANCE_SOURCE_DEFAULT } from "./lib/course-mapper-lib.mjs";
import {
  collectResourceDescriptors,
  aggregateCourseCorpus,
  callOllamaMine,
  scoreCandidate,
  passesRelevanceFloor,
  toCandidateRecord,
  corpusMfgPrior,
  DEFAULT_MINE_MODEL,
  RELEVANCE_FLOOR,
} from "./lib/course-content-mine-lib.mjs";

const COURSES_ROOT_DEFAULT = "H:/prism/resources/MIT COURSES";
const SIDECAR_PATH         = "H:/prism/state/shared/tribal-graph/course-tribal-nodes.json";
const SYSTEM_GRAPH_PATH    = "H:/prism/state/shared/system-viz/system-graph.json";
const CANDIDATES_JSONL     = "H:/prism/state/shared/tribal-graph/course-content-candidates.jsonl";
const CHECKPOINT_PATH      = "H:/prism/state/shared/tribal-graph/course-content-mine-checkpoint.json";
const MIN_DESCRIPTORS_TO_MINE = 3;   // a course with <3 substantive blurbs has no usable vocabulary

function parseArgs(argv) {
  const a = {
    dryRun: false, limit: Infinity, root: COURSES_ROOT_DEFAULT, sidecar: SIDECAR_PATH,
    out: SYSTEM_GRAPH_PATH, jsonl: CANDIDATES_JSONL, checkpoint: CHECKPOINT_PATH,
    noGraphMerge: false, force: false, model: DEFAULT_MINE_MODEL,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") a.dryRun = true;
    else if (argv[i] === "--no-graph-merge") a.noGraphMerge = true;
    else if (argv[i] === "--force") a.force = true;
    else if (argv[i] === "--limit") {
      const n = parseInt(argv[++i], 10);
      if (!Number.isInteger(n) || n < 1) {
        console.error("[content-mine] --limit requires a positive integer");
        process.exit(2);
      }
      a.limit = n;
    }
    else if (argv[i] === "--root") a.root = argv[++i];
    else if (argv[i] === "--sidecar") a.sidecar = argv[++i];
    else if (argv[i] === "--out") a.out = argv[++i];
    else if (argv[i] === "--jsonl") a.jsonl = argv[++i];
    else if (argv[i] === "--checkpoint") a.checkpoint = argv[++i];
    else if (argv[i] === "--model") a.model = argv[++i];
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

// Atomic write of a JSONL file (array of records → one JSON line each).
function writeJsonlAtomic(p, records) {
  const dir = dirname(p);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = p + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""));
  try { renameSync(tmp, p); }
  catch (e) { try { unlinkSync(tmp); } catch { /* */ } throw e; }
}

function findAllZips(root) {
  const out = [];
  const seenReal = new Set();   // realpath cycle-guard against junction/symlink loops (Win11)
  const visit = (dir) => {
    let real;
    try { real = realpathSync(dir); } catch { return; }
    if (seenReal.has(real)) return;
    seenReal.add(real);
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const full = join(dir, name);
      let s;
      try { s = lstatSync(full); } catch { continue; }
      if (s.isSymbolicLink()) continue;   // never recurse a symlink (cycle / out-of-tree escape)
      if (s.isDirectory()) visit(full);
      else if (name.toLowerCase().endsWith(".zip")) out.push(full);
    }
  };
  visit(root);
  return out.sort();   // deterministic processing order
}

// Extract EVERY data.json entry from a zip (course root + all per-page/resource
// pages). Returns an array of parsed objects, each tagged with `_fullName` so
// the lib's deterministic dedup has a stable key. PowerShell's
// System.IO.Compression avoids unzipping gigabytes of static_resources.
function extractAllDataJson(zipPath) {
  // The zip path is passed via an ENVIRONMENT VARIABLE, never interpolated into
  // the script body — env values are inert data, so no quote/newline/backtick
  // in a filename can break out of or alter the command (Arm-A P1: the prior
  // `.replace(/'/g,"''")` only neutralized single quotes, not embedded `"`).
  // [Console]::OutputEncoding → UTF-8 is LOAD-BEARING: Windows PowerShell 5.1
  // writes stdout in the legacy console codepage by default. Course data.json
  // routinely contains non-ASCII (curly quotes, em-dashes, accented author
  // names) — without this line ConvertTo-Json's bytes are codepage-mangled and
  // Node's utf8 decode yields invalid JSON → JSON.parse throws → EXTRACT-FAIL.
  // This was the deterministic cause of the 31-course extraction gap.
  const ps = `
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    try {
      $zip = [System.IO.Compression.ZipFile]::OpenRead($env:PRISM_MINE_ZIP_PATH)
      $out = New-Object System.Collections.ArrayList
      foreach ($e in $zip.Entries) {
        if ($e.Name -ne 'data.json') { continue }
        $reader = New-Object System.IO.StreamReader($e.Open())
        $content = $reader.ReadToEnd()
        $reader.Close()
        [void]$out.Add(@{ fullName = $e.FullName; content = $content })
      }
      $zip.Dispose()
      ConvertTo-Json -InputObject @($out) -Depth 4 -Compress
    } catch {
      Write-Error $_.Exception.Message
      exit 1
    }
  `;
  // maxBuffer 200MB: data.json metadata only (NOT static_resources) — ample for
  // the MIT-OCW corpus; an overrun sets r.status≠0.
  // Bounded retry: spawning powershell.exe 227× while the 12-chat fleet runs
  // causes transient fork-storm spawn failures on Win11 (the documented
  // `xmalloc: cannot allocate` symptom) — the zip itself is fine. A spawn-level
  // failure (r.error) or non-zero exit is retried with backoff before giving up.
  const spawnOpts = {
    encoding: "utf8", maxBuffer: 200 * 1024 * 1024,
    // timeout: a corrupt/truncated zip can make powershell.exe hang inside
    // OpenRead/ReadToEnd; without this spawnSync blocks the whole batch
    // FOREVER. 60s is ~30× a normal extraction — a timeout kills the child,
    // sets r.error, and the retry loop converts it to a clean EXTRACT-FAIL.
    timeout: 60000, killSignal: "SIGKILL",
    env: { ...process.env, PRISM_MINE_ZIP_PATH: zipPath },
  };
  const sleepMs = (ms) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
  // 6 attempts with exponential backoff (400ms→6.4s, capped) — a fork-storm
  // window from the 12-chat fleet can last several seconds; a tight 3×250ms
  // retry rode straight through it and still failed. Worst case ~12s/course,
  // only ever paid by a genuinely contended extraction.
  const MAX_ATTEMPTS = 6;
  const MAX_TIMEOUT_HITS = 2;   // a hang reproduces — don't burn 6×60s on it
  let r = null;
  let timeoutHits = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], spawnOpts);
    if (!r.error && r.status === 0) break;
    // A signal kill = the spawnSync timeout fired = the child HUNG (corrupt /
    // truncated zip). That reproduces deterministically, so cap those attempts
    // low. A plain spawn error (no signal) is transient → full retry budget.
    if (r.signal) { timeoutHits++; if (timeoutHits >= MAX_TIMEOUT_HITS) break; }
    if (attempt < MAX_ATTEMPTS) sleepMs(Math.min(400 * 2 ** (attempt - 1), 6400));
  }
  if (!r || r.error || r.status !== 0) {
    if (process.env.PRISM_MINE_DEBUG) {
      console.error(`[DEBUG extract-fail] zip=${zipPath}\n  status=${r?.status} signal=${r?.signal} ` +
        `error=${r?.error ? (r.error.code || r.error.message) : "none"}\n  stderr=${JSON.stringify((r?.stderr || "").slice(0, 400))}`);
    }
    return null;
  }
  const raw = (r.stdout || "").trim();
  if (!raw) return [];
  let wrapper;
  try { wrapper = JSON.parse(raw); } catch { return null; }
  // PS ConvertTo-Json emits an object (not array) when there is exactly one
  // element — normalize to an array.
  const list = Array.isArray(wrapper) ? wrapper : (wrapper ? [wrapper] : []);
  const entries = [];
  for (const w of list) {
    if (!w || typeof w.content !== "string") continue;
    let obj;
    try { obj = JSON.parse(w.content); } catch { continue; }
    if (!obj || typeof obj !== "object") continue;
    obj._fullName = String(w.fullName || "");
    entries.push(obj);
  }
  return entries;
}

// Course-root data.json (shortest FullName) carries the real course_title —
// used to label a course that the iters-3-6 mapper missed.
function rootCourseTitle(entries) {
  let best = null;
  for (const e of entries) {
    if (typeof e.course_title === "string" && e.course_title.trim()) {
      const len = (e._fullName || "").length;
      if (!best || len < best.len) best = { title: e.course_title.trim(), len };
    }
  }
  return best ? best.title : "";
}

function slugFromZip(zipPath) {
  return basename(zipPath).replace(/\.zip$/i, "");
}

async function main() {
  const args = parseArgs(argv);
  const log = (...m) => console.log("[content-mine]", ...m);

  const zips = findAllZips(args.root);
  log(`zips found under ${args.root}: ${zips.length}`);
  if (zips.length === 0) { log("nothing to mine."); return; }

  // Course nodes (for domain-boost + record attribution). Missing sidecar is
  // non-fatal — candidates still mine, just without prismMapping domain boost.
  const sidecar = readJsonOrNull(args.sidecar);
  const nodesById = new Map();
  if (sidecar && Array.isArray(sidecar.nodes)) {
    for (const n of sidecar.nodes) if (n?.id) nodesById.set(n.id, n);
    log(`course nodes loaded: ${nodesById.size}`);
  } else {
    log(`WARN: sidecar missing/malformed (${args.sidecar}) — mining without domain boost.`);
  }

  // Checkpoint: { minedSlugs:[...], records:[...] } — idempotent resume. The
  // full record set lives in the checkpoint so a re-run reproduces the
  // complete ranked JSONL even when every course is checkpoint-skipped.
  const cp = readJsonOrNull(args.checkpoint) || {};
  const cpMinedSlugs = Array.isArray(cp.minedSlugs) ? cp.minedSlugs : [];
  const cpRecords = Array.isArray(cp.records) ? cp.records : [];
  // --force re-mines from scratch (ignore minedSlugs) but KEEPS the accumulated
  // records as the merge base — a --force run (esp. with --limit) must not
  // destroy records for courses it isn't touching this run (Arm-A P2-3).
  const doneSlugs = new Set(args.force ? [] : cpMinedSlugs);
  // Re-validate carried records against the CURRENT relevance floor — a record
  // written by an older lib build may no longer pass; drop the stale ones so
  // the JSONL never surfaces a candidate the current contract rejects
  // (Arm-A P2-2). Pure re-filter — records carry boundedRelevance + belowFloor.
  const records = cpRecords.filter(
    (r) => r && typeof r === "object" && r.belowFloor !== true
      && Number.isFinite(r.boundedRelevance) && r.boundedRelevance >= RELEVANCE_FLOOR);
  const staleDropped = cpRecords.length - records.length;
  log(`checkpoint: ${doneSlugs.size} mined-slug(s)${args.force ? " (IGNORED — --force)" : ""}, ` +
      `${records.length} record(s) carried${staleDropped > 0 ? ` (${staleDropped} stale dropped)` : ""}`);

  let processed = 0, mined = 0, skippedDone = 0, thinCorpus = 0, ollamaFail = 0, noData = 0, dropped = 0;
  const newRecords = [];

  for (const zipPath of zips) {
    if (processed >= args.limit) break;
    const slug = slugFromZip(zipPath);
    // Checkpoint-skipped courses do NOT consume the --limit budget — `processed`
    // counts only courses actually ATTEMPTED this run, so --limit is a true
    // "mine N new courses" knob that converges across re-runs (Arm-B P1).
    if (doneSlugs.has(slug)) { skippedDone++; continue; }
    processed++;

    const entries = extractAllDataJson(zipPath);
    if (entries === null) { noData++; log(`  [${processed}] EXTRACT-FAIL ${slug}`); continue; }

    const descriptors = collectResourceDescriptors(entries);
    if (descriptors.length < MIN_DESCRIPTORS_TO_MINE) {
      thinCorpus++;
      log(`  [${processed}] THIN ${slug} (${descriptors.length} descriptors < ${MIN_DESCRIPTORS_TO_MINE})`);
      doneSlugs.add(slug);   // mark done — re-running won't help a thin course
      continue;
    }

    const { corpus, usedCount, droppedForBudget } = aggregateCourseCorpus(descriptors);
    const nodeId = buildCourseNodeId(slug, PROVENANCE_SOURCE_DEFAULT);
    const courseNode = nodesById.get(nodeId) || null;
    const courseTitle = (courseNode && courseNode.title) || rootCourseTitle(entries) || slug;

    log(`  [${processed}/${zips.length}] mining ${slug} — ${usedCount} descriptors, prior=${corpusMfgPrior(corpus).toFixed(3)}`);
    const res = await callOllamaMine(courseTitle, corpus, { model: args.model, timeoutMs: 120000 });
    if (!res.ok) {
      ollamaFail++;
      log(`    OLLAMA-FAIL ${slug}: ${res.error}`);
      continue;   // NOT marked done — a re-run retries it (checkpoint resume)
    }

    const scored = scoreCandidate(res.parsed, courseNode, corpus);
    if (!passesRelevanceFloor(scored)) {
      dropped++;
      log(`    below relevance floor (boundedRel=${scored.boundedRelevance}) — dropped, marked done`);
      doneSlugs.add(slug);   // a relevance-failing course won't pass on re-run either
      continue;
    }

    const record = toCandidateRecord(courseNode, res.parsed, scored, {
      slug, descriptorsUsed: usedCount, model: args.model,
    });
    record.descriptorsDroppedForBudget = droppedForBudget;
    newRecords.push(record);
    doneSlugs.add(slug);
    mined++;
    log(`    ✓ rank=${scored.rank} techniques=${res.parsed.techniques.length} assets=${res.parsed.candidateAssets.length}`);
  }

  log(`stats: processed=${processed} mined=${mined} skippedDone=${skippedDone} thinCorpus=${thinCorpus} ollamaFail=${ollamaFail} extractFail=${noData} belowFloor=${dropped}`);

  // Fail-loud exit code (Karpathy R12): a run that mined NOTHING while courses
  // actually failed must not look like success to a /loop or cron caller —
  // sibling tribal-graph-course-embed.mjs exits 2/3 on failure; match that.
  // Set exitCode (not process.exit) so the checkpoint/JSONL writes below still
  // persist whatever partial progress exists.
  if (mined === 0 && (ollamaFail + noData) > 0) {
    process.exitCode = 4;
    log(`FAIL-LOUD (exit 4): 0 courses mined this run, ${ollamaFail} Ollama-fail + ${noData} extract-fail. ` +
        `Is Ollama up? → node scripts/ollama-docker-health.mjs`);
  }

  // Merge new records into the accumulated set (replace by courseId so a
  // --force re-mine supersedes a stale record), then rank descending.
  const byCourse = new Map(records.map((r) => [r.courseId, r]));
  for (const r of newRecords) byCourse.set(r.courseId, r);
  const allRecords = [...byCourse.values()].sort((a, b) => (b.rank || 0) - (a.rank || 0));

  if (mined === 0 && newRecords.length === 0) {
    log(`no new candidates this run (${allRecords.length} total in checkpoint).`);
    if (allRecords.length === 0) return;
  }

  if (args.dryRun) {
    log(`[dry-run] would write ${allRecords.length} ranked records to ${args.jsonl}`);
    log(`[dry-run] top candidate: ${allRecords[0] ? `${allRecords[0].courseTitle} (rank ${allRecords[0].rank})` : "none"}`);
    return;
  }

  // Persist checkpoint (idempotent resume) + the ranked JSONL review queue.
  writeJsonAtomic(args.checkpoint, {
    schemaVersion: "1.0.0",
    updatedAt: new Date().toISOString(),
    minedSlugs: [...doneSlugs].sort(),
    records: allRecords,
  });
  writeJsonlAtomic(args.jsonl, allRecords);
  log(`checkpoint written: ${args.checkpoint}`);
  log(`ranked review queue written: ${args.jsonl} (${allRecords.length} candidates)`);

  // ADVISORY graph emission — one candidate node per course, attached to its
  // course node so the review queue is visible on /system-viz. Tagged
  // advisoryOnly so a viewer can never mistake it for verified architecture.
  if (args.noGraphMerge) { log("graph merge skipped (--no-graph-merge)"); return; }
  const graph = readJsonOrNull(args.out);
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    log(`WARN: ${args.out} missing/malformed; skipping graph merge (JSONL still emitted).`);
    return;
  }
  const existingNodeIds = new Set(graph.nodes.map((n) => n?.id).filter(Boolean));
  const edgeKey = (e) => `${e.from}\x1f${e.to}\x1f${e.kind ?? ""}`;
  const existingEdges = new Set(graph.edges.map(edgeKey));
  let nodesAdded = 0, edgesAdded = 0, orphansSkipped = 0;
  for (const r of allRecords) {
    // Only emit a candidate node when its course node EXISTS in the graph to
    // anchor it — an edgeless advisory node is an un-navigable orphan on
    // /system-viz (Arm-A P2-4). The JSONL queue still carries every candidate,
    // anchored or not, so nothing is lost.
    if (!r.nodeId || !existingNodeIds.has(r.nodeId)) { orphansSkipped++; continue; }
    const candId = `course-content-candidate::${r.courseId}`;
    if (!existingNodeIds.has(candId)) {
      graph.nodes.push({
        id: candId,
        kind: "course-content-candidate",
        layerBand: "L4a",
        title: `Mined candidates — ${r.courseTitle}`.slice(0, 160),
        advisoryOnly: true,
        meta: {
          courseId: r.courseId, rank: r.rank, mfgRelevance: r.mfgRelevance,
          techniques: r.techniques, candidateAssetCount: r.candidateAssets.length,
          prismDomains: r.prismDomains, model: r.model, mustHumanVerify: true,
        },
      });
      existingNodeIds.add(candId);
      nodesAdded++;
    }
    const e = { from: r.nodeId, to: candId, kind: "course-content-candidate", weight: r.rank };
    if (!existingEdges.has(edgeKey(e))) { graph.edges.push(e); existingEdges.add(edgeKey(e)); edgesAdded++; }
  }
  writeJsonAtomic(args.out, graph);
  log(`graph: +${nodesAdded} candidate nodes, +${edgesAdded} edges` +
      `${orphansSkipped > 0 ? `, ${orphansSkipped} unanchored skipped (still in JSONL)` : ""}` +
      ` (total ${graph.nodes.length}/${graph.edges.length})`);
}

main().catch((e) => {
  console.error("[content-mine] FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});
