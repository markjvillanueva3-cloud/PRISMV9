// SLOT-DRIFT-FIX-MS0/U-SDF03 — transcript-mtime liveness gate tests
// Run: node --test H:/prism/.claude/helpers/chat-slots-transcript-gate.test.mjs
//
// User-reported 2026-05-17 (slot bravo claude-339c8ff7, post-U-SDF02 follow-up):
//   "chats still aren't staying locked into their chat slots"
//
// Root cause discovery: U-SDF02 protected slots whose twid was tier-2/3
// (`tw-pa-*` / `tw-ps-*`), but live audit of the production cache found
// **every active chat stuck at tier-1** (`tw-pp-*`) because the PowerShell
// ancestry walk in `terminal-window-id.mjs` cannot reach claude.exe from
// inside a Claude Bash subprocess — the bash chain dies at a transient
// PID that's no longer in the WMI process table by the time we query.
// Both sequential walks AND atomic-snapshot walks fail — verified live.
//
// U-SDF03 fix: PROCESS-TREE-INDEPENDENT liveness signal — Claude's own
// transcript file `<homedir>/.claude/projects/H--prism/<session-id>.jsonl`.
// claude.exe writes to it on every message/tool-call/compact step, so its
// mtime is a direct signal of "the harness is alive and the chat is
// active". No process tree walking required.
//
// These tests verify: the resolver finds the right file, the freshness
// gate honors the threshold, the env knob disables it, the gate prefers
// transcript-fresh over twid liveness, and the gate falls through to
// U-SDF02 twid logic when transcript is missing.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  claudeProjectsDir,
  findTranscriptFile,
  transcriptAgeMs,
  isTranscriptFresh,
  isWindowAlive,
} from "./chat-slots.mjs";
import { hostname } from "node:os";
import { writeFileSync, mkdirSync, existsSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const HOST = hostname();
const ALIVE_PID = process.pid; // this test process — guaranteed alive
const DEAD_PID = 999999;

// Stand up a sandboxed projects directory so tests don't depend on the
// real production transcripts (and don't pollute them). Honored via
// PRISM_SLOT_TRANSCRIPT_BASE for the duration of the test run.
const SANDBOX = join(tmpdir(), `prism-sdf03-test-${process.pid}-${Date.now()}`);
mkdirSync(SANDBOX, { recursive: true });
const REAL_BASE_ENV = process.env.PRISM_SLOT_TRANSCRIPT_BASE;
process.env.PRISM_SLOT_TRANSCRIPT_BASE = SANDBOX;

function writeTranscript(uuidLike, ageMs = 0) {
  const filename = uuidLike + ".jsonl";
  const fpath = join(SANDBOX, filename);
  writeFileSync(fpath, '{"type":"user"}\n');
  if (ageMs > 0) {
    const mtimeS = (Date.now() - ageMs) / 1000;
    utimesSync(fpath, mtimeS, mtimeS);
  }
  return fpath;
}

// ─── claudeProjectsDir ──────────────────────────────────────────────────────

test("claudeProjectsDir: honors PRISM_SLOT_TRANSCRIPT_BASE override", () => {
  assert.equal(claudeProjectsDir(), SANDBOX);
});

test("claudeProjectsDir: defaults to homedir/.claude/projects/H--prism when no override", () => {
  delete process.env.PRISM_SLOT_TRANSCRIPT_BASE;
  const dir = claudeProjectsDir();
  assert.match(dir, /\.claude\/projects\/H--prism$/i);
  // Restore
  process.env.PRISM_SLOT_TRANSCRIPT_BASE = SANDBOX;
});

// ─── findTranscriptFile ─────────────────────────────────────────────────────

test("findTranscriptFile: matches 8-char chatId prefix to full-UUID filename", () => {
  writeTranscript("339c8ff7-73f9-4ab2-9d68-2e10d32f5267");
  const found = findTranscriptFile("claude-339c8ff7");
  assert.ok(found);
  assert.ok(found.endsWith("339c8ff7-73f9-4ab2-9d68-2e10d32f5267.jsonl"));
});

test("findTranscriptFile: returns null for malformed chatId", () => {
  assert.equal(findTranscriptFile(""), null);
  assert.equal(findTranscriptFile("not-a-chat-id"), null);
  assert.equal(findTranscriptFile("claude-"), null);
  assert.equal(findTranscriptFile("claude-NOTHEX!!"), null);
  assert.equal(findTranscriptFile(null), null);
  assert.equal(findTranscriptFile(undefined), null);
  assert.equal(findTranscriptFile(12345), null);
});

test("findTranscriptFile: returns null when no transcript matches prefix", () => {
  assert.equal(findTranscriptFile("claude-deadbeef"), null);
});

test("findTranscriptFile: case-insensitive prefix matching", () => {
  writeTranscript("aabbccdd-1234-5678-90ab-cdef00112233");
  assert.ok(findTranscriptFile("claude-AABBCCDD"));
  assert.ok(findTranscriptFile("claude-aabbccdd"));
});

// ─── transcriptAgeMs ────────────────────────────────────────────────────────

test("transcriptAgeMs: returns fresh age for just-written transcript", () => {
  writeTranscript("11112222-3333-4444-5555-666677778888");
  const age = transcriptAgeMs("claude-11112222");
  assert.ok(age !== null);
  assert.ok(age >= 0 && age < 5000, `age=${age} should be <5s`);
});

test("transcriptAgeMs: returns null when no transcript", () => {
  assert.equal(transcriptAgeMs("claude-feedbeef"), null);
});

test("transcriptAgeMs: returns stale age for backdated transcript", () => {
  writeTranscript("22223333-4444-5555-6666-777788889999", 10 * 60 * 1000); // 10 min ago
  const age = transcriptAgeMs("claude-22223333");
  assert.ok(age >= 9 * 60 * 1000 && age <= 11 * 60 * 1000,
    `age=${age} should be ~10 min`);
});

// ─── isTranscriptFresh (env-knob wrapper) ───────────────────────────────────

test("isTranscriptFresh: true for transcript within default 4-hour window", () => {
  writeTranscript("33334444-5555-6666-7777-888899990000");
  assert.equal(isTranscriptFresh("claude-33334444"), true);
});

test("U-SDF04 (the permanent fix): 1-hour-old transcript STILL FRESH under default threshold", () => {
  // U-SDF03 default was 5 min — a 1h-old transcript would have been
  // classified as stale, the slot would have been reclaimable, and
  // any moderate AFK / long Agent run would lose its slot. U-SDF04
  // raises the default to 4 hours; 1h is well within range.
  writeTranscript("aaaa0001-bbbb-cccc-dddd-eeee00010001", 60 * 60 * 1000); // 1h ago
  assert.equal(isTranscriptFresh("claude-aaaa0001"), true,
    "1h-old transcript MUST stay protected — closes 'lost slot after coffee break' bug class");
});

test("U-SDF04: 3-hour-old transcript still fresh (covers half a workday-meeting)", () => {
  writeTranscript("aaaa0002-bbbb-cccc-dddd-eeee00020002", 3 * 60 * 60 * 1000);
  assert.equal(isTranscriptFresh("claude-aaaa0002"), true);
});

test("U-SDF04: 5-hour-old transcript IS stale (genuinely abandoned > 4h)", () => {
  writeTranscript("aaaa0003-bbbb-cccc-dddd-eeee00030003", 5 * 60 * 60 * 1000);
  assert.equal(isTranscriptFresh("claude-aaaa0003"), false,
    "5h-old transcript exceeds 4h default — slot becomes reclaimable (correct semantics for truly abandoned chats)");
});

test("isTranscriptFresh: false for transcript older than threshold", () => {
  writeTranscript("44445555-6666-7777-8888-999900001111", 5 * 60 * 60 * 1000);
  assert.equal(isTranscriptFresh("claude-44445555"), false,
    "5h-old transcript exceeds default 4h threshold");
});

test("isTranscriptFresh: respects PRISM_SLOT_TRANSCRIPT_FRESH_MS override", () => {
  writeTranscript("55556666-7777-8888-9999-000011112222", 30 * 1000); // 30s ago
  // Default threshold 5 min — fresh
  delete process.env.PRISM_SLOT_TRANSCRIPT_FRESH_MS;
  assert.equal(isTranscriptFresh("claude-55556666"), true);
  // Tightened threshold 10s — stale
  process.env.PRISM_SLOT_TRANSCRIPT_FRESH_MS = "10000";
  assert.equal(isTranscriptFresh("claude-55556666"), false);
  // Loosened threshold 1h — fresh again
  process.env.PRISM_SLOT_TRANSCRIPT_FRESH_MS = String(60 * 60 * 1000);
  assert.equal(isTranscriptFresh("claude-55556666"), true);
  delete process.env.PRISM_SLOT_TRANSCRIPT_FRESH_MS;
});

test("isTranscriptFresh: returns false when PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE=1", () => {
  writeTranscript("66667777-8888-9999-0000-111122223333");
  // Default: fresh
  assert.equal(isTranscriptFresh("claude-66667777"), true);
  // Knob disables
  process.env.PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE = "1";
  assert.equal(isTranscriptFresh("claude-66667777"), false,
    "disable knob must force fallback to pre-U-SDF03 behavior");
  delete process.env.PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE;
});

test("isTranscriptFresh: only literal '1' disables, not '0' or 'true'", () => {
  writeTranscript("77778888-9999-0000-1111-222233334444");
  process.env.PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE = "0";
  assert.equal(isTranscriptFresh("claude-77778888"), true, "knob='0' must NOT disable");
  process.env.PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE = "true";
  assert.equal(isTranscriptFresh("claude-77778888"), true, "knob='true' must NOT disable (only literal '1')");
  delete process.env.PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE;
});

// ─── isWindowAlive — the load-bearing gate ──────────────────────────────────

test("isWindowAlive: PRIMARY transcript signal — fresh transcript + tier-1 twid → TRUE (the production-bug fix)", () => {
  // This is the EXACT scenario the user reported: a chat whose twid resolved
  // to tier-1 garbage (the resolver fell through because the bash chain
  // can't reach claude.exe). Pre-U-SDF03, extractWindowPid refused tier-1
  // and the gate returned false, allowing peer reclaim. With transcript
  // freshness as the primary signal, this case correctly returns TRUE
  // and protects the slot from reclaim.
  writeTranscript("88889999-aaaa-bbbb-cccc-ddddeeeeffff");
  const slot = {
    chatId: "claude-88889999",
    host: HOST,
    terminalWindowId: `tw-pp-${DEAD_PID}`, // tier-1, dead PID — pre-fix would FAIL
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), true,
    "U-SDF03 must protect this slot — transcript-fresh trumps tier-1-twid trap");
});

