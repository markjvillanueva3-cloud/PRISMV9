#!/usr/bin/env node
/**
 * vec2d-to-training.mjs -- resumable per-file lane: walk manifest-vec2d.canonical.txt ->
 * Drawing2DExtractionEngine.extractDrawing -> ONE ledger row per file
 * (U-DELTA-VEC2D-TRAINING-LANE, slot:delta 2026-07-02, Domain 10 closed-loop training).
 *
 * Closes the vec2d gap: 9,527 native 2D drawings (9,280 .dxf + 247 .dwg) had a live-validated
 * reader but no training lane. Deterministic, $0 (no LLM). Emits
 * state/shared/cad-closed-loop-night/vec2d-training-ledger.jsonl; the producer
 * (build-cad-vec2d-dataset.mjs) turns that into Alpaca pairs.
 *
 * FAIL-LOUD (R12), UNITS-FIRST (JM is INCH):
 *  - The reader is FAIL-SOFT: extractDrawing NEVER throws and result.success is ALWAYS true; on a
 *    parse failure it silently DEFAULTS metadata.units to 'mm'. So parse failure is detected by
 *    SCANNING result.warnings for 'DXF parse failed' -- NEVER by success/try-catch -- and such a
 *    row is reclassified status:'parse-error', units:null. A JM inch file that fails to parse is
 *    NEVER stamped 'mm'. This is the entire inch-trap guarantee.
 *  - DWG (no ODA SDK in repo), too-large (>64MB), read-error, binary/DWG-as-.dxf (magic/NUL sniff)
 *    each get a distinct marked row with a non-null reason -- counted, never silently dropped.
 *  - A real $INSUNITS=4 (mm) is accepted but flagged mm_anomaly (JM convention is inch).
 *
 * Mirrors the resumable-lane shape of scripts/cad-part-decipher.mjs (seen-Set resume,
 * append-on-resume vs tmp+rename rebuild, get() standalone-flag CLI) + the guarded size-capped
 * read of scripts/cnc-ground-truth-build.mjs. The reader engine stays I/O-free; THIS lane owns the
 * fs-read + 64MB cap + binary sniff.
 *
 * Usage:
 *   node scripts/vec2d-to-training.mjs                 # dry-run to a buffer, no write
 *   node scripts/vec2d-to-training.mjs --resume --out  # crash-safe append to the default ledger
 *   node scripts/vec2d-to-training.mjs --out --json    # write + machine-readable stats
 *   node scripts/vec2d-to-training.mjs --limit 200 --out --json   # bounded live validation
 *   node scripts/vec2d-to-training.mjs --compact --out # rewrite ledger to unique well-formed rows
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "state", "shared", "cad-closed-loop-night", "manifest-vec2d.canonical.txt");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "cad-closed-loop-night", "vec2d-training-ledger.jsonl");
const DIST_READER = path.join(ROOT, "mcp-server", "dist", "engines", "Drawing2DExtractionEngine.js");
export const MAX_DXF_BYTES = 64 * 1024 * 1024;
export const SCHEMA_V = 1;
const SNIFF_BYTES = 512;

/**
 * Minimal flag reader with the standalone-flag fix (clone of cad-part-decipher.mjs:253): a flag
 * whose "value" is itself another --flag (or absent) is treated as a bare boolean, so `--out --json`
 * does NOT consume "--json" as the out path (and does NOT create a file literally named "--json").
 */
function get(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const next = args[i + 1];
  if (next === undefined || next.startsWith("--")) return true; // standalone flag
  return next;
}

function freshStats() {
  return {
    total: 0, dxf: 0, dwg: 0,
    parsed: 0, parsedNoDims: 0, dimensioned: 0,
    unitsUnknown: 0, mmAnomaly: 0,
    tooLarge: 0, readError: 0, parseError: 0, binaryNonparseable: 0, dwgUnsupported: 0,
    sentinelDims: 0, skippedDuplicate: 0, tornLines: 0, emitted: 0,
  };
}

/** Build a marked ledger row. Defaults encode the fail-loud invariant (units:null unless proven). */
function row(fields) {
  return {
    v: SCHEMA_V,
    ts: new Date().toISOString(),
    path: null, name: null, format: "dxf",
    status: null, ok: false,
    units: null, units_unknown: false, mm_anomaly: false,
    entityCount: 0, dimCount: 0, sentinelDimCount: 0, dimensions: [],
    bounds: null, layers: null, partInfo: null,
    reason: null, warnings: [],
    ...fields,
  };
}

/**
 * Process ONE manifest path -> a marked ledger row. Deps are injected for hermetic tests:
 *   extractDrawing(absPath, {content?}) -> ExtractionResult, statSync, readFileSync.
 * The engine is fail-soft (never throws, success always true) so parse failure is detected by a
 * 'DXF parse failed' warning scan -- NEVER by success/try-catch, and units are never trusted on it.
 */
