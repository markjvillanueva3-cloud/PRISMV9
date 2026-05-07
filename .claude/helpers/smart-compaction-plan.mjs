#!/usr/bin/env node
/**
 * smart-compaction-plan.mjs — Intelligent Compaction Planning
 *
 * Uses ContextChainEngine concepts to plan optimal compaction:
 *   1. Analyze what MUST be preserved (critical facts)
 *   2. Identify what CAN be pruned (redundant, stale, derivable)
 *   3. Generate optimal handoff structure
 *   4. Estimate token savings
 *
 * Runs before compaction to ensure nothing critical is lost.
 */

import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PATHS = {
  position: "H:/prism/state/CURRENT_POSITION.md",
  roadmapIndex: "H:/prism/mcp-server/data/roadmap-index.json",
  buildOutput: "H:/prism/mcp-server/dist/index.js",
  economyState: "H:/prism/.claude/cache/context-economy.json",
  survivalFile: "H:/prism/.claude/helpers/.compaction-survival.md",
  planOutput: "H:/prism/.claude/cache/compaction-plan.json",
};

// Categories for preservation
const PRESERVE_CATEGORIES = {
  critical: [
    "current milestone ID and title",
    "build status (PASS/FAIL)",
    "any errors being debugged",
    "uncommitted file paths",
    "claimed milestone ownership",
  ],
  high: [
    "session work summary (1-2 lines)",
    "physics constants discovered/validated",
    "wiring patterns learned",
    "user preferences expressed",
  ],
  medium: [
    "recent git commits (top 5)",
    "files modified this session",
    "test results summary",
  ],
};

// What can safely be pruned
const PRUNE_CANDIDATES = [
  { pattern: "raw git diff output", reason: "derivable from git" },
  { pattern: "full file contents read", reason: "derivable by re-reading" },
  { pattern: "npm/build verbose output", reason: "only final status matters" },
  { pattern: "repeated search results", reason: "can search again" },
  { pattern: "test output details", reason: "only pass/fail matters" },
  { pattern: "engine listings", reason: "derivable from ENGINE_DIGEST.md" },
  { pattern: "dispatcher listings", reason: "derivable from DISPATCHER_DIGEST.md" },
];

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: "H:/prism",
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0 ? (result.stdout || "").trim() : "";
}

async function extractCriticalFacts() {
  const facts = [];

  // 1. Current milestone from position
  const position = await readText(PATHS.position);
  const phaseMatch = position.match(/\*\*Phase:\*\*\s*(.+)/);
  if (phaseMatch) facts.push({ category: "position", content: phaseMatch[1], priority: "critical" });

  // 2. Build status
  try {
    const stat = await fs.stat(PATHS.buildOutput);
    const age = (Date.now() - stat.mtimeMs) / 3600000;
    facts.push({
      category: "build",
      content: age < 1 ? "PASS (< 1h old)" : age < 24 ? "PASS (< 24h old)" : "STALE",
      priority: "critical",
    });
  } catch {
    facts.push({ category: "build", content: "UNKNOWN", priority: "critical" });
  }

  // 3. Uncommitted changes
  const status = runGit(["status", "--porcelain"]);
  if (status) {
    const lines = status.split("\n").filter(Boolean);
    facts.push({
      category: "incomplete_work",
      content: `${lines.length} uncommitted files`,
      priority: "critical",
    });
  }

  // 4. Claimed milestone from roadmap-index
  const roadmap = await readJson(PATHS.roadmapIndex);
  if (roadmap?.milestones) {
    const hostname = process.env.COMPUTERNAME || "host";
    const claimed = roadmap.milestones.filter(m =>
      m.claimed_by?.includes(hostname)
    );
    if (claimed.length > 0) {
      facts.push({
        category: "position",
        content: `CLAIMED: ${claimed.map(m => m.id).join(", ")}`,
        priority: "critical",
      });
    }

    // In-progress milestones
    const inProgress = roadmap.milestones.filter(m => m.status === "in_progress");
    if (inProgress.length > 0) {
      facts.push({
        category: "position",
        content: `IN-PROGRESS: ${inProgress.map(m => m.id).join(", ")}`,
        priority: "high",
      });
    }
  }

  // 5. Recent commits
  const commits = runGit(["log", "--oneline", "-5", "--since=24 hours ago"]);
  if (commits) {
    facts.push({
      category: "wiring",
      content: `Recent: ${commits.split("\n")[0]}`,
      priority: "medium",
    });
  }

  return facts;
}

