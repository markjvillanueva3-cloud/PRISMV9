/**
 * SyncCodeVerificationEngine Test Suite
 */
import { describe, it, expect } from "vitest";
import { syncCodeVerificationEngine } from "../engines/SyncCodeVerificationEngine.js";

describe("SyncCodeVerificationEngine", () => {
  it("returns is_valid=true for clean paired Okuma sync", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["G0 X10", "G126 P1", "G1 Z-5 F0.1", "G127 P2"] },
        { channel: 2, lines: ["G0 X20", "G127 P1", "G1 Z-10 F0.1", "G126 P2"] },
      ],
      "okuma"
    );
    expect(r.is_valid).toBe(true);
    expect(r.issues.filter((i) => i.severity === "critical").length).toBe(0);
  });

  it("detects orphan wait (no matching signal)", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["G126 P99", "G0 X0"] },
        { channel: 2, lines: ["G0 X0"] },
      ],
      "okuma"
    );
    expect(r.issues.some((i) => i.kind === "orphan")).toBe(true);
    expect(r.is_valid).toBe(false);
  });

  it("counts sync points correctly", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["G126 P1", "G127 P2"] },
        { channel: 2, lines: ["G127 P1", "G126 P2"] },
      ],
      "okuma"
    );
    expect(r.total_sync_points).toBe(4);
  });

  it("tracks work distribution per channel", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["G0", "G1", "G1", "G0"] },
        { channel: 2, lines: ["G0", "G1"] },
      ],
      "okuma"
    );
    expect(r.channel_work_distribution[1]).toBe(4);
    expect(r.channel_work_distribution[2]).toBe(2);
  });

  it("flags starvation when one channel does <20% of work", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: Array(100).fill("G1 X1") },
        { channel: 2, lines: ["G1 X1"] }, // 1% of channel 1
      ],
      "okuma"
    );
    expect(r.issues.some((i) => i.kind === "starvation")).toBe(true);
  });

  it("skips comment lines", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["(Comment line)", "G0 X0"] },
        { channel: 2, lines: ["(Another comment)", "G0 X0"] },
      ],
      "okuma"
    );
    expect(r.total_sync_points).toBe(0);
  });

  it("handles Fanuc WAITF/POST dialect", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["WAITF(1)", "G0 X0", "POST(2)"] },
        { channel: 2, lines: ["POST(1)", "G0 X0", "WAITF(2)"] },
      ],
      "fanuc"
    );
    expect(r.total_sync_points).toBe(4);
    expect(r.is_valid).toBe(true);
  });

  it("handles Mazak !L marker dialect", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["!L1", "G0 X0"] },
        { channel: 2, lines: ["!L1", "G0 X0"] },
      ],
      "mazak"
    );
    // Marker L1 used in both channels → valid
    expect(r.is_valid).toBe(true);
  });

  it("detects Mazak marker used in only one channel", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["!L1", "G0 X0"] },
        { channel: 2, lines: ["G0 X0"] },
      ],
      "mazak"
    );
    expect(r.issues.some((i) => i.kind === "orphan")).toBe(true);
  });

  it("handles Siemens WAITM/SIGNAL dialect", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["WAITM(1)", "G0 X0"] },
        { channel: 2, lines: ["SIGNAL(1)", "G0 X0"] },
      ],
      "siemens"
    );
    expect(r.total_sync_points).toBe(2);
  });

  it("flags dead-code signals with no matching wait", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["G0 X0", "G127 P5"] },
        { channel: 2, lines: ["G0 X0"] },
      ],
      "okuma"
    );
    expect(r.issues.some((i) => i.kind === "missing_pair")).toBe(true);
  });

  it("records channels_analyzed count", () => {
    const r = syncCodeVerificationEngine.verify(
      [
        { channel: 1, lines: ["G0"] },
        { channel: 2, lines: ["G0"] },
        { channel: 3, lines: ["G0"] },
      ],
      "okuma"
    );
    expect(r.channels_analyzed).toBe(3);
  });

  it("getStats lists supported dialects", () => {
    const stats = syncCodeVerificationEngine.getStats();
    expect(stats.supported_dialects).toContain("okuma");
    expect(stats.supported_dialects).toContain("fanuc");
    expect(stats.supported_dialects).toContain("mazak");
    expect(stats.supported_dialects).toContain("siemens");
  });

  it("handles empty channel programs", () => {
    const r = syncCodeVerificationEngine.verify(
      [{ channel: 1, lines: [] }],
      "okuma"
    );
    expect(r.total_sync_points).toBe(0);
  });
});
