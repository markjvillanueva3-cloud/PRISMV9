#!/usr/bin/env node
/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U03 — ingest-plans-trajectories driver.
 *
 * Walks plan directories (default ~/.claude/plans), parses each markdown
 * file via PlanTrajectoryExtractorEngine, writes the structured records
 * to JSON (one file = one trajectory) and an aggregated summary.
 *
 * Usage:
 *   node scripts/ingest-plans-trajectories.mjs \
 *     [--plans-dir "C:/Users/wompu/.claude/plans"] \
 *     [--out-dir "H:/prism/state/shared/trajectories"] \
 *     [--summary-out "H:/prism/state/shared/PLAN_TRAJECTORIES_SUMMARY.md"] \
 *     [--no-write]
 *
 * Output (stdout): JSON summary { ok, totalPlans, byStatus, ... }.
 *
 * @module scripts/ingest-plans-trajectories
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as os from "node:os";

const DEFAULT_PLANS_DIR = path.join(os.homedir(), ".claude", "plans");

function parseArgs(argv) {
  const out = {
    plansDir: DEFAULT_PLANS_DIR,
    outDir: "H:/prism/state/shared/trajectories",
    summaryOut: "H:/prism/state/shared/PLAN_TRAJECTORIES_SUMMARY.md",
    noWrite: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--plans-dir") out.plansDir = argv[++i] ?? out.plansDir;
    else if (a === "--out-dir") out.outDir = argv[++i] ?? out.outDir;
    else if (a === "--summary-out") out.summaryOut = argv[++i] ?? out.summaryOut;
    else if (a === "--no-write") out.noWrite = true;
  }
  return out;
}

function listPlanFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
    .map((e) => path.join(dir, e.name));
}

function renderSummaryMarkdown(summary, errors) {
  const lines = [
    "# Plan Trajectories Inventory",
    "",
    `**Total plans:** ${summary.totalPlans}`,
    `**Total decisions:** ${summary.totalDecisions}`,
    `**Total milestones:** ${summary.totalMilestones}`,
    `**Errors:** ${errors.length}`,
    "",
    "## Status distribution",
    "",
  ];
  for (const [k, v] of Object.entries(summary.byStatus)) {
    lines.push(`- **${k}**: ${v}`);
  }
  lines.push("", "## Decisions by kind", "");
  for (const [k, v] of Object.entries(summary.decisionsByKind)) {
    lines.push(`- **${k}**: ${v}`);
  }
  lines.push("", "## Milestones by state", "");
  for (const [k, v] of Object.entries(summary.milestonesByState)) {
    lines.push(`- **${k}**: ${v}`);
  }
  if (errors.length > 0) {
    lines.push("", "## Errors", "");
    for (const e of errors.slice(0, 50)) {
      lines.push(`- \`${e.path}\`: ${e.error}`);
    }
    if (errors.length > 50) lines.push(`- … (${errors.length - 50} more truncated)`);
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "engines", "PlanTrajectoryExtractorEngine.js");
  if (!fs.existsSync(distPath)) {
    console.log(JSON.stringify({
      ok: false,
      error: "engine-not-built",
      message: `PlanTrajectoryExtractorEngine compiled artifact not found at ${distPath}. Run npm run build:fast first.`,
    }, null, 2));
    process.exit(2);
  }
  const { planTrajectoryExtractorEngine } = await import(pathToFileURL(distPath).href);

  const planFiles = listPlanFiles(args.plansDir);
  const trajectories = [];
  const errors = [];
  for (const filepath of planFiles) {
    let raw = "";
    try { raw = fs.readFileSync(filepath, "utf-8"); }
    catch (err) {
      errors.push({ path: filepath, error: `read: ${String(err?.message ?? err).slice(0, 200)}` });
      continue;
    }
    let traj;
    try { traj = planTrajectoryExtractorEngine.parsePlan(raw, filepath); }
    catch (err) {
      errors.push({ path: filepath, error: `parse: ${String(err?.message ?? err).slice(0, 200)}` });
      continue;
    }
    trajectories.push(traj);
  }
  const summary = planTrajectoryExtractorEngine.summarize(trajectories);

  if (!args.noWrite && trajectories.length > 0) {
    try {
      fs.mkdirSync(args.outDir, { recursive: true });
      for (const t of trajectories) {
        const outPath = path.join(args.outDir, `${t.id}.json`);
        fs.writeFileSync(outPath, JSON.stringify(t, null, 2));
      }
      fs.mkdirSync(path.dirname(args.summaryOut), { recursive: true });
      fs.writeFileSync(args.summaryOut, renderSummaryMarkdown(summary, errors));
    } catch (err) {
      errors.push({ path: "(output)", error: `write: ${String(err?.message ?? err).slice(0, 200)}` });
    }
  }

  const ok = errors.length === 0;
  console.log(JSON.stringify({
    ok,
    plans_dir: args.plansDir,
    files_found: planFiles.length,
    trajectories_extracted: trajectories.length,
    summary,
    errors: errors.slice(0, 20),
    error_count: errors.length,
    outputs: args.noWrite ? "(--no-write set)" : { trajectoriesDir: args.outDir, summaryPath: args.summaryOut },
  }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    error: "unhandled",
    message: String(err?.message ?? err),
    stack: String(err?.stack ?? "").slice(0, 2000),
  }, null, 2));
  process.exit(1);
});
