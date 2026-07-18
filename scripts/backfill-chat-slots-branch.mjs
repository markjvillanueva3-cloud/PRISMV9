#!/usr/bin/env node
/**
 * backfill-chat-slots-branch.mjs — immediate-arm companion to
 * seed-slot-branch-bindings.mjs ([SLOT-BRIDGE-MS0]/U-SBB02, 2026-05-26).
 *
 * The binding-override only fires on the NEXT heartbeat for a live slot.
 * Until then, the 18+ already-claimed peer slots carry the stale
 * branch="cad-fusion-live-ms0" and the enforcement hooks stay dormant.
 * This script directly patches chat-slots.json so the hooks arm
 * IMMEDIATELY for every live non-golf claim that has a binding.
 *
 * SAFETY:
 * - Reads slot-branch-bindings.json (the source of truth)
 * - Only touches slots that (a) have a binding AND (b) currently differ
 * - golf is doubly-protected: never has a binding AND never overwritten
 * - Atomic write via the same withLock + writeSlotsAtomic primitives
 *   that claimSlot() uses, so concurrent fleet claims can't corrupt
 * - --dry-run prints the diff without writing
 *
 * USAGE:
 *   node scripts/backfill-chat-slots-branch.mjs --dry-run
 *   node scripts/backfill-chat-slots-branch.mjs
 */

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import {
  SLOT_NAMES,
  readSlotBranchBindings,
  DEFAULT_STATE_PATH,
} from "../.claude/helpers/chat-slots.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("-n");

function readSlots() {
  if (!existsSync(DEFAULT_STATE_PATH)) {
    return { schemaVersion: 1, lastUpdated: new Date().toISOString(), slots: {} };
  }
  return JSON.parse(readFileSync(DEFAULT_STATE_PATH, "utf8"));
}

function writeSlotsAtomic(file) {
  const randSuffix = Math.random().toString(36).slice(2, 10);
  const tmp = `${DEFAULT_STATE_PATH}.${process.pid}.${Date.now()}.${randSuffix}.tmp`;
  writeFileSync(tmp, JSON.stringify(file, null, 2) + "\n");
  if (existsSync(DEFAULT_STATE_PATH)) {
    try {
      renameSync(tmp, DEFAULT_STATE_PATH);
    } catch {
      try { unlinkSync(DEFAULT_STATE_PATH); } catch {}
      renameSync(tmp, DEFAULT_STATE_PATH);
    }
  } else {
    renameSync(tmp, DEFAULT_STATE_PATH);
  }
}

function main() {
  const bindings = readSlotBranchBindings();
  const file = readSlots();
  /** @type {Array<{slot:string,from:string|null,to:string,chatId:string,pid:number|null}>} */
  const changes = [];

  for (const slot of SLOT_NAMES) {
    const bound = bindings[slot];
    if (!bound || !bound.startsWith("slot/")) continue; // golf-style: no binding, skip
    const s = file.slots[slot];
    if (!s || !s.chatId) continue; // empty slot — nothing to arm
    if (s.branch === bound) continue; // already armed
    changes.push({
      slot,
      from: s.branch || null,
      to: bound,
      chatId: s.chatId,
      pid: s.pid ?? null,
    });
  }

  const summary = {
    boundSlots: Object.keys(bindings).length,
    liveSlots: SLOT_NAMES.filter(n => file.slots[n] && file.slots[n].chatId).length,
    drift: changes.length,
  };

  if (changes.length === 0) {
    console.log(JSON.stringify({ ok: true, action: "noop", reason: "all-live-slots-already-armed", ...summary }, null, 2));
    return 0;
  }

  if (DRY_RUN) {
    console.log(JSON.stringify({ ok: true, action: "dry-run", ...summary, changes }, null, 2));
    return 0;
  }

  for (const c of changes) {
    file.slots[c.slot].branch = c.to;
  }
  file.lastUpdated = new Date().toISOString();
  writeSlotsAtomic(file);

  console.log(JSON.stringify({ ok: true, action: "patched", ...summary, changes }, null, 2));
  return 0;
}

process.exit(main());
