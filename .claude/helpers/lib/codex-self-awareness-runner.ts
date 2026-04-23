#!/usr/bin/env node
/**
 * codex-self-awareness-runner.ts
 *
 * Live bridge into PRISM's self-awareness system for Codex.
 * Supports startup refresh, H: drive lookup, and capability routing queries.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  getSelfAwarenessContext,
  quickSelfAwarenessCheck,
  runSelfAwarenessStartup
} from "../../../mcp-server/src/hooks/selfAwarenessStartup.ts";
import {
  prismSelfAwarenessEngine
} from "../../../mcp-server/src/engines/PRISMSelfAwarenessEngine.ts";

type ContextMode = "full" | "minimal" | "auto";
type Command =
  | "startup"
  | "refresh"
  | "kernel"
  | "locate"
  | "drive"
  | "full-drive"
  | "capability"
  | "task"
  | "gap"
  | "tribal"
  | "playbook"
  | "help";

interface ParsedArgs {
  command: Command;
  query: string;
  mode: ContextMode;
  category?: string;
  limit: number;
  json: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Map<string, string | boolean>();
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const name = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      flags.set(name, true);
      continue;
    }

    flags.set(name, next);
    i += 1;
  }

  const maybeCommand = (positional[0] ?? "startup").toLowerCase();
  const supportedCommands = new Set<Command>([
    "startup",
    "refresh",
    "kernel",
    "locate",
    "drive",
    "full-drive",
    "capability",
    "task",
    "gap",
    "tribal",
    "playbook",
    "help"
  ]);

  const command = supportedCommands.has(maybeCommand as Command)
    ? (maybeCommand as Command)
    : "startup";
  const queryParts = command === "startup" && !supportedCommands.has(maybeCommand as Command)
    ? positional
    : positional.slice(1);

  const modeValue = (flags.get("mode") ?? "minimal").toString().toLowerCase();
  const mode: ContextMode =
    modeValue === "full" || modeValue === "auto" ? (modeValue as ContextMode) : "minimal";
  const query = ((flags.get("query") as string | undefined) ?? queryParts.join(" ")).trim();
  const category = typeof flags.get("category") === "string" ? (flags.get("category") as string) : undefined;
  const limit = Number.parseInt((flags.get("limit") ?? "5").toString(), 10);

  return {
    command,
    query,
    mode,
    category,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 5,
    json: flags.has("json")
  };
}

type AwarenessManifest = Awaited<ReturnType<typeof prismSelfAwarenessEngine.getManifest>>;
type CapabilityList = Awaited<ReturnType<typeof prismSelfAwarenessEngine.findCapabilities>>;
type GapAnalysisResult = Awaited<ReturnType<typeof prismSelfAwarenessEngine.analyzeGaps>>;
type FeatureRecommendations = Awaited<ReturnType<typeof prismSelfAwarenessEngine.recommendAIFeatures>>;
type TribalResults = Awaited<ReturnType<typeof prismSelfAwarenessEngine.searchTribalKnowledge>>;
type PlaybookResults = Awaited<ReturnType<typeof prismSelfAwarenessEngine.searchPlaybookRules>>;

interface DriveLocation {
  path: string;
  type: string;
  category: string;
  description: string;
  fileCount?: number;
  lastModified?: string;
  keywords: string[];
}

const DRIVE_LOCATIONS: DriveLocation[] = [
  {
    path: "H:/PRISM",
    type: "workspace",
    category: "prism",
    description: "Canonical PRISM workspace and shared Claude/Codex coordination root.",
    keywords: ["prism", "workspace", "repo", "roadmap", "shared state"]
  },
  {
    path: "H:/PRISM/mcp-server",
    type: "service",
    category: "prism",
    description: "Canonical MCP server, engines, dispatchers, schemas, tests, and web app.",
    keywords: ["mcp", "server", "engines", "dispatchers", "web", "tests"]
  },
  {
    path: "H:/PRISM/mcp-server/web",
    type: "frontend",
    category: "frontend",
    description: "Canonical Codex frontend tree. H:/PRISM/web is a stale mirror.",
    keywords: ["frontend", "calculator", "studio", "react", "vite", "web"]
  },
  {
    path: "H:/PRISM/JM DIE",
    type: "shop-data",
    category: "jm_die",
    description: "JM Die CNC programs, customers, machines, and manufacturing reference data.",
    keywords: ["jm die", "cnc", "programs", "customers", "lathe", "mill", "wire edm"]
  },
  {
    path: "H:/PRISM/state/shared",
    type: "coordination",
    category: "state",
    description: "Shared Claude/Codex coordination, command bridge, roadmap, queue, and SVI state.",
    keywords: ["shared", "coordination", "roadmap", "queue", "svi", "command bridge"]
  },
  {
    path: "H:/PRISM/.claude/hooks",
    type: "hooks",
    category: "config",
    description: "Canonical Claude hook implementations that Codex mirrors through bridge scripts.",
    keywords: ["hooks", "guards", "awareness", "test", "build", "claude"]
  },
  {
    path: "H:/PRISM/.codex",
    type: "codex-config",
    category: "config",
    description: "Codex-specific AGENTS rules, hooks, tools, and PRISM bridge surfaces.",
    keywords: ["codex", "agents", "hooks", "tools", "skills"]
  }
];

function manifestCounts(manifest: AwarenessManifest) {
  return manifest.counts ?? {
    dispatchers: manifest.stats.dispatcherCount,
    actions: manifest.stats.actionCount,
    engines: manifest.stats.engineCount,
    hooks: manifest.stats.hookCount,
    skills: manifest.stats.skillCount,
    tribalTips: manifest.stats.tribalTipCount,
    formulas: manifest.stats.formulaCount,
    jmDiePrograms: 0,
    jmDieCustomers: 0
  };
}

const prismRoot = path.resolve(process.cwd(), "..");
const sharedStateDir = path.join(prismRoot, "state", "shared");

function normalizePrismPath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, "/");
  normalized = normalized.replace(/^h:\//i, "H:/");
  normalized = normalized.replace(/\/prism\//i, "/PRISM/");
  return normalized;
}

function sharedPath(fileName: string): string {
  return path.join(sharedStateDir, fileName);
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function readText(filePath: string, maxChars = 12000): string {
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  } catch {
    return "";
  }
}

function importantLines(text: string, patterns: RegExp[], limit = 8): string[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines
    .filter(line => patterns.some(pattern => pattern.test(line)))
    .map(line => line.replace(/^-+\s*/, ""))
    .slice(0, limit);
}

