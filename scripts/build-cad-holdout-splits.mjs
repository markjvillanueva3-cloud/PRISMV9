#!/usr/bin/env node
/**
 * build-cad-holdout-splits.mjs -- DELTA-CAD-COMPLETION / U-DELTA-HOLDOUT-SPLITS.
 *
 * Freezes class-stratified, DETERMINISTIC held-out evaluation manifests from the live CAD corpus
 * (mcp-server/data/state/cad-corpus-manifest.json) using scripts/lib/cad-holdout-guard.mjs. The
 * frozen split is the immovable eval set: train converters MUST exclude every abs_path in it
 * (assertNoLeak), so downstream accuracy numbers are trustworthy. Re-runnable: same corpus -> same
 * split (stable FNV-1a ordering), so re-freezing as the corpus grows is auditable, not random churn.
 *
 * This turn ships the geom-50 (B-Rep geometry) holdout -- the T-GEOM eval set. embed-500 / assembly
 * / cnc-1k splits attach here as their sources wire in (the lib + this driver already support them).
 *
 * Self-proof: after freezing, it asserts (a) the training remainder is leak-FREE and (b) feeding the
 * held set back as training TRIPS the guard -- proving the leak guard works on LIVE data, not a mock.
 *
 * Usage: node scripts/build-cad-holdout-splits.mjs [--n 50] [--split geom] [--dry]
 *   --dry  : compute + self-prove, do NOT write the manifest.
 * Exit: 0 ok | 1 self-proof failed | 2 error.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { freezeStratifiedHoldout, assertNoLeak, buildHoldoutSet, normalizePath, summarizeStrata, isNonPartGeometry, dedupeByContentKey } from "./lib/cad-holdout-guard.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = resolve(REPO, "mcp-server/data/state/cad-corpus-manifest.json");
const OUT_DIR = resolve(REPO, "state/shared/cad-holdout");

// Split definitions: which corpus ext set + default size feeds each held-out eval manifest.
const SPLITS = {
  geom: { exts: [".step", ".stp", ".igs", ".iges", ".x_t", ".x_b"], n: 50, file: "geom-50.json", test: "T-GEOM" },
  embed: { exts: [".step", ".stp", ".igs", ".iges", ".x_t", ".x_b"], n: 500, file: "embed-500.json", test: "T-EMBED" },
};

function parseArgs(argv) {
  const a = { n: null, split: "geom", dry: false, apply: false, legacy: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--n") a.n = Number(argv[++i]);
    else if (argv[i] === "--split") a.split = String(argv[++i]);
    else if (argv[i] === "--dry") a.dry = true;
    else if (argv[i] === "--apply") a.apply = true;       // overwrite the canonical frozen file (deliberate re-freeze)
    else if (argv[i] === "--legacy") a.legacy = true;     // skip part-purity filter (reproduce the pre-filter split)
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const def = SPLITS[args.split];
  if (!def) { process.stderr.write(`[holdout] unknown --split ${args.split} (have: ${Object.keys(SPLITS).join(", ")})\n`); process.exit(2); }
  const n = Number.isFinite(args.n) && args.n > 0 ? args.n : def.n;

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch (e) {
    process.stderr.write(`[holdout] cannot read corpus manifest ${MANIFEST}: ${e && e.message ? e.message : e}\n`);
    process.exit(2);
  }
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  const extSet = new Set(def.exts);
  const eligibleRaw = entries.filter((e) => e && typeof e.ext === "string" && extSet.has(e.ext.toLowerCase()));
  // Dedup by normalized path: a re-cased/re-scanned twin would otherwise let an object-identity
  // downstream filter leak a held part's duplicate. One object per normalized path.
  const seenNorm = new Set();
  const eligible = [];
  for (const e of eligibleRaw) {
    const np = normalizePath(e.abs_path);
    if (np && !seenNorm.has(np)) { seenNorm.add(np); eligible.push(e); }
  }
  const dropped = eligibleRaw.length - eligible.length;

  // PART-PURITY (U-CAD-HOLDOUT-PARTPURITY, slot:delta): a CAD-part-generation eval set must contain only
  // manufacturable PARTS -- exclude machine-tool/holder/post/tooling models, then collapse content-level
  // duplicates (same part mirrored at a different dir, which the path-dedup above misses). Default-ON
  // (the correct behavior); --legacy reproduces the pre-filter split exactly. Counts reported (R12).
  let pure = eligible;
  let excludedNonPart = 0;
  let excludedContentDup = 0;
  if (!args.legacy) {
    const partsOnly = eligible.filter((e) => !isNonPartGeometry(e.abs_path));
    excludedNonPart = eligible.length - partsOnly.length;
    pure = dedupeByContentKey(partsOnly);
    excludedContentDup = partsOnly.length - pure.length;
  }
  process.stdout.write(
    `[holdout] corpus=${entries.length} eligible(${args.split})=${eligible.length}` +
    `${dropped ? ` (deduped ${dropped} dup-path)` : ""}` +
    `${args.legacy ? " [--legacy: part-purity OFF]" : ` -> part-only=${pure.length} (excluded ${excludedNonPart} non-part model(s) + ${excludedContentDup} content-dup(s))`}` +
    ` requested n=${n}\n`,
  );
  if (pure.length === 0) { process.stderr.write(`[holdout] no eligible entries for split ${args.split}\n`); process.exit(2); }

  const frozen = freezeStratifiedHoldout(pure, { n });
  process.stdout.write(`[holdout] frozen actual=${frozen.actual}/${frozen.requested} (of ${frozen.total} part-only eligible) strata=${JSON.stringify(frozen.strata)}\n`);

  // --- LIVE self-proof: the guard must be clean vs the remainder and trip vs the held set ---
  const holdoutSet = buildHoldoutSet(frozen.held);
  const heldNorm = new Set(frozen.held.map((e) => normalizePath(e.abs_path)));
  const remainder = pure.filter((e) => !heldNorm.has(normalizePath(e.abs_path)));
  const remainderLeaks = assertNoLeak(remainder, holdoutSet, { throwOnLeak: false });
  let heldTrips = false;
  try { assertNoLeak(frozen.held, holdoutSet); } catch { heldTrips = true; }
  const proofOk = remainderLeaks.length === 0 && heldTrips && frozen.actual > 0;
  process.stdout.write(`[holdout] SELF-PROOF: remainder-leaks=${remainderLeaks.length} held-trips-guard=${heldTrips} -> ${proofOk ? "PASS" : "FAIL"}\n`);
  if (!proofOk) { process.stderr.write("[holdout] self-proof FAILED -- not writing a manifest the guard cannot defend\n"); process.exit(1); }

  if (args.dry) { process.stdout.write("[holdout] --dry: not writing\n"); process.exit(0); }

  mkdirSync(OUT_DIR, { recursive: true });
  // NON-DESTRUCTIVE by default: the canonical split is a FROZEN immovable measurement set that downstream
  // scoring (U-DELTA-EVAL-HARNESS) + leak-guards depend on -- re-freezing it shifts those numbers, a
  // deliberate adoption step. So default writes a `.clean.json` sibling; --apply overwrites the canonical.
  const canonicalPath = resolve(OUT_DIR, def.file);
  const outPath = args.apply ? canonicalPath : resolve(OUT_DIR, def.file.replace(/\.json$/, ".clean.json"));
  const doc = {
    schemaVersion: "1.1.0", // 1.1.0 adds part-purity provenance (partPurity/excluded* fields)
    split: args.split,
    forTest: def.test,
    heldOut: true,
    generatedAt: new Date().toISOString(),
    source: "mcp-server/data/state/cad-corpus-manifest.json",
    exts: def.exts,
    partPurity: !args.legacy,         // non-part models + content-dups excluded (U-CAD-HOLDOUT-PARTPURITY)
    excludedNonPart,
    excludedContentDup,
    requested: frozen.requested,
    actual: frozen.actual,
    eligibleTotal: frozen.total,       // part-only eligible (post-filter) when partPurity
    strata: frozen.strata,
    held: frozen.held.map((e) => ({ abs_path: e.abs_path, part_class: e.part_class, ext: e.ext })),
  };
  writeFileSync(outPath, JSON.stringify(doc, null, 2), "utf8");
  process.stdout.write(`[holdout] wrote ${outPath} (${frozen.actual} held-out parts, ${Object.keys(frozen.strata).length} classes)\n`);
  if (!args.apply) {
    process.stdout.write(`[holdout] NON-DESTRUCTIVE: canonical ${def.file} left intact. Adopt the clean split as the frozen set via --apply, then re-run the harness.\n`);
  }
  process.exit(0);
}

main();
