#!/usr/bin/env node
/**
 * auto-consensus-userprompt.mjs — UserPromptSubmit hook.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
 *
 * What this hook does
 * -------------------
 * 1. Reads the user's prompt from stdin.
 * 2. Detects "dev intent" keywords (build, plan, refactor, decide, review, etc).
 * 3. CACHE-FIRST: hashes the prompt, looks for a persisted consensus
 *    artifact at <PRISM_WIKI_ROOT>/consensus/<sha8>.md. If a recent one
 *    exists with recommendation=accept, surface the cached answer as
 *    additionalContext — saves a $0.30 fan-out and 30-60s wall time.
 * 4. CACHE-MISS: enqueue the prompt to <state>/consensus-queue.jsonl so
 *    the queue drainer can fan out asynchronously without blocking the
 *    user's prompt.
 *
 * Hook contract
 * -------------
 * Reads stdin: { prompt: string, session_id: string, ... }
 * Writes stdout: { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "..." } }
 *
 * MUST be fast (<500ms) — runs in the critical path of every prompt.
 * MUST NEVER throw — failure is silent (writes empty additionalContext).
 *
 * Opt-out
 * -------
 * Prompt contains [no-consensus] or [skip-consensus] → hook is a no-op.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const PRISM_WIKI_ROOT = process.env.PRISM_WIKI_ROOT ?? "H:/prism/knowledge/wiki";
const QUEUE_PATH = process.env.PRISM_CONSENSUS_QUEUE ?? "H:/prism/state/shared/consensus-queue.jsonl";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_PROMPT_LEN = 24;
const MAX_INJECT_BYTES = 2400;
// HARNESS-AUDIT (2026-05-11): the drainer only runs when the consensus engine
// is built into mcp-server/dist (currently only in the iooms0 worktree), so on
// most checkouts the queue is append-only and grows unbounded — it hit 620
// entries over 6 days. Cap it: keep only the most-recent MAX_QUEUE entries.
// HS-08: lowered from 200 → 50 (drainer rarely catches up if no chat
// hits Stop, and the useful retroactive-consensus window is small).
const MAX_QUEUE = Number(process.env.PRISM_CONSENSUS_QUEUE_MAX || 50);

const DEV_INTENT_PATTERNS = [
  /\b(build|implement|create|add|wire|generate|refactor)\b/i,
  /\b(plan|roadmap|design|architect|propose)\b/i,
  /\b(review|audit|scrutinize|validate|verify)\b/i,
  /\b(fix|repair|debug|investigate|diagnose)\b/i,
  /\b(decide|choose|recommend|suggest)\b/i,
  /\b(should|how (?:do|should|can))\b/i,
];

const OPT_OUT_TOKENS = ["[no-consensus]", "[skip-consensus]", "[trivial]"];

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || raw.length === 0) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeOutput(additionalContext) {
  const out = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: additionalContext ?? "",
    },
  };
  process.stdout.write(JSON.stringify(out));
}

function hashPrompt(prompt) {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized, "utf-8").digest("hex");
}

function detectIntent(prompt) {
  for (const pat of DEV_INTENT_PATTERNS) {
    if (pat.test(prompt)) return true;
  }
  return false;
}

function isOptOut(prompt) {
  for (const tok of OPT_OUT_TOKENS) {
    if (prompt.includes(tok)) return true;
  }
  return false;
}

function parseFrontmatter(body) {
  const out = {};
  if (!body.startsWith("---\n")) return out;
  const end = body.indexOf("\n---\n", 4);
  if (end === -1) return out;
  for (const line of body.slice(4, end).split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    out[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return out;
}

function extractAnswer(body) {
  const marker = "## Consensus answer\n\n```\n";
  const start = body.indexOf(marker);
  if (start === -1) return null;
  const fenceStart = start + marker.length;
  const fenceEnd = body.indexOf("\n```", fenceStart);
  if (fenceEnd === -1) return null;
  return body.slice(fenceStart, fenceEnd);
}

function tryRecall(prompt) {
  const promptHash = hashPrompt(prompt);
  const sha8 = promptHash.slice(0, 8);
  const wikiPath = path.join(PRISM_WIKI_ROOT, "consensus", `${sha8}.md`);
  if (!fs.existsSync(wikiPath)) return null;
  let stat;
  let body;
  try {
    stat = fs.statSync(wikiPath);
    body = fs.readFileSync(wikiPath, "utf-8");
  } catch {
    return null;
  }
  const ageMs = Date.now() - stat.mtimeMs;
  if (ageMs > TTL_MS) return null;
  const fm = parseFrontmatter(body);
  return {
    sha8,
    ageMs,
    recommendation: fm.recommendation ?? "review",
    agreement: fm.agreement_score ?? "0",
    voters: fm.model_voters ?? "[]",
    factuality: fm.mean_factuality ?? "null",
    answer: extractAnswer(body),
    wikiPath,
  };
}

function enqueueForBackground(prompt, sessionId) {
  try {
    fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      session_id: sessionId ?? "unknown",
      prompt: prompt.length > 8192 ? prompt.slice(0, 8192) + "...[truncated]" : prompt,
      prompt_hash: hashPrompt(prompt),
      task_type: "auto-userprompt",
    };
    // Bound the queue: if it has grown past MAX_QUEUE (drainer not running),
    // rewrite it with only the most-recent (MAX_QUEUE - 1) lines + this entry.
    // Cheap line-count guard avoids reading/parsing the file on every prompt.
    let lines = [];
    if (fs.existsSync(QUEUE_PATH)) {
      lines = fs.readFileSync(QUEUE_PATH, "utf-8").split("\n").filter((l) => l.trim().length > 0);
    }
    if (lines.length >= MAX_QUEUE) {
      const kept = lines.slice(-(MAX_QUEUE - 1));
      kept.push(JSON.stringify(entry));
      fs.writeFileSync(QUEUE_PATH, kept.join("\n") + "\n", "utf-8");
    } else {
      fs.appendFileSync(QUEUE_PATH, JSON.stringify(entry) + "\n", "utf-8");
    }
    return true;
  } catch {
    return false;
  }
}

function buildCachedNotice(c, prompt) {
  const ageMin = Math.floor(c.ageMs / 60_000);
  const lines = [
    "🧠 **Consensus cache hit** (auto-recall)",
    "",
    `- prompt sha8: \`${c.sha8}\``,
    `- recommendation: \`${c.recommendation}\` · agreement: \`${c.agreement}\` · voters: \`${c.voters}\` · factuality: \`${c.factuality}\``,
    `- age: ${ageMin}min · source: \`${c.wikiPath}\``,
    "",
  ];
  if (c.answer) {
    const snip = c.answer.length > MAX_INJECT_BYTES ? c.answer.slice(0, MAX_INJECT_BYTES) + "...[truncated]" : c.answer;
    lines.push("**Cached consensus answer (informational; verify if conditions changed):**");
    lines.push("");
    lines.push("```");
    lines.push(snip);
    lines.push("```");
  }
  return lines.join("\n");
}

function buildQueuedNotice(promptHash) {
  return [
    "🧠 **Consensus queued** (no cache, will fan out async)",
    "",
    `- prompt sha8: \`${promptHash.slice(0, 8)}\``,
    `- queue: \`${QUEUE_PATH}\``,
    "- to drain: \`node H:/prism/.claude/scripts/consensus-queue-drain.mjs\` (or via Stop hook)",
    "",
  ].join("\n");
}

async function main() {
  const input = readStdinJson();
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  const sessionId = typeof input.session_id === "string" ? input.session_id : null;

  if (prompt.length < MIN_PROMPT_LEN || isOptOut(prompt) || !detectIntent(prompt)) {
    return writeOutput("");
  }

  const cached = tryRecall(prompt);
  if (cached !== null) {
    return writeOutput(buildCachedNotice(cached, prompt));
  }

  const enqueued = enqueueForBackground(prompt, sessionId);
  if (enqueued) {
    return writeOutput(buildQueuedNotice(hashPrompt(prompt)));
  }
  return writeOutput("");
}

main().catch(() => writeOutput(""));
