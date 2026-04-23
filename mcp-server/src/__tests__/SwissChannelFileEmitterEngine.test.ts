/**
 * SwissChannelFileEmitterEngine — per-engine tests (MS6a / U-LPM01)
 */
import { describe, it, expect } from "vitest";
import {
  swissChannelFileEmitterEngine,
  type SwissDialect,
} from "../engines/SwissChannelFileEmitterEngine.js";

const DIALECTS: SwissDialect[] = ["citizen", "star", "tsugami", "mazak", "dmg_mori"];

function baseChannels() {
  return [
    {
      channel_id: 1,
      label: "main",
      body: [
        "(op=m1) T0101",
        "G96 S220 M03",
        "G00 X30.0 Z2.0",
        "G01 X25.0 Z-40.0 F0.25",
        "G00 X35.0 Z5.0",
      ],
      tools: [{ number: 1, offset: 1, label: "OD_ROUGH" }],
    },
    {
      channel_id: 2,
      label: "sub",
      body: [
        "(op=s1) T0202",
        "G97 S1800 M04",
        "G00 X10.0 Z1.0",
        "G01 Z-15.0 F0.08",
        "G00 Z5.0",
      ],
      tools: [{ number: 2, offset: 2, label: "BORE" }],
    },
  ];
}

function baseSync() {
  return [
    { after_op: "m1", wait_channels: [1, 2], type: "generic" as const },
    { after_op: "s1", wait_channels: [1, 2], type: "generic" as const },
  ];
}

describe("SwissChannelFileEmitterEngine", () => {
  it.each(DIALECTS)("dialect %s — emits at least one non-empty channel file", (dialect) => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect,
      program_number: 1234,
      program_comment: "TEST",
      channels: baseChannels(),
      sync_points: baseSync(),
      cycle_time_est_min: 1.25,
    });
    expect(r.channel_files.length).toBeGreaterThan(0);
    expect(r.channel_files[0]!.text.length).toBeGreaterThan(0);
  });

  it.each(DIALECTS)("dialect %s — sync_points_emitted matches number of syncs in participating channels", (dialect) => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect,
      program_number: 1,
      channels: baseChannels(),
      sync_points: baseSync(),
    });
    // Each sync references 2 channels × 2 syncs = 4 emitted lines total.
    expect(r.sync_points_emitted).toBe(4);
  });

  it("Citizen emits !L / !R sync tokens", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1,
      channels: baseChannels(),
      sync_points: baseSync(),
    });
    const all = r.channel_files.map((f) => f.text).join("\n");
    expect(all).toMatch(/!L\d{3}/);
    expect(all).toMatch(/!R\d{3}/);
  });

  it("Star emits M200 / M201 markers in a single merged file", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "star",
      program_number: 1,
      channels: baseChannels(),
      sync_points: baseSync(),
    });
    expect(r.channel_files_separate).toBe(false);
    expect(r.channel_files.length).toBe(1);
    const text = r.channel_files[0]!.text;
    expect(text).toMatch(/M200/);
    expect(text).toMatch(/M201/);
  });

  it("Mazak emits WAITM(id,ch) tokens", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "mazak",
      program_number: 1,
      channels: baseChannels(),
      sync_points: baseSync(),
    });
    expect(r.channel_files[0]!.text).toMatch(/WAITM\(\d{3},\d+\)/);
  });

  it("DMG MORI emits CHANDATA + WAITM with full channel list", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "dmg_mori",
      program_number: 1,
      channels: baseChannels(),
      sync_points: baseSync(),
    });
    const text = r.channel_files[0]!.text;
    expect(text).toMatch(/CHANDATA\(1\)/);
    expect(text).toMatch(/CHANDATA\(2\)/);
    expect(text).toMatch(/WAITM\(\d{3},1,2\)/);
  });

  it("Tsugami uses M96 / M97 + $1 / $2 headers in separate files", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "tsugami",
      program_number: 1,
      channels: baseChannels(),
      sync_points: baseSync(),
    });
    expect(r.channel_files.length).toBe(2);
    const ch1 = r.channel_files.find((f) => f.channel_id === 1)!.text;
    const ch2 = r.channel_files.find((f) => f.channel_id === 2)!.text;
    expect(ch1).toMatch(/\(\$1\)/);
    expect(ch2).toMatch(/\(\$2\)/);
    expect(ch1 + ch2).toMatch(/M96|M97/);
  });

  it("warns when a sync point references fewer than 2 channels", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1,
      channels: baseChannels(),
      sync_points: [{ after_op: "m1", wait_channels: [1], type: "generic" as const }],
    });
    expect(r.warnings.some((w) => /at least 2 channels/.test(w))).toBe(true);
  });

  it("warns when a sync point references an unknown channel", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "mazak",
      program_number: 1,
      channels: baseChannels(),
      sync_points: [{ after_op: "m1", wait_channels: [1, 9], type: "generic" as const }],
    });
    expect(r.warnings.some((w) => /unknown channel 9/.test(w))).toBe(true);
  });

  it("handles empty channel input without throwing", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1,
      channels: [],
      sync_points: [],
    });
    expect(r.channel_files.length).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("single-channel input adds a note and skips sync weaving", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1,
      channels: [baseChannels()[0]!],
      sync_points: [],
    });
    expect(r.notes.some((n) => /Single-channel/.test(n))).toBe(true);
    expect(r.channel_files.length).toBe(1);
  });

  it("filenames carry a zero-padded 4-digit program number", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 7,
      channels: baseChannels(),
      sync_points: baseSync(),
    });
    expect(r.channel_files[0]!.filename).toMatch(/O0007/);
  });

  it("includes cycle-time estimate comment when provided", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "mazak",
      program_number: 1,
      channels: baseChannels(),
      sync_points: baseSync(),
      cycle_time_est_min: 2.34,
    });
    expect(r.channel_files[0]!.text).toMatch(/CYCLE TIME EST: 2\.34 min/);
  });

  it("sync appended with warning when no anchor op comment matches", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "mazak",
      program_number: 1,
      channels: [
        { channel_id: 1, body: ["G00 X0 Z0"], tools: [] },
        { channel_id: 2, body: ["G00 X10 Z0"], tools: [] },
      ],
      sync_points: [{ after_op: "ghost_op", wait_channels: [1, 2], type: "generic" }],
    });
    expect(r.warnings.some((w) => /ghost_op/.test(w))).toBe(true);
    const text = r.channel_files[0]!.text;
    expect(text).toMatch(/WAITM/);
  });
});
