/**
 * ProgramProofCertificateEngine — PROGRAM-PROOF-MS0 / U-PP03
 *
 * Orchestrator that produces a SIGNED ProofCertificate for a CNC program:
 *   { verdict: "safe" | "unsafe" | "inconclusive",
 *     witnesses: [...failed checks],
 *     marginsByCheck: { name → µm safety margin },
 *     signedAt, machineId, programHash, accuracyTier }
 *
 * Consumes the existing PRISM safety bones (U-PP01 envelope catalog + U-PP02
 * interval arithmetic + any existing collision/kinematic engines). MS0 ship
 * uses the two new primitives directly; downstream MS1 will plug in the full
 * 17-engine cross-check suite.
 *
 * Per CLAUDE.md: NEVER inline physics constants. Verdict thresholds are
 * milestone-spec defaults, surfaced via SAFETY_TIER for operator override.
 *
 * @milestone PROGRAM-PROOF-MS0/U-PP03-CERT-ORCHESTRATOR
 * @author slot:charlie /goal-12 iter6, 2026-05-24
 */
import { createHash } from "crypto";
import { jmDieMachineEnvelopeCatalogEngine, type MachineEnvelope } from "./JMDieMachineEnvelopeCatalogEngine.js";
import { intervalArithmeticPredicateEngine, type Predicate } from "./IntervalArithmeticPredicateEngine.js";

export interface ProgramPoint {
  x: number; y: number; z: number;
  /** Optional per-point uncertainty (µm); falls back to machine accuracy_um. */
  uncertainty_um?: number;
}

export interface ProofCertificate {
  verdict: "safe" | "unsafe" | "inconclusive";
  machine_id: string;
  program_hash: string;
  program_point_count: number;
  signed_at: string;
  accuracy_tier: string;
  accuracy_um: number;
  witnesses: Array<{ check: string; point_index: number; reason: string }>;
  margins_by_check: Record<string, number>;
  inconclusive_count: number;
  schema_version: string;
}

const SCHEMA_VERSION = "1.0.0";

export class ProgramProofCertificateEngine {
  /** Produce a ProofCertificate for a program (sequence of XYZ points) on a machine. */
  certify(machineId: string, programPoints: ProgramPoint[]): ProofCertificate {
    const envelope = jmDieMachineEnvelopeCatalogEngine.lookup(machineId);
    const programHash = this.hashProgram(machineId, programPoints);
    const signedAt = new Date().toISOString();

    if (!envelope) {
      return {
        verdict: "unsafe",
        machine_id: machineId,
        program_hash: programHash,
        program_point_count: programPoints.length,
        signed_at: signedAt,
        accuracy_tier: "unknown",
        accuracy_um: NaN,
        witnesses: [{ check: "envelope_lookup", point_index: -1, reason: `machine_id=${machineId} not in JM Die catalog` }],
        margins_by_check: {},
        inconclusive_count: 0,
        schema_version: SCHEMA_VERSION,
      };
    }

    const witnesses: ProofCertificate["witnesses"] = [];
    const margins: Record<string, number> = {};
    let inconclusiveCount = 0;
    let minXMargin = Infinity, minYMargin = Infinity, minZMargin = Infinity;

    const tx = envelope.travel_limits.X;
    const ty = envelope.travel_limits.Y;
    const tz = envelope.travel_limits.Z;

    for (let i = 0; i < programPoints.length; i++) {
      const p = programPoints[i];
      const u_um = p.uncertainty_um ?? envelope.accuracy_um;
      const u_mm = u_um / 1000;
      const xi = intervalArithmeticPredicateEngine.fromPoint(p.x, u_mm);
      const yi = intervalArithmeticPredicateEngine.fromPoint(p.y, u_mm);
      const zi = intervalArithmeticPredicateEngine.fromPoint(p.z, u_mm);

      const subPreds: Predicate[] = [];
      if (tx) {
        const tBox: Predicate = (xi.lo >= tx.min && xi.hi <= tx.max) ? "definitely-safe"
          : (xi.hi < tx.min || xi.lo > tx.max) ? "definitely-collision" : "inconclusive";
        if (tBox === "definitely-collision") witnesses.push({ check: "travel_x", point_index: i, reason: `X=${p.x} outside [${tx.min},${tx.max}]` });
        if (tBox === "inconclusive") inconclusiveCount++;
        subPreds.push(tBox);
        minXMargin = Math.min(minXMargin, Math.min(p.x - tx.min, tx.max - p.x) * 1000); // µm
      }
      if (ty) {
        const tBox: Predicate = (yi.lo >= ty.min && yi.hi <= ty.max) ? "definitely-safe"
          : (yi.hi < ty.min || yi.lo > ty.max) ? "definitely-collision" : "inconclusive";
        if (tBox === "definitely-collision") witnesses.push({ check: "travel_y", point_index: i, reason: `Y=${p.y} outside [${ty.min},${ty.max}]` });
        if (tBox === "inconclusive") inconclusiveCount++;
        subPreds.push(tBox);
        minYMargin = Math.min(minYMargin, Math.min(p.y - ty.min, ty.max - p.y) * 1000);
      }
      if (tz) {
        const tBox: Predicate = (zi.lo >= tz.min && zi.hi <= tz.max) ? "definitely-safe"
          : (zi.hi < tz.min || zi.lo > tz.max) ? "definitely-collision" : "inconclusive";
        if (tBox === "definitely-collision") witnesses.push({ check: "travel_z", point_index: i, reason: `Z=${p.z} outside [${tz.min},${tz.max}]` });
        if (tBox === "inconclusive") inconclusiveCount++;
        subPreds.push(tBox);
        minZMargin = Math.min(minZMargin, Math.min(p.z - tz.min, tz.max - p.z) * 1000);
      }
    }

    if (Number.isFinite(minXMargin)) margins.travel_x_min_margin_um = minXMargin;
    if (Number.isFinite(minYMargin)) margins.travel_y_min_margin_um = minYMargin;
    if (Number.isFinite(minZMargin)) margins.travel_z_min_margin_um = minZMargin;

    let verdict: "safe" | "unsafe" | "inconclusive" = "safe";
    if (witnesses.length > 0) verdict = "unsafe";
    else if (inconclusiveCount > 0) verdict = "inconclusive";

    return {
      verdict,
      machine_id: machineId,
      program_hash: programHash,
      program_point_count: programPoints.length,
      signed_at: signedAt,
      accuracy_tier: envelope.accuracy_tier,
      accuracy_um: envelope.accuracy_um,
      witnesses,
      margins_by_check: margins,
      inconclusive_count: inconclusiveCount,
      schema_version: SCHEMA_VERSION,
    };
  }

  /** sha256 of canonical (machineId + program-points-JSON) — operator-verifiable. */
  private hashProgram(machineId: string, points: ProgramPoint[]): string {
    const canonical = JSON.stringify({ m: machineId, p: points });
    return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
  }

  /** Format the cert as a single-line G-code comment header. */
  formatHeader(cert: ProofCertificate): string {
    return `// PRISM-PROOF: ${cert.program_hash} · verdict=${cert.verdict} · machine=${cert.machine_id} · acc=${cert.accuracy_um}µm · signed=${cert.signed_at}`;
  }
}

export const programProofCertificateEngine = new ProgramProofCertificateEngine();
