import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { inferAgentIdentity, sanitizeIdentityKey } from "./agent-identity.mjs";

// CPP-MS3-U-CPP23: Per-terminal compaction survival.
// Each Claude/Codex terminal writes its own file keyed by agent instance so
// concurrent sessions don't clobber each other's RESUME directive. The legacy
// survivalFile is still written for one-session backward compat — readers
// that don't know about the per-instance pattern keep working.
const PATHS = {
  survivalFile: "H:\\prism\\.claude\\helpers\\.compaction-survival.md", // legacy (backward compat)
  survivalDir: "H:\\prism\\.claude\\helpers",
  prismRoot: "H:\\prism",
  mcpRoot: "H:\\prism\\mcp-server",
  positionFile: "H:\\prism\\state\\CURRENT_POSITION.md",
  fallbackPositionFile: "H:\\prism\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
  buildOutput: "H:\\prism\\mcp-server\\dist\\index.js",
  roadmapIndex: "H:\\prism\\mcp-server\\data\\roadmap-index.json",
};

function perInstanceSurvivalPath(identity) {
  const key = sanitizeIdentityKey(identity.instance, `${identity.family}-${identity.sessionKey}`);
  return path.join(PATHS.survivalDir, `.compaction-survival-${key}.md`);
}

const DIRECTIVES = [
  "H:\\prism\\state\\shared\\PRISM-SELF-AWARENESS-DIRECTIVE.md",  // CRITICAL: AI capabilities + duplication guard
  "H:\\prism\\state\\shared\\AGENT_BOUNDARY_DIRECTIVE.md",  // CRITICAL: Claude=backend, Codex=frontend
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
  "H:\\prism\\state\\shared\\ACTIVE_WORK_REGISTRY.json",  // Cross-session work tracking
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
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
    cwd: PATHS.prismRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

function extractPhase(raw) {
  const phaseMatch = raw.match(/^\*\*Phase:\*\*\s*(.+)$/m);
  if (phaseMatch?.[1]) {
    return phaseMatch[1].trim();
  }
  const firstMeaningful = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  return firstMeaningful || "unknown";
}

async function getBuildSize() {
  try {
    const stats = await fs.stat(PATHS.buildOutput);
    const sizeMB = stats.size / (1024 * 1024);
    if (sizeMB >= 1) {
      return `${Math.round(sizeMB)}M`;
    }
    const sizeKB = stats.size / 1024;
    return `${Math.round(sizeKB)}K`;
  } catch {
    return "unknown";
  }
}

/**
 * CPP-MS5-U-CPP36: Inline mirror of ContextWindowMapEngine.chart() for the
 * SessionStart boot block. Estimates tokens from file bytes (≈4 bytes/token
 * for English prose; good enough for a proportional bar chart) and emits
 * the same fixed-width format the engine produces. Integration test keeps
 * this mirror in sync with the engine.
 */
async function buildContextChart() {
  const CONTEXT_LIMIT = 200000;
  const TOKENS_PER_BYTE = 1 / 4;
  const sources = [
    { type: "system", path: "H:\\prism\\CLAUDE.md" },
    { type: "system", path: "H:\\prism\\mcp-server\\CLAUDE.md" },
    { type: "memory", path: "C:\\Users\\wompu\\.claude\\projects\\H--prism\\memory\\MEMORY.md" },
    { type: "file", path: PATHS.positionFile },
  ];
  // Directives count as 'system' (boot-block rules).
  for (const d of DIRECTIVES) sources.push({ type: "system", path: d });
  // Add freshest handoff if any.
  try {
    const handoffs = await fs.readdir("H:\\prism\\state\\shared\\handoffs");
    const hand = handoffs.filter((n) => n.startsWith("HANDOFF-"));
    if (hand.length > 0) {
      sources.push({
        type: "conversation",
        path: path.join("H:\\prism\\state\\shared\\handoffs", hand[0]),
      });
    }
  } catch { /* no handoffs dir */ }

  const byType = {};
  let totalTokens = 0;
  for (const s of sources) {
    try {
      const st = await fs.stat(s.path);
      const tokens = Math.round(st.size * TOKENS_PER_BYTE);
      if (tokens <= 0) continue;
      const e = byType[s.type] ?? { count: 0, tokens: 0 };
      e.count++;
      e.tokens += tokens;
      byType[s.type] = e;
      totalTokens += tokens;
    } catch { /* missing file — skip */ }
  }

  if (totalTokens === 0) return { chart: "(no context sources visible)", totalTokens: 0, pct: 0 };

  const maxBar = 30;
  const entries = Object.entries(byType).sort((a, b) => b[1].tokens - a[1].tokens);
  const lines = [];
  for (const [type, data] of entries) {
    const ratio = data.tokens / totalTokens;
    const bar = "#".repeat(Math.round(ratio * maxBar));
    const pct = Math.round(ratio * 100);
    lines.push(
      type.padEnd(14) + " " + bar.padEnd(maxBar) + " " + pct + "% (" + data.tokens + " tok)",
    );
  }
  const utilization = Math.round((totalTokens / CONTEXT_LIMIT) * 100);
  return { chart: lines.join("\n"), totalTokens, pct: utilization };
}

/**
 * Read roadmap-index.json for compact progress + claim summary.
 */
async function getActiveWork() {
  try {
    const raw = await readText("H:\\prism\\state\\shared\\ACTIVE_WORK_REGISTRY.json");
    if (!raw) return [];
    const data = JSON.parse(raw);
    return data.active || [];
  } catch {
    return [];
  }
}

async function getRoadmapProgress() {
  try {
    const raw = await readText(PATHS.roadmapIndex);
    if (!raw) return { summary: "roadmap unavailable", claims: [], available: [] };
    const ri = JSON.parse(raw);
    const ms = ri.milestones || [];
    const total = ms.length;
    const complete = ms.filter(m => m.status === "complete").length;
    const inProg = ms.filter(m => m.status === "in_progress").length;
    const notStarted = ms.filter(m => m.status === "not_started").length;
    const totalUnits = ms.reduce((s, m) => s + (m.units?.length || m.total_units || 0), 0);
    const doneUnits = ms.reduce((s, m) => s + (m.units?.filter(u => u.status === "complete").length || m.completed_units || 0), 0);

    const claims = ms.filter(m => m.claimed_by).map(m => ({ id: m.id, by: m.claimed_by, title: m.title }));
    const completedIds = new Set(ms.filter(m => m.status === "complete").map(m => m.id));
    const available = ms
      .filter(m => m.status === "not_started" && !m.claimed_by && (m.dependencies || []).every(d => completedIds.has(d)))
      .slice(0, 5)
      .map(m => m.id);

    return {
      summary: `${total} milestones | ${complete} done | ${inProg} active | ${notStarted} queued | ${doneUnits}/${totalUnits} units`,
      claims,
      available,
    };
  } catch {
    return { summary: "roadmap unreadable", claims: [], available: [] };
  }
}

async function main() {
  const positionFile = (await exists(PATHS.positionFile)) ? PATHS.positionFile : PATHS.fallbackPositionFile;
  const [positionRaw, buildSize, roadmap, activeWork, contextChart] = await Promise.all([
    readText(positionFile),
    getBuildSize(),
    getRoadmapProgress(),
    getActiveWork(),
    buildContextChart(),
  ]);
  const phase = extractPhase(positionRaw);
  const recent = runGit(["log", "--oneline", "-10", "--since=8 hours ago"]) || "none";
  const timestamp = new Date().toISOString();
  const directiveLines = DIRECTIVES.map((directive) => `  - ${directive}`).join("\n");

  // CPP-MS5-U-CPP35: resolve identity early so we can embed machine-readable
  // family/machine/instance in the header for Codex boundary rule consumers.
  const identity = inferAgentIdentity({});

  // Generate RESUME with claim awareness
  const resumeParts = [];
  if (phase && phase !== "unknown") resumeParts.push(`Phase: ${phase}`);

  // Check if this terminal has a claim (match by PID in claimed_by)
  const myPid = String(process.ppid || process.pid);
  const hostname = os.hostname();
  const myClaim = roadmap.claims.find(c =>
    c.by?.includes(hostname) && c.by?.includes(`pid-${myPid}`)
  );

  if (myClaim) {
    resumeParts.push(`YOUR CLAIMED MILESTONE: ${myClaim.id} (${myClaim.title}) — continue this work`);
  } else {
    // Extract in-progress milestones from position
    const inProgressMatches = positionRaw.match(/\b([A-Z][\w-]+-MS\w+)\b.*?in.progress/gi) || [];
    if (inProgressMatches.length > 0) {
      const ids = inProgressMatches.map(m => m.match(/\b([A-Z][\w-]+-MS\w+)\b/)?.[1]).filter(Boolean);
      if (ids.length > 0) resumeParts.push(`In-progress: ${ids.slice(0, 3).join(", ")}`);
    }
  }

  if (recent && recent !== "none") {
    resumeParts.push(`Last work: ${recent.split("\n")[0]}`);
  }

  // Warn about other terminals' claims
  const otherClaims = roadmap.claims.filter(c => !myClaim || c.id !== myClaim.id);
  const collisionWarning = otherClaims.length > 0
    ? `\nDO NOT work on these (claimed by other terminals): ${otherClaims.map(c => `${c.id}→${c.by}`).join(", ")}`
    : "";

  const resumeDirective = resumeParts.length > 0
    ? resumeParts.join(". ") + ". Check roadmap-index.json for next unblocked task." + collisionWarning
    : "Read roadmap-index.json and claim an available milestone." + collisionWarning;

  // Check milestone ownership for this agent
  const agentType = process.env.AGENT_TYPE || "claude";  // Default to claude
  const blockedTracks = agentType === "codex"
    ? ["S0", "QA", "SYS", "CAMK", "CAMX", "WEDM", "ACP", "RES", "SAFE", "PHYS", "BIZ"]
    : ["APP", "APPW", "FMERGE", "WEB", "UI"];
  const boundaryWarning = `BOUNDARY: You are ${agentType.toUpperCase()}. BLOCKED tracks: ${blockedTracks.join(", ")}. Cross-boundary work requires explicit user permission.`;

  const output = [
    `# Compaction Survival — ${timestamp}`,
    "## DO NOT DELETE — Read this after context compaction",
    "",
    "## Identity",
    `- Family: ${identity.family}`,
    `- Machine: ${identity.machine}`,
    `- Instance: ${identity.instance}`,
    `- Session: ${identity.sessionKey}`,
    "",
    "## AGENT BOUNDARY (STRICT)",
    boundaryWarning,
    "",
    "## RESUME",
    resumeDirective,
    "",
    "## Roadmap Progress",
    roadmap.summary,
    roadmap.claims.length > 0
      ? `Active claims: ${roadmap.claims.map(c => `${c.id}→${c.by}`).join(", ")}`
      : "No active claims",
    roadmap.available.length > 0
      ? `Next available: ${roadmap.available.join(", ")}`
      : "No unblocked milestones",
    "",
    "## Current Position",
    phase,
    "",
    "## This Session's Work",
    "```",
    recent,
    "```",
    "",
    "## Build Status",
    `Last build size: ${buildSize}`,
    "",
    "## Context Window Map (CPP-MS5-U-CPP36)",
    `Total: ${contextChart.totalTokens} tokens (~${contextChart.pct}% of 200K window)`,
    "```",
    contextChart.chart,
    "```",
    "",
    "## Key Instruction",
    "- Roadmap: PRISM-UNIFIED-ROADMAP-v2.md (supreme authority)",
    "- Task queue: data/roadmap-index.json (525 milestones)",
    "- 84 dispatchers, 4,296 actions, 1,660+ engines",
    "- Read MEMORY.md for cross-session knowledge",
    "- Claim milestones before working: prism_orchestrate:roadmap_claim",
    "- Omega target: 1.0",
    "- Shared directives:",
    directiveLines,
    "",
    "## CRITICAL COMMANDS (AUTO-SUGGEST!)",
    "- /pdf-learn — PDFs/documents/manuals",
    "- /video-learn — Videos/YouTube/tutorials",
    "- /forge-triple — New engines (run /dedup FIRST!)",
    "- /wire-edm-studio — Wire EDM programming",
    "- /lathe-studio — Lathe/turning",
    "- /auto-speed-feed — Speed/feed calcs",
    "- /quote-to-ship — Quotes/estimates",
    "- /dedup — MANDATORY before creating new assets!",
    "",
    "## CROSS-SESSION AWARENESS",
    activeWork.length > 0
      ? `Other sessions working on: ${activeWork.slice(0, 5).map(w => `${w.type}:${w.name}`).join(", ")}`
      : "No active work tracked in other sessions",
    "CHECK ACTIVE_WORK_REGISTRY.json before creating similar engines!",
    "",
  ].join("\n");

  // CPP-MS3-U-CPP23: Write BOTH per-instance file (primary) and legacy file
  // (one-session backward compat). Readers that know the new pattern glob
  // per-instance files; old readers keep reading the legacy single file.
  const perInstancePath = perInstanceSurvivalPath(identity);

  await Promise.all([
    fs.writeFile(perInstancePath, output, "utf8"),
    fs.writeFile(PATHS.survivalFile, output, "utf8"), // legacy fallback
  ]);
  process.stdout.write(`OK: compaction survival written (per-instance=${path.basename(perInstancePath)})`);
}

main().catch(() => {
  process.stdout.write("OK: compaction survival write skipped");
});
