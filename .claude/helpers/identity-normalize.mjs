#!/usr/bin/env node
// helpers/identity-normalize.mjs
//
// Single source of truth for chat-identity normalization.
// Fixes the namespace bug from feedback_file_claim_namespace_bug.md where
// `MarkV-XXXXX` (PID-only) and `Agent@MARKV/pid-X` schemes did not normalize
// to the same key, so file-claim-guard missed cross-scheme conflicts.
//
// The canonical key is: `<chat_id>@<machine>`
// - chat_id: stable session id (preferred) or fallback derived from env
// - machine: hostname (uppercase, no domain)
//
// All claim/coordination tools MUST go through normalizeIdentity() to look
// up or write claims. This is the single chokepoint that prevents
// silent-corruption-class bugs in multi-chat operation.

import { execSync } from "node:child_process";
import { hostname } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get the canonical machine name (uppercase, no domain).
 */
export function getMachine() {
  return (hostname() || "UNKNOWN").split(".")[0].toUpperCase();
}

/**
 * Get the stable session id from helpers/stable-session-id.mjs if available.
 * Falls back to a deterministic key derived from env when the helper is
 * unavailable (e.g. when called from a hook context with no shell).
 */
export function getStableSessionId() {
  try {
    const out = execSync(
      `node "${path.join(__dirname, "stable-session-id.mjs")}"`,
      { windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2000 }
    ).trim();
    if (out && /^[a-z0-9-]+$/i.test(out)) return out;
  } catch {
    // fall through
  }
  // Fallbacks (in priority order):
  if (process.env.CLAUDE_SESSION_ID) return process.env.CLAUDE_SESSION_ID;
  if (process.env.AGENT_INSTANCE) return process.env.AGENT_INSTANCE;
  // Last resort: PID-anchored key (the legacy buggy scheme — but at least
  // we now wrap it consistently so peer chats see the same key shape.)
  return `pid-${process.pid}`;
}

/**
 * Normalize any input identity string into the canonical key.
 * Accepts:
 *   - "claude-99eca613"               → "claude-99eca613@<MACHINE>"
 *   - "Agent@MARKV/pid-51344"         → "Agent-pid-51344@MARKV"
 *   - "MarkV-20636"                   → "MarkV-20636@<MACHINE>"
 *   - undefined / null                → derive from current process
 */
export function normalizeIdentity(raw) {
  const machine = getMachine();
  if (!raw || typeof raw !== "string") {
    return `${getStableSessionId()}@${machine}`;
  }
  const s = raw.trim();
  // Already normalized?
  if (/^[\w.-]+@[A-Z0-9-]+$/.test(s)) return s;
  // "Agent@MACHINE/pid-N" form
  const m1 = s.match(/^(Agent|Claude|Codex|Gemini)@([A-Za-z0-9-]+)\/pid-(\d+)$/);
  if (m1) {
    return `${m1[1]}-pid-${m1[3]}@${m1[2].toUpperCase()}`;
  }
  // "MarkV-NNNNN" form (PID-only)
  if (/^[A-Za-z]+-\d+$/.test(s)) return `${s}@${machine}`;
  // Generic: append machine
  return `${s}@${machine}`;
}

/**
 * Decompose a normalized key back into {chat, machine}.
 */
export function parseIdentity(key) {
  const m = String(key).match(/^(.+)@([A-Z0-9-]+)$/);
  if (!m) return { chat: key, machine: getMachine() };
  return { chat: m[1], machine: m[2] };
}

/**
 * CLI: print the current canonical identity (one line).
 *   node identity-normalize.mjs           → current
 *   node identity-normalize.mjs <input>   → normalize given string
 */
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    import.meta.url.endsWith(path.basename(process.argv[1] || ""))) {
  const arg = process.argv[2];
  process.stdout.write(normalizeIdentity(arg) + "\n");
}
