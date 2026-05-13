/**
 * chatSlotsGolfLiveness.test.ts — verifies U-CLEANUP-B8-CONSOLIDATED
 *
 * Exercises the `getGolfLiveness()` export in
 *   H:/prism/.claude/helpers/chat-slots.mjs
 *
 * Background: R3-UU2 (CLEANUP-MS0) dropped the dedicated golf-heartbeat.json
 * file in favor of reusing the lastHeartbeat already maintained in
 * chat-slots.json. U-CLEANUP-B8-CONSOLIDATED exposes the canonical liveness
 * check so audit crons / dashboards / hooks don't re-implement the math.
 *
 * Note on subprocess testing: the test drives the helper via
 *   node chat-slots.mjs golf-liveness
 * subprocess (same pattern as perAgentHandoffWriterBan.test.ts). Vitest's
 * Vite/SSR loader chokes when importing this .mjs from a .ts test file (it
 * tries to statically analyze a template-literal that includes a `file://`
 * URL and emits a SyntaxError without a useful line/column). Subprocess
 * invocation hits the helper's own Node runtime and bypasses the loader.
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   Happy: idle golf (no chat ever claimed) -> isIdle, ageMs=null.
 *   Happy: alive golf (heartbeat <2 min old) -> isAlive, ageMs<STALE_TTL.
 *   Happy: stale golf (heartbeat 2-10 min old) -> isStale.
 *   Happy: crashed golf (heartbeat >10 min old) -> isCrashed.
 *   Failure 1: missing chat-slots.json -> idle (readSlots returns blank).
 *   Failure 2: golf slot key missing entirely -> idle.
 *   Failure 3: malformed lastHeartbeat string -> isCrashed (classifySlot
 *              defensive default).
 *   Adversarial 1: `now` in the past relative to heartbeat -> isAlive
 *                  (negative age treated as < STALE_TTL).
 *   Adversarial 2: state.chatId is empty string -> still surfaced verbatim.
 *   Variability: thresholds (staleThresholdMs / crashedThresholdMs) surface
 *                the CRASH_TTL/STALE_TTL constants for downstream pin-checks.
 *   Variability: 3 spanning slot-state profiles confirm golf is isolated
 *                from peer work-slot status.
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs"; // unused, but mirrors test naming
const CHAT_SLOTS_HELPER = "H:/prism/.claude/helpers/chat-slots.mjs";

// Default thresholds (mirrors STALE_TTL_MS / CRASH_TTL_MS in chat-slots.mjs).
// Cross-pinned by the "thresholds surface" test below so a chat-slots edit
// that changes the constants breaks this test deliberately.
const STALE_TTL_MS = 2 * 60 * 1000;
const CRASH_TTL_MS = 10 * 60 * 1000;

const FROZEN_NOW_MS = Date.parse("2026-05-13T18:00:00.000Z");
const FROZEN_NOW_ISO = new Date(FROZEN_NOW_MS).toISOString();

const tmpDirs: string[] = [];

beforeAll(() => {
  // Sanity check: the helper must exist and be invocable.
  expect(fs.existsSync(CHAT_SLOTS_HELPER)).toBe(true);
  void HELPER; // referenced for symmetry with other handoff tests
});

afterEach(() => {
  while (tmpDirs.length > 0) {
    const d = tmpDirs.pop();
    if (!d) continue;
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
});

function makeTmpStateFile(slots: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b8-golf-liveness-"));
  tmpDirs.push(dir);
  const file = path.join(dir, "chat-slots.json");
  fs.writeFileSync(
    file,
    JSON.stringify({
      schemaVersion: 1,
      lastUpdated: FROZEN_NOW_ISO,
      slots,
    }, null, 2)
  );
  return file;
}

function isoAtAgeMs(ageMs: number, baseMs = FROZEN_NOW_MS): string {
  return new Date(baseMs - ageMs).toISOString();
}

interface LivenessResult {
  ok: boolean;
  slot?: string;
  status?: "alive" | "stale" | "crashed" | "idle";
  isAlive?: boolean;
  isStale?: boolean;
  isCrashed?: boolean;
  isIdle?: boolean;
  ageMs?: number | null;
  lastHeartbeat?: string | null;
  chatId?: string | null;
  branch?: string | null;
  topic?: string | null;
  activity?: string | null;
  staleThresholdMs?: number;
  crashedThresholdMs?: number;
}

/**
 * Direct call to getGolfLiveness via `node -e` — bypasses both vitest's
 * loader and the helper's CLI block. Lets the test pass a custom
 * `statePath` + frozen `now` for deterministic age math.
 */