function countActiveWork(activeWork: unknown): number {
  if (!activeWork || typeof activeWork !== "object") return 0;
  const record = activeWork as { active?: unknown[]; sessions?: Record<string, unknown> };
  if (Array.isArray(record.active)) return record.active.length;
  if (record.sessions && typeof record.sessions === "object") return Object.keys(record.sessions).length;
  return 0;
}

function buildContextKernel(manifest: AwarenessManifest) {
  const commandRegistry = readJson<{
    generated_at?: string;
    overview?: Record<string, unknown>;
    health?: {
      ok?: boolean;
      missing_command_path_count?: number;
      missing_hook_path_ref_count?: number;
      critical_resolution?: Array<{ slash_command: string; resolved: boolean; path?: string }>;
    };
  }>(sharedPath("claude-codex-command-registry.json"), {});
  const activeWork = readJson<Record<string, unknown>>(sharedPath("ACTIVE_WORK_REGISTRY.json"), {});
  const roadmap = readText(sharedPath("ROADMAP_COLLABORATION_STATE.md"));
  const svi = readText(sharedPath("SVI-compact.md"));
  const workboard = readText(sharedPath("AGENT_WORKBOARD.md"));
  const counts = manifestCounts(manifest);
  const criticalCommands = (commandRegistry.health?.critical_resolution ?? [])
    .filter(command => ["/startup", "/rgs-sync", "/dedup", "/forge-triple", "/compact"].includes(command.slash_command))
    .map(command => ({
      command: command.slash_command,
      resolved: command.resolved,
      path: command.path ? normalizePrismPath(command.path) : null
    }));

  const kernel = {
    schemaVersion: "PRISM_CONTEXT_KERNEL@1.0.0",
    generatedAt: new Date().toISOString(),
    agent: {
      family: "Codex",
      machine: os.hostname(),
      session: process.env.CODEX_THREAD_ID || process.env.CLAUDE_SESSION_ID || process.env.WT_SESSION || `pid-${process.pid}`,
      cwd: normalizePrismPath(process.cwd())
    },
    canonicalPaths: {
      prismRoot: normalizePrismPath(prismRoot),
      mcpServer: normalizePrismPath(path.join(prismRoot, "mcp-server")),
      canonicalWeb: normalizePrismPath(path.join(prismRoot, "mcp-server", "web")),
      staleWebMirror: normalizePrismPath(path.join(prismRoot, "web")),
      sharedState: normalizePrismPath(sharedStateDir),
      projectCommands: normalizePrismPath(path.join(prismRoot, ".claude", "commands")),
      globalCommands: "H:/.claude/commands",
      userCommandMirror: "C:/Users/Mark Villanueva/.claude/commands"
    },
    coordination: {
      activeWorkCount: countActiveWork(activeWork),
      roadmapLines: importantLines(roadmap, [/^- Mode:/, /^- Status:/, /^- Codex:/, /^- Claude:/, /^- Target:/, /^- Next gap-roadmap trigger:/], 8),
      workboardLines: importantLines(workboard, [/^- Agent:/, /^- Current:/, /^- Next:/, /^- Updated:/], 10)
    },
    commandBridge: {
      generatedAt: commandRegistry.generated_at ?? null,
      overview: commandRegistry.overview ?? {},
      ok: commandRegistry.health?.ok ?? false,
      missingCommandPaths: commandRegistry.health?.missing_command_path_count ?? null,
      missingHookPathRefs: commandRegistry.health?.missing_hook_path_ref_count ?? null,
      criticalCommands
    },
    svi: {
      counts: {
        dispatchers: counts.dispatchers,
        actions: counts.actions,
        engines: counts.engines,
        hooks: counts.hooks,
        skills: counts.skills,
        tribalTips: counts.tribalTips,
        formulas: counts.formulas
      },
      liveLines: importantLines(svi, [/^\*\*SVI\*\*/, /^\*\*Reachability/, /^\*\*Trend/, /^\*\*SVI Watch/], 6)
    },
    routingManifest: [
      {
        intent: "startup, reconnect, lost context, broad H-drive orientation",
        prefer: "codex-self-awareness.mjs kernel --mode minimal, then /startup bridge if user invoked slash command",
        fallback: "Read ROADMAP_COLLABORATION_STATE.md, ACTIVE_WORK_REGISTRY.json, CLAUDE-CODEX-COMMAND-BRIDGE.md, SVI-compact.md"
      },
      {
        intent: "new capability, new engine, hook, skill, script, formula, algorithm",
        prefer: "/dedup first, then /forge-triple only when the capability is genuinely new",
        fallback: "Extend existing engine/hook/skill and update command bridge/capability index"
      },
      {
        intent: "MCP server development, build, smoke test, SVI",
        prefer: "prism_dev actions: session_boot, build, test_smoke, test_results, svi_read, svi_compute",
        fallback: "REST mirrors under /api/v1/dev/* or targeted npm/node scripts when MCP tools are not exposed"
      },
      {
        intent: "codebase orientation, locating routes, engines, dispatchers, dependencies",
        prefer: "shared index surfaces: MASTER_INDEX_COMPACT, DIRECTORY_DIGEST, ENGINE_DIGEST, DISPATCHER_DIGEST, CODE_SYSTEM_INDEX",
        fallback: "targeted file reads; avoid broad recursive search unless indexes are insufficient"
      },
      {
        intent: "frontend/calculator/app work",
        prefer: "mcp-server/web canonical tree plus Codex frontend reference scrutiny before touching stale H:/PRISM/web mirror",
        fallback: "shared roadmap and API route sync report for backend contract gaps"
      },
      {
        intent: "manufacturing calculation validation",
        prefer: "cutting-calculation protocol, physics canonical constants, deep reasoning/cross-disciplinary engines, reputable manufacturer baselines",
        fallback: "flag uncertainty and add validation data before tuning formulas"
      },
      {
        intent: "PDF/document or video/tutorial learning",
        prefer: "/pdf-learn for documents, /video-learn for video/tutorial sources",
        fallback: "manual extraction only when the command pipeline is unavailable"
      },
      {
        intent: "quality review, missing tests, synthetic/stub test risk",
        prefer: "test-legitimacy hooks, stop_on_missing_tests, prism-review skill, real-engine validation",
        fallback: "manual code review with explicit residual risk notes"
      }
    ],
    warmStartProtocol: [
      "Read ROADMAP_COLLABORATION_STATE.md before opening new roadmap work.",
      "Read ACTIVE_WORK_REGISTRY.json and AGENT_WORKBOARD.md before overlapping another session.",
      "Prefer command bridge and shared index surfaces before broad filesystem search.",
      "Use /dedup before creating engines, hooks, skills, scripts, formulas, algorithms, or commands.",
      "Use codex-self-awareness.mjs capability/task/gap before assuming PRISM lacks a capability.",
      "Preserve Codex frontend-first lane unless the user explicitly asks for cross-lane backend work."
    ]
  };

  return kernel;
}