function generateHandoffTemplate(facts) {
  const critical = facts.filter(f => f.priority === "critical");
  const high = facts.filter(f => f.priority === "high");

  const positionFact = critical.find(f => f.category === "position");
  const buildFact = critical.find(f => f.category === "build");
  const claimFact = critical.find(f => f.content?.includes("CLAIMED"));
  const uncommitted = critical.find(f => f.category === "incomplete_work");

  const resume = claimFact
    ? `Continue ${claimFact.content.replace("CLAIMED: ", "")}. Check roadmap-index.json for unit details.`
    : positionFact
      ? `Continue ${positionFact.content}. Claim a milestone before starting.`
      : "Read roadmap-index.json and claim an available milestone.";

  return {
    resume_instruction: resume,
    state_summary: [
      positionFact?.content,
      buildFact?.content ? `Build: ${buildFact.content}` : null,
      uncommitted?.content,
    ].filter(Boolean).join(" | "),
    build_status: buildFact?.content || "UNKNOWN",
    active_task: claimFact?.content?.replace("CLAIMED: ", "") || positionFact?.content || "none",
    critical_facts: critical.map(f => f.content),
  };
}

async function estimateSavings() {
  const economy = await readJson(PATHS.economyState);
  if (!economy) return { current_tokens: 0, estimated_savings: 0 };

  // Estimate: compaction typically preserves ~10-15% of context
  const currentTokens = economy.total_tokens_est || 0;
  const preserveRatio = 0.12; // 12% preserved in handoff
  const estimatedSavings = Math.round(currentTokens * (1 - preserveRatio));

  return {
    current_tokens: currentTokens,
    post_compact_tokens: Math.round(currentTokens * preserveRatio),
    estimated_savings: estimatedSavings,
    savings_pct: Math.round((1 - preserveRatio) * 100),
  };
}

async function generatePlan() {
  const [facts, savings] = await Promise.all([
    extractCriticalFacts(),
    estimateSavings(),
  ]);

  const handoff = generateHandoffTemplate(facts);

  const plan = {
    timestamp: new Date().toISOString(),
    should_compact: savings.current_tokens > 100_000,
    reason: savings.current_tokens > 150_000
      ? "Context pressure HIGH — compact recommended"
      : savings.current_tokens > 100_000
        ? "Context moderate — compact optional"
        : "Context low — no compaction needed",
    preserve: facts,
    prune: PRUNE_CANDIDATES,
    savings,
    handoff_template: handoff,
  };

  await fs.writeFile(PATHS.planOutput, JSON.stringify(plan, null, 2), "utf8");
  return plan;
}

// Main
(async () => {
  const plan = await generatePlan();

  if (process.argv[2] === "json") {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log("COMPACTION PLAN");
    console.log("================");
    console.log(`Status: ${plan.reason}`);
    console.log(`Current: ~${plan.savings.current_tokens.toLocaleString()} tokens`);
    console.log(`After compact: ~${plan.savings.post_compact_tokens.toLocaleString()} tokens`);
    console.log(`Savings: ~${plan.savings.estimated_savings.toLocaleString()} tokens (${plan.savings.savings_pct}%)`);
    console.log("");
    console.log("PRESERVE (critical facts):");
    for (const f of plan.preserve.filter(x => x.priority === "critical")) {
      console.log(`  [${f.category}] ${f.content}`);
    }
    console.log("");
    console.log("HANDOFF RESUME:");
    console.log(`  ${plan.handoff_template.resume_instruction}`);
    console.log("");
    console.log("PRUNE (safe to discard):");
    for (const p of plan.prune.slice(0, 5)) {
      console.log(`  - ${p.pattern} (${p.reason})`);
    }
  }
})();