function callGetGolfLiveness(statePath: string, nowMs: number): LivenessResult {
  // Use file:// URL so Windows absolute paths import correctly.
  const helperUrl = `file:///${CHAT_SLOTS_HELPER.replace(/\\/g, "/")}`;
  const code = [
    `import("${helperUrl}")`,
    `  .then(m => process.stdout.write(JSON.stringify(m.getGolfLiveness(${JSON.stringify(statePath)}, ${nowMs}))))`,
    `  .catch(e => { process.stderr.write(String(e?.message ?? e)); process.exit(2); });`,
  ].join("\n");
  const r = spawnSync(process.execPath, ["-e", code], {
    encoding: "utf-8",
    timeout: 8000,
    windowsHide: true,
    input: "",
  });
  if (r.status !== 0) {
    throw new Error(`helper invocation failed (exit ${r.status}): ${r.stderr || r.stdout}`);
  }
  return JSON.parse(r.stdout) as LivenessResult;
}

describe("U-CLEANUP-B8-CONSOLIDATED getGolfLiveness — return shape + idle path", () => {
  it("returns the documented shape with the correct slot label and surfaced thresholds", () => {
    const file = makeTmpStateFile({});
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("golf");
    // Status flags must all be present (booleans).
    expect(typeof r.isAlive).toBe("boolean");
    expect(typeof r.isStale).toBe("boolean");
    expect(typeof r.isCrashed).toBe("boolean");
    expect(typeof r.isIdle).toBe("boolean");
    // Threshold constants surfaced so downstream consumers can pin without
    // re-importing. If chat-slots.mjs changes these constants, this test
    // (which hardcodes the expected values) deliberately breaks so the
    // operator is forced to confirm the new thresholds.
    expect(r.staleThresholdMs).toBe(STALE_TTL_MS);
    expect(r.crashedThresholdMs).toBe(CRASH_TTL_MS);
  });

  it("idle when chat-slots.json has no golf slot at all", () => {
    const file = makeTmpStateFile({});
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("idle");
    expect(r.isIdle).toBe(true);
    expect(r.isAlive).toBe(false);
    expect(r.ageMs).toBeNull();
    expect(r.lastHeartbeat).toBeNull();
    expect(r.chatId).toBeNull();
  });

  it("idle when golf slot exists but state is null (operator-released or never-claimed)", () => {
    const file = makeTmpStateFile({ golf: null });
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("idle");
    expect(r.isIdle).toBe(true);
    expect(r.ageMs).toBeNull();
  });

  it("idle when chat-slots.json file is missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b8-golf-missing-"));
    tmpDirs.push(dir);
    const missing = path.join(dir, "no-such-file.json");
    const r = callGetGolfLiveness(missing, FROZEN_NOW_MS);
    expect(r.ok).toBe(true);
    expect(r.status).toBe("idle");
  });
});