function formatContextKernel(kernel: ReturnType<typeof buildContextKernel>): string {
  const roadmap = kernel.coordination.roadmapLines.length
    ? kernel.coordination.roadmapLines.map(line => `- ${line}`).join("\n")
    : "- Roadmap state not readable.";
  const svi = kernel.svi.liveLines.length
    ? kernel.svi.liveLines.map(line => `- ${line}`).join("\n")
    : "- SVI compact state not readable.";
  const commands = kernel.commandBridge.criticalCommands.length
    ? kernel.commandBridge.criticalCommands
        .map(command => `- ${command.command}: ${command.resolved ? "resolved" : "missing"}${command.path ? ` -> ${command.path}` : ""}`)
        .join("\n")
    : "- Critical command resolution not readable.";

  return [
    "PRISM_CONTEXT_KERNEL",
    `Generated: ${kernel.generatedAt}`,
    `Agent: ${kernel.agent.family}@${kernel.agent.machine}/${kernel.agent.session}`,
    `Root: ${kernel.canonicalPaths.prismRoot}`,
    "",
    "Coordination Gate",
    roadmap,
    "",
    "SVI / Reachability",
    svi,
    "",
    "Command Bridge",
    `- ok: ${kernel.commandBridge.ok}`,
    `- hooks: ${String(kernel.commandBridge.overview.hook_entries ?? "unknown")}`,
    `- missing command paths: ${String(kernel.commandBridge.missingCommandPaths ?? "unknown")}`,
    `- missing hook refs: ${String(kernel.commandBridge.missingHookPathRefs ?? "unknown")}`,
    commands,
    "",
    "Canonical Paths",
    `- MCP server: ${kernel.canonicalPaths.mcpServer}`,
    `- Canonical web: ${kernel.canonicalPaths.canonicalWeb}`,
    `- Stale web mirror: ${kernel.canonicalPaths.staleWebMirror}`,
    `- Shared state: ${kernel.canonicalPaths.sharedState}`,
    "",
    "Routing Manifest",
    ...kernel.routingManifest.map(route => `- ${route.intent} -> ${route.prefer}`),
    "",
    "Warm-Start Protocol",
    ...kernel.warmStartProtocol.map(rule => `- ${rule}`)
  ].join("\n");
}

