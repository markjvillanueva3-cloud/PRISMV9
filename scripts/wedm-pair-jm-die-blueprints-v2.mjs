#!/usr/bin/env node
/**
 * wedm-pair-jm-die-blueprints-v2.mjs — Phase-A walker v2 (cross-tree pairing).
 *
 * Iter-26 + iter-28 evidence (see reference_wedm_wizard_proof_and_architecture_2026_05_22)
 * proved v1's single-root algorithm finds 0 pairs because JM Die organizes wire
 * programs and blueprints in DIFFERENT folder trees:
 *
 *   JM DIE/WIRE EDM/<customer>/...           → .mcx-8 / .MIN  (~554 wire programs)
 *   JM DIE/<process-or-customer>/...         → .dxf / .dwg / .pdf / .step / .iges
 *                                              (~5000 blueprints scattered across
 *                                              CNC LATHE/, CNC MILL HAAS/,
 *                                              HAAS-HURCO/, GENERAL BANDAGES/, …)
 *
 * v2 walks the two trees independently, then cross-matches by normalized
 * filename stem. Output includes match_confidence based on customer-folder
 * hint co-occurrence.
 *
 * Output schema (JSON):
 *   {
 *     scanned: { root, blueprint_files, program_files, blueprint_stems, program_stems },
 *     pairs: [{ stem, blueprints: [paths…], programs: [paths…],
 *               customer_hints_blueprint: [...], customer_hints_program: [...],
 *               match_confidence: "high" | "medium" | "low" }],
 *     orphan_programs: [stem...],   // programs with no blueprint match
 *     orphan_blueprints_count: N,    // (just the count — typically huge, ~5000)
 *   }
 *
 * Flags:
 *   --root <path>          override JM DIE root (default: JM DIE)
 *   --programs-subroot <p> override wire-program subroot under root (default: WIRE EDM)
 *   --limit <N>            cap pair list (debugging)
 *   --out <path>           write JSON to file instead of stdout
 *   --include-zip          descend into .zip files (default: skipped — iter-28 proved redundant)
 */
import { promises as fsp } from "node:fs";
import path from "node:path";

const BLUEPRINT_EXT = new Set([".dxf", ".dwg", ".pdf", ".step", ".stp", ".iges", ".igs"]);
const PROGRAM_EXT = new Set([".mcx-8", ".min", ".nc", ".e", ".pgm", ".iso", ".eia"]);

/** Strip common revision suffixes + collapse whitespace/case for stem matching. */
function normalizeStem(name) {
  const base = name.toLowerCase().replace(/\s+/g, "_");
  return base
    .replace(/[-_ ](rev|r|v|ver|version)[-_ ]?\d+$/i, "")
    .replace(/[-_ ]\(\d+\)$/i, "")
    .replace(/[-_ ]?(copy|backup|bak|old)$/i, "")
    .trim();
}

/** Tokenize a customer-hint name for fuzzy match: ACME, AGRATI, "AIR INDUSTRIES" → token set. */
function customerTokens(s) {
  return new Set(
    s.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().split(/\s+/).filter((t) => t.length >= 2),
  );
}

function classifyByExt(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mcx-8")) {
    return { kind: "program", stem: normalizeStem(filename.slice(0, -".mcx-8".length)) };
  }
  const ext = path.extname(lower);
  if (!ext) return null;
  const stem = normalizeStem(filename.slice(0, -ext.length));
  if (BLUEPRINT_EXT.has(ext)) return { kind: "blueprint", stem };
  if (PROGRAM_EXT.has(ext)) return { kind: "program", stem };
  return null;
}

async function* walk(dir, opts) {
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (opts.skipDir && opts.skipDir(full)) continue;
      yield* walk(full, opts);
    } else if (e.isFile()) {
      if (!opts.includeZip && e.name.toLowerCase().endsWith(".zip")) continue;
      yield full;
    }
  }
}