test("isWindowAlive: NO transcript + tier-2 alive twid → TRUE (U-SDF02 fallback preserved)", () => {
  // Legacy slot path: transcript can't be matched (chatId doesn't follow
  // claude-<8hex> format, or the projects dir is missing), but the slot
  // has a stable tier-2 twid. U-SDF02 fallback must still work.
  const slot = {
    chatId: "codex-other-format",          // can't extract 8hex prefix
    host: HOST,
    terminalWindowId: `tw-pa-${ALIVE_PID}`, // tier 2 — stable
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), true,
    "U-SDF02 tier-2 twid fallback must still protect codex / non-Claude harness slots");
});

test("isWindowAlive: NO transcript + tier-1 twid → FALSE (still genuinely dead)", () => {
  // No transcript AND no usable twid PID — slot has no signal of life.
  // Correctly classified as reclaimable (no regression vs U-SDF02).
  const slot = {
    chatId: "claude-99990000",            // no transcript exists
    host: HOST,
    terminalWindowId: `tw-pp-${ALIVE_PID}`, // tier-1, refused regardless
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false);
});

test("isWindowAlive: NO transcript + tier-2 dead twid → FALSE (correct release)", () => {
  const slot = {
    chatId: "claude-00001111",
    host: HOST,
    terminalWindowId: `tw-pa-${DEAD_PID}`,
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false);
});

