/**
 * Tests for XprocOutcomeLedgerDurability (U-XPROC-LEDGER-DURABLE, slot:india 2026-06-16).
 *
 * R9-honest: real temp-file round-trips through the SINGLETON store + the real feedback
 * bus + the real OutcomePublishAdapterEngine funnel -- not mocks. Each test isolates by
 * clearing the store, resetting the durability module (unsubscribes its bus handles), and
 * using a unique temp ledger path.
 *
 * Durability is OPT-IN: a no-op unless PRISM_XPROC_LEDGER_DURABLE=1 OR an explicit opts.path
 * is passed (test injection). The funnel test sets the env flag to prove real wiring.
 *
 * Run: cd mcp-server && npx vitest run src/__tests__/XprocOutcomeLedgerDurability.test.ts
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ensureXprocLedgerDurable,
  isXprocLedgerEnabled,
  resolveLedgerPath,
  xprocLedgerDurabilityStatus,
  resetXprocLedgerDurabilityForTest,
  DEFAULT_LEDGER_PATH,
} from "../engines/XprocOutcomeLedgerDurability.js";
import { crossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";
import { OutcomePublishAdapterEngine } from "../engines/OutcomePublishAdapterEngine.js";

let tmpCounter = 0;
let currentTmp: string | null = null;

function tmpLedgerPath(): string {
  tmpCounter += 1;
  return path.join(os.tmpdir(), `_xproc_ledger_${process.pid}_${tmpCounter}.jsonl`);
}

/** Poll until `cond()` is truthy or the timeout elapses. The bus fan-out + appendFile are
 *  async (queueMicrotask + fs), so disk assertions must wait, not read immediately. */
async function waitFor(cond: () => Promise<boolean> | boolean, timeoutMs = 2000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cond()) return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  return false;
}

async function readLedgerLines(p: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await fs.readFile(p, "utf-8");
    return raw
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as Record<string, unknown>);
  } catch {
    return [];
  }
}

beforeEach(() => {
  delete process.env.PRISM_XPROC_LEDGER_DURABLE;
  delete process.env.PRISM_XPROC_LEDGER_PATH;
  resetXprocLedgerDurabilityForTest();
  crossProcessOutcomeStore.clear();
  OutcomePublishAdapterEngine.reset();
  currentTmp = null;
});

afterEach(async () => {
  resetXprocLedgerDurabilityForTest();
  if (currentTmp) await fs.rm(currentTmp, { force: true });
});

// ----------------------------------------------------------------------------
// Opt-in gate + path resolution
// ----------------------------------------------------------------------------

describe("opt-in gate + path resolution", () => {
  it("default OFF: no env flag, no path -> no-op, never wires (enabled:false)", async () => {
    expect(isXprocLedgerEnabled()).toBe(false);
    const r = await ensureXprocLedgerDurable();
    expect(r.enabled).toBe(false);
    expect(r.path).toBeNull();
    const st = xprocLedgerDurabilityStatus();
    expect(st.enabled).toBe(false);
    expect(st.subscriptions).toBe(0);
  });

  it("PRISM_XPROC_LEDGER_DURABLE=1 flips isXprocLedgerEnabled() to true", () => {
    expect(isXprocLedgerEnabled()).toBe(false);
    process.env.PRISM_XPROC_LEDGER_DURABLE = "1";
    expect(isXprocLedgerEnabled()).toBe(true);
  });

  it("default OFF: a published outcome is NOT persisted (opt-in required)", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    process.env.PRISM_XPROC_LEDGER_PATH = p; // path set, but durability NOT opted in
    OutcomePublishAdapterEngine.publish({ bridge: "ai", process: "mill", outcome: { kind: "success" } });
    await new Promise((r) => setTimeout(r, 100));
    expect(await readLedgerLines(p)).toHaveLength(0);
  });

  it("resolveLedgerPath: override wins, empty override falls back to default (absolute)", () => {
    process.env.PRISM_XPROC_LEDGER_PATH = "";
    expect(resolveLedgerPath()).toBe(path.resolve(process.cwd(), DEFAULT_LEDGER_PATH));
    const abs = path.join(os.tmpdir(), "explicit.jsonl");
    process.env.PRISM_XPROC_LEDGER_PATH = abs;
    expect(resolveLedgerPath()).toBe(abs);
  });
});

// ----------------------------------------------------------------------------
// Persistence round-trip + reload (the whole point)
// ----------------------------------------------------------------------------

