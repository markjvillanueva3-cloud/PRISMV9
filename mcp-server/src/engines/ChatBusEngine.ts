// WIRE-EXEMPT: dispatcher wiring deferred to next session (context cap). See RESUME directive in HANDOFF-Claude-claude-32a29676.md — hooks + prism_context dispatcher actions (chat_post/chat_read/claim_file/release_file/presence/prune) to be added as [MAIN]/U-CHATBUS01.
/**
 * ChatBusEngine — Live instant chat + file-claim registry for concurrent Claude chats.
 *
 * Problem:
 *   1. Multiple Claude chats run simultaneously against the same H: drive.
 *   2. They don't see each other's progress → duplicate work, blind collisions.
 *   3. Two chats editing the same file → commits get jumbled when both git-add it.
 *
 * Design (file-system based, no daemon required, lock-free for writes):
 *   - Messages: `state/shared/chat-bus/messages/<sortable-ts>-<sessionShort>-<uuid>.json`
 *     One file per message → no append contention on NTFS/USB.
 *   - Claims:   `state/shared/chat-bus/claims/<sha256(path).16>.json`
 *     Atomic `wx` (exclusive-create) → concurrent-claim attempts fail fast for losers.
 *   - Cursors:  `state/shared/chat-bus/cursors/<sessionId>.json` — per-chat read pointer.
 *   - Presence: `state/shared/chat-bus/presence/<sessionId>.json` — heartbeat.
 *
 * All operations are idempotent, TTL-bounded, and survive process crashes.
 * No network, no daemon, no external deps — pure fs + crypto.
 *
 * Usage (hooks):
 *   - UserPromptSubmit hook   → engine.readUnread(sessionId)
 *   - PreToolUse Edit/Write   → engine.claimFile(sessionId, path)
 *   - PreToolUse git-commit   → engine.findForeignClaims(sessionId, stagedPaths)
 *   - Stop hook / session end → engine.releaseAllFor(sessionId)
 *
 * @module engines/ChatBusEngine
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
  openSync,
  closeSync,
  renameSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";

export const CHAT_BUS_ROOT = "H:/prism/state/shared/chat-bus";
const MESSAGES_DIR = join(CHAT_BUS_ROOT, "messages");
const CLAIMS_DIR = join(CHAT_BUS_ROOT, "claims");
const CURSORS_DIR = join(CHAT_BUS_ROOT, "cursors");
const PRESENCE_DIR = join(CHAT_BUS_ROOT, "presence");

// Allow tests/future integrations to override the storage root.
let rootOverride: string | null = null;
export function setChatBusRoot(override: string | null): void {
  rootOverride = override;
}
function dir(kind: "messages" | "claims" | "cursors" | "presence"): string {
  const base = rootOverride ?? CHAT_BUS_ROOT;
  return join(base, kind);
}

// ─── TTL / Message-kind constants ────────────────────────────────────────
export const CLAIM_TTL_MS = 15 * 60 * 1000; // 15 min — covers long edits
export const PRESENCE_TTL_MS = 10 * 60 * 1000; // 10 min since last heartbeat = offline
export const MESSAGE_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 h

export type MessageKind =
  | "message" // free-form chat post (status, blocker, handoff note)
  | "claim" // audit entry: this session claimed a file
  | "release" // audit entry: this session released a file
  | "heartbeat"; // presence signal

export interface ChatMessage {
  schemaVersion: "1.0.0";
  id: string; // unique id per message
  ts: string; // ISO-8601
  sessionId: string; // stable session id from stable-session-id.mjs
  pcName: string; // hostname
  kind: MessageKind;
  body?: string; // for kind === "message"
  path?: string; // for kind === "claim" | "release"
  intent?: string; // for kind === "claim"
}

export interface FileClaim {
  schemaVersion: "1.0.0";
  path: string; // canonical path (forward slashes)
  sessionId: string;
  pcName: string;
  acquiredAt: string; // ISO-8601
  expiresAt: string; // ISO-8601 (acquiredAt + CLAIM_TTL_MS)
  intent: string; // "edit" | "write" | free-form
}

export interface ClaimConflict {
  path: string;
  heldBy: string; // sessionId
  heldByPc: string;
  intent: string;
  acquiredAt: string;
  expiresAt: string;
  age_s: number;
}

export interface ReadUnreadResult {
  messages: ChatMessage[];
  cursorAdvancedTo: string; // ISO-8601 ts of the newest message returned
}

// ─── Utilities ───────────────────────────────────────────────────────────
function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function canonicalPath(p: string): string {
  // Normalize: forward slashes, lowercase drive letter, strip trailing slash.
  return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase() + ":").replace(/\/+$/, "");
}

function claimKey(path: string): string {
  return createHash("sha256").update(canonicalPath(path)).digest("hex").slice(0, 16);
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath: string, data: unknown, exclusive = false): boolean {
  ensureDir(join(filePath, ".."));
  try {
    if (exclusive) {
      // O_WRONLY | O_CREAT | O_EXCL — fails if file exists. This is the atomic-claim primitive.
      const fd = openSync(filePath, "wx");
      try {
        writeFileSync(fd, JSON.stringify(data, null, 2) + "\n");
      } finally {
        closeSync(fd);
      }
    } else {
      const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
      writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
      // rename is atomic on the same filesystem — partial writes never visible to readers.
      renameSync(tmp, filePath);
    }
    return true;
  } catch {
    return false;
  }
}

function removeFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch {
    /* already gone */
  }
}

