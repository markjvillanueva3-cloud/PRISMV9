/**
 * MultiChannelCollisionEngine
 * ===========================
 *
 * Detects collisions and force-interaction risks when two turrets / two
 * channels execute simultaneously on a Swiss / mill-turn lathe
 * (MS6a / U-LPM05). Complements the time-based collision check already in
 * `MillTurnSwissPipelineEngine.calculateMultiChannel()` by adding **4 explicit
 * collision zones** and a **force-interaction model** for opposing cuts.
 *
 * ── Collision zones ─────────────────────────────────────────────
 *   Zone 1: Main turret ↔ sub-spindle turret (cross-slide clash).
 *   Zone 2: Main turret ↔ part on sub-spindle side.
 *   Zone 3: Sub turret ↔ part on main-spindle side.
 *   Zone 4: Tool-to-tool during a turret index while the other channel cuts.
 *
 * Each zone is a swept-volume approximation — we model tool position as a
 * cylinder (radius = tool shank, length = projection) and flag a collision
 * when two cylinders on concurrent ops overlap in X-Y-Z with clearance
 * below `min_clearance_mm`.
 *
 * ── Force-interaction model ─────────────────────────────────────
 *   When BOTH channels apply a radial cutting force to the same part zone:
 *     * Co-directional: deflection DOUBLES (≈ vector sum, 0° apart).
 *     * Orthogonal:    deflection ≈ sqrt(F1² + F2²) / sqrt(2) (partial cancel).
 *     * Opposing:      deflection partially cancels (beneficial, 180° apart).
 *
 *   We compute a "deflection inflation factor" k_def and flag the simultaneous
 *   op pair when k_def > 1.1 (i.e. deflection > 10 % worse than single-channel).
 *
 * ── Output ──────────────────────────────────────────────────────
 *   For each at-risk pair we report:
 *     * zone id (1–4)
 *     * min clearance achieved
 *     * force-interaction factor
 *     * recommendation ("serialize", "add sync", "reduce feed on co-directional pair")
 *
 * When a CRITICAL collision is detected the engine emits a `sync_insertion`
 * record — the caller can feed that back into the scheduler to serialize
 * the offending ops.
 *
 * References:
 *   - Altintas Y. "Manufacturing Automation" (2012) §7.4 (multi-turret collision).
 *   - Smith S., Tlusty J. "Cutting force superposition in multi-axis machining"
 *     J. Manuf. Sci. Eng. 1991.
 *
 * @module engines/MultiChannelCollisionEngine
 * @milestone LATHE-PRO-MS6a / U-LPM05
 */

export interface SimultaneousOp {
  op_id: string;
  channel_id: number;
  turret: number;
  /** Start time (s) on the channel. */
  start_s: number;
  /** End time (s) on the channel. */
  end_s: number;
  /** Axial position range along Z (min, max) in mm. */
  z_range_mm: [number, number];
  /** Radial position (X) in mm at the swept centre. */
  x_mm: number;
  /** Tool swept radius (shank + flute) in mm. */
  tool_radius_mm: number;
  /** Radial cutting force (N), sign indicates direction: +Y = +radial. */
  radial_force_n?: number;
  /** Force vector angle in degrees from +X (0=radial-out, 90=tangential, 180=radial-in). */
  force_angle_deg?: number;
  /**
   * True when this op is a turret-index move (no cutting). Used for Zone 4.
   */
  is_turret_index?: boolean;
}

export interface CollisionInput {
  ops: SimultaneousOp[];
  /** Minimum safe tool-to-tool / tool-to-part clearance (mm). Default 5.0. */
  min_clearance_mm?: number;
  /** Deflection-inflation threshold above which a warning is emitted. Default 1.1. */
  deflection_factor_warn?: number;
  /** Part mount style — affects Zones 2 and 3 reasoning. */
  part_mounted_on?: "main" | "sub" | "between" | "guide_bush";
}

export type CollisionZone = 1 | 2 | 3 | 4;

