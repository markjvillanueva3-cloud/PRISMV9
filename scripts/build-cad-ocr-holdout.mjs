#!/usr/bin/env node
/**
 * build-cad-ocr-holdout.mjs -- DELTA-CAD-COMPLETION / U-DELTA-OCR-HOLDOUT.
 *
 * Sibling of build-cad-holdout-splits.mjs (which freezes B-Rep GEOM splits from the corpus manifest).
 * THIS freezes the OCR/print eval split from blueprint-training-pairs.jsonl -- the held-out set the
 * print->dimension reader is graded on. Source + schema differ from the geom split:
 *   - source  = the ~51.8MB pairs JSONL (STREAMED line-by-line, never parsed whole), not the manifest.
 *   - identity= part_number_normalized (the leak-guard ID arm key), not abs_path/part_class.
 *   - stratify= match_confidence tier (exact|loose), because print_customers is OCR-garbled
 *               (299BEELINEDR / 299BEELINEROAD / 299BEELINEDRIV are one address; 738 noisy keys, 1108
 *               "(none)" -- a useless stratum key). match_confidence is clean + meaningful.
 *
 * Reuses the SAME freeze core (freezeStratifiedHoldout) -- clone the pattern, not the logic. Each
 * frozen entry carries BOTH a representative answer-key abs_path (so loadHoldout's path-set is
 * non-empty + the path arm fires) AND part_number_normalized (so the leak-guard id/stem arms fire);
 * cad-trainset-leakguard-lib then enforces this split on the OCR trainset.
 *   NOTE 1: on the current corpus part_number_normalized == the .MIN answer-key file-stem, so most
 *   downstream matches resolve via the STEM arm (the id arm is genuinely distinct only for future
 *   non-stem part ids) -- do not assume via:"id" coverage.
 *   NOTE 2: answer-key files are shared MANY-TO-ONE across distinct parts (~35% of eligible parts
 *   share a file; 150 held part-ids back ~122 distinct files), so file-level enforcement conservatively
 *   OVER-excludes file-sharing sibling parts (safe direction). The freezer reports file-collisions; the
 *   self-proof is keyed by PART IDENTITY (not abs_path) so it proves the guarantee this split makes.
 *
 * Eligibility = clean trainable parts ONLY: match_confidence in {exact,loose} AND (has_program||has_cad)
 * -- the same trustworthy-label gate blueprint-trainset-curate uses; poison/miss labels are never eval
 * material (you cannot grade a reader against a wrong or absent answer key).
 *
 * Self-proof (LIVE, R12/R15), keyed by PART IDENTITY via the same part-aware guard that enforces it
 * downstream: (a) every held part TRIPS the guard and (b) NO held (eval) part survives into the
 * post-guard trainset (heldSurvived===0) -- the integrity guarantee, proven on real data, not a mock.
 * Conservative over-exclusion of file/identity-sibling non-held parts is REPORTED (droppedNonHeld), not
 * failed (safe direction). Writes nothing if the self-proof fails.
 *
 * Usage: node scripts/build-cad-ocr-holdout.mjs [--n 150] [--pairs <path>] [--dry]
 * Exit: 0 ok | 1 self-proof failed | 2 error.
 */
