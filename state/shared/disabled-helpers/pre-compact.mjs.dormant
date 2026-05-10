import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { inferAgentIdentity, sanitizeIdentityKey } from "./agent-identity.mjs";

// CPP-MS3-U-CPP23: Per-terminal compaction survival paths.
const PATHS = {
  prismRoot: "H:\\prism",
  mcpRoot: "H:\\prism\\mcp-server",
  helpersRoot: "H:\\prism\\.claude\\helpers",
  survivalFile: "H:\\prism\\.claude\\helpers\\.compaction-survival.md", // legacy (backward compat)
  survivalDir: "H:\\prism\\.claude\\helpers",
  positionFile: "H:\\prism\\state\\CURRENT_POSITION.md",
  fallbackPositionFile: "H:\\prism\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
  sviCompact: "H:\\prism\\state\\shared\\SVI-compact.md",
  sessionSummary: "H:\\prism\\.claude\\helpers\\.session-summary.md",
  roadmapIndex: "H:\\prism\\mcp-server\\data\\roadmap-index.json",
};

function perInstanceSurvivalPath(identity) {
  const key = sanitizeIdentityKey(identity.instance, `${identity.family}-${identity.sessionKey}`);
  return path.join(PATHS.survivalDir, `.compaction-survival-${key}.md`);
}

const DIRECTIVES = [
  "H:\\prism\\state\\shared\\CLAUDE-CODEX-MCP-DIRECTIVE.md",
  "H:\\prism\\state\\shared\\CLAUDE-CODEX-SVI-DIRECTIVE.md",
  "H:\\prism\\state\\shared\\CLAUDE-CODEX-COMMAND-BRIDGE.md",
  "H:\\prism\\state\\shared\\CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md",
  "H:\\prism\\state\\shared\\CLAUDE-CODEX-COORDINATION-DIRECTIVE.md",
  "H:\\prism\\state\\shared\\CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md",
  "H:\\prism\\state\\shared\\PRISM_SHARED_INDEX_SURFACES.md",
  "H:\\prism\\state\\shared\\AGENT_COORDINATION_STATUS.md",
  "H:\\prism\\state\\shared\\AGENT_WORKBOARD.md",
  "H:\\prism\\state\\shared\\AGENT_CHAT.md",
  "H:\\prism\\state\\shared\\ROADMAP_COLLABORATION_STATE.md",
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readLeadingText(filePath, maxLines, maxChars) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .slice(0, maxLines)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
  } catch {
    return "";
  }
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PATHS.prismRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

async function resolveMemoryFile() {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".claude", "projects", "H--prism", "memory", "MEMORY.md"),
    path.join(home, ".claude", "projects", "C--PRISM", "memory", "MEMORY.md"),
    path.join(home, ".claude", "projects", "C--PRISM--mcp-server", "memory", "MEMORY.md"),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  const projectsRoot = path.join(home, ".claude", "projects");
  try {
    const projects = await fs.readdir(projectsRoot, { withFileTypes: true });
    for (const entry of projects) {
      if (!entry.isDirectory()) {
        continue;
      }
      const candidate = path.join(projectsRoot, entry.name, "memory", "MEMORY.md");
      if (await exists(candidate)) {
        return candidate;
      }
    }
  } catch {
    return "";
  }
  return "";
}

function escapeForJson(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replace(/\t/g, "\\t").replace(/\r?\n/g, " ");
}

/**
 * Read roadmap-index.json and produce a compact progress + claim summary.
 * Also returns this terminal's claimed milestone (if any).
 */