async function main(argv) {
  const opts = {
    root: "JM DIE",
    programsSubroot: "WIRE EDM",
    limit: Infinity,
    out: null,
    includeZip: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") opts.root = argv[++i];
    else if (a === "--programs-subroot") opts.programsSubroot = argv[++i];
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--include-zip") opts.includeZip = true;
    else if (a === "--help" || a === "-h") {
      console.error("usage: node wedm-pair-jm-die-blueprints-v2.mjs [--root <path>] [--programs-subroot <p>] [--limit N] [--out <file>] [--include-zip]");
      process.exit(0);
    }
  }

  const root = path.resolve(opts.root);
  const programsRoot = path.join(root, opts.programsSubroot);

  // Scan programs (constrained to programsRoot)
  const programsByStem = new Map(); // stem → { paths: [], customerHints: Set }
  let programFiles = 0;
  for await (const fp of walk(programsRoot, opts)) {
    programFiles++;
    const cls = classifyByExt(path.basename(fp));
    if (!cls || cls.kind !== "program") continue;
    const rel = path.relative(programsRoot, fp);
    const customer = rel.split(path.sep)[0] || "(root)";
    let g = programsByStem.get(cls.stem);
    if (!g) { g = { paths: [], customerHints: new Set() }; programsByStem.set(cls.stem, g); }
    g.paths.push(fp);
    g.customerHints.add(customer);
  }

  // Scan blueprints (entire root EXCEPT the programs subroot — we know v1 found 0 there)
  const blueprintsByStem = new Map();
  let blueprintFiles = 0;
  const normalizedProgramsRoot = programsRoot;
  const skipProgramsTree = (full) => path.resolve(full) === normalizedProgramsRoot;
  for await (const fp of walk(root, { ...opts, skipDir: skipProgramsTree })) {
    blueprintFiles++;
    const cls = classifyByExt(path.basename(fp));
    if (!cls || cls.kind !== "blueprint") continue;
    const rel = path.relative(root, fp);
    const segs = rel.split(path.sep);
    // Customer-hint heuristic: take all segments except the leaf filename. The
    // last-but-one segment is often the customer name (CNC LATHE/<CUSTOMER>/file).
    const hint = segs.slice(0, -1).join("|") || "(root)";
    let g = blueprintsByStem.get(cls.stem);
    if (!g) { g = { paths: [], pathSegments: new Set() }; blueprintsByStem.set(cls.stem, g); }
    g.paths.push(fp);
    g.pathSegments.add(hint);
  }

  // Cross-match
  const pairs = [];
  const orphanPrograms = [];
  for (const [stem, prg] of programsByStem) {
    const bp = blueprintsByStem.get(stem);
    if (!bp) {
      orphanPrograms.push(stem);
      continue;
    }
    // Match confidence: high if any program-customer-hint token overlaps any
    // blueprint-path-segment token; medium if not but stem matched exactly;
    // low if matched only via fallback (none here — we require exact stem match).
    const progCustTokens = new Set();
    for (const c of prg.customerHints) for (const t of customerTokens(c)) progCustTokens.add(t);
    let overlap = 0;
    for (const seg of bp.pathSegments) {
      for (const t of customerTokens(seg)) if (progCustTokens.has(t)) { overlap++; break; }
    }
    const confidence = overlap > 0 ? "high" : "medium";
    pairs.push({
      stem,
      blueprints: bp.paths.sort(),
      programs: prg.paths.sort(),
      customer_hints_program: [...prg.customerHints].sort(),
      customer_hints_blueprint: [...bp.pathSegments].sort(),
      match_confidence: confidence,
    });
  }
  pairs.sort((a, b) => a.stem.localeCompare(b.stem));
  const limited = pairs.slice(0, opts.limit);

  const report = {
    scanned: {
      root,
      blueprint_files: blueprintFiles,
      program_files: programFiles,
      blueprint_stems: blueprintsByStem.size,
      program_stems: programsByStem.size,
    },
    pair_count_total: pairs.length,
    pair_count_high_confidence: pairs.filter((p) => p.match_confidence === "high").length,
    pairs: limited,
    orphan_programs_count: orphanPrograms.length,
    orphan_programs_sample: orphanPrograms.slice(0, 20),
    orphan_blueprints_count: blueprintsByStem.size - pairs.length,
  };

  const json = JSON.stringify(report, null, 2);
  if (opts.out) {
    await fsp.writeFile(opts.out, json + "\n");
    console.error(
      `wrote ${opts.out} — ${pairs.length} pairs (${report.pair_count_high_confidence} high-confidence), ${orphanPrograms.length} program orphans`,
    );
  } else {
    process.stdout.write(json + "\n");
  }
}

main(process.argv.slice(2)).catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
