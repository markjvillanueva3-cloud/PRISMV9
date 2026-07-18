#!/usr/bin/env node
/**
 * extract-cam-training-corpus.mjs — KILO-CAM-TRAINING-MS0 campaign iter 5
 *
 * Walks the JM-Die CAM corpus, identifies per-part program files, and
 * emits a CAM-training-tuple-shaped JSON for downstream consumption by
 * KiloCamProgramTrainingEngine (which lives in the TS engine layer).
 *
 * Strategy: pure file-system walk + per-system shallow file inspection.
 * No vendor SDKs, no Fusion process, no APS network. ETA per partlib
 * manifest summary stats. The output JSON IS the input shape
 * `ExtractedCamProgram[]` that KiloCamProgramTrainingEngine consumes.
 *
 * Mastercam .mcx / Okuma .min binary decoders are not implemented here —
 * this script emits ONE placeholder program per part directory with a
 * placeholder feature + operation. Real per-format decoders (vendor SDK
 * or 3rd-party) slot into decodeProgram() with no script changes.
 *
 * Usage:
 *   node scripts/extract-cam-training-corpus.mjs --limit 100
 *   node scripts/extract-cam-training-corpus.mjs --systems mastercam,okuma --limit 50
 *
 * Per kilo refuse-list:
 *   - no-silent-fallback: placeholder rows explicitly tagged so downstream
 *     trainer can refuse to consume them
 *
 * @milestone KILO-CAM-TRAINING-MS0
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");

function parseArgs(argv) {
  const args = {
    manifest: path.join(REPO_ROOT, "state/shared/jm-die-partlib-manifest.json"),
    out: path.join(REPO_ROOT, "state/shared/cam-training-tuples.json"),
    limit: 0,
    systems: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--manifest" && argv[i + 1]) { args.manifest = argv[++i]; }
    else if (a === "--out" && argv[i + 1]) { args.out = argv[++i]; }
    else if (a === "--limit" && argv[i + 1]) { args.limit = parseInt(argv[++i], 10) || 0; }
    else if (a === "--systems" && argv[i + 1]) { args.systems = argv[++i].split(","); }
  }
  return args;
}

const EXT_TO_SYSTEM = {
  ".mcx": "mastercam",
  ".mcx-8": "mastercam",
  ".mcam": "mastercam",
  ".min": "okuma",
  ".f3d": "fusion360",
  ".ipt": "fusion360",
  ".iam": "fusion360",
  ".nc": "okuma",
  ".hnc": "okuma",
};

function systemForFile(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  return EXT_TO_SYSTEM[ext] ?? null;
}

/**
 * Shallow extractor — proves the wire-up. Real per-format decoders go here:
 *   - Mastercam .mcx-8: vendor SDK or 3rd-party `mcam-parser`
 *   - Okuma .min: ASCII G-code parse (PRISMOkumaPostParser already exists)
 *   - Fusion .f3d: KiloFusionFileParserEngine.parseFusionFile (kilo iter3)
 *   - Inventor .ipt/.iam: APS Model Derivative job → STEP → STEP parser
 */
function decodeProgram(absPath, partId, system) {
  const stat = fs.statSync(absPath);
  return {
    part_id: partId,
    program_path: absPath.replace(/\\/g, "/"),
    system,
    features: [
      {
        feature_id: `${partId}_placeholder_f1`,
        feature_type: "placeholder_pending_real_decoder",
      },
    ],
    operations: [
      {
        op_id: `${partId}_placeholder_op1`,
        strategy: "placeholder_pending_real_decoder",
      },
    ],
    file_size_bytes: stat.size,
    mtime_iso: stat.mtime.toISOString(),
    decoder_status: "shallow_wire_up_only",
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.manifest)) {
    process.stderr.write(`[cam-training-extract] FATAL: manifest not found: ${args.manifest}\n`);
    process.exit(2);
  }
  const manifest = JSON.parse(fs.readFileSync(args.manifest, "utf8"));
  const parts = manifest.parts ?? [];
  if (parts.length === 0) {
    process.stderr.write(`[cam-training-extract] FATAL: manifest has 0 parts\n`);
    process.exit(2);
  }

  const filterSystems = args.systems ? new Set(args.systems) : null;
  const programs = [];
  const partsWithoutMatch = [];

  for (const part of parts) {
    if (args.limit > 0 && programs.length >= args.limit) break;
    if (part.program_count === 0) continue;

    const partDir = part.dir_path;
    let chosenFile = null;
    let chosenSystem = null;
    // Recurse: programs may live in subdirs (per partlib structure).
    // Bounded by per-part program_count + first-match short-circuit.
    function findProgramRecursive(dir, depth = 0) {
      if (chosenFile || depth > 6) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (chosenFile) return;
        const full = path.join(dir, e.name);
        if (e.isFile()) {
          const sys = systemForFile(full);
          if (sys && (!filterSystems || filterSystems.has(sys))) {
            chosenFile = full;
            chosenSystem = sys;
            return;
          }
        } else if (e.isDirectory() && !e.isSymbolicLink()) {
          findProgramRecursive(full, depth + 1);
        }
      }
    }
    findProgramRecursive(partDir);
    if (!chosenFile || !chosenSystem) {
      partsWithoutMatch.push(part.part_number);
      continue;
    }
    try {
      programs.push(decodeProgram(chosenFile, part.part_number, chosenSystem));
    } catch (e) {
      process.stderr.write(`[cam-training-extract] decode FAIL for ${chosenFile}: ${e.message}\n`);
    }
  }

  const perSystemCounts = {};
  for (const p of programs) {
    perSystemCounts[p.system] = (perSystemCounts[p.system] ?? 0) + 1;
  }

  const outDir = path.dirname(args.out);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify({
    schemaVersion: "1.0.0",
    generator: "scripts/extract-cam-training-corpus.mjs",
    generated_at: new Date().toISOString(),
    args_used: {
      manifest: args.manifest,
      limit: args.limit || null,
      systems: args.systems,
    },
    programs,
    summary: {
      total_programs: programs.length,
      per_system_counts: perSystemCounts,
      parts_in_manifest: parts.length,
      parts_with_programs: parts.filter((p) => p.program_count > 0).length,
      parts_filtered_out: partsWithoutMatch.length,
    },
    advisoryOnly: true,
    mustHumanVerify: true,
    purpose: "Wire-up demo for CAM-program training tuple extraction. ALL rows use placeholder features/ops — real per-format decoders pending. Feed the `programs` array into KiloCamProgramTrainingEngine.buildTrainingDataset() once decoders ship.",
  }, null, 2));

  process.stdout.write(JSON.stringify({
    ok: true,
    out: args.out,
    parts_in_manifest: parts.length,
    parts_with_programs: parts.filter((p) => p.program_count > 0).length,
    programs_emitted: programs.length,
    per_system_counts: perSystemCounts,
    parts_filtered_out: partsWithoutMatch.length,
  }) + "\n");
}

const __invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (__invokedPath && (
    import.meta.url === `file://${__invokedPath}` ||
    import.meta.url === `file:///${__invokedPath}` ||
    import.meta.url.endsWith(__invokedPath))) {
  try { main(); }
  catch (e) { process.stderr.write(`[cam-training-extract] FATAL: ${e?.stack || e}\n`); process.exit(2); }
}

export { parseArgs, systemForFile, decodeProgram, EXT_TO_SYSTEM };
