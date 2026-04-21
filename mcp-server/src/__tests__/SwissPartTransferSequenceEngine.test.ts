/**
 * SwissPartTransferSequenceEngine — per-engine tests (MS6a / U-LPM03)
 */
import { describe, it, expect } from "vitest";
import { swissPartTransferSequenceEngine } from "../engines/SwissPartTransferSequenceEngine.js";
import type { SwissDialect } from "../engines/SwissChannelFileEmitterEngine.js";

const DIALECTS: SwissDialect[] = ["citizen", "star", "tsugami", "mazak", "dmg_mori"];

const base = {
  main_rpm: 1500,
  sub_rpm: 1500,
  grip_z_mm: -5.0,
  cutoff_z_mm: -6.5,
  cutoff_feed_mm_rev: 0.05,
  retract_z_mm: 20.0,
  sensor_confirm: true,
};

describe("SwissPartTransferSequenceEngine", () => {
  it.each(DIALECTS)("dialect %s — emits a non-trivial ordered step list", (dialect) => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect });
    expect(r.steps.length).toBeGreaterThan(8);
    expect(r.main_lines.length).toBeGreaterThan(0);
    expect(r.sub_lines.length).toBeGreaterThan(0);
  });

  it.each(DIALECTS)("dialect %s — emits exactly 3 sync points ending with release", (dialect) => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect });
    expect(r.sync_points).toHaveLength(3);
    expect(r.sync_points[0]!.after_op).toBe("transfer:safe-pos");
    expect(r.sync_points[1]!.after_op).toBe("transfer:grip-confirmed");
    expect(r.sync_points[2]!.after_op).toBe("transfer:released");
    for (const sp of r.sync_points) {
      expect(sp.wait_channels).toEqual([1, 2]);
      expect(sp.type).toBe("part_transfer");
    }
  });

  it("invariant: grip sync precedes cutoff feed on main channel", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect: "citizen" });
    const gripIdx = r.main_lines.findIndex((l) => l.includes("702"));
    const cutoffIdx = r.main_lines.findIndex((l) => l.startsWith("G01 X0.0 F"));
    expect(gripIdx).toBeGreaterThan(-1);
    expect(cutoffIdx).toBeGreaterThan(-1);
    expect(gripIdx).toBeLessThan(cutoffIdx);
  });

  it("invariant: sub-collet clamp precedes grip-confirmed sync on sub channel", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect: "citizen" });
    const clampIdx = r.sub_lines.findIndex((l) => l.trim() === "M11");
    const gripSyncIdx = r.sub_lines.findIndex((l) => l.includes("702"));
    expect(clampIdx).toBeGreaterThan(-1);
    expect(gripSyncIdx).toBeGreaterThan(-1);
    expect(clampIdx).toBeLessThan(gripSyncIdx);
  });

  it("throws when phase_sync=true but main_rpm !== sub_rpm", () => {
    expect(() =>
      swissPartTransferSequenceEngine.generate({
        ...base,
        dialect: "mazak",
        main_rpm: 1200,
        sub_rpm: 1500,
        phase_sync: true,
      }),
    ).toThrow(/Phase-sync/);
  });

  it("phase_sync=true on Mazak emits G114.1 (synchronous mode)", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...base,
      dialect: "mazak",
      phase_sync: true,
    });
    expect(r.steps.some((s) => s.gcode.includes("G114.1"))).toBe(true);
    expect(r.steps.some((s) => s.gcode === "G113")).toBe(true);
  });

  it("phase_sync=true on Citizen emits GRSYNC / GRSYNCE pair", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...base,
      dialect: "citizen",
      phase_sync: true,
    });
    expect(r.steps.some((s) => s.gcode === "GRSYNC")).toBe(true);
    expect(r.steps.some((s) => s.gcode === "GRSYNCE")).toBe(true);
  });

  it("bar_pull_after=true appends bar-pull comment on chuck open", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...base,
      dialect: "star",
      bar_pull_after: true,
    });
    expect(r.main_lines.some((l) => /bar pull/.test(l))).toBe(true);
  });

  it("warns when cutoff_z_mm >= grip_z_mm (invalid geometry)", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...base,
      dialect: "dmg_mori",
      cutoff_z_mm: -4.0, // > grip_z_mm
    });
    expect(r.warnings.some((w) => /grip_z_mm/.test(w))).toBe(true);
  });

  it("warns when collet_mu is outside the typical 0.10–0.30 band", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect: "citizen", collet_mu: 0.05 });
    expect(r.warnings.some((w) => /collet_mu/.test(w))).toBe(true);
  });

  it("retract_z_mm value appears in the final G00 line on sub channel", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect: "tsugami", retract_z_mm: 42.0 });
    expect(r.sub_lines.some((l) => l.includes("Z42.000"))).toBe(true);
  });

  it("sensor_confirm=true inserts a dialect-specific sensor-wait code", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect: "citizen", sensor_confirm: true });
    expect(r.sub_lines).toContain("M38");
  });

  it("sensor_confirm=false omits the sensor-wait code", () => {
    const r = swissPartTransferSequenceEngine.generate({ ...base, dialect: "citizen", sensor_confirm: false });
    expect(r.sub_lines).not.toContain("M38");
  });
});
