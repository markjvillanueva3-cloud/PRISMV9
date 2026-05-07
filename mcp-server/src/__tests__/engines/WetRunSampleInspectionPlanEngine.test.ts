/**
 * WetRunSampleInspectionPlanEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-AQL
 */
import { describe, it, expect, beforeEach } from "vitest";
import { WetRunSampleInspectionPlanEngine } from "../../engines/WetRunSampleInspectionPlanEngine.js";

const T0 = 1_700_000_000_000;
const MIN = 60_000;

describe("WetRunSampleInspectionPlanEngine", () => {
  let engine: WetRunSampleInspectionPlanEngine;
  beforeEach(() => {
    engine = new WetRunSampleInspectionPlanEngine();
  });

  describe("startPilot", () => {
    it("starts a pilot in normal regime with default inspection_level II", () => {
      const s = engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      expect(s.regime).toBe("normal");
      expect(s.inspection_level).toBe("II");
      expect(s.consecutive_accepts).toBe(0);
    });

    it("rejects unsupported AQL", () => {
      expect(() =>
        engine.startPilot({ pilot_id: "PILOT-A", aql: 0.1 }),
      ).toThrow(/unsupported AQL/);
    });

    it("rejects duplicate pilot_id", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      expect(() =>
        engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 }),
      ).toThrow(/already started/);
    });

    it("rejects invalid inspection_level", () => {
      expect(() =>
        engine.startPilot({
          pilot_id: "PILOT-A",
          aql: 2.5,
          inspection_level: "IV" as "I",
        }),
      ).toThrow(/invalid inspection_level/);
    });
  });

  describe("planFor", () => {
    beforeEach(() => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
    });

    it("derives code letter H and sample size 50 for a 300-piece batch", () => {
      const p = engine.planFor("PILOT-A", 300);
      expect(p.code_letter).toBe("H");
      expect(p.sample_size).toBe(50);
      expect(p.ac).toBe(3);
      expect(p.re).toBe(4);
    });

    it("code letter F (AQL 2.5) sample=20 Ac=1 Re=2 for batch 100", () => {
      const p = engine.planFor("PILOT-A", 100);
      expect(p.code_letter).toBe("F");
      expect(p.sample_size).toBe(20);
      expect(p.ac).toBe(1);
      expect(p.re).toBe(2);
    });

    it("throws on batch_size too small for supported AQL table", () => {
      engine.startPilot({ pilot_id: "TINY", aql: 1.0 });
      // Code letter A, which has no AQL 1.0 entry in our Ac/Re table
      expect(() => engine.planFor("TINY", 5)).toThrow(
        /falls below supported minimum/,
      );
    });

    it("throws on batch_size > 10000", () => {
      expect(() => engine.planFor("PILOT-A", 50000)).toThrow(
        /exceeds table/,
      );
    });

    it("throws on non-integer batch_size", () => {
      expect(() => engine.planFor("PILOT-A", 10.5)).toThrow(/integer/);
    });
  });

  describe("recordResult + switching rules", () => {
    it("accepts when defects_found ≤ Ac", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      const r = engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B01",
        sampled_at: T0,
        batch_size: 300,
        defects_found: 2, // Ac=3 for H
      });
      expect(r.decision).toBe("accept");
      expect(r.regime_after).toBe("normal");
    });

    it("rejects when defects_found ≥ Re", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      const r = engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B01",
        sampled_at: T0,
        batch_size: 300,
        defects_found: 4, // Re=4 for H
      });
      expect(r.decision).toBe("reject");
    });

    it("switches normal → reduced after 5 consecutive accepts", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      for (let i = 0; i < 4; i++) {
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: `B${i}`,
          sampled_at: T0 + i * MIN,
          batch_size: 300,
          defects_found: 0,
        });
      }
      const state = engine.getState("PILOT-A")!;
      expect(state.regime).toBe("normal");
      expect(state.consecutive_accepts).toBe(4);
      const fifth = engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B4",
        sampled_at: T0 + 5 * MIN,
        batch_size: 300,
        defects_found: 0,
      });
      expect(fifth.regime_after).toBe("reduced");
    });

    it("switches normal → tightened after 2 of 5 rejects", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      // reject, accept, accept, accept, reject → 2/5 rejects
      const seq = [4, 0, 0, 0, 4];
      let last = "normal" as string;
      for (let i = 0; i < seq.length; i++) {
        const r = engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: `B${i}`,
          sampled_at: T0 + i * MIN,
          batch_size: 300,
          defects_found: seq[i]!,
        });
        last = r.regime_after;
      }
      expect(last).toBe("tightened");
    });

    it("reduced → normal on any reject", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      // get to reduced
      for (let i = 0; i < 5; i++) {
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: `B${i}`,
          sampled_at: T0 + i * MIN,
          batch_size: 300,
          defects_found: 0,
        });
      }
      expect(engine.getState("PILOT-A")!.regime).toBe("reduced");
      const r = engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "REJECT",
        sampled_at: T0 + 10 * MIN,
        batch_size: 300,
        defects_found: 10, // comfortably > whatever Ac the reduced plan uses
      });
      expect(r.decision).toBe("reject");
      expect(r.regime_after).toBe("normal");
    });

    it("tightened → inspection_halted after 5 consecutive rejects", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      // force to tightened
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B0",
        sampled_at: T0,
        batch_size: 300,
        defects_found: 4,
      });
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B1",
        sampled_at: T0 + MIN,
        batch_size: 300,
        defects_found: 4,
      });
      expect(engine.getState("PILOT-A")!.regime).toBe("tightened");

      // 5 consecutive rejects under tightened — tightened uses Ac = Ac_normal - 1
      let last = "tightened" as string;
      for (let i = 0; i < 5; i++) {
        const r = engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: `T${i}`,
          sampled_at: T0 + (10 + i) * MIN,
          batch_size: 300,
          defects_found: 10,
        });
        last = r.regime_after;
      }
      expect(last).toBe("inspection_halted");
    });

    it("tightened → normal after 5 consecutive accepts", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      // reach tightened
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B0",
        sampled_at: T0,
        batch_size: 300,
        defects_found: 4,
      });
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B1",
        sampled_at: T0 + MIN,
        batch_size: 300,
        defects_found: 4,
      });
      expect(engine.getState("PILOT-A")!.regime).toBe("tightened");
      let last = "tightened" as string;
      for (let i = 0; i < 5; i++) {
        const r = engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: `T${i}`,
          sampled_at: T0 + (10 + i) * MIN,
          batch_size: 300,
          defects_found: 0,
        });
        last = r.regime_after;
      }
      expect(last).toBe("normal");
    });

    it("rejects recording after inspection_halted until reset", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      // shove it to halt
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B0",
        sampled_at: T0,
        batch_size: 300,
        defects_found: 4,
      });
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B1",
        sampled_at: T0 + MIN,
        batch_size: 300,
        defects_found: 4,
      });
      for (let i = 0; i < 5; i++) {
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: `T${i}`,
          sampled_at: T0 + (10 + i) * MIN,
          batch_size: 300,
          defects_found: 10,
        });
      }
      expect(engine.getState("PILOT-A")!.regime).toBe("inspection_halted");
      expect(() =>
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: "Z",
          sampled_at: T0 + 100 * MIN,
          batch_size: 300,
          defects_found: 0,
        }),
      ).toThrow(/inspection_halted/);
    });

    it("rejects non-integer or negative defects_found", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      expect(() =>
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: "X",
          sampled_at: T0,
          batch_size: 300,
          defects_found: -1,
        }),
      ).toThrow(/non-negative integer/);
      expect(() =>
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: "X",
          sampled_at: T0,
          batch_size: 300,
          defects_found: 1.5,
        }),
      ).toThrow(/non-negative integer/);
    });

    it("rejects defects_found > sample_size", () => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      expect(() =>
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: "X",
          sampled_at: T0,
          batch_size: 300,
          defects_found: 200, // sample_size for H is 50
        }),
      ).toThrow(/exceeds sample_size/);
    });
  });

  describe("resetFromHalt", () => {
    beforeEach(() => {
      engine.startPilot({ pilot_id: "PILOT-A", aql: 2.5 });
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B0",
        sampled_at: T0,
        batch_size: 300,
        defects_found: 4,
      });
      engine.recordResult({
        pilot_id: "PILOT-A",
        batch_id: "B1",
        sampled_at: T0 + MIN,
        batch_size: 300,
        defects_found: 4,
      });
      for (let i = 0; i < 5; i++) {
        engine.recordResult({
          pilot_id: "PILOT-A",
          batch_id: `T${i}`,
          sampled_at: T0 + (10 + i) * MIN,
          batch_size: 300,
          defects_found: 10,
        });
      }
    });

    it("resets a halted pilot to tightened regime", () => {
      expect(engine.getState("PILOT-A")!.regime).toBe("inspection_halted");
      const state = engine.resetFromHalt({
        pilot_id: "PILOT-A",
        reset_by: "quality-lead",
        approver: "director",
        reason:
          "root-cause analysis traced halt to a broken fixture clamp now replaced and verified on five parts",
      });
      expect(state.regime).toBe("tightened");
      expect(state.consecutive_accepts).toBe(0);
      expect(state.consecutive_rejects).toBe(0);
    });

    it("rejects reset when not halted", () => {
      engine.resetFromHalt({
        pilot_id: "PILOT-A",
        reset_by: "quality-lead",
        approver: "director",
        reason:
          "root-cause analysis traced halt to a broken fixture clamp now replaced and verified on five parts",
      });
      expect(() =>
        engine.resetFromHalt({
          pilot_id: "PILOT-A",
          reset_by: "quality-lead",
          approver: "director",
          reason:
            "attempting second reset when regime is already tightened should be rejected by the engine",
        }),
      ).toThrow(/not halted/);
    });

    it("rejects four-eyes violation", () => {
      expect(() =>
        engine.resetFromHalt({
          pilot_id: "PILOT-A",
          reset_by: "quality-lead",
          approver: "quality-lead",
          reason:
            "self-approved reset violates the four-eyes principle on halt recovery path",
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects short reason", () => {
      expect(() =>
        engine.resetFromHalt({
          pilot_id: "PILOT-A",
          reset_by: "quality-lead",
          approver: "director",
          reason: "fine",
        }),
      ).toThrow(/at least 40/);
    });
  });

  describe("snapshot", () => {
    it("captures schemaVersion + pilots", () => {
      engine.startPilot({ pilot_id: "A", aql: 2.5 });
      engine.startPilot({ pilot_id: "B", aql: 1.0 });
      const snap = engine.snapshot();
      expect(snap.schemaVersion).toBe(1);
      expect(snap.pilots["A"]?.regime).toBe("normal");
      expect(snap.pilots["B"]?.aql).toBe(1.0);
    });

    it("is defensively copied", () => {
      engine.startPilot({ pilot_id: "A", aql: 2.5 });
      const snap = engine.snapshot();
      snap.pilots["A"]!.regime = "inspection_halted";
      expect(engine.getState("A")?.regime).toBe("normal");
    });

    it("supportedAqls lists the canonical four", () => {
      expect(WetRunSampleInspectionPlanEngine.supportedAqls()).toEqual([
        1.0, 1.5, 2.5, 4.0,
      ]);
    });
  });
});
