import { promises as fs } from "node:fs";

const FILES = {
  currentPosition: "H:\\PRISM\\state\\CURRENT_POSITION.md",
  handoff: "H:\\PRISM\\state\\HANDOFF.md",
  sviCompact: "H:\\PRISM\\state\\shared\\SVI-compact.md",
  sviWatchStatus: "H:\\PRISM\\state\\shared\\SVI-watch-status.json",
  coordinationStatus: "H:\\PRISM\\state\\shared\\AGENT_COORDINATION_STATUS.json",
  roadmapState: "H:\\PRISM\\state\\shared\\ROADMAP_COLLABORATION_STATE.json",
  commandRegistry: "H:\\PRISM\\state\\shared\\claude-codex-command-registry.json",
  indexRegistry: "H:\\PRISM\\state\\shared\\PRISM_SHARED_INDEX_SURFACES.json",
};

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function firstNonEmptyLines(rawText, count) {
  if (!rawText) {
    return [];
  }
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, count);
}

function extractHeadingLine(rawText, heading) {
  if (!rawText) {
    return "";
  }
  const normalizedHeading = heading.trim().toLowerCase();
  const lines = rawText.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim().toLowerCase() !== normalizedHeading) {
      continue;
    }
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor].trim();
      if (!candidate) {
        continue;
      }
      if (candidate.startsWith("## ")) {
        break;
      }
      return candidate.replace(/^\-\s*/, "");
    }
  }
  return "";
}

function extractSviSummary(rawText) {
  const summary = {
    svi: "unknown",
    psi: "unknown",
    trend: "unknown",
    alerts: 0,
  };
  if (!rawText) {
    return summary;
  }

  const sviMatch = rawText.match(/\*\*SVI\*\*:\s*(.+)/i);
  const psiMatch = rawText.match(/\*\*Reachability \(Ψ\)\*\*:\s*(.+)/i);
  const trendMatch = rawText.match(/\*\*Trend\*\*:\s*(.+)/i);
  const coverageSection = rawText.split("## Coverage Alerts")[1] ?? "";
  const alertCount = coverageSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ")).length;

  return {
    svi: sviMatch ? sviMatch[1].trim() : summary.svi,
    psi: psiMatch ? psiMatch[1].trim() : summary.psi,
    trend: trendMatch ? trendMatch[1].trim() : summary.trend,
    alerts: alertCount,
  };
}

