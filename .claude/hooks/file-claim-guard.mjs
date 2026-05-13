#!/usr/bin/env node
// tier: T0
/**
 * file-claim-guard.mjs — PreToolUse hook for Edit | Write | MultiEdit
 *
 * Prevents two concurrent Claude chats from silently editing the same file.
 * Attempts to atomically claim the target file for this session; blocks the tool
 * call only when another LIVE session holds the claim. Expired claims are taken
 * over. Same-session re-edits refresh the TTL.
 *
 * Block contract:
 *   {decision: "block", reason: "..."} — PreToolUse rejects the tool call.
 *
 * On-disk contract mirrors ChatBusEngine.ts (state/shared/chat-bus/claims/*.json).
 * See: mcp-server/src/engines/ChatBusEngine.ts — claimFile() for authoritative logic.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
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
const CLAIMS_DIR = path.join(CHAT_BUS_ROOT, "claims");
const MESSAGES_DIR = path.join(CHAT_BUS_ROOT, "messages");
const PRESENCE_DIR = path.join(CHAT_BUS_ROOT, "presence");

const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const CLAIM_TTL_MS = 15 * 60 * 1000;
const PRESENCE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SESSION_ID = "default";
const MIN_SID_LENGTH = 8;
const STABLE_ID_TIMEOUT_MS = 1500;
const TIMESTAMP_SUFFIX_LEN = 16;

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

function canonicalPath(p) {
  return String(p).replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase() + ":").replace(/\/+$/, "");
}

function claimKey(p) {
  return createHash("sha256").update(canonicalPath(p)).digest("hex").slice(0, TIMESTAMP_SUFFIX_LEN);
}

function resolveSessionId(stdinSid) {
  if (stdinSid && typeof stdinSid === "string" && stdinSid.length >= MIN_SID_LENGTH) {
    return `claude-${stdinSid.slice(0, 8)}`;
  }
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { encoding: "utf-8", timeout: STABLE_ID_TIMEOUT_MS });
    const id = (r.stdout || "").trim();
    if (id && id.length >= MIN_SID_LENGTH) return id;
  } catch {
    /* ignore */
  }
  if (process.env.CLAUDE_SESSION_ID) return `claude-${process.env.CLAUDE_SESSION_ID.slice(0, 8)}`;
  return DEFAULT_SESSION_ID;
}

function peerIsLive(sessionId) {
  const p = path.join(PRESENCE_DIR, `${sessionId}.json`);
  const entry = readJsonSafe(p);
  if (!entry) return false;
  const ts = Date.parse(entry.ts);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= PRESENCE_TTL_MS;
}

function postAuditMessage({ sessionId, pcName, kind, p, intent }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ts = new Date().toISOString();
  const shortSession = sessionId.slice(0, 8).replace(/[^a-zA-Z0-9-]/g, "_");
  const fsTs = ts.replace(/[:.]/g, "-");
  const filename = `${fsTs}-${shortSession}-${id.slice(0, 8)}.json`;
  const msg = {
    schemaVersion: "1.0.0",
    id,
    ts,
    sessionId,
    pcName,
    kind,
    path: canonicalPath(p),
    ...(intent !== undefined ? { intent } : {}),
  };
  writeJsonAtomic(path.join(MESSAGES_DIR, filename), msg);
}

function extractTargetPath(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  return toolInput.file_path || toolInput.filePath || toolInput.path || null;
}

function getIntent(toolName) {
  if (toolName === "Write") return "write";
  if (toolName === "MultiEdit") return "multi-edit";
  return "edit";
}

function attemptClaim({ sessionId, pcName, targetPath, intent }) {
  const canonical = canonicalPath(targetPath);
  const claimFile = path.join(CLAIMS_DIR, `${claimKey(canonical)}.json`);
  const existing = readJsonSafe(claimFile);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAt = new Date(now + CLAIM_TTL_MS).toISOString();

  if (existing) {
    const expMs = Date.parse(existing.expiresAt);
    const isExpired = Number.isFinite(expMs) && expMs < now;
    const isOwn = existing.sessionId === sessionId;
    const holderLive = peerIsLive(existing.sessionId);

    if (!isOwn && !isExpired && holderLive) {
      return {
        ok: false,
        conflict: {
          path: canonical,
          heldBy: existing.sessionId,
          heldByPc: existing.pcName,
          intent: existing.intent,
          acquiredAt: existing.acquiredAt,
          expiresAt: existing.expiresAt,
          age_s: Math.round((now - Date.parse(existing.acquiredAt)) / 1000),
        },
      };
    }
    // Expired, own, or holder offline → overwrite.
  }

  const claim = {
    schemaVersion: "1.0.0",
    path: canonical,
    sessionId,
    pcName,
    acquiredAt: existing && existing.sessionId === sessionId ? existing.acquiredAt : nowIso,
    expiresAt,
    intent,
  };
  writeJsonAtomic(claimFile, claim);
  if (!existing || existing.sessionId !== sessionId) {
    postAuditMessage({ sessionId, pcName, kind: "claim", p: canonical, intent });
  }
  return { ok: true };
}

function formatBlockReason(conflict, toolName, targetPath) {
  const expMin = Math.max(0, Math.round((Date.parse(conflict.expiresAt) - Date.now()) / 60000));
  const ageMin = Math.round(conflict.age_s / 60);
  return [
    `🔒 CHAT-BUS FILE CLAIM CONFLICT — ${toolName} blocked`,
    ``,
    `Target:     ${targetPath}`,
    `Held by:    ${conflict.heldBy} (${conflict.heldByPc})`,
    `Intent:     ${conflict.intent}`,
    `Acquired:   ${ageMin}m ago`,
    `Expires:    in ${expMin}m`,
    ``,
    `Another live Claude chat is editing this file. Editing now would jumble commits and lose work.`,
    ``,
    `Options:`,
    `  1. Wait for the other chat to finish (it will release on Stop).`,
    `  2. Coordinate via chat-bus: prism_context action=chat_post body="need this file" — peer chat will see it.`,
    `  3. If peer is actually dead (crashed), claim will expire in ${expMin}m and you can retry.`,
    `  4. If this is the same physical chat and the ID is wrong, check helpers/stable-session-id.mjs output.`,
  ].join("\n");
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

  const toolName = payload.tool_name || payload.toolName || "";
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolInput = payload.tool_input || payload.toolInput || payload.input || {};
  const targetPath = extractTargetPath(toolInput);
  if (!targetPath) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  [CLAIMS_DIR, MESSAGES_DIR, PRESENCE_DIR].forEach(ensureDir);

  const sessionId = resolveSessionId(payload.session_id || payload.sessionId);
  const pcName = os.hostname();
  const intent = getIntent(toolName);

  const result = attemptClaim({ sessionId, pcName, targetPath, intent });

  if (result.ok) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(
    JSON.stringify({
      decision: "block",
      reason: formatBlockReason(result.conflict, toolName, targetPath),
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