test("isWindowAlive: stale transcript + tier-2 alive twid → TRUE (twid fallback covers)", () => {
  // Edge case: chat went idle long enough that transcript is stale, but
  // PowerShell window is still open AND we DID manage to resolve a tier-2
  // twid earlier. Twid fallback still applies. Conservative — protects
  // genuinely-open windows from over-eager reclaim.
  writeTranscript("aaaa1111-bbbb-2222-cccc-3333dddd4444", 30 * 60 * 1000); // 30 min ago
  const slot = {
    chatId: "claude-aaaa1111",
    host: HOST,
    terminalWindowId: `tw-pa-${ALIVE_PID}`, // tier 2 — stable, falls back
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), true,
    "stale-transcript chat with alive tier-2 twid is still protected");
});

test("isWindowAlive: cross-host slot → FALSE (cannot stat peer's transcripts)", () => {
  writeTranscript("bbbb2222-cccc-3333-dddd-4444eeee5555");
  const slot = {
    chatId: "claude-bbbb2222",
    host: "OTHER-MACHINE",                 // not our host
    terminalWindowId: `tw-pa-${ALIVE_PID}`, // would otherwise protect
    lastHeartbeat: new Date(Date.now() - 999999).toISOString(),
  };
  assert.equal(isWindowAlive(slot), false,
    "cross-host slot can't be probed (no shared FS access guarantee)");
});

