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

/**
 * Get compact inventory summary from BASELINE_INVENTORY.json
 */
async function getInventorySummary() {
  try {
    const raw = await readText("H:\\prism\\mcp-server\\data\\state\\BASELINE_INVENTORY.json");
    if (!raw) return "inventory unavailable";
    const inv = JSON.parse(raw);
    const i = inv.inventory || {};
    return [
      `Engines: ${i.engines?.files || 0}`,
      `Dispatchers: ${i.dispatchers || 0}`,
      `Actions: ${i.actions || 0}`,
      `Formulas: ${i.formulas?.registered || 0}`,
      `Algorithms: ${i.algorithms || 0}`,
      `Tribal Tips: ${i.tribal_tips || 0}`,
      `Materials: ${i.materials || 0}`,
      `Tools: ${i.tools || 0}`,
      `Machines: ${i.machines || 0}`,
      `Skills: ${i.skills || 0}`,
      `Hooks: ${i.hooks?.registry || 0}`,
      `Tests: ${i.test_count || 0} pass`,
      `Ω: ${inv.omega || 1}`,
    ].join(" | ");
  } catch {
    return "inventory unavailable";
  }
}

async function main() {
  const positionFile = (await exists(PATHS.positionFile)) ? PATHS.positionFile : PATHS.fallbackPositionFile;
  const [positionRaw, buildSize, roadmap, activeWork, contextChart, inventorySummary] = await Promise.all([
    readText(positionFile),
    getBuildSize(),
    getRoadmapProgress(),
    getActiveWork(),
    buildContextChart(),
    getInventorySummary(),
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

  // Check explicit track claims (SESSION_TRACK_CLAIMS.json keyed by REAL session identity)
  // FIX: Never use THIS_SESSION placeholder — match by actual sessionKey/PID
  let explicitClaim = null;
  try {
    const claimsRaw = await readText("H:\\prism\\state\\shared\\SESSION_TRACK_CLAIMS.json");
    if (claimsRaw) {
      const claimsData = JSON.parse(claimsRaw);
      const claims = claimsData.claims || {};

      // Match by our ACTUAL session identity (sessionKey = pid-XXXXX or explicit ID)
      // Priority: exact sessionKey match > PID match > instance substring match
      const matchKeys = [
        identity.sessionKey,                    // e.g., "pid-12345"
        identity.instance,                      // e.g., "Agent@DESKTOP/pid-12345"
        `${identity.family}@${identity.machine}/${identity.sessionKey}`,
      ];

      for (const key of matchKeys) {
        if (claims[key]) {
          explicitClaim = claims[key];
          break;
        }
      }

      // Fallback: check if any claim key contains our sessionKey (partial match)
      if (!explicitClaim) {
        for (const [claimKey, claimData] of Object.entries(claims)) {
          if (claimKey.includes(identity.sessionKey) || identity.sessionKey.includes(claimKey)) {
            explicitClaim = claimData;
            break;
          }
        }
      }

      // NEVER use THIS_SESSION — that was a bug causing cross-session context bleed
      // Explicitly skip it even if present for backward compat
    }
  } catch { /* no claims file */ }

  if (explicitClaim) {
    // Explicit track claim takes priority over all other inference
    resumeParts.push(`ASSIGNED TRACK: ${explicitClaim.track}`);
    if (explicitClaim.milestone) {
      resumeParts.push(`MILESTONE: ${explicitClaim.milestone}`);
    }
    if (explicitClaim.notes) {
      resumeParts.push(explicitClaim.notes);
    }
    // DO NOT add phase from position - it would confuse the session
  } else {
    // Fall back to phase from CURRENT_POSITION.md
    if (phase && phase !== "unknown") resumeParts.push(`Phase: ${phase}`);

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

  // Get active work from registry for collision warnings
  const otherWork = activeWork.filter(w =>
    !explicitClaim || w.track !== explicitClaim.track
  );
  const collisionWarning = otherWork.length > 0
    ? `\nDO NOT work on: ${otherWork.map(w => w.track).join(", ")} (claimed by other sessions)`
    : "";

  const resumeDirective = resumeParts.length > 0
    ? resumeParts.join(". ") + (explicitClaim ? "" : ". Check roadmap-index.json for next unblocked task.") + collisionWarning
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
    "## Live Inventory (BASELINE_INVENTORY.json)",
    inventorySummary,
    "",
    "## PRISM MISSION",
    "Manufacturing intelligence platform → all-in-one shop management system.",
    "Goal: Replace fragmented shop software with unified AI-powered system.",
    "Test shop: JM Die Company (21 machines, 100+ customers, cold heading dies).",
    "",
    "## MCP POWER UTILIZATION",
    "- 89 dispatchers × 5,051 actions = massive capability surface",
    "- Use prism_* MCP tools for domain operations, not raw code",
    "- Key dispatchers: prism_calc, prism_cam, prism_orchestrate, prism_knowledge",
    "- Orchestration: prism_orchestrate:roadmap_claim, roadmap_status, task_spawn",
    "- Knowledge: prism_knowledge:search_tribal, search_formulas, search_algorithms",
    "- Self-awareness: PRISMSelfAwarenessEngine.searchAIFeatures(), recommendAIFeatures()",
    "",
    "## TOKEN EFFICIENCY",
    "- Context economy hooks compress outputs automatically",
    "- Use /slim for concise responses",
    "- Use /context-map to visualize token usage",
    "- Prefer MCP calls over reading large files",
    "- Delegate to subagents for parallel work",
    "- Roadmap-index is 3MB — use prism_orchestrate:roadmap_status, not raw read",
    "",
    "## INTERNAL AI SYSTEM",
    "- OllamaClientEngine: local LLM inference (qwen, llama, codellama)",
    "- LLMEngine: unified interface for local/remote models",
    "- AIIntelligenceMaximizerEngine: auto-utilization of AI capabilities",
    "- Docker volumes: H:/prism/data/docker-volumes (postgres, redis, models)",
    "- Activate: prism_ai:activate_local, model_status, inference_run",
    "",
    "## SELF-AWARENESS SYSTEM (USE THIS!)",
    "```typescript",
    "import { prismSelfAwarenessEngine } from './engines/PRISMSelfAwarenessEngine.js';",
    "engine.searchAIFeatures('reasoning');  // Find AI capabilities",
    "engine.recommendAIFeatures('optimize cutting params');  // Get recommendations",
    "engine.getJMDieCustomerPath('ALCOA');  // Direct file access",
    "engine.searchTribalKnowledge('thin wall');  // Shop floor wisdom",
    "engine.getFullDriveAwareness();  // Complete H: drive map",
    "```",
    "",
    "## CRITICAL COMMANDS",
    "/dedup — MANDATORY before creating | /forge-triple — engines+skills+hooks",
    "/pdf-learn — PDFs | /video-learn — videos | /shop-knowledge — tribal tips",
    "/wire-edm-studio | /lathe-studio | /mill-studio | /quote-to-ship",
    "/deep-think — exhaustive analysis | /enforce-role — expert mode",
    "",
    "## CROSS-SESSION AWARENESS",
    activeWork.length > 0
      ? `Other sessions: ${activeWork.slice(0, 5).map(w => `${w.type}:${w.name}`).join(", ")}`
      : "No active work in other sessions",
    "CHECK ACTIVE_WORK_REGISTRY.json + duplicationGuardEngine before creating!",
    "",
    "## Shared Directives",
    directiveLines,
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
