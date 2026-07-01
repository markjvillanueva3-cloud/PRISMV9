#!/usr/bin/env node
/**
 * compounding-gains-audit.mjs
 *
 * Audits a milestone (or the entire roadmap) for emitted reusable
 * dev-velocity artifacts. Implements the COMPOUNDING-GAINS LAW from
 * /rgs5 §S11.6 and /forge5 §6L.
 *
 * Acceptable emission classes (must be META — not the milestone's
 * primary deliverable):
 *   - Tools / scripts in H:/prism/.claude/scripts/ or H:/prism/scripts/
 *   - Skills in H:/.claude/commands/ or H:/prism/.claude/commands/
 *   - Hooks in H:/prism/.claude/hooks/ (wired in settings.json)
 *   - Digests in H:/prism/mcp-server/data/docs/
 *   - Wiki entries in H:/prism/knowledge/wiki/
 *   - Helpers in H:/prism/.claude/helpers/
 *
 * Sources of truth:
 *   - milestone envelope: mcp-server/data/milestones/<id>.json
 *   - git diff vs origin/main (for actual files emitted)
 *   - state/shared/compounding-gains-ledger.json (cumulative trajectory)
 *
 * Usage:
 *   node compounding-gains-audit.mjs --milestone <id>          # audit one
 *   node compounding-gains-audit.mjs --milestone <id> --apply  # write to ledger
 *   node compounding-gains-audit.mjs --all                     # full trajectory
 *   node compounding-gains-audit.mjs --proposals <id>          # propose artifacts (emit-tooling)
 *
 * Exit codes:
 *   0 — PASS (≥1 reusable artifact emitted)
 *   1 — BLOCK (zero artifacts; milestone not ready to close)
 *   2 — script error (missing inputs)
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const ENV_DIR = `${PRISM}/mcp-server/data/milestones`;
const LEDGER = `${PRISM}/state/shared/compounding-gains-ledger.json`;
const TRAJECTORY = `${PRISM}/state/shared/compounding-trajectory.json`;
const CANDIDATES_DOC = `${PRISM}/state/shared/COMPOUNDING-CANDIDATES.md`;

// Emission class roots (paths whose contents count as reusable artifacts)
const EMISSION_ROOTS = {
  scripts: [`${PRISM}/.claude/scripts`, `${PRISM}/scripts`],
  skills: [`H:/.claude/commands`, `${PRISM}/.claude/commands`],
  hooks: [`${PRISM}/.claude/hooks`, `H:/.claude/hooks`],
  digests: [`${PRISM}/mcp-server/data/docs`],
  wiki: [`${PRISM}/knowledge/wiki`],
  helpers: [`${PRISM}/.claude/helpers`],
};

// Time-saved estimate per artifact class (heuristic; replaceable with telemetry in v6)
const TIME_SAVED_MIN_PER_USE = {
  scripts: 5,    // a script that future milestones invoke saves ~5min per use
  skills: 8,     // a slash command saves ~8min (skill discovery + structured workflow)
  hooks: 12,     // a hook saves ~12min per fire (preventive blocks compound)
  digests: 3,    // a digest is consulted ~3min faster than re-derived search
  wiki: 2,       // wiki entry saves ~2min vs re-deriving from code
  helpers: 4,    // shared helper saves ~4min per consumer
};

// Estimated downstream uses per artifact class (heuristic)
const DOWNSTREAM_USES = {
  scripts: 8, skills: 6, hooks: 20, digests: 15, wiki: 10, helpers: 12,
};

function args() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return fb; }
}

function gitDiffNames(base = "origin/main") {
  const r = spawnSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8", cwd: PRISM, timeout: 8000,
  });
  if (r.status !== 0) return [];
  return (r.stdout || "").split("\n").filter(Boolean).map((p) => p.replace(/\\/g, "/"));
}

function classify(filePath) {
  const norm = filePath.replace(/\\/g, "/");
  for (const [cls, roots] of Object.entries(EMISSION_ROOTS)) {
    for (const r of roots) {
      const rNorm = r.replace(/\\/g, "/");
      if (norm.startsWith(rNorm) || norm.includes(rNorm.replace("H:/prism/", ""))) {
        return cls;
      }
    }
  }
  return null;
}

function isPrimaryDeliverable(env, filePath) {
  // A file is the milestone's primary deliverable if it's an engine the
  // milestone explicitly creates (per env.produces_node_ids or env.units[].title)
  if (!env) return false;
  const norm = filePath.replace(/\\/g, "/");
  if (norm.includes("/src/engines/")) return true;
  if ((env.produces_node_ids || []).some((id) => norm.includes(id.split(".").pop() || ""))) return true;
  if ((env.units || []).some((u) => (u.title || "").toLowerCase().includes(path.basename(filePath, path.extname(filePath)).toLowerCase()))) return true;
  return false;
}

function auditMilestone(milestoneId) {
  const envPath = path.join(ENV_DIR, `${milestoneId}.json`);
  const env = readJSON(envPath, null);
  if (!env) {
    console.error(`Milestone envelope not found: ${envPath}`);
    process.exit(2);
  }

  const changed = gitDiffNames();
  const emitted = { scripts: [], skills: [], hooks: [], digests: [], wiki: [], helpers: [] };
  const primary = [];

  for (const f of changed) {
    const cls = classify(f);
    if (!cls) continue;
    if (isPrimaryDeliverable(env, f)) {
      primary.push({ class: cls, path: f });
      continue;
    }
    emitted[cls].push(f);
  }

  const totalArtifacts = Object.values(emitted).reduce((s, arr) => s + arr.length, 0);
  const timeSavedEst = Object.entries(emitted).reduce((s, [cls, arr]) => {
    return s + arr.length * (TIME_SAVED_MIN_PER_USE[cls] || 0) * (DOWNSTREAM_USES[cls] || 1);
  }, 0);

  return {
    milestoneId,
    auditedAt: new Date().toISOString(),
    totalArtifacts,
    emitted,
    primaryDeliverables: primary,
    timeSavedEstMin: timeSavedEst,
    pass: totalArtifacts >= 1,
    blockers: totalArtifacts === 0 ? [{
      reason: "Zero reusable artifacts emitted",
      remedy: "Run /rgs5 emit-tooling <milestone-id> to propose 3+ candidate artifacts; pick one and add a unit for it.",
    }] : [],
  };
}

function appendLedger(audit) {
  const ledger = readJSON(LEDGER, { schemaVersion: "1.0.0", entries: [], cumulative: { artifacts: 0, timeSavedMin: 0 } });
  // Idempotent: replace prior entry for same milestone
  ledger.entries = (ledger.entries || []).filter((e) => e.milestoneId !== audit.milestoneId);
  ledger.entries.push(audit);
  ledger.cumulative = {
    artifacts: ledger.entries.reduce((s, e) => s + (e.totalArtifacts || 0), 0),
    timeSavedMin: ledger.entries.reduce((s, e) => s + (e.timeSavedEstMin || 0), 0),
  };
  ledger.cumulative.velocityRatchetPct = ledger.cumulative.timeSavedMin > 0
    ? Math.round((ledger.cumulative.timeSavedMin / (ledger.entries.length * 60)) * 100)
    : 0;
  ledger.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  return ledger;
}

function summarizeAll() {
  const ledger = readJSON(LEDGER, { entries: [], cumulative: {} });
  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    totalMilestones: (ledger.entries || []).length,
    totalArtifacts: ledger.cumulative?.artifacts || 0,
    totalTimeSavedMin: ledger.cumulative?.timeSavedMin || 0,
    velocityRatchetPct: ledger.cumulative?.velocityRatchetPct || 0,
    perMilestone: (ledger.entries || []).map((e) => ({
      milestoneId: e.milestoneId,
      artifacts: e.totalArtifacts,
      timeSavedMin: e.timeSavedEstMin,
      auditedAt: e.auditedAt,
    })),
    classBreakdown: {},
  };
  for (const cls of Object.keys(EMISSION_ROOTS)) {
    out.classBreakdown[cls] = (ledger.entries || []).reduce((s, e) => s + ((e.emitted?.[cls] || []).length), 0);
  }
  fs.writeFileSync(TRAJECTORY, JSON.stringify(out, null, 2));
  return out;
}

function emitProposals(milestoneId) {
  const envPath = path.join(ENV_DIR, `${milestoneId}.json`);
  const env = readJSON(envPath, null);
  if (!env) {
    console.error(`Milestone envelope not found: ${envPath}`);
    process.exit(2);
  }

  // Heuristic candidate generation based on milestone type
  const candidates = [];

  if (env.atomic_phase === 0) {
    candidates.push({
      class: "scripts",
      name: "envelope-drift-monitor.mjs",
      rationale: "Daemon that watches MILESTONE_PROGRESS.json and posts to chat bus when new drift appears. Prevents drift backlog buildup.",
    });
    candidates.push({
      class: "skills",
      name: "/drift-status",
      rationale: "Read-only quick-status for envelope drift; saves ~2min per check vs reading MILESTONE_PROGRESS.md.",
    });
  }
  if (env.atomic_phase === 2 || env.tier === 1) {
    candidates.push({
      class: "scripts",
      name: `wire-batch-${(env.title || "").toLowerCase().replace(/\W/g, "-").slice(0, 20)}.mjs`,
      rationale: "Batch wiring helper for this domain; future wiring milestones in same domain reuse the pattern.",
    });
    candidates.push({
      class: "digests",
      name: `${(env.consumes_node_ids?.[0] || "DOMAIN").toUpperCase()}_DIGEST.md`,
      rationale: "1-line catalog of all engines in this domain — accelerates next domain audit.",
    });
    candidates.push({
      class: "hooks",
      name: "wire-completeness-check.mjs",
      rationale: "PostToolUse hook that auto-verifies new engines are wired into ≥1 dispatcher before allowing commit.",
    });
  }
  if (env.atomic_phase === 3) {
    candidates.push({
      class: "skills",
      name: "/frontend-merge-checklist",
      rationale: "Standardized merge protocol for cqask/cadquery + future frontend merges.",
    });
    candidates.push({
      class: "scripts",
      name: "page-engine-coverage.mjs",
      rationale: "For each frontend page, list which engines it consumes. Catches dead-pixel risk.",
    });
  }
  // Always-applicable proposals
  candidates.push({
    class: "wiki",
    name: `wiki/lessons/${milestoneId.toLowerCase()}-lessons.md`,
    rationale: "Captures decisions + surprises from this milestone. Compounds into the wiki layer.",
  });
  candidates.push({
    class: "helpers",
    name: `${milestoneId.toLowerCase()}-shared.mjs`,
    rationale: "Shared utility module exporting any function this milestone created that 2+ other milestones could reuse.",
  });

  return {
    milestoneId,
    candidatesCount: candidates.length,
    candidates,
    note: "Pick at least 1, add as a unit to the milestone, then re-run audit.",
  };
}

const opts = args();

if (opts.proposals) {
  const props = emitProposals(opts.proposals);
  console.log(JSON.stringify(props, null, 2));
  process.exit(0);
}

if (opts.all) {
  const summary = summarizeAll();
  console.log("COMPOUNDING TRAJECTORY");
  console.log("======================");
  console.log(`Total milestones audited: ${summary.totalMilestones}`);
  console.log(`Total artifacts emitted:  ${summary.totalArtifacts}`);
  console.log(`Total time saved (est):   ${Math.round(summary.totalTimeSavedMin / 60)}h ${summary.totalTimeSavedMin % 60}min`);
  console.log(`Velocity ratchet:         +${summary.velocityRatchetPct}%`);
  console.log("");
  console.log("Per-class breakdown:");
  for (const [cls, count] of Object.entries(summary.classBreakdown)) {
    console.log(`  ${cls.padEnd(10)} ${count}`);
  }
  console.log("");
  console.log("Recent milestones:");
  for (const m of summary.perMilestone.slice(-10)) {
    console.log(`  ${m.milestoneId.padEnd(40)} ${m.artifacts} artifacts, ~${m.timeSavedMin}min saved`);
  }
  console.log("");
  console.log(`Trajectory written to: ${TRAJECTORY}`);
  process.exit(0);
}

if (!opts.milestone) {
  console.error("usage: compounding-gains-audit.mjs --milestone <id> [--apply] | --all | --proposals <id>");
  process.exit(2);
}

const audit = auditMilestone(opts.milestone);

if (opts.apply) appendLedger(audit);

console.log("COMPOUNDING-GAINS AUDIT");
console.log("========================");
console.log(`Milestone:        ${audit.milestoneId}`);
console.log(`Verdict:          ${audit.pass ? "PASS" : "BLOCK"}`);
console.log(`Total artifacts:  ${audit.totalArtifacts}`);
console.log(`Time-saved est:   ~${audit.timeSavedEstMin} min over downstream milestones`);
console.log("");
console.log("Per-class:");
for (const [cls, arr] of Object.entries(audit.emitted)) {
  console.log(`  ${cls.padEnd(10)} ${arr.length}`);
  for (const f of arr.slice(0, 3)) console.log(`              ${f}`);
  if (arr.length > 3) console.log(`              ...and ${arr.length - 3} more`);
}
console.log("");
console.log(`Primary deliverables (NOT counted toward compounding): ${audit.primaryDeliverables.length}`);

if (audit.blockers.length > 0) {
  console.log("");
  console.log("BLOCKERS:");
  for (const b of audit.blockers) {
    console.log(`  - ${b.reason}`);
    console.log(`    Remedy: ${b.remedy}`);
  }
}

if (opts.apply) {
  console.log("");
  console.log(`Ledger updated: ${LEDGER}`);
}

process.exit(audit.pass ? 0 : 1);
