#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 Stage 4 — system-viz emitter.
 *
 * Consumes the chunked JSONL result files written by Stage 2
 * (state/shared/sfc-variability-results/<domain>/chunk-*.jsonl) and emits
 * system-viz ghost nodes representing:
 *
 *   ghost.sfc-machine-types          (L8 roost — one per archetype)
 *   sfc.machine.<archetype>          (L9 node — carries cached aggregates)
 *   ghost.sfc-cached-result          (L9 roost — millions of cells eventually)
 *   sfc.cell.<fingerprint>           (L10 leaf — one per unique result)
 *
 * Edges:
 *   sfc.machine.<archetype>  --supports-->  sfc.cell.<fp>
 *   sfc.cell.<fp>            --runs-on-->   sfc.machine.<archetype>
 *   sfc.cell.<fp>            --uses-material-->  ghost.material.<iso>
 *   sfc.cell.<fp>            --uses-tool-->       ghost.tool.<family>
 *   sfc.cell.<fp>            --uses-coolant-->    ghost.coolant.<type>
 *   sfc.cell.<fp>            --uses-holder-->     ghost.holder.<type>
 *   sfc.cell.<fp>            --uses-workholding-->ghost.workholding.<type>
 *   sfc.cell.<fp>            --uses-controller--> ghost.controller.<id>
 *   sfc.machine.<archetype>  --consults-->  ghost.db.materials
 *   sfc.machine.<archetype>  --consults-->  ghost.db.tools
 *   sfc.machine.<archetype>  --consults-->  ghost.db.holders
 *   sfc.machine.<archetype>  --consults-->  ghost.db.fixtures
 *   sfc.machine.<archetype>  --consults-->  ghost.db.coolants
 *
 * Output: state/shared/system-viz/augmentations/sfc-variability.json
 *   (mirrors priority-queue / domain-pipeline / misc-tasks pattern — picked
 *   up by regen-viz FAST[] + merge-augmentations splice block).
 *
 * The emitter caps cell nodes at MAX_CELL_NODES (default 50K) to keep the
 * graph tractable while still feeding the GNN. Aggregation per machine-type
 * computes p50/p95 envelopes for Vc, RPM, fz, power, life, Ra — those become
 * the property bundle on the machine-type node.
 *
 * Idempotent: re-run reads the latest chunks and overwrites the augmentation
 * file. Cell de-dup by fingerprint.
 *
 * Modes:
 *   --domain mill|lathe|all   (which result directories to consume)
 *   --max-cells N             (cap on emitted cell leaves; default 50000)
 *   --out <file>              (override output path)
 *   --dry-run                 (print summary only, no write)
 */

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Async existence check — never throws. */
async function pathExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const RESULTS_ROOT = resolve(PROJECT_ROOT, "state/shared/sfc-variability-results");
const DEFAULT_OUT = resolve(PROJECT_ROOT, "state/shared/system-viz/augmentations/sfc-variability.json");

const MAX_CELL_NODES_DEFAULT = 50_000;
const PERCENTILES = [0.5, 0.95];
const NODE_LAYER_ROOST = 8;
const NODE_LAYER_MACHINE = 9;
const NODE_LAYER_CELL = 10;
const SCHEMA_VERSION = "sfc-variability/1.0.0";