describe("durable persistence", () => {
  it("round-trip: a recorded outcome lands on disk as a parseable jsonl line", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    await ensureXprocLedgerDurable({ path: p });
    const id = crossProcessOutcomeStore.record({ bridge: "sf", process: "lathe", outcome: { kind: "success" } });
    const ok = await waitFor(async () => (await readLedgerLines(p)).length >= 1);
    expect(ok).toBe(true);
    const lines = await readLedgerLines(p);
    expect(lines[0].id).toBe(id);
    expect(lines[0].bridge).toBe("sf");
    expect(lines[0].process).toBe("lathe");
  });

  it("through the adapter funnel: OutcomePublishAdapterEngine.publish persists (real wiring)", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    process.env.PRISM_XPROC_LEDGER_PATH = p;
    process.env.PRISM_XPROC_LEDGER_DURABLE = "1"; // opt in so the publish() funnel wires durability
    // No explicit ensure -- publish() must fire-and-forget wire it (race-free via buffer).
    const res = OutcomePublishAdapterEngine.publish({
      bridge: "feature",
      process: "wedm",
      outcome: { kind: "failure", failure_mode: "wire_break" },
    });
    expect(res.ok).toBe(true);
    const ok = await waitFor(async () => (await readLedgerLines(p)).length >= 1);
    expect(ok).toBe(true);
    const lines = await readLedgerLines(p);
    expect(lines[0].bridge).toBe("feature");
    expect((lines[0].outcome as { kind?: string }).kind).toBe("failure");
  });

  it("reload-on-restart: configureStorePath restores prior records into a fresh store", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    // Simulate a prior run's ledger: two valid schema-versioned records.
    const prior = [
      { schemaVersion: "1.0", id: "evt-1", ts: "2026-06-16T00:00:00.000Z", bridge: "ai", process: "mill", request_summary: {}, response_summary: {}, outcome: { kind: "success" } },
      { schemaVersion: "1.0", id: "evt-2", ts: "2026-06-16T00:00:01.000Z", bridge: "sf", process: "lathe", request_summary: {}, response_summary: {}, outcome: { kind: "failure", failure_mode: "x" } },
    ];
    await fs.writeFile(p, prior.map((r) => JSON.stringify(r)).join("\n") + "\n");
    crossProcessOutcomeStore.clear();
    const r = await ensureXprocLedgerDurable({ path: p });
    expect(r.recordsLoaded).toBe(2);
    expect(crossProcessOutcomeStore.size()).toBe(2);
    expect(crossProcessOutcomeStore.query({}).map((e) => e.id).sort()).toEqual(["evt-1", "evt-2"]);
  });

  it("pending -> terminal: updateOutcome re-persists; reload yields the terminal kind", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    await ensureXprocLedgerDurable({ path: p });
    const id = crossProcessOutcomeStore.record({ bridge: "router", process: "mill" }); // kind=pending
    await waitFor(async () => (await readLedgerLines(p)).length >= 1);
    const upd = OutcomePublishAdapterEngine.updateOutcome({ id, kind: "success" });
    expect(upd.ok).toBe(true);
    // Two appended lines (pending then success); the LAST line for the id is terminal.
    const ok = await waitFor(async () => {
      const lines = await readLedgerLines(p);
      const mine = lines.filter((l) => l.id === id);
      return mine.length >= 2 && (mine[mine.length - 1].outcome as { kind?: string }).kind === "success";
    });
    expect(ok).toBe(true);
    // Reload into a fresh store. configureStorePath pushes BOTH appended lines into events[]
    // (byId points to the latest); the terminal record is the LAST events[] entry for the id.
    crossProcessOutcomeStore.clear();
    resetXprocLedgerDurabilityForTest();
    await ensureXprocLedgerDurable({ path: p });
    const reloaded = crossProcessOutcomeStore.query({}).filter((e) => e.id === id).pop();
    expect((reloaded?.outcome as { kind?: string } | undefined)?.kind).toBe("success");
  });
});

// ----------------------------------------------------------------------------
// Idempotency + cold-start race
// ----------------------------------------------------------------------------

