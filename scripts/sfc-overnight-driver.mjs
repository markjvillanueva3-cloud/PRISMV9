#!/usr/bin/env node
/**
 * sfc-overnight-driver.mjs (slot:oscar) -- SFC-OVERNIGHT/U-OSC-OVERNIGHT-SWEEP
 * ==========================================================================
 * Runs the FULL SFC test-combination suite overnight on the 32-thread host and leaves
 * morning-reviewable results. Three concurrent workloads:
 *
 *   (1) EXHAUSTIVE result sweep -- the customer-page ProductEngine across material x tool x
 *       flutes x tool-material x operation x coolant x the ap(depth) x ae(width) ENGAGEMENT
 *       GRID, sharded N-ways across the CPU (sfc-exhaustive-combinatorial-sweep.mjs --shard).
 *       Each cell is CLASSIFIED (ok / blocked-safety / DEFECT / SUSPECT) and cross-checked by
 *       the silent-wrong math oracle. The grid fineness ESCALATES each round (toward the
 *       0.001" = 0.0254 mm step) so the finest COMPLETED round is always ready by morning.
 *   (2) TRI-VENDOR comparison -- SFC vs G-Wizard + HSMAdvisor + traditional baseline
 *       (sfc-full-sweep-compare.mjs --mode full); the calibration-divergence signal.
 *   (3) DISCRETE-AXIS dataset -- the parallel cartesian sweep --persist; the swept
 *       (input -> speed/feed) dataset that feeds the downstream GPU/LoRA calibration.
 *
 * Writes per-round merged JSON + a rolling SUMMARY.md to <out-dir>. RESUMABLE: a round/job
 * whose output already exists is skipped, so a restart continues where it left off. Pure
 * helpers (parseDriverArgs / gridSchedule / mergeShardSummaries / renderSummaryMd) are
 * exported + unit-tested; only main() spawns children.
 *
 * Run (detached, overnight):
 *   node scripts/sfc-overnight-driver.mjs [--shards 28] [--grids 16,24,36,54,80,120]
 *        [--max-per-shard 3000000] [--out-dir <dir>] [--no-vendor] [--no-dataset] [--smoke]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(SELF), "..");
const EXHAUSTIVE = path.join(REPO, "scripts", "sfc-exhaustive-combinatorial-sweep.mjs");
const VENDOR = path.join(REPO, "mcp-server", "scripts", "sfc-full-sweep-compare.mjs");
const PARALLEL = path.join(REPO, "mcp-server", "scripts", "sfc-parallel-combo-sweep.mjs");
const TSX_CLI = path.join(REPO, "mcp-server", "node_modules", "tsx", "dist", "cli.mjs");

// ---------- pure, testable helpers ----------

export function parseDriverArgs(argv) {
  const get = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def; };
  const has = (name) => argv.includes(`--${name}`);
  const smoke = has("smoke");
  const cpu = os.cpus()?.length || 8;
  return {
    shards: Math.max(1, parseInt(get("shards", String(smoke ? 2 : Math.max(2, cpu - 2))), 10)),
    grids: gridSchedule(get("grids", smoke ? "6" : "16,24,36,54,80,120")),
    maxPerShard: parseInt(get("max-per-shard", String(smoke ? 400 : 3000000)), 10),
    outDir: get("out-dir", null),
    vendor: !has("no-vendor") && !smoke,
    dataset: !has("no-dataset") && !smoke,
    smoke,
  };
}

// "16,24,36" -> [16,24,36]; dedupes, keeps ascending order, drops non-finite/<2.
export function gridSchedule(spec) {
  const seen = new Set();
  return String(spec).split(",").map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 2)
    .filter((n) => (seen.has(n) ? false : (seen.add(n), true)))
    .sort((a, b) => a - b);
}

// Merge N shard summaries (each from sfc-exhaustive-combinatorial-sweep.mjs) into one round summary.
export function mergeShardSummaries(summaries, { maxBreaks = 4000 } = {}) {
  const counts = {};
  const oracleByKind = {};
  let totalProbed = 0, perCellHits = 0, crossCellHits = 0, capped = false, shardsOk = 0;
  const breaks = [], perCellBreaks = [], crossCellBreaks = [];
  for (const s of summaries) {
    if (!s || typeof s !== "object") continue;
    shardsOk++;
    totalProbed += s.totalProbed || 0;
    capped = capped || !!s.capped;
    for (const [k, v] of Object.entries(s.counts || {})) counts[k] = (counts[k] || 0) + (v || 0);
    const o = s.oracle || {};
    perCellHits += o.perCellHits || 0;
    crossCellHits += o.crossCellHits || 0;
    for (const [k, v] of Object.entries(o.byKind || {})) oracleByKind[k] = (oracleByKind[k] || 0) + (v || 0);
    for (const b of s.breaks || []) if (breaks.length < maxBreaks) breaks.push(b);
    for (const b of o.perCellBreaks || []) if (perCellBreaks.length < maxBreaks) perCellBreaks.push(b);
    for (const b of o.crossCellBreaks || []) if (crossCellBreaks.length < maxBreaks) crossCellBreaks.push(b);
  }
  const defects = Object.entries(counts).filter(([k]) => k.startsWith("DEFECT") || k === "THROW" || k === "no_result").reduce((a, [, n]) => a + n, 0);
  const suspects = Object.entries(counts).filter(([k]) => k.startsWith("SUSPECT")).reduce((a, [, n]) => a + n, 0);
  return {
    shardsOk, totalProbed, capped, counts,
    ok: counts.ok || 0, blocked: counts.blocked || 0, defects, suspects,
    oracle: { perCellHits, crossCellHits, byKind: oracleByKind, perCellBreaks, crossCellBreaks },
    breaks,
  };
}

export function renderSummaryMd(state) {
  const { startedAt, updatedAt, args, rounds, vendor, dataset } = state;
  const L = [];
  L.push(`# SFC Overnight Combination Sweep -- results`);
  L.push(``);
  L.push(`Started ${startedAt} -- updated ${updatedAt} (slot:oscar, U-OSC-OVERNIGHT-SWEEP).`);
  L.push(`Shards: ${args?.shards} | grids: ${(args?.grids || []).join(", ")} | max/shard: ${args?.maxPerShard?.toLocaleString?.() ?? args?.maxPerShard}`);
  L.push(``);
  L.push(`## Exhaustive result sweep (ProductEngine, classified + silent-wrong oracle, ap x ae grid)`);
  L.push(``);
  L.push(`| grid | cells probed | ok | blocked(safety) | DEFECTS | SUSPECT | oracle (silent-wrong) |`);
  L.push(`|---|---|---|---|---|---|---|`);
  for (const r of rounds || []) {
    const m = r.merged || {};
    const oTot = (m.oracle?.perCellHits || 0) + (m.oracle?.crossCellHits || 0);
    L.push(`| ${r.grid}${r.complete ? "" : " (running)"} | ${(m.totalProbed || 0).toLocaleString()} | ${(m.ok || 0).toLocaleString()} | ${(m.blocked || 0).toLocaleString()} | ${m.defects || 0} | ${m.suspects || 0} | ${oTot} |`);
  }
  L.push(``);
  const finest = (rounds || []).filter((r) => r.complete).slice(-1)[0];
  if (finest) {
    const m = finest.merged;
    L.push(`### Finest completed round: grid ${finest.grid} (${(m.totalProbed || 0).toLocaleString()} cells)`);
    if (m.defects > 0 || m.suspects > 0 || (m.oracle?.perCellHits || 0) > 0 || (m.oracle?.crossCellHits || 0) > 0) {
      L.push(`- **DEFECTS** (non-finite/negative published value): ${m.defects}`);
      L.push(`- **SUSPECT** (out-of-band Vc/rpm/life sentinel): ${m.suspects}`);
      L.push(`- **silent-wrong oracle**: perCell ${m.oracle?.perCellHits || 0}, crossCell ${m.oracle?.crossCellHits || 0}, byKind ${JSON.stringify(m.oracle?.byKind || {})}`);
      L.push(`- first breaks:`);
      for (const b of (m.breaks || []).slice(0, 8)) L.push(`  - [${b.class}] ${b.material} D${b.tool_diameter} z${b.number_of_teeth} ${b.operation} ap${b.depth} ae${b.width} -> ${b.detail}`);
    } else {
      L.push(`- **CLEAN**: every probed combination returned a finite, positive, in-band, math-consistent SFC result (0 defects / 0 suspects / 0 oracle violations).`);
    }
    L.push(``);
  }
  L.push(`## Tri-vendor comparison (SFC vs G-Wizard + HSMAdvisor + traditional)`);
  L.push(vendor?.done ? `- ledger: \`${vendor.ledger || "(see out-dir)"}\` -- ${vendor.note || "complete"}` : `- ${vendor?.skipped ? "skipped" : "running / pending"}`);
  L.push(``);
  L.push(`## Discrete-axis dataset (for GPU/LoRA calibration)`);
  L.push(dataset?.done ? `- ${dataset.note || "complete"}` : `- ${dataset?.skipped ? "skipped" : "running / pending"}`);
  L.push(``);
  return L.join("\n");
}

function todayStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------- side-effecting runner (only reached via main) ----------

function spawnChild(file, childArgs, logStream) {
  // tsx lives in mcp-server/node_modules (not the repo-root cwd), so resolve it by ABSOLUTE path --
  // `node --import tsx` would ERR_MODULE_NOT_FOUND from the H:/prism cwd. (useTsx param retired.)
  const args = [TSX_CLI, file, ...childArgs];
  return new Promise((res) => {
    // Child stdout/stderr are IGNORED, never piped to the driver log: the engines emit a per-cell
    // [DEBUG] [Kienzle]/[Taylor] line on STDERR (so the sweep's console.* silencing misses it), which
    // exploded driver.log to multi-GB on the first overnight run. The driver needs only the exit code
    // (via 'close') and reads every result from the shard/ledger JSON files on disk -- not child stdout.
    const c = spawn(process.execPath, args, { cwd: REPO, windowsHide: true, stdio: ["ignore", "ignore", "ignore"] });
    c.on("close", (code) => res(code ?? 1));
    c.on("error", (e) => { logStream?.write(`spawn error: ${e?.message}\n`); res(1); });
  });
}

async function runExhaustiveRound(grid, opts) {
  const { shards, maxPerShard, outDir, log } = opts;
  const roundDir = path.join(outDir, `exhaustive-grid${grid}`);
  fs.mkdirSync(roundDir, { recursive: true });
  const shardOut = (i) => path.join(roundDir, `shard-${i}of${shards}.json`);
  const procs = [];
  for (let i = 0; i < shards; i++) {
    if (fs.existsSync(shardOut(i))) { procs.push(Promise.resolve(0)); continue; } // resume: shard already done
    procs.push(spawnChild(EXHAUSTIVE, ["--grid", String(grid), "--max", String(maxPerShard), "--shard", `${i}/${shards}`, "--out", shardOut(i)], log, false));
  }
  await Promise.all(procs);
  const summaries = [];
  for (let i = 0; i < shards; i++) {
    try { summaries.push(JSON.parse(fs.readFileSync(shardOut(i), "utf8"))); } catch { /* missing shard -> partial */ }
  }
  const merged = mergeShardSummaries(summaries);
  const complete = summaries.length === shards;
  fs.writeFileSync(path.join(outDir, `exhaustive-grid${grid}-merged.json`), JSON.stringify({ grid, complete, merged }, null, 2));
  return { grid, complete, merged };
}

