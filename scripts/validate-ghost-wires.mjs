#!/usr/bin/env node
/**
 * G3 — Ghost-wire validation feedback loop.
 *
 * For every `ghost.unwired-engine` node in system-graph.json with a
 * `proposed_wiring` annotation, check whether the proposed dispatcher
 * file now references the engine class (lazy import / action-enum / etc).
 * Classify each ghost as:
 *   - confirmed: engine name found in dispatcher (word-boundary)
 *   - refuted:   not found AND daysOpen > REFUTED_AFTER_DAYS (default 30)
 *   - pending:   not found AND daysOpen <= REFUTED_AFTER_DAYS
 *
 * Outputs:
 *   1. Append-only JSONL outcomes (labeled dataset for NN-GRAPH retrain):
 *      state/shared/ghost-wire-outcomes.jsonl
 *   2. Augmentation overlay (`/system-viz` G-key):
 *      state/shared/system-viz/staging/ghost-wire-validation-augmentation.json
 *
 * Pure function `validate({graph, dispatcherReader, ageFn, now, refutedAfterDays})`
 * is injectable for testing. CLI wires fs + git-derived sha + real disk.
 *
 * Wired into:
 *   - scripts/merge-augmentations.mjs (loadOptional + version-stamp + mergeIndexedAugmentation)
 *   - scripts/regen-viz.mjs FAST[]
 *
 * Spec: state/shared/specs/SYSTEM-VIZ-HIGH-ROI-AUDIT*.md G3
 * Authored 2026-05-21 sierra (claude-e6145e8b) — SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-GHOST-WIRE-VALIDATE.
 */

import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

// VIZ-STREAMING-IO threshold — system-graph.json exceeded Node's
// 0x1fffffe8 string limit (~512MB) on 2026-05-27, crashing the script.
// Mirror the canonical pattern from system-viz-ghost-report.mjs:50.
export const STREAMING_READ_THRESHOLD_BYTES = 256 * 1024 * 1024;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

export const REFUTED_AFTER_DAYS = 30;
export const STATUS_CONFIRMED = "confirmed";
export const STATUS_REFUTED = "refuted";
export const STATUS_PENDING = "pending";

// Hoisted from inline numerics so the hook warnings clear AND so the overlay's
// edge-intensity mapping has a single source of truth shared with consumers
// (system-viz overlay color-binds via these intensities; if you tweak them
// here, the legend in /system-viz auto-tracks).
const MS_PER_DAY = 86_400_000;
const STATUS_INTENSITIES = Object.freeze({
  [STATUS_CONFIRMED]: 0.9,
  [STATUS_REFUTED]: 0.6,
  [STATUS_PENDING]: 0.3,
});

/**
 * Convert a `disp.<lowercased>` node id back to a dispatcher file basename.
 * Returns null on malformed input. Caller resolves to actual filename via
 * case-insensitive directory listing (dispatcher filenames are camelCase).
 *
 * R12: malformed input returns null rather than throwing — caller treats
 * unresolvable dispatcher as "pending" with reason "dispatcher-unresolvable",
 * surfacing the bad ghost rather than crashing the whole sweep.
 */
export function dispNodeIdToBasename(dispNodeId) {
  if (typeof dispNodeId !== "string") return null;
  if (!dispNodeId.startsWith("disp.")) return null;
  const rest = dispNodeId.slice("disp.".length);
  if (rest.length === 0) return null;
  if (!/^[a-z0-9]+$/i.test(rest)) return null;
  return rest;
}

/**
 * Build a case-insensitive index of dispatcher files: lowercased-basename →
 * actual file path (relative to REPO_ROOT).
 */
