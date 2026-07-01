#!/usr/bin/env node
/**
 * generate-forge-audit-token-context-features.mjs — system-viz augmentation
 * for FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26 punch-list findings.
 *
 * Emits a `ghost.forge_audit_token_context_2026_05_26` roost beside the
 * TOKEN-SAVINGS-PIVOT, MISC-TASKS, and PRIORITY-QUEUE roosts; one child node
 * per punch-list finding (5 P0 + 4 P1 + 3 P2 = 12 items). Color-coded via
 * `status` so the viz layer can render them red/amber/green.
 *
 * Idempotent: re-running emits byte-stable output. Hard-coded findings —
 * sidecar is the spec itself (state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md).
 *
 * Usage: node scripts/generate-forge-audit-token-context-features.mjs
 * Exit: 0 ok · 2 runtime error
 *
 * Modeled on generate-token-savings-pivot-features.mjs (alpha 2026-05-22).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.forge_audit_token_context_2026_05_26";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "forge-audit-token-context-augmentation.json");

/**
 * Punch-list findings from FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26 §Phase 5.
 * Hard-coded — the spec is the source of truth; mutating this requires bumping
 * SCHEMA_VERSION and re-running the regen.
 */
export const FINDINGS = [
  { id: "ollama-daemon-revive",      priority: "P0", effort: "S", title: "U-OLLAMA-DAEMON-REVIVE", info: "Restart /api/chat, free NIM GPU contention. Live: 100% skip, 50/50 timeouts." },
  { id: "memory-md-auto-prune",      priority: "P0", effort: "S", title: "U-MEMORY-MD-AUTO-PRUNE", info: "Wire memory-size-watch from advisory→enforced on Stop when ≥90% ceiling. Live: 24,421/24,576B = 99.4%." },
  { id: "cache-breakpoint-sweeper",  priority: "P0", effort: "M", title: "U-CACHE-BREAKPOINT-SWEEPER", info: "Move static portions of 8 UserPromptSubmit injectors to SessionStart. juliett 5/16 F1 — never shipped." },
  { id: "agent-team-cost-cap",       priority: "P0", effort: "S", title: "U-AGENT-TEAM-COST-CAP", info: "Cap ≤10 Agent spawns/iter + default model:'sonnet' for reviewers. aicosts.ai 887k case-study." },
  { id: "mcp-route-take-rate-fix",   priority: "P0", effort: "M", title: "U-MCP-ROUTE-TAKE-RATE-FIX", info: "TSP shipped suggestions; live take-rate 5/2,160 = 0.2%. Suggestions structurally unactionable per TSP iter4 R12." },
  { id: "semantic-cache-for-prompts", priority: "P1", effort: "M", title: "U-SEMANTIC-CACHE-FOR-PROMPTS", info: "Embedding-cache repeated prompts (TDS article 68.8% reduction claim). juliett 5/17 §3 #2." },
  { id: "lazy-skill-body",           priority: "P1", effort: "M", title: "U-LAZY-SKILL-BODY", info: "Gate stage-2 SKILL.md body inclusion behind keyword-match. juliett 5/16 F3 + Anthropic Agent Skills." },
  { id: "claude-md-extract-to-skills", priority: "P1", effort: "M", title: "U-CLAUDE-MD-EXTRACT-TO-SKILLS", info: "Extract milestone sections to .claude/commands/milestones/<ms>.md; target ≤200 lines. Live: 610 lines (74KB)." },
  { id: "targeted-compact-doctrine", priority: "P1", effort: "S", title: "U-TARGETED-COMPACT-DOCTRINE", info: "Codify /compact Focus on <X> per Anthropic best-practice. juliett 5/17 §1." },
  { id: "hook-zero-fire-prune",      priority: "P1", effort: "M", title: "U-HOOK-ZERO-FIRE-PRUNE", info: "Disable or rewire 513/523 zero-fire hooks (98.1% of wired hooks). lima 5/17." },
  { id: "pre-tool-savings-convert",  priority: "P2", effort: "S", title: "U-PRE-TOOL-SAVINGS-CONVERT", info: "pre-tool-savings-multi: 0 hits / 114 nudges. Either deprecate or fix conversion." },
  { id: "rtk-adoption-ledger-repair", priority: "P2", effort: "S", title: "U-RTK-ADOPTION-LEDGER-REPAIR", info: "rtk-adoption-measure: 0/2,469 hit. Pattern broken; fix or retire." },
];

function statusFor(priority) {
  switch (priority) {
    case "P0": return "critical";
    case "P1": return "warning";
    case "P2": return "info";
    default: return "info";
  }
}

/**
 * Pure: build {newNodes,newEdges,stats} given an existingNodeIds set/array.
 */
export function generate(existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: "FORGE-AUDIT — token+context (2026-05-26)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `Third PRISM token+context audit (slot:alpha). 12-item punch list, 5 P0s. 6 article-asks NOT BUILT. Spec: state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md`,
    });
    ids.add(ROOST_ID);
  }

  let childCount = 0;
  for (const f of FINDINGS) {
    const childId = `forge_audit_2026_05_26.${f.id}`;
    if (ids.has(childId)) continue;
    newNodes.push({
      id: childId,
      label: `${f.priority}/${f.effort} ${f.title}`,
      layer: CHILD_LAYER,
      ghost: true,
      status: statusFor(f.priority),
      kind: "audit-finding",
      parent: ROOST_ID,
      info: f.info,
    });
    newEdges.push({ source: ROOST_ID, target: childId, kind: "contains" });
    ids.add(childId);
    childCount++;
  }

  return {
    newNodes,
    newEdges,
    stats: { roostEmitted: newNodes.length > 0 && newNodes[0].id === ROOST_ID ? 1 : 0, childCount, totalFindings: FINDINGS.length },
  };
}

function main() {
  fs.mkdirSync(VIZ_DIR, { recursive: true });
  const { newNodes, newEdges, stats } = generate([]);
  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: "2026-05-26",
    generatedBy: "scripts/generate-forge-audit-token-context-features.mjs",
    rootRoost: ROOST_ID,
    stats,
    nodes: newNodes,
    edges: newEdges,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(`[forge-audit-augmentation] wrote ${OUT_PATH}`);
  console.log(`[forge-audit-augmentation] roost=${stats.roostEmitted ? "emitted" : "skipped"} children=${stats.childCount}/${stats.totalFindings}`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  try { main(); } catch (e) { console.error(`[forge-audit-augmentation] error: ${e.message}`); process.exit(2); }
}
