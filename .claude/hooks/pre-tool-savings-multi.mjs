#!/usr/bin/env node
// tier: T2
/**
 * pre-tool-savings-multi.mjs — multi-PreToolUse advisory hook
 *
 * PSN-TOOL-SAVINGS-MULTI/U-PTSM01 (2026-05-24, slot:alpha)
 *
 * Single hook, dispatches on tool_name. Covers four tool classes the prior
 * coverage gap missed: Grep / Glob / Write / Bash-git. Each emits a 1-line
 * advisory when an empirically-wasteful pattern is detected.
 *
 * Pure helpers exported for tests:
 *   - classifyGrep({pattern, path, output_mode})  → {nudge, reason, msg}
 *   - classifyGlob({pattern, path})               → {nudge, reason, msg}
 *   - classifyWrite({content})                    → {nudge, reason, msg}
 *   - classifyBashGit({command})                  → {nudge, reason, msg}
 *   - classifyBashNode({command})                 → {nudge, reason, msg}
 *
 * Knobs (per-class disable):
 *   PRISM_PTSM_GREP_DISABLE=1
 *   PRISM_PTSM_GLOB_DISABLE=1
 *   PRISM_PTSM_WRITE_DISABLE=1
 *   PRISM_PTSM_BASHGIT_DISABLE=1
 *   PRISM_PTSM_BASHNODE_DISABLE=1
 *
 * Telemetry: state/shared/dashboards/pre-tool-savings-multi.jsonl
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { seenThisSession, markSeenThisSession } from "../../scripts/lib/session-once-gate.mjs";

const TELEMETRY = "H:/prism/state/shared/dashboards/pre-tool-savings-multi.jsonl";
// U-OBS-NODE-NUDGE-SESSION-GATE (2026-06-09, slot:alpha): the node-no-rtk-wrap
// nudge is advice-invariant ("wrap node with rtk node") yet fired 2293× = 78% of
// this hook's nudges, re-injecting the same reminder on every bare-node call for
// ~0 incremental uptake (verified vs the live ledger). Gate it to once/session via
// the shared session-once sentinel. The hard knob PRISM_PTSM_BASHNODE_DISABLE
// (full-off) stays as the fallback; this is the comprehensive route (one nudge
// survives, the 2292 repeats don't).
const NODE_NUDGE_RATE_FILE = join(tmpdir(), "prism-hook-state", "ptsm-bashnode-seen.json");
const NODE_NUDGE_KEY = "node-no-rtk-wrap";

export const GREP_BROAD_PATH = /^[A-Za-z]:?[\\/]?$|^\.?$|^\/$/; // root-ish
export const GLOB_TOO_BROAD = /^\*\*\/?\*?$|^\*\*\/\*\.[a-z]{1,5}$/i;
export const WRITE_LARGE_BYTES = 50 * 1024;

// Generic 1-2-word patterns often turn into thousands of matches; master-index
// is usually the better surface for "where is X" / "what handles Y" queries.
export function classifyGrep({ pattern, path, output_mode, head_limit, multiline } = {}) {
  if (!pattern || typeof pattern !== "string") return { nudge: false, reason: "no-pattern", msg: "" };
  const tokens = pattern.match(/[A-Za-z][A-Za-z0-9_]{2,}/g) || [];
  const isShort = tokens.length <= 2 && pattern.length <= 40;
  const isBroad = !path || GREP_BROAD_PATH.test(String(path).trim());
  // files_with_matches and count are cheap; only nudge on content output
  const isExpensive = output_mode !== "files_with_matches" && output_mode !== "count";
  if (isShort && isBroad && isExpensive) {
    return {
      nudge: true,
      reason: "short-pattern-broad-path",
      msg: `💡 Broad Grep (\`${pattern}\` over ${path || "root"}). Try \`prism_session:master_index_query\` or \`/master-index ${pattern}\` first — uses pre-joined system-graph (110K nodes) instead of streaming raw matches.`,
    };
  }
  // U-PTSM03 (2026-05-24): multiline + broad path is a worst-case pattern (every file gets re-scanned)
  // Head_limit detector intentionally NOT added — overlaps with specific-token cases existing tests rely on.
  if (multiline === true && isBroad) {
    return {
      nudge: true,
      reason: "grep-multiline-broad-path",
      msg: `💡 \`multiline:true\` Grep over ${path || "root"} re-scans every file under the dotall regex engine — typically 3-10× slower + larger output. Pin a path prefix (\`src/...\`) or restrict via \`type:\`/\`glob:\`.`,
    };
  }
  return { nudge: false, reason: "specific-enough", msg: "" };
}

export function classifyGlob({ pattern, path } = {}) {
  if (!pattern || typeof pattern !== "string") return { nudge: false, reason: "no-pattern", msg: "" };
  const p = pattern.trim();
  if (GLOB_TOO_BROAD.test(p)) {
    return {
      nudge: true,
      reason: "overly-broad-pattern",
      msg: `💡 Glob \`${p}\` will scan everything${path ? ` under ${path}` : ""}. Tighten with a path prefix (\`src/**\`), exclude (\`!node_modules/**\`), or use \`prism_session:master_index_query\` for known-asset lookups.`,
    };
  }
  return { nudge: false, reason: "scoped-enough", msg: "" };
}

export function classifyWrite({ content } = {}) {
  if (typeof content !== "string") return { nudge: false, reason: "no-content", msg: "" };
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes >= WRITE_LARGE_BYTES) {
    const kb = (bytes / 1024).toFixed(1);
    return {
      nudge: true,
      reason: `large-write (${bytes}B ≥ ${WRITE_LARGE_BYTES}B)`,
      msg: `💡 Large Write (~${kb} KB). Confirm intent — large generated files often benefit from a follow-on \`/scrutinize\` pass + per-file scrutiny gate (CLAUDE.md §PER-FILE SCRUTINY GATE).`,
    };
  }
  return { nudge: false, reason: "under-cap", msg: "" };
}

// git log/diff/show without --stat or --oneline frequently dumps thousands
// of tokens; rtk wrapper covers the verbose-output side, this one nudges the
// invocation pattern itself.
//
// 2026-05-24 U-PTSM02 — additional detectors:
//  • `git commit -am` / `commit -a`: auto-stages every tracked-but-modified file,
//    which on PRISM's shared tree causes peer-file misattribution (the exact
//    disaster pattern observed earlier this session — 3 alpha commits absorbed
//    into a charlie peer commit because `-a` picked up peer-modified files).
//  • `git push --force` / `--force-with-lease` without --dry-run on shared branch
export function classifyBashGit({ command } = {}) {
  if (!command || typeof command !== "string") return { nudge: false, reason: "no-command", msg: "" };
  const c = command.trim();
  if (/^(?:command\s+)?(?:rtk\s+)?git\s+(log|diff|show|blame)(?!\s+--(?:stat|oneline|name-only|name-status))/i.test(c)) {
    return {
      nudge: true,
      reason: "git-verbose-no-stat",
      msg: `💡 \`git ${c.match(/git\s+(\w+)/)?.[1] ?? "?"}\` without \`--stat\`/\`--oneline\`/\`--name-only\` dumps full diffs. Add a scope flag, or pipe through \`rtk\` (existing wrapper trims by ~80%).`,
    };
  }
  // U-PTSM02: `commit -a` / `commit -am` on shared tree → peer-file misattribution risk
  if (/^(?:command\s+)?(?:rtk\s+)?git\s+(?:-C\s+\S+\s+)?commit\b[^-]*\s-(?:am?|a[mF]|[A-Za-z]*a[A-Za-z]*)\b/i.test(c)) {
    return {
      nudge: true,
      reason: "git-commit-dash-a-misattribution-risk",
      msg: `⚠ \`git commit -a\`/\`-am\` auto-stages ALL tracked-modified files. On PRISM's shared tree this causes PEER-FILE MISATTRIBUTION (3 alpha commits absorbed into charlie this session). Use \`git add -- <explicit-pathspec>\` then \`git commit -m\` instead. See [[feedback_commit_to_slot_worktree]].`,
    };
  }
  // U-PTSM02: force-push without dry-run
  if (/^(?:command\s+)?(?:rtk\s+)?git\s+push\s+.*(?:--force|--force-with-lease)\b(?!.*--dry-run)/i.test(c)) {
    return {
      nudge: true,
      reason: "git-force-push-no-dry-run",
      msg: `⚠ \`git push --force\` without \`--dry-run\` first. On the shared tree this can clobber peers. Run \`--dry-run\` to preview, or use \`--force-with-lease\` + verify ref. CLAUDE.md "Executing actions with care" rule.`,
    };
  }
  return { nudge: false, reason: "scoped-or-not-applicable", msg: "" };
}

// U-PTSM06 (2026-05-24): Bash `node` invocation detector
//
// RTK session telemetry showed `node` as the top uncaptured token spend
// (~9.6k tokens/session). Verbose node scripts (build tools, codegen, audits)
// dump full progress streams that the existing `rtk node` wrapper would trim
// by 60-99%. This detector nudges users to either:
//   • `rtk node <script>` — token-optimized passthrough (preferred)
//   • `command node <script>` — bypass any user alias (fallback)
//
// Cheap node invocations (--version / -v) are skipped to avoid noise.
// Already-wrapped invocations (rtk node / command node) are also skipped.
export function classifyBashNode({ command } = {}) {
  if (!command || typeof command !== "string") return { nudge: false, reason: "no-command", msg: "" };
  const c = command.trim();
  // Skip already-wrapped invocations
  if (/^(?:rtk|command)\s+node(?:\.exe)?\s/i.test(c)) {
    return { nudge: false, reason: "already-wrapped", msg: "" };
  }
  // Must start with `node ` or `node.exe ` (with a following arg — bare `node` REPL is rare + not a script run)
  if (!/^node(?:\.exe)?\s+\S/i.test(c)) {
    return { nudge: false, reason: "not-node-invocation", msg: "" };
  }
  // Skip cheap version-probe invocations
  if (/(?:^|\s)(?:--version|-v)(?:\s|$)/i.test(c)) {
    return { nudge: false, reason: "cheap-version-probe", msg: "" };
  }
  return {
    nudge: true,
    reason: "node-no-rtk-wrap",
    msg: `💡 Bare \`node\` invocation — verbose output is the top uncaptured token spend (~9.6k tokens/session). Prefer \`rtk node ${c.replace(/^node(?:\.exe)?\s+/i, "")}\` (60-99% reduction on noisy stdout), or \`command node ...\` to bypass any alias.`,
  };
}

// U-PTSM04 (2026-05-24): Read tool detector — surfaces known-huge files
// (>200KB stat-known canonical paths) and full-file reads on auto-generated
// content. The PRISM `read-auto-limit` hook handles the byte-cap side; this
// detector targets the SEMANTIC side: routing to a digest / dispatcher
// instead of reading a giant generated file end-to-end.
export const READ_PREFER_DIGEST_PATHS = [
  // path-suffix → suggested route
  { suffix: "/state/shared/system-viz/system-graph.json", route: "`prism_session:master_index_query` or `/master-index <term>`" },
  { suffix: "/PRISM-INVENTORY-LATEST.md", route: "`prism_dev:inventory_compact` or specific sub-section via Read offset+limit" },
  { suffix: "/state/shared/AGENT_CHAT.jsonl", route: "tail-mode: `Read offset=<bigN> limit=100`" },
  { suffix: "/mcp-server/data/docs/ENGINE_DIGEST.md", route: "specific lookup: `prism_session:dispatcher_map_compact` or `/code-index lookup <code>`" },
  { suffix: "/mcp-server/data/docs/DISPATCHER_DIGEST.md", route: "specific lookup: `prism_session:dispatcher_map_compact`" },
];
// U-PTSM05 (2026-05-24): WebSearch detector — nudges code-internal queries
// back to master-index/wiki instead of the web. WebSearch is fine for
// truly external knowledge (Anthropic docs, third-party APIs, current
// events) but a query like "PRISM engine duplication guard" should hit
// the local wiki/system-graph, not the web.
const WEBSEARCH_LOCAL_KEYWORDS = [
  "PRISM", "MCP dispatcher", "Kienzle", "JM Die", "atomic-roadmap",
  "duplicationGuard", "PRISMSelfAwareness", "ENGINE_DIGEST", "DISPATCHER_DIGEST",
  "system-graph.json", "BUILD_STATE", "MILESTONE_PROGRESS", "chat-slots",
];
export function classifyWebSearch({ query } = {}) {
  if (!query || typeof query !== "string") return { nudge: false, reason: "no-query", msg: "" };
  for (const kw of WEBSEARCH_LOCAL_KEYWORDS) {
    if (query.toLowerCase().includes(kw.toLowerCase())) {
      return {
        nudge: true,
        reason: `websearch-local-keyword:${kw}`,
        msg: `💡 WebSearch query contains \`${kw}\` — looks PRISM-internal. The web won't have your private codebase; try \`prism_session:master_index_query\` or \`/master-index ${kw}\` (110K-node graph) or \`/wiki-query\` (722 entries) first.`,
      };
    }
  }
  return { nudge: false, reason: "external-query-ok", msg: "" };
}

export function classifyRead({ file_path, offset, limit } = {}) {
  if (!file_path || typeof file_path !== "string") return { nudge: false, reason: "no-path", msg: "" };
  const normalized = file_path.replace(/\\/g, "/");
  const hasWindow = (typeof offset === "number" && offset > 0) || (typeof limit === "number" && limit > 0);
  if (hasWindow) return { nudge: false, reason: "windowed-read", msg: "" };
  for (const { suffix, route } of READ_PREFER_DIGEST_PATHS) {
    if (normalized.endsWith(suffix)) {
      return {
        nudge: true,
        reason: `read-prefer-digest:${suffix}`,
        msg: `💡 Reading \`${suffix}\` end-to-end is high-token. Prefer ${route}.`,
      };
    }
  }
  return { nudge: false, reason: "no-known-large-path", msg: "" };
}

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }
function emit(msg) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: msg },
  }));
}

function recordTelemetry(decision, toolName) {
  try {
    if (!existsSync(dirname(TELEMETRY))) mkdirSync(dirname(TELEMETRY), { recursive: true });
    appendFileSync(TELEMETRY, JSON.stringify({
      ts: new Date().toISOString(),
      tool: toolName,
      nudge: decision.nudge,
      reason: decision.reason,
    }) + "\n");
  } catch { /* fail-soft */ }
}

