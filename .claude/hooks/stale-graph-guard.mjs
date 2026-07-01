#!/usr/bin/env node
/**
 * stale-graph-guard.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC07 (slot:sierra)
 *
 * PreToolUse guard: when a system-viz / graph-context tool is about to run against
 * a STALE system-graph.json, warn (default) or deny (opt-in) so an agent does not
 * act on a stale map. Complements -- does NOT duplicate -- the existing
 * sessionstart-graph-staleness-inject (SessionStart) and stop-graph-staleness-backstop
 * (Stop): this is the per-QUERY PreToolUse gate.
 *
 * SAFETY: default mode is "warn" (graceful-degrade). A fleet-wide auto-DENY on a
 * 644MB graph that legitimately goes stale between periodic regens would block
 * read-only diagnostics constantly; so hard-block is opt-in via env. The verifies_via
 * runs in block mode. (R12-documented divergence from the spec's literal default-deny.)
 *
 * Cheap: statSync mtime only (NO 644MB content load). Fail-soft: emits "{}" on any error.
 *
 * Knobs:
 *   PRISM_STALE_GRAPH_GUARD = warn (default) | block | off
 *   PRISM_STALE_GRAPH_HOURS = staleness threshold in hours (default 6)
 *   PRISM_VIZ_GRAPH_PATH    = override the graph path
 */
import { statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

const MODE = (process.env.PRISM_STALE_GRAPH_GUARD || "warn").toLowerCase();
const HOURS = Number(process.env.PRISM_STALE_GRAPH_HOURS) > 0 ? Number(process.env.PRISM_STALE_GRAPH_HOURS) : 6;
const GRAPH_REL = "state/shared/system-viz/system-graph.json";
// viz / graph-context tool names this guard applies to (self-gating; the settings
// matcher can be broad). Excludes everything else so non-viz tools are never touched.
const VIZ_TOOL = /viz|system.?graph|master_index|graph_context|graphrag|spatial_resolve|node_card|community_summary/i;
const MS_PER_HOUR = 3_600_000;

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function resolveGraph() {
  if (process.env.PRISM_VIZ_GRAPH_PATH) return process.env.PRISM_VIZ_GRAPH_PATH;
  let d = process.cwd();
  for (let i = 0; i < 8; i++) {
    const cand = join(d, GRAPH_REL);
    try { statSync(cand); return cand; } catch { /* keep walking */ }
    const p = dirname(d);
    if (p === d) break;
    d = p;
  }
  return join(process.cwd(), GRAPH_REL);
}

let raw = "";
try { raw = readFileSync(0, "utf8"); } catch { raw = ""; }
let toolName = "";
try { toolName = JSON.parse(raw || "{}").tool_name || ""; } catch { toolName = ""; }

if (MODE === "off" || !toolName || !VIZ_TOOL.test(toolName)) {
  emit({});
} else {
  const graph = resolveGraph();
  let mtimeMs = 0;
  let missing = false;
  try { mtimeMs = statSync(graph).mtimeMs; } catch { missing = true; }

  if (missing) {
    // never hard-block on a missing graph (build/bootstrap states); advise only.
    emit({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `system-graph.json not found at ${graph}; regen via node scripts/regen-viz.mjs` } });
  } else {
    const ageMs = Date.now() - mtimeMs;
    // future mtime (clock skew) -> treat as fresh, never block
    const ageH = ageMs <= 0 ? 0 : ageMs / MS_PER_HOUR;
    if (ageH > HOURS) {
      const reason = `stale graph: system-graph.json is ${ageH.toFixed(1)}h old (> ${HOURS}h); regen via node scripts/regen-viz.mjs`;
      if (MODE === "block") {
        emit({ decision: "deny", reason, hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });
      } else {
        emit({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `WARNING ${reason}` } });
      }
    } else {
      emit({});
    }
  }
}
