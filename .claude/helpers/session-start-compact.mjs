import { promises as fs } from "node:fs";

const FILES = {
  memory: "H:\\prism\\state\\shared\\memory\\MEMORY.md",
  mcpDirective: "H:\\prism\\state\\shared\\CLAUDE-CODEX-MCP-DIRECTIVE.md",
  sviDirective: "H:\\prism\\state\\shared\\CLAUDE-CODEX-SVI-DIRECTIVE.md",
  commandBridge: "H:\\prism\\state\\shared\\CLAUDE-CODEX-COMMAND-BRIDGE.md",
  searchTokenDirective: "H:\\prism\\state\\shared\\CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md",
  coordinationDirective: "H:\\prism\\state\\shared\\CLAUDE-CODEX-COORDINATION-DIRECTIVE.md",
  roadmapDirective: "H:\\prism\\state\\shared\\CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md",
  selfAwarenessDirective: "H:\\prism\\state\\shared\\PRISM-SELF-AWARENESS-DIRECTIVE.md",
  watchStatus: "H:\\prism\\state\\shared\\SVI-watch-status.json",
  commandRegistry: "H:\\prism\\state\\shared\\claude-codex-command-registry.json",
  indexRegistry: "H:\\prism\\state\\shared\\PRISM_SHARED_INDEX_SURFACES.json",
  workboard: "H:\\prism\\state\\shared\\AGENT_WORKBOARD.json",
  chat: "H:\\prism\\state\\shared\\AGENT_CHAT.jsonl",
  coordinationStatus: "H:\\prism\\state\\shared\\AGENT_COORDINATION_STATUS.json",
  roadmapState: "H:\\prism\\state\\shared\\ROADMAP_COLLABORATION_STATE.json",
};

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