async function getRoadmapSummary(myInstanceHint) {
  try {
    const raw = await fs.readFile(PATHS.roadmapIndex, "utf8");
    const ri = JSON.parse(raw);
    const milestones = ri.milestones || [];
    const total = milestones.length;
    const complete = milestones.filter(m => m.status === "complete").length;
    const inProgress = milestones.filter(m => m.status === "in_progress").length;
    const notStarted = milestones.filter(m => m.status === "not_started").length;
    const totalUnits = milestones.reduce((s, m) => s + (m.units?.length || m.total_units || 0), 0);
    const completedUnits = milestones.reduce((s, m) => s + (m.units?.filter(u => u.status === "complete").length || m.completed_units || 0), 0);

    // Find claimed milestones and match to this terminal
    const claimed = milestones.filter(m => m.claimed_by);
    let myClaim = null;
    if (myInstanceHint) {
      // Match by substring — PID, machine name, or full instance ID
      myClaim = claimed.find(m =>
        m.claimed_by === myInstanceHint ||
        m.claimed_by.includes(myInstanceHint) ||
        (myInstanceHint.includes("pid-") && m.claimed_by.includes(myInstanceHint))
      );
    }
    // If no match by hint, check claims by this machine's hostname
    if (!myClaim) {
      const hostname = os.hostname();
      const myPid = String(process.ppid || process.pid);
      myClaim = claimed.find(m =>
        m.claimed_by?.includes(hostname) && m.claimed_by?.includes(`pid-${myPid}`)
      );
    }

    // Find next available (unclaimed, unblocked)
    const completedIds = new Set(milestones.filter(m => m.status === "complete").map(m => m.id));
    const available = milestones
      .filter(m => m.status === "not_started" && !m.claimed_by &&
        (m.dependencies || []).every(d => completedIds.has(d)))
      .slice(0, 3)
      .map(m => m.id);

    const progressLine = `${total} milestones | ${complete} complete | ${inProgress} in-progress | ${notStarted} not-started | ${completedUnits}/${totalUnits} units`;
    const claimLine = myClaim
      ? `YOUR CLAIMED MILESTONE: ${myClaim.id} (${myClaim.title})`
      : (claimed.length > 0
        ? `${claimed.length} milestones claimed by other terminals: ${claimed.map(m => `${m.id}→${m.claimed_by}`).slice(0, 3).join(", ")}`
        : "No milestones currently claimed");
    const nextLine = available.length > 0
      ? `Next available: ${available.join(", ")}`
      : "No unblocked milestones available";

    return { progressLine, claimLine, nextLine, myClaim, claimed };
  } catch {
    return { progressLine: "roadmap-index.json unreadable", claimLine: "", nextLine: "", myClaim: null, claimed: [] };
  }
}

