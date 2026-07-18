#!/usr/bin/env node
/**
 * SFC-COMBO/U-SFC-PARALLEL-SWEEP (slot:oscar, 2026-06-24) -- genuinely USE the
 * new 9950X3D 32-thread host for the SFC combination tests.
 *
 * WHY a new harness: the orchestrator-based sfc-variability-batch-run.mjs is
 * blocked (importing SpeedFeedOrchestratorEngine transitively boots the MCP
 * server -> worker hangs). This harness drives the LIGHT, server-free
 * UltimateSpeedFeedEngine (the same engine sfc-combination-sweep.ts proved
 * imports cleanly + runs at ~0.06 ms/cell) across N child processes, each
 * computing every Nth combination of the cartesian product. Read-only (no
 * engine change). Reports per-worker + aggregate throughput so the 32-thread
 * speedup is measurable.
 *
 * USAGE:
 *   cd mcp-server && node scripts/sfc-parallel-combo-sweep.mjs --workers 24 [--max-cells N]
 * INTERNAL (spawned per worker): --workerIdx i/N
 */
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO_MCP = resolve(SELF, "..", ".."); // mcp-server/
const TSX_CLI = resolve(REPO_MCP, "node_modules/tsx/dist/cli.mjs");

// ---- combination axes (cartesian product) ----
const ISO = ["P", "M", "K", "N", "S", "H"];
const DIA = [3, 4, 6, 8, 10, 12, 16, 20, 25, 32]; // 10
const FLUTES = [2, 3, 4, 5, 6]; // 5
const TOOLMAT = ["carbide", "hss", "cermet", "ceramic", "cbn"]; // 5
const COOLANT = ["flood", "dry", "mist", "mql", "air_blast", "through_tool", "cryogenic"]; // 7
const RIGID = ["low", "medium", "high"]; // 3
const OP = ["milling", "turning", "drilling"]; // 3
const STRAT = ["conventional", "hsm", "adaptive"]; // 3
const MODE = ["tool_life", "balanced", "productivity"]; // 3
const AXES = [ISO, DIA, FLUTES, TOOLMAT, COOLANT, RIGID, OP, STRAT, MODE];
const KEYS = ["iso_group", "tool_diameter_mm", "flutes", "tool_material", "coolant", "machine_rigidity", "operation", "strategy", "optimize_for"];
const TOTAL = AXES.reduce((n, a) => n * a.length, 1); // = 6*10*5*5*7*3*3*3*3 = 8,505,000

function comboAt(index) {
  const o = {};
  let i = index;
  for (let a = AXES.length - 1; a >= 0; a--) {
    const len = AXES[a].length;
    o[KEYS[a]] = AXES[a][i % len];
    i = Math.floor(i / len);
  }
  return o;
}

function parseArgs(argv) {
  const a = { workers: 24, maxCells: Infinity, workerIdx: null, workerN: null, persist: false, out: "state/shared/sfc-parallel-sweep-results" };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--workers") a.workers = Number(argv[++i]) || 24;
    else if (t === "--max-cells") a.maxCells = Number(argv[++i]) || Infinity;
    else if (t === "--workerIdx") { const [idx, n] = argv[++i].split("/").map(Number); a.workerIdx = idx; a.workerN = n; }
    else if (t === "--persist") a.persist = true;
    else if (t === "--out") a.out = argv[++i];
  }
  return a;
}

const MS_PER_SEC = 1000;

