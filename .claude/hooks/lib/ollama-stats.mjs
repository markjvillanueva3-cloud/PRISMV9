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
  readdirSync, statSync,
} from 'node:fs';
import { dirname, basename } from 'node:path';

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

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === 'EPERM'; }
}

/**
 * Reap our own orphaned atomic-write temps for `path`. These leak when a hook's node.exe is
 * KILLED (fleet-reaper / OOM) between writeFileSync(tmp) and renameSync — no catch runs, so the
 * tmp survives. The old suffix (`.tmp.<pid>.<rand>`) matched NO fleet janitor → 100s accumulated
 * unswept (golf, 2026-05-31). Reap when the embedded pid is dead OR the file is >5min old. The
 * regex matches BOTH the legacy `.tmp.<pid>` and the new `.tmp-<pid>` so the backlog drains too.
 */
function reapStaleTmps(path) {
  try {
    const dir = dirname(path);
    const base = basename(path) + '.tmp';
    const now = Date.now();
    for (const name of readdirSync(dir)) {
      if (!name.startsWith(base)) continue;
      const m = name.match(/\.tmp[.-](\d+)/);
      const pid = m ? Number(m[1]) : NaN;
      let old = false;
      try { old = (now - statSync(`${dir}/${name}`).mtimeMs) > 300000; } catch { continue; }
      if ((Number.isInteger(pid) && !isPidAlive(pid)) || old) {
        try { unlinkSync(`${dir}/${name}`); } catch { /* best-effort */ }
      }
    }
  } catch { /* best-effort — never fail a stats write on cleanup */ }
}

function atomicWrite(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  reapStaleTmps(path); // self-heal: clear our own prior orphans before writing
  // `.tmp-<pid>` is the janitor-matched pattern (tmp-orphan-janitor sweeps /\.tmp-\d+$/), so a
  // kill-mid-write orphan is ALSO caught by the durable PRISM Tmp Sweep as a backstop.
  const tmp = `${path}.tmp-${process.pid}`;
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
    // U-OFFLOAD-ACTION (2026-06-12, scrutiny P1): an EXECUTED offload
    // (ask-ollama actually ran -- extras.mode:"executed") is the ADOPTION
    // metric, not a second directive. Folding it into offloaded/
    // estimatedTokensSaved would double-count one adopted action (directive
    // estimate + measured delta summed) and inflate the headline offload rate
    // exactly as adoption succeeds. Separate counters; byHook still tracks it
    // under its own hook bucket.
    if (mode === 'executed') {
      stats.executedOffloads = (stats.executedOffloads || 0) + 1;
      stats.measuredTokensSaved = (stats.measuredTokensSaved || 0) + (tokensSaved || 0);
      return;
    }
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

    // Executed events carry ask-ollama MODE names (summarize/explain/ask), a
    // different taxonomy from the classifier categories (summary/explanation/..)
    // -- keep them out of byCategory so the two namespaces never interleave
    // (scrutiny P2 2026-06-12). byHook["ask-ollama"] carries the executed view.
    if (decision === 'offload' && category && extras?.mode !== 'executed') {
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
