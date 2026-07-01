#!/usr/bin/env tsx
/**
 * knowledge-injection-pipeline.ts — CLI runner for the Knowledge Injection
 * Pipeline (KNOWLEDGE-CONVERSION-MS0/U-KIP02).
 *
 * Reads the COURSE-DATA-ROUTING-LEDGER (the routed-knowledge inventory),
 * runs each routed asset through `KnowledgeInjectionPipelineEngine`, and
 * — by default — reports what WOULD be injected without writing anything.
 *
 * The engine does the work; this CLI is the thin operator surface.
 *
 *   tsx knowledge-injection-pipeline.ts                  # dry-run report
 *   tsx knowledge-injection-pipeline.ts --apply           # write bindings (capped)
 *   tsx knowledge-injection-pipeline.ts --apply --limit N # cap the apply batch
 *   tsx knowledge-injection-pipeline.ts --feedback        # closed-loop metric only
 *   tsx knowledge-injection-pipeline.ts --json            # machine-readable
 *
 * `--apply` is operator-gated and capped (default 20) — injecting all ~110
 * eligible assets writes ~220 binding files, which should be a deliberate
 * batched decision, not a single unbounded run.
 *
 * @module scripts/knowledge-injection-pipeline
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  knowledgeInjectionPipelineEngine as kip,
  type RoutedAsset,
} from "../src/engines/KnowledgeInjectionPipelineEngine.js";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const ROUTING_LEDGER = resolve(REPO_ROOT, "state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json");
const DEFAULT_APPLY_CAP = 20;

interface Args {
  apply: boolean;
  feedback: boolean;
  json: boolean;
  limit: number;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { apply: false, feedback: false, json: false, limit: DEFAULT_APPLY_CAP };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--feedback") out.feedback = true;
    else if (a === "--json") out.json = true;
    else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) {
        console.error(`--limit must be a positive integer (got ${argv[i]})`);
        process.exit(2);
      }
      out.limit = n;
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: knowledge-injection-pipeline.ts [--apply] [--limit N] [--feedback] [--json]");
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

/** Flatten the routing ledger's items[].decisions[] into RoutedAsset[]. */
function readRoutedAssets(): RoutedAsset[] {
  if (!existsSync(ROUTING_LEDGER)) {
    console.error(`ERROR: routing ledger not found: ${ROUTING_LEDGER}`);
    console.error("Run: node scripts/course-data-router.mjs");
    process.exit(3);
  }
  const ledger = JSON.parse(readFileSync(ROUTING_LEDGER, "utf8"));
  const assets: RoutedAsset[] = [];
  for (const item of ledger.items ?? []) {
    for (const dec of item.decisions ?? []) {
      assets.push({
        kind: dec.kind, name: dec.name, courseId: dec.courseId,
        domains: dec.domains, mfgRelevance: dec.mfgRelevance,
        targetNodeType: dec.targetNodeType, targetSurface: dec.targetSurface,
        decision: dec.decision, lane: dec.lane, recommendedAction: dec.recommendedAction,
      });
    }
  }
  return assets;
}

function main(): void {
  const args = parseArgs(process.argv);
  const roots = { repoRoot: REPO_ROOT };

  // --feedback: closed-loop metric only, no planning.
  if (args.feedback) {
    const fb = kip.feedbackSummary(roots);
    if (args.json) {
      process.stdout.write(JSON.stringify(fb, null, 2) + "\n");
      return;
    }
    console.log("Knowledge Injection — closed-loop feedback");
    console.log(`  injected:     ${fb.injected}`);
    console.log(`  consumed:     ${fb.consumed}  (consume-rate ${(fb.consumeRate * 100).toFixed(1)}%)`);
    console.log(`  helped:       ${fb.helped}  (help-rate ${(fb.helpRate * 100).toFixed(1)}%)`);
    console.log(`  orphans:      ${fb.orphanInjections.length} injected-but-unconsumed`);
    for (const [lane, m] of Object.entries(fb.byLane)) {
      console.log(`  lane ${lane}: injected ${m.injected} · consumed ${m.consumed} · helped ${m.helped}`);
    }
    return;
  }

  const assets = readRoutedAssets();
  const plans = assets.map((a) => kip.plan(a));
  const eligible = plans.filter((p) => p.eligible);
  const ineligible = plans.length - eligible.length;

  const byLane: Record<string, number> = {};
  for (const p of eligible) byLane[p.lane] = (byLane[p.lane] ?? 0) + 1;

  if (!args.apply) {
    // dry-run report
    if (args.json) {
      process.stdout.write(JSON.stringify({
        mode: "dry-run", total: plans.length, eligible: eligible.length, ineligible, byLane,
        plans: eligible.map((p) => ({ injectionId: p.injectionId, kind: p.asset.kind, name: p.asset.name, lane: p.lane, target: p.injectionTarget })),
      }, null, 2) + "\n");
      return;
    }
    console.log("Knowledge Injection Pipeline — DRY RUN (no writes)");
    console.log(`  routed assets:   ${plans.length}`);
    console.log(`  injection-eligible: ${eligible.length}`);
    console.log(`  ineligible (DISCARD/none): ${ineligible}`);
    for (const [lane, n] of Object.entries(byLane)) console.log(`    lane ${lane}: ${n}`);
    console.log(`\n  Each eligible asset → 3 consumer-bindings (prism-os · obsidian · prism-ai).`);
    console.log(`  To apply (capped at ${args.limit}): --apply [--limit N]`);
    return;
  }

  // --apply: execute injections, capped.
  const batch = eligible.slice(0, args.limit);
  let written = 0;
  let skipped = 0;
  let failed = 0;
  for (const p of batch) {
    const result = kip.executeInjection(p, roots);
    kip.recordInjection(p, result, roots);
    written += result.written.length;
    skipped += result.skipped.length;
    if (!result.ok) failed += 1;
  }
  const fb = kip.feedbackSummary(roots);
  if (args.json) {
    process.stdout.write(JSON.stringify({
      mode: "apply", batchSize: batch.length, bindingsWritten: written,
      bindingsSkipped: skipped, failed, feedback: fb,
    }, null, 2) + "\n");
    return;
  }
  console.log("Knowledge Injection Pipeline — APPLIED");
  console.log(`  injected this run:  ${batch.length} assets (cap ${args.limit})`);
  console.log(`  bindings written:   ${written}`);
  console.log(`  bindings skipped:   ${skipped} (idempotent — already present)`);
  console.log(`  failed:             ${failed}`);
  console.log(`  ledger total injected: ${fb.injected} · consumed ${fb.consumed} · helped ${fb.helped}`);
  if (eligible.length > batch.length) {
    console.log(`\n  ${eligible.length - batch.length} eligible assets remain — re-run --apply to continue.`);
  }
}

main();
