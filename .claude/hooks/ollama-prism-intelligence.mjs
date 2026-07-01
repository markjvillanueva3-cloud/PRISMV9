#!/usr/bin/env node
// tier: T4
/**
 * ollama-prism-intelligence.mjs — UserPromptSubmit hook
 *
 * HYBRID INTELLIGENCE LAYER
 * Combines Ollama (free/fast) + PRISM AI engines (specialized) to augment Claude.
 *
 * Flow:
 * 1. Ollama classifies task complexity and domain
 * 2. PRISM AI engines provide specialized analysis:
 *    - CreativeReasoningEngine for cross-domain synthesis
 *    - DeepLearningEngine for pattern recognition
 *    - NeuralArchitectureEngine for system design
 *    - ReasoningChainEngine for complex logic
 * 3. Results injected as context for Claude
 *
 * Token savings: Ollama does classification/triage (free)
 * Quality boost: PRISM engines add specialized domain knowledge
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CACHE_DIR = 'H:/prism/.claude/cache';
const RATE_FILE = `${CACHE_DIR}/prism-intel-last.json`;
const RATE_WINDOW_MS = 45 * 1000; // 45 seconds — complex analysis
const AWARENESS_CACHE = `${CACHE_DIR}/prism-awareness.json`;

// PRISM AI Engine catalog (from ENGINE_DIGEST.md)
const AI_ENGINES = {
  reasoning: {
    name: 'PRISMCreativeReasoningEngine',
    triggers: /\b(complex|analyze|design|architect|optimize|trade-?off|decision|compare|evaluate)\b/i,
    description: 'Cross-domain synthesis, creative problem solving'
  },
  deepLearning: {
    name: 'CrossDisciplinaryDeepLearningEngine',
    triggers: /\b(pattern|learn|neural|ml|ai|predict|classify|cluster|model)\b/i,
    description: 'Pattern recognition, ML concepts, neural architectures'
  },
  chain: {
    name: 'ReasoningChainEngine',
    triggers: /\b(step by step|chain|sequence|logic|proof|derive|because|therefore)\b/i,
    description: 'Multi-step logical reasoning chains'
  },
  selfAwareness: {
    name: 'PRISMSelfAwarenessEngine',
    triggers: /\b(what can|capabilities|features|engines|dispatchers|tools|prism)\b/i,
    description: 'System introspection, capability discovery'
  },
  physics: {
    name: 'UnifiedPhysicsEngine',
    triggers: /\b(force|thermal|deflect|stress|physics|kienzle|taylor|formula)\b/i,
    description: 'Manufacturing physics calculations'
  }
};

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
  try {
    fs.writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
  } catch {}
}

function loadAwareness() {
  try {
    return JSON.parse(fs.readFileSync(AWARENESS_CACHE, 'utf8'));
  } catch {
    return null;
  }
}

function detectComplexity(prompt) {
  const lower = prompt.toLowerCase();

  // High complexity indicators
  const highComplexity = [
    /\b(architect|design system|build.*engine|create.*framework|optimize.*across)\b/i,
    /\b(trade-?off|compare.*approaches|evaluate.*options|best way to)\b/i,
    /\b(debug.*complex|investigate|root cause|why does)\b/i,
    /\b(refactor|migrate|integrate|scale)\b/i
  ];

  for (const pattern of highComplexity) {
    if (pattern.test(prompt)) return 'high';
  }

  // Medium complexity
  if (prompt.length > 200 || /\b(how to|implement|add|fix)\b/i.test(prompt)) {
    return 'medium';
  }

  return 'low';
}

function detectRelevantEngines(prompt) {
  const engines = [];

  for (const [key, engine] of Object.entries(AI_ENGINES)) {
    if (engine.triggers.test(prompt)) {
      engines.push({ key, ...engine });
    }
  }

  return engines;
}

async function queryOllamaAnalysis(prompt, engines) {
  const engineList = engines.map(e => `- ${e.name}: ${e.description}`).join('\n');

  const ollamaPrompt = `You are a PRISM AI routing assistant. Given this task and available AI engines, provide:
1. COMPLEXITY: low/medium/high
2. PRIMARY_ENGINE: best engine name for this task
3. APPROACH: 1-sentence recommendation

Task: "${prompt.slice(0, 400)}"

Available PRISM AI Engines:
${engineList}

Output format (exactly):
COMPLEXITY: [level]
PRIMARY_ENGINE: [name]
APPROACH: [recommendation]`;

  try {
    const body = JSON.stringify({
      model: 'qwen2.5-coder:32b',
      prompt: ollamaPrompt,
      stream: false,
      options: { num_predict: 100 }
    });

    const result = execSync(
      `curl -s --max-time 5 -X POST http://127.0.0.1:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { windowsHide: true, encoding: 'utf-8', timeout: 6000 }
    );

    return JSON.parse(result).response?.trim();
  } catch {
    return null;
  }
}

function parseOllamaResponse(response) {
  if (!response) return null;

  const result = {};
  const lines = response.split('\n');

  for (const line of lines) {
    const match = line.match(/^(COMPLEXITY|PRIMARY_ENGINE|APPROACH):\s*(.+)/i);
    if (match) {
      result[match[1].toLowerCase()] = match[2].trim();
    }
  }

  return Object.keys(result).length >= 2 ? result : null;
}

function generateIntelligenceContext(analysis, engines, awareness) {
  const lines = ['**🧠 PRISM Intelligence Layer** (Ollama + AI Engines):'];

  if (analysis) {
    lines.push(`• Complexity: ${analysis.complexity || 'unknown'}`);
    if (analysis.primary_engine) {
      lines.push(`• Recommended Engine: \`${analysis.primary_engine}\``);
    }
    if (analysis.approach) {
      lines.push(`• Approach: ${analysis.approach}`);
    }
  }

  if (engines.length > 0) {
    lines.push(`• Relevant AI Engines: ${engines.map(e => e.name).join(', ')}`);
  }

  // Add awareness context if available
  if (awareness?.compact_awareness) {
    lines.push(`• System Context: ${awareness.compact_awareness.slice(0, 150)}...`);
  }

  // Add MCP action hints
  if (analysis?.primary_engine) {
    const hints = {
      'PRISMCreativeReasoningEngine': 'prism_ai:creative_reasoning',
      'CrossDisciplinaryDeepLearningEngine': 'prism_ai:deep_learning_pattern',
      'ReasoningChainEngine': 'prism_ai:reasoning_chain',
      'PRISMSelfAwarenessEngine': 'prism_session:self_awareness_query',
      'UnifiedPhysicsEngine': 'prism_calc:unified_physics'
    };
    const action = hints[analysis.primary_engine];
    if (action) {
      lines.push(`• MCP Action: \`${action}\``);
    }
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

  // Skip short prompts, commands
  if (!prompt || prompt.length < 40 || prompt.startsWith('/')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Only trigger for complex tasks
  const complexity = detectComplexity(prompt);
  if (complexity === 'low') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limit
  if (checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const engines = detectRelevantEngines(prompt);
  if (engines.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordRate();

  const awareness = loadAwareness();
  const ollamaResponse = await queryOllamaAnalysis(prompt, engines);
  const analysis = parseOllamaResponse(ollamaResponse);

  const context = generateIntelligenceContext(analysis, engines, awareness);

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context
    }
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