async function runWorker(args) {
  // Light engine imports cleanly (no MCP-server boot) -- proven by combination-sweep.ts.
  const { ultimateSpeedFeedEngine } = await import("../src/engines/UltimateSpeedFeedEngine.js");
  const { workerIdx, workerN, maxCells, persist, out } = args;
  let processed = 0, ok = 0, err = 0;
  let min = Infinity, max = -Infinity;
  const distinct = new Set();
  // Optional JSONL persistence (one chunk file per worker) -- the swept
  // (input -> cutting-speed) dataset for downstream GPU/LoRA training.
  let stream = null;
  if (persist) {
    const outAbs = resolve(REPO_MCP, "..", out);
    mkdirSync(outAbs, { recursive: true });
    stream = createWriteStream(resolve(outAbs, `sweep-w${workerIdx}of${workerN}.jsonl`));
  }
  const t0 = Number(process.hrtime.bigint() / 1000000n);
  for (let idx = workerIdx; idx < TOTAL; idx += workerN) {
    if (processed >= maxCells) break;
    const input = comboAt(idx);
    processed++;
    try {
      const vc = ultimateSpeedFeedEngine.calculate(input).cutting_speed.value;
      if (typeof vc === "number" && isFinite(vc)) {
        ok++;
        if (vc < min) min = vc;
        if (vc > max) max = vc;
        distinct.add(Math.round(vc * 10)); // 0.1 m/min bucket
        if (stream) stream.write(JSON.stringify({ idx, in: input, vc: Number(vc.toFixed(2)) }) + "\n");
      } else err++;
    } catch { err++; }
  }
  if (stream) await new Promise((r) => stream.end(r));
  const elapsedMs = Math.max(1, Number(process.hrtime.bigint() / 1000000n) - t0);
  process.stdout.write(JSON.stringify({
    worker: `${workerIdx}/${workerN}`, processed, ok, err,
    vc_min: isFinite(min) ? Number(min.toFixed(1)) : null,
    vc_max: isFinite(max) ? Number(max.toFixed(1)) : null,
    distinct: distinct.size,
    rate_per_sec: Math.round(processed / (elapsedMs / MS_PER_SEC)),
  }) + "\n");
}

async function runParent(args) {
  const perWorkerCap = Number.isFinite(args.maxCells) ? Math.ceil(args.maxCells / args.workers) : Infinity;
  console.log(`[parallel-sweep] total combinations: ${TOTAL.toLocaleString()} | workers: ${args.workers} | per-worker cap: ${perWorkerCap === Infinity ? "none" : perWorkerCap}`);
  const t0 = Number(process.hrtime.bigint() / 1000000n);
  const procs = [];
  for (let i = 0; i < args.workers; i++) {
    const childArgs = ["--workerIdx", `${i}/${args.workers}`];
    if (Number.isFinite(perWorkerCap)) childArgs.push("--max-cells", String(perWorkerCap));
    if (args.persist) childArgs.push("--persist", "--out", args.out);
    const child = spawn(
      process.execPath,
      ["--max-old-space-size=2048", TSX_CLI, SELF, ...childArgs],
      { stdio: ["ignore", "pipe", "inherit"], cwd: REPO_MCP, windowsHide: true,
        env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=2048`.trim() } },
    );
    let buf = "";
    child.stdout.on("data", (c) => { buf += c.toString("utf8"); });
    procs.push(new Promise((res) => child.on("close", () => {
      try { res(JSON.parse(buf.trim().split("\n").filter(Boolean).pop())); } catch { res(null); }
    })));
  }
  const results = (await Promise.all(procs)).filter(Boolean);
  const elapsedSec = (Number(process.hrtime.bigint() / 1000000n) - t0) / MS_PER_SEC;
  const processed = results.reduce((s, r) => s + r.processed, 0);
  const ok = results.reduce((s, r) => s + r.ok, 0);
  const errc = results.reduce((s, r) => s + r.err, 0);
  const mins = results.map((r) => r.vc_min).filter((x) => x != null);
  const maxs = results.map((r) => r.vc_max).filter((x) => x != null);
  const gMin = mins.length ? Math.min(...mins) : null;
  const gMax = maxs.length ? Math.max(...maxs) : null;
  console.log(`\n=== AGGREGATE (${args.workers} workers, ${elapsedSec.toFixed(1)}s wall) ===`);
  console.log(`processed:     ${processed.toLocaleString()} combinations`);
  console.log(`computed OK:   ${ok.toLocaleString()} (${errc} err)`);
  console.log(`global Vc:     ${gMin} .. ${gMax} m/min${gMin && gMax && gMin > 0 ? `  (${(gMax / gMin).toFixed(1)}x)` : ""}`);
  console.log(`throughput:    ${Math.round(processed / elapsedSec).toLocaleString()} cells/sec aggregate (${args.workers} threads)`);
  console.log(`per-worker:    ~${Math.round(processed / elapsedSec / args.workers).toLocaleString()} cells/sec/thread`);
  if (args.persist) console.log(`persisted:     ${ok.toLocaleString()} rows (JSONL) -> ${args.out}/sweep-w*of${args.workers}.jsonl`);
}

const args = parseArgs(process.argv);
const INVOKED = process.argv[1] && resolve(process.argv[1]) === SELF;
if (INVOKED) {
  (args.workerIdx != null ? runWorker(args) : runParent(args)).catch((e) => {
    console.error(`[parallel-sweep] fatal: ${e?.stack || e}`);
    process.exit(1);
  });
}
