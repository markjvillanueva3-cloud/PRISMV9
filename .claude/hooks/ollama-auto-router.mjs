#!/usr/bin/env node
// tier: T4
/**
 * ollama-auto-router.mjs — UserPromptSubmit hook
 *
 * AUTOMATIC Ollama routing — no manual /commands needed.
 * Detects task type from prompt and routes appropriate work to Ollama,
 * injecting results as context so Claude doesn't duplicate effort.
 *
 * Routes:
 * - Summarization requests → Ollama summarize
 * - Explanation requests → Ollama explain
 * - Error messages → Ollama triage
 * - Boilerplate requests → Ollama scaffold
 * - Classification needs → Ollama classify
 * - Documentation requests → Ollama docstring
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const CACHE_DIR = 'H:/prism/.claude/cache';
const RATE_FILE = `${CACHE_DIR}/ollama-auto-last.json`;
const RATE_WINDOW_MS = 20 * 1000; // 20 seconds between auto-routes
const OLLAMA_TIMEOUT = 8000; // 8 second timeout

// Task detection patterns
const PATTERNS = {
  summarize: {
    regex: /\b(summarize|summary|tldr|overview|gist of|brief|condense)\b/i,
    prompt: (text) => `Summarize this in 3-5 bullet points (max 100 words):\n\n${text}`,
    maxPredict: 200,
    label: 'Summary'
  },
  explain: {
    regex: /\b(explain|what does|how does|what is|describe|clarify|break down)\b.*\b(code|function|class|method|engine|this)\b/i,
    prompt: (text) => `Explain this code briefly (what it does, key logic):\n\n${text}`,
    maxPredict: 300,
    label: 'Explanation'
  },
  errorTriage: {
    regex: /\b(error|exception|failed|TypeError|ReferenceError|SyntaxError|cannot read|undefined is not|TS\d{4})\b/i,
    prompt: (text) => `Analyze this error. Provide: 1) Category, 2) Likely cause (1 sentence), 3) Fix suggestion (1 sentence):\n\n${text}`,
    maxPredict: 150,
    label: 'Error Triage'
  },
  boilerplate: {
    regex: /\b(create|generate|scaffold|stub|template|boilerplate)\b.*\b(engine|test|hook|skill|schema)\b/i,
    prompt: (text) => `Generate a TypeScript scaffold for: ${text}. Include proper structure, types, and PRISM conventions. Output ONLY code.`,
    maxPredict: 800,
    label: 'Scaffold'
  },
  docstring: {
    regex: /\b(document|jsdoc|tsdoc|add docs|write docs)\b/i,
    prompt: (text) => `Generate JSDoc documentation for this code. Include @param, @returns, @example:\n\n${text}`,
    maxPredict: 300,
    label: 'Documentation'
  },
  classify: {
    regex: /\b(classify|categorize|what type|which dispatcher|route to|best action)\b/i,
    prompt: (text) => `Classify this task and suggest the best PRISM dispatcher action: ${text}`,
    maxPredict: 100,
    label: 'Classification'
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

function checkOllamaAvailable() {
  try {
    execSync('curl -s --max-time 1 http://127.0.0.1:11434/api/tags', { windowsHide: true, encoding: 'utf-8' });
    return true;
  } catch { return false; }
}

function detectTaskType(prompt) {
  for (const [type, config] of Object.entries(PATTERNS)) {
    if (config.regex.test(prompt)) {
      return { type, config };
    }
  }
  return null;
}

function extractRelevantContent(prompt) {
  // Extract code blocks if present
  const codeMatch = prompt.match(/```[\s\S]*?```/g);
  if (codeMatch) {
    return codeMatch.map(c => c.replace(/```\w*\n?/g, '').trim()).join('\n\n');
  }

  // Extract error messages
  const errorMatch = prompt.match(/(Error|TypeError|ReferenceError|TS\d{4})[\s\S]{0,500}/i);
  if (errorMatch) {
    return errorMatch[0];
  }

  // Return truncated prompt
  return prompt.slice(0, 1500);
}

async function queryOllama(ollamaPrompt, maxPredict) {
  try {
    const body = JSON.stringify({
      model: 'qwen2.5-coder:32b',
      prompt: ollamaPrompt,
      stream: false,
      options: { num_predict: maxPredict }
    });

    const result = execSync(
      `curl -s --max-time ${OLLAMA_TIMEOUT / 1000} -X POST http://127.0.0.1:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { windowsHide: true, encoding: 'utf-8', timeout: OLLAMA_TIMEOUT }
    );

    const parsed = JSON.parse(result);
    return parsed.response?.trim();
  } catch {
    return null;
  }
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

  // Skip trivial prompts. The length<25 floor catches bare built-in commands
  // (/help, /clear, /compact) without dead-coding the router for the long slash
  // prompts (/checkin /loop ..., /forge ..., /rgs ...) that carry actionable
  // text. See CLAUDE.md Recent regressions 2026-05-16 F2 R1.
  if (!prompt || prompt.length < 25) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limit check
  if (checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Detect task type
  const detection = detectTaskType(prompt);
  if (!detection) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Check Ollama availability
  if (!checkOllamaAvailable()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordRate();

  const { type, config } = detection;
  const content = extractRelevantContent(prompt);
  const ollamaPrompt = config.prompt(content);

  const result = await queryOllama(ollamaPrompt, config.maxPredict);

  if (!result) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Inject Ollama result as context
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `**🦙 Ollama ${config.label}** (0 Claude tokens):\n${result}\n\n_Use this as a starting point. Refine if needed._`
    }
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
