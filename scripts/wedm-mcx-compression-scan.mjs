#!/usr/bin/env node
/**
 * wedm-mcx-compression-scan.mjs — U-MCX-COMPRESSION-DIAGNOSTIC
 *
 * Phase-B iter-39 surfaced that McxProgramParserEngine reports zlib_chunks=0
 * in 89/97 (92%) of JM Die's Mastercam X8 .mcx-8 binaries. The engine's
 * detection looks only for the 4 standard zlib stream-header magic bytes
 * (78 9C, 78 DA, 78 5E, 78 01). This diagnostic asks: what compression
 * format IS in those 89 files?
 *
 * Strategy — for a sample of zero-chunk + non-zero-chunk X8 binaries:
 *   1. Full-file byte-by-byte scan for known compression magic-byte sequences:
 *      - zlib RFC1950 variants (78 01/5E/9C/DA + non-standard 78 9D etc.)
 *      - gzip (1F 8B)
 *      - ZIP local-file-header (50 4B 03 04)
 *      - ZIP central-dir (50 4B 01 02)
 *      - LZMA/XZ (FD 37 7A 58 5A 00)
 *      - raw deflate stream sentinels
 *      - bzip2 (BZh)
 *      - LZW/Compress (1F 9D)
 *      - LZ4 (04 22 4D 18)
 *      - Snappy frame (FF 06 00 00 73 4E 61 50 70 59)
 *   2. Persist per-file counts so the operator can SEE which format dominates.
 *   3. If a new dominant marker emerges → propose extending McxProgramParserEngine.
 *   4. If everything stays opaque → R12 fail-loud document the X8 binary is
 *      opaque without Mastercam SDK.
 *
 * Output: state/shared/wedm-mcx-compression-scan.json
 *
 * Pure-node script. No engine import. Bounded reads (each file already known
 * to be <500 KiB from the prior corpus census).
 */
import { promises as fsp } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("H:/prism");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-mcx-compression-scan.json");

const SAMPLE_FILES = [
  // Zero-chunk samples (engine reports zlib_chunks=0)
  { stem: "10-001-490", path: "JM DIE/WIRE EDM/ALLFAST/10-001-490.mcx-8", engine_chunks: 0 },
  { stem: "1134_hob",   path: "JM DIE/WIRE EDM/FORGO/1134 HOB.mcx-8",     engine_chunks: 0 },
  { stem: "1210",       path: "JM DIE/WIRE EDM/COBRA/1210.mcx-8",          engine_chunks: 0 },
  // Non-zero-chunk samples (engine detected zlib)
  { stem: "0137471",    path: "JM DIE/WIRE EDM/ALCOA FASTENING/0137471.mcx-8", engine_chunks: 1 },
  { stem: "1649735",    path: "JM DIE/WIRE EDM/MCAM X8/SFS INTEC/1649735.mcx-8", engine_chunks: 4 },
];

// Each marker: { name, bytes (Uint8Array), variant_of }
const MARKERS = [
  // Standard zlib stream-header variants — what McxProgramParserEngine already scans
  { name: "zlib_78_01", bytes: [0x78, 0x01], family: "zlib_stream" },
  { name: "zlib_78_5e", bytes: [0x78, 0x5e], family: "zlib_stream" },
  { name: "zlib_78_9c", bytes: [0x78, 0x9c], family: "zlib_stream" },
  { name: "zlib_78_da", bytes: [0x78, 0xda], family: "zlib_stream" },
  // Non-standard / quirky zlib headers (78 NN — any low-bit set, FLEVEL variation)
  { name: "zlib_78_9d", bytes: [0x78, 0x9d], family: "zlib_quirky" },
  { name: "zlib_78_ed", bytes: [0x78, 0xed], family: "zlib_quirky" },
  // Other compression containers
  { name: "gzip", bytes: [0x1f, 0x8b], family: "gzip" },
  { name: "zip_local", bytes: [0x50, 0x4b, 0x03, 0x04], family: "zip" },
  { name: "zip_central", bytes: [0x50, 0x4b, 0x01, 0x02], family: "zip" },
  { name: "zip_eocd", bytes: [0x50, 0x4b, 0x05, 0x06], family: "zip" },
  { name: "xz", bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], family: "xz" },
  { name: "bzip2", bytes: [0x42, 0x5a, 0x68], family: "bzip2" },
  { name: "lzw_compress", bytes: [0x1f, 0x9d], family: "lzw" },
  { name: "lz4_frame", bytes: [0x04, 0x22, 0x4d, 0x18], family: "lz4" },
  // Mastercam-specific record-length header (from McxProgramParserEngine)
  { name: "mcx_record_98", bytes: [0x98, 0x00, 0x00, 0x00], family: "mcx_header" },
  // OLE compound document (legacy .mcx X-X7)
  { name: "ole_compound", bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], family: "ole" },
];

/**
 * Count occurrences of every multi-byte marker in `buf`. O(N * total-marker-bytes).
 * For 500 KiB files × ~16 markers × ~4 bytes avg = ~32 MiB compares per file. Fast.
 */
