/**
 * slot-recovery-ms0-integration.test.ts — U-SR08 E2E
 *
 * SLOT-RECOVERY-MS0/U-SR08 (2026-05-25, slot:golf /loop iter9)
 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §14
 *
 * Validates that the writer-side .mjs helper (.claude/helpers/slot-session-
 * sidecar.mjs from U-SR02-04) and the reader-side TS engine
 * (SlotSessionHistoryEngine from U-SR01) agree on the wire schema:
 *
 *   1. Full session lifecycle: start → heartbeat → end produces a 3-entry
 *      JSONL that the engine reads back with identical field values. The
 *      writer is invoked as a node subprocess (matches the canonical hook
 *      invocation path, and sidesteps vitest's vite-based loader).
 *   2. Crash-recovery: starting a NEW session on a slot whose tail is NOT
 *      `session-end` triggers the engine's synthetic crash-inferred close
 *      for the prior session before recording the new start.
 *
 * Discipline (per U-SR01 conventions): every assertion checks a SPECIFIC
 * value, no toBeTruthy/toBeDefined/toBeNull/toBeUndefined, no synthetic
 * for-loops, no `as any`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  SlotSessionHistoryEngine,
  SCHEMA_VERSION,
  _resetSlotSessionHistoryEngineForTests,
  type SessionStartEvent,
  type HeartbeatEvent,
  type SessionEndEvent,
} from "../engines/SlotSessionHistoryEngine.js";

const SIDECAR_MJS = "H:/prism/.claude/helpers/slot-session-sidecar.mjs";

/**
 * Invoke the .mjs writer as a node subprocess. Uses `--input-type=module`
 * with an inline driver that dynamically imports the writer and calls the
 * named function with the provided argument object. Matches the runtime
 * invocation pattern the real SessionStart/heartbeat/Stop hooks use.
 */
function invokeWriter(
  fn: "recordSessionStart" | "recordHeartbeat" | "recordSessionEnd",
  arg: Record<string, unknown>,
  baseDir: string,
): unknown {
  const driver = `
    import { ${fn} } from "file:///${SIDECAR_MJS}";
    const r = ${fn}(${JSON.stringify(arg)});
    process.stdout.write(JSON.stringify(r));
  `;
  const out = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", driver],
    {
      env: {
        ...process.env,
        PRISM_SLOT_SESSION_BASE_DIR: baseDir,
        PRISM_SLOT_SESSION_SIDECAR_DISABLE: "0",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return JSON.parse(out);
}

let tmpBase: string;

beforeEach(() => {
  tmpBase = mkdtempSync(join(tmpdir(), "slot-recovery-e2e-"));
});

afterEach(() => {
  try { rmSync(tmpBase, { recursive: true, force: true }); } catch { /* tmp gc */ }
  _resetSlotSessionHistoryEngineForTests();
});

// ─── Test 1: Full session lifecycle round-trip ─────────────────────────────

describe("U-SR08 — Full session lifecycle (writer .mjs subprocess → reader TS engine)", () => {
  it("writes session-start → heartbeat → session-end via subprocess; TS engine reads all 3 entries with matching fields", () => {
    const slot = "alpha";
    const sessionId = "claude-e2e-sr08-lifecycle";
    const chatId = "stable-chat-e2e-1";

    const r1 = invokeWriter(
      "recordSessionStart",
      { slot, sessionId, chatId, branch: "cad-fusion-live-ms0", topic: "slot-recovery-ms0", directive: "/loop /goal" },
      tmpBase,
    ) as { ok: boolean; crashInferred?: boolean };
    expect(r1.ok).toBe(true);

    const r2 = invokeWriter(
      "recordHeartbeat",
      { slot, sessionId, directive: "/loop /goal", currentGoal: "ship U-SR08", loopIter: 9, loopTarget: 17 },
      tmpBase,
    ) as { ok: boolean };
    expect(r2.ok).toBe(true);

    const r3 = invokeWriter(
      "recordSessionEnd",
      { slot, sessionId, exitState: "clean", directive: "/loop /goal", finalResume: "U-SR08 E2E shipped", loopIter: 9, loopTarget: 17 },
      tmpBase,
    ) as { ok: boolean };
    expect(r3.ok).toBe(true);

    // Reader: TS engine reads back via the same baseDir
    const engine = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 30 });
    const entries = engine.readAll(slot);

    expect(entries.length).toBe(3);
    expect(entries[0].eventType).toBe("session-start");
    expect(entries[1].eventType).toBe("heartbeat");
    expect(entries[2].eventType).toBe("session-end");

    // Wire-schema agreement: each entry has SCHEMA_VERSION, matching slot, matching sessionId
    expect(entries[0].schemaVersion).toBe(SCHEMA_VERSION);
    expect(entries[1].schemaVersion).toBe(SCHEMA_VERSION);
    expect(entries[2].schemaVersion).toBe(SCHEMA_VERSION);
    expect(entries[0].slot).toBe(slot);
    expect(entries[1].slot).toBe(slot);
    expect(entries[2].slot).toBe(slot);
    expect(entries[0].sessionId).toBe(sessionId);
    expect(entries[1].sessionId).toBe(sessionId);
    expect(entries[2].sessionId).toBe(sessionId);

    const start = entries[0] as SessionStartEvent;
    expect(start.chatId).toBe(chatId);
    expect(start.branch).toBe("cad-fusion-live-ms0");
    expect(start.topic).toBe("slot-recovery-ms0");
    expect(start.directive).toBe("/loop /goal");

    const heartbeat = entries[1] as HeartbeatEvent;
    expect(heartbeat.directive).toBe("/loop /goal");
    expect(heartbeat.currentGoal).toBe("ship U-SR08");
    expect(heartbeat.loopIter).toBe(9);
    expect(heartbeat.loopTarget).toBe(17);
    expect(heartbeat.exitState).toBe("running");

    const end = entries[2] as SessionEndEvent;
    expect(end.exitState).toBe("clean");
    expect(end.finalResume).toBe("U-SR08 E2E shipped");
    expect(end.loopIter).toBe(9);
    expect(end.loopTarget).toBe(17);

    // Physical file lands at the expected path
    const expectedFile = join(tmpBase, `${slot}.jsonl`);
    expect(existsSync(expectedFile)).toBe(true);
    const raw = readFileSync(expectedFile, "utf8");
    const lines = raw.split("\n").filter(l => l.length > 0);
    expect(lines.length).toBe(3);
  });
});

