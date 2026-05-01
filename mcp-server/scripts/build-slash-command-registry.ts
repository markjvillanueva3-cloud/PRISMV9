/**
 * build-slash-command-registry.ts — Phase 0.17 U-PLG2 data seed
 *
 * Scans ~/.claude/commands/*.md, parses frontmatter (when present) and
 * derives heuristic triggers when missing, and writes
 * mcp-server/data/state/SLASH_COMMAND_REGISTRY.json.
 *
 * The JSON is consumed at runtime by SlashCommandRecommenderEngine.registerAll()
 * to enable "all input commands routable to the AI system" via prism_ai.
 *
 * Usage: npx tsx mcp-server/scripts/build-slash-command-registry.ts
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const STOPWORDS = new Set([
  "the","a","an","and","or","but","for","of","in","to","is","on","with","at",
  "by","from","as","it","this","that","be","are","was","were","so","you","we",
  "your","our","run","use","using","when","any","all","new","get","via","per",
  "see","also","eg","ie","each","into","no","not","do","does","don","can",
]);

interface CommandEntry {
  command: string;
  description: string;
  triggers: string[];
  tags?: string[];
  invocationCount?: number;
}

function parseFrontmatter(body: string): { meta: Record<string, unknown>; rest: string } {
  if (!body.startsWith("---")) return { meta: {}, rest: body };
  const end = body.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, rest: body };
  const yaml = body.slice(3, end).trim();
  const rest = body.slice(end + 4).trimStart();
  const meta: Record<string, unknown> = {};
  let currentKey: string | null = null;
  const listBuf: string[] = [];
  for (const raw of yaml.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    if (line.startsWith("  - ")) {
      if (currentKey) listBuf.push(stripQuotes(line.slice(4).trim()));
      continue;
    }
    if (currentKey && listBuf.length && !line.startsWith("  ")) {
      meta[currentKey] = [...listBuf];
      listBuf.length = 0;
      currentKey = null;
    }
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val === "") {
      currentKey = key;
      listBuf.length = 0;
    } else {
      meta[key] = stripQuotes(val);
      currentKey = null;
    }
  }
  if (currentKey && listBuf.length) meta[currentKey] = [...listBuf];
  return { meta, rest };
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function extractDescription(meta: Record<string, unknown>, rest: string, commandName: string): string {
  if (typeof meta.description === "string" && meta.description.trim()) {
    return meta.description.trim();
  }
  const lines = rest.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const title = line.replace(/^#+\s*/, "");
      const dashIdx = title.search(/[—-]/);
      if (dashIdx > 0) {
        const tail = title.slice(dashIdx + 1).trim();
        if (tail) return tail;
      }
      continue;
    }
    const cleaned = line.replace(/\*\*/g, "").trim();
    if (cleaned.length > 10 && !cleaned.startsWith("```") && !cleaned.startsWith("//")) {
      return cleaned.slice(0, 240);
    }
  }
  return `Slash command /${commandName}`;
}

function deriveTriggers(commandName: string, description: string, meta: Record<string, unknown>): string[] {
  const fromMeta = Array.isArray(meta.triggers)
    ? (meta.triggers as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
  const set = new Set<string>();
  for (const t of fromMeta) set.add(t.toLowerCase().trim());
  for (const tok of commandName.split(/[-_]/)) {
    if (tok.length > 1) set.add(tok.toLowerCase());
  }
  set.add(commandName.toLowerCase());
  const descTokens = (description.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? [])
    .filter((t) => !STOPWORDS.has(t) && t.length >= 3)
    .slice(0, 6);
  for (const t of descTokens) set.add(t);
  return [...set];
}

function buildEntry(filePath: string): CommandEntry | null {
  const base = path.basename(filePath, ".md");
  if (base.startsWith("_") || base.toLowerCase() === "readme") return null;
  const body = readFileSync(filePath, "utf8");
  const { meta, rest } = parseFrontmatter(body);
  const metaName = typeof meta.name === "string" ? meta.name : base;
  const command = metaName.startsWith("/") ? metaName : `/${metaName}`;
  const description = extractDescription(meta, rest, base);
  const triggers = deriveTriggers(base, description, meta);
  const entry: CommandEntry = {
    command,
    description: description.slice(0, 200),
    triggers,
  };
  if (Array.isArray(meta.tags)) {
    entry.tags = (meta.tags as unknown[])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.toLowerCase());
  }
  return entry;
}

function main() {
  const commandsDir = path.join(homedir(), ".claude", "commands");
  const files = readdirSync(commandsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(commandsDir, f));

  const entries: CommandEntry[] = [];
  for (const f of files) {
    try {
      const e = buildEntry(f);
      if (e) entries.push(e);
    } catch (err) {
      console.warn(`[skip] ${path.basename(f)}: ${(err as Error).message}`);
    }
  }
  entries.sort((a, b) => a.command.localeCompare(b.command));

  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "~/.claude/commands/*.md",
    totalCommands: entries.length,
    entries,
  };

  const outDir = path.resolve(process.cwd(), "data", "state");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "SLASH_COMMAND_REGISTRY.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`[build-slash-command-registry] wrote ${entries.length} entries to ${outPath}`);
}

main();