function summarizeManifest(manifest: AwarenessManifest) {
  return {
    generatedAt: manifest.lastUpdated,
    counts: manifestCounts(manifest),
    topEngines: manifest.engines.slice(0, 6).map((engine) => engine.name),
    topDispatchers: manifest.dispatchers.slice(0, 6).map((dispatcher) => ({
      name: dispatcher.name,
      actions: dispatcher.actions.length
    }))
  };
}

function printHuman(text: string): void {
  process.stdout.write(text.trimEnd() + "\n");
}

function emit(payload: unknown, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  if (typeof payload === "string") {
    printHuman(payload);
    return;
  }

  printHuman(JSON.stringify(payload, null, 2));
}

function requireQuery(query: string, command: Command): void {
  if (query) {
    return;
  }

  const examples: Record<string, string> = {
    locate: "locate \"JM DIE\"",
    capability: "capability \"calculate cutting force\"",
    task: "task \"quote this part\"",
    gap: "gap \"analyze a feature we may not support yet\"",
    tribal: "tribal \"thin wall milling\"",
    playbook: "playbook \"roughing depth\""
  };

  throw new Error(`Missing query for '${command}'. Example: ${examples[command] ?? `${command} <query>`}`);
}

function matchesDriveLocation(location: DriveLocation, query: string): boolean {
  const value = query.toLowerCase();
  return [
    location.path,
    location.type,
    location.category,
    location.description,
    ...location.keywords
  ].some(item => item.toLowerCase().includes(value) || value.includes(item.toLowerCase()));
}

