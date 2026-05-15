#!/usr/bin/env node
// tier: T2
// viz-first-redirect.mjs — PreToolUse:Glob|Grep
//
// SYSTEM-VIZ-BRAIN-MS0/U-P3-VIZ-FIRST-REDIRECT-GLOB.
//
// User directive 2026-05-15: "make it so searches by claude use /system-viz
// as a master index before trying anything else."
//
// Strategy: before a Grep/Glob runs, query the system-viz name index for
// nodes matching the search pattern's identifier-shaped tokens. Inject the
// top-K matches as additionalContext so Claude sees the canonical graph
// answer FIRST, then can decide whether the Grep/Glob is even necessary.
//
// Advisory only — never blocks. Tight 600ms timeout so it adds <1s to
// PreToolUse latency in the worst case. Skips entirely for:
//   - regex-heavy Grep patterns (they're already targeted)
//   - extension-wildcard Globs (**/*.ts — viz can't disambiguate)
//   - patterns too short to be discriminating
//
// Knobs:
//   PRISM_VIZ_FIRST_REDIRECT_DISABLE=1  no-op
//   PRISM_VIZ_FIRST_REDIRECT_K=N        top-K to inject (default 5)
//   PRISM_VIZ_FIRST_REDIRECT_TIMEOUT_MS=N  subprocess timeout (default 600)
//   PRISM_VIZ_FIRST_REDIRECT_VERBOSE=1  log skip reasons to telemetry
//   PRISM_ROOT                          repo root (default H:/prism)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DISABLE = process.env.PRISM_VIZ_FIRST_REDIRECT_DISABLE === "1";
const TOP_K = Math.max(1, Math.min(10, parseInt(process.env.PRISM_VIZ_FIRST_REDIRECT_K || "5", 10) || 5));
// Default 1500ms covers cold-cache parse of the ~90 MB system-graph.json on
// typical hardware. The script returns in <100ms once the OS file cache is
// warm, so steady-state hook latency is well under the budget.
const TIMEOUT_MS = Math.max(100, Math.min(5000, parseInt(process.env.PRISM_VIZ_FIRST_REDIRECT_TIMEOUT_MS || "1500", 10) || 1500));
const VERBOSE = process.env.PRISM_VIZ_FIRST_REDIRECT_VERBOSE === "1";
const TELEMETRY = path.join(PRISM_ROOT, "mcp-server", "data", "state", "hook-fire-counts.jsonl");
const QUERY_SCRIPT = path.join(PRISM_ROOT, "scripts", "system-viz-query.mjs");

const MIN_PATTERN_LEN = 3;
const MAX_PATTERN_LEN = 80;
// Regex metacharacters that indicate a Grep is targeted/structural, NOT a noun lookup.
const REGEX_METACHARS = /[\\^$*+?()[\]{}|]/;
// A Glob that's only wildcards + extensions: viz can't help.
const PURE_GLOB_PATTERNS = /^(\*+|\*\*\/?\*+(\.[\w]+)?|\*\.[\w]+)$/;

function tele(decision, extra) {
  if (!VERBOSE && decision === "skip_disabled") return;
  try {
    appendFileSync(
      TELEMETRY,
      JSON.stringify({ ts: new Date().toISOString(), hook: "viz-first-redirect", decision, ...extra }) + "\n",
      "utf8",
    );
  } catch { /* fail-safe */ }
}

