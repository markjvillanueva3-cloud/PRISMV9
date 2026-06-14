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

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, openSync, statSync, unlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { callOllama } from "../../scripts/ask-ollama.mjs";

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
// U-MEMO-EXTRACT-THROTTLE (slot:sierra 2026-06-09): the throttle is now keyed
// PER SESSION, not fleet-global. The old single RATE_FILE
// (.claude/cache/obsidian-extract-last.json) meant ANY one of the 26 fleet
// chats extracting rate-limited ALL of them for 5 min -- so the one live
// memo-creator (PSN leg #1) almost never fired. Each session now throttles
// independently under RATE_DIR; stale per-session files are pruned each run.
const RATE_DIR = "H:/prism/.claude/cache/obsidian-extract";
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between extractions (per session)
const RATE_STALE_MS = 24 * 60 * 60 * 1000; // prune per-session rate files older than 24h

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Read the Stop-hook stdin payload (carries session_id + transcript_path).
 * Canonical PRISM pattern (mirrors session-consolidate-graph.mjs): fd 0,
 * fail-soft to {} so a manual/no-stdin invocation never throws. Injectable
 * rawProvider lets tests supply a payload without touching real stdin.
 */
function readStdinPayload(rawProvider) {
  try {
    const buf = rawProvider ? rawProvider() : readFileSync(0);
    if (!buf || buf.length === 0) return {};
    const text = typeof buf === "string" ? buf : buf.toString("utf8");
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Sanitize a session id into a safe filename stem; empty -> "__global". */
function sanitizeSessionId(id) {
  if (!id || typeof id !== "string") return "__global";
  const clean = id.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  // Reject empty or dot-only stems (".", "..") -- they make degenerate
  // filenames. Path separators are already mapped to "_" above, so no
  // traversal out of RATE_DIR is possible regardless of input.
  if (!clean || /^\.+$/.test(clean)) return "__global";
  return clean;
}

/** Per-session rate file path under RATE_DIR (no session id -> "__global"). */
function sessionRateFile(sessionId, baseDir = RATE_DIR) {
  return join(baseDir, `${sanitizeSessionId(sessionId)}.json`);
}

function checkRateLimit(rateFile, nowMs = Date.now()) {
  try {
    const last = JSON.parse(readFileSync(rateFile, "utf8"));
    return (nowMs - last.timestamp) < MIN_INTERVAL_MS;
  } catch {
    return false;
  }
}

function recordRate(rateFile, nowMs = Date.now()) {
  ensureDir(dirname(rateFile));
  writeFileSync(rateFile, JSON.stringify({ timestamp: nowMs }));
}

/**
 * Remove per-session rate files older than maxAgeMs so RATE_DIR cannot grow
 * unbounded across thousands of sessions. Bounded, fail-soft; returns count.
 */
function pruneStaleRateFiles(baseDir = RATE_DIR, maxAgeMs = RATE_STALE_MS, nowMs = Date.now()) {
  let pruned = 0;
  try {
    if (!existsSync(baseDir)) return 0;
    for (const f of readdirSync(baseDir)) {
      if (!f.endsWith(".json")) continue;
      const fp = join(baseDir, f);
      try {
        if (nowMs - statSync(fp).mtimeMs > maxAgeMs) { unlinkSync(fp); pruned++; }
      } catch { /* concurrent prune / already gone */ }
    }
  } catch { /* dir unreadable */ }
  return pruned;
}

/**
 * Fallback transcript locator -- used ONLY when the Stop-hook stdin payload
 * carried no transcript_path. Picks the most-recently-MODIFIED transcript by
 * mtime (real recency) via statSync. The old code used readFileSync().length
 * (file SIZE), which (a) picked the LARGEST transcript fleet-wide, not this
 * session's, and (b) fully read every transcript just to measure it.
 */
function getLatestTranscript() {
  try {
    const files = readdirSync(TRANSCRIPT_DIR)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => {
        const p = join(TRANSCRIPT_DIR, f);
        let mtime = 0;
        try { mtime = statSync(p).mtimeMs; } catch { /* gone */ }
        return { name: f, path: p, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) return null;

    // Read last 30KB of most recently modified transcript
    const content = readFileSync(files[0].path, "utf8");
    return content.slice(-30000);
  } catch {
    return null;
  }
}

/**
 * Resolve the transcript content for THIS session. Prefers the explicit
 * transcript_path from the Stop-hook stdin payload (authoritative current
 * session); falls back to the latest-by-mtime locator only if it is absent or
 * unreadable. Returns the last 30KB (the recent window the extractor analyzes).
 */
function resolveTranscript(transcriptPath) {
  if (transcriptPath && typeof transcriptPath === "string") {
    try {
      const norm = transcriptPath.replace(/\\/g, "/");
      if (existsSync(norm)) return readFileSync(norm, "utf8").slice(-30000);
    } catch { /* fall through to latest-by-mtime */ }
  }
  return getLatestTranscript();
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
      // Live Claude Code transcripts use type:"user" (older shape: "human").
      // Accept both; content may be a string OR an array of content parts
      // (same shape as assistant). Without this, user turns were silently
      // dropped from the context fed to the extractor (verified: live
      // transcripts emit zero "human" entries).
      if ((entry.type === "user" || entry.type === "human") && entry.message?.content) {
        const c = entry.message.content;
        const userText = Array.isArray(c)
          ? c.filter(p => p.type === "text").map(p => p.text).join("\n")
          : (typeof c === "string" ? c : "");
        if (userText) messages.push(`USER: ${userText.slice(0, 200)}`);
      }
    } catch {}
  }
  return messages.slice(-20); // Last 20 messages
}

// Extraction is a small low-temperature JSON summarization -- a short token cap
// + short timeout keep the Stop hook fast and fail-soft.
const EXTRACT_MODEL = "qwen2.5-coder:32b";
const EXTRACT_NUM_PREDICT = 300;
const EXTRACT_TIMEOUT_MS = 15000; // short -- a Stop hook must never hang on a cold model

async function queryOllama(prompt, callImpl = callOllama) {
  // Use the canonical callOllama helper (Node fetch -> 127.0.0.1, no shell).
  // The prior path was `execSync(\`curl ... -d '${body}'\`)`, which interpolated
  // attacker-influenceable TRANSCRIPT content into a shell command behind
  // fragile single-quote escaping (command-injection risk) and targeted
  // `localhost`, which Node resolves to IPv6 ::1 where ollama.exe (IPv4) refuses.
  const r = await callImpl(EXTRACT_MODEL, prompt, {
    numPredict: EXTRACT_NUM_PREDICT,
    timeoutMs: EXTRACT_TIMEOUT_MS,
  });
  return r && r.ok ? r.text : null;
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
  // Read the Stop-hook stdin payload -- carries session_id + transcript_path.
  const payload = readStdinPayload();
  const sessionId = typeof payload.session_id === "string" ? payload.session_id
    : typeof payload.sessionId === "string" ? payload.sessionId
    : undefined;
  const transcriptPath = typeof payload.transcript_path === "string" ? payload.transcript_path
    : typeof payload.transcriptPath === "string" ? payload.transcriptPath
    : undefined;

  // Prune stale per-session rate files (bounded, fail-soft) before throttling.
  pruneStaleRateFiles();

  // Rate limit PER SESSION (not fleet-global) -- don't extract too frequently.
  const rateFile = sessionRateFile(sessionId);
  if (checkRateLimit(rateFile)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Use THIS session's transcript (stdin transcript_path); fall back to
  // latest-by-mtime only if the payload carried none.
  const transcript = resolveTranscript(transcriptPath);
  if (!transcript) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const messages = extractMessagesFromTranscript(transcript);
  if (messages.length < 5) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordRate(rateFile);

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
    writeMemory(
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
    writeMemory(
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
    writeMemory(
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

// Run main() only when invoked directly as the hook entry point -- NOT when
// imported by a test (importing must not read stdin / query Ollama / write).
const isMain = (() => {
  try { return pathToFileURL(process.argv[1] || "").href === import.meta.url; }
  catch { return false; }
})();

if (isMain) {
  main().catch(err => {
    console.error("[obsidian-extract] Error:", err.message);
    console.log(JSON.stringify({ continue: true }));
  });
}

export {
  readStdinPayload,
  sanitizeSessionId,
  sessionRateFile,
  checkRateLimit,
  recordRate,
  pruneStaleRateFiles,
  getLatestTranscript,
  resolveTranscript,
  extractMessagesFromTranscript,
  MIN_INTERVAL_MS,
  RATE_DIR,
  RATE_STALE_MS,
};