// ─── Test 2: Crash-recovery (synthetic crash-inferred close) ───────────────

describe("U-SR08 — Crash-recovery (synthetic crash-inferred close)", () => {
  it("new sessionId on a slot whose tail is heartbeat (no clean end) triggers crash-inferred close for the prior session", () => {
    const slot = "bravo";
    const priorSid = "claude-e2e-sr08-prior-crashed";
    const newSid = "claude-e2e-sr08-new-after-crash";
    const chatId = "stable-chat-e2e-2";

    // Prior session writes start + heartbeat via subprocess, then "crashes"
    expect((invokeWriter("recordSessionStart", { slot, sessionId: priorSid, chatId, directive: "earlier-work" }, tmpBase) as { ok: boolean }).ok).toBe(true);
    expect((invokeWriter("recordHeartbeat", { slot, sessionId: priorSid, directive: "earlier-work", loopIter: 4, loopTarget: 12 }, tmpBase) as { ok: boolean }).ok).toBe(true);

    // New session arrives — engine should detect the dirty tail and write
    // a synthetic crash-inferred close BEFORE recording the new start.
    // The engine's recordSessionStart() is the canonical invocation point
    // (the SessionStart hook calls it via the .mjs writer's recordSessionStart,
    // which delegates the crash-inferred logic to the engine on next read).
    // For this E2E we exercise the engine directly.
    const engine = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 30 });
    const startResult = engine.recordSessionStart({ slot, sessionId: newSid, chatId, directive: "new-work" });
    expect(startResult.ok).toBe(true);
    if (startResult.ok) {
      expect(startResult.crashInferred).toBe(true);
    }

    const entries = engine.readAll(slot);
    expect(entries.length).toBe(4);
    expect(entries[0].eventType).toBe("session-start");
    expect(entries[0].sessionId).toBe(priorSid);
    expect(entries[1].eventType).toBe("heartbeat");
    expect(entries[1].sessionId).toBe(priorSid);

    const syntheticClose = entries[2] as SessionEndEvent;
    expect(syntheticClose.eventType).toBe("session-end");
    expect(syntheticClose.sessionId).toBe(priorSid);
    expect(syntheticClose.exitState).toBe("crash-inferred");
    expect(syntheticClose.directive).toBe("earlier-work");

    expect(entries[3].eventType).toBe("session-start");
    expect(entries[3].sessionId).toBe(newSid);
  });

  it("new sessionId arriving on an already-clean slot does NOT write a synthetic crash-inferred close", () => {
    const slot = "charlie";
    const priorSid = "claude-e2e-sr08-prior-clean";
    const newSid = "claude-e2e-sr08-fresh";
    const chatId = "stable-chat-e2e-3";

    expect((invokeWriter("recordSessionStart", { slot, sessionId: priorSid, chatId }, tmpBase) as { ok: boolean }).ok).toBe(true);
    expect((invokeWriter("recordSessionEnd", { slot, sessionId: priorSid, exitState: "clean" }, tmpBase) as { ok: boolean }).ok).toBe(true);

    const engine = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 30 });
    const r = engine.recordSessionStart({ slot, sessionId: newSid, chatId });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.crashInferred).toBe(false);
    }

    const entries = engine.readAll(slot);
    expect(entries.length).toBe(3);
    expect(entries[0].sessionId).toBe(priorSid);
    expect(entries[1].eventType).toBe("session-end");
    expect((entries[1] as SessionEndEvent).exitState).toBe("clean");
    expect(entries[2].sessionId).toBe(newSid);
  });

  it("duplicate session-start with SAME sessionId does NOT trigger crash-inferred close (hook re-fire safety)", () => {
    const slot = "delta";
    const sid = "claude-e2e-sr08-rerun";
    const chatId = "stable-chat-e2e-4";

    expect((invokeWriter("recordSessionStart", { slot, sessionId: sid, chatId }, tmpBase) as { ok: boolean }).ok).toBe(true);
    expect((invokeWriter("recordHeartbeat", { slot, sessionId: sid }, tmpBase) as { ok: boolean }).ok).toBe(true);

    const engine = new SlotSessionHistoryEngine({ baseDir: tmpBase, retention: 30 });
    const r = engine.recordSessionStart({ slot, sessionId: sid, chatId });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.crashInferred).toBe(false);
    }

    const entries = engine.readAll(slot);
    expect(entries.length).toBe(3);
    const crashClose = entries.find(e =>
      e.eventType === "session-end"
      && (e as SessionEndEvent).exitState === "crash-inferred",
    );
    expect(crashClose).toBe(undefined);
  });
});
