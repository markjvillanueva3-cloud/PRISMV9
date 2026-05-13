#!/usr/bin/env node
// tier: T4
/**
 * Capability Reminder — UserPromptSubmit Hook
 *
 * Surfaces the right PRISM capability at the moment of need. Matches the
 * user's prompt against trigger phrases in state/shared/CAPABILITY_INDEX.json
 * and injects one-line hints via `additionalContext`.
 *
 * Complements ai-auto-command-router.mjs (which suggests slash commands) by
 * covering scripts, hooks, engines, stale-data traps, and file moves that
 * have no slash-command equivalent.
 *
 * Output:
 *  - no match        -> silent exit
 *  - match(es) found -> `{ additionalContext: "...\n..." }` via stdout JSON
 *
 * Rules (from CAPABILITY_INDEX.json):
 *  - case-insensitive substring match on trigger phrases
 *  - max 3 reminders per prompt, ordered by priority asc
 *  - 10 min per-entry, per-session cooldown via JSON cache
 *
 * Never blocks on errors — missing index, cache corruption, parse failure
 * all fall through silently so normal prompts are never delayed.
 *
 * Related: AGI-INFRA CAP-MS2 (discoverability at moment of need).
 */

import { promises as fs } from "node:fs";
import { createInterface } from "node:readline";

const INDEX_CANDIDATES = [
  "H:/prism-agi-infra-a/state/shared/CAPABILITY_INDEX.json",
  "H:/prism/state/shared/CAPABILITY_INDEX.json",
];
const CACHE_DIR = "H:/prism/.claude/cache";
const COOLDOWN_FILE = `${CACHE_DIR}/capability-reminder-cooldown.json`;
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const COOLDOWN_MS = 10 * 60 * 1000;
const MAX_REMINDERS = 3;

async function logTelemetry(event) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch {
    // non-fatal
  }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      data += line + "\n";
    });
    rl.on("close", () => resolve(data));
  });
}

async function loadIndex() {
  for (const p of INDEX_CANDIDATES) {
    try {
      const raw = await fs.readFile(p, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) return parsed;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function loadCooldown() {
  try {
    const raw = await fs.readFile(COOLDOWN_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCooldown(cache) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(COOLDOWN_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

function pruneCooldown(cache) {
  const now = Date.now();
  const out = {};
  for (const [k, ts] of Object.entries(cache)) {
    if (typeof ts === "number" && now - ts < COOLDOWN_MS) out[k] = ts;
  }
  return out;
}

function cooldownKey(sessionId, entryId) {
  return `${sessionId ?? "_"}::${entryId}`;
}

function findMatches(prompt, index) {
  const lower = prompt.toLowerCase();
  const matches = [];
  for (const entry of index.entries) {
    if (!Array.isArray(entry.triggers)) continue;
    for (const trigger of entry.triggers) {
      if (typeof trigger !== "string" || trigger.length === 0) continue;
      if (lower.includes(trigger.toLowerCase())) {
        matches.push(entry);
        break; // one hit per entry
      }
    }
  }
  return matches;
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const prompt = event.prompt || event.user_prompt || event.userPrompt || "";
  if (typeof prompt !== "string" || prompt.length === 0) process.exit(0);

  // Skip slash commands — user already picked a tool
  if (prompt.trim().startsWith("/")) process.exit(0);

  const index = await loadIndex();
  if (!index) process.exit(0);

  const matches = findMatches(prompt, index);
  if (matches.length === 0) process.exit(0);

  const sessionId =
    event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID || "_";

  let cooldown = pruneCooldown(await loadCooldown());
  const now = Date.now();
  const active = matches.filter((m) => {
    const key = cooldownKey(sessionId, m.id);
    return !(key in cooldown);
  });

  if (active.length === 0) process.exit(0);

  // Sort by priority asc (0 = highest), cap at MAX_REMINDERS
  active.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  const chosen = active.slice(0, MAX_REMINDERS);

  // Update cooldown for chosen entries
  for (const m of chosen) {
    cooldown[cooldownKey(sessionId, m.id)] = now;
  }
  await saveCooldown(cooldown);

  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "capability-reminder",
    event: "fired",
    session_id: sessionId ?? null,
    matched_ids: chosen.map((m) => m.id),
  });

  const lines = chosen.map((m) => `- [${m.category}] ${m.hint}`);
  const context = [
    "PRISM CAPABILITY REMINDER (matched on your prompt):",
    ...lines,
  ].join("\n");

  process.stdout.write(JSON.stringify({ additionalContext: context }));
  process.exit(0);
}

main().catch(() => process.exit(0));