// ─── ARG PARSING ──────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    domain: "all",
    maxCells: MAX_CELL_NODES_DEFAULT,
    out: DEFAULT_OUT,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--domain")    args.domain = argv[++i];
    else if (a === "--max-cells") args.maxCells = Number(argv[++i]);
    else if (a === "--out")  args.out = resolve(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

// ─── CHUNK READER ─────────────────────────────────────────────────────
async function* readChunks(domainDirs) {
  // Pre-resolve existence in parallel; iterate only the dirs that exist.
  const existsFlags = await Promise.all(domainDirs.map(pathExists));
  const liveDirs = domainDirs.filter((_, i) => existsFlags[i]);
  // File reads MUST stay sequential — 100K+ chunk files at multi-MB each
  // would OOM with parallel reads. Streaming one at a time is by design.
  for (const dir of liveDirs) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    const chunkFiles = entries.filter((f) => f.startsWith("chunk-") && f.endsWith(".jsonl"));
    chunkFiles.sort();
    for (const fname of chunkFiles) {
      const fpath = join(dir, fname);
      let buf;
      try {
        buf = await readFile(fpath, "utf8");
      } catch {
        continue;
      }
      for (const line of buf.split("\n")) {
        if (!line.trim()) continue;
        try {
          const cell = JSON.parse(line);
          // Filter cells that errored or produced nulls — these aren't useful
          // for the cache OR the GNN.
          if (cell.err) continue;
          if (!cell.out || cell.out.rpm == null || cell.out.rpm === 0) continue;
          yield { cell, domain: dir.split(/[\\/]/).pop() };
        } catch {
          // skip malformed line
        }
      }
    }
  }
}

// ─── STREAMING PERCENTILE TRACKER ────────────────────────────────────
// We avoid loading all cells into memory by using a reservoir sample per
// machine archetype, then computing percentiles from the reservoir.
const RESERVOIR_SIZE = 5000;

function makeReservoir() {
  return { items: [], seen: 0 };
}

function reservoirAdd(res, value) {
  if (value == null || !Number.isFinite(value)) return;
  res.seen++;
  if (res.items.length < RESERVOIR_SIZE) {
    res.items.push(value);
  } else {
    const j = Math.floor(Math.random() * res.seen);
    if (j < RESERVOIR_SIZE) res.items[j] = value;
  }
}

