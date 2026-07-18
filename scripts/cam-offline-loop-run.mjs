#!/usr/bin/env node
/**
 * cam-offline-loop-run.mjs — RUN the offline CAM closed loop over real JM .MIN corpus programs.
 * The first genuine loop execution that needs NO live Fusion: for each sampled corpus program,
 * normalize JM's actual op sequence, run PRISM's planner over the SAME families, and score
 * generation vs reality with the oracle — then aggregate into a self-improvement report.
 *
 * HONEST SCOPE (R12): the planner is fed JM's op FAMILIES (feature->op SELECTION from geometry is
 * the still-unbuilt bigger piece — kilo's print-to-program pipeline), so op-COVERAGE is trivially
 * 1.0 here. The load-bearing signal is SEQUENCE FIDELITY — does PRISM's LATHE_OP_ORDER reproduce
 * JM's real operation ordering? Sequence inversions are the learn-targets for the ordering model.
 * Coverage becomes a real signal later, once feature-driven op-selection exists (same oracle/ledger).
 *
 *   node scripts/cam-offline-loop-run.mjs            # sample 50, write report + ledger
 *   node scripts/cam-offline-loop-run.mjs --n 200
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeMinToOps } from "./lib/cam-min-op-normalizer.mjs";
import { buildLoopOutcome, aggregateLoopOutcomes } from "./lib/cam-offline-loop.mjs";
import { planPartProgramFromDefaults } from "./lib/cam-part-program-planner.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILELIST = resolve(__dirname, "../state/shared/cam-drive/corpus-notes/_filelist.txt");
const OUT_DIR = resolve(__dirname, "../state/shared/cam-drive");
const LEDGER = resolve(OUT_DIR, "cam-offline-loop-outcomes.jsonl");
const REPORT_JSON = resolve(OUT_DIR, "CAM-OFFLINE-LOOP-REPORT.json");
const REPORT_MD = resolve(OUT_DIR, "CAM-OFFLINE-LOOP-REPORT.md");

function argN(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
}
const N = argN("--n", 50);

function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, path);
}

function main() {
  if (!existsSync(FILELIST)) {
    console.error(`corpus file list absent (${FILELIST}) — cannot run the loop on this machine. Regenerate the corpus enumeration first.`);
    process.exit(2);
  }
  const paths = readFileSync(FILELIST, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const step = Math.max(1, Math.floor(paths.length / N));
  const sample = [];
  for (let i = 0; i < paths.length && sample.length < N; i += step) sample.push(paths[i]);

  // Stamp the run timestamp ONCE here (CLI, real clock allowed); pass it into pure builders.
  const runIso = new Date().toISOString();
  const outcomes = [];
  let read = 0, skippedNoOps = 0, skippedUnreadable = 0;

  for (const p of sample) {
    let text;
    try { text = readFileSync(p, "utf8"); } catch { skippedUnreadable++; continue; }
    read++;
    const norm = normalizeMinToOps(text);
    if (norm.opCount === 0) { skippedNoOps++; continue; }

    const partId = p.split(/[\\/]/).pop();
    // Feed PRISM's planner the SAME families JM used (op-selection-from-geometry is not yet built).
    const part = { partNumber: partId, material_iso_group: null, operations: norm.ops.map((o) => ({ family: o.family })) };
    let generated;
    try {
      generated = planPartProgramFromDefaults(part);
    } catch (e) {
      skippedNoOps++; // a family with no matrix template -> planner throws; count as skip, log once
      continue;
    }
    // PRISM's INTENDED order = ops sorted by LATHE_OP_ORDER rank. The planner annotates order_rank
    // but preserves input order BY DESIGN (advisory), so we sort here to get PRISM's canonical plan
    // and compare THAT to JM's actual order — otherwise (feeding JM's order) the test is trivial.
    const prismOrdered = { ...generated, ordered_ops: [...generated.ordered_ops].sort((a, b) => (a.order_rank ?? 50) - (b.order_rank ?? 50)) };
    const reference = { ops: norm.ops.map((o) => ({ family: o.family })), partId };
    outcomes.push(buildLoopOutcome(partId, prismOrdered, reference, runIso));
  }

  const agg = aggregateLoopOutcomes(outcomes);
  const meanSeq = outcomes.length ? Number((outcomes.reduce((s, o) => s + o.sequence_fidelity, 0) / outcomes.length).toFixed(4)) : 0;
  // sequence-inversion learn signal: programs whose generated order != JM order
  const inversions = outcomes.filter((o) => o.sequence_fidelity < 1).length;

  const report = {
    schemaVersion: "1.0.0",
    kind: "cam_offline_loop_report",
    runIso,
    corpus_total: paths.length,
    sampled: sample.length,
    scored: outcomes.length,
    read, skippedNoOps, skippedUnreadable,
    mean_score: agg.mean_score,
    mean_op_coverage: agg.mean_coverage, // ~1.0 by construction (families fed) — see scope note
    mean_sequence_fidelity: meanSeq,     // THE load-bearing signal
    sequence_inversions: inversions,
    top_missing_families: agg.top_missing,   // expected ~empty (families fed)
    top_extra_families: agg.top_extra,       // planner-added families JM omitted (rare)
    scope_note: "op-coverage is trivially ~1.0 (planner fed JM's families; feature->op selection not yet built). The real signal is mean_sequence_fidelity — PRISM LATHE_OP_ORDER vs JM real ordering. Inversions => refine LATHE_OP_ORDER.",
  };

  atomicWrite(REPORT_JSON, JSON.stringify(report, null, 2) + "\n");
  // append outcomes to the durable ledger (the cam.jsonl-style training shard the consumer reads)
  mkdirSync(dirname(LEDGER), { recursive: true });
  for (const o of outcomes) appendFileSync(LEDGER, JSON.stringify(o) + "\n", "utf8");

  const md = [
    "# CAM Offline Closed-Loop Report",
    "",
    `**Run:** ${runIso} · **corpus:** ${paths.length} programs · **sampled:** ${sample.length} · **scored:** ${outcomes.length}`,
    "",
    "> Offline loop: normalize JM .MIN op sequence -> PRISM planner over the same families -> oracle score. NO live Fusion.",
    "> **Scope (R12):** op-coverage is ~1.0 by construction (planner fed JM's families; feature->op selection unbuilt). The real signal is **sequence fidelity** = does PRISM `LATHE_OP_ORDER` reproduce JM's real ordering.",
    "",
    "## Signal",
    `- **mean sequence fidelity: ${meanSeq}** (1.0 = PRISM ordering matches JM exactly)`,
    `- sequence inversions: ${inversions}/${outcomes.length} programs`,
    `- mean score (0.7*coverage + 0.3*seq): ${agg.mean_score}`,
    `- read ${read} · skipped(no-ops) ${skippedNoOps} · skipped(unreadable) ${skippedUnreadable}`,
    "",
    "## Learn targets",
    `- top extra families (planner added, JM omitted): ${agg.top_extra.length ? agg.top_extra.map(([f, c]) => `${f}(${c})`).join(", ") : "none"}`,
    `- top missing families (JM used, planner omitted): ${agg.top_missing.length ? agg.top_missing.map(([f, c]) => `${f}(${c})`).join(", ") : "none (expected — families fed)"}`,
    "",
    `_Ledger: cam-offline-loop-outcomes.jsonl (${outcomes.length} outcomes appended). Oracle: scripts/lib/cam-offline-loop.mjs. Normalizer: scripts/lib/cam-min-op-normalizer.mjs._`,
  ].join("\n");
  atomicWrite(REPORT_MD, md + "\n");

  console.log(`offline loop run: scored ${outcomes.length}/${sample.length} sampled (corpus ${paths.length}).`);
  console.log(`  mean sequence fidelity = ${meanSeq} · inversions ${inversions}/${outcomes.length} · mean score ${agg.mean_score}`);
  console.log(`  report -> ${REPORT_MD}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
