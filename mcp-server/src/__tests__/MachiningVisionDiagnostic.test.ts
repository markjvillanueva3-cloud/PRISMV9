/**
 * MachiningVisionDiagnosticEngine tests (hotel iter26).
 * Concrete assertions on every diagnostic rule + safety gates.
 */

import { describe, it, expect } from "vitest";
import {
  MachiningVisionDiagnosticEngine,
  FakeVisionAdapter,
  NotWiredVisionAdapter,
  ISSUE_CONFIDENCE_FLOOR,
  AUTO_APPROVE_CONFIDENCE_FLOOR,
  SAFE_DELTA_AUTO,
  HARD_DELTA_CAP,
  type ChipObservation,
  type PartObservation,
  type ToolObservation,
} from "../engines/MachiningVisionDiagnosticEngine.js";

function chipObs(o: Partial<ChipObservation>): ChipObservation {
  return {
    subject: "chip",
    color: o.color ?? "blue",
    shape: o.shape ?? "short_c",
    thickness_estimate: o.thickness_estimate,
    confidence: o.confidence ?? 0.90,
  };
}
function partObs(o: Partial<PartObservation>): PartObservation {
  return {
    subject: "part",
    surface_quality: o.surface_quality ?? "good",
    dimensional_drift_detected: o.dimensional_drift_detected,
    confidence: o.confidence ?? 0.90,
  };
}
function toolObs(o: Partial<ToolObservation>): ToolObservation {
  return {
    subject: "tool",
    flank_wear: o.flank_wear ?? "none",
    bue_detected: o.bue_detected,
    edge_chipping: o.edge_chipping,
    crater_wear: o.crater_wear,
    notching_at_doc: o.notching_at_doc,
    confidence: o.confidence ?? 0.90,
  };
}

describe("MachiningVisionDiagnosticEngine — chip diagnostics", () => {
  it("blue short-C chip = ideal roughing state → no adjustments, auto-approves", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([chipObs({ color: "blue", shape: "short_c" })])
    );
    const r = await engine.diagnose(new Uint8Array([1, 2, 3]), { process_type: "roughing" });
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].issue_code).toBe("CHIP_TEMP_IDEAL");
    expect(r.issues[0].severity).toBe("info");
    expect(r.adjustment.speed_multiplier).toBe(1.0);
    expect(r.adjustment.feed_multiplier).toBe(1.0);
    expect(r.requires_operator_confirmation).toBe(false);
  });

  it("burnt black chips → critical, reduce SFM 15% + boost coolant 20%, requires confirmation", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([chipObs({ color: "black", shape: "short_c" })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues[0].issue_code).toBe("CHIP_BURNT");
    expect(r.issues[0].severity).toBe("critical");
    expect(r.adjustment.speed_multiplier).toBeCloseTo(0.85, 3);
    expect(r.adjustment.coolant_flow_multiplier).toBeCloseTo(1.2, 3);
    expect(r.requires_operator_confirmation).toBe(true);
  });

  it("powder/dust chips (too thin) → increase feed 20%, critical severity", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([chipObs({ color: "silver", shape: "powder", thickness_estimate: "too_thin" })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    const thin = r.issues.find((i) => i.issue_code === "CHIP_TOO_THIN");
    expect(thin?.issue_code).toBe("CHIP_TOO_THIN");
    expect(thin?.severity).toBe("critical");
    expect(r.adjustment.feed_multiplier).toBeCloseTo(1.20, 3);
    expect(r.requires_operator_confirmation).toBe(true);
  });

  it("welded BUE chip → increase SFM 25%, warning severity", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([chipObs({ color: "silver", shape: "welded_to_tool" })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues[0].issue_code).toBe("BUE_BUILDUP");
    expect(r.adjustment.speed_multiplier).toBeCloseTo(1.25, 3);
  });
});

describe("MachiningVisionDiagnosticEngine — part diagnostics", () => {
  it("chatter marks → reduce DOC 30% + bump SFM 15% (shift stability lobe)", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([partObs({ surface_quality: "chatter_marks" })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues[0].issue_code).toBe("PART_CHATTER");
    expect(r.adjustment.doc_multiplier).toBeCloseTo(0.70, 3);
    expect(r.adjustment.speed_multiplier).toBeCloseTo(1.15, 3);
  });

  it("heat discoloration on part → reduce SFM 15% + coolant 30%, critical", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([partObs({ surface_quality: "discoloration" })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues[0].issue_code).toBe("PART_HEAT_DAMAGE");
    expect(r.issues[0].severity).toBe("critical");
    expect(r.adjustment.coolant_flow_multiplier).toBeCloseTo(1.30, 3);
  });
});