function main() {
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return pass(); }
  const toolName = input.tool_name || "";
  const ti = input.tool_input || {};
  const sessionId = String(input.session_id || input.sessionId || "").slice(0, 64);
  let decision = { nudge: false, reason: "no-dispatch", msg: "" };

  if (toolName === "Grep" && process.env.PRISM_PTSM_GREP_DISABLE !== "1") {
    decision = classifyGrep(ti);
  } else if (toolName === "Glob" && process.env.PRISM_PTSM_GLOB_DISABLE !== "1") {
    decision = classifyGlob(ti);
  } else if (toolName === "Write" && process.env.PRISM_PTSM_WRITE_DISABLE !== "1") {
    decision = classifyWrite(ti);
  } else if (toolName === "Bash") {
    // git classifier wins if both match — node-via-rtk is not a git command anyway
    if (process.env.PRISM_PTSM_BASHGIT_DISABLE !== "1") {
      decision = classifyBashGit(ti);
    }
    if (!decision.nudge && process.env.PRISM_PTSM_BASHNODE_DISABLE !== "1") {
      decision = classifyBashNode(ti);
    }
  } else if (toolName === "Read" && process.env.PRISM_PTSM_READ_DISABLE !== "1") {
    decision = classifyRead(ti);
  } else if (toolName === "WebSearch" && process.env.PRISM_PTSM_WEBSEARCH_DISABLE !== "1") {
    decision = classifyWebSearch(ti);
  }

  // U-OBS-NODE-NUDGE-SESSION-GATE: the node-no-rtk-wrap nudge is advice-invariant,
  // so fire it at most once per session (the operator learns "wrap node with rtk"
  // once; re-injecting it on every later bare-node call is pure context burn —
  // 2293 fires / ~0 uptake). Only this detector is gated; git-verbose, read-digest,
  // websearch, etc. are unaffected. Disengages (fires as before) when session_id is
  // absent. Telemetry records the gated suppression for visibility.
  if (decision.nudge && decision.reason === "node-no-rtk-wrap") {
    if (seenThisSession(NODE_NUDGE_RATE_FILE, sessionId, NODE_NUDGE_KEY)) {
      decision = { nudge: false, reason: "node-no-rtk-wrap-session-gated", msg: "" };
    } else {
      markSeenThisSession(NODE_NUDGE_RATE_FILE, sessionId, NODE_NUDGE_KEY);
    }
  }

  recordTelemetry(decision, toolName);
  if (!decision.nudge) return pass();
  emit(decision.msg);
}

if (process.argv[1] && process.argv[1].endsWith("pre-tool-savings-multi.mjs")) {
  try { main(); } catch { pass(); }
}
