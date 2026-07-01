#!/usr/bin/env node
/**
 * wedm-pair-jm-die-blueprints.mjs — Phase-A walker for the WEDM wizard training corpus.
 *
 * Walks `JM DIE/WIRE EDM/<customer>/...` and groups files by **filename stem**
 * (the basename minus its extension and minus a few common revision suffixes like
 * "-rev1", "_R2", " (2)"). A "pair" is a stem that has BOTH at least one blueprint
 * (.dxf / .dwg / .pdf / .step / .stp / .iges / .igs) AND at least one wire program
 * (.mcx-8 / .nc / .min / .e / .pgm / .iso / .eia). Customer folder is captured.
 *
 * The walker is read-only and does no parsing — it emits a structured JSON list
 * of candidate pairs that downstream Phase-A iters feed into McxProgramParserEngine
 * + DXFGeometryParserEngine to build training samples.
 *
 * Output schema (stdout JSON or --out file):
 *   {
 *     scanned: { root, customers, files, blueprints, programs },
 *     pairs:   [{ stem, customer, blueprints: [paths…], programs: [paths…] }],
 *     orphans: { blueprints_no_program: N, programs_no_blueprint: N }
 *   }
 *
 * Flags:
 *   --root <path>     override the WEDM root (default: JM DIE/WIRE EDM)
 *   --limit <N>       stop after grouping N pairs (debugging)
 *   --customers <N>   limit to first N customer folders (debugging)
 *   --out <path>      write JSON to file instead of stdout
 *   --include-zip     descend into .zip files (default: skipped — operator must extract)
 */
import { promises as fsp } from "node:fs";
import path from "node:path";

const BLUEPRINT_EXT = new Set([".dxf", ".dwg", ".pdf", ".step", ".stp", ".iges", ".igs"]);
const PROGRAM_EXT = new Set([".mcx-8", ".nc", ".min", ".e", ".pgm", ".iso", ".eia"]);

/** Strip common revision suffixes + collapse whitespace/case for stem matching. */
function normalizeStem(name) {
  const base = name.toLowerCase().replace(/\s+/g, "_");
  // Drop trailing "-rev1", "_r2", " (2)", "-v3", " copy", " bak" before extension.
  return base
    .replace(/[-_ ](rev|r|v|ver|version)[-_ ]?\d+$/i, "")
    .replace(/[-_ ]\(\d+\)$/i, "")
    .replace(/[-_ ]?(copy|backup|bak|old)$/i, "")
    .trim();
}

function classifyByExt(filename) {
  // .mcx-8 has a hyphenated extension — handle it explicitly.
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mcx-8")) return { kind: "program", stem: normalizeStem(filename.slice(0, -".mcx-8".length)) };
  const ext = path.extname(lower);
  if (!ext) return null;
  const stem = normalizeStem(filename.slice(0, -ext.length));
  if (BLUEPRINT_EXT.has(ext)) return { kind: "blueprint", stem };
  if (PROGRAM_EXT.has(ext)) return { kind: "program", stem };
  return null;
}

async function* walkDir(dir, opts) {
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith(".")) continue;
      yield* walkDir(full, opts);
    } else if (e.isFile()) {
      if (!opts.includeZip && e.name.toLowerCase().endsWith(".zip")) continue;
      yield full;
    }
  }
}

async function main(argv) {
  const opts = {
    root: "JM DIE/WIRE EDM",
    limit: Infinity,
    customers: Infinity,
    out: null,
    includeZip: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") opts.root = argv[++i];
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--customers") opts.customers = Number(argv[++i]);
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--include-zip") opts.includeZip = true;
    else if (a === "--help" || a === "-h") {
      console.error("usage: node wedm-pair-jm-die-blueprints.mjs [--root <path>] [--limit N] [--customers N] [--out <file>] [--include-zip]");
      process.exit(0);
    }
  }

  const root = path.resolve(opts.root);
  let rootStat;
  try { rootStat = await fsp.stat(root); }
  catch { console.error("ERROR: root not found:", root); process.exit(2); }
  if (!rootStat.isDirectory()) { console.error("ERROR: root is not a directory:", root); process.exit(2); }

  // Customer folders = direct subdirs of root (skip hidden + non-dirs)
  const topEntries = await fsp.readdir(root, { withFileTypes: true });
  const customerDirs = topEntries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort()
    .slice(0, opts.customers);

  // groups: stem → { customer, blueprints: Set<path>, programs: Set<path> }
  const groups = new Map();
  let fileCount = 0;

  // Also process loose-root files (programs/blueprints not in a customer folder)
  for await (const fp of walkDir(root, opts)) {
    fileCount++;
    const rel = path.relative(root, fp);
    const parts = rel.split(path.sep);
    const customer = parts.length > 1 ? parts[0] : "(root)";
    if (customer !== "(root)" && !customerDirs.includes(customer)) continue;
    const cls = classifyByExt(path.basename(fp));
    if (!cls) continue;
    const key = `${customer}::${cls.stem}`;
    let g = groups.get(key);
    if (!g) { g = { stem: cls.stem, customer, blueprints: new Set(), programs: new Set() }; groups.set(key, g); }
    if (cls.kind === "blueprint") g.blueprints.add(fp);
    else g.programs.add(fp);
  }

  const allPairs = [];
  let bpNoPrg = 0, prgNoBp = 0, bpTot = 0, prgTot = 0;
  for (const g of groups.values()) {
    bpTot += g.blueprints.size;
    prgTot += g.programs.size;
    if (g.blueprints.size && g.programs.size) {
      allPairs.push({
        stem: g.stem,
        customer: g.customer,
        blueprints: [...g.blueprints].sort(),
        programs: [...g.programs].sort(),
      });
    } else if (g.blueprints.size) bpNoPrg++;
    else if (g.programs.size) prgNoBp++;
  }
  allPairs.sort((a, b) => (a.customer + a.stem).localeCompare(b.customer + b.stem));
  const pairs = allPairs.slice(0, opts.limit);

  const report = {
    scanned: { root, customers: customerDirs.length, files: fileCount, blueprints: bpTot, programs: prgTot },
    pair_count_total: allPairs.length,
    pairs,
    orphans: { blueprints_no_program: bpNoPrg, programs_no_blueprint: prgNoBp },
  };

  const json = JSON.stringify(report, null, 2);
  if (opts.out) {
    await fsp.writeFile(opts.out, json + "\n");
    console.error(`wrote ${opts.out} — ${allPairs.length} pairs, ${bpNoPrg + prgNoBp} orphan groups`);
  } else {
    process.stdout.write(json + "\n");
  }
}

main(process.argv.slice(2)).catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
