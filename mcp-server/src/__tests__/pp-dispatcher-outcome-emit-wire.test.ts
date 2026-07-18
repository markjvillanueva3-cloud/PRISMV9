/**
 * prism_pp pp_outcome_emit wiring test
 * ====================================
 * INDIA-AI-ORPHAN-WIRE (bravo, 2026-06-11): wires the dark
 * `PPGOutcomeCaptureWireEngine` (false `// WIRE-EXEMPT` marker; zero real
 * callers) into prism_pp via `pp_outcome_emit`. Closes the post->india
 * OutcomeCaptureBus EMIT side (publishes a `recommendation_emitted` event with
 * domain "post_processor" so india's closed loop can correlate it with later
 * actuals by lineage_id).
 *
 * The singleton publishes to the disk-backed OutcomeCaptureBus. To round-trip
 * THROUGH the dispatcher with ZERO disk pollution we monkeypatch the singleton's
 * `record` to capture the call in memory + return a synthetic ok result, then
 * restore it. Assertions check concrete values: the engine's deterministic
 * G-code summary (block_count, tool_changes) reaches the bus, the domain/kind
 * are correct, and the dispatcher guards reject missing inputs.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerPPDispatcher } from "../tools/dispatchers/ppDispatcher.js";
import { outcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerPPDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

// Captured bus.record calls (in-memory; zero disk writes).
let recorded: Array<Record<string, any>>;
let recordSeq: number;

describe("prism_pp pp_outcome_emit (INDIA-AI-ORPHAN-WIRE)", () => {
  let handler: Handler;
  let originalRecord: typeof outcomeCaptureBusEngine.record;

  beforeAll(async () => {
    handler = await createServer().handler;
    originalRecord = outcomeCaptureBusEngine.record.bind(outcomeCaptureBusEngine);
    recorded = [];
    recordSeq = 0;
    (outcomeCaptureBusEngine as unknown as { record: (i: any) => any }).record = (input: any) => {
      recorded.push(input);
      recordSeq += 1;
      return {
        ok: true,
        lineage_id: input.lineage_id ?? `lin-test-${recordSeq}`,
        event_id: `evt-test-${recordSeq}`,
        path: "/dev/null/test",
      };
    };
  });

  afterAll(() => {
    (outcomeCaptureBusEngine as unknown as { record: typeof originalRecord }).record = originalRecord;
  });

  // ---- HAPPY 1: a raw G-code string is summarized + published with the right domain/kind ----
  it("emits a recommendation_emitted event to domain=post_processor with the engine in context", async () => {
    const gcode = "O0001\nG90 G21\nT1 M06\nG0 X0 Y0\nG1 Z-1 F100\nT2 M06\nM30";
    const r = await call(handler, "pp_outcome_emit", {
      engine: "WEDMPostMitsubishiEngine",
      action: "generate",
      recommended: gcode,
      context: { machine_id: "M-08", controller: "mitsubishi" },
    });
    expect(r.ok).toBe(true);
    expect(typeof r.lineage_id).toBe("string");
    // event_id is forwarded from the bus; assert the shape, not the exact seq
    // (the seq counter is module-level and not reset per test -- asserting "==1"
    // would couple to test-execution order; prefix proves the wire forwards it).
    expect(typeof r.event_id).toBe("string");
    expect(r.event_id.startsWith("evt-test-")).toBe(true);
    // exactly one bus.record, shaped correctly
    expect(recorded.length).toBe(1);
    expect(recorded[0].domain).toBe("post_processor");
    expect(recorded[0].kind).toBe("recommendation_emitted");
    expect(recorded[0].context.engine).toBe("WEDMPostMitsubishiEngine");
    expect(recorded[0].context.action).toBe("generate");
    expect(recorded[0].context.machine_id).toBe("M-08");
  });

  // ---- HAPPY 2: the deterministic G-code summary reaches the bus with exact counts ----
  it("summarizes the G-code: block_count=7, tool_changes=2 (T1+T2) in the recorded recommendation", async () => {
    recorded = [];
    const gcode = "O0001\nG90 G21\nT1 M06\nG0 X0 Y0\nG1 Z-1 F100\nT2 M06\nM30"; // 7 non-empty lines, T1 + T2
    const r = await call(handler, "pp_outcome_emit", { engine: "PPGTestEngine", recommended: gcode });
    expect(r.ok).toBe(true);
    const summary = recorded[0].recommended.summary;
    expect(summary.block_count).toBe(7);
    expect(summary.tool_changes).toBe(2);
    expect(r.summary.block_count).toBe(7); // dispatcher echoes the same summary back to the caller
  });

  // ---- HAPPY 3: an object recommendation extracts its declared fields ----
  it("an object recommendation forwards controller + block_count fields into the summary", async () => {
    recorded = [];
    const r = await call(handler, "pp_outcome_emit", {
      engine: "PPGTestEngine",
      recommended: { controller: "haas", block_count: 42, dialect: "haas-ngc" },
    });
    expect(r.ok).toBe(true);
    expect(recorded[0].recommended.summary.controller).toBe("haas");
    expect(recorded[0].recommended.summary.block_count).toBe(42);
    expect(recorded[0].recommended.summary.dialect).toBe("haas-ngc");
  });

  // ---- FAILURE 1: missing engine is rejected by the dispatcher guard (not published) ----
  it("rejects a missing engine id and does NOT touch the bus", async () => {
    recorded = [];
    const r = await call(handler, "pp_outcome_emit", { recommended: "G0 X0" });
    expect(r.success).toBe(false);
    expect(r.error).toContain("engine");
    expect(recorded.length).toBe(0);
  });

  // ---- FAILURE 2: missing recommended is rejected (not published) ----
  it("rejects a missing recommended payload and does NOT touch the bus", async () => {
    recorded = [];
    const r = await call(handler, "pp_outcome_emit", { engine: "PPGTestEngine" });
    expect(r.success).toBe(false);
    expect(r.error).toContain("recommended");
    expect(recorded.length).toBe(0);
  });

  // ---- ADVERSARIAL 1: a non-string action / non-object context are dropped, not forwarded raw ----
  it("drops a non-string action and a non-object (array) context instead of forwarding them", async () => {
    recorded = [];
    const r = await call(handler, "pp_outcome_emit", {
      engine: "PPGTestEngine",
      action: 12345,            // not a string
      context: ["not", "an", "object"], // array, not a context object
      recommended: "G0 X0\nM30",
    });
    expect(r.ok).toBe(true);
    expect(recorded[0].context.action).toBe(undefined); // dropped, not the number 12345
    // context array was dropped; only the engine key remains in context
    expect(Array.isArray(recorded[0].context)).toBe(false);
    expect(recorded[0].context.engine).toBe("PPGTestEngine");
  });

  // ---- ADVERSARIAL 2: lineage_id snake_case alias is honored + passed to the bus ----
  it("honors the lineage_id snake_case alias and forwards it to the bus", async () => {
    recorded = [];
    const r = await call(handler, "pp_outcome_emit", {
      engine: "PPGTestEngine",
      recommended: "G0 X0\nM30",
      lineage_id: "LIN-PP-XYZ",
    });
    expect(r.ok).toBe(true);
    expect(recorded[0].lineage_id).toBe("LIN-PP-XYZ");
  });
});
