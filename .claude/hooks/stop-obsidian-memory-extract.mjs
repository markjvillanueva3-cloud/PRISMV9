#!/usr/bin/env node
// tier: T4
/**
 * stop-obsidian-memory-extract.mjs — Stop Hook
 * =============================================
 *
 * Extracts session learnings and writes to Obsidian vault.
 * Uses Ollama (FREE) to analyze the session and extract:
 * - Patterns that worked
 * - Mistakes to avoid
 * - Decisions made
 * - Context for next session
 *
 * This completes the memory loop:
 *   work → Stop (extract) → vault stores → SessionStart (RAG retrieves)
 *
 * @hook Stop
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, openSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";

/**
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U01: kick off obsidian-memory-sync.mjs as a
 * detached background process. Fire-and-forget — Stop hook never blocks
 * even if sync hangs. Output appended to a per-day log for debugging.
 */
function spawnObsidianMemorySync() {
  try {
    const script = "H:/prism/scripts/obsidian-memory-sync.mjs";
    if (!existsSync(script)) return { ok: false, reason: "script-missing" };
    const logFile = "H:/prism/.claude/cache/obsidian-memory-sync.log";
    ensureDir(dirname(logFile));
    const fd = openSync(logFile, "a");
    const child = spawn(process.execPath, [script, "--quiet"], {
      detached: true,
      windowsHide: true,
      stdio: ["ignore", fd, fd],
    });
    child.unref();
    return { ok: true, pid: child.pid };
  } catch (e) {
    return { ok: false, reason: (e instanceof Error ? e.message : String(e)) };
  }
}

const VAULT_ROOT = "H:/prism/knowledge";
const SESSIONS_DIR = `${VAULT_ROOT}/sessions`;
const DECISIONS_DIR = `${VAULT_ROOT}/decisions`;
const PATTERNS_DIR = `${VAULT_ROOT}/memories/patterns`;
const MISTAKES_DIR = `${VAULT_ROOT}/memories/mistakes`;

const TRANSCRIPT_DIR = `${(process.env.USERPROFILE || process.env.HOME || "").replace(/\\/g, "/")}/.claude/projects/H--prism`;
const RATE_FILE = "H:/prism/.claude/cache/obsidian-extract-last.json";
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between extractions

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function checkRateLimit() {
  try {
    const last = JSON.parse(readFileSync(RATE_FILE, "utf8"));
    return (Date.now() - last.timestamp) < MIN_INTERVAL_MS;
  } catch {
    return false;
  }
}

function recordRate() {
  ensureDir(dirname(RATE_FILE));
  writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
}

function getLatestTranscript() {
  try {
    const files = readdirSync(TRANSCRIPT_DIR)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => ({
        name: f,
        path: join(TRANSCRIPT_DIR, f),
        mtime: readFileSync(join(TRANSCRIPT_DIR, f)).length // Use size as proxy for recency
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) return null;

    // Read last 30KB of most recent transcript
    const content = readFileSync(files[0].path, "utf8");
    return content.slice(-30000);
  } catch {
    return null;
  }
}

function extractMessagesFromTranscript(transcript) {
  if (!transcript) return [];

  const messages = [];
  for (const line of transcript.split("\n")) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === "assistant" && entry.message?.content) {
        const text = Array.isArray(entry.message.content)
          ? entry.message.content.filter(c => c.type === "text").map(c => c.text).join("\n")
          : entry.message.content;
        if (text) messages.push(text.slice(0, 500));
      }
      if (entry.type === "human" && entry.message?.content) {
        messages.push(`USER: ${entry.message.content.slice(0, 200)}`);
      }
    } catch {}
  }
  return messages.slice(-20); // Last 20 messages
}

