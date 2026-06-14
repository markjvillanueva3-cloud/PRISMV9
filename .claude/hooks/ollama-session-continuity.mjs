#!/usr/bin/env node
// tier: T4
/**
 * ollama-session-continuity.mjs — PreCompact hook
 *
 * Event: PreCompact
 *
 * Layer 4 of Ollama Architecture:
 * Instead of Claude generating verbose handoff summaries:
 * 1. Collect session state (files changed, tasks done, current position)
 * 2. Query Ollama to generate compact RESUME directive
 * 3. Inject into handoff (~100 tokens vs ~500+ for Claude-generated)
 *
 * Token Savings: 80% of handoff generation overhead
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const HANDOFF_DIR = 'H:/prism/state/shared/handoffs';
const POSITION_FILE = 'H:/prism/state/CURRENT_POSITION.md';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function getSessionId(payload) {
  return payload?.session_id ||
         process.env.CLAUDE_SESSION_ID ||
         `session-${Date.now().toString(36)}`;
}

function getRecentGitActivity() {
  try {
    const log = execSync('cd H:/prism && git log --oneline -5 --format="%s"', {
      encoding: 'utf-8',
      timeout: 3000
    });
    return log.trim().split('\n').slice(0, 3);
  } catch {
    return [];
  }
}

function getModifiedFiles() {
  try {
    const status = execSync('cd H:/prism && git diff --name-only HEAD~3 2>/dev/null || git diff --name-only', {
      encoding: 'utf-8',
      timeout: 3000
    });
    return status.trim().split('\n').filter(f => f).slice(0, 10);
  } catch {
    return [];
  }
}

function getCurrentPosition() {
  try {
    const content = fs.readFileSync(POSITION_FILE, 'utf8');
    const match = content.match(/## Current Position\s*\n([^\n]+)/);
    return match ? match[1].trim() : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

async function queryOllamaForResume(context) {
  const prompt = `You are a session handoff generator. Given this context, generate a ONE-LINE resume directive (max 100 chars) for the next session.

Context:
- Position: ${context.position}
- Recent commits: ${context.commits.join('; ')}
- Modified files: ${context.files.slice(0, 5).join(', ')}

Output format: "Continue [milestone]: [specific next action]"
Example: "Continue INGEST-MS6 U-SHOP01: wire ShopDataEngine to devDispatcher"

Resume directive:`;

  try {
    const body = JSON.stringify({
      model: 'qwen2.5-coder:32b',
      prompt,
      stream: false,
      options: { num_predict: 50 }
    });
    const result = execSync(
      `curl -s -X POST http://localhost:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const parsed = JSON.parse(result);
    if (parsed.response) {
      return parsed.response.trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // Ollama unavailable - generate fallback
  }

  // Fallback: derive from position and commits
  const lastCommit = context.commits[0] || '';
  const milestone = lastCommit.match(/^([A-Z]+-[A-Z0-9]+)/)?.[1] || 'Current work';
  return `Continue ${milestone}: review changes and proceed with next unit`;
}

const OLLAMA_RESUME_FILE = 'H:/prism/.claude/cache/ollama-resume-pending.json';

function writeOllamaResume(resume, context) {
  try {
    fs.mkdirSync(path.dirname(OLLAMA_RESUME_FILE), { recursive: true });
    fs.writeFileSync(OLLAMA_RESUME_FILE, JSON.stringify({
      resume,
      context,
      timestamp: Date.now(),
      source: 'ollama-session-continuity'
    }));
  } catch {}
}

async function main() {
  const input = readStdinSafe();
  let payload = {};
  try {
    if (input) payload = JSON.parse(input);
  } catch {}

  const sessionId = getSessionId(payload);
  const commits = getRecentGitActivity();
  const files = getModifiedFiles();
  const position = getCurrentPosition();

  // Generate Ollama-powered resume directive
  const resume = await queryOllamaForResume({ position, commits, files });

  // Build compact session summary
  const summary = [
    `Position: ${position}`,
    `Modified: ${files.length} files`,
    `Commits: ${commits.length} recent`,
  ].join(' | ');

  // CRITICAL: Write to temp file so precompact-handoff.mjs can read it
  // This bridges the gap between the two PreCompact hooks
  writeOllamaResume(resume, { position, commits: commits.slice(0, 3), files: files.slice(0, 5), summary });

  // PreCompact hooks cannot use hookSpecificOutput (schema rejects PreCompact event).
  // Use top-level systemMessage instead — it surfaces in /compact UI without schema error.
  console.log(JSON.stringify({
    continue: true,
    systemMessage: `Ollama RESUME: ${resume} | ${summary}`,
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
