/**
 * SFC FULL LIVE-AXIS SWEEP -- the deep-test run (SFC-DEEP-TEST-FULLSPACE-PLAN, Stage 2).
 *
 * Runs the REAL `UltimateSpeedFeedEngine` (fast_bulk) over the full 1,463,132,160-cell live-axis space
 * (or a slice / shard / bounded cap) and STREAM-REDUCES every outcome to O(1) memory: validity counts,
 * per-metric Welford stats + min/max, clamp-binding rates, the rpm-cap invariant, per-ISO / per-operation
 * tallies, and a bounded set of non-physical exemplars. No re-implementation of the physics -- it IS the
 * engine, so the result is maximally faithful (the "factored computer" the plan first proposed is
 * unnecessary: measured throughput is ~0.05 ms/call in fast_bulk, so a direct full-space run is feasible
 * -- ~22 h single-thread, ~44 min across 30 process-shards).
 *
 * USAGE (run via tsx; from a slot worktree use the main-tree tsx):
 *   H:/PRISM/mcp-server/node_modules/.bin/tsx scripts/sfc-fullspace-sweep.mjs [opts]
 *     --offset N --count M     process slice [N, N+M)         (default: whole space)
 *     --shard k/N              process partition k of N        (k in [0,N))
 *     --max M                  hard cap on cells processed     (bounded validation run)
 *     --out PATH               JSON reduction output           (default: state/sfc-fullspace/sweep-<lo>-<n>.json)
 *     --exemplars N            keep <=N non-physical exemplars  (default 25)
 *     --progress M             checkpoint + log every M cells   (default 1_000_000)
 *
 * Fail-loud per cell: an engine throw is counted + sampled, never fabricated -- the sweep continues so one
 * bad regime cannot abort a billion-cell run (R12). Writes a checkpoint every --progress cells so a reaper
 * kill loses at most one interval (durable-partial; the cron-OOM lesson).
 *
 * @module scripts/sfc-fullspace-sweep
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ultimateSpeedFeedEngine } from "../src/engines/UltimateSpeedFeedEngine.js";
import { CombinatorialSpeedFeedHarnessDriver } from "../src/data/sfc-combinatorial-driver.js";
import {
  SFC_FULLSPACE_SIZE,
  fullCellAtIndex,
  partitionFullSpace,
} from "../src/data/sfc-fullspace-enumerator.js";

const DEFAULT_MAX_RPM = 15000; // engine default when input.machine_max_rpm is unset (UltimateSpeedFeedEngine.ts:2253)

// ---- arg parse -------------------------------------------------------------
function parseArgs(argv) {
  const a = { offset: 0, count: SFC_FULLSPACE_SIZE, max: Infinity, out: null, exemplars: 25, progress: 1_000_000, stride: 1 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--offset") { a.offset = Number(v); i++; }
    else if (k === "--count") { a.count = Number(v); i++; }
    else if (k === "--max") { a.max = Number(v); i++; }
    else if (k === "--stride") { a.stride = Number(v); i++; }
    else if (k === "--out") { a.out = v; i++; }
    else if (k === "--exemplars") { a.exemplars = Number(v); i++; }
    else if (k === "--progress") { a.progress = Number(v); i++; }
    else if (k === "--shard") {
      const [ks, ns] = String(v).split("/");
      const kk = Number(ks), nn = Number(ns);
      if (!Number.isInteger(kk) || !Number.isInteger(nn) || nn <= 0 || kk < 0 || kk >= nn) {
        throw new Error(`--shard must be k/N with 0<=k<N (got ${v})`);
      }
      const part = partitionFullSpace(nn)[kk];
      a.offset = part.offset; a.count = part.count;
      a.shardLabel = `${kk}of${nn}`;
      i++;
    }
  }
  if (!Number.isInteger(a.offset) || a.offset < 0 || a.offset >= SFC_FULLSPACE_SIZE) {
    throw new Error(`--offset out of range [0, ${SFC_FULLSPACE_SIZE}) (got ${a.offset})`);
  }
  if (!Number.isFinite(a.count) || a.count <= 0) throw new Error(`--count must be > 0 (got ${a.count})`);
  if (!Number.isInteger(a.stride) || a.stride < 1) throw new Error(`--stride must be an integer >= 1 (got ${a.stride})`);
  // --shard partitions the space into contiguous slices; --stride>1 walks the WHOLE space from `offset`.
  // Combining them makes each shard re-walk the full space -> massive cross-shard OVERLAP (double-count).
  // They are mutually exclusive sweep modes -- fail loud rather than silently double-count (scrutiny arm-C P2).
  if (a.shardLabel && a.stride > 1) {
    throw new Error(`--shard and --stride>1 are mutually exclusive (shard = contiguous partition; stride = full-space sample). Got --shard ${a.shardLabel} with --stride ${a.stride}.`);
  }
  return a;
}

// ---- streaming accumulators ------------------------------------------------
function newMetric() { return { n: 0, min: Infinity, max: -Infinity, mean: 0, m2: 0 }; }
function pushMetric(m, x) {
  // Welford online mean/variance; ignores non-finite (counted separately as nonphysical).
  if (!Number.isFinite(x)) return false;
  m.n++;
  const d = x - m.mean;
  m.mean += d / m.n;
  m.m2 += d * (x - m.mean);
  if (x < m.min) m.min = x;
  if (x > m.max) m.max = x;
  return true;
}
function finalizeMetric(m) {
  return {
    n: m.n,
    min: m.n ? m.min : null,
    max: m.n ? m.max : null,
    mean: m.n ? m.mean : null,
    std: m.n > 1 ? Math.sqrt(m.m2 / (m.n - 1)) : 0,
  };
}

function num(x) { return typeof x === "number" ? x : (x && typeof x.value === "number" ? x.value : NaN); }

// ---- main ------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv.slice(2));
  // stride==1: contiguous slice [offset, offset+count). stride>1: walk the WHOLE space from offset
  // stepping `stride` (a representative full-space SAMPLE spanning all 72 overlays + all base regimes),
  // bounded by --max. `count` only bounds the contiguous mode.
  const iterEnd = args.stride > 1 ? SFC_FULLSPACE_SIZE : Math.min(args.offset + args.count, SFC_FULLSPACE_SIZE);
  const spanCells = Math.max(0, iterEnd - args.offset);
  const plannedTotal = Math.min(Math.ceil(spanCells / args.stride), args.max);
  const outPath = args.out
    || path.join("state", "sfc-fullspace", `sweep-${args.offset}-${args.count}${args.shardLabel ? "-" + args.shardLabel : ""}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const ISO = ["P", "M", "K", "N", "S", "H"];
  const OPS = ["milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling"];

  const state = {
    counts: { processed: 0, driven: 0, errors: 0, nonphysical: 0, rpmCapViolations: 0 },
    metrics: {
      vc: newMetric(), rpm: newMetric(), vf: newMetric(), mrr: newMetric(),
      force: newMetric(), power: newMetric(), life: newMetric(),
    },
    clamps: { rpm_capped: 0, power_over_budget: 0, thermal_risk: 0 },
    byIso: Object.fromEntries(ISO.map(k => [k, { processed: 0, nonphysical: 0 }])),
    byOp: Object.fromEntries(OPS.map(k => [k, { processed: 0, nonphysical: 0 }])),
    exemplars: { nonphysical: [], rpmViolation: [] },
    errorsSample: [],
  };

  const t0 = process.hrtime.bigint();

  const writeOut = (done) => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const rep = {
      meta: {
        artifact: "sfc-fullspace-sweep",
        engine: "UltimateSpeedFeedEngine (fast_bulk)",
        fullSpaceSize: SFC_FULLSPACE_SIZE,
        offset: args.offset, count: args.count, stride: args.stride, plannedTotal,
        mode: args.stride > 1 ? "strided-fullspace-sample" : "contiguous",
        shard: args.shardLabel ?? null,
        done,
        elapsedMs: Math.round(ms),
        msPerCall: state.counts.processed ? +(ms / state.counts.processed).toFixed(5) : null,
      },
      counts: state.counts,
      metrics: Object.fromEntries(Object.entries(state.metrics).map(([k, v]) => [k, finalizeMetric(v)])),
      clamps: state.clamps,
      byIso: state.byIso,
      byOp: state.byOp,
      exemplars: state.exemplars,
      errorsSample: state.errorsSample,
    };
    const tmp = outPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(rep, null, 2));
    fs.renameSync(tmp, outPath);
    return rep;
  };

  let processed = 0;
  for (let i = args.offset; i < iterEnd && processed < args.max; i += args.stride, processed++) {
    let cell;
    try {
      cell = fullCellAtIndex(i);
      const input = {
        ...CombinatorialSpeedFeedHarnessDriver.toInput(cell),
        tool_coating: cell.tool_coating,
        machine_rigidity: cell.machine_rigidity,
        optimize_for: cell.optimize_for,
        fast_bulk: true,
      };
      const r = ultimateSpeedFeedEngine.calculate(input);

      const vc = num(r.cutting_speed);
      const rpm = num(r.spindle_rpm);
      const vf = num(r.feed_rate);
      const mrr = num(r.mrr);
      const force = num(r.forces && r.forces.resultant_force_N);
      const power = num(r.power && r.power.required_power_kw);
      const life = num(r.tool_life && r.tool_life.life_minutes);

      state.counts.driven++;
      const iso = state.byIso[cell.iso_group]; if (iso) iso.processed++;
      const op = state.byOp[cell.operation]; if (op) op.processed++;

      pushMetric(state.metrics.vc, vc);
      pushMetric(state.metrics.rpm, rpm);
      pushMetric(state.metrics.vf, vf);
      pushMetric(state.metrics.mrr, mrr);
      pushMetric(state.metrics.force, force);
      pushMetric(state.metrics.power, power);
      pushMetric(state.metrics.life, life);

      // Physical-validity: required metrics finite & in the physically-possible sign range.
      const bad =
        !(vc > 0) || !(rpm > 0) || !(vf >= 0) || !(mrr >= 0) ||
        !(force >= 0) || !(power >= 0) || !(life > 0) ||
        [vc, rpm, vf, mrr, force, power, life].some(x => !Number.isFinite(x));
      if (bad) {
        state.counts.nonphysical++;
        if (iso) iso.nonphysical++;
        if (op) op.nonphysical++;
        if (state.exemplars.nonphysical.length < args.exemplars) {
          state.exemplars.nonphysical.push({ index: i, cell, out: { vc, rpm, vf, mrr, force, power, life } });
        }
      }

      // rpm-cap invariant: with machine_max_rpm unset the cap is DEFAULT_MAX_RPM; rpm must never exceed it.
      if (Number.isFinite(rpm) && rpm > DEFAULT_MAX_RPM + 1) {
        state.counts.rpmCapViolations++;
        if (state.exemplars.rpmViolation.length < args.exemplars) {
          state.exemplars.rpmViolation.push({ index: i, cell, rpm });
        }
      }

      // Clamp-binding stats from warnings (descriptive, not errors). Substrings per the engine's warning text.
      const warnings = Array.isArray(r.warnings) ? r.warnings : [];
      let sawRpm = false, sawPwr = false, sawTherm = false;
      for (const w of warnings) {
        if (typeof w !== "string") continue;
        // Count both the STEP-4 cap warning AND the rigidity-premium re-cap warning (U-DT-RPMCAP-RIGIDITY)
        // so a rigidity-only re-cap (rpm under cap pre-premium, at cap after) is not undercounted.
        if (!sawRpm && (w.includes("exceeds machine max") || w.includes("limited by machine max RPM"))) { state.clamps.rpm_capped++; sawRpm = true; }
        if (!sawPwr && w.includes("exceeds 90% of available")) { state.clamps.power_over_budget++; sawPwr = true; }
        if (!sawTherm && w.includes("Thermal risk")) { state.clamps.thermal_risk++; sawTherm = true; }
      }
    } catch (e) {
      state.counts.errors++;
      if (state.errorsSample.length < args.exemplars) {
        state.errorsSample.push({ index: i, error: e instanceof Error ? e.message : String(e), cell: cell ?? null });
      }
    }
    state.counts.processed++;

    if (state.counts.processed % args.progress === 0) {
      const rep = writeOut(false);
      console.log(
        `[${state.counts.processed}/${plannedTotal}] ` +
        `nonphysical=${state.counts.nonphysical} errors=${state.counts.errors} ` +
        `rpmViol=${state.counts.rpmCapViolations} ` +
        `rpmCapped=${state.clamps.rpm_capped} powerOver=${state.clamps.power_over_budget} ` +
        `@ ${rep.meta.msPerCall}ms/call`,
      );
    }
  }

  const rep = writeOut(true);
  console.log("=== SFC FULLSPACE SWEEP DONE ===");
  console.log(JSON.stringify({
    meta: rep.meta,
    counts: rep.counts,
    clamps: rep.clamps,
    metrics: rep.metrics,
  }, null, 2));
  console.log(`out: ${outPath}`);
  return rep;
}

// main-guard: only run when invoked directly (not on import, e.g. from a faithfulness test).
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  try { main(); }
  catch (e) { console.error("sfc-fullspace-sweep FATAL:", e instanceof Error ? e.stack : e); process.exit(1); }
}

export { parseArgs, newMetric, pushMetric, finalizeMetric, num, main };