test("isWindowAlive: null / undefined slot → FALSE (defensive)", () => {
  assert.equal(isWindowAlive(null), false);
  assert.equal(isWindowAlive(undefined), false);
});

// ─── E2E: full reclaim-sweep scenario ───────────────────────────────────────

test("E2E: actively-writing chat (transcript=3s, twid=tier-1) survives heartbeat-crashed classification", async () => {
  // Reproduce the EXACT user-reported scenario:
  // - Chat is mid-/compact, heartbeat aged past CRASH_TTL_MS
  // - Twid is tier-1 (production reality — resolver couldn't reach claude.exe)
  // - But transcript mtime is fresh because claude.exe is writing /compact
  //   summary to it
  // Pre-U-SDF03: gate returned false, peer chat reclaimed the slot.
  // U-SDF03: gate returns true, slot is protected.
  const { classifySlot } = await import("./chat-slots.mjs");
  writeTranscript("cccc3333-dddd-4444-eeee-5555ffff6666"); // mtime now
  const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  const slot = {
    chatId: "claude-cccc3333",
    host: HOST,
    pid: 12345,
    terminalWindowId: `tw-pp-${DEAD_PID}`, // tier-1 garbage (production reality)
    lastHeartbeat: tenMinutesAgo,
    branch: null, topic: null, activity: "idle",
    claimedAt: tenMinutesAgo,
  };
  // Pure-heartbeat classifier would release this slot:
  assert.equal(classifySlot(slot), "crashed");
  // U-SDF03 saves it via transcript-fresh signal:
  assert.equal(isWindowAlive(slot), true,
    "transcript-fresh chat must survive reclaim — closes user-reported bug");
});

test("E2E: chat with stale transcript (window closed > 4h ago) DOES get reclaimed", async () => {
  const { classifySlot } = await import("./chat-slots.mjs");
  // U-SDF04: 30-min staleness no longer triggers reclaim (covers AFK).
  // The transcript must be older than the 4-hour default threshold for
  // a "genuinely abandoned" classification.
  writeTranscript("dddd4444-eeee-5555-ffff-6666aaaa7777", 5 * 60 * 60 * 1000); // 5h old
  const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  const slot = {
    chatId: "claude-dddd4444",
    host: HOST,
    pid: 12345,
    terminalWindowId: `tw-pp-${DEAD_PID}`,
    lastHeartbeat: tenMinutesAgo,
    claimedAt: tenMinutesAgo,
  };
  assert.equal(classifySlot(slot), "crashed");
  assert.equal(isWindowAlive(slot), false,
    "30-min-stale transcript chat is genuinely dead — must be reclaimable");
});

// ─── Cleanup ────────────────────────────────────────────────────────────────

test("cleanup sandbox + restore env", () => {
  if (existsSync(SANDBOX)) rmSync(SANDBOX, { recursive: true, force: true });
  if (REAL_BASE_ENV === undefined) delete process.env.PRISM_SLOT_TRANSCRIPT_BASE;
  else process.env.PRISM_SLOT_TRANSCRIPT_BASE = REAL_BASE_ENV;
});
