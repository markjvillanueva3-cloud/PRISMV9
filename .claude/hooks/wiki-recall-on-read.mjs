#!/usr/bin/env node
// tier: T3
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
 * Lookup: a *single targeted scan* of knowledge/wiki/architecture/_leaf-index.jsonl
 * for the one matching line — NOT a full parse. This hook fires on EVERY Read; the
 * previous version JSON.parsed the entire ~5.5MB leaf index (or a ~5.5MB cache of
 * it) into a name→entry map on every Read of any engine/dispatcher/hook source
 * file, then looked up one key — ~50-150ms of parse+allocate thrown away each time.
 * readFileSync + indexOf the one line is ~10-20ms and allocates nothing extra.
 *
 * Fail-safe: never blocks, never errors out. Disable: PRISM_WIKI_RECALL_READ=0
 */
import { readFileSync, appendFileSync } from "node:fs";
import { basename } from "node:path";

const LEAF_INDEX = "H:/prism/knowledge/wiki/architecture/_leaf-index.jsonl";
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
  // test files (mcp-server/src/__tests__/<X>.test.ts) → the per-test wiki entry
  // (architecture/tests/<group>/<slug(X)>.md). Best-effort: a rare same-named action
  // entry wins the leaf-index name collision — acceptable for a recall hint.
  m = norm.match(/__tests__\/(?:.*\/)?([A-Za-z0-9_.-]+)\.test\.ts$/);
  if (m) return slug(m[1]);
  // monolith modules (extracted/<cat>/<X>.{js,ts,json}  OR  extracted_modules/<bucket>/<X>...)
  m = norm.match(/(?:^|\/)extracted(?:_modules)?\/[^/]+\/(?:[^/]+\/)?([A-Za-z0-9_.-]+)\.(?:js|ts|mjs|cjs|json)$/);
  if (m) return slug(m[1].replace(/\.[a-z]+$/i, ""));
  // tribal tips (knowledge/tribal/<X>.md) → tip-<id>; the entry name uses the
  // frontmatter id, which we can't read here — fall back to slug(basename), which
  // won't usually match (entry name is `tip-<id>`). Skip unless the file IS named tip-<id>.
  // (Reading a tribal tip means you're already looking at it — recall is low-value here.)
  // scripts
  m = norm.match(/\/scripts\/([A-Za-z0-9_.-]+)\.(mjs|js|ts)$/);
  if (m) return slug(m[1].replace(/\.(mjs|js|ts)$/, ""));
  // academy course data files (mcp-server/src/data/academy/course-<X>.ts) — the wiki
  // entry name is `academy-<courseId>-<titleSlug>` (can't derive from filename alone);
  // try `academy-<filebase>` and let the leaf-index resolve a prefix match if it 404s.
  m = norm.match(/\/data\/academy\/(course-[A-Za-z0-9_-]+)\.ts$/);
  if (m) return `academy-${slug(m[1])}`;
  return null;
}

/**
 * Find the single _leaf-index.jsonl line whose "name" field equals `name`,
 * without parsing the whole file. Reads the file once (~10ms for 5.5MB),
 * locates the literal token `"name":"<name>"` via String.indexOf (fast), then
 * parses ONLY that line and confirms `parsed.name === name` (guards the
 * vanishingly-rare case where the token also appears inside another line's
 * desc/path). Returns null if the index is missing or has no such entry.
 */
function lookupLeafEntry(name) {
  let text;
  try { text = readFileSync(LEAF_INDEX, "utf8"); } catch { return null; }
  // slug() guarantees `name` is [a-z0-9-]+, so this needle is JSON-safe and
  // never contains regex/quote metacharacters.
  const needle = `"name":"${name}"`;
  let i = text.indexOf(needle);
  while (i !== -1) {
    const start = text.lastIndexOf("\n", i) + 1; // 0 if at file start
    let end = text.indexOf("\n", i);
    if (end === -1) end = text.length;
    const line = text.slice(start, end);
    try {
      const r = JSON.parse(line);
      if (r && r.name === name) return { title: r.title, type: r.type, desc: r.desc, path: r.path };
    } catch { /* token landed inside a malformed/wrapped line — keep scanning */ }
    i = text.indexOf(needle, end);
  }
  return null;
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
  const entry = lookupLeafEntry(wikiName);
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
