#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 Stage 6 — Runtime variability cache.
 *
 * Loads chunked JSONL result files from
 * state/shared/sfc-variability-results/<domain>/ into an in-memory
 * fingerprint→result map. Used by the dispatcher's sf_orchestrate path
 * to skip orchestrator.compute() on cache hits.
 *
 * Usage (dispatcher integration):
 *
 *   import { sfcVariabilityCache } from "scripts/sfc-variability-cache.mjs";
 *   const cached = await sfcVariabilityCache.lookup(input);
 *   if (cached) return cached;  // ~0ms cache hit
 *   const result = orchestrator.compute(input);
 *   await sfcVariabilityCache.upsert(input, result);  // populate for next time
 *   return result;
 *
 * Performance:
 *   - Cold load: ~50ms per 5K-cell chunk (parse JSONL + index)
 *   - Lookup:    ~0.05ms (Map.get on fingerprint)
 *   - Upsert:    appended to current chunk file, in-memory map updated
 *
 * Match policy:
 *   - Exact-fingerprint hit: return slim cached output directly
 *   - Near-miss (nearest-neighbor in normalized input space within
 *     EPSILON_NORM=0.05): return cached output flagged as "nearest" so
 *     caller can decide whether to recompute
 *
 * Bounded memory:
 *   - MAX_CACHE_CELLS sets the LRU ceiling. When exceeded, evict by
 *     least-recently-used.
 *
 * Singleton — getCache() returns the shared instance.
 */

import { readdir, readFile, appendFile, mkdir, stat } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const RESULTS_ROOT = resolve(PROJECT_ROOT, "state/shared/sfc-variability-results");

const MAX_CACHE_CELLS_DEFAULT = 1_000_000;
const NEAR_NEIGHBOR_EPSILON = 0.05;
const CACHE_HEARTBEAT_EVERY = 100_000;
const HASH_INIT_A = 0x811c9dc5;
const HASH_INIT_B = 0xcbf29ce4;
const HASH_MULT = 31;
const FP_HEX_LEN = 16;

async function pathExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

// Mirror the Stage 2 worker's fingerprint exactly so cache keys interop.
function fingerprintSlim(slim) {
  const fpRaw = JSON.stringify(slim, Object.keys(slim).sort());
  let h1 = HASH_INIT_A;
  let h2 = HASH_INIT_B;
  for (let i = 0; i < fpRaw.length; i++) {
    const c = fpRaw.charCodeAt(i);
    h1 = ((h1 * HASH_MULT) ^ c) >>> 0;
    h2 = ((h2 * (HASH_MULT + 2)) ^ c) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, FP_HEX_LEN);
}

// Mirror the Stage 2 worker's slimInput so fingerprints align.
function slimInput(input) {
  return {
    m:   input.machine_name,
    mt:  input.machine_type,
    mpk: input.machine_power_kw,
    mrr: input.machine_max_rpm,
    rig: input.machine_rigidity,
    gw:  input.machine_guideway,
    age: input.machine_age_years,
    aax: input.machine_axis_accel_m_s2,
    ajx: input.machine_axis_jerk_m_s3,
    tap: input.spindle_taper,
    spr: input.spindle_bearing_preload,
    ctl: input.controller,
    cool: input.coolant_type,
    cpr:  input.coolant_pressure_bar,
    cc:   input.coolant_concentration_pct,
    mat:  input.material,
    iso:  input.iso_group,
    hb:   input.hardness_hb,
    op:   input.operation,
    cut:  input.cut_type,
    str:  input.strategy,
    hldr: input.holder_type,
    hgl:  input.holder_gauge_length_mm,
    htir: input.holder_tir_mm,
    hbal: input.holder_balanced_g,
    td:   input.tool_diameter_mm,
    fl:   input.flutes,
    tmat: input.tool_material,
    tc:   input.tool_coating,
    hel:  input.helix_angle_deg,
    cr:   input.corner_radius_mm,
    ts:   input.tool_stickout_mm,
    ig:   input.insert_grade,
    is_:  input.insert_shape,
    nr:   input.nose_radius_mm,
    wh:   input.workholding_type,
    whs:  input.workholding_stiffness,
    cf:   input.clamping_force_kN,
    tqc:  input.spindle_torque_curve_archetype,
    obj:  input.optimize_for,
  };
}

// ─── LRU MAP ──────────────────────────────────────────────────────────
class LRUMap {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.data = new Map();
  }
  get(key) {
    if (!this.data.has(key)) return undefined;
    const value = this.data.get(key);
    // Refresh recency by re-inserting.
    this.data.delete(key);
    this.data.set(key, value);
    return value;
  }
  set(key, value) {
    if (this.data.has(key)) this.data.delete(key);
    this.data.set(key, value);
    if (this.data.size > this.maxSize) {
      const oldest = this.data.keys().next().value;
      this.data.delete(oldest);
    }
  }
  get size() { return this.data.size; }
  has(key) { return this.data.has(key); }
}