function scanMarkers(buf) {
  const counts = Object.create(null);
  for (const m of MARKERS) counts[m.name] = 0;
  const len = buf.length;

  for (const m of MARKERS) {
    const bytes = m.bytes;
    const blen = bytes.length;
    if (blen === 0 || blen > len) continue;
    // Naive but fast for small blen — fastest is Buffer.indexOf chaining
    const needle = Buffer.from(bytes);
    let pos = 0;
    while (pos <= len - blen) {
      const found = buf.indexOf(needle, pos);
      if (found < 0) break;
      counts[m.name]++;
      pos = found + 1; // overlapping matches kept; zlib headers can't overlap meaningfully but cheap
    }
  }
  return counts;
}

function aggregateByFamily(counts) {
  const fam = Object.create(null);
  for (const m of MARKERS) {
    if (!(m.family in fam)) fam[m.family] = 0;
    fam[m.family] += counts[m.name];
  }
  return fam;
}

async function main() {
  const t0 = Date.now();
  const results = [];

  for (const s of SAMPLE_FILES) {
    const full = path.isAbsolute(s.path) ? s.path : path.join(ROOT, s.path);
    let buf;
    try {
      buf = await fsp.readFile(full);
    } catch (e) {
      results.push({
        stem: s.stem,
        path: s.path,
        engine_chunks: s.engine_chunks,
        ok: false,
        error: String(e?.message ?? e),
      });
      continue;
    }
    const counts = scanMarkers(buf);
    const byFamily = aggregateByFamily(counts);
    const stdZlibTotal = counts.zlib_78_01 + counts.zlib_78_5e + counts.zlib_78_9c + counts.zlib_78_da;
    results.push({
      stem: s.stem,
      path: s.path,
      engine_chunks: s.engine_chunks,
      ok: true,
      bytes: buf.length,
      counts,
      by_family: byFamily,
      standard_zlib_total: stdZlibTotal,
      engine_vs_scan_delta: stdZlibTotal - s.engine_chunks,
    });
  }

  // Aggregate inference across the sample.
  const familyTotals = {};
  for (const r of results) {
    if (!r.ok) continue;
    for (const [f, c] of Object.entries(r.by_family)) {
      familyTotals[f] = (familyTotals[f] ?? 0) + c;
    }
  }

  // Inference rules:
  //   - If standard_zlib_total >> engine_chunks across the sample: engine's
  //     scan window is too narrow (capped reads / first-N-bytes only).
  //   - If standard_zlib_total = engine_chunks but other families dominate
  //     in zero-chunk files: X8 uses a different format.
  //   - If everything stays sparse: format is opaque (no off-the-shelf
  //     compression at the byte level — likely Mastercam-internal).
  const zeroChunkSample = results.filter((r) => r.ok && r.engine_chunks === 0);
  const inference = (() => {
    const allOpaque = zeroChunkSample.every((r) =>
      (r.by_family.zlib_stream ?? 0) === 0 &&
      (r.by_family.zlib_quirky ?? 0) === 0 &&
      (r.by_family.gzip ?? 0) === 0 &&
      (r.by_family.zip ?? 0) === 0 &&
      (r.by_family.xz ?? 0) === 0 &&
      (r.by_family.bzip2 ?? 0) === 0
    );
    const anyStdZlibInZero = zeroChunkSample.some((r) => (r.by_family.zlib_stream ?? 0) > 0);
    const dominantFamily = Object.entries(familyTotals).filter(([k]) => k !== "mcx_header" && k !== "ole").sort((a, b) => b[1] - a[1])[0];
    if (anyStdZlibInZero) {
      return {
        verdict: "engine-scan-window-too-narrow",
        explanation: "zero-chunk files contain standard zlib headers when full-file scanned. McxProgramParserEngine's scan may be capped or sub-sampling; a full-file scan would surface them.",
      };
    }
    if (allOpaque) {
      return {
        verdict: "x8-uses-non-standard-compression",
        explanation: "no zlib/gzip/zip/xz/bzip2 markers in zero-chunk files. Mastercam X8 likely uses a proprietary container; full extraction requires Mastercam SDK / NETHOOK. R12 fail-loud: PRISM cannot recover op-counts from X8 without vendor access.",
      };
    }
    return {
      verdict: "mixed-or-non-zlib-format-present",
      explanation: `dominant non-mcx-header family: ${dominantFamily ? dominantFamily[0] + "×" + dominantFamily[1] : "none"}. Worth investigating per-format.`,
    };
  })();

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    purpose: "Diagnose why McxProgramParserEngine reports zlib_chunks=0 in 89/97 JM Die X8 binaries (Phase-B iter-39 finding)",
    sample_size: SAMPLE_FILES.length,
    runtime_ms: Date.now() - t0,
    family_totals_across_sample: familyTotals,
    inference,
    results,
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  console.error(`compression-scan: ${results.length} files · verdict=${inference.verdict}`);
  console.error(`  family totals: ${JSON.stringify(familyTotals)}`);
  for (const r of results) {
    if (!r.ok) { console.error(`  ${r.stem}: ERROR ${r.error}`); continue; }
    console.error(`  ${r.stem.padEnd(12)} engine=${r.engine_chunks} scan_std_zlib=${r.standard_zlib_total} delta=${r.engine_vs_scan_delta} by_family=${JSON.stringify(r.by_family)}`);
  }
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => { console.error("FATAL:", e?.stack ?? e?.message ?? e); process.exit(1); });