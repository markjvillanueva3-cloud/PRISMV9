#!/usr/bin/env node
// tier: T2
/**
 * chat-bus-inject.mjs — UserPromptSubmit hook
 *
 * Injects live inter-chat signals at prompt time:
 *   1. Unread messages posted by OTHER live Claude chats since our last read.
 *   2. Active file-claims held by other chats (so we know what not to touch).
 *   3. Our own presence heartbeat (so other chats see us as live).
 *
 * On-disk contract mirrors ChatBusEngine.ts (state/shared/chat-bus/{messages,claims,cursors,presence}).
 * Non-blocking — only adds context via hookSpecificOutput.additionalContext.
 *
 * See: mcp-server/src/engines/ChatBusEngine.ts for authoritative read/write logic.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const CHAT_BUS_ROOT = "H:/prism/state/shared/chat-bus";
const MESSAGES_DIR = path.join(CHAT_BUS_ROOT, "messages");
const CLAIMS_DIR = path.join(CHAT_BUS_ROOT, "claims");
const CURSORS_DIR = path.join(CHAT_BUS_ROOT, "cursors");
const PRESENCE_DIR = path.join(CHAT_BUS_ROOT, "presence");

const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const PRESENCE_TTL_MS = 10 * 60 * 1000;
const MAX_MESSAGES_INJECTED = 20;
const MAX_BODY_CHARS = 400;

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(p, data) {
  try {
    ensureDir(path.dirname(p));
    const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
    fs.renameSync(tmp, p);
    return true;
  } catch {
    return false;
  }
}

function listDirSafe(p) {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function resolveSessionId(stdinSid) {
  if (stdinSid && typeof stdinSid === "string" && stdinSid.length >= 8) {
    return `claude-${stdinSid.slice(0, 8)}`;
  }
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { encoding: "utf-8", timeout: 1500 });
    const id = (r.stdout || "").trim();
    if (id && id.length >= 8) return id;
  } catch {
    /* ignore */
  }
  if (process.env.CLAUDE_SESSION_ID) return `claude-${process.env.CLAUDE_SESSION_ID.slice(0, 8)}`;
  return "default";
}

function heartbeatSelf(sessionId, pcName) {
  const p = path.join(PRESENCE_DIR, `${sessionId}.json`);
  writeJsonAtomic(p, {
    sessionId,
    pcName,
    ts: new Date().toISOString(),
    pid: process.pid,
  });
}

function readUnreadMessages(sessionId) {
  const cursorFile = path.join(CURSORS_DIR, `${sessionId}.json`);
  const cursor = readJsonSafe(cursorFile);
  const sinceTs = cursor?.ts ?? "1970-01-01T00:00:00.000Z";

  const files = listDirSafe(MESSAGES_DIR).sort();
  const messages = [];
  for (const f of files) {
    const m = readJsonSafe(path.join(MESSAGES_DIR, f));
    if (!m || m.ts <= sinceTs) continue;
    if (m.sessionId === sessionId) continue;
    messages.push(m);
  }

  if (messages.length) {
    const newest = messages[messages.length - 1].ts;
    writeJsonAtomic(cursorFile, { ts: newest, updatedAt: new Date().toISOString() });
  }
  return messages;
}

function activeForeignClaims(sessionId) {
  const now = Date.now();
  const out = [];
  for (const f of listDirSafe(CLAIMS_DIR)) {
    const c = readJsonSafe(path.join(CLAIMS_DIR, f));
    if (!c || !c.path || !c.sessionId) continue;
    if (c.sessionId === sessionId) continue;
    const expMs = Date.parse(c.expiresAt);
    if (Number.isFinite(expMs) && expMs < now) continue;
    out.push(c);
  }
  return out;
}

function activePeers(sessionId) {
  const now = Date.now();
  const peers = [];
  for (const f of listDirSafe(PRESENCE_DIR)) {
    const e = readJsonSafe(path.join(PRESENCE_DIR, f));
    if (!e || !e.sessionId || e.sessionId === sessionId) continue;
    const ts = Date.parse(e.ts);
    if (!Number.isFinite(ts) || now - ts > PRESENCE_TTL_MS) continue;
    peers.push({ sessionId: e.sessionId, pcName: e.pcName, ageMin: Math.round((now - ts) / 60000) });
  }
  return peers;
}

function formatBrief({ messages, claims, peers, sessionId }) {
  const lines = [];
  lines.push("## 🔗 Chat Bus — Live Inter-Chat Signals");
  lines.push(`_You are \`${sessionId}\`. ${peers.length} peer chat(s) active in last 10min._`);
  lines.push("");

  if (peers.length > 0) {
    lines.push("**Active peers:**");
    for (const p of peers.slice(0, 8)) {
      lines.push(`- \`${p.sessionId}\` on ${p.pcName} (${p.ageMin}m ago)`);
    }
    lines.push("");
  }

  if (claims.length > 0) {
    lines.push(`**🔒 Files claimed by OTHER chats (do not edit or commit):**`);
    for (const c of claims.slice(0, 15)) {
      const expMin = Math.max(0, Math.round((Date.parse(c.expiresAt) - Date.now()) / 60000));
      lines.push(`- \`${c.path}\` — ${c.sessionId} (${c.intent}, ${expMin}m left)`);
    }
    if (claims.length > 15) lines.push(`- … and ${claims.length - 15} more`);
    lines.push("");
  }

  if (messages.length > 0) {
    lines.push(`**📨 Unread messages from other chats (${messages.length}):**`);
    const shown = messages.slice(-MAX_MESSAGES_INJECTED);
    for (const m of shown) {
      const ageMin = Math.round((Date.now() - Date.parse(m.ts)) / 60000);
      const from = `${m.sessionId.slice(0, 20)}@${m.pcName}`;
      if (m.kind === "message") {
        const body = (m.body || "").slice(0, MAX_BODY_CHARS);
        lines.push(`- [${ageMin}m] ${from}: ${body}`);
      } else if (m.kind === "claim") {
        lines.push(`- [${ageMin}m] ${from} CLAIMED \`${m.path}\` (${m.intent || "edit"})`);
      } else if (m.kind === "release") {
        lines.push(`- [${ageMin}m] ${from} released \`${m.path}\``);
      }
    }
    lines.push("");
  }

  if (messages.length === 0 && claims.length === 0) return "";
  lines.push("_Respect active claims. Post status to the bus via `prism_context` action `chat_post` when starting non-trivial edits._");
  return lines.join("\n");
}

async function main() {
  const raw = readStdinSafe();

  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  [MESSAGES_DIR, CLAIMS_DIR, CURSORS_DIR, PRESENCE_DIR].forEach(ensureDir);

  const sessionId = resolveSessionId(payload.session_id || payload.sessionId);
  const pcName = os.hostname();

  heartbeatSelf(sessionId, pcName);

  const messages = readUnreadMessages(sessionId);
  const claims = activeForeignClaims(sessionId);
  const peers = activePeers(sessionId);

  const brief = formatBrief({ messages, claims, peers, sessionId });

  if (!brief) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: brief,
      },
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
