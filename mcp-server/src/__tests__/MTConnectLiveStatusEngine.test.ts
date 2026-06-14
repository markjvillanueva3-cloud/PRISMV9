import { describe, it, expect } from "vitest";
import { mtConnectLiveStatusEngine } from "../engines/MTConnectLiveStatusEngine.js";
import { MACHINE_LIVE_ACTION_SCHEMAS } from "../schemas/machineLiveActionSchemas.js";

describe("MTConnectLiveStatusEngine", () => {
  it("flags ACTIVE execution as running", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [
        { type: "execution", value: "active" },
        { type: "controller_mode", value: "automatic" },
      ],
    });
    expect(r.is_running).toBe(true);
  });

  it("READY is not running", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [
        { type: "execution", value: "ready" },
        { type: "controller_mode", value: "automatic" },
      ],
    });
    expect(r.is_running).toBe(false);
  });

  it("INTERRUPTED is alarm state", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [{ type: "execution", value: "interrupted" }],
    });
    expect(r.is_alarm).toBe(true);
  });

  it("alarm data items feed alarms array", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [{ type: "alarm", value: "SERVO OVERLOAD" }],
    });
    expect(r.alarms.length).toBe(1);
    expect(r.is_alarm).toBe(true);
  });

  it("ignores alarm value 'normal'", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [{ type: "alarm", value: "normal" }],
    });
    expect(r.alarms.length).toBe(0);
  });

  it("progress_pct from current_block / total_blocks", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [
        { type: "execution", value: "active" },
        { type: "current_block", value: 50 },
      ],
      total_blocks: 200,
    });
    expect(r.progress_pct).toBeCloseTo(25, 1);
  });

  it("is_starved when ready in automatic mode", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [
        { type: "execution", value: "ready" },
        { type: "controller_mode", value: "automatic" },
      ],
    });
    expect(r.is_starved).toBe(true);
  });

  it("normalizes controller_mode=auto to automatic", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [{ type: "controller_mode", value: "auto" }],
    });
    expect(r.controller_mode).toBe("automatic");
  });

  it("captures program_name", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [{ type: "program", value: "O1234.NC" }],
    });
    expect(r.program_name).toBe("O1234.NC");
  });

  it("captures spindle rpm", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [{ type: "spindle_speed", value: 3500 }],
    });
    expect(r.spindle_rpm).toBe(3500);
  });

  it("records axis positions when tagged", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [
        { type: "position", axis: "X", value: 10.5 },
        { type: "position", axis: "Z", value: -25.0 },
      ],
    });
    expect(r.axis_positions["X"]).toBe(10.5);
    expect(r.axis_positions["Z"]).toBe(-25.0);
  });

  it("getStats exposes supported execution states", () => {
    const s = mtConnectLiveStatusEngine.getStats();
    expect(s.supported_execution_states).toContain("active");
    expect(s.standard.toLowerCase()).toContain("mtconnect");
  });

  it("unknown execution defaults safely", () => {
    const r = mtConnectLiveStatusEngine.parse({ items: [] });
    expect(r.execution).toBe("unknown");
    expect(r.is_running).toBe(false);
  });

  it("manual_data_input normalizes to mdi", () => {
    const r = mtConnectLiveStatusEngine.parse({
      items: [{ type: "controller_mode", value: "manual_data_input" }],
    });
    expect(r.controller_mode).toBe("mdi");
  });
});

describe("mtconnect_parse_status schema (machineLiveDispatcher wiring)", () => {
  const schema = MACHINE_LIVE_ACTION_SCHEMAS.mtconnect_parse_status;

  it("schema is registered in MACHINE_LIVE_ACTION_SCHEMAS and parses an empty payload", () => {
    expect(typeof schema.parse).toBe("function");
    const parsed = schema.parse({});
    expect(parsed.items).toEqual([]);
  });

  it("accepts items array with string and numeric values", () => {
    const parsed = schema.parse({
      items: [
        { type: "execution", value: "active" },
        { type: "spindle_speed", value: 3500 },
        { type: "position", value: 10.5, axis: "X" },
      ],
    });
    expect(parsed.items.length).toBe(3);
    expect(parsed.items[1].value).toBe(3500);
    expect(parsed.items[2].axis).toBe("X");
  });

  it("accepts total_blocks as positive integer", () => {
    const parsed = schema.parse({ items: [], total_blocks: 200 });
    expect(parsed.total_blocks).toBe(200);
  });

  it("rejects non-integer total_blocks", () => {
    expect(() => schema.parse({ items: [], total_blocks: 12.5 })).toThrow();
  });

  it("rejects negative total_blocks", () => {
    expect(() => schema.parse({ items: [], total_blocks: -1 })).toThrow();
  });

  it("rejects items with missing required fields", () => {
    expect(() => schema.parse({ items: [{ type: "execution" }] })).toThrow();
  });

  it("rejects items with non-string non-number value", () => {
    expect(() => schema.parse({ items: [{ type: "execution", value: { bad: true } }] })).toThrow();
  });

  it("schema output drives parser to expected canonical state", () => {
    const parsed = schema.parse({
      items: [
        { type: "execution", value: "active" },
        { type: "controller_mode", value: "automatic" },
        { type: "current_block", value: 50 },
      ],
      total_blocks: 200,
    });
    const status = mtConnectLiveStatusEngine.parse({
      items: parsed.items,
      total_blocks: parsed.total_blocks,
    });
    expect(status.is_running).toBe(true);
    expect(status.progress_pct).toBeCloseTo(25, 1);
  });

  it("defaults items to empty array when omitted", () => {
    const parsed = schema.parse({});
    expect(parsed.items).toEqual([]);
    const status = mtConnectLiveStatusEngine.parse({ items: parsed.items });
    expect(status.execution).toBe("unknown");
    expect(status.is_running).toBe(false);
  });
});
