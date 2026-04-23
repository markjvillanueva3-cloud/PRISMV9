/**
 * SafetyVetoSimulationGateEngine — Production Release Safety Gate (U-MIO38)
 * =========================================================================
 *
 * Phase 12 Safety Gate: a program cannot transfer to a machine until
 *   (a) SafetyVetoEngine reports vetoed=false (all 8 hard rules clear)
 *   (b) Simulation verification has passed (collision-free, toolpath-integrity)
 *   (c) Machine envelope validation has passed (no axis-limit breach)
 *   (d) If auto-escalation was used, final params are certified
 *
 * This engine is a *composition* layer over pre-computed safety artifacts
 * from SafetyVetoEngine, CollisionDetectionEngine, MachineEnvelopeGuardEngine
 * and a CAM simulation provider. It does NOT recompute those — it requires
 * the caller to supply their reports and produces a single tamper-evident
 * production-release certification.
 *
 * Gate semantics:
 *
 *   open(input) → Gate{ verdict: PENDING }
 *   attachVetoReport(gate_id, report) — inject SafetyVetoEngine result
 *   attachSimulation(gate_id, result)  — inject CAM simulation verdict
 *   attachCollision(gate_id, result)   — inject collision detection result
 *   attachEnvelope(gate_id, result)    — inject envelope validation result
 *   certify(gate_id, certifier_id)     — evaluate all artifacts
 *       all four required + veto.vetoed===false + no collisions +
 *       simulation.verdict===PASS + envelope.verdict===PASS
 *       → verdict=CERTIFIED + production_released=true + SHA-256 cert hash
 *       ANY failure → verdict=BLOCKED + blocker_reasons[] populated
 *
 * Reasoning: "defence in depth" per IEC 61508 / ISO 13849-1 safety lifecycle.
 * No single engine can release production — all four must independently sign
 * off, and the certification is hash-binding so post-hoc tampering is
 * detectable.
 *
 * References:
 *   - ISO 13849-1: Safety of machinery — safety-related parts of control systems
 *   - IEC 61508: Functional safety of E/E/PE safety-related systems
 *   - Shingo Poka-Yoke: independent redundant verification
 *   - AIAG APQP §5.11: production validation prior to release
 *
 * @module engines/SafetyVetoSimulationGateEngine
 * @milestone MIO-MS0 U-MIO38
 */

import { createHash } from "node:crypto";
import type { VetoReport } from "./SafetyVetoEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type GateVerdict = "PENDING" | "CERTIFIED" | "BLOCKED";

export interface SimulationVerdict {
  /** Simulation engine name or vendor string */
  source: string;
  /** PASS / FAIL result */
  verdict: "PASS" | "FAIL";
  /** Cycle time from simulation [s], optional */
  cycle_time_s?: number;
  /** Ordered list of warnings emitted by simulator */
  warnings?: string[];
  /** Simulation reference id (vendor side), for audit trail */
  run_id?: string;
}

export interface CollisionVerdict {
  /** PASS if zero collisions, FAIL otherwise */
  verdict: "PASS" | "FAIL";
  /** Number of collisions detected (0 expected for PASS) */
  collision_count: number;
  /** Description of detected collisions */
  collisions?: Array<{ location: string; severity: "minor" | "major" | "catastrophic"; description: string }>;
  /** Source engine */
  source?: string;
}

export interface EnvelopeVerdict {
  /** PASS if all axes stayed within soft limits, FAIL if any breach */
  verdict: "PASS" | "FAIL";
  /** Which axes (if any) breached their limits */
  breached_axes?: string[];
  /** Total breach distance across all axes [mm] */
  total_breach_mm?: number;
  /** Source engine */
  source?: string;
}

export interface GateInput {
  /** Part identification */
  part_number: string;
  revision: string;
  job_id?: string;
  /** Cross-link to orchestrator plan id */
  setup_id?: string;
  /** Cross-link to operator approval gate id (U-MIO37) */
  approval_gate_id?: string;
  /** Program identifier being certified (NC program filename, hash, etc.) */
  program_id: string;
  /** Machine identifier */
  machine_id: string;
}

export interface Blocker {
  source: "veto" | "simulation" | "collision" | "envelope" | "missing_artifact";
  severity: "critical" | "major";
  reason: string;
}

export interface GateCertification {
  certifier_id: string;
  certification_hash: string;
  certified_at: string;
}

