#!/usr/bin/env node
/**
 * Smoke harness — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0/U-WCTP-A2-DSB-SMOKE (slot:mike)
 *
 * Builds the WEDM LoRA dataset from the LIVE JM Die archive (H:/PRISM/JM DIE/WIRE EDM)
 * to prove the engine works on real-world data. Caps at 50 programs for fast feedback;
 * full builds run via wedm_lora_dataset_build dispatcher action with no cap.
 *
 * Usage:
 *   node mcp-server/scripts/run-wedm-lora-dataset-smoke.mjs [--max=N] [--out=DIR]
 *
 * Exits 0 on success, 1 on build failure or zero examples generated.
 */

// Run via `npx tsx scripts/run-wedm-lora-dataset-smoke.mjs` — tsx resolves .ts.
// .js extension here is the ESM module-resolver convention; tsx maps to .ts source.
import { wedmLoRADatasetBuilderEngine } from "../src/engines/WEDMLoRADatasetBuilderEngine.ts";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? "true"] : [a, "true"];
  }),
);
const maxPrograms = Number(args.max ?? 50);
const outDir = args.out ?? "H:/prism/mcp-server/data/wedm-lora-smoke-out";

console.log(`[smoke] WEDM LoRA dataset builder · maxPrograms=${maxPrograms} · outDir=${outDir}`);
const t0 = Date.now();
const result = await wedmLoRADatasetBuilderEngine.build({
  basePath: "H:/PRISM/JM DIE/WIRE EDM",
  maxPrograms,
  outDir,
});
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[smoke] build complete in ${elapsed}s`);
console.log(`[smoke] success=${result.success} errors=${result.errors.length} warnings=${result.warnings.length}`);
console.log(`[smoke] stats:`, JSON.stringify(result.stats, null, 2));
if (result.train_path) console.log(`[smoke] train: ${result.train_path}`);
if (result.val_path) console.log(`[smoke] val:   ${result.val_path}`);
if (result.test_path) console.log(`[smoke] test:  ${result.test_path}`);
if (result.errors.length > 0) {
  console.error(`[smoke] FAIL — errors:`, result.errors);
  process.exit(1);
}
if (result.stats.examples_generated === 0) {
  console.error(`[smoke] FAIL — zero examples generated from live archive (programs_scanned=${result.stats.total_programs_scanned})`);
  process.exit(1);
}
console.log(`[smoke] PASS — generated ${result.stats.examples_generated} examples from ${result.stats.valid_programs} programs`);
process.exit(0);
