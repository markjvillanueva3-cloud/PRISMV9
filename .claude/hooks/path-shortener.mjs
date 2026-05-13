#!/usr/bin/env node
// tier: T4
/**
 * path-shortener.mjs — PostToolUse hook (any tool).
 *
 * Scans tool output for verbose absolute paths under H:/prism and reports
 * DSL shortcode equivalents from CODE_SYSTEM_INDEX.json (1865 mappings).
 * Does NOT modify the original output; emits an additionalContext lookup
 * table so the model can shortcut subsequent references.
 *
 * Detection: tool output contains ≥ MIN_PATH_HITS distinct paths matching
 * the indexed shape (engines/dispatchers/algorithms/tests).
 *
 * @hook PostToolUse:*
 */

import * as fs from "node:fs";
import * as path from "node:path";

const INDEX_PATH = path.resolve("H:/prism/mcp-server/data/docs/CODE_SYSTEM_INDEX.json");
const MIN_PATH_HITS = 3;
const MAX_REPORTED = 10;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

let indexCache = null;
function loadIndex() {
  if (indexCache !== null) return indexCache;
  try {
    if (!fs.existsSync(INDEX_PATH)) { indexCache = {}; return {}; }
    const raw = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
    // Index shape varies; try common forms — array of {code, path, name} or
    // object keyed by code.
    const map = {};
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (entry && typeof entry.path === "string" && typeof entry.code === "string") {
          map[normalizePath(entry.path)] = { code: entry.code, name: entry.name ?? "" };
        }
      }
    } else if (raw && typeof raw === "object") {
      for (const [code, entry] of Object.entries(raw)) {
        if (entry && typeof entry.path === "string") {
          map[normalizePath(entry.path)] = { code, name: entry.name ?? "" };
        }
      }
    }
    indexCache = map;
    return map;
  } catch { indexCache = {}; return {}; }
}

function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/^[a-zA-Z]:/, "").replace(/^\//, "");
}

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin) return passthrough();

  const out = stdin.tool_response?.output
    ?? stdin.tool_response?.stdout
    ?? stdin.tool_response?.content
    ?? "";
  if (typeof out !== "string" || out.length < 200) return passthrough();

  // Find all H:/prism/... paths to engines/dispatchers/algorithms/tests
  const pathRe = /[Hh]:[\\/]prism[\\/](?:mcp-server[\\/]src[\\/])?(engines|tools[\\/]dispatchers|algorithms|__tests__)[\\/]([A-Za-z0-9_]+)\.ts/g;
  const seen = new Set();
  let m;
  while ((m = pathRe.exec(out)) !== null) {
    seen.add(m[0].replace(/\\/g, "/"));
    if (seen.size > 50) break;
  }
  if (seen.size < MIN_PATH_HITS) return passthrough();

  const index = loadIndex();
  const mappings = [];
  for (const fullPath of seen) {
    const norm = normalizePath(fullPath);
    // Try matching with and without `prism/` prefix and `mcp-server/` prefix
    const candidates = [
      norm,
      norm.replace(/^prism\//, ""),
      norm.replace(/^prism\/mcp-server\//, ""),
      norm.replace(/^prism\/mcp-server\/src\//, "src/"),
    ];
    let hit = null;
    for (const c of candidates) {
      if (index[c]) { hit = index[c]; break; }
    }
    if (hit) {
      mappings.push(`${hit.code}: ${hit.name || fullPath.split("/").pop()}`);
    }
    if (mappings.length >= MAX_REPORTED) break;
  }
  if (mappings.length === 0) return passthrough();

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `path-shortener: ${mappings.length} indexed reference(s) — use shortcodes:\n  ${mappings.join("\n  ")}`,
    },
  });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
