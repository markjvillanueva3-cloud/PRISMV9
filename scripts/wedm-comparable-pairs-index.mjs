#!/usr/bin/env node
/**
 * wedm-comparable-pairs-index.mjs — U-WEDM-COMPARABLE-PAIRS-INDEX
 *
 * Phase-A.2 unblocker. The iter-35 corpus census revealed only 22 posted-NC
 * files (19 .MIN Mitsubishi-dialect + 3 .NC generic) across 3,970 .mcx-*
 * Mastercam binaries in JM DIE/WIRE EDM/. This script enumerates those NC
 * files, looks in the SAME directory for sibling .mcx/.mcx-8/.mcx-9/.mcam
 * files with the same stem (case-insensitive), and persists a comparable-pairs
 * index that feeds U-WEDM-POSTED-NC-DEVIATION downstream.
 *
 * Output: state/shared/wedm-comparable-pairs.json
 *
 *   {
 *     schema_version: "1.0.0",
 *     generated_at: ISO,
 *     scan_root: "JM DIE/WIRE EDM",
 *     stats: {
 *       nc_files_total: N,
 *       paired: N,                      // had a .mcx-* sibling in same dir
 *       unpaired: N,                    // posted NC with no .mcx-* sibling
 *     },
 *     pairs: [
 *       {
 *         stem: "AF102-05",
 *         dir: "...",
 *         nc_path: "...",
 *         nc_ext: ".min" | ".nc" | ".eia" | "...",
 *         nc_dialect: "mitsubishi" | "generic" | "unknown",
 *         mcx_paths: ["...mcx-8", "...mcx"],         // all matching siblings
 *         mcx_primary: "...mcx-8" | "...mcx" | null, // prefer newest fmt
 *         file_sizes: { nc_bytes: N, mcx_bytes: N },
 *       }, ...
 *     ],
 *     unpaired: [
 *       { stem, dir, nc_path, nc_ext, reason: "no sibling .mcx-* in this dir" }, ...
 *     ],
 *   }
 *
 * Dialect inference from extension only (cheap; deeper sniffing is the parser's job):
 *   .min → Mitsubishi WEDM ($PC...% / NBAR / DEF WORK / M-codes)
 *   .nc  → generic G-code (could be Fanuc/Mitsubishi/AGIE/Sodick — parser decides)
 *   .eia → EIA-RS-274 ASCII G-code
 *   .nci, .fnc → Mastercam intermediate (NOT posted final; less useful)
 *
 * No external deps; pure node:fs walk. Bounded to JM DIE/WIRE EDM/ (the only
 * tree with NC-paired Mastercam refs per the iter-35 corpus census).
 */
import { promises as fsp } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("H:/prism");
const SCAN_ROOT = path.join(ROOT, "JM DIE", "WIRE EDM");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-comparable-pairs.json");

const NC_EXTS = new Set([".min", ".nc", ".eia", ".nci", ".fnc"]);
const MCX_EXTS = new Set([".mcx", ".mcx-8", ".mcx-9", ".mcam"]);

const DIALECT_BY_EXT = {
  ".min": "mitsubishi",
  ".nc": "generic",
  ".eia": "eia",
  ".nci": "mastercam-intermediate",
  ".fnc": "mastercam-intermediate",
};

/** Recursive directory walk; yields {full,dirent} for every regular file. */
async function* walk(dir) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (e) {
    // Skip unreadable directories (permissions / orphaned symlinks); the JM
    // Die tree has occasional Windows-only artifacts.
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walk(full);
    } else if (ent.isFile()) {
      yield { full, dirent: ent };
    }
  }
}

async function safeStat(p) {
  try {
    const s = await fsp.stat(p);
    return { size: s.size };
  } catch {
    return { size: null };
  }
}

