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
//   "  L<layer>/<kind>  <node-id>  <name>[ [docs:K]]"
// We need the top-K (name, layer/kind, id, noteCount) tuples after the header.
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
    // Trailing ` [docs:N]` marker = brain-coverage count (N wiki/memory docs)
    // emitted by `system-viz-query find` when noteCount>0. Strip it from the name
    // and capture it so the model routes to DOCUMENTED nodes first (context-
    // retention). ASCII + end-anchored, so it cannot false-match a real label;
    // lines without the marker parse exactly as before (noteCount 0).
    let name = m[3].trim();
    let noteCount = 0;
    const nm = name.match(/\s*\[docs:(\d+)\]$/);
    if (nm) { noteCount = parseInt(nm[1], 10) || 0; name = name.slice(0, nm.index).trimEnd(); }
    out.push({ kind: m[1], id: m[2], name, noteCount });
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
  // ` (N docs)` = brain-coverage marker — N wiki/memory docs on that node
  // (structural count from the find-cache projection, sierra-substrate). Surfaced
  // so the model prefers DOCUMENTED nodes (context-retention). Appended only when
  // noteCount>0; pure ASCII so it survives all consumers.
  const docMark = (h) => ((h.noteCount || 0) > 0 ? ` (${h.noteCount} docs)` : "");
  // F5 upgrade (HIGH-ROI-TS2 iter1, 2026-05-22): when a SINGLE high-confidence
  // hit matches the probe exactly, promote the message from advisory to
  // actionable — give the model an EXACT-MATCH banner so it knows to skip
  // the Grep/Glob and Read the path directly. Gate: 1 hit + case-insensitive
  // name match + non-ghost kind (built/stub only, never ghost-roost).
  if (hits.length === 1 && hits[0].name && probe) {
    const h = hits[0];
    const exact = String(h.name).toLowerCase() === String(probe).toLowerCase();
    const concrete = h.kind && !String(h.kind).startsWith("ghost");
    if (exact && concrete) {
      const pathHint = h.wiki && Array.isArray(h.wiki) && h.wiki.length
        ? `\n- wiki: ${h.wiki[0]}`
        : "";
      return `## ⚡ EXACT MATCH — graph already knows \`${probe}\`\n- [${h.kind}] **${h.name}** \`${h.id}\`${docMark(h)}${pathHint}\n_TOKEN-SAVE: skip the Grep/Glob and Read this directly. Adapter: \`scripts/system-viz-query.mjs\`. Disable: \`PRISM_VIZ_FIRST_REDIRECT_DISABLE=1\`._`;
    }
  }
  const header = `## 🔭 system-viz first — ${hits.length} graph node(s) match \`${probe}\``;
  const body = hits.map((h) => `- [${h.kind}] **${h.name}** \`${h.id}\`${docMark(h)}`).join("\n");
  // Surface the legend only when at least one hit is brain-backed, so the model
  // knows `(N docs)` means "route here first for retained context".
  const brainHint = hits.some((h) => (h.noteCount || 0) > 0)
    ? " `(N docs)` = N wiki/memory entries on that node — prefer documented nodes (context-retention)."
    : "";
  const footer = `_Graph-grounded answer. Prefer this over Grep/Glob when the noun is already known to the system.${brainHint} Adapter: \`scripts/system-viz-query.mjs\`. Disable: \`PRISM_VIZ_FIRST_REDIRECT_DISABLE=1\`._`;
  // Tool-side reflex -> synergy-ask (symmetric with the prompt-side audit-viz-first
  // wire). Gate HARD to >=3 hits: a multi-node concept-grep is exactly the case a
  // GROUNDED graph+vault answer beats raw Grep; a 1- or 2-hit result is a known
  // node / small disambiguation that does NOT need the combiner (keeps this rare,
  // not on every grep -- the injection layer is over-supplied).
  const synergyHint = hits.length >= 3
    ? `\n_For a GROUNDED answer joining these graph nodes with Obsidian-vault content (local Ollama, $0): \`node scripts/synergy-ask.mjs "${probe}"\`._`
    : "";
  return `${header}\n${body}${synergyHint}\n${footer}`;
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