describe("idempotency + cold-start", () => {
  it("double ensure wires once: second call reports alreadyWired, only 2 subscriptions", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    const r1 = await ensureXprocLedgerDurable({ path: p });
    const r2 = await ensureXprocLedgerDurable({ path: p });
    expect(r1.alreadyWired).toBe(false);
    expect(r2.alreadyWired).toBe(true);
    expect(r2.path).toBe(r1.path);
    expect(xprocLedgerDurabilityStatus().subscriptions).toBe(2);
  });

  it("cold-start: a record created BEFORE configure resolves is buffered then flushed", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    // Kick off ensure but DO NOT await -- subscribe() is synchronous, configureStorePath is not.
    const pending = ensureXprocLedgerDurable({ path: p });
    // Record immediately: the bus event fires before storeReady -> must buffer, not drop.
    const id = crossProcessOutcomeStore.record({ bridge: "ai", process: "mill", outcome: { kind: "success" } });
    await pending;
    const ok = await waitFor(async () => (await readLedgerLines(p)).some((l) => l.id === id));
    expect(ok).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Adversarial / failure modes
// ----------------------------------------------------------------------------

describe("adversarial", () => {
  it("a bus event with no id is ignored (no throw, no spurious persist)", async () => {
    const { feedbackBusEngine } = await import("../engines/FeedbackBusEngine.js");
    const p = tmpLedgerPath();
    currentTmp = p;
    await ensureXprocLedgerDurable({ path: p });
    const before = (await readLedgerLines(p)).length;
    feedbackBusEngine.publish("outcome.recorded", { bridge: "ai" }); // no id
    feedbackBusEngine.publish("outcome.recorded", { id: 42 }); // non-string id
    await new Promise((r) => setTimeout(r, 80));
    expect((await readLedgerLines(p)).length).toBe(before);
    expect(xprocLedgerDurabilityStatus().bufferedIds).toBe(0);
  });

  it("reload tolerates malformed + wrong-schema lines (skips, no crash)", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    const content = [
      JSON.stringify({ schemaVersion: "1.0", id: "evt-1", ts: "t", bridge: "ai", process: "mill", request_summary: {}, response_summary: {}, outcome: { kind: "success" } }),
      "this is not json",
      JSON.stringify({ schemaVersion: "9.9", id: "evt-2", ts: "t", bridge: "ai", process: "mill" }), // wrong schema -> skipped
    ].join("\n");
    await fs.writeFile(p, content + "\n");
    crossProcessOutcomeStore.clear();
    const r = await ensureXprocLedgerDurable({ path: p });
    expect(r.recordsLoaded).toBe(1); // only the valid v1.0 record loads
  });
});

// ----------------------------------------------------------------------------
// Scrutiny-hardened: reload dedup, fail-loud counter, updateOutcome isolation
// ----------------------------------------------------------------------------

describe("scrutiny-hardened", () => {
  it("reload dedups by id: a pending+completed pair for one id loads as ONE record (no double-count)", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    // Append-only ledger with TWO lines for the SAME id (pending then terminal). Before the
    // dedup fix this loaded as TWO events[] entries -> replay()/replaySince() double-counted.
    const lines = [
      { schemaVersion: "1.0", id: "evt-1", ts: "2026-06-16T00:00:00.000Z", bridge: "ai", process: "mill", request_summary: {}, response_summary: {}, outcome: { kind: "pending" } },
      { schemaVersion: "1.0", id: "evt-1", ts: "2026-06-16T00:00:05.000Z", bridge: "ai", process: "mill", request_summary: {}, response_summary: {}, outcome: { kind: "success" } },
    ];
    await fs.writeFile(p, lines.map((r) => JSON.stringify(r)).join("\n") + "\n");
    crossProcessOutcomeStore.clear();
    const r = await ensureXprocLedgerDurable({ path: p });
    expect(r.recordsLoaded).toBe(1);
    expect(crossProcessOutcomeStore.size()).toBe(1);
    const all = crossProcessOutcomeStore.query({}).filter((e) => e.id === "evt-1");
    expect(all).toHaveLength(1);
    expect((all[0].outcome as { kind?: string }).kind).toBe("success"); // latest line wins
  });

  it("updateOutcome wires durability on its OWN (no prior ensure/publish)", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    process.env.PRISM_XPROC_LEDGER_DURABLE = "1";
    process.env.PRISM_XPROC_LEDGER_PATH = p;
    // record() directly does NOT wire durability; updateOutcome() must wire it itself.
    const id = crossProcessOutcomeStore.record({ bridge: "ai", process: "mill" }); // pending, not yet persisted
    const upd = OutcomePublishAdapterEngine.updateOutcome({ id, kind: "success" });
    expect(upd.ok).toBe(true);
    const ok = await waitFor(async () =>
      (await readLedgerLines(p)).some((l) => l.id === id && (l.outcome as { kind?: string }).kind === "success"),
    );
    expect(ok).toBe(true);
    expect(xprocLedgerDurabilityStatus().subscriptions).toBe(2); // wired by updateOutcome alone
  });

  it("happy-path persists with zero persistErrors (fail-loud counter exposed + clean)", async () => {
    const p = tmpLedgerPath();
    currentTmp = p;
    await ensureXprocLedgerDurable({ path: p });
    crossProcessOutcomeStore.record({ bridge: "sf", process: "lathe", outcome: { kind: "success" } });
    await waitFor(async () => (await readLedgerLines(p)).length >= 1);
    expect(xprocLedgerDurabilityStatus().persistErrors).toBe(0);
  });
});
