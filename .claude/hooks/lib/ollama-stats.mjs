// tier: T4
/**
 * ollama-stats.mjs — shared stats writer for all Ollama-bridge hooks.
 *
 * Before this module existed, only ollama-task-offloader wrote to
 * `mcp-server/data/state/ollama-offload-stats.json`, so the offload-rate
 * dashboard reported a single hook's view (~7%) and missed savings from
 * ollama-context-aggregator, ollama-obsidian-rag, ollama-engine-api-extractor,
 * ollama-reviewer-second-opinion, etc. This helper unifies the protocol so
 * every Ollama hook reports through the same surface.
 *
 * Usage:
 *   import { recordOllamaEvent } from './lib/ollama-stats.mjs';
 *   recordOllamaEvent({
 *     hook: 'ollama-context-aggregator',
 *     decision: 'offload',         // 'offload' | 'keep' | 'suggest'
 *     category: 'context-summary', // free-form tag
 *     tokensSaved: 420,            // estimate; 0 if unknown
 *     extras: { mode: 'rag-hit' }, // optional
 *   });
 *
 * The function is best-effort and silent on failure — it must NEVER throw
 * into a hook's main flow. Stats accuracy is secondary to hook reliability.
 *
 * Atomic write via tmp + rename (NTFS atomic). With 6+ concurrent chats
 * writing the same file, last-writer-wins is acceptable for a counter:
 * the worst case is ~1 lost increment, which is invisible at the dashboard
 * granularity (totals reported in tens, not units).
 */

import {
  existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync,
} from 'node:fs';
import { dirname } from 'node:path';

const STATS_PATH = 'H:/prism/mcp-server/data/state/ollama-offload-stats.json';
const EVENT_RETENTION_MS = 24 * 60 * 60 * 1000;
const VALID_DECISIONS = new Set(['offload', 'keep', 'suggest']);

function loadStats() {
  try {
    if (existsSync(STATS_PATH)) {
      return JSON.parse(readFileSync(STATS_PATH, 'utf8'));
    }
  } catch { /* fall through */ }
  return {
    schemaVersion: '2.0.0',
    offloaded: 0,
    keptOnClaude: 0,
    estimatedTokensSaved: 0,
    silentSuggestions: 0,
    injectedSuggestions: 0,
    byHook: {},
    byCategory: {},
    events: [],
    lastUpdated: null,
  };
}

function atomicWrite(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${path}.tmp.${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
  try {
    writeFileSync(tmp, data, 'utf8');
    renameSync(tmp, path);
    return true;
  } catch {
    try { unlinkSync(tmp); } catch { /* ok */ }
    return false;
  }
}

function pruneEvents(events, now) {
  const cutoff = now - EVENT_RETENTION_MS;
  return events.filter((e) => {
    const t = Date.parse(e.ts);
    return Number.isFinite(t) && t >= cutoff;
  });
}

function bumpHookCounter(stats, hook, decision, tokensSaved) {
  if (!stats.byHook) stats.byHook = {};
  if (!stats.byHook[hook]) {
    stats.byHook[hook] = { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 };
  }
  const h = stats.byHook[hook];
  h.fired = (h.fired || 0) + 1;
  if (decision === 'offload') h.offloaded = (h.offloaded || 0) + 1;
  else if (decision === 'keep') h.kept = (h.kept || 0) + 1;
  else if (decision === 'suggest') h.suggested = (h.suggested || 0) + 1;
  h.tokensSaved = (h.tokensSaved || 0) + (tokensSaved || 0);
}

function bumpTotals(stats, decision, tokensSaved, mode) {
  if (decision === 'offload') {
    stats.offloaded = (stats.offloaded || 0) + 1;
    stats.estimatedTokensSaved = (stats.estimatedTokensSaved || 0) + (tokensSaved || 0);
  } else if (decision === 'keep') {
    stats.keptOnClaude = (stats.keptOnClaude || 0) + 1;
  } else if (decision === 'suggest') {
    if (mode === 'injected') {
      stats.injectedSuggestions = (stats.injectedSuggestions || 0) + 1;
    } else {
      stats.silentSuggestions = (stats.silentSuggestions || 0) + 1;
    }
  }
}

/**
 * Record a single Ollama hook decision. Best-effort; never throws.
 *
 * @param {object} args
 * @param {string} args.hook  Hook name (e.g. 'ollama-context-aggregator').
 * @param {('offload'|'keep'|'suggest')} args.decision  What the hook decided.
 * @param {string} [args.category]  Free-form category tag.
 * @param {number} [args.tokensSaved]  Estimated tokens saved (0 if unknown).
 * @param {object} [args.extras]  Extra fields merged into the event record.
 */
export function recordOllamaEvent({
  hook, decision, category, tokensSaved = 0, extras = {},
} = {}) {
  if (!hook || !VALID_DECISIONS.has(decision)) return;
  try {
    const stats = loadStats();
    const now = Date.now();
    const event = {
      ts: new Date(now).toISOString(),
      hook,
      decision,
      ...(category ? { category } : {}),
      ...(tokensSaved ? { tokensSaved } : {}),
      ...extras,
    };
    if (!Array.isArray(stats.events)) stats.events = [];
    stats.events.push(event);
    stats.events = pruneEvents(stats.events, now);

    bumpHookCounter(stats, hook, decision, tokensSaved);
    bumpTotals(stats, decision, tokensSaved, extras?.mode);

    if (decision === 'offload' && category) {
      if (!stats.byCategory) stats.byCategory = {};
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }

    stats.lastUpdated = new Date(now).toISOString();
    atomicWrite(STATS_PATH, JSON.stringify(stats, null, 2));
  } catch {
    /* silent: stats are advisory */
  }
}

/**
 * Convenience wrapper for the common keep case (most common decision).
 * @param {string} hook
 * @param {string} [category]
 * @param {string} [snippet]  First ~80 chars of the prompt/input that was kept.
 */
export function recordKeep(hook, category = 'unknown', snippet) {
  recordOllamaEvent({
    hook, decision: 'keep', category,
    extras: snippet ? { snippet: snippet.slice(0, 80) } : {},
  });
}

/**
 * Convenience wrapper for the offload case (the win condition).
 * @param {string} hook
 * @param {string} category
 * @param {number} tokensSaved
 * @param {object} [extras]
 */
export function recordOffload(hook, category, tokensSaved, extras = {}) {
  recordOllamaEvent({
    hook, decision: 'offload', category, tokensSaved, extras,
  });
}

/**
 * Convenience wrapper for the suggest case (would-have-offloaded but rate-limited
 * or below confidence threshold).
 * @param {string} hook
 * @param {('silent'|'injected'|'ollama-down')} mode
 * @param {object} [extras]
 */
export function recordSuggest(hook, mode = 'silent', extras = {}) {
  recordOllamaEvent({
    hook, decision: 'suggest', extras: { mode, ...extras },
  });
}
