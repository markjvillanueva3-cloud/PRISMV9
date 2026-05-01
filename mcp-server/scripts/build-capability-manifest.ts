/**
 * build-capability-manifest.ts — CAPABILITY_MANIFEST.json composer
 *
 * Phase 0.17 U-PLG10 from MASTER-AI-SYSTEM-ROADMAP. Aggregates the three
 * Phase 0.17 registries (agents, slash commands, plugins) + Phase 0.13
 * self-awareness counts into a single session-scope manifest so `/aware`
 * and any boot-context hook can answer "what can I reach?" in one read.
 *
 * Sources (all canonical upstream):
 *   AGENT_REGISTRY.json            — U-PLG1 (134 agents)
 *   SLASH_COMMAND_REGISTRY.json    — U-PLG2 (307 commands)
 *   PLUGIN_INVENTORY.json          — U-PLG3 (8 plugins)
 *   SELF_AWARENESS_MANIFEST.json   — Phase 0.13 counts (2528 engines, …)
 *
 * Output: mcp-server/data/state/CAPABILITY_MANIFEST.json
 *   The manifest is a *pointer* — arrays hold the top-K items by
 *   trigger/category heat, with full lists addressable via their source
 *   paths. Keeps the file small (<64 KB) so boot hooks can slurp it.
 *
 * Usage: npx tsx mcp-server/scripts/build-capability-manifest.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

interface AgentEntry { name: string; category: string; costTier?: string; description?: string; triggers?: string[]; }
interface CommandEntry { name: string; category?: string; description?: string; triggers?: string[]; }
interface PluginEntry { id: string; name: string; kind: string; description?: string; health?: string; }

// Script runs from mcp-server/ (package root) per the other build scripts.
// If run from repo root, fall back to mcp-server/data/state.
const STATE_DIR = existsSync(path.resolve(process.cwd(), "data", "state"))
  ? path.resolve(process.cwd(), "data", "state")
  : path.resolve(process.cwd(), "mcp-server", "data", "state");

function loadJson<T>(file: string, fallback: T): T {
  const p = path.join(STATE_DIR, file);
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, "utf8")) as T; }
  catch { return fallback; }
}

function topBy<T>(list: T[], limit: number, score: (e: T) => number): T[] {
  return [...list].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

function main() {
  const agentsDoc = loadJson<{ entries?: AgentEntry[] }>("AGENT_REGISTRY.json", {});
  const commandsDoc = loadJson<{ entries?: CommandEntry[] }>("SLASH_COMMAND_REGISTRY.json", {});
  const pluginsDoc = loadJson<{ entries?: PluginEntry[] }>("PLUGIN_INVENTORY.json", {});
  const awarenessDoc = loadJson<{ counts?: Record<string, number>; version?: string }>("SELF_AWARENESS_MANIFEST.json", {});

  const agents = agentsDoc.entries ?? [];
  const commands = commandsDoc.entries ?? [];
  const plugins = pluginsDoc.entries ?? [];

  const agentsByCategory: Record<string, number> = {};
  for (const a of agents) agentsByCategory[a.category] = (agentsByCategory[a.category] || 0) + 1;

  const commandsByCategory: Record<string, number> = {};
  for (const c of commands) {
    const k = c.category ?? "uncategorized";
    commandsByCategory[k] = (commandsByCategory[k] || 0) + 1;
  }

  const pluginsByKind: Record<string, number> = {};
  for (const p of plugins) pluginsByKind[p.kind] = (pluginsByKind[p.kind] || 0) + 1;

  // Pick agents most likely to matter for Phase 0 manufacturing work:
  // prefer non-general-purpose, high trigger counts (more routable).
  const topAgents = topBy(
    agents.filter((a) => a.name !== "general-purpose"),
    30,
    (a) => (a.triggers?.length ?? 0) * 10 + (a.description?.length ? 1 : 0),
  ).map((a) => ({
    name: a.name,
    category: a.category,
    triggers: a.triggers ?? [],
    costTier: a.costTier ?? "unknown",
  }));

  const topCommands = topBy(commands, 40, (c) => (c.triggers?.length ?? 0)).map((c) => ({
    name: c.name,
    category: c.category ?? null,
    triggers: c.triggers ?? [],
  }));

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    note: "Session-scope capability manifest. Pointer index into AGENT_REGISTRY, SLASH_COMMAND_REGISTRY, PLUGIN_INVENTORY. Full lists at source paths.",
    selfAwareness: {
      version: awarenessDoc.version ?? "unknown",
      counts: awarenessDoc.counts ?? {},
    },
    agents: {
      source: "mcp-server/data/state/AGENT_REGISTRY.json",
      total: agents.length,
      byCategory: agentsByCategory,
      top: topAgents,
    },
    slashCommands: {
      source: "mcp-server/data/state/SLASH_COMMAND_REGISTRY.json",
      total: commands.length,
      byCategory: commandsByCategory,
      top: topCommands,
    },
    mcps: {
      source: "mcp-server/data/state/PLUGIN_INVENTORY.json",
      total: plugins.length,
      byKind: pluginsByKind,
      servers: plugins.filter((p) => p.kind === "mcp-server").map((p) => ({
        name: p.name,
        description: p.description ?? null,
        health: p.health ?? "unknown",
      })),
    },
  };

  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  const outPath = path.join(STATE_DIR, "CAPABILITY_MANIFEST.json");
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log(`[build-capability-manifest] wrote ${outPath}`);
  console.log(
    `  agents=${agents.length} commands=${commands.length} mcps=${plugins.filter((p) => p.kind === "mcp-server").length}`,
  );
  console.log(
    `  bundle size: ${(JSON.stringify(manifest).length / 1024).toFixed(1)} KB`,
  );
}

main();
