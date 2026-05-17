#!/usr/bin/env node
/**
 * slot-identity-cache.mjs — sticky chatId→slot persistence for /compact recovery.
 *
 * SLOT-DRIFT-FIX-MS0/U-SDF13 (2026-05-17): the load-bearing claim that the
 * /compact slot-pin recovery rests on is "the chatId knows its slot." But
 * that knowledge was sourced from `chat-slots.json`, which is EPHEMERAL:
 * the slot binding can be wiped by heartbeat expiry, peer force-takeover,
 * or `reclaim()` BEFORE the precompact handoff writer reads it. When that
 * happens, the writer logs "(precompact auto-write — slot unbound)", omits
 * the `slot:` frontmatter field, and writes a topicless filename. The next
 * session's `session-start-terminal-pin.mjs` then has nothing to recover
 * from — all three of U-SDF05's fallbacks (slot field, topic prefix,
 * filename prefix) return UNKNOWN — and the chat lands in a random slot.
 *
 * Observed live 2026-05-17: chatId `claude-339c8ff7` drifted bravo → bravo →
 * charlie → delta → unbound across its handoff history with the SAME chatId.
 * The drift was deterministically traced to precompact reads of chat-slots
 * occurring when the slot had already lapsed.
 *
 * The fix is to add a SECOND, sticky source of truth keyed by chatId that
 * persists past the lifetime of any single slot binding. This file is that
 * source. Writes happen on every successful claim (recordSlotForChat); reads
 * happen as the final fallback in the precompact writer and the post-/compact
 * pin. Eviction never touches this cache — only an explicit slot CHANGE for
 * the same chatId does (legitimate /checkin-<other>).
 *
 * Storage: one tiny JSON file per chatId under state/shared/chat-slot-history/.
 * Atomic via tmp+rename. Schema {slot, recordedAt, host}. Forward-compat: any
 * additional keys are preserved on re-write.
 *
 * Pure-core export shape (testable without filesystem):
 *   - encodeRecord({slot, recordedAt, host}) → string
 *   - decodeRecord(s) → {slot, recordedAt, host} | null
 *   - validSlot(slot, allowedSlots) → boolean
 *
 * Filesystem export shape (side-effecty):
 *   - recordSlotForChat(chatId, slot, opts?) → {ok, file?}
 *   - lastKnownSlotForChat(chatId, opts?) → string | null
 *   - clearSlotForChat(chatId, opts?) → {ok}
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { hostname } from "node:os";

const DEFAULT_CACHE_DIR = "H:/prism/state/shared/chat-slot-history";

const CHATID_RE = /^[A-Za-z0-9_.-]{1,128}$/;

export function isValidChatId(chatId) {
  return typeof chatId === "string" && CHATID_RE.test(chatId);
}

export function validSlot(slot, allowedSlots) {
  if (typeof slot !== "string" || slot.length === 0) return false;
  if (!Array.isArray(allowedSlots) || allowedSlots.length === 0) return false;
  return allowedSlots.includes(slot);
}

export function encodeRecord(rec) {
  if (!rec || typeof rec.slot !== "string") return "{}";
  const out = {
    slot: rec.slot,
    recordedAt: rec.recordedAt || new Date().toISOString(),
    host: rec.host || hostname(),
  };
  return JSON.stringify(out);
}

export function decodeRecord(raw) {
  if (typeof raw !== "string" || raw.length === 0) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.slot !== "string" || parsed.slot.length === 0) return null;
  return {
    slot: parsed.slot,
    recordedAt: typeof parsed.recordedAt === "string" ? parsed.recordedAt : "",
    host: typeof parsed.host === "string" ? parsed.host : "",
  };
}

function cacheFileFor(chatId, opts) {
  const dir = (opts && opts.cacheDir) || process.env.PRISM_SLOT_CACHE_DIR || DEFAULT_CACHE_DIR;
  return { dir, file: join(dir, `${chatId}.json`) };
}

export function recordSlotForChat(chatId, slot, opts) {
  if (!isValidChatId(chatId)) return { ok: false, error: "invalid_chatId" };
  if (typeof slot !== "string" || slot.length === 0) return { ok: false, error: "invalid_slot" };
  const { dir, file } = cacheFileFor(chatId, opts);
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const payload = encodeRecord({
      slot,
      recordedAt: new Date().toISOString(),
      host: (opts && opts.host) || hostname(),
    });
    const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, payload, "utf-8");
    renameSync(tmp, file);
    return { ok: true, file };
  } catch (err) {
    return { ok: false, error: "write_failed", message: String(err && err.message || err) };
  }
}

export function lastKnownSlotForChat(chatId, opts) {
  if (!isValidChatId(chatId)) return null;
  const { file } = cacheFileFor(chatId, opts);
  if (!existsSync(file)) return null;
  let raw;
  try { raw = readFileSync(file, "utf-8"); } catch { return null; }
  const decoded = decodeRecord(raw);
  if (!decoded) return null;
  return decoded.slot;
}

export function clearSlotForChat(chatId, opts) {
  if (!isValidChatId(chatId)) return { ok: false, error: "invalid_chatId" };
  const { file } = cacheFileFor(chatId, opts);
  if (!existsSync(file)) return { ok: true, removed: false };
  try {
    unlinkSync(file);
    return { ok: true, removed: true };
  } catch (err) {
    return { ok: false, error: "unlink_failed", message: String(err && err.message || err) };
  }
}