describe("MachiningVisionDiagnosticEngine — tool diagnostics", () => {
  it("catastrophic flank wear → STOP recommendation, critical, no auto-adjust", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([toolObs({ flank_wear: "catastrophic" })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues[0].issue_code).toBe("TOOL_FAILURE");
    expect(r.issues[0].severity).toBe("critical");
    expect(r.adjustment.recommendations.some((s) => /STOP/i.test(s))).toBe(true);
    expect(r.requires_operator_confirmation).toBe(true);
  });

  it("crater wear on rake → reduce SFM 15%", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([toolObs({ flank_wear: "light", crater_wear: true })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    const crater = r.issues.find((i) => i.issue_code === "TOOL_CRATER");
    expect(crater?.issue_code).toBe("TOOL_CRATER");
    expect(crater?.severity).toBe("warning");
    expect(r.adjustment.speed_multiplier).toBeCloseTo(0.85, 3);
  });

  it("edge chipping → reduce feed 10% AND DOC 10%", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([toolObs({ flank_wear: "none", edge_chipping: true })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues[0].issue_code).toBe("TOOL_EDGE_CHIPPING");
    expect(r.adjustment.feed_multiplier).toBeCloseTo(0.90, 3);
    expect(r.adjustment.doc_multiplier).toBeCloseTo(0.90, 3);
  });
});

describe("MachiningVisionDiagnosticEngine — multi-issue + safety gates", () => {
  it("multi-issue (burnt chip + crater wear) compounds speed reductions", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([
        chipObs({ color: "black" }),
        toolObs({ flank_wear: "none", crater_wear: true }),
      ])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues).toHaveLength(2);
    expect(r.adjustment.speed_multiplier).toBeCloseTo(0.7225, 4); // 0.85 * 0.85
  });

  it("HARD_DELTA_CAP clamps runaway adjustments at 30%", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([
        chipObs({ color: "black" }),
        partObs({ surface_quality: "discoloration" }),
        toolObs({ flank_wear: "light", crater_wear: true }),
      ])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.adjustment.speed_multiplier).toBeCloseTo(1 - HARD_DELTA_CAP, 4);
  });

  it("low-confidence observation routes to queued_low_confidence — NOT to issues[]", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([chipObs({ color: "black", confidence: 0.50 })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues).toHaveLength(0);
    expect(r.queued_low_confidence).toHaveLength(1);
    expect(r.queued_low_confidence[0].issue_code).toBe("CHIP_BURNT");
    expect(r.adjustment.speed_multiplier).toBe(1.0);
  });

  it("non-roughing process_type emits warning but still runs", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([chipObs({ color: "blue" })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "finishing" });
    expect(r.warnings.some((w) => /roughing-tuned/i.test(w))).toBe(true);
    expect(r.issues).toHaveLength(1);
  });

  it("empty vision result returns warning, no issues, default adjustment", async () => {
    const engine = new MachiningVisionDiagnosticEngine(new FakeVisionAdapter([]));
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.observations).toHaveLength(0);
    expect(r.issues).toHaveLength(0);
    expect(r.warnings.some((w) => /vision_returned_empty/i.test(w))).toBe(true);
    expect(r.adjustment.speed_multiplier).toBe(1.0);
  });

  it("NotWiredVisionAdapter fails LOUDLY (R12)", async () => {
    const engine = new MachiningVisionDiagnosticEngine(new NotWiredVisionAdapter());
    await expect(
      engine.diagnose(new Uint8Array([1]), { process_type: "roughing" })
    ).rejects.toThrow(/vision_adapter_not_wired/);
  });

  it("image_sha256 is deterministic + 64-hex", async () => {
    const engine = new MachiningVisionDiagnosticEngine(new FakeVisionAdapter([]));
    const r1 = await engine.diagnose(new Uint8Array([1, 2, 3]), { process_type: "roughing" });
    const r2 = await engine.diagnose(new Uint8Array([1, 2, 3]), { process_type: "roughing" });
    expect(r1.image_sha256).toBe(r2.image_sha256);
    expect(r1.image_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("safety constants align with documented behavior", () => {
    expect(ISSUE_CONFIDENCE_FLOOR).toBe(0.65);
    expect(AUTO_APPROVE_CONFIDENCE_FLOOR).toBe(0.85);
    expect(SAFE_DELTA_AUTO).toBe(0.10);
    expect(HARD_DELTA_CAP).toBe(0.30);
  });

  it("auto-approve gate fires only when delta ≤ SAFE + no critical + confidence ≥ floor", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([chipObs({ color: "straw", shape: "short_c", confidence: 0.90 })])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    expect(r.issues[0].issue_code).toBe("CHIP_TEMP_MARGINAL");
    expect(r.adjustment.speed_multiplier).toBeCloseTo(0.95, 3);
    expect(r.requires_operator_confirmation).toBe(false);
  });

  it("end-to-end: chip + part + tool produces ALL three sets of issues + adjustments", async () => {
    const engine = new MachiningVisionDiagnosticEngine(
      new FakeVisionAdapter([
        chipObs({ color: "blue", shape: "long_spiral" }),
        partObs({ surface_quality: "tearing" }),
        toolObs({ flank_wear: "moderate", bue_detected: true }),
      ])
    );
    const r = await engine.diagnose(new Uint8Array([1]), { process_type: "roughing" });
    const codes = r.issues.map((i) => i.issue_code);
    expect(codes).toContain("CHIP_TEMP_IDEAL");
    expect(codes).toContain("CHIP_CONTROL_POOR");
    expect(codes).toContain("PART_TEARING");
    expect(codes).toContain("TOOL_BUE_BUILDUP");
    expect(r.adjustment.recommendations.length).toBeGreaterThanOrEqual(3);
  });
});