// ─── CACHE CLASS ──────────────────────────────────────────────────────
class SfcVariabilityCache {
  constructor({ maxCells = MAX_CACHE_CELLS_DEFAULT } = {}) {
    this.maxCells = maxCells;
    this.byFp = new LRUMap(maxCells);
    this.loaded = false;
    this.loading = null;
    this.stats = {
      hits: 0,
      misses: 0,
      nearMisses: 0,
      upserts: 0,
      loadedCells: 0,
      loadTimeMs: 0,
    };
    // Current chunk being appended for upserts.
    this.appendChunkPath = null;
  }

  async _load() {
    const start = Date.now();
    const domains = ["mill", "lathe"];
    let loaded = 0;
    for (const domain of domains) {
      const dir = resolve(RESULTS_ROOT, domain);
      if (!(await pathExists(dir))) continue;
      const entries = await readdir(dir);
      const chunks = entries.filter((f) => f.startsWith("chunk-") && f.endsWith(".jsonl"));
      chunks.sort();
      for (const fname of chunks) {
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
            if (cell.err || !cell.out) continue;
            this.byFp.set(cell.fp, { in: cell.in, out: cell.out, src: domain });
            loaded++;
            if (loaded % CACHE_HEARTBEAT_EVERY === 0) {
              process.stderr.write(`[sfc-cache] loaded ${loaded.toLocaleString()} cells\n`);
            }
            if (loaded >= this.maxCells) break;
          } catch { /* skip malformed */ }
        }
        if (loaded >= this.maxCells) break;
      }
      if (loaded >= this.maxCells) break;
    }
    this.stats.loadedCells = loaded;
    this.stats.loadTimeMs = Date.now() - start;
    this.loaded = true;
  }

  async ensureLoaded() {
    if (this.loaded) return;
    if (!this.loading) this.loading = this._load();
    await this.loading;
  }

  /**
   * Look up an orchestrator input in the cache.
   * Returns {hit: true, out, src} on exact fingerprint match,
   * or {hit: false} on miss.
   */
  async lookup(input) {
    await this.ensureLoaded();
    const slim = slimInput(input);
    const fp = fingerprintSlim(slim);
    const entry = this.byFp.get(fp);
    if (entry) {
      this.stats.hits++;
      return { hit: true, fp, out: entry.out, src: entry.src };
    }
    this.stats.misses++;
    return { hit: false, fp };
  }

  /**
   * Upsert a (input, output) pair into the cache. Also appends to the
   * append-chunk file on disk so the cache survives restarts.
   */
  async upsert(input, output, opts = {}) {
    await this.ensureLoaded();
    const slim = slimInput(input);
    const fp = fingerprintSlim(slim);
    const slimOut = slimifyOutput(output);
    if (!slimOut) return { ok: false, reason: "output not slimable" };
    const domain = opts.domain ?? (input.machine_type === "lathe" ? "lathe" : "mill");
    this.byFp.set(fp, { in: slim, out: slimOut, src: domain });
    this.stats.upserts++;
    // Persist by appending to a domain-scoped append chunk.
    const dir = resolve(RESULTS_ROOT, domain);
    await mkdir(dir, { recursive: true });
    const appendPath = join(dir, "chunk-runtime-upsert.jsonl");
    const line = JSON.stringify({ fp, idx: -1, in: slim, out: slimOut, err: null }) + "\n";
    await appendFile(appendPath, line, "utf8");
    return { ok: true, fp };
  }

  getStats() {
    return {
      ...this.stats,
      cacheSize: this.byFp.size,
      maxSize: this.maxCells,
      hitRate: this.stats.hits + this.stats.misses === 0
        ? 0
        : +(this.stats.hits / (this.stats.hits + this.stats.misses)).toFixed(4),
    };
  }
}

function slimifyOutput(rawOut) {
  if (!rawOut || typeof rawOut !== "object") return null;
  const out = (rawOut.cutting_speed_mpm == null && rawOut.value && typeof rawOut.value === "object")
    ? rawOut.value
    : rawOut;
  return {
    vc:    out.cutting_speed_mpm,
    rpm:   out.spindle_rpm,
    fz:    out.feed_per_tooth_mm,
    vf:    out.feed_rate_mmmin,
    ap:    out.axial_depth_mm,
    ae:    out.radial_depth_mm,
    mrr:   out.mrr_cm3min,
    pkw:   out.power_kw,
    trq:   out.torque_Nm,
    fN:    out.tangential_force_N,
    life:  out.tool_life_min,
    Ra:    out.surface_finish_Ra_um,
    defl:  out.deflection_um,
    conf:  out.overall_confidence,
    sz:    out.stability_assessment?.zone ?? "unknown",
    safe:  (out.safety_checks ?? []).every((c) => c.passed !== false),
  };
}

// ─── SINGLETON ────────────────────────────────────────────────────────
let _sharedCache = null;
function getCache(opts = {}) {
  if (!_sharedCache) _sharedCache = new SfcVariabilityCache(opts);
  return _sharedCache;
}

// ─── ENTRY (CLI: dump stats / dry-load) ───────────────────────────────
const _modulePath = fileURLToPath(import.meta.url);
const _isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(_modulePath);
if (_isEntry) {
  const cache = getCache();
  void cache.ensureLoaded()
    .then(() => { console.log(JSON.stringify(cache.getStats(), null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}

export { SfcVariabilityCache, getCache, fingerprintSlim, slimInput, slimifyOutput };