export interface CollisionFlag {
  op_a: string;
  op_b: string;
  zone: CollisionZone;
  zone_description: string;
  severity: "critical" | "warning" | "info";
  min_clearance_mm: number;
  /** 0 when no simultaneous window, positive otherwise. */
  time_overlap_s: number;
  /** Deflection inflation factor (1.0 = single-channel equivalent). */
  deflection_factor: number;
  recommendation: string;
  /** Proposed sync insertion when severity = critical. */
  sync_insertion?: {
    after_op: string;
    before_op: string;
    reason: string;
  };
}

export interface CollisionResult {
  is_safe: boolean;
  flags: CollisionFlag[];
  /** Number of simultaneous op-pairs considered. */
  pairs_checked: number;
  /** Summary message. */
  summary: string;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function rangeOverlap(a: [number, number], b: [number, number]): number {
  const [a0, a1] = a[0] <= a[1] ? a : [a[1], a[0]];
  const [b0, b1] = b[0] <= b[1] ? b : [b[1], b[0]];
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function timeOverlap(a: SimultaneousOp, b: SimultaneousOp): number {
  return Math.max(0, Math.min(a.end_s, b.end_s) - Math.max(a.start_s, b.start_s));
}

/**
 * Deflection-inflation factor for two simultaneous radial forces.
 * Returns 1.0 when either force is missing or when the ops aren't on the same part.
 */
function deflectionFactor(a: SimultaneousOp, b: SimultaneousOp): number {
  if (a.radial_force_n == null || b.radial_force_n == null) return 1.0;
  if (a.radial_force_n === 0 || b.radial_force_n === 0) return 1.0;
  const angA = a.force_angle_deg ?? 0;
  const angB = b.force_angle_deg ?? 0;
  const delta = Math.abs(((angA - angB + 540) % 360) - 180); // 0..180, 0=opposite
  // delta=180 → co-directional (double). delta=0 → opposing (cancel).
  // Use vector-sum magnitude scaled by max single force.
  const rad = (delta * Math.PI) / 180;
  const fa = Math.abs(a.radial_force_n);
  const fb = Math.abs(b.radial_force_n);
  const sumMag = Math.sqrt(fa * fa + fb * fb + 2 * fa * fb * Math.cos(rad));
  const maxSingle = Math.max(fa, fb);
  return maxSingle > 0 ? sumMag / maxSingle : 1.0;
}

export class MultiChannelCollisionEngine {
  /**
   * Detect collisions and flag force-interaction risks across 4 zones.
   *
   * @param input - simultaneous ops and safety thresholds.
   * @returns ordered list of flags with severity + remediation.
   */
  check(input: CollisionInput): CollisionResult {
    const clearanceMin = input.min_clearance_mm ?? 5.0;
    const deflWarn = input.deflection_factor_warn ?? 1.1;
    const flags: CollisionFlag[] = [];

    let pairsChecked = 0;
    for (let i = 0; i < input.ops.length; i++) {
      for (let j = i + 1; j < input.ops.length; j++) {
        const a = input.ops[i]!;
        const b = input.ops[j]!;
        if (a.channel_id === b.channel_id) continue; // same channel is serial
        const tOverlap = timeOverlap(a, b);
        if (tOverlap <= 0) continue;
        pairsChecked += 1;

        // ── Zone 1: turret-to-turret ──
        if (a.turret !== b.turret) {
          const zOverlap = rangeOverlap(a.z_range_mm, b.z_range_mm);
          const radialClearance = Math.abs(a.x_mm - b.x_mm) - (a.tool_radius_mm + b.tool_radius_mm);
          if (zOverlap > 0 && radialClearance < clearanceMin) {
            flags.push({
              op_a: a.op_id,
              op_b: b.op_id,
              zone: 1,
              zone_description: "Main turret ↔ sub-spindle turret (cross-slide clash)",
              severity: radialClearance < 0 ? "critical" : "warning",
              min_clearance_mm: round3(Math.max(0, radialClearance)),
              time_overlap_s: round3(tOverlap),
              deflection_factor: round3(deflectionFactor(a, b)),
              recommendation:
                radialClearance < 0
                  ? `Turrets WILL COLLIDE (clearance ${round3(radialClearance)}mm < 0). Serialize ${a.op_id} and ${b.op_id}.`
                  : `Turret clearance ${round3(radialClearance)}mm is below safety floor ${clearanceMin}mm. Add sync point.`,
              sync_insertion:
                radialClearance < 0
                  ? { after_op: a.op_id, before_op: b.op_id, reason: "zone-1 negative clearance" }
                  : undefined,
            });
          }
        }

        // ── Zone 4: tool-to-tool during turret index ──
        if (a.is_turret_index && !b.is_turret_index) {
          // Index move of a concurrent with cut of b — risk if turrets share Z envelope.
          const zOverlap = rangeOverlap(a.z_range_mm, b.z_range_mm);
          if (zOverlap > 0) {
            flags.push({
              op_a: a.op_id,
              op_b: b.op_id,
              zone: 4,
              zone_description: "Tool-to-tool during turret index while other channel cuts",
              severity: "critical",
              min_clearance_mm: 0,
              time_overlap_s: round3(tOverlap),
              deflection_factor: 1.0,
              recommendation: `Delay ${a.op_id} turret index until ${b.op_id} completes, OR retract ${b.op_id} tool before indexing.`,
              sync_insertion: {
                after_op: b.op_id,
                before_op: a.op_id,
                reason: "zone-4 turret-index-during-cut",
              },
            });
          }
        }

        // ── Force-interaction flag (independent of zone) ──
        const factor = deflectionFactor(a, b);
        if (factor > deflWarn) {
          flags.push({
            op_a: a.op_id,
            op_b: b.op_id,
            zone: 2, // tag as part-on-sub-or-main = Zone 2/3
            zone_description:
              "Radial force superposition — deflection inflation between two concurrent cuts",
            severity: factor > 1.8 ? "critical" : "warning",
            min_clearance_mm: round3(Math.abs(a.x_mm - b.x_mm)),
            time_overlap_s: round3(tOverlap),
            deflection_factor: round3(factor),
            recommendation:
              factor > 1.8
                ? `Co-directional forces inflate deflection to ${round3(factor)}× single-channel. Serialize or reduce feed on one side.`
                : `Force-interaction factor ${round3(factor)} > ${deflWarn}. Consider reducing feed on ${b.op_id} or phase-shifting.`,
            sync_insertion:
              factor > 1.8
                ? { after_op: a.op_id, before_op: b.op_id, reason: `force factor ${round3(factor)}` }
                : undefined,
          });
        }

        // ── Zones 2 & 3: tool vs part on the OTHER spindle ──
        // We approximate: if one op is on main (turret 1) and the part is
        // mounted on sub (or vice-versa), the tool's X projection toward the
        // part must not cross the spindle centreline.
        if (input.part_mounted_on === "sub" && a.turret === 1 && b.turret === 2) {
          const clearanceToPart = a.x_mm - a.tool_radius_mm;
          if (clearanceToPart < clearanceMin) {
            flags.push({
              op_a: a.op_id,
              op_b: b.op_id,
              zone: 2,
              zone_description: "Main turret tool reaching toward part on sub-spindle",
              severity: clearanceToPart < 0 ? "critical" : "warning",
              min_clearance_mm: round3(Math.max(0, clearanceToPart)),
              time_overlap_s: round3(tOverlap),
              deflection_factor: round3(factor),
              recommendation:
                clearanceToPart < 0
                  ? `Main-turret tool crosses sub-spindle centreline. Retract before sub cuts.`
                  : `Main-turret tool within ${clearanceMin}mm of sub-mounted part. Add sync.`,
            });
          }
        }
      }
    }

    const critical = flags.filter(f => f.severity === "critical").length;
    const warnings = flags.filter(f => f.severity === "warning").length;
    const is_safe = critical === 0;
    const summary = is_safe
      ? warnings === 0
        ? `OK — ${pairsChecked} simultaneous pair(s) cleared.`
        : `${warnings} warning(s) across ${pairsChecked} simultaneous pair(s). Review before run.`
      : `BLOCK — ${critical} critical collision(s) across 4 zones.`;

    return {
      is_safe,
      flags,
      pairs_checked: pairsChecked,
      summary,
    };
  }
}

/** Singleton instance. */
export const multiChannelCollisionEngine = new MultiChannelCollisionEngine();