function truncate(text, maxLength) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export async function buildSpawnedAgentAdditionalContext(options = {}) {
  const parentFamily = options.parentFamily?.trim() || "Agent";
  const parentInstance = options.parentInstance?.trim() || parentFamily;
  const subagentType = options.subagentType?.trim() || "spawned";

  const [positionText, handoffText, sviCompactText, sviWatchStatus, coordinationStatus, roadmapState, commandRegistry, indexRegistry] =
    await Promise.all([
      readText(FILES.currentPosition),
      readText(FILES.handoff),
      readText(FILES.sviCompact),
      readJson(FILES.sviWatchStatus),
      readJson(FILES.coordinationStatus),
      readJson(FILES.roadmapState),
      readJson(FILES.commandRegistry),
      readJson(FILES.indexRegistry),
    ]);

  const positionSummary = truncate(firstNonEmptyLines(positionText, 4).join(" "), 220) || "unknown";
  const currentTask = extractHeadingLine(handoffText, "## Current Task");
  const resumeLine = extractHeadingLine(handoffText, "## RESUME");
  const sviSummary = extractSviSummary(sviCompactText);
  const watchActive = sviWatchStatus?.active === true ? "active" : "inactive";
  const liveWatchAlerts = Array.isArray(sviWatchStatus?.coverage_alerts)
    ? sviWatchStatus.coverage_alerts.length
    : 0;
  const watchAlerts = Math.max(liveWatchAlerts, sviSummary.alerts);
  const roadmapMode = roadmapState?.collaboration_mode ?? "unknown";
  const roadmapGate = roadmapState?.current_gate?.status ?? "unknown";
  const roadmapParticipants = Object.keys(roadmapState?.participants ?? {}).length;
  const roadmapFamilies = Object.keys(roadmapState?.families ?? {}).length;
  const coordinationAgents = coordinationStatus?.active_agents ?? 0;
  const unreadByAgent = coordinationStatus?.unread_by_agent ?? {};
  const parentUnread = unreadByAgent[parentFamily] ?? 0;
  const totalCommands = commandRegistry?.overview?.total_file_backed_commands ?? "unknown";
  const indexSummary = indexRegistry?.summary
    ? `${indexRegistry.summary.present}/${indexRegistry.summary.present + indexRegistry.summary.missing}`
    : "unknown";

  const parts = [];
  parts.push(
    `PRISM SPAWNED-AGENT CONTEXT: You are a ${subagentType} agent in H:\\PRISM. Parent family=${parentFamily}; parent instance=${parentInstance}.`,
  );
  parts.push(
    "Shared ownership stays the same unless the user changes it: Claude is backend-first, Codex is frontend-first.",
  );
  parts.push(`Current position: ${positionSummary}`);
  if (currentTask) {
    parts.push(`Handoff current task: ${truncate(currentTask, 140)}.`);
  }
  if (resumeLine) {
    parts.push(`Resume cue: ${truncate(resumeLine, 140)}.`);
  }
  parts.push(
    `SVI: ${sviSummary.svi}; Psi=${sviSummary.psi}; trend=${sviSummary.trend}; watch=${watchActive}; alerts=${watchAlerts}.`,
  );
  parts.push(
    `Roadmap mode=${roadmapMode}; gate=${roadmapGate}; shared roadmap participants=${roadmapParticipants} across ${roadmapFamilies} family/families.`,
  );
  parts.push(
    `Coordination daemon sees ${coordinationAgents} active workboard slot(s); unread items for ${parentFamily}=${parentUnread}.`,
  );
  parts.push(
    `Use PRISM shared indexes before broad search (index surfaces ${indexSummary} ready) and use the shared command bridge (${totalCommands} file-backed commands) before rediscovering command behavior.`,
  );
  parts.push(
    "REFERENCE-FIRST PROTOCOL: Before using Glob/Grep to search, READ these digest files: " +
      "ENGINE_DIGEST.md (mcp-server/data/docs/ENGINE_DIGEST.md, 1259 engines indexed), " +
      "DISPATCHER_DIGEST.md (mcp-server/data/docs/DISPATCHER_DIGEST.md, 69 dispatchers), " +
      "DIRECTORY_DIGEST.md (mcp-server/data/docs/DIRECTORY_DIGEST.md, domain→path routing). " +
      "These answer most 'where is X?' questions without any search tool calls.",
  );
  parts.push(
    "PATH SHORTCUTS: Engines→mcp-server/src/engines/ | Dispatchers→mcp-server/src/tools/dispatchers/ | " +
      "Registries→mcp-server/src/registries/ | Physics→mcp-server/src/physics/constants.ts | " +
      "Tests→mcp-server/src/__tests__/ | Schemas→mcp-server/src/schemas/ | Catalogs→mcp-server/src/data/",
  );
  parts.push(
    "Prefer prism_dev boot/build/test/SVI surfaces when they are the best shared source of truth. Leave contract notes or coordination updates if your work changes cross-lane expectations.",
  );
  parts.push(
    "AI SYSTEM: BEFORE creating engines/formulas/algorithms, use DuplicationGuardEngine.checkBeforeCreating(). Read H:\\PRISM\\state\\shared\\PRISM-SELF-AWARENESS-DIRECTIVE.md for full AI capabilities (1660+ engines, 499 formulas, 3700+ tribal tips, 296 playbook rules).",
  );
  parts.push(
    "CRITICAL COMMANDS: /pdf-learn (PDFs/documents), /video-learn (videos/tutorials), /forge-triple (new engines), /dedup (BEFORE creating), /wire-edm-studio (EDM), /lathe-studio (lathe), /auto-speed-feed, /quote-to-ship. AUTO-SUGGEST when triggers detected!",
  );
  parts.push(
    "Canonical shared files: H:\\PRISM\\state\\CURRENT_POSITION.md, H:\\PRISM\\state\\HANDOFF.md, H:\\PRISM\\state\\shared\\SVI-compact.md, H:\\PRISM\\state\\shared\\AGENT_WORKBOARD.md, H:\\PRISM\\state\\shared\\AGENT_CHAT.md, H:\\PRISM\\state\\shared\\ROADMAP_COLLABORATION_STATE.md.",
  );

  return parts.join(" ");
}