async function main() {
  const args = parseDriverArgs(process.argv.slice(2));
  const outDir = args.outDir || path.join(REPO, "state", "shared", "sfc-overnight", todayStamp());
  fs.mkdirSync(outDir, { recursive: true });
  const log = fs.createWriteStream(path.join(outDir, "driver.log"), { flags: "a" });
  const startedAt = new Date().toISOString();
  const state = { startedAt, updatedAt: startedAt, args, rounds: [], vendor: {}, dataset: {} };
  const writeSummary = () => { state.updatedAt = new Date().toISOString(); fs.writeFileSync(path.join(outDir, "SUMMARY.md"), renderSummaryMd(state)); fs.writeFileSync(path.join(outDir, "state.json"), JSON.stringify(state, null, 2)); };
  log.write(`[driver] start ${startedAt} shards=${args.shards} grids=${args.grids.join(",")} max/shard=${args.maxPerShard} out=${outDir}\n`);
  writeSummary();

  // (1) escalating-grid exhaustive rounds -- each completes before the next (finest-completed always ready)
  for (const grid of args.grids) {
    const mergedPath = path.join(outDir, `exhaustive-grid${grid}-merged.json`);
    if (fs.existsSync(mergedPath)) { // resume
      try { state.rounds.push(JSON.parse(fs.readFileSync(mergedPath, "utf8"))); writeSummary(); log.write(`[driver] grid ${grid} already done -> skip\n`); continue; } catch { /* re-run */ }
    }
    log.write(`[driver] grid ${grid} -> ${args.shards} shards ...\n`);
    const round = await runExhaustiveRound(grid, { shards: args.shards, maxPerShard: args.maxPerShard, outDir, log });
    state.rounds.push(round);
    writeSummary();
    log.write(`[driver] grid ${grid} done: probed=${round.merged.totalProbed} ok=${round.merged.ok} blocked=${round.merged.blocked} defects=${round.merged.defects} suspect=${round.merged.suspects} complete=${round.complete}\n`);
  }

  // (2) tri-vendor comparison (one-shot, resume-skip)
  if (args.vendor) {
    const vledger = path.join(outDir, "vendor-compare-ledger.jsonl");
    if (fs.existsSync(vledger)) { state.vendor = { done: true, ledger: vledger, note: "already present (resume)" }; }
    else { log.write(`[driver] vendor compare (full) ...\n`); const code = await spawnChild(VENDOR, ["--mode", "full", "--out", vledger], log, true); state.vendor = code === 0 ? { done: true, ledger: vledger, note: "complete" } : { done: false, note: `exit ${code}` }; }
    writeSummary();
  } else state.vendor = { skipped: true };

  // (3) discrete-axis dataset (one-shot)
  if (args.dataset) {
    log.write(`[driver] discrete dataset (parallel --persist) ...\n`);
    const code = await spawnChild(PARALLEL, ["--workers", String(args.shards), "--persist", "--out", path.join(outDir, "discrete-dataset")], log, false);
    state.dataset = code === 0 ? { done: true, note: `dataset -> ${path.join(outDir, "discrete-dataset")}` } : { done: false, note: `exit ${code}` };
    writeSummary();
  } else state.dataset = { skipped: true };

  log.write(`[driver] ALL DONE ${new Date().toISOString()}\n`);
  writeSummary();
  log.end();
}

const INVOKED = process.argv[1] && path.resolve(process.argv[1]) === SELF;
if (INVOKED) main().catch((e) => { console.error(`[sfc-overnight-driver] fatal: ${e?.stack || e}`); process.exit(1); });
