#!/usr/bin/env node
/**
 * codex-self-awareness-runner.ts
 *
 * Live bridge into PRISM's self-awareness system for Codex.
 * Supports startup refresh, H: drive lookup, and capability routing queries.
 */

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

function summarizeManifest(manifest: ReturnType<typeof prismSelfAwarenessEngine.getManifest>) {
  return {
    generatedAt: manifest.generatedAt,
    counts: manifest.counts,
    topCapabilities: {
      calculation: manifest.topCapabilities.calculation.slice(0, 4),
      business: manifest.topCapabilities.business.slice(0, 3),
      cam: manifest.topCapabilities.cam.slice(0, 3)
    }
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

function formatCapabilityMatches(query: string, results: ReturnType<typeof prismSelfAwarenessEngine.whatCanIDo>): string {
  const lines = [
    `Capability matches for "${query}"`,
    `Confidence: ${results.confidence.toFixed(2)} | Processing: ${results.processingMs}ms`
  ];

  if (!results.results.length) {
    lines.push("No capability matches found.");
    return lines.join("\n");
  }

  for (const [index, match] of results.results.entries()) {
    lines.push(
      `${index + 1}. ${match.fullAction} (${match.confidence.toFixed(2)}, ${match.source}) — ${match.description}`
    );
  }

  return lines.join("\n");
}

function formatTaskMatch(query: string, match: ReturnType<typeof prismSelfAwarenessEngine.howDoI>): string {
  if (!match) {
    return `No direct PRISM action match found for "${query}".`;
  }

  const lines = [
    `Best action for "${query}"`,
    `${match.fullAction} (${match.confidence.toFixed(2)}, ${match.source})`,
    match.description
  ];

  if (match.alternatives.length > 0) {
    lines.push(
      `Alternatives: ${match.alternatives
        .slice(0, 3)
        .map(alt => `${alt.fullAction} (${alt.confidence.toFixed(2)})`)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}

function formatGap(query: string, gap: ReturnType<typeof prismSelfAwarenessEngine.analyzeGap>): string {
  const lines = [
    `Gap analysis for "${query}"`,
    `Can handle: ${gap.canHandle ? "yes" : "no"} (${gap.confidence.toFixed(2)})`,
    `Reason: ${gap.reason}`
  ];

  if (gap.suggestions.length > 0) {
    lines.push(`Suggestions: ${gap.suggestions.join(", ")}`);
  }

  if (gap.externalSources && gap.externalSources.length > 0) {
    lines.push(
      `External sources: ${gap.externalSources
        .slice(0, 3)
        .map(source => `${source.name} (${source.type}, ${source.trustLevel.toFixed(2)})`)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}

function formatDriveList(category: string | undefined): string {
  const locations = category
    ? prismSelfAwarenessEngine.getDriveLocationsByCategory(category as never)
    : prismSelfAwarenessEngine.getDriveLocations();

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

function formatTribal(query: string, limit: number): string {
  const results = prismSelfAwarenessEngine.searchTribalKnowledge(query, { limit });
  const lines = [`Tribal knowledge matches for "${query}"`];

  if (results.length === 0) {
    lines.push("No tribal knowledge matches found.");
    return lines.join("\n");
  }

  for (const [index, result] of results.entries()) {
    lines.push(
      `${index + 1}. ${result.title} (${result.confidence.toFixed(2)}) — ${result.category} :: ${result.source}`
    );
  }

  return lines.join("\n");
}

function formatPlaybook(query: string, limit: number): string {
  const results = prismSelfAwarenessEngine.searchPlaybookRules(query, { limit });
  const lines = [`Playbook rule matches for "${query}"`];

  if (results.length === 0) {
    lines.push("No playbook rule matches found.");
    return lines.join("\n");
  }

  for (const [index, result] of results.entries()) {
    lines.push(`${index + 1}. ${result.title} (${result.severity}) — ${result.reasoning}`);
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
      `Counts: ${result.manifest.counts.dispatchers} dispatchers | ${result.manifest.counts.actions} actions | ${result.manifest.counts.engines} engines`,
      `H-drive: ${result.manifest.counts.jmDiePrograms} JM DIE programs | ${result.manifest.counts.jmDieCustomers} customers | ${result.manifest.counts.tribalTips} tribal tips`,
      `Timing: ${result.timing.totalMs}ms`,
      "",
      context
    ].join("\n")
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "startup":
    case "refresh":
      await runStartup(args);
      return;
    case "locate": {
      requireQuery(args.query, args.command);
      const location = prismSelfAwarenessEngine.findDriveLocation(args.query);

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
              locations: args.category
                ? prismSelfAwarenessEngine.getDriveLocationsByCategory(args.category as never)
                : prismSelfAwarenessEngine.getDriveLocations()
            }
          : formatDriveList(args.category),
        args.json
      );
      return;
    case "full-drive":
      emit(
        args.json
          ? { ok: true, command: "full-drive", awareness: prismSelfAwarenessEngine.getFullDriveAwareness() }
          : prismSelfAwarenessEngine.getFullDriveAwareness(),
        args.json
      );
      return;
    case "capability": {
      requireQuery(args.query, args.command);
      const results = prismSelfAwarenessEngine.whatCanIDo(args.query);
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
      const match = prismSelfAwarenessEngine.howDoI(args.query);
      emit(
        args.json
          ? { ok: true, command: "task", query: args.query, match }
          : formatTaskMatch(args.query, match),
        args.json
      );
      return;
    }
    case "gap": {
      requireQuery(args.query, args.command);
      const gap = prismSelfAwarenessEngine.analyzeGap(args.query);
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
      emit(
        args.json
          ? {
              ok: true,
              command: "tribal",
              query: args.query,
              results: prismSelfAwarenessEngine.searchTribalKnowledge(args.query, { limit: args.limit })
            }
          : formatTribal(args.query, args.limit),
        args.json
      );
      return;
    case "playbook":
      requireQuery(args.query, args.command);
      emit(
        args.json
          ? {
              ok: true,
              command: "playbook",
              query: args.query,
              results: prismSelfAwarenessEngine.searchPlaybookRules(args.query, { limit: args.limit })
            }
          : formatPlaybook(args.query, args.limit),
        args.json
      );
      return;
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
