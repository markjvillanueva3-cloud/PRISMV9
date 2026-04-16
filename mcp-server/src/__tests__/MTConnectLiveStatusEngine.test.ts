import { describe, it, expect } from "vitest";
import { mtConnectLiveStatusEngine } from "../engines/MTConnectLiveStatusEngine.js";

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
