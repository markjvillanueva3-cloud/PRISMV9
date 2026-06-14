#!/usr/bin/env node
// HERMES-MS1 — CLI orchestrator for the closed learning loop.
//
// Reads state/shared/skill-candidates.jsonl, clusters, gates, ships AUTO-PASS
// candidates as STAGING marker files under state/shared/specs/ (G5 gap-audit
// fix 2026-05-20 — was previously .claude/commands/, which published stubs as
// live skills), surfaces NEEDS-REVIEW for operator-dispatched reviewer-subagent
// review.
//
// Usage:
//   node scripts/skill-loop-run.mjs                 # dry-run (default — never writes)
//   node scripts/skill-loop-run.mjs --apply         # actually write AUTO-PASS drafts
//   node scripts/skill-loop-run.mjs --threshold 3   # lower the cluster threshold
//   node scripts/skill-loop-run.mjs --json          # JSON report instead of MD
//
// Safety:
//   - DEFAULT IS DRY-RUN — no writes happen without explicit --apply.
//   - Existing draft files at the target path are NEVER overwritten (idempotent).
//   - All AUTO-PASS ships are appended to state/shared/skill-loop-verdicts.jsonl
//     for audit; NEEDS-REVIEW emits the reviewer prompt to stdout for operator
//     dispatch via Agent tool.

import fs from "node:fs";
import path from "node:path";
import {
  clusterCandidates,
  buildStubBody,
  gateCandidate,
  buildReviewerPrompt,
  shipDraft,
} from "./lib/skill-loop-pipeline.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const LEDGER = path.join(PRISM_ROOT, "state/shared/skill-candidates.jsonl");
const VERDICTS_LOG = path.join(PRISM_ROOT, "state/shared/skill-loop-verdicts.jsonl");
const COMMANDS_DIR = path.join(PRISM_ROOT, ".claude/commands");
const SPECS_DIR = path.join(PRISM_ROOT, "state/shared/specs");

function parseArgs(argv) {
  const out = { apply: false, json: false, threshold: 5 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--json") out.json = true;
    else if (a === "--threshold" && argv[i + 1]) { out.threshold = Number(argv[++i]) || 5; }
  }
  return out;
}

function readLedgerLines() {
  try { return fs.readFileSync(LEDGER, "utf8").split("\n"); }
  catch { return []; }
}

function listExistingSkills() {
  // .claude/commands/ is gitignored / local-only. List basenames if present.
  try {
    return new Set(
      fs.readdirSync(COMMANDS_DIR)
        .filter(n => n.endsWith(".md"))
        .map(n => n.replace(/\.md$/, ""))
    );
  } catch { return new Set(); }
}

function appendVerdict(record) {
  try {
    fs.mkdirSync(path.dirname(VERDICTS_LOG), { recursive: true });
    fs.appendFileSync(VERDICTS_LOG, JSON.stringify(record) + "\n");
  } catch {}
}

function writeStubSpec(cluster, body) {
  // Always-safe: spec file lives under state/shared/specs/, idempotent skip if exists.
  const p = path.join(SPECS_DIR, `SKILL-CANDIDATE-${cluster.id}.md`);
  try {
    if (fs.existsSync(p)) return { wrote: false, path: p, reason: "exists" };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
    return { wrote: true, path: p };
  } catch (e) {
    return { wrote: false, path: p, reason: `write-error:${e.message}` };
  }
}

function shipperWriter(p, body) {
  if (fs.existsSync(p)) throw new Error("draft-exists-no-overwrite");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}

function main() {
  const opts = parseArgs(process.argv);
  const lines = readLedgerLines();
  const existing = listExistingSkills();
  const clusters = clusterCandidates(lines, { threshold: opts.threshold });
  const now = new Date().toISOString();

  const report = {
    ranAt: now,
    apply: opts.apply,
    threshold: opts.threshold,
    ledgerLines: lines.length,
    clusters: clusters.length,
    autoPass: 0,
    autoFail: 0,
    needsReview: 0,
    shipped: [],
    needsReviewPrompts: [],
    failed: [],
  };

  for (const cluster of clusters) {
    const stub = buildStubBody(cluster, { now });
    const specWrite = writeStubSpec(cluster, stub);
    const verdict = gateCandidate(cluster, existing);
    const audit = { at: now, cluster: cluster.id, verdict };

    if (verdict.verdict === "AUTO-PASS") {
      report.autoPass++;
      if (opts.apply) {
        const r = shipDraft(cluster, verdict, {
          // G5 gap-audit fix 2026-05-20: ship to a staging marker, NOT
          // .claude/commands/. AUTO-PASS now signals "ready for operator
          // promote" — the operator-promote step writes the live skill
          // after a real body is authored.
          stagingDir: SPECS_DIR,
          body: stub,
          writer: shipperWriter,
        });
        audit.ship = r;
        if (r.shipped) report.shipped.push({ id: cluster.id, path: r.path });
        else report.failed.push({ id: cluster.id, reason: r.reason });
      } else {
        report.shipped.push({ id: cluster.id, path: `(dry-run: would write to ${SPECS_DIR}/SKILL-CANDIDATE-AUTOPASS-${cluster.id}.md)` });
      }
    } else if (verdict.verdict === "AUTO-FAIL") {
      report.autoFail++;
      report.failed.push({ id: cluster.id, reason: verdict.reason });
    } else {
      report.needsReview++;
      report.needsReviewPrompts.push({
        id: cluster.id,
        prompt: buildReviewerPrompt(cluster, stub),
      });
    }
    audit.spec = specWrite;
    appendVerdict(audit);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }

  const lines2 = [
    `# HERMES-MS1 skill-loop run @ ${now}`,
    ``,
    `- ledger lines: ${report.ledgerLines}`,
    `- clusters at threshold ${opts.threshold}: ${report.clusters}`,
    `- AUTO-PASS: ${report.autoPass}  ${opts.apply ? "(applied)" : "(dry-run)"}`,
    `- AUTO-FAIL: ${report.autoFail}`,
    `- NEEDS-REVIEW: ${report.needsReview}`,
    ``,
  ];
  if (report.shipped.length > 0) {
    lines2.push(`## Shipped / would-ship`);
    for (const s of report.shipped) lines2.push(`- ${s.id} → ${s.path}`);
    lines2.push(``);
  }
  if (report.needsReviewPrompts.length > 0) {
    lines2.push(`## NEEDS-REVIEW — dispatch reviewer subagent per cluster`);
    for (const r of report.needsReviewPrompts) {
      lines2.push(`### ${r.id}`);
      lines2.push("```");
      lines2.push(r.prompt);
      lines2.push("```");
    }
  }
  if (report.failed.length > 0) {
    lines2.push(`## AUTO-FAIL`);
    for (const f of report.failed) lines2.push(`- ${f.id}: ${f.reason}`);
  }
  process.stdout.write(lines2.join("\n") + "\n");
}

main();