function getDriveLocations(category?: string): DriveLocation[] {
  if (!category) {
    return DRIVE_LOCATIONS;
  }
  const value = category.toLowerCase();
  return DRIVE_LOCATIONS.filter(location => location.category.toLowerCase() === value);
}

function findDriveLocation(query: string): DriveLocation | null {
  return DRIVE_LOCATIONS.find(location => matchesDriveLocation(location, query)) ?? null;
}

function formatFullDriveAwareness(): string {
  return [
    "PRISM indexed drive awareness",
    ...DRIVE_LOCATIONS.map(location => `- [${location.category}] ${location.path} :: ${location.description}`)
  ].join("\n");
}

function formatDriveLocation(location: {
  path: string;
  type: string;
  category: string;
  description: string;
  fileCount?: number;
  lastModified?: string;
  keywords: string[];
}): string {
  const lines = [
    `Path: ${location.path}`,
    `Category: ${location.category}`,
    `Type: ${location.type}`,
    `Description: ${location.description}`
  ];

  if (typeof location.fileCount === "number") {
    lines.push(`Indexed files: ${location.fileCount}`);
  }

  if (location.lastModified) {
    lines.push(`Last modified: ${location.lastModified}`);
  }

  lines.push(`Keywords: ${location.keywords.join(", ")}`);
  return lines.join("\n");
}

function formatCapabilityMatches(query: string, results: CapabilityList): string {
  const lines = [
    `Capability matches for "${query}"`,
    `Matches: ${results.length}`
  ];

  if (!results.length) {
    lines.push("No capability matches found.");
    return lines.join("\n");
  }

  for (const [index, match] of results.slice(0, 10).entries()) {
    const source = match.engine ? "engine" : match.dispatcher ? "action" : "capability";
    const target = match.dispatcher && match.action ? `${match.dispatcher}:${match.action}` : match.capability;
    lines.push(
      `${index + 1}. ${target} (${match.confidence.toFixed(2)}, ${source})${match.path ? ` -> ${match.path}` : ""}`
    );
  }

  return lines.join("\n");
}

