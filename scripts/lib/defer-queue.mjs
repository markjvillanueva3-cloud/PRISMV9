// scripts/lib/defer-queue.mjs
// ---------------------------
// TOKEN-SAVINGS-PIVOT/U-PSN-DEFER-QUEUE (iter15, 2026-05-23, slot:alpha)
//
// Pure-function queue for advisory nudges (backendAuditChain, doctrineSurface)
// that fire mid-edit and can't be acted on in the moment. Queue is written by
// the PreToolUse route-suggest hook, drained by a Stop hook at session-end.
//
// Why: 90% of route-suggest fires are post-edit advisory ("run audit chain
// after meaningful edits"). Operator/model can't context-switch mid-edit →
// 0% take-rate fleet-wide. Deferring to session-end converts this from
// "interrupting noise" to "actionable wind-down checklist".
//
// Schema (state/shared/defer-queue.json):
//   { schemaVersion, items: [{ ts, sessionId, classifier, filePath?, command?, hint }] }
//
// Pure where possible; IO functions clearly named with -ToFile suffix.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_QUEUE_FILE = "H:/prism/state/shared/defer-queue.json";
export const SCHEMA_VERSION = "1.0.0";
export const QUEUE_MAX_ITEMS = 200; // bound the queue; oldest evicted

// Classifiers eligible for deferral. These fire mid-edit/mid-read and
// genuinely cannot be acted on until the session winds down.
export const DEFERRABLE_CLASSIFIERS = new Set([
  "backendAuditChain",
  "doctrineSurface",
]);

/**
 * Pure: is this classifier eligible for deferral?
 */
export function isDeferrable(classifier) {
  return typeof classifier === "string" && DEFERRABLE_CLASSIFIERS.has(classifier);
}

/**
 * Pure: merge a new queue item into a queue object. Caps at QUEUE_MAX_ITEMS
 * by evicting oldest. Returns the new queue (does not mutate input).
 */
export function pushToQueue(queue, item) {
  const base = (queue && typeof queue === "object") ? queue : { schemaVersion: SCHEMA_VERSION, items: [] };
  const items = Array.isArray(base.items) ? base.items : [];
  if (!item || typeof item !== "object") return { ...base, items };
  // Defensive copy with normalized fields.
  const normalized = {
    ts: item.ts || new Date().toISOString(),
    sessionId: String(item.sessionId || "").slice(0, 36),
    classifier: String(item.classifier || ""),
    filePath: item.filePath ? String(item.filePath) : undefined,
    command: item.command ? String(item.command) : undefined,
    hint: String(item.hint || ""),
  };
  // Drop undefined keys for cleaner JSON.
  for (const k of Object.keys(normalized)) {
    if (normalized[k] === undefined) delete normalized[k];
  }
  const next = [normalized, ...items].slice(0, QUEUE_MAX_ITEMS);
  return { ...base, schemaVersion: SCHEMA_VERSION, items: next };
}

/**
 * Pure: filter queue items to a given session. Returns array of items.
 */
export function itemsForSession(queue, sessionId) {
  if (!queue || !Array.isArray(queue.items)) return [];
  if (!sessionId || typeof sessionId !== "string") return [];
  const prefix = sessionId.slice(0, 8);
  return queue.items.filter((it) => {
    if (!it || typeof it.sessionId !== "string") return false;
    return it.sessionId === sessionId || it.sessionId === prefix || it.sessionId.startsWith(prefix);
  });
}

/**
 * Pure: drain (remove) items belonging to a session. Returns new queue
 * object without those items. Drained items returned separately.
 */
export function drainSession(queue, sessionId) {
  if (!queue || !Array.isArray(queue.items)) return { remaining: { ...queue, items: [] }, drained: [] };
  if (!sessionId) return { remaining: queue, drained: [] };
  const prefix = sessionId.slice(0, 8);
  const drained = [];
  const remaining = [];
  for (const it of queue.items) {
    if (!it || typeof it.sessionId !== "string") { remaining.push(it); continue; }
    const matches = it.sessionId === sessionId || it.sessionId === prefix || it.sessionId.startsWith(prefix);
    (matches ? drained : remaining).push(it);
  }
  return {
    remaining: { ...queue, schemaVersion: SCHEMA_VERSION, items: remaining },
    drained,
  };
}

/**
 * Pure: format a drain block for SessionStop emission. Groups items by
 * classifier; emits at most N per group to bound output.
 */
export function formatDrainBlock(drained, opts = {}) {
  if (!Array.isArray(drained) || drained.length === 0) return null;
  const perGroupCap = typeof opts.perGroupCap === "number" ? opts.perGroupCap : 5;
  const byClassifier = {};
  for (const it of drained) {
    if (!it || typeof it !== "object") continue;
    const k = it.classifier || "other";
    if (!byClassifier[k]) byClassifier[k] = [];
    byClassifier[k].push(it);
  }
  const lines = [
    `## 🧰 Session wind-down — ${drained.length} deferred advisor${drained.length === 1 ? "y" : "ies"}`,
    `_These nudges fired during your session but couldn't be acted on mid-task. Quick review before /handoff:_`,
    "",
  ];
  for (const [cls, items] of Object.entries(byClassifier)) {
    lines.push(`### ${cls} (${items.length})`);
    const shown = items.slice(0, perGroupCap);
    for (const it of shown) {
      const where = it.filePath || it.command || "—";
      lines.push(`- ${where}`);
    }
    if (items.length > perGroupCap) {
      lines.push(`  …and ${items.length - perGroupCap} more`);
    }
    lines.push("");
  }
  lines.push(`_Run \`prism_dev:code_search\` or \`prism_session:dispatcher_map_compact\` to action; \`prism_dev:ollama_hook_query\` to triage. Disable: \`PRISM_DEFER_QUEUE_DISABLE=1\`._`);
  return lines.join("\n");
}

// --- IO functions (best-effort, never throw) ---

export function readQueueFromFile(path = DEFAULT_QUEUE_FILE) {
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return { schemaVersion: SCHEMA_VERSION, items: [] };
  }
}

export function writeQueueToFile(queue, path = DEFAULT_QUEUE_FILE) {
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = `${path}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(queue, null, 2), "utf8");
    // Atomic rename — best-effort; if it fails the tmp gets cleaned next cycle.
    try {
      const { renameSync } = require("node:fs");
      renameSync(tmp, path);
    } catch {
      // Fallback: direct write
      writeFileSync(path, JSON.stringify(queue, null, 2), "utf8");
    }
    return true;
  } catch {
    return false;
  }
}