describe("U-CLEANUP-B8-CONSOLIDATED getGolfLiveness — status transitions", () => {
  function makeGolfState(ageMs: number, overrides: Record<string, unknown> = {}) {
    return {
      golf: {
        chatId: "claude-golftest-id",
        host: "MarkV",
        pid: 12345,
        claimedAt: isoAtAgeMs(ageMs * 2),
        lastHeartbeat: isoAtAgeMs(ageMs),
        branch: "cad-fusion-live-ms0",
        topic: "hygiene-test",
        activity: "ledger-triage",
        ...overrides,
      },
    };
  }

  it("alive when heartbeat is < STALE_TTL_MS (default 2 min) old", () => {
    const file = makeTmpStateFile(makeGolfState(60_000)); // 60 s old
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("alive");
    expect(r.isAlive).toBe(true);
    expect(r.isStale).toBe(false);
    expect(r.ageMs).toBe(60_000);
    expect(r.chatId).toBe("claude-golftest-id");
    expect(r.topic).toBe("hygiene-test");
    expect(r.activity).toBe("ledger-triage");
    expect(r.branch).toBe("cad-fusion-live-ms0");
  });

  it("stale when heartbeat is between STALE_TTL_MS and CRASH_TTL_MS old", () => {
    const halfway = Math.floor((STALE_TTL_MS + CRASH_TTL_MS) / 2);
    const file = makeTmpStateFile(makeGolfState(halfway));
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("stale");
    expect(r.isStale).toBe(true);
    expect(r.isAlive).toBe(false);
    expect(r.isCrashed).toBe(false);
    expect(r.ageMs).toBe(halfway);
  });

  it("crashed when heartbeat is >= CRASH_TTL_MS old", () => {
    const file = makeTmpStateFile(makeGolfState(CRASH_TTL_MS + 1));
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("crashed");
    expect(r.isCrashed).toBe(true);
    expect(r.isAlive).toBe(false);
    expect(r.ageMs).toBe(CRASH_TTL_MS + 1);
  });

  it("crashed when lastHeartbeat is malformed (defensive default)", () => {
    const file = makeTmpStateFile({
      golf: {
        chatId: "claude-bad-heartbeat",
        host: "MarkV",
        pid: 1,
        claimedAt: FROZEN_NOW_ISO,
        lastHeartbeat: "not-a-date",
        branch: null, topic: null, activity: null,
      },
    });
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("crashed");
    expect(r.isCrashed).toBe(true);
    expect(r.ageMs).toBeNull();
    // chatId / lastHeartbeat surfaced verbatim so the operator can diagnose.
    expect(r.chatId).toBe("claude-bad-heartbeat");
    expect(r.lastHeartbeat).toBe("not-a-date");
  });

  it("adversarial: now in the past relative to heartbeat -> isAlive (negative age <= STALE_TTL)", () => {
    const file = makeTmpStateFile(makeGolfState(-30_000));
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("alive");
    expect(r.ageMs).toBe(-30_000);
  });

  it("adversarial: empty-string chatId still surfaces (operator sees the bad value)", () => {
    const file = makeTmpStateFile(makeGolfState(10_000, { chatId: "" }));
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("alive");
    expect(r.chatId).toBe("");
  });
});

describe("U-CLEANUP-B8-CONSOLIDATED getGolfLiveness — slot isolation variability", () => {
  it("idle when only a non-golf work slot is populated (negative control — proves the impl reads the golf key specifically)", () => {
    // Only alpha is populated; golf is absent. If the implementation
    // accidentally read the first non-null slot instead of explicitly
    // keying on "golf", this would return alive/alpha and the test would
    // fail. Closes the trivial-literal "slot:golf" coupling gap flagged
    // by per-file scrutiny.
    const file = makeTmpStateFile({
      alpha: {
        chatId: "a-not-golf", host: "h", pid: 1, claimedAt: isoAtAgeMs(15_000),
        lastHeartbeat: isoAtAgeMs(15_000),
        branch: "cad-fusion-live-ms0", topic: "alpha-work", activity: "feature-work",
      },
    });
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.slot).toBe("golf"); // structural — function always reports its slot label.
    expect(r.status).toBe("idle");
    expect(r.isIdle).toBe(true);
    expect(r.isAlive).toBe(false);
    expect(r.chatId).toBeNull();
    expect(r.activity).toBeNull();
    // Critically: alpha's chatId/activity must NOT bleed into the golf result.
    expect(r.chatId).not.toBe("a-not-golf");
    expect(r.activity).not.toBe("feature-work");
  });

  it("classifies golf independently when work slots have mixed states (3 spanning profiles)", () => {
    // alpha=alive(30s), bravo=stale(3min), charlie=crashed(30min),
    // delta/echo/foxtrot=null, golf=alive(15s). getGolfLiveness must isolate
    // golf and not be confused by other slots' states.
    const file = makeTmpStateFile({
      alpha: {
        chatId: "a", host: "h", pid: 1, claimedAt: isoAtAgeMs(60_000),
        lastHeartbeat: isoAtAgeMs(30_000), branch: null, topic: null, activity: null,
      },
      bravo: {
        chatId: "b", host: "h", pid: 2, claimedAt: isoAtAgeMs(180_000),
        lastHeartbeat: isoAtAgeMs(180_000), branch: null, topic: null, activity: null,
      },
      charlie: {
        chatId: "c", host: "h", pid: 3, claimedAt: isoAtAgeMs(1_800_000),
        lastHeartbeat: isoAtAgeMs(1_800_000), branch: null, topic: null, activity: null,
      },
      delta: null,
      echo: null,
      foxtrot: null,
      golf: {
        chatId: "g", host: "h", pid: 7, claimedAt: isoAtAgeMs(15_000),
        lastHeartbeat: isoAtAgeMs(15_000), branch: null, topic: null, activity: "hygiene",
      },
    });
    const r = callGetGolfLiveness(file, FROZEN_NOW_MS);
    expect(r.status).toBe("alive");
    expect(r.chatId).toBe("g");
    expect(r.activity).toBe("hygiene");
  });
});