import { createReadStream, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { freezeStratifiedHoldout } from "./lib/cad-holdout-guard.mjs";
// The OCR split is PART-identity-keyed, so its self-proof must use the PART-aware leak-guard
// (the same guard that enforces it downstream in blueprint-trainset-curate --holdout), NOT the
// path-only buildHoldoutSet/assertNoLeak -- otherwise the proof verifies the wrong arm.
import { buildHoldoutGuardIndex, recordLeak } from "./lib/cad-trainset-leakguard-lib.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PAIRS = resolve(REPO, "state/shared/blueprint-training-pairs.jsonl");
const OUT_DIR = resolve(REPO, "state/shared/cad-holdout");
const DEFAULT_N = 150; // ~3.9% of the ~3,895 unique-eligible parts; leaves ~3,745 to train. Re-freezable
                       // (stable FNV-1a; read eligibleTotal from the manifest for the live count).

const TRUSTWORTHY = new Set(["exact", "loose"]);

/** Pure: is this pairs record a clean, trustworthy-labeled, trainable part (eval-worthy)? */
export function isCleanForOcr(rec) {
  if (!rec || typeof rec !== "object") return false;
  if (!TRUSTWORTHY.has(rec.match_confidence)) return false;
  return !!(rec.has_program || rec.has_cad);
}

/** Pure: first path-ish string from an array of {path|abs_path|filename|file} objects or bare strings. */
function firstPath(arr) {
  if (!Array.isArray(arr)) return "";
  for (const it of arr) {
    if (typeof it === "string" && it.trim()) return it;
    if (it && typeof it === "object") {
      for (const f of ["path", "abs_path", "filename", "file"]) {
        if (typeof it[f] === "string" && it[f].trim()) return it[f];
      }
    }
  }
  return "";
}

/**
 * Pure: map a clean pairs record to a holdout entry. Carries a representative answer-key abs_path
 * (cad first, else program) so loadHoldout's path-set is non-empty, plus part_number_normalized for
 * the leak-guard ID arm. Returns null if no part id or no answer-key path is present.
 */
export function pairToOcrEntry(rec) {
  if (!rec || typeof rec !== "object") return null;
  const part = (typeof rec.part_number_normalized === "string" && rec.part_number_normalized.trim())
    ? rec.part_number_normalized.trim()
    : (typeof rec.part_number === "string" ? rec.part_number.trim() : "");
  if (!part) return null;
  const abs = firstPath(rec.cad_files) || firstPath(rec.program_files);
  if (!abs) return null;
  return { abs_path: abs, part_number_normalized: part, match_confidence: rec.match_confidence };
}

function parseArgs(argv) {
  const a = { n: null, pairs: DEFAULT_PAIRS, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--n") a.n = Number(argv[++i]);
    else if (argv[i] === "--pairs") a.pairs = String(argv[++i]);
    else if (argv[i] === "--dry") a.dry = true;
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const n = Number.isFinite(args.n) && args.n > 0 ? args.n : DEFAULT_N;

  // Stream the pairs file -> clean eligible OCR entries, deduped by part identity.
  const eligible = [];
  const seen = new Set();
  let parsed = 0, badLines = 0, cleanMappable = 0;
  try {
    const rl = createInterface({ input: createReadStream(args.pairs), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let rec;
      try { rec = JSON.parse(line); } catch { badLines++; continue; }
      parsed++;
      if (!isCleanForOcr(rec)) continue;
      const entry = pairToOcrEntry(rec);
      if (!entry) continue;
      cleanMappable++;
      if (seen.has(entry.part_number_normalized)) continue; // dedup by part identity
      seen.add(entry.part_number_normalized);
      eligible.push(entry);
    }
  } catch (e) {
    process.stderr.write(`[ocr-holdout] cannot read pairs ${args.pairs}: ${e && e.message ? e.message : e}\n`);
    process.exit(2);
  }
  const dedupByPart = cleanMappable - eligible.length;
  process.stdout.write(`[ocr-holdout] parsed-records=${parsed}${badLines ? ` (${badLines} bad)` : ""} clean-mappable=${cleanMappable} unique-eligible=${eligible.length}${dedupByPart ? ` (deduped ${dedupByPart} dup-part)` : ""} requested n=${n}\n`);
  if (eligible.length === 0) { process.stderr.write("[ocr-holdout] no clean eligible parts\n"); process.exit(2); }

  // Stratify by match_confidence tier (per-stratum floor when n >= strata count).
  const frozen = freezeStratifiedHoldout(eligible, { n, stratifyBy: "match_confidence" });
  process.stdout.write(`[ocr-holdout] frozen actual=${frozen.actual}/${frozen.requested} (of ${frozen.total}) strata=${JSON.stringify(frozen.strata)}\n`);

  // LIVE self-proof of the INTEGRITY GUARANTEE this split makes, via the PART-aware leak-guard that
  // enforces it downstream: "no held (eval) part survives into the post-guard trainset." Keyed by part
  // identity -- NOT abs_path (answer-key files are shared many-to-one across distinct parts).
  //   - heldTrips: every held part trips the guard, so it CANNOT enter any trainset (the core need).
  //   - heldSurvived===0: the downstream trainset (eligible parts that do NOT trip the guard) contains
  //     zero held part-ids -- the integrity guarantee, asserted directly.
  // A non-held eligible part that ALSO trips (shares a file or an identity-equivalent stem with a held
  // part) is CONSERVATIVELY dropped from training -- the SAFE direction (a smaller trainset, never a
  // leaked eval). That cost is REPORTED (droppedNonHeld), not a proof failure: dropping a near-duplicate
  // of an eval part is correct, and dropping a coincidental-stem twin is the documented safe bias.
  const guardIdx = buildHoldoutGuardIndex(frozen.held);
  const heldIds = new Set(frozen.held.map((e) => e.part_number_normalized));
  const heldTrips = frozen.held.every((e) => recordLeak(e, guardIdx).leaked);
  let trainset = 0, droppedNonHeld = 0, heldSurvived = 0;
  for (const e of eligible) {
    const leaked = recordLeak(e, guardIdx).leaked;
    const isHeld = heldIds.has(e.part_number_normalized);
    if (leaked) { if (!isHeld) droppedNonHeld++; }
    else { trainset++; if (isHeld) heldSurvived++; }
  }
  const distinctHeldPaths = new Set(frozen.held.map((e) => e.abs_path)).size;
  const proofOk = heldTrips && heldSurvived === 0 && frozen.actual > 0;
  process.stdout.write(`[ocr-holdout] SELF-PROOF: held-trips=${heldTrips} held-survived-into-trainset=${heldSurvived} trainset=${trainset} conservatively-dropped-nonheld=${droppedNonHeld} distinct-held-paths=${distinctHeldPaths}/${frozen.actual} -> ${proofOk ? "PASS" : "FAIL"}\n`);
  if (!proofOk) { process.stderr.write("[ocr-holdout] self-proof FAILED -- a held part would survive into the trainset (real leak)\n"); process.exit(1); }

  if (args.dry) { process.stdout.write("[ocr-holdout] --dry: not writing\n"); process.exit(0); }

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, "ocr-150.json");
  const doc = {
    schemaVersion: "1.0.0",
    split: "ocr",
    forTest: "T-OCR",
    heldOut: true,
    generatedAt: new Date().toISOString(),
    source: "state/shared/blueprint-training-pairs.jsonl",
    identity: "part_number_normalized",
    stratifyBy: "match_confidence",
    requested: frozen.requested,
    actual: frozen.actual,
    eligibleTotal: frozen.total,
    distinctAbsPaths: distinctHeldPaths,
    conservativelyDroppedNonHeld: droppedNonHeld,
    trainsetAfterGuard: trainset,
    note: "PART-identity-keyed eval split. abs_path is a representative answer-key file (shared many-to-one across parts); the leak-guard id/stem arms enforce per-part, and file/identity-equivalent siblings are conservatively dropped from training (safe direction). Self-proven: 0 held parts survive into the post-guard trainset.",
    strata: frozen.strata,
    held: frozen.held.map((e) => ({ abs_path: e.abs_path, part_number_normalized: e.part_number_normalized, match_confidence: e.match_confidence })),
  };
  writeFileSync(outPath, JSON.stringify(doc, null, 2), "utf8");
  process.stdout.write(`[ocr-holdout] wrote ${outPath} (${frozen.actual} held-out parts)\n`);
  process.exit(0);
}

// Run only when invoked directly (so the pure helpers above are importable by tests).
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => {
    process.stderr.write(`[ocr-holdout] FATAL: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
