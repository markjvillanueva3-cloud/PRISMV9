#!/usr/bin/env node
// tier: T4
/**
 * stop_on_user_correction.mjs — Stop hook
 *
 * Scans the session transcript for user correction phrases (no/don't/stop/wrong/
 * revert/you broke). If found AND no feedback_*.md memory was written this
 * session, blocks exit with a draft feedback memory the user can save.
 *
 * Rationale: user corrections are the highest-signal feedback we get. Today
 * they vanish unless the user manually invokes /remember.
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const MEMORY_DIR = join(homedir(), ".claude", "projects", "H--prism", "memory");

const CORRECTION_PATTERNS = [
  /\bno\s+(don'?t|stop|wait|wrong)\b/i,
  /\b(don'?t|stop|never)\s+(do|use|run|edit|delete|commit|push|create)\b/i,
  /\byou\s+(broke|messed|screwed|destroyed|reverted|deleted|overwrote)\b/i,
  /\bthat'?s?\s+(wrong|incorrect|backwards|bad)\b/i,
  /\b(revert|undo|rollback)\s+(that|it|this|your)\b/i,
  /\bwhy\s+(did|are)\s+you\b.*\?/i,
  /\bnot\s+what\s+i\s+(asked|wanted|said)\b/i,
];

function parseInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function readTranscript(path) {
  if (!path || !existsSync(path)) return [];
  try {
    return readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function extractUserText(entry) {
  if (entry.type !== "user") return null;
  const content = entry.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n");
  }
  return null;
}

function findCorrections(transcript) {
  const corrections = [];
  for (const entry of transcript) {
    const text = extractUserText(entry);
    if (!text) continue;
    // Skip system-reminder noise inside user payload
    const cleaned = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
    if (cleaned.length < 4 || cleaned.length > 600) continue;
    for (const pattern of CORRECTION_PATTERNS) {
      if (pattern.test(cleaned)) {
        corrections.push({ text: cleaned.slice(0, 200), ts: entry.timestamp });
        break;
      }
    }
  }
  return corrections;
}

function feedbackWrittenThisSession(sessionStartMs) {
  if (!existsSync(MEMORY_DIR)) return false;
  try {
    return readdirSync(MEMORY_DIR)
      .filter((f) => f.startsWith("feedback_") && f.endsWith(".md"))
      .some((f) => {
        try { return statSync(join(MEMORY_DIR, f)).mtimeMs >= sessionStartMs; } catch { return false; }
      });
  } catch {
    return false;
  }
}

function pass(msg = "pass") {
  console.log(JSON.stringify({ continue: true, systemMessage: msg }));
}

function block(reason) {
  console.log(JSON.stringify({ continue: false, stopReason: reason }));
}

async function main() {
  const input = parseInput();

  // Avoid infinite re-block loops
  if (input.stop_hook_active === true) return pass("already-blocked");

  const transcript = readTranscript(input.transcript_path);
  if (transcript.length === 0) return pass("no-transcript");

  const corrections = findCorrections(transcript);
  if (corrections.length === 0) return pass("no-corrections");

  // Use first transcript timestamp as session-start anchor
  const firstTs = transcript[0]?.timestamp ? Date.parse(transcript[0].timestamp) : Date.now() - 7200000;
  if (feedbackWrittenThisSession(firstTs)) return pass("feedback-already-written");

  const sample = corrections.slice(-3).map((c) => `  - "${c.text}"`).join("\n");
  block(
    `User issued ${corrections.length} correction(s) this session but no feedback_*.md memory was saved.\n\n` +
    `Recent corrections:\n${sample}\n\n` +
    `Before exiting, write a feedback memory under ~/.claude/projects/H--prism/memory/feedback_<topic>.md ` +
    `capturing the rule, why, and how to apply. Update MEMORY.md with a one-line pointer.`
  );
}

main().catch(() => pass("error"));