async function queryOllama(prompt) {
  try {
    const body = JSON.stringify({
      model: "qwen2.5-coder:7b",
      prompt,
      stream: false,
      options: { num_predict: 300, temperature: 0.3 }
    });

    const result = execSync(
      `curl -s -X POST http://localhost:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { encoding: "utf-8", timeout: 15000 }
    );

    return JSON.parse(result).response?.trim() || null;
  } catch {
    return null;
  }
}

async function extractLearnings(messages) {
  const context = messages.join("\n---\n").slice(0, 8000);

  const prompt = `Analyze this Claude Code session and extract learnings in JSON format.

SESSION CONTEXT:
${context}

Return ONLY valid JSON with these fields (empty array if none found):
{
  "patterns": ["pattern that worked well - be specific"],
  "mistakes": ["mistake made and how it was fixed"],
  "decisions": ["technical decision and why"],
  "context": "one sentence summary for next session"
}

JSON:`;

  const response = await queryOllama(prompt);
  if (!response) return null;

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function generateFilename(prefix) {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  return `${prefix}_${date}_${time}.md`;
}

function writeMemory(dir, filename, title, content, tags = []) {
  ensureDir(dir);
  const filePath = join(dir, filename);

  const frontmatter = `---
title: ${title}
date: ${new Date().toISOString()}
tags: [${tags.join(", ")}]
source: session-extract
---

`;

  writeFileSync(filePath, frontmatter + content);
  return filePath;
}

async function main() {
  // Rate limit: don't extract too frequently
  if (checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const transcript = getLatestTranscript();
  if (!transcript) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const messages = extractMessagesFromTranscript(transcript);
  if (messages.length < 5) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordRate();

  const learnings = await extractLearnings(messages);
  if (!learnings) {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: "Memory extract: Ollama unavailable or no learnings found"
    }));
    return;
  }

  const written = [];

  // Write patterns
  if (learnings.patterns?.length > 0) {
    const content = learnings.patterns.map(p => `- ${p}`).join("\n");
    const file = writeMemory(
      PATTERNS_DIR,
      generateFilename("pattern"),
      "Session Patterns",
      `## Patterns That Worked\n\n${content}`,
      ["pattern", "session"]
    );
    written.push("patterns");
  }

  // Write mistakes
  if (learnings.mistakes?.length > 0) {
    const content = learnings.mistakes.map(m => `- ${m}`).join("\n");
    const file = writeMemory(
      MISTAKES_DIR,
      generateFilename("mistake"),
      "Session Mistakes",
      `## Mistakes to Avoid\n\n${content}`,
      ["mistake", "lesson"]
    );
    written.push("mistakes");
  }

  // Write decisions
  if (learnings.decisions?.length > 0) {
    const content = learnings.decisions.map(d => `- ${d}`).join("\n");
    const file = writeMemory(
      DECISIONS_DIR,
      generateFilename("decision"),
      "Session Decisions",
      `## Technical Decisions\n\n${content}`,
      ["decision", "architecture"]
    );
    written.push("decisions");
  }

  // Write session summary
  if (learnings.context) {
    const summary = `## Session Summary\n\n${learnings.context}\n\n### Extracted\n- Patterns: ${learnings.patterns?.length || 0}\n- Mistakes: ${learnings.mistakes?.length || 0}\n- Decisions: ${learnings.decisions?.length || 0}`;
    writeMemory(
      SESSIONS_DIR,
      generateFilename("session"),
      "Session Summary",
      summary,
      ["session", "summary"]
    );
    written.push("session");
  }

  // P1-U01: fire obsidian-memory-sync as a detached background process so
  // memories at C:/Users/.../.claude/projects/H--prism/memory/ get mirrored
  // into the H: vault even if Ollama extraction was rate-limited or skipped.
  // Fire-and-forget; never blocks the Stop hook.
  const syncSpawn = spawnObsidianMemorySync();

  console.log(JSON.stringify({
    continue: true,
    systemMessage: written.length > 0
      ? `Memory vault updated: ${written.join(", ")}${syncSpawn.ok ? ` + sync(pid=${syncSpawn.pid})` : ""}`
      : `No significant learnings extracted${syncSpawn.ok ? ` (sync pid=${syncSpawn.pid})` : ""}`,
  }));
}

main().catch(err => {
  console.error("[obsidian-extract] Error:", err.message);
  console.log(JSON.stringify({ continue: true }));
});
