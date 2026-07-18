#!/usr/bin/env node
/**
 * wedm-pair-jm-die-blueprints-v3.mjs — Phase-A walker v3 (3-tier fuzzy pairing).
 *
 * v2 (commit f032a144b8) found only 1 high-confidence pair out of 1,346 wire
 * programs against 67,958 unique blueprint stems — proving the matcher, not
 * the corpus, was the limit. Orphan programs carry bare part-numbers
 * (`9100928`, `b-18823`, `57-pp-246e-09`) while blueprints carry job/customer/
 * date prefixes around the same ID.
 *
 * v3 keeps v2's cross-tree walk and adds three tiers of stem matching:
 *
 *   Tier 1 — EXACT stem match (v2's path). Highest confidence.
 *   Tier 2 — SUBSTRING containment in either direction (program_stem inside
 *            blueprint_stem OR vice versa, min 4 chars on the shorter side).
 *            Customer-hint token-overlap gate prevents cross-customer drift.
 *   Tier 3 — NUMERIC-CORE match. Extract longest [A-Za-z0-9-]{4,} run from
 *            each side; pair if program-core appears in blueprint stem.
 *            Same customer-hint gate.
 *
 * Confidence:
 *   - "high"   — tier 1, OR (tier 2/3 + ≥1 customer-token overlap)
 *   - "medium" — tier 2/3 + no customer overlap but stem long enough (≥6)
 *   - "low"    — tier 2/3 short-stem fallback (4-5 chars)
 *
 * A program lands in ONE tier — the strongest that matches. We don't double-
 * count across tiers.
 *
 * Output schema (JSON):
 *   {
 *     scanned: { ... },
 *     pair_count_total, pair_count_by_tier: { exact, substring, numeric_core },
 *     pair_count_by_confidence: { high, medium, low },
 *     pairs: [{ stem, match_tier, match_confidence, blueprints[], programs[],
 *               customer_hints_program, customer_hints_blueprint,
 *               matched_blueprint_stems[] }],
 *     orphan_programs_count, orphan_programs_sample, orphan_blueprints_count
 *   }
 *
 * Flags:
 *   --root <path>          override JM DIE root (default: JM DIE)
 *   --programs-subroot <p> override wire-program subroot (default: WIRE EDM)
 *   --min-core <N>         minimum numeric-core length (default 4)
 *   --min-substring <N>    minimum substring length (default 4)
 *   --limit <N>            cap pair list (debugging)
 *   --out <path>           write JSON to file instead of stdout
 *   --include-zip          descend into .zip files (default: skipped)
 */
import { promises as fsp } from "node:fs";
import path from "node:path";

const BLUEPRINT_EXT = new Set([".dxf", ".dwg", ".pdf", ".step", ".stp", ".iges", ".igs"]);
const PROGRAM_EXT = new Set([".mcx-8", ".min", ".nc", ".e", ".pgm", ".iso", ".eia"]);

function normalizeStem(name) {
  const base = name.toLowerCase().replace(/\s+/g, "_");
  return base
    .replace(/[-_ ](rev|r|v|ver|version)[-_ ]?\d+$/i, "")
    .replace(/[-_ ]\(\d+\)$/i, "")
    .replace(/[-_ ]?(copy|backup|bak|old)$/i, "")
    .trim();
}

function customerTokens(s) {
  return new Set(
    s.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().split(/\s+/).filter((t) => t.length >= 2),
  );
}