async function readJsonl(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function getMemoryState(lineCount) {
  if (lineCount > 180) {
    return "HEAVY";
  }
  if (lineCount > 140) {
    return "OK";
  }
  return "LEAN";
}

async function main() {
  const [memoryText, watchStatus, commandRegistry, indexRegistry, workboard, chatEntries, coordinationStatus, roadmapState] = await Promise.all([
    readText(FILES.memory),
    readJson(FILES.watchStatus),
    readJson(FILES.commandRegistry),
    readJson(FILES.indexRegistry),
    readJson(FILES.workboard),
    readJsonl(FILES.chat),
    readJson(FILES.coordinationStatus),
    readJson(FILES.roadmapState),
  ]);

  const directiveStates = await Promise.all(
    [
      FILES.mcpDirective,
      FILES.sviDirective,
      FILES.commandBridge,
      FILES.searchTokenDirective,
      FILES.coordinationDirective,
      FILES.roadmapDirective,
      FILES.selfAwarenessDirective,
    ].map((filePath) => exists(filePath)),
  );

  const memoryLines = memoryText ? memoryText.split(/\r?\n/).length : 0;
  const memoryState = getMemoryState(memoryLines);
  const missingDirectives = [
    ["MCP", directiveStates[0]],
    ["SVI", directiveStates[1]],
    ["Bridge", directiveStates[2]],
    ["Search", directiveStates[3]],
    ["Coordination", directiveStates[4]],
    ["Roadmap", directiveStates[5]],
    ["SelfAwareness", directiveStates[6]],
  ]
    .filter(([, present]) => !present)
    .map(([label]) => label);

  const registryOverview = commandRegistry?.overview ?? null;
  const indexSummary = indexRegistry?.summary ?? null;
  const watchActive = watchStatus?.active === true ? "active" : "inactive";
  const coverageAlerts = Array.isArray(watchStatus?.coverage_alerts)
    ? watchStatus.coverage_alerts.length
    : 0;
  const changedAreas = Array.isArray(watchStatus?.changed_areas)
    ? watchStatus.changed_areas.length
    : 0;
  const agentCount = Object.keys(workboard?.agents ?? {}).length;
  const chatCount = Array.isArray(chatEntries) ? chatEntries.length : 0;
  const daemonActive = coordinationStatus?.daemon?.active === true;
  const unreadEntries = Object.entries(coordinationStatus?.unread_by_agent ?? {});
  const unreadSummary = unreadEntries.length > 0
    ? unreadEntries.map(([agent, count]) => `${agent}=${count}`).join(", ")
    : "none";
  const roadmapMode = roadmapState?.collaboration_mode ?? "unknown";
  const roadmapGateStatus = roadmapState?.current_gate?.status ?? "unknown";

  const parts = [];
  parts.push(
    `SESSION EFFICIENCY: Directives=${missingDirectives.length === 0 ? "MCP/SVI/Bridge/Search/Coordination/Roadmap/SelfAwareness ready" : `missing ${missingDirectives.join("/")}`}.`,
  );
  // Self-Awareness AI System reminder
  if (directiveStates[6]) {
    parts.push(
      `AI SYSTEM ACTIVE: PRISMSelfAwarenessEngine + DuplicationGuardEngine + CrossDisciplinaryDeepLearning. CHECK before creating new assets!`,
    );
  }
  if (memoryText) {
    parts.push(`Shared memory=${memoryLines} lines (${memoryState}).`);
  } else {
    parts.push("Shared memory file unavailable.");
  }
  parts.push(
    `SVI watch=${watchActive}; alerts=${coverageAlerts}; changed areas=${changedAreas}.`,
  );
  if (registryOverview) {
    parts.push(
      `Command bridge=${registryOverview.total_file_backed_commands} file-backed commands + ${registryOverview.virtual_commands} virtual pipelines.`,
    );
  }
  if (indexSummary) {
    parts.push(
      `Index surfaces=${indexSummary.present}/${indexSummary.present + indexSummary.missing} ready.`,
    );
  }
  if (directiveStates[4]) {
    parts.push(`Coordination=${agentCount} agent slots and ${chatCount} shared chat notes ready.`);
    parts.push(`Coordination daemon=${daemonActive ? "active" : "inactive"}; unread=${unreadSummary}.`);
  }
  if (directiveStates[5]) {
    parts.push(`Roadmap mode=${roadmapMode}; gate=${roadmapGateStatus}.`);
  }
  // Check for new capabilities from prior sessions (Feature Cascade)
  const artifactsJson = await readJson("H:\\prism\\state\\shared\\SESSION_ARTIFACTS.json");
  if (artifactsJson?.recent_additions) {
    const ra = artifactsJson.recent_additions;
    const newItems = [];
    if (ra.new_engines?.length) newItems.push(`${ra.new_engines.length} new engines`);
    if (ra.new_hooks?.length) newItems.push(`${ra.new_hooks.length} new hooks`);
    if (ra.new_skills?.length) newItems.push(`${ra.new_skills.length} new skills`);
    if (newItems.length > 0) {
      parts.push(`FEATURE CASCADE: ${newItems.join(", ")} available from prior session. Check SESSION_ARTIFACTS.json for details.`);
    }
    if (artifactsJson.system_counts) {
      const sc = artifactsJson.system_counts;
      parts.push(`Live system: ${sc.engines} engines, ${sc.dispatchers} dispatchers, ${sc.tests} test files.`);
    }
  }
  parts.push(
    "Prefer /startup for full restore, summarize large outputs instead of echoing them, use shared indexes/digests/bridge files before broad repo sweeps, and consult the shared workboard/chat before re-planning concurrent work.",
  );
  // AI UTILIZATION REMINDER
  parts.push(
    "AI UTILIZATION: Before creating ANY new engine/algorithm/formula, use DuplicationGuardEngine.checkBeforeCreating() — 1,660+ engines, 499+ formulas exist. For complex problems, use PRISMCreativeReasoningEngine.explore() with 'optimal' mode for hybrid/cross-domain solutions.",
  );
  // CRITICAL COMMANDS REMINDER
  parts.push(
    "CRITICAL COMMANDS: /pdf-learn (PDFs/docs), /video-learn (videos/tutorials), /forge-triple (new engines - run /dedup FIRST), /wire-edm-studio (EDM), /lathe-studio (lathe), /auto-speed-feed, /quote-to-ship. AUTO-SUGGEST when triggers detected!",
  );
  if (memoryState === "HEAVY") {
    parts.push("Recommend /slim or memory pruning before heavy exploration.");
  }
  if (coverageAlerts > 0) {
    parts.push("SVI coverage alerts are active; treat them as immediate follow-up work.");
  }

  process.stdout.write(
    JSON.stringify({
      additionalContext: parts.join(" "),
    }),
  );
}

main().catch(() => {
  process.stdout.write(
    JSON.stringify({
      additionalContext:
        "SESSION EFFICIENCY: context pulse unavailable. Fall back to shared MCP/SVI/bridge directives and keep outputs compact.",
    }),
  );
});