export function processOne(absPath, stats, deps) {
  const { extractDrawing, statSync = fs.statSync, readFileSync = fs.readFileSync } = deps;
  const name = absPath.split(/[\\/]/).pop() || absPath;
  const low = absPath.toLowerCase();

  if (low.endsWith(".dwg")) {
    stats.dwg++; stats.dwgUnsupported++;
    let warnings = ["DWG format requires ODA SDK for full extraction"];
    try { warnings = (extractDrawing(absPath) || {}).warnings || warnings; } catch { /* keep default */ }
    return row({ path: absPath, name, format: "dwg", status: "dwg-unsupported", reason: "dwg_requires_oda_sdk", warnings });
  }

  stats.dxf++;
  let st;
  try { st = statSync(absPath); } catch { stats.readError++; return row({ path: absPath, name, status: "read-error", reason: "stat_failed" }); }
  if (st.size > MAX_DXF_BYTES) { stats.tooLarge++; return row({ path: absPath, name, status: "too-large", reason: `dxf_exceeds_64mb (size=${st.size})` }); }

  let buf;
  try { buf = readFileSync(absPath); } catch { stats.readError++; return row({ path: absPath, name, status: "read-error", reason: "read_failed" }); }

  // Binary / DWG-as-.dxf sniff -- the extension gate alone misses these (a .dwg saved as .dxf, or
  // a binary DXF). DWG magic is 'AC10dd' (e.g. AC1027); a NUL byte means binary/UTF-16, not ASCII DXF.
  const head = buf.subarray(0, SNIFF_BYTES);
  const magic = head.subarray(0, 6).toString("latin1");
  if (/^AC10\d\d/.test(magic) || head.includes(0x00)) {
    stats.binaryNonparseable++;
    return row({ path: absPath, name, status: "binary-nonparseable", reason: "binary_or_dwg_content_in_dxf" });
  }

  const content = buf.toString("utf8");
  let result;
  try { result = extractDrawing(absPath, { content }); } catch (e) {
    stats.parseError++;
    return row({ path: absPath, name, status: "parse-error", reason: `dxf_parse_failed: ${e instanceof Error ? e.message : String(e)}` });
  }

  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  // PRIMARY discriminator: the engine caught the parse error internally and defaulted units to 'mm'.
  // Detect via the warning, NEVER read result.metadata.units on this path.
  const parseFailWarn = warnings.find((w) => typeof w === "string" && w.includes("DXF parse failed"));
  if (parseFailWarn) {
    stats.parseError++;
    return row({ path: absPath, name, status: "parse-error", reason: `dxf_parse_failed: ${parseFailWarn}`, warnings });
  }

  const md = result?.metadata || {};
  const units = md.units === "in" || md.units === "mm" ? md.units : "unknown";
  if (units === "unknown") stats.unitsUnknown++;
  if (units === "mm") stats.mmAnomaly++;
  // Filter SENTINEL / non-physical dimensions. Many JM DXF DIMENSION entities are ASSOCIATIVE:
  // group-42 carries a placeholder (-1) and the text is "%%c<>" ("diameter, use computed value"),
  // with the real value only in the definition points (codes 13/14) the engine does not resolve.
  // A machining callout (length/diameter/radius/angle) is always POSITIVE, so value<=0 (or non-finite)
  // is an unresolved/placeholder dim -- dropped and COUNTED (never trained on as if it were a real
  // measurement). A row whose dims are ALL sentinels degrades to the honest parsed-no-dims lane.
  const rawDims = Array.isArray(result?.dimensions) ? result.dimensions : [];
  let sentinel = 0;
  const dims = [];
  for (const d of rawDims) {
    const v = Number(d.value);
    if (!Number.isFinite(v) || v <= 0) { sentinel++; continue; }
    dims.push({ type: d.type, value: v, unit: d.type === "angular" ? "deg" : d.unit });
  }
  stats.sentinelDims += sentinel;
  if (dims.length > 0) { stats.parsed++; stats.dimensioned++; }
  else stats.parsedNoDims++;

  return row({
    path: absPath, name, format: "dxf",
    status: dims.length > 0 ? "parsed" : "parsed-no-dims", ok: true,
    units, units_unknown: units === "unknown", mm_anomaly: units === "mm",
    entityCount: Number.isFinite(md.entityCount) ? md.entityCount : 0,
    dimCount: dims.length, sentinelDimCount: sentinel, dimensions: dims,
    bounds: md.bounds || null, layers: md.layers || null,
    partInfo: result?.partInfo || null, warnings, reason: null,
  });
}

