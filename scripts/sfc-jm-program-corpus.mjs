#!/usr/bin/env node
// scripts/sfc-jm-program-corpus.mjs
//
// SFC-JM-ACCURACY -- build the "as-programmed parameter corpus" by running the NC
// cutting-parameter extractor (scripts/lib/sfc-program-param-extract-lib.mjs) over
// EVERY posted-G-code program in H:/PRISM/JM DIE/. This is the data-production half
// of the operator goal "utilize ALL JM die parts and programs first to run full
// live tests of parameters". The downstream analyzer (sfc-jm-divergence) compares
// each row to PRISM's SFC recommendation; this just harvests what the shop ran.
//
// ENUMERATION TRUTH (R12 / ALL-MEANS-ALL): the partial jm-die-full-program-index.json
// holds only ~17k NC entries, but the live tree has ~119k .nc + ~35k .min. We walk
// the REAL tree (NC_TEXT_EXTS only -- binary .mcx/.f3d never text-scraped) and join
// the index's {customer, machineCategory} metadata by path where available; path
// heuristics fill the rest. Provenance (topFolder) is recorded so analysis can
// segment hand-written shop programs from CAM-posted output.
//
// RESUMABLE (the OCR-corpus lesson): durable row append BEFORE the cursor mark, so a
// reaper kill mid-run never marks a file done without its row. Re-run resumes at the
// cursor with zero re-reads. Cron-friendly: bounded --limit per invocation.
//
// USAGE:
//   node scripts/sfc-jm-program-corpus.mjs [--root <dir>] [--out <dir>] [--limit N]
//        [--index <path>] [--progress N] [--max-bytes N] [--json] [--reset]
// EXIT: 0 ok; 2 args/fatal.

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync,
  readdirSync, statSync,
} from "node:fs";
import { resolve, join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractCuttingParams, NC_TEXT_EXTS } from "./lib/sfc-program-param-extract-lib.mjs";
import { inferIsoGroup } from "./lib/sfc-material-infer.mjs";
import { computeStockPrior } from "./lib/sfc-jm-stock-prior.mjs";

const STOCK_CATALOG = "mcp-server/data/jm-die-database/jm-die-stock-material-catalog.json";

// Pull comment text out of a program (parenthesized + ';'-to-EOL forms). Material
// callouts live in comments -- scanning the G-code BODY would false-match the
// H-rule grade tokens (A2/D2/S7/M2) against spindle/M-codes, so we scan ONLY
// comments + the path/customer for the material hint.
function commentText(content) {
  const parts = [];
  for (const m of content.matchAll(/\(([^)]*)\)/g)) parts.push(m[1]);
  for (const m of content.matchAll(/;(.*)$/gm)) parts.push(m[1]);
  return parts.join(" ");
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROOT = process.env.PRISM_JM_DIE_ROOT || "H:/PRISM/JM DIE";
const DEFAULT_OUT = "state/shared/sfc-jm-program-corpus";
const DEFAULT_INDEX = "mcp-server/data/state/jm-die-full-program-index.json";
const DEFAULT_PROGRESS = 2000;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024; // skip absurdly large concatenated dumps

function parseArgs(argv) {
  const a = { root: DEFAULT_ROOT, out: DEFAULT_OUT, limit: 0, index: DEFAULT_INDEX,
    progress: DEFAULT_PROGRESS, maxBytes: DEFAULT_MAX_BYTES, json: false, reset: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--root") a.root = argv[++i];
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--index") a.index = argv[++i];
    else if (t === "--limit") a.limit = Number(argv[++i]) || 0;
    else if (t === "--progress") a.progress = Number(argv[++i]) || DEFAULT_PROGRESS;
    else if (t === "--max-bytes") a.maxBytes = Number(argv[++i]) || DEFAULT_MAX_BYTES;
    else if (t === "--json") a.json = true;
    else if (t === "--reset") a.reset = true;
  }
  return a;
}

// Depth-first NC-text file walk. Yields absolute paths. Skips obvious VCS/cache dirs.
function* walkNc(root) {
  const SKIP_DIR = new Set([".git", "node_modules", ".vite", "dist"]);
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIR.has(e.name)) stack.push(full);
      } else if (e.isFile()) {
        if (NC_TEXT_EXTS.has(extname(e.name).toLowerCase())) yield full;
      }
    }
  }
}

// Normalize a path for index-join keying (the index stores Windows-backslash paths).
const norm = (p) => p.replace(/\\/g, "/").toLowerCase();