/** Extract the longest [A-Za-z0-9-]{N,} run from a stem — the "core" identifier. */
function extractCore(stem, minLen = 4) {
  const runs = stem.match(/[a-z0-9-]{2,}/g) || [];
  let best = "";
  for (const r of runs) if (r.length > best.length) best = r;
  return best.length >= minLen ? best : null;
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

function customerOverlap(progTokens, bpTokens) {
  for (const t of progTokens) if (bpTokens.has(t)) return true;
  return false;
}

function classifyConfidence(tier, hasOverlap, stemLen) {
  if (tier === "exact") return "high";
  if (hasOverlap) return "high";
  if (stemLen >= 6) return "medium";
  return "low";
}

async function main(argv) {
  const opts = {
    root: "JM DIE",
    programsSubroot: "WIRE EDM",
    minCore: 4,
    minSubstring: 4,
    limit: Infinity,
    out: null,
    includeZip: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") opts.root = argv[++i];
    else if (a === "--programs-subroot") opts.programsSubroot = argv[++i];
    else if (a === "--min-core") opts.minCore = Number(argv[++i]);
    else if (a === "--min-substring") opts.minSubstring = Number(argv[++i]);
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--include-zip") opts.includeZip = true;
    else if (a === "--help" || a === "-h") {
      console.error("usage: node wedm-pair-jm-die-blueprints-v3.mjs [--root <p>] [--programs-subroot <p>] [--min-core N] [--min-substring N] [--limit N] [--out <f>] [--include-zip]");
      process.exit(0);
    }
  }

  const root = path.resolve(opts.root);
  const programsRoot = path.join(root, opts.programsSubroot);

  // Scan programs (constrained to programsRoot)
  const programsByStem = new Map(); // stem → { paths: [], customerHints: Set, custTokens: Set }
  let programFiles = 0;
  for await (const fp of walk(programsRoot, opts)) {
    programFiles++;
    const cls = classifyByExt(path.basename(fp));
    if (!cls || cls.kind !== "program") continue;
    const rel = path.relative(programsRoot, fp);
    const customer = rel.split(path.sep)[0] || "(root)";
    let g = programsByStem.get(cls.stem);
    if (!g) {
      g = { paths: [], customerHints: new Set(), custTokens: new Set() };
      programsByStem.set(cls.stem, g);
    }
    g.paths.push(fp);
    g.customerHints.add(customer);
    for (const t of customerTokens(customer)) g.custTokens.add(t);
  }

  // Scan blueprints (everything under root EXCEPT programsRoot)
  const blueprintsByStem = new Map();
  const blueprintStemsArr = []; // for substring search iteration
  let blueprintFiles = 0;
  const normalizedProgramsRoot = programsRoot;
  const skipProgramsTree = (full) => path.resolve(full) === normalizedProgramsRoot;
  for await (const fp of walk(root, { ...opts, skipDir: skipProgramsTree })) {
    blueprintFiles++;
    const cls = classifyByExt(path.basename(fp));
    if (!cls || cls.kind !== "blueprint") continue;
    const rel = path.relative(root, fp);
    const segs = rel.split(path.sep);
    const hint = segs.slice(0, -1).join("|") || "(root)";
    let g = blueprintsByStem.get(cls.stem);
    if (!g) {
      g = { paths: [], pathSegments: new Set(), custTokens: new Set() };
      blueprintsByStem.set(cls.stem, g);
      blueprintStemsArr.push(cls.stem);
    }
    g.paths.push(fp);
    g.pathSegments.add(hint);
    for (const seg of segs.slice(0, -1)) {
      for (const t of customerTokens(seg)) g.custTokens.add(t);
    }
  }

  // 3-tier matching — a program lands in ONE tier (strongest that matches)
  const pairs = [];
  const orphanPrograms = [];
  const tierCounts = { exact: 0, substring: 0, numeric_core: 0 };
  const confCounts = { high: 0, medium: 0, low: 0 };
  const matchedBlueprintStems = new Set();

  for (const [stem, prg] of programsByStem) {
    // Tier 1 — exact
    const exactBp = blueprintsByStem.get(stem);
    if (exactBp) {
      const overlap = customerOverlap(prg.custTokens, exactBp.custTokens);
      const conf = classifyConfidence("exact", overlap, stem.length);
      pairs.push({
        stem,
        match_tier: "exact",
        match_confidence: conf,
        blueprints: exactBp.paths.sort(),
        programs: prg.paths.sort(),
        customer_hints_program: [...prg.customerHints].sort(),
        customer_hints_blueprint: [...exactBp.pathSegments].sort(),
        matched_blueprint_stems: [stem],
      });
      tierCounts.exact++;
      confCounts[conf]++;
      matchedBlueprintStems.add(stem);
      continue;
    }

    // Tier 2 — substring (either direction, customer-overlap gate)
    if (stem.length >= opts.minSubstring) {
      const hits = []; // { bpStem, bpInfo }
      for (const bpStem of blueprintStemsArr) {
        const minLen = Math.min(stem.length, bpStem.length);
        if (minLen < opts.minSubstring) continue;
        // either-direction containment
        if (!stem.includes(bpStem) && !bpStem.includes(stem)) continue;
        const bp = blueprintsByStem.get(bpStem);
        // customer-overlap gate — required for any tier-2 match
        if (!customerOverlap(prg.custTokens, bp.custTokens)) continue;
        hits.push({ bpStem, bp });
      }
      if (hits.length > 0) {
        const allBpPaths = hits.flatMap((h) => h.bp.paths).sort();
        const allBpSegs = new Set();
        for (const h of hits) for (const s of h.bp.pathSegments) allBpSegs.add(s);
        const conf = classifyConfidence("substring", true, stem.length); // overlap gate = always true here
        pairs.push({
          stem,
          match_tier: "substring",
          match_confidence: conf,
          blueprints: allBpPaths,
          programs: prg.paths.sort(),
          customer_hints_program: [...prg.customerHints].sort(),
          customer_hints_blueprint: [...allBpSegs].sort(),
          matched_blueprint_stems: hits.map((h) => h.bpStem).sort(),
        });
        tierCounts.substring++;
        confCounts[conf]++;
        for (const h of hits) matchedBlueprintStems.add(h.bpStem);
        continue;
      }
    }

    // Tier 3 — numeric-core extraction
    const core = extractCore(stem, opts.minCore);
    if (core) {
      const hits = [];
      for (const bpStem of blueprintStemsArr) {
        if (!bpStem.includes(core)) continue;
        const bp = blueprintsByStem.get(bpStem);
        if (!customerOverlap(prg.custTokens, bp.custTokens)) continue;
        hits.push({ bpStem, bp });
      }
      if (hits.length > 0) {
        const allBpPaths = hits.flatMap((h) => h.bp.paths).sort();
        const allBpSegs = new Set();
        for (const h of hits) for (const s of h.bp.pathSegments) allBpSegs.add(s);
        const conf = classifyConfidence("numeric_core", true, core.length);
        pairs.push({
          stem,
          match_tier: "numeric_core",
          match_confidence: conf,
          blueprints: allBpPaths,
          programs: prg.paths.sort(),
          customer_hints_program: [...prg.customerHints].sort(),
          customer_hints_blueprint: [...allBpSegs].sort(),
          matched_blueprint_stems: hits.map((h) => h.bpStem).sort(),
          numeric_core: core,
        });
        tierCounts.numeric_core++;
        confCounts[conf]++;
        for (const h of hits) matchedBlueprintStems.add(h.bpStem);
        continue;
      }
    }

    orphanPrograms.push(stem);
  }

  pairs.sort((a, b) => {
    // sort by tier (exact > substring > numeric_core) then by stem
    const tierRank = { exact: 0, substring: 1, numeric_core: 2 };
    const tr = tierRank[a.match_tier] - tierRank[b.match_tier];
    return tr !== 0 ? tr : a.stem.localeCompare(b.stem);
  });
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
    pair_count_by_tier: tierCounts,
    pair_count_by_confidence: confCounts,
    pairs: limited,
    orphan_programs_count: orphanPrograms.length,
    orphan_programs_sample: orphanPrograms.slice(0, 20),
    orphan_blueprints_count: blueprintsByStem.size - matchedBlueprintStems.size,
  };

  const json = JSON.stringify(report, null, 2);
  if (opts.out) {
    await fsp.writeFile(opts.out, json + "\n");
    console.error(
      `wrote ${opts.out} — ${pairs.length} pairs (exact:${tierCounts.exact} substring:${tierCounts.substring} numeric_core:${tierCounts.numeric_core} | high:${confCounts.high} medium:${confCounts.medium} low:${confCounts.low}), ${orphanPrograms.length} program orphans`,
    );
  } else {
    process.stdout.write(json + "\n");
  }
}

main(process.argv.slice(2)).catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