/** Read the manifest into trimmed, non-comment, non-empty absolute paths. */
export function readManifest(manifestPath = MANIFEST, readFileImpl = fs.readFileSync) {
  const raw = readFileImpl(manifestPath, "utf8");
  return raw.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

/**
 * Core lane. Pure w.r.t. injected deps (extractDrawing, fs impls) -> testable without the dist.
 * On resume, seeds `seen` from the existing ledger keyed by row.path and appends crash-safely;
 * otherwise buffers and the caller does an atomic tmp+rename.
 */
export function runLane({ manifest = MANIFEST, out = DEFAULT_OUT, resume = false, compact = false, limit = 0, deps }) {
  const stats = freshStats();
  const seen = new Set();
  const buffer = [];

  if ((resume || compact) && fs.existsSync(out)) {
    const raw = fs.readFileSync(out, "utf8");
    if (raw.length && !raw.endsWith("\n")) stats.tornLines++; // torn final line (killed mid-append)
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try { const o = JSON.parse(t); if (o && o.path) seen.add(o.path); }
      catch { stats.tornLines++; }
    }
    if (stats.tornLines > 0) process.stderr.write(`WARN: ${stats.tornLines} torn/corrupt ledger line(s) -- will be re-processed\n`);
    // Newline-guard: never merge a fresh append onto a torn line.
    if (resume && raw.length && !raw.endsWith("\n")) fs.appendFileSync(out, "\n");
  }

  const paths = readManifest(manifest, deps.readFileSync || fs.readFileSync);
  for (const absPath of paths) {
    if (limit && stats.emitted >= limit) break;
    stats.total++;
    if (seen.has(absPath)) { stats.skippedDuplicate++; continue; }
    const rec = processOne(absPath, stats, deps);
    if (resume && out) fs.appendFileSync(out, JSON.stringify(rec) + "\n"); // crash-safe per line
    else buffer.push(rec);
    seen.add(absPath);
    stats.emitted++;
  }

  return { stats, buffer };
}

/** Rewrite the ledger to unique, well-formed rows (compaction). */
function uniqueWellFormedRows(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return [];
  const seen = new Set();
  const out = [];
  for (const line of fs.readFileSync(ledgerPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o; try { o = JSON.parse(t); } catch { continue; }
    if (!o || !o.path || seen.has(o.path)) continue;
    seen.add(o.path); out.push(o);
  }
  return out;
}

function writeJsonlAtomic(outPath, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  fs.renameSync(tmp, outPath);
}

async function main() {
  const args = process.argv.slice(2);
  const resume = get(args, "--resume") === true;
  const compact = get(args, "--compact") === true;
  const asJson = get(args, "--json") === true;
  const outArg = get(args, "--out");
  const write = outArg !== undefined;
  const out = typeof outArg === "string" ? outArg : DEFAULT_OUT;
  const manifest = typeof get(args, "--manifest") === "string" ? get(args, "--manifest") : MANIFEST;
  const limitArg = get(args, "--limit");
  const limit = typeof limitArg === "string" ? Number.parseInt(limitArg, 10) || 0 : 0;

  if (!fs.existsSync(DIST_READER)) {
    process.stderr.write("dist reader not built -- run `npm run build` (mcp-server/dist/engines/Drawing2DExtractionEngine.js missing)\n");
    process.exitCode = 1;
    return;
  }
  const mod = await import(`file://${DIST_READER.replace(/\\/g, "/")}`);
  const Engine = mod.Drawing2DExtractionEngine || mod.default?.Drawing2DExtractionEngine;
  if (!Engine || typeof Engine.extractDrawing !== "function") {
    process.stderr.write("dist reader present but Drawing2DExtractionEngine.extractDrawing not found -- rebuild\n");
    process.exitCode = 1;
    return;
  }
  const deps = { extractDrawing: (p, s) => Engine.extractDrawing(p, s), statSync: fs.statSync, readFileSync: fs.readFileSync };

  if (compact && write) {
    const rows = uniqueWellFormedRows(out);
    writeJsonlAtomic(out, rows);
    if (asJson) process.stdout.write(JSON.stringify({ compacted: rows.length, out }) + "\n");
    else process.stdout.write(`Compacted ${rows.length} unique rows -> ${out}\n`);
    process.exitCode = 0;
    return;
  }

  const { stats, buffer } = runLane({ manifest, out, resume, compact, limit, deps });

  if (write && !resume) writeJsonlAtomic(out, buffer); // full rebuild -> atomic
  if (write) stats.writtenTo = out;

  if (asJson) process.stdout.write(JSON.stringify(stats) + "\n");
  else {
    process.stdout.write(
      `vec2d lane: ${stats.total} files | ${stats.dimensioned} dimensioned + ${stats.parsedNoDims} parsed-no-dims`
      + ` (${stats.sentinelDims} sentinel dims dropped)`
      + ` | ${stats.dwgUnsupported} dwg + ${stats.tooLarge} too-large + ${stats.parseError} parse-error`
      + ` + ${stats.binaryNonparseable} binary + ${stats.readError} read-error`
      + ` | ${stats.unitsUnknown} units-unknown, ${stats.mmAnomaly} mm-anomaly | ${stats.skippedDuplicate} resumed\n`,
    );
    if (write) process.stdout.write(`Ledger -> ${out}\n`);
    else process.stdout.write("(dry-run; pass --out to write, --resume for crash-safe append)\n");
  }
  process.exitCode = 0; // R12: RETURN + set exitCode, never process.exit (truncates piped --json)
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main().catch((e) => { process.stderr.write(`vec2d-to-training fatal: ${e instanceof Error ? e.stack : String(e)}\n`); process.exitCode = 1; });

export { MANIFEST, DEFAULT_OUT, DIST_READER };
