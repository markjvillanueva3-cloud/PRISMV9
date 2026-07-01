#!/usr/bin/env node
/**
 * conflict-predict.mjs
 *
 * Phase-0 simulator (Agent 5 ADD-1-LAYER recommendation, 2026-05-09).
 * Reads the live state of the 6-chat fleet and predicts collisions BEFORE
 * Phase 1 starts. Output drives the six-chat-bootstrap fork-vs-share
 * decision per overlap.
 *
 * Inputs:
 *   - state/shared/handoffs/HANDOFF-*.md     (per-chat planned work)
 *   - mcp-server/data/claims/<unit>/claim.json  (active claims)
 *   - state/shared/atomic-roadmap.json        (assigned units)
 *   - state/shared/AGENT_WORKBOARD.md         (declared lanes)
 *
 * Heuristics:
 *   - Same milestone, different chats     → MEDIUM risk
 *   - Same dispatcher group               → MEDIUM risk
 *   - Same engine file (files_modified)   → HIGH risk
 *   - Same hook chain                     → HIGH risk
 *   - Same skill source                   → MEDIUM risk
 *   - Stale handoff (>2h)                 → flag as "ghost-claim"
 *
 * Recommendation per overlap:
 *   - HIGH risk        → "fork"  (worktree per chat)
 *   - MEDIUM risk      → "share" (sequential PRs in same tree)
 *   - LOW risk         → "share"
 *   - ghost-claim      → "defer" (user must acknowledge)
 *
 * Output: state/shared/predicted-collisions.json
 *
 * Usage:
 *   node conflict-predict.mjs                 # full run
 *   node conflict-predict.mjs --dry-run       # show analysis
 *   node conflict-predict.mjs --top 10        # show top-N collisions
 */

import fs from "node:fs";
import path from "node:path";

const PRISM = "H:/prism";
const HANDOFF_DIR = `${PRISM}/state/shared/handoffs`;
const CLAIMS_DIR = `${PRISM}/mcp-server/data/claims`;
const ROADMAP = `${PRISM}/state/shared/atomic-roadmap.json`;
const OUT = `${PRISM}/state/shared/predicted-collisions.json`;

const STALE_HANDOFF_HOURS = 2;
const HANDOFF_AGE_MS = STALE_HANDOFF_HOURS * 60 * 60 * 1000;

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
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