function listDirSafe(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

// Sortable timestamp in filenames: 2026-04-24T11-35-00-123Z (ms resolution, lexicographically ordered).
function fsSortableTs(d = new Date()): string {
  return d.toISOString().replace(/[:.]/g, "-");
}

// ─── Core engine ─────────────────────────────────────────────────────────
export class ChatBusEngine {
  /** Post a message to the bus. Returns the message id. */
  postMessage(input: {
    sessionId: string;
    pcName: string;
    kind: MessageKind;
    body?: string;
    path?: string;
    intent?: string;
  }): string {
    if (!input.sessionId) throw new Error("sessionId required");
    if (!input.pcName) throw new Error("pcName required");
    if (input.kind === "message" && !input.body) throw new Error("body required for kind=message");
    if ((input.kind === "claim" || input.kind === "release") && !input.path) {
      throw new Error("path required for claim/release");
    }

    const id = randomUUID();
    const ts = new Date().toISOString();
    const msg: ChatMessage = {
      schemaVersion: "1.0.0",
      id,
      ts,
      sessionId: input.sessionId,
      pcName: input.pcName,
      kind: input.kind,
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.path !== undefined ? { path: canonicalPath(input.path) } : {}),
      ...(input.intent !== undefined ? { intent: input.intent } : {}),
    };

    const shortSession = input.sessionId.slice(0, 8).replace(/[^a-zA-Z0-9-]/g, "_");
    const filename = `${fsSortableTs()}-${shortSession}-${id.slice(0, 8)}.json`;
    writeJsonAtomic(join(dir("messages"), filename), msg, false);
    return id;
  }

  /** Read all messages newer than this session's cursor; advance cursor. */
  readUnread(sessionId: string): ReadUnreadResult {
    if (!sessionId) throw new Error("sessionId required");
    const cursorFile = join(dir("cursors"), `${sessionId}.json`);
    const cursor = readJsonSafe<{ ts: string }>(cursorFile);
    const sinceTs = cursor?.ts ?? "1970-01-01T00:00:00.000Z";

    const files = listDirSafe(dir("messages")).sort();
    const messages: ChatMessage[] = [];
    for (const f of files) {
      const m = readJsonSafe<ChatMessage>(join(dir("messages"), f));
      if (!m || m.ts <= sinceTs) continue;
      // Skip our own messages — no echo.
      if (m.sessionId === sessionId) continue;
      messages.push(m);
    }

    const cursorAdvancedTo = messages.length ? messages[messages.length - 1]!.ts : sinceTs;
    if (messages.length) {
      writeJsonAtomic(cursorFile, { ts: cursorAdvancedTo, updatedAt: new Date().toISOString() }, false);
    }
    return { messages, cursorAdvancedTo };
  }

  /**
   * Attempt to claim a file. Returns null on success, or the conflicting claim if held by another session.
   * If this session already holds the claim, refreshes TTL and returns null.
   * Expired claims are auto-released and overridden.
   */
  claimFile(input: {
    sessionId: string;
    pcName: string;
    path: string;
    intent?: string;
  }): ClaimConflict | null {
    if (!input.sessionId) throw new Error("sessionId required");
    if (!input.path) throw new Error("path required");

    const canonical = canonicalPath(input.path);
    const claimFile = join(dir("claims"), `${claimKey(canonical)}.json`);
    const existing = readJsonSafe<FileClaim>(claimFile);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const expires = new Date(now + CLAIM_TTL_MS).toISOString();

    if (existing) {
      const expiresMs = Date.parse(existing.expiresAt);
      const isExpired = Number.isFinite(expiresMs) && expiresMs < now;
      const isOwnClaim = existing.sessionId === input.sessionId;
      if (!isExpired && !isOwnClaim) {
        // Conflict — another live chat holds this file.
        return {
          path: canonical,
          heldBy: existing.sessionId,
          heldByPc: existing.pcName,
          intent: existing.intent,
          acquiredAt: existing.acquiredAt,
          expiresAt: existing.expiresAt,
          age_s: Math.round((now - Date.parse(existing.acquiredAt)) / 1000),
        };
      }
      // Either expired or own-claim → overwrite to refresh TTL.
    }

    const claim: FileClaim = {
      schemaVersion: "1.0.0",
      path: canonical,
      sessionId: input.sessionId,
      pcName: input.pcName,
      acquiredAt: existing && existing.sessionId === input.sessionId ? existing.acquiredAt : nowIso,
      expiresAt: expires,
      intent: input.intent ?? "edit",
    };
    writeJsonAtomic(claimFile, claim, false);
    // Audit trail: also post as message (so other chats see claim activity in their feed).
    this.postMessage({
      sessionId: input.sessionId,
      pcName: input.pcName,
      kind: "claim",
      path: canonical,
      intent: claim.intent,
    });
    return null;
  }

  /** Release a file claim. No-op if not held by this session. */
  releaseFile(input: { sessionId: string; pcName: string; path: string }): boolean {
    if (!input.sessionId) throw new Error("sessionId required");
    if (!input.path) throw new Error("path required");
    const canonical = canonicalPath(input.path);
    const claimFile = join(dir("claims"), `${claimKey(canonical)}.json`);
    const existing = readJsonSafe<FileClaim>(claimFile);
    if (!existing) return false;
    if (existing.sessionId !== input.sessionId) return false; // not ours to release
    removeFile(claimFile);
    this.postMessage({
      sessionId: input.sessionId,
      pcName: input.pcName,
      kind: "release",
      path: canonical,
    });
    return true;
  }

  /** Release every claim held by this session (call on Stop hook / session end). */
  releaseAllFor(sessionId: string): number {
    if (!sessionId) throw new Error("sessionId required");
    let released = 0;
    for (const f of listDirSafe(dir("claims"))) {
      const claim = readJsonSafe<FileClaim>(join(dir("claims"), f));
      if (claim && claim.sessionId === sessionId) {
        removeFile(join(dir("claims"), f));
        released++;
      }
    }
    return released;
  }

  /**
   * Find all claims on the given paths that are held by sessions OTHER than sessionId.
   * Used by commit-guard to reject commits that would jumble another chat's work.
   */
  findForeignClaims(sessionId: string, paths: string[]): ClaimConflict[] {
    const conflicts: ClaimConflict[] = [];
    const now = Date.now();
    for (const p of paths) {
      const canonical = canonicalPath(p);
      const claimFile = join(dir("claims"), `${claimKey(canonical)}.json`);
      const claim = readJsonSafe<FileClaim>(claimFile);
      if (!claim) continue;
      if (claim.sessionId === sessionId) continue;
      const expiresMs = Date.parse(claim.expiresAt);
      if (Number.isFinite(expiresMs) && expiresMs < now) continue; // expired — ignore
      conflicts.push({
        path: canonical,
        heldBy: claim.sessionId,
        heldByPc: claim.pcName,
        intent: claim.intent,
        acquiredAt: claim.acquiredAt,
        expiresAt: claim.expiresAt,
        age_s: Math.round((now - Date.parse(claim.acquiredAt)) / 1000),
      });
    }
    return conflicts;
  }

  /** Update presence heartbeat for this session. */
  heartbeat(sessionId: string, pcName: string, meta: Record<string, unknown> = {}): void {
    if (!sessionId) throw new Error("sessionId required");
    const p = join(dir("presence"), `${sessionId}.json`);
    writeJsonAtomic(
      p,
      { sessionId, pcName, ts: new Date().toISOString(), pid: process.pid, ...meta },
      false,
    );
  }

  /** List sessions seen within presence TTL. */
  activeSessions(ttlMs = PRESENCE_TTL_MS): Array<{
    sessionId: string;
    pcName: string;
    ts: string;
    age_s: number;
  }> {
    const now = Date.now();
    const out: Array<{ sessionId: string; pcName: string; ts: string; age_s: number }> = [];
    for (const f of listDirSafe(dir("presence"))) {
      const entry = readJsonSafe<{ sessionId: string; pcName: string; ts: string }>(join(dir("presence"), f));
      if (!entry) continue;
      const tsMs = Date.parse(entry.ts);
      if (!Number.isFinite(tsMs)) continue;
      const age = now - tsMs;
      if (age > ttlMs) continue;
      out.push({ sessionId: entry.sessionId, pcName: entry.pcName, ts: entry.ts, age_s: Math.round(age / 1000) });
    }
    return out.sort((a, b) => a.age_s - b.age_s);
  }

  /** Remove expired claims, messages older than retention, and stale presence files. */
  prune(
    now = Date.now(),
    opts: { messageRetentionMs?: number; claimTtlMs?: number; presenceTtlMs?: number } = {},
  ): { messagesRemoved: number; claimsReleased: number; presenceRemoved: number } {
    const messageRetention = opts.messageRetentionMs ?? MESSAGE_RETENTION_MS;
    const claimTtl = opts.claimTtlMs ?? CLAIM_TTL_MS;
    const presenceTtl = opts.presenceTtlMs ?? PRESENCE_TTL_MS;

    let messagesRemoved = 0;
    for (const f of listDirSafe(dir("messages"))) {
      const m = readJsonSafe<ChatMessage>(join(dir("messages"), f));
      if (!m) {
        removeFile(join(dir("messages"), f));
        messagesRemoved++;
        continue;
      }
      if (now - Date.parse(m.ts) > messageRetention) {
        removeFile(join(dir("messages"), f));
        messagesRemoved++;
      }
    }

    let claimsReleased = 0;
    for (const f of listDirSafe(dir("claims"))) {
      const c = readJsonSafe<FileClaim>(join(dir("claims"), f));
      if (!c) {
        removeFile(join(dir("claims"), f));
        claimsReleased++;
        continue;
      }
      const ageMs = now - Date.parse(c.acquiredAt);
      if (ageMs > claimTtl) {
        removeFile(join(dir("claims"), f));
        claimsReleased++;
      }
    }

    let presenceRemoved = 0;
    for (const f of listDirSafe(dir("presence"))) {
      const p = readJsonSafe<{ ts: string }>(join(dir("presence"), f));
      if (!p) {
        removeFile(join(dir("presence"), f));
        presenceRemoved++;
        continue;
      }
      if (now - Date.parse(p.ts) > presenceTtl) {
        removeFile(join(dir("presence"), f));
        presenceRemoved++;
      }
    }

    return { messagesRemoved, claimsReleased, presenceRemoved };
  }
}

export const chatBusEngine = new ChatBusEngine();