async function main() {
  const positionFile = (await exists(PATHS.positionFile)) ? PATHS.positionFile : PATHS.fallbackPositionFile;
  const [position, sviSummary, sessionSummary] = await Promise.all([
    readLeadingText(positionFile, 5, 200),
    readLeadingText(PATHS.sviCompact, 7, 200),
    readLeadingText(PATHS.sessionSummary, 10, 300),
  ]);

  const recentCommits = runGit(["log", "--oneline", "-5"]) || "no git";
  const uncommitted = runGit(["status", "--porcelain"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;

  // Derive terminal identity hint for claim matching
  const myPid = String(process.ppid || process.pid);
  const hostname = os.hostname();
  const instanceHint = `pid-${myPid}`;

  const memoryFile = await resolveMemoryFile();
  const roadmap = await getRoadmapSummary(instanceHint);
  const generated = new Date().toISOString();
  const directiveLines = DIRECTIVES.map((directive) => `  - ${directive}`).join("\n");
  const survival = [
    "# Compaction Survival State",
    `## Generated: ${generated}`,
    "",
    "## Position",
    position || "unknown",
    "",
    "## Roadmap Progress",
    roadmap.progressLine,
    roadmap.claimLine,
    roadmap.nextLine,
    "",
    "## Recent Commits",
    recentCommits || "no git",
    "",
    `## Uncommitted Files: ${uncommitted}`,
    "",
    "## SVI State",
    sviSummary || "unknown",
    "",
    "## Session Summary",
    sessionSummary || "",
    "",
    "## Key Reminders",
    "- Project: PRISM MCP Server at H:\\prism\\mcp-server",
    "- Build: npm run build | Tests: npx vitest run",
    "- 79 dispatchers, 3,310+ actions, 152+ tests (core suite)",
    "- Roadmap: PRISM-UNIFIED-ROADMAP-v2.md (supreme authority)",
    "- Task queue: data/roadmap-index.json (532 milestones, 3065 units)",
    `- Memory: ${memoryFile || "MEMORY.md"} (auto-synced)`,
    "- Shared directives:",
    directiveLines,
    "",
    "## Per-Session Handoff (your session):",
  ].join("\n");

  // CPP-MS3-U-CPP23: Write per-instance + legacy files atomically.
  const preCompactIdentity = inferAgentIdentity({});
  const perInstanceSurvivalFile = perInstanceSurvivalPath(preCompactIdentity);
  await Promise.all([
    fs.writeFile(perInstanceSurvivalFile, survival, "utf8"),
    fs.writeFile(PATHS.survivalFile, survival, "utf8"),
  ]);

  // Generate RESUME: prioritize THIS terminal's claimed milestone
  const phaseMatch = position?.match?.(/Phase:\*?\*?\s*(.+)/);
  const phase = phaseMatch?.[1]?.trim() || position?.split?.(" ").slice(0, 10).join(" ") || "unknown";
  const resumeParts = [];

  // CRITICAL: If this terminal has a claimed milestone, that IS the resume
  if (roadmap.myClaim) {
    resumeParts.push(`CONTINUE YOUR CLAIMED MILESTONE: ${roadmap.myClaim.id} (${roadmap.myClaim.title})`);
    resumeParts.push(`Use: prism_orchestrate:roadmap_next_batch { milestone_id: "${roadmap.myClaim.id}" }`);
  } else {
    if (phase && phase !== "unknown") resumeParts.push(`Phase: ${phase}`);
    if (recentCommits && recentCommits !== "no git") {
      const firstCommit = recentCommits.split("\n")[0];
      resumeParts.push(`Last: ${firstCommit}`);
    }
  }

  // Only read THIS terminal's handoff, not any random fresh one
  let handoffResume = "";
  try {
    const handoffsDir = "H:\\prism\\state\\shared\\handoffs";
    const handoffFiles = (await fs.readdir(handoffsDir))
      .filter(f => f.startsWith("HANDOFF-") && f.endsWith(".md"));

    // Find handoff matching this terminal's identity (hostname + PID)
    const myPattern = `${hostname}` + (myPid ? `_pid-${myPid}` : "");
    const myHandoff = handoffFiles.find(f =>
      f.includes(hostname) && f.includes(`pid-${myPid}`)
    );

    if (myHandoff) {
      const fp = path.join(handoffsDir, myHandoff);
      const stat = await fs.stat(fp);
      const ageMin = (Date.now() - stat.mtimeMs) / 60_000;
      if (ageMin < 30) { // Extended to 30 min for own handoff
        const content = await fs.readFile(fp, "utf8");
        const rm = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
        const r = rm?.[1]?.trim() || "";
        if (r.length > 20 && !r.includes("compacting — read per-agent handoff")) {
          handoffResume = r.split("\n")[0].slice(0, 200);
        }
      }
    }
  } catch { /* no handoff */ }

  // Build final resume: claimed milestone takes priority, then own handoff, then generic
  let resumeDirective;
  if (roadmap.myClaim) {
    resumeDirective = resumeParts.join(". ");
    if (handoffResume) resumeDirective += `. Context: ${handoffResume}`;
  } else if (handoffResume) {
    resumeDirective = handoffResume;
  } else {
    resumeDirective = resumeParts.length > 0
      ? resumeParts.join(". ") + ". Check roadmap-index.json for next unblocked task."
      : "";
  }

  // Warn about other terminals' claims to prevent collision
  const otherClaims = roadmap.claimed.filter(m => !roadmap.myClaim || m.id !== roadmap.myClaim.id);
  const collisionWarning = otherClaims.length > 0
    ? ` DO NOT work on: ${otherClaims.map(m => m.id).join(", ")} (claimed by other terminals).`
    : "";

  const context =
    `COMPACTION IMMINENT — State preserved in .compaction-survival.md. ` +
    (resumeDirective ? `RESUME: ${resumeDirective}.${collisionWarning} ` : "") +
    `Roadmap: ${roadmap.progressLine}. ` +
    `Position: ${(position || "unknown").slice(0, 80)}. ` +
    `${uncommitted} uncommitted files. SVI: ${(sviSummary || "unknown").slice(0, 100)}. ` +
    "After compaction, read .compaction-survival.md for RESUME directive. " +
    "Then read H:/prism/state/shared/SVI-compact.md and shared directives before broad repo search.";

  process.stdout.write(`{"additionalContext":"${escapeForJson(context)}"}`);
}

main().catch(() => {
  process.stdout.write("{}");
});
