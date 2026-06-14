import { describe, it, expect } from "vitest";
import {
  threadingServoSyncVerifierEngine as eng,
  ThreadingServoSyncVerifierEngine,
  type ThreadingServoSyncInput,
} from "../engines/ThreadingServoSyncVerifierEngine.js";

function nominal(o: Partial<ThreadingServoSyncInput> = {}): ThreadingServoSyncInput {
  return {
    mode: "g76",
    spindle_rpm: 800,
    thread_lead_mm: 1.5,           // M10 metric
    spindle_encoder_ppr: 4096,     // high-end
    servo_bandwidth_hz: 200,       // > 6 × 800/60 = 80 Hz
    z_rapid_mm_min: 15000,         // > 800 × 1.5 = 1200 mm/min
    z_accel_mm_s2: 2000,           // > 1200 × 800 / 3600 = 267 mm/s²
    ...o,
  };
}

describe("ThreadingServoSyncVerifierEngine", () => {
  it("exports a singleton with verify()", () => {
    expect(eng).toBeInstanceOf(ThreadingServoSyncVerifierEngine);
    expect(typeof eng.verify).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.verify({} as ThreadingServoSyncInput)).toThrow(/mode \+ spindle_rpm \+ thread_lead_mm required/);
  });

  it("throws on non-positive spindle_rpm or thread_lead", () => {
    expect(() => eng.verify(nominal({ spindle_rpm: 0 }))).toThrow(/positive/);
    expect(() => eng.verify(nominal({ thread_lead_mm: -1 }))).toThrow(/positive/);
  });

  it("verified verdict when all metrics pass with > 10% margin", () => {
    const r = eng.verify(nominal());
    expect(r.verdict).toBe("verified");
    expect(r.failure_reasons).toEqual([]);
    expect(r.checks.encoder_resolution.pass).toBe(true);
    expect(r.checks.servo_bandwidth.pass).toBe(true);
    expect(r.checks.z_feed_capability.pass).toBe(true);
    expect(r.checks.z_accel_headroom.pass).toBe(true);
    expect(r.checks.c_axis_for_rigid.pass).toBe(true);
  });

  it("rejected when spindle encoder < 1024 PPR", () => {
    const r = eng.verify(nominal({ spindle_encoder_ppr: 512 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.encoder_resolution.pass).toBe(false);
    expect(r.failure_reasons.some(f => /encoder.*512.*PPR/.test(f))).toBe(true);
  });

  it("rejected when servo bandwidth < 6× spindle Hz", () => {
    // spindle 800 RPM = 13.33 Hz; req bw = 80 Hz; provide 50 Hz
    const r = eng.verify(nominal({ servo_bandwidth_hz: 50 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.servo_bandwidth.pass).toBe(false);
    expect(r.failure_reasons.some(f => /bandwidth.*Nyquist/.test(f))).toBe(true);
  });

  it("rejected when Z rapid traverse < thread_lead × spindle_rpm", () => {
    // 1.5 mm × 800 RPM = 1200 mm/min required; provide 800 mm/min
    const r = eng.verify(nominal({ z_rapid_mm_min: 800 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.z_feed_capability.pass).toBe(false);
  });

  it("rejected when Z acceleration insufficient for 1-rev catch-up", () => {
    // accel req = 1200 × 800 / 3600 = 266.67 mm/s²; provide 100
    const r = eng.verify(nominal({ z_accel_mm_s2: 100 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.z_accel_headroom.pass).toBe(false);
  });

  it("unsafe verdict when rigid_tap requested but C-axis disabled", () => {
    const r = eng.verify(nominal({ mode: "rigid_tap", c_axis_enabled: false }));
    expect(r.verdict).toBe("unsafe");
    expect(r.checks.c_axis_for_rigid.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Rigid tap.*C-axis/.test(f))).toBe(true);
  });

  it("rigid_tap passes when C-axis enabled and all metrics in spec", () => {
    const r = eng.verify(nominal({ mode: "rigid_tap", c_axis_enabled: true }));
    expect(r.verdict).toBe("verified");
    expect(r.checks.c_axis_for_rigid.pass).toBe(true);
  });

  it("marginal verdict when bandwidth within 10% of threshold", () => {
    // 800 RPM → 80 Hz required; 85 Hz is 6.25% margin (< 10%)
    const r = eng.verify(nominal({ servo_bandwidth_hz: 85 }));
    expect(r.verdict).toBe("marginal");
    expect(r.warnings.some(w => /10% of threshold/.test(w))).toBe(true);
  });

  it("required_z_feed_mm_min equals thread_lead × spindle_rpm", () => {
    const r = eng.verify(nominal({ thread_lead_mm: 2.0, spindle_rpm: 600 }));
    expect(r.required_z_feed_mm_min.value).toBe(1200);  // 2.0 × 600
    expect(r.required_z_feed_mm_min.unit).toBe("mm/min");
  });

  it("higher RPM raises servo bandwidth requirement linearly", () => {
    const lo = eng.verify(nominal({ spindle_rpm: 500 }));   // bw req = 50 Hz
    const hi = eng.verify(nominal({ spindle_rpm: 2000 }));  // bw req = 200 Hz
    expect(hi.checks.servo_bandwidth.required_hz).toBeGreaterThan(lo.checks.servo_bandwidth.required_hz);
  });

  it("g33 mode does not require C-axis", () => {
    const r = eng.verify(nominal({ mode: "g33", c_axis_enabled: false }));
    expect(r.checks.c_axis_for_rigid.required).toBe(false);
    expect(r.checks.c_axis_for_rigid.pass).toBe(true);
    expect(r.verdict).toBe("verified");
  });

  it("multiple failures accumulated in failure_reasons", () => {
    const r = eng.verify(nominal({
      spindle_encoder_ppr: 256,
      servo_bandwidth_hz: 20,
      z_rapid_mm_min: 100,
    }));
    expect(r.verdict).toBe("rejected");
    expect(r.failure_reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("source cites ISO 5404 + Sandvik T-Max-U + Fanuc + Okuma", () => {
    const r = eng.verify(nominal());
    expect(r.source).toMatch(/ISO 5404|Sandvik T-Max-U|Fanuc|Okuma/);
  });
});
