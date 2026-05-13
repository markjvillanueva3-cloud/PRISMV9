#!/usr/bin/env node
// tier: T4
/**
 * ollama-unified-semantic-router.mjs — UserPromptSubmit hook
 *
 * UNIFIED OLLAMA ROUTING LAYER
 *
 * Instead of 48 separate hooks each doing pattern matching:
 * 1. Collect ALL semantic signals in one pass
 * 2. Make ONE Ollama call with full context
 * 3. Return structured recommendations for all domains
 *
 * Replaces: *-inject.mjs, *-suggest.mjs, *-recommend.mjs, *-awareness.mjs
 * Token savings: 48 hooks × ~100 tokens = 4800 → ~200 tokens (96% reduction)
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const CACHE_PATH = 'H:/prism/.claude/cache/prism-awareness.json';
const RATE_FILE = 'H:/prism/.claude/cache/unified-semantic-last.json';
const RATE_WINDOW_MS = 30 * 1000; // 30 seconds between full semantic analysis
const MAX_PROMPT_LENGTH = 500;
// Per-prompt relevance cache — companion hooks read this to gate themselves
// (see helpers/relevance-cache.mjs). Always written when signals detected,
// regardless of Ollama rate limit. Cheap regex-only — no LLM call.
const RELEVANCE_CACHE = 'H:/prism/.claude/cache/unified-semantic-relevance.json';
const RELEVANCE_TTL_MS = 60 * 1000; // companion hooks treat older cache as stale → default to inject

// Domains this router handles (replacing individual hooks)
const SEMANTIC_DOMAINS = [
  'ai_features',      // ai-feature-recommend.mjs
  'formulas',         // formula-algorithm-suggest.mjs
  'discipline',       // discipline-expert-inject.mjs
  'tribal_knowledge', // tribal-knowledge-inject.mjs
  'error_patterns',   // error-pattern-memory.mjs
  'mcp_route',        // route recommendation
  'edit_strategy',    // edit-multiedit-suggest.mjs concepts
  'safety_concerns',  // safety-related suggestions
];

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
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
    const dir = 'H:/prism/.claude/cache';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
  } catch {}
}

// Write per-prompt relevance cache so companion always-on hooks
// (discipline-expert-inject, prompt-rules-inject, reference-inject, etc.)
// can decide whether their domain is signaled and skip injection when not.
// Cache shape:
//   {
//     ts: <ms>,
//     promptHash: <8-char sha-ish>,
//     promptPreview: <first 80 chars>,
//     signals: ["formulas","safety_concerns",...],
//     domains: { formulas: true, mcp_route: false, ... },  // all 8 domains
//     ollamaCalled: bool,
//     recommendations: { ... } | null
//   }
function writeRelevanceCache(prompt, signals, recommendations, ollamaCalled) {
  try {
    const dir = 'H:/prism/.claude/cache';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const signalDomains = new Set(signals.map((s) => s.domain));
    const allDomains = [...SEMANTIC_DOMAINS, 'mcp_route'];
    const domains = {};
    for (const d of allDomains) domains[d] = signalDomains.has(d);
    // Cheap deterministic hash so companion hooks can detect "same prompt"
    let hash = 0;
    for (let i = 0; i < prompt.length; i += 1) {
      hash = ((hash << 5) - hash + prompt.charCodeAt(i)) | 0;
    }
    const cache = {
      ts: Date.now(),
      promptHash: (hash >>> 0).toString(16).padStart(8, '0'),
      promptPreview: prompt.slice(0, 80),
      signals: [...signalDomains],
      domains,
      ollamaCalled: !!ollamaCalled,
      recommendations: recommendations || null,
    };
    // ATOMIC WRITE: tmp + rename. With 6 concurrent chats writing this cache,
    // a partial-write race produces malformed JSON that companion hooks then
    // fail to parse → fall through to inject (defeats the gate). Rename is
    // atomic on Windows NTFS; tmp suffix includes pid+rand to avoid collision.
    const tmp = `${RELEVANCE_CACHE}.tmp.${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
    fs.renameSync(tmp, RELEVANCE_CACHE);
  } catch {
    // Cache write failures are non-fatal — companion hooks default to inject on cache miss
  }
}

function loadAwareness() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return { compact_awareness: 'PRISM manufacturing intelligence platform' };
  }
}

function detectSignals(prompt) {
  const lower = prompt.toLowerCase();
  const signals = [];

  // Physics/calculation signals
  if (/force|cutting|kienzle|taylor|thermal|deflect|chatter|vibrat/i.test(lower)) {
    signals.push({ domain: 'formulas', keywords: lower.match(/force|cutting|kienzle|taylor|thermal|deflect|chatter|vibrat/gi) });
  }

  // CAM/toolpath signals
  if (/toolpath|gcode|program|cam|feed|speed|roughing|finishing/i.test(lower)) {
    signals.push({ domain: 'mcp_route', hint: 'prism_cam' });
  }

  // AI/reasoning signals
  if (/reason|think|plan|analyze|deep|complex|ai/i.test(lower)) {
    signals.push({ domain: 'ai_features', hint: 'reasoning_engines' });
  }

  // Safety signals
  if (/safety|collision|limit|validate|S\(x\)|danger|risk/i.test(lower)) {
    signals.push({ domain: 'safety_concerns', priority: 'high' });
  }

  // Build/create signals
  if (/build|create|new|engine|hook|skill|add/i.test(lower)) {
    signals.push({ domain: 'discipline', hint: 'development' });
  }

  // Error/debug signals
  if (/error|fail|bug|fix|debug|broken|issue/i.test(lower)) {
    signals.push({ domain: 'error_patterns', hint: 'debugging' });
  }

  // Manufacturing/shop signals
  if (/material|steel|aluminum|titanium|hardness|tool\s*wear|chip/i.test(lower)) {
    signals.push({ domain: 'tribal_knowledge', hint: 'machining' });
  }

  // Edit/code signals
  if (/edit|change|modify|refactor|update|fix.*code/i.test(lower)) {
    signals.push({ domain: 'edit_strategy', hint: 'code_modification' });
  }

  return signals;
}

async function queryOllamaUnified(prompt, signals, awareness) {
  if (!signals.length) return null;

  const domainList = signals.map(s => s.domain).join(', ');
  const contextHint = awareness.compact_awareness || '';

  const ollamaPrompt = `You are a PRISM manufacturing AI assistant router. Given this task and detected domains, provide ONE compact recommendation line per relevant domain.

Context: ${contextHint}

Task: "${prompt.slice(0, MAX_PROMPT_LENGTH)}"

Detected domains: ${domainList}

For each domain, output format: DOMAIN: recommendation (max 15 words)
Only output domains that are relevant. Skip irrelevant ones.

Example output:
mcp_route: prism_calc:cutting_force_kienzle
formulas: Use Kienzle model with kc1.1=1800 for P-group steel
tribal_knowledge: Check chip color - blue indicates too much heat

Your recommendations:`;

  try {
    const body = JSON.stringify({
      model: 'qwen2.5-coder:7b',
      prompt: ollamaPrompt,
      stream: false,
      options: { num_predict: 200 }
    });

    const result = execSync(
      `curl -s -X POST http://localhost:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { encoding: 'utf-8', timeout: 5000 }
    );

    const parsed = JSON.parse(result);
    if (parsed.response) {
      return parseOllamaResponse(parsed.response);
    }
  } catch {
    // Ollama unavailable - return signal-based fallback
  }

  return generateFallback(signals);
}

function parseOllamaResponse(response) {
  const recommendations = {};
  const lines = response.trim().split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)/);
    if (match) {
      const domain = match[1].toLowerCase();
      if (SEMANTIC_DOMAINS.includes(domain) || domain === 'mcp_route') {
        recommendations[domain] = match[2].trim();
      }
    }
  }

  return Object.keys(recommendations).length > 0 ? recommendations : null;
}

function generateFallback(signals) {
  const recommendations = {};

  for (const signal of signals) {
    switch (signal.domain) {
      case 'formulas':
        recommendations.formulas = `Check physics constants for ${signal.keywords?.[0] || 'calculation'}`;
        break;
      case 'mcp_route':
        recommendations.mcp_route = signal.hint || 'prism_calc';
        break;
      case 'ai_features':
        recommendations.ai_features = 'Consider prismCreativeReasoningEngine for complex analysis';
        break;
      case 'safety_concerns':
        recommendations.safety_concerns = 'Run prism_safety:validate_physics before proceeding';
        break;
      case 'discipline':
        recommendations.discipline = 'Check /dedup before creating, use /forge-triple for engines';
        break;
      case 'error_patterns':
        recommendations.error_patterns = 'Check error-pattern-memory for similar issues';
        break;
      case 'tribal_knowledge':
        recommendations.tribal_knowledge = 'Search tribal tips via prismSelfAwarenessEngine';
        break;
    }
  }

  return recommendations;
}

function formatOutput(recommendations) {
  if (!recommendations || Object.keys(recommendations).length === 0) {
    return null;
  }

  const lines = ['**Semantic Router:**'];

  for (const [domain, rec] of Object.entries(recommendations)) {
    const icon = {
      mcp_route: '🎯',
      formulas: '📐',
      ai_features: '🤖',
      safety_concerns: '⚠️',
      discipline: '📋',
      error_patterns: '🔧',
      tribal_knowledge: '💡',
      edit_strategy: '✏️',
    }[domain] || '•';

    lines.push(`${icon} ${rec}`);
  }

  return lines.join('\n');
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
  if (!prompt || prompt.length < 20 || prompt.startsWith('/')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limit to avoid overwhelming Ollama with 6-8 concurrent chats
  if (checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const signals = detectSignals(prompt);
  if (!signals.length) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordRate();

  const awareness = loadAwareness();
  const recommendations = await queryOllamaUnified(prompt, signals, awareness);
  const output = formatOutput(recommendations);

  if (!output) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: output,
    }
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
