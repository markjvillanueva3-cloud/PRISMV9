/**
 * LATHE-PRO-MS6a — Multi-Channel G-Code Emission Tests
 *
 * Covers U-LPM01..U-LPM03:
 *   - SwissChannelFileEmitterEngine  (U-LPM01, 5 dialects)
 *   - SyncCodeVerificationEngine.verifySchedule (U-LPM02)
 *   - SwissPartTransferSequenceEngine (U-LPM03, 5 dialects)
 *
 * Target: 15+ tests per MS6a exit gate.
 */
import { describe, it, expect } from "vitest";
import {
  swissChannelFileEmitterEngine,
  type SwissDialect,
} from "../engines/SwissChannelFileEmitterEngine.js";
import { syncCodeVerificationEngine } from "../engines/SyncCodeVerificationEngine.js";
import { swissPartTransferSequenceEngine } from "../engines/SwissPartTransferSequenceEngine.js";

const DIALECTS: SwissDialect[] = ["citizen", "star", "tsugami", "mazak", "dmg_mori"];

function sampleChannels() {
  return [
    {
      channel_id: 1,
      label: "main",
      body: [
        "(op=m_turn1) T0101",
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
        "(op=s_bore1) T0202",
        "G97 S1800 M04",
        "G00 X10.0 Z1.0",
        "G01 Z-15.0 F0.08",
        "G00 Z5.0",
      ],
      tools: [{ number: 2, offset: 2, label: "BORE" }],
    },
  ];
}

function sampleSync() {
  return [
    { after_op: "m_turn1", wait_channels: [1, 2], type: "generic" as const },
    { after_op: "s_bore1", wait_channels: [1, 2], type: "generic" as const },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// 1. SwissChannelFileEmitterEngine — per-dialect emission (U-LPM01)
// ═══════════════════════════════════════════════════════════════════
describe("SwissChannelFileEmitterEngine (U-LPM01)", () => {
  it.each(DIALECTS)("emits a non-empty file for dialect %s", (dialect) => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect,
      program_number: 1234,
      program_comment: "TEST",
      channels: sampleChannels(),
      sync_points: sampleSync(),
      cycle_time_est_min: 1.25,
    });
    expect(r.channel_files.length).toBeGreaterThan(0);
    expect(r.channel_files[0]!.text.length).toBeGreaterThan(0);
    expect(r.sync_points_emitted).toBeGreaterThan(0);
    // Dialects with separate-file layout emit one file per channel.
    const separate = dialect === "citizen" || dialect === "tsugami";
    expect(r.channel_files_separate).toBe(separate);
    expect(r.channel_files.length).toBe(separate ? 2 : 1);
  });

  it("Citizen uses !L / !R sync tokens", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1,
      channels: sampleChannels(),
      sync_points: sampleSync(),
    });
    const all = r.channel_files.map((f) => f.text).join("\n");
    expect(all).toMatch(/!L\d{3}/);
    expect(all).toMatch(/!R\d{3}/);
  });

  it("Star emits M200 / M201 markers in a single merged file", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "star",
      program_number: 1,
      channels: sampleChannels(),
      sync_points: sampleSync(),
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
      channels: sampleChannels(),
      sync_points: sampleSync(),
    });
    expect(r.channel_files[0]!.text).toMatch(/WAITM\(\d{3},\d+\)/);
  });

  it("DMG MORI emits CHANDATA(n) channel headers + WAITM markers", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "dmg_mori",
      program_number: 1,
      channels: sampleChannels(),
      sync_points: sampleSync(),
    });
    const text = r.channel_files[0]!.text;
    expect(text).toMatch(/CHANDATA\(1\)/);
    expect(text).toMatch(/CHANDATA\(2\)/);
    expect(text).toMatch(/WAITM\(\d{3},1,2\)/);
  });

  it("Tsugami emits M96 / M97 + $1 / $2 headers in separate files", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "tsugami",
      program_number: 1,
      channels: sampleChannels(),
      sync_points: sampleSync(),
    });
    expect(r.channel_files.length).toBe(2);
    const ch1 = r.channel_files.find((f) => f.channel_id === 1)!.text;
    const ch2 = r.channel_files.find((f) => f.channel_id === 2)!.text;
    expect(ch1).toMatch(/\(\$1\)/);
    expect(ch2).toMatch(/\(\$2\)/);
    expect(ch1 + ch2).toMatch(/M96|M97/);
  });

  it("flags sync point with only 1 channel as warning (unpaired)", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1,
      channels: sampleChannels(),
      sync_points: [
        { after_op: "m_turn1", wait_channels: [1], type: "generic" as const },
      ],
    });
    expect(r.warnings.some((w) => /at least 2 channels/.test(w))).toBe(true);
  });

  it("handles empty channels input without throwing", () => {
    const r = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1,
      channels: [],
      sync_points: [],
    });
    expect(r.channel_files.length).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. SyncCodeVerificationEngine.verifySchedule — pre-emission check (U-LPM02)
