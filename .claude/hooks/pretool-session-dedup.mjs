#!/usr/bin/env node
// tier: T4
/**
 * pretool-session-dedup.mjs — PreToolUse hook
 * Covers gaps A1 (Bash), A2 (Read), A4 (WebFetch), A6 (Glob): if operator
 * runs the SAME tool-call signature within the session, surface a "cache
 * hit available — same call ran recently" nudge.
 * Knob: PRISM_SESSION_DEDUP_DISABLE=1
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

const CACHE_FILE = "H:/prism/state/shared/session-dedup-cache.json";
const TTL_MS = 30 * 60 * 1000; // 30 min

export function signatureFor(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  let payload;
  if (toolName === "Bash") payload = String(toolInput.command || "").trim();
  else if (toolName === "Read") payload = `${toolInput.file_path || ""}|${toolInput.offset || 0}|${toolInput.limit || 0}`;
  else if (toolName === "Glob") payload = `${toolInput.pattern || ""}|${toolInput.path || ""}`;
  else if (toolName === "WebFetch") payload = String(toolInput.url || "");
  else return null;
  if (!payload) return null;
  return createHash("sha1").update(`${toolName}::${payload}`).digest("hex");
}

export function isCacheHit(cache, signature, now = Date.now()) {
  if (!cache || !signature) return false;
  const entry = cache.entries && cache.entries[signature];
  if (!entry) return false;
  return (now - entry.ts) < TTL_MS;
}

export function recordCall(cache, signature, sessionId, now = Date.now()) {
  const base = cache && typeof cache === "object" ? cache : { schemaVersion: "1.0.0", entries: {} };
  const entries = base.entries && typeof base.entries === "object" ? { ...base.entries } : {};
  entries[signature] = { ts: now, sessionId };
  return { ...base, entries };
}

export function formatDedupNudge(toolName, signature) {
  return `## ♻ Session-dedup cache hit (${toolName})\nSame ${toolName} call ran in this session within the last 30 min (sig: ${signature.slice(0, 8)}). If you're re-running, the previous result may still be valid — check the prior turn first. Disable: \`PRISM_SESSION_DEDUP_DISABLE=1\`.`;
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}
function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  if (process.env.PRISM_SESSION_DEDUP_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  const sessionId = String(input.session_id || input.sessionId || "").slice(0, 36);
  const sig = signatureFor(toolName, toolInput);
  if (!sig) { pass(); return; }

  let cache;
  try { cache = JSON.parse(readFileSync(CACHE_FILE, "utf8")); }
  catch { cache = { schemaVersion: "1.0.0", entries: {} }; }

  const hit = isCacheHit(cache, sig);
  const newCache = recordCall(cache, sig, sessionId);
  try {
    if (!existsSync(dirname(CACHE_FILE))) mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(newCache), "utf8");
  } catch { /* tolerate */ }

  if (hit) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: formatDedupNudge(toolName, sig) },
    }));
  } else { pass(); }
}

if (process.argv[1] && process.argv[1].endsWith("pretool-session-dedup.mjs")) {
  main().catch(() => pass());
}
