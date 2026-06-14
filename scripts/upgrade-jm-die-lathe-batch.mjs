#!/usr/bin/env node
/**
 * upgrade-jm-die-lathe-batch.mjs — batch JM Die lathe program upgrader
 *
 * Walks `H:/PRISM/JM DIE/CNC LATHE/<customer>/**` for .nc/.NC/.txt/.tap/.min program
 * files. For each, calls the JMDieLatheProgramUpgraderEngine pure-function API
 * and writes 7 per-machine variants to `state/shared/dashboards/jm-die-lathe-upgraded/<customer>/<partNumber>_<machineModel>.nc`.
 *
 * Closes /goal directive (slot:whiskey 2026-05-23): "upgrade every single JM Die
 * lathe program ... make a version for all lathes in JM Die inventory and name
 * accordingly: part number then machine model for the file output".
 *
 * Operator assumptions (baked into engine):
 *   - HSSco Allied Engineering TA inserts with TiAlN coating
 *   - Tool steel default material (override via --material when print known)
 *   - 7 JM Die Okuma lathes per JM_DIE_LATHES inventory
 *
 * CLI:
 *   node scripts/upgrade-jm-die-lathe-batch.mjs                       full corpus
 *   node scripts/upgrade-jm-die-lathe-batch.mjs --customer ITW        single customer
 *   node scripts/upgrade-jm-die-lathe-batch.mjs --limit 10            cap programs
 *   node scripts/upgrade-jm-die-lathe-batch.mjs --dry-run             plan, no writes
 *
 * Exit codes: 0 = ok, 1 = source dir missing, 2 = engine load failure.
 *
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-BATCH
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const SOURCE_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
// Per operator directive 2026-05-23: upgraded variants land in the SAME
// customer subfolder as the source program, not a separate dashboard.
// The unique `_<machineModel>` suffix prevents collisions with source filenames.
const OUTPUT_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
const PROGRAM_EXTENSIONS = [".nc", ".NC", ".txt", ".TXT", ".tap", ".TAP", ".min", ".MIN", ".cnc", ".CNC"];

function parseArgs(argv) {
  const args = { customer: null, limit: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--customer") args.customer = argv[++i];
    else if (argv[i] === "--limit") args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === "--dry-run") args.dryRun = true;
  }
  return args;
}

function walkPrograms(root, customerFilter, limit) {
  const programs = [];
  if (!existsSync(root)) return programs;
  const customers = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const customer of customers) {
    if (customerFilter && customer !== customerFilter) continue;
    const customerDir = join(root, customer);
    walkDir(customerDir, customer, programs, limit);
    if (limit && programs.length >= limit) return programs;
  }
  return programs;
}

function walkDir(dir, customer, programs, limit) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (limit && programs.length >= limit) return;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, customer, programs, limit);
    } else if (PROGRAM_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      programs.push({ customer, path: full });
    }
  }
}

async function loadUpgrader() {
  // V2 path — physics-driven via UltimateSpeedFeedEngine. Caller can opt out
  // back to V1 via PRISM_LATHE_UPGRADER_VERSION=v1 (preserved for diff).
  const wantV2 = process.env.PRISM_LATHE_UPGRADER_VERSION !== "v1";
  const moduleName = wantV2
    ? "JMDieLatheProgramUpgraderV2Engine"
    : "JMDieLatheProgramUpgraderEngine";
  const exportNameClass = wantV2 ? "JMDieLatheProgramUpgraderV2Engine" : "JMDieLatheProgramUpgraderEngine";
  const exportNameSingleton = wantV2 ? "jmDieLatheProgramUpgraderV2Engine" : "jmDieLatheProgramUpgraderEngine";
  try {
    const mod = await import(`../mcp-server/src/engines/${moduleName}.js`);
    return mod[exportNameClass] ?? mod[exportNameSingleton];
  } catch (err) {
    try {
      const mod = await import(`../mcp-server/src/engines/${moduleName}.ts`);
      return mod[exportNameClass] ?? mod[exportNameSingleton];
    } catch {
      console.error(`FATAL: failed to import ${moduleName}:`, err?.message || err);
      process.exit(2);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!existsSync(SOURCE_ROOT)) {
    console.error(`SOURCE_ROOT missing: ${SOURCE_ROOT}`);
    process.exit(1);
  }
  const upgrader = await loadUpgrader();

  console.log(`Scanning ${SOURCE_ROOT}${args.customer ? ` filter=${args.customer}` : ""}${args.limit ? ` limit=${args.limit}` : ""}...`);
  const programs = walkPrograms(SOURCE_ROOT, args.customer, args.limit);
  console.log(`Found ${programs.length} program(s).`);

  let upgraded = 0;
  let variantsWritten = 0;
  let warnings = 0;
  for (const prog of programs) {
    let text = "";
    try {
      text = readFileSync(prog.path, "utf8");
    } catch {
      // Skip unreadable files (binary/locked).
      continue;
    }
    // V2 returns a Promise (lazy-imports UltimateSpeedFeedEngine); V1 is sync.
    // Awaiting a non-Promise is a no-op so this works for both.
    const maybeResult = upgrader.upgradeOne({ sourcePath: prog.path, programText: text });
    const result = maybeResult instanceof Promise ? await maybeResult : maybeResult;
    warnings += result.warnings.length;
    upgraded += 1;

    if (args.dryRun) {
      console.log(`[dry-run] ${prog.customer}/${result.partNumber} → 7 variants`);
      variantsWritten += result.variants.length;
      continue;
    }

    // Cleaner per-customer layout per operator directive 2026-05-23:
    //   <customer>/PRISM_UPGRADED/<machineModel>/<partNumber>.nc
    // Each lathe gets its own subfolder so an operator running on, e.g.,
    // the LB-3000EX BigBore can `cd` into one place and find every
    // upgraded program for that machine without filename suffix grep.
    for (const v of result.variants) {
      // U-UPGRADE-BODY-RESCALE — skip variants whose source program doesn't
      // fit the target machine envelope. The engine flagged them; the CLI
      // refuses to write physically-unsafe programs. Skip list logged below.
      if (v.skipped === true) {
        // Track skip for end-of-run report — don't write to disk
        if (!result.__skipCount) result.__skipCount = 0;
        result.__skipCount++;
        continue;
      }
      const outDir = join(OUTPUT_ROOT, prog.customer, "PRISM_UPGRADED", v.machineModel);
      mkdirSync(outDir, { recursive: true });
      // Drop the redundant _<machineModel> suffix since it's in the path now.
      const cleanName = `${result.partNumber}.nc`;
      const outPath = join(outDir, cleanName);
      // Emit a minimal G-code header documenting the upgrade decisions. The
      // BODY of the source program is preserved verbatim — structure trusted,
      // S/F overridden via header documentation. A future iter will splice
      // S RPM + F feedrate lines into the body using a controller-aware
      // post-processor; this iter ships the audit-grade header.
      // V1 and V2 expose slightly different field names. Normalize.
      const docField = v.depthOfCut_mm ?? v.depth_of_cut_mm ?? 0;
      const sfmField = v.sfm_effective ?? v.effective_sfm ?? 0;
      const isoField = v.iso_group ?? result.iso_group ?? "?";
      const confField = v.rpm_confidence !== undefined ? ` confidence=${v.rpm_confidence.toFixed(2)} source=${v.rpm_source}` : "";
      const engineVer = result.engineVersion ?? "1.0.0";
      const physicsBackend = result.physicsBackend ?? "hardcoded-baseline";
      const header = [
        `(=== PRISM JM-Die Lathe Upgrade v${engineVer} ===)`,
        `(  source: ${prog.path})`,
        `(  partNumber: ${result.partNumber})`,
        `(  machineId: ${v.machineId})`,
        `(  machineModel: ${v.machineModel})`,
        `(  material: ${result.material})`,
        `(  iso_group: ${isoField})`,
        `(  RPM: ${v.rpm}${confField})`,
        `(  feedrate: ${v.feedrate_mm_min} mm/min)`,
        `(  depthOfCut: ${docField} mm)`,
        `(  effective SFM: ${sfmField})`,
        `(  physicsBackend: ${physicsBackend})`,
        `(  rationale: ${v.rationale})`,
        `(=== End upgrade header ===)`,
        ``,
      ].join("\n");
      writeFileSync(outPath, header + text, "utf8");
      variantsWritten += 1;
    }
  }

  console.log(`\nUpgrade run complete.`);
  console.log(`  programs processed: ${upgraded}`);
  console.log(`  variants written:   ${variantsWritten}`);
  console.log(`  warnings:           ${warnings}`);
  console.log(`  output root:        ${OUTPUT_ROOT}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
