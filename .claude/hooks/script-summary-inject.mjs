#!/usr/bin/env node
// tier: T1
/**
 * script-summary-inject.mjs — PreToolUse Bash hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U02.
 *
 * When Bash invokes a known script (`node scripts/foo.mjs`,
 * `npx tsx mcp-server/scripts/foo.ts`, etc.), inject the cached
 * 1-line summary from SCRIPTS_INDEX.json so Claude doesn't need
 * to re-read the source. Token saving target: 400+ tok per
 * script call.
 *
 * Stdin: PreToolUse Bash hook event
 * Stdout: hookSpecificOutput.additionalContext on a hit
 * Exit: always 0 (advisory only — never blocks)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P3-U02
 */

import { readFileSync, existsSync } from "node:fs";

const STATE_FILE = "H:/prism/mcp-server/data/state/SCRIPTS_INDEX.json";

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
  } catch { return null; }
}

function loadIndex() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    if (!parsed?.entries || typeof parsed.entries !== "object") return null;
    return parsed;
  } catch { return null; }
}

/**
 * Extract candidate script paths from the bash command line.
 * Recognizes:
 *   - `node <path>` / `node H:/prism/<path>`
 *   - `npx tsx <path>`
 *   - `tsx <path>`
 *   - bare absolute / relative paths ending in .mjs|.js|.ts|.cjs|.mts
 */
function extractScriptCandidates(command) {
  if (!command || typeof command !== "string") return [];
  const out = new Set();
  const tokens = command.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (/\.(mjs|cjs|js|ts|mts)$/i.test(t)) out.add(t.replace(/^["']|["']$/g, ""));
  }
  return [...out];
}

function normalizeKey(candidate) {
  let s = candidate.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!/^[a-z]:/i.test(s) && !s.startsWith("/")) {
    s = `H:/prism/${s}`;
  }
  return s.toLowerCase();
}

function findEntry(index, candidates) {
  const entries = index.entries;
  // 1. exact key match (case-insensitive on Windows paths)
  const lcKeys = new Map();
  for (const k of Object.keys(entries)) lcKeys.set(k.toLowerCase(), k);
  for (const c of candidates) {
    const norm = normalizeKey(c);
    if (lcKeys.has(norm)) return { key: lcKeys.get(norm), entry: entries[lcKeys.get(norm)] };
  }
  // 2. basename match — fuzzy fallback for partial paths
  const byBase = new Map();
  for (const k of Object.keys(entries)) {
    const base = k.split("/").pop()?.toLowerCase() ?? "";
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(k);
  }
  for (const c of candidates) {
    const base = c.split(/[\\/]/).pop()?.toLowerCase() ?? "";
    if (byBase.has(base)) {
      const k = byBase.get(base)[0];
      return { key: k, entry: entries[k] };
    }
  }
  return null;
}

function main() {
  const input = readStdin();
  if (!input) { console.log(JSON.stringify({ continue: true })); return; }
  const tool = input.tool_name ?? input.toolName ?? "";
  if (tool !== "Bash") { console.log(JSON.stringify({ continue: true })); return; }
  const command = String(input.tool_input?.command ?? "");
  const candidates = extractScriptCandidates(command);
  if (candidates.length === 0) { console.log(JSON.stringify({ continue: true })); return; }
  const index = loadIndex();
  if (!index) { console.log(JSON.stringify({ continue: true })); return; }
  const hit = findEntry(index, candidates);
  if (!hit) { console.log(JSON.stringify({ continue: true })); return; }
  const display = hit.key.replace(/^h:\/prism\//i, "");
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `📜 ${display}: ${hit.entry.summary}`,
    },
  }));
}

try { main(); }
catch (e) {
  process.stderr.write(`script-summary-inject error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
}
