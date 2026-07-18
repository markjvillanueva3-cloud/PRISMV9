/**
 * SessionEventLogEngineWiring.test.ts
 *
 * WIRE-UNWIRED-MS0/U-WIRE-SESSION-EVENT-LOG — verifies SessionEventLogEngine
 * is wired into prism_session as the `session_event_log` action.
 *
 * The engine was flagged in BUILD_STATE.NEEDS_WIRING (709 unwired engines):
 * a real in-memory session-event recorder (record / getState / replay /
 * oneLiner / counts / since / reset) with zero dispatcher reference. This unit
 * wires it as one action dispatched on an `op` field. The test pins BOTH the
 * wiring (source-grep fail-on-revert guards) AND the engine contract (a real
 * record → getState → counts → since → reset round-trip).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SessionEventLogEngine } from "../engines/SessionEventLogEngine.js";

const DISPATCHER_SRC = readFileSync(
  fileURLToPath(new URL("../tools/dispatchers/sessionDispatcher.ts", import.meta.url)),
  "utf8",
);
const SCHEMA_SRC = readFileSync(
  fileURLToPath(new URL("../schemas/sessionActionSchemas.ts", import.meta.url)),
  "utf8",
);

describe("session_event_log — dispatcher wiring", () => {
  it("the action is in the prism_session ACTIONS enum", () => {
    // z.enum(ACTIONS) rejects any action string not present — a missing entry
    // makes the action permanently unreachable.
    expect(DISPATCHER_SRC).toMatch(/"session_event_log"/);
  });

  it("the handler case lazy-imports SessionEventLogEngine", () => {
    expect(DISPATCHER_SRC).toMatch(/case "session_event_log":/);
    expect(DISPATCHER_SRC).toMatch(
      /import\(\s*["']\.\.\/\.\.\/engines\/SessionEventLogEngine\.js["']\s*\)/,
    );
  });

  it("the handler invokes the engine singleton (not a no-op orphan)", () => {
    // Pins at least one real engine call — a case that imports but never calls
    // the engine is the exact orphan class WIRE-UNWIRED guards against.
    expect(DISPATCHER_SRC).toMatch(/sessionEventLogEngine\.(record|getState|replay|counts|since|oneLiner|reset)\(/);
  });

  it("the handler dispatches on the op discriminator with all 7 ops", () => {
    // Scope the search to the session_event_log case block — a bare
    // `case "record":` belonging to some OTHER action's sub-switch must not
    // false-pass this guard. Slice from the case start to the OUTER default.
    const start = DISPATCHER_SRC.indexOf('case "session_event_log":');
    expect(start).toBeGreaterThan(-1);
    const end = DISPATCHER_SRC.indexOf("\n          default:", start);
    const block = DISPATCHER_SRC.slice(start, end > start ? end : undefined);
    expect(block.length).toBeGreaterThan(100);
    for (const op of ["record", "state", "replay", "oneliner", "counts", "since", "reset"]) {
      expect(block).toMatch(new RegExp(`case "${op}":`));
    }
  });

  it("op='record' fails loud on missing type/summary (not silent)", () => {
    expect(DISPATCHER_SRC).toMatch(/'record' requires a string 'type'/);
    expect(DISPATCHER_SRC).toMatch(/'record' requires a non-empty 'summary'/);
  });

  it("the action has a registered Zod schema in ACTION_SESSION_SCHEMAS", () => {
    expect(SCHEMA_SRC).toMatch(/session_event_log: z\.object\(/);
  });
});

describe("SessionEventLogEngine — engine contract round-trip", () => {
  it("a fresh engine reports an empty, well-formed EventLogState", () => {
    const engine = new SessionEventLogEngine();
    const state = engine.getState();
    expect(state.events).toEqual([]);
    expect(state.filesModified).toEqual([]);
    expect(state.commits).toEqual([]);
    expect(state.errors).toEqual([]);
    expect(state.decisions).toEqual([]);
    expect(state.userRequests).toEqual([]);
    expect(state.duration).toBe(0);
  });

  it("record() routes events into the correct EventLogState buckets", () => {
    const engine = new SessionEventLogEngine();
    engine.record("commit", "abc123 wire engine");
    engine.record("error", "boom");
    engine.record("decision", "use op-discriminator");
    engine.record("test-fail", "spec broke");
    const state = engine.getState();
    expect(state.events.length).toBe(4);
    expect(state.commits).toEqual(["abc123 wire engine"]);
    expect(state.decisions).toEqual(["use op-discriminator"]);
    // errors bucket aggregates error + test-fail + build-fail.
    expect(state.errors).toContain("boom");
    expect(state.errors).toContain("spec broke");
    expect(state.errors.length).toBe(2);
  });

  it("counts() tallies events by type", () => {
    const engine = new SessionEventLogEngine();
    engine.record("commit", "c1");
    engine.record("commit", "c2");
    engine.record("decision", "d1");
    const counts = engine.counts();
    expect(counts.commit).toBe(2);
    expect(counts.decision).toBe(1);
  });

  it("replay() and oneLiner() return non-empty strings", () => {
    const engine = new SessionEventLogEngine();
    engine.record("milestone", "shipped U-WIRE-SESSION-EVENT-LOG");
    const replay = engine.replay();
    // Pin the replay header FORMAT, not just substring presence — a broken
    // duration/event-count computation would otherwise slip through.
    expect(replay).toMatch(/Session: \d+min, \d+ events/);
    const oneLiner = engine.oneLiner();
    expect(typeof oneLiner).toBe("string");
    expect(oneLiner.length).toBeGreaterThan(0);
  });

  it("since() filters events by timestamp lower bound", () => {
    const engine = new SessionEventLogEngine();
    engine.record("commit", "early");
    const all = engine.since(0);
    expect(all.length).toBe(1);
    // A future lower bound excludes everything recorded so far.
    expect(engine.since(Date.now() + 1_000_000).length).toBe(0);
  });

  it("reset() clears all recorded events", () => {
    const engine = new SessionEventLogEngine();
    engine.record("commit", "to be cleared");
    expect(engine.getState().events.length).toBe(1);
    engine.reset();
    expect(engine.getState().events.length).toBe(0);
  });
});
