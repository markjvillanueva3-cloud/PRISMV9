#!/usr/bin/env node
// tier: T4
/**
 * ollama-skill-suggester.mjs — UserPromptSubmit hook
 *
 * Detects when user is doing repetitive tasks that could be automated.
 * Uses Ollama to analyze patterns and suggest creating skills/scripts/hooks.
 *
 * Tracks:
 * - Repeated similar prompts
 * - Common tool call sequences
 * - Tasks that match existing unused skills
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const CACHE_DIR = 'H:/prism/.claude/cache';
const PATTERN_FILE = `${CACHE_DIR}/prompt-patterns.json`;
const RATE_FILE = `${CACHE_DIR}/skill-suggester-last.json`;
const RATE_WINDOW_MS = 60 * 1000; // 1 minute between suggestions
const SIMILARITY_THRESHOLD = 0.6;

// INTEL-OLLAMA-OBSIDIAN-MS0/P3-U01: semantic top-5 over Qdrant `skill`
// collection (populated by scripts/embed-all-skills.mjs).
const MCP_TIMEOUT_MS = 3_000;
const SEMANTIC_TOP_K = 5;
const SEMANTIC_MIN_SCORE = 0.5;
function mcpUrl() { return process.env.MCP_HTTP_URL ?? 'http://127.0.0.1:3100/mcp'; }

async function semanticSearchSkills(query, limit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MCP_TIMEOUT_MS);
  try {
    const res = await fetch(mcpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'prism_memory', arguments: { action: 'semantic_search', params: { query, kind: 'skill', limit } } },
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

// Common task patterns that should have skills
const AUTOMATABLE_PATTERNS = [
  { pattern: /build.*then.*test/i, skill: '/forge-ci', desc: 'Build + test pipeline' },
  { pattern: /check.*errors?.*fix/i, skill: '/forge-fix', desc: 'Auto-fix errors' },
  { pattern: /create.*engine.*wire/i, skill: '/forge-triple', desc: 'Engine + skill + hook' },
  { pattern: /search.*find.*replace/i, skill: '/refactor', desc: 'Search and replace' },
  { pattern: /git.*commit.*push/i, skill: '/ship', desc: 'Commit and push' },
  { pattern: /read.*analyze.*summarize/i, skill: '/digest', desc: 'Analyze and summarize' },
  { pattern: /debug.*trace.*fix/i, skill: '/forge-debug', desc: 'Debug workflow' },
  { pattern: /test.*fail.*fix/i, skill: '/test-fix', desc: 'Fix failing tests' },
  { pattern: /review.*check.*improve/i, skill: '/scrutinize', desc: 'Code review' },
  { pattern: /document.*jsdoc.*tsdoc/i, skill: '/ollama-docstring', desc: 'Generate docs' }
];

// Skills that exist but are rarely used
const UNDERUSED_SKILLS = [
  { name: '/forge-audit', triggers: ['quality', 'scan', 'check codebase'] },
  { name: '/forge-perf', triggers: ['slow', 'performance', 'optimize'] },
  { name: '/forge-safety', triggers: ['safety', 'validate', 'S(x)'] },
  { name: '/algorithm-inspect', triggers: ['algorithm', 'complexity', 'O(n)'] },
  { name: '/formula-browse', triggers: ['formula', 'equation', 'calculate'] },
  { name: '/trace', triggers: ['trace', 'debug', 'follow'] },
  { name: '/dedup', triggers: ['duplicate', 'exists', 'already have'] },
  { name: '/navigate', triggers: ['find file', 'where is', 'locate'] }
];

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch { return ''; }
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function checkRateLimit() {
  try {
    const last = JSON.parse(fs.readFileSync(RATE_FILE, 'utf8'));
    return (Date.now() - last.timestamp) < RATE_WINDOW_MS;
  } catch { return false; }
}

function recordRate() {
  ensureCacheDir();
  fs.writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
}

function loadPatterns() {
  try {
    return JSON.parse(fs.readFileSync(PATTERN_FILE, 'utf8'));
  } catch {
    return { prompts: [], sequences: [] };
  }
}

function savePatterns(patterns) {
  ensureCacheDir();
  // Keep last 50 prompts
  patterns.prompts = patterns.prompts.slice(-50);
  fs.writeFileSync(PATTERN_FILE, JSON.stringify(patterns, null, 2));
}

function findMatchingSkill(prompt) {
  const lower = prompt.toLowerCase();

  // Check automatable patterns
  for (const { pattern, skill, desc } of AUTOMATABLE_PATTERNS) {
    if (pattern.test(prompt)) {
      return { skill, desc, type: 'automatable' };
    }
  }

  // Check underused skills
  for (const { name, triggers } of UNDERUSED_SKILLS) {
    for (const trigger of triggers) {
      if (lower.includes(trigger.toLowerCase())) {
        return { skill: name, desc: `Matches: "${trigger}"`, type: 'underused' };
      }
    }
  }

  return null;
}

function detectRepetition(prompt, patterns) {
  // Simple word-based similarity
  const words = new Set(prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  for (const prev of patterns.prompts.slice(-10)) {
    const prevWords = new Set(prev.text.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const intersection = [...words].filter(w => prevWords.has(w));
    const similarity = intersection.length / Math.max(words.size, prevWords.size);

    if (similarity > SIMILARITY_THRESHOLD) {
      return { similar: true, count: prev.count || 1 };
    }
  }

  return { similar: false };
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

  // Skip short prompts, commands
  if (!prompt || prompt.length < 30 || prompt.startsWith('/')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Load and update patterns
  const patterns = loadPatterns();

  // Check for matching skill
  const match = findMatchingSkill(prompt);

  // Check for repetition
  const repetition = detectRepetition(prompt, patterns);

  // Update patterns
  const existing = patterns.prompts.find(p =>
    p.text.toLowerCase().includes(prompt.toLowerCase().slice(0, 50))
  );
  if (existing) {
    existing.count = (existing.count || 1) + 1;
    existing.lastSeen = new Date().toISOString();
  } else {
    patterns.prompts.push({
      text: prompt.slice(0, 200),
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    });
  }
  savePatterns(patterns);

  // Rate limit suggestions
  if (checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Generate suggestion
  const lines = [];

  if (match) {
    recordRate();
    lines.push(`**💡 Skill Available:** \`${match.skill}\` — ${match.desc}`);
    if (match.type === 'underused') {
      lines.push(`_This skill exists but is rarely used. Try it!_`);
    }
  }

  if (repetition.similar && repetition.count >= 2) {
    recordRate();
    lines.push(`**🔄 Repetitive Task Detected** (${repetition.count}x similar)`);
    lines.push(`_Consider creating a skill to automate this workflow._`);
  }

  // INTEL-OLLAMA-OBSIDIAN-MS0/P3-U01: semantic top-5 over Qdrant.
  // Replaces the legacy ~10-pattern hardcoded match for the broader
  // 503-skill catalog. Keep the pattern-based path above for hot
  // signals; vector search complements it for novel phrasings.
  const semHits = await semanticSearchSkills(prompt, SEMANTIC_TOP_K);
  const goodHits = semHits.filter((h) => typeof h.score === 'number' && h.score >= SEMANTIC_MIN_SCORE);
  if (goodHits.length > 0) {
    recordRate();
    lines.push('**🔎 Top semantic skill matches (Qdrant):**');
    for (const h of goodHits.slice(0, SEMANTIC_TOP_K)) {
      const name = (typeof h.metadata?.name === 'string' && h.metadata.name)
        || (typeof h.text === 'string' ? h.text.split(/\r?\n/)[0].trim() : `/${h.id}`);
      const score = typeof h.score === 'number' ? ` (${h.score.toFixed(2)})` : '';
      const snippet = typeof h.text === 'string' ? h.text.split(/\r?\n/).slice(1).join(' ').trim().slice(0, 90) : '';
      lines.push(`  - \`${name}\`${score}${snippet ? ` — ${snippet}` : ''}`);
    }
  }

  if (lines.length > 0) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: lines.join('\n')
      }
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