export function buildDispatcherIndex(dispatchersDir, listFn) {
  const list = listFn ?? ((d) => readdirSync(d));
  const out = new Map();
  let entries;
  try {
    entries = list(dispatchersDir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (!name.endsWith(".ts")) continue;
    if (name.endsWith(".test.ts")) continue;
    const base = name.slice(0, -".ts".length).toLowerCase();
    out.set(base, name);
  }
  return out;
}

/**
 * U-VIZ-GHOST-WIRE-STRENGTH: strip JS/TS comments from source so a confirmation
 * can tell a REAL wire (engine referenced in code) from an incidental mention in
 * a comment ("existence != correct wiring"). String/template-literal aware so a
 * `//` or `/*` inside a string is NOT mistaken for a comment. Comments collapse
 * to a single space (preserves token word-boundaries); newlines outside block
 * comments are preserved. O(n), single pass, no regex backtracking.
 *
 * Conservative-by-design: any ambiguity (e.g. code inside a `${...}` template
 * substitution) is treated as code (NOT stripped), so the failure direction is
 * "keep a real match" -> never a false WEAK. A mis-strip can only DOWNGRADE a
 * code match to weak (excluded from ground truth) -- never UPGRADE a comment to
 * strong. Precision over recall for ground-truth labels.
 */
export function stripComments(src) {
  if (typeof src !== "string") return "";
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : "";
    // String / template literal: copy verbatim, honoring backslash escapes.
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i += 1;
      while (i < n) {
        const ch = src[i];
        if (ch === "\\") {
          out += ch;
          if (i + 1 < n) { out += src[i + 1]; i += 2; continue; }
          i += 1;
          continue;
        }
        out += ch;
        i += 1;
        if (ch === quote) break;
      }
      continue;
    }
    // Line comment -> single space (stop at newline; newline copied next loop).
    if (c === "/" && c2 === "/") {
      i += 2;
      while (i < n && src[i] !== "\n") i += 1;
      out += " ";
      continue;
    }
    // Block comment -> single space (consume through the closing star-slash).
    if (c === "/" && c2 === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      out += " ";
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * U-VIZ-GHOST-WIRE-STRENGTH: given a CONFIRMED match (engine name present in the
 * dispatcher text), grade WHERE it matched:
 *   - codeMatch:    name appears outside all comments (a real reference)
 *   - commentMatch: name appears ONLY inside comment(s) (incidental mention)
 *   - inImport:     a non-comment import/require line references the name (the
 *                   strongest single signal of an actual wire)
 *   - strength:     "strong" if codeMatch else "weak"
 *
 * Pure -> hermetically testable. Word-boundary anchored + regex-escaped so
 * "MillEngine" never matches "WindMillEngine" (mirrors classifyGhostWire).
 */
export function analyzeConfirmationContext(engineName, dispatcherText) {
  const trimmed = typeof engineName === "string" ? engineName.trim() : "";
  const none = { codeMatch: false, commentMatch: false, inImport: false, strength: "weak" };
  if (trimmed.length === 0 || typeof dispatcherText !== "string") return none;
  const esc = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const makeRe = () => new RegExp(`\\b${esc}\\b`);
  if (!makeRe().test(dispatcherText)) return none; // not actually present (defensive)
  const stripped = stripComments(dispatcherText);
  const codeMatch = makeRe().test(stripped);
  const commentMatch = !codeMatch; // present in full but not in stripped => comment-only
  let inImport = false;
  if (codeMatch) {
    for (const line of stripped.split("\n")) {
      if (/\b(?:import|require)\b/.test(line) && makeRe().test(line)) { inImport = true; break; }
    }
  }
  return { codeMatch, commentMatch, inImport, strength: codeMatch ? "strong" : "weak" };
}

/**
 * Classify a single ghost-wire against the current dispatcher text.
 *
 * Word-boundary match: engine names like "MillEngine" should NOT match
 * "WindMillEngine" — we anchor on \b. Empty/whitespace engine name → refuted
 * with reason "malformed-engine-name" (the ghost itself is broken).
 *
 * Clock skew: if proposed_at is in the future relative to `now`, daysOpen is
 * clamped to 0 rather than negative — surfaces as pending, not a confirmation.
 */
export function classifyGhostWire({ engineName, proposedAt, dispatcherText, now, refutedAfterDays = REFUTED_AFTER_DAYS }) {
  const trimmedName = typeof engineName === "string" ? engineName.trim() : "";
  if (trimmedName.length === 0) {
    return { status: STATUS_REFUTED, reason: "malformed-engine-name", daysOpen: 0 };
  }
  const proposedTs = Date.parse(proposedAt);
  let daysOpen = 0;
  if (Number.isFinite(proposedTs) && Number.isFinite(now)) {
    daysOpen = Math.max(0, Math.floor((now - proposedTs) / MS_PER_DAY));
  }
  if (typeof dispatcherText !== "string") {
    return { status: STATUS_PENDING, reason: "dispatcher-unreadable", daysOpen };
  }
  // Word-boundary regex; escape the engine name to neutralize regex meta.
  const esc = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${esc}\\b`);
  if (re.test(dispatcherText)) {
    // U-VIZ-GHOST-WIRE-STRENGTH: grade WHERE the match landed. A name found only
    // inside a comment is NOT a real wire ("existence != correct wiring") -> weak,
    // so the ground-truth consumer (GNN ref pool) can exclude it. status stays
    // CONFIRMED for backward-compat; the strength field carries the new signal.
    const ctx = analyzeConfirmationContext(trimmedName, dispatcherText);
    return {
      status: STATUS_CONFIRMED,
      reason: ctx.strength === "weak" ? "engine-referenced-comment-only" : "engine-referenced",
      daysOpen,
      confirmationStrength: ctx.strength,
      evidence: { codeMatch: ctx.codeMatch, commentMatch: ctx.commentMatch, inImport: ctx.inImport },
    };
  }
  if (daysOpen > refutedAfterDays) {
    return { status: STATUS_REFUTED, reason: `no-reference-after-${refutedAfterDays}d`, daysOpen };
  }
  return { status: STATUS_PENDING, reason: "no-reference-yet", daysOpen };
}

/**
 * Iterate every ghost.unwired-engine node in the graph, classify it, and
 * emit (a) labeled outcomes for retrain and (b) an augmentation overlay
 * coloring the ghost edges confirmed=green / refuted=red / pending=amber.
 *
 * Pure: takes injectable `dispatcherReader(basename) → text|null`,
 * `dispatcherIndex Map<lowerBase, actualFilename>`, and `now` (ms).
 */
export function validate({ graph, dispatcherIndex, dispatcherReader, now, refutedAfterDays = REFUTED_AFTER_DAYS }) {
  if (!graph || typeof graph !== "object") {
    throw new TypeError("validate: graph must be an object");
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const outcomes = [];
  // Overlay convention: annotations keyed by node id (matches wiringOverlay /
  // staleness pattern in merge-augmentations.mjs). Consumers do
  // `node = byId.get(id); Object.assign(node, annotations[id])`.
  const overlayAnnotations = Object.create(null);
  const overlayEdges = [];
  // weakConfirmed is a SUBSET counter of confirmed (comment-only matches) -- it does
  // NOT reduce counts.confirmed (status is unchanged for backward-compat); it surfaces
  // the false-positive ground-truth rate so the problem is VISIBLE (R12).
  const counts = { confirmed: 0, refuted: 0, pending: 0, malformed: 0, weakConfirmed: 0 };
  for (const node of nodes) {
    if (!node || node.kind !== "ghost.unwired-engine") continue;
    const engineName = node.label;
    const proposedAt = node.proposed_at;
    const proposedWiring = node.proposed_wiring;
    const dispNodeId = mcpToolToDispNodeIdLocal(proposedWiring);
    const basename = dispNodeIdToBasename(dispNodeId);
    let dispatcherText = null;
    let dispatcherFile = null;
    if (basename && dispatcherIndex.has(basename)) {
      dispatcherFile = dispatcherIndex.get(basename);
      try {
        dispatcherText = dispatcherReader(dispatcherFile);
      } catch {
        dispatcherText = null;
      }
    } else {
      counts.malformed += 1;
    }
    const result = classifyGhostWire({
      engineName,
      proposedAt,
      dispatcherText,
      now,
      refutedAfterDays,
    });
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    if (result.status === STATUS_CONFIRMED && result.confirmationStrength === "weak") {
      counts.weakConfirmed += 1;
    }
    const outcome = {
      ghostId: node.id,
      engineName,
      proposedAt,
      proposedWiring,
      confidence: node.confidence,
      reason: node.reason,
      dispatcherFile,
      validation: result,
      validatedAt: new Date(now).toISOString(),
    };
    outcomes.push(outcome);
    // Overlay annotation keyed by ghost node id — client-side painter looks
    // up by id and Object.assigns this stamp onto the existing node.
    overlayAnnotations[node.id] = {
      ghost_wire_status: result.status,
      ghost_wire_reason: result.reason,
      ghost_wire_days_open: result.daysOpen,
      // null for non-confirmed; "strong"/"weak" for confirmed (U-VIZ-GHOST-WIRE-STRENGTH).
      ghost_wire_confirmation_strength: result.confirmationStrength ?? null,
    };
    // Overlay edge re-anchors the proposed-wire edge with a color signal.
    if (dispNodeId) {
      overlayEdges.push({
        from: node.id,
        to: dispNodeId,
        type: "ghost-wire-validation",
        status: result.status,
        intensity: STATUS_INTENSITIES[result.status] ?? STATUS_INTENSITIES[STATUS_PENDING],
      });
    }
  }
  return {
    outcomes,
    counts,
    augmentation: {
      kind: "ghost-wire-validation",
      version: 1,
      generatedAt: new Date(now).toISOString(),
      counts,
      annotations: overlayAnnotations,
      edges: overlayEdges,
    },
  };
}

// Local copy of the MCP-tool → disp node id map. Kept in sync with
// seed-ghost-from-unwired.mjs (the source of truth for proposed_wiring values).
// R8: we read the same convention rather than re-derive it.
const MCP_TOOL_TO_DISP_NODE_ID = Object.freeze({
  prism_calc: "disp.calcdispatcher",
  prism_safety: "disp.safetydispatcher",
  prism_cam: "disp.camdispatcher",
  prism_cad: "disp.caddispatcher",
  prism_turning: "disp.turningdispatcher",
  prism_5axis: "disp.fiveaxisdispatcher",
  prism_ai: "disp.aireasoningdispatcher",
  prism_intelligence: "disp.intelligencedispatcher",
  prism_omega: "disp.omegadispatcher",
  prism_memory: "disp.memorydispatcher",
  prism_session: "disp.sessiondispatcher",
  prism_dev: "disp.devdispatcher",
  prism_orchestrate: "disp.orchestrationdispatcher",
  prism_skill_script: "disp.skillscriptdispatcher",
  prism_guard: "disp.guarddispatcher",
  prism_intake: "disp.intakedispatcher",
});
function mcpToolToDispNodeIdLocal(mcpToolName) {
  if (typeof mcpToolName !== "string" || mcpToolName.length === 0) return null;
  return Object.hasOwn(MCP_TOOL_TO_DISP_NODE_ID, mcpToolName)
    ? MCP_TOOL_TO_DISP_NODE_ID[mcpToolName]
    : `disp.${mcpToolName.toLowerCase()}`;
}

// ---------- CLI ----------

function runCli() {
  const graphPath = join(REPO_ROOT, "state", "shared", "system-viz", "system-graph.json");
  const dispatchersDir = join(REPO_ROOT, "mcp-server", "src", "tools", "dispatchers");
  const outcomesPath = join(REPO_ROOT, "state", "shared", "ghost-wire-outcomes.jsonl");
  // Augmentations live alongside system-graph.json — that's where
  // merge-augmentations.mjs:loadOptional() reads from (no staging/ subfolder
  // in this pipeline; see VIZ_DIR in merge-augmentations.mjs:26).
  const augDir = join(REPO_ROOT, "state", "shared", "system-viz");
  const augPath = join(augDir, "ghost-wire-validation-augmentation.json");

  if (!existsSync(graphPath)) {
    console.error(`validate-ghost-wires: graph not found at ${graphPath}`);
    process.exit(1);
  }
  let graph;
  try {
    const bytes = statSync(graphPath).size;
    graph = bytes > STREAMING_READ_THRESHOLD_BYTES
      ? readGraphStreaming(graphPath)
      : JSON.parse(readFileSync(graphPath, "utf8"));
  } catch (err) {
    console.error(`validate-ghost-wires: graph not loadable: ${err.message}`);
    process.exit(1);
  }
  const dispatcherIndex = buildDispatcherIndex(dispatchersDir);
  const dispatcherReader = (basename) => readFileSync(join(dispatchersDir, basename), "utf8");
  const now = Date.now();
  const result = validate({ graph, dispatcherIndex, dispatcherReader, now });

  // 1. Append outcomes JSONL — labeled dataset for NN-GRAPH retrain.
  //    Append-only: keep history so we can compute precision/recall over time.
  mkdirSync(dirname(outcomesPath), { recursive: true });
  const lines = result.outcomes.map((o) => JSON.stringify(o)).join("\n");
  if (lines.length > 0) appendFileSync(outcomesPath, lines + "\n");

  // 2. Emit augmentation overlay.
  mkdirSync(augDir, { recursive: true });
  writeFileSync(augPath, JSON.stringify(result.augmentation, null, 2));

  process.stdout.write(JSON.stringify({
    ok: true,
    ghostsScanned: result.outcomes.length,
    counts: result.counts,
    outcomesPath,
    augPath,
  }, null, 2) + "\n");
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1] === __filename) {
  runCli();
}
