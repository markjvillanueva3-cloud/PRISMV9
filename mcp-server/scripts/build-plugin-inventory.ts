/**
 * build-plugin-inventory.ts — PluginInventoryEngine data seed
 *
 * Phase 0.17 U-PLG3 from MASTER-AI-SYSTEM-ROADMAP. Builds a single-pane
 * inventory of MCP servers, agent plugins, extensions, and skill packs
 * reachable from this Claude/Codex session.
 *
 * Sources scanned:
 *   1. H:/prism/.mcp.json            — project MCP servers
 *   2. ~/.claude.json (mcpServers)   — user-level MCP servers (best-effort)
 *   3. ~/.claude/plugins/            — installed agent plugins (superpowers,
 *      pr-review-toolkit, feature-dev, hookify, figma, supabase, etc.)
 *   4. ~/.claude/commands/ subfolders — skill-pack namespaces (sparc, github,
 *      automation, monitoring, analysis, optimization, hooks)
 *
 * Output: mcp-server/data/state/PLUGIN_INVENTORY.json (schema v1)
 *
 * Usage: npx tsx mcp-server/scripts/build-plugin-inventory.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

type PluginKind = "mcp-server" | "agent-plugin" | "extension" | "skill-pack";

interface PluginEntry {
  id: string;
  name: string;
  kind: PluginKind;
  version?: string;
  description?: string;
  health?: "healthy" | "degraded" | "unreachable" | "unknown";
  toolCount?: number;
  tags?: string[];
  source: string;
}

const entries: PluginEntry[] = [];

// ── 1. Project .mcp.json ─────────────────────────────────────────────────────
function scanProjectMcp() {
  const p = path.resolve("H:/prism/.mcp.json");
  if (!existsSync(p)) return;
  try {
    const doc = JSON.parse(readFileSync(p, "utf-8"));
    const servers = doc.mcpServers || {};
    for (const [id, cfg] of Object.entries<any>(servers)) {
      entries.push({
        id: `mcp:${id}`,
        name: id,
        kind: "mcp-server",
        description: cfg.type ? `stdio MCP server (${cfg.type})` : "MCP server",
        health: "unknown",
        source: ".mcp.json",
        tags: ["project"],
      });
    }
  } catch (err) {
    console.warn(`scanProjectMcp failed: ${(err as Error).message}`);
  }
}

// ── 2. User-level ~/.claude.json ─────────────────────────────────────────────
function scanUserMcp() {
  const p = path.join(homedir(), ".claude.json");
  if (!existsSync(p)) return;
  try {
    const doc = JSON.parse(readFileSync(p, "utf-8"));
    const servers = doc.mcpServers || {};
    for (const [id, cfg] of Object.entries<any>(servers)) {
      if (entries.some((e) => e.name === id && e.kind === "mcp-server")) continue; // dedupe
      entries.push({
        id: `mcp-user:${id}`,
        name: id,
        kind: "mcp-server",
        description: "User-level MCP server",
        health: "unknown",
        source: "~/.claude.json",
        tags: ["user"],
      });
    }
  } catch (err) {
    console.warn(`scanUserMcp failed: ${(err as Error).message}`);
  }
}

// ── 3. ~/.claude/plugins/ ────────────────────────────────────────────────────
function scanPlugins() {
  const root = path.join(homedir(), ".claude", "plugins");
  if (!existsSync(root)) return;
  try {
    const names = readdirSync(root);
    for (const name of names) {
      if (name.startsWith(".") || name.startsWith("_")) continue;
      const dir = path.join(root, name);
      let st;
      try { st = statSync(dir); } catch { continue; }
      if (!st.isDirectory()) continue;

      let description = `Claude Code plugin: ${name}`;
      let version: string | undefined;
      const pluginJson = path.join(dir, "plugin.json");
      if (existsSync(pluginJson)) {
        try {
          const doc = JSON.parse(readFileSync(pluginJson, "utf-8"));
          if (typeof doc.description === "string") description = doc.description;
          if (typeof doc.version === "string") version = doc.version;
        } catch { /* swallow */ }
      }

      entries.push({
        id: `plugin:${name}`,
        name,
        kind: "agent-plugin",
        description,
        version,
        health: "unknown",
        source: "~/.claude/plugins/",
        tags: ["claude-code"],
      });
    }
  } catch (err) {
    console.warn(`scanPlugins failed: ${(err as Error).message}`);
  }
}

// ── 4. Slash-command skill packs (subfolders of ~/.claude/commands/) ─────────
function scanSkillPacks() {
  const root = path.join(homedir(), ".claude", "commands");
  if (!existsSync(root)) return;
  try {
    const names = readdirSync(root);
    for (const name of names) {
      const full = path.join(root, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (!st.isDirectory()) continue;
      // Count .md children
      let toolCount = 0;
      try {
        toolCount = readdirSync(full).filter((f) => f.endsWith(".md")).length;
      } catch { /* swallow */ }
      if (toolCount === 0) continue;
      entries.push({
        id: `skillpack:${name}`,
        name,
        kind: "skill-pack",
        description: `Slash-command namespace with ${toolCount} commands`,
        health: "healthy",
        toolCount,
        source: "~/.claude/commands/",
        tags: ["slash-commands"],
      });
    }
  } catch (err) {
    console.warn(`scanSkillPacks failed: ${(err as Error).message}`);
  }
}

function main() {
  scanProjectMcp();
  scanUserMcp();
  scanPlugins();
  scanSkillPacks();
  entries.sort((a, b) => a.id.localeCompare(b.id));

  const byKind: Record<string, number> = {};
  for (const e of entries) byKind[e.kind] = (byKind[e.kind] || 0) + 1;

  const doc = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalPlugins: entries.length,
    byKind,
    entries,
  };

  const outDir = path.resolve(process.cwd(), "data", "state");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "PLUGIN_INVENTORY.json");
  writeFileSync(outPath, JSON.stringify(doc, null, 2));

  console.log(`[build-plugin-inventory] wrote ${entries.length} plugins to ${outPath}`);
  console.log(`  byKind: ${Object.entries(byKind).map(([k, v]) => `${k}=${v}`).join(", ")}`);
}

main();
