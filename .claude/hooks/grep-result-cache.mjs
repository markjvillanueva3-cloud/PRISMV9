#!/usr/bin/env node
/**
 * Grep Result Cache — PreToolUse Hook
 *
 * Blocks duplicate Grep queries (identical pattern + path + glob + type)
 * within a short window. Identical searches against an unchanged codebase
 * return identical results — don't spend tokens on a repeat.
 *
 * Cache key: pattern + path + glob + type + output_mode + multiline.
 * TTL: 5 minutes (tight window — codebase may change during active work).
 *
 * Output:
 *  - cache miss -> silent pass
 *  - cache hit  -> permissionDecision "deny" with guidance
 *
 * Never blocks if:
 *  - input is malformed
 *  - cache file is corrupt
 *  - pattern includes dynamic content (we treat everything as literal)
 *
 * Related: AGI-INFRA-MS4 (Phase A token efficiency).
 */

import { promises as fs } from "node:fs";
import { createInterface } from "node:readline";
import crypto from "node:crypto";

const CACHE_DIR = "H:/prism/.claude/cache";
const CACHE_FILE = `${CACHE_DIR}/grep-result-cache.json`;
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const TTL_MS = 5 * 60 * 1000;

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
    rl.on("line", (l) => (data += l + "\n"));
    rl.on("close", () => resolve(data));
  });
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

function prune(cache) {
  const now = Date.now();
  const out = {};
  for (const [k, v] of Object.entries(cache)) {
    if (v && typeof v.ts === "number" && now - v.ts < TTL_MS) out[k] = v;
  }
  return out;
}

function keyFor(input, sessionId) {
  const payload = JSON.stringify({
    session: sessionId ?? "_",
    pattern: input.pattern ?? "",
    path: input.path ?? "",
    glob: input.glob ?? "",
    type: input.type ?? "",
    output_mode: input.output_mode ?? "files_with_matches",
    multiline: !!input.multiline,
    case_insensitive: !!input["-i"],
  });
  return crypto.createHash("sha1").update(payload).digest("hex");
}

function emitDeny(reason) {
  const out = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(out));
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
  if (event.tool_name !== "Grep") process.exit(0);
  const input = event.tool_input || {};
  if (typeof input.pattern !== "string" || input.pattern.length === 0) process.exit(0);

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID;
  const key = keyFor(input, sessionId);
  const cache = prune(await loadCache());
  const hit = cache[key];

  if (hit) {
    const age = Math.round((Date.now() - hit.ts) / 1000);
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "grep-result-cache",
      event: "deny",
      session_id: sessionId ?? null,
      pattern: input.pattern.slice(0, 120),
      age_seconds: age,
    });
    emitDeny(
      `Same grep (pattern + path + glob + type) ran ${age}s ago in this session. Results are in context — do not repeat. If the codebase may have changed, narrow the query with a different glob or pattern.`,
    );
    process.exit(0);
  }

  cache[key] = {
    ts: Date.now(),
    pattern: input.pattern.slice(0, 120),
  };
  await saveCache(cache);
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "grep-result-cache",
    event: "miss-recorded",
    session_id: sessionId ?? null,
    pattern: input.pattern.slice(0, 120),
  });
  process.exit(0);
}

main().catch(() => process.exit(0));
