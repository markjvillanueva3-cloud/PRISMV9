#!/usr/bin/env node
/**
 * embed-all-actions.mjs — embed every dispatcher action into Qdrant
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U04.
 *
 * Walks `mcp-server/src/tools/dispatchers/*.ts`, parses out the
 * `action: z.enum([...])` array (or the `ACTIONS = [...] as const`
 * variant), and embeds each `<dispatcher>:<action>` pair into the
 * Qdrant `action` collection via `prism_memory:remember`. The
 * embedding text combines the dispatcher name, the action name, and
 * (when available) the description text from the `.tool(name, desc, …)`
 * call so semantic_search returns the right verb-object pair on a
 * natural-language query like "compute cutting force".
 *
 * Idempotent: ACTIONS_INDEX.json keys by `<dispatcher>::<action>` and
 * sha-1 of the dispatcher description so re-runs skip unchanged
 * pairs.
 *
 * Usage:
 *   node scripts/embed-all-actions.mjs
 *   node scripts/embed-all-actions.mjs --dry-run
 *   node scripts/embed-all-actions.mjs --no-embed
 *   node scripts/embed-all-actions.mjs --limit=N
 *
 * Exit:
 *   0 — JSON summary
 *   1 — fatal (no dispatchers found)
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P3-U04
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const DISPATCHER_DIR = "H:/prism/mcp-server/src/tools/dispatchers";
const STATE_FILE = "H:/prism/mcp-server/data/state/ACTIONS_INDEX.json";
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const out = { dryRun: false, noEmbed: false, limit: 0 };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-embed") out.noEmbed = true;
    else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 0) { process.stderr.write(`Invalid --limit: ${a}\n`); process.exit(2); }
      out.limit = Math.floor(n);
    } else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node scripts/embed-all-actions.mjs [--dry-run] [--no-embed] [--limit=N]\n");
      process.exit(0);
    } else { process.stderr.write(`Unknown arg: ${a}\n`); process.exit(2); }
  }
  return out;
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function loadIndex() {
  if (!fs.existsSync(STATE_FILE)) return { schemaVersion: "1.0.0", entries: {} };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { schemaVersion: "1.0.0", entries: {} }; }
}

function saveIndex(idx) {
  ensureDir(path.dirname(STATE_FILE));
  fs.writeFileSync(STATE_FILE, JSON.stringify(idx, null, 2));
}

function listDispatcherFiles() {
  if (!fs.existsSync(DISPATCHER_DIR)) return [];
  const out = [];
  for (const name of fs.readdirSync(DISPATCHER_DIR)) {
    if (!name.endsWith(".ts") || name.endsWith(".d.ts") || name.endsWith(".test.ts")) continue;
    out.push(path.join(DISPATCHER_DIR, name));
  }
  return out;
}

function dispatcherNameFromFile(file) {
  const base = path.basename(file, ".ts");
  return base.replace(/Dispatcher$/, "").toLowerCase();
}

/**
 * Parse `action: z.enum([...])` or `const ACTIONS = [...] as const` and
 * return the list of action strings. Tolerant of any quoting style and
 * line wrapping inside the array.
 */
function extractActions(content) {
  const out = new Set();
  const enumMatches = content.matchAll(/action:\s*z\.enum\(\[([\s\S]*?)\]\)/g);
  for (const m of enumMatches) {
    const inner = m[1];
    const tokens = inner.match(/["']([a-z0-9_][a-z0-9_]*)["']/gi) ?? [];
    for (const t of tokens) out.add(t.replace(/^["']|["']$/g, ""));
  }
  const constMatches = content.matchAll(/(?:const|export\s+const)\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/g);
  for (const m of constMatches) {
    const inner = m[1];
    const tokens = inner.match(/["']([a-z0-9_][a-z0-9_]*)["']/gi) ?? [];
    for (const t of tokens) out.add(t.replace(/^["']|["']$/g, ""));
  }
  return [...out];
}

function extractToolDescription(content) {
  // Find `.tool("prism_xxx", "<description>", ...)` — first .tool() call
  const m = content.match(/\.tool\(\s*["']([^"']+)["']\s*,\s*["']([\s\S]*?)["']\s*,/);
  if (!m) return null;
  return { name: m[1], description: m[2].slice(0, 600) };
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
        params: { name: "prism_memory", arguments: { action: "remember", params: { kind: "action", id, text, metadata } } },
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

async function processDispatcher(file, args, idx, stats) {
  let content;
  try { content = fs.readFileSync(file, "utf8"); }
  catch { return; }
  const actions = extractActions(content);
  const desc = extractToolDescription(content);
  const dispatcher = desc?.name ?? dispatcherNameFromFile(file);
  const descText = desc?.description ?? "";
  const dispatcherHash = createHash("sha1").update(descText + "::" + actions.join(",")).digest("hex").slice(0, 16);

  stats.dispatchers++;
  if (actions.length === 0) {
    stats.dispatchersWithoutActions++;
    return;
  }

  for (const action of actions) {
    if (args.limit > 0 && stats.found >= args.limit) return;
    stats.found++;
    const key = `${dispatcher}::${action}`;
    const cached = idx.entries[key];
    if (cached && cached.dispatcherHash === dispatcherHash) { stats.skipped++; continue; }

    const text = `${dispatcher} :: ${action}\n\n${descText}`.slice(0, 4000);
    if (args.dryRun) { stats.embedded++; continue; }
    if (args.noEmbed) {
      idx.entries[key] = { dispatcher, action, dispatcherHash, lastIndexed: new Date().toISOString() };
      stats.embedded++;
      continue;
    }
    const r = await tryEmbed(`action/${dispatcher}/${action}`, text, { dispatcher, action });
    if (r.ok) {
      idx.entries[key] = { dispatcher, action, dispatcherHash, lastIndexed: new Date().toISOString() };
      stats.embedded++;
    } else {
      stats.embedFailed++;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const files = listDispatcherFiles();
  if (files.length === 0) { process.stderr.write("No dispatchers found\n"); process.exit(1); }

  const idx = loadIndex();
  const stats = {
    state: STATE_FILE,
    dispatchers: 0,
    dispatchersWithoutActions: 0,
    found: 0,
    embedded: 0,
    embedFailed: 0,
    skipped: 0,
    dryRun: args.dryRun,
    noEmbed: args.noEmbed,
  };

  for (const file of files) {
    if (args.limit > 0 && stats.found >= args.limit) break;
    await processDispatcher(file, args, idx, stats);
  }

  if (!args.dryRun) saveIndex(idx);

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
