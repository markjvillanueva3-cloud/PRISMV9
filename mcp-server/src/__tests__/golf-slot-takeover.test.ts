/**
 * golf-slot-takeover.test.ts — CLEANUP-MS0 / U-CLEANUP-SLOT-TAKEOVER
 *
 * Tests the pure decision functions + the orchestrator with fully-injected
 * isPidDead / readJsonFn / writeJsonFn. Every assertion checks a concrete
 * observable value or pattern — no presence-only stubs.
 */

import { describe, it, expect } from "vitest";

import {
  parseArgs,
  isPidDead,
  evaluateGolfClaim,
  clearGolfClaim,
  takeover,
} from "../../../scripts/golf-slot-takeover.mjs";

const HOST = "DESKTOP-N7MI1VB";

function makeSlots(overrides: Record<string, any> = {}) {
  return {
    schemaVersion: 1,
    lastUpdated: "2026-05-13T22:00:00.000Z",
    slots: {
      alpha: { chatId: "claude-a", host: HOST, pid: 100, branch: "main", topic: "x" },
      golf:  { chatId: "claude-g", host: HOST, pid: 200, branch: "main", topic: "hygiene" },
      ...overrides,
    },
  };
}

describe("parseArgs", () => {
  it("returns documented defaults on empty argv", () => {
    const a = parseArgs([]);
    expect(a.state).toBe("H:/prism/state/shared/chat-slots.json");
    expect(a.dryRun).toBe(false);
    expect(a.json).toBe(false);
  });

  it("parses every flag with explicit values", () => {
    const a = parseArgs(["--state", "/tmp/x.json", "--dry-run", "--json"]);
    expect(a.state).toBe("/tmp/x.json");
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(true);
  });
});

describe("isPidDead", () => {
  it("returns true for non-integer / non-positive inputs (defensive)", () => {
    expect(isPidDead(0)).toBe(true);
    expect(isPidDead(-1)).toBe(true);
    expect(isPidDead(NaN)).toBe(true);
    expect(isPidDead("not a pid" as any)).toBe(true);
    expect(isPidDead(undefined as any)).toBe(true);
  });

  it("returns false when killFn signals OK (PID receivable)", () => {
    const r = isPidDead(12345, { killFn: () => undefined as any });
    expect(r).toBe(false);
  });

  it("returns true when killFn throws ESRCH (PID does not exist)", () => {
    const r = isPidDead(99999, {
      killFn: () => { const e: any = new Error("not found"); e.code = "ESRCH"; throw e; },
    });
    expect(r).toBe(true);
  });

  it("returns false on EPERM — PID exists but we lack permission (conservative)", () => {
    const r = isPidDead(1, {
      killFn: () => { const e: any = new Error("perm denied"); e.code = "EPERM"; throw e; },
    });
    expect(r).toBe(false);
  });

  it("returns false on unknown error codes (do not evict on uncertainty)", () => {
    const r = isPidDead(42, {
      killFn: () => { const e: any = new Error("weird"); e.code = "EINVAL"; throw e; },
    });
    expect(r).toBe(false);
  });
});

