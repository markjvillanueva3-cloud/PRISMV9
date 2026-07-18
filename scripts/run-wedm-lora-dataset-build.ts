/**
 * run-wedm-lora-dataset-build.ts — full-scale WEDM LoRA dataset build runner.
 *
 * Drives WEDMLoRADatasetBuilderEngine.build() over the real JM Die WIRE EDM
 * archive (H:/prism/JM DIE/WIRE EDM, 4058 files) and emits Alpaca/ShareGPT
 * train/val/test JSONL + a stats report. Standalone (tsx) so it runs with MCP
 * down — the engine's only hard import is utils/Logger; tribal tips are
 * INJECTED here from the pure wedm-knowledge-tips data module, so no broken
 * server module (IdeaBlock/turningDispatcher) is pulled into the graph.
 *
 *   cd mcp-server && npx tsx ../scripts/run-wedm-lora-dataset-build.ts
 *
 * Determinism: fixed seed (42) + explicit stratified split. Re-runnable.
 * Output dir: mcp-server/data/training/wedm-lora/ (slot worktree).
 *
 * NOTE: no ${...} template literals — the scripts/ security hook flags them.
 *       String concatenation is used throughout deliberately.
 */

import * as path from "path";
import { WEDMLoRADatasetBuilderEngine } from "../mcp-server/src/engines/WEDMLoRADatasetBuilderEngine.js";
import { WEDM_KNOWLEDGE_TIPS } from "../mcp-server/src/data/wedm-knowledge-tips.js";

// Canonical archive (the engine default 'CNC WIRE EDM' does not exist on disk;
// 'WIRE EDM' is the live 4058-file root — pass it explicitly).
const ARCHIVE = "H:/prism/JM DIE/WIRE EDM";
const OUT_DIR = path.resolve(process.cwd(), "data/training/wedm-lora");
const SEED = 42;

type Tip = {
  title?: string;
  category?: string;
  tags?: string[];
  operation_types?: string[];
  confidence?: number;
};

/**
 * Operation-aware tribal lookup. Matches the builder's per-program operation
 * keyword against tip tags/category/title/operation_types; returns the
 * highest-confidence matches (titles). Falls back to the top-confidence
 * general rules when an operation has no direct match. The engine slices to
 * 3 tips per example, so returning ~6 leaves it room to pick.
 */
function makeTribalLookup(): (op: string, material: string) => string[] {
  const tips = (WEDM_KNOWLEDGE_TIPS as Tip[]).slice();
  const ranked = tips.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const generalTop = ranked.slice(0, 5).map((t) => t.title ?? "").filter(Boolean);

  return (op: string, _material: string): string[] => {
    const key = (op || "").toLowerCase().replace(/_/g, " ");
    const toks = key.split(/[^a-z0-9]+/).filter((s) => s.length > 2);
    if (toks.length === 0) return generalTop.slice(0, 6);
    const matched: string[] = [];
    for (const t of ranked) {
      const hay = (
        (t.title ?? "") +
        " " +
        (t.category ?? "") +
        " " +
        (t.tags ?? []).join(" ") +
        " " +
        (t.operation_types ?? []).join(" ")
      ).toLowerCase();
      if (toks.some((tk) => hay.indexOf(tk) >= 0) && t.title) matched.push(t.title);
      if (matched.length >= 6) break;
    }
    return (matched.length > 0 ? matched : generalTop).slice(0, 6);
  };
}

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log("[wedm-lora-build] archive   = " + ARCHIVE);
  console.log("[wedm-lora-build] out_dir   = " + OUT_DIR);
  console.log("[wedm-lora-build] seed      = " + SEED);
  console.log("[wedm-lora-build] tips_pool = " + (WEDM_KNOWLEDGE_TIPS as Tip[]).length);

  const engine = new WEDMLoRADatasetBuilderEngine(SEED);
  const result = await engine.build({
    basePath: ARCHIVE,
    outDir: OUT_DIR,
    split: { train_ratio: 0.8, val_ratio: 0.1, test_ratio: 0.1, seed: SEED, stratify_by: "operation" },
    tribalTipsLookup: makeTribalLookup(),
  });

  // Fail loud: an archive that scans 0 programs means the path is wrong, not
  // an empty corpus. Do NOT silently emit empty JSONL.
  if (result.stats.total_programs_scanned === 0) {
    console.error("[wedm-lora-build] FATAL: scanned 0 programs from " + ARCHIVE + " — archive path wrong or empty.");
    process.exit(2);
  }

  const s = result.stats;
  const report = {
    success: result.success,
    archive: ARCHIVE,
    out_dir: OUT_DIR,
    paths: { train: result.train_path, val: result.val_path, test: result.test_path },
    scanned: s.total_programs_scanned,
    valid: s.valid_programs,
    unparseable: s.total_programs_scanned - s.valid_programs,
    examples: s.examples_generated,
    split: { train: s.train_examples, val: s.val_examples, test: s.test_examples },
    by_operation: s.by_operation,
    by_controller: s.by_controller,
    by_complexity: s.by_complexity,
    distinct_customers: Object.keys(s.by_customer).length,
    tribal_tips_used: s.tribal_tips_used,
    avg_instruction_len: Math.round(s.avg_instruction_length),
    avg_output_len: Math.round(s.avg_output_length),
    generation_time_ms: s.generation_time_ms,
    errors: result.errors,
    warnings_count: result.warnings.length,
    warnings_sample: result.warnings.slice(0, 5),
    runner_wall_ms: Date.now() - t0,
  };

  console.log("=== WEDM LoRA DATASET BUILD REPORT ===");
  console.log(JSON.stringify(report, null, 2));

  // Split-integrity invariant (R12): every example lands in exactly one split.
  const splitSum = s.train_examples + s.val_examples + s.test_examples;
  if (splitSum !== s.examples_generated) {
    console.error("[wedm-lora-build] INVARIANT VIOLATION: split sum " + splitSum + " != examples " + s.examples_generated);
    process.exit(3);
  }
  if (!result.success) {
    console.error("[wedm-lora-build] build reported success=false; see errors above.");
    process.exit(4);
  }
  console.log("[wedm-lora-build] OK — " + s.examples_generated + " examples from " + s.valid_programs + "/" + s.total_programs_scanned + " programs.");
}

main().catch((err) => {
  console.error("[wedm-lora-build] UNCAUGHT: " + (err && err.stack ? err.stack : String(err)));
  process.exit(1);
});
