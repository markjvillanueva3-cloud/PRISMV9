#!/usr/bin/env node
// tier: T1
/**
 * grep-index-first.mjs - PreToolUse Grep
 * Suggests checking MASTER_INDEX before expensive grep searches.
 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
 * Falls back to regex-based suggestions when Ollama unavailable.
 *
 * Token savings: 50-80% on known patterns.
 *
 * PSN-SYNERGIZE/U-GREP-GRAPH-WIRE (2026-05-23, slot:sierra): closes the
 * "named index-first but doesn't query the index" wiring gap.
 *   1. Adds `getGraphNodeHits()` — DIRECT system-graph.json node-name match
 *      (case-insensitive, top-3 hits with file paths). When a grep pattern
 *      is the literal name of a known node (engine class, dispatcher,
 *      action, skill, hook), the hook surfaces the exact path so Claude
 *      can `Read` it instead of grep-scanning.
 *   2. Adds `recordTelemetry()` — atomic-RMW into ollama-offload-stats.json
 *      `byHook['grep-index-first'] = {fired, suggested}` so this hook is
 *      visible in the same dashboard that already shows
 *      ollama-task-offloader + ollama-route-pretooluse (PSN: System Viz).
 *   3. DI seams (statsFn, graphFn) keep the hook unit-testable in
 *      grep-index-first.test.mjs.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { decayDecision } from '../../scripts/lib/advisory-decay.mjs'; // U-GREP-INDEX-DECAY-WIRE: mute proven-noise advisory (R15 clone of large-read-digest)

const __dirname = dirname(fileURLToPath(import.meta.url));
// One stats path for BOTH recordTelemetry (write) and the decay read, so
// read-path == write-path. env-overridable for hermetic decay-gate testing.
const STATS_PATH = process.env.PRISM_GREP_INDEX_STATS_PATH || join(process.cwd(), 'mcp-server', 'data', 'state', 'ollama-offload-stats.json');

// Lazy-load Ollama bridge (don't fail if missing)
let queryOllama = null;
try {
  const bridge = await import('./lib/ollama-hook-bridge.mjs');
  queryOllama = bridge.queryOllama;
} catch {
  // Ollama bridge not available — will use regex fallback
}

// Module-vs-CLI gate: top-level stdin parsing only runs when this file is
// the entry point (node grep-index-first.mjs), NOT when test/lib imports
// it for its exports. Without this guard, `import { recordTelemetry } from
// './grep-index-first.mjs'` would crash on the empty-stdin JSON.parse.
const _entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
let input = { tool_name: '', tool_input: {}, session_id: '' };
if (_entry) {
  input = JSON.parse(readFileSync(0, 'utf8'));
}
const { tool_name, tool_input } = input;
// session_id is present in the PreToolUse stdin payload; fall back to '' so the
// pending-marker write degrades gracefully (a sessionless run just writes under
// the '' key -- still correlatable within that orphan session, never throws).
const session_id = input.session_id || '';

if (_entry && tool_name !== 'Grep') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Session-scoped rate limit: emit once per 60 seconds per distinct suggestion
const RATE_DIR = join(os.tmpdir(), 'prism-hook-state');
const RATE_FILE = join(RATE_DIR, 'grep-index-first.last.json');
const RATE_WINDOW_MS = 60_000;

function loadRate() {
  try { return JSON.parse(readFileSync(RATE_FILE, 'utf8')); } catch { return {}; }
}
function saveRate(state) {
  try {
    if (!existsSync(RATE_DIR)) mkdirSync(RATE_DIR, { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}

const pattern = tool_input?.pattern || '';
const path = tool_input?.path || '.';

// ------------------------------------------------------------------
// System-graph node lookup (PSN-SYNERGIZE/U-GREP-GRAPH-WIRE)
// ------------------------------------------------------------------
// Cached on file mtime so repeated greps in the same session don't re-read
// the ~30MB system-graph.json. Plain Map keyed by absolute path.
const _graphCache = new Map();

export function getGraphNodeHits(searchPattern, opts = {}) {
  const graphPath = opts.graphPath
    || join(process.cwd(), 'state', 'shared', 'system-viz', 'system-graph.json');
  const maxHits = typeof opts.maxHits === 'number' ? opts.maxHits : 3;

  // Reject patterns that would over-match (single char, empty, very short
  // tokens, regex meta-characters dominating). The graph has 110K nodes —
  // a 2-char substring search returns hundreds of false positives.
  const cleaned = String(searchPattern || '').trim();
  if (cleaned.length < 4) return [];
  // Drop regex meta so 'class\\s+\\w*Engine' searches for 'class' / 'Engine'
  // tokens rather than literal regex characters.
  const tokens = cleaned
    .split(/[^A-Za-z0-9_-]+/)
    .filter((t) => t.length >= 4)
    .slice(0, 4);
  if (tokens.length === 0) return [];

  try {
    if (!existsSync(graphPath)) return [];
    const stat = statSync(graphPath);
    const cacheKey = `${graphPath}::${stat.mtimeMs}`;
    let graph = _graphCache.get(cacheKey);
    if (!graph) {
      _graphCache.clear();
      graph = JSON.parse(readFileSync(graphPath, 'utf8'));
      _graphCache.set(cacheKey, graph);
    }
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const lcTokens = tokens.map((t) => t.toLowerCase());
    const hits = [];
    for (const n of nodes) {
      if (!n) continue;
      const hay = `${n.id || ''} ${n.name || ''} ${n.label || ''}`.toLowerCase();
      if (lcTokens.every((t) => hay.includes(t))) {
        hits.push({
          id: n.id,
          name: n.name || n.label || n.id,
          layer: n.layer || n.tier || '?',
          built: n.built === true ? 'built' : n.built === false ? 'ghost' : '?',
          path: n.path || n.file || null,
        });
        if (hits.length >= maxHits) break;
      }
    }
    return hits;
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------
// Telemetry sink — atomic-RMW into ollama-offload-stats.json
// ------------------------------------------------------------------
// Matches the byHook[] schema set by ollama-route-pretooluse so the
// existing /offload-stats dashboard surfaces this hook automatically.
export function recordTelemetry({ suggested, offloaded, statsPath } = {}) {
  const file = statsPath || join(process.cwd(), 'mcp-server', 'data', 'state', 'ollama-offload-stats.json');
  try {
    let stats;
    if (existsSync(file)) {
      stats = JSON.parse(readFileSync(file, 'utf8'));
    } else {
      stats = { schemaVersion: '2.0.0', byHook: {} };
    }
    if (!stats.byHook || typeof stats.byHook !== 'object') stats.byHook = {};
    // Initialize with offloaded:0 so the KEY exists -- this alone flips
    // advisory-decay classify() from 'unmeasurable' (no offloaded key) to a
    // measurable state. The taken-signal (grep-index-taken-correlator) bumps it.
    const slot = stats.byHook['grep-index-first'] || { fired: 0, suggested: 0, offloaded: 0 };
    if (typeof slot.offloaded !== 'number') slot.offloaded = 0;
    // An offloaded-only call (the taken-event from the correlator) bumps the
    // taken counter WITHOUT touching fired/suggested. A normal hook-fire bumps
    // fired (+ suggested when an advisory was injected) and leaves offloaded.
    if (offloaded) {
      slot.offloaded = (slot.offloaded || 0) + 1;
    } else {
      slot.fired = (slot.fired || 0) + 1;
      if (suggested) slot.suggested = (slot.suggested || 0) + 1;
    }
    stats.byHook['grep-index-first'] = slot;
    stats.lastUpdated = new Date().toISOString();
    // Atomic write: tmp + rename. PID-stamped tmp avoids peer-fleet collision
    // — every other slot may be hitting this same stats file concurrently.
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    writeFileSync(tmp, JSON.stringify(stats, null, 2));
    renameSync(tmp, file);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

// ------------------------------------------------------------------
// Taken-signal: PENDING marker (U-GREP-TAKEN-SIGNAL)
// ------------------------------------------------------------------
// When this hook injects a suggestion naming target path(s), it writes a
// session-scoped marker. The PreToolUse:Read correlator
// (grep-index-taken-correlator.mjs) reads it: if the SAME session shortly
// after Reads one of those exact target paths, that is the advice being
// followed -> a real `offloaded` (taken) event. This gives the hook the
// numeric taken-signal that advisory-decay.classify() needs to leave
// 'unmeasurable'.
export const PENDING_FILE = join(os.tmpdir(), 'prism-hook-state', 'grep-index-pending.json');
export const PENDING_TTL_MS = 10 * 60_000; // 10 minutes

// extractSuggestionPaths -- PURE. Pull the set of target file paths a
// suggestion named: the `-> <path>` tails of graph hits + the index-file
// paths surfaced. De-duped, falsy-filtered, string-only.
export function extractSuggestionPaths(graphHits = [], surfacedIndexFiles = []) {
  const out = [];
  for (const h of Array.isArray(graphHits) ? graphHits : []) {
    const p = h && h.path;
    if (typeof p === 'string' && p.trim()) out.push(p.trim());
  }
  for (const f of Array.isArray(surfacedIndexFiles) ? surfacedIndexFiles : []) {
    const p = f && f.path;
    if (typeof p === 'string' && p.trim()) out.push(p.trim());
  }
  // De-dupe preserving order.
  return [...new Set(out)];
}

// readPending -- fail-safe read of the session pending marker map.
// Returns {} on any error (absent/corrupt). Optional pendingPath for tests.
export function readPending({ pendingPath } = {}) {
  const file = pendingPath || PENDING_FILE;
  try {
    const j = JSON.parse(readFileSync(file, 'utf8'));
    return j && typeof j === 'object' ? j : {};
  } catch {
    return {};
  }
}

// writePendingMap -- atomic write of the FULL pending-marker map. Used by the
// correlator to persist a trimmed/dropped session entry after a take converts.
// Atomic tmp+rename. Fail-safe: never throws. Optional pendingPath for tests.
export function writePendingMap(map, { pendingPath } = {}) {
  const file = pendingPath || PENDING_FILE;
  try {
    const safe = map && typeof map === 'object' ? map : {};
    const dir = dirname(file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(safe));
    renameSync(tmp, file);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

// writePending -- merge this session's {ts, paths} entry into the marker map,
// prune entries older than TTL, atomic tmp+rename. Fail-safe: never throws.
// Optional pendingPath + now (epoch ms) for tests.
export function writePending(sessionId, paths, { pendingPath, now } = {}) {
  const file = pendingPath || PENDING_FILE;
  const ts = typeof now === 'number' ? now : Date.now();
  try {
    const list = (Array.isArray(paths) ? paths : []).filter(
      (p) => typeof p === 'string' && p.trim(),
    );
    if (list.length === 0) return { ok: true, skipped: 'no-paths' };
    const map = readPending({ pendingPath: file });
    // Prune stale entries (including this session's about-to-be-replaced one).
    for (const k of Object.keys(map)) {
      const e = map[k];
      if (!e || typeof e.ts !== 'number' || ts - e.ts > PENDING_TTL_MS) delete map[k];
    }
    // Merge/replace this session's entry.
    map[String(sessionId || '')] = { ts, paths: list };
    const dir = dirname(file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(map));
    renameSync(tmp, file);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

// Index files that might already have the answer
const indexFiles = [
  { path: 'mcp-server/data/docs/ENGINE_DIGEST.md', covers: ['Engine', 'engine', 'calculate', 'compute'] },
  { path: 'mcp-server/data/docs/DISPATCHER_DIGEST.md', covers: ['dispatcher', 'action', 'prism_'] },
  { path: 'mcp-server/data/docs/DIRECTORY_DIGEST.md', covers: ['directory', 'folder', 'path', 'location'] },
  { path: 'state/shared/PRISM_SHARED_INDEX_SURFACES.md', covers: ['index', 'search', 'find'] },
  { path: 'PRISM-INVENTORY-LATEST.md', covers: ['count', 'total', 'how many', 'inventory'] },
  { path: 'mcp-server/data/state/cross-session-asset-registry.json', covers: ['asset', 'created', 'exists'] },
];

// Detect expensive search patterns
const expensivePatterns = [
  { regex: /class\s+\w*Engine/, suggestion: 'Engine class search → check ENGINE_DIGEST.md first' },
  { regex: /export\s+(async\s+)?function/, suggestion: 'Function search in large codebase → narrow path first' },
  { regex: /import.*from/, suggestion: 'Import search → consider checking package.json or tsconfig paths' },
  { regex: /TODO|FIXME|HACK/, suggestion: 'TODO search → use `rtk grep TODO` for compact output' },
];

async function getRegexSuggestions() {
  const suggestions = [];
  const patternLower = pattern.toLowerCase();

  for (const { path: indexPath, covers } of indexFiles) {
    if (covers.some(keyword => patternLower.includes(keyword.toLowerCase()))) {
      const fullPath = join(process.cwd(), indexPath);
      if (existsSync(fullPath)) {
        suggestions.push(`Check ${indexPath} (pre-indexed for: ${covers.join(', ')})`);
      }
    }
  }

  for (const { regex, suggestion } of expensivePatterns) {
    if (regex.test(pattern)) {
      suggestions.push(suggestion);
    }
  }

  // Check if searching from root without path restriction
  if ((path === '.' || path === './' || !path) && !tool_input?.glob && !tool_input?.type) {
    suggestions.push('Searching from root without glob/type filter - consider narrowing');
  }

  return suggestions;
}

async function getOllamaSuggestions() {
  if (!queryOllama) return null;

  const prompt = `Search pattern: "${pattern}"
Search path: "${path}"
Available indexes: ENGINE_DIGEST.md (engines), DISPATCHER_DIGEST.md (actions), DIRECTORY_DIGEST.md (directories), PRISM_SHARED_INDEX_SURFACES.md (search indexes), PRISM-INVENTORY-LATEST.md (counts)

Which index should be checked first? Reply with just the index name and why in 1 line.`;

  try {
    const result = await queryOllama(prompt, {
      hookType: 'grep_index',
      timeoutMs: 300, // Fast timeout for hooks
      maxTokens: 50,
    });

    if (result.success && result.response) {
      return [`🤖 ${result.response}`];
    }
  } catch {
    // Ollama failed — fall through to regex
  }

  return null;
}

// surfacedIndexFiles -- PURE. The subset of indexFiles whose `covers`
// keywords matched the pattern AND which exist on disk. This is exactly the
// set getRegexSuggestions() emits "Check <path>" lines for, so the pending
// marker captures the SAME target paths the advisory named.
export function surfacedIndexFiles(searchPattern, files = indexFiles, cwd = process.cwd()) {
  const patternLower = String(searchPattern || '').toLowerCase();
  const out = [];
  for (const entry of Array.isArray(files) ? files : []) {
    const covers = Array.isArray(entry?.covers) ? entry.covers : [];
    if (covers.some((kw) => patternLower.includes(String(kw).toLowerCase()))) {
      if (existsSync(join(cwd, entry.path))) out.push(entry);
    }
  }
  return out;
}

async function main() {
  // PSN-SYNERGIZE wire: direct system-graph node-name hits beat keyword
  // hints. If the grep pattern names a known asset, Claude should `Read`
  // the file directly instead of grep-scanning for it.
  const graphHits = getGraphNodeHits(pattern);
  const graphSuggestions = graphHits.map(
    (h) =>
      `🎯 master-index hit: [${h.layer}/${h.built}] ${h.name}${h.path ? ` → ${h.path}` : ''}`,
  );

  // Try Ollama next (intelligent suggestions)
  const ollamaSuggestions = await getOllamaSuggestions();

  // Regex/keyword fallback
  const regexSuggestions = await getRegexSuggestions();

  // Compose with graph hits first (highest precedence), then Ollama,
  // then regex/keyword. Truncate to keep the additionalContext concise.
  const suggestions = [
    ...graphSuggestions,
    ...(ollamaSuggestions || []),
    ...regexSuggestions,
  ].slice(0, 6);

  if (suggestions.length === 0) {
    recordTelemetry({ suggested: false, statsPath: STATS_PATH });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limit — skip emitting if the same top suggestion fired recently
  const key = suggestions[0];
  const state = loadRate();
  const last = state[key] || 0;
  const now = Date.now();
  if (now - last < RATE_WINDOW_MS) {
    // Rate-limit skip: hook fired but no advisory injected. Count it as a
    // fire-without-suggestion so the dashboard sees the activity.
    recordTelemetry({ suggested: false, statsPath: STATS_PATH });
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  state[key] = now;
  // Prune old entries
  for (const k of Object.keys(state)) {
    if (now - state[k] > RATE_WINDOW_MS * 10) delete state[k];
  }
  saveRate(state);

  const message = [
    `📋 Index-first suggestions:`,
    ...suggestions.map(s => `  • ${s}`),
    `  Checking indexes first can save 50-80% tokens vs full grep.`,
  ].join('\n');

  recordTelemetry({ suggested: true, statsPath: STATS_PATH });

  // advisory-decay gate (U-GREP-INDEX-DECAY-WIRE, 2026-06-10): mute the nudge once
  // this hook is proven noise (>= 50 injections at < 5% conversion -- live: 3/283 =
  // 1%). recordTelemetry just bumped `suggested`, so the probe counter advances even
  // when muted (1-in-20 self-revival). When muted we ALSO skip the pending marker:
  // the advice was never shown, so a later coincidental Read must NOT be counted a
  // conversion (that would corrupt the taken-signal + keep it falsely converting).
  // The 1-in-20 probe DOES emit + write the marker, so it can still convert + revive.
  // Clone of the large-read-digest / ollama-route-pretooluse pattern; reads the SAME
  // STATS_PATH recordTelemetry wrote; fails SAFE (fire:true on unreadable/insufficient).
  const decay = decayDecision('grep-index-first', { statsPath: STATS_PATH });
  if (!decay.fire) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Taken-signal: write the session-scoped pending marker naming the exact
  // target paths this advisory surfaced (graph-hit paths + named index files).
  // The PreToolUse:Read correlator converts a matching Read into an offloaded
  // (taken) event. Fail-safe -- writePending never throws into the hook.
  try {
    const targetPaths = extractSuggestionPaths(graphHits, surfacedIndexFiles(pattern));
    if (targetPaths.length > 0) writePending(session_id, targetPaths);
  } catch { /* never block the Grep on a marker write */ }
  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
}

if (_entry) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}