function formatTaskMatch(query: string, matches: CapabilityList, recommendations: FeatureRecommendations): string {
  if (!matches.length && !recommendations.length) {
    return `No direct PRISM action match found for "${query}".`;
  }

  const top = matches[0];
  const lines = [
    `Best action path for "${query}"`,
    top
      ? `${top.dispatcher && top.action ? `${top.dispatcher}:${top.action}` : top.capability} (${top.confidence.toFixed(2)})`
      : "No direct action match; using feature recommendations."
  ];

  const alternatives = matches.slice(1, 4);
  if (alternatives.length > 0) {
    lines.push(
      `Alternatives: ${alternatives
        .map(alt => `${alt.dispatcher && alt.action ? `${alt.dispatcher}:${alt.action}` : alt.capability} (${alt.confidence.toFixed(2)})`)
        .join(", ")}`
    );
  }

  if (recommendations.length > 0) {
    lines.push(
      `AI feature route: ${recommendations
        .slice(0, 3)
        .map(rec => `${rec.feature} (${rec.priority.toFixed(2)})`)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}

function formatGap(query: string, gap: GapAnalysisResult): string {
  const lines = [
    `Gap analysis for "${query}"`,
    `Can handle: ${gap.hasCapability ? "yes" : "no"} (${gap.confidence.toFixed(2)})`,
    `Top matches: ${gap.matches.slice(0, 3).map(match => match.capability).join(", ") || "none"}`
  ];

  if (gap.suggestions.length > 0) {
    lines.push(`Suggestions: ${gap.suggestions.join(", ")}`);
  }

  if (gap.missingCapabilities.length > 0) {
    lines.push(`Missing terms: ${gap.missingCapabilities.join(", ")}`);
  }

  return lines.join("\n");
}

function formatDriveList(category: string | undefined): string {
  const locations = getDriveLocations(category);

  const lines = [
    category ? `Indexed H: drive locations in category "${category}"` : "Indexed H: drive locations"
  ];

  for (const location of locations) {
    const suffix = typeof location.fileCount === "number" ? ` (${location.fileCount} files)` : "";
    lines.push(`- [${location.category}] ${location.path}${suffix} :: ${location.description}`);
  }

  if (locations.length === 0) {
    lines.push("No indexed locations matched.");
  }

  return lines.join("\n");
}

function formatTribal(query: string, results: TribalResults): string {
  const lines = [`Tribal knowledge matches for "${query}"`];

  if (results.length === 0) {
    lines.push("No tribal knowledge matches found.");
    return lines.join("\n");
  }

  for (const [index, result] of results.entries()) {
    lines.push(
      `${index + 1}. ${result.tip} (${result.confidence.toFixed(2)}) — ${result.category} :: ${result.source}`
    );
  }

  return lines.join("\n");
}

function formatPlaybook(query: string, results: PlaybookResults): string {
  const lines = [`Playbook rule matches for "${query}"`];

  if (results.length === 0) {
    lines.push("No playbook rule matches found.");
    return lines.join("\n");
  }

  for (const [index, result] of results.entries()) {
    lines.push(`${index + 1}. ${result}`);
  }

  return lines.join("\n");
}

function helpText(): string {
  return [
    "PRISM Codex Self-Awareness Helper",
    "",
    "Commands:",
    "  startup [--mode minimal|full|auto] [--json]",
    "  refresh [--mode minimal|full|auto] [--json]",
    "  kernel [--mode minimal|full|auto] [--json]",
    "  locate <query> [--json]",
    "  drive [--category prism|jm_die|state|config|data|archive|temp] [--json]",
    "  full-drive [--json]",
    "  capability <query> [--json]",
    "  task <query> [--json]",
    "  gap <query> [--json]",
    "  tribal <query> [--limit N] [--json]",
    "  playbook <query> [--limit N] [--json]"
  ].join("\n");
}

async function runStartup(args: ParsedArgs): Promise<void> {
  const result = await runSelfAwarenessStartup({
    contextMode: args.mode,
    reportToStdout: false
  });

  if (!result.success || !result.manifest) {
    throw new Error(result.message);
  }

  const selectedMode = result.contextSize === "full" ? "full" : "minimal";
  const context = getSelfAwarenessContext(selectedMode);
  const counts = manifestCounts(result.manifest);
  const payload = {
    ok: true,
    command: "startup",
    quick: quickSelfAwarenessCheck(),
    message: result.message,
    contextSize: result.contextSize,
    timing: result.timing,
    manifest: summarizeManifest(result.manifest),
    additionalContext: context
  };

  if (args.json) {
    emit(payload, true);
    return;
  }

  printHuman(
    [
      "PRISM self-awareness refreshed",
      `Quick: ${payload.quick}`,
      `Context: ${payload.contextSize}`,
      `Counts: ${counts.dispatchers} dispatchers | ${counts.actions} actions | ${counts.engines} engines`,
      `H-drive: ${counts.jmDiePrograms} JM DIE programs | ${counts.jmDieCustomers} customers | ${counts.tribalTips} tribal tips`,
      `Timing: ${result.timing.totalMs}ms`,
      "",
      context
    ].join("\n")
  );
}

async function runKernel(args: ParsedArgs): Promise<void> {
  const result = await runSelfAwarenessStartup({
    contextMode: args.mode,
    reportToStdout: false
  });

  if (!result.success || !result.manifest) {
    throw new Error(result.message);
  }

  const kernel = buildContextKernel(result.manifest);
  const additionalContext = formatContextKernel(kernel);

  if (args.json) {
    emit({ ok: true, command: "kernel", kernel, additionalContext }, true);
    return;
  }

  printHuman(additionalContext);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "startup":
    case "refresh":
      await runStartup(args);
      return;
    case "kernel":
      await runKernel(args);
      return;
    case "locate": {
      requireQuery(args.query, args.command);
      const location = findDriveLocation(args.query);

      if (!location) {
        emit(
          args.json
            ? { ok: false, command: "locate", query: args.query, message: "No indexed H: drive location matched." }
            : `No indexed H: drive location matched "${args.query}".`,
          args.json
        );
        return;
      }

      emit(
        args.json
          ? { ok: true, command: "locate", query: args.query, location }
          : `Drive location match for "${args.query}"\n${formatDriveLocation(location)}`,
        args.json
      );
      return;
    }
    case "drive":
      emit(
        args.json
          ? {
              ok: true,
              command: "drive",
              category: args.category ?? null,
              locations: getDriveLocations(args.category)
            }
          : formatDriveList(args.category),
        args.json
      );
      return;
    case "full-drive":
      emit(
        args.json ? { ok: true, command: "full-drive", locations: DRIVE_LOCATIONS } : formatFullDriveAwareness(),
        args.json
      );
      return;
    case "capability": {
      requireQuery(args.query, args.command);
      const results = await prismSelfAwarenessEngine.findCapabilities(args.query);
      emit(
        args.json
          ? { ok: true, command: "capability", query: args.query, results }
          : formatCapabilityMatches(args.query, results),
        args.json
      );
      return;
    }
    case "task": {
      requireQuery(args.query, args.command);
      const matches = await prismSelfAwarenessEngine.findCapabilities(args.query);
      const recommendations = await prismSelfAwarenessEngine.recommendAIFeatures(args.query);
      emit(
        args.json
          ? { ok: true, command: "task", query: args.query, matches, recommendations }
          : formatTaskMatch(args.query, matches, recommendations),
        args.json
      );
      return;
    }
    case "gap": {
      requireQuery(args.query, args.command);
      const gap = await prismSelfAwarenessEngine.analyzeGaps(args.query);
      emit(
        args.json
          ? { ok: true, command: "gap", query: args.query, gap }
          : formatGap(args.query, gap),
        args.json
      );
      return;
    }
    case "tribal":
      requireQuery(args.query, args.command);
      {
        const results = (await prismSelfAwarenessEngine.searchTribalKnowledge(args.query)).slice(0, args.limit);
        emit(
          args.json
            ? { ok: true, command: "tribal", query: args.query, results }
            : formatTribal(args.query, results),
          args.json
        );
        return;
      }
    case "playbook":
      requireQuery(args.query, args.command);
      {
        const results = (await prismSelfAwarenessEngine.searchPlaybookRules(args.query)).slice(0, args.limit);
        emit(
          args.json
            ? { ok: true, command: "playbook", query: args.query, results }
            : formatPlaybook(args.query, results),
          args.json
        );
        return;
      }
    case "help":
      emit(helpText(), false);
      return;
    default:
      emit(helpText(), false);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown self-awareness error"}\n`);
  process.exit(1);
});