export interface Gate {
  gate_id: string;
  part_number: string;
  revision: string;
  job_id: string;
  setup_id: string;
  approval_gate_id: string;
  program_id: string;
  machine_id: string;
  created: string;
  updated: string;
  verdict: GateVerdict;
  production_released: boolean;
  veto_report?: VetoReport;
  simulation?: SimulationVerdict;
  collision?: CollisionVerdict;
  envelope?: EnvelopeVerdict;
  blockers: Blocker[];
  certification?: GateCertification;
  summary: {
    has_veto_report: boolean;
    veto_active_count: number;
    has_simulation: boolean;
    simulation_pass: boolean;
    has_collision: boolean;
    collision_count: number;
    has_envelope: boolean;
    envelope_pass: boolean;
    all_four_attached: boolean;
  };
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class SafetyVetoSimulationGateEngine {
  private store: Map<string, Gate> = new Map();
  private counter = 0;

  /** Open a new safety veto + simulation gate in PENDING verdict. */
  openGate(input: GateInput): Gate {
    if (!input.part_number) throw new Error("SafetyVetoSimulationGate: part_number required");
    if (!input.program_id) throw new Error("SafetyVetoSimulationGate: program_id required");
    if (!input.machine_id) throw new Error("SafetyVetoSimulationGate: machine_id required");
    this.counter++;
    const gate_id = `SVG-${String(this.counter).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const gate: Gate = {
      gate_id,
      part_number: input.part_number,
      revision: input.revision,
      job_id: input.job_id ?? "N/A",
      setup_id: input.setup_id ?? "N/A",
      approval_gate_id: input.approval_gate_id ?? "N/A",
      program_id: input.program_id,
      machine_id: input.machine_id,
      created: now,
      updated: now,
      verdict: "PENDING",
      production_released: false,
      blockers: [],
      summary: this.computeSummary({}),
    };
    this.store.set(gate_id, gate);
    return gate;
  }

  /** Attach a SafetyVetoEngine report to the gate. */
  attachVetoReport(gate_id: string, report: VetoReport): Gate {
    const gate = this.mustGet(gate_id);
    gate.veto_report = report;
    gate.updated = new Date().toISOString();
    gate.summary = this.computeSummary(gate);
    return gate;
  }

  /** Attach a CAM simulation verdict. */
  attachSimulation(gate_id: string, result: SimulationVerdict): Gate {
    const gate = this.mustGet(gate_id);
    gate.simulation = result;
    gate.updated = new Date().toISOString();
    gate.summary = this.computeSummary(gate);
    return gate;
  }

  /** Attach a collision-detection verdict. */
  attachCollision(gate_id: string, result: CollisionVerdict): Gate {
    const gate = this.mustGet(gate_id);
    gate.collision = result;
    gate.updated = new Date().toISOString();
    gate.summary = this.computeSummary(gate);
    return gate;
  }

  /** Attach a machine-envelope validation verdict. */
  attachEnvelope(gate_id: string, result: EnvelopeVerdict): Gate {
    const gate = this.mustGet(gate_id);
    gate.envelope = result;
    gate.updated = new Date().toISOString();
    gate.summary = this.computeSummary(gate);
    return gate;
  }

  /**
   * Certify the gate. Requires all four artifacts present and all PASS.
   * On success: verdict=CERTIFIED, production_released=true, certification
   * hash captured. On any failure: verdict=BLOCKED with blocker_reasons[].
   */
  certify(gate_id: string, certifier_id: string): Gate {
    const gate = this.mustGet(gate_id);
    const blockers: Blocker[] = [];

    if (!gate.veto_report) {
      blockers.push({
        source: "missing_artifact",
        severity: "critical",
        reason: "SafetyVetoEngine report not attached",
      });
    } else if (gate.veto_report.vetoed) {
      const rules = gate.veto_report.active_vetos.map(v => v.rule).filter(r => r).join(", ");
      blockers.push({
        source: "veto",
        severity: "critical",
        reason: `SafetyVetoEngine vetoed (${gate.veto_report.active_vetos.length} rule(s): ${rules})`,
      });
    }

    if (!gate.simulation) {
      blockers.push({
        source: "missing_artifact",
        severity: "critical",
        reason: "Simulation verdict not attached",
      });
    } else if (gate.simulation.verdict === "FAIL") {
      blockers.push({
        source: "simulation",
        severity: "critical",
        reason: `Simulation FAIL (source=${gate.simulation.source})${(gate.simulation.warnings ?? []).length > 0 ? ": " + (gate.simulation.warnings ?? []).slice(0, 3).join("; ") : ""}`,
      });
    }

    if (!gate.collision) {
      blockers.push({
        source: "missing_artifact",
        severity: "critical",
        reason: "Collision-detection verdict not attached",
      });
    } else if (gate.collision.verdict === "FAIL" || gate.collision.collision_count > 0) {
      blockers.push({
        source: "collision",
        severity: "critical",
        reason: `${gate.collision.collision_count} collision(s) detected — zero-tolerance block`,
      });
    }

    if (!gate.envelope) {
      blockers.push({
        source: "missing_artifact",
        severity: "major",
        reason: "Envelope-validation verdict not attached",
      });
    } else if (gate.envelope.verdict === "FAIL") {
      blockers.push({
        source: "envelope",
        severity: "critical",
        reason: `Envelope breach on axes: ${(gate.envelope.breached_axes ?? []).join(", ")}`,
      });
    }

    const now = new Date().toISOString();
    gate.updated = now;
    gate.blockers = blockers;

    if (blockers.length === 0) {
      gate.verdict = "CERTIFIED";
      gate.production_released = true;
      gate.certification = {
        certifier_id,
        certification_hash: this.computeCertHash(gate, certifier_id, now),
        certified_at: now,
      };
    } else {
      gate.verdict = "BLOCKED";
      gate.production_released = false;
    }
    return gate;
  }

  /** Retrieve a gate by id. */
  get(gate_id: string): Gate | null {
    return this.store.get(gate_id) ?? null;
  }

  /** Render Markdown summary of the gate for audit/operator display. */
  renderMarkdown(gate: Gate): string {
    const out: string[] = [];
    out.push(`# Safety Veto & Simulation Gate ${gate.gate_id}`);
    out.push("");
    out.push(`**Part:** ${gate.part_number} Rev ${gate.revision}  |  **Program:** ${gate.program_id}  |  **Machine:** ${gate.machine_id}`);
    out.push(`**Verdict:** \`${gate.verdict}\`  |  **Released:** ${gate.production_released ? "YES" : "NO"}`);
    out.push("");
    out.push(`## Artifacts`);
    out.push(`| Artifact | Attached | Verdict |`);
    out.push(`|----------|----------|---------|`);
    out.push(`| SafetyVeto | ${gate.summary.has_veto_report ? "yes" : "no"} | ${gate.summary.has_veto_report ? (gate.veto_report!.vetoed ? "VETOED" : "clear") : "-"} |`);
    out.push(`| Simulation | ${gate.summary.has_simulation ? "yes" : "no"} | ${gate.simulation?.verdict ?? "-"} |`);
    out.push(`| Collision | ${gate.summary.has_collision ? "yes" : "no"} | ${gate.collision?.verdict ?? "-"} (${gate.collision?.collision_count ?? 0} collisions) |`);
    out.push(`| Envelope | ${gate.summary.has_envelope ? "yes" : "no"} | ${gate.envelope?.verdict ?? "-"} |`);
    if (gate.blockers.length > 0) {
      out.push("");
      out.push(`## Blockers`);
      for (const b of gate.blockers) {
        out.push(`- [${b.severity}] ${b.source}: ${b.reason}`);
      }
    }
    if (gate.certification) {
      out.push("");
      out.push(`## Certification`);
      out.push(`- **Certifier:** ${gate.certification.certifier_id}`);
      out.push(`- **Certified:** ${gate.certification.certified_at}`);
      out.push(`- **Hash:** \`${gate.certification.certification_hash}\``);
    }
    return out.join("\n");
  }

  /** Clear all gates (primarily for tests) */
  reset(): void {
    this.store.clear();
    this.counter = 0;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private mustGet(gate_id: string): Gate {
    const g = this.store.get(gate_id);
    if (!g) throw new Error(`SafetyVetoSimulationGate: unknown gate '${gate_id}'`);
    return g;
  }

  private computeSummary(
    g: Partial<Pick<Gate, "veto_report" | "simulation" | "collision" | "envelope">>,
  ): Gate["summary"] {
    const has_veto_report = !!g.veto_report;
    const veto_active_count = g.veto_report?.active_vetos?.length ?? 0;
    const has_simulation = !!g.simulation;
    const simulation_pass = g.simulation?.verdict === "PASS";
    const has_collision = !!g.collision;
    const collision_count = g.collision?.collision_count ?? 0;
    const has_envelope = !!g.envelope;
    const envelope_pass = g.envelope?.verdict === "PASS";
    const all_four_attached = has_veto_report && has_simulation && has_collision && has_envelope;
    return {
      has_veto_report,
      veto_active_count,
      has_simulation,
      simulation_pass,
      has_collision,
      collision_count,
      has_envelope,
      envelope_pass,
      all_four_attached,
    };
  }

  /**
   * SHA-256 hash of canonical certification state for tamper-evidence.
   * Binds the certifier, timestamp, and the four artifact verdicts so any
   * post-certification edit invalidates the hash on recomputation.
   */
  private computeCertHash(gate: Gate, certifier: string, ts: string): string {
    const canonical = JSON.stringify({
      gate: gate.gate_id,
      program: gate.program_id,
      machine: gate.machine_id,
      part: gate.part_number,
      rev: gate.revision,
      certifier,
      ts,
      veto: gate.veto_report?.vetoed === false ? "clear" : "vetoed",
      sim: gate.simulation?.verdict,
      col: gate.collision?.verdict,
      col_n: gate.collision?.collision_count ?? 0,
      env: gate.envelope?.verdict,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }
}

export const safetyVetoSimulationGateEngine = new SafetyVetoSimulationGateEngine();