function percentile(res, p) {
  if (res.items.length === 0) return null;
  const sorted = [...res.items].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

// ─── AGGREGATOR ───────────────────────────────────────────────────────
async function aggregate(args) {
  const domains = args.domain === "all"
    ? ["mill", "lathe"]
    : [args.domain];
  const domainDirs = domains.map((d) => resolve(RESULTS_ROOT, d));

  const machineAgg = new Map(); // archetype -> { count, Vc, rpm, fz, pkw, life, Ra, defl, conf, unsafe }
  const cellLeaves = [];
  const seenFp = new Set();
  let totalIngested = 0;
  let totalKept = 0;
  let totalSkipped = 0;

  for await (const { cell, domain } of readChunks(domainDirs)) {
    totalIngested++;
    if (seenFp.has(cell.fp)) {
      totalSkipped++;
      continue;
    }
    seenFp.add(cell.fp);

    const archetype = cell.in?.m ?? "unknown";
    const out = cell.out;
    let agg = machineAgg.get(archetype);
    if (!agg) {
      agg = {
        archetype,
        domain,
        count: 0,
        unsafeCount: 0,
        Vc:    makeReservoir(),
        rpm:   makeReservoir(),
        fz:    makeReservoir(),
        pkw:   makeReservoir(),
        life:  makeReservoir(),
        Ra:    makeReservoir(),
        defl:  makeReservoir(),
        conf:  makeReservoir(),
        // Track compatible materials/operations/strategies as Sets
        materials: new Set(),
        isoGroups: new Set(),
        operations: new Set(),
        strategies: new Set(),
        coolants: new Set(),
        holders: new Set(),
        workholding: new Set(),
        controllers: new Set(),
      };
      machineAgg.set(archetype, agg);
    }
    agg.count++;
    if (out.safe === false) agg.unsafeCount++;
    reservoirAdd(agg.Vc,   out.vc);
    reservoirAdd(agg.rpm,  out.rpm);
    reservoirAdd(agg.fz,   out.fz);
    reservoirAdd(agg.pkw,  out.pkw);
    reservoirAdd(agg.life, out.life);
    reservoirAdd(agg.Ra,   out.Ra);
    reservoirAdd(agg.defl, out.defl);
    reservoirAdd(agg.conf, out.conf);
    if (cell.in?.mat) agg.materials.add(cell.in.mat);
    if (cell.in?.iso) agg.isoGroups.add(cell.in.iso);
    if (cell.in?.op)  agg.operations.add(cell.in.op);
    if (cell.in?.str) agg.strategies.add(cell.in.str);
    if (cell.in?.cool) agg.coolants.add(cell.in.cool);
    if (cell.in?.hldr) agg.holders.add(cell.in.hldr);
    if (cell.in?.wh)   agg.workholding.add(cell.in.wh);
    if (cell.in?.ctl)  agg.controllers.add(cell.in.ctl);

    // Cell leaf nodes — capped to keep graph tractable. Prefer cells that
    // surface limiting factors (more diagnostic value for the GNN).
    if (cellLeaves.length < args.maxCells) {
      cellLeaves.push({
        fp: cell.fp,
        archetype,
        domain,
        mat: cell.in?.mat,
        iso: cell.in?.iso,
        op:  cell.in?.op,
        str: cell.in?.str,
        cool: cell.in?.cool,
        hldr: cell.in?.hldr,
        wh:   cell.in?.wh,
        ctl:  cell.in?.ctl,
        out: {
          vc: out.vc, rpm: out.rpm, fz: out.fz, vf: out.vf,
          ap: out.ap, ae: out.ae, pkw: out.pkw, life: out.life,
          Ra: out.Ra, defl: out.defl, conf: out.conf, sz: out.sz,
          safe: out.safe, lim: out.lim,
        },
      });
    }
    totalKept++;
  }

  return { machineAgg, cellLeaves, totalIngested, totalKept, totalSkipped };
}

// ─── NODE / EDGE BUILDER ──────────────────────────────────────────────
function buildGraph(aggResult, args) {
  const { machineAgg, cellLeaves } = aggResult;
  const nodes = [];
  const edges = [];

  // Roost nodes ── one per top-level group.
  nodes.push({
    id: "ghost.sfc-machine-types",
    layer: NODE_LAYER_ROOST,
    kind: "ghost",
    label: "SFC Machine Types",
    description: `Per-archetype aggregates of variability matrix results. ${machineAgg.size} archetypes covered.`,
    domain: "sfc",
    metadata: { schema: SCHEMA_VERSION, archetypes: machineAgg.size },
  });
  nodes.push({
    id: "ghost.sfc-cached-result",
    layer: NODE_LAYER_ROOST,
    kind: "ghost",
    label: "SFC Cached Results",
    description: `Cached cell results from Stage 2 batch run. ${cellLeaves.length} cells.`,
    domain: "sfc",
    metadata: { schema: SCHEMA_VERSION, cells: cellLeaves.length, capacity: args.maxCells },
  });

  // DB attachment roosts (referenced by every machine-type node).
  const DB_ROOSTS = [
    ["ghost.db.materials",  "Material Catalog"],
    ["ghost.db.tools",      "Tool Catalog"],
    ["ghost.db.holders",    "Holder Catalog"],
    ["ghost.db.fixtures",   "Fixture Catalog"],
    ["ghost.db.coolants",   "Coolant Catalog"],
    ["ghost.db.controllers","Controller Catalog"],
  ];
  for (const [id, label] of DB_ROOSTS) {
    nodes.push({
      id, layer: NODE_LAYER_ROOST, kind: "ghost", label,
      description: `Reference catalog consulted by SFC machine archetypes.`,
      domain: "sfc",
    });
  }

  // Per-archetype machine-type node + property bundle.
  for (const [archetype, agg] of machineAgg) {
    const nodeId = `sfc.machine.${archetype}`;
    nodes.push({
      id: nodeId,
      layer: NODE_LAYER_MACHINE,
      kind: "sfc-machine-type",
      label: archetype,
      description: `SFC machine archetype (${agg.domain}). ${agg.count} cached cells, ${agg.unsafeCount} flagged unsafe (${(100 * agg.unsafeCount / Math.max(agg.count, 1)).toFixed(1)}%).`,
      domain: "sfc",
      properties: {
        cellCount: agg.count,
        unsafeCount: agg.unsafeCount,
        unsafePct: +(100 * agg.unsafeCount / Math.max(agg.count, 1)).toFixed(2),
        Vc_p50:    percentile(agg.Vc, 0.5),
        Vc_p95:    percentile(agg.Vc, 0.95),
        rpm_p50:   percentile(agg.rpm, 0.5),
        rpm_p95:   percentile(agg.rpm, 0.95),
        fz_p50:    percentile(agg.fz, 0.5),
        fz_p95:    percentile(agg.fz, 0.95),
        power_p50: percentile(agg.pkw, 0.5),
        power_p95: percentile(agg.pkw, 0.95),
        life_p50:  percentile(agg.life, 0.5),
        Ra_p50:    percentile(agg.Ra, 0.5),
        defl_p50:  percentile(agg.defl, 0.5),
        defl_p95:  percentile(agg.defl, 0.95),
        conf_p50:  percentile(agg.conf, 0.5),
        materialCount: agg.materials.size,
        isoGroups: [...agg.isoGroups],
        operations: [...agg.operations],
        strategies: [...agg.strategies],
        coolants: [...agg.coolants],
        holders:  [...agg.holders],
        workholding: [...agg.workholding],
        controllerCount: agg.controllers.size,
      },
    });

    // Edges: archetype --contained-in--> ghost.sfc-machine-types
    edges.push({ from: "ghost.sfc-machine-types", to: nodeId, kind: "contains" });

    // DB-attachment edges
    for (const [dbId] of DB_ROOSTS) {
      edges.push({ from: nodeId, to: dbId, kind: "consults" });
    }
  }

  // Cell leaf nodes.
  for (const cell of cellLeaves) {
    const cellId = `sfc.cell.${cell.fp}`;
    nodes.push({
      id: cellId,
      layer: NODE_LAYER_CELL,
      kind: "sfc-cell",
      label: `${cell.archetype}/${cell.mat}/${cell.op}`,
      description: `Vc=${cell.out.vc} rpm=${cell.out.rpm} fz=${cell.out.fz} P=${cell.out.pkw}kW life=${cell.out.life}min Ra=${cell.out.Ra}µm ${cell.out.safe ? "safe" : "UNSAFE"}`,
      domain: "sfc",
      properties: { fp: cell.fp, ...cell.out },
    });
    edges.push({ from: `sfc.machine.${cell.archetype}`, to: cellId, kind: "produces" });
    edges.push({ from: "ghost.sfc-cached-result", to: cellId, kind: "contains" });
  }

  return { nodes, edges };
}

// ─── EMIT ─────────────────────────────────────────────────────────────
async function emit(args) {
  const aggResult = await aggregate(args);
  const graph = buildGraph(aggResult, args);
  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      archetypes: aggResult.machineAgg.size,
      cells: aggResult.cellLeaves.length,
      totalIngested: aggResult.totalIngested,
      totalKept: aggResult.totalKept,
      totalSkipped: aggResult.totalSkipped,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      maxCellsCap: args.maxCells,
    },
    nodes: graph.nodes,
    edges: graph.edges,
  };
  if (args.dryRun) {
    return out.summary;
  }
  await mkdir(dirname(args.out), { recursive: true });
  await writeFile(args.out, JSON.stringify(out, null, 2), "utf8");
  return { ...out.summary, written_to: args.out };
}

// ─── ENTRY ────────────────────────────────────────────────────────────
const _modulePath = fileURLToPath(import.meta.url);
const _isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(_modulePath);
if (_isEntry) {
  const args = parseArgs(process.argv.slice(2));
  void emit(args)
    .then((res) => { console.log(JSON.stringify(res, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}

export { aggregate, buildGraph, emit, parseArgs };