function loadIndexMeta(indexPath) {
  const map = new Map();
  try {
    const raw = JSON.parse(readFileSync(indexPath, "utf8"));
    const labels = raw.labels || raw;
    const arr = Array.isArray(labels) ? labels : Object.values(labels);
    for (const e of arr) {
      if (e && e.filePath) map.set(norm(e.filePath), { customer: e.customer || null, machineCategory: e.machineCategory || null, materialHint: e.materialHint || null });
    }
  } catch { /* index optional -- path heuristics fill in */ }
  return map;
}

// Path-based provenance + machine-class fallback when the index has no row.
export function inferFromPath(p) {
  const u = norm(p);
  let machineCategory = null;
  if (/lathe|okuma|multus|turn/.test(u)) machineCategory = "lathe";
  else if (/mill|haas|vmc|hurco/.test(u)) machineCategory = "mill";
  const segs = p.replace(/\\/g, "/").split("/");
  const jmIdx = segs.findIndex((s) => s.toUpperCase() === "JM DIE");
  const topFolder = jmIdx >= 0 && segs[jmIdx + 1] ? segs[jmIdx + 1] : null;
  return { machineCategory, topFolder };
}

// SFC = mill/lathe/turn cutting only. Wire/sinker EDM, grinding, waterjet, laser
// and plasma are NOT speed/feed-calculator domains (their S/F/T codes are process
// parameters with different semantics -- e.g. a wire-EDM .MIN's "T1212" is a
// thread/condition code, not a tool). Exclude them so the corpus stays clean.
// Keep `unknown` machine class (most .MIN Okuma programs carry no path hint but
// ARE lathe/mill). Returns true if the file should be excluded from the SFC corpus.
const NON_SFC_PATH = /wire.?edm|sinker|\bedm\b|grind|waterjet|water.?jet|\blaser\b|plasma/i;
const NON_SFC_MACHINE = new Set(["wire_edm", "edm", "sinker_edm", "grinder", "waterjet", "laser", "plasma"]);
export function isNonSfc(filePath, machineCategory) {
  if (machineCategory && NON_SFC_MACHINE.has(machineCategory)) return true;
  if (NON_SFC_PATH.test(filePath)) return true;
  return false;
}

function loadCursor(cursorPath) {
  const done = new Set();
  if (existsSync(cursorPath)) {
    for (const line of readFileSync(cursorPath, "utf8").split(/\r?\n/)) {
      if (line) done.add(line);
    }
  }
  return done;
}