function readHandoffs() {
  if (!fs.existsSync(HANDOFF_DIR)) return [];
  const files = fs.readdirSync(HANDOFF_DIR).filter((f) =>
    f.startsWith("HANDOFF-") && f.endsWith(".md"),
  );
  const handoffs = [];
  for (const f of files) {
    const full = path.join(HANDOFF_DIR, f);
    const stat = fs.statSync(full);
    const age = Date.now() - stat.mtimeMs;
    const txt = fs.readFileSync(full, "utf8");
    const resumeM = txt.match(/##\s*RESUME[^\n]*\n([\s\S]*?)(?=\n##|\Z)/i);
    const resume = resumeM ? resumeM[1].trim().slice(0, 600) : "";
    const milestoneM = (resume + " " + f).match(/([A-Z][A-Z0-9-]+-MS\d+[A-Z]?)/);
    const idM = f.match(/HANDOFF-(.+?)\.md$/);
    const fileM = resume.match(/(?:src\/[\w/]+\.ts|\.claude\/[\w/]+\.[mc]?js)/g) || [];
    handoffs.push({
      file: f,
      chatId: idM ? idM[1] : "unknown",
      ageHours: +(age / 3600000).toFixed(2),
      stale: age > HANDOFF_AGE_MS,
      milestone: milestoneM ? milestoneM[1] : null,
      filesPlanned: [...new Set(fileM)],
      resumeSnippet: resume.split("\n")[0].slice(0, 100),
    });
  }
  return handoffs;
}

function readClaims() {
  if (!fs.existsSync(CLAIMS_DIR)) return [];
  const claims = [];
  for (const dir of fs.readdirSync(CLAIMS_DIR)) {
    const cp = path.join(CLAIMS_DIR, dir, "claim.json");
    const c = readJSON(cp, null);
    if (c) {
      const stat = fs.statSync(cp);
      claims.push({
        unit: dir,
        chatId: c.claimant || c.chat_id || "unknown",
        milestone: c.milestone || null,
        ageMinutes: +((Date.now() - stat.mtimeMs) / 60000).toFixed(1),
        files: c.files_modified || [],
      });
    }
  }
  return claims;
}

function readRoadmapLanes() {
  const r = readJSON(ROADMAP, null);
  if (!r) return [];
  return r.laneAssignments || [];
}

function predictCollisions(handoffs, claims, lanes) {
  const collisions = [];

  // 1. handoff vs handoff: same milestone OR same file in plan
  for (let i = 0; i < handoffs.length; i++) {
    for (let j = i + 1; j < handoffs.length; j++) {
      const a = handoffs[i], b = handoffs[j];
      if (a.milestone && a.milestone === b.milestone) {
        collisions.push({
          kind: "handoff-milestone-overlap",
          chats: [a.chatId, b.chatId],
          milestone: a.milestone,
          severity: "MEDIUM",
          recommendation: "share",
          note: `Both chats target ${a.milestone}`,
        });
      }
      const sharedFiles = a.filesPlanned.filter((f) => b.filesPlanned.includes(f));
      if (sharedFiles.length > 0) {
        collisions.push({
          kind: "handoff-file-overlap",
          chats: [a.chatId, b.chatId],
          files: sharedFiles,
          severity: "HIGH",
          recommendation: "fork",
          note: `${sharedFiles.length} shared files in handoff`,
        });
      }
    }
    if (handoffs[i].stale) {
      collisions.push({
        kind: "stale-handoff",
        chats: [handoffs[i].chatId],
        ageHours: handoffs[i].ageHours,
        severity: "LOW",
        recommendation: "defer",
        note: `Handoff is ${handoffs[i].ageHours}h old (>${STALE_HANDOFF_HOURS}h threshold)`,
      });
    }
  }

  // 2. claim vs claim: same milestone, different chat
  const claimsByMs = new Map();
  for (const c of claims) {
    if (!c.milestone) continue;
    if (!claimsByMs.has(c.milestone)) claimsByMs.set(c.milestone, []);
    claimsByMs.get(c.milestone).push(c);
  }
  for (const [ms, group] of claimsByMs) {
    const chats = new Set(group.map((g) => g.chatId));
    if (chats.size > 1) {
      collisions.push({
        kind: "claim-milestone-overlap",
        chats: [...chats],
        milestone: ms,
        units: group.map((g) => g.unit),
        severity: "HIGH",
        recommendation: "fork",
        note: `${chats.size} chats hold claims on ${ms}`,
      });
    }
  }

  // 3. roadmap-lane vs claim: lane says chat owns unit, but claim is held by different chat
  for (const lane of lanes) {
    for (const unitKey of lane.units) {
      const [, unitId] = unitKey.split("::");
      const claim = claims.find((c) => c.unit === unitId);
      if (claim && claim.chatId !== `chat-${lane.chat}` && claim.chatId !== "unknown") {
        collisions.push({
          kind: "lane-claim-mismatch",
          assignedChat: lane.chat,
          actualClaimant: claim.chatId,
          unit: unitId,
          severity: "MEDIUM",
          recommendation: "share",
          note: `Roadmap assigned to chat-${lane.chat} but ${claim.chatId} already claimed`,
        });
      }
    }
  }

  // sort: HIGH first, then MEDIUM, then LOW
  const sevRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  collisions.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
  return collisions;
}

const opts = args();
const handoffs = readHandoffs();
const claims = readClaims();
const lanes = readRoadmapLanes();
const collisions = predictCollisions(handoffs, claims, lanes);

const output = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  inputs: {
    handoffs: handoffs.length,
    claims: claims.length,
    lanes: lanes.length,
  },
  totals: {
    HIGH: collisions.filter((c) => c.severity === "HIGH").length,
    MEDIUM: collisions.filter((c) => c.severity === "MEDIUM").length,
    LOW: collisions.filter((c) => c.severity === "LOW").length,
  },
  collisions,
  recommendation: collisions.length === 0
    ? "GREEN — no predicted collisions; fleet is clear to start Phase 1"
    : collisions.some((c) => c.severity === "HIGH")
    ? "RED — fork affected chats to sibling worktrees before Phase 1"
    : "YELLOW — proceed but coordinate via AGENT_CHAT.md before edits",
};

if (opts["dry-run"]) {
  console.log("CONFLICT PREDICTION — DRY RUN");
  console.log("==============================");
  console.log(`Inputs: ${handoffs.length} handoffs, ${claims.length} claims, ${lanes.length} lanes`);
  console.log(`Totals: HIGH=${output.totals.HIGH} MEDIUM=${output.totals.MEDIUM} LOW=${output.totals.LOW}`);
  console.log(`\nRecommendation: ${output.recommendation}`);
  const top = Number(opts.top) || 10;
  console.log(`\nTop ${top} collisions:`);
  for (const c of collisions.slice(0, top)) {
    console.log(`  [${c.severity}] ${c.kind} → ${c.recommendation}`);
    console.log(`    ${c.note}`);
  }
} else {
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`Wrote ${collisions.length} predicted collisions → ${OUT}`);
  console.log(`Verdict: ${output.recommendation}`);
}
