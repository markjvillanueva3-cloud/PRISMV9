#!/usr/bin/env node
/**
 * wiki-recall-on-read.mjs — PostToolUse hook (matcher: Read).
 *
 * Context-retention upgrade: when a chat reads a PRISM source file that has a
 * wiki entry (an engine, dispatcher, hook, or skill source), inject that entry's
 * one-line summary + a pointer to the full wiki entry. Closes the gap left by
 * wiki-precheck-inject.mjs (which only fires on UserPromptSubmit) — internal
 * work that reads files now gets the same brain context, automatically.
 *
 * Mapping (source path → wiki entry name):
 *   mcp-server/src/engines/<Name>.ts          → <name slug>  (engine entry, any domain)
 *   mcp-server/src/tools/dispatchers/<X>Dispatcher.ts → dispatcher-<x>
 *   .claude/hooks/<name>.mjs                   → <name slug>  (hook entry, runtime)
 *   mcp-server/src/hooks/<Name>.ts             → <name slug>  (hook entry, engine)
 *   .claude/commands/<name>.md                 → <name slug>  (skill entry, project)
 *   ~/.claude/commands/<name>.md               → <name slug>  (skill entry, user)
 *   scripts/<name>.mjs / .js                   → <name slug>  (best-effort)
 *
 * Resolution uses knowledge/wiki/architecture/_leaf-index.jsonl (built by
 * build-wiki-leaf-index.mjs). Cached by mtime in /tmp.
 *
 * Fail-safe: never blocks, never errors out. Disable: PRISM_WIKI_RECALL_READ=0
 */
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const LEAF_INDEX = "H:/prism/knowledge/wiki/architecture/_leaf-index.jsonl";
const CACHE = join(tmpdir(), "prism-wiki-cache", "wiki-leaf-byname.json");
const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";

function tele(decision, extra) {
  try { appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), hook: "wiki-recall-on-read", decision, ...extra }) + "\n", "utf8"); } catch {}
}

function out(obj) { try { process.stdout.write(JSON.stringify({ continue: true, ...obj })); } catch {} }

function readStdin() {
  let raw = "";
  try { raw = readFileSync(0, "utf8") || ""; } catch {}
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

/** name slug used as the wiki [[link]] target / _leaf-index "name" field. */
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

/** Map a read file path to a candidate wiki-entry name. Returns null if no obvious mapping. */
function pathToWikiName(p) {
  if (!p) return null;
  const norm = String(p).replace(/\\/g, "/");
  // dispatchers
  let m = norm.match(/dispatchers\/([A-Za-z0-9_]+)[Dd]ispatcher\.ts$/);
  if (m) return `dispatcher-${slug(m[1])}`;
  m = norm.match(/dispatchers\/([A-Za-z0-9_]+)\.ts$/);
  if (m) return `dispatcher-${slug(m[1].replace(/dispatcher$/i, ""))}`;
  // engines (src/engines/<Name>.ts) — engine entries are basename'd by slug
  m = norm.match(/src\/engines\/([A-Za-z0-9_]+)\.ts$/);
  if (m) return slug(m[1]);
  // runtime hooks (.claude/hooks/<name>.mjs)
  m = norm.match(/\.claude\/hooks\/([A-Za-z0-9_.-]+)\.mjs$/);
  if (m) return slug(m[1].replace(/\.mjs$/, ""));
  // engine-source hooks (mcp-server/src/hooks/<Name>.ts)
  m = norm.match(/src\/hooks\/([A-Za-z0-9_]+)\.ts$/);
  if (m) return slug(m[1]);
  // skills (.claude/commands/<name>.md  OR  ~/.claude/commands/<name>.md)
  m = norm.match(/\.claude\/commands\/([A-Za-z0-9_.-]+)\.md$/);
  if (m) return slug(m[1].replace(/\.md$/, ""));
  // scripts
  m = norm.match(/\/scripts\/([A-Za-z0-9_.-]+)\.(mjs|js|ts)$/);
  if (m) return slug(m[1].replace(/\.(mjs|js|ts)$/, ""));
  return null;
}

function loadByName() {
  let st;
  try { st = statSync(LEAF_INDEX); } catch { return null; }
  if (existsSync(CACHE)) {
    try {
      const c = JSON.parse(readFileSync(CACHE, "utf8"));
      if (c && c.mtime === st.mtimeMs && c.byName) return c.byName;
    } catch { /* rebuild */ }
  }
  try {
    const text = readFileSync(LEAF_INDEX, "utf8");
    const byName = Object.create(null);
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (r && r.name && !byName[r.name]) byName[r.name] = { title: r.title, type: r.type, desc: r.desc, path: r.path };
    }
    try { mkdirSync(join(tmpdir(), "prism-wiki-cache"), { recursive: true }); writeFileSync(CACHE, JSON.stringify({ mtime: st.mtimeMs, byName }), "utf8"); } catch {}
    return byName;
  } catch { return null; }
}

function main() {
  const input = readStdin();
  if (process.env.PRISM_WIKI_RECALL_READ === "0") { tele("disabled"); return out({}); }
  // PostToolUse input: { tool_name, tool_input: { file_path }, ... } or similar.
  const ti = input?.tool_input || input?.toolInput || {};
  const filePath = ti.file_path || ti.path || input?.file_path || "";
  if (!filePath) { tele("skip_no_path"); return out({}); }
  const wikiName = pathToWikiName(filePath);
  if (!wikiName) { tele("skip_no_mapping"); return out({}); }
  const byName = loadByName();
  if (!byName) { tele("error_no_index"); return out({}); }
  const entry = byName[wikiName];
  if (!entry) { tele("noop_not_in_wiki", { name: wikiName }); return out({}); }
  tele("matched", { name: wikiName, type: entry.type });
  const ctx = [
    `## 📖 Wiki — \`${basename(filePath)}\` is documented`,
    `- **[[${wikiName}]]** (${entry.type}) — ${(entry.desc || entry.title || "").slice(0, 180)}`,
    `_Full entry: \`${entry.path}\`. Don't re-derive what the wiki already documents._`,
  ].join("\n");
  out({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: ctx } });
}

try { main(); } catch { out({}); }