function approve(out) {
  process.stdout.write(JSON.stringify({ continue: true, ...(out || {}) }));
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Extract the candidate search pattern from a tool input. Glob: tool_input.pattern.
// Grep: tool_input.pattern (the regex). Defends against missing/non-string fields.
export function extractPattern(input) {
  if (!input || typeof input !== "object") return null;
  const toolName = input.tool_name || input.toolName || "";
  const ti = input.tool_input || input.toolInput || {};
  if (typeof ti.pattern !== "string") return null;
  return { tool: toolName, pattern: ti.pattern };
}

// Decide whether a pattern is a noun/identifier lookup viz can help with vs.
// a regex/extension pattern that should pass straight through.
export function shouldQueryViz(toolName, pattern) {
  if (typeof pattern !== "string") return { ok: false, reason: "pattern_not_string" };
  const trimmed = pattern.trim();
  if (trimmed.length < MIN_PATTERN_LEN) return { ok: false, reason: "pattern_too_short" };
  if (trimmed.length > MAX_PATTERN_LEN) return { ok: false, reason: "pattern_too_long" };
  if (toolName === "Glob" && PURE_GLOB_PATTERNS.test(trimmed)) return { ok: false, reason: "pure_extension_glob" };
  if (toolName === "Grep" && REGEX_METACHARS.test(trimmed)) return { ok: false, reason: "regex_pattern" };
  // Strip path components so we query the leaf identifier ("src/engines/FooEngine.ts" → "FooEngine")
  let probe = trimmed;
  const lastSlash = Math.max(probe.lastIndexOf("/"), probe.lastIndexOf("\\"));
  if (lastSlash >= 0) probe = probe.slice(lastSlash + 1);
  // Strip extension
  const lastDot = probe.lastIndexOf(".");
  if (lastDot > 0 && lastDot < probe.length - 1 && lastDot >= probe.length - 6) probe = probe.slice(0, lastDot);
  if (probe.length < MIN_PATTERN_LEN) return { ok: false, reason: "probe_too_short" };
  return { ok: true, probe };
}

// Parse the system-viz-query find output. The script's `find` mode emits lines:
//   "Found N node(s) matching \"PATTERN\":"
//   "  L<layer>/<kind>  <node-id>  <name>"
// We need the top-K (name, layer/kind, id) triples after the header.
export function parseFindOutput(stdout, topK) {
  if (!stdout || typeof stdout !== "string") return [];
  const lines = stdout.split(/\r?\n/);
  const out = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (/^Found\s+\d+\s+node/i.test(line)) continue;
    const m = line.match(/^\s+(L\d+\/[\w_-]+)\s+(\S+)\s+(.+)$/);
    if (!m) continue;
    out.push({ kind: m[1], id: m[2], name: m[3].trim() });
    if (out.length >= topK) break;
  }
  return out;
}

function runVizQuery(probe) {
  if (!existsSync(QUERY_SCRIPT)) return { ok: false, reason: "query_script_missing" };
  try {
    const out = execFileSync(process.execPath, [QUERY_SCRIPT, "find", probe], {
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    return { ok: true, stdout: out };
  } catch (e) {
    const reason = e && e.code === "ETIMEDOUT" ? "query_timeout" : "query_failed";
    return { ok: false, reason };
  }
}

export function formatInjection(hits, probe) {
  if (!hits.length) return null;
  const header = `## 🔭 system-viz first — ${hits.length} graph node(s) match \`${probe}\``;
  const body = hits.map((h) => `- [${h.kind}] **${h.name}** \`${h.id}\``).join("\n");
  const footer = "_Graph-grounded answer. Prefer this over Grep/Glob when the noun is already known to the system. Adapter: `scripts/system-viz-query.mjs`. Disable: `PRISM_VIZ_FIRST_REDIRECT_DISABLE=1`._";
  return `${header}\n${body}\n${footer}`;
}

function buildOutput(toolName, additionalContext) {
  // PreToolUse hook contract: hookSpecificOutput.additionalContext is advisory text
  // surfaced to the model BEFORE the tool runs. No `decision` field → tool proceeds.
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext,
    },
  };
}

async function main(injected) {
  if (DISABLE) { tele("skip_disabled"); approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  const ext = extractPattern(input);
  if (!ext) { tele("skip_no_pattern"); approve(); return; }
  if (ext.tool !== "Glob" && ext.tool !== "Grep") { tele("skip_wrong_tool", { tool: ext.tool }); approve(); return; }
  const guard = shouldQueryViz(ext.tool, ext.pattern);
  if (!guard.ok) { tele("skip", { tool: ext.tool, reason: guard.reason }); approve(); return; }
  const result = runVizQuery(guard.probe);
  if (!result.ok) { tele("noop", { reason: result.reason }); approve(); return; }
  const hits = parseFindOutput(result.stdout, TOP_K);
  if (!hits.length) { tele("no_hits", { probe: guard.probe }); approve(); return; }
  tele("injected", { tool: ext.tool, probe: guard.probe, hits: hits.length });
  approve(buildOutput(ext.tool, formatInjection(hits, guard.probe)));
}

// Exported for tests; main() is callable with injected input.
export { main };

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(() => approve());
}
