#!/usr/bin/env node
// tier: T3
// stop-hook-aggregator.mjs — Stop hook (T3, non-blocking)
//
// U-STOP-HOOK-AGGREGATOR (H8 of SYSTEM-SYNERGY-AUDIT-2026-05-09, slot echo).
//
// Appends one structured line per Stop event to a shared session ledger:
//   state/shared/stop-hook-ledger.jsonl
//
// Captures observable session-end state (sessionId, slot, branch, topic,
// dirty/staged/untracked file counts, commits-last-hour, stop_hook_active).
// Feeds downstream audit + forge tooling that needs a time-series of
// session exits without trawling per-chat transcripts.
//
// HONEST SCOPE (R12): a Stop subprocess cannot read sibling Stop hooks'
// exit codes — they run independently. This is OBSERVATIONAL only.
// The original synergy-audit prose proposed "PASS/FAIL per hook"; that
// framing was unimplementable. This hook records what IS visible: git
// state + slot binding + transcript metadata.
//
// Always exit 0 (advisory). Never blocks. Per-session throttle (default 60s).
//
// Knobs:
//   PRISM_STOP_HOOK_AGGREGATOR_DISABLE=1   — off entirely
//   PRISM_STOP_HOOK_AGGREGATOR_THROTTLE_MS=N — throttle ms (default 60000)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildLedgerEntry,
  serializeLedgerLine,
  parseGitStatusPorcelainZ,
  parseCommitsLastHour,
  shouldThrottle,
  readLastEntryAtMs,
} from "../../scripts/lib/stop-hook-aggregator-lib.mjs";

const REPO_ROOT = "H:/prism";
const LEDGER_PATH = path.join(REPO_ROOT, "state", "shared", "stop-hook-ledger.jsonl");
const SLOTS_FILE = path.join(REPO_ROOT, "state", "shared", "chat-slots.json");
const GIT_TIMEOUT_MS = 4000;
const LEDGER_TAIL_BYTES = 16_384;
const COMMITS_LOG_LIMIT = 32;
const SILENCE = { continue: true, suppressOutput: true };

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

function emit(o) {
  process.stdout.write(JSON.stringify(o));
}

function findSlotInfo(sessionId) {
  if (!sessionId) return null;
  try {
    const j = JSON.parse(fs.readFileSync(SLOTS_FILE, "utf8"));
    const slots = j?.slots || {};
    const derivedChatId = "claude-" + String(sessionId).slice(0, 8);
    for (const [slotName, state] of Object.entries(slots)) {
      if (!state || typeof state !== "object") continue;
      if (state.chatId === derivedChatId) {
        return {
          slot: slotName,
          chatId: state.chatId,
          branch: state.branch || null,
          topic: state.topic || null,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function runGit(args) {
  const r = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (r.error || r.status !== 0) return null;
  return r.stdout;
}

function readGitStatus(nowMs) {
  const z = runGit(["status", "--porcelain=v1", "-z"]);
  const status = parseGitStatusPorcelainZ(z || "");
  const log = runGit(["log", `-${COMMITS_LOG_LIMIT}`, "--format=%ct"]);
  const commitsLastHour = parseCommitsLastHour(log || "", nowMs);
  return { ...status, commitsLastHour };
}

function readLedgerTail() {
  try {
    const st = fs.statSync(LEDGER_PATH);
    if (st.size <= LEDGER_TAIL_BYTES) {
      return fs.readFileSync(LEDGER_PATH, "utf8");
    }
    const fd = fs.openSync(LEDGER_PATH, "r");
    try {
      const buf = Buffer.alloc(LEDGER_TAIL_BYTES);
      fs.readSync(fd, buf, 0, LEDGER_TAIL_BYTES, st.size - LEDGER_TAIL_BYTES);
      return buf.toString("utf8");
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

function appendLedger(line) {
  try {
    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
    fs.appendFileSync(LEDGER_PATH, line);
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (process.env.PRISM_STOP_HOOK_AGGREGATOR_DISABLE === "1") {
    emit(SILENCE);
    return;
  }

  const stopEvent = readStdin() || {};
  const sessionId = stopEvent.session_id || null;
  const nowMs = Date.now();

  const throttleMs = Number(process.env.PRISM_STOP_HOOK_AGGREGATOR_THROTTLE_MS) || 60_000;
  if (sessionId) {
    const lastText = readLedgerTail();
    const lastEntryAtMs = readLastEntryAtMs(lastText, sessionId);
    if (shouldThrottle({ sessionId, lastEntryAtMs, nowMs, throttleMs })) {
      emit(SILENCE);
      return;
    }
  }

  const slotInfo = findSlotInfo(sessionId);
  const gitStatus = readGitStatus(nowMs);
  const entry = buildLedgerEntry({ stopEvent, slotInfo, gitStatus, nowMs });

  let line;
  try {
    line = serializeLedgerLine(entry);
  } catch {
    emit(SILENCE);
    return;
  }

  appendLedger(line);
  emit(SILENCE);
}

main();
