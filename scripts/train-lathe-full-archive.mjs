#!/usr/bin/env node
/**
 * train-lathe-full-archive.mjs — Lathe AI full-corpus training runner
 * ====================================================================
 *
 * Detached runner for `LatheFullArchiveTrainingEngine.trainFullArchive()`.
 * Walks the JM Die `CNC LATHE` corpus (~15K+ .MIN programs), runs the full
 * 5-phase pipeline (scan → parse → analyze → train → report), emits a
 * dashboard JSON + Markdown for operator review.
 *
 * Pipeline (per LatheFullArchiveTrainingEngine):
 *  1. Scan archive recursively for .MIN files
 *  2. Parse each program (LatheAITrainingEngine physics extraction)
 *  3. Run per-program analysis
 *  4. Train LatheDeepLearningIntelligenceEngine on the corpus
 *  5. Generate dashboard with per-customer + per-machine stats
 *
 * Usage (foreground):
 *   node H:/prism/scripts/train-lathe-full-archive.mjs [--max=N] [--epochs=N] [--out=<dir>]
 *
 * Usage (detached, recommended — multi-hour run):
 *   Start-Process -WindowStyle Hidden -FilePath "C:\Program Files\nodejs\node.exe" `
 *     -ArgumentList "H:/prism/scripts/train-lathe-full-archive.mjs --epochs=50" `
 *     -RedirectStandardOutput "H:/prism/state/shared/dashboards/lathe-archive-training-progress.log"
 *
 * Outputs:
 *   state/shared/dashboards/lathe-archive-training-dashboard.json    — full result
 *   state/shared/dashboards/lathe-archive-training-dashboard.md      — operator brief
 *   state/shared/dashboards/lathe-archive-training-progress.log      — stdout
 *
 * Goal: operator /goal (2026-05-25 whiskey iter23) "run full tests to train
 * lathe wizard nn, gnn, lora, deep learning, deep reasoning, ai systems.
 * utilize full jm die data and full prism capabilities".
 *
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-AI-TRAIN-RUNNER
 * @slot whiskey
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── CLI parse ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (k, dflt) => {
  const m = args.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : dflt;
};

const MAX_PROGRAMS = parseInt(arg("max", "0"), 10);   // 0 = unlimited
const EPOCHS = parseInt(arg("epochs", "50"), 10);
const OUT_DIR = arg(
  "out",
  join(dirname(fileURLToPath(import.meta.url)), "..", "state", "shared", "dashboards"),
);

mkdirSync(OUT_DIR, { recursive: true });
const dashboardJsonPath = join(OUT_DIR, "lathe-archive-training-dashboard.json");
const dashboardMdPath = join(OUT_DIR, "lathe-archive-training-dashboard.md");
const progressPath = join(OUT_DIR, "lathe-archive-training-progress.json");

// ── Header banner ────────────────────────────────────────────────────
const startedAt = new Date().toISOString();
console.log("=".repeat(72));
console.log("PRISM LATHE AI — FULL JM DIE ARCHIVE TRAINING");
console.log(`Started:  ${startedAt}`);
console.log(`Max:      ${MAX_PROGRAMS || "UNLIMITED"}`);
console.log(`Epochs:   ${EPOCHS}`);
console.log(`Out dir:  ${OUT_DIR}`);
console.log("=".repeat(72));

// Progress sidecar — operator can poll while detached run is in-flight
writeFileSync(
  progressPath,
  JSON.stringify(
    {
      schemaVersion: "1.0.0",
      status: "starting",
      pid: process.pid,
      startedAt,
      maxPrograms: MAX_PROGRAMS,
      epochs: EPOCHS,
    },
    null,
    2,
  ),
);

// ── Lazy-import the engine (tsx will compile on-the-fly) ─────────────
let LatheFullArchiveTrainingEngine;
let LatheDeepLearningEngine;
let LatheKinematicsDeepLearningEngine;
let LatheMetaLearningEngine;
let LatheSpeedFeedDeepLearningAdvisorEngine;
try {
  // Dynamic imports — built engine modules
  const built = await import("file:///" + join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "mcp-server",
    "dist",
    "engines",
    "LatheFullArchiveTrainingEngine.js",
  ));
  LatheFullArchiveTrainingEngine = built.LatheFullArchiveTrainingEngine ?? built.latheFullArchiveTrainingEngine;
} catch (e) {
  console.error("[FATAL] Could not import LatheFullArchiveTrainingEngine from dist/.");
  console.error("Run `cd H:/prism/mcp-server && npm run build` first.");
  console.error(`Underlying error: ${e?.message ?? e}`);
  writeFileSync(
    progressPath,
    JSON.stringify(
      {
        schemaVersion: "1.0.0",
        status: "failed",
        error: "engine-import-failed",
        message: String(e?.message ?? e),
        pid: process.pid,
        startedAt,
        failedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

// ── Construct + wire progress callback ───────────────────────────────
const engine =
  typeof LatheFullArchiveTrainingEngine === "function"
    ? new LatheFullArchiveTrainingEngine()
    : LatheFullArchiveTrainingEngine;

if (typeof engine.setProgressCallback === "function") {
  let lastWrite = 0;
  engine.setProgressCallback((progress) => {
    // Throttle progress writes to once-per-second to avoid disk thrash
    const now = Date.now();
    if (now - lastWrite < 1000) return;
    lastWrite = now;
    try {
      writeFileSync(
        progressPath,
        JSON.stringify(
          {
            schemaVersion: "1.0.0",
            status: "running",
            pid: process.pid,
            startedAt,
            updatedAt: new Date().toISOString(),
            ...progress,
          },
          null,
          2,
        ),
      );
    } catch {
      // Best-effort — never let progress-write kill the training run
    }
  });
}

// ── Run training ─────────────────────────────────────────────────────
let result;
try {
  console.log("[RUNNER] invoking trainFullArchive…");
  result = engine.trainFullArchive(MAX_PROGRAMS, EPOCHS);
} catch (e) {
  console.error("[FATAL] Training run threw:");
  console.error(e);
  writeFileSync(
    progressPath,
    JSON.stringify(
      {
        schemaVersion: "1.0.0",
        status: "failed",
        error: "training-threw",
        message: String(e?.message ?? e),
        stack: String(e?.stack ?? ""),
        pid: process.pid,
        startedAt,
        failedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(3);
}

const finishedAt = new Date().toISOString();
const elapsedMs = Date.parse(finishedAt) - Date.parse(startedAt);

// ── Write JSON dashboard ─────────────────────────────────────────────
const dashboard = {
  schemaVersion: "1.0.0",
  runner: "train-lathe-full-archive.mjs",
  milestone: "JM-DIE-LATHE-UPGRADE-MS0",
  unit: "U-LATHE-AI-TRAIN-RUNNER",
  slot: "whiskey",
  startedAt,
  finishedAt,
  elapsedMs,
  config: { maxPrograms: MAX_PROGRAMS, epochs: EPOCHS },
  result,
};
writeFileSync(dashboardJsonPath, JSON.stringify(dashboard, null, 2));

// ── Write Markdown brief ─────────────────────────────────────────────
const md = renderDashboardMd(dashboard);
writeFileSync(dashboardMdPath, md);

// ── Final progress sidecar update ────────────────────────────────────
writeFileSync(
  progressPath,
  JSON.stringify(
    {
      schemaVersion: "1.0.0",
      status: "done",
      pid: process.pid,
      startedAt,
      finishedAt,
      elapsedMs,
      programs_found: result?.total_programs_found ?? 0,
      programs_trained: result?.programs_trained ?? 0,
      avg_score: result?.avg_program_score ?? 0,
      dashboardJson: dashboardJsonPath,
      dashboardMd: dashboardMdPath,
    },
    null,
    2,
  ),
);

console.log("=".repeat(72));
console.log(`DONE in ${(elapsedMs / 1000).toFixed(1)}s`);
console.log(`Dashboard JSON: ${dashboardJsonPath}`);
console.log(`Dashboard MD:   ${dashboardMdPath}`);
console.log("=".repeat(72));
process.exit(0);

// ── Markdown rendering ───────────────────────────────────────────────
function renderDashboardMd(d) {
  const r = d.result ?? {};
  const lines = [];
  lines.push("# Lathe AI Full Archive Training — Dashboard");
  lines.push("");
  lines.push(`Milestone: \`${d.milestone}\` · Unit: \`${d.unit}\` · Slot: \`${d.slot}\``);
  lines.push(`Started: ${d.startedAt} → Finished: ${d.finishedAt} (${(d.elapsedMs / 1000).toFixed(1)}s)`);
  lines.push(`Config: max=${d.config.maxPrograms || "UNLIMITED"} · epochs=${d.config.epochs}`);
  lines.push("");
  lines.push("## Counts");
  lines.push(`- Programs found:    **${r.total_programs_found ?? 0}**`);
  lines.push(`- Programs parsed:   ${r.programs_parsed ?? 0}`);
  lines.push(`- Programs analyzed: ${r.programs_analyzed ?? 0}`);
  lines.push(`- Programs trained:  ${r.programs_trained ?? 0}`);
  lines.push(`- Parse errors:      ${r.parse_errors ?? 0}`);
  lines.push("");
  lines.push("## Timing");
  lines.push(`- Total time:           ${((r.total_time_ms ?? 0) / 1000).toFixed(1)}s`);
  lines.push(`- Avg time per program: ${(r.avg_time_per_program_ms ?? 0).toFixed(1)}ms`);
  lines.push("");
  lines.push("## Quality metrics");
  lines.push(`- Avg program score: ${(r.avg_program_score ?? 0).toFixed(2)}`);
  lines.push(`- Total issues found: ${r.total_issues_found ?? 0}`);
  if (Array.isArray(r.score_distribution)) {
    lines.push("");
    lines.push("### Score distribution");
    lines.push("| Range | Count |");
    lines.push("|---|---|");
    for (const s of r.score_distribution) lines.push(`| ${s.range} | ${s.count} |`);
  }
  lines.push("");
  lines.push("## Consumer (PSN downstream)");
  lines.push("- Lathe-wizard frontend (consume avg_program_score per customer for customer-quality KPI)");
  lines.push("- Lathe-studio (display per-machine score-distribution in machine card)");
  lines.push("- Business-mgmt (top-N issues drives customer-engagement priorities)");
  lines.push("- AI training pipelines: LatheDeepLearningIntelligenceEngine state persisted; next train resumes from this snapshot");
  lines.push("");
  lines.push(`Generated by \`scripts/train-lathe-full-archive.mjs\` PID ${process.pid}.`);
  return lines.join("\n");
}