describe("evaluateGolfClaim", () => {
  it("returns shouldRelease=false reason='golf-slot-empty' when slot is absent", () => {
    const state = makeSlots();
    delete state.slots.golf;
    const r = evaluateGolfClaim(state, HOST, () => false);
    expect(r.shouldRelease).toBe(false);
    expect(r.reason).toBe("golf-slot-empty");
  });

  it("returns shouldRelease=false reason='cross-host-claim-skipped' for foreign host", () => {
    const state = makeSlots({ golf: { chatId: "c", host: "OTHER-PC", pid: 500 } });
    const r = evaluateGolfClaim(state, HOST, () => true /* would-be-dead, but cross-host */);
    expect(r.shouldRelease).toBe(false);
    expect(r.reason).toBe("cross-host-claim-skipped");
    expect((r as any).prior?.host).toBe("OTHER-PC");
    expect((r as any).prior?.pid).toBe(500);
  });

  it("returns shouldRelease=true reason='missing-or-bad-pid' when pid is absent or non-integer", () => {
    const a = evaluateGolfClaim(makeSlots({ golf: { chatId: "c", host: HOST } }), HOST, () => false);
    expect(a.shouldRelease).toBe(true);
    expect(a.reason).toBe("missing-or-bad-pid");

    const b = evaluateGolfClaim(makeSlots({ golf: { chatId: "c", host: HOST, pid: "oops" } }), HOST, () => false);
    expect(b.shouldRelease).toBe(true);
    expect(b.reason).toBe("missing-or-bad-pid");
  });

  it("returns shouldRelease=false reason='same-process-noop' when pid is this process", () => {
    const r = evaluateGolfClaim(
      makeSlots({ golf: { chatId: "c", host: HOST, pid: process.pid } }),
      HOST,
      () => true,
    );
    expect(r.shouldRelease).toBe(false);
    expect(r.reason).toBe("same-process-noop");
  });

  it("returns shouldRelease=true reason='pid-dead' when isPidDeadFn=true", () => {
    const r = evaluateGolfClaim(makeSlots(), HOST, () => true);
    expect(r.shouldRelease).toBe(true);
    expect(r.reason).toBe("pid-dead");
    expect((r as any).prior?.chatId).toBe("claude-g");
    expect((r as any).prior?.pid).toBe(200);
  });

  it("returns shouldRelease=false reason='pid-alive' when isPidDeadFn=false", () => {
    const r = evaluateGolfClaim(makeSlots(), HOST, () => false);
    expect(r.shouldRelease).toBe(false);
    expect(r.reason).toBe("pid-alive");
  });
});