function main() {
  const args = parseArgs(process.argv);
  const outDir = resolve(REPO_ROOT, args.out);
  const root = resolve(args.root);
  const rowsPath = join(outDir, "program-params.jsonl");
  const cursorPath = join(outDir, "processed-cursor.txt");
  const summaryPath = join(outDir, "SUMMARY.json");

  if (!existsSync(root)) { console.error(`[fatal] root not found: ${root}`); process.exit(2); }
  mkdirSync(outDir, { recursive: true });
  if (args.reset) {
    for (const f of [rowsPath, cursorPath, summaryPath]) { try { writeFileSync(f, ""); } catch {} }
  }

  const indexMeta = loadIndexMeta(resolve(REPO_ROOT, args.index));

  // JM material PRIOR: when a program's material can't be inferred, default to the
  // shop's MODAL stock group (H -- 93.7% of JM purchases are tool steel) instead of
  // a generic P. Defaulting unknowns to P falsely makes JM's tool-steel-appropriate
  // lathe speeds look "conservative" vs carbide-steel Taylor.
  let jmDefaultIso = "P";
  try {
    const cat = JSON.parse(readFileSync(resolve(REPO_ROOT, STOCK_CATALOG), "utf8"));
    const prior = computeStockPrior(cat);
    jmDefaultIso = prior.modalIso;
    process.stderr.write(`[corpus] JM stock prior: modal ISO ${jmDefaultIso} (byIso ${JSON.stringify(prior.byIso)})\n`);
  } catch { /* catalog optional -- falls back to generic P */ }

  const done = args.reset ? new Set() : loadCursor(cursorPath);

  const stats = {
    startedAt: null, root, processedThisRun: 0, skippedAlreadyDone: 0,
    withOps: 0, withoutOps: 0, totalOps: 0, errors: 0, tooLarge: 0,
    skippedNonSfc: 0,
    byMachine: {}, byUnits: {}, byTopFolder: {}, joinedFromIndex: 0,
  };
  // timestamp injected by caller (Date.now() is unavailable in some sandboxes; ok in node CLI)
  stats.startedAt = new Date().toISOString();

  let seen = 0;
  for (const fp of walkNc(root)) {
    seen++;
    const key = norm(fp);
    if (done.has(key)) { stats.skippedAlreadyDone++; continue; }

    // SFC-domain gate: skip wire/sinker EDM, grinding, waterjet, laser, plasma
    // (non speed/feed-calculator domains) before reading the file.
    const preIdx = indexMeta.get(key);
    const preMachine = (preIdx && preIdx.machineCategory) || inferFromPath(fp).machineCategory || null;
    if (isNonSfc(fp, preMachine)) { stats.skippedNonSfc++; continue; }

    let row;
    try {
      const st = statSync(fp);
      if (st.size > args.maxBytes) {
        stats.tooLarge++;
        row = { filePath: fp, ok: false, reason: "too-large", sizeBytes: st.size };
      } else {
        const content = readFileSync(fp, "latin1"); // G-code is ASCII; latin1 avoids UTF decode throw
        const ex = extractCuttingParams(content, { filePath: fp });
        const idx = indexMeta.get(key);
        const pathInfo = inferFromPath(fp);
        const machineCategory = (idx && idx.machineCategory) || pathInfo.machineCategory || null;
        if (idx) stats.joinedFromIndex++;
        // Material: prefer a CONFIDENT comment callout, else a confident path/name
        // match, else the comment-default. Source recorded so physics-compare can
        // trust comment > path > default.
        const matComment = inferIsoGroup(commentText(content), jmDefaultIso);
        const matPath = inferIsoGroup(`${fp} ${(idx && idx.customer) || ""} ${pathInfo.topFolder || ""}`, jmDefaultIso);
        const material =
          matComment.confidence !== "default" ? { ...matComment, source: "comment" }
          : matPath.confidence !== "default" ? { ...matPath, source: "path" }
          : { iso: jmDefaultIso, confidence: "default", matched: null, source: "default" };
        if (material.source === "comment") stats.materialFromComment = (stats.materialFromComment || 0) + 1;
        row = {
          filePath: fp,
          customer: idx ? idx.customer : null,
          machineCategory,
          materialHint: idx ? idx.materialHint : null,
          materialIso: material.iso,
          materialConfidence: material.confidence,
          materialSource: material.source,
          materialMatched: material.matched,
          topFolder: pathInfo.topFolder,
          units: ex.units,
          ok: ex.ok,
          reason: ex.reason,
          opCount: ex.ops.length,
          ops: ex.ops,
          tools: ex.tools,
        };
        if (ex.ok) { stats.withOps++; stats.totalOps += ex.ops.length; }
        else stats.withoutOps++;
        stats.byMachine[machineCategory || "unknown"] = (stats.byMachine[machineCategory || "unknown"] || 0) + 1;
        stats.byUnits[ex.units] = (stats.byUnits[ex.units] || 0) + 1;
        if (pathInfo.topFolder) stats.byTopFolder[pathInfo.topFolder] = (stats.byTopFolder[pathInfo.topFolder] || 0) + 1;
      }
    } catch (e) {
      stats.errors++;
      row = { filePath: fp, ok: false, reason: `read-error:${e.code || e.message}` };
    }

    // DURABLE: row first, cursor second (kill-safe resume).
    appendFileSync(rowsPath, JSON.stringify(row) + "\n");
    appendFileSync(cursorPath, key + "\n");
    stats.processedThisRun++;

    if (stats.processedThisRun % args.progress === 0) {
      process.stderr.write(`[corpus] processed ${stats.processedThisRun} (seen ${seen}, withOps ${stats.withOps}, ops ${stats.totalOps})\n`);
    }
    if (args.limit && stats.processedThisRun >= args.limit) break;
  }

  stats.totalSeenThisWalk = seen;
  stats.totalDoneCumulative = done.size + stats.processedThisRun;
  writeFileSync(summaryPath, JSON.stringify(stats, null, 2));

  if (args.json) console.log(JSON.stringify(stats, null, 2));
  else {
    console.log(`[corpus] done. processed ${stats.processedThisRun} this run (${stats.skippedAlreadyDone} already done).`);
    console.log(`  withOps ${stats.withOps} | withoutOps ${stats.withoutOps} | totalOps ${stats.totalOps} | tooLarge ${stats.tooLarge} | errors ${stats.errors}`);
    console.log(`  byMachine ${JSON.stringify(stats.byMachine)}`);
    console.log(`  byUnits ${JSON.stringify(stats.byUnits)}`);
    console.log(`  cumulative done: ${stats.totalDoneCumulative}`);
  }
  process.exit(0);
}

// Run only as a CLI; importing for tests must NOT trigger the corpus walk.
const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) main();