// ═══════════════════════════════════════════════════════════════════
describe("SyncCodeVerificationEngine.verifySchedule (U-LPM02)", () => {
  it("accepts a well-formed schedule as safe", () => {
    const r = syncCodeVerificationEngine.verifySchedule({
      sync_points: [{ after_op: "a", wait_channels: [1, 2], type: "generic" }],
      ops: [
        { op_id: "a", channel_id: 1, start_s: 0, end_s: 10, end_position: { retracted: true } },
        { op_id: "b", channel_id: 2, start_s: 10, end_s: 20, end_position: { retracted: true }, depends_on: ["a"] },
      ],
    });
    expect(r.is_safe).toBe(true);
    expect(r.critical_count).toBe(0);
  });

  it("flags unmatched-pair sync as critical", () => {
    const r = syncCodeVerificationEngine.verifySchedule({
      sync_points: [{ after_op: "a", wait_channels: [1], type: "generic" }],
      ops: [
        { op_id: "a", channel_id: 1, start_s: 0, end_s: 10 },
        { op_id: "b", channel_id: 2, start_s: 0, end_s: 5 },
      ],
    });
    expect(r.is_safe).toBe(false);
    expect(r.violations.some((v) => v.kind === "unmatched_pair")).toBe(true);
  });

  it("detects cross-channel deadlock cycle", () => {
    const r = syncCodeVerificationEngine.verifySchedule({
      sync_points: [],
      ops: [
        { op_id: "a", channel_id: 1, start_s: 0, end_s: 5, depends_on: ["b"] },
        { op_id: "b", channel_id: 2, start_s: 0, end_s: 5, depends_on: ["a"] },
      ],
    });
    expect(r.is_safe).toBe(false);
    expect(r.violations.some((v) => v.kind === "deadlock_cycle")).toBe(true);
  });

  it("flags unsafe (non-retracted) position at sync", () => {
    const r = syncCodeVerificationEngine.verifySchedule({
      sync_points: [{ after_op: "a", wait_channels: [1, 2], type: "generic" }],
      ops: [
        { op_id: "a", channel_id: 1, start_s: 0, end_s: 10, end_position: { retracted: false } },
        { op_id: "b", channel_id: 2, start_s: 0, end_s: 9, end_position: { retracted: true } },
      ],
    });
    expect(r.violations.some((v) => v.kind === "unsafe_position")).toBe(true);
  });

  it("flags unknown-channel reference as critical", () => {
    const r = syncCodeVerificationEngine.verifySchedule({
      sync_points: [{ after_op: "a", wait_channels: [1, 9], type: "generic" }],
      ops: [{ op_id: "a", channel_id: 1, start_s: 0, end_s: 5 }],
    });
    expect(r.is_safe).toBe(false);
    expect(r.violations.some((v) => v.kind === "unknown_channel")).toBe(true);
  });

  it("summary text reflects verdict (safe / warning / block)", () => {
    const safe = syncCodeVerificationEngine.verifySchedule({
      sync_points: [{ after_op: "a", wait_channels: [1, 2], type: "generic" }],
      ops: [
        { op_id: "a", channel_id: 1, start_s: 0, end_s: 1, end_position: { retracted: true } },
        { op_id: "b", channel_id: 2, start_s: 0, end_s: 1, end_position: { retracted: true } },
      ],
    });
    expect(safe.summary).toMatch(/OK/);
    const block = syncCodeVerificationEngine.verifySchedule({
      sync_points: [{ after_op: "a", wait_channels: [1], type: "generic" }],
      ops: [{ op_id: "a", channel_id: 1, start_s: 0, end_s: 1 }],
    });
    expect(block.summary).toMatch(/BLOCK/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. SwissPartTransferSequenceEngine (U-LPM03)
// ═══════════════════════════════════════════════════════════════════
describe("SwissPartTransferSequenceEngine (U-LPM03)", () => {
  const baseInput = {
    main_rpm: 1500,
    sub_rpm: 1500,
    grip_z_mm: -5.0,
    cutoff_z_mm: -6.5,
    cutoff_feed_mm_rev: 0.05,
    retract_z_mm: 20.0,
    sensor_confirm: true,
  };

  it.each(DIALECTS)("emits ordered steps for dialect %s", (dialect) => {
    const r = swissPartTransferSequenceEngine.generate({ ...baseInput, dialect });
    expect(r.steps.length).toBeGreaterThan(8);
    expect(r.main_lines.length).toBeGreaterThan(0);
    expect(r.sub_lines.length).toBeGreaterThan(0);
    expect(r.sync_points).toHaveLength(3);
    // The LAST sync point must be release.
    expect(r.sync_points[2]!.after_op).toBe("transfer:released");
  });

  it("invariant: grip sync appears BEFORE cutoff feed on main channel", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...baseInput, dialect: "citizen" });
    // Find the line index of the grip-confirmed sync on MAIN (!R702).
    const gripIdx = r.main_lines.findIndex((l) => l.includes("702"));
    const cutoffIdx = r.main_lines.findIndex((l) => l.startsWith("G01 X0.0 F"));
    expect(gripIdx).toBeGreaterThan(-1);
    expect(cutoffIdx).toBeGreaterThan(-1);
    expect(gripIdx).toBeLessThan(cutoffIdx);
  });

  it("invariant: sub-collet clamp appears BEFORE grip-confirmed sync on sub channel", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...baseInput, dialect: "citizen" });
    const clampIdx = r.sub_lines.findIndex((l) => l.trim() === "M11");
    const gripSyncIdx = r.sub_lines.findIndex((l) => l.includes("702"));
    expect(clampIdx).toBeGreaterThan(-1);
    expect(gripSyncIdx).toBeGreaterThan(-1);
    expect(clampIdx).toBeLessThan(gripSyncIdx);
  });

  it("throws when phase_sync=true but main_rpm != sub_rpm", () => {
    expect(() =>
      swissPartTransferSequenceEngine.generate({
        ...baseInput,
        dialect: "mazak",
        main_rpm: 1200,
        sub_rpm: 1500,
        phase_sync: true,
      }),
    ).toThrow(/Phase-sync/);
  });

  it("phase_sync=true emits G114.1 / GRSYNC depending on dialect", () => {
    const rMazak = swissPartTransferSequenceEngine.generate({
      ...baseInput,
      dialect: "mazak",
      phase_sync: true,
    });
    expect(rMazak.steps.some((s) => s.gcode.includes("G114.1"))).toBe(true);

    const rCitizen = swissPartTransferSequenceEngine.generate({
      ...baseInput,
      dialect: "citizen",
      phase_sync: true,
    });
    expect(rCitizen.steps.some((s) => s.gcode === "GRSYNC")).toBe(true);
  });

  it("bar_pull_after=true appends bar-pull comment to main chuck-open", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...baseInput,
      dialect: "star",
      bar_pull_after: true,
    });
    const line = r.main_lines.find((l) => l.includes("bar pull"));
    expect(line).toBeTruthy();
  });

  it("warns when cutoff_z_mm >= grip_z_mm (invalid geometry)", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...baseInput,
      dialect: "dmg_mori",
      cutoff_z_mm: -4.0, // > grip_z_mm of -5.0
    });
    expect(r.warnings.some((w) => /grip_z_mm/.test(w))).toBe(true);
  });

  it("returns matching per-dialect retract Z-position in sub_lines", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...baseInput,
      dialect: "tsugami",
      retract_z_mm: 42.0,
    });
    expect(r.sub_lines.some((l) => l.includes("Z42.000"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Integration — transfer sequence + schedule verification round-trip
// ═══════════════════════════════════════════════════════════════════
describe("MS6a integration — transfer sequence + schedule verifier", () => {
  it("transfer sync points pass verifySchedule with matched pairs", () => {
    const t = swissPartTransferSequenceEngine.generate({
      dialect: "mazak",
      main_rpm: 1500,
      sub_rpm: 1500,
      grip_z_mm: -5.0,
      cutoff_z_mm: -6.5,
      cutoff_feed_mm_rev: 0.05,
      retract_z_mm: 20.0,
    });
    const r = syncCodeVerificationEngine.verifySchedule({
      sync_points: t.sync_points,
      ops: [
        { op_id: "transfer:safe-pos", channel_id: 1, start_s: 0, end_s: 0.1, end_position: { retracted: true } },
        { op_id: "transfer:grip-confirmed", channel_id: 2, start_s: 0.1, end_s: 0.5, end_position: { retracted: false } },
        { op_id: "transfer:released", channel_id: 1, start_s: 0.5, end_s: 1.0, end_position: { retracted: true } },
      ],
    });
    // The grip-confirmed sync will flag "unsafe_position" as warning — that's expected because
    // the sub spindle is intentionally at the grip position (not retracted) at that sync point.
    expect(r.is_safe).toBe(true);
  });
});
