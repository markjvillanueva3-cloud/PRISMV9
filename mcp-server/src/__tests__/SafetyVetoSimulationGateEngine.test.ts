/**
 * SafetyVetoSimulationGateEngine tests (U-MIO38)
 *
 * Covers open, attach*, certify lifecycle, blocker enumeration,
 * certification hash determinism, Markdown rendering, edge cases.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SafetyVetoSimulationGateEngine,
  type GateInput,
  type SimulationVerdict,
  type CollisionVerdict,
  type EnvelopeVerdict,
} from "../engines/SafetyVetoSimulationGateEngine.js";
import type { VetoReport } from "../engines/SafetyVetoEngine.js";

function mkInput(overrides: Partial<GateInput> = {}): GateInput {
  return {
    part_number: overrides.part_number ?? "P-1000",
    revision: overrides.revision ?? "A",
    job_id: overrides.job_id,
    setup_id: overrides.setup_id,
    approval_gate_id: overrides.approval_gate_id,
    program_id: overrides.program_id ?? "PROG-42.NC",
    machine_id: overrides.machine_id ?? "OK-MB-001",
  };
}

function mkVetoReport(active = false): VetoReport {
  return {
    vetoed: active,
    checks: [],
    active_vetos: active
      ? [{
          vetoed: true,
          rule: "power_veto",
          original_value: 20,
          detail: "power 20kW > 12.75kW limit",
          formula_used: "Fc*Vc/60000",
        }]
      : [],
    original_params: {
      Fc_N: 500, Vc_mpm: 150, ap_mm: 2, fz_mm: 0.1, D_mm: 10, L_mm: 40, RPM: 4500,
      chatter_probability: 0.05, collision_detected: false,
    },
    machine: { max_power_kW: 15, max_rpm: 10000, max_torque_Nm: 100 },
    workholding: { grip_force_N: 5000, friction_coefficient: 0.3, n_points: 1 },
  };
}

const simPass: SimulationVerdict = { source: "mastercam.verify", verdict: "PASS", cycle_time_s: 240 };
const simFail: SimulationVerdict = { source: "mastercam.verify", verdict: "FAIL", warnings: ["air cut region detected"] };
const colPass: CollisionVerdict = { verdict: "PASS", collision_count: 0 };
const colFail: CollisionVerdict = {
  verdict: "FAIL",
  collision_count: 1,
  collisions: [{ location: "holder/fixture", severity: "major", description: "holder clears by -0.5mm" }],
};
const envPass: EnvelopeVerdict = { verdict: "PASS" };
const envFail: EnvelopeVerdict = { verdict: "FAIL", breached_axes: ["Z"], total_breach_mm: 1.2 };

describe("SafetyVetoSimulationGateEngine — openGate", () => {
  let engine: SafetyVetoSimulationGateEngine;
  beforeEach(() => { engine = new SafetyVetoSimulationGateEngine(); });

  it("assigns sequential SVG- ids", () => {
    const a = engine.openGate(mkInput());
    const b = engine.openGate(mkInput());
    expect(a.gate_id).toBe("SVG-00001");
    expect(b.gate_id).toBe("SVG-00002");
  });

  it("starts PENDING with no artifacts attached", () => {
    const g = engine.openGate(mkInput());
    expect(g.verdict).toBe("PENDING");
    expect(g.production_released).toBe(false);
    expect(g.summary.all_four_attached).toBe(false);
  });

  it("throws if required fields missing", () => {
    expect(() => engine.openGate({ ...mkInput(), part_number: "" })).toThrow(/part_number/);
    expect(() => engine.openGate({ ...mkInput(), program_id: "" })).toThrow(/program_id/);
    expect(() => engine.openGate({ ...mkInput(), machine_id: "" })).toThrow(/machine_id/);
  });

  it("defaults optional cross-link fields to N/A", () => {
    const g = engine.openGate(mkInput());
    expect(g.job_id).toBe("N/A");
    expect(g.setup_id).toBe("N/A");
    expect(g.approval_gate_id).toBe("N/A");
  });

  it("propagates optional cross-link ids when supplied", () => {
    const g = engine.openGate(mkInput({
      job_id: "J-1",
      setup_id: "SU-1",
      approval_gate_id: "APV-00001",
    }));
    expect(g.job_id).toBe("J-1");
    expect(g.setup_id).toBe("SU-1");
    expect(g.approval_gate_id).toBe("APV-00001");
  });
});

describe("SafetyVetoSimulationGateEngine — attach* artifacts", () => {
  let engine: SafetyVetoSimulationGateEngine;
  beforeEach(() => { engine = new SafetyVetoSimulationGateEngine(); });

  it("attachVetoReport updates summary", () => {
    const g = engine.openGate(mkInput());
    const a = engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    expect(a.summary.has_veto_report).toBe(true);
    expect(a.summary.veto_active_count).toBe(0);
  });

  it("attachSimulation PASS marks simulation_pass=true", () => {
    const g = engine.openGate(mkInput());
    const a = engine.attachSimulation(g.gate_id, simPass);
    expect(a.summary.simulation_pass).toBe(true);
  });

  it("attachCollision preserves collision_count", () => {
    const g = engine.openGate(mkInput());
    const a = engine.attachCollision(g.gate_id, colFail);
    expect(a.summary.collision_count).toBe(1);
  });

  it("attachEnvelope PASS marks envelope_pass=true", () => {
    const g = engine.openGate(mkInput());
    const a = engine.attachEnvelope(g.gate_id, envPass);
    expect(a.summary.envelope_pass).toBe(true);
  });

  it("all four attached flips all_four_attached", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    engine.attachSimulation(g.gate_id, simPass);
    engine.attachCollision(g.gate_id, colPass);
    const a = engine.attachEnvelope(g.gate_id, envPass);
    expect(a.summary.all_four_attached).toBe(true);
  });

  it("attach* throws on unknown gate_id", () => {
    expect(() => engine.attachSimulation("SVG-99999", simPass)).toThrow(/unknown gate/);
  });
});

describe("SafetyVetoSimulationGateEngine — certify success path", () => {
  let engine: SafetyVetoSimulationGateEngine;
  beforeEach(() => { engine = new SafetyVetoSimulationGateEngine(); });

  it("CERTIFIES when all four clear", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    engine.attachSimulation(g.gate_id, simPass);
    engine.attachCollision(g.gate_id, colPass);
    engine.attachEnvelope(g.gate_id, envPass);
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("CERTIFIED");
    expect(c.production_released).toBe(true);
    expect(c.certification).toBeDefined();
    expect(c.certification!.certifier_id).toBe("eng.smith");
    expect(c.certification!.certification_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(c.blockers).toHaveLength(0);
  });

  it("certification hash differs when program_id changes", () => {
    const mk = (program: string) => {
      const g = engine.openGate(mkInput({ program_id: program }));
      engine.attachVetoReport(g.gate_id, mkVetoReport(false));
      engine.attachSimulation(g.gate_id, simPass);
      engine.attachCollision(g.gate_id, colPass);
      engine.attachEnvelope(g.gate_id, envPass);
      return engine.certify(g.gate_id, "eng.smith");
    };
    const a = mk("PROG-A.NC");
    const b = mk("PROG-B.NC");
    expect(a.certification!.certification_hash).not.toBe(b.certification!.certification_hash);
  });
});

describe("SafetyVetoSimulationGateEngine — certify block paths", () => {
  let engine: SafetyVetoSimulationGateEngine;
  beforeEach(() => { engine = new SafetyVetoSimulationGateEngine(); });

  it("BLOCKS with missing_artifact when no artifacts attached", () => {
    const g = engine.openGate(mkInput());
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("BLOCKED");
    expect(c.production_released).toBe(false);
    expect(c.blockers.length).toBe(4);
    expect(c.blockers.every(b => b.source === "missing_artifact")).toBe(true);
  });

  it("BLOCKS on veto active", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(true));
    engine.attachSimulation(g.gate_id, simPass);
    engine.attachCollision(g.gate_id, colPass);
    engine.attachEnvelope(g.gate_id, envPass);
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("BLOCKED");
    expect(c.blockers.some(b => b.source === "veto")).toBe(true);
    expect(c.blockers.find(b => b.source === "veto")!.severity).toBe("critical");
  });

  it("BLOCKS on simulation FAIL", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    engine.attachSimulation(g.gate_id, simFail);
    engine.attachCollision(g.gate_id, colPass);
    engine.attachEnvelope(g.gate_id, envPass);
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("BLOCKED");
    expect(c.blockers.some(b => b.source === "simulation")).toBe(true);
  });

  it("BLOCKS on any collision (zero-tolerance)", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    engine.attachSimulation(g.gate_id, simPass);
    engine.attachCollision(g.gate_id, colFail);
    engine.attachEnvelope(g.gate_id, envPass);
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("BLOCKED");
    expect(c.blockers.some(b => b.source === "collision")).toBe(true);
    expect(c.blockers.find(b => b.source === "collision")!.severity).toBe("critical");
  });

  it("BLOCKS on envelope FAIL", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    engine.attachSimulation(g.gate_id, simPass);
    engine.attachCollision(g.gate_id, colPass);
    engine.attachEnvelope(g.gate_id, envFail);
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("BLOCKED");
    expect(c.blockers.some(b => b.source === "envelope")).toBe(true);
  });

  it("accumulates multiple blockers when several fail", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(true));
    engine.attachSimulation(g.gate_id, simFail);
    engine.attachCollision(g.gate_id, colFail);
    engine.attachEnvelope(g.gate_id, envFail);
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("BLOCKED");
    expect(c.blockers.length).toBeGreaterThanOrEqual(4);
  });

  it("BLOCKED gates have no certification object", () => {
    const g = engine.openGate(mkInput());
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.certification).toBeUndefined();
  });

  it("positive collision_count with PASS verdict still blocks (sanity)", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    engine.attachSimulation(g.gate_id, simPass);
    // sneaky: claim PASS but count>0
    engine.attachCollision(g.gate_id, { verdict: "PASS", collision_count: 3 });
    engine.attachEnvelope(g.gate_id, envPass);
    const c = engine.certify(g.gate_id, "eng.smith");
    expect(c.verdict).toBe("BLOCKED");
    expect(c.blockers.some(b => b.source === "collision")).toBe(true);
  });
});

describe("SafetyVetoSimulationGateEngine — rendering & storage", () => {
  let engine: SafetyVetoSimulationGateEngine;
  beforeEach(() => { engine = new SafetyVetoSimulationGateEngine(); });

  it("get() returns null for unknown gate", () => {
    expect(engine.get("SVG-99999")).toBeNull();
  });

  it("get() returns stored gate", () => {
    const g = engine.openGate(mkInput());
    expect(engine.get(g.gate_id)?.gate_id).toBe(g.gate_id);
  });

  it("renderMarkdown includes verdict, artifacts table, blockers", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(true));
    engine.attachSimulation(g.gate_id, simFail);
    engine.attachCollision(g.gate_id, colFail);
    engine.attachEnvelope(g.gate_id, envFail);
    const c = engine.certify(g.gate_id, "eng.smith");
    const md = engine.renderMarkdown(c);
    expect(md).toContain(`# Safety Veto & Simulation Gate ${g.gate_id}`);
    expect(md).toContain("BLOCKED");
    expect(md).toContain("Artifacts");
    expect(md).toContain("Blockers");
  });

  it("renderMarkdown includes Certification block when certified", () => {
    const g = engine.openGate(mkInput());
    engine.attachVetoReport(g.gate_id, mkVetoReport(false));
    engine.attachSimulation(g.gate_id, simPass);
    engine.attachCollision(g.gate_id, colPass);
    engine.attachEnvelope(g.gate_id, envPass);
    const c = engine.certify(g.gate_id, "eng.smith");
    const md = engine.renderMarkdown(c);
    expect(md).toContain("Certification");
    expect(md).toContain("eng.smith");
    expect(md).toContain(c.certification!.certification_hash);
  });

  it("reset() empties store and resets counter", () => {
    engine.openGate(mkInput());
    engine.openGate(mkInput());
    engine.reset();
    const g = engine.openGate(mkInput());
    expect(g.gate_id).toBe("SVG-00001");
  });
});
