#!/usr/bin/env node
// tier: T4
/**
 * ollama-route-recommender.mjs — UserPromptSubmit hook
 *
 * Event: UserPromptSubmit
 *
 * Layer 3 of Ollama Architecture:
 * Instead of Claude searching dispatchers to find the right action:
 * 1. Extract task intent from prompt
 * 2. Query Ollama with pre-indexed action patterns
 * 3. Inject recommended route (50 tokens vs 500+ for search)
 *
 * Token Savings: 70% of dispatcher search overhead
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const CACHE_PATH = 'H:/prism/.claude/cache/prism-awareness.json';
const RATE_FILE = 'H:/prism/.claude/cache/route-recommend-last.json';
const RATE_WINDOW_MS = 60 * 1000; // Once per minute max

// INTEL-OLLAMA-OBSIDIAN-MS0/P3-U04: Qdrant semantic top-K over the
// `action` collection (populated by scripts/embed-all-actions.mjs).
const MCP_TIMEOUT_MS = 3_000;
const SEMANTIC_TOP_K = 3;
const SEMANTIC_MIN_SCORE = 0.5;
function mcpUrl() { return process.env.MCP_HTTP_URL ?? 'http://127.0.0.1:3100/mcp'; }

async function semanticSearchActions(query, limit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MCP_TIMEOUT_MS);
  try {
    const res = await fetch(mcpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'prism_memory', arguments: { action: 'semantic_search', params: { query, kind: 'action', limit } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? '';
    try {
      const parsed = JSON.parse(inner);
      return Array.isArray(parsed?.items) ? parsed.items : [];
    } catch { return []; }
  } catch {
    clearTimeout(timer);
    return [];
  }
}

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function checkRateLimit() {
  try {
    const last = JSON.parse(fs.readFileSync(RATE_FILE, 'utf8'));
    return (Date.now() - last.timestamp) < RATE_WINDOW_MS;
  } catch {
    return false;
  }
}

function recordRate() {
  try {
    fs.writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
  } catch {}
}

function detectIntent(prompt) {
  const lower = prompt.toLowerCase();

  // Quick intent detection
  const intents = [];

  if (/calculat|force|cutting|physics|kienzle|taylor|thermal|deflect/.test(lower)) {
    intents.push({ type: 'physics', confidence: 0.9 });
  }
  if (/toolpath|gcode|program|cam|machining|mill|turn/.test(lower)) {
    intents.push({ type: 'cam', confidence: 0.9 });
  }
  if (/safety|collision|validate|check|S\(x\)/.test(lower)) {
    intents.push({ type: 'safety', confidence: 0.85 });
  }
  if (/build|test|quality|audit|coverage/.test(lower)) {
    intents.push({ type: 'dev', confidence: 0.8 });
  }
  if (/reason|think|plan|analyz|ai|deep/.test(lower)) {
    intents.push({ type: 'ai', confidence: 0.75 });
  }
  if (/memory|persist|recall|store|remember/.test(lower)) {
    intents.push({ type: 'memory', confidence: 0.8 });
  }
  if (/wedm|wire.*edm|spark|erosion/.test(lower)) {
    intents.push({ type: 'wedm', confidence: 0.95 });
  }

  return intents.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
}

function getRouteRecommendation(intents, cache) {
  if (!intents.length) return null;

  const routeMap = {
    physics: { dispatcher: 'prism_calc', actions: ['cutting_force_kienzle', 'thermal_analyze', 'deflection_calculate'] },
    cam: { dispatcher: 'prism_cam', actions: ['toolpath_generate', 'feeds_speeds_optimize', 'program_validate'] },
    safety: { dispatcher: 'prism_safety', actions: ['validate_physics', 'collision_check', 'sx_score'] },
    dev: { dispatcher: 'prism_dev', actions: ['build', 'test_run', 'quality_dashboard'] },
    ai: { dispatcher: 'prism_ai', actions: ['reason_deep', 'plan_generate', 'analyze_complex'] },
    memory: { dispatcher: 'prism_memory', actions: ['store', 'recall', 'search'] },
    wedm: { dispatcher: 'prism_cam', actions: ['wedm_parameters', 'wedm_toolpath', 'wedm_validate'] },
  };

  const primary = intents[0];
  const route = routeMap[primary.type];

  if (!route) return null;

  return {
    dispatcher: route.dispatcher,
    suggestedActions: route.actions,
    confidence: primary.confidence,
    intent: primary.type,
  };
}

async function queryOllamaForRoute(prompt, intents) {
  if (!intents.length) return null;

  const ollamaPrompt = `You are a PRISM MCP router. Given this task, return the SINGLE best dispatcher:action.

Task: "${prompt.slice(0, 200)}"

Dispatchers:
- prism_calc: physics calculations (force, thermal, deflection, surface)
- prism_cam: toolpath/CAM (gcode, feeds, speeds, programs)
- prism_safety: validation (collision, limits, S(x) scoring)
- prism_dev: development (build, test, quality, audit)
- prism_ai: reasoning (deep analysis, planning)

Return format: dispatcher:action_name (nothing else)`;

  try {
    const body = JSON.stringify({
      model: 'qwen2.5-coder:32b',
      prompt: ollamaPrompt,
      stream: false,
      options: { num_predict: 30 }
    });
    const result = execSync(
      `curl -s -X POST http://127.0.0.1:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { windowsHide: true, encoding: 'utf-8', timeout: 3000 }
    );
    const parsed = JSON.parse(result);
    if (parsed.response) {
      const match = parsed.response.trim().match(/^(\w+):(\w+)/);
      if (match) {
        return { dispatcher: match[1], action: match[2], fromOllama: true };
      }
    }
  } catch {
    // Ollama unavailable - use fallback
  }

  return null;
}

async function main() {
  const input = readStdinSafe();
  if (!input) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload.prompt || payload.message || '';

  // Skip short prompts or commands
  if (!prompt || prompt.length < 30 || prompt.startsWith('/')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limit
  if (checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const intents = detectIntent(prompt);
  if (!intents.length) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordRate();

  // Try Ollama first, fallback to local matching
  let route = await queryOllamaForRoute(prompt, intents);

  if (!route) {
    const cache = loadCache();
    const fallback = getRouteRecommendation(intents, cache);
    if (fallback) {
      route = {
        dispatcher: fallback.dispatcher,
        action: fallback.suggestedActions[0],
        alternatives: fallback.suggestedActions.slice(1),
        confidence: fallback.confidence,
      };
    }
  }

  // INTEL-OLLAMA-OBSIDIAN-MS0/P3-U04: also query Qdrant semantic top-K
  // over the embedded action corpus, merge with the legacy intent path.
  const semHits = await semanticSearchActions(prompt, SEMANTIC_TOP_K);
  const goodHits = semHits.filter((h) => typeof h.score === 'number' && h.score >= SEMANTIC_MIN_SCORE);

  if (!route && goodHits.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const sections = [];
  if (route) {
    sections.push(`**Route:** \`${route.dispatcher}:${route.action}\`${route.alternatives ? ` (alt: ${route.alternatives.join(', ')})` : ''}`);
  }
  if (goodHits.length > 0) {
    const lines = ['**🔎 Semantic action matches (Qdrant):**'];
    for (const h of goodHits.slice(0, SEMANTIC_TOP_K)) {
      const dispatcher = (typeof h.metadata?.dispatcher === 'string' && h.metadata.dispatcher) || 'unknown';
      const action = (typeof h.metadata?.action === 'string' && h.metadata.action) || (typeof h.id === 'string' ? h.id.replace(/^action\//, '') : '?');
      const score = typeof h.score === 'number' ? ` (${h.score.toFixed(2)})` : '';
      lines.push(`  - \`${dispatcher}:${action}\`${score}`);
    }
    sections.push(lines.join('\n'));
  }
  const context = sections.join('\n');

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context,
    }
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
