import { describe, it, expect } from "vitest";
import {
  midCutDecisionOrchestratorEngine,
  MidCutDecisionOrchestratorEngine,
  type MidCutDecisionInput,
} from "../engines/MidCutDecisionOrchestratorEngine.js";

describe("MidCutDecisionOrchestratorEngine", () => {
  describe("instantiation", () => {
    it("exports a singleton with decide() method", () => {
      expect(midCutDecisionOrchestratorEngine).toBeInstanceOf(MidCutDecisionOrchestratorEngine);
      expect(typeof midCutDecisionOrchestratorEngine.decide).toBe("function");
    });
    it("throws on null input", () => {
      expect(() => midCutDecisionOrchestratorEngine.decide(null as unknown as MidCutDecisionInput))
        .toThrow(/input is required/);
    });
    it("returns continue + warning when no channels provided", () => {
      const r = midCutDecisionOrchestratorEngine.decide({});
      expect(r.verdict).toBe("continue");
      expect(r.warnings.length).toBe(1);
      expect(r.warnings[0]).toMatch(/No channels provided/);
      expect(r.evidence.length).toBe(0);
      expect(r.feed_override_pct.value).toBe(100);
    });
  });

  describe("AE channel", () => {
    it("emits abort on AE breakage class with severity 1.0 + feed=0", () => {
      const r = midCutDecisionOrchestratorEngine.decide({ ae: { class: "breakage" } });
      expect(r.verdict).toBe("abort");
      expect(r.evidence).toHaveLength(1);
      expect(r.evidence[0].channel).toBe("ae");
      expect(r.evidence[0].severity).toBe(1.0);
      expect(r.feed_override_pct.value).toBe(0);
      expect(r.evidence[0].source).toMatch(/Dornfeld|Jemielniak/);
    });
    it("emits pull_off on AE chip class with severity 0.8", () => {
      const r = midCutDecisionOrchestratorEngine.decide({ ae: { class: "chip", anomaly_score: 0.8 } });
      expect(r.verdict).toBe("pull_off");
      expect(r.evidence[0].severity).toBe(0.8);
      expect(r.evidence[0].source).toMatch(/Teti/);
    });
    it("emits reduce_feed on AE wear with feed_override between 40 and 99", () => {
      const r = midCutDecisionOrchestratorEngine.decide({ ae: { class: "wear", rms_sigma: 4 } });
      expect(r.verdict).toBe("reduce_feed");
      expect(r.feed_override_pct.value).toBeLessThan(100);
      expect(r.feed_override_pct.value).toBeGreaterThanOrEqual(40);
      expect(r.evidence[0].severity).toBe(0.5);
    });
    it("emits continue on fresh AE with feed=100", () => {
      const r = midCutDecisionOrchestratorEngine.decide({ ae: { class: "fresh", rms_sigma: 0.5 } });
      expect(r.verdict).toBe("continue");
      expect(r.feed_override_pct.value).toBe(100);
      expect(r.evidence[0].severity).toBe(0);
    });
    it("escalates to pull_off when anomaly_score > 0.7 even on unknown class", () => {
      const r = midCutDecisionOrchestratorEngine.decide({ ae: { anomaly_score: 0.85 } });
      expect(r.verdict).toBe("pull_off");
    });
  });

  describe("Force channel", () => {
    it("emits reduce_feed at force ratio 1.4× and cites Boothroyd", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        force: { tangential_force_n: 700, baseline_force_n: 500 },
      });
      expect(r.verdict).toBe("reduce_feed");
      expect(r.evidence[0].reason).toMatch(/1\.40/);
      expect(r.evidence[0].source).toMatch(/Boothroyd/);
    });
    it("emits pull_off at force ratio 2.0× and cites Sandvik", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        force: { tangential_force_n: 1000, baseline_force_n: 500 },
      });
      expect(r.verdict).toBe("pull_off");
      expect(r.evidence[0].source).toMatch(/Sandvik/);
      expect(r.evidence[0].severity).toBe(0.8);
    });
    it("detects force collapse (ratio 0.1) as pull_off breakage candidate", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        force: { tangential_force_n: 50, baseline_force_n: 500 },
      });
      expect(r.verdict).toBe("pull_off");
      expect(r.evidence[0].reason).toMatch(/collapse|breakage|air cut/);
    });
    it("emits continue when force is within +20% baseline", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        force: { tangential_force_n: 600, baseline_force_n: 500 },
      });
      expect(r.verdict).toBe("continue");
      expect(r.evidence[0].reason).toMatch(/1\.20×/);
    });
  });

  describe("Vibration channel", () => {
    it("emits reduce_feed at RMS ratio 2.5× citing Tobias-Tlusty", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        vibration: { rms_ms2: 25, baseline_rms_ms2: 10 },
      });
      expect(r.verdict).toBe("reduce_feed");
      expect(r.evidence[0].source).toMatch(/Tobias|Tlusty/);
      expect(r.evidence[0].severity).toBe(0.5);
    });
    it("emits pull_off at RMS ratio 5× (chatter fully developed)", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        vibration: { rms_ms2: 50, baseline_rms_ms2: 10 },
      });
      expect(r.verdict).toBe("pull_off");
      expect(r.evidence[0].source).toMatch(/Altintas/);
      expect(r.evidence[0].severity).toBe(0.8);
    });
    it("emits continue at RMS ratio 1.5× (sub-threshold)", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        vibration: { rms_ms2: 15, baseline_rms_ms2: 10 },
      });
      expect(r.verdict).toBe("continue");
    });
  });

  describe("Spindle-load channel", () => {
    const spindleBase = { warning_pct: 80, hold_pct: 90, retract_pct: 100 };
    it("emits abort at load above breakage spike", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        spindle: { current_load_pct: 160, ...spindleBase, breakage_spike_pct: 150 },
      });
      expect(r.verdict).toBe("abort");
      expect(r.evidence[0].severity).toBe(1.0);
      expect(r.evidence[0].source).toMatch(/ISO 13374|Erdel/);
    });
    it("emits pull_off at exact retract threshold", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        spindle: { current_load_pct: 105, ...spindleBase },
      });
      expect(r.verdict).toBe("pull_off");
      expect(r.evidence[0].reason).toMatch(/retract threshold/);
    });
    it("emits reduce_feed at hold threshold (severity 0.5)", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        spindle: { current_load_pct: 92, ...spindleBase },
      });
      expect(r.verdict).toBe("reduce_feed");
      expect(r.evidence[0].severity).toBe(0.5);
    });
    it("emits reduce_feed at warning threshold with severity 0.35", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        spindle: { current_load_pct: 82, ...spindleBase },
      });
      expect(r.verdict).toBe("reduce_feed");
      expect(r.evidence[0].severity).toBe(0.35);
    });
    it("emits continue at load 50% (below warning)", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        spindle: { current_load_pct: 50, ...spindleBase },
      });
      expect(r.verdict).toBe("continue");
      expect(r.evidence[0].severity).toBe(0);
    });
  });

  describe("Multi-channel fusion (max-of-channels)", () => {
    it("abort wins over nominal+nominal+nominal", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        ae: { class: "fresh" },
        force: { tangential_force_n: 500, baseline_force_n: 500 },
        spindle: { current_load_pct: 170, warning_pct: 80, hold_pct: 90, retract_pct: 100, breakage_spike_pct: 150 },
      });
      expect(r.verdict).toBe("abort");
      expect(r.evidence).toHaveLength(3);
      const abortChannel = r.evidence.find(e => e.verdict === "abort");
      expect(abortChannel?.channel).toBe("spindle");
    });
    it("pull_off wins when force+vibration both alarm", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        force: { tangential_force_n: 1000, baseline_force_n: 500 },
        vibration: { rms_ms2: 50, baseline_rms_ms2: 10 },
      });
      expect(r.verdict).toBe("pull_off");
      expect(r.confidence.value).toBeGreaterThan(0.3);
      expect(r.confidence.value).toBeLessThanOrEqual(1.0);
    });
    it("respects custom weights but max-of-channels still picks alarm", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        ae: { class: "wear", rms_sigma: 4 },
        force: { tangential_force_n: 500, baseline_force_n: 500 },
        weights: { ae: 0.9, force: 0.1 },
      });
      expect(r.verdict).toBe("reduce_feed");
      expect(r.evidence).toHaveLength(2);
    });
    it("all-nominal across 4 channels stays continue with feed=100", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        ae: { class: "fresh" },
        force: { tangential_force_n: 500, baseline_force_n: 500 },
        vibration: { rms_ms2: 10, baseline_rms_ms2: 10 },
        spindle: { current_load_pct: 50, warning_pct: 80, hold_pct: 90, retract_pct: 100 },
      });
      expect(r.verdict).toBe("continue");
      expect(r.feed_override_pct.value).toBe(100);
      expect(r.evidence).toHaveLength(4);
    });
  });

  describe("Output schema", () => {
    it("feed_override_pct unit is % with integer value", () => {
      const r = midCutDecisionOrchestratorEngine.decide({ ae: { class: "fresh" } });
      expect(r.feed_override_pct.unit).toBe("%");
      expect(r.feed_override_pct.value).toBe(100);
      expect(r.feed_override_pct.source).toBe("midcut_orchestrator_v1");
    });
    it("confidence stays in [0, 1] even under all-channel alarm", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        ae: { class: "breakage" },
        force: { tangential_force_n: 1000, baseline_force_n: 500 },
        vibration: { rms_ms2: 50, baseline_rms_ms2: 10 },
        spindle: { current_load_pct: 170, warning_pct: 80, hold_pct: 90, retract_pct: 100, breakage_spike_pct: 150 },
      });
      expect(r.confidence.value).toBeGreaterThanOrEqual(0);
      expect(r.confidence.value).toBeLessThanOrEqual(1);
      expect(r.verdict).toBe("abort");
    });
    it("every evidence row carries non-empty source + reason citations", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        ae: { class: "wear", rms_sigma: 4 },
        force: { tangential_force_n: 700, baseline_force_n: 500 },
        vibration: { rms_ms2: 25, baseline_rms_ms2: 10 },
        spindle: { current_load_pct: 92, warning_pct: 80, hold_pct: 90, retract_pct: 100 },
      });
      expect(r.evidence).toHaveLength(4);
      for (const e of r.evidence) {
        expect(e.source.length).toBeGreaterThan(3);
        expect(e.reason.length).toBeGreaterThan(3);
        expect(["ae", "force", "vibration", "spindle"]).toContain(e.channel);
        expect(["continue", "reduce_feed", "pull_off", "abort"]).toContain(e.verdict);
      }
    });
  });

  describe("Edge cases", () => {
    it("force baseline of 0 is guarded (no NaN)", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        force: { tangential_force_n: 500, baseline_force_n: 0 },
      });
      expect(Number.isFinite(r.feed_override_pct.value)).toBe(true);
      expect(Number.isFinite(r.confidence.value)).toBe(true);
    });
    it("vibration baseline of 0 is guarded (no NaN)", () => {
      const r = midCutDecisionOrchestratorEngine.decide({
        vibration: { rms_ms2: 10, baseline_rms_ms2: 0 },
      });
      expect(Number.isFinite(r.feed_override_pct.value)).toBe(true);
      expect(Number.isFinite(r.confidence.value)).toBe(true);
    });
  });
});