describe("clearGolfClaim", () => {
  it("removes only the golf slot and preserves alpha verbatim", () => {
    const before = makeSlots();
    const after = clearGolfClaim(before);
    expect(after.slots.alpha.chatId).toBe("claude-a");
    expect(after.slots.alpha.pid).toBe(100);
    expect("golf" in after.slots).toBe(false);
    expect(after.schemaVersion).toBe(1);
  });

  it("does not mutate the input state object (functional purity)", () => {
    const before = makeSlots();
    const beforeSlotsRef = before.slots;
    const goldenJson = JSON.stringify(before);
    clearGolfClaim(before);
    expect(before.slots).toBe(beforeSlotsRef);
    expect(JSON.stringify(before)).toBe(goldenJson);
    expect("golf" in before.slots).toBe(true); // input still has golf
  });

  it("refreshes lastUpdated to a UTC-Z ISO string distinct from input", () => {
    const before = makeSlots();
    const after = clearGolfClaim(before);
    expect(typeof after.lastUpdated).toBe("string");
    expect(after.lastUpdated.endsWith("Z")).toBe(true);
    expect(after.lastUpdated).not.toBe(before.lastUpdated);
    expect(after.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("tolerates a state object with no slots field (produces an empty-slot map)", () => {
    const after = clearGolfClaim({ schemaVersion: 1 } as any);
    expect(after.schemaVersion).toBe(1);
    expect("golf" in (after.slots || {})).toBe(false);
    expect(Object.keys(after.slots || {})).toHaveLength(0);
  });
});

describe("takeover — orchestration", () => {
  it("returns reason='state-missing-or-malformed' when readJsonFn returns null", () => {
    const writeCalls: any[] = [];
    const r = takeover(
      { state: "/x.json", dryRun: false, json: false },
      {
        readJsonFn: () => null,
        writeJsonFn: (p: string, d: any) => { writeCalls.push([p, d]); return { ok: true, error: null }; },
        isPidDeadFn: () => true,
        host: HOST,
      },
    );
    expect(r.ok).toBe(true);
    expect(r.released).toBe(false);
    expect(r.reason).toBe("state-missing-or-malformed");
    expect(writeCalls).toHaveLength(0);
  });

  it("releases the golf slot when prior PID is dead (and writes the new state)", () => {
    let writtenPath = "";
    let writtenState: any = null;
    const r = takeover(
      { state: "/x.json", dryRun: false, json: false },
      {
        readJsonFn: () => makeSlots(),
        writeJsonFn: (p: string, d: any) => {
          writtenPath = p; writtenState = d;
          return { ok: true, error: null };
        },
        isPidDeadFn: () => true,
        host: HOST,
      },
    );
    expect(r.ok).toBe(true);
    expect(r.released).toBe(true);
    expect(r.reason).toBe("pid-dead");
    expect((r.prior as any).chatId).toBe("claude-g");
    expect((r.prior as any).pid).toBe(200);
    expect(writtenPath).toBe("/x.json");
    expect("golf" in writtenState.slots).toBe(false);
    expect(writtenState.slots.alpha.chatId).toBe("claude-a");
  });

  it("keeps the slot when PID is alive (no write attempted)", () => {
    let writeCount = 0;
    const r = takeover(
      { state: "/x.json", dryRun: false, json: false },
      {
        readJsonFn: () => makeSlots(),
        writeJsonFn: () => { writeCount += 1; return { ok: true, error: null }; },
        isPidDeadFn: () => false,
        host: HOST,
      },
    );
    expect(r.released).toBe(false);
    expect(r.reason).toBe("pid-alive");
    expect(writeCount).toBe(0);
  });

  it("never releases a cross-host claim, even if the local PID-check would say dead", () => {
    let writeCount = 0;
    const r = takeover(
      { state: "/x.json", dryRun: false, json: false },
      {
        readJsonFn: () => makeSlots({ golf: { chatId: "c", host: "OTHER", pid: 500 } }),
        writeJsonFn: () => { writeCount += 1; return { ok: true, error: null }; },
        isPidDeadFn: () => true,
        host: HOST,
      },
    );
    expect(r.released).toBe(false);
    expect(r.reason).toBe("cross-host-claim-skipped");
    expect(writeCount).toBe(0);
  });

  it("dry-run reports released=true with '-dry-run' suffix but does NOT write", () => {
    let writeCount = 0;
    const r = takeover(
      { state: "/x.json", dryRun: true, json: false },
      {
        readJsonFn: () => makeSlots(),
        writeJsonFn: () => { writeCount += 1; return { ok: true, error: null }; },
        isPidDeadFn: () => true,
        host: HOST,
      },
    );
    expect(r.released).toBe(true);
    expect(r.reason).toBe("pid-dead-dry-run");
    expect(writeCount).toBe(0);
  });

  it("marks ok=false when writeJsonFn fails and surfaces the error code", () => {
    const r = takeover(
      { state: "/x.json", dryRun: false, json: false },
      {
        readJsonFn: () => makeSlots(),
        writeJsonFn: () => ({ ok: false, error: "EACCES read-only filesystem" }),
        isPidDeadFn: () => true,
        host: HOST,
      },
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/EACCES/);
    expect(r.released).toBe(false);
  });

  it("does not write when slot is empty (golf-slot-empty)", () => {
    let writeCount = 0;
    const empty = makeSlots();
    delete empty.slots.golf;
    const r = takeover(
      { state: "/x.json", dryRun: false, json: false },
      {
        readJsonFn: () => empty,
        writeJsonFn: () => { writeCount += 1; return { ok: true, error: null }; },
        isPidDeadFn: () => true,
        host: HOST,
      },
    );
    expect(r.released).toBe(false);
    expect(r.reason).toBe("golf-slot-empty");
    expect(writeCount).toBe(0);
  });

  it("preserves alpha + other peer slots intact when releasing golf", () => {
    let written: any = null;
    const stateWithMany = {
      schemaVersion: 1,
      lastUpdated: "2026-05-13T22:00:00.000Z",
      slots: {
        alpha:   { chatId: "claude-a", host: HOST, pid: 100 },
        bravo:   { chatId: "claude-b", host: HOST, pid: 101 },
        charlie: { chatId: "claude-c", host: HOST, pid: 102 },
        delta:   { chatId: "claude-d", host: HOST, pid: 103 },
        echo:    { chatId: "claude-e", host: HOST, pid: 104 },
        foxtrot: { chatId: "claude-f", host: HOST, pid: 105 },
        golf:    { chatId: "claude-g", host: HOST, pid: 200 },
      },
    };
    takeover(
      { state: "/x.json", dryRun: false, json: false },
      {
        readJsonFn: () => stateWithMany,
        writeJsonFn: (_p: string, d: any) => { written = d; return { ok: true, error: null }; },
        isPidDeadFn: () => true,
        host: HOST,
      },
    );
    expect(Object.keys(written.slots).sort()).toEqual([
      "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
    ]);
    expect(written.slots.alpha.chatId).toBe("claude-a");
    expect(written.slots.alpha.pid).toBe(100);
    expect(written.slots.foxtrot.chatId).toBe("claude-f");
    expect(written.slots.foxtrot.pid).toBe(105);
  });
});