async function main() {
  const t0 = Date.now();

  // First pass: collect every file under SCAN_ROOT into a single stem-keyed
  // index. The iter-1 run (same-dir matching) returned 0/22 paired — JM Die's
  // filing convention separates Mastercam source (.mcx-*) from posted NC
  // output (.min/.nc) into different folder trees. The right corresponedence
  // is by STEM across the whole scan tree, not by same-dir sibling.
  const byStem = new Map(); // stemLower → { mcx: [{path, ext, dir}], nc: [{path, ext, dir}] }
  let totalFiles = 0;
  let totalDirs = 0;
  const seenDirs = new Set();

  for await (const { full } of walk(SCAN_ROOT)) {
    totalFiles++;
    const dir = path.dirname(full);
    if (!seenDirs.has(dir)) { seenDirs.add(dir); totalDirs++; }
    const ext = path.extname(full).toLowerCase();
    const isNc = NC_EXTS.has(ext);
    const isMcx = MCX_EXTS.has(ext);
    if (!isNc && !isMcx) continue;
    const stem = path.basename(full, path.extname(full)).toLowerCase();
    if (!byStem.has(stem)) byStem.set(stem, { mcx: [], nc: [] });
    const bucket = byStem.get(stem);
    (isMcx ? bucket.mcx : bucket.nc).push({ path: full, ext, dir });
  }

  // Second pass: for every stem with at least one NC file, emit a pair entry
  // (paired if at least one .mcx-* exists for the same stem anywhere in the
  // tree, otherwise unpaired). Same-dir matches still get a `same_dir: true`
  // hint so downstream consumers can prioritize them as higher-confidence.
  const pairs = [];
  const unpaired = [];

  for (const [stem, bucket] of byStem) {
    if (bucket.nc.length === 0) continue;
    // Prefer the first NC if multiple exist (rare; same stem with both .min
    // and .nc would be ambiguous — operator would have post-processed twice).
    const ncEntry = bucket.nc[0];

    if (bucket.mcx.length === 0) {
      unpaired.push({
        stem,
        nc_path: ncEntry.path,
        nc_ext: ncEntry.ext,
        nc_dialect: DIALECT_BY_EXT[ncEntry.ext] ?? "unknown",
        nc_dir: ncEntry.dir,
        reason: "no .mcx-* with this stem anywhere in scan tree",
      });
      continue;
    }

    // Prefer .mcx-8 > .mcx-9 > .mcx > .mcam (newest format wins for parse-ability)
    const fmtOrder = [".mcx-8", ".mcx-9", ".mcx", ".mcam"];
    const mcxSorted = bucket.mcx.slice().sort((a, b) => {
      const ai = fmtOrder.indexOf(a.ext);
      const bi = fmtOrder.indexOf(b.ext);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    const mcxPrimaryEntry = mcxSorted[0];
    const sameDirMatch = mcxSorted.some((m) => m.dir === ncEntry.dir);

    const [ncStat, mcxStat] = await Promise.all([
      safeStat(ncEntry.path),
      safeStat(mcxPrimaryEntry.path),
    ]);

    pairs.push({
      stem,
      nc_path: ncEntry.path,
      nc_ext: ncEntry.ext,
      nc_dialect: DIALECT_BY_EXT[ncEntry.ext] ?? "unknown",
      nc_dir: ncEntry.dir,
      mcx_primary: mcxPrimaryEntry.path,
      mcx_primary_ext: mcxPrimaryEntry.ext,
      mcx_paths: mcxSorted.map((m) => m.path),
      mcx_dirs: [...new Set(mcxSorted.map((m) => m.dir))],
      same_dir: sameDirMatch,
      file_sizes: { nc_bytes: ncStat.size, mcx_bytes: mcxStat.size },
    });
  }

  // Dialect histogram covers BOTH paired and unpaired (the iter-1 bug was
  // only counting paired, returning {} when paired=0 even though NC files
  // existed). Operators need to see the dialect mix regardless of pairing.
  const dialectHist = {};
  for (const e of [...pairs, ...unpaired]) {
    dialectHist[e.nc_dialect] = (dialectHist[e.nc_dialect] ?? 0) + 1;
  }

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    scan_root: path.relative(ROOT, SCAN_ROOT).replace(/\\/g, "/"),
    runtime_ms: Date.now() - t0,
    stats: {
      files_scanned_total: totalFiles,
      directories_visited: totalDirs,
      nc_files_total: pairs.length + unpaired.length,
      paired: pairs.length,
      same_dir_paired: pairs.filter((p) => p.same_dir).length,
      cross_dir_paired: pairs.filter((p) => !p.same_dir).length,
      unpaired: unpaired.length,
      by_dialect: dialectHist,
    },
    pairs,
    unpaired,
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  console.error(
    `wedm-comparable-pairs: ${out.stats.nc_files_total} NC files · ` +
      `${out.stats.paired} paired · ${out.stats.unpaired} unpaired · ` +
      `by_dialect=${JSON.stringify(out.stats.by_dialect)} · ` +
      `runtime=${out.runtime_ms}ms · scanned ${out.stats.files_scanned_total} files / ${out.stats.directories_visited} dirs`,
  );
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => {
  console.error("FATAL:", e?.stack ?? e?.message ?? e);
  process.exit(1);
});
