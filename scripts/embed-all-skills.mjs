#!/usr/bin/env node
/**
 * embed-all-skills.mjs — embed every Claude Code skill into Qdrant
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U01.
 *
 * Walks both the project (`H:/prism/.claude/commands/`) and global
 * (`~/.claude/commands/`) skill directories, extracts each skill's
 * name + description (YAML frontmatter `description:` if present,
 * otherwise the first non-empty line of the body), and embeds the
 * result into the Qdrant `skill` collection via
 * `prism_memory:remember`.
 *
 * Idempotent: a content hash is tracked in
 * `mcp-server/data/state/SKILLS_INDEX.json` so reruns skip unchanged
 * skills.
 *
 * Usage:
 *   node scripts/embed-all-skills.mjs            # embed
 *   node scripts/embed-all-skills.mjs --dry-run  # report only
 *   node scripts/embed-all-skills.mjs --no-embed # build index, skip Qdrant
 *
 * Exit:
 *   0 — JSON summary on stdout
 *   1 — fatal (no skills found at either path)
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P3-U01
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const PROJECT_SKILLS = "H:/prism/.claude/commands";
const HOME = (process.env.USERPROFILE ?? process.env.HOME ?? "").replace(/\\/g, "/");
const GLOBAL_SKILLS = HOME ? `${HOME}/.claude/commands` : "";
const STATE_DIR = "H:/prism/mcp-server/data/state";
const INDEX_FILE = path.join(STATE_DIR, "SKILLS_INDEX.json");
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 12_000;
const MAX_DESCRIPTION_CHARS = 600;

function parseArgs(argv) {
  const out = { dryRun: false, noEmbed: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-embed") out.noEmbed = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node scripts/embed-all-skills.mjs [--dry-run] [--no-embed]\n");
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) return { schemaVersion: "1.0.0", hashes: {} };
  try { return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8")); }
  catch { return { schemaVersion: "1.0.0", hashes: {} }; }
}

function saveIndex(idx) {
  ensureDir(path.dirname(INDEX_FILE));
  fs.writeFileSync(INDEX_FILE, JSON.stringify(idx, null, 2));
}

function listSkillFiles(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir);
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const p = path.join(dir, name);
    try {
      if (fs.statSync(p).isFile()) out.push(p);
    } catch { /* skip */ }
  }
  return out;
}

/**
 * Extract description from frontmatter `description:` field, falling
 * back to the first non-empty body line. Returns up to
 * MAX_DESCRIPTION_CHARS for the embedding text.
 */
function extractDescription(content) {
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (fm) {
    const yaml = fm[1];
    const desc = yaml.match(/^description:\s*(.+?)\s*$/m);
    if (desc) return desc[1].replace(/^["']|["']$/g, "").trim();
  }
  // Strip frontmatter, take first non-empty line
  const body = content.replace(/^---[\s\S]*?\n---\s*\n?/, "").trim();
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    return trimmed;
  }
  return "(no description)";
}

function hashSkill(name, description) {
  return createHash("sha1").update(`${name}::${description}`).digest("hex").slice(0, 16);
}

async function tryEmbed(id, text, metadata) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "prism_memory", arguments: { action: "remember", params: { kind: "skill", id, text, metadata } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return { ok: parsed?.ok === true, reason: parsed?.error ?? null };
    } catch { return { ok: false, reason: "bad-inner-json" }; }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

async function processScope(scope, dir, args, idx, stats) {
  const files = listSkillFiles(dir);
  const r = { scope, dir, found: files.length, embedded: 0, embedFailed: 0, skipped: 0, errored: 0 };
  if (files.length === 0) { stats.scopes.push(r); return; }

  for (const file of files) {
    const baseName = path.basename(file, ".md");
    const name = `/${baseName}`;
    let content;
    try { content = fs.readFileSync(file, "utf8"); }
    catch { r.errored++; continue; }
    const description = extractDescription(content).slice(0, MAX_DESCRIPTION_CHARS);
    const id = `skill/${scope}/${baseName}`;
    const h = hashSkill(name, description);

    if (idx.hashes[id] === h) { r.skipped++; continue; }
    if (args.dryRun) {
      r.embedded++;  // hypothetical: would be embedded
      continue;
    }
    if (args.noEmbed) {
      idx.hashes[id] = h;
      r.embedded++;
      continue;
    }
    const text = `${name}\n\n${description}`;
    const e = await tryEmbed(id, text, { scope, name, file: path.basename(file) });
    if (e.ok) {
      idx.hashes[id] = h;
      r.embedded++;
    } else {
      r.embedFailed++;
    }
  }
  stats.scopes.push(r);
}

async function main() {
  const args = parseArgs(process.argv);
  const idx = loadIndex();
  const stats = {
    scopes: [],
    totalFound: 0,
    totalEmbedded: 0,
    totalSkipped: 0,
    totalEmbedFailed: 0,
    totalErrored: 0,
    dryRun: args.dryRun,
    noEmbed: args.noEmbed,
  };

  await processScope("project", PROJECT_SKILLS, args, idx, stats);
  await processScope("global", GLOBAL_SKILLS, args, idx, stats);

  for (const s of stats.scopes) {
    stats.totalFound += s.found;
    stats.totalEmbedded += s.embedded;
    stats.totalSkipped += s.skipped;
    stats.totalEmbedFailed += s.embedFailed;
    stats.totalErrored += s.errored;
  }

  if (stats.totalFound === 0) {
    process.stderr.write(`No skills found at ${PROJECT_SKILLS} or ${GLOBAL_SKILLS}\n`);
    process.exit(1);
  }

  if (!args.dryRun) saveIndex(idx);

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
